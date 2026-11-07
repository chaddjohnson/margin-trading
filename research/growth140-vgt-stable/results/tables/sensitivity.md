# #4 sensitivity (development, D24)

- Reproduction: net $92,575.71 (expected $92,575.71), maximum minute drawdown $14,578.10 (expected $14,578.10): **exact**. 11 trades, 8 wins, 3 losses; exposure 36.9%; dollar losses −$8,383.68; largest winning episode $42,826.37 (46.3% of net); net without it $49,749.34 (arithmetic).

## #4's development trades

| # | entry | exit | reason | days | net |
|---:|---|---|---|---:|---:|
| 1 | 2016-06-29 | 2018-02-05 | trailing stop | 586.3 | $42,826.37 |
| 2 | 2019-02-01 | 2019-05-09 | trailing stop | 96.9 | $8,688.95 |
| 3 | 2019-05-15 | 2019-05-29 | initial stop | 14.1 | −$3,000.27 |
| 4 | 2020-04-21 | 2020-05-14 | trailing stop | 23.0 | $4,073.47 |
| 5 | 2020-06-01 | 2020-06-11 | trailing stop | 10.2 | $395.69 |
| 6 | 2020-06-26 | 2020-09-03 | trailing stop | 69.1 | $14,064.09 |
| 7 | 2021-05-14 | 2021-09-29 | trailing stop | 138.1 | $8,070.34 |
| 8 | 2022-03-29 | 2022-04-01 | initial stop | 2.8 | −$4,227.67 |
| 9 | 2023-09-29 | 2023-10-20 | maximum hold | 21.0 | −$1,155.75 |
| 10 | 2023-11-03 | 2024-04-15 | trailing stop | 164.2 | $14,514.22 |
| 11 | 2024-05-07 | 2024-07-19 | trailing stop | 73.2 | $8,326.27 |

## One input at a time (fine: centre ± R at the schema step; wide: the box)

| input | centre | unit | R | step | fine points moving net > $10k | mean |Δnet| (fine) | same ledger (fine) | fine net range | nearest big change below / above |
|---|---:|---|---:|---:|---:|---:|---:|---|---|
| trailingStopPercent | 6 | percent | 1.20 | 0.1 | 54% | $21,529.88 | 0% | $37,933.55 … $96,348.52 | 5.9 / 6.4 |
| recentLowLookbackBars | 90 | bars | 24.00 | 1 | 46% | $25,136.88 | 6% | $31,573.90 … $100,938.69 | — / 93 |
| trendChangeMinimumReturnPercent | -2 | percent | 1.50 | 0.1 | 43% | $10,572.52 | 7% | $65,714.65 … $92,575.71 | — / -1.7 |
| initialStopAtrMultiple | 1.5 | × ATR | 0.40 | 0.1 | 38% | $8,268.03 | 0% | $72,794.33 … $92,115.32 | 1.3 / — |
| advanceFromRecentLowPercent | 5 | percent | 1.90 | 0.1 | 32% | $13,591.18 | 16% | $57,293.26 … $97,840.87 | 4.2 / — |
| trendChangeLookbackSessions | 30 | sessions | 11.50 | 1 | 27% | $10,836.93 | 0% | $68,233.66 … $94,251.08 | — / 31 |
| eligibilityMaxAgeSessions | 20 | sessions | 2.90 | 1 | 20% | $5,982.12 | 60% | $68,353.78 … $92,575.71 | 17 / — |
| dipThresholdPercent | 10 | percent | 1.30 | 0.1 | 19% | $4,455.47 | 15% | $81,288.52 … $92,575.71 | — / 10.9 |
| pullbackMinimumPercent | 1.5 | percent | 0.35 | 0.1 | 0% | $2,423.98 | 0% | $88,541.51 … $93,389.46 | — / — |
| uptrendMinimumRisePercent | 0 | percent | 0.50 | 0.05 | 0% | $1,715.45 | 20% | $89,674.78 … $92,575.71 | — / — |
| uptrendSmaBars | 50 | bars | 19.00 | 1 | 0% | $1,660.55 | 39% | $88,541.51 … $92,575.71 | — / — |
| recoveryPercent | 1 | percent | 0.48 | 0.01 | 0% | $1,402.93 | 76% | $86,842.00 … $92,575.71 | — / — |
| recoveryRetracementPercent | 45 | percent | 7.00 | 0.1 | 0% | $1,243.43 | 0% | $83,985.30 … $95,737.95 | — / — |
| uptrendSlopeBars | 10 | bars | 2.90 | 1 | 0% | $1,182.58 | 60% | $89,619.25 … $92,575.71 | — / — |
| maximumHoldDays | 21 | calendar days | 2.70 | 1 | 0% | $927.88 | 60% | $90,256.00 … $92,575.71 | — / — |
| recoveryConfirmationSessions | 2 | sessions | 1.00 | 1 | 0% | $888.82 | 0% | $92,113.84 … $93,891.47 | — / — |
| initialStopAtrSessions | 20 | sessions | 5.50 | 1 | 0% | $184.41 | 0% | $92,178.93 … $92,781.38 | — / — |
| intradayLossBufferPercent | 2.9 | percent | 0.60 | 0.1 | 0% | $0.00 | 100% | $92,575.71 … $92,575.71 | — / — |
| dipLookbackSessions | 60 | sessions | 11.00 | 1 | 0% | $0.00 | 100% | $92,575.71 … $92,575.71 | — / — |
| continuationWindowSessions | 60 | sessions | 19.00 | 1 | 0% | $0.00 | 100% | $92,575.71 … $92,575.71 | — / — |
| pullbackMaximumPercent | 8 | percent | 1.00 | 0.1 | 0% | $0.00 | 100% | $92,575.71 … $92,575.71 | — / — |

## Each enabled rule OFF

| rule OFF | net | Δ net | DD | Δ DD | trades (W/L) |
|---|---:|---:|---:|---:|---:|
| trendFilterEnabled | $96,187.23 | $3,611.52 | $17,246.41 | $2,668.31 | 13 (9/4) |
| eligibilityEnabled | $61,320.60 | −$31,255.11 | $12,841.18 | −$1,736.92 | 5 (3/2) |
| drawdownRecoveryGateEnabled | $76,071.34 | −$16,504.37 | $23,327.01 | $8,748.91 | 21 (10/11) |
| maximumHoldEnabled | $90,256.00 | −$2,319.71 | $15,885.48 | $1,307.38 | 11 (8/3) |
| intradayLossBufferEnabled | $92,575.71 | $0.00 | $14,578.10 | $0.00 | 11 (8/3) |
| initialStopEnabled | $87,719.48 | −$4,856.23 | $21,532.34 | $6,954.24 | 11 (8/3) |
| continuationEnabled | $81,116.19 | −$11,459.52 | $14,578.10 | $0.00 | 8 (6/2) |

## Pairwise interactions (six most sensitive inputs; interaction = Δ(a,b) − Δ(a) − Δ(b))

| a | b | mean |interaction| | max |interaction| | cells with |interaction| > $10k |
|---|---|---:|---:|---:|
| recentLowLookbackBars | advanceFromRecentLowPercent | $14,868.49 | $43,263.27 | 45% |
| trendChangeMinimumReturnPercent | trendChangeLookbackSessions | $12,403.36 | $31,340.51 | 45% |
| trailingStopPercent | recentLowLookbackBars | $7,999.04 | $34,026.36 | 28% |
| trailingStopPercent | advanceFromRecentLowPercent | $5,340.98 | $15,825.18 | 27% |
| trailingStopPercent | trendChangeMinimumReturnPercent | $4,698.14 | $27,679.15 | 13% |
| trendChangeMinimumReturnPercent | initialStopAtrMultiple | $4,324.21 | $20,611.85 | 19% |
| trailingStopPercent | trendChangeLookbackSessions | $3,908.37 | $17,934.64 | 14% |
| advanceFromRecentLowPercent | trendChangeLookbackSessions | $3,647.14 | $11,408.16 | 9% |
| recentLowLookbackBars | initialStopAtrMultiple | $3,631.27 | $7,534.81 | 0% |
| trailingStopPercent | initialStopAtrMultiple | $3,581.36 | $18,786.06 | 13% |
| recentLowLookbackBars | trendChangeLookbackSessions | $3,549.06 | $11,476.88 | 3% |
| initialStopAtrMultiple | trendChangeLookbackSessions | $3,457.95 | $20,992.33 | 11% |
| initialStopAtrMultiple | advanceFromRecentLowPercent | $3,068.52 | $8,391.33 | 0% |
| trendChangeMinimumReturnPercent | advanceFromRecentLowPercent | $2,559.08 | $18,544.79 | 5% |
| recentLowLookbackBars | trendChangeMinimumReturnPercent | $2,310.24 | $22,530.84 | 5% |

## Joint perturbations (256 draws each)

| family | n | ledgers | same ledger as #4 | median net | p10 net | p90 net | robust | p90 DD | worst DD | share ≤ $35k | profitable |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| all@0.25 | 256 | 256 | 0% | $68,226.85 | $41,533.71 | $89,031.60 | $54,880.28 | $18,923.00 | $26,679.11 | 100.0% | 100% |
| all@0.5 | 256 | 256 | 0% | $59,191.39 | $22,722.29 | $86,965.36 | $40,956.84 | $19,415.18 | $27,937.94 | 100.0% | 100% |
| all@1 | 256 | 256 | 0% | $44,348.68 | $10,993.24 | $75,373.45 | $27,670.96 | $22,551.20 | $34,584.47 | 100.0% | 98% |
| all@1.5 | 256 | 256 | 0% | $33,391.34 | $1,991.11 | $68,016.10 | $17,691.23 | $27,459.00 | $49,160.91 | 97.3% | 93% |
| named7@1 | 256 | 255 | 0% | $67,770.97 | $14,549.15 | $92,178.70 | $41,160.06 | $21,041.10 | $31,302.91 | 100.0% | 100% |
| others@1 | 256 | 256 | 0% | $57,878.52 | $25,057.95 | $82,724.53 | $41,468.23 | $18,933.20 | $25,490.16 | 100.0% | 100% |
| top6@1 | 256 | 256 | 0% | $43,976.52 | $11,891.24 | $78,842.17 | $27,933.88 | $21,109.29 | $27,806.87 | 100.0% | 100% |

The completed study's figures for #4 on its grid-step instrument: median $44,531.83, p10 $11,982.96.

## Ledger diagnosis of the decisive points (against #4's development ledger)

| point | net | DD | major #4 winner lost | lost #4 winners | extra loss | losses (sum) vs #4 | extended losing hold | changed decision dates |
|---|---|---|---|---|---|---|---|---|
| advanceFromRecentLowPercent = 4.2 (nearest fine value moving net by > $10k) | $57,293.26 | $14,454.14 | — | 2 | yes | 4 (−$13,080.92) vs 3 (−$8,383.69) | no | 20: 2016-06-28, 2016-12-05, 2016-12-07, 2018-10-16, 2018-10-22, 2018-11-15 |
| recentLowLookbackBars = 93 (nearest fine value moving net by > $10k) | $75,936.69 | $15,328.42 | — | 0 | yes | 3 (−$10,146.34) vs 3 (−$8,383.69) | no | 4: 2016-06-28, 2016-12-05, 2023-09-28, 2023-10-04 |
| trailingStopPercent = 5.9 (nearest fine value moving net by > $10k) | $70,803.64 | $14,458.70 | — | 0 | yes | 4 (−$9,840.67) vs 3 (−$8,383.69) | no | 0:  |
| trailingStopPercent = 6.4 (nearest fine value moving net by > $10k) | $74,727.46 | $15,085.80 | 2020-06-26 $14,064.09 | 2 | yes | 4 (−$8,416.50) vs 3 (−$8,383.69) | no | 0:  |
| dipThresholdPercent = 10.9 (nearest fine value moving net by > $10k) | $81,288.52 | $14,578.10 | — | 1 | yes | 4 (−$11,344.61) vs 3 (−$8,383.69) | no | 0:  |
| initialStopAtrMultiple = 1.3 (nearest fine value moving net by > $10k) | $72,794.33 | $16,521.24 | 2020-06-26 $14,064.09 | 1 | yes | 5 (−$14,100.97) vs 3 (−$8,383.69) | no | 1: 2023-10-10 |
| eligibilityMaxAgeSessions = 17 (nearest fine value moving net by > $10k) | $68,353.78 | $14,578.10 | 2020-06-26 $14,064.09 | 4 | no | 2 (−$5,383.42) vs 3 (−$8,383.69) | no | 0:  |
| trendChangeLookbackSessions = 31 (nearest fine value moving net by > $10k) | $72,791.64 | $14,911.27 | 2020-06-26 $14,064.09 | 3 | yes | 3 (−$9,729.19) vs 3 (−$8,383.69) | no | 5: 2022-03-09, 2022-04-18, 2022-04-28, 2022-07-05, 2023-09-28 |
| trendChangeMinimumReturnPercent = -1.7 (nearest fine value moving net by > $10k) | $73,274.31 | $14,911.27 | 2020-06-26 $14,064.09 | 3 | yes | 3 (−$9,729.19) vs 3 (−$8,383.69) | no | 1: 2023-09-28 |
| recoveryRetracementPercent = 44.9 (exact-value check) | $92,223.43 | $14,578.10 | — | 0 | no | 3 (−$8,383.69) vs 3 (−$8,383.69) | no | 0:  |
| recoveryRetracementPercent = 45.1 (exact-value check) | $92,643.50 | $14,578.10 | — | 0 | no | 3 (−$8,383.69) vs 3 (−$8,383.69) | no | 0:  |
| recoveryRetracementPercent = 40 (exact-value check) | $95,704.96 | $14,933.32 | — | 0 | no | 3 (−$8,738.91) vs 3 (−$8,383.69) | no | 0:  |
| recoveryRetracementPercent = 50 (exact-value check) | $91,152.27 | $14,684.65 | — | 0 | no | 3 (−$8,490.24) vs 3 (−$8,383.69) | no | 0:  |
| intradayLossBufferPercent = 2.8 (exact-value check) | $92,575.71 | $14,578.10 | — | 0 | no | 3 (−$8,383.69) vs 3 (−$8,383.69) | no | 0:  |
| intradayLossBufferPercent = 3 (exact-value check) | $92,575.71 | $14,578.10 | — | 0 | no | 3 (−$8,383.69) vs 3 (−$8,383.69) | no | 0:  |
| intradayLossBufferPercent = 2.5 (exact-value check) | $92,575.71 | $14,578.10 | — | 0 | no | 3 (−$8,383.69) vs 3 (−$8,383.69) | no | 0:  |
| intradayLossBufferPercent = 3.5 (exact-value check) | $92,575.71 | $14,578.10 | — | 0 | no | 3 (−$8,383.69) vs 3 (−$8,383.69) | no | 0:  |
| joint scale 1: one of the 8 lowest nets (-3836.9) | −$3,836.90 | $9,142.24 | 2016-06-29 $42,826.37; 2020-06-26 $14,064.09 | 7 | no | 3 (−$9,381.54) vs 3 (−$8,383.69) | no | 26: 2016-06-28, 2016-12-07, 2018-10-16, 2018-10-22, 2018-11-15, 2018-11-26 |
| joint scale 1: one of the 8 lowest nets (-2225.7) | −$2,225.70 | $20,987.12 | 2016-06-29 $42,826.37 | 2 | yes | 8 (−$33,046.69) vs 3 (−$8,383.69) | no | 15: 2016-06-28, 2016-12-07, 2018-10-22, 2018-11-06, 2021-05-13, 2022-04-18 |
| joint scale 1: one of the 8 lowest nets (-2173.26) | −$2,173.26 | $8,894.30 | 2016-06-29 $42,826.37; 2020-06-26 $14,064.09 | 7 | no | 2 (−$7,393.41) vs 3 (−$8,383.69) | no | 23: 2016-06-28, 2016-12-07, 2018-10-12, 2018-10-16, 2018-10-22, 2018-11-15 |
| joint scale 1: one of the 8 lowest nets (-698.42) | −$698.42 | $9,091.97 | 2016-06-29 $42,826.37; 2020-06-26 $14,064.09 | 7 | no | 2 (−$8,176.49) vs 3 (−$8,383.69) | no | 17: 2016-06-28, 2016-12-07, 2018-10-22, 2018-11-15, 2018-11-28, 2018-12-12 |
| joint scale 1: one of the 8 lowest nets (-539.49) | −$539.49 | $10,867.89 | 2016-06-29 $42,826.37; 2020-06-26 $14,064.09 | 7 | yes | 3 (−$11,715.55) vs 3 (−$8,383.69) | no | 23: 2016-06-28, 2016-12-07, 2018-10-12, 2018-10-16, 2018-10-22, 2018-11-15 |
| joint scale 1: one of the 8 lowest nets (417.24) | $417.24 | $7,616.34 | 2016-06-29 $42,826.37; 2020-06-26 $14,064.09 | 7 | no | 1 (−$4,878.32) vs 3 (−$8,383.69) | no | 33: 2016-06-28, 2016-12-07, 2018-10-16, 2018-10-22, 2018-10-25, 2018-10-30 |
| joint scale 1: one of the 8 lowest nets (1555.89) | $1,555.89 | $18,908.49 | 2020-06-26 $14,064.09 | 6 | yes | 4 (−$14,448.40) vs 3 (−$8,383.69) | no | 24: 2016-06-28, 2016-12-05, 2016-12-07, 2018-10-16, 2018-10-22, 2018-11-15 |
| joint scale 1: one of the 8 lowest nets (1607.42) | $1,607.42 | $13,624.15 | 2016-06-29 $42,826.37 | 4 | yes | 3 (−$10,385.88) vs 3 (−$8,383.69) | no | 21: 2016-06-28, 2016-12-07, 2018-10-12, 2018-10-16, 2018-10-22, 2018-12-12 |

## Regional scan (64-draw `region` neighbourhoods)

| centre | id | centre net | centre DD | nb median | nb p10 | robust | nb p90 DD | feasible |
|---|---|---|---|---|---|---|---|---|
| #4 | 420cd989e4fa7749 | $92,575.71 | $14,578.10 | $40,669.11 | $10,359.61 | $25,514.36 | $20,835.60 | yes |
| trailingStopPercent -1 R | 1c2be53d3a0689f6 | $40,765.60 | $15,356.77 | $24,301.54 | $4,411.67 | $14,356.60 | $19,429.98 | yes |
| trailingStopPercent -0.5 R | 14f3686a66dbb69a | $54,174.44 | $16,073.13 | $35,088.77 | $7,743.71 | $21,416.24 | $19,515.86 | yes |
| trailingStopPercent +0.5 R | a5386db55854f586 | $94,875.37 | $15,324.59 | $50,983.89 | $18,985.47 | $34,984.68 | $21,695.13 | yes |
| trailingStopPercent +1 R | 3bf91d60efad8e1d | $87,622.06 | $18,107.31 | $53,437.18 | $22,610.81 | $38,023.99 | $22,120.79 | yes |
| recentLowLookbackBars -1 R | d45de00b4830ba0b | $92,036.49 | $20,172.26 | $53,659.27 | $21,221.96 | $37,440.61 | $32,353.64 | yes |
| recentLowLookbackBars -0.5 R | 6addfe6a47eaac55 | $96,779.15 | $17,496.35 | $49,016.09 | $20,855.50 | $34,935.79 | $26,405.58 | yes |
| recentLowLookbackBars +0.5 R | 0996eaaeb083b912 | $39,644.24 | $13,816.97 | $26,549.05 | $6,023.54 | $16,286.29 | $19,417.48 | yes |
| recentLowLookbackBars +1 R | c327fa99b714bf8c | $32,261.65 | $13,816.97 | $14,639.58 | $2,116.64 | $8,378.11 | $18,269.55 | yes |
| trendChangeMinimumReturnPercent -1 R | 9697cbe2c734d0f1 | $90,740.76 | $15,511.37 | $39,445.92 | $10,504.19 | $24,975.05 | $21,224.07 | yes |
| trendChangeMinimumReturnPercent -0.5 R | 74412e6712cee1a2 | $90,740.76 | $15,511.37 | $41,902.23 | $10,065.30 | $25,983.76 | $21,065.33 | yes |
| trendChangeMinimumReturnPercent +0.5 R | f1a66f63004a6a83 | $69,112.63 | $14,911.27 | $37,535.53 | $8,965.80 | $23,250.66 | $21,055.02 | yes |
| trendChangeMinimumReturnPercent +1 R | 496fbf036542f3b8 | $65,714.65 | $15,075.67 | $38,007.00 | $10,134.02 | $24,070.51 | $20,782.29 | yes |
| initialStopAtrMultiple -1 R | 9133a61e43061a4b | $74,723.45 | $15,208.25 | $41,077.56 | $7,823.42 | $24,450.49 | $22,779.15 | yes |
| initialStopAtrMultiple -0.5 R | 9133ccfa7515a16b | $72,794.33 | $16,521.24 | $39,443.45 | $6,631.60 | $23,037.53 | $22,028.68 | yes |
| initialStopAtrMultiple +0.5 R | b2f41a99d1748fe3 | $90,773.80 | $15,989.28 | $41,489.95 | $10,133.05 | $25,811.50 | $21,788.71 | yes |
| initialStopAtrMultiple +1 R | 5e12eb7f00c08ecf | $90,352.93 | $15,989.28 | $41,802.00 | $11,185.26 | $26,493.63 | $22,172.27 | yes |
| advanceFromRecentLowPercent -1 R | 828969b2f170f209 | $58,427.05 | $14,454.14 | $30,253.10 | $4,178.19 | $17,215.64 | $22,256.04 | yes |
| advanceFromRecentLowPercent -0.5 R | b0216a58b0d30f2e | $57,293.26 | $14,454.14 | $35,169.77 | $4,475.53 | $19,822.65 | $20,432.38 | yes |
| advanceFromRecentLowPercent +0.5 R | 2bca88221a98fb2c | $91,230.21 | $14,911.27 | $39,193.71 | $13,046.04 | $26,119.87 | $23,699.28 | yes |
| advanceFromRecentLowPercent +1 R | 455f101b46e60489 | $93,420.33 | $15,898.13 | $46,746.46 | $19,565.05 | $33,155.75 | $24,027.23 | yes |
| trendChangeLookbackSessions -1 R | b3b78841dd9057eb | $83,518.55 | $14,909.60 | $43,540.20 | $15,020.99 | $29,280.60 | $22,877.56 | yes |
| trendChangeLookbackSessions -0.5 R | ddeffda51d9a571f | $83,626.55 | $14,783.69 | $41,570.82 | $11,642.14 | $26,606.48 | $20,927.69 | yes |
| trendChangeLookbackSessions +0.5 R | ef0ec2b06b8a917f | $88,862.37 | $15,945.31 | $37,115.16 | $8,753.72 | $22,934.44 | $20,716.66 | yes |
| trendChangeLookbackSessions +1 R | b855062bd2da2356 | $70,555.08 | $15,175.27 | $42,222.84 | $6,473.24 | $24,348.04 | $21,145.00 | yes |
| joint scale 0.5, top-16 net | 0726fcf477602e21 | $99,435.01 | $14,999.90 | $55,043.04 | $19,160.41 | $37,101.72 | $23,689.11 | yes |
| joint scale 0.5, top-16 net | da3fab879d969011 | $97,622.36 | $16,525.82 | $63,990.58 | $24,438.60 | $44,214.59 | $26,402.63 | yes |
| joint scale 0.5, top-16 net | eed7816ac3501acd | $96,506.67 | $15,356.65 | $44,287.03 | $9,344.09 | $26,815.56 | $23,596.92 | yes |
| joint scale 0.5, top-16 net | 4fda7508c50b957a | $96,458.19 | $15,841.84 | $47,165.25 | $14,219.93 | $30,692.59 | $24,483.53 | yes |
| joint scale 0.5, top-16 net | 2f390e48ff952aac | $95,959.97 | $14,596.16 | $43,395.64 | $12,051.46 | $27,723.55 | $23,011.67 | yes |
| joint scale 0.5, top-16 net | 2eb9e23066663071 | $95,022.53 | $15,546.55 | $47,369.28 | $7,785.18 | $27,577.23 | $23,817.78 | yes |
| joint scale 0.5, top-16 net | db9cb66739ed66ee | $94,930.15 | $15,362.84 | $45,300.98 | $11,952.42 | $28,626.70 | $23,448.28 | yes |
| joint scale 0.5, top-16 net | 14f92de6a3dfa19c | $94,516.35 | $16,875.00 | $48,530.30 | $9,704.06 | $29,117.18 | $23,266.10 | yes |
| joint scale 0.5, top-16 net | dbfca063d539f843 | $94,229.90 | $18,621.51 | $47,063.19 | $11,951.91 | $29,507.55 | $28,545.28 | yes |
| joint scale 0.5, top-16 net | 254b30107a85613e | $93,496.05 | $18,964.36 | $54,608.73 | $12,164.18 | $33,386.45 | $25,412.72 | yes |
| joint scale 0.5, top-16 net | 98efe04ddecd68ec | $93,387.90 | $18,642.73 | $58,194.55 | $15,544.80 | $36,869.67 | $25,375.67 | yes |
| joint scale 0.5, top-16 net | 92c79c72a8cd7d79 | $92,695.35 | $15,531.58 | $52,738.10 | $20,226.49 | $36,482.29 | $25,086.18 | yes |
| joint scale 0.5, top-16 net | 4b7065d9b5860a23 | $92,284.35 | $19,876.51 | $48,973.88 | $10,911.86 | $29,942.87 | $25,561.10 | yes |
| joint scale 0.5, top-16 net | 5fdfad86c0aa03b8 | $91,667.18 | $16,396.08 | $60,188.44 | $21,243.30 | $40,715.87 | $25,728.97 | yes |
| joint scale 0.5, top-16 net | 5580759bda53c3a7 | $90,982.90 | $16,875.00 | $49,479.46 | $11,491.06 | $30,485.26 | $22,254.80 | yes |
| joint scale 0.5, top-16 net | 99fad760ec82dc97 | $90,940.56 | $15,537.17 | $44,691.02 | $13,663.38 | $29,177.20 | $25,042.94 | yes |

Best feasible regional centre (banded order): `da3fab879d969011` robust $44,214.59, p90 $26,402.63.

