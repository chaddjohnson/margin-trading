# Independent methodology and implementation review — Study 9 Phase B (pre-freeze)

- **Written:** 2026-11-02T22:55Z (UTC, `date -u`). Reviewer: a fresh, read-only Claude Code subagent that did not see the
  author's reasoning; judged only from the files.
- **Branch / state:** `research/study9-phase-b-seven-pool`, HEAD `2beb1bd`; `research/study9-phase-b/` and
  `src/study9-phase-b/` untracked; `results/` empty (no pilot, no freeze, no chain). The user's modified/untracked files
  were not touched.
- **Run by the reviewer (no market data):** `npx tsc --noEmit -p .` → exit 0; `npx eslint src/study9-phase-b` → exit 0;
  `node --test src/study9-phase-b/tests/study9b.test.ts` → 9/9 pass. A scratch-only script replicated the
  `engine.ts`/`integrity.ts` import-closure regex (it read source files only). It also compared live Study 8 code
  with Study 8's sealed `results/freeze/code-E1.json`: 0 differences in the code files and 0 in the 140 engine files.
  Read-only reads of Study 8's sealed `FROZEN_SELECTION.json` (rank→config mapping) and `protocol_freeze.json`
  (structure). No stage, door, pilot, smoke or parity ran; nothing under `data/` or `research/study9-phase-b/results/`
  was read.

### Files reviewed (sha256)

| File | sha256 |
|---|---|
| research/study9-phase-b/brief/ASSIGNMENT.md | 3158751595d1fc35cc07fe4f079a4407f5c0340f012a90f0d625edf3ff85b3c9 |
| research/study9-phase-b/PROTOCOL.md | b49a0b8e955ceaae9085ead927a250c09b516d30241c76b16912158c5eb8c42a |
| research/study9-phase-b/RESEARCH_RECOVERY.md | 424bed0419de348bd0eebfd04cb5b70443248b50009c080af41a3487c8d3f451 |
| research/study9-phase-b/scripts/jobs-qualify.txt | 0b8fc4b8f2861736d120fcbeb997fee9d9e2e07324ded0fa330ea1e1165960e9 |
| research/study9-phase-b/scripts/jobs-search.txt | f4a1fd08b7116fc1988f254a6e53b6c80612e163ac6a6a15d9262534800b6498 |
| research/study9-phase-b/scripts/run_jobs.sh | 58959275eaeae4e35ec4c9a5288c60b674dd44cf30973591f3d69fcd4684c38e |
| research/study9-phase-b/scripts/s9b.sh | 626149b840af1a0e580c8cb5217bf5d10530708eb3670138bbd7f485ca4088f2 |
| src/study9-phase-b/commands.ts | a27b6849ada8394f3c35cdab40eb0cf2c76f1aeda7c8e05f4a360a708c3ef251 |
| src/study9-phase-b/context.ts | 9fa6bb1db160e70179c8853d65990d545853368dff1e9a46275a3ffcb64972f5 |
| src/study9-phase-b/controls.ts | c53df9004bb8ff8c5f056cfdce90b69c0cb10e8b71bd4af34381e8eea4eadddc |
| src/study9-phase-b/designs.ts | 3538181a50e638f6fae4f0534e60f207514ee1e85ba9eb8fd66ebdfb15284393 |
| src/study9-phase-b/diagnostics.ts | 7f1d20fe8793bc4ecdb4d29f2d7267f007ae8cbf9c453d9dd360a1335caed524 |
| src/study9-phase-b/door.ts | 8eeec3549d53471d7aaeaf370607e0c93ef7cb1eb5973e00e6bf4487fae82019 |
| src/study9-phase-b/engine.ts | 649874b4de5dedfa3c686eed921196aee41c5c808bfdc8093eaa967078f470ee |
| src/study9-phase-b/evidence.ts | 446c317558df51fbd200f76b2dec6a8617cc60069f3ddd76999d424a0d4edeea |
| src/study9-phase-b/fitness.ts | 2c466d1854abeda96bcd1ae9e1d6c75d50c3a6d78ad6cd24d0c2e4a1ba6bb1f7 |
| src/study9-phase-b/gates.ts | 8fe5a1fd9f5897b2cf422091a38db64fa68576fcaac1d969811a8d61a98e2c70 |
| src/study9-phase-b/integrity.ts | 0d78cd273d6eb995555875012c11d19db9256152a5271441bb34f35dd5639be5 |
| src/study9-phase-b/main.ts | 17112a97a1ff9c38b60bb1b653d57149497d2455a70af209328e789f30544b72 |
| src/study9-phase-b/parity.ts | 9a05aecf866985fe11ee619b65f77c386f5aa91135369f049a97d16c567e5208 |
| src/study9-phase-b/pilot.ts | e0463bb187f402489f60e1ad8baefbfd4c4c62362e28342d7514d9b94d85fde4 |
| src/study9-phase-b/qualify.ts | 29f040555361af7254be93bbf67dfe55d4788622cba187bdfda71c0b17e677f3 |
| src/study9-phase-b/records.ts | ad68cfdbeb52ad2cd0fa4c8767671ad502df0be90584e13300b9e5d100a732ba |
| src/study9-phase-b/search.ts | 4c2f2c84dde97b0249fc0c0371cc7253c0a6261902b3eb7922170391d12f11a2 |
| src/study9-phase-b/select.ts | 500329ce435a38c6b1ba86447144c1b8e15dbc4dba38e48a78428c701435ee88 |
| src/study9-phase-b/series.ts | 960ce93e40195a7772e3fbab67c5bb0efca313c39789c0de3494f719d2bfc7ff |
| src/study9-phase-b/slice.ts | 3024912da183675525d456eeac2285897351b4d2ba25e156794ab8b98dd1c324 |
| src/study9-phase-b/space.ts | c6c2b24298facc58f7bfe72dd8cf2a450c7eeaf99b4052d8be88485ed2bda667 |
| src/study9-phase-b/testparity.ts | 50b019abde8fb42ca04f7124519e12a384cdae2f7a71bacef381d064951dff46 |
| src/study9-phase-b/test.ts | 38f998f646a0c77b21d196dd630915e3f93d5fd7a7705e65908790570f01dd26 |
| src/study9-phase-b/tests/study9b.test.ts | 323916acf931cc9e8a7ec4d4a14aee5bada58c1a54ec0910f84c6a7c0e961a29 |
| research/study8-expanded-regime-d1/PROTOCOL.md | 22eebc3704c56d4637ebf1895f1e05780ce1a59477ed491b3efb9e76799513b6 |
| src/study8-expanded-regime-d1/search.ts | 6055c0c1d327a716333aba5de7c2554265ca71e5bc79c947282816711e2bb4c6 |
| src/study8-expanded-regime-d1/evidence.ts | 6baddcfe614c73238864b7a716667e8e5e5a04e478c8aa6243cc4c27d6dc3d73 |
| src/study8-expanded-regime-d1/qualify.ts | 128ef84490297dd0d11702964822eafd07944b3af00b4d9b55384269b263ee89 |
| src/study8-expanded-regime-d1/select.ts | 9d21d00ec3ed25dc214e1591055db9d4e549ca57e4f7d7ea603364813d09f2ca |
| src/study8-expanded-regime-d1/test.ts | 3ee74257368278a422bf2b887e71d2715849462c91f37f9b57aa069766195544 |
| src/study8-expanded-regime-d1/fitness.ts | 29be8e3e5382863890c9853a5e7a8ed445b3b5bbcd7a8d0e2f4dfde0f0539e81 |
| src/study8-expanded-regime-d1/designs.ts | b5cb4c9e805d6aef952aaf033279305c6bd7ca6e37dfccca7a167c8b196c9f17 |
| src/study8-expanded-regime-d1/space.ts | a47d014c7e62589f2d9ce1c08c864713c2e5a115f1399db84e47dc4bf775c1ae |
| src/study8-expanded-regime-d1/evaluate.ts | 932d29fabaa82abdc57fa63d909d6415cf3b1140ab33b0eeaaaa248759110f5f |
| src/study8-expanded-regime-d1/context.ts | 6ead50a504a05f94e7cfe2bd7edd1f168feccbcb0be9448e7faba2e050288a59 |
| src/study8-expanded-regime-d1/data.ts | 01ad0d089ed35b069927c854640bd5e1c3720c01f584e2eadf98e6b5d2ba722b |
| src/study8-expanded-regime-d1/integrity.ts | 1d818c80a1ecaf6ce369348915a81a32465c389aef498d5e02c53f7ae70d5cd1 |
| src/study8-expanded-regime-d1/commands.ts | 1c07c7393ef2e090fadbbc3fb15e418c27a5033beed131751779c931430711e4 |
| src/study6-b5-kre-robustness/designs.ts | 32964497a35485ab19956a2f390ced1823fa5cde604b193182cfd84841a99a4a |
| src/study6-b5-kre-robustness/evaluate.ts | be94e23cf129cd8ee5313b3e9b662685a2041f5ece25d2c24947840119e12872 |
| research/study9-etf-pool-discovery/RECOMMENDATION.md | d70f1a33f9ac8ef3de8b2f4c0f0b9c5715141be77b63f4d085c5f013209e6591 |
| research/study9-etf-pool-discovery/PHASE_B_OPTIMIZATION_PROPOSAL.md | 0d6fc6ea628c5bc117efdf8ef25a25447207147af0c9177a29fd79983ee53191 |
| research/study9-etf-pool-discovery/PROTOCOL.md (Phase B-relevant sections) | a3d84a2b26fa683f1401d62ed4b53fce1f25bbdbb9adb6f1c0cd4626c275a25b |
| src/study9-etf-pool-discovery/door.ts | 1782ed4a9c4cafde6a97ab268992d96355230ed61d75a565b0a7dec391a6dc50 |
| src/study9-etf-pool-discovery/engine.ts | f5a5e20eeb8edc5456cc923457342a25995670d460252bad35f7a36d60f45df3 |
| src/study9-etf-pool-discovery/parity.ts | 2b564e931ec5551817ba33a965ec6a56799b768826d0528952a51d67e8dd2396 |

Also read, without hashing: `src/portfolio-aware-d1/nbook/universe.ts`, `trace.ts` (`traceCodeFiles`), `data.ts`
(`traceWindowOf`), `src/multi-etf-allocator/data.ts` (`assembleUniverse`), `src/lib/evaluation.ts`
(`loadDatasetSessions`), `src/study6-b5-kre-robustness/records.ts`, Study 8 `AMENDMENTS.md` (precedent) and
`src/study8-runners` (VG #2 alias).

## Summary verdict

**Not ready to freeze; 0 Critical, 7 Major, 18 Minor.** The core is sound:

- **Optimizer and gates:** the optimizer, fitness, neighbourhood geometry, qualification, role assignment, ranking and
  T-gates are Study 8's, literally. I checked every hunk of the five ported files against Study 8.
- **Leakage:** no production code path reads past its fold's training end, or reads a post-2024 bar before the
  selection and audit are sealed.
- **Seeds and comparator:** the seed namespace is correctly isolated, and the primary comparator is the right
  configuration.

The Major items are of four kinds:
- **an integrity and cache-identity regression against Study 8** (M1);
- **a fail-open audit gate** (M2);
- **brief-required tests missing or weaker than specified:** adversarial bars at every fold (M3) and a check of the
  ported test stage against a sealed record (M6);
- **an unmechanized, statistically incomplete user-preference and comparison layer** (M4, M5), plus one operational
  blocker (M7).

All are cheap to fix before the freeze. After the freeze, each would need an amendment.

## Answers to the key questions

- **A. Literalness — yes.** The diffs show only the changes the header lists:
  - the imports;
  - `rngOf`/`seedValue`, the namespace hook;
  - `TrackSpec` in place of `TrackKey`;
  - the door members (VGT is added for the B1 control);
  - the control sets;
  - `testControlKeys`/`bootstrapComparators`;
  - the ledger fields `tradeId`/`decision`;
  - report-only `band` fields;
  - the smoke switches in `select.ts`;
  - `testparity` on F24.

  `budgetOf`, s(d), T1/T2/T3, refinement acceptance, shortlist picks, role order, tier and ranking, status and every
  seed-label structure are byte-identical in logic. `rankOrder`, `qualificationOf`, `testGatesOf`, `assignRoles`,
  `jaccard`, `wilsonLower`, `sealedForm`, `stageCore`, `testFloorsOf`, `violationOf`, `objectivesOf`, `centreView`,
  `nbView` and `floorsOf` are imported; the unit test asserts identity for four of them. The `radius` used by the
  ported `pointFromUnits` is the same object as Study 6's (Study 7 re-exports Study 6's). Adding VGT, B5 or the
  Study 8 holders to a door is inert, because `assembleUniverse` requires identical calendars (`data.ts:76-93`).
- **B. Seeds — isolated.** Every production stream goes through `space.ts` `seedOf` → `deriveSeed('study9-phase-b', …)`.
  `setNamespaceForParityReplay` is reachable only from `parity-a3`, a child process that refuses once parity is
  sealed (`commands.ts:85-94`). `withNamespace` is used only with synchronous callbacks (`parity.ts:423-498`). It is
  safe today but fragile (m6). No test label feeds promotion. Parity does reuse production labels, contrary to
  protocol §5.2 (m5).
- **C. Leakage — no path found.**
  - **Doors:** each door is bounded by `doorSpecOf` before a byte is read. The projection root is physically bounded
    at 2024-12-31. Canonical roots open only for test-F24/slice/post, behind `requirePhase` (`door.ts:62-120`,
    `gates.ts:48-103`).
  - **Parity:** opens projection or leak-copy doors only. `testparity.ts` is imported only inside `runTest` for F24.
  - **Smoke:** refuses canonical roots.
  - **Caches:** they bind the job, door id (prefix hashes), members, settings and ordered full vectors. The engine
    closure, however, omits `src/lib` (M1).
  - **Weaker than the brief:** the adversarial tests at the F19–F23 cuts (M3).
- **D. Book order — clean.** No B5-only filter remains in a production path:
  - Study 8's `orderedOf`/`booksKey`/`configId`/`familyDesign`/`uniquePoints`/`nearBound` and `assertFive` are
    bypassed by the ports.
  - Study 6's `Lab`/`orderedSymbols` are used only in parity P6.
  - Every imported Study 8/6 function receives explicit `symbols`, or uses `Object.keys(books)`.
- **E. Parity gates — adequate in coverage, with gaps.**
  - **Gaps:** P1/TP1 exercise Phase A's harness rather than the `P9Evaluator` production path (m1). No gate validates
    the ported test stage against a sealed record (M6). The no-lookahead gates are weaker than the brief (M3).
  - **Vacuous or weak checks:** TP2 (`tp2.length > 0`), the aggregated tie/refusal requirement of P1, G1's
    "any throw", and C1's job-only foreign header (m1, m2).
  - **Missing gate:** nothing proves that the imported Study 8 code is unchanged since its sealing (m4; it is, today).
- **F. Brief compliance — mostly met.**
  - **Met:** seven pools exact, from scratch, five folds in Study 8's order, test doors after selection and audit,
    T1–T7 veto-only, VG #2 = rank 2 = `VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d` (verified against the sealed file and
    `src/study8-runners`), slice separate, post-test analyses, runner deferred, user files untouched.
  - **Missing:** the mechanized preference layer and the three decisions (M4); a multiplicity-aware comparison with
    VG #2 (M5); adversarial bars at every fold (M3).
  - **To disclose:** the freeze-order deviation (m15).
- **G. Additions — cannot touch the mechanical ranking.** `band` is written only into the role records and the test
  record, and nominations derive from `gates.status` alone. But the compelling case is not implemented, and the
  bootstrap rule has no multiplicity control and mixes in-sample periods (M4, M5).
- **H. Operations — workable.** The plan follows Study 8's precedent. Risks: the rerun path after a parity failure is
  blocked (M7); the memory plan is under-measured (m12); test-rerun and crash-recovery rules are not enforced
  (m8, m9).

## Critical

None.

## Major

**M1. The engine hash (cache identity) and the integrity pins omit the data loader (`#lib` → `src/lib/**`).**
- **Evidence:** both closures follow only relative specifiers: `engine.ts:53-72` and `integrity.ts:30-60`, regex
  `'(\.{1,2}\/…)'`. `#lib` is imported by `portfolio-aware-d1/nbook/universe.ts:9-19` (`loadDatasetSessions`,
  `resolveDataset`, `readSplits`, `splitFactor`), `portfolio-aware-d1/data.ts`, `multi-etf-allocator/dataset.ts` and
  `app/allIn-optimizable.ts`. A replication of the closure regex lists 72 files and none under `src/lib/`.
  - Study 8 explicitly unioned `engineFiles`, including `src/lib/{evaluation,dataset,partitions,corporateActions}.ts`,
    into its pins and its cache hash (`study8 evaluate.ts:61-79`, `study8 integrity.ts:61-69`).
  - Phase B dropped that list.
- **Why it matters:**
  - A change to CSV parsing, session grouping, split adjustment or window truncation would leave every persistent cache
    "valid".
  - After the freeze, `requireIntegrity` would not detect it.
  - The brief §5 requires the cache key to bind the "engine/import-closure source hashes".
- **Fix:**
  - Resolve `package.json` `imports` (`#lib` → `src/lib/index.ts`, `#types` → `src/types/index.ts`) in both closure
    functions, then follow their relative closure (index.ts re-exports archive, calendar, corporateActions, csv,
    dataset, evaluation, frozenSource, partitions, session).
  - Also union `traceCodeFiles` and Study 8's `engineFiles`.
  - Pin `package-lock.json` (csv-parse is a loader dependency).
  - Add a unit test asserting that `src/lib/evaluation.ts` and `src/lib/session.ts` are in both digests.

**M2. `record-audit` accepts a report that says "NOT CLEARED".**
- **Evidence:** `commands.ts:205` `/\bCLEARED\b/.test(text)` matches "NOT CLEARED", "cannot be CLEARED" and
  "CLEARED: no".
- **Why it matters:** it is the only mechanical gate between the sealed selection and the test doors, and it fails
  open.
- **Fix:**
  - Require one exact, predeclared result line, for example `^Result: CLEARED$` (multiline), and reject on
    `/NOT\s+CLEARED|UNCLEARED|BLOCKED|FAIL/i` anywhere in the report.
  - Require the report path under `research/study9-phase-b/reviews/`.
  - State the required line in protocol §8.3.

**M3. The adversarial no-lookahead tests cover only the 2024-12-31 cut; the F19–F23 logical truncations are not
attacked, and N1 skips the cut session.**
- **Evidence:**
  - N2 injects crash bars only after 2024-12-31 (`parity.ts:593-718`). F19–F23 doors truncate logically on a
    projection that still holds 2020–2024 bytes (`door.ts:70-75`).
  - N1 compares a truncated run with the full run (`parity.ts:528-591`). If a cut door leaked post-cut bars, both runs
    would see the same future and N1 would still pass. It therefore proves engine causality, not door truncation.
  - N1 also compares marks only for `i < cutIndex`, and lots and refusals only before `cutIndex` (lines 554, 558, 560,
    562-565). That drops the fold's last training session, which carries the training-window valuation that C1–C7
    read.
  - The brief §6/§7 requires "malicious appended-future-data tests demonstrating byte-identical training decisions,
    marks, search-point evaluations and cache identities", and "no-lookahead on every fold by truncation plus
    adversarial post-cutoff synthetic crash bars".
- **Fix:** add an N2-per-fold gate.
  - For each cut (2019-12-31, 2020-12-31, 2021-12-31, 2023-12-29), build a leak copy whose bars after the cut are
    replaced by a synthetic crash; keep the bytes before the cut identical.
  - Open `parity-cut-<fold>` on both roots and require identical door ids, prefix hashes, point records, full
    replay `marks` (including `cutIndex`), lots, refusals, an `r1` fit per track, a smoke search body and the cache
    header.
  - In N1, compare `i ≤ cutIndex`, and include lots and refusals at `cutIndex`.
  - In `openDoor`, assert per instrument that `ds.lastDate ≤ end` and that the last bar time ≤ that session's close.

**M4. The user-preference layer and the three decisions are not machine-computed; `compellingCase` is unused.**
- **Evidence:**
  - `context.ts:217-225` defines `compellingCase`, and no module reads it (grep).
  - Only `bandOf` of a single share is recorded: `select.ts:109` for confirmation, `test.ts:387-391` for test.
  - Nothing computes the protocol's "lower of the confirmation band and the F24 test-family band" or items (1)–(6) of
    §9.2 (`PROTOCOL.md:348-356`), and nothing emits the three decisions (§9.4).
  - The brief §11 requires: "All serious findings must originate in machine-readable records rather than handwritten
    numbers."
  - Item (1) uses robust/yr only. Phase A's proposal §7 asked for a "compelling advantage in median and p10 net,
    centre net, validation, drawdown margin and stresses".
- **Why it matters:** the conditional-band verdict is the brief's central user-facing decision. As written, it would be
  assembled by hand after the test, where the latitude is largest.
- **Fix:**
  - Add a sealed report-only stage `preference` (after `test-F24-confirm`, before the reports). It reads
    `FROZEN_SELECTION.json`, `qualify/*/F24`, `test/F24/test.json` and `confirm.json`.
  - For each F24 holder, emit: the confirmation share and band (n, per-family shares, Wilson bound); the test share and
    band; the combined band; each compelling-case item with its numbers and pass/fail; the M5 comparison verdicts; the
    mechanical nomination, unchanged.
  - Predeclare item (1) as: median/yr **and** p10/yr ≥ VG #2's, robust/yr ≥ VG #2's + max($3,000, 10%), and centre
    net/yr ≥ VG #2's. All on F24 training, same track labels.
  - Unit-test the stage on synthetic records.
  - State in §9.2 that both training figures are in-sample, selection-biased optima.

**M5. The "uncertainty-aware advantage" over VG #2 has no multiplicity control, and the whole-run interval is
in-sample.**
- **Evidence:**
  - Every F24 holder (seven tracks × up to five roles) is bootstrapped against four comparators on two periods, each
    with its own RNG and an unadjusted 5–95% band (`test.ts:289-317`, `366-375`).
  - §9.3 (`PROTOCOL.md:362-364`) calls a holder compelling if its band excludes zero. With about 20–30 holders, one
    exclusion is expected by chance.
  - The `FULL` period (2017-06-15 → 2026-10-29) is about 80% the training window. That window is in-sample for both the
    Phase B holders and VG #2.
  - Independent per-pair RNGs make a joint max-statistic impossible after the fact.
- **Fix:** predeclare before the freeze.
  1. **The confirmatory comparison:** mechanical primary nominee − VG #2 on `TEST-F24` only. It is one-sided and
     "advantage" iff p05 > 0.
  2. **For every other holder,** a family-wise adjusted band on `TEST-F24`: Romano–Wolf or White's reality check
     (max-T), with all holders resampled on **common block indices**, that is, one `stationaryBootstrap` call over all
     holders' difference series with a single RNG.
  3. **`FULL`** is labelled "in-sample, descriptive", never evidence of advantage.

  Record the number of comparisons. Note that about 458 test sessions give about 22 blocks of 21, so the power is low,
  and "inconclusive" is the expected outcome.

**M6. The ported test stage is never checked against a sealed Study 8 test record.**
- **Evidence:**
  - A1–A3, P2 and P6 cover the space, designs, evidence, optimizer, evaluator and series.
  - T0 (`parity.ts:791-851`) checks only determinism and completeness.
  - TP2 (`testparity.ts:73-103`) checks only F24 centres and the test-window net.
  - The gate inputs (`test.ts` `deep()`: test-window lots and episodes, sensitivities, `testStart`, `yTest`, floors;
    the `test`/`sets` evidence) are computed by the port. A port slip would silently change the one-shot veto. That
    error cannot be fixed once test-F19 has opened.
  - Study 8's `results/test/F23/test.json` (door end 2024-12-31) and `F21` (2023-12-29) lie entirely inside the
    projection.
- **Fix:** add gate A4 in parity.
  - Under Study 8's namespace (`withNamespace`), run `testStageOn` on `parity` doors ending 2024-12-31 and 2023-12-29,
    with Study 8's F23/F21 holder plans and its B1/B5/VG controls.
  - Require Study 8's sealed holder `evidence`, `deep` (`test`, `sensitivities`, `gapRisk`), `gates` and `status`
    exactly. Exclude `comparisons` and the control set, whose definitions changed.

**M7. A parity rerun after any failure is blocked by fixed output paths.**
- **Evidence:**
  - N2 writes `results/parity/n2-search-{projection,injected}.json` (`parity.ts:656-668`), and `runSearch` refuses an
    existing `out` (`search.ts:189-191`). A second parity run therefore throws at N2 (uncaught, so no attempt record is
    written).
  - D1 probes reuse `results/parity/d1/*.json`, so the probes exit non-zero and D1 fails.
  - A3 silently reuses an earlier `a3-search-VG-F19.json`, possibly from different code (`parity.ts:166`, `888`).
  - Study 8's own first parity failed (Study 8 `AMENDMENTS.md` E1), so a rerun is the expected path, not an edge case.
- **Fix:**
  - Write every parity scratch output under `results/parity/run-<UTC>/` (or `attempt-<n>/`).
  - Never reuse an A3 output whose recorded code digest differs.
  - Keep earlier attempts and disclose them, as Study 8 did.

## Minor

- **m1. P1 and TP1 compare Phase A's harness, not the production evaluator.**
  - `replayAgainstEngine` (`parity.ts:273`, `testparity.ts:56`) builds its own traces with `traceWindowOf`. The
    production `P9Evaluator.replay` path (Study 8's `trace`/`windowOf`/`candidateBook('s7-…')`) is compared only on
    B5 subsets (P2).
  - P1's "same-minute and refusal must occur" is aggregated over all rows (`parity.ts:317`).
  - **Fix:** also assert, for every P1/TP1 row, that `ev.replay(books, s, true)` lots, marks and net equal the harness
    replay. Report the same-minute and refusal counts per membership.
- **m2. Weak checks.**
  - TP2 passes with any `tp2.length > 0` and silently skips missing counterparts (`testparity.ts:85, 105`). Require
    all 13 expected rows: B1, B5, VG/VXR/VXRG frozen, G-PA and the seven Study 8 holders.
  - G1 counts any exception as a refusal (`parity.ts:855-862`). Assert the expected message per case.
  - C1's foreign header changes only the job name (`parity.ts:741`). Also test a door-id mismatch and an engine-hash
    mismatch.
- **m3. The comparators are resolved by rank only.**
  - `controls.ts:42` ignores `study8Holders.config`.
  - **Fix:** assert `track`, `role` and the configId: VG #2 `VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d` and VG #1
    `VGT:d1-f41ebcd961+GDX:d1-016d8e4257`, both verified today. Optionally also assert byte equality with
    `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json`.
- **m4. "Imported unchanged" is not gated.**
  - RB checks constants only, and omits `periodList`, `years`, `halfYears` and `primaryFold`.
  - **Fix:** add a gate that the live `src/study8-expanded-regime-d1/*.ts` files and Study 8's sealed engine files
    equal `research/study8-expanded-regime-d1/results/freeze/code-E1.json`. That is true today: 0 differences across
    the code and 140 engine files, src/lib included.
- **m5. The seed table claims something false.**
  - §5.2 (`PROTOCOL.md:210-212`) says parity and pilot use `parity`/`pilot` labels that are "never reused".
  - N2's fit uses the production `['r1', track, 'F24']` (`parity.ts:646`).
  - The N2 and D1 smoke searches, and the pre-freeze smoke test, use the production `screen`/`lhs`/`ga`/… labels
    under the Phase B namespace on real training doors.
  - No test data is involved.
  - **Fix:** prefix the labels in smoke and parity mode, for example inside `label()`, or correct the protocol and
    disclose.
- **m6. The namespace switch is fragile.**
  - **Fix:** make `withNamespace` throw if `run()` returns a thenable. Have `runSearch`, `runQualification` and
    `runTest` assert `currentSeedOf() === seedOf` (context) at entry. Record the live namespace in each sealed record;
    the cache header's `namespace` is a constant (`engine.ts:171`).
- **m7. Smoke mode is not refused after the freeze.**
  - Smoke doors bypass every gate and log only to the scratch folder (`gates.ts:49-52`, `door.ts:97-101`). A
    post-freeze smoke run, which can open smoke test-F19…F23 doors on 2020–2024 bars, would be invisible to the chain.
  - **Fix:** refuse `STUDY9B_SMOKE` once `protocol_freeze.json` exists.
  - Preserve the smoke script and its printed output, as Study 8 did (`results/pilot/smoke.ts`, `smoke-output.txt`),
    rather than "deleted unread".
  - The A0 entry cited at `PROTOCOL.md:22` does not exist yet (`AMENDMENTS.md` is absent).
- **m8. The gate state machine after the selection is untested, and partial writes have no recovery path.**
  - G1 runs pre-parity only. No test covers:
    - the training doors closing after `selection` or after a test trace;
    - the test order F19→F24;
    - `slice`/`post` needing `test-F24-confirm`;
    - `acknowledge-code`.
  - A crash between `writeSealed` and `appendPhase` leaves `FROZEN_SELECTION.json` (`commands.ts:181-193`) or
    `test.json` written but unsealed. There is no `seal selection` or `seal test-<fold>` path, and the training doors
    are already closed.
  - `--confirm` checks only that `test.json` exists, not that phase `test-F24` is sealed (`test.ts:558`).
  - **Fix:** add synthetic-chain unit tests in a temporary results directory. Add verified `seal selection|test-<fold>`
    recovery commands. Make `--confirm` require `requirePhase('test-F24')`.
- **m9. "A crashed test stage is rerun once" is not enforced** (inherited from Study 8).
  - **Fix:** count the earlier `test-<fold>` door openings, refuse a third, and write the attempt number into the
    sealed record.
- **m10. E1 contradicts the pins.**
  - E1 fails if any canonical byte lies after 2026-10-30 (`parity.ts:244`), while the pins tolerate and report later
    bytes (`integrity.ts:130-137`). A refresh between the freeze and parity would block the study, contrary to the
    brief §6.6 ("record … reserve").
  - **Fix:** record `bytesAfter20261030` as a report and pass, or forbid refreshes in the protocol until after the
    slice.
- **m11. L1 is weak.**
  - It greps only `loadNUniverse({` (`parity.ts:877-884`). `diagnostics.ts:37-52` reads canonical `data.csv`
    directly; that is post-test only and acceptable.
  - **Fix:** also forbid `loadDatasetSessions|resolveDataset|loadCsv` and `'data/` literals outside
    `door.ts`/`integrity.ts`/`parity.ts`/`diagnostics.ts`.
- **m12. The memory plan is under-measured.**
  - The pilot opens pool-only doors and measures RSS after at most 96 fits (`pilot.ts:24, 45`).
  - Search doors add VGT. Qualification doors hold the pool plus B5 plus the VG holders: up to 8 symbols, against
    Phase A's "pool's books only, ~4 GB".
  - `maxTraces` is 40,000, against Study 8's 30,000 (`engine.ts:97`).
  - The heap cap is 12 GB × up to 12 jobs, against 59 GB (`s9b.sh`).
  - **Fix:** measure peak RSS on a full-size qualification door with the trace cache filled. Set P = ⌊~50 GB ÷ peak⌋,
    separately for search and qualification. Consider `--max-old-space-size≈6144`. Record P in the protocol or
    AMENDMENTS.
- **m13. Operations disclosures.**
  - The SIGTERM handler (`search.ts:243-250`) cannot run during synchronous CPU work. The watchdog's SIGKILL after 20 s
    loses at most about 30 s of points, which is bounded and resumable. The protocol should not claim the job
    "flushes its cache".
  - Record each job's cache-file sha256 and line count in the `seal search|qualify` entry; the brief retains caches.
- **m14. The procedure folds involve hindsight; disclose it.**
  - Phase A chose the seven memberships on 2016–2024, so the F19–F23 test windows are in-sample with respect to
    membership.
  - VG #1/#2 were chosen on 2016–2024 by Study 8, so they are in-sample on every F19–F23 window and in early-fold
    qualification.
  - **Fix:** state both in §15/§17. Label the F19–F23 holder-versus-VG #2 comparisons "descriptive; control
    in-sample".
- **m15. Deviations to disclose in §14.**
  - The brief §6.1 lists engineering parity before the freeze. Here, as in Study 8, parity follows the freeze.
  - TP1/TP2 run only at the last door, so an engine fault on post-2024 data surfaces after F19–F23 are sealed.
  - **Option:** run TP1-style replay parity for each fold's holders at the start of every test stage.
- **m16. Reporting items the brief asks for but the plan does not specify.**
  - §4: the neighbourhood "minimum" net, and the refused trades per neighbour in the sequence diagnostics.
  - §6: the neighbours' test-window DD distribution; only the centre's is computed.
  - §4: "behaviourally relevant dimensions".
  - §8: concentration in synchronized market-wide events.
  - **Fix:** specify each, or state it unavailable.
- **m17. Two clarifications.**
  - At exactly 0.93, a holder is mechanically "marginal/ambiguous" (share ≤ 0.93) and preference-"conditional" (≥ 0.93).
    State this.
  - The tier, the ranking and the 95% band compare 16–32-D neighbourhoods with each other and with 8-D B1. This bias
    against high-D pools is inherited and unchangeable. Disclose it, and report the d8/norm-matched ranks alongside
    (report-only).
- **m18. Pre-freeze housekeeping.**
  - §16 is still a placeholder.
  - `AMENDMENTS.md` and `results/pilot/pilot.json` do not exist; the freeze refuses without them.
  - `RESEARCH_RECOVERY.md` (22:12Z) lacks the protocol hash and this review.

## Verified correct (no action)

- **Door preconditions** match the protocol table: parity before search; training doors closed by the selection seal,
  `FROZEN_SELECTION.json`, `results/test` or a `test-` log line; test doors after the selection and audit, in order.
- **Write-once records, chain verification and door-log binding.** The `seal` check of door openings matches the
  purpose strings (`commands.ts:57-67`).
- **No distribution ledger** is loaded (`emptyLedger`).
- **Door ids** hash prefixes only, so appended bars change no id.
- **Cache key:** settings (cost, rate, stop fill, slippage, arm date) plus the engine-ordered full vectors; header
  equality is checked in full.
- **No nondeterministic source** (`Math.random`, time) in the decision paths.
- **The job file is longest-first,** and the watchdog's cache path matches `cacheFileOf`.
- **Study 8's live code** equals its sealed acknowledgement (see m4).
