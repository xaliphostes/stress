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
export class Domain2D implements Domain {
    protected x_: Axis = undefined
    protected y_: Axis = undefined
    protected nx = 0
    protected ny = 0
    protected space: any = undefined

    constructor({ space, xAxis, nx, yAxis, ny }: { space: ParameterSpace, xAxis: Axis, nx: number, yAxis: Axis, ny: number }) {
        if (hasOwn(space, xAxis.name) === false) {
            throw new Error(`Variable x ${xAxis.name} is not part of object ${space}`)
        }

        if (hasOwn(space, yAxis.name) === false) {
            throw new Error(`Variable y ${yAxis.name} is not part of object ${space}`)
        }

        this.space = space
        this.x_ = xAxis
        this.y_ = yAxis
        this.nx = nx
        this.ny = ny
    }

    x(): number[] {
        return new Array(this.nx).fill(0).map((_,i) => this.x_.bounds[0] + (this.x_.bounds[1] - this.x_.bounds[0]) / (this.nx - 1) )
    }

    y(): number[] | undefined {
        return new Array(this.ny).fill(0).map((_,i) => this.y_.bounds[0] + (this.y_.bounds[1] - this.y_.bounds[0]) / (this.ny - 1) )
    }

    z(): number[] | undefined {
        return undefined
    }

    run(): Array<number> {
        const nx = this.nx
        const ny = this.ny

        const data = new Array(nx * ny).fill(0)
        let index = 0

        for (let i = 0; i < nx; ++i) {
            this.space[this.x_.name] = this.x_.bounds[0] + (this.x_.bounds[1] - this.x_.bounds[0]) / (nx - 1) // setter
            for (let j = 0; j < ny; ++j) {
                this.space[this.y_.name] = this.y_.bounds[0] + (this.y_.bounds[1] - this.y_.bounds[0]) / (ny - 1) // setter
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
export function getDomain2D({ space, xAxis, nx, yAxis, ny }: { space: ParameterSpace, xAxis: Axis, nx: number, yAxis: Axis, ny: number }) {
    return new Domain2D({ space, xAxis, yAxis, nx, ny }).run()
}
