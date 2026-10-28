# Claude Opus 5.5 — Study 1 of 3: Broad, behaviorally diverse D1 phenotype libraries and chronology-aware selection

**Mode:** Execute the research and implementation end to end, not merely produce a plan. Use the best available substantial-reasoning effort. Start by reading the repository's `CLAUDE.md` and its imported project instructions, particularly context recovery. Treat this brief as the task specification; preserve all previously frozen research.

**Study identifier:** `d1-wide-library-chronological-selection-v1`

**Primary research question:** Did our earlier standalone D1 optimizers discard potentially valuable phenotypes too aggressively, particularly by prioritizing training-period winners and by penalizing the largest profitable trade? Can a wider **behaviorally diverse** training library plus a disciplined, bounded, chronological selection procedure improve subsequent performance relative to the previous narrow-selection method?

This is **Study 1 of three separate studies**. Do NOT conflate these assignments:

1. **THIS STUDY —** Broader standalone D1 phenotype libraries, selection-procedure comparisons, expanding/rolling chronological evaluation, optional additional *training-only* optimization when justified.
2. **LATER, SEPARATE ASSIGNMENT —** Pairwise/all-61-ETF dip timing, actual D1 entry-signal overlap, capital occupancy and economic complementarity. Do not start this here.
3. **LATER, SEPARATE ASSIGNMENT —** Independent standalone *momentum-entry* strategy (uptrend/breakout/pullback entries without deep D1 dips) with its own appropriate optimization and chronological validation. Do not implement it here.

At the end, explicitly state: **Study 1 completed / not completed; Study 2 not started; Study 3 not started.** Do not turn findings from this study into a pool change or momentum experiment.

---

## 1. Why we are doing this

Our research has already searched the eight-parameter D1 strategy across approximately 61 eligible ETFs. The ranked-preemption program evaluated roughly 2,048 Sobol parameter vectors per ETF and chronological training window, followed by local search; it retained up to four behaviorally different configurations per ETF. Its selected representative optimized a neighborhood score of the form:

`J_s = netProfit - bestTradeProfit - max(0, minuteDrawdown - $20,000)`.

That **best-trade deduction may be poorly aligned with D1's deliberately asymmetric payoff distribution**: the strategy buys substantial declines after rebound signals and expects occasional unusually large winning recoveries. Large winners and profit concentrated in major rebound episodes are normal, and potentially desirable; they are not, by themselves, overfitting or a reason to reject a candidate.

The recent standalone ETF audit (`research/d1-standalone-etf-opportunity-audit/`) found no candidate demonstrably stronger than VGT `primary`, and its retrospective chronological checks showed weak correlations (~0.22–0.23) between training profitability rank and later validation profit. The question is whether more diverse candidates and a different *procedure for choosing among them* would do better. **This is a hypothesis to test, not a presumed explanation of poor validation.**

There are already extensive **sealed search archives** (roughly 137k–140k discovery rows per prior training window, approximately 428 saved library phenotypes across the three windows). We will *inspect these first*, but they must **not become an arbitrary ceiling** on the scope of research. This brief explicitly authorizes **new, separately budgeted, training-only optimization** if the original archive does not sufficiently represent credible alternative D1 behaviors or if a fair comparison of optimizer objectives requires it.

The highest-value deliverable is an evidence-based assessment of **selection methods**, not merely a newly favored ETF or an impressive new historical trade ledger.

## 2. Nonnegotiable scope and protections

1. **Preserve the original D1 mechanism:** dip/rebound trailing buy, post-profit-exit continuation where applicable, existing stop activation semantics, holding and buffer rules, and the existing eight-parameter phenotype vocabulary. Do not add momentum entries, alter D1 exits, introduce leverage beyond the margin model, or redesign the allocator.
2. **Standalone research only.** Each ETF is evaluated independently with one $100,000 noncompounding funded lot at a time. Do **not** jointly optimize pooled phenotypes, introduce capital preemption, or select ETF combinations based on signal overlap. All-ETF signal complementarity is reserved for Study 2.
3. **Keep frozen baselines immutable:** VGT `primary`, B4, B5, the C0 core benchmark, existing `config/phenotypes/`, `config/pools/`, all prior research folders, all canonical `data/`, B4/B5 prospective tracking and protected code dependencies. Do not alter them, their protocol freezes, hashes, snapshots or archived results. Run the existing verifiers before and after.
4. **Do not promote or register** any new phenotype, change a deployed default or declare live suitability. Save all experimental candidates only in this study's own research namespace, labeled **research-only**.
5. **Do not merge validation with the final holdout.** Validation is used for comparison/selection only under predefined rules. The final holdout is distinct and must not be used to tune or choose anything. This assignment does not authorize consumption of a genuinely untouched holdout; historical windows already inspected by previous research are *retrospective* even if chronologically ordered.
6. **Respect earlier studies' data doors and freeze contracts.** Do not defeat, weaken, patch, or evade a restriction on re-running their archived research candidates after their authorized cutoff (notably 2023-12-29 for final-window standalone research phenotypes). If the new study needs expanded historical windows, establish a separate, explicit prospective research protocol for **newly generated, independent study candidates only**, never silently relabel or replay barred archived IDs. Explain exactly what was and was not legally evaluated. If no permitted, meaningful later evaluation exists, report the evidence limitation instead of circumventing it.
7. **No new data downloads, web access, broker calls, credentials, live orders or account actions.** Use local data and documented research files.
8. **Profit concentration is a descriptor, not a negative score/gate.** A strategy with a few major winners can be a legitimate D1 strategy. Measure whether nearby parameters still capture the *underlying episodes* and control risk.
9. **No leakage.** At every training/selection cutoff, prohibit any use of post-cutoff prices, trades, outcomes, labels, normalization, percentile thresholds, event catalogs, universe membership revisions or manually informed adjustments. Report any *structural* hindsight inherited from old research (e.g., today-surviving ETF universe and previously chosen global hyperparameter ranges).
10. Never claim that retrospective selection tests, parameter perturbations or high historical returns establish future profitability. If the study cannot find a reliably improved method, the correct result is **no demonstrated improvement**.

## 3. Repository and Git preparation

- Inspect `pwd`, `git status --short`, current branch, `HEAD`, upstream, and prior work. The anticipated starting history is the completed/pushed standalone-ETF audit at `research/d1-standalone-etf-opportunity-robustness`, but **verify actual repository state** rather than assuming a branch or directory.
- Create a dedicated new research branch named `research/d1-wide-library-chronological-selection` from the latest verified completed standalone-ETF audit commit. If the current working tree contains uncommitted unrelated work, protect it; do not commit, drop, overwrite or stash it blindly. Prefer a clean worktree or stop with a documented blocker if safe isolation is not possible.
- Work under `research/d1-wide-library-chronological-selection/` and `src/d1-wide-library-selection/` (or equivalent isolated source namespace) with exactly one clearly named npm entry point, e.g. `npm run d1-library-study -- ...`. Do not fork or rewrite a frozen production/backtest engine merely for convenience.
- Keep generated large archives, logs, and scratch artifacts in clearly documented paths; track small immutable manifests, configs, decisions, ledgers and human-readable summaries. Record hashes of large ignored artifacts and state whether the committed record alone is sufficient to reproduce the conclusions.
- **When complete and verified, commit and push this new research branch to `origin`.** This explicitly authorizes commits and a normal push of the new research branch only; no PR, merge into another branch, force-push, tags, rewriting history or pushing unrelated branches.
- Final report must give the exact new branch, commit hash, remote confirmation, clean/dirty status and reproducible commands.

## 4. Establish authority and inspect the existing research — before constructing methods

Read the relevant actual repository records, not just secondary summaries. Discover correct paths; the following are starting points:

- `research/d1-ranked-preemption/` — sealed three-window standalone Stage A profiles, search archives, baseline/replay semantics, discovery grids, phenotypes and previous scoring function; verify archive availability, hashes, coverage and ability to reconstruct parameter vectors.
- `research/d1-standalone-etf-opportunity-audit/` — all-61 inventory, event capture catalog, baseline/parity, perturbation methodology, costs, chronological evidence and selection bias, final recommendation.
- `research/vgt-standalone-vs-pooled-robustness/` — frozen VGT-primary standalone baseline and like-for-like perturbations.
- `research/b4-b5-robustness-audit/` — reusable cost, execution and risk diagnostics.
- `config/phenotypes/D1/VGT.json`, `config/pools/B4.json`, `config/pools/B5.json`, `research/prospective-b4-b5-shadow/` — read-only benchmarks and guardrails.
- Existing canonical minute-bar loader and full engine, warm-up behavior, fixed-pool replay logic and source study's cutoff restrictions.

Perform an inventory of **all 61 ETFs** and each prior training window. Confirm:

- Which candidate vectors survived in archives, including configurations below the old top-four threshold, alternative entry behaviors and candidates disadvantaged by the `bestTrade` penalty.
- Which fields exist in the archives: exact eight parameters, gross/net, costs, interest, minute/daily DD, trade count, timestamps/trade signature and enough provenance to replay. **Do not assume an archived score is equivalent to full-engine net P&L.**
- Whether the earlier selection policy actually excluded credible high-tail D1 profiles that were profitable, risk-compliant and behaviorally distinct.
- Whether the 61-symbol universe and dataset quality allow cross-fold comparisons, and which symbols have coverage/liquidity concerns.
- The earlier research restrictions that constrain newly proposed historical runs.

Deliver `SOURCE_ARCHIVES_AND_SELECTION_BIAS.md`, a machine-readable complete inventory and a parity/audit report. Freeze a source snapshot (paths, hashes, count, symbol universe) before any new evaluation. The study should not abort simply because the archive is incomplete: identify gaps and use §8 to assess justified additional training-only discovery.

## 5. Exact financial conventions and regression anchors

For the standalone D1 selection study use the canonical full-minute engine and same conventions across candidate-library arms:

- A fixed single **$100,000** borrowed position when funded; no compounding or second simultaneous lot.
- **11%** annual simple margin interest with the existing day-count/rounding conventions.
- **5 bps per side** as baseline modeled execution friction, **not** a Vanguard commission. Report 0/2/10 bps (or equivalent existing cost scenarios) separately as sensitivity; rerun the causal engine when costs affect profit-conditioned stops and later continuation entries, never merely deduct costs after replay.
- Exact regular-session timestamps, split/corporate-action adjustments, warm-up, funding/entry timestamps and stop/gap execution according to the canonical ETF engine.
- **Primary historical fixed-pool minute drawdown ceiling $35,000 per $100,000 borrowed lot.** Evaluate daily DD as well. For a secondary portfolio overlay, preserve the $300,000 60% VOOG / 40% VGT core, borrowing 20% of marked equity, preferred 30% portfolio DD and conditional 35% historical ceiling. Do not silently relax or backfit risk gates.
- Track trade count, gross/net, interest, friction, win/loss, MAE/MFE, largest loss, trade/episode evidence, capital occupancy and profit per $1 million borrowing-dollar-days. Report holding-period and entry timing distributions.
- Keep the formal training cutoff from the selected fold and compute **incremental** validation mark-to-market P&L correctly for positions already open at the boundary; do not reset profitable or losing funded state arbitrarily or double-count training profit. Implement boundary-state and later-bar-mutation tests.

First reproduce the appropriate *same-window* VGT-primary and source research controls at 0/2/5/10 bps to the cent, plus the applicable immutable B4/B5 reference anchors without changing their source files. Examples of known 5-bps fixed full-history anchors (2016-01-04 through 2026-10-13) are VGT primary **$176,260.47**, B4 **$284,244.74**, B5 **$486,207.77**; these are context regression values **only**, never compare their dollars directly to shorter-fold candidate results. If any expected figure does not match, diagnose and stop the affected evaluation rather than silently redefining accounting.

## 6. Freeze the comparative experiment before looking at any new fold outcomes

Produce `PROTOCOL.md`, `PROTOCOL_FREEZE.json` (content hashes), `LIBRARY_SELECTION_RULES.md`, and a signed/hashed machine-readable matrix of folds, arms, budgets, seeds, sample sizes, promotion/refusal rules and evaluation metrics.

**Order matters:** archived record inspection and training-only candidate *construction* may be exploratory but must be clearly labeled. The *method comparison* must be frozen before **any new chronological validation outcomes** for its candidates are evaluated. Earlier validation results known from other studies mean this is only a retrospective, period-correct method replay; freezing now does not restore lost statistical independence.

Use an independent read-only methodology reviewer before freezing. Resolve scope/causality issues before running the study; disclose any design revisions and preserve superseded versions. Never revise score weights, top-K, risk limits, windows or selection criteria after seeing a validation comparison. Any later fix must be a documented technical correction or separately labeled exploratory amendment, never quietly rolled into confirmatory claims.

### 6A. Mandatory expanding-window chronological folds

The following **two primary folds are required** and must be implemented, not merely proposed:

| Fold | Candidate-discovery and training data through | Chronological evaluation window | Status |
| --- | --- | --- | --- |
| **A** | **2020-06-30** (beginning 2016-01-04; arming per canonical policy) | **2020-07-01–2021-12-31** | Historical, already inspected |
| **B** | **2021-12-31** (same start; expanded training) | **2022-01-01–2023-12-29** | Historical, already inspected |

Where dates are nontrading days, use actual canonical first/last eligible sessions. No parameter vectors chosen using Fold B's data may appear in Fold A's evaluation. No final-window (2016–2023-trained) vector may be used to assert an earlier fold's out-of-sample behavior. **Rerun or recover fold-specific candidates selected only from data ending at that fold's training boundary.**

The core comparison in these folds is: **How did each *training-only* library-selection method fare in the next untouched-by-that-run chronological period?** Compare a complete procedure (candidate generation + training-only selection), not just winners picked ex post from validation.

**Predeclare supplementary folds if feasible.** If archives support shorter earlier cutoffs without data leakage, add a small number of rolling/expanding outer fold comparisons with fixed boundaries and fixed minimum warm-up/training exposure (e.g. training through 2018, 2019, 2020, 2021 with each subsequent contiguous one-year assessment). Short periods may have too few actionable dips; report event counts and treat folds with inadequate independent events as inconclusive, **not as failed models**. Do not invent an extra fold using a later-trained archived candidate. If supplementary folds require new searches, place them in their own explicitly bounded budget and methodological arm.

**Final holdout remains entirely separate.** Do not concatenate 2024–2025 with 2026, or use any reserved final-holdout bar for selecting or refining a phenotype/method. Prior research already inspected 2024–2026 through 2026-10-13; those dates are not truly independent even in a new research branch. This study's primary comparisons end at **2023-12-29**. No bar after 2026-10-13 is evaluated here. If a new protocol would require opening 2024–2026 for newly generated candidates, **do not do so in this assignment**: record the requested separate decision and report results through the agreed primary folds. In particular, never bypass any earlier source-data door to do so.

### 6B. Nested validation-selection versus later evaluation (mandatory if materially feasible)

A different question is whether allowing validation to *select among* a broader candidate library helps. You **must not** judge that method by the same validation data on which it chose its winner. Implement a **chronological three-way experiment** with separate selection and later assessment, using only newly eligible candidates allowed by the data-access contracts. Freeze candidate library creation, selection rules and risk thresholds first.

At minimum attempt these retrospective triples:

1. **Triple T1:** Discover/train through **2020-06-30** → select among frozen candidates using **2020-07-01–2021-12-31** → assess chosen candidates **2022-01-01–2023-12-29**. The last interval is the *later evaluation* of this selection procedure, not the selection interval. No candidate may be tuned during the middle interval.
2. **Triple T2 (secondary, partially overlapping later evidence):** Discover/train through **2021-12-31** → choose using **2022-01-01–2022-12-30** → assess on **2023-01-03–2023-12-29**. The 2023 later evaluation overlaps T1's later evaluation; **do not count the two as independent replications**.

These windows have already been seen in earlier studies and are retrospective only. If source-study restrictions prevent a particular vector from crossing the required boundary, **do not force it**. Use only legally executable new-study fold-trained candidate artifacts, explain the restriction and make the best feasible nested comparison. If no genuine separated later evaluation is possible under those constraints, deliver a transparent partial answer rather than selecting on validation and calling that validation success.

All costs, states and scoring must be causal at the boundary. A candidate selected on its inner-validation results must remain unchanged for later evaluation. Assess (i) per-ETF selection, (ii) **selection of ETFs across the 61-symbol universe**, and (iii) method-level generalization separately: searching across ETFs is an additional multiple-testing layer.

## 7. Compare genuinely different selection procedures, not just top-K winners

Predeclare and compare **at least** the following arms, with training-only selection followed by the fold evaluation in §6A. The implementation should accept a zero-trade/no-credible-candidate outcome naturally.

- **A0 — Original narrow baseline.** Reproduce the prior algorithm's four-ish top behaviorally distinct saved phenotypes and its original `J_s`-based representative policy as faithfully as source records allow. Do not repair it with hindsight; identify where it is inherently unable to nominate a vector for that fold.
- **A1 — Broad library, same original scoring.** Larger behaviorally diverse training-only library with the old scoring/selection rule. This isolates the effect of library width from changing the objective.
- **A2 — Broad library, D1-tail-compatible scoring.** Same candidates and budget as A1 where possible, but **no automatic subtraction of the largest winning trade**. Selection prioritizes positive net profitability, absolute dollar downside, reasonable chronological event coverage, adjacent-parameter robustness and capital efficiency. The score must not reward exact historical peak profit at the expense of robustness. Do not require smooth annual returns or penalize a few genuine large rebound winners.
- **A3 — Broad library, different selection rule with explicit neighborhood risk.** Retain candidates supported by broad neighborhoods of profitable and ≤$35k-drawdown parameter settings, diverse dip-entry sequences and acceptable worst-case losses. Differentiate A3 from A2 and A1 **before** running validation rather than tweaking until it wins.
- **A4 — Validation-selector procedure (nested only).** From a bounded training-generated library, choose using the **first subsequent validation period** under a simple predeclared rule; evaluate exclusively on the **following** period, as §6B requires. Report the price of selection/multiple testing, not just the chosen validation winner.

**Library sizes:** A0 reproduces the original narrow library. For the larger arms, analyze a preregistered **K ∈ {8, 16, 32, 64}** credible/behaviorally distinct phenotypes per ETF where that many actually exist; report realized K per ETF and why any quota was unavailable. These K values are comparative design points **not a demand to generate low-quality or near-duplicate phenotypes** and not a fixed universal ceiling on investigative discovery. Do not choose the best K after reading validation. The extra selection degrees of freedom created by larger K must be included in the interpretation.

**Candidate diversity:** Use deterministic, predeclared behavioral fingerprints involving entry dates, dip-event membership, exit modes, holding-period regimes and independently identified recovery episodes. Near-identical D1 paths count as one family even if eight numeric vectors differ. Prefer medoid/complete-linkage or other bounded-diameter clustering; **avoid single-linkage chaining** (earlier studies learned this the hard way). Represent families fairly, including credible lower-training-net configurations, lower-DD candidates, and distinct early/late recovery captures; not just the highest training winners.

**Selection scope:** report results for both **within-ETF** methods and **across-ETF** choice; otherwise a successful within-ETF method might still fail when cherry-picking the best out of 61. Predeclare how many ETF nominees a procedure may advance, or if it may choose none. Do not interpret a procedure's best one-off ETF trade as evidence the selector works.

**Validation selection is allowed**, but under controlled predeclared filters/budgets. A method evaluated on the same validation outcomes that selected its candidate is *not* validated. Report the later assessment separately and visibly. Do not conflate methods' average validation P&L with expected real-world profit.

### Metrics of selection-method quality

Report method-level performance before emphasizing individual winner examples:

1. Number of legitimate credible candidates, distinct behavioral families, original top-four coverage, and what was discarded.
2. Number of ETFs with any credible selected candidate, trade/event counts, and **percentage of independent dip episodes captured** at a reasonable net positive gain.
3. Absolute and risk-adjusted fold P&L: net, minutely marked max DD, worst loss/MAE, expected shortfall proxy clearly described, costs and interest, occupancy and profit per borrowing-day.
4. Stability/consistency: fraction of ETFs and major event families where larger libraries outperform the original, not merely one flagship winner; median/quantiles **across ETFs and event regimes** without treating correlated funds as independent data points.
5. Sensitivity to method variant, candidate budget, library K and number of eligible ETFs searched. Include an explicit multiplicity and winner's-curse discussion.
6. Frequency of selecting a candidate with **too little validation evidence**; do not call no-trade periods a negative result, nor count empty periods as successful validation.
7. A prespecified decision: **method improves generalization / mixed or inconclusive / no evidence of improvement / demonstrably worse or risk-incompatible**, including explicit grounds for declining nomination.

Do not post hoc select the scoring variant, K, ETF subgroup, threshold or later fold giving the best return and rebrand it the winning method. It is acceptable and valuable if none of A1–A4 reliably improves A0.

## 8. Archive-first analysis AND explicitly permitted additional optimization

### Arm ARCHIVE — reconstruct previously explored training candidates

Parse the available sealed search archives directly. Do not assume the old saved 4-per-ETF library contains all behaviorally distinct candidates. Recover much deeper training candidate pools, quantify how selection using the old `J_s` biased retention, and recalculate alternative training-only scores/behavioral fingerprints from causal full-engine replay where the archive summaries are insufficient.

Compare the source's top four against broader top-eight/top-16/top-32/top-64 libraries under the *same training cutoff*, the *same admissibility filter* and the *same fixed execution conventions*. This must produce a reproducible **discarded-candidate audit**: for example, how many configurations were excluded because of best-trade subtraction versus excess drawdown, low trade counts, or near-duplicate behavior, and whether later fold behavior of legitimately shortlisted groups differed.

The full source archive may itself be a biased sample from a search algorithm that refined only the already-highest-scoring starts. Do not call its population unbiased merely because thousands of Sobol vectors exist.

### Arm NEW-SEARCH — permitted if warranted; not silently mixed with ARCHIVE

After characterizing archive limitations, **freeze objective feasibility triggers before looking at new fold outcomes**. An acceptable trigger is inadequate diversity or coverage on training alone: e.g. fewer than 12 credible distinct trade-path families for >20% of ETFs, or clear dominance of one entry-event family among archived near-optima, or missing reconstructible vectors / objective-bias from the original best-trade penalty. If an archive passes coverage but a controlled fresh search is necessary to test whether the old objective prematurely suppressed the right tail, clearly explain and predeclare that scientific purpose before using validation.

If warranted, run an **additional, bounded standalone discovery arm**. This is **authorized**; you need not request permission merely because it was absent from the older archives. Requirements:

- Training bars only, for the precise training cutoff of each fold; no validation or holdout inputs, not even for candidate ranking/early termination.
- Same D1 architecture/eight legal parameter coordinates and quantization rules; identical simulator and financial conventions. No new entry mechanism or modification to exits.
- A predeclared per-ETF/per-fold search budget. A reasonable starting maximum is **1,024 new Sobol/space-filling candidates + up to 128 bounded training-only refinements per ETF per fold** (or a clearly justified equivalent); do not silently increase it to chase outcome quality. With 61 ETFs this is a meaningful compute budget; log actual evaluations, wall time, cores, seed and source stage. Never pretend a new search with a different budget is directly comparable without normalization.
- Include exploration/family quotas so high-profit candidates do not crowd out distinct behaviors; retain broad neighborhoods and a credible left-tail/downside guard while **not penalizing the absolute value of the top winning trade by default**.
- Quantize percent parameters to one decimal place consistently, integer sessions/days to whole numbers, as in the project.
- Do not mutate ARCHIVE candidates retroactively or contaminate the archived arm. Compare `ARCHIVE only`, `NEW-SEARCH only` and `ARCHIVE + NEW-SEARCH` as separately costed procedures; label the extra multiple testing explicitly.
- No need to force all 61 ETFs to pass eligibility: credible zero-nomination outcomes are allowed. Yet preserve fair discovery coverage across the audited universe when budget permits; never use a candidate's validation result to decide how many additional training evaluations it deserves.
- Store exact configurations and provenance in study-only JSON; no production phenotype registration.

If the compute budget cannot be completed safely, finish the archive comparison and report partial NEW-SEARCH completion transparently, rather than claiming an equivalent all-61 result.

## 9. Event-level evaluation must reflect D1's actual purpose

Do **not** minimize profit concentration or smooth the annual return curve just for aesthetics. The key is to determine whether **the strategy captures genuine large dip-and-recovery episodes under reasonably neighboring parameters, at acceptable downside**.

Using the existing price-only diagnostic catalog as a *retrospective attribution framework* (or a preregistered improved, independently frozen catalog), report for every relevant phenotype and fold:

- Major price-decline events, peak/trough and rebound intervals, observed without leaking future data into trading decisions.
- Whether a configuration entered near the decline/recovery, entered too early, missed the move, or made a continuation trade high in the rebound. Do not mislabel the latter as capturing the initial dip.
- Which independently separated episodes supplied the large winners, what proportion of nearby settings captured the *same* underlying episode, and typical entry-price/fill variation.
- Whether a big winner was robustly captured but resized by parameter changes, or depended on a narrow one-minute entry/exit coincidence.
- Negative tail: falling-knife entries, worst MAE, losing trades, gross exposure through crashes, gaps, and drawdown ceiling violations.
- Number of independent event families in selection and later evaluation periods. A few highly correlated events do not provide a large statistical sample just because they generate many trades.

Explicitly allow the outcome **'sparse but consistently captured major recoveries'** to be qualitatively encouraging, while still recognizing that low sample size limits confidence. Report top-1/3/5 profit concentration descriptively; never subtract those winnings as an automatic robustness penalty.

## 10. Handling chronological selection, data integrity and multiple testing

The following failure modes require tests or fail-closed guards:

1. **Leakage:** optimization or phenotype-family formation uses bars past training cutoff; normalization based on future prices; selecting candidates after seeing validation; final holdout opened early.
2. **Incorrect fold accounting:** an open lot at a training boundary disappears, is repriced inconsistently, or contributes training profit twice to validation.
3. **Search result mismatch:** archived fast replay disagrees with full engine on stops, interest, fills, open-lot liquidation, or actual entry/exit chronology; parity must be established for stratified samples across ETFs and fold cuts.
4. **Path dependency:** changing costs changes whether a stop is net-profitable and which continuation entries are eligible. Stress scenarios must rerun the trading decisions.
5. **Duplicated search credit:** near-identical phenotypes receive multiple votes; multi-ETF results claim independence despite market-wide correlated episodes.
6. **Validation overuse:** choosing K, objective weights, risk thresholds or ETF universe based on validation outcomes, then evaluating the same interval as if untouched.
7. **Unfair comparator:** baseline is given a different start date, margin-interest convention, warm-up, cost, or historical hindsight from candidate arms without clear labeling.
8. **Freeze incompatibility:** new code mutates or violates an earlier research protocol, changes production phenotypes, breaks B4/B5 prospective tracking, or allows a forbidden late-data run.
9. **Hindsight universe:** all 61 current survivors had continuous historical data; ETF closures and inaccessible pre-2016 history are not represented. Treat results as conditioned on this historical universe.
10. **Sample-scarce folds:** zero trades or no major correction are not evidence of a failed trading mechanism; provide 'insufficient evidence' with counts.

Use deterministic seeds and round-trip JSON candidate schemas. Hash candidates, rankings and per-fold selections at the moment they are frozen. The program should refuse a report that cannot establish that the candidate was selected before reading the later bars. Conduct adversarial tests mutating post-cutoff prices and verifying training archives, candidate ids/rankings and selection records remain byte-identical.

Run an independent reviewer against the **methodology and chronology before sealing**, and a **separate implementation/results audit** at the end. Address material defects and disclose all deviations; preserve source hashes. No user-facing 'PASS' without exact verifiers/tests.

## 11. Required reports, CSV/JSON results and runnable commands

Deliver the following under `research/d1-wide-library-chronological-selection/` (paths can vary slightly if existing conventions demand, but don't omit the content):

- `README.md` — scope, one-page outcome, evidence levels, exact commands, status of next studies.
- `PROTOCOL.md` and immutable `PROTOCOL_FREEZE.json` — fold dates, K values, methods, objectives, seeds, risk gates, budget/trigger and amendment history.
- `SOURCE_ARCHIVES_AND_SELECTION_BIAS.md` — complete 61-ETF census, archive integrity and reconstruction, old penalty impact, saved-versus-discarded behaviors.
- `LIBRARY_CONSTRUCTION_AND_DIVERSITY.md` — all procedures, counts of unique trade-path families, K coverage per ETF, full parameter and seed provenance, fair budgets.
- `NEW_SEARCH_FEASIBILITY_AND_RESULTS.md` — why new optimization was/was not run, training-only trigger, evaluation budget, generated vectors, differences from the archived universe.
- `CHRONOLOGICAL_FOLD_COMPARISON.md` — fold A/B (and preregistered supplemental folds), baseline A0 vs A1/A2/A3 for each K, method-level per-ETF and cross-ETF metrics.
- `NESTED_SELECTION_AND_LATER_EVALUATION.md` — explicit candidate choices based on an intermediate validation period and performance measured only **after** selection; no improper reuse of a period as both selector and confirming evidence.
- `DIP_EVENT_CAPTURE_AND_TAIL_RISK.md` — large-rebound episodes, missed/retained winners, parameter-neighborhood behavior, costs, adverse excursions, thresholds, limited event counts.
- `MULTIPLE_TESTING_AND_EVIDENCE_LIMITS.md` — number of evaluated variants, selection degrees of freedom, inspected-history caveat, survivorship and open issues; don't claim a numerical probability of future success without justified statistical basis.
- `FINAL_COMPARISON_AND_RECOMMENDATION.md` — answer the research question directly; distinguish strong positive, mixed, negative and unknowable, and whether a future independent study is warranted. Compare to frozen VGT primary and contextual B4/B5 on **matching windows only**, but never nominate a new production trading configuration.
- `IMPLEMENTATION_AUDIT.md` — complete tests, parity, freeze checks, isolation, independent review findings and dispositions.
- `RESEARCH_RECOVERY.md` — resumable on-disk checkpoint following the project's context-recovery instructions, maintained through meaningful milestones.
- Machine-readable **per-fold candidate libraries in JSON**, original and alternate phenotype vector ids, frozen training choices, intermediate-validation selections, later outcomes, exact ledgers (CSV/JSON), summaries by ETF, by method and by event family. A user should be able to reproduce a selection path without trusting narrative summaries.

Provide a safe **read-only CLI** with documented examples. For example (adapt exact command names as implemented):

```bash
npm run d1-library-study -- inventory
npm run d1-library-study -- methods
npm run d1-library-study -- folds
npm run d1-library-study -- compare --fold A
npm run d1-library-study -- compare --fold B
npm run d1-library-study -- nested
npm run d1-library-study -- show --symbol VGT --fold B --method A2 --library-size 16
npm run d1-library-study -- discarded --symbol GDX --fold A
npm run d1-library-study -- status
npm run d1-library-study -- verify
```

The study's one-time stage runners must have clear guardrails and refuse to overwrite a sealed experiment or inadvertently open forbidden later data. Show all commands **actually executed**, not hypothetical CLI functionality. Use exports that can be inspected easily (CSV and JSON), and make trade ledgers readable (entry/exit ET, prices, symbol, reason, gross profit, interest, friction, net, cumulative net, MAE/MFE, holding days, associated dip event).

## 12. Final decision framework

For each method, answer:

1. Does widening the candidate library improve the **next chronological fold's** results versus A0 on a fair, fixed selection budget, and does it do so on more than a small set of cherry-picked ETFs?
2. Does changing the training-selection objective to preserve legitimate big winners improve or worsen *later* risk-adjusted results? Did it merely increase training peak P&L?
3. Are the benefits (if any) from **diversity**, **new optimization**, **validation-based selection**, or simply additional trials? Use ablations to separate those mechanisms.
4. In the nested design, does intermediate validation selection retain any advantage on the **subsequent** period, after accounting for additional searched candidates?
5. Are risk ceilings, realistic costs and opportunity-capture diagnostics robust? Which ETFs and event families determine the finding? Could zero-trade folds render it indeterminate?
6. Would the *procedure* have produced credible candidates without observing its future evaluation intervals? If not, declare failure/inconclusive.
7. What is the most conservative justified next research step, given all windows are previously inspected?

Outcomes allowed: **evidence for improved selection procedure**, **mixed/inconclusive**, **no demonstrated improvement**, or **new procedure is materially worse**. A legitimately negative result is not a failure of the assignment.

Do not claim that a final-window winner 'beats B5 out of sample', that passing the $35k historic drawdown gate caps future losses, that 2024–2026 has been newly validated, or that widening libraries alone guarantees better generalization.

## 13. Independent review, complete execution, Git delivery

Before declaring completion:

- Verify old B4/B5/VGT baselines and prospective freeze still pass; compare SHA256 of read-only input files with study-start manifests.
- Run every preregistered feasible fold, library arm, K setting, nested chronology, parity group and reporting command, within the established budget. Identify intentionally nonexecuted variants rather than inventing results.
- Run the project's full test suite and TS type check/lint of new code; add tests for chronology, deterministic selection, K/deduplication, bounded search, stop/interest accounting and forbidden holdout reads.
- Request an independent read-only code-and-methodology review and publish verbatim findings and exact dispositions.
- Produce concise executive findings with all denominators, realized training/validation event counts, material warnings and honest qualifications.
- **Commit only this study's research/code/docs and related npm script, then push `research/d1-wide-library-chronological-selection` to `origin`; verify the remote head.** Do not commit `.env`, private paths/secrets, unrelated work, canonical minute data or giant scratch logs. No merge or force push.
- Final user-visible summary must include the verdict and exact commands, reproducibility/checks, commit + push confirmation, and **the agreed next-step sequence**: Study 2 — 61-ETF actual D1 timing/occupancy complementarity; Study 3 — independent, separately optimized momentum-entry research. Neither is started by this assignment.

**Proceed with the complete study. Do not stop after a design report, and do not expand into other strategy families. Preserve methodological integrity even if the broader libraries fail to improve validation.**
