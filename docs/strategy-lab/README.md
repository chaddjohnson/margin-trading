# Strategy Lab

A persistent, real-data strategy research workbench (`apps/strategy-lab/`). It replaces the Strategy Entry Explorer
prototype of 2026-11-03.

- **Start:** `npm --prefix apps/strategy-lab start`, then open http://127.0.0.1:4317.
- **VPN:** `npm --prefix apps/strategy-lab run start:vpn` (or the service), then `http://apollo:4317` from any tailnet
  machine, with the access token; see [OPERATIONS.md](OPERATIONS.md).
- **What it does:**
  - saved runs, variations, experiments and strategies in SQLite;
  - manual single tests on real minute data from the browser: signal-only entries, or a trading backtest with executed
    entries, exits and P&L ([GROWTH_TRADING.md](GROWTH_TRADING.md));
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
| [GROWTH_TRADING.md](GROWTH_TRADING.md) | The trading backtest `rise-from-recent-low-trading@1.0.0`: entry and re-entry, the three exit rules and their switches, accounting, UI use, an exploratory example |
| [GROWTH_TRADING_AUDIT.md](GROWTH_TRADING_AUDIT.md) | Which D1 code it reuses, rule by rule (sources, chronology, units, fills), what differs, what is left out, and the parity evidence |
| `../../src/entry-signals/README.md` | The rise-from-recent-low rule, maths, rearming, bars, forward outcomes |
| `brief/2026-11-04-strategy-lab-implementation-brief.md` | The brief, verbatim |
| `brief/2026-11-04-growth-trading-strategy-brief.md` | The growth-trading brief (Task 5), verbatim |
