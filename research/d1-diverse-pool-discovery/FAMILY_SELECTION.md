# Family selection: families, representatives, refinement and pruning (PROTOCOL.md §10–§12)

**Who this is for:** reviewers checking how candidates were grouped, which representatives went forward, and what
refinement and the obligatory pruning pass changed. Everything here is training-window (E1) evidence.

Sources:
- `results/rounds/<window>/select/<arm>/{promotion,refine-f*,assessment}.json` (bound by hash in
  `FROZEN_SELECTION.json`);
- the tables are generated from `results/tables/coverage-summary.json` (`scripts/coverage_summary.py`).

## 1. The rules (frozen)

- **Credible set, per arm (never pooled across arms):**
  - centre-feasible (F1: minute DD ≤ $35,000 at 5 and 10 bps);
  - score > 0;
  - an activity floor.
- **Families: leader-ordered complete linkage.** In ranking order, an entry joins the first family whose leader **and
  every member** it is close to. Close means all of:
  - membership Jaccard distance < 0.5;
  - funded-lot overlap ≥ 0.5;
  - Spearman of regime P&L ≥ 0.7.

  Otherwise it starts a new family, so every family is a clique and cannot chain. A synthetic test checks that A≈B,
  B≈C, A≉C never share a family in any order (`design.test.ts` (3)).
- **Promotion:** 8 slots per final arm:
  - Q1–Q3: the best leaders;
  - compact: ≤ 3 books;
  - medium: 4–6 books;
  - broad: ≥ 7 books;
  - incumbent-free: no B5 member;
  - far: Jaccard distance ≥ 0.75 from every already chosen leader.

  Fold J/T arms have 6 slots (Q1, Q2, compact, incumbent-free, far, Q3) and fold Q arms 4 (Q1, Q2, compact, far).
  Each slot takes the best qualifying leader not yet chosen. Its representative is the best training-portfolio-feasible
  (F-P: daily % DD ≤ 35%) of the family's top 3 members re-scored on the `promo` draws (n = 96). A slot gets at most 3 attempts.
- **Refinement and pruning** (`refine` draws), applied to every promoted family:
  1. Coordinate, joint, pair and membership passes accept a move only if the arm's score gains ≥ δ = $5,000.
  2. **Obligatory pruning** on a separate `prune` batch (n = 128): while any member's 90% paired-bootstrap lower bound
     of its marginal is ≤ 0, remove the lowest such member, unless that breaches F1.
  3. One parameter-only re-refinement cycle, then a final prune.
  4. If the result fails F-P, walk back only through prune-satisfying states; otherwise the family yields no
     finalist.
  5. Q arms prune on centre marginals.

## 2. No single-linkage collapse

| Round | October 25 study (single linkage over a pooled top 300) | This study (complete linkage, per arm, whole credible set) |
|---|---|---|
| fold-a | J: 6 families (largest 131 of 300) | J-u 2,651 families (largest 276 of 8,574); T-u 1,911 (288 of 6,182); Q-u 1,076 |
| fold-b | **J: 1 family (298 of 298)** | J-u 2,836 (136 of 7,070); T-u 1,797 (74 of 3,991); Q-u 1,135 |
| final | **pooled: 1 family (295 of 295)** | J-u 5,276 (506 of 20,467); T-u 4,979 (679 of 21,030); J-s 4,151 (1,728 of 21,028); T-s 4,353 (2,629 of 23,375) |

The remaining diversity problem is different (`COVERAGE_AND_DIVERSITY.md` §4). Families separate by behaviour, so
several shortlisted families can share one membership with different parameters, and the seeded arms' score-ranked
slots all landed on B5's neighbourhood.

## 3. Final round: every promoted family, its representative and what refinement and pruning did

"Slot" is the slot of the family's **leader** (§11 tests the leader). The representative is the best feasible of the
family's top 3 members, and refinement can change it further. So a finalist need not have its slot's property. The
pre-selection-freeze review counted 8 of 31 promoted families where it does not:
- broad, in all four arms: finalists of 5 books, or none;
- compact, in J-s (4 books) and T-s (5 books);
- incumbent-free, in T-u: T-u-f7 contains KRE and has T-u-f1's exact membership;
- far, in J-s: J-s-f8 is at Jaccard 0.67 from J-s-f6.

"Refinement gain" is the arm's score gained by the refinement passes (before pruning). "Final gates" are the
procedure's G1–G8 at 5 bps on confirm-A (`FINAL_CANDIDATES_AND_GATES.md` has the details).

#### final J-u

| Slot | Family size | Promoted membership | After refinement and pruning | Refinement gain | Membership moves | Pruned (marginal; 90% lower bound) | Final gates |
|---|---:|---|---|---:|---|---|---|
| Q1 | 173 | EWW FXI GDX XME | EWW FXI GDX KBE XME | +$27,404 | add KBE | — | fail G7 |
| Q2 | 506 | EWW FXI GDX SMH XME | EWW FXI GDX SMH XME | +$21,935 | — | — | fail G7 |
| Q3 | 77 | EWW FXI GDX KIE SMH XME | EWW FXI GDX SMH XME | +$34,223 | — | KIE −$386 (−$3,813) | fail G7 |
| compact | 22 | FXI GDX XHB | FXI GDX XHB | +$16,522 | — | — | fail G7 |
| medium | 26 | EWW FXI GDX SMH XME | EWW FXI GDX SMH XME | +$23,733 | — | — | fail G7 |
| broad | 12 | EWW FXI GDX KIE SMH XME | EWW FXI GDX SMH XME | +$44,112 | — | KIE +$300 (−$3,790) | fail G7 |
| incumbent-free | 2 | EWW FXI SMH XLK XME | EWW FXI XLK XME | +$20,243 | — | SMH +$418 (−$2,481) | fail G6,G7 |
| far | 1 | EDV GDX SLV XLK | EDV GDX SLV XLK | +$15,475 | — | — | fail G6,G7 |

#### final T-u

| Slot | Family size | Promoted membership | After refinement and pruning | Refinement gain | Membership moves | Pruned (marginal; 90% lower bound) | Final gates |
|---|---:|---|---|---:|---|---|---|
| Q1 | 591 | EWW FXI KRE MTUM SLV XME | EWW FXI KRE MTUM SLV XME | +$13,217 | — | — | fail G7 |
| Q2 | 43 | EWW GDX ILF VGT XBI | EWW GDX ILF VGT XBI | +$15,310 | — | — | fail G7 |
| Q3 | 62 | EWW GDX ILF VGT XBI | EWW GDX ILF VGT XBI | +$12,356 | — | — | fail G7 |
| compact | 20 | EWW SLV XME | EWW SLV XME | +$37,443 | — | — | fail G6,G7 |
| medium | 79 | DBC GDX SLV SMH XBI | DBC GDX SLV SMH XBI | +$0 | — | — | fail G7 |
| broad | 4 | EWW FXI ILF MTUM SLV XBI XME | EWW FXI MTUM SLV XME | +$42,622 | remove XBI | ILF −$5,164 (−$10,463) | fail G7 |
| incumbent-free | 15 | EWW FXI KRE MTUM SLV XME | EWW FXI KRE MTUM SLV XME | +$32,147 | — | — | fail G7 |
| far | — | (failed after 3 attempts) | — | — | — | — | — |

#### final J-s

| Slot | Family size | Promoted membership | After refinement and pruning | Refinement gain | Membership moves | Pruned (marginal; 90% lower bound) | Final gates |
|---|---:|---|---|---:|---|---|---|
| Q1 | 1728 | GDX KRE XBI XRT | GDX KRE XBI XRT | +$9,004 | — | — | pass |
| Q2 | 254 | GDX KRE XBI XRT | GDX KRE XBI XRT | +$19,495 | — | — | pass |
| Q3 | 69 | GDX KRE XBI XRT | GDX KRE XBI XRT | +$18,239 | — | — | pass |
| compact | 85 | GDX KRE XBI XRT | GDX KRE XBI XRT | +$20,164 | — | — | pass |
| medium | 297 | GDX KRE XBI XRT | GDX KRE XBI XRT | +$17,488 | — | — | pass |
| broad | 10 | GDX KRE SMH VGT XBI XRT | GDX KRE VGT XBI XRT | +$5,114 | — | SMH +$3,324 (−$2,851) | fail G7 |
| incumbent-free | 4 | FXI ILF IWN SLV | FXI ILF IWN SLV | +$0 | — | — | fail G4,G6,G7 |
| far | 2 | EWW FXI GDX IEMG KRE VGT | EWW EWZ FXI GDX KRE VGT XME | +$86,818 | add EWZ, remove IEMG, add XME | — | fail G7 |

#### final T-s

| Slot | Family size | Promoted membership | After refinement and pruning | Refinement gain | Membership moves | Pruned (marginal; 90% lower bound) | Final gates |
|---|---:|---|---|---:|---|---|---|
| Q1 | 264 | GDX KRE VGT XBI XRT | GDX KRE VGT XBI XRT | +$14,062 | — | — | fail G7 |
| Q2 | 64 | GDX KRE SMH VGT XRT | DBC GDX KRE SMH VGT XRT | +$40,269 | add DBC | — | fail G7 |
| Q3 | 778 | GDX KRE VGT XBI | GDX KRE VGT XBI | +$0 | — | — | fail G7 |
| compact | 2629 | GDX KRE VGT XBI XRT | GDX KRE VGT XBI XRT | +$24,080 | — | — | fail G7 |
| medium | 62 | GDX KRE VGT XBI XRT | GDX KRE VGT XBI XRT | +$0 | — | — | pass |
| broad | 88 | GDX KRE SMH VGT XHB XRT | none (F-P after pruning) | +$20,912 | remove XHB | — | — (no finalist) |
| incumbent-free | 3 | EWW FXI IWN SLV TIP XLY | EWW FXI IWN SLV | +$38,845 | remove XLY | TIP −$5,000 (−$5,000) | fail G6,G7 |
| far | 3 | GDX IWF IWN | GDX IWF IWN | +$47,591 | — | — | fail G6,G7,G8 |


**Accepted member changes and prunes in the final round:**
- **Refinement added a member 4 times:** KBE to J-u Q1; EWZ and XME to J-s far, which also lost IEMG; DBC to T-s Q2.
- **Refinement removed a member 3 times:** XBI from T-u broad, XHB from T-s broad, XLY from T-s incumbent-free.
- **Pruning removed 6 members.** Each had a 90% lower bound ≤ 0; several had positive point estimates.
  - KIE twice, from J-u Q3 (−$386) and J-u broad (+$300);
  - SMH from J-u incumbent-free (+$418) and from J-s broad (+$3,324);
  - ILF from T-u broad (−$5,164);
  - TIP from T-s incumbent-free (−$5,000, an inert member).
- **T-s broad yielded no finalist:** after pruning, its training portfolio daily % DD was 35.16% (> 35%), and no
  prune-satisfying state was feasible.
- **T-u's far slot stayed empty:** its three attempts were all FXI VGT VPU XHB families (sizes 116, 679 and 26), and each
  failed F-P on the training portfolio's daily % DD. A slot whose 3 attempts fail is recorded and not replaced (§11).
- **No prune was blocked by F1, and no walk-back occurred.**

## 4. Fold rounds (for the walk-forward comparison; picks frozen before validation)
#### fold-b J-u

| Slot | Family size | Promoted membership | After refinement and pruning | Refinement gain | Membership moves | Pruned (marginal; 90% lower bound) |
|---|---:|---|---|---:|---|---|
| Q1 | 33 | GDX SMH XHB | GDX SMH XHB | +$38,732 | — | — |
| Q2 | 84 | GDX SLV SMH | GDX SMH | +$13,779 | — | SLV −$6,755 (−$11,794) |
| compact | 22 | GDX SLV SMH | GDX SMH | +$6,751 | — | SLV −$3,575 (−$4,715) |
| incumbent-free | 76 | IGV SLV XLK | IGV SLV XLK | +$16,296 | add SMH | SMH −$4,975 (−$5,936) |
| far | 22 | GDX IWM XHB | GDX IJR XHB | +$46,097 | add IJR, remove IWM | — |
| Q3 | 32 | GDX SLV SMH | GDX SMH | +$10,821 | — | SLV −$8,053 (−$14,345) |

#### fold-b T-u

| Slot | Family size | Promoted membership | After refinement and pruning | Refinement gain | Membership moves | Pruned (marginal; 90% lower bound) |
|---|---:|---|---|---:|---|---|
| Q1 | 2 | GDX VOOG XBI | GDX VOOG XBI | +$0 | — | — |
| Q2 | 11 | IGV VOOG | VOOG | +$82,426 | add KBE | KBE +$29,392 (−$5,000); IGV −$3,803 (−$42,434) |
| compact | 2 | IGV VOOG | IGV VOOG | +$84,804 | add XRT, remove XRT | — |
| incumbent-free | 13 | IGV IWN | IGV IWN | +$0 | — | — |
| far | 1 | SMH TLT | SMH | +$48,101 | remove TLT | — |
| Q3 | 20 | IGV IWN | IGV IWN | +$0 | — | — |

#### fold-b Q-u

| Slot | Family size | Promoted membership | After refinement and pruning | Refinement gain | Membership moves | Pruned (marginal; 90% lower bound) |
|---|---:|---|---|---:|---|---|
| Q1 | 2 | DBC GDX KIE SPLV XHB | DBC GDX XHB | +$0 | — | KIE −$5,000; SPLV −$5,000 |
| Q2 | 3 | DBC GDX SHY XHB XLB | DBC GDX XHB | +$20,067 | — | SHY −$5,000; XLB −$5,000 |
| compact | 2 | GDX XHB | GDX XHB | +$25,387 | — | — |
| far | 8 | EWW GDX IEMG | EWW GDX XHB | +$42,088 | remove IEMG, add XHB | — |

#### fold-a J-u

| Slot | Family size | Promoted membership | After refinement and pruning | Refinement gain | Membership moves | Pruned (marginal; 90% lower bound) |
|---|---:|---|---|---:|---|---|
| Q1 | 58 | GDX IBB SMH XHB | GDX IBB SMH XHB | +$8,233 | — | — |
| Q2 | 155 | GDX IBB SMH XHB | GDX IBB XHB | +$6,875 | remove SMH | — |
| compact | 180 | GDX SMH XHB | GDX SMH XHB | +$0 | — | — |
| incumbent-free | 47 | XHB | XHB | +$0 | — | — |
| far | 148 | EWW GDX KBE | EWW GDX KBE | +$8,333 | — | — |
| Q3 | 45 | GDX IBB SMH XHB | GDX IBB SMH XHB | +$6,064 | — | — |

#### fold-a T-u

| Slot | Family size | Promoted membership | After refinement and pruning | Refinement gain | Membership moves | Pruned (marginal; 90% lower bound) |
|---|---:|---|---|---:|---|---|
| Q1 | 8 | FXI GDX XLK | FXI GDX XLK | +$0 | — | — |
| Q2 | 2 | GDX SMH | GDX SMH | +$0 | — | — |
| compact | 6 | GDX KBE | GDX KBE | +$0 | — | — |
| incumbent-free | 35 | IBB IGV ILF | IBB IGV ILF | +$5,365 | — | — |
| far | 7 | GDX IGV IJR VGT | GDX IGV | +$6,460 | remove IJR | VGT −$5,000 (−$5,000) |
| Q3 | 32 | GDX SMH | GDX SMH | +$0 | — | — |

#### fold-a Q-u

| Slot | Family size | Promoted membership | After refinement and pruning | Refinement gain | Membership moves | Pruned (marginal; 90% lower bound) |
|---|---:|---|---|---:|---|---|
| Q1 | 6 | GDX KRE | EDV GDX KRE | +$15,882 | add EDV | — |
| Q2 | 3 | GDX IGV | GDX IGV | +$13,611 | — | — |
| compact | 8 | GDX IGV IJH | GDX IGV XRT | +$37,652 | add XRT, remove IJH | — |
| far | 1 | GDX LQD RSP SMH | GDX RSP SMH | +$0 | — | LQD −$5,000 |

The fold-b J-u pruning row is the October 25 failure mode, now caught by construction:
- SLV was kept by refinement because its effect was below δ, and was then pruned on the independent batch in three
  families (−$3,575 to −$8,053).
- In a fourth family, refinement *added* SMH on the refine draws; the prune batch measured its marginal at −$4,975,
  and it was removed.
- In fold-b T-u Q2, KBE had a positive point estimate (+$29,392) but an uncertain lower bound, and was pruned. The
  result was VOOG alone with 1 lot, which then failed G3's activity floor. That is the pruning rule being
  conservative (pre-final review observation 10).
