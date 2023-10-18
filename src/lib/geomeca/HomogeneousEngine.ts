import { Matrix3x3, Vector3, transposeTensor } from "../types";
import { Engine } from "./Engine"
import { HypotheticalSolutionTensorParameters } from "./HypotheticalSolutionTensorParameters";
import { stressTensorDelta } from "../search";

export class HomogeneousEngine implements Engine {
    private S_: Matrix3x3 = undefined
    private S1_Xh:  Vector3 = undefined
    private S3_Yh:  Vector3 = undefined
    private S2_Zh:  Vector3 = undefined
    private values: Vector3 = undefined
    private Hrot_:   Matrix3x3 = undefined
    private stressRatio_: number = undefined

    setHypotheticalStress(Hrot: Matrix3x3, stressRatio: number): void {
        this.Hrot_ = Hrot
        this.stressRatio_ = stressRatio

        // The normalized eigen-vectors of the stress tensor are defined in terms of the lines of transformation matrix Hrot from reference system S to Sh:
        this.S1_Xh = [this.Hrot_[0][0], this.Hrot_[0][1],  this.Hrot_[0][2]] as Vector3
        this.S3_Yh = [this.Hrot_[1][0], this.Hrot_[1][1],  this.Hrot_[1][2]] as Vector3
        this.S2_Zh = [this.Hrot_[2][0], this.Hrot_[2][1],  this.Hrot_[2][2]] as Vector3

        // The corresponding eigenvalues (sigma1_Sh, sigma3_Sh, sigma2_Sh) in system Sh defined in terms of the normalized Mohr-Circle diagram: 
        //      Stress ratio is defined either by the user in the interactive search, or in the search method (e.g. Montecarlo)
        // The principal stress values are NEGATIVE (compressive) since stress calculations are done using the CONTINUUM MECHANICS CONVENTION (e.g., search/utils.ts).
        this.values = [ -1, 0, -this.stressRatio_ ]

        const HrotT  = transposeTensor( this.Hrot_ )
        this.S_ = stressTensorDelta(stressRatio, this.Hrot_, HrotT)

        // const sigma = [stress[0][0], stress[0][1], stress[0][2], stress[1][1], stress[1][2], stress[2][2]]

        // Eigen method is used for calculation of eigenvalues and eigenvectors in NON-HOMOGENEOUS case study
        /*
        const {values, vectors} = eigen(sigma)
        this.S1 = [vectors[0], vectors[1], vectors[2]] as Vector3
        this.S2 = [vectors[3], vectors[4], vectors[5]] as Vector3
        this.S3 = [vectors[6], vectors[7], vectors[8]] as Vector3
        this.values = [...values] as Vector3
        */

        // For the inversion of the stress tensor solution in the HOMOGENEOUS case study, we define 2 orthonormal right-handed reference systems:
        //
        //      S =  (X, Y, Z ) is the geographic reference frame oriented in (East, North, Up) directions.
        //      Sh = (Xh,Yh,Zh) is the principal stress reference frame parallel to the stress axes, 
        //              defined from the hypothetical stress tensor solution, e.g., from grid search or Montecarlo (sigma1_Sh, sigma3_Sh, sigma2_Sh);
        //
        // Sh is defined by Sr or Sw reference systems:
        //      Sr  =  (Xr, Yr, Zr ) is the principal reference frame chosen by the user in the interactive search phase ('r' stands for 'rough' solution).
        //      Sw =  (Xw, Yw, Zw ) is the principal reference frame for a fixed node in the search grid (sigma_1, sigma_3, sigma_2) ('w' stands for 'winning' solution)

        // Hrot is is the transformation matrix between S and Sh ('H' sand 'h' stand for 'hypothetical' solution), such that:
        //      Vh = Hrot[i]  V      where V and Vh are corresponding vectors in S and Sh
        //      V  = HTrot[i] Vh     (HTrot is tensor Hrot transposed)

        // Hrot is is defined either by Rrot or by Wrot, depending on the calling functions:
        //      Hrot = Rrot in the interactive search phase using integral curves
        //      Hrot = Wrot in the inverse method search phase using Montecarlo (for example)

        // Rotation tensors Rrot and RTrot between systems S and Sr are such that:
        //      Vr = Rrot  V
        //      V  = RTrot Vr        (RTrot is tensor Rrot transposed)

        // Rotation tensors Wrot and WTrot between systems S and Sw satisfy : WTrot = RTrot DTrot, such that:
        //      Vw = Wrot  V
        //      V  = WTrot Vw        (WTrot is tensor Wrot transposed)
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