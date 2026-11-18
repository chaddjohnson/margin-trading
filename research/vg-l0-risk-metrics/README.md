# vg-l0-risk-metrics — risk metrics and optimization methodology (pre-optimization assignment)

Research-only study separating **principal loss**, **profit giveback** and **margin-liquidation exposure** for the New L0
family, and auditing how the NL0/RA1 optimizer treats them. No search, no new phenotype, no adoption, no broker, no
`main` merge; every proposed rule is experimental and not adopted. Standard 2.2.0 (scope diagnostic).

| Document | Content |
|---|---|
| [REPORT.md](REPORT.md) | executive result, answers to the brief's questions, go/no-go |
| [PROTOCOL.md](PROTOCOL.md) / [AMENDMENTS.md](AMENDMENTS.md) | frozen scope, definitions and the precommitted selector experiment; amendments A1–A4 |
| [BASELINE_AND_PROVENANCE.md](BASELINE_AND_PROVENANCE.md) | pins, hashes, New L0 / N/original exact parity |
| [METRIC_SPECIFICATION.md](METRIC_SPECIFICATION.md) | definitions and data dictionary |
| [IMPLEMENTATION_AND_TESTS.md](IMPLEMENTATION_AND_TESTS.md) | code, tests, gates, reconciliation, incidents |
| [CANDIDATE_RISK_AUDIT.md](CANDIDATE_RISK_AUDIT.md) | the 51 sealed candidates under the new metrics; margin scenarios |
| [SELECTION_PIPELINE_AUDIT.md](SELECTION_PIPELINE_AUDIT.md) | where risk enters every optimizer stage; exclusion evidence |
| [SELECTOR_COMPARISON.md](SELECTOR_COMPARISON.md) | P0 / P1 / P2 on identical archived populations |
| [PROPOSED_METHOD.md](PROPOSED_METHOD.md) | NL0-R 0.1.0 proposal, the follow-up design, decision points |
| [RUN_COMMANDS.md](RUN_COMMANDS.md) | every command |
| [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md) | checkpoint |

Records: `results/` (sealed JSON, `seals.jsonl`, `doors.jsonl`), tables: `results/tables/*.csv`, brief: `brief/BRIEF.md`.
Code: `src/vg-l0-risk-metrics/`, `tools/vg-l0-risk-metrics/`.
