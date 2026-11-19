# Stage 1 reproduction, parity gates and failure attribution

Generated from the sealed records by `tools/optimization-process-audit/tables.ts`. Dollars to the cent; DD = maximum minute drawdown of the marked net on the fixed $100,000 budget.

| Gate | Checks | Passed |
|---|---:|---:|
| G1 | 4 | 4 |
| G2 | 18 | 18 |
| G3 | 8 | 8 |
| G4 | 8 | 8 |
| G5 | 29 | 29 |
| G6 | 21 | 21 |
| G7 | 6 | 0 |

G7 failed only by a comparison bug (amendment A1); the sealed recheck `g7-recheck.json` passes 6 of 6.

### Published fold role holders on their next slice (reruns equal to the sealed fold evaluations)

| Subject / cutoff | Member | Roles | Training net | Training lots / episodes | Top-episode share | Selection p90 DD | Slice P&L | Slice DD | Slice DD peak → trough | Recovery | Slice exposure | Slice lots | Costs (lots) | Interest (lots) |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 3B C19 | B_GDX-breakout_VGT-breakout#1 profit | actual-profit | $162,277.41 | 17 / 4 | 46% | $32,047.12 | $14,619.98 | $60,874.87 | 2020-02-19 17:49Z → 2020-03-17 13:44Z | 2021-11-22 14:53Z | 80% | 31 | $3,088.22 | $28,606.00 |
| 3B C19 | B_GDX-breakout_VGT-breakout#3 balanced | robust-profit | $135,958.30 | 13 / 5 | 31% | $20,273.22 | $15,280.03 | $68,795.52 | 2020-02-19 17:49Z → 2020-03-20 19:59Z | 2021-11-19 16:37Z | 96% | 8 | $775.47 | $29,293.15 |
| 3B C19 | V_VGT-breakout#2 robust | balanced | $140,670.03 | 15 / 5 | 30% | $17,325.71 | −$6,689.23 | $55,168.42 | 2020-09-02 13:30Z → 2021-09-29 18:06Z | not recovered | 83% | 18 | $1,780.60 | $29,745.23 |
| 3B C19 | B_GDX-rise_VGT-breakout#1 profit | lower-drawdown | $118,374.81 | 6 / 3 | 45% | $14,771.81 | $9,461.60 | $53,347.94 | 2020-02-19 17:49Z → 2020-03-16 13:53Z | 2020-04-13 18:07Z | 76% | 29 | $2,869.32 | $19,679.49 |
| 4A C19 | indep-rise#1 profit | actual-profit | $79,776.54 | 5 / 3 | 92% | $33,344.06 | −$3,143.02 | $21,815.07 | 2020-03-17 15:14Z → 2020-07-14 13:30Z | 2020-08-05 14:26Z | 12% | 4 | $399.83 | $2,802.75 |
| 4A C19 | indep-rise#2 robust | robust-profit, balanced | $59,773.39 | 15 / 6 | 50% | $27,026.90 | −$28,644.28 | $38,770.96 | 2020-01-03 14:30Z → 2021-09-29 18:06Z | not recovered | 24% | 10 | $993.37 | $6,239.86 |
| 4A C19 | indep-breakout#3 balanced | lower-drawdown | $23,806.29 | 2 / 2 | 103% | $19,713.12 | −$11,294.63 | $28,170.20 | 2020-08-05 14:33Z → 2021-01-12 14:34Z | not recovered | 43% | 3 | $311.51 | $9,689.04 |
| 3B C21 | G_GDX-rise#1 profit | actual-profit | $264,501.50 | 21 / 6 | 64% | $26,842.57 | −$14,870.14 | $57,075.51 | 2022-01-04 14:30Z → 2022-09-01 15:00Z | not recovered | 46% | 27 | $2,756.13 | $29,353.43 |
| 3B C21 | V_VGT-rise#2 robust | robust-profit, balanced | $236,134.86 | 8 / 3 | 71% | $22,132.24 | −$25,503.96 | $58,846.72 | 2022-01-04 14:30Z → 2022-10-13 13:32Z | not recovered | 91% | 2 | $185.92 | $37,056.43 |
| 3B C21 | G_GDX-rise#3 balanced | lower-drawdown | $180,388.45 | 24 / 15 | 54% | $17,280.74 | −$3,715.97 | $28,644.51 | 2022-08-15 19:21Z → 2022-10-13 13:32Z | 2022-12-01 14:30Z | 37% | 13 | $1,305.26 | $9,161.67 |
| 4A C21 | indep-rise#4 profit order | actual-profit | $127,595.98 | 25 / 16 | 73% | $32,563.46 | −$15,359.64 | $47,820.43 | 2022-02-24 14:30Z → 2022-09-29 14:19Z | not recovered | 33% | 14 | $1,395.95 | $7,293.14 |
| 4A C21 | indep-rise#2 robust | robust-profit | $90,790.54 | 7 / 2 | 98% | $28,162.95 | $302.38 | $19,813.53 | 2023-01-25 20:49Z → 2023-02-24 14:30Z | not recovered | 16% | 6 | $602.95 | $3,917.82 |
| 4A C21 | indep-rise#3 balanced | balanced | $86,100.68 | 6 / 2 | 102% | $20,665.18 | $492.88 | $12,524.77 | 2022-10-04 16:29Z → 2022-10-14 18:22Z | not recovered | 2% | 2 | $200.50 | $512.33 |
| 4A C21 | indep-breakout#2 robust | lower-drawdown | $62,649.48 | 5 / 2 | 104% | $16,589.20 | −$8,473.76 | $10,957.64 | 2022-04-18 14:00Z → 2023-04-27 13:30Z | not recovered | 4% | 2 | $196.20 | $873.97 |
| 3B C23 | B_GDX-rise_VGT-rise#1 profit | actual-profit | $295,264.76 | 26 / 14 | 38% | $24,865.32 | $13,505.87 | $12,639.84 | 2024-07-15 15:21Z → 2024-11-14 14:30Z | not recovered | 62% | 3 | $317.60 | $8,679.45 |
| 3B C23 | V_VGT-breakout#2 robust | robust-profit | $222,395.91 | 13 / 5 | 56% | $31,874.59 | $5,504.11 | $21,345.78 | 2024-07-15 15:21Z → 2024-08-05 13:30Z | not recovered | 86% | 2 | $160.04 | $10,415.34 |
| 3B C23 | B_GDX-breakout_VGT-breakout#2 robust | balanced | $240,789.83 | 18 / 11 | 54% | $17,736.54 | −$17,613.65 | $23,362.25 | 2024-03-08 15:30Z → 2024-11-18 14:56Z | not recovered | 61% | 8 | $796.50 | $7,353.42 |
| 3B C23 | G_GDX-rise#3 balanced | lower-drawdown | $153,419.90 | 12 / 7 | 77% | $17,684.86 | $0.00 | $0.00 | 1970-01-01 00:00Z → 1970-01-01 00:00Z | not recovered | 0% | 0 | $0.00 | $0.00 |
| 4A C23 | indep-rise#1 profit | actual-profit | $133,766.46 | 17 / 14 | 55% | $29,482.56 | $1,965.63 | $9,927.33 | 2024-02-07 14:49Z → 2024-02-28 19:40Z | 2024-03-04 16:10Z | 10% | 2 | $201.57 | $1,175.34 |
| 4A C23 | indep-rise#2 robust | robust-profit | $106,617.74 | 12 / 2 | 84% | $27,474.74 | $0.00 | $0.00 | 1970-01-01 00:00Z → 1970-01-01 00:00Z | not recovered | 0% | 0 | $0.00 | $0.00 |
| 4A C23 | indep-rise#3 balanced | balanced, lower-drawdown | $111,082.55 | 13 / 2 | 83% | $20,134.69 | $0.00 | $0.00 | 1970-01-01 00:00Z → 1970-01-01 00:00Z | not recovered | 0% | 0 | $0.00 | $0.00 |

### Positions open between the slice peak and trough (fold primaries; book, entry → exit, lot net)

| Subject / cutoff | Member | Lots |
|---|---|---:|
| 3B C19 | B_GDX-breakout_VGT-breakout#1 profit | D1:VGT 2018-12-26→2020-02-27 35229.28; D1:GDX 2020-02-28→2020-03-04 6731.85; D1:GDX 2020-03-05→2020-03-16 -42553.87; D1:GDX 2020-03-17→2020-03-18 6165.95 |
| 4A C19 | indep-rise#1 profit | G:GDX 2020-03-17→2020-03-18 1606.39; G:GDX 2020-05-08→2020-06-04 -4996.45; G:GDX 2020-07-08→2020-08-11 3662.11 |
| 3B C21 | G_GDX-rise#1 profit | D1:VGT 2020-04-06→2022-01-24 66479.67; D1:VGT 2022-02-24→2022-03-15 -3874.61; D1:VGT 2022-05-13→2022-06-10 -350.42; D1:GDX 2022-06-23→2022-06-29 -314.99; D1:GDX 2022-06-30→2022-07-05 -1766.94; D1:GDX 2022-07-06→2022-07-11 -1284.34; D1:GDX 2022-07-12→2022-07-18 -2487.47; D1:GDX 2022-07-19→2022-07-25 -2061.25; D1:GDX 2022-07-26→2022-08-17 2755.02; D1:GDX 2022-08-18→2022-08-22 -4163.41; D1:GDX 2022-08-23→2022-08-29 -3872.33; D1:GDX 2022-08-30→2022-09-06 -2673 |
| 4A C21 | indep-rise#4 profit order | G:GDX 2022-02-02→2022-02-25 9226.28; G:GDX 2022-04-25→2022-05-09 -7884.1; G:GDX 2022-05-16→2022-06-09 2604.25; G:GDX 2022-06-17→2022-06-30 -8931.43; G:GDX 2022-07-05→2022-07-14 -9108.98; G:GDX 2022-07-29→2022-08-30 -9653.86; G:GDX 2022-09-08→2022-09-13 1094.49; G:GDX 2022-09-20→2022-09-23 -7638.18; G:GDX 2022-09-29→2022-10-05 5805.95 |
| 3B C23 | B_GDX-rise_VGT-rise#1 profit | G:VGT 2024-04-23→2024-07-24 13041.78; D1:GDX 2024-11-13→2024-12-13 268.68 |
| 4A C23 | indep-rise#1 profit | G:GDX 2024-02-07→2024-02-13 -5602.4; G:GDX 2024-02-16→2024-03-20 7568.03 |

### Sequential paths recomputed (equal to the sealed records to the cent)

| Subject | Policy | Net | Switch charges | Sequential DD | Peak → trough | Recovery |
|---|---|---:|---:|---:|---:|---:|
| 3B | P0 role actual-profit | $13,105.71 | $150.00 | $60,874.87 | 2020-02-19 17:49Z → 2020-03-17 13:44Z | 2021-11-22 14:53Z |
| 3B | P0 role robust-profit | −$4,919.82 | $200.00 | $68,795.52 | 2020-02-19 17:49Z → 2020-03-20 19:59Z | 2021-11-19 16:37Z |
| 3B | P0 role balanced | −$50,006.84 | $200.00 | $97,510.12 | 2020-09-02 13:30Z → 2022-10-13 13:32Z | not recovered |
| 3B | P0 role lower-drawdown | $5,645.63 | $100.00 | $53,347.94 | 2020-02-19 17:49Z → 2020-03-16 13:53Z | 2020-04-13 18:07Z |
| 4A | P0 role actual-profit | −$16,537.03 | $0.00 | $47,820.43 | 2022-02-24 14:30Z → 2022-09-29 14:19Z | not recovered |
| 4A | P0 role robust-profit | −$28,391.90 | $50.00 | $38,770.96 | 2020-01-03 14:30Z → 2021-09-29 18:06Z | not recovered |
| 4A | P0 role balanced | −$28,151.40 | $0.00 | $38,770.96 | 2020-01-03 14:30Z → 2021-09-29 18:06Z | not recovered |
| 4A | P0 role lower-drawdown | −$19,768.39 | $0.00 | $36,643.97 | 2020-08-05 14:33Z → 2023-04-27 13:30Z | not recovered |
