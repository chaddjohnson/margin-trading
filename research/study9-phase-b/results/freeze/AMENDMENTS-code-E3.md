# Amendments and disclosures — Study 9 Phase B

Append-only after the protocol freeze. Each entry has its time (UTC, from the clock), reason, exposure and effect.

## A0 — pre-freeze record (2026-11-02, before any Phase B search, qualification or test)

Written before the freeze. It records what happened between the brief and the freeze.

1. **Inventory (read-only), 22:06–22:12Z.** Phase A's `verify-chain` passed (head `a1e912a2b5fd2556`); Study 8's
   `verify-chain` stops at its full-file data pin (`data/VGT/data.csv`), the pre-existing effect of Phase A's
   2026-10-30 append; the 13 canonical files equal Phase A's post-refresh inventory and their projection copies its
   manifest. No strategy computation.
2. **Code.** `src/study9-phase-b/` written 22:12–22:35Z: Study 8's pure functions imported; `space`, `designs`,
   `fitOf`, `runSearch`, `evidenceOf`, `runQualification`, `runFreezeSelection`, `testStageOn`/`runTest` and Study 6's
   `pointFromUnits`/`minuteSeries` ported by copying the Study 8/6 files and patching only the namespace, the book
   order, the paths, the doors and the comparators (PROTOCOL.md §14).
3. **Unit tests** `src/study9-phase-b/tests/study9b.test.ts`: 9 tests on synthetic inputs (no market data), passing.
   One assertion was corrected before it passed (seed arrays compared by value, not reference).
4. **Code-path smoke tests** (`STUDY9B_SMOKE=1`; toy budgets; tracks N2-SMH and G4-ILF; fold F23 geometry: search and
   qualification on the projection to 2023-12-29, the test stage on the projection to 2024-12-31; scratch folder outside
   the study, deleted unread). Only each step's exit code and an error count were read, plus — for the failing step of
   run 1 — the error and stack lines, which named a missing file path.
   - **Run 1** (22:28–22:32Z): both smoke searches exited 0; both qualifications failed with ENOENT (in smoke mode the
     search wrote `search-smoke.json` while qualification read `search.json`); selection and test therefore failed.
     Fix: the smoke search writes the path the later smoke stages read (`commands.ts`). Outputs deleted unread.
   - **Run 2** (22:33:21–22:43:58Z): search, qualification (both tracks), selection and the F23 test stage all exited
     0; 0 error lines. Outputs deleted unread.
   - No net, drawdown, share, ranking, shortlist or qualification status was read from any smoke output, and no design
     choice depended on a smoke result.
5. **Timing pilot** (22:44–22:45Z, `results/pilot/pilot.json`): load, trace and per-fresh-neighbour times and RSS
   only. No economic quantity was computed into the record or printed. It set only the parallelism (12, Study 8's).
6. **Independent methodology review** (`reviews/METHODOLOGY_REVIEW.md`, received about 22:58Z): 0 critical, 7 major,
   18 minor. The reviewer read no result. Every finding is resolved before the freeze, in code and in `PROTOCOL.md`
   (§16 holds the resolution table). The main code changes: `closure.ts` (the engine hash and the pins follow
   `#lib`/`#types`); the audit result rule; the parity stage rewritten (per-attempt run folders, N1 through the cut,
   N2 at every cut, A4, S8C, production-path P1, stricter G1/C1/L1); `allocparity.ts`; TP1 in every test stage;
   `preference.ts` (the sealed report-only preference stage); namespace guards; a pure gate function with unit tests;
   recovery seals; the rerun-once rule; cache manifests; neighbour distributions in the diagnostics. Unit tests: 14,
   passing. No rule, budget, threshold, bound, radius or fitness changed.
7. **Smoke run 3** (23:15:07–23:24:39Z; after the review's code changes; same setup as run 2, now with `'smoke'`-prefixed
   labels): search, qualification, selection and the F23 test stage (with TP1) all exited 0; 0 error lines. Outputs
   deleted unread; printed output kept as `results/pilot/smoke-run3-output.txt`.
8. **Verification of the review's resolutions** (`reviews/METHODOLOGY_REVIEW_VERIFICATION.md`, received about 23:28Z,
   same reviewer, read-only): every finding resolved or acceptably disclosed; 0 critical, 1 major (V1: a failed F24
   confirmation could be sealed by the new recovery path) and 8 minor new issues, all resolved before the freeze
   (`PROTOCOL.md` §16, second table). Code changes: the recovery seal refuses failed records; the post-test stages
   require an identical confirmation and run slice → diagnostics → preference; the predeclared contribution and fill
   criteria (`economicCriteria`); the namespace check before the search door; one pooled lite member in A4; the smoke
   files sealed with the protocol; text fixes. No rule, budget, threshold, bound, radius or fitness changed. Unit
   tests, `tsc` and lint pass. No smoke run followed these changes (smoke run 3 is the last; smoke mode is refused after
   the freeze).

## E1 — 2026-11-03T00:03Z — parity gate N2 compared the door's label inside the cache header (post-freeze code fix)

- **What happened.** Parity attempt 1 (`results/parity/run-2026-11-02T233235904Z/`, 23:32:30Z → 00:02:21Z, exit 1,
  nothing sealed) passed every gate except N2. At all five cuts N2's door ids, prefix hashes, all 30 point-record /
  full-mark / lot / refusal comparisons, the rung-1 fits, the two smoke-search bodies and the power check passed; only
  `headerEqual` failed. The check compared the whole cache header, which includes `doorKey` — the door's label
  (`parity-cut-F19` on the projection side, `parity-n2-F19` on the injected copy). The label legitimately differs; the
  data identity (`doorId`) and every other header field were equal.
- **Exposure: none.** Training projection and its leakage copies only (no bar after 2024-12-31 by any strategy
  computation); the attempt's record holds booleans, counts, ids and the A3/A4 replays of Study 8's own sealed records.
  No Phase B search, qualification or test had started; no phase was sealed.
- **The fix** (`parity.ts`, N2): compare the cache identity — the header without `doorKey` (namespace, job, door id,
  engine hash, members, last date). The door, the cache and every other gate are unchanged. No rule, budget, threshold,
  bound, radius or fitness changes.
- **Next.** `acknowledge-code E1` seals the new code digest (chain `code-E1`); parity runs again as attempt 2 in a new
  run folder. Attempt 1's folder is kept and disclosed.

## E2 — 2026-11-03T05:50Z — `seal search` failed on the cache manifest's line count (post-freeze code fix)

- **What happened.** All 35 searches finished with `exit 0` (00:31:39Z → 05:48:54Z; each job's door opened once). The
  automatic `seal search` (05:48:54Z, log `results/runlogs/seal-search.txt`) stopped with "Cannot create a string
  longer than 0x1fffffe8 characters": the cache manifest added for review m13 converted each cache file to one string
  to count its lines, and the largest search caches are 680–958 MB (V8's string limit is 512 MB). Nothing was written
  (no manifest) and nothing was sealed; the qualification was not launched.
- **Exposure: none.** No door opened; no record was read for any decision.
- **The fix** (`commands.ts`, `seal`): count newline bytes in the buffer. The manifest's content (sha256, lines, bytes
  per cache) and every rule are unchanged. The point-cache engine hash (the closure of `engine.ts`) does not include
  `commands.ts`, so every cache stays valid.
- **Next.** `acknowledge-code E2` (chain `code-E2`), then `seal search`, then the qualification orchestrator.

## E3 — 2026-11-03T06:27Z — `seal search|qualify` touched the manifest before refusing a sealed phase (post-selection code fix)

- **Found by** the pre-test audit (`reviews/PRE_TEST_AUDIT.md`, non-blocking note): a second `seal search` or
  `seal qualify` would delete and rewrite the sealed cache manifest (`commands.ts`) before `appendPhase` refused the
  already-sealed phase, breaking the chain. It has not happened; both phases were sealed once.
- **Exposure: none.** No door opened; the selection and the audit report were already final.
- **The fix:** the seal branch refuses a sealed phase first, before anything is read or written. No rule, record or
  stage behaviour otherwise changes; the point-cache engine hash does not include `commands.ts`.
- **Also recorded** (the audit's other non-blocking notes): the P1 stresses ran on one configuration per membership
  (21 rows; `BASELINES_AND_PARITY.md` updated); the cache total is 14.8 GiB; E2's heading time is approximate (the
  acknowledgement was 05:49:41Z).
