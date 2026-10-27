# Claude Opus 5.5 (Extra High) — BTCUSDT Spot D1 Research on a New Branch

(The user's assignment, received 2026-10-27, recorded verbatim for recovery.)

**Assignment date:** 2026-10-27  
**Repository:** the existing `margin-trading` TypeScript/Node.js project  
**Mode:** execute the work end-to-end in this session, with independent reviews where useful, and deliver runnable software, reproducible research, and a final verdict. Do not stop after merely proposing a design or writing a plan.  
**Fundamental separation:** This is a **new, standalone BTCUSDT spot research study**, not another iteration of the existing ETF studies, and not an attempt to improve B4/B5.

## 0. Mandatory Git workflow — perform this FIRST

The user explicitly authorizes **pushing the current branch**, followed by **creating and working on a new branch based on the current branch**. Follow this order exactly:

1. Read the root `CLAUDE.md` and its imported project instructions (including `docs/claude/context-recovery.md`), any relevant `AGENTS.md`, and the repository's Git conventions. Follow them for the entire task; create and maintain a task-local recovery checkpoint.
2. Determine the actual **current branch**, current `HEAD`, configured upstream and remote, and the full Git status. The recent research history may be on `research/trailing-buy-four-family-optimization` and the last ranked-preemption study may be committed, but **verify the live repository rather than assuming any branch name or SHA**. Do not checkout another branch first.
3. Check for outstanding tracked modifications, untracked work, detached-HEAD state, rebase/merge in progress, or conflicts. **Never silently add, commit, discard, stash, reset, overwrite, or publish local changes.** The authorization to push is not authorization to invent additional commits. If outstanding changes would prevent a safe and unambiguous baseline, stop this Git sequence, report what needs attention, and do not begin research in an ambiguous state.
4. Review the commits about to be pushed and any obvious secrets, credential files or unintended very large generated archives included in those commits. Do not disclose secret values in the report. Do not alter Git history or omit legitimate committed work unilaterally.
5. **Push the current branch to its appropriate configured remote** (typically `origin`) with an ordinary, non-force push. Set upstream only if necessary and the target is unambiguous. **No force-push, force-with-lease, deletion, remote merge, pull-request creation, or push to a differently named branch without authorization.** If the remote rejects the push, do not force or rewrite; stop and report the blocker.
6. Verify that the remote branch contains the exact current `HEAD` just pushed. Record the source branch, source SHA, remote, upstream and push outcome in the BTC study's Git provenance (without credential-bearing URLs).
7. **Only after the push succeeds**, create a fresh local branch from that exact, verified `HEAD`: prefer `research/btcusdt-d1-spot` unless a branch with that name already exists. If it exists, inspect rather than overwrite it; choose an unambiguous versioned name and record why. Confirm the new branch's parent/base SHA and `git status`.
8. Do **not** push the new BTC branch unless the user separately asks. Do **not** commit the BTC study unless separately authorized. The user authorized pushing the **existing** branch, not automatic commits or pushes of the **new** branch.
9. If the initial push cannot safely be completed, **do not create the new branch or start modifying the code**; give a clear Git blocker report. No brokerage, trading, transfers or credential reads are authorized at any time.

### Required brief Git report

Before the research summary, record: source branch/SHA, remote and upstream, verified push result, new branch/base SHA, and whether any files were changed before switching branches. Avoid sharing private remote URLs containing credentials.

## 1. Purpose, scope, and explicit exclusions

Investigate whether a **standalone, long-only D1 trailing-buy strategy adapted to BTCUSDT spot** can generate positive **net trading profit** with tolerable drawdowns using existing local **one-minute historical BTCUSDT OHLCV** data. Assess the strategy's sensitivity to D1 parameters, transaction costs, market regimes, trade concentration and chronological changes.

**The user explicitly does not want a BTC buy-and-hold comparison in this study.** Do not implement, compute, plot, include in scorecards, or discuss BTC buy-and-hold as a benchmark. The relevant comparisons are **within D1**: existing unchanged D1 parameters as an explicitly non-optimized diagnostic; new BTC-adapted D1 phenotypes; alternate candidate phenotypes; training versus chronologically later periods; and cost/risk sensitivity. A cash-only accounting sanity case is permitted only for validating the engine and must not be framed as an investment-performance comparison.

Also out of scope:

- BTC futures, perpetual swaps, funding payments, leverage, margin borrowing or shorting.
- Joint optimization with ETFs, priority ranking and preemption; do not reuse the recently unsuccessful preemption allocator as if it applied to spot BTC.
- Live exchange orders, broker connections, APIs requiring credentials, secrets or `.env` files.
- Downloading fresh history or overriding local datasets unless the user later authorizes it; the BTCUSDT data **already exist in the repository's `data` directory**.
- Changes to frozen B1/B4/B5 pools, D1 phenotype definitions, earlier ETF studies, their frozen data/records, or the existing prospective B4/B5 tracker.

**A valid outcome is “no viable BTCUSDT phenotype identified.”** Negative evidence is valuable; do not relax gates, search windows, costs or risk requirements after observing results to manufacture a winner.

## 2. Locate and verify the existing BTCUSDT data before designing the engine

**Do not assume a path or CSV schema** merely because BTCUSDT appears elsewhere in the project. Discover all plausible files inside `data/` (for example `data/BTCUSDT/data.csv`, `data/BTCUSDT.csv`, associated metadata, partitions or existing derived files); identify the authoritative raw source and its provenance. Never replace or edit it.

Audit and report:

- Actual path(s), format(s), file size and SHA-256; symbol/venue if documented; spot versus derivatives provenance and quote currency. If the venue or product type cannot be established from trusted local metadata, mark it **unverified** rather than pretending it is Binance spot.
- Timestamp encoding (seconds/milliseconds/microseconds/nanoseconds, if applicable), UTC interpretation, timezone, earliest/latest timestamps and number of bars; OHLCV units and any quote volume fields.
- Duplicate/out-of-order timestamps, invalid OHLC relationships, nonpositive prices, negative/implausible volumes, extreme price changes, suspicious discontinuities, missing-minute runs, partial days, bad aggregations and potential exchange outages. Distinguish true missing minutes from venue-specific lack of trades wherever the evidence permits.
- History length and regime coverage. If data are not truly one-minute OHLCV or are too incomplete for causal execution, stop with an auditable diagnostic instead of fabricating or silently repairing bars.
- Separation of raw source versus any canonical normalized/derived representation. Keep raw data immutable and stage any conversion only inside the BTC research namespace; record deterministic transformations and checksums.

Do not infer date coverage from the ETF dataset. Select a **data snapshot/maximum timestamp once** and pin its hash so that later appended bars cannot silently change this study.

## 3. Preserve the existing project and reuse it safely

Inspect the existing D1 standalone algorithm, eight-parameter definitions, the one-minute fill model, optimizer components (Sobol/grid, local/NSGA-II if available), drawdown trackers, reporting and trade-ledger components, and the guard/freeze conventions. Determine what can safely be reused as read-only code.

Existing B4/B5 runnable-pools/prospective freezes bind part of the project's source and package configuration. **Before editing any shared file, determine whether it is protected by a frozen code closure or hash manifest.** Prefer a clean BTC-only namespace, e.g.:

- `src/btcusdt-d1/` — BTC calendar/price adapter, optimizer, runner, audits, CLI and tests;
- `research/btcusdt-d1/` — the study protocol, data audit, frozen settings, outcomes, recovery checkpoint and reports;
- `config/research-phenotypes/btcusdt-d1/` — versioned **research-only** BTC phenotypes in JSON;
- `evaluations/btcusdt-d1/` — disposable output/trade ledgers, excluded from Git.

A new `npm` script (e.g., `btc-d1`) is acceptable **only if** it preserves the existing `pools`, `ranked-preemption` and other scripts, import map and lockfile, and all legacy freeze verifications. If adding a script would invalidate a binding, use a separately runnable entry point without modifying the protected file. Never weaken/disable an earlier integrity guard to make the new code pass.

**Do not edit any existing ETF-specific D1 phenotype.** BTC phenotypes must have their own names and exact, versioned JSON parameter grids and provenance.

## 4. BTCUSDT execution, capital and time semantics — define explicitly, then test

The primary market is **spot BTCUSDT** (BTC priced in USDT). Base and quote amounts must be reported correctly; don't label USDT balances as USD without a stated 1:1 accounting convention or imply stablecoin risk is modeled. A dedicated BTC adapter may share the D1 state machine only where semantics really match.

### Capital

- Start with **100,000 USDT of equity**, no borrowing, no leverage, no negative USDT balances and only one funded BTC position at a time. Long-only, otherwise in USDT cash.
- **Non-compounding position-size cap:** never deliberately allocate more than 100,000 USDT of gross quote notional to a new position; do not reinvest profits to increase that cap.
- For a **truly cash-funded, no-leverage backtest**, a later trade cannot spend funds that do not exist after previous losses. Use `min(100,000 USDT, available USDT including purchase fees)` as the actual entry budget, with explicit accounting so cash never becomes negative. Record the exact gross trade notional and shares/BTC quantity.
- To preserve comparability with the ETF studies, a **separate analytical fixed-100,000-USDT-notional** mode may also be provided, but if losses require cash top-ups to maintain 100,000 USDT per trade, track and disclose those hypothetical contributions. **Never label such a mode live-executable without outside capital.** Keep its performance separate from the primary cash-constrained mode.
- No margin interest, no funding payments; report interest/funding as **zero / not applicable** so the ledger schema remains transparent.

### Calendar and signals

- BTCUSDT trades **24/7**. Define daily session boundaries as **00:00:00 UTC**, and distinguish full elapsed calendar days, completed UTC daily bars and minute bars. There is no exchange market close or weekend gap by default.
- Examine each of D1's eight parameters and implement a semantically defensible BTC interpretation. In particular, `maximumHoldDays`, rolling high/lookback window (`tickWindowSize` or equivalent), any session count, time exit and reentry restrictions must have documented units and **not accidentally count equity-market business days**.
- If daily bars are synthesized from minute data, consume only **completed** UTC days, and never use a day's final high/low/close before that day has ended. Confirm minutes and bars are ordered and closed before signals consume them.
- Use the original D1 economic logic (deep-pullback trigger, trailing buy/rebound, trailing stop eligibility, time exit and reentry behavior) unless a BTC-specific change is explicitly preregistered and reported as an adaptation. Do not silently create a different trading strategy.

### Executions, fees and liquidity

- Decisions must use completed market data; orders fill at the **next causally eligible bar/trade**, not the price of a bar whose future values were used to decide. Gaps and missing periods must not create synthetic fills. Document trade-by-trade event ordering.
- Do not automatically inherit the ETF backtest's “stop filled at the stop price” assumption when price gaps or minute OHLC sequencing make it optimistic. Define deterministic, conservative stop handling and report unresolved intraminute sequencing limits. Build synthetic tests covering the adverse cases.
- **Spot fees and spread/slippage are configurable**, charged on both entry and exit as appropriate. Do not assume Vanguard's 5-bps ETF principal case applies to BTCUSDT. Use documented scenario assumptions, not an unverified assertion about the user's live exchange tier.
- Suggested preregistered scenarios for evaluation: maker/taker *fee* assumptions of 5 / 10 / 20 bps per side (plus an explicit 30-bps stress case), and *incremental* execution impact/slippage of 0 / 5 / 10 / 20 bps per side. Define one defensible conservative principal scenario **before seeing returns**, e.g., 10-bps fee plus 5-bps extra impact per side, and report relevant sensitivities. Make no claim that an assumed fee tier is guaranteed.
- Account for partial/zero-volume bars, order notional versus bar liquidity, price/quantity precision, minimum lot and minimum notional only to the extent local metadata establish them. Unsupported capacity or venue filters are **limitations**, not made-up fills. Show participation/capacity warnings for a 100,000 USDT spot order where relevant.
- Model the absence of interest correctly; if no cash yield is modeled, cash earns zero. USDT counterparty/depeg/venue risks remain unmodeled and must be disclosed.

## 5. Preflight feasibility and causal implementation audit

Implement data and calendar adapters plus a deterministic baseline **before** optimization. Reproduce any reusable D1 semantics on synthetic fixtures, with carefully documented differences from the ETF engine due only to calendar, spot accounting, fees and fills. Require:

1. Unit tests for hourly/daily UTC boundaries, crossing midnight, leap years, missing minutes, fee arithmetic, balances and no leverage; calendar-day holding duration; order-fill causality; stop through a price gap; time-exit behavior; closed-bar lookback; trailing-buy confirmation; reentry restrictions; zero/insufficient cash and fees; ending with an open position.
2. One **unchanged, clearly labeled diagnostic D1 phenotype** from the existing D1 library run under the BTC-adapted clock, *not* asserted to be BTC-optimal, to establish that the engine actually functions, trades appear and totals reconcile. If the parameters yield no trades, report that; do not tune the baseline for cosmetic results.
3. A **fast replay vs reference event-engine parity** test, if an optimizer fast path is used: entry/exits, fills, interest=0, fees, cash, BTC balances, daily/minute P&L, drawdowns, realized/unrealized results and funded trade list must match at each cost level. Include checks across midnight and missing-bar spans.
4. Post-cutoff bar mutation tests: changing future data must not change any earlier signal, order, fill, optimizer score or selected candidate. Tests must fail under deliberate lookahead injected by fixtures.
5. Confirm a complete funded-trade ledger whose totals reconcile to the summary, including liquidating/marking open positions at the end by an explicitly specified convention.

**If causal adaptation is uncertain or parity fails, stop before optimization.** Do not substitute an unvalidated fast simulation because the results look interesting.

## 6. Freeze a research design BEFORE reading optimization outcomes

Create `research/btcusdt-d1/PROTOCOL.md` and a machine-readable frozen protocol record with strong hashes of the data snapshot, critical code, settings, seeds, cost scenarios, split boundaries, lookback rules and evaluation gates. Follow the project's established write-once/sealed-record approach where compatible, without modifying earlier study freezes.

Select the chronological split **by a deterministic, outcome-blind rule based only on the observed start/end timestamps and data quality**. Do not use market profitability, downturn charts or individual trade results to choose split dates. Prefer a substantial **final untouched holdout of approximately the last 20–25% of adequately complete history**, preceded by training and at least two walk-forward validation periods inside the remaining history; give those folds enough time and trades to be meaningful. If the actual history is too short to support this, state the limitation and use the most conservative feasible split; if no credible chronology exists, stop without claiming validated performance.

Freeze:

- Development/training and walk-forward search/validation cutoffs, final locked holdout start/end and any embargo/warm-up. Any fold selection must use only bars available before that fold's validation begins.
- Uniform BTC-specific D1 parameter search bounds and integer/one-decimal quantization, plus sensible clocks for hold days and lookbacks; bounds fixed before outcome viewing. **Do not assume the ETF's successful 10–20% decline thresholds are automatically appropriate for Bitcoin.**
- Candidate-generation algorithm(s), seeds and budgets, an outcome-blind memory/runtime tier and sample-size requirements. Use multicore Node/TypeScript; do not require a GPU.
- Objectives and gates: principal-scenario net P&L after full fees/impact, max minute-sampled and daily DD (absolute and % of actually funded account equity), number and distribution of trades, performance across non-overlapping subperiods, share of gains from largest trades, cost sensitivity and nearest-parameter neighborhood feasibility.
- **Risk reference:** the user's existing $35,000 maximum strategy drawdown per $100,000 of capital. Use **≤35% maximum peak-to-trough drawdown** in the cash-funded BTC account as a hard training feasibility ceiling, measured continuously at minute resolution, and also report dollar drawdowns. A stricter low-DD class (e.g., ≤20–25%) may be exploratory; do not retrospectively loosen 35%.
- Specific rules for choosing a short list (e.g., up to three meaningfully different trade-pattern families) from development, the procedure gate from chronological folds, and **exactly one authorized, locked final holdout evaluation** only for predetermined eligible candidates. If folds fail, retain only training/retrospective research artifacts and leave the final holdout unopened for candidate evaluation.
- Independence limitations: reused BTC historical windows, if known to have been previously inspected, must be labelled accordingly. Never call parameter perturbation around one historical path an independent sample of future markets.

Require **one independent design/code review prior to freezing and one final independent read-only audit**. Reviewer advice can fix causality, documentation, and preregistration contradictions **before the freeze**, but must not authorize retrospective outcome-based changes after results are seen.

## 7. Optimization: a bounded, diversity-aware D1 search

Once the protocol and verified engine are frozen, **perform the approved optimization**; do not stop at a feasibility proposal if the data and execution checks pass.

- Optimize BTCUSDT **standalone**. No ETF membership optimization, shared margin pool, or priorities.
- Use broad, quantized quasi-random/Sobol coverage of the eight D1 parameters, followed by bounded local/evolutionary refinement if justified by the preregistered design and available libraries. Every candidate is evaluated using the **actual BTC spot accounting, causal fills and frozen cost scenario**.
- Avoid a single fragile best-center candidate. Preserve several genuinely different candidate **trade schedules / entry-exit behaviors**, not merely parameter vectors that yield the same trades. Define a deterministic dissimilarity measure and protected promotion slots before searching. Do not repeat the earlier studies' single-linkage chaining or seeded-arm monopoly.
- Evaluate a local parameter neighborhood on independent search draws, reporting median net P&L, drawdown distribution, feasible share, sensitivity at larger perturbations, and costs; do not treat those draws as independent historical markets.
- Explicitly penalize or gate candidates that derive almost all profit from one or two lucky rebound trades, have too few filled opportunities, require implausible intraminute fills, or fail the 35% drawdown limit. Report the risk-return frontier rather than just one profit-maximizing vector.
- Keep the actual compute effort appropriate to the machine and the data. Use a quick **outcome-blind benchmark** to size budgets, then freeze the budgets; do not continue searching just because the current historical result is disappointing. No artificial time-limit stop that selects a conveniently good checkpoint.
- Distinguish **gross price profit, entry/exit fees, slippage, net realized profit, marked unrealized profit and account drawdown** for every candidate.

## 8. Walk-forward validation and strictly limited holdout

For each chronological fold, rerun the **complete selection procedure** using only that fold's earlier search span (including any selection of optimization bounds if the bounds aren't globally frozen—prefer globally frozen bounds). Freeze its chosen phenotype(s) before the next chronological validation segment opens. Carry the strategy state and position across a boundary in a continuous replay, but isolate the **incremental** validation P&L/drawdown correctly. Optionally report a flat-start diagnostic separately without selecting on it.

Report at least:

- Net validation trading profit and return on capital, minute-sampled and daily drawdowns, trade count, win/loss distribution, margin/funding=0, costs, worst trade, exposure and time in cash;
- Performance at the predeclared principal cost and at more conservative fee/slippage settings;
- Chronological year/market-phase attribution **descriptively only**, without tailoring parameters to the known episodes;
- Neighborhood robustness and why the fold pick differed from the optimized center, where applicable;
- Whether it met the **frozen** fold gates; and whether an apparent training improvement persisted.

**The final holdout is not a tuning tool.** If the procedure gate fails, state that no final holdout was evaluated and stop at a negative conclusion. If it passes, seal the exact eligible BTC phenotype(s) and their parameters first, then run the **single preregistered final holdout** and report the outcome. Do not change bounds, ranking, candidates or execution rules afterward; any new research requires a new study/protocol. BTC history prior to the frozen holdout may already be widely known; never claim that retrospective walk-forward is true prospective trading evidence.

## 9. Required artifacts, run commands and the trade ledger

At completion, ensure that a user can run the resulting BTCUSDT research phenotypes against **permitted** date ranges using the local BTC data, with simple documented commands and no network or secret configuration. Suggested interface (the exact command must be implemented and verified, not merely documented):

```bash
npm run btc-d1 -- data-audit
npm run btc-d1 -- verify
npm run btc-d1 -- list
npm run btc-d1 -- show <phenotype-id>
npm run btc-d1 -- fixed <phenotype-id> --dataset all   # ONLY if permitted by that phenotype's sealed evidence/data door
npm run btc-d1 -- fixed <phenotype-id> --end YYYY-MM-DD
npm run btc-d1 -- compare                           # BTC D1 diagnostics/candidates ONLY; NO BTC buy-and-hold
```

If a `--dataset all` request would improperly evaluate a research-only candidate on its still-locked holdout, **refuse with a clear error** and print the latest permitted timestamp. If a permitted candidate has completed holdout and remains research-only, document the exact scope and evidence grade. Demonstrate both successful commands and intentional refusal tests. The read-only CLI may export reports but **must never overwrite sealed optimization records**.

Every `fixed` run prints **all actually funded trades** by default and saves a human-readable terminal report plus `trades.csv`, `trades.json` and a summary JSON in a clearly identified output folder. Required trade columns:

- Number, UTC entry/exit timestamps, entry/exit fill prices in USDT/BTC, BTC quantity, gross USDT notional and available quote capital;
- D1 entry context and exit reason (trailing stop, hold expiry, end mark, etc.), elapsed calendar days, duration and if possible maximum adverse/favorable excursion using **explicit minute-bar definitions**;
- Gross price-based trade P&L, entry fee, exit fee, execution impact/slippage, interest/funding (0/N.A.), **net USDT profit/loss**, cumulative realized net profit, and realized versus open/marked status;
- End-of-run open position details with liquidation-equivalent value, allocated capital, leftover USDT, cash-equity reconciliation, maximum minute/daily drawdowns in USDT and %, counts of winning/losing trades, total costs, time exposed/in cash, and any external capital top-ups if running the analytical fixed-notional mode.

Per-run figures must reconcile exactly with the authoritative engine at the stated cost assumption. No inventing fills to make a table complete. If the formatter inherited from ETF pools mislabels interest or USDT as USD, create a BTC-specific formatter rather than modifying the prospective-frozen pools formatter.

Produce versioned BTC phenotype JSONs containing the **exact eight D1 parameters**, their time-unit definitions, strategy version, data snapshot/hash, cost scenario, calendar/venue assumption, optimization origin, fold evidence, train/validation/holdout boundaries, research-only or eligible state, reproducibility seeds and any gate failures. Include the reference phenotype and multiple representative finalists, even if none qualify for prospective consideration. **No live-trading status** is inferred merely from positive historical results.

## 10. Study reports, quality controls and audit

At minimum, write:

- `research/btcusdt-d1/README.md` — high-level question, conclusion, evidence limits, artifact guide and runnable commands;
- `PROTOCOL.md`, sealed protocol/code/data snapshots and provenance, plus `RESEARCH_RECOVERY.md`;
- `DATA_AUDIT.md` — source, timestamp units, coverage/gaps, venue/provenance limitations and hashes;
- `BTC_CLOCK_AND_EXECUTION.md` — exact stock-D1-versus-BTC adaptation, UTC day/rolling-high/hold semantics, causal fills, fees, USDT accounting and stop ambiguity;
- `ENGINE_PARITY_AND_TESTS.md` — independent engine/replay parity, lookahead mutation tests, previous-study isolation and test results;
- `SEARCH_AND_NEIGHBORHOOD.md` — actual search budgets, coverage, diverse phenotypes, cost/drawdown distributions, top-trade concentration and selection ledger;
- `CHRONOLOGICAL_VALIDATION.md` — folds, gates, results, timestamps, trade attribution and whether the holdout stayed sealed;
- `FINAL_COMPARISON_AND_RECOMMENDATION.md` — **BTC D1 variants only**, clearly separating in-sample, reused historical validation, true locked-holdout evidence if authorized, and any remaining prospective uncertainty;
- `IMPLEMENTATION_AUDIT.md` and the independent read-only audit with issue dispositions.

Do not fill space with generic crypto commentary. Quantify actual results, avoid annualizing brief or sparse samples into confident expected returns, and report why candidates fail as carefully as why any pass. Keep the study's result sealed and do not re-run completed write-once stages merely to improve outcomes.

### Mandatory final verification

- `npm test`, TypeScript type-check and applicable lint pass (disclose unrelated existing warnings).
- Existing B4/B5 `npm run pools -- verify` passes and prospective freeze remains valid; earlier study configurations and data files match baseline hashes. If existing frozen checks prohibit executing a particular old stage, **do not bypass them**: rely on allowed verifiers and recorded hashes.
- BTC data file(s) retain their original hashes. No secret reads, broker orders, derivatives, margin borrowing, download or network data access.
- A read-only independent audit examines the causal BTC adapter, chronology and data doors, cost/account reconciliation, study records, lookahead prevention, conclusions and old-study isolation.
- The runbook's CLI commands are actually executed with representative permitted BTC phenotypes, and their terminal and CSV/JSON results reconcile.

## 11. Git safety and delivery

The user has authorized **only the initial push of the current existing branch**. After creating the BTC research branch, **do not commit, push, merge, rebase or open a pull request** without a new explicit instruction. Keep detailed `git status` and the new branch name in the final report; do not automatically add ignored archives or large transient evaluations to the repository.

Do not take any action requiring credentials beyond the ordinary authorized Git push. Do not query trading accounts, place orders, access secret files or download historical data. If the local BTC dataset or mandatory audit fails, report a bounded partial result with what was actually completed, rather than inventing success or silently broadening permissions.

## 12. Persistent Claude instructions and recoverability

- Follow the preexisting project-wide Claude context-recovery guide loaded from `CLAUDE.md`; **do not duplicate or replace it**.
- Create `research/btcusdt-d1/RESEARCH_RECOVERY.md` promptly with current Git branch/base, milestones, protocols/hashes, actual data paths, completed commands, deterministic seeds, live processes/logs and exact next safe step. Update after each milestone and before context compaction when feasible.
- After compaction/session restart, reread `CLAUDE.md`, the shared guide, this assignment, the task recovery file, sealed protocol and amendments **before resuming any operation**. Never rerun a completed sealed stage; if state is ambiguous, stop.
- Independent reviews and code checks do not authorize deviation from the frozen protocol.

## 13. Required final response format

Give a concise but substantive report with these headings:

1. **Git branch and push confirmation** — exact verified source branch/commit pushed and new BTC branch/base, or the precise blocker.
2. **Data actually found** — source files, dates, gaps, provenance, snapshot hash and whether spot was verified.
3. **BTC-specific engine adaptations and tests** — calendar, orders, balance, fees/slippage, parity and no-lookahead.
4. **Research outcome** — training, chronological validation and (if legitimately opened) final holdout; profit, risk, cost sensitivity, trade count, parameter-neighborhood robustness and reasons for rejection/advancement.
5. **Phenotypes and files** — exact JSON locations, research/eligibility labels, reports and recovery checkpoint.
6. **Commands I can run** — tested, copy/paste commands with examples for listing, inspection, BTC fixed backtests, trade ledgers, verification and date-door behavior.
7. **Git status and remaining limitations** — what's uncommitted on the new branch and what remains unverified.

**Final reminder:** Push the current branch first; create the BTC branch from the exact pushed head; use only existing BTCUSDT local data; research BTC **spot without leverage**; preserve earlier ETF research; **no BTC buy-and-hold comparison**; and treat an honest negative result as successful completion of the study.
