# Verdict (frozen rubric, `results/records/analysis.json`)

**Label: no demonstrated edge**; nomination: none; configurations evaluated: 5,114,598.

Failed items: ['g', 'f', 'e2']; Π-NET label: risk-incompatible; validity (a): True.

Selection null: Π1 Σ W +$51,669 vs deep-null median +$19,286 (percentile 90%); selection-indistinguishable: False.

Protection (primary, Π1 vs Π1-off): ΔΣ W +$26,216, ΔDD −$31,870, paired perturbed share 34% → holds: False.

Procedure (Π1 vs Π-000): ΔΣ W +$68,104, ΔDD −$21,824 → holds: True. Fixed parent (gated): 0 of 7 masks. 2022 with trend retention: True.

## Π1 items

| Item | Pass | Values |
|---|---|---|
| (e) evidence | True | {"ownRuleExits": 10, "firstEntries": 10, "firstEntryWindows": 4, "positionWindows": 4, "longShare": 0.7246520874751491, "undefinedPicks": 0} |
| (c) risk | True | window DD ['$23,198', '$11,086', '$22,004', '$14,170']; chained $24,193 |
| (b) profit | True | W ['+$23,749', '+$18,148', '−$6,415', '+$16,186']; Σ +$51,669; positive 3; min −$6,415 |
| (d) protection vs Π1-off | True | {"cActive": true, "W2022": -6414.964653079071, "off2022": -46766.1935880413, "d1": true, "trendWindows": [0, 1, 3], "trendSum": 58083.746257080464, "trendOff": 72218.56168617308, "d2": true} |
| (g) exposure-matched, controls | False | Σ excess +$10,783; excess windows 1; margins C-SMA +$2,673, C-DON +$18,809, C-TSM +$8,092, C-STOP +$11,453 |
| (f) perturbed paths | False | {"shareOk": 0.5859375, "median": 21845.394556900865, "p10": -4981.31872273729} |
| (h) stresses | True | {"cost10": {"end": 49959.77343831147, "chainDd": 24516.233266638046, "windowDd": 23282.378894345442}, "rate14": {"end": 45854.899058914794, "chainDd": 24736.88565769681, "windowDd": 23457.48334213746}, "stop25": {"end": 48960.35035690009, "chainDd": 24715.795441109447, "windowDd": 23198.049784151393}, "open50": {"end": 50253.37027307755, "chainDd": 24882.159786420358, "windowDd": 23645.671785669725}, "delay1": {"end": 62274.397389830316, "chainDd": 23546.48500035622, "windowDd": 23196.739461150893}} |
| (e2) winner / giveback | False | {"largestCampaign": 37356.96470657907, "sumMinusCampaign": 14311.816897422323, "largestLeg": 30294.486926689373, "sumMinusLeg": 21374.29467731202, "givebackShare": 0.6059116863343951} |

Near misses (within 10%): none

Pi1-S2: b False, c False, g False, e True, e2 False, f None, h None; Σ +$16,664; chained DD $41,287

Pi1-reset: b True, c True, g False, e True, e2 False, f None, h None; Σ +$51,669; chained DD $24,193

Pi-NET: b False, c False, g False, e True, e2 False, f False, h False; Σ +$29,983; chained DD $66,551

## Descriptive labels of the other paths (items computable without perturbed paths and stresses)

| Path | Label | Failed | Σ W | Chained DD | Near misses |
|---|---|---|---|---|---|
| Pi1 | no demonstrated edge | g, e2 | +$51,669 | $24,193 | — |
| Pi1-sub-000 | risk-incompatible | c | +$25,452 | $56,063 | — |
| Pi1-sub-100 | risk-incompatible | c | +$18,562 | $56,786 | (b) Σ W: 18561.93 vs 20000 |
| Pi1-sub-010 | risk-incompatible | c | −$4,235 | $71,192 | — |
| Pi1-sub-001 | risk-incompatible | c | +$25,452 | $56,063 | — |
| Pi1-sub-110 | no demonstrated edge | g, e2 | +$51,669 | $24,193 | — |
| Pi1-sub-101 | risk-incompatible | c | +$18,562 | $56,786 | (b) Σ W: 18561.93 vs 20000 |
| Pi1-sub-011 | risk-incompatible | c | −$4,235 | $71,192 | — |
| Pi1-sub-111 | no demonstrated edge | g, e2 | +$51,669 | $24,193 | — |
| Pi1-S2 | risk-incompatible | c | +$16,664 | $41,287 | — |
| Pi1-S3 | no demonstrated edge | g, e2 | +$51,195 | $24,241 | — |
| Pi1-reset | no demonstrated edge | g, e2 | +$51,669 | $24,193 | — |
| Pi1-open | no demonstrated edge | g, e2 | +$51,907 | $24,139 | — |
| Pi1-Z1 | no demonstrated edge | g, e2 | +$49,547 | $23,814 | — |
| Pi1-cross | no demonstrated edge | g, e2 | +$51,669 | $24,193 | — |
| Pi-NET | risk-incompatible | c | +$29,983 | $66,551 | — |
| Pi-NET-off | insufficient evidence | e | +$50,724 | $65,343 | (c) window 0 DD: 38070.85 vs 35000 |
| Pi-000 | risk-incompatible | c | −$16,435 | $46,017 | — |
| Pi-100 | risk-incompatible | c | +$25,241 | $38,691 | — |
| Pi-100-open | risk-incompatible | c | +$24,524 | $39,222 | — |
| Pi-010 | risk-incompatible | c | +$13,458 | $39,596 | — |
| Pi-001 | risk-incompatible | c | −$7,299 | $35,435 | (c) chained DD: 35435.03 vs 35000 |
| Pi-001-cross | insufficient evidence | e | −$33,080 | $39,206 | — |
| Pi-110 | risk-incompatible | c | +$42,013 | $43,292 | — |
| Pi-110-open | risk-incompatible | c | +$40,512 | $43,584 | — |
| Pi-101 | no demonstrated edge | g, e2 | +$27,511 | $29,002 | — |
| Pi-101-cross | no demonstrated edge | g, e2 | +$27,511 | $29,002 | — |
| Pi-101-open | no demonstrated edge | g, e2 | +$26,932 | $29,538 | — |
| Pi-011 | no demonstrated edge | b, g, e2 | +$11,645 | $28,969 | — |
| Pi-011-cross | no demonstrated edge | b, g, e2 | +$11,146 | $28,751 | — |
| Pi-111 | risk-incompatible | c | −$9,016 | $35,680 | (c) chained DD: 35680.44 vs 35000 |
| Pi-111-cross | risk-incompatible | c | −$9,016 | $35,680 | (c) chained DD: 35680.44 vs 35000 |
| Pi-111-open | risk-incompatible | c | −$8,252 | $35,986 | (c) chained DD: 35986.38 vs 35000 |
| Pi-FP-gated-100 | risk-incompatible | c | −$28,034 | $49,563 | — |
| Pi-FP-forced-100 | risk-incompatible | c | −$20,566 | $43,045 | (c) window 2 DD: 37468.76 vs 35000 |
| Pi-FP-gated-010 | risk-incompatible | c | −$19,854 | $46,214 | — |
| Pi-FP-forced-010 | risk-incompatible | c | −$19,853 | $46,212 | — |
| Pi-FP-gated-001 | risk-incompatible | c | −$16,435 | $46,017 | — |
| Pi-FP-forced-001 | risk-incompatible | c | −$16,435 | $46,017 | — |
| Pi-FP-gated-110 | risk-incompatible | c | −$20,714 | $46,328 | — |
| Pi-FP-forced-110 | risk-incompatible | c | −$18,981 | $39,972 | (c) window 2 DD: 37275.95 vs 35000 |
| Pi-FP-gated-101 | risk-incompatible | c | −$28,034 | $49,563 | — |
| Pi-FP-forced-101 | risk-incompatible | c | −$20,566 | $43,045 | (c) window 2 DD: 37468.76 vs 35000 |
| Pi-FP-gated-011 | risk-incompatible | c | −$19,854 | $46,214 | — |
| Pi-FP-forced-011 | risk-incompatible | c | −$19,853 | $46,212 | — |
| Pi-FP-gated-111 | risk-incompatible | c | −$20,714 | $46,328 | — |
| Pi-FP-forced-111 | risk-incompatible | c | −$18,981 | $39,972 | (c) window 2 DD: 37275.95 vs 35000 |
| static-A | no demonstrated edge | b, g, e2 | +$36,094 | $27,283 | — |
| Stage1-S1 | risk-incompatible | c | +$37,834 | $36,672 | (c) chained DD: 36672.44 vs 35000; (g) margin over C-DON: 4974.12 vs 5000 |
