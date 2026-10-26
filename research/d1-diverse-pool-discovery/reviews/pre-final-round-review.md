<!-- Verbatim handback of the independent pre-final-round review agent (general-purpose subagent, finished 2026-10-26T06:40:14Z, after PROCEDURE_GATE and before the final search). Extracted unchanged from the session transcript on 2026-10-26. Minor 1-4 -> amendment 1 (amendments/amend1_final.py); 5-7 -> report wording; 8-12 -> disclosures. -->

## Independent pre-final-round review: diverse-d1

I changed no repository file and no git state (`git status` was identical before and after). I ran only `tsc` (exit 0), `eslint src/d1-diverse` (exit 0), and the design and leakage tests (25 of 25 pass). Everything else was read-only Python over the records; the scripts are in the scratchpad.

Every sealed record I checked still verifies against its body hash: PROCEDURE_GATE, both PICKS, both validations, both fold search manifests, the three calibrations and protocol_freeze. The current code manifest equals the frozen one (`fd549635…`, 405 files, no differences), as do the protocol and context hashes. There is no amendments file.

### 1. Procedure gate recomputation: no disagreement
I recomputed every clause from the two validation.json and PICKS.json files and matched PROCEDURE_GATE.json exactly.
- **Eligible controls:** I re-derived eligibility from controls.jsonl (DD@5 ≤ $35k and ≥ 4 lots). That gives 63 in fold-a and 67 in fold-b, the same sets as the `eligibleControl` flags.
- **Quantiles and percentiles:** type-7 ctl_0.25, ctl_0.50 and ctl_0.75 match to the bit. Percentiles are the share of controls strictly below. The 20-control floor is met in both folds.

| | fold-a | fold-b | GP |
|---|---|---|---|
| J | V $13,759 (pct 0.698), above median, not ≥ q75, DD $14,293 | V $5,462 (pct 0.836), ≥ q75 and > 0, DD **$48,269 > $45,000** | **fail, clause (iii) only** |
| T | V −$12,043 (pct 0.095), not above median | V −$7,089 (pct 0.463), not above median | **fail, clause (i) in both folds** |

So no procedure may nominate (`nominatingProcedure: null`). The statement "the folds do not distinguish T from J" is correct under the predeclared rule. The validation drawdown resets its peak at the search-end close mark, with minutes from the next session onward, as §14.3 says.

### 2. Fold records: nothing suggests a bug
- **No duplicate assessed finalists:** within every arm the finalist keys are distinct (fold-a 6/6/4, fold-b 6/6/4).
- **Gates:** G1, G2, G3, G4, G5 and G8 recomputed from the stored fields for all 32 finalists, and the J/T/Q values, agree everywhere.
- **Labels:** thin evidence, capacity-limited, capacity-unverified, box-constrained and portfolio DD in (30%, 35%] are all consistent with their rules. Member grades and lot counts agree with the centre's per-symbol figures.
- **Pruning:** every prune step removed the lowest-marginal member among those with a 90% lower bound ≤ 0 that could be removed without breaking F1; every final step has all lower bounds > 0. There were no blocked or emptied prunes and no F-P walk-backs.
- **Refinement:** all 47 accepted moves gained more than $5,000, the move chains are consistent, and there were no membership moves in the re-refinement pass.
- **Promotion:** each slot took the first unconsumed qualifying family. The representative was the best feasible of its top members. Fold-b T Q3 correctly went to a second attempt after family 4 failed F-P.
- **Coverage:** recomputed from the six archive.jsonl files (log hashes verify). Configurations, vectors, bands and co-members per symbol match search.json exactly. Counts are 6,632 + 61×200 + 8×1,000 = 26,832 for J/T and 12,692 for Q. Minimum per symbol is 733 (J/T) and 534 (Q); A5 = 20 and A6 = 8 exactly, as by construction.

### 3–4. Findings

**No material findings.**

**Minor**

1. **The freeze "recomputes" the score by reading it back** (`final.ts:115-125`). `procedureValue` re-reads `confirmA.j.s`/`t.s`, so the comparison with the stored value is nearly tautological, and gate equality only proves `gatesOf` is deterministic on the stored fields.
   - My analysis of the round trip: none of `gatesOf`'s inputs is ever non-finite. Across all fold assessments the only null fields are `retention`, `nbT.top2ShareMedian` and members' `capacity.*`, and none of these feed the gates.
   - Doubles survive JSON exactly. A NaN value would read back as null on both sides and compare equal.
   - The one theoretical trap is a NaN `ladder.matchedEndEquity` (null makes `endEquity >= null` true). It would need a degenerate B5 ladder; the fold ladders are strictly increasing.
   - So the recheck will reproduce the stored values and the nominations exactly. It cannot crash on a no-advancement record.
   - Fix (in `final.ts`, amendable): recompute S_J and S_T from the stored 256 confirm-A draws with `scoreDrawsOf`/`scoreOfDraws` and the sealed calibration, which should match exactly.
   - Affects record strength only, not correctness.

2. **FROZEN_SELECTION is thinner than §16.1** (`final.ts:166-215`). It omits rankings, every finalist's gates and values, seeds, budgets, evaluation counts, parity signatures and nominee tie order (most are bound only through hashes). `records` also omits `select/benchmarks.json`, which holds the B4/B5 numbers G6 uses, and the `refine-f*.json` files.
   - Fix: add these in `final.ts` (amendable). Reporting completeness only.

3. **confirm-b does not verify its inputs** (`final.ts:243-260`). It reads `assessment.json` without checking it against the hashes FROZEN_SELECTION just recorded; the October 25 study's confirm-b did check. Benchmarks also get no confirm-A versus confirm-B difference, although `select/benchmarks.json` holds their confirm-A.
   - Fix: add both in `final.ts` (amendable). Reporting only.

4. **Hypothetical nominations could be misread.** `selection.json` stores `wouldNominate` for both J and T, and FROZEN_SELECTION stores `recomputedNominations` (`final.ts:201`). With GP failed, a reader could take these for nominations.
   - Fix: add an explicit "hypothetical — GP failed; not nominations" field in `final.ts`, and say so in the reports.

5. **The final runner-up interval may not involve the primary** (`round.ts:575-581, 674`). It compares the top two passing rows of the combined unseeded + seeded order. When the top passing row is seeded or near a reference, the interval is not the primary against its runner-up as §6.3 intends.
   - `round.ts` can no longer be amended, but this affects exploratory reporting only (nothing can be nominated). Compute the correct pair in `report.ts`.

6. **No "seeded provenance" label** (`assess.ts:471-520`). §13 lists one, but the code records seeded origin only through `arm` and the `pick` note. Exploratory reporting only; state it in the report.

7. **A quality slot with no families left does not end the shortlist** (`promote.ts:238-252`), contrary to §11. The only effect is extra "unfillable" slot records; the promoted families are identical. Exploratory only.

**Observations (methodological, protocol-compliant)**

8. **A zero-lot member can win on smoothing alone.** The fold-b T primary IGV+VOOG has VOOG with 0 centre lots (its one virtual trade was refused by IGV). The pool's centre net ($42,396) equals IGV alone, yet VOOG's T-marginal is +$84k, coming entirely from perturbed draws where its single long-held lot gets funded.
   - T's block trim does not penalise one long-held lot, because its marks accrue across blocks. The VOOG-alone finalist (1 lot) shows the same effect.
   - Fold-b J-u-f5 also has a zero-lot member (XHB).
   - Report this centre-versus-smoothed mechanism divergence; "thin evidence" is the only flag it gets.

9. **Distinct families collapse to near-duplicate finalists.** Fold-a J-u f1/f2/f3/f6 are all GDX/IBB/SMH/XHB variants; fold-b J-u f2/f3/f6 are all GDX+SMH; fold-b Q f1/f2 are both DBC+GDX+XHB. The "converged" rule catches only exact keys. Report effective membership diversity.

10. **Pruning can push a pool below G3's activity floor.** Fold-b T-u-f2 pruned IGV and ended as VOOG alone with 1 lot. §12.2 guards only F1.

11. **One R1/R4 vector is in the seeded library.** R1 and R4 share KRE vector `d1-a389037400` with B5's KRE, and that vector is in the seeded library. §8's "R1/R4 vectors are never in any library" holds only for their other vectors. The near-reference bar covers nomination.

12. **G3's "member grades" are labels, not a pass condition.** This matches the October 25 G3 wording.

### Final-round code paths (static review; none has run on real data)
- **Seeded search** (`search.ts:399-415`, `455-475`): benchmarks follow the archive's best entries and displace the last random genomes in stage B. Island 8 gets B1, B4, B5, 29 add/swap/reset mutants and random fill, and the other seven islands take the elites.
  - A benchmark proposed by several islands in one batch is a hit after its first appearance (`archive.ts:161-228`).
  - All 32 control and benchmark grids lie inside the D1 box, so `mutateVector` and SBX cannot throw.
  - This path is untested even synthetically. Adding a synthetic seeded `runArmSearch` test is optional and low-cost; tests sit outside the code manifest, so it needs no amendment.
- **Control vectors stay in seeded arms only:** both search (`round.ts:175`) and refinement (`round.ts:496`) use `armLibrary(start)`, and only Sobol traces are pinned.
- **Already exercised on real data in both folds:** `armLibrary('seeded')` and the R1/R4/October 25 reference loading, through `assessConfig`'s labelling.
- **Final gates and nomination logic:** G6 and G7 (`gates.ts:94-120`) follow §15.2: paired confirm-A bootstrap, lower bound > 0, ΔS ≥ 0, M = $50k above 30% DD, symmetric ladder, extrapolation labelled. `pick(…, 'final')` excludes near-reference rows, takes the primary only from the unseeded, primary-eligible arm, and adds the "no primary-eligible finalist" and seeded notes.
- **Selection plumbing:** `runSelect('final')` seals `rounds/final/selection.json` and writes under `rounds/final/select/`, which does not exist yet.
- **Freeze, confirm-b, evaluate:**
  - freeze-selection records "no advancement — neither procedure passed…" with `nominees: []`.
  - The evaluation door refuses to open without a nominee.
  - `runEvaluate` with no nominee needs confirmB.json first and then writes only the no-advancement record.
- **Memory:**
  - The shared store keeps about 168k records across the four arms by design; the projection was 5.9 GB, and the folds peaked at 4.0 GB RSS with 50k records.
  - Arm archives and islands become unreachable after each arm, in both search and select. Worker threads count toward the 14 GB guard, and the heap limit is 12 GB.
  - The freeze hashes 61 data files concurrently with whole-file reads (`final.ts:190-194`), about 3.6 GB transient. That is acceptable on 16 GB; serialising the reads would be safer.

### Verdict
**Yes, it is safe to run the final round as is** (`search --window final`, then `select --window final`). I found no material defect. Nothing can be nominated, and every record the final round writes is correct for exploratory reporting.

Before `freeze-selection` and `confirm-b`, I'd make findings 1–4 as one `final.ts` amendment, which the protocol still allows. Findings 5 and 6 belong in report wording only.
