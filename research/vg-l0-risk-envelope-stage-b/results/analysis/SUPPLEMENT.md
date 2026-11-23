# Stage B — supplementary report-only tables (tools/vg-l0-risk-envelope-stage-b/supplement.py; sealed records only)

## C19 (secondary)

**Decomposition of D (report-only; exact identities on the sealed verdicts):** D = [V_P3(CTRL lane) − V_P0(CTRL lane)] (P3 eligibility applied to CTRL's own candidates) + [V_P3(EXP-30 lane) − V_P3(CTRL lane)] (search path, compared under P3); and in the other order D = [V_P0(EXP-30) − V_P0(CTRL)] (search path under P0) + [V_P3(EXP-30) − V_P0(EXP-30)] (eligibility on EXP-30's candidates).

| Component | Mean | 80 % interval (stratified bootstrap) |
|---|---:|---|
| D (primary) | −$750 | −$2,759 … $1,251 |
| eligibility on CTRL candidates | $0 | $0 … $0 |
| search path under P3 | −$750 | −$2,734 … $1,237 |
| search path under P0 | −$1,401 | −$3,411 … $611 |
| eligibility on EXP-30 candidates | $651 | $0 … $1,302 |

Pairs with the same representative in both arms: 0/32. EXP-30 representatives that P0 would reject: 2/32 (centre DD > $35k: 0; confirmation p90 DD > $35k: 2). CTRL representatives that P3 would reject: 0/32.

| Arm | Lanes | Requested | Median / max lane requested | Islands (count: lanes) | Stop reasons | Screen plausible (of 16,384) | Rung-3 feasible / fitted | Top screen rejection reasons |
|---|---:|---:|---|---|---|---:|---|---|
| CTRL | 32 | 571,767 | 18,164 / 26,404 | 2: 4, 3: 8, 4: 10, 5: 8, 6: 2 | triggers not met…: 32 | 3955 | 189 / 192 | a family unfunded 7464; plausible 3955; net ≤ 0 3023; DD > ceiling 1929 |
| EXP30 | 32 | 596,373 | 18,302 / 25,956 | 2: 2, 3: 9, 4: 11, 5: 5, 6: 5 | triggers not met…: 30; extension cap reached …: 2 | 4456 | 190 / 192 | a family unfunded 7464; plausible 4456; net ≤ 0 3023; DD > ceiling & BD > limit 829 |

| Arm | Representatives' confirmation draws | > 35 % DD | > 40 % DD | PL > 25 % | BD > 25 % | BD > 30 % |
|---|---:|---:|---:|---:|---:|---:|
| CTRL | 12,288 | 213 (1.7 %) | 83 (0.7 %) | 0 (0.0 %) | 314 (2.6 %) | 154 (1.3 %) |
| EXP30 | 12,288 | 434 (3.5 %) | 198 (1.6 %) | 0 (0.0 %) | 274 (2.2 %) | 185 (1.5 %) |

| Arm | Interval net mean / median / min / max | Positive | Interval DD mean / median / max | Whole run passes own policy | Mean training-nbhd draws > 35 % on the interval |
|---|---|---:|---|---:|---:|
| CTRL | $32,874 / $31,971 / −$32,762 / $102,151 | 26/32 | $46,130 / $44,434 / $74,544 | 4/32 | 80.7 % |
| EXP30 | $42,203 / $37,000 / −$54,525 / $122,358 | 28/32 | $45,614 / $45,087 / $79,114 | 8/32 | 82.1 % |

Benchmarks (descriptive, never selectable): benchmark: New L0: qualified CTRL True / EXP-30 True, centre $79,970 / DD $10,633; benchmark: N/original: qualified CTRL True / EXP-30 True, centre $80,437 / DD $10,691. Interval: benchmark: New L0 $171,403 / DD $17,281; benchmark: N/original $171,402 / DD $17,281.

## C21 (primary)

**Decomposition of D (report-only; exact identities on the sealed verdicts):** D = [V_P3(CTRL lane) − V_P0(CTRL lane)] (P3 eligibility applied to CTRL's own candidates) + [V_P3(EXP-30 lane) − V_P3(CTRL lane)] (search path, compared under P3); and in the other order D = [V_P0(EXP-30) − V_P0(CTRL)] (search path under P0) + [V_P3(EXP-30) − V_P0(EXP-30)] (eligibility on EXP-30's candidates).

| Component | Mean | 80 % interval (stratified bootstrap) |
|---|---:|---|
| D (primary) | $10,729 | $6,310 … $15,407 |
| eligibility on CTRL candidates | $1,265 | $0 … $2,529 |
| search path under P3 | $9,465 | $5,785 … $13,263 |
| search path under P0 | −$4,717 | −$15,891 … $5,572 |
| eligibility on EXP-30 candidates | $15,446 | $7,137 … $24,619 |

Pairs with the same representative in both arms: 0/32. EXP-30 representatives that P0 would reject: 11/32 (centre DD > $35k: 1; confirmation p90 DD > $35k: 11). CTRL representatives that P3 would reject: 0/32.

| Arm | Lanes | Requested | Median / max lane requested | Islands (count: lanes) | Stop reasons | Screen plausible (of 16,384) | Rung-3 feasible / fitted | Top screen rejection reasons |
|---|---:|---:|---|---|---|---:|---|---|
| CTRL | 32 | 602,894 | 18,470 / 25,566 | 2: 4, 3: 7, 4: 9, 5: 6, 6: 6 | triggers not met…: 29; extension cap reached …: 3 | 1702 | 188 / 192 | DD > ceiling 7110; a family unfunded 6122; plausible 1702; net ≤ 0 1450 |
| EXP30 | 32 | 581,227 | 18,606 / 25,960 | 2: 5, 3: 9, 4: 8, 5: 7, 6: 3 | triggers not met…: 30; extension cap reached …: 2 | 2522 | 187 / 192 | a family unfunded 6122; DD > ceiling & BD > limit 3118; plausible 2522; DD > ceiling & PL > limit & BD > limit 1518 |

| Arm | Representatives' confirmation draws | > 35 % DD | > 40 % DD | PL > 25 % | BD > 25 % | BD > 30 % |
|---|---:|---:|---:|---:|---:|---:|
| CTRL | 12,288 | 276 (2.2 %) | 89 (0.7 %) | 42 (0.3 %) | 390 (3.2 %) | 98 (0.8 %) |
| EXP30 | 12,288 | 1,085 (8.8 %) | 196 (1.6 %) | 77 (0.6 %) | 549 (4.5 %) | 121 (1.0 %) |

| Arm | Interval net mean / median / min / max | Positive | Interval DD mean / median / max | Whole run passes own policy | Mean training-nbhd draws > 35 % on the interval |
|---|---|---:|---|---:|---:|
| CTRL | −$10,927 / −$12,964 / −$41,328 / $25,693 | 8/32 | $46,243 / $44,338 / $77,655 | 6/32 | 74.4 % |
| EXP30 | −$14,975 / −$18,128 / −$49,128 / $30,338 | 7/32 | $49,176 / $48,935 / $79,652 | 6/32 | 73.4 % |

Benchmarks (descriptive, never selectable): benchmark: New L0: qualified CTRL True / EXP-30 True, centre $251,373 / DD $17,281; benchmark: N/original: qualified CTRL True / EXP-30 True, centre $251,839 / DD $17,281. Interval: benchmark: New L0 $87,238 / DD $19,460; benchmark: N/original $92,082 / DD $19,460.

## C24 (primary)

**Decomposition of D (report-only; exact identities on the sealed verdicts):** D = [V_P3(CTRL lane) − V_P0(CTRL lane)] (P3 eligibility applied to CTRL's own candidates) + [V_P3(EXP-30 lane) − V_P3(CTRL lane)] (search path, compared under P3); and in the other order D = [V_P0(EXP-30) − V_P0(CTRL)] (search path under P0) + [V_P3(EXP-30) − V_P0(EXP-30)] (eligibility on EXP-30's candidates).

| Component | Mean | 80 % interval (stratified bootstrap) |
|---|---:|---|
| D (primary) | $16,387 | $9,890 … $22,871 |
| eligibility on CTRL candidates | $0 | $0 … $0 |
| search path under P3 | $16,387 | $9,793 … $22,820 |
| search path under P0 | −$11,238 | −$26,563 … $3,351 |
| eligibility on EXP-30 candidates | $27,625 | $14,977 … $41,396 |

Pairs with the same representative in both arms: 0/32. EXP-30 representatives that P0 would reject: 12/32 (centre DD > $35k: 1; confirmation p90 DD > $35k: 12). CTRL representatives that P3 would reject: 0/32.

| Arm | Lanes | Requested | Median / max lane requested | Islands (count: lanes) | Stop reasons | Screen plausible (of 16,384) | Rung-3 feasible / fitted | Top screen rejection reasons |
|---|---:|---:|---|---|---|---:|---|---|
| CTRL | 32 | 458,526 | 13,770 / 19,061 | 2: 4, 3: 6, 4: 9, 5: 2, 6: 11 | triggers not met…: 29; extension cap reached …: 3 | 244 | 172 / 192 | DD > ceiling 8553; a family unfunded 5244; net ≤ 0 2343; plausible 244 |
| EXP30 | 32 | 518,904 | 17,192 / 21,915 | 2: 3, 3: 5, 4: 6, 5: 4, 6: 14 | triggers not met…: 25; extension cap reached …: 7 | 390 | 174 / 192 | DD > ceiling & BD > limit 6055; a family unfunded 5244; net ≤ 0 2343; DD > ceiling & PL > limit & BD > limit 1891 |

| Arm | Representatives' confirmation draws | > 35 % DD | > 40 % DD | PL > 25 % | BD > 25 % | BD > 30 % |
|---|---:|---:|---:|---:|---:|---:|
| CTRL | 12,288 | 403 (3.3 %) | 117 (1.0 %) | 12 (0.1 %) | 701 (5.7 %) | 176 (1.4 %) |
| EXP30 | 12,288 | 1,621 (13.2 %) | 293 (2.4 %) | 46 (0.4 %) | 760 (6.2 %) | 219 (1.8 %) |

| Arm | Interval net mean / median / min / max | Positive | Interval DD mean / median / max | Whole run passes own policy | Mean training-nbhd draws > 35 % on the interval |
|---|---|---:|---|---:|---:|
| CTRL | $43,741 / $42,915 / $1,604 / $91,827 | 32/32 | $20,248 / $19,386 / $34,013 | 30/32 | 2.4 % |
| EXP30 | $31,360 / $31,661 / $857 / $70,381 | 32/32 | $27,428 / $24,360 / $44,168 | 23/32 | 24.6 % |

Benchmarks (descriptive, never selectable): benchmark: New L0: qualified CTRL True / EXP-30 True, centre $382,721 / DD $19,460; benchmark: N/original: qualified CTRL True / EXP-30 True, centre $388,031 / DD $19,460. Interval: benchmark: New L0 $96,884 / DD $20,386; benchmark: N/original $94,670 / DD $20,386.

## Historical R1/R2 context (comparison only — never in D; the pilot's EXP lanes were searched under 40/25/25, then requalified by Stage A)

| Lane | CTRL V under P0 | CTRL members under P3 (Stage A) | pilot EXP V under P2 | pilot EXP members under P3 (Stage A) | pilot D (EXP P2 − CTRL P0) |
|---|---:|---:|---:|---:|---:|
| C21/broad/GA0.VA0/R1 | $188,316 | $188,316 | $202,274 | $202,274 | $13,958 |
| C21/broad/GA0.VA0/R2 | $189,175 | $189,175 | $212,276 | $212,276 | $23,101 |
| C21/broad/GB0.VD1/R1 | $216,732 | $216,732 | $189,648 | $189,648 | −$27,085 |
| C21/broad/GB0.VD1/R2 | $212,165 | $212,165 | $209,269 | $209,269 | −$2,896 |
| C24/broad/GA0.VA0/R1 | $173,849 | $205,661 | $197,012 | $197,012 | $23,163 |
| C24/broad/GA0.VA0/R2 | $176,610 | $176,610 | $163,798 | $163,798 | −$12,812 |
| C24/broad/GB0.VD1/R1 | $162,957 | $162,957 | $167,547 | $167,547 | $4,590 |
| C24/broad/GB0.VD1/R2 | $218,842 | $218,842 | $176,287 | $176,287 | −$42,555 |

Pilot mean D at C21 over its 4 R1/R2 pairs: $1,770.

Pilot mean D at C24 over its 4 R1/R2 pairs: −$6,904.
