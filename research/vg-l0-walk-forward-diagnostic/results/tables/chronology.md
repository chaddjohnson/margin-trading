# Trade-level chronology of the fold primaries on their slices

Replays with each study's own code (`results/replays/primaries.json`, `session.json`; every replay equal to its sealed record field for field, gate G3). Episodes are drawdown episodes of the slice's marked net (from a strict new high to its recovery); the largest is the slice DD. "Change in window" partitions each episode between the lots that held the single slot (one funded slot: the changes sum to −depth). Lot net and MAE are the whole lot's (a lot carried across the cutoff includes its training-period gain). Times UTC.

## 5B L0 arm, independent procedure (calendar holds; V/G/B cells; 2 replicates)

### C19 → 2020-01-02 → 2021-12-31: `C19/L0/indep/R2/B#1 profit` — slice $9,083.51, DD $39,527.29

Sessions held at the close (of 505): flat 174, D1:VGT 57, D1:GDX 274. Refusals in the slice: 4 (D1:GDX ← D1:VGT ×2; D1:VGT ← D1:GDX ×1; G:VGT ← D1:GDX ×1).

Carried across the cutoff: D1:VGT lot entered 2018-12-26 17:08Z at $158.81, marked **$43,027.88** at 2019-12-31 (40.73% of the training net $105,653.22); market value $154,177.95 = 1.54× its $100,000 principal; slice change −$8,284.51; exit 2020-02-27 20:58Z (trailing stop).

Episode 1: peak 2020-02-19 17:49Z → trough 2020-03-23 15:44Z (recovered 2020-08-18 13:30Z): **$39,527.29** (> $35,000).

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2018-12-26 17:08Z | 2020-02-27 20:58Z | trailing stop | −$24,954.49 | $34,743.37 | −$322.56 |
| D1:GDX | 2020-02-28 14:38Z | 2020-03-04 15:21Z | trailing stop | $5,548.50 | $5,548.50 | −$5,559.28 |
| D1:VGT | 2020-03-09 13:55Z | 2020-04-03 13:31Z | maximum hold | −$20,121.30 | −$9,058.84 | −$20,121.30 |

Refused decisions inside the window: 2020-03-10 13:36Z D1:GDX (deep) ← D1:VGT.

Episode 2: peak 2020-09-10 14:02Z → trough 2021-09-29 18:06Z (recovered —): **$30,878.64**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:GDX | 2020-09-04 16:24Z | 2020-09-11 16:57Z | trailing stop | −$3,998.69 | $2,660.61 | −$1,989.61 |
| D1:GDX | 2020-09-21 15:03Z | 2020-10-13 13:31Z | maximum hold | −$1,012.46 | −$1,012.46 | −$7,479.37 |
| D1:GDX | 2020-10-20 14:53Z | 2020-11-09 14:30Z | trailing stop gap | −$1,156.90 | −$1,156.90 | −$8,955.44 |
| D1:GDX | 2020-11-12 14:31Z | 2020-12-01 14:31Z | maximum hold | −$5,676.87 | −$5,676.87 | −$11,690.29 |
| D1:GDX | 2020-12-02 20:13Z | 2020-12-23 14:31Z | maximum hold | −$1,867.74 | −$1,867.74 | −$5,452.05 |
| D1:GDX | 2020-12-24 15:09Z | 2021-01-06 15:54Z | trailing stop | $3,279.72 | $3,279.72 | −$1,829.40 |
| D1:GDX | 2021-01-08 19:40Z | 2021-01-27 14:31Z | maximum hold | −$5,668.93 | −$5,668.93 | −$5,635.57 |
| D1:GDX | 2021-01-28 15:20Z | 2021-02-16 14:31Z | maximum hold | −$3,229.72 | −$3,229.72 | −$5,491.54 |
| D1:GDX | 2021-02-18 16:21Z | 2021-03-09 14:31Z | maximum hold | −$2,437.89 | −$2,437.89 | −$7,808.56 |
| D1:GDX | 2021-03-10 19:13Z | 2021-03-23 13:30Z | trailing stop gap | $1,254.45 | $1,254.45 | −$1,520.15 |
| D1:GDX | 2021-03-26 14:21Z | 2021-04-27 19:06Z | trailing stop | $8,239.47 | $8,239.47 | −$2,634.62 |
| D1:GDX | 2021-06-21 13:33Z | 2021-07-12 13:31Z | maximum hold | −$2,238.81 | −$2,238.81 | −$4,343.69 |
| D1:GDX | 2021-07-13 14:21Z | 2021-08-03 13:31Z | maximum hold | −$602.99 | −$602.99 | −$5,229.77 |
| D1:GDX | 2021-08-06 18:05Z | 2021-08-25 13:31Z | maximum hold | −$5,428.27 | −$5,428.27 | −$8,536.72 |
| D1:GDX | 2021-08-27 14:01Z | 2021-09-07 15:17Z | trailing stop | $821.24 | $821.24 | −$582.96 |
| D1:GDX | 2021-09-08 15:06Z | 2021-09-27 13:31Z | maximum hold | −$8,920.47 | −$8,920.47 | −$9,154.40 |
| D1:GDX | 2021-09-28 15:21Z | 2021-10-28 14:34Z | trailing stop | −$2,233.77 | $9,924.44 | −$2,233.77 |

Refused decisions inside the window: 2020-11-04 21:00Z G:VGT (rise) ← D1:GDX.

### C21 → 2022-01-03 → 2023-12-29: `C21/L0/indep/R1/V#1 profit` — slice −$38,341.52, DD $57,259.44

Sessions held at the close (of 501): flat 256, G:VGT 169, D1:VGT 59, D1:GDX 17. Refusals in the slice: 6 (D1:GDX ← D1:VGT ×2; D1:VGT ← D1:GDX ×2; D1:GDX ← G:VGT ×1; D1:VGT ← G:VGT ×1).

Carried across the cutoff: G:VGT lot entered 2020-04-20 13:30Z at $232.61, marked **$73,149.92** at 2021-12-31 (33.49% of the training net $218,446.88); market value $196,969.18 = 1.97× its $100,000 principal; slice change −$24,357.04; exit 2022-01-25 14:30Z (trailing stop + trend exit).

Episode 1: peak 2022-01-04 14:30Z → trough 2022-10-13 13:32Z (recovered —): **$57,259.44** (> $35,000).

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| G:VGT | 2020-04-20 13:30Z | 2022-01-25 14:30Z | trailing stop + trend exit | −$26,005.16 | $48,792.88 | −$5,086.43 |
| D1:VGT | 2022-05-04 18:48Z | 2022-05-26 13:31Z | maximum hold | −$10,687.97 | −$10,687.97 | −$13,973.91 |
| D1:GDX | 2022-06-14 19:39Z | 2022-06-23 17:02Z | buffered intraday loss | −$4,021.57 | −$4,021.57 | −$3,973.42 |
| D1:GDX | 2022-07-14 13:53Z | 2022-07-21 13:31Z | maximum hold | $162.18 | $162.18 | −$1,154.40 |
| D1:GDX | 2022-07-26 13:31Z | 2022-08-03 14:17Z | trailing stop | $2,799.54 | $2,799.54 | $243.22 |
| G:VGT | 2022-08-15 13:30Z | 2022-08-30 14:31Z | initial stop | −$9,389.50 | −$9,389.50 | −$9,211.48 |
| D1:VGT | 2022-10-04 13:31Z | 2022-10-26 13:31Z | maximum hold | −$10,116.96 | −$848.80 | −$10,116.96 |

Refused decisions inside the window: 2022-05-12 14:14Z D1:GDX (deep) ← D1:VGT; 2022-05-18 15:43Z D1:GDX (deep) ← D1:VGT; 2022-06-15 18:46Z D1:VGT (deep) ← D1:GDX; 2022-07-15 13:31Z D1:VGT (deep) ← D1:GDX; 2022-08-22 14:13Z D1:GDX (continuation) ← G:VGT.

Episode 2: peak 2022-01-03 14:37Z → trough 2022-01-03 14:50Z (recovered 2022-01-03 20:15Z): **$2,273.15**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| G:VGT | 2020-04-20 13:30Z | 2022-01-25 14:30Z | trailing stop + trend exit | −$2,273.15 | $48,792.88 | −$5,086.43 |

### C23 → 2024-01-02 → 2024-12-31: `C23/L0/indep/R2/G#1 profit` — slice $0.00, DD $0.00

Sessions held at the close (of 252): flat 252. Refusals in the slice: 0 (none).

## Trading-session study, independent procedure (session holds; V only; 6 replicates × V1–V3)

### C19 → 2020-01-02 → 2021-12-31: `C19/ses/indep/R6/V1#1 profit` — slice $45,828.28, DD $55,449.12

Sessions held at the close (of 505): flat 117, G:VGT 198, D1:GDX 190. Refusals in the slice: 19 (D1:GDX ← G:VGT ×13; D1:VGT ← D1:GDX ×2; G:VGT ← D1:GDX ×4).

Carried across the cutoff: G:VGT lot entered 2019-10-16 13:30Z at $219.55, marked **$9,233.30** at 2019-12-31 (7.46% of the training net $123,812.69); market value $111,523.57 = 1.12× its $100,000 principal; slice change −$8,730.94; exit 2020-02-28 14:31Z (trailing stop gap + maximum hold).

Episode 1: peak 2020-02-19 17:49Z → trough 2020-03-16 13:53Z (recovered 2020-06-22 13:35Z): **$55,449.12** (> $35,000).

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| G:VGT | 2019-10-16 13:30Z | 2020-02-28 14:31Z | trailing stop gap + maximum hold | −$20,372.14 | $502.36 | −$2,483.67 |
| D1:GDX | 2020-02-28 16:16Z | 2020-03-04 15:03Z | trailing stop | $9,502.77 | $9,502.77 | −$2,305.92 |
| D1:GDX | 2020-03-06 18:34Z | 2020-03-17 13:31Z | maximum hold | −$44,579.74 | −$23,714.12 | −$44,579.74 |

Refused decisions inside the window: 2020-03-12 13:32Z D1:VGT (deep) ← D1:GDX.

Episode 2: peak 2020-11-06 14:30Z → trough 2020-11-27 14:31Z (recovered 2021-01-04 15:52Z): **$14,926.63**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:GDX | 2020-10-29 14:20Z | 2020-11-09 14:30Z | trailing stop gap | −$6,359.45 | $6,075.55 | −$1,403.77 |
| D1:GDX | 2020-11-12 14:55Z | 2020-11-23 14:31Z | maximum hold | −$6,584.04 | −$6,584.04 | −$6,816.55 |
| D1:GDX | 2020-11-25 14:52Z | 2020-12-09 14:35Z | trailing stop | −$1,983.14 | $4,202.56 | −$1,983.14 |

### C21 → 2022-01-03 → 2023-12-29: `C21/ses/indep/R1/V3#1 profit` — slice −$25,018.62, DD $57,489.79

Sessions held at the close (of 501): flat 217, D1:VGT 14, D1:GDX 250, G:VGT 20. Refusals in the slice: 3 (D1:VGT ← D1:GDX ×3).

Carried across the cutoff: D1:VGT lot entered 2020-11-03 16:01Z at $305.66, marked **$37,146.01** at 2021-12-31 (15.44% of the training net $240,514.68); market value $149,895.31 = 1.5× its $100,000 principal; slice change −$21,820.70; exit 2022-01-24 14:30Z (trailing stop gap).

Episode 1: peak 2022-01-04 14:30Z → trough 2022-09-26 17:39Z (recovered —): **$57,489.79** (> $35,000).

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2020-11-03 16:01Z | 2022-01-24 14:30Z | trailing stop gap | −$23,185.45 | $15,325.31 | −$1,005.28 |
| D1:GDX | 2022-01-31 14:31Z | 2022-02-25 14:30Z | trailing stop | $12,461.03 | $12,461.03 | −$320.11 |
| D1:GDX | 2022-04-25 13:47Z | 2022-06-02 13:31Z | maximum hold | −$11,246.49 | −$11,246.49 | −$18,271.37 |
| D1:GDX | 2022-06-10 14:00Z | 2022-07-21 13:31Z | maximum hold | −$19,082.67 | −$19,082.67 | −$20,557.79 |
| D1:GDX | 2022-07-22 14:01Z | 2022-08-30 13:31Z | maximum hold | −$8,213.32 | −$8,213.32 | −$8,174.61 |
| D1:GDX | 2022-09-02 13:31Z | 2022-09-15 14:52Z | trailing stop | $993.63 | $993.63 | −$1,197.61 |
| D1:GDX | 2022-09-16 14:00Z | 2022-10-10 13:30Z | trailing stop gap | −$9,216.51 | $699.37 | −$9,216.51 |

Refused decisions inside the window: 2022-02-24 16:12Z D1:VGT (continuation) ← D1:GDX; 2022-05-23 13:42Z D1:VGT (deep) ← D1:GDX; 2022-06-15 18:44Z D1:VGT (deep) ← D1:GDX.

Episode 2: peak 2022-01-03 14:37Z → trough 2022-01-03 14:50Z (recovered 2022-01-03 20:15Z): **$1,922.05**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2020-11-03 16:01Z | 2022-01-24 14:30Z | trailing stop gap | −$1,922.05 | $15,325.31 | −$1,005.28 |

### C23 → 2024-01-02 → 2024-12-31: `C23/ses/indep/R5/V2#1 profit` — slice $4,627.88, DD $20,299.72

Sessions held at the close (of 252): flat 142, G:VGT 26, D1:VGT 84. Refusals in the slice: 2 (G:VGT ← D1:VGT ×2).

Carried across the cutoff: G:VGT lot entered 2023-12-11 14:30Z at $466.24, marked **$3,266.06** at 2023-12-29 (1.62% of the training net $201,920.45); market value $103,809.20 = 1.04× its $100,000 principal; slice change −$3,919.82; exit 2024-01-03 14:31Z (maximum hold).

Episode 1: peak 2024-05-28 17:40Z → trough 2024-08-05 13:30Z (recovered —): **$20,299.72**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2024-04-18 14:46Z | 2024-05-31 14:35Z | trailing stop | −$5,024.44 | $4,513.91 | −$4,001.85 |
| D1:VGT | 2024-07-18 19:49Z | 2024-08-22 13:32Z | maximum hold | −$15,275.28 | −$418.60 | −$15,275.28 |

Episode 2: peak 2024-02-12 16:38Z → trough 2024-04-19 19:46Z (recovered 2024-05-15 13:32Z): **$9,244.96**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2024-01-08 14:36Z | 2024-02-20 15:01Z | trailing stop | −$5,243.11 | $6,162.52 | −$45.68 |
| D1:VGT | 2024-04-18 14:46Z | 2024-05-31 14:35Z | trailing stop | −$4,001.85 | $4,513.91 | −$4,001.85 |

## Shadow eligibility B1, fresh joint (calendar; V only; 3 toggles searched; 32 replicates × V1–V3)

### C19 → 2020-01-02 → 2021-12-31: `C19/B1/R21/V2#1 profit` — slice $89,021.67, DD $48,255.05

Sessions held at the close (of 505): flat 0, D1:VGT 167, G:VGT 337, D1:GDX 1. Refusals in the slice: 52 (D1:GDX ← G:VGT ×30; D1:VGT ← G:VGT ×2; D1:GDX ← D1:VGT ×18; D1:VGT ← D1:VGT ×1; G:VGT ← D1:VGT ×1).

Carried across the cutoff: D1:VGT lot entered 2018-12-26 20:40Z at $162.41, marked **$39,608.65** at 2019-12-31 (26.63% of the training net $148,747.23); market value $150,760.42 = 1.51× its $100,000 principal; slice change −$6,286.52; exit 2020-02-27 14:30Z (trailing stop).

Episode 1: peak 2020-02-19 17:49Z → trough 2020-03-16 13:53Z (recovered 2020-04-07 13:30Z): **$48,255.05** (> $35,000).

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2018-12-26 20:40Z | 2020-02-27 14:30Z | trailing stop | −$22,553.39 | $33,322.13 | −$2,538.45 |
| G:VGT | 2020-02-27 14:31Z | 2020-03-16 13:45Z | maximum hold | −$20,805.98 | −$20,805.98 | −$19,930.74 |
| D1:GDX | 2020-03-16 13:46Z | 2020-03-17 13:30Z | trailing stop gap | −$4,895.68 | $28,987.98 | −$4,895.68 |

Refused decisions inside the window: 2020-02-28 14:38Z D1:GDX (deep) ← G:VGT; 2020-03-05 17:27Z D1:GDX (deep) ← G:VGT; 2020-03-09 15:49Z D1:VGT (continuation) ← G:VGT; 2020-03-12 13:58Z D1:GDX (deep) ← G:VGT.

Episode 2: peak 2020-09-02 13:30Z → trough 2020-09-21 14:40Z (recovered 2021-02-11 14:30Z): **$24,819.35**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2020-03-17 13:31Z | 2020-09-18 16:42Z | trailing stop | −$23,068.44 | $46,566.31 | −$7,721.71 |
| G:VGT | 2020-09-18 16:43Z | open | — | −$1,750.90 | $40,559.88 | −$1,750.90 |

Refused decisions inside the window: 2020-09-02 15:00Z D1:GDX (deep) ← D1:VGT.

### C21 → 2022-01-03 → 2023-12-29: `C21/B1/R9/V3#1 profit` — slice −$23,908.85, DD $79,663.64

Sessions held at the close (of 501): flat 82, D1:VGT 345, D1:GDX 74. Refusals in the slice: 9 (D1:GDX ← D1:VGT ×3; D1:VGT ← D1:GDX ×5; G:VGT ← D1:VGT ×1).

Carried across the cutoff: D1:VGT lot entered 2020-03-23 13:33Z at $185.82, marked **$127,035.59** at 2021-12-31 (52.64% of the training net $241,331.83); market value $246,566.57 = 2.47× its $100,000 principal; slice change −$35,426.96; exit 2022-01-24 14:30Z (trailing stop gap).

Episode 1: peak 2022-01-04 14:30Z → trough 2022-09-28 13:56Z (recovered —): **$79,663.64** (> $35,000).

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2020-03-23 13:33Z | 2022-01-24 14:30Z | trailing stop gap | −$37,749.61 | $91,608.64 | −$3,321.28 |
| D1:VGT | 2022-02-18 18:48Z | 2022-03-04 14:31Z | maximum hold | −$840.79 | −$840.79 | −$7,085.09 |
| D1:VGT | 2022-03-08 14:36Z | 2022-04-25 13:31Z | maximum hold | −$2,944.19 | −$2,944.19 | −$2,834.67 |
| D1:VGT | 2022-04-26 16:22Z | 2022-05-10 13:31Z | maximum hold | −$3,767.43 | −$3,767.43 | −$6,716.58 |
| D1:VGT | 2022-05-11 13:42Z | 2022-05-25 13:31Z | maximum hold | −$3,927.75 | −$3,927.75 | −$6,638.54 |
| D1:VGT | 2022-05-26 13:35Z | 2022-06-13 13:31Z | maximum hold | −$5,155.14 | −$5,155.14 | −$5,165.68 |
| D1:VGT | 2022-06-14 13:55Z | 2022-07-01 13:31Z | maximum hold | $293.07 | $293.07 | −$3,090.42 |
| D1:GDX | 2022-07-01 15:07Z | 2022-07-11 13:31Z | maximum hold | −$4,754.11 | −$4,754.11 | −$7,143.62 |
| D1:GDX | 2022-07-13 15:12Z | 2022-07-21 13:31Z | maximum hold | −$6,697.32 | −$6,697.32 | −$8,406.22 |
| D1:GDX | 2022-07-27 18:42Z | 2022-08-17 13:42Z | trailing stop | $1,673.43 | $1,673.43 | −$889.30 |
| D1:GDX | 2022-08-23 13:49Z | 2022-08-31 13:31Z | maximum hold | −$7,884.70 | −$7,884.70 | −$8,116.50 |
| D1:GDX | 2022-09-02 14:42Z | 2022-09-15 13:30Z | trailing stop gap | $591.87 | $591.87 | −$2,890.18 |
| D1:GDX | 2022-09-16 14:30Z | 2022-09-26 13:31Z | maximum hold | −$8,276.74 | −$8,276.74 | −$8,367.78 |
| D1:GDX | 2022-09-28 13:48Z | 2022-10-07 14:03Z | trailing stop | −$224.22 | $7,156.48 | −$224.22 |

Refused decisions inside the window: 2022-06-16 15:23Z D1:GDX (deep) ← D1:VGT; 2022-07-05 13:47Z D1:VGT (deep) ← D1:GDX; 2022-09-19 13:44Z D1:VGT (deep) ← D1:GDX.

Episode 2: peak 2022-01-03 14:37Z → trough 2022-01-03 14:50Z (recovered 2022-01-03 20:15Z): **$3,161.63**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2020-03-23 13:33Z | 2022-01-24 14:30Z | trailing stop gap | −$3,161.63 | $91,608.64 | −$3,321.28 |

### C23 → 2024-01-02 → 2024-12-31: `C23/B1/R5/V3#1 profit` — slice $6,494.57, DD $14,520.92

Sessions held at the close (of 252): flat 0, G:VGT 252. Refusals in the slice: 0 (none).

Carried across the cutoff: G:VGT lot entered 2023-11-02 13:30Z at $419.54, marked **$13,646.73** at 2023-12-29 (5.92% of the training net $230,641.99); market value $115,364.45 = 1.15× its $100,000 principal; slice change $6,494.57; exit open (trailing stop).

Episode 1: peak 2024-03-08 15:30Z → trough 2024-04-19 19:46Z (recovered —): **$14,520.92**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| G:VGT | 2023-11-02 13:30Z | open | trailing stop | −$14,520.92 | $20,141.30 | −$252.58 |

Episode 2: peak 2024-02-12 16:38Z → trough 2024-02-21 19:44Z (recovered 2024-03-01 18:09Z): **$7,445.76**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| G:VGT | 2023-11-02 13:30Z | open | trailing stop | −$7,445.76 | $20,141.30 | −$252.58 |

## Shadow eligibility B2, fresh sequential (D1 pair + toggles, then Growth·VGT; 8 replicates per step)

### C19 → 2020-01-02 → 2021-12-31: `C19/B2-g/F1/R8/V3#1 profit` — slice $48,104.08, DD $44,645.13

Sessions held at the close (of 505): flat 265, D1:VGT 173, G:VGT 2, D1:GDX 65. Refusals in the slice: 8 (G:VGT ← D1:VGT ×1; D1:VGT ← G:VGT ×1; D1:GDX ← D1:VGT ×4; D1:VGT ← D1:GDX ×2).

Carried across the cutoff: D1:VGT lot entered 2019-10-03 14:27Z at $208.77, marked **$14,599.80** at 2019-12-31 (13.49% of the training net $108,245.31); market value $117,282.18 = 1.17× its $100,000 principal; slice change $1,793.10; exit 2020-02-24 14:30Z (trailing stop gap).

Episode 1: peak 2020-02-19 17:49Z → trough 2020-03-16 13:53Z (recovered 2020-03-17 14:17Z): **$44,645.13** (> $35,000).

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2019-10-03 14:27Z | 2020-02-24 14:30Z | trailing stop gap | −$10,526.96 | $16,392.90 | −$163.02 |
| D1:VGT | 2020-02-25 19:55Z | 2020-03-02 14:31Z | maximum hold | −$3,401.26 | −$3,401.26 | −$9,215.74 |
| G:VGT | 2020-03-02 14:32Z | 2020-03-04 14:37Z | trailing stop | $852.23 | $852.23 | −$1,984.20 |
| D1:VGT | 2020-03-04 14:38Z | 2020-03-09 13:31Z | maximum hold | −$10,791.40 | −$10,791.40 | −$10,833.38 |
| D1:VGT | 2020-03-10 14:03Z | 2020-03-16 13:45Z | maximum hold | −$15,274.89 | −$15,274.89 | −$14,342.91 |
| D1:GDX | 2020-03-16 13:47Z | 2020-03-18 13:30Z | trailing stop | −$5,502.85 | $37,861.40 | −$5,502.85 |

Refused decisions inside the window: 2020-02-25 20:01Z G:VGT (continuation) ← D1:VGT; 2020-03-03 15:01Z D1:VGT (deep) ← G:VGT; 2020-03-12 13:58Z D1:GDX (deep) ← D1:VGT.

Episode 2: peak 2020-06-10 19:30Z → trough 2020-09-24 13:34Z (recovered 2021-04-09 14:10Z): **$19,771.19**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2020-05-14 14:11Z | 2020-06-11 19:30Z | trailing stop | −$7,485.54 | $7,532.75 | −$665.39 |
| D1:VGT | 2020-09-03 15:27Z | 2020-09-08 13:31Z | maximum hold | −$6,114.99 | −$6,114.99 | −$6,320.74 |
| D1:VGT | 2020-09-09 14:01Z | 2020-09-14 13:31Z | maximum hold | −$817.56 | −$817.56 | −$3,633.91 |
| D1:VGT | 2020-09-17 13:37Z | 2020-09-21 13:31Z | maximum hold | −$2,481.48 | −$2,481.48 | −$2,559.42 |
| D1:VGT | 2020-09-22 14:15Z | 2020-10-26 15:03Z | trailing stop | −$2,871.62 | $2,407.51 | −$2,871.62 |

### C21 → 2022-01-03 → 2023-12-29: `C21/B2-g/F1/R7/V2#1 profit` — slice −$63,611.93, DD $74,307.21

Sessions held at the close (of 501): flat 277, D1:VGT 30, G:VGT 82, D1:GDX 112. Refusals in the slice: 11 (G:VGT ← D1:GDX ×4; D1:GDX ← G:VGT ×6; D1:GDX ← D1:GDX ×1).

Carried across the cutoff: D1:VGT lot entered 2020-03-18 13:31Z at $191.09, marked **$120,092.80** at 2021-12-31 (48.36% of the training net $248,305.56); market value $239,766.60 = 2.4× its $100,000 principal; slice change −$34,470.98; exit 2022-01-24 14:30Z (trailing stop gap).

Episode 1: peak 2022-01-04 14:30Z → trough 2022-09-01 15:00Z (recovered —): **$74,307.21** (> $35,000).

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2020-03-18 13:31Z | 2022-01-24 14:30Z | trailing stop gap | −$36,726.33 | $85,621.83 | −$6,135.18 |
| D1:VGT | 2022-01-28 16:59Z | 2022-02-22 14:31Z | maximum hold | −$3,358.43 | −$3,358.43 | −$3,375.36 |
| G:VGT | 2022-03-29 13:30Z | 2022-04-25 13:31Z | maximum hold | −$13,747.65 | −$13,747.65 | −$13,650.84 |
| D1:GDX | 2022-06-14 19:28Z | 2022-06-23 16:36Z | buffered intraday loss | −$2,640.10 | −$2,640.10 | −$2,557.38 |
| D1:GDX | 2022-06-24 13:33Z | 2022-06-30 13:31Z | maximum hold | −$2,800.71 | −$2,800.71 | −$2,808.20 |
| D1:GDX | 2022-07-01 13:32Z | 2022-07-07 13:31Z | maximum hold | −$372.66 | −$372.66 | −$4,337.66 |
| D1:GDX | 2022-07-08 13:37Z | 2022-07-14 13:31Z | maximum hold | −$5,319.91 | −$5,319.91 | −$5,199.23 |
| D1:GDX | 2022-07-15 13:35Z | 2022-07-21 13:31Z | maximum hold | −$846.50 | −$846.50 | −$1,787.05 |
| D1:GDX | 2022-07-22 13:33Z | 2022-08-03 13:31Z | maximum hold | −$691.87 | −$691.87 | −$6,452.64 |
| G:VGT | 2022-08-03 13:33Z | 2022-08-22 13:35Z | trailing stop | $254.92 | $254.92 | −$465.26 |
| D1:GDX | 2022-08-22 13:36Z | 2022-08-29 13:31Z | maximum hold | −$1,669.01 | −$1,669.01 | −$1,659.67 |
| D1:GDX | 2022-08-30 13:35Z | 2022-09-06 13:31Z | maximum hold | −$6,388.96 | −$2,676.97 | −$6,388.96 |

Refused decisions inside the window: 2022-07-28 20:00Z G:VGT (rise) ← D1:GDX; 2022-08-04 13:38Z D1:GDX (deep) ← G:VGT; 2022-08-22 13:32Z D1:GDX (deep) ← G:VGT.

Episode 2: peak 2022-01-03 14:37Z → trough 2022-01-03 14:50Z (recovered 2022-01-03 20:15Z): **$3,074.54**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:VGT | 2020-03-18 13:31Z | 2022-01-24 14:30Z | trailing stop gap | −$3,074.54 | $85,621.83 | −$6,135.18 |

### C23 → 2024-01-02 → 2024-12-31: `C23/B2-g/F1/R8/V3#1 profit` — slice $4,141.11, DD $34,117.37

Sessions held at the close (of 252): flat 101, G:VGT 151. Refusals in the slice: 0 (none).

Carried across the cutoff: G:VGT lot entered 2023-01-23 14:30Z at $339.60, marked **$32,274.16** at 2023-12-29 (12.32% of the training net $262,019.94); market value $142,520.61 = 1.43× its $100,000 principal; slice change $4,141.11; exit 2024-08-08 13:30Z (trailing stop gap + trend exit).

Episode 1: peak 2024-07-15 15:21Z → trough 2024-08-05 13:30Z (recovered —): **$34,117.37**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| G:VGT | 2023-01-23 14:30Z | 2024-08-08 13:30Z | trailing stop gap + trend exit | −$34,117.37 | $36,415.26 | −$1,030.45 |

Episode 2: peak 2024-03-08 15:30Z → trough 2024-04-19 19:46Z (recovered 2024-05-23 13:30Z): **$18,394.74**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| G:VGT | 2023-01-23 14:30Z | 2024-08-08 13:30Z | trailing stop gap + trend exit | −$18,394.74 | $36,415.26 | −$1,030.45 |

## New L0 (fixed; chosen with later data — descriptive only)

### C19 → 2020-01-02 → 2021-12-31: `control: NL0` — slice $171,402.70, DD $17,280.74

Sessions held at the close (of 505): flat 121, G:VGT 123, D1:GDX 76, D1:VGT 185. Refusals in the slice: 6 (D1:VGT ← D1:GDX ×2; G:VGT ← D1:VGT ×1; D1:GDX ← D1:VGT ×1; D1:GDX ← G:VGT ×2).

Carried across the cutoff: G:VGT lot entered 2019-10-10 13:30Z at $214.07, marked **$11,908.86** at 2019-12-31 (14.89% of the training net $79,970.17); market value $114,378.47 = 1.14× its $100,000 principal; slice change $1,707.73; exit 2020-02-24 14:30Z (trailing stop gap).

Episode 1: peak 2020-03-19 19:26Z → trough 2020-03-19 20:00Z (recovered 2020-03-24 13:30Z): **$17,280.74**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:GDX | 2020-03-19 13:32Z | 2020-03-20 13:30Z | trailing stop gap | −$17,280.74 | $10,921.13 | −$5,590.55 |

Episode 2: peak 2020-03-17 15:14Z → trough 2020-03-19 13:41Z (recovered 2020-03-19 18:39Z): **$14,488.14**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:GDX | 2020-03-16 13:46Z | 2020-03-18 13:30Z | trailing stop | −$8,897.59 | $38,895.56 | −$4,895.68 |
| D1:GDX | 2020-03-19 13:32Z | 2020-03-20 13:30Z | trailing stop gap | −$5,590.55 | $10,921.13 | −$5,590.55 |

### C21 → 2022-01-03 → 2023-12-29: `control: NL0` — slice $87,238.48, DD $19,459.83

Sessions held at the close (of 501): flat 203, D1:GDX 208, D1:VGT 51, G:VGT 39. Refusals in the slice: 11 (D1:VGT ← D1:GDX ×4; D1:GDX ← D1:VGT ×6; G:VGT ← D1:GDX ×1).

Carried across the cutoff: D1:GDX lot entered 2021-12-15 19:03Z at $28.99, marked **$9,987.07** at 2021-12-31 (3.97% of the training net $251,372.87); market value $110,486.37 = 1.1× its $100,000 principal; slice change −$6,825.65; exit 2022-01-06 14:31Z (trailing stop).

Episode 1: peak 2023-01-25 20:49Z → trough 2023-02-24 14:30Z (recovered 2023-03-23 15:41Z): **$19,459.83**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:GDX | 2022-12-16 14:33Z | 2023-02-03 14:30Z | trailing stop gap | −$9,124.10 | $7,624.19 | −$2,530.26 |
| D1:GDX | 2023-02-06 14:42Z | 2023-02-21 14:31Z | maximum hold | −$6,455.48 | −$6,455.48 | −$8,046.67 |
| D1:GDX | 2023-02-22 14:32Z | 2023-03-07 14:31Z | maximum hold | −$3,880.25 | −$365.53 | −$3,880.25 |

Episode 2: peak 2022-10-04 16:29Z → trough 2022-11-03 18:05Z (recovered 2022-11-08 15:31Z): **$15,243.93**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:GDX | 2022-09-30 13:32Z | 2022-10-07 19:15Z | trailing stop | −$6,802.71 | $2,916.56 | −$912.70 |
| D1:GDX | 2022-10-10 13:32Z | 2022-10-24 13:31Z | maximum hold | −$1,622.64 | −$1,622.64 | −$6,540.51 |
| D1:GDX | 2022-10-25 13:32Z | 2022-12-15 16:05Z | trailing stop | −$6,818.58 | $16,759.75 | −$6,818.58 |

Refused decisions inside the window: 2022-10-13 13:50Z D1:VGT (deep) ← D1:GDX.

### C23 → 2024-01-02 → 2024-12-31: `control: NL0` — slice $44,110.10, DD $9,105.84

Sessions held at the close (of 252): flat 127, G:VGT 93, D1:GDX 32. Refusals in the slice: 1 (D1:GDX ← G:VGT ×1).

Carried across the cutoff: G:VGT lot entered 2023-11-03 13:30Z at $422.06, marked **$12,987.72** at 2023-12-29 (3.84% of the training net $338,611.35); market value $114,675.64 = 1.15× its $100,000 principal; slice change $610.87; exit 2024-02-21 19:41Z (trailing stop).

Episode 1: peak 2024-04-12 15:04Z → trough 2024-05-01 16:01Z (recovered 2024-05-15 16:33Z): **$9,105.84**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| D1:GDX | 2024-02-28 14:32Z | 2024-04-15 13:42Z | trailing stop | −$8,589.76 | $28,649.53 | −$437.68 |
| G:VGT | 2024-04-23 13:30Z | 2024-07-18 15:33Z | trailing stop | −$516.08 | $14,849.70 | −$516.08 |

Episode 2: peak 2024-02-12 16:38Z → trough 2024-02-28 19:40Z (recovered 2024-03-04 14:31Z): **$7,860.28**.

| Lot (book) | Entry | Exit | Exit reason | Change in window | Lot net | Lot MAE |
|---|---:|---:|---:|---:|---:|---:|
| G:VGT | 2023-11-03 13:30Z | 2024-02-21 19:41Z | trailing stop | −$7,422.60 | $13,598.59 | −$182.66 |
| D1:GDX | 2024-02-28 14:32Z | 2024-04-15 13:42Z | trailing stop | −$437.68 | $28,649.53 | −$437.68 |

Refused decisions inside the window: 2024-02-13 14:54Z D1:GDX (deep) ← G:VGT.

