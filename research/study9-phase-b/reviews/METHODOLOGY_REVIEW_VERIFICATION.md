# Verification of the methodology-review resolutions — Study 9 Phase B (pre-freeze)

- **Written:** 2026-11-02T23:26Z (UTC, `date -u`; started 23:15:35Z). Reviewer: the same read-only subagent that wrote
  `reviews/METHODOLOGY_REVIEW.md` (sha256 `8a5ab344ba0c4b8032067863819a16d7856c21fbf732e627916db19b2cf87419`,
  re-verified unchanged).
- **Scope:** the resolution table in `PROTOCOL.md` §16, `AMENDMENTS.md` A0, and every changed source file. I looked
  specifically for regressions in `parity.ts`, `preference.ts`, `gates.ts` (`doorGate`, `gateDecision`), the
  `commands.ts` seal paths and the closure.
- **Run by the reviewer (no market data):**
  - `npx tsc --noEmit -p .` → exit 0.
  - `npx eslint src/study9-phase-b` → exit 0.
  - Unit tests → 14/14 pass.
  - A scratch script imported `closure.ts` and listed the engine closure: 87 files, including `src/lib/{archive,
    calendar, corporateActions, csv, dataset, evaluation, frozenSource, index, partitions, session}.ts` and
    `src/types/*`.
  - Read-only reads of Study 8's sealed `FROZEN_SELECTION.json` and `results/test/F23|F21/test.json`, to confirm that
    A4's inputs exist: F23 and F21 each have a G holder (#11), a VG holder (#2) and a VXRG holder (#1), and two lite
    members.
- **Results files read:** only `results/pilot/smoke.sh`, `smoke-run1-output.txt` and `smoke-run2-output.txt` (exit
  codes only), and `results/pilot/pilot.json` (timings and RSS only). Nothing else under `data/` or `results/` was
  read; no stage ran; nothing was committed.
- **Smoke run 3** is reported as still running (`RESEARCH_RECOVERY.md`); I did not touch it.

### Files (sha256)

| File | sha256 |
|---|---|
| research/study9-phase-b/PROTOCOL.md | c24b167956a09f7c6bd1ca72abed81c7aeea88cebde7948dc9993b6fc70d9fe4 |
| research/study9-phase-b/AMENDMENTS.md | 1b4fc614d1afe0e65f2d0b878587a002463f67f1b9fbc038e703471b443cfcec |
| research/study9-phase-b/RESEARCH_RECOVERY.md | bbbe8e7c44678f0f0d9452a6a7f23ce89a6aef742bafc63a6a34512bfa81deaa |
| research/study9-phase-b/RUN_COMMANDS.md | 8e6812d779ef79d1594e22a422356da561db4e0b5c70fb28e963c8fbe466e8ff |
| research/study9-phase-b/results/pilot/smoke.sh | 2c15092b8b7b22a757a0c046b215b5e282651684c23e9a4229d17651ee3597fb |
| research/study9-phase-b/results/pilot/smoke-run1-output.txt | 91edf7eb1cfef2c2cb36d77d80c9fd95fd3ae5f4f923e3a359922c4105147b18 |
| research/study9-phase-b/results/pilot/smoke-run2-output.txt | b5b1a2d80aa11d0ba45a40f92be7a1927612a0edac25c01df81f07ae5cf31fe9 |
| research/study9-phase-b/results/pilot/pilot.json | 7d1e202beeefe7210a678712eaf0d689ceb96a9aa0ca1001a8f7d2cd4483fa2b |
| src/study9-phase-b/allocparity.ts (new) | cf5e17c67e9509d77fcc977cef601a6b3226747916c7d37b273fd6fa8782236f |
| src/study9-phase-b/closure.ts (new) | d62f17f81a950a96b3be9d273a7c554f4582b76d28f519edb280cd11e80270d6 |
| src/study9-phase-b/commands.ts | e36c1cf06709daf1721eba7852740c663f3bf6529273dda9e114c064e5074fc6 |
| src/study9-phase-b/context.ts | 0d2844f36eba2e42174444e5c769266c8f4ffd3d92fb97e5d7247a0464d297f0 |
| src/study9-phase-b/controls.ts | 5eef19c16994001a6b363f616a334932b5bb14370e715c92a52c8e89c28afb4d |
| src/study9-phase-b/designs.ts (unchanged) | 3538181a50e638f6fae4f0534e60f207514ee1e85ba9eb8fd66ebdfb15284393 |
| src/study9-phase-b/diagnostics.ts | 15f8a36b3ac48d367829814a4773638780e1ab38af9c69c6759a8e58dc01afa3 |
| src/study9-phase-b/door.ts | 61bf5ca4f1c988840f775c089e025d18947e00f678c773f97b73c18b22917c4d |
| src/study9-phase-b/engine.ts | 1b5905d96f772ba8223ee52593aadd9e71b9cb7e277214e672063106984bea94 |
| src/study9-phase-b/evidence.ts (unchanged) | 446c317558df51fbd200f76b2dec6a8617cc60069f3ddd76999d424a0d4edeea |
| src/study9-phase-b/fitness.ts (unchanged) | 2c466d1854abeda96bcd1ae9e1d6c75d50c3a6d78ad6cd24d0c2e4a1ba6bb1f7 |
| src/study9-phase-b/gates.ts | cdccaa998d111289a720d86208b864831dac837c5ce292d28b14533a7b344a3e |
| src/study9-phase-b/integrity.ts | 80e7dd7d5a71407ab7d40c4f906b76ff9f76fa434d855d50db5454e3039428eb |
| src/study9-phase-b/main.ts | c7099b747d55b2b83c82ed7d01b5ee5be3b6778fbe3c97f832f29a846269dd68 |
| src/study9-phase-b/parity.ts | 9e50e5a9a9f70045e6a939ace1ea9e6b0838c68319ca38552c8be0cf8fcc5642 |
| src/study9-phase-b/pilot.ts (unchanged) | e0463bb187f402489f60e1ad8baefbfd4c4c62362e28342d7514d9b94d85fde4 |
| src/study9-phase-b/preference.ts (new) | 55d110ef6cd2dd1698e7693a61072cc5de3fd0270e6f18932cdfff99c19dea23 |
| src/study9-phase-b/qualify.ts | 6c609403487c3b82ed4583995b1103543ad0cb1757e9bce4a25fe486e5c673dd |
| src/study9-phase-b/records.ts (unchanged) | ad68cfdbeb52ad2cd0fa4c8767671ad502df0be90584e13300b9e5d100a732ba |
| src/study9-phase-b/search.ts | a99ae205b9d07814dd5a84254be1cec446c93baa4e0cad48e1581c0141597660 |
| src/study9-phase-b/select.ts (unchanged) | 500329ce435a38c6b1ba86447144c1b8e15dbc4dba38e48a78428c701435ee88 |
| src/study9-phase-b/series.ts (unchanged) | 960ce93e40195a7772e3fbab67c5bb0efca313c39789c0de3494f719d2bfc7ff |
| src/study9-phase-b/slice.ts (unchanged) | 3024912da183675525d456eeac2285897351b4d2ba25e156794ab8b98dd1c324 |
| src/study9-phase-b/space.ts | f3bcb91794d93c975fa625048731c75a90b14a9531a9f86378a8751460505d9e |
| src/study9-phase-b/testparity.ts | 963cd1db60c3a8a554ef67fa19791de7aeb22b227c2d624d991d642bdaf36ee6 |
| src/study9-phase-b/test.ts | 36152469e3964b4dadb8834265b464ad2b3487ba6398132a0f68118f53f6b656 |
| src/study9-phase-b/tests/study9b.test.ts | dee7725d1a9fda2fad60cddda7cb91da8097214a7db073adb75a0f0f99fbe002 |
| research/study9-phase-b/scripts/* (unchanged) | same hashes as in the review |

## Verdict

**The protocol can be frozen once one new Major finding (V1) is fixed and A0 item 7 is written.** V1 is a small
change in `commands.ts`. A0 item 7 records the result of smoke run 3; freeze only after that run has finished.

- **Resolutions:** all 7 Major and 18 Minor findings of the review are resolved or acceptably disclosed. M1–M7 are
  resolved in code and protocol, with tests where stated.
- **New findings:** the changes introduced **0 Critical, 1 Major (V1) and 9 Minor** issues. None weakens leakage
  protection or the literalness of Study 8's algorithm.
- **Literalness:** the ported search, qualify and test bodies remain Study 8's. The only new hunks are the namespace
  assertion and record field, the parity/smoke label prefix (off in production), and the test attempt counter and TP1.
- **Recommendation:** fix the Minor items before the freeze too. Each is a small edit now, but would need an
  `AMENDMENTS.md` entry and `acknowledge-code` afterwards.

## Status of each review finding

| Finding | Status | Evidence / residual |
|---|---|---|
| M1 loader missing from the engine hash and pins | **Resolved** | `closure.ts:8-30` follows `#lib`/`#types`. Used by `engine.ts:61-69` (also unions Study 8's `engineFiles`, `traceCodeFiles` and `package-lock.json`) and `integrity.ts:31-52`. The closure contains all of `src/lib` (verified). Unit test present. |
| M2 `record-audit` fail-open | **Resolved** | `gates.ts:87-91`; `commands.ts:262-269` also requires the report under `reviews/`. Unit test present. Residual: prose "BLOCKED" is not rejected, though §8.3 says "no … blocking result" (V9). |
| M3 adversarial bars only at 2024-12-31; N1 skipped the cut | **Resolved** | `parity.ts:689-866` (details below). |
| M4 preference layer not computed | **Resolved, with V1/V4 caveats** | `preference.ts`, sealed by `commands.ts:317-327`. Implements §9.2–9.4, with item (1) widened (`preference.ts:226-241`). |
| M5 no multiplicity control | **Resolved** | `preference.ts:63-79` (single-step max-T), `160-205` (common indices via one `stationaryBootstrap` call; checked: one index stream for all series, `b4-b5-robustness/analysis.ts:211-228`). FULL is labelled descriptive (`:301-305`). Unit test present. |
| M6 test-stage port unvalidated | **Resolved** | `parity.ts:167-248, 1098-1107`. A4 replays Study 8's F23 and F21 test stages under Study 8's namespace on projection doors. It compares `evidence`, `deep`, `gates` and `s7Equivalent` (holders) and `centre`/`testMedian` as well (members), and requires exactly 10 rows, all equal. `deep` excludes the changed `lots` fields, so there are no spurious diffs. Inputs verified to exist. Residual: the lite rows are single-book only (V8). |
| M7 parity rerun blocked | **Resolved** | `parity.ts:285-291`: a per-attempt `run-<UTC>` folder; A3 and A4 always run fresh in it (`commands.ts:89-103` requires that folder). Residual: undisclosed deletion of scratch outputs (V5). |
| m1 P1/TP1 on Phase A's harness | **Resolved** | `allocparity.ts` compares `runNAllocator` with `P9Evaluator.replay(…, true)`. Used by P1 (`parity.ts:423-495`, per-membership refusals and lots required) and TP1 (`testparity.ts:56-73`). |
| m2 weak TP2, G1 and C1 | **Resolved** | `testparity.ts:112` (exactly 13); `parity.ts:1018-1056` (each refusal message matched; I traced every case to its thrown message); `:889-921` (foreign job, door id and engine refused). |
| m3 comparators by rank only | **Resolved** | `context.ts:169-232` and `controls.ts:42-55`; the track, role and configId of ranks 1, 2, 3, 8, 12, 15 and 25 match the sealed file. |
| m4 imported code not gated | **Resolved** | S8C (`parity.ts:312-324`; today 0 differences over its code plus 140 engine files); RB object identity (`:352-361`). |
| m5 production labels in parity/smoke | **Partially resolved** | Searches are prefixed (`search.ts:220-224`). T0 and the smoke qualification and test stages still use production `confirm`/`test` labels, and `parity.ts:36` overclaims (V2). |
| m6 fragile namespace switch | **Resolved (minor residual)** | `space.ts:24-46`; asserted in search, qualification and test; recorded in each record. Residual: in `runSearch` the assertion runs after the door opens (V6). |
| m7 smoke after the freeze; output not kept | **Resolved (minor residual)** | `main.ts:37-38` refuses smoke after the freeze; the files are kept in `results/pilot/`. Residual: they are not sealed with the protocol phase (V7). |
| m8 gate state machine and recovery | **Resolved, but V1 introduced** | Pure `gateDecision` (`gates.ts:48-83`) is unit-tested and equivalent to the old `doorGate`. Recovery seals: `commands.ts:161-184`. `--confirm` needs the sealed `test-F24` phase (`test.ts:559`). |
| m9 test rerun once | **Resolved** | `test.ts:562-566`; the attempt is recorded (`:604`). |
| m10 E1 versus later bytes | **Resolved** | `parity.ts:385-392`. |
| m11 L1 | **Resolved** | `parity.ts:1058-1078`. The current code passes: matches only in `door.ts`, `parity.ts` and `context.ts`. |
| m12 memory | **Acceptably resolved** | §7.3 and Study 8's 30,000 traces (`engine.ts:88`); the memory watch is operational. Wording: N3-EDV's qualification door holds 8 books, not "up to seven" (V3). |
| m13 SIGTERM; cache retention | **Resolved (minor residual)** | §7.3; cache manifest (`commands.ts:190-236`). Residual: V5. |
| m14 hindsight disclosure | **Resolved** | §15. |
| m15 parity order; TP only at F24 | **Resolved** | §2 and §8.5; TP1 runs at every fold (`test.ts:581`). Stale text remains in §3.2 and the `test.ts` header (V3). |
| m16 report items | **Resolved** | §11 (c) and (d); `diagnostics.ts:424-456`. |
| m17 0.93 boundary; dimension bias | **Resolved** | §9.2; §17 item 6. |
| m18 housekeeping | **Mostly resolved** | §16 written; `AMENDMENTS.md`, the pilot and the checkpoint exist. Still open: A0 item 7 (smoke run 3) is unwritten, and `RUN_COMMANDS.md` is incomplete (V9). |

### M3 in detail (checked line by line)

- **N1:** now compares lots closed at or before `cutIndex`, entries, refusals, marks `0…cutIndex` and per-book traces
  through the cut (`parity.ts:705-750`).
- **N2:** at each of the five cuts, `buildLeak` copies the projection's bytes through the cut and replaces everything
  after it with five synthetic crash sessions on the real next session dates (`:250-276`, `:753-759`). The prefix is
  byte-identical: latin1 is written as read. For F19–F23 this removes the real 2020–2024 bars, so a loader that read
  past `endDate` would produce a difference.
  - **Required:** equal door ids and prefix hashes; point records, full `marks`, lots and refusals under three
    settings; `r1` fits; cache headers; smoke searches at F19 and F24; power; exactly 5 cuts passing (`:841-872`).
- **Synthetic timestamps:** every injected session falls in January, so 14:30Z = 09:30 ET and no bar lies outside
  regular hours.
- **Door assertions:** `door.ts:146-153` checks each instrument's last date and last bar.

## New findings

### Major

**V1. A recovery seal can seal a failed F24 confirmation, and nothing downstream checks it.**
- **Evidence:**
  - `runTest` writes `confirm.json` (`test.ts:619`) before it throws on `!identical` (`test.ts:635-638`).
  - `seal test-F24-confirm` recovery (`commands.ts:161-184`) checks only that the phase is unsealed, the body hash
    and the `audit` phase, then seals the record.
  - `slice` and `diagnostics` require only the phase. `preference` merely records `confirmIdentical`
    (`preference.ts:323`) and proceeds.
- **Why it matters:** the protocol makes an identical deterministic repeat a condition (§8.5, §7.3: "must be
  identical"). As written, the "crash between write and seal" recovery path is also a way past a failed confirmation.
- **Fix:**
  - In the recovery branch, for `-confirm`, read the record and refuse unless `stage === 'TEST_CONFIRM'` and
    `confirmation.identical === true`. For `test-<fold>`, refuse unless `stage === 'TEST'`, `fold` matches and
    `testParity.passed === true`.
  - Make `runSlice`, `runPreference` and `runDiagnostics` require `confirm.json` with `confirmation.identical === true`.
  - Optionally, write a non-identical confirmation to `confirm-DIFFERS.json` instead of `confirm.json`.

### Minor

- **V2. The parity and smoke label claims are too broad.**
  - `parity.ts:36` says "no production seed label is evaluated". But T0 (`parity.ts:958-1015`) runs `testStageOn`
    with the production `('test', 'sets', 'F23', rep)` labels under the Phase B namespace, on F23 geometry, for VG #2,
    B5 and the controls. The smoke qualification and test stages likewise use production `confirm`/`test` labels;
    only smoke *searches* are prefixed.
  - Smoke run 3 therefore also used production labels outside the search, but A0 and the protocol header mention
    only "the two smoke runs".
  - **Effect:** none on any decision. T0 records only booleans and counts, and the F23 window lies inside F24
    training.
  - **Fix:** correct the wording (parity.ts header, §5.2), disclose run 3 in A0 item 7, or add a label-prefix option
    to `evidenceOf`/`testStageOn` for T0.
- **V3. Stale or inaccurate text.**
  - `PROTOCOL.md:164` still says TP1/TP2 "run inside the F24 test stage"; §8.5 and §14 say TP1 runs at every fold.
  - The `test.ts:7-9` header says the same.
  - `PROTOCOL.md:282` says "qualification doors hold up to seven books"; N3-EDV's holds 8 (EDV IWM XLF plus VGT XBI XRT
    KRE GDX).
- **V4. `economicallyCompelling` overstates what it checks.**
  - The list (`preference.ts:343-345`) is only the band and compelling case plus a bootstrap advantage.
  - §9.3 also requires "positive contributions after capital contention, credible fills", which are computed only by
    `diagnostics`, and `diagnostics` runs after `preference`.
  - **Fix:** either rename the field to `bandAndAdvantageVsVg2` and state that contributions and fills are judged
    from `diagnostics` in the report, or predeclare mechanical criteria and run `preference` after `diagnostics`.
    Examples: every book's leave-one-out test-window net > 0; ≤ X% of lots with fill-bar dollar volume < $100k.
- **V5. Parity deletes its scratch caches, and the protocol does not say so.**
  - `parity.ts:1109-1112` deletes the N2/D1 search outputs and the C1 caches "unread". §10 does not say so, and the
    brief §0.4 says not to delete "any other repository cache as cleanup".
  - **Fix:** keep them (git-ignored, small), or state the deletion and its reason in §10 and A0.
  - A related issue in the seal: the cache manifest is reused if a failed `seal` attempt already wrote it
    (`commands.ts:216`), and it does not require all 35 caches. Recompute it on every seal attempt, or refuse if the
    existing one differs, and require 35 entries.
- **V6. In `runSearch`, the namespace check runs after the door has opened.**
  - `assertStudyNamespace` (`search.ts:220`) runs after `openDoor` (`search.ts:211`), so a wrong-namespace run still
    logs a door opening that `seal` will count.
  - **Fix:** move the assertion before `openDoor`, as `qualify.ts` and `runTest` already do.
- **V7. The freeze does not seal the pre-freeze evidence it cites.**
  - It does not seal `results/pilot/smoke.sh` or the smoke outputs, which the protocol header relies on
    (`main.ts:65`, `:90-99`).
  - **Fix:** add them to the `protocol` phase files.
  - **Operationally:** freeze only after smoke run 3 has finished and its result is in A0 item 7. The smoke refusal in
    `main.ts:37` runs at process start, so a still-running smoke script's later steps would fail mid-run.
- **V8. A4's lite coverage is single-book only.**
  - The two lite members per fold are single-book: G#5/G#6 on F23, G#6/V#2 on F21. The pooled lite path (`d8` on a
    multi-book configuration, `lite: true`) is not reproduced.
  - **Fix (optional):** also pick the first non-holder pooled member (VG/VXR/VXRG/VXRKG), and set the expected row
    count accordingly.
- **V9. Small consistency gaps.**
  - `RUN_COMMANDS.md` lacks `preference`, the recovery `seal selection|test-<fold>[-confirm]`, and the exact
    `Result: CLEARED` line; it still says "must state CLEARED".
  - `auditCleared` does not reject prose such as "BLOCKED", contrary to §8.3's "no … blocking result". Add
    `/\bBLOCKED\b/i` to the rejection, or reword §8.3.
  - The parity process now holds many 13-symbol universes at once (main, W19, W21, and per cut the cut, leak and
    `past` doors), and the A3 and A4 children run concurrently. Watch memory during parity; the heap cap is 12 GB per
    process.

## Checked and found correct (no action)

- **Gates:** `gateDecision` reproduces every precondition of the former `doorGate`. `doorGate` still verifies
  integrity and the chain before deciding, and skips integrity only for `pilot`, `smoke-*` and smoke mode.
- **Audit command:** the `record-audit` path normalization rejects `..` escapes and absolute paths (fail-closed).
- **Recovery `seal selection`:** requires `qualify`, a verified body and an unsealed phase.
- **Test-seal recovery:** the fold-order precondition is implied, because a record exists only if its door opened.
- **`preference.ts`:**
  - the differences of daily marks sum exactly to the test-window difference;
  - centres are reproduced before use;
  - the bands are the lower of confirmation and test;
  - item (1) is widened as the protocol says;
  - the confirmatory test is one-sided;
  - max-T matches §9.3's formula.
- **Port bodies:** the ported search, qualification and test bodies diff against Study 8 only in the declared hunks.
  The A3 replay uses neither the prefix nor the namespace assertion, and `searchCore` excludes the new `namespace`
  field.
- **No new post-2024 path:** TP1 runs on each fold's own door; A4, N1 and N2 use projection or leak-copy doors ending
  ≤ 2024-12-31; `preference` opens only `post`, after `test-F24-confirm`.
