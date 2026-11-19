# Bounded optimization-process audit (archive reselection on Priorities 3B and 4A)

**Status: COMPLETE (2026-11-10, UTC); awaiting the user's review.** Result: **no demonstrated improvement** from three
frozen alternative selection formulas; the futility rule stopped the audit before any new 2025–2026 evaluation.

- **Question:** why do development-selected configurations fail in later periods: poor selection among available
  candidates, inadequate discovery, misleading robustness measurements or execution assumptions, or insufficient history?
- **Design:** no new search. The actual independent cutoff archives of Priority 3B (`research/vg-d1-growth-expanded/`)
  and Priority 4A (`research/gdx-growth-standalone/`) were re-ranked by the original rule (P0) and three frozen
  experimental policies (P1 tail severity, P2 subperiod consistency, P3 episode sensitivity); a frozen 96-member cohort
  per subject and cutoff measured which alternatives existed (hindsight, never selectable).
- **Read first:** [REPORT.md](REPORT.md) · [PROCESS_PROPOSAL.md](PROCESS_PROPOSAL.md) (proposals for review) ·
  [POLICIES.md](POLICIES.md) · [PROTOCOL.md](PROTOCOL.md) · [AMENDMENTS.md](AMENDMENTS.md) ·
  [RUN_COMMANDS.md](RUN_COMMANDS.md) · [RESEARCH_RECOVERY.md](RESEARCH_RECOVERY.md) · tables in `results/tables/`.
- **Records:** `results/protocol-freeze.json`; `results/stage1/` (inventory, reproduction, G7 recheck, mechanism);
  `results/stage2/POLICY_FREEZE.json`; `results/stage3/` (CHOICES, outcomes, analysis); `results/stage4/C24_FREEZE.json`;
  `SOURCE_MANIFEST.json`; `results/seals.jsonl` (`npm run opa -- verify`); `results/compute.jsonl`; `results/doors.jsonl`.
- **Code:** `src/optimization-process-audit/` (`npm run opa -- <command>`), tests in its `tests/`; report tables
  `tools/optimization-process-audit/tables.ts`. Standard 2.0.0 adopted (`STANDARD_ADOPTION.json`).
- **Not changed:** the subjects' and context studies' records, C4, C4-refined, the frozen GDX candidates, the declined
  3C partner (still declined), the optimization standard and its registry.
