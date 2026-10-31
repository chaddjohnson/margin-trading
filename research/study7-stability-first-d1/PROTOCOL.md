# Protocol — Study 7: stability-first D1 optimization, GDX standalone, and smaller shared-margin ETF pools

Written 2026-10-31 (UTC) on branch `research/study7-stability-first-d1` (from `418208e`, the Study 6 head),
**before any Phase A diagnostic, any Phase B search, or any evaluation of a new candidate on any window**. The brief is
`brief/ASSIGNMENT.md` (sha256 `53291b3a…`). What was computed before this protocol was written:

1. a throwaway timing script on the training partition (frozen books only, no output kept);
2. the **pre-freeze pilot** `npm run study7 -- pilot` (§8.1): training partition ending 2021-12-31 only; timing,
   memory, the DEV centres of the frozen controls, and the rank precision of 16/32/128-point neighbourhoods for 48
   random plausible centres per track drawn from pilot-only seeds (`results/pilot/pilot.json`, body `07b56738…`, file
   `48a4d580…`; log `results/runlogs/pilot.txt`). The pilot showed that roughly half of random plausible DEV centres
   meet the neighbourhood gate on DEV (G 23/48, VG 23/48, VXR 15/48) — i.e. the gate is not hard *on DEV*; the hard part
   in every earlier study was 2022.

3. pre-freeze **engineering smoke tests** of the code paths only: the optimizer with a tiny budget on fold F19's training
   data (`smoke-search VG`, run three times while fixing two crashes; output in the session scratch directory; the
   only figures seen were the log lines "0/24 rung-1 feasible" and the shortlist IDs) and the evidence/drawdown
   machinery on frozen VG and B1 on the pilot door (pass/fail only). No smoke output is used anywhere.
4. an **independent methodology review** (a fresh agent reading the brief, this draft and the code; findings and
   resolutions in §16) before the freeze.

Every earlier study's published figures are known to the analyst (§4.3). `npm run study7 -- freeze-protocol` records
this file's sha256, time, git state and the code digest in `results/protocol_freeze.json` and refuses a second
freeze; every later change is an amendment appended in §15 with its time and reason.

**Choices made after seeing the pilot (disclosed):** the episodes floor (C3) was 0.75 per year in the draft
constants and was lowered to 0.5 per year because the pilot showed B1 — the sparsest robust control — with 3 DEV
episodes (0.75/yr would require 4); the search-side best-year cap of 75% and the ex-best-year floor (C7) were set after
the pilot showed every frozen control with 56–93% of its DEV net in 2020. No other constant was changed after the
pilot. The constants are mirrored in
`src/study7-stability-first-d1/context.ts`.

## 1. Questions (the brief's priority order) and hypotheses

| # | Question | Decided by |
|---|---|---|
| Q-1 | Is GDX standalone capable of a genuinely profitable, broad, acceptable-risk D1 neighbourhood? If not, how and why does it fail? | Track G (all folds), §10–§11 gates, Phase A GDX controls |
| Q-2 | Do VGT+GDX or VGT+XBI+XRT become historically more stable with the existing frozen phenotypes (full-dimensional and dimension-matched perturbations)? | Phase A (§6) |
| Q-3 | Can neighbourhood-fitness-driven joint pool optimization find strong *and* stable economics, including moderate-profit plateaus? | Tracks VG, VXR (primary), VXRG (secondary) |
| Q-4 | Is VGT `primary` a strong enough standalone control that more standalone VGT optimization adds little, while VGT may differ inside pools? | Track V diagnostic + trigger (§9.5); VGT coordinates of pool finalists |
| Q-5 | Do improvements persist chronologically and under independently reserved perturbations, without another overfit peak? | §10 (folds), §11 (confirmation, final door) |
| Q-6 | Was the extra local computation beneficial? | §8.4 value-of-compute records |

Hypotheses stated now (outcomes are reported against them; none is a gate):

- **H1 (GDX):** a GDX standalone region exists whose 2017–2023 joint N1 neighbourhood passes the gate (≥ 90% below
  $35,000, p90 < $35,000) with economic profit — but a DEV-only (≤ 2021) search cannot find it, because the 2022
  gold-miner bear is invisible on DEV (Study 5's failure mode). Expected: fold M fails at validation; fold L may find
  in-sample-robust regions; their exposed 2024–2026 behaviour is unknown.
- **H2 (frozen subsets):** VG and VXR frozen subsets are more stable than five-book B5 under full-dimensional joint
  perturbation, but part of the difference is the smaller dimension (16/24 vs 40 coordinates); dimension-matched
  designs shrink the gap. Removing KRE need not reduce risk (GDX and XBI re-entries in 2022 remain).
- **H3 (pools):** joint neighbourhood-driven search finds VG/VXR configurations that pass the gate on their training
  window, but DEV-trained ones degrade on 2022–2023 (as Study 6 Track J did).
- **H4 (VGT):** the registered VGT `primary` lies at or near the top of its own neighbourhood; the standalone
  opportunity gap (§9.5) does not trigger.

## 2. What may not change; what varies

### 2.1 Fixed (every stage)

- The D1 rules (`src/app/allIn-trailingBuy-postExitContinuation.ts`, its verified port in
  `src/shared-margin-portfolio/strategy.ts`, the `ShadowBook` of `src/multi-etf-allocator/shadow.ts`), and the
  allocator: one shared funded $100,000 slot, independent shadow books that commit every signal, first executable
  signal wins, same-minute ties alphabetical, a pending reservation holds the slot, no compounding, no preemption, no
  splitting, no sizing, no new filter, stop, priority or overlay.
- Fills: stops fill at the stop or at the gapped open (`stopFill: 'stop'`); the canonical engine's gapped-open and
  hold-exit logic. Interest 11% simple, 365-day year, on the $100,000 principal while a lot is held; costs 5 bps per
  side on each fill, commission 0. Trading friction and interest enter each book's trace (its exits are path
  dependent on them), never subtracted afterwards: a trace is always computed with the run's own settings.
- Arming from 2017-06-15; accounting from the close of 2016-01-04; continuous runs only (no reset or splice).
- Read only: `config/phenotypes/D1/*.json`, `config/pools/*.json`, every earlier study's records, `data/`,
  market events, splits, partitions, distributions (the user's uncommitted edits to `config/market-events/
  distributions.*` are never touched), and the whole prospective system `research/prospective-b4-b5-shadow/`,
  `data/prospective/`, `src/pools/forward/` (§4.4).

### 2.2 The configurations

- **Frozen phenotypes** (the B5 roles; `config/pools/B5.json`): VGT `primary` `d1-ebc9f639b3`, XBI `lowDd`
  `d1-0aabdaab89`, XRT `lowDd` `d1-15c387627c`, KRE `lowDd` `d1-a389037400`, GDX `portfolioAware` `d1-51ea8d4bd6`.
- **Frozen configurations (Phase A, no tuning):** B1 = VGT; VG = VGT+GDX; VXR = VGT+XBI+XRT; VXRG = VGT+XBI+XRT+GDX;
  B5 = all five. Book order is B5's (VGT, XBI, XRT, KRE, GDX).
- **GDX standalone controls (never seeds, never shortlist members):** G-PA `portfolioAware` (B5's GDX book), G-TS
  portfolio-aware Track S vector `d1-68ebf55a55` (Study 5 A-C2), G-SR the d1-standalone-opportunity-audit
  representative (Study 5 A-C3), G-NM1/2/3 the Study 5 near-misses `d1-ac0aaa704c`, `d1-a8e252df46`,
  `d1-143e245fb1` (failed only G2; never nominated), and the GDX books of Study 5's pool searches: G-T1P `d1-18da4e7426`
  and G-T1S `d1-0168b7184b` (Track 1, registered as research phenotypes `s5Track1P/S`; failed PG2; T1-P's FULL DD
  $39,623), G-T2C (`d1-080f388562`, the GDX book of Track 2a's best `T2-s3-coord`) and G-T2P (`d1-9ac33a68f4`, the
  GDX book of `T2-s2-joint` / the DEV-Pareto archive). G-SR is `d1-4f034dc898`. Vectors in `context.ts`
  `gdxControls`; provenance verified by the parity stage (§12, P5) against the sealed Study 5 records. Their status
  labels are carried into every table: in-sample on every window ≤ 2023 for G-PA/G-TS/G-SR; DEV-selected for the
  others.
- **No frozen phenotype, control or earlier candidate is injected into any screen, island, refinement or shortlist of
  any fold** (most were selected with data after the fold's training end); controls are only evaluated beside the
  candidates with the same sets.
- **Searched tracks:** G (GDX alone, 8-D), VG (16-D), VXR (24-D), VXRG (32-D, secondary budget), V (VGT alone,
  diagnostic, §9.5) and VC (VGT standalone challenger, only if the §9.5 trigger fires; its own track key and seeds). In a pooled track all eight registered parameters of every included book vary jointly, and the
  fitness is always the **actual causal funded-pool replay** of the pool; standalone P&L is never summed into pool
  P&L (standalone screens only propose starting points, §8.2).

### 2.3 The space

Only the eight registered D1 parameters vary: X `targetPercentChange`, Y `trailingBuyPercentage`, stop
`trailingStopPercentage`, hold `maximumHoldDays`, L `tickWindowSize`, buffer `intradayLossBuffer`, P `pullback`, W
`continuationWindow` (`src/phenotype/architectures.ts`), on their grid (percentages in tenths of a point; integers
otherwise), inside the unchanged eight-ETF box (`src/multi-etf-d1/context.ts`): X 8.0–30.0%, Y 0.1–5.0%, stop
3.0–15.0%, hold 3–30 calendar days, L 20–250 sessions, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200 sessions. No box is
widened (d1-robust-design-review D9).

## 3. Engine, accounting, metrics

- **Fast path:** `traceBook` (`src/portfolio-aware-d1/trace.ts`) per book and `replayFixedPool` (`replay.ts`),
  imported unchanged; this study's evaluator (`src/study7-stability-first-d1/evaluate.ts`) only builds records.
  **Authoritative:** `runNAllocator` (`src/portfolio-aware-d1/nbook/engine.ts`, the engine of `npm run pools`).
  Parity (§12) must pass before any Phase A statistic is reported.
- **Net** = realized + marked unrealized at the run's last close, after interest and costs; reported with realized
  and unrealized separately; gross = net + interest + costs.
- **Minute DD** = the frozen strict tracker of the strategy mark at every bar of the held lot's symbol, at every exit
  minute and every close, peak from 0 at the run's first session; **daily DD** = closes only. Dollars per $100,000
  slot; **ceiling strictly < $35,000** on the unrounded value. A historical gate, not an enforceable stop and not a
  portfolio-equity percentage.
- **Lots** funded (open ones included); **episodes** = clusters of funded lots, a lot starting a new episode when its
  entry session is more than 10 sessions after the previous lot's exit (independent trade opportunities; March 2020's
  GDX lots are one episode); **lot years** = distinct calendar years with a closed lot; **capital-days** = Σ calendar
  days a lot is held; **net per occupied $100k-year** = net ÷ (capital-days ÷ 365); occupancy = held sessions ÷
  eligible sessions; refusals by decider<holder.
- **Period figures** = attribution inside one continuous run (mark at the period's last close − mark at the close
  before it). Calendar years, half-years, DEV, VAL, FX (2024-01-01 → 2026-10-29), FX13 (→ 2026-10-13), RECENT
  (2026-10-14 → 2026-10-29), M2020 (2020-02-15 → 2020-04-30), R2223 (2022–2023), fold windows.
- **y** (years of a window) = sessions from arming to the window's last session ÷ 252. "Per year" = ÷ y.
- **Best year** = the largest positive calendar-year attribution; **ex-best-year economy** = (net − best year) ÷
  max(1, y − 1).

## 4. Data, exposure and doors

### 4.1 Data

`data/{VGT,XBI,XRT,KRE,GDX}/data.csv` through **2026-10-29** (2,722 NYSE sessions from 2016-01-04): sha256 VGT
`624e4094…`, XBI `83b71f75…`, XRT `c625ca57…`, KRE `fd7ab8aa…`, GDX `134b7450…` (equal to Study 6's audited
files). The prefixes through 2026-10-13 must hash to the B5 pins (`config/pools/B5.json` `regressionAnchors`); the
parity stage recomputes the full and prefix hashes and the session count and fails closed otherwise. Splits
`e5bde427…` (VGT 8:1 on 2026-04-21, forward-adjusted by the shared loader). Time zone America/New_York.

### 4.2 Doors (`src/study7-stability-first-d1/data.ts`; every opening logged to `results/doors.jsonl`)

| Door | Partition, last session | Opened by | Precondition (intrinsic to the key, `gates.ts`) |
|---|---|---|---|
| `pilot`, `smoke-F19` | training, 2021-12-31 / 2019-12-31 | the pre-freeze pilot and smoke tests only | protocol not frozen |
| `parity`, `parity-M`, `parity-F19` | all (any window) / training 2021-12-31 / training 2019-12-31 | the parity stage only (§12) | protocol frozen, parity record not yet sealed |
| `diag` | all, any window | Phase A only (frozen configurations and their perturbation neighbourhoods) | parity passed; closed once the Phase A baseline is sealed |
| `search-F19` / `-F20` / `-M` / `-L` | training, 2019-12-31 / 2020-12-31 / 2021-12-31 / 2023-12-29 | Phase B searches (each fold's own optimizer); fold-L qualification evidence | Phase A baseline sealed and committed (fold-L evidence additionally: every search sealed) |
| `test-F19` / `-F20` / `-M` | training, 2021-12-31 / 2022-12-30 / 2023-12-29 | the fold's test/validation evidence | **every** required Phase B search job sealed (base jobs, Track V diagnostic, Track VC iff triggered) |
| `final` | all, 2026-10-29 (and its W13 truncation) | the final stage, once (`--confirm` repeats it) | every search sealed and `FROZEN_SELECTION.json` exists and verifies |

A search or test door loads the training partition with `access: 'optimization'` and an end date, so no later bar
exists in that process. Fold L has no test door before the final door. A door identity (part of every cache key)
binds the members, partition, first/last session, data sha256, splits sha256 and the distribution-ledger sha256
(the user's uncommitted `distributions.csv` is read, never written; the fixed pool books no distributions).

**Phase A reading embargo.** Phase A records are computed and sealed before Phase B (§6.3) but the analyst does not
read their figures until `FROZEN_SELECTION.json` is sealed (the Phase A logs print only file names and hashes). Phase
A therefore cannot inform any Phase B, validation or selection decision, and any amendment states its exposure.

### 4.3 Exposure (none of 2016-01-04 → 2026-10-29 is unseen)

- 2016–2023 trained every frozen book (VGT programs 2016–2025; XBI/XRT/KRE `lowDd` multi-etf-d1 2017–2023; GDX
  portfolio-aware 2017–2023) and every later D1 study; Studies 5/6 searched DEV and validated on 2022–2023.
- 2024-01-02 → 2026-10-13 was opened for all frozen books, their neighbourhoods (b4-b5 audit, Study 6 W29) and
  Study 5's GDX shortlist. 2026-10-14 → 2026-10-29 (12 sessions) was opened by Studies 5 and 6.
- **The whole program is retrospective.** Nested chronology (§10) is a procedural overfit check inside this study;
  it does not create independent market histories. The analyst knows why earlier candidates failed (2022 GDX/XBI
  re-entries; KRE's 4-day hold in March 2020). Real prospective inference needs post-freeze observations.

### 4.4 The evidence policy (checked against the repository)

- Repository partitions (`data/partitions.json`, README): optimizers read only `training` (≤ 2023-12-31); holdout
  and final are manual evaluation; using them to choose or tune makes them tuning data.
- Precedent (Studies 5 and 6; d1-robust/diverse E3 tier): a study may open 2024 → 2026-10-29 **only through its own
  single predeclared final door, after a sealed selection, as a labelled exposed, block-only diagnostic**. Study 7
  follows exactly this: no optimization, shortlist, role or threshold uses any bar after 2023-12-29; the final door
  can only block (F1–F4, §11.3), never select, rank among alternatives, re-tune or rescue.
- Barred phenotypes of older studies are not run under their names: the d1-diverse finalists and the
  d1-standalone-audit's own representatives are never replayed past 2023 here as those studies' candidates. G-SR is
  run as Study 5 already ran it (its control A-C3), labelled.
- The prospective system (`research/prospective-b4-b5-shadow/`, frozen 2026-10-26) is never modified, run, extended
  or fed: Study 7 writes nothing under `data/prospective/`, adds no challenger, and none of its phenotypes enters any
  prospective measurement.

## 5. Perturbation designs (deterministic; seeds `deriveSeed('study7-stability-first-d1', …labels)`)

### 5.1 Radius and the decisive design

- **Increment r** (Study 5/6, the "±2 step", grid units): X 10 (1.0 pt), Y 2 (0.2 pt), stop 10 (1.0 pt), hold 2
  days, L 10 sessions, buffer 10 (1.0 pt), P 10 (1.0 pt), W 20 sessions.
- **Clip design (decisive everywhere):** Latin hypercube with n strata per dimension, offsets u ∈ [−1, 1]; coordinate
  = centre + round(u × scale × r), clipped to the box. Scale 1 = **N1**. Joint designs span **all coordinates of all
  books of the configuration** (book order × the eight keys); per-book designs span one book's 8 (others at the
  centre). Point construction is Study 6's `pointFromUnits`, unchanged. This is the instrument under which B1 passed
  and B5 failed in Study 6, so every verdict is comparable with those.
- Why this instrument: it is the repository's established gate instrument; d1-robust's ±1 lattice and the b4-b5
  legal-grid LHS are reported comparisons only (the same GDX vector reads 38% or 66% under the two older instruments,
  so the instrument is fixed here, before any outcome).

### 5.2 Sensitivity designs (never decisive; never used in selection)

- **In-box:** the same offsets mapped linearly onto [max(min, c − scale·r), min(max, c + scale·r)] (no point mass on
  a bound).
- **Alternative radii:** scale 0.5 and scale 1.5 (clip).
- **Count-matched (dimension-matched):** only k coordinates move per point (k = 8, i.e. one book's worth; also k = 16
  for three- and more-book configurations); the k coordinates are drawn per point from the configuration's coordinates
  by a seeded shuffle; the others stay at the centre.
- **Norm-matched:** every coordinate moves, at scale √(8/d) (d = the configuration's coordinate count), so the
  expected squared offset in units of r equals an 8-D N1's.
- **Probes:** one parameter at a time at the repository's ±1/±2 probe increments, in-box only.

Clip and in-box are both reported, especially near bounds; neither is presented as independent proof of the other.

### 5.3 Seed families (each family is used for exactly one purpose; offsets never depend on the centre)

| Family | Labels | n | Use |
|---|---|---:|---|
| Phase A | `('A', set, pool, rep)` | 128 / 64 | §6 only |
| Rung 1 | `('r1', track, fold)` | 16 | screen promotion and every GA individual (CRN within the track-fold) |
| Rung 2 | `('r2', track, fold)` | 64 | promotion |
| Rung 3 | `('r3', track, fold)` | 128 | promotion, shortlist |
| Rung 3b | `('r3b', track, fold)` | 128 | T2 variance reduction only (§8.4) |
| Refinement | `('refine', track, fold)` | 64 | local refinement moves |
| Selection | `('select', track, fold, rep)` | 128 × 2 | training-side evidence of the shortlist (never used to pick it) |
| Confirmation | `('confirm', track, fold, rep)` | 128 × 3 | the qualification gates (§11.1) |
| Confirmation alternates | `('confirm-<design>', track, fold, rep)` | in-box 128 × 2; 0.5r, 1.5r, norm 128; count-matched k = 8 128 × 2; per-book 64 | Q2b (in-box), E3 (count-matched), diagnostics |
| Final | `('final', 'final', 'all', rep)` (+ `final-<design>`) | 128 × 3 (+ the same alternates) | the final door (§11.3); the same offsets for every configuration of the same dimension |

No other seed is used; no seed is chosen by its result; no replicate is dropped.

### 5.4 Summaries

Median, p10, p90 (type-7 interpolation), worst, mean; share with minute DD < $35,000 (strict) and its binomial
standard error √(p(1−p)/n); share profitable; medians of lots, episodes and net per capital-year; per-period medians.
The gate statistic uses **unique** vectors (an exact duplicate of an earlier point or of the centre counts once; the
centre is never its own neighbour); pooled sets are de-duplicated across their families, and the unique n is
reported beside every share (a pooled set with fewer than 95% of its nominal points unique is flagged). **Robust profit** = ½·median + ½·p10 of neighbourhood net — a reporting and role
quantity, never the sole objective. Clipping mass per coordinate and bound is reported.

## 6. Phase A — frozen configurations, NO tuning (stage A; sealed; then committed before Phase B)

### 6.1 Sets (door `diag`; windows WDEV 2021-12-31, W23 2023-12-29, W29 2026-10-29)

For each of B1, VG, VXR, VXRG, B5 (frozen):
- centre at base; execution settings cost 0/2/10/20 bps, 8%/14% interest, `next-open` stops, 10/25 bps stop
  slippage (each alone);
- joint N1 clip 128 × 5 replicates (rep 1 decisive for the frozen verdict, reps 2–5 Monte Carlo precision); joint N1
  in-box 128 × 3; joint 0.5r and 1.5r 128 × 2 each;
- per-book N1 clip 64 × 3 for each book;
- count-matched k = 8 (128 × 3) and, for VXR/VXRG/B5, k = 16 (128 × 2); norm-matched (128 × 3);
- probes of each book.
For the GDX controls (G-PA, G-TS, G-SR, G-NM1–3) standalone: centre, execution settings, N1 clip 128 × 5, in-box 128 ×
3, 0.5r/1.5r 128 × 2, probes.

### 6.2 Decomposition and sequence diagnostics (W23 and W29)

- **Book importance** in each joint N1 rep-1–3 point: the point with book b reset to frozen (I_b = share of joint
  breaches removed) and with only book b perturbed.
- **Own-P&L versus funding.** For each joint point: Δnet_pool = Σ_b Δnet_b,standalone + interaction, where
  Δnet_b,standalone is book b's standalone (alone-in-the-pool) net change under its perturbation (shadow traces do not
  depend on the allocator) and the interaction is the change caused by funding/blocking. Reported as medians and
  shares of variance.
- **Funded-trade sequence instability** (joint rep-1 points): per point, the share of the centre's funded lots kept
  exactly (same symbol, entry and exit time), lots displaced, new lots, and the ledger Jaccard; specifically inside M2020 (2020-02-15 →
  2020-04-30) and R2223 (2022–2023): funded lots per book, refusals, re-entries and their net, across the
  neighbourhood.
- **Plateau check:** for each pool, the share and p90 versus B5 under joint, dimension-matched and per-book designs;
  "plateau" is never assumed from removing KRE.
- **Drawdown episodes:** the calendar quarter of each breach's minute-DD trough; the worst-DD decomposition by lot for
  the frozen centres and a representative breach per pool (Study 6's events machinery).

### 6.3 Seal

`npm run study7 -- phase-a-freeze` writes `results/phaseA/baseline_manifest.json` (every Phase A record with its body
and file hashes, the code digest, data hashes), then a local commit. Phase B commands refuse unless that manifest
verifies and is committed. Phase A is descriptive context: it selects no objective, window, budget or ranking (all are
fixed here) and changes nothing in Phase B.

## 7. Phase B — the stability-first objective (active from the first screen)

For a candidate θ (all books of the track) on a fold's training run (2016-01-04 → train end; arming 2017-06-15), with
y = the training window's years:

### 7.1 Eligibility constraints (all on the training window; the same at every rung, evaluated with that rung's design)

| ID | Constraint | Basis |
|---|---|---|
| C1 | centre minute DD < $35,000 | the gate (G-C) |
| C2 | neighbourhood unique share < $35k ≥ 0.90 **and** p90 DD < $35,000 | the gate (G-N1) |
| C3 | centre funded lots ≥ ⌈1.5·y⌉; episodes ≥ ⌈0.5·y⌉; lot years ≥ min(3, calendar years spanned − 1) | guards against 0–1-trade or one-episode solutions; calibrated so that B1 (8 lots, 3 episodes on DEV, the sparsest robust control) is feasible (pilot) |
| C4 | every book of a pooled track funds ≥ ⌈0.4·y⌉ lots at the centre | no inert member (joint-16 / d1-diverse lesson) |
| C5 | neighbourhood median net ≥ $10,000 per year **and** neighbourhood p10 net > 0 | robust profit at least ≈ one year of 11% financing on the notional; profitable lower tail |
| C6 | centre net per occupied $100k-year ≥ $11,000 | the money earned while borrowing at least matches the financing rate again |
| C7 | centre largest lot ≤ 25% of centre net; best calendar year ≤ 75% of centre net; ex-best-year economy ≥ $5,000 per year | bounded dependence on one trade / one exceptional year, and still profitable without it; **one cap for search and every gate window** (§11) |

Violation (0 iff feasible) = Σ of normalized shortfalls: (DD − 35k)⁺/35k + (0.9 − share)⁺/0.9 + (p90 − 35k)⁺/35k +
Σ_count-floors (floor − value)⁺/floor + (10k − median/yr)⁺/10k + (−p10)⁺/(10k·y) + (11k − per-capital-year)⁺/11k +
(top lot share − 0.25)⁺/0.25 + (best-year share − 0.75)⁺/0.75 + (5k − ex-best/yr)⁺/5k, where a centre with net ≤ 0
scores 1 on each of the two share terms.

**Why 75% and not Study 6's 50%:** the frozen controls are dominated by 2020 on every pre-2024 window. DEV 2020 shares
(pilot): B1 66.5%, VG 56.5%, VXR 69.1%, VXRG 72.6%, B5 76.3%, G-NM1 73.1%, G-NM2/3 76.8%, G-SR 76.3%, G-TS 79.9%,
G-PA 93.0%. On the 2017-06-15 → 2023-12-29 gate window B1 itself has 55.6% ($75,296 of $135,359; Study 6
`A5-b1.json`), so a 50% cap would reject the benchmark control. The 75% cap sits on a knife-edge among the known GDX
vectors on DEV (G-NM1 in; G-NM2/3, G-SR out), which is why the ex-best-year floor carries the economic meaning and the
cap's sensitivity (0.65 / 0.75 / 0.85 / none) is reported (§7.4). C6 is set from the financing cost; the controls earn
$58k–$676k per occupied $100k-year, so C6 is not expected to bind and is reported, not relied on.

### 7.2 Objectives (constrained Pareto; all four, none weighted)

o1 = centre net per year (max); o2 = neighbourhood median net per year (max); o3 = neighbourhood p10 net per year
(max); o4 = neighbourhood p90 minute DD (min). Ranking = NSGA-II constrained domination (feasible before infeasible;
infeasible by violation), fast non-dominated sorting, crowding distance; ties by configuration ID. Pass rate is a
constraint (C2); centre DD a constraint (C1); profit appears three ways (centre, median, lower tail), so a near-zero
trading solution cannot win on drawdown alone: it is infeasible under C3–C6 and dominated on o1–o3.

### 7.3 Reported for every finalist (never hidden behind a score)

Centre net, DD (minute, daily), realized/unrealized; neighbourhood median, p10, p90 net; p90 DD; share and SE;
centre/median ratio; lots, episodes, lot years, per-book lots; capital-days, net per capital-year; top lot and best
year shares; ex-best-year economy; per-period figures; bound coordinates. A near-zero centre-to-neighbourhood gap is
never treated as favourable by itself.

### 7.4 Threshold sensitivity (descriptive)

For each track-fold, from the sealed rung-3 records: the feasible-set size and which shortlist picks would change under
activity floors × 0.5, × 1, × 1.5 (C3/C4) and under best-year caps 0.65 / 0.75 / 0.85 / none (C7); and the rank
correlation of lots with share among rung-3 candidates (does low activity buy the risk metric?).

## 8. Multi-fidelity schedule (frozen; values in `context.ts` `schedule`)

### 8.1 Pilot (pre-freeze, training ≤ 2021-12-31; `results/pilot/pilot.json`)

- Load 11.8 s, RSS ≈ 1.4 GB per process (five symbols, DEV). Trace build ≈ 3.7 ms per book on DEV; replay of a pool
  from cached traces 0.8–1.4 ms. One fresh neighbour costs ≈ 4.3 ms (G), 8.3 ms (VG), 13.6 ms (VXR) on DEV; the
  fold-L window costs ≈ 1.45× (sessions).
- Precision (48 random plausible centres per track, Spearman against the 128-point neighbourhood): robust profit
  0.98 / 0.98 / 0.95 at n = 16 (G / VG / VXR), p90 DD 0.95 / 0.96 / 0.94, share 0.95 / 0.92 / 0.95; two independent
  16-point samples agree at 0.97 / 0.96 / 0.93 (robust profit); mean |Δshare| 16 vs 128: 0.03–0.05.
- Rule (decided before the pilot's precision figures were seen, first written here): rung 1 uses n = 16 if the
  median Spearman of robust profit and of p90 DD (16 vs 128) is ≥ 0.8, else 32. It is 0.95–0.98 → **n = 16**. Among close leaders the
  16-point noise is larger (SE ≈ 0.06–0.08 on a share near 0.9), which is why every promotion re-scores with fresh,
  larger samples and the shortlist uses 128 points. The rule's "decided before the figures were seen" is not
  verifiable from the disk record (it was first written here).
- Limits stated now: at n = 16, C2 means "at most 1 breach"; a configuration whose true share is 0.90 is rung-1
  feasible only ≈ 51% of the time and one at 0.80 ≈ 14%, so rung 1 is a coarse filter. The pilot's Spearman figures
  are over random centres and overstate the precision among close leaders. Islands share the r1 offsets (common random
  numbers), so they are independent only in their GA randomness and initial members.

### 8.2 Per track-fold pipeline (one process per track × fold; resumable, §12.4)

1. **Screen (centres only).** Track G and V: 8,192 scrambled-Sobol vectors over the box (`('screen', track, fold)`).
   Pooled tracks: per-book Sobol screens of 4,096 vectors each, evaluated standalone (proposal only); per-book
   plausible = DD < $35k, net > 0, ≥ 2 lots; then 4,096 pool centres combining one plausible vector per book (seeded
   draws) + 1,024 joint Latin-hypercube vectors over the joint box (unbiased coverage; the repository's Sobol stops
   at 16 dimensions). Every pool centre is the funded-pool replay.
2. **Screen plausibility (centres):** C1, net > 0, lots ≥ ½ the C3 floor, every book ≥ 1 lot (pooled). Promotion to
   rung 1: all plausible centres if ≤ 1,024; otherwise 512 by constrained non-dominated rank on (centre net/yr,
   −centre DD, lots) with crowding, then 512 by greedy max-min normalized distance from those already taken (keeps
   low-profit-but-viable diversity).
3. **Rung 1** (n = 16, family r1) for the promoted screen centres.
4. **Islands (NSGA-II, rung-1 fitness).** I = 4 base islands (VXRG 2), each population 64, ≤ 40 generations, ≤ 2,048
   new unique configurations (VXRG 1,536), SBX η 15 (p 0.9), polynomial mutation η 20 (p = 1/d), constrained
   domination on §7; island i is initialized from the rung-1 screen set's members with rank position ≡ i (mod I)
   (64 best of that quarter by constrained domination and crowding), its own seed `('ga', track, fold, i)`; early
   stop after 10 generations without a relative gain > 1e-3 of the island's 2-D feasible hypervolume over (robust
   profit/yr, p90 DD) with reference (0, $35,000) (or, while nothing is feasible, of −min violation). Islands never
   exchange individuals (independent replicates for the saturation test); an extra island k ≥ I added by T1 starts
   from partition k mod I with its own seed. Duplicates of configurations already evaluated anywhere in the job are
   cache hits (identical results), never re-scored differently.
5. **Archive** = every rung-1-evaluated configuration (screen ∪ islands).
6. **Rung 2** (n = 64, family r2): the archive's top 192 by constrained non-dominated rank (rung-1 objectives) and
   crowding, greedily skipping any within normalized L∞ 0.02 of one already taken.
7. **Rung 3** (n = 128, family r3): the rung-2 set's top 48 (rung-2 objectives), distinct 0.03.
8. **Local refinement against neighbourhood fitness:** from the 6 best rung-3 configurations (VXRG 4, V 3; distinct
   0.05),
   ≤ 2 passes; each pass tries every coordinate of every book at the repository's ±1/±2 probe increments (in-box),
   scored with the 64-point refinement family. Accept the best move that keeps all constraints (refinement design),
   does not lower the median or p10 and does not raise the p90 DD, and raises robust profit by ≥ $1,000/yr (from an
   infeasible start: the move with the largest violation reduction ≥ 0.01). A pass with no accepted move stops that
   start. Endpoints are re-scored with rung 3.
9. **Shortlist** (≤ 6; VXRG and V ≤ 4) from rung 3 ∪ refined endpoints, behaviourally deduplicated (identical
   training funded-ledger signature → the better-ranked, then lower ID). F = rung-3-feasible. Picks in order, each at
   normalized L∞ ≥ **0.10** from those taken (≈ 1–2.5 r per coordinate, so "distinct" finalists are not inside each
   other's N1; otherwise the next best by the same criterion): (1) *profit* = max robust profit/yr (ties lower p90,
   then ID); (2) *robust* = max share (ties lower p90) among F with median ≥ 50% of pick 1's; (3) *balanced* = max
   robust profit/yr ÷ p90 DD (ties lower p90); (4) *centre* = max centre net/yr (ties lower p90); then the rung-3
   constrained Pareto order of F (fronts, crowding). If F is smaller than the cap, the least-violating infeasible configurations
   fill the list, labelled `infeasible on training` (they are carried for diagnosis and cannot qualify).
10. **Selection evidence** (families select 1–2, 128 each, training window) for every shortlist member and the
    track's controls (frozen subset of the same pool; B1; for Track G the GDX controls). Sealed with the shortlist
    (`results/phaseB/<track>/<fold>/search.json`) before any test door opens.

### 8.3 Budgets (base, per track-fold) and expected cost

| Track | Screen centres | R1 cap | Islands × new | R2 / R3 | Refine starts | Shortlist |
|---|---:|---:|---:|---:|---:|---:|
| G | 8,192 Sobol | 1,024 | 4 × 2,048 | 192 / 48 | 6 | 6 |
| VG | 2 × 4,096 per-book + 4,096 combos + 1,024 LHS | 1,024 | 4 × 2,048 | 192 / 48 | 6 | 6 |
| VXR | 3 × 4,096 per-book + 4,096 combos + 1,024 LHS | 1,024 | 4 × 2,048 | 192 / 48 | 6 | 6 |
| VXRG | 4 × 4,096 per-book + 4,096 combos + 1,024 LHS | 1,024 | 2 × 1,536 | 192 / 48 | 4 | 4 |
| V (diagnostic) | 8,192 Sobol | 512 | 1 × 2,048 | 96 / 24 | 3 | 4 |
| VC (only if triggered) | 8,192 Sobol | 1,024 | 4 × 2,048 | 192 / 48 | 6 | 6 |

Expected single-core time per track-fold on DEV: G ≈ 15 min, VG ≈ 30
min, VXR ≈ 60 min, VXRG ≈ 60–80 min; fold L ≈ 1.45×. Folds F19, F20, M, L × tracks G, VG, VXR, VXRG = 16 jobs (+ V
in M and L) run as parallel processes (≤ 14 concurrent; 16 CPUs, ≈ 1.5 GB each).

### 8.4 Training-only extra-compute triggers (mechanical; never caused by any test, validation or final result)

- **T1 (island saturation):** after the base islands, if the last island raised the union feasible hypervolume (§8.2
  step 4) by ≥ 10% (or, with nothing feasible, lowered the minimum violation by ≥ 25%), run 2 more islands; repeat
  until the criterion fails or 8 islands (VXRG 4) have run. More islands = more searched candidates (more
  multiplicity), reported as such.
- **T2 (ranking within Monte Carlo uncertainty):** if the two best rung-3-feasible configurations by robust profit
  differ by less than the larger of their bootstrap standard errors (2,000 resamples of their 128 points), every
  rung-3-feasible configuration among the top 8 by robust profit is re-scored with the r3b family (128 more points;
  256 pooled) and the shortlist uses the pooled 256-point figures. This is variance reduction around fixed
  candidates (no new candidate).
- **T3 (coverage of distinct profitable regions):** if the rung-2-feasible set has fewer than 2 distinct regions
  (greedy clusters at normalized L∞ ≥ 0.10) while the rung-1-feasible set has ≥ 3, the best rung-1 representative of
  each unrepresented region (≤ 16) is promoted to rung 2 and continues through the pipeline.
- **Stop rules:** a track-fold stops when its base schedule and any triggered extension are done. If nothing is
  rung-1-feasible after all islands, the pipeline still runs rungs 2–3 on the least-violating configurations for
  diagnosis and labels the track-fold **no eligible region**.
- **Value of compute (reported, §OPTIMIZATION_AND_COMPUTE.md):** per island the hypervolume increment; rung-1 → 2 → 3
  → selection → confirmation decay of the shortlist's figures; T2's rank changes; whether added islands changed the
  shortlist; CPU time per stage. More trials versus more information are labelled separately.
- **Multiplicity:** every evaluated configuration is counted per track-fold and in total; the effective search
  dimension (8/16/24/32) is stated beside every result.

## 9. Track specifics

### 9.1 Track G (GDX standalone; mandatory, full effort)

8-D, GDX alone in the fixed $100,000 slot. Controls G-PA, G-TS, G-SR, G-NM1–3 are evaluated with exactly the same
fitness and sets (labelled controls). The GDX finalist list keeps genuinely distinct regions only (§8.2 step 9).
Reports: why earlier high-centre GDX candidates failed (their neighbourhood breach quarters, the 2022 re-entry
sequence), and whether any region passes on 2017–2023 (fold L) — H1.

### 9.2 Track VG and 9.3 Track VXR (primary emphasis)

Joint 16-D / 24-D. VGT's parameters vary jointly with the others. Reported beside them: the frozen subset of the same
pool (Phase A), B1, and, for VG, whether a stable standalone GDX region (Track G) translates into a stable funded pool
(the VG finalists' GDX coordinates versus the Track G finalists'; their per-book GDX N1 inside the pool).

### 9.4 Track VXRG (predeclared secondary)

Joint 32-D with the reduced budget of §8.3. A full candidate track (it can qualify and be nominated).

### 9.5 Track V (VGT standalone diagnostic) and its trigger

- VGT `primary` (B1) is a frozen control everywhere. Track V runs the §8.2 pipeline with the diagnostic budget in
  folds M and L only.
- **Trigger (fold M, training only):** the full challenger track **VC** runs (its own track key, hence its own seeds;
  the base budget; all four folds; its candidates validated and eligible like any other) **iff** some Track V fold-M
  shortlist member has, on the selection sets (select 1–2 pooled), robust profit per year ≥ 1.25 × VGT `primary`'s
  and p90 DD ≤ `primary`'s + $2,000. Order: the Track V diagnostic runs with the first batch; the trigger is read from
  its sealed fold-M record; if it fires, the four VC jobs run and are sealed before any test door opens (the test
  doors require them). VC is counted in the multiplicity totals. VGT `primary` is in-sample through 2025 (VGT
  programs) wherever it is used as a reference (the trigger, E3, tiers, bootstraps).
  Otherwise the diagnostic candidates are reported, never validated or nominated, and the report states that further
  standalone VGT optimization was not warranted (and why).

## 10. Phase D — chronology, nested walk-forward and validation evidence

### 10.1 Outer folds (expanding, all continuous from 2016-01-04)

| Fold | Training (search door) | Test (after every search is sealed) | Role |
|---|---|---|---|
| F19 | → 2019-12-31 | 2020-01-01 → 2021-12-31 (`test-F19`) | procedure evidence |
| F20 | → 2020-12-31 | 2021-01-01 → 2022-12-30 (`test-F20`) | procedure evidence |
| M | → 2021-12-31 (DEV) | 2022-01-01 → 2023-12-29 (`test-M`; VAL) | **Class M** nominations |
| L | → 2023-12-29 | 2024-01-02 → 2026-10-29, only through the final door (block-only) | **Class L** nominations |

Each fold runs its own optimizer (§8) and freezes its own shortlist from its training window only. Feasibility: the
pilot shows ≥ 3 DEV episodes for every frozen control; for F19 (2.5 years) the floors scale with y (lots ≥ 4,
episodes ≥ 2, lot years ≥ 2) and the fold is reported as **insufficient evidence** if nothing is feasible or its test
has fewer than 3 funded lots — never by weakening a gate. Test windows overlap across folds (F20's 2022 = M's
first test year); each fold's test is after its own training.

### 10.2 Evidence per shortlisted candidate (folds F19, F20, M on their test doors; fold L on its search door)

On the continuous run to the fold's evaluation end E (F19 2021-12-31, F20 2022-12-30, M 2023-12-29, L 2023-12-29):
centre at base and under the stresses (10 bps, 14%, `next-open`, 25 bps slippage); confirmation sets 1–3 (joint N1
clip, 128 each, pooled 384 unique); alternates (in-box, 0.5r, 1.5r, count-matched k = 8, norm-matched; 128 each);
per-book N1 (64 per book); training-window and test-window attribution of the centre and of every neighbour (a period
the run covers only partly is labelled `~partial`, never reported as complete); and the **funded-sequence
diagnostics** on confirmation set 1: per neighbour the share of the centre's funded lots kept exactly, the ledger
Jaccard, displaced and added lots, the own-P&L versus funding interaction (Δnet_pool − Σ_b Δnet_b,standalone), and
lots/kept/net inside M2020 and R2223. Predeclared reporting flag **sequence-dependent** (pooled tracks): median
Jaccard < 0.5 and the neighbours with Jaccard < 0.5 have median net < 50% of the centre's. The same evidence for the
controls (B1, the frozen subset of the same pool, B5; GDX controls for G). PBO by CSCV (`src/d1-robust/pbo.ts`) over
the track-fold's 64 best rung-2 configurations (feasible first, then rung-2 robust profit, then ID), using half-year
attribution blocks of 2018H1 → E (an even number of blocks, the earliest dropped if needed). Shortlist training →
test decay; the rank correlation of training robust profit with test median. Reported (never gates): the candidates'
VAL figures against the frozen subset's and B1's.

## 11. Gates, roles and the final classification (fixed now)

### 11.1 Qualification (folds M and L; on the run to E = 2023-12-29; 5 bps; 11%)

- **Q1** centre minute DD (2017-06-15 → E) < $35,000.
- **Q2** confirmation sets 1–3 pooled (≈ 384 unique): share < $35k ≥ 0.90 **and** pooled p90 DD < $35,000. Reported
  beside it: the one-sided 95% Wilson lower bound, each set's own verdict, and the expected number of false passes
  across all Q2 tests (at n = 384 a true 0.88 passes ≈ 11%, a true 0.87 ≈ 4%).
- **Q2b** (boundary guard) if any coordinate of the candidate lies within r of a box bound: the in-box confirmation
  (2 × 128 pooled) also has share ≥ 0.90 and p90 < $35,000 (clipping folds half of a bound coordinate's offsets onto
  the bound, which can flatter or harm a bound-hugging centre).
- **Q3** (fold M only) centre VAL net > 0 and pooled confirmation median VAL net > 0.
- **Q4** best calendar year ≤ 75% of the centre's net on the run and ex-best-year economy ≥ $5,000 per year (C7's
  single cap; §7.1).
- **Q5** activity on the run: lots ≥ ⌈1.5·y_E⌉, episodes ≥ ⌈0.5·y_E⌉, lot years ≥ 3, every book ≥ ⌈0.4·y_E⌉ lots.
- **Q6** largest lot ≤ 25% of the centre's net on the run.
- **Q7** centre net > 0 and DD < $35,000 under each stress.
- **Q8** plateau: pooled confirmation median training-window net ≥ 60% of the centre's training-window net.
- **E1** pooled confirmation median net ≥ $10,000 per year of the run, and pooled confirmation p10 net > 0.
- **E2** centre net per occupied $100k-year ≥ $11,000.
- **E3** (pooled tracks) not Pareto-dominated by frozen B1 on (median net per year, p90 DD) under the
  **count-matched k = 8** confirmation design (2 × 128 pooled; B1's 8-D design under the same labels), so the
  comparison is dimension-matched; the full-dimensional comparison is reported beside it. The one-book control is the
  opportunity cost of a shared slot (B1 is in-sample through 2025, which favours it).
- Folds F19/F20: the same gates (with their E and Q3 on their test window) are computed and reported; they never
  qualify a candidate.
- A candidate labelled `infeasible on training` cannot qualify. **Marginal** (still qualified, labelled) if the pooled
  share is in [0.90, 0.93] or any single confirmation set fails Q2.

### 11.2 Roles (per track × path M/L; none forced; ≤ 3) — ordered by training data only

Each role has a **training-side order** from the selection families (select 1–2 pooled, the fold's search door
only): (i) **profit**: robust profit per year (ties lower p90, then ID); (ii) **robust**: share (ties lower p90, then
ID) among candidates whose training median is ≥ 50% of the profit holder's; (iii) **balanced**: robust profit per year
÷ p90 DD (ties lower p90, then ID). The role goes to the **first qualified** candidate in its order that holds no
other role and is at normalized L∞ ≥ 0.10 from the holders already taken; otherwise it is omitted. Validation and
confirmation are a pass/fail veto only, never a ranking. Roles, the qualification tables, all shortlists, the tiers
and the ranked list (§11.4) are sealed in `FROZEN_SELECTION.json` before the final door opens.

### 11.3 Final stage (final door, once; `--confirm` may repeat it deterministically)

On the continuous full history (W29, and W13 for the anchor) for every role holder, every fold-M/L shortlist member
(centre only), and the controls (B1, B5, VG/VXR/VXRG frozen, GDX controls): FULL, DEV, VAL, FX, FX13, RECENT, years;
costs 0/2/5/10/20 bps; 8/11/14%; `next-open`; 10/25 bps slippage; arming shifts (2017-12-15, 2018-06-15); final sets
1–3 (joint N1 clip, 128 each) and per-book N1 (64) and alternates (in-box, 0.5r, 1.5r, count/norm-matched, 128) for
role holders and controls; leave-one-year-out; concentration; worst-drawdown decomposition; funded-ledger
reconciliation (realized + unrealized = net; Σ lots = net); paired stationary block bootstrap (block 21, 5,000) of
daily mark differences role holder − B1, − B5 and − the frozen subset of the same pool, over FULL and FX.

A role holder is a **research nomination** iff **F1** FULL centre minute DD < $35,000; **F2** final sets 1–3 pooled
share ≥ 0.90 and pooled p90 < $35,000 on FULL (**F2b**: also the in-box final pair when a coordinate is within r of a
bound); **F3** FX centre net > 0 and pooled final median FX net > 0; **F4** best calendar year ≤ 75% of FULL net and
ex-best-year economy ≥ $5,000 per year. **Marginal** (still nominated, labelled) if the pooled share is in [0.90,
0.93] or any single final set fails F2. A role holder failing F1–F4 is "not nominated (blocked by the retrospective
stress)"; it is not replaced and nothing is re-ranked (the order sealed in §11.4 stands; the final door adds a flag
per candidate). Passing F3 is weak evidence: 2024–2026 was inspected for GDX and VGT books before, and VGT `primary`
was selected with 2024–2025 data. Class M nominations rest on DEV selection plus 2022–2023 validation; **Class L** nominations rest
on in-sample selection over 2017–2023 plus a block-only check on the exposed 2024–2026 window — weaker, and labelled
so.

### 11.4 Ranking and go/no-go

- **Tier "strong"** if the role holder's pooled-confirmation robust profit per year on the run to 2023-12-29 ≥ B1's on
  the same run (B1 with its own confirmation sets); otherwise **"modest"**. Within a tier: that robust profit per
  year, ties lower p90, then ID. Tier and rank use **only sealed figures ending 2023-12-29** (fold L's are in-sample,
  labelled) and are sealed in `FROZEN_SELECTION.json`; FULL and FX figures are reported descriptively only. The study's
  **mechanical nomination** is this sealed ranked list restricted to the role holders the final door does not block
  (possibly empty); the analyst's evidence-weighted assessment is reported separately in `RECOMMENDATION.md`.
- **Outcomes:** (1) *qualified stability-first improvement* — ≥ 1 nomination; (2) *stable-but-weaker only* — a
  candidate passes every risk gate (Q1, Q2, Q7, F1, F2) but fails an economic or chronological gate; (3) *no
  candidate qualified* — otherwise. Frozen B1 and B5 remain the benchmarks in every case; nothing is merged,
  deployed or added to the prospective system. A no-nomination result does not trigger any rule change, later
  search, extra validation look or relaxed gate.

## 12. Engineering gates (stage `parity`, after the freeze, before Phase A; any failure stops the study)

- **P1** replay = full N-book engine (lots, signals, virtual trades, daily rows, both drawdowns, net) for B1, VG, VXR,
  VXRG, B5 and GDX alone (G-PA, G-NM1) at 0/5/10 bps on W23 and W29; 8 random joint perturbations each of VG, VXR,
  VXRG at 5 bps on W29; VG and VXR frozen at 8%, 14%, `next-open`, 25 bps slippage on W29: **0 differences**.
- **P2** this study's records = the Study 5 evaluator's metrics (net, minute/daily DD, lots) on the P1 configurations.
- **P3** `npm run pools -- fixed B5 --end 2026-10-13` = $486,207.77 / $26,509.97 / 94 lots, and this evaluator equals it
  on W13; the W29 figures equal Study 6's sealed A2 ($484,636.97 / $26,509.97 / 95 lots) and A5 (B1 $176,260 /
  $19,534).
- **P4** data hashes and the 2026-10-13 prefixes (§4.1); session count 2,722.
- **P5** GDX control provenance: the vector IDs of G-PA, G-TS, G-NM1–3 equal the recorded IDs; their DEV centre net
  equals Study 5's sealed validation records; the frozen grids equal `config/phenotypes/D1/*.json` and B5.json.
- **N1 no-lookahead:** for 12 random vectors per symbol and 6 random pools, every trade and funded lot closed by
  2021-12-31 on the `search-M`-equivalent truncated run equals the full-history run's, and the daily marks agree
  through 2021-12-31 (a truncated run never sees a later bar; the full run's past never depends on the future).
- **C1 cache invalidation:** the trace key changes with cost, rate, stop fill, slippage, arming date, window end and
  data hash; the point-cache header refuses another door identity or engine hash; 200 random cached records equal a
  fresh recomputation.
- **D1 determinism and restart:** a reduced-budget job on the `parity-F19` door run twice from empty caches gives
  identical sealed outputs; a third run stopped after 3,000 fresh points and resumed gives identical outputs (records
  kept under `results/parity/restart/`, never used as research evidence).
- **G1 door order:** during the parity stage, `diag`, `search-M`, `search-L`, `test-M`, `final` and `pilot` all refuse
  to open.
- **Tests:** `src/study7-stability-first-d1/tests/*.test.ts` (design determinism, clip/in-box/count/norm designs,
  violation and constrained domination, shortlist rules, doors refusing out-of-order access) pass; `tsc --noEmit`
  clean; the inherited suite is run only in a data-less worktree (repository memory: `npm test` reads post-2023 bars
  when `data/` is present).

### 12.4 Checkpoints and resumption

Each job appends every point record to `results/cache/<job>.jsonl` (git-ignored; header binds the door identity and
engine hash). A restarted job re-executes its deterministic pipeline from the start; every evaluation already done is
a cache hit, so the trajectory, archive and outputs are identical. Completion markers are the sealed stage records;
the orchestrator (`scripts/run_jobs.sh`) skips jobs whose sealed record verifies.

## 13. Deliverables and configurations

`README.md`, `PROTOCOL.md`, `BASELINES_AND_FIXED_SUBSETS.md`, `GDX_STANDALONE.md`, `VGT_CONTROL_AND_ROLE.md`,
`OPTIMIZATION_AND_COMPUTE.md`, `NEIGHBORHOOD_ROBUSTNESS.md`, `WALK_FORWARD_AND_VALIDATION.md`, `TRADE_SEQUENCING.md`,
`EXECUTION_AND_INTEGRITY.md`, `RECOMMENDATION.md`, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`, `FROZEN_SELECTION.json`,
machine-readable records under `results/` (all candidates evaluated per track-fold as compact CSV/JSONL, shortlists,
confirmation records with hashes, ledgers of role holders and controls). New configurations only under new names:
`config/research-phenotypes/study7-stability-first-d1/D1/<SYMBOL>.json` and
`config/research-pools/study7-stability-first-d1/<ID>.json`, labelled research only, runnable through the unchanged
pools engine.

## 14. How this study differs from the earlier neighbourhood-driven studies

| Earlier study | What it did | What failed | Study 7 difference |
|---|---|---|---|
| Study 5 (GDX, B5 three-ETF) | NSGA-II on centre net/DD; neighbourhood only at validation | 0/32 GDX shortlist passed G2; 2022 bear | neighbourhood fitness from the first rung; fold L trains through 2022–2023; GDX near-misses kept as controls |
| Study 6 (KRE in B5) | one-book changes inside a 40-D pool; rung 1 promoted by centre net | joint 40-D gate unattainable; DEV blind to 2022 | 2–4-book pools, every book jointly searched; promotion by constrained Pareto on neighbourhood objectives |
| d1-robust / d1-diverse | 61-ETF pools; scalar robust score S; ±1 lattice; walk-forward random-control gate | G-WF / GP failed; shortlist chaining; inert members | fixed small universes; constrained Pareto (no single scale-dependent score); inert-member floor C4; distinct-region rule without single linkage |
| joint-16-etf-d1 | 128-D mask+vector NSGA-II; centre objectives; clamped joint perturbations | T6 0/20; peaks | ≤ 32-D; neighbourhood objectives; T6-like plateau only as a gate (Q8) |
| vgt-d1-refinement / VGT studies | VGT local search | D1 is the top of a smooth hill; "do not re-run a global search on VGT" | B1 frozen; standalone VGT only as a triggered diagnostic |
| multi-etf-d1 / portfolio-aware | one-parameter probes; centre NSGA-II | ridges, not plateaus | joint N1 decisive; probes reported only |

## 15. Amendments and disclosures

After the freeze this file is never edited. Amendments and disclosures go to the append-only `AMENDMENTS.md` (each
entry with its UTC time, reason, exposure statement and the sha256 of the log after the entry).

## 16. Independent methodology review (before the freeze) and its resolution

A fresh agent reviewed the brief, the draft protocol and the draft code (2026-10-31 ≈ 23:00–23:30Z, read-only). Findings and
resolutions (all resolved before the freeze):

| Finding | Resolution |
|---|---|
| C-1 tier/ranking used FULL (2024–2026) | tier and rank from sealed figures ending 2023-12-29 (§11.4) |
| C-2 roles chosen by confirmation/VAL figures | roles ordered by training-side selection families; confirmation is a veto only (§11.2) |
| C-3 code had episodes 0.75/yr | code = 0.5/yr; a unit test asserts every eligibility constant |
| M-1 Q4's 50% cap fails B1 on the gate window | one 75% cap + ex-best-year floor for search and every gate (§7.1, Q4, F4) |
| M-2 75% cap on a knife-edge | disclosed (§7.1); cap sensitivity reported (§7.4) |
| M-3 Study 5 Track 1/2a GDX vectors missing | added G-T1P, G-T1S, G-T2C, G-T2P; G-SR ID verified (§2.2, P5) |
| M-4 clip gate gameable at bounds | Q2b/F2b in-box guard for near-bound candidates |
| M-5 E3 dimension-mismatched | E3 under count-matched k = 8; full-D reported |
| M-6 no sequence evidence for finalists | funded-sequence diagnostics and a predeclared flag (§10.2) |
| M-7 door preconditions optional | intrinsic per door key (`gates.ts`), G1 test (§12) |
| M-8 final door could re-rank | ranked list sealed before; final door flags only (§11.3) |
| M-9 Phase A W29 seen before Phase B | Phase A reading embargo until the selection freeze (§4.2) |
| m-1 pooled sets not de-duplicated | pooled unique across families; n reported (§5.4) |
| m-2 partial periods | `~partial` keys (§10.2) |
| m-3 W13 missing | added |
| m-4 cache identity gaps | door id binds splits and distribution ledger; engine hash covers the loaders |
| m-5 strict test on rounded DD | DD stored unrounded; strict comparisons |
| m-6/m-7 schedule and VC gaps | per-track overrides in `context.ts`; VC key, order and multiplicity (§9.5) |
| m-8/m-9 precision statements | §8.1 limits; Wilson bounds and expected false passes (Q2) |
| m-10 distinctness ≈ one radius | shortlist and roles at L∞ ≥ 0.10 |
| m-11 Q3 weak; B1 in-sample | VAL comparisons reported; B1's in-sample status labelled |
| m-12 C6 never binds | acknowledged (§7.1) |
| m-13 control injection | explicitly forbidden (§2.2) |
| m-14 amendments inside the frozen file | separate `AMENDMENTS.md` (§15) |
| m-15 PBO set, tie-breaks, rule provenance | defined (§10.2, §8.2, §11.2); rule provenance labelled (§8.1) |
