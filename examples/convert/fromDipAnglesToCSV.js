const STRESS = require('../../dist/@alfredo-taboada/stress')
const fs = require('fs')

function getExtension(filename) {
    return filename.substring(filename.lastIndexOf('.') + 1)
}

function getBaseName(filename) {
    return filename.substring(0, filename.lastIndexOf('.'))
}

function help() {
    console.warn('Usage:')
    console.warn('  node fromDipAnglesToCSV.js xyz-filename data-type')
    console.warn('with data-type:')
    console.warn('  Extension-Fracture')
    console.warn('  Stylolite-Interface')
    console.warn('and for which the input file is a xyz file format, with columns "x y z dip dipAzimuth" and with angles in degrees.')
    console.warn('')
    console.warn('Example:')
    console.warn('  node fromDipAnglesToCSV.js   ../../../app-stress-2/data-test/fractures_Matelles/data_veins_new2.xyz   Extension-Fracture')
}

// ----------------------------------------------------

if (process.argv.length !== 4) {
    console.warn('Missing 2 arguments: xyz-filename and data-type')
    help()
    return
}

const inFilename = process.argv[2]
if (getExtension(inFilename) !== 'xyz') {
    console.warn('Input file is not a xyz file')
    help()
    return
}

const dataType = process.argv[3].replace('-', ' ')
if (STRESS.DataFactory.exists(dataType) === false) {
    console.warn(`Unknown data type named "${dataType}"`)
    console.warn('Possible values are:')
    STRESS.DataFactory.names().forEach( name => console.warn(`  - ${name.replaceAll(' ', '-')}`) )
    help()
    return
}

const outFilename = getBaseName(inFilename) + '.csv'

const buffer = fs.readFileSync(inFilename, 'utf8').split('\n').map( s => STRESS.trimAll(s) )
let outBuffer = ''

buffer.forEach( (line, i) => {
    const toks = line.split(' ')
    if (toks.length === 5) {
        const dip = parseFloat(toks[3])
        let dipAzim = parseFloat(toks[4]) - 90
        if (dipAzim<0) {
            dipAzim += 360
        }
        const x = parseFloat(toks[0])
        const y = parseFloat(toks[1])
        const z = parseFloat(toks[2])
        outBuffer += `${i}; ${dataType}; ${dipAzim}; ${dip};;;;;;;;;;;;;;;;${x};${y};${z};\n`
    }
})

fs.writeFileSync(outFilename, outBuffer)
