# vg-l0-shadow-eligibility — New L0 shadow-position entry eligibility

Research only (not deployed; New L0 is not replaced). The user's brief: [`brief/BRIEF.md`](brief/BRIEF.md).

- **Authority:** [`PROTOCOL.md`](PROTOCOL.md) (frozen; hash in `results/protocol-freeze.json`), [`AMENDMENTS.md`](AMENDMENTS.md),
  [`STANDARD_ADOPTION.json`](STANDARD_ADOPTION.json) (standard 2.1.0; reference method NL0 1.0.0).
- **Checkpoint:** [`RESEARCH_RECOVERY.md`](RESEARCH_RECOVERY.md). **Commands:** [`RUN_COMMANDS.md`](RUN_COMMANDS.md).
- **Code:** `src/vg-l0-shadow-eligibility/` — `allocator.ts` (the shadow-capable pooled replay: Priority 3's `runPool` +
  marked SHADOW insertions), `position.ts` (the independent real position of a delayed entry), `evaluate.ts` (the
  evaluation and the three toggles), the NL0 pipeline (`config.ts`, `search.ts`, `stages.ts`, `qualify.ts`, `folds.ts`), the
  fixed-parameter comparison (`phase2.ts`), `ablation.ts`, `diagnostics.ts`, `final.ts`, stage V (`parity.ts`).
- **Results:** sealed records under `results/` (hashes in `results/seals.jsonl`); `FROZEN_SELECTION.json`; the report
  `REPORT.md` with `results/tables/`.
