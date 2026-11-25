# RESEARCH_RECOVERY — Priority 6: TSLA D1 + Growth (study `research/tsla-d1-growth/`)

## Top screen

- **Updated:** 2026-11-25T20:05Z (clock, UTC). **Status: INCOMPLETE — the official chain is RUNNING (C19 COMPLETE at
  14:24:35Z; C21 COMPLETE at 16:34:18Z; C23 COMPLETE at 19:46:18Z; sequential verdicts sealed 19:43:21Z — every arm
  UNSUPPORTED; C24 started 19:46:18Z).** Relaunched once after code amendment A1 (14:02:08Z; chain-log line offset 229).
- **Protocol:** `PROTOCOL.md` P6-TSLA 1.0.0 **FROZEN**, sha256 `d5d462dc906910df4c2372021a44966db633f27019d0d93f9d04758e6686b62e`;
  freeze `results/protocol-freeze.json` `d197e9d73feec2edd2f9c250640d22310118977bcdfa31943c3b9103bfbbfe97` (commit `b2667d83`,
  **pushed**: `git ls-remote` = local); frozen code digest `418a8758…`; gates `results/engineering/gates.json`
  `4bf79aa97d6ae00cf4d66d2ef672889a898fca731773fabaa568c13ef7a0923b` (E1–E9 pass). Amendments: pre-freeze notes E1, E2; after the freeze **A1** (code defect fix, commit `fa18250a`;
  sealed `results/amendments/A1.json` sha256 `84557f0c53db4979556db4e4491b17a121eae658949723952628da74bd483024`, commit
  `bb8fb5a4`): allowed code digests `418a8758…` → `fb7e6ddc5dee614b9112f52acc03c8f18ce02f6dd1f9d0f7570147c58ac84fd0`.
- **Running:** systemd user unit **`tsla-chain`** (`/bin/bash research/tsla-d1-growth/chains/chain.sh`, all cutoffs; first
  started 2026-11-25T12:21:57Z, stopped 13:58:13Z at C19-S-refine (A1), relaunched after A1 — see the chain log; log `research/tsla-d1-growth/cache/logs/chain.log`; per-stage logs `cache/logs/chain/<stage>.log`;
  each stage its own unit `tsla-<stage>` in `tsla.slice`). Every sealed block is committed by the chain itself.
- **Next:** wait for `CHAIN COMPLETE` (C24 → FROZEN_SELECTION → FULL authorization → validation once → outcome → zstd).
  Then, in order (commands in `RUN_COMMANDS.md` Phase 7): diagnostics `bh`, `tail`, `lots`, then `nbhd` (unit tsla-nbhd);
  `analyze.ts`, `tables-md.ts`, `arm-reports.ts`; `gpu-jobs.py` (must exit 0); `search-report.py`; `jobzstd.py final`;
  fill every `<!-- PENDING… -->` marker (`grep -rn PENDING research/tsla-d1-growth/*.md research/tsla-d1-growth/reports/narrative`);
  write READ_FIRST, REPORT (§2 = `reports/narrative/METHOD.md`), COMPARISON, FINAL_CANDIDATES, ROBUSTNESS_AND_RISK,
  reports/narrative/SEARCH.md, GPU_PARITY_AND_ACCEPTANCE §4, DECISION_REGISTER U; commit, push, verify `git ls-remote`;
  `tools/tsla-d1-growth/bundle.sh <scratch> $(git rev-parse HEAD)`; commit the ZIP under `bundle/`; push; verify.
- **Reporting drafts already committed (during the chain):** `CHRONOLOGICAL_VALIDATION.md` (folds, verdicts; C24 pending),
  `reports/narrative/{METHOD,NOTES,D,G,C,J,S}.md`, `DECISION_REGISTER.md` §F, tools `search-report.py`, `gpu-jobs.py`,
  the `bh` fresh-purchase control (R2) and the exposure-table fix (R1). Generated reports (arm reports, `reports/tables/`)
  are regenerated at the end and committed then.
- **If the chain stopped (FAILED in the log or the unit inactive without "CHAIN COMPLETE"):** read the failing stage's log;
  fix only operational problems (never a rule; a code defect needs a sealed code amendment `A*` per PROTOCOL §17); then
  relaunch the SAME chain command — it is idempotent (sealed stages are skipped; an interrupted job resumes with
  `--resume`, the official gate runs again and the job replays its archive):
  `tools/tsla-d1-growth/launch.sh tsla-chain $PWD/research/tsla-d1-growth/cache/logs/chain.log -- /bin/bash $PWD/research/tsla-d1-growth/chains/chain.sh`
  — first confirm no `tsla-*` unit is active (`systemctl --user list-units 'tsla-*'`).

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch **`research/tsla-d1-growth`** (from `dc023c3b`), pushed to
  `origin/research/tsla-d1-growth`. `main` untouched. `.git/info/exclude` hides `research/gpu-phase8/`,
  `research/vg-l0-staged-stop/` (never stage).
- GPU acceptance `bb0e3fcf…` VERIFIED; first official attestation (C19-D-broad): all 16 checks, parity mini-set 18/18 on
  the TSLA door. Node 24 `--no-maglev`. Alpaca credentials only in the git-ignored `.env`.

## Stages

| Stage | Status | Record |
|---|---|---|
| 0 / 0A storage | complete | `STORAGE_PRESERVATION_REPORT.md`, `storage/*` (29/29 P5 archives; 179.8 GB recovered; other caches audited, nothing deleted) |
| 2 data | complete | `TSLA_DATA_AUDIT.{json,md}`, `data/*` |
| 3 functionality audit | complete | `FUNCTIONALITY_AUDIT.md` |
| 4 protocol | **frozen** 12:20Z | see the top screen |
| 5 engineering | complete | E1–E9 sealed (`results/engineering/`) |
| 6 C19 | **complete** 14:24:35Z (A1 at 14:01Z; C19-S-refine then ran) | selection `b41af173…`, slice `8ce42df6…`, frozen D1 `a2f2017c…`, pairs `2318780e…`; per arm C `38d484a2…`, D `5dbf7571…`, G `c9817da9…`, J `e0c0b868…`, S `eae07a2e…` (all under `results/`; zstd of the C19 job archives committed `c5ae888e`) |
| 6 C21 | **complete** 16:34:18Z | selection `18b591c5…`, slice `46495615…`, frozen D1 `1b712383…`, pairs `4ffb0de1…`; per arm C `c361e101…`, D `f5835e8e…`, G `ad98ccb2…`, J `f5db5652…`, S `67dcf9c2…` (zstd committed `c7bdd111`) |
| 6 C23 | **complete** 19:46:18Z | selection `a4056d8d…`, slice `c179935d…`, frozen D1 `2a39a235…`, pairs `6992372a…`; per arm C `41c127fa…`, D `66088ada…`, G `afc56360…`, J `0692ce1f…`, S `eef92bb6…` (zstd committed `3f1c019b`) |
| 6 sequential | **complete** 19:43:21Z | `results/sequential.json` `2a1079a0…` (commit `8ab3f216`): D, G, C, J, S all **unsupported** (sequential DD > $35,000; nets positive) — see `reports/narrative/NOTES.md` |
| 6 C24, validation, outcome | running (C24-D-broad since 19:46:18Z) | then FROZEN_SELECTION, FULL authorization, validation once, outcome (chain.sh lines 92–101) |
| diagnostics, reports, ZIP | not started | `tools/tsla-d1-growth/diagnostics.ts` written (after validation only) |

## Constants

Seeds `deriveSeed('tsla-d1-growth', …)`; replicates from R101 (D 4, G 8, J 4, S R_S(F) = max(4, ⌈160/(6F)⌉)); rounds ≤ 4
at 2 %; refinement 4 lanes per refined cell (quotas D 8, G 6, J 16, S 12; ≤ 24 seeds); per-lane bounds 90,000 / 174,000;
hard ceiling 120 M requested; doors D19/D21/D23/D24 training, slices D21/D23/D24, FULL once (validation).

## Guards

- **Do not rerun** a sealed stage (the code refuses). Do not edit the protocol, sealed records or other studies.
- FULL opens only through the chain's validation after FROZEN_SELECTION.json and the FULL authorization are committed.
- Priority 5's archives: restore with `zstd -d -q <arc>.zst -o <arc>` before any read.
- No broker, deployment, merge into `main`, MSFT.

## Tool readiness (during the chain; no official record touched)

- 2026-11-25T12:31Z `storage/tools/jobzstd.py` tested end to end on the completed job C19-D-broad with `--keep-original`
  and a SCRATCH actions file (session scratchpad): z-verified, integrity ok, 96/96 sealed ids reproduced, 1,927,417,856 →
  132,096,152 bytes in 6 s; the test `.zst` was removed (single file) so the chain's own run starts clean.
- `tools/tsla-d1-growth/diagnostics.ts` gained `TSLA_DIAG_TEST=D19` (C19 selection, door D19, CPU nbhd, outputs to
  git-ignored `cache/diag-test/`) to exercise bh/tail/lots/nbhd before the validation. **Run 2026-11-25T14:25:44Z–14:25:58Z
  after C19's selection was sealed: all four exit 0** (bh: unfinanced 2016-01-04 → 2019-12-31 +$81,155.09, financed
  +$37,245.50 = −$43,909.59 of 11 % simple interest, as computed by hand; tail, lots: every C19 subject; nbhd: 5 arm
  primaries × small/wide on the CPU, 4 workers). Door log entries labelled "ENGINEERING TEST" (D19, use diagnostic). `analyze.ts` (tables JSON/CSV), `tables-md.ts` (TABLES.md) and `bundle.sh` (handoff ZIP) are written;
  tools type-check (scratch tsconfig over tools/ + src/tsla-d1-growth) and lint clean. `engineering.ts` line 438: a
  type-only cast fix (`as unknown as`), erased at run time.
- Git while the chain runs: read-only commands with `GIT_OPTIONAL_LOCKS=0`; commit only while a long stage is running
  (the chain commits between stages; an index.lock collision would stop it — then relaunch, it is idempotent). Do not
  edit package.json or the protocol documents during the chain (`dirtyCode` checks them).

## Disclosures so far

- **A1 (after the freeze):** C19-S-refine stopped at 13:58:13Z before any job or evaluation: the arm S refinement lane
  builder did not register the sealed frozen D1 finalists. Three-line fix (`ensureFrozen` for arm S, as every other S
  reader does), sealed code amendment, no rule or result changed; details and checks in `AMENDMENTS.md` A1.

- P5 compressor smoke-test attribution fix (one conservative blocker); E2–E6 first runs on an earlier code digest (rerun
  on the final code); the cost-based R_S draft replaced pre-freeze; Playwright e2e timing races (reported beside E8).
