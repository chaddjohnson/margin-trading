**Label: risk-incompatible** (primary {'label': 'risk-incompatible', 'failed': ['c']}; Π-NET {'label': 'no demonstrated edge', 'failed': ['e']}); nomination: none

| Path | Label | Failed |
|---|---|---|
| Pi1-S2 | risk-incompatible | c |
| Pi1-S3 | risk-incompatible | c |
| Pi-NET | no demonstrated edge | e |
| Pi-P0 | risk-incompatible | c |
| Pi-noE06 | risk-incompatible | c |
| static-A | no demonstrated edge | b, e |

### Pi1-S1

- (b) FAIL: W [14432, 18059, -30966, 11049], Σ +$12,573, positive 3, min −$30,966
- (c) FAIL: window minute DD [13094, 8509, 33488, 13350], chained $42,882
- (d) pass: {"ownRuleExits": 17, "firstEntries": 14, "firstEntryWindows": 4, "positionWindows": 4, "undefinedPicks": 0}
- (e) FAIL: f_MV [0.55, 0.74, 0.37, 0.74], B_F [17033, 14392, -14739, 26363], excess [-2602, 3666, -16227, -15315] (Σ −$30,477, windows ≥ $2k 1); control margins {C-SMA: −$33,156, C-DON: −$21,142, C-TSM: −$22,172}
- (f) FAIL: perturbed share 34%, median +$20,969; stresses {costBps=10: +$10,187/$43,718, rate=0.14: +$7,066/$43,937, stopSlippageBps=25: +$9,163/$43,484, delayMinutes=1: +$12,929/$41,768}
- (g) FAIL: largest campaign +$12,091 (Σ − it +$483), largest up-leg +$18,349 (Σ − it −$5,775), giveback share 61%

### Pi1-S2

- (b) FAIL: W [14432, 9885, -38716, 28016], Σ +$13,617, positive 3, min −$38,716
- (c) FAIL: window minute DD [13094, 13775, 42161, 14983], chained $44,342
- (d) pass: {"ownRuleExits": 15, "firstEntries": 9, "firstEntryWindows": 3, "positionWindows": 4, "undefinedPicks": 0}
- (e) FAIL: f_MV [0.55, 0.77, 0.39, 0.92], B_F [17033, 14375, -16102, 32847], excess [-2602, -4490, -22613, -4831] (Σ −$34,536, windows ≥ $2k 0); control margins {C-SMA: −$32,112, C-DON: −$20,099, C-TSM: −$21,129}
- (f) not computed (descriptive path)
- (g) FAIL: largest campaign +$20,268 (Σ − it −$6,651), largest up-leg +$35,164 (Σ − it −$21,547), giveback share 68%

### Pi-NET

- (b) pass: W [29899, 17551, -8073, 11157], Σ +$50,533, positive 3, min −$8,073
- (c) pass: window minute DD [12647, 13902, 8180, 18015], chained $18,015
- (d) pass: {"ownRuleExits": 11, "firstEntries": 9, "firstEntryWindows": 3, "positionWindows": 4, "undefinedPicks": 0}
- (e) FAIL: f_MV [0.7, 1.07, 0.02, 0.87], B_F [21965, 22213, -912, 34144], excess [7934, -4662, -7161, -22987] (Σ −$26,876, windows ≥ $2k 1); control margins {C-SMA: +$4,804, C-DON: +$16,905, C-TSM: +$14,810}
- (f) pass: perturbed share 98%, median +$48,152; stresses {costBps=10: +$48,889/$18,155, rate=0.14: +$45,861/$18,445, stopSlippageBps=25: +$49,360/$18,048, delayMinutes=1: +$50,470/$17,603}
- (g) pass: largest campaign +$19,155 (Σ − it +$31,378), largest up-leg +$25,191 (Σ − it +$25,342), giveback share 50%

### Pi1-S3

- (b) FAIL: W [14432, 15583, -31063, 10865], Σ +$9,817, positive 3, min −$31,063
- (c) FAIL: window minute DD [13094, 8372, 33581, 13398], chained $43,010
- (d) pass: {"ownRuleExits": 17, "firstEntries": 14, "firstEntryWindows": 4, "positionWindows": 4, "undefinedPicks": 0}
- (e) FAIL: f_MV [0.55, 0.74, 0.37, 0.74], B_F [17033, 14225, -14836, 26179], excess [-2602, 1358, -16227, -15315] (Σ −$32,786, windows ≥ $2k 0); control margins {C-SMA: −$35,912, C-DON: −$23,899, C-TSM: −$24,929}
- (f) not computed (descriptive path)
- (g) FAIL: largest campaign +$12,091 (Σ − it −$2,274), largest up-leg +$0 (Σ − it +$9,817), giveback share 63%

### Pi-P0

- (b) FAIL: W [35827, 8705, -34382, 14142], Σ +$24,293, positive 3, min −$34,382
- (c) FAIL: window minute DD [45204, 18896, 35936, 16242], chained $45,204
- (d) pass: {"ownRuleExits": 12, "firstEntries": 11, "firstEntryWindows": 3, "positionWindows": 4, "undefinedPicks": 0}
- (e) FAIL: f_MV [1.15, 0.86, 0.18, 0.85], B_F [35770, 18347, -6629, 31233], excess [58, -9642, -27753, -17091] (Σ −$54,428, windows ≥ $2k 0); control margins {C-SMA: −$21,436, C-DON: −$9,423, C-TSM: −$10,453}
- (f) not computed (descriptive path)
- (g) FAIL: largest campaign +$53,149 (Σ − it −$28,856), largest up-leg +$0 (Σ − it +$24,293), giveback share 54%

### Pi-noE06

- (b) FAIL: W [35029, 19798, -30020, 12383], Σ +$37,190, positive 3, min −$30,020
- (c) FAIL: window minute DD [16394, 8461, 32576, 15433], chained $35,032
- (d) pass: {"ownRuleExits": 11, "firstEntries": 11, "firstEntryWindows": 4, "positionWindows": 4, "undefinedPicks": 0}
- (e) FAIL: f_MV [0.85, 0.74, 0.37, 0.47], B_F [27072, 16123, -13793, 18017], excess [7957, 3675, -16227, -5634] (Σ −$10,230, windows ≥ $2k 2); control margins {C-SMA: −$8,540, C-DON: +$3,474, C-TSM: +$2,444}
- (f) not computed (descriptive path)
- (g) FAIL: largest campaign +$14,848 (Σ − it +$22,342), largest up-leg +$0 (Σ − it +$37,190), giveback share 63%

### static-A

- (b) FAIL: W [14432, -3846, -6303, 25357], Σ +$29,640, positive 2, min −$6,303
- (c) pass: window minute DD [13094, 17333, 14630, 17067], chained $24,616
- (d) pass: {"ownRuleExits": 16, "firstEntries": 15, "firstEntryWindows": 4, "positionWindows": 4, "undefinedPicks": 0}
- (e) FAIL: f_MV [0.55, 0.77, 0.18, 0.75], B_F [17033, 14075, -7359, 27433], excess [-2602, -17921, 1056, -2076] (Σ −$21,542, windows ≥ $2k 0); control margins {C-SMA: −$16,089, C-DON: −$4,076, C-TSM: −$5,106}
- (f) not computed (descriptive path)
- (g) pass: largest campaign +$14,224 (Σ − it +$15,416), largest up-leg +$0 (Σ − it +$29,640), giveback share 45%

## Stage 1 picks as executable paths: Stage 1's own T and E items

| Path | V | Σ | Chained DD | T items | T | Σ excess (E) | E |
|---|---|---|---|---|---|---|---|
| slot|S1 | [18973, 18280, -31730, 25437] | +$30,959 | $37,667 | {"i": true, "ii": true, "iii": true, "iv": false, "v": false} | False | −$24,031 | False |
| slot|S2 | [18973, 28244, -53319, 39860] | +$33,759 | $59,805 | {"i": true, "ii": true, "iii": false, "iv": false, "v": false} | False | −$21,474 | False |
| slot|S3 | [18973, 15980, -31703, 25437] | +$28,687 | $37,639 | {"i": true, "ii": true, "iii": false, "iv": false, "v": false} | False | −$26,240 | False |
| net|S1 | [18450, 21309, -30572, 28647] | +$37,834 | $36,672 | {"i": true, "ii": true, "iii": true, "iv": false, "v": false} | False | −$17,156 | False |
| net|S2 | [18450, 27608, -52685, 41919] | +$35,291 | $59,556 | {"i": true, "ii": true, "iii": false, "iv": false, "v": false} | False | −$19,942 | False |
| net|S3 | [18450, 18817, -30599, 28436] | +$35,104 | $36,689 | {"i": true, "ii": true, "iii": false, "iv": false, "v": false} | False | −$19,823 | False |
