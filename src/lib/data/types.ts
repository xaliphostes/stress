import { Point3D, Vector3 } from "../types"
import { Direction, TypeOfMovement } from "../utils"

/**
 * @category Data
 */
export enum FractureStrategy {
    ANGLE,
    // Criteriun similar or equivalent to the one implemented in the Gephart & Forsyth method (1984)
    MIN_TENSOR_ROT,
    // Criteriun similar to the one implemented in the Etchecopar et al. method (1981)
    MIN_STRIATION_ANGULAR_DIF,
    DOT
}

/**
 * @category Data
 */
export type FractureParams = {
    n: Vector3, 
    pos?: Point3D, 
    strategy?: FractureStrategy, 
    weight?: number
}

/**
 * - DYNAMIC is related to forces (or stresses)
 * - KINEMATIC is related to displacement field
 * @category Data
 */
export enum StriatedPlaneProblemType {
    DYNAMIC,
    KINEMATIC
}

// export type Line = string

export type Tokens = string[]

// export type DataArguments = Tokens[]

export type Plane = {
    strike: number,
    dip: number,
    dipDirection: Direction
}
export function createPlane(): Plane {
    return {
        strike: 0,
        dip: 0,
        dipDirection: Direction.UND
    }
}

export type Striation = {
    rake: number,
    strikeDirection: Direction,
    trendIsDefined: boolean
    trend: number,
    typeOfMovement: TypeOfMovement
}

export function createStriation(): Striation {
    return {
        rake: 0,
        strikeDirection: Direction.UND,
        trendIsDefined: false,
        trend: 0,
        typeOfMovement: TypeOfMovement.UND
    }
}

export type Line = {
    trend: number,
    plunge: number
}

export type RuptureFrictionAngles = {
    isDefined: boolean,
    angleMin: number,
    angleMax: number
}
export function createRuptureFrictionAngles(): RuptureFrictionAngles {
    return {
        isDefined: false,
        angleMin: 0,
        angleMax: 0
    }
}

/**
 * 
 */
export type Sigma1_nPlaneAngle = RuptureFrictionAngles
export function createSigma1_nPlaneAngle() {
    return createRuptureFrictionAngles()
}

// Seismological data file

export type NodalPlane = {
    strike: number,
    dip: number,
    rake: number
}
export function createNodalPlane(): NodalPlane {
    return {
        strike: 0,
        dip: 0,
        rake: 0
    }
}
