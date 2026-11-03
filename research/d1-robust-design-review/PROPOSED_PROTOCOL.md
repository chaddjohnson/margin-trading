# Proposed protocol: robust D1 pool discovery over an expanded ETF universe (for the Phase 2 study)

Status: **design, not frozen.** This is the protocol the Phase 2 study is expected to copy into
`research/d1-robust-pool-discovery/PROTOCOL.md`, declare constant-for-constant in `src/d1-robust/context.ts`, and
freeze (`freeze-protocol`, write-once, body hash) **before** any candidate figure of the expanded universe exists.
Open items the user must settle first are in OPEN_DECISIONS.md; defaults are written into this text so that the
protocol is complete as it stands.

Companion documents define the pieces this protocol references: NEIGHBORHOOD_AND_OBJECTIVES.md (N-classes, J, F1–F4,
pilot rules), WALK_FORWARD_AND_EVIDENCE.md (rounds, barriers, G-WF, C1–C4, grades), ETF_UNIVERSE_AND_DATA_INGESTION.md
(eligibility D1–D5, tiers, ingestion), R1_R4_RESEARCH_RUN_DESIGN.md.

## 0. Prior failure or request → design choice → verification

| Prior failure / user request | Design choice | How it is verified |
|---|---|---|
| Universal 75% joint-retention gate failed every pool including the benchmarks | retention ratio removed as a gate; dollar neighbourhood median P50 becomes the search objective; absolute neighbourhood risk ceilings; calibrated materiality margin | pilot §4 reports control distributions; gates G1–G8 contain no ratio-of-peak clause; `context.ts` ↔ protocol line-by-line |
| Peak-net search then robustness veto | neighbourhood fitness at every stage (discovery n_D, promotion 64, refinement 32, finalists 2 × 128) | every archive record carries P50/Q25/DDmed; tests assert the ranking key is J |
| Per-configuration perturbation seeds (lucky-noise selection) | common random numbers per (window, stage, draw); independent confirmation batches A/B | seed-label tests; reported A/B difference per finalist |
| Clamping at bounds flattered boundary vectors | reflection; boundary-sitting coordinates counted and labelled | unit test on step frequency at bounds |
| Inert books inflate Pareto fronts | scalar objective, activity floor F3, λ per book, non-inert members required | archive statistic "inert members" must be 0 among feasible records |
| Leaders = incumbents' own inspected vectors | fold rounds exclude control vectors from the library; final round flags them; R1/R4 inspect-only | library provenance flags; tests that fold libraries contain Sobol vectors only |
| No time-ordered validation of the *procedure* | two walk-forward rounds with random-control percentiles, raw-net ablation, procedure gate G-WF | PICKS.json frozen before validation load; mutation test; B1/B2 barrier tests |
| 2024–2026 treated as a holdout | secondary locked confirmation that can only block (C1–C4) | evaluation door opens only after FROZEN_SELECTION.json verifies; single run + confirm |
| VGT-anchored 16-ETF universe | category-based expansion under data-quality eligibility; coverage floor in discovery | `results/audit/universe.json` lists every symbol's rule outcome; coverage report per symbol |
| Breadth structurally dominated by one-lot occupancy | hard $35k ceiling, λ, compact alternates, congestion diagnostics; cardinality unrestricted | cardinality table of the archive; refusal matrices for finalists |
| Price-only lots vs dividend-bearing VGT lots | fixed pool symmetric; portfolio reported under frozen and symmetric conventions; gates on symmetric | engine `lotDividends` flag; both runs in every finalist record |
| R1/R4 never run on `all`; no CLI exists | opt-in `research-run` with provenance from `robust.json`, training reproduction first, retrospective label | runner tests: refuses without flag, refuses other keys/partitions, isolation from search modules |
| Data retry could delete canonical files | deletion restricted to `data/<SYMBOL>.csv` of the symbol in progress with an attempt log; import's temp+rename reused | adversarial-path unit test; post-ingest hash of canonical files |
| Secrets in logs | `.env` loaded by `node --env-file-if-exists`/shell export only; outputs tested with dummy values | credential-leak test |

## 1. Question, hypotheses and outcomes

**Question.** Over an expanded, data-quality-gated ETF universe, which nonempty subsets of D1 books with jointly chosen
eight-parameter vectors give **stable** net profit through one causal shared margin pool at acceptable risk — where
"stable" means a high neighbourhood median and lower quartile on training (E1), a selection procedure that persists
forward inside training (E2), and no reversal on the inspected 2024–2026 window (E3)?

**Hypotheses (tested, not assumed).** H1: selecting on neighbourhood fitness yields fold picks that persist better than
selecting on peak net (the ablation). H2: at least one structurally different pool (Jaccard distance ≥ 0.5 from B5's
membership) has smoothed training fitness within M of B5's at equal or lower neighbourhood risk. H3: adding
correction mechanisms beyond sector equities (rates, credit, non-US, real assets) improves a compact pool's smoothed
fitness. Each may be rejected.

**Outcomes.** (a) up to one primary and two alternates nominated and frozen, then confirmed or blocked on 2024–2026;
(b) **no advancement**, with the reason (G-WF failed; no finalist passed G1–G8; all nominees blocked by C1–C4). Both
are first-class results.

## 2. Invariants (restated for the implementing agent; each has a test)

1. All eligible ETFs, VGT and VOOG included, are candidate books; no book is compulsory; the universe is the set of
   symbols passing D1–D5, nothing else.
2. The 60/40 VOOG/VGT core of the $300,000 portfolio is fixed whatever the pool; VGT/VOOG lots are separate from core
   shares (existing P2 checks).
3. The objective is the shared pool's causally funded outcome; standalone figures are diagnostics only; there is no
   standalone optimization track.
4. Neighbourhood statistics drive discovery, promotion and refinement; they are not a post hoc veto.
5. R1/R4 `all` runs are a separate, labelled, opt-in diagnostic (Phase 2), reading archived vectors; the 16-ETF manifest
   and records are untouched.
6. The optimizer reads the training partition only, through `access: 'optimization'`, with the round's `endDate`;
   holdout/final/all open only through the benchmark door, the post-freeze evaluation door and the retrospective door.
7. No data are downloaded in Phase 1; Phase 2 ingestion follows ETF_UNIVERSE §8 exactly.
8. No secret value appears in any command line, log, report, JSON or commit.
9. Fixed $100,000 per lot (11% simple interest, per-side cost in bps, no compounding) and the compounded 20%-of-equity
   portfolio with the core are different analyses and are never mixed in one figure.
10. No configuration is called a future-proof winner; the best grade available is "primary forward-test candidate".

## 3. Data, universe and access (Stage S0)

- Canonical files `data/<SYMBOL>/data.csv`; `data/partitions.json` (sha256 recorded); splits forward-adjusted once
  from `config/market-events/splits.json`; VGT/VOOG distribution ledger as today; sessions 09:30–16:00 ET.
- **Universe** U = every symbol passing D1–D5 after ingestion of Tier 1 (and Tier 2 if completed). The 16 existing
  symbols are re-audited under the same rules. U is written to `results/audit/universe.json` with each symbol's rule
  outcomes and frozen with the protocol (the freeze hash covers it). Expected |U| ≈ 40–60.
- **Doors** (`src/d1-robust/data.ts`): `trainingUniverse(w)` — all of U on `training`, `access: 'optimization'`,
  `endDate` = the round's search end; `benchmarkUniverse` — B1/B4/B5/C0 members on `all` (results already inspected);
  `evaluationUniverse` — after `FROZEN_SELECTION.json` verifies; `retrospectiveUniverse` — R1/R4 only, flag-gated.
- **Audit before anything else:** `npm run datasets -- verify`, `npm run market-events -- verify`, calendar identity
  across U (same 2,710 sessions, same open/close schedule), splits applied exactly once, coverage and volume tables,
  VOOG-style sparsity flags, the common last session. Any failure blocks the symbol (recorded), not the study.
- **Controls to reproduce before any candidate figure:** B1/B4/B5/C0 training and `all` figures to the cent against
  `research/joint-16-etf-d1/results/controls/controls.json` (fixed and portfolio, four costs), in the expanded
  universe load (the extra instruments must not change any benchmark output).

## 4. Pilot calibration (Stage S2; per round window; NEIGHBORHOOD §8)

360 random configurations (9 cardinality strata × 40), each with centre, N1 at A1 (n = 64) and A2 (n = 64), N2
(n = 32), N3 (n = 8 per member), N0 probes; machinery checks (shareAbove 0.5 ± 0.05; zero amplitude exact; replay =
engine on 8 random neighbours per stratum; reflection frequencies); persistence diagnostic on the final window; then
`pilot_freeze.json` with **M_w** = max($25,000, median MAD of centrally feasible k ≤ 6 controls) and **n_D,w** ∈ {8, 12,
16} by the standard-error rule. No other constant depends on the pilot. The pilot's configurations and statistics are
published in full (they are also the walk-forward control distribution).

## 5. Library (Stage S3; per round)

1,024 scrambled-Sobol vectors over the unchanged box, seed `deriveSeed('robust-d1', 'library', 'sobol-scramble')`
(identical in every round), traced on every symbol of U at 5 bps and pinned. **Final round only:** the control set
(D1 constants; eight-ETF nominations; previous-study candidate vectors; B5's GDX vector) is added with provenance flags
`inspectedPostTraining: true`. **Fold rounds:** Sobol vectors only. Standalone diagnostics are recorded and never read
by any later stage.

## 6. Discovery (Stage S4; per round and arm)

**Genome.** Membership mask over U (nonempty) plus one vector per symbol (latent when inactive); evaluation key =
sorted `symbol:vectorId`. Operators as in the 16-ETF study (`genome.ts`: add 0.15, remove 0.15, swap 0.10, paramOne
0.25, paramMulti 0.15, reset 0.10, crossoverOnly 0.10; crossover exchanging (bit, vector) pairs with SBX η 15 on shared
members, polynomial mutation η 20; repair of empty masks), unchanged except that every vector stays on the grid and
mutation steps are not confined to step units (the search explores; the neighbourhood measures).

**Fitness.** Feasibility F1–F4 with violation v; ranking by J = P50 − λk at n_D CRN draws (stage label `'disc'`), ties by
Q25 then key. (μ + λ) elitism, binary tournaments on (feasible, v, J) — **no Pareto front, no drawdown or books
objective**. Each evaluated configuration = 1 centre + n_D neighbour replays (traces cached by (symbol, vector, cost)).

**Islands** (per arm): 8 islands, population 48, cap 2,000 unique new evaluations each (16,000 per arm) in the final
round and **1,000 each (8,000 per arm) in a fold round** (the fold budget referenced by WALK_FORWARD_AND_EVIDENCE.md
§3; promotion 150, refinement ≤ 4 families × 500 in a fold round), migration every 8 generations of 4 genomes along a
ring, stall stop after 3 generations without a new unique child. Initial populations
(outcome-independent): I1, I2 uniform cardinality 1–16 over U; I3 sparse 1–3; I4 medium 4–8; I5 broad 9–16; I6
category-stratified (one member per category group of ETF_UNIVERSE §3, cardinality 2–5); I7 singletons (each symbol of
U with 2 library vectors, filled uniformly); I8 **arm-specific**: unseeded arm → uniform 2–6; seeded arm → B1, B4, B5
and 29 one-move mutants plus uniform fill.

**Arms.** Final round: **unseeded (primary)** and **benchmark-seeded (secondary)**, identical budgets and seeds except
I8 and the arm label in the seed. Fold rounds: unseeded only, plus the **raw-net ablation arm Q** (WALK_FORWARD §5)
at the same budget. Arms never share archives; cache hits across arms are allowed only for traces (pure functions).

**Coverage top-up** (predeclared): after the islands, any symbol of U appearing in < 400 evaluated configurations or
with < 150 distinct vectors gets a top-up island (population 32, 1,000 evaluations, initial genomes = that symbol with
library vectors in random 1–5-book subsets); total top-up budget ≤ 15% of the arm's discovery budget, allocated in
alphabetical symbol order until exhausted.

**Logged per evaluation:** the 16-ETF archive's fields plus P50, Q25, P10, MAD, DDmed, DD90, feasShare, shareAbove,
moved coordinates, n, stage label, arm, island/generation/operator, behaviour key.

## 7. Promotion of families (Stage S5)

1. Pool the arm's feasible archive (final round: both arms, provenance kept). Re-evaluate the **top 300 by J** at
   n = 64 CRN (label `'promo'`); re-apply F1–F4 at n = 64 (provisional feasibility settled here). Also at this stage:
   centre and N1 (n = 32) at 0/2/10 bps; full-engine 20% portfolio at 5 bps on the window (daily % DD ≤ 35% required
   from here on).
2. **Families.** Two configurations belong to the same family when membership Jaccard distance < 0.5 **and** funded-trade
   overlap ≥ 0.5 (share of funded decision minutes in common, in the centre runs) **and** the Spearman correlation of
   their regime-attribution vectors ≥ 0.7. Single-linkage over the 300; family representative = highest J (n = 64).
3. **Promote ≤ 8 families** by representative J with: at least one representative with ≤ 3 books (if any is feasible),
   at least one with Jaccard distance ≥ 0.75 from B5's membership (if any is feasible), and, in the final round, at
   least one from the unseeded arm among the top three (if any). Promotion ties within M/2 go to the smaller
   membership, then to the unseeded arm, then to the key.
4. Record every family's membership, representative, size, J interval, and the reasons for promotion or not.

## 8. Joint refinement (Stage S6; per promoted family, ≤ 6 families by representative J)

Maximize J at n = 32 CRN (label `'refine'`) with feasibility F1–F4, accepting a move only when J rises by more than
**M/5** (≥ $5,000) — a paired comparison under CRN. One cycle: (i) membership pass — remove each member (if ≥ 2); add
each inactive symbol with 3 library vectors; swap each member for each inactive symbol with 1 library vector; (ii)
coordinate pass — for each member in alphabetical order, the in-box one-coordinate probes (±u_j, ±2u_j), best
improving probe accepted before the next member; (iii) pair pass — 32 random moves of two coordinates on two different
members (±u_j each); (iv) joint pass — 16 random moves of one step unit on every coordinate of one member. Members may
be frozen within a pass for compute but every member is eligible every cycle. Cap **800 unique evaluations per
family**, at most 3 cycles, stop when a cycle accepts nothing. Every accepted move is logged with the funded-lot
changes it caused.

## 9. Assessment (Stage S7; refined families and B1/B4/B5; R1/R4 as inspect-only comparators in the final round)

For each finalist and benchmark, on the round's window:

- **Confirmation batches**: N1 at n = 128 under `'confirm-A'` and under `'confirm-B'`; reported P50/Q25/P10/MAD/DDmed/
  DD90/shareAbove with bootstrap 90% intervals; A/B difference.
- N1-A2 (128), N2 (64), N3 (8 per member), N0 probes; boundary-sitting coordinate count; retention (descriptive).
- Centre at 0/2/5/10 bps; one-member exclusions with **smoothed** marginal (J with vs without, n = 64); refusal matrix,
  utilization, same-minute contested grants, tie-order sensitivity (reverse + 2 seeded orders), top-2 lots share,
  best-regime share, fold/regime/year attribution.
- Full engine: fixed at four costs (replay parity field for field) and the 20% portfolio at four costs under both
  dividend conventions; B5's ladder 10/15/20/25/30% at 5 bps; matched-borrowing comparison; excess drawdown over C0.
- Capacity flags (ETF_UNIVERSE §5) and the brokerage-constraint label for Vanguard-issued books.
- Portfolio neighbourhood check: 16 N1 neighbours in the portfolio at 5 bps (descriptive).
- PBO (CSCV, S = 8 and 16) of the round's archive and of the finalist set (descriptive).

## 10. Gates, ranking and nominations (final round; a finalist **passes** when all hold, 5 bps unless stated)

```
G1 technical    replay = full engine (fixed, every cost) field for field; identity tie order = canonical; every member
                passed the audit; confirm-A/B P50 differ by ≤ 2 × pooled SE
G2 risk         F1 (DD ≤ $35k at 5 and 10 bps); F2 at n = 128 (DDmed ≤ $35k, DD90 ≤ $45k); portfolio daily % DD ≤ 35%
                on training (if in (30%, 35%]: all margins below double)
G3 activity     F3; every member's smoothed marginal (J with − J without, n = 64) > 0
G4 costs        P50(10 bps) > 0 and ≥ 0.80 × P50(5 bps) [confirm-A]; centre net > 0 at 0, 2, 10 bps
G5 tails        Q25 ≥ 0 [confirm-A]; centre net − two largest lots > 0; centre net − largest positive regime > 0
G6 materiality  P50_A(C) ≥ P50_A(B5) + M  and  P50_A(C) ≥ P50_A(B4) + M  and  Q25_A(C) ≥ Q25_A(B5)
                and  P50_A(C) ÷ DDmed(C) ≥ 0.90 × P50_A(B5) ÷ DDmed(B5)     (all under identical draws)
G7 borrowing    training portfolio ending equity (symmetric dividends) ≥ B5's ladder (symmetric) interpolated at the
                finalist's borrowing-dollar-days (extrapolation flagged; an extrapolated pass is labelled)
G8 stability    centre net change under any tested tie order ≤ M; boundary-sitting coordinates ≤ 25% of 8k
                (else the label "box-constrained" and the finalist cannot be primary)
```

**Ranking** of passing finalists: J_A = P50_A − λk, descending; ties within M/2 → smaller k, then unseeded provenance,
then key. **Nominations (≤ 3):** primary = top; alternate 1 = top with Jaccard distance ≥ 0.5 from the primary;
alternate 2 = top with ≤ 3 books and distance ≥ 0.5 from both (or distance ≥ 0.5 from both if a compact nominee already
exists). A finalist labelled capacity-limited or box-constrained may be an alternate, not the primary. If **G-WF
failed** (WALK_FORWARD §6), nothing is nominated whatever G1–G8 say. If no finalist passes, the outcome is **no
advancement** and nothing is evaluated after training.

**Fair baseline.** A nominee that trails B5's optimized **peak** but beats B5's **smoothed** P50 by M under identical
draws passes G6; the peak is reported (E0) but is not a bar. All comparisons with B4/B5 use identical windows, costs,
draws, dividend convention (symmetric) and the matched-borrowing ladder.

## 11. Selection freeze, locked confirmation and recommendation (Stages S9–S11)

1. `freeze-selection` writes `FROZEN_SELECTION.json` once: nominees (members, grids, book and tie order), benchmarks,
   gate results, rankings, G-WF record, the pilot freeze, seeds, budgets, evaluation counts, code/data/partition/split/
   ledger/universe hashes, parity signatures, authorized commands; body hash recorded.
2. `evaluate` once (`--confirm` re-run allowed): continuous `all` for nominees, B1, B4, B5, C0 (fixed and portfolio,
   four costs, both dividend conventions, B5 ladder), segment attribution, bridges, two-largest-lots dependence,
   omitted-distribution bounds, replay parity on fixed runs. Apply **C1–C4** (WALK_FORWARD §9) mechanically.
3. **Recommendation:** the highest-ranked nominee passing C1–C4 is the **primary forward-test candidate**; alternates
   passing are listed; nominees failing are "blocked on inspected history (which rule)". If none passes, the frozen
   benchmarks are retained exactly as previously recommended. No rescue, re-ranking or rule change after the evaluation.
4. Only an accepted nominee's new phenotypes may be registered under `config/phenotypes/D1/<SYMBOL>.json` (new files or
   new named phenotypes; existing phenotypes never modified). Nothing is traded.

## 12. Compute schedule (indicative; unit costs from the 16-ETF study on a 10-core/16 GB machine, single core unless
stated: trace ≈ 10–14 ms; replay 3–13 ms by member count; full engine 0.15–7 s; 16-file load 72 s)

| Stage | Full tier | Evaluations (≈) | Single-core estimate | Fallback tier (changes nothing but budgets) |
|---|---|---:|---:|---|
| Load + audit + controls + parity (|U| ≈ 40) | once | — | 15–25 min | same |
| Pilot per window (× 3 windows) | 360 × ≈ 170 + 8k neighbours | ≈ 65k/window | ≈ 1.5 h/window | 20 per stratum (half) |
| Library per round (× 3) | 1,045 × |U| traces | ≈ 42k/round | ≈ 10 min/round | same |
| Discovery, final round, 2 arms | 2 × 16,000 configurations × (1 + n_D) | ≈ 420k replays, ≈ 1.2M traces | ≈ 5–6 h | 1 arm (unseeded) × 10,000 configs, n_D = 8 |
| Discovery, fold rounds, arms J + Q | 2 folds × 2 arms × 8,000 × (1 + n_D) | ≈ 420k replays | ≈ 5–6 h | 2 folds × 2 arms × 5,000, n_D = 8 |
| Top-up islands | ≤ 15% of discovery | — | included above | included |
| Promotion (× 3 rounds) | 300 × 65 + costs + portfolio | ≈ 25k/round | ≈ 30 min/round | 150 |
| Refinement (× 3 rounds) | ≤ 6 × 800 × 33 | ≈ 160k/round | ≈ 2.5 h/round | ≤ 4 families × 500 |
| Assessment (× 3 rounds) | ≈ 9 × 700 + full-engine runs | ≈ 6k/round | ≈ 30 min/round | same |
| Validation runs, locked confirmation | full engine | — | ≈ 20 min | same |
| **Total** | | | **≈ 25–30 h single core; ≈ 4–5 h with 8 worker threads** | ≈ 40% of full |

Rules: budgets are fixed in **evaluations**, never in time; the tier is chosen **before** any search result from a unit-cost
benchmark (`npm run robust-d1 -- benchmark`: 200 random configurations' trace and replay times on the loaded universe)
by the predeclared rule "full tier if the projected single-core total ≤ 36 h or worker threads are available with
≥ 6 cores; else fallback"; the chosen tier is recorded in the protocol freeze. No budget is raised or lowered after a
result is seen; an island that stalls returns its budget to nothing (not reallocated). Worker threads evaluate pure
(configuration, window, cost, draws) → record functions; island RNG and acceptance logic stay on one thread; results
are reduced in sorted-key order so logs are byte-identical whatever the scheduling (determinism check as in the
16-ETF study: Stages S3–S4 re-run and compared byte for byte).

## 13. Order of execution (Phase 2)

```
S0  freeze-protocol → ingest (ETF_UNIVERSE §8) → audit → universe.json → controls → benchmark unit costs → tier recorded
RR  research-run R1/R4 (four commands, labelled; R1_R4 §7)
S1  parity matrix on U (P0 frozen = N-book on B1/B4; P1 replay = N-book: singletons of every symbol with D1 constants
    and a library vector, random subsets of 2/4/8/12/16 incl. VOOG and XOP and no-VGT, benchmarks, 16-book extremes;
    P2 portfolio consistency; P4 determinism) — blocks everything on any difference
S2  pilot on fold a, fold b, final windows → pilot_freeze.json (M_w, n_D,w)
S8a fold a: S3 library → S4 discovery (arms J and Q) → S5 → S6 → S7 → PICKS.json → validation runs
S8b fold b: the same → G-WF decided and recorded (results/walkforward/GWF.json, write-once)
S3–S7 final round (arms unseeded + seeded; controls in the library, flagged)
S9  freeze-selection (even when the outcome is no advancement)
S10 evaluate (once) → C1–C4
S11 tables and reports
```

## 14. Reports and records (all under `research/d1-robust-pool-discovery/`)

README, PROTOCOL, DATA_AND_UNIVERSE_AUDIT, PILOT_CALIBRATION, CACHE_AND_CAUSAL_PARITY, WALK_FORWARD_RESULTS (both
folds, both arms, controls, G-WF), SEARCH_COVERAGE, FAMILIES_AND_REFINEMENT, ROBUSTNESS_AND_GATES, FROZEN_SELECTION.json,
HOLDOUT_FINAL_RESULTS (the locked confirmation), RETROSPECTIVE_R1_R4 (pointer to `evaluations/robust-d1/retrospective/`
with the label), IMPLEMENTATION_AUDIT, RECOMMENDATION; `results/` with JSON/CSV records, every evaluation as one JSON
line (git-ignored logs with sha256 in the manifest), seeds, hashes, timings. Every table of a configuration shows
E0 (centre), E1 (confirm-B P50 with interval), the evidence grade of each figure, and the provenance labels (inspected
control vector, neighbour of an inspected configuration, capacity, box, brokerage).

## 15. Stop rules

The study stops after S11. No further search, candidate, re-ranking, threshold change or "one more look" is permitted
by this protocol; a new question is a new protocol. Amendments are allowed only before the first outcome of the stage
they affect is read, appended to the protocol's amendment section with reason and time, and the freeze record notes
the amendment.
