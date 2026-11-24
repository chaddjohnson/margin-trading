# RESEARCH_RECOVERY — Priority 5: comprehensive N/original successor optimization (P5-NS)

## Top screen

- **Updated:** 2026-11-24T13:47Z (clock). **Status: INCOMPLETE — official chain RUNNING (C19 → C21 → C23 → sequential →
  C24 incl. Track N → frozen selection → FULL once → outcome).**
- **Protocol:** `PROTOCOL.md` P5-NS 1.0.0 **FROZEN** — sha256 `2a980c3b297e397aac39eead12295b2eb3773f3cfb5f638fe776f94ee6c57dac`;
  freeze record `results/protocol-freeze.json` sha256 `41b40d79371e76e18d9c4d7b4040ebc5bdb7a6f15fdd8094b664401c758a8471`
  (code digest `cd31849e3ab0d6bb…`, acceptance `bb0e3fcf…`), commit `28f26ae6`. Gates `results/engineering/gates.json`
  sha256 `64f3d4f187d6fd0b11c1613060c64f3f3029b3f2612d4bdf6ccb30d4ed40b3ea` (E1–E9 PASS), commit `7d911b4b`. Amendments: none.
- **Running:** unit `vgl0ns-chain` (`/bin/bash research/vg-l0-n-successor/chains/chain.sh`), log
  `research/vg-l0-n-successor/results/logs/chain.log`; each stage is a sub-unit `vgl0ns-<C>-<stage>` with log
  `results/logs/<C>-<stage>.log`; the chain commits each sealed block itself.
- **Next:** wait for the chain (`grep -E "^=== .*(begin|end|COMPLETE|committed)|FAILED" results/logs/chain.log`). If it
  stops: inspect the failing stage log; rerun the SAME chain command (idempotent: sealed stages are skipped, an
  interrupted job resumes with --resume). After `CHAIN COMPLETE`: report-only diagnostics (`npm run vg-l0ns-diag --
  chain | lots --door D24 | lots --door FULL | tail | families` with GPU_POLICY_PURPOSE=diagnostic or cpu-reference),
  tables (`node --no-maglev --experimental-transform-types tools/vg-l0-n-successor/analyze.ts`), reports, ZIP, push.
- **Brief:** `brief/BRIEF.md` sha256 `7163f8db78ca520ff1d20c76ee395f652bdcde4f910b7988cd7bd9e29a34ec79` (356 lines, complete).
- **Authorized:** protocol, verification, GPU optimization, validation of frozen selections, reports, commit + push of the
  research branch, portable ZIP. **Not authorized:** adoption, official config changes, merge into `main`, deployment,
  broker access, editing frozen New L0 / N/original / I1 research.

## Environment

- Main checkout `/home/chad/projects/margin-trading` (no extra worktree). Branch `research/vg-l0-n-original-successor` from
  `5d587bb28860967327a9f1b1263154b26f144e8c` (tip of `research/vg-l0-trailing-stop-audit`, the last S1-free revision).
- `.git/info/exclude` (local) hides the Priority 4 branch's ignored dirs: `research/gpu-phase8/` (28 GB),
  `research/vg-l0-staged-stop/` (64 GB). Never stage them. `research/vg-l0-n-successor/.gitignore` ignores `cache/`.
- **Do not edit** `src/vg-l0-n-successor/**`, `package.json`, `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json` while
  the chain runs (the official guards refuse a dirty code closure or protocol; a post-freeze change needs an amendment).
  Avoid manual commits while a chain stage may be committing (git index lock).
- Node 24.21.0; `node --no-maglev`; units in `vgl0ns.slice` (44G/48G/0); GPU RTX 5090 `GPU-ae5f222c…`.
- Disk at freeze: 451 GB free; expected archives 210–330 GB (4,741 bytes per fresh evaluation); reserve 60 GiB enforced.

## Stage table

| Stage | Status | Output |
|---|---|---|
| Setup, Phase A | complete 11:40Z / 12:20Z | `METHOD_AND_BUDGET_RECONSTRUCTION.md`, `reports/phase-a/*` |
| Engineering E1–E9 | complete; reruns of E2–E6 on the final code (tag `final`) 13:19–13:45Z | `results/engineering/*.json`, `results/engineering/pilot/*`, `results/engineering/tests/*` |
| Gates sealed | complete 13:45Z (`7d911b4b`) | `results/engineering/gates.json` |
| Protocol freeze | complete 13:45Z (`28f26ae6`) | `results/protocol-freeze.json` |
| Official chain | RUNNING from ~13:48Z | `results/{search,rounds,qualification,refine-plan,selection,slices,sequential.json,validation,outcome.json}`, `FROZEN_SELECTION.json` |

## Constants (frozen; `npm run vg-l0ns -- bound`)

- Schedules = Assignment 3's (NL0) with island caps 16; NL0 caps 6 (broad) / 8 (refine, informed); lane caps 90,000 /
  174,000 / 171,000; replicates R101–R104 broad and refine, R101–R108 Track N (R_N = 8), ≤ 4 replicate rounds per track and
  cutoff at a 2 % union trigger; per member 655, per subject ≤ 306; ceiling 80 M requested; launch 1.5 × expected; disk
  reserve 60 GiB. Successor thresholds: P +$10,000 centre & +$5,000 confirmation robust (risk within $2,500); R −$2,500
  confirmation p90 DD (profit within $2,500); replicated in ≥ 2 replicates; V1–V3.

## Guards

- Do not rerun sealed stages (they refuse). FULL opens once (validation job) after the sealed, committed frozen
  selection and authorization. Do not edit any completed study's files.

## Disclosures

- E5's first attempt: the resume of the interrupted engineering run was refused (archive bound to an earlier code digest
  after a pre-freeze code fix) — the binding working as designed; E5 and E2–E6 were rerun on the final code.
- The pilot's two steps and E3 ran concurrently on the GPU (time-sliced): the pilot's throughput figures (835 / 358
  requested per second) are planning figures under contention, not Mode S measurements.
- `chains/tests.sh` first ran the all-studies preflight without `--all` (usage error); corrected and rerun by hand
  (29/29 PASS) before the E8 record.
