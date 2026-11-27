# Optimization research standard

- **Version:** 4.0.0 — **effective** 2026-11-27 — **status:** current (3.0.0, effective 2026-11-19, 2.2.0, effective
  2026-11-13, 2.1.0, effective 2026-11-12, 2.0.0 and 1.1.0, effective 2026-11-09, and 1.0.0, effective 2026-11-08, remain
  registered for the studies that pinned them).
- **Authoritative path:** `docs/research/OPTIMIZATION_STANDARD.md` (this file). There is no other copy; earlier versions
  are read from git history (`git log -p -- docs/research/OPTIMIZATION_STANDARD.md`).
- **Version registry:** `docs/research/optimization-standard.versions.json` (version → sha256 of this file).
- **Companions:**
  - [STUDY_PROTOCOL_TEMPLATE.md](STUDY_PROTOCOL_TEMPLATE.md) — the protocol skeleton every new study starts from.
  - [templates/STANDARD_ADOPTION.template.json](templates/STANDARD_ADOPTION.template.json) — the adoption manifest.
  - The preflight `npm run research-preflight -- --study research/<study>` (`src/research-standard/`).
  - [methods/](methods/) — versioned **reference methods** (registry `methods/methods.versions.json`), e.g.
    [NEW_L0_METHOD.md](methods/NEW_L0_METHOD.md), the recovered procedure that produced New L0 (§4.8, from 2.1.0).
- **Change log:** §8. **GPU-only official optimization and CPU/GPU parity:** §9 (from 3.0.0), after the change log so
  that the earlier section numbers stay unchanged; its companions are [docs/gpu/](../gpu/).
- **Research date ranges** (from 4.0.0): `config/research/date-ranges.json` — the authoritative, explicit development and
  validation windows (§1), read by `src/lib/researchRanges.ts`; the canonical files' verified earlier versions:
  `config/market-data/vintages.json` (`src/lib/canonicalPrefix.ts`).

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
[RESEARCH_WORKFLOW.md](../strategy-lab/RESEARCH_WORKFLOW.md) §1, §5). Research is reported in written analysis,
Markdown tables and machine-readable results only, with no visual artifacts (§7.7, from 2.0.0). From 3.0.0, every
official evaluation of an optimization runs on the attested GPU evaluator with no CPU fallback, and every change to an
evaluation dependency keeps CPU/GPU parity (§9).

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

- **Research date range** (from 4.0.0). The authoritative, explicit inclusive New York session dates of formal research,
  `config/research/date-ranges.json`: a development window and a validation window, each with a fixed end. They are
  dates, independent of how far the canonical files reach. The range in force is `current`; a study pins the range it
  adopted. **R1** (in force from 2026-11-08, recorded 2026-11-27): development 2016-01-04 → 2024-12-31, validation
  2025-01-01 → 2026-10-30.
- **Development window.** The development window of the study's research date range (R1: 2016-01-04 → 2024-12-31,
  sessions on canonical data). This is where all optimization and selection happens.
- **Validation window.** 2025-01-01 → the study's **validation end**: the authorized validation end of its research
  date range (R1: 2026-10-30), or an earlier date its protocol fixes. The first session is 2025-01-02. It is a fixed
  date, never "the end of the files" (from 4.0.0).
- **Common complete endpoint.** The study's validation end, verified from the files: every instrument the study trades
  has a complete regular session at that date in its canonical file (recorded by a byte-prefix pin, from 4.0.0), and no
  session between the start and it is missing. Later rows may exist in the files; they are outside every formal window.
  (Before 4.0.0: the latest such date in the files.)
- **Door.** A data source that physically holds — or, from 4.0.0, reads — only the rows a stage may read: a byte-prefix
  file through a cutoff, or a verified byte prefix of the canonical file read no further (`src/lib/canonicalPrefix.ts`,
  the loaders' `pin` and formal-stage access, `src/lib/evaluation.ts`). Every door is verified by size, sha256 and
  last-row time before parsing, and every opening is logged.
- **Manual (post-validation) evaluation** (from 4.0.0). A backtest outside formal research: any window of the canonical
  files, including data after the validation end. It is never optimization, selection, qualification or validation
  evidence (§1.13).
- **Vintage** (from 4.0.0). A verified earlier version of a canonical file: the files only grow by appending rows after
  their last bar, so an earlier file is exactly the first `bytes` bytes of today's file and hashes to its old sha256
  (`config/market-data/vintages.json`).
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
   threshold, range and ranking choice uses development data (the development window of the study's research date
   range; R1: 2016-01-04 → 2024-12-31) only.
2. **[M] Validation only for frozen selections.** Validation-window data (R1: 2025-01-01 → 2026-10-30) are opened only to
   evaluate selections already frozen.
3. **[M][S] Explicit, fixed windows and the endpoint** (rewritten in 4.0.0).
   - Before the governed research begins, the protocol and the adoption manifest fix the study's windows as explicit
     dates inside its research date range (`dateRanges`: the range's id). The validation end is the range's authorized
     end, or an earlier date the protocol fixes; it never follows the files' coverage.
   - The study verifies that every traded instrument's file holds the validation end completely (§0.3) and records the
     byte-prefix provenance of each instrument's data through it (`dataPins`: file, bytes, sha256, through-date), so the
     exact inputs stay verifiable however the files grow (§1.14).
   - Reports never imply that dates outside the windows (for example data appended later) were tested.
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
   - **[S] Consequence** (added in 2.2.0). Before any search, the protocol states what an independent chronological
     verdict that fails, or cannot be computed (for example a fold without a primary), means for the study's final
     selection. Default (adapt with justification): *"no chronological support: the final selection is not a
     deployment-qualified candidate without an explicit user decision"*.
     - The consequence is governance: a label on the final selection and a decision point for the user. It is never a
       fitness term, a ranking input, an objective weight or a numeric gate. It never changes a sealed gate verdict
       (the §2.8 discipline applies).
     - "No qualifying candidate" is a valid outcome of a study and is reported as such.
     - A selection from an informed lane (§1.9) has no independent chronological test by construction. Its label is
       "no independent chronological test", and it never claims the independent lanes' folds as its support. The
       protocol's consequence applies to it as to a failed verdict unless the protocol justifies otherwise.
     - Studies that pinned an earlier version keep their own labels; they are not re-labelled (§0.1, §7.5).
9. **[M] Independent versus informed cutoff evidence.**
   - Only independent lanes count as chronological evidence of a procedure.
   - An informed search seeded with later-selected settings is labelled informed and has no chronological test
     unless the seeds' own provenance was cut off too.
10. **[M] Report procedure failures** (a fold without a primary, a failed sequential verdict, slice breaches), even
    when the final candidate has a good neighbourhood. Local stability and chronological reliability are different
    evidence (§5.4).
11. **[M] Standard changes never reach into an active study.** See §7.5.

12. **[M] Appended data never move a window** (added in 4.0.0).
    - The canonical files grow continuously: `npm run datasets -- append` adds rows after the last bar only and proves
      that every earlier byte is unchanged. Newer data never extend a study's windows, doors, folds or cutoffs, nor the
      research date range, implicitly or by default.
    - Formal stages read data only through their windows' ends, **enforced at data access**: byte-prefix doors, or the
      loaders' `development` / `validation` access (`src/lib/evaluation.ts`: a window ending after the stage's
      authorized end is refused before a byte is read, and only the bytes through the end are read). Filtering results
      after a run is never the boundary.
    - A later range is a **new entry** in `config/research/date-ranges.json` citing the user's explicit authorization,
      made `current`. Existing entries are never edited. A study keeps the range it pinned; using a newer range is a new
      study or an explicit amendment. Adding a range is not a change of this standard.
13. **[M] Manual evaluation on newer data is not research evidence** (added in 4.0.0).
    - Manual backtests may run any window, including data after the validation end. Reports label such a period
      "manual post-validation evaluation, not an extension of the formal validation dataset".
    - They are never optimization, selection, qualification or validation evidence, and never a promotion, ranking or
      stopping input.
    - Newly appended data do not adjust strategy rules, parameter ranges, phenotypes, allocator behaviour, gates or
      acceptance criteria without the user's separate authorization; a study that wants to use them as formal evidence
      needs a new authorized range and its own protocol.
    - Selecting all available data for a manual run grants no formal stage access to those dates.
14. **[M] Reproducible inputs after appends** (added in 4.0.0).
    - Every pinned input stays verifiable: a whole-file pin of an earlier file is a byte prefix of today's file (its
      vintage), verified by hashing that prefix; integrity checks are never weakened or removed to accommodate an
      append.
    - Shared loaders read a pinned historical input as its verified prefix and nothing after it, so its sessions, ids,
      hashes and cache keys are unchanged (Priority 3's FULL door from 2026-11-27).
    - A completed study whose own code checks a whole file fails closed after an append; it is reproduced at its own
      commit from the verified prefix (`npm run datasets -- prefix`), never by editing its code or sealed records.
    - Cache identities of manual runs include the data version and the window, so an extended manual run never returns
      a stale result.

**Amendment items:** the endpoint (if the data change), doors, fold cutoffs, the verdict rule, the verdict's
consequence (from 2.2.0), the pinned research date range (from 4.0.0).

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

5. **[S] Convention changes** (added in 2.1.0). When a study's question is one engine convention (for example the unit
   of a maximum hold), the protocol states, and the report shows:
   - **A**, the frozen incumbent under the original convention, reproduced to the cent;
   - **B**, the same phenotype, parameters and allocator under the new convention, with no re-optimization;
   - **C**, the study's frozen selection under the new convention;
   - the decomposition C − A = (B − A), the convention effect, + (C − B), the re-optimization effect, and C's phenotype
     under the original convention (report-only), which shows whether C's gain depends on the new convention.

   The new convention is an explicit, separately keyed evaluation option; the original remains the default and keeps
   producing the original results (verified against archived records before any search). No gate, role, window or the
   $35,000 ceiling changes because of this item.

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

8. **[S] Reproducing a reference method** (added in 2.1.0). A study that re-executes a registered reference method
   (`docs/research/methods/`, versioned with a sha256 in `methods.versions.json`):
   - **pins** the method's id, version and sha256 in its protocol and in `STANDARD_ADOPTION.json` (`referenceMethod`; the
     preflight checks the pin against the registry);
   - **maps** every original stage to its own and states each adaptation, omission and reassignment. An omitted
     discovery stage (for example a structure cell outside a fixed scope) keeps its recorded budget, which is reassigned
     to the retained scope through the original per-stage schedules;
   - **scales** effort proportionally (more replicates of the unchanged per-lane schedules), so that the executed
     allocation among stages is preserved; it never enlarges one stage alone;
   - **shows budget equivalence** side by side with the original's executed work in the units both studies record
     (configured and executed proposals, islands, refinement starts and moves, requested evaluations, unique fresh
     simulations, archive hits), against the original's effective budget — the work that produced the reproduced
     result, for example its own arm — and states where the evidence is incomplete. Equal or greater effort is claimed
     only for those units.

   A reference method describes what was executed; it never relaxes an [M] rule of the version a study adopts.

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
   two apart. (From 2.2.0, §5.9 reports how each fold's training-selected neighbourhood behaved on the next slice.)
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
9. **[R] Chronological exposure disclosure** (added in 2.2.0). For every earlier-cutoff selection (each fold primary)
   and every final candidate, the report gives the items below. They come from complete pooled replays (§5.2), and
   each is labelled training or next slice.
   - **Open-lot share of training net,** at each cutoff close the study evaluates (for a final candidate: the
     development end, 2024-12-31, and every earlier cutoff it is replayed at).
     - *Numerator:* the sum over the lots open at that close of their marked value: shares × close − outstanding
       principal − accrued interest, with the exit cost not yet charged (as in the marked net, §0.3).
     - *Denominator:* the training net, which is the marked net at that close.
     - *When the training net is ≤ 0:* the share is "undefined (training net ≤ 0)", and both dollar amounts are
       given instead.
     - A negative open-lot value gives a negative share, and a share above 100% is reported as it is.
   - **Largest open lot's market-value multiple** at that close, for the open lot with the largest market value:
     - shares × close ÷ that lot's original fixed principal (for example $100,000);
     - with its book, entry date and entry price.
   - **That lot's give-back on the next slice:**
     - its mark at the cutoff close, its highest and lowest later marks (with dates) and the change of its mark to its
       exit, or to the slice end while still open;
     - its exit date, reason and raw price.

     When no lot is open at the cutoff, the report says "none open".
   - **Per-lot adverse excursion,** separately for training and for the next slice:
     - the distribution over funded lots (count, median, p90, worst) of the **maximum adverse excursion**, which is the
       lowest marked P&L of a lot during its life (realized fills plus the remainder, after costs and interest), in
       dollars;
     - the **adverse loss severity:** the worst realized lot net and the mean net of the losing lots.
   - **D1 maximum-hold-window tail stress,** for each D1 book. Over a **declared reference history**, it reports the
     loss of a $100,000 lot bought at each entry instant of the book (or at a declared proxy of it, for example every
     session close) and held over the book's maximum-hold window (its configured calendar days, or its declared upper
     bound when the hold is adaptive or disabled):
     - the worst and p95 of those losses, with dates;
     - for a book with a price stop before its maximum hold, the worst **gap through the stop** (open below the stop
       level), because a stop does not bound a loss.

     The reference history is preferably data disjoint from every window the search read (for example the same
     symbol before 2016, or a declared peer). When no disjoint data exist, a declared proxy or stress path is used and
     labelled "proxy" or "in-sample stress", never as evidence from unseen history.
   - **Training neighbourhood on the next slice,** for each fold primary. Its own selection neighbourhood (the sealed
     draws, regenerated with the study's code and seeds) is replayed over the next chronological slice, with the
     slice DD reset at the cutoff close. The report gives:
     - the share of draws above the ceiling, with its Wilson 95% interval;
     - the median and worst slice DD.

     It describes how the training-selected region behaved on the following slice. It is not evidence of prospective
     robustness.

   Rules for these items:
   - **Report-only (§0.2).** None of them is a selection, ranking, stopping or qualification input, a fitness
     adjustment or a numeric tolerance. This version attaches no threshold to any of them. A study that wants one as a
     gate or objective term must declare it in its protocol before searching, as its own rule. That is a departure
     needing the user's agreement (§7.3), or a later version of this standard.
   - **Evidence limits.** The reports state them plainly:
     - 2020, 2022 and 2025–2026 have been examined by many studies, so a retrospective stress over them is labelled
       "retrospective, previously examined history", not a pristine holdout;
     - the $35,000 ceiling is a research criterion on historical paths, not an enforceable future loss limit;
     - a price stop does not cap a loss (gaps, halts);
     - there is one market history, with few independent breaking events.
   - **Cost.** The next-slice neighbourhood costs about 256 replays per fold (the walk-forward diagnostic's D7); the
     other items come from replays the study already runs.

**Amendment items:** the instrument (radii, seeds, fidelities), stresses, the parity set, the §5.9 reference history
(from 2.2.0).

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
   protocol and recorded in the freeze. From 3.0.0 the GPU server process runs inside the same slice; the contract adds
   the GPU batch size, the VRAM budget and the batch timeout (§9; the pilot's benchmark measures them on the GPU).

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
   - from 3.0.0, the evaluation backend (`evaluationBackend`, §9.11);
   - from 4.0.0, the research date range (`dateRanges`) and the byte-prefix provenance of every instrument's data
     through the validation end (`dataPins`, §1.3);
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
     - its declared windows and risk budget agree with the standard, or are covered by a recorded departure; from
       4.0.0 every manifest's windows lie inside the research date range (`config/research/date-ranges.json`), whatever
       the files hold, and a manifest pinning 4.0.0 or later declares `dateRanges` and `dataPins`, each pin verified as a
       byte prefix of the local canonical file when present; an optimization or continuation adopted from 4.0.0's
       effective date pins 4.0.0 or later;
     - every departure cites an agreement.
   - **What it cannot verify:** that an agent read or understood the document, or that the study's code obeys it.
   - **Who checks those:** protocol reviews, the study's own guards (doors, seals, freezes) and the user's review.
   - The `CLAUDE.md` instruction is an instruction, not a mechanism.
   - From 3.0.0 the GPU policy has executable mechanisms of its own (§9.3, §9.10, §9.11) with their own limits (§9.12).
7. **[M] Reporting format: no visuals** (added in 2.0.0; the user's standing preference).
   - **What a study delivers:** written analysis, Markdown tables and machine-readable results (JSON, JSONL, CSV).
   - **What it never creates:** charts, plots, SVGs, screenshots, images, dashboards, HTML visual reports, PDFs or other
     visual artifacts. No time is spent rendering or inspecting report graphics.
   - **Earlier artifacts:** visuals of studies completed before 2.0.0 are preserved as they are, never deleted,
     regenerated or retrofitted (§0.1, not retroactive).
   - **Exceptions:** only a brief that explicitly asks for a visual artifact, recorded as a departure citing it (§7.3).
   - **Scope:** research and its reports, records and checkpoints. Strategy Lab's own application interface (its
     charts are product features, not research reports) is outside this rule.

## 8. Change log

| Version | Effective | Change | Rationale and evidence | Implications |
|---|---|---|---|---|
| 4.0.0 | 2026-11-27 | **Major** (§7.4: a mandatory rule changed and mandatory rules added; item numbers kept). §0.3 defines the **research date range** (`config/research/date-ranges.json`; R1: development 2016-01-04 → 2024-12-31, validation 2025-01-01 → 2026-10-30), the fixed **validation end** (the common complete endpoint is now that end verified in the files, no longer the files' latest complete date), byte-prefix doors without copies, manual post-validation evaluation and vintages. §1.3 is rewritten: explicit windows fixed before the research, inside the pinned range, with byte-prefix data provenance (`dateRanges`, `dataPins`). New §1.12 *appended data never move a window* (enforced at data access; a later range only as a new user-authorized entry), §1.13 *manual evaluation on newer data is not research evidence*, §1.14 *reproducible inputs after appends* (prefix verification, never weaker checks; completed studies reproduced at their commit). §7.2/§7.6 list the new manifest fields and preflight checks. The companions follow: the loaders (`src/lib/evaluation.ts` `pin` and `development`/`validation` access, `src/lib/csv.ts` `maxBytes`, `src/lib/canonicalPrefix.ts`, `src/lib/researchRanges.ts`), Priority 3's FULL door (verified prefix), `npm run datasets -- append` (prefix proof, vintage record) / `prefix` / `vintages`, the preflight (range bounds for every manifest; `dateRanges`/`dataPins` from 4.0.0; the 4.0.0 no-evasion rule), the protocol and adoption templates, `CLAUDE.md`, the roadmap, the README. | The user's brief of 2026-11-27 (`docs/data-updates/2026-11-27/BRIEF.md` §4–§6: explicit fixed ranges established before research, never changed by newer data, manual runs distinct, provenance recorded; "update [the standard] where necessary"). Evidence: the audit `docs/data-updates/2026-11-27/AUDIT.md` (the standard's endpoint was defined by the files; every adopting study had fixed 2026-10-30; an append would break Priority 3's whole-file FULL pin and skip golden masters), and the reproducibility evidence of the same directory (doors and sealed replays identical before and after the change and the append). | Applies to studies adopting it from 2026-11-27; from that date new optimization and continuation manifests adopt 4.0.0 or later. Studies pinned to 3.0.0 or earlier keep their pins, windows, engines and sealed records (never re-hashed or rerun); the preflight checks every manifest's windows against the range, which every existing manifest (validation end 2026-10-30) satisfies. The code change to the evaluation loaders makes the GPU acceptance record STALE: official GPU optimization stays blocked until a §9.9 re-acceptance (docs/gpu/PARITY_CHECKLIST.md §2). No gate, window, budget, instrument, objective weight, fitness rule or the $35,000 ceiling changes; no completed study's window moves. |
| 3.0.0 | 2026-11-19 | **Major** (§7.4: mandatory rules added). Adds §9 [M] *GPU-only official optimization and CPU/GPU parity*: official evaluations (defined in §9.1) run only on the attested NVIDIA GPU evaluator, with no CPU fallback, `auto` backend or hybrid, failing closed (§9.2); the single official gate with its live preflight and attestation (§9.3); capability coverage of the whole reachable domain (§9.4); per-batch device receipts, the conservation invariant (CPU-scored = 0) and archive provenance (§9.5); permanent bit-identical CPU/GPU parity for every evaluation-dependency change, with the TypeScript engine authoritative and CUDA C++ the accelerator (§9.6); stale-port protection by the compatibility manifest (§9.7); explicit non-official purposes for CPU evaluation (§9.8); activation only by an ACCEPTED acceptance record (§9.9); the merge gate (policy tests plus the Apollo GPU verification step; a CPU-only CI pass is never parity) and the entrypoint audit (§9.10); the adoption manifest's `evaluationBackend` and the no-evasion rule (§9.11); enforcement limits (§9.12). One-line pointers in §0.1, §6.5 and §7.6. The companions follow: `CLAUDE.md` (a mandatory section), `docs/gpu/` (checklist, feature matrix, operations), the protocol template, the adoption template (`evaluationBackend`), the preflight (`src/research-standard/gpuPolicy.ts`), the PR template and contribution guide, the roadmap. | The user's GPU Acceleration Phase 2 brief (`research/gpu-phase2/brief/BRIEF.md`, 2026-11-19): official optimization becomes GPU-only and parity a permanent policy, implemented as a new major version of this standard. Evidence: `research/gpu-phase2/` (the complete CUDA port of D1/RC, Growth 1.4.0, the pool and the risk-envelope inputs; its parity campaign, determinism, sanitizer, negative tests and fixed-seed mini-optimization; the policy tests) and Phase 1 (`research/gpu-phase1-feasibility/`). | Applies to studies adopting it from 2026-11-19; from that date new optimization and continuation manifests adopt 3.0.0 or later. Studies pinned to 2.2.0 or earlier keep their pins, engines and sealed records (never re-hashed or rerun); a continuation of one either retains its pin as a CPU-era study whose new official stages need the user's decision, or migrates by amendment. **Official GPU optimization stays blocked until `config/gpu-backend/acceptance.json` is ACCEPTED** (§9.9). No gate, window, budget, instrument, objective weight, fitness rule or the $35,000 ceiling changes. |
| 2.2.0 | 2026-11-13 | **Minor** (§7.4: a new [S] item and a new [R] item; no [M] rule added, removed or changed; existing item numbers kept). Adds §1.8 [S] *Consequence*: before searching, the protocol states what a failed or uncomputable independent chronological verdict means for the final selection (default: "no chronological support: not a deployment-qualified candidate without an explicit user decision"). It is governance, not a fitness term, ranking input or gate. "No qualifying candidate" is a valid outcome. An informed lane's selection is labelled "no independent chronological test". Adds §5.9 [R] *Chronological exposure disclosure* for every fold primary and final candidate: the open-lot share of training net (denominator and ≤ 0 handling fixed), the largest open lot's market-value multiple and its give-back on the next slice, the per-lot MAE distribution and loss severity, a D1 maximum-hold-window tail stress on a declared reference history (disjoint data, or a labelled proxy), and the training neighbourhood replayed on the next slice; with the evidence limits stated. One-line pointers in §5.4 and the amendment items. The companions follow: the protocol template (§10, §15), the adoption template (`chronologicalConsequence`), the preflight (it requires `chronologicalConsequence` from optimization and continuation studies adopting 2.2.0 or later), the roadmap. | The user's approval in the Assignment 1 brief (`research/vg-l0-risk-controls-foundation/brief/BRIEF.md` §1: "the user has approved these diagnostic/governance safeguards"). Evidence: the walk-forward diagnostic (`research/vg-l0-walk-forward-diagnostic/REPORT.md` §3–§4, recommendations 1–4 and its "Proposed narrowly scoped amendment"): 4 of 4 anchor procedures and 6 earlier ones failed chronologically; carried open lots were 33–53% of the C21 training nets of 5B, B1 and B2, at 1.5–2.5× exposure (ρ +0.72 with the 2022–2023 DD); training neighbourhoods breached in 0–8% of draws against 54–100% on the next slice; D1 dip-buys had no loss exit before their maximum hold. | Applies to studies adopting it from 2026-11-13. Studies pinned to 2.1.0, 2.0.0, 1.1.0 or 1.0.0 keep their pin, labels and sealed verdicts (the preflight passes with a notice; a continuation records "retained pinned standard x.y.z" or migrates by amendment, §7.5). No gate, window, budget, instrument, objective weight or the $35,000 ceiling changes. No numeric threshold is attached to any §5.9 item. NL0 1.0.0 (`methods/NEW_L0_METHOD.md`) is unchanged: it records what was executed, before these items existed. The first adopter is `research/vg-l0-risk-controls-foundation/` (scope `diagnostic`). |
| 2.1.0 | 2026-11-12 | **Minor** (§7.4: new [S] items; no [M] rule added, removed or changed). Adds §3.5 [S] *Convention changes* (A frozen incumbent / B direct conversion / C re-optimized selection, with the decomposition; the new convention an explicit option, the original the default) and §4.8 [S] *Reproducing a reference method* (pin, stage map, omitted-stage reassignment through the original schedules, proportional scaling by replicates, side-by-side budget equivalence against the effective original budget). Adds the companion directory `docs/research/methods/` with its registry and the first reference method, NL0 1.0.0 (`methods/NEW_L0_METHOD.md`). The preflight gains an optional check of a declared `referenceMethod` pin; the protocol template gains the matching rows. | The user's brief for the New L0 trading-session study (`research/vg-l0-session-hold/brief/BRIEF.md`, 2026-11-12, Phase 2: "Update the appropriate documentation … Where the original methodology contains reusable practices, incorporate them appropriately into the optimization documentation … Where something is specific to New L0, preserve it in a dedicated, versioned reference protocol"). Evidence: Priority 5B (`research/vg-lifecycle-matched-optimization/`), whose L0 arm produced New L0; its executed budget and stage allocation recovered in `methods/NEW_L0_METHOD.md` §4; Priorities 5A/5B's lifecycle-on-fixed-phenotype versus matched-optimization designs (the precedent for §3.5). | Applies to studies adopting it from 2026-11-12. Studies pinned to 2.0.0, 1.1.0 or 1.0.0 keep their pin (the preflight passes with a notice). No gate, window, budget, instrument or the $35,000 ceiling changes. The first adopter is `research/vg-l0-session-hold/` (scope `optimization`). |
| 2.0.0 | 2026-11-09 | **Major** (§7.4: a mandatory rule added). Adds §7.7 [M] *Reporting format: no visuals*: research is reported in written analysis, Markdown tables and machine-readable results only; no charts, plots, SVGs, screenshots, images, dashboards, HTML visual reports, PDFs or other visual artifacts; earlier visuals are preserved; a brief that explicitly asks for a visual is a recorded departure. §0.1's sentence allowing backend-generated report charts is replaced by a pointer to §7.7. No other rule changes. The companions follow: the protocol template (§15), `CLAUDE.md` (the standing reporting preference) and the roadmap. | The user's explicit reporting preference for future work, recorded in the Priority 5A brief (`research/vg-growth-funding-lifecycle/brief/BRIEF.md` §1, 2026-11-09), authorized there without a further approval question. It reconciles the earlier permission (§0.1 of 1.0.0 and 1.1.0) and the charts produced by Priority 3A (`research/vg-d1-growth-diagnostic/results/charts/`, preserved). | Applies to studies adopting it from 2026-11-09. Studies pinned to 1.0.0 or 1.1.0 keep their pin (the preflight passes with a notice; a continuation records "retained pinned standard x.y.z" or migrates by amendment, §7.5); their existing charts stay as they are. No research-method rule, gate, window, budget or the $35,000 ceiling changes. The first adopter is `research/vg-growth-funding-lifecycle/` (scope `diagnostic`). |
| 1.1.0 | 2026-11-09 | **Minor** (§7.4: new guidance and [S]/[R] items; no [M] rule added, removed or changed; existing item numbers kept). Adds: §0.3 tail-severity statistics (p95, the worst-10% mean DD), the three consideration fields and the participation stages; §2.8 [R] candidate consideration is not qualification; §2.9 [R] participation attribution; §4.7 [S] protected investigation of multi-component participation; §5.8 [R] tail severity beside frequency. The companions follow: the protocol template (§4, §6, §9, §15) and the roadmap's sequencing note. The preflight's checks are unchanged (these items are protocol and report content it cannot verify, §7.6); its tests now also cover a study that retains 1.0.0 under a current 1.1.0. | The user's agreed process decisions in the Priority 3A brief (`research/vg-d1-growth-diagnostic/brief/BRIEF.md` §7, 2026-11-09). Evidence: Priority 3 (`research/vg-d1-growth-joint/REPORT.md`): (1) the unchanged VG #2 + Growth #4 / 08500a60 + Appendix A combinations failed Q3 (p90 DD $36,277.63 / $35,131.47) yet are kept by the user as candidates to investigate → §2.8; (2) the frozen primary passed Q3 with rare but severe breaches (2.6%, worst $103,278.13) while those combinations failed it with more frequent, milder breaches (13.3% / 10.9%, mean excess ≈ $4,000) → §5.8; (3) searched Growth·GDX books were mostly unfunded, without a stage-by-stage explanation → §2.9, §4.7. | Applies to studies adopting it from 2026-11-09. It does not change any frozen study's rules or results: studies pinned to 1.0.0 keep their pin (the preflight passes with a notice; a continuation records "retained pinned standard 1.0.0" or migrates by amendment, §7.5). The $35,000 budget and every gate are unchanged; no numeric tolerance is introduced. The first adopter is `research/vg-d1-growth-diagnostic/` (scope `diagnostic`). |
| 1.0.0 | 2026-11-08 | First version. Consolidates the practice of Study 8, growth140-vgt-stable, Priority 1 (`research/vg-balanced-entry-eligibility/`) and Priority 2 (`research/vgt-d1-growth-joint/`). Adds the adoption manifest, the preflight and the `CLAUDE.md` read instruction. | The user's Priority 2 follow-up brief (`research/vgt-d1-growth-separate-pooled/brief/BRIEF.md`). Evidence: Priority 2's fixed D1 primary + Growth #4 combination beat its joint primary, but was not selectable (→ §3.2); its folds failed chronologically while the final neighbourhood looked stable (→ §1.10, §5.4); the stable Growth study's promotion excluded Rise and gate structures (→ §2.4, §4.3); Priority 1's capital-displacement finding (→ §5.2); the 2026-11-07 OOM and the dead-worker hang (→ §6.2, §6.4). | Applies to new studies from 2026-11-08. Completed studies are not retrofitted. The first adopter is `research/vgt-d1-growth-separate-pooled/` (scope `diagnostic`). |

## 9. GPU-only official optimization and CPU/GPU parity (from 3.0.0)

This section follows the change log so that the numbers of §0–§8 stay unchanged. It is mandatory for every study that
adopts 3.0.0 or later. The engineering procedure is [docs/gpu/PARITY_CHECKLIST.md](../gpu/PARITY_CHECKLIST.md), the
maintained feature map [docs/gpu/FEATURE_MATRIX.md](../gpu/FEATURE_MATRIX.md) and the operations guide
[docs/gpu/README.md](../gpu/README.md). The first acceptance study is `research/gpu-phase2/`.

1. **[M] Official evaluation and execution purposes.**
   - An **official evaluation** is any historical strategy evaluation whose result can affect an official
     optimization: fitness, screening, promotion, rung fitting, refinement, robustness and perturbation tests,
     qualification, selection and optimization validation (folds, holdouts, stresses, removals).
   - Every run declares its **execution purpose**: `official-optimization`, or one of the non-official purposes
     `parity-test`, `cpu-reference`, `diagnostic`, `benchmark`, `strategy-lab` (`src/gpu-backend/purpose.ts`, the
     environment variable `GPU_POLICY_PURPOSE`). A run without a declared purpose does not start.
2. **[M] GPU only, no CPU fallback, fail closed.**
   - Official evaluations run on the **attested NVIDIA GPU evaluator** only. There is no CPU fallback, no `auto`
     backend and no CPU/GPU hybrid, for any candidate, batch, retry or stage.
   - The run **refuses or stops** (checkpointed, with an explicit error, never a hang) when: no GPU or CUDA is
     available; the device is not the accepted one; the binary or a source digest is stale; the smoke kernel or the
     parity mini-set fails; a reachable feature is unsupported; VRAM is insufficient; the server dies, hangs or loses
     its heartbeat; a receipt, counter or output checksum is wrong; a batch is incomplete or corrupt; or any candidate
     would be scored on the CPU.
   - A per-candidate capacity overflow is re-evaluated **on the GPU** with larger capacities; any other per-candidate
     error stops the job (the canonical engine refuses that configuration too).
3. **[M] The single official gate.** Official evaluations enter only through `openOfficialGpuSession`
   (`src/gpu-backend/official.ts`) → the attested `GpuPool` (`src/gpu-backend/pool.ts`) → `EvalLab`
   (`src/gpu-backend/lab.ts`). Before any search evaluation the gate checks, in order: the purpose; the acceptance
   record (§9.9); the server, its build digest and the device (UUID against `nvidia-smi`, no test hooks); the
   capability coverage of the whole reachable domain (§9.4); the smoke kernel (verified by the CPU); memory for the
   planned batch; and a parity mini-set against the canonical CPU engine on the study's own door. It writes an
   **attestation** (`research/<study>/results/gpu-attestations/<run>-<time>.json`). A resumed or restarted run passes
   the whole gate again and records a new attestation.
4. **[M] Capability coverage of the reachable domain.** The preflight covers every feature the optimizer **can reach**
   (structural genes, options, controls), not only the incumbents or a sample. A reachable feature without a CUDA
   implementation and parity evidence blocks official optimization. A study never removes a feature from its genome
   silently to pass the gate; a deliberately reduced domain is declared in the protocol.
5. **[M] Receipts, conservation and provenance.**
   - Every batch has a device receipt (device UUID, request nonce, device-side execution counters, output checksum)
     appended to the run's ledger, with progress telemetry (GPU utilization, VRAM, power, temperature).
   - The **conservation invariant** holds per batch and at the end: submitted = GPU-returned + failed + in flight +
     queued, and **CPU-scored = 0**. A violation withholds the batch's results and fails the job.
   - Every official archive row is bound to `(study, job, door, door pin, evaluation-code digest, backend)` with
     backend = `gpu:<device uuid>:<binary sha256>:<compatibility digest>`; an archive never resumes under another
     backend or code digest.
6. **[M] Permanent CPU/GPU parity.**
   - The TypeScript/CPU engine stays the **authoritative reference** (and Strategy Lab's evaluator); the CUDA C++
     evaluator is the accelerator. There is no migration to Python or to a shared generated source.
   - **Every change** to D1, Growth, the allocator/pool, entries, exits, risk controls, fills, costs, interest, the
     records, the data loaders or any other evaluation dependency needs its CUDA counterpart and fresh **Apollo
     parity evidence before it is merged or used for official research** (the checklist's steps).
   - The parity standard is **bit-identical canonical records** (zero tolerance, IEEE-754 binary64, the JavaScript
     operation order). A difference is a defect. It can be accepted only as a documented departure the user approved
     (§7.3), naming the fields, the bound and the cause — never silently and never by loosening a comparison.
   - A new CPU feature may exist before its port (Strategy Lab, diagnostics); official optimization that can reach it
     is blocked until the port and its evidence exist (§9.4).
7. **[M] Stale-port protection.** The **compatibility manifest** (`src/gpu-backend/compat.ts`) hashes the import
   closure of the canonical evaluation path, the CUDA sources and the host code. Its digest is compiled into the
   server; the acceptance record pins it. Any change to a file in it invalidates the acceptance until a new acceptance
   (§9.9) passes.
8. **[M] Non-official CPU evaluation.**
   - CPU evaluation is allowed only under an explicit non-official purpose (§9.1); every legacy CPU research runner
     starts through the purpose gate (`src/gpu-backend/legacyRunner.ts`, used by every research npm script) and
     refuses `official-optimization`.
   - Non-official CPU results are **never official optimization evidence** and are never presented as such.
   - Real exceptions (an official CPU run) need the user's explicit approval first, recorded as a departure (§7.3).
9. **[M] Activation: the acceptance record.** Official GPU optimization is **blocked** until
   `config/gpu-backend/acceptance.json` exists with status `ACCEPTED`, its compatibility digests match the working
   tree, its binary sha256 matches the server and its device matches the GPU. It is written only by an acceptance
   study whose gates all pass (parity campaign, determinism, sanitizer, negative tests, fixed-seed mini-optimization,
   stress test; `research/gpu-phase2/PROTOCOL.md` is the first). The preflight reports a missing, invalid or stale
   record as BLOCKED.
10. **[M] Merge gate and entrypoints.**
    - `npm test` includes the policy tests (`src/gpu-backend/tests/policy.test.ts`): purposes, the legacy-runner gate on
      every research npm script, the entrypoint audit, fail-closed acceptance, this section's preflight rules and the
      domain coverage. A **CPU-only CI pass is never parity**: a change to an evaluation dependency also needs the
      **Apollo GPU verification step** (the checklist's parity campaign, sanitizer, negative tests and fixed-seed
      mini-optimization) recorded in a new acceptance record.
    - Every directory of `src/` with search machinery is either an official GPU entrypoint, a library, or a registered
      legacy CPU runner (`config/gpu-backend/entrypoints.json`); an unregistered one fails the audit.
11. **[M] The adoption manifest and the preflight.** A study adopting 3.0.0 or later with scope `optimization` or
    `continuation` declares `evaluationBackend: { policy: "gpu-required", purpose: "official-optimization",
    acceptance: "config/gpu-backend/acceptance.json" }`; the preflight refuses it while the acceptance is not valid. A
    diagnostic may declare `{ policy: "non-official-cpu", purpose, justification }`. From 3.0.0's effective date a new
    optimization or continuation manifest may not pin an earlier version (the GPU rule cannot be evaded by pinning an
    old standard); frozen studies keep their pins (§7.5).
12. **Enforcement limits (stated honestly).** The mechanisms verify declarations, digests, receipts, counters and live
    parity samples. They cannot prove that an unregistered script never evaluates on the CPU, or that the parity suite
    exercised every rare path; the policy tests, the entrypoint audit, code review and the acceptance study's
    campaign cover those. The `CLAUDE.md` instruction is an instruction, not a mechanism.
