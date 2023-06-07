import { Matrix3x3 } from "../types/math"
import { angularDifStriations, faultStressComponents } from "../types/mechanics"
import { MisfitCriteriun } from "./MisfitCriteriun"

export class Etchecopar extends MisfitCriteriun {
    
    value(stressTensorDelta: Matrix3x3): number {
        // Angular deviation (Etchecopar et al. 1981)
        const angularDifStriae: number[] = []

        for (let i = 0; i < this.faultSet.length; i++) {

            const fault = this.faultSet[i]

            // Calculate shear stress parameters
            // Calculate the magnitude of the shear stress vector in reference system S
            const {shearStress, normalStress, shearStressMag} = faultStressComponents({stressTensor: stressTensorDelta, normal: fault.normal})
            // 
            angularDifStriae[i] = angularDifStriations({e_striation: fault.striation, shearStress, shearStressMag})
        }

        if (this.maxNbFault === undefined) {
            return angularDifStriae.reduce( (prev, cur) => prev+cur, 0 )
        }
        else {
            // The list of unisigned angular deviations is ordered increasingly (this method can be optimized using pointers in the previous for loop)
            // We only have to order the number of faults faultNumberInversion that are considered in the analysis
            return angularDifStriae.sort().slice(0, this.maxNbFault).reduce( (prev, cur) => prev+cur, 0 )
        }
    }

}