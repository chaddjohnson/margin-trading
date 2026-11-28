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
