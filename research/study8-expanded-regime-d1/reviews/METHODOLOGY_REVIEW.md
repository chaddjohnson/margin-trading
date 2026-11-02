# Independent methodology review — Study 8 (before the freeze)

Reviewer: a fresh, read-only agent with no prior context. It was given the brief, the draft protocol (`PROTOCOL.md`
sha256 `3c4ded12965f…`) and the code, and told to read no market data and modify nothing. Report returned
2026-11-01T15:08:50Z (session transcript) and recorded verbatim below. The resolution of every finding is in `PROTOCOL.md` §13 and
`AMENDMENTS.md` R0.

---

# Study 8 methodology review: draft protocol and implementation (before freeze)

**Reviewed:** `/home/chad/projects/margin-trading-study8`, branch `research/study8-expanded-regime-d1`, base `bce526f`. Study 8 files are uncommitted. `PROTOCOL.md` sha256 is `3c4ded12965f…` and the brief sha256 is `196ada5320ed…`, which matches what the protocol quotes. Every path below is relative to the worktree root.

**What I did:** I read the brief and protocol in full and all Study 8 modules. I diffed them against Study 7 (`search.ts`, `fitness.ts` and `designs.ts` are unchanged apart from labels; `evidence.ts`, `evaluate.ts`, `select.ts`, `qualify.ts` and `parity.ts` were changed on purpose). I also read the shared loader and engine paths. The unit tests ran 7/7 and `tsc --noEmit -p .` was clean. Nothing under `data/` was read and nothing was modified.

## Overall verdict

I found **no critical issue**. The data doors are sound, in this sense:
- every search and qualification process loads only its fold's training window (`data.ts:32–86`), and the shared loader drops bars past the end date;
- qualification uses the fold's own search door;
- the selection reads only sealed search and qualification records;
- test doors need the `selection` and `audit` phases and the documented fold order;
- search doors refuse once the selection is sealed;
- test seed families are disjoint from every search, selection and confirmation family;
- test outcomes can only flag, never re-rank.

The design is **not ready to freeze yet**. Six findings are major:
1. **(M1)** The program's code is not pinned after the freeze. The test gates read their thresholds live from `context.ts`, and with no commits there is no copy of the frozen code.
2. **(M2)** The market data are live symbolic links into a checkout the user is actively changing, and they are not pinned after the parity stage.
3. **(M3)** The test gates leave out the brief's required "training-defined activity" requirement. A nominee could take zero new trades in 2025–2026 and still pass.
4. **(M4)** The study's stated purpose, whether wider training makes neighbourhoods more durable, has no predeclared statistic. The fold-by-fold comparison with Study 7 is no longer like for like.
5. **(M5)** Budgets are equal across 8–40 dimensions, but the brief requires normalization by dimension and an adequate 40-D budget.
6. **(M6)** The protocol says in-box designs are never decisive, yet they gate Q2b and T2b.

All six can be fixed before the freeze without touching any data. Once they are fixed and the minor items are dispositioned in `AMENDMENTS.md` R0, the protocol is fit to freeze.

## Findings

### Major

**M1 — The code and the decisive thresholds are not pinned after the freeze (fail-open integrity).**
- **Where:** `records.ts:19–29` (`codeDigest`), `main.ts:35–47` (freeze), `select.ts:153` (digest recorded, never compared), `gates.ts:11–62` (no code check), `test.ts:225–263`. The last one reads `eligibility`, `testGates` and `stresses` from `context.ts` at run time, not from the sealed `FROZEN_SELECTION.json`.
- **Problem:**
  - The freeze stores a digest of the code but never checks it again.
  - The search, qualification and test records do not even record a digest.
  - After the freeze, an edit to `gates.ts`, `evidence.ts`, `select.ts`, `test.ts` or the thresholds would go unnoticed.
  - The selection seals only the *text* of T1–T5, while the test stage applies whatever numbers `context.ts` holds when it runs.
  - The Study 8 files are untracked in git, so the digest's file hashes are the only trace of the frozen code. The code cannot be rebuilt from them.
  - The brief requires "source hashes pinned … verify it before advancing; fail closed on any mismatch".
- **Fix:**
  - At the freeze, save a `tar.gz` of `src/study8-expanded-regime-d1/`, `package.json` and `research/…/scripts/` into `results/`, and list it in the `protocol` phase of the chain.
  - Record `codeDigest()` and the hashes of the shared `engineFiles` (`evaluate.ts:53–70`) in the freeze record and in every sealed stage record.
  - Add a gate, called from `doorGate` and from every stage command, that compares the current digests with the frozen ones. It should fail closed unless an AMENDMENTS entry that is itself sealed in the chain acknowledges the new digest.
  - Seal the numeric thresholds in `FROZEN_SELECTION.json` (eligibility, `testGates`, stress settings, schedule). `test.ts` should check they equal `context.ts` before opening any door.

**M2 — The market data are not pinned across stages.**
- **Where:** `data.ts:57–104`; `parity.ts:46–82`. P4 runs only during the parity stage.
- **Problem:**
  - `data/{SYM}` are symbolic links into the main checkout, which the user is editing (its dirty state already shows market-event edits).
  - A door logs the files' sha256 and binds them into the door id, so caches refuse a changed file. But no door compares the hashes against frozen values.
  - Vendor-revised historical bars with the same last date would therefore be used silently by later search, qualification or test jobs.
  - Only `test-F24` fails closed, and only if the last date moves.
  - `data/partitions.json` is not in the door id at all.
- **Fix:**
  - Record the full-file sha256 of the five data files, the splits file, `partitions.json` and `distributions.csv` in `protocol_freeze.json`.
  - In `openDoor`, check them before loading and refuse on any mismatch.
  - Add the partitions hash to the door id.
  - The protocol's statement that the links are "read-only" (§2.1) should be enforced (for example with `chmod`) or reworded.

**M3 — The test gates have no activity requirement, which the brief requires for every nomination.**
- **Where:** `test.ts:234–252`; `PROTOCOL.md:363–372`.
- **Problem:**
  - Brief §8 says "every nomination must satisfy … training-defined activity/concentration requirements".
  - T5 covers concentration only. Q5's activity floors apply only to training, and `deep().test.newLots` and `newEpisodes` are computed but never gated.
  - Counter-example: a lot open on 2024-12-31 (the maximum hold is 30 calendar days) closes in January 2025 for at least $18.2k (10,000 × yTest ≈ 1.82). That alone satisfies T3's centre test. T5's "largest lot ≤ 25%" is measured on whole-run net and does not catch it. A holder with **zero new trades in 22 months** could then be nominated.
- **Fix:** before the freeze, without looking at any outcome, predeclare a T6 with two parts:
  - Q5's floors on the whole run with y_run: lots ≥ ⌈1.5·y⌉, episodes ≥ ⌈0.5·y⌉, lot years ≥ 3, and every pooled book ≥ ⌈0.4·y⌉;
  - a test-window floor, such as new funded lots ≥ ⌈1.5·yTest⌉ and new episodes ≥ ⌈0.5·yTest⌉. For F24 that is 3 lots and 1 episode.
- Consider E2 (net per occupied capital-year) on the whole run as well. Add T6 to `testRules` and to the selection seal.

**M4 — The study's central question has no predeclared statistic, and the fold comparison with Study 7 is not like for like.**
- **Where:** `PROTOCOL.md:35–36, 40–42, 176, 329, 388, 409–412`; `select.ts:139–147`; `test.ts:282–310`.
- **Problem:**
  - The brief's stated purpose is whether 2016–2024 training "materially improves temporal durability". The protocol only says "fold-by-fold qualification and persistence rates … are reported".
  - Qualification is now in-sample for every fold. It re-checks the search's own constraints C1–C7 with fresh seeds, so H2's "qualify more candidates" is close to tautological.
  - Out-of-fold neighbourhood evidence is computed **only for role holders**; other shortlist members get centre-only runs.
  - The T gates differ from Study 7's out-of-fold gates for F19/F20/M. Study 7 applied Q1–Q8 and E1–E3 on the run to the test end, including Q5, Q8, E1 (p10 > 0) and E2, which the T gates drop. So "F21 = Study 7 M analogue" is not the same statistic.
  - "Persistence rate", its denominator, folds with no role holders, and "materially improves" are all undefined.
  - Test windows differ in length (2, 2, 2, 1 and about 1.82 years) and in regime, which confounds any comparison across folds.
- **Fix:**
  - Define a persistence rate per fold as non-failed role holders divided by role holders, plus a shortlist-level rate.
  - On every test door, run the full test-family evidence and the T gates for **every shortlist member**. It is cheap: about 2k points per member.
  - Also compute, as a report-only table, Study 7-equivalent out-of-fold Q/E gates on the run to each test end: Q1, Q2, Q2b, Q4–Q7, E1, E2, plus a Q3-style check (test-window centre > 0 and median > 0). This gives a like-for-like comparison with Study 7's F19, F20 and M.
  - Declare the comparison descriptive, or define what "materially improves" means.
  - Adopt Study 7's "insufficient evidence" rule for folds with no holders or fewer than 3 funded lots in the test.
  - State the confound between test-window length and regime.

**M5 — Equal per-track budgets break the brief's dimension-normalization and "do not shortchange 40-D" requirements.**
- **Where:** `PROTOCOL.md:288–290`; `context.ts:142–174`; `search.ts:48–69`; `tests/study8.test.ts:27–44` (which locks equality in).
- **Problem:**
  - Brief §2.3 requires "normalization for 8/16/24/32/40 dimensions", and brief §7 requires "an adequate predeclared budget with dimension-appropriate proposals and diversity coverage".
  - The protocol gives every track the same 4 × 2,048 new configurations, the same 4,096 combinations plus 1,024 LHS, and the same rung caps. It states openly that coverage is not normalized ("dimension-fair in evaluations, not in coverage"), with no justification or coverage diagnostic.
  - By my estimate from the timing pilot, the base 40-D job is about 3–4 CPU-hours (roughly 330k–450k points at 31 ms). Scaling it up is affordable.
- **Fix:** predeclare a scaling rule, for example newPerIsland × max(1, d/16), or more islands and a higher `islandsMax` for d ≥ 32, and pool screen combinations and LHS scaled with the number of books. Alternatively, give a written justification plus a predeclared coverage diagnostic and trigger. Replace "dimension-fair" with an accurate description, and update the unit test to match.

**M6 — The protocol contradicts itself on a decisive design.**
- **Where:** `PROTOCOL.md:222–224` ("Sensitivity designs (never decisive): in-box …; every other variant is reported only") versus `PROTOCOL.md:319` (Q2b) and `PROTOCOL.md:369` (T2b); code `evidence.ts:218` and `test.ts:237–239`.
- **Problem:** The in-box design does gate Q2b and T2b.
- **Fix:** This is text only. Classify in-box as decisive for near-bound candidates (Q2b, T2b) and count-matched k = 8 as decisive for E3; everything else is report-only.

### Minor

**m1 — The seed-family table does not describe the code exactly.**
- **Where:** `PROTOCOL.md:229–237`; `search.ts:142, 673`; `evidence.ts:60–90`.
- **Problem:**
  - Selection labels in the code are `['select', rep, track, fold]`, not `('select', track, fold, rep)`.
  - These families are not listed: `screen`, `combos`, `lhs`, `fill`, `ga`, `bootstrap`, `<prefix>-inbox/-half/-wide/-d8/-d16/-norm/-book`, `('test', fold, 'bootstrap', …)`, `parity` and `pilot`.
- **Fix:** List all of them, verbatim.

**m2 — "Ambiguous" and "marginal" wording differs from the code.**
- **Where:** `PROTOCOL.md:376` versus `test.ts:256–260`, and `evidence.ts:242`.
- **Problem:** The protocol says "a single test family fails T2"; the code tests whether *any* family fails.
- **Fix:** Say "at least one family". Also state that ambiguous holders are nominated with a label.

**m3 — "Test years" is undefined, although T3 depends on it.**
- **Where:** `test.ts:103–104`.
- **Fix:** Define yTest as the sessions from the first test session to the test end, divided by 252. For F24 this is about 1.82, so the centre threshold is about $18.2k and the median threshold about $9.1k. State the value for each fold.

**m4 — Refinement and shortlist rules are described incompletely.**
- **Where:** `PROTOCOL.md:281–284` versus `search.ts:507–548`, and `multi-etf-d1/context.ts:79–138`.
- **Problem:**
  - Unstated in the protocol: an accepted move must keep every constraint, and an infeasible start uses a violation-reduction rule (≥ 0.01).
  - The "±1/±2 probe moves" are really ±5/±10 grid units for X, stop, L, buffer and P, ±1/±2 for Y and hold, and ±10/±20 for W.
  - Also unstated: the shortlist's robust pick uses the 50% median filter, and behavioural de-duplication uses the funded-ledger signature.

**m5 — The PBO definition is not in the protocol.**
- **Where:** `qualify.ts:117–127`.
- **Problem:**
  - Unstated: blocks start at 2018H1, the earliest block is dropped when the count is odd, the matrix uses centre half-year attributions, and the 64 configurations are taken by feasibility then robust profit.
  - The comment at line 117 ("constrained-domination order") contradicts the sort on line 118.
  - F19 has only 4 blocks (6 splits), which gives coarse resolution.

**m6 — The return-rank diagnostic is undefined and is not computed.**
- **Where:** `PROTOCOL.md:409–412`; `select.ts:139–147`; `test.ts:306–310`.
- **Problem:** The protocol does not say which "training order" is meant (shortlist rank, or selection-family robust profit), and `testPlan.shortlists` carries no qualified flag.
- **Fix:** Define it precisely, and compute it in the test record or in a script that is sealed before any test door opens.

**m7 — Clipping mass is promised but never computed.**
- **Where:** `PROTOCOL.md:243`; brief §5.
- **Problem:** `designs.ts` exports `clippingSummary` and `boundMass`, but nothing calls them.
- **Fix:** Add them to `evidenceOf`; the computation is deterministic and needs no data.

**m8 — Some disclosures are missing.**
- **Where:** `PROTOCOL.md` §1.4, §5 and §7.
- **Problem:**
  - B1 (VGT `primary`) was selected with data through 2025, so it is in-sample on the F24 test window. That favours B1 in the tier, E3 and the bootstrap comparisons.
  - Islands share the rung-1 offsets (common random numbers), so they are independent only in their GA randomness.
  - Study 7's n = 16 precision pilot was measured at ≤ 24 dimensions on DEV. Using it for 32-D and 40-D tracks and 7.5-year windows is an extrapolation.
  - The T2025Q2 and G2026 periods were chosen with hindsight. They are report-only.

**m9 — Multiplicity at the test stage is not declared.**
- **Where:** `select.ts:49, 116`; `PROTOCOL.md:383–388`.
- **Problem:** Up to 30 F24 role holders are tested, and the nominations are all non-failed holders, in effect a sequential veto.
- **Fix:** Predeclare that the count and the expected number of false passes are reported. Name the single primary nominee as the top-ranked non-failed holder.

**m10 — "Extra" holders are distinct only by parameter distance.**
- **Where:** `select.ts:81–94, 116`.
- **Problem:** The brief asks for "genuinely behaviorally distinct" extras; L∞ ≥ 0.10 on parameters does not guarantee that.
- **Fix:** Add a ledger-overlap criterion (for example, training funded-ledger Jaccard < 0.5 against every holder), or describe the criterion as parametric.

**m11 — The hash chain has gaps.**
- **Where:** `records.ts:69–125`; `gates.ts:39–44`.
- **Problem:**
  - Truncating the tail of the chain cannot be detected, so deleting the last lines would reopen the search doors.
  - The door log `doors.jsonl` is not sealed.
  - Before each phase seal, a job's record can be deleted and rerun; only the door log shows it happened.
- **Fix:**
  - Put the door log's sha256 and line count into every chain entry.
  - Make search and qualification doors also refuse if `FROZEN_SELECTION.json` or any `results/test/*` file exists, or if the door log shows a test-door opening.
  - Make `seal search|qualify` refuse when a job's door was opened more than once without a disclosure.
  - Copy the chain head hash into `RESEARCH_RECOVERY.md` and `AMENDMENTS.md` after each phase.

**m12 — The parity check relies only on the chain.**
- **Where:** `gates.ts:19–22`.
- **Problem:** `requireParity` does not read `parity.json`.
- **Fix:** Also check `parity.json` `passed === true` as a defensive measure.

**m13 — NaN can pass E3, and a NaN violation counts as feasible.**
- **Where:** `evidence.ts:235–238`; `nsga2.ts:16–27`; `fitness.ts:149–151`.
- **Problem:**
  - If the candidate's d8 `medianPerYear` is NaN, the dominance test is false, so E3 passes.
  - A NaN violation is treated as feasible by `constrainedDominates`. This is unlikely in practice.
- **Fix:** Require finite values for E3, and map any non-finite violation to Infinity.

**m14 — Parity gaps.**
- **Where:** `parity.ts:195, 114–121, 219, 275–306`.
- **Problem and fix:**
  - `s7Rows.length >= 15`: the real count is 27. Assert the exact set of keys.
  - B1 at 2026-10-13 is not reproduced, although Study 7's `final.json` has `w13`, which the brief asks for.
  - P1 has no training-partition horizon, while the F19–F23 doors use `training`. Add W23.
  - N1 tests only the base settings. Add next-open and +25 bps, since Q7 and T4 gate on them.
  - The Study 5 Track 1/2a GDX controls (G-T1P, G-T1S, G-T2C, G-T2P) are set `equal: true` with only a grid check. Label them "grid-only".

**m15 — Two reported checks are not enforced.**
- **Where:** `test.ts:146–158`.
- **Problem:** The minute series' `matchesTracker` is reported but never enforced, and the per-lot MAE assumes the two replays list lots in the same order.
- **Fix:** Assert both.

**m16 — The `--confirm` result is only logged.**
- **Where:** `test.ts:337–343`.
- **Fix:** Store an `identical` boolean, or fail the run.

**m17 — The pre-freeze smoke test is not preserved.**
- **Where:** `PROTOCOL.md:12–13`; door log line 2.
- **Problem:** The smoke test's script and output are not kept.
- **Fix:** Save them under the study directory and list exactly which booleans were printed, so a reader can confirm no gate was tuned.

**m18 — The `pool` runner bypasses the doors.**
- **Where:** `commands.ts:152–157`; `poolrun.ts`.
- **Problem:** `runResearchPool` loads data with no gate and no door log.
- **Fix:** Gate it on `test-F24` being sealed, and log every opening.

**m19 — No watchdog and no crash policy.**
- **Where:** `scripts/run_jobs.sh`; `PROTOCOL.md` §7.
- **Problem:** The brief asks for no-progress timeouts, and nothing says what happens to a crashed test door.
- **Fix:** Add a log-inactivity timeout. Predeclare that a crashed test stage is rerun once, deterministically, and disclosed.

**m20 — Unit tests miss the decisive logic.**
- **Where:** `tests/study8.test.ts`.
- **Problem:** There are no tests for the `doorGate` ordering, `qualificationOf`, `gatesOf` (including a value of exactly $35,000, NaN and a partial 2026) or the role assignment. The test titled "namespaced to Study 8" does not actually test the namespace.
- **Fix:** Add these tests.

**m21 — The review resolution sits in a mutable file.**
- **Where:** `PROTOCOL.md:482–484`; `RESEARCH_RECOVERY.md`.
- **Problem:** §13 points to `AMENDMENTS.md` R0, which can still change, while the recovery checkpoint plans `reviews/METHODOLOGY_REVIEW.md`.
- **Fix:** Summarize the resolutions inside `PROTOCOL.md`, as Study 7 §16 did, and include the review file in the `protocol` phase seal.

**m22 — Study 7 rules dropped without comment.**
- **Problem:** Study 7's outcome classes (qualified / stable-but-weaker / none) and its threshold-sensitivity table (§7.4) are absent.
- **Fix:** Adopt them, or state that they are omitted.

**m23 — H1 is worded wrongly.**
- **Where:** `PROTOCOL.md:40`.
- **Problem:** F19's test window (2020–2021) does not include 2022, so "because 2022 is unseen" does not apply to it.

**m24 — GDX holders have no GDX comparator in the bootstrap.**
- **Where:** `test.ts:287–297`.
- **Problem:** The paired bootstrap for G-track holders has no G-PA comparator.
- **Fix:** Add G-PA.

**m25 — The gap-risk check is not specified.**
- **Problem:** Brief §4 asks to "check fill assumptions and gap risk".
- **Fix:** Report the number of gapped-open stop fills and the loss beyond the stop for every role holder.

### Notes

- n1: `search-F24` and `qualify-F24` load the `all` partition labelled `access: 'manual evaluation'` (`data.ts:75`). The test doors `test-F19`, `test-F20` and `test-F21` are labelled `optimization`. Both are disclosed, but the door log should state the real purpose.
- n2: The fallback to `frozenGrids.VGT` at `search.ts:217` is never evaluated (line 220 skips it). Remove it so it cannot look like seeding.
- n3: The door ids of `search-F24`, `qualify-F24`, `pilot-F24`, `parity-cut` and `test-F23` are identical because the data window is the same. This is harmless: caches are per job and the computations are identical.
- n4: The cross-track ranking uses the confirmation families, the same sample as the Q veto, which gives a winner's-curse bias. It is training-only. Consider reporting the selection-family figures beside it.
- n5: B1's tier reference differs slightly by track within a fold, because the confirmation seeds carry the track label.

## Checked and found correct

- **Door ends and partitions:**
  - each door asserts its last session is on or before its end (`data.ts:82`), and the loader discards bars past the end;
  - splits are forward-adjusted, so pre-split bars are untouched;
  - `test-F24` requires 2026-10-29 as its last session;
  - qualification uses the fold's own `search-F` door.
- **Gate order:**
  - search doors need `parity` and refuse after `selection`;
  - test doors need `selection`, `audit` and the earlier folds (F19 → F24);
  - `search`, `qualify`, `freeze-selection`, `record-audit` and `test` are write-once and check their predecessors;
  - parity throws before sealing on any failure.
- **Hash chain:** it detects tampered files, missing files, broken links and reordered lines (seq and prev checks). Edits to `PROTOCOL.md` after the freeze break every gate.
- **Selection inputs:** the selection reads only search and qualification records. Roles follow the selection-family order and qualification only vetoes. The tier and ranking use training figures only. The ranking is sealed before tests; tests only flag, and nominations are the sealed F24 order restricted to non-failed holders.
- **Seeds:** all use the `study8-expanded-regime-d1` namespace (`designs.ts:41`, `space.ts:42, 71`). Test families `('test','sets',fold,rep)` are disjoint from r1, r2, r3, r3b, refine, select and confirm. Every family includes the fold, so folds are independent.
- **Fitness:** C1–C7 and the eligibility constants are Study 7's, literally (a unit test asserts this). The strict `< $35,000` comparison is applied to unrounded DD everywhere. The floors scale with y as the protocol states.
- **Qualification gates** Q1, Q2, Q2b and Q4–Q8, E1, E2 and E3 match `PROTOCOL.md` §8.1, with no Q3. The marginal flag is correct.
- **Test gates** T1–T5 match the §8.4 text (except m2 and m3):
  - stresses are 10 bps, 14%, next-open and +25 bps;
  - T5 counts `2026~partial`;
  - leave-one-year-out includes 2026;
  - 2025 and 2026 YTD are reported separately;
  - the run is continuous from 2016-01-04, with test attribution by marks at period boundaries.
- **Neighbourhood designs:**
  - 3 × 128 pooled, unique, with per-family figures and Wilson bounds;
  - in-box 2 × 128;
  - 0.5r and 1.5r;
  - count-matched k = 8 (2 × 128) and k = 16 for pools of three or more books;
  - norm-matched √(8/d);
  - per-book 64;
  - clipping uses Study 6's `pointFromUnits`, unchanged.
- **Caches:** the header binds the door id (members, partition, first/last session, data, splits and distribution hashes) and the engine hash. A torn last line is tolerated. Non-finite values are serialized as null, which handling makes fail closed.
- **Parity:**
  - P1 covers W24 and W29, including perturbations of the five-book pool;
  - P3 anchors are read from `config/pools/B5.json` and Study 7's `final.json` (15 controls and 12 candidates);
  - N1 uses two cuts and includes five-book pools;
  - C1 covers distinct keys, refused headers and 200 recomputations;
  - D1 is two fresh runs plus a stopped-and-resumed run, in child processes;
  - G1 refusals are as stated.
- **Exposure:** the 2025–2026 test is correctly described as retrospective, on previously inspected history, and not as a holdout. Study 7 references and GDX controls never seed any stage and are non-decisional.
- **Study 7 reference ranks** 1, 2, 5, 6, 7, 10 and 11 map to the brief's named candidates (verified from Study 7's `FROZEN_SELECTION.json`).
- **The timing pilot** recorded no economic figures.
