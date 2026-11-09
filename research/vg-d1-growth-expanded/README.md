# Priority 3B — larger VGT + GDX D1/Growth pooled search, C4 as the preferred benchmark (`vg-d1-growth-expanded`)

Research only, not deployed. VG #2's two D1 books (VGT, GDX) plus Growth — VGT only, GDX only or both — in one shared
$100,000 slot under the current funding lifecycle L0, selected on 2016–2024; C4 (VG #2 + VGT Growth #4, GDX Growth OFF)
is the user's preferred benchmark and no-improvement fallback.

| File | What it is |
|---|---|
| `brief/BRIEF.md` | the user's assignment (authority) |
| `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json` | the frozen protocol, its append-only amendments, the optimization-standard adoption (2.0.0) |
| `CONTROL_MANIFEST.json` | the exact controls (complete effective settings), historical comparisons and informed seeds |
| `results/parity/parity.json` | the sealed engineering gates (E1–E7) |
| `results/pilot/PILOT.md` | the throughput bench and the engineering pilot |
| `results/protocol-freeze.json` | the freeze record (protocol, code, data, budgets, resources) |
| `results/search/<cutoff>/<arm>.json` | sealed search records (independent at C19, C21, C23, C24; informed at C24) |
| `results/folds/<cutoff>/selection.json`, `evaluation.json`, `sequential.json` | qualification, roles, fold evaluations, the chronological verdict |
| `results/diagnostics/D24/` | development diagnostics and ledgers |
| `FROZEN_SELECTION.json` | the frozen primary, roles, C4 rule and validation plan (committed before the validation) |
| `results/validation/` | the one-time validation |
| `results/tables/` | Markdown report tables |
| `REPORT.md` | the report |
| `RESEARCH_RECOVERY.md`, `RUN_COMMANDS.md`, `chains/` | the checkpoint, the commands and the chain scripts |

Code: `src/vg-d1-growth-expanded/` (`npm run vg-exp -- <command>`); tables: `tools/vg-d1-growth-expanded/tables.ts`.
