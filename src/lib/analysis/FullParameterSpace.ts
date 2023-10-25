import { Matrix3x3, SphericalCoords, deg2rad, multiplyTensors, newMatrix3x3, properRotationTensor, spherical2unitVectorCartesian, transposeTensor } from "../types"
import { ParameterSpace } from "./ParameterSpace"

/**
 * @note All stored angles in degrees!
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
        this.engine.setHypotheticalStress(this.wrot(), this.R_)
        return this.data.reduce((previous, current) => {
            return previous + current.cost({
                stress: this.engine.stress(current.position)
            })
        }, 0) / this.data.length
    }

    protected wrot(): Matrix3x3 {
        // Build the stress tensor according to (psi, theta, phi and R)
        // (from https://mathworld.wolfram.com/EulerAngles.html)
        // (see also https://www.osti.gov/servlets/purl/1248965)

        const wrot: Matrix3x3 = newMatrix3x3()

        const cpsi = Math.cos(deg2rad(this.psi_))
        const cthe = Math.cos(deg2rad(this.theta_))
        const cphi = Math.cos(deg2rad(this.phi_))
        const spsi = Math.sin(deg2rad(this.psi_))
        const sthe = Math.sin(deg2rad(this.theta_))
        const sphi = Math.sin(deg2rad(this.phi_))

        wrot[0][0] = (cpsi * cphi - cthe * sphi * spsi)
        wrot[0][1] = cpsi * sphi - cthe * cphi * spsi
        wrot[0][2] = spsi * sthe
        wrot[1][0] = -spsi * cphi - cthe * sphi * cpsi
        wrot[1][1] = (-spsi * sphi + cthe * cphi * cpsi)
        wrot[1][2] = cpsi * sthe
        wrot[2][0] = sthe * sphi
        wrot[2][1] = -sthe * cphi
        wrot[2][2] = cthe

        return wrot
    }
}
