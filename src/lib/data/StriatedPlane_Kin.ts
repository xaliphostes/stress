import { Matrix3x3, normalizeVector, scalarProductUnitVectors, Vector3 } from "../types"
import { Data } from "./Data"
import { faultStressComponents } from "../types/mechanics"
import { Fault, Direction, SensOfMovement, getDirectionFromString, directionExists, getSensOfMovementFromString, sensOfMovementExists } from "../utils/Fault"
import { FractureStrategy, StriatedPlaneProblemType } from "./types"
import { DataParameters } from "./DataParameters"
import { TensorParameters } from "../geomeca"

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

    initialize(params: DataParameters[]): boolean {
        if (Number.isNaN(params[0].strike)) {
            throw new Error('Missing strike angle for Striated Plane')
        }

        if (Number.isNaN(params[0].dip)) {
            throw new Error('Missing dip angle for Striated Plane')
        }

        if (params[0].dip < 90 && Number.isNaN(params[0].dipDirection)) {
            throw new Error('Missing dip direction for Striated Plane')
        }

        // Check that nPlane and nStriation are unit vectors
        const { nPlane, nStriation, nPerpStriation } = Fault.create({
            strike: params[0].strike, 
            dipDirection: this.getMapDirection(params[0].dipDirection), 
            dip: params[0].dip, 
            sensOfMovement: this.getSensOfMovement(params[0].typeOfMovement), 
            rake: params[0].rake, 
            strikeDirection: this.getMapDirection(params[0].strikeDirection)
        })
        this.nPlane = nPlane
        this.nStriation = nStriation
        this.nPerpStriation = nPerpStriation

        // Check orthogonality
        const sp = scalarProductUnitVectors({U: nPlane, V: nStriation})
        if (Math.abs(sp) >this.EPS) {
            throw new Error(`striation is not on the fault plane. Dot product gives ${sp}`)
        }

        return true
    }

    check({displ, strain, stress}:{displ: Vector3, strain: Matrix3x3, stress: Matrix3x3}): boolean {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            return stress !== undefined
        }
        return displ !== undefined
    }

    cost({displ, strain, stress}:{displ: Vector3, strain: TensorParameters, stress: TensorParameters}): number {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            // For the first implementation, use the W&B hyp.
            // let d = tensor_x_Vector({T: stress, V: this.nPlane}) // Cauchy
            // d = normalizeVector(d)

            // Calculate shear stress parameters
            // Calculate the magnitude of the shear stress vector in reference system S
            const {shearStress, normalStress, shearStressMag} = faultStressComponents({stressTensor: stress.S, normal: this.nPlane})
            let cosAngularDifStriae = 0

            if ( shearStressMag > 0 ) { // shearStressMag > Epsilon would be more realistic ***
                // nShearStress = unit vector parallel to the shear stress (i.e. representing the calculated striation)
                let nShearStress = normalizeVector(shearStress, shearStressMag)
                // The angular difference is calculated using the scalar product: 
                // nShearStress . nStriation = |nShearStress| |nStriation| cos(angularDifStriae) = 1 . 1 . cos(angularDifStriae)
                // cosAngularDifStriae = cos(angular difference between calculated and measured striae)
                cosAngularDifStriae = scalarProductUnitVectors({U: nShearStress, V: this.nStriation})

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

    protected getMapDirection(s: string): Direction {
        if (!directionExists(s)) {
            throw new Error(`Direction ${s} is not defined (or incorrectly defined)`)
        }
        return getDirectionFromString(s)
    }
    
    protected getSensOfMovement(s: string): SensOfMovement {
        if (!sensOfMovementExists(s)) {
            throw new Error(`Sens of movement ${s} is not defined (or incorrectly defined)`)
        }
        return getSensOfMovementFromString(s)
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

const mapSensOfMovement = new Map<string, SensOfMovement>()
mapSensOfMovement.set("Inverse", SensOfMovement.I)
mapSensOfMovement.set("Inverse - Left Lateral", SensOfMovement.I_LL)
mapSensOfMovement.set("Inverse - Right Lateral", SensOfMovement.I_RL)
mapSensOfMovement.set("Left Lateral", SensOfMovement.LL)
mapSensOfMovement.set("Normal", SensOfMovement.N)
mapSensOfMovement.set("Normal - Left Lateral", SensOfMovement.N_LL)
mapSensOfMovement.set("Normal - Right Lateral", SensOfMovement.N_RL)
mapSensOfMovement.set("Right Lateral", SensOfMovement.RL)
mapSensOfMovement.set("Unknown", SensOfMovement.UKN)
*/