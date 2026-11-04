# Strategy Entry Explorer — demo dataset contract (v1) and original behaviour

> **Historical (2026-11-03).** The app is now **Strategy Lab** (`apps/strategy-lab/`, docs in `docs/strategy-lab/`),
> whose event contract is v2 ([CONTRACTS.md](../../strategy-lab/CONTRACTS.md)). This document remains the contract of
> the synthetic demo dataset (`apps/strategy-lab/fixtures/demo-dataset.v1.json`, schema
> `strategy-entry-explorer.dataset` v1), which Strategy Lab seeds as its "Demo (synthetic data)" experiment. Paths
> below were updated for the move: the v1 schema and generator now live in `apps/strategy-lab/shared/demo-schema/` and
> `shared/demo/`.

The Strategy Entry Explorer is a local browser app. It draws one instrument's price series with the **entry events**
of many strategy variations, two at a time, and keeps the date window you are looking at while you switch between
variations. It is Stage 0 of the [growth-entry research direction](PLAN.md).

**Current state:** a prototype driven by a **synthetic, fictional demo dataset**. It reads no market data, contains no
real strategy and runs no backtest. Code, scripts and tests are in `apps/strategy-lab/` (see its README).

```sh
npm --prefix apps/strategy-lab start     # from the repository root; installs on first run, opens the browser
```

## 1. What the UI does

- **Variations sidebar.** Search, and counts of raw signals and executed entries per variation. A click shows a
  variation as **A**. **Compare** overlays a second variation as **B**, and **Remove** drops it. Comparing never
  replaces A; promoting B to A leaves no B. Up/Down arrows move through the list.
- **Price chart (Dygraphs 2.2.2).** The price is the only line. Events are **markers**, not series:
  - **A = triangle**, **B = diamond**;
  - **signal = hollow outline**, **executed = filled**;
  - colours: aqua A, orange B, blue price, chosen with a colour-vision-deficiency check. Shape always carries identity
    too, so colour is never the only cue.
- **Hover or focus a marker** to see its events (variation, type, session date and exchange time, price, trigger and,
  for signals, whether they were executed). **Click** (or press Enter) to pin the event in the detail panel and
  highlight its table row. The selected marker gets a ring and a dashed vertical guide.
- **Detail panel:**
  - the event's ID, UTC instant, price basis, trigger summary, trigger values with units, and the variation's
    parameters;
  - the linked signal ↔ executed event, as a link;
  - the other events on the same bar;
  - previous/next stepping through drawn events, *Centre* (pan with the same span) and *Zoom ±3M*.
- **Type filter:** *Raw signals*, *Executed* or *Both*. Markers, legend counts, analysis columns and table rows always
  come from the same filtered list, so they agree.
- **Zoom.** Drag to zoom, shift-drag to pan, the range overview below the plot, presets (1M … 5Y, centred on the
  current view), *All*, and a From/To date form.
- **Entries table.** Sortable by variation, type, date and price; text filter; scope *Chart window* or *All dates*.
  Counts read "*n shown · m in window · t total*". Clicking a row (or pressing Enter on it) selects the event and, if
  it lies outside the window, pans the chart to it with the same span. Up/Down move between rows.
- **Entry analysis (DEMO).** Statistics computed in the browser from the loaded series (§4), per drawn variation and
  type, next to an every-session baseline. Scope is *Chart window* or *All dates*.
- **Status bar.** Dataset ID, schema version, provenance and generator seed, bar count, currency, adjustment, time zone,
  the alignment result, and the execution model.

## 2. Semantics

### 2.1 Signal versus executed

- A **signal** (`type: "signal"`) is a raw entry opportunity: the rule fired. It says nothing about whether a position
  could be opened.
- An **executed** entry (`type: "executed"`) is an entry the dataset's `executionModel` actually filled. It always links
  to the signal it executed (`linkedEventId`), and that signal links back and carries `execution.status = "executed"`.
  A signal that was not executed carries `execution.status = "not-executed"` and, where known, a reason.
- A dataset with any executed event must describe its `executionModel`. `isIllustrative: true` means the model only
  demonstrates the distinction and is not a trading simulation. That is the case for the demo.

### 2.2 Time

- Every instant (`t`) is **ISO 8601 UTC with a `Z` suffix**, to the second (milliseconds optional).
- `d` is the **session date** (YYYY-MM-DD) in the instrument's `exchangeTimezone` (IANA, e.g. `America/New_York`). The
  validator recomputes it from `t` with Intl, daylight saving included, and rejects a mismatch. An evening bar at 00:30
  UTC belongs to the previous New York date.
- `priceSeries.timestampConvention` says which instant a bar's `t` denotes. Daily demo bars use `bar-close`, the
  16:00 New York close: 20:00Z in summer, 21:00Z in winter.
- The UI shows clock times in the exchange zone with its abbreviation (e.g. "16:00 EDT"), never in the viewer's local
  zone. The chart's x axis uses UTC calendar ticks. For daily bars stamped at the regular close, the UTC date equals
  the New York session date. Minute data will need exchange-zone ticks (§6).

### 2.3 Prices

All prices — bars, event prices and `price` parameter values — are in `instrument.currency` with the adjustment named
by `instrument.priceAdjustment` (`none`, `splits` or `splits-and-distributions`). `priceBasis` says whether an event's
price is the bar close, the bar open, or a fill price. Markers sit on the plotted close of the event's bar; when the
event's own price differs, the detail panel shows both.

### 2.4 Alignment policy (events → bars)

Dygraphs can only anchor a marker to a data point, so each event must be matched to a bar. The policy is explicit and
shown in the status bar:

| Policy | Rule | Use |
| --- | --- | --- |
| `exact` | the event's instant equals a bar's `t` to the millisecond | **the demo fixture**: every event is a bar-close event (1,187 of 1,187 aligned) |
| `session-date` | daily bars only: the bar whose session date equals the event's `d` | reserved for intraday signals on a daily chart |

An event that matches no bar is **never moved to a nearby bar**. It is listed in the status bar as not drawn.
Duplicate bar timestamps are a validation error.

### 2.5 Same bar and overlapping markers

- Dygraphs keys annotations by (series, x), so two events on one bar would silently overwrite each other. The explorer
  therefore draws **one marker per bar** whose icon **stacks one glyph per event** (A before B, signal before executed).
  The tooltip lists every event on the bar; repeated clicks step through them; the detail panel lists them as
  "Events on this bar".
- When zoomed out, markers of neighbouring sessions overlap on screen. Each stays on its own bar. The tooltip lists
  every marker under the pointer ("n events on m neighbouring sessions overlap here — zoom in to separate them"), and
  repeated clicks step through all of them. Every marker is also reachable with the keyboard (Tab, then Enter).

### 2.6 Viewport policy

The visible date window belongs to the chart, not to the selection state. Selecting or comparing variations, changing
filters, hiding a variation, and selecting events **do not change it**: the chart is created once per dataset, and only
its annotations are replaced. The window changes only through the user's own gestures, the presets, the date form,
*Centre* / *Zoom ±3M*, and selecting a table row whose event is outside the window (a pan with the same span). An
automated test checks that a 2020–2022 window survives switching variations, and a negative control confirms that the
test fails when a reset is injected.

## 3. Data contract — schema version 1

The TypeScript definition is `apps/strategy-lab/shared/demo-schema/types.ts`; the validator is `shared/demo-schema/validate.ts`.

### 3.1 Versioning

- `schema` is always `"strategy-entry-explorer.dataset"`; `schemaVersion` is `1`.
- A change that alters the meaning or requiredness of an existing field needs a new version number, a validator for it
  and a migration note here.
- The v1 validator ignores unknown fields. Producers should put extra per-event information in `meta` (string,
  number, boolean or null values) rather than invent top-level fields.

### 3.2 Dataset

| Field | Type | Meaning |
| --- | --- | --- |
| `schema`, `schemaVersion` | string, 1 | Contract identification (§3.1) |
| `datasetId` | string | Stable lowercase id (`[a-z0-9][a-z0-9.-]*`) |
| `title` | string | Display title |
| `provenance.kind` | `synthetic` \| `backtest` \| `research-study` | Where the numbers come from; only `synthetic` exists today |
| `provenance.description` | string | How the dataset was produced |
| `provenance.generator` | `{name, version, seed}` | Required for `synthetic`; reproduces the dataset |
| `provenance.sources` | `[{path, sha256}]` | For non-synthetic data: input files (repository-relative) and hashes |
| `provenance.disclosures` | string[] | Statements the UI shows wherever the data is displayed |
| `instrument.symbol` | string | Ticker, or an illustrative label when synthetic |
| `instrument.label` | string | Display label; must contain "synthetic" for synthetic data |
| `instrument.isSynthetic` | boolean | Must be true exactly when `provenance.kind` is `synthetic` |
| `instrument.currency` | ISO 4217 | Currency of every price |
| `instrument.priceAdjustment` | `none` \| `splits` \| `splits-and-distributions` | Adjustment of every price |
| `instrument.exchangeTimezone` | IANA zone | Zone of session dates and displayed clock times |
| `priceSeries.interval` | `1d` \| `1m` | Bar length (`1m` reserved) |
| `priceSeries.timestampConvention` | `bar-close` \| `bar-open` | Which instant a bar's `t` denotes |
| `priceSeries.calendar` | string | Description of the session calendar |
| `priceSeries.bars` | PriceBar[] | Strictly ascending by `t`, no duplicates, at least two |
| `executionModel` | ExecutionModel | Required when any event is `executed` |
| `variations` | Variation[] | At least one; unique ids |

### 3.3 PriceBar, Variation, EntryEvent, ParameterValue

| Object | Field | Type | Meaning |
| --- | --- | --- | --- |
| PriceBar | `t` | ISO UTC | Bar instant (per `timestampConvention`) |
| | `d` | YYYY-MM-DD | Session date in the exchange zone (checked against `t`) |
| | `o`, `h`, `l`, `c` | number > 0 | Prices; `l ≤ min(o, c)`, `h ≥ max(o, c)` |
| | `v` | number ≥ 0, optional | Volume |
| Variation | `id` | string | Stable lowercase id, unique |
| | `code` | string | Short display code (e.g. `V1`) |
| | `name`, `family`, `summary` | string | Display name, mechanism family (search only), one-sentence rule |
| | `parameters` | ParameterValue[] | The variation's parameters with units |
| | `events` | EntryEvent[] | Its events (any order; the app sorts) |
| EntryEvent | `id` | string | Stable, unique in the dataset (demo: `<variationId>:<type>:<date>`) |
| | `variationId` | string | Must equal the containing variation's id |
| | `type` | `signal` \| `executed` | §2.1 |
| | `t`, `d` | ISO UTC, YYYY-MM-DD | §2.2 |
| | `price`, `priceBasis` | number > 0, `bar-close` \| `bar-open` \| `fill` | §2.3 |
| | `trigger.summary` | string | Human-readable reason, true of the data |
| | `trigger.values` | ParameterValue[] | The trigger's numbers with units (thresholds, lookbacks, reference levels and dates) |
| | `linkedEventId` | string, optional | signal → its executed entry; executed → its signal (required for executed) |
| | `execution` | `{status, reason?}`, signals only | `executed` or `not-executed` |
| | `meta` | object, optional | Extra scalar values |
| ParameterValue | `key`, `label` | string | Machine key and display label |
| | `value` | number \| string | |
| | `unit` | see below | |

**Units.**

| Unit | Meaning |
| --- | --- |
| `percent` | Percentage points: 5.2 means 5.2% |
| `price` | Instrument currency, with the instrument's adjustment |
| `sessions` | A count of trading sessions |
| `date` | A session date (YYYY-MM-DD) |
| `index` | A dimensionless indicator reading (e.g. RSI 0–100) |
| `ratio` | A plain multiple (e.g. 2 standard deviations) |
| `count` | A plain count |
| `text` | A string value |

### 3.4 Validation

`validateDataset()` rejects a dataset, and the UI then shows the errors instead of partial data, when any of these is
violated:

- the structure and types above;
- strictly ascending, duplicate-free bar timestamps;
- session dates consistent with `t` in the exchange zone;
- OHLC consistency;
- unique variation and event ids;
- `variationId` equal to the containing variation;
- reciprocal signal ↔ executed links within one variation, with an executed entry never before its signal;
- an execution status consistent with the links;
- known units, with numeric values for numeric units;
- the synthetic labelling rules.

The error list is capped at 50 entries.

### 3.5 Minimal example

This example is validated by `tests/docs-example.test.ts`, so it cannot drift from the code. It spans the 2024
daylight-saving change (21:00Z → 20:00Z).

```json
{
  "schema": "strategy-entry-explorer.dataset",
  "schemaVersion": 1,
  "datasetId": "example-minimal",
  "title": "Minimal example",
  "provenance": {
    "kind": "synthetic",
    "description": "Hand-written example for the documentation.",
    "generator": { "name": "hand-written", "version": "1", "seed": 0 },
    "disclosures": ["Synthetic example prices, not market data."]
  },
  "instrument": {
    "symbol": "VGT",
    "label": "VGT (illustrative label) · synthetic prices",
    "isSynthetic": true,
    "currency": "USD",
    "priceAdjustment": "none",
    "exchangeTimezone": "America/New_York"
  },
  "priceSeries": {
    "interval": "1d",
    "timestampConvention": "bar-close",
    "calendar": "Three synthetic sessions around the 2024 daylight-saving change.",
    "bars": [
      { "t": "2024-03-08T21:00:00Z", "d": "2024-03-08", "o": 100.0, "h": 101.2, "l": 99.5, "c": 100.8 },
      { "t": "2024-03-11T20:00:00Z", "d": "2024-03-11", "o": 100.9, "h": 103.4, "l": 100.4, "c": 103.0 },
      { "t": "2024-03-12T20:00:00Z", "d": "2024-03-12", "o": 103.1, "h": 104.6, "l": 102.7, "c": 104.2 }
    ]
  },
  "executionModel": {
    "id": "example-next-close",
    "label": "Next-session close (illustrative)",
    "isIllustrative": true,
    "description": "A signal is filled at the close of the next session.",
    "parameters": [{ "key": "fillDelay", "label": "Fill delay", "value": 1, "unit": "sessions" }]
  },
  "variations": [
    {
      "id": "example-rise",
      "code": "E1",
      "name": "Example: 2% daily rise",
      "family": "momentum",
      "summary": "Close at least 2% above the prior close.",
      "parameters": [{ "key": "threshold", "label": "Daily rise", "value": 2, "unit": "percent" }],
      "events": [
        {
          "id": "example-rise:signal:2024-03-11",
          "variationId": "example-rise",
          "type": "signal",
          "t": "2024-03-11T20:00:00Z",
          "d": "2024-03-11",
          "price": 103.0,
          "priceBasis": "bar-close",
          "trigger": {
            "summary": "Close 103.00 is +2.18% above the prior close 100.80",
            "values": [
              { "key": "rise", "label": "Daily rise", "value": 2.18, "unit": "percent" },
              { "key": "priorClose", "label": "Prior close", "value": 100.8, "unit": "price" }
            ]
          },
          "execution": { "status": "executed" },
          "linkedEventId": "example-rise:executed:2024-03-12"
        },
        {
          "id": "example-rise:executed:2024-03-12",
          "variationId": "example-rise",
          "type": "executed",
          "t": "2024-03-12T20:00:00Z",
          "d": "2024-03-12",
          "price": 104.2,
          "priceBasis": "bar-close",
          "trigger": {
            "summary": "Filled at the 2024-03-12 close, 1 session after the 2024-03-11 signal",
            "values": [{ "key": "signalDate", "label": "Signal date", "value": "2024-03-11", "unit": "date" }]
          },
          "linkedEventId": "example-rise:signal:2024-03-11"
        }
      ]
    }
  ]
}
```

## 4. Demo statistics (Entry analysis panel)

Computed in the browser from the loaded closes (`src/analysis/forward.ts`) for the drawn variations, per event type,
and for a baseline:

- **Horizon H = 63 sessions** after the event's bar, close to close. Intrabar highs and lows are ignored.
- **Complete / censored.** Only events with all H later sessions count. The others are reported as censored and never
  treated as misses.
- **Reached +5 / +10 / +15% within H.** Some close is at least entry × (1 + x). Shown as a rate with `hits/complete`.
  *Median sessions to target* is taken over the events that reached it.
- **MFE / MAE.** The highest and lowest close in the horizon relative to the entry price. Medians are shown, plus the
  MAE 10th percentile (a tenth of events dipped at least that far). Quantiles use linear interpolation.
- **Non-overlapping.** Events counted greedily at least H sessions apart. Overlapping windows share moves, so the raw n
  overstates the evidence.
- **Baseline.** The same statistics for an entry at the close of every session in scope.
- **Scope.** Events whose bar lies in the chart window, or all dates. The forward window may extend beyond the chart
  window: that is harmless for synthetic data, but a real-data adapter must clamp the forward window to the allowed
  dates as well (see PLAN §3.7).

With the demo fixture, these numbers describe a random walk and **say nothing about VGT or about any strategy**. The
panel and the banner say so.

## 5. Architecture (as built on 2026-11-03; superseded by docs/strategy-lab/ARCHITECTURE.md)

```text
apps/strategy-entry-explorer/   (renamed apps/strategy-lab/ on 2026-11-04; this tree no longer exists)
  src/schema/      types.ts (contract v1) · validate.ts · time.ts (UTC ↔ exchange zone) · align.ts (alignment policies)
  src/data/        source.ts (DatasetSource interface, StaticJsonSource, loadDataset = fetch → validate → model)
                   model.ts (indexes, placed events)
  src/state/       explorer.ts (reducer: A, B, visibility, type filter, selection, table/analysis options — no viewport)
                   selectors.ts (drawn events, same-bar clusters, counts, bar spans)
  src/chart/       PriceChart.tsx (Dygraphs lifecycle) · markers.ts (cluster → annotation, glyph icons)
  src/analysis/    forward.ts (forward statistics)
  src/components/  header, sidebar, chart panel, detail, analysis, entries table, tooltip, status bar
  src/demo/        the deterministic synthetic generator (never imported by the UI)
  public/data/     demo-dataset.v1.json (generated, checked in)
  tests/  e2e/     Vitest unit tests · Playwright acceptance walkthrough (system Chrome)
```

**Dygraphs in React.** `PriceChart` creates the `Dygraph` in an effect keyed only on the loaded model and destroys it in
the cleanup, which is also correct under React StrictMode's double mount. Annotations are replaced with
`setAnnotations()` in a separate effect. Callbacks reach the chart through a ref, so a new callback never recreates the
graph. A `ResizeObserver` calls `resize()` on the next animation frame. The visible window is reported to React from
`drawCallback`, on the next frame and only when it changed.

**Adapters.** A future real-data source implements `DatasetSource.fetchRaw()` and returns schema-v1 JSON. Validation,
alignment and the whole UI stay unchanged. The adapter must:

- record provenance (`kind: "backtest"` or `"research-study"`, `sources` with sha256);
- read repository data read-only;
- clamp what it returns to the dates the study's protocol allows, so that holdout dates are never rendered before a
  freeze.

The UI hardcodes nothing per variation; nothing depends on a variation's name or id.

## 6. Ready for later (not built)

- **Minute data and intraday events.** The `1m` interval, the `session-date` policy, and exchange-zone clock times are
  in the contract. A minute chart will also need exchange-zone axis ticks and session-gap handling.
- **Range-aware downsampling.** The model keeps raw bars and raw event timestamps. A later `PriceSeries` view can
  serve an OHLC-preserving downsample per visible range, while events keep their exact instants and alignment.
- **Exit markers.** An `exit` event type and position spans need a v2 schema decision. They are deliberately not
  invented now.
- **Audit log of viewed variations** (PLAN §6).

## 7. The demo fixture

- **Generator.** `src/demo/` (`npm run generate:fixture`; `-- --check` verifies the checked-in file byte for byte). It is
  `strategy-entry-explorer-demo 1.0.0`, seed **20261133**. The seed was chosen by screening seeds 20261100–20261499 for
  a path with 4–8.5× growth, a 25–42% maximum drawdown and at least four corrections of 10% or more. Nothing was
  screened on event outcomes.
- **Prices.** A geometric random walk whose drift and volatility switch between four invented regimes (advance, drift,
  correction, sell-off; a Markov chain), starting at 100.00 on 2016-01-04. The path ends at about 6× its start.
  OHLC bars are rounded to cents.
- **Calendar.** Every Monday–Friday from 2016-01-04 to 2026-10-30, which gives 2,825 sessions. Exchange holidays and
  early closes are not modelled. Each bar is stamped at the 16:00 New York close.
- **Variations.** Twelve toy rules on the synthetic closes:

  | Code | Rule |
  | --- | --- |
  | V1 | 5% rebound from the 20-session low |
  | V2 | Shallow 2–4% pullback in an uptrend |
  | V3 | Breakout above the prior 60-session high after a base |
  | V4 | SMA 50/200 crossover |
  | V5 | RSI(14) reclaims 50 above SMA200 |
  | V6 | Volatility squeeze and a 20-session high |
  | V7 | Half retracement after an 8% drawdown |
  | V8 | Bounce off a rising SMA50 |
  | V9 | Dual momentum turn |
  | V10 | Thrust day above SMA50 |
  | V11 | Lower Bollinger band reclaim in a rising trend |
  | V12 | 10% rebound from the 60-session low |

  Their only job is to make every trigger description true of the fixture. They are not research candidates.
- **Execution model.** Illustrative single-position occupancy. When flat, a signal is executed at the next session's
  close, and the position then counts as occupied for 30 sessions — a placeholder, not an exit. Signals during
  occupancy, or on the last session, are not executed, and the reason is recorded.
