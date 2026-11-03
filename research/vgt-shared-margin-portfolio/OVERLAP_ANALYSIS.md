# Overlap analysis: D1 and swing-low positions and signals (Track I)

Both strategies were run **independently and unchanged** on the same VGT minute data under the common eligibility
(first arming 2017-06-15, session 365; PROTOCOL.md §3), with a fixed $100,000 per entry so that the trade lists are
the files' own (BASELINE_REPRODUCTION.md). Everything below is computed from those two standalone runs
(`results/overlap/standalone-d1/`, `results/overlap/standalone-swing/`) by `npm run shared-margin -- overlap`, which
writes [`results/overlap/overlap_summary.json`](results/overlap/overlap_summary.json),
[`results/position_overlaps.csv`](results/position_overlaps.csv) and
[`results/competing_signals.csv`](results/competing_signals.csv). The shared-pool refusals in §4 come from scenario
P2's signal log ([`results/scenarios/P2/signals.csv`](results/scenarios/P2/signals.csv)). All figures are
**computed** on observed history unless marked hypothetical.

## 1. Conventions

- A **position** is the minute interval from the fill's minute (the open of the first minute with trades after the
  rebound decision, or the opening trade of the next session) to the exit's minute (the stop level, the minute that
  opened through the stop, the opening trade of a gapped session, or the next trade after a maximum-hold or buffered
  decision). An open position ends at the last close, 2025-10-13 16:00 ET.
- Two positions **overlap** when their intervals intersect. Concurrent minutes are the regular-session VGT minutes in
  the intersection; concurrent sessions are the sessions touched by it.
- A **signal** is a confirmed rebound: the completed minute whose close reaches the trailing low × (1 + Y). In a
  standalone run every signal fills, so "signals while the other holds" are counted on the standalone fills'
  decision minutes. These are **shadow** signals: they show when a strategy would have wanted to buy, not that the
  shared account could have executed two full-size lots.
- An **arming** is the completed minute that arms a setup (D1: the X decline or the continuation pullback;
  swing-low: a close at or below the rolling K-session low).
- The hypothetical exits in the chronology (T1/T2) are the first entrant's $100,000 lot managed by the second
  strategy's exit rules from the second strategy's decision minute, with no new principal (PROTOCOL.md §5.4).

## 2. Totals and overlap statistics

From `overlap_summary.json`:

| Measure | D1 | Swing-low C2 |
|---|---:|---:|
| Trades (common eligibility) | 20 (1 open at the end) | 32 |
| Invested regular-session minutes | 253,625 | 150,387 |
| Invested sessions (touched) | 783 | 480 |
| Lots with at least one overlap | 13 of 20 | 14 of 32 |
| Signals (decision minutes) while the other strategy held a lot | 5 | 12 |
| Armings while the other strategy held a lot | 4 | 6 |
| Entries with an entry of the other strategy within ±20 sessions | 17 of 20 | 18 of 32 |

| Joint measure | Value |
|---|---:|
| Overlapping position pairs | 16 |
| Concurrent minutes | 42,474 |
| Concurrent sessions | 139 |
| Share of D1's invested time that was concurrent | 16.7% |
| Share of swing-low's invested time that was concurrent | 28.2% |
| Longest overlap | 16,996 minutes, 52 sessions (pair 1, 2018-12-21 → 2019-03-08) |
| Identical entry minutes | 1 (2020-03-12 13:32Z, both at 205.22) |
| Correlation of the two standalone daily P&L changes | 0.387 |
| Sessions on which both standalone marks were below their running peaks | 1,419 of 2,459 |

Zero identical trades (the earlier program's statement, confirmed here as one identical minute out of 52 entries)
is very different from zero time overlap: **16 pairs, 139 sessions of concurrent exposure, and 13 of D1's 20
lots** were open at the same time as a swing-low lot. Of the 5 D1 decisions made while a swing-low lot was open,
4 are second entrants in the pair table below; the fifth is the identical-minute case of 2020-03-12, where the
swing fill and the D1 decision carry the same minute stamp. The 12 swing-low decisions while D1 held are the
remaining 12 pairs.

The two strategies fire in the **same episodes**: 17 of 20 D1 entries have a swing-low entry within 20 sessions
and 18 of 32 swing-low entries have a D1 entry within 20 sessions. The daily P&L correlation of 0.39 is moderate
because the holding periods differ (swing-low's 4% stop and 26-day hold against D1's 7.3% stop and 8-day hold),
not because the strategies pick different declines.

## 3. Chronology of every overlap

Copied verbatim from [`results/tables/overlap_chronology.md`](results/tables/overlap_chronology.md), which is
rendered from `position_overlaps.csv`. Nets are per $100,000 standalone lot. "T1/T2" is the first entrant's lot
managed by the second strategy's exit rules from the second's decision minute (no new principal).

| # | First | First entry → exit (reason, net) | Second | Second entry → exit (reason, net) | Overlap | First lot net at second signal | Joint mark min / max | T1 exit (reason, net) | T2 exit (reason, net) |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | --- | --- |
| 1 | swing | 2018-12-17 20:58Z @168.67 → 2019-03-08 14:30Z @187.53 (trailing stop gap, +$8,741) | d1 | 2018-12-21 17:35Z @160.42 → 2019-05-13 13:54Z @200.02 (trailing stop, +$20,375) | 16996 min, 52 sessions | −$5,018 | −$12,101 / +$33,424 | 2018-12-26 @156.68 (maximum hold, −$7,380) | 2018-12-26 @156.68 (maximum hold, −$7,380) |
| 2 | d1 | 2020-02-28 14:32Z @226.94 → 2020-03-06 14:30Z @232.86 (trailing stop, +$2,398) | swing | 2020-02-28 14:33Z @227.98 → 2020-03-03 19:03Z @238.10 (trailing stop, +$4,318) | 1048 min, 3 sessions | +$375 | −$2,162 / +$20,203 | 2020-03-03 @238.10 (trailing stop, +$4,797) | 2020-03-03 @238.10 (trailing stop, +$4,797) |
| 3 | d1 | 2020-03-12 13:32Z @205.22 → 2020-03-20 13:31Z @198.64 (maximum hold, −$3,447) | swing | 2020-03-12 13:32Z @205.22 → 2020-03-13 13:42Z @205.52 (trailing stop, +$114) | 386 min, 2 sessions | −$29 | −$7,270 / +$8,323 | 2020-03-13 @205.52 (trailing stop, +$114) | 2020-03-13 @205.52 (trailing stop, +$114) |
| 4 | d1 | 2020-03-12 13:32Z @205.22 → 2020-03-20 13:31Z @198.64 (maximum hold, −$3,447) | swing | 2020-03-16 13:47Z @192.84 → 2020-03-17 13:30Z @194.11 (trailing stop gap, +$631) | 372 min, 2 sessions | −$6,316 | −$9,007 / +$7,590 | 2020-03-17 @194.11 (trailing stop gap, −$5,564) | 2020-03-27 @209.23 (trailing stop, +$1,500) |
| 5 | d1 | 2020-03-12 13:32Z @205.22 → 2020-03-20 13:31Z @198.64 (maximum hold, −$3,447) | swing | 2020-03-18 17:35Z @184.71 → 2020-03-20 16:25Z @193.50 (trailing stop, +$4,697) | 534 min, 3 sessions | −$10,316 | −$11,922 / +$7,077 | 2020-03-19 @191.57 (trailing stop gap, −$6,862) | 2020-03-27 @209.23 (trailing stop, +$1,500) |
| 6 | d1 | 2020-03-23 13:33Z @185.73 → 2020-04-01 16:49Z @203.18 (trailing stop, +$9,125) | swing | 2020-03-23 13:44Z @183.29 → 2020-03-27 13:41Z @209.23 (trailing stop, +$14,030) | 1547 min, 5 sessions | −$1,399 | −$5,259 / +$35,704 | 2020-03-27 @209.23 (trailing stop, +$12,531) | 2020-03-27 @209.23 (trailing stop, +$12,531) |
| 7 | d1 | 2021-03-05 16:31Z @337.17 → 2021-05-11 13:30Z @355.50 (trailing stop gap, +$3,419) | swing | 2021-03-05 16:37Z @338.05 → 2021-03-18 19:40Z @352.39 (trailing stop, +$3,849) | 3442 min, 10 sessions | +$297 | −$228 / +$16,748 | 2021-03-18 @352.39 (trailing stop, +$4,121) | 2021-03-18 @352.39 (trailing stop, +$4,121) |
| 8 | d1 | 2022-03-14 18:35Z @367.27 → 2022-04-07 16:45Z @398.20 (trailing stop, +$7,698) | swing | 2022-03-14 19:02Z @368.46 → 2022-04-01 15:56Z @412.20 (trailing stop, +$11,329) | 4386 min, 15 sessions | +$286 | −$856 / +$32,628 | 2022-04-01 @412.20 (trailing stop, +$11,691) | 2022-04-01 @412.20 (trailing stop, +$11,691) |
| 9 | d1 | 2022-04-26 19:45Z @366.26 → 2022-05-06 13:31Z @363.42 (maximum hold, −$1,077) | swing | 2022-04-27 13:31Z @369.43 → 2022-04-29 19:29Z @369.97 (trailing stop, +$86) | 1024 min, 3 sessions | +$766 | −$922 / +$9,425 | 2022-04-29 @369.97 (trailing stop, +$924) | 2022-04-29 @369.97 (trailing stop, +$924) |
| 10 | d1 | 2022-04-26 19:45Z @366.26 → 2022-05-06 13:31Z @363.42 (maximum hold, −$1,077) | swing | 2022-05-02 18:08Z @365.38 → 2022-05-05 14:32Z @371.54 (trailing stop, +$1,595) | 851 min, 4 sessions | −$255 | −$1,744 / +$11,175 | 2022-05-04 @369.97 (trailing stop, +$773) | 2022-05-05 @371.54 (trailing stop, +$1,170) |
| 11 | swing | 2022-05-06 14:06Z @360.54 → 2022-06-01 14:20Z @361.96 (buffered intraday loss, −$390) | d1 | 2022-05-12 13:42Z @332.71 → 2022-06-10 13:36Z @342.66 (trailing stop, +$2,116) | 4457 min, 14 sessions | −$8,020 | −$11,532 / +$10,822 | 2022-05-16 @347.67 (maximum hold, −$3,871) | 2022-05-16 @347.67 (maximum hold, −$3,871) |
| 12 | d1 | 2022-06-13 13:34Z @328.51 → 2022-06-21 13:31Z @325.72 (maximum hold, −$1,092) | swing | 2022-06-13 14:01Z @327.97 → 2022-06-28 18:19Z @332.34 (trailing stop, +$882) | 1812 min, 6 sessions | +$78 | −$9,060 / +$3,986 | 2022-06-28 @332.34 (trailing stop, +$714) | 2022-06-28 @332.34 (trailing stop, +$714) |
| 13 | swing | 2022-06-13 14:01Z @327.97 → 2022-06-28 18:19Z @332.34 (trailing stop, +$882) | d1 | 2022-06-22 13:32Z @324.92 → 2022-07-01 13:31Z @326.24 (maximum hold, +$135) | 1492 min, 5 sessions | −$1,183 | −$1,679 / +$11,382 | 2022-06-23 @329.29 (maximum hold, +$101) | 2022-06-23 @329.29 (maximum hold, +$101) |
| 14 | d1 | 2022-09-16 14:03Z @329.27 → 2022-09-26 13:31Z @319.77 (maximum hold, −$3,187) | swing | 2022-09-22 15:50Z @324.19 → 2022-10-18 13:31Z @319.26 (maximum hold, −$2,304) | 588 min, 3 sessions | −$1,666 | −$7,130 / +$13 | 2022-10-12 @302.00 (maximum hold, −$9,066) | 2022-10-12 @302.00 (maximum hold, −$9,066) |
| 15 | swing | 2022-09-22 15:50Z @324.19 → 2022-10-18 13:31Z @319.26 (maximum hold, −$2,304) | d1 | 2022-10-10 15:14Z @306.40 → 2022-11-03 13:32Z @310.69 (trailing stop, +$676) | 2002 min, 7 sessions | −$6,011 | −$15,455 / +$1,638 | 2022-10-11 @304.34 (maximum hold, −$6,697) | 2022-10-11 @304.34 (maximum hold, −$6,697) |
| 16 | d1 | 2025-04-04 13:46Z @491.58 → 2025-04-10 16:17Z @498.62 (trailing stop, +$1,252) | swing | 2025-04-04 13:47Z @491.76 → 2025-04-10 13:30Z @516.06 (trailing stop gap, +$4,760) | 1537 min, 5 sessions | +$150 | −$16,459 / +$18,178 | 2025-04-10 @516.06 (trailing stop gap, +$4,799) | 2025-04-10 @516.06 (trailing stop gap, +$4,799) |

### Reading the episodes

- **2018-12 (pair 1).** Swing-low entered first on 2018-12-17 at 168.67 into the falling Q4 2018 market; D1's
  2018-12-21 signal (160.42, its best historical trade at +$20,375 per $100k) arrived with the swing lot
  **−$5,018 under water**. Had D1's rules taken the swing lot over, D1's 8-day maximum hold (counted from the swing
  entry) would have sold it on 2018-12-26 at 156.68 for −$7,380 under both T1 and T2, and D1's own entry would
  never have happened. Standalone, both lots won (+$8,741 and +$20,375). This single episode is the longest
  overlap (52 sessions) and the clearest case where a shared pool destroys value.
- **2020-03 (pairs 2–6).** Five overlaps in the COVID crash and recovery. D1 entered first each time, usually a few
  minutes before swing-low (pair 2: one minute; pair 3: the identical minute 2020-03-12 13:32Z at 205.22). The
  first lot's net at the second signal ranges from +$375 to −$10,316 (pair 5, as D1's 2020-03-12 lot fell with
  the market). Swing-low's rules applied to D1's lots would have exited earlier on its tighter 4% stop: profitably
  in pairs 2, 3 and 6 (+$4,797, +$114, +$12,531), but as gapped stops at a loss in pairs 4 and 5 under T1
  (−$5,564, −$6,862) where T2's reset high would instead have held to 2020-03-27 (+$1,500). D1's own 2020-03-12
  lot lost −$3,447 standalone.
- **2021-03 (pair 7).** Six minutes apart on 2021-03-05; the swing stop would have closed D1's lot on 2021-03-18 at
  +$4,121 instead of D1's 2021-05-11 gapped stop at +$3,419.
- **2022 (pairs 8–15).** Eight overlaps in the bear market, both directions. When D1 entered first (8, 9, 10, 12,
  14), swing-low's signal came 27 minutes to a few sessions later with the D1 lot roughly flat (−$1,666 to +$766).
  When swing-low entered first (11, 13, 15), D1's signal found the swing lot **−$8,020, −$1,183 and −$6,011 under
  water** and D1's maximum hold would have sold it within days at −$3,871, +$101 and −$6,697, versus the swing
  lots' own −$390, +$882 and −$2,304 and D1's own standalone +$2,116, +$135 and +$676. Pair 14 is the one case
  where swing-low's rules on a D1 lot would have done much worse (−$9,066 versus D1's −$3,187).
- **2025-04 (pair 16).** One minute apart on 2025-04-04; swing-low's gapped stop on 2025-04-10 at 516.06 (+$4,799
  on the D1 lot) beat D1's own stop at 498.62 (+$1,252).

Across the 16 pairs the first entrant's net at the second signal was negative in 10 cases, and in 4 of the 4
swing-first pairs the swing lot was in loss when D1 signalled. The T1 and T2 definitions give the same hypothetical
exit in 14 of 16 pairs; they differ only in pairs 4, 5 and 10, where the reset reference avoided a gapped stop.

## 4. Competing signals under one shared pool

Scenario P2 (first signal wins, hold semantics) is the direct test: a rebound signal that finds the pool occupied is
refused and the setup stays armed, re-testing the trigger every later minute. The raw log therefore contains one
refusal per re-tested minute — **34,840 D1 and 25,678 swing-low refused minutes** against 15 and 25 grants — so
conflicts must be counted as **setups**, not minutes. From
[`results/tables/competing_signals_P2.md`](results/tables/competing_signals_P2.md):

| Strategy | Setup | Kind | First refused | Price | Pool held by | Holder net at first refusal | Refused minutes | Last refused | Later filled |
| --- | ---: | --- | --- | ---: | --- | ---: | ---: | --- | --- |
| d1 | 1 | deep | 2018-12-21 17:35Z | 160.41 | swing | −$4,596 | 16927 | 2019-03-07 21:00Z | 2019-03-08 14:31Z @187.30 |
| swing | 6 | swing | 2020-02-28 14:33Z | 227.79 | d1 | +$467 | 1901 | 2020-03-05 21:00Z | 2020-03-06 14:31Z @233.99 |
| d1 | 4 | deep | 2020-03-12 13:32Z | 205.16 | swing | −$15,897 | 5313 | 2020-04-01 13:31Z | 2020-04-01 13:32Z @205.29 |
| swing | 7 | swing | 2021-03-05 16:37Z | 338.17 | d1 | +$564 | 14848 | 2021-05-10 20:00Z | 2021-05-11 13:31Z @354.40 |
| swing | 13 | swing | 2022-03-14 19:02Z | 368.32 | d1 | +$633 | 5663 | 2022-04-07 16:45Z | 2022-04-07 16:46Z @398.24 |
| d1 | 8 | continuation | 2022-04-26 19:45Z | 366.13 | swing | −$21,198 | 1359 | 2022-05-03 13:31Z | 2022-05-03 13:32Z @371.91 |
| swing | 14 | swing | 2022-05-05 19:37Z | 364.88 | d1 | −$4,218 | 812 | 2022-05-11 13:31Z | 2022-05-11 13:32Z @350.87 |
| d1 | 9 | deep | 2022-05-12 13:42Z | 332.28 | swing | −$10,799 | 6428 | 2022-06-09 19:04Z | 2022-06-09 19:05Z @354.68 |
| swing | 15 | swing | 2022-06-13 14:01Z | 328.77 | d1 | −$15,568 | 831 | 2022-06-17 13:31Z | 2022-06-17 13:32Z @317.78 |
| d1 | 10 | deep | 2022-06-21 13:35Z | 326.92 | swing | +$5,326 | 1863 | 2022-06-28 18:19Z | 2022-06-28 18:20Z @332.34 |
| d1 | 12 | deep | 2022-10-10 15:14Z | 306.46 | swing | −$11,492 | 1871 | 2022-10-18 13:31Z | 2022-10-18 13:32Z @319.00 |
| swing | 25 | swing | 2025-04-04 13:47Z | 492.32 | d1 | +$454 | 1623 | 2025-04-10 16:17Z | 2025-04-10 16:18Z @498.31 |
| d1 | 15 | deep | 2025-04-11 13:36Z | 507.17 | swing | +$5,563 | 1079 | 2025-04-15 20:00Z | 2025-04-16 13:31Z @513.00 |

**13 setups were refused** (7 D1, 6 swing-low) and every one of them eventually filled under hold semantics, but
at a different price and time: D1 setup 1 was refused at 160.41 on 2018-12-21 and filled at **187.30 on
2019-03-08**, 16.8% higher, after 16,927 refused minutes; D1 setup 9 refused at 332.28 filled at 354.68; swing
setup 7 refused at 338.17 filled at 354.40. The pool-holder's lot was in loss at 7 of the 13 first refusals (D1
refusals found the swing lot at −$4,596 to −$21,198 in dynamic dollars). The dynamic dollar results of these
late fills, and of the alternative semantics, are in SHARED_MARGIN_POLICIES.md.

Note that the 16 shadow conflicts of §2–§3 and the 13 refused setups of P2 are different counts of the same
phenomenon: in P2 a refused D1 setup that later fills changes which lots are open afterwards, so some standalone
overlaps never arise and new ones do.

## 5. Decision question 1

**How often do D1 and swing-low positions actually overlap?** 16 position pairs over 2017-06-15 → 2025-10-13,
involving 13 of D1's 20 lots and 14 of swing-low's 32, for 42,474 concurrent minutes over 139 sessions: **16.7% of
D1's invested time and 28.2% of swing-low's**. The longest overlap lasted 52 sessions (2018-12-21 → 2019-03-08).
Only one entry minute is identical (2020-03-12), but 17 of 20 D1 entries have a swing-low entry within 20
sessions: the strategies trade the same declines on different clocks.

**How many genuine executable entry signals conflict under shared capital?** 16 standalone (shadow) signals
arrived while the other strategy held a lot: 4 D1 signals during swing-low lots (2018-12-21, 2022-05-12,
2022-06-22, 2022-10-10; a fifth, 2020-03-12, is the identical-minute case) and 12 swing-low signals during D1
lots. In the actual shared-pool simulation (P2) **13 setups were refused** at their first signal, 7 of D1's and 6
of swing-low's; all later filled once the pool was free, at prices up to 16.8% away from the original decision.
The conflicts are concentrated in three episodes (Q4 2018, March 2020, 2022), and in every swing-first conflict
the swing lot was in loss when D1 signalled.

## 6. Ambiguities and alternatives

The strategies' entry logic depends on their own position state, so what a refused strategy does next is a
modelling choice, not a fact of the files. Three predeclared semantics were run (PROTOCOL.md §5.2):

- **hold** — the refused setup stays armed and re-tests the trigger; it fills at the first qualifying minute after
  the pool frees. This is the files' own state machine with only the fill gated, but it produces late fills at
  stale triggers (the 187.30 fill of a 160.41 signal).
- **cancel** — the refused setup is dropped; the strategy re-arms only on a fresh arming condition.
- **shadow** — the standalone trade list is replayed; a trade executes only if the pool is free at its fill minute
  and then follows its own standalone exit; refused trades leave a phantom position.

They yield different trade lists (P2: 40 lots, P2c: 37, P2s: 38) and different results; SHARED_MARGIN_POLICIES.md
reports the dollars. There is no observed evidence that picks one: a live trader would most likely behave
somewhere between hold and cancel.

## 7. Limitations

- The standalone signals are the files' own under the common eligibility and the fixed $100,000; with dynamic
  sizing the fill minutes and prices are unchanged (the decisions don't depend on size), so the overlap statistics
  carry over to the portfolio scenarios.
- The T1/T2 columns of the chronology are per-$100,000 counterfactuals computed by `replay.ts` for the pair's two
  lots only; the full dynamic-dollar takeover results, with the account's actual lots, are in
  SHARED_MARGIN_POLICIES.md and differ because a takeover changes which later lots exist.
- Concurrent minutes count VGT regular-session minutes with trades; sessions "touched" include partial sessions.
- Every number is an inspected historical backtest on data already examined by four earlier programs; the 2018,
  2020, 2022 and 2025 episodes are the same ones those programs studied, and nothing here is evidence of
  predictive skill.
