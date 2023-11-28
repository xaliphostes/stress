import { Matrix3x3, Vector3 } from "../types";
import { Engine } from "./Engine"
import { HypotheticalSolutionTensorParameters } from "./HypotheticalSolutionTensorParameters";
import { fromRotationsToTensor } from "./fromRotationsToTensor";

export class HomogeneousEngine implements Engine {
    private S_: Matrix3x3 = undefined
    private S1_Xh:  Vector3 = undefined
    private S3_Yh:  Vector3 = undefined
    private S2_Zh:  Vector3 = undefined
    private values: Vector3 = undefined
    private Hrot_:   Matrix3x3 = undefined
    private stressRatio_: number = undefined

    setHypotheticalStress(Hrot: Matrix3x3, stressRatio: number): void {
        const s = fromRotationsToTensor(Hrot, stressRatio)
        this.S_ = s.S
        this.S1_Xh = s.S1_X
        this.S3_Yh = s.S3_Y
        this.S2_Zh = s.S2_Z
        this.values = [s.s1_X, s.s2_Z, s.s3_Y]
        this.Hrot_ = Hrot
        this.stressRatio_ = stressRatio
    }

    stress(p: Vector3): HypotheticalSolutionTensorParameters {
        return {
            S: this.S_,
            S1_X: this.S1_Xh, 
            S3_Y: this.S3_Yh,
            S2_Z: this.S2_Zh, 
            s1_X: this.values[0],
            s3_Y: this.values[1],
            s2_Z: this.values[2],
            // s2_Z: this.values[2],
            // s3_Y: this.values[1],
            Hrot: this.Hrot_
        }
    }

    Hrot(): Matrix3x3 {
        return this.Hrot_
    }

    stressRatio(): number {
        return this.stressRatio_
    }

    S(): Matrix3x3 {
        return this.S_
    }

}