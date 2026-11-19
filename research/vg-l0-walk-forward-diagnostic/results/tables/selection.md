# Selection trace: why each fold primary was chosen, and what its cohort did next

From the sealed selection and fold-evaluation records (`results/selection/selection.json`). Every slice figure was published by the audited study before this diagnostic; nothing here could have been selected at the cutoff (hindsight, report-only). "Evaluated rows" = every row the audited fold stage evaluated on the slice under its own convention (role holders and seed-level replicate primaries).

## The fold primaries in their qualified sets

| Path | Fold | Primary | Qualified | Rank-1 margin over #2 | Spread #1–#10 | Training lots / episodes | Top-episode share | Unrealized share at cutoff | Share earned in last 2 training years | Conf. p90 DD / breach / worst-10% mean | Evaluated rows breaching | Primary's slice rank by net |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5B-L0 | C19 | `C19/L0/indep/R2/B#1 profit` | 20 | $4,920.47 | $17,558.08 | 4 / 3 | 43.96% | 40.73% | 49.22% | $17,972.93 / 0% / $19,575.33 | 3/3 | 2 of 3 |
| 5B-L0 | C21 | `C21/L0/indep/R1/V#1 profit` | 20 | $296.43 | $38,905.55 | 13 / 5 | 75.84% | 32.25% | 75.84% | $22,836.05 / 2.86% / $29,125.66 | 2/4 | 4 of 4 |
| 5B-L0 | C23 | `C23/L0/indep/R2/G#1 profit` | 19 | $958.98 | $40,399.24 | 26 / 9 | 52.72% | 0% | -1.1% | $27,769.87 / 0.78% / $30,843.26 | 0/4 | 2 of 4 |
| SES | C19 | `C19/ses/indep/R6/V1#1 profit` | 59 | $16,335.25 | $24,558.43 | 25 / 5 | 73.46% | 7.46% | 35.23% | $29,134.03 / 0% / $30,408.14 | 8/9 | 3 of 9 |
| SES | C21 | `C21/ses/indep/R1/V3#1 profit` | 60 | $20,240.84 | $29,819.66 | 22 / 12 | 39.72% | 15.44% | 65.78% | $31,101.96 / 1.56% / $32,878.33 | 8/9 | 7 of 9 |
| SES | C23 | `C23/ses/indep/R5/V2#1 profit` | 59 | $1,980.35 | $17,116.91 | 40 / 15 | 40.82% | 1.62% | 16.99% | $28,616.64 / 1.56% / $31,624.24 | 0/9 | 3 of 9 |
| B1 | C19 | `C19/B1/R21/V2#1 profit` | 314 | $1,762.94 | $13,822.75 | 18 / 2 | 57.48% | 26.63% | 35.42% | $26,108.54 / 0% / $26,800.28 | 28/34 | 4 of 34 |
| B1 | C21 | `C21/B1/R9/V3#1 profit` | 316 | $9,164.65 | $15,367.54 | 8 / 2 | 85.5% | 52.64% | 69.49% | $34,633.28 / 8.85% / $47,489.10 | 31/34 | 25 of 34 |
| B1 | C23 | `C23/B1/R5/V3#1 profit` | 315 | $1,039.84 | $29,825.50 | 24 / 11 | 53.51% | 5.92% | 12.15% | $30,031.39 / 0% / $31,029.22 | 0/34 | 9 of 34 |
| B2 | C19 | `C19/B2-g/F1/R8/V3#1 profit` | 160 | $199.23 | $886.19 | 17 / 4 | 75.62% | 13.49% | 53.71% | $28,134.00 / 0% / $29,166.76 | 11/11 | 5 of 11 |
| B2 | C21 | `C21/B2-g/F1/R7/V2#1 profit` | 133 | $222.02 | $3,927.73 | 21 / 6 | 65.6% | 48.36% | 66.59% | $32,044.29 / 2.08% / $33,929.87 | 10/10 | 10 of 10 |
| B2 | C23 | `C23/B2-g/F1/R8/V3#1 profit` | 104 | $732.06 | $10,867.22 | 33 / 9 | 56.3% | 12.32% | 21.46% | $34,855.68 / 9.9% / $39,574.90 | 3/11 | 4 of 11 |

## Parameters: fold primaries beside New L0 (D1 vectors [X, Y, stop, hold, L, buffer, P, W]; tenths of a percent, hold in the study's unit)

| Subject | Fold | Structure / toggles | D1·VGT | D1·GDX | Growth |
|---|---:|---:|---:|---:|---:|
| New L0 (fixed) | — | — | [237, 9, 73, 15, 72, 42, 103, 41] | [277, 1, 61, 13, 232, 25, 152, 10] | {entry:rise_from_recent_low, advance:5.6, lookback:84, trend:off, eligibility:time_limited, gate:11.9%/46.2%, trail:5.7, maxHold:22, initialStop:16×1.2, retention:off, continuation:classic_d1} |
| 5B-L0 | C19 | B | [196, 26, 143, 25, 170, 49, 157, 180] | [135, 16, 37, 19, 65, 36, 106, 42] | GDX: rise_from_recent_low, trend momentum, gate 3.5%/100%, trail 5%, hold 28, init off, retention off, cont classic_d1; VGT: rise_from_recent_low, trend rising_sma, gate off, trail 6.2%, hold off, init 55×3, retention 40%, cont ma_cross |
| 5B-L0 | C21 | V | [222, 40, 83, 22, 131, 13, 99, 174] | [256, 14, 53, 4, 35, 39, 79, 167] | VGT: trend_breakout, trend momentum, gate 3.5%/40%, trail 10.5%, hold 28, init 25×4, retention 10%, cont off |
| 5B-L0 | C23 | G | [288, 5, 111, 24, 177, 21, 179, 198] | [291, 6, 67, 20, 37, 43, 85, 38] | GDX: rise_from_recent_low, trend price_change, gate 14.5%/90%, trail 4.5%, hold off, init 50×3, retention off, cont breakout |
| SES | C19 | V | [253, 2, 84, 11, 31, 15, 178, 184] | [90, 27, 31, 7, 48, 19, 54, 181] | VGT: trend_breakout, trend regression_slope, gate 10%/100%, trail 12%, hold 11, init 50×2.5, retention 30%, cont off |
| SES | C21 | V | [299, 38, 140, 5, 110, 11, 107, 34] | [258, 19, 70, 27, 228, 35, 117, 111] | VGT: rise_from_recent_low, trend rising_sma, gate 3.5%/60%, trail 4.5%, hold 12, init 60×5, retention off, cont breakout |
| SES | C23 | V | [291, 11, 44, 25, 175, 1, 49, 60] | [287, 11, 49, 24, 77, 59, 150, 148] | VGT: trend_breakout, trend rising_sma, gate 8%/50%, trail 8%, hold 12, init off, retention 60%, cont shallow_pullback |
| B1 | C19 | V / 111 | [185, 49, 132, 13, 159, 5, 76, 75] | [86, 21, 33, 6, 21, 51, 58, 28] | VGT: trend_breakout, trend regression_slope, gate 10.5%/80%, trail 12.5%, hold 17, init off, retention 70%, cont ma_cross |
| B1 | C21 | V / 101 | [198, 6, 149, 14, 199, 51, 79, 120] | [291, 43, 55, 8, 112, 21, 199, 76] | VGT: trend_breakout, trend off, gate 13.5%/70%, trail 6.1%, hold off, init off, retention 70%, cont breakout |
| B1 | C23 | V / 000 | [220, 25, 76, 15, 70, 21, 77, 135] | [297, 31, 65, 5, 36, 54, 128, 109] | VGT: trend_breakout, trend off, gate 5.5%/50%, trail 10%, hold 28, init off, retention 60%, cont breakout |
| B2 | C19 | V / 011 | [104, 8, 64, 4, 25, 27, 62, 147] | [279, 23, 62, 21, 107, 27, 170, 129] | VGT: rise_from_recent_low, trend off, gate 11.5%/80%, trail 3.5%, hold off, init off, retention off, cont classic_d1 |
| B2 | C21 | V / 111 | [297, 34, 149, 25, 42, 48, 40, 73] | [293, 3, 66, 6, 243, 25, 76, 53] | VGT: rise_from_recent_low, trend regression_slope, gate off, trail 4.5%, hold 27, init off, retention off, cont off |
| B2 | C23 | V / 000 | [297, 14, 83, 14, 207, 36, 30, 93] | [299, 2, 47, 22, 244, 59, 169, 44] | VGT: rise_from_recent_low, trend regression_slope, gate off, trail 14.1%, hold off, init 45×2, retention 10%, cont off |

## Seed-level replicate primaries (each replicate's own actual-profit holder; same procedure, different seed)

| Path | Fold | n | Breaching | Net > 0 and DD ≤ $35k | Training net range | Slice net min … median … max | Slice DD min … median … max | Growth·VGT entry | D1·VGT range | D1·GDX range |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 5B-L0 | C19 | 2 | 2 | 0 | $100,060.66 … $105,653.22 | $2,117.76 … $5,600.64 … $9,083.51 | $39,527.29 … $52,157.21 … $64,787.12 | rise_from_recent_low 1, trend_breakout 1 | X 196–238, stop 49–143, hold 22–25 | X 132–135, stop 37–103, hold 19–27 |
| 5B-L0 | C21 | 2 | 2 | 0 | $218,150.45 … $218,446.88 | −$38,341.52 … −$17,324.73 … $3,692.06 | $56,532.42 … $56,895.93 … $57,259.44 | trend_breakout 1, rise_from_recent_low 1 | X 222–232, stop 83–93, hold 12–22 | X 256–294, stop 44–53, hold 4–7 |
| 5B-L0 | C23 | 2 | 0 | 0 | $181,511.59 … $182,470.57 | −$11,735.49 … −$5,867.74 … $0.00 | $0.00 … $7,084.25 … $14,168.50 | rise_from_recent_low 1, trend_breakout 1 | X 239–288, stop 82–111, hold 11–24 | X 291–297, stop 48–67, hold 20–27 |
| SES | C19 | 6 | 5 | 1 | $102,577.58 … $123,812.69 | −$14,802.28 … $41,138.40 … $78,700.67 | $34,737.03 … $45,757.63 … $59,499.42 | trend_breakout 4, rise_from_recent_low 2 | X 171–253, stop 51–148, hold 11–30 | X 90–238, stop 31–69, hold 7–28 |
| SES | C21 | 6 | 6 | 0 | $201,789.02 … $240,514.68 | −$43,080.14 … −$19,807.64 … $11,910.26 | $38,800.13 … $52,944.84 … $57,489.79 | rise_from_recent_low 4, trend_breakout 2 | X 215–299, stop 80–146, hold 5–15 | X 253–294, stop 51–81, hold 6–27 |
| SES | C23 | 6 | 0 | 2 | $182,856.07 … $201,920.45 | −$13,282.76 … −$9,531.30 … $9,804.65 | $8,724.22 … $19,122.86 … $24,420.87 | trend_breakout 4, rise_from_recent_low 2 | X 208–291, stop 44–84, hold 9–25 | X 250–299, stop 44–77, hold 7–24 |
| B1 | C19 | 32 | 27 | 5 | $96,656.73 … $148,747.23 | −$19,279.29 … $40,396.93 … $127,637.63 | $25,660.52 … $48,279.42 … $73,135.71 | trend_breakout 27, rise_from_recent_low 5 | X 80–243, stop 30–144, hold 3–30 | X 80–295, stop 30–139, hold 3–30 |
| B1 | C21 | 32 | 29 | 1 | $192,723.34 … $241,331.83 | −$51,381.83 … −$15,853.57 … $38,189.70 | $23,040.48 … $50,719.97 … $82,015.82 | trend_breakout 18, rise_from_recent_low 14 | X 198–300, stop 37–149, hold 4–29 | X 220–298, stop 41–82, hold 4–30 |
| B1 | C23 | 32 | 0 | 14 | $171,631.25 … $230,641.99 | −$15,356.22 … −$668.65 … $16,231.16 | $0.00 … $13,721.03 … $32,018.26 | trend_breakout 19, rise_from_recent_low 13 | X 201–296, stop 32–110, hold 4–30 | X 210–298, stop 36–90, hold 4–30 |
| B2 | C19 | 8 | 8 | 0 | $106,536.64 … $108,245.31 | $16,203.70 … $44,363.93 … $64,072.92 | $44,645.13 … $48,385.28 … $49,594.37 | rise_from_recent_low 8 | X 104–104, stop 64–64, hold 4–4 | X 279–279, stop 62–62, hold 21–21 |
| B2 | C21 | 8 | 8 | 0 | $243,089.73 … $248,305.56 | −$63,611.93 … −$10,894.59 … −$5,474.46 | $59,404.51 … $64,603.01 … $76,940.13 | rise_from_recent_low 8 | X 238–297, stop 149–149, hold 18–25 | X 293–294, stop 66–72, hold 6–30 |
| B2 | C23 | 8 | 3 | 2 | $242,848.89 … $262,019.94 | −$3,356.70 … −$2,062.60 … $19,875.96 | $8,775.50 … $26,536.72 … $36,845.96 | rise_from_recent_low 8 | X 233–297, stop 83–83, hold 12–14 | X 262–299, stop 47–49, hold 15–22 |

## Do training statistics rank the next slice? (Spearman, evaluated rows; descriptive)

| Path | Fold | n | Training net vs slice net | Training net vs slice DD | Conf. p90 DD vs slice DD | Conf. worst-10% mean vs slice DD | Top-episode share vs slice net | Unrealized share vs slice DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 5B-L0 | C19 | 3 | — | — | — | — | — | — |
| 5B-L0 | C21 | 4 | -0.4 | 1 | 0.6 | 0.8 | -1 | 0.2 |
| 5B-L0 | C23 | 4 | 0 | -0.4 | 0.4 | 0.4 | -0.6 | 0.8 |
| SES | C19 | 9 | 0.35 | 0.15 | 0.0167 | -0.0833 | 0.31670000000000004 | -0.0833 |
| SES | C21 | 9 | -0.5667 | 0.8332999999999999 | 0.3264 | 0.3333 | -0.5667 | 0.7333 |
| SES | C23 | 9 | -0.2833 | 0.3333 | 0.35 | 0.4167 | -0.25 | -0.2667 |
| B1 | C19 | 34 | -0.2024 | -0.0616 | 0.40380000000000005 | 0.2021 | -0.129 | 0.2104 |
| B1 | C21 | 34 | -0.0866 | 0.0802 | 0.2266 | -0.0026 | -0.5154 | 0.6095 |
| B1 | C23 | 34 | -0.075 | 0.3323 | 0.46619999999999995 | 0.49520000000000003 | 0.07139999999999999 | 0.08869999999999999 |
| B2 | C19 | 11 | -0.6112 | -0.872 | -0.5927 | -0.6264 | -0.6112 | 0.872 |
| B2 | C21 | 10 | -0.09119999999999999 | -0.3497 | -0.6462 | -0.0552 | 0.2492 | 0.7178 |
| B2 | C23 | 11 | 0.0636 | 0.1 | 0.49090000000000006 | 0.6727 | 0.1364 | 0.6909000000000001 |

Pooled across the four procedures (heterogeneous sets; descriptive only):

| Fold | n | Breaching | Training net vs slice net | Training net vs slice DD | Conf. p90 DD vs slice DD | Conf. worst-10% mean vs slice DD | Top-episode share vs slice net | Unrealized share vs slice DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | 57 | 50 | -0.1233 | -0.0929 | 0.2891 | 0.1396 | -0.015300000000000001 | 0.20670000000000002 |
| C21 | 57 | 51 | -0.1589 | 0.536 | 0.3171 | 0.191 | -0.483 | 0.7212000000000001 |
| C23 | 58 | 3 | 0.0911 | 0.3104 | 0.47159999999999996 | 0.4533 | -0.10220000000000001 | 0.23309999999999997 |
