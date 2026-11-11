# RESEARCH_RECOVERY — Priority 7A: bounded Growth suitability screening across other ETFs

## Top screen

- **Updated:** 2026-11-11T21:50Z (UTC, from the clock). **Status: INCOMPLETE** — stage S4 (the study chain is running).
- **Chain milestones:** C19 screens 21:15:53Z→21:29:12Z; C19 selection (primary SMH#1) committed `5f115f1e`; C19 fold
  evaluation sealed 21:30:25Z; C21 screens →21:49Z; C21 selection (primary XLK#1) committed `52504dbd`; C21 fold eval
  running at 21:49Z.
- **Authority:** brief `brief/BRIEF.md` (`c86c1a76…7b01`); standard 2.0.0 (`2005a88c…0105`); **PROTOCOL.md FROZEN**
  (sha256 `70bda053f5a4…`, `results/protocol-freeze.json`, committed `10aad620` at 21:15:44Z; code closure 249 files,
  digest `0be33ab394a5…`); amendments R1–R4 (pre-freeze), none after. Preflight PASS.
- **Complete (sealed):** universe + R1 (60 eligible), DOORS.json, TRANSFER_MANIFEST.json, parity.json (730/0), pilot
  (`results/pilot/PILOT.md`), protocol freeze. Ledger before the study: 59,751 fresh simulations.
- **Running:** systemd unit **`getf-chain`** (outside the slice; started 2026-11-11T21:15:52Z; `W=8 K=2`;
  `research/growth-etf-screening/chains/study.sh`; log `results/logs/study-chain.log`). It launches, one at a time inside
  `getf.slice`: `getf-screen-C19` → `getf-select-C19` → commit → `getf-eval-C19` → … C21, C23 → `getf-sequential` →
  `getf-screen-C24` → `getf-transfer` → `getf-final-select` → `getf-diagnostics` → `getf-freeze-selection`. Each unit
  logs to `results/logs/<unit>.log`. Finished cleanly when the chain log ends with `CHAIN DONE`; a failure ends with
  `CHAIN STOPPED …`.
- **Resume:** if the chain stops or the session is lost: check `systemctl --user status getf-chain` and the units
  (`systemctl --user list-units 'getf-*'`); never start a second chain while one is active. Rerunning the same
  `systemd-run … study.sh` command (RUN_COMMANDS.md) resumes at the first unfinished step (sealed steps skipped;
  completed ETF jobs skipped; an interrupted ETF job resumes from its archive).
- **Next (by hand after CHAIN DONE):** `npm run getf -- verify`; commit `FROZEN_SELECTION.json` and results; then
  `npm run getf -- launch --unit getf-validate --wait -- validate --workers 8` (FULL, once); tables; REPORT.md; roadmap;
  final checkpoint; commit; push.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `research/growth-etf-screening` created from `6f0ccce2`
  (Priority 6 pushed end; contains standard 2.0.0 and every reused runner). No extra worktree (user preference).
- Node v24.21.0 (`.node-version`). Host: 16 threads (Ryzen 7 9800X3D), 59 GiB RAM, swap full (vLLM, outside).
- The user's Strategy Lab server runs from this checkout (`npm run start:vpn`, server cwd `apps/strategy-lab`, started
  ≈ 20:16Z). Nothing under `apps/strategy-lab/` or `state/strategy-lab/` is touched; the branch switch changed no file.
- `npm test` (whole suite) reads post-2024 data: run only this study's synthetic tests before validation opens.

## Decisions so far (in conversation, to be written into PROTOCOL.md)

- Universe rules: reuse Study 9 S0's D1–D5 (`research/study9-etf-pool-discovery/DATA_AND_UNIVERSE_AUDIT.md`) re-checked on
  today's files: expected 61 eligible (GDXJ/OIH start 2016-05-02, XLRE misses 2 sessions → untested list).
- Engine: Priority 3's pooled engine unchanged (4A's path) with only the Growth slot enabled, the ETF's door in the slot;
  prefix doors per ETF with forward split adjustment (the explicit-file loader does not split-adjust; 11 ETFs split
  inside development). Parity vs canonical `runRiseTrading` + `summarizeSimulation` on every ETF.
- Search per ETF per cutoff: 1,024 proposals, two paired seeds × two protected cells; hard ceiling 2,000,000 fresh
  simulations in all.
