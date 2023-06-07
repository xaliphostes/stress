import { MohrCoulombCurve } from "../lib";

test('test stress 1 item', () => {
    const mc = new MohrCoulombCurve([-1, 0, -0.5])
    const l = mc.generate(0, 0.3)

    console.log(l)
    // expect(sigma_1.radius).toEqual(1)
})
