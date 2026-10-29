# PROTOCOL — Study 3 Stage 1b `study3b-vgt-momentum-exits-exposure-chronology-v1`

**Version 1.0 (draft for independent methodology review).** Binding only once the `freeze-protocol` stage records the
sha256 of this file, `EXPERIMENT_MATRIX.json`, the brief and the review-disposition files in `PROTOCOL_FREEZE.json`.
Precedence where frozen texts differ: this protocol > `EXPERIMENT_MATRIX.json` > report narrative. No Stage 1b
mechanism has been run on market data before that freeze. Afterwards, changes are append-only amendments
(`AMENDMENTS.md`, `results/amendments.jsonl`); anything they introduce after outcomes are seen is exploratory.

## 1. Question, scope, evidence level, design-bias register

- **Question (brief §1).** Can a causally executable, standalone VGT long-momentum strategy — with better-aligned
  entry, exit, re-entry and optional position-sizing rules — earn substantial net returns after 11% simple margin
  interest and trading costs, with a historical minute drawdown within the $35,000 research reference and more
  reliable chronological behaviour than the frozen Stage 1 procedure?
- **Scope.** VGT only; one $100,000 borrowed research slot; one standalone book. No D1, B4, B5 or pooled run; no change
  to any registered strategy, phenotype, allocator default, config, data file, earlier study or Stage 1 record.
  Stage 1 (`research/study3-vgt-momentum/`, `src/study3-vgt-momentum/`) is read-only: its code may be imported, its
  sealed records read; nothing of it is rewritten or re-hashed.
- **Evidence level.** 2016–2023 was inspected by earlier studies and is known to the designer. Fold replays are
  **retrospective, chronology-respecting evaluations of a frozen procedure**: the code is blind to each evaluation
  window, the design is not. The full-history run (H, 2017–2023) is in-sample description. Four annual windows are
  four dependent regimes; no significance is claimed. 2020–2023 is never called out-of-sample.
- **Design-bias register (disclosed, not neutralised).** (a) Every Stage 1 outcome (fold picks, the 2022 E04 lot,
  E06/E05/E03 references, X2/X3 descriptives, re-entry harm in 2022) was known when this protocol was written and
  shaped the hypotheses, the exit families and the pairing set. (b) The primary selection objective (return over
  drawdown, §7.5) was chosen knowing that Stage 1's net-maximising selection carried the most exposed rule into 2022.
  (c) The sizing overlays (§4.4) exist because Stage 1 found exposure drift of a 2020 lot. (d) Parameter boxes and
  defaults use general knowledge of VGT's ~1.5–2% daily volatility and its 2018, 2020 and 2022 declines. (e) The fold
  layout (three advancing years, one declining) is Stage 1's, known to the designer.

## 2. Data and doors

- **Input.** `data/VGT/data.csv` through the shared loader only (`src/lib/evaluation.ts loadDatasetSessions`, partition
  `training`, access `optimization`), with an explicit end date ≤ **2023-12-29** (code refuses later ends before any
  read). The loader parses every row of the file to check order and hashes the whole file, but keeps no tick after
  the requested end's UTC day + 2; Stage 1b additionally asserts that the loaded dataset's last session ≤ the request
  and every retained bar time < 2023-12-30T00:00Z. **No Stage 1b computation receives any bar dated 2024-01-01 or
  later**; 2024-01-02 → 2025-12-31 (future validation) and 2026 (final holdout) are not loaded by any candidate,
  selector, benchmark, control or descriptive run.
- **Doors per stage.** A history's development stage loads data through its development end only (A 2019-12-31, B
  2020-12-31, C 2021-12-31, D 2022-12-30, H 2023-12-29). The evaluation stage loads through 2023-12-29 and refuses to
  run unless develop-A..D are sealed and verify. Repair (§5.5) and diagnostics load through 2023-12-29.
- **Calendar.** New York session dates; early closes and missing minutes as in the data (never imputed); recorded splits
  forward-adjusted (none in 2016–2023 for VGT). File sha256 and loaded-bar sha256 in every record.
- **Accounting basis.** Price-only for every candidate and control (Stage 1 convention). Distributions
  (`config/market-events/distributions.csv`, VGT ex-dates ≤ 2023-12-29) are a separate ledger: shares held at the close
  before each ex-date × amount, reported for the executable paths, the H pick and the passive controls alike; never in
  a decision or a criterion.

## 3. Execution and accounting (identical for candidates and controls)

### 3.1 Clock, fills, friction (Stage 1 §3, unchanged)

- Daily rules decide at a session's close from sessions ≤ s and execute at the next session's opening trade (first
  regular minute's open); with a delay of k minutes, at the first trade at or after open + k. Minute rules (E09/E10)
  decide at a completed minute (decision time = bar start + 60 s) and fill at D1's `firstTradeAfterDecision`
  (the next minute's open; the closing print for a decision before the close; else the next session's opening trade).
  First decision close **2017-01-03** for full runs; lookbacks ≤ 250 sessions from 2016-01-04. No same-close fills.
- Buy at raw × (1 + entry slippage) × (1 + bps/10⁴); sell at raw × (1 − stop slippage, stop fills only) ×
  (1 − bps/10⁴). Baseline **5 bps per side**, no slippage.
- **Resting stop.** One sell-stop level per session: the maximum of the configuration's active stop components (§4.2),
  computed at each close for the next session, and at the fill for the fill session from information up to the
  previous close plus the fill price; **never lowered** (level_{s+1} = max(level_s, components at s)). Scanning minutes
  in time order from the fill bar (bar 0 for a carried position), the first minute whose open ≤ level exits at that
  open (a **gap stop** at bar 0), otherwise the first whose low ≤ level exits at the level. The closing print never
  triggers a stop. A close-decided exit executing at an opening trade ≤ the level is recorded as a gap stop. No fill
  at a stop price better than the bar's open is ever synthesised after an opening gap through the stop.
- **Same-session order.** (1) at the opening trade (+ delay): a pending close-decided exit or transition (§5), else the
  gap check of the resting stop; then a pending trim (§4.4) if still long; then a pending entry or conversion;
  (2) the minute loop: resting stop, the minute entry rule, minute marks; (3) at the close: features, Hc/Hh, profit
  marks, exit decisions, campaign state, trim decisions, entry decisions, the next stop level; (4) daily marks. **At
  most one entry per session and none in a session that had an exit**; a close that yields both an exit and an entry
  executes only the exit. Trims are not entries.

### 3.2 The self-financing account

State at any time: cash K (starts at 0), shares S ≥ 0, loan principal L ≥ 0, interest accrued since the current loan
segment began; Hc (highest held close, starting at the raw first fill), Hh (highest held minute high from the fill
minute, starting at the raw first fill), E (raw first fill).

- **Entry.** Borrow B₀ = $100,000 (L := B₀), buy S = B₀ / buy price. K unchanged.
- **Interest** (simple, 365-day, **11%**): accrues on L over calendar days between session dates (Stage 1's
  principal × rate × (Δ sTime) / (365 × 86,400 s)); the loan is split into segments at each change of L; accrued
  interest I = Σ segments L_seg × rate × days_seg / 365 (no interest on interest; same-session round trips pay none).
- **Trim** (Z1/Z2 only): sell q shares at the sell price; proceeds P = q × sell price first repay principal
  (L := L − min(L, P)), the remainder goes to K. Accrued interest is not settled early (it is a liability that bears
  no interest). Interest falls only because L falls. Cash earns 0% (conservative; disclosed).
- **Exit.** Sell all S; proceeds repay L and I; the residual (possibly negative) goes to K. A trade's lifetime net =
  Σ all its sale proceeds (trims + final) − B₀ − Σ its interest; K after the exit = K before the trade + its net.
- **Marks.** mark = K + S × p − L − I (p = a minute close or the session close); liquidation mark = the same with
  S × p × (1 − bps/10⁴). Under Z0 this is exactly Stage 1's realised + shares × price − principal − interest.
- **Identities checked on every sealed ledger:** (i) K_end = Σ closed-trade nets (+ the open trade's realised trim
  cash beyond principal); (ii) per trade, Σ proceeds − B₀ − interest = net and price gain − friction − interest = net,
  where price gain = Σ q_i × (raw_i − E_cost basis) by share; (iii) L never increases except at an entry or a
  conversion, never exceeds B₀, and repayments equal min(L, P) per trim; (iv) interest recomputed from the loan
  segments equals the booked interest; (v) the end liquidation mark = Σ window increments.
- **Research-slot equity.** The slot has no own capital: "equity" is the cumulative P&L mark. Drawdowns are reported in
  dollars and as % of B₀ (Stage 1 convention), and additionally as % of (B₀ + the peak mark) ("notional account at
  peak") and as % of the peak gross position value; a mark decline is never called a loss of original principal.

### 3.3 Drawdowns, exposure, ledgers

- **Minute drawdown:** the frozen `Tracker.updateStrict` (imported from `src/multi-etf-allocator/engine.ts`) over marks
  at every minute close while long, at each fill and at each session close (minute closes, not lows; no exit friction).
  **Daily drawdown:** over session-close marks. Window drawdowns restart the peak at the window's boundary mark; chained
  paths carry the peak.
- **Exposure:** per session close, gross market value G_s = S × C_s and loan L_s. Reported per run and window:
  time-weighted average gross exposure Ḡ = Σ_s G_s × days(s → s+1) / calendar days; peak G; notional dollar-days
  Σ G_s × days; borrowed-principal dollar-days Σ L_s × days; share of sessions long; loan-to-value L/G; interest paid;
  net per $1M notional dollar-days. The **market-value exposure fraction** f_MV = Ḡ / B₀.
- **Per trade:** first/re-entry kind, rule, fills, exit reason and stop component, shares, trims, price gain, friction,
  interest, lifetime net, sessions and days held, MAE/MFE (minute lows/highs), peak open profit (at closes) and
  giveback = peak open profit − final net, peak gross value, Hc at exit.
- **Window decomposition** of a window (b, e] for any run: increments of lots open at b (carried: pre-window unrealised
  gain at b's liquidation mark vs entry, window increment), lots entered inside the window (new positions), interest
  and friction inside the window.

## 4. Mechanism catalog

### 4.1 Entries (Stage 1 `MECHANISM_CATALOG.json` v1.1 definitions, imported from `src/study3-vgt-momentum/signals.ts`)

Panel (verified IDs): **E02** high drift (level), **E03** directional efficiency (level), **E05** rising floor (event;
own OUT: close below latest confirmed swing low × (1 − b)), **E06** calm advance (level), **E07** breakout acceptance
(event), **E09** upward trailing-buy (intraday, lowest-low reference), **E11** drawdown permission / renewable
campaign (event; own OUT: permission OFF), and the conventional control **C-SMA** (close vs 200-session SMA, level)
used as an entry. Each entry's box, quantum and default are Stage 1's. Own OUT, fresh signals and campaign semantics
are Stage 1's (a level family's fresh signal is a flat close with state IN while no campaign is alive; an own-OUT
condition seen at a close while long ends the campaign at the exit) except under RPM (§4.3).

### 4.2 Exit families (all prices raw; every family is paired freely with any entry)

Notation: E raw first fill; Hc highest held close (incl. the current close); Hh highest held minute high (from the fill
minute through the current close); S shares; L loan; I accrued interest; P_s = trimCash + S × C_s − L − I_s the
position's open profit at a close (trimCash = trim proceeds beyond principal); P* = max P over held closes. "Next open"
= a close-decided exit. Every family has a binary **own** (1 = also exit at the next open on the entry's own OUT at a
close), except XO (own = 1 by definition) and the fixed controls. Percent quantum 0.001, dollar quantum $500, integers 1.

| ID | Family (brief §5 item) | Components | Box (default) |
|---|---|---|---|
| **XF** | fixed-price hard + trailing (1) | hard E(1−h); trail R(1−t), R = Hc (ref 0) or Hh (ref 1) | h 0.02–0.20 (0.08); t 0.03–0.35 (0.10); ref {0,1} (0); own (1) |
| XF-T | XF, tight box (pairings P03, P07) | as XF | t 0.03–0.12 (0.08); else as XF |
| **XV** | volatility-scaled trail (2) | hard E(1−h); vol level Hc(1 − clamp(k·ATR_n/Hc, dmin, dmin+dgap)), ratcheted (never lowered, so crisis vol expansion cannot widen it) | k 1.0–8.0 q0.1 (3.0); n 5–60 (20); dmin 0.02–0.10 (0.04); dgap 0.02–0.30 (0.11); h 0.03–0.20 (0.08); own (0) |
| **XS** | rising floor / structural (3) | next open when C < F(1−b), F = latest confirmed swing low of the causal close zigzag with reversal θ (E05's floor, position-independent); emergency hard E(1−h) | θ 0.02–0.15 (0.05); b 0–0.03 (0.005); h 0.03–0.20 (0.10); own (0) |
| **XT** | two-layer protective (4) | catastrophic hard E(1−h); trend: next open when C < min(C_{s−N..s−1}); ratchet (rat = 1): once Hc ≥ E(1+g), trail Hc(1−t2) | h 0.05–0.25 (0.15); N 5–120 (50); g 0.03–0.60 (0.20); t2 0.03–0.25 (0.10); rat {0,1} (1); own (0) |
| **XRP** | price profit retention (5) | hard E(1−h); once Hc ≥ E(1+a): E + ρ(Hc − E) | h 0.03–0.20 (0.08); a 0.03–0.60 (0.15); ρ 0.20–0.90 q0.01 (0.50); own (0) |
| **XRD** | dollar-equity giveback (5) | hard E(1−h); once P* ≥ A: level (P* − G − trimCash + L + I_s)/S (the price at which P falls G below P*) | h 0.03–0.20 (0.08); A $2,000–$80,000 ($20,000); G $5,000–$60,000 ($15,000); own (0) |
| **XD** | price damage × trend damage (6) | price damage D_p: C ≤ Hc(1−p); trend damage D_t: C < min(C_{s−N..s−1}); next open on D_p OR D_t (mode 0), D_p AND D_t (mode 1), or AND while C > SMA200 else OR (mode 2); resting catastrophic Hc(1−cat) | p 0.03–0.25 (0.10); N 5–120 (20); mode {0,1,2} (1); cat 0.08–0.30 (0.15); own (0) |
| **XP** | financing-aware stall (7) | hard E(1−h); next open when sessions held − 1 ≥ T and C_s < C_{s−T}(1 + rate·T/252 + m) and C_s ≤ Hc(1−d) (a stall away from the high; a consolidation within d of Hc is tolerated); rate = the run's interest rate | T 5–120 (20); m −0.05–0.05 (0.01); d 0–0.10 (0); h 0.03–0.20 (0.08); own (0) |
| **XO** | own-OUT / hysteretic (8) | next open when own OUT holds at c consecutive closes; resting catastrophic Hc(1−cat) | cat 0.08–0.35 (0.15); c 1–5 (1) |
| **XE** | **invented**: exposure-scaled trail (9) | hard E(1−h); trail Hc(1 − t_eff), t_eff = clamp(t0 · (S·Hc/B₀)^(−γ), tmin, t0), ratcheted | t0 0.06–0.35 (0.20); γ 0–2 q0.01 (1.0); tmin 0.02–0.10 (0.05); h 0.03–0.20 (0.08); own (0) |
| XM | fixed max hold — negative control (7) | next open at the close of the M-th session held; hard E(1−0.08) | M ∈ {20, 60, 120, 250}; not optimised |
| B-D1T | D1-magnitude immediate trail — benchmark | XF with h = t = 0.073, ref 1, own 0 | fixed |
| B-D1N | D1-style profit-conditional trail — benchmark only | trail Hh(1 − 0.073) active only when that level ≥ the break-even price (E × (1 + bps)/(1 − bps) + accrued interest per share at the close); own 1; no other stop | fixed |

- **XE rationale (written before any XE run).** Under fixed shares a lot's dollar risk per 1% move grows with its
  market value; a constant percentage trail lets the dollar giveback grow with appreciation. XE tightens the trail as
  exposure grows (γ = 0: plain trail; γ = 1: roughly a constant-dollar trail from the peak value). It is the opposite
  of XRP, whose distance from Hc widens with the gain. Overlap disclosed: at γ = 1 and A = 0 it approximates XRD.
- **Stage 1 equivalences (parity anchors):** Stage 1 TPL(h, t) = XF(h, t, ref 0, own 1); OX = XO(cat 0.15, c 1);
  X2 = XV defaults; X3 = XS defaults; X4 = XT(rat 0, N 50, h 0.15); X8AND = XD defaults; HS = XF with t = ∞.
- **D1.** The registered VGT D1 `primary` trailing stop is 7.3% (`config/phenotypes/D1/VGT.json`), below the
  post-entry high, updated daily, eligible only when the sale realises a net profit. B-D1T and B-D1N are explicit
  benchmarks; nothing of D1 is changed or applied silently to a candidate.

### 4.3 Re-entry rules (while flat and the campaign is alive)

A campaign is alive after an exit other than an own-OUT exit, until a close at which the entry's own condition fails
(level: state OUT; event/intraday: own OUT true) or an own-OUT condition was seen while long (Stage 1 semantics); after
it dies only a fresh first-entry signal opens a position. An event family's fresh trigger inside a live campaign
re-enters it with its own references under every rule except RN. Intraday families also keep their minute trigger
(blocked under RN while alive). References: stoppedHigh = Hc of the exited trade; stopAtExit = the resting level in
force at the exit decision or fill; trough = lowest close since the exit (exit close included).

| ID | Rule |
|---|---|
| R3F | C > stoppedHigh (Stage 1 template default) |
| RN | nothing while alive (= Stage 1 R5; the no-re-entry reference) |
| RF | fresh event trigger only (= Stage 1 R1; level families: as RN) |
| R0 | the first flat close (immediate; control) |
| RC10 | ≥ 10 sessions since the exit (= Stage 1 R2) |
| RP50 | C ≥ trough + 0.5 (stoppedHigh − trough) (= Stage 1 R4) |
| RS | C > stopAtExit (reclaim the prior stop) |
| RFL | the E05 zigzag (θ 0.05, b 0.005) confirms a higher swing low at s (return to a rising-floor structure) |
| REF | ER_30 ≥ 0.30 and A_30 ≥ 0.11 at s after at least one close since the exit failed it (renewed efficient progress) |
| RPM | hysteretic permission: alive from the campaign's first entry until a close with C < SMA200 or C ≤ 0.85 × the highest close since that entry (independent trend damage); it **replaces** the entry's own-condition death and survives own-OUT conditions seen while long (an own-OUT *exit* still ends it); while alive and flat: C > max(C_{s−10..s−1}) |

### 4.4 Sizing overlays (decided at a close, executed at the next opening trade)

| ID | Rule |
|---|---|
| Z0 | fixed shares, fixed B₀ (Stage 1 baseline) |
| Z1 | at the last session of each calendar month, if G_s > 1.05 B₀: at the next open sell q = S − B₀/raw (if > 0) |
| Z2(u, v) | at any close with G_s ≥ B₀(1+u): at the next open sell q = S − B₀(1+v)/raw (if > 0); grid (u, v) ∈ {(0.25, 0), (0.5, 0), (0.5, 0.25), (1.0, 0), (1.0, 0.5)} |
| Z3(G) | no trim; adds the XRD component (A = G, the family's other components unchanged); G ∈ {$15,000, $25,000, $40,000} |
| ZR | C-ALR only: Stage 1's monthly reset to B₀/raw shares with a constant $100,000 principal (frozen reference) |

Z1/Z2 never buy shares and never raise L; a position below target is not topped up. A pilot/gradual-entry variant is
not studied (optional in the brief; disclosed).

### 4.5 Controls and benchmarks (identical financing, re-simulated in the Stage 1b engine)

C-AL (always long, one fixed-share lot), C-ALR (frozen Stage 1 always-long reference, ZR), C-ALZ1 (always long + Z1;
passive monthly resized VGT on the candidates' loan/cash terms), C-SMA, C-DON, C-TSM (Stage 1 controls with their own
exits and R1), C-STOP (always-long entry, XF default h 0.08 t 0.10 own 0, R3F: a simple fixed stop/re-entry control),
C-IDLE. Buy-and-hold is opportunity-cost context, not a target. Stage 1's P\* and TPL defaults are frozen references
(their Stage 1 numbers are quoted; re-simulation is parity).

## 5. Policy switching and the executable annual selector (brief §3)

### 5.1 Principle

Selection model and account state are separate. A **policy** is a fully specified (entry, entry parameters, exit,
exit parameters, re-entry rule, sizing). An **executable path** is one simulated account in which the active policy
changes only at a boundary b (a fold's development end) to the policy whose selection record was sealed using data
≤ b. Signal arrays are position-independent and computed from 2016 (past-only warm-up); **no position, stop
reference, campaign or pending order is inherited from a run of a policy that was not active.** The path starts flat at
the close of 2019-12-31 with policy P\*_A.

### 5.2 Transition conventions

- **S1 flat-then-adopt (primary).** At the close of b, after the old policy's own close processing: pending entries,
  trims and campaigns of the old policy are cancelled. If long, a transition exit is ordered for the opening trade of
  b+1 (recorded with the old policy's reason if it decided an exit at b's close, else `transition`; at an opening gap
  through the old stop it is still a transition at the opening trade). The new policy starts with no campaign; its
  first decision close is b if the account is flat at b's close (entry at b+1's open), else b+1 (no entry in the exit
  session). An intraday new policy's reference starts as after an exit at the transition fill (from b+1's open,
  triggering from b+2), or as at a run start with first decision session b if flat. If the newly selected policy is
  identical to the old one (same policy ID) there is no transition.
- **S2 continue-old (sensitivity).** An open position at b stays under the old policy's exits and stops until its own
  exit; the old campaign's re-entries are disallowed; the new policy is adopted for new entries from the exit
  session's close (no competing position; selection for new entries deferred until flat). A position still open at the
  next boundary continues the same way.
- **S3 netted conversion (state-transfer sensitivity).** At b's close the new policy evaluates its fresh first-entry
  rule as if flat with no campaign (level: state IN; event: trigger at b; intraday: undefined → no). If it would enter,
  the open position is converted at b+1's opening trade at raw price x: if S·x ≥ B₀, sell q = S − B₀/x shares at the
  sell price and keep S' = B₀/x at cost basis x; otherwise buy q = (B₀ − S·x)/buy price shares so that the position cost
  is B₀. The old trade closes at that open (retained shares valued at x, no friction on them; friction only on q); the
  new trade opens with E = Hc = Hh = x, L = B₀, a new campaign and fresh stop references. If it would not enter, S1
  applies. This transforms entry references, stops, campaign and principal causally (only data ≤ b and the fill at
  b+1's open); it is a labelled sensitivity, not the primary.

### 5.3 What is reported for every executable path

Trade ledger (with transitions, conversions, rejected/cancelled orders), annual window increments W_F = liquidation
mark at e_F − at b_F, aggregate (= end liquidation mark), realised vs unrealised at each boundary, interest, friction,
the end-boundary liquidation, minute and daily drawdowns ($, % of B₀, % of notional account at peak) per window and
chained, the transitions, and the difference to the non-executable splice of the same picks.

### 5.4 Non-executable splice (diagnostic only)

Stage 1's Π: the window increments of continuous runs from 2017-01-03 of each fold's pick, chained (an open lot at b
carried with its old references). It is reported for Stage 1's and Stage 1b's picks and is never a verdict object.

### 5.5 Repair of Stage 1 (stage `repair`)

Stage 1's sealed picks (E06-9ee2ce7bd5, E04-86b6d59a31, E04-b4a27ac53b, E06-47640253c0; read from its sealed
`develop-*.json`/`evaluate-*.json`) are (a) re-simulated continuously with Stage 1's engine (imported) and the Stage 1b
engine (parity, Σ V = +$253 and Π DD $63,569 reproduced), and (b) run as executable paths under S1, S2 and S3. The
fold-C pick's March 2020 → January 2022 lot is traced (fill, exit, lifetime net, unrealised gain at 2021-12-31, the
2022 increment, peak value, loan-to-value) with counterfactual Z1, Z2 grid and Z3 grid overlays on the same policy —
counterfactuals, neither original trades nor validation.

## 6. Histories and folds (frozen before any result)

| History | Development data | Evaluation window (b, e] | Note |
|---|---|---|---|
| A | 2016-01-04 → 2019-12-31 | (2019-12-31, 2020-12-31] | crash and rebound |
| B | → 2020-12-31 | (2020-12-31, 2021-12-31] | sustained advance |
| C | → 2021-12-31 | (2021-12-31, 2022-12-30] | bear / downtrend |
| D | → 2022-12-30 | (2022-12-30, 2023-12-29] | calm recovery |
| H | → 2023-12-29 | none | in-sample description only |

Development metrics cover decisions from 2017-01-03 to the development end. A within-history validation split is not
used (Study 1 found validation-based selection worse; disclosed). Secondary multi-year exercise: the **static path**
P\*_A held without reselection from 2019-12-31 to 2023-12-29 (one selection, a four-year assessment).

## 7. The layered research design (per history; identical procedure in A, B, C, D, H)

### 7.1 Common search mechanics

- Box mapping from the unit cube: continuous lo + u(hi − lo), quantised; integer/categorical min(hi, ⌊lo + u(hi − lo +
  1)⌋). Sobol points (Stage 1's Joe–Kuo generator, imported) with a random digital shift; seed = first 8 hex digits of
  sha256(`study3b|<history>|<cell>|global`) → mulberry32 → one 32-bit mask per dimension. Identical quantised vectors
  are evaluated once (first index kept; duplicates counted).
- **Center feasibility:** development minute DD ≤ $35,000; ≥ 6 closed trades; ≥ 3 campaigns (first entries); a
  position held at a close in ≥ 3 calendar years; development net > 0.
- **Local refinement:** the 4 best feasible, trade-path-distinct points by development net; 32 shifted-Sobol points
  each over ±10% of each range (seed `…|local|<k>`).
- **Shortlist:** the 16 best feasible, trade-path-distinct points of global ∪ local by development net.
- **Joint neighbourhood J32** of a shortlisted center: the center and 32 draws, each continuous/integer dimension
  uniform in ±10% of its range around the center (clamped, quantised; binary/categorical dimensions fixed at the
  center), seed `…|joint|<centerIndex>`. φ = share of J32 with net > 0 **and** minute DD ≤ $35,000.
- **Scores:** primary **RoD** = median over J32 of net / max(minute DD, $10,000); secondary **NET** = median over J32
  of net. A **champion** is the shortlisted center with the highest score among those with φ ≥ 0.75 and 10 bps center
  net > 0 (ties: lower index); none → no champion (recorded).

### 7.2 L-A — broad screening (descriptive; no selection)

Matrix: the 8 panel entries at defaults × {every exit family at its default, XF-T default, XM (4), B-D1T, B-D1N} ×
R3F × Z0. Read by row (common entry, different exits) and column (common exit, different entries). Recorded per cell:
development net, DD, trades, campaigns, re-entry **opportunities** (non-own-OUT exits with the campaign alive) and
re-entries, exposure, duplicate trade paths (duplicate mechanisms). Also every entry × XF default under each re-entry
rule (opportunity counts by rule).

### 7.3 L-B — exit-family optimisation (substantial, equal budgets)

For each of the 10 optimised exit families (XF, XV, XS, XT, XRP, XRD, XD, XP, XO, XE) × each entry control
**E06, E05, E03, C-SMA** at catalog-default entry parameters, R3F, Z0: 1,024 global + 128 local + 16 × 32 joint +
16 at 10 bps = **1,680 evaluations per cell** (40 cells). Reported: the best-training point, the RoD and NET champions,
robust alternatives (the shortlist), the full archive.

### 7.4 L-C — bounded joint pairings, then re-entry

Predeclared pairings (entry × exit, joint search over entry and exit parameters, R3F, Z0):

| ID | Pairing | Purpose |
|---|---|---|
| P01 | E06 × XS | calm advance + structural floor |
| P02 | E06 × XV | calm advance + volatility trail |
| P03 | E06 × XF-T | calm advance + protective tighter trail + re-arming |
| P04 | E06 × XRD | calm advance + dollar giveback |
| P05 | E05 × XF | rising floor + price stops |
| P06 | E03 × XT | directional efficiency + two-layer |
| P07 | E11 × XF-T | renewable campaign + tight trail |
| P08 | E09 × XF | trailing buy + trailing sell |
| P09 | C-SMA × XF | simple control |
| P10 | E02 × XE | time-series drift + invented exit |
| P11 | E07 × XD | breakout + damage combination |
| P12 | adaptive | the L-B cell (entry control × exit family) with the highest RoD champion score in this history not already in P01–P11 (training-only trigger; absent if none) |

Step 1 (joint search): 2,048 global + 128 local + 16 × 32 joint + 16 at 10 bps = **2,704** per pairing. Step 2
(re-entry, only after step 1): the step-1 champion under each of the 10 re-entry rules, each with its own J32 (same
draws) = **330**; the pairing's final policy is the best-scoring feasible rule (R3F on ties). A pairing with no
feasible point is eliminated (training-only, logged); its count stays in the denominator.

### 7.5 L-D — sizing overlay (small, preselected)

On the 3 pairings with the highest step-2 RoD scores: Z1, Z2 (5 grid points) and Z3 (3 grid points), each with J32
(= 9 × 33 = 297 per pairing; Z0 is the step-2 result). The pairing's final policy may change sizing only if a sizing
variant scores higher on the same objective. Reported against Z0 scaled to the variant's f_MV and with the upside
given up.

### 7.6 The history's pick

**P\*** (primary) = the highest RoD among the pairings' final policies (ties: lower pairing ID). **P\*-NET**
(secondary) = the same pipeline with NET in every champion, re-entry and sizing choice. **P0** (no search) = the L-A
cell (panel entry × default exit, R3F, Z0) with the highest development net among feasible centers. All three are
sealed in the history's record before any evaluation window is loaded.

### 7.7 Budget (code-enforced, frozen before results)

Per history: L-A ≤ 300; L-B 40 × 1,680 = 67,200; L-C 12 × (2,704 + 330) = 36,408; L-D 3 × 297 = 891; P\*-NET extra
re-entry/sizing runs ≤ 12 × 330 + 3 × 297 = 4,851 → planned ≤ **109,650**, cap **140,000** per history and **700,000**
for the five; robustness ≤ 80,000; repair ≤ 5,000; diagnostics ≤ 30,000. A stage whose planned count exceeds its cap
refuses to start. Runs are deterministic and parallelised over worker threads (results merged in index order); every
evaluated point is archived (parameters, index, stage, net, price gain, interest, friction, trades, campaigns,
re-entries, years held, minute/daily DD, Ḡ, peak G, dollar-days, worst/best trade, exit-reason mix, path hash, flags).
Adaptive expansion: none, except P12 (training-only). No budget may grow because an evaluation window disappoints.

## 8. Neighbourhoods (primary robustness deliverable)

For P\*_A..P\*_D, P\*_H, P\*-NET picks and each pairing's H final policy:

- **One at a time:** ±1 and ±2 steps of 5% of each continuous/integer range (integers ≥ 1 step; a point clamped onto
  the center is dropped and the denominator shrinks); binaries and categoricals flipped one at a time.
- **Joint J128:** 128 draws uniform in ±10% of each range (seed `study3b|<policy>|J128`), binaries fixed.
- **Reported separately:** min, P10, P25, median, P75, P90, max of net; window minute and daily DD; peak G; time long;
  stop and re-entry counts; (i) the net distribution, (ii) share net > 0, (iii) share DD ≤ $35,000, (iv) share both,
  (v) retention = neighbourhood median / center net, (vi) interaction: J128 minus the OAT envelope; per major up-leg
  (§10) the share of neighbours capturing it, and each neighbour's net excluding its largest trade (measured, never
  subtracted from the reported net).
- Neighbourhoods of a fold pick are computed on its **development** data (training-fitted center) and, separately and
  labelled post-selection, over its next window; the center is never modified after either.

## 9. Evaluation (stage `evaluate`, after develop-A..D and H are sealed)

- **Π1** = S1 executable path of P\*_A..P\*_D (**the verdict object**). Sensitivities: Π1-S2, Π1-S3; Π-NET (P\*-NET
  picks, S1); Π-P0 (P0 picks, S1); static path of P\*_A; Stage 1b picks' non-executable splice; continuous runs from
  2017-01-03 of every pick (within-strategy window increments).
- **Controls** (C-AL, C-ALR, C-ALZ1, C-SMA, C-DON, C-TSM, C-STOP, C-IDLE) run flat-start at 2019-12-31 (like-for-like
  with Π1) and continuously from 2017-01-03 (Stage 1 convention).
- **Exposure-matched benchmark:** B_F = f_MV,F(Π1) × W_F(C-ALR, flat-start). Stage 1's principal-dollar-day matching is
  reported beside it.
- Per window and chained: every §5.3 item, regime notes, longest underwater, worst trade, loss streak, restarts,
  turnover, risk per notional dollar-day, up-legs captured, mark-to-market giveback vs final trade profit; explicit
  calendar traces of the March 2020 entry and January 2022 exit of the repair lot, and every 2022 entry.

## 10. Robustness and stresses (stage `robustness`)

Π1 and P\*_H (full 2017–2023, in-sample for P\*_H) re-simulated without reselection at: 0/2/10 bps; 8%/14%; stop
slippage 10/25/50 bps; entry slippage 10/25 bps; opening-fill slippage 50 bps on every opening-trade fill (entries,
exits, trims, transitions); delays +1/+5 minutes; missing bars (seeded 1% and 5% of non-first minutes); and the §8
neighbourhoods. **Trend legs** (Stage 1 §13: zigzag on closes, 10% reversal, up-legs ≥ 15% within 2017-01-03 →
2023-12-29): capture, entry delay, idle share, lost post-stop gain per leg. Margin calls and house maintenance are not
modelled (the slot has no own equity); overnight gaps through stops are simulated at the open; liquidity,
forced-liquidation timing and rate changes beyond the 8–14% stress are omitted risks.

## 11. Verdict rubric (frozen; labels applied in this order)

Let W_F be Π1's increment in window F (A 2020, B 2021, C 2022, D 2023); "positive" = W_F ≥ +$2,000.

1. **Invalid** if (a) fails: any parity check (fast = independent reference; fast = Stage 1 engine on Stage 1
   configurations) or any §3.2 identity on a sealed ledger fails.
2. **Insufficient evidence** if (d) fails: Π1 has a position entered or carried in < 3 of 4 windows, or < 6 closed
   trades in 2020–2023, or P\* is undefined in ≥ 2 folds.
3. **Risk-incompatible** if (c) fails: any window's minute DD > $35,000 or Π1's chained minute DD > $35,000.
4. **No demonstrated edge** if any of: (b) Σ W_F < +$20,000, or positive in < 3 windows, or min W_F < −$15,000;
   (e) Σ (W_F − B_F) < +$10,000, or W_F − B_F ≥ +$2,000 in < 2 windows, or Σ W_F − Σ W_F(C) < +$5,000 for any
   C ∈ {C-SMA, C-DON, C-TSM} (flat-start); (f) for any fold pick or P\*_H the J128 development share with net > 0 and
   DD ≤ $35,000 < 0.75, or Π1's end mark ≤ 0 under any of 10 bps, 14%, 25 bps stop slippage, +1 minute; (g) Σ W_F
   minus the largest single trade's contribution to Σ W_F ≤ 0. The failed items are listed.
5. Otherwise **historically promising but unvalidated** (never deployable, never registered).

The same items are computed descriptively for Π1-S2, Π1-S3, Π-NET, Π-P0, the static path and Stage 1's executable
paths. A central in-sample improvement of E06 (or any family) is never validation.

## 12. Stages (write-once, in this order, code-enforced)

| Stage | Content | Door |
|---|---|---|
| `audit` | data QA, file/loaded-bar hashes per history end, Stage 1 tree manifest (unchanged), protected-input manifest, baseline test status | ≤ 2023-12-29 (no strategy run) |
| `freeze-protocol` | sha256 of PROTOCOL.md, EXPERIMENT_MATRIX.json, the brief, review dispositions | none |
| `parity` | (a) Stage 1b fast = Stage 1 engine on Stage 1 configurations (every panel default × TPL/OX/X2/X3/X4/X8AND, 64 random TPL vectors per family, controls) on fold A's development data; (b) fast = independent reference on fold-A data for every exit family default × {E06, E05, E09} × {R3F, RN, R0, RC10, RPM}, Z1/Z2/Z3 on representative policies, 64 random vectors per pairing, and S1/S2/S3 paths with boundaries 2017-12-29 and 2018-12-31; (c) synthetic fixtures; (d) door refusals — recording only field names, difference counts and \|Δ\| | ≤ 2019-12-31 for (a), (b) |
| `freeze-code` | sha256 of the import closure of `src/study3-vgt-momentum-stage1b/` (incl. imported Stage 1 and `src/lib` files) + tests + package.json, package-lock.json, tsconfig.json | none |
| `repair` | §5.5 | ≤ 2023-12-29 |
| `develop-A` … `develop-D`, `develop-H` | §7, sealed | development end |
| `evaluate` | §9 | ≤ 2023-12-29; needs develop-A..D, H |
| `robustness` | §8, §10 | ≤ 2023-12-29 |
| `analysis` | §11 rubric, ledgers and tables from sealed records only | sealed records |

Every record holds git HEAD, `git status --porcelain` outside the Stage 1b namespace (must be empty), both freeze hashes,
its door, payload sha256s and its own body hash, and verifies its predecessors. A post-freeze defect that violates a
predeclared test or identity is fixed only by an append-only amendment, a re-hashed code freeze and reruns of every
affected stage with original seeds (`<stage>-rerun-<n>`), keeping both records.

## 13. Reviews, disclosures, limits

Two independent read-only methodology reviews (separate agent contexts) precede the freeze; an independent read-only
code-and-evidence audit follows the results; all are kept verbatim with dispositions in `reviews/`. Limits: one ETF,
one secular bull market with three declines; dependent annual windows; inspected history and designer knowledge;
no bid/ask data (slippage is synthetic stress); no margin-call modelling; price-only accounting; minute-close drawdown
sampling; parameter draws are not independent market observations; correlated configurations are not independent
evidence (distinct mechanisms and configurations are counted separately).
