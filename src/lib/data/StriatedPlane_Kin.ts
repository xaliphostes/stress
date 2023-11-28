import { Matrix3x3, normalizeVector, scalarProductUnitVectors, Vector3 } from "../types"
import { Data } from "./Data"
import { faultStressComponents } from "../types/mechanics"
import {
    FaultHelper, Direction, TypeOfMovement, getDirectionFromString,
    directionExists, getTypeOfMovementFromString, sensOfMovementExists
} from "../utils/FaultHelper"
import { Tokens, FractureStrategy, StriatedPlaneProblemType, createPlane, createStriation } from "./types"
import { HypotheticalSolutionTensorParameters } from "../geomeca"
import { createDataArgument, createDataStatus, DataStatus } from "./DataDescription"
import { readStriatedFaultPlane } from "../io/DataReader"
import { toInt } from "../utils"

/**
 * @category Data
 */
export class StriatedPlaneKin extends Data {
    protected nPlane: Vector3 = undefined
    protected nStriation: Vector3 = undefined
    protected pos: Vector3 = undefined
    protected problemType = StriatedPlaneProblemType.DYNAMIC
    protected strategy = FractureStrategy.ANGLE
    protected oriented = true
    protected EPS = 1e-7
    protected nPerpStriation: Vector3
    protected noPlane = 0

    initialize(args: Tokens[]): DataStatus {
        const toks = args[0]
        const result = createDataStatus()
        const arg = createDataArgument()
        arg.toks = toks
        arg.index = toInt(toks[0])

        // Read parameters definning plane orientation, striation orientation and type of movement
        const plane = createPlane()
        const striation = createStriation()
        readStriatedFaultPlane(arg, plane, striation, result)

        // -----------------------------------

        // If the striation trend is defined (and not the strike direction and rake), then calculate th

        // Check that nPlane and nStriation are unit vectors
        const f = FaultHelper.create(plane, striation)
        this.nPlane = f.normal
        this.nStriation = f.striation
        this.nPerpStriation = f.e_perp_striation
        this.noPlane = toInt(toks[0])

        // Check orthogonality
        const sp = scalarProductUnitVectors({ U: this.nPlane, V: this.nStriation })
        if (Math.abs(sp) > this.EPS) {
            throw new Error(`striation is not on the fault plane. Dot product gives ${sp}`)
        }

        return result
    }

    check({ displ, strain, stress }: { displ: Vector3, strain: Matrix3x3, stress: Matrix3x3 }): boolean {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            return stress !== undefined
        }
        return displ !== undefined
    }

    cost({ displ, strain, stress }: { displ: Vector3, strain: HypotheticalSolutionTensorParameters, stress: HypotheticalSolutionTensorParameters }): number {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            // For the first implementation, use the W&B hyp.
            // let d = tensor_x_Vector({T: stress, V: this.nPlane}) // Cauchy
            // d = normalizeVector(d)

            //==============  Stress analysis using continuum mechanics sign convention : Compressional stresses < 0

            // In principle, principal stresses are negative: (sigma 1, sigma 2, sigma 3) = (-1, -R, 0) 
            // Calculate the magnitude of the shear stress vector in reference system S
            const { shearStress, normalStress, shearStressMag } = faultStressComponents({ stressTensor: stress.S, normal: this.nPlane })
            let cosAngularDifStriae = 0

            if (shearStressMag > 0) { // shearStressMag > Epsilon would be more realistic ***
                // nShearStress = unit vector parallel to the shear stress (i.e. representing the calculated striation)
                let nShearStress = normalizeVector(shearStress, shearStressMag)
                // The angular difference is calculated using the scalar product: 
                // nShearStress . nStriation = |nShearStress| |nStriation| cos(angularDifStriae) = 1 . 1 . cos(angularDifStriae)
                // cosAngularDifStriae = cos(angular difference between calculated and measured striae)
                cosAngularDifStriae = scalarProductUnitVectors({ U: nShearStress, V: this.nStriation })

            } else {
                // The calculated shear stress is zero (i.e., the fault plane is parallel to a principal stress)
                // In such situation we may consider that the calculated striation can have any direction.
                // Nevertheless, the plane should not display striations as the shear stress is zero.
                // Thus, in principle the plane is not compatible with the stress tensor, and it should be eliminated from the analysis
                // In suchh case, the angular difference is taken as PI
                cosAngularDifStriae = -1
            }

            if (this.strategy === FractureStrategy.ANGLE) {
                // The misfit is defined by the angular difference (in radians) between measured and calculated striae
                if (this.oriented) {
                    // The sense of the striation is known
                    return Math.acos(cosAngularDifStriae)
                } else {
                    // The sense of the striation is not known. Thus, we choose the sens that minimizes the angular difference 
                    // and is more compatible with the observed striation.
                    return Math.acos(Math.abs(cosAngularDifStriae))
                }
            } else {
                // The misfit is defined by the the cosine of the angular difference between measured and calculated striae
                if (this.oriented) {
                    return 0.5 - cosAngularDifStriae / 2
                } else {
                    return 0.5 - Math.abs(cosAngularDifStriae) / 2
                }
            }
        }
        throw new Error('Kinematic not yet available')
    }

    predict({ displ, strain, stress }: { displ?: Vector3; strain?: HypotheticalSolutionTensorParameters; stress?: HypotheticalSolutionTensorParameters }): number {
        const { shearStress, normalStress, shearStressMag } = faultStressComponents({ stressTensor: stress.S, normal: this.nPlane })
        let cosAngularDifStriae = 0

        if (shearStressMag > 0) { // shearStressMag > Epsilon would be more realistic ***
            // nShearStress = unit vector parallel to the shear stress (i.e. representing the calculated striation)
            let nShearStress = normalizeVector(shearStress, shearStressMag)
            // The angular difference is calculated using the scalar product: 
            // nShearStress . nStriation = |nShearStress| |nStriation| cos(angularDifStriae) = 1 . 1 . cos(angularDifStriae)
            // cosAngularDifStriae = cos(angular difference between calculated and measured striae)
            cosAngularDifStriae = scalarProductUnitVectors({ U: nShearStress, V: this.nStriation })

        } else {
            // The calculated shear stress is zero (i.e., the fault plane is parallel to a principal stress)
            // In such situation we may consider that the calculated striation can have any direction.
            // Nevertheless, the plane should not display striations as the shear stress is zero.
            // Thus, in principle the plane is not compatible with the stress tensor, and it should be eliminated from the analysis
            // In suchh case, the angular difference is taken as PI
            cosAngularDifStriae = -1
        }


        // The misfit is defined by the angular difference (in radians) between measured and calculated striae
        if (this.oriented) {
            // The sense of the striation is known
            return Math.acos(cosAngularDifStriae)
        } else {
            // The sense of the striation is not known. Thus, we choose the sens that minimizes the angular difference 
            // and is more compatible with the observed striation.
            return Math.acos(Math.abs(cosAngularDifStriae))
        }
    }

    protected getMapDirection(s: string): Direction {
        if (!directionExists(s)) {
            throw new Error(`Direction ${s} is not defined (or incorrectly defined)`)
        }
        return getDirectionFromString(s)
    }

    protected getTypeOfMovement(s: string): TypeOfMovement {
        if (!sensOfMovementExists(s)) {
            throw new Error(`Type of movement ${s} is not defined (or incorrectly defined)`)
        }
        return getTypeOfMovementFromString(s)
    }
}

// ----------------------------------------------------

/*
const mapDirection = new Map<string, Direction>()
mapDirection.set("E", Direction.E)
mapDirection.set("N", Direction.N)
mapDirection.set("NE", Direction.NE)
mapDirection.set("NW", Direction.NW)
mapDirection.set("S", Direction.S)
mapDirection.set("SE", Direction.SE)
mapDirection.set("SW", Direction.SW)
mapDirection.set("W", Direction.W)

const mapSensOfMovement = new Map<string, TypeOfMovement>()
mapSensOfMovement.set("Inverse", TypeOfMovement.I)
mapSensOfMovement.set("Inverse - Left Lateral", TypeOfMovement.I_LL)
mapSensOfMovement.set("Inverse - Right Lateral", TypeOfMovement.I_RL)
mapSensOfMovement.set("Left Lateral", TypeOfMovement.LL)
mapSensOfMovement.set("Normal", TypeOfMovement.N)
mapSensOfMovement.set("Normal - Left Lateral", TypeOfMovement.N_LL)
mapSensOfMovement.set("Normal - Right Lateral", TypeOfMovement.N_RL)
mapSensOfMovement.set("Right Lateral", TypeOfMovement.RL)
mapSensOfMovement.set("Undefined", TypeOfMovement.UND)
*/