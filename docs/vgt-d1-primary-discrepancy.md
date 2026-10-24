# VGT D1 `primary` on `all`: why the result changed (2026-10-24)

The same command reported two different results on the same data file:

```bash
npm run app -- allIn-trailingBuy-postExitContinuation VGT all --phenotype primary
```

| Metric | Earlier | Current |
|---|---:|---:|
| Total net profit | $195,186.28 | $178,574.30 |
| Realized / unrealized | $183,530.74 / $11,655.53 | $178,574.30 / $0.00 |
| Closed trades (open at end) | 26 (1) | 21 (0) |
| Margin interest | $41,408.22 | $36,405.48 |
| Maximum minute-sampled drawdown | $20,143.41 (2026-06-02 → 2026-07-29) | $19,330.69 (2020-02-19 → 2020-03-18) |
| Maximum daily drawdown | $20,083.60 (2026-06-02 → 2026-07-29) | $15,611.46 (2020-02-19 → 2020-03-16) |

**Conclusion.** The difference is the legitimate result of correcting VGT's 8:1 split of 2026-04-21, not a behavioural
regression. The canonical minute file holds raw prices (VGT 809.175 at the last regular minute of 2026-04-20, 101.57 at
the 2026-04-21 open). Before the split was recorded, the strategy read that as an 87.45% overnight crash. For the next 74 sessions,
every minute was "21.6% below" a stale pre-split reference high of 809.32. That produced six deep trailing-buy entries
that no market move justified. All six trades come after the last common trade (exit on 2026-02-05). They account for
the whole difference: +$4,956.44 realized, +$11,655.53 open, the larger interest, and the 2026 drawdown. With the split
forward-adjusted, VGT's deepest fall from its 74-session high after 2026-02-05 is 14.93%, so D1 correctly stays flat. No
code was changed. One regression test was added for the case the real history never exercises: a position held across
the split (§6).

## 1. Revisions and inputs

| | Earlier result | Current result |
|---|---|---|
| Revisions reproducing it | `53ca8f55` (physical `data/VGT/all/data.csv`) and `e8bfe39f` (canonical `data/VGT/data.csv`) | `007a8650` (HEAD) |
| Split handling | none: raw prices | `config/market-events/splits.json` (sha256 `7c98f4a7…`), forward adjustment from 2026-04-21: prices × 8, volumes ÷ 8 |
| Run header | `Window: … 2710 sessions; warm-up 0 of 74 sessions …` | the same, plus `; split 8:1 on 2026-04-21 forward-adjusted (later prices × 8, volumes ÷ 8)` |

`0a0bb272` added the split registry. That revision cannot run this command: it fails with `data/VGT/data.csv has no VGT
session in all from the first row → the last row`. The runner cut the injected sessions by object identity, and the
split's adjusted copies broke that cut. `007a8650` fixed it by cutting by date, and its test covers it. So no revision
ever produced a third result.

Each revision ran in a temporary `git worktree` that pointed at the same, unmodified data file. Everything except the
split adjustment is identical between the two results:

- **Data:** `data/VGT/data.csv` sha256 `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09`, which is
  byte-identical to the former `data/VGT/all/data.csv` that `53ca8f55` read. It holds 2,710 sessions, 2016-01-04 →
  2026-10-13, with 928,192 lines.
- **Strategy:** `src/app/allIn-trailingBuy-postExitContinuation.ts` sha256 `f44cf412…` at `e8bfe39f`, `0a0bb272` and
  HEAD. `53ca8f55` has `c767063b…`, which differs only in the dataset plumbing, and produced the same trades as
  `e8bfe39f`. The injected module `.cache/phenotype/allIn-trailingBuy-postExitContinuation.69365338593685b0.ts` is
  byte-identical at `e8bfe39f` and HEAD.
- **Phenotype:** `config/phenotypes/D1/VGT.json` sha256 `3e77a419…` and execution profile
  `config/execution/multi-etf-d1.json` `c0d5d5eb…`, the same at all three revisions. Both runs report the same eight
  applied values: X 21.6%, Y 0.3%, stop 7.3%, hold 8 days, L 74, buffer 2.9%, P 9.0%, W 60, with none ignored.
- **Execution:** identical in both runs. Fixed $100,000 per entry, 11% margin interest and stop fill at the stop. The
  first eligible date is 2017-06-15, the 74-session warm-up runs inside the window (no session precedes 2016-01-04),
  it is one continuous `all` run, and positions are marked at the 2026-10-13 close.
- **Earlier dataset change:** none matters. `e8bfe39f` and `53ca8f55` agree trade for trade. The `development`
  (2017-06-15 → 2023-12-29: $137,222.97, minute DD $19,330.69) and `holdout` (→ 2025-10-16: $44,696.62) period rows
  are identical in both results.

## 2. Trade lists

The first 21 trades (2018-12-21 → 2026-02-05) are identical in both runs: entry and exit times, prices, reasons and
profit. They also match all 21 VGT virtual trades of the allocator's full-history `C-all-lowDd-shadow-all` run
(`evaluations/multi-etf-allocator/all/…/virtual_trades.csv`) on entry and exit time, entry price and net, which sum to
$178,574.30. The standalone path and the multi-ETF `--dataset` path therefore agree. Both adjust through the same
`selectRunSessions` → `adjustSessionsForSplits` (`src/lib/evaluation.ts`, `src/lib/corporateActions.ts`).

Only the earlier run has these trades. Every one is a `deep` setup armed against the pre-split reference high of
809.32:

| # | Armed | Depth vs 809.32 | Entry | Exit | Reason | Net |
|---|---|---:|---|---|---|---:|
| 22 | 2026-04-21 09:31 at 101.50 | 87.46% | 2026-04-21 09:48 at 101.61 | 2026-06-05 12:42 at 116.80 | trailing stop | +$13,601 |
| 23 | 2026-06-08 09:31 at 118.25 | 85.39% | 2026-06-08 09:36 at 117.59 | 2026-06-23 09:31 at 115.99 | 8-day loss exit | −$1,813 |
| 24 | 2026-06-24 09:31 at 115.66 | 85.71% | 2026-06-24 09:33 at 116.36 | 2026-07-06 09:31 at 115.64 | 8-day loss exit | −$976 |
| 25 | 2026-07-07 09:31 at 114.65 | 85.83% | 2026-07-07 09:41 at 114.35 | 2026-07-17 09:31 at 111.96 | 8-day loss exit | −$2,387 |
| 26 | 2026-07-20 09:31 at 114.16 | 85.89% | 2026-07-20 09:33 at 114.50 | 2026-07-28 09:31 at 110.80 | 8-day loss exit | −$3,468 |
| 27 | 2026-07-29 09:31 at 110.85 | 86.30% | 2026-07-29 09:33 at 111.00 | open, marked 126.48 | — | +$11,656 |

These trades sum to +$4,957 realized and +$11,656 unrealized, which is the $16,612 difference to the dollar.
Their extra interest ($2,713 closed plus $2,290 accrued) is included in the net figures.

## 3. First divergence

The **first divergent strategy-state transition is 2026-04-21 09:31 ET**. The earlier run moves from `FLAT` to `ARMED`
on deep trailing buy 22, on the 09:30 minute's close of 101.50. The current run stays `FLAT`. Up to that minute the two
runs are in the same state: flat since the 8-day loss exit of 2026-02-05, with no continuation window open, because
trade 21 was a loss.

Minute evidence from `data/VGT/data.csv`:

| | 2026-04-20 last regular close (15:59 ET) | 2026-04-21 09:30 ET bar (o / c) | Overnight | 2026-04-21 volume |
|---|---:|---:|---:|---:|
| Raw (earlier) | 809.175 | 101.57 / 101.50 | −87.45% | 3,772,731 |
| Adjusted (current) | 809.175 | 812.56 / 812.00 | +0.42% | 471,591 (2026-04-20: 622,068) |

The reference high is the highest session high of the previous 74 sessions. In the raw series it is 2026-04-20's
809.32 for every session from 2026-04-21 to 2026-08-05: 74 sessions, each with a minute close 85–88% below it (deepest
87.60% on 2026-04-23). In the adjusted series, only 2026-04-21 has a pre-split reference high, and it is the same
809.32, with the price 0.3% above it. From the split on, the deepest fall is 14.17% (2026-07-29, from 1,008.00 on
2026-06-03). Before the split, the deepest fall since 2026-02-05 is 14.93% (2026-03-30), the same in both series.
Nothing after 2026-02-05 reaches the 21.6% entry threshold, and no continuation window was open. The current run's flat
2026 is D1's correct behaviour.

`unexplainedSplitGaps` lists exactly one split-sized overnight move in the raw file (2026-04-21, ratio 0.1255) and none
once the recorded split is applied.

## 4. Consistency across the split (current code)

- **Prices and volumes:** all 2,588 pre-split sessions are passed through unchanged, as the same objects. All 122
  sessions from 2026-04-21 have every bar's open, high, low and close exactly × 8, volume exactly ÷ 8, and unchanged
  timestamps. The adjusted series ends at 1,011.84 (raw 126.48).
- **Reference highs and stops:** the 74-session high and the trailing stop's post-entry high are in one unit throughout
  (pre-split shares). Neither the stale-high artefact (§3) nor a fake stop-out is possible.
- **Share quantities, P&L and drawdown:** the real history holds no VGT position across 2026-04-21. The current run is
  flat from 2026-02-05, and the allocator's VGT book places no lot then. The new test therefore checks a synthetic
  economy that does hold one: a deep entry on 2026-04-10 at 568.78 (175.81 shares), held across the split and stopped
  out on 2026-06-05 at 739.70. The split run equals the same economy printed without a split in every position (entry,
  exit, shares, interest, profit), fill, state transition, setup (reference high, trigger level, trailing low) and
  episode, in the replayed marks, and in every period's net, interest, minute drawdown and daily drawdown. The split
  creates no artificial P&L, signal or drawdown.
- **Without the adjustment**, i.e. the earlier behaviour: a position held through 2026-04-20 would have booked an
  87% fall, about −$87,000 on a $100,000 entry. The flat earlier run avoided that only by chance. Its extra trades were
  still triggered by the artefact.

## 5. Reproducibility

Frozen research is unaffected. It reads the pinned legacy inputs (`data/archive/legacy-research-inputs/`, ending
2025-10-13 or earlier), which do not contain the split. The VGT research reference ($183,043.82, minute DD $19,330.69 to
2025-10-13) is still reproduced: `src/phenotype/tests/reproduction.test.ts` passed with the other 71 phenotype and
corporate-action tests, and the allocator's regression and parity tests pass. The earlier $195,186 figure belongs to
raw, unadjusted data and should not be quoted. The corrected full-history figure is $178,574.30. It differs from the
frozen-reference $183,043.82 only by the period after 2025-10-13: trade 20's exit on 2025-11-07 and trade 21's loss.

## 6. Code and tests

No implementation defect was found, and no strategy, phenotype, execution profile, data or split record was changed.

- `src/phenotype/tests/splitRun.test.ts`: added "a position held across the split equals the same economy without
  one". It runs synthetic bars with a 30% April 2026 dip, a rally across the split and a June stop-out, once printed
  raw with an 8:1 split and once without. The test is a guard: with the adjustment disabled, both tests in the file
  fail. The existing test, a steady rise with no setup, is unchanged apart from sharing the generator.

## 7. Limitations

- The six earlier-only trades were triggered by the artefact. Their P&L used consistent post-split prices, because
  they were opened and closed after the split, but the trades themselves are not valid D1 decisions.
- XLE, XLU and XLY (2025-12-05, about 2:1) and XOP (2020-03-30, about 1:4) also split in the raw files. They are not in
  `config/market-events/splits.json`, so any run that spans those dates has the same artefact. VGT and VOOG
  are the only symbols corrected.
- The standalone period table reports the execution profile's `development` and `holdout` periods and `full`, with no
  `final` row. That is the profile's definition, not a fault in this calculation.
