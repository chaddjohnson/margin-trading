# XRT: development selection (generated 2026-10-23T13:16:40.912Z)

Candidates evaluated: 22,488 (Sobol 4096, GA fold1 3072, fold2 3072, fold3 3072, fold4 3072, final 3072). Development window 2017-06-15 → 2023-12-29.

## Control and nominations (development window)

| Role | Parameters | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau (feasible share / median share) | Sparse |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $41,132 | $41,800 | $38,237 | 34 | 14/20 | −$19,037 | −$22,154 | $17,696 | $23,436 | $20,825 | 29% | 20 d | — | no |
| primary | X 24.4% Y 2.0% L 49 stop 7.7% hold 9 buffer 2.8% P 6.5% W 103 | $145,468 | $23,383 | $20,451 | 24 | 14/10 | −$15,167 | −$18,925 | $68,743 | $76,725 | $17,841 | 25% | 25 d | pass (97% / 93%) | no |
| alternate-lowDd | X 24.4% Y 4.7% L 48 stop 8.0% hold 17 buffer 3.6% P 6.2% W 120 | $127,705 | $19,966 | $17,945 | 18 | 11/7 | −$8,060 | −$19,663 | $63,659 | $64,046 | $16,214 | 23% | 30 d | pass (100% / 97%) | no |

## Net by year (development)

| Role | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|
| control (D1) | $0 (0e) | −$3,055 (2e) | −$844 (1e) | $19,200 (5e) | $21,139 (4e) | $939 (17e) | $3,752 (5e) |
| primary | $0 (0e) | $0 (0e) | $0 (0e) | $65,635 (7e) | $53,672 (5e) | $13,045 (11e) | $13,116 (1e) |
| alternate-lowDd | $0 (0e) | $0 (0e) | $0 (0e) | $63,230 (5e) | $50,727 (5e) | $1,080 (6e) | $12,668 (2e) |

## Walk-forward of the selection rule (training-only picks attributed to the next window)

| Fold | Validation | Min entries | D1 | primary pick | lowDd pick | maxNet pick |
|---|---|---:|---|---|---|---|
| fold1 | 2020-01-02 → 2020-12-31 | 2 | $19,200 / DD $32,939 / 5e | $48,075 / DD $47,440 / 9e (train $36,460 / DD $16,086) | $25,388 / DD $20,069 / 4e (train $28,817 / DD $6,326) | none |
| fold2 | 2021-01-04 → 2021-12-31 | 3 | $21,139 / DD $10,595 / 4e | $58,574 / DD $71,713 / 1e (train $122,583 / DD $21,956) | $38,626 / DD $50,799 / 1e (train $93,063 / DD $19,863) | none |
| fold3 | 2022-01-03 → 2022-12-30 | 4 | $939 / DD $25,214 / 17e | $1,033 / DD $10,355 / 3e (train $128,690 / DD $23,109) | −$24,487 / DD $38,579 / 9e (train $102,400 / DD $19,966) | −$5,898 / DD $19,856 / 4e (train $133,698 / DD $32,094) |
| fold4 | 2023-01-03 → 2023-12-29 | 5 | $3,752 / DD $11,641 / 5e | $0 / DD $0 / 0e (train $137,661 / DD $23,109) | $0 / DD $0 / 0e (train $104,114 / DD $15,613) | $0 / DD $0 / 0e (train $138,719 / DD $33,841) |

| Policy | Stitched validation net | D1 stitched | Folds with a pick | Folds ≥ D1 | Pass |
|---|---:|---:|---:|---:|---|
| primary | $107,683 | $45,030 | 4 | 3 | yes |
| lowDd | $39,526 | $45,030 | 4 | 2 | no |
| maxNet | −$5,898 | $45,030 | 2 | 0 | no |

## Fold details

### fold1 (training through 2019-12-31; pool 7169, feasible 5137, beating D1 4144, distinct signatures 3868; min entries 2)

- primary: d1-0b04ca5626 X 21.4% Y 0.3% L 241 stop 5.7% hold 21 buffer 0.1% P 5.9% W 36 — train $36,460 / DD $16,086 / 10e; plateau pass (100% feasible, median 92%, min -13%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-884a005444 X 27.1% Y 1.0% L 227 stop 5.0% hold 29 buffer 0.1% P 5.9% W 38 — train $28,817 / DD $6,326 / 3e; plateau pass (93% feasible, median 100%, min 0%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold2 (training through 2020-12-31; pool 10829, feasible 6536, beating D1 5519, distinct signatures 4818; min entries 3)

- primary: d1-2d9f5f38e7 X 29.9% Y 1.7% L 29 stop 12.1% hold 8 buffer 3.9% P 9.0% W 182 — train $122,583 / DD $21,956 / 3e; plateau pass (100% feasible, median 100%, min 51%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-25f8f35b99 X 27.6% Y 0.1% L 52 stop 10.7% hold 8 buffer 1.9% P 5.6% W 175 — train $93,063 / DD $19,863 / 4e; plateau pass (100% feasible, median 100%, min 20%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold3 (training through 2021-12-31; pool 14490, feasible 7097, beating D1 3445, distinct signatures 2694; min entries 4)

- primary: d1-027afe70bd X 24.7% Y 2.2% L 38 stop 7.4% hold 9 buffer 3.8% P 5.3% W 74 — train $128,690 / DD $23,109 / 12e; plateau pass (100% feasible, median 97%, min 39%) — highest net among 1 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: d1-57665c85ca X 22.6% Y 2.3% L 32 stop 7.4% hold 9 buffer 4.7% P 5.4% W 105 — train $133,698 / DD $32,094 / 14e; plateau pass (88% feasible, median 96%, min 41%) — higher training net than the primary, plateau, distinct signature
- lowDd: d1-034abdb344 X 30.0% Y 4.8% L 243 stop 8.0% hold 19 buffer 3.0% P 6.2% W 118 — train $102,400 / DD $19,966 / 6e; plateau pass (100% feasible, median 100%, min 23%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold4 (training through 2022-12-30; pool 18182, feasible 8090, beating D1 4668, distinct signatures 3370; min entries 5)

- primary: d1-012d49fc44 X 24.5% Y 2.2% L 49 stop 7.3% hold 9 buffer 4.2% P 5.3% W 73 — train $137,661 / DD $23,109 / 24e; plateau pass (100% feasible, median 91%, min 20%) — highest net among 6 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: d1-1a45833521 X 23.5% Y 2.2% L 49 stop 7.3% hold 9 buffer 3.0% P 5.3% W 102 — train $138,719 / DD $33,841 / 28e; plateau pass (84% feasible, median 93%, min 0%) — higher training net than the primary, plateau, distinct signature
- lowDd: d1-04b23966e1 X 27.3% Y 0.6% L 59 stop 3.8% hold 6 buffer 4.8% P 9.3% W 69 — train $104,114 / DD $15,613 / 26e; plateau pass (100% feasible, median 86%, min 52%) — lowest DD among plateau candidates keeping the net share, distinct signature

### final (training through 2023-12-29; pool 21879, feasible 11669, beating D1 7409, distinct signatures 4886; min entries 5)

- primary: d1-1ef686e749 X 24.4% Y 2.0% L 49 stop 7.7% hold 9 buffer 2.8% P 6.5% W 103 — train $145,468 / DD $23,383 / 24e; plateau pass (97% feasible, median 93%, min 25%) — highest net among 6 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-15c387627c X 24.4% Y 4.7% L 48 stop 8.0% hold 17 buffer 3.6% P 6.2% W 120 — train $127,705 / DD $19,966 / 18e; plateau pass (100% feasible, median 97%, min 21%) — lowest DD among plateau candidates keeping the net share, distinct signature

## Notes

- none
