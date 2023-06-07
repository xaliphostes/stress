// Calculate the stress components of fault planes

import { crossProduct, Matrix3x3, newMatrix3x3, newVector3D, Vector3 } from "../types/math"
import { deg2rad, tensor_x_Vector, spherical2unitVectorCartesian } from "../types/math"
import { SphericalCoords } from "../types/SphericalCoords"
import { Data } from "../data/Data"

/**
 * Usage:
 * ```ts
 * const sens = SensOfMovement.LL
 * ```
 * @category Data
 */
export const enum SensOfMovement {
    N = 1,
    I,
    RL,
    LL, 
    N_RL, 
    N_LL, 
    I_RL, 
    I_LL,
    UKN
}

export function getSensOfMovementFromString(s: string): SensOfMovement {
    switch(s) {
        case 'N': return SensOfMovement.N
        case 'I': return SensOfMovement.I
        case 'RL': return SensOfMovement.RL
        case 'LL': return SensOfMovement.LL
        case 'N_RL': return SensOfMovement.N_RL
        case 'N_LL': return SensOfMovement.N_LL
        case 'I_RL': return SensOfMovement.I_RL
        case 'I_LL': return SensOfMovement.I_LL
        case 'UKN': return SensOfMovement.UKN
    }
}

/**
 * @category Data
 */
export const enum Direction {
    E = 0, // 0
    W, // 1
    N, // 2
    S, // 3
    NE, // 4
    SE, // 5
    SW, // 6
    NW, // 7
    UNKOWN,
    ERROR
}

const dirs = ['E', 'W', 'N', 'S', 'NE', 'SE', 'SW', 'NW']

export function directionExists(s: string): boolean {
    if (s.length === 0) {
        return true
    }
    return dirs.includes(s)
}

export function getDirectionFromString(s: string): Direction {
    if (s.length === 0) {
        return Direction.UNKOWN
    }

    switch(s) {
        case 'E': return Direction.E
        case 'W': return Direction.W
        case 'N': return Direction.N
        case 'S': return Direction.S
        case 'NE': return Direction.NE
        case 'SE': return Direction.SE
        case 'SW': return Direction.SW
        case 'NW': return Direction.NW
        default: return Direction.ERROR
    }
}

export function faultParams({strike, dipDirection, dip}:{strike: number, dipDirection: Direction, dip: number}) {

}

// Each fault comprises information concerning the geometry, the stress parameters and the kinematic parameters:

/**
 * A fault is represented by a plane, this with a normal and a position.
 * 
 * Usage:
 * ```ts
 * const f = new Fault({strike: 30, dipDirection: Direction.E, dip: 60})
 * f.setStriation({rake: 20, strikeDirection: Direction.N, sensMouv: 'LL'})
 * ```
 */
export class Fault {

    static create(
        {strike, dipDirection, dip, sensOfMovement, rake, strikeDirection}:
        {strike: number, dipDirection: Direction, dip: number, sensOfMovement: SensOfMovement, rake?: number, strikeDirection?: Direction})
    {
        const f = new Fault({strike, dipDirection, dip})

        if (strikeDirection !== undefined) {
            f.setStriation({sensOfMovement, rake, strikeDirection})

            return {
                nPlane: f.normal,
                nStriation: f.striation,
                nPerpStriation: f.e_perp_striation
            }
        }

        return {
            nPlane: f.normal
        }
    }
    
    get sphericalCoords() {
        return this.coordinates
    }

    get normal(): Vector3 {
        return this.normal_
    }

    /**
     * @brief Get the striation vector in reference system S
     */
    get striation(): Vector3 {
        return this.e_striation_
    }

    /**
     * @brief Get the striation vector in reference system S
     */
    get e_perp_striation(): Vector3 {
        return this.e_perp_striation_
    }

    /**
     * Set the orientation of the striation in the fault plane, which can defined in two different ways (which are exclusive):
     * 1. Rake (or pitch) [0,90], measured from the strike direction, which points in one of the two opposite directions of the fault strike.
     *   Strike direction : (N, E, S, W) or a combination of two direction (NE, SE, SW, NW).
     * 2. For shallow-dipping planes (i.e., the compass inclinometer is inaccurate):
     *   Striae trend: [0, 360)
     */
    constructor({strike, dipDirection, dip}:{strike: number, dipDirection: Direction, dip: number}) {
        this.strike = strike
        this.dipDirection = dipDirection
        this.dip = dip
        this.faultSphericalCoords()
    }

    check({displ, strain, stress}:{displ: Vector3, strain: Matrix3x3, stress: Matrix3x3}): boolean {
        return stress !== undefined
    }
    
    cost({displ, strain, stress}:{displ: Vector3, strain: Matrix3x3, stress: Matrix3x3}): number {
        return 1
    }

    /**
     * General case to set the striation.
     * 
     * Set the orientation of the striation in the fault plane, which can defined in two different ways (which are exclusive):
     * 1. Rake (or pitch) [0,90], measured from the strike direction, which points in one of the two opposite directions of the fault strike.
     *   Strike direction : (N, E, S, W) or a combination of two direction (NE, SE, SW, NW).
     * 2. For shallow-dipping planes (i.e., the compass inclinometer is inaccurate):
     *   Striae trend: [0, 360)
     */
    setStriation(
        {sensOfMovement, rake, strikeDirection}:
        {sensOfMovement: SensOfMovement, rake: number, strikeDirection: Direction}): Fault
    {
        // check and set
        this.rake = rake
        this.strikeDirection = strikeDirection
        this.sensMouv = sensOfMovement
        this.faultStriationAngle_A()
        this.faultStriationAngle_B()

        return this
    }

    /**
     * Special case for shallow angle plane.
     */
    setStriationShallowPlane(
        {sensOfMovement, striationTrend}:
        {sensOfMovement: SensOfMovement, striationTrend: Direction}): Fault
    {
        this.sensMouv = sensOfMovement
        this.striationTrend = striationTrend
        this.faultStriationAngle_A()
        this.faultStriationAngle_B()

        return this
    }

    // TODO
    setStriationForVerticalPlane() {

    }

    // ------------------------------ PRIVATE

    private faultSphericalCoords(): void {
        // Each fault is defined by a set of parameters as follows:
        //      The fault plane orientation is defined by three parameters:
        //      Fault strike: clockwise angle measured from the North direction [0, 360)
        //      Fault dip: [0, 90]
        //      Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
    
        // (phi,theta) : spherical coordinate angles defining the unit vector perpendicular to the fault plane (pointing upward)
        //                 in the geographic reference system: S = (X,Y,Z) = (E,N,Up)
    
        // phi : azimuthal angle in interval [0, 2 PI), measured anticlockwise from the X axis (East direction) in reference system S
        // theta: colatitude or polar angle in interval [0, PI/2], measured downward from the zenith (upward direction)
    
        //  Write functions relating trend and rake
    
        // The polar angle (or colatitude) theta is defined by the dip of the fault plane in radians:
        this.coordinates.theta = deg2rad( this.dip )
    
        // This function calculates the azimuth phi such that the right-handed local coordinate system in polar coordinates is located in the upper hemisphere.
        //      In other words, the radial unit vector is in the upper hemisphere.
    
        // The right-handed local reference system is specified by three unit vectors defined in the increasing radial, polar, and azimuthal directions (r, theta, and phi):
        //      The azimuthal angle phi is chosen in the direction of the fault dip (note that phi is different from the azimuth of the fault plane measured in the field) 
        //      The unit vector e_theta is parallel to the dip of the fault plane
        //      The unit vector e_phi is is parallel to the strike of the fault plane, and is oriented such that e_theta x e_phi = e_r (where x is the cross porduct )
        //      
        
        // The following 'if structure' calculates phi from the strike and dip direction of the fault plane:
        if ( this.dip=== 90 ) {
            // The fault plane is vertical and the dip direction is not defined
            if ( this.strike <= 180 ) {
                // phi is in interval [0,PI]
                this.coordinates.phi = Math.PI - deg2rad( this.strike )
            } else {
                // fault strike is in interval (PI,2 PI) and phi is in interval (PI,2 PI)
                this.coordinates.phi = 3 * Math.PI - deg2rad( this.strike )
            }
        }
        else if ( this.strike === 0 ) {    // The fault plane is not vertical and the dip direction is defined
    
            if ( this.dipDirection === Direction.E ) {
                this.coordinates.phi = 0
            } else if ( this.dipDirection === Direction.W ) {
                this.coordinates.phi = Math.PI
            } else {
                throw new Error(`dip direction is wrong. Should be E or W`)
            }
        } else if ( this.strike < 90 ){
    
            if ( ( this.dipDirection === Direction.S ) || ( this.dipDirection === Direction.E ) || ( this.dipDirection === Direction.SE ) ) {
                // this.strike + this.coordinates.phi = 2Pi
                this.coordinates.phi = 2 * Math.PI - deg2rad( this.strike ) 
    
            } else if ( ( this.dipDirection === Direction.N ) || ( this.dipDirection === Direction.W ) || ( this.dipDirection === Direction.NW ) ) {
                // this.strike + this.coordinates.phi = Pi
                this.coordinates.phi = Math.PI - deg2rad( this.strike ) 
            } else {
                throw new Error(`dip direction is wrong. Should be N, S, E, W, SE or NW`)
            }    
        } else if ( this.strike === 90 ) {
            if ( this.dipDirection === Direction.S ) {
                this.coordinates.phi = 3 * Math.PI / 2
            } else if ( this.dipDirection === Direction.N ) {
                this.coordinates.phi = Math.PI / 2
            } else {
                throw new Error(`dip direction is wrong. Should be N or S`)
            }
        } else if ( this.strike < 180 ){
    
            if ( ( this.dipDirection === Direction.S ) || ( this.dipDirection === Direction.W ) || ( this.dipDirection === Direction.SW ) ) {
                // this.strike + this.coordinates.phi = 2Pi
                this.coordinates.phi = 2 * Math.PI - deg2rad( this.strike ) 
    
            } else if ( ( this.dipDirection === Direction.N ) || ( this.dipDirection === Direction.E ) || ( this.dipDirection === Direction.NE ) ) {
                // this.strike + this.coordinates.phi = Pi
                this.coordinates.phi = Math.PI - deg2rad( this.strike ) 
            } else {
                throw new Error(`dip direction is wrong. Should be N, S, E, W, SE or NW`)
            }    
        }
        else if ( this.strike === 180 ) {
            if ( this.dipDirection === Direction.W ) {
                this.coordinates.phi = Math.PI
            } else if ( this.dipDirection === Direction.E ) {
                this.coordinates.phi = 0
            } else {
                throw new Error(`dip direction is wrong. Should be E or W`)
            }
        } else if ( this.strike < 270 ){
    
            if ( ( this.dipDirection === Direction.N ) || ( this.dipDirection === Direction.W ) || ( this.dipDirection === Direction.NW ) ) {
                // this.strike + this.coordinates.phi = 2Pi
                this.coordinates.phi = 2 * Math.PI - deg2rad( this.strike ) 
    
            } else if ( ( this.dipDirection === Direction.S ) || ( this.dipDirection === Direction.E ) || ( this.dipDirection === Direction.SE ) ) {
                // this.strike + this.coordinates.phi = 3Pi
                this.coordinates.phi = 3 * Math.PI - deg2rad( this.strike ) 
    
            } else {
                throw new Error(`dip direction is wrong. Should be N, S, E, W, NW or SE`)
            }    
        } else if ( this.strike === 270 ) {
            if ( this.dipDirection === Direction.S ) {
                this.coordinates.phi = 3 * Math.PI / 2
            } else if ( this.dipDirection === Direction.N ) {
                this.coordinates.phi = Math.PI / 2
            } else {
                throw new Error(`dip direction is wrong. Should be N or S`)
            }
        } else if ( this.strike < 360 ){
    
            if ( ( this.dipDirection === Direction.N ) || ( this.dipDirection === Direction.E ) || ( this.dipDirection === Direction.NE ) ) {
                // this.strike + this.coordinates.phi = 2Pi
                this.coordinates.phi = 2 * Math.PI - deg2rad( this.strike ) 
    
            } else if ( ( this.dipDirection === Direction.S ) || ( this.dipDirection === Direction.W ) || ( this.dipDirection === Direction.SW ) ) {
                // this.strike + this.coordinates.phi = 3Pi
                this.coordinates.phi = 3 * Math.PI - deg2rad( this.strike ) 
    
            } else {
                throw new Error(`dip direction is wrong. Should be N, S, E, W, NE or SW`)
            }
        }
        else if ( this.strike === 360 ) {
            if ( this.dipDirection === Direction.E ) {
                this.coordinates.phi = 0
            } else if ( this.dipDirection === Direction.W ) {
                this.coordinates.phi = Math.PI
            } else {
                throw new Error(`dip direction is wrong. Should be E or W`)
            }
        } else {
            throw new Error(`Strike is wrong. Should be in interval [0,360]`)
        }   

        // The fault plane is defined by angles (phi, theta) in spherical coordinates.
        // normal: unit vector normal to the fault plane (pointing upward) defined in the geographic reference system: S = (X,Y,Z)
        this.normal_ = spherical2unitVectorCartesian(this.coordinates)

        // --------------------------------------        
    }

    private faultStriationAngle_A(): void {
        // Function calculating the striation angle in the local reference frame in polar coordinates from the rake
        //      The effect of fault movement on the striation is considered in function faultStriationAngle_B
    
        // Each fault is defined by a set of parameters as follows:
        //      The fault plane orientation is defined by three parameters:
        //      Fault strike: clockwise angle measured from the North direction [0, 360)
        //      Strike direction (optional): (N, E, S, W) or a combination of two direction (NE, SE, SW, NW).
        //      Fault dip: [0, 90]
        //      Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
    
        // The orientation of the striation in the fault plane can defined in two different ways (which are exclusive):
    
        // 1-   Rake (or pitch) [0,90], measured from the strike direction, which points in one of the two opposite directions of the fault strike.
        //      Strike direction : (N, E, S, W) or a combination of two direction (NE, SE, SW, NW).
        //      Note that the specified strike direction is used to determine the spatial orientation of the striation 
    
        // 2-   For shallow-dipping planes (i.e., the compass inclinometer is inaccurate):
        //      Striae trend: [0, 360)
    
        // alphaStria : striation angle measured in the local reference plane (e_phi, e_theta) indicating the motion of the outward block
        //      alphaStria is measured clockwise from e_phi, in interval [0, 2 PI) (this choice is consistent with the definition of the rake, which is measured from the fault strike)
        this.e_phi[0] = - Math.sin( this.coordinates.phi )
        this.e_phi[1] =   Math.cos( this.coordinates.phi )
        this.e_phi[2] =   0

        this.e_theta[0] =   Math.cos(this.coordinates.theta) * Math.cos( this.coordinates.phi )
        this.e_theta[1] =   Math.cos(this.coordinates.theta) * Math.sin( this.coordinates.phi )
        this.e_theta[2] = - Math.sin( this.coordinates.theta )

        // V[0] = Math.sin(this.coordinates.theta) * Math.cos( this.coordinates.phi )
        // V[1] = Math.sin(this.coordinates.theta) * Math.sin( this.coordinates.phi )
        // V[2] = Math.cos(this.coordinates.theta)
    
        // if structure for calculating the striation angle in the local reference frame in polar coordinates from the rake:

        // The following 'if structure' calculates phi from the strike and dip direction (if defined) of the fault plane:
        if ( this.dip=== 90 ) {
            // The fault plane is vertical and the dip direction is not defined
    
            if ( this.strike === 0 ) {
                // phi = PI
                if (this.strikeDirection === Direction.N) {
                    this.alphaStriaDeg = 180 - this.rake  
                    this.alphaStria = Math.PI - deg2rad( this.rake )
                } else if (this.strikeDirection === Direction.S) {
                    this.alphaStriaDeg = this.rake           
                    this.alphaStria = deg2rad( this.rake )
                } else {
                    throw new Error(`Strike direction for measuring the rake is wrong. Should be N or S`)
                } 
            } else if ( this.strike < 90 ) {
                // phi = PI - strike
                if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.NE) ) {
                    this.alphaStriaDeg = 180 - this.rake  
                    this.alphaStria = Math.PI - deg2rad( this.rake )
                } else if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.SW) ) {
                    this.alphaStriaDeg = this.rake           
                    this.alphaStria = deg2rad( this.rake )
                } else {
                    throw new Error(`Strike direction for measuring the rake is wrong. Should be  N, S, E, W, NE or SW`)
                }    
            } else if ( this.strike === 90 ) {
                // phi = PI/2
                if (this.strikeDirection === Direction.E) {
                    this.alphaStriaDeg = 180 - this.rake  
                    this.alphaStria = Math.PI - deg2rad( this.rake )
                } else if (this.strikeDirection === Direction.W) {
                    this.alphaStriaDeg = this.rake           
                    this.alphaStria = deg2rad( this.rake )
                } else {
                    throw new Error(`Strike direction for measuring the rake is wrong. Should be E or W`)
                } 
            } else if ( this.strike < 180 ) {
                // phi = PI - strike
                if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.SE) ) {
                    this.alphaStriaDeg = 180 - this.rake  
                    this.alphaStria = Math.PI - deg2rad( this.rake )
                } else if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.NW) ) {
                    this.alphaStriaDeg = this.rake           
                    this.alphaStria = deg2rad( this.rake )
                } else {
                    throw new Error(`Strike direction for measuring the rake is wrong. Should be N, S, E, W, SE or NW `)
                }
            } else if ( this.strike === 180 ) {
                // phi = 0
                if (this.strikeDirection === Direction.S) {
                    this.alphaStriaDeg = 180 - this.rake  
                    this.alphaStria = Math.PI - deg2rad( this.rake )
                } else if (this.strikeDirection === Direction.N) {
                    this.alphaStriaDeg = this.rake           
                    this.alphaStria = deg2rad( this.rake )
                } else {
                    throw new Error(`Strike direction for measuring the rake is wrong. Should be N or S`)
                } 
            } else if ( this.strike < 270 ) { 
                // phi = 3 PI - strike
                if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.SW) ) {
                    this.alphaStriaDeg = 180 - this.rake  
                    this.alphaStria = Math.PI - deg2rad( this.rake )
                } else if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.NE) ) {
                    this.alphaStriaDeg = this.rake           
                    this.alphaStria = deg2rad( this.rake )
                } else {
                    throw new Error(`Strike direction for measuring the rake is wrong. Should be N, S, E, W, SW or NE `)
                }
            } else if ( this.strike === 270 ) {
                // phi = 3 PI / 2
                if (this.strikeDirection === Direction.W) {
                    this.alphaStriaDeg = 180 - this.rake  
                    this.alphaStria = Math.PI - deg2rad( this.rake )
                } else if (this.strikeDirection === Direction.E) {
                    this.alphaStriaDeg = this.rake           
                    this.alphaStria = deg2rad( this.rake )
                } else {
                    throw new Error(`Strike direction for measuring the rake is wrong. Should be E or W`)
                } 
            } else if ( this.strike < 360 ){
                // phi = 3 PI - strike
                if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.NW) ) {
                    this.alphaStriaDeg = 180 - this.rake  
                    this.alphaStria = Math.PI - deg2rad( this.rake )
                } else if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.SE) ) {
                    this.alphaStriaDeg = this.rake           
                    this.alphaStria = deg2rad( this.rake )
                } else {
                    throw new Error(`Strike direction for measuring the rake is wrong. Should be N, S, E, W, NW or SE `)
                }
            } else if ( this.strike === 360 ) {
                // This case should not occur since in principle strike < 360
                // phi = PI
                if (this.strikeDirection === Direction.N) {
                    this.alphaStriaDeg = 180 - this.rake  
                    this.alphaStria = Math.PI - deg2rad( this.rake )
                } else if (this.strikeDirection === Direction.S) {
                    this.alphaStriaDeg = this.rake           
                    this.alphaStria = deg2rad( this.rake )
                } else {
                    throw new Error(`Strike direction for measuring the rake is wrong. Should be N or S`)
                } 
            } else {
                // This case should not occur since in principle strike < 360
                throw new Error(`fault strike is out of the expected interval [0,360)`)
            }
        } else {      // The fault plane is not vertical and the dip direction is defined
    
            if ( this.strike === 0 ) {
                if ( this.dipDirection === Direction.E ) {    
                    if (this.strikeDirection === Direction.N) {
                        this.alphaStriaDeg = this.rake          // For testing the sense of mouvement of faults 
                        this.alphaStria = deg2rad( this.rake )
                    } else if (this.strikeDirection === Direction.S) {
                        this.alphaStriaDeg = 180 - this.rake    // For testing the sense of mouvement of faults
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N or S`)
                    }
                } else if ( this.dipDirection === Direction.W ) {
                    if (this.strikeDirection === Direction.N) {
                       this.alphaStriaDeg = 180 - this.rake  
                       this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else if (this.strikeDirection === Direction.S) {
                       this.alphaStriaDeg = this.rake           
                       this.alphaStria = deg2rad( this.rake )
                    } else {
                    throw new Error(`Strike direction for measuring the rake is wrong. Should be N or S`)
                    } 
                } else {
                    throw new Error(`dip direction is wrong. Should be E or W`)
                }
            } else if ( this.strike < 90 ){
    
                if ( ( this.dipDirection === Direction.S ) || ( this.dipDirection === Direction.E ) || ( this.dipDirection === Direction.SE ) ) {
                    if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.NE) ) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.SW) ) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N, S, E, W, NE or SW `)
                    }
                } else if ( ( this.dipDirection === Direction.N ) || ( this.dipDirection === Direction.W ) || ( this.dipDirection === Direction.NW ) ) {
                    if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.NE) ) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.SW) ) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be  N, S, E, W, NE or SW`)
                    }
                } else {
                    throw new Error(`dip direction is wrong. Should be N, S, E, W, SE or NW`)
                }    
            } else if ( this.strike === 90 ) {
    
                if ( this.dipDirection === Direction.S ) {
                    if (this.strikeDirection === Direction.E) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else if (this.strikeDirection === Direction.W) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be E or W`)
                    }
                } else if ( this.dipDirection === Direction.N ) {
                    if (this.strikeDirection === Direction.E) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else if (this.strikeDirection === Direction.W) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be E or W`)
                    } 
                } else {
                    throw new Error(`dip direction is wrong. Should be N or S`)
                }  
            } else if ( this.strike < 180 ){
    
                if ( ( this.dipDirection === Direction.S ) || ( this.dipDirection === Direction.W ) || ( this.dipDirection === Direction.SW ) ) {
                    if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.SE) ) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.NW) ) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N, S, E, W, SE or NW `)
                    }
                } else if ( ( this.dipDirection === Direction.N ) || ( this.dipDirection === Direction.E ) || ( this.dipDirection === Direction.NE ) ) {
                    if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.SE) ) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.NW) ) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N, S, E, W, SE or NW `)
                    }
                } else {
                    throw new Error(`dip direction is wrong. Should be N, S, E, W, SW or NE`)
                }    
            } else if ( this.strike === 180 ) {
    
                if ( this.dipDirection === Direction.W ) {
                    if (this.strikeDirection === Direction.S) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else if (this.strikeDirection === Direction.N) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N or S`)
                    }
                } else if ( this.dipDirection === Direction.E ) {
                    if (this.strikeDirection === Direction.S) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else if (this.strikeDirection === Direction.N) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N or S`)
                    } 
                } else {
                    throw new Error(`dip direction is wrong. Should be E or W`)
                }  
            } else if ( this.strike < 270 ){
    
                if ( ( this.dipDirection === Direction.N ) || ( this.dipDirection === Direction.W ) || ( this.dipDirection === Direction.NW ) ) {
                    if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.SW) ) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.NE) ) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N, S, E, W, SW or NE `)
                    }
                } else if ( ( this.dipDirection === Direction.S ) || ( this.dipDirection === Direction.E ) || ( this.dipDirection === Direction.SE ) ) {
                    if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.SW) ) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.NE) ) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N, S, E, W, SW or NE `)
                    }
                } else {
                    throw new Error(`dip direction is wrong. Should be N, S, E, W, SE or NW`)
                }    
            } else if ( this.strike === 270 ) {
    
                if ( this.dipDirection === Direction.N ) {
                    if (this.strikeDirection === Direction.W) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else if (this.strikeDirection === Direction.E) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be E or W`)
                    }
                } else if ( this.dipDirection === Direction.S ) {
                    if (this.strikeDirection === Direction.W) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else if (this.strikeDirection === Direction.E) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be E or W`)
                    } 
                } else {
                    throw new Error(`dip direction is wrong. Should be N or S`)
                }  
            } else if ( this.strike < 360 ){
    
                if ( ( this.dipDirection === Direction.N ) || ( this.dipDirection === Direction.E ) || ( this.dipDirection === Direction.NE ) ) {
                    if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.NW) ) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.SE) ) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N, S, E, W, NW or SE `)
                    }
                } else if ( ( this.dipDirection === Direction.S ) || ( this.dipDirection === Direction.W ) || ( this.dipDirection === Direction.SW ) ) {
                    if ( (this.strikeDirection === Direction.N) || (this.strikeDirection === Direction.W) || (this.strikeDirection === Direction.NW) ) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else if ( (this.strikeDirection === Direction.S) || (this.strikeDirection === Direction.E) || (this.strikeDirection === Direction.SE) ) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N, S, E, W, NW or SE `)
                    }
                } else {
                    throw new Error(`dip direction is wrong. Should be N, S, E, W, NE or SW`)
                }  
            } else if ( this.strike === 360 ) {
                    // This case should not occur since in principle strike < 360
                if ( this.dipDirection === Direction.E ) {
                    if (this.strikeDirection === Direction.N) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else if (this.strikeDirection === Direction.S) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N or S`)
                    }
                } else if ( this.dipDirection === Direction.W ) {
                    if (this.strikeDirection === Direction.N) {
                        this.alphaStriaDeg = 180 - this.rake  
                        this.alphaStria = Math.PI - deg2rad( this.rake )
                    } else if (this.strikeDirection === Direction.S) {
                        this.alphaStriaDeg = this.rake           
                        this.alphaStria = deg2rad( this.rake )
                    } else {
                        throw new Error(`Strike direction for measuring the rake is wrong. Should be N or S`)
                    } 
                } else {
                    throw new Error(`dip direction is wrong. Should be E or W`)
                }
            } else {
                throw new Error(`fault strike is out of the expected interval [0,360)`)
    
            }
        }
    }

    private faultStriationAngle_B(): void {
        // Function introducuing the effect of fault movement on the striation angle
        // This function is called after function faultStriationAngle_A
        // We calculate a unit vector e_striation pointing toward the measured striation
    
        // Sense of mouvement: For verification purposes, it is recommended to indicate both the dip-slip and strike-slip compoenents, when possible. 
        //      Dip-slip component:
        //          N = Normal fault, 
        //          I = Inverse fault or thrust
        //      Strike-slip componenet:
        //          RL = Right-Lateral fault
        //          LL = Left-Lateral fault
    
        // Sense of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL
    
        // this.alphaStriaDeg is in interval [0,180] according to function faultStriationAngle_A; 
        // This angle indicates the mouvement of the top (outward) block relative to the bottom (inner) block 
    
        // 'if structure' that modifies when required the striation angle according to the sense of mouvement of faults:
    
        if ( this.dip=== 90 ) {
            // The fault plane is vertical and only the strike-slip component of motion is defined
            // alphaStriaDeg calculated in function faultStriationAngle_B is in interval [0,PI]
    
            if ( ( this.alphaStriaDeg >= 0 ) && ( this.alphaStriaDeg < 90 ) ) {   
                // alphaStriaDeg has a left-lateral strike-slip component 
                if ( this.sensMouv === SensOfMovement.RL) {
                    // Fault movement is oriented opposite to the present value of the striation angle
                    this.alphaStriaDeg += 180
                    this.alphaStria += Math.PI           
                } else if ( this.sensMouv != SensOfMovement.LL) {
                    throw new Error(`sense of mouvement is not consistent with fault data. Should be RL or LL`)
                }
            } else if ( this.alphaStriaDeg === 90 ) {   // Pure dip-slip mouvement
                // note that if alphaStriaDeg = 90 then the fault only has a dip-slip component and the direction of the uplifted block is requested 
                this.faultStriationUpliftedBlock()
    
            } else if (this.alphaStriaDeg <= 180) {   
                // 90 < alphaStriaDeg <= 180 means that the fault is normal-right-lateral
                if ( this.sensMouv === SensOfMovement.LL) {
                    // Fault movement is oriented opposite to the present value of the striation angle
                    this.alphaStriaDeg += 180
                    this.alphaStria += Math.PI           
                } else if ( this.sensMouv != SensOfMovement.RL) {
                    throw new Error(`sense of mouvement is not consistent with fault data. Should be RL or LL`)
                }
            } else {  
                throw new Error(`calculated striation alphaStriaDeg should be in interval [0,180]. Check routine faultStriationAngle_A`)
                }
    
        } else {      // The fault plane is not vertical and both strike-slip and dip-slip components of motion are defined
    
            if ( this.alphaStriaDeg === 0 ) {   // Pure strike-slip mouvement
                // alphaStriaDeg = 0 means that the fault is left-lateral
                if ( this.sensMouv === SensOfMovement.RL) {
                    // Fault movement is oriented opposite to the present value of the striation angle
                    this.alphaStriaDeg = 180        // Striation values are recalculated
                    this.alphaStria = Math.PI           
                } else if ( this.sensMouv != SensOfMovement.LL) {
                    throw new Error(`sense of mouvement is not consistent with fault data. Should be RL or LL`)
                }
            } else if (this.alphaStriaDeg < 90) {   // Strike-slip and dip slip mouvement
                // 0 < alphaStriaDeg < 90 means that the fault is normal-left-lateral
                if ( (this.sensMouv === SensOfMovement.RL) || (this.sensMouv === SensOfMovement.I) || (this.sensMouv === SensOfMovement.I_RL) ) {
                    this.alphaStriaDeg += 180
                    this.alphaStria += Math.PI    
                } else if ( (this.sensMouv !== SensOfMovement.LL) && (this.sensMouv !== SensOfMovement.N) && (this.sensMouv !== SensOfMovement.N_LL) ) {
                    throw new Error(`sense of mouvement is not consistent with fault data. Should be LL or N or N-LL or RL or I or I-RL`)
                }       
            } else if ( this.alphaStriaDeg === 90 ) {   // Pure dip-slip mouvement
                // alphaStriaDeg = 90 means that the fault is normal
                if ( this.sensMouv === SensOfMovement.I) {
                    // Fault movement is oriented opposite to the present value of the striation angle
                    this.alphaStriaDeg = 270        // Striation values are recalculated
                    this.alphaStria = 3 * Math.PI / 2           
                } else if ( this.sensMouv != SensOfMovement.N) {
                    throw new Error(`sense of mouvement is not consistent with fault data. Should be N or I`)
                }
            } else if (this.alphaStriaDeg < 180) {   // Strike-slip and dip slip mouvement
                // 90 < alphaStriaDeg < 180 means that the fault is normal-right-lateral
                if ( (this.sensMouv === SensOfMovement.LL) || (this.sensMouv === SensOfMovement.I) || (this.sensMouv === SensOfMovement.I_LL) ) {
                    this.alphaStriaDeg += 180
                    this.alphaStria += Math.PI           
                } else if ( (this.sensMouv != SensOfMovement.RL) && (this.sensMouv != SensOfMovement.N) && (this.sensMouv === SensOfMovement.N_RL) ) {
                    throw new Error(`sense of mouvement is not consistent with fault data. Should be LL or I or I-LL or RL or N or N-RL`)
                }       
            } else if ( this.alphaStriaDeg === 180 ) {   // Pure strike-slip mouvement
                // alphaStriaDeg = 180 means that the fault is right-lateral
                if ( this.sensMouv === SensOfMovement.LL) {
                    // Fault movement is oriented opposite to the present value of the striation angle
                    this.alphaStriaDeg = 0        // Striation values are recalculated
                    this.alphaStria = 0          
                } else if ( this.sensMouv != SensOfMovement.RL) {
                    throw new Error(`sense of mouvement is not consistent with fault data. Should be RL or LL`)
                }
            } else {  
                throw new Error(`calculated striation alphaStriaDeg should be in interval [0,180]. Check routine faultStriationAngle_A`)
                }
        }
        
        // Calculate in reference system S the unit vector e_striation pointing toward the measured striation BB
        this.e_striation_[0] = Math.cos( this.alphaStria ) * this.e_phi[0] + Math.sin( this.alphaStria ) * this.e_theta[0]
        this.e_striation_[1] = Math.cos( this.alphaStria ) * this.e_phi[1] + Math.sin( this.alphaStria ) * this.e_theta[1]
        this.e_striation_[2] = Math.cos( this.alphaStria ) * this.e_phi[2] + Math.sin( this.alphaStria ) * this.e_theta[2]

        // Calculate in reference system S the unit vector e_perp_striation_ located on the fault plane and perpendiculat to the striation.
        // This vector is necessary for calculating the misfit angle for criterai involving friction.
        // The local coord system (e_striation_, e_perp_striation_, normal) is right handed
        this.e_perp_striation_ = crossProduct({U: this.normal, V:this.e_striation_})
    }

    private faultStriationUpliftedBlock(): void {
        // The fault plane is vertical and the rake is 90°: this.dip = 90, this.rake = 90, this.alphaStriaDeg = 90
    
        //Thus, the striation is defined by an additional parameter: 
        
        // To calculate the orientation of the striation the user must indicate for example the direction of the uplifted block:
        //      upLiftedBlock: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW)
    
        if ( this.strike === 0 ) {
    
            if ( this.upliftedBlock === Direction.W ) { 
                this.alphaStriaDeg = 270
                this.alphaStria = 3 * Math.PI / 2                     
            } else if (this.upliftedBlock !== Direction.E) {
                throw new Error(`The orientation of the uplifted block is wrong. Should be E or W`)
            }
            
        } else if ( this.strike < 90 ){
    
            if ( ( this.upliftedBlock === Direction.N ) || ( this.upliftedBlock === Direction.W ) || ( this.upliftedBlock === Direction.NW ) ) {
                this.alphaStriaDeg = 270
                this.alphaStria = 3 * Math.PI / 2        
            } else if ( ( this.upliftedBlock !== Direction.S ) && ( this.upliftedBlock !== Direction.E ) && ( this.upliftedBlock !== Direction.SE ) ) {
                throw new Error(`The orientation of the uplifted block is wrong. Should be N, S, E, W, SE or NW`)
            }    
    
        } else if ( this.strike === 90 ) {
    
            if ( this.upliftedBlock === Direction.N ) { 
                this.alphaStriaDeg = 270
                this.alphaStria = 3 * Math.PI / 2                     
            } else if (this.upliftedBlock !== Direction.S) {
                throw new Error(`The orientation of the uplifted block is wrong. Should be N or S`)
            }
    
        } else if ( this.strike < 180 ){
    
            if ( ( this.upliftedBlock === Direction.N ) || ( this.upliftedBlock === Direction.E ) || ( this.upliftedBlock === Direction.NE ) ) {
                this.alphaStriaDeg = 270
                this.alphaStria = 3 * Math.PI / 2        
            } else if ( ( this.upliftedBlock !== Direction.S ) && ( this.upliftedBlock !== Direction.W ) && ( this.upliftedBlock !== Direction.SW ) ) {
                throw new Error(`The orientation of the uplifted block is wrong. Should be N, S, E, W, NE or SW`)
            }     
            
        } else if ( this.strike === 180 ) {
    
            if ( this.upliftedBlock === Direction.E ) { 
                this.alphaStriaDeg = 270
                this.alphaStria = 3 * Math.PI / 2                     
            } else if (this.upliftedBlock !== Direction.W) {
                throw new Error(`The orientation of the uplifted block is wrong. Should be E or W`)
            }
    
        } else if ( this.strike < 270 ){
    
            if ( ( this.upliftedBlock === Direction.S ) || ( this.upliftedBlock === Direction.E ) || ( this.upliftedBlock === Direction.SE ) ) {
                this.alphaStriaDeg = 270
                this.alphaStria = 3 * Math.PI / 2        
            } else if ( ( this.upliftedBlock !== Direction.N ) && ( this.upliftedBlock !== Direction.W ) && ( this.upliftedBlock !== Direction.NW ) ) {
                throw new Error(`The orientation of the uplifted block is wrong. Should be N, S, E, W, SE or NW`)
            }     
    
        } else if ( this.strike === 270 ) {
    
            if ( this.upliftedBlock === Direction.S ) { 
                this.alphaStriaDeg = 270
                this.alphaStria = 3 * Math.PI / 2                     
            } else if (this.upliftedBlock !== Direction.N) {
                throw new Error(`The orientation of the uplifted block is wrong. Should be N or S`)
            }
         
        } else if ( this.strike < 360 ){
    
            if ( ( this.upliftedBlock === Direction.S ) || ( this.upliftedBlock === Direction.W ) || ( this.upliftedBlock === Direction.SW ) ) {
                this.alphaStriaDeg = 270
                this.alphaStria = 3 * Math.PI / 2        
            } else if ( ( this.upliftedBlock !== Direction.N ) && ( this.upliftedBlock !== Direction.E ) && ( this.upliftedBlock !== Direction.NE ) ) {
                throw new Error(`The orientation of the uplifted block is wrong. Should be N, S, E, W, NE or SW`)
            }     
                    
        } else if ( this.strike === 360 ) {
          
            if ( this.upliftedBlock === Direction.W ) { 
                this.alphaStriaDeg = 270
                this.alphaStria = 3 * Math.PI / 2                     
            } else if (this.upliftedBlock !== Direction.E) {
                throw new Error(`The orientation of the uplifted block is wrong. Should be E or W`)
            }
            
        } else {
            throw new Error(`fault strike is out of the expected interval [0,360)`)
        }
    }

    private createUpLiftedBlock() {
        const f = new Fault({strike: 0, dipDirection: Direction.E, dip: 90}) // TODO: params in ctor
        f.setStriation({strikeDirection: Direction.N, rake: 90, sensOfMovement: SensOfMovement.UKN})
        /**
        * There is one particular case in which the sens of mouvement has to be defined with a different parameter:
        * A vertical plane with rake = 90.
        * In such situation the user must indicate for example the direction of the uplifted block:
        *      upLiftedBlock: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
        */

        return f
    }

    private faultSphericalCoordsSP() {
        // Calculate the spherical coordinates of the unit vector normal to the plane in reference system S'

        // normalSp: unit vector normal to the fault plane (pointing upward) defined in the stress tensor reference system: S' = (X',Y',Z')=(sigma 1,sigma 3,sigma 2)
        //          values should be recalculated for new stress tensors    
        
        // Let Rrot be the rotation tensor R between reference systems S and S', such that:
        //      V' = R V,  where V and V' are the same vector defined in reference frames S and S', respectively

        this.normalSp = tensor_x_Vector({T: this.RTrot, V: this.normal})

        if (this.normalSp[0] > 0) {
            if (this.normalSp[1] >= 0) {
                // phiSp is in interval [0, Pi/2)
                this.coordinatesSp.phi = Math.atan( this.normalSp[1] / this.normalSp[0] )
            } else {
                // phiSp is in interval (3Pi/2, 2Pi)
                // atan is probably defined in interval (-Pi/2, Pi/2)
                this.coordinatesSp.phi = 2 * Math.PI + Math.atan( this.normalSp[1] / this.normalSp[0] )
            }
        } else if ( this.normalSp[0] < 0 ) {
            if (this.normalSp[1] >= 0) {
                // phiSp is in interval (Pi/2, Pi]
                this.coordinatesSp.phi = Math.atan( this.normalSp[1] / this.normalSp[0] ) + Math.PI
            } else {
                // phiSp is defined in interval [Pi, 3Pi/2)
                this.coordinatesSp.phi = Math.atan( this.normalSp[1] / this.normalSp[0] ) + Math.PI
            }
        } else {
            if (this.normalSp[1] > 0) {
                // phiSp = Pi/2
                this.coordinatesSp.phi = Math.PI / 2
            } else {
                // phiSp = 3Pi/2
                this.coordinatesSp.phi = 3 * Math.PI / 2
            }
        }

    } 

    private faultNormalVectorSp(): void {
    /**
     *  (phiSp,thetaSp) : spherical coordinate angles defining the unit vector perpendicular to the fault plane (pointing upward in system S)
     *               in the stress tensor reference system: S' = (X,Y,Z)
     *  These angles are recalculated from the new stress tensors
     */




    }

    /**
     * Rotate the tensor about an angle...
     * @param rotAx_phi 
     */
    private vector_rotation(rotAx_phi: number): void {
        // this.x = Math.sin( rotAx_phi);
    }

    // ------------------------------ variable members

    // Each fault is defined by a set of parameters as follows:
    //      The fault plane orientation is defined by three parameters:
    //      Fault strike: clockwise angle measured from the North direction [0, 360)
    //      Fault dip: [0, 90]
    //      Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
    private strike:             number
    private dip:                number
    private dipDirection:       Direction

    private rake:               number
    private strikeDirection:    Direction
    private striationTrend:     number
    // Sense of mouvement: For verification purposes, it is recommended to indicate both the dip-slip and strike-slip compoenents, when possible. 
    //      Dip-slip component:
    //          N = Normal fault, 
    //          I = Inverse fault or thrust
    //      Strike-slip componenet:
    //          RL = Right-Lateral fault
    //          LL = Left-Lateral fault
    // Sense of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL
    private sensMouv: SensOfMovement

    // We define 2 orthonormal right-handed reference systems:
    //      S =  (X, Y, Z ) is the geographic reference frame oriented in (East, North, Up) directions.
    //      S' = (X',Y',Z') is the principal stress reference frame, parallel to (sigma_1, sigma_3, sigma_2);

    // (phi,theta) : spherical coordinate angles defining the unit vector perpendicular to the fault plane (pointing upward)
    //                 in reference system S
    // phi : azimuth phi in interval [0, 2 PI), measured anticlockwise from the X axis (East direction) in reference system S
    // theta: colatitude or polar angle in interval [0, PI/2], measured downward from the zenith (upward direction)
    private coordinates: SphericalCoords = new SphericalCoords()

    // private phi:    number      // constant value for each fault plane
    // private theta:  number      // constant value for each fault plane
 
    // normal: unit vector normal to the fault plane (pointing upward) defined in the geographic reference system S
    private normal_ :    Vector3 = newVector3D()       // constant values for each fault plane
    // (e_phi, e_theta) = unit vectors defining local reference frame tangent to the sphere in spherical coordinates
    private e_phi:      Vector3 = newVector3D()
    private e_theta:    Vector3 = newVector3D()
       
    // normalSp: unit vector normal to the fault plane (pointing upward) defined in the stress tensor reference system: S' = (X',Y',Z')=(s1,s3,s2)
    private normalSp :  Vector3  = newVector3D()       // values should be recalculated for new stress tensors
    // (phiSp,thetaSp) : spherical coordinate angles defining the unit vector perpendicular to the fault plane (pointing upward in system S)
    //                 in the stress tensor reference system: S' = (X,Y,Z)
    // private phiSp:    number      // constant values for each fault plane
    // private thetaSp:  number      // values are recalculated for new stress tensors
    private coordinatesSp: SphericalCoords = new SphericalCoords()

    private RTrot: Matrix3x3 = newMatrix3x3()
    
    // striation: unit vector pointing toward the measured striation in the geographic reference system: S = (X,Y,Z)
    // private striation:      Vector3 = newVector3D()      // constant value for each fault plane

    // striationSp: unit vector pointing toward the measured striation in the stress tensor reference system: S' = (X',Y',Z')
    private striationSp:    Vector3 = newVector3D()     // values are recalculated for new stress tensors
    // stress: stress vector in the geographic reference system: S = (X,Y,Z)
    private stress:         Vector3 = newVector3D()     // values are recalculated for new stress tensors
    // shearStressSp: shear stress vector in the geographic reference system: S = (X,Y,Z)
    private shearStress : Vector3 = newVector3D()

    private stressMag:          number     // values are recalculated for new stress tensors
    private normalStress:       number     // values are recalculated for new stress tensors
    private shearStressMag:     number     // values are recalculated for new stress tensors

    private alphaStriaDeg = 0
    private alphaStria = 0
    // e_striation_: unit vector in reference system S pointing toward the measured striation
    private e_striation_:       Vector3 = newVector3D()

    // e_perp_striation_: unit vector in reference system S located in the fault plane and perpendicular to the measured striation
    private e_perp_striation_:  Vector3 = newVector3D()

    // angularDifStriae: angular difference between the measured and calculated striations
    private angularDifStriae

    private upliftedBlock: Direction

    private isUpLiftedBlock: boolean = false
}


// Stress parameters:

// For a given stress tensor, we calculate the stress components:

// Step 1:

//      n' = R n,  where n and n' are vectors in reference frames S and S'

/*
this.normalSp[0] = R[0,0] * this.normal[0] + R[0,1] * this.normal[1] + R[0,2] * this.normal[2] 
this.normalSp[1] = R[1,0] * this.normal[0] + R[1,1] * this.normal[1] + R[1,2] * this.normal[2] 
this.normalSp[2] = R[2,0] * this.normal[0] + R[2,1] * this.normal[1] + R[2,2] * this.normal[2] 

// Step 2:
// The principal stress values are defined according to the rock mechanics sign convention (positive values for compressive stresses)
const sigma_1 = - this.lambda[0]    // Principal stress in X direction
const sigma_2 = - this.lambda[2]    // Principal stress in Z direction
const sigma_3 = - this.lambda[1]    // Principal stress in Y direction

// Calculate the normal and shear stress components of the fault plane using coordinates in reference system S':
// S' = (X',Y',Z') is the principal stress reference frame, parallel to (sigma_1, sigma_3, sigma_2);
// The stress magnitude is obtained from the sum of the squared components 
let this.Stress = Math.sqrt( sigma_1**2 * np[0]**2 + sigma_3**2 * np[1]**2 + sigma_2**2 * np[2]**2 )
// The signed normal stress is obtatined form the scalar product of the normal and stress vectors 
// The normal stress is positive since (s1,s2,s3) = (1,R,0)
let this.normalStress = sigma_1 * np[0]**2 + sigma_3 * np[1]**2 + sigma_2 * np[2]**2
// The shear stress 
let this.shearStress = sigma_1 * np[0]**2 + sigma_3 * np[1]**2 + sigma_2 * np[2]**2
*/
