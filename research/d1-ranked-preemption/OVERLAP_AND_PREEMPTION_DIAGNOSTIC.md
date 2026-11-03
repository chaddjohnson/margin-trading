# Overlap and preemption diagnostic

## 1. The preflight diagnostic (nonpreemptive P0 books, each window's training data, PROTOCOL §9)

B4 and B5 run with their exact frozen vectors, and C_R1 / C_R2 with their standalone representatives, under the
original allocator P0. For every decision refused while one funded lot alone held the slot the record keeps the time,
holder and holding age, the decider, the rank tests under R1 and R2, the estimated and next-trade liquidation nets,
whether the holder's own exit or the decider's fill would come first, whether the fill would be the same auction
print, and **actionable** = exactly the conditions under which P1 would have sold there (tested equal to P1 on
randomized fixtures). Hindsight figures (the decider's virtual net, the holder's remaining net) are labelled and were
never used. Sealed records: `results/diagnostic/<window>/DIAGNOSTIC.json`.

| Window | Pool | Decisions | Refused (all while a lot was held) | Funded lots | Higher priority R1 / R2 | … estimate ≥ $0 R1 / R2 | **Actionable R1 / R2** | Same-minute ties |
|---|---|---:|---:|---:|---|---|---|---:|
| fold-a | B4 | 38 | 28 | 10 | 3 / 25 | 0 / 23 | **0 / 23** | 0 |
| fold-a | B5 | 43 | 23 | 20 | 9 / 14 | 5 / 11 | **5 / 11** | 0 |
| fold-a | C_R1 (VGT GDX VPU XLU GLD) | 34 | 16 (15) | 18 | 7 / — | 5 / — | **5 / —** | 0 |
| fold-a | C_R2 (IYT XLU VPU VOOG XLB) | 34 | 21 | 13 | — / 15 | — / 8 | **— / 7** | 2 |
| fold-b | B4 | 73 | 51 | 22 | 4 / 47 | 0 / 41 | **0 / 40** | 0 |
| fold-b | B5 | 79 | 39 | 40 | 13 / 22 | 7 / 16 | **7 / 15** | 0 |
| fold-b | C_R1 (XLK VGT XME GDX XLI) | 49 | 36 (35) | 13 | 11 / — | 6 / — | **6 / —** | 2 |
| fold-b | C_R2 (XOP IWN VGK IWM KRE) | 94 | 59 | 35 | — / 19 | — / 11 | **— / 11** | 6 |
| final | B4 | 137 | 66 (65) | 71 | 9 / 51 | 2 / 43 | **2 / 42** | 0 |
| final | B5 | 155 | 73 | 82 | 21 / 45 | 11 / 34 | **11 / 32** | 2 |
| final | C_R1 (FXI XME XLI VGT IBB) | 69 | 38 | 31 | 19 / — | 9 / — | **9 / —** | 0 |
| final | C_R2 (IWN XME XLE KIE XBI) | 113 | 64 | 49 | — / 23 | — / 10 | **— / 7** | 2 |

**Material-opportunity criterion (frozen):** a window is material iff, under either ranking, some pool has ≥ 3
(folds) / ≥ 5 (final) actionable opportunities. All three windows were material, so Stage D ran at its full budget for
both rankings everywhere. (A known bias, disclosed before outcomes: B4/B5's vectors were chosen with hindsight; the
count only sized the search.)

Opportunity depends strongly on the ranking: under R1, B5's large-trade books (VGT, GDX) rank first and are rarely
pre-empted; under R2 the short-holding books (KRE, XBI) rank first and VGT last, so most of B4's refused KRE signals
(KRE held out by a VGT lot: 18, 31 and 31 times) become actionable.

### Collision matrices (decider → holder: refused decisions)

| Window | B4 | B5 |
|---|---|---|
| fold-a | KRE→VGT 18; XBI→VGT 4, KRE 1; XRT→VGT 3, KRE 1; VGT→KRE 1 | KRE→GDX 6, VGT 2, XBI 2; XBI→GDX 3, KRE 2; XRT→KRE 3, GDX 1; VGT→GDX 2, KRE 1; GDX→KRE 1 |
| fold-b | KRE→VGT 31, XRT 1; XBI→VGT 8, KRE 2; XRT→VGT 7, KRE 1; VGT→KRE 1 | KRE→VGT 6, GDX 6, XBI 2, XRT 1; XBI→KRE 5, GDX 3, VGT 3; XRT→VGT 4, KRE 3, GDX 1; VGT→GDX 2, KRE 1; GDX→KRE 2 |
| final | KRE→VGT 31, XBI 3, XRT 1; XBI→VGT 10, KRE 2; XRT→VGT 7, XBI 4, KRE 1; VGT→XBI 3, XRT 2, KRE 1 | KRE→GDX 16, VGT 6, XBI 5, XRT 1; XBI→VGT 5, KRE 5, GDX 3; XRT→VGT 5, XBI 4, KRE 3, GDX 3; GDX→VGT 4, KRE 3, XBI 2; VGT→GDX 4, XBI 3, KRE 1 |

C pools' matrices: `results/tables/diagnostic-<window>.md`. Per-regime counts (G1–G13), days since the last funded
entry and the trading days involved are in the sealed records only (`DIAGNOSTIC.json`, `pools[*].regimes` and the
per-decision overlap records).

## 2. Realized switches under P1 (training controls; engine records)

| Window | Configuration | Executed | Declined at the decision | Aborted | Superseded | Bought in the minute of the sale | Preempted lots' net | Replacement lots' net | Hindsight: the preempted lots' own-rule continuation minus their realized net (not used) |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| fold-a | B-R1 | 1 | 3 | 0 | 0 | 1 | $177 | $9,015 | $15,913 |
| fold-a | B-R2 | 7 | 2 | 0 | 0 | 7 | $81,668 | $15,158 | $64,014 |
| fold-a | D-R1 | 24 | 3 | 1 | 0 | 22 | $163,245 | $227,122 | $21,792 |
| fold-a | D-R2 | 18 | 8 | 0 | 0 | 16 | $100,470 | $166,355 | −$10,140 |
| fold-b | B-R1 | 2 | 4 | 0 | 0 | 2 | $9,735 | $16,266 | $14,862 |
| fold-b | B-R2 | 8 | 6 | 0 | 0 | 8 | $95,115 | $26,671 | $57,807 |
| fold-b | D-R1 | 32 | 12 | 0 | 0 | 32 | $132,082 | $236,420 | n/a (a preempted trade open at the end) |
| fold-b | D-R2 | 37 | 22 | 0 | 0 | 37 | $184,970 | $222,220 | $80,570 |
| final | B-R1 | 5 | 11 | 0 | 0 | 5 | $12,872 | $21,623 | $26,355 |
| final | B-R2 | 13 | 12 | 0 | 0 | 13 | $121,807 | $62,046 | $52,257 |
| final | D-R1 | 20 | 19 | 0 | 0 | 20 | $139,059 | $175,496 | $17,267 |
| final | D-R2 | 44 | 27 | 0 | 0 | 43 | $187,931 | $224,483 | n/a |

- Every preempted lot was sold at a non-negative net by construction (the fill-time test is binding and the booked
  net equals the tested net — asserted in every run). Superseded switches did not occur in the study's
  configurations. Aborts were rare (fill-time net below $0, the replacement filling first, or a same-auction print).
- **The hindsight column shows part of the cost of switching on B5:** the lots B pre-empted would, by their own
  rules, have earned a further $15k–$64k per window. It neither equals nor bounds B's shortfall against A ($13.6k–
  $54.0k): the gap also reflects the replacements' nets and every later funding change (path dependence).
  (Descriptive only; the column uses each preempted trade's later own-rule exit, which no decision ever saw.)
- **The latency assumption carries almost every switch:** the replacement was bought in the very minute of the sale in
  all but a handful of executed switches (PROTOCOL §0(f)). An implementation that must wait for the sale's fill before
  buying would see different fills.

## 3. Sensitivity to the net-breakeven boundary (P1 threshold $0 vs the frozen B250 / B500; training, 5 bps)

| Window | B-R1 P1 / B250 / B500 | B-R2 P1 / B250 / B500 | D-R1 P1 / B250 / B500 | D-R2 P1 / B250 / B500 |
|---|---|---|---|---|
| fold-a | $123,702 / $134,420 / $134,420 | $128,332 (all three) | $344,192 / $324,564 / $324,564 | $303,618 / $289,844 / $304,295 |
| fold-b | $194,164 / $204,883 / $204,883 | $203,869 (all three) | $434,184 / $427,095 / $423,896 | $421,787 / $413,402 / $413,402 |
| final | $334,495 / $345,213 / $347,882 | $354,960 (all three) | $543,069 / $530,055 / $505,737 | $431,110 / $418,433 / $358,209 |

A larger buffer declines the marginal switches, and a different set of switches then executes (B-R1's executed
count is unchanged: 1, 2 and 5). B-R1 ends $10.7k–$13.4k higher with a buffer and B-R2 is unchanged; D mostly ends lower
(its vectors were tuned at the $0 boundary), but not uniformly (fold-a D-R2 under B500 $304,295 vs $303,618). The sensitivities were frozen in
advance and never selected; they do not change any gate. Validation-window buffers: `results/tables/
validation-<fold>.md`.

## 4. Same-minute tie resolution alone (P0R)

P0R (priority order among same-minute decisions, no preemption) produced exactly P0's result for B5 in every window
and both folds' validation: no two of B5's books ever decided in the same minute while the slot was free. The B-vs-A
difference is therefore entirely the preemption.
