# Search coverage

The bounded training search of PROTOCOL.md §5–§8 ran once, `npm run joint-16-etf-d1 -- search`, in 868 s on one core
(2026-10-25, after the protocol freeze and the passed parity matrix): Stage L 230 s, Stage D 289 s, Stages R and S the
rest. Records: `results/library/library.json`, `results/discovery/discovery.json`, `results/refine/refine.json`,
`results/robust/robust.json`; every evaluation is one JSON line in `results/discovery/evaluations.jsonl` and
`results/refine/evaluations.jsonl` (git-ignored, regenerable, sha256 in FROZEN_SELECTION.json). Tables:
[library.md](results/tables/library.md), [discovery.md](results/tables/discovery.md),
[refine.md](results/tables/refine.md), [robust.md](results/tables/robust.md). The determinism re-run of Stages L and D
in a fresh process reproduced both logs byte for byte (`results/determinism/determinism.json`).

## 1. Budgets: declared and used

| Stage | Declared | Used | Note |
|---|---|---:|---|
| L library | 1,024 Sobol vectors + the control set, the same on all 16 ETFs | 1,045 vectors × 16 = 16,720 traces | 21 controls, 0 duplicates; no vector pruned |
| D greedy paths | 16 paths, ≤ 368 evaluations each | 2,021 | every path stopped when no addition added ≥ $5,000 |
| D islands | 8 × 3,072 unique evaluations | 24,576 | every island used its full budget (50–51 generations); 6 migrations moved 188 genomes |
| D total | ≥ 25,000 | **26,597** | 1,301 cache hits not counted; 23,465 behaviourally distinct |
| R refinement | ≤ 6 contenders × 2,500 | 9,916 | 5 of 6 stopped when a full cycle accepted nothing; c2 used its 2,500 |
| S robustness | ≤ 20 shortlisted + B1/B4/B5 | 20 + 3 batteries | 48 joint perturbations, ≤ 32 probes per member, exclusions, 3 tie orders, full engine fixed and portfolio, B5 ladder |
| Whole search | — | **36,513 unique configurations** | 33,329 behaviourally distinct; 46,011 traces built, 140,143 trace cache hits, 57,806 replays |

Nothing was downscaled, raised or extended after a result was seen. The measured cost was ≈ 11 ms per discovery
evaluation (cached traces), far below the protocol's estimate.

## 2. All 16 ETFs: symmetric exploration

Every ETF received the same 1,045 library vectors (1,024 Sobol + 21 controls). Activity of those vectors on training
(counts only; standalone P&L was recorded as a diagnostic and never read by the search):

| ETF | Inert vectors (no training trade) | Vectors with closed trades in ≥ 3 years | Median virtual trades | Signals over the library |
|---|---:|---:|---:|---:|
| EWZ | 0 | 1,031 | 41 | 48,276 |
| GDX | 0 | 965 | 42 | 47,827 |
| GLD | **526** | 372 | 0 | 5,132 |
| IWM | 0 | 812 | 17 | 21,505 |
| IWN | 0 | 715 | 16 | 21,978 |
| KRE | 0 | 994 | 36 | 41,651 |
| TLT | 131 | 618 | 10 | 13,717 |
| VGT | 0 | 804 | 16 | 18,737 |
| VOOG | 0 | 670 | 13 | 15,372 |
| XBI | 0 | 1,030 | 40 | 47,412 |
| XLE | 0 | 1,017 | 31 | 37,950 |
| XLF | 0 | 743 | 16 | 19,432 |
| XLU | 0 | 550 | 8 | 13,087 |
| XLY | 0 | 907 | 18 | 21,091 |
| XOP | 0 | 1,045 | 60 | 69,872 |
| XRT | 0 | 981 | 32 | 36,777 |

GLD's training declines rarely reach the deeper X thresholds, so half its vectors never trade (a fact of the data,
not a gate). VOOG fills are quick in the model: over its 15,372 library fills, 43 carried overnight and the
same-session decision-to-fill delay was 0 minutes at the median, 1 at p90, 5 at p99 and 17 at most (XBI: 1 at most) —
the VOOG caveat is thin volume (DATA_AND_ENGINE_AUDIT.md §3), not stale fills.

**Membership coverage of the whole search** (appearances in evaluated subsets; feasible = minute drawdown@5 ≤ $35,000;
"library vectors" counts distinct library vectors used in that ETF's appearances, the rest of the distinct vectors were
produced by mutation, crossover or refinement):

| ETF | Appearances | Feasible | On the Pareto front | Distinct vectors | Library vectors | With a funded lot | As a singleton | Shortlisted | Nominated |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| EWZ | 2,071 | 154 | 0 | 817 | 611 | 2,050 | 80 | 0 | 0 |
| GDX | 16,642 | 10,663 | 69 | 3,612 | 557 | 16,479 | 752 | 19 | 0 |
| GLD | 10,972 | 7,751 | 2,670 | 5,899 | 799 | 3,784 | 3,899 | 4 | 0 |
| IWM | 5,822 | 2,758 | 3 | 1,284 | 590 | 5,351 | 194 | 4 | 0 |
| IWN | 6,757 | 3,808 | 5 | 1,258 | 553 | 6,284 | 108 | 5 | 0 |
| KRE | 10,852 | 6,862 | 72 | 1,721 | 561 | 10,753 | 401 | 14 | 0 |
| TLT | 7,928 | 4,818 | 293 | 2,569 | 658 | 5,504 | 1,004 | 3 | 0 |
| VGT | 7,705 | 4,448 | 19 | 2,085 | 598 | 7,025 | 476 | 4 | 0 |
| VOOG | 7,650 | 4,204 | 11 | 2,154 | 630 | 6,993 | 627 | 3 | 0 |
| XBI | 14,327 | 9,608 | 73 | 2,080 | 530 | 14,224 | 369 | 14 | 0 |
| XLE | 3,489 | 939 | 1 | 1,067 | 633 | 3,356 | 88 | 1 | 0 |
| XLF | 7,455 | 4,281 | 29 | 2,311 | 641 | 6,917 | 527 | 5 | 0 |
| XLU | 3,591 | 1,640 | 18 | 1,440 | 620 | 2,588 | 378 | 3 | 0 |
| XLY | 7,090 | 4,009 | 16 | 1,897 | 617 | 6,701 | 454 | 5 | 0 |
| XOP | 4,437 | 1,719 | 0 | 890 | 586 | 4,434 | 80 | 2 | 0 |
| XRT | 12,029 | 7,718 | 43 | 1,937 | 527 | 11,791 | 161 | 12 | 0 |

Every ETF was a member of ≥ 2,071 evaluated subsets with ≥ 527 distinct library vectors, and 15 of 16 reached the
shortlist. **This is broad exploration, not full joint optimization of every ETF:** the islands' selection pressure
moved the budget toward the members that raised the pooled training net (GDX, XBI, XRT, KRE), and EWZ, XLE and XOP —
whose drawdowns made most of their subsets infeasible (EWZ 154 feasible of 2,071) — were explored mostly as
infeasible or dominated additions. GLD's 2,670 Pareto-front appearances are its inert, zero-drawdown vectors (a
zero-trade book is trivially non-dominated on drawdown); 10.5% of discovery evaluations funded no lot at all, and the
islands' final populations held 2–8 such genomes each — a measurable but small dilution of the search.

## 3. Cardinalities and starting diversity

| Books | Evaluated | Feasible | | Books | Evaluated | Feasible |
|---:|---:|---:|---|---:|---:|---:|
| 1 | 9,598 | 7,589 | | 9 | 1,580 | 973 |
| 2 | 7,504 | 4,225 | | 10 | 1,096 | 694 |
| 3 | 4,381 | 2,537 | | 11 | 207 | 35 |
| 4 | 5,389 | 3,855 | | 12 | 141 | **0** |
| 5 | 3,368 | 2,125 | | 13 | 153 | **0** |
| 6 | 2,225 | 1,415 | | 14 | 113 | **0** |
| 7 | 413 | 119 | | 15 | 65 | **0** |
| 8 | 218 | 35 | | 16 | 62 | **0** |

Every cardinality 1–16 was evaluated; **no subset of 12 or more books met the $35,000 fixed-pool drawdown
constraint**, and only 35 of 207 eleven-book subsets did. With one lot at a time, a broad pool is almost always occupied
by whichever book signals first; adding books adds mediocre and losing lots and blocks good ones, so broad subsets
were structurally dominated, not merely unexplored. Most refinement-era 9–10-book evaluations come from contender c2.

Initial populations (outcome-independent): I1/I2 uniform 1–16 (16 distinct cardinalities each), I3 1–3, I4 4–8, I5
10–16 (median 14), I6 16 singletons × 4 vectors, I7 the 16 greedy paths' genomes (1–14 books) plus uniform fill, I8 the
three benchmarks and 29 one-move mutants plus 32 uniform genomes (15 cardinalities). By the end, all eight populations
had moved to small subsets (median 1–2 books, maxima 4–9) because the third objective rewards fewer books and the
largest feasible nets were found at 4–5 books.

## 4. Operators and joint moves

Discovery children by operator: paramOne 10,349; add 5,954; reset 2,480; swap 2,286; paramMulti (2–3 members jointly)
2,111; remove 1,413; crossover only 1,412 (plus 592 initial and greedy-start evaluations; crossover with SBX on shared
members preceded most children). Refinement: 3,364 membership-pass, 5,372 coordinate-pass and 1,180 joint-pass
(2–3 members at once) evaluations; 92 accepted moves (12 membership, 77 coordinate, 3 joint — table in refine.md),
5 of which changed more than one member (swaps and joint moves). Joint moves rarely improved anything, consistent with §6 of
JOINT_SEARCH_RESULTS.md: the training landscape is rough, so random multi-member moves away from a found peak are almost
always worse.

## 5. Where the best training configurations came from

- Best Q (= net − $5,000 × books) by source: refinement of c1 $447,855 (XBI XRT KRE GDX); I8 (benchmark-seeded)
  $422,365 and **I1 (uniform random start) $416,740 — the same four ETFs**; I2 $391,819 (+IWN); I3 $275,690; I7
  $252,127; I4 $226,402; I6 $180,487; I5 (broad start) $168,060; greedy paths $147,803.
- Two unanchored islands (I1, I2) and the benchmark-seeded island (I8) converged to the same membership core
  {XBI, XRT, KRE, GDX}, without VGT. The greedy paths, adding one book at a time with three random vectors, never reached
  it: the profitable members only pay together with suitable vectors (e.g. KRE alone: $8,147 in its greedy start).
- **Dependence on inspected vectors.** The frozen KRE `lowDd` vector (a library control) is a member, on KRE, of the best
  configuration of every leading source, including I1's; 68% of the top 1,000 discovery configurations contain at
  least one control vector on its own source symbol, and the other members of the leaders are close neighbours of the
  frozen XBI/XRT `lowDd` and GDX `portfolioAware` vectors. The search largely rediscovered earlier studies' training
  optima — vectors that were themselves selected on the same training data, and whose 2024–2026 results were inspected.

## 6. Multiple comparisons and the rolling-origin diagnostic

- 23,602 of the 36,513 configurations were feasible; **2,026 had a higher training net than B5 ($388,489) and 1,092 beat
  it by $25,000 or more** (131 of them found by discovery, the rest by refinement's local moves around the leaders).
  The best training net, $467,855, is the maximum of tens of thousands of correlated trials: its excess over B5 is
  expected even if no configuration were better out of sample.
- Rolling origin (not a gate, `robust.json` `rollingOrigin`): over the 16,050 feasible discovery configurations the rank
  correlation of F1 net with F2 + F3 net is 0.61 and of F1 + F2 net with F3 net 0.71; the top 1% by F1 + F2 has median
  F3 $145,022 against an archive median of $7,051. This **overstates** forward persistence: the archive was generated by
  a search that rewarded the full-training net (including F3) and is dominated by activity level (more trading lots
  in all folds), so it measures "busy configurations stay busy", not out-of-sample skill. It is reported, not relied on.
- The tie-order sensitivity was negligible for the leaders (0–1 contested same-minute grants; at most $62k change when a
  contested grant flips, for R5 under reverse alphabetical order, $7k for R1).
