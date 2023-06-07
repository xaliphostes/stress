Each fault is characterized by a normal vector pointing upward
```js
fault.normal[0],fault.normal[1],fault.normal[2]
```

Calculate the normal vector in reference frame `S'`:
```js
fault.normalSp[0],fault.normalSp[1],fault.normalSp[2]
```

This vector is calculated in the stress tensor reference system using the following tranformation:
    `X' = R X`,  where X and X' are vectors in refereence frames S and S'

`S' = (X',Y',Z')` is the principal stress reference frame, parallel to (sigma_1, sigma_3, sigma_2);
`S =  (X, Y, Z )` is the geographic reference frame  oriented in (East, North, Up) directions.

Let `R` be the rotation matrix (i.e., the inverse matrix of `R` Transposed in function rotationMatrix)

```ts
function mohrCircle(R: number[][], RT: number[][])
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const R[i][j] = RT[j][i]        
        }    
    }
}
```
