# First principles and hypotheses — Study 3, Stage 1 (VGT standalone momentum)

**Written 2026-10-28T16:35Z, before any momentum mechanism was run on market data.** Nothing in this document is
derived from a Study 3 backtest. What the author knew beforehand, and could not unlearn, is disclosed in §0. The
document is in three separate parts, in the order the brief requires: **5A** ideation (no ranking), **5B** critique and
grouping, **5C** selection of the prototype panel. Exact rule definitions and parameter boxes are in
`MECHANISM_CATALOG.json`; the selection's reasons are summarised in `MECHANISM_SELECTION.md`.

## 0. What was known before this study (design-bias disclosure)

- **The price history.** The author knows the broad VGT path for 2016–2023 from general knowledge and from earlier
  studies' reports: a strong secular advance (roughly 4–5× over the period), the Q4 2018 decline of about a quarter, the
  February–March 2020 crash of about a third and its V-shaped recovery, the steady 2021 advance, the 2022 bear market
  (roughly −30% over the year with several sharp bear-market rallies), and the 2023 recovery. The user's motivating
  example, the 2023–2024 advance of about 80%, is known as a fact; no 2024 bar is read in this study.
- **Prior studies' findings** (Studies 1–2, `SOURCE_AUDIT.md`): the D1 deep-dip book on VGT made no decision in 2017 or
  2023; the shared slot sat idle in calm advances (2017-06 → 2018-12, mid-2019, 2021, late 2023); D1-type signals on 61
  ETFs cluster in shocks; wider libraries and validation-based selection did not generalise better.
- **Consequence.** Any rule written here is written by someone who knows that trend-following on a tech ETF looked
  good in 2016–2021 and 2023 and bad in 2022. No retrospective test on 2016–2023 can be called independent. The folds in
  `PROTOCOL.md` are **retrospective, chronology-respecting method evaluations**, and the protocol freezes the entire
  selection procedure before any momentum outcome is computed, so that at least the *execution* is blind to each
  window even though the *design* is not.

## 1. Why D1 misses sustained advances — a mechanism diagnosis

D1 (`src/shared-margin-portfolio/strategy.ts`, VGT `primary`: X 21.6%, L 74, Y 0.3%, stop 7.3%, hold 8, buffer 2.9%,
P 9.0%, W 60) is a crash-rebound machine. Its structure, read from the code, explains each missed opportunity:

1. **Arming needs a deep prior drawdown.** The deep path arms only when a completed minute closes ≥ 21.6% below the
   highest session high of the previous 74 sessions. A calm advance never produces that; in VGT it happens only in
   crashes (late 2018, 2020, 2022). Hence no decision at all in 2017 and 2023.
2. **Recovery versus continuation is decided by an expiring window.** After a *profitable* exit, a continuation setup
   can arm within 60 sessions — but only on a 9% pullback from the post-exit high. In an orderly advance pullbacks are
   usually shallower than 9%, and after 60 sessions the window expires; follow-on legs are then unreachable until the
   next crash.
3. **A protective exit does not lead to timely re-entry.** Re-entry after a stop is the same dip machinery: the
   strategy must see a new deep or 9% decline. A trend that resumes from a 4% pause is not tradeable.
4. **Trailing-stop tightness trades retention against whipsaw.** D1's stop (7.3% below the post-entry high, updated
   once a day, eligible only when selling would realise a net profit) suits a rebound: it banks most of a sharp
   recovery. Applied to a slow trend, a tighter stop exits on ordinary noise (VGT's daily σ ≈ 1.3–2%), a wider one
   gives back months of progress at the turn. D1 avoids the dilemma by not holding trends at all.
5. **Financing must be earned.** At 11% simple interest on $100,000, every calendar day costs ≈ $30. A rebound earns
   its interest in days; a trend position held for a year needs > 11% gain just to break even, before friction. A
   momentum rule must earn its occupancy, not only its direction.
6. **A rise may be a bear-market rally.** Confirmation (waiting for more up-movement) filters some rallies but costs
   the earliest part of every real trend. D1 sidesteps this by buying weakness; a momentum rule cannot.
7. **Backtest optics.** A high return or low drawdown can come from low exposure (a strategy that is rarely invested
   has a small drawdown by construction), a few lucky trades (one crash rebound), regime dependence (2016–2021 tech),
   or unrealistic execution (same-minute high/low ordering, fills at the trigger price through a gap). The study
   measures exposure, interest, concentration and execution assumptions for every candidate.

## 2. Assumptions challenged

| Assumption | Challenge | How the study tests it |
|---|---|---|
| A valid entry needs a deep dip | Momentum entries need demonstrated strength, not weakness; the opposite of D1's arming | every entry family (5A) arms without any drawdown prerequisite |
| The original entry rule must also govern re-entry | Re-entry is a separate causal question: has the trend resumed? | re-entry rules R0–R5 against identical entries and exits (M2) |
| The market's turn must be forecast | Trend-following reacts to observed persistence; the cost is lag, not prediction error | first-entry delay and missed-gain ledgers (M4) |
| A trade lasts until one fixed trailing stop triggers | Price damage, trend damage, stalls (financing drag) and catastrophic gaps are different events | exit families X1–X8 against common entries (M2) |
| 100% of the slot is committed instantly | Exposure can follow evidence (tranches) or risk (volatility) | sizing ablation Z1–Z2 at matched capital (M2) |
| Decisions belong on the minute clock | Daily or weekly decisions may cut noise and churn | daily clock everywhere except the trailing-buy family; weekly-clock ablation |
| More search finds better rules | Study 1: it did not | capped Sobol budgets, neighbourhood-median selection, per-fold re-selection |
| A low drawdown means a safe rule | It may mean low exposure | exposure, borrowed dollar-days and capital-normalised figures for every candidate |

## 3. Part 5A — Independent ideation (no ranking)

Notation (all causal): session *s* is a regular NYSE session of the canonical VGT file; O, H, L, C are its official
open, high, low and close (close = closing print, else the last regular minute's close); every daily feature at *s*
uses sessions ≤ *s* only and is known at *s*'s close. *r_s* = ln(C_s / C_{s−1}). A decision made at the close of *s*
executes at the first regular-session trade of *s*+1. Intraday rules use completed minutes only.

### M01 — Peak proximity ("bull markets live near their highs"; the anti-D1)
- **Hypothesis.** Equity bull regimes are characterised by prices near their running high; a drawdown beyond a modest
  depth marks a transition to a high-volatility, negative-drift regime (leverage effect, forced de-risking). D1 buys
  when the drawdown from its 74-session high exceeds 21.6%; this rule is long only when the drawdown is small.
- **Signal.** dd_s = 1 − C_s / max(C over the last N sessions, N = 250).
- **States.** OUT → IN when dd_s ≤ d_in; IN → OUT when dd_s ≥ d_out (d_out > d_in: hysteresis).
- **Failure case.** A V-shaped crash: it exits after a d_out fall, re-enters only near the old high, and misses the
  rebound. A choppy top (late 2021): repeated entries near the high that fail.

### M02 — Financing-hurdle drift (rate of progress versus borrowing cost)
- **Hypothesis.** Time-series momentum: trailing medium-horizon returns predict next-period returns (slow diffusion of
  information, performance-chasing flows). A financed position is worth holding only if expected drift beats
  financing; use the realised trailing drift, with a margin, as a noisy forecast.
- **Signal.** A_N = (252 / N) · ln(C_s / C_{s−N}) (annualised trailing log return).
- **States.** IN when A_N ≥ a_in; OUT when A_N < a_out (a_out ≤ a_in; equality = single threshold).
- **Failure case.** Entry lags by roughly N/2 sessions; it exits late after peaks; with small N, sharp bear-market
  rallies clear the hurdle.

### M03 — Sequential drift-change detection (two-sided CUSUM)
- **Hypothesis.** A trend is a persistent shift in the mean of daily returns. Page's CUSUM detects a mean shift with
  minimal delay for a given false-alarm rate (Lorden, 1971): noise days cancel, a run of moderately positive days
  accumulates, one large up day alone does not suffice.
- **Signal.** z_s = r_s / σ_60(s−1) (volatility known before the day); U_s = max(0, U_{s−1} + z_s − κ);
  D_s = max(0, D_{s−1} − z_s − κ).
- **States.** OUT → IN when U_s ≥ h_in (then D := 0); IN → OUT when D_s ≥ h_out (then U := 0).
- **Failure case.** Several strong up days in a bear market trigger an entry; a slow, low-volatility decline stays
  inside the κ dead zone and exits late.

### M04 — Rising floor (higher lows confirmed causally)
- **Hypothesis.** In an uptrend, the points where sellers are exhausted (swing lows) rise because buyers step in
  earlier; a close beneath the latest confirmed swing low means the demand structure has failed.
- **Signal.** A causal zigzag on closes with reversal θ: a swing low is confirmed at the close that is θ above the
  lowest close since the last confirmed swing high, and vice versa. Floor F_s = latest confirmed swing low.
- **States.** Enter at the close that confirms a swing low higher than the previous confirmed swing low; structural
  exit at a close below F_s · (1 − b). The floor rises as new higher lows are confirmed.
- **Failure case.** Small θ produces noise pivots; large θ puts the floor far below the price, so exits give back a
  lot; a V-crash confirms no higher low until well into the rebound.

### M05 — Calm advance (volatility regime)
- **Hypothesis.** Volatility clusters; calm periods carry the best risk-adjusted drift, and crash regimes start with
  volatility expansion. Study 2 found the slot's idle capital concentrated in exactly these calm advances.
- **Signal.** σ_20 and σ_10 (annualised realised volatility of r) and the N-session return.
- **States.** IN when σ_20 ≤ v_in and C_s > C_{s−N}; OUT when σ_10 ≥ v_out or C_s < C_{s−N}.
- **Failure case.** Short volatility shocks that resolve quickly exit near the low; a slow, calm decline stays in until
  the drift turns negative.

### M06 — Breakout acceptance (persistence above a prior range)
- **Hypothesis.** A close above the prior N-session closing high reveals new demand, but many breakouts fail; a level
  the market holds for A sessions has absorbed the supply that sat there ("acceptance").
- **Signal.** Breakout at *b*: C_b > R = max(C_{b−N..b−1}). Accepted at *b*+A if every close from *b* to *b*+A is ≥ R.
- **Trigger.** Enter at the open after acceptance; a close below R before acceptance voids the breakout. A = 0 is the
  raw breakout (the conventional Donchian entry, kept as an ablation).
- **Failure case.** Acceptance costs entry price in fast moves; parabolic tops are accepted just before they reverse.

### M07 — Directional efficiency (signal-to-path ratio)
- **Hypothesis.** A trend driven by persistent order flow moves efficiently (net change large relative to path
  length); noise-dominated markets are inefficient.
- **Signal.** ER_N = (C_s − C_{s−N}) / Σ_{i=s−N+1..s} |C_i − C_{i−1}| ∈ [−1, 1] (signed).
- **States.** IN when ER_N ≥ e_in and A_N ≥ 11% (rules out efficient but drift-less, low-volatility drifts); OUT when
  ER_N ≤ e_out.
- **Failure case.** Smooth bear-market rallies are efficient; healthy but volatile advances are not.

### M08 — Compression, then upward expansion
- **Hypothesis.** A narrow range is equilibrium between buyers and sellers; the direction of the expansion that ends it
  reveals which side won, and volatility regimes persist.
- **Signal.** Box over sessions *s*−N … *s*−1: width W = (max H − min L) / min L.
- **Trigger.** Enter at the open after a close above the box top while W ≤ c. Structural exit: a close below the entry
  box's low (failed expansion).
- **Failure case.** False expansions; compression is rare in high-volatility regimes, so trades are few.

### M09 — Upward trailing buy from a causal low (brief A), and its breakout twin
- **Hypothesis.** A demonstrated rebound of Y from the lowest price since the strategy went flat shows that buyers
  have taken control locally; no prior deep decline is needed.
- **Signal (minute clock).** While flat, the running low is the lowest minute low since the flat state began; a
  completed minute closing ≥ low · (1 + Y) is the decision, filled at the next trade (D1's own confirmation and fill
  semantics). **Twin M09-B (upward breakout trailing buy):** a completed minute closing above the highest minute high
  since going flat. These are different price paths: M09 buys the first Y-bounce off any low, M09-B buys only a new
  high since the exit.
- **Failure case.** In a downtrend every Y-bounce triggers (falling-knife bounces); combined with a stop it churns.

### M10 — Shallow-pullback continuation inside an established advance (brief B)
- **Hypothesis.** Inside an established uptrend, short pullbacks are liquidity-driven (profit-taking, rebalancing)
  rather than information-driven and tend to resolve upward; buying the resumption gets a better price and a natural
  stop at the pullback low. The **uptrend prerequisite** distinguishes it from a small D1 dip.
- **Signal.** Uptrend: C_s ≥ (1 + u) · min(C over 126 sessions) and the 250-session closing high was set within the
  last 63 sessions. Pullback: a close ≥ p below the 20-session closing high within the last 10 sessions.
- **Trigger.** Resumption: C_s > H_{s−1} while uptrend and recent pullback hold. Structural exit: a close below the
  pullback's lowest close.
- **Failure case.** The pullback at a trend top becomes the decline; more parameters than most.

### M11 — Durable permission with a fast re-trigger (a two-speed campaign; brief K and J)
- **Hypothesis.** "This is a bull regime" is slow, durable information; "now is a good moment to hold" is fast. Separate
  a slow permission that expires only on explicit trend damage from a fast trigger that can re-enter after protective
  exits without a new dip.
- **States.** Permission ON at a new 250-session closing high; OFF when the drawdown from the highest close since ON
  reaches D. While ON and flat: enter on a close above the prior n sessions' highest close. While long: protective
  trailing stop, or permission OFF.
- **Failure case.** Permission stays ON through the first leg of a bear market (until a D drawdown), producing repeated
  failed re-entries in a topping process.

### M12 — Probationary entry with cheap invalidation
- **Hypothesis.** The confirmation dilemma (early = noisy, late = expensive) is resolved by entering early with a tight,
  cheap invalidation and granting a wide campaign stop only to positions that prove themselves; false starts cost
  about q plus friction, real trends get full participation from an early price.
- **States.** Probation: stop at entry · (1 − q) for up to P sessions. Promotion when C ≥ entry · (1 + g): wide trailing
  stop. A probation position that has not been promoted after P sessions is closed.
- **Failure case.** VGT's ordinary noise hits tight stops even in good trends; repeated probation losses in chop.

### M13 — Progressive capital commitment (brief H)
- **Hypothesis.** Commit capital in proportion to accumulated evidence: a third at the signal, a third after +g
  progress, a third after +2g. False starts are cheap, confirmed trends get the full slot.
- **Accounting.** Each tranche is a lot with its own fill, friction and interest clock; one stop for the position.
- **Failure case.** The average entry price rises; a reversal after full commitment loses on the largest exposure;
  at matched capital it may add nothing.

### M14 — Progress per unit of financing time (stall exit; brief I)
- **Hypothesis.** A financed position that is not progressing faster than its financing cost is a negative-carry bet;
  real trends progress quickly, and a stall announces the end of a trend before price damage does.
- **Rule.** At a close with at least T sessions held: exit (next open) if C_s < C_{s−T} · (1 + T · 0.11/252 + m).
- **Failure case.** Healthy consolidations inside long trends trigger exits, which then need a re-entry.

### M15 — Closing-strength persistence (close-location acceptance)
- **Hypothesis.** Closes persistently in the upper part of the daily range show demand into the close (institutional
  end-of-day flows), a measure of acceptance that does not depend on the size of the moves.
- **Signal.** CLV_s = (C_s − L_s) / (H_s − L_s) (0.5 if H = L); mean m_N over N sessions.
- **States.** IN when m_N ≥ c_in and C_s > C_{s−N}; OUT when m_N ≤ c_out.
- **Failure case.** The daily range position is noisy; bear-market rallies close strong for days.

### M16 — Intraday-versus-overnight drift (daytime demand persistence)
- **Hypothesis.** Overnight returns carry news and global flows, intraday returns US institutional order flow;
  persistently positive intraday returns indicate accumulation, persistently negative ones distribution.
- **Signal.** Σ over N sessions of ln(C_s / O_s); IN when positive and the N-session return is positive.
- **Failure case.** Equity returns are known to accrue largely overnight, so intraday sums can be negative even in
  bull markets; the causal story is weak for an ETF.

### M17 — Volume asymmetry (accumulation)
- **Hypothesis.** Up days on higher volume than down days indicate accumulation.
- **Signal.** Σ up-day volume / Σ down-day volume over N sessions ≥ v_in.
- **Failure case.** ETF volume is dominated by arbitrage, creation/redemption and hedging flows; capitulation volume
  reverses the sign at bottoms.

### M18 — Volatility-targeted continuous exposure (risk budget; a form of brief D)
- **Hypothesis.** Realised volatility forecasts near-term volatility, and crashes come with volatility spikes; scaling
  exposure by σ*/σ_20 keeps risk roughly constant and cuts crash exposure (Moreira–Muir).
- **Rule.** Exposure fraction min(1, σ*/σ_20), rebalanced when it drifts by more than a band.
- **Failure case.** The first leg of a crash is taken at full size; rebalancing costs friction; it pays interest
  through slow, low-volatility declines (much of 2022).

### M19 — Trend maturity versus exhaustion (entry filter)
- **Hypothesis.** A price far above its medium-term average is over-extended and mean-reverts in the short run; entries
  are better when the trend is young or after a reset.
- **Rule.** Allow entry only if C_s / mean(C over 50 sessions) − 1 ≤ x_max.
- **Failure case.** Strong trends stay extended (2020 H2, 2023), so the filter blocks the best periods.

### M20 — Weekly decision clock (adaptive decision frequency)
- **Hypothesis.** Deciding only at the last session of each week cuts noise-driven churn; the cost is delay.
  Protective stops remain active intraday.
- **Failure case.** Slower exits in crashes (limited by the protective stop), later entries.

## 4. Part 5B — Critique and grouping (written after 5A, before any result)

### 4.1 Critique

| ID | Params | 1-minute noise | Financing burden | Bear-market rallies | Enters persistent uptrends | Stop semantics | Testability |
|---|---:|---|---|---|---|---|---|
| M01 | 2 | none (daily) | high: long most of a bull market | resistant (needs price near the 250-session high) | yes, early in a regime only at the old high | own OUT is price-based; protective stop needed for gaps | high |
| M02 | 3 | none | high in trends | vulnerable at small N | yes, with lag | own OUT on drift; protective stop needed | high |
| M03 | 3 | none | medium | vulnerable (strong up runs) | yes, fast | own OUT is a down-CUSUM | high |
| M04 | 2 | none | medium | partly resistant (needs a *higher* low) | yes after the first higher low | structural floor + emergency stop | high |
| M05 | 3 | none | medium | resistant (rallies are volatile) | yes in calm trends; misses volatile recoveries | volatility OUT; protective stop | high |
| M06 | 2 | none | medium | resistant (needs an N-session high) | yes, at new highs | needs an exit rule (template) | high |
| M07 | 3 | none | medium | vulnerable (smooth rallies) | yes in smooth trends | own OUT on efficiency | high; close to M02 |
| M08 | 2 | none | low (few trades) | resistant | rarely (needs compression) | box-low structural exit | high; few events |
| M09 | 1 | **high** (minute trigger) | depends on exit | **vulnerable** (every bounce) | yes | needs an exit rule | high |
| M09-B | 0–1 | high | depends on exit | resistant (needs a new high since exit) | yes | needs an exit rule | high |
| M10 | 2 (+3 fixed) | none | low–medium | partly resistant | yes after pullbacks | pullback-low structural exit | medium (complex) |
| M11 | 2 (+exit) | none | medium | vulnerable early in a decline (permission persists) | yes, renewable | trailing + permission OFF | high |
| M12 | 3 | medium | low | cheap failures by design | yes | two-phase stop | high (exit family) |
| M13 | 1–2 | none | lower average exposure | cheap failures | yes, scaled | position-level stop | high (sizing) |
| M14 | 2 | none | **reduces** it | exits stalls | n/a (exit) | progress exit | high (exit family) |
| M15 | 3 | none (daily) | medium | vulnerable | yes | own OUT on CLV | high; weak prior |
| M16 | 2 | none | medium | unclear | unclear | — | high; **weak causal basis** |
| M17 | 2 | none | medium | unclear | unclear | — | medium; **confounded** by ETF arbitrage volume |
| M18 | 2 | none | **continuous leverage** | takes the first leg | yes (always long) | none; sizing only | high |
| M19 | 1 | none | — | — | blocks extended trends | filter | modifier only |
| M20 | 0 | lower | — | — | slower | — | modifier only |

### 4.2 Grouping of near-equivalent variants (they are not separate discoveries)

- **G1 price level versus a reference:** M01 (peak proximity), the conventional 200-session moving-average filter and
  the Donchian breakout (controls). M01 with d_in = 0 enters only at a new closing high, close to the Donchian entry.
- **G2 trailing drift:** M02 and M07 (M07's denominator is path length, so it is roughly M02 normalised by volatility);
  the 12-month time-series momentum control belongs here too. M02 and M07 count as **one** family.
- **G3 sequential evidence:** M03 (CUSUM). Related to an exponentially weighted mean of normalised returns, but its
  reset and asymmetric thresholds make it a different filter from G2's fixed window.
- **G4 price structure / breakouts:** M04 (rising floor), M06 (acceptance), M08 (compression → expansion), M10
  (pullback continuation). Distinct events (pivot confirmation, persistence above a level, range expansion, resumption
  after a pullback), so they count separately, with the caveat that M06 and M08 both buy above a prior range.
- **G5 volatility regime:** M05 (entry family), M18 (sizing).
- **G6 order-flow proxies:** M15, M16, M17.
- **G7 intraday rebound:** M09, M09-B.
- **G8 campaign structure:** M11 (permission + trigger); re-entry rules R0–R5 belong here.
- **Exit, sizing and clock modifiers (not entry families):** M12 (probation, exit X5b), M13 (sizing Z1), M14 (exit X6),
  M18 (sizing Z2), M19 (filter), M20 (clock).

### 4.3 Is the first entry or the re-entry the problem?

D1's diagnosis (§1, items 2–3) says the binding constraint is re-entry: D1 can enter a rebound but cannot rejoin a
continuing advance. A momentum rule has the opposite risk: entering is easy (any strength), but after a protective
exit it either re-enters immediately (churn: the condition is still true) or waits for a full regime reset (misses the
next leg). The two effects are separated experimentally by holding entry and exit fixed and varying only the re-entry
rule (R0–R5), and by splitting every champion's P&L into first entries and re-entries.

## 5. Part 5C — Mechanism selection (predeclared before any result)

### 5.1 Entry prototype panel (12 entries, 9 distinct families)

| Panel ID | Mechanism | Group | Type | Own OUT / structural exit |
|---|---|---|---|---|
| E01 PP | M01 peak proximity | G1 | level (hysteretic) | dd ≥ d_out |
| E02 HD | M02 financing-hurdle drift | G2 | level (hysteretic) | A_N < a_out |
| E03 ER | M07 directional efficiency | G2 (variant of E02) | level (hysteretic) | ER ≤ e_out |
| E04 CU | M03 CUSUM | G3 | level (sequential) | down-CUSUM ≥ h_out |
| E05 RF | M04 rising floor | G4 | event | close < floor · (1 − b) |
| E06 CV | M05 calm advance | G5 | level | σ_10 ≥ v_out or N-return < 0 |
| E07 BA | M06 breakout acceptance | G4 | event | close < lowest close of prior 20 sessions |
| E08 CE | M08 compression → expansion | G4 | event | close < entry box low |
| E09 TB | M09 upward trailing buy (minute) | G7 | intraday event | close < lowest close of prior 20 sessions |
| E10 TH | M09-B breakout trailing buy (minute) | G7 (variant of E09) | intraday event | same |
| E11 DP | M11 durable permission + fast trigger | G8 | campaign | permission OFF |
| E12 PC | M10 pullback continuation | G4 | event | close < pullback low |

Counting variants once: **ten causally distinct entry rules** (E01, E02/E03, E04, E05, E06, E07, E08, E09/E10, E11,
E12) in **seven groups** (G1 E01; G2 E02/E03; G3 E04; G4 E05, E07, E08, E12; G5 E06; G7 E09/E10; G8 E11) — above the
brief's minimum of six distinct entry families on either count.

**Campaign state (used by re-entry).** After a protective (price) exit the position is flat but the campaign may still
be alive: for a level family while its state stays IN, for an event family until its own OUT fires. A fresh signal
(a level family's OUT → IN transition; an event family's new trigger) always permits entry; the re-entry rules of
§5.4 apply only while the campaign is alive. Minute-clock families (E09/E10) start their running reference at the
first session after the exit. At most one entry per session, and never in a session that had an exit.

### 5.2 Excluded from the panel, with reasons

- **M15 closing strength:** kept out of the primary panel because its causal prior is weakest among the daily rules
  and its signal is the noisiest; it is run once at its default setting as a **descriptive exploratory prototype**
  (`X-CS`) so that its result is reported, but it cannot enter the search or the selection.
- **M16 intraday drift:** excluded — the documented overnight-return effect contradicts its premise for equities, so a
  positive backtest would most likely be data-mining.
- **M17 volume asymmetry:** excluded — ETF volume reflects arbitrage and creation/redemption more than end-investor
  accumulation, and the canonical minute volume has no adjustment for those flows.
- **M18 volatility targeting:** not an entry family (always long); tested as **sizing Z2** on a common entry.
- **M12, M14:** exit families X5b and X6. **M13:** sizing Z1. **M19, M20:** modifiers, run as ablations A1, A2 on E02.
- **Cross-asset confirmation (e.g. a broad-market trend filter):** excluded by scope — VGT data only (brief §3).

### 5.3 Controls (conventional, predeclared, never optimised)

C-SMA (close above/below the 200-session simple moving average, next-open execution); C-DON (Donchian: close above the
prior 55-session closing high, exit on a close below the prior 20-session lowest close); C-TSM (12-month time-series
momentum, decided at each month's last session: long if C_s > C_{s−250}); C-AL (always long: one $100,000 lot bought at
the first eligible session and held); C-ALR (always long, re-sized to $100,000 at the first session of each month);
C-IDLE (no trades); and the registered **VGT D1 primary** (context only, frozen engine). Controls carry no protective
stops, so they show the raw signal.

### 5.4 Exit families and re-entry rules (M2)

- **X1** hard stop h below the fill + fixed trailing stop t below the highest close since entry (the common exit CX1).
- **X2** volatility-scaled trailing: highest close − k·ATR_20, distance clamped to [4%, 15%]; + hard stop.
- **X3** structural: rising-floor break (θ = 5%) with a separate emergency hard stop.
- **X4** two-layer: an always-active catastrophic stop 15% below the highest close, plus a slower normal exit (close
  below the prior 50 sessions' lowest close).
- **X5a** profit-stage schedule (stop to break-even after +4%, trail 8% after +10%, trail 5% after +25%); **X5b**
  probation (M12).
- **X6** time/progress: X6a fixed maximum hold; X6b stall exit (M14); X6c indefinite (X1 without time exit).
- **X7** renewable campaign: X1 with re-entry rules R0–R5.
- **X8** price damage (trailing) versus trend damage (20-session low close): price only, trend only, either (OR), both
  (AND).
- **Re-entry after a protective exit while the entry condition still holds:** R0 immediate (next close's condition),
  R1 fresh signal (the condition must lapse and re-qualify), R2 fixed 10-session cool-down, R3 reclaim (a close above the
  highest close of the stopped trade), R4 pullback recovery (a close recovering half of the trade's high-to-low
  pullback), R5 none (until the family's own OUT has fired). Exits by the family's own OUT always require a fresh
  signal.
- **CX2** (second common exit): the trend-damage exit (close below the prior 20 sessions' lowest close) with a
  catastrophic stop 15% below the highest close.

### 5.5 The single search template (M3), fixed now

Each family's search box is its own parameters plus a hard stop h ∈ [3%, 15%] and a trailing stop t ∈ [4%, 30%] (from
the highest close since entry), with the family's own OUT always active and re-entry R3-or-fresh (whichever comes
first). This one template contains X1 and X8's OR combination and the K-style re-entry; M2's other exits and
re-entries are **diagnostic** and cannot change the primary selection (they would require a separately labelled
amendment and are then exploratory).

### 5.6 Compute feasibility (planned)

A daily-clock family evaluates in milliseconds on 2,012 sessions (one minute scan only in sessions whose low reaches
a resting stop); the minute-clock family scans flat sessions. Planned budget (final numbers frozen in `PROTOCOL.md`
after a synthetic-data timing run): 1,024 global Sobol points + 128 local refinements + 16 × (2d + 1) neighbourhood
points per family and history, for up to 11 families and 5 histories (four folds and the full-history exploratory
reference) — about 70,000 evaluations, minutes of compute.

## 6. Corrections after methodology review 1 (appended 2026-10-28, before any result; nothing above was rewritten)

- **§5.6 budget.** The planned count is 1,024 + 128 + 32d + 16 = 1,168 + 32d evaluations per family and history (the
  shortlisted centres are not re-evaluated), i.e. up to 15,616 per history and 78,080 over five histories if all twelve
  families pass M1, plus at most ~70 panel runs per history. The frozen caps are 16,000 per history and 80,000 in total
  (`PROTOCOL.md` §8); a history whose planned count would exceed them refuses to start.
- **§4.2/§5.1 distinctness.** E01 at d_in = 0, E07 at A = 0, E11's permission and trigger, and C-DON are all rules about
  N-session highs; E02 at a_in = a_gap = 0 is close to C-TSM. Exits X1 = CX1 = X6c = X8P and X8T = CX2 are one exit
  each. The counts in §5.1 (ten distinct rules, seven groups) are of *rules as defined*, and these overlaps mean the
  effective diversity is smaller; `MECHANISM_SELECTION.md` carries the A–K coverage table.
- **M09/E10.** The reference of the minute rules now accumulates from the exit minute (E10's from the exited trade's
  high), so E10 buys only a genuine new high since the exit (it was otherwise near "always long with stops").
- **Superseded sentences (re-review 2, finding 11; precedence: catalog > protocol > matrix > this narrative).**
  §5.1 "A fresh signal … always permits entry" — R5 admits nothing while the campaign is alive. §5.1 "Minute-clock
  families start their running reference at the first session after the exit" — the reference accumulates from the
  exit minute and triggers from the next session. §5.4 R1 "the condition must lapse and re-qualify" — for a level
  family the lapse may happen while long (catalog `levelFresh`). §5.3 C-TSM "decided at each month's last session" —
  decided at the close of each month's first session. §5.4 X2 "+ hard stop" — the hard stop is 8% below the raw fill.
- **Default trigger rates (synthetic, `audit/trigger-rates-synthetic.txt`, before any result).** At TPL defaults on the
  four synthetic walks, E09 enters about 9 times a year with exposure 0.75 — close to "always long with stops" — while
  the other families enter 1.3–4.8 times a year with exposure 0.16–0.44 (E10 1.9 and 0.16: no longer degenerate). The
  exposure-matched test E of the rubric is the guard against rewarding E09-like exposure.
