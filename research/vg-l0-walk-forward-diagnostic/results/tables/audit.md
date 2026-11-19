# Experiment audit: folds, selections, budgets and reconciled walk-forward paths

Sealed records of the audited studies; every slice net and DD recomputed independently from the fold mark caches (gate G4, `results/gates/gates.json`). DD = maximum minute drawdown of the marked net on the fixed $100,000; slice DD is reset at the cutoff close; the sequential DD is not reset. Budgets per cutoff: distinct proposals / requested search evaluations (the audited studies' budget tables). Training statistics: centre on the training door; confirmation family 3 × 128 draws (p90 DD / breach share / worst DD).

## Fold primaries (each re-optimized at its cutoff; selection committed before the slice opened)

| Path | Fold → slice | Fold primary (structure, toggles) | Qualified / members | Budget at cutoff | Training net | Training DD | Conf. p90 DD / breach / worst | Slice net | Slice DD (reset) | Slice DD peak → trough | Switch charge |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5B-L0 | C19 → 2020-01-02 → 2021-12-31 | `C19/L0/indep/R2/B#1 profit` (B) | 20/20 | 9,472 / 101,600 | $105,653.22 | $17,336.00 | $17,972.93 / 0% / $26,410.03 | $9,083.51 | $39,527.29 | 2020-02-19 17:49Z → 2020-03-23 15:44Z | $0.00 |
| 5B-L0 | C21 → 2022-01-03 → 2023-12-29 | `C21/L0/indep/R1/V#1 profit` (V) | 20/20 | 9,728 / 100,913 | $218,446.88 | $21,765.01 | $22,836.05 / 2.86% / $43,561.72 | −$38,341.52 | $57,259.44 | 2022-01-04 14:30Z → 2022-10-13 13:32Z | $50.00 |
| 5B-L0 | C23 → 2024-01-02 → 2024-12-31 | `C23/L0/indep/R2/G#1 profit` (G) | 19/20 | 12,288 / 92,774 | $182,470.57 | $24,187.90 | $27,769.87 / 0.78% / $37,651.87 | $0.00 | $0.00 | — → — | $50.00 |
| SES | C19 → 2020-01-02 → 2021-12-31 | `C19/ses/indep/R6/V1#1 profit` (V) | 59/60 | 28,928 / 304,047 | $123,812.69 | $26,368.33 | $29,134.03 / 0% / $33,458.86 | $45,828.28 | $55,449.12 | 2020-02-19 17:49Z → 2020-03-16 13:53Z | $0.00 |
| SES | C21 → 2022-01-03 → 2023-12-29 | `C21/ses/indep/R1/V3#1 profit` (V) | 60/60 | 26,880 / 276,504 | $240,514.68 | $17,744.39 | $31,101.96 / 1.56% / $38,022.60 | −$25,018.62 | $57,489.79 | 2022-01-04 14:30Z → 2022-09-26 17:39Z | $100.00 |
| SES | C23 → 2024-01-02 → 2024-12-31 | `C23/ses/indep/R5/V2#1 profit` (V) | 59/60 | 31,488 / 252,267 | $201,920.45 | $21,725.52 | $28,616.64 / 1.56% / $41,025.57 | $4,627.88 | $20,299.72 | 2024-05-28 17:40Z → 2024-08-05 13:30Z | $100.00 |
| B1 | C19 → 2020-01-02 → 2021-12-31 | `C19/B1/R21/V2#1 profit` (V, toggles 111) | 314/320 | 151,040 / 1,615,667 | $148,747.23 | $24,916.05 | $26,108.54 / 0% / $32,726.17 | $89,021.67 | $48,255.05 | 2020-02-19 17:49Z → 2020-03-16 13:53Z | $0.00 |
| B1 | C21 → 2022-01-03 → 2023-12-29 | `C21/B1/R9/V3#1 profit` (V, toggles 101) | 316/320 | 157,440 / 1,661,821 | $241,331.83 | $34,041.80 | $34,633.28 / 8.85% / $59,556.41 | −$23,908.85 | $79,663.64 | 2022-01-04 14:30Z → 2022-09-28 13:56Z | $100.00 |
| B1 | C23 → 2024-01-02 → 2024-12-31 | `C23/B1/R5/V3#1 profit` (V, toggles 000) | 315/320 | 161,280 / 1,264,436 | $230,641.99 | $23,103.49 | $30,031.39 / 0% / $34,619.64 | $6,494.57 | $14,520.92 | 2024-03-08 15:30Z → 2024-04-19 19:46Z | $100.00 |
| B2 | C19 → 2020-01-02 → 2021-12-31 | `C19/B2-g/F1/R8/V3#1 profit` (V, toggles 011) | 160/160 | 143,616 / 1,494,406 | $108,245.31 | $13,116.98 | $28,134.00 / 0% / $32,090.62 | $48,104.08 | $44,645.13 | 2020-02-19 17:49Z → 2020-03-16 13:53Z | $0.00 |
| B2 | C21 → 2022-01-03 → 2023-12-29 | `C21/B2-g/F1/R7/V2#1 profit` (V, toggles 111) | 133/160 | 143,872 / 1,531,188 | $248,305.56 | $25,817.85 | $32,044.29 / 2.08% / $37,964.28 | −$63,611.93 | $74,307.21 | 2022-01-04 14:30Z → 2022-09-01 15:00Z | $100.00 |
| B2 | C23 → 2024-01-02 → 2024-12-31 | `C23/B2-g/F1/R8/V3#1 profit` (V, toggles 000) | 104/160 | 145,408 / 1,430,234 | $262,019.94 | $27,319.27 | $34,855.68 / 9.9% / $53,588.06 | $4,141.11 | $34,117.37 | 2024-07-15 15:21Z → 2024-08-05 13:30Z | $50.00 |

## The walk-forward paths (sealed verdict: chronologically unsupported in all four)

| Path | Procedure | Net 2020–2024 | Sequential DD | Peak → trough | Recovered by | Recomputed |
|---|---:|---:|---:|---:|---:|---:|
| 5B-L0 | 5B L0 arm, independent procedure (calendar holds; V/G/B cells; 2 replicates) | −$29,358.01 | $67,214.22 | 2020-09-10 14:02Z → 2022-10-13 13:32Z | — | equal to the cent |
| SES | Trading-session study, independent procedure (session holds; V only; 6 replicates × V1–V3) | $25,237.54 | $58,866.62 | 2021-11-22 15:23Z → 2022-09-26 17:39Z | — | equal to the cent |
| B1 | Shadow eligibility B1, fresh joint (calendar; V only; 3 toggles searched; 32 replicates × V1–V3) | $71,407.39 | $80,475.04 | 2021-11-22 15:23Z → 2022-09-28 13:56Z | — | equal to the cent |
| B2 | Shadow eligibility B2, fresh sequential (D1 pair + toggles, then Growth·VGT; 8 replicates per step) | −$11,516.74 | $74,307.21 | 2022-01-04 14:30Z → 2022-09-01 15:00Z | — | equal to the cent |

## Role and seed-level paths of the same procedures (sealed; reporting only)

| Path | Policy | Net | Sequential DD | Verdict on DD |
|---|---:|---:|---:|---:|
| 5B-L0 | role robust-profit | −$1,266.26 | $39,702.77 | breach |
| 5B-L0 | role balanced | −$16,236.76 | $39,527.29 | breach |
| 5B-L0 | role lower-drawdown | $12,370.54 | $38,593.64 | breach |
| 5B-L0 | 2 seed-level replicate paths | −$48,159.25 … $12,675.57 | $67,003.87 … $111,005.68 | 0 of 2 supported |
| SES | role robust-profit | −$10,860.62 | $72,492.01 | breach |
| SES | role balanced | $70,875.24 | $60,468.54 | breach |
| SES | role lower-drawdown | −$17,306.59 | $44,180.83 | breach |
| SES | 6 seed-level replicate paths | −$52,518.29 … $58,013.42 | $45,120.03 … $79,555.37 | 0 of 6 supported |
| B1 | role robust-profit | −$484.45 | $69,378.85 | breach |
| B1 | role balanced | −$2,562.64 | $42,017.97 | breach |
| B1 | role lower-drawdown | $56,690.12 | $67,968.63 | breach |
| B1 | 32 seed-level replicate paths | −$52,208.62 … $162,847.79 | $44,835.19 … $107,134.10 | 0 of 32 supported |
| B2 | role robust-profit | $70,696.63 | $61,349.92 | breach |
| B2 | role balanced | $36,301.61 | $78,831.87 | breach |
| B2 | role lower-drawdown | $78,731.36 | $67,166.85 | breach |
| B2 | 8 seed-level replicate paths | −$42,384.66 … $57,036.78 | $59,404.51 … $76,940.13 | 0 of 8 supported |

## Other chronological tests of related procedures (sealed headlines)

| Study | Record | Net 2020–2024 | Sequential DD | Peak → trough |
|---|---:|---:|---:|---:|
| Priority 2 (VGT D1 + VGT Growth) | `research/vgt-d1-growth-joint/results/folds/sequential.json` | −$1,691.64 | $64,570.38 | 2020-09-02 13:30Z → 2024-08-05 13:30Z |
| Priority 3 (VGT + GDX D1 + Growth, four components) | `research/vg-d1-growth-joint/results/folds/sequential.json` | −$61,544.61 | $102,257.90 | 2020-03-03 18:04Z → 2023-01-06 14:45Z |
| Priority 3B (4.6× larger independent search) | `research/vg-d1-growth-expanded/results/folds/sequential.json` | $13,105.71 | $60,874.87 | 2020-02-19 17:49Z → 2020-03-17 13:44Z |
| Priority 4A (GDX Growth alone) | `research/gdx-growth-standalone/results/folds/sequential.json` | −$16,537.03 | $47,820.43 | 2022-02-24 14:30Z → 2022-09-29 14:19Z |
| Priority 7A (ETF and Growth phenotype) | `research/growth-etf-screening/results/folds/sequential.json` | $1,292.58 | $57,711.81 | 2021-02-16 15:32Z → 2023-03-13 13:38Z |
| 5B L1 arm (other Growth lifecycle) | `research/vg-lifecycle-matched-optimization/results/folds/sequential.json` | −$30,032.46 | $106,883.44 | 2020-02-19 17:49Z → 2022-09-26 17:39Z |
| 5B L2 arm (other Growth lifecycle) | `research/vg-lifecycle-matched-optimization/results/folds/sequential.json` | $49,518.36 | $29,279.04 | 2020-01-24 14:59Z → 2020-03-23 15:44Z |
| Session study fold selections replayed under calendar holds (cross row, report-only) | `research/vg-l0-session-hold/results/folds/sequential.json` | $75,529.19 | $47,761.66 | 2022-02-24 14:30Z → 2022-09-26 17:39Z |
