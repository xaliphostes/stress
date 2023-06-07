// import { eigen } from "@youwol/math"
// import { InverseMethod } from "../lib/InverseMethod"
// import { Data, Direction, Fault, SensOfMovement } from "../lib"

/*
function addData( 
    {data, strike, dipDirection, dip, sensOfMovement, rake, strikeDirection}:
    {data: Data[], strike: number, dipDirection: Direction, dip: number, sensOfMovement: SensOfMovement, rake: number, strikeDirection: Direction}
){
    const s = Fault.create({
        strike, dipDirection, dip,
        rake, strikeDirection, sensOfMovement
    })
    const d = new StriatedPlane()
    d.initialize({nPlane: s.nPlane, nStriation: s.nStriation})
    data.push(d)
}
*/

test('test inversion 1', () => {

    /*
    const data: Data[] = []
    
    addData({data,
        strike: 45, dipDirection: Direction.SE, dip: 60,
        rake: 0, strikeDirection: Direction.NE, sensOfMovement: SensOfMovement.RL
    })

    addData({data,
        strike: 45, dipDirection: Direction.SE, dip: 60,
        rake: 5, strikeDirection: Direction.NE, sensOfMovement: SensOfMovement.RL
    })

    addData({data,
        strike: 45, dipDirection: Direction.SE, dip: 30,
        rake: 4, strikeDirection: Direction.SW, sensOfMovement: SensOfMovement.RL
    })

    addData({data,
        strike: 45, dipDirection: Direction.NW, dip: 45 ,
        rake: 3, strikeDirection: Direction.SW, sensOfMovement: SensOfMovement.RL
    })

    addData({data,
        strike: 135, dipDirection: Direction.NE, dip: 60 ,
        rake: 6, strikeDirection: Direction.SE, sensOfMovement: SensOfMovement.LL
    })

    addData({data,
        strike: 135, dipDirection: Direction.NE, dip: 30 ,
        rake: 2, strikeDirection: Direction.NW, sensOfMovement: SensOfMovement.LL
    })

    addData({data,
        strike: 135, dipDirection: Direction.SW, dip: 40 ,
        rake: 1, strikeDirection: Direction.SE, sensOfMovement: SensOfMovement.LL
    })

    // ...

    const inv = new InverseMethod()
    inv.addData(data)
    const sol = inv.run()

    const m = sol.rotationMatrixW
    const {values, vectors} = eigen([m[0][0], m[0][1], m[0][2], m[1][1], m[1][2], m[2][2]])

    console.log(sol)
    console.log(vectors)
    */
})
