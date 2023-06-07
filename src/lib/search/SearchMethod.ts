import { Data } from "../data"
import { MisfitCriteriunSolution } from "../InverseMethod"
import { Matrix3x3} from "../types/math"

/**
 * @category Search-Method
 */
export interface SearchMethod {

    setInteractiveSolution({rot, stressRatio}:{rot: Matrix3x3, stressRatio: number}): void

    /**
     * 
     * @note We change the misfitCriteriaSolution variable and this is not the best solution
     * since we cannot parallelize the code
     */
    run(data: Data[], misfitCriteriaSolution: MisfitCriteriunSolution): MisfitCriteriunSolution
}
