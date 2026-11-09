# Short-term VGT dip recovery — Phase 1 feasibility (`intraday-dip-recovery-vgt`)

A new, independent VGT-only study on Alpaca SIP 1-minute bars under optimization standard 2.0.0. It asks whether a
simplified short-term dip-recovery strategy earns worthwhile actual net profit within a $35,000 maximum minute drawdown
on a fixed $100,000 principal. The strategy has a causal reference-high dip, a trailing rebound buy, an unconditional
protective trailing stop raised from completed minutes and same-period trading. The study also looks for several
meaningfully different phenotypes. It is not a deployment authorization.

| File | What it is |
|---|---|
| `brief/BRIEF.md` | the user's assignment (authoritative instructions) |
| `PROTOCOL.md` | the frozen protocol (`results/protocol-freeze.json`) |
| `STANDARD_ADOPTION.json`, `STANDARD_COMPLIANCE_MAP.md` | the adopted standard 2.0.0 and its item-by-item map |
| `EXISTING_FINDINGS_AND_CHANGE_MAP.md` | what earlier studies found (including examined 2025–2026 outcomes) and what changes here |
| `AMENDMENTS.md` | append-only amendments |
| `RESEARCH_RECOVERY.md` | the recovery checkpoint (authoritative state) |
| `RUN_COMMANDS.md`, `chains/` | exact commands and the pilot and study chains |
| `REPORT.md`, `REPORT_TABLES.md` | the written report and the generated tables (Markdown only, no visuals) |
| `FROZEN_SELECTION.json` | the C24 frozen selection (committed before validation) |
| `results/` | sealed records (`seals.jsonl`), the door log (`doors.jsonl`), data, parity, pilot, searches, qualifications, folds, ablation, controls, diagnostics, validation, report CSV/JSON |

Code: `src/intraday-dip-recovery/` (CLI `npm run dip-recovery -- <command>`); report tables:
`tools/intraday-dip-recovery/tables.ts`.
