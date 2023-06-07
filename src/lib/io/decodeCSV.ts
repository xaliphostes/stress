import { Data, DataFactory } from "../data"
import { trimAll } from "../utils"

export function decodeCSV(lines: string): Data[] {
    const datas = []
    let dataType = ''

    for (let i = 0; i < lines.length; ++i) {
        if (i===1) {
            continue
        }

        const line = trimAll(lines[i].trim())
        if (line.length === 0) {
            continue
        }

        const r = line.split(';').filter( v => v.length!==0).map( s => s.replace(',', '.'))
        if (r.length === 0) {
            continue
        }

        if (i===0) {
            dataType = r[0]
            console.log(`Data type is "${dataType}"`)
            continue
        }
        
        if (r.length===6) {
            const n = [parseFloat(r[0]), parseFloat(r[1]), parseFloat(r[2])]
            const s = [parseFloat(r[3]), parseFloat(r[4]), parseFloat(r[5])]
            const data = DataFactory.create(dataType, {nPlane: n, nStriation: s})
            datas.push(data)
        }
    }

    return datas
}
