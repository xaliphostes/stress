import { Data } from './Data'
import { ExtensionFracture } from './ExtensionFracture'
import { StriatedPlaneKin } from './StriatedPlane_Kin'
import { StriatedPlaneFriction1 } from './StriatedPlane_Friction1'
import { StriatedPlaneFriction2 } from './StriatedPlane_Friction2'
import { ConjugateCompactionalShearBands } from './ConjugateCompactionalShearBands'
import { ConjugateFaults } from './ConjugateFaults'
import { ConjugateDilatantShearBands } from './ConjugateDilatantShearBands'
import { StriatedDilatantShearBand } from './StriatedDilatantShearBand'

/* eslint @typescript-eslint/no-explicit-any: off -- need to have any here for the factory */
export namespace DataFactory {

    const map_: Map<string, any> = new Map()

    export const bind = (obj: any, name: string = '') => {
        name.length === 0 ? map_.set(obj.name, obj) : map_.set(name, obj)
    }

    export const create = (name: string, params: any = undefined): Data => {
        const M = map_.get(name)
        if (M) {
            return new M(params)
        }
        return undefined
    }

    export const exists = (name: string): boolean => {
        return map_.get(name) !== undefined
    }

    export const names = (): string[] => {
        return Array.from(map_.keys())
    }

    export const name = (data: Data): string => {
        return data.constructor.name
    }

}

DataFactory.bind(ExtensionFracture, 'Extension Fracture')
DataFactory.bind(StriatedPlaneKin, 'Striated Plane')
DataFactory.bind(StriatedPlaneFriction1, 'Striated Plane Friction1')
DataFactory.bind(StriatedPlaneFriction2, 'Striated Plane Friction2')
DataFactory.bind(ConjugateCompactionalShearBands, 'Conjugate Compactional Shear Bands 1')
DataFactory.bind(ConjugateCompactionalShearBands, 'Conjugate Compactional Shear Bands 2')
DataFactory.bind(ConjugateDilatantShearBands, 'Conjugate Dilatant Shear Bands 1')
DataFactory.bind(ConjugateDilatantShearBands, 'Conjugate Dilatant Shear Bands 2')
DataFactory.bind(ConjugateFaults, 'Conjugate Faults 1')
DataFactory.bind(ConjugateFaults, 'Conjugate Faults 2')
DataFactory.bind(StriatedDilatantShearBand, 'Striated Dilatant Shear Band')
