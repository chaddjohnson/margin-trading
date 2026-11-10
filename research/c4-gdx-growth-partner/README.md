# Priority 3C — fixed-anchor GDX Growth partner search (`c4-gdx-growth-partner`)

Research only, not deployed. Growth·GDX is searched **alone** beside three frozen anchors in one shared $100,000 slot
under the current funding lifecycle L0: **R** C4-refined (Priority 3B's `C24/informed-fixed#1 profit`; the lead),
**O** original C4 (VG #2 + VGT Growth #4) and **G** VGT Growth #4 alone (no D1). Each arm's baseline — its anchors with
GDX Growth OFF — is a real member and the no-improvement fallback. Selected on 2016–2024; validated once on 2025-01-02 →
2026-10-30 (previously examined history).

| File | What it is |
|---|---|
| `brief/BRIEF.md` | the user's assignment (authority; the 2026-11-10 revision) |
| `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json` | the frozen protocol, its append-only amendments, the optimization-standard adoption (2.0.0) |
| `CONTROL_MANIFEST.json` | the exact anchors and controls (complete effective settings), C4-refined's provenance and the informed GDX seeds per cutoff |
| `results/audit/archive-audit.json` | the audit of Priority 3B's and Priority 3's archives for exact-anchor configurations |
| `results/parity/parity.json` | the sealed engineering gates (E1–E8) |
| `results/pilot/PILOT.md` | the throughput bench and the engineering pilot |
| `results/protocol-freeze.json` | the freeze record (protocol, code, data, budgets, resources) |
| `results/search/<cutoff>/search.json` | sealed search records (C19, C21, C23, C24; nine lanes each) |
| `results/folds/<cutoff>/selection.json`, `evaluation.json`, `sequential.json` | qualification, roles, the descriptive fold evaluations and sequential policies |
| `results/transfers/transfers.json` | the cross-transfers (report-only) |
| `results/diagnostics/D24/` | development diagnostics, the increment decomposition and ledgers |
| `FROZEN_SELECTION.json` | the frozen primaries, roles, partner candidates, recommendation rules and validation plan (committed before the validation) |
| `results/validation/` | the one-time validation |
| `results/tables/` | Markdown report tables |
| `REPORT.md` | the report |
| `RESEARCH_RECOVERY.md`, `RUN_COMMANDS.md`, `chains/` | the checkpoint, the commands and the chain scripts |

Code: `src/c4-gdx-growth-partner/` (`npm run c4gdx -- <command>`); tables: `tools/c4-gdx-growth-partner/tables.ts`.
