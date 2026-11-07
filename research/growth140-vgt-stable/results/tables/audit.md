# Archive audit — growth140-vgt-s8m development archive (read only)

## Inventory

- Manifest verified (10 files, MANIFEST sha256 `0d99b32520fe…`).
- 427,894 evaluated configurations; 23,235 centres (configurations fitted with a neighbourhood); 404,659 neighbour-only points.
- Fits by rung: r1 23,040, r2 192, r3+r3b 8, r3 48, refine 213. Fidelities: r1 = 16 draws (old instrument: grid-step radius); r2 = 64; refine = 64; r3 = 128; r3+r3b = 256 (T2 re-score).
- Screen: 16,384 vectors → 16,384 distinct configurations. Island offspring duplicates (proposed again, not re-evaluated): 6,369.

## Exclusion funnel — rise

| Step | Remaining | Excluded here |
|---|---:|---:|
| screen: distinct configurations | 8,192 |  |
| screen plausibility: centre DD < $35k | 5,932 | 2,260 |
| … and net > 0 | 2,253 | 3,679 |
| … and trades ≥ 7 (activity) | 927 | 1,326 |
| promoted to rung 1 (cap 2,560: ½ rank, ½ diversity) | 903 | 24 |
| rung-1 centres (screen + islands) | 1,962 |  |
| rung-1 feasible under the completed study’s rules | 0 |  |
| selected for rung 2 (top 192, L∞ ≥ 0.02) | 0 |  |
| rung-2 feasible (old rules) | 0 |  |
| rung-2 feasible (new rules) | 0 |  |
| selected for rung 3 (top 48, L∞ ≥ 0.03) | 0 |  |
| rung-3 feasible (old rules) | 0 |  |
| rung-3 feasible (new rules) | 0 |  |
| shortlist (6, L∞ ≥ 0.10, one per ledger) | 0 |  |
| frozen (qualified) | 0 |  |

Under the new rules (net > 0, DD ≤ $35,000, p90 ≤ $35,000, p10 > 0) 336 of 1,962 rung-1 centres are feasible (16-draw screening estimate).

### Rung-1 reasons — rise (1,962 centres)

| Reason group | Failing (overlapping) | Only reason | First reason (sequential) |
|---|---:|---:|---:|
| drawdown | 357 | 0 | 357 |
| stability | 1,649 | 0 | 1,296 |
| activity | 1,214 | 0 | 213 |
| neighbourhoodProfit | 1,950 | 2 | 96 |
| capitalEfficiency | 1,337 | 0 | 0 |
| concentration | 1,935 | 0 | 0 |

New-feasible but excluded by the old rules: 336 (by old reason: neighbourhoodProfit 335, concentration 334, activity 224, capitalEfficiency 179, stability 27). New-feasible centres selected for rung 2: 0; not selected (promotion cap or crowding): 336.

## Exclusion funnel — breakout

| Step | Remaining | Excluded here |
|---|---:|---:|
| screen: distinct configurations | 8,192 |  |
| screen plausibility: centre DD < $35k | 3,996 | 4,196 |
| … and net > 0 | 2,721 | 1,275 |
| … and trades ≥ 7 (activity) | 2,215 | 506 |
| promoted to rung 1 (cap 2,560: ½ rank, ½ diversity) | 1,657 | 558 |
| rung-1 centres (screen + islands) | 21,078 |  |
| rung-1 feasible under the completed study’s rules | 5,362 |  |
| selected for rung 2 (top 192, L∞ ≥ 0.02) | 192 |  |
| rung-2 feasible (old rules) | 112 |  |
| rung-2 feasible (new rules) | 182 |  |
| selected for rung 3 (top 48, L∞ ≥ 0.03) | 48 |  |
| rung-3 feasible (old rules) | 47 |  |
| rung-3 feasible (new rules) | 48 |  |
| shortlist (6, L∞ ≥ 0.10, one per ledger) | 6 |  |
| frozen (qualified) | 6 |  |

Under the new rules (net > 0, DD ≤ $35,000, p90 ≤ $35,000, p10 > 0) 15,559 of 21,078 rung-1 centres are feasible (16-draw screening estimate).

### Rung-1 reasons — breakout (21,078 centres)

| Reason group | Failing (overlapping) | Only reason | First reason (sequential) |
|---|---:|---:|---:|
| drawdown | 1,845 | 0 | 1,845 |
| stability | 6,066 | 194 | 4,291 |
| activity | 3,582 | 51 | 1,473 |
| neighbourhoodProfit | 14,731 | 4,150 | 7,715 |
| capitalEfficiency | 5,763 | 0 | 0 |
| concentration | 9,824 | 392 | 392 |

New-feasible but excluded by the old rules: 10,197 (by old reason: neighbourhoodProfit 9607, capitalEfficiency 2439, concentration 5349, stability 620, activity 1556). New-feasible centres selected for rung 2: 192; not selected (promotion cap or crowding): 15,367.

## Structural composition per stage (crowding)

| Cell | Rung 1 | Rung 1 new-feasible | Rung 2 | Rung 3 | Shortlist |
|---|---:|---:|---:|---:|---:|
| breakout|hold:off|gate:off | 11864 | 9227 | 127 | 47 | 6 |
| breakout|hold:off|gate:on | 1139 | 384 | 0 | 0 | 0 |
| breakout|hold:on|gate:off | 6743 | 5221 | 65 | 1 | 0 |
| breakout|hold:on|gate:on | 1332 | 727 | 0 | 0 | 0 |
| rise|hold:off|gate:off | 589 | 95 | 0 | 0 | 0 |
| rise|hold:off|gate:on | 248 | 55 | 0 | 0 | 0 |
| rise|hold:on|gate:off | 643 | 72 | 0 | 0 | 0 |
| rise|hold:on|gate:on | 482 | 114 | 0 | 0 | 0 |

## Breakdown by family × maximum hold × gate × continuation (best available fidelity)

| Structure | Centres | Old-feasible (r1) | New-feasible | Best centre net (DD ≤ $35k) | Best robust (new-feasible) | Median robust |
|---|---:|---:|---:|---:|---:|---:|
| breakout|hold:off|gate:off|cont:breakout | 5578 | 2166 | 4700 | $124,930.62 | $95,511.46 | $80,965.70 |
| breakout|hold:off|gate:off|cont:classic_d1 | 3328 | 1726 | 2735 | $155,374.87 | $105,975.28 | $79,225.33 |
| breakout|hold:off|gate:off|cont:ma_cross | 1059 | 81 | 622 | $119,257.60 | $88,823.57 | $67,085.47 |
| breakout|hold:off|gate:off|cont:off | 869 | 8 | 507 | $128,902.01 | $87,637.46 | $62,331.70 |
| breakout|hold:off|gate:off|cont:shallow_pullback | 1225 | 492 | 822 | $113,791.44 | $93,415.32 | $82,537.34 |
| breakout|hold:off|gate:on|cont:breakout | 308 | 2 | 110 | $103,426.11 | $84,028.16 | $49,011.34 |
| breakout|hold:off|gate:on|cont:classic_d1 | 234 | 0 | 79 | $106,715.23 | $80,630.71 | $44,536.19 |
| breakout|hold:off|gate:on|cont:ma_cross | 168 | 0 | 64 | $91,723.57 | $86,100.08 | $42,575.17 |
| breakout|hold:off|gate:on|cont:off | 223 | 0 | 58 | $97,198.79 | $78,046.06 | $39,350.05 |
| breakout|hold:off|gate:on|cont:shallow_pullback | 206 | 0 | 73 | $108,597.61 | $69,605.57 | $41,288.63 |
| breakout|hold:on|gate:off|cont:breakout | 725 | 13 | 563 | $112,198.26 | $67,485.70 | $46,250.79 |
| breakout|hold:on|gate:off|cont:classic_d1 | 2586 | 828 | 2114 | $148,717.32 | $95,628.95 | $61,803.87 |
| breakout|hold:on|gate:off|cont:ma_cross | 1747 | 29 | 1331 | $117,136.61 | $72,245.66 | $46,755.58 |
| breakout|hold:on|gate:off|cont:off | 743 | 16 | 570 | $127,307.34 | $83,231.14 | $44,868.22 |
| breakout|hold:on|gate:off|cont:shallow_pullback | 942 | 1 | 643 | $114,696.40 | $81,947.84 | $45,526.24 |
| breakout|hold:on|gate:on|cont:breakout | 209 | 0 | 97 | $89,425.05 | $72,766.33 | $23,434.30 |
| breakout|hold:on|gate:on|cont:classic_d1 | 271 | 0 | 141 | $107,395.11 | $61,527.64 | $30,327.10 |
| breakout|hold:on|gate:on|cont:ma_cross | 383 | 0 | 234 | $95,584.56 | $79,892.35 | $32,925.81 |
| breakout|hold:on|gate:on|cont:off | 197 | 0 | 105 | $78,653.69 | $69,155.11 | $22,312.27 |
| breakout|hold:on|gate:on|cont:shallow_pullback | 272 | 0 | 150 | $95,609.35 | $82,817.70 | $31,134.06 |
| rise|hold:off|gate:off|cont:breakout | 207 | 0 | 50 | $99,574.78 | $67,384.49 | $8,340.87 |
| rise|hold:off|gate:off|cont:classic_d1 | 139 | 0 | 9 | $95,443.87 | $40,146.24 | $14,351.53 |
| rise|hold:off|gate:off|cont:ma_cross | 85 | 0 | 15 | $89,191.77 | $45,805.33 | $25,993.04 |
| rise|hold:off|gate:off|cont:off | 79 | 0 | 10 | $96,070.19 | $37,591.16 | $20,237.90 |
| rise|hold:off|gate:off|cont:shallow_pullback | 79 | 0 | 11 | $97,522.28 | $96,238.43 | $28,839.43 |
| rise|hold:off|gate:on|cont:breakout | 50 | 0 | 14 | $92,742.74 | $40,640.41 | $23,257.46 |
| rise|hold:off|gate:on|cont:classic_d1 | 33 | 0 | 2 | $93,080.85 | $32,200.46 | $24,348.52 |
| rise|hold:off|gate:on|cont:ma_cross | 50 | 0 | 16 | $82,660.99 | $56,990.16 | $24,379.90 |
| rise|hold:off|gate:on|cont:off | 58 | 0 | 12 | $79,033.26 | $38,105.91 | $19,871.49 |
| rise|hold:off|gate:on|cont:shallow_pullback | 57 | 0 | 11 | $77,227.01 | $41,468.01 | $20,075.51 |
| rise|hold:on|gate:off|cont:breakout | 112 | 0 | 9 | $109,754.02 | $73,818.37 | $18,239.84 |
| rise|hold:on|gate:off|cont:classic_d1 | 156 | 0 | 12 | $93,889.31 | $26,969.22 | $13,405.74 |
| rise|hold:on|gate:off|cont:ma_cross | 147 | 0 | 21 | $100,754.59 | $28,797.06 | $15,089.69 |
| rise|hold:on|gate:off|cont:off | 118 | 0 | 15 | $103,919.48 | $48,514.22 | $15,340.23 |
| rise|hold:on|gate:off|cont:shallow_pullback | 110 | 0 | 15 | $106,666.35 | $57,026.76 | $18,039.19 |
| rise|hold:on|gate:on|cont:breakout | 87 | 0 | 21 | $69,659.41 | $40,016.22 | $18,930.09 |
| rise|hold:on|gate:on|cont:classic_d1 | 91 | 0 | 19 | $89,991.75 | $43,297.50 | $23,301.01 |
| rise|hold:on|gate:on|cont:ma_cross | 86 | 0 | 15 | $78,514.98 | $50,180.17 | $20,671.24 |
| rise|hold:on|gate:on|cont:off | 108 | 0 | 33 | $82,483.32 | $46,490.01 | $18,369.76 |
| rise|hold:on|gate:on|cont:shallow_pullback | 110 | 0 | 26 | $69,799.00 | $38,987.16 | $20,237.85 |

## Frontier — rise: centre net vs centre drawdown (centres with DD ≤ $35,000)

| id | fidelity | centre net | centre DD | nb median | nb p10 | nb p90 DD | trades (W/L) | exposure | old reasons | reached |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| 44bf6d2e1405922c | r1 (16 draws) | $109,754.02 | $30,466.78 | $62,437.30 | $6,797.27 | $55,760.26 | 7 (4/3) | 55.7% | stability, activity, neighbourhoodProfit, concentration | r1 |
| 55512eb80cc8c007 | r1 (16 draws) | $106,666.35 | $23,286.46 | $66,274.13 | $31,360.19 | $54,506.00 | 11 (8/2) | 71.0% | stability, activity, neighbourhoodProfit, concentration | r1 |
| d47ec489797e754d | r1 (16 draws) | $96,638.51 | $20,169.69 | $90,741.50 | $67,199.39 | $40,186.59 | 9 (8/0) | 77.0% | stability, activity, concentration | r1 |
| 61d8bf428cdf3cb2 | r1 (16 draws) | $91,477.39 | $19,249.42 | $63,593.02 | $45,091.13 | $51,513.55 | 8 (7/0) | 45.1% | stability, activity, neighbourhoodProfit, concentration | r1 |
| e4665efec0391823 | r1 (16 draws) | $91,191.24 | $19,215.14 | $44,359.17 | $5,008.76 | $31,203.48 | 14 (8/5) | 52.8% | neighbourhoodProfit, concentration | r1 |
| 9db0d365dc464344 | r1 (16 draws) | $84,187.75 | $16,325.46 | $29,794.80 | −$22,152.57 | $53,262.48 | 16 (8/8) | 43.7% | stability, neighbourhoodProfit, concentration | r1 |
| 570ee134b739fcdb | r1 (16 draws) | $75,195.82 | $14,715.91 | $43,439.83 | $27,734.45 | $31,743.64 | 23 (15/7) | 71.1% | neighbourhoodProfit, concentration | r1 |
| 18b8fbd2c54aedd4 | r1 (16 draws) | $67,104.79 | $13,725.44 | $52,528.71 | $34,841.16 | $46,061.50 | 11 (10/0) | 55.2% | stability, activity, neighbourhoodProfit | r1 |
| c1e7a4017ff615a3 | r1 (16 draws) | $63,177.52 | $13,334.98 | $29,120.90 | $10,410.98 | $25,991.61 | 23 (11/11) | 44.3% | neighbourhoodProfit | r1 |
| f3ebe05f8f7ecda8 | r1 (16 draws) | $56,858.80 | $13,307.65 | $27,575.57 | $11,925.62 | $36,246.88 | 3 (3/0) | 23.9% | stability, activity, neighbourhoodProfit, concentration | r1 |
| a81374354e62bca9 | r1 (16 draws) | $55,394.21 | $11,373.22 | $46,796.62 | $27,996.61 | $22,525.60 | 8 (6/2) | 20.9% | activity, neighbourhoodProfit, concentration | r1 |
| fd0ed40d43dcf8c9 | r1 (16 draws) | $55,350.52 | $10,081.70 | $35,146.38 | $4,832.15 | $24,633.78 | 15 (11/4) | 32.7% | neighbourhoodProfit, concentration | r1 |
| c792f9ffef142396 | r1 (16 draws) | $54,721.27 | $9,552.15 | $35,619.93 | $16,366.16 | $28,222.11 | 7 (5/1) | 67.6% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| 139ae1f12ca34c18 | r1 (16 draws) | $40,628.96 | $7,547.74 | $29,100.88 | $11,744.97 | $12,579.87 | 7 (5/2) | 15.5% | activity, neighbourhoodProfit, concentration | r1 |
| 0638607f67881a0c | r1 (16 draws) | $30,151.42 | $6,081.34 | $28,049.44 | $8,690.08 | $15,054.46 | 7 (7/0) | 12.0% | activity, neighbourhoodProfit, concentration | r1 |
| 8e201481775a1ef5 | r1 (16 draws) | $17,976.20 | $5,543.15 | $13,981.80 | $3,349.06 | $21,112.10 | 7 (4/3) | 22.0% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| c00c579f91922613 | r1 (16 draws) | $8,710.91 | $5,490.93 | $3,527.88 | −$887.48 | $12,115.70 | 1 (1/0) | 2.8% | stability, activity, neighbourhoodProfit, concentration | r1 |
| 9eebefa1bac1c2e2 | r1 (16 draws) | $2,685.97 | $4,955.80 | $0.00 | −$8,816.00 | $21,381.86 | 1 (1/0) | 0.5% | stability, activity, neighbourhoodProfit, concentration | r1 |

### Frontier — rise: robust net vs p90 drawdown (new-feasible centres)

| id | fidelity | centre net | centre DD | nb median | nb p10 | nb p90 DD | trades (W/L) | exposure | old reasons | reached |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| 06baffd6897b6fe0 | r1 (16 draws) | $97,522.28 | $27,434.69 | $98,286.08 | $94,190.79 | $33,918.57 | 8 (5/2) | 78.0% | activity, concentration | r1 |
| 43d5f822e9d08011 | r1 (16 draws) | $91,910.46 | $21,645.91 | $85,214.07 | $62,422.67 | $31,953.45 | 9 (3/5) | 69.8% | activity, neighbourhoodProfit, concentration | r1 |
| 270ec10d449deafc | r1 (16 draws) | $66,116.05 | $22,932.01 | $72,652.94 | $62,116.05 | $26,706.74 | 13 (8/4) | 74.2% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| 4b8221887ead6fc6 | r1 (16 draws) | $57,770.54 | $19,962.58 | $53,413.46 | $40,150.31 | $24,282.83 | 12 (8/4) | 33.0% | activity, neighbourhoodProfit, concentration | r1 |
| c3570604713e5b38 | r1 (16 draws) | $55,454.61 | $16,177.25 | $47,342.73 | $36,563.83 | $22,896.60 | 11 (8/3) | 32.2% | activity, neighbourhoodProfit, concentration | r1 |
| 4d1271101d0c7515 | r1 (16 draws) | $46,917.23 | $23,005.05 | $45,526.87 | $34,505.57 | $21,472.09 | 11 (5/6) | 35.2% | activity, neighbourhoodProfit, concentration | r1 |
| 92ddb5041b930eb7 | r1 (16 draws) | $45,071.59 | $12,223.20 | $39,320.42 | $23,443.77 | $16,785.41 | 7 (6/1) | 50.5% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| e2077182b12ead01 | r1 (16 draws) | $16,005.66 | $14,140.76 | $31,905.60 | $14,835.40 | $15,699.42 | 7 (3/4) | 14.6% | activity, neighbourhoodProfit, concentration | r1 |
| 139ae1f12ca34c18 | r1 (16 draws) | $40,628.96 | $7,547.74 | $29,100.88 | $11,744.97 | $12,579.87 | 7 (5/2) | 15.5% | activity, neighbourhoodProfit, concentration | r1 |
| bd20cc6c9e940bf9 | r1 (16 draws) | $9,498.44 | $12,953.93 | $18,051.60 | $8,972.43 | $11,262.58 | 6 (2/4) | 11.6% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| 6a1bfd961930da31 | r1 (16 draws) | $1,337.92 | $7,576.78 | $2,055.99 | $554.43 | $10,300.54 | 1 (1/0) | 0.3% | activity, neighbourhoodProfit, concentration | r1 |

## Frontier — breakout: centre net vs centre drawdown (centres with DD ≤ $35,000)

| id | fidelity | centre net | centre DD | nb median | nb p10 | nb p90 DD | trades (W/L) | exposure | old reasons | reached |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| ece93cd5d5e64777 | refine (64 draws) | $155,374.87 | $24,679.71 | $102,122.77 | $62,882.42 | $35,189.33 | 23 (19/3) | 73.5% | stability, concentration | r1 |
| 12fb03a3c4ca1fba | r1 (16 draws) | $148,717.32 | $21,297.87 | $111,608.94 | $79,648.97 | $27,194.76 | 22 (13/8) | 70.6% | concentration | r1 |
| e409d51c54ff45b3 | refine (64 draws) | $138,656.66 | $20,299.79 | $111,397.33 | $73,257.40 | $28,187.20 | 23 (19/3) | 69.2% | — | r1 |
| cb3b72c2da65a063 | refine (64 draws) | $138,548.52 | $18,795.56 | $114,890.00 | $72,825.38 | $26,288.54 | 23 (19/3) | 68.6% | — | r1 |
| a6ca78a731dae694 | r1 (16 draws) | $133,603.94 | $18,609.74 | $90,103.53 | $48,482.76 | $35,947.97 | 23 (15/7) | 66.0% | stability, concentration | r1 |
| ec124684b6466d77 | r3+r3b (256 draws) | $133,078.09 | $17,772.79 | $110,427.58 | $84,689.19 | $28,071.62 | 20 (16/3) | 69.8% | — | shortlist |
| 36dcdb153a3210ac | r3+r3b (256 draws) | $132,486.08 | $16,699.49 | $107,569.67 | $77,566.34 | $25,934.31 | 23 (19/3) | 68.1% | — | r3 |
| 419eb911e03604fd | r1 (16 draws) | $121,788.87 | $16,346.42 | $93,704.35 | $64,968.34 | $26,861.04 | 23 (18/4) | 68.2% | — | r1 |
| d43f685deff5587f | r1 (16 draws) | $112,107.16 | $15,842.11 | $67,159.65 | $41,945.92 | $32,089.64 | 21 (17/3) | 67.0% | neighbourhoodProfit | r1 |
| 71b61b257ceed4a2 | r1 (16 draws) | $109,862.93 | $14,760.74 | $85,554.25 | $46,473.54 | $28,840.76 | 29 (17/11) | 61.7% | neighbourhoodProfit | r1 |
| ec5672386fa94f6c | r1 (16 draws) | $104,327.57 | $14,564.99 | $70,004.86 | $45,727.87 | $25,718.49 | 29 (20/8) | 63.1% | neighbourhoodProfit | r1 |
| c3904624b7603e6d | r1 (16 draws) | $100,117.80 | $14,475.05 | $67,970.27 | $31,352.77 | $27,654.56 | 29 (19/9) | 62.5% | neighbourhoodProfit | r1 |
| 77c35fc7712d4c03 | r1 (16 draws) | $98,744.34 | $13,201.21 | $74,977.70 | $38,046.80 | $24,758.75 | 28 (18/9) | 61.4% | neighbourhoodProfit | r1 |
| abe725adabb3ff47 | r1 (16 draws) | $85,720.10 | $12,821.12 | $73,086.73 | $32,540.29 | $23,267.68 | 28 (17/10) | 56.1% | neighbourhoodProfit | r1 |
| 1236d05e8acd0aab | r1 (16 draws) | $83,305.43 | $11,373.57 | $63,896.27 | $28,911.27 | $28,358.29 | 21 (16/4) | 66.9% | neighbourhoodProfit | r1 |
| dd997cbb2dd52e8b | r1 (16 draws) | $78,394.24 | $11,280.25 | $50,007.84 | $29,326.41 | $17,911.50 | 26 (16/9) | 62.2% | neighbourhoodProfit | r1 |
| e0c92cb82ff24144 | r1 (16 draws) | $77,913.73 | $10,828.60 | $71,815.77 | $41,903.87 | $19,517.53 | 26 (19/7) | 56.2% | neighbourhoodProfit | r1 |
| b65a85eb676c2cfd | r1 (16 draws) | $73,169.88 | $10,527.07 | $54,803.97 | $42,932.25 | $44,305.75 | 13 (12/0) | 56.4% | stability, activity, neighbourhoodProfit | r1 |
| 5891d3669897228f | r1 (16 draws) | $67,963.07 | $10,227.71 | $44,434.72 | $27,673.95 | $16,464.36 | 27 (15/11) | 57.9% | neighbourhoodProfit | r1 |
| 834e8f9f77508613 | r1 (16 draws) | $44,766.23 | $9,864.51 | $34,375.23 | $16,178.94 | $18,532.32 | 28 (14/13) | 56.7% | neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| c2cd79db1feb5231 | r1 (16 draws) | $43,223.45 | $8,950.26 | $39,194.39 | $28,898.52 | $20,006.18 | 13 (10/2) | 61.0% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| 90ce856db3459d89 | r1 (16 draws) | $23,838.18 | $8,728.36 | $15,541.11 | $6,116.54 | $23,188.00 | 27 (13/13) | 57.4% | neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| 17f064579f8883e6 | r1 (16 draws) | $3,167.47 | $7,570.55 | $3,167.47 | −$11,340.86 | $32,792.31 | 1 (1/0) | 3.2% | stability, activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| 8023a7f0606a482f | r1 (16 draws) | $2,257.04 | $7,440.07 | $2,241.97 | $0.00 | $30,273.27 | 1 (1/0) | 0.9% | stability, activity, neighbourhoodProfit, concentration | r1 |

### Frontier — breakout: robust net vs p90 drawdown (new-feasible centres)

| id | fidelity | centre net | centre DD | nb median | nb p10 | nb p90 DD | trades (W/L) | exposure | old reasons | reached |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| 0c7f46c1a4f8459b | r1 (16 draws) | $145,577.68 | $26,296.29 | $126,535.22 | $85,415.34 | $32,120.34 | 21 (17/3) | 73.8% | concentration | r1 |
| a7f0a450285e7a50 | r1 (16 draws) | $133,891.10 | $28,175.05 | $116,171.71 | $95,677.06 | $28,370.34 | 18 (15/2) | 76.9% | concentration | r1 |
| 3cc73d908253b4c3 | r1 (16 draws) | $124,400.20 | $26,403.30 | $113,811.80 | $96,681.42 | $27,963.94 | 17 (13/3) | 74.4% | concentration | r1 |
| 35aa0693fb42a38f | r1 (16 draws) | $149,987.17 | $25,648.70 | $114,591.98 | $88,945.42 | $27,636.85 | 20 (17/2) | 73.1% | concentration | r1 |
| 0da3c7b1d985d5db | refine (64 draws) | $125,682.29 | $20,847.80 | $113,965.42 | $88,716.41 | $25,537.99 | 17 (13/3) | 69.6% | — | r1 |
| 87da270410456018 | refine (64 draws) | $130,503.41 | $20,662.11 | $113,301.46 | $88,243.66 | $25,303.09 | 17 (13/3) | 69.8% | — | r1 |
| f93437052cefe4c5 | refine (64 draws) | $127,393.30 | $20,662.11 | $110,583.07 | $84,479.25 | $24,705.05 | 17 (13/3) | 69.5% | — | r1 |
| 8a373a7e8d75fed9 | r1 (16 draws) | $102,401.06 | $20,314.28 | $97,558.98 | $83,823.41 | $21,387.63 | 14 (13/0) | 67.8% | — | r1 |
| 910851ddf3af3dab | r1 (16 draws) | $98,886.23 | $20,136.76 | $97,474.32 | $83,304.41 | $21,347.13 | 14 (13/0) | 66.7% | — | r1 |
| c8338253cb061b13 | r1 (16 draws) | $99,546.77 | $20,505.33 | $91,339.56 | $82,385.44 | $21,280.83 | 14 (13/0) | 68.1% | concentration | r1 |
| c7d8f05663003176 | r1 (16 draws) | $93,292.62 | $19,472.36 | $92,611.85 | $74,744.88 | $20,787.16 | 16 (13/2) | 66.1% | concentration | r1 |
| 8255f5afa212429d | r1 (16 draws) | $94,512.61 | $19,953.26 | $89,301.36 | $69,198.96 | $20,752.10 | 15 (13/1) | 67.9% | neighbourhoodProfit, concentration | r1 |
| ddec7f473939916f | refine (64 draws) | $100,510.00 | $16,007.11 | $86,151.49 | $70,645.02 | $20,731.09 | 13 (12/0) | 67.0% | activity, neighbourhoodProfit | r1 |
| 4b74da0a4aad5a41 | r1 (16 draws) | $95,369.16 | $19,826.02 | $86,761.50 | $69,848.42 | $20,714.00 | 15 (13/1) | 67.7% | neighbourhoodProfit, concentration | r1 |
| f8b1a72fe52ec6b2 | r1 (16 draws) | $102,686.92 | $16,007.11 | $83,307.05 | $71,201.91 | $20,273.16 | 13 (12/0) | 67.5% | activity, neighbourhoodProfit | r1 |
| 240f0071a03c3c1d | r1 (16 draws) | $87,163.95 | $19,061.34 | $82,816.19 | $68,025.46 | $20,254.50 | 17 (16/0) | 65.4% | neighbourhoodProfit | r1 |
| 8d7b2458ca7c4a08 | r1 (16 draws) | $88,423.10 | $18,969.96 | $82,848.04 | $67,545.00 | $20,218.66 | 17 (16/0) | 65.1% | neighbourhoodProfit | r1 |
| 0a8a745685b6a420 | refine (64 draws) | $73,355.80 | $19,266.85 | $82,657.23 | $66,488.41 | $20,023.79 | 15 (14/0) | 67.6% | neighbourhoodProfit | r1 |
| 5ce463ebeb9fdba0 | r1 (16 draws) | $80,910.52 | $17,466.23 | $83,116.82 | $65,861.52 | $19,349.36 | 15 (14/0) | 67.2% | neighbourhoodProfit | r1 |
| e2808ffe7ab1ba2e | r1 (16 draws) | $89,872.77 | $17,725.14 | $81,305.03 | $59,768.00 | $18,106.71 | 16 (15/0) | 75.3% | activity, neighbourhoodProfit, concentration | r1 |
| 7d4b647857cb0eee | r1 (16 draws) | $97,411.01 | $16,822.44 | $80,262.38 | $56,596.48 | $17,729.84 | 16 (15/0) | 73.9% | activity, neighbourhoodProfit | r1 |
| 6289b6fd88abc49d | r1 (16 draws) | $89,658.84 | $17,573.07 | $73,548.52 | $54,242.07 | $17,666.87 | 16 (15/0) | 76.1% | activity, neighbourhoodProfit, concentration | r1 |
| 3e0860a14108d7f0 | r1 (16 draws) | $68,683.63 | $15,755.36 | $65,724.08 | $50,180.38 | $17,621.93 | 6 (5/0) | 64.7% | activity, neighbourhoodProfit, concentration | r1 |
| f4f4777dbfe20bac | r1 (16 draws) | $68,895.13 | $16,364.53 | $65,405.33 | $49,785.40 | $17,475.73 | 15 (14/0) | 65.5% | neighbourhoodProfit | r1 |
| b6f1cb37bf320ff7 | r1 (16 draws) | $73,864.80 | $15,956.30 | $64,732.09 | $49,241.68 | $17,162.34 | 17 (15/1) | 59.4% | neighbourhoodProfit | r1 |
| e7b8bdab34d842fd | r1 (16 draws) | $62,728.63 | $16,241.21 | $62,531.12 | $50,931.11 | $17,099.43 | 15 (14/0) | 62.0% | neighbourhoodProfit | r1 |
| e2af76b6a0cfa319 | r1 (16 draws) | $73,597.19 | $15,515.85 | $62,464.28 | $46,527.67 | $16,545.02 | 16 (15/0) | 65.9% | activity, neighbourhoodProfit | r1 |
| e682eeba67369920 | r1 (16 draws) | $74,638.33 | $15,453.11 | $59,683.64 | $43,401.24 | $16,459.84 | 16 (14/1) | 66.3% | activity, neighbourhoodProfit | r1 |
| 6dedd1e2f4a7d474 | r1 (16 draws) | $57,675.61 | $12,799.46 | $47,376.70 | $36,805.39 | $16,340.64 | 11 (10/0) | 57.8% | activity, neighbourhoodProfit, concentration | r1 |
| aa6b7a33ee5e4141 | r1 (16 draws) | $50,884.34 | $11,546.91 | $43,973.74 | $28,720.88 | $16,237.89 | 4 (2/1) | 74.0% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| 7d78d83f5bb45615 | r1 (16 draws) | $41,005.13 | $13,335.38 | $38,185.23 | $33,420.20 | $16,181.20 | 7 (5/1) | 66.1% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| a62d481642d9f6bb | r1 (16 draws) | $36,990.37 | $14,902.67 | $39,372.34 | $31,238.18 | $16,179.83 | 14 (9/4) | 69.7% | neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| 7fce0be50096b123 | r1 (16 draws) | $36,467.90 | $13,845.50 | $36,335.62 | $32,612.02 | $14,964.53 | 12 (11/0) | 54.0% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| fb8f1a67180580fd | r1 (16 draws) | $38,181.64 | $9,255.26 | $37,134.20 | $31,612.79 | $14,714.15 | 8 (4/3) | 63.1% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| 0329aaf6afec6bb5 | r1 (16 draws) | $31,481.73 | $10,938.43 | $33,618.93 | $29,678.65 | $13,033.63 | 5 (4/0) | 71.6% | activity, neighbourhoodProfit, capitalEfficiency, concentration | r1 |
| 25567ffaaa617ded | r1 (16 draws) | $37,190.33 | $12,571.29 | $31,940.25 | $25,996.54 | $12,926.27 | 15 (10/5) | 65.5% | neighbourhoodProfit, capitalEfficiency, concentration | r1 |

## Promising Rise configurations the completed study rejected

### By robust net (new-feasible)

| id | fidelity | switches | centre net | centre DD | nb median | nb p10 | nb p90 | trades (W/L) | top trade share | old reasons | reached r2 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 06baffd6897b6fe0 | r1 (16 draws) | hold off, gate off, stop on, retain on, trend off, elig time_limited, cont shallow_pullback | $97,522.28 | $27,434.69 | $98,286.08 | $94,190.79 | $33,918.57 | 8 (5/2) | 0.49 | activity, concentration | no |
| 43d5f822e9d08011 | r1 (16 draws) | hold on (buffer on), gate off, stop on, retain on, trend off, elig time_limited, cont breakout | $91,910.46 | $21,645.91 | $85,214.07 | $62,422.67 | $31,953.45 | 9 (3/5) | 0.57 | activity, neighbourhoodProfit, concentration | no |
| 270ec10d449deafc | r1 (16 draws) | hold off, gate off, stop on, retain on, trend rising_sma, elig minimum_strength, cont breakout | $66,116.05 | $22,932.01 | $72,652.94 | $62,116.05 | $26,706.74 | 13 (8/4) | 0.59 | activity, neighbourhoodProfit, capitalEfficiency, concentration | no |
| 99aac47a1b30107c | r1 (16 draws) | hold off, gate off, stop on, retain on, trend rising_sma, elig minimum_strength, cont breakout | $66,116.05 | $22,932.01 | $72,652.94 | $62,116.05 | $26,706.74 | 13 (8/4) | 0.59 | activity, neighbourhoodProfit, capitalEfficiency, concentration | no |
| f7410addcf51251f | r1 (16 draws) | hold off, gate off, stop on, retain on, trend rising_sma, elig minimum_strength, cont breakout | $66,268.36 | $22,822.13 | $72,752.22 | $60,844.26 | $26,718.09 | 13 (8/4) | 0.59 | activity, neighbourhoodProfit, capitalEfficiency, concentration | no |
| cadf77205156439e | r1 (16 draws) | hold off, gate off, stop on, retain on, trend rising_sma, elig minimum_strength, cont breakout | $67,823.88 | $22,576.59 | $72,706.00 | $59,522.09 | $26,877.88 | 13 (8/4) | 0.58 | activity, neighbourhoodProfit, capitalEfficiency, concentration | no |
| 57d7027b557e258f | r1 (16 draws) | hold on (buffer on), gate off, stop on, retain on, trend off, elig deterioration, cont shallow_pullback | $61,848.51 | $28,125.81 | $61,581.51 | $52,472.01 | $30,536.75 | 1 (1/0) | 1.00 | activity, neighbourhoodProfit, concentration | no |
| a23c9e1100fff524 | r1 (16 draws) | hold off, gate on, stop on, retain on, trend rising_sma, elig reset_renew, cont ma_cross | $66,751.16 | $30,950.36 | $68,211.89 | $45,768.43 | $32,632.24 | 15 (10/4) | 0.41 | neighbourhoodProfit, concentration | no |
| 518ff7b47dc8717f | r1 (16 draws) | hold off, gate off, stop on, retain on, trend price_change, elig maximum_extension, cont breakout | $68,825.70 | $22,551.08 | $67,933.41 | $45,781.73 | $26,882.17 | 12 (7/4) | 0.57 | activity, neighbourhoodProfit, capitalEfficiency, concentration | no |
| a4ff75f5d7f2e8af | r1 (16 draws) | hold on (buffer on), gate on, stop off, retain on, trend off, elig reset_renew, cont ma_cross | $71,908.12 | $34,655.31 | $59,473.03 | $40,887.31 | $34,730.75 | 15 (3/11) | 0.46 | stability, neighbourhoodProfit, concentration | no |
| 1531acd0ecf159bd | r1 (16 draws) | hold off, gate off, stop on, retain on, trend rising_sma, elig time_limited, cont breakout | $89,126.09 | $31,256.64 | $55,140.63 | $44,562.33 | $30,136.47 | 16 (10/5) | 0.27 | neighbourhoodProfit, concentration | no |
| ee873f103f0c2f7d | r1 (16 draws) | hold off, gate off, stop on, retain off, trend off, elig off, cont breakout | $61,191.09 | $30,212.91 | $64,089.31 | $35,539.03 | $34,696.63 | 24 (10/13) | 0.40 | stability, neighbourhoodProfit, concentration | no |
| cfc0769dac6fa447 | r1 (16 draws) | hold off, gate on, stop on, retain on, trend rising_sma, elig reset_renew, cont ma_cross | $66,183.12 | $27,983.90 | $61,595.24 | $37,194.97 | $29,950.81 | 18 (13/4) | 0.22 | neighbourhoodProfit, concentration | no |
| 285d4a0774fd3950 | r1 (16 draws) | hold on (buffer on), gate off, stop on, retain off, trend price_change, elig reset_renew, cont off | $55,499.54 | $18,803.62 | $57,433.49 | $39,594.95 | $32,587.68 | 24 (10/14) | 0.59 | neighbourhoodProfit, concentration | no |
| c12fd51f5254a005 | r1 (16 draws) | hold off, gate off, stop off, retain on, trend price_change, elig time_limited, cont shallow_pullback | $50,144.10 | $29,424.38 | $49,445.53 | $45,528.27 | $30,798.08 | 6 (4/1) | 0.72 | activity, neighbourhoodProfit, capitalEfficiency, concentration | no |

### By centre net (DD ≤ $35,000)

| id | fidelity | switches | centre net | centre DD | nb median | nb p10 | nb p90 | trades (W/L) | top trade share | old reasons | reached r2 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 44bf6d2e1405922c | r1 (16 draws) | hold on (buffer off), gate off, stop off, retain on, trend regression_slope, elig deterioration, cont breakout | $109,754.02 | $30,466.78 | $62,437.30 | $6,797.27 | $55,760.26 | 7 (4/3) | 0.61 | stability, activity, neighbourhoodProfit, concentration | no |
| 55512eb80cc8c007 | r1 (16 draws) | hold on (buffer off), gate off, stop off, retain on, trend regression_slope, elig time_limited, cont shallow_pullback | $106,666.35 | $23,286.46 | $66,274.13 | $31,360.19 | $54,506.00 | 11 (8/2) | 0.33 | stability, activity, neighbourhoodProfit, concentration | no |
| 00d6ba5cfa73bb4e | r1 (16 draws) | hold on (buffer on), gate off, stop off, retain on, trend regression_slope, elig minimum_strength, cont off | $103,919.48 | $28,528.44 | $55,082.99 | $18,203.34 | $51,583.39 | 12 (5/6) | 0.43 | stability, activity, neighbourhoodProfit, concentration | no |
| c69edd153cc36796 | r1 (16 draws) | hold on (buffer on), gate off, stop on, retain on, trend regression_slope, elig reset_renew, cont ma_cross | $100,754.59 | $34,388.50 | $90,842.64 | $70,821.44 | $41,508.48 | 11 (6/4) | 0.39 | stability, activity, concentration | no |
| b40ddb2e2e493987 | r1 (16 draws) | hold off, gate off, stop on, retain off, trend regression_slope, elig deterioration, cont breakout | $99,574.78 | $32,205.18 | $87,968.16 | $64,818.95 | $49,694.10 | 8 (5/2) | 0.49 | stability, activity, neighbourhoodProfit, concentration | no |
| 06baffd6897b6fe0 | r1 (16 draws) | hold off, gate off, stop on, retain on, trend off, elig time_limited, cont shallow_pullback | $97,522.28 | $27,434.69 | $98,286.08 | $94,190.79 | $33,918.57 | 8 (5/2) | 0.49 | activity, concentration | no |
| d47ec489797e754d | r1 (16 draws) | hold off, gate off, stop off, retain on, trend rising_sma, elig minimum_strength, cont breakout | $96,638.51 | $20,169.69 | $90,741.50 | $67,199.39 | $40,186.59 | 9 (8/0) | 0.40 | stability, activity, concentration | no |
| bd33568bffd6ae8b | r1 (16 draws) | hold off, gate off, stop off, retain on, trend regression_slope, elig time_limited, cont off | $96,070.19 | $30,193.52 | $65,718.75 | $44,858.60 | $47,960.78 | 16 (14/2) | 0.17 | stability, neighbourhoodProfit | no |
| 63fcfc104b8ce4f4 | r1 (16 draws) | hold off, gate off, stop on, retain on, trend regression_slope, elig minimum_strength, cont classic_d1 | $95,443.87 | $34,726.21 | $56,842.28 | $44,137.47 | $46,838.52 | 11 (5/5) | 0.62 | stability, activity, neighbourhoodProfit, concentration | no |
| a741d7902a66b99d | r1 (16 draws) | hold off, gate off, stop on, retain on, trend rising_sma, elig time_limited, cont breakout | $94,911.79 | $23,893.01 | $54,097.87 | $35,698.39 | $24,834.61 | 17 (10/6) | 0.26 | neighbourhoodProfit, concentration | no |

Exact settings:

- `06baffd6897b6fe0`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=20, recentLowLookbackBars=130, trendFilterEnabled=false, eligibilityEnabled=true, eligibilityPolicy=time_limited, eligibilityMaxAgeSessions=27, drawdownRecoveryGateEnabled=false, trailingStopPercent=12, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=45, initialStopAtrMultiple=3.5, retentionEnabled=true, retentionSellPercent=70, retentionSmaSessions=180, retentionClosesBelow=1, continuationEnabled=true, continuationMethod=shallow_pullback, continuationWindowSessions=190, uptrendSmaBars=130, uptrendSlopeBars=15, uptrendMinimumRisePercent=4.75, pullbackMinimumPercent=1.5, pullbackMaximumPercent=7, recoveryPercent=1.75
- `43d5f822e9d08011`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=16.5, recentLowLookbackBars=170, trendFilterEnabled=false, eligibilityEnabled=true, eligibilityPolicy=time_limited, eligibilityMaxAgeSessions=10, drawdownRecoveryGateEnabled=false, trailingStopPercent=10.5, maximumHoldEnabled=true, maximumHoldDays=30, intradayLossBufferEnabled=true, intradayLossBufferPercent=2.5, initialStopEnabled=true, initialStopAtrSessions=5, initialStopAtrMultiple=1, retentionEnabled=true, retentionSellPercent=60, retentionSmaSessions=180, retentionClosesBelow=4, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=10, breakoutBufferPercent=3.5, breakoutFormationBars=9
- `270ec10d449deafc`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=5, recentLowLookbackBars=10, trendFilterEnabled=true, trendMethod=rising_sma, trendSmaSessions=100, trendSmaComparisonSessions=19, eligibilityEnabled=true, eligibilityPolicy=minimum_strength, eligibilityMaxAgeSessions=14, eligibilityMinimumAdvancePercent=1.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=6.5, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=25, initialStopAtrMultiple=2.5, retentionEnabled=true, retentionSellPercent=90, retentionSmaSessions=100, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=160, breakoutBufferPercent=2.75, breakoutFormationBars=5
- `99aac47a1b30107c`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=5, recentLowLookbackBars=10, trendFilterEnabled=true, trendMethod=rising_sma, trendSmaSessions=100, trendSmaComparisonSessions=19, eligibilityEnabled=true, eligibilityPolicy=minimum_strength, eligibilityMaxAgeSessions=14, eligibilityMinimumAdvancePercent=1.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=6.5, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=25, initialStopAtrMultiple=2.5, retentionEnabled=true, retentionSellPercent=90, retentionSmaSessions=100, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=160, breakoutBufferPercent=2.5, breakoutFormationBars=5
- `f7410addcf51251f`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=5, recentLowLookbackBars=10, trendFilterEnabled=true, trendMethod=rising_sma, trendSmaSessions=100, trendSmaComparisonSessions=19, eligibilityEnabled=true, eligibilityPolicy=minimum_strength, eligibilityMaxAgeSessions=14, eligibilityMinimumAdvancePercent=1.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=6.5, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=30, initialStopAtrMultiple=2.5, retentionEnabled=true, retentionSellPercent=90, retentionSmaSessions=100, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=160, breakoutBufferPercent=2.5, breakoutFormationBars=6
- `cadf77205156439e`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=5, recentLowLookbackBars=10, trendFilterEnabled=true, trendMethod=rising_sma, trendSmaSessions=100, trendSmaComparisonSessions=19, eligibilityEnabled=true, eligibilityPolicy=minimum_strength, eligibilityMaxAgeSessions=14, eligibilityMinimumAdvancePercent=1.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=6.5, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=30, initialStopAtrMultiple=2.5, retentionEnabled=true, retentionSellPercent=80, retentionSmaSessions=100, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=160, breakoutBufferPercent=2.5, breakoutFormationBars=6
- `57d7027b557e258f`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=20, recentLowLookbackBars=10, trendFilterEnabled=false, eligibilityEnabled=true, eligibilityPolicy=deterioration, eligibilityMaxAgeSessions=24, eligibilityDeteriorationDropPercent=4.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=8, maximumHoldEnabled=true, maximumHoldDays=15, intradayLossBufferEnabled=true, intradayLossBufferPercent=4.5, initialStopEnabled=true, initialStopAtrSessions=10, initialStopAtrMultiple=1.5, retentionEnabled=true, retentionSellPercent=20, retentionSmaSessions=110, retentionClosesBelow=4, continuationEnabled=true, continuationMethod=shallow_pullback, continuationWindowSessions=50, uptrendSmaBars=130, uptrendSlopeBars=8, uptrendMinimumRisePercent=1.75, pullbackMinimumPercent=1, pullbackMaximumPercent=6, recoveryPercent=1.75
- `a23c9e1100fff524`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=19.5, recentLowLookbackBars=140, trendFilterEnabled=true, trendMethod=rising_sma, trendSmaSessions=160, trendSmaComparisonSessions=2, eligibilityEnabled=true, eligibilityPolicy=reset_renew, eligibilityMaxAgeSessions=26, eligibilityResetDropPercent=3, eligibilityRenewalReboundPercent=5.5, drawdownRecoveryGateEnabled=true, dipLookbackSessions=60, dipThresholdPercent=14.5, recoveryRetracementPercent=50, recoveryConfirmationSessions=0, trailingStopPercent=6.5, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=45, initialStopAtrMultiple=4, retentionEnabled=true, retentionSellPercent=90, retentionSmaSessions=30, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=ma_cross, continuationWindowSessions=80, crossSmaBars=130, crossRisingBars=10, crossMinimumSlopePercent=0.7, crossMarginPercent=0.25
- `518ff7b47dc8717f`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=4.5, recentLowLookbackBars=10, trendFilterEnabled=true, trendMethod=price_change, trendChangeLookbackSessions=100, trendChangeMinimumReturnPercent=6.5, eligibilityEnabled=true, eligibilityPolicy=maximum_extension, eligibilityMaxAgeSessions=14, eligibilityMaximumExtensionPercent=4, drawdownRecoveryGateEnabled=false, trailingStopPercent=7, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=45, initialStopAtrMultiple=2.5, retentionEnabled=true, retentionSellPercent=90, retentionSmaSessions=110, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=160, breakoutBufferPercent=2.5, breakoutFormationBars=5
- `a4ff75f5d7f2e8af`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=20, recentLowLookbackBars=170, trendFilterEnabled=false, eligibilityEnabled=true, eligibilityPolicy=reset_renew, eligibilityMaxAgeSessions=26, eligibilityResetDropPercent=3.5, eligibilityRenewalReboundPercent=9.5, drawdownRecoveryGateEnabled=true, dipLookbackSessions=80, dipThresholdPercent=9.5, recoveryRetracementPercent=30, recoveryConfirmationSessions=10, trailingStopPercent=6, maximumHoldEnabled=true, maximumHoldDays=7, intradayLossBufferEnabled=true, intradayLossBufferPercent=5.5, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=40, retentionSmaSessions=120, retentionClosesBelow=4, continuationEnabled=true, continuationMethod=ma_cross, continuationWindowSessions=20, crossSmaBars=170, crossRisingBars=8, crossMinimumSlopePercent=1.2, crossMarginPercent=2.5
- `1531acd0ecf159bd`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=19, recentLowLookbackBars=180, trendFilterEnabled=true, trendMethod=rising_sma, trendSmaSessions=150, trendSmaComparisonSessions=7, eligibilityEnabled=true, eligibilityPolicy=time_limited, eligibilityMaxAgeSessions=10, drawdownRecoveryGateEnabled=false, trailingStopPercent=6.5, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=30, initialStopAtrMultiple=2, retentionEnabled=true, retentionSellPercent=80, retentionSmaSessions=30, retentionClosesBelow=5, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=160, breakoutBufferPercent=0.25, breakoutFormationBars=13
- `ee873f103f0c2f7d`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=19, recentLowLookbackBars=180, trendFilterEnabled=false, eligibilityEnabled=false, drawdownRecoveryGateEnabled=false, trailingStopPercent=6.5, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=30, initialStopAtrMultiple=1.5, retentionEnabled=false, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=190, breakoutBufferPercent=0.25, breakoutFormationBars=13
- `cfc0769dac6fa447`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=19.5, recentLowLookbackBars=140, trendFilterEnabled=true, trendMethod=rising_sma, trendSmaSessions=160, trendSmaComparisonSessions=2, eligibilityEnabled=true, eligibilityPolicy=reset_renew, eligibilityMaxAgeSessions=28, eligibilityResetDropPercent=1, eligibilityRenewalReboundPercent=10, drawdownRecoveryGateEnabled=true, dipLookbackSessions=60, dipThresholdPercent=14.5, recoveryRetracementPercent=50, recoveryConfirmationSessions=0, trailingStopPercent=5.5, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=45, initialStopAtrMultiple=4, retentionEnabled=true, retentionSellPercent=90, retentionSmaSessions=30, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=ma_cross, continuationWindowSessions=90, crossSmaBars=130, crossRisingBars=27, crossMinimumSlopePercent=0.7, crossMarginPercent=0.25
- `285d4a0774fd3950`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=8, recentLowLookbackBars=80, trendFilterEnabled=true, trendMethod=price_change, trendChangeLookbackSessions=40, trendChangeMinimumReturnPercent=-1, eligibilityEnabled=true, eligibilityPolicy=reset_renew, eligibilityMaxAgeSessions=8, eligibilityResetDropPercent=7, eligibilityRenewalReboundPercent=3, drawdownRecoveryGateEnabled=false, trailingStopPercent=7.5, maximumHoldEnabled=true, maximumHoldDays=21, intradayLossBufferEnabled=true, intradayLossBufferPercent=4.5, initialStopEnabled=true, initialStopAtrSessions=15, initialStopAtrMultiple=1, retentionEnabled=false, continuationEnabled=false
- `c12fd51f5254a005`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=20, recentLowLookbackBars=130, trendFilterEnabled=true, trendMethod=price_change, trendChangeLookbackSessions=105, trendChangeMinimumReturnPercent=7.5, eligibilityEnabled=true, eligibilityPolicy=time_limited, eligibilityMaxAgeSessions=8, drawdownRecoveryGateEnabled=false, trailingStopPercent=12.5, maximumHoldEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=70, retentionSmaSessions=150, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=shallow_pullback, continuationWindowSessions=190, uptrendSmaBars=130, uptrendSlopeBars=7, uptrendMinimumRisePercent=4.75, pullbackMinimumPercent=1.5, pullbackMaximumPercent=7, recoveryPercent=1.75
- `44bf6d2e1405922c`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=4, recentLowLookbackBars=60, trendFilterEnabled=true, trendMethod=regression_slope, trendSlopeLookbackSessions=100, trendSlopeMinimumPercent=4, eligibilityEnabled=true, eligibilityPolicy=deterioration, eligibilityMaxAgeSessions=14, eligibilityDeteriorationDropPercent=7.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=12, maximumHoldEnabled=true, maximumHoldDays=22, intradayLossBufferEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=30, retentionSmaSessions=110, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=10, breakoutBufferPercent=3, breakoutFormationBars=8
- `55512eb80cc8c007`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=6.5, recentLowLookbackBars=70, trendFilterEnabled=true, trendMethod=regression_slope, trendSlopeLookbackSessions=40, trendSlopeMinimumPercent=-4, eligibilityEnabled=true, eligibilityPolicy=time_limited, eligibilityMaxAgeSessions=21, drawdownRecoveryGateEnabled=false, trailingStopPercent=7.5, maximumHoldEnabled=true, maximumHoldDays=28, intradayLossBufferEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=70, retentionSmaSessions=100, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=shallow_pullback, continuationWindowSessions=60, uptrendSmaBars=140, uptrendSlopeBars=1, uptrendMinimumRisePercent=0.25, pullbackMinimumPercent=2, pullbackMaximumPercent=11, recoveryPercent=2
- `00d6ba5cfa73bb4e`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=13, recentLowLookbackBars=120, trendFilterEnabled=true, trendMethod=regression_slope, trendSlopeLookbackSessions=25, trendSlopeMinimumPercent=-2.5, eligibilityEnabled=true, eligibilityPolicy=minimum_strength, eligibilityMaxAgeSessions=14, eligibilityMinimumAdvancePercent=0.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=11.5, maximumHoldEnabled=true, maximumHoldDays=11, intradayLossBufferEnabled=true, intradayLossBufferPercent=0.5, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=60, retentionSmaSessions=150, retentionClosesBelow=2, continuationEnabled=false
- `c69edd153cc36796`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=9, recentLowLookbackBars=100, trendFilterEnabled=true, trendMethod=regression_slope, trendSlopeLookbackSessions=40, trendSlopeMinimumPercent=-4, eligibilityEnabled=true, eligibilityPolicy=reset_renew, eligibilityMaxAgeSessions=27, eligibilityResetDropPercent=10, eligibilityRenewalReboundPercent=0.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=6.5, maximumHoldEnabled=true, maximumHoldDays=18, intradayLossBufferEnabled=true, intradayLossBufferPercent=3, initialStopEnabled=true, initialStopAtrSessions=50, initialStopAtrMultiple=4, retentionEnabled=true, retentionSellPercent=40, retentionSmaSessions=180, retentionClosesBelow=1, continuationEnabled=true, continuationMethod=ma_cross, continuationWindowSessions=170, crossSmaBars=180, crossRisingBars=12, crossMinimumSlopePercent=0.4, crossMarginPercent=0.75
- `b40ddb2e2e493987`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=10, recentLowLookbackBars=90, trendFilterEnabled=true, trendMethod=regression_slope, trendSlopeLookbackSessions=120, trendSlopeMinimumPercent=-0.5, eligibilityEnabled=true, eligibilityPolicy=deterioration, eligibilityMaxAgeSessions=2, eligibilityDeteriorationDropPercent=4.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=12.5, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=35, initialStopAtrMultiple=2.5, retentionEnabled=false, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=200, breakoutBufferPercent=4.75, breakoutFormationBars=7
- `d47ec489797e754d`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=5, recentLowLookbackBars=10, trendFilterEnabled=true, trendMethod=rising_sma, trendSmaSessions=100, trendSmaComparisonSessions=19, eligibilityEnabled=true, eligibilityPolicy=minimum_strength, eligibilityMaxAgeSessions=14, eligibilityMinimumAdvancePercent=1.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=6.5, maximumHoldEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=90, retentionSmaSessions=100, retentionClosesBelow=3, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=110, breakoutBufferPercent=2.75, breakoutFormationBars=5
- `bd33568bffd6ae8b`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=3, recentLowLookbackBars=40, trendFilterEnabled=true, trendMethod=regression_slope, trendSlopeLookbackSessions=95, trendSlopeMinimumPercent=1.5, eligibilityEnabled=true, eligibilityPolicy=time_limited, eligibilityMaxAgeSessions=16, drawdownRecoveryGateEnabled=false, trailingStopPercent=3.5, maximumHoldEnabled=false, initialStopEnabled=false, retentionEnabled=true, retentionSellPercent=40, retentionSmaSessions=50, retentionClosesBelow=5, continuationEnabled=false
- `63fcfc104b8ce4f4`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=18, recentLowLookbackBars=180, trendFilterEnabled=true, trendMethod=regression_slope, trendSlopeLookbackSessions=15, trendSlopeMinimumPercent=3, eligibilityEnabled=true, eligibilityPolicy=minimum_strength, eligibilityMaxAgeSessions=17, eligibilityMinimumAdvancePercent=4.5, drawdownRecoveryGateEnabled=false, trailingStopPercent=7, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=20, initialStopAtrMultiple=2, retentionEnabled=true, retentionSellPercent=10, retentionSmaSessions=100, retentionClosesBelow=4, continuationEnabled=true, continuationMethod=classic_d1, continuationWindowSessions=50, classicPullbackPercent=12, classicReboundPercent=1.6
- `a741d7902a66b99d`: entryMethod=rise_from_recent_low, advanceFromRecentLowPercent=19, recentLowLookbackBars=180, trendFilterEnabled=true, trendMethod=rising_sma, trendSmaSessions=150, trendSmaComparisonSessions=7, eligibilityEnabled=true, eligibilityPolicy=time_limited, eligibilityMaxAgeSessions=10, drawdownRecoveryGateEnabled=false, trailingStopPercent=6.5, maximumHoldEnabled=false, initialStopEnabled=true, initialStopAtrSessions=30, initialStopAtrMultiple=1.5, retentionEnabled=true, retentionSellPercent=80, retentionSmaSessions=30, retentionClosesBelow=5, continuationEnabled=true, continuationMethod=breakout, continuationWindowSessions=160, breakoutBufferPercent=0.25, breakoutFormationBars=13

