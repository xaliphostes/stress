import { Matrix3x3, normalizeVector, scalarProductUnitVectors, Vector3 } from "../types"
import { Data, DataParameters } from "./Data"
import { faultStressComponents } from "../types/mechanics"
import { Fault, Direction, SensOfMovement } from "../utils/Fault"
import { FractureStrategy } from "./types"

/**
 * - DYNAMIC is related to forces (or stresses)
 * - KINEMATIC is related to displacement field
 * @category Data
 */
export enum StriatedPlaneProblemType {
    DYNAMIC,
    KINEMATIC
}

/**
 * Neoformed striated plane: 
 The plane of movement of a neoformed striated plane is defined by two perpendicular vectors:
    The normal to the plane and the striation.

Neoformed striated planes are defined in the input file as a striated plane.
    Optional parameters concerning the friction angle interval or the <Sigma 1,n> angular interval may be specified.

 We make the following hypotheses concerning principal stress orientations: 
    a) The compressional axis Sigma 1 is located in the plane of movement:
        Its direction is inside the extensional quadrant and may be constrained by optional parameters (friction,  <Sigma 1,n>)
    b) The extensional axis Sigma 3 is located in the plane of movement:
        Its direction is inside the compressional quadrant and may be constrained by optional parameters (friction,  <Sigma 1,n>)
    c) The intermediate axis Sigma 2 is located in the fault plane and is perpendicular to the striation.

    Let Snsp be the principal reference system for the stress tensor (Sigma 1, Sigma 3, Sigma 2)nsp obtained from the neoformed striated plane
        i.e., the three stress axes satisfy the previous hypotheses.
 
 Several data sets defining neoformed striated planes are considered:
 1) Case 1: The optional parameters concerning the friction angle interval or the <Sigma 1,n> angular interval are not specified
        In such case, the location of the striated plane in the Mohr Circle is not constrained and includes all the left quadrant of the Circle.
        In other words, angle <Sigma 1,n> is in interval [PI/4,PI/2)

 2) Case 2: The friction angle phi is defined in interval [0, P1/2)
        The angle <Sigma 1,n> can de readily calculated from the friction angle using relation:
            <Sigma 1,n> = PI/4 + phi/2

 3) Case 3: The  <Sigma 1,n> angular interval is defined
 
 The geometry and kinematics of the Neoformed striated plane are defined:
    a) Each plane is defined by a set of 3 parameters, as follows:
        Fault strike: clockwise angle measured from the North direction [0, 360)
        Fault dip: [0, 90]
        Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
    b) The sense of mouvement is indicated for each fault plane:
        For verification purposes, it is recommended to indicate both the dip-slip and strike-slip compoenents, when possible. 
          Dip-slip component:
              N = Normal fault, 
              I = Inverse fault or thrust
          Strike-slip componenet:
              RL = Right-Lateral fault
              LL = Left-Lateral fault
        Sense of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL 

 * @category Data
 */

export class NeoformedStriatedPlaneKin extends Data {
    protected nPlane: Vector3 = undefined
    protected nStriation: Vector3 = undefined
    protected pos: Vector3 = undefined
    protected problemType = StriatedPlaneProblemType.DYNAMIC
    protected strategy = FractureStrategy.ANGLE
    protected oriented = true
    protected EPS = 1e-7
    protected nPerpStriation: Vector3

    initialize(params: DataParameters): boolean {
        if (Number.isNaN(params.azimuth)) {
            throw new Error('Missing azimuth angle for NeoformedStriatedPlaneKin')
        }

        if (Number.isNaN(params.dip)) {
            throw new Error('Missing dip angle for NeoformedStriatedPlaneKin')
        }

        if (params.dip < 90 && Number.isNaN(params.dipDirection)) {
            throw new Error('Missing dip direction for NeoformedStriatedPlaneKin')
        }

        // Check that nPlane and nStriation are unit vectors
        const { nPlane, nStriation, nPerpStriation } = Fault.create({
            strike: params.azimuth, 
            dipDirection: this.getMapDirection(params.dip_direction), 
            dip: params.dip, 
            sensOfMovement: this.getSensOfMovement(params.sens_of_movement), 
            rake: params.rake, 
            strikeDirection: this.getMapDirection(params.strike_direction)
        })
        this.nPlane = nPlane
        this.nStriation = nStriation
        this.nPerpStriation = nPerpStriation

        // Check orthogonality
        const sp = scalarProductUnitVectors({U: nPlane, V: nStriation})
        if (Math.abs(sp) >this.EPS) {
            throw new Error(`striation is not on the fault plane. Dot product gives ${sp}`)
        }

        return true
    }

    check({displ, strain, stress}:{displ: Vector3, strain: Matrix3x3, stress: Matrix3x3}): boolean {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            return stress !== undefined
        }
        return displ !== undefined
    }

    cost({displ, strain, stress}:{displ: Vector3, strain: Matrix3x3, stress: Matrix3x3}): number {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {









            // For the first implementation, use the W&B hyp.
            // let d = tensor_x_Vector({T: stress, V: this.nPlane}) // Cauchy
            // d = normalizeVector(d)

            // Calculate shear stress parameters
            // Calculate the magnitude of the shear stress vector in reference system S
            const {shearStress, normalStress, shearStressMag} = faultStressComponents({stressTensor: stress, normal: this.nPlane})
            let cosAngularDifStriae = 0

            if ( shearStressMag > 0 ) { // shearStressMag > Epsilon would be more realistic ***
                // nShearStress = unit vector parallel to the shear stress (i.e. representing the calculated striation)
                let nShearStress = normalizeVector(shearStress, shearStressMag)
                // The angular difference is calculated using the scalar product: 
                // nShearStress . nStriation = |nShearStress| |nStriation| cos(angularDifStriae) = 1 . 1 . cos(angularDifStriae)
                // cosAngularDifStriae = cos(angular difference between calculated and measured striae)
                cosAngularDifStriae = scalarProductUnitVectors({U: nShearStress, V: this.nStriation})

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
                if (this.oriented) {
                    // The sense of the striation is known
                    return Math.acos(cosAngularDifStriae)
                } else {
                    // The sense of the striation is not known. Thus, we choose the sens that minimizes the angular difference 
                    // and is more compatible with the observed striation.
                    return Math.acos(Math.abs(cosAngularDifStriae))
                }
            } else {
                // The misfit is defined by the the cosine of the angular difference between measured and calculated striae
                if (this.oriented) {
                    return 0.5 - cosAngularDifStriae / 2
                } else {
                    return 0.5 - Math.abs(cosAngularDifStriae) / 2
                }
            }
        }
        throw new Error('Kinematic not yet available')
    }

    protected getMapDirection(s: string): Direction {
        if (!mapDirection.has(s)) {
            throw new Error(`Direction ${s} is not defined (or incorrectly defined)`)
        }
        return mapDirection.get(s)
    }
    
    protected getSensOfMovement(s: string): SensOfMovement {
        if (!mapSensOfMovement.has(s)) {
            throw new Error(`Sens of movement ${s} is not defined (or incorrectly defined)`)
        }
        return mapSensOfMovement.get(s)
    }
}

// ----------------------------------------------------

const mapDirection = new Map<string, Direction>()
mapDirection.set("E", Direction.E)
mapDirection.set("N", Direction.N)
mapDirection.set("NE", Direction.NE)
mapDirection.set("NW", Direction.NW)
mapDirection.set("S", Direction.S)
mapDirection.set("SE", Direction.SE)
mapDirection.set("SW", Direction.SW)
mapDirection.set("W", Direction.W)

const mapSensOfMovement = new Map<string, SensOfMovement>()
mapSensOfMovement.set("Inverse", SensOfMovement.I)
mapSensOfMovement.set("Inverse - Left Lateral", SensOfMovement.I_LL)
mapSensOfMovement.set("Inverse - Right Lateral", SensOfMovement.I_RL)
mapSensOfMovement.set("Left Lateral", SensOfMovement.LL)
mapSensOfMovement.set("Normal", SensOfMovement.N)
mapSensOfMovement.set("Normal - Left Lateral", SensOfMovement.N_LL)
mapSensOfMovement.set("Normal - Right Lateral", SensOfMovement.N_RL)
mapSensOfMovement.set("Right Lateral", SensOfMovement.RL)
mapSensOfMovement.set("Unknown", SensOfMovement.UKN)


checkNeoformedStriatedPlane(): void {

    // const f = CompactionShearBands.create({})
    // return f.

    if (this.plane) {
        // The neoformed striated plane is defined (strike, dip and dipDirection)

            // Case 1: general case
           
            // Calculate the unit vector parellel to Sigma 2, which is perpendicular to nPlane and nPlane2:
            this.nSigma2_Sc = normalizedCrossProduct( {U: this.nPlane, V: this.this.nStriation} )








            // Calculate the two normalized stress axes (Sigma 1 and Sigma 3) that bisect the angles between the Neoformed striated plane
            // angle_nPlane1_nPlane2 in interval (0,PI)
            const angle_nPlane1_nPlane2 = Math.acos(scalarProductUnitVectors( {U: this.nPlane1, V: this.nPlane2} ))

            if (Math.abs(angle_nPlane1_nPlane2 - Math.PI / 2) > this.EPS) {

                // The Neoformed striated plane are not perpendicular to each other

                if (angle_nPlane1_nPlane2 > Math.PI / 2) {

                    // The angle between the 2 normals > PI/2:
                    // Sigma 1 and Sigma 3 are located in the plane generated by nPlane1 and nPlane2 (normal unit vectors point upward)

                    // In principle Sigma 3 bisects the acute angle (< 90°) between the Neoformed striated plane
                    // The bisecting line nSigma3_Sc is defined by the sum of normal vectors nPlane1 + nPlane2
                    this.nSigma3_Sc = add_Vectors( {U: this.nPlane1, V: this.nPlane2} )
                    // note that nSigma3_Sc is always located in the compressional quadrant of the outward hemisphere relative to each of the fault planes
                    // i.e., the scalar product nPlane1 . nSigma3_Sc > 0
                    this.nSigma3_Sc = normalizeVector(this.nSigma3_Sc)

                    // nSigma1_Sc = nSigma3_Sc x nSigma2_Sc
                    // The right-handed reference system is defined according to systems S' and S'' (sigma 1, sigma 3, sigma 2)
                    this.nSigma1_Sc = normalizedCrossProduct( {U: this.nSigma3_Sc, V: this.nSigma2_Sc} )

                } else {

                    // The angle between the 2 normals < PI/2:
                    // In principle Sigma 1 bisects the obtuse angle (> 90°) between the Neoformed striated plane 
                    // The bisecting line nSigma1_Sc is defined by the sum of normal vectors nPlane1 + nPlane2
                    this.nSigma1_Sc = add_Vectors( {U: this.nPlane1, V: this.nPlane2} )
                    this.nSigma1_Sc = normalizeVector(this.nSigma1_Sc)

                    // nSigma3_Sc = nSigma2_Sc x nSigma1_Sc
                    // The right-handed reference system is defined according to systems S' and S'' (sigma 1, sigma 3, sigma 2)
                    this.nSigma3_Sc = normalizedCrossProduct( {U: this.nSigma2_Sc, V:this.nSigma1_Sc} )
                }

                // ****** let (coordinates1.phi, coordinates1.theta) and (coordinates2.phi, coordinates2.theta) be the spherical coords
                // of conjugate plaes 1 and 2 in the geographic reference system: S = (X,Y,Z) = (E,N,Up)
                // This requires using method faultSphericalCoords in class fault
                // Check that the sense of mouvement is consistent with the orientation of stress axes***
                if (this.params1.sensOfMovement !== 'UKN') {
                    // The sense of movement is defined for compaction-shear band 1 (UKN = unknown)
                    // Check consitency of movement 
                    this.csb1.conjugatePlaneCheckMouvement({
                        noPlane: this.params1.noPlane,
                        nPlane: this.nPlane1, 
                        coordinates: this.csb1.fault.sphericalCoords,
                        nStriation: this.csb1.fault.striation, 
                        sensOfMovement: this.params1.sens_of_movement, 
                        nSigma3_Sc: this.nSigma3_Sc, 
                        nSigma2_Sc: this.nSigma2_Sc
                    })
                }
                if (this.params2.sensOfMovement !== 'UKN') {
                    // The sense of movement is defined for compaction-shear band 2
                    // Check consitency of movement
                    this.csb2.conjugatePlaneCheckMouvement({
                        noPlane: this.params2.noPlane,
                        nPlane: this.nPlane2, 
                        coordinates: this.csb2.fault.sphericalCoords,
                        nStriation: this.csb2.fault.striation, 
                        sensOfMovement: this.params2.sens_of_movement, 
                        nSigma3_Sc: this.nSigma3_Sc, 
                        nSigma2_Sc: this.nSigma2_Sc
                    })
                }

            } else {
                // The angle between the 2 normals is approximately equal to PI/2:
                // In this situation, the orientation of Sigma 1 and Sigma 3 can be permuted.
                // The sense of mouvement of at least one compaction-shear band must be known in order to define the orientation of the stress axes
                if (this.params1.sensOfMovement !== 'UKN' || this.params2.sensOfMovement !== 'UKN') {
                    // Find orientations of Sigma 1, Sigma 2 and Sigma 3, and check for consistency of mouvement if both movements are known.
                } else {
                    const msg = 'conjugate faults '+ this.params1.noPlane+ ' and '+ this.params2.noPlane+ ' are perpendicular. Please indicate type of movement for at least one plane'
                    throw new Error(msg)

                }
            }
            // We define 2 orthonormal right-handed reference systems:
            //      S =  (X, Y, Z ) is the geographic reference frame oriented in (East, North, Up) directions.
            //      Sc = (Xc,Yc,Zc) is the principal stress reference frame, parallel to the stress axes obtained form the Neoformed striated plane (sigma1_Sc, sigma3_Sc, sigma2_Sc);

            // Calculate transformation matrix Crot from reference system S to Sc, such that:
            //      Vc = Crot V
            // where V and Vc are corresponding vectors in reference systems S and Sc

            // Rotation tensor Crot is defined such that:
            // lines 1, 2, and 3 are defined by unit vectors nSigma1_Sc, nSigma3_Sc, and nSigma2_Sc, in agreement with reference system Sc = (Xc,Yc,Zc)
            this.Crot = [
                [this.nSigma1_Sc[0], this.nSigma1_Sc[1], this.nSigma1_Sc[2]],
                [this.nSigma3_Sc[0], this.nSigma3_Sc[1], this.nSigma3_Sc[2]],
                [this.nSigma2_Sc[0], this.nSigma2_Sc[1], this.nSigma2_Sc[2]]
            ] 
        } else {
            // The striations on one are both Neoformed striated plane are defined (rake, strike direction, and type of movement)
            // 

        }

    } else if (this.plane1 || this.plane2) {
        // One of the two Neoformed striated plane is defined while the other is not
        // In principle the second plane can be calculated using the striation of the first plane and a line passing by the second plane
        // However, this case is rather unusual.
    } else {
        // The two Neoformed striated plane are not defined
        throw new Error('conjugate faults '+ this.params1.noPlane + ' and ' + this.params2.noPlane + ' are not defined (strike, dip and dip direction')
    }
}

cost({ displ, strain, stress, Mrot }:
    { displ?: Vector3, strain?: Matrix3x3, stress?: Matrix3x3, Mrot?: Matrix3x3 }): number
{
    if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
        // The cost function uses the rotation tensor Crot from reference system S to Sc, calculated in method checkCompactionShearBands

        // The cost function for two Neoformed striated plane is defined as the minimum angular rotation between system Sc and the stress tensor in system S' or S'':
        //  S   =  (X, Y, Z ) is the geographic reference frame  oriented in (East, North, Up) directions.
        //  S'  =  (X', Y', Z' ) is the principal reference frame chosen by the user in the interactive search phase.
        //  S'' =  (X'', Y'', Z'' ) is the principal reference frame for a fixed node in the search grid (sigma_1, sigma_3, sigma_2)
        // Rotation tensors Rrot and RTrot between systems S and S' are such that:

        //  V  = RTrot V'        (RTrot is tensor Rrot transposed)
        //  V' = Rrot  V

        // Rotation tensors Wrot and WTrot between systems S and S'' satisfy : WTrot = RTrot DTrot, such that:
        //  V   = WTrot V''        (WTrot is tensor Wrot transposed)
        //  V'' = Wrot  V

        // The cost method implements a rotation tensor termed Mrot which is equivalent to Rrot or Wrot depending on the calling functions:
        //      Mrot = Rrot in the interactive search phase using integral curves
        //      Mrot = Wrot in the inverse method search phase using Montecarlo (for example)

        // The rotation tensor CFrot between systems Sc and S' (or S'') is such that: Vc = CFrot . V' (or Vc = CFrot . V''), 
        // where CFrot = Crot . MTrot (MTrot = Mrot transposed):
        const CFrot = multiplyTensors({A: this.Crot, B: transposeTensor(Mrot)})
        // const CFrot = multiplyTensors({A: Crot, B: WTrot})

        // The angle of rotation associated to tensor CFrot is defined by the trace tr(CFrot), according to the relation:
        //      tr(CFrot) = 1 + 2 cos(theta)
        // 4 possible right-handed reference systems are considered for CFrot in order to calculate the minimum rotation angle

        return minRotAngleRotationTensor(CFrot)
    }
}

meanSigma1DeltaThetaNeoformedStriatedPlane{
    // This method calculates a vector sigma1MeanNsp and deltaThetaNsp such that:
    //      sigma1MeanNsp = unit vector Sigma 1 defined in reference system Snsp, whose location in the Mohr Circle is centred around the valid angular interval.
    //      deltaThetaNsp = angle between sigma1MeanNsp and the stress axis located at the boundaries of the Mohr circle angular interval.

    if (sigma1NspNplaneAngleInterval) {
        // Case 3: The  <Sigma 1,n> angular interval is defined:
        //  The angle between sigma1nsp and the normal to the fault plane is constrained within interval <sigma1_nplaneMin,sigma1_nplaneMax>
        this.sigma1_nplaneAngleMean = ( this.sigma1_nplaneAngleMin + this.sigma1_nplaneAngleMax ) / 2
        this.deltaTheta1 = ( this.sigma1_nplaneAngleMax - this.sigma1_nplaneAngleMin ) / 2
    
    } else if (frictionAngleInterval) {
        // A specific friction angle interval is defined for the neoformed striated plane. Thus, 
        // Case 2: The friction angle phi is defined in interval [0, P1/2)
        //      The angle <Sigma 1,n> can de readily calculated from the friction angle using relation:
        //   <Sigma 1,n> = PI/4 + phi/2
        this.sigma1_nplaneAngleMean = ( Math.PI + this.frictionAngleMin + this.frictionAngleMax ) / 4
        this.deltaTheta1 = ( this.frictionAngleMax - this.frictionAngleMin ) / 4
    
    } else {    
        // Case 1: The optional parameters concerning the friction angle interval or the <Sigma 1,n> angular interval are not specified
        // In such case, the location of the striated plane in the Mohr Circle is not constrained and includes all the left quadrant of the Circle.
        // In other words, angle <Sigma 1,n> is in interval [PI/4,PI/2)
        this.sigma1_nplaneAngleMean = 3 * Math.PI / 8       // 67.5°
        this.deltaTheta1 = Math.PI / 8 
    }



}








// import {
//     Matrix3x3, Point3D, scalarProductUnitVectors,
//     SphericalCoords, Vector3, add_Vectors,
//     constant_x_Vector, deg2rad, spherical2unitVectorCartesian,
//     faultStressComponents, normalizeVector, unitVectorCartesian2Spherical,
//     normalizedCrossProduct,
//     multiplyTensors
// }
//     from "../types"
// import { Data, DataParameters } from "./Data"
// import { StriatedPlaneProblemType } from "./StriatedPlane_Kin"
// import { FractureStrategy } from "./types"

// import { Fault, Direction, SensOfMovement } from "../utils/Fault"


// // import { Fracture, FractureParams, FractureStrategy } from "./Fracture"

import { add_Vectors, constant_x_Vector, Matrix3x3, multiplyTensors, newMatrix3x3, normalizedCrossProduct, normalizeVector, scalarProductUnitVectors, transposeTensor, Vector3 } from "../types"
import { Data, DataParameters } from "./Data"
// import { faultStressComponents } from "../types/mechanics"
// import { Fault, Direction, SensOfMovement } from "../utils/Fault"
import { FractureStrategy } from "./types"
import { CompactionShearBands } from "../utils/CompactionShearBands"
import { Fault, getDirectionFromString, getSensOfMovementFromString, SensOfMovement } from "../utils"
import { minRotAngleRotationTensor } from "../types/math"

/**
 * - DYNAMIC is related to forces (or stresses)
 * - KINEMATIC is related to displacement field
 * @category Data
 */
export enum StriatedPlaneProblemType {
    DYNAMIC,
    KINEMATIC
}

/** 
 Neoformed striated plane: 
 The plane of movement of a neoformed striated plane is defined by two perpendicular vectors:
    The two normal to the plane and the striation.
 We make the following hypotheses concerning principal stress orientations: 
    The compressional axis Sigma 1 is located in the plane of movement and bisects the obtuse angle (>= 90°) between Neoformed striated plane
    The extensional axis Sigma 3 is located in the plane of movement and bisects the acute angle (<= 90°) between Neoformed striated plane
    The intermedinate axis Sigma 2 is located in the fault plane and is perpendiculatr to the striation.

 Neoformed striated plane are defined in the input file as a striated plane.
    Optional parameters concerning the friction angle interval or the <Sigma 1,n> angular interval may be specified.

 Several data sets defining two Neoformed striated plane are considered:
 1) Case 1: The geometry and kinematics of the Neoformed striated plane are defined, yet the rake angles are NOT defined:
    The orientation of the principal axes are calculated from the geometry of the Neoformed striated plane.
    The intermediate axis Sigma 2 is parallel to the intersection line between the Neoformed striated plane;
    The intermediate axis Sigma 2 is perpendicular to the plane of mouvement;
    a) Each plane is defined by a set of 3 parameters, as follows:
        Fault strike: clockwise angle measured from the North direction [0, 360)
        Fault dip: [0, 90]
        Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
    b) The rake angles defining the slip vectors are NOT defined
    c) The sense of mouvement is indicated for each compaction-shear band :
        For verification purposes, it is recommended to indicate both the dip-slip and strike-slip compoenents, when possible. 
          Dip-slip component:
              N = Normal fault, 
              I = Inverse fault or thrust
          Strike-slip componenet:
              RL = Right-Lateral fault
              LL = Left-Lateral fault
        Sense of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL 
2) Case 2: The geometry, the striation (i.e., the rake), and the kinematics of one or both Neoformed striated plane are defined.
    This case is not considered as the striations define redundant information for constraining the stress tensor orientation.
    Neoformed striated plane with striations can be considered separately as neoformed striated planes for which the angle <Sigma 1,n> is known


3) Particular case:
    If the striation is known for one of the conjugate faults, then the other plane
    can be defined by one axis that is contained in the plane. 
    However, this case would require a special format in the input file, which is inconvenient...

    @category Data
 */
export class 
 extends Data {
    protected nPlane1: Vector3 = undefined
    protected nPlane2: Vector3 = undefined
    protected nStriation1: Vector3 = undefined
    protected nStriation2: Vector3 = undefined

    protected pos: Vector3 = undefined
    protected problemType = StriatedPlaneProblemType.DYNAMIC
    protected strategy = FractureStrategy.ANGLE
    protected oriented = true
    protected EPS = 1e-7
    protected nPerpStriation: Vector3

    protected plane1: Boolean = undefined
    protected plane2: Boolean = undefined

    // Principal directions of the data
    protected nSigma1_Sc: Vector3 = undefined
    protected nSigma2_Sc: Vector3 = undefined
    protected nSigma3_Sc: Vector3 = undefined
    protected Crot: Matrix3x3 = undefined

    protected csb1: any = undefined
    protected csb2: any = undefined
    protected params1: any = undefined
    protected params2: any = undefined

    protected striation1 = true
    protected striation2 = true

    //protected nSigma1_rot: Vector3 = undefined
    //protected nSigma3_rot: Vector3 = undefined

    // params1 and params2 contain data defining Neoformed striated plane 1 and 2
    // we have replaced azimuth by strike

    initialize(params: DataParameters): boolean {

        let nPlane2Neg: Vector3

        if (Number.isNaN(params.strike1)) {
            throw new Error('Missing strike angle for compaction-shear band '+ params.noPlane1)
        }

        if (Number.isNaN(params.dip1)) {
            throw new Error('Missing dip angle for compaction-shear band '+ params.noPlane1)
        }

        if (params.dip1 < 90 && params.dipDirection1 === undefined) {
            throw new Error('Missing dip direction for compaction-shear band  '+ params.noPlane1)
        }

        if (Number.isNaN(params.strike2)) {
            throw new Error('Missing strike angle for compaction-shear band  '+ params.noPlane2)
        }

        if (Number.isNaN(params.dip2)) {
            throw new Error('Missing dip angle for compaction-shear band  '+ params.noPlane2)
        }

        if (params.dip2 < 90 && params.dipDirection2 === undefined) {
            throw new Error('Missing dip direction for compaction-shear band  '+ params.noPlane2)
        }

        if (this.nPlane1 === this.nPlane2 || this.nPlane1 === constant_x_Vector({k: -1, V: this.nPlane2}) ) {
            throw new Error('The two Neoformed striated plane ' + params.noPlane1 + ' and ' + params.noPlane2 + ' are identical')
            // throw new Error('The two Neoformed striated plane ${params.noPlane1} and ${params.noPlane2} are identical')
        }

        // Check that nPlane and nStriation are unit vectors ***
        this.params1 = {
            noPlane: params.noPlane1,
            strike: params.strike1,
            dipDirection: getDirectionFromString(params.dip_direction1),
            dip: params.dip1,
            sensOfMovement: getSensOfMovementFromString(params.sens_of_movement1),
            rake: params.rake1,
            strikeDirection: getDirectionFromString(params.strike_direction1)
        }
        this.csb1 = CompactionShearBands.create(this.params1)

        // compaction-shear band 1 is defined: (strike1, dip1, dipDirection1)
        this.plane1 = true
        // Calculate the unit vector normal to plane 1: nPlane1
        this.nPlane1 = this.csb1.nPlane

        // -----------------------------------------

        this.params2 = {
            noPlane: params.noPlane2,
            strike: params.strike2,
            dipDirection: getDirectionFromString(params.dip_direction2),
            dip: params.dip2,
            sensOfMovement: getSensOfMovementFromString(params.sens_of_movement2),
            rake: params.rake2,
            strikeDirection: getDirectionFromString(params.strike_direction2)
        }
        this.csb2 = CompactionShearBands.create(this.params2)
        // compaction-shear band 1 is defined: (strike1, dip1, dipDirection1)
        this.plane2 = true
        // Calculate the unit vector normal to plane 1: nPlane1
        this.nPlane2 = this.csb2.nPlane

        /** this.nStriation = nStriation
        // this.nPerpStriation = nPerpStriation

        // Check orthogonality
        // const sp = scalarProductUnitVectors({U: nPlane, V: nStriation})
        //*if (Math.abs(sp) >this.EPS) {
            throw new Error(`striation is not on the fault plane. Dot product gives ${sp}`)
        } **/

        return true
    }

    check({ displ, strain, stress }: { displ: Vector3, strain: Matrix3x3, stress: Matrix3x3 }): boolean {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            return stress !== undefined
        }
        return displ !== undefined
    }

    checkCompactionShearBands(): void {

        // const f = CompactionShearBands.create({})
        // return f.

        if (this.plane1 && this.plane2) {
            // The first and second Neoformed striated plane are defined (strike1, dip1 and dipDirection1) and (strike2, dip2 and dipDirection2)

            if ( Number.isNaN(this.params1.rake) && Number.isNaN(this.params1.striationTrend) ) {
                this.striation1 = false
            }
            if ( Number.isNaN(this.params2.rake) && Number.isNaN(this.params2.striationTrend) ) {
                this.striation2 = false
            }

            if (!this.striation1 && !this.striation2) {
                // Case 1: general case
                // The striations are not defined for Neoformed striated plane 1 and 2

                // In principle we have already checked that the two Neoformed striated plane are different
                // Calculate the unit vector parellel to Sigma 2, which is perpendicular to nPlane1 and nPlane2:
                this.nSigma2_Sc = normalizedCrossProduct( {U: this.nPlane1, V: this.nPlane2} )

                // Calculate the two normalized stress axes (Sigma 1 and Sigma 3) that bisect the angles between the Neoformed striated plane
                // angle_nPlane1_nPlane2 in interval (0,PI)
                const angle_nPlane1_nPlane2 = Math.acos(scalarProductUnitVectors( {U: this.nPlane1, V: this.nPlane2} ))

                if (Math.abs(angle_nPlane1_nPlane2 - Math.PI / 2) > this.EPS) {

                    // The Neoformed striated plane are not perpendicular to each other

                    if (angle_nPlane1_nPlane2 > Math.PI / 2) {

                        // The angle between the 2 normals > PI/2:
                        // Sigma 1 and Sigma 3 are located in the plane generated by nPlane1 and nPlane2 (normal unit vectors point upward)

                        // In principle Sigma 3 bisects the acute angle (< 90°) between the Neoformed striated plane
                        // The bisecting line nSigma3_Sc is defined by the sum of normal vectors nPlane1 + nPlane2
                        this.nSigma3_Sc = add_Vectors( {U: this.nPlane1, V: this.nPlane2} )
                        // note that nSigma3_Sc is always located in the compressional quadrant of the outward hemisphere relative to each of the fault planes
                        // i.e., the scalar product nPlane1 . nSigma3_Sc > 0
                        this.nSigma3_Sc = normalizeVector(this.nSigma3_Sc)

                        // nSigma1_Sc = nSigma3_Sc x nSigma2_Sc
                        // The right-handed reference system is defined according to systems S' and S'' (sigma 1, sigma 3, sigma 2)
                        this.nSigma1_Sc = normalizedCrossProduct( {U: this.nSigma3_Sc, V: this.nSigma2_Sc} )

                    } else {

                        // The angle between the 2 normals < PI/2:
                        // In principle Sigma 1 bisects the obtuse angle (> 90°) between the Neoformed striated plane 
                        // The bisecting line nSigma1_Sc is defined by the sum of normal vectors nPlane1 + nPlane2
                        this.nSigma1_Sc = add_Vectors( {U: this.nPlane1, V: this.nPlane2} )
                        this.nSigma1_Sc = normalizeVector(this.nSigma1_Sc)

                        // nSigma3_Sc = nSigma2_Sc x nSigma1_Sc
                        // The right-handed reference system is defined according to systems S' and S'' (sigma 1, sigma 3, sigma 2)
                        this.nSigma3_Sc = normalizedCrossProduct( {U: this.nSigma2_Sc, V:this.nSigma1_Sc} )
                    }

                    // ****** let (coordinates1.phi, coordinates1.theta) and (coordinates2.phi, coordinates2.theta) be the spherical coords
                    // of conjugate plaes 1 and 2 in the geographic reference system: S = (X,Y,Z) = (E,N,Up)
                    // This requires using method faultSphericalCoords in class fault
                    // Check that the sense of mouvement is consistent with the orientation of stress axes***
                    if (this.params1.sensOfMovement !== 'UKN') {
                        // The sense of movement is defined for compaction-shear band 1 (UKN = unknown)
                        // Check consitency of movement 
                        this.csb1.conjugatePlaneCheckMouvement({
                            noPlane: this.params1.noPlane,
                            nPlane: this.nPlane1, 
                            coordinates: this.csb1.fault.sphericalCoords,
                            nStriation: this.csb1.fault.striation, 
                            sensOfMovement: this.params1.sens_of_movement, 
                            nSigma3_Sc: this.nSigma3_Sc, 
                            nSigma2_Sc: this.nSigma2_Sc
                        })
                    }
                    if (this.params2.sensOfMovement !== 'UKN') {
                        // The sense of movement is defined for compaction-shear band 2
                        // Check consitency of movement
                        this.csb2.conjugatePlaneCheckMouvement({
                            noPlane: this.params2.noPlane,
                            nPlane: this.nPlane2, 
                            coordinates: this.csb2.fault.sphericalCoords,
                            nStriation: this.csb2.fault.striation, 
                            sensOfMovement: this.params2.sens_of_movement, 
                            nSigma3_Sc: this.nSigma3_Sc, 
                            nSigma2_Sc: this.nSigma2_Sc
                        })
                    }

                } else {
                    // The angle between the 2 normals is approximately equal to PI/2:
                    // In this situation, the orientation of Sigma 1 and Sigma 3 can be permuted.
                    // The sense of mouvement of at least one compaction-shear band must be known in order to define the orientation of the stress axes
                    if (this.params1.sensOfMovement !== 'UKN' || this.params2.sensOfMovement !== 'UKN') {
                        // Find orientations of Sigma 1, Sigma 2 and Sigma 3, and check for consistency of mouvement if both movements are known.
                    } else {
                        const msg = 'conjugate faults '+ this.params1.noPlane+ ' and '+ this.params2.noPlane+ ' are perpendicular. Please indicate type of movement for at least one plane'
                        throw new Error(msg)

                    }
                }
                // We define 2 orthonormal right-handed reference systems:
                //      S =  (X, Y, Z ) is the geographic reference frame oriented in (East, North, Up) directions.
                //      Sc = (Xc,Yc,Zc) is the principal stress reference frame, parallel to the stress axes obtained form the Neoformed striated plane (sigma1_Sc, sigma3_Sc, sigma2_Sc);

                // Calculate transformation matrix Crot from reference system S to Sc, such that:
                //      Vc = Crot V
                // where V and Vc are corresponding vectors in reference systems S and Sc

                // Rotation tensor Crot is defined such that:
                // lines 1, 2, and 3 are defined by unit vectors nSigma1_Sc, nSigma3_Sc, and nSigma2_Sc, in agreement with reference system Sc = (Xc,Yc,Zc)
                this.Crot = [
                    [this.nSigma1_Sc[0], this.nSigma1_Sc[1], this.nSigma1_Sc[2]],
                    [this.nSigma3_Sc[0], this.nSigma3_Sc[1], this.nSigma3_Sc[2]],
                    [this.nSigma2_Sc[0], this.nSigma2_Sc[1], this.nSigma2_Sc[2]]
                ] 
            } else {
                // The striations on one are both Neoformed striated plane are defined (rake, strike direction, and type of movement)
                // 

            }

        } else if (this.plane1 || this.plane2) {
            // One of the two Neoformed striated plane is defined while the other is not
            // In principle the second plane can be calculated using the striation of the first plane and a line passing by the second plane
            // However, this case is rather unusual.
        } else {
            // The two Neoformed striated plane are not defined
            throw new Error('conjugate faults '+ this.params1.noPlane + ' and ' + this.params2.noPlane + ' are not defined (strike, dip and dip direction')
        }
    }

    
}
