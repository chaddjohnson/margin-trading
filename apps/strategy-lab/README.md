# Strategy Lab

The margin-trading repository's strategy research workbench: a Node server (SQLite, run executor, price service) and a
React + Dygraphs UI. Full documentation is in [docs/strategy-lab/](../../docs/strategy-lab/README.md).

```sh
npm --prefix apps/strategy-lab start      # from the repository root: installs, builds if needed, serves http://127.0.0.1:4317
```

- **Use:** [docs/strategy-lab/RESEARCH_WORKFLOW.md](../../docs/strategy-lab/RESEARCH_WORKFLOW.md) §4
- **apollo, VPN, service, backups:** [docs/strategy-lab/OPERATIONS.md](../../docs/strategy-lab/OPERATIONS.md)
- **Design:** [ARCHITECTURE.md](../../docs/strategy-lab/ARCHITECTURE.md)
- **Data contracts:** [CONTRACTS.md](../../docs/strategy-lab/CONTRACTS.md)

## Layout

| Path | What |
| --- | --- |
| `server/` | `main.ts` (entry), `config.ts`, `security.ts`, `db.ts` + `migrations/`, `repo.ts` (all SQL), `service.ts` (manual runs), `jobs.ts` (bounded child-process execution), `prices.ts` (chart prices, decimation), `artifacts.ts` (atomic files), `http.ts` (API + static UI), `seed-demo.ts` |
| `runner/entry-signal-run.ts` | The child process of one manual signal-only run (dataset pipeline + `src/entry-signals/`) |
| `runner/trading-run.ts` | The child process of one Growth backtest (`src/growth-trading/`: the same signals, optional continuation entries, the Study 8 D1 book and exits); `runner/growth-params.ts` maps a request to the engine |
| `runner/pool-run.ts` | The child process of one shared-slot pool phenotype rerun (the unchanged Study 8 runner) |
| `importers/study8.ts` | Read-only import of a Study 8 runner output (verified against the sealed record); its event conversion is shared with the pool runner |
| `importers/phenotypes.ts`, `phenotype-export.ts`, `export-study8-phenotypes.ts` | The phenotype catalogue import (verified), the export writer, the Study 8 sealed-selection exporter |
| `server/export.ts`, `zip.ts`, `compare.ts`, `replay.ts` | Research bundles, the deterministic ZIP writer, run comparisons, stored-run replays |
| `shared/` | Contract v2, parameter schema v2 (`params.ts`), strategy registry and validation, phenotype export contract, artifact shapes, event validation; the demo fixture's generator and v1 schema |
| `fixtures/phenotypes/` | The Growth demonstration and Study 8 `s8-vg-balanced` phenotype exports |
| `scripts/` | Service install, token, fixture generator, `generate-migration-0002.ts`, `audit-state.ts`, `replay-run.ts`, `export-run.ts`, `make-growth-demo-phenotypes.ts` |
| `src/` | UI: `App.tsx`, `components/` (sidebar, run view, panels, events, dialogs, notes), `chart/` (Dygraphs chart, marker overlay, Eastern ticker) |
| `tests/`, `e2e/` | Vitest (server, contracts, strategy integration, real-data runs and import), Playwright acceptance (system Chrome) |
| `deploy/` | systemd user service template (`npm run service:install`) |
| `fixtures/demo-dataset.v1.json` | The synthetic demo (seeded as the "Demo (synthetic data)" experiment) |

## Scripts (`npm --prefix apps/strategy-lab run <script>`)

| Script | Purpose |
| --- | --- |
| `start` / `serve` | Production: install, build if stale, serve on loopback (127.0.0.1 and `apollo` on apollo itself) / serve only |
| `start:vpn` | As `start`, plus the Tailscale address: `http://apollo:4317` from the tailnet (token required) |
| `dev` | API on 4317 plus Vite with hot reload on 5174 |
| `build`, `typecheck`, `lint` | Typecheck (client, server, e2e) and Vite build; ESLint |
| `test`, `test:e2e`, `check` | Vitest; build + Playwright; all of them |
| `import:study8 -- <dir>` | Import a Study 8 runner output |
| `import:phenotypes -- <dir>` | Import the selected phenotypes of a `strategy-lab.phenotype-export` |
| `export -- R-… [--minute] [--out f]` | Write a run's research bundle |
| `replay -- R-…` | Re-execute a stored Growth run in scratch and diff its execution facts |
| `audit:state -- <state dir> [--json]` | Read-only audit (counts, immutable hashes, FKs, integrity, events) |
| `service:install [-- --enable]` | Write (and optionally enable) the systemd user service |
| `token [-- --print]` | Where the API token is (or print it) |
| `generate:fixture [-- --check]` | Regenerate or verify the demo fixture |

Historical: this app began on 2026-11-03 as the *Strategy Entry Explorer* (synthetic demo only); see
`WORK_RECOVERY-2026-11-03-entry-explorer.md` and `docs/research/growth-entry-discovery/ENTRY_EXPLORER.md` (the demo
dataset contract v1, still used by the demo seed).
