import {
    add_Vectors, Matrix3x3, multiplyTensors,
    normalizedCrossProduct, normalizeVector,
    transposeTensor, Vector3
} from "../types"
import { Data } from "./Data"
import { FractureStrategy, StriatedPlaneProblemType, Tokens } from "./types"
import { ConjugatePlanesHelper, Direction, toInt } from "../utils"
import { minRotAngleRotationTensor } from "../types/math"
import { createDataArgument, createDataStatus, DataArgument, DataDescription, DataStatus } from "./DataDescription"
import { DataFactory } from "./Factory"
import { HypotheticalSolutionTensorParameters } from "../geomeca/HypotheticalSolutionTensorParameters"

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
    c) The type of mouvement for each conjugate fault plane is an OPTIONAL parameter (i.e. it may be undefined - UND)
       However, it is highly recommended to include the type of mouvment for verification purposes, 
            indicating both the dip-slip and strike-slip compoenents, when possible. 
          Dip-slip component:
              N = Normal fault, 
              I = Inverse fault or thrust
          Strike-slip componenet:
              RL = Right-Lateral fault
              LL = Left-Lateral fault
        Type of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL; UND 
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

    initialize(args: Tokens[]): DataStatus {
        const result = createDataStatus()

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
        { displ?: Vector3, strain?: HypotheticalSolutionTensorParameters, stress?: HypotheticalSolutionTensorParameters }): number {
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
            const MrotHTrot = multiplyTensors({ A: this.Mrot, B: transposeTensor(stress.Hrot) })

            // The angle of rotation associated to tensor MrotHTrot is defined by the trace tr(MrotHTrot), according to the relation:
            //      tr(MrotHTrot) = 1 + 2 cos(theta)
            // 4 possible right-handed reference systems are considered for MrotHTrot in order to calculate the minimum rotation angle

            return minRotAngleRotationTensor(MrotHTrot)
        }
    }

    protected performOneDataLine(toks: Tokens, result: DataStatus): any {
        const arg: DataArgument = createDataArgument()
        arg.toks = toks
        arg.index = toInt(toks[0])

        const strike = DataDescription.getParameter(arg.setIndex(2))

        const dip = DataDescription.getParameter(arg.setIndex(3))

        // -----------------------------------

        const dipDirection = DataDescription.getParameter(arg.setIndex(4))

        if (dip !== 0 && dip !== 90) {
            // General case: the plane is neither horizontal nor vertical 

            if (dipDirection === Direction.UND) {
                // For non-horizontal and non-vertical planes the dip direction must be defined in terms of a geographic direction: N, S, E, W, NE, SE, SW, NW
                result.status = false
                result.messages.push(`Data number ${toks[0]}, column 4: parameter for ${DataFactory.name(this)}, please set the dip direction in terms of a geographic direction`)
            }
        } else if (dipDirection !== Direction.UND) {
            // For horizontal and vertical planes the dip direction is undefined (UND) 
            result.status = false
            result.messages.push(`Data number ${toks[0]}, column 4: parameter for ${DataFactory.name(this)}, for a horizontal or vertical plane please set the dip direction as undefined (UND)`)
        }

        // -----------------------------------

        const typeOfMovement = DataDescription.getParameter(arg.setIndex(8))

        // -----------------------------------

        return {
            noPlane: toInt(toks[0]),
            strike,
            dipDirection,
            dip,
            typeOfMovement
        }
    }

    protected consistencyKinematicsPerpendicularPlanes(): void {
        // The angle between the 2 normals is approximately equal to PI/2:
        // In this situation, the orientation of Sigma 1 and Sigma 3 can be permuted.
        // The sense of mouvement of at least one conjugate fault plane must be known in order to define the orientation of the stress axes


        // typeMovementConsistency: boolean indicating if the current stress axes orientations are consistent or not with type of movement
        let typeMovementConsistency1, typeMovementConsistency2 = true

        if (this.params1.typeOfMovement !== 'UND' || this.params2.typeOfMovement !== 'UND') {
            // Find orientations of Sigma 1, Sigma 2 and Sigma 3, and check for consistency of mouvement if both movements are known.

            // Suppose that the bisecting line nSigma3_Sm is defined by the sum of normal vectors nPlane1 + nPlane2
            this.calculateSigma1_Sigma3_AcuteAngleNormals_CF_CDSB()

            if (this.params1.typeOfMovement !== 'UND') {
                // The sense of movement is defined for conjugate plane 1 (UND = undefined)
                // Check consitency of movement 
                typeMovementConsistency1 = this.cf1.perpendicularPlanesCheckmovement({
                    noPlane: this.params1.noPlane,
                    nPlane: this.nPlane1,
                    coordinates: this.cf1.fault.sphericalCoords,
                    nStriation: this.cf1.fault.striation,
                    typeOfMovement: this.params1.type_of_movement,
                    nSigma3_Sm: this.nSigma3_Sm,
                    nSigma2_Sm: this.nSigma2_Sm
                })
            }
            if (this.params2.typeOfMovement !== 'UND') {
                // The sense of movement is defined for conjugate plane 2
                // Check consitency of movement
                typeMovementConsistency2 = this.cf2.perpendicularPlanesCheckmovement({
                    noPlane: this.params2.noPlane,
                    nPlane: this.nPlane2,
                    coordinates: this.cf2.fault.sphericalCoords,
                    nStriation: this.cf2.fault.striation,
                    typeOfMovement: this.params2.type_of_movement,
                    nSigma3_Sm: this.nSigma3_Sm,
                    nSigma2_Sm: this.nSigma2_Sm
                })
            }

            if (!typeMovementConsistency1 || !typeMovementConsistency2) {
                // The type of movement is NOT consistent with the stress axes orientations assumed in:
                //      calculateSigma1_Sigma3_AcuteAngleNormals_CF_CDSB
                // for at least one of the conjugate planes

                // Suppose that the bisecting line nSigma1_Sm is defined by the sum of normal vectors nPlane1 + nPlane2
                this.calculateSigma1_Sigma3_ObtuseAngleNormals_CF_CDSB()

                typeMovementConsistency1 = true
                typeMovementConsistency2 = true

                if (this.params1.typeOfMovement !== 'UND') {
                    // The sense of movement is defined for conjugate plane 1 (UND = undefined)
                    // Check consitency of movement 
                    typeMovementConsistency1 = this.cf1.perpendicularPlanesCheckmovement({
                        noPlane: this.params1.noPlane,
                        nPlane: this.nPlane1,
                        coordinates: this.cf1.fault.sphericalCoords,
                        nStriation: this.cf1.fault.striation,
                        typeOfMovement: this.params1.type_of_movement,
                        nSigma3_Sm: this.nSigma3_Sm,
                        nSigma2_Sm: this.nSigma2_Sm
                    })
                }
                if (this.params2.typeOfMovement !== 'UND') {
                    // The sense of movement is defined for conjugate plane 2
                    // Check consitency of movement
                    typeMovementConsistency2 = this.cf2.perpendicularPlanesCheckmovement({
                        noPlane: this.params2.noPlane,
                        nPlane: this.nPlane2,
                        coordinates: this.cf2.fault.sphericalCoords,
                        nStriation: this.cf2.fault.striation,
                        typeOfMovement: this.params2.type_of_movement,
                        nSigma3_Sm: this.nSigma3_Sm,
                        nSigma2_Sm: this.nSigma2_Sm
                    })
                }

                if (!typeMovementConsistency1 || !typeMovementConsistency2) {
                    throw (`Conjugate planes ${this.params2.noPlane} and ${this.params2.noPlane} are perpendicular`)
                    throw new Error(`Sense of movement of at least one of the perpendicular planes is not consistent with fault kinematics`)
                }
            }

        } else {
            const msg = 'conjugate planes ' + this.params1.noPlane + ' and ' + this.params2.noPlane + ' are perpendicular. Please indicate type of movement for at least one plane'
            throw new Error(msg)
        }
    }

    protected calculateSigma1_Sigma3_AcuteAngleNormals_CF_CDSB() {
        // Method used in stress analysis for Conjugate Faults and Conjugate Dilatant Shear Bbands

        // The angle between the 2 normals < PI/2:
        // Sigma 1 and Sigma 3 are located in the plane generated by nPlane1 and nPlane2  (normal unit vectors point upward)

        // In principle Sigma 3 bisects the acute angle (< 90°) between the normal vectors of the conjugate planes 
        // The bisecting line nSigma3_Sm is defined by the sum of normal vectors nPlane1 + nPlane2
        this.nSigma3_Sm = add_Vectors({ U: this.nPlane1, V: this.nPlane2 })
        // note that nSigma3_Sm is always located in the compressional quadrant of the outward hemisphere relative to each of the planes
        // i.e., the scalar product nPlane1 . nSigma3_Sm > 0
        this.nSigma3_Sm = normalizeVector(this.nSigma3_Sm)

        // nSigma1_Sm = nSigma3_Sm x nSigma2_Sm
        // The right-handed reference system is defined consistently with the convention for stress axes orientations (sigma 1, sigma 3, sigma 2)
        this.nSigma1_Sm = normalizedCrossProduct({ U: this.nSigma3_Sm, V: this.nSigma2_Sm })
    }

    protected calculateSigma1_Sigma3_ObtuseAngleNormals_CF_CDSB() {
        // Method used in stress analysis for Conjugate Faults and Conjugate Dilatant Shear Bbands

        // The angle between the 2 normals > PI/2:
        // Sigma 1 and Sigma 3 are located in the plane generated by nPlane1 and nPlane2  (normal unit vectors point upward)

        // In principle Sigma 1 bisects the obtuse angle (> 90°) between the normal vectors of the conjugate planes 
        // The bisecting line nSigma1_Sm is defined by the sum of normal vectors nPlane1 + nPlane2
        this.nSigma1_Sm = add_Vectors({ U: this.nPlane1, V: this.nPlane2 })
        this.nSigma1_Sm = normalizeVector(this.nSigma1_Sm)

        // nSigma3_Sm = nSigma2_Sm x nSigma1_Sm
        // The right-handed reference system is defined consistently with the convention for stress axes orientations (sigma 1, sigma 3, sigma 2)
        this.nSigma3_Sm = normalizedCrossProduct({ U: this.nSigma2_Sm, V: this.nSigma1_Sm })
    }
}
