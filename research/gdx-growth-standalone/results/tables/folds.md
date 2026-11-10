# Chronological procedure tests (independent lane)

## C19 → slice 2020-01-02 … 2021-12-31 (door D21; primary **indep-rise#1 profit**)

| Member | Roles | Training net / DD | Slice P&L | Slice reset DD | Whole-run net / DD | Whole-run DD peak → trough (recovery) | Slice lots (carried in) | Open at slice end |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| indep-rise#1 profit | actual-profit | $79,776.54 / $27,493.55 | −$3,143.02 | $21,815.07 | $76,633.52 / $27,493.55 | 2016-05-02 13:31Z → 2016-05-31 13:33Z (2016-07-01 18:32Z) | 4 (0) | 0 |
| indep-rise#2 robust | robust-profit,balanced | $59,773.39 / $25,749.59 | −$28,644.28 | $38,770.96 | $31,129.11 / $38,770.96 | 2020-01-03 14:30Z → 2021-09-29 18:06Z (not recovered) | 10 (1) | 0 |
| indep-breakout#3 balanced | lower-drawdown | $23,806.29 / $18,842.48 | −$11,294.63 | $28,170.20 | $12,511.66 / $30,546.56 | 2019-09-04 19:59Z → 2020-04-13 13:59Z (2020-07-27 13:30Z) | 3 (1) | 0 |
| Appendix A | Appendix A (descriptive) | $31,046.72 / $15,045.32 | $16,718.19 | $17,430.56 | $47,764.91 / $17,430.56 | 2020-02-24 14:30Z → 2020-04-13 13:59Z (2020-05-19 14:35Z) | 5 (1) | 0 |
| reference: cash (no position) | cash | $0.00 / $0.00 | $0.00 | $0.00 | $0.00 / $0.00 | — | 0 (0) | 0 |
## C21 → slice 2022-01-03 … 2023-12-29 (door D23; primary **indep-rise#4 profit order**)

| Member | Roles | Training net / DD | Slice P&L | Slice reset DD | Whole-run net / DD | Whole-run DD peak → trough (recovery) | Slice lots (carried in) | Open at slice end |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| indep-rise#4 profit order | actual-profit | $127,595.98 / $25,174.67 | −$15,359.64 | $47,820.43 | $112,236.34 / $47,820.43 | 2022-02-24 14:30Z → 2022-09-29 14:19Z (not recovered) | 14 (0) | 0 |
| indep-rise#2 robust | robust-profit | $90,790.54 / $20,058.96 | $302.38 | $19,813.53 | $91,092.91 / $22,064.96 | 2020-05-19 14:57Z → 2022-09-29 14:19Z (2023-01-13 17:45Z) | 6 (1) | 0 |
| indep-rise#3 balanced | balanced | $86,100.68 / $18,481.86 | $492.88 | $12,524.77 | $86,593.56 / $18,481.86 | 2020-04-14 14:02Z → 2020-05-01 13:30Z (not recovered) | 2 (0) | 0 |
| indep-breakout#2 robust | lower-drawdown | $62,649.48 / $13,344.20 | −$8,473.76 | $10,957.64 | $54,175.71 / $17,529.34 | 2020-04-14 14:02Z → 2023-04-27 13:30Z (not recovered) | 2 (0) | 0 |
| Appendix A | Appendix A (descriptive) | $47,764.91 / $17,430.56 | −$7,394.32 | $13,292.07 | $40,370.59 / $17,430.56 | 2020-02-24 14:30Z → 2020-04-13 13:59Z (2020-05-19 14:35Z) | 1 (0) | 0 |
| reference: cash (no position) | cash | $0.00 / $0.00 | $0.00 | $0.00 | $0.00 / $0.00 | — | 0 (0) | 0 |
## C23 → slice 2024-01-02 … 2024-12-31 (door D24; primary **indep-rise#1 profit**)

| Member | Roles | Training net / DD | Slice P&L | Slice reset DD | Whole-run net / DD | Whole-run DD peak → trough (recovery) | Slice lots (carried in) | Open at slice end |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| indep-rise#1 profit | actual-profit | $133,766.46 / $18,191.42 | $1,965.63 | $9,927.33 | $135,732.09 / $18,191.42 | 2020-03-19 19:26Z → 2020-03-19 20:00Z (2020-11-05 20:06Z) | 2 (0) | 0 |
| indep-rise#2 robust | robust-profit | $106,617.74 / $17,451.20 | $0.00 | $0.00 | $106,617.74 / $17,451.20 | 2020-03-19 19:26Z → 2020-03-19 20:00Z (2020-03-24 13:30Z) | 0 (0) | 0 |
| indep-rise#3 balanced | balanced,lower-drawdown | $111,082.55 / $17,451.20 | $0.00 | $0.00 | $111,082.55 / $17,451.20 | 2020-03-19 19:26Z → 2020-03-19 20:00Z (2020-03-24 13:30Z) | 0 (0) | 0 |
| Appendix A | Appendix A (descriptive) | $40,370.59 / $17,430.56 | $13,445.91 | $11,334.86 | $53,816.50 / $17,709.96 | 2020-07-27 14:46Z → 2024-06-26 13:33Z (2024-08-20 13:30Z) | 3 (0) | 0 |
| reference: cash (no position) | cash | $0.00 / $0.00 | $0.00 | $0.00 | $0.00 / $0.00 | — | 0 (0) | 0 |

## Sequential policies (verdict: UNSUPPORTED by the frozen rule (sequential net ≤ 0; sequential minute DD $47,820.43 > $35,000))

| Policy | C19 slice | C21 slice | C23 slice | Charges | Net | Sequential DD | Peak → trough | Recovery | Within $35,000 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| independent procedure (each fold primary = the independent actual-profit holder) | indep-rise#1 profit: −$3,143.02 (DD $21,815.07) | indep-rise#4 profit order: −$15,359.64 (DD $47,820.43) | indep-rise#1 profit: $1,965.63 (DD $9,927.33) | $0.00 | −$16,537.03 | $47,820.43 | 2022-02-24 14:30Z → 2022-09-29 14:19Z | not recovered | no |
| independent role robust-profit | indep-rise#2 robust: −$28,644.28 (DD $38,770.96) | indep-rise#2 robust: $302.38 (DD $19,813.53) | indep-rise#2 robust: $0.00 (DD $0.00) | $50.00 | −$28,391.90 | $38,770.96 | 2020-01-03 14:30Z → 2021-09-29 18:06Z | not recovered | no |
| independent role balanced | indep-rise#2 robust: −$28,644.28 (DD $38,770.96) | indep-rise#3 balanced: $492.88 (DD $12,524.77) | indep-rise#3 balanced: $0.00 (DD $0.00) | $0.00 | −$28,151.40 | $38,770.96 | 2020-01-03 14:30Z → 2021-09-29 18:06Z | not recovered | no |
| independent role lower-drawdown | indep-breakout#3 balanced: −$11,294.63 (DD $28,170.20) | indep-breakout#2 robust: −$8,473.76 (DD $10,957.64) | indep-rise#3 balanced: $0.00 (DD $0.00) | $0.00 | −$19,768.39 | $36,643.97 | 2020-08-05 14:33Z → 2023-04-27 13:30Z | not recovered | no |
| Appendix A fixed in every slice (descriptive: chosen with later data) | Appendix A: $16,718.19 (DD $17,430.56) | Appendix A: −$7,394.32 (DD $13,292.07) | Appendix A: $13,445.91 (DD $11,334.86) | $0.00 | $22,769.78 | $17,709.96 | 2020-07-27 14:46Z → 2024-06-26 13:33Z | 2024-08-20 13:30Z | yes |
| cash in every slice (reference) | none: $0.00 (DD $0.00) | none: $0.00 (DD $0.00) | none: $0.00 (DD $0.00) | $0.00 | $0.00 | $0.00 | — | — | yes |

### Positions open between the sequential peak and trough

| Policy | Fold | Member | Entry | Exit | Net | Carried in |
|---|---:|---:|---:|---:|---:|---:|
| independent procedure (each fold primary = the independent actual-profit holder) | C21 | indep-rise#4 profit order | 2022-02-02 | 2022-02-25 | $9,226.28 | — |
| independent procedure (each fold primary = the independent actual-profit holder) | C21 | indep-rise#4 profit order | 2022-04-25 | 2022-05-09 | −$7,884.10 | — |
| independent procedure (each fold primary = the independent actual-profit holder) | C21 | indep-rise#4 profit order | 2022-05-16 | 2022-06-09 | $2,604.25 | — |
| independent procedure (each fold primary = the independent actual-profit holder) | C21 | indep-rise#4 profit order | 2022-06-17 | 2022-06-30 | −$8,931.43 | — |
| independent procedure (each fold primary = the independent actual-profit holder) | C21 | indep-rise#4 profit order | 2022-07-05 | 2022-07-14 | −$9,108.98 | — |
| independent procedure (each fold primary = the independent actual-profit holder) | C21 | indep-rise#4 profit order | 2022-07-29 | 2022-08-30 | −$9,653.86 | — |
| independent procedure (each fold primary = the independent actual-profit holder) | C21 | indep-rise#4 profit order | 2022-09-08 | 2022-09-13 | $1,094.49 | — |
| independent procedure (each fold primary = the independent actual-profit holder) | C21 | indep-rise#4 profit order | 2022-09-20 | 2022-09-23 | −$7,638.18 | — |
| independent procedure (each fold primary = the independent actual-profit holder) | C21 | indep-rise#4 profit order | 2022-09-29 | 2022-10-05 | $5,805.95 | — |
| independent role robust-profit | C19 | indep-rise#2 robust | 2019-11-27 | 2020-01-15 | $4,746.29 | yes |
| independent role robust-profit | C19 | indep-rise#2 robust | 2020-03-13 | 2020-03-13 | −$7,323.02 | — |
| independent role robust-profit | C19 | indep-rise#2 robust | 2020-10-30 | 2020-11-11 | −$239.64 | — |
| independent role robust-profit | C19 | indep-rise#2 robust | 2020-11-23 | 2020-12-22 | −$2,070.49 | — |
| independent role robust-profit | C19 | indep-rise#2 robust | 2021-02-23 | 2021-02-26 | −$6,022.72 | — |
| independent role robust-profit | C19 | indep-rise#2 robust | 2021-03-03 | 2021-03-26 | $1,376.53 | — |
| independent role robust-profit | C19 | indep-rise#2 robust | 2021-07-21 | 2021-08-18 | −$6,011.34 | — |
| independent role robust-profit | C19 | indep-rise#2 robust | 2021-08-24 | 2021-09-16 | −$5,508.43 | — |
| independent role robust-profit | C19 | indep-rise#2 robust | 2021-09-21 | 2021-09-28 | −$5,247.45 | — |
| independent role robust-profit | C19 | indep-rise#2 robust | 2021-09-29 | 2021-11-02 | $6,809.50 | — |
| independent role balanced | C19 | indep-rise#2 robust | 2019-11-27 | 2020-01-15 | $4,746.29 | yes |
| independent role balanced | C19 | indep-rise#2 robust | 2020-03-13 | 2020-03-13 | −$7,323.02 | — |
| independent role balanced | C19 | indep-rise#2 robust | 2020-10-30 | 2020-11-11 | −$239.64 | — |
| independent role balanced | C19 | indep-rise#2 robust | 2020-11-23 | 2020-12-22 | −$2,070.49 | — |
| independent role balanced | C19 | indep-rise#2 robust | 2021-02-23 | 2021-02-26 | −$6,022.72 | — |
| independent role balanced | C19 | indep-rise#2 robust | 2021-03-03 | 2021-03-26 | $1,376.53 | — |
| independent role balanced | C19 | indep-rise#2 robust | 2021-07-21 | 2021-08-18 | −$6,011.34 | — |
| independent role balanced | C19 | indep-rise#2 robust | 2021-08-24 | 2021-09-16 | −$5,508.43 | — |
| independent role balanced | C19 | indep-rise#2 robust | 2021-09-21 | 2021-09-28 | −$5,247.45 | — |
| independent role balanced | C19 | indep-rise#2 robust | 2021-09-29 | 2021-11-02 | $6,809.50 | — |
| independent role lower-drawdown | C19 | indep-breakout#3 balanced | 2020-04-13 | 2020-12-01 | $13,557.80 | — |
| independent role lower-drawdown | C19 | indep-breakout#3 balanced | 2021-01-05 | 2021-01-12 | −$9,022.08 | — |
| independent role lower-drawdown | C21 | indep-breakout#2 robust | 2022-04-14 | 2022-04-21 | −$3,824.14 | — |
| independent role lower-drawdown | C21 | indep-breakout#2 robust | 2023-04-05 | 2023-04-27 | −$4,649.62 | — |
| Appendix A fixed in every slice (descriptive: chosen with later data) | C19 | Appendix A | 2020-06-24 | 2020-07-30 | $16,899.85 | — |
| Appendix A fixed in every slice (descriptive: chosen with later data) | C21 | Appendix A | 2023-04-06 | 2023-05-18 | −$7,394.32 | — |
| Appendix A fixed in every slice (descriptive: chosen with later data) | C23 | Appendix A | 2024-06-21 | 2024-07-25 | $6,004.78 | — |
