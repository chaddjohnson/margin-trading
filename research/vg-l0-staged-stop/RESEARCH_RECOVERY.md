# RESEARCH_RECOVERY — Priority 4: staged trailing stops (S1), GPU implementation and paired optimization

## Top screen

- **Updated:** 2026-11-23T11:50Z (UTC, `date -u`). **Status: INCOMPLETE — stage E0 (reading and specification).**
- **Brief:** `brief/BRIEF.md` (verbatim copy of the user's upload), sha256
  `720e0b36e815b111a5deac41c7454bd497224dd78c10adaa01fa8017d78998ae`, 295 lines / 30,788 bytes; final line
  "**PRIORITY 4 COMPLETE — NO STRATEGY ADOPTED OR DEPLOYED — AWAITING REVIEW**" present (not truncated).
- **Authorized:** E0–E5 engineering, ablations, paired CTRL/EXP search, informed lanes, qualification, chronological
  checks, reports, ZIP, commit and push of the research branch. **Not authorized:** adoption, merging into `main`,
  deployment, broker access, editing frozen New L0 / N/original research.
- **Running processes:** none.
- **Next step:** finish E0 reading of the live code paths; write `RULE_SPECIFICATION.md` (E0 freeze of the engineering
  spec) before writing engine code.

## Environment

- Main checkout (no extra worktree). Branch `research/vg-l0-staged-trailing-stop`, created 2026-11-23T11:49Z from
  `research/vg-l0-trailing-stop-audit` `5d587bb28860967327a9f1b1263154b26f144e8c` (clean). `main` = `3606f4b3`.
- Node 24.21.0 (`.node-version`); every evaluating process `node --no-maglev`.
- GPU: RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, driver 595.91.07, 763 MiB used at start.
- Acceptance in force at start: `config/gpu-backend/acceptance.json` sha256
  `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED, binary gb7 `cb2ff30b…`).
  It becomes STALE at the first edit of an evaluation-manifest file (expected; a new acceptance study is required).

## Planned namespaces

- Study: `research/vg-l0-staged-stop/` (protocol, amendments, adoption, seals, reports) with code in
  `src/vg-l0-staged-stop/` and non-official tools in `tools/vg-l0-staged-stop/`.
- Acceptance study for the staged-stop GPU delivery: `research/gpu-phase8/` (tools in `tools/gpu-phase8/`).
- CPU rule modules: `src/staged-stop/`, `src/d1-risk-controls-rc3/`, Growth 1.5.0 in `src/growth-trading/`.

## Stage table

| Stage | Status | Output |
|---|---|---|
| E0 read + spec freeze | running | — |
| E1 CPU reference + OFF parity | not started | — |
| E2 CUDA port | not started | — |
| E3 parity campaign | not started | — |
| E4 acceptance + regression | not started | — |
| E5 benchmark + protocol freeze | not started | — |
| Ablations | not started | — |
| Paired search C19/C21/C24 + informed | not started | — |
| Qualification / selection / intervals / validation | not started | — |
| Reports, ZIP, push | not started | — |

## Guards

- Do not edit any completed study's files (`research/vg-l0-full-joint/`, Stage B, audit, …).
- Do not open FULL or any next-interval door before the corresponding sealed, committed selection.
- No official evaluation before a new ACCEPTED acceptance record and a frozen, committed protocol.
