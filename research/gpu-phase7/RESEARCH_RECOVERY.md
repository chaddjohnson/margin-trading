# RESEARCH_RECOVERY — GPU Phase 7: risk-envelope delivery, acceptance renewal and pilot readiness (INCOMPLETE)

**Top screen (update at every milestone; times from `date -u`)**

- Updated: 2026-11-21T20:19:24Z (clock). (The previous entry's "20:30Z approx." was an estimate written at ≈ 20:05Z; corrected here.)
- Status: **INCOMPLETE** — Phase A verified; Phase B code + tests done; archives restored (2, verified); edge subjects
  selected; acceptance tooling, chains, protocol (frozen `results/protocol-freeze.json`) written; commit of the integration
  in progress; the campaign `chains/final.sh` NOT yet launched.
- Brief: `research/gpu-phase7/brief/BRIEF.md` (verbatim, 633 lines, sha256 `dfc11ac0…aecbff90f2`).
- Branch `research/gpu-phase7-risk-envelope-readiness` from `cleanup/storage-2026-11-21` `d89b9dec` (= main `3606f4b3`
  + 2 docs-only cleanup commits). Main checkout `/home/chad/projects/margin-trading` (no extra worktree).
- Running processes: none.
- **PILOT NOT STARTED** and never to be started by this task (brief §12). No official optimization job may be launched.
- Next step: commit, then launch the campaign:
  `tools/gpu-phase7/launch-slice.sh p7chain-final /home/chad/projects/margin-trading/research/gpu-phase7/results/logs/final-chain.txt -- /usr/bin/env START=1 /bin/bash research/gpu-phase7/chains/final.sh`
  (resume a failed/interrupted chain with START=<step>; steps print `step <n>` in the log).

## Environment (verified 2026-11-21T19:50Z)

| Item | Value |
|---|---|
| Node / V8 | v24.21.0 / 13.6.233.17 (`.node-version` 24.21.0); every evaluating process `node --no-maglev` |
| CUDA | user-space toolkit 13.2 (V13.2.86), driver 595.91.07 |
| GPU | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, 32,607 MiB (≈ 760 MiB used by the desktop/remote-desktop) |
| Record in force | `config/gpu-backend/acceptance.json` sha256 `3610caaf…84d3` (study gpu-phase6), binary `research/gpu-phase5/build/gb5` `f444c521…`, evaluation digest `3a6eacde…` |
| Baseline verifier | `results/baseline/verify-acceptance-baseline.txt`: VERIFIED (rebuild reproducible, device, out-of-band pin) |
| Baseline integrity | `results/baseline/integrity-baseline.json`: 5/5 (Phase 6 tool) |
| Data | GDX `77dba9b2…`, VGT `2ee06310…` (= Priority 3 pins); D19/D21/D23/D24 doors = pins and canonical prefixes |

## Code changes (committed in the integration commit)

- `src/gpu-backend/pool.ts` (host group → evaluation digest → new binary): risk tasks return `{...record, envelope}`;
  envelope/request mismatch fails the batch.
- `src/gpu-backend/lab.ts` (policy group): `risk` items, `|risk` key, `checkEnvelope` on write and read.
- `src/gpu-backend/toolchain.ts` (host group): default binary `research/gpu-phase7/build/gb7`.
- `src/risk-envelope/{policy,diagnostics}.ts` + tests (14 pass).
- `.gitignore`: Phase 7 build/cache/logs.

## Guards

- Do not run an official optimization; do not run `tools/gpu-backend/official-preflight.ts` against a completed study.
- Do not decompress archives into their original paths; scratch restores only under `research/gpu-phase7/cache/restore/`.
- Never edit a running chain script; never kill background jobs to compact.

## Archives (brief §2.1)

- Restored read-only (0444) to `research/gpu-phase7/cache/restore/`: `search-C21-broad1.sqlite` (5,949,161,472 B,
  sha256 `99b5406d…` = manifest), `search-C24-broad1.sqlite` (4,763,426,816 B, `cec9aed9…` = manifest); integrity_check
  ok; rows 1,276,425 / 1,013,181 = manifest; compressed originals unchanged (sha256, size, mode, mtime).
  Record: `results/restore/restore-record.json`. Scratch use 10.71 GB. Delete the scratch copies at the end (they are
  copies; the `.zst` originals stay).
- Edge subjects: `results/risk-parity/edge-subjects-D21.json` (sha256 `6ee8d7ae…`), `-D24.json` (`0ebe2ae5…`).
