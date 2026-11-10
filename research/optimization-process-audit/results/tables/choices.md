# Frozen policy choices (training-only features; sealed before any non-published next-period outcome)

Generated from the sealed records by `tools/optimization-process-audit/tables.ts`. Dollars to the cent; DD = maximum minute drawdown of the marked net on the fixed $100,000 budget.

- **P0** (reference (unchanged original rule)) — actual profit: the highest centre net among E(s, c); ties by the higher selection robust net, the lower centre DD, then the label.
- **P1** (severity-aware) — tail-mean-constrained actual profit: admissible iff the selection family’s worst-10% mean DD (mean of the ⌈0.1 n⌉ largest of the pooled, de-duplicated 2 × 128 selection draws’ maximum minute DDs) ≤ $35,000; the admissible member with the highest centre net (profit order); none admissible → no selection.
- **P2** (subperiod consistency) — best-year-excluded neighbourhood profit: the highest median over the pooled selection draws of (draw net − the draw’s best calendar-year marked P&L); ties by profit order.
- **P3** (episode sensitivity) — profit without new funding in the leading episode: the highest causal centre net from a rerun refusing every new decision inside the largest winning pool-level episode (first decision session → last exit; no winning episode → the centre net); ties by profit order.

| Subject / cutoff | Policy | Choice | Centre net | Selection worst-10% mean DD | Nbhd median net without best year | Causal net without leading episode | Top-episode share | Higher-net E members rejected |
|---|---|---|---:|---:|---:|---:|---:|---|
| 3B C19 | P0 | B_GDX-breakout_VGT-breakout#1 profit | $162,277.41 | $37,801.79 | $78,278.32 | $86,876.82 | 46% | 0 |
| 3B C19 | P1 | B_GDX-breakout_VGT-breakout#4 both Growth funded | $162,093.85 | $27,132.41 | $57,455.76 | $94,052.43 | 42% | 1 |
| 3B C19 | P2 | B_GDX-breakout_VGT-breakout#2 robust | $149,265.63 | $26,383.63 | $79,814.58 | $77,633.39 | 48% | 3 |
| 3B C19 | P3 | V_VGT-breakout#1 profit | $144,515.26 | $27,297.56 | $74,020.86 | $101,909.55 | 29% | 4 |
| 3B C21 | P0 | G_GDX-rise#1 profit | $264,501.50 | $27,521.66 | $95,453.71 | $96,253.91 | 64% | 0 |
| 3B C21 | P1 | G_GDX-rise#1 profit | $264,501.50 | $27,521.66 | $95,453.71 | $96,253.91 | 64% | 0 |
| 3B C21 | P2 | B_GDX-breakout_VGT-breakout#4 profit order | $246,538.63 | $37,515.44 | $104,791.36 | $79,698.23 | 68% | 8 |
| 3B C21 | P3 | V_VGT-rise#1 profit | $258,758.42 | $28,201.41 | $63,756.67 | $162,170.40 | 37% | 1 |
| 3B C23 | P0 | B_GDX-rise_VGT-rise#1 profit | $295,264.76 | $26,826.69 | $114,762.62 | $182,203.70 | 38% | 0 |
| 3B C23 | P1 | B_GDX-rise_VGT-rise#1 profit | $295,264.76 | $26,826.69 | $114,762.62 | $182,203.70 | 38% | 0 |
| 3B C23 | P2 | B_GDX-rise_VGT-rise#1 profit | $295,264.76 | $26,826.69 | $114,762.62 | $182,203.70 | 38% | 0 |
| 3B C23 | P3 | B_GDX-rise_VGT-rise#1 profit | $295,264.76 | $26,826.69 | $114,762.62 | $182,203.70 | 38% | 0 |
| 3B C24 | P0 | B_GDX-rise_VGT-rise#1 profit | $306,507.59 | $33,097.10 | $74,844.25 | $179,450.60 | 41% | — |
| 3B C24 | P1 | B_GDX-rise_VGT-rise#1 profit | $306,507.59 | $33,097.10 | $74,844.25 | $179,450.60 | 41% | — |
| 3B C24 | P2 | V_VGT-breakout#2 robust | $219,505.73 | $28,962.46 | $117,731.31 | $131,966.41 | 40% | — |
| 3B C24 | P3 | B_GDX-rise_VGT-rise#5 profit order | $294,391.23 | $32,664.75 | $79,464.74 | $199,407.44 | 32% | — |
| 4A C19 | P0 | indep-rise#1 profit | $79,776.54 | $35,178.86 | $2,428.56 | $6,409.35 | 92% | 0 |
| 4A C19 | P1 | indep-rise#4 exits-alternative | $78,461.05 | $31,819.50 | $18,133.63 | $44,769.83 | 43% | 1 |
| 4A C19 | P2 | indep-rise#2 robust | $59,773.39 | $29,381.42 | $19,592.62 | $29,949.42 | 50% | 3 |
| 4A C19 | P3 | indep-rise#4 exits-alternative | $78,461.05 | $31,819.50 | $18,133.63 | $44,769.83 | 43% | 1 |
| 4A C21 | P0 | indep-rise#4 profit order | $127,595.98 | $35,713.00 | $16,231.81 | $34,429.66 | 73% | 0 |
| 4A C21 | P1 | indep-rise#2 robust | $90,790.54 | $31,387.45 | $0.00 | $1,696.08 | 98% | 1 |
| 4A C21 | P2 | indep-rise#4 profit order | $127,595.98 | $35,713.00 | $16,231.81 | $34,429.66 | 73% | 0 |
| 4A C21 | P3 | indep-rise#4 profit order | $127,595.98 | $35,713.00 | $16,231.81 | $34,429.66 | 73% | 0 |
| 4A C23 | P0 | indep-rise#1 profit | $133,766.46 | $33,356.59 | $21,830.39 | $59,723.21 | 55% | 0 |
| 4A C23 | P1 | indep-rise#1 profit | $133,766.46 | $33,356.59 | $21,830.39 | $59,723.21 | 55% | 0 |
| 4A C23 | P2 | indep-rise#1 profit | $133,766.46 | $33,356.59 | $21,830.39 | $59,723.21 | 55% | 0 |
| 4A C23 | P3 | indep-rise#1 profit | $133,766.46 | $33,356.59 | $21,830.39 | $59,723.21 | 55% | 0 |
| 4A C24 | P0 | indep-rise#1 profit | $139,668.45 | $31,901.40 | $20,845.93 | $46,107.49 | 67% | — |
| 4A C24 | P1 | indep-rise#1 profit | $139,668.45 | $31,901.40 | $20,845.93 | $46,107.49 | 67% | — |
| 4A C24 | P2 | indep-rise#2 robust | $123,836.44 | $32,710.39 | $22,938.59 | $38,180.42 | 69% | — |
| 4A C24 | P3 | indep-rise#1 profit | $139,668.45 | $31,901.40 | $20,845.93 | $46,107.49 | 67% | — |
