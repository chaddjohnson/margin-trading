# RESEARCH_RECOVERY — Assignment 2: D1 risk-control families and risk-aware candidate selection

## Top screen

- **Updated (UTC):** 2026-11-14T01:20Z (from `date -u`).
- **Status:** **INCOMPLETE** — stage 0 (setup). Nothing searched, nothing evaluated on real data.
- **Current stage:** RC 2 implementation (entry-day protective-stop activation) in `src/d1-risk-controls-rc2/`.
- **Authority:** brief `brief/BRIEF.md` sha256 `aaf36fbc390b59e3f9ca3a21936aac93eef2ac3374cb3dceca94197d9d89cac8`
  (268 lines, 29,946 bytes; read in full to its final "Success criterion" line). Protocol: not yet written.
- **Running processes:** none.
- **Next command:** implement and test RC 2 (synthetic tests), then write `PROTOCOL.md` before any real-data run.

## Environment

- Main checkout `/home/chad/projects/margin-trading` (no extra worktree), branch `research/vg-l0-risk-families`, created
  from `26014af179cab39436a385862946c7f843e04eac` (`research/vg-l0-risk-controls-foundation` tip, verified = origin).
  `main` = `origin/main` = `108c241b` (documentation-only standard 2.2.0).
- Node v24.21.0 (`.node-version`). Host: 16 logical CPUs, 59 GiB RAM.

## Decisions made so far (on disk here; to be carried into PROTOCOL.md)

1. RC 1 (`src/d1-risk-controls/`) stays byte-identical (its files are pinned by the foundation's freeze); RC 2 is a new
   module `src/d1-risk-controls-rc2/` that extends it.
2. Pre-2016 VGT/GDX history: none on the machine (every dataset in `data/` and `/srv/ai-trading/data` starts
   2016-01-04; the Hugging Face minute dump "goes back to 2016"). No external download or purchase (brief §5.4). The tail
   stress uses a labelled in-sample 2016–2024 stress, synthetic gap scenarios and an in-repository peer proxy.

## Guards

- No real-data evaluation of a non-default control's performance before the RC 2 gates pass and the protocol is
  committed. FULL opens only for New L0 under legacy defaults until `FROZEN_SELECTION.json` is sealed and committed.
- Do not edit `src/d1-risk-controls/`, NL0, the standard, or any earlier study's files.
