# READ FIRST — Stage B: replicated, paired GPU comparison of P0 and P3 (RES-B 1.0.0)

**Status: COMPLETE.**
- The preregistered study ran in full on the official GPU path, in the frozen order: 192 search lanes, 96 paired
  comparisons, 3 cutoffs.
- It stayed within its hard bound and inside the nine-hour window for every official evaluation.
- Two report-only CPU diagnostics were not performed (see Limitations).
- Research only: nothing was adopted, deployed or merged, nothing replaces New L0 or N/original, and no broker was
  accessed.

## Executive result

1. **Precommitted outcome label: _P3 non-inferior and superior_.** P3 is marked DD ≤ 40 % of C0, trade principal loss
   ≤ 25 %, banked-capital DD ≤ 30 %, on the liquidation basis. The statistic is the paired lane difference in best
   qualified training-period centre net, P3 − P0, over 32 pairs per cutoff:

   | Cutoff | Role | Mean D | Lower one-sided 90 % bound | NI (> −$5,000) | Superior (> $2,500 ∧ bound > 0) |
   |---|---|---:|---:|---|---|
   | C21 | primary | **+$10,729** | **+$6,276** | yes | yes |
   | C24 | primary | **+$16,387** | **+$9,892** | yes | yes |
   | C19 | secondary | −$750 | −$2,759 | yes | no |

2. **The gain comes from the 40 % marked-DD allowance, not from the principal / banked protections.**
   - No candidate qualified under P0 but failed P3, at any cutoff. The 25 % PL and 30 % BD gates essentially never
     bound.
   - 11 of 32 (C21) and 12 of 32 (C24) P3 lane winners would fail P0 on their confirmation p90 marked DD of
     $35k–$40k.
3. **No credible risk benefit.**
   - P3's selections have about the same trade principal loss and banked-capital DD as P0's (differences within
     ±$1k).
   - They have more marked drawdown: +$1.6k–$3.0k at the centre, and +$2.2k–$4.6k at the confirmation p90.
   - Their confirmation draws breaching 35 % DD rise from 2–3 % to 9–13 %.
4. **The retrospective next intervals are unfavourable to P3 at both primary cutoffs.** These intervals were inspected
   before, and the tests are descriptive.
   - The paired interval drawdown is larger by $2.9k (2022–2023) and $7.2k (2025–2026), so the precommitted
     interval-DD non-inferiority test fails at both cutoffs.
   - The paired interval net is −$4.0k and −$12.4k.
   - C19 → 2020–2021 favoured P3 (+$9.3k).
5. **Recommendation: do not adopt P3.** Keep the original NL0 method (P0), make no change to the optimization standard
   or NL0 1.0.0, and return to staged trailing-stop work. The only open question is whether a 40 % marked-DD ceiling
   is acceptable at all. That is a risk preference, and this study's interval evidence argues against it.

## Verification

- **Gates.** E1–E6 passed. CTRL reproduced Assignment 3 in every fold (12/12 lanes).
- **GPU = CPU** on the mini-pilot of both arms and on 3,000 threshold-edge subjects.
- **Official accounting.** 0 CPU-scored and 0 failed official evaluations; 22/22 seals verify; FULL was opened once.
- **Final regression.** `npm test` shows only the 7 known pre-existing failures. Every study's preflight passes, and
  Strategy Lab parity and Playwright (81/81) pass.

## Important limitations

- **One market history, retrospective.** VGT/GDX history 2016–2026 has been examined by many studies. The cutoffs are
  nested: C19's interval lies inside C21's training window, and C21's inside C24's.
- **Two cells, path-dependent lanes.** Lanes run with replicate seeds only; 2–10 lanes per cutoff were budget-bound,
  so not converged.
- **The design resolves differences of about $10k**, not $2,500. The standard error of mean D is $3.7k (C21) and
  $5.1k (C24).
- **The superiority test is partly mechanical here.** P3's admitted set was in practice a superset of P0's.
- **Thresholds are optimizer qualification limits on historical paths, never stop losses.**
- **Timing (AMENDMENTS D1).**
  - All official stages ran from 21:56Z to 23:07Z on 2026-11-22, inside the window (21:14Z → 06:14Z).
  - The session then stood idle until 06:37Z. The analysis, reports, regression and ZIP were completed after the
    window end.
  - By the protocol's own rule (§10), the report-only **search-archive census** and **profit-giveback CPU replay**
    were **not performed**. The tools are committed (`tools/vg-l0-risk-envelope-stage-b/census.ts`, `giveback.ts`)
    for a separate decision.

## Decisions requested (`DECISION_REGISTER.md` §2)

- U1: adopt P3? (suggested: no)
- U2: revisit the 35 % → 40 % ceiling separately? (suggested: no)
- U3: run the two skipped report-only diagnostics? (optional)
- U4: return to staged trailing stops? (suggested: yes)
- U5: keep the branches unmerged? (yes)
- U6: the ≈ 18 GB of git-ignored job archives (keep until review)
- U7: no change to the standard or NL0

## Reading order

1. `REPORT.md` — §0 summary; §2 gates; §3 compute; §4 the primary statistic; §5 eligibility vs search path; §6
   qualification and the counterfactual; §7 risk; §8 pooled and selectors; §9 intervals; §10 R1/R2 context; §11
   limitations; §12 assessment; §13 regression.
2. `results/analysis/TABLES.md` and `SUPPLEMENT.md`, then the machine-readable results:
   - `summary.json`, `supplement.json`;
   - `pairs-C2x.csv` (seed level), `members-C2x.csv` (every qualified finalist under both policies);
   - `interval-pairs-C2x.csv`, `interval-subjects-C2x.csv`.
3. `DECISION_REGISTER.md`.
4. `PROTOCOL.md` (frozen), `AMENDMENTS.md` (P1, P2 pre-freeze; D1, D2), `STANDARD_ADOPTION.json`,
   `SEED_BUDGET_MATRIX.json`, `brief/BRIEF.md`.
5. The sealed records (`results/seals.jsonl`):
   - `results/protocol-freeze.json`, `results/engineering/gates.json`;
   - `repro/`, `search/`, `qualification/`, `selection/`, `intervals/`;
   - `../FROZEN_SELECTION.json`, `doors/FULL-authorization.json`.
6. Evidence:
   - `results/engineering/E1`–`E6` and `E2-C2x.json`;
   - `results/gpu-attestations/`;
   - `results/jobs/<job>/` (identity, events, receipts, telemetry);
   - `results/doors.jsonl` (the data-door record);
   - `results/regression/`.
7. `EXECUTION_PLAN.md`, `RUN_COMMANDS.md`, `chains/*.sh`, `RESEARCH_RECOVERY.md`, `src/vg-l0-risk-envelope-stage-b/`,
   `tools/vg-l0-risk-envelope-stage-b/`.

## Identity

| Item | Value |
|---|---|
| Branch | `research/vg-l0-risk-envelope-stage-b`, from Stage A `0c2f9dd5` (pilot `7f69d0d2`, Phase 7 lineage `fc027eed`); never merged; final commit in `IDENTITY.txt` and `RESEARCH_RECOVERY.md` |
| Protocol | sha256 `603f25159bf63da5dcb6f924d3caa6ba30b8f69273abf9725ccfcb3c4f3c603a`; preregistered `59493083`; frozen `2922e04d` (freeze record `614a63d8…`, code digest `fcc20138…`) |
| GPU acceptance | `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED), untouched and verified on the branch |
| Standard / method | 3.0.0 `4e8244e6…` (optimization, gpu-required); NL0 1.0.0 `9b387bb4…` |
| Data | GDX `77dba9b2…`, VGT `2ee06310…` (Priority 3's doors D19 / D21 / D23 / D24 / FULL; their pins are in the freeze record). Market data and SQLite archives are not in this package |
| Brief | `brief/BRIEF.md` sha256 `801f8c574755cce371f88727a3865cbab478e2038723d7a76ea3360b1ed267f9` |
