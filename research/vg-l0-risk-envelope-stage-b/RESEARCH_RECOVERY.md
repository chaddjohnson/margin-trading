# RESEARCH_RECOVERY — Stage B (RES-B 1.0.0) — INCOMPLETE

**Top screen** (times are UTC, from `date -u`)

- Updated: 2026-11-23T06:45Z. **Every official stage is COMPLETE and sealed** (2026-11-22T21:56:09Z → 23:06:57Z).
  - C19, C21 and C24 folds: E2 IDENTICAL 4/4 each; searches of 64 lanes each; union qualifications; selections; C19
    and C21 intervals; FROZEN_SELECTION; FULL authorization; the FULL validation, once.
  - 22 sealed files verify. 3,962,772 requested official evaluations, against the bound 8,800,278.
  - The analysis is committed at `a64197fd`. Outcome label: **P3 non-inferior and superior** (C21 and C24). T1 and T2
    fail at C21 and C24. See REPORT.md.
- **Recovery performed** 2026-11-23T06:37Z, after the session stood idle from 22:57Z.
  - Checked: units (none running), fold logs, git log, the 22 seals and the order of the 61 door openings (FULL once).
  - The window's hard end (06:14Z) had passed; AMENDMENTS D1 discloses it. The census and giveback replays were not
    performed (§10).
- Authority:
  - `PROTOCOL.md`, sha256 `603f25159bf6…` (preregistered `59493083`, frozen `2922e04d`);
  - `AMENDMENTS.md` head **D2**.
- Running: unit `vgl0reb-regression` (`chains/regression.sh`, log `results/logs/regression.log`). It has finished
  when the log shows `REGRESSION COMPLETE`.
- **Next step:**
  1. When the regression completes, add its results to REPORT §13 and READ_FIRST.
  2. Commit.
  3. Build the ZIP: `tools/vg-l0-risk-envelope-stage-b/bundle.sh
     /home/chad/projects/margin-trading/research/vg-l0-risk-envelope-stage-b/bundle`.
  4. Record its sha256 here, commit and push; verify with `git ls-remote`.

## Environment

| Item | Value |
|---|---|
| Checkout | the main checkout `/home/chad/projects/margin-trading`; no extra worktree |
| Branch | `research/vg-l0-risk-envelope-stage-b`, from Stage A's final commit `0c2f9dd5` (pilot `7f69d0d2` → Phase 7 `fc027eed`); `main` untouched |
| Node | v24.21.0 (`/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`); every evaluating process runs `node --no-maglev` |
| GPU | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`; acceptance `config/gpu-backend/acceptance.json` `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED), untouched; E1 VERIFIED on this branch |
| Standard | 3.0.0 `4e8244e6…`, scope optimization, gpu-required; preflight PASS |
| Containment | `vgl0reb.slice` (44G / 48G / swap 0) via `tools/vg-l0-risk-envelope-stage-b/launch.sh` |

## Stage table

| Stage | Status | Command / record | Resume |
|---|---|---|---|
| S0 preregistration | complete, commit `59493083`, pushed 21:27Z | PROTOCOL.md, AMENDMENTS.md, STANDARD_ADOPTION.json, SEED_BUDGET_MATRIX.json, brief/BRIEF.md | — |
| S1 code + tests | complete, commits `33d663d4`, `d00ba33f` | `src/vg-l0-risk-envelope-stage-b/` (context, records, doors, budget, qualify, select, stats, stages, main, tests/), `tools/vg-l0-risk-envelope-stage-b/` (common, cpuPool, cpuWorker, launch.sh, engineering.ts, analyze.ts, edge-subjects.py, adoption.py), `chains/{e1,engineering,fold}.sh`, EXECUTION_PLAN.md, package.json scripts `vg-l0reb`, `vg-l0reb-eng`, `vg-l0reb-tools` | — |
| E1 | complete 21:36:10Z, VERIFIED | `chains/e1.sh` → `results/engineering/E1/{verify-acceptance,runtime}.txt` | rerun |
| E4 | complete 21:42Z, 41/41 | `results/engineering/E4/tests.txt` (with the code digest) | rerun |
| E3 | complete 21:55:22Z, all 8 checks PASS | `chains/engineering.sh` → `results/engineering/E3/summary.json` | rerun |
| E5, E6 | complete 21:47–21:48Z (preflight PASS; gate OPEN on D19/D21/D24, 18/18 parity) | `results/engineering/E5/`, `E6/` | rerun |
| gates, freeze | complete: gates.json `2aa130b3…` (`b5636559`); protocol-freeze.json `614a63d8…` (`2922e04d`, pushed) | `npm run vg-l0reb -- gates`, `… freeze` | never rerun |
| C19 fold | complete 22:12:08Z: E2 IDENTICAL 4/4 (`71a2e1ba`), search 64 lanes 10.8 min ≈ 1,808 evaluations/s (`0120c686`), qualification (`233ee626`), selection (`f9520f59`), interval on D21 (`263030ce`, pushed) | `chains/fold.sh` with `CUT=C19` | `START=<step> RESUME=1` |
| C21 fold | complete 22:36:13Z: E2 IDENTICAL 4/4 (`af19c746`), search (`0df7075a`), qualification (`19f1b1eb`), selection (`44f2c52f`), interval on D23 (`68cdab93`) | `CUT=C21` | |
| C24 fold | complete 23:06:57Z: E2 IDENTICAL 4/4 (`2027c0a6`), search (`3a746d1d`), qualification (`5ff1cb06`), selection (`43f81039`), FROZEN_SELECTION (`c963338e`), FULL authorization (`d171435e`), validation on FULL once (`5a661477`) | `CUT=C24` | never rerun |
| analysis | complete (`a64197fd`): `results/analysis/` (TABLES.md, SUPPLEMENT.md, summary.json, supplement.json, CSVs) | `npm run vg-l0reb-tools -- all`; `python3 -I tools/vg-l0-risk-envelope-stage-b/supplement.py` | deterministic rerun |
| regression | running (unit `vgl0reb-regression`, started 06:41Z) | `chains/regression.sh` | rerun |
| reports, ZIP | reports written; ZIP pending | REPORT.md, READ_FIRST.md, DECISION_REGISTER.md; `bundle.sh` | rebuild |

## Constants

These are fixed in PROTOCOL.md §1–§6 and `SEED_BUDGET_MATRIX.json`:
- arms: CTRL `nl0-control@1.0.0` and EXP30 `sens-p3-40-25-30@1.0.0`;
- cells: GA0.VA0 and GB0.VD1; replicates R3–R18; seed key `<cutoff>/broad/<cell>/R<r>` in the `vg-l0-full-joint`
  namespace;
- cutoffs: C19 (secondary), C21 and C24 (primary);
- the hard bound: 8,800,278 requested official evaluations.

## Guards

- No official evaluation before the sealed and committed freeze and gates.
- Never write into the pilot's or Stage A's directories.
- D23 and FULL only behind their sealed and committed selections; FULL once.
- While a fold chain runs, do not stage or commit anything by hand (the chain commits its own results paths).

## Disclosures

- AMENDMENTS D1: the window end passed during an idle session after every official stage; census and giveback
  diagnostics were not performed. D2: the Strategy Lab nonregression check ran in the final regression.

- AMENDMENTS P1: the estimated read time of the standard, and this file's first top-screen time, were not taken from
  the clock.
