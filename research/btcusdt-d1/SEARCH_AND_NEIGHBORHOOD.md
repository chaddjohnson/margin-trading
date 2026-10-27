# Search and neighbourhood — what the frozen selection procedure found

Sealed records: `results/folds/fold-a/`, `results/folds/fold-b/`, `results/final/` (each `SELECTION.json`,
`PICKS.json`, `archive.jsonl.gz` with every evaluated vector). Tables below are rendered from those records by
`npm run btc-d1 -- tables <fold-a|fold-b|final>` (read-only). All figures are USDT at the principal costs (fee 10 +
impact 5 bps per side, adverse stops) unless a column says otherwise; "mDD%" is the minute-sampled peak-to-trough of
the cash account and "DD USDT" its USDT depth. Every selection saw only bars before its cutoff.

## 1. Budgets and coverage (frozen; PROTOCOL.md §7)

| Selection | Window (arming → cutoff) | Evaluations | Distinct vectors | Min. entries | Runtime |
|---|---|---:|---:|---:|---|
| fold A | 2019-02-11 → 2021-12-01 | 71,554 | 68,554 | 9 | 2 min 39 s |
| fold B | 2019-02-11 → 2023-03-01 | 71,555 | 68,555 | 13 | 4 min 0 s |
| final | 2019-02-11 → 2024-07-01 | 71,530 | 68,530 | 17 | 4 min 55 s |

Each: 65,536 Sobol vectors (one scrambled stream, the same design in every window), 8 refinement seeds × 24
generations × 16 offspring (equal budgets), a 60-vector shortlist with 32 radius-1 and 16 radius-2 neighbours, the
conservative costs and the worst-case stop fill. No budget was changed after the freeze and no search was extended.

## 2. What the search shows (descriptive, within D1)

- **In-sample profit is not distinctive.** 98.1% (fold A), 94.8% (fold B) and 95.4% (final) of all ~68,500 evaluated
  D1 vectors were net-positive in their selection window; the median vector made 221,000–271,000 USDT on a
  non-compounded 100,000 USDT position. Positive in-sample net says almost nothing about a parameter choice here.
- **The risk ceiling decides the search.** Minute peak-to-trough drawdowns were large: the median vector fell 36–39%
  from a running peak, 96,000–128,000 USDT. Only 5.4–8.1% of vectors stayed within 35,000 USDT, so G1 (≤ 35% **and**
  ≤ 35,000 USDT, ≥ 3 entries a year, net > 0) passed 0.17–0.83% of the Sobol design.
- **Almost only crash-buyers survive it.** Of the ~27,700 evaluated vectors per selection with X < 30% (the region of the
  ETF phenotypes), 96–99% were profitable in-sample but only 3 (fold A), 1 (fold B) and 1 (final) stayed within
  35,000 USDT of drawdown. 92% (fold A) and 99.8% (fold B) of feasible vectors arm only after a fall of at least 40%
  from their reference high; the medians are X 51.3% and 52.9%, L 123 and 63 days, stop 6.9% and 5.5%. These
  vectors are flat most of the time (the shortlisted ones hold BTC on 6–53% of days) and earn their in-sample profit
  in the deep 2019–2022 declines and rebounds. Every vector that passed all gates (G1–G6) armed after a fall of
  45.4–59.6%.
- **Diversity rules worked as intended.** The shortlist rule skipped 275 / 262 / 227 near-duplicates and 329 / 478 /
  410 vectors over a refinement lineage's quota (fold A / B / final), so the shortlists span several lineages and
  the Sobol design; every selection promoted the full three family slots.
- **Neighbourhoods are thin.** Of 60 shortlisted vectors, 18 (fold A), 13 (fold B) and 7 (final) passed G3–G5; the
  usual failure is G3 (fewer than half the radius-1 neighbours pass G1): the drawdown ceiling is crossed by small
  parameter moves. The raw-net "centre" of each shortlist failed G3 in fold A and the final selection, so the picks
  are not the in-sample optimum but the best robust vectors (fold B's centre passed and is its rank 1).
- **In-sample, costs and fills rarely decide.** Across the shortlists, the conservative costs (fee 20 + impact 10)
  leave a median 94–96% of the principal net (range 16–124%) and worst-case stop fills a median 97–98% (range
  12–124%); ratios above 100% occur because D1's profit tests are net of costs, so other costs change which trades
  happen. No shortlisted vector failed G4 or G5; the only failing gate was G3 (42, 47 and 53 of 60). A few vectors
  are cost-fragile (fold A shortlist #42: 200,470 → 37,210 conservative, 42,189 worst fill).
- **Capacity warnings.** Several picks have single fills above 25% of that minute's quote volume (the final rank 1
  has one at 123%, fold A rank 2 one at 84%). With a 100,000 USDT order this is a 2019–2020 liquidity issue the
  impact assumptions do not capture; it is reported, not gated (PROTOCOL.md §7).

## 3. The three selections
### fold-a: 2019-02-11 → 2021-12-01 (exclusive)

Evaluations 71,554 (archive 68,554 distinct vectors, sha256 d4a8317c1708…); minimum entries 9.
Sobol 65,536: G1 542 (0.83%), G1+G2 532, feasible (G1+G2+G6) 491. Pool (Sobol + refinement, feasible) 2307, distinct schedules 1546; shortlist 60; G1–G6 eligible 18; picks 3.

All archived vectors (Sobol + refinement): net p10/p50/p90 45,175 / 270,626 / 806,417 USDT; minute peak-to-trough p10/p50/p90 24.1% / 36.4% / 49.2% and 39,160 / 96,373 / 355,090 USDT; net > 0 98.1%; DD ≤ 35% 44.9%; DD ≤ 35,000 USDT 8.1%; G1 3.48%; feasible 3.37%.

Risk-return frontier (in-sample): the best net among the feasible (G1+G2+G6) vectors at each minute peak-to-trough ceiling.

| DD ≤ | feasible vectors | best net USDT | its DD USDT | its entries | its net minus top two |
|---:|---:|---:|---:|---:|---:|
| 10% | 2 | 280,611 | 28,829 | 45 | 216,890 |
| 15% | 375 | 298,442 | 30,852 | 36 | 211,502 |
| 20% | 698 | 320,467 | 34,415 | 34 | 225,745 |
| 25% | 1399 | 320,467 | 34,415 | 34 | 225,745 |
| 30% | 2257 | 320,467 | 34,415 | 34 | 225,745 |
| 35% | 2307 | 320,467 | 34,415 | 34 | 225,745 |

Refinement (equal budgets):

| seed | seed net | final | final net | improvements |
|---|---:|---|---:|---:|
| 547-74-67-54-122-96-68-268 | 217,347 | 547-80-71-59-186-109-42-268 | 266,388 | 6 |
| 554-38-134-23-160-107-171-107 | 216,595 | 554-19-125-27-186-111-170-104 | 255,247 | 13 |
| 513-13-107-40-158-131-261-121 | 214,016 | 513-14-105-34-159-142-286-121 | 221,146 | 6 |
| 350-80-55-7-290-77-173-164 | 191,012 | 350-66-68-7-281-82-112-157 | 245,708 | 8 |
| 479-48-78-52-16-141-131-79 | 188,448 | 479-46-78-52-26-141-99-23 | 249,094 | 5 |
| 501-83-60-28-105-46-114-288 | 186,435 | 522-82-53-39-105-37-89-281 | 259,400 | 7 |
| 525-6-86-25-116-45-67-33 | 183,872 | 531-5-69-25-123-34-42-11 | 298,442 | 8 |
| 580-106-63-30-127-51-68-148 | 172,341 | 506-95-70-29-127-27-68-234 | 320,467 | 6 |

| # | key | net | mDD% | entries | W/L | net − top 2 | nbr feasible | nbr median | wide median | conservative | low-fill | G3 G4 G5 | pick |
|---:|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 | 497-95-70-29-127-27-68-234 | 320,467 | 15.3% | 34 | 31/3 | 225,745 | 41% | 146,063 | 85,292 | 199,236 | 315,462 | ✖ ✔ ✔ |  |
| 2 | 506-95-70-29-127-27-49-234 | 316,644 | 15.3% | 36 | 33/3 | 221,922 | 56% | 149,206 | 110,851 | 194,820 | 312,028 | ✔ ✔ ✔ |  |
| 3 | 506-95-70-29-127-27-73-234 | 313,584 | 16.2% | 35 | 32/3 | 229,281 | 44% | 114,573 | 106,654 | 202,610 | 265,577 | ✖ ✔ ✔ |  |
| 4 | 503-95-70-29-127-32-87-234 | 312,047 | 16.2% | 33 | 29/3 | 227,744 | 53% | 182,658 | 154,260 | 201,751 | 306,913 | ✔ ✔ ✔ |  |
| 5 | 506-95-65-29-127-27-68-234 | 311,117 | 16.7% | 40 | 37/3 | 253,126 | 50% | 186,159 | 80,864 | 210,757 | 306,213 | ✔ ✔ ✔ | rank 1 |
| 6 | 531-5-69-25-123-34-42-11 | 298,442 | 12.2% | 36 | 31/4 | 211,502 | 66% | 131,495 | 119,237 | 286,576 | 223,697 | ✔ ✔ ✔ |  |
| 7 | 506-95-70-29-127-13-68-234 | 292,674 | 15.3% | 30 | 27/3 | 197,951 | 56% | 123,274 | 108,809 | 172,966 | 288,168 | ✔ ✔ ✔ |  |
| 8 | 525-6-102-25-123-45-47-26 | 288,324 | 13.5% | 25 | 21/3 | 195,097 | 66% | 152,549 | 140,778 | 280,242 | 285,444 | ✔ ✔ ✔ | rank 2 |
| 9 | 517-5-69-25-123-34-48-11 | 286,419 | 11.3% | 35 | 30/4 | 199,706 | 78% | 137,233 | 115,535 | 274,613 | 199,423 | ✔ ✔ ✔ |  |
| 10 | 530-5-69-30-123-34-42-11 | 282,807 | 12.2% | 35 | 30/4 | 195,867 | 81% | 132,473 | 77,644 | 270,212 | 213,365 | ✔ ✔ ✔ |  |
| 11 | 517-5-51-25-123-34-42-11 | 280,611 | 9.0% | 45 | 40/4 | 216,890 | 69% | 132,810 | 103,003 | 245,624 | 177,895 | ✔ ✔ ✔ |  |
| 12 | 525-5-69-25-123-34-53-11 | 275,745 | 13.4% | 33 | 28/4 | 188,046 | 78% | 137,865 | 119,603 | 250,307 | 216,936 | ✔ ✔ ✔ |  |
| 58 | 507-82-109-29-67-118-197-211 | 153,395 | 27.8% | 14 | 12/1 | 53,880 | 53% | 131,296 | 68,869 | 173,063 | 149,694 | ✔ ✔ ✔ | rank 3 |

(60 shortlisted vectors; the top 12 by raw net and every pick are shown; all are in the sealed SELECTION.json.)

- Rank 1 `506-95-65-29-127-27-68-234`: X 50.6%, Y 9.5%, stop 6.5%, hold 29 UTC days, L 127 UTC days, buffer 2.7%, P 6.8%, W 234 UTC days; selection net 311,117 USDT, minute peak-to-trough 16.7% (34,169 USDT), 40 entries, exposure 48% of days, fees+impact 12,479, max participation 59.6%; score 186,159.
- Rank 2 `525-6-102-25-123-45-47-26`: X 52.5%, Y 0.6%, stop 10.2%, hold 25 UTC days, L 123 UTC days, buffer 4.5%, P 4.7%, W 26 UTC days; selection net 288,324 USDT, minute peak-to-trough 13.5% (33,325 USDT), 25 entries, exposure 44% of days, fees+impact 7,940, max participation 84.2%; score 152,549.
- Rank 3 `507-82-109-29-67-118-197-211`: X 50.7%, Y 8.2%, stop 10.9%, hold 29 UTC days, L 67 UTC days, buffer 11.8%, P 19.7%, W 211 UTC days; selection net 153,395 USDT, minute peak-to-trough 27.8% (34,912 USDT), 14 entries, exposure 22% of days, fees+impact 4,434, max participation 16.6%; score 131,296.
- Exploratory low-drawdown class (≤ 25%): `506-95-65-29-127-27-68-234` net 311,117, 16.7%, score 186,159 (never a pick).

### fold-b: 2019-02-11 → 2023-03-01 (exclusive)

Evaluations 71,555 (archive 68,555 distinct vectors, sha256 738922eb5047…); minimum entries 13.
Sobol 65,536: G1 230 (0.35%), G1+G2 208, feasible (G1+G2+G6) 199. Pool (Sobol + refinement, feasible) 1895, distinct schedules 1262; shortlist 60; G1–G6 eligible 13; picks 3.

All archived vectors (Sobol + refinement): net p10/p50/p90 23,314 / 221,185 / 742,016 USDT; minute peak-to-trough p10/p50/p90 25.7% / 38.5% / 51.8% and 49,274 / 128,173 / 382,264 USDT; net > 0 94.8%; DD ≤ 35% 35.5%; DD ≤ 35,000 USDT 5.5%; G1 2.83%; feasible 2.76%.

Risk-return frontier (in-sample): the best net among the feasible (G1+G2+G6) vectors at each minute peak-to-trough ceiling.

| DD ≤ | feasible vectors | best net USDT | its DD USDT | its entries | its net minus top two |
|---:|---:|---:|---:|---:|---:|
| 10% | 0 | n/a | n/a | n/a | n/a |
| 15% | 103 | 252,222 | 27,697 | 43 | 199,949 |
| 20% | 509 | 264,634 | 30,790 | 65 | 207,029 |
| 25% | 1163 | 264,634 | 30,790 | 65 | 207,029 |
| 30% | 1887 | 277,935 | 26,210 | 43 | 226,542 |
| 35% | 1895 | 277,935 | 26,210 | 43 | 226,542 |

Refinement (equal budgets):

| seed | seed net | final | final net | improvements |
|---|---:|---|---:|---:|
| 598-63-63-51-83-109-95-225 | 219,230 | 584-63-58-51-59-93-95-225 | 222,314 | 2 |
| 506-29-77-55-51-47-65-107 | 204,981 | 499-29-77-48-41-24-65-116 | 218,950 | 7 |
| 544-13-44-7-119-41-89-208 | 164,271 | 519-14-47-13-160-10-89-182 | 264,634 | 12 |
| 589-33-100-53-164-145-114-204 | 150,486 | 589-32-80-45-145-143-114-224 | 189,476 | 4 |
| 514-109-59-25-35-98-104-62 | 140,710 | 517-95-46-28-48-86-74-50 | 248,802 | 17 |
| 535-34-62-38-46-136-113-100 | 138,257 | 529-20-46-47-68-117-73-75 | 277,935 | 11 |
| 527-112-44-47-40-43-143-283 | 134,832 | 517-112-35-49-44-54-104-256 | 190,522 | 11 |
| 588-75-65-37-252-67-139-79 | 129,379 | 582-75-63-37-231-67-84-79 | 236,927 | 6 |

| # | key | net | mDD% | entries | W/L | net − top 2 | nbr feasible | nbr median | wide median | conservative | low-fill | G3 G4 G5 | pick |
|---:|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 | 526-20-46-47-68-117-73-75 | 277,935 | 25.7% | 43 | 40/3 | 226,542 | 59% | 122,378 | 105,624 | 209,878 | 273,303 | ✔ ✔ ✔ | rank 1 |
| 2 | 529-19-46-47-68-117-73-75 | 267,956 | 25.7% | 46 | 43/3 | 216,329 | 50% | 102,298 | 111,717 | 253,172 | 149,720 | ✔ ✔ ✔ |  |
| 3 | 519-14-47-13-160-10-89-182 | 264,634 | 16.5% | 65 | 52/13 | 207,029 | 16% | 143,255 | 135,211 | 217,827 | 267,936 | ✖ ✔ ✔ |  |
| 4 | 523-20-46-46-34-130-73-64 | 263,033 | 25.7% | 37 | 35/2 | 211,641 | 59% | 84,661 | 67,927 | 159,884 | 259,003 | ✔ ✔ ✔ |  |
| 5 | 486-20-45-51-68-117-73-75 | 257,266 | 25.7% | 38 | 35/3 | 205,771 | 34% | 118,798 | 76,454 | 199,266 | 252,364 | ✖ ✔ ✔ |  |
| 6 | 527-19-46-49-45-142-73-64 | 256,112 | 25.7% | 42 | 39/3 | 204,486 | 66% | 92,137 | 85,868 | 244,124 | 138,168 | ✔ ✔ ✔ |  |
| 7 | 519-14-43-13-160-10-89-152 | 254,955 | 20.5% | 70 | 56/14 | 208,541 | 16% | 154,607 | 79,602 | 235,394 | 158,354 | ✖ ✔ ✔ |  |
| 8 | 527-14-43-13-160-10-89-172 | 250,420 | 21.0% | 68 | 56/12 | 203,385 | 13% | 138,921 | 55,013 | 225,151 | 154,147 | ✖ ✔ ✔ |  |
| 9 | 527-14-45-13-154-10-89-198 | 249,362 | 19.6% | 62 | 50/12 | 202,532 | 38% | 145,317 | 102,664 | 205,336 | 242,962 | ✖ ✔ ✔ |  |
| 10 | 517-95-46-28-48-86-74-50 | 248,802 | 23.2% | 37 | 33/4 | 202,159 | 38% | 104,540 | 81,876 | 242,071 | 242,435 | ✖ ✔ ✔ |  |
| 11 | 517-97-49-28-48-86-74-41 | 247,941 | 23.2% | 38 | 34/4 | 202,640 | 44% | 122,813 | 76,529 | 160,002 | 222,989 | ✖ ✔ ✔ |  |
| 12 | 527-19-48-41-57-130-73-71 | 246,655 | 25.7% | 40 | 37/3 | 198,689 | 75% | 116,078 | 58,835 | 147,494 | 119,934 | ✔ ✔ ✔ |  |
| 16 | 517-97-46-28-48-86-93-29 | 236,862 | 23.2% | 37 | 34/3 | 190,814 | 59% | 112,574 | 84,778 | 224,196 | 221,162 | ✔ ✔ ✔ | rank 2 |
| 60 | 588-39-62-23-133-34-104-271 | 111,658 | 18.6% | 13 | 10/3 | 52,547 | 63% | 105,838 | 60,874 | 121,500 | 68,575 | ✔ ✔ ✔ | rank 3 |

(60 shortlisted vectors; the top 12 by raw net and every pick are shown; all are in the sealed SELECTION.json.)

- Rank 1 `526-20-46-47-68-117-73-75`: X 52.6%, Y 2.0%, stop 4.6%, hold 47 UTC days, L 68 UTC days, buffer 11.7%, P 7.3%, W 75 UTC days; selection net 277,935 USDT, minute peak-to-trough 25.7% (26,210 USDT), 43 entries, exposure 28% of days, fees+impact 13,330, max participation 34.1%; score 122,378.
- Rank 2 `517-97-46-28-48-86-93-29`: X 51.7%, Y 9.7%, stop 4.6%, hold 28 UTC days, L 48 UTC days, buffer 8.6%, P 9.3%, W 29 UTC days; selection net 236,862 USDT, minute peak-to-trough 23.2% (33,310 USDT), 37 entries, exposure 26% of days, fees+impact 11,467, max participation 22.3%; score 112,574.
- Rank 3 `588-39-62-23-133-34-104-271`: X 58.8%, Y 3.9%, stop 6.2%, hold 23 UTC days, L 133 UTC days, buffer 3.4%, P 10.4%, W 271 UTC days; selection net 111,658 USDT, minute peak-to-trough 18.6% (26,530 USDT), 13 entries, exposure 6% of days, fees+impact 4,071, max participation 27.4%; score 105,838.
- Exploratory low-drawdown class (≤ 25%): `517-97-46-28-48-86-93-29` net 236,862, 23.2%, score 112,574 (never a pick).

### final: 2019-02-11 → 2024-07-01 (exclusive)

Evaluations 71,530 (archive 68,530 distinct vectors, sha256 ea17b4f37e63…); minimum entries 17.
Sobol 65,536: G1 112 (0.17%), G1+G2 101, feasible (G1+G2+G6) 101. Pool (Sobol + refinement, feasible) 1638, distinct schedules 1011; shortlist 60; G1–G6 eligible 7; picks 3.

All archived vectors (Sobol + refinement): net p10/p50/p90 27,890 / 267,751 / 925,533 USDT; minute peak-to-trough p10/p50/p90 25.7% / 38.6% / 51.8% and 49,781 / 128,226 / 382,423 USDT; net > 0 95.4%; DD ≤ 35% 35.4%; DD ≤ 35,000 USDT 5.4%; G1 2.41%; feasible 2.39%.

Risk-return frontier (in-sample): the best net among the feasible (G1+G2+G6) vectors at each minute peak-to-trough ceiling.

| DD ≤ | feasible vectors | best net USDT | its DD USDT | its entries | its net minus top two |
|---:|---:|---:|---:|---:|---:|
| 10% | 0 | n/a | n/a | n/a | n/a |
| 15% | 227 | 219,920 | 25,107 | 37 | 169,353 |
| 20% | 411 | 336,396 | 33,130 | 35 | 243,511 |
| 25% | 971 | 354,695 | 32,590 | 35 | 261,810 |
| 30% | 1635 | 354,695 | 32,590 | 35 | 261,810 |
| 35% | 1638 | 354,695 | 32,590 | 35 | 261,810 |

Refinement (equal budgets):

| seed | seed net | final | final net | improvements |
|---|---:|---|---:|---:|
| 598-63-63-51-83-109-95-225 | 226,411 | 598-76-70-57-152-120-65-262 | 354,695 | 7 |
| 506-29-77-55-51-47-65-107 | 204,981 | 506-29-77-47-43-32-65-90 | 215,177 | 5 |
| 544-13-44-7-119-41-89-208 | 164,271 | 548-19-43-13-95-41-92-194 | 219,920 | 9 |
| 588-75-65-37-252-67-139-79 | 151,076 | 580-75-62-38-229-75-82-75 | 251,992 | 6 |
| 596-114-69-30-241-108-182-267 | 150,501 | 546-115-69-36-241-108-138-267 | 239,378 | 3 |
| 514-109-59-25-35-98-104-62 | 140,710 | 514-107-57-31-44-96-73-62 | 227,474 | 7 |
| 535-34-62-38-46-136-113-100 | 138,257 | 499-34-79-35-42-117-108-100 | 194,541 | 5 |
| 527-112-44-47-40-43-143-283 | 134,832 | 533-112-49-50-47-17-133-297 | 224,800 | 10 |

| # | key | net | mDD% | entries | W/L | net − top 2 | nbr feasible | nbr median | wide median | conservative | low-fill | G3 G4 G5 | pick |
|---:|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|---|
| 1 | 587-76-70-57-162-120-65-262 | 354,695 | 20.6% | 35 | 33/1 | 261,810 | 13% | 76,446 | 74,758 | 356,338 | 203,102 | ✖ ✔ ✔ |  |
| 2 | 596-76-70-57-152-120-89-262 | 336,396 | 18.6% | 35 | 33/1 | 243,511 | 28% | 175,882 | 61,198 | 339,496 | 203,582 | ✖ ✔ ✔ |  |
| 3 | 598-76-61-57-152-120-83-262 | 333,584 | 18.6% | 35 | 33/1 | 244,393 | 47% | 185,430 | 40,954 | 322,378 | 330,410 | ✖ ✔ ✔ |  |
| 4 | 587-76-70-57-130-135-111-237 | 327,482 | 18.6% | 29 | 27/1 | 234,596 | 28% | 186,803 | 109,149 | 335,601 | 177,054 | ✖ ✔ ✔ |  |
| 5 | 598-76-60-57-129-120-95-208 | 319,114 | 18.6% | 36 | 34/1 | 229,893 | 38% | 181,278 | 37,155 | 300,065 | 313,018 | ✖ ✔ ✔ |  |
| 6 | 598-71-63-57-117-109-95-228 | 317,176 | 18.6% | 34 | 32/2 | 225,133 | 44% | 168,860 | 99,938 | 306,300 | 312,288 | ✖ ✔ ✔ |  |
| 7 | 580-75-62-38-229-59-82-75 | 251,992 | 25.7% | 31 | 28/3 | 198,878 | 13% | 117,868 | 31,484 | 240,573 | 227,426 | ✖ ✔ ✔ |  |
| 8 | 580-75-59-40-229-72-85-64 | 247,258 | 25.7% | 30 | 27/3 | 193,599 | 13% | 89,910 | 70,999 | 237,751 | 243,692 | ✖ ✔ ✔ |  |
| 9 | 546-115-69-36-231-109-138-267 | 239,378 | 28.0% | 29 | 23/6 | 156,426 | 3% | 94,441 | 61,981 | 230,158 | 234,669 | ✖ ✔ ✔ |  |
| 10 | 546-115-69-36-241-108-180-272 | 231,774 | 28.0% | 25 | 20/5 | 148,822 | 3% | 112,852 | 60,588 | 223,769 | 227,922 | ✖ ✔ ✔ |  |
| 11 | 499-107-57-31-44-100-73-62 | 227,474 | 24.0% | 37 | 34/3 | 186,851 | 22% | 135,090 | 99,212 | 125,063 | 223,938 | ✖ ✔ ✔ |  |
| 12 | 528-112-49-50-47-17-133-297 | 224,800 | 23.2% | 34 | 32/2 | 161,334 | 34% | 91,704 | 87,792 | 149,460 | 220,190 | ✖ ✔ ✔ |  |
| 32 | 548-19-43-13-93-41-96-224 | 201,916 | 19.7% | 35 | 30/5 | 151,349 | 69% | 100,123 | 65,437 | 193,413 | 197,014 | ✔ ✔ ✔ | rank 2 |
| 57 | 491-23-50-53-46-37-66-56 | 124,938 | 25.7% | 33 | 30/3 | 96,338 | 59% | 105,342 | 61,840 | 130,376 | 96,176 | ✔ ✔ ✔ | rank 1 |
| 59 | 505-71-39-4-119-129-250-187 | 115,532 | 26.0% | 31 | 23/8 | 81,730 | 72% | 84,134 | 69,335 | 105,888 | 116,379 | ✔ ✔ ✔ | rank 3 |

(60 shortlisted vectors; the top 12 by raw net and every pick are shown; all are in the sealed SELECTION.json.)

- Rank 1 `491-23-50-53-46-37-66-56`: X 49.1%, Y 2.3%, stop 5.0%, hold 53 UTC days, L 46 UTC days, buffer 3.7%, P 6.6%, W 56 UTC days; selection net 124,938 USDT, minute peak-to-trough 25.7% (25,709 USDT), 33 entries, exposure 18% of days, fees+impact 10,097, max participation 122.8%; score 105,342.
- Rank 2 `548-19-43-13-93-41-96-224`: X 54.8%, Y 1.9%, stop 4.3%, hold 13 UTC days, L 93 UTC days, buffer 4.1%, P 9.6%, W 224 UTC days; selection net 201,916 USDT, minute peak-to-trough 19.7% (25,700 USDT), 35 entries, exposure 12% of days, fees+impact 10,813, max participation 21.3%; score 100,123.
- Rank 3 `505-71-39-4-119-129-250-187`: X 50.5%, Y 7.1%, stop 3.9%, hold 4 UTC days, L 119 UTC days, buffer 12.9%, P 25.0%, W 187 UTC days; selection net 115,532 USDT, minute peak-to-trough 26.0% (32,126 USDT), 31 entries, exposure 6% of days, fees+impact 9,483, max participation 33.9%; score 84,134.
- Exploratory low-drawdown class (≤ 25%): `548-19-43-13-93-41-96-224` net 201,916, 19.7%, score 100,123 (never a pick).

## 4. Reading the tables

- "net − top 2" is G2 (net minus the two largest positive trade nets); "nbr feasible" and "nbr median" are G3's
  share of radius-1 neighbours passing G1 and their median net (the score); "wide median" is the radius-2 median
  (reported only); "conservative" is G4, "low-fill" G5. The frontier tables are in-sample and say nothing about later
  windows (CHRONOLOGICAL_VALIDATION.md).
- Neighbour draws are perturbations around one historical path, not independent samples of future markets.
