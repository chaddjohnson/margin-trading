# Design diff: what changed from the October 25 study, and why the old failures cannot recur

**Who this is for:** the user and an independent reviewer, checking that the four structural failures of the October
25 study (`research/d1-robust-pool-discovery/`) are impossible by construction here, not merely tuned away. Each row
names the test that shows it. Run the tests with
`node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/d1-diverse/tests/*.test.ts`
(synthetic data only; no market P&L).

## The four structural failures (plus the tie window)

| # | October 25 failure (record) | Mechanism here (PROTOCOL) | Test (`src/d1-diverse/tests/`) |
|---|---|---|---|
| 1 | Coverage floor unmet for 29 / 25 final-arm symbols; a 15% reserve topped up only 36 of 48 under-covered symbols (SEARCH_COVERAGE §2) | A deterministic stage-A schedule (every symbol 396 appearances, distinct vectors, every size band) **before** any evaluation, plus one anchored island per symbol with an equal budget that is always spent (§9.2–§9.3); contracts checked on every archive and required before any nomination (§9.5, §15.4) | `design.test.ts` (1): 16-, 61- and 75-symbol universes, a dominant symbol (forced convergence), an exhausted free-island budget — every contract met; a failed contract blocks nominations |
| 2 | The seeded arm filled the pooled top 300; no unseeded candidate was ever clustered (POOL_FAMILIES §2) | No cross-arm pooling before assessment: each arm forms its own credible set, families and shortlist, and every shortlisted family is refined, pruned and assessed (§10–§11, §13) | `design.test.ts` (2): the seeded arm owns the global top 300 (the old rule keeps 0 unseeded entries) and the unseeded arm still fills every slot from distinct families; `leakage.test.ts` runs refinement, pruning and assessment of every promoted family end to end |
| 3 | Single linkage chained 295 / 298 configurations into one family (POOL_FAMILIES §2) | Leader-ordered complete linkage: an entry joins a family only if close to its leader **and every member**; families are cliques (§10.3) | `design.test.ts` (3): A~B, B~C, A≁C never share a family in all six orders; a 12-link chain gives ≥ 6 pairwise-close families; 200 near-duplicates plus distinct configurations give several families; the cached closeness equals the reference definitions |
| 4 | Refinement kept XRT (gain < δ = $5,000); G3 then rejected the pool for XRT's −$1,897 marginal (WALK_FORWARD §3) | An obligatory pruning pass on its own draw batch with G3's objective and a 90% lower-bound rule, before assessment; then a parameter-only re-refinement and a final prune (§12.2–§12.3) | `design.test.ts` (4): a member with a small negative marginal below δ is pruned (a generic stand-in; the historical XRT vector and result are not used as a fixture); an uncertain small positive one is pruned; cascading removals to an empty pool; an F1-breaching removal is not made. On real data, fold-b's J arm pruned SLV from three families at −$3,575 to −$8,053 |
| 5 | A $12,500 tie window let the key choose between finalists $6,493 apart (WALK_FORWARD §3) | Exact ties only; uncertainty reported, never deciding (§6.3) | `design.test.ts` (5) |
| 6 | (new safeguard) R1/R4/the October 25 finalist could have been rediscovered and nominated | exact/near copies labelled and never nominated in the final round (§2.10, §15.3) | `design.test.ts` (6) |

## Other differences (all decided before any outcome)

| Topic | October 25 study | This study | Reason (DESIGN_DECISIONS) |
|---|---|---|---|
| Question tested in time | neighbourhood score J vs peak Q | J vs a temporal score T with identical machinery; Q kept as a bounded control | D-6 |
| Fold gate | G-WF; "no J pick" counted as forward failure; null pass ≈ 0.31 | GP per procedure with outcome categories (forward / search / economics); null pass 0.1875 | D-7 |
| G4/G5 for the new score | — | read actual net for both J and T (only ranking, credible floor, G3, G6 use the procedure's score) | D-6 |
| Island breeding | cache hits counted as children and survived | only fresh children count and survive | D-13 (3) |
| Unseeded libraries | final round included inspected control vectors | Sobol only, every round | D-3 |
| Primary nominee | any passing finalist | unseeded arm of the procedure that passed GP | D-3 |
| Draw batches | disc, promo, refine, confirm-A, confirm-B | adds `prune`; every batch separate | D-5 |
| Controls | 360 (40 per stratum), A1/A2/N2/N3 | 576 (64 per stratum), A1 only; comparator floor 20 | D-9 |
| Budget | 24,000 per final arm; 96,000 total | ≈ 46,900 per final arm; ≈ 319,000 total (design-time estimate; actual 47,032 per final arm, 320,840 total) | D-10 |
| Dividend diagnostic | issuer histories required for nominees (never implemented) | omission bounds only (no download authorized) | D-11 |
| Isolation | — | old study verified at `348f100b` from git objects | D-1 |
| Leakage test | discovery and picks on fixture data | the full searchCore + selectCore (schedule, islands, families, promotion, refinement, pruning, assessment, picks) on fixture data | `leakage.test.ts` |

## Unchanged by design

The D1 grid and box, fills, splits, calendar, interest, costs, the N-book engine and the replay; the neighbourhood
instrument (step units, reflection, CRN, classes); the genome operators; J's formula, λ, α_m, α_t and its calibration
rule; F1 ($35,000 at 5 and 10 bps) and F-P (35%); G1–G8 thresholds (G3's member marginal, G4's 0.80 cost retention,
G5's tails, G6's M = $25,000 / $50,000 with the paired lower bound, G7's ladder, G8's boundary share); the folds and
their dates; the blocking rules C1–C4; the capacity labels; the evidence labels E0–E4.
