| fold | replicate | new vectors | generations | stop | final hypervolume |
|---|---:|---:|---:|---:|---:|
| main | ga:A:r1 | 2000 | 21 | budget | 3.41e+09 |
| main | ga:A:r2 | 2000 | 21 | budget | 3.41e+09 |
| main | ga:A:r3 | 2000 | 21 | budget | 3.38e+09 |
| wf20 | ga:A:r1 | 2000 | 21 | budget | 1.79e+09 |
| wf20 | ga:A:r2 | 2000 | 21 | budget | 1.77e+09 |
| wf20 | ga:A:r3 | 2000 | 21 | budget | 1.89e+09 |

main: 10097 unique vectors, 6233 feasible; wf20: 10097 unique, 6267 feasible.

Replicate best vectors (main): r1 `d1-f522cf2588` $192,239 DD $17,281; r2 `d1-ac0aaa704c` $192,548 DD $17,281; r3 `d1-2f61b598b5` $190,728 DD $17,281
Path dependence (normalized L∞ between replicate bests, main): r1–r2 0.77, r1–r3 0.93, r2–r3 0.89

Multiple testing (main): 9404 validation-stage runs; shortlist 32; PBO (CSCV over 14 half-years) = 0.4857142857142857; median DEV $/yr of the shortlist $40,925 → median VAL $/yr $3,345; the best DEV vector d1-ac0aaa704c: DEV $42,340/yr → VAL $19,723/yr.
WF20: shortlist 32; PBO = 0.7857142857142857; median WF20-search $/yr $24,639 → median WF20-test $/yr −$2,553; picks [].

Rank correlation (Spearman) of the main shortlist's validation score with its FX net (after the freeze): 0.312 (n = 32).
