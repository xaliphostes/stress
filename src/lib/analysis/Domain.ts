/**
 * @category Domain
 */
export type Bounds = {
    min: number,
    max: number
}

/**
 * @category Domain
 */
export type Axis = {
    bounds: Bounds,
    name: string,
    n: number
}

/**
 * @category Domain
 */
export interface Domain {
    run(): Array<number>
}

/**
 * @category Utils
 */
export function hasOwn(instance: any, variable: string): boolean {
    type ObjectKey = keyof typeof instance
    const myVar = variable as ObjectKey
    return myVar !== undefined
}
