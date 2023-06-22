import { Matrix3x3, Vector3 } from "../types"
import { fromAnglesToNormal } from "../utils/fromAnglesToNormal"
import { DataParameters } from './DataParameters'
import { FractureStrategy } from "./types"
import { StyloliteInterface } from "./StyloliteInterface"

/**
 * 
 * A styloliye interface is represented by a plane. Its orientation in space is defined by three parameters, as follows:
 *      Strike: clockwise angle measured from the North direction [0, 360)
 *      Dip: vertical angle, measured downward, between the horizontal and the line of greatest slope in an inclined plane [0, 90]
 *      Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
 *
 * The cost method is inherited from StyloliteInterface as a compaction band is considered to be oriented perpendicularly to Sigma 1
 * @category Data
 */
  
 export class CompactionBand extends StyloliteInterface {
    protected normal: Vector3 = [0,0,0]
    protected strategy: FractureStrategy = FractureStrategy.ANGLE

    initialize(params: DataParameters[]): boolean {
        if (Number.isNaN(params[0].strike)) {
            throw new Error('Missing strike angle for Compaction Band' + params[0].noPlane)
        }

        if (Number.isNaN(params[0].dip)) {
            throw new Error('Missing dip angle for Compaction Band' + params[0].noPlane)
        }
       
        if (params[0].dip < 90 && Number.isNaN(params[0].dipDirection)) {
            throw new Error('Missing dip direction for Compaction Band' + params[0].noPlane)
        }

        // Convert into normal
        this.normal = fromAnglesToNormal({strike: params[0].strike, dip: params[0].dip, dipDirection: params[0].dipDirection})
        
        return true
    }

    check({displ, strain, stress}:{displ: Vector3, strain: Matrix3x3, stress: Matrix3x3}): boolean {
        return stress !== undefined
    }
}
