# Protocol P4-S1 1.0.0 — Priority 4: the S1 staged trailing stop, paired GPU optimization (CTRL vs EXP)

Status: **DRAFT** until the sealed record `results/protocol-freeze.json` records this file's sha256, the code digest,
the accepted GPU record and the engineering gates (E5). After the freeze this file is never edited; every change goes to
`AMENDMENTS.md` (append-only, §17). Research only: nothing here adopts a phenotype, changes the optimization standard or
NL0 1.0.0, replaces New L0 or N/original, merges into `main`, deploys, or touches a broker.

- **Study:** `research/vg-l0-staged-stop/`; official code `src/vg-l0-staged-stop/`, started by `npm run vg-l0ss -- <command>`
  through `src/gpu-backend/officialRunner.ts`; non-official tools (CPU diagnostics, analysis) in `tools/vg-l0-staged-stop/`.
- **Authority:** the user's brief `brief/BRIEF.md` (sha256 `720e0b36e815b111a5deac41c7454bd497224dd78c10adaa01fa8017d78998ae`,
  295 lines, read in full). It authorizes the audit's S1 design (decisions D1–D17 of
  `research/vg-l0-trailing-stop-audit/DECISION_REGISTER.md`), independent controls for the three active books, the
  engineering-first order and substantial compute where it improves the evidence; keeping S1 OFF is a valid result.
- **Rule:** `RULE_SPECIFICATION.md` (staged-stop@1, E0 frozen at `3aa51963`, sha256 recorded in the freeze).
- **Design source:** `research/vg-l0-trailing-stop-audit/PRIORITY4_RESEARCH_PROTOCOL_PROPOSED.md`; deviations from it
  are listed in §0.
- **GPU acceptance:** the record written by `research/gpu-phase8/` (staged-stop delivery, protocol v3); its sha256 is
  pinned in the freeze and kept out of band.

## 0. Adoption, reference method, departures and adaptations

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` **3.0.0**, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1`, read in full 2026-11-23T11:55Z; scope **optimization**; `evaluationBackend: gpu-required` |
| Reference method | NL0 1.0.0 (`docs/research/methods/NEW_L0_METHOD.md`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`), executed through Assignment 3's broad lane (NL0's V-cell schedule) exactly as Stage B executed it |
| Search code | this study's lane `src/vg-l0-staged-stop/search.ts`, DERIVED MECHANICALLY from Stage B's lane (`src/vg-l0-risk-envelope-pilot/search.ts`) by the declared substitutions of `derive.ts` (a test requires byte equality): the arm-dependent space functions come from the arm's space (`space.ts`; CTRL = Assignment 3's very functions) |

| ID | Standard § | Kind | What and why | Agreement |
|---|---|---|---|---|
| PD1 | §1.8, §1.9 | departure | Three cutoffs, each with one next interval: C19 → 2020–2021 (secondary), C21 → 2022–2023 and C24 → 2025–2026 (primary); no C23 and no sequential fold path. Consequence (§1.8, adopted): every selection is "no chronological support: not a deployment-qualified candidate without an explicit user decision". The study's own chronological check (§9.3: the three fold primaries over their three slices; 2024 is not covered) is descriptive and enters only the outcome label (§1.4) | brief §6 (cutoffs, folds) |
| PD2 | §3.2, §4.4 | departure | The incumbent-informed lanes I1–I4 (§10) are separately labelled diagnostics with no chronological claim; New L0 and N/original are frozen benchmarks and informed centres, never members of the independent populations, never nominated | brief §6 ("not independent chronological evidence") |
| PD3 | §2.1 | none | P0 unchanged: centre marked DD ≤ $35,000 (35 % of the $100,000 initial allocation) and the NL0 neighbourhood gates; trade principal loss, banked-capital DD and giveback reported, never gated | brief §1 |
| PA1 | §4.3, §4.8 | adaptation | Reduced structural scope: Stage B's two cells (`GA0.VA0`, `GB0.VD1`); effort scaled by replicates only (32 per cell per arm) | brief §6 |
| PA2 | §4.5 | adaptation | Both arms of a cutoff run as 128 lanes in ONE official job; lane results do not depend on the grouping (Stage B BA4; gate R) | Stage B precedent |
| PA3 | §5.1 | adaptation | Qualification adds one report-only stress, stop slippage 10 bps (the audit's D14), beside Assignment 3's six | brief §6 |
| PA4 | §4.5 | adaptation | The single symmetric extension block (§6.3) re-runs budget-bound lanes of both arms in a separate job with the island cap × 1.5 | the audit's protocol §6 |
| PA5 | §6.3 | adaptation | The execution shape (8 host workers, batch 8,192, linger 30 ms) is the accepted evaluator's measured Mode S; the E5 benchmark measures throughput for forecasts only | docs/gpu/README.md §4 |

## 1. Question, hypotheses, statistics and decision rules (precommitted)

**Question (brief §6).** Does allowing S1 improve the qualified **whole-portfolio** net and risk against the exact same
procedure with S1 forced OFF?

| ID | Hypothesis | Tested by |
|---|---|---|
| H1 | Allowing S1 raises the best qualified training-period centre net of independent lanes (paired) | §1.1 |
| H2 | Any gain comes through the rule (EXP representatives use S1 and beat their own OFF projections), not through search-path differences | §1.3 |
| H3 | The gain does not come with worse risk (centre DD, confirmation p90 DD, breach share, trade principal loss, banked-capital DD) | §1.2 |
| H4 | The EXP procedure is chronologically supported and its paired next-interval behaviour is not worse | §9 |
| H0 | OFF is as good or better: keep the rule OFF | the labels §1.4 |

### 1.1 Primary statistic (C21 and C24 primary; C19 secondary)

For each pair u = (cutoff, cell, replicate): **D_u = V(EXP lane u) − V(CTRL lane u)**, where V(lane) is the best
**qualified** centre net (training door, unrounded `centre.net`) among the lane's selectable members: CTRL — its
shortlist; EXP — its shortlist **and** the OFF projections of its ON members (§7.2), all qualified under P0 (Q1–Q6, §7).
A lane with no qualified member has V = $0 (counted, never dropped). 32 pairs per cell, 64 per cutoff.

- Mean D̄; **stratified paired bootstrap** (B = 100,000; each resample draws each cell's 32 pairs with replacement;
  the mean of the 64) with `Rng.from('vg-l0-staged-stop', 'bootstrap', <statistic>, <cutoff>)`; L90 = the 0.10 quantile
  and U90 = the 0.90 quantile of the bootstrap means (linear interpolation, `vg-d1-growth-joint/fitness.ts quantile`); the
  80 % interval = [L90, U90].
- **Material improvement** at a cutoff: D̄ ≥ **$10,000** and L90 > **$0**.
- Report-only: per-cell means, sign counts, the unstratified bootstrap, the statistics without V = $0 pairs.

### 1.2 Risk non-inferiority (outcome-label conditions, never candidate gates)

On the lane representatives (the member defining V; pairs where both lanes have a representative), at C21 and C24, the
paired difference EXP − CTRL of: centre marked DD; confirmation p90 marked DD; confirmation breach share (> $35,000);
centre trade principal loss (liquidation basis); centre banked-capital DD (liquidation basis). Non-inferior iff U90 of
each mean difference is below its margin: **+$2,500** for the dollar metrics, **+2 percentage points** for the breach
share. "Clearly worse" iff L90 of a mean difference exceeds its margin.

### 1.3 Mechanism (H2)

At each primary cutoff, on the EXP representatives: (a) the share with at least one book ON is ≥ 50 % (Wilson 95 %
interval reported); (b) over the ON representatives, the mean of (centre net − the centre net of the same member's
all-OFF projection, training door) has an unstratified bootstrap L90 > $0. **Mechanism confirmed** iff (a) and (b) hold
at both C21 and C24. Report-only: per-book use, each single-book OFF projection, arms / staged exits / placement exits,
the census of best centres (§13).

### 1.4 Outcome label (precommitted; mutually exclusive, evaluated in this order)

1. **Harmful** (keep OFF): at C21 or C24, U90(D̄) < 0, or some risk difference is clearly worse (§1.2).
2. **Inconclusive** (budget): after the extension block, more than 25 % of either arm's lanes at C21 or C24 ended
   "extension cap reached" (budget-bound).
3. Material improvement at both C21 and C24:
   - mechanism not confirmed → **Search-path effect** (keep OFF);
   - mechanism confirmed, risk non-inferior at both, and the EXP procedure passes the study's chronological check
     (§9.3) → **Beneficial** (merits inclusion in a later successor study; not adoption; under the standard every
     selection still has no chronological support, PD1);
   - otherwise → **Trade-off**.
4. Material improvement at exactly one of C21, C24 → **Inconclusive** (the primary cutoffs disagree).
5. Otherwise → **No material difference** (keep OFF).

C19 (secondary) is reported with the same statistics and never enters the label.

## 2. The two arms

| Arm | Space | Policy |
|---|---|---|
| **CTRL** | Assignment 3's 92-gene space (`ctrlSpace`: the very functions of `src/vg-l0-full-joint/space.ts`); staged OFF | P0 `nl0-control@1.0.0`: plausibility, violation, hypervolume reference (0, $35,000), the NL0 neighbourhood instrument (Priority 3's cent-rounded p90) — Stage B's CTRL arm exactly |
| **EXP** | the same plus three staged switches and six genes (`expSpace`, RULE_SPECIFICATION §6); OFF reachable and protected | the same P0 |

Every evaluation requests the risk envelope (for the report-only principal-loss and banked-DD metrics; P0's decisions
never read it).

## 3. Scope and fixed assumptions

D1·VGT + D1·GDX + Growth·VGT through one $100,000 shared slot (Priority 3's pool, L0, D1 first, GDX before VGT); Growth·GDX
OFF; 5 bps per side; 11 % simple interest; stops at the level or the gapped open; fractional shares; calendar-day holds;
harmonized D1 arming; RC 1/RC 2 controls as genes; Growth 1.4.0's genome complete. Nothing else changes.

## 4. Lanes and seeds

| Item | Value |
|---|---|
| Cells | `GA0.VA0` and `GB0.VD1` |
| Replicates | **R3–R34** (32 per cell). R3–R18 are Stage B's seeds; R19–R34 are new |
| Seed key = lane key | `<cutoff>/broad/<cell>/R<r>` in Assignment 3's seed namespace; the arm never enters a shared-gene seed. EXP's staged genes draw from this study's namespace (`vg-l0-staged-stop`): screen patterns and values, neighbourhood columns |
| Lanes | 2 arms × 3 cutoffs × 2 cells × 32 = **384** (128 per cutoff) |
| **Gate R** (per fold, no extra evaluation) | CTRL lanes R3–R18 must equal Stage B's sealed CTRL lanes (`research/vg-l0-risk-envelope-stage-b/results/search/C2x.json`), envelopes included, before the fold's qualification. A failure stops the study |

## 5. Search (official GPU)

Assignment 3's broad lane (NL0's V-cell schedule), unchanged for both arms: screen 512 → promote 64; rung 1 with 16
draws; 2 base NSGA-II islands × 256 new proposals (population 32), extensions up to 6 islands on NL0's 5 % triggers or a new
feasible behaviour class; stagnation 8 generations at 1e-3; ≤ 200 generations; rung 2 12 × 64 (L∞ ≥ 0.02); rung 3 6 × 128
(L∞ ≥ 0.03); one refinement pass from the robust and profit starts ($2,000 rule); shortlist 3 (L∞ ≥ 0.10, one per ledger).

In EXP: the screen's 92 shared genes are CTRL's screen; the switches follow a seeded balanced pattern sequence (each of the
8 ON/OFF patterns 64 times in a 512 screen); the staged pattern is part of the control pattern (promotion's ⅛ round-robin,
shortlist alternatives, distance 1 across patterns, the "new feasible behaviour class" trigger); neighbourhood radii
a ± 20, t2 ± 5 tenths; refinement moves a ± {10, 20}, t2 ± {3, 5}, and each ON book switched OFF; every configuration
repaired (RULE_SPECIFICATION §2).

## 6. Budgets, bounds and the extension block

[§6.1–§6.2 are completed at E5 from the benchmark of the accepted binary: per-lane caps (CTRL = Stage B's 41,000; EXP =
the same construction with the EXP move bound), the per-stage bounds, the expected requested evaluations, the time
forecast, and the hard bound ≤ 25,000,000.]

### 6.3 The single symmetric extension block

After a cutoff's search, if more than 25 % of either arm's 64 lanes ended "extension cap reached" with a trigger still
firing, every such lane of **both** arms is re-run once, in the job `<C>-extend`, with the island cap × 1.5 (6 → 9) and
otherwise identical definitions; its result replaces the lane's base result for V and the representatives. The decision
reads only stop reasons (operational), never profitability. A lane still budget-bound after the block counts for §1.4
step 2.

## 7. Qualification (per cutoff, the union of members, one job)

Assignment 3's instrument (Stage B's), unchanged, plus one report-only stress: the detailed centre; the centre; the
stresses cost 0 / 10 / 20 bps, 14 % interest, stop slippage 25 bps, next-open stops **and stop slippage 10 bps (report-
only)**; five causal removals; SELECTION 2 × 128 (ranking only) and CONFIRMATION 3 × 128 (qualification only) with
common random numbers across members (labels ('select' | 'confirm', rep, cutoff)); the neighbourhood of an EXP member is
`expSpace.neighbourhood` (Assignment 3's own for an OFF member). Every evaluation requests the envelope.

Gates (P0, Assignment 3's exactly): Q1 centre net > 0; Q2 centre DD ≤ $35,000; Q3 confirmation p90 DD (cents) ≤ $35,000;
Q4 confirmation p10 net (cents) > 0; Q5 at 10 bps net > 0 and DD ≤ $35,000; Q6 a D1 book and Growth·VGT funded.

### 7.2 The union and the OFF projections

The union = every shortlisted member of both arms' 128 lanes; for every EXP member with k ≥ 1 books ON, its **OFF
projections** — each ON book switched OFF alone (k projections) and, when k ≥ 2, all OFF — with every other gene fixed
(each a selectable member of that EXP lane); New L0 and N/original (benchmarks, never in a population). At C24 the union
also holds the informed lanes' shortlists, their projections and the decomposition rows (§12), each labelled.

## 8. Selection (no evaluation)

- **Lane level:** V(lane) and its representative (P0 order: highest centre net; ties selection robust, lower centre DD,
  label) over the lane's selectable members (§1.1).
- **Pooled level, per arm and cutoff:** the P0 primary = NL0 1.0.0's actual-profit rule over the arm's qualified
  members (EXP: projections included); NL0's roles and the Pareto set are reported.
- Each cutoff's selection record is sealed and **committed before that cutoff's next door opens**.

## 9. Chronology, doors and intervals

| Fold | Training door | Next interval (retrospective) | Interval door and guard |
|---|---|---|---|
| C19 (secondary) | D19 | 2020-01-02 → 2021-12-31 | D21, after `selection/C19.json` is sealed and committed |
| C21 (primary) | D21, after the C19 interval record | 2022-01-03 → 2023-12-29 | D23, after `selection/C21.json` |
| C24 (primary) | D24, after the C21 interval record | 2025-01-02 → 2026-10-30 | FULL, **once**, after `selection/C24.json`, `FROZEN_SELECTION.json` and `doors/FULL-authorization.json` |

Every opening goes through `doors.ts` and is logged in `results/doors.jsonl`. The ablations (§11) read D24 between the
freeze and the first search (pre-registered). **Interval subjects** (de-duplicated): every lane representative of both
arms, the all-OFF projection of every ON EXP representative, both arms' pooled primaries, the benchmarks; at C24 also
the informed primaries and the decomposition rows. **Evaluation** (Stage B's): one continuous run from 2016-01-04 with the
cutoff close as the boundary (interval P&L and reset DD; whole-run figures beside them), the seven stresses on the same
basis, and the training selection family (2 × 128, regenerated) replayed on the interval (breaches against $35,000,
Wilson intervals).

### 9.2 Paired interval tests (retrospective, descriptive)

T1: the EXP P0 primary's interval DD ≤ the CTRL primary's + $5,000. T2: the U90 of the mean paired representative interval
DD difference (EXP − CTRL) < +$5,000. T3 (report-only): the mean paired interval net difference with its 80 % interval.

### 9.3 The study's chronological check (per arm; descriptive; PD1)

Passed iff every fold produced a pooled P0 primary, the sum of the three primaries' interval P&Ls > 0 and the largest of
their three reset interval DDs ≤ $35,000. It enters only the outcome label (§1.4). Under the standard (§1.8, PD1) every
selection is "no chronological support: not a deployment-qualified candidate without an explicit user decision" whatever
this check says. Every interval is "retrospective, previously inspected history".

## 10. Informed lanes (C24, separately labelled; PD2)

NL0's informed schedule (Assignment 3's `informed` budget: designs near 12 × 1.5, broad 12 × 3, focus-small 64 × 0.5,
focus-mid 64 × 1.0 around the centre; 4 islands × 384, extensions up to 8; rung 2 16 × 64; rung 3 8 × 128; the robust,
profit and profit-2 starts one pass, the focus starts two passes; shortlist 6) on a restricted space whose genes outside
the lane's free set stay at the centre's values (`space.ts restrictedSpace`):

| Type | Centre | Free genes (EXP) | Paired CTRL |
|---|---|---|---|
| I1 | New L0 | the 9 staged genes | New L0 itself (no free gene: not run; V = New L0's qualified net) |
| I2 | N/original | the 9 staged genes | N/original itself |
| I3 | New L0 | staged + each D1 book's trailing stop, hold and buffer; Growth's trailing stop, maximum hold, ATR sessions and multiple | the same exit genes without the staged genes |
| I4 | N/original | as I3 + the twelve RC genes (GDX and VGT: d, hx, g, k, r, c; those dormant in the centre's cell change nothing) | the same without the staged genes |

8 replicates per type (`C24/informed/<type>/R<r>`, r = 1–8; resolution `fine`, on which both incumbents are exact grid
points; the centre is the lane's one focus seed: the seed, 12 near (× 1.5), 12 broad (× 3), 64 focus-small (× 0.5) and 64
focus-mid (× 1.0) designs, projected onto the free genes and de-duplicated); the members are qualified in the C24 union
(EXP: with their OFF projections); V per lane as §1.1 on the informed track; D_I = V(EXP) − V(CTRL) per replicate (CTRL I1/I2:
the incumbent's own qualified centre net) with an unstratified bootstrap — **diagnostic, no chronological claim**; the
incumbent (staged OFF) stays the no-improvement fallback of its type.

## 11. Fixed-parameter ablations (Stage A; report-only; after the freeze, before any search)

On D24 (development), official GPU job `ablation`: New L0 and N/original, staged OFF (A0: must equal their sealed
development figures to the cent), and the factorial **A ∈ {7.5, 12.5, 20, 30, 40} %** × **τ₂ = round(r × τ₁)** for
**r ∈ {0.30, 0.50, 0.70, 0.85}**, applied to one book at a time (D1·GDX, D1·VGT, Growth·VGT) and to all three (160
points), under the base friction and the stresses stop slippage 10 / 25 bps and next-open (D1). Invalid points (a rule of
RULE_SPECIFICATION §2 fails; never repaired) and duplicates are listed. Mechanism details (per-lot arms, staged exits,
placement exits, levels, funding-log differences, displaced and newly funded trades, giveback, interest, costs,
occupancy) come from non-official CPU diagnostic replays of the same points. Nothing here selects, ranks or narrows.

## 12. Decomposition (report-only)

For each frozen incumbent I ∈ {New L0, N/original} and each finalist F with a book ON (the EXP pooled primary at C24;
each informed type's EXP primary): I (staged OFF); I with F's staged genes and no re-optimization (a book invalid for I's
τ₁ is dropped and reported, never repaired); F; F's all-OFF projection — on D24 in the official job `C24-decomposition`
AFTER the C24 selection is sealed and committed (the qualification instrument; report-only, never selects) and on FULL in
the validation job.

## 13. Report-only analyses (zero or bounded evaluations)

Search coverage per arm/cell/replicate; budget accounting (requested, fresh, hits, proposals, stop reasons, islands);
convergence evidence (replicate distributions, first versus second half of replicates, late-round winners, cap
exhaustion); the census of every centre (arm, staged pattern, best centres' identity across arms); risk tails (p95,
worst-10 % mean, breach shares, principal loss, banked DD); stresses; giveback decomposition and protected-profit
accounting (an identity, never realized P&L); regime breakdowns (2018 Q4, 2020-02/03, 2022, 2025-04); per-lot mechanism
detail from CPU diagnostic replays (purpose `diagnostic`).

## 14. Stage order (exact commands: `RUN_COMMANDS.md`)

0. This protocol, `AMENDMENTS.md`, `STANDARD_ADOPTION.json`, the brief copy, `RULE_SPECIFICATION.md`: committed.
1. Code and tests committed; the GPU Phase 8 acceptance ACCEPTED; the E5 benchmark; `gates`, `freeze` (sealed) and
   committed **before any official evaluation**.
2. `ablate` (D24) → commit.
3. C19: `search` → gate R → `extend` (its sealed decision; lanes only if §6.3 triggers) → `qualify` → `select` → commit →
   `interval` (D21) → commit.
4. C21: the same; the interval on D23.
5. C24: `search` → gate R → `extend` → `informed` → `qualify` → `select` → commit → `decompose` → commit →
   `freeze-selection` → commit → `authorize-full` → commit → `validate` (FULL once) → commit → `outcome` → commit.
6. Analysis, CPU diagnostics, reports, regression, ZIP, commit and push.

## 15. Engineering gates

Sealed in `results/engineering/gates.json` (main.ts `gates`) before the freeze, each from its evidence file under
`results/engineering/` (chain `tools/vg-l0-staged-stop/engineering.sh`):

| Gate | Evidence |
|---|---|
| E0 | `RULE_SPECIFICATION.md` committed (`3aa51963`) before the implementation and unchanged since (`E0/rule.txt`) |
| E1 | the CPU reference's tests (OFF parity: Growth 1.4.0 fixture, pooled D24 sealed figures and identities; staged mechanism, config, RC 3 book, pooled; this study's space, derivation, budget, statistics, doors) with the code digest (`E1/tests.txt`) |
| E2, E3 | `research/gpu-phase8/` ACCEPTED: the CUDA port's parity strata and exact-threshold fixtures; ≥ 100,000 seeded random configurations; sanitizers; negative and tamper suites; the fixed-seed P4 mini-optimization GPU = CPU with stop/resume, SIGKILL/resume and concurrency; Stage B control lanes reproduced |
| E4 | the record verified independently (`verify-acceptance.sh --rebuild --device --expect-record-sha256`), pinned out of band, the runtime refusals and the record-in-force tests (`E4/runtime.txt`), the live official gate for the staged domain on D19, D21 and D24 (`E4/official-preflight-D*.txt`) |
| E5 | the benchmark (`E5/bench.json`, non-official, benchmark seeds `BENCH/…`) and the study preflight (`E5/preflight.txt`) |

Gate R runs per fold (§4).

## 16. Resources

Contained units in `vgl0ss.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0); one GPU job at a time; every Node
process `node --no-maglev`; the accepted evaluator's Mode S (8 host workers, batch 8,192, linger 30 ms); archives persist
every evaluation; resume = the same command with `--resume`; no automatic restart.

## 17. No-go rules and amendments

A failed engineering gate or gate R, any CPU-scored official evaluation, a stale acceptance, a request beyond a bound, a
door opened out of order, a change after the freeze without an amendment, a criterion loosened after an outcome, or a
shared-gene seed depending on the arm stops the study. `AMENDMENTS.md` is append-only: pre-freeze `E*` refine the
implementation; after the freeze disclosures `D*`, operational `O*` and code `A*` (defect fixes changing no rule, each with
a sealed record of the changed files and digests). Criteria are never loosened, and no arm, cell, cutoff, replicate,
statistic, margin or threshold is added, removed or changed once a result it governs exists. A failure is a result.
