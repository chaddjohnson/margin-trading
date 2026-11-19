# Research bundle exports

Every completed run can be downloaded as ONE deterministic ZIP that an analyst — or ChatGPT/Claude — can review
without access to the Strategy Lab server. The bundle never changes a run artifact.

- **UI:** a run's header → **Export research bundle** (tick *include minute marks* to add the minute series).
- **API:** `GET /api/runs/R-000042/export` (`?minute=1` for the minute marks); the normal access token applies; only
  completed runs export.
- **CLI:** `npm --prefix apps/strategy-lab run export -- R-000042 [--minute] [--out file.zip] [--state DIR]`.
- **Code:** `apps/strategy-lab/server/export.ts` (contents), `server/zip.ts` (the ZIP writer/reader).
- **Interactive Preview:** a displayed preview exports the same bundle from its verified cache entry (header → **Export
  preview bundle**; `GET /api/previews/PV-…/export`). Its README opens with a *TEMPORARY PREVIEW — not a saved run*
  banner, `manifest.json` carries `preview` (id = the execution identity's sha256, source run, timings) and the file is
  `strategy-lab-preview-PV-….zip`. The `artifacts/` are the cached files, verified against the cache entry
  ([INTERACTIVE_PREVIEW.md](INTERACTIVE_PREVIEW.md)). A preview saved as a run exports as that run.

## Contents (`strategy-lab.research-bundle` v1)

| File | Contents |
| --- | --- |
| `README.md` | Run id and title, strategy and version (and former name), phenotype link, symbols, window, data origin (simulated / imported / synthetic), standalone or shared-slot semantics, what the metrics mean, files, unavailable items, how to check it |
| `manifest.json` | Bundle schema; every file's sha256, size and description; the run's events sha256 and own manifest; options; what is unavailable and why |
| `run.json` | The run record: inputs, assumptions, provenance, code revision, metrics, phenotype, request |
| `parameters.json` | The parameter snapshot, the **effective** values executed, the values **saved but not applied**, the schema |
| `artifacts/…` | **Unmodified** copies of the run's artifacts (request, events, metrics, trades, daily, decisions, provenance, import, Study 8 output index, the run manifest); each is verified against the run's manifest (and events.json against the database) before it is included |
| `events.csv` | Every event: id, symbol, kind, UTC and America/New_York time, precision, price and basis, trade and linked event, origin/method/episode, reason, values |
| `trades.csv` | The ledger: trade, symbol, status, origin, method, episode, decision/entry/exit times (UTC and New York), fills, exit reason, shares, principal, gross before costs, costs, interest, net, net return, holding, and (Growth 1.2.0 with a gate ON) `entry_source`, `opportunity`, `age_sessions_at_decision`. Growth: from `trades.json`; imports and pool reruns: paired from the events by `tradeId` + mutual `linkedEventId` |
| `continuation-episodes.csv` | Growth with continuation: every episode (opened by, exit, window dates, H, maximum high, armed, trigger, end, trade) |
| `decision-log.csv` | Growth 1.1.0+: the chronological decision/state log (1.2.0 with a gate ON: also the opportunity and renewal transitions) |
| `entry-decisions.csv` | Growth 1.2.0 with the entry trend filter or persistent eligibility ON (1.4.0: or the Drawdown Recovery Gate; then also `blocked_by`, the gate's state, episode, peak, trough, threshold, streak start, `via` = `drawdown_release` for a latched decision taken at the gate's release, and its values as JSON): one row per Growth entry decision (raw crossing, latched decision, renewal signal, continuation trigger) — time (UTC, New York), session, decision price, the crossing's threshold/low/advance, disposition and reason, the gate decision and text, the observed trend values and policy values (JSON), the opportunity or episode, the trade, its fill and its final realised or open unrealised net |
| `opportunities.csv` | Growth 1.2.0 with persistent eligibility ON: every armed opportunity — source (raw crossing or renewal, with lineage), policy, signal, last eligible session, evaluations and blocked counts, the decision and its age, how it ended and why, its trade, fill and net, the transitions (JSON) |
| `entry-gates.md` | Growth 1.2.0 with an entry gate ON: the gate configuration, the term definitions, and per symbol the vetoed/deferred counts, trend blocks, opportunity ends and ages, renewal watches and the trades by entry source — descriptive |
| `exit-fills.csv` | Growth 1.3.0 with the initial risk stop or trend retention ON: one row per exit fill of every position (partial and final) — rule and reason, UTC and New York time, session, execution, raw and after-cost price, shares, principal repaid (proportional), interest paid and its calendar days, proceeds, gross, its share of the entry cost, exit cost, fill net, what remains, the decision instant, the stop level, rules also due at the same trade, the initial stop and its ATR, the position's net. The fills of a position add up to its `trades.csv` row |
| `optional-rules.md` | Growth 1.3.0 with the breakout entry, the initial risk stop or retention ON: the configuration, the conventions and per symbol the counts (breakout signals, protected positions, stop exits, blocked decisions, partial fills and their net, remainder exits, closed positions with a partial sale) — descriptive |
| `drawdown-episodes.csv` | Growth 1.4.0 with the Drawdown Recovery Gate ON: every dip episode (stable `DD-n`, its detection epoch, state) — the peak (UTC, New York, session, price, observation kind), the first observation at least d below it and its dip %, the trough, the deepest dip %, the retracement and threshold, trough updates, recovery streaks, confirmations, resets before confirming, confirmations lost, resets by cause (JSON), the first confirmation, the resolution (and whether it came before a confirmation), whether the window was complete at detection, whether it was detected in the warm-up, the decisions it blocked (JSON) |
| `drawdown-transitions.csv` | Growth 1.4.0 with the gate ON: every causal transition in time order — `dip_detected`, `new_trough` (one row per session for a run of new lows), `recovery_started`, `confirmation_reset`, `recovery_confirmed`, `confirmation_lost`, `dip_resolved`, `window_complete`, and every decision it blocked (`entry_blocked_by_drawdown_gate`) — with the observation kind and price, the state after it, the reason and the values (JSON) |
| `drawdown-gate.md` | Growth 1.4.0 with the gate ON: the configuration, the conventions and per symbol the descriptive counts (episodes, depths, confirmations and resets, releases, blocked decisions, deferred entries, release decisions, the state at the session closes) |
| `daily-marks.csv` | Growth: realized, unrealized and marked net at each session close (with retention: partial fills in realized, the remainder in unrealized) |
| `attribution.json`, `attribution.md` | Per-origin attribution (base Growth, each continuation method) with continuation counts, drawdowns and P&L — **descriptive, not the causal effect** |
| `artifacts/minute-marks.csv.gz` | Only with *include minute marks*: gzip CSV `symbol,t_unix_utc,marked_net_usd`, one row per change of the minute-marked net (it holds until the next row), cents |

Missing pieces are stated, not invented: a Growth 1.0.0 run has no decision log or attribution; a run with both entry
gates OFF (or before 1.2.0) has no entry-decision, opportunity or entry-gate file; a run with the initial stop and
retention OFF (or before 1.3.0) has no `exit-fills.csv` (every trade is one fill) and none of the three options ON, no
`optional-rules.md`; a run with the Drawdown Recovery Gate OFF (or before 1.4.0) has no `drawdown-*` file and no gate
columns in `entry-decisions.csv`; an import has no trade ledger file
(its trades are paired from the events); a signal-only or demo run has no trades.

## Guarantees

- **Deterministic:** sorted entries, the run's completion instant as every entry's timestamp, stable row orders; the
  same run and options give the same bytes.
- **Integrity:** sha256 of every file in `manifest.json`; the copied artifacts must match the run's own manifest
  (written when the run completed); a mismatch refuses the export.
- **No secrets:** only the allowlisted artifact files of that run's directory are read; the export is refused if any
  file contains the server's access token. Credentials, environment variables and other files are never read.
- **Bounded:** at most 400 MB uncompressed (the minute marks are opt-in).

## How another analyst can check key claims

1. `sha256sum` each file against `manifest.json`, and the `artifacts/` files against `artifacts/manifest.json`.
2. Per trade: `net_usd = gross_before_costs_usd − costs_usd − interest_usd` (to the cent); interest =
   100,000 × 0.11 × (calendar days between the entry and exit session dates) / 365.
3. Pair entries and exits only by `trade_id` / `linked_event_id`; each fill comes after its decision.
4. Growth: per symbol, realized + unrealized = total marked net in `artifacts/metrics.json`, and the sums of
   `trades.csv` match.
5. Attribution by origin (and by entry source) sums to the totals, but **ON − OFF is a different quantity**: compare
   two complete runs (or `npm run growth-paired`).
6. Entry gates: every `entry-decisions.csv` row with a trade has that trade's `net_usd` from `trades.csv`; every raw
   crossing appears exactly once (`kind = crossing`); the opportunity end states in `opportunities.csv` add up to
   `entryGates.eligibility.endedBy` in `artifacts/metrics.json`.
7. To re-execute: the request (`artifacts/request.json`) and the code revision in `run.json`, then
   `node --experimental-transform-types apps/strategy-lab/scripts/replay-run.ts R-…` on the machine with the data.
