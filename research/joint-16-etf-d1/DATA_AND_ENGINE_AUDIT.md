# Data and engine audit

Run after the protocol freeze (2026-10-25T06:52:12Z, sha256 `2314dfbf…`) and before any 16-ETF candidate figure:
`npm run joint-16-etf-d1 -- audit` (`results/audit/audit.json`, 305 s) and `-- controls` (`results/controls/controls.json`,
147 s). Both passed with **0 failures**. Generated tables: [results/tables/audit.md](results/tables/audit.md),
[results/tables/controls.md](results/tables/controls.md).

## 1. Repository state at the start

- Branch `research/trailing-buy-four-family-optimization`, HEAD `96d7535c`, working tree clean; no other process was
  modifying the repository. 10 CPU cores, 16 GB RAM, Node 23.6.
- Baseline: `npm test` **471/471** (129 s); `tsc --noEmit` clean; eslint 0 errors, 15 warnings (pre-existing).
- No candidate cache existed: every trace of this study is built in-process from the training load (§3); the previous
  study's trial logs were not read.

## 2. The 16 datasets

`data/partitions.json` sha256 `43893f3d3277d680…`: training 2016-01-01 → 2023-12-31, holdout 2024-01-01 → 2025-10-16,
final 2025-10-17 → open. The repository's verifiers all exit 0: `npm run datasets -- verify` (16 of 16 symbols; every
row in exactly one partition, no missing session), `npm run market-events -- verify` (the distribution ledger rebuilt
and validated; every recorded split's adjusted overnight move listed), `npm run legacy-archive -- verify` (11 of 11).

| ETF | sha256 (prefix) | Sessions | First → last | Recorded split, applied once (raw → adjusted overnight move) |
|---|---|---:|---|---|
| EWZ | `b1cf63a676c2696c` | 2,710 | 2016-01-04 → 2026-10-13 | — |
| GDX | `86ce101fede1a412` | 2,710 | same | — |
| GLD | `d3dd1beb35bc9bee` | 2,710 | same | — |
| IWM | `44a919f997c1eeaf` | 2,710 | same | — |
| IWN | `34cc798c020a152a` | 2,710 | same | — |
| KRE | `40e7bd6c72c1dffb` | 2,710 | same | — |
| TLT | `f4df3690714ee876` | 2,710 | same | — |
| VGT | `d8e6991de7d49010` | 2,710 | same | 8:1 on 2026-04-21 (−87.45% → +0.42%) |
| VOOG | `a7aa42aeebd9e83f` | 2,710 | same | 6:1 on 2026-04-21 (−83.22% → +0.66%) |
| XBI | `9afecc0606330d68` | 2,710 | same | — |
| XLE | `57d013b051ccb205` | 2,710 | same | 2:1 on 2025-12-05 (−50.09% → −0.17%) |
| XLF | `845e7b603edf0f4e` | 2,710 | same | — |
| XLU | `ab2787a419828931` | 2,710 | same | 2:1 on 2025-12-05 (−49.99% → +0.02%) |
| XLY | `7a80d7f22b5b9f79` | 2,710 | same | 2:1 on 2025-12-05 (−49.95% → +0.09%) |
| XOP | `cb8f4d8852b2f714` | 2,710 | same | **1:4 reverse on 2020-03-30, inside training (+287.3% → −3.18%)** |
| XRT | `ca0fdc6a4c77a97d` | 2,710 | same | — |

- **Calendars:** all 16 files hold the same 2,710 New York sessions with identical scheduled opens and closes (the
  audit compares every session; the engines' universe check refuses anything else). **Last common session
  2026-10-13**, as expected; nothing is extended or filled.
- **Splits exactly once:** for each recorded split the loader's adjusted prices equal raw × ratio from the effective
  date on and are untouched before it (0 mismatches in every price field), and the adjustment is recorded once; no
  unexplained split-sized overnight move remains on any of the 16 files. The twelve files shared with the previous
  study hash identically to its audit; IWM, IWN, XLF and XLY (not members there) were verified by the same checks here.
- **Price interpretation:** raw traded prices (headerless UTC minute OHLCV), split-adjusted forward once; **not**
  dividend-adjusted, so an ex-dividend drop appears as a price move — what a trader sees at the time — and a lot's
  omitted cash distribution is quantified separately (§4).
- **Regular-session timestamps:** bars are the regular session only (09:30–16:00 New York, 13:00 on the 14 early-close
  days, which the datasets verifier lists); a session's close is its closing-auction print when present.

## 3. Bar coverage, liquidity and VOOG's sparse bars (counts and volumes only)

| ETF | Median bars per training session | Minutes with a bar | Sparse sessions (< 50% of minutes) | Median / p99 / max gap (min) | Median daily $ volume (training) |
|---|---:|---:|---:|---|---:|
| EWZ, GDX, GLD, IWM, KRE, TLT, XBI, XLE, XLF, XLU, XLY, XOP, XRT | 390 | 99.6–100% | 0 | 1 / 1 / 15–47 | $223M (XRT) – $3.7B (IWM) |
| IWN | 372 | 92.8% | 0 | 1 / 3 / 15 | $147M |
| VGT | 327 | 83.8% | 0 | 1 / 4 / 19 | $125M |
| **VOOG** | **134** | **36.7%** | **1,629 of 2,012** | **2 / 16 / 91** | **$16M** |

VOOG's coverage improves later (median bars: training 134, holdout 208, final 373; sparse sessions 1,629 → 165 → 4;
closing prints in 1,610 of 2,012 training sessions, 449/450 holdout, 248/248 final). No session of any ETF lacks a
regular-session bar, and no bar has zero volume.

**VOOG as a trading book.** The engines never invent, fill or forward-fill an executable price: a D1 decision is taken
at the close of an actual bar, its fill is the first actual trade after the decision minute (possibly minutes later, or
the next session), and stops and exits execute at actual bars. Under these rules VOOG is tradable, so it is **not
excluded**. The caveat is execution realism: with a median bar volume of 311 shares and gaps up to 91 minutes in
training, a real $60,000–$1,000,000 order would move the price or fill more slowly than the backtest assumes. The
library records every VOOG trace's decision-to-fill delay (SEARCH_COVERAGE.md), and any VOOG lot in a nominee is
flagged in the results.

## 4. Distributions and the core/lot overlap

- `config/market-events/distributions.csv` (sha256 `3b4342eb…`) covers VGT and VOOG through **2026-10-24**, past the
  last common session.
- Frozen convention, kept: the **fixed** pool is price-only for every lot; the **portfolio** books VGT/VOOG core
  distributions and **VGT-lot** distributions from the ledger; all other lots, **including VOOG lots**, are
  price-only. The engine entitles VOOG distributions to the core shares only, so a VOOG book can never double-count
  them. The portfolio consistency check (CACHE_AND_CAUSAL_PARITY.md P2) verifies on real data that core dividends =
  core shares × amount on every ex-date, VGT lots receive VGT's, VOOG lots receive none, and core and lot shares of the
  same ticker are separate quantities.
- Omitted distributions of nominee lots are quantified in HOLDOUT_FINAL_RESULTS.md: exactly for VGT/VOOG lots from the
  ledger, and as lot-days × $100,000 × yield ÷ 365 at 1%, 3% and 6% for the other ETFs (no ledger exists for them; no
  distribution is synthesized). Omission understates a book's lots, biasing against high-yield books (EWZ, XLE, XLU,
  TLT, KRE).
- In the 20% portfolio a losing VOOG lot's loss is funded by proportional VOOG/VGT core sales valued at VOOG's last
  known print (the N-book engine's rule; for VGT lots the frozen engine uses the exit print). The difference only
  shifts the split of a sale between the two core ETFs by a fraction of one minute's price move — immaterial — and is
  recorded rather than changed, because the engine is the previous study's verified code.

## 5. Access control

- Every library, search, refinement, robustness and gate computation reads `trainingUniverse()` →
  `loadNUniverse({ partition: 'training', access: 'optimization' })`, which refuses holdout/final/all before a byte is
  read (`src/lib/evaluation.ts` `assertAccess`; tested in the previous study and by the repository's suite).
- The benchmark reproduction reads `all` through `benchmarkUniverse()`, which refuses any symbol except VOOG, VGT,
  XBI, XRT, KRE and GDX (tested: `src/joint-16-etf-d1/tests/joint.test.ts`). Those members' `all` results were inspected
  and published by the previous study.
- The post-freeze loader `evaluationUniverse()` refuses unless `FROZEN_SELECTION.json` exists and its body hash
  verifies (tested: missing and tampered manifests are refused).
- The integrity audit read every row of the 16 files for coverage and corporate actions only.

## 6. The frozen benchmarks, reproduced exactly

**Training** (2016-01-04 → 2023-12-29, books arming 2017-06-15), the full N-book engine with the frozen books, against
the previous study's Stage C records field for field (lots, trades, refusals, net, interest, costs, worst lot,
borrowing-dollar-days, drawdowns with their times, ending equity, percentage drawdowns, fold/regime/year attribution,
margin ratios): **B4 and B5 — 0 differences in all 16 runs** (two modes × four costs each).

| Benchmark (5 bps) | Fixed net | Minute DD (% of $100k) | Daily DD | Lots | Portfolio ending equity | Max % DD daily / minute |
|---|---:|---:|---:|---:|---:|---|
| B1 VGT D1 alone | $135,359.04 | $19,534.41 (19.5%) | $15,817.01 | 17 | $1,375,791.03 | 32.78% / 35.21% |
| B4 All-lowDd | $242,196.01 | $28,659.34 (28.7%) | $25,267.95 | 71 | $1,677,751.33 | 34.65% / 37.01% |
| B5 All-lowDd + GDX | $388,489.26 | $26,509.97 (26.5%) | $23,788.61 | 82 | $2,270,264.33 | 29.67% / 31.09% |
| C0 core only (no book) | — | — | — | 0 | $1,116,261.72 | 33.89% / 35.76% |

**Full `all` history** (2016-01-04 → 2026-10-13, one continuous run), against the previous study's continuous
evaluation record field for field (including every segment row): **B4 and B5 — 0 differences in all 16 runs.**

| Benchmark (5 bps) | Fixed net | Minute DD | Daily DD | Lots | Portfolio ending equity | Max % DD daily / minute |
|---|---:|---:|---:|---:|---:|---|
| B1 | $176,260.47 | $19,534.41 | $15,817.01 | 21 | $2,958,025.76 | 32.78% / 35.21% |
| B4 | $284,244.74 | $28,659.34 | $25,267.95 | 76 | $3,608,484.05 | 34.65% / 37.01% |
| B5 | $486,207.77 | $26,509.97 | $23,788.61 | 94 | $5,410,976.72 | 29.67% / 31.09% |
| C0 | — | — | — | 0 | $2,279,768.98 | 33.89% / 35.76% |

The brief's orientation figures are confirmed to the dollar (B4 $284,245 / $28,659, B5 $486,208 / $26,510; $3,608,484 vs
$5,410,977; 34.65% vs 29.67% daily, 37.01% vs 31.09% minute). Every maximum percentage drawdown above is the March 2020
crash, and the unleveraged 60/40 core alone (C0) already falls 33.9% then: the 30% portfolio ideal is breached by the
core itself, and B5 sits below it only because its GDX lot gained while the core fell.

**Search naming.** Searched books are named by their vector ID rather than `primary`/`lowDd`; the names only label
trades. The search view of B1, B4 and B5 gives exactly the frozen books' net, drawdowns and lots at every cost (12 of 12
equal), so the benchmarks enter the search and the robustness battery unchanged.
