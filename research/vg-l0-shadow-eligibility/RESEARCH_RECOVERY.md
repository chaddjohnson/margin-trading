# Research recovery checkpoint — New L0 shadow-position eligibility (vg-l0-shadow-eligibility)

## Top screen

- **Updated:** 2026-11-13T17:27Z (UTC, from the clock). **Status: COMPLETE — every stage sealed (90 records verify);
  report written; committed and pushed (see Push). Follow-up gate: the user's review (nothing starts automatically; New L0
  stays the frozen benchmark; no replacement, catalog change, merge of the engine into `main` or deployment; the Phase 8
  decision A/B is the user's, recorded in the roadmap, not taken).**
- **Task:** the user's brief "New L0 Shadow-Position Eligibility: Implementation and Comprehensive Optimization"
  (`brief/BRIEF.md`, 831 lines, sha256 `3547d5efee0e92f26977231b6425e869859369ec367efcb70ecf05d3f51e8ed3`).
- **Branch:** `research/vg-l0-shadow-eligibility` (main checkout), from `6eb85160` (before the trading-session engine change)
  + merge of `main` `2346a1b5`. Phase 0 documentation integration on `main`: `2346a1b5` (pushed 2026-11-12T11:36Z).
- **Authority:** `PROTOCOL.md` `fc6dbdcc4f8b933b…` (frozen 2026-11-12T12:47:53Z, `results/protocol-freeze.json`
  `a3a31a6bca5dce18…`); `AMENDMENTS.md` (none); standard 2.1.0 (`ac5c2c69…`); NL0 1.0.0 (`9b387bb4…`).
- **Outcome:** no material improvement; keep New L0 (all toggles OFF). Fixed parameters: Growth·VGT inert, every D1
  combination harmful. Nominee `C24/A1/R26#1 profit` (Growth·VGT) $386,376.04 / DD $19,459.83 — inconclusive vs A; A2
  primary `C24/A2-g/F1/R2#1 profit` $384,122.07 — no material difference; B1 `C24/B1/R15/V3#1 profit` $232,082.54 and B2
  `C24/B2-g/F1/R7/V1#1 profit` $315,441.49 — harmful; fresh procedures chronologically unsupported (B1 +$71,407.39 / DD
  $80,475.04; B2 −$11,516.74 / DD $74,307.21). Validation (examined): New L0 reproduced exactly ($96,883.72 / $479,605.18);
  nominee $94,336.06 / $480,712.10; A2 $100,436.47 / $484,558.55.
- **Deliverables (sha256 prefix):** REPORT.md `4fcf6636…`; IMPLEMENTATION.md `ed45226f…`; FROZEN_SELECTION.json `b52fdae2…`;
  results/validation/validation.json `077009f9…`; results/folds/sequential.json `7ee87c24…`; results/folds/C24/final/
  selection.json `086ea319…`; results/ablation/C24/matrix.json `1353d3db…`; results/diagnostics/diagnostics.json `d6509f39…`;
  results/phase2/fixed-parameter.json `ecd51b16…`; results/parity/parity.json `3773efcc…` and parity-frozen-code.json
  `627210cb…`; CONTROL_MANIFEST.json `81a686a8…`; tables `results/tables/*.md` + `summary.json` (unsealed reporting);
  docs/research/ROADMAP.md (row 9 + the recorded Phase 8 decision).
- **Tests:** full `npm test` (unit `vgl0se-npm-test`, after the validation): 1,471 tests, 1,460 pass, 7 fail = the known
  pre-existing set (6 golden-master / byte checks of `allIn.ts` / `allin-original.ts` in trailing-buy, minute-optimizer,
  intraday-study; Study 7's data-end parity), 4 skipped; this study's 32 tests pass.
- **Push:** see the Push section (recorded after the final push).
- **Running processes:** none (the chain unit `vgl0se-chain1` ended with "CHAIN1 DONE" at 2026-11-13T17:17:34Z).
- **Do not rerun:** any sealed stage (they refuse); the validation ran once.

## Chain progress (from `results/logs/chain1.log`; every block below is sealed and committed by the chain)

| Step | Stage | Window (UTC) | Result | Commit |
|---|---|---|---|---|
| a01–a02 | phase 2 (New L0 × 8, D24) | 12:48–12:49 | 5,208 fresh; all-OFF best ($382,721.46); every D1 toggle combination harmful | `0f338cf4` |
| b11 | C19 search B1 (96 lanes) | 12:49–15:04 | 1,666,266 fresh, 14,043 hits; 95 lanes triggers not met, 1 at cap | `5265b419` |
| b12 | C19 qualify B1 | 15:04–15:22 | 32/32 replicates qualified; primary `C19/B1/R21/V2#1 profit` $148,747.23 / DD $24,916.05 (111) | `5265b419` |
| b13–b14 | C19 B2 step d1 (48 lanes) + finalists | 15:22–15:51 | 878,968 fresh; F1 $102,840.62 (010), F2 $84,907.67 (010) | `5265b419` |
| b15–b16 | C19 B2 step g (48 lanes) + selection | 15:51–16:40 | 667,758 fresh; primary `C19/B2-g/F1/R8/V3#1 profit` (011) | `5265b419` |
| b18 | C19 fold evaluation (D21) | 16:41 | slice 2020–2021: B1 +$89,021.67 (DD $48,255.05); B2 +$48,104.08 (DD $44,645.13); New L0 $171,402.70 (descriptive) | `de0e13ab` |
| b21–b26 | C21 searches and selections (B1; B2 d1 → finalists → g) | 16:41–22:24 | B1 1,712,642 fresh; B1 primary `C21/B1/R9/V3#1 profit` $241,331.83 / DD $34,041.80 (101) | b27 |
| b28 | C21 fold evaluation (D23) | 22:24 | slice 2022–2023: B1 −$23,908.85 (DD $79,663.64); B2 `C21/B2-g/F1/R7/V2#1 profit` (111) −$63,611.93 (DD $74,307.21); New L0 $87,238.48 | `6b72321b` |
| b31–b36 | C23 searches and selections | 2026-11-12T22:24 → 11-13T04:25 | B1 1,314,271 fresh; primaries `C23/B1/R5/V3#1 profit` (000), `C23/B2-g/F1/R8/V3#1 profit` (000) | b37 |
| b38 | C23 fold evaluation (D24) | 04:25 | slice 2024: B1 +$6,494.57 (DD $14,520.92); B2 +$4,141.11 (DD $34,117.37); New L0 $44,110.10 | `8cdf68e1` |
| c01 | sequential paths | 04:25 | B1 +$71,407.39, DD $80,475.04 — unsupported (0/32 replicate paths supported); B2 −$11,516.74, DD $74,307.21 — unsupported (0/8) | `da5c22d1` |
| d01–d06 | C24 B1, B2 searches and selections | 04:25–11:03 | B1 1,265,797 fresh, primary $232,082.54 (none); B2 d1 finalists F1 $260,532.52 (none), F2 $190,717.09 (D1·VGT); B2 primary $315,441.49 (Growth·VGT) | `b240b394` |
| d08–d15 | C24 A1, A2 searches and selections; controls; final selection | 11:03–17:15 | A1 1,092,948 fresh + 498,973 hits, primary $386,376.04 (Growth·VGT); A2 finalists F1 $334,652.16, F2 $293,557.57 (none); A2 primary $384,122.07 (Growth·VGT); nominee `C24/A1/R26#1 profit` | `0d0d40d3` |
| e01–e02 | ablation, diagnostics | 17:15–17:16 | decompositions; matched lots | `62c7a541` |
| f01 | frozen selection | 17:16:41 | labels: F(D1 toggles) harmful, F(001) no material difference; nominee/A1 inconclusive; A2 no material difference; B1, B2 harmful; A1 vs A2 no material difference; B1 vs B2 harmful | `c691bcd6` |
| f03 | validation (FULL, once) | 17:16–17:17 | 99/106 rows pass V1–V3; New L0 reproduced exactly | `998cdcb8` |

## Phase 0 (complete)

- **0.1 Documentation integration into `main`:** commit `2346a1b5` (parent `aa5754d4` = previous `main` =
  `origin/main` before the push; fast-forward) adds only `docs/research/{OPTIMIZATION_STANDARD.md,
  optimization-standard.versions.json, STUDY_PROTOCOL_TEMPLATE.md, templates/, methods/, ROADMAP.md}` and
  `research/vg-l0-session-hold/` (105 files, additions only) taken unchanged from `research/vg-l0-session-hold`
  `18674b39`. Not integrated: any `src/` change (the session-hold engine option `e3b0ae37`; the preflight tool, whose tests
  read research-line studies). Built with a temporary index (no checkout of `main`; the live Strategy Lab server
  `server/main.ts`, PID 2277059, was not disturbed). Pushed 2026-11-12T11:36Z (outside the sandbox): `git ls-remote` →
  `main` = `docs/nl0-method-standard-integration` = `2346a1b589e881631c3ad54a487149f8e5a531e4`.
- **0.2 Historical integrity:** this branch does not contain `e3b0ae37`; Priority 3's evaluation digest here =
  `147cad7c17eff3fa…` = its historical sealed digest (checked 2026-11-12T12:0xZ); the new feature lives only in new files.
- **0.3 New L0 verified:** development $382,721.46 / DD $19,459.83 / 34 lots reproduced through this study's engine on D24
  (engineering smoke and stage V dry run); full-history figures ($479,605.18 / DD $20,385.99; validation $96,883.72 /
  reset DD $20,385.99; realized $485,169.93; unrealized −$5,564.76) verified from 5B `validation.json` (`83931139…`),
  the session-hold `validation.json` (`f474c421…`) and Strategy Lab parity (`59424ff9…`); reproduced through this engine
  at the validation stage (FULL stays closed until the frozen selection: PROTOCOL AD11).

## Engineering results (pilot and bench: cache only; stage V sealed)

- Pilot `straight` (2026-11-12T12:21–12:29Z): all 21 stage paths on P18 passed; interruption tests: SIGTERM (exit 75)
  and worker SIGKILL (exit 1) resumed identically; the unit kill needed two retries (first two attempts killed nothing or
  only during worker start-up — disclosed below); the third (kill at 15 s; 599 records archived) resumed with 667 archive
  hits; `pilot-compare ref straight sigterm wkill unitkill` → identical lane results. Pilot `p2` (12:36–12:43Z) re-ran every
  stage path on the final code (compact stress/removal evidence): identical lane results, primaries and nominee.

- Unit tests: `src/vg-l0-shadow-eligibility/tests/{allocator,position,study}.test.ts` — 32 pass.
- Stage V dry run (2026-11-12T12:08Z, unit `vgl0se-dryv1`, 102 s, 1,363 simulations): 730 checks, 0 failed (G1 9, G2 2
  incl. ≈ 1,000 archived 5B records identical through the new allocator, G3 48, G4 36, G5 540, G6 61, G7 2, G8 1, G9 5,
  G10 2, G11 24).
- Bench (D24, 96 centres × 17): 12 workers 90.4 ev/s (7.7 GiB), **14 → 92.8 ev/s** (149 ms/eval, 8.9 GiB), 16 → 92.3 ev/s;
  files `.cache/vg-l0-shadow-eligibility/pilot/bench/w*-strata.json`.
- Engineering smoke (D24, New L0 centres, disclosed in PROTOCOL §2): every D1-toggle combination far below all-OFF.

## Disclosures

- The pilot's first unit-kill attempts did not test a mid-job kill (the job finished before the 45 s kill; a reused unit name
  made the next launch exit at once; an 8 s kill landed during worker start-up with nothing archived); fixed (fresh unit names,
  kill at 15 s) and repeated successfully; pilot outputs of those attempts were removed from the cache only.
- After the first pilot, stress and removal reruns are kept in compact form in the evidence (full records stay in the job
  archives) to keep the committed records proportionate; the second pilot verified identical results.
- The code was prettier-formatted after the first sealed stage V; a second sealed stage V on the formatted (frozen) code
  passed identically (`results/parity/parity-frozen-code.json`).

- The New L0 × 8 combination centres on D24 were seen during engineering, before the protocol (PROTOCOL §2); no
  combination is excluded from any search.
