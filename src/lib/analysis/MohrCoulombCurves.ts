import { GenericCurve } from "../types/GenericCurve"
import { deg2rad } from "../types/math"
import { mohrCircleLine } from "../types/mechanics"
import { MohrPoint } from "../types/MohrPoint"
import { Curve3D } from "./Curve3D"

export class MohrCoulombCurve implements GenericCurve {
    private r: number

    constructor(private lambda: [number, number, number], radius = 1) {
        this.r = radius
    }

    maxFrictionAngle(cohesion: number): number {
        const sigma_1 = - this.lambda[0]    // Principal stress in X direction
        const sigma_3 = - this.lambda[1]    // Principal stress in Y direction

        // Center and radius of Mohr circle 3 - 1
        const sigma_3_1_mean = ( sigma_1 + sigma_3 ) / 2
        const rad_3_1 = ( sigma_1 - sigma_3 ) / 2

        // The friction angle phi_a varies in the range [0, phi_3_1], 
        //      where phi_3_1 is the angle of the line tangent to Mohr circle between sigma_3 - sigma_1 that passes by c
  
        let a_3_1 = sigma_3_1_mean ** 2 + cohesion ** 2
        let b_3_1 = - 2 * rad_3_1 * sigma_3_1_mean
        let c_3_1 = rad_3_1 ** 2 - cohesion ** 2
        // Angle max is defined in degrees
        const max = Math.asin( ( - b_3_1 - Math.sqrt( b_3_1 ** 2 - 4 * a_3_1 * c_3_1) ) / ( 2 * a_3_1 ) ) * 180 / Math.PI       
        
        return max
    }

    maxCohesion(frictionAngle: number): number {
        const sigma_1 = - this.lambda[0]    // Principal stress in X direction
        const sigma_3 = - this.lambda[1]    // Principal stress in Y direction

        // Center and radius of Mohr circle 3 - 1
        const sigma_3_1_mean = ( sigma_1 + sigma_3 ) / 2
        const rad_3_1 = ( sigma_1 - sigma_3 ) / 2

        // The friction angle phi_a varies in the range [0, phi_3_1], 
        //      where phi_3_1 is the angle of the line tangent to Mohr circle between sigma_3 - sigma_1 that passes by c
  
        let frictionAngleRad = deg2rad(frictionAngle)
        const cohesion = ( rad_3_1 - sigma_3_1_mean * Math.sin( frictionAngleRad ) ) / Math.cos( frictionAngleRad )
        
        return cohesion
    }

    /**
     * Define a tangent plane by fixing angles phi and theta in spherical coordinates
     * @param frictionAngle Friction angle in degrees
     * @param cohesion In [0, 0.5]
     */
    generate(frictionAngle: number, cohesion: number): string {
        const lineBuilder = new Curve3D()

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

        if (cohesion<0 || cohesion>0.5) {
            throw new Error('Cohesion must be in [0, 0.5]')
        }

        const c = cohesion
        const phi_a = deg2rad(frictionAngle)

        // MOHR-COULOMB FRICTION

        // The frictional strength law is defined by a Mohr-Coulomb line involving friction and cohesion:
        // These two parameters must be fixed by the user in the menu within a predefined range
        // The cohesion c is defined between [0,0.5] for a normalized stress tensor (sigma_1=1, sigma_2= R, sigma_3=0)
 
        // The friction angle phi_a varies in the range [0, phi_3_1], 
        //      where phi_3_1 is the angle of the line tangent to Mohr circle between sigma_3 - sigma_1 that passes by c        
        let a_3_1 = sigma_3_1_mean ** 2 + c ** 2
        let b_3_1 = - 2 * rad_3_1 * sigma_3_1_mean
        let c_3_1 = rad_3_1 ** 2 - c ** 2
        // Angles are defined in radians
        const phi_3_1 = Math.asin( ( - b_3_1 - Math.sqrt( b_3_1 ** 2 - 4 * a_3_1 * c_3_1) ) / ( 2 * a_3_1 ) )        
        
        // We calculate two other threshold angles for lines tangent to Mohr circles between sigma_3 - sigma_2, and sigma_2 - sigma_1

        // Angle phi_3_2 for Mohr circle between sigma_2 - sigma_3 is calculated with a similar equation:
        //      phi_3_2 is calculated only for positive values
        let phi_3_2_bool: boolean = false       // Before verification, we suppose that the friction line does not intersect Mohr Circle S3-S2
        let phi_3_2 = 0

        if ( c < rad_3_2 ) {
            phi_3_2_bool = true
            // phi_3_2 > 0, thus the friction line may intersect Mohr circle between sigma_3 - sigma_2
            // phi_3_2 can be calculated from a trigonometric expression
            let a_3_2 = sigma_3_2_mean ** 2 + c ** 2
            let b_3_2 = - 2 * rad_3_2 * sigma_3_2_mean
            let c_3_2 = rad_3_2 ** 2 - c ** 2
            phi_3_2 = Math.asin( ( - b_3_2 - Math.sqrt( b_3_2 ** 2 - 4 * a_3_2 * c_3_2) ) / ( 2 * a_3_2 ) )        
        }

        // Angle phi_2_1 for Mohr circle between sigma_1 - sigma_2 is calculated from the general equation:
        //      tan(pi / 4 + phi_2_1 / 2) = ( - c + sqrt( c^2 + sigma_2 * sigma_1 ) ) / sigma_2
        //      phi_2_1 is calculated only for positive values
        let phi_2_1_bool: boolean = false       // Before verification, we suppose that the friction line does not intersect Mohr Circle S2-S1
        let phi_2_1 = 0

        if ( c < rad_2_1 ) {
            phi_2_1_bool = true
            // phi_2_1 > 0, thus the friction line may intersect Mohr circle between sigma_3 - sigma_2
            // phi_2_1 can be calculated from a trigonometric expression
            let a_2_1 = sigma_2_1_mean ** 2 + c ** 2
            let b_2_1 = - 2 * rad_2_1 * sigma_2_1_mean
            let c_2_1 = rad_2_1 ** 2 - c ** 2
            phi_2_1 = Math.asin( ( - b_2_1 - Math.sqrt( b_2_1 ** 2 - 4 * a_2_1 * c_2_1) ) / ( 2 * a_2_1 ) )       
        }
        
        // Let (c, phi_a) be the cohesion and friction angle chosen by the user. The friction coefficient mu is the slope of the line

        const mu = Math.tan( phi_a )

        const sigma_3_1: number[] = [0, 0]
        const tau_3_1  : number[] = [0, 0]
        const alfa_3_1 : number[] = [0, 0]

        const sigma_3_2: number[] = [0, 0]
        const tau_3_2  : number[] = [0, 0]
        const alfa_3_2 : number[] = [0, 0]

        const sigma_2_1: number[] = [0, 0]
        const tau_2_1  : number[] = [0, 0]
        const alfa_2_1 : number[] = [0, 0]

        const struct = {
            sigma_3_1,
            tau_3_1,
            alfa_3_1,

            sigma_3_2,
            tau_3_2,
            alfa_3_2,

            sigma_2_1,
            tau_2_1,
            alfa_2_1,
        }

        // The Mohr-Coulomb line intersects the 3D Mohr circle in 1, 2 or 3 different line segments 

        // The line always intersects circle 1 - 3 in two points named: sigma_3_1[0], tau_3_1[0] and sigma_3_1[1], tau_3_1[1]
        //      such that sigma_3_1[0] <= sigma_3_1[1]
        // sigma_3_1 values are given by the roots of a quadratic equation a x^2 + b x + c = 0, with coeffcients a, b, anc c, as follows:
        const a_qe = 1 + mu**2
        const b_qe = 2 * ( c * mu - sigma_3_1_mean )
        const c_qe = c**2 + sigma_1 * sigma_3
        
        //  Calculate the discriminant of the quadratic equation:
        let delta = Math.sqrt( b_qe**2 - 4 * a_qe * c_qe )
        //  Calculate intersection points
        sigma_3_1[0] = ( - b_qe - delta ) / ( 2 * a_qe )
        tau_3_1[0] = Math.sqrt( rad_3_1**2 - ( sigma_3_1[0] - sigma_3_1_mean )**2 )
        sigma_3_1[1] = ( - b_qe + delta ) / ( 2 * a_qe )
        tau_3_1[1] = Math.sqrt( rad_3_1**2 - ( sigma_3_1[1] - sigma_3_1_mean )**2 )

        // Calculate the angle (in radians) between segment (sigma_3,tau_3_1) in circle 3-1 and the horizontal axis (sigma_3, sigma_1) :
        // alfa_3_1 is the azimuthal angle in the reference frame (x,y,z) = (sigma_1,sigma_3, sigma_2) = (East, North, Up)
        alfa_3_1[0] = Math.atan( tau_3_1[0] / ( sigma_3_1[0] - sigma_3 ))
        alfa_3_1[1] = Math.atan( tau_3_1[1] / ( sigma_3_1[1] - sigma_3 ))

        // Define booleans indicating if the friction line intersects the smaller Mohr circles:
        let circle_2_1 = false
        let circle_3_2 = false

        if ( phi_3_2_bool ) {
            // phi_3_2 > 0, thus the friction line may intersect Mohr circle between sigma_3 - sigma_2
            if ( phi_a < phi_3_2 ) {

                circle_3_2 = true

                // The Mohr-Coulomb line intersects circle 2 - 3 in two points named: sigma_3_2[0], tau_3_2[0] and sigma_3_2[1], tau_3_2[1]
                //      such that sigma_3_2[0] <= sigma_3_2[1]
    
                // sigma_3_2 values are given by the roots of a quadratic equation a x^2 + b x + c = 0, with coeffcients a, b, anc c, as follows:
                const a_qe = 1 + mu**2
                const b_qe = 2 * ( c * mu - sigma_3_2_mean )
                const c_qe = c**2 + sigma_2 * sigma_3
            
                //  Calculate the discriminant of the quadratic equation:
                let delta = Math.sqrt( b_qe**2 - 4 * a_qe * c_qe )
                //  Calculate intersection points
                sigma_3_2[0] = ( - b_qe - delta ) / ( 2 * a_qe )
                tau_3_2[0] = Math.sqrt( rad_3_2**2 - ( sigma_3_2[0] - sigma_3_2_mean )**2 )
                sigma_3_2[1] = ( - b_qe + delta ) / ( 2 * a_qe )
                tau_3_2[1] = Math.sqrt( rad_3_2**2 - ( sigma_3_2[1] - sigma_3_2_mean )**2 )
    
                // Calculate the angle (in radians) between segment (sigma_3,tau_3_2) in circle 3-2 and the horizontal axis (sigma_3, sigma_2) :
                // alfa_3_2 is the polar angle in the reference frame (x,y,z) = (sigma_1,sigma_3, sigma_2) = (East, North, Up)
                alfa_3_2[0] = Math.atan( tau_3_2[0] / ( sigma_3_2[0] - sigma_3 ))
                alfa_3_2[1] = Math.atan( tau_3_2[1] / ( sigma_3_2[1] - sigma_3 ))
            }
        }

        if ( phi_2_1_bool ) {
            // phi_2_1 > 0, thus the friction line may intersect Mohr circle between sigma_3 - sigma_2
            if ( phi_a < phi_2_1 ) {

                circle_2_1 = true

                // The Mohr-Coulomb line intersects circle 1 - 2 in two points named: sigma_2_1[0], tau_2_1[0] and sigma_2_1[1], tau_2_1[1]
                //      such that sigma_2_1[0] <= sigma_2_1[1]
    
                // sigma_2_1 values are given by the roots of a quadratic equation a x^2 + b x + c = 0, with coeffcients a, b, anc c, as follows:
                const a_qe = 1 + mu**2
                const b_qe = 2 * ( c * mu - sigma_2_1_mean )
                const c_qe = c**2 + sigma_1 * sigma_2
            
                //  Calculate the discriminant of the quadratic equation:
                let delta = Math.sqrt( b_qe**2 - 4 * a_qe * c_qe )
                //  Calculate intersection points
                sigma_2_1[0] = ( - b_qe - delta ) / ( 2 * a_qe )
                tau_2_1[0] = Math.sqrt( rad_2_1**2 - ( sigma_2_1[0] - sigma_2_1_mean )**2 )
                sigma_2_1[1] = ( - b_qe + delta ) / ( 2 * a_qe )
                tau_2_1[1] = Math.sqrt( rad_2_1**2 - ( sigma_2_1[1] - sigma_2_1_mean )**2 )
    
                // Calculate the angle (in radians) between segment (sigma_2,tau_2_1) in circle 2-1 and the horizontal axis (sigma_2, sigma_1) :
                // alfa_2_1 is the latitude in the reference frame (x,y,z) = (sigma_1,sigma_3, sigma_2) = (East, North, Up)
                alfa_2_1[0] = Math.atan( tau_2_1[0] / ( sigma_2_1[0] - sigma_2 ))
                alfa_2_1[1] = Math.atan( tau_2_1[1] / ( sigma_2_1[1] - sigma_2 ))
            }
        }

        // We calculate the corresponding curves in the sphere:

        if ( !circle_2_1 && !circle_3_2 ) {
            // Case 1: the Mohr-Coulomb line only intersects circle 3 - 1
            // Plot curve corresponding to the line segment between points: 
            //      sigma_3_1[0], tau_3_1[0] and sigma_3_1[1], tau_3_1[1]
            return mohrCircleLine( {
                r: this.r, 
                first : this.getPoint(0, '3_1', struct), 
                second: this.getPoint(1, '3_1', struct),
                sigma_1, sigma_2, sigma_3
            } )
            // return mohrCircleLine( {r: this.r, first, second, sigma_1, sigma_2, sigma_3} )
        }   
        else if ( !circle_2_1 && circle_3_2 )  {
            // Case 2: the Mohr-Coulomb line intersects circle 3 - 1 and circle 3 - 2
            // Plot curves corresponding to the line segment between points: 
            
            //      sigma_3_1[0], tau_3_1[0] and sigma_3_2[0], tau_3_2[0];
            let buffer = mohrCircleLine( {
                r: this.r, 
                first : this.getPoint(0, '3_1', struct), 
                second: this.getPoint(0, '3_2', struct),
                sigma_1, sigma_2, sigma_3
            } )
            buffer += '\n'

            //      sigma_3_2[1], tau_3_2[1] and sigma_3_1[1], tau_3_1[1];
            buffer += mohrCircleLine( {
                r: this.r, 
                first : this.getPoint(1, '3_2', struct), 
                second: this.getPoint(1, '3_1', struct),
                sigma_1, sigma_2, sigma_3
            } )

            return buffer
        }

        else if ( circle_2_1 && !circle_3_2 ) {
            // Case 3: the Mohr-Coulomb line intersects circle 3 - 1 and circle 2 - 1
            // Plot curves corresponding to the line segment between points: 

            //      sigma_3_1[0], tau_3_1[0] and sigma_2_1[0], tau_2_1[0];
            let buffer = mohrCircleLine( {
                r: this.r, 
                first : this.getPoint(0, '3_1', struct), 
                second: this.getPoint(0, '2_1', struct),
                sigma_1, sigma_2, sigma_3
            } )
            buffer += '\n'

            //      sigma_2_1[1], tau_2_1[1] and sigma_3_1[1], tau_3_1[1];
            buffer += mohrCircleLine( {
                r: this.r, 
                first : this.getPoint(1, '2_1', struct), 
                second: this.getPoint(1, '3_1', struct),
                sigma_1, sigma_2, sigma_3
            } )

            return buffer
        }

        else {
            // Case 4: the Mohr-Coulomb line intersects circle 3 - 1, circle 3 - 2, and circle 2 - 1
            // Plot curves corresponding to the line segment between points: 

            //      sigma_3_1[0], tau_3_1[0] and sigma_3_2[0], tau_3_2[0];
            let buffer = mohrCircleLine( {
                r: this.r, 
                first : this.getPoint(0, '3_1', struct), 
                second: this.getPoint(0, '3_2', struct),
                sigma_1, sigma_2, sigma_3
            } )
            buffer += '\n'

            //      sigma_3_2[1], tau_3_2[1] and sigma_2_1[0], tau_2_1[0];
            buffer += mohrCircleLine( {
                r: this.r, 
                first : this.getPoint(1, '3_2', struct), 
                second: this.getPoint(0, '2_1', struct),
                sigma_1, sigma_2, sigma_3
            } )
            buffer += '\n'

            //      sigma_2_1[1], tau_2_1[1] and sigma_3_1[1], tau_3_1[1];
            buffer += mohrCircleLine( {
                r: this.r, 
                first : this.getPoint(1, '2_1', struct), 
                second: this.getPoint(1, '3_1', struct),
                sigma_1, sigma_2, sigma_3
            } )

            return buffer
        }
    }

    private getPoint(index: number, name: string, struct: any): MohrPoint {
        if (name === '3_1') {
            return {
                circle: name,
                p: [struct.sigma_3_1[index], struct.tau_3_1[index]],
                angle: struct.alfa_3_1[index]
            } as MohrPoint
        }
        else if (name === '3_2') {
            return {
                circle: name,
                p: [struct.sigma_3_2[index], struct.tau_3_2[index]],
                angle: struct.alfa_3_2[index]
            } as MohrPoint
        }
        else if (name === '2_1') {
            return {
                circle: name,
                p: [struct.sigma_2_1[index], struct.tau_2_1[index]],
                angle: struct.alfa_2_1[index]
            } as MohrPoint
        }
        else {
            throw new Error(`name ${name} is unknown. Should be 3_1, 3_2 or 2_1`)
        } 
        
    }
}
