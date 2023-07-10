import { Point3D, Vector3 } from "../types"

/**
 * @category Data
 */
export enum FractureStrategy {
    ANGLE,
    // Criteriun similar or equivalent to the one implemented in the Gephart & Forsyth method (1984)
    MIN_TENSOR_ROT,
    // Criteriun similar to the one implemented in the Etchecopar et al. method (1981)
    MIN_STRIATION_ANGULAR_DIF,
    DOT
}

/**
 * @category Data
 */
export type FractureParams = {
    n: Vector3, 
    pos?: Point3D, 
    strategy?: FractureStrategy, 
    weight?: number
}

/**
 * - DYNAMIC is related to forces (or stresses)
 * - KINEMATIC is related to displacement field
 * @category Data
 */
export enum StriatedPlaneProblemType {
    DYNAMIC,
    KINEMATIC
}

export type Line = string

export type Tokens = string[]

export type DataArguments = Tokens[]
