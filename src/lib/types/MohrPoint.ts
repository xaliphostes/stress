import { Point2D } from "./math"

/**
 * Usage:
 * ```ts
 * const p1 = {
 *      p     : [0,0],
 *      angle : deg2rad(10),
 *      circle: '3_1'
 * }
 * 
 * const p2 = {
 *      angle : deg2rad(10),
 *      p     : [0,0],
 *      circle: '3_1'
 * }
 * ```
 */
 export type MohrPoint = {
    p     : Point2D,
    angle : number,
    circle: string
}
