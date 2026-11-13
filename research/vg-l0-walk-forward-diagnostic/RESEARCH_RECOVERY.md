# RESEARCH_RECOVERY — walk-forward robustness failure investigation (New L0 family)

## Top screen

- **Updated (UTC):** 2026-11-13T18:32Z
- **Status:** **INCOMPLETE** — stage S0 (setup: brief, branch, checkpoint) in progress.
- **Brief:** `research/vg-l0-walk-forward-diagnostic/brief/BRIEF.md` (140 lines by `wc -l`, no trailing newline; sha256
  `fb939d2596623cdbc6abd83493f01343097d800d6f124e199fa699376a818d3e`; verified complete through "Final question to
  answer").
- **Protocol:** not yet written (next: PROTOCOL.md + STANDARD_ADOPTION.json, scope `diagnostic`, standard 2.1.0).
- **Running processes:** none.
- **Next command:** write PROTOCOL.md and STANDARD_ADOPTION.json, then
  `npm run research-preflight -- --study research/vg-l0-walk-forward-diagnostic`.

## Environment

- Repository root (main checkout); branch `research/vg-l0-walk-forward-diagnostic` created from
  `research/vg-l0-shadow-eligibility` at `73712149e5529beb6b2efca7f222a0a67347932d` (clean tree at creation).
- Node v24.21.0 (`.node-version`).
- No worktree. Diagnostic scripts live in `tools/vg-l0-walk-forward-diagnostic/` (not `src/`, so no completed study's code
  manifest changes).

## Scope guards (from the brief)

- Diagnosis and recommendations only: no re-optimization, no parameter changes, no new trading rules, no allocator change,
  no deployment, no Strategy Lab work, no TSLA/MSFT study, no edit of `OPTIMIZATION_STANDARD.md` or NL0 1.0.0.
- No new search; only small targeted replays of already-sealed fold selections on development doors (2016–2024).
  2025–2026 (FULL) is never opened by this study.
- Completed studies' records are read only; never edited, re-sealed or rerun as stages.

## Stages

| Stage | Status | Notes |
|---|---|---|
| S0 setup (brief, branch, checkpoint) | running | |
| S1 protocol + adoption + preflight | not started | |
| S2 experiment audit from sealed records | not started | |
| S3 targeted replays (trade-level chronology) | not started | |
| S4 selection diagnosis | not started | |
| S5 report, tables, final checkpoint, commit, push | not started | |
