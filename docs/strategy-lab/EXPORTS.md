# Research bundle exports

Every completed run can be downloaded as ONE deterministic ZIP that an analyst — or ChatGPT/Claude — can review
without access to the Strategy Lab server. The bundle never changes a run artifact.

- **UI:** a run's header → **Export research bundle** (tick *include minute marks* to add the minute series).
- **API:** `GET /api/runs/R-000042/export` (`?minute=1` for the minute marks); the normal access token applies; only
  completed runs export.
- **CLI:** `npm --prefix apps/strategy-lab run export -- R-000042 [--minute] [--out file.zip] [--state DIR]`.
- **Code:** `apps/strategy-lab/server/export.ts` (contents), `server/zip.ts` (the ZIP writer/reader).

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
| `entry-decisions.csv` | Growth 1.2.0 with the entry trend filter or persistent eligibility ON: one row per Growth entry decision (raw crossing, latched decision, renewal signal, continuation trigger) — time (UTC, New York), session, decision price, the crossing's threshold/low/advance, disposition and reason, the gate decision and text, the observed trend values and policy values (JSON), the opportunity or episode, the trade, its fill and its final realised or open unrealised net |
| `opportunities.csv` | Growth 1.2.0 with persistent eligibility ON: every armed opportunity — source (raw crossing or renewal, with lineage), policy, signal, last eligible session, evaluations and blocked counts, the decision and its age, how it ended and why, its trade, fill and net, the transitions (JSON) |
| `entry-gates.md` | Growth 1.2.0 with an entry gate ON: the gate configuration, the term definitions, and per symbol the vetoed/deferred counts, trend blocks, opportunity ends and ages, renewal watches and the trades by entry source — descriptive |
| `daily-marks.csv` | Growth: realized, unrealized and marked net at each session close |
| `attribution.json`, `attribution.md` | Per-origin attribution (base Growth, each continuation method) with continuation counts, drawdowns and P&L — **descriptive, not the causal effect** |
| `artifacts/minute-marks.csv.gz` | Only with *include minute marks*: gzip CSV `symbol,t_unix_utc,marked_net_usd`, one row per change of the minute-marked net (it holds until the next row), cents |

Missing pieces are stated, not invented: a Growth 1.0.0 run has no decision log or attribution; a run with both entry
gates OFF (or before 1.2.0) has no entry-decision, opportunity or entry-gate file; an import has no trade ledger file
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
