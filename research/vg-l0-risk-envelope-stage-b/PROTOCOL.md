# Protocol RES-B 1.0.0 — Stage B: replicated, paired GPU comparison of P0 (NL0 control) and P3 (40 / 25 / 30)

Status: **PREREGISTERED** — written and committed before any Stage B code ran an evaluation. It is then **frozen** by the
sealed record `results/protocol-freeze.json`, which records this file's sha256, the code digest and the engineering
gates. That record is committed before any official search. After the freeze this file is never edited. Every change
goes to `AMENDMENTS.md`, which is append-only and governed by §17. Research only: nothing here adopts P3, changes the
optimization standard or NL0 1.0.0, replaces New L0 or N/original, merges into `main`, deploys, or opens broker access.

- **Study:** `research/vg-l0-risk-envelope-stage-b/`. Official code is in `src/vg-l0-risk-envelope-stage-b/`, started
  by `npm run vg-l0reb -- <command>` through `src/gpu-backend/officialRunner.ts`. Non-official engineering and analysis
  tools are in `tools/vg-l0-risk-envelope-stage-b/`.
- **Authority:** the user's assignment `brief/BRIEF.md`, sha256
  `801f8c574755cce371f88727a3865cbab478e2038723d7a76ea3360b1ed267f9`. It has 153 lines and was read in full, to its
  "Final instruction", at 2026-11-22T21:14Z. It authorizes exactly this study: two arms, two cells, C21 and C24 as the
  primary cutoffs, C19 as a precommitted secondary, R3–R18, and a nine-hour window.
- **Design source:** the Stage A option `research/vg-l0-risk-envelope-sensitivity/STAGE_B_OPTION.md`, sha256
  `ed2fb8cfc8565bb23fbbc347dde5cda0e965dce3ddfeb35b1125e58aaa3cb06b`. The brief changes it in three ways: 16 instead of
  8 new paired replicates, C19 as a precommitted secondary, and the nine-hour window.
- **Lineage:** branch `research/vg-l0-risk-envelope-stage-b`, created from Stage A's final commit `0c2f9dd5`. That
  commit descends from the pilot (`7f69d0d2`) and from the accepted Phase 7 lineage (`fc027eed`). The GPU acceptance
  record is `config/gpu-backend/acceptance.json`, sha256
  `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED; binary gb7 `cb2ff30b…`; RTX 5090
  `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`). It is unchanged and must stay valid: this study adds no file to the
  evaluation manifest, the enforcement group or the job module. The branch is never merged into `main`.

## 0. Adoption, reference method and departures

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` **3.0.0**, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1` (registered current), read in full 2026-11-22T21:25Z; scope **optimization**; `evaluationBackend: gpu-required` (`STANDARD_ADOPTION.json`) |
| Reference method | NL0 **1.0.0**, `docs/research/methods/NEW_L0_METHOD.md`, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`, read in full. It is executed through Assignment 3's broad lane, which is NL0's V-cell schedule, as in the pilot |
| Search code reused, never edited | the pilot's generated lane `src/vg-l0-risk-envelope-pilot/search.ts` (Assignment 3's frozen lane plus 19 declared substitutions) and its arm fitness `src/vg-l0-risk-envelope-pilot/fitness.ts`. Also Assignment 3's space, seeds, budgets, qualification instrument and benchmarks (`src/vg-l0-full-joint/`), Assignment 2's selectors (`src/vg-l0-risk-families/`), the pilot's verdict and RA1 helpers, and Priority 3's engine |
| Risk interpretation | `src/risk-envelope/policy.ts` (`risk-envelope@1.0.0`), the single interpretation, unchanged |

Departures (standard §7.3; each carries the user's agreement) and adaptations:

| ID | Standard § | Kind | What and why | Agreement |
|---|---|---|---|---|
| BD1 | §2.1, §2.3 | departure | The EXP-30 arm replaces the $35,000 marked-DD research ceiling with P3 in every stage of its search, qualification and selection: marked DD ≤ 40 % of C0, trade principal loss ≤ 25 % of funded principal, banked-capital DD ≤ 30 % of C0, both new limits on the liquidation basis. The CTRL arm keeps the standard's rule exactly. The standard is not changed | brief §2 (the two arms) |
| BD2 | §1.8, §1.9 | departure | Three cutoffs, each with one next interval: C19 → 2020–2021 (secondary), C21 → 2022–2023 and C24 → 2025–2026 (primary). There is no C23 and no sequential fold path or verdict. Consequence (§1.8): every selection is labelled "no chronological support: not a deployment-qualified candidate without an explicit user decision" | brief §3 (the cutoffs) |
| BD3 | §4.4, §3.2 | departure | No incumbent-informed lane. New L0 and N/original are descriptive frozen benchmarks: never seeds, never selectable, never nominated | brief §2 ("descriptive frozen benchmarks, not seeds …") |
| BD4 | §5.9, §0.2 | departure (Assignment 3's AD5, kept) | RA1 (original, and the descriptive envelope-adapted version) ranks on §5.9-type training quantities | brief §4.5; Assignment 3 brief §4 |
| BA1 | §4.3, §4.8 | adaptation | Reduced structural scope: 2 of Assignment 3's 64 cells (`GA0.VA0` and the pilot's outcome-independent, hash-selected `GB0.VD1`). Effort is scaled only by replicates (NL0 §7.4), with no claim of equal effort with Assignment 3 or NL0 | brief §3 |
| BA2 | §5.3, §5.8 | adaptation | EXP-30's neighbourhood gates (rung feasibility, Q3, Q4) compare unrounded quantiles of every gated metric. CTRL keeps Priority 3's cent-rounded p90 DD, the frozen instrument (pilot RD6) | pilot D-4 |
| BA3 | §6.3 | adaptation | No new worker/batch tuning benchmark: the execution shape is the accepted evaluator's measured Mode S (8 host workers, batch 8,192, linger 30 ms; GPU Phases 3/4/7). Timings select nothing | `docs/gpu/README.md` §4–§4a |
| BA4 | §4.5 | adaptation | Both arms' lanes of a cutoff run concurrently in **one** official job (64 lanes), not as two sequential phases. Lane results do not depend on the grouping: seeds depend on the lane key only, extension decisions are lane-local and taken at barriers, records are deterministic, and the per-lane resource guard cannot bind (§6). E2 (§12) checks reproduction of the sealed reference lanes | the brief's paired checkpoints (§3); Phase 6 E6 (concurrent jobs = isolated reference) |

## 1. Question, statistics and decision rules (precommitted)

**Question (brief §2).** Across genuinely new, paired search seeds, does the P3 envelope select candidates with
risk-adjusted profitability not materially worse than P0? Does it show a credible benefit in principal or
banked-capital risk, or in subsequent chronological behaviour?

**Lane-pair statistic.** For each pair u = (cutoff, cell, replicate):

> D_u = V(EXP-30 lane u) − V(CTRL lane u)

Here V(lane) is the **best qualified centre net** of the lane: the highest centre net among the lane's shortlisted
members that are qualified under the lane's own arm (Q1–Q6 of §7, on the cutoff's union qualification evidence).
Centre net is the qualification record's `centre.net`, unrounded, in dollars.

- **A lane with no qualified member** (an empty shortlist, or no shortlisted member passing Q1–Q6) has **V = $0**. This
  is the "no qualifying candidate, nothing deployed" outcome. A failure is never discarded, no substitute is invented,
  and the pair is never dropped. Such lanes are counted and reported. A report-only sensitivity excludes those pairs.
- With 16 replicates and 2 cells there are **32 pairs per cutoff**, and the arms share every seed.

**Mean and bound.** D̄_c = the mean of the 32 values D_u at cutoff c. L90_c = the **lower one-sided 90 % paired-bootstrap
confidence bound** of the mean, computed as follows:
- B = 100,000 resamples;
- stratified by cell: each resample draws 16 replicates with replacement within each cell independently and takes the
  mean of the 32 resampled D_u;
- L90 = the 0.10 quantile of the B bootstrap means, interpolated linearly by `src/vg-d1-growth-joint/fitness.ts`
  `quantile` (the percentile method);
- random numbers come from `src/optimizer/rng.ts` `Rng.from('vg-l0-risk-envelope-stage-b', 'bootstrap', <statistic>, <cutoff>)`;
- the code is `src/vg-l0-risk-envelope-stage-b/stats.ts`, frozen with the protocol.

| Rule | Definition |
|---|---|
| **Non-inferiority (primary)** | L90_c > **−$5,000** at **both** C21 and C24 |
| **Superiority** | D̄_c > **+$2,500** and L90_c > **$0**, at **both** C21 and C24 |
| **C19 (secondary)** | the same two statistics at C19, reported as predeclared secondary evidence. They never substitute for C21 or C24 and never enter the primary verdict |

**Outcome label (precommitted):**
- **P3 non-inferior and superior:** non-inferiority and superiority both hold.
- **P3 non-inferior (superiority not shown):** non-inferiority holds, superiority does not.
- **P3 non-inferiority not shown:** L90 ≤ −$5,000 at C21, at C24, or at both. The report states which cutoff failed.
- **Incomplete:** a primary cutoff's statistic could not be computed because the window or a failed gate stopped the
  study. No partial result is presented as the preregistered study.

**Secondary and report-only statistics.** None of these changes the label.
1. **Pooled-shortlist statistic** (the pilot's Δ), per cutoff: Δ_pool = the centre net of EXP-30's pooled P0 primary
   minus CTRL's. The P0 primary is the highest centre net among the arm's qualified members over all 32 of its lanes.
   The pilot's $2,500 materiality margin labels it: *better* if Δ > +$2,500, *worse* if Δ < −$2,500, *equivalent*
   otherwise. It is undefined if an arm has no qualified member. It is reported beside D̄, never in its place.
2. **Original RA1** (Assignment 2's, S4 = 35 % of C0) per arm on the same pooled populations and the same draws, and
   its paired lane version (the RA1 order restricted to each lane's qualified members). **RA1-adapted** (S4 = 40 % of
   C0), for EXP-30 only, is a **separate descriptive selector**. It never enters a primary statistic and is never
   called "RA1".
3. **Risk differences** per pair, on the members that define V (report-only, with the same bootstrap and two-sided
   80 % intervals): centre marked DD, centre trade principal loss and centre banked DD (liquidation and marked bases),
   their confirmation p90, p95, worst and worst-10 % mean, breach counts against 35 % / 40 % DD, 25 % PL and 25 % / 30 %
   BD with Wilson 95 % intervals, occupancy, lots and participation.
4. **Common-candidate counterfactual:** every union member's verdict under both policies (both / CTRL-only /
   EXP-30-only / neither), with each failing metric. This separates eligibility effects from search-path effects.
5. **Sensitivity (report-only):** the unstratified paired bootstrap, the one-sided 90 % t bound, the per-cell means,
   the sign counts, and the statistics without pairs that contain a V = $0 lane.

## 2. The two arms (frozen; no other policy is optimized)

| Arm | Policy (`src/risk-envelope/policy.ts` object) | Gates (dollars at C0 = $100,000) | Neighbourhood instrument |
|---|---|---|---|
| **CTRL** (P0) | `nl0-control@1.0.0` = `NL0_CONTROL`, unchanged | marked DD ≤ 35 % of C0 → $35,000 | Priority 3's `nbStats` p90 DD, rounded to cents (the frozen NL0 / Assignment 3 instrument) |
| **EXP-30** (P3) | `sens-p3-40-25-30@1.0.0`, the object defined in `src/vg-l0-risk-envelope-stage-b/context.ts`, deep-equal to Stage A's P3 (`tools/vg-l0-risk-envelope-sensitivity/policies.ts`, a test) | marked DD ≤ 40 % of C0 → $40,000; max funded-trade principal loss (liquidation) ≤ 25 % of the funded entry principal → $25,000; banked-capital DD (liquidation) ≤ 30 % of C0 → $30,000 | unrounded p90 of each gated metric (pilot `fitness.ts envNbStats`; a failed neighbour = +∞) |

- Limits are `(denominator × pct) / 100` (`policy.ts limitOf`), exact in binary64. **A value equal to its limit passes.**
  Decisions compare dollars on unrounded record values; ratios are reported, never compared.
- **The denominators.** Marked DD and banked DD are taken against C0, the fixed, non-compounding $100,000 allocation of
  the one shared-funded slot, never peak equity. Principal loss is taken against each funded lot's entry principal,
  which equals C0 in the one fixed slot.
- The metric definitions are those of `research/vg-l0-risk-envelope-sensitivity/POLICY_MATRIX.md` §2 and the pilot's
  PROTOCOL §2. The marked twins (`principalLossMarked`, `bankedDdMarked`) are always reported and never gated.
- **These thresholds are optimizer qualification limits on historical paths, never executable stop losses.** Trading
  behaviour is identical in both arms.
- The envelope is requested (`risk: true`) on **every** official evaluation of both arms. CTRL's decisions never read
  the two new metrics. Every envelope is validated (`checkEnvelope`, fail closed).
- P1, P2, P4–P8 are **not** optimized. Their Stage A read-only results may be quoted as context. No threshold is tuned
  on Stage B outcomes.

## 3. Strategy scope and fixed assumptions (unchanged from Assignment 3 and the pilot)

The scope is D1·VGT + D1·GDX + Growth·VGT, evaluated jointly through **one $100,000 shared-funded slot**; Growth·GDX is
OFF.
- Shadow delayed-entry eligibility is OFF; maximum holds are in calendar days (the original convention).
- The allocator is Priority 3's pool: a decision is funded only at its own instant, when nothing is open or reserved.
  At the same instant, D1 goes first and GDX before VGT. There is no compounding and no preemption.
- RC 1 / RC 2 optional D1 controls are genes; Growth 1.4.0's genome is complete.
- Costs and interest: 5 bps per side inside the fill prices, and 11 % simple interest by calendar day.
- Stops fill at the stop or at the gapped open. Shares are fractional. D1 arming is harmonized from 2016-01-04.
- The 92-gene genome, boxes, grids, identities and neighbourhood instrument are Assignment 3's (its PROTOCOL §6, §9).

Nothing here adds an objective, phenotype family, exit, trade priority, Growth restriction or symbol.

## 4. Lane matrix and seed identities (frozen)

| Item | Value |
|---|---|
| Cells | `GA0.VA0` (the legacy cell, New L0's D1 mechanics) and `GB0.VD1` (the pilot's hash-selected cell: argmin over the 63 non-legacy cells of sha256(`"vg-l0-risk-envelope-pilot/cell/"` + id)) — never substituted |
| New replicates | **R3, R4, …, R18** (16). Assignment 3 used only R1/R2 for these cells (`research/vg-l0-full-joint/results/search/C2x/broad1.json`), the pilot used R1/R2, Stage A ran no search, and Phase 7's benchmark used R1 lanes. R3–R18 have never been run for any cell at any cutoff |
| Seed key = lane key | `<cutoff>/broad/<cell>/R<r>` in **Assignment 3's seed namespace**: `deriveSeed('vg-l0-full-joint', <stage labels…>, <seed key>)` through `src/vg-l0-full-joint/context.ts seedOf`. **The arm never enters a seed**, so both arms of a pair see identical screens, GA streams and neighbourhood draws |
| Cutoffs | **C19** (secondary): training door D19, 2016-01-04 → 2019-12-31. **C21** (primary): D21, → 2021-12-31. **C24** (primary): D24, → 2024-12-31 |
| Research lanes | 2 arms × 3 cutoffs × 2 cells × 16 replicates = **192**; 64 per cutoff (32 pairs) |
| Reproduction lanes (gate E2; never research) | CTRL × 3 cutoffs × 2 cells × R1/R2 = **12**. They are reproductions of Assignment 3's sealed lanes, never in a decision statistic, never candidates and never qualified |

The complete list of 192 research seed keys and 12 reproduction seed keys is `SEED_BUDGET_MATRIX.json`, generated by
`npm run vg-l0reb -- matrix` from the code and checked against this table by a test.

**Historical R1/R2** results are comparison context only: Assignment 3 / pilot CTRL, the pilot's EXP (40/25/25), and
Stage A's P3 requalification of those candidates. They never enter D, a pooled population or a seed.

## 5. The search code and where the policy acts

The pilot's generated lane (`src/vg-l0-risk-envelope-pilot/search.ts` `Lane`) and its arm fitness are imported
**unchanged**. Stage B supplies only the arm object, which holds the policy, the marked-DD limit used as the hypervolume
reference, and the neighbourhood instrument. The pilot's stage table (its PROTOCOL §6) applies with EXP-30 in place of
EXP:

| # | Stage | CTRL | EXP-30 |
|---|---|---|---|
| 1 | Screen (Sobol/Latin, strata) | identical proposals | identical proposals |
| 2 | Plausibility | !error ∧ net > 0 ∧ DD ≤ $35k ∧ both families funded | !error ∧ net > 0 ∧ `assess(centre, P3).pass` ∧ both families funded |
| 3 | Screen promotion | violation: net + max(0, DD − 35k)/35k + structure | violation: net + Σ the centre's gated excesses (DD vs 40k, PL vs 25k, BD vs 30k; each normalized by its limit) + structure |
| 4 | Rung-1 fits (centre-first), NSGA-II islands | violation {net, dd, p90, structure} = 0 | violation {net, dd, pl, bd, p90, p90pl, p90bd, structure} = 0 on unrounded neighbourhood p90s |
| 5 | Hypervolume, stagnation, extension triggers | reference (0, $35,000) | reference (0, $40,000); the triggers are unchanged |
| 6–8 | Rung 2–3 promotion, refinement acceptance (one pass; $2,000), shortlist (feasible; one per ledger) | under CTRL | under EXP-30 |
| 9–10 | Qualification Q1–Q6, selection eligibility | §7 CTRL | §7 EXP-30 |

These mechanics are retained in both arms (pilot D-6):
- the objectives (−centre net, −robust net, p90 marked DD) and the operators;
- the unmeasured penalty of 1 for a centre without neighbours;
- the violation total rounded to 1e-6. Plausibility and qualification compare exactly.

The schedule is Assignment 3's broad lane, which is NL0's V-cell schedule (`src/vg-l0-full-joint/budgets.ts`
`budgets.study.broad`), unchanged:
- screen 512 → promote 64; rung 1 with 16 draws;
- 2 base NSGA-II islands of 256 new proposals each (population 32), extended up to 6 islands on NL0's 5 % triggers or
  a new feasible behaviour class; stagnation after 8 generations at 1e-3; at most 200 generations;
- rung 2: 12 × 64 (L∞ ≥ 0.02); rung 3: 6 × 128 (L∞ ≥ 0.03);
- one refinement pass from the robust and profit starts ($2,000 rule);
- shortlist 3 (L∞ ≥ 0.10, one per ledger).

No parameter domain, budget, draw count, objective, selector or rule is changed.

## 6. Budgets, deterministic bounds and accounting

| Component | Rule | Hard bound (requested) | Expected (requested) |
|---|---|---:|---:|
| Search | 192 lanes × the per-lane cap **41,000** (Assignment 3's worst case 40,642; a request beyond the cap fails closed) | **7,872,000** | ≈ 3.10 M (64 × the mean of the known lanes of these cells: C19 16,674; C21 17,193; C24 14,624) |
| Reproduction (E2, engineering, official GPU) | 12 lanes × 41,000 | 492,000 | 200,499 exactly (Assignment 3's sealed lanes: C19 66,697; C21 71,314; C24 62,488) |
| Qualification | 3 cutoffs × ≤ 194 members (≤ 3 per lane × 64 lanes + 2 benchmarks; a member shortlisted twice is evaluated once) × **653** per member | 380,046 | ≈ 0.37 M |
| Next intervals | 3 cutoffs × ≤ 71 subjects (≤ 64 lane representatives + ≤ 5 pooled primaries + 2 benchmarks, de-duplicated) × **264** per subject | 56,232 | ≈ 0.05 M |
| **Total official requested** | | **8,800,278** | **≈ 3.7 M** |

- The hard bound is derived from the frozen schedules by `src/vg-l0-risk-envelope-stage-b/budget.ts bound()`; a test
  requires it to equal 8,800,278. The official stages enforce it per lane (41,000), per member (653), per subject (264)
  and per stage, failing closed.
- **Accounting**, per job, arm, lane, rung tag and stage: requested, fresh (new GPU computation), archive hits (both
  arms share identical screens, so EXP-30 receives hits where CTRL already evaluated a key, and vice versa), unique keys
  and wall time. Distinct candidate proposals are counted per lane (screen + island children + fillers; refinement moves
  apart). Requested is never confused with executed. Engineering evaluations (E2's official reproduction; E3's
  non-official mini-pilot and edge subjects) are reported separately from research evaluations.
- **No evaluation is added to reach a quota.** No stage is shortened, no lane is added, and lanes, cells and cutoffs are
  never added or removed on observed results. A lane that ends at "extension cap reached" is budget-bound, not
  converged.

**Time forecast** (made before the freeze; it selects nothing):
- Measured rates with the risk envelope: 4 lanes per job run at C21 211 / C24 130 evaluations/s (pilot); 8 lanes run at
  C21 367 / C24 227 per s (Phase 7 benchmark).
- Measured without the risk envelope: Assignment 3's 64-lane C19 job runs at 2,128 per s (Phase 3).
- Throughput grows with lanes in flight because batches are latency-bound (`docs/gpu/README.md` §4).

| Case | Search time C19 / C21 / C24 | All official stages |
|---|---|---|
| Central: 64-lane rates ≈ 1,800 / 1,200 / 800 per s | 10 / 15 / 20 min | ≈ 1.6 h |
| Conservative: the 8-lane rates | 32 / 50 / 69 min | ≈ 3.3 h |
| Pessimistic: the 4-lane rates | 56 / 87 / 120 min | ≈ 5.2 h |

All official stages include the reproduction lanes, qualifications, intervals and gate openings.

**C19 decision (made before any research result).** C19 is **included**:
- the existing doors support it with verified semantics: D19 for training, and D21 for the 2020-01-02 → 2021-12-31
  interval with the 2019-12-31 boundary, which Assignment 3's C19 fold used;
- the same official evaluator, domain and instrument apply, with no engine change;
- the strict chronological fold order of §9 preserves historical integrity;
- the central and conservative forecasts fit the window with the reserve of §13.

The pessimistic case is contradicted by the measured batching behaviour but is still guarded by §13's launch rule.

## 7. Qualification (per cutoff: union of both arms' shortlists + the two benchmarks)

The union is qualified **once** per cutoff with Assignment 3's instrument, unchanged. That instrument is:
- the detailed centre and the centre;
- six stresses (0 / 10 / 20 bps, 14 % interest, +25 bps stop slippage, next-open stops);
- five causal removals;
- SELECTION 2 × 128 draws (ranking only) and CONFIRMATION 3 × 128 draws (qualification only), with labels
  ('select' | 'confirm', rep, cutoff). These never carry the arm, cell or lane, so the random numbers are common to
  both arms.

Every evaluation requests the envelope. Each member is then assessed under **both** arms (the common-candidate
counterfactual):

| Gate | CTRL (Assignment 3 exactly) | EXP-30 |
|---|---|---|
| Q1 | centre net > 0 | same |
| Q2 | centre marked DD ≤ $35,000 | `assess(centre, P3).pass` |
| Q3 | confirmation p90 DD (Priority 3's, cents) ≤ $35,000 | unrounded confirmation p90 of marked DD ≤ $40,000, PL (liq.) ≤ $25,000 and BD (liq.) ≤ $30,000 |
| Q4 | confirmation p10 net (cents) > 0 | unrounded confirmation p10 net > 0 (a failed draw = −C0) |
| Q5 | at 10 bps: net > 0 ∧ DD ≤ $35,000 | at 10 bps: net > 0 ∧ `assess(10 bps record, P3).pass` |
| Q6 | a D1 book and Growth·VGT funded at the centre | same |

The verdict code is the pilot's `qualify.ts verdictOf`, generic in the arm. The members, both verdicts, every failing
metric and its excess, and the envelope statistics of the selection and confirmation families are sealed.

## 8. Selection (no selector launches an evaluation)

- **Lane level (the primary statistic):** V(lane) of §1, with the lane's representative = its best qualified member.
  Ties go to selection robust, then lower centre DD, then label (the P0 order). Both arms on identical evidence.
- **Pooled level, per arm and cutoff:** the population is the members its 32 lanes shortlisted, under the arm's
  verdicts.
  - **P0** = NL0 1.0.0's original rule, the actual-profit role (`src/vg-l0-risk-families/select.ts originalOrder`).
  - **RA1-original** = Assignment 2's `ra1Order`, unchanged.
  - **RA1-adapted** (EXP-30 only; descriptive) = the pilot's `ra1OrderWith(·, $40,000)`.
  - NL0's roles and the Pareto set are reported.
- New L0 and N/original are never in a population. They are qualified under both arms and reported.
- Each cutoff's selection record seals every lane's representative and V, both arms' pooled primaries, rankings, roles
  and the interval subjects. It is **committed before that cutoff's next door opens**.

## 9. Chronology, doors and intervals

**Fold order (strict, NL0 §3.1).** Each fold completes in this order before the next fold's training door opens:
1. its reproduction gate E2;
2. its search;
3. its qualification;
4. its sealed and committed selection;
5. its next interval.

The folds run **C19 → C21 → C24**:

| Fold | Training door | Next interval (retrospective) | Interval door and guard |
|---|---|---|---|
| C19 (secondary) | D19 | 2020-01-02 → 2021-12-31 | D21, only after `results/selection/C19.json` is sealed and committed |
| C21 (primary) | D21, only after the C19 interval record is sealed and committed | 2022-01-03 → 2023-12-29 | D23, only after `results/selection/C21.json` is sealed and committed |
| C24 (primary) | D24, only after the C21 interval record is sealed and committed | 2025-01-02 → 2026-10-30 (the common complete endpoint) | FULL, **once**, by the official validation job only, after the C24 selection, `FROZEN_SELECTION.json` and `results/doors/FULL-authorization.json` are sealed and committed |

Every door opening goes through the study's guards (`src/vg-l0-risk-envelope-stage-b/doors.ts` →
`src/gpu-backend/doors.ts openStudyDoor`: Priority 3's verified byte-prefix doors, or its FULL door) and is logged in
`results/doors.jsonl`. Before the freeze, the non-official engineering tools (E3) read D19, D21 and D24. They read only
prior-study engineering subjects and the mini-pilot, never a Stage B research lane. D23 and FULL are never opened
before their guards hold.

**Interval subjects** (per cutoff, de-duplicated by configuration identity, every role attributed):
- the representative of every lane of both arms (up to 64);
- the pooled primaries of P0, RA1-original and RA1-adapted;
- the two benchmarks.

**Evaluation of an interval** (the pilot's PROTOCOL §11, unchanged): one continuous run from 2016-01-04 with the cutoff
close as the boundary, with state and marks preserved.
- Interval P&L = the change of the marked net from the boundary close.
- Interval DD = the strict tracker restarted there.
- Whole-run figures and the whole-run envelope are reported beside them.
- The six stresses run on the same basis.
- The training selection family (2 × 128, regenerated exactly) is replayed on the interval, with breach counts against
  35 % and 40 % of C0 and Wilson intervals.

**Precommitted chronological tests** (retrospective and descriptive; never used to choose a threshold, a selection or a
continuation). A lane without a qualified member has interval net $0 and interval DD $0 (no position), and is counted.

| Test | Definition |
|---|---|
| T1 (the pilot's H3, pooled) | per cutoff: interval DD of EXP-30's P0 primary ≤ interval DD of CTRL's P0 primary + $5,000 |
| T2 (paired interval DD) | per cutoff: the upper one-sided 90 % bound (stratified paired bootstrap, §1) of the mean of (EXP-30 − CTRL) representative interval DD is < +$5,000 |
| T3 (paired interval net, report-only) | the mean of (EXP-30 − CTRL) representative interval net, with its 80 % two-sided bootstrap interval |

**Labels.** "Retrospective, previously inspected history: 2020, 2022–2023 and 2025–2026 were examined by many studies;
the envelope was motivated by archives of C21–C24." These are never pristine holdouts. Chronological independence is
limited: there is one market history, the intervals are correlated, and C19's interval lies inside C21's training
window and C21's inside C24's. **No validation feedback** is allowed: nothing observed on an interval changes a cell,
seed, gate, budget, selector, selection or a later fold's search.

## 10. Report-only analyses (zero or bounded evaluations; never a gate or ranking input)

- Search coverage per arm, cutoff, cell and replicate: screen plausibility, rung counts, islands, stop reasons,
  shortlists, Growth boundedness and lanes that ended at the extension cap.
- A census of every centre each search job evaluated. It is replayed from the job archive with a pool that refuses any
  evaluation. It reports both policies' verdicts and which constraint binds (DD > 35 % / > 40 %, PL > 25 %, BD > 30 %),
  and the cases where a 40 % DD admission is offset by the PL or BD gate.
- The risk differences and common-candidate counterfactuals of §1.
- Each benchmark's qualification and interval rows.
- Stage A's and the pilot's sealed R1/R2 results, as historical context.

All of these are performed after the official stages if the window allows. Otherwise they are disclosed as not
performed. They never delay or change an official stage.

## 11. Stage order and jobs (exact commands: `EXECUTION_PLAN.md`)

0. This protocol, `AMENDMENTS.md`, `STANDARD_ADOPTION.json`, `SEED_BUDGET_MATRIX.json` and the brief copy: committed
   and pushed (preregistration).
1. Code and tests are committed. Then the engineering gates E1, E3, E4, E5 and E6 run. Then `gates` (sealed) and
   `freeze` (sealed) run, and the result is committed and pushed **before any official evaluation**.
2. **C19 fold:**
   - `repro --cutoff C19` (job `C19-repro`, D19), then `e2 --cutoff C19` (sealed);
   - `search --cutoff C19` (job `C19-search`, D19, 64 lanes), then `qualify --cutoff C19` (job `C19-qualify`, D19);
   - `select --cutoff C19`, then commit and push;
   - `interval --cutoff C19` (job `C19-interval`, D21), then commit.
3. **C21 fold:** the same commands with `--cutoff C21`; the interval runs on D23.
4. **C24 fold:**
   - repro and e2, search, qualify, then `select --cutoff C24`, then commit;
   - `freeze-selection`, then commit; `authorize-full`, then commit and push;
   - `validate` (job `C24-validation`, FULL once), then commit.
5. Analysis (`tools/…/analyze.ts`, no evaluation), report-only analyses (§10), regression, reports and the ZIP. Then a
   final commit and push.

Every official stage requires all of the following, or it refuses to run:
- the study preflight passes;
- the sealed and committed freeze, with the frozen code digest (or a sealed code amendment chained from it);
- the sealed and committed passing engineering gates;
- the acceptance record the freeze pinned;
- no uncommitted change to the code closure or the protocol documents;
- the budget bound;
- the fold order, door guards and its own `openJob` job → `openOfficialGpuSession` (attestation) → `GpuPool`
  (receipts, conservation, CPU-scored = 0) → `EvalLab` (an archive bound to study, job, door, door pin, code digest and
  backend).

A stage whose record exists refuses to rerun. An interrupted job resumes with the identical definition (`--resume`); the
gate runs again and writes a new attestation.

## 12. Engineering gates (each before the first official evaluation that depends on it; a failure stops every dependent stage)

| Gate | Requirement | Evidence |
|---|---|---|
| E1 | The live Phase 7 ACCEPTED record verifies independently on this branch: `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf…`, the out-of-band pin, a reproducible rebuild and the device. The runtime refuses a process without `--no-maglev` and a non-official purpose | `results/engineering/E1/` |
| E2 (per fold, official GPU) | The fold's 4 CTRL reproduction lanes (R1/R2 × both cells; official GPU, envelope requested, the Stage B runner and lane grouping) equal Assignment 3's sealed lanes with envelopes stripped: screen and promotion counts, islands, trigger logs, rung fits, refinement paths, shortlists, frontiers and failure reasons. **No search of the fold starts before its E2 passes** | `results/engineering/E2-C2x.json` |
| E3 (non-official, before the freeze) | A fixed-seed mini-pilot of **both Stage B arms** on D19 (cutoff label `E3B`, its own seed keys) must give GPU = CPU in lane results, qualification evidence, selections and every archived record and envelope. Graceful stop + resume and SIGKILL + resume must equal the uninterrupted run. The CTRL mini lane must equal Assignment 3's own lane. **Threshold-edge subjects** on D21 and D24 are drawn read-only from the pilot's archived populations nearest to BD $30,000, PL $25,000, DD $40,000 and DD $35,000, plus Phase 7's edge subjects: their records, envelopes, every P0 / P3 decision and the constrained rankings must give GPU = CPU. The archive must refuse another backend or code digest | `results/engineering/E3/` |
| E4 | Tests (`src/vg-l0-risk-envelope-stage-b/tests/`): P3 deep-equals Stage A's P3; P3 stage wiring through plausibility, screen violation, rung violation, Q2, Q3 and Q5 (DD $38k: CTRL fail → EXP-30 pass with PL/BD inside; BD $28k: passes EXP-30 and fails the pilot's 40/25/25; BD $30,000 exactly passes and +1 ulp fails; PL $25,000 exactly passes and +1 ulp fails; the denominators are C0 and funded principal); invalid states (an error record is never eligible, a missing or invalid envelope throws); seeds are arm-independent and R3–R18 are distinct and new; the budget bound = 8,800,278; the statistics (bootstrap determinism, V = $0 handling, the verdict logic); the door-order guards; no hidden 35k or 25k banked rule in the Stage B code (static) | `results/engineering/E4/tests.txt` |
| E5 | `npm run research-preflight -- --study research/vg-l0-risk-envelope-stage-b` PASS (3.0.0, optimization, gpu-required, NL0 pinned, departures with agreement) | `results/engineering/E5/` |
| E6 | The live official gate opens on D19, D21 and D24 for this study on the committed lineage (attestations) | `results/engineering/E6/` |

Strategy Lab and every frozen record stay unchanged. Strategy Lab nonregression (portfolio parity of the frozen pooled
candidates, unit tests and build) and the full `npm test` run in the final regression, with the known pre-existing
failures listed in `docs`/memory as such.

## 13. The execution window and stopping rules

- **Window:** 2026-11-22T21:14Z (the start of this session's execution) → **2026-11-23T06:14Z** (nine hours, hard).
  Engineering, official stages, analysis, regression, reports and packaging all fall inside it. **The window is a
  ceiling, not a target:** when the preregistered work is done, the study stops.
- **Launch rule.** A fold's search job is launched only if the current time plus that fold's conservative forecast is no
  later than **2026-11-23T04:30Z**. The forecast covers the fold's search, qualification and interval:
  - for C19, the 8-lane rates scaled by door length;
  - later, the 64-lane rate measured in the previous search job, scaled by door length (sessions), × 1.5.
  - The reserve 04:30Z–06:14Z is for analysis, regression, reports and the ZIP.
- **If a fold cannot be launched,** the study stops at the last completed fold (a paired checkpoint: every completed
  unit holds both arms of every pair of that cutoff). It is reported **incomplete**, its preregistered remainder named.
  Partial data are never represented as the full study.
- **A running job is never shortened.** If the hard end approaches during a job (it should not under the launch rule),
  the job is stopped gracefully (SIGTERM → checkpoint). Its fold is reported incomplete and is not analysed as complete.
- **Monitoring is blinded.** The only quantities read while a stage runs are operational: progress counts, evaluations
  per second, memory, VRAM, errors and stop reasons. No profitability, qualification or selection outcome informs an
  operational decision.
- **Fail closed** on an engineering blocker, a loss of GPU acceptance, a parity disagreement, a failed E2, a door-order
  violation or a resource problem. The run stops and the failure is reported. There is no one-arm substitute, no CPU
  fallback, no shortened arm and no automatic restart loop.
- **No automatic extension** to extra seeds, cells, cutoffs or policies.

## 14. Reporting and handoff

The report holds written analysis, Markdown tables and machine-readable results only, with no visuals (standard §7.7):
- `REPORT.md` and `READ_FIRST.md`;
- `DECISION_REGISTER.md`: adopt P3, a narrowly motivated follow-up, or return to P0 and staged trailing-stop work. The
  user decides; the study recommends;
- result tables (CSV / JSON / Markdown) at the seed level and the cutoff level;
- compute accounting, provenance, commands and the checkpoint `RESEARCH_RECOVERY.md`.

The deliverable is a portable ZIP with `READ_FIRST.md` and `MANIFEST.sha256`, verified after assembly. It contains no
market data, SQLite archives or caches; those are named with paths and hashes. Favourable and unfavourable outcomes are
reported alike. Passing non-inferiority is evidence for considering P3, **not** a change of the standard.

## 15. Resources

- Every official stage and every non-official evaluating tool runs as a transient systemd user unit in
  `vgl0reb.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0; `tools/vg-l0-risk-envelope-stage-b/launch.sh`).
- One GPU job runs at a time. The execution shape is 8 host workers, batch 8,192 and linger 30 ms; VRAM is ≈ 5–7 GB
  per job.
- Every process runs `node --no-maglev`. Archives persist every evaluation as it returns, and progress checkpoints are
  kept.
- Resume = the same command with `--resume`. There is no automatic restart.
- Market data are read in place. Job state goes to `research/vg-l0-risk-envelope-stage-b/cache/` (git-ignored).

## 16. No-go rules

Any of the following stops the study:
- a failed engineering gate;
- any CPU-scored official evaluation;
- a stale acceptance;
- a requested-evaluation count beyond its bound;
- a door opened out of order;
- any change after the freeze without an amendment;
- a criterion loosened after an outcome;
- an arm-dependent seed.

A blocked stage stops with a verified partial report. Nothing is bypassed.

## 17. Amendment rules

- `AMENDMENTS.md` is **append-only**. Each entry gives an ID, the UTC time (from `date -u`), the change, why, which
  results existed at the time, and its effect.
- **Pre-freeze entries** (`P*`) may refine the implementation of this protocol before any official evaluation. They
  may never change an arm, cell, cutoff, replicate set, statistic, margin, budget or the window.
- **After the freeze:**
  - **Disclosures** (`D*`) record incidents and test or script defects.
  - **Operational amendments** (`O*`) record resource or launch changes that select nothing.
  - **Code amendments** (`A*`) are defect fixes that change no rule. Each carries a sealed, committed record
    `results/amendments/A<n>.json` listing every changed file of the code closure, with the old and new digests chained
    from the frozen one. The official guards accept a new code digest only through such a record.
- **Criteria are never loosened, and no arm, cell, cutoff, replicate, policy, statistic, margin or threshold is added,
  removed or changed, once any result it governs exists.**
- A failure is a result.
