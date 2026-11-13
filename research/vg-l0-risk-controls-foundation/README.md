# Assignment 1 — New L0 risk-aware successor foundation

The engineering and governance foundation for a later search for a more risk-robust successor to the frozen **New L0
primary: VGT + GDX**. It adopts optimization standard **2.2.0** and builds three optional, per-book D1 risk controls:
an unconditional protective loss stop, maximum-hold policies (legacy, disabled, progress-extended adaptive) and a
prolonged-decline entry gate. They have exact legacy parity and documented, tested mechanics. **No optimization, no
selection, no deployment.** New L0 is unchanged and remains the reference.

| Document | Content |
|---|---|
| [REPORT.md](REPORT.md) | Final summary: what changed, what did not, gate results, blockers, what needs approval |
| [STANDARD_CHANGE_RECORD.md](STANDARD_CHANGE_RECORD.md) | Standard 2.2.0: exact changes, classes, rationale, migration, tests, integration |
| [SPECIFICATION.md](SPECIFICATION.md) | The controls (RC 1): schema, units, causal state machines, precedence, logs, limitations |
| [BASELINE_MANIFEST.md](BASELINE_MANIFEST.md) | New L0's exact reproduction: versions, data, costs, parity evidence |
| [TEST_REPORT.md](TEST_REPORT.md) | Automated tests, synthetic scenarios, real-data gates G0–G7 |
| [ASSIGNMENT2_HANDOFF.md](ASSIGNMENT2_HANDOFF.md) | Assignment 2 design draft (options, nothing executed or binding) |
| [RUN_COMMANDS.md](RUN_COMMANDS.md) | Every command, and how to use the controls |
| [PROTOCOL.md](PROTOCOL.md), [AMENDMENTS.md](AMENDMENTS.md), [STANDARD_ADOPTION.json](STANDARD_ADOPTION.json) | Frozen protocol, append-only amendments A1–A3 (tool fixes), adoption manifest |
| [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md) | Checkpoint |
| `tables/` | New L0's full trade list, the gate summary, the demonstrations (regenerated from the sealed records) |
| `results/` | Sealed records (`seals.jsonl`), door log, unit logs |

Code: `src/d1-risk-controls/` (the controls) and `tools/vg-l0-risk-controls-foundation/` (this study's gates).
