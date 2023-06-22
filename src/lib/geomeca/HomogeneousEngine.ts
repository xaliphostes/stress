import { Data } from "../data";
import { Matrix3x3, Vector3, cloneMatrix3x3 } from "../types";
import { Engine } from "./Engine"
import { eigen } from "@youwol/math"
import { TensorParameters } from "./TensorParameters";

export class HomogeneousEngine implements Engine {
    private S: Matrix3x3 = undefined
    private S1: Vector3 = undefined
    private S2: Vector3 = undefined
    private S3: Vector3 = undefined
    private values: Vector3 = undefined
    private hrot: Matrix3x3 = undefined

    setRemoteStress(stress: Matrix3x3): void {
        this.S = cloneMatrix3x3(stress)
        const sigma = [stress[0][0], stress[0][1], stress[0][2], stress[1][1], stress[1][2], stress[2][2]]
        const {values, vectors} = eigen(sigma)
        this.S1 = [vectors[0], vectors[1], vectors[2]] as Vector3
        this.S2 = [vectors[3], vectors[4], vectors[5]] as Vector3
        this.S3 = [vectors[6], vectors[7], vectors[8]] as Vector3
        this.values = [...values] as Vector3

        throw new Error('Alfredo: have to compute Hrot here!')
    }

    stress(p: Vector3): TensorParameters {
        return {
            S: this.S,
            S1: this.S1, 
            S2: this.S2, 
            S3: this.S3,
            s1: this.values[0],
            s2: this.values[1],
            s3: this.values[2],
            Hrot: this.hrot
        }
    }

    setHrot(r: Matrix3x3): void {
        this.hrot = r
    }

    Hrot(): Matrix3x3 {
        return this.hrot
    }
}