# RESEARCH_RECOVERY — GPU Phase 9: acceptance renewal for the research-date-boundaries integration (COMPLETE)

**Top screen (times from `date -u`)**

- **Updated:** 2026-11-28T03:27Z (clock). **COMPLETE: ACCEPTED.**
  - **Record:** `config/gpu-backend/acceptance.json` sha256 `9ebb33ce8620dead93ebab349a8263ad3ca8bbc676861771724a745ef2361bf4`,
    written 03:19:01Z, commit `4f82149c`; source revision `a63baf40`; 48/48 gates. It supersedes Phase 7's
    `bb0e3fcf…`.
  - **Out-of-band pin:** `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase9-9ebb33ce.json`
    (0444) and a `pins.jsonl` line.
- **Task:** Assignment 2 (`brief/BRIEF.md`). The task checkpoint, which owns the merge into `main` and the service, is
  `docs/data-updates/2026-11-27-assignment-2/WORK_RECOVERY.md`.
- **Branch and worktree:** `integration/research-date-boundaries-a2`, in the worktree
  `/home/chad/.local/share/margin-trading-worktrees/a2-integration` (PROTOCOL.md AD10; removed at the task's end).
- **Running:** nothing.
- **Protocol:** `PROTOCOL.md` (frozen `results/protocol-freeze.json` `da4c9a40…`); amendments A1 and A2.
- **Next authorised step:** none for this study.
  - Do not rerun the campaign or the generator.
  - Never write into the evidence paths the record hashes. Later checks go to new paths, for example
    `results/post-record/` or `results/integration/`.

## Stage table

| Stage | Status | Command / record | Time (UTC) | Resume / guard |
|---|---|---|---|---|
| Baseline (`f2c414ef`, Git objects) | complete | `tools/gpu-phase9/baseline.ts` → `results/baseline/*` | 22:54Z | captured once |
| Archive restore (2 of 14, scratch) | complete, both PASS | `results/restore/restore-record.json`; scratch `cache/restore/` (git-ignored) | 22:55Z | re-creatable |
| Edge subjects | complete | `results/risk-parity/edge-subjects-D21.json` `5224a351…`, `-D24.json` `6bb76311…` | 22:56Z | deterministic |
| Protocol freeze | complete | `results/protocol-freeze.json` `da4c9a40…` (at `25fc8e37`) | 23:00:35Z | sealed |
| Campaign `chains/final.sh` | complete | steps 1–26 23:00:42Z → 02:06Z; E4 failed, then A1 and a resume at step 27 (02:08:38Z); E9 failed, then A2 and a resume at step 29 (03:00:08Z); complete 03:18:03Z | — | jobs refuse to be recreated (JOB_EXISTS) |
| Evidence commit | complete | `a63baf40` (the source revision) | 03:18Z | — |
| Generator | **ACCEPTED** 48/48 | `tools/gpu-phase9/accept.ts`; `docs/data-updates/2026-11-27-assignment-2/evidence/accept-run.txt` | 03:19:01Z | never rerun |
| Post-record checks | complete | `results/post-record/`: verifier with rebuild and device VERIFIED; record-in-force tests 51/51; GATE OPEN D24; refusals for a wrong purpose and for Maglev; preflights 32/32; `npm test` 1,934 / 1,930 / **0 fail** / 4 skipped | 03:19–03:26Z | — |

## Key results

- **Binary and data:**
  - B1: gb9 `36dcc251…`, reproducible, kernels = gb7;
  - D1: 38/38 real-data datasets = Phase 7's, FULL `6e977ccd…`;
  - A1: parity 54 runs, 144,795 subjects, 0 mismatches.
- **Parity and replays:**
  - A2: finalists 96/96 and 48/48 sealed;
  - R1–R3: 0 differing;
  - A3: three sealed replays identical;
  - A4: the mini schedule 9/9 identical;
  - Q1: 30,749 evaluations, 0 differing.
- **Robustness and enforcement:**
  - A5: sanitizer 0 errors;
  - A6: 2 × 32 min, 0 mismatches;
  - E3: 73/73;
  - E4: 23/23.
- **Suites and integrity:**
  - E7: all six candidates verified;
  - E8: 3 record-in-force only;
  - E9: 334/334, Playwright 83/83 (rerun);
  - E10: 5/5.

## Guards

- No official optimization ran here. The only optimization was the fixed-seed engineering mini schedule on D19.
- Never edit the sealed records (`results/seals.jsonl`) or the record's evidence files.
