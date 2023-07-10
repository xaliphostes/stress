import { NeoformedStriatedPlane } from "./NeoformedStriatedPlane"


/**
* Striated Dilatant Shear Band: 

For stress analysis, a Striated Dilatant Shear Band is equivalent to a Neoformed Striated Plane. 
The only difference relies on the type of material:
Shear bands are observed specifically in granular porous rocks such as sandstones, whereas striated faults are observed in all types of rocks.

The plane of movement of a Striated Dilatant Shear Band is defined by two perpendicular vectors:
The normal to the plane and the striation.

Striated Dilatant Shear Bands are defined in the input file as a striated plane.
Optional parameters concerning the friction angle interval or the <Sigma 1,n> angular interval may be specified.

We make the following hypotheses concerning principal stress orientations: 
a) The compressional axis Sigma 1 is located in the plane of movement:
    Its direction is inside the extensional quadrant and may be constrained by optional parameters (friction,  <Sigma 1,n>)
b) The extensional axis Sigma 3 is located in the plane of movement:
    Its direction is inside the compressional quadrant and may be constrained by optional parameters (friction,  <Sigma 1,n>)
c) The intermediate axis Sigma 2 is located in the fault plane and is perpendicular to the striation.

Let Sm be the principal reference system for the stress tensor (Sigma 1, Sigma 3, Sigma 2)m obtained from the Striated Dilatant Shear Band
    i.e., the three stress axes satisfy the previous hypotheses.

Several data sets defining Striated Dilatant Shear Bands are considered:
1) Case 1: The optional parameters concerning the friction angle interval or the <Sigma 1,n> angular interval are not specified
    In such case, the location of the striated plane in the Mohr Circle is not constrained and includes all the left quadrant of the Circle.
    In other words, angle <Sigma 1,n> is in interval [PI/4,PI/2)

2) Case 2: The minimum and/or maximum friction angle phi are defined in interval [0, P1/2)
    The angle <Sigma 1,n> can de readily calculated from the friction angle using relation:
        <Sigma 1,n> = PI/4 + phi/2

3) Case 3: The minimum and/or maximum <Sigma 1,n> angular interval are defined

The geometry and kinematics of the Striated Dilatant Shear Band are defined:
a) Each plane is defined by a set of 3 parameters, as follows:
    Fault strike: clockwise angle measured from the North direction [0, 360)
    Fault dip: [0, 90]
    Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
b) The sense of mouvement is indicated for each fault plane:
    For verification purposes, it is recommended to indicate both the dip-slip and strike-slip compoenents, when possible. 
      Dip-slip component:
          N = Normal fault, 
          I = Inverse fault or thrust
      Strike-slip component:
          RL = Right-Lateral fault
          LL = Left-Lateral fault
      Unknown (the most compatible type of movement is selected **): 
        UKN
    Sense of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL, UKN

* @category Data
*/

export class StriatedDilatantShearBand extends NeoformedStriatedPlane {
    
}
