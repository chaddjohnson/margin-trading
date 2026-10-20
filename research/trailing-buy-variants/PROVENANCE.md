# Optimization provenance

Engine `src/trailing-buy-variants/engine.ts` (equal to the four-family engine with every mechanism off; parity with the strategy files in `results/parity/`). Search: 4,096 unique scrambled-Sobol lattice points + 3 anchors (base defaults at Y 3% and 4%, Trades2 phenotype), then two NSGA-II runs (population 128, 60 generations × 128 offspring, SBX p 0.9 η 15, polynomial mutation η 20) seeded by `deriveSeed('trailing-buy-variants', 'sobol' | 'nsga', fit, family[, seed])`; 19,459 requested evaluations per stage, duplicates cached. Objectives: maximize training net, minimize training minute drawdown; constraint: at least one entry per training year; selection eligibility: training minute drawdown ≤ $35,000. Selection rule: PROTOCOL.md section 6. Freeze `695568752f248561becd83ebc6c147b96d148991039704353b79b7cde83b41af` at 2026-10-20T11:58:03.767Z.

## Parameter domains

| Parameter | Short | Domain | Step | Points |
| --- | --- | --- | --- | --- |
| `targetPercentChange` | X | 5.0% – 30.0% | 0.1 pt | 251 |
| `trailingBuyPercentage` | Y | 0.1% – 8.0% | 0.1 pt | 80 |
| `trailingStopPercentage` | stop | 3.0% – 15.0% | 0.1 pt | 121 |
| `maximumHoldDays` | hold | 3 – 40 | 1 days | 38 |
| `tickWindowSize` | L | 45 – 180 | 1 sessions | 136 |
| `materialLossThreshold` | mat | 0.5% – 3.0% | 0.1 pt | 26 |
| `lowerPriceReentry` | lower | 0.0% – 6.0% | 0.1 pt | 61 |
| `retraceFraction` | reset | 20.0% – 70.0% | 0.1 pt | 501 |
| `intradayLossBuffer` | buffer | 0.0% – 3.0% | 0.1 pt | 31 |
| `invalidationBuffer` | inv | 0.0% – 6.0% | 0.1 pt | 61 |
| `episodeLossBudget` | budget | 1.0% – 20.0% | 0.1 pt | 191 |
| `episodeResetRetrace` | epReset | 20.0% – 80.0% | 0.1 pt | 601 |
| `reboundDepthSlope` | slope | 0.0% – 50.0% | 0.1 pt | 501 |
| `initialFraction` | first | 10% – 90% | 5 pt | 17 |
| `addTrigger` | add | 0.5% – 10.0% | 0.1 pt | 96 |
| `progressThreshold` | progress | 0.5% – 10.0% | 0.1 pt | 96 |
| `holdExtensionDays` | extend | 1 – 45 | 1 days | 45 |
| `confirmMinutes` | confirm | 2 – 30 | 1 minutes | 29 |


## Budget actually run

| Fit | Family | Dims | Min entries | Attempted | Unique simulated | Feasible | Phenotypes | Above ceiling (best net) | Pool | Probe evaluations | Picks | Search s | Workers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fold1 | `trailingBuy` | 8 | 4 | 19,459 | 18,510 | 15,341 | 6,731 | 78 ($40,777) | 100 | 4273 | 10 | 8.9 | 8 |
| fold1 | `bufferedLoss` | 9 | 4 | 19,459 | 18,605 | 15,479 | 7,171 | 34 ($39,414) | 100 | 4784 | 10 | 7.2 | 8 |
| fold1 | `noReentry` | 5 | 4 | 19,459 | 17,489 | 14,209 | 7,871 | 162 ($42,389) | 100 | 2645 | 10 | 8.2 | 8 |
| fold1 | `bufferedLossNoReentry` | 6 | 4 | 19,459 | 17,907 | 14,735 | 8,553 | 133 ($39,995) | 100 | 3182 | 10 | 9.3 | 8 |
| fold1 | `invalidation` | 7 | 4 | 19,459 | 18,247 | 14,359 | 8,396 | 200 ($43,147) | 100 | 3749 | 10 | 9.4 | 8 |
| fold1 | `invalidationUnbuffered` | 6 | 4 | 19,459 | 17,909 | 14,808 | 6,897 | 198 ($42,655) | 100 | 3199 | 10 | 10.6 | 8 |
| fold1 | `episodeBudget` | 8 | 4 | 19,459 | 18,591 | 15,156 | 7,569 | 69 ($39,410) | 100 | 4351 | 10 | 7.9 | 8 |
| fold1 | `episodeBudgetUnbuffered` | 7 | 4 | 19,459 | 18,446 | 15,136 | 7,313 | 89 ($39,588) | 100 | 3942 | 10 | 8.7 | 8 |
| fold1 | `depthRebound` | 7 | 4 | 19,459 | 18,254 | 14,933 | 12,980 | 137 ($40,440) | 100 | 3676 | 10 | 9.7 | 8 |
| fold1 | `depthReboundUnbuffered` | 6 | 4 | 19,459 | 18,152 | 14,963 | 12,429 | 139 ($38,241) | 100 | 3277 | 10 | 9.2 | 8 |
| fold1 | `staged` | 8 | 4 | 19,459 | 18,428 | 15,202 | 10,837 | 26 ($37,796) | 100 | 3928 | 10 | 10.7 | 8 |
| fold1 | `stagedUnbuffered` | 7 | 4 | 19,459 | 18,136 | 15,092 | 9,032 | 33 ($40,880) | 100 | 3431 | 10 | 9.2 | 8 |
| fold1 | `progressHold` | 8 | 4 | 19,459 | 18,360 | 15,079 | 7,882 | 131 ($41,382) | 100 | 4306 | 10 | 8.5 | 8 |
| fold1 | `progressHoldUnbuffered` | 7 | 4 | 19,459 | 18,241 | 14,701 | 6,835 | 131 ($40,454) | 100 | 3814 | 10 | 7.7 | 8 |
| fold1 | `persistence` | 7 | 4 | 19,459 | 18,106 | 14,891 | 11,086 | 104 ($41,122) | 84 | 3208 | 10 | 13.9 | 8 |
| fold1 | `persistenceUnbuffered` | 6 | 4 | 19,459 | 17,814 | 14,573 | 10,031 | 134 ($42,677) | 98 | 3188 | 10 | 8.4 | 8 |
| fold1 | `invalidationDepth` | 8 | 4 | 19,459 | 18,372 | 14,625 | 11,122 | 209 ($43,443) | 81 | 3359 | 10 | 11.0 | 8 |
| fold1 | `invalidationStaged` | 9 | 4 | 19,459 | 18,541 | 14,128 | 10,919 | 59 ($40,845) | 100 | 4415 | 10 | 14.5 | 8 |
| fold2 | `trailingBuy` | 8 | 6 | 19,459 | 18,395 | 14,499 | 10,009 | 4304 ($153,061) | 100 | 4335 | 10 | 26.7 | 8 |
| fold2 | `bufferedLoss` | 9 | 6 | 19,459 | 18,560 | 14,130 | 10,107 | 3872 ($159,963) | 100 | 4884 | 10 | 21.9 | 8 |
| fold2 | `noReentry` | 5 | 6 | 19,459 | 17,541 | 14,265 | 9,112 | 4093 ($133,513) | 100 | 2744 | 10 | 22.1 | 8 |
| fold2 | `bufferedLossNoReentry` | 6 | 6 | 19,459 | 17,926 | 14,845 | 10,398 | 3686 ($152,061) | 100 | 3243 | 10 | 23.1 | 8 |
| fold2 | `invalidation` | 7 | 6 | 19,459 | 18,218 | 16,104 | 11,733 | 4613 ($151,294) | 100 | 3858 | 10 | 27.0 | 8 |
| fold2 | `invalidationUnbuffered` | 6 | 6 | 19,459 | 17,766 | 15,560 | 9,916 | 3701 ($151,294) | 100 | 3319 | 10 | 28.1 | 8 |
| fold2 | `episodeBudget` | 8 | 6 | 19,459 | 18,574 | 14,861 | 10,287 | 3080 ($155,813) | 100 | 4381 | 10 | 22.0 | 8 |
| fold2 | `episodeBudgetUnbuffered` | 7 | 6 | 19,459 | 18,348 | 14,413 | 8,923 | 2547 ($139,091) | 100 | 3883 | 10 | 19.1 | 8 |
| fold2 | `depthRebound` | 7 | 6 | 19,459 | 18,497 | 14,477 | 13,085 | 5818 ($154,136) | 100 | 3803 | 10 | 27.6 | 8 |
| fold2 | `depthReboundUnbuffered` | 6 | 6 | 19,459 | 18,457 | 14,540 | 13,173 | 4294 ($134,371) | 100 | 3387 | 10 | 23.6 | 8 |
| fold2 | `staged` | 8 | 6 | 19,459 | 18,543 | 14,491 | 11,925 | 3165 ($149,644) | 100 | 4081 | 10 | 30.6 | 8 |
| fold2 | `stagedUnbuffered` | 7 | 6 | 19,459 | 18,375 | 13,850 | 10,880 | 2489 ($136,956) | 100 | 3601 | 10 | 23.9 | 8 |
| fold2 | `progressHold` | 8 | 6 | 19,459 | 18,375 | 14,383 | 9,049 | 3504 ($152,782) | 100 | 4341 | 10 | 18.8 | 8 |
| fold2 | `progressHoldUnbuffered` | 7 | 6 | 19,459 | 18,052 | 14,858 | 8,122 | 3654 ($142,683) | 100 | 3941 | 10 | 22.2 | 8 |
| fold2 | `persistence` | 7 | 6 | 19,459 | 18,232 | 13,913 | 10,915 | 4868 ($155,021) | 100 | 3773 | 10 | 24.3 | 8 |
| fold2 | `persistenceUnbuffered` | 6 | 6 | 19,459 | 17,985 | 14,001 | 10,345 | 4534 ($137,389) | 100 | 3267 | 10 | 25.3 | 8 |
| fold2 | `invalidationDepth` | 8 | 6 | 19,459 | 18,581 | 15,486 | 13,607 | 4625 ($151,294) | 100 | 4403 | 10 | 21.7 | 8 |
| fold2 | `invalidationStaged` | 9 | 6 | 19,459 | 18,661 | 15,493 | 10,262 | 2637 ($148,205) | 100 | 4659 | 10 | 19.5 | 8 |
| fold3 | `trailingBuy` | 8 | 7 | 19,459 | 18,405 | 15,482 | 10,889 | 2543 ($131,269) | 100 | 4506 | 10 | 14.4 | 8 |
| fold3 | `bufferedLoss` | 9 | 7 | 19,459 | 18,427 | 16,005 | 10,566 | 2423 ($131,269) | 100 | 4982 | 10 | 15.4 | 8 |
| fold3 | `noReentry` | 5 | 7 | 19,459 | 17,244 | 14,938 | 11,976 | 3117 ($128,511) | 100 | 2741 | 10 | 17.3 | 8 |
| fold3 | `bufferedLossNoReentry` | 6 | 7 | 19,459 | 17,725 | 15,093 | 11,924 | 3207 ($128,244) | 100 | 3210 | 10 | 15.9 | 8 |
| fold3 | `invalidation` | 7 | 7 | 19,459 | 17,975 | 16,127 | 12,170 | 2818 ($124,723) | 100 | 3727 | 10 | 15.0 | 8 |
| fold3 | `invalidationUnbuffered` | 6 | 7 | 19,459 | 17,671 | 15,764 | 11,833 | 2682 ($124,723) | 100 | 3268 | 10 | 13.4 | 8 |
| fold3 | `episodeBudget` | 8 | 7 | 19,459 | 18,480 | 15,739 | 10,591 | 2840 ($128,511) | 100 | 4444 | 10 | 19.6 | 8 |
| fold3 | `episodeBudgetUnbuffered` | 7 | 7 | 19,459 | 18,378 | 15,324 | 9,685 | 1940 ($128,511) | 100 | 3931 | 10 | 13.5 | 8 |
| fold3 | `depthRebound` | 7 | 7 | 19,459 | 18,407 | 15,865 | 14,153 | 3308 ($128,244) | 100 | 3799 | 10 | 16.5 | 8 |
| fold3 | `depthReboundUnbuffered` | 6 | 7 | 19,459 | 18,183 | 14,521 | 12,630 | 2811 ($128,060) | 100 | 3281 | 10 | 15.4 | 8 |
| fold3 | `staged` | 8 | 7 | 19,459 | 18,400 | 16,106 | 13,375 | 2884 ($126,971) | 100 | 4118 | 10 | 21.3 | 8 |
| fold3 | `stagedUnbuffered` | 7 | 7 | 19,459 | 18,260 | 15,746 | 12,116 | 2771 ($127,448) | 100 | 3596 | 10 | 18.6 | 8 |
| fold3 | `progressHold` | 8 | 7 | 19,459 | 18,371 | 15,589 | 10,783 | 2709 ($128,244) | 100 | 4450 | 10 | 18.4 | 8 |
| fold3 | `progressHoldUnbuffered` | 7 | 7 | 19,459 | 18,144 | 15,048 | 10,702 | 2567 ($128,244) | 100 | 3859 | 10 | 18.5 | 8 |
| fold3 | `persistence` | 7 | 7 | 19,459 | 17,891 | 15,478 | 12,150 | 4619 ($132,252) | 100 | 3786 | 10 | 24.4 | 8 |
| fold3 | `persistenceUnbuffered` | 6 | 7 | 19,459 | 17,981 | 14,856 | 12,738 | 3704 ($132,252) | 100 | 3257 | 10 | 17.0 | 8 |
| fold3 | `invalidationDepth` | 8 | 7 | 19,459 | 18,491 | 17,243 | 15,712 | 4107 ($124,723) | 100 | 4325 | 10 | 18.0 | 8 |
| fold3 | `invalidationStaged` | 9 | 7 | 19,459 | 18,550 | 17,324 | 14,185 | 3015 ($123,494) | 100 | 4804 | 10 | 19.0 | 8 |
| final | `trailingBuy` | 8 | 8 | 19,459 | 18,611 | 14,920 | 11,662 | 3094 ($172,728) | 100 | 4433 | 10 | 20.8 | 8 |
| final | `bufferedLoss` | 9 | 8 | 19,459 | 18,606 | 14,610 | 11,231 | 3417 ($176,525) | 100 | 4854 | 10 | 21.1 | 8 |
| final | `noReentry` | 5 | 8 | 19,459 | 17,774 | 14,160 | 12,513 | 4232 ($173,657) | 100 | 2769 | 10 | 20.4 | 8 |
| final | `bufferedLossNoReentry` | 6 | 8 | 19,459 | 17,925 | 13,958 | 11,028 | 4109 ($172,640) | 100 | 3324 | 10 | 24.1 | 8 |
| final | `invalidation` | 7 | 8 | 19,459 | 18,164 | 16,294 | 12,052 | 4637 ($169,979) | 100 | 3832 | 10 | 25.3 | 8 |
| final | `invalidationUnbuffered` | 6 | 8 | 19,459 | 17,826 | 15,624 | 12,494 | 4542 ($169,979) | 100 | 3196 | 10 | 20.4 | 8 |
| final | `episodeBudget` | 8 | 8 | 19,459 | 18,452 | 14,981 | 11,162 | 3314 ($172,640) | 100 | 4441 | 10 | 21.3 | 8 |
| final | `episodeBudgetUnbuffered` | 7 | 8 | 19,459 | 18,334 | 14,684 | 9,555 | 2979 ($172,640) | 100 | 4074 | 10 | 27.6 | 8 |
| final | `depthRebound` | 7 | 8 | 19,459 | 18,438 | 15,349 | 14,130 | 4612 ($172,291) | 100 | 3814 | 10 | 21.5 | 8 |
| final | `depthReboundUnbuffered` | 6 | 8 | 19,459 | 18,217 | 15,131 | 14,076 | 4142 ($173,767) | 100 | 3347 | 10 | 20.2 | 8 |
| final | `staged` | 8 | 8 | 19,459 | 18,426 | 15,792 | 13,033 | 3056 ($168,934) | 100 | 4239 | 10 | 19.8 | 8 |
| final | `stagedUnbuffered` | 7 | 8 | 19,459 | 18,381 | 15,625 | 13,399 | 3077 ($171,859) | 100 | 3524 | 10 | 18.4 | 8 |
| final | `progressHold` | 8 | 8 | 19,459 | 18,494 | 14,426 | 11,341 | 4118 ($173,076) | 100 | 4499 | 10 | 21.1 | 8 |
| final | `progressHoldUnbuffered` | 7 | 8 | 19,459 | 18,300 | 14,395 | 11,282 | 3892 ($173,767) | 100 | 3935 | 10 | 18.4 | 8 |
| final | `persistence` | 7 | 8 | 19,459 | 17,964 | 15,107 | 13,378 | 4763 ($176,412) | 100 | 3743 | 10 | 22.4 | 8 |
| final | `persistenceUnbuffered` | 6 | 8 | 19,459 | 17,819 | 14,617 | 13,461 | 4466 ($177,623) | 100 | 3184 | 10 | 20.2 | 8 |
| final | `invalidationDepth` | 8 | 8 | 19,459 | 18,522 | 16,441 | 14,630 | 4695 ($169,979) | 100 | 4410 | 10 | 21.0 | 8 |
| final | `invalidationStaged` | 9 | 8 | 19,459 | 18,575 | 16,801 | 13,219 | 3717 ($168,392) | 100 | 4733 | 10 | 23.2 | 8 |


Totals: 1,401,048 requested, 1,313,005 unique simulations, 277,065 neighbourhood probes, over 72 stages.


## Multiple testing

18 families × 4 fits were searched, 180 final phenotypes were frozen, and the sweeps added 10,968 grid evaluations. Every walk-forward figure is one of several hundred thousand configurations' descendants, and the reused window was inspected by the previous program; nothing here restores its independence. Small trade counts (2–11 entries per window) make single trades decisive.
