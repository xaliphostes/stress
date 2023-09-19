# CSV file format

Numbers represent the line columns for eah data of the csv file (e.g., exported from Excel)
```python
0 : Data number

1 : Data type (see DataFactory)

# Plane
2 : Strike
3 : Dip
4 : Dip direction

# Striation
5 : Rake
6 : Strike direction
7 : Striation trend
8 : Type of movement

# Line
9 : Line trend
10: line plunge

# Complementary info
11: Deformation phase
12: Related weight

13: Minimum friction angle
14: Maximum friction angle

15: Minimum angle <S1,n>
16: Maximum angle <S1,n>

# Spacial scaling
17: Scale

# Local bedding plane
18: Strike
19: Dip
20: Dip direction

# Localization
21: x
22: y
23: z
```