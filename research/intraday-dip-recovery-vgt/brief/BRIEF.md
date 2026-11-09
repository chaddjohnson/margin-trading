# Claude Code assignment — Short-Term VGT Dip Recovery: Phase 1 feasibility under Optimization Standard v2.0.0

**Controlling assignment.** This is a revised, complete replacement for `Claude_ShortTerm_Dip_Recovery_Phase1_Feasibility(2).md` and all earlier drafts of that brief. Do not merge instructions from an obsolete prompt. Read this assignment together with the **current repository standard**, not just a remembered summary.

**Research status requested:** new study; no work under this assignment has yet been authorized to change any completed study's sealed records. **Scope:** independent VGT-only strategy research on Alpaca SIP 1-minute OHLCV bars. **Goal:** determine whether the simplified dip-recovery mechanics can produce worthwhile **actual net profit** at acceptable **minute-marked drawdown**, and find several **meaningfully different** candidate phenotypes rather than minor variations around one winner. **Not a deployment authorization.**

## 0. First action — mandatory governance and standard adoption

Before implementation, performance benchmarking, ablation, optimization, or a new validation replay:

1. Read **in full** `docs/research/OPTIMIZATION_STANDARD.md`, its version registry `docs/research/optimization-standard.versions.json`, `docs/research/STUDY_PROTOCOL_TEMPLATE.md`, `docs/research/templates/STANDARD_ADOPTION.template.json`, and the applicable repository `CLAUDE.md` / research workflow documentation. Use the **repository's actual files** as authority. The attached standard was **v2.0.0, effective 2026-11-09**. Confirm whether it is still the current version when beginning; if newer, adopt the then-current version unless a separate user instruction directs otherwise.
2. Treat that standard's **[M], [S], [R], [A]** meanings as binding. Record its exact version and SHA-256 in the new study's protocol and `STANDARD_ADOPTION.json`. Start `PROTOCOL.md` from the repository's protocol template, not an improvised substitute. Document all study-specific **[S] adaptations**; do not create a departure from any **[M]** rule without a clear, explicit user authorization, cited in both the protocol and adoption manifest. **Do not interpret the superseded prompt's “skip robustness/folds” wording as authority to depart from this current request to comply with the standard.**
3. Run `npm run research-preflight -- --study research/intraday-dip-recovery-vgt` before the first substantive research stage, and invoke `requireStandardAdoption` from the new runner before search, qualification, and validation. **If preflight or adoption fails, stop the dependent work and report the issue.** Never bypass the guard to meet the schedule.
4. Freeze the protocol and its SHA-256 before searching. Maintain append-only `AMENDMENTS.md`, write-once sealed records (read-only / `0444` where required), SHA-256 entries in `seals.jsonl`, and door logs. Changes after freeze require a dated amendment; **never loosen an already-exercised gate based on results.** Preserve failed tests and aborted attempts.
5. Obtain the measured data coverage and the **common complete endpoint** from the actual VGT file; do not assume the currently available data reach November or December 2026. Record hashes, file lengths, regular-session completeness, and actual trading-session boundaries.
6. Local commits **needed for protocol/cutoff-selection freezes** are expressly authorized for this assignment. Do not push, merge, open PRs, deploy, trade live, or modify unrelated branches or worktrees without a separate instruction.

**Precedence:** the present assignment describes the user's research objective; the adopted current standard controls all requirements this assignment leaves unspecified. Where an apparent conflict remains, do not silently choose the easier reading: document it and seek explicit authorization for any genuine departure before conducting affected work. The previous “Phase 1, no neighborhoods / no earlier folds” text is superseded for the purpose of **standard compliance**.

### How to preserve the Phase 1 focus while complying

- **Prioritize actual net P&L and strict maximum minute drawdown.** Neighborhood evaluation, independent confirmation, tail disclosure, and earlier-cutoff evidence are still **mandatory** under the standard. Perform them at the prescribed, appropriately budgeted stages; do **not** substitute them for the central profit objective, invent an additional `$10,000/year` neighborhood-profit hurdle, or let low-trading inactivity appear superior solely because it is stable.
- This is **not** a request for an exhaustive separate robustness-discovery phase or ongoing parameter recalibration. Keep searches focused and report the legally required evidence alongside the main economic findings. A later Phase 2 may examine richer robustness mechanisms, execution models, new features, GDX, or operational walk-forward recalibration.
- **Important terminology:** earlier-cutoff **procedure repeats** (C19/C21/C23) required by §1.8 of the standard are **not** an instruction to operate a periodically retuned live strategy. Run the former; do not implement the latter.

## 1. Preservation, scope, and reference material

- **New namespaces only:** `src/intraday-dip-recovery/` and `research/intraday-dip-recovery-vgt/` (or a clearly equivalent, collision-free path). Use a separate branch/worktree as appropriate. Leave daily D1, Strategy Lab, Growth, Study 8, and the completed intraday D1 study unchanged, including all frozen code/records/validations. No portfolio combination or shared-margin multi-ETF allocation.
- Trade **VGT only**, fixed **$100,000 funded principal/notional** per trade, one funded position at a time, no compounding, no pyramiding or averaging down. Optimize the **actual funded, causal replay**, not a sum of hypothetical missed trades. Expose unfilled/refused opportunities and time idle separately where useful.
- **Development:** first actual session on or after **2016-01-04** through **2024-12-31**. **Validation:** first actual session on or after **2025-01-01** (normally 2025-01-02) through the measured common complete endpoint. 2025–2026 was inspected in prior work. Label its use **“validation on previously examined history, not an untouched holdout.”** Document known earlier results and provenance.
- Earlier cutoff/repeat windows are wholly inside development, specified and frozen before execution. Never use later-window outcomes to tune an earlier-window search or its independent lane.
- **Do not force a particular trade frequency, +0.5% winning trade, end-of-day flat rule, or minimum number of trades.** Assess whether candidates actually trade intraday; slow or mostly inactive solutions must be described as such.
- Read, verify, and cite actual repository records/code, at least:
  - `research/intraday-d1-vgt/{REPORT.md,PROTOCOL.md,FROZEN_SELECTION.json,RESEARCH_RECOVERY.md,AMENDMENTS.md}`, ledgers and diagnostics;
  - `research/intraday-d1-vgt/audit/{D1_AUDIT.md,STUDY8_AUDIT.md,METHODOLOGY_TRANSFER_MAP.md,RULE_PARITY_DESIGN.md,PRIOR_INTRADAY_AND_INFRA_AUDIT.md}`;
  - `src/intraday-d1/`, canonical `src/app/allIn-trailingBuy-postExitContinuation.ts`, Study 8's real search/fitness/evaluation code, and current optimization-standard/preflight source.
- Study 8 and existing D1 configurations are **read-only controls**. Reproduce relevant exact native controls to the cent where feasible, and separately report harmonized comparisons on the new study's economics, windows, arming and split rules. Do not rerun a sealed research stage.
- Canonical D1 **does not** contain the older material-loss reentry restriction, lower-price reentry rule, or recovery reset. Those belong to older `allIn` variants. Do not silently add them to this study or mislabel them as D1.

## 2. Trading mechanics — retain the agreed short-term design

### 2.1 Minimal core (F1)

1. **Reference high / lookback `L`:** compute a prior eligible high using only completed observations and an explicitly defined clock. If retaining period `B`, include **B = 1 minute** and longer possibilities. Never read a future or unfinished period high.
2. **Dip trigger `X`:** on a completed minute close, arm if the price is at least `X%` below the eligible reference high. No trade on the arming observation itself.
3. **Trailing buy `Y`:** after arming, track the trailing low causally (initial low = activation close, as in D1, unless separately tested) and submit a buy only when a completed minute's close meets the `Y%` rebound condition. Fill no earlier than the next eligible observed trade. Pending setups are persistent by default.
4. **Unconditional protective trailing stop `S`:** immediately establish an actionable protective stop from the known entry fill, **even if executing would realize a loss**. Update the stop using highs from completed minutes only; highs discovered in minute `m` cannot improve the executable stop before minute `m+1`. Ratchet upward, never downward. Stop-market fills can be worse than the stop in gaps/illiquid markets.
5. **Same-period / same-day entry-exit eligibility:** unlike D1, permit exit after entry within the same B period and the same trading day, and a later new entry after a fresh qualifying setup. Never exploit unknowable high/low order inside a 1-minute OHLC bar. Explicitly define stop activation immediately after a fill and conservative same-bar handling.
6. **One funded position at a time.** No pyramiding/averaging down, independent overlapping positions, or fabricated capital availability.
7. **No forced end-of-day liquidation.** Overnight/weekend holding is permitted but not required; quantify it.

### 2.2 Comparison-only features

- **Legacy losing-hold H / buffered-loss U:** OFF for the minimal core; both may be ON only for explicit comparison families. Do not introduce a new hard time stop or independent fixed-loss exit without a different authorized study.
- **D1 post-profit continuation C:** OFF by default. ON only for explicit families. A **net-profitable exit** opens a continuation window; a qualified pullback within W can arm a new trailing buy. A losing exit opens no window. Preserve causal reference-high tracking and priority against the deep-dip path.
- **No unapproved indicators, trend filters, profit targets, regime classifiers, cooldowns, recovery resets, or new entry paths.** The goal is to isolate the agreed changes.

### 2.3 Preserve the rule-ablation ladder (development only)

Compare the same fixed development-era vectors using these successive changes. The vectors must have declared provenance; historical winners selected with later outcomes are **informed controls**, never independent earlier-cutoff seeds.

| Ladder | Profit-only stop? | Same-B-period exits / new entries? | H/U | Continuation | Stop-high ratchet |
|---|---|---|---|---|---|
| L0 — prior Intraday D1 | YES | NO | ON | ON | B-period |
| L1 | **NO** | NO | ON | ON | B-period |
| L2 | NO | **YES** | ON | ON | B-period |
| L3 | NO | YES | **OFF** | ON | B-period |
| L4 | NO | YES | OFF | **OFF** | B-period |
| L5 — new short-term core | NO | YES | OFF | OFF | **completed-minute** |

Change only one mechanism at a time. Report net, gross, execution friction, interest, drawdown, trade count, worst loss, holding duration and same-day/overnight share. These comparisons are **explanatory diagnostics**; a configuration bad under another family's inherited parameters does not eliminate that family's independent optimization.

### 2.4 Four predeclared structural classes

| Family | Stop works while losing? | Same-period entry/exit? | H/U | Continuation | Stop update |
|---|---|---|---|---|---|
| **F1 — CORE** | YES | YES | OFF | OFF | completed-minute |
| **F2 — CORE+C** | YES | YES | OFF | ON | completed-minute |
| **F3 — CORE+H/U** | YES | YES | ON | OFF | completed-minute |
| **F4 — CORE+C+H/U** | YES | YES | ON | ON | completed-minute |

Run separate, **protected** search budgets/strata for F1–F4. Inactive genes must be canonicalized and excluded from meaningful candidate identity. If an H/U mechanism is provably inert for a class, prove it on traces and record any dimension reduction **before freeze**; do not decide from validation results. Each family can be an independent alternative; **they are not simultaneously funded components of a pooled portfolio**.

## 3. Primary objective, gates, and diverse candidate roles

### 3.1 Decision rule: economic feasibility first

- **Primary research target:** maximize **actual centre net P&L after execution costs and borrowing interest**, subject to **centre maximum minute-marked drawdown ≤ $35,000** on the fixed **$100,000** principal budget. The DD percentage denominator is fixed principal, not peak equity. A historical cap pass is not a promise that future losses cannot exceed it.
- **Freeze the primary-selection rule before search:** **actual profit** = maximum development centre net among all qualified candidates, tie-break by lower centre minute DD, then deterministic canonical candidate ID. Qualification uses the standard-mandated verification and stated risk/neighbourhood checks. **No arbitrary activity floors, annual-profit floors, largest-winner caps, equal-family-profit requirements or `$10,000/year` neighborhood median veto.** Report concentration and activity instead.
- The protocol must state the exact **neighborhood DD gate**, if used for qualification, and its treatment of boundaries (proposed: selection/confirmation p90 minute DD ≤ $35,000; centre DD ≤ $35,000). This is a study-specific [S] criterion; verify it against the adopted standard and current template before freezing. Do not silently treat median/p10 profitability as an additional gate.
- Maintain and report the **qualified four-dimensional Pareto set** under §2.4: maximize centre net, minimize centre DD, maximize neighborhood p10 net, minimize neighborhood p90 DD. Preserve unqualified but economically informative **diagnostics** separately; a candidate failing a gate must not be called qualified or deployable.
- Optimize using **quasi-random (Sobol/LHS) coverage, independent NSGA-II islands, multiobjective promotion, staged neighborhood rungs, and local refinement** for the large search space. Center net and centre DD are non-negotiable central dimensions; neighborhood p10 and p90 DD support the required Pareto/qualification evidence, not a replacement for economic profits. Explicitly reserve **at least 25% of each promotion tier** for center-profit rank within admissible constraints; separately reserve budget for structure and behavioral diversity.
- If the search finds **no qualifying primary**, report that result, retain a small frozen diagnostic catalog and run only pre-registered permitted diagnostics. Do not relax gates or declare a diagnostic a winner after inspecting validation.

### 3.2 Mandatory roles, plus feasibility-oriented descriptive roles

Define the following formulas **exactly in the frozen protocol**, on development data only:

1. **Actual-profit [primary]:** highest centre net among qualified candidates, under the predeclared tie-breaks.
2. **Robust-profit:** highest selection-family `0.5 × neighborhood median net + 0.5 × neighborhood p10 net` among qualified candidates; ties predeclared (e.g. lower p90 DD, ID).
3. **Balanced:** highest selection-family robust net ÷ neighborhood p90 DD among qualified candidates; specify a deterministic rule for zero denominator.
4. **Lower-drawdown:** lowest selection p90 DD among qualified candidates whose robust net is ≥ 50% of the primary's selection robust net, if this comparison is meaningful; otherwise report vacant with explanation.

Selection families determine role **ranking**. Independent confirmation seed families determine **qualification**; do not rerank on confirmation or validation. One candidate may hold multiple roles.

In addition, report **up to 12 meaningfully distinct development-selected phenotypes** across the four families, preferably 8–12 only if justified by real evidence, never padded with clones. Consider descriptive labels such as high frequency / short holding, deep dip / slower holding, differing stop levels, low-DD, continuation ON/OFF, and H/U ON/OFF. Maximum **four per family** as an explicit diversity cap, not a profit filter that displaces the globally primary candidate. Preserve the mandatory roles even if a family cap would otherwise exclude one. Predeclare canonical distance plus **traded-ledger overlap, duration, frequency and entry-depth** similarity thresholds. Report each retained candidate's nearest selected neighbor, differences, and reasons for inclusion. Keep informative high-risk or economically weak cases as **diagnostics**, never as qualified nominees.

### 3.3 Controls and informed/independent lanes

- Exact **incumbent controls** must be reproduced to the cent on native assumptions, and shown under an explicitly harmonized cost/window/accounting convention. Relevant examples: daily D1 `primary`, the completed intraday-D1 frozen diagnostic near-miss, and any prior fixed short-term dip variants that genuinely match the research question. Verify exact provenance and suitability rather than inventing incumbent aliases. All meaningful controls stay in comparison tables.
- Where historical incumbents exist, run **two explicitly separate proposal lanes**: (A) broad independent discovery using only eligible cutoff-era information; (B) **incumbent-informed refinement** with its own declared proposal/evaluation budget. Any incumbent seed must be represented **exactly** on the parameter grid (extend schema or use explicit exact coordinates, never silently round it). Canonicalize inactive genes and de-duplicate identical funded ledgers.
- **Informed-lane fallback:** freeze a no-improvement rule: if no newly searched candidate beats the best *qualifying and structurally applicable* incumbent under the same primary rule, retain that incumbent as the comparator/primary within its own eligible architecture. An incumbent from unchanged daily D1 is a **control, not a selectable short-term phenotype** unless it actually satisfies the frozen new architecture and qualification conditions; state any non-applicability rather than quietly transferring its status.
- Earlier-cutoff folds may use an **independent** lane as chronological evidence only to the extent that seeds, ranges and selection genuinely exclude later-selected configurations and examined outcomes. The new rule family was conceived after inspecting prior 2025–2026 history; disclose that wider research exposure. Do not call informed repeats or retrospective design choices a clean unseen test.
- Since this is **VGT-only, one strategy family funded at a time**, the standard's pooled-method comparison arms (fixed pooled components vs separately optimized vs joint) and multi-component participation protection are **not applicable to the primary study**. Explicitly say why in the protocol; do not silently ignore §3.4/§4.7. The four families here are alternatives, not simultaneous components of a combined system.

## 4. Mandatory chronological search repeats and validation doors

The adopted standard requires **procedure repeats at earlier cutoffs within development**, even for this feasibility study. Run full search **and** frozen selection for each, using the **same declared budget, criteria, families and independent-lane construction** as the main cutoff. Default:

| Fold | Search/selection data through | Subsequent evaluation slice (all inside 2016–2024) |
|---|---|---|
| **C19** | 2019-12-31 | first 2020 session through 2021-12-31 |
| **C21** | 2021-12-31 | first 2022 session through 2023-12-29 |
| **C23** | 2023-12-29 | first 2024 session through 2024-12-31 |
| **C24 / final development** | 2024-12-31 | 2025 onward: separate once-only validation door |

- Resolve the exact date slices from canonical sessions. Each cutoff gets a physically limited **byte-prefix data door** with verified size, SHA-256 and last timestamp; a full-file loader that later discards prohibited rows is **not acceptable**. Log every door opening. Seal and **commit each cutoff's selection before opening its evaluation slice**; state carry-state, warm-up and boundary mechanics. The next cutoff's training may of course include data from the earlier fold's evaluated slice, once that fold's selection was frozen.
- The **sequential procedure** chains the frozen **fold primaries** over their slices, never retrofitting later winners to earlier slices. Predeclare the standard's default verdict (supported only when **every fold has a primary**, sequential net > 0 and sequential minute DD ≤ $35k) or a specifically justified [S] alternative before freeze. Report a missing fold primary, losing slice and any DD breach **even if the final C24 primary looks attractive**. Keep this distinct from local-neighborhood robustness.
- Freeze/seal/commit the **C24 shortlist, primary, roles, validation tests and validation perturbation families** before accessing any new-candidate 2025–2026 validation result. Validate once, without parameter changes or rescues. Validation profit = continuous marked net at endpoint minus marked net at 2024-12-31 close; **no liquidation or reset**. Report **whole-run DD** and **reset validation DD**; report 2025 and partial 2026 separately.
- Previously seen 2025–2026 history **must be disclosed** and never used to create a seemingly independent new optimization after validation disappointment. A failed validation remains a result, not an instruction to re-search.

## 5. Optimization process, perturbations and protected discovery

### 5.1 Pre-freeze budgets and coverage

1. First perform a **time/memory pilot** on representative development-door evaluations and realistic candidate mixtures, under the §6 aggregate resource limits. Benchmark several stable worker/cache configurations. Measure throughput, CPU saturation, total process/cgroup memory, external/ArrayBuffer memory, I/O and headroom. Pilot sizing is allowed **before freeze**, never as a silent post-freeze shrinkage.
2. Before searching, fix numeric **distinct candidate proposal budgets** and **fresh backend evaluation budgets** **per F1–F4, per independent/informed lane, per C19/C21/C23/C24 fold, per rungs**, plus maximum extensions and diversity-stratum quotas. Do not substitute an arbitrary tiny search for this multi-family question. Keep the **same budget at each earlier cutoff** as required by the standard. Report centers, neighbours, cache hits, retries, resumed work and rejected proposals separately.
3. Protect each family, shallow-decline and larger-decline candidate ranges, and the major parameter/time-scale strata so the optimizer does not collapse prematurely into one slow multiday basin. Reserve ≥25% promotion for centre-profit rank, and declare the additional quota for behavioral/structural diversity. Report how many candidates in each class were screened, feasible, promoted and shortlisted, including inactive dimensions and duplicate ledgers.
4. Freeze an **extension/stopping policy** using development-only signals: frontier hypervolume of (`−robust net`, `p90 DD`) against (0, $35k), best feasible robust-net progress, and discovery of new distinct profitable ledger/architecture classes; predeclare trigger thresholds, extension caps, maximum evaluations, stagnation and resource stop. Record **hypervolume gain per 10,000 evaluations**, exactly why a job stopped, and whether its budget was exhausted (**budget exhaustion ≠ convergence**).

### 5.2 Required neighborhood evidence, kept proportionate to Phase 1

**Do not skip this section.** The superseded feasibility prompt asked to defer all perturbations, but current **Optimization Standard v2.0.0 makes a neighborhood specification, independent confirmation and risk-tail disclosure mandatory**. Comply while keeping the economic objective central:

- Predeclare numeric perturbation **radii for each active parameter**, distributions (default common-seed Latin hypercube over `[-1,1]`), categorical handling (hold F1–F4 and other category choices fixed in numeric neighbors), clipping, canonicalization, order repair, duplicates and seed families. No new feature is selected by these diagnostics.
- Use staged **16 → 64 → 128** draws in promoted search rungs; **selection 2 × 128**; **confirmation 3 × 128** independent seeds, with half-radius / 1.5×-radius and relevant one-family scopes. A 16-draw screen is **not** adequate confirmation. Adapt fidelity only if allowed under the standard's [S] rule, justified and frozen; do not omit it merely to save compute.
- Report neighborhood median/p10/p90 net, robust net = ½ median + ½ p10, p90/worst DD, breach count/share above $35k, **mean excess** above $35k, p95 DD, **worst-10% mean DD**, a finite-draw uncertainty interval for breach share, small/wide-radius changes, clipping and distinct funded ledgers (including those behind breaches). Tail severity is **report-only**, not an extra veto or a probability of real-world loss.
- Use independently seeded **confirmation** to qualify; ranking from selection families only. Disclose exact neighbor risk-gate formula before seeing results; do not invent an annual-profit/median-profit floor, or a positive-win-rate threshold, absent from the standard. Do not treat parameter-neighborhood success as evidence of independent chronological robustness.
- At matched economics, assess candidate/portfolio net and minute DD, **not** a sum of standalone trades or post-hoc transaction-cost subtraction. Model how costs affect state transitions when applicable.

### 5.3 Economics and risk scenarios

- Use a fixed **$100,000** notional funded position, a clearly defined **11% annual margin-financing rate** and interest-accrual convention, and **5 basis points per side** as the primary modeled execution friction (**not commissions**). Brokerage commissions are $0; spreads, market impact and slippage may still matter. Run a separately labelled **2-bp/side informed/exploratory cost lane** only with frozen budgets and comparable controls; do not call a 2-bp winner a 5-bp winner.
- For the frozen candidates/controls, report full causal replays at **0, 2, 5, 10 and 20 bps per side**, plus **14% margin interest**, next-open stop fills and adverse stop-slippage where supported; label primary-versus-stress results. The standard requires **10/20 bps and 14%** execution/financing stresses even for a feasibility study. Preserve trade decisions where cost-adjusted net affects continuation or other paths; do not merely subtract costs afterward.
- Preserve a truthful capacity review. VGT historical minute volume can be thin relative to a $100,000 order. Flag notional participation using causally observable dollar volume; never claim minute OHLCV is full order-book depth. A stop order cannot guarantee its trigger price. Report the optimistic stop-at-level convention and conservative alternatives.
- Use Alpaca SIP **1-minute OHLCV bars**, **not individual trades (“ticks”) or quotes**. Preserve sparse minutes, exchange hours (09:30–16:00 ET with early closes), DST, holidays, official close semantics, raw/adjusted corporate action handling and VGT's 2026 split. No high/low lookahead, no fabricated bars, no favorable within-minute sequencing. Test gap fills, crossed stop/entry events, overnight carry and worst fill ambiguity.
- The strategy may profit while holding overnight; report same-day round trips, return per trade, largest loss, gross/net expectancy, fees/friction, interest, participation, capital occupancy, duration and annual distribution. Do not use trade frequency or positive-win percentage as optimization gates.

## 6. Verification and execution safeguards — before large search

All verification gates required in standard §5.1 must be **sealed as passing before substantive optimization**:

1. **Parity:** exact-to-the-cent/bitwise where appropriate for unchanged reference behavior. Reproduce canonical daily D1 and prior intraday D1 controls under their own native assumptions without touching their frozen records. For the **changed** short-term engine, test unchanged submechanisms against an independent reference/oracle and use explicit synthetic expected-output tests for changed stop, hold, same-period and continuation semantics. Do **not** demand trade identity between two strategies whose rules intentionally differ. A failed parity gate stops search until corrected and re-sealed.
2. **Causal doors:** prove a run on a shorter physical door equals the prefix of a longer permitted run decision-for-decision, including open positions and boundary marks. The audit itself must avoid improperly opening the validation door before frozen selection.
3. **Accounting/capital:** lot and mark reconciliation, $100k maximum funded principal, no simultaneous funded trades, no phantom credit, exact interest/cost rules and distinct realized-versus-unrealized attribution.
4. **Single-family identity:** demonstrate that the VGT one-book funded replay equals the canonical standalone execution path under identical rules; document any pooled-family identity test as inapplicable rather than silently skipping.
5. **Execution stress:** verify 10 and 20 bps per side, 14% interest, gap/slippage and next-open stops when implemented. Distinguish diagnostic stress tests from the profitability objective. Cover zero/negative interest where synthetic tests need it.
6. **Edge cases:** sparse minutes, stop trigger inside the fill minute, same-period reentry, split boundaries, same-instant event ordering, partial shares/sales (where implemented), DST, exchange early closes, weekend/holiday gaps, annual attribution, endpoint open trades and period reset-DD calculations.

**Resource contract:** Run all concurrent study research processes under **one transient systemd user parent slice** with **`MemoryHigh=44G`, `MemoryMax=48G`, `MemorySwapMax=0`**; keep Claude/tmux/host services outside. The cap is a ceiling, not a target. Do not run multiple independently capped 48G workloads. Raising beyond 48G requires express approval. Before freeze, benchmark worker/cache choices and record the chosen count, cache bounds, memory-pressure dispatch threshold below the hard limit, and GC cadence. Bounded queues and caches, durable append-as-produced archives keyed by study/job/door/code hash, RNG/search checkpoints, and tested **graceful interrupt**, **abrupt parent-unit kill**, and **abrupt worker kill** must all resume deterministically. Worker failures must fail/checkpoint, not hang. Never OOM-restart-loop. Node old-space flags do not cover aggregate ArrayBuffer memory.

## 7. Reporting and study conclusions — NO visual artifacts

**Standard v2.0.0 §7.7 prohibits research visual artifacts.** Output **Markdown analysis and tables** plus **JSON/JSONL/CSV** only. **Do not create** plots, charts, SVG, screenshots, images, dashboards, HTML visual reports or PDFs. A Markdown net-vs-DD **table** is required; do not make a chart or even an optional visual. Strategy Lab is a separate product UI, not a backtesting/reporting surface for this assignment.

Report at least:

- **Ablation L0–L5:** fixed vectors, exact parameter values, per-rule deltas in trade decisions, entries/exits, wins/losses, net P&L, gross, DD, friction, hold time, share of same-day round trips and biggest losses.
- **Coverage/budget:** proposal and backend-evaluation counts by fold, lane, family, stage and stratum, including caches/retries, promotion exclusions and duplicate-ledger collapse; extension/stopping reasons and where broad discovery did or did not cover the space.
- **Qualified Pareto set, roles and diversity:** centre net/centre minute DD; neighborhood p10 net/p90 DD; qualified/non-qualified flags, full parameter vectors, roles, nearest candidate overlap and distinctness, cost scenario, selection rationale. **Up to 12 phenotypes** if genuinely distinct; never invent a winner. If nothing qualifies, provide clearly separated non-qualified diagnostic candidates without changing gates.
- **Per-trade ledgers:** entry/exit UTC and ET timestamps, entry path (deep vs continuation), signal vs fill, gross/net, interest, friction, MAE/MFE, stop trigger and fill reason, hold time, whether intraday/overnight, realized and marked P&L. Report capacity flags.
- **Per-year and per-window tables:** 2016–2024 development, C19/C21/C23 chronological slices, 2025 and 2026 separately, combined validation, continuous whole-run net/DD, reset validation DD, best/worst trade, consecutive losses, gross/net expectancy and profit factor.
- **Concentration/causal tests:** count independent episodes and lot-years (no exclusionary floor), the most profitable episode's contribution, loss tail, and a **causal rerun with new funding barred during the top historical episode** (preserve state; define episodes causally/predeclare). Where a family on/off comparison is meaningful, give the **causal difference of the whole replay**, not a sum of component standalones. For standalone deep-only F1, state when removing its only entry path necessarily yields no trades.
- **Mandatory neighborhood disclosures:** median and p10 net, robust net, p90/p95/worst DD, worst-decile mean, breach frequency with uncertainty, mean/worst excess, radius sensitivity and number of distinct ledgers. Keep all **[R] statistics report-only** and never promote or veto based on them.
- **Chronological truthfulness:** C19/C21/C23 sequential procedure verdict and all failures; no claim of independent validation where architecture/parameter knowledge was previously exposed. Selection, qualification and later user-directed consideration must always remain distinct. If a user specifically retains a gate-failed candidate later, record the **original sealed verdict**, **new descriptive evidence**, and **user-directed consideration** independently, never rewrite its status.
- **Controls:** native and harmonized results for relevant D1 and completed Intraday D1 references, with exact matching cost/date/arming/split provenance. Never claim one optimization method proved superior merely from one favorable historical pair.
- **Verdict:** (a) credible feasibility signal, (b) tentative/cost- or execution-dependent, or (c) no attractive edge demonstrated. State whether the trading mechanics actually deliver short-duration trades. Differentiate **historically profitable, qualified under frozen gates, chronologically supported, and deployable**; none of these are synonyms.

## 8. Exact implementation and workflow order

1. Read and pin the standard and its templates; adopt **v2.0.0 or the repository's later current version**, preflight, audit repository state/previous studies. Write `EXISTING_FINDINGS_AND_CHANGE_MAP.md` and `STANDARD_COMPLIANCE_MAP.md` mapping **every current mandatory/relevant [S]/[R] item to an implemented protocol section and eventual evidence file**. Flag any exceptions; do not silently waive them.
2. Implement the new independent engine and CLI with audited rule semantics. Run sealed parity, causal-data, accounting, one-family-identity and execution-stress tests, plus non-regression checks on daily D1 and the completed Intraday D1. Do not alter existing sealed files.
3. Pilot throughput and memory safely, then **freeze the new study protocol** from the template: families/ablations, search grids, risk budget, roles/primary formula, both search lanes and incumbents/fallbacks, cost models, candidate diversity, budgets (proposals *and* evaluations), neighborhood geometry/fidelity, earlier folds/door order/sequential verdict, extension/stopping policy and resource contract. Commit its freeze and the adoption manifest; rerun preflight as required.
4. Run inexpensive L0–L5 fixed-vector ablations on **eligible development bytes** only; keep controls informed and separate from independent discovery.
5. Run the **earlier-cutoff repeats** in proper chronological sequence. For C19, seal/commit selection before opening its slice; repeat for C21 and C23, each with the same search budget and frozen rule. Record failures and sequential verdict. Preserve independent vs informed labels.
6. Run full **C24 (2016–2024)** searches in protected F1–F4 strata with independent discovery and informed refinement. Use Sobol/LHS, NSGA-II, 16→64→128 rungs, local refinement, protected centre-profit promotion, selection and independently seeded confirmation. Preserve candidate archives and the qualified Pareto frontier.
7. Freeze/seal/commit C24 selection, mandatory roles and **up to 12 distinct** candidates (plus any predeclared small diagnostic set). Freeze validation families before opening the validation door. If nothing qualifies, do not reinterpret diagnostics as the primary.
8. **Open validation once** through the authorized door, run the frozen candidates/controls continuously from historical warm-up through the measured common complete endpoint, and calculate 2025, partial 2026, aggregate validation, continuous DD and reset DD. Do not reselect, retune, change ranges, change rules or use validation failures to justify additional search.
9. Produce only written Markdown and machine-readable outputs; verify all seals and preflight requirements; preserve negative results, test failures, amendment history, worktree status and exact reproduction commands. Recommend **a separately authorized Phase 2** only if evidence warrants it. No GDX, combining with daily D1/Growth, browser-run optimization, Strategy Lab report integration, new rules or live deployment in this study.

## 9. Deliverables and acceptance checklist

Deliver in `research/intraday-dip-recovery-vgt/` (names may vary only when justified by repository conventions):

- `PROTOCOL.md` based on the current official template, `STANDARD_ADOPTION.json`, `STANDARD_COMPLIANCE_MAP.md`, `AMENDMENTS.md`, `EXISTING_FINDINGS_AND_CHANGE_MAP.md`.
- All pinned data-door manifests, preflight outputs, sealed test/parity results, `seals.jsonl`, door access log, cutoff selection freeze records, C24 frozen primary/roles/shortlist and versioned hashes.
- A tested standalone runner in `src/intraday-dip-recovery/` with causal OHLC execution, reproducible CLI, fixed notional, split handling, transaction friction and interest.
- L0–L5 ablation results, F1–F4 independent/informed search archives, budgets/proposal/evaluation counts, Pareto candidates and a **truly diverse** phenotype catalog.
- Earlier C19/C21/C23 search-and-selection results and sequential chronological procedure verdict; 2025–2026 once-only validation records; native and harmonized controls.
- `REPORT.md`, `REPORT_TABLES.md`, per-year and per-trade CSV/JSON, `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`, resource/throughput and resume-test evidence, and a **Markdown-only** net-profit-versus-max-minute-DD comparison.

**Acceptance conditions** (check all, not a substitute for preflight):

- [ ] No existing D1, Intraday D1, Study 8, Growth or Strategy Lab implementation/frozen record modified.
- [ ] Correct current standard version/hash adopted, protocol template used, mandatory preflight succeeds, governance and resource safeguards documented and exercised.
- [ ] Core has **unconditional protective trailing stops**, **same-period exits**, **minimal H/U OFF**, **continuation OFF**, with F2–F4 comparisons isolated.
- [ ] Primary maximizes **actual development net**, with hard **≤$35,000 minute DD** on fixed $100k; no arbitrary activity, annual-profit or biggest-winner vetoes. Roles, qualified four-objective Pareto set and required neighborhoods/confirmation are present.
- [ ] Center-profit promotion capacity and F1–F4 structural coverage are protected, with distinct candidate/ledger identity and no forced number of winners.
- [ ] C19/C21/C23 search/selection repeated and selections committed before slices; 2016–2024 C24 selection frozen before any new-candidate 2025–2026 results; no tuning from validation.
- [ ] Stress tests, causal fills, drawdown/interest accounting and historical capacity limitations are explicit.
- [ ] All required tail-risk / perturbation **report-only** statistics included without becoming unapproved ranking or veto inputs.
- [ ] All research outputs are **Markdown text/tables and JSON/JSONL/CSV only**; no charts or visual artifacts.
- [ ] The outcome is honest even if **no qualifying or economically attractive candidate** is found; no unsanctioned follow-up research.

**If a mandatory requirement is impossible with the present repo or environment:** preserve a precise blocker record and stop that dependent phase; do **not** claim compliance, omit the requirement quietly, downgrade a gate, or fabricate results.
