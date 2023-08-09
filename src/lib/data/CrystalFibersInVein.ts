import { trendPlunge2unitAxis } from "../types/math"
import { DataParameters } from "./DataParameters"
import { ExtensionFracture } from "./ExtensionFracture"
import { SphericalCoords } from "../types/SphericalCoords"
import { DataArgument, DataDescription, DataStatus, createDataArgument, createDataStatus } from "./DataDescription"
import { toFloat } from "../utils"
import { Tokens } from "./types"


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
    private crystal_fibers_plunge = 0
    private crystal_fibers_trend = 0

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
    */

    initialize(args: Tokens[]): DataStatus {
        const result = createDataStatus()
        const arg = createDataArgument()

        this.crystal_fibers_trend = DataDescription.getParameter(arg.setIndex(9))
        this.crystal_fibers_plunge = DataDescription.getParameter(arg.setIndex(10))

        // Hypothesis: the extensional stress Sigma 3 is parallel to the orientation of the crystal fibers (numerical models **)
        //      Let 'normal' be the unit vector that is parallel to the Crystal Fibers in a Vein
        //      Note that for stress analysis, 'normal' can be considered to be equivalent to the perpendicular vector to an Extension Fracture (which is also paralle to Sigma 3)
        // As for extension fractures, the misfit is a normalized function of the angle between unit vector 'normal' and the hypothetical stress axis Sigma 3 
        this.nPlane = trendPlunge2unitAxis({ trend: this.crystal_fibers_trend, plunge: this.crystal_fibers_plunge })

        return result
    }
}

