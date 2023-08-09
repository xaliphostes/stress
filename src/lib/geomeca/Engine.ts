import { Matrix3x3, Vector3 } from "../types"
import { HypotheticalSolutionTensorParameters } from "./HypotheticalSolutionTensorParameters"

/**
 * 
 */
export interface Engine {
    setHypotheticalStress(hRot: Matrix3x3, stressRatio: number): void
    
    Hrot(): Matrix3x3
    stressRatio(): number
    S(): Matrix3x3

    stress(p: Vector3): HypotheticalSolutionTensorParameters
}
