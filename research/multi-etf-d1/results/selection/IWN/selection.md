# IWN: development selection (generated 2026-10-23T13:19:41.727Z)

Candidates evaluated: 17,841 (Sobol 4096, GA fold1 3072, fold2 3072, fold3 3072, fold4 1152, final 1152). Development window 2017-06-15 → 2023-12-29.

## Control and nominations (development window)

| Role | Parameters | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau (feasible share / median share) | Sparse |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $20,255 | $41,879 | $38,032 | 10 | 5/5 | −$21,857 | −$23,311 | $20,462 | −$206 | $7,775 | 11% | 26 d | — | no |
| primary | X 24.9% Y 0.6% L 243 stop 3.1% hold 5 buffer 0.0% P 12.4% W 191 | $111,181 | $16,875 | $13,033 | 38 | 22/16 | −$6,537 | −$11,608 | $16,407 | $94,774 | $10,729 | 15% | 9 d | pass (100% / 91%) | no |
| alternate-lowDd | X 27.4% Y 0.4% L 96 stop 3.5% hold 4 buffer 5.9% P 12.7% W 191 | $84,673 | $15,180 | $12,040 | 22 | 15/7 | −$6,537 | −$6,537 | $19,324 | $65,349 | $5,364 | 7% | 8 d | pass (100% / 89%) | no |

## Net by year (development)

| Role | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|
| control (D1) | $0 (0e) | −$194 (2e) | $5,999 (1e) | $14,450 (7e) | $0 (0e) | $0 (0e) | $0 (0e) |
| primary | $0 (0e) | $3,753 (1e) | $20,617 (1e) | $60,773 (25e) | $8,244 (2e) | $20,828 (8e) | −$3,034 (1e) |
| alternate-lowDd | $0 (0e) | $0 (0e) | $0 (0e) | $75,435 (18e) | $8,892 (2e) | $346 (2e) | $0 (0e) |

## Walk-forward of the selection rule (training-only picks attributed to the next window)

| Fold | Validation | Min entries | D1 | primary pick | lowDd pick | maxNet pick |
|---|---|---:|---|---|---|---|
| fold1 | 2020-01-02 → 2020-12-31 | 2 | $14,450 / DD $31,984 / 7e | $3,844 / DD $19,357 / 26e (train $29,814 / DD $4,205) | $18,108 / DD $32,309 / 23e (train $23,033 / DD $3,911) | none |
| fold2 | 2021-01-04 → 2021-12-31 | 3 | $0 / DD $0 / 0e | $7,747 / DD $4,534 / 2e (train $79,374 / DD $16,392) | $0 / DD $0 / 0e (train $62,788 / DD $14,849) | none |
| fold3 | 2022-01-03 → 2022-12-30 | 4 | $0 / DD $0 / 0e | $17,499 / DD $12,539 / 9e (train $92,981 / DD $16,611) | $742 / DD $5,167 / 2e (train $80,259 / DD $15,180) | none |
| fold4 | 2023-01-03 → 2023-12-29 | 5 | $0 / DD $0 / 0e | −$3,034 / DD $4,807 / 1e (train $114,215 / DD $16,875) | −$3,316 / DD $4,793 / 1e (train $107,062 / DD $15,455) | none |

| Policy | Stitched validation net | D1 stitched | Folds with a pick | Folds ≥ D1 | Pass |
|---|---:|---:|---:|---:|---|
| primary | $26,055 | $14,450 | 4 | 2 | yes |
| lowDd | $15,534 | $14,450 | 4 | 3 | yes |
| maxNet | $0 | $14,450 | 0 | 0 | no |

## Fold details

### fold1 (training through 2019-12-31; pool 7169, feasible 4539, beating D1 2358, distinct signatures 2137; min entries 2)

- primary: d1-11b5f9cc73 X 26.2% Y 0.1% L 171 stop 3.1% hold 3 buffer 0.0% P 9.9% W 187 — train $29,814 / DD $4,205 / 3e; plateau pass (91% feasible, median 98%, min 0%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-55eff8fcc5 X 23.8% Y 0.1% L 182 stop 3.0% hold 7 buffer 2.8% P 12.5% W 188 — train $23,033 / DD $3,911 / 2e; plateau pass (85% feasible, median 100%, min -5%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold2 (training through 2020-12-31; pool 10768, feasible 7112, beating D1 5603, distinct signatures 3742; min entries 3)

- primary: d1-8c901035b9 X 24.9% Y 0.8% L 241 stop 3.0% hold 5 buffer 0.0% P 12.5% W 191 — train $79,374 / DD $16,392 / 25e; plateau pass (100% feasible, median 92%, min 21%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-0398e959a9 X 18.5% Y 5.0% L 246 stop 3.5% hold 5 buffer 0.1% P 15.2% W 78 — train $62,788 / DD $14,849 / 19e; plateau pass (100% feasible, median 100%, min 79%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold3 (training through 2021-12-31; pool 14348, feasible 10573, beating D1 9125, distinct signatures 5301; min entries 4)

- primary: d1-1b7c3495a4 X 24.8% Y 0.8% L 249 stop 3.1% hold 5 buffer 0.0% P 12.4% W 191 — train $92,981 / DD $16,611 / 26e; plateau pass (100% feasible, median 91%, min 36%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-0033d31434 X 27.4% Y 0.3% L 97 stop 3.4% hold 4 buffer 5.8% P 12.7% W 191 — train $80,259 / DD $15,180 / 22e; plateau pass (100% feasible, median 89%, min 32%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold4 (training through 2022-12-30; pool 15986, feasible 12047, beating D1 10945, distinct signatures 6207; min entries 5)

- primary: d1-32701b9d19 X 24.9% Y 0.6% L 243 stop 3.1% hold 5 buffer 0.0% P 12.4% W 191 — train $114,215 / DD $16,875 / 37e; plateau pass (100% feasible, median 91%, min 56%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-26bbd0bc05 X 24.9% Y 0.9% L 239 stop 3.0% hold 5 buffer 0.0% P 12.7% W 198 — train $107,062 / DD $15,455 / 32e; plateau pass (100% feasible, median 92%, min 45%) — lowest DD among plateau candidates keeping the net share, distinct signature

### final (training through 2023-12-29; pool 17535, feasible 13576, beating D1 12392, distinct signatures 6834; min entries 5)

- primary: d1-32701b9d19 X 24.9% Y 0.6% L 243 stop 3.1% hold 5 buffer 0.0% P 12.4% W 191 — train $111,181 / DD $16,875 / 38e; plateau pass (100% feasible, median 91%, min 56%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-08f3867d64 X 27.4% Y 0.4% L 96 stop 3.5% hold 4 buffer 5.9% P 12.7% W 191 — train $84,673 / DD $15,180 / 22e; plateau pass (100% feasible, median 89%, min 12%) — lowest DD among plateau candidates keeping the net share, distinct signature

## Notes

- none
