# A / B / C — New L0 under calendar days (A), the same phenotype under trading sessions (B), the re-optimized primary (C)

C = C24/ses/informed/R3#1 profit. Training = the D24 door run (2016-01-04 → 2024-12-31; lots closed by then, open lots marked at its close); validation = the FULL run after the 2024-12-31 close (lots entered after it; positions crossing the boundary shown apart); full = the FULL run.

| Configuration | Training net (2016–2024) | Validation net (2025–2026) | Full-history net | Full-history max minute DD |
|---|---:|---:|---:|---:|
| A | $382,721.46 | $96,883.72 | $479,605.18 | $20,385.99 |
| B | $340,857.79 | $97,846.00 | $438,703.79 | $23,473.39 |
| C | $373,676.67 | $88,765.28 | $462,441.95 | $23,972.72 |
| C-cal | $340,449.39 | $90,268.29 | $430,717.68 | $20,385.99 |

**Training 2016-01-04 → 2024-12-31**

| Metric | A: Baseline (calendar) | B: Conversion (sessions) | C: Re-optimized (sessions) | C under calendar days (cross row) |
|---|---|---|---|---|
| Net profit (marked) | $382,721.46 | $340,857.79 | $373,676.67 | $340,449.39 |
| Gross profit (Σ winning lots) | $391,601.38 | $357,902.96 | $385,961.90 | $352,757.40 |
| Gross loss (Σ losing lots) | −$8,879.94 | −$17,045.18 | −$12,285.24 | −$12,308.03 |
| Margin interest | $62,112.35 | $59,520.58 | $63,619.19 | $63,317.81 |
| Transaction costs (5 bps per side) | $3,622.50 | $3,200.26 | $3,518.73 | $3,601.95 |
| Maximum minute DD | $19,459.83 (19.5%) | $23,473.39 (23.5%) | $20,374.21 (20.4%) | $19,459.83 (19.5%) |
| Number of trades (open at the end) | 34 (0) | 30 (0) | 33 (0) | 34 (0) |
| Win rate (closed lots) | 85.3% | 86.7% | 90.9% | 82.4% |
| Average holding (NYSE sessions) | 41.7 | 45.4 | 44.1 | 42.6 |
| Average holding (calendar days) | 60.6 | 65.8 | 64.0 | 61.8 |
| Capital utilization (sessions with a funded position) | 64.1% | 61.5% | 65.7% | 65.4% |
| Capital utilization (principal-days ÷ $100,000 × days) | 62.7% | 60.1% | 64.3% | 64.0% |
| Worst intratrade mark (MAE of one lot) | −$8,046.67 | −$12,073.79 | −$10,039.07 | −$8,046.67 |

**Validation 2025-01-02 → 2026-10-30 (previously examined history)**

| Metric | A: Baseline (calendar) | B: Conversion (sessions) | C: Re-optimized (sessions) | C under calendar days (cross row) |
|---|---|---|---|---|
| Net profit (marked) | $96,883.72 | $97,846.00 | $88,765.28 | $90,268.29 |
| Gross profit (Σ winning lots) | $115,610.58 | $117,013.65 | $111,017.67 | $109,332.93 |
| Gross loss (Σ losing lots) | −$18,726.87 | −$19,167.65 | −$22,252.41 | −$19,064.66 |
| Margin interest | $11,030.14 | $10,909.59 | $11,813.70 | $11,753.42 |
| Transaction costs (5 bps per side) | $1,206.64 | $1,107.07 | $1,202.37 | $1,303.70 |
| Maximum minute DD (reset at 2024-12-31) | $20,385.99 (20.4%) | $21,572.15 (21.6%) | $23,972.72 (24.0%) | $20,385.99 (20.4%) |
| Number of trades (open at the end) | 12 (1) | 11 (1) | 12 (1) | 13 (1) |
| Win rate (closed lots) | 72.7% | 80.0% | 63.6% | 66.7% |
| Average holding (NYSE sessions) | 21.5 | 23.5 | 23.1 | 21.0 |
| Average holding (calendar days) | 30.5 | 32.9 | 32.7 | 30.0 |
| Capital utilization (sessions with a funded position) | 58.8% | 58.6% | 63.0% | 62.3% |
| Worst intratrade mark (MAE of one lot) | −$11,068.95 | −$12,179.09 | −$12,179.09 | −$11,068.95 |
| Contribution of positions crossing 2024-12-31 | $0.01 | $0.00 | $0.02 | $0.02 |

**Full history 2016-01-04 → 2026-10-30**

| Metric | A: Baseline (calendar) | B: Conversion (sessions) | C: Re-optimized (sessions) | C under calendar days (cross row) |
|---|---|---|---|---|
| Net profit (marked) | $479,605.18 | $438,703.79 | $462,441.95 | $430,717.68 |
| Gross profit (Σ winning lots) | $507,211.96 | $474,916.61 | $496,979.57 | $462,090.33 |
| Gross loss (Σ losing lots) | −$27,606.81 | −$36,212.83 | −$34,537.65 | −$31,372.69 |
| Margin interest | $73,142.49 | $70,430.17 | $75,432.89 | $75,071.23 |
| Transaction costs (5 bps per side) | $4,829.14 | $4,307.33 | $4,721.10 | $4,905.65 |
| Maximum minute DD | $20,385.99 (20.4%) | $23,473.39 (23.5%) | $23,972.72 (24.0%) | $20,385.99 (20.4%) |
| Number of trades (open at the end) | 46 (1) | 41 (1) | 45 (1) | 47 (1) |
| Win rate (closed lots) | 82.2% | 85.0% | 84.1% | 78.3% |
| Average holding (NYSE sessions) | 36.4 | 39.5 | 38.5 | 36.6 |
| Average holding (calendar days) | 52.8 | 57.0 | 55.6 | 53.0 |
| Capital utilization (sessions with a funded position) | 63.2% | 61.0% | 65.3% | 64.9% |
| Capital utilization (principal-days ÷ $100,000 × days) | 61.4% | 59.1% | 63.3% | 63.0% |
| Worst intratrade mark (MAE of one lot) | −$11,068.95 | −$12,179.09 | −$12,179.09 | −$11,068.95 |

**Annual P&L and within-year maximum minute drawdown (FULL run):**

| Year | A P&L | A DD | B P&L | B DD | C P&L | C DD | C-cal P&L | C-cal DD |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2016 | $8,588.21 | $5,658.29 | $8,588.21 | $5,658.29 | $9,620.11 | $5,706.88 | $9,620.11 | $5,706.88 |
| 2017 | $23,852.14 | $9,100.67 | $23,852.14 | $9,100.67 | $30,059.85 | $9,146.82 | $30,059.85 | $9,146.82 |
| 2018 | $18,525.08 | $10,352.21 | $18,525.08 | $10,352.21 | $18,291.31 | $11,244.47 | $18,291.31 | $11,244.47 |
| 2019 | $29,004.74 | $10,633.06 | $29,004.74 | $10,633.06 | $29,023.28 | $13,330.52 | $18,574.57 | $13,330.52 |
| 2020 | $138,877.67 | $17,280.74 | $138,877.67 | $17,280.74 | $138,669.32 | $17,280.74 | $137,001.23 | $17,280.74 |
| 2021 | $32,525.03 | $12,107.02 | $20,888.98 | $14,090.67 | $31,113.30 | $10,880.37 | $32,215.59 | $11,389.49 |
| 2022 | $43,474.42 | $15,243.93 | $47,602.97 | $17,018.18 | $51,044.18 | $14,674.85 | $38,269.02 | $17,209.22 |
| 2023 | $43,764.07 | $19,459.83 | $38,057.43 | $23,473.39 | $28,198.64 | $20,374.21 | $43,764.07 | $19,459.83 |
| 2024 | $44,110.10 | $9,105.84 | $15,460.57 | $7,938.68 | $37,656.68 | $10,965.26 | $12,653.64 | $11,788.54 |
| 2025 | $47,530.51 | $12,324.36 | $47,530.51 | $12,324.36 | $44,958.72 | $13,800.44 | $46,901.55 | $12,489.08 |
| 2026 | $49,353.21 | $20,385.99 | $50,315.49 | $21,572.15 | $43,806.55 | $23,972.72 | $43,366.74 | $20,385.99 |

**The five worst lots of each (FULL run):**

| Config | Component | Entry | Exit | Reason | Sessions held | Net | MAE |
|---|---|---|---|---|---:|---:|---:|
| A | D1:GDX | 2026-07-07 | 2026-07-20 | maximum hold | 9 | −$9,113.94 | −$11,068.95 |
| A | D1:GDX | 2023-02-06 | 2023-02-21 | maximum hold | 10 | −$6,455.48 | −$8,046.67 |
| A | D1:GDX | 2026-10-23 | open | open (marked at the last close) | 5 | −$5,564.76 | −$7,062.59 |
| A | D1:GDX | 2026-06-22 | 2026-07-06 | maximum hold | 9 | −$2,410.94 | −$9,554.20 |
| A | D1:GDX | 2026-10-07 | 2026-10-22 | maximum hold | 11 | −$1,637.23 | −$2,851.44 |
| B | D1:GDX | 2023-02-06 | 2023-02-24 | maximum hold | 13 | −$12,118.02 | −$12,073.79 |
| B | D1:GDX | 2026-06-22 | 2026-07-10 | maximum hold | 13 | −$8,014.71 | −$12,179.09 |
| B | D1:GDX | 2026-10-07 | 2026-10-26 | maximum hold | 13 | −$5,662.25 | −$7,318.24 |
| B | D1:GDX | 2026-10-27 | open | open (marked at the last close) | 3 | −$5,490.69 | −$6,987.79 |
| B | D1:GDX | 2022-10-10 | 2022-11-02 | buffered intraday loss | 17 | −$2,703.87 | −$6,540.51 |
| C | D1:GDX | 2023-02-06 | 2023-02-23 | maximum hold | 12 | −$9,501.16 | −$10,039.07 |
| C | D1:GDX | 2026-06-22 | 2026-07-09 | maximum hold | 12 | −$8,769.64 | −$12,179.09 |
| C | D1:GDX | 2026-10-26 | open | open (marked at the last close) | 4 | −$4,237.68 | −$5,755.09 |
| C | D1:GDX | 2026-10-07 | 2026-10-23 | maximum hold | 12 | −$4,215.30 | −$4,526.47 |
| C | D1:GDX | 2026-07-10 | 2026-07-28 | maximum hold | 12 | −$2,749.18 | −$8,296.98 |
| C-cal | D1:GDX | 2026-07-07 | 2026-07-20 | maximum hold | 9 | −$9,113.94 | −$11,068.95 |
| C-cal | D1:GDX | 2023-02-06 | 2023-02-21 | maximum hold | 10 | −$6,455.48 | −$8,046.67 |
| C-cal | D1:GDX | 2026-10-23 | open | open (marked at the last close) | 5 | −$5,564.76 | −$7,062.59 |
| C-cal | D1:GDX | 2022-09-16 | 2022-09-28 | maximum hold | 8 | −$3,375.88 | −$8,005.18 |
| C-cal | D1:GDX | 2026-06-22 | 2026-07-06 | maximum hold | 9 | −$2,410.94 | −$9,554.20 |

**By component (FULL run; booked attribution, not causal):**

| Config | Component | Lots | Wins | Losses | Booked net | Decisions granted / refused |
|---|---|---:|---:|---:|---:|---|
| A | D1:GDX | 31 | 23 | 7 | $221,780.72 | 31 / 23 |
| A | D1:VGT | 7 | 6 | 1 | $146,898.43 | 7 / 6 |
| A | G:VGT | 8 | 8 | 0 | $110,926.02 | 8 / 4 |
| B | D1:GDX | 26 | 20 | 5 | $180,682.07 | 26 / 20 |
| B | D1:VGT | 7 | 6 | 1 | $147,095.71 | 7 / 4 |
| B | G:VGT | 8 | 8 | 0 | $110,926.02 | 8 / 4 |
| C | D1:GDX | 28 | 22 | 5 | $217,135.69 | 28 / 17 |
| C | D1:VGT | 7 | 6 | 1 | $146,246.79 | 7 / 4 |
| C | G:VGT | 10 | 9 | 1 | $99,059.47 | 10 / 3 |
| C-cal | D1:GDX | 29 | 21 | 7 | $181,709.88 | 29 / 24 |
| C-cal | D1:VGT | 7 | 6 | 1 | $146,049.60 | 7 / 6 |
| C-cal | G:VGT | 11 | 9 | 2 | $102,958.20 | 11 / 4 |

**Capital-pool conflicts: refused decisions by occupant (FULL run):**

| Config | Refused component | Occupant | Refusals |
|---|---|---|---:|
| A | D1:GDX | G:VGT lot 1 ($100000.00) | 11 |
| A | D1:GDX | G:VGT lot 2 ($100000.00) | 1 |
| A | D1:GDX | D1:VGT lot 12 ($100000.00) | 1 |
| A | D1:GDX | G:VGT lot 15 ($100000.00) | 2 |
| A | D1:GDX | D1:VGT lot 20 ($100000.00) | 2 |
| A | D1:GDX | D1:VGT lot 21 ($100000.00) | 4 |
| A | D1:GDX | G:VGT lot 32 ($100000.00) | 1 |
| A | D1:GDX | G:VGT lot 39 ($100000.00) | 1 |
| A | G:VGT | D1:GDX lot 4 ($100000.00) | 1 |
| A | G:VGT | D1:VGT lot 11 ($100000.00) | 1 |
| A | G:VGT | D1:GDX lot 31 ($100000.00) | 1 |
| A | G:VGT | D1:VGT lot 36 ($100000.00) | 1 |
| A | D1:VGT | D1:GDX lot 7 ($100000.00) | 1 |
| A | D1:VGT | D1:GDX lot 8 ($100000.00) | 1 |
| A | D1:VGT | D1:GDX lot 19 ($100000.00) | 1 |
| A | D1:VGT | D1:GDX lot 23 ($100000.00) | 1 |
| A | D1:VGT | D1:GDX lot 25 ($100000.00) | 1 |
| A | D1:VGT | D1:GDX lot 27 ($100000.00) | 1 |
| B | D1:GDX | G:VGT lot 1 ($100000.00) | 9 |
| B | D1:GDX | G:VGT lot 2 ($100000.00) | 1 |
| B | D1:GDX | D1:VGT lot 12 ($100000.00) | 1 |
| B | D1:GDX | G:VGT lot 15 ($100000.00) | 2 |
| B | D1:GDX | D1:VGT lot 19 ($100000.00) | 2 |
| B | D1:GDX | D1:VGT lot 20 ($100000.00) | 3 |
| B | D1:GDX | G:VGT lot 29 ($100000.00) | 1 |
| B | D1:GDX | G:VGT lot 35 ($100000.00) | 1 |
| B | G:VGT | D1:GDX lot 4 ($100000.00) | 1 |
| B | G:VGT | D1:VGT lot 11 ($100000.00) | 1 |
| B | G:VGT | D1:GDX lot 28 ($100000.00) | 1 |
| B | G:VGT | D1:VGT lot 32 ($100000.00) | 1 |
| B | D1:VGT | D1:GDX lot 7 ($100000.00) | 1 |
| B | D1:VGT | D1:GDX lot 8 ($100000.00) | 1 |
| B | D1:VGT | D1:GDX lot 18 ($100000.00) | 1 |
| B | D1:VGT | D1:GDX lot 22 ($100000.00) | 1 |
| C | D1:GDX | G:VGT lot 1 ($100000.00) | 10 |
| C | D1:GDX | D1:VGT lot 13 ($100000.00) | 1 |
| C | D1:GDX | G:VGT lot 16 ($100000.00) | 1 |
| C | D1:GDX | D1:VGT lot 21 ($100000.00) | 2 |
| C | D1:GDX | D1:VGT lot 22 ($100000.00) | 2 |
| C | D1:GDX | G:VGT lot 39 ($100000.00) | 1 |
| C | G:VGT | D1:GDX lot 4 ($100000.00) | 1 |
| C | G:VGT | D1:GDX lot 14 ($100000.00) | 1 |
| C | G:VGT | D1:GDX lot 31 ($100000.00) | 1 |
| C | D1:VGT | D1:GDX lot 8 ($100000.00) | 1 |
| C | D1:VGT | D1:GDX lot 9 ($100000.00) | 1 |
| C | D1:VGT | D1:GDX lot 20 ($100000.00) | 1 |
| C | D1:VGT | D1:GDX lot 24 ($100000.00) | 1 |
| C-cal | D1:GDX | G:VGT lot 1 ($100000.00) | 13 |
| C-cal | D1:GDX | D1:VGT lot 13 ($100000.00) | 1 |
| C-cal | D1:GDX | G:VGT lot 16 ($100000.00) | 1 |
| C-cal | D1:GDX | D1:VGT lot 21 ($100000.00) | 2 |
| C-cal | D1:GDX | D1:VGT lot 22 ($100000.00) | 4 |
| C-cal | D1:GDX | G:VGT lot 33 ($100000.00) | 2 |
| C-cal | D1:GDX | G:VGT lot 40 ($100000.00) | 1 |
| C-cal | G:VGT | D1:GDX lot 4 ($100000.00) | 1 |
| C-cal | G:VGT | D1:GDX lot 14 ($100000.00) | 1 |
| C-cal | G:VGT | D1:GDX lot 15 ($100000.00) | 1 |
| C-cal | G:VGT | D1:GDX lot 32 ($100000.00) | 1 |
| C-cal | D1:VGT | D1:GDX lot 8 ($100000.00) | 1 |
| C-cal | D1:VGT | D1:GDX lot 9 ($100000.00) | 1 |
| C-cal | D1:VGT | D1:GDX lot 20 ($100000.00) | 1 |
| C-cal | D1:VGT | D1:GDX lot 24 ($100000.00) | 1 |
| C-cal | D1:VGT | D1:GDX lot 26 ($100000.00) | 1 |
| C-cal | D1:VGT | D1:GDX lot 28 ($100000.00) | 1 |

**Exit reasons (FULL run):**

| Config | Component | Exits |
|---|---|---|
| A | G:VGT | trailing stop 6; trailing stop gap 2 |
| A | D1:GDX | trailing stop 18; trailing stop gap 5; maximum hold 7; open 1 |
| A | D1:VGT | trailing stop 6; maximum hold 1 |
| B | G:VGT | trailing stop 6; trailing stop gap 2 |
| B | D1:GDX | trailing stop 14; trailing stop gap 5; maximum hold 5; buffered intraday loss 1; open 1 |
| B | D1:VGT | trailing stop 6; maximum hold 1 |
| C | G:VGT | trailing stop 7; trailing stop gap 2; maximum hold 1 |
| C | D1:GDX | trailing stop 17; trailing stop gap 5; buffered intraday loss 1; maximum hold 4; open 1 |
| C | D1:VGT | trailing stop 6; maximum hold 1 |
| C-cal | G:VGT | trailing stop 8; trailing stop gap 1; maximum hold 2 |
| C-cal | D1:GDX | trailing stop 16; trailing stop gap 5; maximum hold 7; open 1 |
| C-cal | D1:VGT | trailing stop 6; maximum hold 1 |

**Changes in trade chronology (matched lots, FULL run; X vs Y):** lots unchanged, retimed exits (same entry, other exit — extended or shortened by the convention), retimed, newly admitted, displaced (Δ net in parentheses).

| X vs Y | Unchanged | Retimed exit | Retimed | Newly admitted | Displaced | Extended | Shortened | Δ net |
|---|---|---|---|---|---|---|---|---:|
| B vs A | 25 ($0.00) | 6 (−$12,094.43) | 10 ($34,224.67) | 0 ($0.00) | 5 (−$63,031.62) | 6 (−$12,094.43) | 0 ($0.00) | −$40,901.38 |
| C vs A | 16 (−$128.33) | 11 (−$9,854.57) | 14 ($55,269.51) | 4 ($7,261.63) | 5 (−$69,711.46) | 11 (−$9,854.57) | 0 ($0.00) | −$17,163.23 |
| C vs B | 16 (−$128.33) | 10 ($2,116.71) | 13 (−$7,763.27) | 6 ($57,135.68) | 2 (−$27,622.64) | 6 (−$1,711.39) | 4 ($3,828.12) | $23,738.16 |
| C vs C-cal | 28 ($0.00) | 8 ($5,177.52) | 8 ($51,213.39) | 1 ($26,088.03) | 3 (−$50,754.67) | 8 ($5,177.52) | 0 ($0.00) | $31,724.27 |

**Trades extended or shortened (same entry, another exit):**

| X vs Y | Component | Entry | Exit under Y | Exit under X | Net under Y | Net under X | Δ |
|---|---|---|---|---|---:|---:|---:|
| B vs A | D1:VGT | 2022-06-13 | 2022-06-30 | 2022-07-13 | −$330.27 | −$599.44 | −$269.17 |
| B vs A | D1:GDX | 2022-09-16 | 2022-09-29 | 2022-10-07 | −$106.02 | $4,441.28 | $4,547.29 |
| B vs A | D1:GDX | 2022-10-10 | 2022-10-24 | 2022-11-02 | −$1,622.64 | −$2,703.87 | −$1,081.23 |
| B vs A | D1:GDX | 2023-02-06 | 2023-02-21 | 2023-02-24 | −$6,455.48 | −$12,118.02 | −$5,662.54 |
| B vs A | D1:GDX | 2026-06-22 | 2026-07-06 | 2026-07-10 | −$2,410.94 | −$8,014.71 | −$5,603.77 |
| B vs A | D1:GDX | 2026-10-07 | 2026-10-22 | 2026-10-26 | −$1,637.23 | −$5,662.25 | −$4,025.01 |
| C vs A | D1:VGT | 2018-12-24 | 2019-05-13 | 2019-05-13 | $23,289.51 | $23,151.96 | −$137.55 |
| C vs A | D1:VGT | 2020-04-02 | 2020-09-04 | 2020-09-04 | $51,723.87 | $51,555.16 | −$168.71 |
| C vs A | G:VGT | 2021-05-14 | 2021-09-20 | 2021-09-29 | $8,688.67 | $7,697.85 | −$990.81 |
| C vs A | D1:VGT | 2022-06-13 | 2022-06-30 | 2022-07-13 | −$330.27 | −$599.44 | −$269.17 |
| C vs A | D1:GDX | 2022-09-16 | 2022-09-29 | 2022-10-07 | −$106.02 | $4,441.28 | $4,547.29 |
| C vs A | D1:GDX | 2022-10-10 | 2022-10-24 | 2022-11-02 | −$1,622.64 | −$2,184.64 | −$562.00 |
| C vs A | D1:GDX | 2023-02-06 | 2023-02-21 | 2023-02-23 | −$6,455.48 | −$9,501.16 | −$3,045.68 |
| C vs A | D1:VGT | 2025-04-04 | 2025-04-10 | 2025-04-10 | $858.86 | $732.41 | −$126.45 |
| C vs A | D1:VGT | 2025-04-21 | 2025-11-07 | 2025-11-07 | $46,671.65 | $46,506.92 | −$164.72 |
| C vs A | D1:GDX | 2026-06-22 | 2026-07-06 | 2026-07-09 | −$2,410.94 | −$8,769.64 | −$6,358.70 |
| C vs A | D1:GDX | 2026-10-07 | 2026-10-22 | 2026-10-23 | −$1,637.23 | −$4,215.30 | −$2,578.07 |
| C vs B | D1:VGT | 2018-12-24 | 2019-05-13 | 2019-05-13 | $23,289.51 | $23,151.96 | −$137.55 |
| C vs B | D1:VGT | 2020-04-02 | 2020-09-04 | 2020-09-04 | $51,723.87 | $51,555.16 | −$168.71 |
| C vs B | G:VGT | 2021-05-14 | 2021-09-20 | 2021-09-29 | $8,688.67 | $7,697.85 | −$990.81 |
| C vs B | D1:VGT | 2022-07-14 | 2022-08-26 | 2022-08-26 | $9,680.91 | $9,557.76 | −$123.15 |
| C vs B | D1:GDX | 2022-10-10 | 2022-11-02 | 2022-11-02 | −$2,703.87 | −$2,184.64 | $519.23 |
| C vs B | D1:GDX | 2023-02-06 | 2023-02-24 | 2023-02-23 | −$12,118.02 | −$9,501.16 | $2,616.87 |
| C vs B | D1:VGT | 2025-04-04 | 2025-04-10 | 2025-04-10 | $858.86 | $732.41 | −$126.45 |
| C vs B | D1:VGT | 2025-04-21 | 2025-11-07 | 2025-11-07 | $46,671.65 | $46,506.92 | −$164.72 |
| C vs B | D1:GDX | 2026-06-22 | 2026-07-10 | 2026-07-09 | −$8,014.71 | −$8,769.64 | −$754.93 |
| C vs B | D1:GDX | 2026-10-07 | 2026-10-26 | 2026-10-23 | −$5,662.25 | −$4,215.30 | $1,446.95 |
| C vs C-cal | G:VGT | 2019-10-01 | 2019-10-21 | 2020-02-24 | −$158.23 | $11,958.57 | $12,116.80 |
| C vs C-cal | D1:VGT | 2022-06-13 | 2022-06-30 | 2022-07-13 | −$330.27 | −$599.44 | −$269.17 |
| C vs C-cal | D1:GDX | 2022-09-16 | 2022-09-28 | 2022-10-07 | −$3,375.88 | $4,441.28 | $7,817.16 |
| C vs C-cal | D1:GDX | 2022-10-10 | 2022-10-24 | 2022-11-02 | −$1,622.64 | −$2,184.64 | −$562.00 |
| C vs C-cal | D1:GDX | 2023-02-06 | 2023-02-21 | 2023-02-23 | −$6,455.48 | −$9,501.16 | −$3,045.68 |
| C vs C-cal | G:VGT | 2025-01-29 | 2025-02-24 | 2025-02-27 | −$337.79 | −$2,280.61 | −$1,942.82 |
| C vs C-cal | D1:GDX | 2026-06-22 | 2026-07-06 | 2026-07-09 | −$2,410.94 | −$8,769.64 | −$6,358.70 |
| C vs C-cal | D1:GDX | 2026-10-07 | 2026-10-22 | 2026-10-23 | −$1,637.23 | −$4,215.30 | −$2,578.07 |

**Parameter changes of C against New L0 (A):**

| Parameter | New L0 (A) | C |
|---|---|---|
| D1·VGT targetPercentChange | 237 | 234 |
| D1·VGT trailingStopPercentage | 73 | 74 |
| D1·VGT maximumHoldDays | 15 | 17 |
| D1·VGT tickWindowSize | 72 | 79 |
| D1·VGT intradayLossBuffer | 42 | 44 |
| D1·VGT pullback | 103 | 113 |
| D1·VGT continuationWindow | 41 | 57 |
| D1·GDX maximumHoldDays | 13 | 12 |
| D1·GDX tickWindowSize | 232 | 227 |
| D1·GDX intradayLossBuffer | 25 | 19 |
| D1·GDX pullback | 152 | 148 |
| D1·GDX continuationWindow | 10 | 13 |
| Growth·VGT advanceFromRecentLowPercent | 5.6 | 5.7 |
| Growth·VGT classicReboundPercent | 3.01 | 2.6 |
| Growth·VGT continuationWindowSessions | 67 | 52 |
| Growth·VGT dipLookbackSessions | 64 | 77 |
| Growth·VGT dipThresholdPercent | 11.9 | 12.5 |
| Growth·VGT initialStopAtrMultiple | 1.2 | (inactive) |
| Growth·VGT initialStopAtrSessions | 16 | (inactive) |
| Growth·VGT initialStopEnabled | true | false |
| Growth·VGT intradayLossBufferEnabled | false | true |
| Growth·VGT intradayLossBufferPercent | (inactive) | 3.3 |
| Growth·VGT maximumHoldDays | 22 | 20 |
| Growth·VGT recentLowLookbackBars | 84 | 77 |
| Growth·VGT recoveryConfirmationSessions | 5 | 6 |
| Growth·VGT recoveryRetracementPercent | 46.2 | 52.3 |
| Growth·VGT trailingStopPercent | 5.7 | 6.3 |
