# Chronological procedure tests (independent procedure; controls descriptive)

| Fold | Member | Role | Slice P&L | Slice DD (reset) | Whole-run DD | Open at slice end |
|---|---:|---:|---:|---:|---:|---:|
| C19 | C19/indep/B_GDX-breakout_VGT-breakout#1 profit | actual-profit | $14,619.98 | $60,874.87 | $60,874.87 | G:VGT |
| C19 | C19/indep/B_GDX-breakout_VGT-breakout#3 balanced | robust-profit | $15,280.03 | $68,795.52 | $68,795.52 | G:VGT |
| C19 | C19/indep/V_VGT-breakout#2 robust | balanced | −$6,689.23 | $55,168.42 | $55,168.42 | D1:GDX |
| C19 | C19/indep/B_GDX-rise_VGT-breakout#1 profit | lower-drawdown | $9,461.60 | $53,347.94 | $53,347.94 | D1:GDX |
| C19 | C4 | control (benchmark) | $162,640.68 | $17,280.74 | $17,332.09 | D1:GDX |
| C19 | E | control (control) | $146,058.76 | $18,556.54 | $20,801.07 | D1:GDX |
| C19 | A | control (control) | $157,896.17 | $18,556.54 | $20,801.07 | D1:GDX |
| C19 | B | control (control) | $146,058.76 | $18,556.54 | $20,801.07 | D1:GDX |
| C19 | C85 | control (control) | $132,702.13 | $17,280.74 | $18,119.12 | D1:GDX |
| C19 | D | control (d1-only) | $132,702.13 | $17,280.74 | $20,801.07 | D1:GDX |
| C21 | C21/indep/G_GDX-rise#1 profit | actual-profit | −$14,870.14 | $57,075.51 | $58,920.92 | — |
| C21 | C21/indep/V_VGT-rise#2 robust | robust-profit,balanced | −$25,503.96 | $58,846.72 | $60,387.00 | G:VGT |
| C21 | C21/indep/G_GDX-rise#3 balanced | lower-drawdown | −$3,715.97 | $28,644.51 | $28,644.51 | — |
| C21 | C4 | control (benchmark) | $63,195.33 | $17,027.86 | $17,332.09 | G:VGT |
| C21 | E | control (control) | $63,208.84 | $17,027.86 | $20,801.07 | — |
| C21 | A | control (control) | $63,195.33 | $17,027.86 | $20,801.07 | G:VGT |
| C21 | B | control (control) | $63,541.49 | $17,027.86 | $20,801.07 | G:VGT |
| C21 | C85 | control (control) | $63,541.49 | $17,027.86 | $18,119.12 | G:VGT |
| C21 | D | control (d1-only) | $63,208.84 | $17,027.86 | $20,801.07 | — |
| C23 | C23/indep/B_GDX-rise_VGT-rise#1 profit | actual-profit | $13,505.87 | $12,639.84 | $19,966.05 | — |
| C23 | C23/indep/V_VGT-breakout#2 robust | robust-profit | $5,504.11 | $21,345.78 | $25,469.05 | G:VGT |
| C23 | C23/indep/B_GDX-breakout_VGT-breakout#2 robust | balanced | −$17,613.65 | $23,362.25 | $26,674.50 | — |
| C23 | C23/indep/G_GDX-rise#3 balanced | lower-drawdown | $0.00 | $0.00 | $17,280.74 | — |
| C23 | C4 | control (benchmark) | $9,852.77 | $10,047.41 | $17,332.09 | — |
| C23 | E | control (control) | $42,070.45 | $11,334.86 | $20,801.07 | — |
| C23 | A | control (control) | $17,293.89 | $10,047.41 | $20,801.07 | — |
| C23 | B | control (control) | $7,269.86 | $14,322.77 | $20,801.07 | — |
| C23 | C85 | control (control) | −$171.27 | $14,322.77 | $18,119.12 | — |
| C23 | D | control (d1-only) | $28,624.54 | $8,839.65 | $20,801.07 | — |

**Verdict:** chronologically unsupported (sequential net ≤ 0 or sequential minute drawdown > $35,000)

| Policy | Net before charges | Charges | Net | Sequential DD | Peak → trough |
|---|---:|---:|---:|---:|---:|
| independent procedure (each fold primary; flat without one) | $13,255.71 | $150.00 | $13,105.71 | $60,874.87 | 2020-02-19 17:49Z → 2020-03-17 13:44Z |
| role robust-profit | −$4,719.82 | $200.00 | −$4,919.82 | $68,795.52 | 2020-02-19 17:49Z → 2020-03-20 19:59Z |
| role balanced | −$49,806.84 | $200.00 | −$50,006.84 | $97,510.12 | 2020-09-02 13:30Z → 2022-10-13 13:32Z |
| role lower-drawdown | $5,745.63 | $100.00 | $5,645.63 | $53,347.94 | 2020-02-19 17:49Z → 2020-03-16 13:53Z |
| fixed control: C4 (descriptive: chosen with later data) | $235,688.78 | $0.00 | $235,688.78 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z |
| fixed control: E (descriptive: chosen with later data) | $251,338.05 | $0.00 | $251,338.05 | $18,556.54 | 2020-02-24 14:30Z → 2020-03-12 13:51Z |
| fixed control: A (descriptive: chosen with later data) | $238,385.39 | $0.00 | $238,385.39 | $18,556.54 | 2020-02-24 14:30Z → 2020-03-12 13:51Z |
| fixed control: B (descriptive: chosen with later data) | $216,870.11 | $0.00 | $216,870.11 | $18,556.54 | 2020-02-24 14:30Z → 2020-03-12 13:51Z |
| fixed control: C85 (descriptive: chosen with later data) | $196,072.35 | $0.00 | $196,072.35 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z |
| fixed control: D (descriptive: chosen with later data) | $224,535.51 | $0.00 | $224,535.51 | $17,280.74 | 2020-03-19 19:26Z → 2020-03-19 20:00Z |
