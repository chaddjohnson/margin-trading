# RESEARCH_RECOVERY — vgt-d1-growth-joint (Priority 2: joint D1 + Growth, VGT, one shared pool)

## Top screen

- **Updated:** 2026-11-08T11:30Z (UTC, from `date -u`)
- **Status:** INCOMPLETE — stage S6 (the study chain is running: C24 search). C19, C21, C23 and the sequential policies complete.
- **Authority:** `PROTOCOL.md` **frozen** (sha256 `7a680692…cc74`, `results/protocol-freeze.json`; evaluation digest
  `c936f691…`, closure digest `65de4cc4…`, 217 files); `AMENDMENTS.md` head **R5** (pre-freeze; no post-freeze entry);
  brief sha256 `b6dc8758…a2a88fb`. Freeze commit **`3bc7856`**.
- **C19 (sealed):** search `bce8c7bf9f04…`, selection `9d6a4d1ffe34…` (committed `a5ad22ad` before its slice), evaluation `2bdd6cc7f20f…`; primary `C19/indep/A/rise/off#1 top`.
- **C21 (sealed):** search `e716ad446187…`, selection `217effeb93de…` (committed `eda1578a` before its slice), evaluation `f9eaf98f1f23…`; primary `C21/indep/A/breakout/on#1 top`.
- **C23 (sealed):** search `70bb81af58de…`, selection `5fa09d0ba093…` (committed `72c13b56`), evaluation `7249f2dbd2f6…`; primary `C23/indep/A/breakout/on#1 top`.
- **Sequential (sealed `d86d362d2cca…`, committed `ad6edb44`):** joint procedure 2020–2024 −$1,691.64, sequential minute DD $64,570.38 → **chronologically unsupported** (frozen rule).
- **Complete (sealed):** `results/parity/parity-3.json` (sha256 `c61415c9…b336`, 341/341; the frozen code's parity;
  `parity.json`, `parity-2.json` history), the pilot (`results/pilot/PILOT.md`), fixtures, door pins.
- **Running:** `vgtj-chain.service` (bash `chains/study.sh`, log `results/logs/study-chain.log`), which launches one unit
  at a time: `vgtj-search-C19` → `vgtj-qualify-C19` → commit → `vgtj-eval-C19` → C21 … → C23 … → `vgtj-sequential` →
  commit → `vgtj-search-C24` → `vgtj-qualify-C24` → `vgtj-diagnostics` → commit → `CHAIN-DONE`. Each unit logs to
  `results/logs/<unit>.log`; memory samples `results/memory/<job>.jsonl`. Started 08:52:30Z. Estimate 3.5–4.5 h.
- **Check before anything:** `systemctl --user list-units 'vgtj-*'`; `tail results/logs/study-chain.log`. A failure
  prints `CHAIN-FAILED at <step>`. If the chain unit died but a stage unit is gone too, rerun
  `bash research/vgt-d1-growth-joint/chains/study.sh` inside a unit (it skips sealed stages; an interrupted search or
  qualification resumes from its archive in `.cache/vgt-d1-growth-joint/jobs/<job>/`).
- **Next after CHAIN-DONE:** `npm run vgt-joint -- freeze-selection`; commit `FROZEN_SELECTION.json`; then
  `npm run vgt-joint -- launch --unit vgtj-validate --wait -- validate --workers 6`; tables, charts, report.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `research/vgt-d1-growth-joint` from `846594c`.
  Working tree: this study's new files + `package.json` (one script line `vgt-joint`).
- Node v24.21.0. Host: 16 logical CPUs, ~59 GiB RAM, swap 8 GiB (full, other workloads).
- Data: `data/VGT/data.csv` sha256 `2ee06310…412e`; doors in `.cache/vgt-d1-growth-joint/doors/` (D19/D21/D23/D24,
  sha256s in `src/vgt-d1-growth-joint/context.ts` and `results/doors-pins.json` once written).
- Containment: `vgtjoint.slice` MemoryHigh=44G MemoryMax=48G MemorySwapMax=0 (verified); units via
  `npm run vgt-joint -- launch --unit <name> --wait -- <command>`; logs `results/logs/<unit>.log`.

## Decisions (written into PROTOCOL.md)

- Independent canonical virtual books; funding only at a trade's own decision; a funded lot = its virtual lot scaled
  (exits scale-invariant). A / B architectures; B targets {25,50,75,100}%, minimum $10,000, fractional shares.
- 8 protected cells (arch × entry × gate) per cutoff; informed + single-family lanes at C24 only.

## Guards

- Do not open FULL for any joint candidate, fixed combined control or D1 control before `FROZEN_SELECTION.json` is
  committed. Pilot jobs are `pilot-*` and write only to `.cache/vgt-d1-growth-joint/pilot/`.
- Commit/push: finish and verify, then ask once (memory: brief-vs-wrapper-commit-push).

## Disclosures

- The first qualify dry run (pilot `dbg1`, in the tmux scope, not a unit) hit an engine guard: the next-open stop
  stress on a Growth book with optional rules. Fixed before the pilot (disabled family → no book; next-open applies to
  Growth only where supported). The `dbg1` pilot files were deleted; no study result existed.
