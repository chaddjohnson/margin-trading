# Optimization research standard

- **Version:** 1.1.0 — **effective** 2026-11-09 — **status:** current (1.0.0, effective 2026-11-08, remains registered
  for the studies that pinned it).
- **Authoritative path:** `docs/research/OPTIMIZATION_STANDARD.md` (this file). There is no other copy; earlier versions
  are read from git history (`git log -p -- docs/research/OPTIMIZATION_STANDARD.md`).
- **Version registry:** `docs/research/optimization-standard.versions.json` (version → sha256 of this file).
- **Companions:**
  - [STUDY_PROTOCOL_TEMPLATE.md](STUDY_PROTOCOL_TEMPLATE.md) — the protocol skeleton every new study starts from.
  - [templates/STANDARD_ADOPTION.template.json](templates/STANDARD_ADOPTION.template.json) — the adoption manifest.
  - The preflight `npm run research-preflight -- --study research/<study>` (`src/research-standard/`).
- **Change log:** at the end of this file (§8).

This standard sets how optimization research is done in this repository: what is mandatory, what each study must
specify, what is report-only, and what can change only through a documented amendment. It does not replace a study's
own protocol; every new study writes one from the template and pins the version of this standard it adopted.

## 0. Scope, terms and precedence

### 0.1 When it applies

- **Every new optimization study.** That is any search, refinement, architecture choice, ETF choice, threshold choice
  or ranking choice made by a backend research runner (`research/<study>/` with its own `src/<study>/` namespace).
- **Every material continuation of one.** That includes a new search lane, a new budget, a new cutoff, a new
  validation, or new selectable candidates added to a frozen set.
- **Bounded diagnostics of frozen selections that open validation data** (for example a retrospective pooled
  comparison). They adopt the standard with scope `diagnostic`. §1, §2.1, §3.4, §5 and §6 apply, and (from 1.1.0) the
  report-only §2.8 and §2.9 where they are relevant. §4 (search) does not, except that a diagnostic never searches.
- **Not retroactive.** Studies completed before 2026-11-08 keep their own frozen protocols. They are never edited,
  re-hashed or rerun to look compliant (see [context-recovery.md](../claude/context-recovery.md) §4).

All research is backend work: canonical data, headless runners and CLI commands. Strategy Lab, its HTTP endpoints,
Interactive Preview and browser automation are never part of an optimization (see
[RESEARCH_WORKFLOW.md](../strategy-lab/RESEARCH_WORKFLOW.md) §1, §5). Backend-generated report charts are allowed.

### 0.2 Requirement levels

| Tag | Meaning |
|---|---|
| **[M] Mandatory** | Every study follows it. A departure needs the user's explicit agreement, recorded as a *departure* in the adoption manifest and the protocol (§7.3). |
| **[S] Specify** | The protocol must state the study's exact choice, value or formula before the freeze. A choice that differs from a default given here is an *adaptation*, justified in the protocol. |
| **[R] Report-only** | It must be reported. It is never a selection, ranking, stopping or qualification input. |
| **[A] Amendment** | Changing it after the freeze needs an entry in the study's append-only `AMENDMENTS.md`: ID, UTC time, the change, why, which results existed, and its effect. Criteria are never loosened by amendment once results they govern exist. |

**General amendment rule [M].** Everything a frozen protocol fixes is [A]: windows, doors, budgets, seeds, gates,
roles, ranking, the primary-selection rule, the validation plan and the evaluation code. The sections below name the
items where amendments most often arise.

### 0.3 Terms

- **Development window.** 2016-01-04 → 2024-12-31 (sessions on canonical data). This is where all optimization and
  selection happens.
- **Validation window.** 2025-01-01 → the study's **common complete endpoint**. The first session is 2025-01-02.
- **Common complete endpoint.** The latest date D such that every instrument the study trades has a complete regular
  session at D in its canonical file (recorded by sha256), and no session between the start and D is missing. It is
  verified from the files, never assumed.
- **Door.** A data source that physically holds only the rows a stage may read: a byte-prefix file through a cutoff,
  or the full file. Every door is verified by size, sha256 and last-row time before parsing, and every opening is
  logged.
- **Frozen / sealed.**
  - *Frozen:* fixed by a protocol whose sha256 is recorded before the governed work starts.
  - *Sealed:* a record written once, made read-only (0444), with its sha256 appended to the study's `seals.jsonl`.
- **Marked net.** Realized P&L plus Σ open lots (shares × the latest price − outstanding principal − accrued
  interest), after per-side costs and interest. An open lot's exit cost is not yet charged.
- **Maximum minute drawdown (DD).** The largest decline of the marked net from a running peak.
  - It uses a strict tracker (a new peak only when strictly higher).
  - The tracker updates at every regular-session minute close while any lot is held, and at every session close.
  - It runs from the run's first session and is reported in dollars.
  - **DD % = DD $ ÷ the fixed principal budget** (here $100,000), never ÷ peak equity.
- **Period (reset) drawdown.** The same tracker restarted at a boundary close, with the peak = the marked net at that
  close.
- **Validation P&L.** The marked net at the validation end − the marked net at the 2024-12-31 close, in one continuous
  run.
- **Centre.** The candidate configuration itself, as opposed to its perturbed neighbours.
- **Neighbourhood statistics** (the default instrument, §5.3):
  - median, p10 and p90 of the neighbours' net;
  - **robust net = ½ median + ½ p10**;
  - median, p90 and worst of the neighbours' DD;
  - the breach count and share (DD > the ceiling), the mean excess and the worst.
  - Quantiles interpolate linearly between order statistics (`src/vgt-d1-growth-joint/fitness.ts` `quantile`).
- **Tail-severity statistics** (report-only, §5.8; added in 1.1.0). Over the n neighbours' maximum minute drawdowns:
  - **p95 DD:** the 0.95 quantile under the same interpolation;
  - **worst-10% mean DD:** the mean of the k = ⌈0.1 × n⌉ largest drawdowns (for n = 384, k = 39). It includes every
    draw in that tail, breaching or not;
  - **mean excess among breaches:** the mean of (DD − ceiling) over the draws with DD > ceiling (§5.5).
- **Original gate verdict / descriptive evidence / user-directed consideration** (§2.8; added in 1.1.0).
  - *Original gate verdict:* a candidate's sealed qualification result, gate by gate.
  - *Descriptive evidence:* any later or report-only figure about it (a diagnostic, a validation, a toggle).
  - *User-directed consideration:* the user's explicit decision to keep investigating a candidate. It is never a
    qualification.
- **Participation stages** (§2.9; added in 1.1.0). Why a component of a pool trades or not, stage by stage:
  - *signals:* raw entry conditions and crossings of its own book;
  - *filters:* filter blocks, eligibility arming, expiry and invalidation, continuation and pending orders;
  - *capital competition:* its decisions refused because a real lot or reservation held the capital (named occupant);
  - *virtual-state waiting:* time its refused virtual trade stays open while the capital is idle;
  - *search/promotion attrition:* participation classes lost between proposal, evaluation, feasibility, promotion and
    the shortlist.
- **Distinct candidate proposal.** A configuration with a new canonical identity, proposed by the search as a
  **centre**. The identity canonicalizes inactive genes, so behaviourally inert differences do not count twice.
- **Backend evaluation.** One complete pooled simulation of one configuration under one option set on one door,
  computed fresh. Archive/cache hits are counted separately.
- **Incumbent.** An exact, previously selected configuration, reproduced to the cent before use. Examples: VG #2
  Balanced `S8-VG-F24-3`, the shipped D1 VGT `primary`, Growth #4 `420cd989e4fa7749`, Growth `08500a60ec56cfae`.
- **Independent lane / informed lane.**
  - *Independent:* nothing in its proposals, seeds, ranges or selection derives from configurations selected with
    data after the lane's cutoff, or from examined validation outcomes.
  - *Informed:* anything else, for example seeds from incumbents, later studies' winners, or ranges narrowed around
    known settings.
- **Booked P&L of a family.** Σ net of that family's funded lots.
- **Causal contribution of a family.** The system's net − the net of the same configuration rerun through the pool
  with that family disabled. Capital availability changes when a family is removed, so the two numbers differ.
- **Token participation.** A family receives capital, but its share of the funded principal-days is below 5% (default,
  [S]).

### 0.4 Precedence

1. The user's explicit instructions for the task (the brief and the session).
2. For an existing study: its frozen protocol, its amendments and its pinned version of this standard.
3. For a new study: the current version of this standard.
4. Other repository documents ([STUDY8_METHODOLOGY.md](../strategy-lab/STUDY8_METHODOLOGY.md) is the historical record
   of Study 8, not a rule set).

When a brief conflicts with an [M] rule, the study records the conflict as a departure citing the brief, which is the
user's agreement. When the brief is silent, this standard applies.

## 1. Date separation and provenance

1. **[M] Development only for choices.** Every optimization, refinement, architecture selection, ETF selection,
   threshold, range and ranking choice uses development data (2016-01-04 → 2024-12-31) only.
2. **[M] Validation only for frozen selections.** 2025–2026 data are opened only to evaluate selections already frozen.
3. **[M][S] The endpoint.** Each study records its actual common complete endpoint (§0.3) with the data hashes. It
   never implies that unavailable dates (for example November–December 2026) were tested.
4. **[M] Freeze before opening.** Before any new validation result of a candidate exists, the following are frozen,
   sealed and **committed**:
   - the primary, the shortlist and the reporting roles;
   - the validation tests and any validation perturbation families.

   A door guard refuses validation data until that record exists unchanged.
5. **[M] No validation feedback.**
   - No new winner is chosen by validation profit.
   - Validation never changes a range, a ranking, a role, a candidate or a stopping decision.
   - A failed validation is a result. It does not authorize another search on the same validation outcomes.
6. **[M] Previously examined history.** When the validation window was examined before, by any study, the browser or
   a report, the study says so: "validation on previously examined history, not an untouched holdout". It lists the
   prior knowledge (known outcomes, incumbents chosen with that window in view).
7. **[M] Continuous state.**
   - Runs are continuous across every boundary: no liquidation, no state reset, marks preserved.
   - Validation P&L is the marked change from the 2024-12-31 close.
   - The reset validation DD and the whole-run DD are both reported.
8. **[M for search studies][S] Earlier cutoffs.**
   - **The repeat.** The complete search and selection is repeated at earlier cutoffs entirely inside development
     (default C19, C21, C23: training through 2019-12-31, 2021-12-31 and 2023-12-29). Each cutoff uses the same
     budget and reads its own door only.
   - **Order.** Each fold's selection is sealed and committed before its evaluation slice opens.
   - **Verdict.** A sequential policy chains the fold primaries over their slices. The protocol freezes a verdict
     rule (default: *supported* iff every fold produced a primary, the sequential net > 0 and the sequential minute DD
     ≤ the ceiling).
9. **[M] Independent versus informed cutoff evidence.**
   - Only independent lanes count as chronological evidence of a procedure.
   - An informed search seeded with later-selected settings is labelled informed and has no chronological test
     unless the seeds' own provenance was cut off too.
10. **[M] Report procedure failures** (a fold without a primary, a failed sequential verdict, slice breaches), even
    when the final candidate has a good neighbourhood. Local stability and chronological reliability are different
    evidence (§5.4).
11. **[M] Standard changes never reach into an active study.** See §7.5.

**Amendment items:** the endpoint (if the data change), doors, fold cutoffs, the verdict rule.

## 2. Objectives and candidate retention

1. **[M] The risk budget.**
   - The current budget is a maximum minute DD **≤ $35,000 on one fixed $100,000 principal budget**: 35% of that
     fixed budget, not 35% of peak account equity.
   - Any equity-based drawdown is reported separately, with its denominator named.
   - Historical compliance is not a guarantee of future drawdown, and reports say so.
   - The value changes only by the user's instruction, recorded in §8.
2. **[M] Net profit stays central.** Actual net profit (realized + marked unrealized, after costs and interest) is a
   central objective. Neighbourhood risk and stability are assessed beside it. They do not replace it.
3. **[M][S] Roles.** Each study maintains separate development-selected roles, each with an exact formula in the
   protocol:

   | Role | Default formula (adapt with justification) |
   |---|---|
   | **Actual-profit** | The highest centre net among qualified members (all gates hold, centre DD ≤ ceiling). |
   | **Robust-profit** | The highest selection-family robust net among qualified members. |
   | **Balanced** | The highest selection robust net ÷ selection p90 DD. |
   | **Lower-drawdown** | The lowest selection p90 DD among members whose robust net is ≥ 50% of the primary's. Used where useful. |

   - Roles are ranked on **selection** families.
   - **Confirmation** families (independent seeds) decide qualification only.
   - A member may hold several roles. The reports list each role's holder.
4. **[M] The Pareto set.**
   - The study keeps and reports the non-dominated set of qualified candidates on four objectives: maximize centre
     net; minimize centre DD; maximize neighbourhood p10 net; minimize neighbourhood p90 DD.
   - **Promotion guard.** Early promotion (screen → rung 1 → later rungs) must not let one robustness statistic remove
     every profitable alternative. Each promotion step reserves a declared share (default ≥ ¼) for centre-profit rank
     within the constraints, alongside robust rank and diversity.
5. **[M][S] The primary-selection rule** is frozen before results and states what the primary prioritizes:
   - **actual profit:** the actual-profit role;
   - **robust profit:** for example Priority 2's drawdown-preferring banded order on robust net;
   - **or a defined compromise:** a written formula with its weights.

   A report never calls a selection "optimal" without that qualification ("optimal by the frozen robust-first rule on
   2016–2024").
6. **[M] No arbitrary vetoes.**
   - No activity floors, annual-profit floors, largest-winner caps or equal-component-profit rules eliminate
     candidates.
   - Instead the study reports:
     - **evidence strength:** lots, wins/losses, independent episodes;
     - **episode concentration:** the largest pool-level episode's share of net, with a causal rerun without new
       funding in it;
     - **causal removal stresses:** each family disabled; the top episode blacked out.
7. **[M] Combined strategies.** When a combined system is the objective, real participation is verified: each family
   receives capital at the centre.
   - Equal shares and high minimum trade counts are not imposed.
   - Token participation (§0.3) and any negative causal contribution are labelled explicitly in the selection record
     and the report.
8. **[R] Candidate consideration is not qualification** (added in 1.1.0).
   - **Three separate fields.** When the user directs that a candidate stay under investigation, every later record
     and report about it keeps three fields apart:
     1. the **original gate verdict**, exactly as sealed (for example "fails Q3");
     2. the **descriptive evidence**, from diagnostics, validation or report-only instruments;
     3. the **user-directed consideration:** who decided, where it is recorded (a brief line or a session instruction),
        its date and its scope.
   - **What consideration does not do.** It never:
     - relabels a failed gate as passed;
     - changes a sealed outcome;
     - approves deployment;
     - sets a numeric tolerance or a global risk threshold;
     - changes the $35,000 centre budget (§2.1).
   - **Using a considered candidate.** It enters a later study only as that study's brief says: as a control, or as an
     informed seed under §3.3. It is labelled "considered despite failing Qn".
9. **[R] Participation attribution** (added in 1.1.0).
   - **When it applies.** A pooled search or selected system leaves a component unfunded, token or rarely funded, and
     the report explains why.
   - **Each stage separately** (§0.3 participation stages):
     - signals;
     - filters and eligibility;
     - real capital competition (who held the capital, by family and symbol; in a pool of one family, the competitor
       is a book of that family, so a four-component explanation is not carried over to it);
     - virtual-state waiting;
     - search and promotion attrition.
   - **Counting.** Every available opportunity and every independent market episode are both counted. Actual time
     invested and idle is reported apart from virtual time invested. Overlapping intervals are disclosed, never counted
     twice.
   - **Not an achievable improvement.**
     - An unfunded virtual trade's standalone profit is descriptive. Such profits are never summed as an improvement the
       pool could achieve.
     - A condition that holds while a book is virtually invested is not automatically a missed valid decision.
     - A counterfactual that needs another funding lifecycle stays unresolved until that lifecycle is implemented and
       tested.

**Amendment items:** role formulas, the primary rule, the promotion shares, the token threshold.

## 3. Incumbents and method comparisons

1. **[M] Exact incumbents are controls.**
   - Every relevant incumbent is reproduced to the cent on the study's conventions before use.
   - Its native and harmonized figures are both shown (§5.6). It stays in every comparison table.
2. **[M] Informed studies can keep an incumbent.** In a study with an informed lane, the qualifying incumbents (and
   fixed combinations of them, where the study pools families) are either:
   - members of the selectable set under the same gates and the same primary rule; or
   - covered by an explicit, frozen **no-improvement fallback**: if no searched candidate beats the best qualifying
     incumbent under the primary rule, that incumbent is the primary.

   A known stronger configuration is never quietly replaced by a weaker new phenotype merely because the latter emerged
   from search. Where a new candidate improves robustness but lowers actual profit, the report states the compromise
   in dollars.
3. **[M] Keep the lanes apart.**
   - Informed searches are separate lanes, with their own budget and labels.
   - Independent discovery and its chronological evidence never receive later-selected seeds, ranges or vectors.
4. **[M][S] Method comparisons.** Where relevant, a study (or a declared series of studies) compares:
   - **(a)** existing fixed configurations, pooled;
   - **(b)** separately optimized components, pooled;
   - **(c)** fully jointly optimized components;
   - **(d)** staged initialization followed by joint refinement.

   The conditions:
   - Every arm uses identical capital, execution, cost and interest assumptions, and frozen, matched evaluation rules:
     the same windows, neighbourhood instrument, seeds and statistics.
   - Compute budgets (proposals and evaluations) and selection provenance (independent, informed, browser-chosen,
     earlier study) are disclosed per arm.
   - **[M]** No study claims that one optimization method is superior from a single favourable historical pair. A
     method claim needs matched budgets and repeated, chronologically separated evidence.

**Amendment items:** the incumbent list, the fallback, the comparison arms and their budgets.

## 4. Search coverage, budget and stopping

1. **[S] The method fits the space.**
   - **Large spaces** use Study 8's pipeline (`src/study8-expanded-regime-d1/`, Priority 2's `src/vgt-d1-growth-joint/`):
     1. a quasi-random (Sobol / Latin-hypercube) screen;
     2. independent NSGA-II islands;
     3. multiobjective promotion;
     4. successive neighbourhood rungs (default 16 → 64 → 128 draws);
     5. local refinement and a diverse shortlist.
   - **Genuinely small spaces are enumerated.** A space is genuinely small when every distinct configuration (after
     canonicalization), and the neighbourhoods of the plausible ones, fit the declared budget at full fidelity.
2. **[M][S] Budgets in two units.** The protocol declares the budget both in **distinct candidate proposals** and in
   **backend evaluations**. Reports count separately:
   - centres;
   - neighbours (per rung);
   - earlier-fold work;
   - retries;
   - cache/archive hits.
3. **[M] Coverage is reported.**
   - Per structural class (entry family, filters, exits, allocation structure): screened, plausible, promoted and
     shortlisted counts.
   - Inactive dimensions, duplicate ledgers (behaviourally identical configurations grouped by funded-lot signature),
     and promotion reasons.
   - Entry families, filters, exits and permitted allocation structures get explicit, protected budgets (cells or
     strata).
   - **[M]** Pooled candidates are never filtered solely by standalone profitability. A component may enter the joint
     search without standalone success.
4. **[M] Both lanes, exact values.**
   - Where incumbents exist, the study runs broad independent discovery **and** a clearly labelled incumbent-informed
     refinement.
   - Incumbent values must be exactly representable on the grid. The local resolution is adequate (the fine schema
     grid, not the coarse screen grid).
   - Parameter dependencies (inactive inputs, repaired orders) and behavioural equivalences (identical ledgers) are
     respected in identity, de-duplication and counting.
5. **[M][S] The extension policy is frozen before search and uses development only.**
   - **Triggers** may add islands or refinement rounds up to declared caps. Each is measured on development fits:
     - **frontier progress:** the latest round raised the union hypervolume of (−robust net, p90 DD) against the
       reference point (0, ceiling) by more than a declared share (default 5%);
     - **robust objective:** the best feasible robust net rose by more than a declared share (default 5%);
     - **new distinct behaviour:** a new structural class or ledger-signature cluster became feasible.
   - **Progress per unit of compute** (hypervolume gain per 10,000 evaluations) is recorded per round.
   - The protocol lists the stopping conditions. The record names which one occurred: budget exhausted; stagnation
     rule met; extension cap reached; triggers not met; resource guard; user stop.
   - **Budget exhausted is not convergence.** A report never describes a budget-bound search as converged.
6. **[M][A] The pilot sizes; it does not silently shrink.**
   - Pilot timing may set the budget before the freeze.
   - A material reduction, or any change after the freeze, is an amendment that states the new level of search and its
     coverage implications (for example "768 instead of 1,024 proposals per island").
   - A pilot never turns a broad search into a different, smaller kind of study without saying so.
7. **[S] Protected investigation of multi-component participation** (added in 1.1.0; multi-symbol Growth studies and
   other pools whose components can crowd one another out).
   - **What the protocol states.** Whether, and how, it protects exploration of configurations that fund **every
     symbol's Growth book** (or every component), next to the unconstrained portfolio search and comparison. For
     example: a protected stratum, reserved promotion slots, or a separate report-only lane.
   - **What is frozen before search:** its exact budget (proposals and evaluations) and how its members are promoted,
     qualified and selected. Unless the protocol says otherwise, they compete under the same gates and primary rule.
   - **What it is not:**
     - equal activity, equal shares or a minimum trade count;
     - a rule that the winner must fund every component;
     - a reward for trades for their own sake.
   - **Choosing not to protect** is allowed if the protocol justifies it. The participation attribution (§2.9) is
     reported either way.

**Amendment items:** budgets, caps, triggers, cells/strata, grids, the method.

## 5. Verification and robustness

1. **[M] Gates before any large search**, each sealed:
   - **canonical parity:** zero tolerance, trade by trade, against the canonical engines, for the incumbents and for
     random configurations;
   - **causal data access:** a run on a shorter door equals the longer run up to that cutoff, decision for decision;
   - **accounting reconciliation:** Σ lots = net; principal ≤ the budget; grants ≤ capacity;
   - **single-family identities:** a pool with one family disabled equals that family's canonical standalone run;
   - **realistic execution stresses:** 10 and 20 bps per side, 14% interest, stop slippage, next-open stops where the
     engine supports them.
2. **[M] Optimize the funded portfolio.** Every objective is computed on the actual pooled replay:
   - refusals, displaced trades, downsizing, partial repayment and interest are all included;
   - sums of standalone trade profits are never used.
3. **[M][S] The perturbation specification.** The protocol states:
   - the radius per input, in grid or value units;
   - the distribution (default: one Latin hypercube of u ∈ [−1, 1] per seed family, common random numbers across
     centres);
   - boundary treatment (default: clip to the box widened to include the centre; the clipping count is reported);
   - categorical inputs (default: fixed in numeric neighbourhoods; categorical alternatives are separate report-only
     toggles);
   - dependent settings (inactive inputs untouched; orders repaired);
   - normalization (rounding to the grid; duplicates of the centre or of earlier draws dropped; the count of distinct
     configurations reported).

   Further rules:
   - **Seeds:** confirmation families use **independent seeds** never used for ranking.
   - **[R] Trade changes:** reports give how many draws change the funded-lot ledger (distinct ledgers; draws equal to
     the centre).
   - **Default fidelities:** rung 1 = 16, rung 2 = 64, rung 3 = 128, selection 2 × 128, confirmation 3 × 128 = 384,
     plus one-family scopes, half-radius and 1.5 × radius families (as Priority 2 §6.1). A 16-draw estimate is never a
     confirmation.
4. **[M] Local stability is not chronological reliability.** A good neighbourhood shows insensitivity to small
   parameter changes on the same history. Only fold and validation evidence speaks to other periods. Reports keep the
   two apart.
5. **[M] p90 constraints disclose their breaches.** A p90 neighbourhood-DD constraint can allow up to 10% of
   neighbours above the ceiling. Every report gives:
   - the breach frequency;
   - the mean excess;
   - the worst DD.

   Not every exploratory neighbour has to pass, unless the protocol says so.
6. **[M] Conventions are explicit.**
   - **Native → harmonized changes** are documented, and both are reproduced: start dates, arming dates, warm-ups,
     friction, data partition and split handling.
   - **Tests** cover capital limits, reservations, simultaneous (same-instant) events, independent exits, partial
     shares/sales, year boundaries, period drawdowns and open remainders at an endpoint.
7. **[M] Failures are kept.**
   - Failed tests and amendments are preserved, never deleted.
   - A parity failure stops every dependent stage until it is fixed and re-sealed.
8. **[R] Tail severity beside frequency** (added in 1.1.0). Every neighbourhood risk review reports, beside the p90 DD
   and the §5.5 disclosure:
   - the p95 DD and the **worst-10% mean DD** (§0.3);
   - the breach share with its finite-draw uncertainty (for example a Wilson 95% interval);
   - how the breach share and the tail change with the radius (the small and wide families);
   - the number of distinct ledgers behind the breaches.

   These statistics are report-only. They are never a qualification gate, a ranking input or a numeric tolerance. The
   p90 gates and the $35,000 centre budget are unchanged. A neighbourhood's breach frequency is not an estimate of the
   probability of a future market loss. Neither p90 alone nor breach frequency alone shows that one candidate is safer
   than another: a rare but severe tail and a frequent but mild one are reported side by side.

**Amendment items:** the instrument (radii, seeds, fidelities), stresses, the parity set.

## 6. Memory, throughput and recoverability

1. **Context.** Apollo has 64 GB RAM.
   - The user welcomes more resource use when it improves throughput safely.
   - About 6–10 GB of measured use is not itself a limitation or defect.
   - Memory is never allocated merely to fill RAM.
2. **[M] Aggregate containment.**
   - All concurrently running processes of a study's research workload run in transient systemd user units inside one
     parent slice, with **MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0** on the slice. Claude, tmux and host services
     stay outside it.
   - These are ceilings, not targets.
   - Never launch several independent 48G jobs without one common aggregate cap.
   - Raising the cap above 48G needs the user's separate approval. Tuning within it is authorized.
3. **[M for optimization studies] The pilot benchmarks before it chooses.**
   - **What to run:** several safe worker counts and cache sizes on representative backend work, for example the
     study's real evaluation mix on its largest development door.
   - **What to measure:**
     - throughput (evaluations/s);
     - CPU saturation;
     - aggregate RSS and cgroup memory (`memory.current`, `memory.peak`, events);
     - external/ArrayBuffer memory;
     - I/O;
     - headroom.
   - **How to choose:** pick the fastest stable configuration. Do not assume RAM is the bottleneck or that more workers
     always help.
   - Leave headroom for other host workloads. Stop dispatching at a declared pressure threshold below the hard limit.
   - Diagnostics and bounded follow-ups report observed use instead and do not run a tuning benchmark.
4. **[M] Recoverability.**
   - Queues and caches are bounded.
   - Results persist to disk as they arrive (an archive bound to the study, job, door pin and evaluation-code digest).
   - RNG and search state are checkpointed.
   - The pilot tests a graceful interruption, an abrupt unit kill and an abrupt worker kill, each with identical
     resumption.
   - A worker failure fails or checkpoints the job. It never hangs (drop the dead worker's in-flight tasks;
     Priority 1's AMENDMENTS E1).
   - There is no automatic restart loop after an OOM.
   - Node's old-space limit does not cap typed arrays or aggregate memory. Child-process workers call `gc()` on a
     schedule and when ArrayBuffers grow.
5. **[S]** The resource contract (slice, worker count, caches, pressure threshold, gc cadence) is written into the
   protocol and recorded in the freeze.

**Amendment items:** worker counts and caches after the freeze (these are operational amendments, `O*`), the pressure
threshold, and any change of the cap (with the user's approval).

## 7. Governance, versioning and the mandatory read workflow

1. **[M] Read before acting.** Before any new optimization or material continuation, Claude (or any agent) does three
   things:
   1. reads this standard in full (the version current at that time) and the study's protocol and amendments;
   2. records an **adoption manifest** `research/<study>/STANDARD_ADOPTION.json` (template:
      [templates/STANDARD_ADOPTION.template.json](templates/STANDARD_ADOPTION.template.json));
   3. passes the **preflight** (`npm run research-preflight -- --study research/<study>`) before the first substantive
      stage.

   New runners call the same check in code (`requireStandardAdoption` in `src/research-standard/preflight.ts`) before
   a search, qualification or validation stage.
2. **[M] The adoption manifest's contents.**
   - the standard's path, version and sha256;
   - the UTC read and adoption times;
   - the study protocol's path and sha256;
   - the date split and the common complete endpoint;
   - the objective, the primary-selection rule and the roles;
   - the risk ceiling and its denominator;
   - the budget (proposals, evaluations);
   - the scope (`optimization`, `continuation` or `diagnostic`);
   - every deviation.

   The protocol carries the same adoption entry, including the standard's version and sha256.
3. **[M] Adaptations versus departures.**
   - An **adaptation** is a justified study-specific choice where this standard says [S] or gives a default.
   - A **departure** changes or omits an [M] rule. It needs the user's agreement (a brief, or an instruction in the
     session), cited in the manifest.
   - The preflight refuses a departure without an agreement reference.
4. **[M] Versioning.**
   - **The numbering** follows semantic versioning:
     - **major:** a mandatory rule added, removed or changed;
     - **minor:** new guidance, defaults or [S]/[R] items;
     - **patch:** wording only, with no change to what a study must do.
   - **When to change.** The standard changes only after the user agrees a process change.
   - **The change-log entry** (§8) gives the version, the effective date, the rationale, the evidence (study paths),
     what changed and the implications for active studies.
   - **The registry** records the new file's sha256.
   - **Detection.** The preflight fails for every study if this file no longer matches its registered sha256, so an
     unregistered edit cannot pass silently.
5. **[M] Studies pin their version.**
   - A study keeps the version it adopted. A newer standard does not change a frozen study's rules.
   - Continuing a frozen study after an update does one of two things:
     - **retains its pinned version:** the preflight passes with a notice, and the checkpoint records "retained pinned
       standard x.y.z";
     - **migrates explicitly:** it records an amendment adopting the new version (new adoption manifest; old manifest
       kept as history).
   - History is never rewritten, and rules are never migrated silently.
6. **Enforcement limits (stated honestly).**
   - **What the preflight verifies:**
     - the manifest exists and is complete;
     - its hashes match the registered standard and the current protocol;
     - its declared windows and risk budget agree with the standard, or are covered by a recorded departure;
     - every departure cites an agreement.
   - **What it cannot verify:** that an agent read or understood the document, or that the study's code obeys it.
   - **Who checks those:** protocol reviews, the study's own guards (doors, seals, freezes) and the user's review.
   - The `CLAUDE.md` instruction is an instruction, not a mechanism.

## 8. Change log

| Version | Effective | Change | Rationale and evidence | Implications |
|---|---|---|---|---|
| 1.1.0 | 2026-11-09 | **Minor** (§7.4: new guidance and [S]/[R] items; no [M] rule added, removed or changed; existing item numbers kept). Adds: §0.3 tail-severity statistics (p95, the worst-10% mean DD), the three consideration fields and the participation stages; §2.8 [R] candidate consideration is not qualification; §2.9 [R] participation attribution; §4.7 [S] protected investigation of multi-component participation; §5.8 [R] tail severity beside frequency. The companions follow: the protocol template (§4, §6, §9, §15) and the roadmap's sequencing note. The preflight's checks are unchanged (these items are protocol and report content it cannot verify, §7.6); its tests now also cover a study that retains 1.0.0 under a current 1.1.0. | The user's agreed process decisions in the Priority 3A brief (`research/vg-d1-growth-diagnostic/brief/BRIEF.md` §7, 2026-11-09). Evidence: Priority 3 (`research/vg-d1-growth-joint/REPORT.md`): (1) the unchanged VG #2 + Growth #4 / 08500a60 + Appendix A combinations failed Q3 (p90 DD $36,277.63 / $35,131.47) yet are kept by the user as candidates to investigate → §2.8; (2) the frozen primary passed Q3 with rare but severe breaches (2.6%, worst $103,278.13) while those combinations failed it with more frequent, milder breaches (13.3% / 10.9%, mean excess ≈ $4,000) → §5.8; (3) searched Growth·GDX books were mostly unfunded, without a stage-by-stage explanation → §2.9, §4.7. | Applies to studies adopting it from 2026-11-09. It does not change any frozen study's rules or results: studies pinned to 1.0.0 keep their pin (the preflight passes with a notice; a continuation records "retained pinned standard 1.0.0" or migrates by amendment, §7.5). The $35,000 budget and every gate are unchanged; no numeric tolerance is introduced. The first adopter is `research/vg-d1-growth-diagnostic/` (scope `diagnostic`). |
| 1.0.0 | 2026-11-08 | First version. Consolidates the practice of Study 8, growth140-vgt-stable, Priority 1 (`research/vg-balanced-entry-eligibility/`) and Priority 2 (`research/vgt-d1-growth-joint/`). Adds the adoption manifest, the preflight and the `CLAUDE.md` read instruction. | The user's Priority 2 follow-up brief (`research/vgt-d1-growth-separate-pooled/brief/BRIEF.md`). Evidence: Priority 2's fixed D1 primary + Growth #4 combination beat its joint primary, but was not selectable (→ §3.2); its folds failed chronologically while the final neighbourhood looked stable (→ §1.10, §5.4); the stable Growth study's promotion excluded Rise and gate structures (→ §2.4, §4.3); Priority 1's capital-displacement finding (→ §5.2); the 2026-11-07 OOM and the dead-worker hang (→ §6.2, §6.4). | Applies to new studies from 2026-11-08. Completed studies are not retrofitted. The first adopter is `research/vgt-d1-growth-separate-pooled/` (scope `diagnostic`). |
