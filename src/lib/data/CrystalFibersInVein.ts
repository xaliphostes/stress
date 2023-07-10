import { trendPlunge2unitAxis } from "../types/math"
import { DataParameters } from "./DataParameters"
import { ExtensionFracture } from "./ExtensionFracture"
import { SphericalCoords } from "../types/SphericalCoords"
import { DataDescription, DataMessages } from "./DataDescription"
import { toFloat } from "../utils"
import { DataArguments } from "./types"


/**
 * Crystal Fibers in a Vein are defined by a set of two parameters as follows:
 *      Crystal Fibers' trend: clockwise angle measured from the North direction [0, 360)
 *      Crystal Fibers' plunge: vertical angle (positive downward) between the horizontal pointing toward the trend and a line parallel to crystal fibers.
 *              In general the plunge points downward an is measured in interval [0,90] (i.e., crystal fibers plunge in the direction of the trend).
 *              Nevertheless, a negative plunge in interval (-90,0) can also be defined. 
 *              Such case corresponds to the vertical angle measured upward between the horizontal pointing toward the trend and the crystal fibers.
 * 
 * This class inherits not from Data but rather from ExtensionFracture.
 * This means that the check() and cost() methods are already implemented (in the right way).
 * The misfit value is calculated from the angle between vector 'normal' parallel to crystal fibers and the extensional stress axis Sigma 3.
 * 'normal' is computed through the private method CrystalFibersInVeinSphericalCoords.
 * 
 * @category Data
 */
export class CrystalFibersInVein extends ExtensionFracture {
    private coordinates: SphericalCoords = new SphericalCoords()
    private crystal_fibers_plunge
    private crystal_fibers_trend

    /*
    description(): any {
        return {
            // Mandatory data: 
            // 0, 1    = Data number, data type (Crystal Fibers in a Vein)
            // ------------------------------
            // Line orientation : 
            // 9, 10 = line trend, line plunge
            mandatory: [2, 9, 10],
            // Optional data:
            // 11, 12 = Deformation phase, relative weight 
            optional: [11, 12]
        }
    }

    initialize(params: DataParameters[]): boolean {
        if (Number.isNaN(params[0].lineTrend)) {
            throw new Error('Missing trend angle for Crystal Fibers in Vein' + params[0].noPlane)
        }

        if (Number.isNaN(params[0].linePlunge)) {
            throw new Error('Missing plunge angle for Crystal Fibers in Vein' + params[0].noPlane)
        }

        this.crystal_fibers_trend  = params[0].lineTrend
        this.crystal_fibers_plunge = params[0].linePlunge
        // The unit vector 'normal' is parrallel to the crystal fibers in a vein:
        //      'normal' can be considered to be equivalent to the perpendicular vector to an extension fracture
        // The misfit is a normalized function of the angle between the 'normal' and the hypothetical stress axis Sigma 3  
        this.normal = trendPlunge2unitAxis({ trend: this.crystal_fibers_trend, plunge: this.crystal_fibers_plunge })
        return true
    }
    */

    initialize(args: DataArguments): DataMessages {
        const toks = args[0]
        const result = { status: true, messages: [] }
        
        // -----------------------------------

        this.crystal_fibers_trend = toFloat(toks[9])
        if (!DataDescription.checkRanges(this.crystal_fibers_trend)) {
            DataDescription.putMessage(toks, 9, this, result)
        }

        // -----------------------------------

        this.crystal_fibers_plunge = toFloat(toks[10])
        if (!DataDescription.checkRanges(this.crystal_fibers_plunge)) {
            DataDescription.putMessage(toks, 10, this, result)
        }

        // The unit vector 'normal' is parallel to the Crystal Fibers in a Vein:
        //      'normal' can be considered to be equivalent to the perpendicular vector to an Extension Fracture
        // The misfit is a normalized function of the angle between the 'normal' and the hypothetical stress axis Sigma 3s 
        this.nPlane = trendPlunge2unitAxis({ trend: this.crystal_fibers_trend, plunge: this.crystal_fibers_plunge })

        return result
    }
}

