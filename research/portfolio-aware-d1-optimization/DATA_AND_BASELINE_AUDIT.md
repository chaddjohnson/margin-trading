# Data and baseline audit

Run on 2026-10-24 after the protocol freeze and before any candidate-ETF figure: `npm run portfolio-aware-d1 -- audit`
(`results/audit/audit.json`) and `-- controls` (`results/controls/controls.json`). Both passed with **0 failures**.

## 1. Repository state at the start

- Branch `research/trailing-buy-four-family-optimization`, HEAD `cef15346` ("Screened seven ETFs as complementary D1
  books…"), working tree clean; no other process was running node/npm against the repository.
- Baseline tests before any change: **462/462 pass** (131 suites, 119 s); `tsc --noEmit` clean; eslint 0 errors,
  15 warnings.
- Files this study changed outside its own directories: `package.json` (the `portfolio-aware-d1` script),
  `src/phenotype/strategies.ts` (one registry line, required by the phenotype test that every `src/app` entry is
  listed) and the regenerated `config/phenotypes/COMPATIBILITY.md` (one row). Nothing frozen was edited
  (IMPLEMENTATION_AUDIT.md lists the hashes).

## 2. Canonical data and partitions

`data/partitions.json` sha256 `43893f3d3277d680…`: training 2016-01-01 → 2023-12-31, holdout 2024-01-01 → 2025-10-16,
final 2025-10-17 → open, all = every row. The repository's own verifiers all exit 0:

| Verifier | Result |
|---|---|
| `npm run datasets -- verify` | 16 of 16 symbols verified (every row in exactly one partition, no missing sessions) |
| `npm run market-events -- verify` | the distribution ledger rebuilt and validated; the six recorded splits listed with their adjusted overnight moves |
| `npm run legacy-archive -- verify` | 11 of 11 pinned legacy inputs verified (the frozen protocol path) |

The twelve members of this study (sha256 prefixes; every one identical to the complementary-ETF audit's hash of the
same file, so its per-file integrity findings still apply):

| Symbol | Role | sha256 | Sessions | First → last | Recorded split (applied once) | Training median $ volume |
|---|---|---|---:|---|---|---:|
| VOOG | core | `a7aa42aeebd9e83f` | 2,710 | 2016-01-04 → 2026-10-13 | 6:1 on 2026-04-21 (raw −83.2% → adjusted +0.66%) | $15.8M (1,629 sparse sessions) |
| VGT | frozen book | `d8e6991de7d49010` | 2,710 | same | 8:1 on 2026-04-21 (raw −87.4% → +0.42%) | $125.5M |
| XBI | frozen book | `9afecc0606330d68` | 2,710 | same | — | $477.0M |
| XRT | frozen book | `ca0fdc6a4c77a97d` | 2,710 | same | — | $223.4M |
| KRE | frozen book | `40e7bd6c72c1dffb` | 2,710 | same | — | $387.3M |
| GDX | candidate | `86ce101fede1a412` | 2,710 | same | — | $702.1M |
| XOP | candidate | `cb8f4d8852b2f714` | 2,710 | same | **1:4 reverse on 2020-03-30 (raw +287.3% → adjusted −3.18%)** | $562.7M |
| EWZ | candidate | `b1cf63a676c2696c` | 2,710 | same | — | $729.1M |
| TLT | candidate | `f4df3690714ee876` | 2,710 | same | — | $1,258.8M |
| XLE | candidate | `57d013b051ccb205` | 2,710 | same | 2:1 on 2025-12-05 (raw −50.1% → −0.17%) | $1,108.4M |
| XLU | candidate | `ab2787a419828931` | 2,710 | same | 2:1 on 2025-12-05 (raw −50.0% → +0.02%) | $773.1M |
| GLD | candidate | `d3dd1beb35bc9bee` | 2,710 | same | — | $997.8M |

- **Calendars:** all twelve files hold the same 2,710 New York sessions with identical opens and closes (the
  N-book engine's universe check refuses anything else). **Last common session: 2026-10-13** (as expected; nothing is
  extended past it).
- **Splits exactly once:** for every member split, the loader's adjusted prices equal the raw prices × the ratio from
  the effective date on and are untouched before it (0 mismatches in every price field), and the run records the
  adjustment once; `unexplainedSplitGaps` finds no split-sized move any recorded split doesn't explain. The XOP
  reverse split lies inside training: an unadjusted run would read a 287% overnight jump. The new engine and the
  replay are also tested on a synthetic 1:4 reverse split (`src/portfolio-aware-d1/tests/engine.test.ts`): a lot held
  across it equals the unsplit economy, while the unadjusted bytes would manufacture more than $100,000.
- **Candidate liquidity (training):** every candidate trades all 390 regular minutes in its median session, no
  sparse session, no zero-volume bar; median daily dollar volume $563M (XOP) to $1.26B (TLT).
- **Distributions:** `config/market-events/distributions.csv` (sha256 `3b4342eb…`) covers VGT and VOOG through
  **2026-10-24**, past the last common session, so every portfolio comparison is covered. Candidate lots are
  price-only (the frozen convention for non-VGT books); the evaluation reports the omission as a bound.

## 3. Access control

- Every optimization load goes through `trainingUniverse()` → `loadNUniverse({ partition: 'training',
  access: 'optimization' })` → `loadDatasetSessions`, whose `assertAccess` refuses holdout/final/all **before any bar is
  read** (tested: a data root with only `partitions.json` and an empty price file refuses the three later partitions
  with the guard's message, and lets training through to the empty file).
- The baseline controls use `baselineUniverse()`, which can load VOOG and the four frozen books only.
- The post-freeze loader `evaluationUniverse()` refuses unless `FROZEN_SELECTION.json` exists and its body hash
  verifies (tested: missing, tampered and rewritten manifests are refused).
- The integrity audit reads every row of the twelve files for coverage and corporate actions, never a strategy result.

## 4. The controls (PROTOCOL.md §9) — reproduced exactly

### Old horizon (2016-01-04 → 2025-10-13), the frozen protocol path (archived inputs, pinned hashes, frozen engine)

| Model | Reference | Reproduced | Lots / virtual trades |
|---|---|---|---|
| Fixed $100k, VGT D1 alone | $183,043.82 net, $19,330.69 minute DD | **$183,043.82, $19,330.69** | 20 / 20 |
| Fixed $100k, All-lowDd shadow | $294,675.77 net, $27,968.03 minute DD | **$294,675.77, $27,968.03** | 75 / 145 |
| $300k portfolio, VGT D1 at 20% (B) | $2,346,272.33; 32.73% daily, 35.17% minute max % DD | **$2,346,272.33; 32.73%, 35.17%** | 20 / 20 |
| $300k portfolio, All-lowDd at 20% | $2,891,290.87; 34.55% daily, 36.92% minute max % DD | **$2,891,290.87; 34.55%, 36.92%** | 75 / 145 |

The percentage drawdowns are the largest percentage falls of daily and minute-sampled equity, both 2020-02-19 →
2020-03-23 (not the 25.3%/25.2% depths of the largest-dollar episodes, 2025). **Every CSV** the frozen writer produces
for these four runs — trades, virtual trades, signals, refusals, daily, annual, monthly, and for the portfolio runs the
account ledger, margin requirements, closest approaches, minute extremes, maintenance events and forced liquidations
(40 files) — is **byte-identical** to the committed artifacts in `research/multi-etf-allocator/results/runs/principal/`.

### Canonical path (`--dataset all --end 2025-10-13`)

The same four runs on the canonical files: **0 differences** from the frozen protocol path in every trade, lot,
signal, daily row, ledger event and drawdown.

### Newer horizon (the full canonical `all`, through 2026-10-13)

| Model | Current artifact | Reproduced | N-book engine |
|---|---|---|---|
| Fixed $100k, All-lowDd | $291,774.90 net, 76 lots | **$291,774.90, 76 lots** (minute DD $27,968.03) | 0 differences |
| $300k portfolio, All-lowDd | $3,661,933.45 ending equity, 76 lots | **$3,661,933.45** (strategy net $629,310.27; 34.55% / 36.92%) | 0 differences |

### The study's baseline: S0 on training (2016-01-04 → 2023-12-29, arming 2017-06-15), N-book engine

| Cost per side | Fixed net | Fixed minute DD | Portfolio ending equity | Max % DD daily / minute |
|---|---:|---:|---:|---|
| 0 bps | $249,173.90 | $27,968.03 | $1,700,902.88 | 34.55% / 36.92% |
| 2 bps | $246,624.90 | $28,244.63 | $1,692,442.73 | 34.59% / 36.96% |
| **5 bps** | **$242,196.01** | **$28,659.34** | **$1,677,751.33** | **34.65% / 37.01%** |
| 10 bps | $233,867.19 | $29,349.95 | $1,650,551.04 | 34.74% / 37.11% |

71 funded lots of 137 virtual trades at every cost. The training baseline already exceeds the user's 30% daily ideal
(the March 2020 crash), sits inside the 30–35% band on daily closes and above 35% minute-sampled — these are the
benchmark's own facts, reported as they are.

## 5. Evidence grades

- **Inspected baseline:** S0's holdout and final results (and VGT alone's) were computed and read in earlier work.
- **Prior candidate facts:** the complementary-ETF study's post hoc training diagnostics of unchanged D1 and of the
  eight-ETF XLE vectors; the eight-ETF program's XLE 2024–2025 results.
- **New in this study:** every Track S/P result on training; after the freeze, the locked candidate comparison on
  holdout and final. Not independent of the analyst's general knowledge of 2024–2026 markets.
