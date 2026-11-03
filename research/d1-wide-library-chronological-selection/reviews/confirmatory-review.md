<!-- Verbatim final report of the independent, read-only confirmatory reviewer of protocol v2 (a subagent of this
session), as received at 2026-10-27T23:40Z with only the delivery channel's two-space indentation removed. The reviewer
created, modified and deleted no file and ran no npm, study or state-changing git command. Dispositions:
CONFIRMATORY_DISPOSITIONS.md. -->

# Confirmatory review of protocol v2: `d1-wide-library-chronological-selection-v1`

**Reviewer:** independent and read-only. I created, modified or deleted no file. I ran no `npm` command, no study command, no state-changing git command and made no network access.
**Time:** 2026-10-27T23:38Z (UTC). **HEAD:** `6489a63d`. Nothing is frozen yet: `PROTOCOL_FREEZE.json` and `results/CODE_FREEZE.json` are both absent.

**Snapshot reviewed** (sha256 prefixes at 23:35:55Z; no file changed between then and 23:38Z):

| File | sha256 prefix |
|---|---|
| PROTOCOL.md | `7fa481a34a2f` |
| LIBRARY_SELECTION_RULES.md | `ed488e133b34` |
| EXPERIMENT_MATRIX.json | `41c2428b4002` |
| METHODOLOGY_DISPOSITIONS.md | `e87b26723ef7` |
| methodology-review.md | `7939ca0bfa0d` |
| BRIEF.md | `f6743100d096` |
| analysis.ts | `65ed9ede5403` |
| doors.ts | `e08ca6e47272` |
| freeze.ts | `37ad63876f8e` |
| evaluation.ts | `5e169a1f59de` |
| nested.ts | `6a93d6e50e90` |
| library.ts | `51194a2b2c84` |
| search.ts | `376728246e86` |
| selection.ts | `a6a0428d77d9` |
| census.ts | `c59baced51fa` |
| archive.ts | `8116d38662b4` |
| sample.ts | `530ce61aa150` |
| cli.ts | `f9571f3c0c42` |
| context.ts | `fbac57c0f758` |
| views.ts | `532806fc7c54` |
| tables.ts | `5df5482432a7` |
| matrix.ts | `c14f2aa3e52d` |
| tests/leakage.test.ts | `5078c6c3721d` |
| tests/rules.test.ts | `3c959844fa57` |

The author edited files while I was reviewing:
- `doors.ts` and `freeze.ts` changed at 23:25:54Z.
- `analysis.ts` changed at 23:34:13Z.

I re-read the changed parts of all three. The line numbers below refer to the hashes above.

## Verdict

**Not ready to freeze as is, but close. No redesign is needed.**

**The original findings are fixed in substance.**
- The calendar door is correct and is applied to every bar load. I simulated §8.2 against it, against each phase's `requires` and against the nested inputs: there is no deadlock, and no stage can read a window before the earlier selections are sealed.
- Every post-freeze data stage calls `requireCodeFrozen()`.
- The decision rules in `analysis.ts` match §9.2–§9.4, apart from wording ambiguities that the code resolves strictly.
- I found no leakage path for evaluation outcomes.

**What blocks the freeze is mainly one new problem.** A "training-only dry run" mode was added in this revision. It bypasses both freezes, the protocol does not mention it, and it has already been run on real data. Between 23:28Z and 23:34Z it produced:
- the S18 NEW search, sealed `32913b3a0fed`;
- the S18 parity sample, sealed `925d7a401104`;
- the S18 libraries and nominees, sealed `ddb1d88674d5`.

As a result, §0's statement that no new-search result exists is now false, and §11's statement that every stage verifies both freezes has an undisclosed exception.

**Path to the freeze.**
- Fix N1 (disclosure).
- Fix the text mismatches that the freeze would lock in: N4–N7 and N10.
- Preferably also fix the small code items N2, N3, N8, N9, N11 and N12 now. After the code freeze each of them needs an amendment.

After that the study can be frozen without another full review.

## Execution-order simulation (check 1)

The calendar rule: a load ending at E requires every fold SELECTION with cutoff < E, and every nested SELECTION with selection end < E, to be sealed. Seals needed per step:

| Step | Load end | Seals required by the calendar door | Other prerequisites |
|---|---|---|---|
| S18 search / sample parity / libraries | 2018-12-31 | none | sample needs SEARCH; libraries need SEARCH and SAMPLE_PARITY |
| S19 search / sample / libraries | 2019-12-31 | S18 | as above |
| Fold-a census v2, fold A search / sample / libraries | 2020-06-30 | S18, S19 | fold A libraries also need the fold-a RECONSTRUCTION and census |
| S20 search / sample / libraries | 2020-12-31 | S18, S19, A | as above |
| Phase A | 2021-12-31 | S18, S19, A, S20 | the door also checks A's own SELECTION; T1 is not required (2021-12-31 is not < E) |
| T1 nested selection | no load | — | reads the sealed phase A only |
| Fold-b reconstruction / census, fold B search / sample / libraries | 2021-12-31 | S18, S19, A, S20 | T1 not required |
| B-sel | 2022-12-30 | S18, S19, A, S20, B, T1 | `requires` = B and T1 |
| T2 nested selection | no load | — | reads the sealed B-sel |
| S22 search / sample / libraries | 2022-12-30 | S18, S19, A, S20, B, T1 | T2 not required |
| Phase B | 2023-12-29 | all six SELECTIONs, T1, T2 | `requires` = B, T2, B-sel, S22; archive rows capped at fold-b's door |
| Phase T1-later | 2023-12-29 | all six SELECTIONs, T1, T2 | `requires` = T1, T2, A, S22; the door admits only NEW and NEW-S, and `sourceCap` rejects fold-a rows |
| Phase S18 | 2019-12-31 | S18 | `requires` = B and T1-later |
| Phases S19, S20, S22 | their window ends | as their window ends require | `requires` = B and T1-later |
| Final reconstruction and census | 2023-12-29 | everything | — |

**Conclusions from the simulation.**
- The dependency graph is acyclic.
- The sample-parity and libraries stages load through `trainingUniverse`, so the door governs them.
- **That fold B training does not require T1, and S22 does not require T2, is correct, not a defect.** A load ending exactly at a triple's selection end reads no bar after it. T1 and T2 are deterministic functions of the sealed phase A and B-sel rows. S22's training data equals T2's selection window, which T2 is entitled to use anyway, and frozen code means nothing can be adapted to it. The §8.2 orderings "T1 before fold B" and "T2 before S22" are therefore advisory (see N13).

## Findings

**N1. MATERIAL (new) — The dry-run mode bypasses both freezes, is undisclosed, and has been run on real data.**
- **Where in the code:**
  - `freeze.ts` L135–138: `refuseOverrides` returns early.
  - `freeze.ts` L183–185 and L250–252: the guards return `'DRY-RUN'`.
  - `freeze.ts` L278–282: the comment cites "PROTOCOL.md §11", which says nothing about a dry run.
  - `doors.ts` L224–226: loads are capped at 2018-12-31.
  - `doors.ts` L157, L173 and L341: the seal and freeze checks are skipped under `testRoot`.
  - `context.ts` L10–12: the comment still says every stage refuses the overrides.
- **What ran:** logged in `results/logs/dryrun-S18-{search,sample,libraries}.log`, at 23:28–23:33Z.
  - search: 67,008 evaluations;
  - sample parity: 1,100 checks;
  - libraries: 71,200 draws;
  - `dryrun-S19-refused.log` shows that the cap held.
- **Why it matters:**
  - Nothing after 2018-12-31 was read, so no evaluation outcome is exposed. But §0 L25–27 ("no new-search result") is false, and §11 L395–397 overstates the guards.
  - Brief §6 allows exploratory training-only construction only if it is clearly labelled.
  - `analysis.ts`, which is outcome-defining code, changed at 23:34Z, after the S18 nominees existed.
  - Neither `RESEARCH_RECOVERY.md` (written 23:25Z) nor the dispositions mention the dry run.
- **Fix:**
  - **(a)** Disclose it in §0 and in the checkpoint. Give the commands and times, the scope (S18 only, through 2018-12-31), the scratch location, the three body hashes, what was seen (S18 candidates, libraries and nominees), and every code change made after 23:28Z.
  - **(b)** Either delete the dry-run path before the code freeze, or state it in §11 as the only exception.
  - **(c)** Keep the dry-run records' digests in the task directory. After the real S18 search and libraries, report whether the candidates' sha256, `nomineeDigest` and `librariesDigest` are identical to the dry run's.

**N2. MINOR (new) — Stages do not check the provenance of the records they consume.**
- **Where:**
  - `selection.ts` L117–148 checks only door digests on RECONSTRUCTION, CENSUS, SAMPLE_PARITY and SEARCH.
  - `sample.ts` L54–56, `nested.ts` L35, `evaluation.ts` L390–394 (`isSealedFile` only) and `analysis.ts` L429–447 do not check guards at all.
  - `verify` (`views.ts` L426–429) checks stamps only when `startedAt > frozenAt`.
- **Consequence:** a DRY-RUN S18 SEARCH copied into `results/search/S18/` has the same door digest and an earlier `startedAt`. It would be consumed without complaint and never flagged.
- **Fix:**
  - Allow only an explicit pre-freeze list to lack a stamp: INVENTORY, the fold-a RECONSTRUCTION, CENSUS-prefreeze-v1, ANCHORS*, and the collisions record.
  - Every other record must carry `guard.protocolBody` and `guard.codeBody` equal to the freezes, and a `startedAt` after the code freeze.
  - Consumers assert this on their inputs.

**N3. MINOR — Finding 18 is only partly fixed.**
- **Where:**
  - `verify` (`views.ts` L428) compares each stamp with the *code freeze's* outcome digest.
  - After a technical amendment, `requireCodeFrozen` (`freeze.ts` L262–274) stamps the *amended* digest.
- **Consequences:**
  - Records made after an amendment fail `verify`.
  - Records made before it still pass, even though the code changed, and `supersedes` is never consulted.
  - The `amend` command in `cli.ts` (L206–223) cannot pass `supersedes`, which defaults to `[]` (`freeze.ts` L316).
  - `amend()` does not refuse an outcome-code change once a SELECTION or evaluation exists.
- **Fix:**
  - A stamp must equal the digest in force at its `startedAt`.
  - A record made under a digest that was later replaced must appear in that amendment's `supersedes`, otherwise `verify` fails.
  - Add `--supersedes` to the CLI.
  - Refuse an outcome-code amendment after any SELECTION unless `supersedes` is non-empty.

**N4. MINOR — T2's pools disagree between the protocol and the code (finding 16(d) is not fully fixed).**
- **Where:**
  - PROTOCOL §3.3 L117 lists five T2 pools, including ARCH-S.
  - §10 L375 says "T2 5 pools × 4 K × 2 (40)".
  - The code uses four: `context.ts` L189, the MATRIX (L198–203 for the pools, L303 for the count, 32) and `analysis.ts` L72.
- **Fix:** remove ARCH-S from T2 in §3.3 and change §10 to 4 pools and 32 comparisons. Alternatively, add ARCH-S to T2 in the code as a descriptive pool.

**N5. MINOR — The RULES wording of penalty displacement contradicts the protocol and the code.**
- **Where:** `LIBRARY_SELECTION_RULES.md` L71–72 says "the first 4 [J′-ordered families] that are not among the first 4 of A1's order". That can reach J′ ranks 5–8.
- **What the others say:** PROTOCOL §4.4 L160–162 and `library.ts` L248–252 take the top 4 by J′ and keep those not in A1's top 4.
- **Fix:** reword RULES to "of the first 4 families by J′, those not among A1's first 4".

**N6. MINOR — The K = 32 / 64 condition is ambiguous.**
- **Where:**
  - The text: §9.3 L332–333, L341 and L345, and MATRIX L339–345.
  - The code: `analysis.ts` L288–289, L887 and L913–914.
- **Problem:** the code requires the *same* K ∈ {32, 64} to be favourable in both folds. The text also admits "fold A at 32, fold B at 64". The tests do not cover the mixed case.
- **Fix:** write "at K = 32 in both folds or at K = 64 in both folds", and add a test.

**N7. MINOR — Verdict precedence and the nested sub-verdicts are defined only in code.**
- **Precedence:**
  - §9.3 lists its rules without saying which applies first.
  - `verdictOf` (`analysis.ts` L293–309) applies improves → worse → insufficient → no evidence → mixed. So a risk-incompatible K = 16 cell beside an insufficient K = 16 cell gives "worse".
- **Nested sub-verdicts:**
  - §9.3 L346–347 says only "otherwise insufficient, no evidence or mixed".
  - The code (`analysis.ts` L916–925) defines insufficient as either K = 16 comparison being non-evaluable, and no evidence as neither K = 16 comparison being favourable.
- **Nested across-ETF:** the result is reported as two strings (L944–951) with no combined rule.
- **Fix:** state that the first matching rule in the listed order applies. Copy the nested definitions and a combined nested across-ETF rule into §9.3 and the matrix.

**N8. MINOR — The event-count floor is never applied to T2-later.**
- **Where:** `analysis.ts` L481–485 sets `windowFamilies = Infinity` whenever the phase's capture start differs from the cell's start.
- **Effect:** phase B's catalogue (`evaluation.ts` L754) starts at 2021-12-31, but T2-later starts at 2022-12-30. The §9.2 floor (L320–321) is therefore never applied to T2.
- **Fix:** store a catalogue for every window start of a phase, and use the matching one.

**N9. MINOR — The A0 across-ETF score is taken from A0r.**
- **Where:** `analysis.ts` L104 uses A0r's J_nb as A0's score. That is NaN where A0r declines, and another vector's score where the two differ.
- **Effect:** the ARCH across-ETF baseline is mis-ordered exactly where A0 ≠ A0r. Fold B's reproduction has not been checked yet.
- **Related:** L633 uses `s.a0r.library` for A0's library diagnostics.
- **Fix:** store the sealed representative's J_nb in `s.a0` (`selection.ts` L284–293) and use it; use `s.a0.library` at L633.

**N10. MINOR — The freeze does not bind what §11 says it binds.**
- **Where:** `freeze.ts` L56–73 binds neither `reviews/superseded/*` (which PROTOCOL §11 L391–393 says is bound) nor `reviews/confirmatory-review.md` (which the dispositions say precedes the freeze).
- **Fix:** add both. Also add the fold-a `candidates.jsonl.gz` explicitly.

**N11. MINOR — Reports do not re-check chronology.**
- **Brief §10 requires** that the program "refuse a report that cannot establish …" the candidate was selected before the later bars were read.
- **Gap:**
  - `runAnalysis`, `writeTables` and `verify` never assert that each EVALUATION's recorded `selection.bodyHash` and `door.seals` equal the current sealed SELECTION and nested files.
  - They never assert that `startedAt` is later than those records' `finishedAt`.
  - `writeTables` (`tables.ts` L80) has no freeze check at all.
- **Fix:** add these assertions, and a `requireFrozen` call in `writeTables`.

**N12. MINOR — Test gaps.**
- `leakage.test.ts` L253–264 matches errors with `/./`, so any refusal passes the test, including an unrelated calendar refusal.
- No test covers:
  - the calendar door's nested seals (B-sel needs T1; a 2023 load needs T2 and S22);
  - the phase `requires` lists;
  - the mixed-K case;
  - the worse-over-insufficient precedence;
  - the nested verdict (the function is not exported);
  - the clause "worse on NEW or ALL blocks outcome 1";
  - the dry-run cap.
- The post-cutoff mutation test does not run `runSearch`, so candidate ids and rankings are not covered (brief §10).
- **Fix:** tighten the regular expressions and add these tests before the code freeze.

**N13. NOTE — Some §8.2 orderings are advisory.** The door does not order T1 before fold B, T2 before S22, or the final census after phase B. All three are harmless (see the simulation above). Say so in §8.2.

**N14. NOTE — Residual items from finding 9 and stale comments.**
- `verifiedSelection` (`doors.ts` L153–159) checks the fold, the last date and the protocol body, but not the door digest or the outcome digest. "Built on its own training door" therefore means only the last date.
- `DoorCandidate` (`doors.ts` L314–319) carries no source window. An archived row is capped by its fold's own window by assumption; this holds because `phaseVectors` reads only the fold's own archive.
- SAMPLE_PARITY records do not stamp the door or the seals it verified (`sample.ts` L54 and L120–131).
- Stale comments: `search.ts` L5–6 and L12 still say every archived vector is dropped; `doors.ts` header L10–12.
- `search.ts` L43 reads the later windows' archive nets into memory, although it uses only the grid and stage. These are published records, so there is no leak.

**N15. NOTE — ARCH-S vs NEW-S is not computed.** §9.5 lists it, but `analysis.ts` has no paired comparison between them. Add it, or state that it is read from the per-pool metrics.

**N16. NOTE — B-sel's 10 bps figures are unchecked.**
- B-sel runs with `engine: false` (`evaluation.ts` L91).
- Its 10 bps fast figures feed S21's mean ΔV(10).
- They are neither engine-checked nor cross-checked, because the cross-phase parity at L491–519 runs at 5 bps only.
- **Fix:** add the 10 bps cross-phase check for nominees.

## Checks 2–5 in brief

**2. Guards.**
- Without dry-run mode, no data stage can run without `requireCodeFrozen()`: reconstruct, census, search, sample, libraries, evaluation, nested and analysis all call it.
- Stage stamps equal the code freeze's outcome digest when there is no amendment. With an amendment they diverge (N3).
- In dry-run mode, every stage runs unfrozen, but no load can end after 2018-12-31 (N1).
- `writeTables` is unguarded (N11).

**3. Decision rules.**
- `compare` (L169–270) matches §9.2 exactly: the five insufficiency floors, the favourable and unfavourable conditions, risk-incompatible, I including both-none ETFs, and B counted from the fast-path windowed minute DD at 5 bps.
- `verdictOf` implements K = 8 ∧ K = 16 ∧ (32 ∨ 64), the insufficient verdict on K = 16, and "no evidence".
- `studyOutcome` (L313–346) implements §9.4, including "worse on neither NEW nor ALL", ≥ 3 rolling years, and restriction to the verdict pools and broad arms only.
- The nested primary cell is T1/NEW, against both A2(K) and A0r, with T1/NEW-S not worse.
- The only mismatches are the ambiguities in N6–N8.

**4. Leakage and provenance.**
- ARCH, ARCH-S and ALL never enter T1. They are excluded in context, nested, phase and analysis, and the door enforces it.
- Archived rows are capped by `sourceCap` in two places: `phaseVectors` and the door.
- The collision guard is limited to data-free grids and grids from windows ending on or before the fold's cutoff. Later-window local grids are kept and flagged.
- Figures are never attributed across provenances.
- The only open provenance gap is N2.

**5. Contradictions with the brief.**
- N1 (the dry run is unlabelled; brief §6).
- N11 (reports do not refuse unestablished chronology; brief §10).
- N12 (the mutation test does not cover candidate ids; brief §10).
- Otherwise v2 is faithful to the brief: the folds and triples with their exact windows, T2 never counted as a replication, the four outcomes, K never chosen after a result, and the sparse-fold handling.

## Original finding → fixed?

| Finding | Fixed? |
|---|---|
| 1 MATERIAL: chronology across folds / calendar door | yes |
| 2 MATERIAL: guards and stamps | yes in substance; the dry-run bypass (N1) and input provenance (N2) remain |
| 3 MATERIAL: §0 knowability | partly: (i)–(iii) are disclosed, but §0 is inaccurate again because of the dry run (N1) |
| 4 MATERIAL: insufficiency floors | yes (T2-later floor skipped, N8) |
| 5 MATERIAL: nested primary cell | yes (sub-verdicts and the nested across-ETF rule are only in code, N7) |
| 6 MATERIAL: A1n ablation | yes |
| 7 MINOR: provenance semantics | yes |
| 8 MINOR: collision guard | yes (stale comments, N14) |
| 9 MINOR: fail-closed doors | mostly (door digest not verified, N14) |
| 15 MINOR: conventions and nested boundary parity | yes |
| 16(b) MINOR: write-once INVENTORY and MATRIX | yes |
| 16(e) MINOR: sealed A0 governs the ARCH baseline | yes (the A0 across-ETF score is still wrong, N9) |
| 18 MINOR: amendments vs sealed records | partly (N3) |
