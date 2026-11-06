# Strategy Lab

A persistent, real-data strategy research workbench (`apps/strategy-lab/`). It replaces the Strategy Entry Explorer
prototype of 2026-11-03.

- **Start:** `npm --prefix apps/strategy-lab start`, then open http://127.0.0.1:4317.
- **VPN:** `npm --prefix apps/strategy-lab run start:vpn` (or the service), then `http://apollo:4317` from any tailnet
  machine, with the access token; see [OPERATIONS.md](OPERATIONS.md).
- **What it does:**
  - saved runs, variations, experiments and strategies in SQLite;
  - manual single tests on real minute data from the browser: signal-only entries, or **Growth**, a trading backtest
    with executed entries, exits, P&L, optional continuation entries, an optional entry trend filter, optional
    persistent entry eligibility, an alternative trend-breakout entry, an optional initial risk stop, optional trend
    retention and (1.4.0) the optional Drawdown Recovery Gate ([GROWTH_TRADING.md](GROWTH_TRADING.md),
    [GROWTH_ENTRY_GATES.md](GROWTH_ENTRY_GATES.md), [GROWTH_OPTIONAL_RULES.md](GROWTH_OPTIONAL_RULES.md),
    [GROWTH_DRAWDOWN_GATE.md](GROWTH_DRAWDOWN_GATE.md));
  - a frozen phenotype catalogue with single reruns ([PHENOTYPES.md](PHENOTYPES.md)), descriptive run comparisons and
    downloadable research bundles ([EXPORTS.md](EXPORTS.md));
  - **Interactive Preview**: edit a saved run's parameters beside its chart and run ONE configuration at a time,
    without saving a run; repeated configurations come from a validated cache; **Save as run** keeps one
    ([INTERACTIVE_PREVIEW.md](INTERACTIVE_PREVIEW.md));
  - a price chart of **daily OHLC candles** per NYSE session (the default for real data) or the **intraday minute
    line**, switched above the legend ([DAILY_CANDLES.md](DAILY_CANDLES.md));
  - entry and exit markers per symbol, with Eastern timestamps;
  - bookmarks and Markdown notes;
  - two-run comparison.
- **What it deliberately does not do:** optimise, sweep or select. Those are Claude/CLI workflows
  ([RESEARCH_WORKFLOW.md](RESEARCH_WORKFLOW.md)).

| Document | Contents |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Concepts (experiment, strategy, variation, run, batch), run lifecycle, SQLite and artifacts, prices and markers, per-symbol rule, security overview |
| [CONTRACTS.md](CONTRACTS.md) | Event contract v2, unknown values, parameter schema, run request, artifact files |
| [OPERATIONS.md](OPERATIONS.md) | Commands, apollo/Tailscale access, configuration, security model, backups and recovery, the vg-balanced import command, tests, limitations |
| [RESEARCH_WORKFLOW.md](RESEARCH_WORKFLOW.md) | Manual exploration versus validation, roadmap, UI guide, Claude-led optimisation export/import, how vg-balanced was imported and verified |
| [STUDY8_METHODOLOGY.md](STUDY8_METHODOLOGY.md) | What Study 8 actually did (the template for future optimisation) |
| [GROWTH_TRADING.md](GROWTH_TRADING.md) | **Growth** (`rise-from-recent-low-trading`, 1.4.0; legacy 1.3.0, 1.2.0, 1.1.0 and 1.0.0): entry and re-entry, the three exit rules and their switches, accounting, UI use, an exploratory example |
| [GROWTH_DRAWDOWN_GATE.md](GROWTH_DRAWDOWN_GATE.md) | Growth 1.4.0 Drawdown Recovery Gate: a filter on entry eligibility (never a signal); observations on completed minutes, chronological peak-before-trough detection, the latched anchor, the full-decline retracement threshold, the Y-session confirmation clock (gaps, early closes, DST, missing minutes), the state machine, interaction with eligibility/trend/continuation, the intraday release decision, records and exports, OFF parity, limitations. Report and evidence: `reports/2026-11-06-drawdown-recovery-gate/` |
| [GROWTH_OPTIONAL_RULES.md](GROWTH_OPTIONAL_RULES.md) | Growth 1.3.0 optional rules: the initial risk stop (ATR convention, timing, blocking, fills), the trend-breakout entry (strict conditions, no replay, no cooldown), trend retention (one partial sale, the remainder's trend exit, financing on the remaining principal, accounting of several fills, one logical trade), the exit order and precedence, records and exports, Interactive Preview, reproducing Candidate A with all OFF, combinations, tests |
| [GROWTH_ENTRY_GATES.md](GROWTH_ENTRY_GATES.md) | Growth 1.2.0 entry gates: the entry trend filter (five methods, trading-session sampling), persistent entry eligibility (five bounded policies, the opportunity lifecycle, reset-and-renew), priority and clashes, records and exports, worked examples, the paired CLI diagnostic, pitfalls, OFF parity |
| [GROWTH_TRADING_AUDIT.md](GROWTH_TRADING_AUDIT.md) | Which D1 code it reuses, rule by rule (sources, chronology, units, fills), what differs, what is left out, and the parity evidence |
| [GROWTH_CONTINUATION.md](GROWTH_CONTINUATION.md) | Growth 1.1.0 continuation entries: lifecycle and state diagram, the four methods with examples, parameters and defaults, records, evidence, diagnostic runs |
| [PHENOTYPES.md](PHENOTYPES.md) | The frozen phenotype catalogue: the export contract a study emits, the import CLI, capabilities, single reruns (standalone and shared-slot pool) |
| [EXPORTS.md](EXPORTS.md) | The research bundle: contents, guarantees, how another analyst checks it |
| [DAILY_CANDLES.md](DAILY_CANDLES.md) | The chart types: **Candles · 1D** (daily OHLC from the canonical minute bars: the open, highs/lows, closing-print and regular-session conventions, early closes, DST, missing minutes, split units, invalid data; drawing, dense mode, axis, read-out; the marker session policy and fan; close → close measuring; the API, caching and validation; tests; limitations) and **Line · intraday**. Report and screenshots: `reports/2026-11-06-daily-candles/` |
| [INTERACTIVE_PREVIEW.md](INTERACTIVE_PREVIEW.md) | Interactive Preview: the panel, statuses, Enter/Run, Reset, Save as run and Return; semantics and isolation; the persistent cache (execution identity, implementation fingerprint, storage, validation, retention, maintenance); concurrency; API; acceptance map; measured latency; limitations |
| `../../src/entry-signals/README.md` | The rise-from-recent-low rule, maths, rearming, bars, forward outcomes |
| `brief/2026-11-04-strategy-lab-implementation-brief.md` | The brief, verbatim |
| `brief/2026-11-04-growth-trading-strategy-brief.md` | The growth-trading brief (Task 5), verbatim |
| `brief/2026-11-04-growth-continuation-phenotypes-brief.md` | The Growth continuation / unified parameters / phenotypes / exports brief (Task 10), verbatim |
| `brief/2026-11-05-growth-trend-filter-eligibility-brief.md` | The Growth entry trend filter / latched eligibility / compact strategy picker brief (Task 11), verbatim |
| `brief/2026-11-05-interactive-preview-brief.md` | The Interactive Preview brief (Task 13), verbatim |
| `brief/2026-11-05-growth-optional-rules-brief.md` | The Growth optional rules brief (Task 14: initial risk stop, trend-breakout entry, trend retention), verbatim |
| `brief/2026-11-06-growth-drawdown-recovery-gate-brief.md` | The Growth Drawdown Recovery Gate brief (Task 15), verbatim |
| `brief/2026-11-06-daily-ohlc-candlesticks-brief.md` | The daily OHLC candlestick chart brief (Task 16), verbatim |
