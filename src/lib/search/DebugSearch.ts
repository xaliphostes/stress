import { Data } from "../data";
import { cloneMisfitCriteriunSolution, MisfitCriteriunSolution } from "../InverseMethod";
import { Matrix3x3, newMatrix3x3, newMatrix3x3Identity } from "../types";
import { SearchMethod } from "./SearchMethod";

export class DebugSearch implements SearchMethod {

    setInteractiveSolution({rot, stressRatio}:{rot: Matrix3x3, stressRatio: number}): void {
    }

    run(data: Data[], misfitCriteriaSolution: MisfitCriteriunSolution): MisfitCriteriunSolution {

        const newSolution = cloneMisfitCriteriunSolution(misfitCriteriaSolution)

        for (let i=0; i<3; ++i) {
            for (let j=0; j<3; ++j) {
                const stress = newMatrix3x3()
                const misfit = data.reduce( (previous, current) => previous + current.cost({stress}) , 0) / data.length
                if (misfit < newSolution.misfit) {
                    newSolution.misfit = misfit
                    newSolution.rotationMatrixD = stress
                    newSolution.stressRatio = undefined
                    newSolution.stressTensorSolution = newMatrix3x3Identity()
                }
            }
        }

        return newSolution
    }
}
