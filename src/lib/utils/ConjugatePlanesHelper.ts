import { constant_x_Vector, newVector3D, normalizedCrossProduct, scalarProductUnitVectors, SphericalCoords, Vector3 } from "../types"
import { Direction, FaultHelper, TypeOfMovement } from "./FaultHelper"
import { decodePlane } from "./PlaneHelper"

export class ConjugatePlanesHelper {
    static create(
        {strike, dipDirection, dip, typeOfMovement, rake, strikeDirection}:
        {strike: number, dipDirection: Direction, dip: number, typeOfMovement: TypeOfMovement, rake: number, strikeDirection: Direction}):
        {nPlane: Vector3, nStriation: Vector3, nPerpStriation: Vector3, fault: FaultHelper}
    {
        // const f = new FaultHelper({strike, dipDirection, dip})
        // f.setStriation({typeOfMovement, rake, strikeDirection})
        // return {
        //     nPlane: f.normal,
        //     nStriation: f.striation,
        //     nPerpStriation: f.e_perp_striation,
        //     fault: f
        // }

        const f = FaultHelper.create(
            {strike, dip, dipDirection},
            {rake, strikeDirection, typeOfMovement, trend: 0, trendIsDefined: false}
        )

        return {
            nPlane: f.normal,
            nStriation: f.striation,
            nPerpStriation: f.e_perp_striation,
            fault: f
        }
    }

    get normal(): Vector3 {
        return this.normal_
    }

    conjugatePlaneCheckmovement(
        {noPlane, nPlane, coordinates, typeOfMovement, nSigma3_Sm, nSigma2_Sm}:
        {noPlane: number, nPlane: Vector3, coordinates: SphericalCoords, typeOfMovement: TypeOfMovement, nSigma3_Sm: Vector3, nSigma2_Sm: Vector3}): void
    {
        // The striation vector (or shear sense in the case of shear bands) for conjugate planes is NOT defined in the data file.
        //      The striation is calculated from geometric data by considering that it is located in the plane of movement, 
        //      consistently with the type of movement, i.e. in the compressional quadrants.

        // This method calculates the striation unit vector in the local reference frame in polar coordinates from the calculated rake
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
        
        // (coordinates.phi, coordinates.theta) : spherical coords of conjugate faults in the geographic reference system: S = (X,Y,Z) = (E,N,Up)
        // Sperical coords are calculated using method faultSphericalCoords in class fault

        // e_phi : unit vector pointing toward the azimuthal direction in the local reference frame in spherical coords
        this.e_phi[0] = - Math.sin( coordinates.phi )
        this.e_phi[1] =   Math.cos( coordinates.phi )
        this.e_phi[2] =   0

        // e_theta : unit vector pointing toward the dip direction in the local reference frame in spherical coords
        this.e_theta[0] =   Math.cos(coordinates.theta) * Math.cos( coordinates.phi )
        this.e_theta[1] =   Math.cos(coordinates.theta) * Math.sin( coordinates.phi )
        this.e_theta[2] = - Math.sin(coordinates.theta )

        // Check that the sense of movement is consistent with the orientation of stress axes
        // This requires the calculation of the striation vector indicating movement of the outward block relative to the inner block
        // The striation vector is in the plane of movement:  nStriation = nPlane x nSigma2_Sm
        let nStriation = normalizedCrossProduct({U: nPlane, V: nSigma2_Sm})

        if (scalarProductUnitVectors({U: nPlane, V: nSigma3_Sm}) < 0) {
            // nSigma3_Sm points inward (toward the fault plane)
            // Thus, invert the sense of nSigma3_Sm so that it points outward (in the direction of the normal to the plane):
            nSigma3_Sm = constant_x_Vector({k: -1, V: nSigma3_Sm})
        }    

        if (scalarProductUnitVectors( {U: nStriation, V: nSigma3_Sm} ) < 0) {
            // nSigma3_Sm and nStriation should be both located in the compressional quadrant relative to the outward hemisphere of the fault plane
            //      In other words, the angle (nSigma3_Sm, nStriation) < PI/2
            // However, if nStriation . nSigma3_Sm < 0 then this condition is not satisfied (i.e. nStriation is located in the dilatant quadrant)
            // Thus, invert the sense of the striation so that it points toward the compressional quadrant:
            nStriation = constant_x_Vector( {k: -1, V: nStriation} )
        }    

        // The strike-slip component of movement is defined by the projection of the striation vector along unit vector e_phi
        let strikeSlipComponent = scalarProductUnitVectors({U: nStriation, V: this.e_phi} )

        // The dip component of movement is defined by the projection of the striation vector along unit vector e_theta
        let dipComponent = scalarProductUnitVectors({ U: nStriation, V: this.e_theta} )

        // Check consistency of strike-lateral component of movement
        if ( strikeSlipComponent > this.EPS) {
            // In principle, the conjugate plane has a left-lateral component of movement

            if (typeOfMovement === TypeOfMovement.RL || typeOfMovement === TypeOfMovement.N_RL || typeOfMovement === TypeOfMovement.I_RL) {
                // throw new Error('Sense of movement of conjugate plane ' + noPlane + ' includes a right-lateral (RL) which is not consistent with fault kinematics')
                throw new Error(`Sense of movement of conjugate plane ${noPlane} includes a right-lateral (RL) which is not consistent with fault kinematics`)
            }
        }
        else if ( strikeSlipComponent < -this.EPS) {
            // In principle, the conjugate plane has a right-lateral component of movement

            if (typeOfMovement === TypeOfMovement.LL || typeOfMovement === TypeOfMovement.N_LL || typeOfMovement === TypeOfMovement.I_LL) {
                throw new Error(`Sense of movement of conjugate plane ${noPlane} includes a left-lateral (LL), which is not consistent with fault kinematics`)
            }
        }
        else {
            // In principle, the strike-slip component of movement of the conjugate plane is negligeable
            if (typeOfMovement !== TypeOfMovement.N && typeOfMovement !== TypeOfMovement.I && typeOfMovement !== TypeOfMovement.UND) {
                throw new Error(`Sense of movement of conjugate plane ${noPlane} includes a strike-slip component, which is not consistent with fault kinematics`)
            }
        }

        // Check consistency of dip-slip component of movement
        if ( dipComponent > this.EPS) {
            // In principle, the conjugate plane has a normal component of movement

            if (typeOfMovement === TypeOfMovement.I || typeOfMovement === TypeOfMovement.I_RL || typeOfMovement === TypeOfMovement.I_LL) {
                throw new Error(`Sense of movement of conjugate plane ${noPlane} includes an inverse (I) component, which is not consistent with fault kinematics`)
            }
        }
        else if ( dipComponent < -this.EPS) {
            // In principle, the conjugate plane has an inverse component of movement

            if (typeOfMovement === TypeOfMovement.N || typeOfMovement === TypeOfMovement.N_RL || typeOfMovement === TypeOfMovement.N_LL) {
                throw new Error(`Sense of movement of conjugate plane ${noPlane} includes a normal component, which is not consistent with fault kinematics`)
            }
        }
        else {
            // In principle, the dip component of movement of the conjugate plane is negligeable
            if (typeOfMovement !== TypeOfMovement.RL && typeOfMovement !== TypeOfMovement.LL && typeOfMovement !== TypeOfMovement.UND) {
                throw new Error(`Sense of movement of conjugate plane ${noPlane} includes an dip component (I or N), which is not consistent with fault kinematics`)
            }
        }
    }

    perpendicularPlanesCheckmovement(
        {noPlane, nPlane, coordinates, typeOfMovement, nSigma3_Sm, nSigma2_Sm}:
        {noPlane: number, nPlane: Vector3, coordinates: SphericalCoords, typeOfMovement: TypeOfMovement, nSigma3_Sm: Vector3, nSigma2_Sm: Vector3}): boolean
    {
        // The striation vector (or shear sense in the case of shear bands) for conjugate planes is NOT defined in the data file.
        //      The striation is calculated from geometric data by considering that it is located in the plane of movement, 
        //      consistently with the type of movement, i.e. in the compressional quadrants.

        // This method calculates the striation unit vector in the local reference frame in polar coordinates from the calculated rake
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
        
        // (coordinates.phi, coordinates.theta) : spherical coords of conjugate faults in the geographic reference system: S = (X,Y,Z) = (E,N,Up)
        // Spherical coords are calculated using method faultSphericalCoords in class fault

        // This method returns a boolean indicating if the current stress axes orientations are consistent with type of mouveement

        // e_phi : unit vector pointing toward the azimuthal direction in the local reference frame in spherical coords
        this.e_phi[0] = - Math.sin( coordinates.phi )
        this.e_phi[1] =   Math.cos( coordinates.phi )
        this.e_phi[2] =   0

        // e_theta : unit vector pointing toward the dip direction in the local reference frame in spherical coords
        this.e_theta[0] =   Math.cos(coordinates.theta) * Math.cos( coordinates.phi )
        this.e_theta[1] =   Math.cos(coordinates.theta) * Math.sin( coordinates.phi )
        this.e_theta[2] = - Math.sin(coordinates.theta )

        // Check that the sense of movement is consistent with the orientation of stress axes
        // This requires the calculation of the striation vector indicating movement of the outward block relative to the inner block
        // The striation vector is in the plane of movement:  nStriation = nPlane x nSigma2_Sm
        let nStriation = normalizedCrossProduct({U: nPlane, V: nSigma2_Sm})

        if (scalarProductUnitVectors({U: nPlane, V: nSigma3_Sm}) < 0) {
            // nSigma3_Sm points inward (toward the fault plane)
            // Thus, invert the sense of nSigma3_Sm so that it points outward (in the direction of the normal to the plane):
            nSigma3_Sm = constant_x_Vector({k: -1, V: nSigma3_Sm})
        }    

        if (scalarProductUnitVectors( {U: nStriation, V: nSigma3_Sm} ) < 0) {
            // nSigma3_Sm and nStriation should be both located in the compressional quadrant relative to the outward hemisphere of the fault plane
            //      In other words, the angle (nSigma3_Sm, nStriation) < PI/2
            // However, if nStriation . nSigma3_Sm < 0 then this condition is not satisfied (i.e. nStriation is located in the dilatant quadrant)
            // Thus, invert the sense of the striation so that it points toward the compressional quadrant:
            nStriation = constant_x_Vector( {k: -1, V: nStriation} )
        }    

        // The strike-slip component of movement is defined by the projection of the striation vector along unit vector e_phi
        let strikeSlipComponent = scalarProductUnitVectors({U: nStriation, V: this.e_phi} )

        // The dip component of movement is defined by the projection of the striation vector along unit vector e_theta
        let dipComponent = scalarProductUnitVectors({ U: nStriation, V: this.e_theta} )

        // Check consistency of strike-lateral component of movement
        if ( strikeSlipComponent > this.EPS) {
            // In principle, the conjugate plane has a left-lateral component of movement

            if (typeOfMovement === TypeOfMovement.RL || typeOfMovement === TypeOfMovement.N_RL || typeOfMovement === TypeOfMovement.I_RL) {
                // throw new Error('Sense of movement of conjugate plane ' + noPlane + ' includes a right-lateral (RL) which is not consistent with fault kinematics')
                // throw new Error(`Sense of movement of conjugate plane ${noPlane} includes a right-lateral (RL) which is not consistent with fault kinematics`)

                // boolean indicates that the current stress axes orientations are NOT consistent with type of mouveement
                return false
            }
        }
        else if ( strikeSlipComponent < -this.EPS) {
            // In principle, the conjugate plane has a right-lateral component of movement

            if (typeOfMovement === TypeOfMovement.LL || typeOfMovement === TypeOfMovement.N_LL || typeOfMovement === TypeOfMovement.I_LL) {
                // throw new Error(`Sense of movement of conjugate plane ${noPlane} includes a left-lateral (LL), which is not consistent with fault kinematics`)
                return false
            }
        }
        else {
            // In principle, the strike-slip component of movement of the conjugate plane is negligeable
            if (typeOfMovement !== TypeOfMovement.N && typeOfMovement !== TypeOfMovement.I && typeOfMovement !== TypeOfMovement.UND) {
                // throw new Error(`Sense of movement of conjugate plane ${noPlane} includes a strike-slip component, which is not consistent with fault kinematics`)
                return false
            }
        }

        // Check consistency of dip-slip component of movement
        if ( dipComponent > this.EPS) {
            // In principle, the conjugate plane has a normal component of movement

            if (typeOfMovement === TypeOfMovement.I || typeOfMovement === TypeOfMovement.I_RL || typeOfMovement === TypeOfMovement.I_LL) {
                // throw new Error(`Sense of movement of conjugate plane ${noPlane} includes an inverse (I) component, which is not consistent with fault kinematics`)
                return false
            }
        }
        else if ( dipComponent < -this.EPS) {
            // In principle, the conjugate plane has an inverse component of movement

            if (typeOfMovement === TypeOfMovement.N || typeOfMovement === TypeOfMovement.N_RL || typeOfMovement === TypeOfMovement.N_LL) {
                // throw new Error(`Sense of movement of conjugate plane ${noPlane} includes a normal component, which is not consistent with fault kinematics`)
                return false
            }
        }
        else {
            // In principle, the dip component of movement of the conjugate plane is negligeable
            if (typeOfMovement !== TypeOfMovement.RL && typeOfMovement !== TypeOfMovement.LL && typeOfMovement !== TypeOfMovement.UND) {
                // throw new Error(`Sense of movement of conjugate plane ${noPlane} includes an dip component (I or N), which is not consistent with fault kinematics`)
                return false
            }
        }

        // boolean indicates that the current stress axes orientations ARE consistent with type of mouveement
        return true
    }

    // (e_phi, e_theta) = unit vectors defining local reference frame tangent to the sphere in spherical coordinates
    private e_phi:      Vector3 = newVector3D()
    private e_theta:    Vector3 = newVector3D()
    private normal_: Vector3 = newVector3D()
    protected nStriation: Vector3 = undefined
    protected EPS = 1e-7
}
       




