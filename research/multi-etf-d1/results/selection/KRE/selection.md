# KRE: development selection (generated 2026-10-23T13:17:53.471Z)

Candidates evaluated: 22,349 (Sobol 4096, GA fold1 3072, fold2 3072, fold3 3072, fold4 3072, final 3072). Development window 2017-06-15 → 2023-12-29.

## Control and nominations (development window)

| Role | Parameters | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau (feasible share / median share) | Sparse |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $4,950 | $55,799 | $50,242 | 32 | 15/17 | −$19,646 | −$22,386 | $16,604 | −$11,653 | $13,923 | 19% | 14 d | — | no |
| primary | X 29.9% Y 2.8% L 233 stop 3.1% hold 5 buffer 2.8% P 9.4% W 100 | $171,785 | $26,271 | $25,333 | 70 | 44/26 | −$19,601 | −$19,626 | $17,228 | $154,557 | $15,370 | 21% | 7 d | pass (100% / 89%) | no |
| alternate-lowDd | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | $158,512 | $22,725 | $20,903 | 73 | 42/31 | −$10,004 | −$18,031 | $17,228 | $141,284 | $14,586 | 20% | 7 d | pass (93% / 88%) | no |

## Net by year (development)

| Role | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|
| control (D1) | $0 (0e) | −$7,285 (3e) | $9,322 (1e) | $25,066 (14e) | $0 (0e) | −$939 (4e) | −$21,214 (10e) |
| primary | $0 (0e) | $3,321 (1e) | $17,380 (2e) | $71,443 (33e) | $20,490 (6e) | $8,546 (3e) | $50,604 (25e) |
| alternate-lowDd | $0 (0e) | $3,505 (1e) | $19,692 (1e) | $59,873 (34e) | $20,871 (6e) | $9,106 (3e) | $45,465 (28e) |

## Walk-forward of the selection rule (training-only picks attributed to the next window)

| Fold | Validation | Min entries | D1 | primary pick | lowDd pick | maxNet pick |
|---|---|---:|---|---|---|---|
| fold1 | 2020-01-02 → 2020-12-31 | 2 | $25,066 / DD $48,496 / 14e | $21,268 / DD $40,091 / 19e (train $37,173 / DD $9,052) | $40,172 / DD $28,523 / 22e (train $31,914 / DD $4,561) | none |
| fold2 | 2021-01-04 → 2021-12-31 | 3 | $0 / DD $0 / 0e | $0 / DD $0 / 0e (train $109,768 / DD $24,333) | $0 / DD $0 / 0e (train $93,549 / DD $21,881) | none |
| fold3 | 2022-01-03 → 2022-12-30 | 4 | −$939 / DD $11,307 / 4e | −$3,526 / DD $14,869 / 1e (train $126,007 / DD $28,746) | $0 / DD $0 / 0e (train $94,557 / DD $21,881) | none |
| fold4 | 2023-01-03 → 2023-12-29 | 5 | −$21,214 / DD $47,949 / 10e | −$1,694 / DD $44,728 / 28e (train $146,567 / DD $26,680) | $11,612 / DD $41,811 / 31e (train $117,118 / DD $22,059) | none |

| Policy | Stitched validation net | D1 stitched | Folds with a pick | Folds ≥ D1 | Pass |
|---|---:|---:|---:|---:|---|
| primary | $16,047 | $2,913 | 4 | 2 | yes |
| lowDd | $51,784 | $2,913 | 4 | 4 | yes |
| maxNet | $0 | $2,913 | 0 | 0 | no |

## Fold details

### fold1 (training through 2019-12-31; pool 7169, feasible 5452, beating D1 4237, distinct signatures 3728; min entries 2)

- primary: d1-0b99532b41 X 12.6% Y 4.9% L 167 stop 4.9% hold 13 buffer 1.4% P 16.4% W 123 — train $37,173 / DD $9,052 / 7e; plateau pass (100% feasible, median 100%, min 41%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-0ed23506bc X 27.7% Y 2.3% L 187 stop 3.1% hold 11 buffer 4.2% P 13.2% W 77 — train $31,914 / DD $4,561 / 3e; plateau pass (100% feasible, median 100%, min 66%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold2 (training through 2020-12-31; pool 10834, feasible 4035, beating D1 3552, distinct signatures 2628; min entries 3)

- primary: d1-1d671dd647 X 28.8% Y 2.2% L 234 stop 3.3% hold 5 buffer 1.7% P 13.8% W 94 — train $109,768 / DD $24,333 / 36e; plateau pass (100% feasible, median 94%, min 66%) — highest net among 8 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-00b72f7f38 X 28.6% Y 2.6% L 234 stop 3.1% hold 4 buffer 1.8% P 13.8% W 93 — train $93,549 / DD $21,881 / 37e; plateau pass (100% feasible, median 92%, min 75%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold3 (training through 2021-12-31; pool 14481, feasible 7359, beating D1 6518, distinct signatures 4763; min entries 4)

- primary: d1-730d5d705c X 24.9% Y 3.2% L 28 stop 10.1% hold 4 buffer 1.3% P 13.0% W 183 — train $126,007 / DD $28,746 / 12e; plateau pass (93% feasible, median 98%, min 27%) — no plateau candidate under the preferred DD band; highest net among 10 plateau candidates
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-b8723fdfcc X 28.9% Y 2.6% L 215 stop 3.1% hold 4 buffer 0.3% P 8.8% W 147 — train $94,557 / DD $21,881 / 39e; plateau pass (100% feasible, median 100%, min 81%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold4 (training through 2022-12-30; pool 18140, feasible 10557, beating D1 9243, distinct signatures 6615; min entries 5)

- primary: d1-0c85639b9f X 28.8% Y 2.2% L 226 stop 3.8% hold 5 buffer 3.5% P 8.6% W 88 — train $146,567 / DD $26,680 / 50e; plateau pass (97% feasible, median 99%, min 49%) — no plateau candidate under the preferred DD band; highest net among 10 plateau candidates
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-0fbeae9494 X 28.4% Y 2.6% L 233 stop 3.1% hold 4 buffer 2.5% P 8.9% W 192 — train $117,118 / DD $22,059 / 47e; plateau pass (100% feasible, median 99%, min 73%) — lowest DD among plateau candidates keeping the net share, distinct signature

### final (training through 2023-12-29; pool 21791, feasible 6824, beating D1 5964, distinct signatures 4028; min entries 5)

- primary: d1-1956f5b4ca X 29.9% Y 2.8% L 233 stop 3.1% hold 5 buffer 2.8% P 9.4% W 100 — train $171,785 / DD $26,271 / 70e; plateau pass (100% feasible, median 89%, min 68%) — no plateau candidate under the preferred DD band; highest net among 10 plateau candidates
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-a389037400 X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 — train $158,512 / DD $22,725 / 73e; plateau pass (93% feasible, median 88%, min 73%) — lowest DD among plateau candidates keeping the net share, distinct signature

## Notes

- none
