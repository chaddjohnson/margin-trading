# Family E — Correction memory and state management

Experiment `adaptive_state_memory`, run 2026-10-12 through the frozen Phase-2 infrastructure
(`common/framework.py`, `runner.py`, `analysis.py`; calibration gate passed on all four datasets:
`A_baseline` and `REF_lower3` reproduced trade for trade). All five configurations were registered in
`registry.jsonl` before their first run. Raw outputs: `results/` (summary.json, trades/, daily/,
states/, events/, matching/, recovery/). Implementation: `strategies.py`, `run.py`; verification and
table scripts in `tmp/`. No shared infrastructure was modified; E5 is the one permitted subclass and
its override is documented in §2 and on the class.

Design question: what is the MINIMAL state that prevents both repeated losses and stale restrictions?
Short answer from this sample: **two frozen numbers — the loss-exit price and the reference high (E1)
— beat every richer memory tested on three of four datasets.** The only extra quantity that ever paid
was E4's correction cumulative loss, and only on QQQ; its saturating functional form is catastrophic on
VGT. Entry-price memory (E2, E3) is economically perverse: it looks principled ("pay less than last
time") but imposes no spacing exactly when spacing matters (deep losses), re-opening the 2000–02
cascade in full.

---

## 1. Hypotheses as registered

Verbatim summaries of `registry.jsonl` (registered 2026-10-12 before evaluation; the registry file
holds the full text):

- **E1_exit_only** — reference point: the verified 3% rule (= REF_lower3); every other Family E
  machine is judged against it; known failure: the anchor is an arbitrary exit date (VGT 2023-01).
- **E2_entry_only** — anchoring to what the failed trade PAID removes the arbitrary exit-date
  dependence; after a deep loss, re-entry is immediate at the next signal. Expected to fix V-bottom
  misses at the cost of re-opening the 2000–02 repeated-loss problem — registered as a diagnostic for
  question 5, not a candidate.
- **E3_entry_count** — one stable anchor per correction plus a failure count spaces repeated attempts
  down a cascade without referencing any exit price; the rebound reset ends the correction from the
  LOW (reachable in deep bears, unlike frozen95).
- **E4_cum_loss** — restriction severity should scale with the damage done: −$143 ⇒ 1.14% discount
  (targets VGT 2023-01), cascade ⇒ 8% (preserves 2000–02 spacing). Tests whether cumulative dollars
  are the right memory, independent of individual loss size.
- **E5_no_small_rearm** — a cascade is a CUMULATIVE decline, so arm on cumulative price damage, not on
  any single loss; micro-losses stay unrestricted while chained small losses still arm. Tests whether
  the TRIGGER, not the discount, is the right place for loss-size memory.

## 2. Exact mechanism definitions

All five: trigger = any net loss (except E5), entry size $100k, verified chronology (reset priority on
a same-session close; no entry on exit sessions; entry clears the restriction; profitable exits clear
the correction). Remembered quantities exclude the standard evolving episode fields (min_close,
sessions_restricted) that every config carries.

| Config | Required level at session i | Reset at session i | Remembered | `correction_ends_on_reset` |
|---|---|---|---|---|
| E1_exit_only | loss-exit price × 0.97 | close ≥ 0.95 × frozen ref high | exit_price, ref_high (2) | True — **inert**: no component reads ctx.correction; stated for the record |
| E2_entry_only | last losing ENTRY price × 0.97 (`st.entry_price`, frozen at arming) | close ≥ 0.95 × frozen ref high | entry_price, ref_high (2) | True — inert, as E1. "No other memory" = no correction-level memory (no count, no ladder, no cum loss) |
| E3_entry_count | correction FIRST entry × (1 − 0.03 × n_failed); n_failed counts the correction's arming losses incl. the current one; no clip | close ≥ 1.15 × episode low (lowest close since the arming exit incl., `st.min_close` — C4_rebound_15 form) | first_entry_price, n_failed, episode low (3) | **True, deliberate**: a 15% rebound from the low is the machine's statement that the correction ended, so the ladder resets; keeping it would anchor the next correction to a stale entry |
| E4_cum_loss | loss-exit price × (1 − d), d = clip(1% + \|correction cum loss\|/$100k, 1%, 8%); cum loss = sum of net P&L (interest incl.) of the correction's arming losses incl. the current one | close ≥ 0.95 × frozen ref high | exit_price, cum_loss, ref_high (3) | **True, deliberate**: frozen95 fires only near full recovery; a finished correction's losses must not scale the next one |
| E5_no_small_rearm | loss-exit price × 0.97 (REF) | close ≥ 0.95 × frozen ref high (REF) | streak_first_entry, exit_price, ref_high (3) | **True, deliberate**, and mirrored onto the trigger's own memory (below) |

**E5 trigger (the registered exact form):** a net-loss exit arms the restriction only when
`exit_price / streak_first_entry − 1 ≤ −0.02`, where `streak_first_entry` is the entry price of the
first trade of the current run of consecutive net-loss exits: set on the first loss while empty, KEPT
by non-arming losses (small losses accumulate toward the 2% threshold), cleared by any profitable
(net ≥ 0) exit and by a recovery reset. A single financing-only loss can never arm.

**E5 subclass override (the one Family-E subclass):** `E5NoSmallRearm.on_session_end(e, i)` first runs
the frozen `AdaptiveStrategy.on_session_end` unchanged (reset priority, entry resolution, logging,
correction lifecycle), and only afterwards — if that frozen logic resolved the active episode by
`recovery_reset` at this very session — clears `streak_first_entry`. No decision, counter, log row or
state transition is altered; the chronology contract is preserved exactly. The framework's own
`ctx.correction` is not read by any E5 component; `streak_first_entry` is the real E5 memory and can
differ from `correction.first_entry_price` (the framework correction only starts at an ARMING loss,
the streak at any loss). Verified by independent replay (§3).

Edge cases: E3's ladder has no clip (3%·n ≥ 100% would need 34 failures; max observed n = 5); E4's 1%
floor is arithmetically inert (1% + |x| ≥ 1%), kept for fidelity to the registered formula; no
indicators are used, so `indicator_fallbacks` = 0 everywhere (confirmed).

## 3. Verification

- **Calibration gate**: passed per dataset (framework A_baseline ≡ frozen baseline trades; REF_lower3
  ≡ frozen B_lower_3pct trades). E1's results equal REF_lower3's on every dataset and metric.
- **Counter/episode consistency** (`tmp/consistency.py`): for all 20 runs — episode counts, resolution
  counts vs `lower_price_reentries`/`recovery_resets` counters, blocked-session counters vs events,
  every re-entry close at/below its logged required level, zero alt entries, zero fallbacks. ALL OK.
- **Independent E5 replay**: the arm/decline decision of every losing exit on all four datasets was
  re-derived from the trades and events files alone (streak rules above); 0 mismatches
  (26/79/36/28 trades).
- **Raw-price spot checks** (`tmp/spotcheck.py`, 26/26 passed against the raw pipe-separated data
  files, no engine involved):
  - **SC1 — QQQ 2000-04-14 (the E1-vs-E2 divergent-anchor episode):** entry 90.9244, exit 72.9691
    (−19.7%). E1 level 70.7800, E2 level 88.1967 (both match the logs). Verified from raw closes: E2
    re-entered the NEXT session (2000-04-17, close 75.9890 ≤ 88.1967) — **above the loss-exit price**;
    no close in 04-17…05-09 reaches E1's level (min 71.8481) and 2000-05-10 (67.6163) is the first
    that does — E1's logged re-entry; no reset possible (max close 81.07 << 97.08).
  - **SC2 — QQQ 2001 E3 ladder:** levels 55.1028/53.3986/51.6944/49.9902 = 56.807 × (1 − 0.03n),
    n = 1…4, all match the state log; the n = 4 episode resolved by next-session re-entry at 31.6279,
    18 points below its stale ladder level; the genuine rebound reset of the 2003-03-05 episode fired
    2003-04-22, the first raw close ≥ 1.15 × running episode low (23.2611 vs threshold 23.2042 —
    a 0.25% margin).
  - **SC3 — QQQ 2008-11-24 E4 episode:** previous exit profitable ⇒ cum loss = −13,229.31 alone ⇒
    d saturates at 8% ⇒ level 21.6957 (matches); no close in the 273-session episode ever reached it
    (min 22.3304); 2009-03-06 (close 22.8139, E1's famous re-entry) was blocked; the reset fired
    2009-12-24, the first close ≥ 0.95 × 42.0517 = 39.9491 (40.1145).
  - **SC4 — VGT 2023-01 and VGT 2020-03:** E1's level 36.9151 was never reached in the whole
    2022-11-03…2023-02-15 episode (min close 37.4855, gap +1.55%); E2's level 38.2157 (off the
    2022-12-19 entry 39.3976) filled at the 2023-01-05 close 38.1436; the missed baseline +$28k entry
    closed 2023-01-04 at 38.9505, above E1's level. VGT March 2020 closes 03-16…03-20 =
    22.7754 / 24.1464 / 23.3378 / 23.3731 / 22.4319: both E1's 22.4700 and E2's 23.0016 first filled
    at the 2020-03-20 close — the two anchors agreed at the COVID V-bottom.
  - **SC5 — E5 streak arithmetic:** QQQ 2024-09-09 financing-only loss (−$185, exit 451.024 > entry
    446.733) set the streak anchor at 446.733 with no intervening exits; the 2025-03-31 (−$2,774) and
    2025-04-16 (−$5,459) losses measured +3.40% and +0.51% from it — correctly declined per the
    registered rule (and see §6: this is a design flaw, faithfully implemented). VGT 2026-02-05
    (−$2,092) was financing-only (exit 89.4832 > entry 89.2790) ⇒ declined.

## 4. Results

### 4.1 Standard metrics (net / max DD / P/DD; W-L; blocked sessions; re-entries; resets (false))

| Config | VGT 2005–2015 | QQQ 1999–2015 | VGT 2016–2026 | QQQ 2016–2026 |
|---|---|---|---|---|
| E1_exit_only | 26,384 / 54,279 / 0.49; 8-14; blk 274; re 8; rst 5(4) | 40,258 / 91,469 / 0.44; 28-41; blk 425; re 31; rst 10(7) | 182,094 / 28,687 / 6.35; 13-19; blk 138; re 15; rst 4(2) | 132,242 / 23,564 / 5.61; 13-14; blk 111; re 10; rst 4(1) |
| E2_entry_only | 30,839 / 62,118 / 0.50; 11-20; blk 112; re 15; rst 4(3) | **−118,054 / 182,189 / −0.65**; 23-53; blk 274; re 44; rst 9(7) | **210,882** / 32,979 / 6.39; 16-22; blk 65; re 20; rst 2(1) | 103,398 / 35,117 / 2.94; 13-18; blk 52; re 14; rst 4(1) |
| E3_entry_count | 2,477 / 74,496 / 0.03; 9-24; blk 125; re 18; rst 5(4) | −83,576 / 159,881 / −0.52; 31-60; blk 153; re 52; rst 8(6) | 179,453 / 44,760 / 4.01; 13-25; blk 76; re 22; rst 3(2) | 86,134 / 37,691 / 2.29; 12-19; blk 46; re 15; rst 4(1) |
| E4_cum_loss | −13,851 / 54,666 / −0.25; 5-17; blk 254; re 10; rst 7(5) | 16,932 / **57,607** / 0.29; 20-31; blk 617; re 22; rst 9(7) | 88,940 / **24,347** / 3.65; 10-19; blk 196; re 13; rst 6(4) | **135,768 / 23,564 / 5.76**; 12-12; blk 181; re 8; rst 4(1) |
| E5_no_small_rearm | 14,451 / 57,994 / 0.25; 8-17; blk 242; re 6; rst 3(2) | 34,475 / 93,574 / 0.37; 30-48; blk 342; re 25; rst 6(4) | 157,448 / 28,208 / 5.58; 14-22; blk 114; re 11; rst 3(1) | 113,597 / 34,503 / 3.29; 12-15; blk 117; re 6; rst 3(0) |

Reference points: baseline nets 11,602 / −2,886 / 161,772 / 116,388; existing-3% = E1's row.
**E1 has the best net in-family on QQQ 1999–2015 and (except E2's VGT runs) generally; E1 beats E5 on
all four datasets; E4 is the only config that beats E1 anywhere that matters (QQQ 2016–2026 net and
P/DD, QQQ 1999–2015 max DD by −33,862).** Median re-entry discount vs the loss exit: E1 −3.7…−4.3%;
E2 −1.4…−3.1% (shallower — entry-anchored levels sit higher); E3 −2.1…−2.4%; E4 −3.0…−7.9% (deeper —
severity stacking); E5 −3.7…−4.8%.

### 4.2 Matched-exposure controls (Δprofit / ΔDD vs control; positive Δprofit good, negative ΔDD good)

Baseline-matched (deployable control) and lower3-matched (ex-post exposure control, not deployable):

| Config | VGT 05–15 | QQQ 99–15 | VGT 16–26 | QQQ 16–26 |
|---|---|---|---|---|
| E1 vs base-ctl | +19,130 / +8,383 | +41,968 / +2,844 | +63,993 / +710 | +35,187 / −9,155 |
| E2 vs base-ctl | +21,269 / +1,572 | −116,103 / +81,074 | **+65,486 / −1,465** | +10,433 / +3,777 |
| E3 vs base-ctl | −5,041 / +26,931 | −81,485 / +51,510 | +43,911 / +12,651 | −891 / +8,353 |
| E4 vs base-ctl | −19,410 / +19,495 | +18,408 / **−18,852** | −3,264 / +2,504 | **+45,045 / −7,020** |
| E5 vs base-ctl | +7,573 / +14,478 | +36,379 / −5,123 | +28,629 / −2,308 | +16,990 / +1,935 |
| E2 vs low3-ctl | −3,967 / −9,487 | −163,986 / +77,829 | −13,297 / −2,338 | −23,271 / +12,547 |
| E3 vs low3-ctl | −24,866 / +18,243 | −132,804 / +48,032 | −29,534 / +11,836 | −32,441 / +16,562 |
| E4 vs low3-ctl | −34,070 / +13,071 | −17,800 / −21,306 | −53,225 / +1,950 | **+12,154 / +1,537** |
| E5 vs low3-ctl | −10,565 / +6,530 | −10,359 / −8,290 | −41,172 / −3,082 | −18,034 / +11,048 |

Only two cells beat a control on both profit and drawdown: E2 on VGT 2016–2026 (baseline control only;
it loses to the lower3 control on profit) and E4 on QQQ 2016–2026 (beats the baseline control on both;
vs the lower3 control +12,154 profit at +1,537 worse DD). **No Family E machine beats the existing 3%
rule's exposure-matched control on both dimensions on any dataset.**

### 4.3 Bear windows (P&L / in-window DD / closed trades (losing))

| Window | E1 | E2 | E3 | E4 | E5 |
|---|---:|---:|---:|---:|---:|
| QQQ 2000–2002 | −11,471 / 61,251 / 42(23) | −102,703 / 164,369 / 38(28) | −87,271 / 146,326 / 52(34) | **−6,074 / 52,890 / 26(15)** | −17,559 / 63,478 / 45(25) |
| QQQ 2007–2009 | **+45,281 / 44,706 / 10(6)** | −49,791 / 73,322 / 16(11) | −44,354 / 67,885 / 16(12) | −10,708 / **37,629** / 9(4) | +45,281 / 44,706 / 10(6) |
| VGT 2007–2009 | **−6,198** / 54,279 / 10(5) | −15,544 / 62,118 / 17(11) | −25,160 / 62,226 / 17(13) | −31,736 / **46,705** / 9(7) | −8,006 / 46,375 / 9(5) |
| VGT 2022 | −3,865 / 20,570 / 9(7) | −14,959 / 32,843 / 12(9) | −26,882 / 41,543 / 13(11) | **+2,753** / 20,753 / 9(7) | −7,056 / 20,570 / 9(7) |
| QQQ 2022 | −9,942 / 21,397 / 9(7) | −19,286 / 33,001 / 12(9) | −24,172 / 33,241 / 13(10) | **−6,417 / 18,514 / 6(5)** | −9,934 / 21,419 / 9(7) |

E4 is the best bear-market machine in the family (and better than E1 in every window except 2007–09,
where its 160/273-session blocks also skipped E1's profitable mid-2008 trades). E2 and E3 re-open the
repeated-loss problem **in full**: E2's 2000–02 is within $11k of the unrestricted baseline's −$91,629,
with 28 losing trades, re-entering one session after most losses.

### 4.4 Recovery windows (P&L; baseline for reference)

| Window | base | E1 | E2 | E3 | E4 | E5 |
|---|---:|---:|---:|---:|---:|---:|
| QQQ 2003 | +18,291 | 0 | −87 | −87 | 0 | 0 |
| QQQ 2009 | +66,522 | +65,938 | **−4,911** | **−4,911** | **0** | +65,938 |
| VGT 2009 | +15,518 | +29,642 | +29,314 | +29,314 | **0** | +29,642 |
| VGT 2020 | +48,081 | +55,455 | +55,455 | +33,761 | **+21** | +55,455 |
| QQQ 2020 | +63,718 | +63,172 | +63,172 | +49,391 | +63,172 | +63,172 |
| VGT 2023 | +44,468 | +18,901 | **+50,581** | +50,581 | +18,901 | +15,664 |
| QQQ 2023 | +25,111 | +17,473 | +26,869 | +26,869 | +17,473 | +17,473 |
| VGT 2025 | +39,671 | +42,023 | +32,425 | +32,425 | **+850** | +42,023 |
| QQQ 2025 | +19,964 | +26,779 | **−3,301** | −3,301 | +26,779 | +19,964 |
| VGT 2026 | +29,821 | **+51,712** | +51,712 | +51,712 | +48,793 | +29,821 |
| QQQ 2026 | +32,918 | +32,918 | +32,918 | +32,918 | +32,918 | +32,918 |

The two headline reversals: **E2/E3 captured VGT+QQQ 2023 January (the −$143-class failure E1 is known
for) but lost March 2009 on QQQ** — E2 kept trading down the 2008 crash, its last failed entry
(24.1705, 2009-02-23) set a level of 23.4454, the March bottom closes stopped 1.2% short
(min_gap 0.0116 in events), and the episode ended only at the 2009-04-30 reset after the rebound's
signal had lapsed. The arbitrary-anchor disease it was designed to cure, in its own anchor. **E4
missed March 2009 on BOTH old datasets** (gaps 2.9% / 2.4%, 273- and 270-session episodes resolved by
false resets on 2009-12-24 / 2009-12-21) and VGT 2020 (gap 4.3%) and VGT 2025 — all four are the
8%-saturation at work (= the known D_lower8 failures). QQQ 2003 stays missed by everyone (all levels
or resets anchored far above the basing range).

## 5. The seven state questions (brief §10)

**1. When does a correction begin?**
Economically it begins when price turns down from a local peak; every tested machine dates it from
trade accounting instead, and each mis-dating has a documented cost. E5 dates it from the first net
loss: the QQQ 2024-09-09 financing-only −$185 loss (entry 446.733, bought LOW after a dip) started a
"streak" from which the genuine March–April 2025 losses measured +3.4% / +0.5% — so a −$5,459 loss in a
−12% market never armed (§3 SC5). The framework correction dates it from the first ARMING loss, which
under E3 means the correction's anchor (its first entry, e.g. 56.807 in QQQ 2001-02) is the HIGHEST
price of the whole correction — a ceiling, not a floor. E1's per-episode restart (each loss re-anchors
at its own recent exit) is the only variant whose "beginning" can never go stale, which is a large part
of why it wins. Historical observation; the "price-structure beginning" alternative is inference,
flagged (§9).

**2. What makes a NEW correction vs a continuation?**
The framework's rule (continuation across consecutive arming losses; ended by a profitable exit or a
reset) was used by all configs, with E3/E4 actually reading the continuation state. The data says the
labeling matters less than what the continuation memory DOES: E3's stable first-entry anchor makes
continuation maximally permissive in a cascade (ladder 3%·n falls far slower than a −40% market; four
chained re-entries one session after each loss, −$59k in QQQ Feb–Apr 2001); E4's cumulative-loss
memory makes continuation protective in a grind (QQQ 2000–02 −6,074, best in family) but a trap at the
bottom (8% wall, §4.4). A continuation definition tied to price structure (E3's 15%-rebound ending was
the one reset reachable in deep bears — all its 2001 corrections genuinely ENDED rather than deadlocking)
is the right ingredient attached to the wrong level anchor. Observation, with the recombination as
inference.

**3. Should a profitable exit always erase history?**
The framework hardcodes yes, and the sample shows both faces. For: E2's VGT Nov–Dec 2022 win (+5,986)
erased the 2022 cascade memory, leaving the trivial −$143 trade as the only restriction, which is
exactly why E2 captured the +$30,882 January 2023 recovery every exit-anchored config missed. Against:
in E4's runs a +$41, 9-day trade (QQQ 2008-09-17→26) erased a correction carrying −$7.7k of losses, and
a +$4,046 bounce trade (VGT 2008-10-24→11-06) erased −$22.0k of crash memory mid-collapse; the next
losses (−$13.6k) rebuilt the discount from scratch. With E4's saturating map the erasure barely changed
levels; under any non-saturating severity map a scalp-sized profit erasing a crash-sized memory would
be decisive. So: "any profit ⇒ erase" is demonstrably too blunt, but none of the five machines isolates
a better rule — inference only, flagged (§9) rather than concluded.

**4. Should one tiny loss rearm everything?**
On this sample, **yes more often than no — the opposite of the brief's intuition.** E5 (micro-losses
never arm) loses to E1 (every loss arms) on all four datasets (−11,933 / −5,783 / −24,646 / −18,645 net
vs E1). Named episodes both ways: micro-arming cost E1 the VGT 2023-01-04 +$28,006 winner (−$1,306
arming loss, episode min close 1.55% above the level); but micro-arming EARNED E1 +$21,891 vs E5 in
VGT 2026 (the financing-only −$2,092 exit on 2026-02-05 armed E1, whose 3% level filled 2026-03-27 at
85.125 for +$34,067, while E5 declined the trigger and took the baseline path, +$29,821 window incl. a
−$111 extra loss) and +$3,297 in VGT 2023-10 (−$503 arming ⇒ re-entry at 49.2671 vs E5's 50.5398).
The sign of a micro-loss restriction is episode-specific and unpredictable in advance; removing it
outright was net harmful everywhere. (E5's specific streak measure also has the Q1 staleness flaw, so
this is evidence against *this* form of the idea, not a final verdict on trigger-side severity.)

**5. Does exit-price anchoring make re-entry depend on an arbitrary exit date?**
Yes — the exit price is set by the 15-day calendar rule and nothing else — but the trade-by-trade E1/E2
comparison shows the arbitrariness is load-bearing. QQQ 2000-04-14 (entry 90.92, exit 72.97): E1
demanded 70.78 and re-entered 2000-05-10 at 67.62; E2 demanded 88.20 — satisfied at the NEXT session's
close of 75.99, **3.02 points (4.1%) above the price it had just exited at** — and lost again within
three weeks. That pattern, repeated, is E2's 2000–02 (−102,703) and 2007–09 (−49,791, incl. a
2008-09-19 re-entry at 37.16 after a 35.58 exit that lost −$18,321 more): after any deep loss the
entry anchor sits above the market and provides zero spacing. Two subtler findings: (a) after
financing-only losses the entry anchor is accidentally HARSHER than the exit anchor (QQQ 2024-09:
E2 level 433.33 vs E1 437.49, since exit > entry there); (b) where it mattered most, the anchors
agreed — both filled VGT 2020-03-20 at 22.4319 (§3 SC4). And E2's one genuine triumph, January 2023
(+50,581 vs +18,901), traces to a path accident (its 2022 permissiveness bought a winning Nov–Dec
trade that erased the correction), not to principled anchoring — while its QQQ 2009 miss (window −4,911; gap 1.16%) and its QQQ 2025 miss
(window −3,301: after the 2025-04-21 loss, the only close at or below its level 437.14 was the exit
session itself, where entries are impossible, and the market gapped away — verified against raw
closes) show the entry anchor is every bit as arbitrary at the moments that decide datasets. **The exit anchor is arbitrary but functional: being recent, it sits
near (below) the current price, which is precisely what creates spacing. The entry anchor is
principled but perverse.**

**6. Can simpler state outperform richer state?**
Yes, and it did. By remembered quantities: E1, E2 (2) < E3, E4, E5 (3). E1 beats every 3-quantity
machine on three of four datasets and beats E5 on all four; the family's two worst results (E2, E3 on
QQQ 1999–2015) and its two catastrophic VGT results (E3 VGT-old +2,477, E4 VGT-new 88,940) all belong
to machines carrying MORE state than E1. The single extra quantity that ever paid was E4's cum_loss,
and only on QQQ (2016–2026 net + both controls; 1999–2015 max DD −33,862 at −23,326 net). Each added
quantity added a new way to be wrong: a stale anchor (E3), a saturated wall (E4), a mis-dated streak
(E5). Historical observation, strongly consistent across datasets.

**7. Should cumulative losses affect spacing independently of individual losses?**
The signal is real but the tested map is wrong. For: E4 posts the family-best bear windows (QQQ
2000–02 −6,074; VGT 2022 +2,753; QQQ 2022 −6,417 with only 6 trades), the family-best max DDs
(57,607 / 24,347 / 23,564), eliminates the most repeated losers (22/46 on QQQ-old, window P&L
−256,807 → −81,359), and is the only config beating E1 and both controls on QQQ 2016–2026. Against:
d saturates at 8% once a correction has lost ≥ $7k, so every deep correction becomes the known-bad
lower8 strategy — missed March 2009 twice, VGT 2020 (gap 4.3%), VGT 2025 — which is why it loses
−25,453 / −72,833 vs baseline on the two VGT datasets. Worse, cumulative stacking of SMALL losses
re-creates the micro-loss problem it was built to fix: into January 2023 E4's correction had
accumulated −$4,859 across three sub-$3.3k losses, pushing the discount to 5.9% (level 35.83, gap
4.6%) — a HARSHER block than E1's fixed 3% (gap 1.55%) on the same +$28k winner. Cumulative dollars
also double-count what the price path already shows: when cum losses are large the market is already
far below every anchor. Verdict: severity memory belongs in the mechanism, but as a bounded, slowly
saturating modifier with a recovery-side escape (rebound reset), not as a hard 8% wall off the exit
price. Observation for the failures; the repair is inference, flagged (§9).

## 6. Failure cases (named episodes and trades)

- **E2 / QQQ 2000–02 cascade:** 28 losing trades in-window; representative chain: re-entry 2000-04-17
  @75.989 (above the 72.969 exit) → −626; 2000-05-09 @72.913 → −13,244; 2000-09-27 @75.934 → −11,974;
  2000-11-08 @64.176 → −10,162; 2000-12-15 @54.156 → −8,878; 2001-02-14 @48.708 → −18,695 (one session
  after a −14,416 exit); 2001-03-02 @39.597 → −11,786… Window −102,703 vs E1's −11,471.
- **E2 / QQQ March 2009 miss:** armed 2009-03-10 (exit 22.7767, prior entry 24.1705 ⇒ level 23.4454);
  episode min close 23.7164 (gap 1.16%); resolved by reset 2009-04-30 after the signal lapsed; window
  −4,911 vs E1's +65,938 (E1 took the 2009-03-06 entry @22.8139 → +54,188).
- **E3 / QQQ Feb–Apr 2001 ladder:** levels 55.10 / 53.40 / 51.69 / 49.99 off the frozen first entry
  56.807 while closes fell 46.84 → 28.87; four next-session re-entries (48.71, 39.60, 34.21, 31.63) for
  −14,416 −18,695 −11,786 −14,425. The ladder never binds in a fast cascade because its anchor is the
  correction's highest price.
- **E3 / VGT 2005–2015 (net +2,477, worst in family after E4):** same mechanism in 2007–09 (−25,160,
  13 losing trades, in-window DD 62,226). Its rebound reset also runs on knife edges: the QQQ
  2003-04-22 reset cleared its 1.15 × low threshold by 0.25% (§3 SC2).
- **E4 / missed 2009 twice:** QQQ episode 2008-11-24 → 2009-12-24 (273 sessions, level 21.696, min
  close 22.3304, gap 2.9%, false reset); VGT episode 2008-11-24 → 2009-12-21 (270 sessions, gap 2.4%,
  false reset). Foregone: QQQ +54,188-class rebound trade; VGT 2009 window 0 vs E1 +29,642.
- **E4 / VGT 2020 + 2025:** 2020-03-16 arming with cum loss −11,279 ⇒ 8% ⇒ level 21.3117 (identical to
  D_lower8), min close 22.2320, gap 4.3%, false reset 2020-05-29 → window +21 vs E1 +55,455. 2025
  window +850 vs E1 +42,023. These two episodes are −$96.6k of E4's −$93.2k gap to E1 on VGT 2016–2026.
- **E4 / January 2023 made worse, not better:** see Q7 — cumulative stacking of three small 2022
  losses produced a 5.9% discount; the hypothesis "E4 fixes the −$143 class" failed because micro-losses
  arrive at the END of corrections, when cum_loss is already fat.
- **E5 / stale streak anchor:** QQQ 2024-09 → 2025-04 (§3 SC5): a financing-only −$185 loss at a LOW
  entry set the anchor; −$2,774 and −$5,459 losses then never armed; E5 took the extra −$5,459 trade
  E1 skipped. Same shape on VGT 2026 (declined −$2,092 financing-only trigger; −$21,891 vs E1's window).
- **Everyone / QQQ 2003 basing:** unchanged from the lower-price-reentry report — no Family E memory
  reaches the spring-2003 entries (E1/E4/E5 window 0, E2/E3 −87); the 2002-10-08-armed E1 episode ran
  187 sessions to a 2003-07-08 false reset. Correction memory does not solve the basing-period problem;
  that remains reset-side (Family C) or path-side (Family D) territory.

## 7. Dependence on few trades

Every aggregate difference above is a handful of episodes:

- E2's −158,312 vs lower3 on QQQ-old = the 2000–02 chain (−91k of window delta) + 2007–09 (−95k,
  of which the March-2009 1.2% miss is −$60–70k) − the 2002-10-07 bottom catch (+21,285, a trade E1
  never had: E1 was holding its 2002-09-23 entry and then restricted from its 2002-10-08 loss exit
  through 2003-07-08 — E2's ONE structural win on that dataset).
- E4's −93,154 vs lower3 on VGT-new = 2020 (−55.4k) + 2025 (−41.2k), both sub-5% price gaps.
- E4's +3,526 vs lower3 on QQQ-new rests on the 2022 bear sequencing (6 vs 9 trades); a single
  different 2022 exit re-orders it.
- E5's gaps to E1 are two to three episodes per dataset (VGT-new: 2026 −21.9k, 2023-10 −3.3k;
  QQQ-new: 2025 −6.8k, 2018-12 block +11.0k near-miss).
- Knife edges observed in this family alone: 1.16% (E2, QQQ 2009), 1.55% (E1/E5, VGT 2023-01), 2.9% /
  2.4% / 4.3% (E4's three V-bottom misses), 0.25% (E3's 2003-04-22 reset). Sub-2% price differences
  continue to decide $20–70k per dataset, now on the memory side as well as the discount side.

## 8. Per-config classification

Historical observation first, inference separated:

- **E1_exit_only — Promising (reference).** Observed: best or near-best in-family on three datasets;
  only machine never catastrophic. Inference: its wins are partly the deleveraging story documented in
  the lower-price-reentry report; within Family E it stands because every alternative memory broke
  something bigger than it fixed.
- **E2_entry_only — Unpromising as a strategy; valuable as a diagnostic.** Observed: −118k net /
  182k DD on QQQ-old (worse than no restriction at all: baseline −2,886 / 149,561); best net on both
  VGT runs but never beats the lower3 exposure control. Registered as a diagnostic and it performed
  exactly the diagnosis: anchor choice, not memory depth, is the first-order design decision.
- **E3_entry_count — Unpromising.** Observed: negative or near-zero everywhere old, worst family DDs
  on three datasets; the ladder anchor is structurally above a cascading market. Inference: its one
  good component (the rebound-15 correction ending — the only reset in the family that fired DURING
  deep bears rather than after them) deserves to be re-attached to an exit-side anchor; that is Family
  C/G territory, flagged.
- **E4_cum_loss — Inconclusive.** Observed: family-best bear windows and drawdowns; only config to
  beat E1 and both controls anywhere (QQQ 2016–2026); catastrophic on both VGT datasets through four
  saturation episodes; made the 2023-01 micro-loss problem worse, not better. Inference: cumulative
  severity is the one extra remembered quantity with demonstrated value, but the clip-at-8%-off-exit
  map converts it into D_lower8 exactly where D_lower8 fails. Wrong form, live idea.
- **E5_no_small_rearm — Unpromising as implemented; concept Inconclusive.** Observed: loses to E1 on
  all four datasets; the streak-first-entry measure goes stale upward (QQQ 2025, VGT 2026) and so
  declines precisely the mid-sized losses it should arm on; fewest false resets (0–4) and fewest
  episodes — the restriction it removes was, on net, earning money. Inference: trigger-side severity
  remains untested in a sound form; measuring the decline from the streak's highest entry or from the
  correction reference high would fix the staleness, but that is a new mechanism (not run — rule 4).

## 9. Flags for the validation/combination stage (not run, not tuned)

1. **E4 without the hard cap + recovery-side escape**: discount = 1% + |cum_loss|/$100k capped near
   5%, OR E4's map with E3's rebound-15 reset replacing frozen95. Needs exit_price, cum_loss, episode
   low, ref_high = **4 remembered quantities — at the complexity boundary; flagged, not built.**
2. **E5 with a non-stale streak measure**: arm when exit / max(entry prices in the streak) − 1 ≤ −2%
   (or vs the correction ref high). 3 quantities; fixes the Q1 staleness without new parameters.
3. **Correction ending by rebound (1.15 × episode low) as a general correction_ends condition**
   combined with exit anchoring — the only reset that fired inside deep bears (E3's resets during
   2001) rather than after them; its 1.15 fraction sits on a 0.25% knife edge at QQQ 2003-04-22 and
   needs sensitivity analysis.
4. **A profit-magnitude condition on correction erasure** (e.g. only a profit > some fraction of the
   correction's cum loss ends it): motivated by the +$41-erases-−$7.4k and +$4,046-erases-−$22k cases;
   adds a 4th quantity to E4-style machines — **flagged as exceeding minimal state; do not build
   without G-stage authorization.**
5. Multiple-testing caveat for the coordinator: E4's QQQ 2016–2026 control-beating cell is 1 of 20
   run-cells in this family alone; treat as a candidate for independent replay, not a result.

## 10. Reproducing

```
PY=<the frozen research venv python>
cd research/risk-management/adaptive-reentry/state-memory
$PY run.py              # registers (first run only) + 20 runs through runner.run_family
$PY tmp/tables.py       # report tables from results/summary.json
$PY tmp/spotcheck.py    # 26 raw-price episode checks (asserts)
$PY tmp/consistency.py  # counter/episode consistency + independent E5 trigger replay (asserts)
```
