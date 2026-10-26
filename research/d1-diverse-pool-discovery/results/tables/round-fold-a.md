# Round fold-a: families, refinement, pruning and finalists

Generated from the records by `npm run diverse-d1 -- tables`.

### fold-a J-u: families and promotion

8574 credible configurations → 2651 families (largest 276, median 1).

| Slot | Outcome | Family | Family size | Representative | Score at promo |
|---|---|---|---|---|---|
| Q1 | filled | 0 | 58 | GDX IBB SMH XHB | 150,157 |
| Q2 | filled | 1 | 155 | GDX IBB SMH XHB | 148,470 |
| compact | filled | 2 | 180 | GDX SMH XHB | 148,825 |
| incumbent-free | filled | 948 | 47 | XHB | 69,833 |
| far | filled | 25 | 148 | EWW GDX KBE | 135,708 |
| Q3 | filled | 3 | 45 | GDX IBB SMH XHB | 148,668 |

### fold-a J-u: refinement and pruning

| Family | Slot | Start | Accepted moves | Refined | Pruned (marginal, 90% LB) | Result | Outcome | Unique evaluations |
|---|---|---|---|---|---|---|---|---|
| J-u-f1 | Q1 | GDX IBB SMH XHB | 1 | GDX IBB SMH XHB | — | GDX IBB SMH XHB | assessed | 495 |
| J-u-f2 | Q2 | GDX IBB SMH XHB | 1 | GDX IBB XHB | — | GDX IBB XHB | assessed | 373 |
| J-u-f3 | compact | GDX SMH XHB | 0 | GDX SMH XHB | — | GDX SMH XHB | assessed | 254 |
| J-u-f4 | incumbent-free | XHB | 0 | XHB | — | XHB | assessed | 127 |
| J-u-f5 | far | EWW GDX KBE | 1 | EWW GDX KBE | — | EWW GDX KBE | assessed | 462 |
| J-u-f6 | Q3 | GDX IBB SMH XHB | 1 | GDX IBB SMH XHB | — | GDX IBB SMH XHB | assessed | 500 |

### fold-a J-u: finalists (5 bps; E0 centre, E1 confirm-A)

| Finalist | Members | Centre net (E0) | Centre net_T | P50 net (E1) | P50 net_T | S_J | S_T | Q25 | Centre DD | DDmed / DD90 | Lots | Portfolio DD | Failed gates | Labels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J-u-f1 | GDX IBB SMH XHB | 187,059 | 52,996 | 178,036 | 53,167 | 158,036 | 33,167 | 166,970 | 17,281 | 17,281 / 19,903 | 11 | 26.4% | none | thin evidence; capacity-limited; capacity-unverified |
| J-u-f2 | GDX IBB XHB | 177,591 | 36,218 | 167,723 | 36,323 | 152,723 | 21,323 | 158,526 | 17,281 | 17,281 / 19,903 | 10 | 26.4% | none | capacity-limited; capacity-unverified |
| J-u-f3 | GDX SMH XHB | 174,267 | 59,641 | 164,741 | 60,260 | 149,741 | 45,260 | 150,441 | 17,281 | 17,281 / 19,982 | 9 | 26.4% | none | thin evidence; capacity-limited; capacity-unverified |
| J-u-f4 | XHB | 82,777 | 42,635 | 74,756 | 39,852 | 69,756 | 34,852 | 56,625 | 29,756 | 29,756 / 30,301 | 10 | 34.3% | none | capacity-unverified; portfolio DD in (30%, 35%]; G7 borrowing comparison extrapolated |
| J-u-f5 | EWW GDX KBE | 160,835 | 54,265 | 158,368 | 47,421 | 143,368 | 32,421 | 153,321 | 17,451 | 17,998 / 22,396 | 27 | 25.6% | none | thin evidence |
| J-u-f6 | GDX IBB SMH XHB | 187,965 | 51,827 | 179,365 | 51,940 | 159,365 | 31,940 | 165,566 | 17,281 | 17,281 / 19,903 | 11 | 26.4% | none | thin evidence; capacity-limited; capacity-unverified |

### fold-a T-u: families and promotion

6182 credible configurations → 1911 families (largest 288, median 1).

| Slot | Outcome | Family | Family size | Representative | Score at promo |
|---|---|---|---|---|---|
| Q1 | filled | 0 | 8 | FXI GDX XLK | 83,408 |
| Q2 | filled | 1 | 2 | GDX SMH | 82,723 |
| compact | filled | 2 | 6 | GDX KBE | 80,430 |
| incumbent-free | filled | 87 | 35 | IBB IGV ILF | 58,388 |
| far | filled | 16 | 7 | GDX IGV IJR VGT | 69,212 |
| Q3 | filled | 3 | 32 | GDX SMH | 83,538 |

### fold-a T-u: refinement and pruning

| Family | Slot | Start | Accepted moves | Refined | Pruned (marginal, 90% LB) | Result | Outcome | Unique evaluations |
|---|---|---|---|---|---|---|---|---|
| T-u-f1 | Q1 | FXI GDX XLK | 0 | FXI GDX XLK | — | FXI GDX XLK | assessed | 254 |
| T-u-f2 | Q2 | GDX SMH | 1 | GDX SMH | — | GDX SMH | assessed | 227 |
| T-u-f3 | compact | GDX KBE | 0 | GDX KBE | — | GDX KBE | assessed | 216 |
| T-u-f4 | incumbent-free | IBB IGV ILF | 1 | IBB IGV ILF | — | IBB IGV ILF | assessed | 429 |
| T-u-f5 | far | GDX IGV IJR VGT | 1 | GDX IGV VGT | VGT (-5,000, LB -5,000; prune) | GDX IGV | assessed | 438 |
| T-u-f6 | Q3 | GDX SMH | 0 | GDX SMH | — | GDX SMH | assessed | 218 |

### fold-a T-u: finalists (5 bps; E0 centre, E1 confirm-A)

| Finalist | Members | Centre net (E0) | Centre net_T | P50 net (E1) | P50 net_T | S_J | S_T | Q25 | Centre DD | DDmed / DD90 | Lots | Portfolio DD | Failed gates | Labels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T-u-f1 | FXI GDX XLK | 148,202 | 107,956 | 134,922 | 98,330 | 119,922 | 83,330 | 69,594 | 17,451 | 19,852 / 21,008 | 19 | 25.9% | none | — |
| T-u-f2 | GDX SMH | 140,671 | 99,143 | 137,964 | 97,861 | 127,964 | 87,861 | 133,505 | 18,463 | 19,196 / 23,329 | 28 | 26.1% | none | thin evidence |
| T-u-f3 | GDX KBE | 119,739 | 84,807 | 146,184 | 89,882 | 136,184 | 79,882 | 132,150 | 23,902 | 25,440 / 29,421 | 43 | 25.9% | none | — |
| T-u-f4 | IBB IGV ILF | 77,461 | 61,955 | 81,070 | 76,451 | 66,070 | 61,451 | 73,439 | 23,001 | 23,560 / 25,241 | 12 | 33.1% | none | thin evidence; capacity-limited; capacity-unverified; portfolio DD in (30%, 35%] |
| T-u-f5 | GDX IGV | 122,690 | 91,840 | 125,932 | 92,303 | 115,932 | 82,303 | 120,936 | 18,619 | 18,753 / 19,852 | 18 | 27.0% | none | — |
| T-u-f6 | GDX SMH | 135,304 | 96,248 | 127,275 | 92,928 | 117,275 | 82,928 | 117,050 | 18,067 | 18,863 / 23,183 | 27 | 26.2% | none | thin evidence |

### fold-a Q-u: families and promotion

1719 credible configurations → 1076 families (largest 22, median 1).

| Slot | Outcome | Family | Family size | Representative | Score at promo |
|---|---|---|---|---|---|
| Q1 | filled | 0 | 6 | GDX KRE | 130,717 |
| Q2 | filled | 1 | 3 | GDX IGV | 126,466 |
| compact | filled | 2 | 8 | GDX IGV IJH | 125,399 |
| far | filled | 7 | 1 | GDX LQD RSP SMH | 120,617 |

### fold-a Q-u: refinement and pruning

| Family | Slot | Start | Accepted moves | Refined | Pruned (marginal, 90% LB) | Result | Outcome | Unique evaluations |
|---|---|---|---|---|---|---|---|---|
| Q-u-f1 | Q1 | GDX KRE | 2 | EDV GDX KRE | — | EDV GDX KRE | assessed | 300 |
| Q-u-f2 | Q2 | GDX IGV | 2 | GDX IGV | — | GDX IGV | assessed | 300 |
| Q-u-f3 | compact | GDX IGV IJH | 5 | GDX IGV XRT | — | GDX IGV XRT | assessed | 300 |
| Q-u-f4 | far | GDX LQD RSP SMH | 0 | GDX LQD RSP SMH | LQD (-5,000; prune) | GDX RSP SMH | assessed | 300 |

### fold-a Q-u: finalists (5 bps; E0 centre, E1 confirm-A)

| Finalist | Members | Centre net (E0) | Centre net_T | P50 net (E1) | P50 net_T | S_J | S_T | Q25 | Centre DD | DDmed / DD90 | Lots | Portfolio DD | Failed gates | Labels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-u-f1 | EDV GDX KRE | 161,599 | 31,008 | 123,832 | 27,849 | 108,832 | 12,849 | 51,320 | 18,180 | 21,419 / 26,203 | 23 | 25.8% | none | capacity-unverified; brokerage-constraint pending |
| Q-u-f2 | GDX IGV | 150,076 | 51,314 | 111,110 | 41,635 | 101,110 | 31,635 | 83,793 | 17,281 | 17,281 / 25,097 | 9 | 26.4% | none | thin evidence; capacity-limited; capacity-unverified; G7 borrowing comparison extrapolated |
| Q-u-f3 | GDX IGV XRT | 178,051 | 50,442 | 135,883 | 42,511 | 120,883 | 27,511 | 101,394 | 19,432 | 23,432 / 35,892 | 35 | 27.6% | none | thin evidence |
| Q-u-f4 | GDX RSP SMH | 140,617 | 70,702 | 95,207 | 50,964 | 78,756 | 34,514 | 57,366 | 17,744 | 19,883 / 47,902 | 17 | 25.4% | none | thin evidence |
