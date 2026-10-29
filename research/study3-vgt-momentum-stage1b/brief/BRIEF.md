# Claude Code execution brief — Study 3, Stage 1b: VGT momentum, executable chronology, exit/reentry discovery, and exposure control

**Read this complete Markdown file before taking any action. Execute the authorized work, including analysis, implementation, substantial experimentation, independent reviews, reproducibility verification, reports, Git commits and push.** The user is authorizing a serious research continuation, not a quick patch or a search for a pleasing profit figure. **A negative result is a valid and important conclusion.**

**Project:** Margin Trading (`ai-trading` / repository's actual name; verify rather than assuming).

**Starting state:** Studies 1 and 2 complete; Study 3 Stage 1 complete and pushed on `research/study3-vgt-momentum-first-principles`; Stages 2–4 not begun.

**Expected Stage 1 head:** `db6a3ec83bfade06441efe9ae2219e2bc07a25fc` (check Git and remote before relying on it). Stage 1 commits reported: recovery-policy update `3237f69`, research implementation `537abaf`, checkpoint update `db6a3ec`. **Verify exact SHAs, contents, ancestry and repository state in Git.**

**New branch:** `research/study3-vgt-momentum-stage1b` created **from the completed Stage 1 research head**, never from `main` alone.

**New namespace:** `research/study3-vgt-momentum-stage1b/` and `src/study3-vgt-momentum-stage1b/` (adapt to verified repository conventions, without modifying Stage 1's sealed records). Preferred new CLI name: `study3-momentum-stage1b`.

**Authorized in this execution:** First integrate **only** the permanent Claude Code recovery-policy changes into `main` and push if allowed by the repository's protections; then perform **Stage 1b standalone VGT research only** on a branch from Stage 1, commit and push that new branch.

**Not authorized:** Merging Stage 1/1b research into `main`; modifying registered VGT D1, B4, B5 or allocator defaults; running VGT D1 + momentum, B4 + momentum or B5 + momentum; opening momentum-candidate bars on 2024–2025 or 2026; deploying, placing orders, changing broker accounts, modifying `data/`, or claiming an improved strategy without evidence. **STOP after Stage 1b and request the user's approval for the next evaluation.**

---

## 0. Verify the whole brief, establish authority, and separate the two Git operations

1. Verify you can read this entire document, **including Section 15 and the final completion checklist**. If the user attached the Markdown in Claude's interface, ensure you have the full text rather than a summary/preview. Save an exact copy under `research/study3-vgt-momentum-stage1b/brief/BRIEF.md` and its SHA-256; do not silently truncate. If an exact local copy cannot be made, stop before scientific work and explain the obstacle.
2. Inspect actual `git status`, `HEAD`, `git branch -avv`, remote URL/ref, ancestry, pending user changes and active worktrees. Locate and read the Stage 1 `PROTOCOL.md`, `EXPERIMENT_MATRIX.json`, `MECHANISM_CATALOG.json`, `FINAL_COMPARISON_AND_RECOMMENDATION.md`, `CHRONOLOGICAL_RESULTS.md`, `EXIT_MECHANISM_STUDY.md`, `REENTRY_AND_CAMPAIGN_ANALYSIS.md`, `STANDALONE_RISK_AND_EXECUTION_STRESS.md`, `IMPLEMENTATION_AUDIT.md`, `RESEARCH_RECOVERY.md`, independent reviewers and source implementation. Read Studies 1/2 recommendations for constraints and failures. **Actual repository files and sealed records govern their own historical facts; this brief defines the new assignment.** Document any conflicts before proceeding.
3. Preserve uncommitted user work and unrelated branches. Do not reset, checkout over, clean, stash or delete changes without understanding ownership and authorization. Worktrees may be preferable to switching a user's active checkout. Never copy a sealed study's outcome into a new candidate file as if it were a new independent test.
4. Inspect `CLAUDE.md` and its `@docs/claude/context-recovery.md` import; preserve all unrelated instructions. Verify the referenced file resolves under Claude Code's project-memory system; if possible inspect loaded-memory diagnostics with a new session, but **do not falsely claim a fresh-session verification you have not run**.

### 0A. Mandatory first operation: permanent recovery policy in `main` ONLY

The user **explicitly authorizes** integrating the permanent context-recovery policy into `main` before Stage 1b research. They do **not** authorize merging research into `main`.

- Inspect Stage 1 commit `3237f69` with `git show --stat`, `git show --name-status`, and the diff. Confirm that its changes are **only** the intended durable `CLAUDE.md` / `docs/claude/context-recovery.md` instructions. Verify the actual existing `main` and its current instructions. A path's contents matter more than the short commit name. If `3237f69` touches research or other unexpected files, extract/apply **only the relevant policy patch** and document how.
- Use a clean, isolated Git worktree or equivalent safe procedure on latest verified `main`. Respect branch protection and push permissions. Preserve unrelated changes and existing instruction imports. If the policy is already present, idempotently verify and avoid unnecessary duplicate commits. If conflicts are nontrivial or `main` requires PR approval/protected checks, **stop that integration rather than force-pushing or bypassing protection**; report the blocker and don't assert success. You may continue Stage 1b only if you can do so safely with the already-existing policy and clearly disclose its main-integration status; never silently skip the user's explicit priority.
- Verify `CLAUDE.md` actually imports the policy; the policy should make long-task checkpointing, automatic compaction, post-compaction recovery, new-session recovery, and COMPLETE/INCOMPLETE task closeout a **permanent project practice**, without requiring future research prompts to repeat it. Keep the import small and avoid configuration that clobbers existing instructions. If hooks exist, only inspect/test them; no fragile new hook installation without a justified review.
- Run the relevant checks, commit **only the policy files** to `main`, push via the approved mechanism, and verify the remote head. Report the exact commit, files, pre/post hashes and test outcome; **no research files or strategy code on `main`**.
- Then create the **new Stage 1b branch from Stage 1 head** (`research/study3-vgt-momentum-first-principles`, verified SHA), not from `main`. This preserves Stage 1 implementation and evidence, as well as the recovery instructions already on that branch. There is no need to merge `main` into Stage 1b merely to inherit that policy. Document exact branch ancestry and separately verifiable main-policy integration.

### 0B. Automatic long-session recovery (permanent policy + task-local record)

Use the pre-existing permanent policy. Create `research/study3-vgt-momentum-stage1b/RESEARCH_RECOVERY.md` before extended work, then update after meaningful milestones and before compaction when feasible. Include authoritative brief/protocol hashes, branch, recent commits, stage seal hashes, completed tests, active processes, surviving artifacts, blocked steps, decisions/rejected hypotheses and **the next exact command**. Never ask the user to compact manually or halt at arbitrary context percentages; allow automatic compaction. After compaction or new session reload `CLAUDE.md`, imported recovery rules, this brief, the protocol, the checkpoint and Git/process/artifact state before acting. A checkpoint is a map to source artifacts, not their replacement. Do not rerun sealed jobs or kill a costly running job because a context summary omitted it. Fail closed on ambiguity threatening chronology or correctness.

---

## 1. Scientific question and prior evidence — carry forward the uncomfortable facts

**Question:** Can a causally executable, standalone VGT long-momentum strategy — using better-aligned entry, exit, reentry and *optional* position-sizing rules — earn substantial net returns after **11% annual margin interest** and realistic trading costs, with historically acceptable drawdown and more reliable chronological behavior than the frozen Stage 1 procedure? Could an appropriate protective trailing exit plus independent rearming capture long uptrends while avoiding unacceptable surrender of accrued profits?

**Stage 1 facts to reproduce, not manufacture or improve in place:**

- Chronologically chosen yearly momentum picks: 2020 +$18,608 (E06), 2021 +$14,577 (E04), 2022 **−$57,578** (E04), 2023 +$24,646 (E06), sum +$253, with a reported chained minute DD $63,569. The yearly window marks were spliced from distinct **continuous-from-2016** histories. That is chronology-respecting *selection* but **not an executable path of annual phenotype switches**. A 2022 E04 holding opened in March 2020 although E04 was not the 2020 chosen policy.
- That March 2020–January 2022 E04 lot was a **highly profitable completed trade** (~+$83,131 net over its lifetime), not a $33,954 lifetime losing trade. The approximately −$33,954 was an **incremental 2022 loss relative to its 2021 year-end mark**, including a partial giveback of substantial unrealized gains. It started 2022 with ~$236,944 **market exposure** from an original $100,000 borrowed principal. Distinguish lifetime trade P&L, prior unrealized appreciation, calendar-window mark changes, and max drawdown. Do not mislabel it as a loss of original principal.
- E04 2022 selected configuration's hard stop was ~7.9%, trailing stop ~24.6% from the **highest held closing price**; the pivotal carried trade exited by the **CUSUM/own structural signal**, not necessarily that trail. The Stage 1 `TPL` template used a hard stop and a trailing stop (plus the family's own OUT condition and a rearming rule), with optimized trail originally allowed ~4–30%. These are price-anchored stops, not dollar limits on the appreciated position.
- Stage 1 **H** full-history in-sample references (2017–2023, 5 bps side / 11%): E06 calm-advance +$120,096 / minute DD $25,809; E05 rising-floor +$97,193 / DD $34,463; E03 directional-efficiency +$92,336 / DD $34,796. Joint parameter-neighborhood medians (64 draws ±10%) E06 **$74,079** (89% of neighbors net-positive **and** DD ≤$35k), E05 **$76,025** (30%), E03 **$78,948** (23%). These are **hindsight-selected**, *not* forecasts or evidence that a new combination will generalize. One-at-a-time versus joint perturbation results differ substantially; retain both.
- Separate **descriptive** exit experiments on other entries showed a rising-floor/structural exit (`X3`) and volatility-scaled trailing exit (`X2`) materially change historical return and risk. These exits did **not** each receive an equivalent independent numerical optimization across all entry families. Never attribute the E02+X3 profit to E06+X3 without re-simulation.
- Stage 1's selection procedure failed chronological risk, profit and exposure-matched criteria. All tested momentum rule/benchmark families lost in 2022. It tested only data through **2023-12-29** for momentum candidates; 2024–2025 and 2026 remain unopened for this study.
- Studies 1 and 2 found that extra D1 phenotype searches and 61-ETF D1 additions did not reliably improve future-window or shared-pool results. Stage 2 still seeks independent momentum behavior, not another D1 optimization.

**Do not rescue E06 by hindsight.** Keep E06, E03, E05, E02, E07, E11, upward trailing-buy and other credible families in scope. Disclose that previously observed results informed these hypotheses.

---

## 2. Scope, evidence boundaries, success and failure

**One ETF: VGT. One fixed initial research margin slot: $100,000 borrowed principal. One standalone book at a time. No D1, B4, B5 pooled economics in this task.** Keep all registered variants, config, allocations, margin rules, historical market-data files, splits, distributions, old freezes, `pools` code and prospective protocol unchanged. Do not introduce leveraged ETFs or additional leverage to enlarge results.

- Canonical VGT split-adjusted minute OHLCV through **December 29, 2023**; data in 2016 provide warm-up, verify Stage 1 arming/start. **Hard no-candidate-access door** for 2024-01-01 onward. No candidate, alternative exit, selector, benchmark or descriptive path may read 2024–2025 or 2026 in Stage 1b. No 2026/prospective bars. Incumbent anchors may be read only in previously authorized contexts if needed; do not turn an anchor run into a momentum test. Do not combine validation with final holdout. Later periods need a new, independently frozen and user-approved study.
- Historical research windows in 2016–2023 were inspected by earlier studies. Study 1b is a **retrospective, chronology-respecting methodological investigation** with strict per-fold look-ahead barriers. Never call 2020–2023 or 2017–2023 newly independent OOS. Explicitly distinguish data access by running code from prior human/research-design hindsight.
- Base financing **11% annual interest**, per-side friction **5 bps**, no slippage baseline to match existing research. Re-run appropriate stresses at 0/2/5/10 bps, 8%/11%/14% interest, nonzero execution slippage/delays, opening gaps and bar omissions. Use 365-day date conventions and trace actual borrowing notional/time; no compounding interest unless justified by actual brokerage conventions and separately modeled.
- **Historical minute DD reference ≤ $35,000 per fixed $100,000** as a screening criterion, not a stop guarantee. Preferred context for any eventual full portfolio ≤30% daily max DD, conditional hard ceiling 35%, **not assessed as a B4/B5 claim here**. Show both dollar and percent DD, daily and minute, from account equity marks; treat forced broker liquidation/gap risk as unmodeled or stress separately.
- A lower drawdown achieved by deploying only 20% capital is not automatically superior. Report time-weighted actual gross exposure, exposure peaks, notional-dollar-days, borrowed-principal days, margin interest, exposure-normalized P&L and matched-risk controls.
- A valid research result may be no credible candidate, poor 2022 defense, loss of bull-market participation, or inability to distinguish strategies statistically. **Do not promote or register any phenotype**, and do not call a candidate deployable because it earns a historical profit.

---

## 3. Methodological repair A: an *executable* chronological annual-selector path

This is a **first-class deliverable**, not a footnote. The Stage 1 yearly selection method must be reconstructed as trades a real account could have held under the annual selection decisions made at the time.

### 3A. Preserve and reconcile the original

- Reproduce the Stage 1 four annual picks and window increments with the existing study's code and previously sealed artifacts *read-only*, explaining the convention that a 2022 E04 policy inheriting a March 2020 E04 position is **not the same as actually switching into E04 in January 2022**.
- Preserve original Stage 1 files and hashes. New calculations live only in Stage 1b's namespace. Never rewrite frozen Stage 1 `PROTOCOL.md`, candidate archives, checkpoint or selection records.

### 3B. Explicit policy-switch semantics

Implement and predeclare at least:

1. **Cash-settle/flat then adopt**: on a year boundary, close any old strategy holding at the next legal fill under realistic gap/cost semantics, repay or reconcile borrowing, transfer accrued equity/realized profits properly, initialize new strategy state with **past-only** warm-up, and permit its next entry only after an eligible signal. Handle pending orders and the first session exactly. No instant boundary-close fill if information was known only at that close.
2. **Continue existing position under the *old* strategy until its own exit, then adopt the newly selected one**: disclose whether transition selection is deferred or immediate for *new entries*; block competing positions in the one slot. This variant is a predeclared sensitivity, not interchangeable with 1.
3. If feasible, a **state-transfer** variant (new strategy takes over an existing position) only if a precise causal transformation of entry references, stop levels, campaign states, and borrowed principal can be justified without using future bars. Otherwise **reject it explicitly as undefined**; don't invent state for the new system.

Report the executable policy's exact trade ledger, annual and aggregate marks, realized vs unrealized gains, interest, friction, end-boundary liquidation, peak-to-trough dollar/percentage DD, transitions with rejected/queued orders, and how much outcomes change versus the original non-executable splice. **No carry-in lot may exist before the selected policy actually entered it** except under the explicitly modeled continue-old-policy variant. Prevent same-day double entries and artificial flat-period advantages.

Run independent reference/slow-engine parity and synthetic fixtures around switching in a crash, gain, pending stop, weekend/holiday, and changing selection. The selected family/parameters at cutoff must depend only on data available before that cutoff. Repair the evaluation *before* judging whether the old selection procedure failed in an executable implementation. It may still fail — state so.

**Critically:** separating selection *model choice* from portfolio *position state* is mandatory. Avoid reusing a full-history strategy's pre-cutoff mark or stock holdings to simulate a policy that was not selected then. Don't splice gross returns from incompatible histories into a fictitious account.

---

## 4. Methodological repair B: financing, exposure drift, and optional re-sizing

Conduct a **standalone controlled sizing experiment**, not a blanket modification of every strategy. First derive a self-financing accounting identity and independently validate it. All sizing decisions are causal.

- **Z0 fixed shares/fixed original borrowed principal:** the Stage 1 baseline; allow appreciated position market value to grow without altering shares. Exact original semantics for comparable runs.
- **Z1 periodic fixed-market-value exposure:** e.g. monthly, with a reported target gross market value near **$100,000**; sell a portion of appreciated shares to reduce gross exposure, or buy more only under an explicitly selected and authorized leverage/borrrowing constraint (default **do not increase** borrowed principal above $100,000). Specify whether proceeds repay loan or remain as account cash, and their effect on interest and equity. If a lot falls below target, do not silently buy more (that would become a different dynamic leverage policy).
- **Z2 profit-only / threshold-triggered trimming:** after appreciation passes a predeclared band (for example +20%, +40%, etc.), trim only the excess according to a simple bounded rule; no forced monthly turnover without a trigger. Other simple risk-based trimming options permitted if justified **before** evaluating their outcomes.
- **Z3 no-trim profit-sensitive exit** as a distinct comparator: retain shares but tighten exits based on accrued gains/dollar equity drawdown, preserving possible large winning lots.
- Optional small pilot-sized/gradual-entry variant **as a separate mechanism**, with maximum borrowed principal and performance compared on matched market exposure; do not make it mandatory.

For each sizing variant and each completed trade/campaign: reconcile initial principal, *remaining* principal, gross share market value, share count, realized gains, realized cash, interest accrual, trading costs, interim account equity, cash available, margin obligations, and final marked liquidation value. Cash from trim must neither be counted as profit twice nor disappear; interest should decrease only if actual principal is repaid. Realized gains and residual shares must reconcile to total economics. Include synthetic +100% then −30%, long flat, deep gap, and partial-trim scenarios.

**Cross-check the March 2020–January 2022 E04 lot:** entry/exit, positive lifetime net, prior unrealized appreciation, Jan 2022 giveback and counterfactual trims. Separate initial-principal loss from equity drawdown. Counterfactuals are neither original trades nor independent validation.

Compare passive monthly resized VGT on identical loan/cash terms. Stage 1 principal-dollar-day matching missed appreciated gross market exposure; add causal market-value exposure and matched-risk diagnostics. Exact ex-post realized exposure matching can be a hindsight comparator, not evidence of timing skill.

---

## 5. New scientific work C: independently optimize *exit* mechanisms — not just TPL

**This must receive substantial effort comparable to Stage 1's entry search.** Stage 1 optimized one template (`TPL`, entry family's own OUT + entry hard stop + high-close trailing stop + R3F); the other exits were largely descriptive on fixed entries. Do **not** restrict the new optimization to TPL or assume it was a complete exit search.

**Entry/exit factorial isolation:** choose a documented **mechanism-diverse panel** including at minimum E06 calm-advance, E05 rising floor, E03 directional efficiency, the upward trailing-buy family (verify E09/E10 source IDs), one renewable-level/campaign family (verify E11), and a simple conventional control. Use **common entries to compare exits**, and **common exits to compare entries**, before any joint optimization. Define identical accounting, position-sizing Z0 baseline, and initial-state/warm-up semantics. Where a structural exit requires its own entry-state reference, explain how it can be paired with different entries without using future information.

Investigate at least these **independent exit families**, treating every numeric range below as a starting hypothesis that can be widened under the predeclared conditional-research protocol; don't impose an arbitrary narrow 7.3% solution:

1. **Fixed-price hard + trailing stop**: explicit benchmark around the registered VGT D1 `primary` trailing-stop value (**verify the actual value from the registered configuration, previously described as ~7.3%**), additional tight values near 5–10%, medium 10–15% and wide 15–25%+. Measure a trailing reference to *highest held close* vs *intraday high* only when data and execution semantics permit a causal comparison. D1's profit-conditional activation and standalone momentum's immediate protection are different. **Never modify D1.**
2. **Volatility-scaled trail** (`X2`): ATR/realized-vol measures using past-only data, floor/ceiling, ratchet/no widening after activation, crisis volatility expansion, low-liquidity gaps, and stop jumps.
3. **Rising-floor / structural exit** (`X3`): support violations/higher-low structure with independent emergency stop and deterministic reference updating. Carefully compare when support breaks before a large price retreat.
4. **Two-layer protective design**: immediate hard catastrophic-loss protection + slower trend deterioration signal, plus optional profit-protection ratchet that can only tighten.
5. **Profit-retention or equity-giveback schedule**: lock in *some* gains as mark-to-market gains become substantial; test both price-based and actual **dollar-equity** giveback, explicitly preserving chances for rare multi-year winners.
6. **Price damage vs trend damage**: OR, AND, regime/state-dependent combinations, with a small intelligible parameter count and ablations versus each alone.
7. **Time/progress/financing-aware exits**: healthy advance vs stalled financed position, fixed max hold as negative control, distinguish a temporary consolidation from genuine deterioration.
8. **Own-OUT and hysteretic/state-machine exits**, asymmetric entry/stay/exit evidence and dynamic exit protection if simple and implementable.
9. **Claude-invented additional causal exit family** (at least one genuinely distinct mechanism, documented before tuning; e.g. first-principles protective behavior under rising exposure), not an indicator rebrand.

**Core hypothesis**: A relatively protective stop (perhaps near D1's magnitude) **plus effective reentry** could earn more than a 24.6% wide trail that tolerates large reversals. But wide stops and strong structural exits must remain fair comparators, and early-exit + reentry may lose money from whipsaws. Test both full-trend campaigns and standalone lots. Report whether an exit stops huge winners prematurely, *how often* it later returns, total campaign P&L, missed upside and time/interest while idle. A stop at 24.6% from highest close may surrender substantial unrealized peak gains but **does not erase a trade that previously doubled**; preserve that distinction.

Exit search must control parameter count, account for multiple families and ensure costs and stop semantics are re-simulated whenever they can change the trade path. A profit-conditional D1 stop may be an explicit **benchmark only**, not silently applied to the new momentum strategy. Always-active hard protection for new momentum is a studied choice; record any gaps that violate nominal levels.

---

## 6. New scientific work D: renewable campaigns and independent reentries

Study 1 demonstrated that R0 immediate reentry was particularly damaging in 2022 and that some exits never produced a stop/reentry event. Don't build an elaborate reentry optimizer on a family that almost never reenters; first measure **reentry opportunity counts** and whether a different exit architecture causes them.

Investigate genuinely distinct causally observable rearming rules, including fresh family signal only; immediate reentry control; fixed bounded cooldown; recover a portion of the last decline; reclaim the prior stop/peak; return to a rising-floor structure; renewed efficient upward progress; and hysteretic "permission to be long" that survives a protective exit but expires on independent trend damage. Include a **no-reentry** reference.

Record the first entry, all exits/reentries and campaign lifecycle, including failed restarts, costs and eligible timestamps. Distinguish fresh entries from reentries; no retroactive buys or future high/trough triggers.

Show whether the longer 2020/2021 bull run can be captured with **tighter trailing exits and timely reentries** better than with one very wide stop. Do not tune specifically to that one rally. Compare multiple historical advances and the choppy/bear periods, especially 2022. If renewable logic only raises turnover or risk without economic benefit, say so.

---

## 7. Limited interaction studies: entry × exit × reentry, sizing *separately*

**The user wants serious joint optimization of credible combinations, not an arbitrary prohibition on combinations.** But exhaustive cross-products and retrospective champion chasing are unacceptable. Conduct the following layered design:

**A. Broad, fair screening:** Evaluate the mechanism-diverse entry panel under shared, default exit rules; evaluate the exit families on common entry signals. Reentry defaults, sizing Z0, and base costs stay fixed. Keep equivalent compute/parameter budgets or disclose differences and compare matched budgets. Record negative outcomes and rule out duplicate mechanisms. No family's later-window result may influence which configurations were considered at an earlier cutoff.

**B. Exit-family optimization:** Allocate meaningful independent search to each promising exit family on predefined entry controls, using a space-filling global design, restrained local refinement, and one-at-a-time and joint parameter-neighborhoods. Search centered around causal rule classes, not around a single historical high-P&L vector. Report best *training* and robust alternative configurations, not just winners.

**C. Bounded joint combination optimization:** Predeclare a **small, meaningful set** (e.g. 6–12 justified entry×exit pairings, adjustable *only by a training-only, logged predeclared trigger*). This set **must** fairly include E06+structural X3, E06+volatility X2, E06+protective/tighter trailing+rearm, at least one E05/E03 pairing, a genuinely renewable campaign design, and a simple control, unless objectively impossible; do not let the known good examples crowd out alternatives. For each pairing first fix simple reentry and Z0; only then compare a bounded number of reentry variants. **Any candidate may be eliminated for clear lack of events, broken causal logic, insolvency or unmanageable risk using training data only**, with a full log.

**D. Sizing overlay:** Test Z0 and selected Z1/Z2/Z3 policies on a *preselected, small subset* after the underlying entry/exit mechanism comparisons; **do not apply trimming to all variations** or let sizing silently rescue one favorite combination. A sizing rule is part of the strategy and needs its own training/selection and later-window evaluation. Where a sizing choice reduces gross exposure, normalize comparisons economically and report the lost upside.

**E. Stop and evaluate:** Keep a separate predeclared decision rubric that weighs chronological future-window profit after costs, actual drawdown and risk feasibility, exposure-adjusted economics, number of independent opportunities, parameter stability and 2022 failure. A strategy that earns the most in-sample but breaches $35k later is not a success. **Selecting on earlier window performance is model selection**, not independent confirmation.

**Optimization budget means predeclared computational effort, not a financial cap.** Audit workers, RAM and runtime, then freeze a generous staged budget before evaluation results. Suggested minimum scale: ≥1,024 diverse global parameter samples per optimized exit family × relevant entry control and ≥1,024–4,096 per selected joint family if justified; multiple starts/refinement and neighboring perturbations, with actual counts, duplicate rates, feasibility, run-time and estimated RAM. The exact per-family and total maximum must be selected **before results** based on verified runtime and computational feasibility. Don't simply copy the numbers blindly; the previous system handled tens of thousands of runs and multiple studies handled hundreds of thousands. Larger is fine when predeclared. The design may include **predeclared adaptive compute allocation based only on training-stage, outcome-free or training-only criteria**, e.g. evidence of distinct family coverage, bad Sobol quantization or insufficient evaluated families. Do not expand because a later chronological validation fold or unseen holdout disappoints.

Optimization starts and neighborhoods must be quantized consistently with existing TypeScript conventions (percent parameters to 0.1 percentage point, integer session/hold parameters integral unless the source explicitly defines otherwise). All random seeds fixed and tracked, full search archives retained with data/provenance hashes. Record the number of distinct tested mechanisms *and* configurations; don't multiply statistical evidence by counting correlated parameter samples as independent regimes.

---

## 8. One-at-a-time and JOINT neighborhood research: primary robustness deliverable

The user explicitly requests **both** one-parameter-at-a-time and simultaneous/joint perturbation studies, with profit and risk feasibility **separate**.

For each selected finalist and important ablation:

- One-at-a-time ±1 and ±2 grid steps (and optionally ±10% of the declared parameter range) with explicit limits; center, min, median, max, number of unique parameter vectors, and changes in entry/exit trade paths.
- At least **64 seeded joint perturbations** around the frozen center at a meaningful fixed percentage of the parameter ranges; for well-funded primary finalists consider 128+ independent **parameter draws** as feasible (not independent market observations). Report min, P10, P25, median, P75, P90 and max net, window DD (minute/daily), max peak exposure, time invested, and stop/reentry counts.
- **Separate outputs:** (i) neighborhood net-return distribution, (ii) fraction with net positive, (iii) fraction with DD ≤$35k, (iv) fraction satisfying both, (v) center-versus-neighbor profit retention, (vi) sensitivity to joint stops/exits/reentry interactions. Do not hide an unacceptable drawdown behind a positive median profit.
- Retain big winners without indiscriminately subtracting the best trade from net; however measure the share of profits from each major trend, how often neighbors capture those trends, and whether the rest of the rule loses money when the major winner is absent. No automatic assumption that right-tail concentration proves overfitting or proves an edge.
- Distinguish neighborhoods applied to **training-fitted** centers from post-selection sensitivity tests in the next fold; never repeatedly modify the center after inspecting the next fold.

The original E06/E05/E03 neighborhood statistics are historical references only, never selection targets or new validation.

---

## 9. Chronological design: enforce practical switching and guard the 2024–2026 holdouts

**Before any Stage 1b result is read, freeze the folds, decision rubric, candidate-generation and selection methodology, caps, baseline conventions, evidence claims and ordering.** Independent review that design first. Predeclare chronology in a machine-readable `EXPERIMENT_MATRIX.json` and `PROTOCOL.md`, with import-closure/code freezes and read barriers.

A reasonable starting point based on Stage 1 is:

| Fold | Training/selection data through | Next-year evaluation | Note |
|---|---|---|---|
| A | 2019-12-31 | 2020 | crash/rebound |
| B | 2020-12-31 | 2021 | sustained advance |
| C | 2021-12-31 | 2022 | bear/downtrend |
| D | 2022-12-30 | 2023-12-29 | calm upward recovery |

Use the actual trading calendar and lawful warm-up. **Do not select new Stage 1b mechanisms after seeing the eval-window results**, even though the broad historical outcomes are already known. The first-year full-history Stage 1b optimization over 2017–2023 is allowed **only as explicitly in-sample description**, not the model-selection method evaluated in A–D. If feasible, include a predeclared multi-year validation/selection exercise *within* the 2016–2023 limits, but keep **later assessment separate from intermediate selection** and call overlap for what it is. Four annual windows are a small set of dependent market regimes; disclose and avoid unsupported significance claims.

**Executable annual selector:** use Method 3's transition semantics as an **actual simulated account path** and compare to the original non-executable spliced diagnostic. At each boundary, selection depends solely on earlier bars and the bounded training research. Report separately:

- Full continuous standalone runs of each frozen family/parameter vector (descriptive, legitimate for within-strategy window increment).
- One **actual annual-selector strategy** with policies switched at the defined actionable boundary under chosen primary transition convention, preserving cash/equity across years, with no retroactively inherited position.
- A clearly labeled alternative switch treatment where economically meaningful.

Apply *the same predeclared selection protocol* to all folds; no manual after-the-fact winner switching. If a selected policy changes, any transition, sales, repurchase, interest and subsequent reentry must be simulated. Cache fast paths only with full-engine parity, and ensure synthetic/counterfactual policies do not share invalid prior states.

**Evidence windows locked:** 2024-01-02–2025-12-31 stays separately reserved for a **future** frozen user-authorized validation; 2026 remains a separately reserved **final holdout**, also requiring authorization. Never combine them. They have been examined in the broader Margin Trading program, so future results should be described as previously inspected at program level, though not evaluated for the new momentum candidates. Do not ask for permission mid-run just to rescue a result; finish the agreed Stage 1b deliverable, then report and stop.

---

## 10. Exact economics, execution and risk — non-negotiable parity

- Use canonical Alpaca SIP minute data, correct split adjustment and U.S. exchange sessions. Enforce no look-ahead: daily signals use completed close and earliest eligible next-session fill; minute signals use completed minute and next eligible trade; no assumed same-close fill. Validate stop-trigger timing, next opening gaps, missing bars, same-session exit/entry ordering and overnight moves. Do not synthesize a guaranteed stop-price fill after opening through the stop.
- Base price-only results follow the Stage 1 source convention; report dividends/distributions as a **separate sensitivity/ledger** if source supports it. If dividend booking is introduced into any modeled mechanism, do it symmetrically for candidate and passive controls, with correct ex-dates, not as an undisclosed boost to favored finalists.
- Keep D1 vs momentum stop semantics distinct. Stage 1's `TPL` resting stop (hard/trailing, highest *close*) and own-OUT may differ in activation and exit from D1's frozen VGT phenotype. Validate the actual D1 primary stop (quoted as ~7.3%) from source before making it an explicit reference; a 7.3% trailing stop is not an automatic momentum optimum. Keep incumbent D1 unchanged.
- Report both **absolute equity dollars** and percentage of the *initial $100,000*; if profits are retained and market value grows, additionally report drawdown as a percentage of *current equity*, peak position market value, loan-to-value ratio, and amount of gains surrendered. Mark-to-market equity declines must not be falsely called loss of original principal.
- Model fixed-share vs resized shares with financially correct cash/loan bookkeeping; no borrowed principal silently resetting after round trips or trims; interest based on actual borrowing through time. Show conservative stress for real-world margin calls/house-maintenance requirements as sensitivity **if accurately implementable**; otherwise prominently state omitted risks, especially overnight gap through stop, liquidity, forced liquidation and interest-rate changes.
- Benchmarks: Stage 1 `P*` and controls as frozen references, passive C-AL and C-ALR, 200d MA, Donchian and time-series momentum, plus simple fixed stop/reentry controls. Each comparator must be re-run with identical financing, exposure treatment and time windows for like-for-like claims. Show **buy-and-hold / always-long** as an opportunity-cost context, not automatically as a strategy required to beat at lower drawdown.
- Evaluate 2020, 2021, 2022, 2023 individually, full equity path and peak carried over the four-year executable policy; report longest underwater, worst lot, loss streak, number of restarts, benchmark-adjusted net, turnover, risk per capital-day, number of major uptrends captured, and the difference between mark-to-market gain given back and final trade profit.
- Run explicit trading-calendar tests for the March 2020 entry and January 2022 exit, and for 2022 new losing entries. Split P&L by lifetime trade, pre-year unrealized, evaluation-window increment, and new post-boundary positions.

---

## 11. Freeze, audit, parity, and honest evidence

**Before outcome-bearing runs**, obtain two independent read-only methodological reviews (separate agent contexts where supported). They must interrogate causal timing, the flawed original annual splice, loan/cash/trim equations, stop/gap semantics, the research matrix, budgets, decision rules, lookahead doors and multiple-testing bias. Preserve verbatim findings, dispositions and superseded protocols. Don't call self-review independent.

Freeze and hash `PROTOCOL.md`, the matrix, causal execution and sizing rules, input baselines, seeds, selection criteria, planned computation budgets and the entire relevant code/import closure **before** running outcome-bearing chronological evaluations. Every stage seals its evidence and verifies predecessor hashes. No outcome-changing post-freeze repair without a preserved original record, separately logged/hash-linked amendment, independent disposition and deterministic rerun; any result-informed changes are exploratory, not retroactively preregistered.

Tests must cover synthetic gaps, next-session fills, stop precedence and ratchets, switching on holidays, transfer/carry state, pending orders, same-day reentry, principal repayment on trim, cash/equity identities, future-bar access rejection, and no accidental 2024–2026 read. Independently authored slow/fast engine implementations should agree on representative trades, marks, daily/minute DD and interest to the cent where required. Reproduce Stage 1 anchors without rewriting them. Independently audit the full-year 2020→2022 appreciated lot and one alternate switching/sizing path.

After results, commission an independent **read-only code-and-evidence audit**, independently redoing selected accounting and verdict calculations and checking sealed outputs, Git changes, prohibited inputs and report claims. Preserve verbatim report and dispositions. Run targeted and full tests, `tsc`, lint, and previous-study verifiers **at their own commits/worktrees** if added `src/` files trigger historical code-closure checks. Document inherited filename-case failures and any remaining failures; never loosen an earlier freeze or claim false green status.

Every stage records SHA-256 data/code/record provenance, compiler/runtime, seeds, search counts, dropped duplicates, worker use, runtime, reruns and command logs. Keep enough hashed machine-readable data for another reviewer to recompute the verdict; large ignored archives require verified hashes and deterministic reconstruction. No raw SIP data, credentials or identifiable scratch directories in commits.

---

## 12. Deliverables and report contents

Under `research/study3-vgt-momentum-stage1b/`, provide `README.md`, frozen `PROTOCOL.md`, `EXPERIMENT_MATRIX.json`, source/hashes/analysis seals, copied `brief/BRIEF.md`, reviews, tests, full machine-readable trade/account ledgers, reproducible CLI and persistent `RESEARCH_RECOVERY.md`, plus these focused reports:

| Report | Mandatory contents |
|---|---|
| `RECOVERY_POLICY_MAIN_INTEGRATION.md` | Exact policy-only diff, `main` commit/push, whether fresh-session autoload was *actually* tested, or precise blocker |
| `EXECUTABLE_ANNUAL_SELECTION.md` | Original spliced vs executable path; switching policy, carried positions, cash, interest, annual/aggregate marks, 2020→2022 trace |
| `EXPOSURE_AND_POSITION_SIZING.md` | Fixed-share versus **optional** trimming, cash/loan reconciliation, appreciation giveback and upside sacrificed, gross-exposure benchmarks |
| `ENTRY_EXIT_ABLATIONS.md` | Shared entries/exits, controlled causal comparisons, negatives and reasons for exclusions |
| `EXIT_OPTIMIZATION.md` | Tight/D1-reference vs moderate/wide, volatility, floor, two-layer, profit retention, price/trend damage, financing, invented families; parameters and full search archive |
| `REENTRY_AND_CAMPAIGNS.md` | Stop/rearm triggers, all failed/successful restarts, missed upward movement, full campaigns and interest |
| `JOINT_COMBINATIONS.md` | All planned/tested pairing choices, budgets, predeclared gates, bounded interaction results; sizing tested separately |
| `NEIGHBORHOOD_AND_CHRONOLOGY.md` | OAT **and joint** perturbations with net and DD feasibility separate; actual switched-account folds, regime behavior, costs/gap/interest stress |
| `TRADE_LEDGER_AND_RISK.md` | Complete trades, timestamps/exit reasons, realized/unrealized decomposition, peak exposure and 2022 losses/giveback |
| `FINAL_COMPARISON_AND_RECOMMENDATION.md` | Formal verdict, comparisons to Stage 1 and controls, limits of inspected history, candidates (or none) for a *later* authorized test |
| `IMPLEMENTATION_AUDIT.md` | Parity, verification, independent reviews, protected paths, limitations, exact branch/commit evidence |

Separate trades/campaigns, in-sample/folds, executable accounts/diagnostics, profit/giveback, minute/daily DD, gross exposure, financing, and both neighborhood methods with risk feasibility. Generate tables from sealed artifacts.

---

## 13. Verdict and later-stage user gate

Freeze falsifiable criteria **before outcomes**, addressing: (a) real executability and accounting identities, (b) profitability **after 11% financing and friction**, (c) each later window and chained minute DD versus **$35,000** research reference, (d) adequate independent trade/regime evidence, (e) market-value exposure-adjusted and passive/trend controls, (f) neighborhood profit and risk feasibility, and (g) significant winner/giveback dependence. Labels may be **invalid, risk-incompatible, insufficient evidence, no demonstrated edge, or historically promising but unvalidated**. Prefer a negative conclusion to changing gates in hindsight. A central in-sample E06 improvement is never independent validation.

**Stop at Stage 1b.** Future tests require explicit new authorization and their own frozen protocols: (1) **2024–2025 validation**, then **separate 2026 final holdout**—do not combine, and acknowledge the wider project's historical familiarity; (2) **Stage 2**, existing registered VGT D1 `primary` **unchanged** plus frozen momentum in the shared $100k simulator; (3) **Stage 3**, frozen B4 plus momentum; (4) **Stage 4**, frozen B5 plus momentum. No D1/B4/B5 reoptimization or portfolio promotion in this work.

---

## 14. Git completion, autonomy and evidence discipline

Stage 1b goes on a new branch **from verified Stage 1**, never into `main`. After the **separate, first** recovery-policy-only integration to `main`, protect earlier studies, config, data, incumbents, registries, frozen closures and user work. Stage 1b edits only its own research/source folders plus a narrowly justified new CLI script, if needed. No force pushes, no research merges, no automatic PR/tag and no user-file cleanup. Verify all diffs and retained baselines, have an independent reviewer inspect the final Git scope, commit the audited Stage 1b and push it to `origin`; verify the full SHA remotely (`git ls-remote`). If main protection blocks policy integration, disclose and respect it; do not bypass.

The user wants **substantial creative exploration beyond ideas they singled out**, but not open-ended tuning to known history. Separate invention from empirical ranking, retain unfashionable but distinct simple controls, make computational coverage generous and preregistered, and log all tested candidates. Stop only for a real safety/chronology/Git blocker; otherwise execute the complete authorized work, including truthful negative findings, without repeated approval questions. Automatic compaction is allowed; maintain checkpoints and recover from files, seals, Git and active jobs. No session summary replaces a research artifact.

---

## 15. FINAL CHECKLIST — verify every item before claiming completion

- [ ] Entire brief including this heading read and saved with SHA-256; actual branch/worktree/user changes inspected.
- [ ] **First:** only permanent recovery policy integrated, checked and remote-verified on `main`, or protected-branch blocker truthfully documented; no research merged there.
- [ ] Stage 1b created from complete Stage 1 remote head; Stage 1 frozen artifacts untouched; task-local checkpoint maintained across automatic compaction.
- [ ] Independent pre-freeze reviews; sealed protocol, budgets, source/engine, selection and chronological doors; **no 2024–2026 momentum-candidate bars**.
- [ ] Original spliced outcome reconciled; **executable** annual-switching account evaluated; appreciated 2020–2022 E04 lot correctly explained as a large lifetime winner with a 2022 mark giveback.
- [ ] Full self-financing fixed-share versus **optional** trim experiment, plus rigorous exposure and borrowing-cost accounting.
- [ ] Substantial independent exit-family optimization, comparative entry/exit ablations, tight/trailing versus structural stops, reusable reentry/campaigns, and **bounded but serious** joint pairing experiments.
- [ ] Both one-at-a-time **and joint** seeded neighborhoods; profit and $35k DD feasibility separate; costs, gaps, interest, winner retention and time idle.
- [ ] Actual chronological selector, independent audit/parity, tests, complete reports, hash manifests, reproducible ledgers and no forbidden changes.
- [ ] Stage 1b committed, pushed and remote HEAD verified; disclose exact main-policy and research SHAs, outstanding failures and evidence limits.
- [ ] **No Stage 2–4 runs, no 2024–2026 tests or candidate promotion. Stop for user review.**

**Complete this Stage 1b assignment thoroughly. A negative result is a valid result; a historically attractive but unvalidated combination is not a reason to loosen the controls.**
