# AMENDMENTS — GPU Phase 9 (append-only)

Each entry: ID, UTC time, the change, why, which results existed, and its effect (standard 5.0.0 §0.2 [A]).

- **A1 (2026-11-28T02:08Z, gate E4, during the campaign; a defect of a copied tool's fixture, not of the enforcement).**
  - **What happened:** step 27 of `chains/final.sh` (the source-tamper suite, `tools/gpu-phase9/tamper.ts`) failed at
    02:06:43Z with "22/23 tamper cases pass; baseline NOT OK". Its sandbox fixture study `research/zz-tamper`
    (`tools/gpu-phase9/tamper-sandbox.ts`, copied from Phase 7) adopted standard **3.0.0**.
  - **Why it failed:** since standard 4.0.0 (2026-11-27) the preflight refuses a new optimization manifest that pins an
    earlier version (the no-evasion rule, §7.6). It also requires `dateRanges` and `dataPins`. The fixture's official
    runner was therefore refused, correctly: the baseline's "runner ran" expectation and T14's (which needs the runner)
    failed.
  - **What did not fail:** the 22 other cases passed. T14's detection itself held: the out-of-band record pin caught the
    regenerated record.
  - **Results that existed:** steps 1–26, sealed or recorded, unaffected and kept: B1, the parity campaign 54/54 with 0
    mismatches, D1 38/38, A2, R1–R3, A3, A4 9/9, Q1, A5, E3 73/73.
  - **The change:** the fixture now adopts the registry's current version (5.0.0) with R1's `dateRanges` and the R1
    `dataPins`. Nothing else changed: no enforcement code, case, expectation or tolerance.
  - **The failed attempt's evidence is preserved** in `results/superseded/tamper-attempt-1/`: its record
    `tamper-final.json` (sha256 in the commit), the step log and the chain log through step 27.
  - **Effect:** the chain resumes with `START=27`, which reruns E4, then A6 and the suites. Steps 1–26 are not rerun.
  - **Resumed run:** E4 23/23, baseline OK (02:12:25Z); A6 passed (02:44:41Z).
- **A2 (2026-11-28T02:59Z, gate E9, after the chain completed; a defect of the campaign checkout's environment, not of
  the code).**
  - **What happened:** step 29 (`chains/tests.sh`, 02:44:41–02:57:09Z) passed everything except Strategy Lab's Vitest
    suite: 328 passed, **4 failed**, 2 skipped. The root suite passed (1,934 tests, 1,927 pass, exactly the 3
    record-in-force failures). The portfolio parity passed (all six candidates). Playwright passed 74, skipped 9, failed
    0.
  - **Cause of the Vitest failures:** all four are the implementation-fingerprint tests "a traced rise-from-recent-low(-trading)
    run loads and reads nothing outside its identity" (`tests/preview-identity.test.ts`, `tests/preview.test.ts`).
    They failed on 44 module paths under `/home/chad/projects/margin-trading/node_modules/…`. The worktree's
    `node_modules` were symlinks into the main checkout (PROTOCOL.md AD10), so every module load resolved outside the
    checkout. Real copies of the same `node_modules` make them pass (development check at 02:59Z: 33/33 in those two
    files; not evidence).
  - **Cause of the 9 skips:** the `vg-balanced` e2e tests read the newest `-s8-vg-balanced` replay in
    `state/strategy-lab/imports/study8`, which the worktree did not have (the main checkout's live state has it). The
    e2e server only copies it into its temporary state.
  - **The change:** environment and check only; no code, test, expectation or tolerance.
    - the worktree's `node_modules` (root, Strategy Lab) are now real copies of the main checkout's;
    - `state/strategy-lab/imports/study8` is a read-only copy of the live state's (580 KB);
    - `chains/tests.sh` and `tools/gpu-phase9/tests-record.ts` require the worktree's `state/strategy-lab/` to hold only
      that copy, byte-identical before and after, instead of being absent. The live dist check is unchanged.
    - `docs/data-updates/2026-11-27-assignment-2/scripts/worktree-env.sh` is updated to match.
  - **The first attempt's records are preserved** in `results/superseded/tests-attempt-1/`: `tests/`, `integrity/` and
    the step log.
  - **Effect:** the chain resumes with `START=29`, which reruns E7–E10 only. Steps 1–28 stand.
