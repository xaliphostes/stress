import { HypotheticalSolutionTensorParameters } from "../geomeca/HypotheticalSolutionTensorParameters"
import { Matrix3x3, Point3D, Vector3 } from "../types/math"
import { DataStatus } from "./DataDescription"
import { Tokens } from "./types"

/**
 * @brief A Data represents one and only one measure
 * @category Data
 */
export abstract class Data  {
    protected weight_: number = 1
    protected active_ = true
    protected pos: Point3D = [0,0,0]
    //private userSpace_ : UserSpace = UserSpace.INVERSE

    get position(): Point3D {
        return this.pos
    }

    weight(): number {
        return this.weight_
    }

    set active(a: boolean) {
        this.active = a
    }

    get active() {
        return this.active_
    }

    // description(): any {
    //     // return undefined
    //     throw new Error('Method does not exist anymore')
    // }
    
    setOptions(options: { [key: string]: any }): boolean {
        return false
    }

    nbLinkedData(): number {
        return 1
    }

    /**
     * Replace the constructor
     */
    //abstract initialize(params: DataParameters[]): boolean
    abstract initialize(args: Tokens[]): DataStatus

    /**
     * @brief Check the consistency of the datum
     * @param options The options
     * @param options.displ The computed displacment vector, if any, that has to be compared with the measure of this datum
     * @param options.stress The computed stress tensor if any
     * @param options.strain The computed strain tensor if any
     */
    abstract check({ displ, strain, stress }: { displ?: Vector3, strain?: Matrix3x3, stress?: Matrix3x3 }): boolean

    /**
     * @brief Compute the cost of this datum
     * @param options The options
     * @param options.displ The computed displacment vector, if any, that has to be compared with the measure of this datum
     * @param options.stress The computed stress tensor if any
     * @param options.strain The computed strain tensor if any
     */
    // abstract cost(
    //     { displ, strain, stress, rot }:
    //     { displ?: Vector3, strain?: Matrix3x3, stress?: Matrix3x3, rot?: Matrix3x3 }): number

    abstract cost(
        { displ, strain, stress }:
        { displ?: Vector3, strain?: HypotheticalSolutionTensorParameters, stress?: HypotheticalSolutionTensorParameters }): number

    /**
     * After stress inversion, get the infered data orientation/magnitude/etc for this specific Data
     */
    predict({ displ, strain, stress }: { displ?: Vector3, strain?: HypotheticalSolutionTensorParameters, stress?: HypotheticalSolutionTensorParameters }): any {
        return undefined
    }
}
