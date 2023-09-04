import { MasterStress, StressTensor } from '../types'
import { DebugSearch } from './DebugSearch'
// import { GridSearch } from './GridSearch'
import { MonteCarlo } from './MonteCarlo'
import { SearchMethod } from './SearchMethod'

export namespace SearchMethodFactory {

    const map_: Map<string, any> = new Map()

    export const bind = (obj: any, name: string = '') => {
        name.length === 0 ? map_.set(obj.name, obj) : map_.set(name, obj)
    }

    export const create = (name: string, params: any = undefined): SearchMethod => {
        const M = map_.get(name)
        if (M) {
            const searchMethod = new M(params)
            // to be filled
            if (params !== undefined) {
                const ist = params.interactiveStressTensor
                const st = new StressTensor({
                    trendS1: ist.trendS1,
                    trendS3: ist.trendS3,
                    plungeS1: ist.plungeS1,
                    plungeS3: ist.plungeS3,
                    masterStress: ist.masterStress==='Sigma1' ? MasterStress.Sigma1 : MasterStress.Sigma3,
                    stressRatio: ist.stressRatio
                })
                searchMethod.setInteractiveSolution({rot: st.Rrot, stressRatio: st.stressRatio})
            }
            return searchMethod
        }
        return undefined
    }

    export const exists = (name: string): boolean => {
        return map_.get(name) !== undefined
    }

    export const names = (): string[] => {
        return Array.from(map_.keys())
    }

}

// SearchMethodFactory.bind(GridSearch, 'Grid Search')
SearchMethodFactory.bind(DebugSearch, 'Debug Search')
SearchMethodFactory.bind(MonteCarlo, 'Monte Carlo')