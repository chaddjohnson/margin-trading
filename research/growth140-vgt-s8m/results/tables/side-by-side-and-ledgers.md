# Side by side: #4 and the frozen members (development and validation columns)

Development = 2016-01-04 → 2024-12-31 (the development door; equal to the continuous run up to the 2024 close). Validation = 2025-01-02 → 2026-10-30 of ONE continuous run from 2016: net = marked equity at 2026-10-30 − at the 2024-12-31 close; drawdown peak initialized at the boundary equity. Drawdown % is of the $100,000 notional. W/L/B = closed trades (validation: closed after the boundary, a carried-in trade included). Δ = minus #4.

| Configuration | Role | Dev net | Dev max minute DD | Dev W/L/B | Dev exposure | Dev Δ net | Dev Δ DD | Val net | Val max minute DD | Val W/L/B | Val exposure | Val Δ net | Val Δ DD | Validation status |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| #4 (control) | fixed control | $92,575.71 | $14,578.10 (14.58%) | 8/3/0 | 36.9% | — | — | $52,892.75 | $9,916.01 (9.92%) | 2/0/0 | 37.5% | — | — | fail (T5, T6) |
| C1 ec124684 | profit → profit (rank 1, modest) | $133,078.09 | $17,772.79 (17.77%) | 16/3/0 | 69.8% | +$40,502.38 | +$3,194.69 | −$28,619.47 | $34,405.71 (34.41%) | 4/3/0 | 64.3% | −$81,512.22 | +$24,489.70 | fail (T1, T2, T3, T4, T5) |
| C2 6f63defc | pareto → balanced (rank 2, modest) | $94,254.88 | $23,130.27 (23.13%) | 13/2/0 | 67.2% | +$1,679.17 | +$8,552.17 | −$1,115.71 | $22,274.17 (22.27%) | 3/2/0 | 74.7% | −$54,008.46 | +$12,358.16 | fail (T3, T4) |
| C3 37d37e1e | balanced → extra1 (rank 3, modest) | $100,862.16 | $20,505.33 (20.51%) | 13/0/0 | 68.1% | +$8,286.45 | +$5,927.23 | $19,348.96 | $38,962.16 (38.96%) | 4/0/0 | 95.6% | −$33,543.79 | +$29,046.15 | fail (T1, T2, T4, T6) |
| C4 1308a733 | robust → robust (rank 4, modest) | $122,372.48 | $20,114.11 (20.11%) | 22/5/0 | 67.3% | +$29,796.77 | +$5,536.01 | −$25,297.85 | $29,735.61 (29.74%) | 4/5/0 | 58.0% | −$78,190.60 | +$19,819.60 | fail (T2, T3, T4) |
| C5 c3c10f60 | centre → not a role holder | $136,518.25 | $24,679.71 (24.68%) | 22/5/0 | 71.4% | +$43,942.55 | +$10,101.61 | $3,579.77 | $19,387.19 (19.39%) | 4/4/0 | 58.2% | −$49,312.98 | +$9,471.18 | fail (T3) |
| C6 a1115757 | pareto → not a role holder | $101,589.00 | $20,614.72 (20.61%) | 13/0/0 | 69.4% | +$9,013.30 | +$6,036.62 | $19,348.96 | $38,962.16 (38.96%) | 4/0/0 | 95.6% | −$33,543.79 | +$29,046.15 | fail (T1, T2, T4, T6) |

# Detailed ledger

## #4 (control)

- Development: total marked $92,575.71 = realized $92,575.71 + open $0.00; max minute DD $14,578.10 (14.58%), 2021-08-30 → 2023-10-03, recovered 2023-12-15; 11 closed (8/3/0), 0 open; exposure 36.9%.
- Whole run 2016-01-04 → 2026-10-30: total marked $145,468.46 = realized $145,468.46 + open $0.00; max minute DD $14,578.10 (14.58%), 2021-08-30 → 2023-10-03, recovered 2023-12-15.
- Validation: net $52,892.75 (boundary equity $92,575.71 → $145,468.46); max minute DD from the boundary $9,916.01 (9.92%), 2025-10-29 → 2026-04-13, recovered 2026-04-21; 2 new entries; open at the end $0.00.

| # | Status | Origin | Entry | Entry fill | Exit | Exit fill | Reason | Sessions | Gross | Costs | Interest | Net |
|---:|---|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|
| 1 | closed | rise | 2016-06-29 | 104.85 | 2018-02-05 | 168.44 | trailing stop | 404 | $60,616.90 | $130.26 | $17,660.27 | $42,826.37 |
| 2 | closed | rise | 2019-02-01 | 181.54 | 2019-05-09 | 202.82 | trailing stop | 68 | $11,718.05 | $105.81 | $2,923.29 | $8,688.95 |
| 3 | closed | shallow_pullback | 2019-05-15 | 200.48 | 2019-05-29 | 195.51 | initial stop | 10 | −$2,479.64 | $98.71 | $421.92 | −$3,000.27 |
| 4 | closed | rise | 2020-04-21 | 228.48 | 2020-05-14 | 239.62 | trailing stop | 18 | $4,869.00 | $102.38 | $693.15 | $4,073.47 |
| 5 | closed | shallow_pullback | 2020-06-01 | 259.98 | 2020-06-11 | 262.05 | trailing stop | 9 | $797.41 | $100.35 | $301.37 | $395.69 |
| 6 | closed | shallow_pullback | 2020-06-26 | 275.50 | 2020-09-03 | 320.30 | trailing stop | 49 | $16,251.62 | $108.08 | $2,079.45 | $14,064.09 |
| 7 | closed | rise | 2021-05-14 | 360.03 | 2021-09-29 | 404.46 | trailing stop | 96 | $12,335.36 | $106.12 | $4,158.90 | $8,070.34 |
| 8 | closed | rise | 2022-03-29 | 429.56 | 2022-04-01 | 412.20 | initial stop | 4 | −$4,039.32 | $97.93 | $90.41 | −$4,227.67 |
| 9 | closed | rise | 2023-09-29 | 418.10 | 2023-10-20 | 416.33 | maximum hold | 16 | −$423.13 | $99.74 | $632.88 | −$1,155.75 |
| 10 | closed | rise | 2023-11-03 | 421.85 | 2024-04-15 | 504.43 | trailing stop | 111 | $19,566.42 | $109.73 | $4,942.47 | $14,514.22 |
| 11 | closed | rise | 2024-05-07 | 517.55 | 2024-07-19 | 572.60 | trailing stop | 51 | $10,631.53 | $105.27 | $2,200.00 | $8,326.27 |
| 12 | closed | rise | 2025-05-02 | 567.59 | 2025-11-07 | 755.11 | trailing stop gap | 132 | $33,021.42 | $116.46 | $5,695.89 | $27,209.07 |
| 13 | closed | rise | 2026-04-10 | 743.16 | 2026-06-05 | 947.52 | trailing stop | 40 | $27,485.05 | $113.69 | $1,687.67 | $25,683.68 |

## C1 ec124684 (profit; profit (rank 1, modest))

- Development: total marked $133,078.09 = realized $125,725.18 + open $7,352.91; max minute DD $17,772.79 (17.77%), 2020-02-19 → 2020-06-15, recovered 2020-08-21; 19 closed (16/3/0), 1 open; exposure 69.8%.
- Whole run 2016-01-04 → 2026-10-30: total marked $104,458.62 = realized $109,792.74 + open −$5,334.12; max minute DD $35,200.55 (35.20%), 2024-12-16 → 2026-10-30, not recovered by the end.
- Validation: net −$28,619.47 (boundary equity $133,078.09 → $104,458.62); max minute DD from the boundary $34,405.71 (34.41%), 2025-01-06 → 2026-10-30, not recovered by 2026-10-30; 7 new entries; open at the end −$5,334.12.
- Carried in: trade 20 entered 2024-09-12, closed 2025-01-13: net $3,572.12 = $7,352.91 before the boundary + −$3,780.79 after.

| # | Status | Origin | Entry | Entry fill | Exit | Exit fill | Reason | Sessions | Gross | Costs | Interest | Net |
|---:|---|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|
| 1 | closed | trend_breakout | 2016-08-02 | 115.57 | 2018-02-05 | 167.54 | trailing stop | 381 | $44,948.24 | $122.42 | $16,635.62 | $28,190.20 |
| 2 | closed | trend_breakout | 2018-02-15 | 173.10 | 2018-10-10 | 191.15 | trailing stop | 165 | $10,423.10 | $105.16 | $7,142.47 | $3,175.47 |
| 3 | closed | continuation | 2018-11-20 | 173.16 | 2018-12-06 | 175.33 | trailing stop | 11 | $1,250.96 | $100.58 | $482.19 | $668.20 |
| 4 | closed | continuation | 2018-12-24 | 158.68 | 2019-05-10 | 201.74 | trailing stop | 95 | $27,125.93 | $113.51 | $4,128.77 | $22,883.65 |
| 5 | closed | trend_breakout | 2019-06-06 | 200.20 | 2019-08-05 | 207.58 | trailing stop gap | 42 | $3,684.47 | $101.79 | $1,808.22 | $1,774.46 |
| 6 | closed | trend_breakout | 2019-08-22 | 215.71 | 2020-02-24 | 252.18 | trailing stop gap | 127 | $16,898.51 | $108.40 | $5,605.48 | $11,184.63 |
| 7 | closed | continuation | 2020-02-28 | 230.00 | 2020-03-06 | 232.99 | trailing stop gap | 6 | $1,299.35 | $100.60 | $210.96 | $987.79 |
| 8 | closed | continuation | 2020-03-12 | 204.75 | 2020-03-16 | 193.27 | trailing stop gap | 3 | −$5,604.04 | $97.15 | $120.55 | −$5,821.73 |
| 9 | closed | trend_breakout | 2020-06-03 | 265.14 | 2020-09-03 | 318.59 | trailing stop | 66 | $20,149.80 | $110.02 | $2,772.60 | $17,267.18 |
| 10 | closed | trend_breakout | 2020-09-29 | 309.87 | 2021-02-23 | 357.85 | trailing stop | 101 | $15,477.00 | $107.69 | $4,430.14 | $10,939.17 |
| 11 | closed | trend_breakout | 2021-03-12 | 355.05 | 2021-05-06 | 363.46 | trailing stop | 39 | $2,368.21 | $101.13 | $1,657.53 | $609.55 |
| 12 | closed | trend_breakout | 2021-05-21 | 369.44 | 2021-09-30 | 402.31 | trailing stop | 92 | $8,893.29 | $104.40 | $3,978.08 | $4,810.81 |
| 13 | closed | trend_breakout | 2021-10-08 | 411.62 | 2021-12-03 | 433.54 | trailing stop | 40 | $5,321.72 | $102.61 | $1,687.67 | $3,531.44 |
| 14 | closed | trend_breakout | 2021-12-08 | 456.02 | 2022-01-10 | 427.11 | initial stop | 23 | −$6,335.94 | $96.78 | $994.52 | −$7,427.24 |
| 15 | closed | trend_breakout | 2023-03-17 | 367.92 | 2023-08-07 | 432.75 | trailing stop | 98 | $17,610.51 | $108.76 | $4,309.59 | $13,192.17 |
| 16 | closed | trend_breakout | 2023-08-24 | 438.06 | 2023-09-26 | 410.45 | initial stop | 23 | −$6,299.64 | $96.80 | $994.52 | −$7,390.96 |
| 17 | closed | trend_breakout | 2023-11-08 | 436.05 | 2024-04-17 | 501.75 | trailing stop | 110 | $15,059.33 | $107.48 | $4,852.05 | $10,099.80 |
| 18 | closed | trend_breakout | 2024-04-29 | 506.06 | 2024-07-24 | 569.56 | trailing stop | 60 | $12,540.71 | $106.22 | $2,591.78 | $9,842.71 |
| 19 | closed | continuation | 2024-08-05 | 506.58 | 2024-09-03 | 548.07 | trailing stop | 21 | $8,185.92 | $104.04 | $873.97 | $7,207.90 |
| 20 | closed | trend_breakout | 2024-09-12 | 561.58 | 2025-01-13 | 603.06 | trailing stop gap | 84 | $7,382.61 | $103.64 | $3,706.85 | $3,572.12 |
| 21 | closed | trend_breakout | 2025-01-22 | 640.00 | 2025-02-27 | 596.88 | initial stop | 26 | −$6,734.05 | $96.58 | $1,084.93 | −$7,915.56 |
| 22 | closed | trend_breakout | 2025-07-18 | 689.13 | 2025-11-07 | 754.54 | trailing stop | 80 | $9,486.30 | $104.69 | $3,375.34 | $6,006.27 |
| 23 | closed | trend_breakout | 2025-12-03 | 756.29 | 2026-03-27 | 691.36 | initial stop gap | 79 | −$8,581.04 | $95.66 | $3,435.62 | −$12,112.32 |
| 24 | closed | trend_breakout | 2026-05-11 | 899.28 | 2026-06-05 | 942.48 | trailing stop | 19 | $4,801.44 | $102.35 | $753.42 | $3,945.67 |
| 25 | closed | trend_breakout | 2026-06-16 | 962.96 | 2026-07-28 | 880.53 | initial stop | 29 | −$8,555.59 | $95.67 | $1,265.75 | −$9,917.01 |
| 26 | closed | trend_breakout | 2026-08-04 | 938.80 | 2026-10-15 | 964.72 | trailing stop gap | 52 | $2,759.59 | $101.33 | $2,169.86 | $488.40 |
| 27 | open | trend_breakout | 2026-10-28 | 987.28 | — | 935.68 | open (marked) | 3 | −$5,223.87 | $49.98 | $60.27 | −$5,334.12 |

## C2 6f63defc (pareto; balanced (rank 2, modest))

- Development: total marked $94,254.88 = realized $86,879.98 + open $7,374.90; max minute DD $23,130.27 (23.13%), 2021-11-22 → 2023-03-13, recovered 2023-06-14; 15 closed (13/2/0), 1 open; exposure 67.2%.
- Whole run 2016-01-04 → 2026-10-30: total marked $93,139.17 = realized $100,119.29 + open −$6,980.12; max minute DD $23,130.27 (23.13%), 2021-11-22 → 2023-03-13, recovered 2023-06-14.
- Validation: net −$1,115.71 (boundary equity $94,254.88 → $93,139.17); max minute DD from the boundary $22,274.17 (22.27%), 2025-10-29 → 2026-04-14, recovered 2026-05-26; 5 new entries; open at the end −$6,980.12.
- Carried in: trade 16 entered 2024-08-14, closed 2025-01-13: net $3,566.67 = $7,374.90 before the boundary + −$3,808.23 after.

| # | Status | Origin | Entry | Entry fill | Exit | Exit fill | Reason | Sessions | Gross | Costs | Interest | Net |
|---:|---|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|
| 1 | closed | trend_breakout | 2016-10-11 | 121.01 | 2018-02-05 | 166.65 | trailing stop | 332 | $37,694.32 | $118.80 | $14,526.03 | $23,049.49 |
| 2 | closed | trend_breakout | 2018-02-15 | 173.10 | 2018-10-10 | 190.13 | trailing stop | 165 | $9,832.87 | $104.87 | $7,142.47 | $2,585.53 |
| 3 | closed | trend_breakout | 2019-03-13 | 195.99 | 2019-05-13 | 200.67 | trailing stop | 43 | $2,384.69 | $101.14 | $1,838.36 | $445.20 |
| 4 | closed | trend_breakout | 2019-06-06 | 200.20 | 2019-08-05 | 207.58 | trailing stop gap | 42 | $3,684.47 | $101.79 | $1,808.22 | $1,774.46 |
| 5 | closed | trend_breakout | 2019-08-22 | 215.71 | 2020-02-24 | 252.18 | trailing stop gap | 127 | $16,898.51 | $108.40 | $5,605.48 | $11,184.63 |
| 6 | closed | trend_breakout | 2020-04-30 | 244.09 | 2020-06-15 | 259.17 | trailing stop gap | 32 | $6,174.96 | $103.04 | $1,386.30 | $4,685.62 |
| 7 | closed | trend_breakout | 2020-06-24 | 277.71 | 2020-09-03 | 316.89 | trailing stop | 51 | $14,100.54 | $107.00 | $2,139.73 | $11,853.82 |
| 8 | closed | trend_breakout | 2020-09-29 | 309.87 | 2021-02-23 | 355.94 | trailing stop | 101 | $14,859.74 | $107.38 | $4,430.14 | $10,322.22 |
| 9 | closed | trend_breakout | 2021-03-12 | 355.05 | 2021-10-01 | 400.16 | trailing stop | 142 | $12,699.02 | $106.30 | $6,117.81 | $6,474.91 |
| 10 | closed | trend_breakout | 2021-10-08 | 411.62 | 2021-12-03 | 431.22 | trailing stop | 40 | $4,758.77 | $102.33 | $1,687.67 | $2,968.77 |
| 11 | closed | trend_breakout | 2021-12-08 | 456.02 | 2022-01-19 | 420.50 | initial stop | 29 | −$7,785.24 | $96.06 | $1,265.75 | −$9,147.05 |
| 12 | closed | trend_breakout | 2023-03-06 | 363.38 | 2023-08-08 | 430.56 | trailing stop | 108 | $18,478.87 | $109.19 | $4,671.23 | $13,698.45 |
| 13 | closed | trend_breakout | 2023-08-24 | 438.06 | 2023-10-26 | 403.68 | initial stop | 45 | −$7,843.59 | $96.03 | $1,898.63 | −$9,838.24 |
| 14 | closed | trend_breakout | 2023-11-13 | 444.00 | 2024-04-17 | 499.07 | trailing stop | 107 | $12,396.03 | $106.15 | $4,701.37 | $7,588.51 |
| 15 | closed | trend_breakout | 2024-04-29 | 506.06 | 2024-07-24 | 566.47 | trailing stop | 60 | $11,931.35 | $105.92 | $2,591.78 | $9,233.66 |
| 16 | closed | trend_breakout | 2024-08-14 | 557.07 | 2025-01-13 | 603.06 | trailing stop gap | 104 | $8,251.57 | $104.08 | $4,580.82 | $3,566.67 |
| 17 | closed | trend_breakout | 2025-01-22 | 640.00 | 2025-02-28 | 586.22 | initial stop gap | 27 | −$8,398.93 | $95.75 | $1,115.07 | −$9,609.74 |
| 18 | closed | trend_breakout | 2025-06-25 | 649.81 | 2025-11-07 | 750.50 | trailing stop | 96 | $15,487.66 | $107.69 | $4,068.49 | $11,311.48 |
| 19 | closed | trend_breakout | 2025-12-03 | 756.29 | 2026-03-27 | 685.54 | initial stop | 79 | −$9,349.77 | $95.28 | $3,435.62 | −$12,880.66 |
| 20 | closed | trend_breakout | 2026-04-14 | 765.00 | 2026-06-05 | 937.44 | trailing stop | 38 | $22,529.91 | $111.21 | $1,567.12 | $20,851.57 |
| 21 | open | trend_breakout | 2026-06-16 | 962.96 | — | 935.68 | open (marked) | 96 | −$2,831.52 | $49.98 | $4,098.63 | −$6,980.12 |

## C3 37d37e1e (balanced; extra1 (rank 3, modest))

- Development: total marked $100,862.16 = realized $93,487.25 + open $7,374.90; max minute DD $20,505.33 (20.51%), 2023-07-19 → 2023-10-26, recovered 2024-01-19; 13 closed (13/0/0), 1 open; exposure 68.1%.
- Whole run 2016-01-04 → 2026-10-30: total marked $120,211.12 = realized $125,545.24 + open −$5,334.12; max minute DD $39,758.31 (39.76%), 2024-12-16 → 2025-04-07, recovered 2025-09-18.
- Validation: net $19,348.96 (boundary equity $100,862.16 → $120,211.12); max minute DD from the boundary $38,962.16 (38.96%), 2025-01-06 → 2025-04-07, recovered 2025-09-18; 4 new entries; open at the end −$5,334.12.
- Carried in: trade 14 entered 2024-08-14, closed 2025-02-03: net $3,475.59 = $7,374.90 before the boundary + −$3,899.31 after.

| # | Status | Origin | Entry | Entry fill | Exit | Exit fill | Reason | Sessions | Gross | Costs | Interest | Net |
|---:|---|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|
| 1 | closed | trend_breakout | 2016-11-22 | 121.81 | 2018-02-12 | 166.21 | trend exit | 307 | $37,416.14 | $118.66 | $13,281.37 | $24,016.11 |
| 2 | closed | trend_breakout | 2018-02-15 | 173.10 | 2018-10-15 | 188.81 | trend exit | 168 | $10,287.90 | $105.09 | $7,157.53 | $3,025.27 |
| 3 | closed | trend_breakout | 2019-02-19 | 189.42 | 2019-05-29 | 196.51 | trend exit | 70 | $6,227.20 | $103.06 | $2,468.22 | $3,655.91 |
| 4 | closed | trend_breakout | 2019-06-07 | 203.04 | 2019-08-08 | 210.52 | trend exit | 44 | $2,379.62 | $101.14 | $1,787.12 | $491.36 |
| 5 | closed | trend_breakout | 2019-08-22 | 215.71 | 2020-02-28 | 224.37 | trend exit | 131 | $15,609.92 | $107.75 | $5,617.53 | $9,884.63 |
| 6 | closed | trend_breakout | 2020-06-09 | 270.62 | 2020-11-02 | 300.38 | trend exit | 103 | $17,045.17 | $108.47 | $2,772.60 | $14,164.10 |
| 7 | closed | trend_breakout | 2020-11-05 | 323.99 | 2021-03-08 | 347.96 | trend exit | 83 | $10,141.32 | $105.02 | $3,354.25 | $6,682.05 |
| 8 | closed | trend_breakout | 2021-03-12 | 355.05 | 2021-05-13 | 355.44 | trend exit | 44 | $2,142.37 | $101.02 | $1,678.63 | $362.72 |
| 9 | closed | trend_breakout | 2021-05-25 | 373.69 | 2021-10-05 | 398.28 | trend exit | 93 | $7,547.57 | $103.72 | $3,872.60 | $3,571.24 |
| 10 | closed | trend_breakout | 2021-10-15 | 418.75 | 2022-01-19 | 424.01 | trend exit | 66 | $3,301.89 | $101.60 | $1,618.36 | $1,581.94 |
| 11 | closed | trend_breakout | 2023-03-17 | 367.92 | 2023-08-18 | 412.54 | trend exit | 107 | $17,061.62 | $108.48 | $4,342.74 | $12,610.40 |
| 12 | closed | trend_breakout | 2023-08-24 | 438.06 | 2024-04-22 | 484.19 | trend exit | 166 | $14,130.99 | $107.02 | $7,157.53 | $6,866.44 |
| 13 | closed | trend_breakout | 2024-05-07 | 517.61 | 2024-08-06 | 519.78 | trend exit | 63 | $9,069.43 | $104.48 | $2,389.86 | $6,575.08 |
| 14 | closed | trend_breakout | 2024-08-14 | 557.07 | 2025-02-03 | 601.51 | trend exit | 118 | $8,223.76 | $104.06 | $4,644.11 | $3,475.59 |
| 15 | closed | trend_breakout | 2025-02-14 | 636.00 | 2025-11-21 | 716.50 | trend exit | 195 | $18,030.62 | $108.97 | $8,058.63 | $9,863.03 |
| 16 | closed | trend_breakout | 2025-12-03 | 756.29 | 2026-07-30 | 895.20 | trend exit | 164 | $23,981.72 | $111.94 | $5,710.96 | $18,158.82 |
| 17 | closed | trend_breakout | 2026-08-04 | 938.80 | 2026-10-21 | 973.20 | trend exit | 56 | $2,849.87 | $101.37 | $2,187.95 | $560.55 |
| 18 | open | trend_breakout | 2026-10-28 | 987.28 | — | 935.68 | open (marked) | 3 | −$5,223.87 | $49.98 | $60.27 | −$5,334.12 |

## C4 1308a733 (robust; robust (rank 4, modest))

- Development: total marked $122,372.48 = realized $115,019.57 + open $7,352.91; max minute DD $20,114.11 (20.11%), 2021-11-22 → 2023-03-13, recovered 2023-05-30; 27 closed (22/5/0), 1 open; exposure 67.3%.
- Whole run 2016-01-04 → 2026-10-30: total marked $97,074.63 = realized $97,074.63 + open $0.00; max minute DD $30,530.45 (30.53%), 2024-12-16 → 2026-10-30, not recovered by the end.
- Validation: net −$25,297.85 (boundary equity $122,372.48 → $97,074.63); max minute DD from the boundary $29,735.61 (29.74%), 2025-01-06 → 2026-10-30, not recovered by 2026-10-30; 8 new entries; open at the end $0.00.
- Carried in: trade 28 entered 2024-09-12, closed 2025-01-10: net $5,427.87 = $7,352.91 before the boundary + −$1,925.04 after.

| # | Status | Origin | Entry | Entry fill | Exit | Exit fill | Reason | Sessions | Gross | Costs | Interest | Net |
|---:|---|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|
| 1 | closed | trend_breakout | 2016-08-02 | 115.57 | 2017-06-12 | 140.11 | trailing stop | 217 | $21,219.55 | $110.56 | $9,463.01 | $11,645.98 |
| 2 | closed | trend_breakout | 2017-06-26 | 146.26 | 2017-06-28 | 141.44 | initial stop | 3 | −$3,293.04 | $98.30 | $60.27 | −$3,451.62 |
| 3 | closed | trend_breakout | 2017-07-11 | 142.60 | 2018-02-05 | 169.33 | trailing stop | 145 | $18,738.56 | $109.32 | $6,298.63 | $12,330.61 |
| 4 | closed | trend_breakout | 2018-02-15 | 173.10 | 2018-03-22 | 175.72 | trailing stop gap | 25 | $1,512.82 | $100.71 | $1,054.79 | $357.32 |
| 5 | closed | trend_breakout | 2018-04-13 | 174.97 | 2018-06-27 | 179.98 | trailing stop | 53 | $2,864.60 | $101.38 | $2,260.27 | $502.95 |
| 6 | closed | trend_breakout | 2018-07-09 | 186.80 | 2018-10-08 | 193.20 | trailing stop | 65 | $3,422.16 | $101.66 | $2,742.47 | $578.04 |
| 7 | closed | continuation | 2018-11-20 | 173.16 | 2018-12-06 | 175.44 | trailing stop gap | 11 | $1,313.76 | $100.61 | $482.19 | $730.96 |
| 8 | closed | continuation | 2018-12-24 | 158.68 | 2019-05-09 | 203.90 | trailing stop | 94 | $28,485.03 | $114.19 | $4,098.63 | $24,272.21 |
| 9 | closed | trend_breakout | 2019-06-06 | 200.20 | 2019-08-05 | 207.58 | trailing stop gap | 42 | $3,684.47 | $101.79 | $1,808.22 | $1,774.46 |
| 10 | closed | trend_breakout | 2019-08-22 | 215.71 | 2020-02-24 | 252.18 | trailing stop gap | 127 | $16,898.51 | $108.40 | $5,605.48 | $11,184.63 |
| 11 | closed | continuation | 2020-02-28 | 230.00 | 2020-03-06 | 232.99 | trailing stop gap | 6 | $1,299.35 | $100.60 | $210.96 | $987.79 |
| 12 | closed | continuation | 2020-03-12 | 204.75 | 2020-03-16 | 193.27 | trailing stop gap | 3 | −$5,604.04 | $97.15 | $120.55 | −$5,821.73 |
| 13 | closed | trend_breakout | 2020-04-30 | 244.09 | 2020-06-11 | 263.45 | trailing stop | 30 | $7,926.74 | $103.91 | $1,265.75 | $6,557.07 |
| 14 | closed | trend_breakout | 2020-06-24 | 277.71 | 2020-09-03 | 322.00 | trailing stop | 51 | $15,940.07 | $107.92 | $2,139.73 | $13,692.42 |
| 15 | closed | trend_breakout | 2020-09-29 | 309.87 | 2020-10-22 | 315.12 | trailing stop | 18 | $1,693.32 | $100.80 | $693.15 | $899.37 |
| 16 | closed | trend_breakout | 2020-11-05 | 323.99 | 2021-02-23 | 358.00 | trailing stop gap | 74 | $10,491.99 | $105.20 | $3,315.07 | $7,071.73 |
| 17 | closed | trend_breakout | 2021-03-12 | 355.05 | 2021-05-04 | 367.35 | trailing stop | 37 | $3,462.53 | $101.68 | $1,597.26 | $1,763.59 |
| 18 | closed | trend_breakout | 2021-05-21 | 369.44 | 2021-09-20 | 406.61 | trailing stop | 84 | $10,057.39 | $104.98 | $3,676.71 | $6,275.70 |
| 19 | closed | trend_breakout | 2021-10-08 | 411.62 | 2021-12-02 | 435.67 | trailing stop gap | 39 | $5,839.85 | $102.87 | $1,657.53 | $4,079.44 |
| 20 | closed | trend_breakout | 2021-12-08 | 456.02 | 2022-01-10 | 427.96 | initial stop gap | 23 | −$6,150.16 | $96.87 | $994.52 | −$7,241.56 |
| 21 | closed | trend_breakout | 2023-03-06 | 363.38 | 2023-08-04 | 437.48 | trailing stop | 106 | $20,381.69 | $110.14 | $4,550.68 | $15,720.86 |
| 22 | closed | trend_breakout | 2023-08-24 | 438.06 | 2023-09-25 | 413.90 | initial stop | 22 | −$5,512.11 | $97.19 | $964.38 | −$6,573.69 |
| 23 | closed | trend_breakout | 2023-11-08 | 436.05 | 2024-01-05 | 461.01 | trailing stop | 40 | $5,720.98 | $102.81 | $1,747.95 | $3,870.22 |
| 24 | closed | trend_breakout | 2024-01-11 | 481.12 | 2024-02-21 | 494.80 | trailing stop | 28 | $2,840.91 | $101.37 | $1,235.62 | $1,503.92 |
| 25 | closed | trend_breakout | 2024-03-04 | 527.87 | 2024-04-17 | 502.27 | initial stop | 32 | −$4,847.26 | $97.53 | $1,326.03 | −$6,270.81 |
| 26 | closed | trend_breakout | 2024-05-06 | 511.44 | 2024-07-18 | 575.65 | trailing stop | 51 | $12,547.84 | $106.22 | $2,200.00 | $10,241.61 |
| 27 | closed | continuation | 2024-08-05 | 506.58 | 2024-09-03 | 553.80 | trailing stop | 21 | $9,316.67 | $104.61 | $873.97 | $8,338.09 |
| 28 | closed | trend_breakout | 2024-09-12 | 561.58 | 2025-01-10 | 612.98 | trailing stop | 83 | $9,148.83 | $104.52 | $3,616.44 | $5,427.87 |
| 29 | closed | trend_breakout | 2025-01-22 | 640.00 | 2025-01-27 | 602.27 | initial stop | 4 | −$5,892.29 | $97.00 | $150.68 | −$6,139.98 |
| 30 | closed | trend_breakout | 2025-02-14 | 636.00 | 2025-02-27 | 594.03 | initial stop | 9 | −$6,595.00 | $96.65 | $391.78 | −$7,083.43 |
| 31 | closed | trend_breakout | 2025-07-18 | 689.13 | 2025-11-06 | 762.61 | trailing stop | 79 | $10,656.75 | $105.28 | $3,345.21 | $7,206.26 |
| 32 | closed | trend_breakout | 2025-12-03 | 756.29 | 2026-03-20 | 703.05 | initial stop | 74 | −$7,035.94 | $96.43 | $3,224.66 | −$10,357.03 |
| 33 | closed | trend_breakout | 2026-05-12 | 903.04 | 2026-06-05 | 952.56 | trailing stop | 18 | $5,480.96 | $102.69 | $723.29 | $4,654.98 |
| 34 | closed | trend_breakout | 2026-06-16 | 962.96 | 2026-07-17 | 890.84 | initial stop | 22 | −$7,486.14 | $96.21 | $934.25 | −$8,516.59 |
| 35 | closed | trend_breakout | 2026-08-04 | 938.80 | 2026-10-14 | 987.79 | trailing stop | 51 | $5,215.71 | $102.56 | $2,139.73 | $2,973.43 |
| 36 | closed | trend_breakout | 2026-10-28 | 987.28 | 2026-10-30 | 928.48 | initial stop | 3 | −$5,953.21 | $96.97 | $60.27 | −$6,110.45 |

## C5 c3c10f60 (centre; not a role holder)

- Development: total marked $136,518.25 = realized $129,165.34 + open $7,352.91; max minute DD $24,679.71 (24.68%), 2021-11-22 → 2023-01-06, recovered 2023-05-30; 27 closed (22/5/0), 1 open; exposure 71.4%.
- Whole run 2016-01-04 → 2026-10-30: total marked $140,098.03 = realized $140,098.03 + open $0.00; max minute DD $24,679.71 (24.68%), 2021-11-22 → 2023-01-06, recovered 2023-05-30.
- Validation: net $3,579.77 (boundary equity $136,518.25 → $140,098.03); max minute DD from the boundary $19,387.19 (19.39%), 2025-01-06 → 2025-06-25, recovered 2025-10-29; 7 new entries; open at the end $0.00.
- Carried in: trade 28 entered 2024-09-12, closed 2025-01-10: net $5,427.87 = $7,352.91 before the boundary + −$1,925.04 after.

| # | Status | Origin | Entry | Entry fill | Exit | Exit fill | Reason | Sessions | Gross | Costs | Interest | Net |
|---:|---|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|
| 1 | closed | trend_breakout | 2016-06-24 | 105.31 | 2017-06-12 | 140.11 | trailing stop | 243 | $33,024.70 | $116.46 | $10,638.36 | $22,269.88 |
| 2 | closed | trend_breakout | 2017-06-26 | 146.26 | 2017-06-28 | 141.66 | initial stop | 3 | −$3,146.85 | $98.38 | $60.27 | −$3,305.50 |
| 3 | closed | trend_breakout | 2017-07-11 | 142.60 | 2018-02-05 | 169.33 | trailing stop | 145 | $18,738.56 | $109.32 | $6,298.63 | $12,330.61 |
| 4 | closed | trend_breakout | 2018-02-15 | 173.10 | 2018-03-22 | 175.72 | trailing stop gap | 25 | $1,512.82 | $100.71 | $1,054.79 | $357.32 |
| 5 | closed | trend_breakout | 2018-04-13 | 174.97 | 2018-06-27 | 179.98 | trailing stop | 53 | $2,864.60 | $101.38 | $2,260.27 | $502.95 |
| 6 | closed | trend_breakout | 2018-07-09 | 186.80 | 2018-10-08 | 193.20 | trailing stop | 65 | $3,422.16 | $101.66 | $2,742.47 | $578.04 |
| 7 | closed | continuation | 2018-11-20 | 173.00 | 2018-12-06 | 175.44 | trailing stop gap | 11 | $1,409.70 | $100.65 | $482.19 | $826.85 |
| 8 | closed | continuation | 2018-12-24 | 158.38 | 2019-05-09 | 203.90 | trailing stop | 94 | $28,728.31 | $114.31 | $4,098.63 | $24,515.37 |
| 9 | closed | trend_breakout | 2019-06-06 | 200.20 | 2019-08-05 | 207.58 | trailing stop gap | 42 | $3,684.47 | $101.79 | $1,808.22 | $1,774.46 |
| 10 | closed | trend_breakout | 2019-08-22 | 215.71 | 2020-02-24 | 252.18 | trailing stop gap | 127 | $16,898.51 | $108.40 | $5,605.48 | $11,184.63 |
| 11 | closed | continuation | 2020-02-28 | 229.31 | 2020-03-06 | 232.99 | trailing stop gap | 6 | $1,604.01 | $100.75 | $210.96 | $1,292.30 |
| 12 | closed | continuation | 2020-03-12 | 203.74 | 2020-03-16 | 193.27 | trailing stop gap | 3 | −$5,136.33 | $97.38 | $120.55 | −$5,354.26 |
| 13 | closed | trend_breakout | 2020-04-30 | 244.09 | 2020-06-11 | 263.45 | trailing stop | 30 | $7,926.74 | $103.91 | $1,265.75 | $6,557.07 |
| 14 | closed | trend_breakout | 2020-06-24 | 277.71 | 2020-09-03 | 322.00 | trailing stop | 51 | $15,940.07 | $107.92 | $2,139.73 | $13,692.42 |
| 15 | closed | trend_breakout | 2020-09-29 | 309.87 | 2020-10-22 | 315.12 | trailing stop | 18 | $1,693.32 | $100.80 | $693.15 | $899.37 |
| 16 | closed | trend_breakout | 2020-11-05 | 323.99 | 2021-02-23 | 358.00 | trailing stop gap | 74 | $10,491.99 | $105.20 | $3,315.07 | $7,071.73 |
| 17 | closed | trend_breakout | 2021-03-12 | 355.05 | 2021-05-04 | 367.35 | trailing stop | 37 | $3,462.53 | $101.68 | $1,597.26 | $1,763.59 |
| 18 | closed | trend_breakout | 2021-05-21 | 369.44 | 2021-09-20 | 406.61 | trailing stop | 84 | $10,057.39 | $104.98 | $3,676.71 | $6,275.70 |
| 19 | closed | trend_breakout | 2021-10-08 | 411.62 | 2021-12-02 | 435.67 | trailing stop gap | 39 | $5,839.85 | $102.87 | $1,657.53 | $4,079.44 |
| 20 | closed | trend_breakout | 2021-12-08 | 456.02 | 2022-01-10 | 427.96 | initial stop gap | 23 | −$6,150.16 | $96.87 | $994.52 | −$7,241.56 |
| 21 | closed | trend_breakout | 2022-11-14 | 339.67 | 2023-02-21 | 351.73 | trailing stop | 67 | $3,548.73 | $101.72 | $2,983.56 | $463.44 |
| 22 | closed | trend_breakout | 2023-03-06 | 363.38 | 2023-08-04 | 437.48 | trailing stop | 106 | $20,381.69 | $110.14 | $4,550.68 | $15,720.86 |
| 23 | closed | trend_breakout | 2023-08-24 | 438.06 | 2023-09-21 | 414.00 | initial stop | 20 | −$5,490.51 | $97.20 | $843.84 | −$6,431.55 |
| 24 | closed | trend_breakout | 2023-11-15 | 456.00 | 2024-02-21 | 494.80 | trailing stop | 66 | $8,503.42 | $104.20 | $2,953.42 | $5,445.80 |
| 25 | closed | trend_breakout | 2024-03-04 | 527.87 | 2024-04-16 | 503.47 | initial stop | 31 | −$4,620.25 | $97.64 | $1,295.89 | −$6,013.78 |
| 26 | closed | trend_breakout | 2024-04-29 | 506.06 | 2024-07-18 | 575.65 | trailing stop | 56 | $13,743.82 | $106.82 | $2,410.96 | $11,226.04 |
| 27 | closed | continuation | 2024-08-05 | 504.98 | 2024-09-03 | 553.80 | trailing stop | 21 | $9,662.88 | $104.78 | $873.97 | $8,684.12 |
| 28 | closed | trend_breakout | 2024-09-12 | 561.58 | 2025-01-10 | 612.98 | trailing stop | 83 | $9,148.83 | $104.52 | $3,616.44 | $5,427.87 |
| 29 | closed | trend_breakout | 2025-01-22 | 640.00 | 2025-01-27 | 602.85 | initial stop | 4 | −$5,802.33 | $97.05 | $150.68 | −$6,050.07 |
| 30 | closed | trend_breakout | 2025-02-14 | 636.00 | 2025-02-27 | 595.35 | initial stop | 9 | −$6,388.12 | $96.76 | $391.78 | −$6,876.66 |
| 31 | closed | trend_breakout | 2025-06-25 | 649.81 | 2025-11-06 | 762.61 | trailing stop | 95 | $17,349.56 | $108.62 | $4,038.36 | $13,202.58 |
| 32 | closed | trend_breakout | 2025-12-03 | 756.29 | 2026-02-05 | 706.69 | initial stop | 44 | −$6,554.41 | $96.67 | $1,928.77 | −$8,579.85 |
| 33 | closed | trend_breakout | 2026-04-16 | 787.80 | 2026-06-05 | 952.56 | trailing stop | 36 | $20,903.49 | $110.40 | $1,506.85 | $19,286.23 |
| 34 | closed | trend_breakout | 2026-06-16 | 962.96 | 2026-07-17 | 891.47 | initial stop | 22 | −$7,420.37 | $96.24 | $934.25 | −$8,450.85 |
| 35 | closed | trend_breakout | 2026-08-04 | 938.80 | 2026-10-14 | 987.79 | trailing stop | 51 | $5,215.71 | $102.56 | $2,139.73 | $2,973.43 |

## C6 a1115757 (pareto; not a role holder)

- Development: total marked $101,589.00 = realized $94,214.10 + open $7,374.90; max minute DD $20,614.72 (20.61%), 2023-07-19 → 2023-10-26, recovered 2024-01-19; 13 closed (13/0/0), 1 open; exposure 69.4%.
- Whole run 2016-01-04 → 2026-10-30: total marked $120,937.97 = realized $126,272.08 + open −$5,334.12; max minute DD $39,758.31 (39.76%), 2024-12-16 → 2025-04-07, recovered 2025-09-18.
- Validation: net $19,348.96 (boundary equity $101,589.00 → $120,937.97); max minute DD from the boundary $38,962.16 (38.96%), 2025-01-06 → 2025-04-07, recovered 2025-09-18; 4 new entries; open at the end −$5,334.12.
- Carried in: trade 14 entered 2024-08-14, closed 2025-02-03: net $3,475.59 = $7,374.90 before the boundary + −$3,899.31 after.

| # | Status | Origin | Entry | Entry fill | Exit | Exit fill | Reason | Sessions | Gross | Costs | Interest | Net |
|---:|---|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|
| 1 | closed | trend_breakout | 2016-10-25 | 121.42 | 2018-02-12 | 166.21 | trend exit | 327 | $37,857.36 | $118.88 | $14,125.21 | $23,613.27 |
| 2 | closed | trend_breakout | 2018-02-15 | 173.10 | 2018-10-15 | 188.81 | trend exit | 168 | $10,287.90 | $105.09 | $7,157.53 | $3,025.27 |
| 3 | closed | trend_breakout | 2019-02-19 | 189.42 | 2019-05-29 | 196.51 | trend exit | 70 | $6,227.20 | $103.06 | $2,468.22 | $3,655.91 |
| 4 | closed | trend_breakout | 2019-06-07 | 203.04 | 2019-08-08 | 210.52 | trend exit | 44 | $2,379.62 | $101.14 | $1,787.12 | $491.36 |
| 5 | closed | trend_breakout | 2019-08-22 | 215.71 | 2020-02-28 | 224.37 | trend exit | 131 | $15,609.92 | $107.75 | $5,617.53 | $9,884.63 |
| 6 | closed | trend_breakout | 2020-06-09 | 270.62 | 2020-11-02 | 300.38 | trend exit | 103 | $17,045.17 | $108.47 | $2,772.60 | $14,164.10 |
| 7 | closed | trend_breakout | 2020-11-05 | 323.99 | 2021-03-08 | 347.96 | trend exit | 83 | $10,141.32 | $105.02 | $3,354.25 | $6,682.05 |
| 8 | closed | trend_breakout | 2021-03-12 | 355.05 | 2021-05-13 | 355.44 | trend exit | 44 | $2,142.37 | $101.02 | $1,678.63 | $362.72 |
| 9 | closed | trend_breakout | 2021-05-25 | 373.69 | 2021-10-05 | 398.28 | trend exit | 93 | $7,547.57 | $103.72 | $3,872.60 | $3,571.24 |
| 10 | closed | trend_breakout | 2021-10-15 | 418.75 | 2022-01-19 | 424.01 | trend exit | 66 | $3,301.89 | $101.60 | $1,618.36 | $1,581.94 |
| 11 | closed | trend_breakout | 2023-03-06 | 363.38 | 2023-08-18 | 412.54 | trend exit | 116 | $18,523.54 | $109.21 | $4,674.25 | $13,740.08 |
| 12 | closed | trend_breakout | 2023-08-24 | 438.06 | 2024-04-22 | 484.19 | trend exit | 166 | $14,130.99 | $107.02 | $7,157.53 | $6,866.44 |
| 13 | closed | trend_breakout | 2024-05-07 | 517.61 | 2024-08-06 | 519.78 | trend exit | 63 | $9,069.43 | $104.48 | $2,389.86 | $6,575.08 |
| 14 | closed | trend_breakout | 2024-08-14 | 557.07 | 2025-02-03 | 601.51 | trend exit | 118 | $8,223.76 | $104.06 | $4,644.11 | $3,475.59 |
| 15 | closed | trend_breakout | 2025-02-14 | 636.00 | 2025-11-21 | 716.50 | trend exit | 195 | $18,030.62 | $108.97 | $8,058.63 | $9,863.03 |
| 16 | closed | trend_breakout | 2025-12-03 | 756.29 | 2026-07-30 | 895.20 | trend exit | 164 | $23,981.72 | $111.94 | $5,710.96 | $18,158.82 |
| 17 | closed | trend_breakout | 2026-08-04 | 938.80 | 2026-10-21 | 973.20 | trend exit | 56 | $2,849.87 | $101.37 | $2,187.95 | $560.55 |
| 18 | open | trend_breakout | 2026-10-28 | 987.28 | — | 935.68 | open (marked) | 3 | −$5,223.87 | $49.98 | $60.27 | −$5,334.12 |

