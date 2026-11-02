# Study 8 — expanded-regime stability-first D1 reoptimization (2016–2024 train, 2025–2026 one-time evaluation)

**Status:** COMPLETE (see `RESEARCH_RECOVERY.md`). It is research only: nothing is deployed, and B1, B5 and the
prospective system are unchanged. The study is uncommitted on the local branch `research/study8-expanded-regime-d1`
(worktree `/home/chad/projects/margin-trading-study8`); commit and push await the user's separate decision.

## Purpose

To test whether training the D1 architecture on all history through 2024-12-31 makes profitable, robust parameter
neighbourhoods more durable than Study 7's shorter windows did. That history includes the COVID crash, the 2022 bear
market, the 2023 recovery and 2024. The test is a one-time look at 2025-01-02 → 2026-10-29, where results can only
veto.

There were six full, separately budgeted tracks; every book's eight D1 parameters vary jointly on the executed
shared-slot replay:

| Track | Books | Dimensions |
|---|---|---:|
| G | GDX | 8 |
| V | VGT | 8 |
| VG | VGT + GDX | 16 |
| VXR | VGT + XBI + XRT | 24 |
| VXRG | VGT + XBI + XRT + GDX | 32 |
| VXRKG | the B5 architecture reoptimized | 40 |

Five expanding-window folds (F19, F20, F21, F23 and the primary F24) each ran their own optimizer, qualification and
shortlist. All were frozen before any test door opened.

## Evidence grade

- **Selection:** training-window only, in-sample, under heavy selection pressure (about 10 million neighbourhood
  evaluations; PBO > 0.5 in 20 of 30 track-folds).
- **Test:** a single retrospective chronological look at a closed but **previously inspected** window. Not an
  untouched holdout, and not independent validation.
- **Integrity:** a local SHA-256 hash chain plus integrity pins, not Git commits. An independent methodology review, a
  verification pass and a pre-test audit (CLEARED) preceded the tests.

## Short answer

- **Yes, retrospectively and with heavy caveats.** On 2025-01-02 → 2026-10-29, 18 of 26 F24 role holders did not fail
  the predeclared test gates: 16 pass and 2 ambiguous, across all six tracks.
  - The **primary research nominee** is **#1 VG profit** (VGT + GDX, jointly optimized): test-window net $64,166, run
    minute DD $31,225, 93.2% of 384 fresh neighbours below $35k.
  - The best of each track: VXRG #3 ($65,312), VXRKG #8 ($34,414), VXR #15 ($67,745), V #25 ($41,715) and G #12
    ($31,441, ambiguous).
- **What persisted was robustness, not exceptional profit.** In 2025–2026 frozen B5 earned $71,986 and B1 $40,901.
  The nominees earned similar money ($19.5k–$83.8k) on far broader neighbourhoods: 91.9–100% of neighbours below the
  ceiling, against B5's 29%.
  - The window favoured D1 broadly. Study 7's VG/VXR references, trained only through 2023, also pass; its GDX
    references fail T3. The Study 7 comparison is non-decisional
    (`results/tables/F24-study7-comparison.md`).
  - Neither B1 nor B5 is out of sample on this window (PROTOCOL.md §1.4, §3.4).
- **The procedure folds are the warning.** Every candidate failed on test windows containing a drawdown regime absent
  from its training: F19 0/19 (the 2020 crash); F20 0/27 and F21 0/28 (2022). Most failed T1, some only other gates.
  - With 2020 and 2022 in training, risk control persisted in 2024 and 2025–2026. Whether broader training improves
    durability is consistent with this but not established: two favourable-regime windows, confounded and
    descriptive.
  - H1 is supported, descriptively. H3 (no 40-D configuration passes) is not supported: four VXRKG holders passed.
- **No live recommendation.** A clean prospective follow-up on sessions after 2026-10-29 is outlined in
  `RECOMMENDATION.md`.

## Contents

| File | What |
|---|---|
| `PROTOCOL.md` | the frozen protocol (sha256 `22eebc37…`), with §13 resolving both review passes |
| `AMENDMENTS.md` | R0 (pre-freeze), E1 (post-freeze parity-check fix), E2 (pre-test audit disclosures), E3 (final-audit disclosures), the chain-head log |
| `BASELINES_AND_PARITY.md` | engineering gates P1–P5, N1, C1, D1, T0, G1; frozen controls reproduced to the cent |
| `SEARCH_AND_COMPUTE.md` | budgets, search scale, triggers, saturation, threshold sensitivity |
| `NEIGHBORHOOD_ROBUSTNESS.md` | training against test neighbourhoods, dimension-matched views, clipping |
| `CHRONOLOGICAL_VALIDATION.md` | the five test doors, the controls, 2025 and 2026 YTD separately, return rank |
| `RISK_AND_TRADE_SEQUENCING.md` | drawdowns, named events, gap and fill risk, slot sequencing |
| `RECOMMENDATION.md` | mechanical result, economic judgment, evidence confidence, decision, follow-up plan |
| `EXECUTION_AND_INTEGRITY.md` | chain, pins, reviews, stages, tests, environment |
| `RUN_COMMANDS.md` | every command; the executed and verified runner commands |
| `RESEARCH_RECOVERY.md` | the recovery checkpoint |
| `FROZEN_SELECTION.json`, `results/` | sealed records, door log, chain, generated tables (`results/tables/`) |
| `reviews/` | methodology review, verification pass, pre-test audit (sealed in the chain); final audit (`FINAL_AUDIT.md`, PASS WITH CORRECTIONS, outside the chain) |

**Runnable research configurations:** `config/research-pools/study8-expanded-regime-d1/S8-<TRACK>-F24-<n>.json` (all
36 F24 shortlist members, labelled NOT DEPLOYED with their training rank and test status). Run them with `npm run
study8-run` (`src/study8-runners/README.md`).
