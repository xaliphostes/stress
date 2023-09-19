import { StriatedPlaneKin, trimAll } from "../../lib"

function doit(line: string) {
    const f = new StriatedPlaneKin()

    const new_line = trimAll(line)
    const tokens = [new_line.split(' ')]

    try {
        const ret = f.initialize(tokens)

        expect(ret.status).toBe(true)
        expect(ret.messages.length).toBe(0) 
    }
    catch(e) {
        expect(true).toBe(false)
    }
}

test('test StriatedPlaneKin', () => {
    //doit('hfdksjhfkjds fjdkj fjkfjlkdsfjlsd')
})