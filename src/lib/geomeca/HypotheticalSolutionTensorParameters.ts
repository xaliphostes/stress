import { Matrix3x3, Vector3 } from "../types"

/**
 * @brief Decomposition of a strain/stress tensor (eigen)
 */
export type HypotheticalSolutionTensorParameters = {
    S: Matrix3x3,
    // Normalized eigen vectors
    S1_X: Vector3, 
    S2_Z: Vector3, 
    S3_Y: Vector3,
    // Eigen values
    s1_X: number,
    s2_Z: number,
    s3_Y: number,
    // Transformation matrix
    Hrot: Matrix3x3
}
