import { Matrix3x3 }
    from "../types/math"
import { angularDifStriations, faultStressComponents } from "../types/mechanics"

const epsilon = 1e-7

export class AngularDeviation_FrictionLaw_1 /*extends MisfitCriteriun*/ {
    private cohesionRock_ = 0
    private frictionAngleRock_ = 0
    private frictionDataWeight_ = 1

    set cohesionRock(c: number) {
        this.cohesionRock_ = c
    }
    set frictionAngleRock(c: number) {
        this.frictionAngleRock_ = frictionAngleRock_
    }

    value(stressTensorDelta: Matrix3x3): number {
        // For each striated fault the misfit distance is defined by the sum of 2 terms:

        // 1) The angular difference between measured and calculated striation

        // 2) The weighted angular difference between the friction angle of the fault plane and the rock friction angle,
        //          for fault planes located below the friction line.
        //
        //      misfitDistance[i] = angularDifStriae[i] + frictionDataWeight_ * deltaFrictionAngle[i]

        // The normal stress is calculated by shifting the origin of the normalized Mohr circle, such that the Mohr Coulomb law
        // (defined by the cohesion and friction angle) passes by the new origin
        // This condition allows to calculate friction angles for the total stress vectors that can be directly compared with the rock friction angle
        // Moreover, this condition is consistent with a residual friction law for shear faulting

        let misfitDistance: number[] = []
        let angularDifStriae: number[] = []
        let deltaFrictionAngle: number[] = []
        let frictionAngleFaultPlane: number
        let deltaNormalStress: number

        if (this.frictionAngleRock_ > epsilon) {
            // deltaNormalStress = Shift of the normalized Mohr circle along the normal stress axis
            //      such that the friction line intersects the origin of the plane (normal stress, shear stress)
            deltaNormalStress = this.cohesionRock_ / Math.tan(this.frictionAngleRock_)
        } else {
            // A positive friction angle has to be defined prior to stress tensor inversion
            throw ('For friction analysis choose frictionAngleRock > 0 ')
        }

        for (let i = 0; i < this.faultSet.length; i++) {
            // For each striated fault in the data set
            const fault = this.faultSet[i]

            // The misfit criteriun is defined by the sum of 2 terms: 

            // 1) The angular difference between measured and calculated striation

            // Calculate shear and normal stress parameters
            let { shearStress, normalStress, shearStressMag } = faultStressComponents({ stressTensor: stressTensorDelta, normal: fault.normal })

            if (shearStressMag > epsilon) {
                // Calculate the angular difference between measured and calculated striae
                angularDifStriae[i] = angularDifStriations({ e_striation: fault.striation, shearStress: shearStress, shearStressMag: shearStressMag }) // ***
            } else {
                // The fault plane is sub-perpendicular to a principal stress axis. Thus, the fault plane should not be sheared.
                // Moreover, the striation could have any direction.
                // These planes should be eliminated from the solution set by imposing a large angular difference (e.g., Pi/2)
                angularDifStriae[i] = Math.PI / 2
            }

            // 2) The weighted angular difference between the friction angle of the fault plane and the rock friction angle,
            //          for fault planes located below the friction line.

            // In principle, principal stresses are negative: (sigma 1, sigma 2, sigma 3) = (-1, -R, 0) - continuum mechanics sign convention
            // Thus, the applied normal stress is also negative.

            // The normalized Mohr circle is shifted such that the friction line intersects the origin of the plane (normal stress, shear stress)
            // Stress_Sigma_n_Mag =  magnitude of the normal stress shifted accordingly by adding (deltaNormalStress) (compression > 0)
            let Stress_Sigma_n_Mag = - normalStress + deltaNormalStress

            if (Stress_Sigma_n_Mag > epsilon) {
                // frictionAngleFaultPlane = angle between the shifted stress vector and the fault normal
                // This angle is equivalent to the angle between the stress vector and the Sigma_n axis in the Mohr-Coulomb plane
                frictionAngleFaultPlane = Math.atan(shearStressMag / Stress_Sigma_n_Mag)

                if (frictionAngleFaultPlane >= this.frictionAngleRock_) {
                    // The stress vector is satisfies the friction law (i.e., it is located along or above the friction line)
                    deltaFrictionAngle[i] = 0
                } else {
                    // The stress vector is below the friction law for the rocks (i.e., it does not satisfy the frctional constraint)
                    deltaFrictionAngle[i] = this.frictionAngleRock_ - frictionAngleFaultPlane
                }
            } else {
                // The plane is sub-perpendicular to Sigma_3 (the shear stress = 0) and  Stress_Sigma_n_Mag = 0 (cohesion is zero)
                // Thus, the frictional misfit component is maximal
                deltaFrictionAngle[i] = this.frictionAngleRock_
            }

            // misfitDistance = the sum of the anglular difference between measured and calculated striae 
            //                  and the weighted frictional misfit angle
            misfitDistance[i] = angularDifStriae[i] + this.frictionDataWeight_ * deltaFrictionAngle[i]
        }

        return misfitDistance.sort().slice(0, this.maxNbFault).reduce((prev, cur) => prev + cur, 0)
    }
}
