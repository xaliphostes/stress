import { Matrix3x3, Vector3 } from "../types"

/**
 * @brief Decomposition of a strain/stress tensor (eigen)
 */
export type TensorParameters = {
    S: Matrix3x3,
    // Normalized eigen vectors
    S1: Vector3, 
    S2: Vector3, 
    S3: Vector3,
    // Eigen values
    s1: number,
    s2: number,
    s3: number,
    // Transformation matrix
    Hrot: Matrix3x3
}
