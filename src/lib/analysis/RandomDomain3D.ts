import { random } from "../utils"
import { Axis, hasOwn } from "./Domain"
import { ParameterSpace } from "./ParameterSpace"
import { RandomDomain2D } from "./RandomDomain2D"
 
/**
 * @category Domain
 */
export class RandomDomain3D extends RandomDomain2D {
    private z_: Axis = undefined
    private zs_: number[] = []
    
    constructor({ space, xAxis, yAxis, zAxis, n }: { space: ParameterSpace, xAxis: Axis, yAxis: Axis, zAxis: Axis, n: number }) {
        super({space, xAxis, yAxis, n})

        if (hasOwn(space, zAxis.name) === false) {
            throw new Error(`Variable z ${zAxis.name} is not part of object ${space}`)
        }

        this.z_ = zAxis
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
        return this.zs_
    }

    run(): Array<number> {
        const n = this.n

        const data = new Array(n).fill(0)
        let index = 0

        for (let i = 0; i < n; ++i) {
            this.space[this.x.name] = random(this.x_.bounds[0], this.x_.bounds[1])
            this.space[this.y.name] = random(this.y_.bounds[0], this.y_.bounds[1])
            this.space[this.z.name] = random(this.z_.bounds[0], this.z_.bounds[1])
            data[index++] = this.space.cost()
        }

        return data
    }
}

/**
 * @category Domain
 */
export function getRandomDomain3D({ space, xAxis, yAxis, zAxis, n }: { space: ParameterSpace, xAxis: Axis, yAxis: Axis, zAxis: Axis, n: number }) {
    return new RandomDomain3D({space, xAxis, yAxis, zAxis, n}).run()
}
