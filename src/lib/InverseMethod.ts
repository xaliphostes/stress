import { SearchMethod } from "./search/SearchMethod"
import { cloneMatrix3x3, Matrix3x3, newMatrix3x3, newMatrix3x3Identity, Vector3 } from "./types/math"
import { Data } from "./data"
import { MonteCarlo } from "./search"
import { HypotheticalSolutionTensorParameters } from "./geomeca"

/**
 * @category Inversion
 */
export type MisfitCriteriunSolution = {
    // criterion: MisfitCriteriun,
    misfit: number,
    rotationMatrixW: Matrix3x3,
    rotationMatrixD: Matrix3x3,
    stressRatio: number,
    stressTensorSolution: Matrix3x3
}

/**
 * @category Inversion
 */
export function cloneMisfitCriteriunSolution(misfitCriteriunSolution: MisfitCriteriunSolution): MisfitCriteriunSolution {
    return {
        // criterion: misfitCriteriunSolution.criterion,
        misfit: misfitCriteriunSolution.misfit,
        rotationMatrixW: cloneMatrix3x3(misfitCriteriunSolution.rotationMatrixW),
        rotationMatrixD: cloneMatrix3x3(misfitCriteriunSolution.rotationMatrixD),
        stressRatio: misfitCriteriunSolution.stressRatio,
        stressTensorSolution: misfitCriteriunSolution.stressTensorSolution
    }
}

/**
 * @category Inversion
 */
export function createDefaultSolution(): MisfitCriteriunSolution {
    return {
        misfit: Number.POSITIVE_INFINITY,
        rotationMatrixW: newMatrix3x3(),
        rotationMatrixD: newMatrix3x3(),
        stressRatio: 0,
        stressTensorSolution: newMatrix3x3Identity()
    }
}

/**
 * @category Inversion
 */
export class InverseMethod {
    private misfitCriteriunSolution: MisfitCriteriunSolution = {
        misfit: Number.POSITIVE_INFINITY,
        rotationMatrixW: newMatrix3x3Identity(),
        rotationMatrixD: newMatrix3x3Identity(),
        stressRatio: 0,
        stressTensorSolution: newMatrix3x3Identity()
    }
    private searchMethod: SearchMethod = new MonteCarlo()
    private data_:  Data[] = []

    get data() {
        return this.data_
    }

    setSearchMethod(search: SearchMethod) {
        this.searchMethod = search
    }

    addData(data: Data | Data[]) {
        if (Array.isArray(data)) {
            data.forEach( d => this.data_.push(d) )
        } else {
            this.data_.push(data)
        }
    }

    run(reset: boolean = true): MisfitCriteriunSolution {
        if (this.data_.length === 0) {
            throw new Error('No data provided')
        }

        if (reset) {
            this.misfitCriteriunSolution.misfit  = Number.POSITIVE_INFINITY
        }

        return this.searchMethod.run(this.data_, this.misfitCriteriunSolution)
    }

    cost({displ, strain, stress}:{displ?: Vector3, strain?: HypotheticalSolutionTensorParameters, stress?: HypotheticalSolutionTensorParameters}): number {
        if (this.data_.length === 0) {
            throw new Error('No data provided')
        }

        return this.data_.reduce( (cumul, data) => cumul + data.cost({displ, strain, stress}), 0) / this.data_.length
    }
}
