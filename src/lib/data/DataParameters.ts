import { Direction } from "readline"
import { TypeOfMovement } from "../utils"

// export type DataParameters = {
//     dataNumber?: number,
//     dataType: string,
//     strike?: number,
//     dip?: number, 
//     dipDirection?: string,
//     rake?: number, 
//     strikeDirection?: string, 
//     striationTrend?: number, 
//     typeOfMovement?: string,
//     lineTrend?: number, 
//     linePlunge?: number,
//     deformationPhase?: number, 
//     relatedWeight?: number,
//     minFrictionAngle?: number, 
//     maxFrictionAngle?: number, 
//     minAngleS1n?: number, 
//     maxAngleS1n?: number
// }

export type DataParameters = { [key: string]: any }