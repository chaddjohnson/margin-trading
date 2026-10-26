<!-- Verbatim handback of the independent pre-selection-freeze review agent (general-purpose subagent, started ~10:25Z, finished 2026-10-26T10:44:01.373Z, after the sealed final selection and before freeze-selection). Extracted unchanged from the session transcript on 2026-10-26. Brief: pre-selection-freeze-review.PROMPT.md. Dispositions: minor 1-5 handled in report wording (no amendment); see IMPLEMENTATION_AUDIT.md. -->

## Independent pre-selection-freeze review: diverse-d1, final round

I changed no repository file and no git state: `git status --short` was the same before and after. I ran no `npm run diverse-d1` command and loaded no market bar after 2023-12-29.

During the review, other files appeared in the study directory, written by the main session, not by me: report drafts such as `FAMILY_SELECTION.md` and `RECOMMENDATION.md`, `results/ledgers/final-finalists.json` and `results/logs/ledgers-final.log`.

My scripts are in `/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/010d3095-ab38-45a6-a34b-fb43ed1c0d12/scratchpad/review3/`.

### Checks I ran

1. **Toolchain.** `npx tsc --noEmit` exited 0. `npx eslint src/d1-diverse` exited 0. The study tests passed 26 of 26, including the post-cutoff +3% mutation test.

2. **Sealed records and amendment.**
   - Every sealed record verifies against its body hash: `protocol_freeze`, `design_commitment`, `PROCEDURE_GATE`, the three search manifests, the three calibrations, both `PICKS` and both validations, `rounds/final/selection.json` (file `19eae964…`, body `26b29f03…`) and the root `PROTOCOL_FREEZE.json`.
   - The amendment chain verifies: amendment 1's `previousHash` is the freeze body `918c221b…` and its hash is `7a0aa610…`.
   - The current code manifest is `42d2dd47…` (405 files), equal to amendment 1's `codeAfter`.
   - Protocol (`6e4df57a…`) and context (`98428dac…`) are unchanged.

3. **Amendment versus patch.** I reverse-applied the 10 replacements of `amendments/amend1_final.py` to the current `final.ts`, matching whitespace-insensitively. I then formatted the result with the repository's prettier. Its sha256 is `eb20e15e…`, exactly the frozen `final.ts` hash. So the current `final.ts` is the prettier-formatted patch of the frozen file, with no other edit.

4. **Families, recomputed independently** (`families_check.py`). From each final `archive.jsonl` (log hashes equal the manifest) I rebuilt:
   - the credible set: J-u 20,467, T-u 21,030, J-s 21,028, T-s 23,375;
   - the §6.3 ranking;
   - the leader-ordered complete-linkage families.

   The results:
   - **Families:** they equal `promotion.json` in count, leader and size for all four arms (5,276 / 4,979 / 4,151 / 4,353).
   - **No chaining:** every family is a clique. I checked 461,131 / 745,758 / 2,471,621 / 4,466,638 pairs, and none is non-close.
   - **Archive fields:** archive scores, `feasible` and `tie` values equal each entry's own J or T set.
   - **Slots:** the slot sequence, attempts and fates re-derive exactly. Each promoted family's `tried` list is its top 3 members, and the representative is the first feasible by promo score. The F1/F-P failure strings recompute.

5. **Coverage, recomputed from the final archives** (`coverage_check.py`):
   - Per-symbol configurations, distinct vectors, band counts and co-members all equal `search.json`.
   - Minimum configurations per symbol are 1,026 or more (required 600). Minimum distinct vectors are 657 or more (required 225). Co-members are 60, A5 is 20 and A6 is 8.
   - The protected examples are equal.
   - The unseeded archives contain no `control:` or `benchmark:` vector (J-s and T-s have 510/979 and 535/802).

6. **Refinement and pruning** (`refine_check.py`), over all 31 `refine-f*.json` files:
   - **Refinement:** all 78 accepted refinement moves gain more than $5,000, and the move chains are consistent.
   - **Re-refinement:** its 6 moves change no membership.
   - **Pruning:** every pruning interval has n = 128 and 10,000 resamples. Every removal is the lowest-marginal member among those with lower bound ≤ 0 whose removal keeps F1, and every terminal step has all lower bounds > 0.
   - **Chaining of states:** the first prune starts at the refined state, the re-refinement at the pruned state, and the final prune at the re-refined state.
   - **Results:** each result is the final-prune state and passes F-P. There is no blocked prune, no prune to empty and no walk-back.
   - **The one stop:** T-s-f6 stopped with "F-P after pruning" at 35.16%.
   - **Duplicates and links:** no exact duplicate results; each assessment key equals its refine result.

7. **Gates, scores, ranking and labels, recomputed independently in Python** (`gates_check.py`), for all 30 finalists:
   - **Gates:** G1–G8 recomputed from the stored fields equal the stored gates and `pass`. ΔP50 against B4/B5 was recomputed from the stored confirm-A draws and `benchmarks.json`. The G7 ladder interpolation, `maxTieChange`, boundary counts and member grades and lots also match.
   - **Scores:** S_J and S_T recomputed from the stored draws and the final calibration equal the stored values.
   - **Labels:** all labels re-derive, including near-reference, neighbour-of-benchmark and inspected-control-vector, using R1, R4, the October 25 finalist, B1/B4/B5 and the seeded control grids dumped read-only.
   - **Rankings:** the J and T orders equal `selection.json`, with no exact tie.
   - **Hypothetical nominations:** recomputed equal to `wouldNominate`.

8. **Read-only dry run of `runFreezeSelection`** (`dryrun_freeze.ts`): the same imports and logic as `final.ts` 60–241, stopping before the data hashing and `writeSealed`.
   - `requireFrozen` passes.
   - The gate and value round-trip is equal for all 30 finalists.
   - The score recomputed from draws deviates by exactly 0. A deliberately swapped net (J↔T) never matched, so the check discriminates.
   - The nominations equal the stored ones, `nominatingProcedure` is null and there is no coverage error.
   - All 96 records the freeze will hash exist, including both keys confirm-b will look up.
   - `tier.key` is E, `parity.counts` is defined and all 61 data files exist (stat only).
   - `benchmarks.json` holds `confirmA` and `intervals.p50.se` for B1, B4 and B5.

9. **Leakage.**
   - The final door is `trainingUniverse`, end 2023-12-29, lastDate 2023-12-29, 2,012 sessions, with 61 bar hashes identical to the final calibration's door.
   - The latest funded decision anywhere in the final select records is 2023-12-14 14:42 UTC.
   - The provenance code is `fd549635…` for the search and `42d2dd47…` for the selection.
   - The `final.ts` mtime is 08:49:00Z: after the search sealed (08:48:34Z) and before `select` started (08:49:38Z).

### Material findings

**None.** The final selection records are internally consistent and follow PROTOCOL §10–§13 and §15. Amendment 1 is limited to `final.ts` and is implemented as patched. Nothing in the final round used bars after 2023-12-29.

- **Q2: nominations are empty because GP failed.**
  - `PROCEDURE_GATE.json` has `nominatingProcedure: null`: J fails clause (iii), T fails clause (i).
  - `final.ts` 187–189 therefore writes outcome "no advancement — neither procedure passed its preregistered procedure gate GP (§14.5)" with `nominees: []`.
  - `authorizedCommands` (280–283) is `['confirm-b', 'evaluate (writes only the no-advancement record)']`.
  - The hypothetical note (252) reads "HYPOTHETICAL — GP failed for both procedures; these lists are NOT nominations…", which is correct.
  - The lists are J: alternate 1 = J-s-f2, and T: alternate 1 = T-s-f5. Both carry the notes "no primary-eligible finalist; seeded from inspected benchmarks — start not walk-forward testable". There is no alternate 2, because no passing finalist has ≤ 3 books.
  - With no nominee, `runEvaluate` (436–458) needs `confirmB.json`, then writes only the no-advancement record and loads no data. `evaluationUniverse` would refuse anyway (`data.ts` 148–158).

- **Q3: amendment details.**
  - The score recomputation (`final.ts` 132–139) uses `draws.net` for J and `draws.netT` for T.
  - It uses k = `members.length`, the same k as `assess.ts` 278.
  - It uses the sealed final calibration (`readCalibration('final')`, body `2bf44343…`, the same as `selection.json`'s `calibration` field).
  - Four finalists have non-zero drawdown penalties (J-u-f4, T-u-f5, J-s-f6, T-s-f5), so the calibration input is actually exercised.
  - The records include `select/benchmarks.json` (222) and every `refine-f*.json` (213–219).
  - confirm-b's input check (311–323) uses `sha256File`, the same function `hashOfFile` uses (199), with identical keys (`final/<arm>/assessment.json`, `final/benchmarks.json`).
  - The data files are hashed one at a time (233–238).

- **Can `freeze-selection` throw on this data?** Not on this data. Its only throw conditions are intended guards: a sealed input changing, or `FROZEN_SELECTION.json` already existing.

- **Can `confirm-b` throw on this data?** Not on this data:
  - `requireFrozen` passes and the record keys exist.
  - The inspected references load. All their grids lie inside the box and all their symbols (XLE and XLF included) are in the 61 eligible symbols and in the 64-symbol pattern universe.
  - The stage label `'confirm-B'` is not validated against any list (`d1-robust/evaluator.ts` 247–270) and is used nowhere else.
  - It throws only if one of its five inputs changes after the freeze, which is intended.

### Minor findings (reporting only; none changes an outcome)

1. **The `records` map mixes two kinds of hash without saying which is which** (`final.ts` 203–204 and 226–231 versus 207–222).
   - Body hashes: `<window>/search`, `<window>/calibration`, `final/selection.json`, `PROCEDURE_GATE`, `PICKS` and validation.
   - File sha256 values: the per-arm `search.json`, promotion, assessment, refine and benchmarks files.
   - `final/selection.json` looks like a file entry but holds the body hash `26b29f03…`, not the file hash `19eae964…`, so a `shasum` check of it would "fail".
   - Fix: label the two kinds, in `final.ts` (amendable) or in the report.

2. **The hypothetical lists are thin.** They carry only `{role, key}` (171, 249–254) and drop the pick notes and labels. `rankings` carries `label` but no `key` (156–164), so a reader must cross-reference keys through `selection.json`.
   - An "alternate 1" with no primary is easy to misread.
   - Fix: include the label and the note "no primary-eligible finalist; seeded from inspected benchmarks — start not walk-forward testable".

3. **Two fields are narrower than their names suggest** (§16.1 completeness).
   - `budgets.tierRecord` is the context constant `tiers.E` (`round.ts` 73–77), not the sealed `results/benchmark/tier.json` (8 workers, 150,000-trace cache). The latter is bound only through `provenance.tier`.
   - `evaluations` (262–269) holds archive sizes only. It has no promotion, refinement or assessment counts, although those exist in `refine-*.unique` and in `selection.json`'s `cache` field.

4. **Slot names describe the leader, not the finalist** (`families.ts` 221–238 tests the leader; `promote.ts` 213–215 picks the best member).
   - This is §11 as written, but `selection.json`'s `refinements[].slot` and the report drafts (`FAMILY_SELECTION.md` 69–111) label finalists by slot.
   - In 8 of the 31 promoted families the representative or the finalist lacks its slot's property:
     - **broad, in all four arms:** finalists of 5 books, or none for T-s.
     - **compact, in J-s and T-s:** J-s-f4 has 4 books and T-s-f4 has 5.
     - **incumbent-free, in T-u:** T-u-f7 contains KRE and has T-u-f1's exact membership.
     - **far, in J-s:** J-s-f8 is at Jaccard 0.67 from J-s-f6.
   - The only finalist with ≥ 7 books is J-s-f8, from the far slot.
   - Fix: reports should say "slot of the leader".

5. **The selection writes no door record of its own** (`round.ts` 683–715; the fold `PICKS` did not either).
   - The selection's reload is guarded only by code (`data.ts` 76–94: last-date assertion and audited file hashes).
   - The round's door record exists only in `search.json`.
   - `round.ts` cannot change now, so disclose this in the report.

### Observations

**Q4: diversification.** The unseeded arms kept their own promoted families and assessments: J-u promoted, refined and assessed 8 of 8; T-u 7, because its far slot failed F-P three times. No unseeded finalist shares a membership with any seeded one; the minimum Jaccard distance is 0.50. Archive-level diversity is large, but the shortlists converge:

| Arm | Distinct leader memberships | Top-50 leaders (distinct / clusters at J<0.5) | Finalists | Passing | Distinct memberships | Membership clusters | §10-close clusters | Identical-membership pairs |
|---|---:|---|---:|---:|---:|---:|---:|---|
| J-u | 3,114 | 14 / 1 | 8 | 0 | 5 | 4 | 6 | 6 (f2, f3, f5, f6 all EWW FXI GDX SMH XME) |
| T-u | 2,900 | 16 / 3 | 7 | 0 | 5 | 3 | 5 | 2 (f1 = f7; f2 = f3) |
| J-s | 2,605 | 16 / 1 | 8 | 5 | 4 | 3 | 5 | 10 (f1–f5 all GDX KRE XBI XRT) |
| T-s | 2,555 | 24 / 2 | 7 | 1 | 5 | 3 | 6 | 3 (f1, f4, f5 = B5's membership) |

- **Near-duplicate finalists:** several same-membership finalists are close even by the §10 rule. For example, J-u-f3 and f6 have funded overlap 0.82 and regime ρ 0.97; T-u-f2 and f3 have 0.73 and 0.99. Only exact keys count as "converged".
- **J-u:** one EWW/FXI/GDX/XME core holds 5 of 8 finalists. FXI and GDX each appear in 7.
- **The seeded arms collapsed onto B5's neighbourhood.** Six of J-s's 8 finalists are B5's membership or B5 minus VGT. Four of T-s's 7 are B5's membership or a subset of it.

**Rankings** (`value` = the procedure's confirm-A score):

| Procedure | Ranking (label, rounded score, failed gates or "pass") |
|---|---|
| J | J-u-f1 323,868 G7 · J-u-f5 310,706 G7 · J-u-f2 302,145 G7 · J-u-f3 298,725 G7 · J-u-f6 295,950 G7 · **J-s-f2 294,384 pass** · J-s-f3 292,760 pass · J-s-f1 292,452 pass · J-s-f5 282,082 pass · J-s-f6 281,145 G7 · J-s-f4 271,463 pass · J-s-f8 268,019 G7 · J-u-f4 237,855 G7 · J-u-f8 213,827 G6/G7 · J-u-f7 185,296 G6/G7 · J-s-f7 162,643 G4/G6/G7 |
| T | T-s-f2 241,270 G7 · T-s-f1 223,239 G7 · T-s-f3 217,658 G7 · **T-s-f5 216,543 pass** · T-u-f1 216,487 G7 · T-s-f4 213,308 G7 · T-u-f7 208,143 G7 · T-u-f6 206,525 G7 · T-u-f5 205,074 G7 · T-u-f3 204,943 G7 · T-u-f2 202,078 G7 · T-s-f8 171,881 G6/G7/G8 · T-u-f4 163,342 G6/G7 · T-s-f7 121,148 G6/G7 |

- **No unseeded finalist passes, in either procedure.** All 15 fail G7, the borrowing-matched portfolio check, and 3 of them also fail G6. So even if GP had passed there would have been no primary, only seeded alternates.
- **G3 passes for all 30 finalists**, so pruning removed the refinement/gate contradiction. The smallest procedure marginal is +$5,774 (J-s-f7, IWN).
- **Prune removals:**
  - KIE from J-u-f3 (−$386, lower bound −$3,813);
  - KIE from J-u-f6 (+$300, −$3,790);
  - SMH from J-u-f7 (+$418, −$2,481);
  - ILF from T-u-f6 (−$5,164, −$10,463);
  - SMH from J-s-f6 (+$3,324, −$2,851);
  - TIP from T-s-f7 (−$5,000, an inert member).
- **Runner-up interval for J:** it compares J-s-f2 with J-s-f3, two finalists with identical membership. The gap is +$1,624, with 90% interval [−$7,168, +$10,100]: within perturbation uncertainty. T has no runner-up, because only one finalist passes. This repeats pre-final minor 5.

**Near-reference labels.** None of the 30 finalists is labelled, and my recomputation agrees. Some come close:
- J-s-f1–f5 have R1's exact membership (XBI XRT KRE GDX), but each has 4 or more coordinates beyond 2 step units (XBI up to 10 units). The J hypothetical alternate, J-s-f2, is one of them.
- J-s-f1 misses "near the October 25 finalist" by a single GDX coordinate at 3.0 units.
- T-s-f1, f4 and f5 (f5 is the T hypothetical alternate) have B5's exact membership. They are not labelled neighbours of B5 because XRT differs by 37–42 units on one coordinate.

**Centre-feasible finalists on a drawdown cliff.** G2 judges only the centre:
- T-s-f5: share of neighbours within F1 0.496, DDmed $35,042.
- J-s-f2: 0.668, DD90 $42,545.
- J-u-f4: 0.234, DDmed $45,170.
- T-u-f5: 0.219.
- J-s-f3: centre DD $34,478.

**Zero-lot or thin members can still win on smoothing.** This repeats pre-final observation 8:
- T-u-f5's DBC has 0 funded lots, yet its T-marginal is +$66,964.
- J-u-f4's XHB has 1 lot and −$1,913 at the centre, yet its J-marginal is +$64,615.

**Final calibration.** It sits at the floors ($35,000 / $45,000) in every stratum.

**The `evidence` string** (`final.ts` 278–279), "nothing after 2023 has been read for any configuration of this study", holds for candidate configurations. Reports should still cite the disclosed reads:
- the benchmark door read before the freeze;
- the integrity audit's whole-file reads;
- the loader parsing every row of each file for order and dropping rows past the bound (`src/lib/evaluation.ts` 234–245), and hashing the whole file (281);
- `freeze-selection` itself hashing all 61 full files.

**`selection.json`'s `wouldNominate` lists** are sealed without a "hypothetical" marker. The FROZEN_SELECTION note covers them; the reports must say so too.

### Verdict

**Yes: it is safe to run `freeze-selection`, `confirm-b` and `evaluate` as they are.** I found no material defect. They will write a correct no-advancement record. Minor findings 1–3 are optional `final.ts` amendments, and 4–5 are report wording.