# XLF: development selection (generated 2026-10-23T13:20:30.542Z)

Candidates evaluated: 18,163 (Sobol 4096, GA fold1 3072, fold2 3072, fold3 2976, fold4 1152, final 1152). Development window 2017-06-15 → 2023-12-29.

## Control and nominations (development window)

| Role | Parameters | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau (feasible share / median share) | Sparse |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $20,729 | $32,211 | $30,762 | 14 | 6/8 | −$12,084 | −$18,686 | $17,034 | $3,694 | $9,041 | 12% | 21 d | — | no |
| primary | X 25.4% Y 1.6% L 200 stop 4.0% hold 8 buffer 0.6% P 4.1% W 19 | $121,499 | $17,071 | $13,399 | 30 | 21/9 | −$3,917 | −$12,261 | $25,454 | $96,045 | $20,011 | 28% | 22 d | pass (100% / 90%) | no |
| alternate-lowDd | X 25.1% Y 0.4% L 213 stop 3.7% hold 5 buffer 0.8% P 7.3% W 15 | $99,222 | $12,762 | $7,771 | 30 | 20/10 | −$6,702 | −$8,055 | $13,566 | $85,656 | $11,693 | 16% | 13 d | pass (96% / 93%) | no |

## Net by year (development)

| Role | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|
| control (D1) | $0 (0e) | $4,127 (1e) | $3,175 (0e) | $14,322 (7e) | $0 (0e) | −$895 (6e) | $0 (0e) |
| primary | $0 (0e) | $6,165 (1e) | $10,805 (3e) | $70,768 (16e) | $19,977 (2e) | $12,865 (8e) | $919 (0e) |
| alternate-lowDd | $0 (0e) | $6,081 (1e) | $13,391 (1e) | $61,770 (20e) | $0 (0e) | $17,981 (8e) | $0 (0e) |

## Walk-forward of the selection rule (training-only picks attributed to the next window)

| Fold | Validation | Min entries | D1 | primary pick | lowDd pick | maxNet pick |
|---|---|---:|---|---|---|---|
| fold1 | 2020-01-02 → 2020-12-31 | 2 | $14,322 / DD $27,419 / 7e | −$10,344 / DD $47,065 / 13e (train $42,916 / DD $5,586) | −$18,272 / DD $46,748 / 10e (train $32,485 / DD $3,806) | none |
| fold2 | 2021-01-04 → 2021-12-31 | 3 | $0 / DD $0 / 0e | $11,303 / DD $5,999 / 2e (train $84,577 / DD $13,664) | $0 / DD $0 / 0e (train $66,145 / DD $12,762) | none |
| fold3 | 2022-01-03 → 2022-12-30 | 4 | −$895 / DD $14,020 / 6e | $8,624 / DD $7,972 / 7e (train $108,498 / DD $13,598) | $11,183 / DD $10,524 / 8e (train $95,743 / DD $12,762) | none |
| fold4 | 2023-01-03 → 2023-12-29 | 5 | $0 / DD $0 / 0e | $0 / DD $0 / 0e (train $119,748 / DD $13,598) | $0 / DD $0 / 0e (train $97,558 / DD $12,762) | none |

| Policy | Stitched validation net | D1 stitched | Folds with a pick | Folds ≥ D1 | Pass |
|---|---:|---:|---:|---:|---|
| primary | $9,584 | $13,427 | 4 | 3 | no |
| lowDd | −$7,089 | $13,427 | 4 | 3 | no |
| maxNet | $0 | $13,427 | 0 | 0 | no |

## Fold details

### fold1 (training through 2019-12-31; pool 7169, feasible 4403, beating D1 3205, distinct signatures 2889; min entries 2)

- primary: d1-01dfe6f7ed X 24.1% Y 0.1% L 80 stop 3.1% hold 28 buffer 5.3% P 5.9% W 67 — train $42,916 / DD $5,586 / 5e; plateau pass (93% feasible, median 100%, min 0%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-32868e267f X 23.9% Y 0.1% L 67 stop 3.1% hold 21 buffer 5.0% P 7.7% W 138 — train $32,485 / DD $3,806 / 3e; plateau pass (86% feasible, median 100%, min 0%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold2 (training through 2020-12-31; pool 10791, feasible 6371, beating D1 4015, distinct signatures 2648; min entries 3)

- primary: d1-316fcee640 X 23.1% Y 2.3% L 199 stop 4.0% hold 4 buffer 0.0% P 4.6% W 82 — train $84,577 / DD $13,664 / 23e; plateau pass (100% feasible, median 100%, min 39%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-4ece885cd1 X 23.4% Y 0.4% L 148 stop 3.1% hold 5 buffer 0.5% P 7.3% W 63 — train $66,145 / DD $12,762 / 25e; plateau pass (100% feasible, median 98%, min 58%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold3 (training through 2021-12-31; pool 14327, feasible 9686, beating D1 7423, distinct signatures 4622; min entries 4)

- primary: d1-0336b51c64 X 25.4% Y 2.2% L 201 stop 4.0% hold 4 buffer 0.7% P 4.5% W 20 — train $108,498 / DD $13,598 / 25e; plateau pass (100% feasible, median 92%, min 22%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-9b56c2df20 X 25.4% Y 0.7% L 200 stop 4.0% hold 5 buffer 0.6% P 4.6% W 19 — train $95,743 / DD $12,762 / 24e; plateau pass (93% feasible, median 89%, min 51%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold4 (training through 2022-12-30; pool 16050, feasible 11178, beating D1 9426, distinct signatures 5538; min entries 5)

- primary: d1-24d2e5d6c8 X 25.2% Y 2.2% L 212 stop 4.0% hold 4 buffer 0.3% P 4.5% W 19 — train $119,748 / DD $13,598 / 33e; plateau pass (100% feasible, median 94%, min 35%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-a64094f331 X 25.1% Y 0.4% L 213 stop 3.7% hold 5 buffer 0.3% P 7.3% W 15 — train $97,558 / DD $12,762 / 30e; plateau pass (96% feasible, median 91%, min 68%) — lowest DD among plateau candidates keeping the net share, distinct signature

### final (training through 2023-12-29; pool 17711, feasible 12812, beating D1 10899, distinct signatures 6070; min entries 5)

- primary: d1-901123307b X 25.4% Y 1.6% L 200 stop 4.0% hold 8 buffer 0.6% P 4.1% W 19 — train $121,499 / DD $17,071 / 30e; plateau pass (100% feasible, median 90%, min 32%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-ce32ec913a X 25.1% Y 0.4% L 213 stop 3.7% hold 5 buffer 0.8% P 7.3% W 15 — train $99,222 / DD $12,762 / 30e; plateau pass (96% feasible, median 93%, min 66%) — lowest DD among plateau candidates keeping the net share, distinct signature

## Notes

- none
