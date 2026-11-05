# Work recovery checkpoint — Strategy Lab (real-data workbench on the UI feature branch)

## Top screen (read this first) — Task 13: Interactive Preview — COMPLETE

- **Updated:** 2026-11-05T17:45Z (UTC, from the clock). **Status: COMPLETE — implemented, verified, committed and
  pushed.** **No merge to `main`.**
- **Follow-up (user-requested, 2026-11-05T18:18Z; committed `a860c8c` and pushed `d288a2d..a860c8c` at 18:48:55Z on the user's "Yes"; `git ls-remote` = `a860c8c`, `origin/main` = `aa5754d` unchanged):** a preview shown without being
  run (reload, Back/Forward, link) is re-checked: `GET /api/previews/PV-…?current=1` → `preview.current {matches,
  differences}` (`server/previews.ts` `detail(…, {checkCurrent})`); the UI shows it at once and flags *Outdated* with
  the differences (banner `preview-stale`, status `stale`) and enables Run preview with the same values. Docs corrected
  (INTERACTIVE_PREVIEW §1 statuses, §2 re-check, §3.2 "a code or data change deletes nothing", new §3.3 server disk vs
  browser memory, §6 API; CONTRACTS). Tests: `tests/preview.test.ts` (outdated after a code edit; `?current=1`), new
  e2e test (re-check on reload and Back/Forward; outdated simulated with `page.route`). `npm run check` 18:14→18:17:42Z
  (`logs/task13/check-3.log`): typecheck + lint clean, Vitest 204/204, build (`dist` = this code), Playwright 59/59.
- **Push:** `git push origin feature/strategy-entry-explorer-ui` (fast-forward `d2c3c1a..2f47482`, no force; outside
  the sandbox, first attempt, 2026-11-05T17:44:19Z). `git ls-remote` at 17:44:24Z: branch = `2f47482b700d…` (= local),
  `origin/main` = `aa5754d…` (unchanged). Commits `28197f6` code + tests, `99f85fa` docs + brief, `2f47482`
  checkpoint; this push record follows, pushed the same way.
- **Verification (final, on the final code; logs `apps/strategy-lab/logs/task13/`, git-ignored):** app `npm run check`
  17:38→17:42:51Z (`check-2.log`): typecheck + lint clean, Vitest 204/204 (25 files), build (`dist` = the final
  build), Playwright 58/58. Root `tsc` clean (it covers `src/**`, which imports `shared/contract.ts`: type-only change);
  `src/growth-trading/tests/riseTrading.test.ts` 24/24 (`root-riseTrading.log`). The root `npm test`/ESLint were not
  rerun: no `src/` file changed and root ESLint ignores `apps/**`. The first `check` (`check.log`, 17:34→17:37:53Z,
  before the `release()` fix) had 57/58: `strategy-lab.spec.ts:308` read `data-view-from` = null right after a symbol
  switch (its "a marker is visible" wait can be met by the outgoing chart, then the attribute is read between the new
  chart's mount and first draw — a race in that existing test; it passed in `e2e-all-1.log` and `check-2.log`; Task 10
  `check-2.log` also once failed this test, on another assertion). Not changed.
- **Live state (read-only checks 17:35Z and 17:43Z):** 119/119 backed-up `runs/`+`imports/` files identical, no new
  files, DB fingerprint (runs, variations, strategies, notes, migrations) identical to the backup; no
  `preview-cache/` in the live state (the live server runs the old code). Nothing of mine touched it.
- **Live server (the USER's) pid 3532274 (`start:vpn`, since 16:13:34Z) still running, OLD code (health has no
  `features`).** It serves the rebuilt `dist`: everything works as before; the *Interactive Preview* panel says the
  server must be restarted (its routes 404). **Follow-up gate (the user's):** restart it the same way
  (`npm --prefix apps/strategy-lab run start:vpn`); no migration; it creates `state/strategy-lab/preview-cache/`.
- **My processes:** none (scratch UI server 3563631 on :5331 stopped between the 17:35:07Z and 17:37:53Z clock reads; e2e servers exit with Playwright). The
  stray :4391 server pid 2772895 (session bbd6d528) untouched.
- **Deliverables (sha256, first 16):** brief `244605135c512a98`; `server/previews.ts` `53dd64640780b02e`;
  `server/preview-identity.ts` `4e8152cfbfddb734`; `server/preview-cache.ts` `eb280b868a4cffb7`; `shared/preview.ts`
  `71c03067fc1f3207`; `src/preview/usePreview.ts` `45eafa97a44d574e`; `src/preview/model.ts` `8ad9ddd7a21c4515`;
  `src/components/PreviewPanel.tsx` `938eaabe1fbbe487`; `src/components/RunView.tsx` `0e0db9200ae37eb5`;
  `src/paramForm.ts` `3d6493fba2aadc70`; `docs/strategy-lab/INTERACTIVE_PREVIEW.md` `af51753df6ea3bf5`;
  `e2e/preview.spec.ts` `def22b2f83c9ab64`; `tests/preview.test.ts` `872c7e4b31100811`.
- **Disclosures:** (1) a preview executes ONLY the effective parameters, so a run saved from a preview stores no
  "saved, not applied" drafts (New Test runs do); (2) the saved run's `request.json` is the executed request (no title
  /parentVariation; those are in the DB row); (3) symbols are fixed to the saved run's in the panel; (4) legacy
  Growth 1.0.0/1.1.0 runs are not previewable (explicit 1.2.0 upgrade button only); (5) the in-memory LRU layer the
  brief calls optional was not built (the disk cache answers a hit in 45–140 ms end to end); (6) the cache identity
  hashes ALL files of `data/<SYM>/` (a rewritten report invalidates conservatively); (7) not verified on browsers other
  than Chrome, physical keyboards/screen readers beyond automated ARIA/keyboard checks, or the live server (old code).
- **Brief:** `docs/strategy-lab/brief/2026-11-05-interactive-preview-brief.md` (verbatim copy of the upload
  `aabd3f7f-Claude_Strategy_Lab_Interactive_Preview_Implementation.md`, 169 lines (170 with the trailing line the Read
  tool shows), read in full through "Completion criteria"; sha256 `244605135c512a98fdc5c048498a55e6df46076ad50f60d973a429bd1c40788f`).
  The user's message: "Proceed with the complete assignment, including implementation, research execution,
  verification, and the requested Git commit and push". Brief §8: commit + push THIS branch, **no merge to `main`**; do
  not run the Growth optimisation study (not run).
- **Branch:** `feature/strategy-entry-explorer-ui`, HEAD at start `d2c3c1a` (= Task 12 push record), tree clean.
- **Backup (before any change):** `~/backups/strategy-lab/20261105T164429Z-pre-interactive-preview/` (node:sqlite online
  backup + integrity ok, 21 runs / 32 variations / 5 strategies / 3 migrations / 5 bookmarked runs; runs/ + imports/
  rsync; `state-files.sha256` 119 files; `runs-fingerprint.json`).
- **13.4 (2026-11-05T17:34Z):** full e2e on a scratch build 57/58 (`logs/task13/e2e-all-1.log`; the 1 failure was my test counting
  markers under a kept 3M zoom → fixed, `e2e-preview-4.log` 6/6). Benchmark (`scripts/benchmark-preview.ts`,
  `logs/task13/benchmark.json`, 17:31Z, temp state, HTTP path incl. detail+events+prices): VGT 1d 2016–2023 cold
  2.52 s (runner 2.38) → warm median 58 ms (×43); VGT+GDX 1d gates ON cold 6.19 s → 140 ms (×44); VGT 60m 2018–2020
  cold 2.09 s → 45 ms (×46); 15/15 warm = validated hits with the cold preview id. Docs: new
  `docs/strategy-lab/INTERACTIVE_PREVIEW.md`; updated docs README, ARCHITECTURE, CONTRACTS, OPERATIONS (config, backups,
  upgrade note: no migration, restart needed), RESEARCH_WORKFLOW (§2, §4 step 16), EXPORTS, app README, root README.
- **13.3 UI (2026-11-05T17:28Z):** `src/paramForm.ts` (draft logic extracted from RunTestDialog, shared), `src/components/ParamHelp.tsx`
  (the New Test help text, reused in popovers), `InfoPopover.tsx`, `PreviewPanel.tsx`, `PreviewBanner.tsx`,
  `src/preview/model.ts` + `usePreview.ts`; changed `RunView.tsx` (shown = saved run | preview, prefetch before swap,
  view prefs lifted, selection by stable identity, compare set aside while previewing), `App.tsx` (`?preview=`),
  `api.ts`, `hooks.ts` (prefetched responses), `Events.tsx`/`Trading.tsx` (controlled view state), `Panels.tsx`,
  `RunTestDialog.tsx` (same DOM), `styles.css`; `scripts/preview-cache.ts` + npm script `preview-cache`;
  `tests/preview-model.test.ts` 4/4; `e2e/preview.spec.ts` 6/6 against a scratch build
  (`STRATEGY_LAB_STATIC_DIR=<scratch>/dist`, log `logs/task13/e2e-preview-3.log`). `dist` NOT rebuilt yet.
- **(historical, 17:28Z) My running processes then:** scratch UI server pid 3563631 (port 5331, state = scratchpad `ui-state`, static = scratchpad
  `dist`, log scratchpad `logs/ui-server.log`) — mine, stop before the end. Full e2e (harness task b9x9qu36f, log
  `apps/strategy-lab/logs/task13/e2e-all-1.log`, e2e server on 5299 with a temp state).
- **13.2 tests (2026-11-05T17:07Z):** new `tests/preview-identity.test.ts` 10/10 (scanner, fingerprint = live fs/module trace of
  both runners, distinct/equal identities, code/data/input edits in a repo copy, fail closed), `tests/preview-cache.test.ts`
  5/5 (commit/hit/restart, tampering/format/foreign identity evicted, interrupted work removed, deterministic LRU by
  count and bytes, nothing outside touched, dir guards), `tests/preview.test.ts` 23/23 (C1→C2→C1 two cold + hit, no
  runs/variations, coalescing, cancellation, superseded tickets, parity with a normal run, Save as run fresh + cached +
  duplicate confirm, export, restart, code edit same version / data edit / tampered payload in a repo copy, stale save
  refused, non-previewable kinds, invalid requests, HTTP routes). Full app Vitest 198/198 (24 files;
  `logs/task13/vitest-1.log`).
- **13.2 (16:58Z):** new `server/preview-identity.ts`, `server/preview-cache.ts`, `server/previews.ts`,
  `shared/preview.ts`; changed `server/jobs.ts` (exports NODE_FLAGS/RUNNER_ENV/runnerEnv/OPTIONAL_ARTIFACTS, same
  behaviour), `server/config.ts` (preview cache dir/limits), `server/service.ts` (exports runProfile, dataAssumptions,
  ensureRegistered public), `server/repo.ts` (runsSavedFromPreview), `server/http.ts` (shared events/prices helpers +
  preview routes), `server/export.ts` (buildBundle + buildPreviewBundle), `server/main.ts`, `shared/contract.ts`
  (RunKind `preview`), 6 test files (createHandler gets `previews`). Server tsc clean. Smoke (scratch, temp state):
  VGT 1d 2016–2023 cold preview 2.6 s, cache hit 40 ms (identity 37 ms), save → R-000002, duplicate refused.
  Static closure of trading-run.ts = the traced runtime set exactly (31 files + 5 npm packages).
- **Brief:** `docs/strategy-lab/brief/2026-11-05-interactive-preview-brief.md` (verbatim copy of the upload
  `aabd3f7f-Claude_Strategy_Lab_Interactive_Preview_Implementation.md`, 169 lines (170 with the trailing line the Read
  tool shows), read in full through "Completion criteria"; sha256 `244605135c512a98fdc5c048498a55e6df46076ad50f60d973a429bd1c40788f`).
  The user's message: "Proceed with the complete assignment, including implementation, research execution,
  verification, and the requested Git commit and push". Brief §8: commit + push THIS branch, **no merge to `main`**; do
  not run the Growth optimisation study.
- **Branch:** `feature/strategy-entry-explorer-ui`, HEAD at start `d2c3c1a` (= Task 12 push record), tree clean.
- **Live server (the USER's):** pid 3532274 (`start:vpn`, started 2026-11-05T16:13:34Z, :4317 on 127.0.0.1, 127.0.1.1,
  100.68.60.114; default state dir; serves `apps/strategy-lab/dist`). NOT mine: never stop/restart without asking. Its
  DB is at migration 0003 (21 runs; ids 21–26, 28–33 deleted by the user). Stray :4391 smoke server pid 2772895 (earlier
  session bbd6d528, scratch state) — not mine, left alone. Every `vite build` replaces what the live server serves.
- **Backup (before any change):** `~/backups/strategy-lab/20261105T164429Z-pre-interactive-preview/` (node:sqlite online
  backup + integrity ok, 21 runs / 32 variations / 5 strategies / 3 migrations / 5 bookmarked runs; runs/ + imports/
  rsync; `state-files.sha256` 119 files; `runs-fingerprint.json`). Rerunnable Growth 1.2.0 runs: R-000018/19/20/27
  (VGT 1d); R-000017 Growth 1.0.0 (legacy); R-000014–16 signal-only; R-000013 Study 8 import; R-000001–12 demo.
- **Measured facts:** the trading runner on VGT 1d 2016-01-04→2023-12-29 (X5 N20 defaults): 2.5 s wall, 618 MB RSS,
  219 events, events sha `d8d3b944…`; artifacts ≈ 3.8 MB (minute-marks 2.8 MB). sha256 of data.csv: VGT 53 MB 31 ms,
  GDX 80 MB 46 ms → the data identity is re-hashed on every request (no stat memo). Runtime-read non-code files
  (fs trace): `config/market-events/splits.json`, `data/partitions.json`, `config/archive/legacy-research-inputs.json`,
  `data/<SYM>/data.csv`. Loaded modules: 31 app/src files + npm `csv-parse`, `fs-extra`, `graceful-fs`, `jsonfile`,
  `universalify` (+ node: builtins). Static closure must resolve `#lib`/`#types` (root package.json `imports`).
- **Next step:** stage 13.2 — `server/preview-identity.ts`, `server/preview-cache.ts`, `server/previews.ts`, routes,
  config, export refactor; tests. Nothing of the live state is touched by implementation or tests (temp state dirs).

## Task 13 — design (written 2026-11-05T16:47Z, from the code audit; no user question needed)

- **Scope.** A saved run's page gets an *Interactive Preview* toggle (chart card toolbar) opening a right-side panel
  (closed by default). Previewable = completed `manual` run with a stored request of a strategy whose version is
  `launch: form` (signal-only 1.0.0, Growth 1.2.0). Explicit disabled reasons: imports (Study 8 shared-slot replay — never
  substituted by a standalone run), pool reruns, demo/synthetic, legacy Growth 1.0.0/1.1.0 (stored as recorded; an
  explicit "preview with the current version" seeds a 1.2.0 draft, labelled as NOT a reproduction), runs not completed.
- **Execution.** The same allowlisted runner script (`RUNNER_SCRIPTS`), Node flags, minimal env and timeout as
  `server/jobs.ts`, in `<stateDir>/preview-cache/work/<exec>/` with `request.json` whose `runId` = the preview id
  `PV-<64 hex key>`. The request is CANONICAL: only the effective parameters (`effectiveParams`) + symbols (order kept)
  + from/to + resolution; so a cached result is a pure function of its identity. No SQLite row, variation, trial or
  sidebar entry. Concurrency 1 (separate from runs), coalescing by key (one execution, many tickets), cancellation
  when the last ticket is released (queued → dropped; running → SIGTERM/SIGKILL, never cached), ticket expiry 60 s
  without a poll.
- **Identity / key** = sha256(canonical JSON): format + event contract; strategy key, version, kind, runner script,
  sha256 of its stored schema; canonical effective params (sorted keys, JS shortest numbers); symbols in order; from,
  to, resolution; data: sha256 of every regular file in `data/<SYM>/` per symbol + the runtime inputs (splits.json,
  partitions.json, legacy-research-inputs.json); implementation: sha256 over the runner's static import closure
  (relative, `#` subpath imports, npm packages hashed whole + their dependencies), Node version/platform/arch, the
  runner flags. Unresolvable → fail closed (no preview). After execution: the runner's recorded data sha256 and engine
  file hashes must equal the identity's, and the identity is recomputed and must be unchanged — else not cached.
- **Cache.** `<stateDir>/preview-cache/` (`STRATEGY_LAB_PREVIEW_CACHE_DIR`): `entries/<key>/` (runner artifacts +
  `manifest.json` + `entry.json` {format, identity, files sha256/size, timings, codeRevision}), `work/`, marker file.
  Commit = verify → write entry.json → rename the work dir (atomic). Every hit recomputes the identity, compares the
  stored identity exactly, re-hashes every file, re-validates the events; any failure → evict + recompute. LRU
  (`lastUsedAt`, tie-break key) bounded by entries (200) and bytes (2 GiB); startup removes `work/` leftovers. CLI
  `npm run preview-cache -- status|verify|prune|clear` touches only that directory.
- **API.** `GET /api/runs/:id/preview` (capability, seed request, drift vs the run's recorded engine/data hashes);
  `POST /api/previews` (one configuration → ticket; immediate cache hit); `GET|POST /api/previews/tickets/:t[/cancel]`;
  `GET /api/previews/:pv` (RunDetail-shaped, kind `preview`), `/events`, `/prices`, `/export`; `POST
  /api/previews/:pv/save` (re-validates; materialises ONE normal immutable run: runId rewritten, manifest, contract
  validation, same variation identity/experiment as New Test, parentVariation = source; provenance.preview; duplicate
  saves reported, confirmed explicitly).
- **UI.** Draft logic extracted from RunTestDialog into one shared module (no fork) + the New Test help text as one
  component reused inside info popovers. Panel: strategy title + exact version, status chip (Modified / Running / Cache
  hit / Preview ready / Error), dates + resolution, groups with compact controls, Run preview (Enter submits), Reset
  (to the displayed configuration), Return to saved result, Save as run. Client revisions (monotonic), stale responses
  ignored, prefetch of the new result's events + prices before the swap (no blank chart, no mixed executions). View
  preferences lifted to RunView (marker kinds, event-table scope/search/sort, closed-losses toggle) so swaps keep them;
  selection kept only when the same trade (same fills) exists. URL `?preview=PV-…` restores a displayed preview after a
  reload while its cache entry validates (drafts are not persisted).

## Top screen (read this first) — Task 12: delete saved results (runs) — COMPLETE

- **Updated:** 2026-11-05T16:06Z (UTC, from the clock). **Status: COMPLETE — implemented, verified, committed and pushed.**
- **Push:** `git push origin feature/strategy-entry-explorer-ui` (fast-forward `d06576e..6352dce`, no force; run outside
  the sandbox, which has no DNS). `git ls-remote` at 2026-11-05T16:06:50Z: branch = `6352dcea5a63…` (= local),
  `origin/main` = `aa5754d…` (unchanged). Commits `9c7ec9f` code + tests, `4e4a7d8` docs, `6352dce` checkpoint; this
  push record follows, pushed the same way. No merge to `main`; commit + push to `feature/strategy-entry-explorer-ui` requested by the user's message.
- **Brief:** the user's chat message (Strategy Lab: Delete Saved Results) — a Delete action per run with a confirmation
  dialog (run id, strategy, symbols, run date, permanence warning; Cancel default, destructive Delete), deletion of the
  run's results, artifacts, run-only notes and bookmark; unrelated data preserved; consistent DB/filesystem; list and
  selection refresh; feedback; no concurrent duplicates; no wildcard deletion, no renumbering; unknown ids rejected;
  tests; docs.
- **Start:** HEAD `d06576e` (= origin), tree clean. Live server not running. Backup of Task 11
  (`~/backups/strategy-lab/20261105T125521Z-pre-trend-eligibility/`) = the live state (verified at 14:18Z).
- **Audit (schema):** FK to runs: `run_symbols.run_id`, `optimization_trials.run_id`; `notes(target_type 'run',
  target_id = runs.id)`; bookmark = `runs.bookmarked_at`; `runs.phenotype_id → phenotypes`, `runs.variation_id →
  variations` (shared, immutable, never deleted). Trigger `runs_no_delete` forbids deletes; `nextId('runs')` =
  max(id)+1 (a deleted newest id would be REUSED); `seedDemo` reseeds when the demo experiment has no run.
- **Design:** migration 0003: `run_deletions` tombstone (minimal summary, never deleted, read by nextId so ids are
  never reused) + `runs_no_delete` replaced by a guarded trigger (delete only while a 'deleting' tombstone exists).
  Procedure (service, synchronous, per-run lock): refuse queued/running, refuse runs referenced by optimization trials;
  rename `runs/R-x` → `trash/R-x.<stamp>`; one transaction (tombstone, run notes, run_symbols, run row, tombstone
  'deleted'); on failure rename back and report; after commit purge the trash dir (failure → reported warning +
  startup purge). Startup recovery: trash dir of a still-existing run → restored; of a deleted run → purged. seedDemo
  skips when demo runs were deleted. UI: run header ⋯ menu → Delete result… → confirmation dialog.
- **Implemented by 16:02Z:** `server/migrations/0003_run_deletion.sql`, `server/delete-run.ts` (new), `server/repo.ts`
  (nextId skips deleted ids; runDeletionInfo, deleteRunRecords, tombstone queries), `server/http.ts` (`DELETE
  /api/runs/:id`, body `{confirm}`), `server/main.ts` (recoverRunDeletions at start), `server/seed-demo.ts` (no reseed
  after deleted demo runs), UI `src/components/DeleteRunDialog.tsx` (new), `RunView.tsx` (⋯ actions menu), `App.tsx`
  (notice, route/compare update), `api.ts`, CSS; tests `tests/delete-run.test.ts` 13/13, `e2e/delete-run.spec.ts` 4/4;
  updated `tests/migration.test.ts` (3 migrations), `tests/server.test.ts` (new trigger message); app Vitest 160/160.
  Docs: OPERATIONS §Deleting a saved result (+ upgrade note), ARCHITECTURE (rule + migration 0003), CONTRACTS (route),
  RESEARCH_WORKFLOW §4.15.
- **LIVE SERVER RUNNING (the user's):** pid 3505161 (`start:vpn`, started 15:28:22Z, :4317 on 127.0.0.1/127.0.1.1/
  100.68.60.114), the user is creating runs (R-000018…R-000033 by 16:01Z; it also imported the gates demo → 4
  phenotypes). Its DB is still at migration 0002 (0003 applies at ITS next start; not restarted by me). It serves
  `dist`, rebuilt by my e2e builds: the delete UI is visible there but its server process has no DELETE route until it
  restarts (a delete attempt shows "Not deleted. … method not allowed"; nothing is lost).
- **Fresh backup 16:01Z:** `~/backups/strategy-lab/20261105T160129Z-pre-run-deletion-0003/` (online node:sqlite backup,
  runs/ + imports/, state-files.sha256, audit-before.json: 33 runs, 33/33 events, integrity ok, FK []).
  **Rehearsal on a copy of it:** 0003 changes no audited key except schema_migrations 2→3; deleting R-000003 on the
  copy: the other 32 runs, all variations and every other file identical, FK [], integrity ok, 32/32 events.
- **Verification (final):** app `npm run check` 16:02:06Z→16:05:25Z (`apps/strategy-lab/logs/task12/check.log`):
  typecheck + lint clean, Vitest 160/160 (21 files), build, Playwright 52/52 (dist = the final build). Root tsc clean;
  root ESLint 306 (= baseline). The root `npm test` was not rerun: Task 12 changes only apps/strategy-lab server/UI
  files that no root test imports (the 14:12Z run stands: 1104 / 1093 / 7 pre-existing / 4 skipped).
- **Live data:** only read by me (backup + audits); the changes since 14:18Z are the user's own runs and imports.
- **Follow-up gate (the user's):** restart the live server (same `start:vpn`) to apply migration 0003 and enable
  deletion (rehearsed on a copy of the 16:01Z backup); then *⋯ → Delete result…* works in the UI.


## Top screen (read this first) — Task 11: Growth entry trend filter, latched entry eligibility, compact strategy picker — COMPLETE

- **Updated:** 2026-11-05T14:36Z (UTC, from the clock). **Status: COMPLETE — implemented, verified, committed and
  pushed.** **No merge to `main`.**
- **Push:** `git push origin feature/strategy-entry-explorer-ui` (fast-forward `0301c01..358b90f`, no force) completed
  2026-11-05T14:32:21Z, after the earlier attempts timed out on intermittent DNS (github.com unresolvable inside the
  command sandbox; the push ran outside it). `git ls-remote` at 2026-11-05T14:36:28Z:
  `origin/feature/strategy-entry-explorer-ui` = `358b90fe82e0…` (= local), `origin/main` = `aa5754d…` (unchanged).
  Commits: `3136940` code, `f078ab1` docs + brief, `358b90f` checkpoint; this push record follows as a separate commit,
  pushed the same way.
- **Verification (final, logs `apps/strategy-lab/logs/task11/`, git-ignored):**
  - root `npm test` 14:12:42Z→14:15:52Z (`root-test-final.log`): 1104 tests / 1093 pass / 7 fail (= the 7 pre-existing
    of Task 10, compared by test name) / 4 skipped;
  - root `tsc` clean; root ESLint 306 problems (= baseline; `src/growth-trading` clean);
  - Growth engine suite `src/growth-trading/tests/*.test.ts` 144/144 (`growth-tests.log`), incl. OFF parity with 1.1.0
    (8) and 1.0.0 (7);
  - app `npm run check` 14:09:27Z→14:12:33Z (`check.log`): typecheck + lint clean, Vitest 147/147 (20 files), build,
    Playwright 48/48 (dist = the final build).
- **Old runs / live data:** a COPY of the backup served by a scratch server (port 5321, stopped): all 17 runs open
  with their events; exports of R-000017/R-000014/R-000013 OK; R-000017 (Growth 1.0.0, the user's run) **REPRODUCED**
  by the 1.2.0 engine (`replay-run.ts`, legacy mode: trades/daily/metrics every stored field, 57 events identical);
  its clone validates as 1.2.0 with continuation, trend filter and eligibility OFF. Live `state/strategy-lab/`:
  `audit-state` identical to audit-before on 13 keys, 79 runs/imports files byte-identical to the backup, DB sha256
  `65143e94…` unchanged; **no migration** needed or applied. Disclosure: the read-only audits created empty SQLite
  sidecar files `strategy-lab.sqlite-wal` (0 bytes) and `-shm` next to the live DB (normal for read-only WAL opens).
- **Running processes:** none of mine. The user's live :4317 server was NOT running at the start and was not started
  (it is the user's to start; it will serve the new `dist`). The stray :4391 smoke server (pid 2772895, earlier session)
  is untouched.
- **Deliverables (sha256, first 16):** brief `a951b12c1653ccf9`; `entryGates.ts` `9f8238d940e29477`; `riseTrading.ts`
  `a24903d8a99f7209`; `continuation.ts` `81e796624166ad1d`; `shared/strategies.ts` `72bdb47e131b2c0a`;
  `runner/trading-run.ts` `5eb71e6d07dfbd84`; `runner/growth-params.ts` `f6c2017aa0595829`; `StrategyPicker.tsx`
  `2eaa3515c7617d42`; `GROWTH_ENTRY_GATES.md` `81c59e992a1c972f`; `paired-comparison.ts` `a8ad79c69892b90a`; baselines
  `baseline-1.1.0.json` `95f9f348d95ccdcd`, runner `SHA256SUMS` `804c0cba62b3cb2c`; gates demo export MANIFEST
  `33411e02edbbe83d`.
- **Follow-up gate (the user's):** review in the UI (strategy select; Growth → Entry trend filter / Persistent entry
  eligibility; a run's Trades labels, Analysis → Entry gates, Export research bundle); restart the live server to serve
  the new build; optionally import the 1.2.0 gates demo phenotypes (`npm --prefix apps/strategy-lab run
  import:phenotypes -- apps/strategy-lab/fixtures/phenotypes/growth-gates-demo-2026-11`); any optimisation of the
  gates = a separate CLI study with its own protocol.
- **Brief:** `docs/strategy-lab/brief/2026-11-05-growth-trend-filter-eligibility-brief.md` (verbatim copy of the upload
  `6b1708c5-Claude_Strategy_Lab_Growth_Trend_Filter_Entry_Eligibility_UI.md`, 172 lines (173 with the trailing line the
  Read tool shows), read in full through §F's last line; sha256 `a951b12c1653ccf9dbb5626b2bd024bdf49963b1fa848cb1a8b841951fca1c2c`).
  The user's message authorises the whole assignment "including implementation, research execution, verification, and
  the requested Git commit and push"; the brief §F.5 asks for commit + push to THIS branch, **no merge to `main`**.
- **Branch:** `feature/strategy-entry-explorer-ui`, HEAD at start `0301c01` (= the Task 10 push record), tree clean.
- **Backup (before any change):** `~/backups/strategy-lab/20261105T125521Z-pre-trend-eligibility/` (consistent SQLite
  copy via node:sqlite `backup()`, runs/ + imports/ copies, `state-files.sha256` (79 files), `runs-fingerprint.json`,
  `audit-before.json`, MANIFEST.md). Live DB at start: 17 runs (R-000001…R-000017), 17 variations, 4 strategies,
  phenotypes 1 (PH-0001 Study 8), migrations 0001 + 0002, FK [], integrity ok, 17/17 events verified.
- **Live server:** NOT running at start (nothing on :4317; the Task 10 restart pid 3117173 is gone). Stray :4391 server
  pid 2772895 (earlier session bbd6d528, scratch state) — not mine, left alone.
- **Baselines (captured at 0301c01 with the UNCHANGED 1.1.0 engine and runner, before any code change):**
  - engine: `src/growth-trading/tests/fixtures/baseline-1.1.0.json` (sha256 `95f9f348d95ccdcdb130d009d7d4fbdb1a7cc2a87d3521de12231b2c6975b83e`),
    produced by `src/growth-trading/tools/capture-baseline-1.1.0.ts` (7 cases: vgt-1d-off, gdx-1d-classic,
    vgt-1d-breakout, xbi-1d-ma-cross, vgt-60m-shallow, gdx-15m-classic-buffer-off, xbi-1d-off-n60; signals, trades,
    excursions, daily, ledger, continuation outcomes, episodes, decision log, mark changes, metrics — full + hashes).
    engine sha256 riseTrading `40862479…`, continuation `06f2e70a…` (= Task 10 deliverables); engineDirty "".
  - runner: `apps/strategy-lab/tests/fixtures/growth-runner-baseline-1.1.0/` (R-910001 VGT+GDX 1d 2016–2023 OFF,
    R-910002 VGT 1d breakout, R-910003 GDX 60m 2018–2020 classic_d1; gzip -n -9; `SHA256SUMS` of the uncompressed
    files incl. decisions.json and the minute-marks content hash). Produced in scratch
    `runner-baseline-1.1.0/` with `node … apps/strategy-lab/runner/trading-run.ts <dir>` from the repo root.
- **Chart snapshots `no-1…yes-3`:** NOT available to Claude (the upload folder holds only the brief; none found under
  /home/chad). Logged as unmatched; nothing was inferred from them.
- **Stage 11.3 (engine) code done by 13:18Z (clock):** `src/growth-trading/entryGates.ts` (new: TrendGate A–E, predicate states,
  EntryGates opportunities/renewal watch), `continuation.ts` (gate hooks: a blocked trigger ends its episode; log types),
  `riseTrading.ts` (1.2.0; params trendFilter/eligibility; merged base→latched→continuation loop; entry sources;
  `entryGates` metrics only when ON). Root tsc clean. **OFF parity verified (before 13:18Z):** `offParity-1.1.0.test.ts` 8/8
  (7 cases × 2 OFF forms = baseline-1.1.0 exactly, full metrics + log + mark-change hashes) and `offParity.test.ts`
  7/7 (1.0.0). Real-data smoke (scratch `smoke-gates.ts`, VGT/GDX 2016–2023, VGT 60m 2018–2020): every method and
  policy runs, fixed-ledger difference 0; eligibility ON + no gate = OFF trades (52, +9,718).
- **Stage 11.4 (synthetic unit tests) 13:26Z:** `src/growth-trading/tests/entryGates.test.ts` 39/39 (trend A–E incl.
  equality, warm-up, invalid data, partial session, odd N, look-ahead guard; predicate edges = scanner crossings;
  policies 1–5 incl. expiry boundary, drift, extension, deterioration, renewal vs policy 1, precedence; capital hook;
  continuation veto / priority / supersede; orthogonality matrix 2×3×3; scope guard). DecisionLog.insert keeps the raw
  crossing before the gate entries it causes. Existing riseTrading.test.ts: 2 expected contract failures (registry
  version, Simulation keys) — to update with the registry.
- **Stage 11.5 (registry, params mapping, runner, replay) code done 13:33Z:** `shared/strategies.ts` (Growth 1.2.0 = form;
  1.1.0 frozen legacy `launch: phenotype`; 1.0.0 legacy; trend + eligibility params with bounds/search domains; group
  notes as registry data `groupNotes`), `shared/contract.ts` (GroupNote), `shared/params.ts` (noteShown),
  `runner/growth-params.ts` (each request read with ITS version's schema; trendFilterOf/eligibilityOf),
  `runner/trading-run.ts` (gate fields only when ON; latched/renewal events; entryDecisions/opportunities/renewalWatches
  in decisions.json; run-level trendFilter/eligibility), `server/replay.ts` (modes legacy | legacy-1.1.0 | exact),
  `scripts/replay-run.ts`. **Runner parity 13:33Z:** `tests/growth-parity.test.ts` 9/9 (1.0.0 ×2; 1.1.0 replay ×3 and
  1.2.0 OFF/OFF ×3 = growth-runner-baseline-1.1.0: events/trades/daily sha256 identical, metrics/decisions every stored
  field, minute-mark content; pool rerun).
- **Stage 11.6 (service, phenotypes, compare, export) + 11.7 (UI) code done 13:46Z:** `server/service.ts` (gate titles +
  assumptions; capabilityOf runs legacy-Growth 1.1.0 phenotypes as themselves), `importers/phenotypes.ts` (accepts them),
  `server/compare.ts` (gate states, version note), `server/export.ts` (entry-decisions.csv, opportunities.csv,
  entry-gates.md, trades.csv entry_source/opportunity/age columns, README), `shared/artifact-types.ts`; UI:
  `src/components/StrategyPicker.tsx` (new ARIA combobox + listbox, fixed popup), `RunTestDialog.tsx` (picker,
  details region, registry group notes), `Trading.tsx` (EntryGateRows, entry-source label), `Panels.tsx` (legacy text),
  CSS. Tests: app Vitest 140/140 (6 updated for the 1.2.0 contract: trading.test ×4, params.test, real-data.test);
  root riseTrading/continuation/entryGates 92/92. E2E (`npm run test:e2e`, log `apps/strategy-lab/logs/task11/e2e-1.log`):
  46/47, the failing one a phone-width page-overflow assertion of the pre-existing desktop run layout → narrowed to
  "the modal adds none" (log e2e-gates-2.log: entry-gates.spec 4/4). New `e2e/entry-gates.spec.ts`; helpers
  `chooseStrategy`; specs updated for the picker and 1.2.0.
- **Stage 11.8–11.9 done 13:53Z:** `src/growth-trading/tools/paired-comparison.ts` + root script `growth-paired`
  (smoke: scratch `paired-request.json` → `paired-out/`, VGT/GDX 2016–2023 trend A + time_limited, 5.5 s);
  `src/growth-trading/tests/entryGatesRealData.test.ts` 18/18 (holiday + early close; independent recomputation of every
  base decision for A–E; 60m partial session; 5 policies × VGT/GDX invariants; determinism; 1m tractable);
  `apps/strategy-lab/tests/entry-gates.test.ts` 7/7 (registry, search space, phenotype import/rerun 1.2.0 + 1.1.0,
  real gated run: records = ledger, bundle deterministic, exact replay, compare vs OFF). New fixture export
  `apps/strategy-lab/fixtures/phenotypes/growth-gates-demo-2026-11/` (script `scripts/make-growth-gates-demo-phenotypes.ts`;
  NOT imported live); `make-growth-demo-phenotypes.ts` now pinned to the frozen 1.1.0 spec (regenerates the checked-in
  1.1.0 export byte-identically). E2E: serve.ts imports the gates demo; phenotypes.spec counts 9/8 + a 1.2.0 phenotype test.
- **Stage 11.10 (docs) done 14:00Z:** new `docs/strategy-lab/GROWTH_ENTRY_GATES.md`; updated docs README, GROWTH_TRADING,
  GROWTH_CONTINUATION, CONTRACTS, EXPORTS, OPERATIONS (no-migration upgrade note, limitations), RESEARCH_WORKFLOW (§4
  guide), ARCHITECTURE (New Test dialog + picker), PHENOTYPES (legacy 1.1.0 reruns, fixtures), src/growth-trading README,
  apps/strategy-lab README, root README. Trace examples: scratch `traces.txt` (traces.ts, traces2.ts; VGT/GDX/XBI
  2016–2023 training only).
- **Stage 11.11 (verification) done 14:18Z:** see the top screen. Fixed during it: 121 prettier/unused warnings in my
  new `src/growth-trading` files (eslint --fix + declaration order; behaviour unchanged, Growth suite re-run 144/144);
  one lint error in the new app test.
- **Commits** on `feature/strategy-entry-explorer-ui` (base `0301c01` = origin at the start): `3136940` code (engine +
  Strategy Lab + tests + fixtures + root `growth-paired` script), `f078ab1` docs + brief, then this checkpoint; next:
  `git push origin feature/strategy-entry-explorer-ui` (no force, no merge) and the push record.

## Task 11 — design decisions (written 2026-11-05T13:06Z, from the audit; no user question needed)

- **Version.** Growth stays the user-facing name; engine `STRATEGY_VERSION` 1.2.0. 1.1.0 becomes legacy
  (`launch: 'phenotype'`: not offered by New Test, but its catalogue phenotypes stay runnable; replay = 1.2.0 with
  the trend filter and eligibility OFF). 1.0.0 stays legacy (`launch: none`), replay = 1.2.0 all OFF. With both new
  switches OFF every simulation output, event, trade row, daily mark and decision-log entry is IDENTICAL to 1.1.0;
  only metrics/decisions top-level metadata (strategy version, engineVersion, `trendFilter`/`eligibility`
  `{enabled:false}`) differ. New fields appear only when a gate is ON.
- **Trend filter (5 methods, sessions).** Observations P_0 = the decision price (the completed decision bar's close),
  P_k = regular-session close of session s−k (k ≥ 1). Highs/lows: completed sessions' sHigh/sLow; the current session
  only through minutes completed by the decision time (the full session incl. closing print for a decision at the
  close). A: P_0 ≥ P_N(1+m)(1−1e-12). B: OLS of ln P over N+1 points (x = session index), slope% = (e^{bN}−1)·100 ≥
  min; flat → exactly 0 (centred logs). C: P_0 > SMA_N(0..N−1) and SMA_N(now) > SMA_N(K..K+N−1) strictly. D: N
  observations k=0..N−1, two halves of floor(N/2) (odd N: middle excluded); newer max high > older max high·(1+m)
  AND newer min low > older min low·(1+m). E: both returns ≥ thresholds (threshold form), 0 < S < L. Missing history
  → `insufficient_history` (block); non-positive/non-finite → `invalid_data` (block). Warm-up extended only when ON.
- **Gate scope.** Every Growth entry decision: the base crossing, a latched opportunity decision, a renewal signal,
  and a continuation trigger (a blocked continuation trigger ENDS its episode `trend_veto`: no repeated per-bar
  re-triggering; classic_d1 setup cancelled). Exits untouched. Pending orders keep their semantics (a placed order
  fills regardless of later trend changes). Optional harness-only `capacity(s,t)` hook = `blocked_by_capital`.
- **Eligibility (5 bounded policies, W = max age, default 10 sessions, origin session = day 0, eligible through
  origin+W, expired after its close).** Arms ONLY on a raw crossing taken while flat with no order (signals while
  invested/pending stay ignored, nothing armed) or on a policy-5 renewal signal. Evaluated at its arming decision and
  then at every completed signal-resolution bar end while flat with no order. Order: expiry → policy validity
  (invalidate, terminal) → capital → trend → decision (order at the next eligible trade at the then-current price).
  1 time_limited: valid while the current bar satisfies the original predicate C_i (rolling low, scanner formula).
  2 minimum_strength: valid while close ≥ fixed signal-time recentLow·(1+a) (replaces the rolling predicate; checked
  from the arming bar on). 3 maximum_extension: C_i AND close ≤ signal price·(1+e), else invalidated.
  4 deterioration: C_i AND close > maxClose since arming·(1−d), else invalidated. 5 reset_renew: C_i as policy 1;
  after an unconsumed opportunity expires/is invalidated, a renewal watch (bounded by W sessions after that end): a
  later close ≤ ref·(1−D) resets (ref = the ended opportunity's signal price), trough = lowest close since the reset
  (candidate excluded); the FIRST bar with close ≥ trough·(1+R) ends the watch — a renewal signal if C_i holds there
  (source `eligibility_renewal`, new opportunity with lineage), otherwise no renewal (episode used once). A genuine
  crossing takes precedence (clears the watch); any entry cancels it.
- **Priority at one instant:** fresh crossing → live opportunity → continuation. Any taken entry closes the
  continuation episode (base priority, as before) and supersedes a live opportunity / renewal watch of another
  source. One live opportunity per symbol: a new crossing while one is live (possible only under policy 2)
  supersedes it. Same-session re-entry after an exit stays allowed (existing Growth semantics).
- **Records.** Outcome statuses add `vetoed` (gate, eligibility OFF) and `deferred` (armed, not taken at its own
  decision); events: raw crossing once (entry_signal taken / rejected_signal otherwise), latched decisions
  `SYM:latched:<t>`, renewal signals `SYM:renewal:<t>`; decisions.json gains `opportunities` + `entryDecisions`
  (only when ON); metrics per symbol `entryGates` (only when ON); export adds opportunities.csv,
  entry-decisions.csv, entry-gates.md.
- **UI.** Generic registry-driven groups (trend, eligibility) with group notes in the registry (no strategy-specific
  branches); strategy radio cards → accessible rich combobox (StrategyPicker) with a details region.


## Task 11 — disclosures (for the final report)

- **Existing tests changed because the contract changed (intent kept):** `apps/strategy-lab/tests/trading.test.ts`
  (registry: 1.2.0 current, 1.1.0 legacy `launch: phenotype`; the boolean list adds the two gate switches; the runner
  allowlist compares unique keys; the assumption keys add `trendFilter`, `eligibility`; the restriction test is renamed
  "no post-LOSS restriction" with a comment: policy 5's reset/renew concerns an unconsumed opportunity, OFF by default),
  `tests/params.test.ts` (constraint `momentum-short-long`), `tests/real-data.test.ts` (a 1.2.0 request with explicit
  switches), `tests/growth-parity.test.ts` (engineVersion 1.2.0; new 1.1.0 section), `src/growth-trading/tests/
  riseTrading.test.ts` (registry mapping read per version; `Simulation` keys + `gates`; the guard also scans
  entryGates.ts), `offParity.test.ts` (describe title only), e2e specs (picker helper `chooseStrategy`, 1.2.0
  requests, `Growth v1.2.0`, phenotype counts 6→9 / 5→8 because the e2e temp state also imports the gates demo).
- **Phone-width check:** the run page behind the modal (the existing desktop layout) already overflows horizontally at
  390 px. The e2e test asserts that the modal and its popup add no overflow and that the modal has no sideways scroll;
  the run page's own layout was not changed (out of scope).
- **Design choices worth stating:** signals while invested or pending arm nothing (unchanged "ignored"); a blocked
  continuation trigger ends its episode (no per-bar re-trigger); eligibility without a blocker equals OFF in a
  standalone run; the policy-5 watch is bounded by the same W (no extra parameter); policy 2 replaces the rolling
  predicate by the fixed signal-time low; method D with odd N excludes the middle; method B passes a flat series at a
  0% minimum (≥); the capital hook is harness-only; a raw crossing always logs first at its instant (DecisionLog.insert).
- **`make-growth-demo-phenotypes.ts`** is now pinned to the frozen 1.1.0 spec (it would otherwise write 1.2.0 records
  into the frozen 1.1.0 demo export); it regenerates the checked-in export byte-identically.
- **Data read:** VGT, GDX, XBI 2016–2023 (training, already explored) by the new tests, smoke runs and traces; the root
  suite reads whole data files as before (no embargo applies). The six chart snapshots `no-1…yes-3` were not available
  and were not used or inferred.
- **Not verified:** browsers other than Chrome; physical keyboards/screen readers beyond the automated ARIA/keyboard
  checks; a 1.2.0 run on the live server (it was not running).

## Top screen (read this first) — Task 10: Growth name, continuation entries, unified parameters, phenotypes, exports — COMPLETE

- **Updated:** 2026-11-04T23:04Z (UTC, from the clock). **Status: COMPLETE — implemented, verified, migrated live,
  committed and pushed.** **No merge to `main`.**
- **Push:** `git push origin feature/strategy-entry-explorer-ui` (fast-forward `b590c60..e212929`, no force).
  `git ls-remote` at 2026-11-04T23:04:24Z: `origin/feature/strategy-entry-explorer-ui` = `e212929359377915…` (= local),
  `origin/main` = `aa5754d…` (unchanged). This record follows as a separate commit, pushed the same way.
- **Commits** on `feature/strategy-entry-explorer-ui` (base `b590c60` = origin at the start): `aa446ae` code (engine +
  Strategy Lab + tests + fixtures), `7da4a01` docs + brief, `e212929` this checkpoint; next: the push record.
- **Deliverables (sha256, 16):** brief `9d65df0133c10c4f`; migration `0002_growth_schema_phenotypes.sql`
  `54e6036d196c2739`; OFF baseline `src/growth-trading/tests/fixtures/baseline-1.0.0.json` `43fb94c92270d363`;
  `src/growth-trading/continuation.ts` `06f2e70aae1cf0c8`; `riseTrading.ts` `4086247919783465`; `shared/params.ts`
  `2415a960c9b665bd`; `shared/strategies.ts` `d8cf0529b92bdc6e`; `runner/trading-run.ts` `b8fa6991dcc322ce`;
  `runner/pool-run.ts` `e1ec6b269c8a4170`; phenotype exports `growth-demo-2026-11/MANIFEST.json` `f558b9fa2eea6091`,
  `study8-expanded-regime-d1/MANIFEST.json` `fa4e29ff5d580f06`.
- **Verification (final):** root `npm test` 1039 / 1028 pass / 7 fail (= the 7 pre-existing, by name) / 4 skipped;
  root tsc clean; root ESLint 306 (= baseline); app `npm run check` typecheck + lint clean, Vitest 134/134,
  Playwright 43/43. Live: migration 0002 applied and audited (10.12).
- **Running processes:** the user's Strategy Lab server, restarted by me in its former `start:vpn` mode (pid 3117173,
  detached; log `apps/strategy-lab/logs/task10/live-server.log`), serving the final `dist`. Nothing else of mine.
- **Follow-up gate (the user's):** review in the UI (Growth name, continuation form, Phenotypes tab, Closed losses only,
  Compare panel, Export research bundle); optionally import the Growth demonstration phenotypes into the live catalogue
  (`npm --prefix apps/strategy-lab run import:phenotypes -- apps/strategy-lab/fixtures/phenotypes/growth-demo-2026-11`);
  any future Growth optimisation is a separate CLI study with its own protocol.
- **Brief:** `docs/strategy-lab/brief/2026-11-04-growth-continuation-phenotypes-brief.md` (verbatim copy of the upload
  `65c11597-Claude_Strategy_Lab_Growth_Continuation_Phenotypes_Implementation.md`, 229 lines, read in full; sha256
  `9d65df0133c10c4f553809a1f3fe4892d99ac75015c448fc18078a8b249991f4`). The user's message authorises the whole
  assignment "including implementation, research execution, verification, and the requested Git commit and push";
  the brief asks for a normal commit + push to THIS branch, **no merge to `main`**, no force-push.
- **Branch:** `feature/strategy-entry-explorer-ui`, HEAD at start `b590c60` (= origin), working tree clean at start.
- **Backup (before any change):** `~/backups/strategy-lab/20261104T212952Z-pre-growth-continuation/` — consistent
  SQLite copy (node:sqlite `backup()`), runs/ + imports/ rsync copies, `state-files.sha256` (79 files),
  `runs-fingerprint.json` (= the copy's fingerprint), git state files, `runner-baseline/` (uncompressed runner
  artifacts). **Restore verified** 21:31Z: restored into scratch, all 79 file hashes OK, 17/17 runs read with
  sha-verified events by the unchanged server code.
- **Live DB at start:** 17 runs (R-000001…R-000017, all `completed`, none queued/running), 17 variations, 4 strategies
  (S-0004 = `rise-from-recent-low-trading@1.0.0`, title "Rise from recent low (trading backtest)"), 19 run_symbols,
  0 notes, 3 bookmarked runs (R-000014, R-000015, R-000017), 0 bookmarked variations, 1 migration (0001, sha256
  `19336ff9…`), 0 optimisation batches; `foreign_key_check` empty, `integrity_check` ok. R-000017 is the user's own
  Growth run (user-authored title).
- **Live server (the USER's):** pid 3028672 (`npm --prefix apps/strategy-lab run start:vpn` in the user's terminal
  pts/0; parent chain 3028671 ← npm 3028660 ← 3028645), started 2026-11-04T20:27:42Z, listening 127.0.0.1:4317,
  127.0.1.1:4317, 100.68.60.114:4317, default state dir. It serves `apps/strategy-lab/dist`. systemd unit
  `strategy-lab`: not installed (not-found, inactive). Stray smoke server from an EARLIER session: pid 2772895
  (127.0.0.1:4391, scratch state of session bbd6d528) — not mine, left alone.
- **Live server STOPPED (not by me), found 2026-11-04T22:15:58Z:** pid 3028672 and its npm parents (3028671, 3028660, 3028645) are gone; nothing listens on :4317. It was running at 21:29Z. No OOM in the journal. The live DB is unchanged (audit 22:16Z: same hashes as the backup, migration 0001 only). Restarted by me at 23:01:27Z in its former mode (`start:vpn`, detached: pid 3117173, no longer attached to the user's terminal), after the final tests and a fresh backup; it applied 0002 (see 10.12). My scratch server (:5319, pid 3074208) was stopped at 23:00:55Z; the stray :4391 server of an earlier session (pid 2772895) is untouched.
- **Baselines (captured at b590c60 with the unchanged engine, before any code change):**
  - engine: `src/growth-trading/tests/fixtures/baseline-1.0.0.json` (sha256 `43fb94c92270d363…a1167693f2`), produced
    by `src/growth-trading/tools/capture-baseline.ts` (6 cases: VGT/GDX 1d defaults, VGT 1d N90 hold off, VGT 60m,
    GDX 15m buffer off, VGT 1m; engine `riseTrading.ts` sha256 `8442306b229f5668…`). VGT 1d defaults = 116 signals,
    52 trades, realized −3,270.17, minute DD 73,618.48 (= the documented example).
  - runner: `apps/strategy-lab/tests/fixtures/growth-runner-baseline-1.0.0/` (R-900001 VGT+GDX 1d 2016–2023, R-900002
    VGT 60m 2018–2020; gzip -n; `SHA256SUMS` of the uncompressed files).
- **Next step:** stage 10.3 (shared/params.ts, registry v2), then 10.5 runner/service, 10.6 migration …

## Task 10 — design decisions (written 2026-11-04T21:39Z, from the audit; no user question needed)

- **Name/version.** Display name **Growth** for key `rise-from-recent-low-trading` (stable key kept). New engine
  version **1.1.0** (continuation + decision log). 1.0.0 stays registered as LEGACY (not launchable; title Growth,
  `former_title` recorded); its replay contract = 1.1.0 with continuation OFF, proven by the baseline fixtures and a
  `replay` CLI that re-executes a stored run's request in scratch and diffs the execution facts. Signal-only strategy
  unchanged. Migration 0002 changes strategy display metadata only (title, former_title, description,
  param_schema_json → v2 form); never runs/variations columns or artifacts. Old auto-generated variation titles
  ("Trading · …") are left as they are (annotations; cannot tell auto from user-edited).
- **Unified parameter schema v2** (`shared/params.ts`): types number|integer|boolean|enum; `activeWhen` predicates
  (equals/in/all/any/not; applicability chains through referenced params); `inactive: 'disable'|'hide'`; constraints
  (`requires`, `less`); `effectiveParams` → variation identity of new strategies = canonical(effective)+`|res`
  (signal-only canonical string provably unchanged; legacy 1.0.0 keeps its all-values rule); optimisation domain
  introspection + valid candidate sampling helper (no optimiser). Request: active params required+valid; inactive
  params optional but valid if present (saved drafts).
- **Continuation (Growth 1.1.0), all modes:** qualifying exit = closed trade with book net > 0 (after per-side costs
  and interest, `ShadowBook.close`). Episode anchored at the exit session s0; eligible sessions s0+1..s0+W; expires
  after session s0+W. Evaluated only while flat with no order: EVERY taken entry decision closes the episode (base
  entry → `base_entry`, and an armed setup is cancelled). Same instant: base decision first (priority); a
  continuation predicate that would have fired then is logged `suppressed: base_priority`. One episode per symbol.
  - **classic_d1**: D1's own `EntryMachine` inside the same ShadowBook (postExit on, P, Y, W; deep arming disabled by
    NaN target); processBar per completed minute after that minute's exit/fill (N-book order); H = raw exit price,
    raised by later sessions' highs; arming (close ≤ H(1−P)) closes the window; armed setup persists (D1) until its
    Y rebound (close ≥ trailingLow(1+Y)) or a base entry (Growth adaptation: base cancels it). Minute-native at every
    run resolution.
  - **breakout** (bars of the run resolution): H = exit raw fill, raised by completed eligible bars' highs AFTER each
    is evaluated (candidate excluded); exit-session bars not used (as D1); ≥ F formation bars; trigger close >
    H(1+b) (strict); one-shot.
  - **shallow_pullback**: uptrend SMA_L(c) > SMA_L(c−M)(1+r) required at arming AND trigger; arm when
    pmin ≤ 1−close/H ≤ pmax (H frozen at arming); deeper than pmax → episode ends `pullback_too_deep`; trough = lowest
    close since arming (candidate excluded); trigger close ≥ trough(1+R); window-bounded.
  - **ma_cross**: SMA_L of completed closes (candidate included); rising SMA_L(c) > SMA_L(c−M)(1+s); cross =
    prior close ≤ SMA(c−1) and close > SMA(c)(1+m); one-shot.
  - Fills: `firstTradeAfterDecision` via `ShadowBook.commit` (next minute open; closing print only for a decision
    before the close; else next session open, carried overnight). ON runs extend warm-up for MA lookbacks; OFF runs
    load exactly the 1.0.0 warm-up.
- **Artifacts (1.1.0):** events gain origin/method/episode values (ids of base events unchanged; continuation
  signals `SYM:continuation:<t>`); new `decisions.json` (episodes + compact chronological state log, UTC + ET);
  trades.json gains origin columns; metrics gain attribution + continuation counts (descriptive);
  `minute-marks.csv.gz` (change points of the marked net) for the optional export mode.
- **Phenotypes:** migration 0002 tables `phenotype_imports`, `phenotypes` (immutable, no delete), runs.phenotype_id
  (+ recreated inputs-immutability trigger). Export contract `strategy-lab.phenotype-export` v1 + MANIFEST sha256;
  CLI importer (idempotent; schema, hashes, engine, params validated); only listed phenotypes are promoted. Execution
  kinds standalone | independent-symbol batch | shared-slot pool. Growth → trading runner; Study 8 pool → new
  allowlisted `runner/pool-run.ts` calling the UNCHANGED `runFor(resolveAlias(alias))` (start fixed 2016-01-04, end
  selectable, cost fixed 5 bps), events converted with the importer's code; parity: to 2026-10-29 = R-000013 events.
  Reruns go to experiment `phenotype-reruns`; edits = derived variation.
- **Export bundle:** deterministic ZIP (own writer, zlib deflate/crc32, fixed timestamps, sorted), `GET
  /api/runs/:id/export` + CLI; README, manifest (sha256), unmodified artifact copies, CSVs, attribution.
- **Comparison:** `GET /api/compare?a=&b=` descriptive diff with comparability checks; no execution.

## Task 10 — stage table

| Stage | Status | Notes |
| --- | --- | --- |
| 10.1 audit, backup, restore check, baselines | complete (21:38Z) | backup + restore + baselines (see top screen) |
| 10.2 design decisions written here | complete (21:39Z) | above |
| 10.3 unified parameter schema + all strategies migrated | code done (22:05Z), tests pending | `shared/contract.ts` (ParamSpec v2 types), `shared/params.ts` (new: applicability, validateParams, effectiveParams, variationIdentity, paramSnapshot, searchSpaceOf, sampleCandidate), `shared/strategies.ts` (registry: signal-only, Growth 1.1.0, legacy Growth 1.0.0, Study 8 pool, demo). UI form/panel + app tests not yet converted |
| 10.4 Growth 1.1.0 engine: continuation modes + decision log | complete (21:56Z) | `src/growth-trading/continuation.ts` (new), `riseTrading.ts` (1.1.0). Root tests: `tests/offParity.test.ts` 7/7 (6 real cases × 2 OFF forms = baseline exactly), `tests/continuation.test.ts` 29/29 (synthetic rules), `tests/riseTrading.test.ts` 24/24 (restriction guard updated: scans continuation.ts too; Simulation keys +log/continuation/markChanges), `tests/continuationRealData.test.ts` 16/16 (per-mode invariants VGT/GDX 1d, VGT 60m; classic_d1 = independent D1-order driver on 4 configs). Fixed during it: a same-instant D1 *arming* was recorded as a suppressed signal (now only would-be triggers) |
| 10.5 runner/service/registry: Growth name, 1.1.0, legacy 1.0.0 | code done (22:05Z) | `runner/trading-run.ts` (1.1.0 + legacy replay; decisions.json, minute-marks.csv.gz, origin fields), `runner/growth-params.ts` (new), `server/service.ts` (Growth profile, effective identity), `server/replay.ts` + `scripts/replay-run.ts` (new). Runner parity vs `tests/fixtures/growth-runner-baseline-1.0.0`: R-900001/R-900002 trades/daily/metrics/events identical (1.0.0 fields). **Live R-000017 replay: REPRODUCED** (read-only; output in scratch) |
| 10.6 migration 0002 (strategy display names, schema rows, phenotype tables) | verified on a backup COPY (22:15Z); live not migrated. Copy at scratch `migrate-copy/`: counts unchanged (+2 empty tables), runs/variations immutable hashes identical, titles/bookmarks/notes identical, FK [] , integrity ok, 17/17 events verified, idempotent; 0002 sha256 `54e6036d196c…`; audit tool `scripts/audit-state.ts`. Written (22:05Z), not yet applied anywhere | `server/migrations/0002_growth_schema_phenotypes.sql` generated by `scripts/generate-migration-0002.ts` (reproduces byte for byte). Next: test on a copy of the backup DB |
| 10.7 UI: form (enum + conditions), closed-losses filter, comparison, phenotypes, export button | code done (22:28Z); e2e pending | `RunTestDialog.tsx` (v2 form + phenotype mode), `Trading.tsx` (Closed losses only, origin column), `Comparison.tsx`, `Phenotypes.tsx`, `RunView.tsx` (export, compare panel, clone gating, badges), `Panels.tsx`, `App.tsx` (#/phenotypes), `api.ts`, `trades.ts` (isClosedLoss), CSS. Existing Vitest 97/97 after contract updates (trading.test.ts, real-data.test.ts) |
| 10.8 phenotype import CLI + catalogue API + single rerun | code done (22:15Z), API not yet exercised | `shared/phenotypes.ts` (export contract v1), `importers/phenotypes.ts` (CLI), `importers/phenotype-export.ts`, `importers/export-study8-phenotypes.ts`, `scripts/make-growth-demo-phenotypes.ts`, fixtures `fixtures/phenotypes/{growth-demo-2026-11,study8-expanded-regime-d1}`, `runner/pool-run.ts` (pool rerun to 2026-10-29 = R-000013 events exactly, 109, reconciled), importer conversion factored to `study8Events`, `server/service.ts` capabilityOf/createPhenotypeRun, routes in `server/http.ts` |
| 10.9 research export (ZIP) API + CLI | code done (22:15Z), untested | `server/zip.ts`, `server/export.ts`, `GET /api/runs/:id/export[?minute=1]`; comparison `server/compare.ts`, `GET /api/compare?a=&b=` |
| 10.10 tests (root, app vitest, e2e), real-data single runs per mode | complete. FINAL: root npm test 22:55:19Z→22:57:54Z 1039 / 1028 pass / 7 fail = the 7 pre-existing by name / 4 skipped; app `npm run check` 22:58:04→23:00:43Z typecheck + lint clean, Vitest 134/134, build, Playwright 43/43 (dist = final build). Before: app check-3 PASS 22:47Z (typecheck, lint, Vitest 134/134, build, Playwright 43/43). Root npm test 22:51Z: 1039 / 1025 pass / 10 fail = 7 pre-existing + 3 mine (fixed since: over-strict postExit guard broke the Study 8 exit-parity test; registry-defaults test updated) — rerun pending. Root tsc clean; root ESLint 306 (= baseline) after formatting src/growth-trading. New tests: app params 10, migration 4, export+compare 10, phenotypes 7, trades +3, growth-parity 3; e2e continuation 2, losses 2, phenotypes 2, compare 1. Fixed during e2e: Analysis panel crashed on pool-rerun metrics (cascaded into 7 failures). Earlier: running (22:28Z) | scratch API smoke (server pid on :5319, state `scratchpad/migrate-copy`): R-000018 OFF (52 trades, +9,717.54 = baseline), R-000019 classic (+23,051.12; 3 continuation trades), R-000020 breakout, R-000021 shallow, R-000022 ma_cross (0 triggers), R-000023 OFF+draft → same variation V-000018, R-000024/25 phenotype PH-0002 edited/as-is, R-000026 pool rerun = sealed (109 events, reconciled). Exports valid + deterministic; compare ON/OFF B−A +13,333.58 vs continuation trades −354.17 |
| 10.11 docs | complete (22:54Z) | new: GROWTH_CONTINUATION.md, PHENOTYPES.md, EXPORTS.md; updated: GROWTH_TRADING, GROWTH_TRADING_AUDIT (§6), CONTRACTS (schema v2), ARCHITECTURE, OPERATIONS (upgrade procedure, commands), RESEARCH_WORKFLOW (guide 9–13, phenotype export for studies), STUDY8_METHODOLOGY, docs README, app README, src/growth-trading/README, root README |
| 10.12 live migration, commit, push | complete (live migration 23:01Z; pushed 23:04Z, `b590c60..e212929`) | The user's server was already stopped (no job could be interrupted). Fresh backup `~/backups/strategy-lab/20261104T230114Z-pre-migration-0002/` (identical to the start-of-task backup; MANIFEST.md, audit-before/after.json). Started `npm --prefix apps/strategy-lab run start:vpn` detached (setsid nohup; log `apps/strategy-lab/logs/task10/live-server.log`): server pid 3117173 on 127.0.0.1, 127.0.1.1, 100.68.60.114 :4317; 0002 applied at start. After-audit: counts unchanged (+2 empty tables), runs/variations immutable hashes, titles, bookmarks (3), notes identical; FK []; integrity ok; 17/17 events verified; all 79 run/import files byte-identical; S-0004 = Growth (former title kept). Access: health 200, API 401 without / 200 with token, UI 200 on all three addresses and apollo.tail0a98ce.ts.net. Imported the sealed Study 8 phenotype into the live catalogue (PI-0001 → PH-0001 `study8-expanded-regime-d1/s8-vg-balanced`, runnable via study8-pool). NOT imported into live: the Growth demonstration export (permanent rows; the user can import it with one command) |

## Task 10 — guards

- Never delete/reseed `state/strategy-lab/`; tests and smoke servers use scratch state dirs and other ports.
- No change to D1 / Study 8 / `s8-vg-balanced` mechanics or sealed records (`src/app/*`,
  `src/shared-margin-portfolio/*`, `src/multi-etf-allocator/*`, `src/study8-*`, `research/`, `config/`).
- No optimiser, sweep or batch launch from the UI/API. One configuration per user action.
- Do not rewrite immutable run/variation columns or artifacts; display renames go through strategy display metadata.
- Every `vite build` replaces what the user's live server serves: never leave a half-finished build in `dist`.
- No merge to `main`; no force-push; do not commit `state/`, `logs/`.

## Task 10 — disclosures (for the final report)

- **The user's live server stopped during the task, not by me** (running 21:29Z; gone at 22:15Z; no OOM in the
  journal; the database unchanged). I restarted it at 23:01Z in its former mode, detached from the user's terminal.
- **Bugs found by my own tests and fixed before the end:** a same-instant D1 *arming* was recorded as a suppressed
  entry signal; an over-strict `postExit` guard in `simulateTrading` broke the Study 8 exit-parity API (2 root tests);
  the Analysis panel crashed on pool-rerun metrics (cascaded into 7 e2e failures).
- **Existing tests changed because the contract changed** (intent kept): `apps/strategy-lab/tests/trading.test.ts`
  (registry 1.1.0 + legacy 1.0.0, v2 helper names, allowlist with the pool runner, the "Growth …" title),
  `tests/real-data.test.ts` (1.1.0 request with an explicit continuation switch; new artifacts in the manifest),
  `tests/server.test.ts` and `e2e/trade-colour-fixture.ts` (`schema` instead of `params`), `e2e/helpers.ts` and
  `e2e/trades.spec.ts` (1.1.0 requests), `src/growth-trading/tests/riseTrading.test.ts` (the restriction guard now
  also scans continuation.ts and allows post-PROFIT episodes; the registry test checks 1.0.0 exactly and 1.1.0's
  continuation defaults).
- **Design choices worth stating:** a 1.1.0 API request must carry `continuationEnabled` (refused if absent); old runs
  without it are OFF. The old auto-generated variation title of V-000017 ("Trading · …") was left unchanged (titles are
  annotations). The Growth demonstration phenotypes were NOT imported into the live catalogue (catalogue rows are
  permanent). Minute marks cost ~2–5 MB per symbol-decade per Growth 1.1.0 run.
- **Data read:** the real-data tests and smoke runs read VGT/GDX 2016–2023 (training, already explored) plus the
  Study 8 replay to 2026-10-29 (already exposed); the root suite reads whole data files as before (no embargo applies).
- **Not verified:** a physical second tailnet device (only the MagicDNS name on apollo itself); browsers other than
  Chrome.

## Previous top screen — Task 5: growth-trading strategy + wheel direction — COMPLETE

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

## Task 8 — COMPLETE (2026-11-04): trade tooltips, selection and visual linking

- **Brief (user message):**
  - both markers of a trade show its net P&L ($ and %, green/red; unrealized for open positions from the run's mark;
    "unavailable" when not recorded);
  - clicking either marker selects the trade (row highlighted and scrolled into view, details beneath), for trading
    and imported multi-ETF runs, per symbol;
  - hover highlights both markers with a temporary toned connector and a summary; an off-screen counterpart is
    reported without zooming; cleared on leave;
  - pairing only via `tradeId` + `linkedEventId`; chart interactions preserved; no change to strategies, rules,
    results or artifacts.
- **Baseline:** HEAD `b8169b5` (= origin), clean tree.
- **Change:**
  - `src/trades.ts` (pure trade index, P&L sources) and `src/chart/link.ts` (placement).
  - `PriceChart.tsx`: the hover connector and highlights are drawn on the marker layer (SVG line clipped to the plot)
    and suppressed during drags.
  - `RunView.tsx`: trade-level selection; the Trades card now appears for any run with trades, including imports.
  - `Trading.tsx`: `TradeTable` built from the index, plus `TradeDetail`. `Events.tsx`: the tooltip P&L and summary,
    on the side away from the counterpart.
  - No server, runner, importer or artifact change.
- **P&L of the imported vg-balanced open GDX lot:** `metrics.trades.unrealized`, because the pool has exactly 1 open
  lot. With more than 1 open lot it is reported as unavailable (only the pool total is recorded).
- **Tests:** `tests/trades.test.ts` (9) and `e2e/trades.spec.ts` (8). The e2e creates trading runs "e2e trades VGT 2023"
  and "e2e trades VGT GDX 2023" in the temporary e2e state. Docs: ARCHITECTURE ("Trades"), RESEARCH_WORKFLOW.
- **Verification:** `npm run check` 19:36:32→19:38:32Z: typecheck + lint clean, Vitest 87/87, Playwright 32/32.
  One existing walkthrough step needed a scroll: the Trades card now sits above the event table on vg-balanced.
- **Disclosures (2026-11-04T19:38Z):**
  - **Live DB.** Since the Task 5 backup it has one addition only: the user's run R-000017 (V-000017,
    `rise-from-recent-low-trading`, hold off) and strategy row S-0004. R-000001…R-000016 and their files are
    unchanged.
  - **Running servers (not mine; not touched).**
    - pid 2966097 is the user's live `start:vpn` server (:4317 on 127.0.0.1, 127.0.1.1 and the Tailscale IP), started
      18:29Z. It serves `apps/strategy-lab/dist`, which every `vite build` / `npm run check` replaces, so it now
      serves this task's UI.
    - pid 2772895 is a stray smoke server from an EARLIER Claude session (127.0.0.1:4391, scratch state of session
      `bbd6d528…`), running since 12:14Z. Task 5's 16:04Z check missed it (wrong ports in the grep; no
      "strategy-lab" in its command line). Left running; the user is asked.

## Task 9 — COMPLETE (2026-11-04): trade marker colours

- **Brief:** `~/.claude/uploads/…/362d372b-Claude_Strategy_Lab_Trade_Marker_Colours.md` (36 lines, read in full).
  - Both markers of a trade: green net profit, red net loss, grey breakeven, by the recorded net after costs and
    interest. Open positions blue, not classified by unrealized P&L. Rejected signals purple. Raw signals distinct.
  - The same colours in the legend, hover highlights and connectors. Shapes kept. Standalone and imported runs alike.
  - No change to results or artifacts. Tests; commit + push, no merge.
- **Baseline:** HEAD `36cb82f` (= origin), clean tree.
- **Change:**
  - `src/chart/markers.ts`: `MarkerTone`, `TONE_COLOR`, `markerToneOf`, glyphs by tone; run B gets an orange halo.
  - `src/trades.ts`: `toneOf` returns `open` for open positions.
  - The chart events carry `tone`; `Glyph` takes a tone everywhere (chart, legend, table, tooltip, detail).
  - The legend has an outcome key. CSS tones apply to the highlight outline, connector, P&L text and summary border.
  - Test-only: `e2e/trade-colour-fixture.ts` seeds a synthetic run into the e2e server's TEMPORARY state. It has
    profit, loss, an exactly $0 breakeven, a loss whose exit price is above its entry, an open position, rejected
    signals and a raw signal. `e2e/helpers.ts` holds shared helpers.
- **Tests:**
  - `tests/markers.test.ts` (10) and `e2e/markers.spec.ts` (4): the fixture, the real VGT 2023 run, run-B comparison
    and vg-balanced per symbol.
  - Negative control: colouring open positions by unrealized P&L fails all 4 browser tests and 1 unit test.
- **Docs:** ARCHITECTURE ("Marker colours"), RESEARCH_WORKFLOW §4.9.
