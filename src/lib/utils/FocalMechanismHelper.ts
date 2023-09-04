



// Each focal mechanism comprises information concerning the geometry, the stress parameters and the kinematic parameters:

import { NodalPlane } from "../data";

/**
 * A focal mechanism is represented by a plane, this with a normal and a position.
 * 
 * Usage:
 * ```ts
 * const f = new Fault({strike: 30, dipDirection: Direction.E, dip: 60})
 * f.setStriation({rake: 20, strikeDirection: Direction.N, typeMov: 'LL'})
 * ```
 */
export class FocalMechanismHelper {
    // static create(nodalPlane: NodalPlane) {
    //     const f = new FocalMechanismHelper({
    //         strike: nodalPlane.strike, 
    //         dip: nodalPlane.dip,
    //         rake: nodalPlane.rake
    //     })
}
