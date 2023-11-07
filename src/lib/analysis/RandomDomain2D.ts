import { random } from "../utils"
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
 * const d = new Domain2D({space: ps, xAxis: x, yAxis: y, n: 1000})
 * const data = d.run()
 * ```
 * @category Domain
 */
export class RandomDomain2D implements Domain {
    protected x_: Axis = undefined
    protected y_: Axis = undefined
    protected n = 0
    protected space: any = undefined
    private xs_: number[] = []
    private ys_: number[] = []

    constructor({ space, xAxis, yAxis, n }: { space: ParameterSpace, xAxis: Axis, yAxis: Axis, n: number }) {
        if (hasOwn(space, xAxis.name) === false) {
            throw new Error(`Variable x ${xAxis.name} is not part of object ${space}`)
        }

        if (hasOwn(space, yAxis.name) === false) {
            throw new Error(`Variable y ${yAxis.name} is not part of object ${space}`)
        }

        this.space = space
        this.x_ = xAxis
        this.y_ = yAxis
        this.n = n

        this.xs_ = new Array(n).fill(0)
        this.ys_ = new Array(n).fill(0)
    }

    setSampling(n: number) {
        this.n = n
        this.xs_ = new Array(n).fill(0)
        this.ys_ = new Array(n).fill(0)
    }

    x(): number[] {
        return this.xs_
    }

    y(): number[] | undefined {
        return this.ys_
    }

    z(): number[] | undefined {
        return undefined
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

    run(): Array<number> {
        const n = this.n

        const data = new Array(n).fill(0)
        let index = 0

        for (let i = 0; i < n; ++i) {
            const x = random(this.x_.bounds[0], this.x_.bounds[1])
            const y = random(this.y_.bounds[0], this.y_.bounds[1])
            this.xs_[i] = x
            this.ys_[i] = y
            this.space[this.x_.name] = x
            this.space[this.y_.name] = y
            data[index++] = this.space.cost()
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
 * const data = getDomain({space: ps, xAxis: x, yAxis: y, n: 1000})
 * ```
 * @category Domain
 */
export function getRandomDomain2D({ space, xAxis, yAxis, n }: { space: ParameterSpace, xAxis: Axis, yAxis: Axis, n: number }) {
    return new RandomDomain2D({space, xAxis, yAxis, n}).run()
}
