# Priority 4A — standalone GDX Growth optimization (`gdx-growth-standalone`)

Research only, not deployed. One GDX Growth 1.4.0 book **alone** on one fixed $100,000 principal budget (no D1, no VGT,
no other symbol competing for capital), 5 bps per side, 11% simple interest, the maximum minute drawdown ceiling
$35,000 (35% of the fixed principal). An **independent** broad search (canonical boxes, fresh seeds, no prior vector) is
repeated at C19, C21, C23 and C24; a separately accounted **informed** lane at C24 refines Appendix A and 13 predeclared
GDX vectors of Priorities 3B and 3C. Selected on 2016–2024; validated once on 2025-01-02 → 2026-10-30 (previously
examined history).

| File | What it is |
|---|---|
| `brief/BRIEF.md` | the user's assignment (authority; 2026-11-10) |
| `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json` | the frozen protocol, its append-only amendments, the optimization-standard adoption (2.0.0) |
| `CONTROL_MANIFEST.json` | the exact controls (Appendix A, P01–P13, cash) with complete effective settings, provenance and source pins |
| `results/parity/parity.json` | the sealed engineering gates (E1–E7) |
| `results/pilot/PILOT.md` | the throughput bench and the engineering pilot |
| `results/protocol-freeze.json` | the freeze record (protocol, code, data, budgets, resources) |
| `results/search/<cutoff>/independent.json`, `results/search/C24/informed.json` | sealed search records |
| `results/folds/<cutoff>/selection.json`, `evaluation.json`, `results/folds/sequential.json` | qualification, roles, the fold evaluations and the sequential policies |
| `results/diagnostics/D24/` | development diagnostics and ledgers |
| `FROZEN_SELECTION.json` | the frozen primary, roles, 4B export set and validation plan (committed before the validation) |
| `results/validation/` | the one-time validation |
| `results/tables/` | Markdown report tables |
| `REPORT.md` | the report |
| `RESEARCH_RECOVERY.md`, `RUN_COMMANDS.md`, `chains/` | the checkpoint, the commands and the chain scripts |

Code: `src/gdx-growth-standalone/` (`npm run gdxg -- <command>`); tables: `tools/gdx-growth-standalone/tables.ts`.
Large regenerable job archives stay outside git in `.cache/gdx-growth-standalone/jobs/` (hashes in
`results/archive-manifest.json`).
