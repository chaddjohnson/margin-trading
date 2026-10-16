# Phase 2: minute-updated trailing stop vs the incumbent's daily stop

> **`STOP_MINUTE_CAUSAL` is an experimental exit rule, a different strategy from `allIn.ts`.** Its results do not mean that the incumbent would have stopped out earlier, or that the current code behaves this way. The incumbent's stop (`STOP_DAILY`) is set and raised once per session, from prices through the previous session.

The design is a full factorial: all 14 entry policies × both stop models × both stop fills × four cost levels, on the same warm-start continuous run (2016-10-07 → 2025-10-13). Nothing was hand-picked.

The experimental rule, as frozen in [PROTOCOL.md](PROTOCOL.md) §6:

- **The stop.** After each **completed** minute from the fill onwards, the post-entry high is raised by that minute's high. The stop for the **next** minute is 2.1% below it, and it never moves down.
- **Activation.** The stop's profit-conditional activation is re-evaluated at every minute boundary, using the interest accrued through the session date. On the entry session that interest is zero, so the stop activates once its level is above the fill.
- **Order of exits within a session** is the incumbent's: opening gap first, then a due maximum hold, then minute triggers, each checked open-before-low. The fill's own minute never triggers, and the closing print never triggers.
- **Carry-over.** At every session start the stop equals the `STOP_DAILY` level for the same position. The two models differ only within a session.
- **Same-session exits** are allowed; re-entry in that session is not.

## 1. The paired stop-model effect (minute − daily), entry policy held fixed

<!-- include: tables/stop_effect.md -->
| Entry policy | Net daily stop | Net minute stop | Δ (stop fill) | Δ (next-open) | Δ 20 bp next-open | Δ minute DD (stop / next-open) | Minute DD minute stop (stop / next-open) | Δ trades | Same-session exits | Intrasession-stop exits | Δ interest | Δ fees | Δ sessions held | Years + (stop) | Δ ex largest + episode | Ensemble median Δ / starts Δ>0 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | $186,172 | $183,930 | −$2,243 | −$2,847 | −$4,342 | +$1,807 / +$1,988 | $27,721 / $27,902 | 5 | 0 | 32 | −$874 | +$499 | -8 | 4/10 | −$14,019 | −$2,626 / 2/29 |
| `FIRST_0935` | $124,592 | $119,214 | −$5,378 | −$7,420 | −$11,010 | −$3,728 / −$2,581 | $30,600 / $31,620 | 12 | 3 | 44 | −$723 | +$1,198 | -4 | 6/10 | −$13,484 | −$6,641 / 0/29 |
| `FIRST_1000` | $106,945 | $128,055 | +$21,110 | +$18,525 | +$14,295 | −$6,887 / −$6,644 | $28,670 / $28,930 | 14 | 7 | 48 | −$392 | +$1,411 | 0 | 6/10 | +$10,767 | +$2,311 / 15/29 |
| `FIRST_1200` | $114,346 | $114,734 | +$388 | −$1,270 | −$3,668 | $0 / $0 | $30,737 / $30,949 | 8 | 3 | 35 | −$784 | +$800 | -16 | 7/10 | −$5,227 | −$396 / 6/29 |
| `FIRST_1400` | $120,076 | $124,273 | +$4,197 | +$3,829 | +$824 | −$6,746 / −$7,182 | $23,518 / $23,532 | 10 | 0 | 43 | −$1,537 | +$1,002 | -23 | 7/10 | −$14,848 | +$3,813 / 29/29 |
| `PERSIST_15` | $106,859 | $113,402 | +$6,544 | +$4,397 | +$1,690 | −$6,099 / −$6,036 | $29,922 / $30,145 | 9 | 2 | 38 | −$482 | +$903 | -1 | 7/10 | +$1,424 | +$5,898 / 29/29 |
| `PERSIST_30` | $84,964 | $83,083 | −$1,881 | −$3,429 | −$4,924 | +$1,802 / +$1,600 | $39,026 / $39,012 | 5 | 2 | 29 | −$603 | +$499 | -9 | 5/10 | −$6,765 | −$2,140 / 4/29 |
| `STABLE_15` | $132,753 | $135,579 | +$2,827 | +$478 | −$1,022 | $0 / $0 | $31,272 / $31,419 | 5 | 3 | 40 | −$1,205 | +$501 | -23 | 6/10 | −$3,534 | +$2,379 / 23/29 |
| `STABLE_30` | $102,495 | $128,234 | +$25,738 | +$24,519 | +$21,781 | −$918 / −$913 | $26,727 / $26,734 | 9 | 4 | 35 | −$30 | +$913 | 7 | 8/10 | +$12,082 | +$25,342 / 29/29 |
| `REBOUND_03` | $114,443 | $115,442 | +$999 | −$1,111 | −$2,308 | −$1,869 / −$1,404 | $28,870 / $29,148 | 4 | 4 | 43 | −$844 | +$400 | -18 | 3/10 | −$9,251 | −$8,395 / 9/29 |
| `REBOUND_05` | $129,780 | $135,753 | +$5,972 | +$4,013 | +$2,208 | −$6,494 / −$6,481 | $27,792 / $27,951 | 6 | 3 | 39 | −$753 | +$603 | -15 | 5/10 | −$522 | +$7,150 / 29/29 |
| `BAND_STABILIZE` | $140,731 | $159,587 | +$18,855 | +$17,714 | +$14,987 | +$2,465 / +$2,488 | $28,091 / $28,122 | 9 | 5 | 35 | −$271 | +$910 | 1 | 6/10 | +$3,264 | +$18,360 / 29/29 |
| `BAND_PERSIST` | $130,831 | $153,272 | +$22,440 | +$20,518 | +$17,487 | −$2,636 / −$2,212 | $25,270 / $25,678 | 10 | 4 | 35 | −$271 | +$1,012 | 5 | 7/10 | +$8,784 | +$21,945 / 29/29 |
| `BAND_LATE_DEEP` | $177,656 | $165,783 | −$11,873 | −$12,637 | −$13,517 | +$1,807 / +$1,988 | $27,721 / $27,902 | 3 | 0 | 32 | −$1,236 | +$294 | -20 | 3/10 | −$21,340 | −$10,915 / 0/29 |
<!-- /include -->

### For the incumbent's own entry (`CLOSE_1M`)

**The minute-updated stop makes the incumbent slightly worse.**

| Measure | Minute stop vs daily stop |
|---|---|
| Δnet, `stop` fill | −$2,243 |
| Δnet, `next-open` fill | −$2,847 |
| Δnet, 20 bp + `next-open` | −$4,342 |
| Minute drawdown | +$1,807 (worse) |
| Positive calendar years | 4 of 10 |
| Ensemble starts with Δ > 0 | 2 of 29 (median −$2,626) |

There are no same-session exits: a 15:59 fill leaves only the fill minute and the closing print, and neither can trigger. What changes is the 32 later stops that the minute rule raised within a session. The two largest episodes are both in 2020 and almost cancel each other:

- **+$11,777 (2020-04-09).** The minute stop sold at 10:23 at 223.75. The daily stop reached that same level only four sessions later. Exiting early avoided a −$3,215 maximum-hold trade.
- **−$11,326 (2020-03-10).** The minute stop sold at 11:00 for +$1,431, instead of the next morning's gap fill at +$2,620. The strategy then re-entered on 2020-03-11 at 220.01, and the maximum hold sold it on 2020-03-19 at 191.75 for −$13,182.

### For the earlier-entry policies

**The minute stop recovers part of the damage, but never enough.**

- **Under the `stop` fill** it improves 8 of the 10 unconditional early-entry policies:
  - `STABLE_30` +$25,738;
  - `FIRST_1000` +$21,110;
  - `PERSIST_15` +$6,544;
  - `REBOUND_05` +$5,972;
  - and smaller gains for the rest.
- **Under the `next-open` fill** it improves only 6 of 10. `FIRST_1200` and `REBOUND_03` turn negative.
- **On ensemble starts**, five unconditional policies are positive in at least 23 of 29 starts.
- **No minute-stop variant comes close to the incumbent.** The best unconditional one is `REBOUND_05` at $135,753, against `CLOSE_1M` + `STOP_DAILY` at $186,172.

The intuition: an intraday entry often buys a dip before it has finished. A stop that can tighten during the same and following sessions limits the follow-through on the trades that work.

## 2. Did it preserve rebounds or add churn?

The table below compares trades with the same entry (same session and fill) under both stop models.

<!-- include: tables/stop_paired_trades.md -->
| Entry policy | Minute-stop trades | Same entry under daily stop | Of which exit changed | Exited earlier | Better / worse | Σ Δ trade net (changed) | Σ gains | Σ losses | Minute-stop trades with no daily twin | Same-session exits (n / net) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | 176 | 149 | 25 | 17 | 16 / 9 | −$4,684 | +$8,695 | −$13,379 | 27 | 0 / $0 |
| `FIRST_0935` | 215 | 167 | 34 | 23 | 25 / 9 | −$230 | +$11,642 | −$11,872 | 48 | 3 / $10,689 |
| `FIRST_1000` | 218 | 171 | 33 | 22 | 23 / 10 | +$4,998 | +$14,255 | −$9,257 | 47 | 7 / $16,719 |
| `FIRST_1200` | 197 | 173 | 28 | 19 | 19 / 9 | −$13,264 | +$8,454 | −$21,717 | 24 | 3 / $3,877 |
| `FIRST_1400` | 209 | 174 | 32 | 24 | 20 / 12 | −$7,795 | +$18,889 | −$26,684 | 35 | 0 / $0 |
| `PERSIST_15` | 203 | 176 | 30 | 21 | 22 / 8 | +$342 | +$12,258 | −$11,917 | 27 | 2 / $6,811 |
| `PERSIST_30` | 175 | 156 | 23 | 13 | 20 / 3 | +$2,783 | +$9,398 | −$6,615 | 19 | 2 / $5,319 |
| `STABLE_15` | 202 | 174 | 31 | 21 | 22 / 9 | −$3,962 | +$9,179 | −$13,141 | 28 | 3 / $6,230 |
| `STABLE_30` | 172 | 151 | 29 | 18 | 25 / 4 | +$9,698 | +$15,550 | −$5,852 | 21 | 4 / $11,141 |
| `REBOUND_03` | 203 | 165 | 33 | 23 | 26 / 7 | +$12,279 | +$14,733 | −$2,454 | 38 | 4 / $9,422 |
| `REBOUND_05` | 196 | 168 | 32 | 22 | 25 / 7 | +$7,895 | +$14,226 | −$6,331 | 28 | 3 / $5,784 |
| `BAND_STABILIZE` | 185 | 158 | 26 | 18 | 18 / 8 | +$3,978 | +$13,495 | −$9,517 | 27 | 5 / $11,912 |
| `BAND_PERSIST` | 187 | 164 | 28 | 18 | 23 / 5 | +$10,509 | +$16,137 | −$5,628 | 23 | 4 / $11,652 |
| `BAND_LATE_DEEP` | 176 | 149 | 24 | 16 | 16 / 8 | −$186 | +$8,445 | −$8,630 | 27 | 0 / $0 |
<!-- /include -->

- **Most changed exits come out ahead.** Between 23 and 34 matched trades per policy exit differently, and in all of them the minute exit is *better* more often than worse: 16/9 for `CLOSE_1M`, up to 26/7 for `REBOUND_03`. The minute stop usually locks in a rebound a little higher, not lower.
- **The few worse exits cost more.** In those cases the stop sold early, before a further rise, or the exit fed into a worse re-entry. For `CLOSE_1M` the 9 worse exits cost −$13,379 and the 16 better ones gained +$8,695. For `FIRST_1200` and `FIRST_1400` the net is −$13.3k and −$7.8k.
- **Churn is modest:**
  - 3–14 extra trades per policy, and $300–$1,400 more fees at 5 bp;
  - 0–7 same-session round trips per policy. The stop can only activate after a rise of more than 2.15% above the fill, so these are mostly small wins: +$3.9k to +$16.7k in total per policy.
  - Slightly less interest, because positions are held for less time.
- **Every changed exit propagates.** It shifts the following entries, which are no longer comparable trade for trade: 19–48 minute-stop trades have no daily twin. The full-path episode sums in §1 are the measure that counts.

Year by year, the minute stop's gains are concentrated:

<!-- include: tables/stop_effect_years.md -->
| Entry policy (minute − daily) | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | $0 | +$384 | $0 | +$112 | +$2,111 | +$1,182 | −$1,949 | −$1,579 | −$1,418 | −$1,085 |
| `FIRST_0935` | +$589 | +$647 | +$3,015 | +$1,307 | −$5,971 | +$1,182 | +$7,557 | −$428 | −$1,514 | −$11,762 |
| `FIRST_1000` | $0 | +$646 | +$3,048 | +$1,503 | +$22,594 | +$1,181 | +$6,248 | −$1,432 | −$1,631 | −$11,047 |
| `FIRST_1200` | $0 | +$646 | +$26 | +$112 | +$3,202 | +$1,182 | +$1,763 | −$1,747 | −$5,107 | +$311 |
| `FIRST_1400` | $0 | +$384 | +$26 | +$112 | +$1,163 | +$1,181 | −$9,797 | +$1,340 | −$3,241 | +$13,029 |
| `PERSIST_15` | $0 | +$646 | +$26 | +$112 | +$518 | +$144 | −$2,354 | −$593 | +$1,275 | +$6,770 |
| `PERSIST_30` | $0 | +$259 | +$26 | +$112 | +$2,324 | +$144 | −$4,217 | $0 | −$529 | $0 |
| `STABLE_15` | $0 | +$646 | −$1,123 | +$112 | +$7,173 | +$1,181 | −$7,830 | −$592 | +$2,962 | +$299 |
| `STABLE_30` | $0 | +$258 | +$26 | +$112 | +$11,832 | +$144 | −$2,402 | +$57 | +$934 | +$14,777 |
| `REBOUND_03` | $0 | +$645 | +$10,276 | −$1,004 | −$523 | −$998 | +$6,901 | −$1,380 | −$3,518 | −$9,400 |
| `REBOUND_05` | $0 | +$386 | −$1,564 | −$859 | −$3,782 | +$143 | +$4,833 | −$592 | +$427 | +$6,980 |
| `BAND_STABILIZE` | $0 | +$384 | $0 | +$112 | +$9,495 | +$1,182 | −$9,384 | +$3,047 | −$1,414 | +$15,435 |
| `BAND_PERSIST` | $0 | +$384 | $0 | +$112 | +$6,307 | +$1,182 | +$2,140 | −$593 | −$1,414 | +$14,324 |
| `BAND_LATE_DEEP` | $0 | +$384 | $0 | +$112 | −$2,635 | +$1,182 | −$3,265 | −$5,150 | −$1,415 | −$1,085 |
<!-- /include -->

<!-- include: tables/stop_effect_windows.md -->
| Entry policy (minute − daily) | Dev Δ | 2024–25 continuous Δ | 2024–25 flat-start Δ | Flat-start minute DD (minute stop) | Q4_2018 | COVID_2020 | Y2022 | SPRING_2025 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | +$260 | −$2,503 | −$2,503 | $25,914 | $0 | −$5,023 | −$1,949 | −$1,170 |
| `FIRST_0935` | +$7,899 | −$13,277 | −$13,277 | $26,511 | +$2,988 | −$2,485 | +$7,557 | −$11,577 |
| `FIRST_1000` | +$33,788 | −$12,678 | −$12,678 | $28,670 | +$3,021 | +$19,466 | +$6,248 | −$10,989 |
| `FIRST_1200` | +$5,185 | −$4,796 | −$4,796 | $30,737 | $0 | +$171 | +$1,763 | $0 |
| `FIRST_1400` | −$5,591 | +$9,788 | +$9,788 | $22,673 | $0 | −$2,039 | −$9,797 | +$12,231 |
| `PERSIST_15` | −$1,501 | +$8,045 | +$8,045 | $29,922 | $0 | −$3,250 | −$2,354 | +$6,036 |
| `PERSIST_30` | −$1,352 | −$529 | −$529 | $33,866 | $0 | −$7,970 | −$4,217 | $0 |
| `STABLE_15` | −$434 | +$3,261 | +$3,261 | $31,272 | −$1,149 | −$20 | −$7,830 | $0 |
| `STABLE_30` | +$10,027 | +$15,712 | +$15,712 | $26,524 | $0 | −$1,110 | −$2,402 | +$14,777 |
| `REBOUND_03` | +$13,917 | −$12,918 | −$12,918 | $28,870 | +$10,249 | −$482 | +$6,901 | −$9,590 |
| `REBOUND_05` | −$1,434 | +$7,407 | +$7,407 | $27,792 | −$1,591 | −$5,724 | +$4,833 | +$6,431 |
| `BAND_STABILIZE` | +$4,834 | +$14,021 | +$14,021 | $25,782 | $0 | −$1,110 | −$9,384 | +$15,435 |
| `BAND_PERSIST` | +$9,531 | +$12,909 | +$12,909 | $24,553 | $0 | −$1,110 | +$2,140 | +$14,324 |
| `BAND_LATE_DEEP` | −$9,373 | −$2,500 | −$2,500 | $25,914 | $0 | −$5,023 | −$3,265 | −$1,170 |
<!-- /include -->

The positive Δ of the minute stop for intraday entries is concentrated in **2020** and **2025**:

- `STABLE_30`: +$11.8k in 2020 and +$14.8k in 2025.
- `FIRST_1000`: +$22.6k in 2020, but −$11.0k in 2025.
- `BAND_STABILIZE`: +$9.5k in 2020 and +$15.4k in 2025.

Many of the "positive years" are only +$26 to +$650. That inflates the protocol's ≥ 6-of-10 count, so the year counts should be read with that in mind.

The 2025 gains come from the April 2025 drawdown. There the minute stop exits on intraday rebounds that the daily stop would have given back.

## 3. Entry effects under each stop model (the other margin of the factorial)

The minute stop does not rescue early entry. With the minute stop held fixed for both arms, every early-entry policy still trails `CLOSE_1M` + minute stop:

- unconditional policies: −$48k to −$101k;
- conditional policies: −$18k to −$31k.

<!-- include: tables/entry_summary_minute.md -->
| Policy | Trades | Win % | Mean trade | Median trade | Worst trade | Gross price P&L | Interest | Fees | Turnover | Net (5 bp) | Δ vs CLOSE_1M | Minute DD | Δ minute DD | Daily DD | Sessions held | Mean days | Same-session exits |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | 176 | 67.4% | $1,045 | $1,078 | −$13,182 | $263,352 | $61,690 | $17,732 | $35.5M | $183,930 | — | $27,721 | — | $24,285 | 1596 | 11.6 | 0 |
| `FIRST_0935` | 215 | 62.6% | $554 | $507 | −$11,542 | $208,656 | $67,838 | $21,604 | $43.2M | $119,214 | −$64,716 | $30,600 | +$2,879 | $27,469 | 1771 | 10.5 | 3 |
| `FIRST_1000` | 218 | 63.6% | $587 | $505 | −$11,567 | $217,411 | $67,447 | $21,909 | $43.8M | $128,055 | −$55,874 | $28,670 | +$949 | $26,630 | 1762 | 10.3 | 7 |
| `FIRST_1200` | 197 | 61.7% | $582 | $1,040 | −$16,307 | $200,022 | $65,488 | $19,800 | $39.6M | $114,734 | −$69,196 | $30,737 | +$3,016 | $28,639 | 1697 | 11.0 | 3 |
| `FIRST_1400` | 209 | 60.6% | $595 | $646 | −$9,502 | $211,038 | $65,759 | $21,006 | $42.0M | $124,273 | −$59,656 | $23,518 | −$4,203 | $22,290 | 1709 | 10.4 | 0 |
| `PERSIST_15` | 203 | 64.9% | $559 | $671 | −$16,984 | $195,340 | $61,540 | $20,398 | $40.8M | $113,402 | −$70,527 | $29,922 | +$2,201 | $27,871 | 1619 | 10.1 | 2 |
| `PERSIST_30` | 175 | 62.1% | $475 | $755 | −$16,621 | $153,520 | $52,860 | $17,577 | $35.2M | $83,083 | −$100,846 | $39,026 | +$11,305 | $38,211 | 1396 | 10.0 | 2 |
| `STABLE_15` | 202 | 65.2% | $671 | $925 | −$16,699 | $220,382 | $64,493 | $20,310 | $40.6M | $135,579 | −$48,350 | $31,272 | +$3,551 | $29,200 | 1683 | 10.6 | 3 |
| `STABLE_30` | 172 | 62.0% | $746 | $728 | −$10,265 | $199,268 | $53,734 | $17,300 | $34.6M | $128,234 | −$55,696 | $26,727 | −$994 | $26,592 | 1397 | 10.4 | 4 |
| `REBOUND_03` | 203 | 60.9% | $569 | $714 | −$11,723 | $197,832 | $61,992 | $20,399 | $40.8M | $115,442 | −$68,488 | $28,870 | +$1,149 | $26,751 | 1627 | 10.1 | 4 |
| `REBOUND_05` | 196 | 63.1% | $693 | $961 | −$16,263 | $215,312 | $59,852 | $19,708 | $39.4M | $135,753 | −$48,177 | $27,792 | +$71 | $25,822 | 1580 | 10.1 | 3 |
| `BAND_STABILIZE` | 185 | 64.1% | $863 | $600 | −$10,372 | $239,837 | $61,630 | $18,620 | $37.2M | $159,587 | −$24,343 | $28,091 | +$370 | $28,018 | 1595 | 11.1 | 5 |
| `BAND_PERSIST` | 187 | 63.4% | $820 | $775 | −$9,775 | $233,839 | $61,751 | $18,817 | $37.6M | $153,272 | −$30,658 | $25,270 | −$2,451 | $24,830 | 1605 | 11.0 | 4 |
| `BAND_LATE_DEEP` | 176 | 66.3% | $942 | $974 | −$13,182 | $246,251 | $62,745 | $17,723 | $35.4M | $165,783 | −$18,147 | $27,721 | $0 | $24,285 | 1616 | 11.8 | 0 |
<!-- /include -->

<!-- include: tables/entry_sensitivity_minute.md -->
| Policy | Net 0 bp | Net 5 bp | Net 10 bp | Net 20 bp | Δ 5 bp (stop fill) | Net 5 bp next-open | Δ 5 bp next-open | Δ 20 bp next-open | Minute DD stop | Minute DD next-open | Max minute DD any cost/fill | ≥ $30k? |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `CLOSE_1M` | $201,661 | $183,930 | $166,198 | $130,735 | — | $182,605 | — | — | $27,721 | $27,902 | $28,762 | no |
| `FIRST_0935` | $140,818 | $119,214 | $97,609 | $54,401 | −$64,716 | $116,331 | −$66,274 | −$77,890 | $30,600 | $31,620 | $39,236 | **yes** |
| `FIRST_1000` | $149,964 | $128,055 | $106,147 | $62,329 | −$55,874 | $124,661 | −$57,944 | −$70,472 | $28,670 | $28,930 | $46,185 | **yes** |
| `FIRST_1200` | $134,534 | $114,734 | $94,934 | $55,334 | −$69,196 | $112,919 | −$69,686 | −$75,890 | $30,737 | $30,949 | $33,302 | **yes** |
| `FIRST_1400` | $145,279 | $124,273 | $103,268 | $61,257 | −$59,656 | $122,577 | −$60,027 | −$69,848 | $23,518 | $23,532 | $35,381 | **yes** |
| `PERSIST_15` | $133,800 | $113,402 | $93,005 | $52,209 | −$70,527 | $110,894 | −$71,711 | −$79,707 | $29,922 | $30,145 | $32,804 | **yes** |
| `PERSIST_30` | $100,660 | $83,083 | $65,506 | $30,353 | −$100,846 | $80,715 | −$101,890 | −$101,424 | $39,026 | $39,012 | $54,443 | **yes** |
| `STABLE_15` | $155,889 | $135,579 | $115,269 | $74,648 | −$48,350 | $133,409 | −$49,196 | −$56,930 | $31,272 | $31,419 | $37,037 | **yes** |
| `STABLE_30` | $145,533 | $128,234 | $110,934 | $76,335 | −$55,696 | $126,534 | −$56,070 | −$54,774 | $26,727 | $26,734 | $39,609 | **yes** |
| `REBOUND_03` | $135,840 | $115,442 | $95,043 | $54,245 | −$68,488 | $113,075 | −$69,530 | −$77,530 | $28,870 | $29,148 | $40,763 | **yes** |
| `REBOUND_05` | $155,460 | $135,753 | $116,045 | $76,630 | −$48,177 | $134,013 | −$48,591 | −$54,519 | $27,792 | $27,951 | $30,314 | **yes** |
| `BAND_STABILIZE` | $178,206 | $159,587 | $140,967 | $103,727 | −$24,343 | $157,539 | −$25,066 | −$27,730 | $28,091 | $28,122 | $36,926 | **yes** |
| `BAND_PERSIST` | $172,089 | $153,272 | $134,455 | $96,821 | −$30,658 | $150,680 | −$31,924 | −$35,178 | $25,270 | $25,678 | $40,061 | **yes** |
| `BAND_LATE_DEEP` | $183,506 | $165,783 | $148,060 | $112,614 | −$18,147 | $164,320 | −$18,285 | −$18,259 | $27,721 | $27,902 | $28,762 | no |
<!-- /include -->

<!-- include: tables/entry_attribution_minute.md -->
| Policy | Δ net | Episodes | VARIANT_ENTRY_REVERSAL (n / $) | VARIANT_ENTRY_OTHER (n / $) | BOTH_ENTER_EARLIER_LOWER (n / $) | BOTH_ENTER_EARLIER_HIGHER (n / $) | REFERENCE_ENTRY_ONLY (n / $) | EXIT_DIFFERENCE (n / $) | OTHER (n / $) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `FIRST_0935` | −$64,716 | 40 | 11 / −$9,306 | 5 / +$2,489 | 6 / +$202 | 18 / −$58,100 | – | – | – |
| `FIRST_1000` | −$55,874 | 45 | 14 / −$2,393 | 5 / +$21,975 | 6 / +$544 | 20 / −$76,001 | – | – | – |
| `FIRST_1200` | −$69,196 | 50 | 16 / −$817 | 3 / +$6,645 | 10 / −$35,212 | 21 / −$39,812 | – | – | – |
| `FIRST_1400` | −$59,656 | 55 | 12 / −$5,628 | 3 / +$22,032 | 14 / −$7,082 | 26 / −$68,979 | – | – | – |
| `PERSIST_15` | −$70,527 | 49 | 9 / −$337 | 6 / +$4,690 | 9 / −$23,554 | 23 / −$28,754 | 2 / −$22,573 | – | – |
| `PERSIST_30` | −$100,846 | 46 | 3 / −$18,353 | 2 / +$8,799 | 9 / −$15,850 | 18 / −$28,021 | 14 / −$47,422 | – | – |
| `STABLE_15` | −$48,350 | 51 | 9 / +$1,042 | 2 / −$3,059 | 9 / −$26,367 | 27 / −$20,314 | 4 / +$348 | – | – |
| `STABLE_30` | −$55,696 | 49 | 3 / −$8,315 | 2 / +$1,079 | 8 / −$19,369 | 15 / +$1,586 | 21 / −$30,676 | – | – |
| `REBOUND_03` | −$68,488 | 46 | 7 / −$8,454 | 3 / −$2,414 | 14 / −$18,754 | 17 / −$17,395 | 5 / −$21,471 | – | – |
| `REBOUND_05` | −$48,177 | 51 | 5 / −$6,070 | 1 / −$5,042 | 15 / −$47,971 | 20 / +$6,036 | 10 / +$4,871 | – | – |
| `BAND_STABILIZE` | −$24,343 | 27 | – | 3 / +$6,148 | 8 / −$4,218 | 12 / +$6,578 | 4 / −$32,850 | – | – |
| `BAND_PERSIST` | −$30,658 | 30 | – | 5 / +$2,927 | 7 / −$8,138 | 17 / −$14,948 | 1 / −$10,499 | – | – |
| `BAND_LATE_DEEP` | −$18,147 | 25 | – | – | 8 / +$2,997 | 15 / −$21,023 | 2 / −$121 | – | – |
<!-- /include -->

<!-- include: tables/entry_robustness_minute.md -->
| Policy | Δ net | First divergence | Largest + episode | Largest − episode | Δ ex largest + episode | Δ ex best year | Net ex best trade | Ensemble median Δ (stop) | Starts Δ>0 | Ensemble range | Ensemble median Δ (next-open) | Starts Δ>0 (next-open) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `FIRST_0935` | −$64,716 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-06 +$15,938 | 2022-04-14 −$19,379 | −$80,654 | −$68,849 | $109,028 | −$41,450 | 0/29 | −$64,858 … −$895 | −$41,848 | 0/29 |
| `FIRST_1000` | −$55,874 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-06 +$35,050 | 2022-04-14 −$19,643 | −$90,924 | −$80,604 | $117,870 | −$35,247 | 0/29 | −$62,202 … −$5,191 | −$36,240 | 0/29 |
| `FIRST_1200` | −$69,196 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2024-01-02 +$5,363 | 2025-01-29 −$19,603 | −$74,558 | −$76,121 | $104,619 | −$38,291 | 0/29 | −$72,557 … −$12,092 | −$38,372 | 0/29 |
| `FIRST_1400` | −$59,656 | 2016-11-01 (VARIANT_ENTRY_REVERSAL) | 2020-03-06 +$17,262 | 2021-01-27 −$18,527 | −$76,918 | −$70,852 | $114,043 | −$30,630 | 1/29 | −$59,656 … +$1,502 | −$31,056 | 1/29 |
| `PERSIST_15` | −$70,527 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-06 +$17,968 | 2024-12-10 −$19,463 | −$88,495 | −$79,732 | $102,717 | −$35,852 | 0/29 | −$76,542 … −$9,677 | −$36,905 | 0/29 |
| `PERSIST_30` | −$100,846 | 2016-11-02 (BOTH_ENTER_EARLIER_HIGHER) | 2020-03-06 +$15,248 | 2022-08-22 −$20,767 | −$116,094 | −$116,498 | $72,680 | −$58,255 | 3/29 | −$101,044 … +$5,994 | −$58,160 | 3/29 |
| `STABLE_15` | −$48,350 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-09 +$21,572 | 2021-01-27 −$17,432 | −$69,922 | −$61,656 | $125,197 | −$30,981 | 0/29 | −$54,334 … −$9,292 | −$31,413 | 0/29 |
| `STABLE_30` | −$55,696 | 2016-11-02 (BOTH_ENTER_EARLIER_HIGHER) | 2020-03-09 +$20,764 | 2017-11-29 −$11,711 | −$76,459 | −$66,566 | $115,201 | −$22,429 | 4/29 | −$55,696 … +$18,770 | −$22,008 | 4/29 |
| `REBOUND_03` | −$68,488 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-09 +$23,963 | 2022-04-14 −$18,260 | −$92,451 | −$83,294 | $104,804 | −$36,468 | 0/29 | −$68,488 … −$5,662 | −$37,644 | 0/29 |
| `REBOUND_05` | −$48,177 | 2016-10-13 (VARIANT_ENTRY_REVERSAL) | 2020-03-09 +$23,674 | 2025-01-29 −$16,667 | −$71,851 | −$62,702 | $125,253 | −$16,035 | 0/29 | −$48,260 … −$5,852 | −$15,538 | 0/29 |
| `BAND_STABILIZE` | −$24,343 | 2017-06-29 (BOTH_ENTER_EARLIER_LOWER) | 2020-03-09 +$20,396 | 2022-01-20 −$20,093 | −$44,739 | −$37,763 | $146,554 | −$17,135 | 5/29 | −$30,119 … +$13,637 | −$16,895 | 5/29 |
| `BAND_PERSIST` | −$30,658 | 2017-06-29 (BOTH_ENTER_EARLIER_LOWER) | 2020-03-09 +$21,355 | 2022-09-29 −$12,827 | −$52,013 | −$43,705 | $139,771 | −$23,025 | 4/29 | −$39,804 … +$12,335 | −$22,880 | 4/29 |
| `BAND_LATE_DEEP` | −$18,147 | 2017-06-29 (BOTH_ENTER_EARLIER_LOWER) | 2025-05-22 +$3,981 | 2020-10-02 −$12,020 | −$22,127 | −$22,127 | $154,200 | −$13,459 | 6/29 | −$19,023 … +$2,066 | −$13,695 | 7/29 |
<!-- /include -->

The combined change from (`CLOSE_1M`, daily) to (`X`, minute) splits into an entry effect and a stop effect. They interact: the minute stop helps intraday entries much more than it helps close entries.

<!-- include: tables/conditional_interaction.md -->
| Policy | Entry effect, daily stop | Entry effect, minute stop | Stop effect | Stop effect on CLOSE_1M | Interaction (stop effect − CLOSE_1M stop effect) |
|---|---:|---:|---:|---:|---:|
| `BAND_STABILIZE` | −$45,441 | −$24,343 | +$18,855 | −$2,243 | +$21,098 |
| `BAND_PERSIST` | −$55,341 | −$30,658 | +$22,440 | −$2,243 | +$24,683 |
| `BAND_LATE_DEEP` | −$8,517 | −$18,147 | −$11,873 | −$2,243 | −$9,630 |
| `FIRST_0935` | −$61,580 | −$64,716 | −$5,378 | −$2,243 | −$3,135 |
| `FIRST_1000` | −$79,227 | −$55,874 | +$21,110 | −$2,243 | +$23,353 |
| `FIRST_1200` | −$71,827 | −$69,196 | +$388 | −$2,243 | +$2,631 |
| `FIRST_1400` | −$66,096 | −$59,656 | +$4,197 | −$2,243 | +$6,439 |
| `PERSIST_15` | −$79,314 | −$70,527 | +$6,544 | −$2,243 | +$8,786 |
| `PERSIST_30` | −$101,208 | −$100,846 | −$1,881 | −$2,243 | +$361 |
| `STABLE_15` | −$53,420 | −$48,350 | +$2,827 | −$2,243 | +$5,069 |
| `STABLE_30` | −$83,677 | −$55,696 | +$25,738 | −$2,243 | +$27,981 |
| `REBOUND_03` | −$71,729 | −$68,488 | +$999 | −$2,243 | +$3,241 |
| `REBOUND_05` | −$56,392 | −$48,177 | +$5,972 | −$2,243 | +$8,215 |
<!-- /include -->

## 4. Phase 2 conclusion (predeclared categories, [PROTOCOL.md](PROTOCOL.md) §10)

The stop-model comparison is minute vs daily with the same entry. The criteria are:

- **O:** at least 10 exits through an intrasession stop raise.
- **E:** Δ ≥ +$5k under both fills, ΔDD ≤ +$5k, DD < $30k.
- **Rp:** at least 6/10 years positive, positive after removing the largest episode and after removing the best year, and an ensemble median > 0 with at least 60% of starts positive.

Results for the 11 unconditional entry policies:

| Category | Count | Policies |
|---|---:|---|
| Supports | 1 | `STABLE_30` |
| Inconclusive | 4 | `FIRST_1000`, `FIRST_1400`, `REBOUND_03`, `REBOUND_05` |
| Argues against | 6 | `CLOSE_1M`, `FIRST_0935`, `FIRST_1200`, `PERSIST_15`, `PERSIST_30`, `STABLE_15` |

The conditional policies split:

- `BAND_STABILIZE` and `BAND_PERSIST`: supports;
- `BAND_LATE_DEEP`: argues against, at −$11,873.

**By the predeclared family rule (≥ 6 of 11 "argues against"), the minute-updated stop is categorised as *argues against further optimization*.**

That count needs one disclosure. `FIRST_1200`, `PERSIST_15` and `STABLE_15` are "against" only because their minute DD is ≥ $30,000 under at least one fill. That gate is breached by the entry policy itself, and the minute stop's own Δnet for them is small and mostly positive.

A plainer reading, kept separate from the rule:

- **For the incumbent's close entry**, the minute stop is a small, consistent negative.
- **For intraday entries** it is a real but secondary mitigation, concentrated in 2020 and 2025.
- **Making intraday entries tolerable is no reason to adopt them.** Every intraday entry is still far behind the incumbent.

Whether a minute-updated stop deserves study is therefore tied to whether intraday entries do. Phases 1 and 3 say they do not.
