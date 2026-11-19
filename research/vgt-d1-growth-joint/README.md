# vgt-d1-growth-joint — Priority 2: joint D1 + Growth optimization for VGT in one shared $100,000 pool

**Status: COMPLETE.** Research only, not deployed. Brief: `brief/BRIEF.md`.

**Result:** a working combination (both families funded, qualified on development), but **no robust improvement**:

- The frozen primary earned **$169,722.07** on 2016–2024 (DD $23,023.18) and **+$22,251.64** on 2025–2026 (DD
  $27,145.72).
- The plain combination of the existing D1 primary and Growth #4 earned more in every window.
- The selection procedure was **chronologically unsupported**.
- Architecture A (exclusive slot) was supported; B added nothing.

The 2025–2026 window is validation on previously examined history.

| File | Contents |
|---|---|
| `REPORT.md` | findings, tables, the matched-trade analysis, and **Priority 2 review — decision before Priority 3** |
| `PROTOCOL.md` | the frozen protocol (sha256 `7a680692…cc74`; `results/protocol-freeze.json`) |
| `AMENDMENTS.md` | R1–R5 (all before the freeze); no post-freeze amendment |
| `FROZEN_SELECTION.json` | the frozen primary, roles, controls and validation plan (read-only; committed `3ed30ff0` before validation) |
| `RUN_COMMANDS.md` | every command, in order, with its unit and output |
| `RESEARCH_RECOVERY.md` | the recovery checkpoint (top screen: COMPLETE) |
| `fixtures/controls.json` | the four fixed control settings, complete, with the economics |
| `chains/` | the pilot and study chains (fail-fast, resumable) |
| `results/parity/` | parity seals (`parity-3.json` is the frozen code's: 341/341) |
| `results/pilot/` | the engineering pilot (interruption tests, bench, memory) |
| `results/search/C*/search.json` | the sealed searches: every lane's counts, islands, rungs, refinement, shortlist, frontier |
| `results/folds/C*/selection.json`, `evaluation.json`, `sequential.json` | qualification evidence, selections, fold evaluations, sequential policies |
| `results/diagnostics/D24/` | development diagnostics: ledgers (lots, fills, funding, daily), ablations, allocation grid, matched trades |
| `results/validation/` | the one-time validation (sealed) with ledgers |
| `results/tables/` | generated Markdown tables (`tools/vgt-d1-growth-joint/tables.ts`) |
| `results/charts/` | equity and drawdown charts (open in a browser) |
| `results/memory/`, `results/logs/` | 10-second memory samples per job and every unit's log |
| `results/seals.jsonl`, `results/doors.jsonl` | the seals and every data-door opening |

Code: `src/vgt-d1-growth-joint/` (run from the repository root with `npm run vgt-joint -- <command>`).

- `books.ts`: the D1 and Growth virtual books.
- `allocator.ts`: the pooled ledger (A / B).
- `evaluate.ts`: the evaluation record.
- `space.ts`: the joint genome and neighbourhoods.
- `search.ts`: screen, NSGA-II islands, rungs, refinement, shortlist.
- `qualify.ts`: evidence, gates and roles.
- `stages.ts`, `post.ts`: the cutoffs, folds, sequential policies, diagnostics, frozen selection and validation.
- `lab.ts`, `workers.ts`, `worker.ts`: bounded, resumable execution.
- `parity.ts`, `parityStage.ts`: parity.
- `tests/`: the study's tests.

Report helpers: `tools/vgt-d1-growth-joint/` (tables, charts, memory summary, the synthetic ledger example).
Regenerable job archives (≈ 3 GB): `.cache/vgt-d1-growth-joint/` (git-ignored).
