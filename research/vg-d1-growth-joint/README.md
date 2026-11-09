# Priority 3 — D1 + Growth for VGT and GDX in one shared $100,000 pool (`vg-d1-growth-joint`)

Research only, not deployed. The four components — D1·GDX, D1·VGT, Growth·GDX, Growth·VGT — trade through one fixed
$100,000 principal budget under architecture A (one exclusive funded slot), with the preserved virtual-book semantics
(a refused entry still starts the component's virtual trade; funding never feeds back into a book).

| File | What it is |
|---|---|
| `brief/BRIEF.md` | the user's assignment (authority) |
| `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json` | the frozen protocol, its append-only amendments, the optimization-standard adoption |
| `CONTROL_MANIFEST.json`, `fixtures/controls.json` | the controls and incumbents, sealed before any of their pooled results |
| `results/parity/parity.json` | the sealed engineering parity |
| `results/protocol-freeze.json` | the freeze record (protocol, code, data, budgets, resources) |
| `results/search/<cutoff>/<arm>.json` | sealed search records (arm D `indep` at every cutoff; arm B `gpair`, arm C `informed` at C24) |
| `results/gpair/C24/selection.json` | the Growth-pair (arm B) qualification and its bounded shortlist |
| `results/folds/<cutoff>/selection.json`, `evaluation.json`, `sequential.json` | qualification, roles, fold evaluations and the chronological verdict |
| `results/diagnostics/D24/` | development diagnostics and ledgers |
| `FROZEN_SELECTION.json` | the frozen primary, roles and validation plan (committed before the validation) |
| `results/validation/` | the one-time validation and its ledgers |
| `REPORT.md` | the report |
| `RESEARCH_RECOVERY.md`, `RUN_COMMANDS.md`, `chains/` | the checkpoint, the commands and the chain scripts |

Code: `src/vg-d1-growth-joint/` (`npm run vg-joint -- <command>`). Report tables: `tools/vg-d1-growth-joint/`.
