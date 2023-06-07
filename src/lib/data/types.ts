import { Point3D, Vector3 } from "../types"

/**
 * @category Data
 */
export enum FractureStrategy {
    ANGLE,
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
