# Trend capture and missed opportunities (hindsight ledgers; descriptive only)

**Every label here uses hindsight.** The up-legs are defined after the fact. They were never decision inputs, and
the formulas were frozen before results (`PROTOCOL.md` §13). Sources: sealed `analysis.json` (payload `ledgers`), tables
`results/tables/trend-legs.md`, `episodes.md`, `d1-overlap-and-concentration.md`. Full history 2017-01-03 → 2023-12-29;
the finalists' figures are in-sample.

## 1. The hindsight up-legs (10% zigzag on daily closes, gain ≥ 15%)

| # | Leg | Gain | Character |
|---|---|---:|---|
| 1 | 2017-01-03 → 2018-01-26 | +46% | calm advance (D1 idle) |
| 2 | 2018-02-08 → 2018-10-03 | +27% | advance after the Feb 2018 shock |
| 3 | 2018-12-24 → 2019-05-03 | +38% | V-recovery from Q4 2018 |
| 4 | 2019-06-03 → 2020-02-19 | +43% | calm advance into the COVID peak |
| 5 | 2020-03-23 → 2020-09-02 | +82% | V-recovery from the COVID low |
| 6 | 2020-10-30 → 2021-02-12 | +28% | continuation |
| 7 | 2021-03-08 → 2021-12-27 | +37% | continuation |
| 8–10 | 2022-03-14 → 03-29, 06-16 → 08-15, 10-14 → 12-01 | +17%, +24%, +16% | bear-market rallies |
| 11 | 2022-12-28 → 2023-07-18 | +48% | the 2023 advance (D1 idle) |
| 12 | 2023-10-26 → 2023-12-28 | +22% | late 2023 (unconfirmed at the data end) |

## 2. Capture, entry delay and idle share (mean over the twelve legs)

| Run | Mean capture | Median entry delay (sessions, legs entered after the trough) | Mean idle share |
|---|---:|---:|---:|
| H P\* (E06, in-sample) | 64% | 18 | 35% |
| D P\* (E06) | 64% | 23.5 | 35% |
| H champion E05 | 68% | 17 | 33% |
| H champion E03 | 63% | 7 | 15% |
| H champion E08 | 61% | 14.5 | 33% |
| C-SMA | 71% | 11 | 30% |
| C-TSM | 87% | 28 | 25% |
| C-ALR | 88% | (monthly re-sizes) | 0% |
| C-DON | 29% | 21 | 47% |
| C-TSM/TPL | 36% | 24 | 45% |

Capture = the strategy's price gain inside the leg ÷ ($100,000 × leg return). It can exceed 100% when a lot entered
before the leg holds more than $100,000 of exposure (C-AL's mean is 214%). Per leg, the H pick:

- **Calm advances and continuations (legs 1, 2, 4, 6, 7):** fully invested (capture 100–131%, idle 0%, no lost
  post-stop gain). These are the legs D1 cannot reach.
- **V-recoveries (legs 3 and 5):** captured only 27% and 38%. The volatility gate kept it out until realised
  volatility subsided, so its first entries came 45 and 47 sessions after the troughs, missing most of the rebounds.
  The causal entry rule needs calm, and V-recoveries are not calm. C-SMA did a little better (34%, 55%; delays 29 and
  16).
- **2022 rallies (legs 8–10):** 0% capture, 100% idle — the same gate kept it out of all three bear-market rallies. That
  avoided their reversals (2022 −$13,777 in-sample, the smallest loss among the finalists).
- **2023 (legs 11–12):** 75% and 53% capture, entry delays 18 and 9 sessions.

Lost post-stop gain was 0% for the H pick on every leg (D's pick: 7% on one 2022 rally); C-SMA's never exceeded 3.3%. These rules did not lose much by
stopping out and waiting. They lost by entering late after crashes, and, in the frozen procedure's 2022 replay, by
holding the drifted exposure of a lot carried from 2020 (`CHRONOLOGICAL_RESULTS.md` §3).

## 3. The 2023 segment (what is and is not measurable)

- **Measurable (authorised data):** the 2023 window only. The fold-D pick (selected on 2016–2022) earned +$24,646 in
  2023 with a window minute drawdown of $18,359, from three first entries. It captured 72% of leg 11 (+48%) after a
  17-session delay, and 53% of leg 12. D1 primary was idle all year ($0).
- **Design knowledge:** E06 is in the panel partly because Study 2 found D1 idle in calm advances that include
  2023 (`PROTOCOL.md` §1(c)); even so the fold-D pick earned less in 2023 than C-ALR (+$32,931) and C-SMA (+$25,980).
- **Not measurable:** the 2024 half of the user's motivating ~80% 2023–2024 rally. No 2024 bar entered any computation, so this study
  cannot say whether any rule "captured the rally". The fold-D pick's open lot at 2023-12-29 is valued at liquidation
  that day.
- **Later-test plan (needs explicit authorisation):** a separately frozen protocol that names one frozen rule (the
  procedure's H-P\* E06-4978efef20, or a pre-registered simple control) and evaluates it once on 2024-01-02 →
  2025-10-16. That period was inspected by earlier VGT programmes, so it is not an independent test either. A clean
  test needs bars after 2026-10-13.

## 4. D1-idle diagnostics (descriptive timing; no shared capital)

Using the sealed VGT D1 primary ledger (Study 2, 17 lots through 2023-12-29): D1 held a lot at the close in 634 of the
1,759 decision sessions and was idle in 1,125. The H pick was invested in 85% of the D1-idle sessions. Its daily-mark
changes summed to +$55,129 in D1-idle sessions and +$64,967 in D1-holding sessions. C-ALR's were −$31,462 and
+$109,759 (D1 holds after deep dips, and an always-long slot both loses through the dips and gains in the rebounds).
This says only that a momentum rule is often invested when D1 is not. It is silent on what a shared slot would do:
refusals, displacement, cascades and pooled drawdown are Stage 2–4 questions (not authorised).

## 5. Episodes (`episodes.md`)

E2018 (Q4 2018 → Apr 2019), ECOVID (Feb–Aug 2020), E2021, E2022, E2023. For example, the H pick: −$3,766 / +$8,903 /
+$29,348 / −$13,777 / +$26,269 with daily drawdowns $16,512 / $20,984 / $16,657 / $15,763 / $16,600. C-SMA:
−$15,663 / +$4,243 / +$34,121 / −$38,850 / +$25,980. C-ALR: +$1,036 / +$17,166 / +$15,859 / −$42,884 / +$32,931.
