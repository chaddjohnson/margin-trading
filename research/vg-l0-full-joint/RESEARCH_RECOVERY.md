# RESEARCH_RECOVERY — Assignment 3: New L0 risk-aware successor, full joint optimization

## Top screen

- **Updated (UTC):** 2026-11-15T11:58Z (from `date -u`).
- **Status:** **INCOMPLETE.** Stage: implementation (engineering) — nothing evaluated yet; no protocol frozen.
- **Authority:** brief `brief/BRIEF.md` (the user's "Claude Code — Assignment 3: New L0 Risk-Aware Successor, Full Joint
  Optimization", 296 lines, 30,356 bytes, sha256 `5620330a52e569f73e18d397cda1d7725f0275b2db464e2c67f7c322340ad9ba`, read
  in full to its final "Success criterion"). Protocol: not yet written (`PROTOCOL.md` will be the authority once frozen).
  Standard `docs/research/OPTIMIZATION_STANDARD.md` 2.2.0 (`0085cff2…`, registered current); reference method NL0 1.0.0
  (`9b387bb4…`).
- **Stages:** none complete.
- **Running processes:** none.
- **Next step:** implement `src/vg-l0-full-joint/` (space, search, qualification, selection, folds, final, stage V),
  tests first for new integration behaviour.

## Environment

- Main checkout `/home/chad/projects/margin-trading` (no extra worktree), branch `research/vg-l0-full-joint` created
  2026-11-15T11:56:59Z from `73d3a74818ab97d0fe69b59b10bebf6ec2ba849d` (the verified tip of `research/vg-l0-risk-families`
  = its remote; contains `main` = `108c241b`). Working tree clean at creation.
- Node v24.21.0 (`.node-version`); host 16 logical CPUs, 59 GiB RAM.

## Source evidence read before planning (2026-11-15)

- `CLAUDE.md`, `docs/claude/context-recovery.md`, the standard 2.2.0 in full, NL0 1.0.0 in full.
- Assignment 2 (`research/vg-l0-risk-families/`): REPORT (`59d31622…`), ASSIGNMENT3_HANDOFF (`4f3aa85d…`, a proposal, not
  binding), PROTOCOL (`7e803dc4…`), SPECIFICATION_RC2, TEST_REPORT, AMENDMENTS, RESEARCH_RECOVERY, STANDARD_ADOPTION,
  FROZEN_SELECTION (`4174ae53…`); its code `src/vg-l0-risk-families/`, RC 2 `src/d1-risk-controls-rc2/`.
- 5B code (`src/vg-lifecycle-matched-optimization/`: config, search, controls) and its sealed FROZEN_SELECTION.json
  (`cd223a0d…`): crossTestSubjects R01 New L0 `67cfdd9b62d1e16f`, R14 IJ1 `940fdaf770eedc9d`, R20 C4 `2f49a1cc226b4ece`,
  R21 C4-refined `0f017f0ab9b26f24`.

## Guards

- Do not edit any earlier study's files; Assignment 1/2 sealed records stay as they are.
- FULL (2025–2026) opens only for New L0 under legacy defaults in stage V (precedent AD3) and otherwise only after this
  study's `FROZEN_SELECTION.json` is sealed and committed.
- No merge into `main`, no deployment, no broker access.
