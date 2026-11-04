# Strategy Lab — data contracts

Source of truth: `apps/strategy-lab/shared/contract.ts` (types), `shared/validate-events.ts` (event validation) and
`shared/strategies.ts` (parameter schemas and run-request validation). Every strategy, importer and the UI use these.

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
- **Data origin** is a property of the run (`real` | `synthetic`). One run never mixes the two, and runs of different
  origins are never compared.
- **Units of prices:** the run's currency (USD), forward split-adjusted to the run's basis date, which is the first
  loaded session (`priceSource.basisDate`, `basisBySymbol`).

### LabValue

`{ key, label, value, unit }`:

- `value` is a number, string, boolean or **`null` (unknown, e.g. a censored outcome)**;
- `unit` is one of `percent` (percentage points), `price`, `usd`, `bars`, `sessions`, `minutes`, `date`, `datetime`
  (ISO UTC, displayed in ET), `count`, `ratio`, `index`, `text`.

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

## Parameter schema

`StrategySpec` holds:

- `key`, `version`, `title`, `kind` (`entry_signal` | `trades`), `runnable`, `description`;
- `params: ParamSpec[]`;
- `resolutions` and `defaultResolution`.

A `ParamSpec` is `{ key, label, description, type: number|integer, unit, default, min, max, step }`. The browser form is
generated from it, and the server validates against the same object.

`rise-from-recent-low@1.0.0`:

| Key | Label | Type | Unit | Default | Range |
| --- | --- | --- | --- | --- | --- |
| `advanceFromRecentLowPercent` | Advance from recent low (X) | number | percent | 5 | 0.1–100 |
| `recentLowLookbackBars` | Recent-low lookback (N) | integer | bars | 20 | 2–5000 |
| *(run configuration)* `resolution` | Bar resolution | — | — | `1d` | `1d`, `60m`, `30m`, `15m`, `5m`, `1m` |

The rule itself is specified in `src/entry-signals/README.md`.

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

**Exactly one configuration:** every parameter is a scalar, and unknown fields are rejected. This endpoint is not for
optimisation, and Strategy Lab has no endpoint that is.

## Run artifacts (`state/strategy-lab/runs/R-xxxxxx/`)

| File | Content |
| --- | --- |
| `request.json` | The validated request plus `runId` (manual runs) |
| `events.json` | Contract v2 events (sha256 recorded in `runs.artifact_sha256` and checked on every read) |
| `metrics.json` | Entry-signal outcomes per symbol with an every-session baseline (`kind: entry-signal outcomes`), or the imported trade summary (`kind: imported trades`) |
| `provenance.json` | Per symbol: the dataset window report (data file, sha256, partitions file sha256, evaluation and warm-up dates, split adjustments, access mode); the engine files' sha256; the Node version |
| `import.json` | For imports: the source directory, source file sha256s and the verification checks |
| `manifest.json` | sha256 of every file above |
| `run.log` | The runner's progress lines and stderr |
