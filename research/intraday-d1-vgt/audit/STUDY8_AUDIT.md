# Study 8 methodology audit — what was actually executed (input to Intraday D1 on VGT)

Written 2026-11-06T16:56Z (UTC) in `/home/chad/projects/margin-trading`, branch `feature/strategy-entry-explorer-ui`,
HEAD `353e33f`. A read-only audit: no test suite, optimizer, backtest or study command was run. Nothing outside this
file was written.

**Evidence labels used throughout.**

- **[CODE]** read in the executable source, with `file:line`.
- **[RECORD]** checked in a sealed artifact or run log (`jq`/`grep` over `results/`).
- **[DOC]** stated only in prose (protocol or reports), not independently confirmed in code.
- **[AUDIT]** a conclusion of the later archive audit `research/study8-archive-audit/`.

Paths are abbreviated: `S8/` = `src/study8-expanded-regime-d1/`, `R8/` = `research/study8-expanded-regime-d1/`,
`S7/` = `src/study7-stability-first-d1/`, `AA/` = `research/study8-archive-audit/`.

## 0. Bottom line

1. **The commonly cited ingredients are real and were executed**, with qualifications:
   - **Sobol:** scrambled Sobol, used only for **8-D single-book screens**. Pools are screened by random combinations
     of per-book Sobol survivors plus a joint **Latin hypercube**, because the repository's Sobol stops at 16
     dimensions.
   - **NSGA-II:** an island model of independent NSGA-II runs scored on 16-point neighbourhood fitness.
   - **Local refinement:** single-coordinate steepest ascent on a 64-point neighbourhood.
   - **Staged neighbourhood evaluation:** 16 → 64 → 128 (+128 under trigger T2) points, then separate selection
     (2 × 128), confirmation (3 × 128) and test (3 × 128) seed families.
   - Not used: CMA-ES, grid search, plain random search, or any scalarized objective score.
2. **Fitness is a 4-objective constrained Pareto** (centre net/yr, neighbourhood median/yr, neighbourhood p10/yr,
   neighbourhood p90 minute DD), with the C1–C7 constraints folded into one normalized violation.
   - "Robust profit" = (½·median + ½·p10)/y is **not** an NSGA-II objective.
   - It drives island stagnation, trigger T1, refinement acceptance, trigger T2, the shortlist picks, the roles and
     the final ranking.
3. **The optimizer is Study 7's code with small, documented changes.**
   - The changes: dimension-scaled budgets, a memory-lean ranking with identical order, no frozen-VGT fallback, and
     a non-finite violation treated as infeasible.
   - The current tree is byte-identical to the frozen code: all 21 namespace files and all 140 engine and
     import-closure files match the hashes in `FROZEN_SELECTION.json`.
   - Git shows a single commit (`984f353`) for `src/study8-expanded-regime-d1/`.
4. **There is no within-training temporal criterion beyond concentration and activity.** That means best calendar
   year ≤ 75%, ex-best-year ≥ $5k/yr, lot-years and episodes, and Q8 (neighbourhood training median ≥ 60% of the
   centre's).
   - "Expanded regime" means only that the training window was extended to 2024-12-31, covering 2020 and 2022.
   - There is no regime classifier, no worst-fold or median-fold objective, and no per-subperiod gate.
   - The expanding-window folds F19–F23 are outer procedure diagnostics, each a full independent optimization; they
     never select.
5. **The archive audit found no implementation fault and no material lost candidate** at ≥ 64-point precision.
   - It did find: islands budget-bound (not converged) in 32/40-D, PBO > 0.5 in 20 of 30 track-folds, training rank
     barely predictive out of sample, and an optimum that moves L∞ 0.42–0.97 between folds.
   - It recommended no fitness change and no further local exploration.

## 1. Provenance and integrity of what was audited

- **Authoritative files** (sha256 recomputed now with `sha256sum`; each equals the value in `R8/RESEARCH_RECOVERY.md`)
  [RECORD]:
  - `R8/PROTOCOL.md` `22eebc3704c56d4637ebf1895f1e05780ce1a59477ed491b3efb9e76799513b6`;
  - `R8/FROZEN_SELECTION.json` `88d079d15f00553949e23dbd16ea1b5d26c067722da7804a1549400577fa0d2f` (body
    `5d266eeaccb3…`);
  - `R8/results/protocol_freeze.json` `518c7bde…`;
  - `R8/AMENDMENTS.md` `261c0530…` (head E4).
- **Code equals the frozen code** [RECORD]:
  - `FROZEN_SELECTION.json` `.code.files`: 21 entries, all `OK` against the working tree.
  - `.engine.files`: 140 entries, all `OK`. Engine plus import-closure digest `2b5c5dc4a113…`; accepted code digest
    after E1 `3d0cb5b82ca1…`.
  - The only post-freeze code change was E1: a check-only fix to parity gate P5 (`R8/AMENDMENTS.md:63-98`, completed
    in E2 `:113-115`).
- **Chain:** `R8/results/chain.jsonl` has 13 entries, from `protocol` to `test-F24-confirm` [RECORD].
- **Later commits touching Study 8:**
  - `961bcaf`: relocation of the report text only;
  - `b441e3e`: runner tooling in `src/study8-runners/`, outside the pinned namespace;
  - `b31ce7c`: the archive audit.
  - None modifies the optimizer [RECORD, `git log`].

## 2. Lineage: Study 8 reused Study 7's machinery almost verbatim

- **The brief required it.** `R8/brief/ASSIGNMENT.md:110-151`: "reuse Study 7, do not reinvent"; "Use Study 7's
  machinery: Sobol/per-book screens; joint Latin-hypercube coverage for >16 dimensions; multi-fidelity neighborhood
  sizes 16 → 64 → 128 … independent NSGA-II islands; local coordinate refinement …".
- **`diff` of `S7/search.ts` against `S8/search.ts`** [CODE]. Apart from formatting, the only differences are:
  1. dimension scaling of the joint-proposal budgets (`S8/search.ts:78-91`);
  2. `rankOrder` reimplemented with a domination bit matrix. The order is the same as `selectSurvivors(items,
     items.length)`; review finding N1; unit test `S8/tests/study8.test.ts:93` (`S8/search.ts:110-183`);
  3. removal of Study 7's fallback that substituted frozen VGT when a book had no plausible vector
     (`S8/search.ts:340-341`);
  4. the population is now taken from the scaled budget.
- **`fitness.ts` differs only by** `!Number.isFinite(violation) ? Infinity` (`S8/fitness.ts:155-156`) [CODE].
- **Constants are Study 7's** (`S7/context.ts:185-237` against `S8/context.ts:143-210`) [CODE].
  - Study 8 dropped Study 7's per-track overrides (VXRG reduced; V diagnostic with 1 island and `r1Cap` 512) and set
    every shortlist to 6.
- **Inherited further down:**
  - the neighbourhood point construction is Study 6's (`src/study6-b5-kre-robustness/designs.ts:61-100`);
  - the radius is Study 6's (`src/study6-b5-kre-robustness/context.ts:71`);
  - the LHS generator and quantile are Study 5's (`src/study5-gdx-b5-three-etf/grid.ts:90-104, 165-176`);
  - the box and its probes are the multi-etf-d1 program's (`src/multi-etf-d1/context.ts:73-141`);
  - NSGA-II is the repository's (`src/optimizer/nsga2.ts`).
- **The fidelity rule comes from Study 7's sealed pilot**, not re-derived. n = 16 at rung 1 because the median
  Spearman of 16 against 128 points was 0.95–0.98 (`research/study7-stability-first-d1/PROTOCOL.md:340-352`).
  - Study 8 discloses that applying it to 32/40-D and 7.5-year windows is an extrapolation
    (`R8/PROTOCOL.md:23-25`) [DOC].
- **Study 7's own outcome**, for context:
  - fold M (trained to 2021, validated on 2022–2023) produced no nomination, and F19/F20 nothing out of fold;
  - only its in-sample Class L path nominated (`research/study7-stability-first-d1/RECOMMENDATION.md:10-18`) [DOC].

## 3. Search space

Each book has 8 integer parameters on a step-1 grid. A genome is a vector of grid offsets from the box minimum
(`src/multi-etf-d1/space.ts:22-78`; box at `src/multi-etf-d1/context.ts:73-141`; units from
`src/d1-refinement/families.ts:23-75`) [CODE].

| Key (short) | Unit | Bounds (grid) | Meaning | Grid points | Neighbourhood radius r (`study6 context.ts:71`) | Refinement probes |
|---|---|---|---|---:|---|---|
| `targetPercentChange` (X) | 0.1 pp | 80–300 (8.0–30.0%) | decline from the L-session high that arms | 221 | 10 (±1.0 pt) | ±5, ±10 |
| `trailingBuyPercentage` (Y) | 0.1 pp | 1–50 (0.1–5.0%) | rebound from the trailing low that buys | 50 | 2 (±0.2 pt) | ±1, ±2 |
| `trailingStopPercentage` (stop) | 0.1 pp | 30–150 (3.0–15.0%) | trailing stop | 121 | 10 (±1.0 pt) | ±5, ±10 |
| `maximumHoldDays` (hold) | calendar days | 3–30 | days before the loss exits apply | 28 | 2 | ±1, ±2 |
| `tickWindowSize` (L) | sessions | 20–250 | reference-high lookback | 231 | 10 | ±5, ±10 |
| `intradayLossBuffer` (buffer) | 0.1 pp | 0–60 (0.0–6.0%) | net loss for the buffered intraday exit | 61 | 10 (±1.0 pt) | ±5, ±10 |
| `pullback` (P) | 0.1 pp | 30–200 (3.0–20.0%) | pullback from the post-exit high | 171 | 10 (±1.0 pt) | ±5, ±10 |
| `continuationWindow` (W) | sessions | 10–200 | post-exit continuation window | 191 | 20 | ±10, ±20 |

- **Size and form.**
  - One book: ≈ 1.72 × 10¹⁶ grid points. A pool concatenates book genomes in the order VGT, XBI, XRT, KRE, GDX
    (`S8/space.ts:34-49`, `S8/context.ts:38`), giving d = 8 × books (8 to 40).
  - Every parameter is discrete. The GA operators work on continuous grid indices and round back to the grid
    (`src/optimizer/nsga2.ts:167-251`).
- **Distance.** Normalized L∞: max over coordinates of |Δ| ÷ (max − min) (`study6 designs.ts:226-235`). All
  distinctness thresholds (0.02 / 0.03 / 0.05 / 0.10) use it. 0.10 equals 22 X-units, 4.9 Y, 12 stop, 2.7 hold,
  23 L, 6 buffer, 17 P and 19 W.
- **Where the box comes from.** It is the "eight-ETF box" of the multi-etf-d1 program, whose tickers are XBI, IWM,
  XRT, KRE, XLY, IWN, XLF and XLE (`src/multi-etf-d1/context.ts:10`). VGT is not among them. The bound rationales
  cite those ETFs' declines (`:80-81`).
  - In Study 8 the box bound often. Near-bound coordinates among the 18 F24 nominees: stop near its 3% minimum 17
    times, X at its 30% maximum 13 times, Y at its minimum 11 times (`R8/NEIGHBORHOOD_ROBUSTNESS.md:66-74`) [DOC].
  - Every V-F21 role holder has stop = 30, the lower bound [RECORD, `FROZEN_SELECTION.json` roles].

## 4. Seeds and random-number generation

- **Every seed is `deriveSeed('study8-expanded-regime-d1', …labels)`** (`S8/context.ts:265`; `src/optimizer/rng.ts:5-9`)
  [CODE].
  - The labels joined by `|` are hashed with SHA-256, and the first 16 bytes form four little-endian uint32 values.
  - The generator is sfc32 with 15 warm-up draws (`rng.ts:12-54`). Nothing uses `Math.random`.
  - `label(...)` appends `track, fold` (`S8/search.ts:265`).
  - Example: VGT-alone rung 1 on F24 is `deriveSeed('study8-expanded-regime-d1','r1','V','F24')`.

| Family | Labels (verbatim) | n | Use | Code |
|---|---|---:|---|---|
| Screen | `('screen', track, fold)`; pools `('screen', symbol, track, fold)` | 8,192 / 4,096 per book | scrambled Sobol scramble seed | `S8/search.ts:318,328`; `S8/space.ts:52-76` |
| Combinations | `('combos', track, fold)` | — | random draws of plausible per-book vectors | `S8/search.ts:337` |
| Joint LHS | `('lhs', track, fold)` | — | joint Latin hypercube | `S8/search.ts:354` |
| GA | `('ga', island, track, fold)`; fillers `('fill', island, track, fold)` | — | island operators; LHS filler of short populations | `S8/search.ts:448,454` |
| Rungs | `('r1'|'r2'|'r3', track, fold)` | 16 / 64 / 128 | neighbourhood offsets | `S8/search.ts:267-269` |
| Rung 3b | `('r3b', track, fold)` | 128 | T2 rescore only | `:270` |
| Refinement | `('refine', track, fold)` | 64 | refinement neighbourhoods | `:271` |
| T2 bootstrap | `('bootstrap', track, fold)` | 2,000 resamples | SE of robust/yr | `:789-808` |
| Selection | `('select', rep, track, fold)`, rep 1–2 | 2 × 128 | role order | `:909` |
| Confirmation | `('confirm', track, fold, rep)` and `confirm-inbox/-half/-wide/-d8/-d16/-norm`, `confirm-book` | 3 × 128 + variants | in-sample qualification | `S8/evidence.ts:79-141` |
| Test | `('test', 'sets', fold, rep)` + variants | 3 × 128 + variants | test doors (the same offsets for every configuration of a dimension) | `S8/test.ts` options `track: 'sets'` |
| Count-matched subset | the family's labels + `'subset'` | — | which k coordinates move | `S8/designs.ts:59-77` |

- **Common random numbers** [CODE]. Neighbourhood offsets depend only on the labels, never on the centre
  (`S8/designs.ts:5-7, 43-44`). So within a track-fold every centre at a rung shares the same offsets, and the GA
  islands share the rung-1 offsets.

## 5. The per-track × fold pipeline, as executed (`S8/search.ts:244-1019`)

- **Budgets** (`S8/search.ts:58-98`; `S8/context.ts:175-210`) [CODE]. s(d) = max(1, 8·books/16) multiplies only the
  combinations, joint LHS, rung-1 cap, GA population and new configurations per island.

| Budget | G, V (8-D) | VG (16) | VXR (24) | VXRG (32) | VXRKG (40) |
|---|---:|---:|---:|---:|---:|
| Sobol screen | 8,192 joint | 4,096 per book | 4,096 per book | 4,096 per book | 4,096 per book |
| Plausible-book combinations | — | 4,096 | 6,144 | 8,192 | 10,240 |
| Joint LHS | — | 1,024 | 1,536 | 2,048 | 2,560 |
| Rung-1 cap | 1,024 | 1,024 | 1,536 | 2,048 | 2,560 |
| GA population | 64 | 64 | 96 | 128 | 160 |
| New configurations per island | 2,048 | 2,048 | 3,072 | 4,096 | 5,120 |
| Islands (max under T1) | 4 (8) | same | same | same | same |
| Rung 2 / rung 3 keep | 192 / 48 | same | same | same | same |
| Refinement starts × passes | 6 × 2 | same | same | same | same |
| Shortlist | 6 | same | same | same | same |

- **The sealed search records confirm these budgets in all 30 jobs** (`.budget` in `results/search/*/*/search.json`)
  [RECORD].

### 5.1 Screen and promotion to rung 1

- **Single book (G, V)** [CODE]: 8,192 unique scrambled-Sobol grid vectors over the 8-D box (`S8/space.ts:52-76`).
  Drawing stops at 64 × the target; `floor(u · gridSize)`; duplicates are skipped. Each is evaluated at its centre only.
- **Pools** [CODE] (`S8/search.ts:324-363`):
  - Each book gets its own 4,096-vector Sobol screen, evaluated **standalone**. A vector is plausible if DD < $35k,
    net > 0 and lots ≥ 2 (`:332`).
  - Then `combos` random draws, one plausible vector per book, de-duplicated (`:337-352`). If a book has no
    plausible vector there are none (`:340-341`).
  - Then `lhs` joint Latin-hypercube configurations over the full k × 8 box (`S8/space.ts:80-102`), mapped
    `floor(((u+1)/2)·gridSize)`.
- **Screen plausibility** (`S8/search.ts:365-371`) [CODE]: centre DD < $35,000, net > 0, lots ≥ ⌈C3 lot floor / 2⌉,
  and every book ≥ 1 lot.
- **Promotion** (`:374-409`) [CODE]:
  - If the plausible count is within the rung-1 cap, all are promoted.
  - Otherwise ⌊cap/2⌋ go by constrained-domination rank on the centre-only objectives (−net, DD, −lots), then the
    rest by greedy max–min normalized L∞ distance from those already chosen, ties by ID.
- **Executed (V track)** [RECORD]: 8,192 screened; plausible 3,740 / 3,334 / 2,748 / 2,522 / 2,404 (F19 / F20 / F21 /
  F23 / F24); 1,024 promoted in each fold.
- **Observation** [RECORD, run logs `R8/results/runlogs/search-*.txt`, "rung 1 on the screen"]:
  - Promoted screen centres were almost never rung-1 feasible: 0–11 per job (V: 0, 0, 1, 0, 0).
  - The islands therefore started from nearly all-infeasible populations. Almost all feasible configurations were
    found by the GA, driven by violation reduction.

### 5.2 Rung 1 and the NSGA-II islands

- **Rung 1** [CODE]: every promoted centre and every GA child is scored by `fitOf` with family `r1`, n = 16
  (`S8/search.ts:416-428`; `S8/fitness.ts:171-198`). An in-job archive caches each configuration once.
- **Islands** (`S8/search.ts:447-563`) [CODE]:
  - **Initial population:** the screen fits are ranked by `rankOrder`, and island i takes members whose rank index ≡ i
    (mod `budget.islands` = 4), the first `population` of them. A short population is filled from a 4·population
    joint LHS with labels `('fill', i)` (`:449-466`).
  - **Variation:** binary crowded tournaments (`nsga2.ts:149-157`); SBX on grid indices, p = 0.9, η = 15, each
    dimension crossed with probability 0.5 (`nsga2.ts:167-209`); polynomial mutation, η = 20, per-gene probability
    1/d, where a no-op is forced to one grid step (`nsga2.ts:213-251`).
  - **Selection:** (μ+λ) elitism via `selectSurvivors`, i.e. fast non-dominated sort under constrained domination,
    then crowding distance, ties by ID (`nsga2.ts:16-42, 132-147`). Offspring duplicating an island-seen ID are
    skipped.
  - **Stops:**
    - after `generations` = 40;
    - when new configurations reach the island budget;
    - after 10 generations without the island's 2-D feasible hypervolume rising by more than 1e-3 relative. The
      hypervolume is computed over (−robust/yr, p90 DD) with reference (0, $35,000) (`S8/search.ts:209-218,
      524-546`; `nsga2.ts:255-279`). While nothing is feasible, the stagnation measure is the minimum violation.
- **Executed** [RECORD]:
  - 130 islands; 124 stopped on budget, all at exactly **32 generations** (64 × 32 = 2,048), and 6 on stagnation.
  - **The 40-generation cap never bound.**
  - Archive sizes: 7,744–31,994 per job; 440,126 in total.
- **T1 island saturation** (`S8/search.ts:589-605`) [CODE]. After the base islands: if the last island raised the
  union feasible 2-D hypervolume by ≥ 10% (or, with no feasible point, any hypervolume appeared or the minimum
  violation fell ≥ 25%), run 2 more islands, repeating up to 8.
  - Extension island k reuses partition k mod 4 with its own GA seed.
  - Fired in 5 of 30 jobs (G-F20, VG-F24, VXRG-F20, VXRG-F21, VXRKG-F19). Each stopped at 6 islands [RECORD].

### 5.3 Rung 2 and T3

- **Rung 2** [CODE] (`S8/search.ts:614-617`): the archive's top 192 in `rankOrder` (rung-1 values), greedily skipping
  any within L∞ 0.02 of one taken. Re-scored with family `r2`, n = 64.
- **T3 coverage** (`:619-666`) [CODE]: if fewer than 2 rung-2-feasible "regions" exist (greedy clusters at L∞ 0.10)
  while rung 1 has ≥ 3, add up to 16 rung-1-feasible representatives ≥ 0.10 from every rung-2-feasible one.
  - It never fired [RECORD].

### 5.4 Rung 3

- **Rung 3** [CODE] (`:672-684`): the rung-2 set's top 48 in `rankOrder` (rung-2 values), distinct at L∞ 0.03,
  re-scored with family `r3`, n = 128.
- **Executed for V** [RECORD]: rung-2 feasible 5 / 78 / 68 / 168 / 8 of 192; rung-3 feasible 2/51, 44/48, 49/49,
  42/49 and **11/48** (F24).
  - On F24, C5 (neighbourhood median ≥ $10k/yr) was the binding constraint for 32 of 48 rung-3 V candidates
    (`R8/SEARCH_AND_COMPUTE.md:62-65`) [DOC; consistent with AA §2.1].

### 5.5 Local refinement (`S8/search.ts:689-780`) [CODE]

- **Starts:** the top 6 rung-3 configurations in `rankOrder`, distinct at L∞ 0.05. Each start is first re-scored on
  the 64-point `refine` family.
- **Moves:** up to 2 passes. Each pass evaluates **every** single-coordinate move of every book at the box's probe
  offsets (table in §3; out-of-box moves skipped; ≤ 32 per book). Each move is scored on the same 64-point family,
  and the single best one is accepted (steepest ascent).
- **Acceptance from a feasible start:** the candidate is feasible; median ≥ current; p10 ≥ current; p90 DD ≤
  current; and robust/yr gain ≥ $1,000/yr (`schedule.refineMinGain`). Ties go to the lower p90 DD.
- **Acceptance from an infeasible start:** a violation reduction ≥ 0.01, the largest such; ties go to the lower ID.
- **Stop and endpoint:** a pass with no accepted move stops the start. Endpoints are re-scored at rung 3 if new.
- **Executed** [RECORD]: 100 accepted moves across the 30 jobs. Refined endpoints reached 18 of 30 shortlists and no
  V shortlist. In V-F24, each start's first pass tried 32 moves and accepted none.

### 5.6 T2: Monte Carlo tie check (`S8/search.ts:785-830`) [CODE]

- **Trigger:** order the rung-3-feasible configurations by robust/yr. If the gap between #1 and #2 is less than the
  larger bootstrap SE (2,000 resamples of the 128 neighbour nets, statistic (½·q0.5 + ½·q0.1)/y), re-score the top 8
  on the pooled `r3`+`r3b` families (≤ 256 unique points).
- **Effect:** these rescored fits replace the rung-3 fits in the shortlist pool.
- **Executed** [RECORD]: fired in 18 of 30 jobs (V-F24: gap $3.88/yr against SE $254/yr).

### 5.7 Shortlist (`S8/search.ts:833-890`) [CODE]

1. **Behavioural de-duplication.** Walk `rankOrder` and keep the first configuration per funded-ledger signature. The
   signature is the first 16 hex characters of sha256 over each lot's (symbol, entryTime, exitTime,
   round(net·10⁶)) (`S8/evaluate.ts:132-135`).
2. **Picks.** F = the feasible configurations. Each pick must be at L∞ ≥ 0.10 from those taken; the cap is 6.
   - **profit:** max robust/yr (ties: lower p90 DD, then ID);
   - **robust:** max share among F with median ≥ 0.5 × the profit pick's median;
   - **balanced:** max robust/yr ÷ p90 DD;
   - **centre:** max centre net/yr;
   - then **front:** the remaining feasible configurations in `rankOrder`;
   - then **infeasible on training:** the least-violating infeasible ones (these can never qualify).
3. **Executed** [RECORD]: 6 per job, 180 in all.
   - V-F19 had 2 feasible members and 4 infeasible fillers. V-F24 had 4 feasible members (profit, robust, balanced,
     centre) and 2 infeasible fillers.

### 5.8 Selection evidence (`S8/search.ts:895-936`) [CODE]

- Each shortlist member and each control is scored on `select1` and `select2` (128 each) and on their pooled union
  (`select1+2`).
- The pooled figures (`selection.pooled.nb`) are the only input to the role orders of §8 (`S8/qualify.ts:136`).

**Executed totals** [RECORD; the same figures as `R8/SEARCH_AND_COMPUTE.md:20-23`]: 30 jobs; 440,126 rung-1
configurations; 9,983,389 fresh point evaluations; 55.4 CPU-hours. For V-F24: 171,794 points in 28.9 minutes.

## 6. Objectives, constraints and ranking

- **Point metrics** (`S8/evaluate.ts:298-403`) [CODE]:
  - **Run:** one causal run from the close of 2016-01-04, armed 2017-06-15, to the door's end. $100,000 notional; 11%
    simple interest on the principal (365-day year); 5 bps per side; stops filled at the stop or the gapped open
    (`S8/context.ts:28-36`).
  - **Net:** realized + marked unrealized, after interest and costs.
  - **dd:** the strict minute drawdown tracker's maximum, unrounded.
  - **lots;** **episodes** (a new episode when a lot's entry is > 10 sessions after the previous exit; `:324-333`);
    **lot years** (distinct exit years of closed lots).
  - **perCapitalYear** = net ÷ (heldDays/365); **top1Share** = largest positive lot ÷ net (NaN if net ≤ 0).
  - **Period attributions:** the mark difference across each period; **bestYear** = the largest positive
    calendar-year attribution, a partial year included.
  - **y** = sessions from arming to the end ÷ 252 (`:292-296`).
- **Neighbourhood summary** over the n unique neighbours, centre excluded (`S8/stats.ts:32-76`; type-7 quantiles)
  [CODE]:
  - share = #{dd_i < $35,000}/n; p90Dd = q0.90(dd_i);
  - medianNet = q0.50(net_i); p10Net = q0.10(net_i);
  - **robust/yr = (½·q0.50(net_i) + ½·q0.10(net_i)) / y**.
- **Objectives**, all minimized (`S8/fitness.ts:159`) [CODE]:
  `[−centre net/y, −nb median/y, −nb p10/y, nb p90 DD]`. No weights and no scalarization.
- **Constraints** as a normalized violation, the sum of its parts (`S8/fitness.ts:130-157`) [CODE]. The thresholds are
  in `S8/context.ts:143-156`; `short(v,f) = max(0, f − v)/f`.

| Part | Rule | Violation part |
|---|---|---|
| C1 | centre DD < $35,000 (strict) | (dd − 35,000)/35,000 + 1e-9 if dd ≥ 35,000 |
| C2share | share ≥ 0.90 | max(0, 0.90 − share)/0.90 |
| C2p90 | p90 DD < $35,000 | as C1 |
| C3lots | lots ≥ ⌈1.5·y⌉ | short |
| C3episodes | episodes ≥ ⌈0.5·y⌉ | short |
| C3years | lot years ≥ min(3, lastYear − 2017) | short |
| C4 (pools only) | each book ≥ ⌈0.4·y⌉ lots | Σ over books of short |
| C5median | median/yr ≥ $10,000 | max(0, 10,000 − median/yr)/10,000 |
| C5p10 | p10 > 0 | 0 if p10 > 0, else (max(0, −p10) + 1)/(10,000·y) |
| C6 | perCapitalYear ≥ $11,000 | short |
| C7lot | top lot ≤ 25% of net | max(0, top1 − 0.25)/0.25 if net > 0 and finite, else 1 |
| C7year | best year ≤ 75% of net | likewise with 0.75 |
| C7exBest | (net − bestYear)/max(1, y − 1) ≥ $5,000/yr | short |

- **Floors and feasibility** [CODE, RECORD]. The floors come from `floorsOf(y, 2017, trainEndYear)`
  (`S8/fitness.ts:20-26`); F24 gives y = 7.536 → lots 12, episodes 4, lot years 3, book lots 4. A total < 1e-12 is
  feasible (0); a non-finite total is ∞.
- **Ranking** [CODE]: constrained domination (`nsga2.ts:16-42`).
  - A feasible configuration beats an infeasible one; between infeasible ones, the lower violation wins; between
    feasible ones, Pareto dominance on the 4 objectives decides.
  - Fronts are ordered by crowding distance, then ID. `rankOrder` (`S8/search.ts:115-183`) gives every infeasible
    violation value its own front.

## 7. Parameter-neighbourhood instrument

- **Decisive design: "N1 joint clip LHS"** (`S8/designs.ts:46-85`; `study6 designs.ts:61-100`) [CODE].
  - n Latin-hypercube rows over **all** coordinates of all books, u ∈ [−1, 1] (`latinOffsets`). Each coordinate is
    `clip(centre + round(u · scale · r), box)` with the radii of §3 (absolute, in grid units; scale 1).
  - Points equal to the centre or to an earlier point are dropped (`S8/designs.ts:88-105`), so the unique n can fall
    below the nominal n.
- **Variants** (`S8/evidence.ts:85-141`) [CODE]:
  - **inbox:** the offset is mapped onto [max(min, c − r), min(max, c + r)], with no clipping mass on a bound;
  - **half / wide:** scale 0.5 / 1.5;
  - **d8 / d16:** count-matched; only k randomly chosen coordinates move, the rest stay at the centre;
  - **norm:** every coordinate at scale √(8/d);
  - **per-book:** 64 points perturbing one book only.
- **Metrics per evidence record** [CODE]: centre; share; Wilson one-sided 95% lower bound (z = 1.645,
  `S8/evidence.ts:36-43`); median, p10 and p90 net; p90 and worst DD; profitable share; median lots; train/test
  period medians and p10; clipping mass per coordinate and bound (`:231-240`); near-bound coordinates
  (`|c − bound| < r`, `:60-70`).

**Where each neighbourhood is decisive** [CODE]:

| Stage | Design | n | Pass rule |
|---|---|---:|---|
| Search rungs 1/2/3, refinement, T2 | clip | 16 / 64 / 128 / 64 / 256 | C2 inside the violation |
| Selection (role order) | clip, select1+2 | ≈ 256 | ordering only |
| Qualification Q2 | clip, confirm 1–3 pooled | ≈ 384 | share ≥ 0.90 and p90 < $35k |
| Qualification Q2b (only if a coordinate is within r of a bound) | inbox, 2 × 128 | ≈ 256 | the same |
| E3 (pools) | d8, 2 × 128 | ≈ 256 | not dominated by B1 on (median/yr, p90 DD) |
| Test T2 / T2b | clip test 1–3 / inbox pair, on the run to the test end | ≈ 384 / ≈ 256 | share ≥ 0.90 and p90 < $35k |
| Report only | half, wide, norm, d16, per-book, per-family | 64–128 | — |

- **The 0.93 "marginal/ambiguous" margin** (`S8/evidence.ts:331-332`; `S8/test.ts:142-146`) [CODE]: status is
  marginal (in qualification) or ambiguous (on test) if the pooled share is ≤ 0.93, or any single family fails on its
  own; on test also if the centre DD ≥ $33,000.
- **Sensitivity** [CODE]: the stresses are 10 bps, 14% interest, next-open stop fills and +25 bps stop slippage
  (`S8/context.ts:236-241`). These gate Q7 and T4. 0/2/20 bps, 8% interest, +10 bps slippage and shifted arming
  dates are report-only.

## 8. Qualification, roles, ranking and the freeze

- **Qualification** (`S8/qualify.ts:89-223`; gates `S8/evidence.ts:276-335`) [CODE]. Each fold's shortlist and the
  controls are run on the fold's own training door after all 30 searches are sealed. Each candidate must pass:
  - **Q1:** centre DD < $35k;
  - **Q2:** pooled 3 × 128 share ≥ 0.90 and p90 < $35k;
  - **Q2b:** the in-box pair likewise, if near a bound;
  - **Q4:** net > 0, best year ≤ 75% and ex-best-year ≥ $5k/yr;
  - **Q5:** C3 and C4;
  - **Q6:** top lot ≤ 25%;
  - **Q7:** all 4 stresses with net > 0 and DD < $35k;
  - **Q8:** the neighbourhood median of the `TRAIN-<fold>` attribution ≥ 0.60 × the centre's, and the centre's > 0;
  - **E1:** median/yr ≥ $10k and p10 > 0;
  - **E2:** perCapitalYear ≥ $11k;
  - **E3 (pools):** not dominated by B1 on the d8 (median/yr, p90 DD), with all values finite.
  - "Infeasible on training" members are forced unqualified (`S8/qualify.ts:144-149`).
  - The record also stores each candidate's training funded ledger (`:129`), CSCV PBO (§9) and the
    selection → confirmation rank decay (`:190-196`).
- **Roles** (`S8/select.ts:74-130`) [CODE]. Each role goes to the first **qualified** candidate in that role's order,
  at L∞ ≥ 0.10 from the holders already taken. The orders use the **selection** families:
  - **profit:** robust/yr desc, then p90 asc, then ID;
  - **robust:** share desc, among candidates with median/yr ≥ 0.5 × the profit holder's (or of the top of the profit
    order if there is no holder);
  - **balanced:** robust/yr ÷ p90;
  - **up to 2 extra:** in shortlist order, each also with a training-ledger Jaccard < 0.5 against every holder
    (`:55-68, 84`).
  - An unfilled role is recorded empty.
- **Fold ranking** (`S8/select.ts:200-224`) [CODE]:
  - **Tier:** "strong" if the holder's **confirmation** robust/yr ≥ B1's under that track's confirmation labels,
    otherwise "modest".
  - **Order within a tier:** robust/yr desc, then p90 asc, then ID.
  - **F24's ranking is the global one.**
- **Freeze** [CODE, RECORD]. `FROZEN_SELECTION.json` is written once by `writeSealed`, with a `bodyHash`
  (`S8/select.ts:247-279`). It holds:
  - the protocol sha256 and the code and engine digests;
  - the full numeric rulebook and its sha256 (`ff6e9d57…`);
  - the file sha256 and body hash of all 60 search and qualification records;
  - the roles, `rankedByFold`, the T-gate text and the test plan.
  - It is chain phase 6 (`selection`, 2026-11-01T21:23:06Z).
  - The test stage refuses unless the live rulebook equals the sealed one (`R8/PROTOCOL.md:167`) [DOC; test.ts reads
    `constants.sha256`].
- **Executed (V, F24)** [RECORD]:
  - **Roles:** profit `VGT:d1-75353cd798`, robust `VGT:d1-787044ebd5`, balanced `VGT:d1-0c07e16765`, extra
    `VGT:d1-3a9036cc5b`. They ranked #23–#26 of the 26 F24 holders.
  - **Test outcomes:** #23 failed (T2 at 89.8%, T5); #24 failed (T5); #25 passed; #26 ambiguous
    (`R8/results/tables/test-F24-holders.md:28-31`).
  - **V-F19:** no role holder.

## 9. Temporal design, regimes and data discipline

- **Windows** (`S8/context.ts:69-129`) [CODE]:
  - accounting from 2016-01-04; arming 2017-06-15;
  - training ends: F19 2019-12-31, F20 2020-12-31, F21 2021-12-31, F23 2023-12-29, **F24 2024-12-31**;
  - test windows: F19 2020–2021, F20 2021–2022, F21 2022–2023, F23 2024, **F24 2025-01-02 → 2026-10-29**.
  - Each fold is a **complete, independent optimization** (30 = 6 tracks × 5 folds). They are expanding windows with
    no reset at the cutoff, each tested on one continuous causal run to its test end.
- **"Expanded regime"** = training that includes the 2020 crash, the 2022 bear, the 2023 recovery and 2024
  (`R8/brief/ASSIGNMENT.md:5`; `R8/PROTOCOL.md:43-45`) [DOC].
  - There is no regime detector or regime-conditional rule in code. The named periods M2020 (2020-02-15 → 04-30),
    R2223, T2025Q2 and G2026 are attribution keys, report-only (`S8/context.ts:117-129`).
- **Temporal checks inside the training window** [CODE]:
  - **What exists:** the C7 concentration rules (best calendar year ≤ 75%, ex-best-year ≥ $5k/yr); C3 lot-years and
    episodes; and Q8 (neighbourhood training median ≥ 60% of the centre's).
  - **What does not exist:** walk-forward folds, worst-subperiod or median-subperiod objectives, and per-year or
    per-fold minimum-profit requirements inside training.
  - **CSCV/PBO** is computed (report-only): the 64 best rung-2 configurations × half-year attributions from 2018H1 to
    the training end, with the earliest block dropped when the count is odd (`S8/qualify.ts:166-187`;
    `src/d1-robust/pbo.ts:40+`).
  - **Threshold sensitivity** of rung-3 feasibility is report-only.
- **Test gates** (`S8/test.ts:94-155`, block-only) [CODE]:
  - **T1:** whole-run centre DD < $35k;
  - **T2:** test families 1–3 with share ≥ 0.90 and p90 < $35k; **T2b:** the inbox pair likewise;
  - **T3:** test-window centre net ≥ $10k·yTest, and pooled test median > 0 and ≥ $5k·yTest;
  - **T4:** the 4 stresses with test net > 0 and DD < $35k;
  - **T5:** best year ≤ 75%, ex-best-year ≥ $5k/yr and top lot ≤ 25% over the whole run;
  - **T6:** the whole-run C3/C4 floors, plus new test-window lots ≥ ⌈1.5·yTest⌉ and new episodes ≥ ⌈0.5·yTest⌉, with
    yTest rounded to 0.01;
  - **T7:** perCapitalYear ≥ $11k.
  - **Rule:** test results never reorder, replace or rescue.
- **Doors and discipline** [CODE, RECORD]:
  - **Code:** `S8/data.ts:33-48, 85` and `S8/gates.ts:43-85`.
    - Search and qualification doors load data only to the fold's training end, and assert that the last loaded
      session is ≤ that end.
    - Search doors refuse once `selection` is sealed, or if any selection or test trace exists.
    - Test doors require `selection` and `audit` and the order F19 → F20 → F21 → F23 → F24.
  - **The door log `R8/results/doors.jsonl` (90 lines) confirms:**
    - each `search-F*` door opened 12 times (6 searches and 6 qualifications), from 16:06:39Z to 21:20:14Z;
    - selection sealed 21:23:06Z; audit sealed 21:40:13Z;
    - the first test door opened 21:40:43Z; the test doors opened once each in order, plus the one F24 `--confirm`.
  - `seal` refuses a job whose door opened ≠ 1 time without an `--acknowledge` (`S8/commands.ts:58-141`).
  - **Integrity:** the code, engine and import closure, the data, and the rulebook are pinned and re-checked at every
    door (`S8/integrity.ts:20-150`).
  - **This is a local chain, not a commit-backed seal.** Exposure: all of 2016 → 2026-10-29 had been inspected
    before Study 8, so F24 is "an algorithmically closed door", not a holdout (`R8/PROTOCOL.md:234-244`) [DOC].

## 10. Pool-specific and multi-ETF mechanics (what to remove or adapt for VGT alone)

| Element | Location | Single-VGT disposition |
|---|---|---|
| Six tracks, `bookOrder`, frozen pools | `S8/context.ts:38-65` | keep the V-track logic only |
| Dimension scale s(d) | `S8/context.ts:175`; `S8/search.ts:78-91` | equals 1 for 8-D; inert |
| Per-book standalone screens + plausibility filter | `S8/search.ts:324-336` | remove; use the G/V Sobol path (`:317-323`) |
| Random plausible-book combinations | `S8/search.ts:337-352` | remove |
| Joint LHS screen (> 16-D) | `S8/search.ts:354-362`; `S8/space.ts:80-102` | remove (LHS stays as the neighbourhood generator and GA filler) |
| Promotion "every book ≥ 1 lot" | `S8/search.ts:370` | trivially true for one book |
| Joint genome concatenation | `S8/space.ts:29-49` | 8-D only |
| Shared one-slot replay (first executable signal wins, refusals, reservations, `refusalsBy`) | `S8/evaluate.ts:207-241, 358-364`; `src/portfolio-aware-d1/replay.ts` | with one book it reduces to a standalone funded $100k slot (V runs show 0 refusals, `R8/RUN_COMMANDS.md` table); replace with the single-instrument engine, keeping the financing and cost convention only if wanted |
| C4 per-book lot floor; Q5/T6 per-book clause | `S8/fitness.ts:25,139`; `S8/evidence.ts:302`; `S8/test.ts:134` | inert for one book (C4 = 0) |
| E3 (pool not dominated by B1 under count-matched k = 8) | `S8/evidence.ts:312-326` | pool-only gate; drop or replace with a VGT comparator |
| d8 / d16 / norm-matched / per-book neighbourhoods | `S8/evidence.ts:103-141` | dimension-matching for pools; d8 is the full design at 8-D |
| Funded-sequence diagnostics (kept lots, Jaccard, displaced/added, own-P&L versus funding interaction, `sequenceDependent`) | `S8/evidence.ts:153-229` | pool-specific (the flag requires > 1 book) |
| Extra-role ledger Jaccard < 0.5 | `S8/select.ts:55-68, 84` | designed for pools; still computable on one book's lot ledger |
| Ledger-signature de-duplication | `S8/evaluate.ts:132-135`; `S8/search.ts:833-837` | generic; keep |
| Controls: frozen subsets, B5, G-PA, Study 7 references; tier versus B1 | `S8/search.ts:895-907`; `S8/qualify.ts:52-71`; `S8/select.ts:206-210` | adapt (B1 = VGT `primary` is the natural control) |
| Paired bootstraps against B5 and frozen subsets | `S8/test.ts` (bootstrap block 21 × 5,000) | adapt |
| Parity P1–P5 (replay = N-book engine) | `S8/parity.ts` | replace with single-instrument parity |
| The eight-ETF common box | `src/multi-etf-d1/context.ts:10, 73-141` | multi-ETF origin; review the bounds for VGT, given heavy clipping at the stop, X and Y bounds |

- **Not present anywhere in Study 8** [CODE]: ETF ranking or selection, diversification or correlation terms,
  multi-ETF phenotype selection inside a track, and capital split across books. The ETF set of each track is fixed.
- **Do not remove "pooled" neighbourhood code.** `pooledFamiliesFit` (`S8/fitness.ts:217-248`) pools seed
  **families**, not ETFs. It is the decisive 3 × 128 instrument and is needed for one book too.

## 11. Discrepancies and undocumented behaviour

1. **The 40-generation cap is nominal.** `R8/PROTOCOL.md:366` says "≤ 40 generations". The new-configuration budget
   equals 32 × population, and every budget-stopped island ran exactly 32 generations [RECORD].
2. **What the stop rule measures is not stated in the Study 8 protocol.** `R8/PROTOCOL.md:367` says only "stagnation
   stop at 10 generations / 1e-3". The code measures a **2-D** hypervolume (robust/yr, p90 DD; reference (0, $35k)),
   not the 4 objectives being optimized (`S8/search.ts:209-218`). T1 uses the same 2-D union hypervolume. This is
   specified only in Study 7's protocol (`study7 PROTOCOL.md:369-372`).
3. **Rung-1 promotion and island seeding are not stated in Study 8's protocol.** The rank half uses centre-only
   (−net, DD, −lots) objectives. Extension islands reuse partition k mod 4. The mutation rate is 1/d. All three are
   Study 7 §8.2 details (`study7 PROTOCOL.md:362-374`) [CODE agrees with Study 7's text].
4. **Misleading constant name.** `schedule.poolSobol` (`S8/context.ts:182`) is the joint **LHS** count
   (`S8/search.ts:84, 354`). Study 7's comment "pool centres from a joint Sobol" (`S7/context.ts:205`) is wrong about
   its own code.
5. **The T2 bootstrap resample count (2,000)** appears only in code (`S8/search.ts:793`); the protocol table leaves it
   blank.
6. **Mixed fidelity in the shortlist pool.** T2-rescored configurations (≈ 256 points, family `r3+r3b`) compete with
   128-point rung-3 fits in the same `rankOrder` and picks (`S8/search.ts:810-835`).
   - The archive audit notes that rescored values were not kept for non-shortlisted configurations
     (`AA/RECOMMENDATION.md:109`).
7. **Screen promotion is a weak seed.** 0–11 rung-1-feasible centres per job (§5.1). The protocol and reports never
   say the GA began from essentially infeasible populations [RECORD].
8. **Stale section references** in code comments, inherited from Study 7: `S8/designs.ts:121` "§5.3",
   `S8/stats.ts:1` "§5.4", `S8/fitness.ts:19,129` "§7.1" (the C-constraints are §6 in Study 8), `S8/evidence.ts:275`
   "§11.1". Cosmetic.
9. **Disclosed departures** [DOC]:
   - parity attempt 1 failed P5 because of a check defect, fixed and rerun in full (E1, completed in E2);
   - the `study8-run` adapter does not append to the door log, contrary to `PROTOCOL.md §3.2` (E3);
   - the user's modified `distributions.csv` makes `verify-chain` flag that pin in the main checkout (E4).
10. **Fidelity caveat** [DOC]. The n = 16 precision rule was validated on ≤ 24-D and a 4.5-year window (Study 7),
    then extrapolated (`R8/PROTOCOL.md:23-25`).
    - The archive audit later measured how rung-1 results hold up when re-measured at 64 points: Spearman 0.88, robust
      profit falling 4.9–6.5%, and a 15/16 share keeping ≥ 0.90 at 64 points only 52% of the time
      (`AA/PROFIT_ROBUSTNESS_FRONTIER.md:23-56`).

**No discrepancy was found in the substantive rules.** The protocol §5–§8 text matches the code for the budgets,
radii, probe set, seed labels, objectives, constraints and thresholds, rung sizes and distinctness, T1–T3,
refinement acceptance, shortlist picks, Q/E gates, role orders, tier, and T1–T7 with their status rules.

- The pre-test audit independently recomputed every Q/E flag of all 180 members, the 129 role rows and the fold
  rankings: 0 mismatches (`R8/reviews/PRE_TEST_AUDIT.md:12-20`).
- The final audit re-derived every T status: 0 mismatches (`R8/AMENDMENTS.md:145-147`) [DOC].

## 12. What the archive audit concluded (`research/study8-archive-audit/`, `b31ce7c`)

Read-only over the sealed records. No replay or new door [DOC/AUDIT].

- **Selection validity** (`AA/OPTIMIZER_SELECTION_AUDIT.md:29-160`):
  - **Funnel:** the shortlist step lost nothing at the top. The best rung-3-feasible non-shortlisted configuration is
    0.2–6.1% *below* the best shortlisted one; the V figure is −0.2%.
  - **Constraints:** from rung 2 on, no F24 record violates C3, C4, C6 or C7. Rung-1 constraint recomputation had 0
    mismatches.
  - **Pooled tracks:** no non-risk criterion discarded a materially more profitable, risk-feasible configuration at
    ≥ 64 points.
  - **G exception:** one G configuration (+8% at rung 3, 90.6% share) was excluded only by L∞ 0.032 distinctness and
    never measured at 384 points.
- **Saturation** (`:162-283`):
  - **Islands:** 124 of 130 were budget-stopped. The 32/40-D islands were still climbing; their last quarter added
    10–28% of final hypervolume, against 0.3–8% in G/V. The search was budget-bound, not converged.
  - **Frontier:** the top is flat within estimation noise.
  - **Overfitting signs:** PBO > 0.5 in 20 of 30 track-folds (F24 V 0.81). Training rank against test net is −0.32 to
    +0.11 on F19–F23 and +0.27 on F24. The F24 optimum lies L∞ 0.42–0.97 from the other folds' optima.
  - **Recommendation:** no extra local exploration under the same objective. If any compute is spent, re-measure
    rung-1/2 leads at ≥ 128 points.
- **Persistence** (`AA/VALIDATION_PERSISTENCE_AUDIT.md:61-166`):
  - **Risk:** once training covered 2020 and 2022 (F23 + F24), training share predicted test share (ρ +0.90) and p90
    DD (ρ +0.92).
  - **Profit:** training share went with *lower* test profit (ρ −0.48).
  - **F19–F21:** every member failed (108 of 108), whatever its training share.
- **Recommendation** (`AA/RECOMMENDATION.md:90-113`):
  - no fitness change;
  - record-keeping improvements for future studies: persist per-neighbour results or the C3–C7 inputs at rung 1,
    keep T2-rescored values, record island origin, and keep point caches until the report is sealed.
  - It also notes, as an observation and not a reranking, that #2 VG balanced, not #1, meets ≥ 95% at every
    measurement.
- **The audit made no claim of a code defect and modified nothing.** Its scripts and outputs are hash-manifested
  (`AA/outputs/MANIFEST.sha256`).

## 13. Facts directly relevant to a VGT-only reuse (from the V track; not recommendations)

- **The single-book path was a full Study 8 track in every fold**, with the same budgets as G: 8,192 Sobol, 4
  islands × 64 × 2,048, and ≈ 170k–195k points per fold [RECORD].
- **VGT alone was the economically tightest track.**
  - Rung-1 feasible share on F24: 8.5% (`AA/OPTIMIZER_SELECTION_AUDIT.md:239`).
  - Rung-3 feasible: 11/48 on F24 and 2/51 on F19. C5 (median ≥ $10k/yr) bound most often.
  - Its F24 holders' confirmation robust/yr was $7.4k–$8.9k, against B1's ≈ $7.9k–$8.2k.
  - Two of its four F24 holders failed T5 (top-lot concentration) on the test door.
  - The best rung-3 robust/yr was $10.6k / $9.7k / $11.1k / $12.5k / $9.0k (F19 / F20 / F21 / F23 / F24).
- **Frozen B1 (VGT `primary`) is infeasible on the F24 training window under C7** (top lot > 25%)
  (`R8/SEARCH_AND_COMPUTE.md:66`) [DOC].
- **Every protocol threshold is in dollars** on a $100k notional: $35k minute-DD ceiling, $10k/yr median, $11k per
  capital-year, $5k/yr ex-best-year, $10k·yTest test net. All of them, and the box and radii, would need explicit
  re-justification for a 1-minute intraday VGT variant before any search, under a new frozen protocol.
