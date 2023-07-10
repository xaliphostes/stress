import { add_Vectors, Matrix3x3, multiplyTensors, 
        normalizedCrossProduct, normalizeVector, 
        scalarProductUnitVectors, transposeTensor, Vector3 
    } from "../types"
import { Data } from "./Data"
import { DataArguments, FractureStrategy, StriatedPlaneProblemType, Tokens } from "./types"
import { getDirectionFromString, getSensOfMovementFromString, ConjugatePlanesHelper, toFloat, Direction, SensOfMovement, isNumber, toInt } from "../utils"
import { minRotAngleRotationTensor } from "../types/math"
import { DataParameters } from "./DataParameters"
import { TensorParameters } from "../geomeca"
import { DataArgument, DataDescription, DataMessages } from "./DataDescription"

/** 
 Conjugate Fault Planes: 
 A pair of conjugate fault planes is defined by two planes whose plane of movement is perpendicular to the intersection line between the planes.
 The plane of movement is defined by the two normal vectors to the fault planes.
 In principle, the data type corresponding to conjugate fault planes includes the type of mouvement but NOT the striation.
 We make the following hypotheses concerning principal stress orientations: 
    The compressional axis Sigma 1 is located in the plane of movement and bisects the acute angle (<= 90°) between planes
    The extensional axis Sigma 3 is located in the plane of movement and bisects the obtuse angle (>= 90°) between planes

 Conjugate fault planes are defined in the input file in TWO CONSECUTIVE LINES; they are numbered one after the other
 Each line specifies all the available data for each conjugate fault plane.

 Several data sets defining two conjugate fault planes are considered:
 1) General Case: The geometry and kinematics of the conjugate fault planes are defined, yet the rake angles are NOT defined.

    The orientation of the principal axes are calculated from the geometry of the conjugate fault planes.
        The intermediate axis Sigma 2 is parallel to the intersection line between the conjugate fault planes;
        The intermediate axis Sigma 2 is perpendicular to the plane of mouvement;
    a) Each plane is defined by a set of 3 parameters, as follows:
        Fault strike: clockwise angle measured from the North direction [0, 360)
        Fault dip: [0, 90]
        Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
    b) The rake angles defining the slip vectors are NOT defined
    c) The type of mouvement for each conjugate fault plane is an OPTIONAL parameter (i.e. it may be unknown - UKN)
       However, it is highly recommended to include the type of mouvment for verification purposes, 
            indicating both the dip-slip and strike-slip compoenents, when possible. 
          Dip-slip component:
              N = Normal fault, 
              I = Inverse fault or thrust
          Strike-slip componenet:
              RL = Right-Lateral fault
              LL = Left-Lateral fault
        Type of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL; UKN 
2) Special Case 1: The geometry, the striation (i.e., the rake), and the kinematics of one or both conjugate fault planes are defined.
        This case is NOT considered as the striations define redundant information for constraining the stress tensor orientation.
        Conjugate fault planes with striations can be considered separately as Neoformed Striated Planes for which the friction angle is known
3) Special Case 2:
    If the striation is known for one of the conjugate faults, then the other plane
    can be defined by one axis that is contained in the plane. 
    However, this case is NOT considered since it would require a special format in the input file, which is inconvenient.

    @category Data
 */
export class ConjugateFaults extends Data {
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
    protected nSigma1_Sm: Vector3 = undefined
    protected nSigma2_Sm: Vector3 = undefined
    protected nSigma3_Sm: Vector3 = undefined
    protected Mrot: Matrix3x3 = undefined

    protected cf1: any = undefined
    protected cf2: any = undefined
    protected params1: any = undefined
    protected params2: any = undefined

    protected striation1 = false
    protected striation2 = false

    nbLinkedData(): number {
        return 2
    }

    /*
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
        //     throw new Error('The two conjugate fault planes ' + params.noPlane1 + ' and ' + params.noPlane2 + ' are identical')
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
        this.cf1 = ConjugatePlanesHelper.create(this.params1)

        // conjugate fault plane 1 is defined: (strike1, dip1, dipDirection1)
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
        this.cf2 = ConjugatePlanesHelper.create(this.params2)
        // conjugate fault plane 1 is defined: (strike1, dip1, dipDirection1)
        this.plane2 = true
        // Calculate the unit vector normal to plane 1: nPlane1
        this.nPlane2 = this.cf2.nPlane


        /** this.nStriation = nStriation
        // this.nPerpStriation = nPerpStriation

        

         c

        return true
    }
    */

     performOneDataLine(toks: Tokens, result: DataMessages): any {
        const arg: DataArgument = {
            toks,
            index: 0,
            data: this,
            result,
            setIndex(i: number) {
                this.index=i;
                return this
            }
        }

        const strike = DataDescription.getParameter(arg.setIndex(2))
        
        const dip = DataDescription.getParameter(arg.setIndex(3))

        // -----------------------------------

        let dipDirection = Direction.UNKOWN
        if ( (dip !== 90) && (dip !== 0) ) {
            // In the general case, the dip direction for non-horizontal and non-vertical planes
            // must be defined in terms of a geographic direction: N, S, E, W, NE, SE, SW, NW
            dipDirection = DataDescription.getParameter(arg.setIndex(4))
        }

        // -----------------------------------

        const sensOfMovement = DataDescription.getParameter(arg.setIndex(8))

        // -----------------------------------

        return {
            noPlane: toInt(toks[0]),
            strike,
            dipDirection,
            dip,
            sensOfMovement
        }
    }

    initialize(args: DataArguments): DataMessages {
        const result = { status: true, messages: [] }
        
        this.params1 = this.performOneDataLine(args[0], result)
        this.cf1 = ConjugatePlanesHelper.create(this.params1)
        // conjugate fault plane 1 is defined: (strike, dip, dipDirection)
        this.plane1 = true
        // Calculate the unit vector normal to plane 1: nPlane1
        this.nPlane1 = this.cf1.nPlane

        this.params2 = this.performOneDataLine(args[1], result)
        this.cf2 = ConjugatePlanesHelper.create(this.params2)
        // conjugate fault plane 2 is defined: (strike, dip, dipDirection)
        this.plane2 = true
        // Calculate the unit vector normal to plane 2: nPlane2
        this.nPlane2 = this.cf2.nPlane

        // this.checkConjugatePlanes()

        return result
    }

    check({ displ, strain, stress }: { displ: Vector3, strain: Matrix3x3, stress: Matrix3x3 }): boolean {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            return stress !== undefined
        }
        return displ !== undefined
    }

    cost({ displ, strain, stress }:
        { displ?: Vector3, strain?: TensorParameters, stress?: TensorParameters }): number
    {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            // The cost function uses the rotation tensor Mrot from reference system S to Sm, calculated in method checkCompactionShearBands

            // The cost function for two conjugate faults is defined as the minimum angular rotation between system Sm and the stress tensor in system Sr or Sw:
            //  S   =  (X, Y, Z ) is the geographic reference frame  oriented in (East, North, Up) directions.
            //  Sr  =  (Xr, Yr, Zr ) is the principal reference frame chosen by the user in the interactive search phase ('r' stands for 'rough' solution).
            //  Sw =  (Xw, Yw, Zw ) is the principal reference frame for a fixed node in the search grid (sigma_1, sigma_3, sigma_2) ('w' stands for 'winning' solution)
            // Rotation tensors Rrot and RTrot between systems S and Sr are such that:

            //  V  = RTrot Vr        (RTrot is tensor Rrot transposed)
            //  Vr = Rrot  V

            // Rotation tensors Wrot and WTrot between systems S and Sw satisfy : WTrot = RTrot DTrot, such that:
            //  V   = WTrot Vw        (WTrot is tensor Wrot transposed)
            //  Vw = Wrot  V

            // The cost method implements a rotation tensor termed Hrot definning the orientation of the hypothetical solution stress sytem (H stands for hypothetical)
            // Hrot is equivalent to Rrot or Wrot depending on the calling functions:
            //      Hrot = Rrot in the interactive search phase using integral curves
            //      Hrot = Wrot in the inverse method search phase using Montecarlo (for example)

            // The rotation tensor MrotHTrot between systems Sm and Sh (Sr or Sw) is such that: Vm = MrotHTrot . Vh (Vh = Vr or Vh = Vw), 
            // where MrotHTrot = Mrot . HTrot (HTrot = Hrot transposed):
            const MrotHTrot = multiplyTensors({A: this.Mrot, B: transposeTensor(stress.Hrot)})

            // The angle of rotation associated to tensor MrotHTrot is defined by the trace tr(MrotHTrot), according to the relation:
            //      tr(MrotHTrot) = 1 + 2 cos(theta)
            // 4 possible right-handed reference systems are considered for MrotHTrot in order to calculate the minimum rotation angle

            return minRotAngleRotationTensor(MrotHTrot)
        }
    }

    /*
    protected checkConjugatePlanes(): void {

        // const f = ConjugatedFaults.create({})
        // return f.

        if (this.plane1 && this.plane2) {
            // The first and second conjugate planes are defined (strike1, dip1 and dipDirection1) and (strike2, dip2 and dipDirection2)

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
                this.nSigma2_Sm = normalizedCrossProduct( {U: this.nPlane1, V: this.nPlane2} )

                // Calculate the two normalized stress axes (Sigma 1 and Sigma 3) that bisect the angles between the conjugate planes
                // angle_nPlane1_nPlane2 in interval (0,PI)
                const angle_nPlane1_nPlane2 = Math.acos(scalarProductUnitVectors( {U: this.nPlane1, V: this.nPlane2} ))

                if (Math.abs(angle_nPlane1_nPlane2 - Math.PI / 2) > this.EPS) {

                    // The conjugate planes are not perpendicular to each other

                    if (angle_nPlane1_nPlane2 < Math.PI / 2) {
                        // The angle between the 2 normals < PI/2:
                        // Sigma 1 and Sigma 3 are located in the plane generated by nPlane1 and nPlane2  (normal unit vectors point upward)
                        // In principle Sigma 3 bisects the acute angle (< 90°) between the normal vectors of the conjugate planes 
                        this.calculateSigma1_Sigma3_AcuteAngleNormals_CF_CDSB()

                    } else {
                        // The angle between the 2 normals > PI/2:
                        // In principle Sigma 1 bisects the obtuse angle (> 90°) between the normal vectors of the conjugate planes 
                        this.calculateSigma1_Sigma3_ObtuseAngleNormals_CF_CDSB()
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
                            nSigma3_Sm: this.nSigma3_Sm, 
                            nSigma2_Sm: this.nSigma2_Sm
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
                            nSigma3_Sm: this.nSigma3_Sm, 
                            nSigma2_Sm: this.nSigma2_Sm
                        })
                    }

                } else {
                    // Special case:
                    // The angle between the 2 normals is approximately equal to PI/2:
                    // In this situation, the orientation of Sigma 1 and Sigma 3 can be permuted.
                    // The sense of mouvement of at least one conjugate fault plane must be known in order to define the orientation of the stress axes
                    this.consistencyKinematicsPerpendicularPlanes()
                }

                // We define 2 orthonormal right-handed reference systems:
                //      S =  (X, Y, Z ) is the geographic reference frame oriented in (East, North, Up) directions.
                //      Sm = (Xm,Ym,Zm) is the principal stress reference frame, parallel to the stress axes obtained form the conjugate faults (sigma1_Sm, sigma3_Sm, sigma2_Sm);
                //          The letter 'm' stands for micro/meso structure

                // Calculate transformation matrix Mrot from reference system S to Sm, such that (the letter M stands for micro/meso structure):
                //      Vm = Mrot V
                // where V and Vm are corresponding vectors in reference systems S and Sm

                // Rotation tensor Mrot is defined such that:
                // lines 1, 2, and 3 are defined by unit vectors nSigma1_Sm, nSigma3_Sm, and nSigma2_Sm, in agreement with reference system Sm = (Xm,Ym,Zm)
                this.Mrot = [
                    [this.nSigma1_Sm[0], this.nSigma1_Sm[1], this.nSigma1_Sm[2]],
                    [this.nSigma3_Sm[0], this.nSigma3_Sm[1], this.nSigma3_Sm[2]],
                    [this.nSigma2_Sm[0], this.nSigma2_Sm[1], this.nSigma2_Sm[2]]
                ] 
            } else {
                // The striations on one are both conjugate fault planes are defined (rake, strike direction, and type of movement)
                // 

            }

        } else if (this.plane1 || this.plane2) {
            // One of the two conjugate fault planes is defined while the other is not
            // In principle the second plane can be calculated using the striation of the first plane and a line passing by the second plane
            // However, this case is rather unusual.
        } else {
            // The two conjugate fault planes are not defined
            throw new Error('conjugate faults '+ this.params1.noPlane + ' and ' + this.params2.noPlane + ' are not defined (strike, dip and dip direction')
        }
    }
    */
 
    protected consistencyKinematicsPerpendicularPlanes(): void {
        // The angle between the 2 normals is approximately equal to PI/2:
        // In this situation, the orientation of Sigma 1 and Sigma 3 can be permuted.
        // The sense of mouvement of at least one conjugate fault plane must be known in order to define the orientation of the stress axes


        // typeMovementConsistency: boolean indicating if the current stress axes orientations are consistent or not with type of movement
        let typeMovementConsistency1, typeMovementConsistency2 = true

        if ( this.params1.sensOfMovement !== 'UKN' || this.params2.sensOfMovement !== 'UKN' ) {
            // Find orientations of Sigma 1, Sigma 2 and Sigma 3, and check for consistency of mouvement if both movements are known.

            // Suppose that the bisecting line nSigma3_Sm is defined by the sum of normal vectors nPlane1 + nPlane2
            this.calculateSigma1_Sigma3_AcuteAngleNormals_CF_CDSB()

            if (this.params1.sensOfMovement !== 'UKN') {
                // The sense of movement is defined for conjugate plane 1 (UKN = unknown)
                // Check consitency of movement 
                typeMovementConsistency1  = this.cf1.perpendicularPlanesCheckmovement({
                    noPlane: this.params1.noPlane,
                    nPlane: this.nPlane1, 
                    coordinates: this.cf1.fault.sphericalCoords,
                    nStriation: this.cf1.fault.striation, 
                    sensOfMovement: this.params1.sens_of_movement, 
                    nSigma3_Sm: this.nSigma3_Sm, 
                    nSigma2_Sm: this.nSigma2_Sm
                })
            }
            if (this.params2.sensOfMovement !== 'UKN') {
                // The sense of movement is defined for conjugate plane 2
                // Check consitency of movement
                typeMovementConsistency2  = this.cf2.perpendicularPlanesCheckmovement({
                    noPlane: this.params2.noPlane,
                    nPlane: this.nPlane2, 
                    coordinates: this.cf2.fault.sphericalCoords,
                    nStriation: this.cf2.fault.striation, 
                    sensOfMovement: this.params2.sens_of_movement, 
                    nSigma3_Sm: this.nSigma3_Sm, 
                    nSigma2_Sm: this.nSigma2_Sm
                })
            }

            if ( !typeMovementConsistency1 || !typeMovementConsistency2 ) {
                // The type of movement is NOT consistent with the stress axes orientations assumed in:
                //      calculateSigma1_Sigma3_AcuteAngleNormals_CF_CDSB
                // for at least one of the conjugate planes

                // Suppose that the bisecting line nSigma1_Sm is defined by the sum of normal vectors nPlane1 + nPlane2
                this.calculateSigma1_Sigma3_ObtuseAngleNormals_CF_CDSB()

                typeMovementConsistency1 = true
                typeMovementConsistency2 = true

                if (this.params1.sensOfMovement !== 'UKN') {
                    // The sense of movement is defined for conjugate plane 1 (UKN = unknown)
                    // Check consitency of movement 
                    typeMovementConsistency1  = this.cf1.perpendicularPlanesCheckmovement({
                        noPlane: this.params1.noPlane,
                        nPlane: this.nPlane1, 
                        coordinates: this.cf1.fault.sphericalCoords,
                        nStriation: this.cf1.fault.striation, 
                        sensOfMovement: this.params1.sens_of_movement, 
                        nSigma3_Sm: this.nSigma3_Sm, 
                        nSigma2_Sm: this.nSigma2_Sm
                    })
                }
                if (this.params2.sensOfMovement !== 'UKN') {
                    // The sense of movement is defined for conjugate plane 2
                    // Check consitency of movement
                    typeMovementConsistency2  = this.cf2.perpendicularPlanesCheckmovement({
                        noPlane: this.params2.noPlane,
                        nPlane: this.nPlane2, 
                        coordinates: this.cf2.fault.sphericalCoords,
                        nStriation: this.cf2.fault.striation, 
                        sensOfMovement: this.params2.sens_of_movement, 
                        nSigma3_Sm: this.nSigma3_Sm, 
                        nSigma2_Sm: this.nSigma2_Sm
                    })
                }

                if ( !typeMovementConsistency1 || !typeMovementConsistency2 ) {
                    throw (`Conjugate planes ${this.params2.noPlane} and ${this.params2.noPlane} are perpendicular`)
                    throw new Error(`Sense of movement of at least one of the perpendicular planes is not consistent with fault kinematics`)
                } 
            }

        } else {
            const msg = 'conjugate planes '+ this.params1.noPlane+ ' and '+ this.params2.noPlane+ ' are perpendicular. Please indicate type of movement for at least one plane'
            throw new Error(msg)
        }
    }

    protected calculateSigma1_Sigma3_AcuteAngleNormals_CF_CDSB() {
        // Method used in stress analysis for Conjugate Faults and Conjugate Dilatant Shear Bbands

        // The angle between the 2 normals < PI/2:
        // Sigma 1 and Sigma 3 are located in the plane generated by nPlane1 and nPlane2  (normal unit vectors point upward)

        // In principle Sigma 3 bisects the acute angle (< 90°) between the normal vectors of the conjugate planes 
        // The bisecting line nSigma3_Sm is defined by the sum of normal vectors nPlane1 + nPlane2
        this.nSigma3_Sm = add_Vectors( {U: this.nPlane1, V: this.nPlane2} )
        // note that nSigma3_Sm is always located in the compressional quadrant of the outward hemisphere relative to each of the planes
        // i.e., the scalar product nPlane1 . nSigma3_Sm > 0
        this.nSigma3_Sm = normalizeVector(this.nSigma3_Sm)

        // nSigma1_Sm = nSigma3_Sm x nSigma2_Sm
        // The right-handed reference system is defined consistently with the convention for stress axes orientations (sigma 1, sigma 3, sigma 2)
        this.nSigma1_Sm = normalizedCrossProduct( {U: this.nSigma3_Sm, V: this.nSigma2_Sm} )
    }

    protected calculateSigma1_Sigma3_ObtuseAngleNormals_CF_CDSB() {
        // Method used in stress analysis for Conjugate Faults and Conjugate Dilatant Shear Bbands

        // The angle between the 2 normals > PI/2:
        // Sigma 1 and Sigma 3 are located in the plane generated by nPlane1 and nPlane2  (normal unit vectors point upward)

        // In principle Sigma 1 bisects the obtuse angle (> 90°) between the normal vectors of the conjugate planes 
        // The bisecting line nSigma1_Sm is defined by the sum of normal vectors nPlane1 + nPlane2
        this.nSigma1_Sm = add_Vectors( {U: this.nPlane1, V: this.nPlane2} )
        this.nSigma1_Sm = normalizeVector(this.nSigma1_Sm)

        // nSigma3_Sm = nSigma2_Sm x nSigma1_Sm
        // The right-handed reference system is defined consistently with the convention for stress axes orientations (sigma 1, sigma 3, sigma 2)
        this.nSigma3_Sm = normalizedCrossProduct( {U: this.nSigma2_Sm, V:this.nSigma1_Sm} )
    }
}
