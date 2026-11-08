# RESEARCH_RECOVERY — vgt-d1-growth-joint (Priority 2: joint D1 + Growth, VGT, one shared pool)

## Top screen

- **Updated:** 2026-11-08T08:02Z (UTC, from `date -u`)
- **Status:** INCOMPLETE — stage S2 (engineering pilot part 2 running). No study search has run.
- **Authority:** `brief/BRIEF.md` (sha256 `b6dc8758…a2a88fb`). `PROTOCOL.md` drafted, not frozen (§14 to fill from the
  bench). Amendment head: none.
- **Complete:** engine; doors + `results/doors-pins.json`; `fixtures/controls.json`; synthetic tests 13/13;
  **parity sealed** `results/parity/parity.json` (sha256 `b80790f0…7115`, 341 checks, 0 failed, evaluation digest
  `a9e7c186…`); pilot part 1 (`results/logs/pilot-chain.log`: A straight, B stop→resume, C unit SIGKILL→resume, D worker
  death failed in 20 s→resume; `PILOT-COMPARE {"b":true,"c":true,"d":true}`); pilot X1–X3 expected failures.
- **Running:** `chains/pilot2.sh` (background shell `bcdlrq31g`, log `results/logs/pilot2-chain.log`): E (C24-shaped,
  every lane, pilot budgets) → F (C19/C21/C23 pilot + sequential) → bench (D24 8/12/14 workers, D19 14). Done iff the log
  ends `PILOT2-DONE`; a failure prints `PILOT-FAILED`.
- **Next command:** fill PROTOCOL §14 from `.cache/vgt-d1-growth-joint/pilot/bench.jsonl`; `npm run vgt-joint --
  freeze-protocol`; commit; then `bash research/vgt-d1-growth-joint/chains/study.sh` (background).
- **Do not change** any file in `src/vgt-d1-growth-joint/lab.ts` `evaluationFiles` without re-sealing parity under a new
  name and an amendment (the parity record pins digest `a9e7c186…`).

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
