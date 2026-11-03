## Picks per fold: ATR snapshot

| Fold | Pick | Parameters | Training net | Training DD | Robust net (P25) | Robust DD (P75) | Entries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| WF1 | B0 | legacy L=90 X=10.0% stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | −$5,405 | $18,785 | – | – | 5 |
| WF1 | profit | atrSnapshot L=90 X=11.3% K=0.5 N=14 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $53,266 | $15,774 | $49,784 | $15,774 | 4 |
| WF1 | balanced | atrSnapshot L=90 X=11.3% K=0.5 N=14 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $53,266 | $15,774 | $49,784 | $15,774 | 4 |
| WF1 | lowDD | atrSnapshot L=90 X=7.0% K=3.6 N=10 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $36,617 | $7,889 | $35,570 | $8,034 | 4 |
| WF2 | B0 | legacy L=90 X=10.0% stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $26,296 | $23,723 | – | – | 12 |
| WF2 | profit | atrSnapshot L=90 X=11.4% K=0.9 N=30 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $54,742 | $32,443 | $54,742 | $32,443 | 9 |
| WF2 | balanced | atrSnapshot L=90 X=7.0% K=3.3 N=10 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $54,481 | $19,059 | $49,811 | $19,059 | 9 |
| WF2 | lowDD | atrSnapshot L=90 X=7.3% K=3.4 N=10 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $53,974 | $18,326 | $48,854 | $18,326 | 9 |
| WF3 | B0 | legacy L=90 X=10.0% stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $83,536 | $23,723 | – | – | 19 |
| WF3 | profit | atrSnapshot L=90 X=8.0% K=0.8 N=30 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $89,199 | $34,334 | $89,400 | $34,334 | 20 |
| WF3 | balanced | atrSnapshot L=90 X=7.2% K=3.2 N=10 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $66,592 | $17,364 | $49,434 | $19,182 | 14 |
| WF3 | lowDD | atrSnapshot L=90 X=11.2% K=0.6 N=5 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $86,292 | $32,902 | $85,681 | $32,902 | 14 |
| FINAL | B0 | legacy L=90 X=10.0% stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $78,778 | $23,723 | – | – | 30 |
| FINAL | profit | atrSnapshot L=90 X=16.2% K=0.5 N=5 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $81,772 | $29,728 | $83,857 | $29,728 | 12 |
| FINAL | balanced | atrSnapshot L=90 X=9.1% K=3.1 N=5 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $3,491 | $22,011 | −$281 | $23,014 | 13 |
| FINAL | lowDD | atrSnapshot L=90 X=15.4% K=0.6 N=30 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $85,451 | $29,728 | $78,132 | $29,728 | 14 |

## Picks per fold: ATR rolling (robustness check)

| Fold | Pick | Parameters | Training net | Training DD | Robust net (P25) | Robust DD (P75) | Entries |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| WF1 | B0 | legacy L=90 X=10.0% stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | −$5,405 | $18,785 | – | – | 5 |
| WF1 | profit | atrRolling L=90 X=11.4% K=0.5 N=14 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $53,266 | $15,774 | $49,784 | $15,774 | 4 |
| WF1 | balanced | atrRolling L=90 X=11.4% K=0.5 N=14 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $53,266 | $15,774 | $49,784 | $15,774 | 4 |
| WF1 | lowDD | atrRolling L=90 X=7.2% K=4.0 N=14 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $35,235 | $10,522 | $35,235 | $10,522 | 4 |
| WF2 | B0 | legacy L=90 X=10.0% stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $26,296 | $23,723 | – | – | 12 |
| WF2 | profit | atrRolling L=90 X=7.7% K=0.5 N=5 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $61,245 | $29,572 | $56,808 | $29,572 | 13 |
| WF2 | balanced | atrRolling L=90 X=7.2% K=4.0 N=14 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $51,992 | $17,427 | $50,432 | $18,041 | 9 |
| WF2 | lowDD | atrRolling L=90 X=7.2% K=4.0 N=14 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $51,992 | $17,427 | $50,432 | $18,041 | 9 |
| WF3 | B0 | legacy L=90 X=10.0% stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $83,536 | $23,723 | – | – | 19 |
| WF3 | profit | atrRolling L=90 X=7.7% K=0.5 N=5 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $97,840 | $32,805 | $90,798 | $33,057 | 20 |
| WF3 | balanced | atrRolling L=90 X=7.2% K=4.0 N=20 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $45,529 | $18,041 | $62,038 | $18,068 | 14 |
| WF3 | lowDD | atrRolling L=90 X=11.2% K=0.6 N=5 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $86,766 | $32,902 | $86,292 | $32,902 | 14 |
| FINAL | B0 | legacy L=90 X=10.0% stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $78,778 | $23,723 | – | – | 30 |
| FINAL | profit | atrRolling L=90 X=16.2% K=0.5 N=5 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $81,772 | $29,728 | $83,857 | $29,728 | 12 |
| FINAL | balanced | atrRolling L=90 X=7.2% K=4.0 N=20 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $38,532 | $24,283 | $55,085 | $23,178 | 17 |
| FINAL | lowDD | atrRolling L=90 X=15.5% K=0.6 N=5 stop=8.0% hold=15d loss=1.0% lower=2.0% retrace=38.0% | $82,011 | $29,728 | $79,232 | $29,728 | 14 |

## Walk-forward validation (continuous attribution)

| Family | Pick | WF1 net / DD | WF2 net / DD | WF3 net / DD | Σ net | Worst DD | Class vs B0 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| B0 | – | $31,701 / $23,723 | $57,240 / $15,660 | −$4,758 / $21,887 | $84,183 | $23,723 | – |
| ATR snapshot | profit | −$4,231 / $32,308 | $29,428 / $23,751 | −$26,572 / $34,907 | −$1,374 | $34,907 | Fails |
| ATR snapshot | balanced | −$4,231 / $32,308 | $25,417 / $17,456 | −$2,612 / $18,435 | $18,574 | $32,308 | Fails |
| ATR snapshot | lowDD | $12,237 / $19,182 | −$4,944 / $17,962 | −$22,198 / $32,456 | −$14,905 | $32,456 | Fails |
| ATR rolling | profit | −$4,233 / $32,310 | $36,595 / $23,751 | −$26,205 / $36,463 | $6,157 | $36,463 | Fails |
| ATR rolling | balanced | −$4,233 / $32,310 | $10,431 / $16,266 | −$6,997 / $12,508 | −$800 | $32,310 | Fails |
| ATR rolling | lowDD | $16,757 / $17,427 | $10,431 / $16,266 | −$19,986 / $30,244 | $7,202 | $30,244 | Fails |
| Fixed X/Y | profit | −$4,231 / $32,308 | $32,024 / $23,751 | −$36,203 / $42,375 | −$8,411 | $42,375 | Fails |
| Fixed X/Y | balanced | −$4,231 / $32,308 | $34,732 / $23,751 | −$22,059 / $29,493 | $8,442 | $32,308 | Fails |
| Fixed X/Y | lowDD | $9,796 / $31,319 | $29,337 / $23,751 | −$25,670 / $32,167 | $13,463 | $32,167 | Fails |

## Walk-forward, ATR snapshot (with flat-start column)

| Pick | WF1 net / DD | WF2 net / DD | WF3 net / DD | Σ net | Worst DD | Class vs B0 | Flat start Σ net / worst DD |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| B0 | $31,701 / $23,723 | $57,240 / $15,660 | −$4,758 / $21,887 | $84,183 | $23,723 | – | $84,183 / $23,723 |
| profit | −$4,231 / $32,308 | $29,428 / $23,751 | −$26,572 / $34,907 | −$1,374 | $34,907 | Fails | $1,826 / $34,907 |
| balanced | −$4,231 / $32,308 | $25,417 / $17,456 | −$2,612 / $18,435 | $18,574 | $32,308 | Fails | $20,277 / $18,435 |
| lowDD | $12,237 / $19,182 | −$4,944 / $17,962 | −$22,198 / $32,456 | −$14,905 | $32,456 | Fails | −$13,429 / $32,456 |

## Continuation test (PROTOCOL.md §8): ATR snapshot vs fixed X/Y, same pick

| Pick | ATR Σ net / worst DD | Fixed Σ net / worst DD | ATR class vs fixed |
| --- | ---: | ---: | ---: |
| profit | −$1,374 / $34,907 | −$8,411 / $42,375 | Dominant |
| balanced | $18,574 / $32,308 | $8,442 / $32,308 | Dominant |
| lowDD | −$14,905 / $32,456 | $13,463 / $32,167 | Fails |

ATR snapshot continues to Phase 4: **yes**. (Rolling vs fixed, for reference: profit Dominant, balanced Fails, lowDD Fails.)


## Plateau census, development (B0 = $78,778 / $23,723)

| Grid | Points | Own net ≥ B0 | Own DD ≤ B0 | Own beats B0 on both | Robust beats B0 on both |
| --- | ---: | ---: | ---: | ---: | ---: |
| snapshot | 23580 | 404 | 5286 | 6 | 0 |
| rolling | 23580 | 413 | 5449 | 12 | 0 |
| fixed | 9956 | 446 | 0 | 0 | 0 |

## Best feasible ATR snapshot point by period, development (highest robust net; lowest robust DD)

| Period | Best robust net at | Net | DD | Robust net | Lowest robust DD at | Net | DD | Robust DD |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| N=5 | X=16.2% K=0.5 | $81,772 | $29,728 | $83,857 | X=9.1% K=3.1 | $3,491 | $22,011 | $23,014 |
| N=10 | X=16.2% K=0.5 | $81,063 | $30,347 | $83,836 | X=7.0% K=3.3 | $77,286 | $25,758 | $24,244 |
| N=14 | X=15.8% K=0.5 | $78,522 | $32,074 | $81,063 | X=9.1% K=3.4 | $1,026 | $26,926 | $25,850 |
| N=20 | X=16.0% K=0.5 | $81,063 | $30,347 | $81,063 | X=7.4% K=3.9 | $38,190 | $28,028 | $27,972 |
| N=30 | X=16.2% K=0.5 | $81,063 | $30,347 | $80,965 | X=7.6% K=3.9 | $24,369 | $26,597 | $26,604 |

## Effective rebound K × ATR(N) / close per unit K, sessions ≥ 10% below the 90-session high (development)

| Period | ordinary median (p10–p90), n | crash median (p10–p90), n | bear median (p10–p90), n | recovering median (p10–p90), n |
| --- | ---: | ---: | ---: | ---: |
| N=5 | 2.79% (2.00%–3.86%), 41 | 5.88% (3.59%–9.49%), 17 | 2.84% (2.36%–3.65%), 198 | 2.79% (1.87%–4.53%), 134 |
| N=10 | 2.48% (1.83%–3.00%), 41 | 4.83% (2.81%–7.95%), 17 | 2.82% (2.39%–3.49%), 198 | 2.87% (2.10%–4.84%), 134 |
| N=14 | 2.34% (1.73%–2.79%), 41 | 4.24% (2.49%–6.98%), 17 | 2.81% (2.42%–3.49%), 198 | 2.87% (2.20%–4.96%), 134 |
| N=20 | 2.19% (1.65%–2.61%), 41 | 3.64% (2.19%–5.94%), 17 | 2.76% (2.42%–3.45%), 198 | 2.80% (2.26%–4.81%), 134 |
| N=30 | 2.04% (1.61%–2.44%), 41 | 3.03% (1.91%–4.84%), 17 | 2.75% (2.32%–3.38%), 198 | 2.76% (2.22%–4.36%), 134 |
