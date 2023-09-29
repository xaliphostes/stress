import { Data } from "../data"
import { Engine } from "../geomeca"
import { Matrix3x3 } from "../types"

export abstract  class ParameterSpace {
    constructor(protected data: Data[], protected engine: Engine) {
    }

    public abstract cost(): number
    protected abstract wrot(): Matrix3x3
}
