# Walk-forward: fold-specific train-then-validate

Each fold's 10 picks per family were chosen by the pre-declared rule (PROTOCOL.md §8) on **that fold's training dates only**, then evaluated on the following window. Primary: one continuous run from 2016-09-20 with the window's P&L attributed (positions may carry in); flat start = arming only from the window's first session. `stop` fills and 11% unless noted. These are the only true out-of-sample figures before the holdout; final-fit picks are **not** given retrospective walk-forward figures.

## Findings

- **Training figures collapse out of sample in every family and every fold.** The median training net of a
  fold's 10 picks was $31k–$88k. The median validation net was −$34.5k to +$20.5k.
- **The optimized picks lost to their own unoptimized defaults in 2020–2021 and 2023, and in 2022 for
  families 3 and 4.** Fold 1: 2/40 picks beat their family's default. Fold 3: 1/40. In fold 2 (2022),
  families 1 and 2 beat their defaults with 10/10 and 9/10 picks, but only because the defaults lost about
  $30k that year. Families 3 and 4, with no re-entry restriction, lost more than their defaults in the
  median.
- **Why it fails.** The training data reward a near-immediate entry: Y of 0.5%–1.4%, which almost neutralizes
  the trailing buy. That comes with tight stops (4%–5%) or very wide ones (9.8%–10.4%), short holds, and, in
  the later folds, very deep dips (X 17%–20%). In 2022 the low-Y, shallow-X picks re-enter repeatedly into a
  falling market. Without the restriction (families 3 and 4), nothing stops them, which is why those families
  lost most. In 2023 most fold-3 picks never armed (X ≈ 17%–20%; 6–9 of 10 per family had no entry). Their
  validation figure is $0 except for a position carried in from 2022 (family 4, pick 5: −$1,419 with no
  entry).
- **The deep-dip "low-DD" picks were the only consistently positive category in 2022**, at +$17k to +$23k in
  all four families. They were idle in 2023 and weak in 2020–2021. Their walk-forward total is still below
  each family's default for families 1, 3 and 4, and about equal for family 2.
- **Flat start versus continuous** changed little. A flat start removes carried positions; the largest change
  was fold 2, family 2's median (−$3.5k → +$1.5k).
- **`next-open` versus `stop` fills** moved the medians by less than $300. The fold picks rarely exit through
  an intraday stop at the stop level in these windows.
- **allIn.ts on the same windows:** +$55.4k (2020–2021), −$4.3k (2022), +$43.7k (2023), a total of $94.8k.
  That beats every stitched policy and every family default.


## fold1: train 2016-09-20 → 2019-12-31, validate 2020-01-01 → 2021-12-31

allIn.ts on the same window: continuous $55,393 (minute DD $19,057, 7 trades), flat start $55,393; training $24,421.

### Family 1: Trailing buy (restricted re-entry) (minimum 4 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `1-6501d9af0d` | profit | X=7.3% Y=1.4% stop=4.4% hold=10 L=159 mat=0.7% lower=4.4% reset=56.3% | $53,109 | $13,700 | 14 | $20,155 | $32,624 | 13 | $17,387 | $20,216 | stable |
| pick 2 `1-a9e089d4d2` | profit | X=7.2% Y=1.0% stop=4.4% hold=10 L=125 mat=0.8% lower=5.0% reset=56.5% | $44,495 | $14,521 | 12 | $24,550 | $28,497 | 13 | $21,765 | $24,743 | stable |
| pick 3 `1-05b174e574` | profit | X=11.1% Y=0.9% stop=6.6% hold=10 L=122 mat=0.5% lower=5.9% reset=44.8% | $41,255 | $15,455 | 8 | $40,954 | $19,385 | 7 | $40,954 | $40,711 | stable |
| pick 4 `1-038e8df71d` | balanced | X=7.4% Y=0.9% stop=4.0% hold=13 L=90 mat=1.6% lower=5.9% reset=53.1% | $43,681 | $10,717 | 13 | $31,698 | $25,913 | 17 | $28,407 | $32,176 | stable |
| pick 5 `1-3cbc7c9b02` | balanced | X=10.7% Y=1.4% stop=4.4% hold=12 L=152 mat=0.5% lower=5.6% reset=55.2% | $38,988 | $10,652 | 9 | $14,523 | $25,092 | 9 | $14,523 | $14,490 | stable |
| pick 6 `1-bf5723c138` | balanced | X=10.1% Y=5.0% stop=4.4% hold=6 L=78 mat=1.5% lower=5.1% reset=57.6% | $27,364 | $8,633 | 9 | −$5,765 | $25,028 | 9 | −$5,765 | −$5,804 | stable |
| pick 7 `1-08e4029e74` | low-DD | X=11.5% Y=5.0% stop=4.0% hold=5 L=85 mat=1.4% lower=5.1% reset=54.4% | $18,839 | $6,282 | 6 | $5,764 | $24,607 | 10 | $5,764 | $5,840 | stable |
| pick 8 `1-c1698564d0` | low-DD | X=13.4% Y=5.4% stop=4.5% hold=9 L=91 mat=1.9% lower=0.5% reset=46.3% | $13,016 | $7,783 | 4 | $6,535 | $25,543 | 7 | $6,535 | $6,377 | stable |
| pick 9 `1-4e99067465` | Pareto-diverse | X=7.1% Y=1.6% stop=6.4% hold=13 L=78 mat=2.8% lower=5.3% reset=54.7% | $39,876 | $19,728 | 13 | $49,996 | $26,564 | 16 | $42,326 | $50,222 | stable |
| pick 10 `1-0b7aeb1557` | Pareto-diverse | X=10.4% Y=0.7% stop=5.1% hold=9 L=104 mat=0.8% lower=5.1% reset=66.3% | $39,365 | $17,648 | 9 | $20,799 | $23,151 | 9 | $20,799 | $20,763 | stable |
| default (file Y 4%) `1-ea7ddf46c0` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% | $14,163 | $21,352 | 7 | $33,137 | $31,634 | 6 | $33,137 | $32,953 | — |
| default at Y 3% `1-58c2a4ea73` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% | −$5,586 | $32,873 | 8 | $43,093 | $26,016 | 6 | $43,093 | $42,900 | — |

Picks: median validation net $20,477, 9/10 positive, 2/10 above the family's own default ($33,137), 0/10 above allIn.ts.

### Family 2: Trailing buy + buffered loss exit (restricted re-entry) (minimum 4 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `2-223a30df92` | profit | X=8.6% Y=0.5% stop=6.3% hold=10 L=45 mat=1.8% lower=5.2% reset=61.4% buffer=2.6% | $46,733 | $21,847 | 13 | $15,995 | $34,532 | 10 | $14,080 | $15,797 | stable |
| pick 2 `2-0a7551dcd1` | profit | X=7.1% Y=1.6% stop=4.4% hold=10 L=114 mat=2.0% lower=2.6% reset=31.3% buffer=2.5% | $49,566 | $14,096 | 15 | $12,352 | $31,969 | 17 | $9,592 | $12,767 | stable |
| pick 3 `2-e0e70e3848` | profit | X=7.2% Y=0.5% stop=4.4% hold=6 L=116 mat=1.9% lower=5.9% reset=29.0% buffer=0.0% | $42,732 | $11,389 | 23 | $29,295 | $17,401 | 22 | $26,489 | $29,327 | stable |
| pick 4 `2-fbfd3bdfd9` | balanced | X=11.6% Y=5.1% stop=4.4% hold=10 L=108 mat=1.9% lower=3.8% reset=29.8% buffer=0.0% | $31,584 | $7,380 | 5 | $8,970 | $25,226 | 10 | $8,970 | $8,753 | stable |
| pick 5 `2-90290df9ca` | balanced | X=7.0% Y=1.0% stop=4.2% hold=6 L=49 mat=2.5% lower=5.4% reset=48.9% buffer=0.0% | $41,355 | $11,367 | 20 | $40,895 | $16,627 | 24 | $37,857 | $40,938 | stable |
| pick 6 `2-15571767ba` | balanced | X=7.3% Y=6.0% stop=4.4% hold=16 L=118 mat=0.8% lower=4.3% reset=20.1% buffer=0.0% | $34,971 | $11,956 | 7 | $18,419 | $26,234 | 10 | $15,805 | $18,476 | stable |
| pick 7 `2-86033f53c5` | low-DD | X=11.6% Y=5.2% stop=4.0% hold=6 L=116 mat=1.5% lower=4.3% reset=25.7% buffer=0.1% | $12,755 | $6,525 | 7 | $3,294 | $25,090 | 12 | $3,294 | $3,458 | stable |
| pick 8 `2-d9ceeae6a6` | low-DD | X=15.7% Y=2.7% stop=5.0% hold=7 L=127 mat=1.3% lower=0.9% reset=24.4% buffer=0.1% | $17,405 | $6,760 | 4 | −$1,798 | $31,402 | 6 | −$1,798 | −$1,798 | stable |
| pick 9 `2-09c3aa3b53` | Pareto-diverse | X=11.6% Y=5.1% stop=4.0% hold=5 L=51 mat=2.0% lower=3.8% reset=33.8% buffer=0.0% | $9,492 | $6,436 | 6 | $3,720 | $23,631 | 12 | $3,720 | $3,862 | stable |
| pick 10 `2-11fdaa9b08` | Pareto-diverse | X=9.9% Y=6.1% stop=4.1% hold=6 L=134 mat=2.0% lower=5.7% reset=29.9% buffer=0.0% | $17,614 | $7,254 | 8 | $1,458 | $20,945 | 9 | $1,458 | $1,556 | stable |
| default (file Y 3%) `2-8badd65cdc` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% buffer=0.5% | $328 | $31,326 | 9 | $43,093 | $26,016 | 6 | $43,093 | $42,900 | — |
| default at Y 4% `2-4a3c9a0f49` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% buffer=0.5% | $19,743 | $19,588 | 8 | $33,137 | $31,634 | 6 | $33,137 | $32,953 | — |

Picks: median validation net $10,661, 9/10 positive, 0/10 above the family's own default ($43,093), 0/10 above allIn.ts.

### Family 3: Trailing buy, no re-entry restriction (minimum 4 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `3-9be2af84c8` | profit | X=9.9% Y=0.5% stop=4.4% hold=5 L=101 | $43,841 | $15,119 | 14 | −$2,452 | $38,227 | 19 | −$2,452 | −$2,448 | moderate |
| pick 2 `3-016effa807` | profit | X=11.4% Y=0.8% stop=6.3% hold=25 L=167 | $37,870 | $20,207 | 7 | $7,893 | $28,557 | 8 | $7,893 | $7,734 | moderate |
| pick 3 `3-44b99c0eb7` | profit | X=11.4% Y=3.5% stop=4.4% hold=6 L=117 | $32,886 | $11,863 | 7 | $3,248 | $28,021 | 12 | $3,248 | $3,073 | stable |
| pick 4 `3-27844c2530` | balanced | X=10.1% Y=5.0% stop=4.4% hold=5 L=102 | $27,364 | $8,633 | 9 | −$20,866 | $32,645 | 12 | −$20,866 | −$20,982 | stable |
| pick 5 `3-f1fae48b43` | balanced | X=7.2% Y=5.0% stop=4.4% hold=27 L=94 | $37,898 | $13,987 | 8 | $14,716 | $26,862 | 11 | $12,083 | $14,832 | moderate |
| pick 6 `3-ac703ac4bc` | balanced | X=11.4% Y=5.4% stop=5.1% hold=29 L=55 | $29,695 | $14,597 | 5 | −$719 | $29,355 | 6 | −$719 | −$709 | stable |
| pick 7 `3-7195246003` | low-DD | X=15.2% Y=2.7% stop=4.0% hold=6 L=156 | $9,961 | $5,020 | 4 | −$7,051 | $30,356 | 9 | −$7,051 | −$7,064 | stable |
| pick 8 `3-1e7bd54222` | low-DD | X=11.7% Y=5.5% stop=4.0% hold=7 L=141 | $19,466 | $7,010 | 6 | $6,678 | $23,026 | 12 | $6,678 | $6,707 | stable |
| pick 9 `3-2e32534442` | Pareto-diverse | X=7.4% Y=3.1% stop=6.2% hold=27 L=160 | $39,551 | $16,210 | 9 | $5,870 | $36,826 | 11 | $4,100 | $6,311 | moderate |
| pick 10 `3-5cfd0319a2` | Pareto-diverse | X=10.0% Y=4.9% stop=9.3% hold=13 L=152 | $31,428 | $16,947 | 7 | $25,944 | $41,312 | 7 | $25,921 | $26,210 | stable |
| default (file Y 3%) `3-a273c304e5` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 | $3,000 | $34,284 | 8 | $42,890 | $26,016 | 7 | $42,890 | $42,698 | — |
| default at Y 4% `3-3410e80353` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 | $14,163 | $21,352 | 7 | $28,770 | $34,230 | 7 | $28,770 | $28,585 | — |

Picks: median validation net $4,559, 6/10 positive, 0/10 above the family's own default ($42,890), 0/10 above allIn.ts.

### Family 4: Trailing buy + buffered loss exit, no re-entry restriction (minimum 4 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `4-7083ff750c` | profit | X=7.0% Y=1.2% stop=4.4% hold=6 L=87 buffer=0.0% | $45,589 | $13,585 | 21 | $8,645 | $44,147 | 27 | $5,868 | $8,925 | moderate |
| pick 2 `4-93dd0e38d7` | profit | X=7.1% Y=3.0% stop=6.1% hold=27 L=129 buffer=1.2% | $40,632 | $15,986 | 9 | $11,027 | $36,826 | 13 | $9,258 | $11,811 | stable |
| pick 3 `4-7197d5f888` | profit | X=7.2% Y=5.8% stop=4.4% hold=29 L=128 buffer=0.5% | $38,626 | $14,172 | 7 | $15,157 | $25,999 | 9 | $12,536 | $15,164 | stable |
| pick 4 `4-f6f6ff9ab6` | balanced | X=11.7% Y=4.0% stop=4.4% hold=6 L=134 buffer=2.9% | $32,708 | $10,231 | 6 | −$16,689 | $32,035 | 12 | −$16,689 | −$16,867 | stable |
| pick 5 `4-2a5e8e412a` | balanced | X=10.3% Y=6.1% stop=4.4% hold=6 L=140 buffer=0.1% | $25,952 | $7,577 | 8 | −$15,706 | $32,060 | 10 | −$15,706 | −$15,722 | stable |
| pick 6 `4-036c70e017` | balanced | X=7.5% Y=6.0% stop=4.4% hold=29 L=54 buffer=0.0% | $29,897 | $14,328 | 6 | $17,560 | $26,234 | 8 | $17,560 | $17,217 | stable |
| pick 7 `4-248b24efa9` | low-DD | X=11.7% Y=5.2% stop=4.0% hold=6 L=87 buffer=0.0% | $12,755 | $6,525 | 7 | −$11,893 | $30,365 | 13 | −$11,893 | −$11,727 | stable |
| pick 8 `4-6b13aa6663` | low-DD | X=10.3% Y=5.0% stop=4.2% hold=6 L=141 buffer=0.8% | $18,345 | $8,205 | 9 | −$17,990 | $30,165 | 12 | −$17,990 | −$17,750 | stable |
| pick 9 `4-e9bca27e9a` | Pareto-diverse | X=11.4% Y=5.1% stop=4.1% hold=5 L=147 buffer=0.1% | $7,815 | $7,459 | 9 | −$20,096 | $32,394 | 12 | −$20,096 | −$20,035 | stable |
| pick 10 `4-eb41af1b01` | Pareto-diverse | X=7.1% Y=1.8% stop=5.5% hold=10 L=102 buffer=1.6% | $34,548 | $20,566 | 15 | $22,182 | $41,437 | 16 | $15,445 | $21,936 | stable |
| default (file Y 3%) `4-daabce77f9` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 buffer=0.5% | $8,914 | $32,737 | 9 | $42,890 | $26,016 | 7 | $42,890 | $42,698 | — |
| default at Y 4% `4-61341a2c22` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 buffer=0.5% | $19,743 | $19,588 | 8 | $29,752 | $34,230 | 7 | $29,752 | $29,567 | — |

Picks: median validation net −$1,624, 5/10 positive, 0/10 above the family's own default ($42,890), 0/10 above allIn.ts.

## fold2: train 2016-09-20 → 2021-12-31, validate 2022-01-01 → 2022-12-31

allIn.ts on the same window: continuous −$4,315 (minute DD $25,231, 11 trades), flat start −$4,315; training $79,815.

### Family 1: Trailing buy (restricted re-entry) (minimum 6 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `1-d51bac08f4` | profit | X=11.4% Y=0.8% stop=9.8% hold=6 L=59 mat=2.5% lower=5.9% reset=69.3% | $125,362 | $30,408 | 14 | −$10,142 | $22,869 | 16 | $1,328 | −$10,245 | stable |
| pick 2 `1-3095db79cc` | profit | X=11.9% Y=1.3% stop=9.8% hold=6 L=58 mat=2.8% lower=5.8% reset=66.3% | $114,151 | $29,521 | 10 | −$16,816 | $29,721 | 14 | −$5,404 | −$16,919 | stable |
| pick 3 `1-c9740c96ec` | profit | X=11.2% Y=0.9% stop=7.3% hold=12 L=64 mat=2.4% lower=5.9% reset=57.7% | $99,378 | $20,390 | 14 | $7,366 | $21,726 | 15 | $7,366 | $7,303 | stable |
| pick 4 `1-c3e6be6614` | balanced | X=9.7% Y=0.5% stop=4.4% hold=8 L=129 mat=0.5% lower=5.9% reset=49.4% | $88,034 | $14,400 | 23 | −$3,851 | $23,224 | 15 | −$3,851 | −$3,845 | stable |
| pick 5 `1-88b856c331` | balanced | X=11.6% Y=1.3% stop=7.3% hold=12 L=81 mat=2.4% lower=5.8% reset=57.9% | $90,251 | $19,243 | 13 | $1,096 | $19,751 | 16 | $1,096 | $993 | stable |
| pick 6 `1-ac1d35cce2` | balanced | X=9.4% Y=0.6% stop=4.6% hold=10 L=138 mat=1.0% lower=5.3% reset=48.5% | $82,347 | $17,410 | 25 | $10,497 | $19,625 | 16 | $10,497 | $9,793 | stable |
| pick 7 `1-f5312f2de6` | low-DD | X=19.3% Y=0.6% stop=4.1% hold=11 L=132 mat=1.3% lower=4.6% reset=47.7% | $36,175 | $10,710 | 8 | $22,738 | $14,768 | 11 | $22,738 | $22,655 | stable |
| pick 8 `1-809cc46e63` | low-DD | X=16.9% Y=0.6% stop=4.1% hold=13 L=45 mat=0.8% lower=5.6% reset=33.0% | $32,967 | $10,710 | 10 | $5,380 | $21,565 | 8 | $5,380 | $5,124 | stable |
| pick 9 `1-479146c78d` | Pareto-diverse | X=17.4% Y=0.6% stop=4.1% hold=13 L=45 mat=0.8% lower=5.6% reset=32.9% | $27,147 | $10,710 | 8 | $11,094 | $15,850 | 8 | $11,094 | $10,839 | stable |
| pick 10 `1-4f4f26e147` | Pareto-diverse | X=19.3% Y=0.6% stop=4.1% hold=15 L=45 mat=0.8% lower=5.6% reset=33.1% | $21,640 | $10,710 | 6 | $18,461 | $11,997 | 6 | $18,461 | $18,281 | stable |
| default (file Y 4%) `1-ea7ddf46c0` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% | $47,299 | $33,407 | 13 | −$30,725 | $47,024 | 10 | −$30,725 | −$30,569 | — |
| default at Y 3% `1-58c2a4ea73` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% | $37,506 | $41,720 | 14 | −$27,019 | $43,189 | 11 | −$27,019 | −$26,795 | — |

Picks: median validation net $6,373, 7/10 positive, 10/10 above the family's own default (−$30,725), 8/10 above allIn.ts.

### Family 2: Trailing buy + buffered loss exit (restricted re-entry) (minimum 6 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `2-445705c107` | profit | X=8.4% Y=0.5% stop=7.3% hold=10 L=126 mat=1.8% lower=6.0% reset=42.6% buffer=2.0% | $120,835 | $34,496 | 24 | −$50,160 | $51,238 | 13 | −$43,584 | −$50,260 | stable |
| pick 2 `2-7bebdccf95` | profit | X=11.2% Y=0.5% stop=9.8% hold=8 L=130 mat=0.9% lower=5.8% reset=59.4% buffer=1.9% | $102,482 | $30,122 | 11 | −$13,665 | $25,057 | 13 | −$2,277 | −$13,768 | stable |
| pick 3 `2-8042765b4c` | profit | X=10.8% Y=1.3% stop=10.0% hold=6 L=71 mat=1.4% lower=5.9% reset=58.5% buffer=2.9% | $99,743 | $30,175 | 12 | −$15,754 | $28,846 | 13 | −$5,804 | −$15,864 | stable |
| pick 4 `2-04861228a3` | balanced | X=7.4% Y=0.6% stop=4.1% hold=10 L=127 mat=2.0% lower=5.9% reset=43.0% buffer=2.0% | $96,932 | $16,515 | 34 | −$12,286 | $38,305 | 19 | −$12,286 | −$12,357 | stable |
| pick 5 `2-ed40981aec` | balanced | X=7.3% Y=0.5% stop=4.1% hold=11 L=127 mat=1.8% lower=5.3% reset=42.6% buffer=2.0% | $83,279 | $16,214 | 33 | −$20,328 | $39,709 | 19 | −$20,328 | −$20,378 | stable |
| pick 6 `2-67249abd17` | balanced | X=8.1% Y=0.8% stop=4.5% hold=10 L=152 mat=0.5% lower=5.9% reset=37.2% buffer=2.0% | $80,182 | $16,719 | 28 | $5,337 | $20,402 | 18 | $5,337 | $5,323 | stable |
| pick 7 `2-9d4c0b1f13` | low-DD | X=19.5% Y=0.6% stop=4.1% hold=12 L=106 mat=1.7% lower=5.9% reset=38.4% buffer=1.4% | $36,175 | $10,710 | 8 | $22,278 | $16,979 | 11 | $22,278 | $22,201 | stable |
| pick 8 `2-08014cae8e` | low-DD | X=17.2% Y=0.6% stop=4.1% hold=9 L=47 mat=2.0% lower=5.2% reset=37.6% buffer=2.0% | $26,546 | $10,710 | 8 | $9,385 | $14,699 | 8 | $9,385 | $9,162 | stable |
| pick 9 `2-7950936ad4` | Pareto-diverse | X=19.2% Y=0.6% stop=4.1% hold=13 L=45 mat=2.9% lower=5.2% reset=40.3% buffer=0.9% | $21,640 | $10,710 | 6 | $18,788 | $10,978 | 7 | $18,788 | $18,609 | stable |
| pick 10 `2-6738d32176` | Pareto-diverse | X=19.6% Y=0.6% stop=4.0% hold=13 L=52 mat=0.6% lower=0.8% reset=57.4% buffer=1.9% | $19,678 | $10,710 | 7 | $18,154 | $13,109 | 8 | $18,154 | $18,137 | stable |
| default (file Y 3%) `2-8badd65cdc` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% buffer=0.5% | $43,421 | $40,173 | 15 | −$29,927 | $45,620 | 12 | −$29,927 | −$29,862 | — |
| default at Y 4% `2-4a3c9a0f49` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% buffer=0.5% | $52,879 | $33,407 | 14 | −$19,985 | $38,461 | 10 | −$19,985 | −$19,829 | — |

Picks: median validation net −$3,475, 5/10 positive, 9/10 above the family's own default (−$29,927), 5/10 above allIn.ts.

### Family 3: Trailing buy, no re-entry restriction (minimum 6 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `3-efd13fe233` | profit | X=11.2% Y=0.7% stop=9.8% hold=15 L=114 | $112,123 | $33,847 | 13 | −$47,734 | $55,164 | 15 | −$36,252 | −$47,837 | stable |
| pick 2 `3-3a84883e34` | profit | X=11.1% Y=1.4% stop=10.4% hold=22 L=136 | $87,032 | $37,849 | 11 | −$45,916 | $52,358 | 11 | −$33,680 | −$46,121 | stable |
| pick 3 `3-e5f4f32453` | profit | X=11.6% Y=0.5% stop=10.0% hold=15 L=177 | $82,982 | $33,331 | 12 | −$46,680 | $54,109 | 15 | −$34,906 | −$46,791 | stable |
| pick 4 `3-a679ffb466` | balanced | X=7.9% Y=0.6% stop=4.4% hold=11 L=174 | $75,308 | $22,320 | 34 | −$28,277 | $47,793 | 25 | −$28,277 | −$28,843 | stable |
| pick 5 `3-ba1b60c8c4` | balanced | X=7.1% Y=0.5% stop=4.1% hold=11 L=137 | $88,441 | $16,830 | 38 | −$41,479 | $54,089 | 27 | −$41,479 | −$41,602 | moderate |
| pick 6 `3-004fafa5ca` | balanced | X=11.1% Y=1.0% stop=7.9% hold=15 L=100 | $82,151 | $29,805 | 14 | −$27,579 | $39,821 | 15 | −$27,579 | −$27,692 | stable |
| pick 7 `3-a04be963e6` | low-DD | X=19.2% Y=0.6% stop=4.1% hold=12 L=59 | $36,666 | $10,710 | 8 | $21,150 | $16,086 | 10 | $21,150 | $20,969 | moderate |
| pick 8 `3-a78b78cf37` | low-DD | X=17.1% Y=0.6% stop=4.0% hold=23 L=49 | $26,348 | $10,710 | 9 | $11,302 | $22,268 | 8 | $11,302 | $11,302 | stable |
| pick 9 `3-0ee44631c3` | Pareto-diverse | X=9.0% Y=3.7% stop=9.7% hold=12 L=49 | $79,892 | $31,680 | 15 | −$40,721 | $44,966 | 12 | −$40,474 | −$40,717 | stable |
| pick 10 `3-2ad67b31df` | Pareto-diverse | X=18.8% Y=0.6% stop=4.0% hold=8 L=104 | $16,828 | $10,710 | 9 | $17,528 | $16,433 | 16 | $17,528 | $17,587 | stable |
| default (file Y 3%) `3-a273c304e5` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 | $45,890 | $34,284 | 15 | −$27,755 | $40,735 | 13 | −$27,755 | −$27,690 | — |
| default at Y 4% `3-3410e80353` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 | $42,933 | $36,003 | 14 | −$21,564 | $33,457 | 11 | −$21,564 | −$21,564 | — |

Picks: median validation net −$34,499, 3/10 positive, 4/10 above the family's own default (−$27,755), 3/10 above allIn.ts.

### Family 4: Trailing buy + buffered loss exit, no re-entry restriction (minimum 6 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `4-ad983e4eb8` | profit | X=11.1% Y=0.7% stop=9.8% hold=15 L=64 buffer=1.0% | $113,130 | $33,847 | 14 | −$41,147 | $49,181 | 15 | −$29,664 | −$41,249 | stable |
| pick 2 `4-42482ca364` | profit | X=11.9% Y=0.6% stop=9.8% hold=22 L=49 buffer=0.8% | $106,214 | $38,529 | 10 | −$38,365 | $50,220 | 11 | −$26,882 | −$38,466 | moderate |
| pick 3 `4-6de050f84f` | profit | X=9.6% Y=0.8% stop=7.3% hold=15 L=92 buffer=0.3% | $91,933 | $29,620 | 18 | −$25,424 | $37,983 | 16 | −$25,424 | −$25,382 | stable |
| pick 4 `4-d7259f7c95` | balanced | X=7.1% Y=0.5% stop=4.1% hold=11 L=100 buffer=1.2% | $88,441 | $16,830 | 38 | −$41,479 | $54,089 | 27 | −$41,479 | −$41,602 | moderate |
| pick 5 `4-dc5805ad15` | balanced | X=7.5% Y=0.6% stop=4.4% hold=11 L=127 buffer=2.6% | $71,518 | $22,320 | 33 | −$28,277 | $47,793 | 25 | −$28,277 | −$28,843 | stable |
| pick 6 `4-ab5f0743e0` | balanced | X=9.6% Y=0.8% stop=4.4% hold=7 L=129 buffer=0.0% | $73,167 | $18,915 | 33 | −$25,862 | $48,011 | 34 | −$25,862 | −$26,490 | moderate |
| pick 7 `4-4ca2a3c242` | low-DD | X=19.7% Y=0.6% stop=4.1% hold=13 L=93 buffer=1.5% | $36,175 | $10,710 | 8 | $17,237 | $18,965 | 12 | $17,237 | $17,160 | stable |
| pick 8 `4-372b30f414` | low-DD | X=17.8% Y=0.6% stop=4.1% hold=5 L=87 buffer=0.0% | $32,781 | $10,710 | 12 | $23,285 | $13,235 | 23 | $23,285 | $23,060 | stable |
| pick 9 `4-85a04f7b52` | Pareto-diverse | X=10.9% Y=0.5% stop=7.3% hold=15 L=161 buffer=1.7% | $90,050 | $28,054 | 15 | −$23,840 | $33,454 | 15 | −$23,840 | −$23,798 | stable |
| pick 10 `4-2d4966393c` | Pareto-diverse | X=11.7% Y=0.5% stop=7.3% hold=15 L=57 buffer=0.8% | $86,624 | $28,177 | 14 | −$15,186 | $28,602 | 15 | −$15,186 | −$15,195 | stable |
| default (file Y 3%) `4-daabce77f9` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 buffer=0.5% | $51,804 | $32,737 | 16 | −$16,006 | $33,781 | 13 | −$16,006 | −$15,785 | — |
| default at Y 4% `4-61341a2c22` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 buffer=0.5% | $49,495 | $36,003 | 15 | −$18,084 | $32,155 | 11 | −$18,084 | −$18,084 | — |

Picks: median validation net −$25,643, 2/10 positive, 3/10 above the family's own default (−$16,006), 2/10 above allIn.ts.

## fold3: train 2016-09-20 → 2022-12-31, validate 2023-01-01 → 2023-12-31

allIn.ts on the same window: continuous $43,693 (minute DD $15,994, 3 trades), flat start $43,291; training $75,499.

### Family 1: Trailing buy (restricted re-entry) (minimum 7 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `1-24f64083ad` | profit | X=7.1% Y=1.2% stop=4.5% hold=11 L=65 mat=2.3% lower=5.9% reset=41.4% | $102,366 | $20,250 | 48 | $9,284 | $13,734 | 5 | $8,859 | $9,285 | stable |
| pick 2 `1-0417565029` | profit | X=7.1% Y=1.2% stop=7.3% hold=10 L=72 mat=1.3% lower=5.8% reset=66.4% | $114,897 | $34,711 | 36 | $16,426 | $14,436 | 2 | $3,979 | $16,431 | moderate |
| pick 3 `1-37979fd0ee` | profit | X=11.5% Y=1.3% stop=7.3% hold=12 L=54 mat=0.8% lower=5.9% reset=54.8% | $93,491 | $19,470 | 28 | $5,272 | $11,486 | 2 | $4,380 | $5,292 | stable |
| pick 4 `1-493463b7bc` | balanced | X=19.8% Y=0.6% stop=4.9% hold=8 L=70 mat=0.6% lower=5.3% reset=56.5% | $81,003 | $13,075 | 16 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 5 `1-8da0acae42` | balanced | X=11.1% Y=0.9% stop=4.1% hold=8 L=73 mat=1.3% lower=5.8% reset=63.3% | $75,559 | $15,203 | 34 | −$2,792 | $5,698 | 2 | $7,872 | −$2,792 | stable |
| pick 6 `1-af1dde5887` | balanced | X=17.7% Y=0.5% stop=4.5% hold=11 L=67 mat=2.3% lower=5.2% reset=40.5% | $67,241 | $13,075 | 18 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 7 `1-8a70fcf587` | low-DD | X=19.8% Y=0.6% stop=4.0% hold=12 L=64 mat=0.6% lower=5.5% reset=63.0% | $58,855 | $10,710 | 16 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 8 `1-54e24a0862` | low-DD | X=20.0% Y=0.6% stop=4.1% hold=7 L=71 mat=0.9% lower=5.8% reset=63.0% | $31,351 | $10,710 | 17 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 9 `1-03f701c9db` | Pareto-diverse | X=20.0% Y=0.6% stop=4.1% hold=12 L=57 mat=0.9% lower=5.6% reset=46.8% | $49,821 | $10,710 | 15 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 10 `1-f142d4e416` | Pareto-diverse | X=19.5% Y=0.5% stop=4.1% hold=6 L=67 mat=0.6% lower=6.0% reset=52.9% | $23,338 | $10,711 | 16 | $0 | $0 | 0 | $0 | $0 | stable |
| default (file Y 4%) `1-ea7ddf46c0` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% | $16,574 | $50,277 | 23 | $36,318 | $16,170 | 4 | $36,422 | $36,318 | — |
| default at Y 3% `1-58c2a4ea73` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% | $10,488 | $44,659 | 25 | $13,175 | $8,396 | 3 | $41,346 | $13,175 | — |

Picks: median validation net $0, 3/10 positive, 0/10 above the family's own default ($36,318), 0/10 above allIn.ts.

### Family 2: Trailing buy + buffered loss exit (restricted re-entry) (minimum 7 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `2-2c65332ced` | profit | X=11.3% Y=0.5% stop=7.3% hold=10 L=56 mat=0.5% lower=5.8% reset=52.0% buffer=2.9% | $123,442 | $24,772 | 27 | $4,242 | $11,459 | 2 | $4,764 | $4,261 | stable |
| pick 2 `2-0ab57ddfce` | profit | X=9.7% Y=1.0% stop=7.3% hold=10 L=64 mat=0.6% lower=5.8% reset=56.0% buffer=2.2% | $101,993 | $31,237 | 30 | −$1,915 | $11,002 | 2 | $4,613 | −$1,915 | stable |
| pick 3 `2-52482f6fcc` | profit | X=13.3% Y=0.9% stop=7.3% hold=12 L=58 mat=0.6% lower=5.9% reset=67.9% buffer=2.9% | $102,472 | $20,659 | 20 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 4 `2-86842ead12` | balanced | X=11.6% Y=1.2% stop=7.3% hold=12 L=58 mat=0.6% lower=5.9% reset=69.7% buffer=2.7% | $100,631 | $19,717 | 27 | $5,099 | $11,356 | 2 | $4,829 | $5,119 | stable |
| pick 5 `2-2893def6a1` | balanced | X=11.3% Y=0.5% stop=4.9% hold=10 L=54 mat=0.6% lower=5.8% reset=62.6% buffer=2.5% | $92,818 | $18,877 | 32 | $7,678 | $8,023 | 2 | $8,179 | $7,687 | stable |
| pick 6 `2-0316e19b7e` | balanced | X=19.9% Y=0.5% stop=4.9% hold=10 L=66 mat=0.6% lower=5.1% reset=40.6% buffer=2.4% | $80,273 | $13,075 | 16 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 7 `2-3737973e02` | low-DD | X=20.0% Y=0.7% stop=4.0% hold=10 L=65 mat=1.0% lower=5.8% reset=66.5% buffer=0.8% | $60,188 | $11,117 | 16 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 8 `2-182a5b933f` | low-DD | X=19.4% Y=0.6% stop=4.1% hold=10 L=69 mat=1.3% lower=5.9% reset=59.9% buffer=0.0% | $69,564 | $10,710 | 17 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 9 `2-13304b2120` | Pareto-diverse | X=11.3% Y=0.6% stop=9.8% hold=8 L=63 mat=1.4% lower=5.4% reset=59.1% buffer=2.2% | $113,426 | $31,388 | 25 | $42,621 | $16,877 | 3 | $42,621 | $42,621 | stable |
| pick 10 `2-2f2d4d656d` | Pareto-diverse | X=11.2% Y=0.7% stop=7.3% hold=11 L=63 mat=0.6% lower=5.9% reset=68.8% buffer=2.7% | $92,281 | $25,086 | 23 | −$1,803 | $6,860 | 1 | $5,045 | −$1,803 | stable |
| default (file Y 3%) `2-8badd65cdc` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% buffer=0.5% | $13,494 | $45,620 | 27 | $13,884 | $8,160 | 3 | $42,055 | $13,884 | — |
| default at Y 4% `2-4a3c9a0f49` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% buffer=0.5% | $32,894 | $39,537 | 24 | $36,318 | $16,170 | 4 | $36,422 | $36,318 | — |

Picks: median validation net $0, 4/10 positive, 1/10 above the family's own default ($13,884), 0/10 above allIn.ts.

### Family 3: Trailing buy, no re-entry restriction (minimum 7 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `3-0d58cc98b2` | profit | X=20.0% Y=0.5% stop=7.3% hold=11 L=68 | $94,933 | $26,735 | 14 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 2 `3-97690e4cc3` | profit | X=20.0% Y=1.2% stop=4.7% hold=11 L=69 | $74,539 | $13,871 | 17 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 3 `3-57c535aa5b` | profit | X=17.8% Y=0.9% stop=7.3% hold=11 L=48 | $76,664 | $24,751 | 13 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 4 `3-73394cdb2f` | balanced | X=20.0% Y=0.6% stop=4.0% hold=18 L=54 | $55,919 | $12,449 | 14 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 5 `3-afb9f566b6` | balanced | X=16.9% Y=0.7% stop=5.0% hold=5 L=68 | $67,777 | $18,696 | 30 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 6 `3-29bf989ab6` | balanced | X=20.0% Y=0.5% stop=7.3% hold=11 L=58 | $74,097 | $21,975 | 13 | $0 | $0 | 0 | $0 | $0 | moderate |
| pick 7 `3-4bf02ab06f` | low-DD | X=19.1% Y=0.6% stop=4.0% hold=5 L=70 | $57,597 | $10,710 | 26 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 8 `3-039548f590` | low-DD | X=19.1% Y=0.6% stop=4.1% hold=5 L=49 | $41,048 | $10,710 | 22 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 9 `3-54e8230659` | Pareto-diverse | X=11.4% Y=0.7% stop=7.3% hold=8 L=47 | $74,365 | $29,589 | 36 | $25,828 | $9,935 | 2 | $25,828 | $25,848 | moderate |
| pick 10 `3-b9b7f9cf1c` | Pareto-diverse | X=20.0% Y=0.6% stop=4.1% hold=29 L=45 | $35,760 | $10,710 | 12 | $0 | $0 | 0 | $0 | $0 | stable |
| default (file Y 3%) `3-a273c304e5` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 | $18,134 | $40,846 | 28 | $39,973 | $15,281 | 4 | $41,346 | $39,973 | — |
| default at Y 4% `3-3410e80353` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 | $21,369 | $37,263 | 25 | $36,318 | $16,170 | 4 | $36,422 | $36,318 | — |

Picks: median validation net $0, 1/10 positive, 0/10 above the family's own default ($39,973), 0/10 above allIn.ts.

### Family 4: Trailing buy + buffered loss exit, no re-entry restriction (minimum 7 training entries)

| Contender | Category | Parameters | Train net | Train minute DD | Train trades | Validation net | Validation minute DD | Validation trades | Flat-start net | next-open net | Robustness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `4-858939f2f4` | profit | X=20.0% Y=0.5% stop=7.3% hold=11 L=68 buffer=0.2% | $96,147 | $26,735 | 14 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 2 `4-ac8c9b0f5c` | profit | X=20.0% Y=1.2% stop=4.7% hold=11 L=70 buffer=0.4% | $74,539 | $13,871 | 17 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 3 `4-8812e62d4b` | profit | X=11.6% Y=0.6% stop=7.7% hold=18 L=53 buffer=0.6% | $69,065 | $37,752 | 24 | $4,964 | $11,442 | 1 | $5,898 | $4,929 | stable |
| pick 4 `4-a30ce6168d` | balanced | X=16.9% Y=1.2% stop=4.1% hold=13 L=56 buffer=0.5% | $68,107 | $13,871 | 22 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 5 `4-5c17c70046` | balanced | X=16.9% Y=0.6% stop=4.1% hold=14 L=82 buffer=1.1% | $63,831 | $18,724 | 26 | −$1,419 | $3,385 | 0 | $0 | −$1,419 | stable |
| pick 6 `4-50befd4809` | balanced | X=17.9% Y=0.8% stop=5.0% hold=15 L=61 buffer=2.2% | $57,443 | $16,138 | 17 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 7 `4-e53b0e701b` | low-DD | X=20.0% Y=0.6% stop=4.0% hold=5 L=57 buffer=0.4% | $39,015 | $10,710 | 22 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 8 `4-457994e8bb` | low-DD | X=20.0% Y=0.6% stop=4.0% hold=5 L=73 buffer=0.5% | $57,513 | $10,710 | 25 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 9 `4-a84e020945` | Pareto-diverse | X=20.0% Y=0.6% stop=4.1% hold=11 L=45 buffer=0.4% | $37,141 | $10,710 | 13 | $0 | $0 | 0 | $0 | $0 | stable |
| pick 10 `4-23a0c36afb` | Pareto-diverse | X=20.0% Y=0.5% stop=4.1% hold=5 L=50 buffer=0.5% | $37,469 | $11,211 | 18 | $0 | $0 | 0 | $0 | $0 | moderate |
| default (file Y 3%) `4-daabce77f9` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 buffer=0.5% | $35,798 | $33,781 | 29 | $40,682 | $15,044 | 4 | $42,055 | $40,682 | — |
| default at Y 4% `4-61341a2c22` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 buffer=0.5% | $31,411 | $36,003 | 26 | $36,318 | $16,170 | 4 | $36,422 | $36,318 | — |

Picks: median validation net $0, 1/10 positive, 0/10 above the family's own default ($40,682), 0/10 above allIn.ts.

## Stitched pre-declared policies, 2020-01-02 → 2023-12-29

Each window uses the pick made on the preceding training data only (fold 1 → 2020–2021, fold 2 → 2022, fold 3 → 2023). Totals add the three windows; "worst DD" is the largest window minute drawdown.

| Policy | 2020–2021 | 2022 | 2023 | Total 2020–2023 | Worst window minute DD |
| --- | --- | --- | --- | --- | --- |
| 1 profit #1 | $20,155 | −$10,142 | $9,284 | $19,298 | $32,624 |
| 1 balanced #1 | $31,698 | −$3,851 | $0 | $27,847 | $25,913 |
| 1 low-DD #1 | $5,764 | $22,738 | $0 | $28,502 | $24,607 |
| 1 median of 10 | $20,477 | $6,373 | $0 | $26,850 | $25,317 |
| 1 default (own Y) | $33,137 | −$30,725 | $36,318 | $38,730 | $47,024 |
| 2 profit #1 | $15,995 | −$50,160 | $4,242 | −$29,924 | $51,238 |
| 2 balanced #1 | $8,970 | −$12,286 | $5,099 | $1,783 | $38,305 |
| 2 low-DD #1 | $3,294 | $22,278 | $0 | $25,572 | $25,090 |
| 2 median of 10 | $10,661 | −$3,475 | $0 | $7,187 | $25,158 |
| 2 default (own Y) | $43,093 | −$29,927 | $13,884 | $27,049 | $45,620 |
| 3 profit #1 | −$2,452 | −$47,734 | $0 | −$50,186 | $55,164 |
| 3 balanced #1 | −$20,866 | −$28,277 | $0 | −$49,143 | $47,793 |
| 3 low-DD #1 | −$7,051 | $21,150 | $0 | $14,099 | $30,356 |
| 3 median of 10 | $4,559 | −$34,499 | $0 | −$29,940 | $46,380 |
| 3 default (own Y) | $42,890 | −$27,755 | $39,973 | $55,107 | $40,735 |
| 4 profit #1 | $8,645 | −$41,147 | $0 | −$32,502 | $49,181 |
| 4 balanced #1 | −$16,689 | −$41,479 | $0 | −$58,168 | $54,089 |
| 4 low-DD #1 | −$11,893 | $17,237 | $0 | $5,344 | $30,365 |
| 4 median of 10 | −$1,624 | −$25,643 | $0 | −$27,267 | $42,888 |
| 4 default (own Y) | $42,890 | −$16,006 | $40,682 | $67,566 | $33,781 |
| allIn.ts | $55,393 | −$4,315 | $43,693 | $94,771 | $25,231 |
