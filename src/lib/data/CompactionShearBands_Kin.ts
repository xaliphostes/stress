// import {
//     Matrix3x3, Point3D, scalarProductUnitVectors,
//     SphericalCoords, Vector3, add_Vectors,
//     constant_x_Vector, deg2rad, spherical2unitVectorCartesian,
//     faultStressComponents, normalizeVector, unitVectorCartesian2Spherical,
//     normalizedCrossProduct,
//     multiplyTensors
// }
//     from "../types"
// import { Data, DataParameters } from "./Data"
// import { StriatedPlaneProblemType } from "./StriatedPlane_Kin"
// import { FractureStrategy } from "./types"

// import { Fault, Direction, SensOfMovement } from "../utils/Fault"


// // import { Fracture, FractureParams, FractureStrategy } from "./Fracture"

import { add_Vectors, constant_x_Vector, Matrix3x3, multiplyTensors, newMatrix3x3, normalizedCrossProduct, normalizeVector, scalarProductUnitVectors, transposeTensor, Vector3 } from "../types"
import { Data } from "./Data"
// import { faultStressComponents } from "../types/mechanics"
// import { Fault, Direction, SensOfMovement } from "../utils/Fault"
import { FractureStrategy, StriatedPlaneProblemType } from "./types"
import { CompactionShearBands } from "../utils/CompactionShearBands"
import { getDirectionFromString, getSensOfMovementFromString } from "../utils"
import { minRotAngleRotationTensor } from "../types/math"
import { DataParameters } from "./DataParameters"

/** 
 Compaction-Shear Bands: 
 A pair of compaction-shear bands is defined by two planes whose plane of movement is perpendicular to the intersection line between the planes.
 The plane of movement is defined by the two normal vectors to the compaction-shear bands.
 We make the following hypotheses concerning principal stress orientations: 
    The compressional axis Sigma 1 is located in the plane of movement and bisects the obtuse angle (>= 90°) between compaction-shear bands
    The extensional axis Sigma 3 is located in the plane of movement and bisects the acute angle (<= 90°) between compaction-shear bands

 Compaction-shear bands are defined in the input file in two consecutive lines.
 Each line specifies all the available data for each compaction-shear band.

 Several data sets defining two compaction-shear bands are considered:
 1) Case 1: The geometry and kinematics of the compaction-shear bands are defined, yet the rake angles are NOT defined:
    The orientation of the principal axes are calculated from the geometry of the compaction-shear bands.
    The intermediate axis Sigma 2 is parallel to the intersection line between the compaction-shear bands;
    The intermediate axis Sigma 2 is perpendicular to the plane of mouvement;
    a) Each plane is defined by a set of 3 parameters, as follows:
        Fault strike: clockwise angle measured from the North direction [0, 360)
        Fault dip: [0, 90]
        Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
    b) The rake angles defining the slip vectors are NOT defined
    c) The sense of mouvement is indicated for each compaction-shear band :
        For verification purposes, it is recommended to indicate both the dip-slip and strike-slip compoenents, when possible. 
          Dip-slip component:
              N = Normal fault, 
              I = Inverse fault or thrust
          Strike-slip componenet:
              RL = Right-Lateral fault
              LL = Left-Lateral fault
        Sense of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL 
2) Case 2: The geometry, the striation (i.e., the rake), and the kinematics of one or both compaction-shear bands are defined.
    This case is not considered as the striations define redundant information for constraining the stress tensor orientation.
    Compaction-shear bands with striations can be considered separately as neoformed striated planes for which the angle <Sigma 1,n> is known


3) Particular case:
    If the striation is known for one of the conjugate faults, then the other plane
    can be defined by one axis that is contained in the plane. 
    However, this case would require a special format in the input file, which is inconvenient...

    @category Data
 */
export class CompactionShearBandsKin extends Data {
    protected nPlane: Vector3[] = []
    protected nStriation1: Vector3 = undefined
    protected nStriation2: Vector3 = undefined

    protected pos: Vector3 = undefined
    protected problemType = StriatedPlaneProblemType.DYNAMIC
    protected strategy = FractureStrategy.ANGLE
    protected oriented = true
    protected EPS = 1e-7
    protected nPerpStriation: Vector3

    protected plane = [false, false]

    // Principal directions of the data
    protected nSigma1_Sc: Vector3 = undefined
    protected nSigma2_Sc: Vector3 = undefined
    protected nSigma3_Sc: Vector3 = undefined
    protected Crot: Matrix3x3 = undefined

    protected csb: any[] = [undefined, undefined]
    protected params: any[] = [undefined, undefined]
    protected striation = [true, true]

    nbLinkedData(): number {
        return 2
    }

    initialize(params: DataParameters[]): boolean {
        let nPlane2Neg: Vector3

        // TODO
        // CHeck that params.length === 2

        for (let i = 0; i < 2; ++i) {
            if (Number.isNaN(params[i].strike)) {
                throw new Error('Missing strike angle for compaction-shear band ' + params[i].noPlane)
            }

            if (Number.isNaN(params[i].dip)) {
                throw new Error('Missing dip angle for compaction-shear band ' + params[i].noPlane)
            }

            if (params[i].dip < 90 && params[i].dipDirection === undefined) {
                throw new Error('Missing dip direction for compaction-shear band  ' + params[i].noPlane)
            }

            this.params[i] = {
                noPlane: params[i].noPlane,
                strike: params[i].strike,
                dipDirection: getDirectionFromString(params[i].dipDirection),
                dip: params[i].dip,
                sensOfMovement: getSensOfMovementFromString(params[i].typeOfMovement),
                rake: params[i].rake,
                strikeDirection: getDirectionFromString(params[i].strikeDirection)
            }

            this.csb[i] = CompactionShearBands.create(this.params[i])

            // compaction-shear band i is defined: (strike1, dip1, dipDirection1)
            this.plane[i] = true
            // Calculate the unit vector normal to plane i: nPlane
            this.nPlane[i] = this.csb[i].nPlane
        }

        if (this.nPlane[0] === this.nPlane[1] || this.nPlane[0] === constant_x_Vector({ k: -1, V: this.nPlane[1] })) {
            throw new Error('The two compaction-shear bands ' + this.params[0].noPlane + ' and ' + this.params[1].noPlane + ' are identical')
        }

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

    checkCompactionShearBands(): void {
        if (this.plane[0] && this.plane[1]) {
            // The first and second compaction-shear bands are defined (strike1, dip1 and dipDirection1) and (strike2, dip2 and dipDirection2)

            // if (Number.isNaN(this.params[0].rake) && Number.isNaN(this.params[0].striationTrend)) {
            //     this.striation1 = false
            // }
            // if (Number.isNaN(this.params2.rake) && Number.isNaN(this.params2.striationTrend)) {
            //     this.striation2 = false
            // }
            // if (!this.striation1 && !this.striation2) {

            if (true) {
                // Case 1: general case
                // The striations are not defined for compaction-shear bands 1 and 2

                // In principle we have already checked that the two compaction-shear bands are different
                // Calculate the unit vector parellel to Sigma 2, which is perpendicular to nPlane1 and nPlane2:
                this.nSigma2_Sc = normalizedCrossProduct({ U: this.nPlane[0], V: this.nPlane[0] })

                // Calculate the two normalized stress axes (Sigma 1 and Sigma 3) that bisect the angles between the compaction-shear bands
                // angle_nPlane1_nPlane2 in interval (0,PI)
                const angle_nPlane1_nPlane2 = Math.acos(scalarProductUnitVectors({ U: this.nPlane[0], V: this.nPlane[1] }))

                if (Math.abs(angle_nPlane1_nPlane2 - Math.PI / 2) > this.EPS) {

                    // The compaction-shear bands are not perpendicular to each other

                    if (angle_nPlane1_nPlane2 > Math.PI / 2) {

                        // The angle between the 2 normals > PI/2:
                        // Sigma 1 and Sigma 3 are located in the plane generated by nPlane1 and nPlane2 (normal unit vectors point upward)

                        // In principle Sigma 3 bisects the acute angle (< 90°) between the compaction-shear bands
                        // The bisecting line nSigma3_Sc is defined by the sum of normal vectors nPlane1 + nPlane2
                        this.nSigma3_Sc = add_Vectors({ U: this.nPlane[0], V: this.nPlane[1] })
                        // note that nSigma3_Sc is always located in the compressional quadrant of the outward hemisphere relative to each of the fault planes
                        // i.e., the scalar product nPlane1 . nSigma3_Sc > 0
                        this.nSigma3_Sc = normalizeVector(this.nSigma3_Sc)

                        // nSigma1_Sc = nSigma3_Sc x nSigma2_Sc
                        // The right-handed reference system is defined according to systems S' and S'' (sigma 1, sigma 3, sigma 2)
                        this.nSigma1_Sc = normalizedCrossProduct({ U: this.nSigma3_Sc, V: this.nSigma2_Sc })

                    } else {

                        // The angle between the 2 normals < PI/2:
                        // In principle Sigma 1 bisects the obtuse angle (> 90°) between the compaction-shear bands 
                        // The bisecting line nSigma1_Sc is defined by the sum of normal vectors nPlane1 + nPlane2
                        this.nSigma1_Sc = add_Vectors({ U: this.nPlane[0], V: this.nPlane[1] })
                        this.nSigma1_Sc = normalizeVector(this.nSigma1_Sc)

                        // nSigma3_Sc = nSigma2_Sc x nSigma1_Sc
                        // The right-handed reference system is defined according to systems S' and S'' (sigma 1, sigma 3, sigma 2)
                        this.nSigma3_Sc = normalizedCrossProduct({ U: this.nSigma2_Sc, V: this.nSigma1_Sc })
                    }

                    // ****** let (coordinates1.phi, coordinates1.theta) and (coordinates2.phi, coordinates2.theta) be the spherical coords
                    // of conjugate plaes 1 and 2 in the geographic reference system: S = (X,Y,Z) = (E,N,Up)
                    // This requires using method faultSphericalCoords in class fault
                    // Check that the sense of mouvement is consistent with the orientation of stress axes***
                    if (this.params[0].sensOfMovement !== 'UKN') {
                        // The sense of movement is defined for compaction-shear band 1 (UKN = unknown)
                        // Check consitency of movement 
                        this.csb[0].conjugatePlaneCheckMouvement({
                            noPlane: this.params[0].noPlane,
                            nPlane: this.nPlane[0],
                            coordinates: this.csb[0].fault.sphericalCoords,
                            nStriation: this.csb[0].fault.striation,
                            sensOfMovement: this.params[0].sens_of_movement,
                            nSigma3_Sc: this.nSigma3_Sc,
                            nSigma2_Sc: this.nSigma2_Sc
                        })
                    }
                    if (this.params[1].sensOfMovement !== 'UKN') {
                        // The sense of movement is defined for compaction-shear band 2
                        // Check consitency of movement
                        this.csb[1].conjugatePlaneCheckMouvement({
                            noPlane: this.params[1].noPlane,
                            nPlane: this.nPlane[1],
                            coordinates: this.csb[1].fault.sphericalCoords,
                            nStriation: this.csb[1].fault.striation,
                            sensOfMovement: this.params[1].sens_of_movement,
                            nSigma3_Sc: this.nSigma3_Sc,
                            nSigma2_Sc: this.nSigma2_Sc
                        })
                    }

                } else {
                    // The angle between the 2 normals is approximately equal to PI/2:
                    // In this situation, the orientation of Sigma 1 and Sigma 3 can be permuted.
                    // The sense of mouvement of at least one compaction-shear band must be known in order to define the orientation of the stress axes
                    if (this.params[0].sensOfMovement !== 'UKN' || this.params[1].sensOfMovement !== 'UKN') {
                        // Find orientations of Sigma 1, Sigma 2 and Sigma 3, and check for consistency of mouvement if both movements are known.
                    } else {
                        const msg = 'conjugate faults ' + this.params[0].noPlane + ' and ' + this.params[1].noPlane + ' are perpendicular. Please indicate type of movement for at least one plane'
                        throw new Error(msg)

                    }
                }
                // We define 2 orthonormal right-handed reference systems:
                //      S =  (X, Y, Z ) is the geographic reference frame oriented in (East, North, Up) directions.
                //      Sc = (Xc,Yc,Zc) is the principal stress reference frame, parallel to the stress axes obtained from the compaction-shear bands (sigma1_Sc, sigma3_Sc, sigma2_Sc);

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
                // The striations on one are both compaction-shear bands are defined (rake, strike direction, and type of movement)
                // 

            }

        } else if (this.plane[0] || this.plane[1]) {
            // One of the two compaction-shear bands is defined while the other is not
            // In principle the second plane can be calculated using the striation of the first plane and a line passing by the second plane
            // However, this case is rather unusual.
        } else {
            // The two compaction-shear bands are not defined
            throw new Error('conjugate faults ' + this.params[0].noPlane + ' and ' + this.params[1].noPlane + ' are not defined (strike, dip and dip direction')
        }
    }

    cost({ displ, strain, stress, Mrot }:
        { displ?: Vector3, strain?: Matrix3x3, stress?: Matrix3x3, Mrot?: Matrix3x3 }): number {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            // The cost function uses the rotation tensor Crot from reference system S to Sc, calculated in method checkCompactionShearBands

            // The cost function for two compaction-shear bands is defined as the minimum angular rotation between system Sc and the stress tensor in system S' or S'':
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
            const CFrot = multiplyTensors({ A: this.Crot, B: transposeTensor(Mrot) })
            // const CFrot = multiplyTensors({A: Crot, B: WTrot})

            // The angle of rotation associated to tensor CFrot is defined by the trace tr(CFrot), according to the relation:
            //      tr(CFrot) = 1 + 2 cos(theta)
            // 4 possible right-handed reference systems are considered for CFrot in order to calculate the minimum rotation angle

            return minRotAngleRotationTensor(CFrot)
        }
    }
}
