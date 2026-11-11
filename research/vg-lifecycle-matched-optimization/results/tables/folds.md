# Chronological procedure tests (independent lanes; each arm its own continuous path)

| Arm | Verdict | Sequential net | Sequential DD |
|---|---|---:|---:|
| L0 | chronologically unsupported (sequential net ≤ 0 or sequential minute drawdown > $35,000) | −$29,358.01 | $67,214.22 |
| L1 | chronologically unsupported (sequential net ≤ 0 or sequential minute drawdown > $35,000) | −$30,032.46 | $106,883.44 |
| L2 | chronologically supported (every fold produced a primary; sequential net > 0 and sequential minute drawdown ≤ $35,000) | $49,518.36 | $29,279.04 |

## Sequential policies

| Policy | Slice 1 | Slice 2 | Slice 3 | Switch charges | Net | Sequential DD | Peak → trough | ≤ $35k |
|---|---|---|---|---|---:|---:|---|---:|
| L0: independent procedure (each fold primary; flat without one) | L0/indep/R2/B#1 profit: $9,083.51 / DD $39,527.29 | L0/indep/R1/V#1 profit: −$38,341.52 / DD $57,259.44 | L0/indep/R2/G#1 profit: $0.00 / DD $0.00 | $100.00 | −$29,358.01 | $67,214.22 | 2020-09-10 14:02Z → 2022-10-13 13:32Z | no |
| L0: role robust-profit | L0/indep/R2/B#1 profit: $9,083.51 / DD $39,527.29 | L0/indep/R2/V#2 robust: −$13,434.78 / DD $24,753.70 | L0/indep/R2/B#2 robust: $3,235.01 / DD $24,303.17 | $150.00 | −$1,266.26 | $39,702.77 | 2020-09-10 14:02Z → 2024-08-05 13:30Z | no |
| L0: role balanced | L0/indep/R2/B#1 profit: $9,083.51 / DD $39,527.29 | L0/indep/R2/V#2 robust: −$13,434.78 / DD $24,753.70 | L0/indep/R1/V#1 profit: −$11,735.49 / DD $14,168.50 | $150.00 | −$16,236.76 | $39,527.29 | 2020-02-19 17:49Z → 2020-03-23 15:44Z | no |
| L0: role lower-drawdown | L0/indep/R1/B#3 balanced: $37,674.98 / DD $38,593.64 | L0/indep/R2/B#3 balanced: −$21,316.73 / DD $34,539.58 | L0/indep/R1/G#3 balanced: −$3,787.71 / DD $4,339.80 | $200.00 | $12,370.54 | $38,593.64 | 2020-02-19 17:49Z → 2020-03-23 15:44Z | no |
| L0: replicate R1 alone (seed-level actual-profit; reporting only) | L0/indep/R1/V#1 profit: $2,117.76 / DD $64,787.12 | L0/indep/R1/V#1 profit: −$38,341.52 / DD $57,259.44 | L0/indep/R1/V#1 profit: −$11,735.49 / DD $14,168.50 | $200.00 | −$48,159.25 | $111,005.68 | 2020-08-05 14:33Z → 2022-10-13 13:32Z | no |
| L0: replicate R2 alone (seed-level actual-profit; reporting only) | L0/indep/R2/B#1 profit: $9,083.51 / DD $39,527.29 | L0/indep/R2/B#1 profit: $3,692.06 / DD $56,532.42 | L0/indep/R2/G#1 profit: $0.00 / DD $0.00 | $100.00 | $12,675.57 | $67,003.87 | 2020-09-10 14:02Z → 2022-10-19 17:07Z | no |
| L0: fixed control: C4 (descriptive: chosen with later data) | control: C4: $162,640.68 / DD $17,280.74 | control: C4: $63,195.33 / DD $17,027.86 | control: C4: $9,852.77 / DD $10,047.41 | $0.00 | $235,688.78 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z | yes |
| L0: fixed control: C4R (descriptive: chosen with later data) | control: C4R: $165,189.97 / DD $17,280.74 | control: C4R: $76,196.55 / DD $17,027.86 | control: C4R: $42,306.71 / DD $10,549.05 | $0.00 | $283,693.23 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z | yes |
| L0: fixed control: D (descriptive: chosen with later data) | control: D: $132,702.13 / DD $17,280.74 | control: D: $63,208.84 / DD $17,027.86 | control: D: $28,624.54 / DD $8,839.65 | $0.00 | $224,535.51 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z | yes |
| L1: independent procedure (each fold primary; flat without one) | L1/indep/R1/B#1 profit: −$39,829.71 / DD $65,926.68 | L1/indep/R1/B#1 profit: −$13,416.67 / DD $52,273.52 | L1/indep/R2/G#1 profit: $23,363.92 / DD $15,733.96 | $150.00 | −$30,032.46 | $106,883.44 | 2020-02-19 17:49Z → 2022-09-26 17:39Z | no |
| L1: role robust-profit | L1/indep/R1/B#1 profit: −$39,829.71 / DD $65,926.68 | L1/indep/R2/V#2 robust: −$15,838.68 / DD $51,476.71 | L1/indep/R2/G#2 robust: $23,363.92 / DD $15,733.96 | $150.00 | −$32,454.47 | $107,056.17 | 2020-02-19 17:49Z → 2022-10-13 13:32Z | no |
| L1: role balanced | L1/indep/R2/B#2 robust: $27,913.49 / DD $51,781.05 | L1/indep/R2/B#3 balanced: $21,065.04 / DD $27,110.51 | L1/indep/R2/V#2 robust: −$9,056.54 / DD $12,763.54 | $200.00 | $39,721.99 | $51,781.05 | 2020-02-19 17:49Z → 2020-03-23 15:44Z | no |
| L1: role lower-drawdown | L1/indep/R2/B#2 robust: $27,913.49 / DD $51,781.05 | L1/indep/R2/B#3 balanced: $21,065.04 / DD $27,110.51 | L1/indep/R2/V#3 entry alternative: $0.00 / DD $0.00 | $150.00 | $48,828.53 | $51,781.05 | 2020-02-19 17:49Z → 2020-03-23 15:44Z | no |
| L1: replicate R1 alone (seed-level actual-profit; reporting only) | L1/indep/R1/B#1 profit: −$39,829.71 / DD $65,926.68 | L1/indep/R1/B#1 profit: −$13,416.67 / DD $52,273.52 | L1/indep/R1/V#1 profit: $21,141.94 / DD $19,901.87 | $200.00 | −$32,304.44 | $106,883.44 | 2020-02-19 17:49Z → 2022-09-26 17:39Z | no |
| L1: replicate R2 alone (seed-level actual-profit; reporting only) | L1/indep/R2/B#1 profit: $63,707.17 / DD $51,310.01 | L1/indep/R2/V#1 profit: $2,090.12 / DD $20,089.88 | L1/indep/R2/G#1 profit: $23,363.92 / DD $15,733.96 | $150.00 | $89,011.21 | $51,310.01 | 2020-02-19 17:49Z → 2020-03-23 15:44Z | no |
| L1: fixed control: C4 (descriptive: chosen with later data) | control: C4: $162,640.68 / DD $17,280.74 | control: C4: $63,195.33 / DD $17,027.86 | control: C4: $9,852.77 / DD $10,047.41 | $0.00 | $235,688.78 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z | yes |
| L1: fixed control: C4R (descriptive: chosen with later data) | control: C4R: $165,189.97 / DD $17,280.74 | control: C4R: $76,196.55 / DD $17,027.86 | control: C4R: $42,306.71 / DD $10,549.05 | $0.00 | $283,693.23 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z | yes |
| L1: fixed control: D (descriptive: chosen with later data) | control: D: $132,702.13 / DD $17,280.74 | control: D: $63,208.84 / DD $17,027.86 | control: D: $28,624.54 / DD $8,839.65 | $0.00 | $224,535.51 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z | yes |
| L2: independent procedure (each fold primary; flat without one) | L2/indep/R1/V#1 profit: $26,887.52 / DD $29,279.04 | L2/indep/R2/B#1 profit: $21,050.14 / DD $25,971.37 | L2/indep/R1/B#1 profit: $1,730.70 / DD $9,182.94 | $150.00 | $49,518.36 | $29,279.04 | 2020-01-24 14:59Z → 2020-03-23 15:44Z | yes |
| L2: role robust-profit | L2/indep/R2/V#2 robust: $56,063.10 / DD $67,694.38 | L2/indep/R2/V#2 robust: $8,954.63 / DD $27,078.47 | L2/indep/R1/V#2 robust: $6,961.72 / DD $12,214.12 | $200.00 | $71,779.45 | $67,694.38 | 2020-02-19 17:49Z → 2020-03-16 13:53Z | no |
| L2: role balanced | L2/indep/R2/V#2 robust: $56,063.10 / DD $67,694.38 | L2/indep/R2/V#2 robust: $8,954.63 / DD $27,078.47 | L2/indep/R2/V#2 balanced: $1,613.18 / DD $11,824.57 | $200.00 | $66,430.91 | $67,694.38 | 2020-02-19 17:49Z → 2020-03-16 13:53Z | no |
| L2: role lower-drawdown | L2/indep/R2/G#3 balanced: $62,610.38 / DD $48,202.56 | L2/indep/R1/V#3 balanced: $3,013.41 / DD $19,579.71 | L2/indep/R2/V#2 balanced: $1,613.18 / DD $11,824.57 | $150.00 | $67,086.97 | $48,202.56 | 2020-02-19 17:49Z → 2020-03-16 13:53Z | no |
| L2: replicate R1 alone (seed-level actual-profit; reporting only) | L2/indep/R1/V#1 profit: $26,887.52 / DD $29,279.04 | L2/indep/R1/B#1 profit: $36,201.74 / DD $35,097.02 | L2/indep/R1/B#1 profit: $1,730.70 / DD $9,182.94 | $200.00 | $64,619.96 | $35,918.05 | 2021-11-22 15:23Z → 2022-07-05 13:32Z | no |
| L2: replicate R2 alone (seed-level actual-profit; reporting only) | L2/indep/R2/B#1 profit: $12,300.56 / DD $52,503.46 | L2/indep/R2/B#1 profit: $21,050.14 / DD $25,971.37 | L2/indep/R2/V#1 profit: $6,902.59 / DD $12,114.62 | $150.00 | $40,103.29 | $52,503.46 | 2020-02-19 17:49Z → 2020-03-16 13:53Z | no |
| L2: fixed control: C4 (descriptive: chosen with later data) | control: C4: $162,640.68 / DD $17,280.74 | control: C4: $63,195.33 / DD $17,027.86 | control: C4: $9,852.77 / DD $10,047.41 | $0.00 | $235,688.78 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z | yes |
| L2: fixed control: C4R (descriptive: chosen with later data) | control: C4R: $164,758.33 / DD $17,280.74 | control: C4R: $76,196.55 / DD $17,027.86 | control: C4R: $42,306.71 / DD $10,549.05 | $0.00 | $283,261.59 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z | yes |
| L2: fixed control: D (descriptive: chosen with later data) | control: D: $132,702.13 / DD $17,280.74 | control: D: $63,208.84 / DD $17,027.86 | control: D: $28,624.54 / DD $8,839.65 | $0.00 | $224,535.51 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z | yes |

## Fold evaluation rows (own = the phenotype under the lifecycle that exported it; cross = report-only)

| Fold | Phenotype | Exported by | Run under | Row | Roles | Training net (boundary) | Slice P&L | Slice DD (reset) | Open at boundary | Open at end |
|---|---|---|---|---|---|---:|---:|---:|---|---|
| C19 | L0/indep/R2/B#1 profit | L0 | L0 | own | actual-profit,robust-profit,balanced,R2 actual-profit | $105,653.22 | $9,083.51 | $39,527.29 | D1:VGT | — |
| C19 | L0/indep/R2/B#1 profit | L0 | L1 | cross | actual-profit,robust-profit,balanced,R2 actual-profit | $102,009.85 | $20,759.72 | $39,527.29 | D1:VGT | G:VGT |
| C19 | L0/indep/R2/B#1 profit | L0 | L2 | cross | actual-profit,robust-profit,balanced,R2 actual-profit | $86,037.78 | $25,477.57 | $49,953.45 | D1:VGT | G:VGT |
| C19 | L0/indep/R1/B#3 balanced | L0 | L0 | own | lower-drawdown | $55,175.72 | $37,674.98 | $38,593.64 | G:VGT | G:VGT |
| C19 | L0/indep/R1/B#3 balanced | L0 | L1 | cross | lower-drawdown | $55,175.72 | $37,674.98 | $38,593.64 | G:VGT | G:VGT |
| C19 | L0/indep/R1/B#3 balanced | L0 | L2 | cross | lower-drawdown | $55,175.72 | $37,674.98 | $38,593.64 | G:VGT | G:VGT |
| C19 | L0/indep/R1/V#1 profit | L0 | L0 | own | R1 actual-profit | $100,060.66 | $2,117.76 | $64,787.12 | D1:GDX | D1:GDX |
| C19 | L0/indep/R1/V#1 profit | L0 | L1 | cross | R1 actual-profit | $95,005.85 | $50,966.73 | $31,551.30 | G:VGT | G:VGT |
| C19 | L0/indep/R1/V#1 profit | L0 | L2 | cross | R1 actual-profit | $95,005.85 | $50,966.73 | $31,551.30 | G:VGT | G:VGT |
| C19 | L1/indep/R1/B#1 profit | L1 | L0 | cross | actual-profit,robust-profit,R1 actual-profit | $104,932.84 | −$28,345.65 | $62,309.11 | D1:VGT | D1:GDX |
| C19 | L1/indep/R1/B#1 profit | L1 | L1 | own | actual-profit,robust-profit,R1 actual-profit | $104,932.84 | −$39,829.71 | $65,926.68 | D1:VGT | D1:GDX |
| C19 | L1/indep/R1/B#1 profit | L1 | L2 | cross | actual-profit,robust-profit,R1 actual-profit | $104,932.84 | −$38,284.33 | $67,349.19 | D1:VGT | D1:GDX |
| C19 | L1/indep/R2/B#2 robust | L1 | L0 | cross | balanced,lower-drawdown | $90,498.95 | $27,913.49 | $51,781.05 | D1:VGT | G:VGT |
| C19 | L1/indep/R2/B#2 robust | L1 | L1 | own | balanced,lower-drawdown | $90,498.95 | $27,913.49 | $51,781.05 | D1:VGT | G:VGT |
| C19 | L1/indep/R2/B#2 robust | L1 | L2 | cross | balanced,lower-drawdown | $90,498.95 | $27,913.49 | $51,781.05 | D1:VGT | G:VGT |
| C19 | L1/indep/R2/B#1 profit | L1 | L0 | cross | R2 actual-profit | $93,914.99 | $63,707.17 | $51,310.01 | D1:VGT | D1:VGT |
| C19 | L1/indep/R2/B#1 profit | L1 | L1 | own | R2 actual-profit | $93,914.99 | $63,707.17 | $51,310.01 | D1:VGT | D1:VGT |
| C19 | L1/indep/R2/B#1 profit | L1 | L2 | cross | R2 actual-profit | $93,914.99 | $63,707.17 | $51,310.01 | D1:VGT | D1:VGT |
| C19 | L2/indep/R1/V#1 profit | L2 | L0 | cross | actual-profit,R1 actual-profit | $100,556.25 | −$738.39 | $46,450.16 | — | D1:GDX |
| C19 | L2/indep/R1/V#1 profit | L2 | L1 | cross | actual-profit,R1 actual-profit | $109,170.73 | −$4,847.82 | $43,884.76 | G:VGT | G:VGT |
| C19 | L2/indep/R1/V#1 profit | L2 | L2 | own | actual-profit,R1 actual-profit | $109,170.73 | $26,887.52 | $29,279.04 | G:VGT | G:VGT |
| C19 | L2/indep/R2/V#2 robust | L2 | L0 | cross | robust-profit,balanced | $101,215.52 | $56,063.10 | $67,694.38 | D1:VGT | G:VGT |
| C19 | L2/indep/R2/V#2 robust | L2 | L1 | cross | robust-profit,balanced | $101,215.52 | $56,063.10 | $67,694.38 | D1:VGT | G:VGT |
| C19 | L2/indep/R2/V#2 robust | L2 | L2 | own | robust-profit,balanced | $101,215.52 | $56,063.10 | $67,694.38 | D1:VGT | G:VGT |
| C19 | L2/indep/R2/G#3 balanced | L2 | L0 | cross | lower-drawdown | $55,315.47 | $62,610.38 | $48,202.56 | D1:VGT | — |
| C19 | L2/indep/R2/G#3 balanced | L2 | L1 | cross | lower-drawdown | $55,315.47 | $62,610.38 | $48,202.56 | D1:VGT | — |
| C19 | L2/indep/R2/G#3 balanced | L2 | L2 | own | lower-drawdown | $55,315.47 | $62,610.38 | $48,202.56 | D1:VGT | — |
| C19 | L2/indep/R2/B#1 profit | L2 | L0 | cross | R2 actual-profit | $105,605.00 | $5,067.56 | $46,028.54 | D1:GDX | D1:GDX |
| C19 | L2/indep/R2/B#1 profit | L2 | L1 | cross | R2 actual-profit | $98,593.04 | $7,970.91 | $50,519.60 | G:VGT | D1:GDX |
| C19 | L2/indep/R2/B#1 profit | L2 | L2 | own | R2 actual-profit | $105,042.45 | $12,300.56 | $52,503.46 | G:VGT | D1:GDX |
| C19 | control: C4 | control | L0 | cross | control | $67,097.13 | $162,640.68 | $17,280.74 | — | D1:GDX |
| C19 | control: C4 | control | L1 | cross | control | $70,097.40 | $162,640.68 | $17,280.74 | — | D1:GDX |
| C19 | control: C4 | control | L2 | cross | control | $70,097.40 | $162,640.68 | $17,280.74 | — | D1:GDX |
| C19 | control: C4R | control | L0 | cross | control | $76,876.47 | $165,189.97 | $17,280.74 | G:VGT | D1:GDX |
| C19 | control: C4R | control | L1 | cross | control | $76,876.47 | $165,189.97 | $17,280.74 | G:VGT | D1:GDX |
| C19 | control: C4R | control | L2 | cross | control | $76,876.47 | $164,758.33 | $17,280.74 | G:VGT | D1:GDX |
| C19 | control: D | control | L0 | cross | control (d1-only) | $43,951.52 | $132,702.13 | $17,280.74 | — | D1:GDX |
| C19 | control: D | control | L1 | cross | control (d1-only) | $43,951.52 | $132,702.13 | $17,280.74 | — | D1:GDX |
| C19 | control: D | control | L2 | cross | control (d1-only) | $43,951.52 | $132,702.13 | $17,280.74 | — | D1:GDX |
| C21 | L0/indep/R1/V#1 profit | L0 | L0 | own | actual-profit,R1 actual-profit | $218,446.88 | −$38,341.52 | $57,259.44 | G:VGT | G:VGT |
| C21 | L0/indep/R1/V#1 profit | L0 | L1 | cross | actual-profit,R1 actual-profit | $215,376.60 | −$38,341.52 | $57,259.44 | G:VGT | G:VGT |
| C21 | L0/indep/R1/V#1 profit | L0 | L2 | cross | actual-profit,R1 actual-profit | $215,376.60 | −$38,341.52 | $57,259.44 | G:VGT | G:VGT |
| C21 | L0/indep/R2/V#2 robust | L0 | L0 | own | robust-profit,balanced | $169,363.00 | −$13,434.78 | $24,753.70 | G:VGT | G:VGT |
| C21 | L0/indep/R2/V#2 robust | L0 | L1 | cross | robust-profit,balanced | $169,363.00 | −$13,434.78 | $24,753.70 | G:VGT | G:VGT |
| C21 | L0/indep/R2/V#2 robust | L0 | L2 | cross | robust-profit,balanced | $169,363.00 | −$13,434.78 | $24,753.70 | G:VGT | G:VGT |
| C21 | L0/indep/R2/B#3 balanced | L0 | L0 | own | lower-drawdown | $173,187.74 | −$21,316.73 | $34,539.58 | G:VGT | G:VGT |
| C21 | L0/indep/R2/B#3 balanced | L0 | L1 | cross | lower-drawdown | $179,610.40 | −$4,664.38 | $34,539.58 | G:VGT | G:VGT |
| C21 | L0/indep/R2/B#3 balanced | L0 | L2 | cross | lower-drawdown | $179,610.40 | −$4,664.38 | $34,539.58 | G:VGT | G:VGT |
| C21 | L0/indep/R2/B#1 profit | L0 | L0 | own | R2 actual-profit | $218,150.45 | $3,692.06 | $56,532.42 | G:VGT | D1:VGT |
| C21 | L0/indep/R2/B#1 profit | L0 | L1 | cross | R2 actual-profit | $218,150.45 | $3,692.06 | $56,532.42 | G:VGT | D1:VGT |
| C21 | L0/indep/R2/B#1 profit | L0 | L2 | cross | R2 actual-profit | $218,150.45 | $3,692.06 | $56,532.42 | G:VGT | D1:VGT |
| C21 | L1/indep/R1/B#1 profit | L1 | L0 | cross | actual-profit,R1 actual-profit | $184,212.05 | $8,923.53 | $52,273.52 | — | — |
| C21 | L1/indep/R1/B#1 profit | L1 | L1 | own | actual-profit,R1 actual-profit | $224,513.42 | −$13,416.67 | $52,273.52 | G:VGT | G:VGT |
| C21 | L1/indep/R1/B#1 profit | L1 | L2 | cross | actual-profit,R1 actual-profit | $230,356.06 | −$13,416.67 | $52,273.52 | G:VGT | G:VGT |
| C21 | L1/indep/R2/V#2 robust | L1 | L0 | cross | robust-profit | $81,279.21 | −$15,838.68 | $51,476.71 | G:VGT | D1:VGT |
| C21 | L1/indep/R2/V#2 robust | L1 | L1 | own | robust-profit | $179,968.88 | −$15,838.68 | $51,476.71 | G:VGT | D1:VGT |
| C21 | L1/indep/R2/V#2 robust | L1 | L2 | cross | robust-profit | $179,968.88 | −$15,838.68 | $51,476.71 | G:VGT | D1:VGT |
| C21 | L1/indep/R2/B#3 balanced | L1 | L0 | cross | balanced,lower-drawdown | $160,335.60 | $21,065.04 | $27,110.51 | D1:GDX | D1:VGT |
| C21 | L1/indep/R2/B#3 balanced | L1 | L1 | own | balanced,lower-drawdown | $186,409.25 | $21,065.04 | $27,110.51 | D1:GDX | D1:VGT |
| C21 | L1/indep/R2/B#3 balanced | L1 | L2 | cross | balanced,lower-drawdown | $186,409.25 | $21,065.04 | $27,110.51 | D1:GDX | D1:VGT |
| C21 | L1/indep/R2/V#1 profit | L1 | L0 | cross | R2 actual-profit | $155,620.61 | $8,040.54 | $24,890.97 | — | G:VGT |
| C21 | L1/indep/R2/V#1 profit | L1 | L1 | own | R2 actual-profit | $203,554.26 | $2,090.12 | $20,089.88 | G:VGT | G:VGT |
| C21 | L1/indep/R2/V#1 profit | L1 | L2 | cross | R2 actual-profit | $212,567.85 | $1,565.17 | $20,089.88 | G:VGT | G:VGT |
| C21 | L2/indep/R2/B#1 profit | L2 | L0 | cross | actual-profit,R2 actual-profit | $224,000.76 | $21,050.14 | $25,971.37 | D1:GDX | — |
| C21 | L2/indep/R2/B#1 profit | L2 | L1 | cross | actual-profit,R2 actual-profit | $224,000.76 | $21,050.14 | $25,971.37 | D1:GDX | — |
| C21 | L2/indep/R2/B#1 profit | L2 | L2 | own | actual-profit,R2 actual-profit | $224,000.76 | $21,050.14 | $25,971.37 | D1:GDX | — |
| C21 | L2/indep/R2/V#2 robust | L2 | L0 | cross | robust-profit,balanced | $179,336.86 | $8,954.63 | $27,078.47 | G:VGT | G:VGT |
| C21 | L2/indep/R2/V#2 robust | L2 | L1 | cross | robust-profit,balanced | $179,336.86 | $8,954.63 | $27,078.47 | G:VGT | G:VGT |
| C21 | L2/indep/R2/V#2 robust | L2 | L2 | own | robust-profit,balanced | $179,336.86 | $8,954.63 | $27,078.47 | G:VGT | G:VGT |
| C21 | L2/indep/R1/V#3 balanced | L2 | L0 | cross | lower-drawdown | $133,874.10 | $3,013.41 | $19,579.71 | G:VGT | G:VGT |
| C21 | L2/indep/R1/V#3 balanced | L2 | L1 | cross | lower-drawdown | $135,606.32 | $3,013.41 | $19,579.71 | G:VGT | G:VGT |
| C21 | L2/indep/R1/V#3 balanced | L2 | L2 | own | lower-drawdown | $135,606.32 | $3,013.41 | $19,579.71 | G:VGT | G:VGT |
| C21 | L2/indep/R1/B#1 profit | L2 | L0 | cross | R1 actual-profit | $149,390.85 | $36,201.74 | $35,097.02 | G:VGT | G:VGT |
| C21 | L2/indep/R1/B#1 profit | L2 | L1 | cross | R1 actual-profit | $210,772.05 | $36,201.74 | $35,097.02 | G:VGT | G:VGT |
| C21 | L2/indep/R1/B#1 profit | L2 | L2 | own | R1 actual-profit | $211,226.81 | $36,201.74 | $35,097.02 | G:VGT | G:VGT |
| C21 | control: C4 | control | L0 | cross | control | $229,737.81 | $63,195.33 | $17,027.86 | D1:GDX | G:VGT |
| C21 | control: C4 | control | L1 | cross | control | $232,738.08 | $63,195.33 | $17,027.86 | D1:GDX | G:VGT |
| C21 | control: C4 | control | L2 | cross | control | $232,738.08 | $63,195.33 | $17,027.86 | D1:GDX | G:VGT |
| C21 | control: C4R | control | L0 | cross | control | $242,066.44 | $76,196.55 | $17,027.86 | D1:GDX | G:VGT |
| C21 | control: C4R | control | L1 | cross | control | $242,066.44 | $76,196.55 | $17,027.86 | D1:GDX | G:VGT |
| C21 | control: C4R | control | L2 | cross | control | $241,634.80 | $76,196.55 | $17,027.86 | D1:GDX | G:VGT |
| C21 | control: D | control | L0 | cross | control (d1-only) | $176,653.64 | $63,208.84 | $17,027.86 | D1:GDX | — |
| C21 | control: D | control | L1 | cross | control (d1-only) | $176,653.64 | $63,208.84 | $17,027.86 | D1:GDX | — |
| C21 | control: D | control | L2 | cross | control (d1-only) | $176,653.64 | $63,208.84 | $17,027.86 | D1:GDX | — |
| C23 | L0/indep/R2/G#1 profit | L0 | L0 | own | actual-profit,R2 actual-profit | $182,470.57 | $0.00 | $0.00 | — | — |
| C23 | L0/indep/R2/G#1 profit | L0 | L1 | cross | actual-profit,R2 actual-profit | $182,470.57 | $0.00 | $0.00 | — | — |
| C23 | L0/indep/R2/G#1 profit | L0 | L2 | cross | actual-profit,R2 actual-profit | $182,470.57 | $0.00 | $0.00 | — | — |
| C23 | L0/indep/R2/B#2 robust | L0 | L0 | own | robust-profit | $129,255.91 | $3,235.01 | $24,303.17 | G:VGT | G:VGT |
| C23 | L0/indep/R2/B#2 robust | L0 | L1 | cross | robust-profit | $129,255.91 | $3,235.01 | $24,303.17 | G:VGT | G:VGT |
| C23 | L0/indep/R2/B#2 robust | L0 | L2 | cross | robust-profit | $129,255.91 | $3,235.01 | $24,303.17 | G:VGT | G:VGT |
| C23 | L0/indep/R1/V#1 profit | L0 | L0 | own | balanced,R1 actual-profit | $181,511.59 | −$11,735.49 | $14,168.50 | G:VGT | — |
| C23 | L0/indep/R1/V#1 profit | L0 | L1 | cross | balanced,R1 actual-profit | $181,511.59 | −$11,735.49 | $14,168.50 | G:VGT | — |
| C23 | L0/indep/R1/V#1 profit | L0 | L2 | cross | balanced,R1 actual-profit | $181,511.59 | −$11,735.49 | $14,168.50 | G:VGT | — |
| C23 | L0/indep/R1/G#3 balanced | L0 | L0 | own | lower-drawdown | $116,479.55 | −$3,787.71 | $4,339.80 | G:GDX | — |
| C23 | L0/indep/R1/G#3 balanced | L0 | L1 | cross | lower-drawdown | $116,479.55 | −$3,787.71 | $4,339.80 | G:GDX | — |
| C23 | L0/indep/R1/G#3 balanced | L0 | L2 | cross | lower-drawdown | $116,479.55 | −$3,787.71 | $4,339.80 | G:GDX | — |
| C23 | L1/indep/R2/G#1 profit | L1 | L0 | cross | actual-profit,R2 actual-profit | $230,606.52 | $23,363.92 | $15,733.96 | — | — |
| C23 | L1/indep/R2/G#1 profit | L1 | L1 | own | actual-profit,R2 actual-profit | $230,606.52 | $23,363.92 | $15,733.96 | — | — |
| C23 | L1/indep/R2/G#1 profit | L1 | L2 | cross | actual-profit,R2 actual-profit | $230,606.52 | $23,363.92 | $15,733.96 | — | — |
| C23 | L1/indep/R2/G#2 robust | L1 | L0 | cross | robust-profit | $229,504.16 | $23,363.92 | $15,733.96 | — | — |
| C23 | L1/indep/R2/G#2 robust | L1 | L1 | own | robust-profit | $229,504.16 | $23,363.92 | $15,733.96 | — | — |
| C23 | L1/indep/R2/G#2 robust | L1 | L2 | cross | robust-profit | $229,504.16 | $23,363.92 | $15,733.96 | — | — |
| C23 | L1/indep/R2/V#2 robust | L1 | L0 | cross | balanced | $170,938.40 | −$9,056.54 | $12,763.54 | G:VGT | — |
| C23 | L1/indep/R2/V#2 robust | L1 | L1 | own | balanced | $170,938.40 | −$9,056.54 | $12,763.54 | G:VGT | — |
| C23 | L1/indep/R2/V#2 robust | L1 | L2 | cross | balanced | $170,938.40 | −$9,056.54 | $12,763.54 | G:VGT | — |
| C23 | L1/indep/R2/V#3 entry alternative | L1 | L0 | cross | lower-drawdown | $156,618.66 | $0.00 | $0.00 | — | — |
| C23 | L1/indep/R2/V#3 entry alternative | L1 | L1 | own | lower-drawdown | $156,618.66 | $0.00 | $0.00 | — | — |
| C23 | L1/indep/R2/V#3 entry alternative | L1 | L2 | cross | lower-drawdown | $156,618.66 | $0.00 | $0.00 | — | — |
| C23 | L1/indep/R1/V#1 profit | L1 | L0 | cross | R1 actual-profit | $172,441.61 | $21,141.94 | $19,901.87 | D1:VGT | D1:VGT |
| C23 | L1/indep/R1/V#1 profit | L1 | L1 | own | R1 actual-profit | $172,441.61 | $21,141.94 | $19,901.87 | D1:VGT | D1:VGT |
| C23 | L1/indep/R1/V#1 profit | L1 | L2 | cross | R1 actual-profit | $172,441.61 | $21,141.94 | $19,901.87 | D1:VGT | D1:VGT |
| C23 | L2/indep/R1/B#1 profit | L2 | L0 | cross | actual-profit,R1 actual-profit | $185,493.91 | $6,180.65 | $9,182.94 | — | G:VGT |
| C23 | L2/indep/R1/B#1 profit | L2 | L1 | cross | actual-profit,R1 actual-profit | $199,028.65 | $1,730.70 | $9,182.94 | G:VGT | G:VGT |
| C23 | L2/indep/R1/B#1 profit | L2 | L2 | own | actual-profit,R1 actual-profit | $199,028.65 | $1,730.70 | $9,182.94 | G:VGT | G:VGT |
| C23 | L2/indep/R1/V#2 robust | L2 | L0 | cross | robust-profit | $170,823.01 | $6,961.72 | $12,214.12 | G:VGT | — |
| C23 | L2/indep/R1/V#2 robust | L2 | L1 | cross | robust-profit | $170,823.01 | $6,961.72 | $12,214.12 | G:VGT | — |
| C23 | L2/indep/R1/V#2 robust | L2 | L2 | own | robust-profit | $170,823.01 | $6,961.72 | $12,214.12 | G:VGT | — |
| C23 | L2/indep/R2/V#2 balanced | L2 | L0 | cross | balanced,lower-drawdown | $160,185.70 | $1,613.18 | $11,824.57 | G:VGT | G:VGT |
| C23 | L2/indep/R2/V#2 balanced | L2 | L1 | cross | balanced,lower-drawdown | $160,185.70 | $1,613.18 | $11,824.57 | G:VGT | G:VGT |
| C23 | L2/indep/R2/V#2 balanced | L2 | L2 | own | balanced,lower-drawdown | $160,185.70 | $1,613.18 | $11,824.57 | G:VGT | G:VGT |
| C23 | L2/indep/R2/V#1 profit | L2 | L0 | cross | R2 actual-profit | $172,406.31 | $6,902.59 | $12,114.62 | G:VGT | G:VGT |
| C23 | L2/indep/R2/V#1 profit | L2 | L1 | cross | R2 actual-profit | $172,406.31 | $6,902.59 | $12,114.62 | G:VGT | G:VGT |
| C23 | L2/indep/R2/V#1 profit | L2 | L2 | own | R2 actual-profit | $172,406.31 | $6,902.59 | $12,114.62 | G:VGT | G:VGT |
| C23 | control: C4 | control | L0 | cross | control | $292,933.14 | $9,852.77 | $10,047.41 | G:VGT | — |
| C23 | control: C4 | control | L1 | cross | control | $295,933.41 | $9,852.77 | $10,047.41 | G:VGT | — |
| C23 | control: C4 | control | L2 | cross | control | $295,933.41 | $9,852.77 | $10,047.41 | G:VGT | — |
| C23 | control: C4R | control | L0 | cross | control | $318,263.00 | $42,306.71 | $10,549.05 | G:VGT | — |
| C23 | control: C4R | control | L1 | cross | control | $318,263.00 | $42,306.71 | $10,549.05 | G:VGT | — |
| C23 | control: C4R | control | L2 | cross | control | $317,831.35 | $42,306.71 | $10,549.05 | G:VGT | — |
| C23 | control: D | control | L0 | cross | control (d1-only) | $239,862.48 | $28,624.54 | $8,839.65 | — | — |
| C23 | control: D | control | L1 | cross | control (d1-only) | $239,862.48 | $28,624.54 | $8,839.65 | — | — |
| C23 | control: D | control | L2 | cross | control (d1-only) | $239,862.48 | $28,624.54 | $8,839.65 | — | — |
