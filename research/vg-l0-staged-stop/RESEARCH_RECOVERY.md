# RESEARCH_RECOVERY — Priority 4: staged trailing stops (S1), GPU implementation and paired optimization

## Top screen

- **Updated:** see the stage table (UTC, `date -u`). **Status: INCOMPLETE — E1 CPU reference committed; next E2 (CUDA).**
- **Brief:** `brief/BRIEF.md` (verbatim copy of the user's upload), sha256
  `720e0b36e815b111a5deac41c7454bd497224dd78c10adaa01fa8017d78998ae`, 295 lines / 30,788 bytes; final line
  "**PRIORITY 4 COMPLETE — NO STRATEGY ADOPTED OR DEPLOYED — AWAITING REVIEW**" present (not truncated).
- **Authorized:** E0–E5 engineering, ablations, paired CTRL/EXP search, informed lanes, qualification, chronological
  checks, reports, ZIP, commit and push of the research branch. **Not authorized:** adoption, merging into `main`,
  deployment, broker access, editing frozen New L0 / N/original research.
- **Running processes:** none.
- **Next step:** E2 — port staged-stop@1 to CUDA (gb.h v3 layouts, gb_common/gb_d1/gb_growth, server supported set),
  host encode/decode/layout/lab/domain; then the gpu-phase8 acceptance study (E3/E4).

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
| E0 read + spec freeze | complete 2026-11-23T12:00Z | `RULE_SPECIFICATION.md` (commit `3aa51963`; later wording-only edits none) |
| E1 CPU reference + OFF parity | complete (CPU side) 2026-11-23 | Growth 1.4.0 baseline fixture `62574e98` (captured on the unedited engine, sha256 `f7b50992…`); `src/staged-stop/`, `src/d1-risk-controls-rc3/`, Growth engine revision 1.5.0 (`riseTrading.ts`, `optionalRules.ts`), `books.ts` pass-through. Tests: config 12/12, RC 3 book 13/13, Growth staged 7/7, Growth OFF parity 9/9 (fixture), pooled D24 3/3 (New L0 $382,721.46 / $19,459.83 and N/original $388,031.02 / $19,459.83 reproduced), existing D1/RC/Growth/pool suites 420/420 |
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

## Disclosures (for the final report)

- 2026-11-23T12:20–12:21Z: the development smoke tool `tools/gpu-phase8/smoke-staged.ts` first opened D24 and D21
  through Priority 3's logging `openDoor`, appending two lines to the completed study's
  `research/vg-d1-growth-joint/results/doors.jsonl`. Detected at 12:4xZ, restored with `git checkout` (only those two
  lines differed; never committed); the tool now uses `src/gpu-phase8/context.ts openDoor` (Phase 8's own log).

