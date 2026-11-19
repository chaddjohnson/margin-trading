# Priority 3A — GDX Growth participation and neighbourhood risk (`vg-d1-growth-diagnostic`)

A bounded, read-only diagnostic of Priority 3 (`research/vg-d1-growth-joint/`). Research only, not deployed. Nothing
is searched, selected, retuned or relabelled; Priority 3's records and classification are untouched.

| File | What it is |
|---|---|
| `brief/BRIEF.md` | the user's assignment (authority) |
| `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json` | the frozen protocol (standard 1.1.0, scope `diagnostic`), its append-only amendments (A1), the adoption |
| `DIAGNOSTIC_MANIFEST.json`, `results/protocol-freeze.json` | the frozen subjects, stages, counts, probe design and FULL questions; the freeze (code, pins, archives) |
| `results/development/participation.json` | stage R: every subject reproduced on development; funnels, refusals, idle overlaps, drawdown episodes |
| `results/archive/audit.json` | stage S: the search and promotion audit of Priority 3's C24 archives |
| `results/risk/neighbourhoods.json`, `results/risk/probes.json` | stages N and P: the reconstructed neighbourhoods, draw replays and the frozen probes |
| `results/full/retrospective.json` | stage F: the frozen subjects on 2016-01-04 → 2026-10-30 (previously examined history) |
| `results/tables/*.md`, `results/charts/*.svg` | report tables and charts (`tools/vg-d1-growth-diagnostic/tables.ts`) |
| `REPORT.md` | the report: the four answers, evidence, documentation changes, the proposed next study |
| `RESEARCH_RECOVERY.md`, `RUN_COMMANDS.md` | the checkpoint and the commands |

Code: `src/vg-d1-growth-diagnostic/` (`npm run vg-diag -- <command>`; 12 tests). Logs under `results/logs/` are
git-ignored by the repository's convention.
