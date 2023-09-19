
/**
 * @example
 * ```ts
 * const ok1 = isNumber(12.2)
 * const ok2 = isNumber("toto")
 * ```
 */
export const isNumber = (a: any): boolean => {
    const n1 = Number.parseFloat(a)
    const n2 = Number.parseInt(a)
    return !Number.isNaN(n1) || !Number.isNaN(n2)
}

export const isDefined = (a: string | number): boolean => {
    if (typeof a === 'string' && a.length !==0) {
        return true
    }
    return isNumber(a)
} 

export const toInt = (a: any): number => Number.parseInt(a)

export const toFloat = (a: any): number => Number.parseFloat(a)