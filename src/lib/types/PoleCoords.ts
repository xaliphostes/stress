
export class PoleCoords {
    private trend_  = 0
    private plunge_ = 0

    constructor(
        {trend=0, plunge=0}:
        {trend?: number, plunge?: number} = {})
    {
        // check bounds of theta and phi if any
        this.trend_  = trend ? trend : 0
        this.plunge_ = plunge? plunge   : 0
    }

    get trend() {
        return this.trend_
    }
    set trend(v: number) {
        // check bounds of theta
        this.trend_ = v
    }

    get plunge() {
        return this.plunge_
    }
    set plunge(v: number) {
        this.plunge_ = v
    }
}
