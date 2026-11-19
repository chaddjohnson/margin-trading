# Daily OHLC candles ("Candles · 1D")

Since 2026-11-06 (Task 16), the Strategy Lab price chart has two types, chosen above the legend:

- **Candles · 1D** (the default for real market data): one daily OHLC candle per NYSE session.
- **Line · intraday**: the existing interactive minute price line. Its behaviour and its resolution fetching are
  unchanged.

Switching never reruns anything. It keeps the run, the symbol, the date window, the selected event and the marker
checkboxes. The choice is a page preference, like the checkboxes: it survives run, symbol and preview changes, and a
new page opens on the candles. No preference is stored, so no database change was needed. This is a presentation
feature only. Strategies, the runner, events, trades, metrics, saved runs and phenotypes are untouched (see
[Unchanged](#unchanged)).

Code: `shared/candles.ts` (response type and validator), `server/prices.ts` (aggregation), `server/http.ts` (routes),
`src/chart/candles.ts` (pure drawing, read-out, ticks and marker placement), `src/chart/PriceChart.tsx` (the chart),
`src/components/RunView.tsx` (the selector). Brief: `brief/2026-11-06-daily-ohlc-candlesticks-brief.md`. Report,
verification and screenshots in short and long windows: `reports/2026-11-06-daily-candles/REPORT.md`.

## Where the candles come from

The server builds the candles from the canonical minute file `data/<SYMBOL>/data.csv`. It uses the same cached load
as the line (`server/prices.ts` → `src/lib/csv.ts` → `src/lib/session.ts` `groupMarketSessions`). That makes the
repository's own session builder the single source of the daily values. There is no second data source, and no
browser download of raw minutes.

| Price | Definition |
| --- | --- |
| **Open** | the first regular-session minute bar's **open** |
| **High** | the highest **high** of the regular-session minute bars, and the closing print |
| **Low** | the lowest **low** of the regular-session minute bars, and the closing print |
| **Close** | the **official closing print**: the open of the bar at the scheduled close (16:00 ET, or 13:00 ET on an early close). Without one in the file, the last regular-session minute's **close** |

- **Highs and lows are never taken from minute closes.** On almost every day the minute highs and lows reach beyond
  every minute close: 2,422 of VGT's 2,723 sessions (2016-01-04 → 2026-10-30), and 2,713 of GDX's.
- **The closing print** is the repository's established official close. Like the session builder (and every Growth
  rule), the candle counts it as part of the day's range: it widens the high or low only when it lies outside the
  minute range. This happens in 87 VGT, 17 GDX and 10 XBI sessions. Only the print (that bar's open) counts. The
  16:00 bar's own high and low are after-hours trades and are ignored.
- **Regular hours only.** Bars from 09:30 ET up to the close are in. Pre-market bars, after-hours bars and bars after
  an early close are out. Sessions are New York dates. Times use America/New_York with daylight saving, so 09:30 is
  14:30Z in EST and 13:30Z in EDT. Early closes come from `src/lib/calendar.ts`. Holidays have no bars and therefore
  no candle.
- **Missing minutes.** A minute without a trade has no bar in the file. Nothing is filled in. The candle uses the
  bars that exist, and the read-out says "312 of 390 minutes traded". Untraded minutes are common for thin ETFs
  (VGT: 2,555 of 2,723 sessions have fewer than 390 bars), so they are information, not an error.
- **Missing closing print.** The close is the last regular minute's close, and the read-out says so. This happens in
  VGT 5, GDX 1 and XBI 1 sessions.
- **Volume** is not shown.
- **Untrustworthy data.** Each session's adjusted prices must satisfy `low ≤ min(open, close) ≤ max(open, close) ≤
  high` (relative tolerance 1e-9) and be finite and positive. A session that fails gets **no candle**, never a
  repaired one. It is listed in the response's `omitted` with the reason, and the chart shows a warning above the
  tools. The real VGT, GDX and XBI files have no such session.

### Split adjustment and units

All four prices of a session are multiplied by the **same** split factor, `splitFactor(splits, symbol, basis,
session)` from `src/lib/corporateActions.ts`. The basis is the run's own: `basisDateOf(priceSource, symbol)`, the
first session the run loaded, the units its events were computed in. This is the rule the line and the events use.
Raw and adjusted prices are never mixed.

- VGT's 8:1 split took effect on 2026-04-21. A run with an earlier basis shows post-split sessions × 8, so the
  candles stay continuous.
- A Study 8 import uses its per-symbol `basisBySymbol`.
- A preview uses its own price source.
- When comparing runs, run B's markers are converted to run A's basis, as before. The candles are run A's.

The legend states the units, for example "VGT (USD per share, split-adjusted to 2022-12-01 share units) · daily OHLC".

## Drawing

- **Colours, never colour alone:**
  - **up** (close > open): teal-green `#26a69a`, a **hollow** body;
  - **down** (close < open): red `#ef5350`, a **solid** body;
  - **doji** (close = open, compared exactly: both prices carry the same factor): grey `#a4b1c4`, a flat 2 px bar
    across the wick.

  The wick runs from the low to the high in the candle's colour. The green/red pair passed the dataviz palette
  validator on the chart surface `#0b1220` (deutan ΔE 11.6, normal ΔE 29.6, contrast ≥ 3:1; log
  `apps/strategy-lab/logs/task16/candle-palette-validation.log`). The hollow/solid difference is the cue that does
  not depend on colour. The legend key shows all three.
- **Widths follow the zoom.**
  - A body is 60% of a day's width: odd from 3 px, so the wick is centred, and at most 36 px. Up bodies are hollow
    from 5 px; below that, both directions are solid.
  - Below **2 px per calendar day** (about 1.5 years in a 1,000 px plot), bodies cannot be drawn honestly. Every
    session is then drawn on its own as a thin low–high line in its colour. Lines may overlap, but they are never
    merged into a multi-day candle and never replaced by a bucketed line. A note on the chart says so: "2,722
    sessions in view — too dense for candle bodies …".
  - A one-year window keeps 2 px bodies.
- **Time axis.** Each candle sits at the midpoint of its session's scheduled hours: 12:45 ET, or 11:15 ET on an early
  close. That is a real instant inside the session, so both chart types share one time axis. Weekends and holidays
  are gaps.
  - Ticks fall under trading sessions only: every 1, 2 or 10 sessions (chosen on the session index, so they do not
    jump while panning), or the first session of each week. The first tick of each year shows the year.
  - Wider windows use the month and year ticks on New York midnights.
- **Autoscaling.** The chart has four series (open, high, low, close), so Dygraphs' y range covers the **highs and
  lows** in view. The overview (range selector) shows the daily closes.
- **Read-out (hover / crosshair).** The crosshair snaps to the nearest session. The read-out shows that session's New
  York date and weekday, "daily OHLC", O / H / L / C in dollars and the change close vs open, with its sign, in $ and
  %. Then, when they apply, it notes an early close, a missing closing print and minutes without trades. For example:
  `2023-06-30 Fri · daily OHLC · O $440.00 H $443.29 L $439.36 C $442.16 · +$2.16 (+0.49%) close vs open · 308 of
  390 minutes traded`. A candle never shows a minute time. Minute detail is in **Line · intraday**.

## Markers on candles

Events keep their exact recorded instants (UTC) and prices in the data, the tooltips, the event detail and the
table. Only the marker's horizontal position follows the deterministic **session policy**
(`src/chart/candles.ts` `markerSlots`, `fanOffset`):

1. **Session.** An event belongs to the session of its America/New_York date: the date every time label in the app
   shows. A closing-print exit at 16:00 ET and a 15:59 ET fill both belong to that day. Daylight saving is handled
   by `Intl`.
2. **Horizontal position.** The marker sits on that session's candle. If several events share a session, they are
   **fanned out left → right in canonical order**: time, then run A before run B, then kind, then id. The fan is
   centred on the candle with a fixed pixel step (one marker width when there is room, squeezed into 90% of a day,
   at least 3 px). **The step is not a time scale.** No marker is hidden or dropped, and no candle is invented.
3. **Vertical position.** The marker is at its recorded event or fill price, exactly as on the line (run B's in run
   A's units). An event without a recorded price keeps the line's rule: it is drawn at the market price at that
   instant and labelled "price not recorded".
4. **Fallback.** An event whose New York date has no candle keeps its own instant (`data-off-session`). None occurs
   in the real runs.

The tooltip adds where the marker sits, for example "Shown on the 2023-03-23 daily candle (3 of 15 events that
session, fanned left → right in time order); the time above is the exact event time." Each marker button also
carries `data-t` (the exact instant), `data-session` and `data-cluster` (`k/n`).

Shapes, colours and toggles are unchanged:

- executed entries and exits take their trade's net P&L colour;
- rejected signals are purple;
- raw signals are hollow;
- run B has an orange halo.

Interactions with markers are unchanged too:

- Clicking either marker of a trade selects the trade, and a click cycles through overlapping markers.
- Hovering links an entry to its exit with the connector. The connector runs between the two markers as placed, and
  a counterpart outside the view is reported.
- The tooltip shows the net P&L.

The event table's **Chart window** scope counts an event when its marker's x (its session's candle) is in view.
Selecting an event (in the table, the detail or the Trades list) and **Zoom here** centre the chart on its marker,
that is its session's candle. **Line · intraday** restores exact minute placement.

## Interactions

| Gesture | On candles |
| --- | --- |
| Drag | Measures from one session's daily **close** to another's (earlier → later, whichever way you drag). The bar reads "Daily close → daily close", e.g. `2023-05-18 close → 2023-06-01 close`, $ and % (`data-basis="daily-close"`). It never zooms or pans, and it clears on release, Escape, blur or a missed release, as on the line |
| ⌘-drag (macOS) / Ctrl-drag (Windows, Linux), Shift- or Alt-drag | Pans: same span, clamped, no measurement |
| Two-finger swipe up / down, mouse wheel | Zooms in / out around the cursor; the narrowest window is one week (about five sessions) |
| Buttons 1W … 3Y, All; the overview; double-click | As on the line |
| Chart type switch | Keeps the overlapping date window. A window narrower than a week (possible on the line) opens on candles widened to one week around its centre. Coming back keeps the candle window |

## The synthetic demo

The demo fixture has one synthetic close per session and no genuine open, high or low. Its runs stay on the line.
**Candles · 1D** is disabled there and says why ("…the synthetic demo has one synthetic close per session, no
genuine open, high or low, so it is shown as a line only"). The API refuses with 409.

## API

`GET /api/runs/:id/candles?symbol=S` and `GET /api/previews/:id/candles?symbol=S` are read-only routes.

**Response** (`shared/candles.ts` `CandlesResponse`), columnar, one entry per session in the run's own window:

- `runId`, `symbol`, `dataOrigin: "real"`, `basisDate`, `units`, `source`;
- `firstSession`, `lastSession`;
- `d` (New York dates) and `x` (the candle instant in ms);
- `o`, `h`, `l`, `c` (adjusted prices);
- `print` (1 = the close is the closing print);
- `minutes` and `scheduled` (390 or 210);
- `factor` (the split factor applied);
- `omitted` (`{date, reason}`).

**Errors:**

- 400: the symbol does not belong to the run;
- 404: unknown run or preview;
- 409: synthetic data;
- 405: any method other than GET.

**Validation.** The browser validates every response (`validateCandles`): column lengths, finite numbers, ascending
dates and instants, the OHLC order and the flags. A malformed response is refused with an error, and no chart is
drawn.

**Size and cost.** VGT 2016-01-04 → 2026-10-30 is 2,723 candles, 183 KB of JSON. Slicing and adjusting them takes
about 0.4 ms once the series is loaded. The first load of a symbol (shared with the line) takes about 2–3 s.

**Caching and invalidation.**

- The per-session values are built in the same load as the line's series and cached with it.
- The cache is invalidated by the data file's size and modification time, so appended market data reloads the
  candles and the line together.
- In the browser, each run's candles are kept for the page, so switching chart types does not refetch them.
- Candle mode never requests `/prices` (the minute line).

## Unchanged

- **Untouched code:** no trading rule, strategy version, runner, execution engine, P&L or drawdown calculation,
  optimiser, schema or migration.
- **Untouched records:** saved runs, `events.json`, `trades.json`, `metrics.json`, SQLite rows, phenotypes and
  exports.
- **Proof:** a server test hashes the whole state directory around the candle requests (database and WAL
  byte-identical); an e2e test compares a run's detail and events before and after viewing it on candles.

## Tests

- `apps/strategy-lab/tests/candles.test.ts` (22). Aggregation from a fixture repository:
  - a wick beyond every minute close;
  - pre-market and after-hours bars, DST, an early close, a holiday;
  - missing minutes, a print outside the range, a missing print, a doji;
  - a split basis, a corrupt row, the window;
  - agreement with the line;
  - symbol isolation;
  - the cache and its invalidation;
  - the HTTP routes (400 / 404 / 405 / 409, the state unchanged) and the validator;
  - with real data: VGT's 8:1 split and VGT vs GDX.
- `apps/strategy-lab/tests/candle-chart.test.ts` (15). The pure parts: directions and colours, body and wick
  geometry, widths and the dense mode, the read-out, ticks under sessions only, marker sessions across DST (fan
  order, events unchanged), fan offsets.
- `apps/strategy-lab/e2e/candles.spec.ts` (10), in Chrome on real data:
  - default candles; pixel colours of up and down bodies and wicks; the y range covering highs and lows; the read-out;
  - the switch (window, selection and checkboxes kept; no rerun; no refetch; keyboard arrows);
  - a dense 1-minute run (exact `data-t`, sessions, the busiest session's fan, tooltip, cluster click);
  - an exit click selecting its trade, and the hover link with P&L;
  - close → close measuring, Ctrl-drag pan, swipe zoom around the cursor, buttons, overview, double-click;
  - the Study 8 import: dense multi-year view, one `/candles` request and no `/prices`, units, per-symbol markers,
    every fill inside its own session's range;
  - a comparison;
  - 390 px and the Interactive Preview (chart type and checkboxes kept);
  - nothing saved changes;
  - the synthetic demo.
- Three existing real-data e2e tests of the **minute** line now choose "Line · intraday" first: the crosshair's
  Eastern read-out, the entry times to the minute, and the vg-balanced Eastern measurement.

## Limitations

- Candles are day-resolution. Intraday order is shown only by the fan's left → right order, not to scale. Use **Line ·
  intraday** for the minute path.
- Below 2 px per day, sessions overlap as thin lines (labelled). There are no weekly or monthly candles.
- Bodies narrower than 5 px are solid in both directions, so they rely on colour.
- The chart type is not remembered across page loads (no stored preference).
