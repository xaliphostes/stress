import { Axis, hasOwn } from "./Domain"
import { RegularDomain2D } from "./RegularDomain2D"
import { ParameterSpace } from "./ParameterSpace"

/**
 * @category Domain
 */
export class RegularDomain3D extends RegularDomain2D {
    protected z_: Axis = undefined
    protected nz_ = 0

    constructor({ space, xAxis, yAxis, zAxis, n }: { space: ParameterSpace, xAxis: Axis, yAxis: Axis, zAxis: Axis, n: number }) {
        super({ space, xAxis, yAxis, n })

        if (hasOwn(space, zAxis.name) === false) {
            throw new Error(`Variable z ${zAxis.name} is not part of object ${space}`)
        }
        this.z_ = zAxis
        this.nz_ = n
    }

    get nz() {
        return this.nz_
    }

    xAxis(): Axis {
        return this.x_
    }
    yAxis(): Axis {
        return this.y_
    }
    zAxis(): Axis {
        return this.z_
    }

    z(): number[] | undefined {
        return new Array(this.nz).fill(0).map((_, i) => this.z_.bounds[0] + i * (this.z_.bounds[1] - this.z_.bounds[0]) / (this.nz - 1))
    }

    run(): Array<number> {
        const nx = this.nx_
        const ny = this.ny_
        const nz = this.nz_

        const data = new Array(nx * ny * nz).fill(0)
        let index = 0

        for (let i = 0; i < nx; ++i) {
            this.space[this.x_.name] = this.x_.bounds[0] + i * (this.x_.bounds[1] - this.x_.bounds[0]) / (nx - 1) // setter
            for (let j = 0; j < ny; ++j) {
                this.space[this.y_.name] = this.y_.bounds[0] + j * (this.y_.bounds[1] - this.y_.bounds[0]) / (ny - 1) // setter
                for (let k = 0; k < nz; ++k) {
                    this.space[this.z_.name] = this.z_.bounds[0] + k * (this.z_.bounds[1] - this.z_.bounds[0]) / (nz - 1) // setter
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
export function getDomain3D({ space, xAxis, yAxis, zAxis, n }: { space: ParameterSpace, xAxis: Axis, yAxis: Axis, zAxis: Axis, n: number }) {
    const d = new RegularDomain3D({ space, xAxis, yAxis, zAxis, n })
    return d.run()
}
