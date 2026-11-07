# Priority 1 — Bounded entry eligibility for VG #2 Balanced

## Assignment and place in the research sequence

Implement and evaluate an optional D1 pooled-entry eligibility variant, using Study 8 VG #2 Balanced (VGT + GDX) as the unchanged control. The proposed change preserves a valid entry opportunity that could not receive funding because the shared pool was occupied or reserved. It may enter later, at a current executable price, after capital becomes available.

Complete this first study, deliver its evidence, and stop. Do not automatically start later priorities. The user and ChatGPT will review the findings before commissioning the next study.

The agreed sequence is:

1. **CURRENT:** D1 entry eligibility, initially for opportunities blocked by occupied capital in VG #2 Balanced.
2. Jointly optimize D1 + Growth for VGT in one capital pool.
3. Jointly optimize D1 + Growth for VGT + GDX in one capital pool.
4. Jointly optimize D1 + Growth for GDX in one capital pool.
5. Investigate other ETFs suited to Growth.

**Standing date rule for every priority:** use 2016–2024 exclusively for backtesting, optimization, parameter selection, search refinement and development robustness checks. Use 2025–2026 exclusively for validation of frozen selections. Do not tune parameters, allocation policies, search ranges, ranking weights or qualification rules against validation results. Apply this same split to future joint optimizations and ETF searches. Earlier chronological search/selection exercises must stay entirely within 2016–2024.

Later combined studies must actually use both D1 and Growth. They will use single-family systems as controls, not substitute them for the requested combined architecture. This first study is D1 only; do not add Growth, partial exits, preemption or new trading families here.

## Objective

Determine whether preserving blocked D1 opportunities improves the **actual shared-capital portfolio**, after costs and interest, within a maximum minute drawdown budget of 35% of the fixed $100,000 trading pool: **$35,000**. This is the existing fixed-notional drawdown convention, not 35% of peak account equity. Report any account-equity drawdown separately and label its denominator.

Profit within that risk budget is the central objective. Assess neighborhood stability, chronological performance, exposure and dependence on individual market episodes prominently. Do not require higher profit with equal or lower drawdown to consider a variant useful: show the trade-off. Also show lower-risk choices where available.

Do not reject candidates automatically for a low trade count, a large winner, a fixed minimum profit per year, or unequal VGT/GDX participation. Report uncertainty and perform concentration diagnostics instead. More trades alone is not success.

An honest negative or inconclusive result is acceptable. Do not expand the experiment indefinitely to manufacture an improvement.

## Inspect the repository and reproduce the control

Work in the user's margin-trading repository on Apollo. Inspect its current state and applicable repository instructions. Preserve existing user changes, saved runs, strategy definitions and historical research. Use a dedicated research branch/worktree as appropriate; do not revert unrelated changes or merge into main. Do not deploy or change the user's selected Strategy Lab configuration.

Locate and read the actual Study 8 implementation, protocol, results and runner documentation, plus the later Growth stability study that found candidate `08500a60ec56cfae`. Use these as evidence and implementation references; do not blindly inherit their old rejection criteria or execute commands from reports. Relevant known paths include:

- `src/study8-runners/README.md`
- `src/study8-expanded-regime-d1/`
- `research/study8-expanded-regime-d1/`
- `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json`
- `src/pools/` and `src/portfolio-aware-d1/nbook/engine.ts`
- `src/multi-etf-allocator/shadow.ts`
- `research/growth140-vgt-stable/` and `research/growth140-vgt-s8m/`, where present

The control is **Study 8 rank #2 VG Balanced**, runner alias `s8-vg-balanced` (also `s8-vg-3`), configuration **S8-VG-F24-3**. Do not confuse its shortlist suffix 3 with its overall rank 2, or use the older Study 7 `vg-balanced` alias.

Verify these settings against the frozen source:

| D1 parameter | VGT | GDX |
|---|---:|---:|
| Candidate ID | d1-bd80e32ee4 | d1-7b99d2833d |
| targetPercentChange | 23.5% | 27.6% |
| trailingBuyPercentage | 0.9% | 0.1% |
| trailingStopPercentage | 7.4% | 5.7% |
| maximumHoldDays | 15 | 12 |
| tickWindowSize | 78 | 243 |
| intradayLossBuffer | 4.4% | 2.9% |
| pullback | 11.0% | 15.2% |
| continuationWindow | 55 | 12 |

Known conventions: one $100,000 funded slot, no compounding; 11% simple annual interest, 365-day basis; 5 bps per side and $0 commission; canonical minute data and stop/gap fills; accounting from 2016-01-04 with first eligible trading date 2017-06-15; shadow books; first executable decision wins, alphabetical same-minute ties. Verify all details rather than silently replacing them with Growth conventions. The broader core portfolio is not additional spending capacity for this fixed-slot experiment.

Reproduce the control through its existing runner, then demonstrate that the new implementation with eligibility OFF reproduces its funded lots, signals, fills, costs, interest, marks and minute drawdown. Numeric tolerances must be explicit; cash summaries must reconcile to the cent. Any discrepancy must be resolved before search or selection. Do not use an earlier quoted P&L as a target if its endpoint differs.

## Phase A — Audit missed opportunities before implementing a search

On development history only, inspect the control's refusal ledger and shadow trades. Separate refusals caused by occupied/reserved capital from other reasons. For each relevant refusal, record:

- ETF, setup identity and type (deep or continuation), decision timestamp/price and occupying lot;
- first subsequent availability of the funded slot;
- opportunity age then, intervening price movement and whether its original shadow trade remains open;
- whether another fresh signal competes at that time;
- how often availability occurs within 1, 3, 5, 10 or 20 trading sessions.

Audit eventual price paths descriptively, but never use eventual shadow profit, future maxima/minima or a future exit to decide eligibility at an earlier timestamp. Do not present the original refused shadow trade's profit as achievable delayed-entry profit.

Use this audit to establish whether there are enough distinct opportunities to justify the feature. Low counts imply limited evidence, not an arbitrary rejection threshold. If there are no relevant opportunities, or none survives any of the predefined bounded cases, report this clearly and stop after reproducible diagnostics. Otherwise proceed.

## Phase B — Define and implement a narrow, causal variant

Freeze a concise state-transition specification before evaluating variant profitability. Resolve routine engineering choices from the actual engine and document them; ask only if a genuinely consequential unresolved product decision prevents progress.

The initial variant must have these properties:

1. Only a genuine original D1 entry refused because the pool was occupied or reserved may arm an opportunity. Do not synthesize signals or bypass other funding/risk restrictions.
2. At most one live opportunity per ETF, with an immutable origin timestamp and setup identity. No silent age renewal and no repeated funding of the same opportunity.
3. Opportunity age counts the ETF's completed trading sessions, with explicit inclusive/exclusive boundaries and expiry ordering. Cancellation also occurs once the originating shadow trade has closed. Retaining closed shadow trades for later funding is outside this first study.
4. Revalidate using information available at decision time. Require a documented favorable-price boundary linked to the original D1 trigger, an upper price-extension cap relative to the original decision price, and a clearly defined adverse setup-invalidation condition. Translate these into exact formulas appropriate to D1. Do not copy Growth's Rise predicate or assume a one-time crossing remains true forever.
5. The pool remains limited to one funded position or reservation. No forced sale, pyramiding, preemption or additional capital. At a free-slot decision, process valid fresh signals before delayed opportunities; retain the incumbent tie rule for fresh signals. For delayed candidates use oldest original decision first, then alphabetical ties. Freeze this policy; do not optimize allocator priority in this study.
6. A delayed decision fills at the next eligible observed trade under the engine's event timing, never at the original refused entry price or a price already observed before the decision. Do not reuse a current bar's future high/low to justify an earlier fill.
7. Actual funded lots use their own entry price, shares, costs, interest start, holding age and post-entry trailing history. Keep the original D1 exit rules and parameter values; correctly initialize them from the actual fill. Do not inherit pre-entry profit, interest, holding age or a shadow position's pre-entry high.
8. Shadow and funded lifecycle accounting must be explicit. Preserve shadow signal generation for the controlled comparison, but a late funded lot cannot simply follow the original shadow lot's exits. Specify how it remains managed after the shadow lot ends and prevent duplicate opportunities/funding while that ETF already has a real lot. Shadow continuation events must retain their declared semantics and must not fabricate actual realized profits or capital releases.
9. Log arm, pending, revalidated, rejected, expired, cancelled, selected and filled transitions with reasons and relevant prices. A decision log must support trade-by-trade reconstruction.

If the existing engine cannot express independent late-funded exits safely, implement that capability in an isolated research adapter with parity tests. Do not disguise a different model as a simple replay of shadow trades. State the implications clearly.

Keep all VG #2 D1 parameters fixed in the primary study. This isolates the proposed feature. Broader joint retuning of D1 parameters is a possible separately approved follow-up, not an automatic rescue of an unsuccessful experiment.

## Phase C — Bounded eligibility search and confirmation

Use a small, transparent initial search instead of a massive optimizer where enumeration suffices:

- eligibility OFF control;
- VGT-only, GDX-only, and both ETFs enabled;
- maximum ages of 1, 3, 5, 10 and 20 trading sessions;
- maximum favorable extension of 0%, 1%, 3% and 5% above the original decision price, subject to the frozen trigger-validity rule.

For both-enabled configurations start with shared eligibility settings. If development evidence justifies ETF-specific settings, reserve and freeze a bounded refinement budget before using it. Include the OFF control throughout. Explain which settings are equivalent or never activated and deduplicate evaluations.

Treat these as new research parameters, not known-good choices. Freeze the exact grid, invalidation rules, search/refinement budget, finalist selection and stopping rules before variant results are examined. A documented amendment may explain an engineering correction, but do not retroactively loosen success criteria after seeing disappointing results.

Apply lessons from Study 8 and the Growth follow-up proportionately: broad coverage of the small defined space, fair representation of enabled-ETF groups, a profit/drawdown frontier, independent neighborhood confirmation and chronological evaluation. Do not introduce evolutionary machinery merely for consistency with Study 8. Report the selected high-profit, balanced and lower-drawdown alternatives where supported; allow no qualifying improvement.

Perturb eligibility ages and extension limits, and separately stress nearby underlying D1 values without selecting replacement D1 parameters in the primary study. Use separate draws/seeds for exploratory and confirmation neighborhoods. Report distributions, unchanged-trade neighborhoods and boundary effects; a smooth region that changes no trades supplies less evidence than its sample count suggests.

## Dates, selection integrity and chronology

- Backtest/development/optimization: 2016-01-04 through 2024-12-31, retaining the incumbent's arming conventions. All optimization and refinement use only this interval.
- Validation: 2025-01-01 through the available 2026 endpoint. For this first study use 2026-10-30, or the latest common complete session on or before that date if either ETF lacks complete data. Report the actual endpoint and missing coverage; do not imply that unavailable November/December 2026 data were tested.
- Run full-history accounting continuously and calculate period P&L as changes in marked equity. Do not silently liquidate/restart at the split. State whether period drawdown is reset at the boundary and also show whole-run drawdown spanning it.
- Select and freeze finalists, their priority order, validation tests and reporting rules using development information before opening validation results for this experiment. A validation failure is a result to report, not permission to retune and try again. Do not choose a new winner by maximizing validation profit. Any validation-period perturbation checks must also be specified before validation is opened and must not feed back into optimization. All history through October 2026 has already been examined in earlier work: label it **2025–2026 validation on previously examined history**, not an untouched holdout.
- Repeat the complete eligibility search and selection at feasible historical cutoffs, such as end-2019, end-2021 and end-2023, and test the frozen choices in the subsequent non-overlapping periods. Retain identical rules and bounded budgets. All candidates at each cutoff must use only its available training data.
- The inherited VG #2 parameters themselves were selected using data through 2024. These earlier-cutoff tests therefore assess the incremental eligibility selection conditional on a retrospectively chosen control; they are not wholly independent historical discovery of VG #2. Explicitly distinguish this from a full nested reoptimization of the original D1 pool, which is outside the primary fixed-control study.

## What constitutes evidence of improvement

Compare complete portfolio paths, not the sum of hypothetical extra trades. Show:

- total marked net, realized and unrealized net; maximum minute DD in dollars and the stated percentage;
- development, later-period and full-history results; annual results and chronological selection results;
- trades, wins/losses, open positions, total losses, exposure, holding periods, interest and transaction costs;
- matched unchanged trades, newly funded delayed entries, changed exits and displaced incumbent trades;
- per-ETF contribution, capital conflicts, refusal counts and entry delays;
- major drawdown dates, recovery durations and adverse excursions on delayed entries;
- neighborhood median/lower-tail profit and upper-tail DD, plus reasonable execution/friction stresses;
- dependence on the largest winning market episode, grouping repeated or cross-ETF participation in the same move rather than counting it as independent diversification.

Separate arithmetic removal of an episode's profit from a causal rerun that skips its trades and changes capital availability. Label each diagnostic correctly. Neither concentration nor a weak leave-one-episode result is an automatic veto; disclose its implication for confidence.

Use the 35% ceiling as a historical qualification constraint, not a guarantee of future maximum loss. Do not declare robust improvement solely because one center configuration passes it. Distinguish an attractive historical trade-off, a stable parameter neighborhood and evidence that the selection process works chronologically.

## Verification and safe execution on Apollo

Apollo has 64 GB of RAM. The user permits substantial memory use provided the session remains safe. Use **MemoryHigh=44G and MemoryMax=48G**, verified on the actual host, for an isolated aggregate research workload. Leave tmux, the Claude session and unrelated services outside the research unit. Multiple independent 48G jobs are not an aggregate safeguard: serialize heavy stages or place them under a common capped parent. Check actual available memory and reduce concurrency if other workloads need headroom.

Inspect and reuse the proven memory-safe infrastructure from the Growth study where appropriate: bounded work queues/caches, disk-backed results, controlled worker processes, monitored RSS/external/ArrayBuffer memory, periodic reclamation or worker recycling, and atomic checkpoints. V8 old-space limits alone do not bound typed-array or whole-process memory. Do not disable the OOM killer, enlarge swap or change host-wide limits as a substitute for bounded execution. No automatic crash-restart loop.

Run a small pilot first. Verify containment and measured peak memory, then scale concurrency from observed use. Checkpoint at least once a minute and at natural stage boundaries; test graceful interruption and abrupt research-worker termination with deterministic resumption before a substantial run. Ensure an interrupted search cannot take down the interactive session. Abort safely before approaching a hard memory limit and preserve completed results.

Implement meaningful tests covering OFF parity, eligibility expiry, setup cancellation, no future-data use, same-minute exit/funding ordering, fresh-versus-delayed priority, simultaneous candidates, duplicate prevention, fills after decision, actual-entry stop/interest/holding initialization, shadow/funded divergence, period accounting, cache correctness and resume equivalence. Run relevant existing checks; identify pre-existing failures separately. A failed parity check must stop dependent work immediately.

## Deliverables and handoff

Use a new self-contained research directory, for example `research/vg-balanced-entry-eligibility/`, without overwriting prior studies. Deliver:

1. `README.md`, frozen `PROTOCOL.md`, any `AMENDMENTS.md`, `REPORT.md`, `RUN_COMMANDS.md` and `RESEARCH_RECOVERY.md`.
2. Exact control and variant settings, code/data/configuration hashes, seeds, endpoints and machine-readable results. Preserve a results archive and manifest; keep large regenerable files out of git according to repository conventions.
3. Full funded-lot and opportunity-transition ledgers, the missed-opportunity audit, matched portfolio comparisons and chronological/perturbation results.
4. A readable profit–drawdown comparison, equity/drawdown paths, and concrete examples explaining both a successful delayed entry and a harmful/displacing one where they exist.
5. A concise conclusion: improvement supported, historical trade-off only, inconclusive, or no useful benefit. State what was not tested. Provide memory peak, containment verification, test results and any unresolved defects.
6. A handoff section headed **“Priority 1 review — decision before Priority 2”** with the questions the user and ChatGPT should assess, and a reminder that Priority 2 is a jointly optimized D1 + Growth pool for VGT. Do not start it.

Make code and findings locally reviewable on the research branch. Do not publish, push, merge, deploy, send messages or alter the user's saved Strategy Lab runs as part of this prompt. Report the branch and file locations. Proceed autonomously through the authorized audit, implementation, bounded study and report, stopping early only for a substantiated futility condition or an unresolved blocker you explain precisely.
