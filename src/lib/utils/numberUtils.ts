
/**
 * @example
 * ```ts
 * const ok1 = isNumber(12.2)
 * const ok2 = isNumber("toto")
 * ```
 */
export const isNumber = (a: any): boolean => ! Number.isNaN(a)

export const isDefined = (a: any): boolean => a !== undefined

export const toInt = (a: any): number => parseInt(a)

export const toFloat = (a: any): number => parseFloat(a)