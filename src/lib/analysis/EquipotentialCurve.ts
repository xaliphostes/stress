import { GenericCurve } from "../types/GenericCurve"
import { mohrCircleLine } from "../types/mechanics"
import { MohrPoint } from "../types/MohrPoint"
import { Curve3D } from "./Curve3D"

export class EquipotentialCurve implements GenericCurve {
    private r: number
    private exp_cos: number
    private exp_sin: number

    constructor(private lambda: [number, number, number], radius = 1) {
        this.r = radius
        this.exp_sin = ( this.lambda[0] - this.lambda[2] ) / ( this.lambda[1] - this.lambda[0] )
        this.exp_cos = ( this.lambda[2] - this.lambda[1] ) / ( this.lambda[1] - this.lambda[0] )
    }

    generate(theta: number, phi: number): string {
        const lineBuilder = new Curve3D()

        theta = theta * Math.PI / 180
        phi = phi * Math.PI / 180

        // NORMAL STRESS EQUIPOTENTIALS 

        // The principal stress values are defined according to the rock mechanics sign convention (positive values for compressive stresses)
        const sigma_1 = - this.lambda[0]    // Principal stress in X direction
        const sigma_2 = - this.lambda[2]    // Principal stress in Z direction
        const sigma_3 = - this.lambda[1]    // Principal stress in Y direction

        // Center and radius of Mohr circle 3 - 1
        const sigma_3_1_mean = ( sigma_1 + sigma_3 ) / 2
        const rad_3_1 = ( sigma_1 - sigma_3 ) / 2
        // Center and radius of Mohr circle 3 - 2
        const sigma_3_2_mean = ( sigma_2 + sigma_3 ) / 2
        const rad_3_2 = ( sigma_2 - sigma_3 ) / 2
        // Center and radius of Mohr circle 2 - 1
        const sigma_2_1_mean = ( sigma_1 + sigma_2 ) / 2
        const rad_2_1 = ( sigma_1 - sigma_2 ) / 2
    
        // The integral lines derive from a scalar function defined by the normal stress component sigma_n
        // sigma_n is calculated for a specific plane tangent to the sphere whose normal vector is defined by (phi_1, theta_1)
        // sigma_n = (this.lambda[0] * cos(phi)**2 +this.lambda[1] * sin(phi)**2 ) * sin(theta)**2 + this.lambda[2] * ( 1 - sin(theta)**2 )
        let sigma_n = (this.lambda[0] * Math.cos(phi)**2 +this.lambda[1] * Math.sin(phi)**2 ) * Math.sin(theta)**2 + this.lambda[2] * Math.cos(theta)**2
        sigma_n *= -1

        // Plot equipotential corresponding to the normal force that passes through the fixed point:
        //      
        // tau_n0 = shear stress for point pO located in the Mohr circle 3-1 at normal stress sigma_n
        const tau_0 = Math.sqrt( rad_3_1**2 - (sigma_n - sigma_3_1_mean)**2 )
        // alfa_n0 = angle (in radians) between line segment (sigma_3,tau_n0) in circle 3-1 and the horizontal axis (sigma_3, sigma_1) :
        const alfa_0 = Math.atan( tau_0 / (sigma_n - sigma_3) )

        /* if ( sigma_2 == sigma_3) {
            // Particular Case 1: revolution stress tensor around sigma_1
            // Equipotential curve is a circle sweeping at an angle alfa_n0 around sigma_1
            arcCircle(r: this.r, 'sigma_1', alfa_0 )
        }
        else if ( sigma_2 == sigma_1) {
            // Particular Case 2: revolution stress tensor around sigma_3
            // Equipotential curve is a circle sweeping at an angle PI/2 - alfa_n0 around sigma_3
            arcCircle(r: this.r, 'sigma_3', Math.PI/2 - alfa_0 )
        } */
        if ( sigma_n > sigma_3 && sigma_n < sigma_2 ) {
            // Case 1: the equipotential line lies between circle 3 - 1 and circle 3 - 2:
            // tau_1 = shear stress for point p1 located in the Mohr circle 3-2 at normal stress sigma_n
             const tau_1 = Math.sqrt( rad_3_2**2 - (sigma_n - sigma_3_2_mean)**2 )
             // alfa_1 = angle (in radians) between line segment (sigma_3,tau_n0) in circle 3-2 and the horizontal axis (sigma_3, sigma_2) :
             const alfa_1 = Math.atan( tau_1 / (sigma_n - sigma_3) )

            // Plot curve corresponding to the line segment between points: (sigma_n, tau_0) and (sigma_n, tau_1)
            const first = {
                circle: '3_1',
                p: [sigma_n, tau_0],
                angle: alfa_0
            } as MohrPoint

            const second = {
                circle: '3_2',
                p: [sigma_n, tau_1],
                angle: alfa_1
            }  as MohrPoint

            return mohrCircleLine( {r: this.r, first, second, sigma_1, sigma_2, sigma_3} )
        }   
        else if ( sigma_n > sigma_2 && sigma_n < sigma_1 ) {
            // Case 2: the equipotential line lies between circle 3 - 1 and circle 2 - 1:
            // tau_1 = shear stress for point pO located in the Mohr circle 3-1 at normal stress sigma_n
             const tau_1 = Math.sqrt( rad_2_1**2 - (sigma_n - sigma_2_1_mean)**2 )
             // alfa_1 = angle (in radians) between line segment (sigma_2,tau_n0) in circle 2-1 and the horizontal axis (sigma_2, sigma_1) :
             const alfa_1 = Math.atan( tau_1 / (sigma_n - sigma_2) )

            // Plot curve corresponding to the line segment between points: (sigma_n, tau_n0) and (sigma_n, tau_1)
            const first = {
                circle: '3_1',
                p: [sigma_n, tau_0],
                angle: alfa_0
            } as MohrPoint

            const second = {
                circle: '2_1',
                p: [sigma_n, tau_1],
                angle: alfa_1
            }  as MohrPoint

            return mohrCircleLine( {r: this.r, first, second, sigma_1, sigma_2, sigma_3} )
        }   
        else if ( sigma_n == sigma_2 )  {
            // Case 3: the equipotential line lies between circle 3 - 1 and sigma_2:
            // tau_1 = shear stress for point pO
             const tau_1 = 0
             // alfa_1 = angle (in radians) between line segment (sigma_3,tau_n0) in circle 3-2 and the horizontal axis (sigma_3, sigma_2) :
             const alfa_1 = 0

            // Plot curve corresponding to the line segment between points: (sigma_n, tau_n0) and (sigma_n, tau_1)
            const first = {
                circle: '3_1',
                p: [sigma_n, tau_0],
                angle: alfa_0
            } as MohrPoint

            const second = {
                circle: '3_2',
                p: [sigma_n, tau_1],
                angle: alfa_1
            }  as MohrPoint

            return mohrCircleLine( {r: this.r, first, second, sigma_1, sigma_2, sigma_3} )
        }
        
        return ''
    }
}

