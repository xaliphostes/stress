import { Axis, hasOwn } from "./Domain"
import { Domain2D } from "./Domain2D"
import { ParameterSpace } from "./ParameterSpace"

/**
 * @category Domain
 */
export class Domain3D extends Domain2D {
    private z_: Axis = undefined
    private nz = 0

    constructor({ space, xAxis, nx, yAxis, ny, zAxis, nz }: { space: ParameterSpace, xAxis: Axis, nx: number, yAxis: Axis, ny: number, zAxis: Axis, nz: number }) {
        super({ space, xAxis, yAxis, nx, ny })

        if (hasOwn(space, zAxis.name) === false) {
            throw new Error(`Variable z ${zAxis.name} is not part of object ${space}`)
        }
        this.z_ = zAxis
        this.nz = nz
    }

    z(): number[] | undefined {
        return new Array(this.nz).fill(0).map((_,i) => this.z_.bounds[0] + (this.z_.bounds[1] - this.z_.bounds[0]) / (this.nz - 1) )
    }

    run(): Array<number> {
        const nx = this.nx
        const ny = this.ny
        const nz = this.nz

        const data = new Array(nx * ny * nz).fill(0)
        let index = 0

        for (let i = 0; i < nx; ++i) {
            this.space[this.x.name] = this.x_.bounds[0] + (this.x_.bounds[1] - this.x_.bounds[0]) / (nx - 1) // setter
            for (let j = 0; j < ny; ++j) {
                this.space[this.y.name] = this.y_.bounds[0] + (this.y_.bounds[1] - this.y_.bounds[0]) / (ny - 1) // setter
                for (let k = 0; k < nz; ++k) {
                    this.space[this.z.name] = this.z_.bounds[0] + (this.z_.bounds[1] - this.z_.bounds[0]) / (nz - 1) // setter
                    data[index++] = this.space.cost()
                }
            }
        }

        return data
    }
}

/**
 * @category Domain
 */
export function getDomain3D({ space, xAxis, nx, yAxis, ny, zAxis, nz }: { space: ParameterSpace, xAxis: Axis, nx: number, yAxis: Axis, ny: number, zAxis: Axis, nz: number }) {
    const d = new Domain3D({ space, xAxis, yAxis, zAxis, nx, ny, nz })
    return d.run()
}
