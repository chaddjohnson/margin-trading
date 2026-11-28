# Work recovery checkpoint — Assignment 1 of 2: research date boundaries remediation and Strategy Lab integration

## Top screen

- **Updated:** 2026-11-27T20:46Z (UTC, from the clock). **Status: COMPLETE** (stages A–H). The push is verified
  (Delivery).
- **Task:** the user's brief received 2026-11-27 ~19:15Z (`BRIEF.md`, verbatim). Report: `REPORT.md`.
- **Branch:** `feature/research-date-boundaries` (main checkout, no extra worktree), from `9d2eaec4`.
- **Running:** the Strategy Lab server, as transient user unit `strategy-lab` (started 2026-11-27T20:40:46Z; port 4317,
  tailnet and loopback, live state `state/strategy-lab`; `systemctl --user status|stop strategy-lab`). It is the
  user-facing deliverable, so leave it running. Nothing else is running.
- **Follow-up gate (the user's):**
  1. Review `REPORT.md` and standard 5.0.0.
  2. Decide whether `research/vg-l0-staged-trailing-stop` and `fix/tsla-outcome-identity-join` are integrated before
     Assignment 2's re-acceptance.
  3. Decide whether Strategy Lab is installed as a permanent service.
  4. Authorize Assignment 2 (re-acceptance, including the fixed-seed mini-optimization).
- **Not authorised here:** official GPU re-acceptance, a replacement acceptance record, official GPU jobs, the
  risk-envelope pilot, any optimization, merge into `main` or other branches, R1 changes, phenotype/strategy/allocator
  changes, deleting research evidence.

## Environment

- Node 24.21.0 (`.node-version`); every evaluating process ran with `--no-maglev`.
- No credentials were used. The Strategy Lab API token was read from `state/strategy-lab/api-token` for the live
  check and never printed.
- GPU: RTX 5090 `GPU-ae5f222c…`; the accepted binary gb7 (`cb2ff30b…`) was used non-officially (`parity-test`) only.

## Stages

| Stage | Status | Record |
|---|---|---|
| A. P0 audit | complete | `CROSS_BRANCH.md`; `evidence/whole-file-inventory-survey.md` |
| B. Strategy Lab windows, N/original, effective dates | complete | `b86d5d25` (with `043aee9c`, the shared execution module); `STRATEGY_LAB.md` |
| C. `npm run app` | complete | `f53aa7e3`, `2c86f052` |
| D. Standard 5.0.0 | complete | `dd49e0cd`; standard sha256 `68487de7b67cd9cc…`, registry current 5.0.0 |
| E. Historical reproducibility | complete | `a4db060c`; `HISTORICAL_COMPATIBILITY.md`; `evidence/repro-*.json` |
| F. Verification | complete | `TESTS_AND_INTEGRITY.md`; `evidence/npm-test-baseline-9d2eaec4.log`, `evidence/npm-test-final-2c86f052.log`, `evidence/fingerprint-3-assignment-1.json`, `evidence/gpu-nonofficial-check-assignment-1.json` |
| G. Deployment | complete | `dist` built from the final code; transient unit `strategy-lab`; live HTTP check passed |
| H. Reports, commit, push | complete | `262234f0` pushed; this record |

## Key results

- **Baseline** at 9d2eaec4: 1,904 / 1,890 / 10 / 4. **Final** at 2c86f052: 1,909 / 1,896 / 9 / 4.
  - The 9 failures: 6 lowercase `allin-original.ts` + 3 STALE-by-design.
  - Study 7's endpoint failure: fixed.
  - Vitest 334/334; Playwright 83/83; lint and tsc clean.
- **N/original:**
  - research: $482,700.73 / $20,385.99 / 44 lots; parity 10/10; 44-lot ledger matches;
  - All → 2026-11-25: $477,002.83 / $25,794.56 / 46 lots; post-validation −$5,697.90; trajectory identical;
  - the period table equals the CLI's committed summary field for field.
- **Integrity:**
  - fingerprint equal to the previous assignment's;
  - GPU vs CPU (non-official): FULL 102/102 and ALL 102/102 bit-identical; dataset `6e977ccd…` = the accepted one;
  - `research/` untouched; R1 `818be325…` and vintages `951d4caf…` unchanged.
- **Acceptance:** STALE (verify-acceptance: 4 failures: the 4 CPU files and the 2 policy files). The tree's digest is
  `1a007e8c…`, the record's `d1a2e490…`.

## Guards

- Do not edit R1, rerun the data append, or truncate the canonical files.
- Do not install a service, merge, or run any acceptance or optimization without the user's authorization.
- The reproduction environments were temporary and are removed (`git worktree list` = the main checkout only).

## Disclosures

- **Two policy-test regressions:** the new `preapp` lacked `--no-maglev`, and a new `lint` script was unclassified.
  Both were caught by the full suite and fixed before the final run.
- **The prepare tool's first Priority 2 attempt failed closed** on absent sealed caches. The tool was fixed, and the
  partial worktree was removed by hand.

## Delivery

- **Commits on `feature/research-date-boundaries` (from `9d2eaec4`):**
  - `043aee9c` (shared execution module);
  - `b86d5d25` (Strategy Lab);
  - `f53aa7e3` (`npm run app` lint gate);
  - `dd49e0cd` (standard 5.0.0);
  - `a4db060c` (historical reproducibility);
  - `2c86f052` (policy fix);
  - `262234f0` (reports and docs);
  - then this checkpoint's delivery record.
- **Push:** `git push origin feature/research-date-boundaries`, a fast-forward with no force, unsandboxed. Verified
  2026-11-27T20:45Z: `git ls-remote origin feature/research-date-boundaries` = `262234f0f738095b1eb4ff538eed136dc73c2a19`
  = local HEAD. This record is pushed the same way.
- **Nothing else was touched:** no merge into `main` or any other branch, no PR, no deployment outside this machine,
  no service installed.
