# Claude Code task — Strategy Lab: daily OHLC candlestick chart

## Goal

Extend **Strategy Lab**'s existing price chart to display **standard daily OHLC candlesticks**. Each NYSE trading session must have one candle with a **green body when close > open**, **red body when close < open**, and a clearly distinguishable neutral/doji style when open = close. Each candle needs an upper/lower wick showing the **actual daily high and low**. This is a **charting/UI and price-data feature only**: do not change trading logic, run results, order fills, strategies, optimisation, or existing saved artifacts.

Add a compact chart-type selector with:

- **Candles · 1D** — the new daily OHLC candlestick view, selected **by default** for real market-data charts.
- **Line · intraday** — retain the existing interactive price-line chart and minute-level detail, with its existing behaviour and resolution fetching.

The user must be able to switch views without rerunning a strategy or losing the currently selected run/symbol. If a saved chart-view preference is already implemented, respect it; otherwise, do not add a DB migration just to remember the chart type. Synthetic demo data with no genuine OHLC must not be presented as authentic OHLC: keep its existing line display or show the candlestick option as unavailable with a clear explanation.

## Inspect before editing

Read root `CLAUDE.md` and the current repository instructions. Inspect the actual existing chart implementation and current feature branch before changing anything. The architecture documentation describes **React + Dygraphs**, server price loading from canonical `data/<SYMBOL>/data.csv` via `apps/strategy-lab/server/prices.ts`, split adjustment to each run's price basis, event marker overlays using `toDomCoords`, per-symbol filtering, zoomed price fetching, the overview range selector, drag-to-measure, trackpad/mouse zoom, and entry/exit event selection. These are indications to verify against the **current code**, not assumptions about unchanged file paths.

Prefer extending the existing Dygraphs chart using a maintainable custom OHLC plotter/overlay if that produces correct candles and preserved interactions. Do **not** replace the charting library or rewrite its interaction model unless a technical limitation is demonstrated and documented. Reuse the server's canonical price/data-loading pipeline rather than creating an inconsistent second data source.

## 1. Correct daily OHLC data

Derive one daily candle for each available **regular NYSE trading session** in the run's selected date window from the canonical minute **OHLC** market data, *not* from minute closes alone:

- **Open:** first valid regular-session minute's **open**.
- **High:** maximum valid regular-session minute **high**.
- **Low:** minimum valid regular-session minute **low**.
- **Close:** final valid regular-session **close** under the repository's established official-closing-print/session-close convention (prefer the official closing print if the canonical series provides it and that is the application's established interpretation).
- If a closing print is part of the canonical price basis, handle it consistently and document whether it affects the daily high/low as well as close; never mix raw and adjusted prices.
- Filter out premarket/after-hours data unless the existing app explicitly considers them part of its canonical regular-session series; respect early closes, holidays, missing minute bars, and session boundaries in **America/New_York**, including DST.
- Forward split-adjust **all four prices with the same correct factor** to the exact basis used by the displayed run/events. Support VGT's documented split and multi-symbol runs. Assert `low <= min(open, close) <= max(open, close) <= high` within numerical tolerances; if data cannot be trusted, surface an error or incomplete-data indication rather than silently inventing prices.
- Never make a candle from the minimum/maximum of *minute closes* when actual minute highs/lows are available. Avoid manufacturing daily OHLC from just one synthetic line value.

Add a suitable dedicated **read-only daily OHLC endpoint** or documented extension to the existing price API. Use typed, validated responses and efficient server-side aggregation/caching (with proper market-data invalidation). Do not fetch the entire raw minute CSV into the browser just to draw a multi-year daily view. Limit the response to the selected symbol and run's allowed window; no accidental additional dates or cross-symbol events. Ensure a browser run and an imported Study 8 run can display prices in their own recorded split-adjusted units.

## 2. Candlestick drawing

- One actual candle per session, date-aligned to its NYSE trading day, with **green bullish body**, **red bearish body**, and **clearly visible high/low wicks**. The candle body spans open-to-close; wick spans low-to-high. A doji must remain identifiable. Use colours with adequate contrast against Strategy Lab's dark background and provide a non-colour cue if practical.
- At typical zoom (weeks to months), show distinguishable bodies and wicks with sensible widths and spacing; on a full-history chart, remain responsive and avoid misrepresenting a multi-day aggregate as a single-day candle. Never replace a daily candle with a bucketed min/max line and still call it a candle.
- Axis price labels and autoscaling must consider **daily highs/lows**, not just closes. Show sensible date ticks across weekends, holidays and zoom windows. Preserve stable rendering during resizing, open/close of Interactive Preview, zoom/pan, and chart type switches.
- Hover/crosshair over a candle should display its **Eastern session date and O / H / L / C values**, ideally with $ and daily change (% close versus open) and correct sign. Never present a candle as a minute timestamp.
- Label this view as **daily OHLC**. Do not present it as having minute-price path precision: minute path remains available via **Line · intraday**.

## 3. Preserve entry/exit/rejected markers and exact event detail

This is a particularly important requirement. Entry and exit events frequently occur **intraday** and at prices other than the day's close. Candles summarise the whole day; event timestamps must remain **exact in their stored data and tooltips**.

- Show the same marker types, toggles and colour rules currently used by Strategy Lab (executed entry/exit coloured by that trade's positive/negative net P&L, rejected signals purple, and other existing signal styling). Retain the association between entry and exit markers, trade selection on clicking *either* marker, tooltip net P&L, linked-event highlighting, and the trade list below.
- In **Candles · 1D**, associate a marker with its proper NYSE session's candle, position its vertical coordinate at its **actual recorded event/fill price** when known, and present its **actual time in America/New_York (EST/EDT)** on hover/click. If multiple events occur during one session, give them a discoverable clustered/stacked representation without hiding any, inventing separate daily candles, or falsifying their times. For events with no price, maintain the existing explicit “price not recorded” semantics instead of inventing an execution price.
- Because candles are day-resolution, choose and document a deterministic **date-to-chart marker positioning policy**. Do **not** suggest the candle's single horizontal date coordinate is the exact intraday x-position. A marker can be aligned/clustered with its session, with its full precise timestamp shown in the tooltip. Make the chart's interaction model and event table unambiguous.
- When switching to **Line · intraday**, restore the exact timestamp/price alignment to minute-level points as before.
- When comparing A/B runs, continue showing only the selected symbol's valid events, with existing comparison distinctions, and handle both runs' price bases properly. Never show GDX markers in a VGT tab.

## 4. Keep existing chart interactions usable

Do not regress any of these:

- **Click-and-drag measures** the earlier-to-later price change; it must not zoom or pan. In candle mode, explicitly define the sampled price as **daily CLOSE to daily CLOSE**, and label the measurement as such. In minute-line mode, preserve the existing minute-based behaviour.
- **Cmd-drag (macOS) / Ctrl-drag (Windows) pans**, without measurement highlighting. Preserve any existing Shift-drag fallback.
- Two-finger **swipe up zooms in**, down zooms out, centred on the mouse cursor; preserve mouse-wheel zoom, buttons, overview navigator, and double-click reset. Zoom and pan should remain coherent when changing chart types; if exact viewport preservation is impossible, preserve the overlapping date window or use a clearly documented deterministic fallback.
- Crosshair / hover / tooltip readouts remain accurate to the active chart mode. Entry/exit hover-linked highlights work without getting stuck after the pointer moves.
- The marker visibility checkboxes **must not reset** when chart type, run parameters in Interactive Preview, symbol or cached preview results change, except where existing product behaviour explicitly mandates it. Trade rows, analysis and research exports remain unchanged.
- The candlestick chart must fit existing page/card layout, including the optional Interactive Preview side panel, and work on narrower viewport sizes.

## 5. Tests and performance

Add unit, integration and browser regression tests, at minimum:

1. Deterministic daily OHLC aggregation from known minute **O/H/L/C**, including a wick that extends beyond every minute close; regular-session/early-close handling, holiday/DST, missing bars and closing-print conventions.
2. Correct green/red/doji rendering and daily high/low autoscaling. The daily candle for a symbol changes correctly with split-adjustment basis, with no symbol contamination.
3. Intraday event markers correctly attach to the appropriate session **without changing their underlying exact UTC/ET timestamps or prices**; event clusters remain clickable; exit click still selects the related trade; linked hover and net P&L display work.
4. Chart-type toggle, persistent marker checkbox states, zoom direction/centering, keyboard use, Cmd/Ctrl-drag panning, drag measurement semantics and overview navigator.
5. A multi-year real-data chart remains responsive and avoids issuing raw minute data transfers unnecessarily; candlestick endpoint is cached/invalidation-safe. Historical imported results and normal manual runs both render.
6. Confirm no modifications to `events.json`, `trades.json`, `metrics.json`, SQLite saved-run history, historical phenotypes, entry/exit strategy logic, execution engine, or existing profit/drawdown calculations.

Run the appropriate Strategy Lab typecheck, lint, Vitest, Playwright and build checks. Report actual tests and existing unrelated failures; do not claim unsupported browser coverage. Test one real run with dense intraday markers and one imported `s8-vg-balanced` run if the required files are available. Include a concise user-facing description and optionally a screenshot of the new chart in both a short and long date window.

## 6. Completion and Git

- Keep this a **focused UI/data-presentation feature**; no new optimiser, trading rules, schema migrations or strategy versions unless a genuine necessity is demonstrated.
- Read the actual Git status first. Use the existing appropriate feature branch, or create a fresh feature branch if necessary. Do not discard unrelated edits or data. **Commit and push**, but **do not merge into `main`**.
- Update the relevant Strategy Lab chart/architecture/user documentation and describe exactly where the daily candles come from, how markers align with sessions, how volume/missing data are handled if relevant, and how to switch back to the intraday line.

**Acceptance:** Opening a real VGT run in Strategy Lab shows **green/red daily OHLC candlesticks with wicks** by default. The user can switch to the existing intraday line chart immediately. Entry/exit events remain accurate, clickable and linked to trades; all existing chart gestures still work. Neither strategies nor previously saved results are changed.
