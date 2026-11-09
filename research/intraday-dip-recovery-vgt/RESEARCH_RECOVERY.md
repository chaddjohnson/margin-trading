# Research recovery checkpoint — Short-term VGT dip recovery, Phase 1 (`intraday-dip-recovery-vgt`)

## Top screen

- **Updated:** 2026-11-09T19:11Z (UTC, from `date -u`). **Status: INCOMPLETE.** The protocol is frozen and is being
  committed. No search, ablation, qualification, fold or validation result exists yet.
- **Authority:**
  - `PROTOCOL.md`, sha256 `8a71e641da35…`, frozen by `results/protocol-freeze.json` at 2026-11-09T19:10:57Z;
  - code digest `13e803f3953c…`;
  - `AMENDMENTS.md`: no amendment;
  - standard 2.0.0 (`2005a88c…0105`);
  - brief `brief/BRIEF.md` (`7224c602…7c4c`).
- **Stages complete (sealed):**
  - coverage (endpoint 2026-10-30);
  - doors;
  - parity (0 failures, P1–P8);
  - the pilot (`results/pilot/PILOT.md`, cache outputs);
  - the protocol freeze.
- **Running processes:** none.
- **Next command:** commit the freeze, then `bash research/intraday-dip-recovery-vgt/chains/study.sh` (C19 → C21 → C23
  with fold commits, then C24).

## Environment

- Repository root `/home/chad/projects/margin-trading-2`, main checkout.
- Branch `research/intraday-dip-recovery-vgt`, from `8c20f855`. No other worktree.
- Node 24.21.0; 16 threads; 59 GiB RAM.
- Heavy work runs in `diprecovery.slice` (44G/48G/swap 0): 12 workers, GC every 1,024 evaluations, pressure stop at
  32 GiB.
- Data: `data/VGT/data.csv` (git-ignored), sha256 `2ee06310…412e`. Doors are pinned in `src/intraday-dip-recovery/context.ts`.

## Stage table

| Stage | Status | Command | Output | Resume semantics |
|---|---|---|---|---|
| coverage | complete | `npm run dip-recovery -- coverage` | `results/data/coverage.json` (sealed) | refuses to rerun |
| doors | complete | `… doors` | `results/data/doors.json` (sealed) | refuses to rerun |
| parity | complete (0 failures) | `… launch --unit dip-parity --wait -- parity` | `results/parity/parity.json` (sealed); dry-run 1 failure preserved | refuses to rerun |
| pilot | complete | `bash research/intraday-dip-recovery-vgt/chains/pilot.sh` + bench | `results/pilot/PILOT.md`, `bench.jsonl`; cache | engineering only |
| protocol freeze | complete (commit pending) | `… freeze-protocol` | `results/protocol-freeze.json` (sealed) | refuses to rerun |
| C19 / C21 / C23 searches → qualify → seal-fold (commit) → fold-eval | not started | `chains/study.sh` | `results/search/<cutoff>/`, `results/qualify/`, `results/folds/` | a search resumes from its job archive on rerun; sealed stages refuse |
| sequential, ablation, controls | not started | `chains/study.sh` | `results/folds/sequential.json`, `results/ablation/`, `results/controls/` | deterministic, sealed |
| C24 searches (indep, informed, explore2) → qualify → diagnostics → freeze-selection (commit) | not started | `chains/study.sh` | `results/search/C24/`, … `FROZEN_SELECTION.json` | as above |
| validation (once) | not started | `… launch --unit dip-validate --wait -- validate` | `results/validation/` | runs once; refuses unless the frozen selection is committed |

## Guards (do not rerun or reopen)

- No 2025–2026 price is parsed before `FROZEN_SELECTION.json` is sealed and committed. The coverage scan read
  timestamps only.
- A fold's slice is never evaluated before its selection is committed.
- Never edit `research/intraday-d1-vgt/`, `src/intraday-d1/`, D1, Study 8, Growth or Strategy Lab files.

## Disclosures so far

- Parity dry run 1 found a defect of the independent reference (not the engine), fixed before sealing
  (`results/parity/dry-run-1-failed.txt`).
- The pilot logs printed pilot-budget development results on P18/D19 (2016–2019). These are inside every cutoff's
  training window and inform no choice.
- Two 2016 sessions lack a closing-print row (complete regular bars).
- The preflight's §1 date-split checks are skipped because departure D1 cites §1.8; the date split was checked manually
  (`results/preflight/preflight-at-freeze.txt`).
