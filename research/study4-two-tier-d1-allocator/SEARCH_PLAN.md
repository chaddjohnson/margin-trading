# Search plan — Study 4 (budgets, genomes, optimizers, seeds) — revision 2

Bound by the protocol freeze. Budgets are **evaluation counts** (never time limits), each a floor that is always spent
in full in every window (F20, F21, F22, F23, H), whatever earlier phases or experiments show. Every search reads only the
development sessions of its window through its own door; no evaluation-year information exists in the process.

## 1. Throughput calibration (outcome-blind, synthetic)

Measured 2026-10-29 on this machine (16 cores, 59 GB RAM, Node v24.21.0) on synthetic 2,012-session × 390-minute markets
(`src/study3-vgt-momentum-stage1b/tests/synthetic.ts`; no market data): one frozen `ShadowBook` trace 5–8 ms; the frozen
fixed-pool replay 3.0 / 5.7 / 8.4 ms for 5 / 7 / 9 books; a Study 4 evaluation of 5 deep + 2 new shallow books (four new
traces including the frequency reference vectors, plus the replay) 25 ms; the replay alone 7.9 ms. Planned: 14 worker
threads sharing the loaded datasets (SharedArrayBuffer), about 2,000 traces/s and 500–1,000 pool evaluations/s
(development windows average about 75% of the full length). Memory: 61 symbols × ~785,000 bars × 5 float64 ≈ 1.9 GB
shared, plus per-worker trace caches (LRU, 20,000 traces).

## 2. Seeds

Master seed label `study4-v1`. Every stream is `deriveSeed('study4-v1', phase, window, experiment, island, …)`
(`src/optimizer/rng.ts`). 4A Sobol streams are seeded by (phase, symbol) only, so the same design is used in every window
(paired across windows; X maps into each window's band).

## 3. Phase 4A (per window, per symbol with a non-empty shallow band)

- Design: 4,096 unique grid vectors from the scrambled 8-dimensional Sobol stream (dimension order X, Y, stop, hold,
  L, buffer, P, W), each coordinate mapped to its grid offset in the band/box.
- Refinement: 16 seeds = 8 best by standalone net (minute DD ≤ $35,000) + 8 best by idle-clean net, greedily diverse
  (normalized L1 grid distance ≥ 0.15); 64 children each (50% one coordinate ±1..3 step units, 50% 2–3 coordinates
  ±1..2 units; reflected into the band/box; duplicates redrawn) → 1,024.
- Each vector also traces its frequency reference vector (X = 0.85 σ). Floor per symbol and window: **5,120 vectors**
  (10,240 traces). Expected total ≈ 55 symbols × 10,240 × 5 windows ≈ 2.8 million traces.

## 4. Phases 4B and 4C (per window)

Deterministic run lists (PROTOCOL §7.2–7.3): 4B = |𝓛| singles + greedy subsets (2 variants × up to 3 rounds × 40
candidates) + dual-phenotype sets + gates (5 × 10) + SA; 4C = 15 policies × (4B pick + SA + 10 singles + 5 subsets).
Every listed run is executed; the counts are recorded. Each phase's selection (§8) adds its robust-step perturbations.

## 5. Phase 4D genomes

- **Shallow gene:** (symbol ∈ symbols with a non-empty band in w, vector in B_sh(symbol, w)); the shallow tier carries a
  priority order (a permutation, mutated by swaps).
- **Deep gene (4D-B):** for each of B5's five books, mode ∈ {incumbent, reoptimized}; a reoptimized book carries a vector
  in its neighbourhood (PROTOCOL §5).
- **Deep gene (4D-C):** a set of 1–6 deep books, each (symbol ∈ U61 with a non-empty deep band, mode ∈ {B5 incumbent (B5
  symbols only), broad vector}); at most one deep book per symbol.
- **Allocator gene:** policy kind ∈ {P0, P0M, P1, P2, P3, P4} (P2L only in 4C and 4E; 4D-A0P: P0 only); P3 budget B ∈ {0,
  250, …, 5,000} dollars and filter f ∈ {any, deep-path}; P4 deadline D ∈ {0, 1}; gate ∈ {G0, G1, G1d, G2(0.5), G2(0.75),
  G2(0.9)}.
- Shallow cardinality 0–4 (4D-A, 4D-A0P, 4D-B, 4D-C); two shallow books may share a symbol; a shallow book may share a
  symbol with a deep book. Deep-only controls (4D-B0, 4D-C0) fix the shallow tier empty and the policy to P0/G0.
- Every vector passes the role checks of PROTOCOL §5 (a child is first repaired by reflection into its bounds; a
  frequency role-check failure is recorded and counted as an evaluated, infeasible configuration).

## 6. Phase 4D optimizer (per experiment and window)

Hierarchical, group-aware, mixed discrete/continuous, constrained multi-objective, in **four independent seeded islands**
(each with a quarter of every stage's budget; no migration), pooled for selection:
1. **Initial design** (space-filling): cardinality stratified (equal shares of 0…4 shallow books; 4D-C deep size
   stratified 1…6), symbols drawn by stratified rotation so every eligible symbol appears in ≥ ⌊N / |symbols|⌋ books,
   vectors 50% from 𝓛(w) members of that symbol (if any) and 50% fresh Sobol points of the band, policy and gate
   stratified.
2. **Evolution:** NSGA-II style with constrained domination (feasible ⟹ better; among infeasible, smaller total
   violation; among feasible, Pareto rank then crowding) on objectives (Δnet ↑, minute DD ↓, P&L-weighted preservation ↑);
   binary tournaments; group crossover (children inherit books by tier from either parent; same-symbol collisions kept as
   duals up to the cardinality cap) with probability 0.6; then one mutation: vector step (1–3 coordinates ±1..3 units),
   symbol swap (vector re-mapped into the new band), add/remove a shallow book, shallow-priority swap, policy
   kind/parameter change, gate change, deep mode toggle (4D-B) or deep membership change (4D-C). Population 400 per
   island generation (μ + λ). The two-dimensional hypervolume of the feasible population front in (Δnet, minute DD)
   with reference point (Δnet = 0, minute DD = $35,000) is recorded per generation (preservation enters through the
   sorting and the feasibility constraint).
3. **Refinement:** first a floor of 100 one-coordinate neighbours around the best configuration of every evaluated cell
   (shallow cardinality × policy kind × gate), then the 50 best by the primary feasible score share the rest equally.
4. **Selection:** PROTOCOL §8 on the pooled evaluations (its perturbations are counted separately); each island's own
   pick is also recorded (seed stability).

| Experiment | Initial | Evolution | Refinement | Floor per window | × 5 windows |
|---|---:|---:|---:|---:|---:|
| 4D-A | 40,000 | 160,000 (4 × 100 gen × 400) | 40,000 | **240,000** | 1,200,000 |
| 4D-A0P (P0-only control) | 40,000 | 160,000 | 40,000 | **240,000** | 1,200,000 |
| 4D-B | 40,000 | 160,000 | 40,000 | **240,000** | 1,200,000 |
| 4D-B0 (deep-only control) | 40,000 | 160,000 | 40,000 | **240,000** | 1,200,000 |
| 4D-C | 64,000 | 272,000 (4 × 170 gen × 400) | 64,000 | **400,000** | 2,000,000 |
| 4D-C0 (deep-only control) | 64,000 | 272,000 | 64,000 | **400,000** | 2,000,000 |
| Total 4D | | | | 1,760,000 | 8,800,000 |

**Predeclared training-only extension (once per experiment and window):** if the best feasible primary score of the
pooled islands improved by more than $5,000 during the last 25% of the evolution generations, every island's evolution
continues for 50% more generations (recorded). No other budget change is allowed; nothing from any evaluation year can
trigger anything.

## 7. Phase 4E budgets

Per fold and pick (≈ 20 picks and ablations): 1 continuous run; 64 perturbations (+ 64 for its shallow-off ablation);
one-at-a-time profiles (8 coordinates × 5 steps per book for 4D picks); 9 financing/cost settings; 6 execution stresses;
selection skill 200 runs per experiment; random-champion null 100 replicates per experiment and fold (each a §8
selection on a one-tenth subsample of that fold's evaluated configurations, its robust step scaled in proportion: the 5
best structurally distinct feasible configurations × 24 perturbations = 120 development evaluations; then its chained
evaluation). Overlay as available. Expected ≈ 0.4 million development and 0.1 million evaluation runs.

## 8. Records per search

`results/<window>/<phase or experiment>/`: `RECORD.json` (sealed: budget used per island and stage, seeds, counts of
feasible / infeasible / role-failed / duplicate evaluations, extension flag, hypervolume trace, runtime, worker count),
`top.json` (500 best by the primary score with full genomes and metrics), `pareto.json`, `islands.json` (each island's
pick); raw per-evaluation metrics as `evaluations.jsonl.gz` (git-ignored, hash recorded). The sealed selection for the
window is `results/selections/<window>/SELECTION.json`.

## 9. Multiplicity register

Recorded in every phase report: number of configurations evaluated, parameters per configuration (shallow books × 8 +
reoptimized deep books × 8 + allocator parameters), number of selection rules, folds and experiments; 61 symbols and 4
correlated years. No statistical significance is claimed. The comparison of 4D-A with 4B/4C is not budget-matched
(4D-A0P and the deep-only controls are).
