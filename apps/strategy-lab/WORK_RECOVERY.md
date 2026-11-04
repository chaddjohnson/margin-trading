# Work recovery checkpoint — Strategy Lab (real-data workbench on the UI feature branch)

## Top screen (read this first) — Task 5: growth-trading strategy + wheel direction — COMPLETE

- **Updated:** 2026-11-04T16:50Z (UTC, from the clock). **Status: COMPLETE, committed and pushed.** **No merge to
  `main`.** Commit + push were authorised by the brief (§0C.13, §7).
- **Push:** `git push origin feature/strategy-entry-explorer-ui` (fast-forward `711bbab..b5ac849`, no force).
  `git ls-remote` at 2026-11-04T16:50:10Z: `origin/feature/strategy-entry-explorer-ui` = `b5ac849af763…` (= local),
  `origin/main` = `aa5754d…` (unchanged). This record follows as a separate commit, pushed the same way.
- **Brief:** `docs/strategy-lab/brief/2026-11-04-growth-trading-strategy-brief.md` (verbatim, sha256
  `a8d96d8d5aab0950…8612edc66`). It superseded the cancelled brief (upload `223fd6da-…Growth_Entry_Exit_Strategy.md`,
  sha256 `a897556b…63dcbee`: material-loss restriction / lower re-entry / recovery reset — NOT implemented).
- **Recovery (§0A):** the approved baseline is `711bbab` (= origin at the start). The interrupted session wrote nothing
  (clean tree, no untracked files, no new commits, no stash): nothing was removed or reverted. Backup outside Git:
  `~/backups/strategy-lab/20261104T160405Z-pre-growth-trading/` (MANIFEST.md, consistent SQLite copy via node:sqlite
  `backup()`, runs/ + imports/ copies, `runs-fingerprint.json`).
- **Commits** on `feature/strategy-entry-explorer-ui`: `028aed5` wheel direction; `38a7aa4` the strategy
  (`src/growth-trading/`) + Strategy Lab integration; `42cf4d1` docs + brief; `b5ac849` this checkpoint; next: the push record.
- **Live data preserved:** `state/strategy-lab/` untouched — `runs-fingerprint.json` (16 runs, 16 variations, 2
  bookmarks, 0 notes, 1 migration) and every runs/imports file identical to the backup at 16:45Z; no migration added;
  old runs read and verified with the new code (16/16, on a copy). The service was not installed and is not running.
- **Running processes:** none (the temporary :5317 UI server was stopped).
- **Follow-up gate:** the user's review of the trading backtest in the UI; optional: restart any running Strategy Lab
  server so it serves the new build (`npm --prefix apps/strategy-lab start` rebuilds when stale).

## Tasks 1–4 (earlier on 2026-11-04) — COMPLETE

- **Updated:** 2026-11-04T12:31Z (UTC, from the clock). **Status: COMPLETE, committed and pushed.** **No merge to `main`.**
- **Push:** `git push origin feature/strategy-entry-explorer-ui` (fast-forward `e95deac..44c63b6`, no force).
  `git ls-remote` at 2026-11-04T12:31:41Z: `origin/feature/strategy-entry-explorer-ui` = `44c63b6b8b02caea…` (= local),
  `origin/main` = `aa5754d…` (unchanged). This record follows as a separate commit, pushed the same way.
- **Correction:** the previous version of this checkpoint (`44c63b6`) said "Updated 12:33Z". That was an estimate, not
  read from the clock; the commit was made before 12:31:41Z.
- **Task brief:** `docs/strategy-lab/brief/2026-11-04-strategy-lab-implementation-brief.md` (verbatim, sha256
  `366efeea59d19fe5…22d9a33d1`). The user's message authorised the whole assignment "including … the requested Git
  commit and push".
- **Branch:** `feature/strategy-entry-explorer-ui`, continued per brief §0.2. HEAD at start `e95deac` (= origin); the
  working tree was clean at start.
- **Commits:**
  - `957aaf3`: the strategy, `src/entry-signals/`;
  - `8cfc6ee`: the Strategy Lab app, root `.gitignore` and README;
  - `41ba3c3`: the docs;
  - `44c63b6`: this checkpoint;
  - next: the push record.
- **Running processes:** none of mine; the smoke, check and VPN-test servers were all stopped. The USER's own old dev
  server (`vite --open`, pids 2687429/2687450, 127.0.0.1:5173) was started from the old path
  `apps/strategy-entry-explorer`. It was left running and no longer serves the renamed app (report this).
- **Follow-up gate:** the user's review of Strategy Lab, and whether to enable the systemd service. It was not enabled
  (`npm --prefix apps/strategy-lab run service:install -- --enable`).

## Deliverables

- **App:** `apps/strategy-lab/`, renamed from `apps/strategy-entry-explorer` with `git mv`.
  - Server: node:http, node:sqlite, migration 0001 with immutability triggers, jobs, prices, security, importer.
  - Runner process.
  - React + Dygraphs client.
  - Tests: Vitest and Playwright.
  - systemd template.
- **Strategy:** `src/entry-signals/`, signal-only. No existing file changed.
- **Docs:** `docs/strategy-lab/`. PLAN.md and ENTRY_EXPLORER.md were updated. The root README has a Strategy Lab
  section. The root `.gitignore` adds `/state/`.
- **Local state (git-ignored)** in `state/strategy-lab/strategy-lab.sqlite`:
  - demo R-000001–R-000012 (synthetic);
  - **R-000013**: the vg-balanced import (48 entries, 47 exits, 14 rejected; VGT 6/6/7, GDX 42/41/7);
  - **R-000014**: a real manual run, VGT+GDX 2016-01-04→2023-12-29, X 5%, N 20, 1d → 240 signals (VGT 116, GDX 124).
- **Study 8 replay (git-ignored):** `state/strategy-lab/imports/study8/20261104T120323Z-s8-vg-balanced/`, produced by
  `npm run study8-run -- run s8-vg-balanced --end 2026-10-29 --out <dir> --quiet` (6.7 s). RECONCILIATION PASS:
  totals and 48/48 lots, 0 mismatches. The importer's independent checks against the sealed `test-lots.jsonl.gz`
  holder and against signals.csv passed.

## Verification (2026-11-04)

- **App** `npm run check` (12:28Z): typecheck clean; ESLint clean; Vitest **49/49**; build OK; Playwright **9/9**.
- **Negative control:** with the symbol filters disabled, the per-symbol e2e test failed (GDX leaked onto VGT). With
  them restored, it passes.
- **Root** `npm test` (12:28:00Z → 12:29:58Z): 960 tests, 949 pass, **7 fail (the same pre-existing 7 as the morning
  baseline)**, 4 skipped. Root `tsc` is clean; root `eslint` is unchanged at 306 problems (1 pre-existing error).
- **VPN:** a temporary instance listened on 127.0.0.1:4317 and 100.68.60.114:4317 only.
  - 127.0.0.1, 100.68.60.114 and `apollo.tail0a98ce.ts.net`: health 200; API 401 without the token, 200 with it.
  - The LAN address 192.168.18.14 refused connections.
  - Not tested: a second tailnet device (apollo-windows was offline).

## Guards

- Do not modify any existing strategy, config, phenotype, pool, research record or `data/`.
- No optimisation or sweep in the UI or API. No merge to `main`. No force-push. Do not kill the user's processes.
- Do not commit `state/` or `logs/`.

## Follow-up 2026-11-04T12:54Z: http://apollo:4317 (user report: only http://127.0.0.1:4317 reachable)

- **Cause:**
  - `/etc/hosts` maps `apollo` to 127.0.1.1, and the default server listened on 127.0.0.1 only;
  - tailnet access additionally needed `STRATEGY_LAB_HOSTS=127.0.0.1,tailscale`.
- **Fix:**
  - `server/config.ts` `hostnameLoopbacks()`: when 127.0.0.1 is bound, the server also binds the hostname's /etc/hosts
    loopback aliases (127.0.1.1);
  - a new script `start:vpn` (= start with the Tailscale address);
  - docs updated (OPERATIONS, README, RESEARCH_WORKFLOW, app README).
- **Verified with temporary state on port 4317:**
  - default `start`: 127.0.0.1 and `apollo` serve the UI and API;
  - `start:vpn`: 127.0.0.1, `apollo`, 100.68.60.114 and `apollo.tail0a98ce.ts.net` → health 200, API 401 without the
    token and 200 with it; the LAN address is refused;
  - `npm run check`: Vitest 50/50, Playwright 9/9.
- The user's own server was stopped by the user; no process of mine is running.

## Task 3 — COMPLETE (2026-11-04T13:15Z): drag-to-measure on the price chart

- **Brief (user message):**
  - click-drag on the chart selects two points snapped to plotted data (it must NOT zoom or pan);
  - vertical lines, endpoint dots and translucent shading between them;
  - above the chart: start/end ET times, $ change and % change (green or red);
  - live while dragging; either direction (computed chronologically); stays after mouseup; a click elsewhere or
    Escape clears it; it clears on symbol or run change;
  - zoom stays available via the buttons and the overview; markers, tooltips and controls are preserved;
  - add tests; commit and push to `feature/strategy-entry-explorer-ui`; no merge to main.
- **Plan:**
  - `src/chart/measure.ts` (pure calculation and snapping helpers);
  - a custom Dygraphs `interactionModel` in `PriceChart.tsx`: drag = measure, shift-drag = pan, dblclick = reset;
  - an overlay with lines, dots and shading in the marker layer;
  - a measurement bar inside `PriceChart`;
  - Vitest for `measure.ts`; Playwright for drag, reverse drag, no zoom, clearing, markers and zoom buttons.
- **Baseline:** HEAD `28193cc` (= origin); Vitest 50/50; Playwright 9/9.
- **Result:**
  - `src/chart/measure.ts`;
  - `PriceChart.tsx`: a custom `interactionModel` (drag = measure; shift/alt-drag = pan; double-click = reset; touch =
    the Dygraphs defaults), snapping with `findClosestRow` and `getValue`, an overlay (shading, 2 lines, 2 dots), and
    the live `measure-bar` read-out; Escape, a plain click and a click outside the chart clear it; remounting on a
    symbol or run change clears it;
  - CSS; docs (ARCHITECTURE, RESEARCH_WORKFLOW).
- **Tests:**
  - `tests/measure.test.ts` (4);
  - `e2e/measure.spec.ts` (3): live, snapped to API points, reverse drag identical, window unchanged, clearing,
    zoom buttons, markers, crosshair, ET intraday, symbol switch;
  - a negative control (default interaction model → the drag test fails);
  - `npm run check`: Vitest 54/54, Playwright 12/12.

## Task 4 — COMPLETE (2026-11-04T13:28Z): mouse-wheel zoom
- Brief (user message): wheel up = zoom in, down = out, centred on the time under the cursor, gradual steps, X axis
  only, bounded by the data and a minimum span; drag-to-measure, markers, tooltips, crosshair, buttons and overview
  are preserved; preventDefault only when actually zooming; pixel/line/page delta modes; tests; commit + push, no merge.
- Plan: `src/chart/wheelZoom.ts` (pure) + a `wheel` handler in the PriceChart interactionModel; Vitest + e2e
  `e2e/wheel.spec.ts`. Baseline HEAD `e4a812b`; Vitest 54/54; Playwright 12/12.
- **Result:**
  - `src/chart/wheelZoom.ts`, plus a `wheel` handler in the PriceChart interactionModel. The x position is taken from
    clientX relative to the host, because `eventToDomCoords` uses offsetX, which is wrong for events forwarded from
    marker buttons. A non-passive wheel listener on the marker layer forwards wheels over markers.
  - The minimum span is 30 min (minute data) or 20 days (synthetic); the zoom factor is exp(Δpx × 0.0015), capped to
    [0.7, 1.4].
- **Tests:** `tests/wheelZoom.test.ts` (4) and `e2e/wheel.spec.ts` (3); a negative control (zooming on the window
  centre) fails the cursor test.

## Task 5 — growth-trading strategy `rise-from-recent-low-trading@1.0.0` + wheel direction (COMPLETE)

### Decisions (written 2026-11-04T16:10Z, from the audit; the brief needs no user question)

- **Entry:** the unchanged `scanRiseFromRecentLow` (edge-triggered) on `barsFromSessions(history, resolution)`, with the
  signal-only runner's exact warm-up formula, so the raw signals are identical. A signal is an EVENT: one rejected
  while invested or while an order is pending is discarded, never replayed. Re-arming = the scanner's own
  false→true rule (no extra state, cooldown, lower-price test or reset).
- **Execution:** the unchanged `ShadowBook` (`src/multi-etf-allocator/shadow.ts`, Study 8's per-symbol D1 book) driven
  by Rise decisions via `commit()`; `processBar()` (D1's dip/continuation entry machine) is never called, so no D1
  entry mechanism runs. Exits = its unchanged `ExitManager` (net-profit stop, maximum hold, buffered loss, overnight
  carry); fills = `firstTradeAfterDecision` (next eligible trade; a decision at the close fills next session's open).
- **Order at one instant:** decisions known at t are evaluated before trades executing at t (D1's bar-completion-then-
  next-bar order). **Same-session re-entry is allowed** after the exit instant (not required by the verified fill
  chronology: ShadowBook evaluates exits only for positions open at the session start, so a re-entry position first
  exits next session, exactly like any D1 entry). D1's "no entry on a session that started invested" belongs to its
  entry machine, which is not inherited.
- **Toggles:** hold OFF → `maximumHoldDays = ∞`; buffer OFF → `intradayLossBuffer = ∞` (conditions never true in the
  unchanged ExitManager). Buffer ON requires hold ON (rejected otherwise; the UI unticks and disables it).
- **Defaults (D1 baseline, `src/app/allIn-trailingBuy-postExitContinuation.ts` + `strategies.d1`):** stop 7.3%, hold
  8 calendar days, buffer 2.9% of the $100,000 notional; 11% simple interest, 365-day; costs 5 bps per side (pools /
  Study 8 convention; editable); stop fills at the stop price. Labelled illustrative, not optimised.
- **Events:** accepted raw signal → `entry_signal`; every other raw signal → `rejected_signal` with a reason; fills →
  `executed_entry` / `executed_exit`; open position at the end → entry with `meta.open`. Multi-symbol = independent
  standalone backtests, never summed.

### Stage table

| Stage | Status | Notes |
| --- | --- | --- |
| 5.0 recovery inventory + backup | complete (16:04Z) | see top screen |
| 5.1 baseline: app `npm run check`, root `npm test` | complete | app 16:09:32→16:10:23Z: typecheck, lint clean; Vitest 58/58; Playwright 15/15. Root 16:10:40→16:12:34Z: 960 tests, 949 pass, 7 fail (pre-existing: golden master / allin-original.ts, protected-file hashes, Study 7 parity), 4 skipped. Logs `apps/strategy-lab/logs/task5/baseline-*` |
| 5.2 audit doc `docs/strategy-lab/GROWTH_TRADING_AUDIT.md` | not started | |
| 5.3 wheel direction fix + tests | complete | `src/chart/wheelZoom.ts` `wheelZoomOutPx` (swipe up = deltaY>0 = zoom in; Ctrl/pinch keeps page-zoom sign); Vitest 5/5; e2e wheel+measure 7/7; negative control (old sign) fails the direction test |
| 5.4 engine `src/growth-trading/` + root tests | complete | `riseTrading.ts`; `tests/riseTrading.test.ts` 23/23; `tests/parity.test.ts` 3/3 (real data: B1 21 trades exact + both drawdowns; S8-VG-F24-3 VGT 13 + GDX 49 trades exact; VGT smoke 116 raw signals = scanner) |
| 5.5 registry, runner, service, jobs, UI | complete | shared/contract.ts (boolean params, `days`/`bps` units, `LabRunRequest`; signal-only `RunRequest` default unchanged so `runner/entry-signal-run.ts` is untouched), shared/strategies.ts (`RISE_FROM_RECENT_LOW_TRADING`, `crossParamErrors`, `isParamApplied`), server/service.ts (profiles; signal-only snapshot identical), server/jobs.ts (`RUNNER_SCRIPTS` allowlist, optional artifacts in manifest), runner/trading-run.ts, src/components/{RunTestDialog,Trading,Panels,RunView}.tsx, styles |
| 5.6 tests (vitest, e2e), real-data smoke, live-DB fingerprint check | complete | app `npm run check` 16:41:31→16:43:01Z: typecheck+lint clean, Vitest 71/71 (11 files; new `tests/trading.test.ts` 11, real-data +1), Playwright 19/19 (new `e2e/trading.spec.ts` 3, wheel 4). Old-run reads with the new code on a backup copy: 16/16 verified. Live DB: `runs-fingerprint.json` and every runs/imports file identical to the backup; DB mtime unchanged. No migration needed (schema unchanged) |
| 5.7 docs, checkpoint, commit, push | complete (pushed 16:50Z) | docs: GROWTH_TRADING.md, GROWTH_TRADING_AUDIT.md, CONTRACTS/ARCHITECTURE/OPERATIONS/RESEARCH_WORKFLOW/README updates, src/growth-trading/README.md. Commit plan: (1) wheel direction, (2) src/growth-trading engine + tests, (3) Strategy Lab integration, (4) docs + brief, (5) this checkpoint; then `git push origin feature/strategy-entry-explorer-ui` (no force, no merge) |

### Guards

- Do not modify existing strategies (`src/app/*`, `src/shared-margin-portfolio/*`, `src/multi-etf-allocator/*`,
  `src/entry-signals/*`), the signal-only runner `runner/entry-signal-run.ts`, sealed research, `data/`, or
  `state/strategy-lab/` (never delete/reseed; tests use temp state dirs; smoke servers use another port + temp state).
- No material-loss / lower re-entry / recovery-reset code, controls or schema. No optimiser/sweep. No merge to `main`.

### Final verification (2026-11-04)

- Root `npm test` 16:45:21→16:47:20Z: 987 tests, 976 pass, 7 fail — the SAME 7 pre-existing failures as the baseline
  (diffed by name) — 4 skipped; +27 new tests, all passing. Root `tsc` clean; root ESLint 306 problems (1 pre-existing
  error) = baseline; `src/growth-trading` clean.
- App `npm run check` 16:47:28→16:48:57Z (after the last code change): typecheck + lint clean; Vitest 71/71;
  Playwright 19/19.
- Exploratory example (engine, = the UI run R-000013 of the scratch server): VGT 2016-01-04→2023-12-29, X 5%/N 20/1d,
  defaults: 116 raw signals, 52 trades (51 closed, 1 open), realized −$3,270.17, unrealized +$12,987.72, total
  +$9,717.54, minute DD $73,618 (73.6%). X 6%: 109 / 54 (53 + 1 open), realized +$549.69, total +$13,537.41.
- Not verified manually: a physical trackpad or mouse (automated Chrome wheel events only); Safari/Firefox.

## Task 6 — COMPLETE (2026-11-04): the measurement exists only while the mouse button is held

- **Brief (user message):**
  - drag-to-measure shows the lines, dots, shading, dates and $/% change only while the button is held, updating
    live;
  - releasing clears all of it immediately;
  - so does a cancelled drag or a release outside the chart;
  - cursor-centred zoom, the crosshair, markers and Shift+drag panning are preserved;
  - tests; commit + push to `feature/strategy-entry-explorer-ui`; no merge.
- **Baseline:** HEAD `b5cde1a` (= origin), clean tree.
- **Change:** `src/chart/PriceChart.tsx`.
  - Every end of the gesture runs one `finish()`: `mouseup` on the document (on or off the chart), Escape, window
    `blur`, `contextmenu`, a `mousemove` with `(buttons & 1) === 0` (a missed release), or unmount.
  - `setMeasure(null)` clears the overlay and the read-out synchronously.
  - Only the primary button starts a gesture. The "clear (Esc)" button and the click-elsewhere listener were removed
    (nothing persists).
- **Tests:** `e2e/measure.spec.ts` was rewritten (3 tests).
  - It checks live updates while held, the instant full clearing on release, release off the chart, Escape mid-drag
    (later moves do not restore it), blur, a missed release, a plain click, Shift-drag panning, zoom buttons, markers
    and the crosshair.
  - `e2e/wheel.spec.ts` now wheels while the button is held.
  - Negative control: keeping the measurement after release fails all 3 measure tests.
- **Docs:** ARCHITECTURE (Lifetime), RESEARCH_WORKFLOW §4.8.

## Task 7 — COMPLETE (2026-11-04): ⌘/Ctrl + drag pans the chart

- **Brief (user message):**
  - ⌘-drag (macOS) or Ctrl-drag (Windows/Linux) pans horizontally: left shows later times, right earlier;
  - smooth, same zoom, bounded by the data, overview in sync, no measurement overlay;
  - the modifier is locked at the mouse-down;
  - release outside the chart, cancel and focus loss are handled; no text selection;
  - the plain drag-to-measure and the other interactions are preserved;
  - tests; commit + push, no merge.
- **Baseline:** HEAD `2911379` (= origin), clean tree.
- **Change:**
  - `src/chart/pan.ts` (pure): `isMacPlatform`, `panModifierFor`, `startsPan`, and `panWindow`, which is
    span-preserving and clamped to `g.xAxisExtremes()`.
  - `PriceChart.tsx`: every pan (⌘/Ctrl and the existing Shift/Alt) now uses `panWindow`, applied once per animation
    frame with `updateOptions({ dateWindow })`. Dygraphs' unbounded `startPan`/`movePan` are no longer used. Pans end
    through the shared `finish()` (release, Escape, blur, contextmenu, missed release, unmount).
  - `html.chart-panning` turns text selection off and shows a grabbing cursor.
  - The hint text is platform-specific.
- **Tests:**
  - `tests/pan.test.ts` (7): modifier detection, direction, zoom preserved, clamping, continuity, degenerate input.
  - `e2e/pan.spec.ts` (5): direction and live updates, the overview handles following the window, the mode lock both
    ways, clamping at both ends, release outside the chart, blur, Escape, no text selected, the other interactions
    after a pan, and ⌘ on emulated macOS.
  - Negative control: without Ctrl as the modifier, the 4 Ctrl tests fail.
- **Docs:** ARCHITECTURE ("Drag to pan"), RESEARCH_WORKFLOW §4.8.
