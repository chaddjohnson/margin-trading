# Protocol: four-family trailing-buy optimization

Written on 2026-10-19, before any optimization result existed. The only strategy results seen before writing
it are the parity runs of the four strategy files at their own defaults on 2016-01-04 → 2023-12-29
(development data, section 3), which were needed to verify the engine. Any later change to this protocol
will be added as a dated amendment at the end, with its reason; nothing above an amendment will be edited.

Code: `src/four-family/` (engine, accounting, search, selection, evaluation, holdout lock) and
`src/app/fourFamily.ts` (CLI entry, `npm run four-family -- <command>`). Results: `results/` next to this file.
Branch `research/trailing-buy-four-family-optimization`.

## 1. Strategy files (sources of truth, never modified)

| # | Family key | File | sha256 | Free parameters |
|---|---|---|---|---|
| 1 | `trailingBuy` | `src/app/allIn-trailingBuy.ts` | `b912cb9e…c647ceb6` | 8 |
| 2 | `bufferedLoss` | `src/app/allIn-trailingBuy-bufferedLoss.ts` | `2e5819eb…dc809653` | 9 |
| 3 | `noReentry` | `src/app/allIn-trailingBuy-noReentry.ts` | `bbe25327…f113da6f` | 5 |
| 4 | `bufferedLossNoReentry` | `src/app/allIn-trailingBuy-bufferedLoss-noReentry.ts` | `128eaec4…164af2de` | 6 |
| — | comparator | `src/app/allIn.ts` (immediate entry, 10%/8%/15/90/1%/2%/38%) | `d59e1076…38a7c617` | none (fixed) |

The full hashes are in `results/parity/parity.json` (`sourceHashes`) and the freeze manifest.

### 1.1 Reconciliation of the brief's parameter matrix with the executable code

The executable defaults in the checked-out files (commit `5b03299`):

| Parameter | File 1 | Files 2, 3, 4 | How the file sets it |
|---|---|---|---|
| X `targetPercentChange` | 10% | 10% | option, default `0.1` |
| Y `trailingBuyPercentage` | **4%** (`0.04`; its comment still says 3%) | **3%** (`0.03`) | option |
| `trailingStopPercentage` | 8% | 8% | hard-coded constant |
| `maximumHoldDays` | 15 | 15 | hard-coded constant |
| `tickWindowSize` (L) | 90 | 90 | hard-coded constant |
| `materialLossThreshold` | 1% | 1% (file 2); absent (3, 4) | hard-coded constant |
| `lowerPriceReentry` | 2% | 2% (file 2); absent (3, 4) | hard-coded constant |
| `retraceFraction` | 38% | 38% (file 2); absent (3, 4) | hard-coded constant |
| `intradayLossBuffer` | absent | 0.5% (files 2, 4); absent (3) | option, default `0.005` |
| margin rate | 11% | 11% | hard-coded constant |
| investment | $100,000 per entry (optional sizing callback, unused here) | same | constant |
| stop fill | `stop` (option, `next-open` alternative) | same | option |

The dimensions are therefore 8 / 9 / 5 / 6 as the brief expected; no material discrepancy. Two details matter:

- **Y differs by file.** Every run in this study passes X, Y and the buffer explicitly. Each family is reported at
  its own file default (family 1 at Y = 4%, families 2–4 at Y = 3%) **and** at both matched values, Y = 3% and
  Y = 4%, so the families can be compared without the Y mismatch.
- **Warmup.** Each file arms nothing before session index `tickWindowSize` (90) of the session list it is given,
  and its reference high is the highest high of the previous `tickWindowSize` sessions of that list, excluding
  the current session. With L optimized from 45 to 180, the source's own warmup would let a short-L candidate
  trade earlier. This study instead uses **one common first eligible session for every candidate, every family
  and the `allIn.ts` comparator: session index 180 = 2016-09-20**, which gives every L ≤ 180 a complete
  lookback over real sessions (2016-01-04 → 2016-09-19 is prehistory only). Nothing arms before it. Before the
  freeze, a test checks that a run with `armStart = 180` equals the injectable copy of each source file with
  its arming guard raised to `max(L, 180)` (golden master, section 3).

## 2. Data

`data/VGT/VGT-2016-2025-1-minute.csv`, sha256 `600322af…24c7962f`. These are Alpaca raw (not split-adjusted)
one-minute bars, timestamped at the minute's start in UTC. The file has 809,490 rows, from 2016-01-04T13:00Z to
2025-10-13T23:07Z. It is loaded with the repository's own `loadCsvMinuteBacktestData` and
`groupMarketSessions`, exactly as the strategy files load it. The audit is in `results/audit/data-audit.json`
(`npm run four-family -- audit`). It checks prices only; no strategy was run for it.

- 2,459 regular sessions, 2016-01-04 → 2025-10-13. The 92 weekdays without a session are exactly the NYSE
  holidays and closures, including 2018-12-05, 2025-01-09 and Juneteenth from 2022. There are 19 early-close
  sessions (1:00 p.m.) from the repository calendar.
- 797,115 regular-session bars and 2,454 closing-auction prints. 5 sessions have no closing print (2 in 2016,
  1 in 2019, 2 in 2025); for those, the files use the last minute's close, and an order that needs the closing
  print waits for the next session. 9,921 extended-hours rows are dropped by the grouping.
- Minutes without trades have no bar: 158,475 regular minutes are missing over the file, most in 2016–2017. No
  session starts late (every first bar is at 9:30).
- No non-positive or inconsistent OHLC bars. No minute-to-minute jump of 2% or more inside a session. The 16
  session gaps of 4% or more are all market-wide events (2020-02-24 → 2020-04-06, 2022-11-10, 2022-12-13,
  2024-08-05, 2025-01-27, 2025-04-03/07/08, 2025-05-12). There is no split-like discontinuity, so no basis
  stitching or split handling is needed. Dividends are not modeled: ex-dividend drops are price moves, as in
  the files.
- **Nothing is repaired or filtered.**

**Coverage for this study:** development data are 2016-01-04 → 2023-12-29 (2,012 sessions). The withheld
interval is 2024-01-02 → 2025-10-13, the last date verified in the file; no later date is claimed.

## 3. Engine and parity (before any optimization)

`src/four-family/engine.ts` transcribes the four files' decision rules statement by statement over typed arrays.
Family flags turn the restriction and the buffered exit on or off. `src/four-family/accounting.ts` reproduces
their interest, profit and mark-to-market accounting, minute-sampled and daily, from the trade list.

It is used for every strategy, including `allIn.ts`, whose own code is run through its generated copy. The
optimization may not start unless `npm run four-family -- parity` passes. The parity audit compares every trade
field exactly: dates, prices, fill times, minute indices, execution labels, exit reasons, stop levels and setup
fields. It compares interest, profit, net profit, both drawdowns and every daily mark to 1e-6 dollars, and also
the setup, restriction and buffered-exit counts. It covers:

- A. The four unmodified files at their exact defaults, with no X, Y or buffer option passed, through 2023-12-29,
  under both stop fills.
- B. The originals with X = 10% and Y passed explicitly at 3% and at 4%.
- C. The originals on other date ranges: to 2019-12-31; 2018-01-02 → 2023-12-29, where a later first session
  moves the source's own warmup; and 2020-01-02 → 2021-12-31 with `next-open`.
- D. The generated injectable copies (`src/four-family/copies.ts`: a fixed list of exact textual substitutions,
  each required to match once) equal their originals byte for byte when nothing but the session list is
  injected. This also covers `allIn.ts`.
- E. Golden master: each copy at its two lattice corners plus 30 random lattice vectors per family. Each run has
  a random stop fill, a margin rate of 8%, 11% or 14%, either the source's own warmup or the common first
  eligible session, and either the full development range or the range to 2019-12-31.
- F. The shared accounting reproduces `allIn.ts`'s own net profit and both drawdowns, with and without the common
  first eligible session.
- Synthetic edge cases in `src/four-family/tests/` (overnight orders, gaps, early closes, the maximum-hold
  threshold, recovery reset, buffered exit against stop precedence, the lookback, and the closing print without a
  later trade) compare the engine with the copies on constructed sessions and assert the expected outcome.

The holdout command repeats A on the full file before it reports anything.

## 4. Execution assumptions (fixed; never chosen per candidate)

- $100,000 borrowed per entry (fixed size), 11% annual margin interest by the files' calendar-day convention.
  Interest is in net profit and in every profit-based decision: stop activation, the maximum-hold exit, and the
  buffered exit.
- Primary stop fill: `stop` (the file default). A filled stop at the stop price is an idealization; the bars only
  show that trading crossed it. `next-open` is reported for every finalist and baseline as a sensitivity, with
  the same mode for every candidate.
- Interest-rate sensitivity at 8% and 14% for every finalist and baseline. It applies to decisions and
  accounting alike, because interest enters the files' decisions.
- No spread, commission, slippage or market impact. This is an idealized historical simulation on raw minute
  bars with limited execution fidelity. A minute's opening trade is an observed price used as a proxy fill.
- Entry and exit state machines are exactly the files'. Nothing is added: no filters, timeouts, scaling or new
  re-entry rules.

## 5. Parameter space and quantization

Every percentage is an integer number of tenths of a percentage point; `maximumHoldDays` and `tickWindowSize`
are whole numbers. A genome is one integer grid index per free parameter, so Sobol sampling, SBX crossover,
polynomial mutation, caching, neighbours and reports all stay on the lattice. Values reach the engine as
`tenths / 1000`, the same double as the files' literals (`100 / 1000 === 0.1`).

| Parameter | Short | Domain | Steps | Families |
|---|---|---|---|---|
| `targetPercentChange` | X | 7.0%–20.0% | 131 | 1, 2, 3, 4 |
| `trailingBuyPercentage` | Y | 0.5%–8.0% | 76 | 1, 2, 3, 4 |
| `trailingStopPercentage` | stop | 4.0%–12.0% | 81 | 1, 2, 3, 4 |
| `maximumHoldDays` | hold | 5–30 calendar days | 26 | 1, 2, 3, 4 |
| `tickWindowSize` | L | 45–180 sessions | 136 | 1, 2, 3, 4 |
| `materialLossThreshold` | mat | 0.5%–3.0% | 26 | 1, 2 |
| `lowerPriceReentry` | lower | 0.0%–6.0% | 61 | 1, 2 |
| `retraceFraction` | reset | 20.0%–70.0% | 501 | 1, 2 |
| `intradayLossBuffer` | buffer | 0.0%–3.0% | 31 | 2, 4 |

Families 3 and 4 have no restriction genes; nothing dormant is added. `lowerPriceReentry = 0` keeps the whole
restriction state machine, which is not the same as removing it. `intradayLossBuffer = 0` adds a zero-buffer
intraday trigger, which is not the original open-only rule; both are ordinary lattice points.

**Anchors** are added to every search: each family's file defaults at Y = 3.0% and at Y = 4.0%. One of them is
the family's own default: Y = 4% for family 1 and Y = 3% for the others.

## 6. Chronology, windows and objectives

The first eligible session is 2016-09-20 (index 180) for every run; earlier sessions are prehistory for the
reference high only.

| Fit | Training (fit and selection) | Out-of-sample evaluation | Minimum entries in training |
|---|---|---|---|
| fold 1 | 2016-09-20 → 2019-12-31 | 2020-01-02 → 2021-12-31 | 4 |
| fold 2 | 2016-09-20 → 2021-12-31 | 2022-01-03 → 2022-12-30 | 6 |
| fold 3 | 2016-09-20 → 2022-12-30 | 2023-01-03 → 2023-12-29 | 7 |
| final development fit | 2016-09-20 → 2023-12-29 | (development; not out of sample) | 8 |
| frozen holdout | — | 2024-01-02 → 2025-10-13, once | — |

- **Minimum entries:** `ceil((calendar days from 2016-09-20 to the training end + 1) / 365.25)`. A candidate
  below it is infeasible, and its constraint violation is the shortfall divided by the minimum. NSGA-II uses
  constrained domination, so a no-trade configuration can't win on drawdown.
- **Objectives** (training window, `stop` fills, 11%): maximize net profit after interest (realized plus the
  open position marked at the last close), and minimize the maximum minute-sampled mark-to-market drawdown of
  the strategy's cumulative P&L. Daily drawdown is reported too. Both measure the $100,000 strategy P&L
  allocation, **not** whole-account equity or margin-call risk. No ratio is optimized.
- **Window attribution:** every evaluation is one continuous chronological simulation from the first eligible
  session. A window's net profit is the change in the daily mark from the close before its first session to its
  last close. Its drawdowns start from a peak equal to that opening mark. A position open across a boundary
  stays open; its P&L lands where the prices moved. There is no cash reset and no double counting, and the
  simulation is causal, so state carried in never uses later prices. A **flat-start sensitivity** is also
  reported for the validation and holdout windows: arming only from the window's first session, with nothing
  carried in, and full prehistory for the reference high.
- Training runs end at the training end. The engine never reads a session after its last index, and a test
  checks that physically truncating the data gives identical results. Before the freeze, the research dataset
  is physically truncated at 2023-12-29. Only `holdout.ts` can build the full dataset, and only after the
  freeze.

## 7. Search (per family, per fit)

- 4,096 unique quantized scrambled-Sobol points (Joe–Kuo directions, Matoušek scramble with a seed derived from
  `four-family|sobol|<fit>|<family>`) plus the 2 anchors.
- NSGA-II from `src/optimizer/nsga2.ts`, read only: fast non-dominated sorting, crowding distance, binary
  crowded tournaments, (μ+λ) elitism, and SBX (p = 0.9, η = 15) plus polynomial mutation (η = 20,
  p = 1/dimensions) on grid indices. It runs with two seeds (`four-family|nsga|<fit>|<family>|1` and `…|2`).
  Each run starts from the best 128 of the Sobol+anchor archive and runs 60 generations of 128 offspring,
  with no early stop.
- The same nominal budget for every family in a fit: 4,096 + 2 + 2 × 60 × 128 = 19,458 requested evaluations.
  Duplicates are cached, and attempted, unique and duplicate counts are reported.
- A random-sampling control on the final development fit for every family: uniform lattice draws with as many
  unique evaluations as the Sobol+NSGA-II stage. Its Pareto set is compared by hypervolume, best net and
  front size.
- Worker threads: `availableParallelism − 2`. Results don't depend on the worker count, because they are
  ordered by request. A JSONL checkpoint allows a stage to resume exactly.

## 8. Selection (identical for every family and every fit; `src/four-family/selection.ts`)

1. **Phenotypes.** Feasible candidates with positive training net are grouped by the hash of their training
   trade list (entry and exit dates, minutes, prices and reasons). Each group is represented by the member
   nearest the group's coordinate-wise median genome (ties by candidate ID). The group size is reported.
2. **Pool.** Representatives in Pareto order (net ↑, minute drawdown ↓), taking whole fronts until at least 40,
   with the last front trimmed by crowding distance to at most 60.
3. **Neighbourhood probes** on the same training data, one parameter at a time: ±0.1, ±0.3 and ±0.5 points for
   percentages; ±1, ±2 and ±3 days; ±2, ±5 and ±10 sessions; off-lattice probes are skipped. The robust net
   is the 25th percentile of net over the centre and its probes; the robust drawdown is the 75th percentile of
   minute drawdown.
4. **Classification.**
   - *Fragile*: robust net ≤ 0, or robust net below 50% of the centre's net, or any ±1-step probe netting
     below 50% of the centre (a one-step cliff).
   - *Stable*: robust net ≥ 80% of the centre's and robust drawdown ≤ 125% of the centre's + $1,000.
   - *Moderate*: everything else.
5. **Ten picks.** Eligible members have robust net > 0; fragile members are used only if fewer than 10 others
   are eligible. Picks are made in this order, never repeating a phenotype:
   - 3 **profit**: highest robust net.
   - 3 **balanced**: the smallest normalized distance to the utopia point (best robust net, lowest robust
     drawdown) among meaningful members, defined as robust net ≥ 25% of the best.
   - 2 **low-DD**: lowest robust drawdown among meaningful members.
   - 2 **Pareto-diverse**: robust Pareto rank, then crowding distance.

   If fewer than 10 qualify, fewer are reported.
6. **Freeze.** Before the holdout, the 40 final picks, every rule above, every seed, and the code, data and
   source hashes go into `results/final/freeze.json`, with its own hash.

The same rule picks the walk-forward candidates on each fold's training data only. Walk-forward results do
not change the rule, the final picks, or any threshold.

## 9. Out-of-sample evaluation and family-level verdict (pre-declared)

- **Walk-forward:** each fold's 10 picks per family, the family defaults (own Y, Y = 3%, Y = 4%) and `allIn.ts`
  are evaluated on that fold's validation window: continuous (primary) and flat start. The category leaders
  (profit #1, balanced #1, low-DD #1) are stitched across folds (2020–2021 from fold 1, 2022 from fold 2, 2023
  from fold 3) as a pre-declared policy. A final-fit candidate never gets a walk-forward figure of its own.
- **Holdout (once):** the 40 frozen picks, the family defaults (own Y, Y = 3%, Y = 4%) and `allIn.ts` on
  2024-01-02 → 2025-10-13. This is continuous from 2016-09-20 (primary) and flat start, under `stop` and
  `next-open`, at 8%, 11% and 14%. It also reports per year, April 2025, and the combined 2016-09-20 →
  2025-10-13 run.
- **Labelling.** 2024–2025 is a chronologically withheld interval, not a pristine unseen one. Earlier research
  in this repository inspected prominent 2025 trades and dates, though the optimizer never reads them.
- **A modification is credited with a repeatable out-of-sample advantage** only if both conditions hold:
  - The comparison wins on net profit in at least 3 of the 4 out-of-sample windows (2020–21, 2022, 2023, and
    the holdout). This applies to the median of the 10 picks per window and to the stitched balanced #1
    policy.
  - Total out-of-sample net is higher, without the worst out-of-sample minute drawdown exceeding the reference
    family's by more than 25%.

  The comparisons are buffered vs not (2 vs 1, 4 vs 3), no restriction vs restriction (3 vs 1, 4 vs 2), both vs
  neither (4 vs 1), and each family against its own defaults and against `allIn.ts` on the same windows. Matched-Y
  defaults (3 vs 1 and so on at Y = 3% and Y = 4%) isolate each modification's effect without optimization.
  Anything short of this is reported as "no credible improvement demonstrated". Training results alone never
  support a superiority claim.

## 10. Reporting rules

Every result that relies on idealized stop fills, missing minutes, few trades, or a partially completed search
is flagged in `OPTIMIZATION_SUMMARY.md`. Negative and unfavourable results are reported in full. Development
(in-sample), walk-forward out-of-sample, holdout and combined figures are always labelled separately.

## Amendment 1 (2026-10-19, after the searches, before any validation, freeze or holdout result)

**Observation (in-sample only).** The first selection pass (pool 40–60, exact-phenotype de-duplication) produced
picks that had different exact trade lists but were near-identical behaviours. Several had identical entry and
exit *dates* and differed only in the minute or price of a fill; for example, family 4's three balanced picks
held exactly the same trades by date. That doesn't meet the brief's "10 genuinely distinct trading behaviours".
This was seen on the final development fit's in-sample metrics only. No walk-forward validation, freeze or
holdout had been computed, and none of those first-pass picks was ever evaluated out of sample.

**Change to section 8, applied identically to every family and fit:**

- *Behavioural clones.* Two candidates are behavioural clones if the Jaccard overlap of their held sessions
  (sessions with a position open at the close, over the training window) is 0.8 or more. Exact phenotypes are
  still de-duplicated first, as before.
- *Pool = behaviour-cluster leaders* (replaces step 2). The eligible representatives (feasible, net > 0) are
  scanned in Pareto order (net ↑, minute drawdown ↓; within a front by crowding distance, then ID). Each one
  becomes a cluster leader unless it is a behavioural clone of an earlier leader, in which case it joins that
  cluster. The first 100 leaders form the pool, scanning at most 6,000 representatives. All leaders are
  probed as in step 3.
- *Picks* (step 5) are unchanged, except that no pick may be a behavioural clone of an earlier pick. If the
  non-fragile leaders can't provide ten mutually distinct picks, fragile leaders with positive robust net fill
  the remaining slots as "Pareto-diverse". They are marked fragile in every table.

**Intermediate attempt, also superseded before any out-of-sample evaluation.** A first version of this amendment
kept a Pareto pool of 100–150 and only excluded clones at pick time. That left fewer than ten picks in 11 of
the 16 fits, as few as 4, because the Pareto pool was itself made of a few behaviours. It was replaced by the
cluster-leader pool above. Under the final rule, every fit has 10 picks, none fragile, and the largest pairwise
held-session overlap between picks is below 0.8. Three fits' scans reached the 6,000 limit with 52–76 leaders.
Every fit's selection was re-run from the unchanged search archives. The superseded picks were never evaluated
outside training and are not reported as results.

**Domain boundaries (disclosure, no change).** Several in-sample optima sit on the pre-declared domain
boundaries: X = 20.0% (upper bound), stop = 4.0% (lower bound), Y = 0.5%–0.8% (near the lower bound) and
hold = 5 days (lower bound). The domain is kept as declared, so the true in-sample optimum may lie outside it.
This is reported as a limitation, not searched further.
