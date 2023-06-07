import { Matrix3x3, multiplyTensors, newMatrix3x3, stressTensorPrincipalAxes, Vector3 } from "../types/math"

/**
 * @category Search-Method
 * @param stressRatio 
 * @param Wrot 
 * @param WTrot 
 * @returns 
 */
export function stressTensorDelta(stressRatio: number, Wrot: Matrix3x3, WTrot: Matrix3x3): Matrix3x3 {

    // Calculate the stress tensor STdelta in reference frame S from the stress tensor in reference frame S'':
    //      STdelta = WTrot STPdelta Wrot
    //
    // where
    //
    //      S'' = (X'',Y'',Z'') is the principal stress reference frame in the search grid node(i,j,k,l), parallel to (sigma_1, sigma_3, sigma_2);
    //      S   = (X, Y, Z ) is the geographic reference frame  oriented in (East, North, Up) directions.
    //      STPdelta = Stress Tensor in the Principal stress reference frame (i.e. diagonal tensor with eigenvalues (1,0,StressRatio).
    //      The principal stress values are negative since stress calculations are done using the continuum mechanics convention.
    const sigma = [-1, 0, -stressRatio] as Vector3
    let STPdelta =  stressTensorPrincipalAxes(sigma)

    // T1 = WTrot STPdelta; this tensor multiplication can be optimized since STPdelta is diagonal with eigenvalues (-1, 0, -StressRatio).
    let T1 : Matrix3x3 = newMatrix3x3()
    T1 = multiplyTensors({A: WTrot, B: STPdelta})
    // STdelta = T1 Wrot = WTrot STPdelta Wrot
    let STdelta = multiplyTensors({A: T1, B: Wrot})

    return STdelta

    // for (let m = 0; m < numberStressInversions; m++) {
    //     // The user may stipulate 1 or 2 different stress inversion methods for the same fault set
    //     // This option allows to compare inversion solutions using different misfit criteria
    //     switch(MisfitCriteriun[m]){
    //         case 1: {
    //             // Angular deviation (Etchecopar et al. 1981)
    //             // FirstNode allows to initialize the mimimisation function with its value for the fist node in the grid
    //             misfitAngularDeviation( firstNode, m )
    //         }
    //         case 2: { 
    //             //Minimum angle of rotation of the tensor that brings the shear stress parallel to the striation (Gephart & Forsyth 1984)
    //             misfitMinimumAngleTensorRotation( firstNode, m )
    //         }
    //     }                                
    // }
}
