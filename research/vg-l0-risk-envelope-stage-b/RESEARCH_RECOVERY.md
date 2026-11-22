# RESEARCH_RECOVERY — Stage B (RES-B 1.0.0) — INCOMPLETE

**Top screen** (times are UTC, from `date -u`)

- Updated: 2026-11-22T22:37Z. **Stage: C19 and C21 folds COMPLETE (C21 22:13Z → 22:36:13Z, all steps exit 0); C24 fold launching.** The engineering gates are sealed (all PASS) and
  the protocol freeze is sealed, committed and pushed:
  - `results/engineering/gates.json`, sha256 `2aa130b310ebadf7d51d21aeefc1620f83795cf5ecd6d2334022d00775070ea6`,
    commit `b5636559`;
  - `results/protocol-freeze.json`, sha256 `614a63d862d162291a66ca8b1c3b535011bf93eee93895c866459ff37197c6c8`, commit
    `2922e04d`, pushed 21:56Z;
  - the frozen code digest is `fcc20138b64c8e05e7bc24044fa4d6d6af237a213837690f76347be802e690e4` (190 files).
- Authority:
  - `brief/BRIEF.md`, sha256 `801f8c57…`;
  - `PROTOCOL.md`, sha256 `603f25159bf63da5dcb6f924d3caa6ba30b8f69273abf9725ccfcb3c4f3c603a` (preregistered `59493083`,
    frozen `2922e04d`);
  - `AMENDMENTS.md` head **P2**.
- Execution window: 2026-11-22T21:14Z → **2026-11-23T06:14Z (hard)**; the latest search launch is 04:30Z
  (`launchGuard`).
- Running:
  - systemd unit `vgl0reb-fold-C19.service`, which runs `chains/fold.sh` with `CUT=C19`, log
    `results/logs/fold-C19.log`;
  - each stage runs as its own unit `vgl0reb-C19-<stage>`, with its own log `results/logs/C19-<stage>.log`.
  - The fold has finished cleanly when the log ends with `FOLD C19 COMPLETE`; otherwise look for `FAILED:` lines.
  - Check: `systemctl --user list-units 'vgl0reb*'`. **Do not stage or commit by hand while a fold chain runs.**
- **Next step after C19:**
  1. Push.
  2. Launch the C21 fold: `tools/vg-l0-risk-envelope-stage-b/launch.sh vgl0reb-fold-C21
     /home/chad/projects/margin-trading/research/vg-l0-risk-envelope-stage-b/results/logs/fold-C21.log -- /usr/bin/env
     CUT=C21 /bin/bash /home/chad/projects/margin-trading/research/vg-l0-risk-envelope-stage-b/chains/fold.sh`.
  3. Then run C24 the same way.
- **Resume after a failure:** check the logs first, then relaunch the fold with `START=<step> RESUME=1` (steps:
  1 repro, 2 e2, 3 search, 4 qualify, 5 select, 6 interval; for C24, 6 freeze-selection, 7 authorize-full, 8 validate).

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
| C24 fold | not started | `CUT=C24` | |
| analysis, regression, reports, ZIP | not started | | |

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

- AMENDMENTS P1: the estimated read time of the standard, and this file's first top-screen time, were not taken from
  the clock.
