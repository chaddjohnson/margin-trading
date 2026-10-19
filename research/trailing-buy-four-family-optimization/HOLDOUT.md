# Frozen holdout: 2024-01-02 → 2025-10-13

Evaluated **once** (attempt 1; 1 attempt record(s)) on the freeze `6b795f138b09ccc0d390f74ebb54e96810bb85147a2f7197a62f69c5ef2b4c71` (frozen 2026-10-19T13:26:27.497Z). No pick, rule or threshold was changed afterwards. Data through 2025-10-13, the last date in the file. This interval is chronologically withheld, not pristine: earlier research in this repository inspected prominent 2025 trades.

Full-file parity of the four unmodified files at their defaults was repeated first: 8/8 passed (max profit difference 0).

## Findings

- **0 of 40 frozen picks beat `allIn.ts` ($48,432).** The same holds with `next-open` fills ($48,455), at 8%
  ($53,602) and at 14% ($43,262), and with a flat start ($49,411).
- **6 of 40 beat their own family default**, all in the no-reentry families: 3/10 in family 3 and 3/10 in family
  4. The restricted families' picks beat none.

  | Family | Median of picks | Picks with positive net | File default |
  |---|---|---|---|
  | 1 | −$5,627 | 4/10 | $43,163 |
  | 2 | $15,902 | 9/10 | $43,204 |
  | 3 | $21,986 | 10/10 | $27,566 |
  | 4 | $20,553 | 10/10 | $28,932 |
- **Concentration.** 27 of the 33 picks with positive holdout net made at least 90% of it on their single best
  trade. For the picks' median, April 2025 contributed $5.0k–$7.4k per family. The 16 deep-dip picks (X ≥ 19%)
  traded 2–5 times in 21 months; April 2025 alone supplied 16%–56% of their holdout net, about half for 12 of
  them.
- **Flat start vs continuous.** For families 1 and 2, positions carried in from late 2023 lost money, so a flat
  start on 2024-01-02 raised the typical pick's holdout net (median change $3.5k and $5.6k). For families 3
  and 4 the median change was $0.
- **2024 alone** (no April-2025-type event): the picks' median was −$3.1k, $0.2k, $0.0k and $0.0k for families
  1–4, against the defaults' $17.2k, $14.2k, $12.2k and $13.6k and `allIn.ts`'s $21.5k.


allIn.ts (immediate entry, same dates and conventions): holdout net $48,432, minute DD $32,084, daily DD $28,542, 6 trades; flat start $49,411; next-open $48,455; April 2025 $2,572.

## Family 1: Trailing buy (restricted re-entry)

| Contender | Category | Parameters | Net | Minute DD | Daily DD | Interest | Trades | W / L | Best-trade share | April 2025 | Flat start | next-open | 8% rate | 14% rate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `1-417da6b3de` | profit | X=11.4% Y=0.6% stop=9.8% hold=8 L=60 mat=1.4% lower=5.4% reset=68.0% | −$6,741 | $31,672 | $27,939 | $9,433 | 4 | 3 / 2 | n/a (net ≤ 0) | −$1,850 | −$3,376 | −$7,054 | −$4,169 | −$9,314 |
| pick 2 `1-3a57558dcd` | profit | X=11.6% Y=0.6% stop=7.8% hold=13 L=60 mat=1.5% lower=5.9% reset=60.8% | $41,501 | $28,733 | $25,107 | $15,159 | 5 | 2 / 3 | 99% | $2,531 | $42,174 | $41,596 | $45,635 | $39,090 |
| pick 3 `1-6c793a656e` | profit | X=11.3% Y=0.6% stop=10.0% hold=6 L=62 mat=1.4% lower=5.9% reset=65.6% | −$22,835 | $33,711 | $32,145 | $3,978 | 3 | 1 / 3 | n/a (net ≤ 0) | −$16,174 | −$19,205 | −$22,825 | −$21,751 | −$23,920 |
| pick 4 `1-75f7ace2a7` | balanced | X=7.1% Y=0.5% stop=4.5% hold=11 L=63 mat=1.7% lower=5.3% reset=65.5% | −$4,512 | $37,549 | $33,395 | $5,123 | 11 | 7 / 5 | n/a (net ≤ 0) | $8,868 | $163 | −$4,523 | −$3,115 | −$5,909 |
| pick 5 `1-bf41eae7fb` | balanced | X=7.0% Y=0.6% stop=4.1% hold=11 L=58 mat=0.7% lower=5.3% reset=66.6% | −$9,438 | $38,521 | $34,746 | $4,219 | 10 | 6 / 5 | n/a (net ≤ 0) | $9,726 | −$4,986 | −$9,370 | −$8,288 | −$10,589 |
| pick 6 `1-af159a63f3` | balanced | X=7.1% Y=1.3% stop=4.5% hold=11 L=63 mat=1.7% lower=5.3% reset=65.5% | −$30,236 | $44,735 | $40,885 | $3,858 | 8 | 3 / 6 | n/a (net ≤ 0) | −$7,019 | −$25,592 | −$30,006 | −$29,184 | −$31,288 |
| pick 7 `1-5d5ba8155b` | low-DD | X=18.9% Y=0.6% stop=4.0% hold=9 L=58 mat=1.5% lower=5.5% reset=69.1% | $16,125 | $13,439 | $8,809 | $1,447 | 3 | 3 / 0 | 97% | $8,661 | $16,125 | $16,125 | $16,520 | $15,731 |
| pick 8 `1-77a7561333` | low-DD | X=19.3% Y=0.6% stop=4.1% hold=9 L=67 mat=1.6% lower=5.6% reset=56.8% | $14,910 | $13,439 | $8,809 | $1,477 | 2 | 1 / 1 | 105% | $7,446 | $14,910 | $14,910 | $16,477 | $14,507 |
| pick 9 `1-0d0d1498c2` | Pareto-diverse | X=19.4% Y=0.6% stop=4.1% hold=9 L=104 mat=1.5% lower=5.3% reset=52.3% | $14,910 | $13,439 | $8,809 | $1,477 | 2 | 1 / 1 | 105% | $7,446 | $14,910 | $14,910 | $16,477 | $14,507 |
| pick 10 `1-bf9654320c` | Pareto-diverse | X=7.0% Y=1.4% stop=5.2% hold=11 L=70 mat=2.8% lower=5.0% reset=68.8% | −$34,366 | $47,362 | $43,517 | $4,159 | 9 | 3 / 7 | n/a (net ≤ 0) | −$7,009 | −$28,667 | −$34,535 | −$33,101 | −$35,500 |
| default (file Y 4%) `1-ea7ddf46c0` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% | $43,163 | $34,324 | $30,814 | $17,781 | 6 | 3 / 3 | 103% | $1,448 | $44,162 | $43,184 | $48,012 | $38,314 |
| default at Y 3% `1-58c2a4ea73` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% | $43,204 | $36,190 | $32,457 | $17,811 | 6 | 3 / 3 | 106% | $6,116 | $44,181 | $43,225 | $48,061 | $38,346 |

"Trades" counts entries in the holdout; "W / L" counts exits in it, including a position carried in from 2023.

Picks: median −$5,627, mean −$2,068, 4/10 positive, 0/10 above the own default ($43,163), 0/10 above allIn.ts ($48,432).

## Family 2: Trailing buy + buffered loss exit (restricted re-entry)

| Contender | Category | Parameters | Net | Minute DD | Daily DD | Interest | Trades | W / L | Best-trade share | April 2025 | Flat start | next-open | 8% rate | 14% rate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `2-3ee5816ff2` | profit | X=7.3% Y=1.4% stop=4.9% hold=13 L=62 mat=2.7% lower=5.9% reset=67.9% buffer=0.2% | $19,193 | $29,587 | $25,742 | $9,192 | 9 | 6 / 4 | 156% | $6,800 | $24,796 | $19,296 | $21,238 | $16,687 |
| pick 2 `2-cb71dc593a` | profit | X=7.0% Y=1.4% stop=6.6% hold=13 L=94 mat=2.7% lower=5.9% reset=51.2% buffer=0.0% | $33,836 | $40,367 | $36,479 | $14,225 | 9 | 2 / 7 | 127% | $5,855 | $32,960 | $33,824 | $37,418 | $30,227 |
| pick 3 `2-5ee65e820a` | profit | X=7.1% Y=1.6% stop=5.3% hold=13 L=69 mat=2.1% lower=5.3% reset=54.7% buffer=2.8% | $24,601 | $31,482 | $27,325 | $9,192 | 8 | 4 / 5 | 111% | $11,471 | $30,284 | $24,848 | $27,496 | $22,660 |
| pick 4 `2-fd986c849f` | balanced | X=11.6% Y=0.6% stop=5.1% hold=8 L=60 mat=1.1% lower=5.3% reset=66.4% buffer=2.7% | $33,022 | $24,989 | $19,690 | $8,468 | 7 | 6 / 2 | 90% | $7,335 | $38,767 | $32,890 | $35,331 | $30,712 |
| pick 5 `2-b9d1ab3d43` | balanced | X=11.3% Y=0.6% stop=4.8% hold=8 L=63 mat=1.1% lower=5.9% reset=67.0% buffer=2.6% | −$5,908 | $23,212 | $19,234 | $2,622 | 4 | 3 / 2 | n/a (net ≤ 0) | −$1,850 | −$235 | −$5,908 | −$5,193 | −$6,623 |
| pick 6 `2-2c188c3dec` | balanced | X=11.4% Y=0.5% stop=5.0% hold=8 L=48 mat=0.5% lower=6.0% reset=55.1% buffer=0.9% | $2,088 | $23,641 | $19,906 | $4,792 | 4 | 3 / 2 | 554% | −$1,777 | $7,829 | $2,218 | $3,395 | $781 |
| pick 7 `2-58ccfaf7dc` | low-DD | X=19.3% Y=0.6% stop=4.1% hold=10 L=71 mat=0.5% lower=5.8% reset=53.8% buffer=0.6% | $14,910 | $13,439 | $8,809 | $1,477 | 2 | 1 / 1 | 105% | $7,446 | $14,910 | $14,910 | $16,477 | $14,507 |
| pick 8 `2-85c5ae0705` | low-DD | X=20.0% Y=0.5% stop=4.1% hold=10 L=153 mat=0.5% lower=6.0% reset=49.8% buffer=1.4% | $15,678 | $13,449 | $8,741 | $1,447 | 3 | 3 / 0 | 95% | $8,273 | $15,678 | $15,786 | $16,072 | $13,729 |
| pick 9 `2-1e9be06c31` | Pareto-diverse | X=7.1% Y=0.7% stop=5.1% hold=13 L=61 mat=1.1% lower=5.3% reset=68.7% buffer=2.6% | $8,408 | $38,509 | $35,015 | $6,932 | 8 | 4 / 5 | 410% | $7,375 | $14,150 | $8,295 | $10,299 | $6,699 |
| pick 10 `2-6ef23cd64e` | Pareto-diverse | X=20.0% Y=0.6% stop=4.0% hold=12 L=69 mat=1.0% lower=0.5% reset=66.0% buffer=1.1% | $16,125 | $13,439 | $8,809 | $1,447 | 3 | 3 / 0 | 97% | $8,661 | $16,125 | $16,125 | $16,520 | $15,731 |
| default (file Y 3%) `2-8badd65cdc` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% buffer=0.5% | $43,204 | $36,190 | $32,457 | $17,811 | 6 | 3 / 3 | 106% | $6,116 | $44,181 | $43,225 | $48,061 | $38,346 |
| default at Y 4% `2-4a3c9a0f49` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 mat=1.0% lower=2.0% reset=38.0% buffer=0.5% | $43,163 | $34,324 | $30,814 | $17,781 | 6 | 3 / 3 | 103% | $1,448 | $44,162 | $43,184 | $48,012 | $38,314 |

"Trades" counts entries in the holdout; "W / L" counts exits in it, including a position carried in from 2023.

Picks: median $15,902, mean $16,195, 9/10 positive, 0/10 above the own default ($43,204), 0/10 above allIn.ts ($48,432).

## Family 3: Trailing buy, no re-entry restriction

| Contender | Category | Parameters | Net | Minute DD | Daily DD | Interest | Trades | W / L | Best-trade share | April 2025 | Flat start | next-open | 8% rate | 14% rate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `3-01c6e7516c` | profit | X=11.4% Y=0.8% stop=9.8% hold=6 L=64 | $19,390 | $44,302 | $42,014 | $16,244 | 8 | 2 / 6 | 236% | −$7,092 | $22,755 | $19,079 | $24,509 | $20,476 |
| pick 2 `3-5856a6037b` | profit | X=20.0% Y=0.7% stop=7.8% hold=11 L=101 | $42,781 | $13,414 | $8,981 | $5,786 | 2 | 0 / 1 | 102% | $7,105 | $42,781 | $42,781 | $44,360 | $41,203 |
| pick 3 `3-b56c62e561` | profit | X=11.4% Y=0.5% stop=7.8% hold=8 L=52 | $24,582 | $38,700 | $37,889 | $15,430 | 8 | 3 / 5 | 188% | −$7,128 | $25,257 | $24,737 | $28,790 | $20,103 |
| pick 4 `3-f3cbcfd2e7` | balanced | X=11.7% Y=0.8% stop=5.1% hold=7 L=160 | $14,675 | $36,486 | $33,563 | $9,373 | 9 | 5 / 5 | 234% | −$3,047 | $20,345 | $14,613 | $17,231 | $12,119 |
| pick 5 `3-afad112d68` | balanced | X=20.0% Y=1.2% stop=4.7% hold=10 L=99 | $27,448 | $13,341 | $9,484 | $3,586 | 2 | 1 / 1 | 106% | $6,128 | $27,448 | $27,353 | $28,426 | $26,470 |
| pick 6 `3-3769488b6b` | balanced | X=17.8% Y=0.6% stop=7.3% hold=11 L=50 | $39,717 | $24,053 | $20,655 | $6,721 | 3 | 1 / 1 | 92% | −$4,124 | $39,717 | $39,717 | $41,550 | $37,884 |
| pick 7 `3-f08a3e0eb6` | low-DD | X=19.1% Y=0.6% stop=4.0% hold=5 L=68 | $14,934 | $13,439 | $7,090 | $1,386 | 5 | 3 / 2 | 73% | $7,812 | $14,934 | $14,934 | $15,312 | $14,555 |
| pick 8 `3-5c50607453` | low-DD | X=19.0% Y=0.6% stop=4.1% hold=5 L=55 | $16,209 | $13,439 | $7,090 | $1,386 | 5 | 3 / 2 | 76% | $8,996 | $16,209 | $16,327 | $16,587 | $15,831 |
| pick 9 `3-a591d5163c` | Pareto-diverse | X=12.3% Y=0.7% stop=7.9% hold=14 L=63 | $39,810 | $31,791 | $26,607 | $11,030 | 5 | 1 / 4 | 124% | $10,149 | $40,664 | $39,810 | $42,818 | $42,403 |
| pick 10 `3-e7eb402b22` | Pareto-diverse | X=20.0% Y=0.6% stop=4.1% hold=10 L=45 | $14,910 | $13,439 | $8,809 | $1,477 | 2 | 1 / 1 | 105% | $7,446 | $14,910 | $14,910 | $16,477 | $14,507 |
| default (file Y 3%) `3-a273c304e5` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 | $27,566 | $42,750 | $37,830 | $18,836 | 8 | 4 / 4 | 145% | −$582 | $28,544 | $27,207 | $32,703 | $22,429 |
| default at Y 4% `3-3410e80353` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 | $17,706 | $40,270 | $38,868 | $17,811 | 8 | 4 / 4 | 149% | −$8,480 | $18,705 | $17,353 | $22,564 | $12,848 |

"Trades" counts entries in the holdout; "W / L" counts exits in it, including a position carried in from 2023.

Picks: median $21,986, mean $25,446, 10/10 positive, 3/10 above the own default ($27,566), 0/10 above allIn.ts ($48,432).

## Family 4: Trailing buy + buffered loss exit, no re-entry restriction

| Contender | Category | Parameters | Net | Minute DD | Daily DD | Interest | Trades | W / L | Best-trade share | April 2025 | Flat start | next-open | 8% rate | 14% rate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pick 1 `4-a49f4cf75b` | profit | X=11.4% Y=0.8% stop=9.8% hold=18 L=58 buffer=0.8% | $31,503 | $34,784 | $31,338 | $16,214 | 5 | 2 / 3 | 120% | $2,358 | $34,868 | $31,190 | $35,515 | $28,147 |
| pick 2 `4-81aca36069` | profit | X=20.0% Y=0.5% stop=7.8% hold=11 L=104 buffer=0.2% | $42,164 | $13,449 | $8,741 | $5,786 | 2 | 0 / 1 | 102% | $6,727 | $42,164 | $42,164 | $43,742 | $40,586 |
| pick 3 `4-4782c72630` | profit | X=11.2% Y=0.5% stop=7.8% hold=8 L=46 buffer=1.8% | $24,582 | $38,700 | $37,889 | $15,430 | 8 | 3 / 5 | 188% | −$7,128 | $25,257 | $24,737 | $28,790 | $18,815 |
| pick 4 `4-8d385daec9` | balanced | X=20.0% Y=1.2% stop=4.7% hold=11 L=71 buffer=0.8% | $27,448 | $13,341 | $9,484 | $3,586 | 2 | 1 / 1 | 106% | $6,128 | $27,448 | $27,353 | $28,426 | $26,470 |
| pick 5 `4-53d7248c4d` | balanced | X=20.0% Y=0.7% stop=4.1% hold=11 L=106 buffer=0.0% | $14,558 | $13,414 | $8,981 | $1,477 | 2 | 1 / 1 | 107% | $7,105 | $14,558 | $14,558 | $14,961 | $14,155 |
| pick 6 `4-5133452ac9` | balanced | X=17.8% Y=0.6% stop=7.3% hold=11 L=49 buffer=0.8% | $39,717 | $24,053 | $20,655 | $6,721 | 3 | 1 / 1 | 92% | −$4,124 | $39,717 | $39,717 | $41,550 | $37,884 |
| pick 7 `4-0ee741b8b1` | low-DD | X=20.0% Y=0.9% stop=4.0% hold=5 L=65 buffer=0.5% | $14,761 | $13,380 | $7,502 | $1,386 | 5 | 3 / 2 | 81% | $7,569 | $14,761 | $14,761 | $15,139 | $14,383 |
| pick 8 `4-f4fa61f367` | low-DD | X=19.1% Y=0.6% stop=4.0% hold=5 L=71 buffer=0.4% | $14,934 | $13,439 | $7,090 | $1,386 | 5 | 3 / 2 | 73% | $7,812 | $14,934 | $14,934 | $15,312 | $14,555 |
| pick 9 `4-63f813566f` | Pareto-diverse | X=18.7% Y=0.8% stop=4.0% hold=5 L=48 buffer=0.9% | $2,534 | $15,392 | $13,789 | $1,477 | 5 | 1 / 4 | 433% | −$6,567 | $2,534 | $2,534 | $2,721 | $2,131 |
| pick 10 `4-2edbb840c2` | Pareto-diverse | X=19.9% Y=0.6% stop=4.0% hold=5 L=53 buffer=0.2% | $16,524 | $13,439 | $7,090 | $1,386 | 5 | 3 / 2 | 76% | $9,291 | $16,524 | $16,524 | $16,902 | $16,146 |
| default (file Y 3%) `4-daabce77f9` | — | X=10.0% Y=3.0% stop=8.0% hold=15 L=90 buffer=0.5% | $28,932 | $41,384 | $36,464 | $18,805 | 8 | 4 / 4 | 138% | −$582 | $29,909 | $28,573 | $33,950 | $24,020 |
| default at Y 4% `4-61341a2c22` | — | X=10.0% Y=4.0% stop=8.0% hold=15 L=90 buffer=0.5% | $17,706 | $40,270 | $38,868 | $17,811 | 8 | 4 / 4 | 149% | −$8,480 | $18,705 | $17,353 | $22,564 | $12,848 |

"Trades" counts entries in the holdout; "W / L" counts exits in it, including a position carried in from 2023.

Picks: median $20,553, mean $22,872, 10/10 positive, 3/10 above the own default ($28,932), 0/10 above allIn.ts ($48,432).
