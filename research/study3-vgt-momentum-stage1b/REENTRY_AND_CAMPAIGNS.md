# Re-entry and campaigns (brief §6, PROTOCOL §4.3, §7.4)

Sources: L-A re-entry rows (every entry × XF default under all 10 rules; `results/tables/screening-H.md`), L-C step 2
(`reentry-lc.md`), the Π1 ledger (`ledger-Pi1-S1.md`). A campaign lives after a non-own-OUT exit while the entry's own
condition holds (RPM: while its permission lasts); a re-entry opportunity is such an exit. First entries and
re-entries are recorded separately; no re-entry uses a future bar (prefix and poisoned-future guards: 0 differences).

## 1. First measure the opportunities (H, XF default, 2017–2023)

| Entry | Re-entry opportunities | Re-entries (R3F / R0 / RC10 / RS / RPM) | Net, R3F → best rule (in-sample) |
|---|---:|---|---|
| E06 calm advance | 4 | 0 / 1 / 0 / 1 / 2 | +$37k; no rule better (R0 +$27k, RS +$31k) |
| E03 efficiency | 4 | 0 / 2 / 0 / 1 / 2 | +$37k; no rule better |
| E05 rising floor | 11 | 9 / 11 / 10 / 10 / 5 | +$51k → R0 +$71k, RS +$67k |
| E11 permission | 13 | 10 / 13 / 10 / 10 / 7 | +$38k → RS +$61k, R0 +$58k |
| E02 drift | 9 | 6 / 12 / 9 / 7 / 6 | +$44k → RS +$85k, R0 +$82k |
| E08 compression | 10 | 7 / 29 / 20 / 22 / 6 | +$18k → R0 +$88k; RS −$30k |
| E12 pullback | 7 | 4 / 24 / 10 / 18 / 3 | +$21k → RN +$32k; R0 −$13k, RC10 −$18k |
| E09 trailing buy | 8 | 1 / 2 / 1 / 1 / 0 | +$62k; rules irrelevant (the minute trigger re-enters) |
| C-SMA | 9 | 4 / 10 / 7 / 6 / 6 | +$55k → RS +$73k |

The level families that matter most in this study — E06 and E03 — almost never re-enter: their own OUT ends the
campaign at most exits, so a re-entry rule has nothing to act on. That is what Stage 1 found too, and the gate
(PROTOCOL §7.4) was built for it.

## 2. Re-entry inside the procedure (L-C step 2, training-only)

Of 58 pairing × history cases with a champion, **29 had fewer than 5 re-entry opportunities** in development and kept
R3F without testing the other rules. In the 29 that opened the step, the share of cases where a rule beat R3F on RoD
and met the champion conditions: RC10 12, REF 11, RFL 10, RP50 9, RPM 5, R0 3, RF 3, RS 1, **RN 0**. The final choices
were R3F in most pairings, RC10 for E06 × XV / XF-T and E11 × XF-T in several histories, REF for E05 × XF (A), E02 × XE
(B, H), E06 × XV (C) and E09 × XF (D), RP50 (A E11, D E03, H E06 × XV), RPM (H E11, E07), RFL (D E06 × XT). The
picks used R3F (A, C, H) and RC10 (B, D).

## 3. Did tighter trails plus re-arming capture the 2020–2021 advance better than one wide stop?

In-sample, comparably: H's E06 × XF-T (tight trail, RC10, Z1) made +$137,611 at $19,471 DD and E06 × XS (structural,
wide) +$140,229; both neighbourhoods are robust (`robustness.md`). Chronologically, not: Π1's 2020–2021 legs were held by
E06 × XV and E03 × XV with frequent volatility-trail stops (`ledger-Pi1-S1.md`) — 2020 +$14,432 and 2021 +$18,059
against the always-long C-ALR's +$31,177 and +$21,507. Π1 captured 25–60% of the 2020–2023 up-legs it entered (entry delays 11–148 sessions, idle 23–82%), and 0% of the
short 2022-03-14 → 03-29 rally (`legs.md`). In
2023 the D pick (E06 × XV + RC10) made eight entries — five fresh entries and three RC10 re-entries after stops — in a
choppy advance
(the re-entries −$3,056, −$2,836 and an open +$8,899) and finished +$11,049 against C-ALR's +$39,427: re-arming after
protective exits paid turnover and missed upside.

## 4. Π1's campaigns (2020–2023)

21 trades, 14 non-adoption first entries plus adoption entries, 5 re-entries (one R3F in 2020, four RC10 in 2021/2023),
no re-entry in 2022 (all three 2022 entries were fresh signals into rallies). Campaign giveback (peak cumulative P&L −
final) summed to 61% of the campaigns' peak P&L for campaigns that peaked at ≥ $5,000 (`ledger-Pi1-S1.md`, campaigns).
Interest paid while long ≈ $20.2k over four years; Π1 was flat at 47%, 32%, 62% and 28% of the session closes in 2020–2023.

## 5. Conclusions

- Re-entry rules matter only for entries that keep a live campaign (E02, E05, E08, E11, E12, C-SMA); for the
  calm-advance and efficiency entries that dominated the selection they were rarely testable.
- No re-entry rule produced a consistent gain; R0 helped in the 2017–2021 bull for some entries and destroyed E12;
  "no re-entry" (RN) never won the L-C step, though in the H screening it was the best rule for E12 (+$32k vs R3F +$21k)
  and beat R3F for C-SMA (+$64k vs +$55k). Π1's re-entries: 1 R3F and 4 RC10, every other entry fresh or adoption
  (`results/tables/diagnostics.md`); the per-rule attribution inside the L-C variants was not recorded (disclosed).
- Renewable logic raised turnover in 2023 without economic benefit, as the brief warned it might.
