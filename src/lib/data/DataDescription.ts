import { directionExists, getDirectionFromString, getSensOfMovementFromString } from '../utils/Fault'
import { DataFactory } from "./Factory"
import { Data } from "./Data"

export const DataDescription = {
    names: [
        'dataType', // 0
        'strike', 'dip', 'dipDirection', // 1 2 3
        'rake', 'strikeDirection', 'striationTrend', 'typeOfMovement', // 4 5 6 7
        'lineTrend', 'linePlunge', // 8 9
        'deformationPhase', 'relatedWeight', // 10 11
        'minFrictionAngle', 'maxFrictionAngle', 'minAngleS1n', 'maxAngleS1n' // 12 13 14 15
    ],
    type: [
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
        const result = { status: true, messages: [] }
        const params = []

        for (let i = 0; i < lines.length; ++i) {
            const line = lines[i]

            const toks = line.split(';').map(s => s.replace(',', '.'))
            if (toks.length !== 16) {
                // TODO: Ben va te faire voir
                throw new Error(`Bad number of columns. Should be 16 and got ${toks.length}`)
            }

            if (this.ranges[0](toks[0]) === false) {
                throw new Error(`Data type named "${toks[0]}" is unknown at line ${lineNumber+i}`)
            }

            const param = {
                dataType: toks[0]
            }

            const desc = data.description()
            desc.mandatory.forEach(index => {
                if (this.ranges[index](toks[index]) === false) {
                    result.status = false
                    result.messages.push(`for data ${DataFactory.name(data)}, parameter ${this.names[index]} is out of range`)
                } else {
                    param[this.names[index]] = this.type[index](toks[index])
                }
            })

            params.push(param)
        }

        if (result.status === true) {
            // Initialize the data since everything went well
            console.log(params)
            data.initialize(params)
        }

        return result
    }
}
