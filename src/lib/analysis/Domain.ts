/**
 * @category Domain
 */
export type Bounds = [number, number]

/**
 * @category Domain
 */
export type Axis = {
    bounds: Bounds,
    name: string
}

/**
 * @category Domain
 */
export interface Domain {
    run(): number[]
    x(): number[]
    y(): number[] | undefined
    z(): number[] | undefined
}

/**
 * @category Utils
 */
export function hasOwn(instance: any, variable: string): boolean {
    type ObjectKey = keyof typeof instance
    const myVar = variable as ObjectKey
    return myVar !== undefined
}
