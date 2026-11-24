# RESEARCH_RECOVERY — Priority 5: comprehensive N/original successor optimization (P5-NS)

## Top screen

- **Updated:** 2026-11-24T12:25Z (clock). **Status: INCOMPLETE — Phase C engineering gates in progress; protocol DRAFT
  (not frozen); no official evaluation run.**
- **Done:** setup; Phase A (`METHOD_AND_BUDGET_RECONSTRUCTION.md` + `reports/phase-a/*`); code `src/vg-l0-n-successor/`,
  tools `tools/vg-l0-n-successor/`; draft `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json` (preflight PASS);
  gates E1 (acceptance VERIFIED), E2 (references GPU = CPU = sealed; C24 evidence = Assignment 3), E4 (parity 0 / 5,420)
  PASS; unit tests 19/19.
- **Running:** unit `vgl0ns-e3` (gate E3: Assignment 3 lanes reproduced on the GPU), log
  `research/vg-l0-n-successor/results/logs/E3.log`, output `results/engineering/E3-a3-lanes.json`.
- **Next:** E3 → E5 (`--step interrupted` then default) → E6 → pilot (`--step broad`, `--step informed`, then summary) →
  set `replicates.informedBase` = the pilot's R_N → E7/E8 test records → finalize protocol numbers → `adoption.py` →
  commit → `npm run vg-l0ns -- gates` → commit → `freeze` → commit → chain.
- **Brief:** `brief/BRIEF.md` sha256 `7163f8db78ca520ff1d20c76ee395f652bdcde4f910b7988cd7bd9e29a34ec79` (356 lines, complete).
- **Authorized:** protocol, verification, GPU optimization, validation of frozen selections, reports, commit + push of the
  research branch, portable ZIP. **Not authorized:** adoption, official config changes, merge into `main`, deployment,
  broker access, editing frozen New L0 / N/original / I1 research.

## Environment

- Main checkout `/home/chad/projects/margin-trading` (no extra worktree). Branch `research/vg-l0-n-original-successor` from
  `5d587bb28860967327a9f1b1263154b26f144e8c` (tip of `research/vg-l0-trailing-stop-audit`, the last S1-free revision).
- `.git/info/exclude` (local) hides the Priority 4 branch's ignored dirs present in this checkout: `research/gpu-phase8/`
  (28 GB) and `research/vg-l0-staged-stop/` (64 GB). Never stage them. `research/vg-l0-n-successor/.gitignore` ignores
  `cache/`.
- Node 24.21.0; every evaluating process `node --no-maglev`; units via `tools/vg-l0-n-successor/launch.sh <unit> <abs log>
  -- <cmd>` in `vgl0ns.slice` (44G/48G/0).
- Acceptance in force: `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`
  (GPU Phase 7; binary gb7 `cb2ff30b…`), out-of-band pin `~/.local/share/margin-trading-gpu/acceptance-pins/`.

## Stage table

| Stage | Status | Output |
|---|---|---|
| Setup | complete 11:40Z | brief, checkpoint |
| Phase A | complete 12:20Z | `METHOD_AND_BUDGET_RECONSTRUCTION.md`; drafts `reports/phase-a/{3B-5B,A3,P4-StageB-GPU}.md` (sha256 4a135aab…, 295ebbaf…, 0f1e11ca…) |
| Code + tests | written; unit tests 19/19 | `src/vg-l0-n-successor/*`, `tools/vg-l0-n-successor/*` |
| E1 | PASS 12:0xZ | `results/engineering/E1-acceptance.json` |
| E2 | PASS 12:13Z | `results/engineering/E2-references.json` |
| E3 | running | `results/engineering/E3-a3-lanes.json` |
| E4 | PASS 12:2xZ | `results/engineering/E4-parity.json` |
| E5, E6, pilot (E9), E7, E8 | not started | — |
| Protocol freeze | not started | `results/protocol-freeze.json` |

## Commands (repository root)

- Engineering: `tools/vg-l0-n-successor/launch.sh vgl0ns-<x> /home/chad/projects/margin-trading/research/vg-l0-n-successor/results/logs/<X>.log -- env GPU_POLICY_PURPOSE=<parity-test|benchmark> npm run vg-l0ns-eng -- <e1|e2|e3|e4|e5|e6|pilot> [--step …]`
- Adoption: `python3 -I tools/vg-l0-n-successor/adoption.py "$(date -u +%Y-%m-%dT%H:%M:%SZ)"`; preflight `npm run research-preflight -- --study research/vg-l0-n-successor`.

## Guards

- Do not edit any completed study's files. FULL only via E2 (known-target references) before the freeze, then the single
  validation. No official evaluation before the sealed, committed freeze and gates.

## Disclosures

- (none yet)
