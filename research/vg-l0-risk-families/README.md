# Assignment 2 — D1 risk-control families and risk-aware candidate selection

Research only: nothing replaces New L0, deploys a strategy or merges experimental engine code into `main`. The study
(1) adds and verifies an optional **entry-day activation** of the D1 protective stop (specification **RC 2**), (2)
optimizes the D1 risk-control families fairly — **all 64 RC 1 base cells** of the two D1 books plus the **132 entry-day
onset cells** (14 × 14 = 196 cells), each with NL0's V-cell schedule and two replicates at every cutoff C19, C21, C23,
C24 — with New L0's Growth·VGT frozen, and (3) compares the **original NL0 selection** with a precommitted **risk-aware
selection (RA1)** on identical candidate populations, chronologically.

| Document | Content |
|---|---|
| [REPORT.md](REPORT.md) | Results, answers to the brief's final questions, limitations, repository status |
| [ASSIGNMENT3_HANDOFF.md](ASSIGNMENT3_HANDOFF.md) | What Assignment 3 should optimize jointly, and why |
| [PROTOCOL.md](PROTOCOL.md) | The frozen pre-registration (cells, boxes, budgets, selectors, chronology, successor rule) |
| [SPECIFICATION_RC2.md](SPECIFICATION_RC2.md) | Entry-day protective-stop activation: semantics, causality, identity |
| [TEST_REPORT.md](TEST_REPORT.md) | Synthetic tests, stage V gates, the full suite, the pilot |
| [AMENDMENTS.md](AMENDMENTS.md), [STANDARD_ADOPTION.json](STANDARD_ADOPTION.json) | Amendment log; standard 2.2.0 adoption with departures AD4, AD5, AD8 |
| [RUN_COMMANDS.md](RUN_COMMANDS.md) | Every command |
| [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md) | Checkpoint |
| `results/` | Sealed records (`seals.jsonl`): stage V, the freeze, searches, qualifications, refinement plans, selections, fold evaluations, sequential verdicts, the frozen selection, the validation, diagnostics |
| `results/tables/` | Markdown tables and `summary.json` (regenerated from the sealed records) |
| `chains/` | The pilot and the study chain |

Code: `src/d1-risk-controls-rc2/` (RC 2), `src/vg-l0-risk-families/` (the study), `tools/vg-l0-risk-families/` (report-only
diagnostics and tables). Run `npm run vg-l0rf -- <command>` from the repository root.
