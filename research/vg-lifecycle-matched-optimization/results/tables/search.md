# Search coverage and counts (per arm; distinct proposals = screen + designs + island children + fillers)

| Cutoff | Lane | Arm | Screened | Designs | Island | Fillers | Proposals | Refine moves | Evaluations asked | Rung-1 centres | Rung-1 feasible | Feasible ledgers | Distinct configs | Islands run | Stop |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| C19 | indep | L0 | 4,096 | 0 | 5,376 | 0 | 9,472 | 1,916 | 101,600 | 5,888 | 3,296 | 2,955 | 7,804 | 21 | resource guard (the study cap on fresh simulations); triggers not met |
| C19 | indep | L1 | 4,096 | 0 | 5,376 | 0 | 9,472 | 1,978 | 102,589 | 5,888 | 3,491 | 3,034 | 7,866 | 21 | resource guard (the study cap on fresh simulations); triggers not met |
| C19 | indep | L2 | 4,096 | 0 | 5,376 | 0 | 9,472 | 1,931 | 103,593 | 5,888 | 3,537 | 3,145 | 7,819 | 21 | resource guard (the study cap on fresh simulations); triggers not met |
| C21 | indep | L0 | 4,096 | 0 | 5,632 | 0 | 9,728 | 2,077 | 100,913 | 6,144 | 2,643 | 2,443 | 8,221 | 22 | resource guard (the study cap on fresh simulations); triggers not met |
| C21 | indep | L1 | 4,096 | 0 | 5,632 | 0 | 9,728 | 1,843 | 99,847 | 6,144 | 2,528 | 2,352 | 7,987 | 22 | resource guard (the study cap on fresh simulations); triggers not met |
| C21 | indep | L2 | 4,096 | 0 | 5,632 | 0 | 9,728 | 2,087 | 100,491 | 6,144 | 2,706 | 2,511 | 8,231 | 22 | resource guard (the study cap on fresh simulations); triggers not met |
| C23 | indep | L0 | 4,096 | 0 | 8,192 | 0 | 12,288 | 2,114 | 92,774 | 8,704 | 1,054 | 948 | 10,817 | 32 | triggers not met |
| C23 | indep | L1 | 4,096 | 0 | 8,192 | 0 | 12,288 | 1,876 | 89,366 | 8,704 | 925 | 857 | 10,580 | 32 | triggers not met |
| C23 | indep | L2 | 4,096 | 0 | 8,192 | 0 | 12,288 | 1,994 | 95,646 | 8,704 | 1,364 | 1,245 | 10,698 | 32 | triggers not met |
| C24 | indep | L0 | 4,096 | 0 | 9,728 | 0 | 13,824 | 1,982 | 103,378 | 10,240 | 1,374 | 1,221 | 12,222 | 38 | triggers not met; extension cap reached (a trigger still fired: budget-bound, not converged) |
| C24 | indep | L1 | 4,096 | 0 | 9,728 | 0 | 13,824 | 2,044 | 99,935 | 10,240 | 1,198 | 1,096 | 12,284 | 38 | triggers not met; extension cap reached (a trigger still fired: budget-bound, not converged) |
| C24 | indep | L2 | 4,096 | 0 | 9,728 | 0 | 13,824 | 2,088 | 101,244 | 10,240 | 1,244 | 1,090 | 12,328 | 38 | triggers not met; extension cap reached (a trigger still fired: budget-bound, not converged) |
| C24 | informed | L0 | 0 | 962 | 3,072 | 0 | 4,034 | 3,048 | 91,030 | 4,034 | 2,791 | 2,607 | 6,497 | 8 | triggers not met |
| C24 | informed | L1 | 0 | 962 | 3,072 | 0 | 4,034 | 3,089 | 91,106 | 4,034 | 2,798 | 2,570 | 6,541 | 8 | triggers not met |
| C24 | informed | L2 | 0 | 962 | 3,072 | 0 | 4,034 | 2,707 | 89,903 | 4,034 | 2,820 | 2,619 | 6,159 | 8 | triggers not met |

## Synchronized extension rounds (positions whose lifecycles fired; a fired position extends in all three arms)

| Cutoff | Lane | Round | Positions | Requested before | Decision |
|---|---|---|---|---|---:|
| C19 | indep | 1 | indep/R1/V: L0+L1+L2 → +1; indep/R1/G: L0+L1+L2 → +1; indep/R1/B: none; indep/R2/V: L0+L2 → +1; indep/R2/G: L0+L1+L2 → +1; indep/R2/B: L2 → +1 | 175,808 | extend 5 position(s) × 3 lifecycles |
| C19 | indep | 2 | indep/R1/V: L0+L1 → +1; indep/R1/G: L1+L2 → +1; indep/R2/V: L0+L2 → +1; indep/R2/G: L0+L2 → +1; indep/R2/B: none | 225,136 | resource guard: 225136 requested + worst case 52224 + finishing reserve 144000 > cap 415000 |
| C21 | indep | 1 | indep/R1/V: L0+L1+L2 → +1; indep/R1/G: L0+L2 → +1; indep/R1/B: L1 → +1; indep/R2/V: L0+L1+L2 → +1; indep/R2/G: L1+L2 → +1; indep/R2/B: L1 → +1 | 158,576 | extend 6 position(s) × 3 lifecycles |
| C21 | indep | 2 | indep/R1/V: L0+L1 → +1; indep/R1/G: L0+L1+L2 → +1; indep/R1/B: L0+L1 → +1; indep/R2/V: L0 → +1; indep/R2/G: L0 → +1; indep/R2/B: none | 213,840 | resource guard: 213840 requested + worst case 65280 + finishing reserve 144000 > cap 415000 |
| C23 | indep | 1 | indep/R1/V: L0+L1+L2 → +1; indep/R1/G: none; indep/R1/B: L0+L2 → +1; indep/R2/V: L1+L2 → +1; indep/R2/G: L0+L1 → +1; indep/R2/B: L1 → +1 | 94,448 | extend 5 position(s) × 3 lifecycles |
| C23 | indep | 2 | indep/R1/V: L0+L1+L2 → +1; indep/R1/B: L0 → +1; indep/R2/V: L0+L1+L2 → +1; indep/R2/G: L0+L1 → +1; indep/R2/B: L0+L1 → +1 | 125,360 | extend 5 position(s) × 3 lifecycles |
| C23 | indep | 3 | indep/R1/V: L0+L1 → +1; indep/R1/B: L1 → +1; indep/R2/V: L1 → +1; indep/R2/G: L2 → +1; indep/R2/B: none | 157,408 | extend 4 position(s) × 3 lifecycles |
| C23 | indep | 4 | indep/R1/V: L2 → +1; indep/R1/B: L0 → +1; indep/R2/V: none; indep/R2/G: none | 180,256 | extend 2 position(s) × 3 lifecycles |
| C23 | indep | 5 | indep/R1/V: none (cap); indep/R1/B: none | 190,720 | no position extends |
| C24 | indep | 1 | indep/R1/V: none; indep/R1/G: L0+L1+L2 → +1; indep/R1/B: L1 → +1; indep/R2/V: L0+L1+L2 → +1; indep/R2/G: L0+L1+L2 → +1; indep/R2/B: L1+L2 → +1 | 91,040 | extend 5 position(s) × 3 lifecycles |
| C24 | indep | 2 | indep/R1/G: L0+L1 → +1; indep/R1/B: L0+L1 → +1; indep/R2/V: L0+L1 → +1; indep/R2/G: L0+L1 → +1; indep/R2/B: L0+L1+L2 → +1 | 120,400 | extend 5 position(s) × 3 lifecycles |
| C24 | indep | 3 | indep/R1/G: L0+L2 → +1; indep/R1/B: L2 → +1; indep/R2/V: L0 → +1; indep/R2/G: L2 → +1; indep/R2/B: none | 147,456 | extend 4 position(s) × 3 lifecycles |
| C24 | indep | 4 | indep/R1/G: L1+L2 → +1; indep/R1/B: L2 → +1; indep/R2/V: L2 → +1; indep/R2/G: L2 → +1 | 170,848 | extend 4 position(s) × 3 lifecycles |
| C24 | indep | 5 | indep/R1/G: L0+L2 (cap); indep/R1/B: L0+L1 → +1; indep/R2/V: L2 (cap); indep/R2/G: L1 (cap) | 194,416 | extend 1 position(s) × 3 lifecycles |
| C24 | indep | 6 | indep/R1/B: L2 → +1 | 200,432 | extend 1 position(s) × 3 lifecycles |
| C24 | indep | 7 | indep/R1/B: L1 → +1 | 206,672 | extend 1 position(s) × 3 lifecycles |
| C24 | indep | 8 | indep/R1/B: L1+L2 → +1 | 212,336 | extend 1 position(s) × 3 lifecycles |
| C24 | indep | 9 | indep/R1/B: L1 (cap) | 217,424 | no position extends |
| C24 | informed | 1 | informed/R1: none; informed/R2: none | 178,214 | no position extends |

## Coverage by structure (rung-1 archive per lane)

| Cutoff | Lane | Arm | Rep | Cell | Inclusion | Centres | Plausible | Feasible | Both Growth funded |
|---|---|---|---|---|---:|---|---|---|---|
| C19 | indep | L0 | R1 | V | V | 832 | 583 | 469 | 0 |
| C19 | indep | L0 | R1 | G | G | 832 | 538 | 453 | 0 |
| C19 | indep | L0 | R1 | B | B | 1,152 | 874 | 634 | 386 |
| C19 | indep | L0 | R2 | V | V | 832 | 589 | 511 | 0 |
| C19 | indep | L0 | R2 | G | G | 832 | 588 | 464 | 0 |
| C19 | indep | L0 | R2 | B | B | 1,408 | 1,044 | 765 | 445 |
| C19 | indep | L1 | R1 | V | V | 832 | 637 | 528 | 0 |
| C19 | indep | L1 | R1 | G | G | 832 | 545 | 455 | 0 |
| C19 | indep | L1 | R1 | B | B | 1,152 | 875 | 666 | 380 |
| C19 | indep | L1 | R2 | V | V | 832 | 614 | 527 | 0 |
| C19 | indep | L1 | R2 | G | G | 832 | 583 | 475 | 0 |
| C19 | indep | L1 | R2 | B | B | 1,408 | 1,089 | 840 | 415 |
| C19 | indep | L2 | R1 | V | V | 832 | 655 | 563 | 0 |
| C19 | indep | L2 | R1 | G | G | 832 | 534 | 450 | 0 |
| C19 | indep | L2 | R1 | B | B | 1,152 | 887 | 646 | 453 |
| C19 | indep | L2 | R2 | V | V | 832 | 646 | 559 | 0 |
| C19 | indep | L2 | R2 | G | G | 832 | 568 | 471 | 0 |
| C19 | indep | L2 | R2 | B | B | 1,408 | 1,118 | 848 | 478 |
| C21 | indep | L0 | R1 | V | V | 832 | 614 | 444 | 0 |
| C21 | indep | L0 | R1 | G | G | 832 | 512 | 309 | 0 |
| C21 | indep | L0 | R1 | B | B | 1,408 | 901 | 527 | 610 |
| C21 | indep | L0 | R2 | V | V | 832 | 661 | 493 | 0 |
| C21 | indep | L0 | R2 | G | G | 832 | 485 | 322 | 0 |
| C21 | indep | L0 | R2 | B | B | 1,408 | 946 | 548 | 490 |
| C21 | indep | L1 | R1 | V | V | 832 | 611 | 437 | 0 |
| C21 | indep | L1 | R1 | G | G | 832 | 477 | 309 | 0 |
| C21 | indep | L1 | R1 | B | B | 1,408 | 916 | 498 | 545 |
| C21 | indep | L1 | R2 | V | V | 832 | 636 | 474 | 0 |
| C21 | indep | L1 | R2 | G | G | 832 | 468 | 312 | 0 |
| C21 | indep | L1 | R2 | B | B | 1,408 | 910 | 498 | 587 |
| C21 | indep | L2 | R1 | V | V | 832 | 636 | 492 | 0 |
| C21 | indep | L2 | R1 | G | G | 832 | 487 | 340 | 0 |
| C21 | indep | L2 | R1 | B | B | 1,408 | 937 | 571 | 702 |
| C21 | indep | L2 | R2 | V | V | 832 | 630 | 460 | 0 |
| C21 | indep | L2 | R2 | G | G | 832 | 448 | 265 | 0 |
| C21 | indep | L2 | R2 | B | B | 1,408 | 938 | 578 | 587 |
| C23 | indep | L0 | R1 | V | V | 1,600 | 712 | 262 | 0 |
| C23 | indep | L0 | R1 | G | G | 576 | 186 | 75 | 0 |
| C23 | indep | L0 | R1 | B | B | 2,176 | 716 | 109 | 770 |
| C23 | indep | L0 | R2 | V | V | 1,344 | 532 | 119 | 0 |
| C23 | indep | L0 | R2 | G | G | 1,344 | 501 | 253 | 0 |
| C23 | indep | L0 | R2 | B | B | 1,664 | 715 | 236 | 617 |
| C23 | indep | L1 | R1 | V | V | 1,600 | 678 | 204 | 0 |
| C23 | indep | L1 | R1 | G | G | 576 | 171 | 34 | 0 |
| C23 | indep | L1 | R1 | B | B | 2,176 | 662 | 95 | 790 |
| C23 | indep | L1 | R2 | V | V | 1,344 | 559 | 214 | 0 |
| C23 | indep | L1 | R2 | G | G | 1,344 | 520 | 210 | 0 |
| C23 | indep | L1 | R2 | B | B | 1,664 | 680 | 168 | 624 |
| C23 | indep | L2 | R1 | V | V | 1,600 | 738 | 207 | 0 |
| C23 | indep | L2 | R1 | G | G | 576 | 212 | 100 | 0 |
| C23 | indep | L2 | R1 | B | B | 2,176 | 778 | 197 | 820 |
| C23 | indep | L2 | R2 | V | V | 1,344 | 629 | 251 | 0 |
| C23 | indep | L2 | R2 | G | G | 1,344 | 627 | 408 | 0 |
| C23 | indep | L2 | R2 | B | B | 1,664 | 672 | 201 | 681 |
| C24 | indep | L0 | R1 | V | V | 576 | 217 | 55 | 0 |
| C24 | indep | L0 | R1 | G | G | 1,600 | 669 | 323 | 0 |
| C24 | indep | L0 | R1 | B | B | 3,200 | 1,294 | 406 | 1,321 |
| C24 | indep | L0 | R2 | V | V | 1,600 | 814 | 324 | 0 |
| C24 | indep | L0 | R2 | G | G | 1,600 | 521 | 165 | 0 |
| C24 | indep | L0 | R2 | B | B | 1,664 | 506 | 101 | 786 |
| C24 | indep | L1 | R1 | V | V | 576 | 238 | 76 | 0 |
| C24 | indep | L1 | R1 | G | G | 1,600 | 674 | 254 | 0 |
| C24 | indep | L1 | R1 | B | B | 3,200 | 1,190 | 315 | 1,248 |
| C24 | indep | L1 | R2 | V | V | 1,600 | 748 | 271 | 0 |
| C24 | indep | L1 | R2 | G | G | 1,600 | 484 | 130 | 0 |
| C24 | indep | L1 | R2 | B | B | 1,664 | 481 | 152 | 687 |
| C24 | indep | L2 | R1 | V | V | 576 | 264 | 110 | 0 |
| C24 | indep | L2 | R1 | G | G | 1,600 | 605 | 244 | 0 |
| C24 | indep | L2 | R1 | B | B | 3,200 | 1,169 | 277 | 1,310 |
| C24 | indep | L2 | R2 | V | V | 1,600 | 830 | 321 | 0 |
| C24 | indep | L2 | R2 | G | G | 1,600 | 495 | 146 | 0 |
| C24 | indep | L2 | R2 | B | B | 1,664 | 470 | 146 | 730 |
| C24 | informed | L0 | R1 | informed | V | 1,482 | 1,373 | 1,205 | 0 |
| C24 | informed | L0 | R1 | informed | G | 97 | 49 | 22 | 0 |
| C24 | informed | L0 | R1 | informed | B | 438 | 321 | 173 | 346 |
| C24 | informed | L0 | R2 | informed | V | 1,465 | 1,372 | 1,207 | 0 |
| C24 | informed | L0 | R2 | informed | G | 98 | 50 | 19 | 0 |
| C24 | informed | L0 | R2 | informed | B | 454 | 323 | 165 | 358 |
| C24 | informed | L1 | R1 | informed | V | 1,477 | 1,384 | 1,227 | 0 |
| C24 | informed | L1 | R1 | informed | G | 104 | 43 | 19 | 0 |
| C24 | informed | L1 | R1 | informed | B | 436 | 293 | 148 | 361 |
| C24 | informed | L1 | R2 | informed | V | 1,486 | 1,375 | 1,201 | 0 |
| C24 | informed | L1 | R2 | informed | G | 98 | 45 | 16 | 0 |
| C24 | informed | L1 | R2 | informed | B | 433 | 308 | 187 | 344 |
| C24 | informed | L2 | R1 | informed | V | 1,448 | 1,346 | 1,182 | 0 |
| C24 | informed | L2 | R1 | informed | G | 109 | 48 | 17 | 0 |
| C24 | informed | L2 | R1 | informed | B | 460 | 313 | 178 | 377 |
| C24 | informed | L2 | R2 | informed | V | 1,463 | 1,355 | 1,212 | 0 |
| C24 | informed | L2 | R2 | informed | G | 109 | 52 | 23 | 0 |
| C24 | informed | L2 | R2 | informed | B | 445 | 332 | 208 | 393 |
