import {
    Matrix3x3, normalizeVector, scalarProductUnitVectors,
    Vector3, add_Vectors, constant_x_Vector,
    properRotationTensor, rotationTensor_Sa_Sb, normalizedCrossProduct,
    crossProduct, vectorMagnitude, scalarProduct, tensor_x_Vector,
    multiplyTensors, transposeTensor, minRotAngleRotationTensor, newMatrix3x3
} from "../types"
import { Data } from "./Data"
import { FaultHelper } from "../utils/FaultHelper"
import { 
    Tokens, FractureStrategy, StriatedPlaneProblemType, 
    createPlane, createRuptureFrictionAngles, 
    createSigma1_nPlaneAngle, createStriation
} from "./types"
import { HypotheticalSolutionTensorParameters } from "../geomeca"
import { DataArgument, DataStatus, createDataArgument, createDataStatus } from "./DataDescription"
import { isDefined, toInt } from "../utils"
import { DataFactory } from "./Factory"
import { readFrictionAngleInterval, readSigma1nPlaneInterval, readStriatedFaultPlane } from "../io/DataReader"


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

    Let Sm be the principal reference system for the stress tensor (Sigma 1, Sigma 3, Sigma 2)m obtained from the neoformed striated plane
        i.e., the three stress axes satisfy the previous hypotheses.
 
 Several data sets defining neoformed striated planes are considered:
 1) Case 1: The optional parameters concerning the friction angle interval or the <Sigma 1,n> angular interval are not specified
        In such case, the location of the striated plane in the Mohr Circle is not constrained and includes all the left quadrant of the Circle.
        In other words, angle <Sigma 1,n> is in interval [PI/4,PI/2)

 2) Case 2: The minimum and/or maximum friction angle phi are defined in interval [0, P1/2)
        The angle <Sigma 1,n> can de readily calculated from the friction angle using relation:
            <Sigma 1,n> = PI/4 + phi/2

 3) Case 3: The minimum and/or maximum <Sigma 1,n> angular interval are defined
 
 The geometry and kinematics of the Neoformed striated plane are defined:
    a) Each plane is defined by a set of 3 parameters, as follows:
        Fault strike: clockwise angle measured from the North direction [0, 360)
        Fault dip: [0, 90]
        Dip direction: (N, E, S, W) or a combination of two directions (NE, SE, SW, NW).
    b) The striation can be defined in two different ways:
        I   Rake:
            Strike direction:
        II  Striation trend:
    c) The sense of mouvement is indicated for each fault plane:
        For verification purposes, it is recommended to indicate both the dip-slip and strike-slip compoenents, when possible. 
          Dip-slip component:
              N = Normal fault, 
              I = Inverse fault or thrust
          Strike-slip component:
              RL = Right-Lateral fault
              LL = Left-Lateral fault
          Undefined (the most compatible type of movement is selected **): 
            UND
        Sense of mouvement: N, I, RL, LL, N-RL, N-LL, I-RL, I-LL, UND

 * @category Data
 */

export class NeoformedStriatedPlane extends Data {
    protected plane: boolean = false
    protected nPlane: Vector3 = undefined
    protected nStriation: Vector3 = undefined
    protected pos: Vector3 = undefined
    protected problemType = StriatedPlaneProblemType.DYNAMIC
    protected strategy = FractureStrategy.ANGLE
    protected oriented = true
    protected EPS = 1e-7
    protected nPerpStriation: Vector3
    protected nSigma1_Sm_Mean: Vector3
    protected deltaTheta1_Sm = 0
    protected Mrot = [newMatrix3x3(), newMatrix3x3(), newMatrix3x3()]
    protected noPlane = 0

    protected nSigma1_Sm: Vector3
    protected nSigma2_Sm: Vector3
    protected nSigma3_Sm: Vector3

    protected angleMean_nSigma1_Sm_nPlane: number

    // The friction angle of the neoformed striated plane is defined in interval < frictionAngleMin, frictionAngleMax > in Data file
    protected frictionAngleInterval: boolean = undefined
    protected frictionAngleMin: number = undefined
    protected frictionAngleMax: number = undefined

    // The angle < nSigma1,nPlane> is defined in interval < nSigma1_nPlane_AngleMin, nSigma1_nPlane_AngleMax > in Data file
    protected nSigma1_nPlane_AngleInterval: boolean = undefined
    protected nSigma1_nPlane_AngleMin: number = undefined
    protected nSigma1_nPlane_AngleMax: number = undefined

    /*
        // Mandatory data: 
        // 0, 1    = Data number, data type (Neoformed Striated Plane)
        // -----------------------------
        // Plane orientation : 
        // 2, 3, 4 = Strike, dip, dip direction
        // Striation : 
        // 5, 6 = Rake, strike direction
        // 7    = Striation trend (optional **)
        mandatory: [2, 3, 4],
        // Optional data:
        // 8      = Type of movement
        // 11, 12 = Deformation phase, relative weight 
        // 13, 14 = Minimum friction angle phi_min, minimum friction angle phi_max (one or both may de defined **)
        // 15, 16 = Minimum angle <Sigma 1, nPlane>, maximum angle <Sigma 1, nPlane> (one or both may de defined **)
        optional: [8, 11, 12, 15, 16]
    */

    initialize(args: Tokens[]): DataStatus {
        const toks = args[0]
        let result = createDataStatus()
        const arg: DataArgument = createDataArgument()

        // -----------------------------------
        // Read parameters definning plane orientation, striation orientation and type of movement

        const plane = createPlane()
        const striation = createStriation()
        const ruptureFricAngle = createRuptureFrictionAngles()
        const sigma1_nPlane = createSigma1_nPlaneAngle()

        readStriatedFaultPlane(arg, plane, striation, result)

        // -----------------------------------
        // Read parameters defining the angular interval for friction of for the angle between Sigma 1 and the plane normal <Sigma 1, nPlane>
        readFrictionAngleInterval(arg, ruptureFricAngle, result)

        // -----------------------------------
        // Read parameters defining the angular interval for <Sigma 1, nPlane> of the point associated with the fault plane in the Mohr Circle (Sigma_1, Sigma_3)/

        if (!this.frictionAngleInterval) {
            readSigma1nPlaneInterval(arg, sigma1_nPlane, result)
        }
        else if (isDefined(toks[15]) || isDefined(toks[16])) {
            result.status = false
            result.messages.push(`Data number ${toks[0]}, columns 13 to 16: parameter for ${DataFactory.name(this)}, define either friction angles (cols 13 and 14) or <Sigma 1, nPlane> angles (cols 15 and 15), but not both`)
        }

        // -----------------------------------

        // Check that nPlane and nStriation are unit vectors
        const f = FaultHelper.create(plane, striation)

        this.nPlane = f.normal
        this.nStriation = f.striation
        this.nPerpStriation = f.e_perp_striation
        this.noPlane = toInt(toks[0])

        // Check orthogonality
        const sp = scalarProductUnitVectors({ U: this.nPlane, V: this.nStriation })
        if (Math.abs(sp) > this.EPS) {
            throw new Error(`striation is not on the fault plane. Dot product with normal vector gives ${sp}`)
        }

        // The data definning the Neoformed Striated Plane are defined correctly
        this.plane = true   // **

        // Calculate:
        // nSigma1_Sm_Mean = unit vector Sigma 1 defined in reference system Sm, whose location in the Mohr Circle is centred around the valid angular interval.
        // deltaTheta1_Sm = angle between nSigma1_Sm_Mean and the stress axis located at the boundaries of the Mohr circle angular interval.
        this.nSigma1_Sm_Mean_deltaTheta1_Sm_MohrCircle()

        // Calculate three rotation tensors from the geographic reference system to the micro/meso structure reference system (i.e., from S to Sm).
        // Reference systems Sm are associated with three significant points in the Mohr-Circle angular interval linked to the micro/meso structure :
        //      Points are located at the minimum, intermediate and maximum angle relative to Sigma_1_Sm
        this.rotationTensors_S2Sm_Mrot()

        return result
    }

    check({ displ, strain, stress }: { displ: Vector3, strain: Matrix3x3, stress: Matrix3x3 }): boolean {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            return stress !== undefined
        }
        return displ !== undefined
    }

    cost({ displ, strain, stress }: { displ: Vector3, strain: HypotheticalSolutionTensorParameters, stress: HypotheticalSolutionTensorParameters }): number {
        if (this.problemType === StriatedPlaneProblemType.DYNAMIC) {
            // We define 3 orthonormal right-handed reference systems:
            //      S =  (X, Y, Z ) is the geographic reference frame oriented in (East, North, Up) directions.
            //      Sm = (Xm,Ym,Zm) is the principal stress reference frame parallel to the stress axes, 
            //              defined in terms of the micro/meso structure, e.g., the neoformed striated plane (sigma1_Sm, sigma3_Sm, sigma2_Sm);
            //      Sh = (Xh,Yh,Zh) is the principal stress reference frame parallel to the stress axes, 
            //              defined from the hypothetical stress tensor solution, e.g., from grid search or Montecarlo (sigma1_Sh, sigma3_Sh, sigma2_Sh);

            // Sh is defined by Sr or Sw reference systems:
            //      Sr  =  (Xr, Yr, Zr ) is the principal reference frame chosen by the user in the interactive search phase ('r' stands for 'rough' solution).
            //      Sw =  (Xw, Yw, Zw ) is the principal reference frame for a fixed node in the search grid (sigma_1, sigma_3, sigma_2) ('w' stands for 'winning' solution)

            // The cost method implements two rotation tensors termed Mrot[i] and Hrot, defined in terms of reference frames Sm and Sh:

            // Mrot[i] is is the transformation matrix between S and Sm ('M' stands for micro/meso structure), such that:
            //      Vm = Mrot[i]  V      where V and Vm are corresponding vectors in S and Sm
            //      V  = MTrot[i] Vm       (MTrot is tensor Mrot transposed)
            // Mrot[i] is calculated only once, when initializing the neoformed striated plane **

            // Hrot is is the transformation matrix between S and Sh ('H' sand 'h' stand for 'hypothetical' solution), such that:
            //      Vh = Hrot[i]  V      where V and Vh are corresponding vectors in S and Sh
            //      V  = HTrot[i] Vh     (HTrot is tensor Hrot transposed)

            // Hrot is is defined either by Rrot or by Wrot, depending on the calling functions:
            //      Hrot = Rrot in the interactive search phase using integral curves
            //      Hrot = Wrot in the inverse method search phase using Montecarlo (for example)

            // Rotation tensors Rrot and RTrot between systems S and Sr are such that:
            //      Vr = Rrot  V
            //      V  = RTrot Vr        (RTrot is tensor Rrot transposed)

            // Rotation tensors Wrot and WTrot between systems S and Sw satisfy : WTrot = RTrot DTrot, such that:
            //      Vw = Wrot  V
            //      V  = WTrot Vw        (WTrot is tensor Wrot transposed)

            let Omega: number
            let nOmega: Vector3

            if (this.plane) {   // **
                // The neoformed striated plane is defined correctly (c.f. initialize method)

                // nSigma1_Sh, nSigma2_Sh, nSigma3_Sh = Unit vectors parallel to principal stress axes in hypothetical reference system Sh
                const nSigma1_Sh = stress.S1_X
                const nSigma2_Sh = stress.S2_Z

                // nSigma2_Sh_X_nSigma2_Sm = rotation axis between the stress axes nSigma2_Sh and nSigma2_Sm defined by the cross product of two unit vectors
                let nSigma2_Sh_X_nSigma2_Sm = crossProduct({ U: nSigma2_Sh, V: this.nSigma2_Sm })
                // The magnitude of two unit vectors is sin(Omega), where Omega is the angle between the unit vectors 
                let Mag_nSigma2_Sh_X_nSigma2_Sm = vectorMagnitude(nSigma2_Sh_X_nSigma2_Sm)

                let nSigma1_Sh_Rot: Vector3 = undefined
                if (Mag_nSigma2_Sh_X_nSigma2_Sm > this.EPS) {
                    // unit vectors nSigma2_Sh and nSigma2_Sm are not parallel (i.e., the stress axes are not aligned)
                    // nOmega = unitary rotation axis 
                    nOmega = normalizeVector(nSigma2_Sh_X_nSigma2_Sm, Mag_nSigma2_Sh_X_nSigma2_Sm)

                    // Omega = Positive (anticlockwise) rotation angle between vectors nSigma2_Sh and nSigma2_Sm - in interval (0,PI)
                    // Note that acos(x) gives an angle in interval [0,PI]
                    Omega = Math.acos(scalarProduct({ U: nSigma2_Sh, V: this.nSigma2_Sm }))

                    let Prot: Matrix3x3 = undefined
                    if (Omega <= Math.PI / 2) {
                        // Omega is the minimum rotation angle such that stress axis nSigma2_Sh is transformed into nSigma2_Sm:

                        // Calculate the proper rotation matrix Prot such that :
                        //      nSigma2_Sm = Prot nSigma2_Sh 
                        Prot = properRotationTensor({ nRot: nOmega, angle: Omega })

                    } else {
                        // Omega is in interval (PI / 2, PI). In this situation:
                        //      The minimum rotation is given by the complementary angle : PI - Omega
                        //      The axis of rotation is : - nOmega
                        // Note that, for an arbitrary axis (e.g., nSigma1_Sh), a rotation of Omega around axis nOmega 
                        //      is not equivalent to a rotation (PI - Omega() around axis (- nOmega)

                        // Calculate the proper rotation matrix PR such that :
                        //      Prot nSigma2_Sh = - nSigma2_Sm
                        Prot = properRotationTensor({ nRot: constant_x_Vector({ k: -1, V: nOmega }), angle: Math.PI - Omega })
                    }
                    // nSigma1_Sh_Rot = image of hypothetical stress axis nSigma1_Sh obtained from proper rotation matrix
                    //          nSigma1_Sh_Rot is in the plane of mouvement ot the neoformed striated plane
                    nSigma1_Sh_Rot = tensor_x_Vector({ T: Prot, V: nSigma1_Sh })

                } else {
                    // unit vectors nSigma2_Sh and nSigma2_Sm are aligned; thus the rotation angle is zero
                    Omega = 0
                    nSigma1_Sh_Rot = nSigma1_Sh
                }

                // Calculate if nSigma1_Sh_Rot is located in the valid Mohr-Circle angular interval
                // sigma1_Sm_Mean = Mean orientation of unit vector nSigma1_Sm corresponding to a point centred in the valid Mohr-Circle angular interval.
                //      This value is calculated in method nSigma1_Sm_Mean_deltaTheta1_Sm_MohrCircle
                // sigma1_Sm_Mean . nSigma1_Sh_Rot = cos(alpha) where alpha = minimum angle between the two stress axes
                //      Note that if the scalar product is negative (e.g. PI/2 < alpha <= PI ) then the minimum angle is given by PI - alpha
                //      This situation is considered by taking the absolute value of the scalar product:
                const angle_nSigma1_Sm_Mean_nSigma1_Sh_Rot = Math.acos(Math.abs(scalarProduct({ U: this.nSigma1_Sm_Mean, V: nSigma1_Sh_Rot })))

                if (angle_nSigma1_Sm_Mean_nSigma1_Sh_Rot <= this.deltaTheta1_Sm) {
                    // The stress axis nSigma1_Sh_Rot is located within the Mohr Circle angular interval
                    //      deltaTheta1_Sm = angle between sigma1_Sm_Mean and the stress axis located at the boundaries of the Mohr circle angular interval.
                    // Thus, the minimum rotation angle Omega defines the misfit between the hypothetical stress tensor (sigma1_Sh, sigma3_Sh, sigma2_Sh)
                    //      and a stress tensor (sigma1_Sm, sigma3_Sm, sigma2_Sm) consistent with the micro/meso structure kinematics (e.g., the neoformed striated plane)
                    return Omega

                } else {
                    // The stress axis nSigma1_Sh_Rot is NOT located at an angle within the valid Mohr Circle Angular Interval (MCAI):
                    //       [nSigma1_Sm_Mean - deltaTheta1_Sm, nSigma1_Sm_Mean + deltaTheta1_Sm]
                    // Thus we shall examine 3 points of the Mohr Circle angular interval, in order to determine the minimum rotation 
                    //      between principal stress axes (sigma1_Sh, sigma3_Sh, sigma2_Sh) and (sigma1_Sm, sigma3_Sm, sigma2_Sm)

                    const OmegaMC = [0, 0, 0]
                    const MrotHTrot = [newMatrix3x3(), newMatrix3x3(), newMatrix3x3()]
                    for (let i = 0; i < 3; i++) {
                        // The cost function for a micro/meso structure is defined as the minimum angular rotation between reference systems Sh and Sm(i(), where:
                        //      Sh is defined according to the hypothetical stress tensor solution ('h' stands for hypothetical);
                        //      Sm(i) is defined according to the micro/meso structure stress tensors Mrot[i] ('m' an 'M' stand for micro/meso structure).

                        // The rotation tensor MrotHTrot between systems Sh and Sm is such that: Vm = MrotHTrot Vh (where Vh is defined in Sr or Sw), 
                        //      where MrotHTrot = Mrot . HTrot (HTrot = Hrot transposed):
                        MrotHTrot[i] = multiplyTensors({ A: this.Mrot[i], B: transposeTensor(stress.Hrot) })

                        // The angle of rotation associated to tensor MrotHTrot is defined by the trace tr(MrotHTrot), according to the relation:
                        //      tr(MrotHTrot) = 1 + 2 cos(theta)
                        // 4 possible right-handed reference systems are considered for MrotHTrot in order to calculate the minimum rotation angle
                        OmegaMC[i] = minRotAngleRotationTensor(MrotHTrot[i])
                    }

                    // Calculate the minimum rotation angle between reference systems Sh and Sm(i) (i = 0,1,2 )
                    const misfit = Math.min(...OmegaMC)
                    if (misfit === OmegaMC[1]) {
                        throw new Error('The minimum rotation angle for neoformed striated plane ' + this.noPlane + ' corresponds to the middle point in the Mohr circle'
                            + ' Thus the rotation angle is not a simple monotonic function!')
                    }
                }
            }
        }
    }

    protected nSigma1_Sm_Mean_deltaTheta1_Sm_MohrCircle() {
        // This method calculates vector sigma1_Sm_Mean and deltaTheta1_Sm such that:
        //      nSigma1_Sm_Mean = unit vector Sigma 1 defined in reference system Sm, whose location in the Mohr Circle is centred in the valid angular interval.
        //      deltaTheta1_Sm = angle between sigma1_Sm_Mean and the stress axis located at the boundaries of the Mohr circle angular interval.

        if (this.nSigma1_nPlane_AngleInterval) {
            // Case 3: The  <Sigma 1,n> angular interval is defined:
            //  The angle between nSigma1_Sm and the normal to the fault plane is constrained within interval [nSigma1_nPlane_AngleMin, nSigma1_nPlane_AngleMax]
            this.angleMean_nSigma1_Sm_nPlane = (this.nSigma1_nPlane_AngleMin + this.nSigma1_nPlane_AngleMax) / 2
            this.deltaTheta1_Sm = (this.nSigma1_nPlane_AngleMax - this.nSigma1_nPlane_AngleMin) / 2

        } else if (this.frictionAngleInterval) {
            // A specific friction angle interval is defined for the neoformed striated plane. Thus, 
            // Case 2: The friction angle phi is defined in interval [frictionAngleMin, frictionAngleMax]. Both friction angles belong to interval [0,PI/2)
            //      The angle <Sigma 1,n> can de readily calculated from the friction angle using relation:
            //      <Sigma 1,n> = PI/4 + phi/2
            this.angleMean_nSigma1_Sm_nPlane = (Math.PI + this.frictionAngleMin + this.frictionAngleMax) / 4
            this.deltaTheta1_Sm = (this.frictionAngleMax - this.frictionAngleMin) / 4

        } else {
            // Case 1: The optional parameters concerning the friction angle interval or the <Sigma 1,n> angular interval are not specified
            // In such case, the location of the striated plane in the Mohr Circle is not constrained and includes all the left quadrant of the Circle.
            // In other words, angle <Sigma 1,n> is in interval [PI/4,PI/2)
            this.angleMean_nSigma1_Sm_nPlane = 3 * Math.PI / 8       // 67.5°
            this.deltaTheta1_Sm = Math.PI / 8                       // 22.5°
        }
        // nSigma1_Sm_Mean is in the extensional quadrant of the plane of movement, and is define by:
        //      nSigma1_Sm_Mean = cos(angleMean_nSigma1_Sm_nPlane) nPlane - sin(angleMean_nSigma1_Sm_nPlane) nStriation
        this.nSigma1_Sm_Mean = add_Vectors({
            U: constant_x_Vector({ k: Math.cos(this.angleMean_nSigma1_Sm_nPlane), V: this.nPlane }),
            V: constant_x_Vector({ k: - Math.sin(this.angleMean_nSigma1_Sm_nPlane), V: this.nStriation })
        })
    }

    protected rotationTensors_S2Sm_Mrot() {
        // This method calculates the 3 rotation matrixes Mrot[i] between the geographic reference system S = (X, Y, Z)
        // and the reference systems Sm = (Xm, Ym, Zm) associated to the micro/meso structure (e.g., neoformed striated plane, such that:
        //      Vm = Mrot[i] . V        where V and Vm are corresponding vectors in reference systems S and Sm
        // Sm is defined according to index i (1, 2, and 3), which represents a specific point in the Mohr-Circle angular interval.

        // Calculate the unit vector parellel to Sigma2_Sm, which is perpendicular to nPlane and nStriation:
        this.nSigma2_Sm = normalizedCrossProduct({ U: this.nPlane, V: this.nStriation })

        // Firstly, we calculate the angles defining 3 points of the valid Mohr Circle angular interval (MCAI):
        // angle_nPlane_nSigma1_Sm[i] = angle between the normal to the plane and the stress axis sigma1_Sm for 3 points located in the MCAI:
        let angle_nPlane_nSigma1_Sm = []
        // Minimum angle in the interval
        angle_nPlane_nSigma1_Sm[0] = this.angleMean_nSigma1_Sm_nPlane - this.deltaTheta1_Sm
        // Middle point
        angle_nPlane_nSigma1_Sm[1] = this.angleMean_nSigma1_Sm_nPlane
        // Maximum angle in the interval
        angle_nPlane_nSigma1_Sm[2] = this.angleMean_nSigma1_Sm_nPlane + this.deltaTheta1_Sm

        for (let i = 0; i < 3; i++) {
            // Loop for calculating the transformation matrixes Mrot[i]
            // sigma1_Sm is defined in the plane of movement (dilatant quadrant) in terms of angle angle_nPlane_nSigma1_Sm[i]
            this.nSigma1_Sm = add_Vectors({
                U: constant_x_Vector({ k: Math.cos(angle_nPlane_nSigma1_Sm[i]), V: this.nPlane }),
                V: constant_x_Vector({ k: - Math.sin(angle_nPlane_nSigma1_Sm[i]), V: this.nStriation })
            })
            // The micro/meso structure stress tensor  (sigma1_Sm, sigma3_Sm, sigma2_Sm) is right handed: 
            this.nSigma3_Sm = crossProduct({ U: this.nSigma2_Sm, V: this.nSigma1_Sm })

            // Mrot[i] = rotation matrixes for the micro/meso structure reference systems (sigma1_Sm, sigma3_Sm, sigma2_Sm) corresponding to the 3 points in the
            //          Mohr-Circle angular interval. The micro/meso structure is defined according to the data type (i.e., the neoformed striated plane):
            //      Vm = Mrot[i] . V
            // where V and Vm are corresponding vectors in reference systems S and Sm

            // Mrot[i] is an array containing 3x3 matrices
            this.Mrot[i] = rotationTensor_Sa_Sb({ Xb: this.nSigma1_Sm, Yb: this.nSigma3_Sm, Zb: this.nSigma2_Sm })
        }
    }
}
