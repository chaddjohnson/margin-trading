# Protocol: complementary ETFs for the frozen All-lowDd D1 shared-margin allocator

Written on **2026-10-24**, on branch `research/trailing-buy-four-family-optimization` at HEAD `121cd347` (clean when the
study began), after the corporate-action and data-integrity audit (`results/audit/`), and **before** any candidate
price-performance figure (screen statistic, proxy return, D1 run, allocator run with a candidate) was computed.
`npm run complementary-etf-d1 -- freeze-protocol` records this file's sha256 and the time in
`results/protocol_freeze.json`; any later change is an amendment appended in §9 with its reason.

The constants are declared in `src/complementary-etf-d1/context.ts` (`study`).

## 1. Question, references and scope

Can one or two additional ETFs, each with its own D1 phenotype optimized on training data only, raise the
**executable** shared-pool profit or capital efficiency of the frozen **All-lowDd shadow** allocator (VGT `primary`,
XBI/XRT/KRE `lowDd`, one shared margin pool, shadow books) without displacing valuable existing trades or adding
unacceptable risk? The sum of standalone profits is never a pool profit.

- **Reference candidate:** All-lowDd shadow, unchanged (`config/phenotypes/D1/{VGT,XBI,XRT,KRE}.json`,
  `config/allocator/multi-etf-allocator.json`, `src/multi-etf-allocator/`).
- **Independent benchmark:** VGT D1 alone (fixed $100,000 and the $300,000 VGT-only portfolio "B").
- **Screened:** GDX, XOP, EWZ, TLT (high priority); XLE, XLU, GLD (lower priority). IWM, IWN, XLF, XLY are context
  only. **At most two** proceed to optimization; **at most three** additions are tested (A, B, A+B). No other ETF,
  stock, leveraged/inverse product, option or policy change.
- No live orders. No commit. Frozen research artifacts, frozen phenotypes and the legacy archive are not modified.

## 2. Data contract (verified before this protocol; `DATA_AND_CORPORATE_ACTION_AUDIT.md`)

- One canonical file per symbol, `data/<SYMBOL>/data.csv` (Alpaca SIP raw minute OHLCV), windows from
  `data/partitions.json` (sha256 `43893f3d…`): training 2016-01-01 → 2023-12-31 (last session 2023-12-29),
  holdout 2024-01-01 → 2025-10-16, final 2025-10-17 → (last row), all = every row. All 16 files end on
  **2026-10-13**, the last common session; 2,710 identical NYSE sessions; no missing sessions.
- Recorded splits (`config/market-events/splits.json`), forward-adjusted once by the shared loader: VGT 8:1 and VOOG
  6:1 (2026-04-21), **XOP 1:4 reverse (2020-03-30)**, XLE, XLU, XLY 2:1 (2025-12-05), each verified against an issuer
  or OCC record. No unexplained split-sized move remains in any file.
- Optimization and screening read the **training** partition through `optimizationDataset` /
  `loadDatasetSessions({ access: 'optimization' })`, which refuses any other partition before reading; the D1 dataset
  is the four-family research view, which cannot hold a later session. Stage C reads `all` only through the
  allocator's `--dataset` loader, after the freeze.
- **Distributions.** The portfolio mode books VGT/VOOG distributions from the verified ledger
  (`config/market-events/distributions.csv`, covered through 2026-10-24, past 2026-10-13). By the frozen convention,
  book ETFs other than VGT are **price-only**: funded XBI/XRT/KRE lots receive no distribution, and so will the
  candidates' lots. Their omitted distributions are reported as a clearly labelled analytic yield sensitivity
  (principal × yield × days held ÷ 365) from issuer-published yields where they can be obtained; no distribution
  date or amount is synthesized into a ledger.

## 3. Stage A — the training-only opportunity screen

Inputs: the training partition (split-adjusted regular sessions) of the seven candidates, of VOOG and of the four
books; and the exact pool occupancy of the **All-lowDd shadow fixed-$100,000 run on `--dataset training`** (the
canonical path; identical to the frozen engine truncated at 2023-12-29). Window: sessions **2017-06-15 → 2023-12-29**.
Everything is a **daily proxy**: it knows neither D1's minute execution nor the parameters Stage B will choose.

**Reference high:** the highest session high of the previous 74 sessions (D1's own L; L = 230, the books' long
lookback, as a sensitivity only).

**Episodes (descriptive):** an episode opens at the first session whose low is ≥ 10% below the reference high and
freezes that reference; it closes at the first later close within 5% of the frozen reference, after 250 sessions, or
at the window end. Depth = 1 − (lowest low in the episode) ÷ (frozen reference); bands 10–15%, 15–20%, 20–30%, 30%+.
Reported: counts and dates per band, distinct calendar years, and the closes 5, 10 and 20 sessions after the episode
opened (**retrospective diagnostics only**).

**Proxy trades:** `p15` (primary) and `p20` (sensitivity). Arm when a session's low is ≥ 15% (20%) below the
reference high; track the lowest close since arming; buy at the close of the first later session that closes ≥ 2%
above it; sell at the close of the first session that closes ≥ 10% below the entry close, or of the 20th session
after entry. One proxy at a time; after an exit, re-arming starts the next session. A proxy open at the window end is
marked at the last close. $100,000 per proxy, simple 11% interest per calendar day held, costs 0 and **5 bps per
side**.

**Pool timing (exact recorded occupancy):** the fixed pool is occupied from a funded lot's decision time to its exit
time. A proxy is **idle at entry** when no funded lot occupies the pool at its entry session's close. It **blocks** a
baseline lot when that lot's decision time falls inside the proxy's holding interval (entry close → exit close): under
shadow semantics the baseline signal would have been refused. A **clean incremental** proxy is idle at entry and
blocks nothing. Overlaps with funded VGT lots, with funded XBI/XRT/KRE lots and with the books' refused virtual
trades are counted. Correlations of daily returns with VOOG, VGT, XBI, XRT, KRE (training) are secondary descriptors.

**Gates (all must pass):** data (the audit verifies the file, its splits and no unexplained discontinuity); liquidity
(median training daily dollar volume ≥ $50M); breadth (≥ 5 `p15` proxies in ≥ 3 distinct calendar years); timing
(≥ 3 clean incremental `p15` proxies); economics (the clean `p15` proxies' net at 5 bps > 0, and > 0 without the
single best one).

**Rubric (rank scores among the seven: best 1, worst 0, linear, ties averaged):** timing T = number of clean
incremental `p15` proxies (ties: share clean); breadth B = distinct calendar years with an episode ≥ 15% (ties: number
of such episodes); economics E = clean `p15` net at 5 bps without its best proxy. **Composite = 0.4 T + 0.3 B + 0.3 E.**

**Selection (at most two):** among gate-passing candidates, slot by slot: the best remaining high-priority candidate
h* and the best remaining lower-priority candidate l*; l* takes the slot only if no h* passes or composite(l*) ≥
composite(h*) + 0.10 ("clearly better"). A candidate whose training daily-return correlation with an already selected
one exceeds 0.80 is skipped (redundant exposure). Zero selections is a valid outcome. Rejections are reported with
their reasons. The rubric is not changed after any later result.

## 4. Stage B — targeted D1 optimization of the selected ETFs (training only)

The eight-ETF program's machinery, unchanged (`src/multi-etf-d1/`: `research/multi-etf-d1/PROTOCOL.md` §3–§7): the
shipped D1 file `src/app/allIn-trailingBuy-postExitContinuation.ts` through the d1-refinement engine (parity with the
file asserted per ETF on training before the search, trade by trade, at the file's own arming); its eight numerical
parameters on the integer grid (tenths of a percentage point, whole days/sessions) inside the same common box;
eligibility **2017-06-15**; fixed $100,000 per trade, no compounding, simple 11% interest; minute-sampled DD; 4,096
scrambled-Sobol candidates + D1, five chronological folds (training through 2019, 2020, 2021, 2022, 2023) each with
one budget-bound NSGA-II run (population 96, ≤ 40 generations, ≤ 3,000 new simulations, patience 12) and the
selection rule with plateau probes (feasible: minute DD ≤ $35,000 and the fold's minimum entries; beats frozen D1;
plateau: ≥ 75% of in-box one-parameter probes feasible and median probe net ≥ 70%; primary prefers DD ≤ $25,000);
seeds derived from the ticker exactly as there. Budgets and seeds are logged; nothing is enlarged.

**Cost-aware robustness gate (predeclared addition).** Costs of 0/2/5/10 bps per side are applied causally (every
fill worsened, every net-profit stop test counting the sale's cost; the engine's `costPerSide`). The **primary
nomination** is the first final-fold plateau candidate, in the protocol's primary order (the DD ≤ $25,000 band by net,
then the rest by net), whose training run (a) beats the frozen-D1 control on the same ETF at 2 and at 5 bps, (b)
nets > 0 at 10 bps and (c) nets > 0 without its single best trade (0 bps). The **lowDd alternate** is the protocol's
lowDd pick if it passes the same gate. No gate-passing candidate → no nomination → the ETF stops here.

**Complementarity choice (training only).** The cost-gated primary and, if one exists, the cost-gated lowDd alternate
are each added as a fifth book to the All-lowDd shadow **fixed** pool on `--dataset training` (0 bps). The
nomination is the one with the larger increase of the pool's net over the baseline; a tie, or both increases ≤ 0,
keeps the primary (the latter flagged "no training complementarity"). This is exploratory reuse of training data.

**Freeze.** `FROZEN_CANDIDATES.json` records, per selected ETF: the control and the nominated and alternate
vectors (integers and fractions, candidate IDs, trade signatures), their training metrics at every cost, the search
budgets and seeds, the data, partitions, splits and ledger hashes, the hashes of the study, allocator and D1 code, this
protocol's hash, the Stage C scenario definitions and §6's acceptance constants, and a sha256 of the body. It is
written once, before any holdout, final or `all` figure of a candidate exists; nothing in it changes afterwards.

## 5. Stage C — incremental value in the existing allocator (after the freeze)

**Allocator extension (minimal).** The frozen four books keep their processing order, phenotypes, policy and every
rule; added books are appended to the processing order and keep the alphabetical same-minute tie rule; their lots
are price-only like XBI/XRT/KRE and belong to the "sector group" of the passive G-schedules (the conservative
choice). Runs without an added book are unchanged byte for byte (asserted by the frozen regression and dataset parity
tests). No priority, takeover, fraction, leverage, stop, cost or interest rule changes.

**Gate before any new run:** on the identical previous horizon (`--dataset all --end 2025-10-13`) the canonical path
reproduces exactly: fixed VGT D1 alone $183,043.82 / minute DD $19,330.69; fixed All-lowDd shadow $294,676 / $27,968;
VGT-only portfolio B $2,346,272.33 and All-lowDd portfolio $2,891,290.87 ending equity; and the separate maximum
**percentage** drawdowns of daily equity, B 32.7% and All-lowDd 34.6% (2020-02-19 → 2020-03-23), never the 25.3%/25.2%
depth of the largest-dollar episode.

**Scenarios (predeclared):** S0 = baseline All-lowDd shadow; S1 = S0 + candidate A; S2 = S0 + candidate B; S3 = S0 +
A + B (only when two were selected). Each scenario × {fixed $100,000 pool, $300,000 portfolio at 20% of equity} ×
{0, 2, 5, 10 bps per side} is **one continuous `--dataset all` run** (2016-01-04 close → 2026-10-13), costs applied
causally in the books and the ledger. Training, holdout, final and full figures are attributions of that run's marked
equity (`segments.csv`), never separate or concatenated runs. The baseline portfolio is also run at 10/15/20/25% of
equity (0 and 5 bps) for the matched borrowing-dollar-days comparison (the earlier program's method: interpolate the
baseline's ending equity at the scenario's borrowing-dollar-days).

**Reported:** per scenario, mode and cost: net (realized + unrealized), interest, lots, wins/losses, costs, exposure,
borrowing-dollar-days, max dollar DD and (portfolio) max percentage DD, daily and minute-sampled, each with dates;
debt/equity, lowest equity/LMV and the closest approaches under U35/U50/U60; yearly and monthly changes; per-period
attribution; and the **bridge**: lots of every symbol matched between the scenario and the baseline (kept, blocked,
new), the candidate's funded net minus the baseline P&L it blocked, by symbol, VGT first. Refused virtual P&L is
hypothetical and never added to pool profit. Every portfolio run passes the allocator's independent ledger audit with
0 failures, and the key totals are recomputed from the exported files.

## 6. Acceptance criteria (fixed now; applied to S1, S2, S3 against S0 on the same run windows and costs)

A scenario **advances** only if every criterion holds; otherwise the result is "no addition".

1. **Additional trades:** the added books fund ≥ 5 lots in ≥ 3 distinct calendar years over the full run, and their
   funded net without the single best lot is > 0 (0 bps).
2. **Net of displacement:** Δ fixed-pool net (scenario − baseline, full run) ≥ **$15,000** at 0, 2 and 5 bps and
   > 0 at 10 bps. The bridge shows it by symbol; a blocked VGT lot is reported individually.
3. **Fixed-pool risk:** the scenario's maximum minute-sampled fixed-pool DD ≤ $35,000 at 0 and 5 bps, and its net ÷
   that DD ≥ 0.95 × the baseline's at 0 bps.
4. **Portfolio:** Δ ending marked equity ≥ **2%** of the baseline's at 5 bps and > 0 at 10 bps; Δ > 0 against the
   baseline interpolated at the scenario's borrowing-dollar-days (0 and 5 bps); the maximum **percentage** drawdown of
   daily equity ≤ 30% is ideal, 30–35% is acceptable only if it exceeds the baseline's by at most 1.0 percentage point
   and criteria 2 and 4 hold, and > 35% fails. The minute-sampled percentage DD is reported beside it.
5. **Out of sample:** in the holdout + final attribution of the same run the added books fund ≥ 1 lot and Δ fixed
   net (5 bps) > 0; otherwise "not advanced: insufficient or contradictory out-of-sample evidence". Holdout and final
   are reported separately and prominently.
6. **Credibility:** the data, split and distribution checks pass, and the analytic distribution sensitivity does not
   change the sign of criteria 2 and 4.

A scenario whose portfolio evaluation cannot be completed (missing data, coverage or accounting) is **pending
portfolio validation**, neither passing nor failing criterion 4. If S3 and a single-candidate scenario both advance,
the recommendation is the one with the larger Δ portfolio equity at 5 bps.

## 7. Promotion

Only an advancing candidate gets `config/phenotypes/D1/<SYMBOL>.json` (the existing loader conventions, provenance to
`FROZEN_CANDIDATES.json`) and the command `npm run app -- allIn-trailingBuy-postExitContinuation <SYMBOL> --phenotype
primary`; otherwise its vectors stay in `research/complementary-etf-d1/` only.

## 8. Reports

`README.md`, this file, `DATA_AND_CORPORATE_ACTION_AUDIT.md`, `OPPORTUNITY_SCREEN.md`, `OPTIMIZATION_AND_FREEZE.md` +
`FROZEN_CANDIDATES.json`, `INCREMENTAL_ALLOCATOR_RESULTS.md`, `HOLDOUT_AND_FINAL.md`, `IMPLEMENTATION_AUDIT.md`,
`RECOMMENDATION.md`, and machine-readable results under `results/`.

## 9. Amendments

(none at the time of writing)
