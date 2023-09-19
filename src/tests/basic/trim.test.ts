import { trimAll } from "../../lib"

test('test StriatedPlaneKin', () => {
    const s1 = '    Coucou   toto  '
    const s2 = trimAll(s1)
    expect(s2).toEqual('Coucou toto')
})
