import {
    lineSphericalCoords,
    Matrix3x3,
    multiplyTensors,
    newMatrix3x3,
    PoleCoords,
    rad2deg,
    SphericalCoords,
    stressTensorPrincipalAxes,
    transposeTensor,
    trend2phi,
    Vector3
} from "../types"

export enum MasterStress {
    Sigma1,
    Sigma3
}

export type StressTensorParams = {
    trendS1: number, 
    plungeS1?: number, 
    trendS3: number, 
    plungeS3?: number, 
    masterStress: MasterStress,
    stressRatio: number }

export class StressTensor {
    constructor(
        { trendS1, plungeS1, trendS3, plungeS3, masterStress, stressRatio }: StressTensorParams
    ) {
        this.poleS1.plunge = plungeS1
        this.poleS3.plunge = plungeS3
        this.poleS1.trend = trendS1
        this.poleS3.trend = trendS3
        this.sigma = [-1, -stressRatio, 0]

        this.changeMasterStress(masterStress)

        // Perfom the computations...
        this.masterSlave()
        this.rotationTensor_Rrot(
            new SphericalCoords({phi: this.phiS1, theta: this.thetaS1}),
            new SphericalCoords({phi: this.phiS3, theta: this.thetaS3})
        )
    }

    changeMasterStress(masterStress: MasterStress) {
        this.masterStress = masterStress
    }

    get ST() {
        return this.ST_
    }

    get STP() {
        return this.STP_
    }

    get stressRatio() {
        return this.sigma[1]
    }

    set plungeS1(v: number) {
        this.poleS1.plunge = v
        this.masterSlave()
    }
    set trendS1(v: number) {
        this.poleS1.trend = v
        this.masterSlave()
    }
    set plungeS3(v: number) {
        this.poleS3.plunge = v
        this.masterSlave()
    }
    set trendS3(v: number) {
        this.poleS3.trend = v
        this.masterSlave()
    }
    get plunge() {
        if (this.masterStress === MasterStress.Sigma1) {
            return this.poleS3.plunge
        }
        else {
            return this.poleS1.plunge
        }
    }

    /**
     * Example:
     * ```ts
     * const s = new StressTensor({trendS1, plungeS1, trendS3, plungeS3, masterStress, sigma})
     * const r = s.Rrot
     * ```
     */
    get Rrot(): Matrix3x3 {
        return this.Rrot_
    }

    get RTrot(): Matrix3x3 {
        return transposeTensor(this.Rrot_)
    }

    masterSlave() {
        // Calculate the plunge of the Slave stress axis
        if (this.masterStress === MasterStress.Sigma1) {
            // The trend and plunge of sigma 1 are set by the user
            const sigma = lineSphericalCoords({
                trend: this.poleS1.trend,
                plunge: this.poleS1.plunge
            })

            // The trend of sigma 3 is set by the user while the plunge of sigma 3 has to be calculated
            this.phiS3 = trend2phi(this.poleS3.trend)
            this.thetaS3 = this.thetaSlave(sigma.phi, sigma.theta, this.phiS3)
            this.poleS3.plunge = rad2deg(this.thetaS3 - Math.PI / 2)

        } else {
            // The trend and plunge of sigma 3 are set by the user
            const sigma = lineSphericalCoords({
                trend: this.poleS3.trend,
                plunge: this.poleS3.plunge
            })

            // The trend of sigma 1 is set by the user while the plunge of sigma 3 has to be calculated
            this.phiS1 = trend2phi(this.poleS1.trend)
            this.thetaS1 = this.thetaSlave(sigma.phi, sigma.theta, this.phiS1)
            this.poleS1.plunge = rad2deg(this.thetaS1 - Math.PI / 2)
        }
    }

    private thetaSlave(phiMaster: number, thetaMaster: number, phiSlave): number {
        // thetaSlave: colatitude or polar angle of the slave stress axis measured downward from the zenith (upward direction) [0, PI)
        let thetaSlave = 0

        if (thetaMaster > 0 && thetaMaster < Math.PI / 2) {
            // The master stress axis is in the upper hemisphere
            // phi_NormalPlane = azimuthal angle of the normal plane in inteerval [0, 2 PI):
            //  The plane is located in the upper hemisphere in the anticlockwise direction realtive to phi_NormalPlane   
            let phi_NormalPlane = phiMaster + Math.PI / 2
            if (phi_NormalPlane >= 2 * Math.PI) {
                phi_NormalPlane -= 2 * Math.PI
            }
            // phi_Y_NormalPlane = inclination angle of the normal fault plane (0, PI/2 )()
            let phi_Y_NormalPlane = thetaMaster
            // phi_NP_Slave = azimuthal angle between phi_NormalPlane and phiSlave
            let phi_NP_Slave = phiSlave - phi_NormalPlane
            // Analytic equation relating angles in spherical coords 
            thetaSlave = Math.atan(1 / (Math.sin(phi_NP_Slave) * Math.tan(phi_Y_NormalPlane)))
            if (thetaSlave < 0) {
                thetaSlave += Math.PI
            }
        } else if (thetaMaster > Math.PI / 2) {
            // The master stress axis is in the lower hemisphere
            let phi_NormalPlane = phiMaster - Math.PI / 2
            if (phi_NormalPlane < 0) {
                phi_NormalPlane += 2 * Math.PI
            }
            // phi_Y_NormalPlane = inclination angle of the normal fault plane (0, PI/2 )()
            let phi_Y_NormalPlane = Math.PI - thetaMaster
            // phi_NP_Slave = azimuthal angle between phi_NormalPlane and phiSlave
            let phi_NP_Slave = phiSlave - phi_NormalPlane
            // Analytic equation relating angles in spherical coords 
            thetaSlave = Math.atan(1 / (Math.sin(phi_NP_Slave) * Math.tan(phi_Y_NormalPlane)))
            if (thetaSlave < 0) {
                thetaSlave += Math.PI
            }
        } else if (thetaMaster === 0) {
            // The master stress axis is vertical

        } else if (thetaMaster === Math.PI / 2) {  // angle in degrees can be more precise for this test
            // The master stress axis is horizontal

        }
        return thetaSlave
    }

    private rotationTensor_Rrot(sigma_1_sphere: SphericalCoords, sigma_3_sphere: SphericalCoords) {
        // This method implements the rotation tensor Rrot between the geographic reference frame S 
        //      and the interactive search reference frame  Sr ('r' stands for 'rough' solution):

        //  The interactive search should lead to a 'rough' estimate of the stress tensor solution (the letters 'r' and 'R' stand for 'rough')

        // Calculate the rotation tensors between right handed reference frames S and Sr, where
        // Sr = (Xr,Yr,Zr) is the principal stress reference frame, parallel to (sigma_1_Sr, sigma_3_Sr, sigma_2_Sr);
        // S =  (X, Y, Z ) is the geographic reference frame  oriented in (East, North, Up) directions.
        //
        // Let Rrot be the rotation tensor R between reference systems S and Sr, such that:
        //      Vr = R V,  where V and Vr are the same vector defined in reference frames S and Sr, respectively

        // The lines of matrix R are given by the unit vectors (nSigma_1_Sr,nSigma_3_Sr,nSigma_2_Sr) parallel to (Xr,Yr,Zr) defined in reference system S:
        const Rrot: Matrix3x3 = newMatrix3x3()

        // 1st line of matrix Rrot (Sigma_1_Sr axis): Unit vector nSigma_1_Sr. The scalar product: nSigma_1_Sr.V = Vr(1)
        Rrot[0][0] = Math.sin(sigma_1_sphere.theta) * Math.cos(sigma_1_sphere.phi)
        Rrot[0][1] = Math.sin(sigma_1_sphere.theta) * Math.sin(sigma_1_sphere.phi)
        Rrot[0][2] = Math.cos(sigma_1_sphere.theta)

        // 2nd line of matrix Rrot (Sigma_3_Sr axis): Unit vector nSigma_3_Sr. The scalar product: nSigma_3_Sr.V = Vr(2)
        Rrot[1][0] = Math.sin(sigma_3_sphere.theta) * Math.cos(sigma_3_sphere.phi)
        Rrot[1][1] = Math.sin(sigma_3_sphere.theta) * Math.sin(sigma_3_sphere.phi)
        Rrot[1][2] = Math.cos(sigma_3_sphere.theta)

        // 3rd line of matrix Rrot (Sigma_2_Sr axis): Unit vector nSigma_2_Sr. The scalar product: nSigma_2_Sr.V = Vr(3)
        // nSigma_2_Sr is calculated from the cross product e3_Sr = e1_Sr x e2_Sr :
        Rrot[2][0] = Rrot[0][1] * Rrot[1][2] - Rrot[0][2] * Rrot[1][1]
        Rrot[2][1] = Rrot[0][2] * Rrot[1][0] - Rrot[0][0] * Rrot[1][2]
        Rrot[2][2] = Rrot[0][0] * Rrot[1][1] - Rrot[0][1] * Rrot[1][0]

        // Let RTrot be the rotation tensor R between reference systems Sr and S, such that:
        //      V = RTrot Vr,  where V and Vr are the same vector defined in reference frames S and Sr, respectively
        this.Rrot_ = Rrot

        this.stressTensor_Sr_S()
    }

    private stressTensor_Sr_S() {
        // Calculate the stress tensor STP in reference frame S from the stress tensor in reference frame Sr:
        //      ST = RTrot STP Rrot
        //
        // where
        //
        //      Sr = (Xr,Yr,Zr) is the principal stress reference frame, parallel to (sigma_1, sigma_3, sigma_2) ('r' stands for 'rough' solution);
        //      S =  (X, Y, Z ) is the geographic reference frame  oriented in (East, North, Up) directions.
        //      STP = Stress tensor in the principal stress reference frame.

        this.STP_ = stressTensorPrincipalAxes(this.sigma.map(v => -v) as Vector3)
        const T1 = multiplyTensors({ A: transposeTensor(this.Rrot_), B: this.STP })
        this.ST_  = multiplyTensors({ A: T1, B: this.Rrot_ })
    }

    // ========================================================

    private phiS1 = 0
    private phiS3 = 0
    private thetaS1 = 0
    private thetaS3 = 0

    /**
     * The new stress tensor is defined in a new reference sytem Sr = (Xr,Yr,Zr) = (sigma 1, sigma 3, sigma 2) ('r' stands for 'rough' solution)
     * Sigma 1 and sigma 3 axes can be defined interactively in the sphere (prefered solution) or chosen in a predefined range.
     * 
     * The stress axis Sigma_1 is defined by two angles in PoleCoords: trend and plunge.
     *      trend  = azimuth of sigma 1 in interval [0, 360), measured clockwise from the North
     *      plunge = vertical angle between the horizontal plane and the sigma 1 axis (positive downward), in interval [-90,90]
     * @param param0  
     */
    private poleS1: PoleCoords = new PoleCoords()

    /**
     * The stress axis Sigma_3 is defined by two angles in PoleCoords: trend and plunge.
     *      trend  = azimuth of sigma 3 in interval [0, 360), measured clockwise from the North
     *      plunge = vertical angle between the horizontal plane and the sigma 3 axis (positive downward), in interval [-90,90]
     * 
     * @param param0  
     */
    private poleS3: PoleCoords = new PoleCoords()

    // The user selects a Master Principal Stress (MPS) and a Subordinate/Slave Principal Stress (SPS), Sigma 1 or Sigma 3:
    //      The trend and plunge of the MPS are defined by the user
    //      The trend of the SPS is defined by the user while the plunge is calculated from the 3 selected angles
    //      The SPS is located in the plane perpendicular to the MPS.
    private masterStress = MasterStress.Sigma1
    private sigma: Vector3 = [0, 0, 0]

    private Rrot_: Matrix3x3 = newMatrix3x3()
    private STP_: Matrix3x3 = newMatrix3x3()
    private ST_: Matrix3x3 = newMatrix3x3()
}
