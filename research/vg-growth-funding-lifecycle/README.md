# Priority 5A (brought forward) — Growth funding lifecycle and fixed portfolio combinations (`vg-growth-funding-lifecycle`)

A bounded fixed-arm comparison on unchanged phenotypes: L0 (the current virtual-book lifecycle, exact control), L1
(Growth responds to actual funding; fresh canonical opportunities only) and L2 (L1 plus one bounded preserved refused
opportunity: 20 sessions, 5% extension), with matched development neighbourhoods and a standalone neighbourhood
assessment of the existing GDX Growth, VGT #4 and 08500a60. Research only; no search, no deployment, no change of the
canonical Growth default. Reporting is text and tables only (standard 2.0.0 §7.7).

| File | What it is |
|---|---|
| `brief/BRIEF.md` | the user's assignment (authority) |
| `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json` | the frozen protocol (standard 2.0.0, scope `diagnostic`), the append-only amendments, the adoption |
| `STUDY_MANIFEST.json`, `results/protocol-freeze.json` | the frozen subjects (exact vectors), arms, instruments, plan and interpretation parameters; the freeze |
| `results/engine/orchestrator.diff` | the only differences between the study's lifecycle orchestrator and the canonical `simulateTrading` |
| `results/verification/verification.json` | stage V: parity, invariance, causality, accounting, book parity |
| `results/development/{centres,neighbourhoods,standalone,verdicts}.json` | stages C, N, S, P (development) |
| `FULL_MANIFEST.json`, `results/full/full.json` | the FULL guard (sealed and committed before FULL opened) and stage F |
| `results/tables/*.md` | report tables generated from the sealed records |
| `REPORT.md` | the report |
| `RESEARCH_RECOVERY.md`, `RUN_COMMANDS.md` | the checkpoint and the commands |

Code: `src/vg-growth-funding-lifecycle/` (`npm run vg-life -- <command>`; tests in `tests/`). Job archives live under
`.cache/vg-growth-funding-lifecycle/` and logs under `results/logs/` (both git-ignored).
