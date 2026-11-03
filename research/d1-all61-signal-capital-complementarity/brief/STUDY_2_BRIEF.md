# Claude — Study 2 of 3: All-61-ETF D1 signal timing, opportunity overlap, and shared-capital complementarity

**Execution brief — complete the research, implementation, audit, reports, commit, and push.** Do not stop after proposing a plan. Use the strongest available reasoning effort and independent reviewer agents where appropriate. Read repository `CLAUDE.md` and its imported context-recovery instructions first. Treat this file as the task specification, then verify actual repository authority before executing.

**Study ID:** `d1-all61-signal-capital-complementarity-v1`  
**Research branch (preferred):** `research/d1-all61-signal-capital-complementarity`  
**Research namespace (preferred):** `research/d1-all61-signal-capital-complementarity/`  
**Code namespace (preferred):** `src/d1-signal-capital-complementarity/`

## 0. Assignment boundaries and agreed sequence

This is **Study 2 of three separate research assignments**, in an agreed order:

1. **Study 1 COMPLETE:** Wider D1 phenotype libraries, expanding/rolling chronological selection, and new-search experiments. Outcome: *no demonstrated improvement; validation-profit-based selection was worse*. This result is a constraint, not an invitation to rerun Study 1.
2. **STUDY 2 — THIS ASSIGNMENT:** Analyze historical **timing, overlap, independence, opportunity quality, and capital occupancy** of real D1 entries across all 61 audited ETFs. Distinguish appearance of diversification from **economic complementarity under one shared $100,000 margin slot**, using exact chronological replays where needed. This study is primarily diagnostic; do not turn it into another broad parameter optimizer.
3. **Study 3 NOT STARTED:** Extensive **creative, first-principles independent momentum-entry research**, with separate entry/exit/reentry mechanisms, original strategy design, and its own controlled optimization. It is intended to address inactivity during sustained uptrends, including VGT 2023–2024. **Do not implement, optimize, simulate, or preempt Study 3 in this assignment.** Do not treat Study 2's findings as authorization to start it.

End the final response with explicit status lines: `Study 1 completed; Study 2 completed / incomplete; Study 3 not started.`

**Primary question:** Of the 61 ETFs, do any provide **genuinely distinct and economically attractive D1 trading opportunities when the existing B4/B5 shared margin capital is idle or when their signals could justify competing for that capital**, rather than merely dipping in the same market crashes? What do actual entry, exit, occupancy, and full allocator paths tell us that price-chart correlation and standalone profit cannot?

**Research hypotheses (do not presume outcomes):**

- H0: Most lucrative deep-dip signals cluster within a small number of broad market shock regimes; apparently differentiated ETFs provide little independently fundable incremental opportunity.
- H1: Some ETFs produce *independent calendar-time* D1 opportunities, but post-interest net economics may be weak during otherwise idle periods.
- H2: Some ETF phenotypes produce signals coincident with existing books, yet can still improve full-path shared-pool P&L if their entries displace less valuable trades; **first-order displaced-trade arithmetic may give the wrong sign**.
- H3: Some opportunities emerge only under ETF-specific phenotypes, while a common-rule control shows that the observed result is more about parameter fitting than asynchronous price behavior.
- H4: Complementarity can be different in rebound versus persistent-decline regimes, and apparent diversification can disappear during a common crisis.

A valid outcome is `no demonstrated economically useful complementarity`, `limited / regime-dependent complementarity`, `credible exploratory complements only`, or `inconclusive`. **Do not require or manufacture a winner.**

---

## 1. Mandatory repository and prior-evidence audit BEFORE protocol freeze

Read and verify the actual repository artifacts, not just summaries. Discover exact paths, current scripts, and immutable records. At minimum inspect:

- **Study 1:** `research/d1-wide-library-chronological-selection/` — `README.md`, `FINAL_COMPARISON_AND_RECOMMENDATION.md`, `CHRONOLOGICAL_FOLD_COMPARISON.md`, `NESTED_SELECTION_AND_LATER_EVALUATION.md`, `DIP_EVENT_CAPTURE_AND_TAIL_RISK.md`, `SOURCE_ARCHIVES_AND_SELECTION_BIAS.md`, `PROTOCOL.md`, source registries and sealed selection records. Study 1's approximately 413,280 new searches and broadened libraries did not improve forward-fold selection. Do not promote A1–A4 or select the retrospectively best library member for this study.
- **61-ETF source universe:** `research/d1-ranked-preemption/` and `research/d1-standalone-etf-opportunity-audit/` — audited exact 61-symbol list, status/eligibility, per-fold source representatives and libraries, archive provenance, split adjustments, diagnostics, event catalog, chronology/data doors, liquidity flags, and limitation on evaluating research-only source phenotypes after their authorized end dates.
- **Prior seven-ETF complementarity screen:** discover `research/` folder containing `OPPORTUNITY_SCREEN.md` and `RECOMMENDATION.md`. Its daily proxy screen on GDX/XOP/EWZ/TLT/XLE/XLU/GLD found little *clean idle-time* opportunity; the baseline All-lowDd shared slot was occupied ~51% of screened sessions. This was **not** an exhaustive 61×61 actual-signal matrix.
- **Prior portfolio-aware D1 opportunity map:** discover `OPPORTUNITY_MAP.md` and the relevant `S0` opportunity and exact allocator reports. They showed the opposite warning about *first-order accounting*: full chronological pool replay could improve despite candidate signals being busy against the baseline. E.g., certain GDX/XOP/XLE configurations altered the entire funded path; simple `candidate trades minus displaced S0 trades` is not an exact counterfactual. Do **not** ignore either prior study or summarize them as unanimous evidence that no ETF can help.
- **Frozen baselines:** registered VGT `primary`, B4, B5, original four-book All-lowDd/S0 as historical context if different, canonical `shadow` allocator and exact funding/reservation/tie/refusal mechanics, VGT-only S, 60% VOOG/40% VGT core-only C0, 20% of marked equity portfolio overlay, 11% simple interest, 5 bps/side baseline friction.
- **Prior robustness and execution audits:** B4/B5 historical risk, date boundaries, stop assumptions, borrowed-pool marks, and prospective monitoring freeze.

Create a `SOURCE_AND_CONFLICTS_AUDIT.md` identifying the actual source commit hashes, what each earlier study measured, any conflicting claims and why (daily proxies vs real D1; first-order vs full-path replay; fitted vs common-rule candidates; standalone vs pooled), and which facts have already been seen. **Do not overwrite prior studies to reconcile them.**

### Risk context: do not exaggerate falling knives

Study 1 found that in 2022–2023, 63–87 event episodes *across the independent 61 ETF evaluations* contained money-losing decline-phase entries; its original narrow group had a worst reported closed trade around −$20,000 per $100,000 slot and several ETFs breached the historical $35,000 drawdown filter. **These are not B5's realized or simulated pooled losses and must not be summed as though all 61 are funded simultaneously.** Historical B5's comparable retrospective fold increment was positive (~+$171,000), and its same-window pooled metrics must be reproduced and reported separately. The user's view is that individual falling-knife losses may be acceptable because exits contain them. Test that proposition quantitatively:

- distinction between individual worst closed trade, cumulative losing clusters, unrealized adverse excursion, and strategy/pool peak-to-trough DD;
- whether a smaller individual loss still consumes substantial future profit or capital capacity;
- risk that profit-conditional stops do not guarantee unconditional protection on a losing position; maximum-hold exits and buffered-loss behavior matter;
- realistic gap and liquidity limitations of assumed stop-price fills, without inventing market quotations;
- difference between running 61 independent slots and funding at most one shared slot at a time.

**Do not change D1 safety/exit rules as part of this study.** Report loss containment *and* cumulative risk in matched units; do not use emotionally loaded terminology as a substitute for numbers.

### Existing test maintenance

Some previously failing tests referenced `src/app/allin-original.ts` after the tracked file was renamed to `src/app/allIn-original.ts`. The user has separately asked Claude to correct these references. **Check the actual working tree and latest commits.** Preserve any existing correction; do not revert it. If baseline tests still fail, distinguish pre-existing issues from study-introduced defects and report actual before/after counts. Do not make an unrelated test-refactor part of this research, nor misattribute a fixed filename issue to a new failure.

---

## 2. Isolation, source control, data doors, and no-leakage constraints

1. Verify `pwd`, `git status`, current `HEAD`, worktrees, upstream, untracked files and recent commits. Start from a clean, verified completed **Study 1** branch/commit (or an explicitly verified later history containing it and any already-applied test-name fix). Create the dedicated Study 2 branch. Do not discard, stash blindly, or commit unrelated changes. A separate clean git worktree is acceptable.
2. Do not alter `config/`, frozen B4/B5 phenotypes/policies, canonical minute `data/` or partition metadata, prior `research/` study folders, source archives, sealed protocols, source engine semantics, prospectively frozen tracking configuration or historical results. Import the original simulation engine. Use study-local logging/adapters where possible; any unavoidable external package script addition must be minimal, audited, and reversible.
3. **No new live trading, orders, broker actions, network downloads, external data, secrets, credentials, or `.env` access.** Local minute files and existing audited market-event metadata only.
4. **No global D1 reoptimization, 61-ETF joint parameter search, optimizer-weight tuning, altered stops, changed exit activation, altered capital allocation priorities, priority optimization, or strategy promotion.** This study asks *when existing D1 mechanisms offer opportunity*, not *which new vector maximizes historical total profit*.
5. **Respect provenance-specific research cutoffs.** Research-only fold-a vectors must not be evaluated past their authorized end (typically 2021-12-31); fold-b vectors not past 2023-12-29; final-window research vectors not beyond their 2016–2023 training span. If the source policy is stricter, enforce it. Do not copy old vectors into a new ID merely to evade a frozen door. A research vector's label is not authorization to evaluate it on future bars.
6. **Historical partition discipline:** use 2016-01-04 → 2023-12-29 training-era data by default, with the source's arming/warm-up conventions; exclude 2024–2026 from research candidate discovery, replays, and downstream evaluation. B4/B5 full-history anchors through 2026-10-13 may be read **only as previously published, labeled context**, never as a new study candidate evaluation or prospective evidence. Do not combine validation and final holdout, and do not open any post-2023 bar for this project's research-only candidates.
7. The periods before 2024 are **previously inspected** in earlier work. Chronological cutoffs can protect *execution causality* but cannot restore independent statistical evidence. Disclose hindsight in the 61-survivor universe, prior phenotype choices, known B4/B5 baselines, and study design.
8. Any signal selection rule, event matching tolerance, shortlist size, counterfactual scenario, cost setting, or outcome classification that can affect the conclusion must be written in `PROTOCOL.md` and frozen **before reading this study's result-bearing output**. The designer's prior knowledge must be disclosed. Separate outcome-free instrumentation checks from substantive result exploration.
9. Freeze source hashes, code and methodology with verifiable manifests. Amendments after result inspection must be additive, labeled exploratory or reporting-only, and never silently alter the primary decision.
10. Don't invent numerical parity or historical findings. Failure to reproduce existing benchmarks is a blocker, not permission to silently change simulator behavior.

---

## 3. Explicit candidate definitions — all 61, without cheating on phenotype choice

**A common challenge:** How do we attribute timing overlap to different ETF price paths rather than overfitted ETF-specific parameters? Use *complementary, non-substitutable signal views* and disclose every source vector.

### View U — uniform-rule all-61 control (mandatory)

- Apply the **same fixed, already registered VGT `primary` D1 parameter vector** to each of the 61 audited ETF price series. This is a *new descriptive counterfactual*, not a claim that VGT's vector is suitable for every asset. The parameter definition is already known and fixed; do not tune it for individual ETFs.
- Replay real D1 decision logic using minute bars, completed-minute observations and next-eligible execution semantics, rather than an invented daily proxy. Capture full virtual signal and lot paths independently per ETF; impose data-quality filters honestly.
- This view isolates differences in the **underlying price timing** (plus ETF-specific fills and valid data) from per-ETF parameter choices. It also supplies a complete 61×61 matrix even when some ETFs have no source survivor.

### View P — historically available, per-ETF phenotypes (mandatory, provenance-aware)

- The existing source's **period-correct, training-only, sealed representative A0** for each ETF in folds A and B, if one exists and is legally authorized in the relevant evaluation period. A0 is the primary source-based representative; if a symbol has no credible nominee, record `no nominee` and preserve it instead of hindsight substitution.
- Training through **2020-06-30** → evaluate **2020-07-01 to 2021-12-31** within the source fold-a cutoff; training through **2021-12-31** → evaluate **2022-01-03 to 2023-12-29** within the source fold-b cutoff. Use the source's exact A0 stored vectors, arming and permitted dates, not the retrospective best from a later fold or Study 1's A1–A4.
- If a comparative view using the final-window A0/library (trained through 2023-12-29) is useful, confine it to its own **in-sample** training horizon and clearly segregate it from fold A/B, with no final candidate replay after 2023-12-29. It is **optional context**, not the basis of any chronological verdict.
- Where legally reusable and truly informative, a **small, predeclared** source-library alternate per ETF may be included in a separately labeled sensitivity view, without choosing it using any outcome/occupancy result. Do not turn this into 61×4 retrospective winner mining. If this adds prohibitive ambiguity, omit it.

### View I — fixed incumbents and funded capital (mandatory)

- Reproduce the **exact** registered B4 and B5 pools on matching historical periods, with fixed policy, priority, same-minute tie rules, virtual/shadow semantics, reservations and occupancy. Preserve B4/B5's actual book-specific phenotypes. Optionally retain earlier S0/All-lowDd baseline for comparison, clearly identifying differences from B4/B5.
- Also reproduce VGT `primary` standalone S and core-only C0 when relevant to units and portfolio DD.
- A member already in B4/B5 must not be counted as a *new* candidate for the same baseline (e.g. GDX is already in B5). Analyze its marginal contribution or removal **only as diagnostic and explicitly not as an optimized replacement**, and do not mislabel its signals as a novel complement to that same pool.
- **Do not assume B5's GDX vector equals the standalone GDX A0 or any later research phenotype.** Verify and use the actual registered config.

Provide `CANDIDATE_REGISTRY.md|csv|json`: all 61 symbols, source universe status, each view's exact parameter signature, status (registered/hindsight/reference/period-correct/no nominee), provenance, authorized cutoff, liquidity/corporate-action flags, data coverage, and reason for any missing row. A full all-61 result cannot silently collapse to the 49–54 source survivors.

---

## 4. Instrument actual D1 decisions, entries, exits, and capital occupancy

Construct or reuse **causal** minute-level signal histories. Preferred implementation: study-local adapter around the canonical engine, not a parallel reimplementation. Separate the following concepts rigorously:

1. **Price-defined dip episode** (ex-post descriptive label; its trough is not available to a live signal).
2. **Armed trailing-buy state** (threshold reached; not yet an executable buy).
3. **Triggered entry decision** (all required D1 conditions satisfied at a completed eligible minute).
4. **Eligible next fill** (trade execution point under canonical model).
5. **Virtual entry/lot** when running an ETF standalone; may not be funded in a shared pool.
6. **Actual funded entry/lot** under the frozen B4/B5 shadow allocator.
7. **Refused entry** including whether the capital slot was held, reserved, or priority-preempted, and which funded position prevented it.
8. **Reset / continuation / rearming state** and whether a refused signal reappears legitimately later under shadow semantics.
9. **Exit decision, stop fill, maximum-hold, buffered-loss result, interest and transaction costs**, including an open lot at any evaluation boundary.

Do not count an ETF as offering an available funded opportunity merely because it had a standalone virtual trade on a day when another book held the pool. **Respect precise decision minute, fill minute, capital reservation state, no retroactive fills, and market session calendar.**

For both views U and P, capture a source-audited timestamped signal ledger (minute/date in ET, symbol, view/phenotype, reason, armed/triggered/filled/refused, entry/exit prices and times, gross P&L, costs, interest, net, MAE/MFE, days held, initial and final state, episode/cross-market family attribution). For B4/B5 capture actual funded and refused signal logs and slot occupation intervals.

Prove exact replay equality with the pre-existing baselines: positions, decisions, fills, exit reasons, interest, friction, net P&L, daily and minute marks, occupation, tie-breaks and candidate IDs. Use multiple ETFs, transitions, gap cases and cost settings. If engine hooks are inadequate, add study-local introspection that changes **no** trading decisions and prove it by before/after parity.

---

## 5. The actual 61×61 comparison — not ordinary return correlation

Build complete pairwise descriptive matrices for **each relevant view and matching date window** (View U all 61, View P with explicit `NA` for absent nominees). Export both CSV/JSON and concise readable heatmaps or matrix tables. Do not turn any correlation coefficient into a claim of economic complementarity.

### Timing and concurrency

For each ordered ETF pair `i,j`, report wherever meaningful:

- Joint qualifying **armed-state** time and distinct arming episodes; differentiate arm overlaps from executable entry overlap.
- Triggered entry **decision proximity** at the exact minute, same session, within ±5 trading sessions and within ±20 trading sessions, using preregistered event matching (at most one matched event per decision / cluster; do not inflate counts by pairing every signal with every other signal).
- Coincidence of **actual standalone lot occupancy** intervals, with intersection / union, fraction of `i`'s held minutes overlapping `j`, number of concurrent minutes, and overlap by crisis/regime. Pairwise values may be asymmetric; state denominators.
- **Nonoverlapping, independent event families**: count distinct synchronized market-wide events once in a cross-symbol aggregate, not 61 times. Preserve within-ETF dip families and a separate cross-ETF calendar clustering; publish the matching tolerance, event duration, and how episodes are linked without chaining unrelated periods.
- Lag/order information: which ETF tends to signal first, relative delay distributions, and how often a candidate fires **while an incumbent baseline is flat** versus busy/reserved. Distinguish baseline flat-days from actual first-stage executable decision windows.
- Signal sparsity / unstable metrics: zero-signal pairs `NA` where mathematically undefined; never render a meaningless zero correlation as evidence of independence.

### Economic descriptors, not just timing

- Net P&L and downside distribution of the standalone candidate's **actual trades** in baseline-idle intervals, at 11% interest and 5 bps per side; caution that classifying an entry as initially idle does not mean its full trade is *clean*.
- Three **first-order classifications** for each candidate signal relative to the **unchanged** baseline: `busy/refused`, `idle-clean` (no baseline funded entry would need the slot until the candidate is out), `idle-displacing` (free at entry but would conflict with future baseline entries). Use a formal, precise definition consistent with actual decision/fill/reservation semantics.
- `Independently timed`, `economically positive`, and `fundable` must be separate columns. Include gross, interest, friction, net per occupied calendar day, worst lot, and opportunity concentration by market-event family. Do **not** require removing the largest winner to call a payoff legitimate; show with/without best episode as a **sensitivity**, not an automatic disqualification.
- Compare price-return correlation to entry/occupancy overlap as a **secondary contrast**. Document cases where low correlation **fails** to imply independent buy opportunities and cases where synchronized entries might nevertheless improve full-path pool economics.

Generate **conditional** opportunity maps by historical regime (at least 2018 Q4, 2020 crash/recovery, 2022 decline, 2023 recovery/bank stress, plus the remainder of 2017–2023) with fixed dates or predetermined objective catalog boundaries. A label created after observing prices is allowed only for *description*, never for a trading decision or hindsight selection.

### Mandatory questions for each ETF, including rejected/no-signal cases

- How many eligible dip episodes, armed states, actual D1 trigger decisions, virtual standalone fills, and profitable/loss-making trades?
- How many opportunities arrived while B4 was flat? B5 flat? During other books' profitable holding periods? During loss-producing churn?
- How many are truly `idle-clean` versus would displace another book's later entry?
- What is the calendar concentration and regime dependence of clean opportunities? Are there independent off-crisis events or just the same 2018/2020/2022 selloffs?
- Can any claim of complementarity be supported by **at least two independently separated market regimes**, or is it one compelling but sparse episode? If evidence is insufficient, label it so.

---

## 6. Full chronological shared-pool replay is mandatory for any economic claim

The previous seven-ETF studies exposed a critical issue: **a first-order accounting shortcut can get the sign of incremental value wrong.** The actual path with a candidate can fund some entries, refuse others, and change later shadow states. The correct economic comparison is a fresh full chronology with the same engine and identical baseline capital, costs and priority.

Therefore distinguish TWO levels:

- **Level D (descriptive, all 61):** pairwise signal overlap, baseline occupancy, first-order opportunity classification, standalone trade economics; explicitly non-causal as a pooled intervention.
- **Level C (causal counterfactual, bounded):** complete, order-correct chronological pool simulation with a chosen candidate book inserted **using a fully frozen, transparent allocator insertion convention**. The resulting funded path and total P&L are contrasted with a separately rerun unchanged baseline. Only Level C can justify a statement about incremental pooled economic value. `Causal` here means simulator counterfactual under its assumptions, not proof of live future returns.

### Predeclare a bounded replay menu BEFORE examining the study's new outcome tables

1. Baselines: unchanged B4 and B5, on identical start/end dates, one $100,000 shared noncompounding slot, unchanged shadow policy, positions and stops. Preserve core-only C0 and portfolio overlay comparisons as appropriate.
2. **Two signal sources:** primarily U (uniform fixed parameter vector) and P (legally available fold-specific A0 phenotype), never hindsight replacement within an evaluation fold.
3. **Predeclared screening:** based exclusively on historical data available *before the evaluation window* or, in a clearly separately labeled *training-era descriptive* scenario, on contemporaneous training observations. Do not pick top candidates using fold evaluation P&L, current study full-replay outcomes, or 2024–2026. For example, rank by (a) distinct eligible entry-family breadth and dispersion across years, (b) how often valid entry times occurred when the fixed baseline was idle, (c) ex-ante net economics and drawdown of past standalone trades, and (d) independent-event coverage. Write exact scoring, missing-data rules, gates and tie-breakers in the frozen protocol. Do **not** use a single all-61 hindsight best-return ranking.
4. **Replays:** at most **six predeclared, distinct, non-incumbent candidate ETFs per baseline per view** (less if evidence or compute warrants; may select none), run **one candidate addition at a time** for primary interpretation. Do not enumerate every possible subset, optimize membership/order, or mix candidates simply because they win individually. B5 members already represented are not additions to B5.
5. Include **one negative-control / timing-only comparator** chosen by frozen training-side criteria and one robust source-selected candidate if available; do not quietly omit an unfavorable control. If selections share the same exposure cluster, still report but disclose concentration.
6. Full replay on the **period-correct evaluation windows** only when the chosen candidate provenance and configuration are authorized there. Where the original B4/B5 frozen components themselves incorporate later selection hindsight, explicitly label the comparison **retrospective with an incumbent-hindsight comparator**; don't call it clean out-of-sample validation.
7. An additional, **in-sample descriptive** 2016–2023 full-path comparison is permitted only if every candidate is legally evaluable throughout, and candidates are not labeled period-correct or independently validated. Keep the resulting ranking separate from the primary chronological comparisons.
8. If a selected candidate would require evading an existing sealed source cutoff, **do not replay it**. Mark `unavailable under source authorization` and report a narrower result. This brief does not authorize unsealing previous studies or laundering a barred vector under a new ID.

### Exact outputs of each replay

- Funded trades and refused decisions for all books; timeline of holders; candidate-first-order category; which original baseline trades disappear, which new trades appear, what shifts and why; price and state path parity.
- Total fixed-$100k **net** (gross, interest, friction), Δ net versus unchanged baseline, and 0/2/5/10 bps/side cost sensitivity by **fully re-simulating decisions** (do not just subtract post-hoc cost).
- Max **minute** and **daily** drawdown in **dollars and % of the $100k slot**; worst realized lot, worst open MAE, cumulative loss clusters, time in market and net per borrowing dollar-day.
- 20%-of-marked-equity margin overlay on **$300,000 initial 60% VOOG / 40% VGT core**, identical dividend/valuation convention: terminal equity and incremental equity versus the C0 core and B4/B5, **max daily and minute portfolio percentage drawdown**, peak/trough dates, effect on core exposure. Treat 30% as preferred maximum, 35% as user-conditional upper threshold, not a universal stop or a guarantee.
- Exact **path attribution**: changing a book can alter funded selection later. Document contribution from genuinely idle-clean opportunities versus displacement/preemption effects. Do **not** attribute total Δ net to the candidate's own trades alone or to a static set of displaced trades.
- Evidence strength, overlapping market regimes, model execution limitations, and the distinction between a historical backtest improvement and plausible future opportunity.

If no candidate qualifies for a controlled replay, that is a valid result. At minimum instrument B4 and B5, generate the full 61×61 matrices, and explain the null.

---

## 7. Risk containment and actual portfolio relevance — avoid the 61-slot fallacy

The user accepts individual contained losses, and the D1 mechanism has exit rules. Study 2 must evaluate **realized risk in the correct deployed structure**, without dismissing repeated small losses or exaggerating a large group of hypothetical independent losses.

Produce side-by-side, **matching-horizon** risk tables for:

- one ETF standalone $100k borrowed slot;
- B4 shared $100k borrowed slot;
- B5 shared $100k borrowed slot;
- any bounded B4/B5+candidate scenario;
- $300k 60/40 VOOG/VGT core plus 20%-of-equity margin overlay and C0 core-only comparator.

Separate `per trade`, `per independent event family`, `per cumulative strategy window` and `portfolio peak-to-trough` risk. Important metrics:

1. Worst loss per closed trade; gross vs financing; realized exits by reason, especially maximum-hold and buffered loss.
2. MAE before exit, unrealized losses, unrealized-to-realized ratios and gaps. Historical intraday stop-price fills are model assumptions, not guaranteed stop orders.
3. Consecutive losing trades, 30/60/90-calendar-day rolling net losses, drawdown recovery periods, time to recover past highs, and density of falling-knife clusters.
4. Max minute and daily pool drawdown; whether the actual fixed pool comes near or exceeds $35,000 (the research **historical** ceiling, not an enforceable future stop); separately show DD %.
5. Interaction with 30% preferred / 35% conditional **total-portfolio daily** DD targets; explicitly mention when a core-only drawdown already breaches those targets.
6. Opportunity cost when new trades block the incumbent's unusually profitable rebounds. Distinguish many small loss-making trades from rare large winners without arbitrary top-winner penalties.

Include a **specific answer to the user's concern**: “Do the many 2022–2023 falling-knife labels imply unacceptable loss risk for B4/B5, or are they largely contained by the existing exits and constrained funding?” Ground the answer in actual matched B4/B5 risk histories rather than standalone aggregate counts. If risk cannot be settled because live slippage/house margin changes are unmodeled, state exactly that.

---

## 8. Execution, accounting, data quality and robustness safeguards

Use the canonical split-adjusted one-minute SIP files (`data/<SYMBOL>/data.csv`) and existing validated metadata. Respect regular-hours market sessions, daylight saving, split registry (including XOP reverse split and XLE/XLU/XLY), duplicates/missing bars, and source warm-up rules. No imputed fills in missing trading minutes. Report per-symbol issues, not just global success. Some 61-universe symbols have thin minute coverage/liquidity (see source audit); their signal conclusions must be flagged, not silently discarded.

Execution parity requirements:

- Completed-minute decision versus next trade/fill, stop price crossing model, overnight gaps and opening bars, trade session end, maximum-hold calendar days, buffer eligibility, net-profit activation of stops and continuation state.
- The source's cost-dependent stop state: rerun paths at 0/2/5/10 bps (and one clearly labeled adverse execution stress if already implemented) rather than computing friction by subtraction. Avoid an unverified universal slip assumption.
- Interest = 11%/year base, correct calendar-day accrual, open positions and mark valuation. Portfolio core includes source dividend policy; other ETFs' price-only dividends/yields omitted or bounded and disclosed using verified existing metadata only.
- Simultaneous signal ordering, incumbent priority, slot reservations, fills/refusals and shadow behavior match existing engine exactly. A hypothetical `B5+candidate` is a new *research-only* policy scenario, never a change to B5.
- Marks and windows: continuous warm-up from inception; if analysis resets a windowed DD peak, declare it. Never drop existing open positions at a cutoff to create an unrealistically attractive new entry. Tie and event matching semantics must be reproducible.

Implement **fail-closed parity** checks against pre-existing B4, B5, VGT primary, source all-61 standalone and Study 1 control data on matching horizons and costs (where appropriate). Use exact numeric checks for canonical anchors; if baselines differ because of an older documented convention or version, explain and stop before making cross-study claims.

Required adversarial tests:

- Mutation of any post-training-cutoff bar does not change a fold's candidate registry, training signal events, shortlist, or frozen selection hash.
- Two ETFs fire in the same minute; tie priority reproducible, no double funding.
- Pool held/reserved versus flat; refused virtual entry can neither fill retroactively nor disappear from the diagnostic log.
- Candidate enters when pool is initially flat and displaces an incumbent trade later; exact full-path Δ may differ in sign from first-order Δ.
- Changing friction changes stops/entry eligibility; full path rerun agrees with engine.
- Gap/open and missing-minute handling, including a stop activation case while losing and an open lot at a window boundary.
- ETF-specific adjusted split/corporate action; no fake +287% XOP gain or 50% XLE/XLU drop.
- Every ordered pair matrix diagonal, symmetry/asymmetry rule, zero-denominator NA, event one-to-one matching, pair counts, and cross-ETF cluster non-duplication.
- Repeated runs with same inputs produce identical hashes and ledger order.
- Source research cutoffs and frozen B4/B5/pool files are never violated or modified.

---

## 9. Predeclared decision rubric and evidence limits

Before outcome inspection, specify an exact, manageable rubric to classify:

- **Structural asynchronous timing:** credible, repeatable separation of valid D1 entry episodes relative to baseline exposure (not merely low return correlation); identify candidate and independent episodes.
- **Fundable economics:** net after 11% financing and 5 bps/side in truly idle-clean opportunities; acknowledge sparse episodes and open-lot carryover.
- **Full-path incremental economics:** positive Δ net from exact shared-pool replays, a plausible margin after costs, and explicit opportunity cost, not first-order arithmetic.
- **Downside compatibility:** minute DD ≤ $35k historical research reference on the actual shared slot and portfolio DD within preferred 30% or conditional 35%, **on the relevant matched horizon**, while recording unfavorable sensitivity rather than gaming thresholds.
- **Regime / fold breadth:** not purely one exceptional event or the same broad crash observed across correlated ETFs; meaningful 2020–21 vs 2022–23 and additional 2017–2023 subperiod comparison. If data supply only one independent economic event, say `thin/inconclusive`, even for a high-profit path.

Require an explicit conclusion per ETF or cluster: `coincident only`, `asynchronously timed but uneconomic`, `economically interesting but mostly competing`, `exploratory marginal complement`, `not evaluable` / `insufficient`. No registered candidate or deployment recommendation can come directly from this retrospective study. The preferred overall verdicts are `no demonstrated complementarity`, `limited / regime-dependent exploratory complementarity`, `several credible exploratory complements`, or `inconclusive`.

Do not force a global strongest ETF if none qualifies. Distinguish:

- **A true economic complement** from an ETF whose signals simply replace an incumbent's profitable trades;
- **Higher shared-pool profitability** from true *asynchronous* timing (both can happen independently);
- **Different calendar opportunities** from diversification of return distributions;
- **Historical profit capture** from evidence of generalization;
- **Standalone and shared-capital metrics** (never sum standalone 61 ETF profits and present as one account).

Declare how many opportunities, ETF comparisons and candidate variants were examined. Avoid unearned p-values, confidence levels and comparisons treating 61 ETFs as statistically independent. Label any exploratory winner as selected on known history with no fresh independent test.

---

## 10. Required deliverables and machine-readable evidence

Create a self-contained, navigable report tree under `research/d1-all61-signal-capital-complementarity/`:

1. `README.md` — goals, status, one-page verdict, exact commands, source authority, evidence tiers, links to reports, Study 1 complete / Study 3 not started.
2. `PROTOCOL.md`, `PROTOCOL_FREEZE.json`, amendment ledger — hypothesis, methods, 61-universe source, U/P/I views, exact time windows, screening/replay budgets, decision rubric, cost settings, pre-freeze reviews, seals and no-leakage restrictions.
3. `SOURCE_AND_CONFLICTS_AUDIT.md` — reconcile proxy seven-ETF screen, portfolio-aware opportunity map, Study 1, B4/B5, and original 61-ETF search **without pretending they used the same measurement**.
4. `CANDIDATE_REGISTRY.md` plus `candidate-registry.csv|json` — every one of 61 audited ETFs, flags, phenotypes, signatures, provenance, authorized ends and missingness.
5. `SIGNAL_GENERATION_AND_ENGINE_PARITY.md` — provenance, signal instrument, exact fill/state semantics, baseline anchors, full-engine equivalence, data coverage.
6. `PAIRWISE_SIGNAL_TIMING_AND_OVERLAP.md` — 61×61 ordered matrices, overlap and non-overlap metrics, strongest/weakest timing pairs, denominator/NA explanations; data exports per view/window and reasonable visual heatmaps.
7. `INDEPENDENT_EVENT_FAMILIES_AND_REGIMES.md` — calendar clustering across ETFs, unique market shocks, leading/lagging entry signals, robustness to fixed matching tolerances, year/regime breakdown.
8. `BASELINE_OCCUPANCY_AND_IDLE_OPPORTUNITIES.md` — B4/B5 timeline, share held/reserved/idle, candidate signals by busy/idle-clean/idle-displacing, ex-ante economics; compare to the previous seven-ETF screen.
9. `EXACT_SHARED_POOL_COUNTERFACTUALS.md` — all predeclared bounded full-path replays; funding differences, displaced/gained incumbent lots, cost-sensitive net Δ, failure cases; clearly distinguish first-order estimates from actual path results.
10. `RISK_AND_FALLING_KNIFE_CONTEXT.md` — answer the user's concern with B4/B5 real shared-slot results, separate closed-loss vs MAE vs cumulative DD, effect of exits, 2022–23 cluster review, historical versus live execution limits.
11. `CHRONOLOGICAL_AND_MULTIPLE_TESTING_LIMITS.md` — source provenance limits, fold chronology, known-history contamination, source-selection hindsight, comparison-count/market-regime dependence, withheld holdout, structural survivorship.
12. `FINAL_COMPARISON_AND_RECOMMENDATION.md` — concise direct answer, concrete ETF/cluster distinctions, ranking *only if supported*, null/inconclusive outcomes, what Study 2 changes about the **research agenda** (not the deployed strategy), and a clean handoff to Study 3.
13. `IMPLEMENTATION_AUDIT.md` — verified tests, anchors, checks, failures, reviewer dispositions, git scope, hashes, protected-input check.
14. `RESEARCH_RECOVERY.md` — maintained on-disk checkpoint; follow root CLAUDE.md recovery import, track next exact stage, seals, time cutoff, local commands, interruptions, known blockers. Never claim to force context compaction or to do work after the session ends.

**Machine-readable outputs** must include: detailed minute decision/state ledgers, funded and refused lots, pair metrics (both raw and denominator), matrices (CSV + JSON), market-wide event families and ETF-specific episodes, baseline occupation intervals, first-order classifications, selected candidates and screening frozen records, exact replay scenarios, matched-window risk and portfolio marks, and small readable tables. Track output needed for reproducibility; if heavy raw artifacts are ignored, provide hashes, generation commands, minimal committed evidence sufficient to audit claims, and exact file-level reproduction limits. Do not state “commit is fully reproducible” if essential evidence was omitted.

Expose **read-only** CLI subcommands with documented actual syntax, such as:

```bash
npm run d1-signal-complementarity -- status
npm run d1-signal-complementarity -- verify
npm run d1-signal-complementarity -- sources
npm run d1-signal-complementarity -- universe
npm run d1-signal-complementarity -- signals --view U --symbol VGT --window training
npm run d1-signal-complementarity -- pair --view U --a VGT --b GDX --window training
npm run d1-signal-complementarity -- overlap --view P --window fold-b
npm run d1-signal-complementarity -- occupancy --baseline B5 --window training
npm run d1-signal-complementarity -- candidate --symbol XOP --baseline B4 --window fold-b
npm run d1-signal-complementarity -- replays
npm run d1-signal-complementarity -- risk
```

Adapt names to actual engine and source permissions. Never advertise commands that don't exist. Design deterministic, idempotent, write-once execution stages separately from read-only inspection. A command called `verify` must verify actual records rather than recompute/change a frozen study.

---

## 11. Research execution stages and independent reviews

### Stage 0 — audit, baseline and instrumentation plan

Review root context instructions, existing research, git status, baseline anchors, current test fixes and all 61 symbols. Save baseline hash manifests of immutable inputs. Identify honest limitations in the universe, corporate events and fold permissions.

### Stage 1 — methodological freeze

Write research protocol, exact candidate views and source cutoffs, signal/event definitions, shortlist selection method, bounded replay menu, reporting metrics, acceptable outcomes and failure modes. Obtain independent methodology review; resolve material ambiguities **before** study outcomes. Freeze the **protocol** and persist its signature. The **code** freeze follows completed instrumentation and parity tests in Stage 2, before any result-bearing Stage 3 analysis.

### Stage 2 — signal instrumentation and parity

Build the instrumentation for exact, reproducible signal/virtual/funded/refused ledgers; prove parity on outcome-free fixtures, sealed incumbents and historical source anchors against the canonical engine. Do not proceed when parity fails. Include stop and gap handling tests; correct any study-local instrumentation defects; then **freeze outcome-defining code** before running Stage 3 or generating new research result-bearing ledgers.

### Stage 3 — all-61 timing analysis

Generate U and legally available P signal histories, 61×61 timing matrices and cross-ETF event clusters, without using future outcomes to change candidate choices. Record missing/NA cases and liquidity constraints.

### Stage 4 — independent opportunity / economics analysis

Quantify initial baseline idle/held/reserved states and **clean versus merely initially idle** trading opportunities. Separate first-order opportunity bookkeeping from exact full-path counterfactuals. Freeze any selected candidate IDs before evaluation-window replay using permitted earlier-only features.

### Stage 5 — bounded exact replays and risk audit

Run predeclared B4/B5+candidate paths (where authorized) and negative controls. Report both useful and harmful results, fully resimulate costs, compare absolute/percentage DD for shared pool and total portfolio, and examine 2022–23 without summing separate ETF losses. Refuse over-budget or unauthorized combinations.

### Stage 6 — verification and delivery

Independent implementation/results reviewer with read-only access to frozen records; random/stratified ledger reconciliation, check all 61 matrix rows, path dependence, attribution and dates. Resolve errors transparently, rerun all research tests and earlier protected baselines/verifiers, ensure no frozen file or historical anchor changed. Write reports with figures directly traceable to committed machine-readable data. Maintain checkpoint throughout.

**Commit and push this completed Study 2 to its dedicated `origin` branch.** This user request explicitly authorizes normal `git add`, `git commit`, `git push -u origin <study-branch>` for the study files, necessary code, and a minimal npm script. Never merge, open a PR, force push, tag, or commit unrelated work. Protect any user-file-name test corrections already present. Report exact branch, full commit hash, remote confirmation, changed-file summary, final working-tree state and run commands.

If a substantial blocker makes full execution impossible, **do not fake completion**: deliver everything valid so far, identify blocked rows/windows/symbols, and label `Study 2 incomplete` with safe next steps. No need to ask the user for trivial design decisions that can be resolved from repo authority and a frozen protocol.

---

## 12. Final answers Claude MUST provide to the user

Provide a concise executive summary with direct answers to these questions, supported by exact report references:

1. Of **all 61 ETFs**, which actually have asynchronous D1 dip/entry episodes relative to each other and relative to B4/B5's occupied time? Which appear independent in return correlation but collide at entry?
2. Which differences are driven by the **underlying ETF price paths** (uniform View U) versus **ETF-specific historical parameter fitting** (View P)?
3. Do those asynchronous windows contain enough **profitable, financeable** opportunities after interest and costs, across genuinely separate market regimes?
4. What changes when we **replay the complete pool** instead of treating an overlapping candidate trade as lost or adding standalone P&L to baseline P&L? Explicitly reconcile any prior GDX/XOP/XLE contradictions.
5. Which (if any) research-only additions consistently improve the pooled capital path **without crossing risk references**? Is any conclusion limited to a particular known regime or one extreme trade? Do not promote anything.
6. Are the many historical 'falling knife' labels truly threatening to the **funded B4/B5 pool**, or are losses well contained at the actual capital-at-risk level? Quantify per-trade losses, cumulative DD and failure of historic safety limits, if any.
7. How much of apparent lack of opportunity is due to **true lack of distinct ETF price dips** versus a single shared capital slot being busy with existing trades? Where did the pool sit idle during prolonged advances?
8. Does the study justify moving next to **Study 3's separate momentum research**, rather than more joint D1 optimizer iterations? Identify findings that help frame its hypotheses **without implementing Study 3**.

Final outcome must be conservative, transparent, entirely reproducible under the documented artifact limitations, and use no new independent holdout claim. **Study 1 remains closed; Study 3 remains untouched.**
