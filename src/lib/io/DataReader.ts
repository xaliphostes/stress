import { DataArgument, DataDescription, DataFactory, DataStatus, Plane, RuptureFrictionAngles, Sigma1_nPlaneAngle, Striation } from "../data"
import { deg2rad } from "../types"
import { Direction, isDefined, isNumber } from "../utils"

/**
 * Read from data file the parameters definning the plane orientation, the striation orientation and the type of movement.
 * Special cases such as horizontal and vertical planes are considered
 */
export function readStriatedFaultPlane(arg: DataArgument, plane: Plane, striation: Striation, result: DataStatus): void {
    plane.strike = DataDescription.getParameter(arg.setIndex(2))
    plane.dip = DataDescription.getParameter(arg.setIndex(3))
    plane.dipDirection = DataDescription.getParameter(arg.setIndex(4))

    if (plane.dip === 0 && plane.dipDirection !== Direction.UND) {
        // For horizontal planes the dip direction is undefined (UND) 
        // For vertical planes with vertical striations the dip Direction has a different meaning: it points toward the uplifted block (particular case)
        result.status = false
        result.messages.push(`Data number ${arg.toks[0]}, column 4: parameter for ${DataFactory.name(arg.data)}, for a horizontal plane please set the dip direction as undefined (UND)`)
    }

    // The striation itself
    if (isNumber(arg.toks[7])) {
        // The striation trend is defined by a number
        if (isNumber(arg.toks[5]) || isDefined(arg.toks[6])) {
            // Define either the rake and strike direction or the striation trend, but not both **
            // Note that the case in which the rake is a string (and not a number) is not identified (the type and range are checked in DataDescription)
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, columns 5 to 7: parameter for ${DataFactory.name(arg.data)}, define either the rake and strike direction (cols 5 and 6) or the striation trend (col 7), but not both`)
        }

    } else if (!isNumber(arg.toks[5]) && !isDefined(arg.toks[6])) {
        // Specify either the rake and strike direction or the striation trend
        result.status = false
        result.messages.push(`Data number ${arg.toks[0]}, columns 5 to 7: parameter for ${DataFactory.name(arg.data)}, set the rake (num) and strike direction (cols 5 and 6) or the striation trend (num, col 7)`)

    } else if (isNumber(arg.toks[5]) && !isDefined(arg.toks[6])) {
        // Specify the strike direction 
        result.status = false
        result.messages.push(`Data number ${arg.toks[0]}, column 6 : parameter for ${DataFactory.name(arg.data)}, set the strike direction - note: it can be undefined (UND)`)

    } else if (!isNumber(arg.toks[5]) && isDefined(arg.toks[6])) {
        // Define the rake 
        // Note that two cases are not considered in the possibilities of the 'if - else' structure :
        //      - when the rake and strike direction are defined correctly as a number and a string,
        //      - when characters (and not numbers) are used for the rake or the strike direction **
        result.status = false
        result.messages.push(`Data number ${arg.toks[0]}, column 5 : parameter for ${DataFactory.name(arg.data)}, define the rake (num)`)
    }

    if ((plane.dip !== 0) && (plane.dip !== 90)) {
        // General situation: the striated plane is neither horizontal nor vertical

        if (isNumber(arg.toks[5]) && isDefined(arg.toks[6])) {
            // The rake and strike direction of the striation are specified;
            striation.rake = DataDescription.getParameter(arg.setIndex(5))
            striation.strikeDirection = DataDescription.getParameter(arg.setIndex(6))

            if (striation.rake !== 90) {
                if (striation.strikeDirection === Direction.UND) {
                    // The strike direction must be defined in terms of a geographic direction (i.e., the type of movement is not purely normal or inverse)
                    result.messages.push(`Data number ${arg.toks[0]}: parameter for ${DataFactory.name(arg.data)}, the strike direction (6) is not undefined (UND);  please define a geographic direction`)
                }
            }
        } else if (isNumber(arg.toks[7])) {
            // The striation trend is defined
            striation.trendIsDefined = true
            striation.trend = DataDescription.getParameter(arg.setIndex(7))

        } else {
            // Striation parameters are incorrect: e.g. characters instead of numbers for the rake or the striation trend
            // This error would be probably identified when checking ranges in the DataDescription method (?)
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, columns 5 to 7: parameter for ${DataFactory.name(arg.data)}, set the rake (num) and strike direction (cols 5 and 6) or the striation trend (num, col 7)`)
        }

    } else if (plane.dip === 0) {
        // The plane is horizontal
        // In this special situation the striation trend points toward the movement of the top block relative to the bottom block

        if (isNumber(arg.toks[7])) {
            striation.trendIsDefined = true
            striation.trend = DataDescription.getParameter(arg.setIndex(7))

        } else {
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, column 7: parameter for ${DataFactory.name(arg.data)}, for a horizontal plane, please define the striation trend to indicate relative movement of the top block (num, col 7)`)
        }

    } else if (plane.dip === 90) {
        // The plane is vertical

        if (isNumber(arg.toks[5]) && isDefined(arg.toks[6])) {
            // The rake and strike direction of the striation are specified;
            striation.rake = DataDescription.getParameter(arg.setIndex(5))
            striation.strikeDirection = DataDescription.getParameter(arg.setIndex(6))

            if (striation.rake !== 90) {

                if (plane.dipDirection !== Direction.UND) {
                    // For vertical planes with oblique (non-vertical) striations the dip direction is undefined (UND) 
                    result.status = false
                    result.messages.push(`Data number ${arg.toks[0]}, column 4: parameter for ${DataFactory.name(arg.data)}, for a vertical plane please set the dip direction as undefined (UND)`)
                }

                if (striation.strikeDirection === Direction.UND) {
                    // The strike direction must be defined in terms of a geographic direction (i.e., it cannot be undefined - UND)
                    result.messages.push(`Data number ${arg.toks[0]}: parameter for ${DataFactory.name(arg.data)}, the strike direction (6) is not undefined (UND);  please define a geographic direction`)
                }
            } else {
                // The plane and rake are vertical
                // In this special situation the dip direction has a different meaning: it indicates the direction of the uplifted block 

                if (plane.dipDirection === Direction.UND) {
                    // For vertical planes with vertical striation, the dip direction points toward the uplifted block and cannot be undefined (UND) 
                    result.status = false
                    result.messages.push(`Data number ${arg.toks[0]}, column 4: parameter for ${DataFactory.name(arg.data)}, for a vertical plane and rake, the dip direction points toward the uplifted block and cannot be undefined (col 4)`)
                }
            }
        }
    }

    const typeOfMovement = DataDescription.getParameter(arg.setIndex(8))

    if ((plane.dip === 0) || ((plane.dip === 90) && (striation.rake === 90))) {
        // The plane is horizontal or the plane and striation are vertical
        if ((typeOfMovement !== typeOfMovement.UND)) {
            // The type of movement should be undefined
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, col 8: parameter for ${DataFactory.name(arg.data)}, ${DataDescription.names[8]} - for horizontal planes and vertical planes with vertical striation please set the type of movement as undefined (UND)`)
        }
    }
}

/**
 * Read from data file the parameters definning the friction angle interval of the point associated with the fault plane in the Mohr Circle (Sigma_1, Sigma_3)/
 *      frictionAngleMin = minimum friction angle 
 *      frictionAngleMax = maximum friction angle
 * 
 */
export function readFrictionAngleInterval(arg: DataArgument, ruptureFricAngle: RuptureFrictionAngles, result: DataStatus): void {
    // Minimum and maximum default values for friction angles are defined: frictionAngleMin = 0, frictionAngleMax = PI / 2
    ruptureFricAngle.isDefined = false
    ruptureFricAngle.angleMin = 0
    ruptureFricAngle.angleMax = Math.PI / 2 // 90°

    if (isDefined(arg.toks[13]) || isDefined(arg.toks[14])) {
        // One or both friction angles are defined: Default values are updated with new values
        if (isDefined(arg.toks[13])) {
            ruptureFricAngle.angleMin = DataDescription.getParameter(arg.setIndex(13))
            ruptureFricAngle.angleMin = deg2rad(ruptureFricAngle.angleMin)
        }

        if (isDefined(arg.toks[14])) {
            ruptureFricAngle.angleMax = DataDescription.getParameter(arg.setIndex(14))
            ruptureFricAngle.angleMax = deg2rad(ruptureFricAngle.angleMax)
        } else {
            // Maximum friction angle is not defined and is set to the maximum value **
            ruptureFricAngle.angleMax = Math.PI / 2
        }

        if (ruptureFricAngle.angleMax < ruptureFricAngle.angleMin) {
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, columns 13 and 14: parameter for ${DataFactory.name(arg.data)}, ${DataDescription.names[13]} (got ${ruptureFricAngle.angleMin}) should be less than ${DataDescription.names[14]} (got ${ruptureFricAngle.angleMax})`)
        }
        ruptureFricAngle.isDefined = true
    }
}

/**
 * Read from data file the parameters definning the angular interval for <Sigma 1, nPlane> of the point associated with the fault plane in the Mohr Circle (Sigma_1, Sigma_3)/
 *      nSigma1_nPlane_AngleMin = minimum friction angle 
 *      nSigma1_nPlane_AngleMax = maximum friction angle
 * 
 */
export function readSigma1nPlaneInterval(arg: DataArgument, sigma1_nPlane: Sigma1_nPlaneAngle, result: DataStatus): void {
    // Minimum and maximum default values for <Sigma 1, nPlane> angles are defined: 
    sigma1_nPlane.isDefined = false

    if (DataFactory.name(arg.data) === 'Neoformed Striated Plane' || DataFactory.name(arg.data) === 'Striated Dilatant Shear Band') {
        sigma1_nPlane.angleMin = Math.PI / 4   // The minimum <Sigma 1, nPlane> angle is set to 45° (PI/4) **
        sigma1_nPlane.angleMax = Math.PI / 2   // The maximum <Sigma 1, nPlane> angle is set to 90° (PI/2) **
    }
    else if (DataFactory.name(arg.data) === 'Striated Compactional Shear Band') {
        sigma1_nPlane.angleMin = 0   // The minimum <Sigma 1, nPlane> angle is set to 45° (PI/4) **
        sigma1_nPlane.angleMax = Math.PI / 4   // The maximum <Sigma 1, nPlane> angle is set to 90° (PI/2) **
    }
    else {
        throw new Error(`Data number ${arg.toks[0]}, columns 15 and 16 are not defined for ${DataFactory.name(arg.data)}`)
    }

    if (isDefined(arg.toks[15]) || isDefined(arg.toks[16])) {
        // One or both <Sigma 1, nPlane> angles are defined: Default values are updated with new values
        if (isDefined(arg.toks[15])) {
            sigma1_nPlane.angleMin = DataDescription.getParameter(arg.setIndex(15))
            sigma1_nPlane.angleMin = deg2rad(sigma1_nPlane.angleMin)
        }

        if (isDefined(arg.toks[16])) {
            sigma1_nPlane.angleMax = DataDescription.getParameter(arg.setIndex(16))
            sigma1_nPlane.angleMax = deg2rad(sigma1_nPlane.angleMax)
        }

        if (sigma1_nPlane.angleMax < sigma1_nPlane.angleMin) {
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, columns 15 and 16: parameter for ${DataFactory.name(arg.data)}, ${DataDescription.names[15]} (got ${sigma1_nPlane.angleMin}) should be less than ${DataDescription.names[16]} (got ${sigma1_nPlane.angleMax})`)
        }
        sigma1_nPlane.isDefined = true
    }
}

