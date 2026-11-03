# Stage D — joint search and diversity

Stage D searched subsets of each window's Stage D universe (the Stage A survivors: 49 / 54 / 53 ETFs) together
with one pool-specific D1 vector per member, **with P1 and the window's frozen ranking active in every evaluation**
(fixed $100,000 pool, 5 bps per side, training data only). R1 and R2 are separate branches with identical budgets,
operators, universes and arm seeds (`joint:<window>:<arm>`), so their initial populations are paired. Procedure:
PROTOCOL §11. Sealed records: `results/joint/<window>/<R1|R2>/JOINT.json`; every evaluated configuration:
`…/archive.jsonl.gz` (hash in the record). Figures below: `results/tables/joint-<window>-<R>.md` (from the CLI's
`tables`) and `results/tables/joint-diversity.md` (from `node research/d1-ranked-preemption/scripts/
joint_diversity.mjs`, read-only).

## 1. Design in brief

| Element | Rule |
|---|---|
| Arms (never pooled) | **S** standalone-seeded (C_Rk, then subsets of 2–8 survivors with their representative or a library phenotype); **I** independent (random subsets of 2–8, uniform random grid vectors, no Stage A vector); **B** incumbent-seeded (B4, B5 and 46 mutants; final window only, exploratory, not nominable) |
| Evolution | μ + λ = 48 + 48, binary tournament on J_pool; one operator per offspring: paramOne 0.30, paramMulti 0.15, add 0.15, remove 0.12, swap 0.10, crossover 0.18; a configuration already evaluated in the arm is retried |
| Score | J_pool = net − max(0, best lot) − $2,500 × (books − 1) − max(0, minute DD − $25,000); infeasible (DD > $35,000 or fewer than 6 / 8 / 12 lots) = raw − 10⁹ |
| Promotion → refinement → assessment | best 12 feasible (≤ 2 per membership, distinct funded-trade keys) → 32 neighbourhood draws, keep 3 by the median J_nbA → one refinement cycle (single-coordinate ±1..3 steps per member, member removal; accepted at ≥ +$2,500) → 64 fresh draws (J_nbB, drawdown share, net percentiles) + 32 double-amplitude draws |
| Pick | arm finalist = best J_nbB of its 3; branch pick D\*_Rk = best J_nbB among the S and I finalists |

## 2. Budget and coverage

Tier T1 (`results/benchmark/tier.json`): 10,000 evaluations per arm in the folds (208 generations), 16,000 in the
final window (333 generations); every arm used exactly its budget and the materiality share was 100% everywhere.

| Window | Ranking | Arm | Evaluations | Feasible | Distinct memberships | Symbols tried | Symbols in ≥ 25% of evaluations | Effective symbols | Median size | Best feasible J_pool |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| fold-a | R1 | S | 10,000 | 99.5% | 1,355 | 49 | 9 | 10.4 | 8 | $290,659 |
| fold-a | R1 | I | 10,000 | 88.3% | 1,743 | 49 | 12 | 12.6 | 9 | $214,551 |
| fold-a | R2 | S | 10,000 | 98.4% | 1,195 | 49 | 8 | 9.6 | 8 | $250,674 |
| fold-a | R2 | I | 10,000 | 87.7% | 1,704 | 49 | 8 | 10.9 | 8 | $202,028 |
| fold-b | R1 | S | 10,000 | 98.4% | 1,634 | 54 | 12 | 13.4 | 11 | $381,533 |
| fold-b | R1 | I | 10,000 | 89.3% | 1,654 | 54 | 8 | 10.1 | 7 | $264,745 |
| fold-b | R2 | S | 10,000 | 99.4% | 1,374 | 54 | 12 | 13.0 | 12 | $369,976 |
| fold-b | R2 | I | 10,000 | 90.0% | 1,896 | 54 | 11 | 13.2 | 10 | $252,562 |
| final | R1 | S | 16,000 | 97.7% | 1,765 | 53 | 11 | 11.4 | 10 | $475,419 |
| final | R1 | I | 16,000 | 86.3% | 2,078 | 53 | 12 | 12.6 | 11 | $336,069 |
| final | R1 | B (expl.) | 16,000 | 92.6% | 611 | 53 | 5 | 5.8 | 5 | $415,531 |
| final | R2 | S | 16,000 | 96.9% | 1,396 | 53 | 12 | 12.4 | 12 | $485,894 |
| final | R2 | I | 16,000 | 88.8% | 2,520 | 53 | 13 | 14.2 | 11 | $391,508 |
| final | R2 | B (expl.) | 16,000 | 96.7% | 1,499 | 53 | 12 | 12.6 | 12 | $511,861 |

"Effective symbols" = the inverse Simpson index of member appearances across the arm's evaluations. Every symbol of
the universe was tried in every arm, but each arm's population settled on 8–13 symbols that appear in at least a
quarter of its evaluations (lists in `results/tables/joint-diversity.md`). **GDX is in the frequent set of every arm
and in every pick.** The pools grew large (median 8–12 books): the $2,500 book penalty did not keep them small.

## 3. Seeded versus unseeded

- **S beat I on the best feasible centre in every branch**, by $48.6k (fold-a R2) to $139.4k (final R1): the
  standalone phenotypes are good starting points for an in-sample optimum.
- **S supplied the pick in five of six branches.** In final R2 the I finalist won because its neighbourhood stayed
  feasible far more often (70.3% of the 64 draws with minute DD ≤ $35k vs 32.8–39.1% for S's three kept candidates).
- The incumbent-seeded B arm (final only, exploratory) reached best centre J_pool $415.5k (R1) and $511.9k (R2); it stayed close
  to B5's membership under R1 (5.8 effective symbols, finalist EEM GDX KRE XBI XRT) and drifted to 11 books under R2.
  Not nominable; reported for transparency (DB-R1 / DB-R2 in the final controls).

## 4. Diversity inside an arm

The arms stayed independent (never pooled, separate shortlists), so the earlier studies' pooled top-K suppression
could not occur. **Within an arm, however, the shortlist collapsed onto near-duplicates:** the 12 promoted
configurations held only 6–10 distinct memberships, with a mean pairwise membership Jaccard distance of 0.13–0.15
(0.22 in final B-R1) — typically one membership and its one-member variants. The ≤ 2-per-membership and distinct
funded-trade rules held; they do not force materially different pools. The three kept candidates of an arm usually
share all but one member.

## 5. The picks: memberships and pool-specific vectors

| Window | Ranking | Arm | Members | Books | Centre net | Minute DD | Lots | Executed / declined switches | J_nbB | Draws with DD ≤ $35k |
|---|---|---|---|---:|---:|---:|---:|---|---|---:|
| fold-a | R1 | S | EDV EWW FXI GDX IAU IGV XHB XLY | 8 | $344,192 | $17,281 | 48 | 24 / 3 | $178,806 | 95.3% |
| fold-a | R2 | S | EDV EWW EWY FXI GDX ILF VIG XHB | 8 | $303,618 | $17,281 | 44 | 18 / 8 | $126,837 | 79.7% |
| fold-b | R1 | S | EWW FXI GDX IBB ILF KRE SMH TLT XLY XOP XRT | 11 | $434,184 | $17,281 | 72 | 32 / 12 | $162,030 | 75.0% |
| fold-b | R2 | S | EWZ FXI GDX GLD INDA IWF KRE XBI XME XOP XRT | 11 | $421,787 | $25,530 | 92 | 37 / 22 | $168,724 | 71.9% |
| final | R1 | S | EEM EWW FXI GDX IWF KBE LQD XLK XLP XME | 10 | $543,069 | $19,568 | 77 | 20 / 19 | infeasible majority | 39.1% |
| final | R2 | I | EDV EWY GDX ILF INDA IWF KBE SLV VOOG XHB XLK | 11 | $431,110 | $22,410 | 108 | 44 / 27 | $165,487 | 70.3% |

- **Overlap with B5** (Jaccard similarity of memberships): 0.07–0.08 in fold-a and the final window, 0.23 / 0.33 in
  fold-b (GDX, KRE, XRT; and XBI under R2). The joint search did not rebuild B5.
- **R1 vs R2 in the same window:** 0.45 (fold-a), 0.29 (fold-b), 0.24 (final). **Across consecutive windows, same ranking:**
  0.12–0.27 (fold-a vs final: 0.20 under R1, 0.36 under R2). The picks are not stable from one window to the next — a membership chosen in fold-a says little about
  fold-b's.
- **The final R1 pick's own neighbourhood was majority-infeasible** (61% of the 64 draws broke the $35k drawdown
  ceiling); it became the branch pick because the I finalist's was worse (18.8%). The rule picks the best J_nbB
  regardless; the nomination gates (N3: ≥ 75% required) would have rejected it.
- **Pool-specific vectors.** Every pick member's vector was evolved inside the pool (origins `g<generation>:<index>`,
  mostly late generations). For S picks the L1 distance (sum over the eight coordinates, in grid steps) to the
  nearest standalone phenotype of that symbol was 1–127 (median 42 over 48 members): starting from a standalone phenotype, the
  search moved it substantially. For the I pick it was 150–464 (never derived from Stage A). Per member:
  `results/tables/joint-diversity.md`; exact grids: the pick keys in `results/tables/joint-<window>-<R>.md` and the
  executable research pools `config/research-pools/d1-ranked-preemption/<window>/RP-<window>-D-<R>.json`.

## 6. Search and refinement moves; survivor ledgers

- Operators are drawn per offspring with the probabilities in §1; the archive records each configuration's origin
  (generation and slot), not the operator, so per-operator success rates are not reported.
- **Refinement** (one cycle per kept candidate, 42 candidates over all arms): 15 accepted a move, gaining $2,500 to
  $7,142 at the centre — 12 of them a member removal (5 gaining exactly $2,500: an inert member pruned) and 3 a
  parameter move; 27 kept their centre.
- **Ledgers in each JOINT.json** (per arm): `top` (the 20 best configurations by J_pool with metrics), `promoted` (the
  12 with their 32-draw promotion neighbourhoods), `assessed` (the 3 kept: original and refined centre, refinement
  gain, promotion, 64-draw assessment and double-amplitude results), `finalist`, and the branch `pick`. The archive
  holds every evaluation (20,000 rows per fold branch, 48,000 per final branch: ranking, arm, stage, generation, key,
  members, score, feasibility, net, minute DD, lots, best lot, preemption counts, funded-trade key).

## 7. What the search shows

- With P1 active the optimizer finds pools of 8–12 books whose in-sample net far exceeds B5's ($300k–$543k vs
  $171k–$388k on the same training windows), largely through switching (the P0 ablation of each pick loses
  $108k–$262k on training).
- Those optima are sharp. The 64-draw median nets sit $110k–$312k below the centres; in the final window most
  neighbourhoods break the drawdown ceiling; out of sample the fold picks returned −$39.9k to +$24.2k
  (`CHRONOLOGICAL_VALIDATION.md`). The diversity machinery kept the arms apart but did not prevent each arm from
  converging on one sharp peak.
