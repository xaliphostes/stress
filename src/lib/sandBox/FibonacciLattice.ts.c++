import { MisfitCriteriunSolution } from "../InverseMethod"
import { cloneMatrix3x3, crossProduct, Matrix3x3, newMatrix3x3, properRotationTensor, SphericalCoords } from "../types"
import { multiplyTensors, properRotationTensor, spherical2unitVectorCartesian, transposeTensor } from "../types"
import { SearchMethod } from "./SearchMethod"

export class FibonacciLattice implements SearchMethod {
    private rotAngleHalfInterval: number
    private deltaRotAngle: number
    // nbNodesSpiralHem = number of nodes in the log spiral in the upper (or lower) hemisphere
    // Thus, the total number of nodes is nbNodesTotal = 2 nbNodesSpiralHem + 1
    private nbNodesSpiralHem: number

    constructor(
        {rotAngleHalfInterval=0.1, deltaRotAngle=0.001, nbNodesSpiralHem=100}:
        {rotAngleHalfInterval?: number, deltaRotAngle?: number, nbNodesSpiralHem?: number} = {})
    {
        // rotAngleHalfInterval = value set by the user (i.e., the half-apex angle of the cone around the principal axes)
        this.rotAngleHalfInterval = rotAngleHalfInterval  

        // deltaRotAngle = angular interval definning the search grid. It represents 2 values:
        //  a) The average angular distance between rotation axes in the log spiral 
        //  b) The rotation magnitude interval around rotation axes
        //  is fixed by the program to optmize both computation time and precision (e.g. deltaRotAngle = 5 PI / 180 = 0.087 rad  )
        // Note that deltaRotAngle has to be "sufficiently large" to decrease computation time
        this.deltaRotAngle = deltaRotAngle
    }

    public run(misfitCriteriaSolution: MisfitCriteriunSolution): boolean {
        // The optimum stress tensor is calculated by exploring the stress orientations and the stress ratio around the approximate solution S0
        // obtained by the user during the interactive analysis of flow lines on the sphere, Mohr circle diagram, and histogram of signed angular deviations.
        // More precisely, the minimization function is calculated for a set of stress tensors whose orientations are rotated around axes 
        // defined by the nodes of a Fibonacci lattice (e.g. a logarithmic spiral), which are "quasi-homogeneously" distributed on the sphere surface.
        // Several magnitudes of rotation are considered for each rotation axis.

        // nbNodesSpiralHem = number of nodes for the log spiral in the upper (or lower) hemisphere
        // nbNodesSpiralHem is calculated by a simple relation between the area of the upper hemisphere and the average angular distance between nodes:
        //  for an average square distribution, deltaRotAngle^2 = 2 PI / nbNodesSpiralHem
        let nbNodesSpiralHem = Math.ceil( 2 * Math.PI / deltaRotAngle^2 )
        // nbNodesSpiralSphere = total number of nodes in the log spiral over the entire unit sphere
        let nbNodesSpiralSphere = 2 * nbNodesSpiralHem + 1
        // The angular node interval englobes the angular cones around the estimated stress directions defined by the user
        let nodesAngleInterval = Math.ceil( this.rotAngleHalfInterval / this.deltaRotAngle )

        
        // The stress ratio node interval englobes the stress ratio interval around the estimated value defined by the user
        let nbNodesStressRatioInterval = Math.ceil( this.stressRatioHalfInterval / this.deltaStressRatio )

        let DTrot: Matrix3x3   = newMatrix3x3()
        let Drot:  Matrix3x3   = newMatrix3x3()
        let WTrot: Matrix3x3   = newMatrix3x3()
        let Wrot:  Matrix3x3   = newMatrix3x3()

        let rotAxisSpheCoords: SphericalCoords

        let inc = 0

        console.log('Starting the grid search...')

        // Calculate misfit for rotation axes parallel to sigma 2 (which are not included in the log spiral)
        // Initialize list of minimum values
        // The null rotation angle is considered once (i.e. corresponding to the interactive stress tensor misfit) **
        rotationAxisSigma2

        // golden ratio of the Fibonacci sequence
        let goldenAngle = ( 1 + Math.sqrt( 5 )) / 2

        let changed = false

        let nbNodesTotal = 2 * nbNodesSpiralHem + 1
        
        for (let i = - nbNodesSpiralHem; i <= this.nbNodesSpiralHem; i++) {
            // A log spiral is defined in the sphere, around the vertical (sigma2) axis.

            // A set of local minima for the misfit function will be identified.
            // This set will be analized further to calculate the best solution.

            // latitude = angle in interval (-pi/2, pi/2) (modified from Gonzales 2009) ** visualize distribution of nodes
            let latitude = Math.asin( 2 * i / nbNodesSpiralSphere )
            let longitude = 2 * Math.PI * i / goldenAngle

            // theta = colatitude in spherical coords in interval (0,PI) : theta + latitude = PI/2
            rotAxisSpheCoords.theta = Math.PI/2 - latitude
            rotAxisSpheCoords.phi   = longitude

            let rotAxis = spherical2unitVectorCartesian(rotAxisSpheCoords)

            for (let j = 1; j <= nodesAngleInterval; j++) {
                // Only positive rotation angles are examined for each rotation axis

    
                // Calculate rotation tensors Drot and Wrot between systems S, Sr and Sw
                rotationTensors(j)

                // Iterate within the stress ratio interval and calculate the rotation axes and 
                iterateStressRatio_CalculateMisfitList() 
            }
        calculateMisfitGlobalMin()
        




  /*                   for (let l = - nbNodesStressRatioInterval; l <= nbNodesStressRatioInterval; l++) {  // This for is identical to function gridsearch
                        // Stress ratio variation around R = (S2-S3)/(S1-S3)
                        let stressRatio = this.stressRatio0 + l * this.deltaStressRatio
                        if ( stressRatio >= 0 && stressRatio <= 1 ) {   // The strees ratio is in interval [0,1]

                            // Calculate the stress tensor STdelta in reference frame S from the stress tensor in reference frame Sw
                            let STdelta = stressTensorDelta(stressRatio, Wrot, WTrot)

                            const misfitSum  = misfitCriteriaSolution.criterion.value(STdelta)
                            if (misfitSum < misfitCriteriaSolution.misfitSum) {
                                misfitCriteriaSolution.misfitSum      = misfitSum
                                misfitCriteriaSolution.rotationMatrixD = cloneMatrix3x3(Drot)
                                misfitCriteriaSolution.rotationMatrixW = cloneMatrix3x3(Wrot)
                                misfitCriteriaSolution.stressRatio    = stressRatio
                                changed = true
                            }

                            inc++
                        }
            
                    }                 */
                }
            }
        }

        return changed

        // To analyse the rotation axis for the best solution: 
        // The cartesian and spherical coords of a unit vector corresponding to the rotation axis are determined 
        // from the components of the tensor definning a proper rotation
        // let {rotAxis, rotAxisSpheCoords, rotMag} = rotationParamsFromRotTensor(DTrot) // **
    }

    rotationTensors(j): void {
        // rotAngle = rotation angle around the rotation axis 
        this.rotAngle  = j * this.deltaRotAngle
    
        // Calculate rotation tensors Drot and DTrot between systems Sr and Sw such that:
        //  Vr  = DTrot Vw        (DTrot is tensor Drot transposed)
        //  Vw = Drot  Vr
        this.DTrot = properRotationTensor({nRot: this.rotAxis, angle: this.rotAngle})
        this.Drot  = transposeTensor(this.DTrot)

        // Calculate rotation tensors Wrot and WTrot between systems S and Sw: WTrot = RTrot DTrot, such that:
        //  V   = WTrot Vw        (WTrot is tensor Wrot transposed)
        //  Vw = Wrot  V
        //  S   =  (X, Y, Z ) is the geographic reference frame  oriented in (East, North, Up) directions.
        //  Sw =  (Xw, Yw, Zw ) is the principal reference frame for a fixed node in the search grid (sigma_1, sigma_3, sigma_2)
        this.WTrot = multiplyTensors({A: this.RTrot, B: this.DTrot })
        //  Wrot = Drot Rrot
        this.Wrot  = transposeTensor( this.WTrot )
    }

    iterateStressRatio_CalculateMisfitList(): void { 

    for (let l = - this.nbNodesStressRatioInterval; l <= this.nbNodesStressRatioInterval; l++) {  // This for is identical to function gridsearch
        // Stress ratio variation around R = (S2-S3)/(S1-S3)
        let stressRatio = this.stressRatio0 + l * this.deltaStressRatio
        if ( stressRatio >= 0 && stressRatio <= 1 ) {   // The strees ratio is in interval [0,1]

            // Calculate the stress tensor STdelta in reference frame S from the stress tensor in reference frame Sw
            let this.STdelta = stressTensorDelta(stressRatio, this.Wrot, this.WTrot)

            const this.misfitSum  = misfitCriteriaSolution.criterion.value(this.STdelta)
            if (this.misfitSum < this.misfitCriteriaSolution.misfitSum[ this.nLocalMins - 1 ]) {
                // We consider a list of local minimum misfit values that is actualized when necessary.
                // The best solution will be obatined by searching around the final list of local minima.

                let nMinList = 0
                while ( ( this.misfitSum > this.listMisfitSum[ nMinList ] ) )
                {
                    nMinList = nMinList + 1
                }

                // Insert a new local minimum value at position nMinList in the list
                // array.splice(index, howMany, [element1][, ..., elementN]): adding new elements
                this.listMisfitSum.splice( nMinList, 0, this.misfitSum ) 
                this.listRotAxisSpheCoords( nMinList, 0, this.rotAxisnSpheCoords ) 
                this.listRotAngle( nMinList, 0, this.rotAngle ) 
                this.listStressRatio.splice( nMinList, 0, this.misfitSum )   

                // Delete the last position in the list, which is now in position nLocalMins
                this.listMisfitSum.splice( this.nLocalMins, 1 ) 
                this.listRotAxisSpheCoords( this.nLocalMins, 1 ) 
                this.listStressRatio.splice( this.nLocalMins, 1 )  

                this.changed = true
            }

            inc++
        }
    }

    calculateMisfitGlobalMin() {
    // The global minimum for the misfit is calculated from the local minimum values.
    // Local minimums are calculated by searching in a small-scale regular grid around the local minima.

        let nLocal = spherical2unitVectorCartesian()
        listRotAxisSpheCoords

        for ( i = 0; i < this.nLocalMins; i++)
        {
            // For each local minimum generate a regular grid

            // nRotAxis = rotation axis corresponding to local minimum 'i' in the list
            let nRotAxis = spherical2unitVectorCartesian( this.listRotAxisSpheCoords[i] )

            // 
            let nodesAngleInterval_LocalGrid = Math.ceil()

            for (let j = - nodesAngleInterval; j <= nodesAngleInterval; j++) {
                // Angular variation around vertical great circles (i.e., the rotation axis is in the horizontal plane)

                let deltaPhi = j * this.deltaGridAngle

                // nRotAxis1 = rotation axis corresponding to local minimum 'i' in the list
                let nRotAxis1 = spherical2unitVectorCartesian( this.listRotAxisSpheCoords[i] )
              
                
                for (let k = - nodesAngleInterval; k <= nodesAngleInterval; k++) {
                    // Angular variation around a perpendicular set of great circles
                    let deltaTheta = j * this.deltaGridAngle


                    nRot1[0] = Math.cos( this.listRotAxisSpheCoords.phi + Math.pi/2 )
                    nRot1[1] = Math.sin( this.listRotAxisSpheCoords.phi + Math.pi/2 )
                    nRot1[2] = 0

                    nRot2 = crossproduct(this.)
                    
                    Drot1 = properRotationTensor({nRot, angle}



        }
        
    }




    /* for (let l = - this.nbNodesStressRatioInterval; l <= this.nbNodesStressRatioInterval; l++) {  // This for is identical to function gridsearch
        // Stress ratio variation around R = (S2-S3)/(S1-S3)
        let stressRatio = this.stressRatio0 + l * this.deltaStressRatio
        if ( stressRatio >= 0 && stressRatio <= 1 ) {   // The strees ratio is in interval [0,1]

            // Calculate the stress tensor STdelta in reference frame S from the stress tensor in reference frame Sw
            let this.STdelta = stressTensorDelta(stressRatio, this.Wrot, this.WTrot)

            const misfitSum  = misfitCriteriaSolution.criterion.value(this.STdelta)
            if (misfitSum < this.misfitCriteriaSolution.misfitSum) {
                this.misfitCriteriaSolution.misfitSum      = misfitSum
                this.misfitCriteriaSolution.rotationMatrixD = cloneMatrix3x3(Drot)
                this.misfitCriteriaSolution.rotationMatrixW = cloneMatrix3x3(Wrot)
                this.misfitCriteriaSolution.stressRatio    = stressRatio
                changed = true
            }

            inc++
        } */

    rotationAxisSigma2(
        {sensOfMovement, striationTrend}:
        {sensOfMovement: SensOfMovement, striationTrend: Direction}): Fault
    {
        this.sensMouv = sensOfMovement
        this.striationTrend = striationTrend
        this.faultStriationAngle_A()
        this.faultStriationAngle_B()

        return this
    }

}

// --------------- Hidden to users

function rotationTensorLocalGrid(cosDeltaPhi: number, sinDeltaPhi : number, cosDeltaTheta : number,sinDeltaTheta : number,
    cosDeltaAlpha : number, sinDeltaAlpha: number ): Matrix3x3
{
    // Calculate the rotation tensor DT between reference frame Sr and Sw, such that:
    //  Vr  = DT Vw        (DT is tensor D transposed)
    //  Vw = D  Vr
    //  Sr = (Xr,Yr,Zr) is the principal stress reference frame obtained by the user from the interactive analysis, parallel to (sigma_1, sigma_3, sigma_2);
    //       'r' stands for 'rough' solution
    //  Sw =  (Xw, Yw, Zw ) is the principal reference frame for a fixed node in the search grid (sigma_1, sigma_3, sigma_2) ('w' stands for 'winning' solution)

    // The columns of matrix D are given by the unit vectors parallel to X1'', X2'', and X3'' defined in reference system Sr:

    const DT: Matrix3x3 = newMatrix3x3()

    // Sigma_1 axis: Unit vector e1''
    DT[0][0] =   cosDeltaPhi * cosDeltaTheta
    DT[1][0] =   sinDeltaPhi * cosDeltaTheta
    DT[2][0] = - sinDeltaTheta

    // Sigma_3 axis: Unit vector e2''
    DT[0][1] = - sinDeltaPhi * cosDeltaAlpha + cosDeltaPhi * sinDeltaTheta * sinDeltaAlpha
    DT[1][1] =   cosDeltaPhi * cosDeltaAlpha + sinDeltaPhi * sinDeltaTheta * sinDeltaAlpha
    DT[2][1] =   cosDeltaTheta * sinDeltaAlpha

    // Sigma_2 axis: Unit vector e3''
    DT[0][2] =   sinDeltaPhi * sinDeltaAlpha + cosDeltaPhi * sinDeltaTheta * cosDeltaAlpha
    DT[1][2] = - cosDeltaPhi * sinDeltaAlpha + sinDeltaPhi * sinDeltaTheta * cosDeltaAlpha
    DT[2][2] =   cosDeltaTheta * cosDeltaAlpha

    return DT
}
