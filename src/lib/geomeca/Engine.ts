import { Matrix3x3, Vector3 } from "../types"
import { TensorParameters } from "./TensorParameters"

export interface Engine {
    setRemoteStress(S: Matrix3x3): void
    stress(p: Vector3): TensorParameters

    setHrot(r: Matrix3x3): void
    Hrot(): Matrix3x3
}
