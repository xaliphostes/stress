import { directionExists, getDirectionFromString, getSensOfMovementFromString } from '../utils/Fault'
import { DataFactory } from "./Factory"
import { Data } from "./Data"

export const DataDescription = {
    names: [
        'dataNumber', // 0
        'dataType', // 1
        'strike', 'dip', 'dipDirection', // 2 3 4
        'rake', 'strikeDirection', 'striationTrend', 'typeOfMovement', // 5 6 7 8
        'lineTrend', 'linePlunge', // 9 10
        'deformationPhase', 'relatedWeight', // 11 12
        'minFrictionAngle', 'maxFrictionAngle', // 13 14
        'minAngleS1n', 'maxAngleS1n' // 15 16
    ],
    type: [
        (v: string) => parseInt(v),
        (v: string) => v,
        (v: string) => parseFloat(v),
        (v: string) => parseFloat(v),
        (v: string) => v,
        (v: string) => parseFloat(v),
        (v: string) => v,
        (v: string) => parseFloat(v),
        (v: string) => v,
        (v: string) => parseFloat(v),
        (v: string) => parseFloat(v),
        (v: string) => parseInt(v),
        (v: string) => parseFloat(v),
        (v: string) => parseFloat(v),
        (v: string) => parseFloat(v),
        (v: string) => parseFloat(v),
        (v: string) => parseFloat(v),
    ],
    ranges: [
        '∈ N*',
        '',
        '[0, 360[',
        '[0, 90]',
        '[N, S, E, W, NE, SE, SW, NW, UNKNOWN]',
        '[0, 90]',
        '[N, S, E, W, NE, SE, SW, NW, UNKNOWN]',
        '[0, 360[',
        '[N, I, RL, LL, N_RL, N_LL, I_RL, I_LL, UKN]',
        '[0, 360[',
        '[0, 90]',
        '∈ N*',
        '∈ R*',
        '∈ R',
        '∈ R',
        '∈ R',
        '[0, 90]',
        '[0, 90]'
    ],
    checkRanges: [
        (v: string) => {
            // data number
            const vv = DataDescription.type[0](v) as number
            return vv > 0
        },
        (dataType: string) => DataFactory.exists(dataType),
        (v: string) => {
            // Strike
            const vv = DataDescription.type[1](v)
            return vv >= 0 && vv < 360
        },
        (v: string) => {
            // Dip
            const vv = DataDescription.type[2](v)
            return vv >= 0 && vv <= 90
        },
        (v: string) => directionExists(v),
        (v: string) => {
            const vv = DataDescription.type[4](v)
            return vv >= 0 && vv <= 90
        },
        (v: string) => getDirectionFromString(v),
        (v: string) => {
            const vv = DataDescription.type[6](v)
            return vv >= 0 && vv < 360
        },
        (v: string) => getSensOfMovementFromString(v),
        (v: string) => {
            const vv = DataDescription.type[8](v)
            return vv >= 0 && vv < 360
        },
        (v: string) => {
            const vv = DataDescription.type[9](v)
            return vv >= 0 && vv <= 90
        },
        (v: string) => {
            const vv = DataDescription.type[10](v)
            return vv > 0
        },
        (v: string) => {
            const vv = DataDescription.type[11](v)
            return vv >= 0
        },
        (v: string) => {
            const vv = DataDescription.type[12](v)
            return vv >= 0 && vv < 90
        },
        (v: string) => {
            const vv = DataDescription.type[13](v)
            return vv >= DataDescription.ranges[12] && vv < 90
        },
        (v: string) => {
            const vv = DataDescription.type[14](v)
            return vv > 0 && vv < 90
        },
        (v: string) => {
            const vv = DataDescription.type[15](v)
            return vv >= DataDescription.ranges[14] && vv < 90
        }
    ],

    check({ data, lines, lineNumber }: { data: Data, lines: string[], lineNumber: number }): { status: boolean, messages: string[] } {
        const result = {
            status: true,
            messages: []
        }

        const nbToken = 17
        const dataNumberIndex = 0
        const dataTypeIndex = 1
        const params = []

        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i]

            const toks = line.split(';').map(s => s.replace(',', '.'))
            if (toks.length !== nbToken) {
                // TODO: Ben va te faire voir
                throw new Error(`Bad number of columns. Should be 16 and got ${toks.length}`)
            }

            if (this.checkRanges[dataNumberIndex](toks[dataNumberIndex]) === false) {
                throw new Error(`Wrong index for the data. Got ${toks[dataNumberIndex]} and should be ${this.ranges[0]} (at line ${lineNumber+i})`)
            }

            const dataNumber = parseInt(toks[dataNumberIndex])

            if (this.checkRanges[dataTypeIndex](toks[dataTypeIndex]) === false) {
                throw new Error(`Data type named "${toks[dataTypeIndex]}" is unknown for data number ${dataNumber}`)
            }

            const param = {
                dataType: toks[dataTypeIndex]
            }

            /*
            TODO:
                1) take into account the optional parameters
                2) throw an error when a non mandatory or non optional data is provided
            */

            const desc = data.description()

            desc.mandatory.forEach(index => {
                if (this.checkRanges[index](toks[index]) === false) {
                    result.status = false
                    result.messages.push(`mandatory parameter for data ${DataFactory.name(data)}, parameter ${this.names[index]} is out of range or non valid. Got ${toks[index]} and should be ${this.ranges[index]}`)
                } else {
                    param[this.names[index]] = this.type[index](toks[index])
                }
            })

            desc.optional.forEach(index => {
                if (toks[index].length !== 0) {
                    if (this.checkRanges[index](toks[index]) === false) {
                        result.status = false
                        result.messages.push(`optional parameter for data ${DataFactory.name(data)}, parameter ${this.names[index]} is out of range or non valid. Got ${toks[index]} and should be ${this.ranges[index]}`)
                    } else {
                        param[this.names[index]] = this.type[index](toks[index])
                    }
                }
            })

            // desc.undefined.forEach(index => {
            //     if (toks[index].length !== 0) {
            //         result.status = false
            //         result.messages.push(`undefined parameter for data ${DataFactory.name(data)}, parameter ${this.names[index]} should not be specified. Got ${toks[index]}`)
            //     }
            // })

            params.push(param)
        }
 
        if (result.status === true) {
            // Initialize the data since everything went well
            console.log(params)
            data.initialize(params)
        }
        else {
            throw new Error(`List of error messages: " ${result.messages.reduce( (prev, cur) => prev+'\n'+cur, '')}`)
        }

        return result
    }
}
