import { eigen } from "@youwol/math"
import { Matrix3x3, Point3D, scalarProductUnitVectors, Vector3 } from "../types"
import { fromAnglesToNormal } from "../utils/fromAnglesToNormal"
import { Data } from "./Data"
import { FractureStrategy } from "./types"
import { DataParameters } from "./DataParameters"
import { getDirectionFromString } from "../utils"

/**
 * @brief Represent an observed and measured joint
 * @category Data
 */
export class ExtensionFracture extends Data {
    protected normal: Vector3 = [0,0,0]
    protected strategy: FractureStrategy = FractureStrategy.ANGLE
    protected position: Point3D = undefined

    description(): any {
        return {
            mandatory: [1, 2, 3],
            optional: [10, 11]
        }
    }

    initialize(params: DataParameters[]): boolean {
        if (Number.isNaN(params[0].strike)) {
            throw new Error('Missing azimuth angle for ExtensionFracture')
        }

        if (Number.isNaN(params[0].dip)) {
            throw new Error('Missing dip angle for ExtensionFracture')
        }

        if (params[0].dip < 90 && params[0].dipDirection === undefined) {
            throw new Error('Missing dip direction for ExtensionFracture')
        }

        // Convert into normal
        this.normal = fromAnglesToNormal({
            strike: params[0].strike, 
            dip: params[0].dip, 
            dipDirection: getDirectionFromString(params[0].dipDirection)
        })
        
        return true
    }
   
    check({displ, strain, stress}:{displ: Vector3, strain: Matrix3x3, stress: Matrix3x3}): boolean {
        return stress !== undefined
    }

    // This version does not consider the case in which the stress shape ratio R is close to zero (i.e., Sigma 2 = Sigma 3) 
    //      and any plane containing Sigma 1 is consistent with the stress tensor solution
    cost({displ, strain, stress}:{displ: Vector3, strain: Matrix3x3, stress: Matrix3x3}): number {
        // [xx, xy, xz, yy, yz, zz]
        const sigma = [stress[0][0], stress[0][1], stress[0][2], stress[1][1], stress[1][2], stress[2][2]]
        // eigen = function calculating the 3 normalized eigenvectors (Sigma_1, Sigma_2, Sigma_3) of the stress tensor ??
        // vectors is formated like: [S1x, S1y, S1z, S2x..., S3z]
        const {values, vectors} = eigen(sigma)
        const s = [vectors[6], vectors[7], vectors[8]] as Vector3
        // dot = scalar product between 2 unitary vectors Sigma_3 . normal = cos(angle)
        const dot = scalarProductUnitVectors({U: s, V: this.normal})

        switch(this.strategy) {
            case FractureStrategy.DOT: return 1 - Math.abs(dot)
            // Sigma 3 can be oriented in two opposite directions, thus to calculate the minimum angle we take the dot product as positive.
            default: return Math.acos(Math.abs(dot))/Math.PI
        }
    }
}
