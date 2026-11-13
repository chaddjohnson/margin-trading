# Claude Code — Assignment 1: New L0 Risk-Aware Successor Research Foundation

## Mission and authorization

Prepare the foundation for a later, substantial research program seeking a **more risk-robust successor** to the frozen **“New L0 primary: VGT + GDX”** shared-capital strategy.

This assignment has **two deliverables**:

1. **Adopt the approved, narrowly scoped Optimization Standard 2.2.0 updates** motivated by the walk-forward robustness investigation.
2. **Specify, implement, and rigorously test three optional D1 risk-control mechanisms** in an isolated research-capable implementation, preserving exact original behavior when the new features are disabled.

This is **Assignment 1 (Foundation)**, not Assignment 2 (exit-family and candidate-selection experiments) or Assignment 3 (full joint optimization and successor nomination). **Do not launch genetic optimization, large parameter searches, walk-forward re-optimization, or the TSLA/MSFT studies.** Do not replace or deploy New L0. Do not silently modify any existing frozen research protocol or artifact.

Complete the code, documentation, unit/integration tests, parity evidence, and reproducible handoff report. Do not stop after writing a plan, unless a material blocker prevents safe implementation.

First read `CLAUDE.md`, the current `OPTIMIZATION_STANDARD.md`, `docs/research/methods/NEW_L0_METHOD.md`, and the relevant D1, Growth, pooled-allocator, execution, research, and testing documentation. Verify actual repository state and paths before modifying anything; names mentioned in this brief are leads, not proof of current implementation details.

## 0 — Establish provenance, scope, and a safe working environment

Locate and inspect the completed diagnostic study (expected near `research/vg-l0-walk-forward-diagnostic/`), particularly its `REPORT.md`, `PROTOCOL.md`, `AMENDMENTS.md`, and supporting evidence. The study identified:

- Historical walk-forward procedures selecting portfolios whose drawdowns exceeded the **$35,000 per $100,000 fixed-slot research ceiling**, notably around the 2020 crash and 2022 bear market.
- Concentration of training profit in open positions, large subsequent give-backs, and insufficient chronological robustness despite apparently stable training parameter neighborhoods.
- D1's existing **profit-conditional trailing-stop policy**: underwater positions may have no protective price stop before maximum hold.
- No demonstrated implementation/accounting defect in the audited historical engines.

Distinguish the **frozen New L0 candidate's historical backtest** from the **failure of earlier-cutoff procedures to select robust candidates**. Do not claim the frozen New L0 itself failed those walk-forward selection tests.

Confirm New L0's exact three active books and configuration:

- D1 VGT.
- D1 GDX.
- Growth VGT.
- One shared funded capital slot with historical allocator ordering, execution, and accounting rules.

GDX Growth is **not** an active book in this study. Historical maximum-hold semantics are **calendar days**, not trading sessions. The previously researched shadow-entry eligibility filters must remain **OFF** for all parity and successor-foundation work.

Record the baseline's source revision, data/config hashes, strategy/allocator versions, accounting assumptions, and deterministic reproduction commands. The historical reference reported approximately **$479,605.18 net** and **$20,385.99 minute maximum drawdown** on the full 2016–2026 dataset with one $100,000 fixed-capital slot; independently verify against the exact applicable frozen artifacts and hashes rather than forcing these numbers onto a mismatched dataset or evaluation window.

Work on a **dedicated research branch/worktree** where practical. Check for concurrent sessions, working-tree changes, untracked files, shared services, and output-path collisions before making edits. Do not overwrite or repin historical archives, update existing sealed results, rewrite Git history, or merge experimental engine code into `main`. Keep any documentation integration into `main` separately scoped and follow repository review/branch rules.

## 1 — Adopt Optimization Standard 2.2.0, with evidence provenance

The walk-forward diagnostic proposed a **narrow, minor standard update**; the user has approved these diagnostic/governance safeguards. Inspect the existing standard and reconcile with any changes made after the diagnostic.

### 1.1 Chronological qualification and consequences

Clarify the existing chronological verdict requirement (refer to §1.8 or its current equivalent). Require each new optimization protocol to **precommit, before searching**, what happens if its independent chronological selection procedure fails.

Default interpretation: **“no chronological support; not a deployment-qualified candidate without an explicit user decision.”** A study can legitimately return *no qualifying candidate*. Distinguish genuinely independent chronological selection from incumbent-informed lanes whose seeds were selected using later history; the latter must not claim independent earlier-cutoff support.

Do not retroactively declare frozen prior studies compliant with new requirements, or change their historical labels.

### 1.2 Required exposure and next-period diagnostics

Add the equivalent of the diagnostic study's proposed **§5.9 [R] Chronological exposure disclosure**. For earlier-cutoff selections and final candidates, require reporting of:

- Open-lot unrealized value/profit **as a fraction of training net** at each cutoff, with denominator conventions and zero/negative-net handling made explicit.
- Largest open lot's **market-value / original fixed-principal multiple** at the cutoff.
- That lot's subsequent give-back, including actual price path and exit if available.
- Distribution of per-lot maximum adverse excursion (MAE) and adverse loss severity.
- **D1 maximum-hold-window tail stress**, drawing on declared, disjoint historical reference data where available (or transparently labeled proxy/stress data if genuinely disjoint data are unavailable).
- **Training-selection parameter neighborhood evaluated on the following chronological slice**, with its subsequent drawdown-ceiling breach fraction. This is diagnostic and must not be misrepresented as proof of prospective robustness.

Make the new exposure and risk diagnostics **report-only initially**, not automatic fitness adjustments or numerical rejection gates. No post-hoc threshold is authorized by this task. The chronological qualification consequence is governance; keep it distinct from introducing new optimization objective weights.

Describe evidence limitations plainly: 2020/2022 and 2025–2026 have already been studied, so retrospective stress analysis is not a pristine holdout. An unchanged historical $35,000 drawdown threshold is a research criterion, **not** an enforceable future loss limit.

### 1.3 Versioning and documentation

Version the standard to 2.2.0 **only if that is the next appropriate version**, following its actual semver/adoption rules. Update companion protocol templates, adoption instructions, preflight checks/tests, index/roadmap references, and changelog as necessary. Preserve `[M]`, `[S]`, and `[R]` classifications and avoid unintended stricter requirements.

Do not rewrite `NEW_L0_METHOD.md` to falsely imply that these newer safeguards were used when New L0 was originally discovered. It should remain a faithful historical methodology record.

Version/review the documentation as an auditable change. If documentation-only integration into `main` can be performed cleanly under repository policy, do so without pulling in experimental engine code; otherwise leave a clean documented PR/branch for integration. Never force a merge or compromise other sessions' changes.

## 2 — Specify three independently configurable D1 risk-control mechanisms

Implement each as an **explicit optional rule/configuration**, separately configurable on **D1 VGT** and **D1 GDX**. Preserve VGT Growth's existing rule family and all existing shared-capital allocation and entry-eligibility behavior.

The design must be **small, interpretable, causally computable, serializable, and eventually optimizable**. Stage 3 will optimize and evaluate these configurations; this assignment merely establishes correct mechanics and realistic executable semantics.

Before coding, inspect original D1 state machines and document exact rule precedence, existing material-loss/lower-price re-entry protections, continuation, drawdown episode handling, maximum-hold exits, break-even/net-profit stop behavior, and available real execution-price fields. Reuse their source-of-truth state transitions where possible; do not create divergent strategy engines.

### 2A — Optional unconditional protective loss stop

- Toggle: `OFF` by default; enabled stop threshold must be explicitly configurable.
- Works **regardless of whether the trade has ever been profitable**. It must protect underwater positions in addition to, not be confused with, the existing profit-conditional trailing stop.
- Use an explicit, stable threshold definition (for example, percent below the **actual funded entry execution price**), with validated units, inclusive/exclusive boundary semantics, and per-position immutable or documented adjustment behavior.
- State precisely whether fees and accrued interest affect trigger conditions; the price-trigger definition and *net* P&L accounting must not be conflated.
- Do **not** assume a guaranteed fill at the stop price. Model gaps and price-through-stop execution consistently with the existing bar/tick resolution and documented engine convention. Where OHLC bars do not determine the ordering of multiple intrabar triggers, adopt a deterministic conservative rule and document the limitation.
- Evaluate interaction with existing profitable trailing stops, loss-buffer exits, maximum hold, continuation, and re-entry restrictions.
- Log protective-stop triggers and actual fill reasons distinctly from legacy trailing-stop and maximum-hold exits.

### 2B — Configurable maximum-hold policies

Support three research modes, in addition to retaining any prior experimental code without changing its behavior:

1. **Legacy fixed calendar-day maximum hold** — exact old behavior and default.
2. **Disabled maximum hold** — valid **only when unconditional protective loss protection is enabled**; validate that combination at config and runner boundaries. This still does not guarantee a bounded future loss or bounded time in market.
3. **Bounded adaptive maximum hold** — a simple, explicitly defined causal policy with finite minimum and maximum calendar-day bounds, an interpretable small parameter set, and a recorded rule for when the effective deadline is determined or updated.

For adaptive mode, first inspect existing research concepts and select **one defensible minimal policy** rather than inventing many new subfamilies. Define its input measurements, lookback, unit, calculation, bounds, rounding, warm-up behavior, and deadline precedence in the design document *before* implementing it. If volatility, returns, or price recovery are used, only information observable at the decision instant may influence the deadline. Keep a finite outer bound and no lookahead. Do not pretend this policy has demonstrated profitability or risk reduction; optimization and evaluation come later.

Retain calendar-day semantics for the original rule and for any new adaptive policy's day counts unless the design explicitly records another unit. **Do not turn this assignment into another trading-session-versus-calendar-day study.** Interest accrues on calendar days under the existing financing model regardless of hold policy.

A maximum-hold exit may depend on the existing D1 rule's state (for example, losing at expiry). Preserve that **legacy condition exactly in legacy mode**. Specify the corresponding condition and precedence for experimental modes rather than silently changing a loss-only exit into an unconditional exit.

### 2C — Optional prolonged-decline repeat-entry restriction

- Toggle: `OFF` by default.
- Aim: reduce **repeated D1 attempts and maximum-hold losses during a sustained decline** without requiring future knowledge of whether the decline has ended.
- **Inspect existing material-loss, lowered-price re-entry, tracked-high/retrace-reset, and continuation rules first.** Avoid reimplementing an already equivalent restriction or accidentally disabling legitimate profitable continuations.
- Introduce one **minimal, explicit, bounded, causally observed decline-episode state machine** or a clear extension to an existing one. Specify episode start/end, reference peak/trough handling, allowed repeat-entry count or cooldown/recovery eligibility, reset conditions, persistence across funded/shadow/not-funded events, and interactions with existing D1 restrictions.
- Make the minimal structural choice and required thresholds separately configurable for each D1 book, with validated ranges/units. Do not add unbounded conditional parameter families.
- Protect against lookahead, double-counted declines, premature episode resets, or permanent lockout following ordinary market fluctuations.
- Log why an entry is permitted or blocked and which gate controlled the decision.

This is an **entry restriction**, unlike the two exit mechanisms; retain it explicitly in scope even though the research program is often called “D1 exit-risk controls.”

### 2D — Allowed structural combinations and backwards compatibility

The later study is expected to compare at least:

- **A: Legacy D1** — fixed calendar-day hold, protective stop OFF.
- **B: Protected D1** — fixed calendar-day hold, protective stop ON.
- **C: Stop-protected unlimited hold** — maximum hold OFF, protective stop ON.
- **D: Bounded adaptive hold** — adaptive hold, protective stop ON.

The prolonged-decline restriction is an independently configurable ON/OFF dimension for each D1 book. Permit VGT D1 and GDX D1 to use **different** policies and parameters. Growth VGT remains unchanged. Future research can choose which structural combinations to optimize; **do not run that research now**.

For exact legacy compatibility, new fields must be absent or default to the existing behavior without altering old parsed files, hashes, output identities, or the frozen phenotype definitions. Do not make old JSON configurations invalid. If adding structural fields affects canonical serialization or fingerprinting, provide versioned behavior or a migration-safe path without disabling historical integrity checks.

## 3 — Correctness: chronology, fills, accounting, and state interaction

Implement exhaustive deterministic and synthetic tests, then narrow historical regression cases. Treat the following as **acceptance criteria**, not optional nice-to-haves.

### 3.1 Execution realism

- Stops hit intraday; gaps across stops at the open; prices moving through stops before an exact stop-price print; no future-bar information.
- Simultaneous protective stop, trailing stop, maximum-hold expiry, and any queued execution. Define precedence and the first causally executable exit.
- No execution on unavailable market minutes; deal explicitly with NYSE holidays, weekends, shortened sessions, missing prints, boundary timestamps, and split-adjusted data.
- Explicit stop threshold equality, rounding, prices before/after adjustment, and conservative resolution of ambiguous OHLC ordering.
- Apply the existing 5 bps per side baseline friction and **11% simple interest on calendar days** using the original engine's conventions. Reconcile gross P&L, interest, friction, net P&L, mark-to-market values, and minute-level portfolio drawdown.
- Check that a protective stop reduces risk *in modeled paths* where it should, while demonstrating with synthetic gaps that it **does not guarantee** a maximum dollar loss.

### 3.2 D1 state and allocator interaction

- Continue to respect the profit-only activation of the legacy trailing stop.
- Material-loss restrictions and lower-price re-entry after protective-stop losses, including threshold boundaries.
- Post-profit continuation eligibility, window timing and expiration, and exit-reason dependencies.
- Tracked-high, recovery reset, re-entry episodes, and state changes after a stop, hold, or adaptive exit.
- Multi-entry decline episodes and duplicate signals; entry restrictions during a prolonged decline.
- Two independently configured D1 books competing for the same pool with VGT Growth; no double funding, no unintended allocator priority change.
- Correct accounting at open positions, boundaries, and shared-capital transitions.
- Shadow-entry eligibility remains OFF; no implicit delayed-entry mechanism may be introduced.

### 3.3 Parity and reproducibility gates

1. Run existing unit/integration suites and targeted new test suites.
2. With all new controls in their default/legacy state, reproduce **the entire funded trade list**, entry/exit instants and prices, exit reasons, gross/net results, minute drawdown, and allocator reject/fund decisions for the frozen New L0 reference. Require exact parity within the original engine's deterministic precision; do not treat merely matching final net as sufficient.
3. Compare original and updated engines on multiple representative historical slices and synthetic boundary scenarios, including extended losing holds.
4. Verify replay determinism across repeated runs, serialization/import, config round trips, and per-book independent settings.
5. Verify that existing frozen research commands still work against their original pinned revisions and that no historic output or code digest was rewritten to conceal differences.
6. Demonstrate each non-default mode with a deterministic executable example and expected exit/blocked-entry record. These are *correctness demonstrations*, not performance claims.

If exact parity fails, stop and diagnose before proceeding. Do not change the legacy engine to accommodate an experimental mode by altering frozen outcomes.

## 4 — Documentation and pre-registration for later studies

Create an implementation/design document that covers:

- Why the three mechanisms exist and what the diagnostic evidence actually supports.
- Every config property, valid combination, defaults, thresholds and units.
- The causal state machines, stop/hold/episode transitions and execution chronology.
- Exit and entry-gate event logs and output schema.
- How protective stops, adaptive holds, and prolonged-decline restrictions interact with D1 continuation and existing restrictions.
- Expected research configuration families (A–D plus entry gate), without prematurely declaring any family superior.
- Counterexamples and limitations: gap risk, indefinite possible holding under stop-only policies, market regime shift, mark-to-market exposure growth, and previously inspected validation data.

Also produce an **Assignment 2 research design / handoff**, not a completed optimization. It should identify:

1. A structurally fair comparison that allows **each** exit family and entry-restriction state to receive its own appropriately optimized numerical parameters (not merely transplanted New L0 values).
2. A first broad, balanced structural coverage stage followed by sufficiently funded qualification and focused refinement, with the total effective budget and stopping rules to be formally precommitted before searching.
3. How to compare old versus proposed **risk-aware candidate-selection methods using the same candidate populations**, separating ranking improvements from strategy-mechanics improvements.
4. How to preserve the NL0 Priority 3B broad-search and Priority 5B refinement procedures as references while handling new discrete structural genes; no silent changes to their historical methodology.
5. A later **joint portfolio optimization** of VGT D1 + GDX D1 + VGT Growth, with independent D1 risk-control structures, and an informed and fresh exploration component so inherited parameters do not unfairly dominate.
6. Walk-forward folds, regime/tail stress tests, training-neighborhood-on-next-slice diagnostics, open-profit concentration, and chronological verdict consequences.
7. How to compare qualified candidates against the **frozen New L0** profit/drawdown frontier and preserve a credible “no qualifying successor” outcome.
8. Why existing historical data, including 2020/2022 and previously examined 2025–2026, provide useful retrospective evidence but **cannot become a genuinely untouched future holdout** by relabeling dates.

**Do not choose binding new risk thresholds, optimization weights, or a winner in Assignment 1.** Those choices belong in later precommitted research protocols, informed by this foundation and reviewed separately.

Keep the TSLA/MSFT optimizations and the Strategy Lab drag-to-measure chart bug out of scope. They remain separate planned tasks after the risk-methodology work.

## 5 — Deliverables

Produce at least:

1. **Standard 2.2.0 change record:** exact changes, classifications, rationale, migration/adoption instructions, tests, and safe integration status.
2. **Baseline reproduction manifest:** version hashes, datasets, costs, executed commands, original New L0 trade/metric parity evidence.
3. **D1 risk-control specification:** full public/internal configuration schema and the three mechanisms' exact causal semantics.
4. **Implementation:** research-isolated code, configuration validation, version-safe backward compatibility, instrumentation and diagnostic events.
5. **Test report:** results of automated tests, synthetic execution/gap scenarios, state transitions, legacy non-regression, and exact pooled baseline-parity checks.
6. **Assignment 2 handoff/protocol draft:** options and fair research design, but **no** executed optimization.
7. **Reproducibility instructions:** paths, commands, Git commits, artifact hashes, known limitations, and steps to resume on Apollo.
8. **Concise final summary:** what was changed, what was deliberately unchanged, whether all acceptance gates passed, unresolved blockers, and precisely what requires user approval before Assignment 2.

Commit and push completed work according to the repository's conventions when safe. Keep documentation-only changes eligible for clean integration into `main`; keep experimental D1 engine changes isolated on the research branch pending explicit review. Never silently deploy, promote a new phenotype, or alter production trading behavior.

### Mandatory constraints

- **Only Assignment 1:** standards + implementation + verification + handoff, **no optimization searches**.
- Original New L0 parameters, calendar-day behavior, allocator, data, costs, and recorded results remain immutable.
- Growth VGT logic stays unchanged; no GDX Growth; no shadow-position delayed-entry changes.
- Protective stop OFF, original fixed calendar hold, and decline-entry restriction OFF reproduce historical behavior exactly.
- Unlimited-hold mode requires enabled unconditional protective stop.
- Bounded adaptive mode uses a documented causal rule with finite cap; no hindsight or ill-defined time units.
- Protective stops are not guaranteed loss caps; realistically model gaps and actual fills.
- Correct D1 continuation/re-entry, reset, and material-loss interactions are required.
- Existing optimization integrity, protocol/version pins, and validation restrictions must not be weakened.
- Standard 2.2.0 adds reporting and qualification governance; it does **not** preemptively impose new numeric objective weights or tail-risk gates.
- All experimental work is isolated and fully reproducible; never replace or deploy New L0 automatically.

**Success criterion:** A future Claude session can take the validated configurable D1 risk-control implementation and the approved research-standard update, then conduct fair, thoroughly optimized, risk-aware comparisons **without guessing at mechanics, damaging historical controls, or mixing research results with unverified code changes**.
