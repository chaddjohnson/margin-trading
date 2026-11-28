# Risk-envelope pilot (NL0-REP 1.0.0) — authorized bounded pilot

Research only. A fair, reproducible, GPU-accelerated test of whether replacing the NL0 marked-DD gate (≤ 35 % of the
fixed $100,000 allocation) by the envelope (marked DD ≤ 40 %, funded-trade principal loss ≤ 25 %, banked-capital DD ≤ 25 %)
changes what the NL0 / Assignment 3 broad search discovers and qualifies — on two cells, two seeds, two cutoffs (C21,
C24), with identical seeds, schedules, costs and execution in both arms. It does not change the optimization standard,
NL0 1.0.0, New L0's status or any optimizer default; nothing is deployed; `main` is untouched.

| Document | Content |
|---|---|
| [PROTOCOL.md](PROTOCOL.md) | the frozen protocol (decisions applied, metrics, arms, stages, budget, gates, chronology, outcome rule) |
| [DECISION_REGISTER.md](DECISION_REGISTER.md) | D-0 … D-15 resolved, with provenance |
| [AMENDMENTS.md](AMENDMENTS.md) | append-only amendment log (P1–P9 before the freeze) |
| [STANDARD_ADOPTION.json](STANDARD_ADOPTION.json) | standard 3.0.0 adoption (scope optimization, gpu-required, NL0 1.0.0) |
| [EXECUTION_PLAN.md](EXECUTION_PLAN.md) | the exact commands, jobs, doors and records |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md), [DIAGNOSTICS_SPEC.md](DIAGNOSTICS_SPEC.md), [SCALING_CHECKS.md](SCALING_CHECKS.md) | the readiness specifications the protocol pins (unchanged) |
| [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md) | the checkpoint |
| `history/` | the readiness proposal, byte-identical, and the transition note |
| `brief/BRIEF.md` | the user's authorization, verbatim |
| `results/` | sealed records (`seals.jsonl`), engineering gates, job records, attestations |

Code: `src/vg-l0-risk-envelope-pilot/` (official GPU entrypoint; `npm run vg-l0rep -- <command>`), tools
`tools/vg-l0-risk-envelope-pilot/` (non-official engineering and diagnostics).
