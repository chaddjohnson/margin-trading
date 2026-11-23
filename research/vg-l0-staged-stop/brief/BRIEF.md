# Claude Code — Priority 4: Staged Trailing Stops, GPU Implementation and Rigorous Joint Optimization

## Mission and authorization

Implement and rigorously evaluate the **minimal S1 two-stage, profit-activated trailing-stop mechanism** proposed by the completed Priority 3 audit. Perform the required CPU/GPU engineering, acceptance, fixed-parameter ablations, paired independent optimization, informed searches, chronological and neighborhood qualification, and final research reporting.

This **authorizes Priority 4 research execution**, subject to mandatory correctness and protocol-freeze gates. It does **not** authorize adopting a phenotype, modifying frozen research results, merging experimental engine changes into `main`, deploying trades, or sending orders to a broker.

The user has approved the audit's recommended S1 design, independent controls for all three active books, the engineering-first approach, and substantial computational effort where it increases the quality of evidence. Do not use available compute merely to exhaust a time allowance. If the mechanism fails to help, **keeping it OFF is an entirely valid result**.

**Read the complete brief and every applicable repository instruction before writing code or running evaluations.** In particular, read `CLAUDE.md`, the current `OPTIMIZATION_STANDARD.md` (GPU-required version 3.0.0 or its verified successor), `docs/research/methods/NEW_L0_METHOD.md`, `docs/gpu/PARITY_CHECKLIST.md`, and the full Priority 3 handoff in this order:

1. `research/vg-l0-trailing-stop-audit/READ_FIRST.md`
2. `research/vg-l0-trailing-stop-audit/DECISION_REGISTER.md`
3. `research/vg-l0-trailing-stop-audit/AUDIT_REPORT.md`
4. `research/vg-l0-trailing-stop-audit/STAGED_STOP_DESIGN_OPTIONS.md`
5. `research/vg-l0-trailing-stop-audit/GPU_PARITY_AND_INTEGRATION_PLAN.md`
6. `research/vg-l0-trailing-stop-audit/PRIORITY4_RESEARCH_PROTOCOL_PROPOSED.md`
7. `research/vg-l0-trailing-stop-audit/SOURCE_MAP.md` and `VERIFICATION_REPORT.md`
8. The applicable Stage B P0/P3 research, final diagnostics, Assignment 3 parity fixtures and frozen baselines.

Verify the **current** Git ancestry, source files, GPU acceptance record, dataset fingerprints, archived results and optimization standard. The audit's source references were grounded at commit `48090c55`; do not assume it is still `HEAD`. If later repository changes alter the applicable behavior, reconcile the differences explicitly rather than silently applying an obsolete specification.

---

## 1. Fixed research scope and immutable controls

The three independently simulated strategy books are:

- **VGT D1** (Dip Recovery).
- **GDX D1** (Dip Recovery).
- **VGT Growth**.

They share **one exclusive funded-capital slot**. **GDX Growth stays OFF.** Do not add TSLA, MSFT, other securities or a broader ETF search.

Preserve the current shared-capital allocator, ordering and priority rules, signal/entry mechanics, continuation and re-entry rules, financing and transaction costs, strategy risk controls, and calendar-day maximum-hold semantics. The reference conventions remain a $100,000 fixed funded slot, 5 bps per side and 11% simple margin interest, subject to verifying the frozen research configuration.

**P0 remains the reference risk methodology:** maximum marked-to-market drawdown of **35% of the initial trading allocation** (equivalent to $35,000 at $100,000), with all existing standard neighborhood and qualification gates. **P3 (40/25/30) and other alternative risk envelopes remain unadopted.** Report individual principal loss, banked-capital drawdown, and profit giveback separately; do not substitute them for or silently alter the binding P0 gate.

Frozen comparators:

- **New L0**, the official reference (staged OFF).
- **N/original**, the preferred research challenger (staged OFF).

The previous full-history New L0 result was approximately $479,605.18 net and $20,385.99 maximum drawdown; N/original was approximately $482,700.73 net with the same maximum drawdown. Verify exact sealed values and all pertinent trade/funding records before the new search. **Neither comparator is to be edited, replaced or adopted automatically.**

All research periods through 2026 have previously been inspected. Use historical folds rigorously but never describe them as pristine out-of-sample evidence.

---

## 2. Implement only S1 — a later, tighter trailing-stop stage

Use **one additional optional tightening stage per book**, with independent ON/OFF toggles and two new numeric parameters per enabled book:

- `A`: **gross price-appreciation threshold** relative to that position's raw entry fill; measured against the existing post-entry high.
- `tau2`: the tighter second-stage trailing distance, expressed as a percentage of that same high.

The **existing trailing distance `tau1` is already an optimizable gene**, not a replacement or an additional duplicate parameter.

For entry-fill price `e`, post-entry high `H(s)` and currently raised trailing level `L`:

```text
activationPrice = e * (1 + A)
armed(s) = armed(s-1) OR (H(s) >= activationPrice)
tauEffective(s) = armed(s) ? tau2 : tau1
L(s) = max(L(s-1), H(s) * (1 - tauEffective(s)))
```

Implement with the precise existing engine's rounding, unit encoding, ordering and state conventions. The stage-2 mode must be **latched once armed**, must never lower an already established stop, and must reset for every new position.

### Approved S1 semantics

1. Use the existing price-high anchor and **once-per-session ratchet**: recompute after entry and at each subsequent session close; the raised level takes effect **the next session**, never retroactively in the session whose high armed it.
2. Arm using **gross price appreciation**, independent of interest, but **retain the legacy net-profit stop eligibility test**. An armed stop can remain ineligible or become ineligible again as interest accrues; do not silently create a new protective-stop rule.
3. Use the **H-anchored transition (P-a)**. When stage 2 is armed after a session that closes below the newly raised level, a placement exit at the following open is possible and must be recorded separately.
4. Keep existing exit reasons (`trailing stop`, `trailing stop gap`), gap-through-stop execution, order of exit candidates, stop slippage behavior and capital-pool event ordering.
5. Require a **strictly tighter** stage 2 (`tau2 <= tau1 - 0.5 percentage point` after canonical repair) and validate `(1+A)*(1-tau2) > 1+c`, with `c` the relevant entry-cost convention. Exclude the *early-lock* region below the existing implied activation threshold for this first study, as recommended by Decision D7; define the threshold/rounding unambiguously in the protocol. Avoid accidentally dropping genuinely valid settings due to floating-point equality; test boundaries.
6. For Growth's **retention/partial-sale** mechanism, the staged level applies to the `full` stage. The first qualifying trailing event may execute the partial sale; the retained remainder follows its existing SMA exit and must not be governed by the staged level.
7. Preserve D1 continuation behavior, deep-entry rearming, material-loss restrictions, lower-price re-entry, recovery reset, optional RC initial/protective stops, adaptive/disabled holds and decline gate. A staged profitable exit continues through these unchanged existing state transitions.
8. Preserve Growth initial ATR protection, losing-maximum-hold options, trend exits and existing eligibility rules.
9. Keep the staged mechanism independently switchable for all three books; **OFF must exactly reproduce current behavior** for any configuration, including older versions, research keys and Strategy Lab simulation.

### Initial parameter domains (freeze before search)

Use the audit's proposed domains unless a verified incompatibility requires a documented, pre-search amendment:

- Activation `A`: **5%–50%** price appreciation, screened on the audit's prescribed grids, with fine refinements; additionally enforce the no-early-lock constraints above.
- Stage-2 distance `tau2`: **1.5% through `tau1 - 0.5 percentage point`**, with the audit's D1 tenths and Growth precision/grid conventions and deterministic repair.
- Mode: `{OFF, ON}` independently for each book, with inactive numeric genes **masked in canonical identity, perturbations and cache keys** when OFF.

Do not add a third stop stage, ATR-based tightening, retained-profit percentage floor, time-based tightening, dollar caps, earlier stop activation, intraday entry-session exits, staged partial sales, or new structural features in this assignment. Those are separate hypotheses.

---

## 3. Engineering-first implementation, isolation and identity

Follow the Priority 3 `GPU_PARITY_AND_INTEGRATION_PLAN.md` and the then-current source architecture, using the smallest clean design that retains CPU/GPU parity and all existing capabilities.

Prefer an additive pure staged-stop rule module shared by both families, a versioned D1 risk-controls RC 3 implementation, and a versioned Growth 1.5.0 implementation with an **explicit Growth 1.4.0 OFF-parity fixture**. The Priority 3 audit suggests book hooks immediately after the existing `onEntry` and `afterSession` processing to avoid rewriting the frozen `ExitManager`; verify this is semantically correct for all current manager variants.

- Preserve older research implementations, file hashes and sealed artifacts; do not weaken historical integrity checks. Older frozen studies must be reproducible at their pinned revisions when the working code fingerprint changes.
- Implement robust structural validation, canonical encoding, stable candidate IDs, masked unused genes, cache-key separation and correct serialization/deserialization.
- OFF must preserve all existing IDs and ordinary evaluation outputs wherever the canonical OFF configuration was previously valid.
- Record staged **arms**, **staged exits**, **placement exits**, and for detailed diagnostics the arming instant, stage-1/stage-2 stop levels and executed exit level. Do not mislabel a hypothetical protected-profit difference as realized incremental P&L.
- Keep Strategy Lab's existing CPU simulation and UI operational. Do not introduce new Strategy Lab controls unless separately necessary for correctness; expose staged controls in its UI only after a later adoption decision.

### CUDA and GPU integration

S1 changes the trade-exit evaluation, so the GPU backend **must** receive an actual equivalent implementation, not approximate the result or refuse selected ON cases without reporting an explicit blocker. Follow the verified integration plan for input layouts, candidate encoding, D1/Growth feature/capability bits, state fields, protocol version negotiation, host-level validation and GPU diagnostics. The audit proposes a protocol v3 change and a small common device function called at the D1/Growth entry and session-close sites; confirm actual struct layouts before implementing.

Preserve:

- The authoritative CPU reference evaluator.
- Official GPU evaluation via `openOfficialGpuSession` → `GpuPool` → `EvalLab`, **GPU-required, fail-closed, no silent CPU fallback**.
- `node --no-maglev` for every applicable evaluating process.
- Binary64 operations and matching CPU operation order/semantics (`--fmad=false` where required); no reduced-precision approximation that changes trade decisions.
- Deterministic batch ordering, fixed seeds, resume/checkpoint identities, cost/interest accounting and all existing backtest features.

**Any source or evaluation-manifest modification that invalidates the existing GPU acceptance requires the full renewed acceptance cycle** and an external acceptance pin. It is not permissible to reuse a stale acceptance record merely because the binary still runs.

---

## 4. Hard engineering gates — no official staged research until all pass

**E0 — Verify approved scope and freeze engineering specification.** Read the audit's D1–D17 decisions and encode their recommended S1 defaults as the authorized experiment. Pre-register precise numerical domains, boundary handling, identity rules, structural combinations, stress behavior and exit precedence. Record and justify any deviation before viewing research outcomes.

**E1 — CPU reference and legacy parity.** Implement the S1 CPU mechanism; test the complete D1, RC 1/RC 2, Growth 1.4.0 and pooled OFF fixtures. Prove exact historical trade, net, risk-record, marker, signal and funding chronology reproduction. Include New L0 and N/original controls.

**E2 — CUDA parity backend.** Implement all required S1 D1/Growth paths, domain encoding, feature flags, versioned protocol/layout and error handling. Build and run synthetic tests for arming exactly at threshold, one-ULP boundary, daily ratchet, gaps, placement exits, interest lapse, early-lock rejection, exit precedence, retention, hold interactions, split invariance and every ON/OFF combination.

**E3 — Full parity and reliability campaign.** Run the authoritative acceptance-checklist campaign, including at least **100,000 seeded random configurations** with ON/OFF strata, threshold/domain edges, independent datasets and historical doors. Verify candidate-level trade decisions, execution prices, interest, costs, funded-lot chronology, principal-loss and banked-capital metrics, conventional DD, fitness values and qualification outcomes. Include memcheck/racecheck/initcheck/synccheck, adversarial and tamper cases, invalid capability/protocol rejection, deterministic batches and worker counts, checkpoint/resume and fixed-seed mini-optimization on CPU versus GPU. **No consequential mismatches permitted.**

**E4 — Renew accepted GPU record and regression.** Generate a new `ACCEPTED` record under the appropriate new GPU acceptance study, verify independently and pin out of band; confirm the official gate opens. Run repository tests, all study preflights, Strategy Lab unit/browser/parity checks and sealed OFF-search replays (including Stage B control lanes and the audit-specified older research anchors). Historical OFF identities, trades and optimized results must be unchanged. Existing known unrelated test failures must be disclosed and separated from new failures.

**E5 — Measure workload and freeze final protocol.** Benchmark realistic staged-enabled independent and informed optimization jobs on the accepted GPU; measure throughput, VRAM, worker utilization and end-to-end rate. Only now finalize the search schedule, budgets, extension rule, hard cap, validation doors and exact commands. Precommit protocol, seeds, hypotheses, decision rules and code/data/acceptance hashes **before searching**.

If any gate fails, **stop or repair and fully rerun the affected gates**. Never silently switch to CPU, weaken parity, change the accounting, skip stress cases, or start a lower-fidelity optimization. Report blockers transparently.

---

## 5. Controlled fixed-parameter ablations — isolate mechanism before searching

Using frozen **New L0** and **N/original** phenotypes, test S1 with one book enabled at a time and all three enabled. Use the audit's predeclared factorial (activation `A` in `{7.5%, 12.5%, 20%, 30%, 40%}` and stage-2 distance ratios `{0.30, 0.50, 0.70, 0.85} × tau1`, snapped/repaired to valid grids and constraint rules). Report the invalid/duplicate points rather than silently replacing them.

Run on the development history, with the proposed 10/25-bp stop-slippage and D1 next-open stresses. These are **mechanistic diagnostics**, not permission to select activation thresholds or narrow search domains by inspecting their results.

For every comparison record:

- Exact funded and virtual entry/exit changes; staged arms, stops and placement exits.
- Net profit, conventional marked DD and its decomposition, maximum trade principal loss and banked-capital DD.
- Profit giveback and realized profit retained, clearly distinguishing ex-post peak giveback from realistically realizable profit.
- Margin interest, transaction costs, turnover, occupied/idle capital time.
- Funding displacement: existing trades blocked, newly funded trades and their effects on whole-pool net.
- Individual books and the **complete chronological shared-capital portfolio**, not an arithmetic sum of standalone profits.

The OFF setting must reproduce original baselines identically. **Do not treat an individually profitable earlier exit as portfolio improvement unless the full pool benefits.**

---

## 6. Primary study — substantial paired GPU optimization

Follow the approved Priority 3 `PRIORITY4_RESEARCH_PROTOCOL_PROPOSED.md`, the preserved NL0 optimizer methodology and the current optimization standard. The primary question is whether allowing S1 improves qualified **whole-portfolio** net and risk versus the exact same procedure with S1 forced OFF.

### Two fair search arms

- **CTRL:** All staged switches forced OFF, with the existing original numerical and structural strategy parameter search space.
- **EXP:** Identical original search space, plus three independently selectable S1 toggles and their valid new `A` and `tau2` genes. OFF must remain a protected, selectable outcome.

Both arms use the **same optimization algorithm, screening, islands, advancement, rungs, refinement, qualification, scoring, cost assumptions, risk gates, data access and per-lane budgets**. Allow the original D1 and Growth parameters to re-optimize **jointly** with staged genes, not merely optimize `A` and `tau2` around New L0.

### Independent paired lanes

- **Cutoffs:** C19, C21 and C24; primary outcomes C21 and C24, C19 secondary.
- **Cells:** audit-specified `GA0.VA0` and `GB0.VD1` for the independent comparison. Verify their exact meaning and source fingerprints from the archived protocol. Preserve the independent nature of the searches.
- **Replicates:** **64 matched CTRL/EXP pairs per cutoff** (32 per cell): 128 lanes per cutoff. Shared original genes must use paired screen coordinates/common random numbers; EXP staged genes use separate balanced streams and OFF/ON coverage, as defined in the proposed protocol.
- Reproduce the relevant archived Stage B CTRL lanes for their shared seeds, cells and historical doors where the research configuration is genuinely equivalent. **Do not force false parity across different search definitions.** Document precisely what is directly comparable.
- Protect multiple structural phenotypes and retain OFF in search and promotion. Do not prune the entire staged family because an inexpensive preliminary screen was weak; do not allow the expanded search space to receive a smaller effective budget.
- Evaluate every candidate by complete chronological one-slot allocator replay and existing P0 qualification, including neighborhood/tail constraints.

### OFF projection and mechanism attribution

For every EXP finalist with any staged mode ON, replay the same candidate with individual staged toggles and then all toggles OFF, keeping all other genes fixed. These OFF projections must be eligible for selection under exactly the same qualification gates and must be included in the optimizer's recorded candidate set as prescribed.

Distinguish a **true staged-stop contribution** from search-path improvement caused by a larger domain. Report S1 use frequency, net benefit of ON versus its own OFF projection, changes in exit date/price, later displaced trades, and the number of lanes selecting OFF.

### Incumbent-informed searches — separately labeled

Use predeclared informed lanes around **New L0 and N/original**:

- I1 and I2: staged genes only, with original parameters fixed.
- I3 and I4: staged genes plus the audit-specified interacting exit parameters (existing trailing distance, hold, buffer, Growth initial-stop and relevant RC parameters) jointly refined, with other parameters fixed.
- Use the proposal's **8 independent paired replicates per informed lane type**, C24 development only.

These are useful research diagnostics, **not independent chronological evidence**. Do not let an informed candidate's historical advantage automatically override a weaker independent result.

### Neighborhoods, structural perturbations and stress

Use existing numerical-neighborhood standards and the proposal's staged-gene radii: `A ± 2 percentage points`, `tau2 ± 0.5 percentage point`, with deterministic clipping/repair. Keep categorical switches fixed during numeric perturbations, and test switch ON→OFF separately as a **structural** perturbation. Retain rungs 16→64→128 and independent confirmation (3×128 = 384), subject only to verified current-standard equivalence.

Measure center and neighborhood p90/p95/worst-10%-mean DD, breach frequency above 35% initial allocation, principal loss, banked-capital DD, profit concentration, gap-through-stop slippage, margin interest (including 14%), transaction costs (10/20 bps) and D1 next-open stress. Include realistic adverse execution when more frequent staged exits rely on modeled level fills.

---

## 7. Computational effort and scientific stopping

The audit proposes approximately **9 million requested evaluations**, with a **25 million** hard ceiling and a measured baseline expectation of about 2.5 GPU hours (up to roughly 8 hours if fully extended). These are **budget proposals, not a demand to consume all available compute**.

At E5, use the actual accepted staged GPU binary to estimate a defensible budget. Preserve the audit's primary **64 paired lanes per cutoff**, plus the paired informed lanes and qualification. Allocate compute equitably across arms and cells.

Apply the predeclared stopping and **single symmetric extension block** when more than 25% of lanes in either arm remain budget-bound with triggers still firing, subject to the final authorized hard ceiling. Use checkpoints, identical extension treatment across paired arms and stable candidate/seed accounting.

Report:

- Actual requested/fresh evaluations, cache hits, proposal counts, search stages, wall time, GPU throughput and VRAM.
- Distribution of seed-paired outcomes, per-cell outcomes, early-half versus late-half replicate stability, late-discovered winners and frequency of cap exhaustion.
- Genuine evidence of convergence versus **budget exhaustion** (never use those terms interchangeably).
- The additional compute required to resolve inconclusive differences, if a justified estimate is available.

The user's computational budget is flexible when it improves statistical reliability. **Spend additional work on appropriately precommitted replication or necessary robustness testing, not post-hoc searches aimed at manufacturing a win.** If the audited 25M cap is insufficient for a scientifically credible test, identify and justify the necessary amendment **before** inspecting outcome-dependent validation data. Otherwise stay within the frozen protocol.

---

## 8. Precommitted comparisons, selection and decision rules

Freeze all outcome criteria before official optimization begins. Preserve the proposed definitions unless an explicitly logged pre-search correction is necessary:

1. For each matched lane and cutoff, `D = bestQualifiedTrainingNet(EXP) − bestQualifiedTrainingNet(CTRL)`.
2. C21 and C24 are the primary cutoffs; C19 is secondary. Report paired means, replicate distributions, stratified paired bootstrap intervals and the one-sided 90% lower bound, plus per-cell results.
3. A proposed **material training-profit improvement** requires mean `D >= $10,000` and a one-sided 90% lower bound above zero at **both** primary cutoffs.
4. Test **risk non-inferiority separately**: the proposal's paired +$2,500 limits on center and neighborhood p90 conventional DD, trade principal loss and banked-capital DD, and +2 percentage-point limit on DD breach frequency. Report uncertainty intervals; do not smooth away additional tail risk with a favorable net-profit average.
5. **Mechanism requirement:** EXP finalists must genuinely use S1 and have a positive, causally attributable advantage over their own OFF projections. An ON-selectable search that wins only because it found better ordinary parameters is a *search-path effect*, not proof the staged mechanism helps.
6. **Chronological qualification:** Each fold's selection must be frozen/committed before its next historical slice is opened. Record subsequent-interval results and the default standard's failure consequence: no deployment-qualified candidate after failed chronological gates without the user's separate decision.
7. Use the exact audit protocol's mutually exclusive final outcome labels: **beneficial, trade-off, no material difference, search-path effect, harmful, or inconclusive**. An outcome of beneficial means **worth including in a later successor study**, not automatically safe or adopted.

The EXP domain is a superset of CTRL, so training superiority alone is not decisive. Test stage attribution, risk, paired next-interval performance and neighboring phenotypes rigorously.

Do not optimize search/selection rules after seeing validation outcomes. Do not tune materiality, risk margins, staged parameter domains or bootstrap definitions to force a favorable verdict. A failure is a valid result.

---

## 9. Chronological evaluation and final candidate comparisons

Use the same causal market-data and history-door conventions as existing studies:

- Search and all promotion decisions use only the authorized development slice of each cutoff.
- C19 → 2020–2021; C21 → 2022–2023; C24 → 2025–2026 (through the shared verified endpoint).
- Freeze each fold's selections, identity, seeds, risk rules and code/data hashes before opening its next interval. Open the final period only once after the final selection is sealed.
- All periods have been repeatedly inspected in this research program; label them **retrospective chronological checks**, not untouched forward performance.

Compare full training/validation and annual results for New L0, N/original, CTRL/EXP independently selected fold candidates, informed finalists, and any material structurally distinct alternatives.

Also produce the proposed A/B/C-style decomposition, separately for each frozen incumbent:

- Incumbent with staged OFF.
- Incumbent with finalist's staged genes but otherwise unchanged (no reoptimization).
- Finalist as jointly optimized.
- Finalist projected to staged OFF.

Report full portfolio net, marked and liquidation drawdown, principal-loss risk, banked-capital drawdown, winning-trade giveback, stop-level protection, time spent funded, trade turnover, displacement, gap/placement exits, different market regimes and individual influential trades. **Do not add standalone trade profits to approximate pooled performance.**

Clearly distinguish profits that appear protected at a hypothetical stop level from those that were genuinely realized, and report how often staged stops forfeited the remainder of profitable trends.

---

## 10. Research safety, validation and deliverables

Work on a dedicated research branch/worktree rooted in the verified accepted GPU-enabled repository. Preserve and verify source baseline, current `main`, official GPU acceptance identities, original strategy configurations and all sealed research artifacts.

- Do not merge staged-stop implementation, acceptance changes or selection rules into `main` automatically.
- Do not modify frozen New L0 or N/original research, production strategy configurations, Strategy Lab application behavior or broker interfaces.
- Use only supported and accepted Apollo GPU toolchain; never bypass GPU acceptance or `--no-maglev`.
- Run complete relevant tests and preflights. Preserve failed attempts and justified amendments rather than silently editing frozen protocols.
- Report any incompatibility between the audit and live code; favor exact source semantics and logged corrections.
- Do not erase existing caches, compressed historic archives or research datasets. Temporary scratch must be isolated and verified before deletion. Large GPU job archives may remain on Apollo with verified hashes and a documented recovery path.

### Required research outputs

1. **Executive report:** question, hypothesis, outcomes, recommendation and important limitations.
2. **Rule specification:** stage state, arming/exit timing, constraints, interaction matrix and full exact OFF behavior.
3. **CPU/GPU implementation and verification report:** code identity, feature/version changes, tests, parity statistics, renewed acceptance and external pin.
4. **Fixed-parameter ablation results:** New L0/N/original, independent book toggles and combined toggle, trade/funding changes and stress sensitivity.
5. **Frozen research protocol and amendments:** date windows, seeds, domains, budget accounting, acceptance pins, ranking rules, validation doors and exact commands.
6. **Paired search results:** every lane's outcomes, budget and convergence, full-population census, mechanism ON/OFF projections and selection metrics.
7. **Risk and robustness analyses:** p90/p95/tail/breach, principal and banked-capital risk, giveback decomposition, gap/stop slippage, profitability concentration and chronological performance.
8. **Final comparison and qualified recommendation:** correct outcome label; preserve New L0 and N/original; state if S1 merits Priority 5 successor optimization or should remain OFF.
9. **Reproducibility and recovery:** Git branch/commit, code and data hashes, checkpoint/artifact paths, failure/amendment log, tests and regression outcomes.
10. **Portable, checksum-verified ZIP handoff**, suitable for transfer to the original ChatGPT conversation. Include `READ_FIRST.md` as the first document, a concise decision register, executive and detailed reports, important tables, protocol, acceptance/parity evidence, implementation details, commands, verification and `SHA256SUMS.txt`. Verify every listed checksum after assembly. Exclude enormous data archives, local GPU caches and binaries; refer to them by hash and recovery location. Copy the handoff to the established local handoffs directory if supported.

Commit and push completed research and the portable bundle to the research branch according to established repository conventions. Disclose any uncommitted or deliberately ignored work. Leave `main` unchanged.

### Closing response

State whether all engineering gates passed, how much GPU compute was actually used, the preregistered primary and risk verdicts, whether any benefit is genuinely attributable to S1, what was not done, and whether any follow-up decision is necessary. Link or identify the portable ZIP handoff, and finish with:

**PRIORITY 4 COMPLETE — NO STRATEGY ADOPTED OR DEPLOYED — AWAITING REVIEW**
