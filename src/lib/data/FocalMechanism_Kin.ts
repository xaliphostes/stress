import {
    Matrix3x3, Point3D, scalarProductUnitVectors,
    SphericalCoords, Vector3, add_Vectors,
    constant_x_Vector, deg2rad, spherical2unitVectorCartesian,
    faultStressComponents, normalizeVector, unitVectorCartesian2Spherical
}
from "../types"
import { isNumber } from "../utils"
import { Data, DataParameters } from "./Data"
import { StriatedPlaneProblemType } from "./StriatedPlane_Kin"
import { FractureStrategy } from "./types"

// import { Fracture, FractureParams, FractureStrategy } from "./Fracture"

/** 
 Focal Mechanisms

 The cost function calculates which of the two focal planes is more consistent with the stress tensor solution.
 The misfit may be defined as the angular difference between mesaured and calculated striations, or as the
 minimal angular difference between the stress tensor explainning the observed striation and the stress tensor solution.
 Note that seismological data can be analized jointly with geological data to obtain one single stress tensor solution 
 that explains both seismological and outcrop-scale tectonic data.

 Focal mecanisms are specified in a separate file, different from the geological data file.

    The seismological data set has the following columns :

    0      Data mumber                                  Mandatory datum
    1      Date (yyyy-mm-dd, e.g., 2019-09-22)
    2      Time (hh:mm:ss, e.g., 17-39-43)
    3      Latitude north in degrees (e.g., 45.98)
    4      Longitude east in degrees (e.g., 12.75)
    5      Depth in km (e.g., 5.8)
    6      Seismic moment Mo (dyn.cm, e.g., 3.5E+22)
    7      Strike of nodal plane No 1 [0, 360)          Mandatory datum
    8      Dip of nodal plane No 1 [0, 90]              Mandatory datum
    9      Rake of nodal plane No 1 [-180, 180]         Mandatory datum
    10     Strike of nodal plane No 2 [0, 360)          Optional datum
    11     Dip of nodal plane No 2 [0, 90]              Optional datum
    12     Rake of nodal plane No 2 [-180, 180]         Optional datum
    13     Fault type according to Zoback 1992 (5 categories: N, N_SS, SS, R_SS, R, and UNKNOWN for those not fitting in any of the five types)
    14     Quality inversion parameter according to Sarao et al. 2021 (4 is the best solution)
    15     Weight

    Each nodal plane is defined by a set of 3 parameters as follows:
        Strike: Angle of the fault-trace direction measured clockwise from the North [0, 360), defined so that the fault dips to the right side of the trace,
            i.e., the hanging-wall block is always to the right of the strike.
        Dip: inclination of the nodal plane relative to the horizontal [0, 90].
            The dip direction is located to the right of the strike such that the cross product of unit vectors points upward :
            normal = dip X strike
        Rake: Angle defining the slip vector indicating the movement of the hnaging wall relative to the footwall.
            (i.e., the top block is located in the direction of the normal vector)
            The rake is measured in the anticlockwise direction from the strike [-180,180] 

    This function calculates the unit vectors perpendicular to the nodal planes in reference system:
        S = (X,Y,Z) = (E,N,Up)
    Vectors normal to nodal planes are defined in the upper hemisphere.   
    The unit vectors indicating slip movement ar claculated from the rake angles.

    @category Data
 */

export class FocalMechanismKin extends Data {
    // Unit vectors perpendicular to nodal planes
    protected nNodalPlane1: Vector3 = [0, 0, 0]
    protected nNodalPlane2: Vector3 = [0, 0, 0]
    // Spherical coords defining unit vectors perpendicular to nodal planes
    protected SpheCoords_nNodalPlane1 = new SphericalCoords()
    protected SpheCoords_nNodalPlane2 = new SphericalCoords()
    // Unit vectors pointing in the rake direction (i.e., slip direction)
    protected nRake1: Vector3 = [0, 0, 0]
    protected nRake2: Vector3 = [0, 0, 0]

    protected nodalPlane2: boolean = false

    protected strikeNodalPlane1:    number = undefined
    protected dipNodalPlane1:       number = undefined
    protected rakeNodalPlane1:      number = undefined

    protected strikeNodalPlane2:    number = undefined
    protected dipNodalPlane2:       number = undefined
    protected rakeNodalPlane2:      number = undefined

    protected problemType = StriatedPlaneProblemType.DYNAMIC
    protected strategy: FractureStrategy = FractureStrategy.ANGLE
    protected position: Point3D = undefined

    initialize(params: DataParameters): boolean {

        /*
        if (Number.isNaN(params.strikeNodalPlane)) {
             throw new Error('Missing trend angle for nodal plane No.1')
        }
        if (Number.isNaN(params.dipNodalPlane1)) {
            throw new Error('Missing dip angle for  nodal plane No.1')
        }
        if (Number.isNaN(params.rakeNodalPlane1)) {
            throw new Error('Missing dip angle for  nodal plane No.1')
        }
        */
        // -----------------------------------

        this.strikeNodalPlane1 = toFloat(toks[7])
        if (!DataDescription.checkRanges(this.strikeNodalPlane1)) {
            DataDescription.putMessage(toks, 7, this, result)
        }

        // -----------------------------------

        this.dipNodalPlane1 = toFloat(toks[8])
        if (!DataDescription.checkRanges(this.dipNodalPlane1)) {
            DataDescription.putMessage(toks, 8, this, result)
        }

        // -----------------------------------

        const this.rakeNodalPlane1 = toFloat(toks[9])
        if (!DataDescription.checkRanges(this.rakeNodalPlane1)) {
            DataDescription.putMessage(toks, 9, this, result)
        }

        // -----------------------------------

        const a1 = this.nodalPlaneAngles2unitVectors({
            strikeNodalPlane: this.strikeNodalPlane1,
            dipNodalPlane: this.dipNodalPlane1,
            rakeNodalPlane: this.rakeNodalPlane1
        })
        this.nNodalPlane1 = a1.nNodalPlane
        this.SpheCoords_nNodalPlane1 = a1.SpheCoords_nNodalPlane
        this.nRake1 = a1.nRake

        // -----------------------------------

        if (isNumber(toks[10]) && isNumber(toks[11]) && isNumber(toks[12])) {
            // Strike, dip and rake of the Nodal Plane No 2 trend are provided: toks 10, 11, 12

            const strikeNodalPlane2 = toFloat(toks[10])
            if (!DataDescription.checkRanges(strikeNodalPlane2)) {
                DataDescription.putMessage(toks, 10, this, result)
            }

            // -----------------------------------

            const dipNodalPlane2 = toFloat(toks[11])
            if (!DataDescription.checkRanges(dipNodalPlane2)) {
                DataDescription.putMessage(toks,11, this, result)
            }
    
            // -----------------------------------
    
            const rakeNodalPlane2 = toFloat(toks[12])
            if (!DataDescription.checkRanges(rakeNodalPlane2)) {
                DataDescription.putMessage(toks, 12, this, result)
            }

            this.nodalPlane2 = true

        } else if (isNumber(toks[10]) || isNumber(toks[11]) || isNumber(toks[12])) {

            throw new Error( 'Strike, dip, and rake are not completely specified for nodal plane No 2 in focal mechanism No ' + toks[0])
        }

        if (this.nodalPlane2) {
            // The strike, dip and rake of nodal plane No 2 are optional. 
            // If they are specified in the focal mechanism data file (i.e. nodalPlane2 = true ) 
            // then they are used to calculate unit vectors for stress analysis
            const a2 = this.nodalPlaneAngles2unitVectors({
                strikeNodalPlane: this.strikeNodalPlane2,
                dipNodalPlane: this.dipNodalPlane2,
                rakeNodalPlane: this.rakeNodalPlane2
            })
            this.nNodalPlane2 = a2.nNodalPlane
            this.SpheCoords_nNodalPlane2 = a2.SpheCoords_nNodalPlane
            this.nRake2 = a2.nRake
        } else {
            // The strike, dip and rake of nodal plane No 2 are not specified in the focal mechanism data file 
            // (i.e. nodalPlane2 = false ) 
            // The unit vectors for stress analysis are calculated from vectors for nodal plane No 1.
            if (this.nRake1[2] >= 0) {
                // nRake1 is in the upper hemisphere, i.e., Nodal plane 1 does not have a normal component.
                // The normal nNodalPlane2 is defined by the slip vector nRake1
                this.nNodalPlane2 = this.nRake1
                // The slip vector nRake2  is defined by the normal nNodalPlane1
                this.nRake2 = this.nNodalPlane1
            } else {
                // nRake1 is in the lower hemisphere, i.e., Nodal plane 1 has a normal component.
                // The normal nNodalPlane2 (pointing upward) is defined by the negative slip vector -nRake1
                this.nNodalPlane2 = constant_x_Vector({k: -1, V: this.nRake1})
                // The slip vector nRake2  is defined by the negative of the normal nNodalPlane1
                this.nRake2 = constant_x_Vector({k: -1, V: this.nNodalPlane1})
                // Calculate the spherical coordinates of the unit normal vector nNodalPlane2
                this.SpheCoords_nNodalPlane2 = unitVectorCartesian2Spherical(this.nNodalPlane2)
            }
        }
        return true
    }

    check({ displ, strain, stress }: { displ: Vector3, strain: Matrix3x3, stress: Matrix3x3 }): boolean {
        return stress !== undefined
    }

    cost({ displ, strain, stress }: { displ: Vector3, strain: Matrix3x3, stress: Matrix3x3 }): number {
        const c1 = this._cost(stress, true)
        const c2 = this._cost(stress, false)

        return Math.min(c1, c2)
    }

    private _cost(stress: Matrix3x3, firstPlane: boolean) {
        let nNodalPlane = undefined
        let nRake = undefined

        if (firstPlane) {
            nNodalPlane = this.nNodalPlane1
            nRake = this.nRake1
        }
        else {
            nNodalPlane = this.nNodalPlane2
            nRake = this.nRake2
        }

        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            // For the first implementation, use the W&B hyp.
            // let d = tensor_x_Vector({T: stress, V: this.nNodalPlane1}) // Cauchy
            // d = normalizeVector(d)

            // Calculate shear stress parameters
            // Calculate the magnitude of the shear stress vector in reference system S
            const { shearStress, normalStress, shearStressMag } = faultStressComponents({ stressTensor: stress, normal: nNodalPlane })
            let cosAngularDifStriae = 0

            if (shearStressMag > 0) { // shearStressMag > Epsilon would be more realistic ***
                // nShearStress = unit vector parallel to the shear stress (i.e. representing the calculated striation)
                let nShearStress = normalizeVector(shearStress, shearStressMag)
                // The angular difference is calculated using the scalar product: 
                // nShearStress . nStriation = |nShearStress| |nStriation| cos(angularDifStriae) = 1 . 1 . cos(angularDifStriae)
                // cosAngularDifStriae = cos(angular difference between calculated and measured striae)
                cosAngularDifStriae = scalarProductUnitVectors({ U: nShearStress, V: nRake })

            } else {
                // The calculated shear stress is zero (i.e., the fault plane is parallel to a principal stress)
                // In such situation we may consider that the calculated striation can have any direction.
                // Nevertheless, the plane should not display striations as the shear stress is zero.
                // Thus, in principle the plane is not compatible with the stress tensor, and it should be eliminated from the analysis
                // In suchh case, the angular difference is taken as PI
                cosAngularDifStriae = -1
            }

            if (this.strategy === FractureStrategy.ANGLE) {
                // The misfit is defined by the angular difference (in radians) between measured and calculated striae
                return Math.acos(cosAngularDifStriae)
            } else {
                // The misfit is defined by the the cosine of the angular difference between measured and calculated striae
                return 0.5 - cosAngularDifStriae / 2
            }
        }
        throw new Error('Kinematic not yet available')
    }

    private nodalPlaneAngles2unitVectors(
        { strikeNodalPlane, dipNodalPlane, rakeNodalPlane }:
            { strikeNodalPlane: number, dipNodalPlane: number, rakeNodalPlane: number }) {
        // nNodalPlane = Normal vector to nodal plane pointing upward defined in the geographic reference system: S = (X,Y,Z)
        // (phi,theta) : spherical coordinate angles defining the unit vector perpendicular to the fault plane (pointing upward)
        //            in the geographic reference system: S = (X,Y,Z) = (E,N,Up)

        // phi : azimuthal angle in interval [0, 2 PI), measured anticlockwise from the X axis (East direction) in reference system S
        // theta: colatitude or polar angle in interval [0, PI/2], measured downward from the zenith (upward direction)

        let SpheCoords_nNodalPlane: SphericalCoords
        let SpheCoordsStrike: SphericalCoords
        let SpheCoordsDipNeg: SphericalCoords
        let nNodalPlane: Vector3
        let nStrike: Vector3
        let nDipNeg: Vector3
        let nRake: Vector3

        // The polar angle (or colatitude) theta of normal1 is calculated in radians from the dip of the nodal plane:
        SpheCoords_nNodalPlane.theta = deg2rad(dipNodalPlane)

        // The azimuthal angle of normal1 is calculated in radians from the trend of the nodal plane :
        //      (strikeNodalPlane + PI/2) + phi = 5 PI / 2; thus: strikeNodalPlane + phi = 2 PI
        SpheCoords_nNodalPlane.phi = 2 * Math.PI - deg2rad( strikeNodalPlane ) 

        // nNodalPlane is defined by angles (phi, theta) in spherical SpheCoords_nNodalPlane.
        nNodalPlane = spherical2unitVectorCartesian(SpheCoords_nNodalPlane)

        // nStrike1 is the unit vector pointing in the strike direction of nodal plane
        // The spherical coords (phi,theta) defining strike1 are calculated:
        SpheCoordsStrike.phi = Math.PI / 2 - deg2rad(strikeNodalPlane)
        if (strikeNodalPlane > 90) {
            SpheCoordsStrike.phi = SpheCoordsStrike.phi + 2 * Math.PI
        }

        SpheCoordsStrike.theta = 0

        nStrike = spherical2unitVectorCartesian(SpheCoordsStrike)

        // nDipNeg is the unit vector pointing in the opposite (negative) direction of the nodal plane's dip
        // The spherical coords (phi,theta) defining nDipNeg are calculated: 
        // phi is shifted by an angle of PI realtive to the nodal plane normal, and is located in interval [0,2PI]
        if (SpheCoords_nNodalPlane.phi < Math.PI) {
            // The azimuthal angle of nDipNeg is oriented at an angle of PI relative to the normal vector
            SpheCoordsDipNeg.phi = SpheCoords_nNodalPlane.phi + Math.PI
        } else {
            SpheCoordsDipNeg.phi = SpheCoords_nNodalPlane.phi - Math.PI
        }
        // The polar angle of nDipNeg is such that : SpheCoords_nNodalPlane.theta + SpheCoordsDipNeg.theta = PI/2
        SpheCoordsDipNeg.theta = Math.PI / 2 - SpheCoords_nNodalPlane.theta

        nDipNeg = spherical2unitVectorCartesian(SpheCoordsDipNeg)

        let rake = deg2rad(rakeNodalPlane)
        let kStrike = Math.cos(rake)
        let kDipNeg = Math.sin(rake)

        // nRake is the unit vector pointing in the direction of the rake of nodal plane
        //  in other words, nRake points in the slip direction (i.e., equivalent to the fault striation)
        nRake = add_Vectors({ U: constant_x_Vector({ k: kStrike, V: nStrike }), V: constant_x_Vector({ k: kDipNeg, V: nDipNeg }) })

        return {
            nNodalPlane,
            SpheCoords_nNodalPlane,
            nRake
        }
    }
}
