| Stratum | Pool | Stream | Robust/yr | Share | p90 DD | Centre DD | Violation | Q7 | Complementary | Reasons |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|
| V2 | VGT+KBE | exhaustive | $10,244 | 87.8% | $35,340 | $34,040 | 0.035 | True | True | violates C2share,C2p90 |
| V2 | VGT+DBC | exhaustive | $8,664 | 86.2% | $35,784 | $34,040 | 0.127 | True | True | violates C2share,C2p90,C7lot |
| V2 | VGT+IJR | exhaustive | $7,791 | 66.4% | $38,278 | $27,385 | 0.398 | True | True | violates C2share,C2p90,C5median |
| V2 | VGT+XLF | exhaustive | $7,381 | 99.7% | $27,821 | $13,805 | 0.144 | True | True | violates C5median |
| V2 | VGT+ILF | exhaustive | $6,895 | 87.8% | $36,388 | $34,027 | 0.312 | True | True | violates C2share,C2p90,C5median,C7lot |
| V2 | VGT+IWM | exhaustive | $6,411 | 100.0% | $28,309 | $26,556 | 0.164 | True | True | violates C5median |
| G2 | GDX+SMH | exhaustive | $17,722 | 75.8% | $40,768 | $26,210 | 0.323 | True | True | violates C2share,C2p90 |
| G2 | GDX+MTUM | exhaustive | $14,898 | 75.8% | $36,990 | $19,470 | 0.320 | True | True | violates C2share,C2p90,C7lot |
| G2 | GDX+IWM | exhaustive | $14,404 | 63.8% | $40,576 | $42,485 | 0.720 | False | True | violates C1,C2share,C2p90,C7lot; centre DD ≥ $35k; fails Q7 |
| G2 | GDX+XLY | exhaustive | $10,619 | 89.1% | $35,579 | $22,339 | 0.027 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G2 | GDX+IGV | exhaustive | $9,068 | 46.9% | $44,296 | $33,497 | 0.811 | True | False | violates C2share,C2p90,C7lot; fails I1 (a book adds < $1,000/yr robust) |
| G2 | XRT+GDX | exhaustive | $7,413 | 43.0% | $48,072 | $31,913 | 1.013 | True | False | violates C2share,C2p90,C5median,C7lot; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| N2 | EDV+XLF | exhaustive-C | $8,178 | 100.0% | $28,261 | $16,097 | 0.033 | True | True | violates C5median |
| N2 | IWM+XLF | exhaustive-C | $8,035 | 96.1% | $31,836 | $18,791 | 0.030 | True | True | violates C5median |
| N2 | IBB+VGK | explore-uniform | $7,718 | 100.0% | $23,237 | $11,450 | 0.437 | True | True | violates C5median,C7lot,C7exBest |
| N2 | SMH+XLF | exhaustive-C | $7,539 | 97.9% | $31,297 | $23,461 | 0.051 | True | True | violates C5median |
| V3 | VGT+DBC+XLF | exhaustive-C | $8,893 | 89.8% | $35,006 | $34,040 | 0.122 | True | False | violates C2share,C2p90,C7lot; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V3 | VGT+IJH+XLF | exhaustive-C | $7,559 | 92.2% | $34,685 | $12,943 | 0.095 | True | False | violates C5median; fails I1 (a book adds < $1,000/yr robust) |
| V3 | VGT+EMB+IWM | exhaustive-C | $6,552 | 100.0% | $28,100 | $21,317 | 0.152 | True | False | violates C5median; fails I1 (a book adds < $1,000/yr robust) |
| V3 | VGT+DBC+EWZ | exhaustive-C | $6,536 | 87.0% | $36,890 | $22,726 | 0.180 | True | False | violates C2share,C2p90,C5median; fails I1 (a book adds < $1,000/yr robust) |
| V3 | VGT+DBC+FXI | exhaustive-C | $6,427 | 93.8% | $32,131 | $16,942 | 0.147 | True | True | violates C5median |
| V3 | VGT+SMH+USMV | explore-uniform | $6,109 | 97.9% | $30,213 | $22,429 | 0.226 | True | False | violates C5median; fails I1 (a book adds < $1,000/yr robust) |
| G3 | KRE+GDX+MTUM | exhaustive-C | $19,679 | 77.3% | $40,421 | $33,167 | 0.296 | True | True | violates C2share,C2p90 |
| G3 | GDX+MTUM+SMH | exhaustive-C | $18,046 | 84.4% | $36,019 | $26,210 | 0.092 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| G3 | GDX+ILF+MTUM | exhaustive-C | $15,476 | 84.9% | $37,928 | $24,926 | 0.140 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| G3 | GDX+IBB+SMH | explore-diverse | $13,958 | 73.4% | $48,675 | $26,210 | 0.575 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| G3 | GDX+IWM+MTUM | exhaustive-C | $13,658 | 77.6% | $37,137 | $25,678 | 0.199 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| G3 | EWW+GDX+XLY | explore-uniform | $9,937 | 82.3% | $37,529 | $24,844 | 0.158 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G3 | GDX+IWM+XLB | exhaustive-C | $6,410 | 93.8% | $34,004 | $30,441 | 0.095 | True | False | violates C5median; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG3 | VGT+GDX+XHB | exhaustive | $14,358 | 71.6% | $40,252 | $25,560 | 0.442 | True | False | violates C2share,C2p90,C7lot; fails I1 (a book adds < $1,000/yr robust) |
| VG3 | VGT+GDX+IYT | exhaustive | $14,340 | 50.3% | $44,695 | $30,897 | 0.719 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| VG3 | VGT+GDX+IWM | exhaustive | $12,689 | 89.3% | $35,172 | $25,560 | 0.070 | True | False | violates C2share,C2p90,C7lot; fails I1 (a book adds < $1,000/yr robust) |
| VG3 | VGT+GDX+SMH | exhaustive | $11,924 | 74.7% | $40,662 | $21,646 | 0.461 | True | False | violates C2share,C2p90,C7lot; fails I1 (a book adds < $1,000/yr robust) |
| VG3 | VGT+XRT+GDX | exhaustive | $11,581 | 50.8% | $44,951 | $34,027 | 0.720 | True | True | violates C2share,C2p90 |
| VG3 | VGT+GDX+IJH | exhaustive | $9,333 | 75.8% | $37,635 | $25,560 | 0.632 | True | False | violates C2share,C2p90,C7lot; fails I1 (a book adds < $1,000/yr robust) |
| N3 | SMH+XHB+XLF | beam | $10,164 | 95.1% | $33,907 | $32,310 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust) |
| N3 | EDV+XHB+XLB | beam | $10,030 | 90.4% | $34,652 | $28,245 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust) |
| N3 | IWM+SMH+XHB | beam | $9,497 | 96.9% | $32,267 | $30,290 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust) |
| N3 | EDV+IWM+XHB | beam | $9,399 | 92.4% | $32,792 | $29,504 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust) |
| N3 | EDV+XHB+XLF | beam | $9,397 | 89.3% | $35,453 | $32,310 | 0.020 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| N3 | EFA+FXI+VIG | explore-uniform | $6,713 | 82.3% | $37,385 | $19,406 | 0.343 | True | True | violates C2share,C2p90,C5median |
| V4 | VGT+IEMG+XHB+XLF | explore-diverse | $9,918 | 92.4% | $34,500 | $34,027 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust) |
| V4 | VGT+IJH+IWM+XLF | swap | $9,517 | 93.5% | $33,978 | $17,089 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V4 | VGT+DBC+EWZ+FXI | beam | $8,611 | 91.7% | $33,920 | $22,726 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V4 | VGT+EMB+IJH+IWM | beam | $7,056 | 100.0% | $27,970 | $21,317 | 0.116 | True | False | violates C5median; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V4 | VGT+DBC+EWZ+XLF | beam | $7,037 | 87.2% | $37,706 | $22,726 | 0.270 | True | False | violates C2share,C2p90,C5median,C7lot; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V4 | VGT+IGV+RSP+XLB | explore-diverse | $6,551 | 77.6% | $39,287 | $34,027 | 0.464 | True | False | violates C2share,C2p90,C5median,C7lot; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V4 | VGT+FXI+IJH+IWM | swap | $6,199 | 97.1% | $31,919 | $23,922 | 0.388 | True | False | violates C4,C5median; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G4 | KRE+EWW+GDX+MTUM | beam | $27,218 | 90.4% | $34,311 | $23,926 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust) |
| G4 | KRE+GDX+ILF+IYT | beam | $21,138 | 89.3% | $35,016 | $30,351 | 0.008 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G4 | GDX+IWM+MTUM+SMH | beam | $17,421 | 83.9% | $36,731 | $28,273 | 0.118 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| G4 | EWW+FXI+GDX+SLV | explore-uniform | $13,959 | 94.5% | $32,216 | $21,157 | 0.198 | True | True | violates C7lot |
| G4 | EWW+GDX+IYT+MTUM | beam | $13,321 | 83.6% | $40,169 | $26,494 | 0.219 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G4 | GDX+IWM+SMH+XLB | beam | $8,512 | 86.7% | $36,340 | $30,441 | 0.075 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG4 | VGT+EWW+GDX+SMH | explore-uniform | $14,837 | 67.2% | $48,216 | $34,027 | 0.631 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG4 | VGT+GDX+SMH+XLF | exhaustive-C | $13,022 | 75.0% | $41,061 | $34,027 | 0.340 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| VG4 | VGT+GDX+IJH+SMH | exhaustive-C | $12,350 | 78.9% | $39,369 | $21,646 | 0.310 | True | False | violates C2share,C2p90,C7lot; fails I1 (a book adds < $1,000/yr robust) |
| VG4 | VGT+GDX+IYT+XLY | explore-uniform | $11,888 | 52.1% | $45,140 | $30,897 | 0.711 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG4 | VGT+XRT+GDX+SMH | exhaustive-C | $10,726 | 63.0% | $43,725 | $34,027 | 0.549 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG4 | VGT+GDX+SMH+XLB | exhaustive-C | $10,470 | 69.0% | $45,980 | $34,027 | 0.547 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG4 | VGT+GDX+SMH+USMV | exhaustive-C | $7,244 | 70.3% | $41,396 | $21,646 | 0.507 | True | False | violates C2share,C2p90,C7lot; fails I1 (a book adds < $1,000/yr robust) |
| N4 | EDV+SMH+XHB+XLF | beam | $10,631 | 93.0% | $34,266 | $32,310 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust) |
| N4 | EDV+KBE+SMH+VIG | explore-diverse | $10,309 | 62.5% | $41,318 | $32,666 | 0.486 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| N4 | EDV+XHB+XLB+XLF | beam | $9,739 | 88.0% | $35,333 | $32,310 | 0.031 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| N4 | EDV+IWM+XHB+XLB | beam | $9,529 | 90.9% | $34,689 | $28,842 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| N4 | IWM+SMH+XHB+XLP | beam | $8,677 | 95.1% | $33,560 | $31,093 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| N4 | IYT+SMH+XHB+XLF | beam | $8,425 | 93.0% | $34,302 | $24,884 | 0.007 | True | False | violates C5median; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| N4 | SMH+XHB+XLB+XLP | beam | $8,156 | 93.8% | $34,065 | $31,606 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V5 | VGT+KRE+EWW+IYT+XLK | beam | $10,534 | 57.0% | $45,053 | $31,855 | 0.654 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V5 | VGT+KBE+MTUM+VIG+VPU | explore-diverse | $10,282 | 88.5% | $35,476 | $34,040 | 0.530 | True | False | violates C2share,C2p90,C4; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V5 | VGT+EMB+IEMG+XHB+XLF | beam | $9,806 | 91.7% | $34,757 | $34,027 | 0.500 | True | False | violates C4; fails I1 (a book adds < $1,000/yr robust) |
| V5 | VGT+DBC+EMB+EWZ+FXI | beam | $8,319 | 89.8% | $35,111 | $22,726 | 0.755 | True | False | violates C2share,C2p90,C4; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V5 | VGT+DBC+EWZ+FXI+IYT | beam | $8,023 | 69.5% | $49,488 | $29,573 | 0.868 | True | False | violates C2share,C2p90,C7lot,C7exBest; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V5 | VGT+KRE+DBC+EWZ+IYT | beam | $7,482 | 44.8% | $51,839 | $33,210 | 1.061 | True | False | violates C2share,C2p90,C5median,C7lot; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| V5 | VGT+DBC+RSP+VOOG+XLP | explore-diverse | $6,144 | 79.2% | $36,828 | $34,040 | 0.778 | True | False | violates C2share,C2p90,C4,C5median,C7lot; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G5 | KRE+EWW+GDX+ILF+MTUM | beam | $25,507 | 91.1% | $32,607 | $24,926 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G5 | KRE+GDX+ILF+MTUM+SMH | beam | $25,477 | 86.5% | $36,873 | $26,210 | 0.093 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G5 | KRE+EWW+GDX+IWM+MTUM | beam | $24,122 | 89.6% | $35,086 | $25,678 | 0.007 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G5 | KRE+EWW+GDX+IYT+SMH | beam | $23,377 | 81.0% | $39,390 | $25,707 | 0.226 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G5 | KRE+EWW+GDX+ILF+IYT | beam | $21,201 | 91.4% | $34,206 | $30,351 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G5 | KRE+EWW+GDX+IYT+MTUM | beam | $20,710 | 93.0% | $32,842 | $25,828 | 0.000 | True | False | fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| G5 | GDX+IJH+IWM+SMH+XLP | explore-uniform | $12,955 | 79.9% | $39,577 | $27,065 | 0.242 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG5 | VGT+EWW+GDX+IYT+XLF | swap | $18,373 | 76.6% | $40,350 | $30,897 | 0.302 | True | False | violates C2share,C2p90; fails I2 (a book has centre LOO Δ ≤ 0) |
| VG5 | VGT+EWW+GDX+SMH+XLF | beam | $17,371 | 74.2% | $42,051 | $34,027 | 0.377 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG5 | VGT+KRE+GDX+SMH+XLU | explore-uniform | $16,231 | 76.6% | $40,840 | $34,027 | 1.066 | True | False | violates C2share,C2p90,C4; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG5 | VGT+EWW+GDX+IYT+SMH | beam | $15,709 | 71.9% | $43,751 | $30,897 | 0.451 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG5 | VGT+GDX+IJH+SMH+XLF | beam | $13,458 | 75.0% | $40,887 | $34,027 | 0.335 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| VG5 | VGT+XRT+GDX+SMH+XLF | beam | $13,267 | 62.0% | $44,030 | $34,027 | 0.569 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| VG5 | VGT+DBC+GDX+IJH+SMH | explore-uniform | $13,032 | 69.3% | $42,375 | $34,027 | 0.441 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| N5 | EDV+IWM+XHB+XLB+XLF | beam | $9,662 | 88.8% | $35,099 | $32,907 | 0.016 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| N5 | FXI+SMH+XHB+XLB+XLF | beam | $9,249 | 89.1% | $35,287 | $30,441 | 0.019 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust) |
| N5 | EDV+IWM+SMH+XHB+XLB | swap | $8,759 | 89.1% | $35,346 | $31,604 | 0.020 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| N5 | EDV+SMH+XHB+XLB+XLF | beam | $8,562 | 75.3% | $36,764 | $33,110 | 0.214 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| N5 | EDV+IWM+SMH+XLB+XLF | beam | $7,914 | 81.0% | $38,750 | $32,691 | 0.207 | True | False | violates C2share,C2p90; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| N5 | EFA+IGV+SPLV+VPU+XHB | explore-diverse | $6,952 | 91.4% | $34,690 | $19,470 | 0.117 | True | False | violates C5median; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
| N5 | SLV+SMH+USMV+VPU+XLY | explore-diverse | $5,789 | 75.3% | $40,904 | $23,967 | 0.790 | True | False | violates C2share,C2p90,C4,C5median; fails I1 (a book adds < $1,000/yr robust); fails I2 (a book has centre LOO Δ ≤ 0) |
