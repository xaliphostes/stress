import { DataArgument, DataDescription, DataFactory, DataStatus, Plane, RuptureFrictionAngles, Sigma1_nPlaneAngle, Striation } from "../data"
import { deg2rad } from "../types"
import { Direction, TypeOfMovement, isDefined, isGeographicDirection, isNumber, isTypeOfMovement } from "../utils"

/**
 * Read from data file the parameters definning the plane orientation, the striation orientation and the type of movement.
 * Special cases such as horizontal and vertical planes are considered
 */
export function readStriatedFaultPlane(arg: DataArgument, plane: Plane, striation: Striation, result: DataStatus): void {
    plane.strike = DataDescription.getParameter(arg.setIndex(2))
    plane.dip = DataDescription.getParameter(arg.setIndex(3))
    // The dip direction is read after the rake

    // ----------------------

    // Check consistency of the rake and strike direction

    // In function createStriation, we suppose by default that the striation trend is defined: striation.trendIsDefined = true

    let strikeDirIsGeographicDir = false
    let strikeDirIsUND = false
    let strikeDirIsEmptySet = false

    if (!isNumber(arg.toks[5]) && !isNumber(arg.toks[7])) {
        // The striation must be defined either by the rake or by the striation trend 
        result.status = false
        result.messages.push(`Data number ${arg.toks[0]}, striation parameters for ${arg.toks[1]}: please set either the rake (col 5) or the striation trend (col 7)`)

    } else if (isNumber(arg.toks[5]) && isNumber(arg.toks[7])) {
        // The striation must be defined either by the rake or by the striation trend 
        result.status = false
        result.messages.push(`Data number ${arg.toks[0]}, striation parameters for ${arg.toks[1]}: please set either the rake (col 5) or the striation trend (col 7), but not both`)

    } else if (isNumber(arg.toks[5])) {
        // The rake is defined 
        striation.trendIsDefined = false
        striation.rake = DataDescription.getParameter(arg.setIndex(5))

        if (striation.rake < 0 || striation.rake > 90) {
            // The rake is not in interval [0,90]: in principle, this condition this condition has already been checked in DataDescription, checkRanges
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: please set the rake (col 5) in interval [0,90]`)
        }

        if (isDefined(arg.toks[6])) {
            // The strike direction is defined 
            striation.strikeDirection = DataDescription.getParameter(arg.setIndex(6))

            if (isGeographicDirection(striation.strikeDirection) === true) {
                // The strike direction is a valid geographic direction: 'E', 'W', 'N', 'S', 'NE', 'SE', 'SW', 'NW'
                //      i.e., strike direction is an element of set (E, W, N, S, NE, SE, SW, NW)
                strikeDirIsGeographicDir = true
            }
            else if (striation.strikeDirection === Direction.UND) {
                // The strike direction is undefined (UND) 
                strikeDirIsUND = true
            }
            else {
                // The strike direction is not a valid string 
                result.status = false
                result.messages.push(`Data number ${arg.toks[0]}, striation parameters for ${arg.toks[1]}: please set the strike direction (col 6) from set (E, W, N, S, NE, SE, SW, NW, UND)`)
            }
        } else {
            // Strike direction is not defined (i.e., empty set)
            strikeDirIsEmptySet = true
        }
    } else {
        // The striation trend is defined
        striation.trendIsDefined = true
        striation.trend = DataDescription.getParameter(arg.setIndex(7))
    }

    if (plane.dip > 0 && plane.dip < 90) {
        // General situation: the striated plane is neither horizontal nor vertical

        if (isNumber(arg.toks[5])) { // The rake is defined

            if (striation.rake > 0 && striation.rake < 90) {
                // The the rake is in interval (0,90); thus, the striation is neither horizontal nor perpendicular to the strike 
                // In this general situation, the strike direction must be a geographic direction, and not undefined ('UND') or not defined (empty set)

                if (strikeDirIsEmptySet) {
                    // The strike direction cannot be the empty set
                    result.status = false
                    result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: the strike direction (col 6) is not the empty string; please set a geographic direction for the strike direction (col 6)`)

                } else if (strikeDirIsUND) {
                    // The strike direction must be defined in terms of a geographic direction (i.e., it cannot be undefined - UND)
                    result.status = false
                    result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: the strike direction (col 6) is not undefined (UND); please set a geographic direction from set (E, W, N, S, NE, SE, SW, NW)`)

                } else if (!strikeDirIsGeographicDir) {
                    // The strike direction must be defined in terms of a geographic direction (E, W, N, S, NE, SE, SW, NW, UND)
                    // In principle this else if is never reached as the geographic direction has already been checked
                    result.status = false
                    result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: please set a geographic direction for the strike direction (col 6) from set (E, W, N, S, NE, SE, SW, NW)`)
                }

            } else if (striation.rake === 0 || striation.rake === 90) {
                // If rake = 0 or rake = 90, then the strike direction can be either of three possibilities:
                // An element from the geographic direction set, the undefined element (UND), or not defined (i.e. empty set)
                // This condition for the strike direction has already been checked 
            }
        }

    }
    else if (plane.dip === 0) {
        // The plane is horizontal and the striation is defined by the striation trend and not the rake and strike direction
        if (!striation.trendIsDefined) {
            // The striation trend is not defined. Thus, the rake is defined, which is incorrect
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: for a horizontal plane, please set the striation trend (col 7) to indicate relative movement of the top block (and not the rake and strike direction, cols 5, 6)`)
        }

    }
    else if (plane.dip === 90) {
        // The plane is vertical and the striation is defined by the rake and (posibly the strike direction), and not the striation trend 

        if (striation.trendIsDefined) {
            // The rake must be defined and not the striation trend
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameters: for a vertical plane, please set the rake and strike direction (cols 5, 6) and not the striation trend (col 7)`)
        } else {
            // The rake is defined

            if (striation.rake > 0 && striation.rake < 90) {
                // The striation is not horizontal or vertical, i.e., the rake is in interval (0,90)
                // Thus, the strike direction must be a geographic direction, and not undefined ('UND') or not defined (empty set)

                if (strikeDirIsEmptySet) {
                    // The strike direction cannot be the empty set
                    result.status = false
                    result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: please set a geographic direction for the strike direction (col 6) from set (E, W, N, S, NE, SE, SW, NW)`)

                } else if (strikeDirIsUND) {
                    // The strike direction must be defined in terms of a geographic direction (i.e., it cannot be undefined - UND)
                    result.status = false
                    result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: the strike direction (col 6) is not undefined (UND); please set a geographic direction from set (E, W, N, S, NE, SE, SW, NW)`)

                } else if (!strikeDirIsGeographicDir) {
                    // The strike direction must be defined in terms of a geographic direction (E, W, N, S, NE, SE, SW, NW, UND)
                    // In principle this else if is never reached as the geographic direction has already been checked
                    result.status = false
                    result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: please set a geographic direction for the strike direction (col 6) from set (E, W, N, S, NE, SE, SW, NW)`)
                }
            } else if (striation.rake === 0 || striation.rake === 90) {
                // The striation is horizontal or vertical, i.e., the rake = 0 or 90, and the strike direction can be either of three possibilities:
                // An element from the geographic direction set, the undefined element (UND), or not defined (i.e. empty set)
                // This condition for strike direction has already been checked
            }
        }
    }
    else {
        // The plane dip is not in interval [0,90] (in principle this condition is already checked in ranges)
        result.status = false
        result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameter: please set the plane dip in interval [0,90] (col 3)`)
    }

    if (strikeDirIsEmptySet) {
        // Strike direction is not defined (i.e., empty set)
        // This value is equivalent to undefined (UND) in subsequent methods and functions (faultStriationAngle_A)
        striation.strikeDirection = Direction.UND
    }

    // ----------------------

    // Check consistency of the dip direction

    let dipDirIsGeographicDir = false
    let dipDirIsUND = false
    let dipDirIsEmptySet = false

    if (isDefined(arg.toks[4])) {
        // The dip direction is defined 
        plane.dipDirection = DataDescription.getParameter(arg.setIndex(4))

        if (isGeographicDirection(plane.dipDirection) === true) {
            // The dip direction is a valid geographic direction: 'E', 'W', 'N', 'S', 'NE', 'SE', 'SW', 'NW'
            //      i.e., strike direction is an element of set (E, W, N, S, NE, SE, SW, NW)
            dipDirIsGeographicDir = true
        }
        else if (plane.dipDirection === Direction.UND) {
            // The dip direction is undefined (UND) 
            dipDirIsUND = true
        }
        else {
            // The dip direction is not a valid string 
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameters: please define the dip direction (col 4) from set (E, W, N, S, NE, SE, SW, NW, UND)`)
        }
    } else {
        // dip direction is not defined (i.e., empty set)
        dipDirIsEmptySet = true
    }

    if (plane.dip > 0 && plane.dip < 90) {
        // General situation: the striated plane is neither horizontal nor vertical:
        // The dip direction must be defined in terms of a geographic direction (E, W, N, S, NE, SE, SW, NW)

        if (dipDirIsEmptySet) {
            // The dip direction cannot be the empty set
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameter: the dip direction (col 4) is not the empty string; please define the dip direction (col 4) from set (E, W, N, S, NE, SE, SW, NW)`)

        } else if (dipDirIsUND) {
            // The dip direction must be defined in terms of a geographic direction (i.e., it cannot be undefined - UND)
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameter: the dip direction (col 4) is not undefined (UND); please define the dip direction (col 4) from set (E, W, N, S, NE, SE, SW, NW)`)

        } else if (!dipDirIsGeographicDir) {
            // In principle this else if is never reached as the geographic direction has already been checked for the dip direction parameter
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameter: please define the dip direction (col 4) from set (E, W, N, S, NE, SE, SW, NW)`)
        }

    } else if (plane.dip === 0) {
        // The plane is horizontal
        // In this special situation, the dip direction can be either of three possibilities:
        // An element from the geographic direction set, the undefined element (UND), or not defined (i.e. empty set)
        // This condition for dip direction has already been checked

    } else if (plane.dip === 90) {
        // The plane is vertical and the rake (and not the striation trend) is defined in interval [0,90]

        if (striation.rake !== 90) {
            // The striation is not vertical, i.e., the rake is in interval [0,90)
            // In this special situation, the dip direction can be either of three possibilities:
            // An element from the geographic direction set, the undefined element (UND), or not defined (i.e. empty set)
            // This condition for dip direction has already been checked

        } else {
            // The plane and striation are vertical
            // In this special situation, THE DIP DIRECTION POINTS TOWARD THE UPLIFTED BLOCK. 
            // Thus, the dip direction is a geographic direction from set (E, W, N, S, NE, SE, SW, NW) and is not undefined (UND) or not defined (the empty set)

            if (!dipDirIsGeographicDir) {
                result.status = false
                result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameter: for a vertical plane with vertical striation, THE DIP DIRECTION POINTS TOWARD THE UPLIFTED BLOCK. Please define the dip direction (col 4) from set (E, W, N, S, NE, SE, SW, NW)`)
            }
        }
    }

    if (dipDirIsEmptySet) {
        // Dip direction is not defined (i.e., empty set)
        // This value is equivalent to undefined (UND) in subsequent methods and functions (FaultHelper)
        plane.dipDirection = Direction.UND
    }

    // ----------------------

    // Check consistency of the type of movement

    let typeOfMoveIsKinematicDir = false
    let typeOfMoveIsUND = false
    let typeOfMoveIsEmptySet = false

    if (isDefined(arg.toks[8])) {
        // The type of movement is defined 
        striation.typeOfMovement = DataDescription.getParameter(arg.setIndex(8))

        if (isTypeOfMovement(striation.typeOfMovement)) {
            // The type of movement is a valid kinematic direction: 'I', 'I_LL', 'I_RL', 'LL', 'N', 'N_LL', 'N_RL', 'RL'
            //      i.e., type of movement is an element of set (I, I_LL, I_RL, LL, N, N_LL, N_RL, RL)
            typeOfMoveIsKinematicDir = true
        }
        else if (striation.typeOfMovement === TypeOfMovement.UND) {
            // The type of movement is undefined (UND) 
            typeOfMoveIsUND = true
        }
        else {
            // The type of movement is not a valid string 
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameters: please set the type of movement (col 8) from set (I, I_LL, I_RL, LL, N, N_LL, N_RL, RL, UND)`)
        }
    } else {
        // type of movement is not defined (i.e., empty set)
        typeOfMoveIsEmptySet = true
    }

    if (plane.dip > 0 && plane.dip < 90) {
        // General situation: the striated plane is neither horizontal nor vertical
        // The type of movement must be defined in terms of a valid kinematic direction: 'I', 'I_LL', 'I_RL', 'LL', 'N', 'N_LL', 'N_RL', 'RL'

        if (typeOfMoveIsEmptySet) {
            // The type of movement cannot be the empty set
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: the type of movement (col 8) is not the empty string; please set the type of movement (col 8) from set (I, I_LL, I_RL, LL, N, N_LL, N_RL, RL, UND)`)

        } else if (typeOfMoveIsUND) {
            // The type of movement cannot be undefined (UND)
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: the type of movement (col 8) is not undefined (UND); please set the type of movement (col 8) from set (I, I_LL, I_RL, LL, N, N_LL, N_RL, RL, UND)`)

        } else if (!typeOfMoveIsKinematicDir) {
            // The type of movement is an element of set (I, I_LL, I_RL, LL, N, N_LL, N_RL, RL)
            // In principle, this condition has already been checked
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: please set a type of movement (col 8) from set (I, I_LL, I_RL, LL, N, N_LL, N_RL, RL)`)
        }

    } else if (plane.dip === 0) {
        // The plane is horizontal 
        // In this special situation, the type of movement is either undefined (UND) or not defined (the empty set)

        if (!typeOfMoveIsUND && !typeOfMoveIsEmptySet) {
            result.status = false
            result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: for a horizontal plane, please set the type of movement (col 8) as undefined (UND) or non defined (empty string)`)
        }

    } else if (plane.dip === 90) {
        // The plane is vertical

        if (striation.rake < 90) {
            // The striation is oblique and the type of movement is an element of set (I, I_LL, I_RL, LL, N, N_LL, N_RL, RL)

            if (!typeOfMoveIsKinematicDir) {
                result.status = false
                result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: please set a type of movement (col 8) from set (I, I_LL, I_RL, LL, N, N_LL, N_RL, RL)`)
            }

        } else {
            // The plane and striation are vertical
            // In this special situation, the type of movement is either undefined (UND) or not defined (the empty set)

            if (!typeOfMoveIsUND && !typeOfMoveIsEmptySet) {
                result.status = false
                result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, striation parameter: for a vertical plane with vertical striation, please set the type of movement (col 8) as undefined (UND) or non defined (empty string)`)
            }
        }
    }

    if (typeOfMoveIsEmptySet) {
        // Type of movement is not defined (i.e., empty set)
        // This value is equivalent to undefined (UND) in subsequent methods and functions (FaultHelper)
        striation.typeOfMovement = TypeOfMovement.UND
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
