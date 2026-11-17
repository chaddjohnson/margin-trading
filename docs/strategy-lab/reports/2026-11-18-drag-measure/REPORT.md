# Strategy Lab: drag-to-measure regression — report (Task 18, 2026-11-18)

Brief: [`../../brief/2026-11-18-drag-to-measure-bugfix-brief.md`](../../brief/2026-11-18-drag-to-measure-bugfix-brief.md).
Behaviour documentation: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md) (Crosshair, Overlay layer, Drag to measure),
[`../../DAILY_CANDLES.md`](../../DAILY_CANDLES.md) (Interactions). Machine-readable verification:
[`browser-verification.json`](browser-verification.json). This is a chart presentation fix only. No strategy,
allocator, engine, optimisation, phenotype, market-data file, saved run, research result or financial calculation
changed, and nothing outside `apps/strategy-lab/` and `docs/strategy-lab/` was edited.

## 1. Reproduction (before the fix)

The live UI build (`dist/`, built 2026-11-11, asset `index-BO0n9G6s.js`) was rebuilt from the same commit into a
scratch directory (identical asset hashes) and driven in Chrome 157 with Playwright. It ran on a temporary-state server
(`e2e/serve.ts`, which imports the Study 8 vg-balanced run read-only: VGT, 2,722 sessions, 2016-01-04 → 2026-10-29). The
view was VGT · Candles · 1D · **All**, and the drag ran from late 2020 to late 2021.

| Viewport | What the bar held (correct values) | What was visible |
| --- | --- | --- |
| 1600 × 1000 | `2020-09-30 close → 2021-12-13 close`, `311.45 → 453.29`, `+$141.84`, `+45.54%` | "Daily close → daily close" and the dates. The prices, $ and % (x 799–1029 px) lay under the hover read-out `2021-12-13 Mon · daily OHLC · O $461.67 H $462.00 L $452.80 C $453.29 · −$8.38 (−1.82%) close vs open …` (x 801–1551, 85 % opaque, painted on top) |
| 1100 × 900, 800 × 900 | the same kind of values | Every part, including "Daily close → daily close", lay under the two-line read-out. This is the user's screenshot |

Three more defects showed up while tracing it:

- **Overlays 28 px too high.** The plot's top edge was at y = 419.2, but the shading, both measure lines and the
  crosshair started at 391.2, the top of the measurement bar. They were drawn across the bar's text. The start dot sat
  28.0 px above its close, and trade markers sat 28.0–28.4 px above their recorded prices.
- **Wrong endpoint when the pointer is not over the canvas** (3Y window). Over plain canvas the end was correct
  (2021-01-29). Over an exit marker (session 2021-02-23) the measurement became `2019-11-29 → 2020-07-07`: the end
  had snapped to a session **before the window's start** (2019-12-02). It was the same over the bar. Over the range
  selector the end was 2021-02-19 instead of 2021-04-26.
- **Gone on release.** The measurement disappeared on release (the documented design of Task 6, 2026-11-04).

Raw probe output: `apps/strategy-lab/logs/task18/repro-before-*.json` (git-ignored local logs). The values above are
copied from them.

## 2. Root cause (exact code, pre-fix commit `67b4ae71`)

1. **The overlay layer spanned the measurement bar.** In `apps/strategy-lab/src/chart/PriceChart.tsx`, the measurement
   bar (`className="measure-bar"`, l. 817) was rendered in flow at the top of `.chart-frame`. The marker layer
   (l. 859) was `position: absolute; inset: 0` of that same frame (`src/styles.css` l. 787). Every overlay is placed in
   canvas coordinates: `placeMarkers`, `placeMeasure` and `highlightCallback` use `toDomCoords`/`getArea`, as in
   `top: ${area.y}px`. So every overlay sat higher by the bar's height (24 px + 4 px margin; more when the bar wraps).
   The bar has been in that place since the first drag-to-measure commit (`e4a812b3`, Task 3, 2026-11-04).
2. **The hover read-out was placed over the bar.** `.chart-readout` was `position: absolute; top: 2px; right: 14px`
   on an opaque background (`styles.css` l. 905), which is inside the bar's row. On candles,
   `.chart-frame[data-chart-mode='candles'] .chart-readout { max-width: calc(100% - 90px) }` (l. 2433, Task 16
   `aaaa8d86`) widened it across almost the whole row. Dygraphs updates it on every canvas mouse move, including
   during a measure drag, so the hovered candle's O/H/L/C, with its "close vs open" %, sat on top of the result.
3. **The pointer's x came from the wrong element.** `snap()` (l. 414–422) used `g.eventToDomCoords(e)`, which returns
   `offsetX`, relative to the element under the pointer. The drag's moves come from the `document`, so over a marker
   button (14 px wide), the bar, the range selector or anything off the chart the x was meaningless.
   `findClosestRow` could also return the neighbour row outside the window that Dygraphs keeps for line continuity.
   The wheel handler already avoided `offsetX` for this reason (l. 517).
4. **Lifetime.** The release cleared the measurement (`() => setMeasure(null)`, l. 508), as designed in Task 6.
   The brief now requires it to stay until a click or Escape.

Not the cause: React state was not lost (the bar always held the right numbers), and the arithmetic was right
(`measure.ts` was already chronological, over the earlier price, on the daily closes).

## 3. The fix

| File | Change |
| --- | --- |
| `apps/strategy-lab/src/chart/PriceChart.tsx` | The host, the marker layer and the density note are wrapped in `.chart-plot`, so the layer is exactly the canvas box. The hover read-out is its own row between the bar and the plot. `snap()` maps `clientX − canvas left` with `nearestRow` inside the visible window. The release keeps the measurement (set synchronously); a plain click, Escape, the next drag or an unmount clears it. The bar shows the basis and each endpoint with its price. |
| `apps/strategy-lab/src/chart/measure.ts` | `nearestRow` (a pure, binary-searched nearest row in time among rows inside `[lo, hi]` that have a price). `formatChange`/`formatPercentChange`: unsigned zero, four decimals for a non-zero change below 0.005, `<0.0001` below that, `—` for any non-finite value. `measure()` is unchanged. |
| `apps/strategy-lab/src/styles.css` | `.chart-plot { position: relative }`. `.chart-readout` is an in-flow row: one line of fixed height, ellipsis, muted, hidden but still occupying its space when empty, so hovering never moves the chart. The candle read-out's `max-width` rule is removed. `.candle-density` is placed relative to the plot (`top: 6px`, the same spot as before). `.measure-prices` becomes `.measure-point`. |
| `apps/strategy-lab/tests/measure.test.ts` | 13 new unit tests (17 in the file). |
| `apps/strategy-lab/e2e/measure.spec.ts` | Rewritten: 6 tests (2 on the synthetic demo's line, 3 on real VGT candles, 1 on the real minute line; see §5). |
| `apps/strategy-lab/e2e/{candles,pan,preview,trades,wheel}.spec.ts` | Minimal edits. A release now keeps the measurement and Escape clears it, and the candle range text includes the prices. |
| `apps/strategy-lab/scripts/verify-measure-browser.mjs` | The read-only Chrome verification behind `browser-verification.json`. |
| `docs/strategy-lab/{ARCHITECTURE,DAILY_CANDLES,RESEARCH_WORKFLOW,README}.md` | The new contract (display, lifetime, snapping, line semantics), the brief's index entry. |

No new price transformation was introduced. The chart reads the same split-adjusted rows it plots: column 4 (close)
of the candle rows, or column 1 of the line rows.

## 4. Behaviour after the fix

- **While dragging**, the bar updates live, at most once per animation frame. It reads the basis ("Daily close → daily
  close", "Minute close → minute close" on the line, "Synthetic close → close" on the demo), then
  `start-date [time] $price → end-date [time] $price`, the signed $ change and the signed % change (green up,
  red down).
- **The hover read-out** has its own row under the bar. It keeps showing the hovered candle's (or point's) date and
  O/H/L/C, including during a drag and after the release, and it never covers, replaces or moves the measurement. It
  is muted and right-aligned; the measurement is bold, coloured and on top.
- **After the release** everything stays: the bar, the shading, both lines and both dots. It follows zooms, pans and
  presets. An endpoint outside the window hides its line and dot, and the bar still reads it. A plain click on the
  chart, Escape, the next drag (which replaces it) or a symbol, run or chart-type change clears it. Panning (⌘/Ctrl,
  Shift or Alt + drag) never starts one and keeps an existing one.
- **Endpoints** are always plotted rows inside the visible window, with no interpolated or weekend price. On the
  line they are the plotted minute closes (x = the minute's start) or closing prints; long windows plot a decimated
  min/max subset, so zoom in for exact minutes. At full-history density one pixel spans roughly 2.5 sessions
  (1600 px viewport), so the session picked is the one nearest the pointer's pixel; zoom in to choose an exact day.
- **Arithmetic**: `change = later − earlier`, `percent = change / earlier × 100`, identical in either drag direction.

## 5. Verification

### 5.1 Real browser (Chrome 157, the final `dist/` build, temporary-state server)

`node apps/strategy-lab/scripts/verify-measure-browser.mjs <out.json>` drags, hovers, zooms and clicks the real chart of
the Study 8 import (R-000014 in a temporary state: VGT, 2,722 sessions). For every measurement it recomputes `$` and `%`
from the plotted source: the run's `/candles` closes, or on the line the `/prices` points the page actually loaded. It
checks that the bar shows exactly those values, that no part of the measurement intersects the hover read-out or the
density note, that the overlay layer is the canvas box, and that the dots sit on the measured closes. Result: 14
scenarios, `ok: true`, no failure and no console error ([`browser-verification.json`](browser-verification.json)).

| Scenario (viewport 1600 × 1000 unless noted) | Shown by the chart | Recomputed independently | Covered parts / dot error |
| --- | --- | --- | --- |
| All (dense, 2,722 sessions), late 2020 → late 2021, released | `2020-09-30 close $311.45 → 2021-12-13 close $453.29`, **+$141.84**, **+45.54%** | +$141.84, +45.54 % (453.29 − 311.45 = 141.84; 141.84 / 311.45 = 45.5418 %) | none / 0.015 px |
| … while dragging (two intermediate positions) | `→ 2021-02-26 close $356.50 +$45.05 +14.46%`, then `→ 2021-08-02 close $411.19 +$99.74 +32.02%` | updated live; the held reading equals the released one | none |
| … hover read-out while held (its own row) | `2021-12-13 Mon · daily OHLC · O $461.67 H $462.00 L $452.80 C $453.29 · −$8.38 (−1.82%) close vs open · …` | the single candle's −1.82 % is in the read-out row only, never in the bar | none |
| All, the same two points dragged right → left | identical to the forward reading | same chronological result, sign not inverted | none / 0.015 px |
| 3Y, released with the pointer over a trade marker | `2020-07-07 close $282.72 → 2021-02-25 close $353.97`, +$71.25, +25.20% | +$71.25, +25.20 %; the end session is 0.25 px from the pointer | none / 0.016 px |
| 3Y, a fall | `2021-12-27 close $466.10 → 2022-10-14 close $300.84`, **−$165.26**, **−35.46%** (red) | −$165.26, −35.4559 % | none / 0.014 px |
| … wheel zoom out; Ctrl-drag pan; 1Y preset | the same reading each time (the 1Y window hides the 2022-10-14 end; the bar still reads it) | unchanged | none / ≤ 0.011 px |
| 1Y (candle bodies), a fresh drag | `2021-04-13 close $384.79 → 2021-12-07 close $455.61`, +$70.82, +18.40% | +$70.82, +18.40 % | none / 0.004 px |
| 820 × 900, All, late 2020 → late 2021 | `2020-09-29 close $309.15 → 2021-12-09 close $452.70`, +$143.55, +46.43% | +$143.55, +46.43 % | none / 0.015 px |
| Line · intraday, 1M | "Minute close → minute close", `2021-05-24 09:32 EDT $369.50 → 2021-06-09 15:59 EDT $376.61`, +$7.11, +1.92% | +$7.11, +1.92 %; both endpoints are points the line loaded | none |
| Clearing | a plain click, Escape, double-click (which also resets the zoom to All) and a chart-type switch each clear it | — | — |

**Raw-data cross-check** (independent of the app's code). A short Python script read `data/VGT/data.csv`, the
canonical minute bars, unchanged at sha256 `2ee06310…`. For each measured session it took the closing print at the
scheduled close, and for the line the minute's close. All 9 measured endpoint pairs **match** the chart exactly. Every
candle close is the official 16:00 ET closing print with split factor 1, so the "split-adjusted" basis is the raw price
for these sessions. Every shown % equals the raw-data % rounded to two decimals, e.g. 2020-09-30 311.45 → 2021-12-13
453.29 = +45.5418 % and 2021-12-27 466.10 → 2022-10-14 300.84 = −35.4559 %.

The full-history drag lands on 2020-09-30 although the pointer was at the 2020-10-01 candle's x. At that density
(2,722 sessions across a plot about 1,090 px wide, roughly 2.5 sessions per pixel) that is the session nearest the pointer's pixel, and the
bar names it exactly.

### 5.2 Automated tests

Final `npm --prefix apps/strategy-lab run check` (check-2, 2026-11-17T23:47:45Z → 23:54:28Z UTC, exit 0):

| Step | Result | Baseline (Task 17) |
| --- | --- | --- |
| `typecheck` (app, node, e2e tsconfigs) | clean | clean |
| `lint` (app ESLint, incl. the new script) | clean | clean |
| Vitest | **327 / 327** (34 files) | 314 / 314: +13 in `tests/measure.test.ts` |
| `vite build` | `index-yT7eze-g.js`, `index-JqdA3OGs.css` (the build the browser verification ran on) | — |
| Playwright (Chrome) | **84 / 84** | 81 / 81: `measure.spec.ts` went from 3 to 6 tests |

New and changed tests, against the brief's minimum list:

| Brief item | Where |
| --- | --- |
| Daily close → close $ and % on two known closes | `measure.test.ts`: VGT 311.45 → 453.29 = +$141.84 / +45.54 %; e2e: every candle endpoint equals the `/candles` close |
| Right-to-left equals left-to-right | unit (`measure(b, a)` deep-equals `measure(a, b)`, the earlier close stays the denominator); e2e on the demo and on VGT All |
| Negative, positive, zero, very small | unit (−$167.33 / −35.81 %, `$0.00` / `0.00%` unsigned, `+$0.0040`, `−0.0022%`, `<0.0001`, `—` for 0 / NaN / ±Infinity); e2e: the 2022 fall reads `−…` and red |
| Updates while moving, persists on release | e2e: the end changes mid-drag; the reading and the whole overlay are unchanged after the release, after a release off the chart, after focus loss and after a missed release |
| Clear; separation from hover/OHLC | e2e: a plain click, Escape (also mid-drag), the next drag, a symbol switch and a chart-type switch; the hover read-out changes while the bar does not; no part of the bar intersects the read-out or the density note |
| Date/price mapping under zoom/pan and full-history density | unit `nearestRow`: 2,722 weekday sessions, windows All, 2Y, 1W and panned before/after, the off-window neighbour excluded, Saturday → Friday or Monday; e2e: the dots within 1.5 px of the measured closes, the lines spanning exactly the plot, markers at their prices |
| Intraday line, event overlays | e2e: "Minute close → minute close", Eastern minute times, endpoints inside the window; the pointer over a trade marker, the bar and the range selector, and past either edge of the plot |
| Pan/zoom never measure | e2e: Shift-drag, Ctrl-drag and ⌘-drag (emulated macOS) start none and keep an existing one; wheel zoom keeps it |

**Negative controls.** Each part of the fix was reverted on its own, built to a scratch directory and run against the
new `measure.spec.ts`; the sources were restored and hash-verified afterwards.

| Control | Failed |
| --- | --- |
| A: the old `snap()` | 1 test (over a marker) |
| B: the old read-out CSS | 2 tests ("measure-end under the read-out") |
| C: the layer spanning the frame | 4 tests (layer y, density note, a marker 28.04 px off its price) |
| D: clearing on release | 6 tests |
| The unfixed build | 6 / 6 tests |

**Updated existing tests.** `candles.spec.ts`, `pan.spec.ts` (two places), `preview.spec.ts`, `trades.spec.ts` and
`wheel.spec.ts` asserted the old clear-on-release behaviour. They now assert that the measurement is kept after the
release, then press Escape and assert it is cleared. The candle range regex now includes the prices.

**Root suites.** Root `tsc` covers `src/**/*.ts` only, and root ESLint ignores `apps/**`. No file under `src/`,
`research/`, `data/` or `config/` changed (`git diff --stat`), so the root suites could not observe this change and
were not run. The root `npm test` has 7 known pre-existing failures recorded by earlier tasks; they were not re-run here and are unrelated.

## 6. Limitations and disclosures

- **Behaviour change requested by the brief: the measurement now persists.** On 2026-11-04 (Task 6, commit
  `29113795`) the measurement was made, at the user's request, to exist only while the button is held. This brief
  (§ Expected behaviour 2, verification 3, tests) asks for it to stay after the release until a click or Escape, so
  that design is reversed. If the earlier behaviour is wanted again, it is the release handler in `PriceChart.tsx`
  (`setMeasure(moved ? measureRef.current : null, true)` → `setMeasure(null)`, as in negative control D) plus the
  tests.
- **Markers moved down 28 px on every price chart.** This includes the Portfolios tab, which uses the same component.
  It is the alignment fix: markers, the crosshair and the trade connector now sit at their prices. Before, they sat
  above them by the measurement bar's height.
- **Pixel resolution.** At full-history density one pixel spans two to three sessions. The endpoint is the session
  nearest the pointer's pixel and the bar names it exactly. Zoom in to choose an exact day.
- **The hover read-out is one line.** At narrow widths a long candle read-out ends in an ellipsis: at 820 px only the
  tail (minutes traded, notes) is cut. Its `data-*` attributes keep every value.
- **The read-out and the measured end can differ by about one pixel's worth of sessions** at dense zoom. Dygraphs
  highlights the candle under its own `offsetX`, while the measurement uses `clientX`. Seen at 1100 px: read-out
  2021-12-14, measured 2021-12-07. The measured endpoint is the one drawn and labelled.
- **Narrow widths.** The measurement bar can wrap to two lines, about 5 px taller than the one-line hint. Chrome's
  scroll anchoring kept the plot within 1 px.
- **Escape is a window-level key.** It also clears the measurement when it is pressed for something else, such as
  closing a dialog.
- **Not verified:** Safari and Firefox, a physical trackpad or mouse (automated Chrome input only), and touch, which
  keeps the Dygraphs defaults and has no touch measure.
- **One screenshot.** During reproduction, one screenshot of the unfixed chart was taken in the session's scratch
  directory to confirm the user's symptom visually. It is not part of the repository or this report, and all
  verification above is DOM- and data-based (standing no-visuals preference).
- **Unchanged:** trading logic, engine, strategies, allocator, phenotypes, market data (VGT `2ee06310…`), saved runs and
  research results. The live state `state/strategy-lab/` was byte-identical before and after: 2,665 files, `*-shm`
  excluded. The tracked `research/` tree's content hash is unchanged (`75dd165b…`). Every server used a temporary
  state. `dist/` was rebuilt by the final check from this branch's code, as `npm start` would do anyway (it rebuilds
  when the sources are newer). No Strategy Lab service was running or restarted, and nothing was deployed.

## 7. Delivery

Branch `fix/strategy-lab-drag-measure`, created from `67b4ae71` (`research/vg-l0-full-joint`, whose
`apps/strategy-lab/` equals `feature/strategy-lab-pooled-candidates`). It was pushed to `origin` without force and
not merged into `main`. The commit and the push verification are recorded in `apps/strategy-lab/WORK_RECOVERY.md`.
