# XLY: development selection (generated 2026-10-23T13:18:57.761Z)

Candidates evaluated: 22,344 (Sobol 4096, GA fold1 3072, fold2 3072, fold3 3072, fold4 3072, final 3072). Development window 2017-06-15 → 2023-12-29.

## Control and nominations (development window)

| Role | Parameters | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Best trade | Net w/o best | Interest | Exposure | Avg hold | Plateau (feasible share / median share) | Sparse |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| control (D1) | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | $72,921 | $29,065 | $23,162 | 17 | 9/8 | −$7,776 | −$18,562 | $29,527 | $43,394 | $15,942 | 22% | 31 d | — | no |
| primary | X 21.3% Y 3.5% L 112 stop 3.1% hold 10 buffer 0.8% P 8.4% W 175 | $112,490 | $16,972 | $15,420 | 30 (1 open) | 26/3 | −$10,336 | −$10,609 | $15,121 | $97,369 | $13,592 | 19% | 15 d | pass (97% / 98%) | no |
| alternate-lowDd | X 21.4% Y 4.1% L 126 stop 3.0% hold 6 buffer 1.4% P 9.1% W 188 | $86,163 | $11,366 | $9,588 | 34 | 26/8 | −$5,118 | −$7,656 | $11,399 | $74,764 | $10,518 | 15% | 10 d | pass (100% / 89%) | no |

## Net by year (development)

| Role | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 |
|---|---:|---:|---:|---:|---:|---:|---:|
| control (D1) | $0 (0e) | $7,338 (1e) | $9,685 (0e) | $30,417 (3e) | $0 (0e) | $13,461 (13e) | $12,020 (0e) |
| primary | $0 (0e) | $4,103 (1e) | $12,544 (1e) | $32,907 (9e) | $5,946 (1e) | $27,736 (13e) | $29,253 (5e) |
| alternate-lowDd | $0 (0e) | $3,514 (1e) | $12,275 (1e) | $28,549 (9e) | $8,419 (2e) | $23,189 (17e) | $10,217 (4e) |

## Walk-forward of the selection rule (training-only picks attributed to the next window)

| Fold | Validation | Min entries | D1 | primary pick | lowDd pick | maxNet pick |
|---|---|---:|---|---|---|---|
| fold1 | 2020-01-02 → 2020-12-31 | 2 | $30,417 / DD $20,891 / 3e | −$5,116 / DD $39,615 / 7e (train $34,550 / DD $5,975) | $10,043 / DD $35,120 / 6e (train $29,558 / DD $5,430) | none |
| fold2 | 2021-01-04 → 2021-12-31 | 3 | $0 / DD $0 / 0e | −$9,012 / DD $22,655 / 0e (train $87,309 / DD $22,742) | −$557 / DD $10,915 / 1e (train $75,080 / DD $12,460) | none |
| fold3 | 2022-01-03 → 2022-12-30 | 4 | $13,461 / DD $19,408 / 13e | −$39,055 / DD $49,182 / 20e (train $103,870 / DD $33,387) | −$15,838 / DD $30,983 / 12e (train $91,003 / DD $11,840) | none |
| fold4 | 2023-01-03 → 2023-12-29 | 5 | $12,020 / DD $9,586 / 0e | $0 / DD $0 / 0e (train $88,106 / DD $15,745) | $4,070 / DD $3,866 / 1e (train $71,765 / DD $9,654) | $12,091 / DD $9,555 / 1e (train $95,096 / DD $27,810) |

| Policy | Stitched validation net | D1 stitched | Folds with a pick | Folds ≥ D1 | Pass |
|---|---:|---:|---:|---:|---|
| primary | −$53,182 | $55,897 | 4 | 0 | no |
| lowDd | −$2,282 | $55,897 | 4 | 0 | no |
| maxNet | $12,091 | $55,897 | 1 | 1 | no |

## Fold details

### fold1 (training through 2019-12-31; pool 7169, feasible 4273, beating D1 1170, distinct signatures 1061; min entries 2)

- primary: d1-0ed8a5af64 X 21.1% Y 0.3% L 168 stop 3.8% hold 28 buffer 0.9% P 6.3% W 184 — train $34,550 / DD $5,975 / 4e; plateau pass (100% feasible, median 100%, min 35%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-ebc385a86c X 21.5% Y 0.3% L 168 stop 3.8% hold 24 buffer 2.3% P 7.0% W 184 — train $29,558 / DD $5,430 / 2e; plateau pass (97% feasible, median 100%, min 0%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold2 (training through 2020-12-31; pool 10829, feasible 6649, beating D1 1523, distinct signatures 1247; min entries 3)

- primary: d1-a67485bc6b X 21.6% Y 3.5% L 241 stop 10.8% hold 5 buffer 2.3% P 18.0% W 175 — train $87,309 / DD $22,742 / 3e; plateau pass (94% feasible, median 100%, min 62%) — highest net among 2 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-0360fc638a X 16.3% Y 1.3% L 89 stop 4.1% hold 24 buffer 4.3% P 6.8% W 86 — train $75,080 / DD $12,460 / 13e; plateau pass (94% feasible, median 100%, min 28%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold3 (training through 2021-12-31; pool 14497, feasible 9165, beating D1 3601, distinct signatures 2835; min entries 4)

- primary: d1-02992bf160 X 21.7% Y 1.0% L 231 stop 14.0% hold 5 buffer 1.2% P 18.6% W 13 — train $103,870 / DD $33,387 / 5e; plateau pass (80% feasible, median 100%, min 52%) — no plateau candidate under the preferred DD band; highest net among 9 plateau candidates
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-e2c8b28c0a X 17.3% Y 1.0% L 50 stop 3.8% hold 29 buffer 5.5% P 5.7% W 57 — train $91,003 / DD $11,840 / 17e; plateau pass (93% feasible, median 92%, min 46%) — lowest DD among plateau candidates keeping the net share, distinct signature

### fold4 (training through 2022-12-30; pool 18147, feasible 9600, beating D1 877, distinct signatures 592; min entries 5)

- primary: d1-18d9e09c19 X 29.6% Y 0.6% L 57 stop 8.7% hold 16 buffer 4.4% P 3.9% W 189 — train $88,106 / DD $15,745 / 7e; plateau pass (100% feasible, median 100%, min 61%) — highest net among 6 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: d1-5eb0d2c9de X 22.1% Y 0.1% L 58 stop 6.4% hold 8 buffer 1.3% P 7.6% W 137 — train $95,096 / DD $27,810 / 21e; plateau pass (100% feasible, median 80%, min 64%) — higher training net than the primary, plateau, distinct signature
- lowDd: d1-35ba8ac4ea X 21.5% Y 4.0% L 78 stop 3.0% hold 28 buffer 2.6% P 17.9% W 26 — train $71,765 / DD $9,654 / 16e; plateau pass (93% feasible, median 100%, min 23%) — lowest DD among plateau candidates keeping the net share, distinct signature

### final (training through 2023-12-29; pool 21798, feasible 13045, beating D1 945, distinct signatures 529; min entries 5)

- primary: d1-4190574172 X 21.3% Y 3.5% L 112 stop 3.1% hold 10 buffer 0.8% P 8.4% W 175 — train $112,490 / DD $16,972 / 30e; plateau pass (97% feasible, median 98%, min 32%) — highest net among 10 plateau candidates with DD ≤ $25,000 (10 plateau candidates probed in the net list)
- maxNet: none — the primary is already the highest-net plateau candidate (or no distinct one exists)
- lowDd: d1-a83284695c X 21.4% Y 4.1% L 126 stop 3.0% hold 6 buffer 1.4% P 9.1% W 188 — train $86,163 / DD $11,366 / 34e; plateau pass (100% feasible, median 89%, min 55%) — lowest DD among plateau candidates keeping the net share, distinct signature

## Notes

- none
