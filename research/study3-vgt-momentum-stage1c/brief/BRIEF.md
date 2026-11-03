# CLAUDE CODE EXECUTION BRIEF
## Study 3 — Stage 1c: D1-inspired protection for standalone VGT momentum, exhaustive structural mixing, and extensive controlled optimization

**Authorization:** Execute the entire standalone Stage 1c research assignment now, including repository inspection, methodological design, independent review, implementation, substantial optimization, chronological evaluation, risk/robustness work, independent final audit, reproducible reports, commit and push of a NEW research branch. Do not merely propose a plan. A negative finding is acceptable. Do not start any later stage or open protected holdouts.

**Read THIS COMPLETE attached Markdown file (including the last checklist) before beginning.** Confirm that the attachment is locally accessible in full; save an exact copy and SHA-256 in the new research folder. If Claude's chat attachment is truncated, obtain its real contents through the supported attachment/file mechanism rather than inventing missing sections. Actual repository records govern what earlier studies really implemented; this brief governs the newly authorized Stage 1c work.

**Principal scientific question:** Can combinations of established VGT momentum *entry families* and *exit families*, augmented by D1-inspired losing-hold, post-loss cooldown and material-loss recovery restrictions, meaningfully reduce historical bear-market losses (particularly 2022) while retaining high net profits during prolonged advances and acceptable minute drawdowns? Test **every compatible entry × exit pairing**, with **all eight on/off combinations** of the three protective rules, and perform substantial *numeric optimization inside those combinations*—not one default vector per cell. Give credible extra entry/exit families room to compete. Evaluate chronology honestly; known 2022 outcomes are hindsight-informed and are not independent validation.

**Where to work:** The existing Margin Trading / `ai-trading` repository on the user's machine. Verify the actual repo and commands. Create `research/study3-vgt-momentum-stage1c/` and `src/study3-vgt-momentum-stage1c/` (adapt paths only if repository conventions require) on a NEW branch `research/study3-vgt-momentum-stage1c` created **from the complete, current, verified remote head of** `research/study3-vgt-momentum-stage1b`—**NOT from `main` alone**. Stage 1b's known completion commit is `70257acc10eeec68fa89f6fe0df0bb7a96fe3389`, but its recovery checkpoint may be in a later commit: discover the true upstream head and verify ancestry; do not blindly branch from the short SHA. Preserve earlier research and sealed evidence.

**Recovery policy:** The permanent `CLAUDE.md` import of `docs/claude/context-recovery.md` was already integrated into `main` in policy-only commit `3ef43015f812c651c9f4608bbe4f01af4a0b81af` and reportedly verified in a fresh Claude session. **Do not repeat, cherry-pick or re-merge that operation.** Check that it exists and is loaded on the Stage 1c starting branch. Apply the persistent project recovery rules; create an independent Stage 1c `RESEARCH_RECOVERY.md` and update it before/after context compaction, milestones and long jobs. Do not overwrite active jobs or sealed results after compaction.

**Explicit prohibitions:** No changes to frozen Stage 1, Stage 1b, Studies 1–2, original D1, registered VGT D1 `primary`, B4/B5, the multi-ETF allocator or investment configurations. No Stage 2 VGT D1+momentum, Stage 3 B4+momentum, Stage 4 B5+momentum, or two-tier D1 Study 4 runs. No real trades, broker actions, margin-account changes or deployment. **No 2024, 2025 or 2026 momentum-candidate data reads, runs, charts, diagnostics, selection or validation—even if those files are locally available.** No merge to `main`/`development`, no PR or force-push. Finish Stage 1c, commit/push the separate research branch and stop for user review.

---

## 1. Verify baseline evidence and prepare an immutable research lineage

Inspect `git status`, remote refs, branches, worktrees, uncommitted changes, environment and data provenance before acting. Respect all user work; do not clean/reset/stash/remove files or switch a dirty checkout destructively. Use an isolated worktree where safer. Verify the Stage 1b remote head, Stage 1 ancestry and the `main` recovery-policy integration. Locate and read the exact source and frozen records for:

- Stage 1: `research/study3-vgt-momentum-first-principles/` (verify actual path), especially `PROTOCOL.md`, `STANDALONE_DISCOVERY_AND_OPTIMIZATION.md`, `MECHANISM_SELECTION.md`, `EXIT_MECHANISM_STUDY.md`, `REENTRY_AND_CAMPAIGN_ANALYSIS.md`, `STANDALONE_RISK_AND_EXECUTION_STRESS.md`, `CHRONOLOGICAL_RESULTS.md`, `FINAL_COMPARISON_AND_RECOMMENDATION.md` and audit/engine files.
- Stage 1b: `research/study3-vgt-momentum-stage1b/`, especially `PROTOCOL.md`, `ENGINE_CONTRACT.md`, `EXPERIMENT_MATRIX.json`, `ENTRY_EXIT_ABLATIONS.md`, `EXIT_OPTIMIZATION.md`, `REENTRY_AND_CAMPAIGNS.md`, `JOINT_COMBINATIONS.md`, `NEIGHBORHOOD_AND_CHRONOLOGY.md`, `EXECUTABLE_ANNUAL_SELECTION.md`, `TRADE_LEDGER_AND_RISK.md`, `EXPOSURE_AND_POSITION_SIZING.md`, `FINAL_COMPARISON_AND_RECOMMENDATION.md`, `IMPLEMENTATION_AUDIT.md`, `AMENDMENTS.md`, `reviews/`, and hash-verified results.
- Existing frozen VGT D1 `primary` strategy implementation **read-only**, to check its actual losing-position day count, profitable-stop behavior, material-loss semantics and accounting. **Do not infer D1's exact mechanics from this prompt or transplant D1 as an inseparable whole.**
- Existing minute-data paths and the already-frozen VGT 2016–2023 data cutoff. Preserve existing data/metadata. Do not access newer bars indirectly through cache warmup, helper summaries, precomputed 2024–2026 files, generic `all` datasets, graphs, or debug commands.

Important historical anchors (verify from source, report and ledger; if inconsistent, disclose the verified truth rather than silently modifying it):

| Prior reference | 2020–2023 net | Chained minute DD | Evidence level |
|---|---:|---:|---|
| Stage 1 yearly selections, original non-executable splice | +$253 | $63,569 | invalid as an actual annual-switching account |
| Stage 1 selections, repaired executable annual account | +$37,834 | $36,672 | retrospective, executable |
| Stage 1b frozen executable selector Π1 | +$12,573 | $42,882 | retrospective; risk-incompatible |
| Stage 1b 2022 outcome | −$30,966 | window DD $33,488 | three fresh entries into bear rallies |

The three Stage 1b 2022 losing entries identified in prior reports (verify exact fills, marks and exit reasons): approximately Apr 5–27 (−$13,794), Jul 27–Sep 30 (−$12,106), Nov 11 2022–Jan 3 2023 (−$5,566). Do not confuse the third trade's lifetime P&L with its **2022 calendar-window increment**. The original March 2020–Jan 2022 E04 trade was an **approximately +$83,131 lifetime net winner**, whose 2022 mark-to-market giveback was not a lifetime losing trade. Preserve accounting distinctions and original seals.

Stage 1b screened 13 entry × 20 exit families, independently optimized 11 exit families, examined 10 reentry rules, 4 sizing overlays and 12 chosen pairings per development history, with ~794,623 development evaluations; it **did not** exhaustively optimize all compatible entry × exit × new D1-protection combinations. Stage 1b's alternative Π-NET and attractive 2017–2023 E06 retrospective optima are **hindsight-selected observations**, not nominees or prevalidated successes. Stage 1c is expressly a **new, user-approved hindsight-informed research study**, not an extension of an earlier sealed experimental arm.

Before creating outcome-bearing code/results, record the branch head, all baselines, original frozen file hashes, data provenance, all previous inspection/selection leakage, and a precise no-modification allowlist. `RESEARCH_RECOVERY.md` should include source-of-truth artifacts, protocol hash, selected mechanisms, justifications for rejection, process state, last command and next command. The task is large; allow automatic compaction, proactively checkpoint, and reload authoritative files and job state afterward.

---

## 2. Research goals and evidentiary discipline

**Primary economic goals (joint, not lexicographically “minimize 2022 losses at any price”):**

1. Greatly reduce exposure to unproductive 2022 bear-rally trades and other adverse-market episodes **without** destroying the profitable large advances in 2020–2021 and 2023 or producing mostly idle strategies.
2. Preserve substantial **net** long-run profitability after **11% annual margin interest** (simple account conventions as actually implemented) and **5 bps per side** base trading friction.
3. Control maximum **minute** and **daily** mark-to-market drawdowns and dollar peak-to-trough giveback. `$35,000` maximum minute DD on the nominal $100k research slot is the user's research risk reference—not a guaranteed live stop and not proof of portfolio-level safety.
4. Favor **robust parameter neighborhoods and chronological generalization** over a single extraordinary in-sample vector; retain multiple behaviorally distinct candidate strategies, if warranted.
5. Explicitly measure return capture in long advances, missed upside, false entry rate, protective-rule effects, capital occupancy, borrow/market exposure, gap risk, financing, and realized **and** unrealized P&L.

**Critical selection warning:** The user and investigator already know 2022 was difficult, and individual losing trades were examined. We are explicitly exploring ways to address them. A striking 2022 rescue may be interesting but **cannot count as independent validation**; all 2016–2023 history has been inspected at some level. Use predeclared chronological folds with forward-only selection as a *stronger retrospective check*, label them correctly, and never claim 2022 or the 2020–2023 sum is prospectively out-of-sample. Pre-2024 tests alone cannot establish a real edge. Avoid “winner after millions of searches” bias and multiple-comparison overclaiming. A no-winner result is valid.

**Evaluation baseline:** Research one VGT-only, one-position $100,000 margin slot with the same causal minute-bar engine, clean executability, interest ledger and mark/DD conventions as verified Stage 1b. For the main comparisons use Stage 1b's net-debit account (including carried cash/debit-interest consequences); also report its fixed-slot parity convention when useful for cross-study comparability. Do not silently mix sizing, exposure marks or financing methodologies. Positions may be held months/years; no maximum profitable holding period unless an independently tested original exit says so. **Optional exposure trimming remains a control/sensitivity analysis, not a universal overlay and not the main new hypothesis.** The three new restrictions apply to momentum-originated trades only; no changes to D1 itself.

---

## 3. ENTRY library — all meaningful cross-pairings, not same-row assignments

The user's explicit request is **broad mix-and-match**. Begin with at least these seven causal momentum-entry families (using the actual Stage 1/1b source implementations and their correct mechanisms):

| Family | Informal role |
|---|---|
| `E06` calm advance | orderly upward progress, calm-market confirmation |
| `E05` rising floor | rising support/floor structure |
| `E03` directional efficiency | efficient directional movement |
| `E08` compression → expansion | expansion after price compression |
| `E02` financing-hurdle drift | advancement sufficient relative to carry |
| `E04` CUSUM drift | accumulated directional movement |
| `E11` durable permission | maintained permission/uptrend regime |

**Add other behaviorally different, technically credible families from Stage 1/1b where justified**, e.g. E01 peak proximity, E07 breakout acceptance, E09 upward trailing buy, E10 breakout trailing buy, E12 shallow-pullback continuation, or new Stage 1b variants. E09's earlier default exceeded risk gates; that does not prove every parameterization is useless, but don't silently promote an obviously weak or invalid family. Avoid re-implementing a label as a different algorithm. Provide a detailed `MECHANISM_CATALOG.md` with actual dependencies and incompatibilities, clearly distinguishing original versus variant source and previously optimized values. Do not combine entry families themselves (logical AND/OR) in the primary matrix unless a **separately justified secondary mechanism** and added statistical-search multiplicity is documented; the main task is pairing entry mechanisms with exits and protective overlays.

**Predeclare a reproducible inclusion rule before running Stage 1c outcomes**: include all seven mandatory entry families and all compatible existing distinct extras feasible under execution constraints; don't selectively add a family *after* seeing a disappointing evaluation fold. Preserve disabled/no-signal and ineligible cells as explicit records, with causal reason—not silent deletion.

---

## 4. EXIT library — independent mixing, including the D1 trailing-stop reference

Start with at least these seven **separate** exit architectures, built from verified Stage 1/1b implementations:

| Family | Mechanism / needed contrast |
|---|---|
| `XV` / `X2` | volatility-adjusted trailing stop (ratcheting and gap semantics tested) |
| `X3` | rising-floor structural exit + protective fail-safe |
| `XT` / `X4` | two-layer protective exit (catastrophic level and trend damage/profit ratchet as actually defined) |
| `X5a` | staged profit-retention exit |
| `X8AND`, `X8OR`, and/or trend-damage variants | price + trend deterioration gates; define AND/OR carefully |
| `TPL` / fixed trailing | hard stop + conventional trailing stop + source-family `OUT` behavior as verified |
| meaningful Stage 1b exit variant | e.g. financing/time/progress exit, protective/structural hybrid, or approved invented family |

The rows are **not paired** with entry rows. **Every compatible entry family must be tested against every compatible exit family**, under *all eight combinations* of the three Stage 1c loss-management rules in §5. Incompatibility must be a defensible code/causality issue, documented before performance, not “we dislike its results.” If an exit has its own inherited entry `OUT`, explicitly compare *retain* vs *replace* vs *OR with new exit* under predeclared logical semantics; do not accidentally double-trigger, hide the own-exit, or misrepresent one exit's efficacy.

Research the **same original family-specific exit semantics** as a baseline and pair other exits by contract. Include **tight trailing stops** (specifically compare the D1 VGT reference around `7.3%`, verify actual registered value), intermediate and wide stops, and volatility/structural/profit-sensitive alternatives. The earlier E04 trail near 24.6% allowed substantial giveback, but the famous profitable March 2020–Jan 2022 E04 lot **exited via CUSUM/structural behavior**; do not attribute its entire giveback to the trailing stop. Stop levels from held highest **close** versus held intraday **high** are different definitions; choose/test consistently, with no future knowledge.

Stage 1 exit references on **common untuned E02 entry**, 2017–2023, illustrative and in-sample only: X2 volatility trail +$37,730/$19,320 DD; X3 rising-floor +$86,081/$32,797; X5a profit-retention +$50,089/$27,556; X4 two-layer +$47,557/$29,725; CX1 fixed hard+trail +$31,017/$45,153. Stage 1b later optimized additional exits. These numbers do not justify prejudging an E06×X3 winner; verify source.

---

## 5. Three independently optional, *optimizable* D1-inspired protection rules

Implement each as a reusable, tested, parameterized overlay on a momentum-originated position and its subsequent momentum entries. **All three are off by default for the baseline. Test A, B, C separately; A+B, A+C, B+C; A+B+C; and none.** No overlay may silently disable the source entry, exit, reentry, or other enabled overlay. If simultaneous triggers compete, use a frozen precedence and prove causal execution.

### A — Maximum *losing* hold: net-profit check at the session OPEN after N calendar days

User's intended rule (preserve it exactly as a reference):

- Starting at the first regular trading-session open that is **on or after N calendar days from the actual entry timestamp**, inspect the **executable opening liquidation price** (sell-side costs, gap/slippage if modeled) and accrued margin interest **at that instant**.
- **If selling at that open realizes a net loss**, exit at that open; if the trade would be profitable at that open, keep holding, and repeat on **every subsequent trading session open** while the position remains open. Existing intraday protective stops and structural exits remain active in parallel; no arbitrary end to profitable long holds.
- Default/reference `N=15` calendar days (user's original idea) **and** `N=8` calendar days as a D1-reported reference; independently inspect actual D1 code for its exact rule and inclusivity. **Optimize N seriously** instead of assuming 15 or 8 is appropriate; start with a predeclared meaningful range such as **3–45 calendar days** (include 5, 8, 10, 15, 20, 30), potentially expand under a frozen rule. Days are calendar days, not trading sessions; carefully define timestamp comparison, holidays, same-day purchases, early closes and DST.
- Do not mistake “the first open after N days is profitable” for permanent immunity: later eligible opens must still be checked and can force an exit if the position subsequently becomes net unprofitable. Check that this behavior is truly the intended *repeat-open* design.
- If a same-session stop at/before the open would also trigger, specify one economic fill path: never allow two exits or choose a superior fill ex post; an opening gap can execute below a stop. No lookahead to the closing bar to decide at the open. **Opening-price observability:** a market opening print cannot normally be observed *and* used to condition an order that fills retrospectively at that same print. Treat a same-open conditional fill as an explicitly labeled optimistic D1-parity idealization only; the executable primary scenario must detect the first observable opening price/quote and execute at the next eligible tradable event (or document a genuinely precommitted stop/auction-order mechanism that does not depend on future opening price). Compare both where appropriate. This is **not** a guaranteed max drawdown or guaranteed worst loss before N.
- If trimming was enabled for a separate sensitivity, choose whether net profitability is measured at the trade/campaign level including realized trims vs solely remaining shares; record the selected convention; main experiment uses fixed-share/no trimming to avoid confounding.

### B — Post-loss momentum reentry cooldown

- After the **last completed momentum-originated trade** exits **at a net loss** including interest and trading costs, suspend new momentum entries for parameter `C` days/sessions. Explicitly define the clock, entry eligibility release, boundary fills and what happens if a signal arises during cooldown (discard vs persist/rearm, chosen before results).
- `C=0` is the no-cooldown control. Use a meaningful predeclared parameter space covering short/medium/long restrictions, e.g. **0–60 trading sessions** or a documented calendar-day variant. If testing both units, treat them as separate declared subfamilies (do not mix units in output). Include nearby short values; don't only test extreme cooldowns that trivially eliminate every 2022 trade.
- A profit exit should **not** automatically trigger loss cooldown. A qualifying signal after cooldown must still satisfy the underlying momentum entry criteria; never buy automatically when a timer expires. If an exit is forced by rule A, it can trigger B if it is net losing.

### C — Post-material-loss *price-recovery* constraint

- On a net-losing exit of a momentum-originated trade, calculate **gross price move** relative to that trade's actual entry/purchase fill, **excluding margin interest** (clearly document whether fees are included; distinguish net-loss gate from X trigger). If gross price loss is at least parameter `X%`, activate an additional restriction on the **next momentum purchase**.
- Under the user's primary proposed form, the new entry price must be **at least `Y%` above the immediately previous qualifying losing exit price**, i.e. `newEntryPrice >= lastExitFillPrice*(1 + Y/100)`, AND the original entry trigger must also be true. Use prices observed before the decision and preserve next-trade causal semantics; a later favorable fill may not retroactively validate a buy decision. Model threshold entry as a causal, executable trigger/order with appropriate gap slippage, and show whether the resulting fill satisfies the intended restriction. The restriction is **not** a substitute for the original signal. Determine whether “cross upward from below” adds material functionality compared to merely being above the level; analyze as a separate variant, not a silent reinterpretation.
- `X` and `Y` are **independently optimized**. Use a meaningful frozen search range (for example X≈0.5%–12%, Y≈0.5%–15%, 0.1 percentage-point quantization) and optional `Y=0`/inactive control; ranges may be widened only according to predeclared training-only criteria. Include the rule's persistence/expiration semantics, whether a new losing trade refreshes the anchor, and how a profitable trade clears it. Avoid accidental use of future troughs/highs. If a losing trade's entire loss is due to interest and price has not declined X%, C should remain inactive even though net is negative.
- Important: B and C may both apply, in which case **both** restrictions must be satisfied. Changing the order in which they evaluate must not create a materially different fill path.

**Other D1-inspired confirmations:** A separate **secondary** arm may test arming an existing momentum signal then waiting for a causal upward rebound/trailing-buy confirmation, D1-style additional post-loss price restrictions, or a better-defined “failure recovery.” Keep the main three-rule full factorial intact and the pure-momentum baseline intact. Allocate/freeze the secondary budget separately; do not replace the principal question or smuggle a deep-dip prerequisite into every momentum strategy. A longer profitable-trade hold remains allowed. Do not incorporate a D1 continuation signal unless explicitly a new standalone experimental mechanism.

---

## 6. FULL structural Cartesian matrix — mandatory, not row-wise pairing or 12 cherry-picked combinations

**Explicit user instruction:** Extensive, systematic *mix and match* across the best entry and exit families, across **ALL eight** rule masks, and **some numerical optimization within each combination** so that a cell isn't discarded due to a poor single default. The scope can exceed seven families each when justified.

Define a machine-readable table with one row per compatible:

`(entryFamily, exitFamily, sourceOwnOutContract, protectionMask ∈ {000,100,010,001,110,101,011,111}, allowedParameters, provenance, status, seed/budget)`

For 7 entries × 7 exits × 8 protection masks = **392 structural cells**; for 10 × 11 × 8 = **880**, not a mandated ceiling. **Enumerate the full matrix and give each eligible cell a nontrivial, comparable initial optimization budget.** Full structural coverage is a higher requirement than producing a huge count of optimizer evaluations for a few previously favored pairs.

Examples that MUST be represented if technically compatible: E06×rising-floor×A+C, E06×volatility-trail×A+B+C, E05×two-layer×B+C, E03×profit-retention×A, E08×fixed-trail×A+B, E02×structural×all off, E04×volatility-trail×C, E11×D1-reference-tight-trail×A+B+C. These are demonstrations of cross-pairing, **not** privileged winners.

**Optimization stages and search effort:**

1. **Preflight coverage audit.** Identify redundant or mathematically equivalent masks (e.g. C inactive at X outside achievable loss range), infeasible combinations and redundant entry/exit implementations; report them rather than quietly reducing counts. Fix causal bugs before code/results freeze, with independent review. Ensure optional rules with `off` exactly reproduce source baseline behavior.
2. **Broad, fair first-pass per cell.** Use deterministic quasi-random/Sobol or equivalent space-filling samples, with distinct valid quantized vectors and coverage of coarse meaningful parameter bands. A reasonable *target* is **≥128–256 genuinely distinct numeric settings per eligible cell per development history**, or an equivalent demonstrated fair design where low-dimensional cells have fewer unique legal vectors. Include central/reference params for each family; add known D1 8-day and initial 15-day losing-hold points. Keep a minimum *coverage floor* per cell: do not discard cells because one default vector loses money. Provide estimated compute feasibility and predeclare an explicit capped run plan, then freeze it before outcomes.
3. **Deeper, fair follow-up.** Using **training-only and predeclared diversity/risk/return criteria**, allocate more samples and local evolution/refinement to promising and *behaviorally distinct* cells—e.g. 1,024–4,096+ numeric draws per selected combination when computationally feasible. Make comparisons at matched computational budgets; keep informative losing/near-miss mechanisms in the archive. The optimizer must not repeatedly improve an evaluation-year configuration based on evaluation-year returns.
4. **Interaction optimization.** Optimize entry, exit and active overlay parameters **jointly** within a cell after fair coarse coverage. Do not rely exclusively on the family's earlier TPL-optimal parameters; a structural exit may require a very different entry setting. Include separately fixed-parent/overlay-only variants as ablations to attribute gains and avoid crediting all improvement to the three new rules.
5. **Optional secondary experiments.** Add causal entry-confirmation variants or a second distinct exit family only with clear provenance, a prior predeclared budget and their own multiplicity/evidence labels. Do not have the secondary search silently replace a disappointing primary matrix.

This is a **computational evaluation budget**, not a dollar-investment budget. The user permits serious compute—hundreds of thousands or millions of simulations if justified. Calibrate precise per-cell, per-history and total caps against measured time, cores, memory and data footprints; document formula, seeds and expected run counts in the **pre-outcome frozen protocol**. Allow a well-defined, precommitted adaptive allocation rule using **training data only**; don't expand because 2022 or other later-window outcomes fail. Record completed evaluations, unique vectors, duplicates, cancellations, excluded cells and cost. Preserve all honest negative outcomes. Any early termination due to machine resources must be reported as incomplete coverage, not represented as full-matrix success.

**Param conventions:** Percent values quantized consistently to **0.1 percentage point** where the existing TS optimizer does so; integer counts and days remain integer. Preserve strict boundaries and unambiguous percent fractions. Fix global seeds and deterministic tie-breaks; no lookahead; no duplicate exploitation. Use an auditable deterministic multiobjective method (global design plus local refinement, Pareto selection, optionally NSGA-II). Do not use a magical black-box strategy selector whose rules cannot be independently replayed.

---

## 7. Selection method and chronological evaluation — executable, forward-only, bias-aware

**First freeze** the matrix, parameter ranges, objective functions, cross-family compute design, constraints, selection algorithm, and chronological splits **before reading any Stage 1c outcome-bearing result**. Ask at least two independent review contexts (when supported) to critique the frozen intended design for lookahead, overfitting, fairness among cells, stop/risk implementation, 2022 leakage, dependence across folds and compute-budget adequacy. Preserve review and dispositions before first sealed run. Design selection so that each evaluation window can be reproduced solely from training data available before its start, and all positions belong to the executable selected account.

Predeclared primary chronology, subject only to verified exchange calendar / existing protocol conventions:

| Fold | Training cutoff | Evaluation window | Label |
|---|---|---|---|
| A | 2019-12-31 | 2020 | retrospective forward-selection evaluation; COVID decline/rebound |
| B | 2020-12-31 | 2021 | retrospective forward-selection evaluation; bull advance |
| C | 2021-12-31 | 2022 | retrospective forward-selection evaluation; bear-market entries |
| D | 2022-12-30 | 2023-12-29 | retrospective forward-selection evaluation; recovery |

Select candidate family, exit family, overlay mask, numeric parameters, and any annual-switch behavior **using only pre-cutoff data**. Apply a consistent **executable annual account transition policy**, preferably Stage 1b `S1`: liquidate/adopt at an explicitly eligible session/open with costs and financing; preserve prior loss-restriction state only per an exact specified policy, not convenience. Compare alternative S2/S3 transition semantics as labeled sensitivity, not a spliced substitute. Each year’s carry, opening cash, interest, marks, day counts, prior losing exits and signal state must be causally valid; report whether new overlays' cooldown and recovery restriction persist through the policy switch, expire, or reset, and why. **Never inherit a position from a strategy that was not previously selected.** No imaginary exit at a prior year's end if the selector was unknown then.

Because all 2020–2023 outcomes are familiar, these annual folds remain **historical pseudo-OOS checks**. They are more honest than full-history retuning but cannot cure prior researcher knowledge. A full 2017–2023 optimum is explicitly *in-sample descriptive*; use it for mechanism understanding and within-history neighborhood comparisons, never promote it as externally validated.

**The 2022 emphasis:** Report: (a) the 2022 fold C result from a configuration chosen *through 2021*; (b) all three original 2022 bad trades with exact causal counterfactuals (blocked, exited sooner, delayed, newly entered); (c) 2022 in-sample optimization as a **clearly separate forbidden-for-selection diagnostic**, if needed to explain upper bounds, never folded back into selecting the same 2022 result; (d) stress whether 2022 improvement comes from profitable timing, lower exposure, one prevented trade or universal nonparticipation; and (e) lost 2020–2021 and 2023 profits. Do not make “no losses in 2022” an absolute goal, and **do not privilege 2022 during training of fold C**. Label all target-year-informed mechanism inventions and researcher expectations honestly.

Compare at least two predeclared selectors/risk preference styles (e.g. profit-oriented and drawdown-efficient) without choosing the ex-post superior one after observing fold A–D. Declare **one binding primary verdict rubric** and separately labeled alternative controls. The improved earlier 1b Π-NET result (+$50,533/$18,015) is descriptive and must not become a secretly privileged Stage 1c selection target. Require adequate trades, economic benefit versus controls and robust risk. No “maximize profit by almost never trading” win; quantify participation and financing.

**2024–2026 embargo:** 2024–2025 reserved for a separately approved **future** frozen candidate validation; 2026 separately reserved as final holdout. Do not read or evaluate those years in this study, even as a curious diagnostic, and do not claim they're truly untouched at the overall project level. When Stage 1c finishes, stop and let the user decide whether any nominees warrant the next gate.

---

## 8. Risk, financing, trade semantics and essential edge-case tests

Use actual Stage 1b self-financing account ledgers and time-based minute data with next-eligible-trade fills where the source requires, intraday stops with sound gap/open precedence, no impossible same-bar knowledge, and exact 11% interest / 5 bps side base. Interest accrues on the appropriate principal/debit in the selected account (even when flat if negative cash is financed); distinguish per-trade interest from carried-account interest, especially when prior losses accumulate. Calculate net-profit-at-open using a declared observable opening quote/print and executable hypothetical liquidation price, not a later daily close; account for the fact that a decision *using* the opening print cannot guarantee a fill *at* that same print. Report any same-open-fill shortcut only as an optimistic idealization, alongside a next-eligible-fill primary execution and delay stress. Intraday stop fills may be worse than the stop price when price gaps through it. Preserve ratio precision, rounding and quantization.

All three added rules require focused unit/integration/property tests, including:

- Entry on Friday, `N=8` and `N=15` calendar days, weekends, exchange holidays and early-close calendars; first eligible open; net profitability just above/below zero after costs; the trade turning unprofitable *after* a profitable eligible opening; stop-vs-A same-open precedence; open gap below anticipated stop; no doubled interest.
- Cooldown `C=0`, repeated loss exits, loss→profit sequence, an entry setup that arises during cooldown, an order waiting during cooldown, a regime reset and the annual boundary; ensure no entry occurs early and no automatic entry is created just by time expiration.
- C's trigger: gross decline with net profit/loss at differing interest levels, no material gross loss despite net loss, exact X threshold inclusive, new entry precisely at/under/above exit*(1+Y), gap crossing, expired/replaced anchor, X/Y quantization and compound B+C logic.
- Overlay off yields bit-for-bit (or to strict numeric tolerance) the frozen parent strategy; reentry/stop source semantics unchanged unless explicitly tested; all eight rule masks have deterministic valid paths.
- Full executable stitched annual history reproduces the correct trading ledger without splicing independent prior positions or double counting a year-end mark; no newer-than-2023 bars read; a forbidden-data access must fail closed. Synthetic fixtures should test actual price sequences; no market lookahead.

Research **no trimming** as the primary fixed-share baseline; optional fixed-market-exposure trimming and/or Stage 1b Z1/Z2 overlays only as separately budgeted *sensitivity*, after the entry/exit/protection matrix. If an overlay trims at $100k market value, report principal repayment, freed cash, realized gains, borrow reduction, surrendered upside, and changing exposure. No automatic mandate to trim all variants. Stress financing 8% and 11% (plus higher plausible rate), friction 5/10 bps each side, slippage including gap/open and delayed fills, plus missing-minute / volume constraints where source data permits. Reconcile every trace to the cent or documented precision.

Report **maximum minute and daily DD** as $ and % of the stated $100k nominal basis, drawdown date/pair, peak gross market exposure, holding duration and time invested, price-vs-net trade losses, maximum single-trade adverse excursion, campaign drawdown, loss streak, and unrealized giveback. Do **not** conflate DD with original borrowed-principal loss; an appreciated winning lot can suffer significant mark-to-market DD while earning positive lifetime net.

Use at least three control families: frozen Stage 1 (repaired executable), frozen Stage 1b Π1, and simpler non-optimized controls (buy-and-hold monthly $100k exposure, simple trend filter, appropriate fixed-stop control). Include **market-value exposure-matched** and principal-day matched returns/interest where meaningful; do not overstate “alpha” from merely differing investment intensity. Registered VGT D1 `primary` is **not** to be traded in these combined runs; may be mentioned as an unchanged rule reference only.

---

## 9. One-at-a-time, joint-neighborhood and generalization research

For meaningful finalist configurations, and for mandatory control comparisons:

1. One-parameter-at-a-time variation on relevant original entry, exit and active overlay settings (small integer changes for days and ±0.1/0.5/1/2 percentage-point changes as appropriate), explicitly bounded and unique after quantization. Report objective and actual trade-path changes.
2. At least **128 seeded simultaneous joint perturbations** for leading finalists (64 for secondary distinct candidates if resources predeclared), covering entry, exit and protection parameters **together**. Report median, 10th/25th/75th/90th percentiles, worst, net P&L; separate percent with positive net, fraction within $35k DD, and fraction satisfying both. Repeat by chronological fold when computationally feasible (or explicitly disclose if only whole-history neighborhoods were run). Parameter perturbation draws are **not independent market samples**.
3. Evaluate wide parameter plateaus versus sharp optima and whether a seemingly “robust” result comes from no trading, overlong profitable holds, unrealistically favorable fills, or a single rare trend. Track all affected dates/entry/exit reasons. Preserve big winners without blindly penalizing one profitable trade, but quantify dependence on its occurrence.
4. Explicitly compare 2022 fold C loss, 2020–2021 captured profit, 2023 captured profit, and full 2020–2023 chained net/DD under the **same executable account**; do not add independent full-history best annual paths. Show local parameter sensitivity of N, C, X and Y separately and joint with stop distances.
5. Present non-dominated profit/DD/missed-upside/robustness candidates (small Pareto set) and **separate** single-criterion retrospectives from binding selected candidates. If no configuration passes the frozen safety, economic and chronology gates, register **none**.

---

## 10. Required experiment design, execution and independent audits

**Before outcome-bearing market-data runs:**

- Write `brief/BRIEF.md` exact copy with SHA-256; `PROTOCOL.md`, `ENGINE_CONTRACT.md`, `EXPERIMENT_MATRIX.json`, `MECHANISM_CATALOG.md` and complete new 3-rule contract. Define outcome windows, all entry/exit/mask cells and exclusions, source contracts, candidate parameter spaces, compute allocation, seeds, stop-loss/exit precedence, DD and P&L convention, primary selector, safeguards, acceptance rubric, stress settings and report schema.
- Obtain independent read-only methodology reviews in distinct agent context(s) where available; have reviewers critique specifically the **breadth of initial coverage**, risky mixed-source exits, overlapping B+C eligibility, calendar-open losing exit, 2022 design leakage, numerical optimizer fairness, performance multiplicitly, account switching and data embargo. Fix and document issues before freeze.
- Freeze/hashes of protocol, matrix, data cutoff/hash, code/import closure, seeds, objectives, compute budget, reporting rubric. Build reproducible deterministic writer stages, **write-once** sealed result folders and verifier that refuses to overwrite prior studies. Implement an independent reference execution path for synthetic fixtures and sampled full paths; parity-check timing, fills, state, financing, drawdowns and all three overlays before optimizing.

**During research:**

- Execute ALL planned compatible matrix cells and per-cell minimum searches on **each required training history**; allocate deeper training-only refinement according to frozen rules. Monitor throughput, process status and data; checkpoint after milestones. Do not kill expensive background jobs or rerun sealed stages just because Claude Code compacts. Save machine-readable records sufficient to recompute winners and failed mechanisms.
- During fold C, ensure training is strictly ≤2021; no future data in optimization, including shared caches. Evaluate the resulting chosen config only on 2022; do not tweak from 2022 results. Use actual annual selection semantics.
- Run robustness, stress, ablations and detailed trace comparison. Commission independent read-only final audit (another agent where supported) to independently recompute performance/verdict and inspect branch-only diffs, missing cells, fill/interest identities, risk, data embargo and reporting. Preserve reviewer text and dispositions. Resolve real correctness defects without overwriting sealed evidence; amendments must identify exploratory changes after data read.
- Verify original Study 1/1b seals *on their own source/import closures*, not by modifying their frozen code. Run targeted tests and full project tests/TypeScript checks as appropriate; classify inherited failures and newly introduced failures truthfully. Do not weaken tests to obtain green.

**Reporting paths:** `research/study3-vgt-momentum-stage1c/` should contain at least:

| Deliverable | Required content |
|---|---|
| `README.md` | study scope, status, one-page result, exact reproduce/verify instructions, results limitations |
| `PROTOCOL.md`, `ENGINE_CONTRACT.md`, `EXPERIMENT_MATRIX.json`, `MECHANISM_CATALOG.md` | frozen design, code/data provenance, full structural grid, masks, execution contracts, seeds and budgets |
| `PROTECTION_RULE_ABLATIONS.md` | A/B/C/AB/AC/BC/ABC vs off under fixed-parent and optimized controls; trade attribution |
| `ENTRY_EXIT_MATRIX_AND_OPTIMIZATION.md` | **all** eligible entry×exit×mask cells, coverage counts, per-cell samples, deep refinements, optimum vs robust candidates |
| `CHRONOLOGICAL_SELECTION_AND_2022.md` | executable A–D forward-only selection; 2022 bad-trade counterfactuals; no independent-validation overclaim |
| `NEIGHBORHOODS_AND_GENERALIZATION.md` | OAT and joint neighborhoods, feasibility fractions, regime splits, profit retention and stress |
| `ENTRY_EXIT_REENTRY_INTERACTIONS.md` | which entry and exit mechanisms complement, rule interactions, missed recoveries, weak families and alternative explanations |
| `TRADE_LEDGER_AND_RISK.md` | full trade ledger, fills/cost/interest, minute/daily marks, annual/chained DD, peak exposure, protected/blocked trades |
| `FINAL_COMPARISON_AND_RECOMMENDATION.md` | formal frozen verdict, credible/invalid alternatives, whether any *future* holdout candidate is nominated, limitations |
| `IMPLEMENTATION_AUDIT.md`, `AMENDMENTS.md`, `reviews/`, `results/records/`, `results/tables/` | independent reviews, parity and tests, full hashes, sealed machine results and regenerable human-readable reports |
| `RESEARCH_RECOVERY.md` | current branch/commits, source-of-truth paths, jobs, checks, decisions and next actions across context compactions |

Ensure human-readable reports show **$ and %** for drawdown and actual interest; call out exactly how much the 2022 reduction costs in missed 2020–2021 and 2023 profits. Tables must be computed from sealed records, not hand-edited. Maintain immutable previous-study artifacts and sufficient reconstructability of ignored large archives. Do not commit raw proprietary minute bars, secrets, or giant unreviewed binaries.

---

## 11. Decision gates and completion

Predeclare a **binding rubric** before experiments and evaluate it without post-hoc movement of the goalposts. It should cover: (a) causal and account correctness, (b) profit net of financing/trading costs and positive economic margin over simple controls, (c) chained minute DD ≤ **$35,000** research reference and per-window stress, (d) 2022 loss reduction *with* long-trend profit preservation, (e) adequate independent trades/regimes rather than simply sitting out everything, (f) simultaneous risk-and-profit neighborhood feasibility, (g) market-value exposure matched outcomes, and (h) stability to costs/gap fills. Do not use a single mandatory “2022 profit ≥0” gate. Distinguish **invalid**, **risk-incompatible**, **insufficient evidence**, **no demonstrated edge**, and **historically promising but unvalidated**; predeclare exact numerical thresholds and comparisons and retain near misses. If the frozen procedure yields no viable candidate, say so and do not nominate one solely because its full-history results are spectacular.

**Git finish:** Create Stage 1c from the verified Stage 1b remote head, ensure no unrelated modifications. Scope edits to `research/study3-vgt-momentum-stage1c/`, `src/study3-vgt-momentum-stage1c/` and narrowly necessary reproducible script/CLI wiring; never alter existing studies, frozen records, incumbents, configs or data. Independent final diff inspection; commit with meaningful message; push the **Stage 1c branch** to `origin` and verify exact remote HEAD. Do not merge to `main`, change existing protected branches, or open a PR without request. Report commit SHA, remote confirmation, completed coverage, test/audit results, missing items, and restrictions honored.

**Stop for user review.** We will decide later, in a **separately authorized** decision, whether to run frozen finalists against **2024–2025 validation and then independently 2026 final holdout**, whether momentum+D1 should proceed to Stages 2–4 using **the unchanged registered VGT D1 `primary`**, or whether to pivot to **Study 4 two-tier shallow/deep D1 allocator**, preserving B5 as an original immutable baseline. Do not preempt that decision or test those downstream systems now.

---

## 12. FINAL CHECKLIST — read and execute

- [ ] Full attachment read and copied exactly with SHA-256; Stage 1b remote **head** and lineage verified; clean/safe worktree; recovery policy loading verified; new Stage 1c research branch, no `main` operation.
- [ ] All seven mandatory entry families and seven exit architectures (plus justified extras) independently identified from actual source; full **entry × exit × 8 protection mask** structural grid created with no same-row pairing restriction.
- [ ] A, B, C as specified, individually optional and optimized; 8/15 calendar-day references and meaningful optimized N; cooldown C; separate gross-loss X and recovery Y; all rule subsets and intersections tested.
- [ ] **Real nontrivial numeric optimization per compatible grid cell**, matched initial coverage, deeper joint entry/exit/protection refinement, honest counts/duplicates; enough compute for a serious study; no single-default dismissal.
- [ ] Pre-outcome independent methodology reviews, frozen protocol/engine/import closure/matrix/budget/hashes; synthetic timing/gap/calendar/interest tests and independent engine parity.
- [ ] Real executable chronological A–D account; 2022 fold selected only with pre-2022 data; known 2022 trades diagnosed but not used to fabricate validation; frozen Stage 1/1b and passive/simple controls properly compared.
- [ ] OAT **and joint** seeded neighborhoods, separate net and DD-feasibility fractions, bear-market trade attribution and profitable trend retention, loan/exposure/cost/stop stress, all ledger identities.
- [ ] **No 2024–2026 reads**, no D1/B4/B5/Study 4 trading or optimizations, no live deployment, no previous study overwrites or merges; no claim of prospective validation.
- [ ] Independent final review, reproducible artifacts/reports, test suite status, branch-only diff, committed and pushed to verified remote, precise evidence limits and recommendation, **stop**.

**Execute thoroughly. The scientific objective is to find out whether D1-inspired trade-failure management truly improves momentum—not to produce an attractive backtest at any cost.**
