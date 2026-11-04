# Work recovery checkpoint — Strategy Lab (real-data workbench on the UI feature branch)

## Top screen (read this first) — Task 10: Growth name, continuation entries, unified parameters, phenotypes, exports — COMPLETE

- **Updated:** 2026-11-04T23:03Z (UTC, from the clock). **Status: COMPLETE — implemented, verified, migrated live,
  committed; push follows (fast-forward, no force).** **No merge to `main`.**
- **Commits** on `feature/strategy-entry-explorer-ui` (base `b590c60` = origin at the start): `aa446ae` code (engine +
  Strategy Lab + tests + fixtures), `7da4a01` docs + brief, then this checkpoint; then the push record.
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
| 10.12 live migration, commit, push | live migration complete (23:01Z); commit/push next | The user's server was already stopped (no job could be interrupted). Fresh backup `~/backups/strategy-lab/20261104T230114Z-pre-migration-0002/` (identical to the start-of-task backup; MANIFEST.md, audit-before/after.json). Started `npm --prefix apps/strategy-lab run start:vpn` detached (setsid nohup; log `apps/strategy-lab/logs/task10/live-server.log`): server pid 3117173 on 127.0.0.1, 127.0.1.1, 100.68.60.114 :4317; 0002 applied at start. After-audit: counts unchanged (+2 empty tables), runs/variations immutable hashes, titles, bookmarks (3), notes identical; FK []; integrity ok; 17/17 events verified; all 79 run/import files byte-identical; S-0004 = Growth (former title kept). Access: health 200, API 401 without / 200 with token, UI 200 on all three addresses and apollo.tail0a98ce.ts.net. Imported the sealed Study 8 phenotype into the live catalogue (PI-0001 → PH-0001 `study8-expanded-regime-d1/s8-vg-balanced`, runnable via study8-pool). NOT imported into live: the Growth demonstration export (permanent rows; the user can import it with one command) |

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
