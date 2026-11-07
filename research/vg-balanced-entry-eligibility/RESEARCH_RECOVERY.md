# RESEARCH_RECOVERY — vg-balanced-entry-eligibility (Priority 1: bounded D1 entry eligibility for VG #2 Balanced)

## Top screen

- **Updated:** 2026-11-07T23:19Z (UTC, from `date -u`)
- **Status:** INCOMPLETE — S0–S4 complete (protocol FROZEN); S5 pilot next
- **Current stage:** S5 pilot (pilot- jobs on D24: containment, memory, interruption/resume)
- **Authority:** `brief/BRIEF.md` (sha256 `55718a6892d07fb1cc95309eff6c843f82d1619da51385ee7dc2e1ed168a76eb`); `PROTOCOL.md`
  FROZEN 2026-11-07T23:19:00Z, sha256 `9636fc1f2ffef03aa579c68a4be6671345de04e3f837f41a28046470736213b4`
  (`results/protocol-freeze.json` sha256 `0532f2a67254138eb00e3d57957dfe24b8ac48e5edb2802a7aa7e6a07b505075`, read-only;
  evaluation code digest `03bbcafa02e12b683c9c4cf218e3bd50f7d5f916d0f95aa74c923d303b434bce`). Amendment head: R3
  (pre-freeze); no E* entries yet.
- **Complete:** S0, S1 (control reproduced, reconciles to Study 8 trade by trade), S2 (OFF parity exact on D19/D21/D23/D24/FULL,
  rerun after R2/R3 through both paths; runner files byte-identical), S3 (Phase A), S4 (freeze). **Not complete:** S5–S12.
- **Running processes:** none.
- **Next command:** pilot jobs (see RUN_COMMANDS.md §S5) inside capped units; then `search C19|C21|C23|C24`.

## Environment

- Working directory: `/home/chad/projects/margin-trading` (main checkout, no extra worktree).
- Branch `research/vg-balanced-entry-eligibility`, created from `research/growth140-vgt-stable` at `b3689d9`
  (`main` is an ancestor). Working tree clean at creation.
- Node v24.21.0 (`.node-version`); absolute binary `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Host at start: 59 GiB RAM total, 53 GiB available, swap 7/7 GiB used, 16 CPUs.
- Heavy jobs: transient systemd user units with `MemoryHigh=44G MemoryMax=48G MemorySwapMax=0` (user-approved).

## Baseline hashes (must not change)

| File | sha256 |
|---|---|
| data/VGT/data.csv | 2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e |
| data/GDX/data.csv | 77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049 |
| data/partitions.json | 43893f3d3277d6804775a82e8975644fae6ffcdff30574b9ffc000212c0fefa6 |
| config/market-events/splits.json | e5bde427182fea627e38aba69c14ae16cf8b7e428e75bf4153e55db1d1cb5ba2 |
| config/market-events/distributions.csv | 30feaa99e47404696e162e25df72833de49cedb28481ff059750e024c50e41a6 |
| config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json | 27cbadf96b98f5b425e3cc12b2a278d37e320527deb9fff46091383ed506c0da |
| config/research-phenotypes/study8-expanded-regime-d1/D1/VGT.json | aeea8d93e5e2e0b145c5016d8c32880c81419bf3bd066721a6a84eadd5d9a4a2 |
| config/research-phenotypes/study8-expanded-regime-d1/D1/GDX.json | 585643cc78ec6658fc43df0b9945c5159b62fc1b821f5fb6ff47cc0ca3430055 |
| research/study8-expanded-regime-d1/FROZEN_SELECTION.json | 88d079d15f00553949e23dbd16ea1b5d26c067722da7804a1549400577fa0d2f |
| src/portfolio-aware-d1/nbook/engine.ts (control engine) | 9b346011e333a062c314b2e3a85f9455ee22620a31e7b922a9cbe81d6f001827 |
| src/multi-etf-allocator/shadow.ts | d37332e9a7d47dc8b57b061fb228380cf8c3fa660ed802b4d6413a6c7835bb24 |
| src/shared-margin-portfolio/strategy.ts | 0407559247569b2f471f8887faa9232502574fb28a34e3f435026fc3f0df7093 |
| src/multi-etf-allocator/ledger.ts | 7a41e2748e94a1dd0b3fb5399e73c84cf8f63bb4c1e542329740781ef68c9115 |

Both data files end 2026-10-30 (latest common complete session per the Study 8 runner on 2026-11-07).

## Stage table

| Stage | Status | Notes |
|---|---|---|
| S0 setup (branch, brief copy, checkpoint) | complete | 2026-11-07T22:49Z |
| S1 control reproduction (existing runner) | complete | `src/study8-runners/main.ts run s8-vg-balanced --end {2024-12-31,2026-10-30,2026-10-29} --quiet` in units `vgbe-s1-control-*` (cwd repo root); outputs copied to `results/control/runner-*` (SHA256SUMS there). Dev net $260,223.13, minute DD $17,280.74, 36 lots; full net $334,911.93, DD $21,303.61, 48 lots; 2026-10-29 reconciliation PASS (48 lots, 0 mismatches). Rerun-safe (read only). |
| S2 OFF parity (new engine vs control) | complete | `vg-eligibility -- build-doors` (pins `results/doors-pins.json` sha256 46136dd4…), `-- parity` (`results/parity/off-parity.json` 7ff27958…: exact on all 5 doors, cash to the cent), `-- runner-parity` (`results/parity/runner-format-parity.json` 5bced89a…: 7 runner files byte-identical, dev and full). Deterministic; rerun-safe. |
| S3 Phase A audit (development only) | complete | `vg-eligibility -- audit` (unit `vgbe-s3-audit`, D24 only): `results/audit/phase-a.json` sha256 79043903…0871, `phase-a-refusals.csv` e058be7e…79e. 14 refusals (all lot-occupied); availability ≤1/3/5/10/20 sessions 2/3/6/9/12; not invalidated 0/0/0/1/2; first-order selectable: 1 (VGT 2022-05-20, only A20-E5). Rerun-safe (descriptive). |
| S4 protocol freeze | complete | `vg-eligibility -- freeze` at 2026-11-07T23:19:00Z (record read-only; refuses a second freeze) |
| S5 pilot (containment, interruption, resume) | not started | `pilot-` job names only |
| S6–S12 search, folds, confirmation, selection freeze, validation, report | not started | |

## Pre-audit specification

The eligibility state machine was written in `src/vg-balanced-entry-eligibility/engine.ts` before Phase A ran
(sha256 `23ad62250bb930241898754ea9234768d841536ab17bae7e2b37cddaae5ac774` at 2026-11-07T23:00Z): arming on capital
refusals, one live opportunity per ETF, trailing-low invalidation, shadow-close cancellation, expiry at the close of
origin + A, band trigger ≤ close ≤ decision price × (1 + E), fresh signals first, oldest origin then alphabetical,
fill at the first trade after the delayed decision, independent D1 exits. Any later change is an amendment.

## On disk versus in memory

- Known before the protocol from reading earlier outputs (to disclose): the existing control run
  `evaluations/study8-runs/20261107T142706Z-run-s8-vg-balanced/` (made before this task) shows 14 refused signals, all
  "pool occupied", all 2020-03-12 → 2022-12-20; none in 2023–2026. No eligibility variant has been run.

## Guards

- Do not rerun or edit any completed study under `research/`; do not touch `state/strategy-lab/`.
- Do not push/merge/deploy without the user's answer (brief forbids push; wrapper mentions push → ask once at the end).
- No eligibility-ON run on real data before `PROTOCOL.md` is frozen.

## Disclosures

- (see "On disk versus in memory")
