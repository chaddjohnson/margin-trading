# Claude Opus 5.5 (Extra High) — D1 standalone screening, frozen ETF priorities, causal preemption, and joint pool optimization

**Assignment:** Design, implement, execute, independently review, and report a **new**, bounded, reproducible research study in the existing Margin Trading TypeScript/Node.js repository. **Do not replace or change B4, B5, the existing standalone D1 phenotypes, or any completed study.** Work end-to-end; a scientifically defensible **no improvement** is a valid finished result.

**The central architecture is nonnegotiable:**

> **Standalone optimization generates promising starting points; joint optimization determines what works as a portfolio.**
>
> Optimize and screen each ETF independently; derive two fixed priority rankings from those *standalone* configurations; freeze the ranking for each training window; then jointly optimize the subset of ETFs and the **separate pool-specific D1 phenotype of each selected member** while **the frozen rankings actively govern allocation and preemption during every backtest evaluation**. Existing B4/B5 book phenotypes are optional *seeds and controls*, not automatically optimal under the new allocator.

We are testing **fixed standalone-derived priorities only**. Do **not** optimize/reorder ETF priorities jointly, use a machine-learned dynamic ranker, or change priorities based on subsequent portfolio results. A future study may investigate those ideas separately.

## 0. Operating instructions, repository audit, and boundaries

1. Read root `CLAUDE.md`, its `@docs/claude/context-recovery.md` import, and any applicable existing repository agent/rules instructions. Follow the persistent task checkpoint/compaction recovery requirements. Create a **new task-local `RESEARCH_RECOVERY.md`** (do not overwrite the completed `diverse-d1` checkpoint), update it at meaningful milestones, and rehydrate it after any compaction or interruption. Do not claim the ability to force auto-compaction or read a context percentage unless available.
2. Inspect the **actual current repository and git state before designing anything**, particularly:
   - `config/pools/B4.json`, `config/pools/B5.json`, `docs/pools/README.md`, the `npm run pools -- ...` CLI and its real flags, its current prospective shadow freeze and outputs, and the fixed/portfolio/verify commands;
   - canonical D1 eight-parameter model, per-symbol phenotype JSON schema, fixed-$100k shared allocator, `ShadowBook`/replay engine, minute execution/fill/stop semantics, corporate actions, timezone and CSV partitions;
   - completed `research/d1-diverse-pool-discovery/` and `research/d1-robust-pool-discovery/` protocols and sealed records, prior 16-ETF joint work, standalone optimizers and prospectively frozen B4/B5 protocol;
   - the audited 61-symbol eligible universe, hashes, eligible trading periods and existing configuration/phenotype registries.
3. Record exact repository paths and what is already built. **Reuse the established engine and tools**; do not duplicate a simulator or invent commands. Build the smallest isolated extension that supports correct preemption and ranked optimization.
4. This task is a **new experiment**, with its own namespace (e.g. `research/d1-ranked-preemption/`, `src/d1-ranked-preemption/`, `config/research-pools/...`), own code/data manifests, independent checkpoints and read-only comparisons. Existing B4/B5 and past study artifacts remain byte-for-byte intact. Do not mutate their config IDs, canonical data, parameters, validation records or prospective freeze. Do not overwrite results, rerun write-once sealed stages, or weaken earlier study guards to make new code pass.
5. No trading orders, brokerage access, credential reads, financial account operations, downloads, or external network access without explicit authorization. Never invent future bars. **No commit, push, or merge without explicit user approval.** A scoped engine extension is permitted only if immutable historical behavior is regression-verified; prefer a new allocator option used solely by the new experimental runner.
6. If the ongoing B4/B5 task is incomplete, preserve it and coordinate through existing code rather than replacing its work. If its final CLI/reporting feature is missing, document the dependency rather than pretending it exists. The new study must never change its behavior.
7. **Brief length and persistence:** save this full brief under this new study (as received), verify its complete final section is present and its SHA-256, and document the hash in the checkpoint. Do not begin design from a 50,000-character-truncated paste; if the host truncates input, recover the complete local file before committing the protocol. Do not convert missing requirements into assumptions.

### Frozen comparators (regression anchors, not predicted returns)

Historical `all`: 2016-01-04 through 2026-10-13, 5 basis points modeled execution friction **per side**, 11% simple annual margin interest, $100,000 **total shared funded notional** with at most one funded lot/reservation at a time, noncompounding fixed pool. The core portfolio is a separate mode, initially $300,000 invested 60% VOOG / 40% VGT with 20%-of-marked-equity margin when eligible.

| Frozen configuration | Fixed-pool net profit | Max minute-sampled fixed-pool drawdown | Compounded portfolio end equity | Portfolio maximum daily drawdown |
|---|---:|---:|---:|---:|
| B4: VGT/XBI/XRT/KRE | $284,244.74 | $28,659.34 | $3,608,484.05 | 34.65% |
| B5: B4 plus GDX | $486,207.77 | $26,509.97 | $5,410,976.72 | 29.67% |

These numbers were reproduced in the latest study. Respect the original dividend convention when verifying them. B4 is the existing default; B5 is the leading *existing candidate*, not proven prospective alpha. Do not reinterpret B5's large, historically concentrated GDX contribution as a forecast. B1 / VGT D1 is a useful simpler reference if executable and verifiable from frozen records.

**Risk/cost baseline:** $100,000 fixed borrowing per funded position, not one $100k position *per ETF*; 11% interest; 5 bps friction each side, sensitivities 0/2/10 bps; fixed-pool minute DD target/ceiling **$35,000**; dynamic portfolio daily DD ideal ≤30%, absolute conditional ceiling **35%**. Carry trade state and account for interest and mark-to-market P&L. The existing baseline risk definitions govern; do not blend daily and minute sampled DD.

## 1. Research question and preflight opportunity diagnostic

**Primary hypothesis:** A shared-margin D1 allocator that assigns every eligible ETF a fixed, training-derived standalone profitability priority, and allows a **valid higher-priority signal to preempt a lower-priority funded position only at realizable net breakeven or better**, can improve risk-aware economic performance over the unchanged B4/B5 allocator. Further, **joint optimization of selected members' pool-specific phenotypes with this allocator active** can improve performance over simply combining standalone-optimized phenotypes.

**Preflight diagnostic, before expensive full search** (historical, descriptive, using only the chosen training portion): run the *original nonpreemptive* B4/B5 books and log, for every shadow D1 entry signal when the margin slot was already occupied:

- timestamp, occupied member and holding age, blocked candidate symbol, **whether that candidate is higher priority under each ranking where the ranking has already been established from permitted training data**, current funded mark/net liquidation estimate, and whether a causal preemption could be actionable at the next permitted event;
- number/rate of overlap events, number of higher-priority overlaps, number meeting the net-breakeven condition, per-symbol and per-regime counts, time since last funded entry, tie cases and trading days involved;
- descriptive counterfactuals under the nonpreemptive book's original exit rules when feasible, **clearly labelled hindsight diagnostics**; do not use future exit profits to make a historical entry or switching decision and do not add counterfactual P&Ls as if both trades had been funded.

Pre-register a **material-opportunity criterion** before reading this diagnostic (e.g., sufficient actionable overlaps and funded-notional time to plausibly affect outcomes). If there are too few opportunities, report them and stop or materially downscale the expensive optimization **according to the criterion frozen before observing results**. A negative feasibility result is useful; do not force the study to produce a winner. If rankings cannot yet be computed, first finish the permitted standalone training pass, then run the ranked portion of the diagnostic without changing that ranking.

## 2. Research protocol, chronology and evidence integrity — freeze before outcomes

Before examining any **new study strategy-performance outcomes**, author and independently review a detailed `PROTOCOL.md` plus an executable manifest of source/hashes, data windows, fixed parameters, search budgets, quotas, evaluation/validation schedule, scoring, elimination rules, promotion gates, ranking tie rules, and stopping conditions. Freeze the protocol **before** optimizer results or walk-forward outcomes become visible. Pre-design code tests and data-integrity checks are allowed without inspecting new trading outcomes. Record and review technical amendments with strictly limited affected stages; never tune gates after examining their failures.

Follow causal chronological **procedure-level** checks, not a random shuffled train/test split. Suggested historical folds using the existing verified data partitions:

| Fold | Allowed parameter tuning, standalone ranking and joint search | Chronological validation (opened after full pick/rank freeze) |
|---|---|---|
| A | 2016-01-04 → 2020-06-30 | 2020-07-01 → 2021-12-31 |
| B | 2016-01-04 → 2021-12-31 | 2022-01-01 → 2023-12-29 |
| Final calibration | 2016-01-04 → 2023-12-29 | No tuning against later years |

**Re-run the complete procedure independently within each fold**: ETF standalone optimization and screening, rank calculation/freezing, preemption diagnostic, joint search/refinement, selection/freezing, then validation. Do **not** use the full-2016–2023 ranking, full-window phenotype, or final pool membership when simulating earlier folds; that would leak future data. Validate using continuous historical engine state with marks and fund/virtual-book state carried over search boundaries, attributing incremental P&L after each boundary correctly. An optimized strategy seeing the validation range before its pick is frozen invalidates that fold.

**History is heavily inspected.** Both 2020–2023 validation folds were previously examined in this broader research program, so even a sealed walk-forward pick is **reused retrospective evidence**, not an independent proof. The 2024–2026 window has also been repeatedly inspected; if an independently frozen **new-study** protocol authorizes *one* blocking-only diagnostic on 2024-01-02 → 2026-10-13 for *new, qualified* candidates, do it once after candidate, rule and comparison hashes are sealed; label it **inspected historical confirmation only**. Do not use it for choosing rankings, training phenotypes, pool composition, preemption buffers or gates, and do not re-search after seeing it. If sealed prior-study restrictions prevent such an evaluation, **do not circumvent them**; report no evaluation and keep B4/B5's existing full-history results only as inspected references. In particular, **do not evaluate or promote the 15 research-only `diverse-d1` finalists on post-2023 bars**: the completed study expressly did not authorize this. Never use their sealed artifacts to launder a new candidate onto that window.

True prospective evidence begins with verified observations **strictly after 2026-10-13**. Preserve the existing B4/B5 prospective freeze and add a separate new-study registration only if a candidate is eligible under this study's frozen rules; no retrospectively relabelled forward tests. No new data are presumed to exist. If none, output **0 forward observations**.

### Pre-registered integrity requirements

- No optimizer or ranking logic may read bars beyond its search cutoff, even indirectly through shared caches, full-file parsed trading arrays, computed exit labels or pooled seed performance; check with post-cutoff price-mutation tests and recorded truncated bar hashes.
- One plan for all studied symbols, including VOOG and VGT if eligible; no silent exclusion due to previous optimization results, sector assumptions or inconvenient data. Carry over the verified 61-ETF eligibility/integrity rules, recheck hashes and splits, and report failures rather than repairing canonical datasets.
- Preregister selection rules, minimum sample-size/uncertainty labels, profit concentration checks, neighborhood sensitivity, drawdown and cost gates, tie thresholds, and comparison metrics. A wide search produces multiple-testing risk; do not treat a high in-sample best score as reliable future alpha.
- Freeze a bounded compute tier after outcome-blind benchmarking (Sobol budget, number of standalone candidates/ETF, local search, joint configurations, number of vector perturbation draws, CPU/memory and time cap). Reasonable adaptive downscaling **before outcomes** is allowed if hardware requires it; no arbitrary extra evaluation after peeking at validation performance.
- Prefer completely separate new code/artifact directories; ensure code-manifest reproducibility and worker/replay parity, not just passing unit tests.

## 3. Stage A — standalone D1 phenotype discovery for all eligible ETFs

For every eligible ETF, find several **distinct credible standalone D1 phenotypes**, optimizing the existing eight D1 parameters on that fold's training data only. Preserve original parameter definitions, valid discrete grids (percentage steps of 0.1, integers where appropriate), fill semantics and mandatory warm-up. A standalone run has access to one **noncompounding $100k funded slot**, pays 11% interest and modeled costs, and cannot exploit the future. If an existing optimized standalone phenotype was originally selected using future fold data, label it **inspected-only** and do not seed it into a fold's supposedly training-only procedure. The final exploratory calibration may use known incumbents as separately tagged seeds; don't misstate their independence.

Do **not** optimize solely for the largest total P&L or the biggest one/two winning trades. Maintain a small, reproducible Pareto/diversity library covering:

- net P&L after margin interest and friction, minute maximum DD, profitability/tail of all trades (winners **and losers**), average and median net per completed trade, funded trade count and episode breadth;
- total capital-occupied days, average holding period, actual time in market, **net profit per occupied day**, interest burden and trade frequency;
- profit concentration (largest one/two/three trades, largest year/regime), drawdown neighborhoods of parameter perturbations, variability of expectancy across subperiods, and per-symbol data/liquidity caveats;
- worthwhile **counterexamples** such as a low overall return but geographically/sectorally distinct or episodically complementary ETF, retained in a predeclared exploration reserve.

Every symbol's profile and every selected standalone phenotype must be saved **as independent, versioned JSON** with full eight-parameter vector, exact training period, dataset/hash, universe and grid version, optimizer budget/seeds, costs/interest, score, risk and selection provenance. Do not overwrite prior standalone phenotype files. Preserve a read-only catalog of rejected symbols and why. Use stable IDs (not only ticker strings).

### Standalone screening — eliminate genuine weak candidates, not diversity

Before seeing optimizer outcomes, define explicit, economically interpretable criteria to:

1. exclude a symbol whose credible standalone candidates are nonviable (negative net expectancy after all costs, materially unacceptable drawdown, invalid or inadequate data, no supported trade frequency), taking uncertainty and sparse-trade labels into account;
2. mark weakly evidenced symbols **uncertain**, not confidently worthless, when their few trades make average profit unstable;
3. retain a **small preregistered complementary/exploration reserve** of screened-down but valid symbols for joint exploration so an ETF useful precisely during other ETFs' idle periods isn't eliminated merely for having a lower standalone rank;
4. set a reasonable cap on the number of initial phenotype variants per survivor while retaining multiple genuinely different trading phenotypes, not only parameter-near duplicates.

Do not select the "top five ETFs" by standalone profit. All eligible symbols should receive fair initial search effort; joint selection chooses the final pool. Record the count and criteria for explored, rejected, retained, reserved, and downstream-tried symbols per fold.

## 4. Stage B — two frozen ETF rankings derived **only** from standalone performance

Compute rankings from a **predeclared representative standalone phenotype** per eligible/surviving ETF, chosen from training-only standalone results by a fixed, risk-aware rule before joint optimization. Do not opportunistically select a different phenotype for ranking because it produces a preferred order. Store the exact representative phenotype hash.

**Ranking R1 — mean net profit per closed trade**

`R1(symbol) = sum(net P&L over all closed standalone trades) / count(closed standalone trades)`

**Ranking R2 — net profit per capital-occupied day**

`R2(symbol) = total standalone net P&L attributable to the measured evaluation interval / total capital-occupied days over that interval`

Both scores must count all losses, margin interest, execution costs and any open-position mark/interest as of the ranking cutoff **consistently**, rather than rewarding an ETF for leaving a loss open. For R1, choose and preregister a defensible rule for open trades (e.g., a finalized mark-adjusted trade equivalent included in numerator and denominator, or a separate completeness gate); **do not silently exclude underwater open positions**. For R2, specify **calendar versus exchange/trading days** precisely, including overnight/weekend interest treatment, partial-day holding and the denominator for simultaneous virtual/actual standalone states. Avoid lookahead and arbitrary annualization; denominator 0 is unrankable/insufficient evidence.

- **R1 and R2 are separate, fixed rankings, not composite scores or parameters to be fitted.** Every ETF gets a stable rank in each ranking, with a deterministic tie-breaker specified **before looking at results**. Screening and reserve membership are recorded; higher score = higher priority. Low sample sizes get conspicuous uncertainty labels; do not silently treat one winner as conclusive.
- Average of the **top N trades** may be shown as an *additional descriptive diagnostic* but is **not** used as a third search/ranking axis in this study. Do not optimize N or trade percentile cutoffs after seeing outcomes.
- **Freeze each ranking per training window** in a read-only JSON artifact containing ordered symbols, both raw metrics, sample sizes, exact representative standalone phenotype hashes, frozen screening decisions and a content hash. The rank is global; a candidate subset inherits the relative order of its members. Do not change the rank when joint optimization mutates pool-specific phenotypes.
- R1 and R2 must be tested with equal search budgets, identical available symbols and data/allocator conventions, paired random schedules when appropriate and separate protected shortlists. Neither gets suppressed because the other finds higher training P&L. A ranking being poor in a chronological fold is an observed result, not a reason to redesign it mid-study.

**Crucial:** Rankings are *outputs of standalone optimization*, and **inputs fixed throughout joint optimization**. They are not recomputed from the new pool-specific phenotypes; they are not adjusted to historical realized trade outcomes from the allocator. Recomputing priority based on jointly optimized performance is a different future research question.

## 5. Stage C — causal, exact, net-breakeven preemption allocator

Add an **opt-in** priority-based allocation policy to the existing shared-capital system. The old B4/B5 shadow allocator remains the default and byte-for-byte equivalent to its original implementation. The new policy uses the **frozen rank of each participating ETF** during all simulations and can preempt only on a genuine, actionable higher-priority D1 entry signal. Do not allow a priority value or future profitability to generate a signal by itself.

### Precise execution semantics to specify and test

1. **One funded slot:** only one $100k funded position or binding reservation at a time. Opening a replacement trade requires the current funded lot to be liquidated and its financing released first; no fleeting double borrowing and no phantom overlapping positions.
2. **Signal:** an existing D1 virtual book generates a fresh qualified entry at a completed minute/eligible event under its own immutable logical signal state. Shadow books for all candidate members continue independently regardless of which one has funding. A blocked/stale signal cannot be reopened retroactively after the qualifying event passes.
3. **Rank:** if no funded position is open, use the original chronological allocation rules; only when multiple **simultaneous** actionable signals compete should higher priority resolve that competition (include an unchanged-policy comparison). If a funded position exists, only a **strictly higher-ranked** signal can initiate preemption. Equal/lower-priority signals cannot.
4. **Net liquidation at least breakeven:** before preempting, the current funded lot's **realizable** net P&L at the permitted exit execution event must be **≥ $0** **after** accumulated margin interest and both entry and exit trading friction, realized prices, accounting adjustments and any additional modeled fees. Merely exceeding gross cost basis or displaying unrealized green P&L is insufficient. A candidate must not assume its next price or the future exit fills in advance. Define a conservative causal decision using currently available information and an executable event; at execution, abort the switch if the actual allowed liquidation/fill would violate the breakeven condition. If exact simultaneous atomic execution is impossible with the available bar granularity, enforce a documented conservative next-eligible-event sequence rather than using knowledge of a future bar or stop fill. Do not invent infinite liquidity.
5. **Replacement eligibility:** the replacement ETF must still have a **currently actionable, unexpired signal** at the time it can be filled. If its signal no longer qualifies, retain or exit the incumbent according to explicitly frozen no-churn rules; never close the incumbent based on an opportunity that can no longer be bought. Explain ordering when a scheduled incumbent stop/normal exit and preemption occur in the same minute, and when multiple superior signals arrive simultaneously.
6. **Shadow/actual state divergence:** early liquidation changes the *funded position* and shared capital accounting, **not** the independent virtual strategy's history. Specify how the former ETF's shadow book may continue, whether its virtual exit/next entry later emits a truly fresh eligible funding signal, and how D1 material-loss/reentry/time-hold/trailing-stop logic applies to **actual** preemptive exits. Do not silently reset the virtual book, backdate exits or grant a fresh same-bar entry. Preserve baseline D1 entry and exit definitions absent preemption.
7. **Lifecycle:** introduce a distinct `priority_preemption` funded-exit reason, log source and target symbols, rank values, trigger time, decision/execution prices, net-breakeven computation, interest, friction, released and reallocated notional, fallback/abort reason, and prior and new shadow states. Track preempted trade's realized net independently from the successor's eventual net; handle end-of-data open trades honestly.
8. **Avoid churn:** preregister an initial **P1** variant of strict rank + net breakeven (threshold exactly $0). Any optional profit buffer (e.g., $250 or $500) is a **separately frozen secondary sensitivity**, not a simultaneously fitted parameter or a reason to retroactively change P1. No repeated rapid switches or infinite loops in one minute; finite per-event actions, stable order and deterministic replay. A conservative no-churn/confirmation condition is allowed only if specified before results and applied consistently.
9. **Opportunity cost:** implement optional read-only counterfactual replay of a preempted position's original no-preemption continuation (using future data **for analysis after the fact only**). Pair switching decisions to their actual funded outcome, label opportunity cost and replace-trade gain accurately; don't give the portfolio profits from mutually exclusive positions.

**Do not simply transplant a noncausal replay that presumes a shadow exit after an early funded liquidation.** Examine whether the current trace-cache semantics can faithfully represent preemption; if not, extend the causal chronological evaluator and validate against the authoritative full engine. If exact parity is impossible, **stop** and report rather than optimize on a known-wrong fast path.

### Mandatory adversarial tests before optimization

- incumbent XRT lower priority, VGT higher and fresh signal: switch at **exact net $0**, net +$0.01, net −$0.01; gross positive but interest+friction net negative; weekend interest and fills at the next eligible event;
- no switch for lower/equal priority, unqualified/stale signals, missing eligible executable minute, current pending reservation, insufficient released capacity or non-tradable symbols;
- 2 or 3 competing fresh higher-priority signals at the same timestamp; determinism and tie handling, no chain of switches on one bar;
- incumbent stop/hold-time exit and higher-priority signal same minute; gap-through-stop/next fill price; aborted replacement; closed incumbent and shadow divergence; repeated preemptions and later reentries;
- an entry's eventual future winning/losing trade changed in a synthetic fixture must **not** alter the earlier switch decision; mutate post-cutoff bars and verify pre-cutoff pick/allocation logs remain identical;
- equity/shares and cash conservation, funding reservation, interest charge interval, one-sided and two-sided execution friction, corporate-action/split crossing, no phantom dividend, incomplete/open positions, max daily vs max minute DD;
- **regression:** P0 old allocator reproduces B4 and B5 historical fixed and portfolio baselines **exactly at all four cost levels**, and old trade ledgers/timestamps are unchanged; engine vs replay parity across varied pool sizes, both rankings and cases with preemptions. Do not degrade the baseline to enable the new feature.

## 6. Stage D — joint portfolio optimization with **frozen rankings active**

For each fold and again for the final pre-2024 calibration, run **two separate, equal-budget experimental branches**:

- **R1:** average standalone *net profit per trade* determines a globally frozen high-to-low symbol priority.
- **R2:** standalone *net profit per capital-occupied day* determines an independently frozen priority.

Each branch uses the exact preemption execution path in §5 **during** optimization; priority effects must be reflected in realized funded trades, interest, missed signals, opportunity cost, DD, and fitness for every candidate. Optimizing using the old first-come allocator then applying priorities to the final JSON is **invalid**.

### Parameter representation and seed sources

An experimental candidate is `{subset of ETFs, immutable frozen ranking reference (R1 or R2), per-member pool-specific eight-parameter D1 phenotype, fixed-P1 allocation policy}`. The chosen subset is not required to contain VGT, GDX, any B4/B5 symbol or any fixed number of ETFs; the standalone ranks merely prioritize *members that are present*.

Use at least these protected candidate initializations (with provenance labels and equal opportunity for truly new combinations):

- **Standalone-seeded pools:** copies of representative and alternative standalone-optimized phenotype vectors from the permitted training window. **Copy**, never overwrite their standalone JSONs.
- **Existing joint-seeded pools:** copies of frozen B4/B5 per-member vectors and other clearly labelled published comparators, used **only** if those vectors do not contaminate a fold with post-cutoff knowledge. In early folds, if original vectors were chosen using later years, exclude them as seeds and treat them strictly as inspected reporting references; allow separate exploratory incumbent-seeded arms in final 2016–2023 calibration with transparent historical-selection bias. Keep their memberships optional and permit parameter adjustments only to the new pool copy.
- **Independent discovery:** training-only Sobol/random and diversity-preserving subset/phenotype starts, including candidate pools whose ETFs were not standalone front-runners. Preserve independent arms or quotas so the previous study's pooled-top-K suppression and single-linkage collapse cannot recur.

**The standalone ranking stays unchanged while pool-specific vectors evolve.** Every accepted add/remove/swap/parameter mutation must be rescored through the live priority-preemption allocator, not by summing solo P&L. Joint search must be capable of both adjusting D1 parameters for *all* members and changing membership. Limit complexity reasonably but don't assume four/five ETFs is optimal. Use separate promotion and final assessment draws; report optimization pressure and duplicate/near-copy variants transparently.

### Fitness and robust selection

Choose and preregister a risk-aware multi-objective objective (fixed-pool realized+marked **net after interest and friction** is the primary trading currency, alongside max minute DD, tail loss, profit concentration and evidence breadth; use separate dynamic portfolio evaluation/borrowing-efficiency checks for shortlisted candidates). Do not make maximized in-sample P&L the sole objective. Impose the agreed drawdown constraints, and do not manufacture profit by closing losers after the evaluation end or ignoring open-position liabilities.

**Evaluate both ranking methods fairly** with identical research windows, cost assumptions, candidate/symbol opportunities, compute ceilings and independent shortlist slots. A candidate cannot be accepted just because it improves the fixed pool if its 20%-margin compounded portfolio breaches 35% daily DD or exhibits materially inferior borrowing productivity. Judge dynamic portfolio contributions on matched borrowing-dollar-days where possible; do **not** mistake portfolio ending-equity differences driven mostly by earlier compounding for a prospective incremental return advantage.

Neighborhood perturbations must use the *pool-specific* D1 parameters with the priority ordering fixed. Report the percentage of perturbations respecting the minute $35k DD threshold, median net, lower quantiles, tail drawdowns, and sensitivity to double perturbation amplitude. Neighbourhood stability on a single historical market path is **not** a confidence interval on future returns.

For any preemptive candidate, report switching frequency; net realized P&L on every preempted lot; successor-trade P&L; preemption benefit versus **identical vector and pool with preemption disabled**, correctly paired chronological comparison; and costs/interest attributable to switching. Do not optimize on the hindsight counterfactual metric or use it to choose entries.

## 7. Mandatory controlled comparisons (four core experiments)

All experiments need the same market history, execution/friction/interest conventions and at least fixed-pool output; use the dynamic 20%-margin portfolio separately for shortlisted/benchmarked configurations. Do not conflate larger exposures with skill.

| ID | Phenotypes / membership | Funding allocation | What the contrast isolates |
|---|---|---|---|
| **A — unchanged B5** | Exact frozen B5, no alterations | Original nonpreemptive allocator | Original benchmark (with B4 and D1/B1 also reported) |
| **B — B5 + fixed priorities** | **Exact** frozen B5 vectors/membership, unchanged | P1 net-breakeven priority preemption with training-derived R1 or R2 | **A vs B:** effect of preemption and priority *alone* |
| **C — standalone-ranked pool** | Training-only standalone phenotypes, survivor subset determined by a prespecified assembly rule (no joint parameter optimization) | Same P1 and ranking | Baseline for standalone-first composition |
| **D — hybrid jointly optimized pool** | Pool-specific phenotype copies jointly optimized, membership optional, under **the same frozen R1 or R2** | Same P1 preemption | **C vs D:** incremental contribution of true joint optimization; **A vs D:** full proposal vs incumbent |

Do not quietly favor D by giving it more data, friction-free fills or extra validation attempts. Maintain **both R1 and R2** branches for B/C/D; where a baseline B5 member is screened out of the ranking, still assign it the training-derived priority for the B ablation if legitimately calculable, rather than discarding the ablation or training on the future. Make standalone C's assembly rule explicit and frozen before seeing portfolio results; it may use a simple top-k or a deliberately broad set but must not be chosen from validation P&L. Also include a **nonpreemptive version of D's exact final vectors** as a controlled switch-on/off ablation; this separates the benefit of joint parameters from the incremental benefit of P1 within that same optimized phenotype.

Do **not** claim D's advantage over C is independently proven by in-sample fitness—D was optimized to win that comparison on training. Rely on the chronological procedure folds for diagnostic evidence and actual forward observations for independent evidence.

### What decides whether a candidate advances

Before results, freeze procedure-level gates for fold success and final nomination: risk, minimum material improvement over B4/B5, cost sensitivity, activity/evidence, non-concentrated profit where relevant, and drawdown/borrowing-efficiency constraints. If the preemptive method fails its gates, **no new candidate**; keep original B4/B5. Do not rescue by changing priority metrics, a ranking's order, preemption threshold, fold cut, passing criteria or seed diversity after validation. Report partial positives separately from a gate failure; preserve every frozen finalist and negative outcome.

## 8. Executable JSONs, full trade ledgers, and CLI

**Permanent artifacts must be genuine, loadable JSON files—not screenshots, Markdown approximations, or ephemeral generated options.** The existing `config/pools/B4.json` and `config/pools/B5.json` must remain untouched and runnable. For every new standalone phenotype and finalized experimental pool, preserve complete provenance and content hashes.

New pool configuration schema should contain or reference exactly:

- stable pool ID, study version and status (`research-only`, `historical-comparator`, or separately authorized prospective candidate);
- selected ETF symbols, *each member's own pool-specific D1 phenotype* and all eight exact parameters; no accidental aliasing/mutation of standalone or B4/B5 JSON;
- frozen R1/R2 rank list (or immutable external ranking hash plus fully resolved ordered members), score provenance and representative standalone phenotype hashes;
- allocator policy `priority-preemption-P1` with net-breakeven threshold `0`, exact event/fill/tie/stop rules, single funded $100k position, interest, cost and data model;
- source/seed provenance (standalone, incumbent, independent); optimizer training cutoff, code manifest hash, dataset version/hash, frozen validation/evidence status.

Implement or extend a documented CLI under a real `npm run ...` script. User must be able to:

1. list available standalone, frozen comparator and research pool configurations and statuses;
2. run **unchanged B4 and B5 against `all` in fixed $100k mode**, preserving previously established commands and full-history anchors;
3. run each **new final experimental pool** against a named historical training/evaluation dataset in fixed $100k mode with its frozen ranking and P1 allocator, and separately run the 20%-margin portfolio;
4. run read-only comparison A/B/C/D and R1/R2 summaries, per-symbol collision/preemption reports, and a new-data-only prospective report **if** an eligible frozen candidate exists;
5. verify configuration integrity/hashes and show documented help with actual accepted flags.

For **every fixed-pool `all` backtest**, including B4 and B5 (without rewriting old configs), print the full **chronological funded-trade ledger** by default or via an explicitly documented flag if an already running CLI contract requires it: trade #, ETF, entry/exit timestamps and actual fills, quantity/notional, holding period, exit reason including preemption, gross P&L, entry/exit friction, margin interest, net P&L, cumulative net P&L, and supported per-trade adverse excursion. Report open positions with accrued interest and mark-to-market P&L separately. Print per-symbol totals, funded versus blocked signals, realized/unrealized reconciliation, fixed-pool DD (daily and minute, $ and %), and portfolio DD (separately, correctly defined). Export **CSV and JSON** ledgers from actual engine accounting. **Do not reconstruct approximate trade P&L or sum shadow opportunities as funded trades.**

If the previously requested B4/B5 detailed-ledger enhancement has not yet been implemented, fulfill it compatibly or explicitly declare its dependency before claiming the CLI delivers it. Demonstrate that B4/B5 ledger aggregation reconciles exactly to frozen totals. Finish with literal copy/paste **`Commands I can run`** using syntax executed in this repository, not invented sample flags.

## 9. Prospective registration, outputs, audits and stopping rules

Keep the current B4/B5 prospective comparison protocol intact. For a new experimental pool, only register it for **prospective shadow monitoring** if the new study's preregistered qualification gates allow it; otherwise archive it as `research-only` with no forward-test claim. Prospective observations are strictly from **after 2026-10-13**, appended via the already established versioned future-data process. Carry actual and virtual strategy state through the boundary without artificially resetting trailing highs, holding timers or financing. If no new valid observations exist, show **zero** rather than constructing future performance.

Reports required in `research/d1-ranked-preemption/` (names may be adapted to repo conventions but make a navigable `README.md`):

- **`PROTOCOL.md` and `PROTOCOL_FREEZE.json`** — hypotheses, chronology, frozen constants/gates, code and dataset hashes, search budgets and stage outcomes; technical amendments/why and when.
- **`STANDALONE_SCREENING.md`** — full eligible universe, per-symbol standalone candidates, multiple metrics, material-loss/tail checks, sample sizes, screening/rejection/reserve decisions, and executable standalone phenotype JSON paths.
- **`FROZEN_PRIORITY_RANKINGS.md`** plus machine-readable **`R1.json` / `R2.json` per fold/final** — all ranks and metric definitions, denominator and open-position handling, stability of ranks across folds, hashes and evidence caveats.
- **`OVERLAP_AND_PREEMPTION_DIAGNOSTIC.md`** — baseline blocked signals, actionable high-priority overlaps, actual switches, denied/aborted switches, trade IDs, collision matrices, hypothetical counterfactuals clearly separated from realized results, sensitivity to the P1 net-breakeven boundary.
- **`JOINT_SEARCH_AND_DIVERSITY.md`** — budget/coverage, both ranking arms, seeded versus unseeded representation, pool sizes, candidate memberships, pool-specific vectors, search/refinement moves and survivor ledgers.
- **`CHRONOLOGICAL_VALIDATION.md`** — each fold's independently trained ranks/vectors, sealed pick before validation, chronological incremental P&L, fixed and portfolio risks, controlled A/B/C/D comparisons, gates, regime/year attribution, and limits from inspected folds.
- **`FINAL_COMPARISON_AND_RECOMMENDATION.md`** — clearly separate in-sample optimizer success, historical blocked-only confirmation if authorized, prospective zero/new observations, and no-advancement decision; show risk, cost, matched-borrowing, opportunity/interest and trade-concentration metrics. Be willing to prefer original B4/B5.
- **`IMPLEMENTATION_AUDIT.md`** — full engine/replay parity, data-source isolation, exact B4/B5 baseline reproduction at 0/2/5/10 bps, fake-leakage mutation tests, no adverse changes to frozen artifacts, external/read-only independent review and its dispositions; all Git changes, hashes, performance budgets, tests.
- **`RESEARCH_RECOVERY.md`** — fully resuming task-specific checkpoint, all sealed stages and currently running processes, latest freeze hash and no-rerun warnings.

**Acceptance tests:** regression to B4/B5 exact controls; deterministic ranking recalculation from JSON and independent standalone ledger; fixed priorities unchanged across every joint mutation; no symbol can be funded outside a valid fresh signal; profit-tested liquidation truly ≥ $0 after interest/friction; one funded lot; synthetic future mutation cannot change earlier decisions; correct continuous window state; full vs fast parity with preemption; re-run deterministic archive results; tests/TypeScript typecheck/lint; inspect previous study and prospective freeze hashes unchanged. An independent reviewer should challenge missing/misused shadow state, incorrect net breakeven, simultaneous event ordering, contaminating historical seed vectors, mutable ranking files and accounting discrepancies. Resolve correctness defects before running unsealed optimization stages; fail closed if material defects remain.

**Decision discipline:** Finish the bounded study to its preregistered stopping condition, including negative results. Once an outcome stage is sealed, do not secretly rerun it or alter its rules to find a better result. If no candidate passes, do not open the post-2023 blocked-only diagnostic for its new configurations and do not create a misleading prospective nomination. Do not provide annualized expected returns from history, do not assert that optimization corrected historical selection bias, and do not assume B5's two very large GDX trades generalize.

## 10. Execution order and required final reply

Perform this assignment rather than just proposing a plan. Use the following ordered milestones with task-local checkpoint updates and reviews:

1. Repository/command/locked-data and prospective-protocol audit; brief completeness check; design+engineering plan; write-once study protocol and independent preregistration review.
2. Build and test causal opt-in P1 preemption engine; establish baseline B4/B5 exact parity, including priority disabled, cost and corporate-action tests; independent engine correctness review. **Do not run a large optimizer on unverified execution semantics.**
3. Run historical standalone optimization/screening in each fold under its data door; save every selected/rejected phenotype, two frozen R1/R2 rankings and eligibility records; run the bounded overlap opportunity diagnostic and obey the predeclared stop condition.
4. Run joint discovery and pool-specific parameter optimization separately with R1 and R2 rankings in force; include incumbent-seed and unseeded, standalone and truly new-start arms in their appropriate training periods; maintain diversity and assessment independence.
5. Seal fold candidates before chronological validation; analyze procedure-level robustness and no-advancement gates; if allowed, run final 2016–2023 calibration and sealed independent reporting confirmation; only then consider one authorized and clearly inspected 2024–2026 historical check, never selection-driven iteration.
6. Save finalized research pool JSONs and immutable standalone library; exercise documented fixed-pool and portfolio CLIs end-to-end, with full funded-trade ledgers and aggregate reconciliations. Preserve working baseline B4/B5 commands.
7. Independent read-only final audit, tests, reports and valid/no-data prospective registration; state exact limitations and no-advancement if applicable.

Your final response must include:

- **The decision:** whether ranked net-breakeven preemption improves on B4/B5 *within the observed historical evidence*, and whether **R1 vs R2** or **joint vs standalone** produced meaningful, chronologically supportable advantages. Report failures, not just winning metrics.
- A compact table showing **A/B/C/D for R1 and R2**, fixed $100k net profit, minute DD, number of preemptions, per-symbol contributions, portfolio ending equity/daily DD, cost sensitivity and the evidence grade for every result. Make it explicit which rows are training-only and which are inspected chronological evidence.
- Exact paths to standalone phenotypes, frozen ranking JSONs and new **separate pool-specific** phenotypes/configs; verification manifest and actual Git status. B4/B5 unchanged.
- All runnable CLI commands **you actually executed**, their outputs and logs, and how to rerun read-only reports without overwriting sealed optimization records.
- A final section **`Commands I can run`**, with copy/paste-ready commands for the existing B4/B5 fixed-`all` runs, any permitted new experimental fixed/portfolio runs, full trade ledgers, comparison and verification. Do not guess CLI flags. If no new bars exist, plainly say the forward observation count is zero.

Work autonomously on normal design/implementation details while preserving the user's research constraints. **Do not trade, download new market bars, access secrets, rewrite historical freezes, or commit/push/merge without explicit approval.**
