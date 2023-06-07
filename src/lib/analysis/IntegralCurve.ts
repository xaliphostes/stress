import { Curve3D } from "./Curve3D"
import { GenericCurve } from "../types/GenericCurve"

/**
 * @brief Calculate the integral curves on the sphere surface that are parallel to the shear stress (streamlines in fluid mechanics)
 * @param {r: number, exp_cos: number, exp_sin: number}
 * @example
 * ```ts
 * 
 * ```
 */

export class IntegralCurve implements GenericCurve {
    private r: number
    private exp_cos: number
    private exp_sin: number

    constructor(private lambda: [number, number, number], radius = 1) {
        this.r = radius
        this.exp_sin = ( this.lambda[0] - this.lambda[2] ) / ( this.lambda[1] - this.lambda[0] )
        this.exp_cos = ( this.lambda[2] - this.lambda[1] ) / ( this.lambda[1] - this.lambda[0] )
    }

    /**
     * Define a tangent plane by fixing angles phi and theta in spherical coordinates
     * @param theta In degrees
     * @param phi In degrees
     */
    generate(theta: number, phi: number): string {
        const lineBuilder = new Curve3D()
        let phi_1 = Math.PI * phi /180
        let theta_1 = Math.PI * theta /180

        // Determine integral curve that passes by this point of the sphere surface, by calculating k1
        // k1 is defined as a function of phi and theta for a specific symmetrical tensor
        let k1 = Math.tan(theta_1) / ( Math.sin(phi_1)**this.exp_sin * Math.cos(phi_1)**this.exp_cos )

        // Plot the integral curve that passes by this specific point
        for (let i=0; i<=180; ++i) {
            const phi = Math.PI * i/360
            const theta = Math.atan( k1 * Math.sin(phi)**this.exp_sin * Math.cos(phi)**this.exp_cos )
            const x = this.r * Math.sin(theta) * Math.cos(phi)
            const y = this.r * Math.sin(theta) * Math.sin(phi)
            const z = this.r * Math.cos(theta)
            lineBuilder.addPoint(x, y, z)
        }
        
        return lineBuilder.buffer
    }
}
