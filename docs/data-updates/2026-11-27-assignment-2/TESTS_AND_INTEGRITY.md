# Tests and historical integrity (Assignment 2)

## 1. Test counts: baseline versus final

| Suite | Baseline (`f2c414ef`) | Final | Where |
|---|---|---|---|
| Root `npm test` | 1,909 tests: 1,896 pass, **9 fail**, 4 skipped (main checkout, Assignment 1). The worktree re-run gave 1,895 / 9 / 5; the extra skip was Phase 7's export metadata, absent until copied, after which that file passes 4/4 | **1,934 tests: 1,930 pass, 0 fail, 0 cancelled, 4 skipped** (after the record, on the accepted tree) | `research/gpu-phase9/results/post-record/npm-test-after-record.txt`; baseline `evidence/npm-test-baseline-f2c414ef-worktree.log` |
| Root `npm test` before the record (campaign E8) | — | 1,934 / 1,927 / 3 (exactly the 3 record-in-force tests) / 4 | `research/gpu-phase9/results/tests/npm-test.json` |
| Root `tsc --noEmit` | 0 errors | 0 errors | `research/gpu-phase9/results/tests/root-tsc.txt` |
| ESLint, GPU directories (`src/gpu-backend`, `src/gpu-jobs`, `src/gpu-phase9`, `src/risk-envelope`, `tools/gpu-phase9`) | — | 0 errors, 1 warning | `research/gpu-phase9/results/tests/eslint-gpu.txt` |
| Repository-wide `npx eslint .` | about 150 errors (Assignment 1) | 150 errors, 2,782 warnings, all pre-existing in completed studies' code (unchanged; no historical cleanup, brief §6.1) | — |
| `npm run app -- allIn-trailingBuy VGT all 2025-01-02 2026-11-03` | works (Assignment 1) | exit 0: the app-closure lint (414 files, 0 errors), tsc, the run | `evidence/npm-run-app.log` |
| Strategy Lab typecheck, lint, Vitest | 334/334 (Assignment 1) | typecheck ok, lint ok, **Vitest 334/334** | `research/gpu-phase9/results/tests/strategy-lab-*.txt` |
| Strategy Lab Playwright (scratch build; temporary state) | 83/83 (Assignment 1) | **83/83**, after one allowed rerun of the known `e2e/candles.spec.ts:439` timing race: the first run had 82 passing and 1 failing | same |
| Strategy Lab portfolio parity (all six catalog candidates against their sealed records) | — | ALL VERIFIED, on the candidate and again on `main` | `research/gpu-phase9/results/tests/portfolio-parity.json`, `results/integration/main-portfolio-parity.json` |

**The 4 remaining skips** are the baseline's own, each a legacy suite whose pinned whole-file inputs were changed by data
appends (B4/B5 anchors, the frozen baselines, a View U and the standalone VGT primary). They are reproduced at their
commits (`HISTORICAL_COMPATIBILITY.md` of Assignment 1). They are not failures, not new, and not acceptance-relevant.

## 2. Disposition of the nine baseline failures

| Failures | Disposition |
|---|---|
| 6 × the lowercase `src/app/allin-original.ts` (`intraday-study`, `minute-optimizer`, 4 × `trailing-buy`) | **Resolved** (`00e1425c`, `LEGACY_FAILURES.md`). The callers read the renamed `allIn-original.ts`; the pin, the golden masters and the records are unchanged; 11/11 tests of the three files pass |
| MERGE GATE (`src/gpu-backend/tests/policy.test.ts`) | **Resolved by the real re-acceptance**, not by suppression (`GPU_ACCEPTANCE.md`) |
| "the recorded acceptance re-verifies independently" (`enforcement.test.ts`) | same |
| "every study that declares an adoption passes the preflight" (`research-standard/tests/preflight.test.ts`) | same; `research-preflight --all` now passes 32/32 |

## 3. Historical integrity

| Check | Result | Evidence |
|---|---|---|
| Tracked research files outside `research/gpu-phase9/` | identical to `f2c414ef` (23,824 files; `git diff --name-only f2c414ef main -- research` outside Phase 9 is empty) | GPU Phase 9 E10, `research/gpu-phase9/results/integrity/integrity.json` |
| Sealed files | 1,464 sealed files of other studies; their counts equal the baseline (1,410 protected, 43 untracked, 11 absent: the main checkout's own counts). Phase 9's own seals verify and are 0444. `seal-protect --apply` in the main checkout after the switch restored exactly Phase 9's 3 new seals | E10; `seal-protect` output |
| Study preflights | at `f2c414ef` 26 PASS and 5 blocked by the stale record; after the record **32/32 PASS** (31 plus Phase 9) | `research/gpu-phase9/results/post-record/preflight-all.txt`, `results/integration/main-checkout-preflight-all.txt` |
| The B4/B5 prospective freeze | its failure list equals the base commit's exactly. **Disclosed finding:** its code-closure line also names the four research-date-boundaries loader files, a consequence of the earlier assignment's change, not reported then. It already failed before for data, scripts and market events; no snapshot was ever imported; it fails closed and remains reproducible at its commit | `research/gpu-phase9/PROTOCOL.md` §6 note; E10 |
| R1, the vintages, the standard | `config/research/date-ranges.json` `818be325…`, `config/market-data/vintages.json` `951d4caf…`, standard 5.0.0 `68487de7…`: unchanged | `git diff f2c414ef main` empty for them |
| The canonical files | VGT 53,976,698 B `dfde0f77…`, GDX 80,741,665 B `aa23522d…`: unchanged. No other symbol changed. No data was fetched. One canonical file per symbol: the worktree's temporary copies were removed with it, and the release links to the main checkout's files | checked before and after every removal |
| Historical byte prefixes | the R1 prefixes VGT `2ee06310…` and GDX `77dba9b2…` verify. The FULL GPU dataset = Phase 7's `6e977ccd…`, and every real-data door's dataset = Phase 7's (D1 38/38) | `evidence/` and `research/gpu-phase9/results/dataset-identity.json` |
| Door and replay fingerprint (Priority 3's doors plus exact replays of the sealed N/original and New L0 configurations) | identical to Assignment 1's, field for field; only the timestamp differs | `evidence/fingerprint-assignment-2-candidate.json` vs `docs/data-updates/2026-11-27-assignment-1/evidence/fingerprint-3-assignment-1.json` |
| Historical reproduction tool on the two demonstrated cases (`tools/historical-repro/env.ts`, environments outside the repository, removed afterwards) | vg-l0-full-joint `67b4ae71`: doors PASS (2ee06310 / 77dba9b2, D19–D24 verified), **47/47 sealed records verify**. Priority 2 `47422d04`: doors built and **verified against their pins** | `evidence/historical-repro/` |
| The TSLA study's sealed records | 163/163 ok (after the record; refused before it, fail closed) | `evidence/tsla-verify-after-record.txt` |

## 4. Strategy and portfolio regression

| Item | Result |
|---|---|
| Phenotype identities and parameter vectors | unchanged. The catalog is byte-identical (no change to `apps/strategy-lab/catalog/`), and no phenotype, strategy, allocator or Growth/D1 engine file changed since `f2c414ef` (`git diff --name-only f2c414ef main -- src` = the declared files only) |
| Trades, fills, stops, allocator decisions, equity marks, P&L, interest, costs, drawdowns | the fingerprint's exact replays (above). The portfolio parity's record checks and ledger signatures, all six candidates. N/original's 44-lot research ledger and the 46-lot All run |
| CPU/GPU numerical and decision parity | the official Phase 9 campaign (`GPU_ACCEPTANCE.md`): 144,795 subjects with 0 mismatches; the sealed optimizer replays identical; the mini schedule 9/9 identical |
| Risk-envelope metrics and denominators | `RISK_ENVELOPE_READINESS.md`: the library and the pilot's code are unchanged since the pilot; R1–R3 and Q1 0 differing |
| No staged-stop configuration selected | the staged-stop code is not in the release at all (`STAGED_STOP_DISPOSITION.md`) |
| The TSLA-only intentional difference | the report-only corrected development-only list (G, C); the sealed outcome untouched (`TSLA_FIX_DISPOSITION.md`) |

## 5. N/original references (CLI, candidate code and again on `main`; Strategy Lab on the deployed service)

| Metric | Research through 2026-10-30 | All through 2026-11-25 | Reference |
|---|---:|---:|---|
| Net profit | $482,700.73 | $477,002.83 | = |
| Maximum marked DD | $20,385.99 | $25,794.56 | = |
| Lots | 44 | 46 | = |
| Margin interest | $72,509.59 | $73,232.88 | = |
| Transaction costs | $4,630.40 | $4,875.26 | = |
| After 2026-10-30 (B) | — | −$5,697.90 | = |
| P-44 lifetime / B | +$5,483.48 / +$11,048.24 (carried in from −$5,564.76) | | = |
| P-45 | −$16,225.15, protective stop 2026-11-20 | | = |
| P-46 | −$520.99, trailing stop (gap) 2026-11-25 | | = |

- **The All run:** its trajectory is identical to FULL's, decision for decision, through 2026-10-30, and its FULL replay
  equals the sealed figures.
- **Against Assignment 1:** the CLI's All summary is deep-equal to the 2026-11-27 committed summary; only `execution`,
  `generated` and `seconds` differ.
- **The custom window `--window custom --from 2016-01-04 --to 2026-11-25`:** equals All, period for period.
- **An isolated cold start `--from 2026-11-02`:** $0.00 and no lot, the same in the CLI and in Strategy Lab. Every
  November trade depends on state carried in from earlier sessions.
- **Evidence:** `evidence/manual-eval/`, `research/gpu-phase9/results/integration/main-manual-eval-n-original-all.txt`
  and `evidence/strategy-lab-service-browser-check.json`.
