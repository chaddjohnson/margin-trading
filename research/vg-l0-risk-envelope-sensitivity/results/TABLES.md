# RES-A 1.0.0 — generated tables

Generated 2026-11-22T16:38:28Z by `tools/vg-l0-risk-envelope-sensitivity/tables.ts` from `results/analysis-C2x.json`. Dollars rounded for display only; every decision compared unrounded record values. "Scope" = unique centres with no error, net > 0, both families funded and a valid envelope. Retrospective, exploratory: the 30 % / 35 % levels were proposed after the pilot's outcome was known.

## 1. Policies

| Policy | id | DD / C0 | PL / funded principal | BD / C0 | Neighbourhood statistic | Role |
|---|---|---|---|---|---|---|
| P0 | `nl0-control@1.0.0` | 35 % | — | — | cents p90 DD (CTRL) | primary |
| P1 | `sens-p1-dd40@1.0.0` | 40 % | — | — | unrounded p90 (EXP) | primary |
| P2 | `re-40-25-25@1.0.0` | 40 % | 25 % | 25 % | unrounded p90 (EXP) | primary |
| P3 | `sens-p3-40-25-30@1.0.0` | 40 % | 25 % | 30 % | unrounded p90 (EXP) | primary |
| P4 | `sens-p4-40-25-35@1.0.0` | 40 % | 25 % | 35 % | unrounded p90 (EXP) | primary |
| P5 | `sens-p5-40-pl25@1.0.0` | 40 % | 25 % | — | unrounded p90 (EXP) | diagnostic ablation |
| P6 | `sens-p6-40-bd25@1.0.0` | 40 % | — | 25 % | unrounded p90 (EXP) | diagnostic ablation |
| P7 | `sens-p7-40-bd30@1.0.0` | 40 % | — | 30 % | unrounded p90 (EXP) | diagnostic ablation |
| P8 | `sens-p8-40-bd35@1.0.0` | 40 % | — | 35 % | unrounded p90 (EXP) | diagnostic ablation |

## 2. Population inventory

| Item | C21 | C24 |
|---|---|---|
| archive rows (unique evaluation keys, centres + neighbours) | 132,290 | 113,533 |
| centre requests replayed (both arms, with repeats) | 14,198 | 16,638 |
| neighbour requests replayed (both arms, with repeats) | 123,344 | 100,352 |
| fresh evaluations in the replays | 0 | 0 |
| unique centres (cfgId) | 11,462 | 13,899 |
|   requested by CTRL / EXP / both | 6,890 / 6,620 / 2,048 | 8,255 / 7,694 / 2,050 |
|   unique funded-lot ledgers | 9,714 | 12,318 |
|   excluded: net ≤ 0 / a family unfunded / error / no envelope | 454 / 1,364 / 0 / 0 | 852 / 1,804 / 0 / 0 |
| **scope** (profitable, funded, complete risk record) | **9,644** (7,912 ledgers) | **11,243** (9,705 ledgers) |
|   scope by highest stage: screen only | 828 | 940 |
|   scope by highest stage: rung 1 | 6,730 | 8,091 |
|   scope by highest stage: refinement move | 1,974 | 2,100 |
|   scope by highest stage: rung 2 | 48 | 48 |
|   scope by highest stage: rung 3 / endpoint | 40 | 40 |
|   scope by highest stage: shortlist | 24 | 24 |
| measured rung neighbourhoods r1 (16) / refine (16) / r2 (64) / r3 (128) | 5,546 / 1,131 / 96 / 64 | 4,170 / 1,182 / 96 / 64 |
| neighbour draws read for them | 121,168 | 99,968 |
| shortlist members (common population) / qualification members (+2 benchmarks) | 24 / 26 | 24 / 26 |
| G1 gap-filled rung-3 configurations (CPU) | 40 | 40 |
| G2 attributed centres (CPU) | 1,534 | 1,704 |

## 3. Centre eligibility (scope) — pass counts and centre-net distribution of the passing set

### C21

| Policy | Pass | Share | Max net | p90 net | Median net | Top-10 mean | ≥ $200k |
|---|---|---|---|---|---|---|---|
| P0 | 7,057 | 73.2 % | $229,867 | $188,725 | $128,782 | $212,432 | 128 |
| P1 | 8,254 | 85.6 % | $229,867 | $188,725 | $127,236 | $213,260 | 136 |
| P2 | 7,488 | 77.6 % | $229,867 | $188,880 | $132,673 | $213,260 | 136 |
| P3 | 7,929 | 82.2 % | $229,867 | $188,725 | $129,010 | $213,260 | 136 |
| P4 | 8,090 | 83.9 % | $229,867 | $188,725 | $128,066 | $213,260 | 136 |
| P5 | 8,113 | 84.1 % | $229,867 | $188,725 | $127,798 | $213,260 | 136 |
| P6 | 7,488 | 77.6 % | $229,867 | $188,880 | $132,673 | $213,260 | 136 |
| P7 | 8,017 | 83.1 % | $229,867 | $188,725 | $128,892 | $213,260 | 136 |
| P8 | 8,231 | 85.3 % | $229,867 | $188,725 | $127,440 | $213,260 | 136 |

### C24

| Policy | Pass | Share | Max net | p90 net | Median net | Top-10 mean | ≥ $200k |
|---|---|---|---|---|---|---|---|
| P0 | 6,142 | 54.6 % | $219,693 | $170,126 | $108,246 | $214,514 | 138 |
| P1 | 7,344 | 65.3 % | $219,693 | $164,096 | $101,525 | $214,514 | 139 |
| P2 | 6,126 | 54.5 % | $219,693 | $170,126 | $108,766 | $214,514 | 137 |
| P3 | 6,971 | 62.0 % | $219,693 | $166,382 | $103,430 | $214,514 | 138 |
| P4 | 7,241 | 64.4 % | $219,693 | $164,761 | $102,224 | $214,514 | 138 |
| P5 | 7,257 | 64.5 % | $219,693 | $164,655 | $102,138 | $214,514 | 138 |
| P6 | 6,126 | 54.5 % | $219,693 | $170,126 | $108,766 | $214,514 | 137 |
| P7 | 7,038 | 62.6 % | $219,693 | $166,071 | $103,051 | $214,514 | 139 |
| P8 | 7,328 | 65.2 % | $219,693 | $164,263 | $101,641 | $214,514 | 139 |

## 4. Centre overlap against P0 and P2 (scope)

### C21 vs P0

| Policy | both | P0 only | alternative only | neither |
|---|---|---|---|---|
| P1 | 7,057 | 0 | 1,197 | 1,390 |
| P2 | 6,720 | 337 | 768 | 1,819 |
| P3 | 6,999 | 58 | 930 | 1,657 |
| P4 | 7,031 | 26 | 1,059 | 1,528 |
| P5 | 7,031 | 26 | 1,082 | 1,505 |
| P6 | 6,720 | 337 | 768 | 1,819 |
| P7 | 7,024 | 33 | 993 | 1,594 |
| P8 | 7,057 | 0 | 1,174 | 1,413 |

### C21 vs P2

| Policy | both | P2 only | alternative only | neither |
|---|---|---|---|---|
| P0 | 6,720 | 768 | 337 | 1,819 |
| P1 | 7,488 | 0 | 766 | 1,390 |
| P3 | 7,488 | 0 | 441 | 1,715 |
| P4 | 7,488 | 0 | 602 | 1,554 |
| P5 | 7,488 | 0 | 625 | 1,531 |
| P6 | 7,488 | 0 | 0 | 2,156 |
| P7 | 7,488 | 0 | 529 | 1,627 |
| P8 | 7,488 | 0 | 743 | 1,413 |

### C24 vs P0

| Policy | both | P0 only | alternative only | neither |
|---|---|---|---|---|
| P1 | 6,142 | 0 | 1,202 | 3,899 |
| P2 | 5,640 | 502 | 486 | 4,615 |
| P3 | 6,097 | 45 | 874 | 4,227 |
| P4 | 6,124 | 18 | 1,117 | 3,984 |
| P5 | 6,124 | 18 | 1,133 | 3,968 |
| P6 | 5,640 | 502 | 486 | 4,615 |
| P7 | 6,115 | 27 | 923 | 4,178 |
| P8 | 6,142 | 0 | 1,186 | 3,915 |

### C24 vs P2

| Policy | both | P2 only | alternative only | neither |
|---|---|---|---|---|
| P0 | 5,640 | 486 | 502 | 4,615 |
| P1 | 6,126 | 0 | 1,218 | 3,899 |
| P3 | 6,126 | 0 | 845 | 4,272 |
| P4 | 6,126 | 0 | 1,115 | 4,002 |
| P5 | 6,126 | 0 | 1,131 | 3,986 |
| P6 | 6,126 | 0 | 0 | 5,117 |
| P7 | 6,126 | 0 | 912 | 4,205 |
| P8 | 6,126 | 0 | 1,202 | 3,915 |

## 5. Centre pass counts by group (P0 / P1 / P2 / P3 / P4 | P5 / P6 / P7 / P8)

### C21

| Group | Scope | P0 | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 |
|---|---|---|---|---|---|---|---|---|---|---|
| all | 9,644 | 7,057 | 8,254 | 7,488 | 7,929 | 8,090 | 8,113 | 7,488 | 8,017 | 8,231 |
| cell GA0.VA0 | 3,604 | 2,421 | 3,035 | 2,773 | 2,895 | 2,966 | 2,969 | 2,773 | 2,933 | 3,032 |
| replicate R1 | 4,059 | 2,924 | 3,459 | 3,194 | 3,341 | 3,403 | 3,412 | 3,194 | 3,375 | 3,450 |
| origin both | 1,076 | 212 | 361 | 224 | 298 | 336 | 341 | 224 | 311 | 356 |
| stage screen only | 828 | 31 | 141 | 38 | 84 | 120 | 125 | 38 | 93 | 136 |
| growth bounded | 6,896 | 5,161 | 5,751 | 5,173 | 5,562 | 5,704 | 5,726 | 5,173 | 5,580 | 5,729 |
| lane CTRL GA0.VA0/R1 | 926 | 621 | 698 | 619 | 654 | 679 | 681 | 619 | 666 | 696 |
| lane EXP GA0.VA0/R1 | 920 | 407 | 699 | 645 | 674 | 688 | 688 | 645 | 681 | 699 |
| stage rung 1 | 6,730 | 5,273 | 6,033 | 5,370 | 5,765 | 5,890 | 5,908 | 5,370 | 5,844 | 6,015 |
| growth open-ended | 2,748 | 1,896 | 2,503 | 2,315 | 2,367 | 2,386 | 2,387 | 2,315 | 2,437 | 2,502 |
| replicate R2 | 5,585 | 4,133 | 4,795 | 4,294 | 4,588 | 4,687 | 4,701 | 4,294 | 4,642 | 4,781 |
| lane CTRL GA0.VA0/R2 | 1,384 | 1,020 | 1,139 | 1,019 | 1,080 | 1,104 | 1,105 | 1,019 | 1,100 | 1,138 |
| lane EXP GA0.VA0/R2 | 878 | 461 | 649 | 588 | 605 | 631 | 632 | 588 | 614 | 648 |
| cell GB0.VD1 | 6,040 | 4,636 | 5,219 | 4,715 | 5,034 | 5,124 | 5,144 | 4,715 | 5,084 | 5,199 |
| lane CTRL GB0.VD1/R1 | 1,293 | 948 | 1,049 | 952 | 1,013 | 1,031 | 1,036 | 952 | 1,024 | 1,044 |
| lane EXP GB0.VD1/R1 | 1,465 | 1,064 | 1,191 | 1,093 | 1,150 | 1,174 | 1,178 | 1,093 | 1,160 | 1,187 |
| lane CTRL GB0.VD1/R2 | 1,899 | 1,405 | 1,591 | 1,371 | 1,519 | 1,561 | 1,567 | 1,371 | 1,532 | 1,585 |
| lane EXP GB0.VD1/R2 | 1,955 | 1,343 | 1,599 | 1,425 | 1,532 | 1,558 | 1,567 | 1,425 | 1,551 | 1,590 |
| origin CTRL-only | 4,426 | 3,782 | 4,116 | 3,737 | 3,968 | 4,039 | 4,048 | 3,737 | 4,011 | 4,107 |
| stage rung 2 | 48 | 47 | 48 | 48 | 48 | 48 | 48 | 48 | 48 | 48 |
| stage rung 3 / endpoint | 40 | 33 | 40 | 40 | 40 | 40 | 40 | 40 | 40 | 40 |
| stage shortlist | 24 | 21 | 24 | 24 | 24 | 24 | 24 | 24 | 24 | 24 |
| stage refinement move | 1,974 | 1,652 | 1,968 | 1,968 | 1,968 | 1,968 | 1,968 | 1,968 | 1,968 | 1,968 |
| origin EXP-only | 4,142 | 3,063 | 3,777 | 3,527 | 3,663 | 3,715 | 3,724 | 3,527 | 3,695 | 3,768 |

### C24

| Group | Scope | P0 | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 |
|---|---|---|---|---|---|---|---|---|---|---|
| all | 11,243 | 6,142 | 7,344 | 6,126 | 6,971 | 7,241 | 7,257 | 6,126 | 7,038 | 7,328 |
| cell GA0.VA0 | 4,479 | 2,668 | 3,090 | 2,596 | 2,928 | 3,030 | 3,033 | 2,596 | 2,974 | 3,087 |
| replicate R1 | 5,351 | 2,818 | 3,423 | 2,814 | 3,241 | 3,374 | 3,389 | 2,814 | 3,267 | 3,408 |
| origin both | 1,143 | 40 | 77 | 31 | 57 | 71 | 72 | 31 | 61 | 76 |
| stage screen only | 940 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| growth bounded | 9,788 | 5,490 | 6,544 | 5,450 | 6,234 | 6,479 | 6,493 | 5,450 | 6,275 | 6,530 |
| lane CTRL GA0.VA0/R1 | 886 | 424 | 511 | 407 | 480 | 492 | 494 | 407 | 494 | 509 |
| lane EXP GA0.VA0/R1 | 1,355 | 670 | 802 | 661 | 762 | 793 | 794 | 661 | 769 | 801 |
| growth open-ended | 1,455 | 652 | 800 | 676 | 737 | 762 | 764 | 676 | 763 | 798 |
| stage rung 1 | 8,091 | 3,939 | 5,135 | 3,921 | 4,762 | 5,032 | 5,048 | 3,921 | 4,829 | 5,119 |
| replicate R2 | 5,892 | 3,324 | 3,921 | 3,312 | 3,730 | 3,867 | 3,868 | 3,312 | 3,771 | 3,920 |
| lane CTRL GA0.VA0/R2 | 1,839 | 1,095 | 1,250 | 1,045 | 1,176 | 1,227 | 1,228 | 1,045 | 1,193 | 1,249 |
| lane EXP GA0.VA0/R2 | 929 | 506 | 571 | 501 | 543 | 557 | 557 | 501 | 555 | 571 |
| cell GB0.VD1 | 6,764 | 3,474 | 4,254 | 3,530 | 4,043 | 4,211 | 4,224 | 3,530 | 4,064 | 4,241 |
| lane CTRL GB0.VD1/R1 | 1,817 | 928 | 1,111 | 852 | 1,031 | 1,098 | 1,107 | 852 | 1,033 | 1,102 |
| lane EXP GB0.VD1/R1 | 1,866 | 819 | 1,046 | 911 | 1,002 | 1,034 | 1,038 | 911 | 1,008 | 1,042 |
| lane CTRL GB0.VD1/R2 | 1,837 | 932 | 1,118 | 928 | 1,070 | 1,110 | 1,110 | 928 | 1,075 | 1,118 |
| lane EXP GB0.VD1/R2 | 1,857 | 808 | 1,012 | 852 | 964 | 1,001 | 1,001 | 852 | 972 | 1,012 |
| origin CTRL-only | 5,236 | 3,339 | 3,913 | 3,201 | 3,700 | 3,856 | 3,867 | 3,201 | 3,734 | 3,902 |
| stage rung 2 | 48 | 46 | 48 | 48 | 48 | 48 | 48 | 48 | 48 | 48 |
| stage rung 3 / endpoint | 40 | 40 | 40 | 38 | 40 | 40 | 40 | 38 | 40 | 40 |
| stage shortlist | 24 | 24 | 24 | 24 | 24 | 24 | 24 | 24 | 24 | 24 |
| stage refinement move | 2,100 | 2,093 | 2,097 | 2,095 | 2,097 | 2,097 | 2,097 | 2,095 | 2,097 | 2,097 |
| origin EXP-only | 4,864 | 2,763 | 3,354 | 2,894 | 3,214 | 3,314 | 3,318 | 2,894 | 3,243 | 3,350 |

## 6. Failure combinations and binding metric (scope; failing centres)

### C21 — binding metric (largest dollar excess) and distance

| Policy | Binding | Centres | ≤ $1k over | ≤ $2.5k over | ≤ $5k over | Median excess | p90 excess |
|---|---|---|---|---|---|---|---|
| P0 | DD | 2,587 | 299 | 552 | 1,197 | $5,664 | $21,442 |
| P1 | DD | 1,390 | 146 | 299 | 555 | $6,937 | $21,637 |
| P2 | BD | 1,349 | 128 | 295 | 520 | $6,693 | $22,264 |
| P2 | DD | 653 | 62 | 134 | 237 | $7,318 | $24,150 |
| P2 | PL | 154 | 55 | 63 | 77 | $4,904 | $13,124 |
| P3 | BD | 550 | 56 | 127 | 221 | $6,855 | $22,386 |
| P3 | DD | 952 | 96 | 200 | 364 | $7,192 | $22,648 |
| P3 | PL | 213 | 65 | 81 | 113 | $4,211 | $14,841 |
| P4 | DD | 1,218 | 125 | 261 | 478 | $7,069 | $22,374 |
| P4 | BD | 118 | 16 | 29 | 47 | $6,511 | $21,982 |
| P4 | PL | 218 | 65 | 81 | 115 | $4,211 | $15,108 |
| P5 | DD | 1,312 | 131 | 274 | 514 | $7,042 | $22,360 |
| P5 | PL | 219 | 65 | 82 | 116 | $4,211 | $15,108 |
| P6 | BD | 1,503 | 183 | 358 | 597 | $6,681 | $21,074 |
| P6 | DD | 653 | 62 | 134 | 237 | $7,318 | $24,150 |
| P7 | BD | 642 | 60 | 135 | 279 | $6,088 | $20,975 |
| P7 | DD | 985 | 105 | 216 | 387 | $7,026 | $22,452 |
| P8 | DD | 1,286 | 138 | 283 | 513 | $6,956 | $21,702 |
| P8 | BD | 127 | 17 | 31 | 51 | $6,449 | $21,471 |

### C21 — failing-metric combinations

| Policy | Combinations (count) |
|---|---|
| P0 | DD 2,587 |
| P1 | DD 1,390 |
| P2 | DD+BD 834; BD 625; DD+PL+BD 311; DD 245; PL+BD 141 |
| P3 | DD+BD 646; DD 433; DD+PL+BD 252; BD 184; PL 88; DD+PL 59; PL+BD 53 |
| P4 | DD 636; DD+BD 443; DD+PL+BD 195; PL 141; DD+PL 116; BD 23 |
| P5 | DD 1,079; DD+PL 311; PL 141 |
| P6 | DD+BD 1,145; BD 766; DD 245 |
| P7 | DD+BD 898; DD 492; BD 237 |
| P8 | DD 752; DD+BD 638; BD 23 |

### C24 — binding metric (largest dollar excess) and distance

| Policy | Binding | Centres | ≤ $1k over | ≤ $2.5k over | ≤ $5k over | Median excess | p90 excess |
|---|---|---|---|---|---|---|---|
| P0 | DD | 5,101 | 269 | 617 | 1,202 | $13,043 | $38,655 |
| P1 | DD | 3,899 | 231 | 487 | 926 | $12,616 | $37,468 |
| P2 | BD | 3,445 | 195 | 514 | 994 | $10,844 | $33,084 |
| P2 | DD | 1,498 | 72 | 155 | 312 | $15,756 | $45,055 |
| P2 | PL | 174 | 18 | 26 | 46 | $14,920 | $21,257 |
| P3 | BD | 1,488 | 93 | 213 | 409 | $11,045 | $32,939 |
| P3 | DD | 2,488 | 131 | 292 | 570 | $14,123 | $40,696 |
| P3 | PL | 296 | 30 | 55 | 95 | $13,134 | $21,257 |
| P4 | DD | 3,413 | 194 | 421 | 803 | $13,282 | $39,024 |
| P4 | BD | 268 | 13 | 33 | 67 | $10,613 | $29,334 |
| P4 | PL | 321 | 32 | 60 | 105 | $13,003 | $21,257 |
| P5 | DD | 3,663 | 215 | 453 | 872 | $13,076 | $38,349 |
| P5 | PL | 323 | 32 | 60 | 105 | $13,003 | $21,257 |
| P6 | BD | 3,619 | 213 | 540 | 1,040 | $11,105 | $32,587 |
| P6 | DD | 1,498 | 72 | 155 | 312 | $15,756 | $45,055 |
| P7 | BD | 1,644 | 100 | 225 | 432 | $11,473 | $31,815 |
| P7 | DD | 2,561 | 141 | 306 | 591 | $13,904 | $40,037 |
| P8 | DD | 3,598 | 209 | 446 | 843 | $12,974 | $38,211 |
| P8 | BD | 317 | 13 | 39 | 79 | $10,892 | $27,157 |

### C24 — failing-metric combinations

| Policy | Combinations (count) |
|---|---|
| P0 | DD 5,101 |
| P1 | DD 3,899 |
| P2 | DD+BD 2,966; BD 1,131; DD+PL+BD 705; DD 228; PL+BD 87 |
| P3 | DD+BD 2,627; DD+PL+BD 658; DD 567; BD 286; PL 67; DD+PL 47; PL+BD 20 |
| P4 | DD+BD 2,116; DD 1,078; DD+PL+BD 603; DD+PL 102; PL 87; BD 16 |
| P5 | DD 3,194; DD+PL 705; PL 87 |
| P6 | DD+BD 3,671; BD 1,218; DD 228 |
| P7 | DD+BD 3,285; DD 614; BD 306 |
| P8 | DD+BD 2,719; DD 1,180; BD 16 |

## 7. Transitions between policies (scope)

### C21

| Set | Centres | Max net | p90 net | BD bands ≤25k / (25,30] / (30,35] / >35k | PL > 25k | Highest stage ≥ rung 2 | Bounded / open | Giveback-dominated (G2) |
|---|---|---|---|---|---|---|---|---|
| admitted by P1 not P0 (DD 35→40 % alone) | 1,197 | $213,642 | $182,583 | 768 / 225 / 181 / 23 | 115 | 11 | 590 / 607 | 188 of 1,197 (U 37.3 %, E 47.0 %, F 15.7 %) |
| excluded from P1 by BD > 25 % (P1 ∧ ¬P6) | 766 | $188,368 | $124,880 | 0 / 529 / 214 / 23 | 141 | 0 | 578 / 188 | 18 of 766 (U 20.4 %, E 35.7 %, F 44.0 %) |
| excluded from P1 by BD > 30 % (P1 ∧ ¬P7) | 237 | $164,813 | $112,656 | 0 / 0 / 214 / 23 | 53 | 0 | 171 / 66 | 1 of 237 (U 13.3 %, E 31.0 %, F 55.7 %) |
| excluded from P1 by BD > 35 % (P1 ∧ ¬P8) | 23 | $140,704 | $102,561 | 0 / 0 / 0 / 23 | 0 | 0 | 22 / 1 | 0 of 23 (U 6.3 %, E 5.5 %, F 88.2 %) |
| excluded from P1 by PL > 25 % (P1 ∧ ¬P5) | 141 | $188,368 | $149,666 | 0 / 88 / 53 / 0 | 141 | 0 | 25 / 116 | 1 of 141 (U 22.2 %, E 61.7 %, F 16.1 %) |
| rescued by BD 30 % (P3 ∧ ¬P2) | 441 | $170,095 | $121,053 | 0 / 441 / 0 / 0 | 0 | 0 | 389 / 52 | 16 of 441 (U 22.9 %, E 33.8 %, F 43.3 %) |
| rescued by BD 35 % (P4 ∧ ¬P2) | 602 | $170,095 | $120,647 | 0 / 441 / 161 / 0 | 0 | 0 | 531 / 71 | 17 of 602 (U 20.5 %, E 30.4 %, F 49.1 %) |
| rescued by BD 35 % over 30 % (P4 ∧ ¬P3) | 161 | $164,813 | $116,066 | 0 / 0 / 161 / 0 | 0 | 0 | 142 / 19 | 1 of 161 (U 14.4 %, E 21.9 %, F 63.6 %) |
| P0 members P2 excludes (P0 ∧ ¬P2) | 337 | $188,368 | $124,777 | 0 / 304 / 33 / 0 | 26 | 0 | 275 / 62 | 9 of 337 (U 17.8 %, E 29.1 %, F 53.2 %) |
| P0 members P3 excludes (P0 ∧ ¬P3) | 58 | $188,368 | $141,723 | 0 / 25 / 33 / 0 | 26 | 0 | 32 / 26 | 1 of 58 (U 13.3 %, E 30.4 %, F 56.3 %) |
| P0 members P4 excludes (P0 ∧ ¬P4) | 26 | $188,368 | $155,934 | 0 / 25 / 1 / 0 | 26 | 0 | 4 / 22 | 1 of 26 (U 20.5 %, E 58.3 %, F 21.1 %) |
| admitted by P3 not P0 (P3 ∧ ¬P0) | 930 | $213,642 | $186,067 | 768 / 162 / 0 / 0 | 0 | 11 | 433 / 497 | 187 of 930 (U 43.0 %, E 49.2 %, F 7.8 %) |
| admitted by P4 not P0 (P4 ∧ ¬P0) | 1,059 | $213,642 | $183,437 | 768 / 162 / 129 / 0 | 0 | 11 | 547 / 512 | 188 of 1,059 (U 39.7 %, E 46.2 %, F 14.1 %) |
| PL binds alone at BD 25 % (P6 ∧ ¬P2) | 0 | — | — | 0 / 0 / 0 / 0 | 0 | 0 | 0 / 0 | 0 of 0 (U —, E —, F —) |
| PL binds alone at BD 30 % (P7 ∧ ¬P3) | 88 | $188,368 | $153,745 | 0 / 88 / 0 / 0 | 88 | 0 | 18 / 70 | 1 of 88 (U 28.2 %, E 57.6 %, F 14.1 %) |
| PL binds alone at BD 35 % (P8 ∧ ¬P4) | 141 | $188,368 | $149,666 | 0 / 88 / 53 / 0 | 141 | 0 | 25 / 116 | 1 of 141 (U 22.2 %, E 61.7 %, F 16.1 %) |
| BD binds without PL at 25 % (P5 ∧ ¬P2) | 625 | $170,095 | $120,185 | 0 / 441 / 161 / 23 | 0 | 0 | 553 / 72 | 17 of 625 (U 19.9 %, E 29.4 %, F 50.7 %) |

### C24

| Set | Centres | Max net | p90 net | BD bands ≤25k / (25,30] / (30,35] / >35k | PL > 25k | Highest stage ≥ rung 2 | Bounded / open | Giveback-dominated (G2) |
|---|---|---|---|---|---|---|---|---|
| admitted by P1 not P0 (DD 35→40 % alone) | 1,202 | $200,209 | $127,879 | 486 / 437 / 263 / 16 | 69 | 2 | 1,054 / 148 | 116 of 1,202 (U 32.3 %, E 57.5 %, F 10.2 %) |
| excluded from P1 by BD > 25 % (P1 ∧ ¬P6) | 1,218 | $206,492 | $123,767 | 0 / 912 / 290 / 16 | 87 | 2 | 1,094 / 124 | 20 of 1,218 (U 21.7 %, E 62.5 %, F 15.8 %) |
| excluded from P1 by BD > 30 % (P1 ∧ ¬P7) | 306 | $178,528 | $123,847 | 0 / 0 / 290 / 16 | 20 | 0 | 269 / 37 | 4 of 306 (U 16.4 %, E 64.5 %, F 19.1 %) |
| excluded from P1 by BD > 35 % (P1 ∧ ¬P8) | 16 | $113,011 | $93,932 | 0 / 0 / 0 / 16 | 0 | 0 | 14 / 2 | 0 of 16 (U 8.6 %, E 32.0 %, F 59.4 %) |
| excluded from P1 by PL > 25 % (P1 ∧ ¬P5) | 87 | $206,492 | $126,759 | 0 / 67 / 20 / 0 | 87 | 0 | 51 / 36 | 2 of 87 (U 24.9 %, E 53.8 %, F 21.3 %) |
| rescued by BD 30 % (P3 ∧ ¬P2) | 845 | $204,974 | $123,329 | 0 / 845 / 0 / 0 | 0 | 2 | 784 / 61 | 14 of 845 (U 23.3 %, E 62.6 %, F 14.1 %) |
| rescued by BD 35 % (P4 ∧ ¬P2) | 1,115 | $204,974 | $123,862 | 0 / 845 / 270 / 0 | 0 | 2 | 1,029 / 86 | 18 of 1,115 (U 21.7 %, E 63.7 %, F 14.6 %) |
| rescued by BD 35 % over 30 % (P4 ∧ ¬P3) | 270 | $178,528 | $124,970 | 0 / 0 / 270 / 0 | 0 | 0 | 245 / 25 | 4 of 270 (U 16.9 %, E 67.1 %, F 16.1 %) |
| P0 members P2 excludes (P0 ∧ ¬P2) | 502 | $206,492 | $125,179 | 0 / 475 / 27 / 0 | 18 | 2 | 460 / 42 | 10 of 502 (U 18.4 %, E 60.6 %, F 21.0 %) |
| P0 members P3 excludes (P0 ∧ ¬P3) | 45 | $206,492 | $133,147 | 0 / 18 / 27 / 0 | 18 | 0 | 34 / 11 | 3 of 45 (U 16.7 %, E 52.9 %, F 30.4 %) |
| P0 members P4 excludes (P0 ∧ ¬P4) | 18 | $206,492 | $141,114 | 0 / 18 / 0 / 0 | 18 | 0 | 8 / 10 | 2 of 18 (U 23.7 %, E 56.0 %, F 20.3 %) |
| admitted by P3 not P0 (P3 ∧ ¬P0) | 874 | $200,209 | $130,471 | 486 / 388 / 0 / 0 | 0 | 2 | 778 / 96 | 113 of 874 (U 37.6 %, E 55.2 %, F 7.3 %) |
| admitted by P4 not P0 (P4 ∧ ¬P0) | 1,117 | $200,209 | $129,500 | 486 / 388 / 243 / 0 | 0 | 2 | 997 / 120 | 116 of 1,117 (U 33.1 %, E 58.2 %, F 8.7 %) |
| PL binds alone at BD 25 % (P6 ∧ ¬P2) | 0 | — | — | 0 / 0 / 0 / 0 | 0 | 0 | 0 / 0 | 0 of 0 (U —, E —, F —) |
| PL binds alone at BD 30 % (P7 ∧ ¬P3) | 67 | $206,492 | $133,105 | 0 / 67 / 0 / 0 | 67 | 0 | 41 / 26 | 2 of 67 (U 27.2 %, E 52.7 %, F 20.0 %) |
| PL binds alone at BD 35 % (P8 ∧ ¬P4) | 87 | $206,492 | $126,759 | 0 / 67 / 20 / 0 | 87 | 0 | 51 / 36 | 2 of 87 (U 24.9 %, E 53.8 %, F 21.3 %) |
| BD binds without PL at 25 % (P5 ∧ ¬P2) | 1,131 | $204,974 | $123,432 | 0 / 845 / 270 / 16 | 0 | 2 | 1,043 / 88 | 18 of 1,131 (U 21.5 %, E 63.2 %, F 15.3 %) |

## 8. Top centres of the key transitions (net, DD, PL, BD; highest stage)

### C21: admitted by P1 not P0 (DD 35→40 % alone)

| id | Net | DD | PL liq | BD liq | Stage | Origin | Growth |
|---|---|---|---|---|---|---|---|
| `rc2-c40d7f75bb2c6bf4` | $213,642 | $36,311 | $9,626 | $9,626 | rung 1 | EXP-only | open-ended |
| `rc2-4b3199402c407d37` | $210,706 | $36,254 | $8,653 | $8,653 | rung 1 | EXP-only | open-ended |
| `rc1-400f9c560c7a068b` | $206,109 | $38,079 | $4,943 | $4,943 | rung 1 | EXP-only | bounded |
| `9ad87a675efa46b2` | $202,274 | $35,731 | $22,381 | $22,381 | shortlist | EXP-only | open-ended |
| `ff76f412d126d5c8` | $202,274 | $35,731 | $22,381 | $22,381 | refinement move | EXP-only | open-ended |

### C21: rescued by BD 30 % (P3 ∧ ¬P2)

| id | Net | DD | PL liq | BD liq | Stage | Origin | Growth |
|---|---|---|---|---|---|---|---|
| `6d89b94fd9b16098` | $170,095 | $33,015 | $19,601 | $26,853 | rung 1 | CTRL-only | open-ended |
| `rc1-9a4ad8f9f514c581` | $167,830 | $30,842 | $10,512 | $25,423 | rung 1 | both | open-ended |
| `rc2-89f2a6899add39c5` | $157,108 | $31,581 | $10,043 | $25,465 | rung 1 | EXP-only | bounded |
| `f352522d0e412d88` | $149,310 | $31,674 | $17,551 | $25,582 | rung 1 | CTRL-only | bounded |
| `b4792b639011bf92` | $147,264 | $33,352 | $18,615 | $27,075 | rung 1 | CTRL-only | bounded |

### C21: rescued by BD 35 % over 30 % (P4 ∧ ¬P3)

| id | Net | DD | PL liq | BD liq | Stage | Origin | Growth |
|---|---|---|---|---|---|---|---|
| `a90dbcb5ff43f843` | $164,813 | $37,836 | $17,346 | $30,704 | screen only | both | bounded |
| `cfd78cfbd93a066a` | $155,345 | $38,324 | $13,763 | $30,115 | rung 1 | CTRL-only | bounded |
| `rc1-4c54dba4ae04c93d` | $146,277 | $36,124 | $10,202 | $31,276 | rung 1 | CTRL-only | bounded |
| `8e888e81d8f57c4f` | $142,230 | $38,324 | $13,763 | $30,115 | rung 1 | CTRL-only | bounded |
| `e1982e5b56c0bd01` | $140,902 | $38,667 | $18,887 | $33,379 | rung 1 | EXP-only | open-ended |

### C21: PL binds alone at BD 30 % (P7 ∧ ¬P3)

| id | Net | DD | PL liq | BD liq | Stage | Origin | Growth |
|---|---|---|---|---|---|---|---|
| `ab4c13096eec5cb8` | $188,368 | $34,335 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |
| `rc2-9177ac15dd62d1d6` | $168,741 | $37,379 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |
| `rc2-71eb8fc62bb64df3` | $167,296 | $34,861 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |
| `rc2-3d2df744bfc66ff9` | $167,014 | $37,828 | $25,044 | $25,044 | rung 1 | EXP-only | open-ended |
| `rc2-12f717451c04b831` | $161,633 | $35,860 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |

### C21: P0 members P3 excludes (P0 ∧ ¬P3)

| id | Net | DD | PL liq | BD liq | Stage | Origin | Growth |
|---|---|---|---|---|---|---|---|
| `ab4c13096eec5cb8` | $188,368 | $34,335 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |
| `rc2-71eb8fc62bb64df3` | $167,296 | $34,861 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |
| `rc1-d80218ba361f12b0` | $156,905 | $29,647 | $25,424 | $27,612 | rung 1 | EXP-only | open-ended |
| `85631a7dbe8c94d2` | $154,963 | $34,484 | $25,424 | $25,424 | rung 1 | CTRL-only | open-ended |
| `0a1ef1cc2d36f00e` | $146,450 | $34,961 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |

### C24: admitted by P1 not P0 (DD 35→40 % alone)

| id | Net | DD | PL liq | BD liq | Stage | Origin | Growth |
|---|---|---|---|---|---|---|---|
| `rc2-691c429ed497a5b7` | $200,209 | $38,627 | $4,943 | $5,191 | rung 1 | EXP-only | bounded |
| `rc2-98563c5715824d49` | $189,784 | $35,977 | $11,440 | $17,322 | rung 1 | CTRL-only | bounded |
| `rc1-f1a5545afecfdc68` | $181,521 | $35,732 | $13,258 | $28,808 | rung 1 | CTRL-only | open-ended |
| `rc2-195ef98f49e0372c` | $170,863 | $38,389 | $13,721 | $18,868 | rung 1 | EXP-only | bounded |
| `9fa5f50c273fecf9` | $170,147 | $35,862 | $11,721 | $20,928 | rung 1 | EXP-only | open-ended |

### C24: rescued by BD 30 % (P3 ∧ ¬P2)

| id | Net | DD | PL liq | BD liq | Stage | Origin | Growth |
|---|---|---|---|---|---|---|---|
| `fae27c930cef9179` | $204,974 | $32,143 | $12,529 | $25,331 | rung 1 | EXP-only | open-ended |
| `rc1-f1a5545afecfdc68` | $181,521 | $35,732 | $13,258 | $28,808 | rung 1 | CTRL-only | open-ended |
| `58c3722f3656fca4` | $179,857 | $31,425 | $13,205 | $26,674 | rung 1 | CTRL-only | bounded |
| `611b51572a3c595b` | $173,315 | $32,412 | $12,910 | $25,983 | rung 1 | EXP-only | bounded |
| `09a97cfa35e72877` | $169,390 | $35,547 | $11,281 | $25,416 | rung 1 | CTRL-only | bounded |

### C24: rescued by BD 35 % over 30 % (P4 ∧ ¬P3)

| id | Net | DD | PL liq | BD liq | Stage | Origin | Growth |
|---|---|---|---|---|---|---|---|
| `rc2-592a9c5c0e2ee4e5` | $178,528 | $31,311 | $20,474 | $30,104 | rung 1 | EXP-only | open-ended |
| `rc2-4df57f53b7870f1b` | $166,154 | $39,000 | $12,714 | $32,284 | rung 1 | CTRL-only | bounded |
| `rc2-fab0ccd8ca494cac` | $164,450 | $39,946 | $13,411 | $34,002 | rung 1 | CTRL-only | bounded |
| `rc2-06d8983d0fabe759` | $160,230 | $37,040 | $13,980 | $32,615 | rung 1 | CTRL-only | open-ended |
| `rc1-4d2ab651f06b1291` | $154,703 | $39,545 | $13,292 | $31,069 | rung 1 | CTRL-only | bounded |

### C24: PL binds alone at BD 30 % (P7 ∧ ¬P3)

| id | Net | DD | PL liq | BD liq | Stage | Origin | Growth |
|---|---|---|---|---|---|---|---|
| `rc1-f81b8272a4fc31c5` | $206,492 | $31,320 | $25,044 | $25,044 | rung 1 | EXP-only | open-ended |
| `rc2-75a49ccf98f0f65f` | $154,920 | $31,377 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |
| `rc1-9a6b91a211ad86d3` | $153,507 | $36,567 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |
| `rc1-e1a2e6cd5f99cf98` | $145,427 | $38,265 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |
| `rc1-121812ab178b1a63` | $135,198 | $34,094 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |

### C24: P0 members P3 excludes (P0 ∧ ¬P3)

| id | Net | DD | PL liq | BD liq | Stage | Origin | Growth |
|---|---|---|---|---|---|---|---|
| `rc1-f81b8272a4fc31c5` | $206,492 | $31,320 | $25,044 | $25,044 | rung 1 | EXP-only | open-ended |
| `rc2-592a9c5c0e2ee4e5` | $178,528 | $31,311 | $20,474 | $30,104 | rung 1 | EXP-only | open-ended |
| `rc2-75a49ccf98f0f65f` | $154,920 | $31,377 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |
| `rc1-121812ab178b1a63` | $135,198 | $34,094 | $25,044 | $25,044 | rung 1 | CTRL-only | open-ended |
| `1c3ecdc224da6630` | $133,231 | $32,428 | $26,479 | $28,307 | rung 1 | CTRL-only | bounded |

## 9. Search-stage (rung) feasibility under each policy (scope centres with a measured neighbourhood)

### C21

| Rung (draws) | Rows | P0 feasible / best net | P1 feasible / best net | P2 feasible / best net | P3 feasible / best net | P4 feasible / best net | P5 feasible / best net | P6 feasible / best net | P7 feasible / best net | P8 feasible / best net |
|---|---|---|---|---|---|---|---|---|---|---|
| r1 (16) | 5,546 | 3,533 / $207,700 | 4,683 / $207,700 | 3,632 / $207,700 | 4,362 / $207,700 | 4,585 / $207,700 | 4,597 / $207,700 | 3,632 / $207,700 | 4,418 / $207,700 | 4,670 / $207,700 |
| refine (16) | 1,131 | 791 / $216,732 | 1,114 / $216,732 | 1,114 / $216,732 | 1,114 / $216,732 | 1,114 / $216,732 | 1,114 / $216,732 | 1,114 / $216,732 | 1,114 / $216,732 | 1,114 / $216,732 |
| r2 (64) | 96 | 73 / $207,700 | 94 / $207,700 | 86 / $207,700 | 92 / $207,700 | 92 / $207,700 | 92 / $207,700 | 86 / $207,700 | 94 / $207,700 | 94 / $207,700 |
| r3 (128) | 64 | 48 / $216,732 | 63 / $216,732 | 60 / $216,732 | 63 / $216,732 | 63 / $216,732 | 63 / $216,732 | 60 / $216,732 | 63 / $216,732 | 63 / $216,732 |

Unmeasured gap (rung 1, centre-first: a policy admits the centre, neither arm measured its 16 neighbours): P0 110 (max net $157,108); P1 583 (max net $172,715); P2 138 (max net $172,715); P3 353 (max net $172,715); P4 459 (max net $172,715); P5 477 (max net $172,715); P6 138 (max net $172,715); P7 414 (max net $172,715); P8 565 (max net $172,715).

### C24

| Rung (draws) | Rows | P0 feasible / best net | P1 feasible / best net | P2 feasible / best net | P3 feasible / best net | P4 feasible / best net | P5 feasible / best net | P6 feasible / best net | P7 feasible / best net | P8 feasible / best net |
|---|---|---|---|---|---|---|---|---|---|---|
| r1 (16) | 4,170 | 1,518 / $206,986 | 2,420 / $206,986 | 1,524 / $192,951 | 2,149 / $206,986 | 2,373 / $206,986 | 2,392 / $206,986 | 1,524 / $192,951 | 2,169 / $206,986 | 2,401 / $206,986 |
| refine (16) | 1,182 | 1,156 / $218,842 | 1,177 / $218,842 | 1,129 / $212,765 | 1,173 / $218,842 | 1,176 / $218,842 | 1,176 / $218,842 | 1,129 / $212,765 | 1,174 / $218,842 | 1,177 / $218,842 |
| r2 (64) | 96 | 77 / $206,986 | 93 / $206,986 | 69 / $189,343 | 90 / $206,986 | 93 / $206,986 | 93 / $206,986 | 69 / $189,343 | 90 / $206,986 | 93 / $206,986 |
| r3 (128) | 64 | 56 / $218,842 | 64 / $218,842 | 51 / $197,012 | 62 / $218,842 | 64 / $218,842 | 64 / $218,842 | 51 / $197,012 | 62 / $218,842 | 64 / $218,842 |

Unmeasured gap (rung 1, centre-first: a policy admits the centre, neither arm measured its 16 neighbours): P0 169 (max net $206,492); P1 1,061 (max net $206,492); P2 177 (max net $189,784); P3 719 (max net $204,974); P4 971 (max net $204,974); P5 987 (max net $204,974); P6 177 (max net $189,784); P7 773 (max net $206,492); P8 1,045 (max net $206,492).

## 10. Qualification of the common population (24 shortlisted members; Q1–Q6 per policy)

### C21

| Policy | Centre pass (Q1, Q2, Q6) | Q3 pass | Q5 pass | Qualified | Best qualified centre net | Median qualified net |
|---|---|---|---|---|---|---|
| P0 | 21 | 20 | 21 | 20 / 24 | $216,732 | $187,871 |
| P1 | 24 | 23 | 24 | 23 / 24 | $216,732 | $187,441 |
| P2 | 24 | 22 | 24 | 22 / 24 | $216,732 | $187,101 |
| P3 | 24 | 23 | 24 | 23 / 24 | $216,732 | $187,441 |
| P4 | 24 | 23 | 24 | 23 / 24 | $216,732 | $187,441 |
| P5 | 24 | 23 | 24 | 23 / 24 | $216,732 | $187,441 |
| P6 | 24 | 22 | 24 | 22 / 24 | $216,732 | $187,101 |
| P7 | 24 | 23 | 24 | 23 / 24 | $216,732 | $187,441 |
| P8 | 24 | 23 | 24 | 23 / 24 | $216,732 | $187,441 |

### C24

| Policy | Centre pass (Q1, Q2, Q6) | Q3 pass | Q5 pass | Qualified | Best qualified centre net | Median qualified net |
|---|---|---|---|---|---|---|
| P0 | 24 | 21 | 24 | 21 / 24 | $218,842 | $166,222 |
| P1 | 24 | 24 | 24 | 24 / 24 | $218,842 | $165,010 |
| P2 | 24 | 21 | 24 | 21 / 24 | $197,012 | $163,798 |
| P3 | 24 | 24 | 24 | 24 / 24 | $218,842 | $165,010 |
| P4 | 24 | 24 | 24 | 24 / 24 | $218,842 | $165,010 |
| P5 | 24 | 24 | 24 | 24 / 24 | $218,842 | $165,010 |
| P6 | 24 | 21 | 24 | 21 / 24 | $197,012 | $163,798 |
| P7 | 24 | 24 | 24 | 24 / 24 | $218,842 | $165,010 |
| P8 | 24 | 24 | 24 | 24 / 24 | $218,842 | $165,010 |

## 11. Members whose qualification flips between policies (common population)

- C21 P2→P3: `CTRL C21/broad/GA0.VA0/R1#1 profit` ($188,316; P2: Q3 p90 BD > limit; P3: Q)
- C21 P3→P4: none
- C21 P2→P4: `CTRL C21/broad/GA0.VA0/R1#1 profit` ($188,316; P2: Q3 p90 BD > limit; P4: Q)
- C21 P6→P7: `CTRL C21/broad/GA0.VA0/R1#1 profit` ($188,316; P6: Q3 p90 BD > limit; P7: Q)
- C21 P7→P8: none
- C21 P0→P1: `EXP C21/broad/GA0.VA0/R1#1 profit` ($202,274; P0: Q2 DD > limit; Q3 p90 DD > limit; Q5 10 bps DD > limit; P1: Q); `EXP C21/broad/GA0.VA0/R1#2 robust` ($169,804; P0: Q2 DD > limit; Q3 p90 DD > limit; Q5 10 bps DD > limit; P1: Q); `EXP C21/broad/GA0.VA0/R2#3 Growth entry alternative` ($186,760; P0: Q2 DD > limit; Q3 p90 DD > limit; Q5 10 bps DD > limit; P1: Q)
- C21 P0→P3: `EXP C21/broad/GA0.VA0/R1#1 profit` ($202,274; P0: Q2 DD > limit; Q3 p90 DD > limit; Q5 10 bps DD > limit; P3: Q); `EXP C21/broad/GA0.VA0/R1#2 robust` ($169,804; P0: Q2 DD > limit; Q3 p90 DD > limit; Q5 10 bps DD > limit; P3: Q); `EXP C21/broad/GA0.VA0/R2#3 Growth entry alternative` ($186,760; P0: Q2 DD > limit; Q3 p90 DD > limit; Q5 10 bps DD > limit; P3: Q)
- C21 P0→P4: `EXP C21/broad/GA0.VA0/R1#1 profit` ($202,274; P0: Q2 DD > limit; Q3 p90 DD > limit; Q5 10 bps DD > limit; P4: Q); `EXP C21/broad/GA0.VA0/R1#2 robust` ($169,804; P0: Q2 DD > limit; Q3 p90 DD > limit; Q5 10 bps DD > limit; P4: Q); `EXP C21/broad/GA0.VA0/R2#3 Growth entry alternative` ($186,760; P0: Q2 DD > limit; Q3 p90 DD > limit; Q5 10 bps DD > limit; P4: Q)
- C24 P2→P3: `CTRL C24/broad/GA0.VA0/R1#1 profit` ($205,661; P2: Q3 p90 BD > limit; P3: Q); `CTRL C24/broad/GA0.VA0/R1#3 Growth gate alternative` ($161,748; P2: Q3 p90 BD > limit; P3: Q); `CTRL C24/broad/GB0.VD1/R2#1 profit` ($218,842; P2: Q3 p90 BD > limit; P3: Q)
- C24 P3→P4: none
- C24 P2→P4: `CTRL C24/broad/GA0.VA0/R1#1 profit` ($205,661; P2: Q3 p90 BD > limit; P4: Q); `CTRL C24/broad/GA0.VA0/R1#3 Growth gate alternative` ($161,748; P2: Q3 p90 BD > limit; P4: Q); `CTRL C24/broad/GB0.VD1/R2#1 profit` ($218,842; P2: Q3 p90 BD > limit; P4: Q)
- C24 P6→P7: `CTRL C24/broad/GA0.VA0/R1#1 profit` ($205,661; P6: Q3 p90 BD > limit; P7: Q); `CTRL C24/broad/GA0.VA0/R1#3 Growth gate alternative` ($161,748; P6: Q3 p90 BD > limit; P7: Q); `CTRL C24/broad/GB0.VD1/R2#1 profit` ($218,842; P6: Q3 p90 BD > limit; P7: Q)
- C24 P7→P8: none
- C24 P0→P1: `CTRL C24/broad/GA0.VA0/R1#1 profit` ($205,661; P0: Q3 p90 DD > limit; P1: Q); `EXP C24/broad/GB0.VD1/R1#3 Growth gate alternative` ($129,826; P0: Q3 p90 DD > limit; P1: Q); `EXP C24/broad/GB0.VD1/R2#3 Growth entry alternative` ($120,945; P0: Q3 p90 DD > limit; P1: Q)
- C24 P0→P3: `CTRL C24/broad/GA0.VA0/R1#1 profit` ($205,661; P0: Q3 p90 DD > limit; P3: Q); `EXP C24/broad/GB0.VD1/R1#3 Growth gate alternative` ($129,826; P0: Q3 p90 DD > limit; P3: Q); `EXP C24/broad/GB0.VD1/R2#3 Growth entry alternative` ($120,945; P0: Q3 p90 DD > limit; P3: Q)
- C24 P0→P4: `CTRL C24/broad/GA0.VA0/R1#1 profit` ($205,661; P0: Q3 p90 DD > limit; P4: Q); `EXP C24/broad/GB0.VD1/R1#3 Growth gate alternative` ($129,826; P0: Q3 p90 DD > limit; P4: Q); `EXP C24/broad/GB0.VD1/R2#3 Growth entry alternative` ($120,945; P0: Q3 p90 DD > limit; P4: Q)

## 12. Confirmation-neighbourhood risk of every member (384 draws; dollars; Wilson 95 % in %)

### C21

| Member | DD p50 / p90 / p95 / worst / w10 | PL liq p90 / worst | BD liq p50 / p90 / p95 / worst / w10 | DD > 35k / > 40k | BD > 25k / 30k / 35k (mean excess) |
|---|---|---|---|---|---|
| CTRL C21/broad/GA0.VA0/R1#1 profit | $26,515 / $34,777 / $38,052 / $46,656 / $38,360 | $10,409 / $21,019 | $6,370 / $25,690 / $28,768 / $37,121 / $29,110 | 38 / 9 | 45 ($3,598) / 13 ($1,835) / 2 ($1,101) |
| CTRL C21/broad/GA0.VA0/R1#2 robust | $19,872 / $23,069 / $23,770 / $35,642 / $25,165 | $7,287 / $13,816 | $7,766 / $11,369 / $13,816 / $23,329 / $14,531 | 1 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| CTRL C21/broad/GA0.VA0/R1#3 Growth entry alternative | $23,533 / $33,323 / $35,986 / $42,142 / $37,085 | $16,212 / $20,472 | $10,550 / $19,181 / $21,830 / $26,490 / $22,151 | 31 / 8 | 6 ($843) / 0 ($0) / 0 ($0) |
| CTRL C21/broad/GA0.VA0/R2#1 profit | $19,159 / $20,471 / $22,444 / $34,016 / $23,384 | $12,567 / $14,880 | $7,789 / $15,253 / $15,818 / $25,717 / $16,765 | 0 / 0 | 1 ($717) / 0 ($0) / 0 ($0) |
| CTRL C21/broad/GA0.VA0/R2#2 robust | $24,340 / $27,969 / $42,331 / $49,033 / $39,960 | $11,129 / $19,975 | $8,318 / $12,550 / $19,823 / $26,526 / $19,690 | 27 / 25 | 2 ($1,406) / 0 ($0) / 0 ($0) |
| CTRL C21/broad/GA0.VA0/R2#3 balanced | $17,744 / $23,001 / $25,794 / $32,010 / $25,895 | $11,753 / $20,472 | $11,515 / $16,028 / $19,693 / $25,727 / $19,356 | 0 / 0 | 1 ($727) / 0 ($0) / 0 ($0) |
| CTRL C21/broad/GB0.VD1/R1#1 profit | $29,629 / $33,303 / $36,461 / $41,599 / $36,811 | $6,932 / $8,565 | $10,334 / $18,836 / $21,926 / $26,582 / $22,171 | 28 / 4 | 7 ($862) / 0 ($0) / 0 ($0) |
| CTRL C21/broad/GB0.VD1/R1#2 robust | $23,760 / $24,300 / $24,300 / $50,412 / $29,833 | $7,289 / $22,807 | $6,346 / $7,289 / $8,171 / $27,751 / $12,692 | 10 / 10 | 10 ($2,021) / 0 ($0) / 0 ($0) |
| CTRL C21/broad/GB0.VD1/R1#3 Growth entry alternative | $28,767 / $33,677 / $36,003 / $47,032 / $36,366 | $8,473 / $9,169 | $12,327 / $16,776 / $25,925 / $26,733 / $23,799 | 24 / 2 | 25 ($1,235) / 0 ($0) / 0 ($0) |
| CTRL C21/broad/GB0.VD1/R2#1 profit | $27,730 / $29,894 / $30,690 / $45,849 / $33,539 | $11,939 / $25,044 | $10,443 / $18,046 / $20,182 / $27,250 / $21,070 | 9 / 8 | 5 ($486) / 0 ($0) / 0 ($0) |
| CTRL C21/broad/GB0.VD1/R2#2 robust | $28,313 / $32,790 / $35,264 / $45,849 / $36,924 | $10,793 / $25,044 | $10,106 / $17,326 / $22,662 / $30,126 / $22,054 | 20 / 11 | 8 ($1,238) / 1 ($126) / 0 ($0) |
| CTRL C21/broad/GB0.VD1/R2#3 Growth entry alternative | $25,147 / $32,507 / $36,129 / $57,261 / $39,132 | $7,558 / $10,426 | $7,807 / $20,076 / $33,301 / $57,308 / $33,608 | 25 / 13 | 30 ($12,085) / 22 ($10,600) / 15 ($8,909) |
| EXP C21/broad/GA0.VA0/R1#1 profit | $33,110 / $36,217 / $36,596 / $43,202 / $36,893 | $23,318 / $31,949 | $22,381 / $23,318 / $23,318 / $32,241 / $23,775 | 124 / 2 | 2 ($7,232) / 2 ($2,232) / 0 ($0) |
| EXP C21/broad/GA0.VA0/R1#2 robust | $37,589 / $38,415 / $38,415 / $38,501 / $38,420 | $23,318 / $23,318 | $23,318 / $23,318 / $23,318 / $23,318 / $23,318 | 317 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| EXP C21/broad/GA0.VA0/R1#3 balanced | $13,988 / $17,281 / $17,281 / $18,634 / $17,505 | $9,660 / $11,103 | $6,623 / $9,660 / $10,416 / $12,827 / $10,603 | 0 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| EXP C21/broad/GA0.VA0/R2#1 profit | $26,377 / $27,967 / $29,045 / $37,344 / $30,056 | $14,540 / $15,382 | $12,567 / $14,994 / $16,293 / $24,358 / $16,773 | 1 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| EXP C21/broad/GA0.VA0/R2#2 balanced | $17,281 / $19,336 / $21,914 / $24,611 / $21,968 | $9,253 / $9,781 | $6,053 / $9,626 / $11,142 / $15,447 / $11,517 | 0 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| EXP C21/broad/GA0.VA0/R2#3 Growth entry alternative | $35,630 / $35,732 / $35,764 / $40,160 / $35,879 | $15,141 / $15,141 | $15,141 / $15,141 / $15,141 / $19,685 / $15,495 | 203 / 1 | 0 ($0) / 0 ($0) / 0 ($0) |
| EXP C21/broad/GB0.VD1/R1#1 profit | $26,179 / $41,565 / $47,524 / $76,199 / $48,348 | $15,296 / $30,832 | $11,669 / $21,365 / $26,464 / $44,441 / $27,491 | 82 / 47 | 23 ($5,757) / 8 ($7,026) / 4 ($6,915) |
| EXP C21/broad/GB0.VD1/R1#2 robust | $26,346 / $32,094 / $33,170 / $39,946 / $33,822 | $10,028 / $11,015 | $9,808 / $12,343 / $13,215 / $17,392 / $13,368 | 5 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| EXP C21/broad/GB0.VD1/R1#3 profit order | $26,554 / $34,584 / $38,864 / $53,772 / $38,826 | $10,028 / $10,833 | $9,984 / $14,621 / $17,804 / $33,479 / $18,464 | 33 / 14 | 1 ($8,479) / 1 ($3,479) / 0 ($0) |
| EXP C21/broad/GB0.VD1/R2#1 profit | $20,050 / $25,316 / $26,516 / $35,154 / $27,577 | $8,708 / $9,345 | $8,084 / $14,298 / $18,240 / $28,937 / $19,278 | 1 / 0 | 3 ($2,300) / 0 ($0) / 0 ($0) |
| EXP C21/broad/GB0.VD1/R2#2 balanced | $18,285 / $20,626 / $28,777 / $32,505 / $27,579 | $9,692 / $10,291 | $7,832 / $10,632 / $13,325 / $16,052 / $13,411 | 0 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| EXP C21/broad/GB0.VD1/R2#3 Growth gate alternative | $20,107 / $21,806 / $22,800 / $31,416 / $24,314 | $9,988 / $10,802 | $7,158 / $14,067 / $15,737 / $26,565 / $17,967 | 0 / 0 | 3 ($1,210) / 0 ($0) / 0 ($0) |
| benchmark: New L0 | $19,193 / $23,452 / $24,512 / $29,474 / $24,991 | $13,109 / $14,578 | $10,734 / $15,357 / $16,501 / $23,840 / $16,986 | 0 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| benchmark: N/original | $20,980 / $24,683 / $26,942 / $36,650 / $27,765 | $13,109 / $14,578 | $12,090 / $17,390 / $19,941 / $29,457 / $20,494 | 1 / 0 | 3 ($2,158) / 0 ($0) / 0 ($0) |

### C24

| Member | DD p50 / p90 / p95 / worst / w10 | PL liq p90 / worst | BD liq p50 / p90 / p95 / worst / w10 | DD > 35k / > 40k | BD > 25k / 30k / 35k (mean excess) |
|---|---|---|---|---|---|
| CTRL C24/broad/GA0.VA0/R1#1 profit | $26,480 / $35,365 / $40,788 / $59,179 / $42,008 | $14,804 / $15,932 | $18,527 / $28,462 / $33,784 / $55,048 / $35,671 | 42 / 20 | 59 ($7,667) / 31 ($7,369) / 19 ($6,177) |
| CTRL C24/broad/GA0.VA0/R1#2 robust | $26,691 / $28,570 / $30,031 / $32,380 / $29,995 | $13,384 / $14,841 | $16,687 / $17,845 / $21,139 / $22,898 / $20,445 | 0 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| CTRL C24/broad/GA0.VA0/R1#3 Growth gate alternative | $26,293 / $32,035 / $34,536 / $49,482 / $35,889 | $17,616 / $20,472 | $19,779 / $25,596 / $28,030 / $41,955 / $29,534 | 16 / 5 | 49 ($3,680) / 14 ($3,731) / 5 ($3,752) |
| CTRL C24/broad/GA0.VA0/R2#1 profit | $25,977 / $31,313 / $32,665 / $39,046 / $33,242 | $18,777 / $18,912 | $17,387 / $23,974 / $25,143 / $32,146 / $25,947 | 7 / 0 | 21 ($2,230) / 2 ($1,938) / 0 ($0) |
| CTRL C24/broad/GA0.VA0/R2#2 robust | $14,505 / $17,855 / $19,393 / $25,334 / $20,008 | $10,374 / $13,157 | $6,398 / $11,978 / $13,916 / $19,443 / $14,258 | 0 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| CTRL C24/broad/GA0.VA0/R2#3 profit order | $25,396 / $31,194 / $32,580 / $39,046 / $33,170 | $18,777 / $18,912 | $17,387 / $23,974 / $25,143 / $32,146 / $25,947 | 7 / 0 | 21 ($2,230) / 2 ($1,938) / 0 ($0) |
| CTRL C24/broad/GB0.VD1/R1#1 profit | $23,250 / $27,271 / $28,794 / $39,206 / $30,465 | $12,206 / $13,650 | $11,109 / $15,892 / $18,468 / $27,273 / $19,785 | 6 / 0 | 7 ($1,028) / 0 ($0) / 0 ($0) |
| CTRL C24/broad/GB0.VD1/R1#2 robust | $23,371 / $27,271 / $28,644 / $39,206 / $30,463 | $12,206 / $13,650 | $11,228 / $15,892 / $18,468 / $27,273 / $19,785 | 6 / 0 | 7 ($1,028) / 0 ($0) / 0 ($0) |
| CTRL C24/broad/GB0.VD1/R1#3 Growth entry alternative | $21,173 / $26,064 / $28,463 / $47,408 / $29,781 | $9,974 / $11,087 | $12,521 / $17,756 / $19,480 / $30,100 / $20,524 | 4 / 1 | 3 ($3,771) / 1 ($100) / 0 ($0) |
| CTRL C24/broad/GB0.VD1/R2#1 profit | $27,686 / $32,123 / $37,137 / $51,462 / $38,366 | $16,794 / $19,052 | $17,968 / $26,313 / $31,083 / $45,152 / $31,816 | 27 / 13 | 54 ($5,096) / 23 ($4,815) / 6 ($6,272) |
| CTRL C24/broad/GB0.VD1/R2#2 robust | $20,182 / $24,819 / $25,946 / $35,062 / $26,719 | $10,370 / $20,472 | $11,515 / $14,729 / $17,403 / $24,991 / $17,738 | 1 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative | $20,649 / $28,672 / $29,578 / $32,406 / $29,901 | $13,606 / $14,360 | $12,086 / $23,356 / $24,440 / $27,514 / $24,760 | 0 / 0 | 14 ($1,033) / 0 ($0) / 0 ($0) |
| EXP C24/broad/GA0.VA0/R1#1 profit | $17,479 / $27,194 / $31,430 / $42,045 / $31,935 | $14,252 / $15,944 | $12,644 / $19,615 / $25,169 / $33,018 / $24,534 | 14 / 2 | 20 ($3,171) / 3 ($2,231) / 0 ($0) |
| EXP C24/broad/GA0.VA0/R1#2 Growth entry alternative | $23,744 / $29,286 / $31,916 / $40,791 / $32,875 | $16,212 / $17,968 | $16,212 / $22,791 / $25,596 / $34,424 / $26,490 | 8 / 2 | 27 ($2,932) / 7 ($2,404) / 0 ($0) |
| EXP C24/broad/GA0.VA0/R1#3 profit order | $21,445 / $33,297 / $35,436 / $53,208 / $35,776 | $11,925 / $43,367 | $14,024 / $18,211 / $19,057 / $47,170 / $19,892 | 26 / 1 | 1 ($22,170) / 1 ($17,170) / 1 ($12,170) |
| EXP C24/broad/GA0.VA0/R2#1 profit | $22,866 / $32,778 / $34,904 / $38,989 / $35,565 | $20,933 / $24,550 | $13,872 / $22,606 / $25,703 / $31,553 / $25,690 | 19 / 0 | 20 ($2,213) / 1 ($1,553) / 0 ($0) |
| EXP C24/broad/GA0.VA0/R2#2 robust | $17,281 / $21,545 / $24,392 / $32,484 / $24,946 | $10,243 / $14,924 | $9,065 / $13,405 / $14,776 / $24,816 / $15,912 | 0 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| EXP C24/broad/GA0.VA0/R2#3 Growth entry alternative | $21,575 / $26,695 / $28,918 / $35,041 / $29,089 | $11,235 / $13,628 | $13,342 / $19,037 / $21,258 / $25,226 / $21,395 | 1 / 0 | 1 ($226) / 0 ($0) / 0 ($0) |
| EXP C24/broad/GB0.VD1/R1#1 profit | $27,650 / $31,599 / $33,779 / $41,355 / $34,026 | $11,110 / $12,427 | $11,110 / $18,057 / $21,583 / $30,486 / $22,470 | 7 / 2 | 9 ($2,268) / 1 ($486) / 0 ($0) |
| EXP C24/broad/GB0.VD1/R1#2 robust | $20,294 / $24,555 / $27,328 / $30,259 / $27,097 | $13,502 / $13,683 | $10,084 / $18,947 / $20,608 / $23,411 / $20,550 | 0 / 0 | 0 ($0) / 0 ($0) / 0 ($0) |
| EXP C24/broad/GB0.VD1/R1#3 Growth gate alternative | $28,366 / $36,664 / $38,872 / $49,111 / $39,609 | $10,426 / $14,740 | $15,371 / $22,710 / $24,891 / $31,712 / $25,430 | 59 / 13 | 19 ($2,417) / 3 ($1,079) / 0 ($0) |
| EXP C24/broad/GB0.VD1/R2#1 profit | $25,488 / $34,741 / $36,704 / $42,351 / $37,185 | $20,310 / $21,009 | $13,655 / $21,618 / $23,754 / $33,266 / $24,821 | 37 / 3 | 16 ($2,641) / 2 ($2,434) / 0 ($0) |
| EXP C24/broad/GB0.VD1/R2#2 robust | $22,173 / $29,049 / $30,436 / $36,609 / $31,111 | $9,013 / $9,013 | $9,310 / $16,082 / $17,846 / $26,252 / $18,516 | 2 / 0 | 1 ($1,252) / 0 ($0) / 0 ($0) |
| EXP C24/broad/GB0.VD1/R2#3 Growth entry alternative | $30,025 / $35,666 / $37,004 / $45,008 / $37,685 | $7,180 / $7,180 | $17,493 / $23,473 / $25,698 / $39,170 / $26,641 | 53 / 5 | 22 ($3,428) / 3 ($5,071) / 1 ($4,170) |
| benchmark: New L0 | $21,374 / $30,658 / $34,487 / $42,791 / $34,808 | $13,109 / $14,578 | $13,373 / $22,728 / $27,364 / $35,822 / $27,603 | 15 / 2 | 33 ($3,344) / 5 ($2,495) / 1 ($822) |
| benchmark: N/original | $22,406 / $28,012 / $29,965 / $42,275 / $31,605 | $13,109 / $15,387 | $13,715 / $20,583 / $22,996 / $34,856 / $24,594 | 8 / 1 | 14 ($3,759) / 3 ($2,486) / 0 ($0) |

## 13. Counterfactual selectors (NL0 P0 rule and RA1-original, frozen; labelled counterfactual)

### C21 — common population (24)

| Policy | Qualified | P0 rule primary | net / DD / BD liq | next interval (sealed) | RA1-original primary | net |
|---|---|---|---|---|---|---|
| P0 | 20 / 24 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P1 | 23 / 24 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P2 | 22 / 24 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P3 | 23 / 24 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P4 | 23 / 24 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P5 | 23 / 24 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P6 | 22 / 24 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P7 | 23 / 24 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P8 | 23 / 24 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |

### C21 — CTRL population (12)

| Policy | Qualified | P0 rule primary | net / DD / BD liq | next interval (sealed) | RA1-original primary | net |
|---|---|---|---|---|---|---|
| P0 | 12 / 12 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `CTRL C21/broad/GB0.VD1/R2#1 profit` | $212,165 |
| P1 | 12 / 12 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `CTRL C21/broad/GB0.VD1/R2#1 profit` | $212,165 |
| P2 | 11 / 12 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `CTRL C21/broad/GB0.VD1/R2#1 profit` | $212,165 |
| P3 | 12 / 12 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `CTRL C21/broad/GB0.VD1/R2#1 profit` | $212,165 |
| P4 | 12 / 12 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `CTRL C21/broad/GB0.VD1/R2#1 profit` | $212,165 |
| P5 | 12 / 12 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `CTRL C21/broad/GB0.VD1/R2#1 profit` | $212,165 |
| P6 | 11 / 12 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `CTRL C21/broad/GB0.VD1/R2#1 profit` | $212,165 |
| P7 | 12 / 12 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `CTRL C21/broad/GB0.VD1/R2#1 profit` | $212,165 |
| P8 | 12 / 12 | `CTRL C21/broad/GB0.VD1/R1#1 profit` | $216,732 / $30,150 / $15,342 | −$27,810 (DD $45,820) | `CTRL C21/broad/GB0.VD1/R2#1 profit` | $212,165 |

### C21 — EXP population (12)

| Policy | Qualified | P0 rule primary | net / DD / BD liq | next interval (sealed) | RA1-original primary | net |
|---|---|---|---|---|---|---|
| P0 | 8 / 12 | `EXP C21/broad/GA0.VA0/R2#1 profit` | $212,276 / $26,325 / $11,203 | −$13,230 (DD $32,168) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P1 | 11 / 12 | `EXP C21/broad/GA0.VA0/R2#1 profit` | $212,276 / $26,325 / $11,203 | −$13,230 (DD $32,168) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P2 | 11 / 12 | `EXP C21/broad/GA0.VA0/R2#1 profit` | $212,276 / $26,325 / $11,203 | −$13,230 (DD $32,168) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P3 | 11 / 12 | `EXP C21/broad/GA0.VA0/R2#1 profit` | $212,276 / $26,325 / $11,203 | −$13,230 (DD $32,168) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P4 | 11 / 12 | `EXP C21/broad/GA0.VA0/R2#1 profit` | $212,276 / $26,325 / $11,203 | −$13,230 (DD $32,168) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P5 | 11 / 12 | `EXP C21/broad/GA0.VA0/R2#1 profit` | $212,276 / $26,325 / $11,203 | −$13,230 (DD $32,168) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P6 | 11 / 12 | `EXP C21/broad/GA0.VA0/R2#1 profit` | $212,276 / $26,325 / $11,203 | −$13,230 (DD $32,168) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P7 | 11 / 12 | `EXP C21/broad/GA0.VA0/R2#1 profit` | $212,276 / $26,325 / $11,203 | −$13,230 (DD $32,168) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |
| P8 | 11 / 12 | `EXP C21/broad/GA0.VA0/R2#1 profit` | $212,276 / $26,325 / $11,203 | −$13,230 (DD $32,168) | `EXP C21/broad/GB0.VD1/R2#1 profit` | $209,269 |

### C24 — common population (24)

| Policy | Qualified | P0 rule primary | net / DD / BD liq | next interval (sealed) | RA1-original primary | net |
|---|---|---|---|---|---|---|
| P0 | 21 / 24 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P1 | 24 / 24 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P2 | 21 / 24 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P3 | 24 / 24 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P4 | 24 / 24 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P5 | 24 / 24 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P6 | 21 / 24 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P7 | 24 / 24 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P8 | 24 / 24 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |

### C24 — CTRL population (12)

| Policy | Qualified | P0 rule primary | net / DD / BD liq | next interval (sealed) | RA1-original primary | net |
|---|---|---|---|---|---|---|
| P0 | 11 / 12 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 |
| P1 | 12 / 12 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 |
| P2 | 9 / 12 | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 / $18,745 / $10,523 | $34,357 (DD $35,925) | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 |
| P3 | 12 / 12 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 |
| P4 | 12 / 12 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 |
| P5 | 12 / 12 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 |
| P6 | 9 / 12 | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 / $18,745 / $10,523 | $34,357 (DD $35,925) | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 |
| P7 | 12 / 12 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 |
| P8 | 12 / 12 | `CTRL C24/broad/GB0.VD1/R2#1 profit` | $218,842 / $25,818 / $15,626 | $16,049 (DD $23,563) | `CTRL C24/broad/GB0.VD1/R2#3 Growth gate alternative` | $189,343 |

### C24 — EXP population (12)

| Policy | Qualified | P0 rule primary | net / DD / BD liq | next interval (sealed) | RA1-original primary | net |
|---|---|---|---|---|---|---|
| P0 | 10 / 12 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P1 | 12 / 12 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P2 | 12 / 12 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P3 | 12 / 12 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P4 | 12 / 12 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P5 | 12 / 12 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P6 | 12 / 12 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P7 | 12 / 12 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |
| P8 | 12 / 12 | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 / $17,281 / $9,660 | $58,652 (DD $16,832) | `EXP C24/broad/GA0.VA0/R1#1 profit` | $197,012 |

## 14. Attribution of the pilot difference (best qualified centre net by the P0 rule)

| Quantity | C21 | C24 |
|---|---|---|
| pilot Δ = EXP population @ P2 − CTRL population @ P0 | −$4,456 | −$21,830 |
| order A: constraint on CTRL vectors (CTRL @ P2 − CTRL @ P0) | $0 | −$29,499 |
| order A: search path at P2 (EXP @ P2 − CTRL @ P2) | −$4,456 | $7,669 |
| order B: search path at P0 (EXP @ P0 − CTRL @ P0) | −$4,456 | −$21,830 |
| order B: constraint on EXP vectors (EXP @ P2 − EXP @ P0) | $0 | $0 |
| common population best @ P0 | $216,732 | $218,842 |
| common population best @ P1 | $216,732 | $218,842 |
| common population best @ P2 | $216,732 | $197,012 |
| common population best @ P3 | $216,732 | $218,842 |
| common population best @ P4 | $216,732 | $218,842 |
| common population best @ P5 | $216,732 | $218,842 |
| common population best @ P6 | $216,732 | $197,012 |
| common population best @ P7 | $216,732 | $218,842 |
| common population best @ P8 | $216,732 | $218,842 |
| rung-3 best feasible centre net @ P0: CTRL-found / EXP-found | $216,732 / $212,276 | $218,842 / $197,012 |
| rung-3 best feasible centre net @ P1: CTRL-found / EXP-found | $216,732 / $212,276 | $218,842 / $197,012 |
| rung-3 best feasible centre net @ P2: CTRL-found / EXP-found | $216,732 / $212,276 | $189,343 / $197,012 |
| rung-3 best feasible centre net @ P3: CTRL-found / EXP-found | $216,732 / $212,276 | $218,842 / $197,012 |
| rung-3 best feasible centre net @ P4: CTRL-found / EXP-found | $216,732 / $212,276 | $218,842 / $197,012 |
| rung-3 best feasible centre net @ P5: CTRL-found / EXP-found | $216,732 / $212,276 | $218,842 / $197,012 |
| rung-3 best feasible centre net @ P6: CTRL-found / EXP-found | $216,732 / $212,276 | $189,343 / $197,012 |
| rung-3 best feasible centre net @ P7: CTRL-found / EXP-found | $216,732 / $212,276 | $218,842 / $197,012 |
| rung-3 best feasible centre net @ P8: CTRL-found / EXP-found | $216,732 / $212,276 | $218,842 / $197,012 |

## 15. Extended descriptive set (G1: rung-3 fits and refinement endpoints not shortlisted; CPU confirmation; never selectable)

### C21 (40 configurations)

| Policy | G1 qualified | Best G1 qualified net | Combined (24 + G1) qualified | Combined best | Combined top 3 |
|---|---|---|---|---|---|
| P0 | 29 | $207,700 | 49 | $216,732 (shortlisted) | $216,732 shortlisted; $212,276 shortlisted; $212,165 shortlisted |
| P1 | 38 | $207,700 | 61 | $216,732 (shortlisted) | $216,732 shortlisted; $212,276 shortlisted; $212,165 shortlisted |
| P2 | 34 | $207,700 | 56 | $216,732 (shortlisted) | $216,732 shortlisted; $212,276 shortlisted; $212,165 shortlisted |
| P3 | 38 | $207,700 | 61 | $216,732 (shortlisted) | $216,732 shortlisted; $212,276 shortlisted; $212,165 shortlisted |
| P4 | 38 | $207,700 | 61 | $216,732 (shortlisted) | $216,732 shortlisted; $212,276 shortlisted; $212,165 shortlisted |
| P5 | 38 | $207,700 | 61 | $216,732 (shortlisted) | $216,732 shortlisted; $212,276 shortlisted; $212,165 shortlisted |
| P6 | 34 | $207,700 | 56 | $216,732 (shortlisted) | $216,732 shortlisted; $212,276 shortlisted; $212,165 shortlisted |
| P7 | 38 | $207,700 | 61 | $216,732 (shortlisted) | $216,732 shortlisted; $212,276 shortlisted; $212,165 shortlisted |
| P8 | 38 | $207,700 | 61 | $216,732 (shortlisted) | $216,732 shortlisted; $212,276 shortlisted; $212,165 shortlisted |

| id | Origin | Net | DD | BD liq | Conf p90 DD / PL / BD | P0 | P2 | P3 | P4 |
|---|---|---|---|---|---|---|---|---|---|
| `rc2-4a5959652e10927c` | CTRL-only | $207,700 | $26,392 | $6,287 | $29,862 / $11,939 / $19,284 | Q | Q | Q | Q |
| `rc2-df9550e90e386c9e` | CTRL-only | $204,554 | $29,545 | $5,638 | $32,105 / $11,939 / $17,175 | Q | Q | Q | Q |
| `3b173b7096d42d41` | EXP-only | $199,831 | $35,731 | $22,381 | $36,217 / $23,318 / $23,318 | Q2 DD > limit; Q3 p90 DD > limit; Q5 10 bps DD > limit | Q | Q | Q |
| `rc2-1500bf998296aa08` | CTRL-only | $196,213 | $25,649 | $9,195 | $33,437 / $15,943 / $20,627 | Q | Q | Q | Q |
| `29e680e582c814fb` | EXP-only | $194,523 | $26,325 | $12,567 | $27,977 / $14,725 / $15,260 | Q | Q | Q | Q |
| `rc2-ad9830908c6cf226` | EXP-only | $192,239 | $19,462 | $5,193 | $26,339 / $8,667 / $13,484 | Q | Q | Q | Q |
| `rc2-1bc8c68bb9e7b469` | EXP-only | $191,036 | $26,325 | $9,984 | $34,009 / $10,028 / $13,488 | Q | Q | Q | Q |
| `29eda8a06da550da` | CTRL-only | $190,271 | $26,626 | $5,556 | $34,452 / $10,586 / $27,356 | Q | Q3 p90 BD > limit | Q | Q |
| `rc1-5a2fcfbdb63553e4` | EXP-only | $188,880 | $27,065 | $6,536 | $40,525 / $15,296 / $21,365 | Q3 p90 DD > limit | Q3 p90 DD > limit | Q3 p90 DD > limit | Q3 p90 DD > limit |
| `rc2-a1bae0913b0ddf3c` | CTRL-only | $188,725 | $29,766 | $7,309 | $29,860 / $8,467 / $12,130 | Q | Q | Q | Q |
| `37b1e0e3d5888c22` | CTRL-only | $188,316 | $25,262 | $5,556 | $35,042 / $10,409 / $24,686 | Q3 p90 DD > limit | Q | Q | Q |
| `rc2-91eacf8f8bd47a62` | CTRL-only | $187,205 | $29,766 | $8,829 | $29,860 / $9,545 / $11,913 | Q | Q | Q | Q |

### C24 (40 configurations)

| Policy | G1 qualified | Best G1 qualified net | Combined (24 + G1) qualified | Combined best | Combined top 3 |
|---|---|---|---|---|---|
| P0 | 31 | $206,986 | 52 | $218,842 (shortlisted) | $218,842 shortlisted; $206,986 G1; $197,012 shortlisted |
| P1 | 40 | $206,986 | 64 | $218,842 (shortlisted) | $218,842 shortlisted; $206,986 G1; $205,661 shortlisted |
| P2 | 31 | $188,500 | 52 | $197,012 (shortlisted) | $197,012 shortlisted; $189,343 shortlisted; $188,500 G1 |
| P3 | 38 | $206,986 | 62 | $218,842 (shortlisted) | $218,842 shortlisted; $206,986 G1; $205,661 shortlisted |
| P4 | 40 | $206,986 | 64 | $218,842 (shortlisted) | $218,842 shortlisted; $206,986 G1; $205,661 shortlisted |
| P5 | 40 | $206,986 | 64 | $218,842 (shortlisted) | $218,842 shortlisted; $206,986 G1; $205,661 shortlisted |
| P6 | 31 | $188,500 | 52 | $197,012 (shortlisted) | $197,012 shortlisted; $189,343 shortlisted; $188,500 G1 |
| P7 | 38 | $206,986 | 62 | $218,842 (shortlisted) | $218,842 shortlisted; $206,986 G1; $205,661 shortlisted |
| P8 | 40 | $206,986 | 64 | $218,842 (shortlisted) | $218,842 shortlisted; $206,986 G1; $205,661 shortlisted |

| id | Origin | Net | DD | BD liq | Conf p90 DD / PL / BD | P0 | P2 | P3 | P4 |
|---|---|---|---|---|---|---|---|---|---|
| `rc2-2a165bb5fc06225f` | CTRL-only | $206,986 | $22,035 | $15,626 | $31,401 / $16,794 / $26,259 | Q | Q3 p90 BD > limit | Q | Q |
| `rc2-f53f1160d3431ea2` | CTRL-only | $188,500 | $19,595 | $10,913 | $25,661 / $20,472 / $20,472 | Q | Q | Q | Q |
| `rc1-b9329268eb178510` | CTRL-only | $185,963 | $19,410 | $18,433 | $28,894 / $13,606 / $22,978 | Q | Q | Q | Q |
| `rc2-06373aaa1fed7af9` | CTRL-only | $179,087 | $26,078 | $17,991 | $35,174 / $11,885 / $26,998 | Q3 p90 DD > limit | Q3 p90 BD > limit | Q | Q |
| `rc2-050ea772ae77205f` | CTRL-only | $176,270 | $18,976 | $10,374 | $28,616 / $20,472 / $20,472 | Q | Q | Q | Q |
| `b1f4dfbf9b42e740` | EXP-only | $175,331 | $18,939 | $12,624 | $28,883 / $14,587 / $22,108 | Q | Q | Q | Q |
| `4938d4972f4f33c8` | CTRL-only | $173,928 | $24,446 | $16,321 | $36,035 / $14,540 / $29,590 | Q3 p90 DD > limit | Q3 p90 BD > limit | Q | Q |
| `65e2a2e4834c1c87` | EXP-only | $170,126 | $18,852 | $13,770 | $26,370 / $14,804 / $19,400 | Q | Q | Q | Q |
| `3f18ed86c0e6b7a9` | CTRL-only | $168,291 | $25,485 | $12,084 | $36,001 / $18,777 / $28,524 | Q3 p90 DD > limit | Q3 p90 BD > limit | Q | Q |
| `c10fc566124892e0` | CTRL-only | $167,537 | $24,446 | $16,321 | $36,353 / $14,880 / $28,457 | Q3 p90 DD > limit | Q3 p90 BD > limit | Q | Q |
| `4379f63ac2b2cdad` | EXP-only | $166,534 | $24,558 | $8,111 | $30,730 / $11,573 / $13,547 | Q | Q | Q | Q |
| `02f6b6c0c3190ffa` | EXP-only | $165,723 | $25,867 | $14,132 | $31,581 / $16,212 / $20,637 | Q | Q | Q | Q |

## 16. Metric ordering, basis and boundary checks (scope)

| Item | C21 | C24 |
|---|---|---|
| record DD stored in cents (all scope centres) | true | true |
| marked BD > marked DD + $0.005 | 0 | 0 |
|   of which with partial sales | 0 | 0 |
| marked BD = marked DD to the cent | 15 | 4 |
| liquidation BD > marked DD + $0.005 | 21 | 5 |
| PL liq > BD liq + 1e-6 (largest raw difference) | 0 (1.5e-11) | 0 (1.5e-11) |
| P2: verdict differs on the marked basis (liq fail / marked pass) | 9 (9) | 16 (16) |
| P3: verdict differs on the marked basis (liq fail / marked pass) | 2 (2) | 2 (2) |
| P4: verdict differs on the marked basis (liq fail / marked pass) | 0 (0) | 1 (1) |
| P5: verdict differs on the marked basis (liq fail / marked pass) | 0 (0) | 0 (0) |
| P6: verdict differs on the marked basis (liq fail / marked pass) | 9 (9) | 16 (16) |
| P7: verdict differs on the marked basis (liq fail / marked pass) | 2 (2) | 2 (2) |
| P8: verdict differs on the marked basis (liq fail / marked pass) | 0 (0) | 1 (1) |
| centres exactly at any policy limit | 0 | 0 |
| qualification instrument disagreements (cents vs unrounded p90 DD / p10) | 0 | 0 |

## 16b. Policies that differ by one gate — disagreements at every level

| Pair | C21 centres / r1 / refine / r2 / r3 rows / members | C24 centres / r1 / refine / r2 / r3 rows / members |
|---|---|---|
| P2 vs P6 | 0 / 0 / 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 / 0 / 0 |
| P3 vs P7 | 88 / 56 / 0 / 2 / 0 / 0 | 67 / 20 / 1 / 0 / 0 / 0 |
| P4 vs P8 | 141 / 85 / 0 / 2 / 0 / 0 | 87 / 28 / 1 / 0 / 0 / 0 |
| P1 vs P5 | 141 / 86 / 0 / 2 / 0 / 0 | 87 / 28 / 1 / 0 / 0 / 0 |
| P1 vs P8 | 23 / 13 / 0 / 0 / 0 / 0 | 16 / 19 / 0 / 0 / 0 / 0 |
| P3 vs P4 | 161 / 223 / 0 / 0 / 0 / 0 | 270 / 224 / 3 / 3 / 2 / 0 |
| P7 vs P8 | 214 / 252 / 0 / 0 / 0 / 0 | 290 / 232 / 3 / 3 / 2 / 0 |

## 17. Reproduction checks

| Cutoff | Checks | Passed | Failed |
|---|---|---|---|
| C21 | 116 | 116 | none |
| C24 | 116 | 116 | none |

