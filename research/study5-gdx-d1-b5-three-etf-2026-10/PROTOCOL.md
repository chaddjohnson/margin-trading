# Protocol — Study 5: GDX standalone D1 phenotypes, and B5 restricted to VGT/KRE/GDX

Written 2026-10-30 on branch `research/study5-gdx-d1-b5-three-etf` (from `23e55a0`), **before any Study 5 candidate
vector was evaluated on any period**. What had been computed before this protocol: the data audit
(`DATA_AUDIT.md`), the descriptive dip counts (`results/data-audit/dip-episodes.txt`), and one engine benchmark that
printed two control figures on the development window (the frozen three-ETF ablation C3: $203,452.75, minute DD
$26,509.97, 39 lots; the frozen GDX `portfolioAware` book alone: $103,647.72, $17,280.74, 6 trades). Every earlier
study's published figures are known to the analyst (§3.3). `npm run study5 -- freeze-protocol` records this file's
sha256, time and git state in `results/protocol_freeze.json` and refuses a second freeze; any later change is an
amendment appended in §11 with its time and reason. The constants below are mirrored in
`src/study5-gdx-b5-three-etf/context.ts`.

## 1. Questions, scope and what may not change

- **Study A.** Which D1 phenotypes on GDX alone (fixed $100,000 per entry) give high net P&L after 11% margin interest
  and 5 bps per side with a minute-sampled maximum drawdown strictly below $35,000, inside broad, stable parameter
  regions, under chronological validation?
- **Study B.** With the eligible universe restricted to **VGT, KRE and GDX** (XBI and XRT excluded everywhere), what is
  (B-i) the effect of the exclusion alone (frozen B5 books, no retuning), (B-ii) the frozen B5 optimization method
  re-run on the restricted universe (Track 1), and (B-iii) supplemental staged/joint and robust-plateau optimization of
  all three books (Track 2) — and is any restricted pool safe enough to nominate?
- **Unchanged, everywhere:** the D1 rules (`src/app/allIn-trailingBuy-postExitContinuation.ts` and its verified port
  `src/shared-margin-portfolio/strategy.ts` / `ShadowBook`), the allocator (one shared funded slot, shadow books, first
  executable signal wins, same-minute ties alphabetical, no compounding), fills (stops at the stop or the gapped open,
  `stopFill: 'stop'`), interest (11% simple, 365-day year, on $100,000 principal), costs (5 bps per side, commission 0),
  arming from 2017-06-15, accounting from the close of 2016-01-04. Only the eight registered D1 parameters vary, on
  their grid, inside the eight-ETF box (§4.1). No new rule, indicator, conditional stop, discretionary exit, per-trade
  exception, margin policy, enable/disable switch or tie rule. The frozen phenotype files, `config/pools/B4.json`,
  `config/pools/B5.json`, every sealed record of earlier studies, `data/` and the market-event files are read only.
- **Out of scope:** the 20% VOOG/VGT portfolio mode (the brief's objective is the fixed $100,000 pool; VOOG was not
  appended); live or paper orders; broker access.

## 2. Engine and accounting

- **Search engine (fast path):** each book's virtual-trade trace (`traceBook`, `src/portfolio-aware-d1/trace.ts`) and
  the causal fixed-pool replay (`replayFixedPool`, `replay.ts`), both unchanged. A standalone GDX result is the
  one-book replay (the book alone in a $100,000 pool); a pool result is the multi-book replay.
- **Authoritative engine:** `runNAllocator` (`src/portfolio-aware-d1/nbook/engine.ts`) — the engine of
  `npm run pools`. **Parity gates before any selection (P1–P4, §9):** replay = full engine on every compared field for
  the controls and sampled candidates; the standalone replay at 0 bps = the D1 app runner
  (`npm run app -- allIn-trailingBuy-postExitContinuation GDX …`); frozen B5 through 2026-10-13 = $486,207.77 / minute
  DD $26,509.97 (`npm run pools -- fixed B5 --end 2026-10-13`). Every nominee is re-run on the full engine.
- **Metrics (5 bps unless stated).** Net = realized + marked unrealized, after interest and costs. Minute DD = the
  frozen strict tracker of the strategy mark at every bar of a held lot's symbol, every exit minute and every close;
  daily DD = closes only; both in dollars and as % of the $100,000 allocation (never interchanged). Trades = closed
  trades (standalone) or funded lots (pool). Period attribution = mark at the period's last close − mark at the close
  before it, **inside one continuous run** ("chained"). An **isolated** run (flat start at the period's first session,
  observational warm-up of the lookback from earlier sessions) is labelled "isolated" wherever shown.

## 3. Data, periods, doors and exposure

### 3.1 Data

`data/{GDX,VGT,KRE}/data.csv` (and XBI/XRT for the five-ETF control only) as audited in `DATA_AUDIT.md`: 2,722
sessions 2016-01-04 → **2026-10-29**; the user's append of 2026-10-30 added 12 sessions after 2026-10-13 and changed
no earlier byte (prefix hashes = the frozen B5 pins). The latest verified bar is used; nothing is truncated "by habit".

### 3.2 Periods (New York dates; all inside one continuous run unless labelled isolated)

| Label | Sessions | Role |
|---|---|---|
| WARM | 2016-01-04 → 2017-06-14 | observational only (lookbacks; no arming) |
| **DEV** | 2017-06-15 → 2021-12-31 (≈ 4.55 years) | the only data any search, shortlist or step decision reads |
| **VAL** | 2022-01-03 → 2023-12-29 (2 years) | model selection among predeclared shortlists and plateaus; never searched |
| **FX** | 2024-01-02 → 2026-10-13 | **previously exposed final evaluation / retrospective stress test** — opened once, after the freeze |
| **RECENT** | 2026-10-14 → 2026-10-29 (12 sessions) | the appended bars, never read by any study; reported separately as a very short slice, not validation |
| FULL | 2017-06-15 → 2026-10-29 | descriptive replay; never a selection criterion |

Boundary choice: DEV holds the 2018 decline, the 2019–2020 rally, the COVID crash and rebound and the 2020–2021
gold-miner decline; VAL holds the 2022 bear (GDX −46% April → September 2022) and the 2023 recovery, regional-bank
stress (KRE) and the August–October 2023 sell-off. Dips deep enough to arm the frozen GDX/KRE books (≥ 25% below an
L-session high) number about 1–5 in DEV and 1–2 in VAL (`results/data-audit/dip-episodes.txt`): **validation rests on
a handful of independent episodes per ETF** and cannot establish statistical significance; it can only reject
fragile candidates. The boundaries are those of the earlier fold-b design (train → 2021-12-31, validate 2022–2023;
`d1-robust`, `d1-ranked-preemption`), reused rather than tuned.

**Walk-forward replication (WF20, procedure evidence, not a gate):** the Study A pipeline (§5) and Track 1's Track P
(§6.2) are re-run with the search ending 2019-12-31 and evaluated on 2020-01-02 → 2021-12-31, reporting how the
procedure's picks generalize. WF20 never feeds the main selection.

**Boundary treatment.** Runs are continuous from 2016-01-04: positions, setups, stops, continuation windows,
reference highs, interest and drawdown peaks carry across every boundary (nothing is reset in a chained run). A DEV
search run is a run *truncated* at 2021-12-31 (an open position is marked at that close; a trade resolving later is
never seen by the search). VAL figures come from the run truncated at 2023-12-29. Positions open at a boundary are
reported with the period that marks them.

### 3.3 Doors (enforced in `src/study5-gdx-b5-three-etf/data.ts`; every opening logged to `results/doors.jsonl`)

| Door | Sessions read into a strategy result | Who may open it |
|---|---|---|
| `search-wf20` | ≤ 2019-12-31 | WF20 search stages |
| `search` | ≤ 2021-12-31 | DEV searches, shortlists, step decisions; WF20 tests |
| `validation` | ≤ 2023-12-29 | validation and selection stages (Study A §5.5–5.7, Study B §6.4) |
| `final` | every row (≤ 2026-10-29) | only after `FROZEN_SELECTION.json` exists and its body hash verifies |
| `control` | ≤ 2026-10-13, frozen B5 (C5) only | the regression gate P3 (figures already published) |

The search and validation doors load the repository's `training` partition with `access: 'optimization'` and an end
date (`loadNUniverse`), so no bar after the door's end exists in the process's arrays.

### 3.4 Exposure audit (what was already looked at; full table in `RECOMMENDATION.md` appendix)

- **2016–2023** was the training window of every earlier D1 study. The frozen B5 books are in-sample there: VGT
  `primary` (VGT programs 2016–2025), KRE `lowDd` (multi-etf-d1, 2017–2023), GDX `portfolioAware` (portfolio-aware-d1,
  2017–2023). Studies d1-robust/diverse/ranked-preemption, Study 1, Study 2 and Study 4 searched GDX/KRE inside
  2016–2023 with folds ending 2020-06-30 / 2021-12-31. **VAL is therefore clean only relative to Study 5's own search**,
  not unseen data: the analyst knows prior results there (e.g. Study 2: the B5 GDX book −$15.7k in 2020-07 → 2021-12,
  +$58.2k in 2022–2023). Any control whose vector was chosen with 2022–2023 data (C3, C5, the B5 GDX book, the
  portfolio-aware S-vector, the earlier standalone GDX representative) is **in-sample on VAL** and is labelled so.
- **2024-01-02 → 2026-10-13** was opened for all B5 books (portfolio-aware evaluation; B4/B5 pools; the b4-b5
  robustness audit perturbed GDX and KRE parameters over the full history; VGT standalone studies). It is
  **previously exposed**: Study 5 calls it FX, a retrospective stress test, never a clean holdout. The broad
  2024–2026 gold-miner rally is common knowledge.
- **2026-10-14 → 2026-10-29** (RECENT): never read by any study (the prospective B4/B5 protocol has zero
  observations). Too short to validate anything.
- Genuinely new evidence requires forward (paper) observation after 2026-10-29.

## 4. Common definitions

### 4.1 Space

The eight-ETF box (`src/multi-etf-d1/context.ts`, unchanged): X `targetPercentChange` 8.0–30.0%; Y
`trailingBuyPercentage` 0.1–5.0%; stop `trailingStopPercentage` 3.0–15.0%; hold `maximumHoldDays` 3–30 calendar days;
L `tickWindowSize` 20–250 sessions; buffer `intradayLossBuffer` 0.0–6.0%; P `pullback` 3.0–20.0%; W
`continuationWindow` 10–200 sessions. Percentages in tenths of a point; integers otherwise. These are the registered D1
parameters with their semantics (`src/phenotype/architectures.ts`); every vector any stage produces is on this grid.
Normalized distance between vectors = L∞ of per-dimension differences divided by (grid points − 1) of that dimension.

### 4.2 Perturbations and neighbourhoods (deterministic; seeds `deriveSeed('study5-gdx-b5-3etf', …)`)

- **Probes** (one parameter at a time, ±1 and ±2 plausible increments, in-box only, ≤ 32): X ±0.5/±1.0 pt, Y
  ±0.1/±0.2 pt, stop ±0.5/±1.0 pt, hold ±1/±2 days, L ±5/±10 sessions, buffer ±0.5/±1.0 pt, P ±0.5/±1.0 pt, W ±10/±20
  sessions (the repository's probe set).
- **N1 neighbourhood (decisive):** 128 points, Latin hypercube over the hyper-rectangle centre ± r with r = the ±2
  increment of every dimension (X 1.0 pt, Y 0.2 pt, stop 1.0 pt, hold 2, L 10, buffer 1.0 pt, P 1.0 pt, W 20), each
  offset rounded to the grid and clipped to the box; distance = L∞ in units of r (≤ 1). Seed labels
  `('nbhd', scope, centreId)`.
- **N2 neighbourhood (reported only):** 64 points with radius 2r.
- **Pools:** joint N1 over all 24 parameters (128 points) and per-book N1 (64 points per book, the other books fixed).
- Summaries: median, p10, p90 (linear interpolation between order statistics), share of points with minute DD <
  $35,000, number of positive points, and the centre's percentile among its neighbours (an outlier check).

### 4.3 Years and annualization

y_DEV = DEV sessions ÷ 252, y_VAL = VAL sessions ÷ 252 (counted from the loaded calendar).

## 5. Study A — standalone GDX

### 5.1 Controls (fixed, labelled; never seeds, shortlist members or neighbourhood centres of the search)

| ID | Vector | Status on DEV / VAL |
|---|---|---|
| A-C1 `portfolioAware` | X 27.4 Y 0.4 stop 7.1 hold 18 L 100 buf 3.6 P 19.1 W 81 (B5's GDX book) | in-sample (selected on 2017–2023) |
| A-C2 `trackS` | X 25.8 Y 1.0 stop 5.4 hold 8 L 172 buf 1.4 P 17.6 W 199 (portfolio-aware S-vector `d1-68ebf55a55`) | in-sample |
| A-C3 `standaloneRep` | X 27.8 Y 1.1 stop 7.6 hold 3 L 231 buf 2.2 P 7.0 W 127 (d1-standalone-opportunity-audit representative) | in-sample (2016–2023) |
| A-C4 `d1Constants` | X 21.6 Y 0.3 stop 7.3 hold 8 L 74 buf 2.9 P 9.0 W 60 (D1's shipped constants = VGT primary) | not fitted to GDX |

### 5.2 Screen (DEV door, 5 bps)

4,096 unique quantized scrambled-Sobol vectors (seed labels `('A', fold, 'sobol')`) plus A-C4 as a generic seed.
Feasible (DEV): minute DD < $35,000, ≥ 8 closed trades, closed trades in ≥ 3 calendar years (WF20: ≥ 5 trades in ≥ 2
years).

### 5.3 Search: three independent NSGA-II replicates

Replicate r ∈ {1, 2, 3}: population 96, crossover 0.9, SBX η 15, polynomial mutation η 20, ≤ 40 generations, ≤ 2,000
new unique vectors, early stop after 10 generations without a relative hypervolume gain > 1e-4 (reference (0,
35,000)); objectives (−net@5, minute DD@5); violation = (DD − 35,000)⁺/35,000 + (min trades − trades)⁺/min trades + (min
years − years)⁺/min years; initial population = the screen's 96 best by constrained domination with the normalized-L∞
≥ 0.02 diversity rule; seed labels `('A', fold, 'nsga2', r)`. Each replicate sees the screen and its own offspring
only. Path dependence is reported (the replicates' best vectors and their distances).

### 5.4 Shortlist (DEV only; distinct regions)

From the feasible union (screen ∪ replicates), greedy distinct-region lists (a vector joins only if its normalized
distance to every vector already taken is ≥ 0.10):
1. **net list:** by DEV net, up to 16;
2. **ratio list:** by DEV net ÷ max(DEV DD, $10,000), up to 8 more;
3. **low-DD list:** DEV DD ≤ $25,000 and DEV net ≥ 50% of the best feasible DEV net, by DEV net, up to 8 more.
≤ 32 vectors; ties by vector ID. The shortlist is written and hashed before the validation door opens.

### 5.5 Robustness and validation evidence (for the shortlist and the four controls)

On the validation door (one continuous run to 2023-12-29, which also yields DEV): centre at 0/2/5/10 bps; at 8% and
14% interest; with `next-open` stop fills; with 25 bps stop slippage; probes; N1; N2; DEV and VAL attribution, the
isolated VAL run, per-year and per-fold attribution (folds D1 2017-06-15 → 2018-12-31, D2 2019-01-01 → 2020-06-30,
D3 2020-07-01 → 2021-12-31, V 2022–2023), concentration (largest trade, top-3 trades), exposure (held sessions),
drawdown while positions are open.

### 5.6 Gates (all required for a nominee; measured on the continuous run 2016-01-04 → 2023-12-29, 5 bps)

- **G1 risk:** centre minute DD (2017-06-15 → 2023-12-29) < $35,000.
- **G2 neighbourhood risk:** N1 p90 minute DD < $35,000 and ≥ 90% of N1 points with DD < $35,000.
- **G3 neighbourhood profit:** N1 median DEV net > 0, N1 median VAL net > 0, and centre VAL net > 0.
- **G4 plateau:** N1 median DEV net ≥ 60% of the centre's DEV net; ≥ 75% of probes DEV-feasible and probe median DEV
  net ≥ 70% of the centre's.
- **G5 stress:** centre DEV+VAL net > 0 at 10 bps, at 14% interest, with `next-open` stops and with 25 bps stop
  slippage.
- **G6 concentration:** centre DEV+VAL net minus its largest trade > 0, and minus its largest positive calendar-year
  contribution > 0.
- **G7 activity:** ≥ 8 closed trades over DEV+VAL, in ≥ 4 calendar years.

### 5.7 Score and roles (gate-passers only; no role is forced)

Score S = ½ · median_N1(DEV net) / y_DEV + ½ · median_N1(VAL net) / y_VAL (robust dollars per year).

- **A-ROBUST:** highest S.
- **A-BALANCED:** highest S ÷ N1 p90 minute DD, at normalized distance ≥ 0.10 from A-ROBUST.
- **A-DEFENSIVE:** lowest N1 p90 minute DD with S ≥ 60% of A-ROBUST's S, at distance ≥ 0.10 from the earlier picks.

If no vector passes the gates, Study A nominates nothing. The controls are scored and gated identically for reference
but cannot be nominated (they are in-sample on VAL).

**WF20 replication** applies §5.2–§5.7 unchanged with its own windows: search door ≤ 2019-12-31 (feasibility ≥ 5
closed trades in ≥ 2 years), evidence on the run to 2021-12-31 with "DEV" = 2017-06-15 → 2019-12-31 and "VAL" =
2020-01-02 → 2021-12-31 (isolated test run from 2020-01-02), probe feasibility on the WF20 search window, and G7 = ≥ 5
closed trades in ≥ 3 calendar years. Its picks are compared with the shortlist median and the controls on the test
window; nothing from WF20 enters the main selection.

## 6. Study B — restricted pool (VGT, KRE, GDX)

### 6.1 Controls and the exclusion effect (same data, costs, engine)

| ID | Books | Purpose |
|---|---|---|
| **C5** B5-original-frozen | VGT primary, XBI lowDd, XRT lowDd, KRE lowDd, GDX portfolioAware | the historical control on current data |
| **C3** B5-3ETF-frozen-ablation | VGT primary, KRE lowDd, GDX portfolioAware | the exclusion effect without retuning |
| C2 | VGT primary, KRE lowDd | Track 1's base (S0 analogue) |
| C1 | VGT primary | reference |

**Universe guard:** every Study B run except C5 refuses any book other than VGT, KRE, GDX before data load, and every
result's funded-lot symbols are asserted ⊆ {VGT, KRE, GDX}. C5 is the only five-ETF run and is labelled.

### 6.2 Track 1 — the frozen B5 method, faithfully (METHOD_RECONSTRUCTION.md §3)

- Stage A: the original 512 common-pool vectors (identical seed) + the original 7 controls, on GDX, DEV door, at
  0/2/5/10 bps; Track S (standalone) and Track P (Δ vs C2) metrics; original feasibility (S: DD ≤ $35,000, ≥ 8 closed
  trades, ≥ 3 years; P: pool DD ≤ $35,000, ≥ 5 funded GDX lots in ≥ 3 years).
- Stage B, per track: the original NSGA-II (population 48, crossover 0.9, SBX η 15, PM η 20, ≤ 1,000 new vectors, ≤ 40
  generations, patience 8, tolerance 1e-4, diversity 0.02, reference (0, 35,000)), the original seeds
  `deriveSeed('portfolio-aware-d1','GDX',track,'nsga2')`; robust selection R1–R5 on the 20 (then 40) best feasible
  (R2 on folds D1/D2/D3, ≥ 2 positive; R3 on regimes R1–R9; R4 probes ≥ 75% feasible, median > 0 and ≥ 50%; R5 pool
  net ÷ DD ≥ 0.95 × C2's).
- Stage C: **T1-P** = C2 + P-vector, **T1-S** = C2 + S-vector; gates T1 (Δ@5 vs C2 ≥ $15,000, Δ > 0 at 0/2/10 bps),
  T2 (pool DD@5 ≤ $35,000, net ÷ DD ≥ 0.95 × C2's), T3 (≥ 5 GDX lots in ≥ 3 years, Δ > 0 in ≥ 2 of 3 folds, Δ − best
  regime > 0); "Track 1 nominated" if all pass, otherwise "comparator". Substitution diagnostic: VGT + GDX P-vector
  (two ETFs; labelled diagnostic, never a candidate).

### 6.3 Track 2a — staged coordinate optimization, then a joint step (DEV door)

- **Runs:** seeds s1, s2, s3 start from C3's vectors; seed s4 starts from T1-P's vectors (a GDX book chosen without
  VAL data; if Track 1 selects no P-vector, s4 starts from T1-S's, and if neither exists s4 is not run). The step order of run s is a random permutation of (GDX, KRE, VGT) from `('B2', s, 'order')`, constrained
  so that s1–s3 use three different first books; two rounds (six steps).
- **Step for book b** (others fixed): NSGA-II over b's 8 parameters; population 48, ≤ 600 new vectors, ≤ 30
  generations, patience 8; initial population = the incumbent, its probes and a 256-vector Sobol screen of b
  (`('B2', s, step, 'sobol')`), reduced to 48 by constrained domination with diversity 0.02; objectives (−pool net@5,
  pool minute DD@5), violation = (pool DD − 35,000)⁺/35,000 only (no book is forced to trade).
- **Step acceptance:** feasible archive vectors with pool DEV net ≥ incumbent + $5,000, in descending pool net (≤ 20
  checked); the first whose probes (in pool) are ≥ 75% feasible and whose probe median pool net ≥ the incumbent's pool
  net replaces b. Otherwise b is unchanged.
- **Joint step:** NSGA-II over all 24 parameters (population 64, ≤ 1,500 new vectors, ≤ 40 generations, patience 8),
  initial population = the coordinate result and its 96 one-parameter probes, reduced to 64; acceptance as above with
  the 96 joint probes against the coordinate result.
- Outputs per run: the coordinate result and the joint result (≤ 8 configurations), plus the Pareto archive.

### 6.4 Track 2b — robust region / plateau selection (validation door)

- **Candidate set** (frozen and hashed before the validation door opens): T1-P, T1-S, Track 2a's coordinate and joint
  results, and up to 8 DEV-Pareto configurations from Track 2a's archives (non-dominated in (pool DEV net, pool DEV DD)
  with DD < $35,000, greedily by DEV net at joint normalized distance ≥ 0.05). Controls C3 and C2 are evaluated
  identically for reference (C3 is in-sample on VAL; it cannot be nominated).
- **Evidence:** centre DEV/VAL/folds/years at 0/2/5/10 bps, 8/14% interest, next-open stops, 25 bps stop slippage;
  joint N1 (128) and per-book N1 (64 × 3) on the run to 2023-12-29; per-ETF lots/net/interest; refusals by
  decider/holder; occupancy.
- **Gates (all required):**
  - PG1 centre pool minute DD (2017-06-15 → 2023-12-29) < $35,000;
  - PG2 joint N1 p90 DD < $35,000 and ≥ 90% of joint N1 points with DD < $35,000;
  - PG3 centre VAL net > 0 and joint N1 median VAL net > 0;
  - PG4 joint N1 median DEV net ≥ 60% of the centre's, and every per-book N1 median DEV net ≥ 75% of the centre's;
  - PG5 positive DEV+VAL net and pool DD < $35,000 under each stress setting of §6.4;
  - PG6 the largest single lot ≤ 25% of the centre's DEV+VAL net;
  - PG7 universe guard satisfied.
- **Score** S_P = ½ · median_jointN1(DEV net) / y_DEV + ½ · median_jointN1(VAL net) / y_VAL. **Roles:** B-ROBUST
  (highest S_P), B-BALANCED (highest S_P ÷ joint N1 p90 DD, a different configuration), B-DEFENSIVE (lowest joint N1
  p90 DD with S_P ≥ 80% of B-ROBUST's). Pareto fronts (S_P vs p90 DD) are reported for all candidates.
- **Incremental labels** (reported, not gates): "beats C3" = S_P > C3's S_P and centre VAL net ≥ C3's; the same against
  C5 on VAL. A nominee that does not beat C3 is reported as "no demonstrated improvement over the frozen ablation".

### 6.5 Blocked-opportunity audit (after the freeze; descriptive)

From C5's and C3's continuous full runs: every refused decision (decider, holder, time), the XRT lot 2025-11-12 →
2026-03-03 in detail, which GDX/KRE/VGT decisions it refused, which entries occur instead in C3 and how their exits
change later eligibility; the same for nominee pools. Only executed trades count; a refused signal is never booked as
profit.

## 7. Freeze, then the one-time final evaluation

1. `freeze-selection` writes `FROZEN_SELECTION.json` once: nominees and roles, every candidate and control with its
   vector, all gate results, the code digest of `src/study5-gdx-b5-three-etf/`, protocol hash, data prefix hashes,
   record hashes, seeds, budgets and evaluation counts; body hash recorded.
2. `final` (refused unless the manifest verifies) runs, once, the continuous full history (2016-01-04 → 2026-10-29)
   of every frozen candidate and control: FX and RECENT attribution; the isolated FX run; costs 0/2/5/10/20 bps;
   interest 8/11/14%; next-open stops; 10 and 25 bps stop slippage; arming-date shifts (2017-06-15, 2017-12-15,
   2018-06-15); N1 neighbourhoods of the nominees; leave-one-year-out; concentration; the blocked-opportunity audit;
   the March 2020 GDX diagnostic. A deterministic confirmation re-run is allowed.
3. **Classification** (fixed, 5 bps): Study A nominee — *holds* if FULL minute DD < $35,000, FX net > 0 and its FX N1
   median > 0; *risk breach* if FULL DD ≥ $35,000; *fails* if FX net ≤ 0; otherwise *mixed*. Study B nominee — FULL
   pool minute DD < $35,000 (pass/fail), and FX Δ vs C3: *persists* ≥ +$2,500, *reverses* ≤ −$2,500, else
   *disappears*.
4. **No tuning after the final inspection.** A failing nominee is reported and frozen; any further iteration is a new
   study that treats FX as observed data.

## 8. Multiple testing

Every evaluation is counted by stage (search, probes, neighbourhoods, validation). Effective search dimension 8
(Study A, Track 1, coordinate steps) or 24 (joint step). Reported: the DEV → VAL decay of the shortlist, the WF20
decay, the probability of backtest overfitting (CSCV, `src/d1-robust/pbo.ts`, 8 half-year blocks of DEV+VAL) over the
shortlist, and the rank correlation between VAL score and FX outcome (after the freeze).

## 9. Engineering gates and tests

P1 replay = full engine (every lot, net, interest and both drawdowns exactly) for C5/C3/C2 on DEV and VAL and for 8
sampled candidate pools; P2 standalone replay at 0 bps = the D1 app runner on the frozen GDX book and the nominees;
P3 `npm run pools -- fixed B5 --end 2026-10-13` reproduces $486,207.77 / $26,509.97 / 94 lots; P4 the Track 1
re-implementation reproduces the sealed portfolio-aware figures on the original S0 and training window (P-vector Δ
+$146,293, standalone $142,930 / $34,134 / 18 trades; S-vector $155,422 / $29,880 / 43). Unit tests (synthetic data):
door refusals, universe guard, grid/neighbourhood determinism and box clipping, research-pool loader. `tsc --noEmit`
and eslint clean for the new code. Deterministic re-runs of seeded stages.

## 10. Deliverables

`PROTOCOL.md`, `DATA_AUDIT.md`, `METHOD_RECONSTRUCTION.md`, `STANDALONE_GDX_RESULTS.md`, `POOL_B5_THREE_ETF_RESULTS.md`,
`BLOCKED_OPPORTUNITY_AUDIT.md`, `ROBUSTNESS.md`, `RECOMMENDATION.md`, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`,
`results/` (JSON/CSV per stage, seeds, hashes, manifests, logs). New runnable configurations use new names only:
`config/pools/B5-3ETF-ablation.json` (frozen phenotypes; `npm run pools -- fixed B5-3ETF-ablation`), research
phenotypes under `config/research-phenotypes/study5-gdx-d1-b5-three-etf/D1/` (`npm run app -- … --phenotype-file`),
research pools under `config/research-pools/study5-gdx-d1-b5-three-etf/` (`npm run study5 -- pool fixed <ID>`, the
pools engine and report unchanged). No frozen file is edited. Commit and push of the study branch at the end
(authorized by the brief); no merge.

## 11. Amendments

**A1 (2026-10-30T20:54Z; reporting only).** Written after the Study A and Study B validation records were sealed
(`results/studyA/main/validation.json` body `2b5c1b5d…`, `results/studyB/validation.json` body `95d18342…`) and
**before** `freeze-selection` and before the final door opened. Neither study has a nominee under §5.6–§5.7 and §6.4.
So that the final report shows what the risk gates excluded, the final evaluation also gives the nominee-level
diagnostics (sensitivities, full-history neighbourhoods, the March 2020 diagnostic, lot ledgers, classification) to
every non-control candidate that fails **exactly one** gate, labelled "not nominated (fails Gk/PGk)". Their
research phenotype/pool files and runnable commands are published only as labelled research configurations. No gate,
score, role, nomination or classification rule changes, and no FX result can promote them.

**Disclosure D1 (no rule change).** §6.4's DEV-Pareto rule selected eight configurations that are parameter-distinct
(joint normalized distance ≥ 0.05) but trade identically to `T2-s2-joint` on DEV (they differ only in non-binding
buffer or W values). The rule was applied as written; the eight add no behavioural diversity and are reported as such.
