# Validation (FULL, boundary 2024-12-31, end 2026-10-30)

2025–2026 validation on previously examined history (not an untouched holdout); November–December 2026 not evaluated

| Member | Role | V1 P&L > 0 | V2 val DD ≤ $35k | V3 whole DD ≤ $35k | Val P&L (realized) | 2025 | 2026 | Whole DD and dates | Lots after boundary |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C24/indep/GDX-rise_VGT-rise#1 profit | independent:actual-profit | pass | pass | pass | $76,802.05 ($76,802.05) | $49,619.92 | $27,182.13 | $17,280.74: 2020-03-19 19:26Z → 2020-03-19 20:00Z, recovered 2020-03-24 13:30Z | 4/3/0/1 |
| C24/indep/GDX-breakout_VGT-breakout#2 robust | independent:robust-profit | pass | FAIL | FAIL | $8,328.84 ($56,196.54) | $35,644.16 | −$27,315.32 | $60,768.31: 2026-01-29 14:33Z → 2026-07-17 13:34Z, recovered — | 0/1/4/0 |
| C24/indep/GDX-rise_VGT-breakout#3 balanced | independent:balanced | pass | pass | pass | $2,962.67 ($4,248.00) | $740.80 | $2,221.87 | $20,752.62: 2026-04-01 15:44Z → 2026-05-19 14:21Z, recovered — | 2/0/0/2 |
| C24/indep/GDX-rise_VGT-rise#3 balanced | independent:lower-drawdown, final:lower-drawdown | pass | pass | pass | $7,290.85 ($7,290.85) | −$3,872.78 | $11,163.64 | $19,171.94: 2026-04-01 15:44Z → 2026-06-10 19:28Z, recovered 2026-06-17 17:02Z | 4/1/0/1 |
| C24/informed#1 profit | final:actual-profit, refined:actual-profit, refined:lower-drawdown | FAIL | FAIL | FAIL | −$32,190.25 ($10,657.21) | $11,502.76 | −$43,693.01 | $57,568.06: 2025-10-29 14:01Z → 2026-07-17 13:34Z, recovered — | 0/0/1/0 |
| C24/informed#2 robust | final:robust-profit, refined:robust-profit | pass | FAIL | FAIL | $37,388.54 ($40,550.88) | $37,102.25 | $286.29 | $40,802.42: 2025-10-16 17:38Z → 2026-03-20 19:11Z, recovered — | 2/1/3/1 |
| C24/informed#3 balanced | final:balanced, refined:balanced | pass | FAIL | FAIL | $36,113.52 ($39,275.86) | $35,827.23 | $286.29 | $40,802.42: 2025-10-16 17:38Z → 2026-03-20 19:11Z, recovered — | 2/1/3/1 |
| staged: VG #2 + C24/gpair/GDX-breakout_VGT-rise#3 profit order | staged:actual-profit, staged:robust-profit, staged:balanced, staged:lower-drawdown | FAIL | FAIL | FAIL | −$6,699.40 (−$5,091.08) | −$7,490.53 | $791.13 | $40,108.09: 2024-03-08 15:30Z → 2026-03-09 14:12Z, recovered — | 2/1/5/1 |
| C24/gpair/GDX-rise_VGT-rise#1 profit | growth-pair:actual-profit+robust-profit | FAIL | pass | pass | −$13,049.74 (−$12,735.68) | −$10,564.26 | −$2,485.48 | $34,735.96: 2024-07-15 15:21Z → 2026-07-31 14:16Z, recovered — | 0/0/0/4 |
| C24/gpair/GDX-rise_VGT-breakout#2 robust | growth-pair:balanced | pass | pass | pass | $11,200.97 ($12,736.67) | $2,491.28 | $8,709.69 | $22,300.90: 2021-11-22 15:23Z → 2023-01-06 14:45Z, recovered 2023-05-18 19:50Z | 0/0/0/2 |
| C24/gpair/GDX-breakout_VGT-rise#3 profit order | growth-pair:lower-drawdown | FAIL | pass | FAIL | −$16,766.79 (−$15,158.47) | −$8,222.95 | −$8,543.85 | $40,840.50: 2024-03-08 15:30Z → 2026-03-09 14:12Z, recovered — | 0/0/5/1 |
| control: VG #2 Balanced (D1·GDX + D1·VGT) | control (D1-only) | pass | pass | pass | $74,688.80 ($80,253.55) | $47,239.34 | $27,449.46 | $21,303.61: 2026-04-01 15:44Z → 2026-07-17 13:34Z, recovered 2026-08-07 13:30Z | 10/2/0/0 |
| control: Growth pair: #4 (VGT) + Appendix A (GDX) | control (Growth-only) | pass | pass | pass | $93,698.88 ($93,698.88) | $51,516.40 | $42,182.48 | $21,972.42: 2021-08-30 17:50Z → 2023-10-03 19:33Z, recovered 2024-02-12 15:54Z | 0/0/4/2 |
| control: Growth pair: 08500a60 (VGT) + Appendix A (GDX) | control (Growth-only) | pass | pass | pass | $60,994.43 ($51,618.21) | $45,333.87 | $15,660.55 | $25,102.33: 2020-07-27 14:46Z → 2023-10-26 15:23Z, recovered 2024-03-01 18:11Z | 0/0/2/2 |
| control: Appendix A GDX Growth alone | control (Growth-only) | pass | pass | pass | $87,340.87 ($87,340.87) | $70,842.07 | $16,498.80 | $17,709.96: 2020-07-27 14:46Z → 2024-06-26 13:33Z, recovered 2024-08-20 13:30Z | 0/0/6/0 |
| control: VGT only: D1 primary + Growth #4 · A (Priority 2) | control (VGT-only) | pass | pass | pass | $66,585.12 ($66,585.12) | $47,462.75 | $19,122.37 | $19,534.41: 2020-02-19 17:49Z → 2020-03-18 18:27Z, recovered 2020-03-25 13:33Z | 0/4/0/1 |
| control: VGT only: D1 primary + Growth 08500a60 · A (Priority 2) | control (VGT-only) | pass | pass | pass | $60,551.20 ($51,174.98) | $47,462.75 | $13,088.45 | $19,556.63: 2024-07-15 15:21Z → 2025-04-07 13:42Z, recovered 2025-05-01 13:30Z | 0/4/0/1 |
| control: VG #2 + Growth #4 (VGT) — three components | control (three-component) | pass | pass | pass | $99,081.34 ($104,646.09) | $47,239.34 | $51,842.00 | $21,536.85: 2026-06-02 19:58Z → 2026-07-17 13:34Z, recovered 2026-08-07 13:30Z | 8/2/0/1 |
| control: VG #2 + Growth 08500a60 (VGT) — three components | control (three-component) | pass | pass | pass | $76,224.08 ($66,847.86) | $47,239.34 | $28,984.74 | $19,821.14: 2024-07-15 15:21Z → 2025-04-07 13:42Z, recovered 2025-04-25 16:19Z | 2/2/0/1 |
| control: VG #2 + Growth #4 (VGT) + Appendix A (GDX) | control (unchanged four-component) | pass | pass | pass | $139,887.46 ($145,452.22) | $71,546.66 | $68,340.80 | $21,536.85: 2026-06-02 19:58Z → 2026-07-17 13:34Z, recovered 2026-08-07 13:30Z | 8/2/4/1 |
| control: VG #2 + Growth 08500a60 (VGT) + Appendix A (GDX) | control (unchanged four-component) | pass | pass | pass | $117,030.20 ($107,653.99) | $71,546.66 | $45,483.54 | $20,801.07: 2017-04-13 17:05Z → 2017-07-11 14:05Z, recovered 2018-10-15 13:33Z | 2/2/4/1 |

## V5 and stresses on the validation door (report-only)

| Member | Neighbours | Val median / p10 | Positive share | Val DD breaches | 10 bps | 20 bps | 14% interest |
|---|---:|---:|---:|---:|---:|---:|---:|
| C24/informed#1 profit | 128 | −$32,086.08 / −$33,203.07 | 5.5% | 128 | −$32,295.25 | −$32,504.94 | −$37,119.12 |
| C24/informed#2 robust | 128 | $41,778.01 / $15,570.43 | 100.0% | 83 | $36,609.64 | $35,054.17 | $33,693.53 |
| C24/informed#3 balanced | 128 | $40,564.39 / $14,229.71 | 100.0% | 85 | $35,335.84 | $33,782.80 | $32,402.73 |
| C24/indep/GDX-rise_VGT-rise#3 balanced | 128 | $14,665.48 / $8,966.43 | 99.2% | 0 | $6,682.48 | $5,467.55 | $6,912.77 |
| C24/indep/GDX-rise_VGT-rise#1 profit | 128 | $66,605.12 / $52,945.70 | 100.0% | 0 | $75,914.99 | $74,143.53 | $73,884.24 |
| C24/indep/GDX-breakout_VGT-breakout#2 robust | 128 | $8,567.11 / −$32,488.38 | 81.3% | 110 | $7,782.75 | $7,526.27 | $4,895.46 |
| C24/indep/GDX-rise_VGT-breakout#3 balanced | 128 | $13,010.96 / $4,671.90 | 97.7% | 0 | $2,553.08 | $1,735.13 | $1,184.86 |

## Known full-history targets (compared here only)

```
{
 "appendixA": {
  "target": {
   "window": [
    "2016-01-04",
    "2026-10-30"
   ],
   "net": 141157.37,
   "minuteDd": 17709.96,
   "closedTrades": 19,
   "wins": 17,
   "losses": 2,
   "open": 0
  },
  "got": {
   "net": 141157.37,
   "minuteDd": 17709.96,
   "closedTrades": 19,
   "wins": 17,
   "losses": 2,
   "open": 0
  },
  "reproduced": true
 },
 "vg2Native": {
  "context": "Priority 2 REPORT §4 external context: $334,911.93 through 2026-10-30, DD $21,303.61",
  "got": {
   "net": 334911.93,
   "dd": 21303.61,
   "lots": 48
  },
  "reproduced": true
 },
 "control: VGT only: D1 primary + Growth #4 · A (Priority 2)": {
  "want": {
   "net": 271525.33,
   "dd": 19534.41
  },
  "got": {
   "net": 271525.33,
   "dd": 19534.41
  },
  "reproduced": true
 },
 "control: VGT only: D1 primary + Growth 08500a60 · A (Priority 2)": {
  "want": {
   "net": 252359.65,
   "dd": 19556.63
  },
  "got": {
   "net": 252359.65,
   "dd": 19556.63
  },
  "reproduced": true
 }
}
```

## Annual P&L (whole run)

| Member | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C24/indep/GDX-rise_VGT-rise#1 profit | $5,289.15 | $15,169.50 | $8,913.09 | $18,353.98 | $103,841.07 | $2,938.25 | $15,188.62 | $49,371.02 | $26,156.10 | $49,619.92 | $27,182.13 |
| C24/indep/GDX-breakout_VGT-breakout#2 robust | $9,620.11 | $30,059.85 | $6,566.14 | $12,169.05 | $122,052.27 | $13,836.26 | −$8,175.06 | $3,884.89 | $7,787.82 | $35,644.16 | −$27,315.32 |
| C24/indep/GDX-rise_VGT-breakout#3 balanced | $558.00 | $16,583.89 | $3,601.22 | $10,018.98 | $110,317.82 | $7,423.99 | −$4,066.69 | $17,601.87 | $1,811.92 | $740.80 | $2,221.87 |
| C24/indep/GDX-rise_VGT-rise#3 balanced | $9,360.60 | $610.04 | $0.00 | $0.00 | $103,834.29 | $12,541.25 | $20,447.20 | $8,664.39 | −$784.02 | −$3,872.78 | $11,163.64 |
| C24/informed#1 profit | $9,620.11 | $30,059.85 | $9,045.81 | $32,252.43 | $129,603.33 | $32,643.05 | $34,798.38 | $29,086.60 | $31,533.27 | $11,502.76 | −$43,693.01 |
| C24/informed#2 robust | $9,620.11 | $30,059.85 | $12,793.03 | $16,408.14 | $122,021.04 | $29,274.38 | $29,781.36 | $39,747.83 | $11,195.46 | $37,102.25 | $286.29 |
| C24/informed#3 balanced | $9,620.11 | $30,059.85 | $10,969.77 | $16,408.14 | $122,021.04 | $29,274.38 | $29,781.36 | $39,747.83 | $8,961.69 | $35,827.23 | $286.29 |
| staged: VG #2 + C24/gpair/GDX-breakout_VGT-rise#3 profit order | −$453.40 | $25,221.10 | $6,484.31 | $24,230.26 | $117,199.30 | $3,181.87 | $34,453.12 | $37,966.57 | $1,291.03 | −$7,490.53 | $791.13 |
| C24/gpair/GDX-rise_VGT-rise#1 profit | $10,276.71 | $30,239.86 | −$1,523.06 | $16,218.33 | $48,351.22 | $17,192.14 | −$11,958.27 | $13,300.74 | $4,551.15 | −$10,564.26 | −$2,485.48 |
| C24/gpair/GDX-rise_VGT-breakout#2 robust | $5,709.76 | $28,486.26 | $5,087.27 | $12,169.05 | $34,214.56 | $13,753.44 | −$18,054.91 | $31,684.55 | $6,274.53 | $2,491.28 | $8,709.69 |
| C24/gpair/GDX-breakout_VGT-rise#3 profit order | −$453.40 | $25,221.10 | $290.69 | $7,271.93 | $25,684.06 | $3,181.87 | −$9,006.19 | $29,368.46 | $1,291.03 | −$8,222.95 | −$8,543.85 |
| control: VG #2 Balanced (D1·GDX + D1·VGT) | $9,257.30 | $7,423.18 | $10,312.69 | $16,958.34 | $110,085.82 | $22,616.31 | $30,086.81 | $33,122.03 | $28,624.54 | $47,239.34 | $27,449.46 |
| control: Growth pair: #4 (VGT) + Appendix A (GDX) | $24,502.20 | $0.00 | $0.00 | $12,233.20 | $17,150.29 | $8,070.34 | −$4,227.67 | $4,437.65 | $17,293.89 | $51,516.40 | $42,182.48 |
| control: Growth pair: 08500a60 (VGT) + Appendix A (GDX) | $24,502.20 | $0.00 | $0.00 | $18,864.42 | $17,732.64 | $0.00 | −$4,213.26 | $4,769.40 | $7,269.86 | $45,333.87 | $15,660.55 |
| control: Appendix A GDX Growth alone | $24,502.20 | $0.00 | $0.00 | $6,544.52 | $16,718.19 | $0.00 | $0.00 | −$7,394.32 | $13,445.91 | $70,842.07 | $16,498.80 |
| control: VGT only: D1 primary + Growth #4 · A (Priority 2) | $10,276.71 | $30,239.86 | $5,952.22 | $29,318.33 | $75,296.19 | $10,026.97 | $22,145.20 | $11,831.97 | $9,852.77 | $47,462.75 | $19,122.37 |
| control: VGT only: D1 primary + Growth 08500a60 · A (Priority 2) | $9,296.00 | $29,815.86 | $8,987.52 | $32,318.60 | $75,296.19 | $1,956.63 | $22,145.20 | $12,163.72 | −$171.27 | $47,462.75 | $13,088.45 |
| control: VG #2 + Growth #4 (VGT) — three components | $10,276.71 | $30,239.86 | $12,622.49 | $13,958.07 | $128,619.07 | $34,021.61 | $25,859.14 | $37,336.19 | $9,852.77 | $47,239.34 | $51,842.00 |
| control: VG #2 + Growth 08500a60 (VGT) — three components | $9,296.00 | $29,815.86 | $11,538.73 | $16,958.34 | $110,085.82 | $22,616.31 | $25,873.55 | $37,667.94 | −$171.27 | $47,239.34 | $28,984.74 |
| control: VG #2 + Growth #4 (VGT) + Appendix A (GDX) | $33,759.50 | $7,423.18 | $10,312.69 | $20,502.59 | $123,874.55 | $34,021.61 | $25,859.14 | $37,336.19 | $17,293.89 | $71,546.66 | $68,340.80 |
| control: VG #2 + Growth 08500a60 (VGT) + Appendix A (GDX) | $33,759.50 | $7,423.18 | $10,312.69 | $23,502.86 | $123,442.45 | $22,616.31 | $25,873.55 | $37,667.94 | $7,269.86 | $71,546.66 | $45,483.54 |
