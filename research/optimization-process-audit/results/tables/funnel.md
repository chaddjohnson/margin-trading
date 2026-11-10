# Archive inventory and promotion funnel (independent lanes, C19–C23)

Generated from the sealed records by `tools/optimization-process-audit/tables.ts`. Dollars to the cent; DD = maximum minute drawdown of the marked net on the fixed $100,000 budget.

| Subject / cutoff | Fitted centres | Centre plausible | Rung-1 feasible | Distinct feasible ledgers | Rung 2 | Rung 3 | Shortlisted | Qualified (E) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 3B C19 | 78,988 | 65,577 | 58,970 | 45,594 | 192 | 78 | 40 | 39 |
| 3B C21 | 74,917 | 63,079 | 54,689 | 46,068 | 192 | 80 | 40 | 40 |
| 3B C23 | 79,875 | 63,380 | 52,158 | 44,032 | 192 | 84 | 40 | 39 |
| 4A C19 | 11,084 | 6,908 | 6,306 | 4,521 | 48 | 18 | 10 | 9 |
| 4A C21 | 10,077 | 5,992 | 5,258 | 3,401 | 48 | 20 | 10 | 5 |
| 4A C23 | 10,013 | 5,696 | 4,885 | 2,639 | 48 | 18 | 10 | 6 |

### Training metrics by stage (medians unless stated; training door only)

| Subject / cutoff | Stage | n | Distinct ledgers | Centre net p50 | Centre net max | Top-episode share p50 | Net without best year p50 | Rung-1 robust p50 | Rung-1 p90 DD p50 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 3B C19 | S: shortlisted (qualification set) | 40 | 40 | $120,326.50 | $162,277.41 | 0.45 | $70,165.09 | $97,676.76 | $20,418.68 |
| 3B C19 | R3: rung 3, not shortlisted | 38 | 38 | $83,873.83 | $153,244.90 | 0.53 | $41,254.74 | $72,007.02 | $14,943.79 |
| 3B C19 | R2: rung 2, not promoted to rung 3 | 128 | 128 | $104,546.27 | $152,334.79 | 0.48 | $55,863.22 | $80,957.07 | $17,511.33 |
| 3B C19 | F: rung-1 feasible, not promoted to rung 2 | 58,764 | 45,482 | $68,030.77 | $160,304.60 | 0.56 | $34,357.51 | $52,831.15 | $19,931.06 |
| 3B C19 | P: centre plausible, rung-1 infeasible | 6,607 | 6,343 | $59,006.63 | $159,908.03 | 0.63 | $26,712.83 | $30,678.78 | $40,714.26 |
| 3B C19 | U: centre implausible (screened out) | 13,411 | 12,518 | $25,778.82 | $122,699.00 | 0.85 | $2,008.43 | — | — |
| 3B C21 | S: shortlisted (qualification set) | 40 | 40 | $240,552.11 | $264,501.50 | 0.61 | $105,348.11 | $180,842.81 | $24,650.71 |
| 3B C21 | R3: rung 3, not shortlisted | 40 | 40 | $220,357.84 | $253,263.05 | 0.6 | $92,491.99 | $177,624.09 | $21,222.70 |
| 3B C21 | R2: rung 2, not promoted to rung 3 | 128 | 128 | $224,567.22 | $252,313.17 | 0.54 | $94,764.56 | $177,035.55 | $22,086.65 |
| 3B C21 | F: rung-1 feasible, not promoted to rung 2 | 54,481 | 45,926 | $173,779.87 | $259,911.81 | 0.61 | $62,087.13 | $144,148.53 | $24,488.07 |
| 3B C21 | P: centre plausible, rung-1 infeasible | 8,390 | 8,311 | $134,233.49 | $262,585.16 | 0.67 | $42,476.51 | $96,216.92 | $39,472.34 |
| 3B C21 | U: centre implausible (screened out) | 11,838 | 11,600 | $86,413.01 | $241,502.09 | 0.72 | $24,882.13 | — | — |
| 3B C23 | S: shortlisted (qualification set) | 40 | 40 | $235,189.43 | $295,264.76 | 0.44 | $115,789.31 | $168,063.27 | $26,175.95 |
| 3B C23 | R3: rung 3, not shortlisted | 44 | 44 | $211,680.18 | $284,251.63 | 0.53 | $98,714.75 | $156,718.01 | $21,219.03 |
| 3B C23 | R2: rung 2, not promoted to rung 3 | 128 | 128 | $215,827.60 | $273,985.71 | 0.53 | $97,029.91 | $158,120.69 | $22,067.90 |
| 3B C23 | F: rung-1 feasible, not promoted to rung 2 | 51,946 | 43,884 | $149,312.08 | $295,264.76 | 0.62 | $48,019.25 | $115,666.22 | $25,161.09 |
| 3B C23 | P: centre plausible, rung-1 infeasible | 11,222 | 10,950 | $109,915.14 | $275,386.79 | 0.68 | $29,937.75 | $76,755.61 | $41,175.75 |
| 3B C23 | U: centre implausible (screened out) | 16,495 | 16,204 | $71,916.88 | $237,585.56 | 0.78 | $9,497.82 | — | — |
| 4A C19 | S: shortlisted (qualification set) | 10 | 10 | $29,351.86 | $79,776.54 | 0.87 | $0.00 | $21,057.26 | $25,697.17 |
| 4A C19 | R3: rung 3, not shortlisted | 8 | 8 | $25,578.55 | $76,797.98 | 0.96 | $0.00 | $15,795.90 | $17,570.29 |
| 4A C19 | R2: rung 2, not promoted to rung 3 | 32 | 32 | $29,755.98 | $68,563.08 | 0.79 | $0.00 | $22,191.31 | $18,784.72 |
| 4A C19 | F: rung-1 feasible, not promoted to rung 2 | 6,256 | 4,500 | $14,009.66 | $80,218.46 | 1 | $0.00 | $6,467.32 | $18,097.24 |
| 4A C19 | P: centre plausible, rung-1 infeasible | 602 | 582 | $20,584.16 | $87,623.01 | 0.85 | $157.34 | $1,904.35 | $43,191.71 |
| 4A C19 | U: centre implausible (screened out) | 4,176 | 2,063 | −$253.14 | $82,296.59 | 1 | −$2,772.21 | — | — |
| 4A C21 | S: shortlisted (qualification set) | 10 | 10 | $76,561.17 | $150,894.17 | 0.98 | $5,066.33 | $34,623.23 | $21,049.36 |
| 4A C21 | R3: rung 3, not shortlisted | 10 | 10 | $26,138.88 | $89,708.78 | 0.94 | $799.48 | $16,464.92 | $11,330.37 |
| 4A C21 | R2: rung 2, not promoted to rung 3 | 32 | 32 | $64,372.33 | $125,245.86 | 0.92 | $0.00 | $22,069.96 | $21,207.00 |
| 4A C21 | F: rung-1 feasible, not promoted to rung 2 | 5,206 | 3,371 | $11,333.88 | $145,225.20 | 1 | $0.00 | $5,378.22 | $19,157.43 |
| 4A C21 | P: centre plausible, rung-1 infeasible | 734 | 697 | $17,818.88 | $151,371.05 | 1 | $0.00 | $1,378.82 | $43,343.97 |
| 4A C21 | U: centre implausible (screened out) | 4,085 | 2,870 | −$3,306.96 | $128,212.52 | 1 | −$8,219.46 | — | — |
| 4A C23 | S: shortlisted (qualification set) | 10 | 10 | $31,742.77 | $133,766.46 | 0.8 | $12,571.79 | $19,455.90 | $22,418.65 |
| 4A C23 | R3: rung 3, not shortlisted | 8 | 8 | $17,280.16 | $116,856.63 | 0.87 | $0.00 | $14,627.91 | $16,088.39 |
| 4A C23 | R2: rung 2, not promoted to rung 3 | 32 | 32 | $30,158.38 | $120,170.40 | 0.95 | $2,597.82 | $19,766.35 | $18,928.21 |
| 4A C23 | F: rung-1 feasible, not promoted to rung 2 | 4,835 | 2,610 | $10,568.07 | $135,902.22 | 1 | $0.00 | $3,976.77 | $18,324.26 |
| 4A C23 | P: centre plausible, rung-1 infeasible | 811 | 763 | $17,455.27 | $129,719.88 | 0.92 | $0.00 | −$204.65 | $48,770.29 |
| 4A C23 | U: centre implausible (screened out) | 4,317 | 2,813 | −$2,030.97 | $138,908.09 | 1 | −$6,824.57 | — | — |
