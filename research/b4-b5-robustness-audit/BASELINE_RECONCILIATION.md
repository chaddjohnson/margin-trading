# Baseline reconciliation — B4 and B5 (frozen), C0 (no margin)

Rendered by `npm run robustness-audit -- report` from `results/baseline/baseline.json` and `results/analysis.json`.
Protocol: `PROTOCOL.md` (sha256 `739134130ef2f058303422dda0cb90abff16372c8bdb19bb8757dbfabd2d95bf`). Data window: 2016-01-04 → 2026-10-13 (2710 sessions; books arm from 2017-06-15).

## Verdict

**The frozen baselines reproduce exactly, so the comparative audit proceeds.** The audit runner (`src/b4-b5-robustness/run.ts`) passed 74/74 checks. Three of them carry the result:

- **Identical to `runPoolOn`.** Field for field, the audit runner equals the existing pools code path
  (`src/pools/run.ts` `runPoolOn`): every lot, signal, virtual trade, daily row, ledger event and drawdown is
  bit-identical. This holds for B4 and B5 fixed, and for their portfolios under both dividend conventions.
- **Anchors and controls.** It reproduces every regression anchor of the brief and pool configs: money to the cent,
  percentages to 0.01 pp. It also equals the frozen controls (`research/joint-16-etf-d1/results/controls/controls.json`)
  in every compared field, including the C0 no-margin control.
- **Before the audit.** The existing verifier `npm run pools -- verify` also passed all of its checks
  (`results/logs/pools-verify.log`), before any audit code existed.

No measurement or infrastructure defect was found. No frozen code, configuration, phenotype or record was changed.

## Regression anchors

| Pool | Measure | Reference (brief / pool config) | Reproduced | Match |
|---|---|---:|---:|---|
| B4 | fixed net | $284,244.74 | $284,244.74 | to the cent |
| B4 | fixed max minute DD | $28,659.34 | $28,659.34 | to the cent |
| B4 | funded lots | 76 | 76 | exact |
| B4 | portfolio end equity | $3,608,484.05 | $3,608,484.05 | to the cent |
| B4 | portfolio max daily % DD | 34.65% | 34.6461% | to 0.01 pp |
| B5 | fixed net | $486,207.77 | $486,207.77 | to the cent |
| B5 | fixed max minute DD | $26,509.97 | $26,509.97 | to the cent |
| B5 | funded lots | 94 | 94 | exact |
| B5 | portfolio end equity | $5,410,976.72 | $5,410,976.72 | to the cent |
| B5 | portfolio max daily % DD | 29.67% | 29.6678% | to 0.01 pp |

## Frozen baselines in full

**Fixed pool:**
- one funded slot of $100,000, never compounded;
- shadow policy;
- 5 bps per side;
- 11% simple interest on a 365-day year;
- stops fill at the stop.

| Measure (fixed $100k pool, 5 bps, 11%) | B4 | B5 |
|---|---:|---:|
| Net margin P&L | $284,244.74 | $486,207.77 |
| Gross P&L before costs | $339,024.16 | $548,707.56 |
| Margin interest | $47,013.70 | $52,830.14 |
| Execution friction (5 bps/side) | $7,765.71 | $9,669.66 |
| Funded lots (wins / losses) | 76 (47 / 29) | 94 (61 / 33) |
| Realized losses (sum of losing lots) | −$58,804.97 | −$77,278.20 |
| Worst lot | −$10,094.04 | −$8,258.43 |
| Profit factor (lot nets) | 5.83 | 7.29 |
| Max minute-sampled DD ($ / % of $100k) | $28,659.34 / 28.66% | $26,509.97 / 26.51% |
| Max daily-close DD | $25,267.95 | $23,788.61 |
| Time with a funded lot (sessions from arming) | 45.5% | 51.2% |
| Lot-days | 1,560 | 1,753 |
| Net ÷ max minute DD | 9.92 | 18.34 |
| Net per $1M borrowing dollar-days | $1,822.08 | $2,773.58 |

**Dynamic portfolio:**
- $300,000 at 2016-01-04: 60% VOOG, 40% VGT;
- each funded trade borrows 20% of marked equity;
- profits are reinvested 60/40, and losses are funded by core sales;
- the **frozen** dividend convention: open VGT lots receive VGT distributions.

The **symmetric** convention (no lot receives a distribution) is shown as a sensitivity. Percent drawdowns are the
largest fall from the running peak of marked equity, from the engine's `PercentTracker`. The audit recomputed each
from the daily equity series and got identical results. The dollar columns are the engine's largest-dollar episodes.
They occur in later, larger-equity years and are not the same episodes as the percentage maxima.

| Run ($300k, 60/40 core, 20% borrowing) | End equity | CAGR | vs C0 | Max daily-close % DD (running peak) | Max minute % DD | Largest daily $ DD | Largest minute $ DD |
|---|---:|---:|---:|---|---|---:|---:|
| C0 | $2,279,768.98 | 20.71% | — | 33.89% (2021-12-27 → 2022-10-14; recovered 2024-01-19) | 35.76% (2021-12-28) | $386,774 | $434,474 |
| B4 | $3,608,484.05 | 25.97% | +$1,328,715 | 34.65% (2020-02-19 → 2020-03-23; recovered 2020-06-05) | 37.01% (2020-02-19) | $586,149 | $680,104 |
| B5 | $5,410,976.72 | 30.80% | +$3,131,208 | 29.67% (2020-02-19 → 2020-03-12; recovered 2020-04-14) | 31.09% (2020-02-19) | $828,788 | $962,460 |
| B4 symmetric dividends | $3,592,821.93 | 25.92% | +$1,313,053 | 34.65% (2020-02-19 → 2020-03-23; recovered 2020-06-05) | 37.02% (2020-02-19) | $583,826 | $677,452 |
| B5 symmetric dividends | $5,390,599.67 | 30.75% | +$3,110,831 | 29.67% (2020-02-19 → 2020-03-12; recovered 2020-04-14) | 31.09% (2020-02-19) | $825,999 | $959,263 |

## Reconciliation notes

- **No discrepancy.** Every reference value of the brief (B4 $284,244.74 / $28,659.34 / $3,608,484.05 / 34.65%;
  B5 $486,207.77 / $26,509.97 / $5,410,976.72 / 29.67%) is reproduced exactly under the frozen provenance:
  - the canonical `all` files, at the hashes pinned in `config/pools/*.json`;
  - 5 bps per side and 11% interest;
  - the frozen dividend convention.
- **B5 minute % DD 31.09% and B4 37.01%** (the brief cites B5 only) are the engine's minute-sampled running-peak
  maxima. Both fall in the 2020-02-19 → 2020-03 crash.
- **Two different drawdown definitions apply.** The fixed-pool drawdowns ($28,659 / $26,510, i.e. % of the $100,000
  notional) are drawdowns of the margin book alone. They are never portfolio drawdowns. The portfolio percentages are
  of total account equity.
- **The symmetric dividend convention** lowers both end equities by well under 1% (see the table). It moves the %
  drawdowns by at most a few hundredths of a point, so the conclusions do not depend on the dividend convention.

## The checks

| Check | Result | Detail |
|---|---|---|
| B4 fixed frozen: audit runner = runPoolOn | PASS | every lot, signal, trade, daily row, event and drawdown identical (76 lots, 2709 daily rows) |
| B4 fixed frozen: gross − friction − interest = net per lot | PASS | largest gap $0.00e+0 |
| B4 fixed frozen: yearly attribution sums to the total | PASS | gap $0.00e+0 |
| B4 fixed: Σ lot net = final strategy mark (no open lot) | PASS | gap $0.00e+0, open lots 0 |
| B4 fixed frozen: minute DD ≥ daily DD | PASS | minute $28659.34 vs daily $25267.95 |
| B4 fixed anchor: net | PASS | 284244.74 vs 284244.74 |
| B4 fixed anchor: max minute DD | PASS | 28659.34 vs 28659.34 |
| B4 fixed anchor: lots | PASS | 76 vs 76 |
| B4 fixed: net = frozen control all.B4.fixed-5 | PASS | 284244.743583358 vs 284244.743583358 |
| B4 fixed: interest = frozen control all.B4.fixed-5 | PASS | 47013.69863013699 vs 47013.69863013699 |
| B4 fixed: lots = frozen control all.B4.fixed-5 | PASS | 76 vs 76 |
| B4 fixed: minuteDrawdown = frozen control all.B4.fixed-5 | PASS | 28659.335705492747 vs 28659.335705492747 |
| B4 fixed: dailyDrawdown = frozen control all.B4.fixed-5 | PASS | 25267.95000173262 vs 25267.95000173262 |
| B4 portfolio frozen: audit runner = runPoolOn | PASS | every lot, signal, trade, daily row, event and drawdown identical (76 lots, 2709 daily rows) |
| B4 portfolio frozen: gross − friction − interest = net per lot | PASS | largest gap $4.73e-11 |
| B4 portfolio frozen: yearly attribution sums to the total | PASS | gap $0.00e+0 |
| B4 portfolio frozen: minute DD ≥ daily DD | PASS | minute $680104.03 vs daily $586148.68 |
| B4 portfolio frozen: running-peak daily % DD recomputed from daily equity = engine | PASS | recomputed 0.3464613481592348 vs engine 0.3464613481592348 |
| B4 portfolio anchor: end equity | PASS | 3608484.05 vs 3608484.05 |
| B4 portfolio anchor: max daily % DD (0.01 pp) | PASS | 0.3464613481592348 vs 0.3465 |
| B4 portfolio: net = frozen control all.B4.portfolio-5 | PASS | 606528.2755987501 vs 606528.2755987501 |
| B4 portfolio: interest = frozen control all.B4.portfolio-5 | PASS | 107088.97626779455 vs 107088.97626779455 |
| B4 portfolio: lots = frozen control all.B4.portfolio-5 | PASS | 76 vs 76 |
| B4 portfolio: minuteDrawdown = frozen control all.B4.portfolio-5 | PASS | 680104.0298929373 vs 680104.0298929373 |
| B4 portfolio: dailyDrawdown = frozen control all.B4.portfolio-5 | PASS | 586148.6776899309 vs 586148.6776899309 |
| B4 portfolio: endEquity = frozen control | PASS | 3608484.046542133 vs 3608484.046542133 |
| B4 portfolio: dailyPercent = frozen control | PASS | 0.3464613481592348 vs 0.3464613481592348 |
| B4 portfolio: minutePercent = frozen control | PASS | 0.37014940266383856 vs 0.37014940266383856 |
| B4 portfolio symmetric: audit runner = runPoolOn | PASS | every lot, signal, trade, daily row, event and drawdown identical (76 lots, 2709 daily rows) |
| B4 portfolio symmetric: gross − friction − interest = net per lot | PASS | largest gap $4.00e-11 |
| B4 portfolio symmetric: yearly attribution sums to the total | PASS | gap $0.00e+0 |
| B4 portfolio symmetric: minute DD ≥ daily DD | PASS | minute $677452.34 vs daily $583826.29 |
| B4 portfolio symmetric: running-peak daily % DD recomputed from daily equity = engine | PASS | recomputed 0.3464694277944179 vs engine 0.3464694277944179 |
| B5 fixed frozen: audit runner = runPoolOn | PASS | every lot, signal, trade, daily row, event and drawdown identical (94 lots, 2709 daily rows) |
| B5 fixed frozen: gross − friction − interest = net per lot | PASS | largest gap $0.00e+0 |
| B5 fixed frozen: yearly attribution sums to the total | PASS | gap $0.00e+0 |
| B5 fixed: Σ lot net = final strategy mark (no open lot) | PASS | gap $0.00e+0, open lots 0 |
| B5 fixed frozen: minute DD ≥ daily DD | PASS | minute $26509.97 vs daily $23788.61 |
| B5 fixed anchor: net | PASS | 486207.77 vs 486207.77 |
| B5 fixed anchor: max minute DD | PASS | 26509.97 vs 26509.97 |
| B5 fixed anchor: lots | PASS | 94 vs 94 |
| B5 fixed: net = frozen control all.B5.fixed-5 | PASS | 486207.7706952991 vs 486207.7706952991 |
| B5 fixed: interest = frozen control all.B5.fixed-5 | PASS | 52830.13698630136 vs 52830.13698630136 |
| B5 fixed: lots = frozen control all.B5.fixed-5 | PASS | 94 vs 94 |
| B5 fixed: minuteDrawdown = frozen control all.B5.fixed-5 | PASS | 26509.97304978661 vs 26509.97304978661 |
| B5 fixed: dailyDrawdown = frozen control all.B5.fixed-5 | PASS | 23788.608981739657 vs 23788.608981739657 |
| B5 portfolio frozen: audit runner = runPoolOn | PASS | every lot, signal, trade, daily row, event and drawdown identical (94 lots, 2709 daily rows) |
| B5 portfolio frozen: gross − friction − interest = net per lot | PASS | largest gap $5.82e-11 |
| B5 portfolio frozen: yearly attribution sums to the total | PASS | gap $0.00e+0 |
| B5 portfolio frozen: minute DD ≥ daily DD | PASS | minute $962459.8 vs daily $828787.56 |
| B5 portfolio frozen: running-peak daily % DD recomputed from daily equity = engine | PASS | recomputed 0.2966781505859238 vs engine 0.2966781505859238 |
| B5 portfolio anchor: end equity | PASS | 5410976.72 vs 5410976.72 |
| B5 portfolio anchor: max daily % DD (0.01 pp) | PASS | 0.2966781505859238 vs 0.2967 |
| B5 portfolio: net = frozen control all.B5.portfolio-5 | PASS | 1448586.2013962697 vs 1448586.2013962697 |
| B5 portfolio: interest = frozen control all.B5.portfolio-5 | PASS | 182962.56090493128 vs 182962.56090493128 |
| B5 portfolio: lots = frozen control all.B5.portfolio-5 | PASS | 94 vs 94 |
| B5 portfolio: minuteDrawdown = frozen control all.B5.portfolio-5 | PASS | 962459.8002798366 vs 962459.8002798366 |
| B5 portfolio: dailyDrawdown = frozen control all.B5.portfolio-5 | PASS | 828787.5595795116 vs 828787.5595795116 |
| B5 portfolio: endEquity = frozen control | PASS | 5410976.722586979 vs 5410976.722586979 |
| B5 portfolio: dailyPercent = frozen control | PASS | 0.2966781505859238 vs 0.2966781505859238 |
| B5 portfolio: minutePercent = frozen control | PASS | 0.3108515423395935 vs 0.3108515423395935 |
| B5 portfolio symmetric: audit runner = runPoolOn | PASS | every lot, signal, trade, daily row, event and drawdown identical (94 lots, 2709 daily rows) |
| B5 portfolio symmetric: gross − friction − interest = net per lot | PASS | largest gap $5.82e-11 |
| B5 portfolio symmetric: yearly attribution sums to the total | PASS | gap $0.00e+0 |
| B5 portfolio symmetric: minute DD ≥ daily DD | PASS | minute $959262.5 vs daily $825998.63 |
| B5 portfolio symmetric: running-peak daily % DD recomputed from daily equity = engine | PASS | recomputed 0.29667637889868487 vs engine 0.29667637889868487 |
| C0 portfolio: endEquity = frozen control all.C0.portfolio-5 | PASS | 2279768.984623754 vs 2279768.984623754 |
| C0 portfolio: dailyPercent = frozen control all.C0.portfolio-5 | PASS | 0.3389153987988318 vs 0.3389153987988318 |
| C0 portfolio: minutePercent = frozen control all.C0.portfolio-5 | PASS | 0.3576023408402881 vs 0.3576023408402881 |
| C0 portfolio: minuteDrawdown = frozen control all.C0.portfolio-5 | PASS | 434473.52173840837 vs 434473.52173840837 |
| C0 portfolio: dailyDrawdown = frozen control all.C0.portfolio-5 | PASS | 386773.81698739144 vs 386773.81698739144 |
| C0 portfolio: running-peak daily % DD recomputed = engine | PASS | 0.3389153987988318 vs 0.3389153987988318 |
| determinism: B5 fixed twice in-process | PASS | identical |
| determinism: B5 fixed in a worker thread = in-process | PASS | identical |
