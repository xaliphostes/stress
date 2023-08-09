import { Matrix3x3, Vector3 } from "../types"
import { FractureStrategy, StriatedPlaneProblemType } from "./types"
import { ConjugateFaults } from "./ConjugateFaults"
import { ConjugatePlanesHelper, getDirectionFromString, getTypeOfMovementFromString } from "../utils"
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

 Conjugate dilatant shear bands are defined in the input file in TWO CONSECUTIVE LINES.
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

    @note For stress tensor calculation, conjugate dilatant shear bands are equivalent to conjugate faults:
    They are neoformed structures resulting from inelastic deformation combining dilation and shear (i.e. the frictional/cohesive yield surface)
    They are located in the left (extensional) half of the Mohr-Circle <Sigma 3, Sigma 1>
    The initialize, check and cost methods are inherited from Conjugate Faults

    @category Data
 */
export class ConjugateDilatantShearBands extends ConjugateFaults {
}
