# RESEARCH_RECOVERY — Stage B (RES-B 1.0.0) — INCOMPLETE

**Top screen** (times are UTC, from `date -u`)

- Updated: 2026-11-22T22:10Z. **Stage: S0 preregistration** (protocol, amendment rules, adoption, seed/budget matrix,
  brief copy) is being committed. No Stage B code has run an evaluation and no official job exists.
- Authority:
  - `brief/BRIEF.md`, sha256 `801f8c574755cce371f88727a3865cbab478e2038723d7a76ea3360b1ed267f9` (153 lines, read in full);
  - `PROTOCOL.md`, sha256 `603f25159bf63da5dcb6f924d3caa6ba30b8f69273abf9725ccfcb3c4f3c603a` (preregistered);
  - `AMENDMENTS.md`: no entries.
- Execution window: 2026-11-22T21:14Z → **2026-11-23T06:14Z (hard)**. Latest search launch is 2026-11-23T04:30Z, under
  the conservative forecast rule of PROTOCOL §13.
- Running: nothing.
- **Next step:** implement `src/vg-l0-risk-envelope-stage-b/` and `tools/vg-l0-risk-envelope-stage-b/`, the tests and
  the engineering gates E1, E3–E6, then `gates` → `freeze` → commit and push. Then the C19 fold (`repro`).

## Environment

| Item | Value |
|---|---|
| Checkout | the main checkout `/home/chad/projects/margin-trading`; no extra worktree |
| Branch | `research/vg-l0-risk-envelope-stage-b`, from Stage A's final commit `0c2f9dd5` (pilot `7f69d0d2` → Phase 7 `fc027eed` lineage); `main` untouched |
| Node | v24.21.0 (`/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`); every evaluating process runs `node --no-maglev` |
| GPU | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`; acceptance `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED), untouched |
| Standard | 3.0.0 `4e8244e6…`, scope optimization, gpu-required; the study preflight PASSes (2026-11-22T22:08Z) |
| Containment | `vgl0reb.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0) |

## Stage table

| Stage | Status | Command | Output | Resume |
|---|---|---|---|---|
| S0 preregistration | committing | git commit + push | PROTOCOL.md, AMENDMENTS.md, STANDARD_ADOPTION.json, SEED_BUDGET_MATRIX.json, brief/BRIEF.md | — |
| S1 code + tests | not started | — | `src/vg-l0-risk-envelope-stage-b/`, `tools/vg-l0-risk-envelope-stage-b/` | — |
| S2 engineering E1, E3–E6, gates, freeze | not started | EXECUTION_PLAN.md | `results/engineering/`, `results/protocol-freeze.json` | — |
| C19 fold (repro, E2, search, qualify, select, interval) | not started | EXECUTION_PLAN.md | `results/…` | `--resume` |
| C21 fold | not started | | | |
| C24 fold (+ freeze-selection, authorize-full, validate) | not started | | | |
| analysis, regression, reports, ZIP | not started | | | |

## Constants

These are fixed in PROTOCOL.md §1–§6 and `SEED_BUDGET_MATRIX.json`:
- arms: CTRL `nl0-control@1.0.0` and EXP-30 `sens-p3-40-25-30@1.0.0`;
- cells: GA0.VA0 and GB0.VD1; replicates R3–R18; seed key `<cutoff>/broad/<cell>/R<r>` in the `vg-l0-full-joint`
  namespace;
- cutoffs: C19 (secondary), C21 and C24 (primary);
- the hard bound: 8,800,278 requested official evaluations.

## Guards

- No official evaluation before the sealed and committed freeze and gates.
- Never write into the pilot's or Stage A's directories.
- D23 and FULL only behind their sealed and committed selections; FULL once.

## Disclosures

None yet.
