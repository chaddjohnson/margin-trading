# Research recovery checkpoint — Study 7: stability-first D1 optimization (GDX standalone, VGT control, smaller pools)

## Top screen (read this first)

All times UTC (machine clock CET = UTC+1; `ls`/`stat` show local time). Run commands from the repository root.

- **Updated:** 2026-10-31T23:51Z. **Status: INCOMPLETE — Phase A running (45 jobs, orchestrator, 12 parallel).**
- **Brief:** `brief/ASSIGNMENT.md`, sha256 `53291b3a995c1b6d78fbece693a88a9d5f9b442514e758c70d4434cc3ed0580d`
  (read in full). Authorizes implementation, execution, verification, commit and push of this branch only.
- **Authority:** `PROTOCOL.md` FROZEN 2026-10-31T23:42:49Z, sha256 `6590ecfeca3be67fe7ce3051debdcc72953593fdba68504c52330e75b2a93581`
  (`results/protocol_freeze.json` body `aa43c4f45ff9…`, file `62cfdf39…`). Amendments only in `AMENDMENTS.md`.
- **Complete:** pilot; review; freeze; **parity PASSED** (`results/parity/parity.json` body `795fc0c209a7…`, file
  `e2a0e289…`; P1–P5, N1, C1, D1, G1 all true; first attempt crashed before sealing, see `AMENDMENTS.md` E1).
- **Running process:** `scripts/run_jobs.sh scripts/jobs-phaseA.txt 12` (started 23:50:19Z; log
  `results/runlogs/orchestrator-phaseA.txt`; per-job logs `results/runlogs/phaseA-<key>-<window>.txt`, last line
  `exit 0` = done; outputs `results/phaseA/<key>-<window>.json` sealed + `-points.jsonl.gz`). Re-running the same
  command skips finished jobs; an interrupted Phase A job must be re-run (its sealed file is written only at the end).
- **Next action:** when all 45 end with `exit 0`: `npm run study7 -- phase-a-freeze`, commit (local), then launch
  `scripts/run_jobs.sh scripts/jobs-phaseB.txt 14`.
- **Phase A reading embargo:** do not read Phase A figures until `FROZEN_SELECTION.json` is sealed.

## 1. Environment

- Checkout `/home/chad/projects/margin-trading`, branch `research/study7-stability-first-d1`, created
  2026-10-31T22:58:48Z from `research/study6-b5-kre-robustness` at `418208eae1fbfc1541b269d0bed1fd3a82d8f7ee`
  (contains Study 5 and Study 6 code and sealed records; pushed as `origin/research/study6-b5-kre-robustness`).
- Node v24.21.0 (`.node-version` 24.21.0), 16 CPUs, 59 GB RAM.
- User changes present at start, never touched or committed: `config/market-events/distributions.csv`,
  `config/market-events/distributions.manifest.json` (modified), `config/market-events/raw/vanguard-20261030T184421Z/`
  and nine `._.DS_Store` files (untracked).

## 2. Baseline hashes (task start, 2026-10-31T22:59Z)

| File | sha256 (first 16) |
|---|---|
| `data/VGT/data.csv` | `624e4094a988bd01` |
| `data/XBI/data.csv` | `83b71f75a58a01c8` |
| `data/XRT/data.csv` | `c625ca57b1bf6219` |
| `data/KRE/data.csv` | `fd7ab8aa365cbb86` |
| `data/GDX/data.csv` | `134b74506f190f43` |
| `config/phenotypes/D1/{VGT,XBI,XRT,KRE,GDX}.json` | `3e77a419…`, `453c4fd0…`, `d7b7f222…`, `6b8889e2…`, `ed98c23c…` |
| `config/pools/B4.json` / `B5.json` | `4ca5aa1a900bc959` / `deef53ca53111806` |
| `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` | `0dabd97e2b3d50fe` |
| `research/portfolio-aware-d1-optimization/FROZEN_SELECTION.json` | `16c91895f485b4ce` |
| `research/study5-gdx-d1-b5-three-etf-2026-10/FROZEN_SELECTION.json` | `3837d814b29cd645` |
| `research/study6-b5-kre-robustness-2026-10/FROZEN_SELECTION.json` | `8761419813287e56` |
| `research/multi-etf-d1/FROZEN_CANDIDATES.json` | `94b0b646d7aa7520` |
| `data/partitions.json` | `43893f3d3277d680` |
| `config/market-events/splits.json` | see below |
| `config/market-events/distributions.csv` (user-modified, untouched) | `30feaa99e4740469` |

## 3. Stage table

| Stage | Status |
|---|---|
| Phase 0 inventory | complete |
| Pilot (pre-freeze, training ≤ 2021) | complete — `npm run study7 -- pilot`, 271 s |
| Protocol written / reviewed / frozen | complete — `npm run study7 -- freeze-protocol` 2026-10-31T23:42:49Z |
| Parity (P1–P5, N1, C1, D1, G1) | complete 23:50:00Z (passed) — `npm run study7 -- parity` |
| Phase A (15 configurations × WDEV/W23/W29) | running since 23:50:19Z — `npm run study7 -- phase-a <key> <window>`; then `phase-a-freeze` + commit |
| Phase B searches (16 base + 2 V diagnostic [+ 4 VC if triggered]) | not started — `npm run study7 -- search <track> <fold>` |
| Phase D validation (per track × fold) | not started — `npm run study7 -- validate <track> <fold>` |
| Selection freeze | not started — `npm run study7 -- freeze-selection` |
| Final (once) / confirm | not started — `npm run study7 -- final` / `final --confirm` |

## 4. Guards

- Never edit frozen phenotype/pool configs, other studies' records, `data/`, market events, partitions.
- Committing/pushing only this branch, only at the end (brief authorizes it); no PR, no merge.

## 5. Disclosures

(none yet)
