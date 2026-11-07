# growth140-vgt-s8m — Growth 1.4.0 on VGT, Study 8–style, with #4 as a fixed control

A fresh, memory-bounded restart of the Study 8–style optimization of Growth 1.4.0 (`rise-from-recent-low-trading`) on
VGT that the brief (`brief/BRIEF.md`) asks for. The failed attempt (`dd2f07f`, reverted in `7c7bcab`) contributes
nothing but the diagnosis of its crash.

| File | Content |
|---|---|
| `REPORT.md` | the findings: outcome, side-by-side table, trade evidence, trade-offs, limitations |
| `MEMORY.md` | the incident, the measured memory growth, the safeguards, peak memory, containment |
| `PROTOCOL.md` | the frozen protocol (sha256 `ae3bfa41…7bac6`, frozen 2026-11-07T11:47:25Z, commit `b461dec`) |
| `AMENDMENTS.md` | the append-only amendment log |
| `RUN_COMMANDS.md` | fresh-start, resume and rerun commands |
| `RESEARCH_RECOVERY.md` | the recovery checkpoint |
| `FROZEN_SELECTION.json` | the read-only selection manifest (committed before validation) |
| `results/` | protocol freeze, parity, search, qualification, validation, pilot and memory records, run logs, tables, the trial archive |

Code: `src/growth140-vgt-s8m/` (pinned by the freeze), plus the post-freeze helpers in `tools/growth140-vgt-s8m/`.
Command: `npm run growth140-s8m -- <command>`.
