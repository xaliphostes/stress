import { Matrix3x3, Vector3 } from "../types"
import { FractureStrategy, StriatedPlaneProblemType } from "./types"
import { ConjugateFaults } from "./ConjugateFaults"
import { ConjugatePlanesHelper, getDirectionFromString, getSensOfMovementFromString } from "../utils"
import { DataParameters } from "./DataParameters"

/** 
 Conjugate Dilatant Shear Bands: 
 
 A pair of conjugate dilatant shear bands is defined by two planes whose plane of movement is perpendicular to the intersection line between the planes.
 The plane of movement is defined by the two normal vectors to the fault planes.
 In principle, the data type corresponding to conjugate dilatant shear bands includes the type of mouvement 
    but NOT the shear displacment orientation (i.e., the striation).
 We make the following hypotheses concerning principal stress orientations: 
    The compressional axis Sigma 1 is located in the plane of movement and bisects the acute angle (<= 90°) between planes
    The extensional axis Sigma 3 is located in the plane of movement and bisects the obtuse angle (>= 90°) between planes

 conjugate dilatant shear bands are defined in the input file in TWO CONSECUTIVE LINES.
 Each line specifies all the available data for each conjugate dilatant shear band.

 Several data sets defining two conjugate dilatant shear bands are considered:
 1) Case 1: The geometry and kinematics of the conjugate dilatant shear bands are defined, yet the rake angles are NOT defined.

    The orientation of the principal axes are calculated from the geometry of the conjugate dilatant shear bands.
        The intermediate axis Sigma 2 is parallel to the intersection line between the conjugate dilatant shear bands;
        The intermediate axis Sigma 2 is perpendicular to the plane of mouvement;
    a) Each plane is defined by a set of 3 parameters, as follows:
        Fault strike: clockwise angle measured from the North direction [0, 360)
        Fault dip: [0, 90]
        Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
    b) The rake angles defining the slip vectors are NOT defined
    c) The sense of mouvement is indicated for each conjugate dilatant shear band :
        For verification purposes, it is recommended to indicate both the dip-slip and strike-slip compoenents, when possible. 
          Dip-slip component:
              N = Normal fault, 
              I = Inverse fault or thrust
          Strike-slip componenet:
              RL = Right-Lateral fault
              LL = Left-Lateral fault
        Sense of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL 
2) Case 2: The geometry, the striation (i.e., the rake), and the kinematics of one or both conjugate dilatant shear bands are defined.
        This case is not considered as the striations define redundant information for constraining the stress tensor orientation.
        conjugate dilatant shear bands with striations can be considered separately as neoformed striated planes for which the friction angle is known
3) Particular case:
    If the striation is known for one of the conjugate dilatant shear bands, then the other plane
    can be defined by one axis that is contained in the plane. 
    However, this case would require a special format in the input file, which is inconvenient...

    @category Data
 */
export class ConjugateDilatantShearBands extends ConjugateFaults {
// For stress tensor calculation, conjugate dilatant shear bands are equivalent to conjugate faults:
//      They are neoformed structures resulting from inelastic deformation combining dilation and shear (i.e. the frictional/cohesive yield surface)
//      They are located in the left (extensional) half of the Mohr-Circle <Sigma 3, Sigma 1>
// The initialize, check and cost methods are inherited from Conjugate Faults

    // protected nPlane1: Vector3 = undefined
    // protected nPlane2: Vector3 = undefined
    // protected nStriation1: Vector3 = undefined
    // protected nStriation2: Vector3 = undefined

    // protected pos: Vector3 = undefined
    // protected problemType = StriatedPlaneProblemType.DYNAMIC
    // protected strategy = FractureStrategy.ANGLE
    // protected oriented = true
    // protected EPS = 1e-7
    // protected nPerpStriation: Vector3

    // protected plane1: Boolean = undefined
    // protected plane2: Boolean = undefined

    // // Principal directions of the data
    // protected nSigma1_Sm: Vector3 = undefined
    // protected nSigma2_Sm: Vector3 = undefined
    // protected nSigma3_Sm: Vector3 = undefined
    // protected Mrot: Matrix3x3 = undefined

    // protected cf1: any = undefined
    // protected cf2: any = undefined
    // protected params1: any = undefined
    // protected params2: any = undefined

    // protected striation1 = false
    // protected striation2 = false

    //protected nSigma1_rot: Vector3 = undefined
    //protected nSigma3_rot: Vector3 = undefined

    // params1 and params2 contain data defining conjugate dilatant shear bands 1 and 2
    // we have replaced azimuth by strike

    // nbLinkedData(): number {
    //     return 2
    // }

    /*
    initialize(params: DataParameters[]): boolean {

        let nPlane2Neg: Vector3

        if (Number.isNaN(params[0].strike)) {
            throw new Error('Missing strike angle for conjugate dilatant shear band '+ params[0].noPlane)
        }

        if (Number.isNaN(params[0].dip)) {
            throw new Error('Missing dip angle for conjugate dilatant shear band ' + params[0].noPlane)
        }

        if (params[0].dip < 90 && params[0].dipDirection === undefined ) {
            throw new Error('Missing dip direction for conjugate dilatant shear band '+ params[0].noPlane)
        }

        if (Number.isNaN(params[1].strike)) {
            throw new Error('Missing strike angle for conjugate dilatant shear band '+ params[1].noPlane)
        }

        if (Number.isNaN(params[1].dip)) {
            throw new Error('Missing dip angle for conjugate dilatant shear band ' + params[1].noPlane)
        }

        if (params[1].dip < 90 && params[1].dipDirection === undefined ) {
            throw new Error('Missing dip direction for conjugate dilatant shear band '+ params[1].noPlane)
        }

        // if (this.nPlane1 === this.nPlane2 || this.nPlane1 === constant_x_Vector({k: -1, V: this.nPlane2}) ) {
        //     throw new Error('The two conjugate dilatant shear bands ' + params.noPlane1 + ' and ' + params.noPlane2 + ' are identical')
        // }

        // Check that nPlane and nStriation are unit vectors ***
        this.params1 = {
            noPlane: params[0].noPlane,
            strike: params[0].strike,
            dipDirection: getDirectionFromString(params[0].dipDirection),
            dip: params[0].dip,
            sensOfMovement: getSensOfMovementFromString(params[0].typeOfMovement),
            rake: params[0].rake,
            strikeDirection: getDirectionFromString(params[0].strikeDirection)
        }
        this.cf1 = ConjugatePlanesHelper.create(this.params1)

        // conjugate dilatant shear band 1 is defined: (strike1, dip1, dipDirection1)
        this.plane1 = true
        // Calculate the unit vector normal to plane 1: nPlane1
        this.nPlane1 = this.cf1.nPlane

        // -----------------------------------------

        this.params2 = {
            noPlane: params[1].noPlane,
            strike: params[1].strike,
            dipDirection: getDirectionFromString(params[1].dipDirection),
            dip: params[1].dip,
            sensOfMovement: getSensOfMovementFromString(params[1].typeOfMovement),
            rake: params[1].rake,
            strikeDirection: getDirectionFromString(params[1].strikeDirection)
        }
        this.cf2 = ConjugatePlanesHelper.create(this.params2)
        // conjugate dilatant shear band 1 is defined: (strike1, dip1, dipDirection1)
        this.plane2 = true
        // Calculate the unit vector normal to plane 1: nPlane1
        this.nPlane2 = this.cf2.nPlane


        /** this.nStriation = nStriation
        // this.nPerpStriation = nPerpStriation

        // Check orthogonality
        // const sp = scalarProductUnitVectors({U: nPlane, V: nStriation})
        //*if (Math.abs(sp) >this.EPS) {
            throw new Error(`striation is not on the fault plane. Dot product gives ${sp}`)
        } 

        this.checkConjugatePlanes()

        return true
    }
    */
}
