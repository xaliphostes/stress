import {
    crossProduct, deg2rad, Matrix3x3, Point3D, scalarProduct,
    tensor_x_Vector, Vector3, vectorMagnitude
} from "./math"
import { MohrPoint } from "./MohrPoint"
import { SphericalCoords } from "./SphericalCoords"
import { Curve3D } from "../analysis/Curve3D"

/**
 * @category Mechanics
 */
export function faultStressComponents(
    {stressTensor, normal}:
    {stressTensor: Matrix3x3, normal: Vector3}): {shearStress: Vector3, normalStress: number, shearStressMag: number}
{
    // Calculate the stress components applied on a fault plane as a result of a stress tensor StressTensor defined in the reference system S

    // normal: unit vector normal to the fault plane (pointing upward) defined in the geographic reference system: S = (X,Y,Z)

    // Calculate total stress vector
    let stress = tensor_x_Vector({T: stressTensor, V: normal})

    // Calculate normal stress (positive = extension, negative = compression). 
    // In principle the normal stress is negative since the principal stresses are <= 0.
    let normalStress = scalarProduct({U: stress, V: normal})
    
    // Calculate the shear stress vector in reference system S
    // shearStress + normalStress * normal = stress (i.e., total stress)
    let shearStress: Vector3 = [0,0,0]
    shearStress[0] = stress[0] - normalStress * normal[0]
    shearStress[1] = stress[1] - normalStress * normal[1]
    shearStress[2] = stress[2] - normalStress * normal[2]

    let shearStressMag = vectorMagnitude(shearStress)

    return {
        shearStress,
        normalStress,
        shearStressMag
    }
}

/**
 * @category Mechanics
 */
export function angularDifStriations(
    {e_striation, shearStress, shearStressMag }:
    { e_striation: Vector3, shearStress: Vector3, shearStressMag: number }): number
{
    // Calculate the angular difference between the measured and calculated striations
    // The angular difference calculated by the scalar product is unsigned (in interval [0,Pi])

    let angularDifStriae = 0

    if ( shearStressMag > 0 ) {
        // The angular difference is calculated using the scalar product: 
        //      e_striation . shearStress = |e_striation| |shearStress| cos(angularDifStriae) = 1 . shearStressMag . cos(angularDifStriae)
        angularDifStriae =  ( Math.acos( e_striation[0] * shearStress[0] + e_striation[1] * shearStress[1]
                               + e_striation[2] * shearStress[2] ) ) / shearStressMag
    } else {
        // The calculated shear stress is zero (i.e., the fault plane is parallel to a principal stress)
        // In such situation we may consider that the calculated striation can have any direction.
    }
    
    return angularDifStriae
}

/**
 * @category Mechanics
 */
export function signedAngularDifStriations(
    {normal, e_striation, shearStress, shearStressMag }:
    { normal: Vector3, e_striation: Vector3, shearStress: Vector3, shearStressMag: number }): number
{
    // Calculate the angular difference between the measured and calculated striations
    // The angular difference calculated by the scalar product is unsigned (in interval [0,Pi])

    let angularDifStriae = 0
    let nAux: Vector3

    if ( shearStressMag > 0 ) {
        // The angular difference is calculated using the scalar product in interval [0,PI]: 
        //      e_striation . shearStress = |e_striation| |shearStress| cos(angularDifStriae) = 1 . shearStressMag . cos(angularDifStriae)
        angularDifStriae =  ( Math.acos( e_striation[0] * shearStress[0] + e_striation[1] * shearStress[1]
                               + e_striation[2] * shearStress[2] ) ) / shearStressMag

        // nAux = auxiliary normal vector pointing outward (i.e., in the same direction as normal vector) if the angle between the measured and calculated striation
        //        is positive - anti-clockwise in interval (0,PI).
        //        Conversely, nAux points in the opposite direction if the angle is clockwise - negative, in interval (-PI,0)           
        let nAux = crossProduct( {U: e_striation, V: shearStress} )
        let sAux = scalarProduct( {U: normal, V: nAux} )  

        if (sAux < 0) {
            // angularDifStriae is negative (i.e., clokwise, in interval (-PI,0) )
            angularDifStriae = - angularDifStriae
        }

    } else {
        // The calculated shear stress is zero (i.e., the fault plane is parallel to a principal stress)
        // In such situation we may consider that the calculated striation can have any direction.
    }
    
    return angularDifStriae
}

/**
 * @category Mechanics
 */
export function mohrCircleLine(
    {r, first, second, sigma_1, sigma_2, sigma_3}:
    {r: number, first: MohrPoint, second: MohrPoint, sigma_1: number, sigma_2: number, sigma_3: number}): string
{
    const lineBuilder = new Curve3D()

    if (sigma_2 == sigma_3) {
        // Particular Case 1: revolution stress tensor around sigma_1
        // In such situation, points pO and p1 have equal coordinates and alfa angles
        // Curve is a circle sweeping at an angle alfa0 around sigma_1
        return arcCircle({r: r, sigma: 'sigma_1', alpha: first.angle})
    }
    else if (sigma_2 == sigma_1) {
        // Particular Case 2: revolution stress tensor around sigma_3
        // In such situation, points pO and p1 have equal coordinates and alfa angles
        // Curve is a circle sweeping at an angle PI/2 - alfa0 around sigma_3
        return arcCircle({r: r, sigma: 'sigma_3', alpha: Math.PI / 2 - first.angle})
    }
    else {
        // General Case:
        // Add to the list the initial point of the line segment located in one of the 3 Mohr circles
        lineBuilder.addPoint(mohrCirclePoint( {mohrCirc: first.circle, alfa: first.angle, r} ))

        // Add to the list the intermediate points of the line segment located between 2 Mohr circles
        // We calculate the direction cosines of the unit vector normal to the fault whose stress state is given by (X, Y)
        //      Note that (X,Y) are the normal and shear stress of a moving point along the Mohr-Coulomb line segment 

        // Without loss of generality, we suppose a stress tensor in strike-slip regime (fixing sigma_1 Eastward and sigma_3 Northward)
        let sigma_X = sigma_1
        let sigma_Y = sigma_3
        let sigma_Z = sigma_2

        for (let i = 1; i < 180; ++i) {
            let X = first.p[0] + (second.p[0] - first.p[0]) * i / 180
            let Y = first.p[1] + (second.p[1] - first.p[1]) * i / 180

            let nx = Math.sqrt(((sigma_Y - X) * (sigma_Z - X) + Y ** 2) / ((sigma_Y - sigma_X) * (sigma_Z - sigma_X)))
            let ny = Math.sqrt(((sigma_Z - X) * (sigma_X - X) + Y ** 2) / ((sigma_Z - sigma_Y) * (sigma_X - sigma_Y)))
            let nz = Math.sqrt(((sigma_X - X) * (sigma_Y - X) + Y ** 2) / ((sigma_X - sigma_Z) * (sigma_Y - sigma_Z)))

            const x = r * nx
            const y = r * ny
            const z = r * nz

            lineBuilder.addPoint(x, y, z)
        }

        // Add to the list the final point of the line segment located in one of the 3 Mohr circles
        lineBuilder.addPoint(mohrCirclePoint( {mohrCirc: second.circle, alfa: second.angle, r} ))

        return lineBuilder.buffer
    }
}

/**
 * @category Mechanics
 */
export function mohrCirclePoint(
    {r, mohrCirc, alfa}:
    {r: number, mohrCirc: string, alfa: number}): Point3D
{
    // Add to the list the initial or final point of the line segment located in one of the 3 Mohr circles

    if (mohrCirc == '3_1') {
        // The point is located in Mohr circle between sigma_3 and sigma_1
        // alfa is the azimuthal angle in the reference frame (x,y,z) = (sigma_1,sigma_3, sigma_2) = (East, North, Up)
        const theta = Math.PI / 2
        const phi = alfa

        return [
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.sin(theta) * Math.sin(phi),
            r * Math.cos(theta)
        ]
    }
    else if (mohrCirc == '3_2') {
        // The point is located in Mohr circle between sigma_3 and sigma_2
        // alfa is the polar angle in the reference frame (x,y,z) = (sigma_1,sigma_3, sigma_2) = (East, North, Up)
        const theta = alfa
        const phi = Math.PI / 2
        return [
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.sin(theta) * Math.sin(phi),
            r * Math.cos(theta)
        ]

    }
    else {
        // MohrCirc == '2_1'
        // The point is located in Mohr circle between sigma_2 and sigma_1
        // alfa is the latitude angle in the reference frame (x,y,z) = (sigma_1,sigma_3, sigma_2) = (East, North, Up)
        const theta = Math.PI / 2 - alfa
        const phi = 0
        return [
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.sin(theta) * Math.sin(phi),
            r * Math.cos(theta)
        ]
    }
}

/**
 * Usage:
 * ```ts
 * const arc = arcCircle({alpha: deg2rad(12), sigma: '3_1'})
 * ```
 * @category Mechanics
 */
export function arcCircle(
    {r, sigma, alpha}:
    {r: number, sigma: string, alpha: number}): string
{

    const lineBuilder = new Curve3D()

    if (sigma === 'sigma_1') {
        // Particular case 1: sigma_2 = sigma_3 (revolution stress tensor around sigma_1)
        // Generate a circular segment (one quarter of a circle) sweeping an angle alfa around sigma_1
        const x = r * Math.cos(alpha)
        const rad_circle = r * Math.sin(alpha)

        for (let i = 1; i <= 180; ++i) {

            let beta = Math.PI * i / 360

            const y = rad_circle * Math.cos(beta)
            const z = rad_circle * Math.sin(beta)

            lineBuilder.addPoint(x, y, z)
        }
    }

    else if (sigma === 'sigma_3') {
        // Particular case 2: sigma_2 = sigma_1 (revolution stress tensor around sigma_3)
        // Generate a circular segment (one quarter of a circle) sweeping an angle alfa around sigma_3
        const y = r * Math.cos(alpha)
        const rad_circle = r * Math.sin(alpha)

        for (let i = 1; i <= 180; ++i) {

            let beta = Math.PI * i / 360

            const x = rad_circle * Math.cos(beta)
            const z = rad_circle * Math.sin(beta)

            lineBuilder.addPoint(x, y, z)
        }
    }

    return lineBuilder.buffer
}

/**
 * @category Mechanics
 */
export function lineSphericalCoords(
    {trend, plunge}:
    {trend: number, plunge: number}): SphericalCoords
{
    // The principal stress axes and microfault data such as stylolites can be represented by lines.
    // A line is defined by its trend and plunge angles in the geographic reference system:
    // trend = azimuth of the line in interval [0, 360), measured clockwise from the North direction
    // plunge =  vertical angle between the horizontal plane and the sigma 1 axis (positive downward), in interval [0,90]

    // (phi,theta) : spherical coordinate angles defining the unit vector in the geographic reference system: S = (X,Y,Z) = (E,N,Up)
    
    // phi : azimuthal angle in interval [0, 2 PI), measured anticlockwise from the X axis (East direction) in reference system S
    // theta: colatitude or polar angle in interval [0, PI/2], measured downward from the zenith (upward direction)

    let phi = trend2phi(trend)

    let theta = deg2rad( plunge ) + Math.PI / 2

    return new SphericalCoords({phi, theta})
}

/**
 * @category Mechanics
 */
export function trend2phi(trend: number): number {
    // Calculate the value of phi from the trend
    // trend = azimuth of the line in interval [0, 360), measured clockwise from the North direction
    // phi : azimuthal angle in interval [0, 2 PI), measured anticlockwise from the X axis (East direction) in reference system S

    // trend + phi = 5 PI / 2
    let phi = 5 * Math.PI / 2 - deg2rad( trend )

    if ( phi >= 2 * Math.PI) {
        phi -= 2 * Math.PI
    }
    return phi
}

