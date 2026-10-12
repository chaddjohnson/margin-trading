# Lower-price re-entry with recovery reset — research report

Experiment `lower_price_reentry`, run 2026-10-12 against the frozen research engine
(`../baseline/engine.py`, checksums unchanged). Exploratory research only: no production change, no
parameter optimization, no commit. Consolidated tables: `COMPARISON.md`. Raw outputs: `results/`.

## Summary

The rule does what it was designed to do in prolonged bear markets — and the effect is large. On
QQQ 1999–2015, the −5% configuration turns the baseline's −$91,629 across 2000–2002 into **+$13,619** and
cuts maximum drawdown from $149,561 to $57,795 while raising net profit from −$2,886 to **+$87,845**, an
improvement that survives the matched-exposure control on both profit and drawdown. Every configuration
reduces maximum drawdown on every dataset, cuts margin interest roughly in half, and eliminates a third to
a half of the baseline's repeated losing trades.

The cost shows up at V-bottoms and post-bear basing periods, and it is severe and knife-edge-sensitive. On
VGT 2016–2026 the −5% configuration gives back two-thirds of the baseline's profit ($55,944 vs $161,772)
and underperforms its matched-exposure control, because it sat out the April 2020 rebound (missed the
bottom by 1.0% of price), the January 2023 recovery (missed by 1.6%, after a restriction triggered by a
−$143 loss), and the April 2025 recovery. The −8% configuration misses the March 2009 rebound on **both**
long datasets (foregoing the baseline's single largest trade, +$57,832 on QQQ) and missed the March 2026
VGT rebound by 1.5% of price. No threshold is consistently best: B (−3%) wins on both VGT datasets,
C (−5%) on QQQ 1999–2015, D (−8%) on QQQ 2016–2026.

**Preliminary classification: Inconclusive, leaning promising as a mechanism.** The bear-market mechanism
is real and the recovery reset demonstrably prevents deadlock, but single-episode, sub-2% price
sensitivities decide tens of thousands of dollars per dataset, and the threshold ranking flips across
regimes. Details and the six required answers are below.

---

## 1. Configuration and exact implementation

### Rules (unchanged baseline mechanics)

Entry at the close when the close is ≥ 10% below the highest high of the previous 90 sessions; $100,000 on
margin; 8% profit-conditional trailing stop evaluated before each session; 15-calendar-day loss exit at the
open; 11%/yr simple interest; one position; no re-entry on an exit session. All execution and gap handling
is the frozen engine's; this experiment adds no order types.

### State machine (this experiment)

- **NORMAL** — baseline entry rules.
- **RESTRICTED_AFTER_LOSS** — entered whenever a closed trade's net profit (after accrued interest) is
  < $0. Frozen at that moment, never updated during the episode:
  - `lastLossExitPrice` — the actual execution price of the losing exit (the open for a maximum-hold or
    gap fill, the stop level for an in-session stop fill);
  - `referenceHigh` — the 90-session high the engine used for the **losing trade's entry signal**,
    `max(high[entry_i−90 … entry_i−1])`, recomputed deterministically from the stored entry index.
- **Lower-price re-entry** (while restricted, evaluated only on sessions with the 10% signal, which is when
  the engine consults the strategy): enter at the close if `close ≤ lastLossExitPrice × (1 − t)`,
  t ∈ {3%, 5%, 8%}. The restriction clears when the position opens.
- **Recovery reset** (evaluated at **every** session close while restricted and flat, including the losing
  exit session itself — its close is known at the close; no look-ahead): if
  `close ≥ 0.95 × referenceHigh`, return to NORMAL. A reset never triggers a purchase; because the engine
  decides entries before the end-of-session hook runs, entries resume no earlier than the next session.
- **Profitable exits** return to NORMAL (the restriction was already cleared at entry; the state log
  records these for confirmation).

### Session ordering (engine-fixed)

Within session i: (1) entry decision at the close if flat; (2) exit evaluation if a position was open;
(3) stop/high updates; (4) mark-to-market; (5) end-of-session hook (reset evaluation, state log). A losing
exit at session i therefore creates the restriction *after* the entry decision of session i (no entry can
occur on an exit session anyway) and the reset can clear it the same session if the close qualifies.

### Edge cases fixed in advance

- **Dual trigger (brief §2.D):** if a close satisfied both the lower-price trigger and the reset, the reset
  would take priority and no entry would occur that session. Arithmetically this cannot happen
  (`lastLossExitPrice ≲ 1.03 × entry ≤ ~0.93 × referenceHigh`, so the lower trigger sits well below the
  reset level); the run confirms **zero occurrences** across all 12 variant runs, and zero sessions where a
  reset pre-empted a same-session signal at all.
- **Insufficient history:** the rule needs only the frozen values and the current close; the 10% signal
  keeps the baseline's shorter-window behaviour at the start of each file. No fallback was ever needed.
- **No timeout or alternative reset** was added (brief §8): episodes may run to the end of the data and are
  reported as `unresolved_at_end`.

### Implementation

`strategies.py` subclasses the frozen `engine.Strategy` using only the documented hooks (`on_exit`,
`entry_allowed`, `on_session_end`). **The hooks were sufficient; no shared infrastructure was touched.**
Configs: `A_baseline`, `B_lower_3pct`, `C_lower_5pct`, `D_lower_8pct`, each run fresh per dataset, not
combined with any earlier experiment (SMA sizing, circuit breaker, protective stops, recovery confirmation,
staged entries).

## 2. Verification

`verify.py` (output archived in `results/verification.txt`) — **all 1,664 checks passed**:

1. **Baseline reproduction.** `A_baseline` trade files are byte-identical to the frozen
   `baseline/results/trades/*`, and net / max DD / interest / trade counts match
   `baseline/results/summary.json` exactly: VGT 2005–2015 $11,602 / $73,404; QQQ 1999–2015 −$2,886 /
   $149,561; VGT 2016–2026 $161,772 / $38,323; QQQ 2016–2026 $116,388 / $39,237.
2. **Independent replay.** Using only the raw price file, each variant's trade list and the two thresholds,
   the entire restriction history was re-derived and matched against the logs: every restricted entry is at
   or below its lower level and below its reset level; every reset close is at or above its reset level;
   every flat, unrestricted session with the 10% signal (and no same-session exit) contains an entry, so
   the rule is the *only* source of suppression; frozen values never change within an episode; spans are
   disjoint with no entry on an exit session.
3. **Spot checks** (full prices in `verification.txt`), e.g. QQQ C: losing exit 2001-09-21 at 23.2418
   (frozen reference high 44.0446 → lower level 22.0797, reset level 41.8424); restricted 188 sessions with
   152 blocked signal sessions; re-entry 2002-06-21 at 21.8956 = 5.8% below the loss exit. VGT C: losing
   exit 2020-03-16 at 23.1649 → lower level 22.0067; episode minimum close 22.2320 (1.0% above the
   trigger); resolved only by the 2020-05-29 recovery reset.

## 3. Standard metrics

Full per-dataset tables: `COMPARISON.md` §1. Headlines (net profit / max DD / profit-per-DD):

| Config | VGT 2005–2015 | QQQ 1999–2015 | VGT 2016–2026 | QQQ 2016–2026 |
|---|---:|---:|---:|---:|
| A baseline | 11,602 / 73,404 / 0.16 | −2,886 / 149,561 / −0.02 | 161,772 / 38,323 / 4.22 | 116,388 / 39,237 / 2.97 |
| B −3% | 26,384 / 54,279 / 0.49 | 40,258 / 91,469 / 0.44 | **182,094 / 28,687 / 6.35** | 132,242 / 23,564 / 5.61 |
| C −5% | 16,088 / 53,321 / 0.30 | **87,845 / 57,795 / 1.52** | 55,944 / 24,347 / 2.30 | 137,609 / 23,564 / 5.84 |
| D −8% | 6,557 / 49,103 / 0.13 | 22,008 / 49,587 / 0.44 | 22,062 / 24,347 / 0.91 | **151,945 / 23,564 / 6.45** |

Every configuration on every dataset: lower max drawdown, lower margin interest, fewer trades, smaller or
equal largest loss, and 18–49% of sessions invested vs the baseline's 57–68%. Realized vs unrealized at the
end: B holds the baseline's final open position on QQQ 1999–2015 (+$9,371 unrealized) and its own on
VGT 2016–2026 (+$17,884); C and D end every dataset flat; on VGT 2005–2015 all three variants end flat
inside a 9-session unresolved restriction (last losing exit 2015-09-24) while the baseline holds +$5,731
unrealized.

## 4. Matched-exposure comparison

Controls are complete baseline runs at a fixed size chosen so margin dollar-days match
(`metrics.matched_control`; `COMPARISON.md` §2). Because the restriction changes the trade sequence, every
experimental number is from the full backtest, not a proportional scaling.

| Dataset | B −3% Δprofit / ΔDD | C −5% Δprofit / ΔDD | D −8% Δprofit / ΔDD |
|---|---:|---:|---:|
| VGT 2005–2015 | +19,130 / **+8,383 worse** | +10,548 / **+18,273 worse** | +245 / +9,171 worse |
| QQQ 1999–2015 | +41,968 / +2,844 worse | **+89,173 / −11,047 better** | +22,794 / +8,866 worse |
| VGT 2016–2026 | +63,993 / +710 worse | **−19,550** / +6,463 worse | **−46,242** / +8,166 worse |
| QQQ 2016–2026 | +35,187 / −9,155 better | +44,812 / −7,719 better | +57,075 / −8,418 better |

Interpretation: the raw drawdown reductions in §3 are mostly **deleveraging** — a baseline scaled to the
same dollar-days usually has an equal or smaller drawdown. Only on the two QQQ datasets does the rule beat
its control on *both* profit and drawdown (C on 1999–2015; all three on 2016–2026). On VGT 2016–2026, C and
D are outright worse than simply trading the baseline smaller. So the improvement, where it exists, comes
from entry timing (documented next), not merely from less time on borrowed capital — but it does not exist
everywhere.

## 5. Bear markets (2000–2002, 2007–2009, 2022)

Window P&L / in-window drawdown / closed trades (losing) — full table in `COMPARISON.md` §3:

| Window | A | B −3% | C −5% | D −8% |
|---|---:|---:|---:|---:|
| QQQ 2000–2002 | −91,629 / 149,561 / 56 (36) | −11,471 / 61,251 / 42 (23) | **+13,619 / 56,284 / 30 (16)** | +24,328 / 49,587 / 22 (14) |
| QQQ 2007–2009 | +20,931 / 70,759 / 21 (15) | +45,281 / 44,706 / 10 (6) | **+60,884 / 32,982 / 9 (5)** | −9,231 / 33,280 / 8 (4) |
| VGT 2007–2009 | −38,496 / 73,404 / 23 (16) | −6,198 / 54,279 / 10 (5) | **−37 / 41,857 / 8 (5)** | −30,663 / 49,103 / 7 (4) |
| VGT 2022 | −23,643 / 34,856 / 13 (10) | −3,865 / 20,570 / 9 (7) | −35 / 19,288 / 8 (5) | +1,838 / 18,399 / 7 (4) |
| QQQ 2022 | −26,320 / 33,932 / 13 (10) | −9,942 / 21,397 / 9 (7) | −4,624 / 16,898 / 7 (6) | −6,733 / 9,566 / 4 (4) |

Per the brief's seven questions, taking QQQ 2000–2002 under C as the central case:

1. **Baseline losing re-entries:** 36 losing trades in the window, 46 "repeated losers" (a loser following
   a loser) across the full dataset, totalling −$256,807.
2. **Eliminated or delayed:** C cut the window to 16 losing trades; across the dataset it eliminated 22 of
   the 46 repeated losers (B: 18, D: 27), and the repeated-loser windows' P&L improved from −$256,807 to
   −$91,398 (+$165,409 — the single largest source of the rule's gains).
3. **Meaningfully lower replacement prices: yes.** Every one of C's 16 episodes in 2000–2002 resolved by a
   lower-price re-entry, at a median 7.2% below the loss exit and a median **12.2% below the losing trade's
   own entry price** (dataset-wide medians: B −4.3%/−9.3%, C −6.7%/−10.2%, D −9.5%/−14.1% vs loss
   exit / losing entry).
4. **Cumulative losses reduced: yes**, from −$91,629 to −$11,471 (B) / +$13,619 (C) / +$24,328 (D).
5. **Maximum drawdown improved: yes** in every window (table above), though §4 shows much of this is
   exposure, not selection.
6. **Restricted through most of the decline?** Partly. C spent 897 of its sessions restricted dataset-wide,
   the longest being 188 sessions (2001-09-21 → 2002-06-21, 273 calendar days, 152 blocked signal
   sessions) — through the post-9/11 bounce and the early-2002 slide. During cascades the restriction
   re-arms after each fresh loss at a *lower* frozen level, which is what keeps it binding all the way down.
7. **Did temporary recoveries reset the restriction and re-admit losing entries? Yes, regularly.** On
   QQQ 1999–2015, 6 of C's 10 resets (B: 7/10, D: 8/12) were followed immediately by a losing trade; on the
   newer datasets 1–5 of the resets were. The 95%-of-reference-high reset is strict enough that *within* a
   single cascade it essentially never fires (all 10 of C's QQQ resets occurred in episodes whose price
   never came close to the lower trigger) — the re-admitted losers come at bear-market *rallies* near the
   top of the decline and at regime transitions, not mid-cascade.

## 6. Recovery participation

Window P&L vs baseline (`COMPARISON.md` §4) and the per-trade matching (`results/matching/`,
`results/recovery/`):

| Recovery | A | B −3% | C −5% | D −8% |
|---|---:|---:|---:|---:|
| QQQ 2003 | +18,291 | 0 | −1,187 | 0 |
| QQQ 2009 | +66,522 | +65,938 | **+69,817** | **0** |
| VGT 2009 | +15,518 | +29,642 | **+33,093** | **0** |
| VGT 2020 | +48,081 | +55,455 | **+21** | +21 |
| QQQ 2020 | +63,718 | +63,172 | +63,172 | +63,172 |
| VGT 2023 | +44,468 | +18,901 | +295 | −503 |
| QQQ 2023 | +25,111 | +17,473 | +17,473 | +17,473 |
| VGT 2025 | +39,671 | +42,023 | +850 | +850 |
| QQQ 2025 | +19,964 | +26,779 | +26,779 | +26,779 |
| VGT 2026 | +29,821 | +51,712 | +36,423 | **−239** |
| QQQ 2026 | +32,918 | +32,918 | +32,918 | +32,918 |

The episode detail behind the decisive cases (all prices from `results/events/`):

- **March 2009 (the strategy's biggest trade).** QQQ baseline entered 2009-03-09 and made +$57,832. C's
  restriction had resolved earlier, so it took the *identical* trade; B was already holding a 2009-03-06
  entry (+$54,188 overlapping); **D was still restricted and blocked — it never participated in 2009 on
  either dataset**, foregoing +$57,832 (QQQ) and +$21,725 (VGT baseline trade). On VGT, B and C entered
  2–3 sessions before the baseline at lower prices and made *more* (+$29,642 / +$33,093 vs +$21,725).
- **April 2020 (VGT).** After the 2020-03-16 loss exit at 23.1649: B's trigger 22.4700 was hit at the
  2020-03-20 close (22.4320, near the exact bottom; bottom close 22.2320 on 03-23) → B rode the recovery
  (+$48k overlapping trade). C needed 22.0067 and D 21.3117; the minimum close was 22.2320 — **C missed by
  1.0%, D by 4.1%** — and both stayed restricted until the 2020-05-29 reset, by which time the 10% signal
  was gone. Baseline's +$50,533 trade: foregone entirely. On QQQ the preceding trade was profitable, so no
  restriction existed and all configs took the +$52,700 March 19 entry identically.
- **January 2023 (VGT).** C's restriction came from a **−$143** loss (exit 2023-01-03 at 39.5194, trigger
  37.5434); the January rally's minimum close was 38.1436 — missed by 1.6% — and the 2023-02-15 reset came
  after the +$28,006 baseline winner's entry signal had lapsed. B (restricted since 2022-11-03, trigger
  36.9151, minimum close 37.4855, 1.6% short, 43 blocked sessions) missed it the same way. All three
  configs missed VGT 2023-01-04; QQQ 2023 had no active restriction and was preserved.
- **April 2025 (VGT).** B re-entered 2025-04-16 (+$39,335); C and D were holding a divergent 2025-04-03
  position that exited 2025-04-21 at a loss, re-armed the restriction, and never re-qualified — they sat
  out a +$35,713 baseline trade (window diff −$40,503).
- **March 2026.** VGT: from the 2026-02-05 loss exit at 89.4832, B's trigger (86.7987) filled 2026-03-27 at
  85.1250 (+$34,067) and C's (85.0090) filled 2026-03-30 at 83.5875 — the exact bottom close — for
  +$36,662, **both beating the baseline's +$31,094**. D's trigger was 82.3245; the bottom close 83.5875
  missed it by **1.5%**, D's reset came 2026-04-14 after the signal lapsed, and its only later trade in the
  window lost −$239. QQQ: no restriction active; all configs identical to baseline (+$32,918 incl. the
  open trade).
- **2003 (QQQ).** The transition out of the 2000–2002 bear is where all three variants paid: after the last
  cascade losses, prices based sideways — never 3–8% lower, and 40%+ below the frozen reference highs — so
  the variants either sat out (B, D: $0) or re-entered once and lost (C: −$1,187) while the baseline
  collected +$18,291 including a +$18,419 March entry. The same pattern repeated at 2006-08 and 2010-08
  (baseline rebound winners of +$15–19k missed by all or most configs).

**Major profitable rebound entries (baseline winner ≥ $10k immediately after a loss) missed or delayed:**
B 15 missed + 3 delayed of 20 such trades across the four datasets; C 14 + 2; D 18 + 2. The brief's fear is
justified in the raw counts — but roughly half were *indirect* misses (the variant was already holding an
overlapping, often better-priced position — B: 10 of 15, C: 8 of 14, e.g. every 2020-10 entry; the rest
were direct blocks), so the time-window P&L
differences in the tables above are the honest measure: they range from strongly positive (QQQ-old C) to
strongly negative (VGT-new C/D).

## 7. State-machine behaviour

Chronological logs: `results/states/<dataset>__<config>.csv` — one row per transition, per NORMAL
entry/exit, and per restricted session, with previous/new state, reason, frozen loss-exit price and
reference high, both thresholds, the close, the 10%-signal flag and whether an entry executed. Episode
summaries: `results/events/`. Aggregates: `COMPARISON.md` §6.

- **Does the restriction get stuck?** It can be long but it always ends. Longest episodes: 188 sessions /
  273 days (QQQ C, 2001-09-21 → 2002-06-21, resolved by re-entry), 273 sessions / 395 days (QQQ D,
  resolved by reset), 152 sessions (VGT-old B). The only `unresolved_at_end` episodes are the trivial
  9-session tails on VGT 2005–2015 (the file ends 2015-10-07, nine sessions after a −$340 losing exit),
  which cost the variants the baseline's final +$5,731 open position. Dataset-wide time under restriction:
  9–18% of sessions (B) up to 12–31% (D).
- **Does the reset threshold become obsolete?** Yes, predictably, in every deep decline: the frozen
  reference high is set near the pre-cascade top, so after a 30–50% fall the 95% level is unreachable for
  the life of the episode (`results/events/` column `frozen_ref_high_vs_rolling_high_at_resolution`; in the
  2001–02 episode the reset level of 41.84 stood ~90% above the price at resolution, with QQQ in the low 20s).
  In those episodes the lower-price trigger is the only practical way out — which worked in every cascade
  (all QQQ 2000–02 episodes resolved by re-entry) but is exactly the mechanism that fails at V-bottoms
  (§6). Conversely, all of the resets that did fire occurred in episodes whose price **never** reached the
  lower trigger (10/10 for C on QQQ-old), i.e. the reset genuinely rescued the state machine from deadlock
  rather than short-circuiting the discount. Per the brief, no timeout or alternative reset was introduced;
  flagged in §10 instead.
- **Dual trigger / reset-priority events: zero everywhere** (see §1).

## 8. Dependence on a few trades

The aggregate results are dominated by a handful of episodes, all documented above:

- QQQ 1999–2015 C (+$90,731 vs baseline): ≈ +$165k from repeated-loser windows in/around 2000–2002 and
  2008, −$56k from five missed ≥$10k winners (2001-10-30, 2003-03-06 and 2006-08-04 the costly ones); keeping the
  2009-03-09 +$57,832 trade identically is the single largest difference from D (−$65,837 lower).
- VGT 2016–2026 C (−$105,828 vs baseline): four episodes — 2020-04 (−$50.5k), 2023-01 (−$28.0k), 2023-10
  (−$15.2k), 2025-04 (−$40.5k window diff) — more than explain the whole gap.
- B vs C on VGT 2016–2026 ($126k apart): almost entirely the 1.0% COVID-bottom miss plus 2025-04.
- D's old-dataset collapse: the single blocked 2009-03-09 QQQ entry is −$57.8k of D's −$65.8k gap to C.

Sub-2% price misses (1.0%, 1.5%, 1.6%) separate "captured the recovery at a better price than the
baseline" from "missed it entirely" in at least four episodes. This is the central robustness problem.

## 9. First-order selectivity (shadow analysis)

Replaying the rule on the baseline's own path (`results/shadow/`): of the baseline's post-loss entries, C
would block 30/34 (VGT-old), 62/70 (QQQ-old), 24/27 (VGT-new), 17/20 (QQQ-new). Blocked **dollar** P&L is
roughly symmetric — e.g. QQQ-old C blocks losers worth −$231k *and* winners worth +$220k — confirming that
the realized gains do not come from net-positive filtering of the baseline's trades, but from the *path*:
replacement entries at 4–14% lower prices and 20–73% less time on borrowed capital. That is also why the
matched-exposure control (§4), not the raw baseline, is the fair comparison.

## 10. Robustness, overfitting, and flags for later (not run)

- All results are exploratory, on data examined many times before; no threshold was tuned and no extra
  configurations were run. The threshold ranking flips across datasets (B, C, D each "win" somewhere), so
  **no configuration can be called optimal** — consistent with the brief's instruction not to conclude 5%
  is best even where it wins.
- Improvements rest on few episodes (§8) with knife-edge price sensitivity; a one-day execution difference
  or a 1–2% band shift reorders the configurations on two of four datasets.
- Older vs newer periods disagree: QQQ improves in both eras; VGT improves only in the old era for B/C and
  degrades badly in the new era for C/D.
- Flagged for a separately authorized study: (1) restriction severity scaled to loss size (a −$143 loss
  currently imposes the same restriction as a −$20k loss — the direct cause of the missed VGT 2023
  recovery); (2) the 3–5% threshold region, where both VGT outcomes flip; (3) the 0.95 reset fraction,
  whose frozen anchor goes stale in deep bears (§7); (4) an intraday-low-based trigger instead of the
  close-based one (three of the four decisive misses had intraday lows through the trigger level).

## 11. Answers to the six questions

1. **Does requiring a lower price after losing trades reduce cumulative bear-market losses?** Yes,
   decisively, in every bear window on every dataset (§5): 2000–2002 from −$91.6k to between −$11.5k and
   +$24.3k; VGT 2007–2009 from −$38.5k to ≈$0 (C); 2022 losses cut by 60–100%. The mechanism —
   progressively lower frozen re-entry levels during cascades — worked as designed.
2. **Does the recovery reset meaningfully improve the approach vs the risk of remaining restricted?** Yes
   as a safety valve: every reset that fired did so in an episode whose price never reached the lower
   trigger, and without it those episodes (and the whole strategy on trending-up markets) would deadlock —
   the 2015 tail shows the cost of even a 9-session unresolved restriction. But it is a blunt one: it
   re-admitted a losing next trade about half the time on the old datasets, and in deep bears its frozen
   anchor is unreachable, so it provides no path back during exactly the longest restrictions.
3. **Does the strategy preserve the large profitable recovery trades?** Partially, and this is the rule's
   weakest point. Preserved or improved: 2009 (B/C), VGT 2026 (B/C, at better prices than baseline), QQQ
   2020/2023/2025/2026 (all configs), VGT 2020/2025 (B only). Lost: QQQ 2003 (all), VGT 2023-01 (all), VGT
   2020+2025 (C/D), 2009 entirely (D), VGT 2026 (D). B is the only configuration that never missed a
   >$30k recovery, which is why it is the only one that beats the baseline on all four datasets.
4. **Is 3%, 5% or 8% consistently better?** No. B on the VGT datasets, C on QQQ 1999–2015, D on
   QQQ 2016–2026; D is catastrophic on both pre-2016 datasets (misses 2009 twice). The deeper pattern: the
   tighter threshold wins wherever V-shaped rebounds dominate; wider thresholds win only in long grinding
   cascades — and no fixed threshold knows which regime comes next.
5. **Does any configuration improve net profit and max drawdown vs its matched-exposure control?** On both
   QQQ datasets, yes: C on 1999–2015 (+$89,173 profit, −$11,047 drawdown) and B/C/D on 2016–2026. On both
   VGT datasets, no configuration improves both: drawdowns are higher than the deleveraged controls', and
   on VGT 2016–2026 C and D even earn less. So the honest claim is "better entry timing on QQQ; mostly
   deleveraging elsewhere."
6. **Are the results robust enough to justify further investigation?** The *mechanism* (bear-market loss
   suppression via progressively lower frozen re-entry levels, plus some reset) earns further work — the
   2000–2002 and 2007–2009 improvements are too large and too structural to dismiss, and B's across-the-
   board matched-control profit improvement is suggestive. The *specific parameterization* is not robust:
   outcomes hinge on sub-2% price misses at a handful of V-bottoms, and the threshold ranking is
   regime-dependent. Recommended next step, if authorized: the §10 flags, starting with loss-size-scaled
   severity — not threshold tuning on these same four files.

## 12. Reproducing

```
PY=<python with pandas+numpy (the frozen research venv)>
cd research/risk-management/lower-price-reentry
$PY run.py       # 16 runs + matched controls; writes results/ (summary.json, trades/, daily/,
                 #   states/, events/, matching/, shadow/, recovery/)
$PY verify.py    # baseline identity + independent state-machine replay; writes results/verification.txt
$PY tables.py    # regenerates COMPARISON.md from results/summary.json
```

Deliverable map (brief §12): REPORT.md (this file); COMPARISON.md; per-configuration state logs
`results/states/*.csv` (the STATE_TRANSITIONS equivalent, one file per dataset × config); trade-level CSVs
`results/trades/`; daily P&L CSVs `results/daily/`; implementation `strategies.py` + `run.py` + `verify.py`
+ `analysis.py` + `tables.py`.
