# IWM: development selection (generated 2026-10-23T13:15:35.286Z)

Candidates evaluated: 20,089 (Sobol 4096, GA fold1 3072, fold2 2880, fold3 3072, fold4 3072, final 1152). Development window 2017-06-15 → 2023-12-29.

## Control and nominations (development window)

| Role | Parameters | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau (feasible share / median share) | Sparse |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $13,778 | $39,694 | $35,112 | 12 | 6/6 | −$21,101 | −$24,239 | $14,016 | −$239 | $11,060 | 15% | 31 d | — | no |
| primary | X 27.3% Y 0.4% L 199 stop 3.3% hold 11 buffer 5.8% P 5.5% W 127 | $120,856 | $14,910 | $13,937 | 38 | 28/10 | −$6,256 | −$8,926 | $19,365 | $101,490 | $15,762 | 22% | 14 d | pass (100% / 96%) | no |
| alternate-lowDd | X 28.3% Y 0.5% L 211 stop 3.3% hold 13 buffer 5.9% P 5.5% W 96 | $106,642 | $13,303 | $9,990 | 33 | 25/8 | −$2,475 | −$7,549 | $13,971 | $92,670 | $12,386 | 17% | 12 d | pass (100% / 97%) | no |

## Net by year (development)

| Role | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|
| control (D1) | $0 (0e) | −$3,525 (2e) | $6,406 (1e) | $7,248 (6e) | $0 (0e) | $3,649 (3e) | $0 (0e) |
| primary | $0 (0e) | $5,327 (1e) | $12,942 (1e) | $55,247 (15e) | $19,242 (8e) | $24,122 (12e) | $3,975 (1e) |
| alternate-lowDd | $0 (0e) | $0 (0e) | $0 (0e) | $52,800 (15e) | $21,158 (6e) | $28,805 (11e) | $3,879 (1e) |

## Walk-forward of the selection rule (training-only picks attributed to the next window)

| Fold | Validation | Min entries | D1 | primary pick | lowDd pick | maxNet pick |
|---|---|---:|---|---|---|---|
| fold1 | 2020-01-02 → 2020-12-31 | 2 | $7,248 / DD $30,396 / 6e | $10,326 / DD $40,162 / 10e (train $33,379 / DD $6,432) | $21,095 / DD $24,306 / 13e (train $26,817 / DD $4,471) | none |
| fold2 | 2021-01-04 → 2021-12-31 | 3 | $0 / DD $0 / 0e | $15,249 / DD $36,609 / 0e (train $77,837 / DD $20,676) | $0 / DD $0 / 0e (train $66,410 / DD $13,303) | none |
| fold3 | 2022-01-03 → 2022-12-30 | 4 | $3,649 / DD $15,154 / 3e | −$15,395 / DD $20,776 / 1e (train $81,450 / DD $34,820) | $8,302 / DD $14,206 / 9e (train $61,998 / DD $13,303) | none |
| fold4 | 2023-01-03 → 2023-12-29 | 5 | $0 / DD $0 / 0e | $3,975 / DD $4,856 / 1e (train $116,881 / DD $14,910) | $0 / DD $0 / 0e (train $98,491 / DD $13,303) | none |

| Policy | Stitched validation net | D1 stitched | Folds with a pick | Folds ≥ D1 | Pass |
|---|---:|---:|---:|---:|---|
| primary | $14,154 | $10,897 | 4 | 3 | yes |
| lowDd | $29,398 | $10,897 | 4 | 4 | yes |
| maxNet | $0 | $10,897 | 0 | 0 | no |

## Fold details

### fold1 (training through 2019-12-31; pool 7169, feasible 4515, beating D1 3014, distinct signatures 2741; min entries 2)

- primary: d1-7f57ad7105 X 27.2% Y 0.1% L 142 stop 3.5% hold 17 buffer 0.0% P 8.3% W 70 — train $33,379 / DD $6,432 / 3e; plateau pass (85% feasible, median 98%, min 0%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-2779c9acbc X 26.0% Y 0.3% L 232 stop 3.1% hold 6 buffer 3.9% P 9.3% W 98 — train $26,817 / DD $4,471 / 3e; plateau pass (87% feasible, median 100%, min 2%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold2 (training through 2020-12-31; pool 10621, feasible 6339, beating D1 5523, distinct signatures 4483; min entries 3)

- primary: d1-10b5efb421 X 27.6% Y 0.1% L 95 stop 14.9% hold 3 buffer 0.3% P 4.8% W 69 — train $77,837 / DD $20,676 / 3e; plateau pass (92% feasible, median 100%, min 77%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-c2246c182a X 27.3% Y 0.7% L 130 stop 3.3% hold 8 buffer 2.7% P 9.4% W 81 — train $66,410 / DD $13,303 / 14e; plateau pass (93% feasible, median 99%, min 63%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold3 (training through 2021-12-31; pool 14228, feasible 7503, beating D1 6724, distinct signatures 4694; min entries 4)

- primary: d1-1c55e1242c X 29.7% Y 0.7% L 21 stop 15.0% hold 5 buffer 4.5% P 12.8% W 96 — train $81,450 / DD $34,820 / 4e; plateau pass (81% feasible, median 100%, min 49%) — no plateau candidate under the preferred DD band; highest net among 10 plateau candidates
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-0ddfe4a642 X 24.7% Y 0.4% L 159 stop 3.4% hold 13 buffer 3.8% P 8.2% W 98 — train $61,998 / DD $13,303 / 21e; plateau pass (93% feasible, median 100%, min 43%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold4 (training through 2022-12-30; pool 17856, feasible 8107, beating D1 7241, distinct signatures 5790; min entries 5)

- primary: d1-00ba45a827 X 27.3% Y 0.4% L 199 stop 3.3% hold 11 buffer 5.8% P 5.5% W 127 — train $116,881 / DD $14,910 / 37e; plateau pass (100% feasible, median 96%, min 36%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-2675bcf7e4 X 24.8% Y 0.5% L 134 stop 3.2% hold 13 buffer 3.9% P 7.0% W 128 — train $98,491 / DD $13,303 / 29e; plateau pass (97% feasible, median 99%, min 44%) — lowest DD among plateau candidates keeping the net share, distinct signature

### final (training through 2023-12-29; pool 19588, feasible 9830, beating D1 8989, distinct signatures 6570; min entries 5)

- primary: d1-00ba45a827 X 27.3% Y 0.4% L 199 stop 3.3% hold 11 buffer 5.8% P 5.5% W 127 — train $120,856 / DD $14,910 / 38e; plateau pass (100% feasible, median 96%, min 35%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-fe526c994c X 28.3% Y 0.5% L 211 stop 3.3% hold 13 buffer 5.9% P 5.5% W 96 — train $106,642 / DD $13,303 / 33e; plateau pass (100% feasible, median 97%, min 34%) — lowest DD among plateau candidates keeping the net share, distinct signature

## Notes

- none
