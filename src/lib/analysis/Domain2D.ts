import { Axis, Domain, hasOwn } from "./Domain"
import { ParameterSpace } from "./ParameterSpace"
 
/**
 * @example
 * ```ts
 * const ps = new FullParameterSpace()
 * 
 * const x = {
 *      bounds: [0, 0.5],
 *      name: 'R',
 *      n: 50
 * }
 * 
 * const y = {
 *      bounds: [0, 180],
 *      name: 'theta',
 *      n: 50
 * }
 * const d = new Domain2D(ps, x, y)
 * const data = d.run()
 * ```
 * @category Domain
 */
export class Domain2D implements Domain {
    private x: Axis = undefined
    private y: Axis = undefined
    private space: any = undefined
    
    constructor(space: ParameterSpace, x: Axis, y: Axis) {
        if (hasOwn(space, x.name) === false) {
            throw new Error(`Variable x ${x.name} is not part of object ${space}`)
        }

        if (hasOwn(space, y.name) === false) {
            throw new Error(`Variable y ${y.name} is not part of object ${space}`)
        }

        this.space = space
        this.x = x
        this.y = y
    }

    run(): Array<number> {
        const nx = this.x.n
        const ny = this.y.n

        const data = new Array(nx*ny).fill(0)
        let index = 0

        for (let i=0; i<nx; ++i) {
            this.space[this.x.name] = this.x.bounds.min + (this.x.bounds.max - this.x.bounds.min)/(nx-1) // setter
            for (let j=0; j<ny; ++j) {
                this.space[this.y.name] = this.y.bounds.min + (this.y.bounds.max - this.y.bounds.min)/(ny-1) // setter
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
 *      name: 'R',
 *      n: 50
 * }
 * 
 * const y = {
 *      bounds: [0, 180],
 *      name: 'theta',
 *      n: 50
 * }
 * 
 * const data = getDomain(ps, x, y)
 * ```
 * @category Domain
 */
export function getDomain2D(space: ParameterSpace, x: Axis, y: Axis) {
    const d = new Domain2D(space, x, y)
    return d.run()
}
