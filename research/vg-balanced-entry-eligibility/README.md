# vg-balanced-entry-eligibility — Priority 1: bounded D1 entry eligibility for VG #2 Balanced

**Status: COMPLETE. Result: no useful benefit.** The frozen selection keeps the control. Research only, not deployed.
Brief: `brief/BRIEF.md`.

The question: should a D1 entry refused only because the single $100,000 slot was occupied be funded later, at a
current executable price, once the slot is free? Tested on Study 8 rank #2 VG Balanced (`s8-vg-balanced`,
`S8-VG-F24-3`, VGT + GDX), with all D1 parameters fixed. Development 2016–2024; validation 2025–2026 on previously
examined history.

| File | Contents |
|---|---|
| `REPORT.md` | findings, tables, examples, verdict, and the **Priority 1 review — decision before Priority 2** handoff |
| `PROTOCOL.md` | the frozen protocol (sha256 `9636fc1f…13b4`; `results/protocol-freeze.json`) |
| `AMENDMENTS.md` | R1–R3 (pre-freeze), E1–E2 (post-freeze; no rule changed) |
| `FROZEN_SELECTION.json` | the C24 selection (OFF retained), committed read-only before the one-time validation |
| `RUN_COMMANDS.md` | every command, in order, with its unit and output |
| `RESEARCH_RECOVERY.md` | the recovery checkpoint (top screen: COMPLETE) |
| `results/control/` | the existing Study 8 runner's outputs: dev, full, and the sealed-endpoint reconciliation |
| `results/parity/` | OFF parity: exact on every door; runner files byte-identical |
| `results/audit/` | Phase A missed-opportunity audit (D24) |
| `results/folds/C19 … C24/` | sealed selections (`selection.json`, `candidates.csv`) and fold evaluations |
| `results/diagnostics/D24/` | report-only diagnostics: ledgers, opportunities, transitions, matched comparison, D1 stress, friction, invalidation sensitivity, concentration, examples |
| `results/validation/` | the one-time FULL validation (sealed) with ledgers |
| `results/charts/charts.html` | equity and drawdown paths, and the D1-stress scatter (open in a browser) |
| `results/pilot/`, `results/memory/`, `results/logs/` | pilot and interruption tests, memory samples, job logs |
| `results/seals.jsonl`, `results/doors.jsonl`, `results/MANIFEST.sha256` | seals, door openings, file hashes |

Code: `src/vg-balanced-entry-eligibility/` (run from the repository root with `npm run vg-eligibility -- <command>`).

- `engine.ts`: the fixed-pool adapter with the opportunity state machine.
- `parity.ts`: OFF parity checks.
- `audit.ts`: the Phase A audit.
- `specs.ts`, `select.ts`, `stages.ts`: the search space, selection rules and fold stages.
- `diagnostics.ts`, `validate.ts`: report-only diagnostics and the one-time validation.
- `job.ts`, `pool.ts`, `worker.ts`: bounded, resumable execution.
- `tests/`: the study's tests.

Charts helper: `tools/vg-balanced-entry-eligibility/charts.ts`. Regenerable job archives live in
`.cache/vg-balanced-entry-eligibility/` (git-ignored).
