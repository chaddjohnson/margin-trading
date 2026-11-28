# RESEARCH_RECOVERY — Stage B (RES-B 1.0.0) — COMPLETE

**Top screen** (times are UTC, from `date -u`)

- Updated: 2026-11-23T06:54Z. **COMPLETE.**
  - Every official stage is sealed: the C19, C21 and C24 folds, the frozen selection and the one FULL validation.
  - The analysis, reports, regression and handoff ZIP are done.
  - Outcome label: **P3 non-inferior and superior** (C21 and C24; C19 non-inferior). Recommendation: do not adopt
    P3; keep P0; return to staged trailing stops (DECISION_REGISTER.md).
- Authority:
  - `PROTOCOL.md`, sha256 `603f25159bf6…` (preregistered `59493083`, frozen `2922e04d`);
  - `AMENDMENTS.md` head **D2**.
- Running: nothing (`systemctl --user list-units 'vgl0reb*'` shows only the slice).
- **Follow-up gate:** the user's review of the ZIP and the decisions U1–U7. These include whether to run the two
  report-only diagnostics that were not performed: `census.ts` and `giveback.ts`. **Do not rerun anything below
  merely because a session is new; every sealed stage refuses to rerun.**

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
| regression | complete 06:41–06:52Z: npm test = the 7 known failures; preflights 27/27; seals 0 differences; Strategy Lab parity ALL VERIFIED, Playwright 81/81 | `chains/regression.sh` → `results/regression/` | rerun |
| reports, ZIP | complete (`938cf825`; ZIP below) | REPORT.md, READ_FIRST.md, DECISION_REGISTER.md; `bundle.sh` | rebuild |

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

## Delivery

- Handoff ZIP: `research/vg-l0-risk-envelope-stage-b/bundle/vg-l0-risk-envelope-stage-b.zip`.
  - Built 2026-11-23T06:53:28Z by `tools/vg-l0-risk-envelope-stage-b/bundle.sh` from the tree at `938cf825`.
  - sha256 `759d61a8bc558c83c5c097bf672e6e3f9418dc45fd5085c8dac36071e266dcd8`; 6,846,562 B; 238 files covered by
    its `MANIFEST.sha256`.
  - Checks passed: `zip -T` OK; every checksum verified after extraction; the secret and personal-data scan is clean;
    there is no database or market-data file.
  - The ZIP holds this checkpoint as of `938cf825`, before this section.
  - An identical copy is in `~/.local/share/margin-trading-gpu/handoffs/`.
- Push: `git ls-remote origin research/vg-l0-risk-envelope-stage-b` = local HEAD (see the final response). `main` is
  untouched (`3606f4b3`) and nothing was merged.
- Git-ignored state kept for review: `research/vg-l0-risk-envelope-stage-b/cache/` (≈ 18 GB of job archives, the
  engineering archives, the per-lot row caches).
