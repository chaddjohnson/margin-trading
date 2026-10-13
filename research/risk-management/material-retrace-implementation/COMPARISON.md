# Comparison — the new strategy against the five reference strategies

All runs use the frozen Python research framework (`reference_runs.py` → `results/python/summary.json`);
the production TypeScript strategy is trade-identical to the `new` row (VERIFICATION.md). Every strategy
uses the same data, date range, financing assumptions and exit rules. The matched-exposure control is a
complete rerun of the original rules at a fixed position size scaled so its margin dollar-days equal
the strategy's — an ex-post diagnostic, not a deployable strategy.

Strategies: **Original baseline** (any dip buys); **Previous 3%** (any net loss arms a 3% lower-price
requirement, reset at 95% of the frozen reference high); **Material-loss only** (A2_material_05: arms
only on a price loss ≥ 0.5%, 3%, frozen-high reset); **Retracement reset only** (C6_retrace_38: any
net loss arms, 3%, reset at a 38% retrace); **Original G8** (1% material loss, 3%, 38% retrace);
**New combined** (0.5% material loss, 3%, 38% retrace — the production strategy).

## 1. Main comparison — VGT 2016 (from 2016-10-07) through 2025-12-31

| Strategy | Net profit | Max DD | Profit/DD | Trades | Interest | Time invested |
|---|---:|---:|---:|---:|---:|---:|
| Original baseline | 138,345 | 38,323 | 3.61 | 40 | 68,200 | 67% |
| Previous 3% | 136,666 | 28,687 | 4.76 | 29 | 47,345 | 47% |
| Material-loss only | 157,236 | 29,336 | 5.36 | 32 | 55,784 | 55% |
| Retracement reset only | 172,667 | 28,687 | 6.02 | 33 | 57,984 | 57% |
| Original G8 (1%) | 177,168 | 28,208 | 6.28 | 34 | 64,282 | 63% |
| **New combined strategy** | **172,883** | **28,687** | **6.03** | 33 | 59,008 | 58% |

Matched-exposure controls on the same period (fixed-size baseline with equal dollar-days):

| Strategy | Exposure vs baseline | Control size | Control net | Control DD | Δ net | Δ DD |
|---|---:|---:|---:|---:|---:|---:|
| Previous 3% | 0.694 | 69,421 | 96,041 | 26,604 | +40,625 | +2,083 (worse) |
| Material-loss only | 0.818 | 81,794 | 113,158 | 31,346 | +44,078 | −2,010 |
| Retracement reset only | 0.850 | 85,020 | 117,621 | 32,582 | +55,046 | −3,895 |
| Original G8 (1%) | 0.943 | 94,255 | 130,398 | 36,122 | +46,770 | −7,913 |
| **New combined strategy** | 0.865 | 86,522 | 119,700 | 33,158 | **+53,183** | **−4,471** |

Reading: the new strategy beats the original baseline by $34,538 with a $9,636 smaller drawdown, and
the previous 3% rule by $36,217 at the same drawdown, while borrowing 13.5% fewer dollar-days than the
baseline. Against an equally-exposed baseline it is +$53,183 with less drawdown — the gain is
decision timing, not reduced leverage (the previous 3% rule, by contrast, had a *larger* drawdown than
its control). G8's extra $4,285 is one trade (2024-09-05, enabled by exempting a −0.78% loss that the
0.5% rule treats as material); on this period the two components contribute as follows: the
retracement reset alone delivers almost all of the improvement (+$36,001), the material exemption
alone +$20,570, and together +$36,217 — on VGT 2016–2025 they overlap more than they add (the
January-2023 trade is recovered by either mechanism, via different paths).

## 2. Full historical datasets (regression and broader comparison; established endpoints)

| Dataset | Strategy | Net | Max DD | P/DD | Trades | Interest | Invested | Ctrl size | Ctrl net | Ctrl DD | Δ net | Δ DD |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| VGT 2005–2015 | Original baseline | 11,602 | 73,404 | 0.16 | 47 | 71,575 | 61% | 100,000 | 11,602 | 73,404 | 0 | 0 |
| VGT 2005–2015 | Previous 3% | 26,384 | 54,279 | 0.49 | 22 | 44,753 | 38% | 62,526 | 7,255 | 45,897 | +19,130 | +8,383 |
| VGT 2005–2015 | Material-loss only | 28,363 | 54,279 | 0.52 | 24 | 48,430 | 41% | 67,663 | 7,851 | 49,667 | +20,512 | +4,612 |
| VGT 2005–2015 | Retracement reset only | 22,980 | 50,127 | 0.46 | 28 | 48,852 | 42% | 68,253 | 7,919 | 50,100 | +15,061 | +27 |
| VGT 2005–2015 | Original G8 (1%) | 26,600 | 50,883 | 0.52 | 32 | 56,025 | 48% | 78,274 | 9,082 | 57,456 | +17,518 | −6,573 |
| VGT 2005–2015 | **New combined** | **26,600** | **50,883** | 0.52 | 32 | 56,025 | 48% | 78,274 | 9,082 | 57,456 | +17,518 | −6,573 |
| QQQ 1999–2015 | Original baseline | −2,886 | 149,561 | −0.02 | 108 | 124,858 | 68% | 100,000 | −2,886 | 149,561 | 0 | 0 |
| QQQ 1999–2015 | Previous 3% | 40,258 | 91,469 | 0.44 | 69 | 73,986 | 40% | 59,257 | −1,710 | 88,625 | +41,968 | +2,844 |
| QQQ 1999–2015 | Material-loss only | 51,812 | 93,720 | 0.55 | 74 | 82,003 | 44% | 65,677 | −1,895 | 98,227 | +53,707 | −4,507 |
| QQQ 1999–2015 | Retracement reset only | 64,997 | 70,917 | 0.92 | 77 | 86,493 | 47% | 69,273 | −1,999 | 103,606 | +66,996 | −32,689 |
| QQQ 1999–2015 | Original G8 (1%) | 87,890 | 65,407 | 1.34 | 85 | 107,107 | 58% | 85,783 | −2,475 | 128,298 | +90,365 | −62,892 |
| QQQ 1999–2015 | **New combined** | **72,539** | **74,333** | 0.98 | 82 | 94,630 | 51% | 75,790 | −2,187 | 113,353 | +74,727 | −39,020 |
| VGT 2016–2026 | Original baseline | 161,772 | 38,323 | 4.22 | 45 | 73,233 | 67% | 100,000 | 161,772 | 38,323 | 0 | 0 |
| VGT 2016–2026 | Previous 3% | 182,094 | 28,687 | 6.35 | 32 | 53,463 | 49% | 73,004 | 118,101 | 27,978 | +63,993 | +710 |
| VGT 2016–2026 | Material-loss only | 180,663 | 29,336 | 6.16 | 37 | 60,816 | 55% | 83,045 | 134,344 | 31,826 | +46,319 | −2,489 |
| VGT 2016–2026 | Retracement reset only | 215,011 | 28,687 | 7.50 | 37 | 64,584 | 59% | 88,189 | 142,666 | 33,797 | +72,345 | −5,110 |
| VGT 2016–2026 | Original G8 (1%) | 200,595 | 28,208 | 7.11 | 39 | 69,315 | 63% | 94,650 | 153,118 | 36,273 | +47,477 | −8,065 |
| VGT 2016–2026 | **New combined** | **196,310** | **28,687** | 6.84 | 38 | 64,041 | 58% | 87,449 | 141,468 | 33,513 | +54,842 | −4,826 |
| QQQ 2016–2026 | Original baseline | 116,388 | 39,237 | 2.97 | 35 | 62,595 | 57% | 100,000 | 116,388 | 39,237 | 0 | 0 |
| QQQ 2016–2026 | Previous 3% | 132,242 | 23,564 | 5.61 | 27 | 52,197 | 48% | 83,390 | 97,056 | 32,719 | +35,187 | −9,155 |
| QQQ 2016–2026 | Material-loss only | 133,745 | 29,106 | 4.60 | 30 | 55,452 | 51% | 88,589 | 103,108 | 34,759 | +30,637 | −5,654 |
| QQQ 2016–2026 | Retracement reset only | 134,055 | 26,851 | 4.99 | 30 | 57,110 | 52% | 91,237 | 106,190 | 35,798 | +27,865 | −8,947 |
| QQQ 2016–2026 | Original G8 (1%) | 130,897 | 30,446 | 4.30 | 32 | 58,948 | 54% | 94,174 | 109,608 | 36,951 | +21,289 | −6,505 |
| QQQ 2016–2026 | **New combined** | **138,791** | **24,060** | 5.77 | 31 | 59,279 | 54% | 94,704 | 110,224 | 37,159 | +28,567 | −13,099 |

Observations across the full datasets:

- The new strategy beats the previous 3% rule on net profit on all four datasets (+216, +32,281,
  +14,216, +6,549) and has a smaller or equal drawdown on three (QQQ 2016–2026: $496 larger).
- It beats its matched-exposure control on **both** profit and drawdown on every dataset — something
  the previous 3% rule did not achieve (its drawdown exceeded the control's on two datasets).
- Versus G8: identical on VGT 2005–2015 (no trade with a price return between −1% and −0.5% exists
  there), G8 is better on QQQ 1999–2015 (+$15,351, DD −$8,926) and VGT 2016–2026 (+$4,285), the new
  strategy is better on QQQ 2016–2026 (+$7,894, DD −$6,386). The 0.5% choice trades some old-era QQQ
  performance for new-era QQQ performance; neither dominates.
- Versus the single-mechanism parents: the retracement reset is the larger contributor everywhere
  except QQQ 2016–2026; on VGT 2016–2026 the reset alone (215,011) beats the combination (196,310) —
  the exemption's Oct-2023-style earlier entries cost more than they earn there.
- The earlier program's fresh-instrument finding still applies and was not re-run here: at matched
  exposure, restriction strategies trailed the baseline on QLD/SPY/IWM/SOXX
  (`adaptive-reentry/validation/ROBUSTNESS.md`, Finding 1); G8 was the only combination that beat its
  own legs out of design, and the 0.5% cutoff with retrace 0.38–0.42 was there observed to dominate
  the 1% cutoff on the weak spots (`RESULTS_STAGE2.md`).
