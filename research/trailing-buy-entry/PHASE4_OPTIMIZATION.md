# Phase 4: full-parameter optimization per entry family

**Result: optimizing every strategy number finds large in-sample gains for all three families, and none of them survives out of sample.** Under an identical budget, the walk-forward picks of the optimized legacy (immediate) family keep −$6k … $39k of B0's $84k validation profit. The optimized fixed-trailing family loses −$39k … −$25k, the optimized ATR-trailing family −$17k … −$9k. Both trailing families also fail against the optimized legacy family, so whatever the optimizer finds, the trailing mechanism adds nothing on top of re-tuning the original. Holdout results for the frozen picks and shortlists are in VALIDATION_ROBUSTNESS.md; they confirm this.

## Optimizer

| Item | Setting |
|---|---|
| Families | legacy (7 parameters: L, X, stop, hold, material loss, lower re-entry, retrace), fixed trailing (+Y: 8), ATR snapshot trailing (+K, N: 9). The ATR family entered by the Phase 3 continuation test. |
| Domains (frozen in PROTOCOL.md §6) | L 45–180 sessions; X 7.0–20.0%; Y 0.5–8.0%; K 0.5–4.0; N 5–30; stop 4.0–12.0%; hold 5–30 calendar days; material loss 0.5–3.0%; lower re-entry 0.5–6.0%; retrace 20.0–70.0%. B0 and B0c are on every grid. |
| Quantization | percentages and K in 0.1 steps, integers otherwise. Genomes are integer grid indices end to end (generation, SBX, mutation, evaluation, cache, output); a test checks that every evaluated candidate is exactly on the grid. |
| Objectives | minimize −net / $100k and max MTM drawdown / $100k on the training window (Pareto, never a weighted score) |
| Constraint | entries ≥ ceil(calendar years) (4 for WF1 … 9 for FINAL), via constrained domination |
| Initial sample | 4,096 unique quantized points of a scrambled Sobol sequence (Joe–Kuo directions, Matoušek scramble; `src/optimizer/sobol.ts`) + anchors (legacy: B0, B0c; fixed: B0 exits with X 10% / Y 3%; ATR: B0 exits with X 10% / K 2.0 / N 14) |
| Evolution | 2 independent NSGA-II runs × 100 generations × population 128, SBX η 15 / p 0.9, polynomial mutation η 20 / p 1/dims, binary crowded tournaments, (μ+λ) elitism, no early stopping (operators: `src/optimizer/nsga2.ts`, unchanged) |
| Budget | nominal 29,697–29,698 simulations per family and fold, identical across families; actual ≈ 29,300–29,600 after duplicate removal, plus ≈ 1,000–1,700 neighbourhood simulations for selection |
| Seeds | `trailing-buy-entry|v1|<family>|<fold>|<sampler>` through SHA-256 (`src/optimizer/rng.ts`) |
| Cache | keyed by dataset hash, fold, run options and the full parameter vector (which includes the family) |
| Execution | worker threads (8 by default); results returned in request order. The whole development pipeline gives byte-identical files on 3 and 8 workers, and a test compares in-process, 1 and 3 workers. |
| Selection | PROTOCOL.md §7: pool = the first non-dominated fronts of the feasible archive (≥ 64 distinct strategies, ≤ 256), one-step neighbourhoods (percentages and K ±0.3, L ±5, hold ±2 days, N ±2), robust net = P25, robust drawdown = P75, picks profit / balanced / lowDD on the robust front, up to 10 shortlisted |

### Amendment 2: behavioural clones in the pool

The first Phase 4 run built the selection pool from the first Pareto fronts without removing **behavioural clones**: genomes that differ only in parameters that never bind and therefore trade identically. NSGA-II converges onto such clusters, and exact duplicates share front 0. For the legacy and ATR families all 256 pool slots were filled by one strategy, so the robust selection saw a single candidate (front of 1, profit = balanced = lowDD). This was found while writing the first freeze, before any holdout run. The pool now keeps one member per identical training trade list (PROTOCOL.md Amendment 2; a test covers it). The search itself (archives, budgets, hypervolumes) is unchanged; only the selection changed. The superseded freeze is in `results/freeze/superseded/`, and the as-run results in `results/as-run-before-amendment-2/`. Both versions:

| Family | Pick | As run (before Amendment 2): Σ net / worst DD | Corrected (primary): Σ net / worst DD |
|---|---|---:|---:|
| B0 | – | $84,183 / $23,723 | $84,183 / $23,723 |
| Optimized legacy | profit | $39,105 / $28,084 | $32,204 / $28,084 |
| Optimized legacy | balanced | $39,105 / $28,084 | $38,953 / $28,084 |
| Optimized legacy | lowDD | $37,854 / $23,389 | −$5,934 / $21,530 |
| Optimized fixed trailing | profit | −$19,639 / $30,998 | −$39,398 / $38,078 |
| Optimized fixed trailing | balanced | −$5,949 / $30,998 | −$25,184 / $30,998 |
| Optimized fixed trailing | lowDD | −$11,385 / $26,337 | −$38,577 / $33,392 |
| Optimized ATR trailing | profit | −$35,868 / $56,678 | −$16,549 / $30,252 |
| Optimized ATR trailing | balanced | −$20,185 / $44,481 | −$16,086 / $28,278 |
| Optimized ATR trailing | lowDD | −$12,442 / $44,481 | −$9,187 / $17,742 |

Every pick fails against B0 in both versions. The correction changes which candidates are picked, not the verdict.

## Search budgets and coverage

| Family | Fold | Sampler | Unique initial | GA new evaluations | Simulations | Neighbourhood sims | Feasible | Initial hypervolume | Final GA hypervolume (run 1 / 2) |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Legacy | WF1 | Sobol | 4,096 | 12,633 + 12,632 | 29,363 | 995 | 22,300 | 0.5695 | 0.6084 / 0.6172 |
| Fixed | WF1 | Sobol | 4,096 | 12,690 + 12,708 | 29,495 | 1,072 | 25,235 | 0.5129 | 0.5541 / 0.5542 |
| ATR | WF1 | Sobol | 4,096 | 12,725 + 12,712 | 29,534 | 1,704 | 24,371 | 0.5271 | 0.5584 / 0.5584 |
| Legacy | WF2 | Sobol | 4,096 | 12,607 + 12,612 | 29,317 | 998 | 24,453 | 0.9303 | 1.0652 / 1.0652 |
| Fixed | WF2 | Sobol | 4,096 | 12,716 + 12,674 | 29,487 | 1,181 | 23,753 | 0.7067 | 0.8505 / 0.8533 |
| ATR | WF2 | Sobol | 4,096 | 12,749 + 12,766 | 29,612 | 1,575 | 24,862 | 0.7103 | 0.8540 / 0.8507 |
| Legacy | WF3 | Sobol | 4,096 | 12,584 + 12,643 | 29,325 | 1,158 | 26,776 | 1.3886 | 1.5516 / 1.5496 |
| Fixed | WF3 | Sobol | 4,096 | 12,757 + 12,736 | 29,590 | 1,281 | 23,846 | 0.9670 | 1.1218 / 1.1147 |
| ATR | WF3 | Sobol | 4,096 | 12,768 + 12,737 | 29,602 | 1,269 | 26,049 | 1.0248 | 1.1695 / 1.1701 |
| Legacy | FINAL | Sobol | 4,096 | 12,711 + 12,542 | 29,351 | 996 | 28,378 | 1.1857 | 1.4581 / 1.4490 |
| Fixed | FINAL | Sobol | 4,096 | 12,744 + 12,638 | 29,479 | 1,329 | 15,684 | 0.6809 | 0.8363 / 0.8231 |
| ATR | FINAL | Sobol | 4,096 | 12,705 + 12,745 | 29,547 | 1,575 | 24,853 | 0.7949 | 0.9647 / 0.9632 |
| Legacy | FINAL | random | 4,096 | 12,662 + 12,570 | 29,330 | 1,192 | 28,523 | 1.1449 | 1.4508 / 1.4576 |
| Fixed | FINAL | random | 4,096 | 12,692 + 12,700 | 29,489 | 1,292 | 22,918 | 0.7520 | 0.8990 / 0.8690 |
| ATR | FINAL | random | 4,096 | 12,695 + 12,705 | 29,497 | 1,253 | 23,941 | 0.7213 | 0.8513 / 0.8867 |

Hypervolume is measured against the reference point (net $0, drawdown $100,000) in units of $100k². **Sobol vs equal-budget random sampling** (FINAL fold, diagnostic): Sobol's initial sample covers better for legacy and ATR (1.186 vs 1.145; 0.795 vs 0.721) and worse for fixed (0.681 vs 0.752). After evolution the samplers end within a few percent of each other, with no consistent winner (legacy ≈ equal, fixed random +6%, ATR Sobol +10%). The random-sampled runs reach similar picks (legacy profit $171,002 / $25,674; fixed profit $113,312 / $32,784; ATR lowDD $63,827 / $9,828, near the Sobol ones). The training front is well explored by either method; what limits the result is out-of-sample generalization, not search coverage.

![Pareto](charts/phase4_pareto_development.svg)

## Walk-forward validation (corrected selection, continuous attribution)

| Family | Pick | WF1 2018–19 | WF2 2020–21 | WF3 2022 | Σ net | Worst DD | vs B0 | vs optimized legacy |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **B0** | – | $31,701 / $23,723 | $57,240 / $15,660 | −$4,758 / $21,887 | **$84,183** | **$23,723** | – | – |
| Optimized legacy | profit | $41,930 / $16,477 | $13,360 / $28,084 | −$23,086 / $24,089 | $32,204 | $28,084 | Fails | – |
| Optimized legacy | balanced | $41,930 / $16,477 | $13,360 / $28,084 | −$16,338 / $21,882 | $38,953 | $28,084 | Fails | – |
| Optimized legacy | lowDD | −$1,263 / $13,077 | $7,914 / $21,530 | −$12,585 / $21,418 | −$5,934 | $21,530 | Fails | – |
| Optimized fixed trailing | profit | $9,393 / $28,278 | −$11,703 / $30,998 | −$37,087 / $38,078 | −$39,398 | $38,078 | Fails | Fails |
| Optimized fixed trailing | balanced | $9,393 / $28,278 | −$11,703 / $30,998 | −$22,873 / $28,477 | −$25,184 | $30,998 | Fails | Fails |
| Optimized fixed trailing | lowDD | $16,130 / $4,645 | −$30,018 / $32,527 | −$24,690 / $33,392 | −$38,577 | $33,392 | Fails | Fails |
| Optimized ATR trailing | profit | $17,901 / $28,278 | −$8,300 / $25,176 | −$26,150 / $30,252 | −$16,549 | $30,252 | Fails | Fails |
| Optimized ATR trailing | balanced | $17,901 / $28,278 | −$8,300 / $25,176 | −$25,688 / $28,088 | −$16,086 | $28,278 | Fails | Fails |
| Optimized ATR trailing | lowDD | $5,281 / $6,011 | −$11,123 / $17,742 | −$3,345 / $14,842 | −$9,187 | $17,742 | Fails | Fails |

**The in-sample / out-of-sample gap.** On WF1's 2014–2017 training window, where B0 made −$5,405, the optimizer found legacy settings with $66,317 / $12,438 and fixed-trailing ones with $59,966 / $12,856. Their 2018–2019 validation gave $41,930 and $9,393 against B0's $31,701. On the FINAL (2014–2022) window the legacy pick reaches $173,575 / $25,674 against B0's $78,778 / $23,723. That is a 2.2× improvement in sample, and the corresponding fold picks lose half of B0's profit out of sample.

**Shortlist generalization.** The 10 shortlisted candidates of each training fold, scored on that fold's validation window:

| Family | Fold | Net ≥ B0 | DD ≤ B0 | Dominant or risk trade-off vs B0 | Validation net range | B0 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Legacy | WF1 | 7 / 10 | 10 / 10 | 7 / 10 | −$1,263 … $49,355 | $31,701 |
| Legacy | WF2 | 0 / 10 | 4 / 10 | 0 / 10 | $503 … $23,277 | $57,240 |
| Legacy | WF3 | 4 / 10 | 9 / 10 | 3 / 10 | −$23,086 … $5,696 | −$4,758 |
| Fixed | WF1 | 0 / 10 | 7 / 10 | 0 / 10 | −$18,105 … $24,121 | $31,701 |
| Fixed | WF2 | 0 / 10 | 0 / 10 | 0 / 10 | −$30,018 … $4,515 | $57,240 |
| Fixed | WF3 | 0 / 10 | 4 / 10 | 0 / 10 | −$37,087 … −$7,864 | −$4,758 |
| ATR | WF1 | 0 / 10 | 7 / 10 | 0 / 10 | $5,281 … $24,437 | $31,701 |
| ATR | WF2 | 0 / 10 | 3 / 10 | 0 / 10 | −$18,850 … −$574 | $57,240 |
| ATR | WF3 | 4 / 10 | 5 / 10 | 4 / 10 | −$37,524 … $1,495 | −$4,758 |

Re-tuning the original's numbers sometimes generalizes for a fold (legacy WF1: 7 of 10; the 2018–2019 window rewards the 2014–2017 optimum). It never does for the 2020–2021 window, where B0's fast re-entries around the March 2020 low are hard to beat. The fixed-trailing shortlists beat B0 in **no** fold.

## FINAL-fold candidates (training 2014-01-02 → 2022-12-30), every parameter

The frozen shortlists (Amendment 1: robust-front order, distinct behaviour; the corrected pools gave 10 distinct front-0 members per family). Training metrics; the holdout results of each are in VALIDATION_ROBUSTNESS.md §3.

| Family | # | Parameters | Training net | Training DD | Robust net (P25) | Robust DD (P75) | Entries | Pick |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Legacy | 1 | L=154 X=8.9% stop=9.5% hold=14d loss=0.6% lower=3.6% retrace=51.8% | $173,575 | $25,674 | $160,588 | $26,917 | 29 | profit |
| Legacy | 2 | L=49 X=10.2% stop=9.8% hold=9d loss=0.6% lower=3.6% retrace=69.2% | $167,752 | $25,357 | $157,587 | $25,802 | 27 | |
| Legacy | 3 | L=47 X=9.1% stop=8.4% hold=14d loss=0.6% lower=3.5% retrace=69.7% | $159,071 | $21,714 | $154,102 | $23,314 | 31 | balanced |
| Legacy | 4 | L=158 X=9.0% stop=6.5% hold=14d loss=0.7% lower=3.6% retrace=57.1% | $154,941 | $20,320 | $145,549 | $20,320 | 39 | |
| Legacy | 5 | L=173 X=8.9% stop=6.5% hold=14d loss=0.6% lower=3.6% retrace=54.8% | $153,776 | $20,236 | $144,384 | $20,278 | 39 | |
| Legacy | 6 | L=161 X=8.6% stop=4.4% hold=9d loss=0.6% lower=3.2% retrace=51.0% | $148,778 | $19,127 | $139,889 | $19,699 | 48 | |
| Legacy | 7 | L=158 X=8.6% stop=4.4% hold=9d loss=0.5% lower=4.0% retrace=52.9% | $152,293 | $19,309 | $131,723 | $19,547 | 47 | |
| Legacy | 8 | L=172 X=8.6% stop=4.4% hold=9d loss=0.6% lower=4.0% retrace=53.1% | $150,573 | $19,309 | $130,339 | $19,468 | 47 | |
| Legacy | 9 | L=180 X=8.5% stop=4.4% hold=9d loss=0.5% lower=4.0% retrace=69.2% | $152,305 | $19,309 | $130,142 | $19,309 | 48 | |
| Legacy | 10 | L=168 X=8.4% stop=4.4% hold=14d loss=1.0% lower=3.5% retrace=50.9% | $127,950 | $16,947 | $122,501 | $18,354 | 44 | |
| Legacy | lowDD | L=70 X=20.0% stop=5.1% hold=16d loss=1.1% lower=3.8% retrace=46.3% | $79,369 | $13,421 | $76,700 | $13,421 | 12 | lowDD |
| Fixed | 1 | L=61 X=15.8% Y=0.6% stop=8.0% hold=21d loss=1.9% lower=0.6% retrace=36.7% | $104,786 | $29,728 | $101,090 | $29,728 | 12 | profit |
| Fixed | 2 | L=98 X=16.1% Y=0.5% stop=8.0% hold=21d loss=1.9% lower=0.6% retrace=43.2% | $93,553 | $29,274 | $90,108 | $29,387 | 13 | |
| Fixed | 3 | L=178 X=8.6% Y=0.5% stop=4.4% hold=17d loss=1.0% lower=0.7% retrace=45.9% | $91,303 | $24,640 | $86,550 | $24,640 | 40 | |
| Fixed | 4 | L=165 X=8.6% Y=0.5% stop=4.4% hold=7d loss=0.9% lower=4.0% retrace=59.7% | $83,892 | $22,412 | $74,261 | $22,473 | 42 | balanced, lowDD |
| Fixed | 5 | L=125 X=7.2% Y=7.3% stop=4.4% hold=13d loss=1.8% lower=1.1% retrace=38.8% | $48,638 | $20,164 | $44,644 | $21,253 | 25 | |
| Fixed | 6 | L=98 X=7.3% Y=7.3% stop=4.4% hold=14d loss=0.8% lower=0.8% retrace=40.3% | $45,440 | $20,164 | $44,624 | $20,164 | 24 | |
| Fixed | 7 | L=83 X=7.3% Y=7.3% stop=4.3% hold=12d loss=1.4% lower=1.2% retrace=36.4% | $22,130 | $20,044 | $20,280 | $20,044 | 24 | |
| Fixed | 8 | L=176 X=7.8% Y=7.1% stop=4.5% hold=7d loss=2.0% lower=2.6% retrace=22.3% | $22,305 | $18,856 | $18,860 | $19,536 | 25 | |
| Fixed | 9 | L=145 X=8.7% Y=7.1% stop=4.5% hold=7d loss=1.3% lower=4.7% retrace=22.1% | $21,078 | $18,528 | $18,332 | $19,365 | 23 | |
| Fixed | 10 | L=155 X=8.9% Y=7.1% stop=4.5% hold=7d loss=2.1% lower=5.0% retrace=24.0% | $22,336 | $18,528 | $17,524 | $18,646 | 23 | |
| ATR | 1 | L=87 X=7.0% K=0.5 N=23 stop=9.5% hold=18d loss=1.0% lower=3.5% retrace=63.8% | $109,068 | $36,728 | $105,596 | $36,728 | 24 | profit |
| ATR | 2 | L=168 X=7.9% K=0.5 N=23 stop=8.3% hold=18d loss=1.7% lower=5.4% retrace=68.4% | $106,953 | $33,131 | $103,016 | $33,131 | 25 | |
| ATR | 3 | L=56 X=7.9% K=0.5 N=29 stop=8.0% hold=18d loss=1.3% lower=5.6% retrace=63.7% | $103,514 | $32,790 | $99,653 | $32,790 | 25 | |
| ATR | 4 | L=61 X=16.0% K=0.6 N=27 stop=8.0% hold=21d loss=1.8% lower=3.7% retrace=66.4% | $97,715 | $29,728 | $93,702 | $29,728 | 10 | |
| ATR | 5 | L=53 X=7.0% K=3.5 N=22 stop=8.4% hold=15d loss=0.9% lower=4.5% retrace=46.5% | $94,268 | $22,229 | $92,596 | $22,510 | 15 | balanced |
| ATR | 6 | L=54 X=7.2% K=3.5 N=22 stop=8.4% hold=14d loss=0.7% lower=3.7% retrace=62.5% | $95,584 | $22,229 | $91,443 | $22,344 | 15 | |
| ATR | 7 | L=86 X=7.1% K=3.6 N=27 stop=8.4% hold=15d loss=1.3% lower=0.6% retrace=21.3% | $92,510 | $22,214 | $89,833 | $22,308 | 15 | |
| ATR | 8 | L=90 X=7.0% K=3.6 N=28 stop=8.4% hold=14d loss=1.3% lower=0.6% retrace=20.3% | $91,964 | $22,214 | $89,228 | $22,214 | 16 | |
| ATR | 9 | L=99 X=7.1% K=3.7 N=25 stop=5.8% hold=11d loss=0.7% lower=3.2% retrace=67.5% | $91,035 | $13,114 | $83,064 | $13,754 | 19 | |
| ATR | 10 | L=95 X=7.0% K=3.7 N=25 stop=5.8% hold=11d loss=0.5% lower=0.7% retrace=46.7% | $91,320 | $11,317 | $80,353 | $12,228 | 18 | |
| ATR | lowDD | L=48 X=7.1% K=4.0 N=30 stop=5.7% hold=7d loss=0.6% lower=3.5% retrace=64.0% | $65,531 | $9,828 | $61,213 | $9,828 | 17 | lowDD |

The ten rows per family are the frozen Amendment-1 shortlists; the separate lowDD rows are the picks that fell outside them. The shortlists show what the optimizer likes on 2014–2022: shallower activation (X ≈ 7–9%), longer lookbacks or very short ones, a looser material-loss threshold (0.5–0.7%) with a 3.5–4% re-entry discount, a 50–70% retrace, and for low drawdown a tight 4.4–5.8% stop with a 7–11-day loss exit. In the trailing families, the high-net members use the smallest rebound the grid allows (Y = 0.5%, K = 0.5), i.e. they turn the trailing buy back into an almost-immediate one.

Sparse candidates: the legacy lowDD pick (X = 20%) has 12 training entries (minimum 9) and the fixed profit pick (X = 15.8%) 12. Both bought only once in the 3¾-year holdout. They look safe because they barely trade.

## Conclusion

With the exit and re-entry coefficients free as well, the optimizer improves every family's training results 1.2–2.2×, and the trailing families gain mainly by shrinking the rebound towards zero. Out of sample no family beats B0, and the trailing families do worse than simply re-tuning the immediate entry.
