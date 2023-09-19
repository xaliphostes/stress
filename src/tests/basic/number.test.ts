import { isNumber, isDefined, toInt, toFloat } from "../../lib"

test('test StriatedPlaneKin', () => {
    let c = '90'
    expect(isDefined(c)).toBeTruthy()
    expect(isNumber(c)).toBeTruthy()
    expect(toFloat(c)).toBe(90)

    c = '90.0'
    expect(isDefined(c)).toBeTruthy()
    expect(isNumber(c)).toBeTruthy()
    expect(toFloat(c)).toBe(90)

    c = 'a'
    expect(isDefined(c)).toBeTruthy()
    expect(isNumber(c)).toBeFalsy()

    c = '-1e11'
    expect(isDefined(c)).toBeTruthy()
    expect(isNumber(c)).toBeTruthy()
    expect(toFloat(c)).toBeCloseTo(-1e11)

    c = ''
    expect(isDefined(c)).toBeFalsy
})
