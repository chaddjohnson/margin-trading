# Protocol — Study 6: frozen five-ETF B5 robustness audit (KRE diagnosis) and bounded phenotype improvement

Written 2026-10-30 on branch `research/study6-b5-kre-robustness` (from `b4f9857`), **before any perturbation,
neighbourhood, ablation, sensitivity or candidate of this study was evaluated on any period**. What had been computed
before this protocol: one engine timing benchmark of the frozen B5 centre on the full history (2016-01-04 →
2026-10-29: net $484,636.97, minute DD $26,509.97, 95 lots, 1 open — the figure Study 5 already published). Every
earlier study's published figures are known to the analyst (§3.4), including the earlier five-ETF B5 neighbourhood
results that §6 recovers. `npm run study6 -- freeze-protocol` records this file's sha256, time, git state and the code
digest in `results/protocol_freeze.json` and refuses a second freeze; every later change is an amendment appended in
§13 with its time and reason. The constants below are mirrored in `src/study6-b5-kre-robustness/context.ts`.

The study has two parts that run strictly in sequence: **Part A** (frozen diagnosis; no tuning, no candidate) and
**Part B** (bounded improvement). Part B's code refuses to run until Part A's sealed diagnostic manifest exists, verifies,
and is committed (§9). Part B's search spaces, algorithms, budgets, seeds, windows, scores and gates are fixed **here**,
before Part A produces any result; the only Part B choices left to Part A results are the two mechanical rules of
§10.4 (Track J's trigger and its books) and the one post-diagnostic amendment window of §9.3.

## 1. Questions, hypotheses, alternatives

**Part A (diagnosis of the unchanged frozen B5: VGT `primary`, XBI/XRT/KRE `lowDd`, GDX `portfolioAware`).**

| ID | Hypothesis | Alternative explanations tested |
|---|---|---|
| H1 | Full five-ETF frozen B5 **fails** the Study 5 risk gate (≥ 90% of joint N1 neighbours with minute DD < $35,000 and N1 p90 < $35,000), although its centre DD ($26.5k) passes. | It passes: the restricted three-ETF 24% (Study 5) was an artefact of removing XBI/XRT. |
| H2 | KRE is the weak link: perturbing **KRE alone** leaves a materially lower share of neighbours below $35k than perturbing any other single book ("materially" = ≥ 10 percentage points below every other book on the primary design). | Another book (XBI, GDX, VGT, XRT) is as fragile or more; fragility appears only jointly. |
| H3 | KRE breaches are driven by specific parameters — expected: entry depth X near the 30.0% ceiling, the 3.1% stop near the 3.0% floor and the 4-day hold near the 3-day floor. "Drives" = holding the parameter at its frozen value removes ≥ 25% of KRE-only breaches. | Y or L (arming timing) drive them; the effect is diffuse. |
| H4 | Part of KRE's apparent fragility is a sampling artefact of box clipping (X, stop and hold are each ≤ 1 step from a bound, so ≈ half of the Study 5 design's draws in each of those dimensions sit exactly on the bound). | The in-box design (§5.3) shows the same fragility. |
| H5 | KRE-induced breaches arise mainly from **capital contention / changed opportunity allocation** (KRE's timing changes which other book holds the single slot in a later decline), not KRE's own adverse excursion. | KRE's own price excursion (2020, 2023 bank stress); gap/stop fills; path dependence through earlier lots; compounding episodes. |
| H6 | KRE-alone fragility predicts joint fragility: resetting KRE to frozen inside each joint N1 neighbour removes most (> 50%) of joint breaches. | Joint breaches persist without KRE's perturbation (other books or interactions dominate). |
| H7 | The frozen centre stays below $35k under every execution setting of §7, and the neighbourhood verdict does not depend on the setting. | Costs/fills, not parameters, drive the risk. |

**Part B (improvement; existing phenotype parameter values only).**

| ID | Hypothesis | Null / alternative |
|---|---|---|
| H8 | Some KRE-only phenotype change (Track K), chosen on development data only, passes every hard gate of §11 with acceptable economics on development + validation and survives the retrospective full-history stress. | No such candidate exists; apparent improvements are development-period fits that fail validation or the exposed later period (expected from Study 5's evidence of overfitting). |
| H9 | The original B5 method (Track O) does not produce robustness-qualified KRE vectors, because it scores only the centre. | It does. |

## 2. What may not change (both parts)

- The D1 rules (`src/app/allIn-trailingBuy-postExitContinuation.ts`, its verified port in
  `src/shared-margin-portfolio/strategy.ts` and `src/multi-etf-allocator/shadow.ts` `ShadowBook`), the allocator (one
  shared funded slot, shadow books that commit every signal, first executable signal wins, same-minute ties
  alphabetical, no compounding, constant $100,000 per funded trade), fills (stops at the stop, or at the gapped open;
  `stopFill: 'stop'`), interest (11% simple, 365-day year, on the $100,000 principal), costs (5 bps per side,
  commission 0), arming from 2017-06-15, accounting from the close of 2016-01-04, ETF membership (VGT, XBI, XRT, KRE,
  GDX), book order and tie order.
- Only the eight registered D1 parameters vary (X `targetPercentChange`, Y `trailingBuyPercentage`, stop
  `trailingStopPercentage`, hold `maximumHoldDays`, L `tickWindowSize`, buffer `intradayLossBuffer`, P `pullback`, W
  `continuationWindow`; `src/phenotype/architectures.ts`), on their grid, inside the eight-ETF box of
  `src/multi-etf-d1/context.ts` (unchanged): X 8.0–30.0%, Y 0.1–5.0%, stop 3.0–15.0%, hold 3–30 calendar days, L
  20–250 sessions, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200 sessions; percentages in tenths of a point, integers
  otherwise. No other knob exists for a D1 book in the pool engine (verified in `src/portfolio-aware-d1/phenotypes.ts`
  `candidateBook`: the eight parameters are the whole phenotype); none is invented.
- No engine edit, no new rule, regime filter, stop, overlay, sizing change, removal or addition of an ETF, or
  allocation policy. Diagnostic counterfactuals (§6.6, §7) are computed by **filtering or replaying unchanged traces**
  (a refused decision changes nothing else under shadow semantics) and are labelled diagnostics, never candidates.
- Read only: `config/pools/B4.json`, `config/pools/B5.json`, `config/phenotypes/D1/*.json`, every earlier study's
  records, `data/`, market events, splits, partitions. New configurations use new names only (§12).
- Out of scope: the actual portfolio, the VOOG/VGT core, the 20%-of-equity margin mode, broker access, orders.

## 3. Engine, accounting, data, exposure

### 3.1 Engines

- **Fast path:** each book's virtual-trade trace (`traceBook`, `src/portfolio-aware-d1/trace.ts`) and the causal
  fixed-pool replay (`replayFixedPool`, `replay.ts`), through the Study 5 evaluator (`src/study5-gdx-b5-three-etf/
  engine.ts` `Evaluator`), all imported unchanged. Under shadow semantics a book's trace does not depend on the
  allocator, so a pool result is the replay of the five traces.
- **Authoritative:** `runNAllocator` (`src/portfolio-aware-d1/nbook/engine.ts`, the engine of `npm run pools`).
- **Parity gates (§8.1) must pass before any Part A statistic is reported.**

### 3.2 Metrics (5 bps and 11% unless stated)

- Net = realized + marked unrealized at the run's last close, after interest and costs; gross = net + interest +
  costs; friction = costs.
- **Minute DD** = the frozen strict tracker (`Tracker.updateStrict`) of the strategy mark (realized + unrealized after
  interest and costs) at every bar of the held lot's own symbol, at every exit minute and at every close, peak starting
  at 0 at the run's first session; **daily DD** = closes only. Both in dollars and as % of the fixed $100,000
  allocation, never interchanged. **Risk ceiling: strictly < $35,000.000** on the unrounded value.
- Lots = funded lots (open ones included); occupancy = sessions with a lot held ÷ eligible sessions; capital-days =
  Σ calendar days a lot is held; profit per occupied $100k-year = net ÷ (capital-days ÷ 365).
- Period figures = attribution inside one continuous run (mark at the period's last close − mark at the close before
  it, "chained"). Per-period **minute** DD comes from the reconstructed minute mark series (§6.7), checked against the
  tracker's whole-run maximum.
- Funded / refused decisions, refusals by decider<holder, KRE virtual trades (granted, refused).

### 3.3 Data

`data/{VGT,XBI,XRT,KRE,GDX}/data.csv` through **2026-10-29** (2,722 NYSE sessions from 2016-01-04): current sha256
VGT `624e4094…`, XBI `83b71f75…`, XRT `c625ca57…`, KRE `fd7ab8aa…`, GDX `134b7450…`. The prefixes through
2026-10-13 must hash to the frozen B5 pins (`config/pools/B5.json` `regressionAnchors.dataSha256`); stage S2 (§8.2)
recomputes them and fails closed otherwise. Splits `e5bde427…` (VGT 8:1 on 2026-04-21, forward-adjusted by the shared
loader). The fixed pool books no distributions. Time zone of every date: America/New_York.

### 3.4 Exposure (none of these periods is unseen)

- 2016–2023 trained every B5 book (VGT programs 2016–2025; KRE `lowDd` multi-etf-d1 2017–2023; GDX portfolio-aware
  2017–2023) and every later D1 study (folds ending 2019–2021).
- 2024-01-02 → 2026-10-13 was opened for all B5 books by the portfolio-aware evaluation, the pools, the B4/B5
  robustness audit (which perturbed every book's parameters over the full history) and Study 5.
- 2026-10-14 → 2026-10-29 (12 sessions) was opened by Study 5 (its RECENT slice).
- So **all of Part A is retrospective research on exposed data**, and Part B's chronology (§10.1) only limits leakage
  *within this study*. The analyst also knows Study 5's three-ETF figures and the earlier five-ETF results of §6.1.
- Part A's diagnostics are computed on the full history before Part B is designed in detail; Part B's design is fixed
  here instead, and the two Part-A-dependent rules (§10.4) are mechanical.

## 4. Windows (continuous runs from 2016-01-04; positions, setups, stops, highs, interest and peaks carry across every boundary)

| Label | Run end (last session) | Use |
|---|---|---|
| WDEV | 2021-12-31 | Part A's development-window replicate (Track J's rule, §10.4); Part B search (as the search door) |
| W23 | 2023-12-29 | Study 5's gate window (PG2 was measured on the run to 2023-12-29); Part B validation |
| W13 | 2026-10-13 | the frozen B5 pinned endpoint; the B4/B5 robustness audit's window |
| W29 | 2026-10-29 | the current full history (primary Part A diagnostic window) |

A run ending at a window is a truncated run: an open lot is marked at that close. Period labels inside the runs: DEV
2017-06-15 → 2021-12-31, VAL 2022-01-01 → 2023-12-31, FX 2024-01-01 → 2026-10-13, RECENT 2026-10-14 → 2026-10-29,
FULL 2017-06-15 → 2026-10-29; calendar years; half years; the 13 regimes R1–R13 of `src/portfolio-aware-d1/context.ts`.

## 5. Perturbation designs (deterministic)

### 5.1 Radius, steps, probes (Study 5 §4.2, unchanged)

- **Increment r** (the "±2 step", grid units): X 10 (1.0 pt), Y 2 (0.2 pt), stop 10 (1.0 pt), hold 2 days, L 10
  sessions, buffer 10 (1.0 pt), P 10 (1.0 pt), W 20 sessions.
- **Probes**: one parameter at a time at ±1 and ±2 steps (X ±5/±10, Y ±1/±2, stop ±5/±10, hold ±1/±2, L ±5/±10, buffer
  ±5/±10, P ±5/±10, W ±10/±20 grid units; the repository's probe set `src/multi-etf-d1/space.ts` `probeParams`),
  in-box only (out-of-box probes are recorded as infeasible and not replaced), ≤ 32 per book.

### 5.2 The Study 5 design ("clip", decisive)

Latin hypercube with n strata per dimension, offsets in [−1, 1]; each coordinate = centre + round(offset × scale × r),
clipped to the box. N1: scale 1; N2: scale 2 (context only). Distance = L∞ of offsets in units of r (≤ 1 for N1).
Joint designs span **all 40 parameters of the five books** (book order VGT, XBI, XRT, KRE, GDX × the eight keys);
per-book designs span one book's 8 (the other four frozen); pair designs span two books' 16 (the other three frozen).

### 5.3 The in-box design ("inbox", sensitivity)

Same LHS offsets, mapped linearly onto the in-box part of each interval: coordinate = round(lo + (offset + 1)/2 ×
(hi − lo)) with [lo, hi] = [max(min, c − scale·r), min(max, c + scale·r)]. No point mass on a bound. It answers H4;
it is never decisive.

### 5.4 Sets, seeds, sizes

Seeds `deriveSeed('study6-b5-kre-robustness', …labels)` (`src/optimizer/rng.ts`); the offsets do not depend on the
centre (so two centres evaluated with the same labels share common random numbers).

| Set | Labels | n | Replicates | Use |
|---|---|---:|---|---|
| Joint N1 clip | `('A','joint',rep)` | 128 | rep 1–5 | **rep 1 decisive for the frozen-B5 verdict**; 2–5 Monte Carlo replicates |
| Joint N1 inbox | `('A','joint-inbox',rep)` | 128 | 1–5 | H4 |
| Joint N2 clip | `('A','joint-n2',rep)` | 64 | 1–3 | context |
| Per-book N1 clip | `('A','book',SYM,rep)` | 64 | 1–5 | per book (VGT, XBI, XRT, KRE, GDX) |
| Per-book N1 inbox | `('A','book-inbox',SYM,rep)` | 64 | 1–5 | H4 |
| Per-book N2 clip | `('A','book-n2',SYM,rep)` | 64 | 1–3 | context |
| KRE half radius (scale 0.5, clip) | `('A','kre-half',rep)` | 64 | 1–5 | alternate step size |
| KRE inbox with X radius 5 / 20 | `('A','kre-x5',rep)`, `('A','kre-x20',rep)` | 64 | 1–5 | alternate X step sizes inside the bound |
| KRE N1 with parameter k frozen (paired: the KRE N1 clip points of the same rep with coordinate k reset to frozen) | `('A','book','KRE',rep)` | 64 | 1–5 | H3 (8 designs) |
| Pairs KRE+GDX, KRE+VGT, KRE+XBI, KRE+XRT (clip, 16-D) | `('A','pair',SYM,rep)` | 64 | 1–3 | interactions (fixed list; no search for winning pairs) |
| Parity samples | `('A','parity',…)` | 8 joint + 4 KRE | 1 | P1 |
| B1 (VGT `primary` alone) N1 clip | `('A','B1',rep)` | 128 | 1–5 | the B1 answer (§6.5) |

One-dimensional **lines** (every grid value, one parameter at a time, others frozen): KRE over centre ± 2r
(in-box) for each of the eight parameters, plus KRE X over 26.9%–30.0%; every other book over centre ± r.

### 5.5 Summaries and the gate statistic

- For each set: median, p10, p90 (linear interpolation between order statistics, type 7), worst, and the share of
  points with minute DD < $35,000; median/p10/p90 net; share profitable; share with net ≥ 50% / 75% of the centre's;
  the centre's percentile among its neighbours; interest, gross, friction, occupancy, funded and refused counts.
- **Duplicates:** an exact duplicate = the same full parameter vector as an earlier point of the set or as the centre.
  The gate statistic is computed on **unique** vectors (a duplicate counts once; the centre is never one of its own
  neighbours); the all-points figure (Study 5's convention) is reported beside it. Clipping is reported per book and
  parameter (count of points with a clipped coordinate) and as the mass on each bound. Behavioural duplicates
  (identical funded-lot ledger to another point or to the centre) are counted and reported, not removed.
- **Gate (G-N1):** share of unique joint N1 neighbours with DD < $35,000 ≥ 0.90 **and** their p90 DD < $35,000;
  **G-C:** centre DD < $35,000. The two neighbourhood conditions are both required (they can disagree by one order
  statistic under linear interpolation; the conjunction is the gate). Fixed now; never moved.

## 6. Part A — frozen diagnosis (stages A1–A8; every record sealed, write-once)

### 6.1 Earlier evidence (A1, read-only)

Recompute, from the stored records, the five-ETF B5 neighbourhood figures of `research/b4-b5-robustness-audit`
(`results/A_joint_samples.csv`, `results/runs/{joint,book}.jsonl`, `results/analysis.json`),
`research/d1-robust-pool-discovery` and `research/d1-diverse-pool-discovery` (`benchmarks.json`),
`research/joint-16-etf-d1` (`results/robust/robust.json`) and `research/d1-ranked-preemption` (a different policy;
labelled): source file and hash, date, protocol (radius rule, n, seeds, dimensions, window, costs), share < $35k,
p90 DD, median net. **P5** (§8.1) re-runs 8 stored B4/B5-audit joint samples through this study's evaluator on W13
and requires the stored fixed net and minute DD exactly (|Δ| < $0.005), so that evidence is comparable.

### 6.2 Baseline (A2)

Frozen B5 on W13 and W29 through the pools CLI (`npm run pools -- fixed B5 --end 2026-10-13`, `npm run pools -- fixed
B5`) and the evaluator: net, realized/unrealized, gross, interest, friction, minute and daily DD with their dates,
lots (open), virtual trades, per-book lots and net; the exact W13 anchor ($486,207.77 / $26,509.97 / 94 lots) must
reproduce (P3); the W13 → W29 change is reconciled lot by lot (closed lots, the open lot's marks).

### 6.3 Neighbourhoods (A3)

On W23, W13 and W29: every set of §5.4 for frozen B5 (joint, per-book, N2, inbox, KRE variants, pairs) and the probes
and lines. On WDEV: joint N1 clip reps 1–5 and the per-book N1 clip reps 1–5 (needed by §10.4). Per point: net, DD
(minute/daily with dates), interest, gross, friction, lots, KRE lots, occupancy, funded/refused, the funded-ledger
signature.

### 6.4 KRE attribution and interactions (A4)

1. **Parameter attribution (H3):** breach share of KRE N1 with each parameter frozen versus the full KRE N1 (same
   replicate seeds); breach rate by offset sign and tercile of each parameter in the pooled KRE N1 (5 × 64); the
   one-dimensional lines (where on each line DD first reaches $35k; profit and risk plateaus).
2. **Boundary (H4):** clip vs inbox, the X lines, half radius and the X radius variants; the share of KRE points on
   each bound.
3. **Joint decomposition (H6):** for every joint N1 clip point (5 × 128, on W29, WDEV and W23): the point with **book b reset
   to frozen** (five variants) and the point with **only book b perturbed** (five variants). Book importance
   I_b = (joint breaches − breaches with b reset) ÷ joint breaches. Classes per breach: "KRE-only sufficient"
   (KRE-only variant breaches), "needs KRE" (the KRE-reset variant does not breach), "without KRE" (KRE-reset
   variant still breaches).
4. **Pairs:** pair breach share against the single-book shares and against the independence benchmark
   1 − (1 − p_KRE)(1 − p_b).

### 6.5 B1 (A5)

B1 is a literal, distinct benchmark in this repository: "VGT D1 alone (primary)" (`src/joint-16-etf-d1/benchmarks.ts`,
`src/d1-robust/final.ts`, `src/d1-ranked-preemption/controls.ts`; anchors in
`research/joint-16-etf-d1/results/controls/controls.json`); there is no `config/pools/B1.json`. Its earlier
neighbourhood tests are recovered as in §6.1; this study runs only its apples-to-apples gate (VGT `primary` alone in
the fixed $100,000 pool, 128-point clip N1 over its 8 parameters, reps 1–5, W23 and W29) and its probes. No
optimization of B1. Answer: passes / fails / not demonstrated under G-C and G-N1.

### 6.6 Ablations and counterfactuals (A6; diagnostics, never candidates)

- **B5 − KRE** (the four other books; KRE's book absent) and **KRE recorded but never funded** (the five-book replay
  with every KRE decision refused: the KRE trace's trades removed from the replay's funding events). Under shadow
  semantics these are expected to be identical; if so, that is reported (with the ledger hashes) rather than presented
  as two results. Differences from frozen B5 are decomposed into KRE's own funded net, other books' lots gained, and
  lots displaced.
- Leave-one-book-out for every book (context), and KRE alone in the pool.

### 6.7 Events (A7)

- **Representative failures (predeclared rule):** the breach scenarios (W29 DD ≥ $35,000) of the pooled KRE N1 clip
  (5 × 64) and of joint N1 clip rep 1 are grouped by the **calendar quarter of their minute-DD trough** (one quarter =
  one underlying episode). Episodes are ranked by the number of breach scenarios they hold (ties: the larger maximum
  DD). Up to **five** episodes are taken from the KRE set and up to **three** more from the joint set (quarters not
  already taken). Representative of an episode = its breach scenario with the smallest normalized distance to the
  frozen centre (ties: design order, then sample index).
- For each representative: the **earliest divergence** from frozen B5 — the first KRE (or other) virtual trade that
  differs (classified *arming* if the setup activation differs, *entry decision* if only the decision differs, *fill*,
  *exit*), and the first funded-ledger difference (*funded / refused / displaced*); the occupancy chain from the
  divergence to the trough (each funded lot: new, displaced or shared with frozen B5); the exact peak and trough
  timestamps, the lot held at each, realized and unrealized P&L at both, interest; the **exact decomposition of the
  drawdown by lot** (mark change of each lot between peak and trough, from the reconstructed minute series; the parts
  sum to the drawdown) and the same interval in frozen B5.
- **Mechanism class (H5)** of each breach scenario: *KRE own excursion* if KRE lots account for ≥ 50% of the decline;
  *enabled/displaced ETF* if non-KRE lots absent from frozen B5's ledger account for ≥ 50%; *shared-lot path
  dependence* if lots identical to frozen B5's account for ≥ 50% (the same losses measured from a different peak);
  *compound* otherwise; plus a *gap/stop* flag when a lot that exits by a gapped stop or gapped hold exit contributes
  ≥ 25%. 2020, 2022 and 2025–2026 are discussed only where the traces show them.
- Global DD is path-dependent and never additive across trades: every attribution is inside one path.

### 6.8 Execution sensitivity (A8)

Settings (one at a time, everything else base): friction 0, 2, 10, 20 bps; interest 8% and 14%; `next-open` stop
fills; 10 and 25 bps of additional stop slippage (all implemented by the engine and the traces). Applied on W29 and W23
to frozen B5, to the representatives of §6.7, and to KRE N1 clip rep 1 and joint N1 clip rep 1 (the same points).
Also on W29: per-year attribution and per-year minute/daily DD; leave-one-year-out (attribution, and a
path-preserving **funding blackout** of each calendar year: every decision dated in that year refused, later years
replayed from the same traces); arming-date shifts (2017-12-15, 2018-06-15); isolated flat starts on 2020-01-02,
2022-01-03 and 2024-01-02 (observational warm-up from earlier sessions); concentration (top 1/3/5 lots, top year,
top drawdown episodes); distance from the centre to the nearest breach on each line. None of these is a holdout and
none is mixed into a ranking.

### 6.9 Diagnostic checkpoint (A9)

`DIAGNOSTIC_CHECKPOINT.md` and the sealed `results/diagnostic_manifest.json` (`npm run study6 -- diagnostic-freeze`:
every Part A record with its body and file hashes, the code digest, data hashes, commands), then a local commit. Part B refuses to run unless that manifest
verifies and its commit is an ancestor of `HEAD`.

## 7. Interpretation standards (fixed now)

- **Frozen-B5 verdict (the Phase 1 answer):** PASS iff G-C and G-N1 pass on joint N1 clip rep 1 on **both** W23 (Study
  5's gate window) and W29 (full history); FAIL iff either fails. The verdict is "robustly established" if all five
  replicates agree on both windows, otherwise "marginal". The all-points (Study 5 convention) and W13 figures, the
  inbox design and the earlier audits' figures are reported beside it, never substituted.
- **H2** confirmed iff KRE's per-book N1 clip share (pooled reps 1–5, W29) is ≥ 10 points below every other book's and
  the ordering holds on W23. **H3**: a parameter "drives" KRE breaches iff freezing it removes ≥ 25% of the KRE N1
  breaches (pooled reps, W29). **H4**: a clipping artefact iff the inbox share is ≥ 10 points higher than the clip
  share (pooled reps, W29). **H5**: a mechanism is "main" iff it is the class of > 50% of the breach scenarios.
  **H6** confirmed iff > 50% of joint N1 breaches (pooled reps, W29) disappear when KRE is reset. **H7** confirmed iff
  the centre stays < $35k in every setting and the G-N1 verdict on the joint and KRE sets is the same in every setting.
- Monte Carlo precision: each share is reported with its binomial standard error √(p(1−p)/n) and the range across
  replicates; a replicate is never chosen by its result.
- Tables are decisive; plots, where produced, are illustrations generated from the same records.

## 8. Engineering gates

### 8.1 Parity

- **P1** replay = full N-book engine on every compared field (lots, signals, virtual trades, daily rows, both
  drawdowns) for frozen B5 at 0/5/10 bps on W23 and W29, for the 8 joint and 4 KRE parity samples at 5 bps on W29,
  and — through this study's extension of the parity helper — for frozen B5 and two parity samples at 8% and 14%
  interest, `next-open` stops and 25 bps stop slippage on W29: **0 differences**.
- **P3** the pools CLI reproduces $486,207.77 / $26,509.97 / 94 lots on W13 and the evaluator equals the CLI on W29.
- **P4** (Track O) this study's symbol-parametrized step-4 implementation, run on GDX with the original S0 and window,
  reproduces the sealed portfolio-aware selection (IDs, hypervolume trajectories, objectives at four costs), as
  Study 5 P4 did.
- **P5** the 8 B4/B5-audit joint samples (§6.1).
- **R-OM** (Track O-ME) the multi-etf-d1 code at `HEAD` (dataset plumbing only since `b3facfe`), run in a detached
  worktree on its archived inputs, reproduces the sealed KRE nominations (`primary`, `lowDd` IDs and development
  metrics in `FROZEN_CANDIDATES.json`). If R-OM fails, Track O-ME is reported as not reproduced and not run.
- Any failed gate stops the study and is disclosed; nothing is tuned to make it pass.

### 8.2 Data stage (S2)

Hashes of the current files and of the prefixes through 2026-10-13 (must equal the B5 pins); session counts; the last
session complete; the doors log.

## 9. Stage gates and the post-diagnostic window

1. Part A commands refuse to start before the protocol freeze and the parity record (P1, P3, P5) pass.
2. Part B commands refuse unless `results/diagnostic_manifest.json` verifies and is committed.
3. **Post-diagnostic amendment window:** after the checkpoint and **before** any Part B stage, one amendment may change
   the *search sequence or search boxes* of §10 if the sealed diagnostics strongly support it; it must cite the
   diagnostic records, be appended to §13 and be hashed by the first Part B record. It may not change any gate,
   threshold, score, window, seed rule or role rule (§10.6, §11).

## 10. Part B — bounded improvement

### 10.1 Chronology and doors (enforced in `src/study6-b5-kre-robustness/data.ts`; every opening logged to `results/doors.jsonl`)

| Door | Last session read | Partition / access | Who may open it |
|---|---|---|---|
| `diag` | any (W29) | `all`, manual evaluation | Part A only |
| `search-wf19` / `search-wf20` | 2019-12-31 / 2020-12-31 | `training`, optimization | walk-forward replications (§10.7) |
| `search` | 2021-12-31 | `training`, optimization | every Part B search and shortlist decision |
| `validation` | 2023-12-29 | `training`, optimization | the validation stage (§10.6) |
| `final` | 2026-10-29 | `all`, manual evaluation | only after `FROZEN_SELECTION.json` exists and verifies; once per shortlist |

The search door loads the `training` partition with `access: 'optimization'` and an end date, so no bar after
2021-12-31 exists in a search process. Part B never opens `diag`. Every comparison uses the same chronology from
2016-01-04; no reset or splice at any boundary.

### 10.2 Common definitions

- **Search neighbourhood:** joint N1 clip over all 40 parameters around the candidate (the four unsearched books at
  their frozen values, the searched books at the candidate's), seeds `('B','search',k)` for rungs k = 1, 2, 3 (common
  random numbers across candidates). **Selection sets** V1 (decisive), V2, V3: `('B','select',rep)`; **confirmation
  sets** C1 (decisive), C2, C3: `('B','confirm',rep)`. The three families are distinct and fixed now; no other seed is
  used, and no seed is chosen by its result.
- **Robust score (search, DEV run):** R = ½·median(net) + ½·p10(net) − 4 × max(0, p90(DD) − $30,000) over the unique
  neighbours; then multiplied by (1 − 0.05·b) if R > 0 (or (1 + 0.05·b) if R ≤ 0), b = number of searched parameters
  on a box bound (boundary-dependence penalty).
- **Activity / concentration filters (search, DEV):** centre DEV DD < $35,000; centre total funded lots ≥ 75% of
  frozen B5's DEV lots; centre occupancy ≥ 60% of frozen B5's; ≥ 1 funded KRE lot; largest single lot ≤ 25% of the
  centre's DEV net; centre DEV net > 0.
- **Behavioural duplicates:** candidates with an identical DEV funded ledger are one candidate (the lowest vector ID).
- **Distinct region:** normalized L∞ distance (per-dimension difference ÷ (grid points − 1)) over the searched books ≥
  0.05 from every candidate already kept.

### 10.3 Track K (KRE only; VGT/XBI/XRT/GDX frozen at B5) — robustness-first, successive halving

- **Boxes:** K-local = frozen KRE ± 2r (clipped to the box): X 27.9–30.0%, Y 2.3–3.1%, stop 3.0–5.1%, hold 3–8, L
  210–250, buffer 0.3–4.3%, P 7.4–11.4%, W 20–100; K-wide = the full eight-ETF box.
- **Screen:** 2,048 unique scrambled-Sobol vectors in K-local `('B','K','sobol','local')` + 2,048 in K-wide
  `('B','K','sobol','wide')`, each evaluated as the centre (five-book pool, DEV run). The frozen KRE vector is the
  control C5, never a candidate.
- **Rung 1:** the filter of §10.2, behavioural deduplication, then the top 256 by centre DEV net → 16-point search
  neighbourhood (seed k = 1) → R; keep 64. **Rung 2:** 64-point neighbourhood (k = 2) → R; keep 16. **Rung 3:**
  128-point neighbourhood (k = 3) → R; keep 8.
- **Local refinement:** from each of the top 4 rung-3 vectors, at most two passes of coordinate moves over KRE's eight
  parameters (each pass: every parameter at ±1 and ±2 probe steps, in-box), each move scored with the 64-point k = 2
  neighbourhood; the best move is accepted if it raises R by ≥ $2,000 and keeps the §10.2 filters; a pass without an
  accepted move stops that start. Refined endpoints are re-scored with k = 3.
- **Shortlist K:** rung-3 survivors ∪ refined endpoints, behaviourally deduplicated, by R(k = 3), distinct-region rule,
  **at most 6**. Their DEV-side gate status (centre DEV DD, k = 3 share and p90) is recorded.
- **Budget:** 4,096 screen centres; 256 × 16 + 64 × 64 + 16 × 128 rung neighbours; refinement ≤ 4 × 2 × 32 centres
  × 64 neighbours; ≤ 12 × 128 re-scoring. Fixed; no extension.

### 10.4 Track J (limited joint; conditional) — rules fixed now, inputs from Part A

- **Trigger (DEV only):** Track J runs **iff** no Track K shortlist member passes the DEV-side hard gates (centre DEV
  DD < $35,000; k = 3 unique share ≥ 0.90 and p90 < $35,000) **with** R(k = 3) ≥ frozen B5's R(k = 3).
- **Books:** KRE plus the non-KRE book with the largest importance I_b (§6.4.3) on **WDEV** (pooled reps 1–5); the
  second-ranked book is added iff I_2 ≥ ½·I_1 and I_2 > 0. If WDEV has fewer than 10 joint breaches, the W23 values
  are used instead (disclosed).
- **Search:** the J-local box = each J book's frozen vector ± 2r; 4,096 unique Sobol vectors over the 16 or 24
  dimensions `('B','J','sobol')`; then rungs 1–3 exactly as Track K (filters, R, seeds k = 1–3), no refinement;
  **shortlist J ≤ 4** (distinct-region rule over the J books). Multiplicity warning: the effective search dimension is
  16 or 24.

### 10.5 Track O (the original B5 method; comparator, always run)

- **Reconstruction (ORIGINAL_B5_METHOD_REPRODUCTION.md):** B5 is a chain — VGT `primary` (D1 constants, VGT
  refinement), XBI/XRT/KRE `lowDd` (multi-etf-d1 standalone search), the all-lowDd shadow allocator (multi-etf-allocator
  comparison), GDX `portfolioAware` (portfolio-aware-d1 Stages A–C, "the B5 optimizer").
- **O-PA (portfolio-aware method applied to KRE):** base = frozen VGT, XBI, XRT, GDX; Stage A = the original 512
  common-pool vectors (same Sobol seed) + the original controls **minus KRE's own `primary` and `lowDd`** (fitted on
  2017–2023, which includes VAL: evaluated only as labelled controls, never seeds), at 0/2/5/10 bps; Track S (KRE
  alone) and Track P (Δ vs the base); NSGA-II with the original settings and the original seed rule applied to KRE,
  `deriveSeed('portfolio-aware-d1','KRE',track,'nsga2')`; robust selection R1–R5 on folds D1/D2/D3 (2017-06-15 →
  2018-12-31, 2019-01-01 → 2020-06-30, 2020-07-01 → 2021-12-31) and regimes R1–R9; Stage C gates T1–T3 (T4/T5 are the
  20% portfolio's and do not apply). Search door only. Configurations **O-PA-P** and **O-PA-S** = B5 with KRE replaced
  by the selected vector.
- **O-ME (the multi-etf-d1 method that produced KRE `lowDd`):** only if R-OM passes. The original code in a detached
  worktree, with the smallest adapter (a patch stored in `results/track-o/`): development end 2021-12-31 and folds
  fold1 (→ 2019-12-31, validated on 2020), fold2 (→ 2020-12-31, validated on 2021) and final (→ 2021-12-31);
  everything else unchanged (frictionless search, 11%, Sobol 4,096, NSGA-II per fold, selection rule §7 of that
  protocol). Configurations **O-ME-lowDd** (B5's role assignment) and **O-ME-primary** = B5 with KRE replaced.
- Departures (window, base, excluded in-sample controls, gates T4/T5) are stated in the reproduction report; Track O
  candidates are scored against §11 exactly like every other candidate.

### 10.6 Validation and selection (validation door; one stage)

- **Shortlist** = Shortlist K ∪ Shortlist J (if run) ∪ {O-PA-P, O-PA-S, O-ME-lowDd, O-ME-primary} (those that exist),
  frozen and hashed before the door opens; controls C5 (frozen B5) and C5−KRE (diagnostic reference, never a
  candidate).
- **Evidence** (run to 2023-12-29): centre DEV, VAL, folds, years, half-years at base; stresses cost 10 bps, 14%,
  `next-open`, 25 bps stop slippage; joint N1 sets V1–V3 (128 each); per-book N1 (64, V1 labels per book) for each of
  the five books; per-ETF lots, net, interest; refusals; occupancy.
- **Hard gates (all required; §11 Q1–Q8)** and **economics (E1–E2)**, then roles (§10.8). Results go to the sealed
  `FROZEN_SELECTION.json` before the final door opens.

### 10.7 Walk-forward replications (procedure evidence; never a gate)

Track K's full pipeline (§10.3, same budgets and rules) re-run with its search ending 2019-12-31 (WF19; test 2020) and
2020-12-31 (WF20; test 2021), the test windows read from the search door's continuous run. Reported: the chosen KRE
regions, the test-window net of each fold's shortlist versus frozen B5 on the same window, and the development →
test degradation. PBO by CSCV (`src/d1-robust/pbo.ts`, 8 half-year blocks of DEV + VAL, as Study 5) over the main
rung-2 set (64 vectors), at the validation stage; DEV → VAL decay of the shortlist; a paired stationary block
bootstrap (b4-b5 audit implementation, block 21 sessions, 5,000 resamples) of daily mark differences finalist −
frozen B5 over FULL in the final stage. All reported, none decisive, none an independent holdout.

### 10.8 Roles (among candidates that pass Q1–Q8, E1, E2; none forced)

(i) **Most robust:** highest V1 unique share < $35k (ties: lower V1 p90 DD); (ii) **strongest profit retention:**
highest S_V; (iii) **best balanced:** highest S_V ÷ V1 p90 DD. A candidate takes at most one role (the first it wins);
a later role goes to the next best candidate at distinct-region distance ≥ 0.05 from those already taken, or is
omitted. At most three roles.

### 10.9 The final stage (final door; once; `--confirm` may re-run it deterministically)

On the continuous full history (W13 and W29) for every shortlisted candidate and both controls: FULL, DEV, VAL, FX,
RECENT, years; costs 0/2/5/10/20 bps; interest 8/11/14%; `next-open`; 10/25 bps stop slippage; arming shifts
(2017-12-15, 2018-06-15); joint N1 confirmation sets C1–C3 (128) and per-book N1 (C1 labels); joint N2 (64, C1
labels); leave-one-year-out; concentration; the worst-drawdown trace; the bootstrap of §10.7. Then the
classification of §11.3. **No tuning or re-selection after this stage.**

## 11. Gates, economics and classification (fixed now)

### 11.1 Hard qualification (validation stage; continuous run 2016-01-04 → 2023-12-29; 5 bps; 11%)

- **Q1** centre minute DD (2017-06-15 → 2023-12-29) < $35,000.
- **Q2** joint N1 set V1: unique share with DD < $35,000 ≥ 0.90 **and** unique p90 DD < $35,000.
- **Q3** centre VAL net > 0 and V1 median VAL net > 0.
- **Q4** centre DEV+VAL net minus its largest positive calendar-year contribution > 0, and no calendar year > 50% of
  the centre's DEV+VAL net.
- **Q5** activity: centre funded lots over DEV+VAL ≥ 75% of frozen B5's; occupancy ≥ 60% of frozen B5's; funded KRE
  lots over DEV+VAL ≥ max(1, ½ × frozen B5's); every book that funds a lot in frozen B5 over DEV+VAL funds ≥ 1 lot.
- **Q6** largest single lot ≤ 25% of the centre's DEV+VAL net.
- **Q7** centre DEV+VAL net > 0 and centre DD < $35,000 under each stress (10 bps, 14%, `next-open`, 25 bps slippage).
- **Q8** profit plateau (Study 5 PG4, applied to the books a track changes): V1 median DEV net ≥ 60% of the centre's
  DEV net, and the per-book N1 median DEV net of every **searched** book (KRE for Track K and Track O; the J books for
  Track J) ≥ 75% of the centre's. The unsearched books' per-book N1 figures are reported.

### 11.2 Economics (fixed reference lines; not movable)

- **S_V** = ½·(½·median_V1(DEV net) + ½·p10_V1(DEV net)) ÷ y_DEV + ½·(½·median_V1(VAL net) + ½·p10_V1(VAL net)) ÷
  y_VAL (robust dollars per year; y = sessions ÷ 252).
- **E1** S_V ≥ 0.90 × frozen B5's S_V (same V1 points relative to each centre).
- **E2** centre DEV+VAL net ≥ 0.75 × frozen B5's centre DEV+VAL net.
- Reported reference lines (never pass criteria): 90%, 95% and 100% of frozen B5's centre net (DEV+VAL; FULL W13 and
  W29). A Pareto frontier of S_V vs V1 p90 DD and of centre net vs centre DD over every shortlisted configuration,
  both controls and the Track O comparators.

### 11.3 Final classification (continuous run to 2026-10-29)

A role holder is a **research nomination** iff, in the final stage: **F1** FULL centre minute DD < $35,000; **F2**
joint N1 set C1 on FULL: unique share ≥ 0.90 and p90 < $35,000; **F3** FX net > 0 and C1 median FX net > 0; **F4** no
calendar year > 50% of FULL net. **Marginal** (still nominated, labelled so) if the C1 share is in [0.90, 0.93] or
C2/C3 fail F2. A role holder failing F1–F4 is "not nominated (failed the retrospective stress)"; it is not replaced.

### 11.4 Go / no-go

1. **Qualified robustness improvement** — at least one research nomination.
2. **Partial improvement only** — no nomination, but a shortlisted candidate improves frozen B5's V1 share by ≥ 20
   percentage points or its V1 p90 DD by ≥ $5,000 while failing a hard gate or E1/E2 (or failing §11.3).
3. **No credible improvement** — otherwise. Frozen B5 remains the benchmark; every new configuration stays research-only.

Nothing is merged or deployed; a nomination is a research label for the user's review.

## 12. Deliverables and configurations

`README.md`, `PROTOCOL.md`, `DIAGNOSTIC_CHECKPOINT.md` + `results/diagnostic_manifest.json`,
`BASELINE_AND_B1_B5_AUDIT.md`, `KRE_SENSITIVITY.md`, `JOINT_INTERACTIONS.md`, `DRAWDOWN_EVENT_LEDGER.md`,
`EXECUTION_SENSITIVITY.md`, `ORIGINAL_B5_METHOD_REPRODUCTION.md`, `OPTIMIZATION_SEARCH.md`,
`CANDIDATE_ROBUSTNESS.md`, `RECOMMENDATION.md`, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`, machine-readable
records under `results/`. New configurations only under new names: research phenotypes
`config/research-phenotypes/study6-b5-kre-robustness/D1/<SYMBOL>.json`, research pools
`config/research-pools/study6-b5-kre-robustness/<ID>.json` (every pool lists all five books), run by
`npm run study6 -- pool fixed <ID>` through the unchanged pools engine and report.

## 13. Amendments and disclosures

(none at the time of writing)

**No amendment was made.** No gate, threshold, score, seed, window, budget or role rule changed after the freeze. The
post-diagnostic window of §9.3 was not used. The disclosures below were appended after the final stage
(2026-10-30T23:21Z). None changes a rule or a result.

- **D1.** The first background launch of A3–A7 (22:44Z) failed before starting any process: relative log paths did
  not resolve in the background shell. Nothing ran or was written; it was relaunched at 22:45:30Z.
- **D2.** P4 and R-OM (§8.1) were run before the diagnostic checkpoint, as Track O engineering gates.
  - P4 opened the `diag` door on W23, the original window of the reproduced GDX search.
  - R-OM re-ran the original 2017–2023 KRE search unchanged in a detached worktree.
  - Neither evaluated a new KRE candidate on any study window; both outputs were compared only with the sealed
    records. Both passed.
- **D3.** Track K's WF19 replication produced no candidate. Frozen B5 funds only two lots in 2017–2019, so the §10.2
  "largest lot ≤ 25% of net" filter is unattainable on that window. It is reported as uninformative, and the rule was
  not changed.
- **D4.** The Part A point records' `periods['WF20-SEARCH' | 'WF20-TEST']` are the Study 5 evaluator's windows
  (2017-06-15 → 2019-12-31; 2020–2021). They are not §4's walk-forward folds, and no Part A statistic uses them. Part B
  computes its own periods (`src/study6-b5-kre-robustness/periods.ts`).
- **D5.** Code after the freeze:
  - Part A ran on code identical to the freeze digest: every Part A module hash is equal in `protocol_freeze.json` and
    `diagnostic_manifest.json`.
  - The Part B modules (`search`, `trackK`, `trackJ`, `trackO`, `periods`, `validate`, `final`, `poolrun`) were
    written or completed after the protocol freeze; `validate`, `final` and `poolrun` were placeholders at the
    diagnostic commit and were completed after it. They implement §10–§12 as written.
  - `inspect.ts` (`nbhd`, `trace`, `verify-records`) is post-study tooling that writes no record.
  - `research-configs` was run twice; the second run only made the status text name the failed gates.
- **D6.** An erratum to one sentence of `DIAGNOSTIC_CHECKPOINT.md` (after its commit) is recorded in that file. No
  record or figure changed.
- **D7.** Track J's books came from the §10.4 WDEV rule: KRE + VGT. GDX, the second most important book on the full
  history, was excluded because its 2022 fragility is invisible on development data. This is the expected cost of the
  chronology rule.
- **D8.** The §11.4 decision is "partial improvement only", by the mechanical rule: O-PA-S and O-ME-primary improve the
  V1 p90 by ≥ $5,000. In substance, no candidate approaches the gate (`RECOMMENDATION.md`).
