import { Matrix3x3, Vector3 } from "../types"
import { fromAnglesToNormal } from "../utils/fromAnglesToNormal"
import { FractureStrategy } from "./types"
import { DataParameters } from "./DataParameters"
import { getDirectionFromString } from "../utils"
import { ExtensionFracture } from "./ExtensionFracture"

/**
 * @brief Represent an observed and measured joint
 * 
 * A dilation band is represented by a plane. Its orientation in space is defined by three parameters, as follows:
 *      Strike: clockwise angle measured from the North direction [0, 360)
 *      Dip: vertical angle, measured downward, between the horizontal and the line of greatest slope in an inclined plane [0, 90]
 *      Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
 * 
 * The cost method is inherited from ExtensionFracture as a dilation band is considered to be oriented perpendicularly to Sigma 3
 *
 * @category Data
 */
export class DilationBand extends ExtensionFracture {
    protected normal: Vector3 = [0,0,0]
    protected strategy: FractureStrategy = FractureStrategy.ANGLE

    description(): any {
        return {
            mandatory: [2, 3, 4],
            optional: [11, 12]
        }
    }

    initialize(params: DataParameters[]): boolean {
        if (Number.isNaN(params[0].strike)) {
            throw new Error('Missing azimuth angle for dilation band')
        }

        if (Number.isNaN(params[0].dip)) {
            throw new Error('Missing dip angle for dilation band')
        }

        if (params[0].dip < 90 && params[0].dipDirection === undefined) {
            throw new Error('Missing dip direction for dilation band')
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
}
