# Assignment 3 — New L0 risk-aware successor: full joint optimization

Research only: nothing replaces New L0, deploys a strategy, changes a production setting or merges experimental engine
code into `main`. The study jointly optimizes the three-book shared-capital portfolio **D1·VGT + D1·GDX + Growth·VGT** —
both D1 books with their RC 1/RC 2 risk-control structures (64 cells: 4 × 4 families × 2 × 2 gates, the stop activation a
per-book gene) and **Growth·VGT's complete Growth 1.4.0 genome** — on one causal shared-capital replay, with a fresh
**independent** track (Track I: every cutoff C19, C21, C23, C24) and an **incumbent-informed** track (Track N: C24 only,
New L0, IJ1, C4 and C4-refined projected onto every structure), and compares the **original NL0 selector** with
Assignment 2's **unchanged RA1** on identical candidate populations, chronologically.

| Document | Content |
|---|---|
| [REPORT.md](REPORT.md) | Results, answers to the brief's §6 questions, the Assignment 3 conclusion, limitations, repository status |
| [PROTOCOL.md](PROTOCOL.md) | The frozen pre-registration (cells, genome, boxes, tracks, budgets, selectors, chronology, successor rule) |
| [TEST_REPORT.md](TEST_REPORT.md) | Engineering readiness: synthetic and unit tests, stage V, the full suite, the pilot |
| [AMENDMENTS.md](AMENDMENTS.md), [STANDARD_ADOPTION.json](STANDARD_ADOPTION.json) | Amendment log; standard 2.2.0 adoption with departure AD5 and the adaptations |
| [RUN_COMMANDS.md](RUN_COMMANDS.md) | Every command |
| [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md) | Checkpoint |
| `brief/BRIEF.md` | The user's brief, verbatim |
| `results/` | Sealed records (`seals.jsonl`): stage V, the freeze, searches, qualifications, refinement plans, selections, fold evaluations, sequential verdicts, the validation, diagnostics |
| `results/tables/` | Markdown tables and `summary.json` (regenerated from the sealed records) |
| `chains/` | The pilot, the calibration and the study chain |

Code: `src/vg-l0-full-joint/` (the study; reuses RC 2 `src/d1-risk-controls-rc2/` and Assignment 2's evaluation path,
fitness, qualification helpers and selectors unchanged), `tools/vg-l0-full-joint/` (report-only diagnostics and tables).
Run `npm run vg-l0fj -- <command>` from the repository root.
