# XLE: development selection (generated 2026-10-23T13:21:20.448Z)

Candidates evaluated: 20,306 (Sobol 4096, GA fold1 3072, fold2 3072, fold3 3072, fold4 3072, final 1440). Development window 2017-06-15 → 2023-12-29.

## Control and nominations (development window)

| Role | Parameters | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau (feasible share / median share) | Sparse |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $26,974 | $72,402 | $69,371 | 32 | 12/20 | −$35,785 | −$35,900 | $23,616 | $3,358 | $19,107 | 26% | 20 d | — | no |
| primary | X 28.0% Y 2.7% L 52 stop 6.5% hold 4 buffer 0.0% P 13.1% W 47 | $154,448 | $24,861 | $24,453 | 23 | 16/7 | −$9,596 | −$16,743 | $35,262 | $119,185 | $11,181 | 16% | 16 d | pass (86% / 92%) | no |
| alternate-lowDd | X 29.7% Y 2.7% L 72 stop 5.2% hold 4 buffer 0.0% P 13.2% W 62 | $120,741 | $22,438 | $21,331 | 25 | 18/7 | −$9,596 | −$16,743 | $18,475 | $102,266 | $6,630 | 9% | 9 d | pass (89% / 96%) | no |

## Net by year (development)

| Role | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|
| control (D1) | $0 (0e) | −$9,877 (2e) | $6,258 (1e) | −$3,883 (21e) | $7,674 (1e) | $26,802 (7e) | $0 (0e) |
| primary | $0 (0e) | $4,436 (1e) | $9,066 (0e) | $91,543 (17e) | $16,795 (2e) | $32,608 (3e) | $0 (0e) |
| alternate-lowDd | $0 (0e) | $4,436 (1e) | $7,078 (0e) | $69,484 (20e) | $18,429 (2e) | $21,313 (2e) | $0 (0e) |

## Walk-forward of the selection rule (training-only picks attributed to the next window)

| Fold | Validation | Min entries | D1 | primary pick | lowDd pick | maxNet pick |
|---|---|---:|---|---|---|---|
| fold1 | 2020-01-02 → 2020-12-31 | 2 | −$3,883 / DD $61,928 / 21e | −$19,195 / DD $64,090 / 8e (train $24,803 / DD $5,190) | −$43,454 / DD $68,327 / 10e (train $20,304 / DD $4,085) | none |
| fold2 | 2021-01-04 → 2021-12-31 | 3 | $7,674 / DD $14,690 / 1e | $0 / DD $0 / 0e (train $100,857 / DD $24,861) | $0 / DD $0 / 0e (train $84,772 / DD $22,438) | none |
| fold3 | 2022-01-03 → 2022-12-30 | 4 | $26,802 / DD $17,239 / 7e | $32,608 / DD $9,643 / 3e (train $119,019 / DD $24,861) | $0 / DD $0 / 0e (train $99,478 / DD $22,438) | none |
| fold4 | 2023-01-03 → 2023-12-29 | 5 | $0 / DD $0 / 0e | $0 / DD $0 / 0e (train $154,448 / DD $24,861) | $0 / DD $0 / 0e (train $120,741 / DD $22,438) | none |

| Policy | Stitched validation net | D1 stitched | Folds with a pick | Folds ≥ D1 | Pass |
|---|---:|---:|---:|---:|---|
| primary | $13,414 | $30,593 | 4 | 2 | no |
| lowDd | −$43,454 | $30,593 | 4 | 1 | no |
| maxNet | $0 | $30,593 | 0 | 0 | no |

## Fold details

### fold1 (training through 2019-12-31; pool 7169, feasible 4776, beating D1 3557, distinct signatures 3249; min entries 2)

- primary: d1-17631e897b X 21.3% Y 0.1% L 24 stop 4.1% hold 23 buffer 5.7% P 19.2% W 167 — train $24,803 / DD $5,190 / 2e; plateau pass (88% feasible, median 97%, min 0%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-881dd4c38c X 20.7% Y 0.3% L 28 stop 3.4% hold 13 buffer 5.5% P 19.1% W 190 — train $20,304 / DD $4,085 / 2e; plateau pass (96% feasible, median 100%, min 55%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold2 (training through 2020-12-31; pool 10725, feasible 2787, beating D1 2778, distinct signatures 2247; min entries 3)

- primary: d1-5a9f7d02aa X 29.9% Y 2.7% L 58 stop 6.5% hold 4 buffer 0.4% P 13.6% W 66 — train $100,857 / DD $24,861 / 17e; plateau pass (89% feasible, median 97%, min 25%) — highest net among 7 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-5c1ca115c4 X 29.9% Y 2.7% L 72 stop 5.0% hold 4 buffer 0.9% P 3.6% W 59 — train $84,772 / DD $22,438 / 25e; plateau pass (89% feasible, median 94%, min 46%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold3 (training through 2021-12-31; pool 14350, feasible 5936, beating D1 5890, distinct signatures 4137; min entries 4)

- primary: d1-09e8721250 X 27.3% Y 2.7% L 58 stop 6.5% hold 4 buffer 0.0% P 13.3% W 62 — train $119,019 / DD $24,861 / 20e; plateau pass (83% feasible, median 95%, min 56%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-050b63635a X 30.0% Y 2.7% L 72 stop 5.0% hold 4 buffer 0.1% P 13.3% W 66 — train $99,478 / DD $22,438 / 22e; plateau pass (89% feasible, median 96%, min 68%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold4 (training through 2022-12-30; pool 17972, feasible 8858, beating D1 8200, distinct signatures 5404; min entries 5)

- primary: d1-008ac96b01 X 28.0% Y 2.7% L 52 stop 6.5% hold 4 buffer 0.0% P 13.1% W 47 — train $154,448 / DD $24,861 / 23e; plateau pass (86% feasible, median 92%, min 37%) — highest net among 9 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-07222a9684 X 29.5% Y 2.7% L 72 stop 5.2% hold 4 buffer 0.0% P 13.3% W 71 — train $120,741 / DD $22,438 / 25e; plateau pass (89% feasible, median 96%, min 57%) — lowest DD among plateau candidates keeping the net share, distinct signature

### final (training through 2023-12-29; pool 19963, feasible 10394, beating D1 9727, distinct signatures 6206; min entries 5)

- primary: d1-008ac96b01 X 28.0% Y 2.7% L 52 stop 6.5% hold 4 buffer 0.0% P 13.1% W 47 — train $154,448 / DD $24,861 / 23e; plateau pass (86% feasible, median 92%, min 37%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-034134b5a9 X 29.7% Y 2.7% L 72 stop 5.2% hold 4 buffer 0.0% P 13.2% W 62 — train $120,741 / DD $22,438 / 25e; plateau pass (89% feasible, median 96%, min 72%) — lowest DD among plateau candidates keeping the net share, distinct signature

## Notes

- none
