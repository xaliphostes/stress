const STRESS = require('../../dist/@alfredo-taboada/stress', '../../src/lib/types/math')
const math = require('@youwol/math')
const fs = require('fs')
const { exit } = require('process')

if (process.argv.length < 3) {
    console.warn('Missing arguments: json config file')
    exit(0)
}

// --------------------------------
// Fichier json
// --------------------------------
const params = JSON.parse(
    fs.readFileSync(process.argv[2], 'utf8'),
)

const inv = new STRESS.InverseMethod()

// --------------------------------
// Decode le/les CSV
// --------------------------------
params.csv.forEach( csv => {
    const buffer = fs.readFileSync(csv.file, 'utf8').split('\n')
    STRESS.decodeCSV_Angles(buffer, csv.params).forEach( data => inv.addData(data) )
})

// --------------------------------
// Search method
// --------------------------------
const stressParams = params.search.params
stressParams.interactiveStressTensor = params.interactiveStressTensor

const search = STRESS.SearchMethodFactory.create(params.search.name, stressParams)
inv.setSearchMethod(search)

// --------------------------------
// Computation
// --------------------------------
const sol = inv.run()
const m = sol.stressTensorSolution

// Calculate the stress tensor STdelta in reference frame S from the stress tensor in reference frame S''
// const wrot = sol.rotationMatrixW
// const wtrot  = transposeTensor( wrot )
// let STdelta = stressTensorDelta(stressRatio, Wrot, WTrot)

// Eigenvectors of a rotation matrix (which is non symmetrical) are not significant
const {values, vectors} = math.eigen([m[0][0], m[0][1], m[0][2], m[1][1], m[1][2], m[2][2]])
//console.log('Solution', sol)
console.log('Eigen values', values)
console.log('Eigen vectors', vectors)
console.log('Stress ratio', sol.stressRatio)
console.log('Fit', Math.round((1-sol.misfit)*100)+'%')
console.log('Misfit', sol.misfit.toFixed(2)*180/Math.PI,'°')
