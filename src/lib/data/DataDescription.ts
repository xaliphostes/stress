import { Direction, TypeOfMovement, directionExists, dirs, getDirectionFromString, getTypeOfMovementFromString, mvts, sensOfMovementExists } from '../utils/FaultHelper'
import { DataFactory } from "./Factory"
import { Data } from "./Data"
import { Tokens } from './types'
import { toInt } from '../utils'

export type DataStatus = {
    status: boolean,
    messages: string[]
}
export function createDataStatus() {
    return {
        status: true,
        messages: []
    }
}

export type DataArgument = {
    toks: string[],
    index: number,
    data: Data,
    result: DataStatus,
    setIndex(i: number): DataArgument
}
export function createDataArgument(args: Tokens = undefined): DataArgument {
    const a = {
        toks: [],
        index: -1,
        data: undefined,
        result: { status: true, messages: [] },
        setIndex(i: number): DataArgument { this.index = i; return this }
    }

    if (args !== undefined) {
        a.toks = args
        a.index = toInt(args[0])
    }

    return a
}

function myParseFloat(v: string, arg: DataArgument): number {
    const w = parseFloat(v)
    if (Number.isNaN(v)) {
        arg.result.status = false
        arg.result.messages.push(`Data number ${arg.toks[0]}, column ${arg.index}: parameter for ${DataFactory.name(arg.data)}, ${DataDescription.names[arg.index]} is not a float number (got ${arg.toks[arg.index]})`)
    }
    return w
}

function myParseInt(v: string, arg: DataArgument): number {
    const w = parseInt(v)
    if (Number.isNaN(v)) {
        arg.result.status = false
        arg.result.messages.push(`Data number ${arg.toks[0]}, column ${arg.index}: parameter for ${DataFactory.name(arg.data)}, ${DataDescription.names[arg.index]} is not a integer (got ${arg.toks[arg.index]})`)
    }
    return w
}

function myParseTypeOfMovement(v: string, arg: DataArgument): TypeOfMovement {
    if (!sensOfMovementExists(v)) {
        arg.result.status = false
        arg.result.messages.push(`Data number ${arg.toks[0]}, column ${arg.index}: parameter for ${DataFactory.name(arg.data)}, ${DataDescription.names[arg.index]} is not a valid type of movement (got ${arg.toks[arg.index]}). Should be one of ${mvts}`)
    }
    return getTypeOfMovementFromString(v)
}

function myParseDirection(v: string, arg: DataArgument): Direction {
    if (!directionExists(v)) {
        arg.result.status = false
        arg.result.messages.push(`Data number ${arg.toks[0]}, column ${arg.index}: parameter for ${DataFactory.name(arg.data)}, ${DataDescription.names[arg.index]} is not a valid geographic direction (got ${arg.toks[arg.index]}). Should be one of ${dirs}`)
    }
    return getDirectionFromString(v)
}

export const DataDescription = {
    names: [
        'dataNumber',       // 0
        'dataType',         // 1
        'strike',           // 2
        'dip',              // 3
        'dipDirection',     // 4
        'rake',             // 5
        'strikeDirection',  // 6 
        'striationTrend',   // 7
        'typeOfMovement',   // 8
        'lineTrend',        // 9
        'linePlunge',       // 10
        'deformationPhase', // 11
        'relatedWeight',    // 12
        'minFrictionAngle', // 13
        'maxFrictionAngle', // 14
        'minAngleS1n',      // 15
        'maxAngleS1n',      // 16
        'beddingPlaneStrike',// 17
        'beddingPlaneDip',  // 18
        'beddingPlaneDipDirection',// 19
        'x',                // 20
        'y',                // 21
        'z',                // 22
    ],
    type: [
        (v: string, arg: DataArgument) => myParseInt(v, arg),     // 0
        (v: string, arg: DataArgument) => v,

        (v: string, arg: DataArgument) => myParseFloat(v, arg),
        (v: string, arg: DataArgument) => myParseFloat(v, arg),   // 3
        (v: string, arg: DataArgument) => myParseDirection(v, arg),

        (v: string, arg: DataArgument) => myParseFloat(v, arg),
        (v: string, arg: DataArgument) => myParseDirection(v, arg),               // 6
        (v: string, arg: DataArgument) => myParseFloat(v, arg),
        (v: string, arg: DataArgument) => myParseTypeOfMovement(v, arg),

        (v: string, arg: DataArgument) => myParseFloat(v, arg),   // 9
        (v: string, arg: DataArgument) => myParseFloat(v, arg),

        (v: string, arg: DataArgument) => myParseInt(v, arg),
        (v: string, arg: DataArgument) => myParseFloat(v, arg),   // 12

        (v: string, arg: DataArgument) => myParseFloat(v, arg),
        (v: string, arg: DataArgument) => myParseFloat(v, arg),

        (v: string, arg: DataArgument) => myParseFloat(v, arg),   // 15
        (v: string, arg: DataArgument) => myParseFloat(v, arg),

        (v: string, arg: DataArgument) => myParseFloat(v, arg),
        (v: string, arg: DataArgument) => myParseFloat(v, arg),   // 18
        (v: string, arg: DataArgument) => v,

        (v: string, arg: DataArgument) => myParseFloat(v, arg),
        (v: string, arg: DataArgument) => myParseFloat(v, arg),   // 21
        (v: string, arg: DataArgument) => myParseFloat(v, arg)
    ],
    ranges: [
        '∈ N*',                                 // 0
        '',
        '[0, 360[',                             // 2
        '[0, 90]',
        '[N, S, E, W, NE, SE, SW, NW, UND]',    // 4
        '[0, 90]',
        '[N, S, E, W, NE, SE, SW, NW, UND]',    // 6
        '[0, 360[',
        '[N, I, RL, LL, N_RL, N_LL, I_RL, I_LL, UND]',  // 8
        '[0, 360[',
        '[0, 90]',                              // 10
        '∈ N*',
        '∈ R*',                                 // 12
        '[0, 90[',
        '[0, 90[',                            // 14
        ']0, 90[',
        ']0, 90[',                              // 16
        '[0, 90]',
        '[0, 360[',                             // 18
        '[0, 90]',
        '[N, S, E, W, NE, SE, SW, NW, UND]',    // 20
        '∈ R',
        '∈ R',                                  // 22
        '∈ R'
    ],
    checkRanges: [
        // 0
        (v: string) => {
            // data number
            const vv = DataDescription.type[0](v) as number
            return vv > 0
        },
        // 1
        (dataType: string) => DataFactory.exists(dataType),
        // 2
        (v: string) => {
            // Strike
            const vv = DataDescription.type[2](v)
            return vv >= 0 && vv < 360
        },
        // 3
        (v: string) => {
            // Dip
            const vv = DataDescription.type[3](v)
            return vv >= 0 && vv <= 90
        },
        // 4
        (v: Direction) => v !== Direction.ERROR,
        // 5
        (v: string) => {
            const vv = DataDescription.type[5](v)
            return vv >= 0 && vv <= 90
        },
        // 6
        (v: string) => getDirectionFromString(v),
        // 7
        (v: string) => {
            const vv = DataDescription.type[7](v)
            return vv >= 0 && vv < 360
        },
        // 8
        (v: TypeOfMovement) => v !== TypeOfMovement.ERROR, //getTypeOfMovementFromString(v),
        // 9
        (v: string) => {
            const vv = DataDescription.type[9](v)
            return vv >= 0 && vv < 360
        },
        // 10
        (v: string) => {
            const vv = DataDescription.type[10](v)
            return vv >= 0 && vv <= 90
        },
        // 11
        (v: string) => {
            const vv = DataDescription.type[11](v)
            return vv > 0
        },
        // 12
        (v: string) => {
            const vv = DataDescription.type[12](v)
            return vv >= 0
        },
        // 13
        (v: string) => {
            const vv = DataDescription.type[13](v)
            return vv >= 0 && vv < 90
        },
        // 14
        (v: string) => {
            const vv = DataDescription.type[14](v)
            return vv >= 0 && vv < 90
        },
        // 15
        (v: string) => {
            const vv = DataDescription.type[15](v)
            return vv > 0 && vv < 90
        },
        // 16
        (v: string) => {
            const vv = DataDescription.type[16](v)
            return vv > 0 && vv < 90
        },
        // 17
        (v: string) => {
            // Strike
            const vv = DataDescription.type[17](v)
            return vv >= 0 && vv < 360
        },
        // 18
        (v: string) => {
            // Dip
            const vv = DataDescription.type[18](v)
            return vv >= 0 && vv <= 90
        },
        // 19
        (v: string) => directionExists(v), // 19
        // 20
        (v: string) => {
            const vv = DataDescription.type[20](v)
            return true
        },
        // 21
        (v: string) => {
            const vv = DataDescription.type[21](v)
            return true
        },
        // 22
        (v: string) => {
            const vv = DataDescription.type[22](v)
            return true
        },
    ],

    putMessage(arg: DataArgument) {
        arg.result.status = false
        arg.result.messages.push(`Data number ${arg.toks[0]}: mandatory parameter for data ${DataFactory.name(arg.data)}, parameter ${DataDescription.names[arg.index]} is out of range or non valid. Got ${arg.toks[arg.index]} and should be ${DataDescription.ranges[arg.index]} at index ${arg.index}`)
    },

    getParameter(arg: DataArgument): string | number {
        const value = DataDescription.type[arg.index](arg.toks[arg.index], arg.result)

        if (!DataDescription.checkRanges[arg.index](value)) {
            DataDescription.putMessage(arg.toks, arg.index, arg.data, arg.result)
        }
        return value
    }

}
