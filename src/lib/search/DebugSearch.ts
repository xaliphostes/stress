import { Data } from "../data";
import { Engine, HomogeneousEngine } from "../geomeca";
import { cloneMisfitCriteriunSolution, MisfitCriteriunSolution } from "../InverseMethod";
import { Matrix3x3, multiplyTensors, newMatrix3x3, newMatrix3x3Identity, transposeTensor } from "../types";
import { SearchMethod } from "./SearchMethod";

/**
 * @category Search-Method
 */
export class DebugSearch implements SearchMethod {
    private engine_: Engine = new HomogeneousEngine()

    getEngine() {
        return this.engine_
    }

    setInteractiveSolution({rot, stressRatio}:{rot: Matrix3x3, stressRatio: number}): void {
    }

    setEngine(engine: Engine): void {
        this.engine_ = engine
    }

    run(data: Data[], misfitCriteriaSolution: MisfitCriteriunSolution): MisfitCriteriunSolution {

        const newSolution = cloneMisfitCriteriunSolution(misfitCriteriaSolution)

        for (let i=0; i<3; ++i) {
            for (let j=0; j<3; ++j) {

                const hRot = newMatrix3x3()
                const stressRatio = 0.5
                
                this.engine_.setHypotheticalStress(hRot, stressRatio)
                const misfit = data.reduce( (previous, current) => previous + current.cost({stress: this.engine_.stress(current.position)}) , 0) / data.length
                if (misfit < newSolution.misfit) {
                    newSolution.misfit = misfit
                    newSolution.rotationMatrixD = hRot
                    newSolution.stressRatio = undefined
                    newSolution.stressTensorSolution = newMatrix3x3Identity()
                }
            }
        }

        return newSolution
    }
}
