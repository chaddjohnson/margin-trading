# Strategy Lab — operations on apollo

All commands run from the repository root (`/home/chad/projects/margin-trading`) with Node 24.21 (`.node-version`).

## Start

| Purpose | Command | Serves |
| --- | --- | --- |
| Local use on apollo (installs dependencies and builds the UI if needed) | `npm --prefix apps/strategy-lab start` | http://127.0.0.1:4317 and http://apollo:4317 **on apollo itself** (loopback only, no token) |
| VPN use, foreground | `npm --prefix apps/strategy-lab run start:vpn` | The above plus http://apollo:4317 from every machine on the tailnet (token required for the API) |
| VPN use, permanent (systemd user service) | `npm --prefix apps/strategy-lab run service:install -- --enable` | Same as `start:vpn`; restarts on failure and starts with the user session (linger is on for `chad`) |
| Development (hot reload) | `npm --prefix apps/strategy-lab run dev` | UI on http://127.0.0.1:5174 (Vite, proxies `/api`), API on 127.0.0.1:4317 |
| Import a Study 8 replay | see [§Importing vg-balanced](#importing-vg-balanced) | — |
| Import selected phenotypes | `npm --prefix apps/strategy-lab run import:phenotypes -- <export dir>` ([PHENOTYPES.md](PHENOTYPES.md)) | — |
| Export a run's research bundle | `npm --prefix apps/strategy-lab run export -- R-000042 [--minute] [--out f.zip]` ([EXPORTS.md](EXPORTS.md)) | — |
| Re-execute a stored Growth run and diff it | `npm --prefix apps/strategy-lab run replay -- R-000017` (read-only; scratch output) | — |
| Audit a state directory (before/after a migration) | `npm --prefix apps/strategy-lab run audit:state -- state/strategy-lab [--json]` (read-only) | — |

**Why two names work on apollo itself.** `/etc/hosts` maps `apollo` to 127.0.1.1 (the Debian/Ubuntu convention), not
to 127.0.0.1. Whenever the server listens on 127.0.0.1, it therefore also listens on the loopback aliases that
`/etc/hosts` gives the machine's own name. On other tailnet machines, MagicDNS resolves `apollo` to the Tailscale
address, which only `start:vpn` and the service listen on.

The service unit is generated from `apps/strategy-lab/deploy/strategy-lab.service.template` with this Node binary and
this checkout's path. Manage it with:

- `systemctl --user status|restart|stop strategy-lab`;
- `journalctl --user -u strategy-lab -f` for the logs.

After changing the UI code, rebuild with `npm --prefix apps/strategy-lab run build`, then restart. The `start` script
rebuilds automatically.

## Connecting from another computer on the tailnet

- **Address:** `http://apollo:4317` on MagicDNS, or `http://apollo.tail0a98ce.ts.net:4317`, or `http://100.68.60.114:4317`.
- **Prerequisites:**
  - both machines are logged in to the same tailnet;
  - MagicDNS is enabled, which is needed for the short name `apollo`;
  - the server was started with `start:vpn` or as the service (plain `start` is loopback only).
- **Access token.** On first non-loopback start, a random API token is created in `state/strategy-lab/api-token` (mode
  0600).
  - Show where it is with `npm --prefix apps/strategy-lab run token`.
  - Print it on apollo with `npm --prefix apps/strategy-lab run token -- --print`.
  - The browser asks for it once and keeps it in that browser's localStorage. The server remains the authority.
- **On apollo itself,** both http://127.0.0.1:4317 and http://apollo:4317 work: `apollo` resolves to 127.0.1.1
  locally, which the server also listens on. In VPN mode the token is required there too.

**Verified on apollo, 2026-11-04**, with a temporary instance started by `start:vpn`:

| Address | Result |
| --- | --- |
| 127.0.0.1, `apollo` (127.0.1.1), 100.68.60.114, `apollo.tail0a98ce.ts.net` | health 200; API 401 without the token, 200 with it; UI 200 |
| LAN address 192.168.18.14 | connection refused |
| Listening sockets | exactly 127.0.0.1:4317, 127.0.1.1:4317 and 100.68.60.114:4317 |

With plain `start`, http://apollo:4317 on apollo itself served the UI and the API without a token (loopback only).

Not verified: access from a *second* tailnet device. `apollo-windows` was offline. To check from a laptop or phone on
the tailnet, open `http://apollo:4317`, enter the token, and confirm the run list loads.

## Configuration (environment variables; no secrets in the repository)

| Variable | Default | Meaning |
| --- | --- | --- |
| `STRATEGY_LAB_HOSTS` | `127.0.0.1` | Comma-separated bind addresses. `tailscale` = the `tailscale0` IPv4 address. 0.0.0.0 and :: are refused |
| `STRATEGY_LAB_PORT` | `4317` | Port |
| `STRATEGY_LAB_STATE_DIR` | `state/strategy-lab` | Database, run artifacts, imports, token |
| `STRATEGY_LAB_DB` | `<state>/strategy-lab.sqlite` | Database file |
| `STRATEGY_LAB_TOKEN` / `STRATEGY_LAB_TOKEN_FILE` | `<state>/api-token` | API token (required whenever a bound host is not loopback; generated if missing) |
| `STRATEGY_LAB_ALLOWED_CIDRS` | `127.0.0.0/8, ::1/128, 100.64.0.0/10, fd7a:115c:a1e0::/48` | Client addresses allowed (loopback and Tailscale) |
| `STRATEGY_LAB_ALLOWED_HOSTS` | — | Extra Host-header names (localhost, 127.0.0.1, apollo, the bound IPs and `*.ts.net` are always allowed) |
| `STRATEGY_LAB_MAX_CONCURRENT_RUNS` | `1` (max 2) | Manual runs executing at once; others wait queued |
| `STRATEGY_LAB_RUN_TIMEOUT_SECONDS` | `1800` | A run is failed after this |
| `STRATEGY_LAB_STATIC_DIR` | `apps/strategy-lab/dist` | The built UI; empty = API only |
| `STRATEGY_LAB_SEED_DEMO` | `1` | Seed the synthetic demo experiment into an empty database |
| `STRATEGY_LAB_PREVIEW_CACHE_DIR` | `<state>/preview-cache` | The Interactive Preview cache (disposable; never the state directory itself, `runs/`, `imports/` or the data) — [INTERACTIVE_PREVIEW.md](INTERACTIVE_PREVIEW.md) §3 |
| `STRATEGY_LAB_PREVIEW_CACHE_MAX_ENTRIES` | `200` | Cached previews kept (least recently used evicted first) |
| `STRATEGY_LAB_PREVIEW_CACHE_MAX_MB` | `2048` | Their total size |
| `STRATEGY_LAB_MAX_CONCURRENT_PREVIEWS` | `1` (max 2) | Preview executions at once (separate from saved runs) |

The service reads extra settings from `~/.config/strategy-lab/env` (outside the repository).

## Security model

- **Network exposure.** The service listens only on loopback and the Tailscale interface. It refuses to bind every
  interface, so it is never on the LAN or the public Internet.
- **Admission, before routing:**
  - client address in the allowlist (403 otherwise);
  - Host header in the allowlist (421 otherwise; prevents DNS rebinding);
  - when a token is configured, `Authorization: Bearer <token>` on every `/api` request except `/api/health` (401
    otherwise; compared in constant time).
- **No cookies,** so cross-site requests cannot act as you (no CSRF). **No CORS headers.** The UI is served with a
  strict Content-Security-Policy (`default-src 'self'`), `X-Frame-Options: DENY` and `nosniff`.
- **Work launched from the browser:**
  - only `POST /api/runs`, with exactly one validated configuration;
  - the runner is started with an allowlisted executable and a fixed argument vector (no shell, no user text on the
    command line, a minimal environment);
  - bounded concurrency and a timeout.
- **No optimisation, sweep or batch-launch endpoint exists.** The tests assert this.
- **SQLite is only written server-side.** WAL mode; one writer process. The importer CLI uses the busy timeout when
  the service is running.

## Backups and recovery

Everything stateful lives in `state/strategy-lab/` (git-ignored):

- `strategy-lab.sqlite` (with `-wal` and `-shm` while running);
- `runs/`;
- `imports/`;
- `api-token`;
- `preview-cache/` — **disposable**: temporary Interactive Preview results, rebuilt on demand. Backups need not include
  it; deleting it loses no research record ([INTERACTIVE_PREVIEW.md](INTERACTIVE_PREVIEW.md) §3.4 for `status`,
  `verify`, `prune`, `clear`).

To back up while the service runs, take a consistent online copy of the database and copy the files:

```sh
mkdir -p ~/backups/strategy-lab
sqlite3 state/strategy-lab/strategy-lab.sqlite ".backup '$HOME/backups/strategy-lab/strategy-lab-$(date -u +%Y%m%dT%H%M%SZ).sqlite'"
rsync -a state/strategy-lab/runs state/strategy-lab/imports ~/backups/strategy-lab/
```

Without the sqlite3 CLI, stop the service and copy `state/strategy-lab/` whole.

To restore, stop the service, put the database and `runs/` back, and start the service. Migrations are applied on
start, and an altered migration file is refused.

If an `events.json` no longer matches its recorded sha256, the API reports an error instead of serving altered data.
Restore that run directory from a backup.

Runs interrupted by a crash or a stop are marked `failed` with the reason on the next start. Start them again from
the UI; this creates a new run.

## Deleting a saved result

A run (`R-xxxxxx`) can be deleted from its header: **⋯ → Delete result…** opens a confirmation with the run id,
strategy, symbols, run date and a permanence warning. **Cancel** has the focus and is the default (Enter, Escape and ✕
cancel); only **Delete result** (destructive, never the default) deletes. The API is `DELETE /api/runs/R-xxxxxx` with
the body `{"confirm": "R-xxxxxx"}` (the id repeated; any other body is refused). There is no bulk or wildcard
deletion, and no ids are renumbered.

- **Deleted:** the run row (its results, metrics, request, provenance, title and bookmark), its symbol rows, the notes
  attached to that run, and its artifact directory `runs/R-xxxxxx` (events, metrics, trades, daily marks, decision
  log, minute marks, logs, request).
- **Kept:** the variation (a shared, immutable configuration — also when no run is left — with its own notes and
  bookmark), the strategy and experiment, phenotypes and their imports, optimisation history, the Study 8 sources under
  `imports/`, market data, every other run. A minimal tombstone (`run_deletions`: id, strategy, variation, symbols,
  window, status, dates, counts — no results, title or note text) keeps the deletion auditable and the id unused.
- **Refused:** an unknown or already deleted id (404); a queued or running run (409: cancel it and let it stop); a
  run referenced by an imported optimisation trial (409: that history is kept); a run recording an artifact directory
  other than `runs/R-xxxxxx` (409: nothing outside it is ever removed); a second deletion of the same run while one is
  in progress (409).
- **Consistency** (`server/delete-run.ts`): the artifact directory is moved to `state/strategy-lab/trash/` (one
  atomic rename), then ONE transaction removes the rows. If the transaction fails, the directory is moved back and the
  error says that nothing changed. If even the move back fails, the error says where the directory is, and the next
  server start restores it (the run still exists). After the commit the trash copy is removed. If that fails, the run
  is deleted and the success message says that its files are still in the trash; the next start purges them. The UI
  reports success only from the server's completed response.
- **After a deletion** the lists refresh; if the deleted run was open, the most recent remaining run opens; a
  comparison with it is dropped. Deleted demo runs are not reseeded at the next start.
- **Limitations:** a deletion cannot be undone except by restoring a backup (§Backups); notes on other runs or
  variations that mention the id in their text keep that text; research bundles already downloaded are not
  affected; deleting a Study 8 import run allows importing the same output again (a new id).

## Upgrading: migrations and the server restart

A new migration is applied when the server starts (`openDb` → `migrate`, one transaction per migration; an edited
applied migration refuses to start). Procedure, as used for migration 0002 on 2026-11-04:

1. Check that no run is `queued` or `running` (`GET /api/runs`, or `audit:state`), so stopping interrupts nothing.
2. Back up (§Backups) and audit: `npm --prefix apps/strategy-lab run audit:state -- state/strategy-lab --json > before.json`.
3. Rehearse on a copy: copy the backup into a scratch state directory and start a scratch server on another port with
   `STRATEGY_LAB_STATE_DIR` (or open it with `openDb`); audit it and compare with `before.json` — run and variation
   immutable hashes, titles, bookmarks, notes, counts, foreign keys, integrity, event hashes.
4. Stop the server, start it again the way it ran before (for example `start:vpn`), then audit the live directory the
   same way.

Migration **0003** (2026-11-05, run deletion: a tombstone table and a guarded delete trigger) changes no existing
row; it applies at the next start. Growth 1.2.0 (2026-11-05: entry trend filter, persistent eligibility, strategy
select) added **no migration**. Strategy
rows are created per version on first use, and no stored run, variation or artifact changes. A running server serves
the new build after a restart; `audit:state` before and after shows unchanged rows and files.

Growth 1.3.0 (2026-11-05, Task 14: the trend-breakout entry, the initial risk stop, trend retention) added **no
migration**: the 1.3.0 strategy row is created on first use; 1.2.0 becomes a legacy version (its runs, variations and
stored schema unchanged; byte-identical, `tests/optional-rules.test.ts`). Until a running server is restarted it keeps
its in-memory 1.2.0 registry (New Test offers 1.2.0), and its runs execute through the new runner, which reproduces
1.2.0 exactly with the three options OFF; after the restart New Test offers 1.3.0 and 1.2.0 runs are previewed through
the explicit *Preview as Growth 1.3.0* button. Old preview-cache entries never match the new implementation
fingerprint and are recomputed on demand (then evicted by the LRU).

Interactive Preview (2026-11-05, Task 13) added **no migration** either: previews never touch the database. The first
start with the new code creates `<state>/preview-cache/`. Until a running server is restarted, the new UI's
*Interactive Preview* panel reports that the server does not offer it yet (its routes answer 404); everything else
works as before.

## Importing vg-balanced

```sh
# 1. Reproduce the Study 8 #2 run with the existing runner (≈7 s; reconciles trade by trade with the sealed record):
npm run study8-run -- run s8-vg-balanced --end 2026-10-29 --out state/strategy-lab/imports/study8/$(date -u +%Y%m%dT%H%M%SZ)-s8-vg-balanced --quiet
# 2. Import it (refuses unless every verification passes; refuses duplicates):
npm --prefix apps/strategy-lab run import:study8 -- state/strategy-lab/imports/study8/<that directory>
```

[RESEARCH_WORKFLOW.md](RESEARCH_WORKFLOW.md) §3 describes the source and verification.

## Tests

From `apps/strategy-lab/`:

- `npm run check` runs typecheck, lint, Vitest and the Playwright acceptance suite.
- `npm test` runs Vitest only. Its real-data cases are skipped without `data/`.
- `npm run test:e2e` builds, then runs the browser tests against a fresh temporary state on port 5299, using the
  system Chrome.
- `node --experimental-transform-types apps/strategy-lab/scripts/benchmark-preview.ts [out.json]` (from the repository
  root) measures Interactive Preview cold and warm latency on real data in a temporary state.

The strategy's own tests are part of the root `npm test` (`src/entry-signals/tests/`).

## Limitations and known gaps

- **Runnable strategies.** `rise-from-recent-low` (signal-only) and **Growth** (`rise-from-recent-low-trading@1.2.0`)
  run from the New Test form. Growth 1.1.0 is legacy: its catalogue phenotypes rerun as 1.1.0 configurations, and its
  runs replay. Growth 1.0.0 is legacy too: it replays, but is not launchable. The Study 8 shared-slot pool runs
  only as a catalogue phenotype rerun (end date selectable, start fixed at 2016-01-04, sealed configuration and costs).
  Imported and demo strategies are otherwise read-only.
- **Phenotype catalogue.** Only CLI imports fill it. The repository ships two Growth *demonstration* exports (not
  optimisations): `growth-demo-2026-11` (1.1.0, continuation) and `growth-gates-demo-2026-11` (1.2.0, entry gates ON).
  It also ships the sealed Study 8 `s8-vg-balanced` export. No Growth optimisation study exists yet.
- **Entry gates.** The capital hook of persistent eligibility (`blocked_by_capital`) is exercised only by the test
  harness; standalone Growth always has its own capital. No shared-capital allocator uses Growth yet.
- **Minute marks** (`minute-marks.csv.gz`, Growth 1.1.0 and later runs only) are about 2–5 MB per symbol-decade compressed; the
  export includes them only on request. Earlier runs have none.
- **Exits.** The signal-only strategy has no exits: its events are entry signals, and its analysis is forward moves,
  not P&L. Its trading backtest (`rise-from-recent-low-trading`) has the D1 exits and full P&L. Its multi-symbol runs
  are independent standalone backtests, never a shared-capital pool ([GROWTH_TRADING.md](GROWTH_TRADING.md)).
- **Wheel direction.** A two-finger swipe up zooms in (`deltaY > 0`). Browsers cannot tell a mouse wheel from a
  trackpad, so a classic mouse wheel zooms in when rolled toward you. Verified with automated browser events and a
  negative control, not on physical devices.
- **Interactive Preview** ([INTERACTIVE_PREVIEW.md](INTERACTIVE_PREVIEW.md) §9): the symbols are the saved run's; drafts
  are per tab; one preview executes at a time; a restart loses a running preview; legacy and shared-capital runs are not
  previewable by design.
- **Optimisation batches.** The schema exists, but no batch is imported yet and there is no import CLI for one yet.
- **Chart observations.** A saved chart observation (symbol, run, window, note) is not implemented. Use run and
  variation notes, and record the window in the note.
- **Intraday signals.** The forward outcomes of intraday signals start at the next session; the rest of the signal's
  session is not included.
- **Calendar.** The shared NYSE calendar (`src/lib/calendar.ts`) ends on 2026-12-31. Runs past it fail with a clear
  error until it is extended.
- **First load.** The first chart of a symbol loads its whole minute file into memory, which takes a few seconds for
  the largest files. It is cached afterwards.
- **Dense charts.** At full zoom, neighbouring markers overlap. The tooltip lists every marker under the pointer;
  zoom in to separate them.
