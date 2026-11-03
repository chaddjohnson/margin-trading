
**s1** (start C3, order KRE → VGT → GDX ×2)

| step | book | incumbent pool DEV net | decision | new pool DEV net | new pool DD | book vector after the step | new vectors | acceptance checks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | KRE | $203,453 | accepted | $232,514 | $31,120 | X 28.5% Y 2.6% L 248 stop 12.5% hold 4 buffer 2.4% P 13.2% W 63 | 600 | 1 |
| 2 | VGT | $232,514 | accepted | $262,145 | $28,846 | X 13.1% Y 1.1% L 195 stop 4.9% hold 15 buffer 3.0% P 5.8% W 175 | 600 | 1 |
| 3 | GDX | $262,145 | accepted | $276,517 | $28,846 | X 25.7% Y 1.1% L 137 stop 7.1% hold 18 buffer 3.6% P 18.7% W 73 | 600 | 1 |
| 4 | KRE | $276,517 | accepted | $292,557 | $28,846 | X 27.5% Y 0.5% L 54 stop 10.2% hold 4 buffer 2.6% P 17.0% W 161 | 600 | 1 |
| 5 | VGT | $292,557 | kept |  |  | X 13.1% Y 1.1% L 195 stop 4.9% hold 15 buffer 3.0% P 5.8% W 175 | 600 | 0 |
| 6 | GDX | $292,557 | kept |  |  | X 25.7% Y 1.1% L 137 stop 7.1% hold 18 buffer 3.6% P 18.7% W 73 | 600 | 0 |

Joint step: accepted; pool DEV net $302,508, DD $28,846 (1500 new vectors).


**s2** (start C3, order VGT → KRE → GDX ×2)

| step | book | incumbent pool DEV net | decision | new pool DEV net | new pool DD | book vector after the step | new vectors | acceptance checks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | VGT | $203,453 | accepted | $229,219 | $26,663 | X 23.8% Y 0.1% L 69 stop 6.4% hold 6 buffer 2.9% P 7.0% W 60 | 600 | 1 |
| 2 | KRE | $229,219 | accepted | $268,448 | $26,333 | X 28.7% Y 0.6% L 39 stop 10.4% hold 4 buffer 1.8% P 16.6% W 168 | 600 | 1 |
| 3 | GDX | $268,448 | accepted | $301,583 | $26,333 | X 23.7% Y 0.3% L 215 stop 5.0% hold 4 buffer 3.5% P 20.0% W 84 | 600 | 1 |
| 4 | VGT | $301,583 | accepted | $307,749 | $25,556 | X 14.8% Y 0.1% L 247 stop 6.4% hold 13 buffer 2.8% P 5.1% W 56 | 600 | 1 |
| 5 | KRE | $307,749 | kept |  |  | X 28.7% Y 0.6% L 39 stop 10.4% hold 4 buffer 1.8% P 16.6% W 168 | 600 | 0 |
| 6 | GDX | $307,749 | accepted | $316,495 | $25,556 | X 24.2% Y 0.3% L 214 stop 4.8% hold 4 buffer 3.3% P 19.7% W 84 | 600 | 1 |

Joint step: accepted; pool DEV net $330,410, DD $24,363 (1500 new vectors).


**s3** (start C3, order GDX → KRE → VGT ×2)

| step | book | incumbent pool DEV net | decision | new pool DEV net | new pool DD | book vector after the step | new vectors | acceptance checks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | GDX | $203,453 | accepted | $209,458 | $26,510 | X 27.3% Y 1.1% L 103 stop 7.1% hold 17 buffer 3.8% P 16.7% W 54 | 600 | 1 |
| 2 | KRE | $209,458 | accepted | $250,520 | $30,466 | X 20.6% Y 2.7% L 42 stop 10.8% hold 4 buffer 2.3% P 3.4% W 199 | 600 | 3 |
| 3 | VGT | $250,520 | accepted | $257,112 | $30,466 | X 23.8% Y 0.1% L 78 stop 7.3% hold 13 buffer 4.1% P 9.4% W 60 | 600 | 1 |
| 4 | GDX | $257,112 | accepted | $285,770 | $30,466 | X 27.3% Y 1.2% L 243 stop 5.4% hold 14 buffer 4.3% P 17.0% W 68 | 600 | 1 |
| 5 | KRE | $285,770 | accepted | $294,202 | $30,046 | X 20.6% Y 2.6% L 42 stop 10.1% hold 4 buffer 2.2% P 3.3% W 200 | 600 | 2 |
| 6 | VGT | $294,202 | kept |  |  | X 23.8% Y 0.1% L 78 stop 7.3% hold 13 buffer 4.1% P 9.4% W 60 | 600 | 0 |

Joint step: kept the coordinate result; pool DEV net $294,202, DD $30,046 (1500 new vectors).


**s4** (start T1-P, order KRE → VGT → GDX ×2)

| step | book | incumbent pool DEV net | decision | new pool DEV net | new pool DD | book vector after the step | new vectors | acceptance checks |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | KRE | $230,924 | kept |  |  | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 600 | 0 |
| 2 | VGT | $230,924 | kept |  |  | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | 600 | 0 |
| 3 | GDX | $230,924 | kept |  |  | X 25.8% Y 0.9% L 210 stop 7.2% hold 11 buffer 3.4% P 14.7% W 170 | 600 | 0 |
| 4 | KRE | $230,924 | kept |  |  | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 600 | 0 |
| 5 | VGT | $230,924 | kept |  |  | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | 600 | 0 |
| 6 | GDX | $230,924 | kept |  |  | X 25.8% Y 0.9% L 210 stop 7.2% hold 11 buffer 3.4% P 14.7% W 170 | 600 | 0 |

Joint step: kept the coordinate result; pool DEV net $230,924, DD $26,510 (1500 new vectors).


Path dependence (joint normalized L∞ between runs): s1–s2: coordinate 0.63, joint 0.60; s1–s3: coordinate 0.81, joint 0.81; s1–s4: coordinate 0.77, joint 0.86; s2–s3: coordinate 0.78, joint 0.78; s2–s4: coordinate 0.83, joint 0.86; s3–s4: coordinate 0.82, joint 0.82
