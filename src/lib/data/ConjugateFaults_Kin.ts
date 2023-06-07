import { add_Vectors, constant_x_Vector, Matrix3x3, multiplyTensors, newMatrix3x3, normalizedCrossProduct, normalizeVector, scalarProductUnitVectors, transposeTensor, Vector3 } from "../types"
import { Data } from "./Data"
import { FractureStrategy, StriatedPlaneProblemType } from "./types"
import { ConjugateFaults } from "../utils/ConjugateFaults"
import { getDirectionFromString, getSensOfMovementFromString } from "../utils"
import { minRotAngleRotationTensor } from "../types/math"
import { DataParameters } from "./DataParameters"

/** 
 conjugate planes: 
 A pair of conjugate planes is defined by two planes whose plane of movement is perpendicular to the intersection line between the planes.
 The plane of movement is defined by the two normal vectors to the fault planes.
 We make the following hypotheses concerning principal stress orientations: 
    The compressional axis Sigma 1 is located in the plane of movement and bisects the acute angle (<= 90°) between planes
    The extensional axis Sigma 3 is located in the plane of movement and bisects the obtuse angle (>= 90°) between planes

 Conjugate fault planes are defined in the input file in two consecutive lines.
 Each line specifies all the available data for each conjugate fault plane.

 Several data sets defining two conjugate planes are considered:
 1) Case 1: The geometry and kinematics of the conjugate planes are defined, yet the rake angles are NOT defined
    The orientation of the principal axes are calculated from the geometry of the conjugate fault planes.
    The intermediate axis Sigma 2 is parallel to the intersection line between the conjugate planes;
    The intermediate axis Sigma 2 is perpendicular to the plane of mouvement;
    a) Each plane is defined by a set of 3 parameters, as follows:
        Fault strike: clockwise angle measured from the North direction [0, 360)
        Fault dip: [0, 90]
        Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
    b) The rake angles defining the slip vectors are NOT defined
    c) The sense of mouvement is indicated for each conjugate fault plane :
        For verification purposes, it is recommended to indicate both the dip-slip and strike-slip compoenents, when possible. 
          Dip-slip component:
              N = Normal fault, 
              I = Inverse fault or thrust
          Strike-slip componenet:
              RL = Right-Lateral fault
              LL = Left-Lateral fault
        Sense of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL 
2) Case 2: The geometry, the striation (i.e., the rake), and the kinematics of one or both conjugate planes are defined.
        This case is not considered as the striations define redundant information for constraining the stress tensor orientation.
        Conjugate planes with striations can be considered separately as neoformed striated planes for which the friction angle is known

3) Particular case:
    If the striation is known for one of the conjugate faults, then the other plane
    can be defined by one axis that is contained in the plane. 
    However, this case would require a special format in the input file, which is inconvenient...

    @category Data
 */
export class ConjugateFaultsKin extends Data {
    protected nPlane1: Vector3 = undefined
    protected nPlane2: Vector3 = undefined
    protected nStriation1: Vector3 = undefined
    protected nStriation2: Vector3 = undefined

    protected pos: Vector3 = undefined
    protected problemType = StriatedPlaneProblemType.DYNAMIC
    protected strategy = FractureStrategy.ANGLE
    protected oriented = true
    protected EPS = 1e-7
    protected nPerpStriation: Vector3

    protected plane1: Boolean = undefined
    protected plane2: Boolean = undefined

    // Principal directions of the data
    protected nSigma1_Sc: Vector3 = undefined
    protected nSigma2_Sc: Vector3 = undefined
    protected nSigma3_Sc: Vector3 = undefined
    protected Crot: Matrix3x3 = undefined

    protected cf1: any = undefined
    protected cf2: any = undefined
    protected params1: any = undefined
    protected params2: any = undefined

    protected striation1 = false
    protected striation2 = false

    //protected nSigma1_rot: Vector3 = undefined
    //protected nSigma3_rot: Vector3 = undefined

    // params1 and params2 contain data defining conjugate fault planes 1 and 2
    // we have replaced azimuth by strike

    nbLinkedData(): number {
        return 2
    }


    initialize(params: DataParameters[]): boolean {

        let nPlane2Neg: Vector3

        if (Number.isNaN(params[0].strike)) {
            throw new Error('Missing strike angle for conjugate fault plane '+ params[0].noPlane)
        }

        if (Number.isNaN(params[0].dip)) {
            throw new Error('Missing dip angle for conjugate fault plane ' + params[0].noPlane)
        }

        if (params[0].dip < 90 && params[0].dipDirection === undefined ) {
            throw new Error('Missing dip direction for conjugate fault plane '+ params[0].noPlane)
        }

        if (Number.isNaN(params[1].strike)) {
            throw new Error('Missing strike angle for conjugate fault plane '+ params[1].noPlane)
        }

        if (Number.isNaN(params[1].dip)) {
            throw new Error('Missing dip angle for conjugate fault plane ' + params[1].noPlane)
        }

        if (params[1].dip < 90 && params[1].dipDirection === undefined ) {
            throw new Error('Missing dip direction for conjugate fault plane '+ params[1].noPlane)
        }

        // if (this.nPlane1 === this.nPlane2 || this.nPlane1 === constant_x_Vector({k: -1, V: this.nPlane2}) ) {
        //     throw new Error('The two conjugate planes ' + params.noPlane1 + ' and ' + params.noPlane2 + ' are identical')
        // }

        // Check that nPlane and nStriation are unit vectors ***
        this.params1 = {
            noPlane: params[0].noPlane,
            strike: params[0].strike,
            dipDirection: getDirectionFromString(params[0].dipDirection),
            dip: params[0].dip,
            sensOfMovement: getSensOfMovementFromString(params[0].typeOfMovement),
            rake: params[0].rake,
            strikeDirection: getDirectionFromString(params[0].strikeDirection)
        }
        this.cf1 = ConjugateFaults.create(this.params1)

        // conjugate plane 1 is defined: (strike1, dip1, dipDirection1)
        this.plane1 = true
        // Calculate the unit vector normal to plane 1: nPlane1
        this.nPlane1 = this.cf1.nPlane

        // -----------------------------------------

        this.params2 = {
            noPlane: params[1].noPlane,
            strike: params[1].strike,
            dipDirection: getDirectionFromString(params[1].dipDirection),
            dip: params[1].dip,
            sensOfMovement: getSensOfMovementFromString(params[1].typeOfMovement),
            rake: params[1].rake,
            strikeDirection: getDirectionFromString(params[1].strikeDirection)
        }
        this.cf2 = ConjugateFaults.create(this.params2)
        // conjugate plane 1 is defined: (strike1, dip1, dipDirection1)
        this.plane2 = true
        // Calculate the unit vector normal to plane 1: nPlane1
        this.nPlane2 = this.cf2.nPlane


        /** this.nStriation = nStriation
        // this.nPerpStriation = nPerpStriation

        // Check orthogonality
        // const sp = scalarProductUnitVectors({U: nPlane, V: nStriation})
        //*if (Math.abs(sp) >this.EPS) {
            throw new Error(`striation is not on the fault plane. Dot product gives ${sp}`)
        } **/

        return true
    }

    check({ displ, strain, stress }: { displ: Vector3, strain: Matrix3x3, stress: Matrix3x3 }): boolean {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            return stress !== undefined
        }
        return displ !== undefined
    }

    checkConjugateFaults(): void {

        // const f = ConjugatedFaults.create({})
        // return f.

        if (this.plane1 && this.plane2) {
            // The first and second conjugate plane are defined (strike1, dip1 and dipDirection1) and (strike2, dip2 and dipDirection2)

            if ( Number.isNaN(this.params1.rake) && Number.isNaN(this.params1.striationTrend) ) {
                this.striation1 = false
            }
            if ( Number.isNaN(this.params2.rake) && Number.isNaN(this.params2.striationTrend) ) {
                this.striation2 = false
            }

            if (!this.striation1 && !this.striation2) {
                // Case 1: general case
                // The striations are not defined for the conjugate planes 1 and 2

                // In principle we have already checked that the two conjugate planes are different
                // Calculate the unit vector parellel to Sigma 2, which is perpendicular to nPlane1 and nPlane2:
                this.nSigma2_Sc = normalizedCrossProduct( {U: this.nPlane1, V: this.nPlane2} )

                // Calculate the two normalized stress axes (Sigma 1 and Sigma 3) that bisect the angles between the conjugate planes
                // angle_nPlane1_nPlane2 in interval (0,PI)
                const angle_nPlane1_nPlane2 = Math.acos(scalarProductUnitVectors( {U: this.nPlane1, V: this.nPlane2} ))

                if (Math.abs(angle_nPlane1_nPlane2 - Math.PI / 2) > this.EPS) {

                    // The conjugate planes are not perpendicular to each other

                    if (angle_nPlane1_nPlane2 < Math.PI / 2) {

                        // The angle between the 2 normals < PI/2:
                        // Sigma 1 and Sigma 3 are located in the plane generated by nPlane1 and nPlane2  (normal unit vectors point upward)

                        // In principle Sigma 3 bisects the obtuse angle (> 90°) between the conjugate planes
                        // The bisecting line nSigma3_Sc is defined by the sum of normal vectors nPlane1 + nPlane2
                        this.nSigma3_Sc = add_Vectors( {U: this.nPlane1, V: this.nPlane2} )
                        // note that nSigma3_Sc is always located in the compressional quadrant of the outward hemisphere relative to each of the fault planes
                        // i.e., the scalar product nPlane1 . nSigma3_Sc > 0
                        this.nSigma3_Sc = normalizeVector(this.nSigma3_Sc)

                        // nSigma1_Sc = nSigma3_Sc x nSigma2_Sc
                        // The right-handed reference system is defined according to systems S' and S'' (sigma 1, sigma 3, sigma 2)
                        this.nSigma1_Sc = normalizedCrossProduct( {U: this.nSigma3_Sc, V: this.nSigma2_Sc} )

                    } else {

                        // The angle between the 2 normals > PI/2:
                        // In principle Sigma 1 bisects the acute angle (< 90°) between the conjugate planes 
                        // The bisecting line nSigma1_Sc is defined by the sum of normal vectors nPlane1 + nPlane2
                        this.nSigma1_Sc = add_Vectors( {U: this.nPlane1, V: this.nPlane2} )
                        this.nSigma1_Sc = normalizeVector(this.nSigma1_Sc)

                        // nSigma3_Sc = nSigma2_Sc x nSigma1_Sc
                        // The right-handed reference system is defined according to systems S' and S'' (sigma 1, sigma 3, sigma 2)
                        this.nSigma3_Sc = normalizedCrossProduct( {U: this.nSigma2_Sc, V:this.nSigma1_Sc} )
                    }

                    // ****** let (coordinates1.phi, coordinates1.theta) and (coordinates2.phi, coordinates2.theta) be the spherical coords
                    // of conjugate plaes 1 and 2 in the geographic reference system: S = (X,Y,Z) = (E,N,Up)
                    // This requires using method faultSphericalCoords in class fault
                    // Check that the sense of mouvement is consistent with the orientation of stress axes***
                    if (this.params1.sensOfMovement !== 'UKN') {
                        // The sense of movement is defined for conjugate plane 1 (UKN = unknown)
                        // Check consitency of movement 
                        this.cf1.conjugatePlaneCheckMouvement({
                            noPlane: this.params1.noPlane,
                            nPlane: this.nPlane1, 
                            coordinates: this.cf1.fault.sphericalCoords,
                            nStriation: this.cf1.fault.striation, 
                            sensOfMovement: this.params1.sens_of_movement, 
                            nSigma3_Sc: this.nSigma3_Sc, 
                            nSigma2_Sc: this.nSigma2_Sc
                        })
                    }
                    if (this.params2.sensOfMovement !== 'UKN') {
                        // The sense of movement is defined for conjugate plane 2
                        // Check consitency of movement
                        this.cf2.conjugatePlaneCheckMouvement({
                            noPlane: this.params2.noPlane,
                            nPlane: this.nPlane2, 
                            coordinates: this.cf2.fault.sphericalCoords,
                            nStriation: this.cf2.fault.striation, 
                            sensOfMovement: this.params2.sens_of_movement, 
                            nSigma3_Sc: this.nSigma3_Sc, 
                            nSigma2_Sc: this.nSigma2_Sc
                        })
                    }

                } else {
                    // The angle between the 2 normals is approximately equal to PI/2:
                    // In this situation, the orientation of Sigma 1 and Sigma 3 can be permuted.
                    // The sense of mouvement of at least one conjugate plane must be known in order to define the orientation of the stress axes
                    if (this.params1.sensOfMovement !== 'UKN' || this.params2.sensOfMovement !== 'UKN') {
                        // Find orientations of Sigma 1, Sigma 2 and Sigma 3, and check for consistency of mouvement if both movements are known.
                    } else {
                        const msg = 'conjugate faults '+ this.params1.noPlane+ ' and '+ this.params2.noPlane+ ' are perpendicular. Please indicate type of movement for at least one plane'
                        throw new Error(msg)

                    }
                }
                // We define 2 orthonormal right-handed reference systems:
                //      S =  (X, Y, Z ) is the geographic reference frame oriented in (East, North, Up) directions.
                //      Sc = (Xc,Yc,Zc) is the principal stress reference frame, parallel to the stress axes obtained form the conjugate faults (sigma1_Sc, sigma3_Sc, sigma2_Sc);

                // Calculate transformation matrix Crot from reference system S to Sc, such that:
                //      Vc = Crot V
                // where V and Vc are corresponding vectors in reference systems S and Sc

                // Rotation tensor Crot is defined such that:
                // lines 1, 2, and 3 are defined by unit vectors nSigma1_Sc, nSigma3_Sc, and nSigma2_Sc, in agreement with reference system Sc = (Xc,Yc,Zc)
                this.Crot = [
                    [this.nSigma1_Sc[0], this.nSigma1_Sc[1], this.nSigma1_Sc[2]],
                    [this.nSigma3_Sc[0], this.nSigma3_Sc[1], this.nSigma3_Sc[2]],
                    [this.nSigma2_Sc[0], this.nSigma2_Sc[1], this.nSigma2_Sc[2]]
                ] 
            } else {
                // The striations on one are both conjugate planes are defined (rake, strike direction, and type of movement)
                // 

            }

        } else if (this.plane1 || this.plane2) {
            // One of the two conjugate planes is defined while the other is not
            // In principle the second plane can be calculated using the striation of the first plane and a line passing by the second plane
            // However, this case is rather unusual.
        } else {
            // The two conjugate planes are not defined
            throw new Error('conjugate faults '+ this.params1.noPlane + ' and ' + this.params2.noPlane + ' are not defined (strike, dip and dip direction')
        }
    }

    cost({ displ, strain, stress, Mrot }:
        { displ?: Vector3, strain?: Matrix3x3, stress?: Matrix3x3, Mrot?: Matrix3x3 }): number
    {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            // The cost function uses the rotation tensor Crot from reference system S to Sc, calculated in method checkCompactionShearBands

            // The cost function for two conjugate faults is defined as the minimum angular rotation between system Sc and the stress tensor in system S' or S'':
            //  S   =  (X, Y, Z ) is the geographic reference frame  oriented in (East, North, Up) directions.
            //  S'  =  (X', Y', Z' ) is the principal reference frame chosen by the user in the interactive search phase.
            //  S'' =  (X'', Y'', Z'' ) is the principal reference frame for a fixed node in the search grid (sigma_1, sigma_3, sigma_2)
            // Rotation tensors Rrot and RTrot between systems S and S' are such that:

            //  V  = RTrot V'        (RTrot is tensor Rrot transposed)
            //  V' = Rrot  V

            // Rotation tensors Wrot and WTrot between systems S and S'' satisfy : WTrot = RTrot DTrot, such that:
            //  V   = WTrot V''        (WTrot is tensor Wrot transposed)
            //  V'' = Wrot  V

            // The cost method implements a rotation tensor termed Mrot which is equivalent to Rrot or Wrot depending on the calling functions:
            //      Mrot = Rrot in the interactive search phase using integral curves
            //      Mrot = Wrot in the inverse method search phase using Montecarlo (for example)

            // The rotation tensor CFrot between systems Sc and S' (or S'') is such that: Vc = CFrot . V' (or Vc = CFrot . V''), 
            // where CFrot = Crot . MTrot (MTrot = Mrot transposed):
            const CFrot = multiplyTensors({A: this.Crot, B: transposeTensor(Mrot)})

            // The angle of rotation associated to tensor CFrot is defined by the trace tr(CFrot), according to the relation:
            //      tr(CFrot) = 1 + 2 cos(theta)
            // 4 possible right-handed reference systems are considered for CFrot in order to calculate the minimum rotation angle

            return minRotAngleRotationTensor(CFrot)
        }
    }
}
