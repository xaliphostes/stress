import { Axis, Domain, hasOwn } from "./Domain"
import { ParameterSpace } from "./ParameterSpace"

/**
 * @example
 * ```ts
 * const ps = new FullParameterSpace()
 * 
 * const x = {
 *      bounds: [0, 0.5],
 *      name: 'R'
 * }
 * 
 * const y = {
 *      bounds: [0, 180],
 *      name: 'theta'
 * }
 * const d = new Domain2D({space: ps, xAxis: x, yAxis: y, nx: 50, ny: 50})
 * const data = d.run()
 * ```
 * @category Domain
 */
export class RegularDomain2D implements Domain {
    protected x_: Axis = undefined
    protected y_: Axis = undefined
    protected nx_ = 0
    protected ny_ = 0
    protected space: any = undefined

    constructor({ space, xAxis, n, yAxis }: { space: ParameterSpace, xAxis: Axis, yAxis: Axis, n: number }) {
        if (hasOwn(space, xAxis.name) === false) {
            throw new Error(`Variable x ${xAxis.name} is not part of object ${space}`)
        }

        if (hasOwn(space, yAxis.name) === false) {
            throw new Error(`Variable y ${yAxis.name} is not part of object ${space}`)
        }

        this.space = space
        this.x_ = xAxis
        this.y_ = yAxis
        this.nx_ = n
        this.ny_ = n
    }

    xAxis(): Axis {
        return this.x_
    }
    yAxis(): Axis {
        return this.y_
    }
    zAxis(): Axis {
        return undefined
    }

    get nx() {
        return this.nx_
    }
    get ny() {
        return this.ny_
    }

    x(): number[] {
        // return new Array(this.nx).fill(0).map((_, i) => this.x_.bounds[0] + i * (this.x_.bounds[1] - this.x_.bounds[0]) / (this.nx - 1))
        return new Array(this.nx_).fill(0).map((_, i) => i / (this.nx_ - 1))

    }

    y(): number[] | undefined {
        // return new Array(this.ny_).fill(0).map((_, i) => this.y_.bounds[0] + i * (this.y_.bounds[1] - this.y_.bounds[0]) / (this.ny_ - 1))
        return new Array(this.nx_).fill(0).map((_, i) => i / (this.nx_ - 1))
    }

    z(): number[] | undefined {
        return undefined
    }

    setSampling(n: number) {
        this.nx_ = n
        this.ny_ = n
    }

    run(): Array<number> {
        const nx = this.nx_
        const ny = this.ny_

        const data = new Array(nx * ny).fill(0)
        let index = 0

        for (let i = 0; i < nx; ++i) {
            this.space[this.x_.name] = this.x_.bounds[0] + i * (this.x_.bounds[1] - this.x_.bounds[0]) / (nx - 1) // setter
            for (let j = 0; j < ny; ++j) {
                this.space[this.y_.name] = this.y_.bounds[0] + j * (this.y_.bounds[1] - this.y_.bounds[0]) / (ny - 1) // setter
                data[index++] = this.space.cost()
            }
        }

        return data
    }
}

/**
 * @example
 * ```ts
 * const ps = new FullParameterSpace()
 * 
 * const x = {
 *      bounds: [0, 0.5],
 *      name: 'R'
 * }
 * 
 * const y = {
 *      bounds: [0, 180],
 *      name: 'theta'
 * }
 * 
 * const data = getDomain2D({space: ps, xAxis: x, yAxis: y, nx: 50, ny: 50})
 * ```
 * @category Domain
 */
export function getDomain2D({ space, xAxis, yAxis, n }: { space: ParameterSpace, xAxis: Axis, yAxis: Axis, n: number }) {
    return new RegularDomain2D({ space, xAxis, yAxis, n }).run()
}
