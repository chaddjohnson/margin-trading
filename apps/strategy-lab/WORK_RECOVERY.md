# Work recovery checkpoint — Strategy Lab (real-data workbench on the UI feature branch)

## Top screen (read this first)

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
