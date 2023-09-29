import { Data } from "../data"
import { Engine } from "../geomeca"
import { Matrix3x3, newMatrix3x3 } from "../types"
import { ParameterSpace } from "./ParameterSpace"

/**
 * @category Domain
 */
export class FullParameterSpace extends ParameterSpace {
    private psi_ = 0
    private theta_ = 0
    private phi_ = 0
    private R_ = 0

    set psi(v: number) { this.psi_ = v }
    get psi() { return this.psi_ }

    set theta(v: number) { this.theta_ = v }
    get theta() { return this.theta_ }

    set phi(v: number) { this.phi_ = v }
    get phi() { return this.phi_ }

    set R(v: number) { this.R_ = v }
    get R() { return this.R_ }

    cost(): number {
        // Build the stress tensor according to (psi, theta, phi and R)
        //
        this.engine.setHypotheticalStress(this.wrot(), this.R_)
        return this.data.reduce((previous, current) => {
            return previous + current.cost({ stress: this.engine.stress(current.position) })
        }, 0) / this.data.length
    }

    protected wrot(): Matrix3x3 {
        // TODO
        return newMatrix3x3()
    }
}
