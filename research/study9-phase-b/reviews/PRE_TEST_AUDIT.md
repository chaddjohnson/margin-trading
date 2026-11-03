# Pre-test audit — Study 9 Phase B (independent, read-only)

- **Auditor:** a fresh, independent agent with no stake in the outcome, working from `reviews/PRE_TEST_AUDIT_BRIEF.md`.
- **Written:** 2026-11-03T06:24Z (UTC, from the clock). File listings on this host are in CET (UTC+1); every time below
  is UTC.
- **Scope:** checks 1–8 of the brief. I read `brief/ASSIGNMENT.md`, `PROTOCOL.md`, `AMENDMENTS.md`,
  `BASELINES_AND_PARITY.md`, `SEARCH_AND_COMPUTE.md`, the sealed records listed in the brief, `src/study9-phase-b/*.ts`
  and the Study 8 functions the study imports. I recomputed the figures myself with Python and Node scripts in the
  session scratchpad; those scripts read only the sealed JSON records, the code, the code tarballs and the point-cache
  files.
- **What I ran:** `research/study9-phase-b/scripts/s9b.sh verify-chain` (read-only), `npx tsc --noEmit -p .`,
  `npx eslint src/study9-phase-b`, the unit tests, and read-only scripts. They ran no study stage, opened no door, wrote
  nothing outside this file, and I read no file under `data/`. `verify-chain` hashes the pinned data prefixes itself,
  as designed.
- **State at audit:** branch `research/study9-phase-b-seven-pool`, `HEAD` `2beb1bd86f3c`. The working tree matches the
  recorded pre-study state plus the untracked study folders, and I left it unchanged.
  `research/study9-phase-b/results/test/` **does not exist**. `results/doors.jsonl` has 105 lines; its sha256 is
  `7ce12f2cedde85c8…`, equal to the door-log hash bound by chain entries 6 `qualify` and 7 `selection`, so no door has
  opened since the selection was sealed.

## 1. Chain and pins — PASS

- **`verify-chain`:** it reports `chain OK: 7 entries; integrity OK (code e24ced7b3854, engine f1f833a3177f, accepted
  by E2; canonical bytes after 2026-10-30: {})`. The entries and their door-log line counts are:
  1. `protocol` (7 door-log lines)
  2. `code-E1` (21)
  3. `parity` (35)
  4. `code-E2` (70)
  5. `search` (70)
  6. `qualify` (105)
  7. `selection` (105; entry hash `2cc50fbeaa20…`)

  `verifyChain` (`records.ts:71`) re-hashes every listed file, every link and the door-log prefix. `requireIntegrity`
  (`integrity.ts:164`) re-checks the data pins, the rulebook digest and the code and engine digests.
- **Phase order:** protocol → code-E1 → parity → code-E2 → search → qualify → selection. The interleaved `code-E2` is
  allowed by PROTOCOL.md §2.3 ("`code-<ID>` phases are interleaved as needed"). Every door opening records a chain
  head that the chain still holds.
- **Code amendments change no rule.** I extracted `results/freeze/code-protocol.tar.gz`, `code-E1.tar.gz` and
  `code-E2.tar.gz` and diffed them.
  - **freeze → E1:** the only change is `parity.ts` gate N2. The header comparison now leaves out `doorKey`, the door's
    label. This is AMENDMENTS **E1**.
  - **E1 → E2:** the only change is the line counter for the cache manifest in `commands.ts` (`seal`). This is
    AMENDMENTS **E2**.
  - **E2 → live:** `src/study9-phase-b/` and `scripts/` are identical to the E2 tarball.
  - **Tarballs match their digests:** each tarball's 27 code files hash to the file list of its own digest
    (`protocol_freeze.json` `integrity.code`, `code-E1.json`, `code-E2.json`).
  - **Engine unchanged:** the engine digest (`f1f833a3…`) and its 193-file list are the same at the freeze, E1 and E2.
  - **AMENDMENTS.md is append-only:** the snapshots `AMENDMENTS-protocol.md` ⊂ `-code-E1.md` ⊂ `-code-E2.md` = live
    are successive prefixes.
- **Rulebook digest:**
  - `FROZEN_SELECTION.json` `constants.sha256` = `64ede13e17f5b4f3…`.
  - This equals `protocol_freeze.json` `integrity.constants.sha256`, and the stored `values` objects are identical.
  - It also equals the **live** `constantsDigest()`, which I computed directly with Node, importing `integrity.ts`.
  - The live code digest `e24ced7b…` equals `FROZEN_SELECTION.json` `code.digest` and `code-E2.json`.
  - `test.ts:581` refuses to run if the live rulebook differs from the sealed one.
- **Sealed record bodies:**
  - All 77 records I checked have body hashes that verify. These are the selection, the protocol freeze, parity, the
    two cache manifests, `code-E1`, `code-E2`, and the 35 search and 35 qualification records.
  - The selection's 70 `records` pins (body hash and file sha256) match the files.
  - Every qualification record cites its search record's body hash and the same shortlist IDs in the same order.
- **Door log:** 105 openings. By door kind:
  - 7 `pilot`;
  - 28 parity: two attempts × 14;
  - 35 `search-<fold>` for the searches;
  - 35 `search-<fold>` for the qualifications.

  There is **no `test-*`, `slice` or `post` opening.**

## 2. Leakage — PASS

- **Every opening ends on time:** all 105 openings have root `data/vintages/study9-train-2024`. The maximum `end` and
  the maximum `lastDate` are both 2024-12-31. **No opening uses the canonical root.**
- **Per job (my script over `doors.jsonl`):** each of the 35 search jobs and 35 qualification jobs has exactly one
  opening, matched on its exact `purpose` string, with:
  - door `search-<fold>` and `end` = `lastDate` = the fold's training end (2019-12-31, 2020-12-31, 2021-12-31,
    2023-12-29 or 2024-12-31);
  - first session 2016-01-04 and a session count that is constant per fold (1006, 1259, 1511, 2012, 2264);
  - chain head seq 3 for the searches and seq 5 for the qualifications;
  - a distinct pid per job (70);
  - members: the pool plus VGT for a search, the pool plus the control books for a qualification;
  - the door `id` equal to the `door.id` in its sealed record.
- **No later dates in the records:** I scanned all 70 search and qualification records.
  - The only date strings after 2024 are the 70 `at` timestamps written when each record was created.
  - No period key lies after 2024.
  - No `ddPeak`/`ddTrough` lies after its fold's training end; the latest in any record is 2024-08-07.
- **Point caches:**
  - All 70 point-cache headers bind namespace `study9-phase-b`, the job, the record's door id, the fold end and one
    engine hash, `251075a760a1…`.
  - The 35 + 35 cache files re-hash to `results/search/cache-manifest.json` and
    `results/qualify/cache-manifest.json` (sha256 and byte counts).
- **Doors are closed in code:**
  - `door.ts:117-122` rejects any end after the projection on the projection root, and any use of the canonical root
    before the F24 test.
  - `door.ts:142-150` rejects any loaded session, or any instrument, after the end.
  - `gates.ts:57-62` closes every `search-*` door once `selection` is sealed, `FROZEN_SELECTION.json` exists,
    `results/test/` exists, or a test-door line is in the log.
  - `gates.ts:64-77` keeps every test door shut until both `selection` and `audit` are sealed, and enforces the fold
    order.

## 3. Seed independence — PASS

- **Namespace:**
  - All 35 search records have `namespace` = `study9-phase-b`, `stage` `PHASE_B_SEARCH` and `mode` `base`.
  - All 35 qualification records have `namespace` `study9-phase-b`.
  - The searches assert the namespace before opening a door (`search.ts:208`), and so do the qualifications
    (`qualify.ts:89`).
  - Every seed is `deriveSeed('study9-phase-b', …)` (`context.ts:30`, `space.ts:53-54`).
- **Label sets** (`search.ts:226` adds `track, fold` to every search label):
  - search: `screen` (`:289`), `combos` (`:298`), `lhs` (`:315`), `ga` (`:409`), `fill` (`:415`), `r1`/`r2`/`r3`/`r3b`,
    `refine`, `bootstrap`;
  - selection: `('select', rep, track, fold)` (`search.ts:860`);
  - confirmation: `[name, track, fold, rep]` with `name` ∈ {`confirm`, `confirm-inbox`, `-half`, `-wide`, `-d8`,
    `-norm`, `-d16`} and `confirm-book` (`evidence.ts:70`, `:117`; prefix `confirm`, `qualify.ts:103`).

  Selection and confirmation labels are disjoint. The test labels `('test', 'sets', fold, rep)` appear only in
  `test.ts:119/314` and in the post-test `diagnostics.ts:427`. No search or qualification path can reach them.
- **Disclosed earlier uses of test labels:** parity gate T0 and the pre-freeze smoke runs used test labels on
  training-projection data. T0 used them only on frozen and parity configurations, and kept booleans. This is
  disclosed in PROTOCOL.md §5.2 and AMENDMENTS A0, and no Phase B candidate was involved.
- **No incumbent seeded a search.** I built a set of 546 distinct incumbent book-vectors:
  - every book vector in Study 8's sealed `FROZEN_SELECTION.json` (477);
  - Phase A's 64 S1 generic vectors;
  - 5 vectors from the Phase A S2/S3 records;
  - the qualification controls (B1, B5, VG #1/#2).

  **0** of the 1,591,994 book-vectors in the 35 search archives match one of them. Neither does any book-vector of the
  shortlist or rung 3. The archive holds every configuration evaluated at rung 1. The screens are scrambled-Sobol per
  book and joint LHS (`search.ts:289-321`); the island fillers are LHS (`:415`).

## 4. The seven memberships — PASS

- **Exactly the approved seven** (`context.ts:98-142`):
  - G4-ILF KRE+GDX+ILF+MTUM
  - G4-EWW KRE+EWW+GDX+MTUM
  - N3-EDV EDV+IWM+XLF
  - N2-SMH SMH+XHB
  - V3-IWM VGT+IWM+XLF
  - N2-EDV EDV+XHB
  - VG3-IWM VGT+GDX+IWM

  These match the brief's §1 table. The `tracks` object is identical in `protocol_freeze.json`, in
  `FROZEN_SELECTION.json` `constants` and in its `tracks`.
- **The records match:**
  - Every search record's `symbols` and every shortlist member's books match its track.
  - `results/search`, `results/qualify` and `results/cache` hold only these seven tracks: 35 + 35 records and 70
    caches.
  - `scripts/jobs-search.txt` and `scripts/jobs-qualify.txt` have 35 lines each.
- **The exploratory track is labelled correctly:** VG3-IWM is a "user-approved exploratory VG-family test; not a Phase
  A nominee (a prespecified deviation from Phase A's recommended batch)".
  - PROTOCOL.md §1.2 (line 50) and §14 say so.
  - `context.ts:135-141` (`origin`) says so, and that text is sealed in `protocol_freeze.json` and
    `FROZEN_SELECTION.json` (`tracks.VG3-IWM.origin`).
  - The per-job records carry only the track ID; that ID is bound to the label through the sealed rulebook.

## 5. C/Q/E, roles and ranking — PASS (full recomputation, not a sample)

- **Q/E gates.** For **all 210 shortlist candidates** and **all 140 control evaluations** (35 × B1/B5/VG #2/VG #1) I
  reimplemented Study 8's `qualificationOf` (`study8-expanded-regime-d1/evidence.ts:276-335`) in Python, working from
  the evidence numbers. I recomputed Q1, Q2, Q2b, Q4–Q8, E1, E2, E3 and `marginal`:
  - **Inputs re-derived first:**
    - `nearBound`, from the books, the box and the radius;
    - `bestYearShare` = bestYear/net;
    - `exBestPerYear` = (net − bestYear)/max(1, y − 1);
    - `medianPerYear` = medianNet/y;
    - the floors, via `floorsOf(y, 2017, lastYear)`.
  - **Formulas:**
    - Q8 = (centre `TRAIN-<fold>` > 0) and (decisive train median ≥ 0.6 × that centre);
    - E3 = not dominated by B1's count-matched k = 8 neighbourhood, taken from the same track's record.
  - **Outcome:** **0 mismatches** in gates, failed lists, qualified flags or marginal flags.
  - **Totals:** 180 qualified, 5 marginal, 8 infeasible on training. The 8 are N3-EDV-F19 ×2 and N2-EDV-F19 ×6; all are
    unqualified, through `qualify.ts:141-146`.
  - **Gate failures:** Q8 17, Q2b 9, Q6 6, E1 6, Q2 2, E3 1.
- **Roles.** I reimplemented `assignRoles` (`study8 select.ts:74`) over every track × fold:
  - selection-family order;
  - qualified candidates only;
  - L∞ ≥ 0.10 from the roles already taken;
  - extras in shortlist order, with ledger Jaccard < 0.5.

  It reproduces all 143 sealed role entries (138 holders plus 5 sealed-empty roles: N3-EDV-F20 robust/balanced and
  N2-EDV-F19 profit/robust/balanced) **exactly and in order**. Checked directly:
  - the minimum L∞ between holders of a track-fold is 0.1000;
  - the maximum Jaccard of the 38 extras against earlier holders is 0.4706;
  - every holder is qualified and none is infeasible on training;
  - each holder's books and confirmation figures equal its qualification record;
  - each candidate's `trainingSelection`, books, pick and rank equal its search shortlist entry
    (`selection.pooled.nb`).
- **Ranking.** I recomputed the tier rule: "strong" iff the confirmation robust/yr is at least B1's in the same track's
  record. Within a tier the order is robust/yr, then lower p90, then ID. All five folds reproduce
  `rankedByFold` exactly (F19 22, F20 24, F21 31, F23 29, F24 32 holders). Each `b1RobustPerYear` equals its
  record's value, and `primaryRanked` equals `rankedByFold.F24`.
  - F24: all 32 holders are strong.
  - #1 is VG3-IWM profit (31,103/yr against B1's 8,071 under the VG3-IWM labels).
  - #2 is G4-EWW profit (31,024/yr).
- **Cross-door consistency:** for all 210 candidates, the centre net, DD, lots, episodes and ledger signature in the
  search record (pool + VGT door) equal those in the qualification record (pool + control-books door). The same holds
  for the B1 centre in all 35 pairs.

## 6. Engine parity — PASS

- **`results/parity/parity.json`** (sha256 `878c2d5fac0215ac…`; chain entry 3):
  - `passed: true` and all 19 gates `pass: true`;
  - `runDir` = `run-2026-11-03T000319361Z`, which is attempt 2;
  - attempt 1's `parity-attempt.json` fails only N2, as disclosed in E1.
- **The details support every claim in BASELINES_AND_PARITY.md:**
  - **P1:** 348 comparisons, 0 differences. Refusals per membership run from 221 to 2,580. Same-minute decisions:
    G4-EWW 30, V3-IWM 48, VG3-IWM 30, N2-SMH 4, N3-EDV 2, G4-ILF and N2-EDV 0; total 114.
  - **A1:** 22 draw sets equal: Sobol, LHS, and the clip/in-box/half/wide/d8/d16/norm/per-book neighbourhood designs.
  - **A2:** VG #1 and VG #2 evidence, gates and floors equal.
  - **A3:** I re-compared it myself. The replay `a3-search-VG-F19.json` equals Study 8's sealed
    `search/VG/F19/search.json` on every decision field: job through controls, `noEligibleRegion`, and the 9,216
    archive rows, whose decompressed content is identical. Only `namespace`, `door`, `at`, `seconds`, `archive.file`
    and `bodyHash` differ. Attempt 1's replay is identical too.
  - **A4:** 10 of 10 rows equal (F23 and F21: the G #11, VG #2 and VXRG #1 holders, plus two lite members each, one of
    them pooled).
  - **Other gates:** S8C 159 files unchanged; RB all 12 groups; P2 9 configurations, including 4 random B5-subset ones;
    P3 61/61; N1 108 checks; N2 5 cuts with search bodies equal at 2019-12-31 and 2024-12-31; C1 200 points; D1
    identical archives `d41abf21…`; G1 12 refusals with the expected reasons; L1 no offenders.
- **Minor wording point (non-blocking):** the 14% / next-open / +25 bps stresses in P1 were run on one new
  configuration per membership at W24 (21 rows). The five frozen controls ran at 5 bps W24 only. This fits PROTOCOL §10,
  but BASELINES_AND_PARITY.md does not give these counts.

## 7. Freezing — PASS

- **What `FROZEN_SELECTION.json` seals** (sha256 `1a2e6222b4bbd84c…`, body `87cea1e6…`, chain entry 7):
  - `testPlan.<fold>.shortlists`: all 42 members per fold, with full vectors;
  - `roles`, `rankedByFold`, `primaryRanked` and `testPlan.<fold>.roleHolders`;
  - `testRules`: T1–T7, ambiguous, block-only, nomination, outcome, persistence, insufficient;
  - `comparators`:
    - Study 8's selection body hash `5d266eea…`, which verifies against Study 8's file;
    - the qualification control vectors;
    - the test control keys;
  - `constants.values.study8Holders`. VG #2 = Study 8 rank 2, VG balanced, `VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d` =
    Study 8's F24 VG shortlist member 3 (`S8-VG-F24-3`), with books equal to Study 8's sealed books. `controls.ts:46-54`
    enforces the identity.
- **Nothing can re-rank, replace or rescue after a test:**
  - `test.ts` takes its holders and members only from the sealed `rankedByFold` and `testPlan` (`:593`).
  - It nominates in the sealed order, filtering out failed holders only (`:520-530`).
  - It refuses if the rulebook has changed (`:581`).
  - A crashed stage gets one deterministic rerun at most (`:574`).
  - The training doors are closed for good (`gates.ts:57-62`, `:94-101`).
  - `freeze-selection`, `search` and `qualify` refuse once their records or phases exist.
  - `preference.ts` is report-only and copies the mechanical nomination.
- **Minor latent hazard (non-blocking).** Running `seal search` or `seal qualify` again would hit `commands.ts:200-261`.
  That path deletes and rewrites the sealed `results/<phase>/cache-manifest.json` (`:232`) *before* `appendPhase`
  refuses the already-sealed phase (`:261`). This cannot re-rank or rescue anything. But the rewritten manifest would
  change a sealed file's hash, so `verify-chain` and every later stage would fail closed. It has not happened: both
  manifests verify. **Do not run either command again.** A guard against already-sealed phases could be added as a
  disclosed code amendment if wanted.

## 8. Multiplicity — PASS

- **Counts recomputed from the sealed search records:**
  - 35 searches and 146 islands (T1 extended G4-ILF-F24, N2-EDV-F20 and VG3-IWM-F21 to 6 islands);
  - island stops: 144 budget, 2 stagnation;
  - T2 fired in 21/35 jobs and T3 in 0;
  - 88 accepted refinement moves;
  - **498,579** configurations scored at rung 1 and **11,427,952** fresh point evaluations, over **60.9 search
    CPU-hours**;
  - qualification added 648,616 points and 3.1 CPU-hours;
  - 210 shortlist members, 180 qualified, and **138 role holders** across folds (F24: 32; bands 30 preferred,
    2 conditional);
  - every budget equals Study 8's schedule with s(d) = max(1, d/16).

  All of these match SEARCH_AND_COMPUTE.md. Its "14.8 GB" caches are 15.93 GB decimal, 14.84 GiB.
- **CSCV PBO:** finite for all 35 track-folds; median 0.60, range 0–1. F24 runs from 0.61 (N2-EDV) to 0.92 (N3-EDV).
  This is report-only, but the final report should give it prominence: training ranks are strongly selection-inflated.
- **Predeclared VG #2 comparison rules** exist in the frozen code (`preference.ts`, covered by code digest
  `e24ced7b…` in `FROZEN_SELECTION.json`):
  - the confirmatory one-sided test for the mechanical primary nominee only: 5th percentile of the block-21, 5,000-
    resample total > 0 (`:180-203`, seed `('preference','F24','confirmatory')`);
  - the family-wise single-step max-T test on common resample indices for all F24 holders (`maxT` `:65-81`; one
    bootstrap call per window `:156-175`; adjusted p < 0.05 `:289`).

  The unit test "the family-wise max-T test (review M5)" passes. The max-T family includes all 32 F24 holders. That is
  slightly more conservative than "every other holder" and consistent with §9.3.

## Tests and static checks

- **Unit tests:** `node --experimental-transform-types --disable-warning=ExperimentalWarning --test
  src/study9-phase-b/tests/study9b.test.ts` passed 14 of 14 (0 fail).
- **Type check:** `npx tsc --noEmit -p .` exited 0 with no output.
- **Lint:** `npx eslint src/study9-phase-b` exited 0 with no output.

## Findings summary

**No blocking finding.** Non-blocking notes for the record:

1. **Seal-path hazard:** a repeated `seal search|qualify` would rewrite a sealed cache manifest before refusing
   (`commands.ts:232` before `:261`). Never rerun these commands.
2. **P1 stress coverage:** the P1 stress rows cover one configuration per membership (21 rows), a count that
   BASELINES_AND_PARITY.md does not state.
3. **Disclosed test-label uses:** parity T0 and the smoke runs used test labels on training-projection data (disclosed
   in PROTOCOL §5.2 and AMENDMENTS A0).
4. **PBO:** high CSCV PBO on F24 (0.61–0.92). Report-only; it must appear in the final reporting.
5. **Cosmetic:**
   - E2's heading time is "05:50Z" while the chain seal is at 05:49:41Z (rounded to the minute);
   - the cache sizes are given in GiB but labelled "GB".

Result: CLEARED
