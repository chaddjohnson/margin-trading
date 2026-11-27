# Tests and integrity (Assignment 1 §10, §11.5)

## 1. Baseline, re-established before attributing anything

At the starting HEAD `9d2eaec4`, with this assignment's work stashed and a contained unit with PATH set:
**1,904 tests, 1,890 pass, 10 fail, 0 cancelled, 4 skipped** (log `evidence/npm-test-baseline-9d2eaec4.log`). Each
failure was attributed from its own message, not from the previous report:

| Failures | Cause (observed message) |
|---|---|
| 6 | `ENOENT … src/app/allin-original.ts`: the lowercase file does not exist on this case-sensitive filesystem (the file is `allIn-original.ts`). The tests are intraday-study ×1, minute-optimizer ×1 and trailing-buy ×4. Unrelated. |
| 1 | `src/study7-runners/tests/runners.test.ts` "parity with the sealed Study 7 final door": `reconciliation.applicable` false. The run followed the files' newest session; the sealed reconciliation applies only on its end 2026-10-29. This is a data-endpoint assumption, the subject of this work. |
| 3 | By design while the GPU acceptance is STALE: enforcement "the recorded acceptance re-verifies independently", policy "MERGE GATE", preflight "every study … passes the preflight" (5 official GPU studies BLOCKED only by the stale record). |

## 2. Final results (commit `2c86f052`)

| Suite | Result |
|---|---|
| `npm test` (contained unit, PATH set; `evidence/npm-test-final-2c86f052.log`) | **1,909 tests, 1,896 pass, 9 fail, 0 cancelled, 4 skipped** |
| Strategy Lab Vitest (`npm --prefix apps/strategy-lab exec vitest run`) | **334 of 334** (314 before; +20) |
| Strategy Lab Playwright (full suite, scratch build) | **83 of 83** (81 before; +2) |
| Strategy Lab lint, typecheck | 0 errors |
| Root `tsc --noEmit` | 0 errors |
| ESLint on every changed root file | 0 errors (warnings are formatting) |
| `npm run app -- allIn-trailingBuy VGT all 2025-01-02 2026-11-03` | runs. The lint gate covers 414 files with 0 errors; `tsc` is clean; exit 0 |
| `npm run research-preflight -- --all` | 26 PASS, 5 FAIL. The 5 are the official GPU studies, blocked only by the STALE record. |
| `npm --prefix apps/strategy-lab run build` | built into `apps/strategy-lab/dist` (served) |

**Final failures (9) = the baseline minus Study 7.**
- 6: the lowercase `allin-original.ts` failures, pre-existing and unrelated (not changed).
- 3: STALE-by-design, until Assignment 2.

**Resolved:** the Study 7 parity test now runs to its sealed end explicitly. Its reconciliation applies and passes
with 0 lot mismatches; no assertion changed.

**Two regressions caught by the policy tests during this work, and fixed before the final run:**
- the new `preapp` lint gate started `node` without `--no-maglev`;
- a new root `lint` script was unclassified by the purpose-gate test. It was removed; repo-wide linting is
  `npx eslint`.

**New tests.**
- `apps/strategy-lab/tests/portfolio-windows.test.ts` (7, real data):
  - N/original through 2026-11-25 equals the CLI's committed period table field for field;
  - lots 44–46, and lot 44's period P&L kept apart from its lifetime net;
  - "all" ends at the common complete session;
  - a continuous reporting window equals the long run's period B;
  - an isolated window starts flat;
  - C4 and a VGT-only candidate are identical to their research windows, with the validation and development figures
    equal to the archived targets;
  - the research window equals the archived benchmark.
- `apps/strategy-lab/tests/windows-model.test.ts` (9): the window request's canonical form and refusals; the
  effective window of runs; the period bounds and viewports.
- `portfolio-server.test.ts` (+2): coverage and refusals of malformed or out-of-coverage windows (400); N/original's
  All replay over HTTP, its identity, labels and chart window.
- `portfolio-catalog.test.ts` (+1): N/original's entry from its sealed records. `portfolio-parity.test.ts`: N/original's
  10 targets and 44-lot ledger.
- `e2e/portfolio-windows.spec.ts` (2): research → All in the browser, the post-validation ledger, P-45's
  protective-stop exit and P-46 on the charts, a custom continuous window from a link, and an out-of-coverage date
  refused in the form.
- `src/research-standard/tests/preflight.test.ts` (+4): the prospective scope (§1.15). `src/data-partition/tests/datasets.test.ts`
  (+1): every recorded vintage against the local files.

## 3. Research integrity (§10.2)

| Requirement | Evidence |
|---|---|
| R1 unchanged | `config/research/date-ranges.json` byte-identical to `818be325…` (not edited) |
| Formal boundaries unchanged; manual access does not leak | No loader or door changed in this assignment. Strategy Lab's windows use the `manual evaluation` access through `src/manual-eval/door.ts`; formal `development`/`validation` access and the doors are untouched. The previous assignment's boundary tests (`src/lib/tests/researchBoundaries.test.ts`) pass. |
| Historical inputs exact | Door and replay fingerprint `evidence/fingerprint-3-assignment-1.json` = the previous assignment's after-append fingerprint, field for field |
| Sealed records unchanged | `git diff 9d2eaec4..HEAD -- research/` is empty; no sealed file was written. The reproduction runs wrote only inside temporary worktrees, which were removed. |
| Historical portfolio results reproducible | Strategy Lab's six research-window replays verify against their archived targets and ledgers (parity test). The N/original and New L0 CLI outputs are byte-identical before and after the refactor. |
| Prefix verification rejects altered data | Unchanged mechanisms, still tested (`researchBoundaries`, `datasets`, `preflight` pin tests) |
| Preflight and adoption | Standard 5.0.0 registered (sha256 `68487de7…`); 26 studies pass, 5 blocked only by STALE; 4 new prospective-scope tests |
| Compatibility mechanisms weaken nothing | The reproduction tool reads only verified prefixes and refuses others; it never seals a file whose hash differs from its seal; no study code or check was edited (`HISTORICAL_COMPATIBILITY.md`) |

## 4. CLI and Strategy Lab parity (§4.8)

See `STRATEGY_LAB.md` §5. The figures match to the cent everywhere; the period table is deep-equal.

## 5. GPU: diagnostic only, not acceptance

| Check | Result |
|---|---|
| Non-official GPU vs CPU (`tools/data-boundaries/gpu-check.ts`, accepted binary gb7, purpose `parity-test`; `evidence/gpu-nonofficial-check-assignment-1.json`) | FULL (→ 2026-10-30): **102/102 bit-identical**, 51/51 sealed subjects equal, GPU dataset `6e977ccd6104acf1` = the accepted export. ALL (→ 2026-11-25): **102/102 bit-identical**, dataset `674409a41fa96108` |
| `tools/gpu-backend/verify-acceptance.sh` | **NOT VERIFIED (4 failures), by design.** CPU files changed since the record: `src/lib/{csv,evaluation}.ts`, `src/vg-d1-growth-joint/{context,data}.ts` (previous assignment). Policy files: `src/research-standard/preflight.ts` (both assignments) and `config/gpu-backend/entrypoints.json` (previous assignment). CUDA, host path, evidence and binary all PASS. |
| Evaluation digest of the tree (`src/gpu-backend/compat.ts --digest`) | `1a007e8c61e99c4a…` (the record's: `d1a2e490788fa5fa…`). No evaluation-manifest file changed in this assignment. |
| Entrypoint audit | clean (`config/gpu-backend/entrypoints.json` unchanged in this assignment) |
| Stale gate | the official gate refuses; the preflight blocks the 5 official GPU studies; the merge-gate tests fail |

These are diagnostic parity results with the accepted binary, never official acceptance. No acceptance was run, and no
record was generated or edited.

## 6. Strategy Lab deployment

- **Build:** `npm --prefix apps/strategy-lab run build` (final code) into `apps/strategy-lab/dist`.
- **Server:** started 2026-11-27T20:40:46Z as the transient user unit `strategy-lab`, with the repository's service
  template command line, `STRATEGY_LAB_HOSTS=127.0.0.1,tailscale`, port 4317 and the live state `state/strategy-lab`.
  Nothing was running on 4317 before, no other service was restarted, and no service was installed.
- **Verified over the tailnet address with the token:**
  - health;
  - catalog with N/original and coverage 2026-11-25;
  - N/original research: $482,700.73, parity verified;
  - N/original All: → 2026-11-25, $477,002.83, DD $25,794.56, 46 lots, post-validation −$5,697.90, trajectory
    identical; 14.0 s cold.
- Both replays are now in the live replay cache.
