import { StyloliteInterface } from "./StyloliteInterface"
import { SphericalCoords } from "../types/SphericalCoords"
import { DataParameters } from "./DataParameters"
import { trendPlunge2unitAxis } from "../types"

/**
 * Stylolite teeth are defined by a set of two parameters as follows:
 *      Stylolite teeth trend: clockwise angle measured from the North direction [0, 360)
 *      Stylolite teeth plunge: vertical angle (positive downward) between the horizontal pointing toward the trend and a line parallel to crystal fibers.
 *              In general the plunge points downward an is measured in interval [0,90] (i.e., crystal fibers plunge in the direction of the trend).
 *              Nevertheless, a negative plunge in interval (-90,0) can also be defined. 
 *              Such case corresponds to the vertical angle measured upward between the horizontal pointing toward the trend and the crystal fibers.
 * 
 * This class inherits not from Data but rather from StyloliteInterface.
 * This means that the check() and cost() methods are already implemented (in the right way).
 * The misfit value is calculated from the angle between vector 'normal' parallel to the stylolite teeth and the compressional stress axis Sigma 1.
 * 'normal' is computed through the private method CrystalFibersInVeinSphericalCoords.
 * 
 * @category Data
 */
export class StyloliteTeeth extends StyloliteInterface {
    private coordinates: SphericalCoords = new SphericalCoords()
    private stylolite_teeth_plunge = 0
    private stylolite_teeth_trend = 0

    initialize(params: DataParameters[]): boolean {
        if (Number.isNaN(params[0].stylolite_teeth_trend)) {
            throw new Error('Missing trend angle for Stylolite Teeth')
        }
        if (Number.isNaN(params[0].stylolite_teeth_plunge)) {
            throw new Error('Missing plunge angle for Stylolite Teeth')
        }

        this.stylolite_teeth_trend  = params[0].stylolite_teeth_trend
        this.stylolite_teeth_plunge = params[0].stylolite_teeth_plunge
        // The unit vector 'normal' is parrallel to the stylolite teeth:
        //      'normal' can be considered to be equivalent to the perpendicular vector to a stylolite interface
        // The misfit is a normalized function of the angle between the 'normal' and the hypothetical stress axis Sigma 1 
        this.normal = trendPlunge2unitAxis({ trend: this.stylolite_teeth_trend, plunge: this.stylolite_teeth_plunge })
        return true
    }
}

