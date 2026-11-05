# Strategy Lab — data contracts

Source of truth: `apps/strategy-lab/shared/contract.ts` (types), `shared/validate-events.ts` (event validation),
`shared/params.ts` (the parameter schema's logic), `shared/strategies.ts` (the registry and run-request validation) and
`shared/phenotypes.ts` (the phenotype export contract). Every strategy, importer and the UI use these.

## Event contract, version 2

`events.json` holds `{ "contractVersion": 2, "runId": "R-000042", "events": [LabEvent…] }`, sorted canonically.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Unique within the run, stable across reads (e.g. `VGT:entry_signal:2021-03-05T21:00:00Z`, `GDX:T-12:exit`) |
| `runId` | `R-…` | The run that produced it |
| `symbol` | string | The instrument. **Charts and tables filter on this field** (`eventsForSymbol`) |
| `kind` | `entry_signal` · `executed_entry` · `executed_exit` · `rejected_signal` | Signal = the rule fired, no position implied. Executed = filled by a valid execution simulation or a real record. Rejected = a signal an allocator recorded as not executed |
| `t` | ISO 8601 UTC (`…Z`) | The instant. Never a local time |
| `timePrecision` | `minute` · `session-close` · `day` · `unknown` | How precise `t` is. With `day`, the time part is a placeholder and is never displayed |
| `timeMeaning` | string | What the instant denotes (e.g. "end of the completed 1d bar", "start of the minute bar the engine filled in") |
| `price` | number or **`null`** | The event's price. `null` = not recorded (unknown); never 0 or a guess |
| `priceBasis` | `bar-close` · `fill` · `decision` · `unknown` | What `price` is. Must be `unknown` when `price` is `null` |
| `reason` | string or `null` | Trigger or decision description |
| `values` | LabValue[] | Structured trigger and decision values with units (below) |
| `tradeId` | string or `null` | Trade linkage: an entry and its exit share it |
| `linkedEventId` | string or `null` | The paired event (entry ↔ exit). It must exist and have the same symbol |
| `meta` | object of scalars or `null` | Extra facts (e.g. `open: true` for a lot still open at the run's end; `synthetic`, `illustrative`) |

- **Ordering:** by time, then kind (rejected, signal, exit, entry, so an exit precedes a same-minute re-entry), then id.
- **Entry origin (Growth 1.1.0).** Growth events carry `values` `origin` (`base_growth` | `continuation`) and, for
  continuation, `method` and `episode`; `meta.origin`/`meta.method` repeat them. A continuation trigger is an
  `entry_signal` with id `SYM:continuation:<t>`; one suppressed by base priority is a `rejected_signal` (`meta.reasonCode
  = base_priority`). Base event ids are unchanged (`SYM:entry_signal:<t>`, `SYM:T-n:entry|exit`). Earlier runs have no
  origin (their only entry is the base one).
- **Data origin** is a property of the run (`real` | `synthetic`). One run never mixes the two, and runs of different
  origins are never compared.
- **Units of prices:** the run's currency (USD), forward split-adjusted to the run's basis date, which is the first
  loaded session (`priceSource.basisDate`, `basisBySymbol`).

### LabValue

`{ key, label, value, unit }`:

- `value` is a number, string, boolean or **`null` (unknown, e.g. a censored outcome)**;
- `unit` is one of `percent` (percentage points), `price`, `usd`, `bars`, `sessions`, `minutes`, `days` (calendar
  days), `bps` (basis points), `date`, `datetime` (ISO UTC, displayed in ET), `count`, `ratio`, `index`, `text`.
  `days` and `bps` were added on 2026-11-04 for the trading backtest; no earlier event uses them.

### Example (a real signal of a manual run, abbreviated)

```json
{
  "id": "VGT:entry_signal:2016-02-16T21:00:00Z",
  "runId": "R-000013",
  "symbol": "VGT",
  "kind": "entry_signal",
  "t": "2016-02-16T21:00:00Z",
  "timePrecision": "session-close",
  "timeMeaning": "scheduled close of the session (16:00 ET, 13:00 on early-close days): the daily bar is complete",
  "price": 97.66,
  "priceBasis": "bar-close",
  "reason": "Close 97.66 is 5.07% above the 20-bar low 92.95 (bar ending 2016-02-08 16:00 EST); the previous bar was 2.93% above its low",
  "values": [
    { "key": "advance", "label": "Advance above the recent low", "value": 5.07, "unit": "percent" },
    { "key": "return63", "label": "Return after 63 sessions (close to close)", "value": null, "unit": "percent" }
  ],
  "tradeId": null,
  "linkedEventId": null,
  "meta": { "censored": false, "signalOnly": true }
}
```

## Parameter schema (version 2, since 2026-11-04)

One schema for every strategy (`shared/contract.ts` `ParamSchema`, logic in `shared/params.ts`). It replaced the
version-1 `ParamSpec[]` (with `dependsOn`), and migration 0002 converted every stored strategy row; there is no second
implementation.

`StrategySpec` = `ParamSchema` + `key`, `version`, `title`, `kind` (`entry_signal` | `trades`), `launch` (`form` = New
Test, `phenotype` = catalogue reruns only, `none` = read-only), `runnable`, `description`, `resolutions`,
`defaultResolution`, optional `notes`, `formerTitles`, `legacy` (`supersededBy`, `replay`) and `groupNotes` (since
Growth 1.2.0: value-dependent explanations and warnings shown inside a group while a predicate holds — `{ id, group,
when, text, tone }`; display metadata, not part of the stored schema, so the form has no strategy-specific branches).

`ParamSchema` = `{ schemaVersion: 2, params, groups, constraints, identity }`:

- **`params`** — each `{ key, label, description, type, unit, default, group?, activeWhen?, whenInactive?, execution? }`:
  - `type: number | integer` with `min`, `max`, `step` and optional `search` (`min`, `max`, `step`, `scale`) for
    optimisers; `type: boolean` (a rule switch); `type: enum` with `options` (`value`, `label`, `description`);
  - `activeWhen`: a predicate (`{param, equals}`, `{param, in}`, `{all}`, `{any}`, `{not}`). A parameter is **active**
    (applied) when its predicate holds **and every parameter it reads is itself active** (a chain);
  - `whenInactive`: `disable` (shown disabled, "saved, not applied") or `hide` (not shown).
- **`constraints`** — `requires` (`if` predicate ⇒ `then` predicate) and `less` (`a < b`, only while both are
  active). Checked by the form and by the server (`validateParams`).
- **`identity`** — the variation identity: `effective` = canonical JSON (sorted keys) of the **active** values plus
  `|resolution`; `all-values` = of every stored value (frozen rule of Growth 1.0.0). For a strategy whose parameters are
  always active both rules give the same string, so the signal-only identities are unchanged
  (`{"advanceFromRecentLowPercent":5,"recentLowLookbackBars":20}|1d`).

Validation of a request (`validateParams`): unknown keys are refused; every **active** parameter must be present and
valid; an inactive one may be absent, but if present (a saved draft) must still be a valid value. The engine executes
only the effective values (`effectiveParams`). The run's snapshot (`paramSnapshot`) lists every submitted value — a
switch as ON/OFF, a choice by its label, an inactive one labelled "saved, not applied" — and the variation stores the
effective configuration.

Optimisation metadata (for future CLI optimisers; nothing in Strategy Lab searches): `searchSpaceOf(spec)` returns each
dimension's legal domain (numeric range and step, enum values, booleans) with the predicate under which it applies, and
the constraints; `sampleCandidate(spec, rng, base)` draws a valid effective candidate (smoke tests).

`rise-from-recent-low@1.0.0`:

| Key | Label | Type | Unit | Default | Range |
| --- | --- | --- | --- | --- | --- |
| `advanceFromRecentLowPercent` | Advance from recent low (X) | number | percent | 5 | 0.1–100 |
| `recentLowLookbackBars` | Recent-low lookback (N) | integer | bars | 20 | 2–5000 |
| *(run configuration)* `resolution` | Bar resolution | — | — | `1d` | `1d`, `60m`, `30m`, `15m`, `5m`, `1m` |

The rule itself is specified in `src/entry-signals/README.md`.

**Growth** — `rise-from-recent-low-trading@1.2.0` (kind `trades`, launch `form`; [GROWTH_TRADING.md](GROWTH_TRADING.md)):

| Key | Label | Type | Unit | Default | Range | Group / applies when |
| --- | --- | --- | --- | --- | --- | --- |
| `advanceFromRecentLowPercent` | Advance from recent low (X) | number | percent | 5 | 0.1–100 | entry |
| `recentLowLookbackBars` | Recent-low lookback (N) | integer | bars | 20 | 2–5000 | entry |
| `trendFilterEnabled` | Entry trend filter | boolean | — | false | — | trend |
| `trendMethod` | Trend method (`price_change`, `regression_slope`, `rising_sma`, `higher_highs_lows`, `momentum`) | enum | — | `price_change` | — | trend / filter ON |
| `trendChangeLookbackSessions` … `trendMomentumMinimumLongReturnPercent` | each method's inputs (sessions, percents; only the chosen method's apply) | | | | | trend / that method — [GROWTH_ENTRY_GATES.md](GROWTH_ENTRY_GATES.md) §2.2 |
| `eligibilityEnabled` | Persistent entry eligibility | boolean | — | false | — | eligibility |
| `eligibilityPolicy` | Eligibility policy (`time_limited`, `minimum_strength`, `maximum_extension`, `deterioration`, `reset_renew`) | enum | — | `time_limited` | — | eligibility / ON |
| `eligibilityMaxAgeSessions` | Maximum opportunity age (W) | integer | sessions | 10 | 1–120 | eligibility / ON (every policy) |
| `eligibilityMinimumAdvancePercent` … `eligibilityRenewalReboundPercent` | each policy's inputs | | | | | eligibility / that policy — [GROWTH_ENTRY_GATES.md](GROWTH_ENTRY_GATES.md) §3.2 |
| `trailingStopPercent` | Trailing stop (always on) | number | percent | 7.3 | 0.1–50 | exit |
| `maximumHoldEnabled` | Maximum losing hold | boolean | — | true | — | exit |
| `maximumHoldDays` | Maximum losing hold age | integer | days | 8 | 1–3650 | exit / hold ON (disabled otherwise) |
| `intradayLossBufferEnabled` | Buffered intraday-loss exit | boolean | — | true | — | exit / hold ON (disabled otherwise) |
| `intradayLossBufferPercent` | Intraday loss buffer (% of the $100,000 notional, net after interest) | number | percent | 2.9 | 0–50 | exit / buffer ON |
| `continuationEnabled` … `crossMarginPercent` | the continuation entries (OFF by default; a method choice and only its inputs) | | | | | continuation — [GROWTH_CONTINUATION.md](GROWTH_CONTINUATION.md) §4 |
| `costBpsPerSide` | Transaction cost per side | number | bps | 5 | 0–100 | execution |
| *(run configuration)* `resolution` | Bar resolution | — | — | `1d` | as above | entry |

- **Refused:** `intradayLossBufferEnabled: true` with `maximumHoldEnabled: false` (the buffer only exists from the
  hold age); with the shallow-pullback method, `pullbackMinimumPercent ≥ pullbackMaximumPercent`; with the momentum
  trend method, `trendMomentumShortSessions ≥ trendMomentumLongSessions` (constraint `momentum-short-long`); a 1.2.0
  request without `continuationEnabled`, `trendFilterEnabled` or `eligibilityEnabled` (always-active switches are
  required).
- **Growth 1.1.0** (launch `phenotype`, identity `effective`) keeps exactly its parameters (the table without the
  trend and eligibility rows). New Test refuses it with the replay explanation; its catalogue phenotypes rerun as 1.1.0
  configurations; its stored runs are read as recorded.
- **Growth 1.0.0** (launch `none`, identity `all-values`) keeps exactly its eight parameters above (without the
  continuation ones). New runs of it are refused with the replay explanation; its stored runs are read as recorded.
- **Display names are metadata.** Keys and versions never change; `strategies.title` and `former_title` hold the
  display name and the earlier one (migration 0002 renamed `rise-from-recent-low-trading` to *Growth*).

## Manual run request (`POST /api/runs`)

```json
{
  "strategyKey": "rise-from-recent-low",
  "strategyVersion": "1.0.0",
  "params": { "advanceFromRecentLowPercent": 6, "recentLowLookbackBars": 20 },
  "symbols": ["VGT", "GDX"],
  "from": "2016-01-04",
  "to": "2023-12-29",
  "resolution": "1d",
  "title": "optional",
  "parentVariation": "V-000003"
}
```

A Growth request has the same shape, with `"strategyKey": "rise-from-recent-low-trading"`, `"strategyVersion":
"1.2.0"` and its parameters (numbers, switches as JSON booleans, `continuationMethod`, `trendMethod` and
`eligibilityPolicy` as strings; inactive ones may be omitted).

A phenotype rerun (`POST /api/phenotypes/PH-0001/runs`, [PHENOTYPES.md](PHENOTYPES.md)) builds the same request from the
frozen record plus `phenotypeId`, which the run records (`runs.phenotype_id`, an immutable input).

**Exactly one configuration:** every parameter is a scalar, and unknown fields are rejected. This endpoint is not for
optimisation, and Strategy Lab has no endpoint that is.

## Run artifacts (`state/strategy-lab/runs/R-xxxxxx/`)

| File | Content |
| --- | --- |
| `request.json` | The validated request plus `runId` (manual runs) |
| `events.json` | Contract v2 events (sha256 recorded in `runs.artifact_sha256` and checked on every read) |
| `metrics.json` | Entry-signal outcomes per symbol with an every-session baseline (`kind: entry-signal outcomes`); the imported trade summary (`kind: imported trades`); or, for a trading backtest, per symbol: signals, trades, P&L, drawdowns, exposure, holding, reconciliation checks, and `unavailable` reasons (`kind: trading backtest`) |
| `trades.json` | Trading backtests: the trade ledger per symbol (decision, fills, exit reason, gross/costs/interest/net, holding, worst/best mark; since 1.1.0 also `origin`, `method`, `episode`, `opensEpisode`; since 1.2.0, with an entry gate ON, `entrySource`, `opportunity`, `opportunitySignalTimeUtc`, `opportunitySignalPrice`, `ageSessionsAtDecision`, `ageSessionsAtFill`) |
| `daily.json` | Trading backtests: the daily marks per symbol (realized, unrealized, marked net, held at the close) |
| `decisions.json` | Growth 1.1.0+: per symbol, the continuation episodes and the chronological decision/state log ([GROWTH_CONTINUATION.md](GROWTH_CONTINUATION.md) §5); 1.2.0 with an entry gate ON adds `opportunities`, `renewalWatches` and `entryDecisions` ([GROWTH_ENTRY_GATES.md](GROWTH_ENTRY_GATES.md) §4); run level `trendFilter`, `eligibility` |
| `minute-marks.csv.gz` | Growth 1.1.0: gzip CSV `symbol,t_unix_utc,marked_net_usd`, one row per change of the minute-marked net (cents) |
| `study8/`, `study8-output.json` | Shared-slot pool reruns: the unchanged Study 8 runner's output directory and the sha256 of each of its files |
| `provenance.json` | Per symbol: the dataset window report (data file, sha256, partitions file sha256, evaluation and warm-up dates, split adjustments, access mode); the engine files' sha256; the Node version |
| `import.json` | For imports: the source directory, source file sha256s and the verification checks |
| `manifest.json` | sha256 of every file above |
| `run.log` | The runner's progress lines and stderr |
