
/**
 * ```ts
 * const curves = []
 * curves.push( new EquipotentialCurve(), new MohrCoulombCurve(), new MohrCoulombCurve(), new IntegralCurve() )
 * ```
 * @category Types
 */
 export interface GenericCurve {
    /**
     * Return the generated curve as a GOCAD PLine string, or an empty
     * string if nothing to draw.
     * @param theta 
     * @param phi 
     */
    generate(theta: number, phi: number): string
}
