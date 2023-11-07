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
    setSampling(n: number): void
    x(): number[]
    y(): number[] | undefined
    z(): number[] | undefined
    xAxis(): Axis
    yAxis(): Axis
    zAxis(): Axis
}



/**
 * @category Utils
 */
export function hasOwn(instance: any, variable: string): boolean {
    type ObjectKey = keyof typeof instance
    const myVar = variable as ObjectKey
    return myVar !== undefined
}
