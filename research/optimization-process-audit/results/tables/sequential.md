# Realizable policy test: slices, sequential paths (2020–2024) and the frozen decision rule

Generated from the sealed records by `tools/optimization-process-audit/tables.ts`. Dollars to the cent; DD = maximum minute drawdown of the marked net on the fixed $100,000 budget.

### Slice outcomes of each policy’s choice

| Subject / cutoff (slice) | Policy | Choice | Slice P&L | Slice DD | Δ vs P0 | New lots in slice | Sessions held in slice | Same as P0 | Rejected higher-net members: n / acceptable / better than the choice | Best rejected slice P&L |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|
| 3B C19 (2020–2021) | P0 | B_GDX-breakout_VGT-breakout#1 profit | $14,619.98 | $60,874.87 | $0.00 | 30 | 434 | yes | 0 / 0 / 0 | — |
| 3B C19 (2020–2021) | P1 | B_GDX-breakout_VGT-breakout#4 both Growth funded | −$4,286.80 | $60,976.68 | −$18,906.78 | 41 | 367 | no | 1 / 0 / 1 | $14,619.98 |
| 3B C19 (2020–2021) | P2 | B_GDX-breakout_VGT-breakout#2 robust | $17,259.15 | $61,303.02 | $2,639.17 | 36 | 403 | no | 3 / 0 / 0 | $14,619.98 |
| 3B C19 (2020–2021) | P3 | V_VGT-breakout#1 profit | −$14,088.97 | $60,460.04 | −$28,708.95 | 16 | 424 | no | 4 / 0 / 4 | $17,259.15 |
| 3B C21 (2022–2023) | P0 | G_GDX-rise#1 profit | −$14,870.14 | $57,075.51 | $0.00 | 26 | 258 | yes | 0 / 0 / 0 | — |
| 3B C21 (2022–2023) | P1 | G_GDX-rise#1 profit | −$14,870.14 | $57,075.51 | $0.00 | 26 | 258 | yes | 0 / 0 / 0 | — |
| 3B C21 (2022–2023) | P2 | B_GDX-breakout_VGT-breakout#4 profit order | −$30,744.23 | $64,037.14 | −$15,874.09 | 1 | 456 | no | 8 / 2 / 7 | $32,778.03 |
| 3B C21 (2022–2023) | P3 | V_VGT-rise#1 profit | −$2,168.12 | $34,812.85 | $12,702.02 | 10 | 243 | no | 1 / 0 / 0 | −$14,870.14 |
| 3B C23 (2024) | P0 | B_GDX-rise_VGT-rise#1 profit | $13,505.87 | $12,639.84 | $0.00 | 2 | 160 | yes | 0 / 0 / 0 | — |
| 3B C23 (2024) | P1 | B_GDX-rise_VGT-rise#1 profit | $13,505.87 | $12,639.84 | $0.00 | 2 | 160 | yes | 0 / 0 / 0 | — |
| 3B C23 (2024) | P2 | B_GDX-rise_VGT-rise#1 profit | $13,505.87 | $12,639.84 | $0.00 | 2 | 160 | yes | 0 / 0 / 0 | — |
| 3B C23 (2024) | P3 | B_GDX-rise_VGT-rise#1 profit | $13,505.87 | $12,639.84 | $0.00 | 2 | 160 | yes | 0 / 0 / 0 | — |
| 4A C19 (2020–2021) | P0 | indep-rise#1 profit | −$3,143.02 | $21,815.07 | $0.00 | 4 | 67 | yes | 0 / 0 / 0 | — |
| 4A C19 (2020–2021) | P1 | indep-rise#4 exits-alternative | $3,472.46 | $50,556.63 | $6,615.48 | 9 | 107 | no | 1 / 0 / 0 | −$3,143.02 |
| 4A C19 (2020–2021) | P2 | indep-rise#2 robust | −$28,644.28 | $38,770.96 | −$25,501.26 | 9 | 132 | no | 3 / 1 / 3 | $48,068.37 |
| 4A C19 (2020–2021) | P3 | indep-rise#4 exits-alternative | $3,472.46 | $50,556.63 | $6,615.48 | 9 | 107 | no | 1 / 0 / 0 | −$3,143.02 |
| 4A C21 (2022–2023) | P0 | indep-rise#4 profit order | −$15,359.64 | $47,820.43 | $0.00 | 14 | 180 | yes | 0 / 0 / 0 | — |
| 4A C21 (2022–2023) | P1 | indep-rise#2 robust | $302.38 | $19,813.53 | $15,662.02 | 5 | 84 | no | 1 / 0 / 0 | −$15,359.64 |
| 4A C21 (2022–2023) | P2 | indep-rise#4 profit order | −$15,359.64 | $47,820.43 | $0.00 | 14 | 180 | yes | 0 / 0 / 0 | — |
| 4A C21 (2022–2023) | P3 | indep-rise#4 profit order | −$15,359.64 | $47,820.43 | $0.00 | 14 | 180 | yes | 0 / 0 / 0 | — |
| 4A C23 (2024) | P0 | indep-rise#1 profit | $1,965.63 | $9,927.33 | $0.00 | 2 | 28 | yes | 0 / 0 / 0 | — |
| 4A C23 (2024) | P1 | indep-rise#1 profit | $1,965.63 | $9,927.33 | $0.00 | 2 | 28 | yes | 0 / 0 / 0 | — |
| 4A C23 (2024) | P2 | indep-rise#1 profit | $1,965.63 | $9,927.33 | $0.00 | 2 | 28 | yes | 0 / 0 / 0 | — |
| 4A C23 (2024) | P3 | indep-rise#1 profit | $1,965.63 | $9,927.33 | $0.00 | 2 | 28 | yes | 0 / 0 / 0 | — |

### Sequential paths (switch charges included; roles are contextual controls, already published)

| Subject | Policy | 2020–2021 P&L / DD | 2022–2023 P&L / DD | 2024 P&L / DD | Charges | Sequential net | Sequential DD | Peak → trough | Recovery | DD ≤ $35,000 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 3B | P0 | $14,619.98 / $60,874.87 | −$14,870.14 / $57,075.51 | $13,505.87 / $12,639.84 | $150.00 | $13,105.71 | $60,874.87 | 2020-02-19 17:49Z → 2020-03-17 13:44Z | 2021-11-22 14:53Z | no |
| 4A | P0 | −$3,143.02 / $21,815.07 | −$15,359.64 / $47,820.43 | $1,965.63 / $9,927.33 | $0.00 | −$16,537.03 | $47,820.43 | 2022-02-24 14:30Z → 2022-09-29 14:19Z | not recovered | no |
| 3B | P1 | −$4,286.80 / $60,976.68 | −$14,870.14 / $57,075.51 | $13,505.87 / $12,639.84 | $150.00 | −$5,801.07 | $72,409.73 | 2020-11-06 14:30Z → 2022-09-01 15:00Z | not recovered | no |
| 4A | P1 | $3,472.46 / $50,556.63 | $302.38 / $19,813.53 | $1,965.63 / $9,927.33 | $50.00 | $5,690.47 | $52,563.02 | 2020-03-17 15:14Z → 2024-02-28 19:40Z | not recovered | no |
| 3B | P2 | $17,259.15 / $61,303.02 | −$30,744.23 / $64,037.14 | $13,505.87 / $12,639.84 | $200.00 | −$179.21 | $64,917.86 | 2021-11-22 15:23Z → 2022-10-13 13:32Z | not recovered | no |
| 4A | P2 | −$28,644.28 / $38,770.96 | −$15,359.64 / $47,820.43 | $1,965.63 / $9,927.33 | $0.00 | −$42,038.29 | $59,670.10 | 2020-01-03 14:30Z → 2022-09-29 14:19Z | not recovered | no |
| 3B | P3 | −$14,088.97 / $60,460.04 | −$2,168.12 / $34,812.85 | $13,505.87 / $12,639.84 | $150.00 | −$2,901.22 | $77,667.98 | 2020-09-02 13:30Z → 2022-09-26 17:39Z | not recovered | no |
| 4A | P3 | $3,472.46 / $50,556.63 | −$15,359.64 / $47,820.43 | $1,965.63 / $9,927.33 | $0.00 | −$9,921.55 | $72,510.84 | 2020-03-17 15:14Z → 2022-09-29 14:19Z | not recovered | no |
| 3B | role robust-profit (context) | $15,280.03 / $68,795.52 | −$25,503.96 / $58,846.72 | $5,504.11 / $21,345.78 | $200.00 | −$4,919.82 | $68,795.52 | 2020-02-19 17:49Z → 2020-03-20 19:59Z | 2021-11-19 16:37Z | no |
| 4A | role robust-profit (context) | −$28,644.28 / $38,770.96 | $302.38 / $19,813.53 | $0.00 / $0.00 | $50.00 | −$28,391.90 | $38,770.96 | 2020-01-03 14:30Z → 2021-09-29 18:06Z | not recovered | no |
| 3B | role balanced (context) | −$6,689.23 / $55,168.42 | −$25,503.96 / $58,846.72 | −$17,613.65 / $23,362.25 | $200.00 | −$50,006.84 | $97,510.12 | 2020-09-02 13:30Z → 2022-10-13 13:32Z | not recovered | no |
| 4A | role balanced (context) | −$28,644.28 / $38,770.96 | $492.88 / $12,524.77 | $0.00 / $0.00 | $0.00 | −$28,151.40 | $38,770.96 | 2020-01-03 14:30Z → 2021-09-29 18:06Z | not recovered | no |
| 3B | role lower-drawdown (context) | $9,461.60 / $53,347.94 | −$3,715.97 / $28,644.51 | $0.00 / $0.00 | $100.00 | $5,645.63 | $53,347.94 | 2020-02-19 17:49Z → 2020-03-16 13:53Z | 2020-04-13 18:07Z | no |
| 4A | role lower-drawdown (context) | −$11,294.63 / $28,170.20 | −$8,473.76 / $10,957.64 | $0.00 / $0.00 | $0.00 | −$19,768.39 | $36,643.97 | 2020-08-05 14:33Z → 2023-04-27 13:30Z | not recovered | no |

### Frozen decision rule (M1 sequential DD ≤ $35,000; M2 net > max(P0, $0); M3 ≥ 2 of 3 slices ≥ P0 and no new slice breach; M4 ≥ 2 invested slices)

| Policy | Subject | M1 | M2 | M3 | M4 | Slices ≥ P0 | New slice breaches | Classification |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| P1 | 3B | fail | fail | pass | pass | 2 | — | no demonstrated improvement |
| P1 | 4A | fail | pass | fail | pass | 3 | C19 | no demonstrated improvement |
| P2 | 3B | fail | fail | pass | pass | 2 | — | no demonstrated improvement |
| P2 | 4A | fail | fail | fail | pass | 2 | C19 | no demonstrated improvement |
| P3 | 3B | fail | fail | pass | pass | 2 | — | no demonstrated improvement |
| P3 | 4A | fail | fail | fail | pass | 3 | C19 | no demonstrated improvement |

**Futility (PROTOCOL.md §7.6):** no experimental policy merits further confirmation, so FULL was not opened.
