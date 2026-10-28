# Claude Code — Study 3 of 3: VGT momentum from first principles — deep standalone research FIRST

**Execution brief: read completely, then execute the authorized research, implementation, independent reviews, reports, verification, commit and push.** Use a fresh Claude Code session with the strongest available reasoning setting. A valid outcome is **no credible standalone momentum strategy**.

**Research identifier:** `study3-vgt-independent-momentum-v1`  
**Suggested new branch:** `research/study3-vgt-momentum-first-principles`  
**Suggested research folder:** `research/study3-vgt-momentum/`  
**Suggested source folder:** `src/study3-vgt-momentum/`  
**Scope of THIS authorized execution:** **STAGE 1 ONLY: intensive, independent, standalone VGT momentum mechanism discovery, implementation, optimization and robustness research.** Complete Stage 1 thoroughly; then **STOP AT THE EXPLICIT USER REVIEW GATE**. Do not start Stage 2, 3 or 4 in this session merely because Stage 1 is complete. A later approval/prompt will authorize combined-capital experiments.

## 0. Read this in full; establish authority and preserve research discipline

Start by verifying that you can access and read this entire brief, including the last section, rather than relying on an attachment preview or a truncated conversation. Save an exact copy and SHA-256 hash under the new study's `brief/` directory. If this document is attached in Claude rather than present on disk, save its complete content locally before undertaking research. Confirm you actually have the complete file (not a truncated extract) by inspecting the final heading.

Inspect `git status`, branch, `HEAD`, remotes, worktrees, existing `CLAUDE.md`, the active recovery policy, repository conventions, canonical market-data conventions and existing test failures. Read actual source files and sealed reports, not just summaries in this brief. A user may have fixed some filename-case test references in a separate commit; preserve their work.

**Hard separation of studies and their consequences:**

1. **Study 1 — COMPLETE.** Broader 61-ETF D1 phenotype libraries (K = 8/16/32/64), 413,280 additional search evaluations, expanding and rolling chronological folds. The old best-trade penalty did exclude right-tail families, but wider libraries did not demonstrate better next-fold performance; the simple validation-max selection (A4) was worse.
2. **Study 2 — COMPLETE.** Actual 61-ETF D1 signal-timing/capital-occupancy research. No economically useful addition survived the 18 predefined full-pool tests. The strongest profitable dip signals largely arrived during common crises and when B5's shared margin slot was already occupied. Of 59 idle-clean nonmember common-rule signals against B5, aggregate standalone P&L was about **−$52,477**. In its 2022–2023 matched replay, B5 gained roughly **+$170,997**, had **zero funded falling-knife episodes**, a worst closed lot of about **−$5,200** and a fixed-slot minute drawdown of roughly **$17,269**.
3. **Study 3 — THIS ASSIGNMENT, Stage 1.** Develop **genuinely different** long momentum/trend-participation mechanisms for **VGT alone**. Focus on capturing sustained advances that deep-dip D1 often misses, including the market behavior illustrated by the 2023–2024 VGT rally. The objective is not to alter, replace, or jointly optimize D1.

**Read the actual Study 1 and 2 folders**, particularly each `PROTOCOL.md`, `FINAL_COMPARISON_AND_RECOMMENDATION.md`, implementation/audit reports, prior mechanism hypotheses, engine assumptions, and source/selection-bias reports. Confirm source `HEAD` and Study 2 remote commit. Establish any discrepancy between repository reality and this brief in `SOURCE_AUDIT.md` without silently overwriting files or inventing facts.

## 1. The user's objective and non-negotiable research focus

The user wants **A LOT of serious effort directed at standalone VGT momentum before any pairing with D1, B4, or B5**. In this assignment, do not implement a shared-pool momentum book, do not run a VGT D1 + momentum simulation, and do not run B4/B5 + momentum. There will be three later, separately authorized comparisons **after** Stage 1 is reviewed:

- **Stage 2, deferred:** frozen VGT D1 + frozen VGT momentum, two books, one actual shared capital slot;
- **Stage 3, deferred:** frozen B4 + frozen VGT momentum in the canonical multi-ETF simulator;
- **Stage 4, deferred:** frozen B5 + frozen VGT momentum in the same simulator.

The future comparisons must measure actual chronological interaction (idle profit, funded vs refused entries, displaced trades, cascading changes, interest, drawdown). **Those comparisons are not authorized now, and their performance must not influence Stage 1's design or phenotype selection.**

**Primary Stage 1 question:** Can a simple, executable long strategy recognize meaningful ongoing upward movement in VGT, enter without requiring an earlier deep decline, stay in profitable trends or intelligently renew positions after exits, and control downside and financing drag across different regimes?

The user expects **independent invention**, not merely applying RSI/MACD or maximizing an off-the-shelf moving-average crossover. Challenge foundational assumptions. Generate several causally different mechanisms *before* critical evaluation, and remain open to an elegant mechanism not listed in this brief. The suggested mechanisms below are **hypotheses** and starting points, not a mandated winner or a bounded menu of all allowable ideas.

### Fundamental mechanism diagnosis (write this BEFORE proposing rules)

Explain in `FIRST_PRINCIPLES_AND_HYPOTHESES.md` the actual causes of D1's missed momentum opportunity:

- It requires a sufficiently large previous drawdown to arm; long advances may never qualify.
- It distinguishes dip recovery from later bull-market continuation; otherwise valuable follow-on advances remain inaccessible.
- A profitable protective exit may not allow timely reentry during a renewed rise.
- Trailing-stop tightness trades profit retention against premature exits and repeated whipsaw.
- Holding margin costs ~11% annual simple interest, so time invested must earn its keep.
- An apparent momentum signal may be a temporary bear-market bounce; waiting for confirmation may miss early returns.
- A backtested high return or low drawdown can be explained by low actual exposure, lucky selection, market-regime dependence or unrealistic execution.

Explicitly challenge assumptions such as **“a valid entry needs a deep dip,” “the original entry rule must also govern reentry,” “the market's turn must be forecast,” “each trade should last until one fixed trailing stop triggers,” and “100% of the borrowed slot must be committed instantly.”** Do not turn the new strategy into D1 with its 21.6% dip threshold replaced by 3%.

### Research objectives (in priority order)

1. Plausible **after-interest**, **after-friction** and gap/slippage-stressed net economic value in *ordinary upward trends* and recovery/continuation sequences, not only deep-dip episodes.
2. Reduce unnecessary exposure and harmful stop/reentry churn in sideways and falling markets.
3. Control downside: research reference **maximum minute-sampled drawdown ≤ $35,000 per $100,000 fixed notional**; record daily and intratrade excursions. This is a *historical screening constraint*, not a guaranteed future stop or margin safety mechanism.
4. Robustness across independent chronological slices and nearby parameter values, not a single optimum chosen after seeing the future.
5. Simple reproducible rules with few meaningful parameters, explainable causal decision points and auditable fills.
6. Eventual compatibility with an unmodified D1 margin allocator — **a future objective, not today's training target**.

No strategy must be chosen if all fail.

## 2. Permanent project-wide Claude Code context recovery policy — DO FIRST

The user has **explicitly requested that context recovery become a permanent practice for future prompts**, not something the user must remember to request. The new session may undergo automatic context compaction one or more times. **Do not pause at 80% to request manual compaction**; preserve project state continuously and resume after automatic compaction.

Before planning experiments:

1. Inspect the repository root `CLAUDE.md`, `.claude/CLAUDE.md`, any `AGENTS.md`, `.claude/rules`, and existing `docs/claude/context-recovery.md` or equivalent; avoid contradictory rules, redundant imports and loss of existing content. Respect any existing instruction hierarchy. There may already be persistent recovery instructions from an earlier assignment; improve them minimally rather than creating a competing policy.
2. Ensure **a small, durable, committed project-level `CLAUDE.md`** (or the already loaded equivalent) automatically includes the recovery procedure. The documented Claude Code relative import syntax is `@docs/claude/context-recovery.md` from a root `CLAUDE.md`. Check the installed Claude Code version; verify this syntax or its documented equivalent. Imports are resolved relative to their containing memory file.
3. Create/update a **concise** `docs/claude/context-recovery.md` covering **all substantial future repo tasks**, not only momentum research. Keep it short enough to load every session, concrete, safe and compatible with existing policy. It must direct Claude to:
   - At the beginning of any new session/task, identify relevant unfinished task checkpoints, verify the active branch/worktree and task authorization, and read the relevant checkpoint and primary protocol before doing work.
   - For tasks likely to fill context or take many tool calls, create a task-local checkpoint at inception, and refresh at every meaningful milestone/decision/experiment batch and before anticipated compaction when feasible.
   - Store hypotheses, rejected paths with reasons, frozen protocol and hashes, seed/parameter budgets, candidate IDs, executed commands, result file paths, execution/test status, processes/PIDs and safe next operations; do not store secret values.
   - Allow **automatic compaction**; never request that the user manually compact merely because context seems full. Do not pretend the model can force `/compact` if the current interface cannot.
   - On resumption or after compaction, **reread the checkpoint and authoritative files**, verify hashes/locks/Git and active processes, and reconcile any discrepancies before continuing; do not rerun expensive completed jobs or duplicate/overwrite sealed experiments.
   - Fail closed if an unresolved data-door, methodology, live-process or authorization ambiguity might invalidate the work. Ask for a user decision only when genuinely necessary, not as routine checkpointing.
   - Archive a final task checkpoint indicating COMPLETE/INCOMPLETE, audited deliverables and follow-up gate; clearly distinguish research notes from immutable results.
4. For this study create `research/study3-vgt-momentum/RESEARCH_RECOVERY.md` at the beginning. The permanent policy must be general enough to apply to all future codebase work.
5. If supported and safe, inspect **`SessionStart`, `PreCompact`, `PostCompact`** hooks as **optional** lightweight aids (e.g., notify Claude of a checkpoint path). Do not add blocking, expensive, speculative or automatic-destructive hooks; never claim a hook can itself perform model reasoning or update a checkpoint without a process to do so.
6. Demonstrate that the project memory/import paths exist and are parseable; document how to confirm they load in **a fresh session**, using `/context` or the installed tool's equivalent. Do not claim to have tested a genuinely new session unless one was actually started. Confirm that the policy will only persist automatically in branches/worktrees containing the commit; **do not merge into development/main** without explicit authorization. In the final report give the precise minimal integration step needed for future long-lived branches to inherit it.
7. Include these files in the Stage 1 commit/push with the study, with an explicit, separately reviewable diff. Do not alter any other global Claude settings or user-private config without explicit permission.

**The Study 3 task-specific checkpoint** must additionally preserve the complete mechanism catalog, current phase, experimental caps and selection seals, candidates' quantitative results, accepted/rejected mechanisms with reasoning, frozen window boundaries, active runs, independent reviewer dispositions, changes to the existing repo, and the fact that combined studies remain unauthorized.

## 3. Branch, read-only protections, baseline verification and research isolation

- Start from a verified commit containing the completed Study 2 branch and any user-approved intervening changes (including test-case correction, if already applied). Do not assume a commit SHA from this document overrides the actual branch. Before changing anything, record `git status`, `HEAD`, upstream, recent history, and baseline verifiers.
- Create a **new** branch `research/study3-vgt-momentum-first-principles` (or, if it exists, verify that it is the intended work branch and avoid overwriting it). A clean dedicated worktree is acceptable; preserve unrelated untracked files such as Apple `._*` files rather than adding or deleting them.
- May add study-local code, tests, documentation, one minimal npm script, plus the specifically authorized project-level `CLAUDE.md`/recovery-policy files. Preserve `config/`, canonical `data/`, `data/partitions.json`, prior `research/` sealed records, D1 execution semantics, B4/B5 pools and registered phenotypes, prior code freezes, prospective tracking protocol and registry. No changes to existing algorithms, optimization outputs, dividends, priority, strategy deployment or broker integrations.
- If a read-only prior-study verifier rewrites its own tracked output, run it in a disposable clean worktree at **its own commit** or document a read-only method; do not tamper with frozen audit trails. Do not loosen a historical verifier just to make a later branch pass.
- No broker connections, order placement, new external market-data downloads, secrets or `.env` reads. Use audited local minute data and repository metadata only. No leveraged/inverse ETFs, options, BTC, additional ETFs, or live trading. **VGT alone for this study.**
- **Baseline tests:** run before and after. Historical `allin-original.ts` versus `allIn-original.ts` filename-case failures are a known independent maintenance issue. Preserve any user-requested fixes; do not silently claim study-introduced regression or refactor unrelated suites. Distinguish baseline failures, already-fixed failures, and new regressions with exact counts and paths.
- Reproduce VGT `primary` standalone and the relevant execution/cost/drawdown anchors as **read-only context**. Do not copy or edit D1 to implement momentum; build new logic in a separate module with parity checks where interfaces overlap.
-

## 4. Historical data boundaries and actual statistical evidence

This is critical. Previous studies inspected much of 2016–2026. You cannot restore statistical independence with a new protocol that is now written knowing the 2023–2024 rally.

**Stage 1 authorized candidate research data:** January 4, 2016 through **December 29, 2023**, subject to any **stricter** existing source/metadata rules. Do not read bars after that date for momentum candidate design, optimization, evaluation, charting, diagnostics or outcome labels in this assignment. In particular:

- **2024–2025 are not merged with final 2026.** They remain a separate later-period validation/holdout resource for potential future explicitly authorized use.
- **2026 final** is not opened for newly developed momentum candidates; the prospective B4/B5 freeze beginning after October 13, 2026 remains completely untouched.
- Incumbents' already-published later-date summary figures may be *cited as historical context* if needed, but do not convert them into momentum candidate targets or use their later bars for optimization.
- The user-highlighted **2023–2024 ~80% rally** is a preknown **motivating example**, not new independent validation or a legitimate exact target in this Stage 1. Within authorized data, analyze the **2023 segment only** as a descriptive market environment and never use an unseen 2024 price path. Explicitly identify what is and is not measurable yet; do not quietly weaken the boundary because 2024 looks attractive.
- If the actual repository has stricter studies/doors that forbid use of certain inherited candidate vectors, honor those. Study 3 uses **new original momentum candidate IDs** and a new documented research protocol, never relabels a D1 vector to evade restrictions.
- No attempt to claim true out-of-sample performance from 2016–2023: all folds were historically inspected and the research question was designed after seeing their broad results. Call the tests **retrospective chronology-respecting method evaluation**. Truly independent validation requires new untouched market observations or appropriately authorized, previously unexamined data.

Define expanding **chronological** folds *before any momentum results are observed*. A feasible example to reconcile with source calendars, eligible warm-up and minimum sample lengths:

| Fold | Fit/development history | Next evaluation window | Purpose |
|---|---|---|---|
| A | 2016-01-04 → 2019-12-31 | 2020-01-02 → 2020-12-31 | Abrupt shock/recovery |
| B | 2016-01-04 → 2020-12-31 | 2021-01-04 → 2021-12-31 | Sustained continuation / choppy periods |
| C | 2016-01-04 → 2021-12-31 | 2022-01-03 → 2022-12-30 | Extended decline / false recoveries |
| D | 2016-01-04 → 2022-12-30 | 2023-01-03 → 2023-12-29 | New upward movement, D1 inactivity |

These are *illustrative windows to predeclare and then freeze*, not permission to mutate fold dates after looking at trade outcomes. If fewer folds give a more valid independent-event count, document that choice and retain the negative regime. Use exact timestamp/session calendars and warm-up; preserve trade state at boundaries. Do not conflate cumulative-from-2016 net with incremental per-window P&L. At each cutoff, candidate generation and selection must use only preceding data; a continuous replay can carry a legitimately open lot into the evaluation window without treating it as a new trade. Label windows with no meaningful trades as **insufficient evidence**, not zero-risk success.

Avoid optimizing a global phenotype on 2016–2023 and then calling its 2020, 2021, 2022 or 2023 profits validation. Evaluate the **selection procedure**, with candidate generation and model choice repeated in each prior-data-only fold where feasible. A separate 2016–2023 full-history exploratory reference is allowed, but never labeled out-of-sample or given equal evidentiary weight.

## 5. Creative research design — DIVERGENT INVENTION BEFORE CRITICISM

Treat this phase as substantial intellectual research. Create a **causal hypothesis inventory** before any optimization. Do not use future bars, hindsight extrema or later return labels to generate signals.

**Required creative workflow:**

**5A — Independent ideation (no ranking yet):** In writing, formulate **at least 12 genuinely different** long entry/holding/reentry mechanisms, including several not listed below that you invent from first principles. Give each a precise economic/behavioral hypothesis, causal signal, state transitions and falsifiable failure case. Keep this separate from the skeptical review. Include simple mechanisms even if unconventional; don't reward complexity.

**5B — Critique and grouping (only after 5A):** Independently assess causal plausibility, parameter count, sensitivity to one-minute noise, financing burden, reaction to bear-market rallies, ability to enter persistent uptrends, risk/stop semantics and testability. Group mathematically near-equivalent variants so they are not counted as distinct discoveries.

**5C — Mechanism selection (predeclared before results):** Select a **broad, behaviorally different initial prototype panel**, aiming for at least **six distinct entry families** if implementation is feasible, plus representative entry/exit controls. Explain every exclusion with objective engineering or causal reasoning. Do not select only popular technical indicators. Specify an explicit experiment budget and compute feasibility before running outcome-bearing tests. If you cannot faithfully implement six families, report the blocker rather than invent results.

### Starter mechanisms A–K (these are seeds, NOT the full list)

**A. Upward trailing buy plus immediate protective/trailing exit.** Track an eligible prior low and arm after demonstrated upward rebound *without a deep-peak drawdown prerequisite*. Define the low causally (known as of decision time), persistence to suppress one-minute noise, decision/fill minute, stop activation and reentry. Contrast with a genuine *upward breakout trailing buy* rather than assuming “trailing buy” has one meaning. Assess what price path triggers each.

**B. Shallow-pullback continuation.** First recognize an established advance; buy when a modest pullback is followed by renewed upward progress. The prior uptrend prerequisite distinguishes it from merely reducing D1's dip size.

**C. Rising floor / improving downside structure.** Track causally observed higher rolling lows or strengthening support, enter/hold while the floor advances, exit on structural invalidation plus hard protection.

**D. Default-long with defensive absence.** Evaluate a deliberately simple continuous-exposure reference with a transparent deterioration exit and return-entry rule. Include 11% interest; do not recommend continuous leverage merely because equities rose historically.

**E. Price acceptance / reclaim after breakout.** A breakout is not the signal by itself: require persistence beyond a reference level or constructive retest/reclaim, with no future confirmation leaks.

**F. Directional efficiency.** Consider upward progress relative to total absolute path length over a past-only window. Compare smooth versus noisy rises; exclude cases that produce high efficiency solely due to low volatility and no useful positive drift.

**G. Expansion after consolidation.** Identify a causally established bounded range/compression and a fresh upward expansion; distinguish true persistence from a one-bar spike.

**H. Progressive capital commitment.** Investigate 25%→50%→100% or another simple rule, but report the exact borrowed notional, path of exposure, interest, dollars and capital-normalized outcomes. Do not score it as lower-risk merely because it stays underinvested; use matched capital or risk budgets.

**I. Progress/time economics exit.** Exit a financed position that fails to make enough upward progress over a measured time, independently of price-stop exit. Compare a fixed time stop, stall stop and no progress exit; avoid using future expected returns in the signal.

**J. Hysteretic state machine.** Separate evidence required to **enter**, **stay**, **exit**; keep the state count small, stable and causal, with transition memory, and compare against a single-threshold design to quantify churn reduction.

**K. Renewable trend campaign / independent rearming.** A protective trailing exit must not permanently exclude the next leg. Reentry is a separate causal question: reclaim prior peak, recover a fraction of observed pullback, higher-floor renewal, or renewed efficient progress. Evaluate *entire multi-trade campaigns*, including failed restarts and financing/turnover, not cherry-picked winners. This is a high-priority hypothesis because a trend may last through several protective exits.

### Require genuinely original alternatives beyond A–K

Discover additional simple first-principles hypotheses, potentially involving (not prescriptively): asymmetric evidence accumulation, controlled “probationary” entries with cheap invalidation, trend maturity versus exhaustion, rate-of-upward-progress relative to borrowing cost, adaptive decision frequency, transparent mechanism switches, or a durable continuation permission that expires only after explicit trend damage. Ensure each idea has a distinct cause/effect model, not an indicator relabel.

**Important challenge:** Is it better to improve the *first* long entry, or instead improve **reentry after an appropriate exit**? Do experiments that can distinguish those two effects. A useful negative result is discovering that an entry is fine but exits/rearming destroy returns, or that adding hysteresis just delays losses. Do not preordain K as the winner.

## 6. Exit mechanism research must be independent and substantial

A trend strategy can be defeated by poor exits even if its entries are useful. The user explicitly requests creative work on exits as well as entries. In `EXIT_MECHANISM_STUDY.md` define and evaluate at least these distinct families when implementable:

1. Immediate entry-time protective hard stop + conventional fixed-percentage trailing exit.
2. Volatility-scaled trailing distance with explicit upper/lower bounds; demonstrate stop behavior during crisis volatility expansion.
3. Structural exit based on violated rising floor or confirmed trend damage, **combined with separate emergency loss protection**.
4. Two-layer exit: always-active catastrophic protection versus slower normal trend exit.
5. Profit-retention or profit-stage trailing schedule; assess whether it merely locks out large right-tail wins.
6. Time-/progress-based financing drag exit versus simpler maximum hold and indefinite hold.
7. Renewable campaign exit/reentry whose rearming condition differs from the initial entry, including explicit cool-down alternatives and no forced waiting when a new valid opportunity appears.
8. Combined *price damage* versus *trend damage* rule with bounded parameter count and a measurable incremental contribution beyond each alone.

**Do not make an unconditional trailing stop on D1.** These are rules for the **new** momentum mechanism only. The user had previously rejected experimenting with unconditional trailing stops *as modifications to D1*; that does not preclude a sensible always-active stop for a distinct margin-funded momentum strategy.

Separate entry and exit quality experimentally:

- Use one or two predeclared **common exits** with multiple candidate entries and report their differences.
- Use one or two predeclared **common entries** with multiple candidate exits, isolating exit effects.
- Use nested/limited **entry×exit pairings** only after independent effects are understood. Never blindly optimize every combination of 12 entries × 8 exits × thousands of parameters and call the resulting best backtest credible.
- For any claimed value of renewable trend reentry, compare complete campaign net (including losing cycles) against a no-reentry variant, a fixed-cooldown variant and a simple reentry control; report turnover, missed uptrend segments, elapsed exposure and financing.
- Use **separate stop and reentry reference state**, updated only from observable prices. Document what survives exit and what resets; no future pivot knowledge, no retroactive purchase at historical highs/lows.

All exits are simulated with realistic chronology: next eligible execution for decision-based exits, conservative stop fills where appropriate, explicit gap/overnight behavior, orders only from completed observations and no impossible same-minute low/high ordering. Price-contingent stop assumptions must distinguish stop *trigger* from achievable fill.

## 7. A substantial but bounded Stage 1 experimental program

**Do not rush into parameter optimization.** Work through the following audited stages with explicit stage records, results and checkpoint updates.

### Phase M0 — Baselines, data QA and execution parity

- Verify VGT minute bars, splits/dividends, session calendar, missing bars and timestamps.
- Document price-only versus total-return accounting; apply identical dividend conventions to controls and candidates.
- Reproduce authorized VGT D1 anchor with matching financing and friction; add idle and always-long borrowed-slot controls. These are benchmarks, not investment recommendations.
- Implement a causal harness using canonical data, calendar, financing and execution components; if a separate engine is necessary, verify common primitives and selected full trade traces against independent references.
- Preserve exact minute/daily DD and liquidation-equivalent open-lot financing. Finalists require full-minute execution, not approximations.

### Phase M1 — Ideation and simple prototypes

- Produce 5A→5C outputs, frozen mechanism IDs and parameter definitions.
- Implement the predeclared diverse entry prototype panel at simple, *nonoptimized* settings and common exits; log every entry/exit, trade path and missed-signal attribution.
- Add representative conventional controls (e.g., a simple trend filter or breakout); keep them clearly labeled as controls, not assumed best solutions.
- Preserve poor and unsuccessful mechanism results in the report. Do not retroactively omit weak families from the denominator of “mechanisms investigated.”
- Limit escalation to expensive optimization using **predeclared, training-side** qualitative/quantitative gates, including minimum number of independent trend opportunities, loss controls and plausible net after 11% interest.

### Phase M2 — Isolated entry-versus-exit and reentry ablations

- With common exits, measure entry quality, trend capture, whipsaws and adverse excursions; ex-post episode labels are diagnostics only.
- With common entries, isolate each exit's effect under identical costs/fills.
- Compare first entry versus reentry: campaigns, whipsaws, net per campaign, missed post-stop gains and recovery without another deep dip.
- Measure progress per occupied day after actual financing, including stalls.
- Never trade using ex-post highs, lows or episode labels.

### Phase M3 — Controlled numerical search, no winner's curse by brute force

- Predeclare the shortlisted mechanism *families*, a capped parameter count/box and a deterministic search budget **before reading their optimized validation outcomes**. Favor a small set of coherent rules. Quantize percentage parameters consistently to **one decimal percentage point** unless the actual strategy definition needs a justified different precision; whole-day/session fields are integers.
- Use broad space-filling exploration (Sobol or another reproducible design) before local refinement; **do not** launch NSGA-II by default merely because the earlier D1 optimizer used it. Explain the search method, seeds, evaluation budget per mechanism and stop conditions.
- Recommended planning envelope (adjust only with a documented pre-outcome compute feasibility audit): an initial bounded coverage budget on the order of **hundreds to a few thousand** configs per short-listed family, with a **small, separately budgeted** local refinement that preserves several trade-path-distinct possibilities. Make explicit the total across families/folds and enforce caps. Avoid endless search escalation when no candidate meets feasibility.
- Store candidate grids, seeds, family grouping, training net, minute/daily DD, worst lot, MAE/MFE, gross versus interest, friction, turnover, exposure, entry/reentry and exit mixes, and reasons for rejected candidates. Keep full candidate archives (compressed if needed) with a reproducible manifest; do not keep only the top ten results.
- Design **a priori** multiple-objective trade-off reporting (net / drawdown / occupancy / profitability consistency / campaign capture) rather than tuning a composite score after seeing later folds. Never select solely by peak historical net, never automatically subtract the largest profitable trade, and never conceal dependence on one unusual event; show profit-concentration diagnostics without treating concentration as proof of overfitting.
- Preserve a small *diverse* set of research-only candidates but heed Study 1: **more phenotype choice does not itself predict future quality**. Do not use later-fold best profitability to pick retrospectively from a huge library.

### Phase M4 — Chronological protocol replay and decision assessment

- Run the predeclared **expanding training / next-window** comparison described in Section 4. The selection procedure and its parameter budget must use only data preceding each evaluation window, with strict code-enforced data doors and selection seals.
- Identify how chosen mechanisms react separately in: 2018 drawdown/recovery, COVID crash and rebound, 2021 behavior, 2022 persistent decline/false recoveries, and the **2023 upward market**. These episodes can be used as descriptive stress diagnostics, but their histories are known and are not independent proof. Where an episode straddles a fold boundary, preserve causal trade state.
- Include a **missed-opportunity ledger**: independent hindsight trend families, the fraction of each trend captured by legitimate causal entries, segments the strategy remained idle, how far after a trend start the first entry occurred, lost appreciation after stops, and total profit after costs. Avoid measuring opportunity as simple perfect-foresight buy-low/sell-high profit alone; clearly label hindsight upper bounds.
- Compare each mechanism's window results with predetermined common controls and the zero-trade baseline, using correct matched-slot metrics and independent-market-episode/cluster caution. Report negative windows as prominently as profitable ones.
- If procedure quality reverses across folds, say it is regime dependent or unproven; do not pick the one that wins in 2023 simply because the 2023 rally motivated the study.

### Phase M5 — Full-minute robustness, sensitivity and execution stress

For a *predeclared bounded finalist set*, run full minute-level path-accurate simulation, not only daily proxies. Include:

- Baseline 11% simple interest and 5bps *per side* effective friction; rerun at 0/2/5/10 bps (actual trade decisions may change), plus rate sensitivity at 8%, 11%, 14% when meaningful. State whether each setting is exploratory or part of the frozen decision rule.
- Parameter **one-at-a-time** and **joint neighborhood** perturbations, predeclared draws/seeds and stability metrics. Report median, quartiles, downside and fraction staying under $35k minute DD. Do not turn perturbation draws into new optimized finalists.
- Stop-fill and **overnight gap** sensitivity. Assume stops may execute worse than their trigger; if true bid/ask data are unavailable, use labeled synthetic stress with no fabricated measured spread claims.
- Missed execution / next-minute assumptions, missing-bar sensitivities, holiday/calendar correctness, 1-minute lookahead checks, no action based on a bar's high/low before observable, no retroactive intra-minute sequencing.
- Largest winning/losing lot, maximum adverse/favorable excursion, consecutive losses, largest campaign loss, recovery time, holding distribution, stop vs progress exit composition, periods underwater, percent of time margin-funded, interest and friction components.
- At least one **negative-control** or placebo sanity check suitable to this mechanism without breaking market chronology (e.g., change signs or randomized entry opportunity under a documented constrained baseline). Placebo must not be treated as a probabilistic significance claim unless statistically justified.
- Full long-horizon **standalone equity and minute/daily drawdown**; candidate fails the user's $35k screening target if exceeded, even if its 2023 profits are attractive. Portfolio 30% preferred / 35% conditional ceiling is future combined analysis, not falsely inferred from standalone DD.

### Phase M6 — Independent review, conclusive reporting, then STOP

- Run at least a **methodology reviewer** before protocol freeze and a genuinely separate **final code/evidence reviewer** after results. If a separate reviewer agent is unavailable, disclose the limitation and perform a clearly segregated audit pass rather than inventing a reviewer. Preserve full reviewer findings and written dispositions. Reviews must look for selection-leakage, result-based changes to hypothesis list, incorrect fill prices, stop/reentry bugs, stale checkpoint claims, improper DD accounting and misleading concentration statistics.
- Freeze any result-defining methodology, code selection and classification rules **before revealing corresponding outcomes**. Version hash manifests; amendments after result inspection must be append-only, motivated and clearly separated from primary decisions. Do not silently rewrite an unfavorable outcome or alter retroactively a passed protocol.
- Produce the report set in Section 10, verify code and audit artifacts, commit and push **Stage 1 only**. Finish with an explicit question for the user to authorize later combined-pool studies. Do not begin them automatically.

## 8. Fair benchmarks and mandatory quantitative accounting

**Standalone unit:** a fixed **$100,000 maximum borrowed slot**, one long VGT position at a time (or documented gradual scale-in totaling no more than the slot), no reinvested/compounded profits inside this fixed-slot benchmark; do not borrow against proceeds to exceed the notional. Interest on actual daily borrowed notional at baseline 11% simple per annum. Count 5 bps per side friction and liquidation-equivalent unrealized net at horizon end. If partial scale-in/out is allowed, accrue financing and mark exposure per fill, not on maximum theoretical slot at all times.

**Required comparators**, all clearly separated:

- No momentum strategy / margin stays idle (zero borrowed P&L; meaningful benchmark given 11% interest).
- A simple continuously leveraged VGT reference (usually riskier and more expensive; display, don't optimize it).
- Conventional simple momentum/trend baselines, selected *before* outcome inspection as controls.
- Original registered standalone VGT D1 primary (for contextual **comparison only**, not a joint allocator or a training signal); report matched calendar and accounting conventions and disclose that incumbent choice benefited from historical inspection.

**Per candidate and per fold:** net and gross dollars; realized/unrealized component; annualized return only when denominator and actual exposure support it; fixed-slot return; profit factor if defined; per-trade and per-campaign economics; borrowing dollar-days, interest, friction; number of trades and independent trend episodes; percent days/minutes invested; mean/median/max hold; maximum minute/daily drawdown in **dollars and percent of the $100k slot**, trade worst loss and worst excursion; return/drawdown ratio with careful sign and zero handling; negative regime results. Distinguish strategy-only $100k loss from portfolio-equity percent DD and the 60/40 core; do not mix them.

**Important:** Historical maximum drawdown is descriptive, not a guaranteed exit loss. A stop can be jumped by a gap; real margin calls/broker maintenance changes may defeat backtest assumptions. A candidate satisfying $35k on history is not certified safe for leveraged trading.

The 2023–2024 example motivated the user because VGT gained about 80% over a highlighted segment while D1 margin stayed idle. This cannot be recreated as authorized Stage 1 holdout since 2024 bars are excluded; **do not claim the strategy captured that entire 2023–2024 rally**. You may report 2023-only and an explicit later-test plan requiring user authorization.

## 9. Integrity checks, tests and honest negative results

- Tests for complete-minute/next-eligible-fill causality; no future-state highs/lows or troughs; timezones; corporate-action adjustments; opening gaps; stop activation and persistence; sustained trend and rearm state; reset behavior; overlapping entries; no double financing; partial fill/exposure scaling if used; trade cancellation; carried positions across folds; holiday session handling and empty/partial market days.
- Reproduce a subset of candidate paths independently (e.g., a slow/reference execution) and reconcile every trade timestamp, price, exit reason, interest, net and equity mark with full engine; include deliberately adversarial synthetic paths (spike/reversal, gap below stop, prolonged range, bull continuation after early stop, falling-knife bounce).
- Full-matrix fast screen parity with full minute engine on predeclared samples; hard fail if a core economic or chronology identity breaks.
- Baseline/test suite snapshot *before* study edits, and after. Do not conceal known pre-existing failures. Avoid touching unrelated historical test fixes. Run TypeScript checks/lint and the relevant focused test suites, then the full suite where feasible. If limits prevent exhaustive verification, disclose exact uncovered ground rather than claim all clear.
- Independent audit must verify all prominently reported numbers directly from sealed outputs, including comparison windows and DD definitions. Audit report should note suspicious incentive to optimize against prior known 2023/2024 history.
- If a new strategy isn't robust, report **no demonstrated standalone edge** and recommend no deployment or pool integration.

## 10. Mandatory deliverables and files

Under `research/study3-vgt-momentum/` (adjust subdirectory names only if necessary, and document departures):

1. `README.md` — short orientation, exact Stage 1 scope/status, all commands, source hashes and how to reproduce.
2. `brief/BRIEF.md` — byte-faithful copy of this prompt plus hash.
3. `SOURCE_AUDIT.md` — source hierarchy, Study 1/2 constraints, current repository test status, data doors, source provenance and input hashes.
4. `FIRST_PRINCIPLES_AND_HYPOTHESES.md` — independent mechanism diagnosis, 12+ genuine distinct ideas, A–K coverage, originality, prior design assumptions challenged, separate ideation and critique.
5. `MECHANISM_CATALOG.json|csv` and `MECHANISM_SELECTION.md` — causal definitions, inputs, parameters, states, time of observability, excluded prototypes and reasons; versioned IDs.
6. `EXIT_MECHANISM_STUDY.md` and `REENTRY_AND_CAMPAIGN_ANALYSIS.md` — isolated entry/exit/reentry ablations, trade/campaign ledgers, why candidates succeeded or failed.
7. `PROTOCOL.md` + hash/freeze manifests + `EXPERIMENT_MATRIX.json` — fixed folds, budgets, selection gates, diagnostic event labels, execution accounting, code/test audits, permitted final decision and result provenance.
8. `DATA_AND_BASELINE_PARITY.md` — data quality, canonical VGT D1 control and price-only/total-return conventions, exact cost and execution parity; known environmental failures.
9. `STANDALONE_DISCOVERY_AND_OPTIMIZATION.md` — first-pass prototypes, shortlist criteria, search archives, complete compute/seeds/budget report, including *all failed families*.
10. `CHRONOLOGICAL_RESULTS.md` — fold-by-fold method replay, incremental window ledger, regime robustness, generalization failure, insufficient-trade flags, selection leakage limitations.
11. `TREND_CAPTURE_AND_MISSED_OPPORTUNITIES.md` — identifiable uptrend families and causal entry delay; D1 idle-case diagnostics; post-stop missed gains and reentry economics; clearly descriptive hindsight labels.
12. `STANDALONE_RISK_AND_EXECUTION_STRESS.md` — fixed-slot minute/daily DD, interest sensitivity, friction/gaps, sensitivity neighborhood, worst lot/campaign/MAE/MFE and any threshold breaches.
13. `CANDIDATE_REGISTER.md|json` — research-only finalists with exact parameter/strategy signatures, ranks *by predeclared rules*, status and reasons; no promotion to `config/`.
14. `FINAL_COMPARISON_AND_RECOMMENDATION.md` — top-level verdict (no demonstrated edge / promising but unvalidated / no acceptable candidates etc.), honest comparison to standalone controls, what **cannot** be inferred about B4/B5 complementarity, readiness for user review, and explicit later-gate options.
15. `IMPLEMENTATION_AUDIT.md`, `reviews/`, `RESEARCH_RECOVERY.md`, signed/sealed stage records, parity and test logs, and reproducible code/CLI with documented commands.
16. Permanent policy diff: root `CLAUDE.md` (or existing equivalent) and `docs/claude/context-recovery.md`, with explicit fresh-session verification steps and instructions for later integration into a long-lived branch.

**Outputs must be human-readable and machine-reproducible.** Use dollars and percent drawdowns; precise windows and timezones; actual trade entry/exit prices and reasons; save example traces and explain mechanics in plain English. Do not output a huge opaque archive without an executive summary and direct links to tables. Keep large raw artifacts compressed and hash-addressed, and ensure that the committed audit is independently checkable; explicitly disclose any ignored-only files needed for full reconstruction and do not claim the commit contains them if it does not.

## 11. Research governance and decision gates

- Freeze mechanism groups, budgets, folds and outcome rules before inspecting results. Disclose known-history design bias; a retrospective protocol is not an independent test.
- Keep every rejected variant and experimental result. New insights after freeze belong in separately labeled exploratory work, not retroactive edits to the primary cohort.
- No live trading, registered phenotype changes, priority tuning, relaxed $35k risk gates, or pooled-strategy optimization. All combined-capital testing requires the user's subsequent approval.
- If no candidate passes economic and robustness gates, report a clear negative verdict. Checkpoint running processes before compaction; never kill expensive simulations merely to free context.

## 12. Commit/push and final user-facing response

After completing **all authorized Stage 1** work, tests, documentation, independent review and checkpoint:

1. Verify no protected `config/`, `data/`, prior study files, prospective freeze or incumbent phenotype changed. Any changes outside the new study folders must be limited to the agreed permanent Claude policy files and a minimal documented npm script/necessary integration with explicit audit.
2. Stage only authorized paths. Record final `git diff --stat`, path list, baseline-verifier outcomes and hash manifests; do not inadvertently commit `.env`, secrets, raw personal paths or unrelated artifacts.
3. **Commit and push** the new research branch to `origin`, verify with `git ls-remote` that the upstream head equals the local full commit hash. No merge, tag, force-push, pull request or deployment. If network or permission prevents push, report exactly what was committed locally and what failed; never claim push success without confirmation.
4. Final reply should give the research verdict, standout independent mechanisms (if any), negative findings, standalone economics/risk and caveats, code/test/audit status, exact branch/commit/push status, required long-lived integration of the permanent Claude recovery policy, and **a clear STOP** requesting the user's review before any combined simulator work.
5. End explicitly: `Study 1 COMPLETE; Study 2 COMPLETE; Study 3 Stage 1 COMPLETE (or INCOMPLETE); Study 3 Stages 2–4 NOT STARTED.`

## 13. Exact stop point and future authorization

**THIS BRIEF IS FOR STAGE 1 ONLY.** After complete standalone analysis and commit/push, **STOP.** Do not build or tune the combined allocator or claim B4/B5 improvement. Provide a proposed separate plan for later authorized comparisons, in this order:

1. Frozen **VGT D1 primary + VGT momentum**, same shared capital and exact engine chronology.
2. Frozen **B4 + VGT momentum**.
3. Frozen **B5 + VGT momentum**.

At that later stage, measure full-path marginal portfolio dollars/percent DD, idle-time gain, signal conflict, displaced D1 entries and chains, after-interest profit and realistic execution risks, without optimizing a momentum phenotype on pooled retrospective results. The later work must use a **new explicit approval and protocol**. Preserve VGT D1, B4, B5 and prospective tracking until separately authorized.

**Final required action of this session: finish and honestly report the intensive standalone research, verify the permanent recovery policy and commit/push. Do not skip the user review gate.**
