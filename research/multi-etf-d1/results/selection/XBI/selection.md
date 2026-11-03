# XBI: development selection (generated 2026-10-23T13:14:33.284Z)

Candidates evaluated: 22,378 (Sobol 4096, GA fold1 3072, fold2 3072, fold3 3072, fold4 3072, final 3072). Development window 2017-06-15 → 2023-12-29.

## Control and nominations (development window)

| Role | Parameters | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau (feasible share / median share) | Sparse |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $35,145 | $68,829 | $65,514 | 45 (1 open) | 16/28 | −$12,431 | −$14,875 | $34,213 | $932 | $21,488 | 30% | 16 d | — | no |
| primary | X 29.1% Y 1.2% L 64 stop 10.4% hold 3 buffer 0.1% P 10.7% W 29 | $151,799 | $27,885 | $25,741 | 24 | 7/17 | −$5,471 | −$8,912 | $63,681 | $88,117 | $20,252 | 28% | 28 d | pass (77% / 96%) | no |
| alternate-lowDd | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | $118,055 | $12,837 | $10,948 | 29 | 21/8 | −$5,105 | −$7,953 | $14,981 | $103,074 | $5,425 | 7% | 6 d | pass (100% / 89%) | no |

## Net by year (development)

| Role | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|
| control (D1) | $0 (0e) | −$16,266 (6e) | $19,100 (3e) | $27,568 (5e) | −$6,968 (9e) | −$31,049 (16e) | $42,759 (6e) |
| primary | $0 (0e) | $1,505 (2e) | $15,180 (0e) | $97,032 (3e) | $17,266 (3e) | $20,815 (16e) | $0 (0e) |
| alternate-lowDd | $0 (0e) | $0 (0e) | $0 (0e) | $60,041 (11e) | $3,326 (2e) | $54,688 (16e) | $0 (0e) |

## Walk-forward of the selection rule (training-only picks attributed to the next window)

| Fold | Validation | Min entries | D1 | primary pick | lowDd pick | maxNet pick |
|---|---|---:|---|---|---|---|
| fold1 | 2020-01-02 → 2020-12-31 | 2 | $27,568 / DD $17,127 / 5e | $22,816 / DD $17,875 / 2e (train $61,470 / DD $9,456) | $2,358 / DD $28,135 / 3e (train $47,519 / DD $6,344) | none |
| fold2 | 2021-01-04 → 2021-12-31 | 3 | −$6,968 / DD $22,100 / 9e | $12,977 / DD $20,789 / 3e (train $117,155 / DD $24,195) | $4,375 / DD $20,388 / 8e (train $90,857 / DD $10,145) | none |
| fold3 | 2022-01-03 → 2022-12-30 | 4 | −$31,049 / DD $53,033 / 16e | $3,471 / DD $34,002 / 11e (train $136,200 / DD $20,014) | $16,351 / DD $26,180 / 10e (train $107,727 / DD $13,787) | none |
| fold4 | 2023-01-03 → 2023-12-29 | 5 | $42,759 / DD $17,385 / 6e | $0 / DD $0 / 0e (train $151,799 / DD $27,885) | $0 / DD $0 / 0e (train $117,095 / DD $15,051) | none |

| Policy | Stitched validation net | D1 stitched | Folds with a pick | Folds ≥ D1 | Pass |
|---|---:|---:|---:|---:|---|
| primary | $39,264 | $32,311 | 4 | 2 | yes |
| lowDd | $23,084 | $32,311 | 4 | 2 | no |
| maxNet | $0 | $32,311 | 0 | 0 | no |

## Fold details

### fold1 (training through 2019-12-31; pool 7169, feasible 5525, beating D1 4845, distinct signatures 4420; min entries 2)

- primary: d1-4b72a9f4b3 X 23.4% Y 2.2% L 41 stop 6.4% hold 17 buffer 2.6% P 19.9% W 196 — train $61,470 / DD $9,456 / 4e; plateau pass (100% feasible, median 99%, min 75%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-7536ad6410 X 25.9% Y 2.8% L 64 stop 4.2% hold 18 buffer 2.5% P 14.9% W 188 — train $47,519 / DD $6,344 / 6e; plateau pass (100% feasible, median 100%, min 36%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold2 (training through 2020-12-31; pool 10794, feasible 8254, beating D1 5506, distinct signatures 4844; min entries 3)

- primary: d1-0205cfa41a X 24.4% Y 1.2% L 22 stop 10.4% hold 3 buffer 4.3% P 8.5% W 45 — train $117,155 / DD $24,195 / 5e; plateau pass (100% feasible, median 99%, min 19%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-d3133c8b9e X 19.0% Y 0.9% L 30 stop 3.1% hold 12 buffer 2.5% P 8.2% W 64 — train $90,857 / DD $10,145 / 21e; plateau pass (100% feasible, median 98%, min 68%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold3 (training through 2021-12-31; pool 14449, feasible 11025, beating D1 9098, distinct signatures 7778; min entries 4)

- primary: d1-16036452f4 X 28.7% Y 0.6% L 52 stop 10.4% hold 3 buffer 3.8% P 9.9% W 28 — train $136,200 / DD $20,014 / 5e; plateau pass (97% feasible, median 96%, min 25%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-5fc3845a1c X 29.9% Y 0.7% L 63 stop 6.4% hold 16 buffer 0.4% P 8.2% W 31 — train $107,727 / DD $13,787 / 13e; plateau pass (100% feasible, median 72%, min 50%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold4 (training through 2022-12-30; pool 18087, feasible 7346, beating D1 7293, distinct signatures 6166; min entries 5)

- primary: d1-1899af7fc2 X 29.1% Y 1.2% L 64 stop 10.4% hold 3 buffer 0.1% P 10.7% W 29 — train $151,799 / DD $27,885 / 24e; plateau pass (77% feasible, median 96%, min 23%) — no plateau candidate under the preferred DD band; highest net among 1 plateau candidates
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-88a5a6c8eb X 29.7% Y 1.0% L 62 stop 3.1% hold 5 buffer 0.6% P 8.2% W 36 — train $117,095 / DD $15,051 / 34e; plateau pass (100% feasible, median 87%, min 33%) — lowest DD among plateau candidates keeping the net share, distinct signature

### final (training through 2023-12-29; pool 21691, feasible 10209, beating D1 8080, distinct signatures 6377; min entries 5)

- primary: d1-1899af7fc2 X 29.1% Y 1.2% L 64 stop 10.4% hold 3 buffer 0.1% P 10.7% W 29 — train $151,799 / DD $27,885 / 24e; plateau pass (77% feasible, median 96%, min 23%) — no plateau candidate under the preferred DD band; highest net among 2 plateau candidates
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-0aabdaab89 X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 — train $118,055 / DD $12,837 / 29e; plateau pass (100% feasible, median 89%, min 62%) — lowest DD among plateau candidates keeping the net share, distinct signature

## Notes

- none
