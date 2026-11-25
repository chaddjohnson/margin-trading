# RESEARCH_RECOVERY — Priority 6: TSLA D1 + Growth (study `research/tsla-d1-growth/`)

## Top screen

- **Updated:** 2026-11-25T12:31Z (clock, UTC). **Status: INCOMPLETE — the official chain is RUNNING (cutoff C19 first).**
- **Protocol:** `PROTOCOL.md` P6-TSLA 1.0.0 **FROZEN**, sha256 `d5d462dc906910df4c2372021a44966db633f27019d0d93f9d04758e6686b62e`;
  freeze `results/protocol-freeze.json` `d197e9d73feec2edd2f9c250640d22310118977bcdfa31943c3b9103bfbbfe97` (commit `b2667d83`,
  **pushed**: `git ls-remote` = local); frozen code digest `418a8758…`; gates `results/engineering/gates.json`
  `4bf79aa97d6ae00cf4d66d2ef672889a898fca731773fabaa568c13ef7a0923b` (E1–E9 pass). Amendments: pre-freeze notes E1, E2 only.
- **Running:** systemd user unit **`tsla-chain`** (`/bin/bash research/tsla-d1-growth/chains/chain.sh`, all cutoffs; started
  2026-11-25T12:21:57Z; log `research/tsla-d1-growth/cache/logs/chain.log`; per-stage logs `cache/logs/chain/<stage>.log`;
  each stage its own unit `tsla-<stage>` in `tsla.slice`). Every sealed block is committed by the chain itself.
- **Next:** wait; when the chain ends: report-only diagnostics (`npm run tsla-diag -- bh|tail|lots|nbhd`), analysis and
  reports, bundle, commit, push.
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
| 6 C19 | running | `results/{search,rounds,qualification,refine-plan,selection,pairs,frozen-d1}/C19*`, then `slices/C19.json` |
| 6 C21, C23, sequential, C24, validation, outcome | not started | chain order (PROTOCOL §14) |
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
  git-ignored `cache/diag-test/`) to exercise bh/tail/lots/nbhd before the validation; run it once C19's selection is
  sealed. `analyze.ts` (tables JSON/CSV), `tables-md.ts` (TABLES.md) and `bundle.sh` (handoff ZIP) are written;
  tools type-check (scratch tsconfig over tools/ + src/tsla-d1-growth) and lint clean. `engineering.ts` line 438: a
  type-only cast fix (`as unknown as`), erased at run time.
- Git while the chain runs: read-only commands with `GIT_OPTIONAL_LOCKS=0`; commit only while a long stage is running
  (the chain commits between stages; an index.lock collision would stop it — then relaunch, it is idempotent). Do not
  edit package.json or the protocol documents during the chain (`dirtyCode` checks them).

## Disclosures so far

- P5 compressor smoke-test attribution fix (one conservative blocker); E2–E6 first runs on an earlier code digest (rerun
  on the final code); the cost-based R_S draft replaced pre-freeze; Playwright e2e timing races (reported beside E8).
