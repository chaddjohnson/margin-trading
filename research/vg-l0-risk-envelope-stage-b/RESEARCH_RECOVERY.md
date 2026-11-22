# RESEARCH_RECOVERY — Stage B (RES-B 1.0.0) — INCOMPLETE

**Top screen** (times are UTC, from `date -u`)

- Updated: 2026-11-22T21:47Z. **Stage: S2 engineering gates.**
  - E1 passed (21:36Z).
  - E4 tests pass 41/41.
  - E3 is running as unit `vgl0reb-eng`, log `results/logs/engineering-chain.log`. Its GPU mini-pilot is done; the CPU
    reference started 21:44Z.
  - Next: commit the code and tools, then E5 and E6, `gates`, `freeze`, commit and push, then the C19 fold.
- Authority:
  - `brief/BRIEF.md`, sha256 `801f8c574755cce371f88727a3865cbab478e2038723d7a76ea3360b1ed267f9`;
  - `PROTOCOL.md`, sha256 `603f25159bf63da5dcb6f924d3caa6ba30b8f69273abf9725ccfcb3c4f3c603a`, preregistered at commit
    `59493083` (21:26:55Z, pushed);
  - `AMENDMENTS.md` head **P2** (P1: timestamp disclosure; P2: implementation refinements; no design change).
- Execution window: 2026-11-22T21:14Z → **2026-11-23T06:14Z (hard)**. Latest search launch: 2026-11-23T04:30Z, under
  the conservative forecast (PROTOCOL §13, `stages.ts launchGuard`).
- Running: systemd user unit `vgl0reb-eng.service` (E4 + E3 chain `chains/engineering.sh`). Check it with
  `systemctl --user list-units 'vgl0reb*'`. It has finished cleanly when the log ends with
  `ENGINEERING CHAIN COMPLETE`; otherwise look for `FAILED:` lines.
- **Next step:**
  1. When E3 completes: commit `results/engineering/E3`.
  2. Run E5 (`npm run --silent research-preflight -- --study research/vg-l0-risk-envelope-stage-b`) and E6
     (`tools/gpu-backend/official-preflight.ts --study … --door D19|D21|D24`).
  3. Run `GPU_POLICY_PURPOSE=official-optimization npm run vg-l0reb -- gates`, then `… freeze`.
  4. Commit and push.
  5. Launch the C19 fold chain (EXECUTION_PLAN.md §2).

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
| S1 code + tests | complete (uncommitted at 21:47Z) | `src/vg-l0-risk-envelope-stage-b/` (context, records, doors, budget, qualify, select, stats, stages, main, tests/), `tools/vg-l0-risk-envelope-stage-b/` (common, cpuPool, cpuWorker, launch.sh, engineering.ts, analyze.ts, edge-subjects.py, adoption.py), `chains/{e1,engineering,fold}.sh`, EXECUTION_PLAN.md, package.json scripts `vg-l0reb`, `vg-l0reb-eng`, `vg-l0reb-tools` | — |
| E1 | complete 21:36:10Z, VERIFIED | `chains/e1.sh` → `results/engineering/E1/{verify-acceptance,runtime}.txt` | rerun |
| E4 | complete 21:42Z, 41/41 | `results/engineering/E4/tests.txt` (with the code digest) | rerun |
| E3 | running (unit `vgl0reb-eng`) | `chains/engineering.sh` → `results/engineering/E3/` | `START=<step>` |
| E5, E6, gates, freeze | not started | EXECUTION_PLAN.md §1 | — |
| C19 fold | not started | `chains/fold.sh` with `CUT=C19` | `START=<step> RESUME=1` |
| C21 fold | not started | `CUT=C21` | |
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
