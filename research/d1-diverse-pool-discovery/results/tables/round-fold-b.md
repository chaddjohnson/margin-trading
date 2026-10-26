# Round fold-b: families, refinement, pruning and finalists

Generated from the records by `npm run diverse-d1 -- tables`.

### fold-b J-u: families and promotion

7070 credible configurations → 2836 families (largest 136, median 1).

| Slot | Outcome | Family | Family size | Representative | Score at promo |
|---|---|---|---|---|---|
| Q1 | filled | 0 | 33 | GDX SMH XHB | 178,823 |
| Q2 | filled | 1 | 84 | GDX SLV SMH | 177,252 |
| compact | filled | 2 | 22 | GDX SLV SMH | 186,659 |
| incumbent-free | filled | 57 | 76 | IGV SLV XLK | 158,283 |
| far | filled | 25 | 22 | GDX IWM XHB | 149,259 |
| Q3 | filled | 3 | 32 | GDX SLV SMH | 173,643 |

### fold-b J-u: refinement and pruning

| Family | Slot | Start | Accepted moves | Refined | Pruned (marginal, 90% LB) | Result | Outcome | Unique evaluations |
|---|---|---|---|---|---|---|---|---|
| J-u-f1 | Q1 | GDX SMH XHB | 4 | GDX SMH XHB | — | GDX SMH XHB | assessed | 500 |
| J-u-f2 | Q2 | GDX SLV SMH | 2 | GDX SLV SMH | SLV (-6,755, LB -11,794; prune) | GDX SMH | assessed | 500 |
| J-u-f3 | compact | GDX SLV SMH | 2 | GDX SLV SMH | SLV (-3,575, LB -4,715; prune) | GDX SMH | assessed | 455 |
| J-u-f4 | incumbent-free | IGV SLV XLK | 2 | IGV SLV SMH XLK | SMH (-4,975, LB -5,936; prune) | IGV SLV XLK | assessed | 500 |
| J-u-f5 | far | GDX IWM XHB | 5 | GDX IJR XHB | — | GDX IJR XHB | assessed | 500 |
| J-u-f6 | Q3 | GDX SLV SMH | 1 | GDX SLV SMH | SLV (-8,053, LB -14,345; prune) | GDX SMH | assessed | 461 |

### fold-b J-u: finalists (5 bps; E0 centre, E1 confirm-A)

| Finalist | Members | Centre net (E0) | Centre net_T | P50 net (E1) | P50 net_T | S_J | S_T | Q25 | Centre DD | DDmed / DD90 | Lots | Portfolio DD | Failed gates | Labels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| J-u-f1 | GDX SMH XHB | 239,556 | 125,190 | 225,267 | 113,510 | 210,267 | 98,510 | 215,719 | 19,840 | 21,145 / 23,200 | 19 | 26.4% | none | capacity-unverified |
| J-u-f2 | GDX SMH | 201,084 | 95,216 | 189,623 | 95,284 | 179,623 | 85,284 | 176,439 | 19,840 | 20,191 / 23,533 | 21 | 26.4% | none | — |
| J-u-f3 | GDX SMH | 224,674 | 124,780 | 211,716 | 108,763 | 201,716 | 98,763 | 199,176 | 19,840 | 19,957 / 23,200 | 16 | 26.4% | none | — |
| J-u-f4 | IGV SLV XLK | 181,259 | 94,750 | 178,154 | 92,622 | 163,154 | 77,622 | 173,305 | 26,440 | 25,336 / 27,598 | 9 | 30.9% | none | thin evidence; portfolio DD in (30%, 35%] |
| J-u-f5 | GDX IJR XHB | 201,062 | 85,707 | 202,421 | 94,613 | 187,421 | 79,613 | 191,367 | 17,945 | 18,115 / 18,783 | 20 | 26.9% | G8 | thin evidence |
| J-u-f6 | GDX SMH | 193,633 | 84,041 | 186,063 | 95,043 | 176,063 | 85,043 | 177,404 | 17,281 | 19,987 / 23,391 | 21 | 26.4% | none | — |

### fold-b T-u: families and promotion

3991 credible configurations → 1797 families (largest 74, median 1).

| Slot | Outcome | Family | Family size | Representative | Score at promo |
|---|---|---|---|---|---|
| Q1 | filled | 0 | 2 | GDX VOOG XBI | 95,154 |
| Q2 | filled | 1 | 11 | IGV VOOG | 23,259 |
| compact | filled | 2 | 2 | IGV VOOG | 22,759 |
| incumbent-free | filled | 3 | 13 | IGV IWN | 92,188 |
| far | filled | 30 | 1 | SMH TLT | 97,081 |
| Q3 | filled | 5 | 20 | IGV IWN | 86,909 |

### fold-b T-u: refinement and pruning

| Family | Slot | Start | Accepted moves | Refined | Pruned (marginal, 90% LB) | Result | Outcome | Unique evaluations |
|---|---|---|---|---|---|---|---|---|
| T-u-f1 | Q1 | GDX VOOG XBI | 0 | GDX VOOG XBI | — | GDX VOOG XBI | assessed | 252 |
| T-u-f2 | Q2 | IGV VOOG | 2 | IGV KBE VOOG | KBE (29,392, LB -5,000; prune); IGV (-3,803, LB -42,434; prune) | VOOG | assessed | 393 |
| T-u-f3 | compact | IGV VOOG | 5 | IGV VOOG | — | IGV VOOG | assessed | 500 |
| T-u-f4 | incumbent-free | IGV IWN | 0 | IGV IWN | — | IGV IWN | assessed | 216 |
| T-u-f5 | far | SMH TLT | 1 | SMH | — | SMH | assessed | 204 |
| T-u-f6 | Q3 | IGV IWN | 0 | IGV IWN | — | IGV IWN | assessed | 213 |

### fold-b T-u: finalists (5 bps; E0 centre, E1 confirm-A)

| Finalist | Members | Centre net (E0) | Centre net_T | P50 net (E1) | P50 net_T | S_J | S_T | Q25 | Centre DD | DDmed / DD90 | Lots | Portfolio DD | Failed gates | Labels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T-u-f1 | GDX VOOG XBI | 182,689 | 113,853 | 174,063 | 111,745 | 159,063 | 96,745 | 168,080 | 21,822 | 21,801 / 21,822 | 9 | 26.0% | none | thin evidence; capacity-limited; capacity-unverified; brokerage-constraint pending |
| T-u-f2 | VOOG | 102,453 | 72,374 | 98,280 | 70,675 | 93,280 | 65,675 | 97,621 | 21,171 | 20,787 / 21,340 | 1 | 32.3% | G3 G5 | thin evidence; brokerage-constraint pending; portfolio DD in (30%, 35%] |
| T-u-f3 | IGV VOOG | 42,396 | 23,608 | 127,375 | 113,196 | 117,375 | 103,196 | 50,921 | 15,213 | 20,725 / 20,787 | 12 | 31.5% | none | thin evidence; brokerage-constraint pending; portfolio DD in (30%, 35%]; G7 borrowing comparison extrapolated |
| T-u-f4 | IGV IWN | 135,217 | 103,923 | 117,634 | 102,408 | 107,634 | 92,408 | 67,195 | 26,927 | 26,927 / 31,261 | 15 | 32.4% | none | thin evidence; capacity-unverified; portfolio DD in (30%, 35%] |
| T-u-f5 | SMH | 139,519 | 113,145 | 139,577 | 113,233 | 134,577 | 108,233 | 137,873 | 31,204 | 31,823 / 34,301 | 5 | 32.9% | G3 | portfolio DD in (30%, 35%] |
| T-u-f6 | IGV IWN | 104,867 | 97,059 | 104,600 | 96,882 | 94,600 | 86,882 | 101,361 | 27,952 | 28,232 / 32,258 | 11 | 34.5% | none | thin evidence; portfolio DD in (30%, 35%] |

### fold-b Q-u: families and promotion

1701 credible configurations → 1135 families (largest 15, median 1).

| Slot | Outcome | Family | Family size | Representative | Score at promo |
|---|---|---|---|---|---|
| Q1 | filled | 0 | 2 | DBC GDX KIE SPLV XHB | 192,619 |
| Q2 | filled | 1 | 3 | DBC GDX SHY XHB XLB | 168,760 |
| compact | filled | 2 | 2 | GDX XHB | 163,825 |
| far | filled | 3 | 8 | EWW GDX IEMG | 160,901 |

### fold-b Q-u: refinement and pruning

| Family | Slot | Start | Accepted moves | Refined | Pruned (marginal, 90% LB) | Result | Outcome | Unique evaluations |
|---|---|---|---|---|---|---|---|---|
| Q-u-f1 | Q1 | DBC GDX KIE SPLV XHB | 0 | DBC GDX KIE SPLV XHB | KIE (-5,000; prune); SPLV (-5,000; prune) | DBC GDX XHB | assessed | 300 |
| Q-u-f2 | Q2 | DBC GDX SHY XHB XLB | 2 | DBC GDX SHY XHB XLB | SHY (-5,000; prune); XLB (-5,000; prune) | DBC GDX XHB | assessed | 301 |
| Q-u-f3 | compact | GDX XHB | 2 | GDX XHB | — | GDX XHB | assessed | 300 |
| Q-u-f4 | far | EWW GDX IEMG | 3 | EWW GDX XHB | — | EWW GDX XHB | assessed | 300 |

### fold-b Q-u: finalists (5 bps; E0 centre, E1 confirm-A)

| Finalist | Members | Centre net (E0) | Centre net_T | P50 net (E1) | P50 net_T | S_J | S_T | Q25 | Centre DD | DDmed / DD90 | Lots | Portfolio DD | Failed gates | Labels |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Q-u-f1 | DBC GDX XHB | 217,619 | 90,114 | 122,805 | 37,552 | 107,805 | 22,552 | 105,494 | 19,299 | 27,387 / 34,033 | 19 | 27.2% | none | thin evidence; capacity-limited; capacity-unverified |
| Q-u-f2 | DBC GDX XHB | 213,826 | 90,114 | 123,427 | 40,741 | 108,427 | 25,741 | 111,866 | 19,299 | 26,591 / 33,719 | 19 | 27.2% | none | thin evidence; capacity-limited; capacity-unverified |
| Q-u-f3 | GDX XHB | 199,212 | 66,580 | 174,039 | 49,385 | 164,039 | 39,385 | 164,578 | 17,744 | 19,599 / 24,638 | 14 | 27.2% | none | thin evidence; capacity-unverified |
| Q-u-f4 | EWW GDX XHB | 217,989 | 104,118 | 174,919 | 81,314 | 159,919 | 66,314 | 161,328 | 19,717 | 22,930 / 25,017 | 31 | 25.4% | none | thin evidence; capacity-limited; capacity-unverified |
