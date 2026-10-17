## Walk-forward validation of the Phase 4 picks (continuous attribution)

| Family | Pick | WF1 net / DD | WF2 net / DD | WF3 net / DD | Σ net | Worst DD | Class vs B0 | Class vs optimized legacy (same pick) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| B0 | – | $31,701 / $23,723 | $57,240 / $15,660 | −$4,758 / $21,887 | $84,183 | $23,723 | – | – |
| Optimized legacy | profit | $41,930 / $16,477 | $13,360 / $28,084 | −$23,086 / $24,089 | $32,204 | $28,084 | Fails | – |
| Optimized legacy | balanced | $41,930 / $16,477 | $13,360 / $28,084 | −$16,338 / $21,882 | $38,953 | $28,084 | Fails | – |
| Optimized legacy | lowDD | −$1,263 / $13,077 | $7,914 / $21,530 | −$12,585 / $21,418 | −$5,934 | $21,530 | Fails | – |
| Optimized fixed trailing | profit | $9,393 / $28,278 | −$11,703 / $30,998 | −$37,087 / $38,078 | −$39,398 | $38,078 | Fails | Fails |
| Optimized fixed trailing | balanced | $9,393 / $28,278 | −$11,703 / $30,998 | −$22,873 / $28,477 | −$25,184 | $30,998 | Fails | Fails |
| Optimized fixed trailing | lowDD | $16,130 / $4,645 | −$30,018 / $32,527 | −$24,690 / $33,392 | −$38,577 | $33,392 | Fails | Fails |
| Optimized ATR trailing | profit | $17,901 / $28,278 | −$8,300 / $25,176 | −$26,150 / $30,252 | −$16,549 | $30,252 | Fails | Fails |
| Optimized ATR trailing | balanced | $17,901 / $28,278 | −$8,300 / $25,176 | −$25,688 / $28,088 | −$16,086 | $28,278 | Fails | Fails |
| Optimized ATR trailing | lowDD | $5,281 / $6,011 | −$11,123 / $17,742 | −$3,345 / $14,842 | −$9,187 | $17,742 | Fails | Fails |

## Shortlist generalization: the 10 shortlisted candidates of each training fold, scored on that fold’s validation window

| Family | Fold | Shortlisted | Net ≥ B0 | DD ≤ B0 | Dominant or risk trade-off vs B0 | Validation net range | B0 validation net |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Optimized legacy | WF1 | 10 | 7 | 10 | 7 | −$1,263 … $49,355 | $31,701 |
| Optimized legacy | WF2 | 10 | 0 | 4 | 0 | $503 … $23,277 | $57,240 |
| Optimized legacy | WF3 | 10 | 4 | 9 | 3 | −$23,086 … $5,696 | −$4,758 |
| Optimized fixed trailing | WF1 | 10 | 0 | 7 | 0 | −$18,105 … $24,121 | $31,701 |
| Optimized fixed trailing | WF2 | 10 | 0 | 0 | 0 | −$30,018 … $4,515 | $57,240 |
| Optimized fixed trailing | WF3 | 10 | 0 | 4 | 0 | −$37,087 … −$7,864 | −$4,758 |
| Optimized ATR trailing | WF1 | 10 | 0 | 7 | 0 | $5,281 … $24,437 | $31,701 |
| Optimized ATR trailing | WF2 | 10 | 0 | 3 | 0 | −$18,850 … −$574 | $57,240 |
| Optimized ATR trailing | WF3 | 10 | 4 | 5 | 4 | −$37,524 … $1,495 | −$4,758 |

## Search budgets and coverage

| Family | Fold | Sampler | Unique initial | GA new evaluations | Simulations (search) | Neighbourhood simulations | Nominal budget | Feasible (net > 0, min. activity) | Initial hypervolume | Final GA hypervolume |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Optimized legacy | WF1 | sobol | 4096 | 12633 + 12632 | 29363 | 995 | 29698 | 22300 | 0.5695 | 0.6084 / 0.6172 |
| Optimized fixed trailing | WF1 | sobol | 4096 | 12690 + 12708 | 29495 | 1072 | 29697 | 25235 | 0.5129 | 0.5541 / 0.5542 |
| Optimized ATR trailing | WF1 | sobol | 4096 | 12725 + 12712 | 29534 | 1704 | 29697 | 24371 | 0.5271 | 0.5584 / 0.5584 |
| Optimized legacy | WF2 | sobol | 4096 | 12607 + 12612 | 29317 | 998 | 29698 | 24453 | 0.9303 | 1.0652 / 1.0652 |
| Optimized fixed trailing | WF2 | sobol | 4096 | 12716 + 12674 | 29487 | 1181 | 29697 | 23753 | 0.7067 | 0.8505 / 0.8533 |
| Optimized ATR trailing | WF2 | sobol | 4096 | 12749 + 12766 | 29612 | 1575 | 29697 | 24862 | 0.7103 | 0.8540 / 0.8507 |
| Optimized legacy | WF3 | sobol | 4096 | 12584 + 12643 | 29325 | 1158 | 29698 | 26776 | 1.3886 | 1.5516 / 1.5496 |
| Optimized fixed trailing | WF3 | sobol | 4096 | 12757 + 12736 | 29590 | 1281 | 29697 | 23846 | 0.9670 | 1.1218 / 1.1147 |
| Optimized ATR trailing | WF3 | sobol | 4096 | 12768 + 12737 | 29602 | 1269 | 29697 | 26049 | 1.0248 | 1.1695 / 1.1701 |
| Optimized legacy | FINAL | sobol | 4096 | 12711 + 12542 | 29351 | 996 | 29698 | 28378 | 1.1857 | 1.4581 / 1.4490 |
| Optimized fixed trailing | FINAL | sobol | 4096 | 12744 + 12638 | 29479 | 1329 | 29697 | 15684 | 0.6809 | 0.8363 / 0.8231 |
| Optimized ATR trailing | FINAL | sobol | 4096 | 12705 + 12745 | 29547 | 1575 | 29697 | 24853 | 0.7949 | 0.9647 / 0.9632 |
| Optimized legacy | FINAL | random | 4096 | 12662 + 12570 | 29330 | 1192 | 29698 | 28523 | 1.1449 | 1.4508 / 1.4576 |
| Optimized fixed trailing | FINAL | random | 4096 | 12692 + 12700 | 29489 | 1292 | 29697 | 22918 | 0.7520 | 0.8990 / 0.8690 |
| Optimized ATR trailing | FINAL | random | 4096 | 12695 + 12705 | 29497 | 1253 | 29697 | 23941 | 0.7213 | 0.8513 / 0.8867 |

## FINAL fold (development training) shortlists, every parameter

| Family | # | Parameters | Training net | Training DD | Robust net (P25) | Robust DD (P75) | Entries | Pick |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Optimized legacy | 1 | legacy L=154 X=8.9% stop=9.5% hold=14d loss=0.6% lower=3.6% retrace=51.8% | $173,575 | $25,674 | $160,588 | $26,917 | 29 | profit |
| Optimized legacy | 2 | legacy L=49 X=10.2% stop=9.8% hold=9d loss=0.6% lower=3.6% retrace=69.2% | $167,752 | $25,357 | $157,587 | $25,802 | 27 |  |
| Optimized legacy | 3 | legacy L=47 X=9.1% stop=8.4% hold=14d loss=0.6% lower=3.5% retrace=69.7% | $159,071 | $21,714 | $154,102 | $23,314 | 31 | balanced |
| Optimized legacy | 4 | legacy L=158 X=9.0% stop=6.5% hold=14d loss=0.7% lower=3.6% retrace=57.1% | $154,941 | $20,320 | $145,549 | $20,320 | 39 |  |
| Optimized legacy | 5 | legacy L=173 X=8.9% stop=6.5% hold=14d loss=0.6% lower=3.6% retrace=54.8% | $153,776 | $20,236 | $144,384 | $20,278 | 39 |  |
| Optimized legacy | 6 | legacy L=161 X=8.6% stop=4.4% hold=9d loss=0.6% lower=3.2% retrace=51.0% | $148,778 | $19,127 | $139,889 | $19,699 | 48 |  |
| Optimized legacy | 7 | legacy L=158 X=8.6% stop=4.4% hold=9d loss=0.5% lower=4.0% retrace=52.9% | $152,293 | $19,309 | $131,723 | $19,547 | 47 |  |
| Optimized legacy | 8 | legacy L=172 X=8.6% stop=4.4% hold=9d loss=0.6% lower=4.0% retrace=53.1% | $150,573 | $19,309 | $130,339 | $19,468 | 47 |  |
| Optimized legacy | 9 | legacy L=180 X=8.5% stop=4.4% hold=9d loss=0.5% lower=4.0% retrace=69.2% | $152,305 | $19,309 | $130,142 | $19,309 | 48 |  |
| Optimized legacy | 10 | legacy L=70 X=20.0% stop=5.1% hold=16d loss=1.1% lower=3.8% retrace=46.3% | $79,369 | $13,421 | $76,700 | $13,421 | 12 | lowDD |
| Optimized fixed trailing | 1 | fixed L=61 X=15.8% Y=0.6% stop=8.0% hold=21d loss=1.9% lower=0.6% retrace=36.7% | $104,786 | $29,728 | $101,090 | $29,728 | 12 | profit |
| Optimized fixed trailing | 2 | fixed L=98 X=16.1% Y=0.5% stop=8.0% hold=21d loss=1.9% lower=0.6% retrace=43.2% | $93,553 | $29,274 | $90,108 | $29,387 | 13 |  |
| Optimized fixed trailing | 3 | fixed L=178 X=8.6% Y=0.5% stop=4.4% hold=17d loss=1.0% lower=0.7% retrace=45.9% | $91,303 | $24,640 | $86,550 | $24,640 | 40 |  |
| Optimized fixed trailing | 4 | fixed L=165 X=8.6% Y=0.5% stop=4.4% hold=7d loss=0.9% lower=4.0% retrace=59.7% | $83,892 | $22,412 | $74,261 | $22,473 | 42 | balanced, lowDD |
| Optimized fixed trailing | 5 | fixed L=125 X=7.2% Y=7.3% stop=4.4% hold=13d loss=1.8% lower=1.1% retrace=38.8% | $48,638 | $20,164 | $44,644 | $21,253 | 25 |  |
| Optimized fixed trailing | 6 | fixed L=98 X=7.3% Y=7.3% stop=4.4% hold=14d loss=0.8% lower=0.8% retrace=40.3% | $45,440 | $20,164 | $44,624 | $20,164 | 24 |  |
| Optimized fixed trailing | 7 | fixed L=83 X=7.3% Y=7.3% stop=4.3% hold=12d loss=1.4% lower=1.2% retrace=36.4% | $22,130 | $20,044 | $20,280 | $20,044 | 24 |  |
| Optimized fixed trailing | 8 | fixed L=176 X=7.8% Y=7.1% stop=4.5% hold=7d loss=2.0% lower=2.6% retrace=22.3% | $22,305 | $18,856 | $18,860 | $19,536 | 25 |  |
| Optimized fixed trailing | 9 | fixed L=145 X=8.7% Y=7.1% stop=4.5% hold=7d loss=1.3% lower=4.7% retrace=22.1% | $21,078 | $18,528 | $18,332 | $19,365 | 23 |  |
| Optimized fixed trailing | 10 | fixed L=155 X=8.9% Y=7.1% stop=4.5% hold=7d loss=2.1% lower=5.0% retrace=24.0% | $22,336 | $18,528 | $17,524 | $18,646 | 23 |  |
| Optimized ATR trailing | 1 | atrSnapshot L=87 X=7.0% K=0.5 N=23 stop=9.5% hold=18d loss=1.0% lower=3.5% retrace=63.8% | $109,068 | $36,728 | $105,596 | $36,728 | 24 | profit |
| Optimized ATR trailing | 2 | atrSnapshot L=56 X=7.9% K=0.5 N=29 stop=8.0% hold=18d loss=1.3% lower=5.6% retrace=63.7% | $103,514 | $32,790 | $99,653 | $32,790 | 25 |  |
| Optimized ATR trailing | 3 | atrSnapshot L=53 X=7.0% K=3.5 N=22 stop=8.4% hold=15d loss=0.9% lower=4.5% retrace=46.5% | $94,268 | $22,229 | $92,596 | $22,510 | 15 | balanced |
| Optimized ATR trailing | 4 | atrSnapshot L=86 X=7.1% K=3.6 N=27 stop=8.4% hold=15d loss=1.3% lower=0.6% retrace=21.3% | $92,510 | $22,214 | $89,833 | $22,308 | 15 |  |
| Optimized ATR trailing | 5 | atrSnapshot L=99 X=7.1% K=3.7 N=25 stop=5.8% hold=11d loss=0.7% lower=3.2% retrace=67.5% | $91,035 | $13,114 | $83,064 | $13,754 | 19 |  |
| Optimized ATR trailing | 6 | atrSnapshot L=179 X=7.4% K=3.7 N=25 stop=5.8% hold=11d loss=0.6% lower=5.7% retrace=39.5% | $91,123 | $11,317 | $79,201 | $11,994 | 19 |  |
| Optimized ATR trailing | 7 | atrSnapshot L=82 X=7.1% K=3.9 N=29 stop=5.7% hold=9d loss=0.9% lower=2.4% retrace=37.0% | $75,553 | $10,569 | $70,045 | $10,569 | 18 |  |
| Optimized ATR trailing | 8 | atrSnapshot L=48 X=7.1% K=4.0 N=28 stop=5.7% hold=7d loss=0.9% lower=3.0% retrace=39.9% | $63,827 | $9,828 | $61,510 | $9,834 | 17 |  |
| Optimized ATR trailing | 9 | atrSnapshot L=48 X=7.1% K=4.0 N=30 stop=5.7% hold=7d loss=0.6% lower=3.5% retrace=64.0% | $65,531 | $9,828 | $61,213 | $9,828 | 17 | lowDD |
| Optimized ATR trailing | 10 | atrSnapshot L=49 X=7.0% K=3.9 N=28 stop=4.9% hold=7d loss=0.6% lower=3.5% retrace=44.5% | $57,291 | $7,216 | $51,785 | $9,119 | 17 |  |
