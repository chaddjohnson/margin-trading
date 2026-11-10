# Search coverage, effort and stopping

## C19 (door D19; 16.58 min; 334,454 fresh evaluations, 1,632 archive hits; peak cgroup 7.3 GiB)

| Lane | Seeds / designs | Screened | Island proposals | Islands (stop) | Refine moves | Rung-1 centres | Plausible→measured | Feasible | Baseline-equivalent | Distinct ledgers (feasible) | Shortlist | Requested evaluations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| R/seeded | 44 / 396 | 0 | 3,072 | 3 (triggers not met) | 182 | 3,468 | 2,222 | 2,117 | 1,185 | 1,295 (1,148) | 4 | 44,982 |
| R/broad-rise | 0 / 0 | 2,874 | 4,096 | 4 (triggers not met) | 146 | 4,352 | 2,752 | 2,640 | 1,565 | 1,736 (1,597) | 4 | 56,479 |
| R/broad-breakout | 0 / 0 | 2,874 | 5,120 | 5 (triggers not met) | 136 | 5,408 | 4,346 | 4,280 | 1,040 | 1,528 (1,468) | 4 | 82,740 |
| O/seeded | 44 / 132 | 0 | 1,536 | 3 (triggers not met) | 136 | 1,668 | 1,413 | 1,311 | 221 | 1,022 (901) | 3 | 28,418 |
| O/broad-rise | 0 / 0 | 702 | 1,024 | 2 (triggers not met) | 110 | 1,088 | 844 | 770 | 236 | 641 (565) | 3 | 18,736 |
| O/broad-breakout | 0 / 0 | 702 | 1,536 | 3 (triggers not met) | 109 | 1,600 | 1,453 | 1,433 | 143 | 689 (671) | 3 | 28,991 |
| G/seeded | 44 / 132 | 0 | 1,536 | 3 (extension cap reached) | 130 | 1,668 | 1,412 | 1,308 | 206 | 1,027 (882) | 3 | 28,316 |
| G/broad-rise | 0 / 0 | 702 | 1,536 | 3 (triggers not met) | 147 | 1,600 | 1,243 | 1,114 | 349 | 928 (808) | 3 | 26,326 |
| G/broad-breakout | 0 / 0 | 702 | 1,024 | 2 (triggers not met) | 113 | 1,088 | 993 | 959 | 91 | 621 (590) | 3 | 21,187 |

Per arm (new GDX centre proposals = seeded designs + screened + island proposals; refinement moves apart):

| Arm | Planned base / cap | Seeded designs | Screened | Island proposals | Total new proposals | Refinement moves | Requested evaluations |
|---|---:|---:|---:|---:|---:|---:|---:|
| R | 16,384 / 32,768 | 396 | 5,748 | 12,288 | 18,432 | 464 | 184,201 |
| O | 4,096 / 8,192 | 132 | 1,404 | 4,096 | 5,632 | 355 | 76,145 |
| G | 4,096 / 8,192 | 132 | 1,404 | 4,096 | 5,632 | 390 | 75,829 |

Evaluations by kind (fresh / archive hits): baseline 3 / 6; screen 8,556 / 0; r1:centre 21,428 / 512; r1:neighbours 266,622 / 226; r2:centre 0 / 144; r2:neighbours 9,216 / 0; r3:centre 0 / 68; r3:neighbours 8,676 / 28; refine:centre 1,198 / 29; refine:neighbours 18,755 / 619.

Origins (rung-1 centres / feasible): R/seeded: seed 44/20, design 352/145, island 3072/1952; R/broad-rise: screen 128/58, filler 128/40, island 4096/2542; R/broad-breakout: screen 128/101, filler 160/79, island 5120/4100; O/seeded: seed 44/32, design 88/60, island 1536/1219; O/broad-rise: screen 64/35, island 1024/735; O/broad-breakout: screen 64/55, island 1536/1378; G/seeded: seed 44/32, design 88/57, island 1536/1219; G/broad-rise: screen 64/31, island 1536/1083; G/broad-breakout: screen 64/48, island 1024/911.

## C21 (door D21; 19.88 min; 267,991 fresh evaluations, 1,420 archive hits; peak cgroup 8.2 GiB)

| Lane | Seeds / designs | Screened | Island proposals | Islands (stop) | Refine moves | Rung-1 centres | Plausible→measured | Feasible | Baseline-equivalent | Distinct ledgers (feasible) | Shortlist | Requested evaluations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| R/seeded | 45 / 405 | 0 | 2,048 | 2 (triggers not met) | 143 | 2,453 | 1,459 | 1,273 | 895 | 875 (667) | 4 | 30,774 |
| R/broad-rise | 0 / 0 | 2,870 | 4,096 | 4 (triggers not met) | 85 | 4,352 | 2,690 | 2,148 | 1,365 | 2,232 (1,468) | 4 | 54,301 |
| R/broad-breakout | 0 / 0 | 2,869 | 4,096 | 4 (triggers not met) | 104 | 4,352 | 3,361 | 2,843 | 815 | 2,091 (1,609) | 4 | 65,359 |
| O/seeded | 45 / 135 | 0 | 448 | 1 (triggers not met) | 187 | 583 | 379 | 321 | 149 | 309 (203) | 3 | 11,463 |
| O/broad-rise | 0 / 0 | 701 | 1,536 | 3 (triggers not met) | 142 | 1,600 | 1,120 | 961 | 387 | 988 (753) | 3 | 24,256 |
| O/broad-breakout | 0 / 0 | 700 | 1,024 | 2 (triggers not met) | 129 | 1,088 | 923 | 818 | 65 | 744 (554) | 3 | 20,434 |
| G/seeded | 45 / 135 | 0 | 1,024 | 2 (triggers not met) | 152 | 1,159 | 810 | 681 | 268 | 523 (329) | 3 | 18,517 |
| G/broad-rise | 0 / 0 | 701 | 1,536 | 3 (triggers not met) | 149 | 1,600 | 1,131 | 879 | 337 | 1,093 (717) | 3 | 24,744 |
| G/broad-breakout | 0 / 0 | 700 | 1,024 | 2 (triggers not met) | 117 | 1,088 | 887 | 720 | 84 | 801 (553) | 3 | 19,654 |

Per arm (new GDX centre proposals = seeded designs + screened + island proposals; refinement moves apart):

| Arm | Planned base / cap | Seeded designs | Screened | Island proposals | Total new proposals | Refinement moves | Requested evaluations |
|---|---:|---:|---:|---:|---:|---:|---:|
| R | 16,384 / 32,768 | 405 | 5,739 | 10,240 | 16,384 | 332 | 150,434 |
| O | 4,096 / 8,192 | 135 | 1,401 | 3,008 | 4,544 | 458 | 56,153 |
| G | 4,096 / 8,192 | 135 | 1,401 | 3,584 | 5,120 | 418 | 62,915 |

Evaluations by kind (fresh / archive hits): baseline 3 / 6; screen 8,541 / 0; r1:centre 17,763 / 512; r1:neighbours 204,019 / 141; r2:centre 0 / 144; r2:neighbours 9,216 / 0; r3:centre 0 / 68; r3:neighbours 8,704 / 0; refine:centre 1,188 / 38; refine:neighbours 18,557 / 511.

Origins (rung-1 centres / feasible): R/seeded: seed 45/24, design 360/175, island 2048/1074; R/broad-rise: screen 128/46, filler 128/26, island 4096/2076; R/broad-breakout: screen 128/46, filler 128/44, island 4096/2753; O/seeded: seed 45/26, design 90/41, island 448/254; O/broad-rise: screen 64/32, island 1536/929; O/broad-breakout: screen 64/30, island 1024/788; G/seeded: seed 45/24, design 90/40, island 1024/617; G/broad-rise: screen 64/20, island 1536/859; G/broad-breakout: screen 64/25, island 1024/695.

## C23 (door D23; 32.51 min; 330,667 fresh evaluations, 1,671 archive hits; peak cgroup 9.6 GiB)

| Lane | Seeds / designs | Screened | Island proposals | Islands (stop) | Refine moves | Rung-1 centres | Plausible→measured | Feasible | Baseline-equivalent | Distinct ledgers (feasible) | Shortlist | Requested evaluations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| R/seeded | 43 / 387 | 0 | 2,944 | 3 (triggers not met) | 140 | 3,331 | 2,357 | 2,064 | 762 | 1,677 (1,277) | 4 | 46,195 |
| R/broad-rise | 0 / 0 | 2,879 | 4,096 | 4 (triggers not met) | 109 | 4,352 | 2,762 | 2,329 | 1,290 | 2,213 (1,548) | 4 | 55,999 |
| R/broad-breakout | 0 / 0 | 2,878 | 5,120 | 5 (triggers not met) | 157 | 5,408 | 4,345 | 3,607 | 764 | 3,248 (2,431) | 4 | 83,230 |
| O/seeded | 43 / 129 | 0 | 1,536 | 3 (extension cap reached) | 245 | 1,665 | 1,207 | 1,042 | 272 | 1,064 (739) | 3 | 26,811 |
| O/broad-rise | 0 / 0 | 704 | 1,024 | 2 (triggers not met) | 242 | 1,088 | 694 | 569 | 260 | 725 (475) | 3 | 18,824 |
| O/broad-breakout | 0 / 0 | 703 | 1,024 | 2 (triggers not met) | 135 | 1,088 | 886 | 786 | 96 | 775 (590) | 3 | 19,931 |
| G/seeded | 43 / 129 | 0 | 1,536 | 3 (extension cap reached) | 67 | 1,665 | 1,182 | 822 | 282 | 1,140 (611) | 3 | 23,304 |
| G/broad-rise | 0 / 0 | 704 | 1,536 | 3 (triggers not met) | 174 | 1,600 | 1,106 | 830 | 307 | 1,055 (611) | 3 | 24,740 |
| G/broad-breakout | 0 / 0 | 703 | 2,048 | 4 (triggers not met) | 119 | 2,112 | 1,687 | 1,239 | 142 | 1,437 (783) | 3 | 33,386 |

Per arm (new GDX centre proposals = seeded designs + screened + island proposals; refinement moves apart):

| Arm | Planned base / cap | Seeded designs | Screened | Island proposals | Total new proposals | Refinement moves | Requested evaluations |
|---|---:|---:|---:|---:|---:|---:|---:|
| R | 16,384 / 32,768 | 387 | 5,757 | 12,160 | 18,304 | 406 | 185,424 |
| O | 4,096 / 8,192 | 129 | 1,407 | 3,584 | 5,120 | 622 | 65,566 |
| G | 4,096 / 8,192 | 129 | 1,407 | 5,120 | 6,656 | 360 | 81,430 |

Evaluations by kind (fresh / archive hits): baseline 3 / 6; screen 8,571 / 0; r1:centre 21,797 / 512; r1:neighbours 259,359 / 257; r2:centre 0 / 144; r2:neighbours 9,216 / 0; r3:centre 0 / 70; r3:neighbours 8,960 / 0; refine:centre 1,367 / 39; refine:neighbours 21,394 / 643.

Origins (rung-1 centres / feasible): R/seeded: seed 43/17, design 344/135, island 2944/1912; R/broad-rise: screen 128/51, filler 128/25, island 4096/2253; R/broad-breakout: screen 128/54, filler 160/63, island 5120/3490; O/seeded: seed 43/17, design 86/37, island 1536/988; O/broad-rise: screen 64/24, island 1024/545; O/broad-breakout: screen 64/28, island 1024/758; G/seeded: seed 43/18, design 86/25, island 1536/779; G/broad-rise: screen 64/18, island 1536/812; G/broad-breakout: screen 64/19, island 2048/1220.

## C24 (door D24; 39.21 min; 347,556 fresh evaluations, 2,335 archive hits; peak cgroup 10.3 GiB)

| Lane | Seeds / designs | Screened | Island proposals | Islands (stop) | Refine moves | Rung-1 centres | Plausible→measured | Feasible | Baseline-equivalent | Distinct ledgers (feasible) | Shortlist | Requested evaluations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| R/seeded | 59 / 531 | 0 | 3,584 | 4 (triggers not met) | 239 | 4,115 | 2,728 | 2,278 | 1,210 | 2,187 (1,645) | 4 | 54,646 |
| R/broad-rise | 0 / 0 | 2,807 | 4,992 | 5 (triggers not met) | 176 | 5,280 | 3,429 | 2,717 | 1,436 | 3,058 (2,026) | 4 | 68,666 |
| R/broad-breakout | 0 / 0 | 2,806 | 4,096 | 4 (triggers not met) | 173 | 4,352 | 3,729 | 3,096 | 401 | 2,999 (2,275) | 4 | 72,470 |
| O/seeded | 59 / 177 | 0 | 864 | 2 (triggers not met) | 145 | 1,041 | 688 | 577 | 305 | 605 (462) | 3 | 16,183 |
| O/broad-rise | 0 / 0 | 680 | 1,792 | 4 (triggers not met) | 161 | 1,856 | 1,324 | 1,109 | 398 | 1,216 (878) | 3 | 28,175 |
| O/broad-breakout | 0 / 0 | 679 | 1,440 | 3 (triggers not met) | 156 | 1,504 | 1,166 | 983 | 171 | 994 (668) | 3 | 25,192 |
| G/seeded | 59 / 177 | 0 | 1,536 | 3 (extension cap reached) | 218 | 1,713 | 1,212 | 944 | 309 | 1,064 (661) | 3 | 26,625 |
| G/broad-rise | 0 / 0 | 680 | 1,536 | 3 (triggers not met) | 190 | 1,600 | 1,117 | 920 | 286 | 1,018 (631) | 3 | 25,164 |
| G/broad-breakout | 0 / 0 | 679 | 2,048 | 4 (triggers not met) | 222 | 2,112 | 1,530 | 1,090 | 294 | 1,171 (498) | 3 | 32,875 |

Per arm (new GDX centre proposals = seeded designs + screened + island proposals; refinement moves apart):

| Arm | Planned base / cap | Seeded designs | Screened | Island proposals | Total new proposals | Refinement moves | Requested evaluations |
|---|---:|---:|---:|---:|---:|---:|---:|
| R | 16,384 / 32,768 | 531 | 5,613 | 12,672 | 18,816 | 588 | 195,782 |
| O | 4,096 / 8,192 | 177 | 1,359 | 4,096 | 5,632 | 462 | 69,550 |
| G | 4,096 / 8,192 | 177 | 1,359 | 5,120 | 6,656 | 630 | 84,664 |

Evaluations by kind (fresh / archive hits): baseline 3 / 6; screen 8,331 / 0; r1:centre 23,061 / 512; r1:neighbours 270,465 / 303; r2:centre 0 / 144; r2:neighbours 9,216 / 0; r3:centre 0 / 74; r3:neighbours 9,440 / 32; refine:centre 1,646 / 52; refine:neighbours 25,394 / 1,212.

Origins (rung-1 centres / feasible): R/seeded: seed 59/21, design 472/162, island 3584/2095; R/broad-rise: screen 128/44, filler 160/28, island 4992/2645; R/broad-breakout: screen 128/42, filler 128/49, island 4096/3005; O/seeded: seed 59/14, design 118/32, island 864/531; O/broad-rise: screen 64/26, island 1792/1083; O/broad-breakout: screen 64/25, island 1440/958; G/seeded: seed 59/14, design 118/28, island 1536/902; G/broad-rise: screen 64/16, island 1536/904; G/broad-breakout: screen 64/21, island 2048/1069.

## All cutoffs

| Arm | New GDX centre proposals (4 cutoffs) |
|---|---:|
| R | 71,936 |
| O | 20,928 |
| G | 24,064 |

Qualification C19: 58,136 fresh evaluations, 0 archive hits, 36 members.

Qualification C21: 58,149 fresh evaluations, 0 archive hits, 36 members.

Qualification C23: 58,156 fresh evaluations, 0 archive hits, 36 members.

Qualification C24: 70,726 fresh evaluations, 0 archive hits, 38 members.

Transfers: 38,978 fresh evaluations, 0 archive hits, 20 transfers.
