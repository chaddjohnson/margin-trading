# Strategy Entry Explorer

A local, browser-based research UI. It charts one price series with the **entry events** of strategy variations, shows
two variations at a time, keeps your zoomed window while you switch between them, and lets you inspect, compare and
tabulate individual entries.

> **Demo / synthetic data.** The only dataset is a generated, fictional price series ("VGT" is an illustrative label)
> with events from twelve toy rules. Nothing here is a real price, a real strategy, a verified trade or a research
> result. See [the data contract](../../docs/research/growth-entry-discovery/ENTRY_EXPLORER.md) and
> [the research direction](../../docs/research/growth-entry-discovery/PLAN.md).

## Run it

From the repository root (Node ≥ 24.21, as in `.node-version`):

```sh
npm --prefix apps/strategy-entry-explorer start
```

The first run installs the app's own dependencies (`npm ci` into `apps/strategy-entry-explorer/node_modules`; nothing
outside this directory changes). It then starts Vite on <http://127.0.0.1:5173> (loopback only) and opens the browser.
Without opening a browser: `npm --prefix apps/strategy-entry-explorer run dev`.

## Scripts (run inside `apps/strategy-entry-explorer`, or with `npm --prefix apps/strategy-entry-explorer run …`)

| Script | What it does |
| --- | --- |
| `start` | Install the dependencies if needed, then start the dev server and open the browser |
| `dev` | Start the dev server only |
| `typecheck` / `lint` | `tsc --noEmit` / ESLint (typescript-eslint + react-hooks) |
| `test` | Vitest unit tests (`tests/`): schema validation, fixture reproducibility, alignment, state/filter logic, clustering, statistics, the documented JSON example |
| `test:e2e` | Playwright acceptance walkthrough (`e2e/`) in the system **Google Chrome** (`channel: 'chrome'`, no browser download), on its own dev server at port 5199 |
| `build` / `preview` | Typecheck and production build into `dist/` (git-ignored) / serve the build |
| `check` | typecheck + lint + test + build + test:e2e |
| `generate:fixture` | Regenerate `public/data/demo-dataset.v1.json`; `-- --check` fails if the checked-in file differs |

If Chrome is not installed, `npx playwright install chromium` and remove `channel: 'chrome'` from
`playwright.config.ts`.

## Using it

- **Variations (left).** Click to show as **A**; **Compare** overlays one as **B**; **Remove** drops B. Search filters
  the list. Arrow keys move between variations.
- **Chart.** Drag to zoom; shift-drag to pan; drag the overview handles; double-click resets. Presets 1M–5Y are centred
  on the current view; *All* and the From/To form are below the chart.
- **Markers.**
  - A = triangle, B = diamond;
  - hollow = raw signal, filled = executed (illustrative) entry;
  - one marker per bar, stacking every event on that bar.
- **Hover or Tab** to a marker for its events. **Click or Enter** pins it in *Selected event*; clicking again steps
  through stacked or overlapping events.
- **Raw signals / Executed / Both** filters markers, legend, analysis and table together.
- **Entries table.** Sort by clicking a header. Click a row (or press Enter) to select the event; if it is outside the
  window, the chart pans to it with the same span.
- **Entry analysis.** Demo forward statistics: horizon 63 sessions, censoring, MFE/MAE, a baseline. They describe the
  synthetic series only.

## How it fits the repository

- Self-contained: its own `package.json`, `package-lock.json`, TypeScript, ESLint and Prettier config. The root
  `eslint.config.js` ignores `apps/**`; the root `tsconfig.json` and `npm test` only cover `src/`. The app imports
  nothing from `src/` and does not touch backtests, strategies, research records or `data/`.
- Code layout, the Dygraphs lifecycle, the alignment and overlap policies, and the adapter interface for real data are
  described in [ENTRY_EXPLORER.md](../../docs/research/growth-entry-discovery/ENTRY_EXPLORER.md) (§5).
- `WORK_RECOVERY.md` is the build task's recovery checkpoint (repository convention).

## Differences from the design mockup

The mockup (`docs/research/growth-entry-discovery/reference/strategy-entry-explorer-mockup.png`) was a reference, not
a pixel mandate:

- **Tabs and buttons.** *Backtest (with Exit)* is shown disabled and marked "planned"; *Settings* and *+ New* are
  omitted, because they would not do anything yet.
- **Selecting variations.** Per-row checkboxes became click-to-select (A) plus an explicit **Compare** button (B), so a
  click can never silently replace the primary selection. Overlay controls live in the legend (Hide/Show, Swap A/B,
  Remove B) instead of an *Overlay…* button.
- **Type filter.** The two checkboxes (*show signals* / *show executed only*) became a three-way control: raw signals,
  executed, both.
- **Signal versus executed.** In the mockup, hollow markers meant "signal not executed". Here hollow is every **raw
  signal**, including those later executed, and filled is the **executed entry** on its own fill bar, one session after
  its signal. This follows the brief's distinction between raw opportunities and executable entries.
- **Statistics.** The analysis numbers are computed from the synthetic data, with a documented horizon and censoring,
  and sit next to an every-session baseline; they are not the mockup's sample figures. Rows were added for
  non-overlapping counts and the MAE 10th percentile.
- **Additions.** A pinned *Selected event* panel, a status bar (provenance, alignment, execution model), a persistent
  demo disclosure banner, and an explicit policy for markers on the same bar or overlapping on screen.
- **Smaller changes.** A 10Y preset is omitted (*All* covers about 11 years). Markers sit just below the price line.
  The layout collapses to one column on narrow screens.

## Known limitations

- **Demo data only.** No adapter for real price files or research outputs exists yet (PLAN Stage 2).
- **Daily bars only.** Minute bars, exchange-zone axis ticks for intraday data, and range-aware downsampling are
  designed for but not built (ENTRY_EXPLORER §6).
- **Two variations at a time.** That is by design for this version.
- **Dense overview.** At the full 11-year zoom, neighbouring markers overlap. The tooltip lists all of them; zoom in to
  separate them.
