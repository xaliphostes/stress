const STRESS = require('../dist/@alfredo-taboada/stress')
const math = require('@youwol/math')

// --------------------  begin pour info
// STRESS.DataFactory.names().forEach( name => console.log(name) )
// console.log('')
// const myData = STRESS.DataFactory.create('Extension Fracture', {n: [0,0,1]})
// console.log(myData)
// --------------------  end pour info

function addData({data, strike, dipDirection, dip, typeOfMovement, rake, strikeDirection}){
    const s = STRESS.Fault.create({
        strike, dipDirection, dip,
        rake, strikeDirection, typeOfMovement
    })
    data.push( new STRESS.StriatedPlane({nPlane: s.nPlane, nStriation: s.nStriation}) )
}




const data = []

addData({data,
    strike: 45, dipDirection: STRESS.Direction.SE, dip: 60,
    rake: 0, strikeDirection: STRESS.Direction.NE, typeOfMovement: STRESS.TypeOfMovement.RL
})

addData({data,
    strike: 45, dipDirection: STRESS.Direction.SE, dip: 60,
    rake: 5, strikeDirection: STRESS.Direction.NE, typeOfMovement: STRESS.TypeOfMovement.RL
})

addData({data,
    strike: 45, dipDirection: STRESS.Direction.SE, dip: 30,
    rake: 4, strikeDirection: STRESS.Direction.SW, typeOfMovement: STRESS.TypeOfMovement.RL
})

addData({data,
    strike: 45, dipDirection: STRESS.Direction.NW, dip: 45 ,
    rake: 3, strikeDirection: STRESS.Direction.SW, typeOfMovement: STRESS.TypeOfMovement.RL
})

addData({data,
    strike: 135, dipDirection: STRESS.Direction.NE, dip: 60 ,
    rake: 6, strikeDirection: STRESS.Direction.SE, typeOfMovement: STRESS.TypeOfMovement.LL
})

addData({data,
    strike: 135, dipDirection: STRESS.Direction.NE, dip: 30 ,
    rake: 2, strikeDirection: STRESS.Direction.NW, typeOfMovement: STRESS.TypeOfMovement.LL
})

addData({data,
    strike: 135, dipDirection: STRESS.Direction.SW, dip: 40 ,
    rake: 1, strikeDirection: STRESS.Direction.SE, typeOfMovement: STRESS.TypeOfMovement.LL
})

// ...

const inv = new STRESS.InverseMethod()
inv.addData(data)
const sol = inv.run()

const m = sol.rotationMatrixW
const {values, vectors} = math.eigen([m[0][0], m[0][1], m[0][2], m[1][1], m[1][2], m[2][2]])

console.log(sol)
console.log(vectors)
