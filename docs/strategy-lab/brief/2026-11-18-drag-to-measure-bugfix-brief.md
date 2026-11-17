# Claude Code — Strategy Lab Drag-to-Measure Percentage Regression

## Objective

Fix the **Strategy Lab price-chart drag-to-measure regression**. When I drag across the chart from one date/time to another, I expect to see the **price change in dollars and percent between those two endpoints**. Currently the shaded selection appears, but the measurement is missing, illegible, or replaced/overlaid by a single candle's OHLC hover information.

This is a **focused UI engineering assignment**, independent of the ongoing trading-strategy research. Do **not** change any strategy, allocator, trading engine, optimization methodology, phenotype, market-data file, research result, or financial calculation.

Read `CLAUDE.md` and the relevant Strategy Lab documentation/tests before making changes. Respect any current Git branches, worktrees, and uncommitted edits; do not overwrite other work.

## Reproduction evidence

The user's screenshot shows:

- Strategy Lab displaying **VGT** with **Candles · 1D** selected, over the full historical range (about **2,723 sessions**).
- A vertical shaded measurement region spanning approximately late 2020 through late 2021, proving a drag gesture and interval selection were at least partly recognized.
- Above the chart, the information line begins **“Daily close → daily close”**, but the visible content is a single-day tooltip, e.g. **“2021-12-13 Mon · daily OHLC · O $461.67 H $462.00 L $452.80 C $453.29 … −$8.38 (−1.82%) close vs open”**, instead of the **price change between the two selected dates**. Text also appears to overlap in that line.
- The footer documents **“Drag to measure (daily close → close)”** and separate zoom/pan controls.

Do not assume the root cause is merely tooltip precedence, state loss, responsive layout, or pointer handling. **Reproduce it first and trace the actual cause.**

## Expected behavior and semantics

1. While dragging, update and display a clear, legible two-point measurement: **start date/time and price → end date/time and price**, plus **signed dollar and percentage change**.
2. After release, preserve the measurement until the existing clear gesture is used. Follow the documented chart interaction contract: a click or Escape clears the measurement (unless current verified behavior specifies an equivalent user-visible action).
3. Calculate `delta = laterPrice - earlierPrice` and `percent = (delta / earlierPrice) * 100`. The denominator must always be the **chronologically earlier endpoint**. Dragging right-to-left across the same pair must yield the same chronological return, not invert the sign.
4. For **daily candles**, measure **daily close → daily close** using the underlying session's close values, not the intra-candle **open → close** value shown by the hover tooltip. Clearly label the endpoints and prices. For **intraday line mode**, use the actual chart's documented plotted-price/sample semantics, and state these in the UI/report.
5. Use the same split-adjusted price basis as the displayed chart. Do not mix raw and adjusted prices or use pixel-coordinate differences to compute returns.
6. Keep hover/candle OHLC information available without allowing it to overwrite, cover, or crowd out an active measurement. Provide an unambiguous display hierarchy (a separate measurement row/panel is acceptable if appropriate to the existing design).
7. Positive and negative changes must display a correct sign and readable values; handle zero change and avoid `NaN`/infinity. Match existing formatting and accessibility conventions.
8. The highlighted interval and its endpoint labels must correspond to the measured data points, including at extreme zoom levels and in a densely rendered full-history view. Snap to valid sessions/samples instead of inventing weekend/holiday prices.
9. Preserve unrelated interactions: hover tooltips, event markers, chart series visibility, trackpad/mouse-wheel zoom, preset date ranges, overview/range selection, Shift-drag or Cmd-drag pan, and double-click reset. Avoid interpreting pan gestures as measure gestures.
10. Verify the layout at normal desktop and narrower viewports; prevent the measurement from colliding with chart legends or OHLC text. Do not invent new chart mechanics unless needed to restore the documented behavior.

## Implementation approach

- Locate the chart components, interaction handlers, measurement state, tooltip/hover state, date/price mapping, and display styling.
- Record the reproduction steps and identify the specific regression/root cause, with source file references.
- Make the smallest maintainable fix consistent with the existing component architecture. Avoid unrelated UI redesign or broad refactoring.
- Preserve existing behavior for chart modes and price bases. If historical screenshots or tests disagree with current code, explain what changed and why.
- Do not edit trading logic or introduce new price transformations in the chart as a workaround.

## Required verification

**Automated tests** should cover, at minimum:

- Daily close-to-close percentage and dollar-change calculation on two known closes.
- Right-to-left versus left-to-right gestures across the same points.
- Negative, positive, zero, and very small changes.
- Selection updating during pointer movement and persisting on pointer release.
- Clear behavior; separation from hover/OHLC state.
- Date/price mapping under zoom/pan and full-history density.
- Intraday-line behavior and interactions with event overlays, where supported.
- Pan/zoom gestures not accidentally causing measurement.

**Real browser verification is mandatory.** Launch Strategy Lab using its documented command, use Chrome/browser automation or the project's supported equivalent, and interact with the actual chart. Verify:

1. The VGT daily-candle chart in the **All** range reproduces the original problem before the fix, if the current build still does.
2. Dragging across an interval like the pictured late-2020 → late-2021 selection displays two dates, two close prices, dollar change, and the correctly signed **close-to-close percent change**; the single candle's `−1.82% close vs open` must not masquerade as the measurement.
3. The displayed value updates continuously while dragging and remains legible after release.
4. Reverse-direction dragging gives the same chronological result.
5. Zooming, panning, switching date presets, and toggling between Candles · 1D and intraday line do not regress measurement or normal chart behavior.
6. Verify at least one negative interval, one positive interval, and a narrower viewport.

Compare at least a few measured values independently against the actual plotted source prices. Do not call tests “passed” based solely on inspecting code or taking screenshots.

## Repository and delivery requirements

- Inspect Git status before starting. Use an isolated feature branch/worktree if appropriate; do not disturb another Claude session's changes.
- Add targeted regression tests and keep them in the existing test framework.
- Run relevant targeted tests, applicable TypeScript/lint/build checks, and a reasonably scoped regression suite; disclose pre-existing failures separately.
- Commit the focused fix and tests to a dedicated branch, and push it if permitted by existing repository instructions. **Do not merge automatically into `main`** and do not deploy without authorization.
- Do not modify Strategy Lab research results, cached backtest outputs, market data, live services, or trading parameters as part of this repair.

## Final response

Provide a concise engineering report with:

1. **Root cause** and exact code locations.
2. **Files changed** and what was fixed.
3. **Before/after behavior**, including how measurement and hover information coexist.
4. **Verification evidence:** test commands/counts and concrete browser interaction checks, with endpoint values and independently calculated percentages for representative examples.
5. **Any limitations or pre-existing failures**.
6. **Git branch and commit**; explicitly confirm that trading logic, data, and research results remained unchanged.

**Acceptance criterion:** A user can drag across any supported VGT chart interval and clearly read the signed **price change between the two selected dates/times**, in both dollars and percent, without the result being replaced by single-candle OHLC information. The fix must preserve all existing chart interactions and leave the trading research untouched.
