# Validation (FULL, once; 2025-01-02 → 2026-10-30; previously examined history)

| Member | ETF | Why | Development net | Validation P&L | Realized | Open | Reset val. DD | Whole-run net | Whole-run DD | Lots after 2024 | Carried in | 2025 | 2026 | V1–V3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EEM#1 profit | EEM | shortlist EEM actual-profit; shortlist EEM lower-drawdown | $59,569.80 | $0.00 | $59,569.80 | $0.00 | $0.00 | $59,569.80 | $17,958.93 | 0 | 0 | $0.00 | $0.00 | ✗V1 V2 V3 |
| EEM#2 robust | EEM | shortlist EEM robust-profit; shortlist EEM balanced | $52,862.42 | $0.00 | $52,862.42 | $0.00 | $0.00 | $52,862.42 | $19,041.93 | 0 | 0 | $0.00 | $0.00 | ✗V1 V2 V3 |
| GDX#3 profit order | GDX | control GDX independent actual-profit | $17,762.23 | $37,745.15 | $55,507.38 | $0.00 | $28,126.55 | $55,507.38 | $32,985.25 | 4 | 0 | $35,489.92 | $2,255.23 | V1 V2 V3 |
| GLD#3 profit order | GLD | shortlist GLD actual-profit; shortlist GLD robust-profit; shortlist GLD balanced; shortlist GLD lower-drawdown | $43,278.21 | $6,152.97 | $71,637.45 | −$22,206.26 | $32,933.23 | $49,431.19 | $32,933.23 | 4 | 0 | $12,364.12 | −$6,211.15 | V1 V2 V3 |
| IAU#1 profit | IAU | near miss IAU actual-profit | $32,498.07 | $688.83 | $33,186.90 | $0.00 | $10,902.24 | $33,186.90 | $10,902.24 | 2 | 0 | $688.83 | $0.00 | V1 V2 V3 |
| IWF#1 profit | IWF | near miss IWF actual-profit | $98,070.44 | −$17,626.90 | $80,443.54 | $0.00 | $28,259.31 | $80,443.54 | $28,259.31 | 4 | 1 | $3,736.66 | −$21,363.56 | ✗V1 V2 V3 |
| MTUM#3 balanced | MTUM | universe lower-drawdown | $49,429.61 | $2,435.70 | $51,865.31 | $0.00 | $8,726.93 | $51,865.31 | $16,821.59 | 2 | 1 | −$524.89 | $2,960.59 | V1 V2 V3 |
| SMH#1 profit | SMH | universe actual-profit; universe balanced; near miss SMH actual-profit | $111,272.90 | $35,685.87 | $146,958.76 | $0.00 | $23,306.51 | $146,958.76 | $23,306.51 | 1 | 0 | $14,093.77 | $21,592.10 | V1 V2 V3 |
| SMH#2 robust | SMH | universe robust-profit | $109,962.31 | $32,682.86 | $112,813.82 | $29,831.34 | $23,306.51 | $142,645.16 | $23,564.56 | 1 | 1 | $13,804.95 | $18,877.90 | V1 V2 V3 |
| VGT#1 profit | VGT | control VGT independent actual-profit | $102,096.12 | $12,982.89 | $102,029.05 | $13,049.97 | $19,238.41 | $115,079.01 | $28,909.17 | 2 | 1 | $5,510.75 | $7,472.15 | V1 V2 V3 |
| XHB#1 profit | XHB | shortlist XHB actual-profit | $82,663.42 | −$14,552.44 | $68,110.98 | $0.00 | $15,590.63 | $68,110.98 | $25,792.18 | 4 | 0 | −$5,249.00 | −$9,303.44 | ✗V1 V2 V3 |
| XHB#2 seed-alternative | XHB | shortlist XHB robust-profit; shortlist XHB balanced; shortlist XHB lower-drawdown | $58,756.61 | $0.00 | $58,756.61 | $0.00 | $0.00 | $58,756.61 | $18,421.44 | 0 | 0 | $0.00 | $0.00 | ✗V1 V2 V3 |
| XHB/transfer T1 VGT Growth #4 | XHB | shortlist XHB transfer actual-profit (informed) | $34,631.02 | −$13,679.39 | $20,951.63 | $0.00 | $16,751.47 | $20,951.63 | $21,593.59 | 5 | 0 | −$3,660.73 | −$10,018.65 | ✗V1 V2 V3 |

## Native reproduction of the transfer vectors

| Key | Vector | ETF | Full net | Target | Full DD | Target | Lots | Target | Validation | Target | Result |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T5 | 4A primary GDX (indep-rise#1 profit) | GDX | $139,668.45 | $139,668.45 | $17,483.62 | $17,483.62 | 11 | 11 | $0.00 | $0.00 | exact |
| T6 | 4A informed#2 robust GDX | GDX | $149,645.63 | $149,645.63 | $18,840.58 | $18,840.58 | 20 | 20 | $39,487.05 | $39,487.05 | exact |
| T7 | P08 GDX (3C G robust-profit vector) | GDX | $121,008.75 | $121,008.75 | $18,840.58 | $18,840.58 | 11 | 11 | $0.00 | $0.00 | exact |
| T8 | P09 GDX (3C G lower-drawdown vector) | GDX | $100,056.17 | $100,056.17 | $17,744.39 | $17,744.39 | 15 | 15 | $0.00 | $0.00 | exact |
| T9 | Appendix A GDX | GDX | $141,157.37 | $141,157.37 | $17,709.96 | $17,709.96 | 19 | 19 | $87,340.87 | $87,340.87 | exact |
| T1 | VGT Growth #4 | VGT | $145,468.46 | $145,468.46 | $14,578.10 | $14,578.10 | 13 | 13 | $52,892.75 | $52,892.75 | exact |
| T2 | VGT Growth 08500a60 | VGT | $160,974.09 | $160,974.09 | $19,344.80 | $19,344.80 | 9 | — | $45,464.93 | $45,464.93 | exact |
| T3 | C4-refined VGT Growth book | VGT | $150,361.50 | — | $16,013.23 | — | 19 | — | $45,685.62 | — | no sealed target |
| T4 | L0 primary VGT Growth book | VGT | $131,607.86 | — | $17,036.05 | — | 12 | — | $51,395.60 | — | no sealed target |

## Validation-window neighbourhoods (report-only; 128 C24 confirmation rep-1 draws)

| Member | Draws | Positive | Zero | Median P&L | p10 P&L | p90 reset DD | p90 whole DD | Whole-run DD > $35k |
|---|---|---|---|---|---|---|---|---|
| SMH#1 profit | 128 | 100.0% | 0.0% | $32,100.86 | $21,044.45 | $27,838.33 | $29,123.46 | 4 |
| XHB#1 profit | 128 | 3.9% | 0.0% | −$12,196.67 | −$19,137.80 | $26,365.23 | $30,611.13 | 5 |
| EEM#1 profit | 128 | 38.3% | 61.7% | $0.00 | $0.00 | $19,231.31 | $20,217.64 | 0 |
| GLD#3 profit order | 128 | 94.5% | 0.0% | $10,001.90 | $5,314.87 | $33,176.40 | $33,176.40 | 5 |
