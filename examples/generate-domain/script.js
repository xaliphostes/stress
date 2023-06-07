const STRESS = require('../../dist/@alfredo-taboada/stress')
const math = require('@youwol/math')
const fs = require('fs')
const { exit } = require('process')

// theta in [0, 180]
// Rb    in [0, 3]
function stress(theta, Rb) {
    const c = Math.cos((theta * Math.PI) / 180)
    const s = Math.sin((theta * Math.PI) / 180)
    const c2 = c ** 2
    const s2 = s ** 2

    let xx = 0
    let xy = 0
    let yy = 0
    let zz = 0

    if (Rb <= 1) { // normal
        const R = Rb
        xx = R * s2
        xy = c * s * R
        yy = c2 * R
        zz = 1
    } else if (Rb <= 2) { // strike-slip
        const R = 2 - Rb
        xx = s2
        xy = c * s
        yy = c2
        zz = R
    } else { // reverse
        const R = Rb - 2
        xx = R * c2 + s2
        xy = (1 - R) * c * s
        yy = R * s2 + c2
        zz = 0
    }

    return [
        [-xx, -xy, 0],
        [-xy, -yy, 0],
        [0, 0, -zz]
    ]
}

if (process.argv.length < 3) {
    console.warn('Missing arguments: json config file')
    exit(0)
}

const params = JSON.parse(
    fs.readFileSync(process.argv[2], 'utf8'),
)

const inv = new STRESS.InverseMethod()

// --------------------------------

params.csv.forEach( csv => {
    const buffer = fs.readFileSync(csv, 'utf8').split('\n')
    STRESS.decodeCSV_Angles(buffer).forEach( data => inv.addData(data) )
})

// --------------------------------

const scale = 10
const n = 100
let buffer = '# theta Rb cost\n# x y z\n'

for (let i=0; i<n; ++i) {
    const Rb = 3*i/(n-1)
    for (let j=0; j<n; ++j) {
        const theta = 180*j/(n-1)
        const s = stress(theta, Rb)
        const c = inv.cost({stress: s})*scale
        buffer += `${i} ${j} ${c}\n`
        // buffer += `${i} ${j} ${s[2][2]*10}\n`
    }
}

fs.writeFileSync(
    `domain.xyz`,
    buffer,
    'utf8',
    (err) => {},
)
