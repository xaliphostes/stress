import { stressTensorDelta } from "../search"
import { Matrix3x3, Vector3, transposeTensor } from "../types"
import { HypotheticalSolutionTensorParameters } from "./HypotheticalSolutionTensorParameters"

export function fromRotationsToTensor(Hrot: Matrix3x3, stressRatio: number): HypotheticalSolutionTensorParameters {
    const Hrot_ = Hrot
    const stressRatio_ = stressRatio

    // The normalized eigen-vectors of the stress tensor are defined in terms of the lines of transformation matrix Hrot from reference system S to Sh:
    const S1_Xh = [Hrot_[0][0], Hrot_[0][1], Hrot_[0][2]] as Vector3
    const S3_Yh = [Hrot_[1][0], Hrot_[1][1], Hrot_[1][2]] as Vector3
    const S2_Zh = [Hrot_[2][0], Hrot_[2][1], Hrot_[2][2]] as Vector3

    // The corresponding eigenvalues (sigma1_Sh, sigma3_Sh, sigma2_Sh) in system Sh defined in terms of the normalized Mohr-Circle diagram: 
    //      Stress ratio is defined either by the user in the interactive search, or in the search method (e.g. Montecarlo)
    // The principal stress values are NEGATIVE (compressive) since stress calculations are done using the CONTINUUM MECHANICS CONVENTION (e.g., search/utils.ts).
    const values = [-1, 0, -stressRatio_]

    const HrotT = transposeTensor(Hrot_)
    const S_ = stressTensorDelta(stressRatio, Hrot_, HrotT)

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

    return {
        S: S_,
        S1_X: S1_Xh,
        S3_Y: S3_Yh,
        S2_Z: S2_Zh,
        s1_X: values[0],
        s3_Y: values[1],
        s2_Z: values[2],
        Hrot: Hrot_
    }
}