# Robustness tables

Shortlist 20 configurations plus B1, B4, B5; passing every gate: 0; nominees: none.

## Training figures (fixed $100,000, 5 bps unless stated)

| Config | Books | Members | Net@5 | Net@0 / @2 / @10 | Minute DD $ (% of $100k) | Daily DD $ | Net ÷ DD | Lots | Folds F1 / F2 / F3 | Top-2 lots share | Best regime (share) | P50 joint | Probe median | Score S |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B1 | 1 | VGT | $135,359 | $137,223 / $136,477 / $133,497 | $19,534 (19.5%) | $15,817 | 6.93 | 17 | $35,961 / $77,253 / $22,145 | 52.8% | R8 (34.7%) | $94,519 | $127,975 | $101,519 |
| B4 | 4 | VGT XBI XRT KRE | $242,196 | $249,174 / $246,625 / $233,867 | $28,659 (28.7%) | $25,268 | 8.45 | 71 | $35,961 / $93,461 / $112,774 | 29.5% | R8 (25.9%) | $139,520 | $235,796 | $134,520 |
| B5 | 5 | VGT XBI XRT KRE GDX | $388,489 | $396,715 / $393,667 / $379,867 | $26,510 (26.5%) | $23,789 | 14.65 | 82 | $35,961 / $181,583 / $170,945 | 16.7% | R7 (23.3%) | $215,130 | $382,817 | $205,130 |
| R1 (refined c1) | 4 | XBI XRT KRE GDX | $467,806 | $475,605 / $472,485 / $408,166 | $21,626 (21.6%) | $19,045 | 21.63 | 73 | $22,971 / $267,265 / $177,570 | 19.1% | R8 (21.8%) | $246,610 | $456,981 | $240,110 |
| R2 (refined c2) | 9 | XBI XRT KRE GDX IWM IWN TLT VOOG XOP | $288,741 | $293,958 / $291,840 / $253,169 | $33,210 (33.2%) | $31,062 | 8.69 | 50 | $56,663 / $134,017 / $98,061 | 24.0% | R9 (23.9%) | $57,938 | $287,326 | $29,438 |
| R3 (refined c3) | 6 | VGT XBI XRT KRE GDX XLY | $418,267 | $426,896 / $423,638 / $392,696 | $26,453 (26.5%) | $23,732 | 15.81 | 87 | $38,377 / $221,836 / $158,054 | 15.6% | R7 (21.6%) | $216,122 | $413,139 | $201,122 |
| R4 (refined c4) | 4 | XBI KRE GDX XLF | $371,690 | $375,699 / $376,789 / $363,199 | $21,691 (21.7%) | $19,110 | 17.14 | 81 | $22,906 / $195,937 / $152,846 | 17.5% | R7 (26.2%) | $249,932 | $369,198 | $243,432 |
| R5 (refined c5) | 5 | XBI XRT GDX IWN XLY | $398,276 | $343,146 / $342,685 / $341,511 | $17,281 (17.3%) | $14,714 | 23.05 | 45 | $11,426 / $250,372 / $136,478 | 22.7% | R7 (26.6%) | $223,078 | $394,937 | $211,578 |
| R6 (refined c6) | 4 | VGT XBI XRT GDX | $357,251 | $361,083 / $359,573 / $301,049 | $20,652 (20.7%) | $19,052 | 17.30 | 44 | $3,881 / $235,843 / $117,527 | 25.3% | R7 (27.2%) | $225,454 | $354,787 | $218,954 |
| C1 (contender c1) | 4 | XBI XRT KRE GDX | $442,365 | $448,491 / $445,022 / $381,763 | $22,563 (22.6%) | $21,294 | 19.61 | 82 | $22,971 / $253,865 / $165,528 | 20.2% | R7 (22.1%) | $234,322 | $435,221 | $227,822 |
| C2 (contender c2) | 10 | XBI XRT GDX IWM IWN VOOG XLE XLF XLY XOP | $194,230 | $225,878 / $214,205 / $172,758 | $32,956 (33.0%) | $30,349 | 5.89 | 50 | $52,825 / $101,512 / $39,893 | 32.2% | R9 (25.8%) | $73,511 | $194,230 | $38,511 |
| C3 (contender c3) | 5 | VGT XBI KRE GDX GLD | $375,362 | $383,372 / $380,410 / $366,954 | $26,510 (26.5%) | $23,789 | 14.16 | 80 | $35,961 / $181,596 / $157,804 | 17.3% | R7 (24.1%) | $224,155 | $373,062 | $214,155 |
| C4 (contender c4) | 5 | XBI KRE GDX VOOG XLF | $350,580 | $358,724 / $355,697 / $342,010 | $21,716 (21.7%) | $19,136 | 16.14 | 82 | $22,881 / $191,177 / $136,523 | 18.5% | R7 (27.7%) | $199,657 | $349,351 | $188,157 |
| C5 (contender c5) | 5 | XBI XRT GDX GLD IWN | $343,020 | $346,966 / $345,264 / $284,113 | $17,281 (17.3%) | $13,273 | 19.85 | 49 | −$655 / $228,448 / $115,227 | 26.1% | R7 (29.3%) | $206,489 | $341,459 | $193,489 |
| C6 (contender c6) | 5 | XBI XRT GDX TLT XLU | $337,679 | $342,037 / $340,536 / $283,242 | $17,647 (17.6%) | $13,657 | 19.14 | 44 | $0 / $233,868 / $103,811 | 26.5% | R7 (28.4%) | $212,069 | $337,679 | $197,569 |
| A1 (archive) | 4 | VGT KRE GDX XLU | $330,951 | $338,616 / $335,549 / $325,659 | $26,453 (26.5%) | $23,732 | 12.51 | 73 | $36,504 / $174,971 / $119,477 | 19.7% | R7 (27.5%) | $166,833 | $329,588 | $161,833 |
| A2 (archive) | 5 | XBI XRT GDX IWM XLF | $327,939 | $332,690 / $331,032 / $275,531 | $22,623 (22.6%) | $18,633 | 14.50 | 48 | $16,905 / $212,199 / $98,835 | 27.3% | R7 (31.0%) | $159,134 | $326,863 | $147,634 |
| A3 (archive) | 6 | XRT KRE GDX GLD XLF XLY | $329,038 | $336,409 / $333,265 / $269,333 | $23,642 (23.6%) | $21,692 | 13.92 | 75 | $18,268 / $214,223 / $96,546 | 27.2% | R7 (27.5%) | $239,227 | $329,038 | $222,727 |
| A4 (archive) | 3 | KRE GDX XLY | $303,338 | $311,370 / $308,156 / $295,315 | $31,566 (31.6%) | $29,795 | 9.61 | 77 | $22,585 / $177,290 / $103,463 | 21.4% | R7 (35.7%) | $195,285 | $299,935 | $192,285 |
| A5 (archive) | 5 | XBI XRT KRE GLD XLU | $304,459 | $313,588 / $310,178 / $241,242 | $25,959 (26.0%) | $22,700 | 11.73 | 92 | $22,971 / $172,510 / $108,978 | 23.6% | R8 (26.7%) | $151,786 | $304,459 | $140,286 |
| A6 (archive) | 3 | KRE GDX IWN | $289,537 | $296,853 / $293,926 / $282,229 | $34,134 (34.1%) | $32,184 | 8.48 | 70 | $22,971 / $180,043 / $86,523 | 22.4% | R7 (33.8%) | $176,308 | $288,281 | $173,308 |
| A7 (archive) | 3 | KRE GDX TLT | $280,127 | $287,633 / $284,629 / $272,628 | $34,134 (34.1%) | $32,184 | 8.21 | 72 | $22,971 / $170,632 / $86,523 | 23.2% | R7 (34.9%) | $190,334 | $279,934 | $187,334 |
| A8 (archive) | 3 | KRE GDX IWM | $280,127 | $287,633 / $284,629 / $272,628 | $34,134 (34.1%) | $32,184 | 8.21 | 72 | $22,971 / $170,632 / $86,523 | 23.2% | R7 (34.9%) | $188,209 | $278,542 | $185,209 |

## Portfolio (20%, 5 bps, training) and matched borrowing

| Config | Ending equity | Max % DD daily / minute | Daily DD $ | Borrowing $-days | B5 ladder at the same $-days | Extrapolated |
|---|---:|---:|---:|---:|---:|---:|
| B1 | $1,375,791 | 32.78% / 35.21% | $438,428 | 127.7M | $1,666,390 | no |
| B4 | $1,677,751 | 34.65% / 37.01% | $377,015 | 209.8M | $2,012,675 | no |
| B5 | $2,270,264 | 29.67% / 31.09% | $448,132 | 271.2M | $2,270,264 | no |
| R1 (refined c1) | $2,645,257 | 29.01% / 30.33% | $533,382 | 257.4M | $2,212,085 | no |
| R2 (refined c2) | $1,816,738 | 35.03% / 37.37% | $498,953 | 381.7M | $2,728,491 | no |
| R3 (refined c3) | $2,419,309 | 29.66% / 31.08% | $492,056 | 248.6M | $2,175,308 | no |
| R4 (refined c4) | $2,229,808 | 29.01% / 30.42% | $464,109 | 195.7M | $1,953,906 | no |
| R5 (refined c5) | $2,303,739 | 27.21% / 28.54% | $501,289 | 210.2M | $2,014,529 | no |
| R6 (refined c6) | $2,136,957 | 28.79% / 30.79% | $508,877 | 209.6M | $2,011,885 | no |
| C1 (contender c1) | $2,517,990 | 29.01% / 30.32% | $541,801 | 241.1M | $2,144,020 | no |
| C2 (contender c2) | $1,525,123 | 35.13% / 37.47% | $497,537 | 349.7M | $2,596,006 | no |
| C3 (contender c3) | $2,217,128 | 29.67% / 31.09% | $448,108 | 254.2M | $2,199,066 | no |
| C4 (contender c4) | $2,135,702 | 29.01% / 30.89% | $489,535 | 191.4M | $1,935,869 | no |
| C5 (contender c5) | $2,080,201 | 28.11% / 30.13% | $487,058 | 174.7M | $1,865,315 | no |
| C6 (contender c6) | $2,060,677 | 29.85% / 31.82% | $522,504 | 188.0M | $1,921,642 | no |
| A1 (archive) | $2,051,604 | 31.17% / 33.61% | $524,442 | 204.6M | $1,991,120 | no |
| A2 (archive) | $2,012,753 | 30.65% / 32.60% | $530,064 | 193.6M | $1,944,938 | no |
| A3 (archive) | $2,044,519 | 34.09% / 36.51% | $597,852 | 208.9M | $2,008,856 | no |
| A4 (archive) | $1,946,616 | 35.48% / 37.30% | $587,519 | 183.2M | $1,901,124 | no |
| A5 (archive) | $1,936,029 | 34.33% / 36.02% | $450,929 | 185.6M | $1,911,431 | no |
| A6 (archive) | $1,903,255 | 35.30% / 37.19% | $587,580 | 171.0M | $1,849,508 | no |
| A7 (archive) | $1,867,516 | 35.30% / 37.19% | $576,546 | 167.1M | $1,832,952 | no |
| A8 (archive) | $1,867,516 | 35.30% / 37.19% | $576,546 | 167.1M | $1,832,952 | no |

## Gates (T0–T9) and the score

| Config | T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 | Passed | Conditional band |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | no | yes |
| B4 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | no | yes |
| B5 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | no | no |
| R1 (refined c1) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | no | no |
| R2 (refined c2) | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | no | yes |
| R3 (refined c3) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | no | no |
| R4 (refined c4) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | no | no |
| R5 (refined c5) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | no | no |
| R6 (refined c6) | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | no | no |
| C1 (contender c1) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | no | no |
| C2 (contender c2) | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | no | yes |
| C3 (contender c3) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | no | no |
| C4 (contender c4) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | no | no |
| C5 (contender c5) | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | no | no |
| C6 (contender c6) | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | no | no |
| A1 (archive) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | no | yes |
| A2 (archive) | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | no | yes |
| A3 (archive) | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | no | yes |
| A4 (archive) | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | no | yes |
| A5 (archive) | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | no | yes |
| A6 (archive) | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | no | yes |
| A7 (archive) | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | no | yes |
| A8 (archive) | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | no | yes |

## Exclusions, ties and plateau

| Config | Smallest member marginal (symbol) | Largest member share | Probe feasible / median ÷ net | Joint feasible / P50 ÷ net / P10 | Contested ties | Tie-order max |Δnet| |
|---|---:|---:|---:|---:|---:|---:|
| B1 | +$135,359 (VGT) | 100.0% | 100.0% / 94.5% | 100.0% / 69.8% / $62,308 | 0 | $0 |
| B4 | −$6,827 (VGT) | 23.2% | 94.0% / 97.4% | 41.7% / 57.6% / $106,613 | 1 | $5,506 |
| B5 | +$13,128 (XRT) | 37.7% | 99.3% / 98.5% | 25.0% / 55.4% / $129,287 | 0 | $0 |
| R1 (refined c1) | +$92,708 (XBI) | 33.2% | 97.4% / 97.7% | 39.6% / 52.7% / $187,011 | 1 | $7,224 |
| R2 (refined c2) | +$5,294 (TLT) | 88.6% | 80.0% / 99.5% | 0.0% / 20.1% / −$4,012 | 0 | $0 |
| R3 (refined c3) | +$12,200 (XLY) | 40.5% | 93.5% / 98.8% | 22.9% / 51.7% / $166,361 | 0 | $0 |
| R4 (refined c4) | +$20,374 (XLF) | 59.3% | 99.1% / 99.3% | 50.0% / 67.2% / $192,265 | 0 | $0 |
| R5 (refined c5) | +$39,107 (IWN) | 39.9% | 99.3% / 99.2% | 72.9% / 56.0% / $166,450 | 1 | $61,947 |
| R6 (refined c6) | +$12,713 (VGT) | 47.4% | 97.4% / 99.3% | 72.9% / 63.1% / $181,437 | 0 | $0 |
| C1 (contender c1) | +$93,077 (XBI) | 34.9% | 97.4% / 98.4% | 37.5% / 53.0% / $167,073 | 1 | $7,224 |
| C2 (contender c2) | −$9,153 (XBI) | 70.1% | 83.5% / 100.0% | 0.0% / 37.8% / −$23,118 | 0 | $0 |
| C3 (contender c3) | +$0 (GLD) | 37.6% | 99.3% / 99.4% | 33.3% / 59.7% / $131,253 | 0 | $0 |
| C4 (contender c4) | −$12,107 (VOOG) | 60.1% | 100.0% / 99.6% | 47.9% / 57.0% / $153,444 | 0 | $0 |
| C5 (contender c5) | +$6,435 (IWN) | 42.3% | 100.0% / 99.5% | 77.1% / 60.2% / $150,613 | 0 | $0 |
| C6 (contender c6) | +$0 (TLT) | 40.8% | 100.0% / 100.0% | 70.8% / 62.8% / $147,907 | 0 | $0 |
| A1 (archive) | +$0 (XLU) | 48.8% | 97.5% / 99.6% | 16.7% / 50.4% / $106,552 | 1 | $186,555 |
| A2 (archive) | −$6,203 (IWM) | 39.3% | 98.6% / 99.7% | 68.8% / 48.5% / $99,108 | 0 | $0 |
| A3 (archive) | −$26,264 (XLF) | 33.3% | 99.4% / 100.0% | 91.7% / 72.7% / $193,889 | 3 | $45,464 |
| A4 (archive) | +$37,517 (XLY) | 39.9% | 93.0% / 98.9% | 27.1% / 64.4% / $138,984 | 0 | $0 |
| A5 (archive) | +$0 (GLD) | 40.4% | 95.2% / 100.0% | 43.8% / 49.9% / $109,275 | 1 | $5,506 |
| A6 (archive) | +$9,411 (IWN) | 82.4% | 86.2% / 99.6% | 4.2% / 60.9% / $131,129 | 0 | $0 |
| A7 (archive) | +$0 (TLT) | 49.0% | 86.5% / 99.9% | 12.5% / 67.9% / $125,055 | 0 | $0 |
| A8 (archive) | +$0 (IWM) | 46.5% | 85.7% / 99.4% | 12.5% / 67.2% / $128,834 | 0 | $0 |

## Phenotypes of the shortlisted configurations

**B1** (`VGT:d1-ebc9f639b3`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| VGT | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | 17 | $135,359 |

**B4** (`KRE:d1-a389037400|VGT:d1-ebc9f639b3|XBI:d1-0aabdaab89|XRT:d1-15c387627c`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| VGT | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | 11 | $123,289 |
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | 17 | $40,341 |
| XRT | X 24.4% Y 4.7% L 48 stop 8.0% hold 17 buffer 3.6% P 6.2% W 120 | 5 | $15,788 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 38 | $62,779 |

**B5** (`GDX:d1-51ea8d4bd6|KRE:d1-a389037400|VGT:d1-ebc9f639b3|XBI:d1-0aabdaab89|XRT:d1-15c387627c`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| VGT | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | 9 | $66,868 |
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | 16 | $53,064 |
| XRT | X 24.4% Y 4.7% L 48 stop 8.0% hold 17 buffer 3.6% P 6.2% W 120 | 3 | $13,602 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 45 | $105,400 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 81 | 9 | $149,556 |

**R1 (refined c1)** (`GDX:d1-e7461ea563|KRE:d1-a389037400|XBI:d1-43a297e3fd|XRT:d1-752c561fac`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 28.0% Y 0.2% L 44 stop 3.1% hold 5 buffer 0.1% P 6.4% W 59 | 17 | $56,848 |
| XRT | X 24.4% Y 4.7% L 56 stop 8.0% hold 17 buffer 3.6% P 4.9% W 121 | 7 | $101,284 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 39 | $159,908 |
| GDX | X 27.4% Y 0.2% L 100 stop 7.1% hold 18 buffer 0.1% P 19.1% W 73 | 10 | $149,765 |

**R2 (refined c2)** (`GDX:d1-1e3fde9882|IWM:d1-c5ee7e095d|IWN:d1-4f3f7c7807|KRE:d1-63f3b98a87|TLT:d1-9e125f0965|VOOG:d1-69db468dd7|XBI:d1-9637eb9a46|XOP:d1-5eb23fed75|XRT:d1-945886f270`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 27.3% Y 2.0% L 72 stop 4.5% hold 23 buffer 2.5% P 8.2% W 23 | 6 | $14,499 |
| XRT | X 12.8% Y 3.2% L 146 stop 6.3% hold 23 buffer 4.9% P 17.9% W 73 | 3 | $22,024 |
| KRE | X 19.1% Y 2.2% L 61 stop 8.2% hold 15 buffer 2.6% P 5.9% W 18 | 5 | $71,234 |
| GDX | X 21.0% Y 3.0% L 212 stop 4.3% hold 27 buffer 2.9% P 5.7% W 85 | 7 | $16,448 |
| IWM | X 12.9% Y 0.4% L 66 stop 14.1% hold 20 buffer 2.6% P 18.3% W 99 | 2 | −$7,069 |
| IWN | X 20.3% Y 0.2% L 144 stop 6.7% hold 10 buffer 0.0% P 5.6% W 31 | 4 | $13,021 |
| TLT | X 14.4% Y 2.6% L 96 stop 6.8% hold 7 buffer 0.4% P 16.5% W 187 | 3 | −$2,343 |
| VOOG | X 20.7% Y 0.2% L 81 stop 7.9% hold 13 buffer 5.3% P 4.6% W 172 | 4 | $53,109 |
| XOP | X 17.7% Y 0.4% L 245 stop 11.7% hold 19 buffer 4.0% P 8.4% W 62 | 16 | $107,819 |

**R3 (refined c3)** (`GDX:d1-9410c142a8|KRE:d1-a389037400|VGT:d1-9b7073f066|XBI:d1-0aabdaab89|XLY:d1-1ca91e1d21|XRT:d1-35c7b1ca6f`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| VGT | X 21.6% Y 0.3% L 74 stop 6.8% hold 8 buffer 2.4% P 9.0% W 60 | 7 | $50,590 |
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | 18 | $56,186 |
| XRT | X 14.3% Y 4.7% L 23 stop 3.8% hold 11 buffer 5.8% P 18.6% W 18 | 4 | $19,564 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 47 | $139,916 |
| GDX | X 27.4% Y 0.2% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 73 | 9 | $150,194 |
| XLY | X 15.7% Y 4.9% L 34 stop 4.5% hold 17 buffer 0.0% P 3.6% W 60 | 2 | $1,816 |

**R4 (refined c4)** (`GDX:d1-c0909c54a6|KRE:d1-a389037400|XBI:d1-e080f1a385|XLF:d1-d731d5c68f`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 71 | 18 | $56,186 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 49 | $162,887 |
| GDX | X 27.4% Y 0.2% L 100 stop 7.1% hold 18 buffer 0.1% P 19.1% W 93 | 10 | $149,765 |
| XLF | X 21.9% Y 3.8% L 151 stop 6.3% hold 17 buffer 0.9% P 7.3% W 87 | 4 | $2,851 |

**R5 (refined c5)** (`GDX:d1-cb43f1ba8c|IWN:d1-52a36c292f|XBI:d1-0aabdaab89|XLY:d1-3a35597b2f|XRT:d1-7dbcbc319b`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | 17 | $80,463 |
| XRT | X 24.4% Y 4.7% L 56 stop 8.0% hold 17 buffer 3.6% P 5.9% W 121 | 7 | $74,389 |
| GDX | X 27.4% Y 0.4% L 100 stop 6.6% hold 16 buffer 0.1% P 19.1% W 81 | 12 | $171,189 |
| IWN | X 22.8% Y 5.0% L 72 stop 3.9% hold 8 buffer 3.4% P 3.4% W 175 | 5 | $40,446 |
| XLY | X 29.3% Y 1.9% L 115 stop 7.3% hold 13 buffer 0.0% P 3.8% W 56 | 4 | $31,790 |

**R6 (refined c6)** (`GDX:d1-1b48c83656|VGT:d1-c0414ee219|XBI:d1-0aabdaab89|XRT:d1-a660de01bb`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| VGT | X 29.6% Y 3.6% L 131 stop 13.8% hold 29 buffer 2.6% P 19.4% W 144 | 1 | −$41 |
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | 19 | $83,766 |
| XRT | X 23.4% Y 4.7% L 48 stop 8.0% hold 17 buffer 3.6% P 5.9% W 120 | 11 | $104,260 |
| GDX | X 27.4% Y 0.4% L 100 stop 6.6% hold 18 buffer 0.1% P 19.1% W 81 | 13 | $169,264 |

**C1 (contender c1)** (`GDX:d1-79c9ab5ab2|KRE:d1-a389037400|XBI:d1-12d4305263|XRT:d1-7dbcbc319b`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 30.0% Y 0.3% L 49 stop 3.1% hold 5 buffer 0.1% P 6.4% W 59 | 18 | $53,632 |
| XRT | X 24.4% Y 4.7% L 56 stop 8.0% hold 17 buffer 3.6% P 5.9% W 121 | 6 | $86,914 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 48 | $156,064 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 73 | 10 | $145,755 |

**C2 (contender c2)** (`GDX:d1-0c5beb3820|IWM:d1-21cca62b23|IWN:d1-8f0a6e44b1|VOOG:d1-f04985ec61|XBI:d1-b1d923805a|XLE:d1-5b2afb40c4|XLF:d1-0d6abad700|XLY:d1-0574fdba9d|XOP:d1-edabf5bca1|XRT:d1-f9902b0bd0`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 26.8% Y 2.0% L 72 stop 6.0% hold 22 buffer 3.5% P 8.2% W 23 | 2 | $6,160 |
| XRT | X 12.8% Y 3.5% L 146 stop 6.3% hold 22 buffer 4.9% P 17.9% W 73 | 2 | $23,423 |
| GDX | X 22.0% Y 3.0% L 212 stop 4.3% hold 28 buffer 2.9% P 5.7% W 85 | 8 | $15,068 |
| IWM | X 12.9% Y 0.5% L 66 stop 14.1% hold 20 buffer 2.6% P 18.3% W 99 | 4 | −$8,526 |
| IWN | X 19.8% Y 0.4% L 149 stop 6.7% hold 12 buffer 0.6% P 5.6% W 31 | 6 | $13,193 |
| VOOG | X 20.2% Y 0.9% L 81 stop 7.9% hold 13 buffer 5.3% P 4.1% W 172 | 5 | $49,852 |
| XLE | X 28.1% Y 1.8% L 138 stop 4.1% hold 26 buffer 1.4% P 11.7% W 135 | 3 | $8,405 |
| XLF | X 24.4% Y 4.1% L 180 stop 4.7% hold 29 buffer 5.1% P 10.6% W 48 | 1 | $21,425 |
| XLY | X 18.2% Y 4.1% L 147 stop 14.8% hold 28 buffer 5.5% P 7.0% W 35 | 1 | −$1,743 |
| XOP | X 17.7% Y 0.4% L 245 stop 11.7% hold 19 buffer 4.0% P 6.4% W 62 | 18 | $66,972 |

**C3 (contender c3)** (`GDX:d1-79c9ab5ab2|GLD:d1-7637682fc0|KRE:d1-a389037400|VGT:d1-ebc9f639b3|XBI:d1-0aabdaab89`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| VGT | X 21.6% Y 0.3% L 74 stop 7.3% hold 8 buffer 2.9% P 9.0% W 60 | 9 | $66,868 |
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | 16 | $53,064 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 46 | $105,874 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 73 | 9 | $149,556 |
| GLD | X 28.7% Y 0.3% L 116 stop 8.7% hold 10 buffer 0.1% P 14.7% W 118 | 0 | $0 |

**C4 (contender c4)** (`GDX:d1-f68c7efd75|KRE:d1-a389037400|VOOG:d1-a40e9c8ff4|XBI:d1-e080f1a385|XLF:d1-7f69e491e8`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 71 | 17 | $46,947 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 50 | $161,021 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 93 | 10 | $145,755 |
| VOOG | X 29.3% Y 4.3% L 158 stop 8.0% hold 7 buffer 3.0% P 9.3% W 183 | 1 | −$2,867 |
| XLF | X 21.9% Y 3.9% L 151 stop 6.3% hold 15 buffer 0.9% P 7.3% W 87 | 4 | −$274 |

**C5 (contender c5)** (`GDX:d1-51ea8d4bd6|GLD:d1-1c8437503e|IWN:d1-e3fb3bb21b|XBI:d1-0aabdaab89|XRT:d1-7dbcbc319b`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | 21 | $85,120 |
| XRT | X 24.4% Y 4.7% L 56 stop 8.0% hold 17 buffer 3.6% P 5.9% W 121 | 8 | $86,773 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 81 | 10 | $160,446 |
| GLD | X 14.4% Y 0.3% L 116 stop 8.7% hold 10 buffer 3.1% P 14.7% W 153 | 5 | −$7,881 |
| IWN | X 22.8% Y 5.0% L 62 stop 4.4% hold 5 buffer 3.4% P 3.4% W 175 | 5 | $18,562 |

**C6 (contender c6)** (`GDX:d1-51ea8d4bd6|TLT:d1-0ed186b267|XBI:d1-0aabdaab89|XLU:d1-928d8ec4bc|XRT:d1-6ec17b2d88`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | 20 | $81,552 |
| XRT | X 24.4% Y 4.7% L 48 stop 8.0% hold 17 buffer 3.6% P 5.9% W 120 | 9 | $100,379 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 81 | 15 | $155,748 |
| TLT | X 29.2% Y 2.0% L 76 stop 5.2% hold 30 buffer 3.5% P 12.1% W 18 | 0 | $0 |
| XLU | X 28.5% Y 4.6% L 127 stop 4.8% hold 20 buffer 1.5% P 9.0% W 98 | 0 | $0 |

**A1 (archive)** (`GDX:d1-9410c142a8|KRE:d1-a389037400|VGT:d1-58fe46b7e2|XLU:d1-5afff0e0e3`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| VGT | X 21.6% Y 0.3% L 74 stop 6.8% hold 8 buffer 2.9% P 9.0% W 60 | 9 | $51,821 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 55 | $128,935 |
| GDX | X 27.4% Y 0.2% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 73 | 9 | $150,194 |
| XLU | X 25.8% Y 0.9% L 190 stop 14.9% hold 14 buffer 1.4% P 5.5% W 145 | 0 | $0 |

**A2 (archive)** (`GDX:d1-12346ca2a0|IWM:d1-ee8bcababa|XBI:d1-4662574c26|XLF:d1-4bae68e429|XRT:d1-88c59a3426`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.9% W 71 | 17 | $58,954 |
| XRT | X 24.4% Y 4.7% L 56 stop 8.0% hold 16 buffer 3.1% P 5.9% W 115 | 8 | $85,832 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 78 | 15 | $144,158 |
| IWM | X 24.2% Y 0.5% L 64 stop 3.2% hold 10 buffer 3.5% P 6.2% W 29 | 8 | $38,994 |
| XLF | X 28.4% Y 2.4% L 29 stop 8.8% hold 3 buffer 3.0% P 13.6% W 39 | 0 | $0 |

**A3 (archive)** (`GDX:d1-8ebfa17ed1|GLD:d1-493321ff75|KRE:d1-a389037400|XLF:d1-f23d3ab6b8|XLY:d1-223e802426|XRT:d1-0ca45a8ca6`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XRT | X 23.3% Y 4.7% L 48 stop 8.0% hold 15 buffer 3.1% P 5.9% W 115 | 7 | $59,775 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 38 | $93,884 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 92 | 12 | $128,996 |
| GLD | X 12.1% Y 0.2% L 27 stop 3.6% hold 7 buffer 5.7% P 6.3% W 71 | 0 | $0 |
| XLF | X 25.3% Y 0.4% L 243 stop 3.1% hold 5 buffer 0.0% P 13.3% W 191 | 16 | $42,047 |
| XLY | X 27.7% Y 1.9% L 72 stop 3.0% hold 12 buffer 0.7% P 19.1% W 57 | 2 | $4,336 |

**A4 (archive)** (`GDX:d1-8ebfa17ed1|KRE:d1-2210b13389|XLY:d1-bed79f8e21`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.1% W 60 | 50 | $139,835 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 92 | 14 | $119,429 |
| XLY | X 21.3% Y 3.5% L 112 stop 3.1% hold 12 buffer 0.4% P 8.7% W 146 | 13 | $44,074 |

**A5 (archive)** (`GLD:d1-be2b0a1fef|KRE:d1-a389037400|XBI:d1-0aabdaab89|XLU:d1-928d8ec4bc|XRT:d1-7dbcbc319b`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| XBI | X 30.0% Y 1.2% L 49 stop 3.1% hold 5 buffer 0.1% P 8.2% W 54 | 19 | $60,446 |
| XRT | X 24.4% Y 4.7% L 56 stop 8.0% hold 17 buffer 3.6% P 5.9% W 121 | 9 | $79,451 |
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 63 | $144,676 |
| GLD | X 22.4% Y 3.0% L 56 stop 8.5% hold 23 buffer 5.0% P 9.9% W 15 | 0 | $0 |
| XLU | X 28.5% Y 4.6% L 127 stop 4.8% hold 20 buffer 1.5% P 9.0% W 98 | 1 | $19,886 |

**A6 (archive)** (`GDX:d1-51ea8d4bd6|IWN:d1-b7e0ee6d67|KRE:d1-841700465c`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.4% P 9.4% W 60 | 54 | $162,290 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 81 | 15 | $128,220 |
| IWN | X 25.3% Y 2.3% L 25 stop 12.7% hold 22 buffer 4.8% P 3.0% W 169 | 1 | −$973 |

**A7 (archive)** (`GDX:d1-103f67f608|KRE:d1-a389037400|TLT:d1-8aab762964`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 57 | $151,907 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 74 | 15 | $128,220 |
| TLT | X 27.4% Y 2.1% L 72 stop 6.0% hold 22 buffer 3.5% P 8.2% W 23 | 0 | $0 |

**A8 (archive)** (`GDX:d1-f68c7efd75|IWM:d1-a40b28be32|KRE:d1-a389037400`)

| ETF | Vector | Funded lots @5 | Funded net @5 |
|---|---:|---:|---:|
| KRE | X 29.9% Y 2.7% L 230 stop 3.1% hold 4 buffer 2.3% P 9.4% W 60 | 57 | $151,907 |
| GDX | X 27.4% Y 0.4% L 100 stop 7.1% hold 18 buffer 3.6% P 19.1% W 93 | 15 | $128,220 |
| IWM | X 28.2% Y 4.5% L 152 stop 12.4% hold 30 buffer 0.4% P 12.8% W 195 | 0 | $0 |

## Rolling-origin diagnostic (discovery archive, not a gate)

```json
{
 "configurations": 16050,
 "spearmanF1VsF2F3": 0.6086655850004075,
 "spearmanF1F2VsF3": 0.7131481338691096,
 "topPercentByF1F2": {
  "count": 160,
  "medianF3": 145022.05793642212,
  "archiveMedianF3": 7050.551235460445,
  "shareWithPositiveF3": 1
 }
}
```

## Per-ETF exploration (whole search)

| ETF | Appearances | Feasible | On the Pareto front | Distinct vectors | Library vectors | With a funded lot | Singletons | Shortlisted | Nominated |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| EWZ | 2071 | 154 | 0 | 817 | 611 | 2050 | 80 | 0 | 0 |
| GDX | 16642 | 10663 | 69 | 3612 | 557 | 16479 | 752 | 19 | 0 |
| GLD | 10972 | 7751 | 2670 | 5899 | 799 | 3784 | 3899 | 4 | 0 |
| IWM | 5822 | 2758 | 3 | 1284 | 590 | 5351 | 194 | 4 | 0 |
| IWN | 6757 | 3808 | 5 | 1258 | 553 | 6284 | 108 | 5 | 0 |
| KRE | 10852 | 6862 | 72 | 1721 | 561 | 10753 | 401 | 14 | 0 |
| TLT | 7928 | 4818 | 293 | 2569 | 658 | 5504 | 1004 | 3 | 0 |
| VGT | 7705 | 4448 | 19 | 2085 | 598 | 7025 | 476 | 4 | 0 |
| VOOG | 7650 | 4204 | 11 | 2154 | 630 | 6993 | 627 | 3 | 0 |
| XBI | 14327 | 9608 | 73 | 2080 | 530 | 14224 | 369 | 14 | 0 |
| XLE | 3489 | 939 | 1 | 1067 | 633 | 3356 | 88 | 1 | 0 |
| XLF | 7455 | 4281 | 29 | 2311 | 641 | 6917 | 527 | 5 | 0 |
| XLU | 3591 | 1640 | 18 | 1440 | 620 | 2588 | 378 | 3 | 0 |
| XLY | 7090 | 4009 | 16 | 1897 | 617 | 6701 | 454 | 5 | 0 |
| XOP | 4437 | 1719 | 0 | 890 | 586 | 4434 | 80 | 2 | 0 |
| XRT | 12029 | 7718 | 43 | 1937 | 527 | 11791 | 161 | 12 | 0 |
