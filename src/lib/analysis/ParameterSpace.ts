import { Data } from "../data"
import { Engine } from "../geomeca"
import { Matrix3x3 } from "../types"

export abstract class ParameterSpace {
    protected engine: Engine = undefined
    protected data: Data[] = []

    constructor({ engine, data = [] }: { engine: Engine, data?: Data[] }) {
        this.engine = engine
        if (data) {
            this.setData(data)
        }
    }

    setData(data: Data[]) {
        this.data = []
        data.forEach(d => this.data.push(d))
    }

    public abstract cost(): number

    protected abstract wrot(): Matrix3x3
}
