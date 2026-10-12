# Family C — Recovery resets — research report

Experiment `adaptive_resets`, run 2026-10-12 through the frozen Phase 2 infrastructure
(`common/framework.py` + `runner.py`, calibration gate passed on all four datasets: the framework's
`A_baseline` and `REF_lower3` matched the frozen research results trade for trade, and `C1_frozen95`
reproduces `REF_lower3` exactly — VGT05-15 26,384/54,279; QQQ99-15 40,258/91,469; VGT16-26
182,094/28,687; QQQ16-26 132,242/23,564). 22 configurations × 4 datasets = 88 runs. Trigger = net loss
and discount = fixed 3% everywhere; ONLY the reset varies (C11's staged discount is the one
spec-defined exception, expressed via `required_level` with the C1 reset). Registered before the first
run: `registry.jsonl` (22 entries). Raw outputs: `results/`; working tables: `tmp/analysis.txt`;
verification: `tmp/spot_checks.txt`.

## Headline findings

1. **C0 (no reset) settles the question "are resets necessary": absolutely.** One −$2,903 loss on
   2019-01-03 (VGT) left the strategy restricted for the remaining **1,949 sessions (~8 years)** —
   its 3% level was missed by 0.52% once and never again — costing −$153,661 vs the baseline. On QQQ
   1999–2015 a −$3,989 loss on 2002-10-08 sidelined it for **3,331 sessions (13 years)**, blocking 526
   signal sessions and 11 of the baseline's 12 ≥$10k winners.
2. **Permissive resets (C2 exit-price, C12 half-repair) substantially recreate the repeated-entry
   problem** (QQQ 2000–02: −$57,079 / −$79,736 vs C1's −$11,471 and the baseline's −$91,629, with 13 /
   16 false resets inside the window) and are *also* worse at V-bottoms, because a reset that fires
   while the 3% level is still pending surrenders the discount (see finding 4).
3. **C11_graduated is the standout: it never trails C1 on any dataset and wins large on both old
   ones** (+16,153 / +15,196 vs C1; identical to C1 on both 2016–26 sets), turns QQQ 2000–02 positive
   (+5,926), adds zero false resets, and beats the ex-post lower3 exposure control on **both** profit
   and drawdown wherever it differs from it. Its stage-2 (1.5% after an 8% rebound off the low) caught
   the October 2002 QQQ bear-market bottom (2002-10-07 entry, +$21,285) that C1 missed.
4. **Under the fixed 3% discount, the 2020/2026 "V-bottom misses" do not exist** (the discount path
   catches them in C1 and almost every config); what resets can do at V-bottoms is *break* them: C10's
   time+price reset fired 2009-02-24, seven sessions before the March 2009 bottom, replacing C1's
   +$54,188 trade with a −$3,443 one (QQQ); C2/C3/C12_half_repair resets on 2020-03-17 and 2026-02-06
   likewise pre-empted the better 3%-lower entries. **A reset is never free while a discount is
   pending.** The one genuine rescue — VGT 2023-01 — is indirect: depth-adaptive resets (C4_10,
   C5_atr3, C6_38, C9) cleared the stale 2022-11-03 restriction in Nov–Dec 2022, cycled through small
   trades that established a *lower* exit anchor, and that anchor's 3% level filled at the January
   bottom (2023-01-05 at 38.1436), worth ≈ +$29–32k of window P&L vs C1.
5. The headline "false reset" counts must be read against the base rate: 59–65% of ALL closed trades
   lose, and most mechanisms' false-reset share (59–69%) is statistically indistinguishable from it.
   The sharp measures are in-window false resets during 2000–02 and bear-window P&L, reported below.
   Only C8_breakout20 shows real adverse selection (82% false vs 64% base).

## 1. Hypotheses as registered

Verbatim in `registry.jsonl` (append-only, timestamped before the run). One line each:

- **C0_none** — without a reset, up-trending markets strand restrictions forever; quantifies the cost. *(Confirmed, catastrophically.)*
- **C1_frozen95** — anchor; frozen peak unreachable in deep bears, ~half of resets false. *(Confirmed.)*
- **C2_exit_price** — most permissive; near-baseline; recreates repeated entries. *(Confirmed.)*
- **C3_entry_price** — permissive, loss-depth stricter than C2; still bear-rally false resets. *(Confirmed; better than C2 but still poor.)*
- **C4_rebound_10/15/20** — depth-adaptive; 10% fast at V-bottoms but most false resets of trio. *(Partly: 10% best on VGT16-26, worst of trio in 2000-02; 15% turned out worst overall — slow AND false.)*
- **C5_atr_rebound_3/5** — volatility-scaled rebound. *(k=3 good on 3 of 4 datasets; k=5 poor.)*
- **C6_retrace_38/50** — episode-range retrace; between C1 and C4. *(38% became the best aggregate config.)*
- **C7_rolling95** — fixes anchor obsolescence; resets "earned by decay". *(Confirmed: 52% decay-earned; ≈C1 outcomes.)*
- **C8_breakout20** — momentum; fast but many bear-rally false resets. *(Confirmed — worst mechanism.)*
- **C9_base40** — basing detector; slow at V-bottoms, aimed at 2003. *(Half-confirmed: rescued 2023-01, NOT 2003.)*
- **C10_time_price** — conservative staleness valve, low false rate. *(False rate low, but one pre-bottom reset destroyed QQQ 2009 — hypothesis missed the reset-priority inversion.)*
- **C11_graduated** — fixes sub-2% near-misses after a confirmed rebound; W-shapes yes, V-shapes maybe not. *(Right mechanism, bigger effect than hypothesized — in bear retests, not modern V-bottoms.)*
- **C12_sma100** — trend reclaim; risk: bear rallies pierce SMA100. *(Risk dominated; unpromising.)*
- **C12_signal_gone15** — reset when the 10% signal has been absent 15 straight sessions; false resets only via genuinely new dips. *(Mechanism behaved exactly as designed; the 2026 episode shows "new dip" can still mean "second leg down".)*
- **C12_vol_crush** — NATR ≤ 2/3 of arming level = regime change; risk of mid-grind resets. *(Risk confirmed: 3 mid-bear false resets in 2000-02; mid-pack.)*
- **C12_timeout120** — pure information decay. *(Only good on QQQ-old; time-only staleness loses to price-based normality detection in V-shaped regimes.)*
- **C12_half_repair** — half the post-exit damage repaired; self-limiting for shallow episodes. *(Rescued 2023-01 as predicted, but collapses toward baseline: unpromising.)*
- **C12_held_above** — 20 consecutive closes ≥ 1.05 × episode low = base formed. *(Best 2000-02 bear number (+6,839) and 2nd-best QQQ-old net, yet worst VGT-old net (−31,928; −56,771 in 2007-09) — violently regime-dependent.)*

## 2. Exact mechanism definitions

All compare session i's CLOSE; evaluated per the frozen chronology (reset priority on a same-session
close; no entry on a reset session; entries resume next session; the reset is also evaluated on the
arming exit session itself). `low` = lowest close since the arming exit (inclusive), `exit` = frozen
loss-exit execution price, `entry` = frozen losing entry price, `ref` = frozen 90-session
entry-signal high of the losing trade.

| Config | Reset fires when |
|---|---|
| C0_none | never |
| C1_frozen95 | close ≥ 0.95·ref |
| C2_exit_price | close ≥ exit |
| C3_entry_price | close ≥ entry |
| C4_rebound_x | close ≥ (1+x)·low, x ∈ {10, 15, 20}% |
| C5_atr_rebound_k | close ≥ low + k·ATR14[i], k ∈ {3, 5} |
| C6_retrace_f | close ≥ low + f·(ref − low), f ∈ {0.38, 0.50} |
| C7_rolling95 | close ≥ 0.95 · rolling 90-session previous high |
| C8_breakout20 | close > max(close[i−20 … i−1]) |
| C9_base40 | i − argmin(close since exit) ≥ 40 |
| C10_time_price | sessions_restricted ≥ 60 AND close ≥ 1.05·low |
| C11_graduated | reset = C1; required level = exit·0.97 until a close ≥ 1.08·(low so far) is observed within the episode, then exit·0.985 (sticky per episode) |
| C12_sma100 | close ≥ SMA100[i] |
| C12_signal_gone15 | dd-from-rolling-90-high < 10% on all of sessions i−14…i |
| C12_vol_crush | NATR14[i] ≤ 0.66 · NATR14[arming exit session] |
| C12_timeout120 | sessions_restricted ≥ 120 |
| C12_half_repair | close ≥ (low + exit)/2 |
| C12_held_above | min(close[i−19…i]) ≥ 1.05·low |

Indicator fallback (family's stated fallback, per spec rule 5): a NaN indicator falls back to the C1
frozen-95% condition and increments `indicator_fallbacks`. It occurred only for C12_sma100 on
QQQ 1999–2015 (3 evaluations, 1999 start; the counter is per evaluation and a session can be evaluated
twice). Zero fallbacks everywhere else. No alt-entry paths exist in this family;
`correction_ends_on_reset` kept at its default (True) for all configs (no Family C mechanism reads the
correction state).

## 3. Results per dataset

Full table (net, max DD, P/DD, trades, W-L, blocked sessions, re-entries, resets, false resets, vs
baseline, vs existing 3%, both matched controls, unresolved episodes, longest episode, fallbacks):
`tmp/analysis.txt` §1 and `results/summary.json`. Condensed — net profit (max DD) with **bold** for
better than C1 on net:

| Config | VGT 2005–15 | QQQ 1999–15 | VGT 2016–26 | QQQ 2016–26 | Σnet |
|---|---:|---:|---:|---:|---:|
| C0_none | 19,333 (54,279) | −18,285 (45,048) | 8,111 (19,094) | 5,568 (18,161) | 14,727 |
| C1_frozen95 (=REF) | 26,384 (54,279) | 40,258 (91,469) | 182,094 (28,687) | 132,242 (23,564) | 380,978 |
| C2_exit_price | 7,625 (77,691) | 13,119 (114,608) | 169,554 (36,478) | 101,759 (55,135) | 292,057 |
| C3_entry_price | −762 (64,839) | **44,296** (95,720) | **182,738** (32,158) | 109,124 (46,383) | 335,396 |
| C4_rebound_10 | −21,717 (94,665) | 9,420 (96,065) | **222,267** (28,687) | **133,611** (27,251) | 343,581 |
| C4_rebound_15 | −20,373 (68,415) | −25,544 (95,713) | 168,284 (28,687) | 121,047 (23,564) | 243,414 |
| C4_rebound_20 | 13,188 (54,279) | 32,853 (80,469) | 168,284 (28,687) | 123,821 (23,564) | 338,146 |
| C5_atr_rebound_3 | 5,035 (65,136) | **50,335** (76,334) | **222,756** (28,687) | **135,705** (27,251) | 413,831 |
| C5_atr_rebound_5 | −26,305 (74,347) | 15,992 (95,478) | **215,554** (28,687) | 126,350 (28,653) | 331,591 |
| C6_retrace_38 | 22,980 (50,127) | **64,997** (70,917) | **215,011** (28,687) | **134,055** (26,851) | **437,043** |
| C6_retrace_50 | 25,682 (50,080) | **59,300** (76,737) | **204,370** (28,687) | 132,129 (23,564) | 421,481 |
| C7_rolling95 | 22,375 (58,288) | 39,523 (92,204) | 182,094 (28,687) | 132,242 (23,564) | 376,234 |
| C8_breakout20 | −3,823 (72,346) | −22,885 (119,220) | **183,373** (28,687) | 129,908 (31,115) | 286,573 |
| C9_base40 | 22,447 (61,644) | 34,272 (91,371) | **196,290** (28,687) | 127,926 (23,564) | 380,935 |
| C10_time_price | 22,343 (58,320) | −18,154 (95,056) | 168,284 (28,687) | 121,047 (23,564) | 293,520 |
| C11_graduated | **42,538** (54,279) | **55,454** (73,125) | 182,094 (28,687) | 132,242 (23,564) | 412,328 |
| C12_sma100 | **30,057** (50,606) | −5,484 (108,385) | 148,501 (28,730) | 127,076 (29,787) | 300,150 |
| C12_signal_gone15 | **29,453** (50,080) | 39,523 (92,204) | 160,093 (28,687) | 132,242 (23,564) | 361,311 |
| C12_vol_crush | 6,400 (59,116) | 37,380 (89,278) | **192,908** (28,687) | **136,869** (28,653) | 373,557 |
| C12_timeout120 | 8,052 (58,286) | **44,825** (68,498) | 160,253 (28,687) | 107,334 (28,906) | 320,464 |
| C12_half_repair | 7,625 (77,691) | −8,715 (137,266) | 171,557 (37,177) | 108,422 (48,472) | 278,889 |
| C12_held_above | −31,928 (79,969) | **61,945** (66,004) | 162,938 (28,687) | 115,192 (26,370) | 308,147 |

Matched-control summary (the honest exposure comparison; `tmp/analysis.txt` §1 columns mCtl/mL3):

- **C11_graduated beats or ties the ex-post lower3 control on both profit and drawdown on every
  dataset**: VGT-old +12,600 / −7,310, QQQ-old +13,556 / −22,069, both new sets 0/0 (identical runs).
- **C6_retrace_38** beats the lower3 control on both axes on QQQ-old (+17,933 / −36,014) and on
  drawdown on VGT-old and VGT-new, but trails it on net on VGT-old (−5,820), VGT-new (−4,959) and
  QQQ-new (−10,633 — its extra exposure scales the control up).
- **C12_held_above** beats the lower3 control on both axes on QQQ-old (+16,915 / −36,307) and is
  dreadful against it on VGT-old (−57,370 net).
- C2 / C12_half_repair are worse than their *baseline* matched controls on three datasets — permissive
  resets are dominated by simply trading the baseline smaller.
- Interest, exposure, W/L per config: `results/summary.json` (every config cuts margin interest vs
  baseline; permissive configs the least).

Notes: `reset_priority_blocks` (a signal-session close satisfying the reset, blocking a same-session
entry — arithmetically impossible under C1, common under permissive resets) occurred up to 15 times
per dataset for C2/C3/C12_half_repair and 1–7 times for most others (`tmp/analysis.txt` source,
summary.json); these are exactly the sessions where the inversion of finding 4 bites. The trivial
9-session 2015 unresolved tail (VGT-old) affects most strict configs, as in the prior study.

## 4. Bear and recovery windows

Bear windows (window P&L; `tmp/analysis.txt` §2): QQQ 2000–02 — baseline −91,629, C1 −11,471;
better than C1: C12_held_above **+6,839**, C11 **+5,926**, C3 −6,177, C4_20 −6,365, C5_atr3 −1,391 (ex
aequo best of grid variants); worse: C2 −57,079, C12_half_repair −79,736, C4_10 −47,683, C12_sma100
−39,769, C8 −28,347. QQQ 2007–09 — C1 +45,281; C4_20/C12_timeout120 +50,397; disasters C4_15 −27,755,
C10 −18,984 (the 2009-02-24 reset), C2/half_repair +9,728. VGT 2007–09 — C1 −6,198; best
C6_50/signal_gone15 −1,999; worst C12_held_above −56,771, C5_atr5 −53,986, C4_15 −52,955. 2022 (both
new sets) — C1 −3,865/−9,942; nothing materially better; C2/C3/half_repair 2–4× worse.

Recovery windows (P&L; `tmp/analysis.txt` §4; baseline reference values in the prior report):

- **2009 (QQQ/VGT-old)**: preserved by C1 and everything close to it; **destroyed by C10**
  (QQQ 2009: +327 vs C1's +65,938 — reset 2009-02-24, entry 2009-02-25 at 24.80 → −3,443, re-armed,
  and the 2009-03-06 bottom entry never happened); mildly degraded by C2 (+52,014), C4_15 (−4,911 —
  a 2009 reset into the June pullback), C12_held_above/C9/C5_atr5 (+57,889).
- **QQQ 2003 basing**: C1 = 0. Partly bought back by C2 +14,535, C4_10/C5_atr3/C6_38/C6_50 +15,444,
  C12_timeout120 +14,774, C12_held_above +13,356, C3/C12_sma100 ≈ +10,7xx. The C6 route: the
  2002-10-08 episode reset 2002-11-01 at the 38% retrace (spot check B), re-entries through winter,
  +15,444 across 2003 with only one false reset. This is the first mechanism family that recovers any
  of the 2003 basing P&L without near-baseline bear losses.
- **VGT 2020**: +55,455 for C1 and most configs via the discount path (2020-03-20 at 22.4319, spot
  check: min_gap −0.17%); C2/C3/C12_half_repair reset 2020-03-17 and got +52,250/+51,211 (baseline-ish
  timing, worse); C4_15/20, C9, C10, C12_timeout120, C12_held_above +39,457 — their *September 2020*
  restriction reset too slowly for the October re-entry C1's frozen95 allowed (a shallow dip where the
  frozen anchor is actually the FASTEST reset).
- **VGT 2023**: C1 +18,901 (the known miss). Rescued: C4_10 and C5_atr3/C6_38 **+50,581**, C9
  +46,906, C5_atr5/C6_50 +46,402, C2/C3/half_repair +47,345. Not rescued: C7 (+18,901; its reset came
  2023-01-23 — by then the signal had lapsed), C12_signal_gone15 (2023-01-30, same), C4_15 (01-27,
  same), C11 (identical to C1 — the 1.08 rebound confirmation arrived only after price left the 1.5%
  level behind, exactly as registered), C8 +16,937 and C12_sma100 +13,701 (reset even earlier but
  their January trades went worse).
- **VGT 2025**: +42,023 everywhere except C2/half_repair (+36,373: the 2025-03-19 reset re-admitted
  the losing 2025-04-03-style entry chain).
- **VGT 2026**: C1 +51,712 via the 3% path (2026-03-27 at 85.1250). Broken by C2/C3/half_repair
  (+29,821; reset 2026-02-06), C12_signal_gone15 (+29,821; reset 2026-02-27 — dd90 peaked at 0.099,
  one tenth of a percentage point from a signal, over the whole 15-session window; spot check I),
  C12_sma100 (+32,794), C6_38 (+48,739 — reset 2026-02-09, still caught March at 87.005 via the next
  episode's anchor). QQQ 2016–26 windows: essentially C1-like for all non-permissive configs.

## 5. Family-specific questions

**(a) False resets during 2000–02 bear rallies, per mechanism** (QQQ 1999–2015; resets resolving
inside 2000-01-01..2002-12-31 / of them false; dates in `tmp/analysis.txt` §3):
C2 19/13, C12_half_repair 22/16, C3 6/4, C12_sma100 6/4, C4_10 5/3, C8 3/3, C12_vol_crush 3/3,
C4_15 2/2, C4_20 1/1, C5_atr3 1/1, C5_atr5 1/1, C6_38 1/1, C6_50 1/1, C7 1/1, C9 1/1,
C12_signal_gone15 1/1, C12_held_above 1/0, **C1 0, C10 0, C11 0, C12_timeout120 0**, C0 0.
The cascade itself resolves by lower-price re-entry long before any sane reset fires; the false resets
cluster at the April/July 2000, spring 2001 and August 2002 bear rallies, and they are what separates
the −$40–80k bear results (C2, half_repair, C4_10, sma100, C8) from the −$1k…+$7k ones. Note most of
the strict mechanisms' single in-window reset is the *same* event (the October–November 2002 rally off
the final low — arguably not false at all in hindsight, but its next trade lost).

**(b) Which resets rescue the known V-bottom misses, at what cost elsewhere?** Under this family's
fixed 3% discount, VGT 2020-03/04 and VGT 2026-03 are *not* missed by C1 (they were −5%/−8% failures);
every reset either leaves them alone or breaks them (C2/C3/half_repair/signal_gone15/sma100, −3k to
−22k each; §4). The real target is **VGT 2023-01**, and it is rescued (≈ +28–32k of window P&L) by the
depth-adaptive resets C4_10, C5_atr3, C6_38 (and C9, C5_atr5, C6_50 slightly later) — not by direct
re-entry after reset, but by clearing the stale 2022-11-03 restriction in November–December 2022 so
that a December trade's small loss created a fresh anchor whose 3% level filled at 38.1436 on
2023-01-05 (spot check C). Cost elsewhere: for C4_10 the same eagerness produces −47,683 in QQQ
2000–02 and −48,101 vs the 3% reference on VGT-old; **C6_38 and C5_atr3 buy the same rescue at far
lower bear cost** (one in-window false reset each); C6_38's only visible V-bottom cost is −2,973 on
VGT 2026.

**(c) The full cost of C0 (no reset).** Nets 19,333 / −18,285 / 8,111 / 5,568 — i.e. −7,051 /
−58,543 / −173,983 / −126,675 vs the existing 3% rule. One unresolved episode per dataset: QQQ-old
2002-10-08 (−$3,989 loss) unresolved for 3,331 sessions, 526 blocked signal sessions, min_gap 1.99%,
while price rose from 17 to 107; VGT-new 2019-01-03 (−$2,903) unresolved 1,949 sessions, 410 blocked
signals, min_gap 0.52%; QQQ-new 2019-01-03 unresolved 1,950 sessions (min_gap 1.20%); VGT-old
2010-06-30 unresolved 1,326 sessions (min_gap 0.98%). Of the baseline's ≥$10k winners, C0 eliminated
4/4, 11/12, 8/8, 7/7 per dataset. Its drawdowns are the lowest of the family (18–54k) purely because
it stops trading; both matched controls still beat it on profit on three datasets. Verdict: **C0 is
not a strategy; every reset mechanism is buying back five to six figures of abandonment cost, and the
binding failure is a sub-2% near-miss followed by a permanent runaway — the same knife-edge as the
V-bottom misses, stretched over a decade.**

**(d) Does C2 recreate the repeated-entry problem?** Substantially, yes. QQQ 2000–02: 54 closed trades
(32 losing) vs the baseline's 56 (36) and C1's 42 (23); window −57,079 and max DD 114,608 (baseline
−91,629 / 149,561). Dataset-wide it eliminates only 1 of 46 repeated losers (C1: 18) and resets a
median ≈3 sessions after arming — ten of its resets fired on the arming exit session itself (e.g.
2002-09-13: max-hold exit at the open 19.1595, close 19.4922 → restriction cleared the same day, spot
check D). C12_half_repair is strictly more permissive (midpoint ≤ exit) and lands even closer to the
baseline (QQQ-old −8,715 net, 137,266 DD; 107 trades vs 109). Both also *underperform the baseline
itself* on QQQ 2016–26 (−14,629 / −7,967 net with +16k/+9k worse DD) — reset-then-re-enter-higher has
negative timing value, it does not merely converge to the baseline.

**(e) Reset obsolescence — longest restricted episodes** (`tmp/analysis.txt` §8). C1's worst: 187
sessions (QQQ 2002-10-08 → 2003-07-08) and 101 (QQQ-new 2022-11-03 → 2023-03-31). Every adaptive reset
caps this: C7 ≤ 69, C9 ≤ 68, C5_atr3 ≤ 43–53, C6_38 ≤ 69 (and ≤ 15 on VGT-new), C8 ≤ 32, C2/half_repair
≤ 7. Still-stale mechanisms: C4_20 (310 sessions, QQQ 2004-08 → 2005-11; 279 on VGT-old), C4_15 (159),
C12_timeout120 (120 by construction), C11 (inherits C1: 152/101). C0: 1,326–3,331 sessions. The frozen
anchor's staleness is real but only economically damaging where no lower-price exit exists either —
which is C0's case and C1's 2002–03 and 2022–23 episodes.

**(f) Do permissive resets simply recreate the baseline?** Nearly. QQQ-old identical-entry counts:
C12_half_repair 69/109 baseline trades identical + only 5 missed; C2 70/109 + 6 missed (C1: 41 + 40).
On QQQ-new C2 and half_repair miss 0 of 36 baseline entries. But they are not the baseline: delayed
re-entries after resets systematically enter higher, so they keep ~85–95% of the baseline's bear
losses while *losing* to it in 2016–26. Worst of both worlds.

**(g) C7's decay-earned resets** (required report): 13 of 25 resets (52%) fired with the rolling
90-session high already below the frozen reference high — 4/6 VGT-old, 5/11 QQQ-old, 2/4 on each
2016–26 set (per-event detail in `tmp/analysis.txt` §7). The decayed resets are exactly the
economically distinct ones (2002-11-04, 2003-04-15, 2023-01-23…); the intact ones duplicate C1.
Because a C7 reset implies the close is within 5% of the rolling high, no 10% signal can coexist with
it, so a C7 reset changes outcomes only when a NEW dip arrives before C1's own reset — on both
2016–26 datasets that never mattered (C7 ≡ C1 trade for trade); on the old sets it is slightly
negative on VGT (−4,009 vs C1) and a wash on QQQ (−735). The same latency argument applies to
C12_signal_gone15 (identical to C1 on both QQQ sets).

## 6. Failure cases (named)

- **C10/C9-style pre-bottom resets:** QQQ 2008-11-24 episode, C10 reset 2009-02-24 → 2009-02-25 entry
  at 24.80, −$3,443, re-armed restriction, March bottom missed; C1 entered 2009-03-06 at 22.81 for
  +$54,188 (spot check H). Single event worth ≈ −$58k — all of C10's QQQ-old deficit.
- **C12_signal_gone15, VGT 2026:** reset 2026-02-27 with dd90 at 0.099 (0.001 from a signal) for 15
  sessions; entered the new March signal at 90.37 (−$111), re-entered 2026-03-26 at 87.00 (+$31,094)
  instead of C1's 2026-03-27 at 85.125 — window −21,891 (spot check I).
- **C2/C12_half_repair, QQQ 2000–02:** 13/16 in-window false resets (dates in §5a), window −57,079 /
  −79,736, DD 114,608 / 137,266.
- **C12_held_above, VGT 2007–09:** −56,771 (vs C1 −6,198); 20-session holds above cascade lows in
  spring 2008 and early 2009 reset it into the next legs down.
- **C4_15:** the worst compromise — too slow for 2020-10/2023-01 (VGT-new ≡ C4_20) yet still reset
  into the June 2009 pullback (QQQ 2007–09 −27,755) and the 2000/2002 rallies (2 false in-window);
  negative on both old datasets.
- **C12_sma100, Dec-2001/Feb-2002 and Nov-2022/Jan-2023:** bear rallies crossing SMA100 (4 false
  in-window QQQ-old; VGT-new 2023-01-11 reset led to a worse January than the C4/C5/C6 route).
- **C8_breakout20:** 20 of its 22 QQQ-old resets were followed by a losing trade (82% vs 64% base
  rate) — every bear-rally leg makes a 20-day closing high.

## 7. Dependence on few trades

- C11's entire old-set gain is four events: QQQ 2002-10-07 (+21,285, stage-2 catch of the bear
  bottom), QQQ 2009-03-02-for-03-06 swap (−2,178), VGT 2010-08-31 (+18,141 extra trade), VGT
  2009-03-02-for-03-06 swap (−1,988), plus ~net-zero extra 2000–01 bear churn (trade-level diff in
  spot check G). Two trades carry ≈ +$39k of its ≈ +$31k total edge over C1.
- C4_10/C5_atr3's VGT-new +40k over C1 is one chain (Nov 2022 reset → Dec re-entry → 2023-01-05
  anchor), ≈ +31.7k, plus smaller 2024-09 timing differences.
- C10's QQQ-old collapse is one reset (2009-02-24). C12_held_above's VGT-old collapse is two 2008–09
  resets. C6_38's QQQ-old edge is dominated by the single 2002-11-01 reset chain (+15.4k in 2003)
  plus better 2000–02 churn.
- Knife edges observed: 0.1pp of dd90 (signal_gone15, 2026-02-27), 1.0pp of close/low ratio
  (C4_10's 2022-11-10 close at 41.0646 vs trigger 41.2341 — one day later), min_gap 0.52% deciding
  8 sidelined years (C0, VGT 2019). The family inherits the program's sub-2% sensitivity problem.

## 8. Per-config classification

Historical observation first; inference ("would") clearly marked.

| Config | Class | Basis |
|---|---|---|
| C0_none | **Unpromising** (diagnostic) | Observed: −$127k…−$174k vs existing 3% on new sets; 8–13-year dead episodes. |
| C1_frozen95 | Anchor | As in prior study; stale in deep bears but fastest reset in shallow dips (2020-09). |
| C2_exit_price | **Unpromising** | Recreates repeated entries (§5d); loses to baseline on QQQ-new. |
| C3_entry_price | **Unpromising** | Better than C2 everywhere but still 4 in-window false resets, −$23k vs 3% rule on QQQ-new, −$27k VGT-old. |
| C4_rebound_10 | **Inconclusive** | Observed: best-in-family VGT-new (+40k) via the 2023 rescue; worst-of-trio 2000–02 (−47.7k) and VGT-old. Regime-flipping. |
| C4_rebound_15 | **Unpromising** | Negative on both old sets; no modern upside over C1. |
| C4_rebound_20 | **Inconclusive** | ≈C1 with 310-session stale episodes; nothing bought. |
| C5_atr_rebound_3 | **Promising-leaning-inconclusive** | Beats the 3% rule on 3 of 4 sets (+10.1k/+40.7k/+3.5k), −1,391 in 2000–02 with 1 false reset; the one failure is VGT-old (−21.4k vs 3% rule, resets in the 2008 cascade). |
| C5_atr_rebound_5 | **Unpromising** | VGT-old −52.7k vs 3% rule; dominated by k=3 on every set. |
| C6_retrace_38 | **Promising** | Best aggregate (Σ 437k); only config positive vs baseline on all four sets; QQQ-old beats the ex-post lower3 control on BOTH axes (+17,933/−36,014); rescues 2023-01 AND half the 2003 basing; 1 in-window false reset; worst case is −3,404 vs the 3% rule (VGT-old) with a better DD. |
| C6_retrace_50 | **Promising-leaning-inconclusive** | Slightly tamer C6_38; never far behind, never ahead of it. |
| C7_rolling95 | **Inconclusive** | ≡C1 on both new sets; −0.7k/−4.0k on old sets; caps episodes at 69 sessions; 52% decay-earned resets. A structural fix for obsolescence with ~zero realized benefit here. |
| C8_breakout20 | **Unpromising** | 82% false-reset rate; −63k vs the 3% rule on QQQ-old. |
| C9_base40 | **Inconclusive** | +14.2k VGT-new (2023 rescue) at ≈C1 cost elsewhere; did NOT buy 2003 (reset 2002-12-05 came after the December entries had passed). |
| C10_time_price | **Unpromising** | Observed: the 2009-02-24 pre-bottom reset (−$58k); the "conservative" valve fails exactly when the discount is about to pay. |
| C11_graduated | **Promising** | Never below C1 on any dataset; +16.2k/+15.2k on old sets; 2000–02 positive; ≥ ties both matched controls everywhere it differs; zero added false resets. Weakness: changes nothing on 2016–26 (did not fix 2023-01) and inherits C1's stale episodes. Strictly a severity mechanism, complementary to a better reset. |
| C12_sma100 | **Unpromising** | Bear rallies cross SMA100; −45.7k vs 3% rule QQQ-old, worst VGT-new of the strict group. |
| C12_signal_gone15 | **Inconclusive** | ≡C1 on QQQ sets, +3.1k VGT-old with family-best DD, −22.0k VGT-new on a 0.1pp knife edge. Economically clean concept, one bad coin-flip observed. |
| C12_vol_crush | **Inconclusive** | Mid-pack everywhere; predicted mid-grind false resets confirmed (3 in-window); +10.8k VGT-new. |
| C12_timeout120 | **Unpromising** | Only QQQ-old likes it (+4.6k); −22k/−25k on the new sets — pure time deletes the frozen95 reset's useful *early* resets in shallow dips. Valuable negative: staleness alone is the wrong trigger. |
| C12_half_repair | **Unpromising** | ≈baseline with worse timing (§5d/f); predicted self-limiting rescue of 2023-01 did occur but is swamped. |
| C12_held_above | **Inconclusive** | QQQ-old +21.7k vs 3% rule, best bear window (+6,839), p/dd 0.94; VGT-old −58.3k (2008 resets). The most regime-dependent config in the family. |

## 9. Verification performed

Spot-checked against raw prices (full transcript `tmp/spot_checks.txt`):
(A) C11 QQQ 2002-08-05 episode — frozen exit 18.7474, stage 2 armed 2002-08-08 (close 19.9807 ≥
1.08 × low-so-far), re-entry 2002-09-19 close 18.2941 ≤ 1.5% level 18.4662 but > 3% level 18.1850 (C1
could not enter); no earlier session's close was at/below the then-active level.
(B) C6_38 QQQ 2002-10-08 episode — low 17.0068 (2002-10-09), threshold 17.0068 + 0.38·(28.5103 −
17.0068) = 21.3781; 2002-10-31 close 20.8120 below, 2002-11-01 close 21.4119 above → reset date exact.
(C) C4_10 VGT 2022-11-03 episode — closes vs 1.10·low-so-far session by session (first satisfied
2022-11-11: 41.9025 ≥ 41.2341); both subsequent 3% re-entries (2022-12-19 at 39.3976 ≤ 39.7355;
2023-01-05 at 38.1436 ≤ 38.3338) and C1's reset level 45.3824 vs max close 42.6975 in the span.
(D) C2 QQQ 2002-09-13 same-session reset — max-hold exit at the open 19.1595, close 19.4922 above it.
(E) C12_timeout120 session arithmetic — reset exactly 120 sessions after the 2022-11-03 exit.
Plus: counter/episode consistency (counters == events resolutions) asserted for C6_38, C11, C4_10, C0
on all four datasets; C1-vs-C11 full trade-level diff (spot check G); the C10 2009 and signal_gone15
2026 failure narratives traced through trades CSVs (H, I). The calibration gate itself verified
baseline and REF_lower3 trade for trade before any config ran.

## 10. Parameters flagged for the validation stage (no further runs performed)

1. **C11_graduated** — the family's only clean dominance result. Sensitivity needed on the 1.08
   rebound confirmation and 1.5% stage-2 discount; test sticky vs non-sticky stage 2.
2. **C6_retrace_38** — retrace fraction neighborhood (0.30–0.50) and interaction with the 2026
   give-back; it is the natural *reset* partner for C11's *severity* in a Family G combination
   (they modify different components).
3. **C5_atr_rebound_3** — ATR multiple 2–4; its VGT-old failure mode (2008 resets) is the thing to
   stress.
4. **Reset-priority inversion** (design flag, not a parameter): every observed V-bottom damage came
   from a reset firing while the discount was pending and close to filling (C10 2009, C2 2020/2026,
   signal_gone15 2026). A guard such as "no reset while close ≤ required level × (1+x)" is a
   candidate Family G mechanism — flagged, not built or run.
5. Multiple-testing caveat: 22 configs × 4 datasets were examined; the C6_38 and C11 results rest on
   a handful of episodes each (§7) and must survive independent replay and fresh instruments.

## Reproducing

```
PY=<frozen research venv python>
cd research/risk-management/adaptive-reentry/recovery-resets
$PY register.py    # idempotent-refusing (append-only registry; already written)
$PY run.py         # 88 runs through the frozen runner; writes results/
$PY analyze.py     # tmp/analysis.txt (all tables referenced above)
$PY spot_check.py  # tmp/spot_checks.txt (verification transcript)
```
