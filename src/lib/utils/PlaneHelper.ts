import { DataDescription, Tokens, createDataArgument } from "../data"
import { Direction, isGeographicDirection } from "./FaultHelper"
import { isDefined, toInt } from "./numberUtils"

// export class PlaneHelper {

export function decodePlane(args: Tokens) {

    const arg = createDataArgument(args)

    let strike = DataDescription.getParameter(arg.setIndex(2))
    let dip = DataDescription.getParameter(arg.setIndex(3))
    let dipDirection = undefined

    // Check consistency of the dip direction

    let dipDirIsUND = false
    let dipDirIsEmptySet = false
    let dipDirIsGeographicDir = false

    // const result = {
    //     status: true,
    //     messages: []
    // }

    if (isDefined(arg.toks[4])) {
        // The dip direction is defined 
        let dipDirection = DataDescription.getParameter(arg.setIndex(4))

        if (isGeographicDirection(dipDirection)) {
            // The dip direction is a valid geographic direction: 'E', 'W', 'N', 'S', 'NE', 'SE', 'SW', 'NW'
            //      i.e., strike direction is an element of set (E, W, N, S, NE, SE, SW, NW)
            dipDirIsGeographicDir = true
        }
        else if (dipDirection === Direction.UND) {
            // The dip direction is undefined (UND) 
            dipDirIsUND = true
        }
        else {
            // The dip direction is not a valid string 
            arg.result.status = false
            arg.result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameters: please define the dip direction (col 4) from set (E, W, N, S, NE, SE, SW, NW, UND)`)
        }
    } else {
        // dip direction is not defined (i.e., empty set)
        dipDirIsEmptySet = true
    }

    if (dip > 0 && dip < 90) {
        // General case: the plane is neither horizontal nor vertical 

        if (dipDirIsEmptySet) {
            // The dip direction cannot be the empty set
            arg.result.status = false
            arg.result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameter: the dip direction (col 4) is not the empty string; please define the dip direction (col 4) from set (E, W, N, S, NE, SE, SW, NW)`)

        } else if (dipDirIsUND) {
            // The dip direction must be defined in terms of a geographic direction (i.e., it cannot be undefined - UND)
            arg.result.status = false
            arg.result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameter: the dip direction (col 4) is not undefined (UND); please define the dip direction (col 4) from set (E, W, N, S, NE, SE, SW, NW)`)

        } else if (!dipDirIsGeographicDir) {
            // In principle this else if is never reached as the geographic direction has already been checked for the dip direction parameter
            arg.result.status = false
            arg.result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameter: please define the dip direction (col 4) from set (E, W, N, S, NE, SE, SW, NW)`)
        }

    } else {
        if (dipDirection !== Direction.UND) {
            // For horizontal and vertical planes, the dip direction is either undefined (UND) or not defined (the empty set)
            if (!dipDirIsUND && !dipDirIsEmptySet) {
                arg.result.status = false
                arg.result.messages.push(`Data number ${arg.toks[0]}, ${arg.toks[1]}, plane parameter: for a horizontal plane, please set the dip direction (col 4) as undefined (UND) or non defined (empty string)`)
            }
        }
    }

    if (dipDirIsEmptySet) {
        // Dip direction is not defined (i.e., empty set)
        // This value is equivalent to undefined (UND) in subsequent methods and functions (FaultHelper)
        dipDirection = Direction.UND
    }

    /*
    const r = {
        result: {
            status,
            messages
        },
        dip,
        strike,
        dipDirection
    }
    r.result.status
    r.dip
    ...
    */
    return {
        result: arg.result,
        dip,
        strike,
        dipDirection
    }
}


