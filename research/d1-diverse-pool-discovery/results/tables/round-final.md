# Round final: families, refinement, pruning and finalists

Generated from the records by `npm run diverse-d1 -- tables`.

### final J-u: families and promotion

20467 credible configurations → 5276 families (largest 506, median 1).

| Slot | Outcome | Family | Family size | Representative | Score at promo |
|---|---|---|---|---|---|
| Q1 | filled | 0 | 173 | EWW FXI GDX XME | 305,492 |
| Q2 | filled | 1 | 506 | EWW FXI GDX SMH XME | 284,122 |
| Q3 | filled | 2 | 77 | EWW FXI GDX KIE SMH XME | 281,973 |
| compact | filled | 115 | 22 | FXI GDX XHB | 228,013 |
| medium | filled | 3 | 26 | EWW FXI GDX SMH XME | 292,451 |
| broad | filled | 32 | 12 | EWW FXI GDX KIE SMH XME | 258,918 |
| incumbent-free | filled | 361 | 2 | EWW FXI SMH XLK XME | 172,623 |
| far | filled | 292 | 1 | EDV GDX SLV XLK | 206,058 |

### final J-u: refinement and pruning

| Family | Slot | Start | Accepted moves | Refined | Pruned (marginal, 90% LB) | Result | Outcome | Unique evaluations |
|---|---|---|---|---|---|---|---|---|
| J-u-f1 | Q1 | EWW FXI GDX XME | 4 | EWW FXI GDX KBE XME | — | EWW FXI GDX KBE XME | assessed | 768 |
| J-u-f2 | Q2 | EWW FXI GDX SMH XME | 3 | EWW FXI GDX SMH XME | — | EWW FXI GDX SMH XME | assessed | 583 |
| J-u-f3 | Q3 | EWW FXI GDX KIE SMH XME | 5 | EWW FXI GDX KIE SMH XME | KIE (-386, LB -3,813; prune) | EWW FXI GDX SMH XME | assessed | 800 |
| J-u-f4 | compact | FXI GDX XHB | 2 | FXI GDX XHB | — | FXI GDX XHB | assessed | 638 |
| J-u-f5 | medium | EWW FXI GDX SMH XME | 4 | EWW FXI GDX SMH XME | — | EWW FXI GDX SMH XME | assessed | 800 |
| J-u-f6 | broad | EWW FXI GDX KIE SMH XME | 6 | EWW FXI GDX KIE SMH XME | KIE (300, LB -3,790; prune) | EWW FXI GDX SMH XME | assessed | 800 |
| J-u-f7 | incumbent-free | EWW FXI SMH XLK XME | 3 | EWW FXI SMH XLK XME | SMH (418, LB -2,481; prune) | EWW FXI XLK XME | assessed | 723 |
| J-u-f8 | far | EDV GDX SLV XLK | 2 | EDV GDX SLV XLK | — | EDV GDX SLV XLK | assessed | 719 |

### final J-u: finalists (5 bps; E0 centre, E1 confirm-A)

| Finalist | Members | Centre net (E0) | Centre net_T | P50 net (E1) | P50 net_T | S_J | S_T | Q25 | Centre DD | DDmed / DD90 | Lots | Portfolio DD | Failed gates | Labels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J-u-f1 | EWW FXI GDX KBE XME | 379,458 | 319,681 | 348,868 | 281,880 | 323,868 | 256,880 | 331,044 | 24,982 | 24,982 / 29,648 | 50 | 27.4% | G7 | capacity-unverified |
| J-u-f2 | EWW FXI GDX SMH XME | 325,257 | 226,799 | 327,145 | 252,852 | 302,145 | 227,852 | 302,126 | 21,346 | 21,943 / 33,898 | 43 | 27.9% | G7 | capacity-unverified |
| J-u-f3 | EWW FXI GDX SMH XME | 340,465 | 273,831 | 323,725 | 261,688 | 298,725 | 236,688 | 307,470 | 22,406 | 22,406 / 29,480 | 44 | 28.8% | G7 | capacity-unverified |
| J-u-f4 | FXI GDX XHB | 188,453 | 103,475 | 266,039 | 158,766 | 237,855 | 130,582 | 233,111 | 24,250 | 45,170 / 51,029 | 31 | 32.8% | G7 | thin evidence; portfolio DD in (30%, 35%] |
| J-u-f5 | EWW FXI GDX SMH XME | 392,483 | 329,693 | 335,706 | 270,785 | 310,706 | 245,785 | 317,745 | 21,032 | 21,417 / 29,499 | 44 | 26.7% | G7 | capacity-unverified |
| J-u-f6 | EWW FXI GDX SMH XME | 373,942 | 318,733 | 320,950 | 250,960 | 295,950 | 225,960 | 299,175 | 22,052 | 21,504 / 28,519 | 45 | 28.7% | G7 | capacity-unverified |
| J-u-f7 | EWW FXI XLK XME | 230,566 | 210,717 | 205,296 | 171,492 | 185,296 | 151,492 | 193,125 | 22,966 | 23,379 / 31,013 | 25 | 33.5% | G6 G7 | capacity-unverified; portfolio DD in (30%, 35%] |
| J-u-f8 | EDV GDX SLV XLK | 275,429 | 132,808 | 233,827 | 118,054 | 213,827 | 98,054 | 203,800 | 18,025 | 22,594 / 28,171 | 28 | 34.0% | G6 G7 | capacity-limited; capacity-unverified; brokerage-constraint pending; portfolio DD in (30%, 35%] |

### final T-u: families and promotion

21030 credible configurations → 4979 families (largest 679, median 1).

| Slot | Outcome | Family | Family size | Representative | Score at promo |
|---|---|---|---|---|---|
| Q1 | filled | 0 | 591 | EWW FXI KRE MTUM SLV XME | 208,961 |
| Q2 | filled | 1 | 43 | EWW GDX ILF VGT XBI | 198,399 |
| Q3 | filled | 2 | 62 | EWW GDX ILF VGT XBI | 199,109 |
| compact | filled | 145 | 20 | EWW SLV XME | 135,360 |
| medium | filled | 3 | 79 | DBC GDX SLV SMH XBI | 211,079 |
| broad | filled | 22 | 4 | EWW FXI ILF MTUM SLV XBI XME | 167,584 |
| incumbent-free | filled | 46 | 15 | EWW FXI KRE MTUM SLV XME | 185,848 |
| far | failed after 3 attempts | — | — | — | — |

### final T-u: refinement and pruning

| Family | Slot | Start | Accepted moves | Refined | Pruned (marginal, 90% LB) | Result | Outcome | Unique evaluations |
|---|---|---|---|---|---|---|---|---|
| T-u-f1 | Q1 | EWW FXI KRE MTUM SLV XME | 2 | EWW FXI KRE MTUM SLV XME | — | EWW FXI KRE MTUM SLV XME | assessed | 582 |
| T-u-f2 | Q2 | EWW GDX ILF VGT XBI | 2 | EWW GDX ILF VGT XBI | — | EWW GDX ILF VGT XBI | assessed | 781 |
| T-u-f3 | Q3 | EWW GDX ILF VGT XBI | 2 | EWW GDX ILF VGT XBI | — | EWW GDX ILF VGT XBI | assessed | 506 |
| T-u-f4 | compact | EWW SLV XME | 5 | EWW SLV XME | — | EWW SLV XME | assessed | 658 |
| T-u-f5 | medium | DBC GDX SLV SMH XBI | 0 | DBC GDX SLV SMH XBI | — | DBC GDX SLV SMH XBI | assessed | 330 |
| T-u-f6 | broad | EWW FXI ILF MTUM SLV XBI XME | 3 | EWW FXI ILF MTUM SLV XME | ILF (-5,164, LB -10,463; prune) | EWW FXI MTUM SLV XME | assessed | 800 |
| T-u-f7 | incumbent-free | EWW FXI KRE MTUM SLV XME | 3 | EWW FXI KRE MTUM SLV XME | — | EWW FXI KRE MTUM SLV XME | assessed | 665 |

### final T-u: finalists (5 bps; E0 centre, E1 confirm-A)

| Finalist | Members | Centre net (E0) | Centre net_T | P50 net (E1) | P50 net_T | S_J | S_T | Q25 | Centre DD | DDmed / DD90 | Lots | Portfolio DD | Failed gates | Labels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T-u-f1 | EWW FXI KRE MTUM SLV XME | 341,157 | 295,220 | 285,612 | 246,487 | 255,612 | 216,487 | 266,274 | 25,543 | 25,658 / 34,837 | 49 | 32.1% | G7 | thin evidence; capacity-unverified; portfolio DD in (30%, 35%] |
| T-u-f2 | EWW GDX ILF VGT XBI | 271,652 | 216,275 | 256,727 | 227,078 | 231,727 | 202,078 | 239,446 | 22,066 | 24,029 / 31,422 | 60 | 28.4% | G7 | capacity-limited; capacity-unverified; brokerage-constraint pending |
| T-u-f3 | EWW GDX ILF VGT XBI | 277,531 | 227,261 | 258,055 | 229,943 | 233,055 | 204,943 | 240,958 | 23,654 | 24,694 / 33,165 | 64 | 28.0% | G7 | capacity-limited; capacity-unverified; brokerage-constraint pending |
| T-u-f4 | EWW SLV XME | 276,339 | 212,340 | 236,852 | 178,342 | 221,852 | 163,342 | 215,502 | 25,732 | 25,026 / 33,572 | 41 | 32.7% | G6 G7 | capacity-unverified; portfolio DD in (30%, 35%] |
| T-u-f5 | DBC GDX SLV SMH XBI | 223,862 | 167,436 | 275,201 | 236,944 | 243,331 | 205,074 | 257,195 | 24,569 | 40,780 / 47,179 | 65 | 31.9% | G7 | thin evidence; portfolio DD in (30%, 35%] |
| T-u-f6 | EWW FXI MTUM SLV XME | 338,119 | 278,689 | 272,587 | 231,525 | 247,587 | 206,525 | 252,219 | 24,789 | 21,003 / 25,089 | 37 | 31.7% | G7 | capacity-unverified; portfolio DD in (30%, 35%] |
| T-u-f7 | EWW FXI KRE MTUM SLV XME | 346,139 | 299,009 | 283,536 | 238,143 | 253,536 | 208,143 | 261,928 | 25,571 | 21,718 / 27,623 | 48 | 32.1% | G7 | thin evidence; capacity-unverified; portfolio DD in (30%, 35%] |

### final J-s: families and promotion

21028 credible configurations → 4151 families (largest 1728, median 1).

| Slot | Outcome | Family | Family size | Representative | Score at promo |
|---|---|---|---|---|---|
| Q1 | filled | 0 | 1,728 | GDX KRE XBI XRT | 302,923 |
| Q2 | filled | 1 | 254 | GDX KRE XBI XRT | 285,421 |
| Q3 | filled | 2 | 69 | GDX KRE XBI XRT | 291,246 |
| compact | filled | 41 | 85 | GDX KRE XBI XRT | 265,974 |
| medium | filled | 3 | 297 | GDX KRE XBI XRT | 284,088 |
| broad | filled | 24 | 10 | GDX KRE SMH VGT XBI XRT | 267,585 |
| incumbent-free | filled | 578 | 4 | FXI ILF IWN SLV | 163,225 |
| far | filled | 314 | 2 | EWW FXI GDX IEMG KRE VGT | 197,674 |

### final J-s: refinement and pruning

| Family | Slot | Start | Accepted moves | Refined | Pruned (marginal, 90% LB) | Result | Outcome | Unique evaluations |
|---|---|---|---|---|---|---|---|---|
| J-s-f1 | Q1 | GDX KRE XBI XRT | 2 | GDX KRE XBI XRT | — | GDX KRE XBI XRT | assessed | 463 |
| J-s-f2 | Q2 | GDX KRE XBI XRT | 2 | GDX KRE XBI XRT | — | GDX KRE XBI XRT | assessed | 523 |
| J-s-f3 | Q3 | GDX KRE XBI XRT | 3 | GDX KRE XBI XRT | — | GDX KRE XBI XRT | assessed | 799 |
| J-s-f4 | compact | GDX KRE XBI XRT | 2 | GDX KRE XBI XRT | — | GDX KRE XBI XRT | assessed | 515 |
| J-s-f5 | medium | GDX KRE XBI XRT | 2 | GDX KRE XBI XRT | — | GDX KRE XBI XRT | assessed | 467 |
| J-s-f6 | broad | GDX KRE SMH VGT XBI XRT | 3 | GDX KRE SMH VGT XBI XRT | SMH (3,324, LB -2,851; prune) | GDX KRE VGT XBI XRT | assessed | 670 |
| J-s-f7 | incumbent-free | FXI ILF IWN SLV | 0 | FXI ILF IWN SLV | — | FXI ILF IWN SLV | assessed | 291 |
| J-s-f8 | far | EWW FXI GDX IEMG KRE VGT | 7 | EWW EWZ FXI GDX KRE VGT XME | — | EWW EWZ FXI GDX KRE VGT XME | assessed | 800 |

### final J-s: finalists (5 bps; E0 centre, E1 confirm-A)

| Finalist | Members | Centre net (E0) | Centre net_T | P50 net (E1) | P50 net_T | S_J | S_T | Q25 | Centre DD | DDmed / DD90 | Lots | Portfolio DD | Failed gates | Labels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J-s-f1 | GDX KRE XBI XRT | 372,895 | 333,008 | 312,452 | 241,868 | 292,452 | 221,868 | 289,817 | 30,707 | 28,013 / 34,407 | 69 | 29.7% | none | capacity-unverified |
| J-s-f2 | GDX KRE XBI XRT | 334,952 | 285,560 | 314,384 | 239,460 | 294,384 | 219,460 | 281,754 | 31,206 | 31,868 / 42,545 | 71 | 29.7% | none | — |
| J-s-f3 | GDX KRE XBI XRT | 398,855 | 347,707 | 312,760 | 242,167 | 292,760 | 222,167 | 286,410 | 34,478 | 27,189 / 41,516 | 71 | 29.4% | none | capacity-unverified |
| J-s-f4 | GDX KRE XBI XRT | 318,954 | 263,853 | 291,463 | 215,141 | 271,463 | 195,141 | 273,326 | 31,094 | 31,938 / 39,733 | 71 | 28.8% | none | — |
| J-s-f5 | GDX KRE XBI XRT | 397,604 | 363,607 | 302,082 | 230,917 | 282,082 | 210,917 | 276,817 | 22,689 | 31,967 / 41,393 | 72 | 29.1% | none | capacity-unverified |
| J-s-f6 | GDX KRE VGT XBI XRT | 357,916 | 288,390 | 306,232 | 222,450 | 281,145 | 197,362 | 280,762 | 28,565 | 35,087 / 38,367 | 69 | 31.6% | G7 | thin evidence; capacity-limited; capacity-unverified; brokerage-constraint pending; portfolio DD in (30%, 35%] |
| J-s-f7 | FXI ILF IWN SLV | 188,096 | 108,448 | 182,643 | 106,097 | 162,643 | 86,097 | 174,476 | 32,335 | 32,335 / 36,162 | 21 | 31.9% | G4 G6 G7 | thin evidence; capacity-limited; capacity-unverified; portfolio DD in (30%, 35%] |
| J-s-f8 | EWW EWZ FXI GDX KRE VGT XME | 327,705 | 232,368 | 303,019 | 204,634 | 268,019 | 169,634 | 283,292 | 29,320 | 31,768 / 44,837 | 61 | 29.8% | G7 | thin evidence; capacity-unverified; brokerage-constraint pending |

### final T-s: families and promotion

23375 credible configurations → 4353 families (largest 2629, median 1).

| Slot | Outcome | Family | Family size | Representative | Score at promo |
|---|---|---|---|---|---|
| Q1 | filled | 0 | 264 | GDX KRE VGT XBI XRT | 219,849 |
| Q2 | filled | 1 | 64 | GDX KRE SMH VGT XRT | 208,899 |
| Q3 | filled | 2 | 778 | GDX KRE VGT XBI | 216,848 |
| compact | filled | 9 | 2,629 | GDX KRE VGT XBI XRT | 201,921 |
| medium | filled | 3 | 62 | GDX KRE VGT XBI XRT | 219,733 |
| broad | filled | 8 | 88 | GDX KRE SMH VGT XHB XRT | 211,523 |
| incumbent-free | filled | 509 | 3 | EWW FXI IWN SLV TIP XLY | 94,176 |
| far | filled | 315 | 3 | GDX IWF IWN | 131,241 |

### final T-s: refinement and pruning

| Family | Slot | Start | Accepted moves | Refined | Pruned (marginal, 90% LB) | Result | Outcome | Unique evaluations |
|---|---|---|---|---|---|---|---|---|
| T-s-f1 | Q1 | GDX KRE VGT XBI XRT | 1 | GDX KRE VGT XBI XRT | — | GDX KRE VGT XBI XRT | assessed | 506 |
| T-s-f2 | Q2 | GDX KRE SMH VGT XRT | 4 | DBC GDX KRE SMH VGT XRT | — | DBC GDX KRE SMH VGT XRT | assessed | 800 |
| T-s-f3 | Q3 | GDX KRE VGT XBI | 0 | GDX KRE VGT XBI | — | GDX KRE VGT XBI | assessed | 288 |
| T-s-f4 | compact | GDX KRE VGT XBI XRT | 2 | GDX KRE VGT XBI XRT | — | GDX KRE VGT XBI XRT | assessed | 565 |
| T-s-f5 | medium | GDX KRE VGT XBI XRT | 0 | GDX KRE VGT XBI XRT | — | GDX KRE VGT XBI XRT | assessed | 324 |
| T-s-f6 | broad | GDX KRE SMH VGT XHB XRT | 3 | GDX KRE SMH VGT XRT | — | — | F-P after pruning | 614 |
| T-s-f7 | incumbent-free | EWW FXI IWN SLV TIP XLY | 3 | EWW FXI IWN SLV TIP | TIP (-5,000, LB -5,000; prune) | EWW FXI IWN SLV | assessed | 649 |
| T-s-f8 | far | GDX IWF IWN | 4 | GDX IWF IWN | — | GDX IWF IWN | assessed | 678 |

### final T-s: finalists (5 bps; E0 centre, E1 confirm-A)

| Finalist | Members | Centre net (E0) | Centre net_T | P50 net (E1) | P50 net_T | S_J | S_T | Q25 | Centre DD | DDmed / DD90 | Lots | Portfolio DD | Failed gates | Labels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T-s-f1 | GDX KRE VGT XBI XRT | 363,582 | 294,286 | 301,371 | 248,239 | 276,371 | 223,239 | 275,934 | 33,008 | 33,968 / 43,034 | 66 | 31.5% | G7 | capacity-unverified; brokerage-constraint pending; portfolio DD in (30%, 35%] |
| T-s-f2 | DBC GDX KRE SMH VGT XRT | 339,106 | 317,173 | 301,474 | 271,270 | 271,474 | 241,270 | 279,147 | 33,008 | 34,907 / 41,035 | 53 | 30.0% | G7 | thin evidence; capacity-unverified; brokerage-constraint pending; portfolio DD in (30%, 35%] |
| T-s-f3 | GDX KRE VGT XBI | 307,495 | 284,407 | 270,289 | 237,658 | 250,289 | 217,658 | 251,518 | 30,651 | 32,743 / 35,134 | 72 | 31.4% | G7 | capacity-unverified; brokerage-constraint pending; portfolio DD in (30%, 35%] |
| T-s-f4 | GDX KRE VGT XBI XRT | 379,796 | 314,856 | 294,069 | 238,308 | 269,069 | 213,308 | 275,827 | 33,008 | 32,922 / 41,736 | 70 | 31.4% | G7 | capacity-unverified; brokerage-constraint pending; portfolio DD in (30%, 35%] |
| T-s-f5 | GDX KRE VGT XBI XRT | 376,722 | 306,609 | 291,578 | 241,586 | 266,535 | 216,543 | 268,923 | 27,579 | 35,042 / 38,316 | 65 | 29.8% | none | capacity-unverified; brokerage-constraint pending |
| T-s-f7 | EWW FXI IWN SLV | 195,044 | 172,775 | 166,036 | 141,148 | 146,036 | 121,148 | 146,069 | 24,145 | 24,145 / 31,063 | 42 | 32.2% | G6 G7 | capacity-unverified; portfolio DD in (30%, 35%] |
| T-s-f8 | GDX IWF IWN | 223,337 | 186,156 | 223,952 | 186,881 | 208,952 | 171,881 | 215,405 | 22,024 | 22,179 / 22,550 | 35 | 32.5% | G6 G7 G8 | capacity-unverified; portfolio DD in (30%, 35%] |
