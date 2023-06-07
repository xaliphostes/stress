import { Point3D } from "../types/math"

export class Curve3D {
    private points: Array<number> = []

    addPoint(x: number | Point3D, y?: number, z: number = 0) {
        if (typeof x === 'number') {
            this.points.push(x,y,z)
        }
        else {
            this.points.push(x[0], x[1], x[2])
        }
    }

    clear() {
        this.points = []
    }

    get buffer(): string {
        let s = `GOCAD PLine 1.0
        HEADER {
            name: curve3d
        }
        PROPERTIES rake
        `

        const nbPoints = this.points.length/3
        let index = 0
        
        for (let i=0; i<this.points.length; i+=3) {
            const attr = 0
            s += 'PVRTX ' + index+' ' + this.points[i] + ' ' + this.points[i+1] + ' ' + this.points[i+2] + ' ' + attr + '\n'
            index++
        }

        for (let i=0; i<nbPoints-1; ++i) {
            s += 'SEG '+i+' '+(i+1) +'\n'
        }
        s += 'END'

        return s
    }
}
