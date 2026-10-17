## Walk-forward validation of the Phase 4 picks (continuous attribution)

| Family | Pick | WF1 net / DD | WF2 net / DD | WF3 net / DD | Σ net | Worst DD | Class vs B0 | Class vs optimized legacy (same pick) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| B0 | – | $31,701 / $23,723 | $57,240 / $15,660 | −$4,758 / $21,887 | $84,183 | $23,723 | – | – |
| Optimized legacy | profit | $38,187 / $16,166 | $13,360 / $28,084 | −$12,442 / $21,438 | $39,105 | $28,084 | Fails | – |
| Optimized legacy | balanced | $38,187 / $16,166 | $13,360 / $28,084 | −$12,442 / $21,438 | $39,105 | $28,084 | Fails | – |
| Optimized legacy | lowDD | $27,019 / $20,791 | $23,277 / $23,389 | −$12,442 / $21,438 | $37,854 | $23,389 | Fails | – |
| Optimized fixed trailing | profit | $18,431 / $17,100 | −$9,152 / $30,998 | −$28,918 / $29,909 | −$19,639 | $30,998 | Fails | Fails |
| Optimized fixed trailing | balanced | $18,431 / $17,100 | −$9,152 / $30,998 | −$15,228 / $20,832 | −$5,949 | $30,998 | Fails | Fails |
| Optimized fixed trailing | lowDD | $18,431 / $17,100 | −$14,588 / $26,337 | −$15,228 / $20,832 | −$11,385 | $26,337 | Fails | Fails |
| Optimized ATR trailing | profit | $26,939 / $17,100 | −$9,601 / $31,835 | −$53,207 / $56,678 | −$35,868 | $56,678 | Fails | Fails |
| Optimized ATR trailing | balanced | $26,939 / $17,100 | −$9,601 / $31,835 | −$37,524 / $44,481 | −$20,185 | $44,481 | Fails | Fails |
| Optimized ATR trailing | lowDD | $26,939 / $17,100 | −$1,857 / $25,781 | −$37,524 / $44,481 | −$12,442 | $44,481 | Fails | Fails |

## Shortlist generalization: the 10 shortlisted candidates of each training fold, scored on that fold’s validation window

| Family | Fold | Shortlisted | Net ≥ B0 | DD ≤ B0 | Dominant or risk trade-off vs B0 | Validation net range | B0 validation net |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Optimized legacy | WF1 | 4 | 1 | 4 | 1 | $25,314 … $38,187 | $31,701 |
| Optimized legacy | WF2 | 2 | 0 | 0 | 0 | $13,360 … $23,277 | $57,240 |
| Optimized legacy | WF3 | 1 | 0 | 1 | 0 | −$12,442 … −$12,442 | −$4,758 |
| Optimized fixed trailing | WF1 | 1 | 0 | 1 | 0 | $18,431 … $18,431 | $31,701 |
| Optimized fixed trailing | WF2 | 6 | 0 | 0 | 0 | −$18,914 … −$3,698 | $57,240 |
| Optimized fixed trailing | WF3 | 4 | 0 | 1 | 0 | −$28,918 … −$15,023 | −$4,758 |
| Optimized ATR trailing | WF1 | 1 | 0 | 1 | 0 | $26,939 … $26,939 | $31,701 |
| Optimized ATR trailing | WF2 | 6 | 0 | 0 | 0 | −$24,808 … −$1,857 | $57,240 |
| Optimized ATR trailing | WF3 | 4 | 0 | 0 | 0 | −$57,716 … −$36,576 | −$4,758 |

## Search budgets and coverage

| Family | Fold | Sampler | Unique initial | GA new evaluations | Simulations (search) | Neighbourhood simulations | Nominal budget | Feasible (net > 0, min. activity) | Initial hypervolume | Final GA hypervolume |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Optimized legacy | WF1 | sobol | 4096 | 12633 + 12632 | 29363 | 3479 | 29698 | 22300 | 0.5695 | 0.6084 / 0.6172 |
| Optimized fixed trailing | WF1 | sobol | 4096 | 12690 + 12708 | 29495 | 4003 | 29697 | 25235 | 0.5129 | 0.5541 / 0.5542 |
| Optimized ATR trailing | WF1 | sobol | 4096 | 12725 + 12712 | 29534 | 4440 | 29697 | 24371 | 0.5271 | 0.5584 / 0.5584 |
| Optimized legacy | WF2 | sobol | 4096 | 12607 + 12612 | 29317 | 3426 | 29698 | 24453 | 0.9303 | 1.0652 / 1.0652 |
| Optimized fixed trailing | WF2 | sobol | 4096 | 12716 + 12674 | 29487 | 3866 | 29697 | 23753 | 0.7067 | 0.8505 / 0.8533 |
| Optimized ATR trailing | WF2 | sobol | 4096 | 12749 + 12766 | 29612 | 4506 | 29697 | 24862 | 0.7103 | 0.8540 / 0.8507 |
| Optimized legacy | WF3 | sobol | 4096 | 12584 + 12643 | 29325 | 3283 | 29698 | 26776 | 1.3886 | 1.5516 / 1.5496 |
| Optimized fixed trailing | WF3 | sobol | 4096 | 12757 + 12736 | 29590 | 3943 | 29697 | 23846 | 0.9670 | 1.1218 / 1.1147 |
| Optimized ATR trailing | WF3 | sobol | 4096 | 12768 + 12737 | 29602 | 4198 | 29697 | 26049 | 1.0248 | 1.1695 / 1.1701 |
| Optimized legacy | FINAL | sobol | 4096 | 12711 + 12542 | 29351 | 3391 | 29698 | 28378 | 1.1857 | 1.4581 / 1.4490 |
| Optimized fixed trailing | FINAL | sobol | 4096 | 12744 + 12638 | 29479 | 3890 | 29697 | 15684 | 0.6809 | 0.8363 / 0.8231 |
| Optimized ATR trailing | FINAL | sobol | 4096 | 12705 + 12745 | 29547 | 4105 | 29697 | 24853 | 0.7949 | 0.9647 / 0.9632 |
| Optimized legacy | FINAL | random | 4096 | 12662 + 12570 | 29330 | 3360 | 29698 | 28523 | 1.1449 | 1.4508 / 1.4576 |
| Optimized fixed trailing | FINAL | random | 4096 | 12692 + 12700 | 29489 | 3920 | 29697 | 22918 | 0.7520 | 0.8990 / 0.8690 |
| Optimized ATR trailing | FINAL | random | 4096 | 12695 + 12705 | 29497 | 4464 | 29697 | 23941 | 0.7213 | 0.8513 / 0.8867 |

## FINAL fold (development training) shortlists, every parameter

| Family | # | Parameters | Training net | Training DD | Robust net (P25) | Robust DD (P75) | Entries | Pick |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Optimized legacy | 1 | legacy L=52 X=8.9% stop=9.5% hold=14d loss=0.6% lower=3.5% retrace=49.2% | $173,575 | $25,674 | $162,704 | $25,674 | 29 | profit, balanced, lowDD |
| Optimized fixed trailing | 1 | fixed L=60 X=15.5% Y=0.5% stop=8.0% hold=21d loss=1.9% lower=0.6% retrace=52.0% | $105,361 | $29,728 | $104,545 | $29,728 | 12 | profit |
| Optimized fixed trailing | 2 | fixed L=179 X=8.6% Y=0.5% stop=4.4% hold=17d loss=1.3% lower=3.7% retrace=39.7% | $95,066 | $24,640 | $85,457 | $24,847 | 38 |  |
| Optimized fixed trailing | 3 | fixed L=165 X=8.6% Y=0.5% stop=4.4% hold=7d loss=0.9% lower=4.0% retrace=59.7% | $83,892 | $22,412 | $74,261 | $22,473 | 42 | balanced, lowDD |
| Optimized fixed trailing | 4 | fixed L=118 X=7.3% Y=7.3% stop=4.5% hold=13d loss=2.1% lower=1.0% retrace=54.8% | $49,569 | $20,284 | $44,986 | $20,284 | 25 |  |
| Optimized ATR trailing | 1 | atrSnapshot L=64 X=7.1% K=0.5 N=21 stop=9.5% hold=18d loss=1.2% lower=3.8% retrace=67.5% | $109,068 | $36,728 | $106,639 | $36,728 | 24 | profit, balanced, lowDD |
