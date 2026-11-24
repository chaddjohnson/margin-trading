# RESEARCH_RECOVERY — Priority 5: comprehensive N/original successor optimization (P5-NS)

## Top screen

- **Updated:** 2026-11-24T23:15Z (clock, UTC). **Status: COMPLETE — research and reports done; delivery (commit, push,
  ZIP) recorded in "Delivery" below.**
- **Outcome (sealed `results/outcome.json` sha256 `75531dd7bb0d66a4ca3b91274832bd73d9e6f47d9223ea2344607c21cab2e977`):
  NO MATERIAL IMPROVEMENT — keep N/original as the preferred research incumbent and New L0 as the frozen benchmark.**
  Nothing adopted, deployed, merged or sent to a broker.
- **Protocol:** `PROTOCOL.md` P5-NS 1.0.0 FROZEN, sha256 `2a980c3b297e397aac39eead12295b2eb3773f3cfb5f638fe776f94ee6c57dac`;
  freeze `results/protocol-freeze.json` `41b40d79371e76e18d9c4d7b4040ebc5bdb7a6f15fdd8094b664401c758a8471` (commit
  `28f26ae6`); gates `results/engineering/gates.json` `64f3d4f187d6fd0b11c1613060c64f3f3029b3f2612d4bdf6ccb30d4ed40b3ea`
  (commit `7d911b4b`). Amendments: none. Standard 3.0.0 (pinned; no departure).
- **Running:** nothing (chain unit `vgl0ns-chain` finished 2026-11-24T22:56:27Z `CHAIN COMPLETE`; diagnostic units
  finished by 23:00:14Z — families.json written 23:00:09Z).
- **Next (for the user, not for a session):** review the handoff `bundle/vg-l0-n-successor-handoff.zip`; decisions F1–F5
  in `DECISION_REGISTER.md`. A new session has **nothing to rerun**.
- **Brief:** `brief/BRIEF.md` sha256 `7163f8db78ca520ff1d20c76ee395f652bdcde4f910b7988cd7bd9e29a34ec79`.

## Environment

- Main checkout `/home/chad/projects/margin-trading` (no extra worktree). Branch `research/vg-l0-n-original-successor` from
  `5d587bb28860967327a9f1b1263154b26f144e8c`. Outside `research/vg-l0-n-successor/`, `src/vg-l0-n-successor/` and
  `tools/vg-l0-n-successor/` the branch changes only `package.json` (three npm scripts). `main` untouched.
- `.git/info/exclude` (local) hides `research/gpu-phase8/` and `research/vg-l0-staged-stop/` (Priority 4 branch caches).
  Never stage them. `cache/` and `logs/` of the study are git-ignored.
- Node 24.21.0, `--no-maglev`; GPU RTX 5090 `GPU-ae5f222c…`; acceptance `bb0e3fcf…` re-VERIFIED after the run.

## Stage table (all complete)

| Stage | Completed (UTC) | Record (sha256) |
|---|---|---|
| Setup, Phase A | 2026-11-24 11:40 / 12:20 | `METHOD_AND_BUDGET_RECONSTRUCTION.md`, `reports/phase-a/*` |
| Engineering E1–E9 (final-code reruns of E2–E6) | 13:45 | `results/engineering/gates.json` `64f3d4f1…` |
| Protocol freeze | 13:45 | `results/protocol-freeze.json` `41b40d79…` |
| C19 Track F (rounds F-1, F-2 fired; F-3 converged; R101–R106) | 15:29 | `results/{search,rounds,qualification,refine-plan,selection,slices}/C19*` |
| C21 Track F | 17:08 | `results/*/C21*` |
| C23 Track F | 18:55 | `results/*/C23*` |
| Sequential (F/original UNSUPPORTED) | 18:55 | `results/sequential.json` `d9485e9b6aab621e1008a516cd5aecd386c46a368840f7984191d83256aa0f17` |
| C24 Track F + Track N (round N-1 converged) + qualification | 22:55 | `results/*/C24*` |
| C24 selection + successor pre-determination (no candidate) | 22:55:45 | `results/selection/C24.json` `015f8c8297ca2cd7f1da33d5bcad748d505b09e1c0b678752826a946b76e68e3` |
| Frozen selection | 22:55:46 (commit `308703d1`) | `FROZEN_SELECTION.json` `ea23a040f620c86f95c3799b0051bea6705d6f3421bfd79770c1d4840e512a0c` |
| FULL authorization | 22:55:46 (commit `d48b0d77`) | `results/doors/FULL-authorization.json` `d6255b16cc59ffd8afe9343938c98b89ca0e0f778e61d85a2b42875e8b9c1c8d` |
| Validation (FULL, once) | 22:56:26 (commit `7f4968f3`) | `results/validation/validation.json` `451cdce6acf879c49ad19859ea4c45c2c70cadb11a19ea214247abb6dde5e028` |
| Outcome | 22:56:27 (commit `f08e0279`) | `results/outcome.json` `75531dd7…` |
| Report-only diagnostics (chain CPU, lots D24/FULL, tail, families) | 23:00:14 | `reports/diagnostics/*.json` |
| Tables (`analyze.ts`, incl. `lanes.csv`) | 23:12:17 | `reports/tables/*` |
| Reports (READ_FIRST, REPORT, FINAL_CANDIDATES, ROBUSTNESS_AND_RISK, CHRONOLOGICAL_VALIDATION §4, SEARCH_AND_CONVERGENCE, DECISION_REGISTER R/F, GPU_PARITY §3) | 23:15 | the study directory |

`results/seals.jsonl` (50 seals; sha256 `9a37ac4a84f22935f6a94510779cbcf1440e0fb5c481d7d0a775ad1b8d41bc2f`): **all 50
re-verified** at 23:14Z. `results/doors.jsonl` records every door opening; the nine openings after 22:56:27Z are the
report-only diagnostics (after the outcome).

## Key results (for orientation; the sealed records rule)

- 44,569,440 requested official GPU evaluations; 1,496 lanes; 0 budget-bound; CPU-scored 0; 29 jobs / 29 attestations.
- Track F C24 best $289,140.53 / $28,508.07; F/original sequential −$35,958.68 / $90,945.51 (unsupported).
- Track N best `C24/informed/GB.VA/R103#1 profit` $391,852.16 / $19,459.83 (+$3,821 vs N/original; immaterial);
  2025–26 = N/original's $94,669.70 / $20,385.99.
- No finalist and none of 1,726 qualified C24 members meets the P or R band; near-miss −$2,492 p90 DD (disclosed).

## Guards

- **Do not rerun anything.** Every stage is sealed; FULL has been opened once for the validation. Do not edit the
  protocol, the sealed records or any other study's files.
- Job archives `cache/jobs/*` (196.0 GB; the whole `cache/` 218.6 GB; hashes in `reports/diagnostics/job-archives.sha256`) stay uncompressed until the
  user decides (F3).

## Disclosures

- E5's first resume refused (archive bound to an earlier code digest) → E2–E6 rerun on the final code (tag `final`).
- The pilot and E3 ran concurrently on the GPU (pilot throughput figures are planning figures under contention).
- `chains/tests.sh` first ran the all-studies preflight without `--all`; corrected and rerun by hand (29/29 PASS).
- Early checkpoint times were estimates; corrected to clock times.
- One Track N member came within $7.69 of the precommitted risk band (`REPORT.md` §6.3); the band was not changed and the
  member was not evaluated on FULL.

## Delivery

(Filled after the push.)
