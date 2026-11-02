# Study 8 — risk and trade sequencing

**Source:** the sealed F24 test record, `results/test/F24/test.json`: one continuous run 2016-01-04 → 2026-10-29,
fixed $100,000 single slot, 5 bps per side, 11% interest, stops at the stop or the gapped open. The minute series is
re-derived per lot (Study 6's machinery). It must reproduce the strict tracker and the replay's lots, or the stage
fails; it did for every holder.

The **risk ceiling** (minute DD strictly below $35,000 per $100,000) is a backtest screen, **not** an enforceable
live stop-loss.

## 1. The research nominations (F24 holders that did not fail)

Columns:
- run minute DD, with peak → trough;
- the worst drawdown inside the test window;
- gap risk: stops that gapped through at the open (in the test window), and the loss beyond the stop level;
- the worst intraday mark of a test-window lot (MAE);
- test-window net, and under the gating stresses (next-open stop fills, +25 bps stop slippage) and the harshest
  diagnostics (20 bps, 14% interest);
- net earned in 2020; the largest lot's share of net.

| # | Track / role | T | Run DD (peak → trough) | Test-window DD | Gapped stops (test) | Loss beyond stop | Worst test-lot MAE | Test net base / next-open / +25 bps / 20 bps / 14% | 2020 net | Top lot share |
|---:|---|---|---|---:|---:|---:|---:|---|---:|---:|
| 1 | VG profit | pass | $31,225 (2026-05-11 → 2026-07-17) | $31,225 | 10 (2) | $16,166 | −$11,575 | $64.2k / 64.0k / 62.2k / 59.4k / 61.3k | $110,845 | 14.8% |
| 2 | VG balanced | pass | $21,304 (2026-04-01 → 07-17) | $21,304 | 9 (1) | $13,505 | −$11,770 | $79.9k / 80.0k / 77.7k / 78.3k / 79.3k | $110,086 | 13.7% |
| 3 | VXRG profit | pass | $21,192 (2024-08-22 → 2025-04-09) | $16,998 | 16 (5) | $27,455 | −$11,221 | $65.3k / 65.3k / 62.6k / 61.5k / 62.6k | $117,599 | 17.9% |
| 5 | VG extra | pass | $19,662 (2026-06-17 → 07-17) | $19,662 | 10 (2) | $13,541 | −$11,871 | $83.8k / 83.7k / 81.3k / 79.5k / 80.9k | $105,857 | 16.3% |
| 6 | VXRG extra | pass | $24,197 (2021-01-25 → 01-28) | $14,435 | 10 (2) | $20,045 | −$6,860 | $51.9k / 52.6k / 50.7k / 50.2k / 49.9k | $159,587 | 13.7% |
| 7 | VXRG extra | pass | $23,847 (2026-04-01 → 06-10) | $23,847 | 17 (3) | $21,653 | −$14,671 | $57.5k / 57.6k / 55.6k / 54.8k / 55.7k | $134,937 | 10.8% |
| 8 | VXRKG profit | pass | $25,616 (2023-03-14 → 05-04) | $18,081 | 10 (3) | $15,770 | −$11,246 | $34.4k / 34.6k / 32.3k / 31.3k / 33.4k | $136,823 | 15.0% |
| 9 | VXRKG balanced | pass | $25,325 (2022-03-29 → 05-12) | $18,130 | 15 (3) | $21,125 | −$11,246 | $36.8k / 36.4k / 34.7k / 33.7k / 35.8k | $136,687 | 16.2% |
| 10 | VXRKG robust | pass | $24,840 (2022-03-29 → 05-12) | $18,220 | 14 (3) | $21,042 | −$11,246 | $22.4k / 22.2k / 20.6k / 19.6k / 21.7k | $140,454 | 16.2% |
| 11 | VXRG robust | pass | $19,429 (2021-01-08 → 2022-05-12) | $12,477 | 13 (3) | $20,913 | −$11,221 | $51.0k / 51.1k / 49.3k / 48.4k / 48.8k | $127,188 | 19.1% |
| 12 | G profit | **ambiguous** | $30,359 (2022-06-02 → 09-01) | $23,315 | 8 (2) | $9,307 | −$9,554 | $31.4k / 31.8k / 29.8k / 27.6k / 30.4k | $70,648 | 20.3% |
| 13 | VG robust | pass | $18,927 (2023-07-19 → 2025-04-07) | $17,171 | 7 (1) | $10,220 | −$8,771 | $54.3k / 54.2k / 53.1k / 52.0k / 52.0k | $150,923 | 13.5% |
| 14 | VXRKG extra | pass | $22,887 (2021-01-25 → 01-28) | $21,698 | 14 (4) | $24,074 | −$12,230 | $47.9k / 47.6k / 45.8k / 46.0k / 48.1k | $114,568 | 15.2% |
| 15 | VXR profit | pass | $22,020 (2021-01-28, one lot) | $16,552 | 14 (1) | $19,666 | −$12,903 | $67.7k / 67.7k / 66.8k / 66.0k / 65.7k | $57,315 | 16.7% |
| 17 | VXR extra | pass | $19,005 (2022-03-29 → 06-16) | $9,529 | 11 (2) | $22,972 | −$8,523 | $19.5k / 19.5k / 18.7k / 18.6k / 19.1k | $53,418 | 17.1% |
| 21 | VXR robust | pass | $18,990 (2022-03-29 → 06-16) | $12,420 | 12 (3) | $25,145 | −$8,771 | $60.1k / 60.0k / 58.4k / 57.8k / 58.8k | $47,522 | 15.7% |
| 25 | V robust | pass | $21,330 (2019-07-26 → 2020-03-23) | $15,515 | 4 (0) | $1,746 | −$8,708 | $41.7k / 41.8k / 41.1k / 42.9k / 41.9k | $56,176 | 24.3% |
| 26 | V extra | **ambiguous** | $34,472 (2020-02-19 → 03-18) | $15,507 | 4 (0) | $3,377 | −$8,323 | $42.2k / 42.3k / 41.6k / 43.3k / 42.4k | $40,743 | 24.9% |

All 18 pass T4: the test window stays profitable and the run DD stays below $35k under 10 bps, 14%, next-open and
+25 bps. Profit is insensitive to costs, interest and fill assumptions within these ranges (at most a few thousand
dollars). The arming-date shifts (2017-12-15, 2018-06-15) leave every test-window figure unchanged.

## 2. Named events (measured; no fitness was retargeted to them)

- **The 2020 crash and rebound.**
  - 2020 alone contributed $40.7k–$159.6k to every nominee. It is the best calendar year of every nominee except #26 V
    extra (whose best year is 2025, 26% of net). The best year is 24–59% of whole-run net.
  - Leaving 2020 out cuts #1's net from $308.7k to $197.9k and #8's from $258.9k to $122.1k.
  - #26 V extra's worst drawdown ($34,472, February → March 2020) is why it is ambiguous (≥ $33,000).
  - All of these centres were trained with 2020 in-sample, so this is training-window concentration, not test
    evidence.
- **2022 and the gold-miner re-entry path.**
  - Several VXRKG and VXR nominees had their worst drawdowns in March → May/June 2022 ($19.0k–$25.3k): #9 and #10
    (VXRKG), #17 and #21 (VXR).
  - Other pooled nominees' worst drawdowns fell elsewhere: #8 VXRKG profit in March → May 2023 ($25,616), #14 VXRKG
    extra and #15 VXR profit in January 2021 ($22,887 and $22,020).
  - #12 G profit's worst drawdown is June → September 2022 ($30,359), a GDX path of repeated re-entries. The eleven
    lots' drawdown contributions, in order, are −$7.3k, −$1.3k, −$2.8k, −$0.4k, −$5.6k, −$0.1k, −$1.8k, +$43,
    −$2.8k, −$4.1k and −$4.2k. Those are the lots' contributions to the drawdown, not their P&L.
  - F21's candidates, trained without 2022, breached the ceiling here (CHRONOLOGICAL_VALIDATION.md §1).
- **The 2025 tariff episode** (2025-03-01 → 06-30, chosen with hindsight, report-only).
  - Profitable for 17 of the 18 nominees (+$10.0k to +$35.2k; #1 +$33.6k, #2 +$34.1k), flat for #12 G profit ($0),
    and +$30.2k each for B1 and B5.
  - #3 VXRG profit's drawdown from 2024-08-22 to 2025-04-09 ($21.2k) ran through it; VGT, XRT and GDX lots made up its
    trough.
- **The 2026 GDX drawdowns** (2026-03-01 → 07-31, report-only).
  - The worst drawdown of #1's whole run occurred **out of sample** here: $31,225 from 2026-05-11 to 2026-07-17. That
    is 89% of the ceiling.
  - It was built from seven consecutive GDX lots. Their drawdown contributions, in order, are −$10.9k, −$0.7k,
    −$11.5k, +$12.9k, −$7.6k, −$4.9k and −$8.5k. Those are contributions to the drawdown, not the lots' P&L.
  - #2, #5 and #7 also had their worst drawdowns in 2026 (April–July).
  - The GDX book is both a main source of 2020 profit and the main 2026 risk for the VG nominees.

## 3. Gap and fill risk

- **Gapped stops:** 4–17 per nominee over the run, 0–5 in the test window. The cumulative loss beyond the stop level
  is $1.7k–$27.5k; the worst single gap cost $0.7k–$7.5k.
- **Fill stress:** the next-open stop-fill stress changes test-window net by under $1k, and +25 bps slippage by
  $0.6k–$2.7k.
- **Caveat:** fills follow the engine's assumptions (stop at the stop or the gapped open). They are not claimed to
  equal live Vanguard execution, and an intraday gap through a stop on a news print can be larger than any open-gap in
  this history.

## 4. Sequencing in the shared slot

- **The slot:** in every pool, one funded $100k slot serves all books. The first executable signal wins, and the
  others are refused while it is held.
  - #1 VG refused 13 signals over the run; #3 VXRG 26; #8 VXRKG 34. B5 refused 78 (`npm run study8-run -- compare
    --all`).
- **Fragile attribution:**
  - Small parameter changes re-route which signals get funded: #1's test-family neighbours keep a median 14% of its
    funded lots.
  - Yet they stay profitable (`sequenceDependent` false). The neighbourhood economics are robust while the exact
    trade list is not.
  - So the per-lot ledger of any single configuration (`study8-run` `trades.csv`) is one realization, not a
    forecast of which trades will occur.
- **Concentration:** the largest lot is 10.8–24.9% of net, within the 25% cap. The V nominees are closest to it (24.3%
  and 24.9%), because VGT alone trades rarely (21 lots over the run for #25).
