import { Data } from './Data'
import { ExtensionFracture } from './ExtensionFracture'
import { StriatedPlaneKin } from './StriatedPlane_Kin'
// import { StriatedPlaneFriction1 } from './StriatedPlane_Friction1'
// import { StriatedPlaneFriction2 } from './StriatedPlane_Friction2'
import { ConjugateCompactionalShearBands } from './ConjugateCompactionalShearBands'
import { ConjugateFaults } from './ConjugateFaults'
import { ConjugateDilatantShearBands } from './ConjugateDilatantShearBands'
import { StriatedDilatantShearBand } from './StriatedDilatantShearBand'
import { NeoformedStriatedPlane } from './NeoformedStriatedPlane'
import { StriatedCompactionalShearBand } from './StriatedCompactionalShearBand'
import { DilationBand } from './DilationBand'
import { CompactionBand } from './CompactionBand'
import { StyloliteInterface } from './StyloliteInterface'

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

// Fault planes
DataFactory.bind(StriatedPlaneKin, 'Striated Plane')
DataFactory.bind(NeoformedStriatedPlane, 'Neoformed Striated Plane')
// DataFactory.bind(StriatedPlaneFriction1, 'Striated Plane Friction1')
// DataFactory.bind(StriatedPlaneFriction2, 'Striated Plane Friction2')

// Striated shear bands
DataFactory.bind(StriatedDilatantShearBand, 'Striated Dilatant Shear Band')
DataFactory.bind(StriatedCompactionalShearBand, 'Striated Compactional Shear Band')

// Conjugate fault planes and deformation bands
DataFactory.bind(ConjugateFaults, 'Conjugate Faults 1')
DataFactory.bind(ConjugateFaults, 'Conjugate Faults 2')
DataFactory.bind(ConjugateCompactionalShearBands, 'Conjugate Compactional Shear Bands 1')
DataFactory.bind(ConjugateCompactionalShearBands, 'Conjugate Compactional Shear Bands 2')
DataFactory.bind(ConjugateDilatantShearBands, 'Conjugate Dilatant Shear Bands 1')
DataFactory.bind(ConjugateDilatantShearBands, 'Conjugate Dilatant Shear Bands 2')

// Extensional fractures and dilation bands
DataFactory.bind(DilationBand, 'Dilation Band')
DataFactory.bind(ExtensionFracture, 'Extension Fracture')

// Compresional interfaces and compaction bands
DataFactory.bind(CompactionBand, 'Compaction Band')
DataFactory.bind(StyloliteInterface, 'Stylolite Interface')



