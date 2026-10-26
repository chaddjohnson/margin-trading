<!-- Verbatim handback of the independent design/code review agent (general-purpose subagent, finished 2026-10-26T03:31:55Z, before the design commitment). Extracted unchanged from the session transcript on 2026-10-26; dispositions are in DESIGN_DECISIONS_AND_PRIOR_EVIDENCE.md D-13. -->

## Independent review: diverse-d1 design and implementation (pre-freeze)

**Scope and checks run.** I read the brief §0–§13, PROTOCOL.md, DESIGN_DECISIONS, DESIGN_DIFF, every file in `src/d1-diverse/` (including the tests) and the imported d1-robust modules the new code depends on (evaluate, evaluator, pool, neighbourhood, stats, genome, freeze, walkforward, assess.nearBenchmark, promote.portfolioSpec). I modified no files and ran no study command.
- `npx tsc --noEmit` is clean.
- `npx eslint src/d1-diverse` reports nothing.
- `design.test.ts` and `leakage.test.ts` pass 23/23.

**Timing note.** `results/audit/universe.json` (04:12) and `results/reproduce/reproduce.json` (04:18) already exist, and `results/logs/parity.log` shows parity running. M1 has started before this review finished, which matters for finding 2.

### Verified correct (no action needed)
- **Stage-A schedule:** deterministic and unique by construction. Each symbol gets 399–413 appearances with distinct vectors and ≥ `passes` per band. The real 61 equals the fixture list `real61`.
- **Anchored islands:** each island spends exactly b_B fresh configurations, with no overspend. A fresh flag in `propose` always matches the archive's first index for that key. Coverage arithmetic holds in every tier (tier R: final 606 ≥ 600, fold 476 ≥ 450, fold Q 446 ≥ 440).
- **Families:** leader-ordered complete linkage yields cliques, so no chaining. The cached Spearman, Jaccard and overlap equal the reference definitions.
- **Ranking:** the cents ranking is transitive for feasible rows (Q25 and −DD are always finite). Archive JSON round-trips preserve NaN/±Infinity and ordering, so the selection's ranking from rebuilt archives equals the search's.
- **Data doors:** physical truncation works; validation requires a sealed PICKS.json for the right window; evaluation requires sealed nominees.
- **Neighbour streams:** `('robust-d1','diverse-d1:<window>',…)` is distinct from the old study's streams. No trace or cache key crosses windows.
- **Temporal blocks:** K is 3/4/6 for fold-a/fold-b/final, the first mark is at armStart−1, and the median for even K is the type-7 midpoint.
- **Gates and nominations:** G3 and pruning use the same marginal definition (the empty pool scores 0). G6 uses net_T for T. GP clauses (i)–(iii) and the null probability 0.1875 are correct. The primary comes only from the unseeded arm of the passing procedure. Freeze-selection refuses when coverage fails.
- **Constants:** the §19 tier table and the §9–§15 constants match `context.ts`.

### Findings

1. **Material: the benchmark's memory projection will reject every tier and stop the study.**
   - Where: `src/d1-diverse/benchmark.ts:198-211` and `284-288`.
   - Problem: `bytesPerStoreRecord` is the heap growth across `local.neighbourRecords(sample, n=16)`. Those neighbour books are new grids, so roughly 100×16×8.5 ≈ 13,600 new traces are built and kept in the evaluator's cache inside that measurement. The old study measured about 30 KB per trace, so the figure becomes about 2.7–4 MB per record instead of about 10 KB.
   - Failure: multiplied by `distinctMax` (168k in tier E, 77k in tier R), the projection is hundreds of GB. Every tier fails the 13 GB rule and the benchmark ends the study as an "incomplete breadth study", or someone fixes the benchmark after seeing that result.
   - Fix:
     - Build or cache the neighbour traces first (call `ensureTraces` on the neighbour books, or measure a second identical pass).
     - Run with `--expose-gc` and call `global.gc()` before each heap reading.
     - Measure only the retained Evaluation and NeighbourRecord objects.
     - Add the per-arm Entry overhead (4 arms × ~47k entries).
     - Measure worker RSS under load; `rssPerWorkerGb` at line 259 is taken while the workers are idle.

2. **Material: the freeze binds check records that are not tied to the code being frozen.**
   - Where: `reproduce.ts:122-150`, `parity.ts:413-453`, `stages.ts:86-107`, `freeze.ts:267-314` and `383-422`.
   - Problem: reproduce.json, parity.json, legacy-check.json and tier.json carry no protocol, context or code hashes. `runFreezeProtocol` only checks `passed` and hashes the files. `requireReproduced` and `requireParity` only check `passed`. `requireFrozen` never re-verifies those bound hashes. reproduce and parity can be re-run after the freeze.
   - Failure: a technical fix from this review, recorded with `change`, would be frozen against reproduce and parity records produced by the old code. The brief's zero-difference parity guarantee would then not hold for the frozen code.
   - Fix:
     - Stamp `provenance()` into every M1 record.
     - In `freezeProtocol`, require each record's code, protocol and context hashes to equal the committed head.
     - In `requireFrozen`, re-verify the bound check-record hashes.
     - Make reproduce and parity refuse to run once `protocol_freeze.json` exists.
     - Re-run M1 after the fixes.

3. **Material (protocol fidelity): island breeding does not match §9.3/§9.4.**
   - Where: `search.ts:87-115`, `160-192`, `194-214`, `294-303`.
   - Problem: `propose` returns cache hits, and `breed` counts them as children toward μ. Hits then join (μ+λ) survival. The stage-B fill therefore runs whenever any hit occurs, not only "when 20 × μ_B attempts produce fewer than μ_B fresh children". The protocol says hits are dropped ("keeps only keys new to the arm's archive…").
   - Effect: stage B is more random than the protocol says, and island populations take in other islands' entries. Budgets and coverage are unaffected.
   - Fix: either count only fresh children, keep breeding up to 20×μ attempts and drop hits, or rewrite §9.3/§9.4 to describe the implemented rule exactly.

4. **Material: the F-P walk-back can return a state the final prune rejected.**
   - Where: `refine.ts:539-576`.
   - Problem: `postPrune` holds the re-refined state from before the final prune. If the final-prune result fails F-P, the walk-back can select that state, which still has a member whose prune-batch lower bound is ≤ 0.
   - Failure: this reintroduces the refinement versus member-gate contradiction that H_P is meant to remove.
   - Fix: walk back only through states that passed a prune rule (`finalPrune.state`, then `first.state`), or re-prune the fallback state. State the rule in §12.3.

5. **Material (methodological; needs an explicit decision before the freeze): T's gates are mechanically stricter than J's.**
   - Where: `gates.ts:79-89`, `families.ts:13-17`, `scores.ts:57-65`.
   - Problem: net_T = net − (b_max − b_med) is never above net. So for the same configuration, T's credible floor (S_T > 0) and G5 (Q25 ≥ 0) are always harder than J's, and G4 behaves differently.
   - Example: Q25(net) = +$10k with a $30k best-block excess gives Q25(net_T) ≈ −$20k. The configuration fails G5 under T only.
   - Consequence: GP needs a passing pick in both folds, so the T-versus-J comparison (Q3) is confounded with gate strictness. This conflicts with brief §8.1: "the major change … should be the score, not the selection machinery".
   - Fix: choose one before the freeze.
     - Evaluate G4/G5 on net for both procedures, keeping the procedure's own score for ranking, the credible floor, G3 and G6.
     - Or keep the current rule, justify it in DESIGN_DECISIONS, and report every finalist's gates under both nets.

6. **Material (honest labelling): no guard against rediscovering R1, R4 or the October 25 finalist.**
   - Where: `assess.ts:471-476`, `search.ts:460-472`.
   - Problem: the "neighbour of an inspected configuration" label checks only B1/B4/B5. R1 (XBI XRT KRE GDX) is B5 minus VGT, one `remove` away from the seeded island's B5 mutants. R4 (XBI KRE GDX XLF) and the October 25 finalist (GDX KRE XBI XLE) also sit in the B5 neighbourhood. R1/R4's post-2023 results are already known.
   - Failure: a near-copy could be nominated (as a seeded alternate, or as an unseeded primary) and sent to `evaluate`. Brief §11 says these are "not new validation candidates" and must never be promoted "by relabeling".
   - Fix: run `nearBenchmark` (and an exact-key check) against the R1, R4 and October 25 books, and predeclare the treatment: excluded from nomination, or at least labelled and barred from primary.

7. **Minor: the unfillable-slot rule is undocumented.**
   - Where: `promote.ts:249-252`.
   - Problem: an extra quality slot is added only when a non-quality slot had zero qualifying leaders; a slot that "failed after 3 attempts" gets no replacement. §11's "remaining slots are filled with the next leaders" does not say this.
   - Fix: state the exact rule in §11.

8. **Minor: the alternate-2 rule in code differs from the protocol.**
   - Where: `gates.ts:260-263`.
   - Problem: the ≤ 3-book requirement is waived when the primary or alternate 1 is already compact. That is the old protocol's clause; §14.2/§15.3 of this protocol do not contain it.
   - Fix: align the code and the text.

9. **Minor: fold category precedence is implicit.**
   - Where: `round.ts:532-563`.
   - Problem: category (a) is returned whenever there are fewer than 3 credible families, even if a passing pick exists, and GP then fails as "search". Separately, the (b) reason reads "no finalist survived refinement and pruning" even when promotion produced nothing.
   - Fix: state the precedence in §14.4 and correct the reason text.

10. **Minor: seed and stream documentation is inconsistent.**
    - Where: PROTOCOL §5 (lines 166-169), `refine.ts:235`.
    - Problem: §5 points to `seedLabels` in context.ts, which does not exist. The streams `stageB-seeds`, `stageC-seeds`, `migration`, `ties`, `bootstrap` and `controls-parity` are not listed. §5 says "no label contains a configuration key", but §12.2 and the code put keys in seeds. The prune-bootstrap seed adds the symbol, which §12.2 does not. §8's "share identical seeds" does not hold for refinement, whose seeds include the arm.
    - Fix: add `seedLabels` to context.ts and correct §5.

11. **Minor: dead or misleading constants and tier-dependent tables.**
    - Unused constants: `persistenceSplit` (context.ts:124, contradicts §7's dropped split), `tieEpsilon`, `holdoutEnd`, `foldA0`, `prune.lowerQuantile`, and `study.draws.{disc,promo,refine,prune,confirmA,confirmB}` (the code uses the tier values).
    - §5's draw table and §11's "n = 96" are tier-E/F figures presented as fixed.
    - §7's "split marks" are not implemented.
    - Fix: remove or label the constants and mark the tables as tier-dependent.

12. **Minor: `select` is not crash-safe as §20 claims.**
    - Where: `round.ts:629-672`.
    - Problem: there is no move-aside for partial promotion, refine or assessment files, which are overwritten. `final/selection.json` and the per-arm assessment.json are unsealed (`writeJson`). Deleting selection.json silently allows a re-run.
    - Fix: write select outputs to a `select/` subdirectory with move-aside, and seal selection.json.

13. **Minor: the benchmark door contradicts §2.7.**
    - Where: `data.ts:126-136`.
    - Problem: `benchmarkUniverse` opens 2024–2026 bars for VOOG, VGT, XBI, XRT, KRE and GDX with no `assertAudited` check and no refusal after the freeze. §2.7 says "only the §16 door opens it", which contradicts §4.4/§18. The audit also reads full files for integrity.
    - Fix: correct the §2.7 wording and harden the door.

14. **Minor: the tests do not cover everything the documents claim.**
    - Where: `leakage.test.ts:142-224`.
    - The mutation test does not compare `refine-*.json` (the prune records) or the calibration.
    - §18 says "the same shift before the cutoff changes them"; the test instead checks an untruncated load.
    - DESIGN_DIFF (2) claims refinement and assessment of the unseeded families, but its test covers promotion only.

15. **Minor: the hash chains are not anchored and amendments are weakly guarded.**
    - Where: `freeze.ts:185-214`, `346-380`.
    - Problem: the first change or amendment has `previousHash ''` rather than the commitment or freeze `bodyHash`. `change` accepts an empty review and empty outputs. Which stage outputs an amendment must not touch is chosen by the operator.
    - Fix: anchor both chains to the sealed records. After any fold validation is sealed, refuse amendments to scores, gates, refine, promote, families, assess, round, PROTOCOL or context.

16. **Minor: some reporting the protocol promises is missing.**
    - §9.5: the per-symbol funnel lacks family-leader, promoted, refined and assessed counts, and the band × category × incumbent-free cells (`round.ts:198-212`).
    - §13: the "paired bootstraps of both scores" against B4/B5 are point differences only (`assess.ts:603-604`).
    - §16.2: confirm-B has no intervals and no 2-SE flag (`final.ts:261-293`).
    - "Dividend-unresolved" is computed for C2 only (`final.ts:495-496`).

17. **Minor: unique effort means unique keys, not unique behaviour.**
    - Where: `archive.ts:66-88`.
    - Problem: `behaviourKey` is dropped, so vectors that produce identical traces, or inert members, count as distinct coverage. Nothing reports partner concentration (brief §5.1's "only alongside GDX").
    - Fix: keep `behaviourKey` and report distinct-behaviour counts and top-partner share descriptively.

18. **Minor: the design tests are not hash-bound.**
    - Where: `freeze.ts:36-55`.
    - Problem: tests are excluded from the commitment and freeze, but DESIGN_DIFF rests on them.
    - Fix: hash them as a separate (non-gating) list.

19. **Observation: the GP comparator is not exposure-matched.** Random eligible controls need only 4 lots. A high-utilization pick in a bull validation window (fold-a 2020-07 → 2021-12) can beat the median without selection skill. Report a lots- or utilization-matched percentile descriptively beside GP.

20. **Observation: resource risks.**
    - `loadArchive` (`round.ts:346`) and the determinism check (`stages.ts:143`) read whole logs as one string. A final-arm log is roughly 150–330 MB, within 2× of V8's ~512 MB string limit; stream it line by line.
    - Memory ceilings are inconsistent: 12 GB main heap (package.json), 8 workers × 2 GB (`pool.ts:73`), a 14 GB RSS guard checked only at progress points, and 16 GB physical.
    - A crash mid-final-search discards all four arms.
    - The O(N²) complete linkage is fine: I estimate minutes even with tens of thousands of credible entries.

21. **Observation: the hindsight rationale is inconsistent.** D-6 rejects regimes for T because they were defined with hindsight, yet the same 13 regimes drive family closeness and G5 inside the folds. Also, configurations with more than 24 books are never sampled (the A6 band stops at 24); state this as a predeclared limitation.

22. **Observation: freeze-selection only re-ranks stored results.** It uses the stored `gates`, `pass` and `value` (`final.ts:108-124`). Recomputing `gatesOf` from the stored assessment numbers would also catch a stale or edited assessment.json.

### Verdict
Not safe to freeze as it stands. The benchmark (1) would end the study at M1, and the freeze (2) would bind M1 records produced by pre-fix code. Once 1–6 are fixed (3 and 5 can be settled by protocol text plus a stated decision; 1, 2, 4 and 6 need small code changes), each recorded through `change`, and M1 (audit, reproduce, parity, benchmark) is re-run under the fixed head, the design is sound to freeze. The minor items should be fixed or documented before the freeze; none of them threatens leakage or the four structural fixes, which hold by construction.
