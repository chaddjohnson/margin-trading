# Strategy Lab — Interactive Preview

**Interactive Preview** lets you edit a saved run's parameters beside its chart and execute **one** configuration at a
time. The chart, events, trades, analysis and parameters are then replaced together with the new result. **No run,
variation, sidebar entry, note, bookmark or optimisation trial is created** unless you explicitly choose **Save as
run**. A configuration you have already previewed comes back from a persistent, validated cache instead of running
again.

It is a general Strategy Lab feature driven by the strategy registry (`shared/strategies.ts`, parameter schema v2). It
works for every strategy version that New Test can launch: today the signal-only *Rise from recent low* 1.0.0 and
**Growth** 1.2.0, including its continuation methods, entry trend filter, persistent eligibility and exits.

The design brief is `brief/2026-11-05-interactive-preview-brief.md`.

## 1. Using it

1. Open a completed saved run (for example a Growth 1.2.0 result) and click **Interactive Preview**, at the right of
   the symbol tabs. The panel opens beside the chart; it is closed by default and opening it changes nothing.
2. The panel header shows the strategy's name and its **exact internal version** (`Growth v1.2.0
   rise-from-recent-low-trading`) and a status:
   - **Showing the saved result**: nothing has been run yet.
   - **Modified**: the draft differs from what the chart shows; this status also counts invalid fields.
   - **Running**: with the runner's progress.
   - **Preview ready**: a fresh computation.
   - **Cache hit**: a validated earlier computation was reused.
   - **Preview (restored)**: shown again without being run (a reload, Back/Forward, a link) and re-checked: still what
     the current code and data would produce.
   - **Outdated: code or data changed**: shown again without being run, but the re-check found that the code or data
     changed since it was computed. The banner lists what changed; **Run preview** with the same values recomputes it.
   - **Error**: the message is shown below the status.
3. Edit the **Test window** (from/to dates and the bar resolution; the symbols are the saved run's) and the parameters.
   The panel shows labels and controls only. The **ⓘ** beside a label opens that field's full help text, the same text
   New Test shows beneath the field. The ⓘ opens on click, Enter or Space and closes on Escape, an outside click or Tab.
   Group headings have an ⓘ for the group's explanation. A value-dependent warning, such as *Maximum losing hold is
   OFF*, appears only while it applies.
4. Only the controls that apply are shown, exactly as in New Test:
   - a method's inputs appear only for the chosen continuation method, trend method or eligibility policy;
   - a dependent rule is disabled while its parent is off (switching the maximum losing hold off also switches the
     buffered loss exit off);
   - a value of a hidden or disabled field is kept in the draft and comes back when you switch back.
5. **Nothing runs while you type.** Press **Enter** in any field (a number, a date, a checkbox or a closed dropdown) or
   click **Run preview** to submit the whole configuration. Enter in an ⓘ popover or on a button does not submit.
6. **Run preview** is disabled when:
   - the draft is invalid (the reason is shown beside the field, or in the summary below the groups);
   - the draft equals the configuration the chart shows now;
   - the same configuration is already running.

   It is enabled again for any other configuration, including one you previewed earlier: that one then loads from the
   cache.
7. While a preview runs, the current chart stays on screen. When the result is ready, the page loads its chart data
   first and then replaces every view at once. There is never a blank chart or a half-swapped page.
8. The page header then shows a **TEMPORARY PREVIEW** banner with:
   - the preview's own id (`PV-…`, never the saved run's `R-…` id);
   - its strategy and version, window and resolution;
   - the source run, marked *unchanged*;
   - whether it was a cache hit or how long it took.

   The saved run's own row stays visible, labelled *Source (saved, unchanged)*.
9. **Save as run…** (banner) creates ONE new normal, immutable run from the displayed preview (§4). **Return to saved
   result** (banner) shows the saved run again; it releases a preview that is still running.
10. **Reset to displayed** (panel) puts back the values of the result the chart shows now (the preview or the saved
    run). **Reset to R-…** puts back the saved run's own values. Neither runs anything.
11. You can close the panel at any time: the displayed preview stays, and its banner keeps Save and Return available.
    On screens of 1100 px or narrower, the panel is a drawer over the page, so the chart keeps its width; Escape
    closes it.

Your presentation choices belong to the page and survive every swap:

- the marker checkboxes (*Entry signal*, *Executed entry*, *Executed exit*, *Rejected signal*);
- the symbol tab;
- the chart zoom and pan, when the new window still overlaps (otherwise the whole new window is shown);
- the Events table's scope, search and sort;
- **Closed losses only**.

A selected event or trade stays selected only when the new result contains the *same* one: the same kind, symbol,
instant and price, and for a fill both legs of the trade. It is never matched by its ordinal id (`T-7` of one run is
not `T-7` of another); otherwise the selection is cleared. Hover links, tooltips, drag-to-measure, wheel zoom, pan and
the range selector work after any number of swaps. While a preview is displayed, **Compare with (B)** is set aside,
because comparisons are between saved runs. Notes belong to saved runs: the Notes card says so and shows the source
run's notes.

### Runs that cannot be previewed

The panel opens and explains why, instead of running anything else:

- **Synthetic demo runs**: toy rules on fictional prices.
- **Imported results**, such as the Study 8 shared-slot allocator replay: Strategy Lab never re-executes an import,
  and **never substitutes a standalone single-strategy simulation for a shared-capital strategy**.
- **Shared-slot pool reruns**: one allocator replay of a sealed configuration. Rerun them from the phenotype catalogue.
- **Legacy versions** (Growth 1.0.0, 1.1.0 and, since 1.3.0, 1.2.0): kept exactly as recorded. The panel offers an
  explicit button, *Preview this configuration as Growth 1.3.0*. It starts a draft of the current version with the
  later options OFF, labelled as a NEW execution and **not a reproduction** (for 1.2.0 the note adds that 1.3.0 with
  those options OFF reproduced every 1.2.0 artifact in the parity tests). Nothing is upgraded invisibly.
- **Runs not completed**, and runs without a stored request.

When a previewable run's recorded execution differs from this checkout, the panel says so. Its engine-file hashes or
data hashes are compared with the current files, and a preview with the same parameters is then a new execution, not
a reproduction.

## 2. Semantics and isolation

- **The same execution as a saved run.** A preview runs the same allowlisted runner script with the same Node flags,
  minimal environment, timeout, engine, accounting and artifact format as a saved run (`server/jobs.ts` exports
  `NODE_FLAGS`, `runnerEnv`). There is no fast or approximate mode. `tests/preview.test.ts` checks that a preview's
  `events.json`, `trades.json`, `daily.json`, `decisions.json` and `metrics.json` are byte-identical (with the run id
  normalised) to a normal single run of the same configuration, along with the minute marks and the provenance (engine
  hashes, data hashes, warm-up, split basis).
- **One canonical configuration.** A preview executes only the **effective** parameters (`effectiveParams`: the
  values that apply). Inactive values stay in the browser's draft. Two drafts that execute the same configuration are
  therefore one preview, and an invalid disabled field never blocks a submission. The request carries exactly
  strategy key and version, effective parameters, symbols, from, to and resolution. It is validated by the same
  `validateRunRequest` as New Test, and unknown fields are refused, including `title`.
- **Ephemeral.** A preview's id is `PV-` followed by the 64-hex cache key. It writes nothing to SQLite, and nothing
  under `runs/`, `imports/` or the market data. The runner works in `preview-cache/work/<execution>/`, and only a
  verified result becomes a cache entry.
- **Lifetime.** Preview state lives per browser tab and per saved run's page; it resets when you open another run.
  The displayed preview is in the address (`#/run/R-…?preview=PV-…`), so a reload, Back/Forward or a link shows it
  again for as long as its cache entry exists. Unsaved draft edits do not survive a reload, and nothing syncs across
  devices.
- **A preview shown again is re-checked.** Showing a preview without running it (a reload, Back/Forward, a link) asks
  the server to recompute its identity from the current code and data (`GET /api/previews/PV-…?current=1`):
  - still the same: it is shown as **Preview (restored)**;
  - changed (or not establishable): it is still shown, because it is exactly the result of that earlier execution,
    but the banner marks it **Outdated** and lists the differences (for example `code
    src/growth-trading/riseTrading.ts` or `market data of VGT`). **Run preview** is then enabled with the same values:
    the current identity has a different key, so the configuration runs again with the current code and data. An
    outdated preview cannot be saved as a run (§4 re-checks too).

  A preview that this tab already holds (Back/Forward) appears at once and is flagged as soon as the check answers.
  A preview the tab has just run is not re-checked on that first display: the run itself established it.
- **Export.** In the banner's run header, **Export preview bundle** downloads the same research bundle as for a saved
  run ([EXPORTS.md](EXPORTS.md)), built from the verified cache entry. It is labelled *TEMPORARY PREVIEW* (README
  banner, `manifest.json` `preview`) and named `strategy-lab-preview-PV-….zip`.

## 3. The cache

### 3.1 Key: the execution identity (`server/preview-identity.ts`)

The key is the sha256 of the canonical JSON of the identity: objects with sorted keys, arrays in order, and numbers in
JavaScript's shortest round-trip form (`5` and `5.0` are one number). The identity contains:

| Part | Contents |
| --- | --- |
| format | `strategy-lab.preview-identity`, the cache format (`PREVIEW_CACHE_FORMAT` = 1), the event contract version |
| strategy | key, **exact version**, kind, the allowlisted runner script, sha256 of the version's stored parameter schema |
| params | the canonical effective parameters (inactive values omitted by `effectiveParams`; documented rule: a value that does not apply is not part of the execution) |
| symbols, window, resolution | symbols **in request order** (the artifacts list symbols in that order), from, to, bar resolution |
| data | sha256 of the **content** of every regular file under `data/<SYMBOL>/` per symbol (conservative: a changed report invalidates too), plus the runtime inputs `config/market-events/splits.json`, `data/partitions.json`, `config/archive/legacy-research-inputs.json` (absent = `null`) |
| implementation | sha256 over every file of the runner's **static import closure**; the Node version, platform and architecture; the runner's flags and fixed environment |

The implementation closure covers:

- relative imports;
- the package's `#lib` and `#types` subpath imports, resolved through package.json `imports`;
- every npm package the closure loads, hashed whole with its dependencies (today `csv-parse`, `fs-extra`, `graceful-fs`,
  `jsonfile` and `universalify`);
- `import type` declarations are skipped, because type stripping erases them.

Warm-up requirements, fills, costs, interest, the session calendar and corporate-action handling are functions of the
effective parameters (`costBpsPerSide`) and of the implementation, so they are covered. A code change that keeps the
advertised version still changes the key. So do uncommitted edits, cherry-picks and dependency updates: no git state
is used. The runners execute TypeScript sources directly, so there are no build outputs to fingerprint.

- **Fail closed.** If anything cannot be resolved, the preview refuses with the reason and does not run. Examples: a
  missing data file, an unresolvable import, a dynamic import of a non-literal, a missing package.
- **Proof of coverage.** `tests/preview-identity.test.ts` runs both runners under a loader and fs trace and fails if a
  run loads a module or reads a file outside the identity.
- **Cost.** Everything is re-hashed for every request, with no timestamp memo. On this machine that is about 12 ms for
  the code and 30–50 ms per symbol of data.

### 3.2 Storage and validation (`server/preview-cache.ts`)

Location: `<stateDir>/preview-cache/` (default `state/strategy-lab/preview-cache/`); override with
`STRATEGY_LAB_PREVIEW_CACHE_DIR`. The directory is refused when it is the state directory or an ancestor of it, the
repository, the market data, or anything inside `runs/`, `imports/` or `trash/`.

```text
preview-cache/
  PREVIEW_CACHE.md        marker (a directory without it is never used, pruned or cleared)
  entries/<key>/          request.json events.json metrics.json provenance.json [trades.json daily.json decisions.json
                          minute-marks.csv.gz] run.log manifest.json entry.json last-used.json
  work/<execution>/       running executions (removed at the next server start if interrupted)
  trash/                  evicted entries on their way out
```

- **Cached only after verification.** Before a result is cached:
  - the events must validate against the contract, with exactly this preview id and these symbols;
  - the runner's accounting identities must close;
  - the ledger, the metrics and the executed entries and exits must agree in count, and the realized net in amount;
  - the request the runner recorded must equal the canonical configuration;
  - the runner's recorded data sha256, partitions sha256, engine-file hashes and Node version must equal the identity's;
  - the identity, recomputed after the run, must be unchanged (no data or code edit while it ran).

  Failed, cancelled, timed-out and unverified outputs are discarded, never cached.
- **Atomic commit.** The cache writes `manifest.json` and then `entry.json` (the full identity plus every file's sha256
  and size) inside the work directory, and then renames that directory to `entries/<key>`.
- **On every hit:** the request's identity is recomputed fresh and must equal the stored identity exactly (which must
  also hash to the key). Every file must match its sha256 and size, and the events must re-validate. Anything else
  evicts the entry and runs again: a corrupt, missing or tampered file, an older format, or another identity. Every
  file served later (detail, events, export, save) is checked against `entry.json` too.
- **Retention.** Least recently used first (`last-used.json`, ties by key), down to `STRATEGY_LAB_PREVIEW_CACHE_MAX_ENTRIES`
  (default 200) and `STRATEGY_LAB_PREVIEW_CACHE_MAX_MB` (default 2048). It is applied after each commit, and the newly
  committed entry is protected. A typical Growth entry is 3–6 MB per run of two symbols over eight years of daily bars,
  mostly minute marks.
- **A code or data change deletes nothing.** It changes the keys that requests compute, so the older entries simply no
  longer match any request; they stay on disk until the limits evict them or you run `prune`/`clear` (§3.4). If the
  code and data return to exactly their earlier state, those entries match again, correctly: identical inputs.

### 3.3 Where results are kept: the server's disk, and the browser tab's memory

- **Server: disk only.** Preview results are cached only in `preview-cache/`. The server's memory holds an index of
  the entries (size and last use, for eviction), the executions currently running (to join identical requests) and
  the tickets. It holds no results.
- **Browser: per tab, for display only.** A tab keeps the chart data (events and prices) of up to 48 previews it has
  loaded and the records of up to 12, so that a swap appears at once and Back/Forward is quick. This memory is keyed by
  preview id (the identity hash, so an entry always holds exactly that execution's result) and is lost on a reload.
- **The browser never answers a Run preview from its memory.** Every Run preview (or Enter) goes to the server, which
  recomputes the identity from the current code and data and only then reuses a matching disk entry or runs the
  configuration. After a code or data change, the same values therefore get a new preview id, and nothing the tab
  remembers can stand in for it. The only use of the tab's memory without a request is showing a preview it already
  holds (Back/Forward), and that display is re-checked as described in §2.
- **Restarts.** Entries survive restarts. A preview that was running when the server stopped is lost; the browser says
  so and you run it again.

### 3.4 Maintenance

```sh
npm --prefix apps/strategy-lab run preview-cache -- status   # entries, bytes, limits
npm --prefix apps/strategy-lab run preview-cache -- verify   # re-hash every entry, evict broken ones
npm --prefix apps/strategy-lab run preview-cache -- prune    # apply the limits now
npm --prefix apps/strategy-lab run preview-cache -- clear    # remove every entry
```

The tool uses the server's configuration and touches only that directory. It is safe while the server runs: it never
touches running work, and a removed entry is simply recomputed. The cache is disposable: deleting
`state/strategy-lab/preview-cache/` loses no research record. Backups need not include it
([OPERATIONS.md](OPERATIONS.md) §Backups).

## 4. Save as run (exact behaviour)

`POST /api/previews/PV-…/save` with `{ "sourceRun": "R-…", "title"?: "…", "confirmDuplicate"?: true }`.

1. The cache entry is read and every file is verified.
2. The identity is **recomputed now** and must equal the entry's. If the code or data changed since the preview, the
   save is refused with the differences. Run the preview again, then save it.
3. If this preview was already saved, the answer is `409 Already saved as R-…` unless `confirmDuplicate` is set. The
   banner asks *Save another copy?* before sending anything.
4. One run is created like a New Test run of the same configuration:
   - experiment *Growth Entry Discovery*;
   - the same variation identity, so the same variation when one exists, with `parentVariation` = the source run's
     variation;
   - the same parameter snapshot, title and assumptions;
   - `kind: manual`;
   - the code revision recorded when the preview ran;
   - `provenance.createdBy` = *Strategy Lab Interactive Preview — Save as run*;
   - `provenance.preview` = id, key, source run, executed at, execution time, saved at, implementation and data
     hashes.
5. Its artifacts are **the preview's artifacts**, with only the run id fields rewritten (`"PV-…"` → `"R-…"`). The
   events are re-validated, `manifest.json` is written, and the run is completed. The saved events equal the preview
   events except for `runId` (checked). `request.json` is exactly the executed request; the title and parent variation
   are annotations in the database row only.
6. The run appears in the sidebar; the source run is never modified. The page keeps showing the preview and lists the
   new run under *Saved as*. It works the same for a fresh computation and for a cache hit.

## 5. Concurrency, cancellation, errors

- Previews execute one at a time (`STRATEGY_LAB_MAX_CONCURRENT_PREVIEWS`, default 1), separately from saved runs.
- Identical requests are **coalesced**: one execution, several tickets. A joined ticket is reported as `coalesced`, not
  as a cache hit; `cacheHit` is true only for a validated reuse.
- Each submission in the browser gets a monotonically increasing revision. A newer submission releases the previous
  ticket at once, and late answers of older revisions are ignored. Only the latest submitted configuration can be
  displayed, and never a mixture of results.
- The server cancels an execution nobody waits for: a queued one is dropped, a running one is killed (SIGTERM, then
  SIGKILL). A ticket not polled for 60 s is released, so a closed tab never keeps work alive.
- Network errors, a server restart (`unknown preview ticket`), invalid input (400) and runner failures show **Error**
  in the panel. The displayed result is kept, and nothing is saved or cached.
- Since Growth 1.3.0 a failed preview also says so where the results are: the panel adds *Not applied: the chart and
  Analysis still show …* (the previous successful preview, or the saved run), and a red banner above the chart says
  *Preview failed — not applied … NOT the configuration that failed; none of their figures describe it*. No figure of
  a rejected configuration is ever shown (`e2e/optional-rules.spec.ts`).

## 6. API

| Route | Purpose |
| --- | --- |
| `GET /api/runs/R-…/preview` | Capability: previewable or the reason; the seed request; a legacy run's explicit upgrade; drift |
| `POST /api/previews` `{request, sourceRun}` | ONE configuration → a ticket (`state`, `cacheHit`, `coalesced`, `progress`, `timing`) |
| `GET /api/previews/tickets/PT-…` / `POST …/cancel` | Poll / release a ticket |
| `GET /api/previews/PV-…[?current=1]` | The preview as a run-shaped record (`kind: "preview"`, `preview: {id, key, config, savedAs, …}`); `?current=1` adds `preview.current = {matches, differences}`, its identity recomputed from the current code and data |
| `GET /api/previews/PV-…/events?symbol=&basis=`, `/prices?symbol=&from=&to=&points=` | Same shapes as the run routes |
| `GET /api/previews/PV-…/export[?minute=1]` | The preview's research bundle |
| `POST /api/previews/PV-…/save` | Save as run (§4) |

`GET /api/health` lists `features: ["interactive-preview"]`. A server started before this feature answers 404 to these
routes, and the panel then says the server needs a restart. No route searches, sweeps or batches configurations
(`tests/server.test.ts`).

## 7. Tests and acceptance

| Brief §6 item | Where |
| --- | --- |
| 1 panel, size, overflow, keyboard, narrow, popovers = New Test text | `e2e/preview.spec.ts` (first two tests) |
| 2 dynamic controls (4 continuation methods, 5 trend methods, 5 policies, exit dependency, drafts kept) | `e2e/preview.spec.ts`; `tests/preview-model.test.ts` |
| 3 Enter, no per-keystroke runs, enablement rules, invalid blocks, a cached return | `e2e/preview.spec.ts`; `tests/preview-model.test.ts` |
| 4 C1 → C2 → C1: two cold, one hit, zero runs | `tests/preview.test.ts`, `e2e/preview.spec.ts` |
| 5 Save as run, fresh and cached, the source unchanged | `tests/preview.test.ts`, `e2e/preview.spec.ts` |
| 6 distinct and equal identities | `tests/preview-identity.test.ts` |
| 7 code edit (same version), data edit, tampered payload | `tests/preview-identity.test.ts`, `tests/preview.test.ts` (repository copy) |
| 8 restart, partial writes, eviction without touching runs | `tests/preview-cache.test.ts`, `tests/preview.test.ts` |
| 9 swaps keep checkboxes, zoom, filters, symbol; no misapplied selection | `e2e/preview.spec.ts`; `tests/preview-model.test.ts` |
| 10 rapid submissions, cancellation | `tests/preview.test.ts`, `e2e/preview.spec.ts` |
| 11 parity with a normal single run | `tests/preview.test.ts` |
| 12 imports, pools, demo, legacy | `tests/preview.test.ts`, `e2e/preview.spec.ts` |
| 13 existing features | the whole app suite (`npm run check`) |
| 14 a cache hit is the original execution and faster | `tests/preview.test.ts`; §8 |

Local smoke test with a scratch state, from the repository root:

```sh
STRATEGY_LAB_STATE_DIR=/tmp/lab-smoke STRATEGY_LAB_PORT=5331 npm --prefix apps/strategy-lab run serve
# in the browser: http://127.0.0.1:5331 → + New test → Growth → VGT, 2016-01-04 … 2023-12-29 → Run Test
# then on the run: Interactive Preview → Advance from recent low (X) 10 → Enter (Preview ready) → 5 → Enter
# (Preview ready) → 10 → Run preview (Cache hit) → the sidebar still has one run → Save as run… → a second run
npm --prefix apps/strategy-lab run preview-cache -- status   # with the same STRATEGY_LAB_STATE_DIR
```

## 8. Measured latency

These are real data on apollo (Node 24.21.0, one preview at a time), measured by
`apps/strategy-lab/scripts/benchmark-preview.ts`. The script measures through the HTTP API, as the browser does:
submit, poll, then the detail plus the first symbol's events and prices. See `logs/task13/benchmark.json` (git-ignored)
and the Task 13 checkpoint.

Measured 2026-11-05T17:31Z; the cold run had a fresh cache, then 5 warm repetitions:

| Request (Growth 1.2.0, real minute data) | Cold: runner | Cold: until displayed | Warm (cache hit): until displayed, median (min–max) | Identity check | Speed-up |
| --- | --- | --- | --- | --- | --- |
| VGT, 1d, 2016-01-04 → 2023-12-29, X 10 (others default) | 2.38 s | 2.52 s | 58 ms (57–60) | 35–38 ms | ×43 |
| VGT + GDX, 1d, 2016-01-04 → 2023-12-29, trend filter A + eligibility *time-limited* | 6.03 s | 6.19 s | 140 ms (137–145) | 82–84 ms | ×44 |
| VGT, 60m, 2018-01-02 → 2020-12-31, X 10 | 2.02 s | 2.09 s | 45 ms (42–47) | 34–36 ms | ×46 |

All 15 warm requests were validated cache hits that returned the cold run's preview id.

A cache hit's cost is the identity check (re-hashing the code and the symbols' data files) plus reading and verifying
the entry. It does not depend on the window length or the resolution.

## 9. Limitations

- **Symbols are the saved run's.** The panel edits the window, the resolution and the parameters, not the symbol set.
  Use New Test to try other symbols.
- **Not cross-device.** Drafts are per tab and are not kept after a reload; the displayed preview is restored from the
  address only while its cache entry exists.
- **One preview at a time** per server, by default. A queued preview waits for the running one, which a newer
  submission from the same tab cancels.
- **A restart loses a running preview.** Run it again.
- **Legacy and shared-capital runs are not previewable** (§1), by design.
- **Retention is LRU by count and bytes only.** There is no age-based expiry.
