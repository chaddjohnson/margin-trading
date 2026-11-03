# Final holdout results

Run 2026-10-15T10:02:19.188Z (attempt 1) against the freeze recorded 2026-10-15T10:02:11.469Z (freeze.json sha256 `a963b48627c21cdcd40cf133683ba1d60d58e31ae1d7b27701a4b840c57985da`, code b7abde6828 plus uncommitted changes, code hash `33def0c2a969536d`).

**Read this first**

- Each symbol's **rank-1** parameters were frozen before any session after 2023-12-31 was read, and were run on the holdout **once**. Ranks 2–N were not run on the holdout and nothing here re-ranks them.
- The holdout runs from the first session on or after 2024-01-01 to the last available session (2026-09-08). The data came from Stooq's bulk archive dated 2026-09-09, because live Stooq downloads were blocked (DATA_AUDIT.md), so it stops short of mid-October 2026.
- **2024–2026 is not pristine evidence.** You studied this strategy on parts of this period before this workflow existed. It was untouched *within this optimization workflow*, but only data arriving after today is a genuinely new test.
- Each symbol starts flat on the first holdout session (2023 sessions serve only as reference-high history). A position open at the end is marked to the last close, net of accrued interest. Money is per $100,000 margin allocation at 11% simple interest, without commissions or spread; entries fill at the signal close.
- The original-parameter rows are a labelled baseline, not a selection input.

## Summary

| Symbol | Rank-1 parameters | Window | Rank-1 net | Rank-1 max DD | Rank-1 trades | Original net | Original max DD | Original trades |
|---|---|---|---|---|---|---|---|---|
| VGT | dipTenths=2.5% trailingStopTenths=2.1% maximumHoldDays=8 lookbackSessions=78 materialLossTenths=2.2% lowerReentryTenths=4.0% retraceTenths=36.7% | 2024-01-02 – 2026-09-08 | $54,397 | $21,541 | 61 | $74,419 | $28,687 | 10 |
| XLK | dipTenths=10.1% trailingStopTenths=7.4% maximumHoldDays=10 lookbackSessions=161 materialLossTenths=0.1% lowerReentryTenths=0.1% retraceTenths=53.6% | 2024-01-02 – 2026-09-08 | $2,774 | $30,496 | 11 | $70,555 | $26,627 | 11 |
| QQQ | dipTenths=7.3% trailingStopTenths=6.9% maximumHoldDays=14 lookbackSessions=35 materialLossTenths=0.7% lowerReentryTenths=12.5% retraceTenths=54.5% | 2024-01-02 – 2026-09-08 | $52,536 | $15,788 | 10 | $51,341 | $12,704 | 6 |
| IGV | dipTenths=7.8% trailingStopTenths=4.5% maximumHoldDays=13 lookbackSessions=200 materialLossTenths=4.2% lowerReentryTenths=5.1% retraceTenths=90.0% | 2024-01-02 – 2026-09-08 | $16,580 | $23,896 | 19 | $69,403 | $27,957 | 17 |
| VOOG | dipTenths=19.6% trailingStopTenths=7.4% maximumHoldDays=9 lookbackSessions=101 materialLossTenths=0.9% lowerReentryTenths=4.7% retraceTenths=71.2% | 2024-01-02 – 2026-09-08 | $2,274 | $7,986 | 1 | $32,634 | $20,875 | 5 |
| VOO | dipTenths=8.6% trailingStopTenths=6.3% maximumHoldDays=10 lookbackSessions=202 materialLossTenths=0.4% lowerReentryTenths=7.3% retraceTenths=36.4% | 2024-01-02 – 2026-09-08 | $21,180 | $10,755 | 5 | -$4,492 | $12,901 | 2 |
| SPY | dipTenths=2.9% trailingStopTenths=3.6% maximumHoldDays=10 lookbackSessions=228 materialLossTenths=2.1% lowerReentryTenths=6.5% retraceTenths=97.3% | 2024-01-02 – 2026-09-08 | -$9,237 | $21,419 | 15 | -$3,969 | $12,487 | 2 |
| SMH | dipTenths=2.3% trailingStopTenths=2.1% maximumHoldDays=14 lookbackSessions=178 materialLossTenths=9.0% lowerReentryTenths=12.6% retraceTenths=49.8% | 2024-01-02 – 2026-09-08 | $65,903 | $21,356 | 66 | $121,633 | $30,195 | 16 |
| SOXX | dipTenths=3.5% trailingStopTenths=3.1% maximumHoldDays=14 lookbackSessions=160 materialLossTenths=2.6% lowerReentryTenths=8.4% retraceTenths=78.5% | 2024-01-02 – 2026-09-08 | $30,696 | $39,362 | 38 | $27,127 | $50,410 | 16 |
| VUG | dipTenths=4.1% trailingStopTenths=5.7% maximumHoldDays=14 lookbackSessions=101 materialLossTenths=0.8% lowerReentryTenths=3.8% retraceTenths=33.7% | 2024-01-02 – 2026-09-08 | $32,389 | $16,297 | 16 | $28,478 | $18,399 | 5 |
| SCHG | dipTenths=4.7% trailingStopTenths=3.5% maximumHoldDays=11 lookbackSessions=98 materialLossTenths=1.1% lowerReentryTenths=1.8% retraceTenths=61.1% | 2024-01-02 – 2026-09-08 | $13,123 | $20,947 | 17 | $13,318 | $23,109 | 5 |
| IWF | dipTenths=4.9% trailingStopTenths=3.1% maximumHoldDays=10 lookbackSessions=152 materialLossTenths=2.9% lowerReentryTenths=3.6% retraceTenths=74.2% | 2024-01-02 – 2026-09-08 | $18,546 | $19,447 | 22 | $31,821 | $18,046 | 6 |
| XLY | dipTenths=5.7% trailingStopTenths=2.1% maximumHoldDays=4 lookbackSessions=209 materialLossTenths=1.6% lowerReentryTenths=2.3% retraceTenths=50.1% | 2024-01-02 – 2026-09-08 | -$23,335 | $36,795 | 43 | $29,551 | $23,934 | 6 |
| IWN | dipTenths=22.5% trailingStopTenths=2.8% maximumHoldDays=26 lookbackSessions=239 materialLossTenths=0.2% lowerReentryTenths=0.1% retraceTenths=59.9% | 2024-01-02 – 2026-09-08 | $614 | $4,135 | 2 | $8,819 | $24,206 | 6 |
| NVDA | dipTenths=3.8% trailingStopTenths=2.1% maximumHoldDays=11 lookbackSessions=80 materialLossTenths=2.7% lowerReentryTenths=12.8% retraceTenths=74.5% | 2024-01-02 – 2026-09-08 | $73,133 | $32,415 | 44 | $148,217 | $31,981 | 26 |
| AAPL | dipTenths=25.7% trailingStopTenths=11.9% maximumHoldDays=1 lookbackSessions=247 materialLossTenths=1.6% lowerReentryTenths=0.9% retraceTenths=30.2% | 2024-01-02 – 2026-09-08 | -$8,626 | $8,626 | 3 | $21,908 | $27,761 | 13 |
| MSFT | dipTenths=2.3% trailingStopTenths=3.2% maximumHoldDays=22 lookbackSessions=89 materialLossTenths=5.7% lowerReentryTenths=3.1% retraceTenths=48.0% | 2024-01-02 – 2026-09-08 | -$21,250 | $41,434 | 33 | $31,863 | $39,148 | 17 |
| AMD | dipTenths=39.8% trailingStopTenths=2.8% maximumHoldDays=72 lookbackSessions=110 materialLossTenths=1.8% lowerReentryTenths=9.4% retraceTenths=37.8% | 2024-01-02 – 2026-09-08 | -$10,651 | $24,226 | 3 | $128,295 | $79,161 | 38 |
| META | dipTenths=17.1% trailingStopTenths=2.3% maximumHoldDays=8 lookbackSessions=219 materialLossTenths=3.4% lowerReentryTenths=13.6% retraceTenths=17.4% | 2024-01-02 – 2026-09-08 | $3,590 | $29,672 | 35 | $27,186 | $44,081 | 21 |
| GOOGL | dipTenths=8.8% trailingStopTenths=2.5% maximumHoldDays=8 lookbackSessions=199 materialLossTenths=6.2% lowerReentryTenths=2.0% retraceTenths=62.1% | 2024-01-02 – 2026-09-08 | $40,009 | $19,498 | 49 | $113,558 | $22,043 | 17 |
| AMZN | dipTenths=25.1% trailingStopTenths=8.8% maximumHoldDays=10 lookbackSessions=96 materialLossTenths=6.0% lowerReentryTenths=7.9% retraceTenths=79.4% | 2024-01-02 – 2026-09-08 | $20,198 | $11,697 | 2 | -$5,818 | $29,691 | 15 |

Measured: rank-1 was profitable on 16 of 21 symbols and beat the original parameters on 5. Summed over symbols: rank-1 $374,844 versus original $1,015,848 (a sum of separate $100,000 allocations, not a portfolio).

## Per symbol

### VGT

Frozen rank 1 `c8a13b9e75b27`: dipTenths 2.5%, trailingStopTenths 2.1%, maximumHoldDays 8, lookbackSessions 78, materialLossTenths 2.2%, lowerReentryTenths 4.0%, retraceTenths 36.7%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $54,397 | $74,438 | $20,041 | $21,541 | 61 | 59% | 2.01 | $579 | -$6,225 | 67% | 9 |
| original defaults | $74,419 | $91,959 | $17,540 | $28,687 | 10 | 30% | 8.40 | -$636 | -$3,025 | 59% | 31 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $27,983 / $12,158 | $16,358 / $21,541 | $10,056 / $13,424 |
| original | $12,243 / $16,328 | $38,749 / $18,190 | $23,427 / $16,344 |

Trades and equity: `results/main/holdout/VGT/rank1-trades.csv`, `rank1-equity.csv`.

### XLK

Frozen rank 1 `c56e3a3361ed3`: dipTenths 10.1%, trailingStopTenths 7.4%, maximumHoldDays 10, lookbackSessions 161, materialLossTenths 0.1%, lowerReentryTenths 0.1%, retraceTenths 53.6%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $2,774 | $19,018 | $16,244 | $30,496 | 11 | 36% | 1.08 | -$1,291 | -$15,458 | 55% | 13 |
| original defaults | $70,555 | $90,777 | $20,222 | $26,627 | 11 | 45% | 7.47 | -$283 | -$4,658 | 68% | 19 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | -$3,069 / $15,825 | $6,716 / $28,906 | -$873 / $15,114 |
| original | $2,750 / $10,259 | $33,736 / $25,638 | $34,070 / $17,626 |

Trades and equity: `results/main/holdout/XLK/rank1-trades.csv`, `rank1-equity.csv`.

### QQQ

Frozen rank 1 `c5aeb2312d3e1`: dipTenths 7.3%, trailingStopTenths 6.9%, maximumHoldDays 14, lookbackSessions 35, materialLossTenths 0.7%, lowerReentryTenths 12.5%, retraceTenths 54.5%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $52,536 | $74,506 | $21,970 | $15,788 | 10 | 60% | 5.84 | $3,511 | -$5,223 | 74% | 64 |
| original defaults | $51,341 | $63,486 | $12,145 | $12,704 | 6 | 67% | 18.35 | $4,320 | -$2,774 | 41% | 40 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $13,612 / $15,788 | $24,326 / $12,336 | $14,599 / $14,617 |
| original | -$185 / $8,017 | $24,005 / $11,849 | $27,521 / $10,414 |

Trades and equity: `results/main/holdout/QQQ/rank1-trades.csv`, `rank1-equity.csv`.

### IGV

Frozen rank 1 `cb4ee7170a324`: dipTenths 7.8%, trailingStopTenths 4.5%, maximumHoldDays 13, lookbackSessions 200, materialLossTenths 4.2%, lowerReentryTenths 5.1%, retraceTenths 90.0%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $16,580 | $29,811 | $13,230 | $23,896 | 19 | 42% | 1.47 | -$351 | -$8,909 | 45% | 15 |
| original defaults | $69,403 | $90,378 | $20,975 | $27,957 | 17 | 41% | 2.91 | -$992 | -$8,514 | 71% | 28 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $13,083 / $8,436 | $17,518 / $16,867 | -$14,021 / $21,271 |
| original | $27,258 / $11,421 | $13,479 / $23,933 | $28,665 / $19,706 |

Trades and equity: `results/main/holdout/IGV/rank1-trades.csv`, `rank1-equity.csv`.

### VOOG

Frozen rank 1 `c132e2f4cacf9`: dipTenths 19.6%, trailingStopTenths 7.4%, maximumHoldDays 9, lookbackSessions 101, materialLossTenths 0.9%, lowerReentryTenths 4.7%, retraceTenths 71.2%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $2,274 | $2,786 | $512 | $7,986 | 1 | 100% | ∞ | $2,274 | $2,274 | 1% | 17 |
| original defaults | $32,634 | $53,188 | $20,553 | $20,875 | 5 | 60% | 6.75 | $10,451 | -$3,029 | 69% | 124 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $0 / $0 | $2,274 / $7,986 | $0 / $0 |
| original | $15,780 / $7,458 | $13,282 / $20,875 | $3,573 / $14,125 |

Trades and equity: `results/main/holdout/VOOG/rank1-trades.csv`, `rank1-equity.csv`.

### VOO

Frozen rank 1 `c1b5d48fca05d`: dipTenths 8.6%, trailingStopTenths 6.3%, maximumHoldDays 10, lookbackSessions 202, materialLossTenths 0.4%, lowerReentryTenths 7.3%, retraceTenths 36.4%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $21,180 | $37,062 | $15,882 | $10,755 | 5 | 60% | 5.79 | $874 | -$2,652 | 54% | 20 |
| original defaults | -$4,492 | -$3,407 | $1,085 | $12,901 | 2 | 0% | 0.00 | -$2,246 | -$3,606 | 3% | 18 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $0 / $0 | $12,844 / $8,840 | $8,336 / $9,954 |
| original | $0 / $0 | -$4,492 / $12,901 | $0 / $0 |

Trades and equity: `results/main/holdout/VOO/rank1-trades.csv`, `rank1-equity.csv`.

### SPY

Frozen rank 1 `c7ef266f40592`: dipTenths 2.9%, trailingStopTenths 3.6%, maximumHoldDays 10, lookbackSessions 228, materialLossTenths 2.1%, lowerReentryTenths 6.5%, retraceTenths 97.3%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | -$9,237 | $4,506 | $13,742 | $21,419 | 15 | 33% | 0.56 | -$364 | -$5,304 | 46% | 22 |
| original defaults | -$3,969 | -$2,884 | $1,085 | $12,487 | 2 | 0% | 0.00 | -$1,984 | -$3,438 | 3% | 18 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | -$16 / $9,501 | -$5,255 / $12,675 | -$3,967 / $10,069 |
| original | $0 / $0 | -$3,969 / $12,487 | $0 / $0 |

Trades and equity: `results/main/holdout/SPY/rank1-trades.csv`, `rank1-equity.csv`.

### SMH

Frozen rank 1 `cb967eac6e1c9`: dipTenths 2.3%, trailingStopTenths 2.1%, maximumHoldDays 14, lookbackSessions 178, materialLossTenths 9.0%, lowerReentryTenths 12.6%, retraceTenths 49.8%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $65,903 | $86,818 | $20,915 | $21,356 | 66 | 67% | 1.72 | $1,260 | -$12,165 | 71% | 11 |
| original defaults | $121,633 | $138,992 | $17,359 | $30,195 | 16 | 56% | 6.18 | $1,610 | -$7,941 | 59% | 20 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $15,403 / $18,108 | $27,922 / $21,294 | $22,579 / $19,258 |
| original | $3,170 / $13,518 | $67,548 / $26,530 | $50,914 / $21,715 |

Trades and equity: `results/main/holdout/SMH/rank1-trades.csv`, `rank1-equity.csv`.

### SOXX

Frozen rank 1 `ceea67e5d2d0f`: dipTenths 3.5%, trailingStopTenths 3.1%, maximumHoldDays 14, lookbackSessions 160, materialLossTenths 2.6%, lowerReentryTenths 8.4%, retraceTenths 78.5%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $30,696 | $44,710 | $14,014 | $39,362 | 38 | 71% | 1.37 | $1,297 | -$26,369 | 48% | 14 |
| original defaults | $27,127 | $42,346 | $15,219 | $50,410 | 16 | 44% | 1.53 | -$2,455 | -$18,847 | 52% | 17 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $8,733 / $17,450 | -$12,858 / $32,761 | $34,821 / $14,784 |
| original | -$27,471 / $30,214 | $60,287 / $29,819 | -$5,689 / $26,728 |

Trades and equity: `results/main/holdout/SOXX/rank1-trades.csv`, `rank1-equity.csv`.

### VUG

Frozen rank 1 `c500e0b8f43c7`: dipTenths 4.1%, trailingStopTenths 5.7%, maximumHoldDays 14, lookbackSessions 101, materialLossTenths 0.8%, lowerReentryTenths 3.8%, retraceTenths 33.7%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $32,389 | $54,299 | $21,910 | $16,297 | 16 | 31% | 2.41 | -$1,188 | -$4,881 | 74% | 19 |
| original defaults | $28,478 | $42,884 | $14,405 | $18,399 | 5 | 60% | 4.29 | $1,343 | -$5,776 | 49% | 21 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $13,271 / $12,975 | $22,815 / $12,848 | -$3,697 / $10,759 |
| original | $16,172 / $7,178 | $18,083 / $14,743 | -$5,776 / $7,805 |

Trades and equity: `results/main/holdout/VUG/rank1-trades.csv`, `rank1-equity.csv`.

### SCHG

Frozen rank 1 `cdb82c9a686c1`: dipTenths 4.7%, trailingStopTenths 3.5%, maximumHoldDays 11, lookbackSessions 98, materialLossTenths 1.1%, lowerReentryTenths 1.8%, retraceTenths 61.1%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $13,123 | $27,076 | $13,953 | $20,947 | 17 | 29% | 1.53 | -$518 | -$6,415 | 48% | 17 |
| original defaults | $13,318 | $27,151 | $13,833 | $23,109 | 5 | 40% | 2.07 | -$3,413 | -$5,528 | 47% | 18 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $3,933 / $7,542 | $17,113 / $20,947 | -$7,923 / $14,642 |
| original | $16,151 / $7,337 | $2,695 / $21,618 | -$5,528 / $5,708 |

Trades and equity: `results/main/holdout/SCHG/rank1-trades.csv`, `rank1-equity.csv`.

### IWF

Frozen rank 1 `c3da8d0b09417`: dipTenths 4.9%, trailingStopTenths 3.1%, maximumHoldDays 10, lookbackSessions 152, materialLossTenths 2.9%, lowerReentryTenths 3.6%, retraceTenths 74.2%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $18,546 | $31,083 | $12,537 | $19,447 | 22 | 36% | 1.58 | -$565 | -$5,549 | 44% | 11 |
| original defaults | $31,821 | $47,462 | $15,641 | $18,046 | 6 | 67% | 4.68 | $3,553 | -$5,460 | 53% | 31 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $7,857 / $5,964 | $10,199 / $19,447 | $490 / $13,325 |
| original | $12,440 / $7,230 | $18,212 / $15,232 | $1,170 / $7,359 |

Trades and equity: `results/main/holdout/IWF/rank1-trades.csv`, `rank1-equity.csv`.

### XLY

Frozen rank 1 `c7e8ba5c8e4b6`: dipTenths 5.7%, trailingStopTenths 2.1%, maximumHoldDays 4, lookbackSessions 209, materialLossTenths 1.6%, lowerReentryTenths 2.3%, retraceTenths 50.1%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | -$23,335 | -$14,776 | $8,559 | $36,795 | 43 | 28% | 0.52 | -$1,051 | -$3,442 | 28% | 6 |
| original defaults | $29,551 | $43,264 | $13,712 | $23,934 | 6 | 50% | 3.29 | $1,426 | -$9,049 | 47% | 32 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | -$2,304 / $4,475 | -$26,010 / $28,177 | $4,979 / $7,055 |
| original | $27,119 / $9,001 | $2,371 / $14,933 | $62 / $6,362 |

Trades and equity: `results/main/holdout/XLY/rank1-trades.csv`, `rank1-equity.csv`.

### IWN

Frozen rank 1 `cb4e9083adf83`: dipTenths 22.5%, trailingStopTenths 2.8%, maximumHoldDays 26, lookbackSessions 239, materialLossTenths 0.2%, lowerReentryTenths 0.1%, retraceTenths 59.9%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $614 | $1,186 | $573 | $4,135 | 2 | 100% | ∞ | $307 | $18 | 2% | 10 |
| original defaults | $8,819 | $23,857 | $15,038 | $24,206 | 6 | 33% | 1.82 | -$404 | -$6,646 | 51% | 33 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $0 / $0 | $614 / $4,135 | $0 / $0 |
| original | $5,780 / $8,842 | $1,448 / $20,375 | $1,592 / $10,132 |

Trades and equity: `results/main/holdout/IWN/rank1-trades.csv`, `rank1-equity.csv`.

### NVDA

Frozen rank 1 `cd26484c6e749`: dipTenths 3.8%, trailingStopTenths 2.1%, maximumHoldDays 11, lookbackSessions 80, materialLossTenths 2.7%, lowerReentryTenths 12.8%, retraceTenths 74.5%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $73,133 | $83,530 | $10,397 | $32,415 | 44 | 64% | 1.85 | $1,277 | -$18,323 | 34% | 7 |
| original defaults | $148,217 | $168,530 | $20,312 | $31,981 | 26 | 54% | 3.95 | $441 | -$10,331 | 68% | 20 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $70,069 / $18,432 | $5,213 / $27,526 | -$2,149 / $12,874 |
| original | $71,784 / $22,983 | $63,177 / $31,981 | $13,257 / $20,734 |

Trades and equity: `results/main/holdout/NVDA/rank1-trades.csv`, `rank1-equity.csv`.

### AAPL

Frozen rank 1 `c1a2c8e412c2e`: dipTenths 25.7%, trailingStopTenths 11.9%, maximumHoldDays 1, lookbackSessions 247, materialLossTenths 1.6%, lowerReentryTenths 0.9%, retraceTenths 30.2%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | -$8,626 | -$8,476 | $151 | $8,626 | 3 | 0% | 0.00 | -$2,299 | -$6,025 | 0% | 1 |
| original defaults | $21,908 | $33,119 | $11,211 | $27,761 | 13 | 38% | 2.00 | -$758 | -$5,428 | 38% | 18 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $0 / $0 | -$8,626 / $8,626 | $0 / $0 |
| original | $24,836 / $11,306 | -$8,842 / $26,507 | $5,914 / $13,566 |

Trades and equity: `results/main/holdout/AAPL/rank1-trades.csv`, `rank1-equity.csv`.

### MSFT

Frozen rank 1 `c4713e72e0acc`: dipTenths 2.3%, trailingStopTenths 3.2%, maximumHoldDays 22, lookbackSessions 89, materialLossTenths 5.7%, lowerReentryTenths 3.1%, retraceTenths 48.0%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | -$21,250 | $961 | $22,211 | $41,434 | 33 | 39% | 0.78 | -$971 | -$15,773 | 75% | 22 |
| original defaults | $31,863 | $46,118 | $14,255 | $39,148 | 17 | 29% | 1.74 | -$882 | -$12,763 | 48% | 15 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | -$5,672 / $25,643 | $8,534 / $25,987 | -$24,111 / $30,589 |
| original | -$5,651 / $8,588 | $27,925 / $11,000 | $9,589 / $32,569 |

Trades and equity: `results/main/holdout/MSFT/rank1-trades.csv`, `rank1-equity.csv`.

### AMD

Frozen rank 1 `c429edbf3d6e7`: dipTenths 39.8%, trailingStopTenths 2.8%, maximumHoldDays 72, lookbackSessions 110, materialLossTenths 1.8%, lowerReentryTenths 9.4%, retraceTenths 37.8%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | -$10,651 | -$9,596 | $1,055 | $24,226 | 3 | 33% | 0.04 | -$3,196 | -$7,952 | 4% | 7 |
| original defaults | $128,295 | $147,583 | $19,288 | $79,161 | 38 | 50% | 2.04 | -$250 | -$23,328 | 65% | 15 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | -$7,952 / $7,952 | -$2,699 / $18,640 | $0 / $0 |
| original | $2,017 / $55,050 | $42,089 / $36,150 | $84,190 / $25,748 |

Trades and equity: `results/main/holdout/AMD/rank1-trades.csv`, `rank1-equity.csv`.

### META

Frozen rank 1 `c6732eabb3c6f`: dipTenths 17.1%, trailingStopTenths 2.3%, maximumHoldDays 8, lookbackSessions 219, materialLossTenths 3.4%, lowerReentryTenths 13.6%, retraceTenths 17.4%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $3,590 | $12,179 | $8,589 | $29,672 | 35 | 51% | 1.05 | $481 | -$16,166 | 28% | 8 |
| original defaults | $27,186 | $43,791 | $16,605 | $44,081 | 21 | 43% | 1.47 | -$95 | -$13,113 | 56% | 18 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $1,347 / $596 | -$13,897 / $27,743 | $16,139 / $14,207 |
| original | $19,202 / $11,860 | $17,078 / $24,152 | -$9,094 / $43,726 |

Trades and equity: `results/main/holdout/META/rank1-trades.csv`, `rank1-equity.csv`.

### GOOGL

Frozen rank 1 `c667c4c306fbe`: dipTenths 8.8%, trailingStopTenths 2.5%, maximumHoldDays 8, lookbackSessions 199, materialLossTenths 6.2%, lowerReentryTenths 2.0%, retraceTenths 62.1%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $40,009 | $53,601 | $13,592 | $19,498 | 49 | 53% | 1.52 | $391 | -$9,012 | 45% | 8 |
| original defaults | $113,558 | $131,309 | $17,751 | $22,043 | 17 | 47% | 5.59 | -$761 | -$5,491 | 61% | 17 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $30,408 / $11,535 | $15,622 / $17,162 | -$6,021 / $16,699 |
| original | $15,216 / $9,380 | $77,630 / $13,325 | $20,712 / $22,043 |

Trades and equity: `results/main/holdout/GOOGL/rank1-trades.csv`, `rank1-equity.csv`.

### AMZN

Frozen rank 1 `c110df10cabc8`: dipTenths 25.1%, trailingStopTenths 8.8%, maximumHoldDays 10, lookbackSessions 96, materialLossTenths 6.0%, lowerReentryTenths 7.9%, retraceTenths 79.4%.

| Parameters | Net | Gross | Interest | Max DD | Trades | Win | PF | Median trade | Worst trade | Exposure | Median hold (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| rank 1 (frozen) | $20,198 | $23,784 | $3,586 | $11,697 | 2 | 50% | 13.78 | $10,099 | -$1,580 | 12% | 60 |
| original defaults | -$5,818 | $5,152 | $10,970 | $29,691 | 15 | 40% | 0.86 | -$626 | -$10,199 | 37% | 18 |

| By calendar year (net / max DD) | 2024 | 2025 | 2026 |
|---|---|---|---|
| rank 1 | $0 / $0 | $20,198 / $11,697 | $0 / $0 |
| original | -$2,061 / $15,512 | -$3,072 / $20,892 | -$685 / $24,146 |

Trades and equity: `results/main/holdout/AMZN/rank1-trades.csv`, `rank1-equity.csv`.

