import { Axis, Domain, hasOwn } from "./Domain"
import { ParameterSpace } from "./ParameterSpace"

/**
 * @category Domain
 */
export class Domain3D implements Domain {
    private x: Axis = undefined
    private y: Axis = undefined
    private z: Axis = undefined
    private space: any = undefined
    
    constructor(space: ParameterSpace, x: Axis, y: Axis, z: Axis) {
        if (hasOwn(space, x.name) === false) {
            throw new Error(`Variable x ${x.name} is not part of object ${space}`)
        }

        if (hasOwn(space, y.name) === false) {
            throw new Error(`Variable y ${y.name} is not part of object ${space}`)
        }

        if (hasOwn(space, z.name) === false) {
            throw new Error(`Variable z ${z.name} is not part of object ${space}`)
        }

        this.space = space
        this.x = x
        this.y = y
        this.z = z
    }

    run(): Array<number> {
        const nx = this.x.n
        const ny = this.y.n
        const nz = this.z.n

        const data = new Array(nx*ny*nz).fill(0)
        let index = 0

        for (let i=0; i<nx; ++i) {
            this.space[this.x.name] = this.x.bounds.min + (this.x.bounds.max - this.x.bounds.min)/(nx-1) // setter
            for (let j=0; j<ny; ++j) {
                this.space[this.y.name] = this.y.bounds.min + (this.y.bounds.max - this.y.bounds.min)/(ny-1) // setter
                for (let k=0; k<nz; ++k) {
                    this.space[this.z.name] = this.z.bounds.min + (this.z.bounds.max - this.z.bounds.min)/(nz-1) // setter
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
export function getDomain3D(space: ParameterSpace, x: Axis, y: Axis, z: Axis) {
    const d = new Domain3D(space, x, y,z)
    return d.run()
}
