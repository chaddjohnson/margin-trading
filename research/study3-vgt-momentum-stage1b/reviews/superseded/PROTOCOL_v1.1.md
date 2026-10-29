# PROTOCOL — Study 3 Stage 1b `study3b-vgt-momentum-exits-exposure-chronology-v1`

**Version 1.1.** v1.0 (`reviews/superseded/PROTOCOL_v1.0.md`, sha256 `1fee1998…2608979`) was revised after two
independent read-only methodology reviews (`reviews/METHODOLOGY_REVIEW_1.md`, `_2.md`; dispositions beside them). It
becomes binding when the `freeze-protocol` stage records the sha256 of this file, `EXPERIMENT_MATRIX.json`,
`ENGINE_CONTRACT.md` (the operational run semantics both engines implement), the brief and both disposition files in
`PROTOCOL_FREEZE.json`. Precedence where frozen texts differ: this protocol > `ENGINE_CONTRACT.md` >
`EXPERIMENT_MATRIX.json` > report narrative. No Stage 1b mechanism has been run on market data before that freeze.
Afterwards, changes are append-only amendments (`AMENDMENTS.md`, `results/amendments.jsonl`); anything they introduce
after outcomes are seen is exploratory.

## 1. Question, scope, evidence level, design-bias register

- **Question (brief §1).** Can a causally executable, standalone VGT long-momentum strategy — with better-aligned
  entry, exit, re-entry and optional position-sizing rules — earn substantial net returns after 11% simple margin
  interest and trading costs, with a historical minute drawdown within the $35,000 research reference and more
  reliable chronological behaviour than the frozen Stage 1 procedure?
- **Scope.** VGT only; one $100,000-per-entry research slot; one standalone book. No D1, B4, B5 or pooled run; no
  change to any registered strategy, phenotype, allocator default, config, data file, earlier study or Stage 1 record.
  Stage 1 (`research/study3-vgt-momentum/`, `src/study3-vgt-momentum/`) is read-only: its code may be imported, its
  sealed records read; nothing of it is rerun as a stage, rewritten or re-hashed.
- **Evidence level.** 2016–2023 was inspected by earlier studies and is known to the designer. Fold replays are
  **retrospective, chronology-respecting evaluations of a frozen procedure**: the code is blind to each evaluation
  window, the design is not. The full-history run (H, 2017–2023) is in-sample description. Four annual windows are
  four dependent regimes; no significance is claimed. 2020–2023 is never called out-of-sample.
- **Design-bias register (disclosed, not neutralised).** (a) Every Stage 1 outcome (fold picks, the 2022 E04 lot, the
  E06/E05/E03 references, X2/X3 descriptives, re-entry harm in 2022) was known when this protocol was written and
  shaped its hypotheses, exit families and pairings. (b) The primary selection objective (return over drawdown) was
  chosen knowing that Stage 1's net-maximising selection carried the most exposed rule into 2022; the NET objective
  is kept as a labelled secondary. (c) The sizing overlays exist because Stage 1 found exposure drift of a 2020 lot.
  (d) Boxes and defaults use general knowledge of VGT's ~1.5–2% daily volatility and its 2018, 2020 and 2022
  declines. (e) The fold layout (three advancing years, one declining) is Stage 1's. (f) v1.0's panel omitted E01,
  E04, E08, E10 and E12, including the family behind Stage 1's 2022 loss; review 1 flagged this as hindsight
  exclusion and v1.1 restores all twelve families to L-A and gives E04 a pairing (P04). (g) S1's boundary liquidation
  acts like a resize at each changed pick; the verdict therefore also requires S2 (§11).

## 2. Data and doors

- **Input.** `data/VGT/data.csv` through the shared loader only (`src/lib/evaluation.ts loadDatasetSessions`, partition
  `training`, access `optimization`), with an explicit end date ≤ **2023-12-29**; the code refuses a later end before
  any byte is read. The loader parses every row of the file to check order and computes the whole file's sha256, but
  retains only ticks before the requested end's UTC midnight + 2 days and then only sessions ≤ the end. Stage 1b asserts
  on every load that the last session equals the request, that every retained bar's New York date ≤ the request, and
  that no bar time is ≥ 2023-12-30T00:00Z. **No Stage 1b computation receives any bar dated 2024-01-01 or later**;
  2024-01-02 → 2025-12-31 (future validation) and 2026 (final holdout) are not loaded by any candidate, selector,
  benchmark, control or descriptive run. The distributions reader drops ex-dates after 2023-12-29.
- **Doors per stage.** A history's development stage loads data through its development end only (A 2019-12-31, B
  2020-12-31, C 2021-12-31, D 2022-12-30, H 2023-12-29). `parity` loads through 2019-12-31. `repair`, `evaluate` and
  `robustness` load through 2023-12-29 and refuse to run unless develop-A..D and develop-H are sealed and verify.
- **Calendar.** New York session dates; early closes and missing minutes as in the data (never imputed); recorded
  splits forward-adjusted (none in 2016–2023 for VGT). File sha256 and loaded-bar sha256 in every record. "b+1" is the
  next session in the data.
- **Accounting basis.** Price-only for every candidate and control (Stage 1 convention). Distributions
  (`config/market-events/distributions.csv`, VGT ex-dates ≤ 2023-12-29) are a separate ledger: shares held at the close
  before each ex-date × amount, reported for the executable paths, P\*_H and the passive controls alike; never in a
  decision or a criterion.

## 3. Execution and accounting (identical for candidates and controls)

### 3.1 Clock, fills, friction, stops

- Daily rules decide at a session's close from sessions ≤ s and execute at the next session's opening trade (first
  regular minute's open); under a k-minute delay at the first trade ≥ open + k. Minute rules (E09/E10) decide at a
  completed minute (decision time = bar start + 60 s) and fill at D1's `firstTradeAfterDecision` (the next minute's
  open; the closing print for a decision before the close; else the next session's opening trade). First decision close
  **2017-01-03** for full runs; lookbacks ≤ 250 sessions from 2016-01-04. No same-close fills.
- Buy at raw × (1 + entry slippage) × (1 + bps/10⁴) × (1 + opening slippage if an opening-trade fill); sell at raw ×
  (1 − stop slippage, stop fills only) × (1 − bps/10⁴) × (1 − opening slippage if an opening-trade fill). Baseline
  **5 bps per side**, no slippage. Opening slippage (a stress) applies to every fill at a session's opening trade —
  entries, close-decided exits, trims, transitions, conversions and bar-0 gap stops — and stacks with stop slippage.
- **Resting stop.** One sell-stop level per session: the maximum of the configuration's active stop components (§4.2),
  computed at each close for the next session, and at the fill for the fill session from information up to the
  previous close plus the fill price; **never lowered** (level_{s+1} = max(level_s, components at s)), except the
  B-D1N component, which is re-evaluated each session and absent while inactive. Scanning minutes in time order from
  the fill bar (bar 0 for a carried position), the first minute whose open ≤ level exits at that open (a **gap stop** at
  bar 0), otherwise the first whose low ≤ level exits at the level. The closing print never triggers a stop. A
  close-decided exit executing at an opening trade ≤ the level is recorded as a gap stop. A bar-0 exit whose level
  exceeded the prior session's close is flagged `level above prior close` (not a genuine gap). Per stop exit the
  shortfall level − fill is recorded. No fill at a price better than the bar's open is ever synthesised.
- **Delay semantics.** Resting stops trigger from bar 0 regardless of the delay; a triggered stop fills at the first
  trade ≥ trigger time + k (the closing print if no minute is left, else the last minute's close). Pending exits,
  transitions, conversions, trims and entries execute at open + k and are cancelled if the resting stop fires first
  (a cancelled transition or conversion becomes S1's adoption at that exit).
- **Same-session order.** (1) at the opening trade (+ delay): a pending close-decided exit, transition or conversion;
  else a pending trim if the open is above the resting level (a gap stop below then sells everything); then a pending
  entry; (2) the minute loop: resting stop, the minute entry rule, minute marks; (3) at the close: features, Hc/Hh,
  profit marks, exit decisions, campaign state, trim decisions, entry decisions, the next stop level, transitions at a
  boundary; (4) daily marks. **At most one entry per session and none in a session that had an exit**; a close that
  yields both an exit and an entry executes only the exit; no trim is ordered at a close that orders an exit. A
  conversion (S3) is the one permitted exit-and-entry at one price and is not an entry for this rule.

### 3.2 The account: net-debit (primary) and fixed-slot (Stage 1 parity) financing

- **State.** Principal cash balance M (starts at 0; buys subtract cost, sales add proceeds), shares S ≥ 0, the open
  trade's principal L (its cost at entry less principal repaid by trims; used for exposure reporting and the
  fixed-slot mode), accrued interest I (a separate liability; it bears no interest), and the open trade's references
  E (raw first fill), Hc (highest held close, from E), Hh (max of E, minute highs from the fill bar, held closes).
- **Entry.** Buy S = B₀ / buy price (B₀ = $100,000 of market value at the fill); M −= B₀; L := B₀.
- **Trim (Z1/Z2).** Sell q shares (q fixed at the deciding close, §4.4); proceeds P = q × sell price; M += P; the trade's
  principal is repaid first, L := L − min(L, P), the remainder is realised cash.
- **Exit.** Sell all S; M += proceeds; the trade's principal and interest are settled.
- **Interest (simple, 365-day, 11%).** Accrued in segments split at every fill (entry, trim, exit, transition,
  conversion), on session-date differences (Stage 1's Δ sTime / (365 × 86,400 s)); same-session round trips pay none.
  **Net-debit mode (primary for every Stage 1b search, path, control and stress):** the segment base is the account
  debit max(−M, 0) — losses carried forward pay interest, realised gains reduce later borrowing, positive cash earns 0%.
  Interest accrued while flat (a debit from earlier losses) is booked to the account at the next fill.
  **Fixed-slot mode (Stage 1's convention, not self-financing; used for Stage 1 parity and reported beside net-debit for
  the repair paths):** the base is the open trade's L; nothing accrues while flat.
- **Marks.** mark = M + S × p − I (p a minute close or the session close); liquidation mark = the same with S × p ×
  (1 − bps/10⁴). Each trade's net = Σ its sale proceeds − its cost − the interest accrued during its life; the account's
  flat-period interest is reported separately; Σ trade nets − flat interest = end liquidation mark.
- **Identities checked on every sealed ledger:** (i) end liquidation mark = Σ closed-trade nets + the open trade's
  liquidation value − flat interest; (ii) per trade, Σ proceeds − cost − interest = net, and price gain − friction −
  interest = net, with price gain = Σ_sales q_i (raw_i − E) and friction = (cost − S₀E) + Σ q_i (raw_i − sell_i);
  (iii) L never increases except at an entry or a conversion and repayments = min(L, P) per trim; (iv) interest
  recomputed from the segment ledger equals the booked interest; (v) Σ W_F = liquidation mark at the path end − at the
  path start; (vi) every fill changes the mark at the fill price by exactly −(its friction and slippage); (vii) S > 0
  while long.
- **Research-slot equity.** The slot has no own capital: equity is the cumulative mark. Drawdowns are reported as $ and
  as: basis 1 $DD / B₀ (lead); basis 2 $DD / (B₀ + the mark at the episode's peak) — the surrogate for "% of current
  equity"; basis 3 $DD / max G within the episode's [peak, trough]. A mark decline is never called a loss of original
  principal.

### 3.3 Drawdowns, exposure, ledgers, contributions

- **Minute drawdown:** the frozen `Tracker.updateStrict` (imported from `src/multi-etf-allocator/engine.ts`) over marks
  at every minute close while long, at each fill, at each session close while long, and (net-debit mode) at each session
  close while flat. **Daily drawdown:** session-close marks. Window drawdowns restart the peak at the window's boundary
  mark; chained paths carry the peak.
- **Exposure:** per session close, gross value G_s = S × C_s, principal L_s and debit D_s = max(−M_s, 0). Per run and
  window: Ḡ = Σ_s G_s × days(s → s+1) / calendar days; peak G; notional dollar-days Σ G × days; principal and debit
  dollar-days; share of sessions long; L/G; interest; net per $1M notional dollar-days; f_MV = Ḡ / B₀; f_L = principal
  dollar-days / (B₀ × days).
- **Per trade:** kind (first / re-entry / conversion), rule, fills, exit reason, stop component, gap flag and shortfall,
  shares, trims, price gain, friction, interest, net, sessions and days held, MAE/MFE, peak open profit (at closes),
  giveback = peak open profit − net, peak G, Hc at exit. **Per event** (entry, trim, exit, transition, conversion): time,
  raw, q, proceeds, repayment, M, L, D, I, S, G, mark, L/G; realised gain per sale = q × (sell price − E(1 + bps/10⁴)).
- **Window decomposition** of (b, e]: per trade, its contribution = its liquidation value at min(exit, e) (its net if it
  exited) − its liquidation value at b (0 if not yet open); carried trades split into pre-window unrealised gain and
  window increment; the transition P&L (b's liquidation mark → the b+1 fill) is its own line; flat interest its own line.
  A campaign's contribution is the sum over its trades. A campaign's giveback = the peak of its cumulative P&L (realised
  nets + the open trade's value, at closes) − its final (or end-liquidated) P&L.

## 4. Mechanism catalog

### 4.1 Entries (Stage 1 `MECHANISM_CATALOG.json` v1.1 definitions, imported from `src/study3-vgt-momentum/signals.ts`)

Panel (L-A, all at Stage 1 defaults): **E01** proximity to the 250-session high, **E02** high drift, **E03**
directional efficiency, **E04** CUSUM, **E05** rising floor, **E06** calm advance, **E07** breakout acceptance, **E08**
compression breakout, **E09** upward trailing-buy (intraday, lowest-low reference), **E10** breakout trailing-buy
(intraday, highest-high reference), **E11** drawdown permission / renewable campaign, **E12** pullback continuation,
and **C-SMA** (close vs 200-session SMA). Boxes, quanta and defaults are Stage 1's. Own OUT, fresh signals and campaign
semantics are Stage 1's (a level family's fresh signal is a flat close with state IN while no campaign is alive; an
own-OUT condition seen at a held close ends the campaign at the exit) except under RPM (§4.3).

### 4.2 Exit families (all prices raw; every family pairs with any entry)

Notation: E raw first fill; Hc highest held close (incl. the current close); Hh = max(E, minute highs from the fill
bar, held closes); S shares; L the trade's principal; I_s the trade's interest to the close date s; P_s = (the trade's
realised trim cash) + S × C_s − L − I_s the trade's open profit; P\* = max P over held closes. "Next open" = a
close-decided exit. Every family has a binary **own** (1 = also exit at the next open on the entry's own OUT at a close)
except XO (own by definition) and the fixed exits. Percent quantum 0.001, dollar quantum $500, integers 1. Close-decided
reason priority: own out > trend > damage > structural > stale > max hold > stall.

| ID | Family (brief §5 item) | Components | Box (default) |
|---|---|---|---|
| **XF** | fixed-price hard + trailing (1) | hard E(1−h); trail R(1−t), R = Hc (ref 0) or Hh (ref 1) | h 0.02–0.20 (0.08); t 0.03–0.35 (0.10); ref {0,1} (0); own (1) |
| **XF-T** | XF on a tight box (searched in P03, P07) | as XF | t 0.03–0.12 (0.08); else as XF |
| **XV** | volatility-scaled trail (2) | hard E(1−h); vol level Hc(1 − clamp(k·ATR_n/Hc, dmin, dmin+dgap)), ATR undefined → dmin+dgap; ratcheted, so crisis volatility cannot widen it | k 1.0–8.0 q0.1 (3.0); n 5–60 (20); dmin 0.02–0.10 (0.04); dgap 0.02–0.30 (0.11); h 0.03–0.20 (0.08); own (0) |
| **XS** | rising floor / structural (3) | next open when C < F(1−b), F = the latest confirmed swing low of the causal close zigzag with reversal θ (E05's floor, position-independent), **armed only after a held close with C > F(1−b)**; emergency hard E(1−h) | θ 0.02–0.15 (0.05); b 0–0.03 (0.005); h 0.03–0.20 (0.10); own (0) |
| **XT** | two-layer protective (4) | catastrophic hard E(1−h); trend: next open when C < min(C_{s−N..s−1}); ratchet (rat 1): once Hc ≥ E(1+g), trail Hc(1−t2) | h 0.05–0.25 (0.15); N 5–120 (50); g 0.03–0.60 (0.20); t2 0.03–0.25 (0.10); rat {0,1} (1); own (0) |
| **XRP** | price profit retention (5) | hard E(1−h); once Hc ≥ E(1+a): E + ρ(Hc − E) | h 0.03–0.20 (0.08); a 0.03–0.60 (0.15); ρ 0.20–0.90 q0.01 (0.50); own (0) |
| **XRD** | dollar-equity giveback (5) | hard E(1−h); once P\* ≥ A: the price at which P = P\* − G (with I_s; a later trim keeps the price level by the ratchet, which tightens the dollar giveback) | h 0.03–0.20 (0.08); A $2,000–$80,000 ($20,000); G $5,000–$60,000 ($15,000); own (0) |
| **XD** | price damage × trend damage (6) | D_p: C ≤ Hc(1−p); D_t: C < min(C_{s−N..s−1}); next open on D_p OR D_t (mode 0), D_p AND D_t (mode 1), AND while C > SMA200 else OR (mode 2); resting catastrophic Hc(1−cat) | p 0.03–0.25 (0.10); N 5–120 (20); mode {0,1,2} (1); cat 0.08–0.30 (0.15); own (0) |
| **XP** | financing-aware stall (7) | hard E(1−h); next open when sessions held − 1 ≥ T and C_s < C_{s−T}(1 + φ_fin + m) and C_s ≤ Hc(1−d), φ_fin = L × rate × days(s−T → s)/365 ÷ (S × C_{s−T}) (the position's own financing over the window); a consolidation within d of Hc is tolerated | T 5–120 (20); m −0.05–0.05 (0.01); d 0–0.10 (0); h 0.03–0.20 (0.08); own (0) |
| **XO** | own-OUT / hysteretic (8) | next open when own OUT holds at c consecutive held closes (counted from the entry session's close, reset per trade); resting catastrophic Hc(1−cat) | cat 0.08–0.35 (0.15); c 1–5 (1) |
| **XE** | **invented 1**: exposure-scaled trail (9) | hard E(1−h); trail Hc(1 − t_eff), t_eff = min(t0, max(tmin, t0 (S·Hc/B₀)^(−γ))) (t0 wins; at entry S·Hc/B₀ < 1 gives t0), ratcheted (after a trim t_eff widens but the level stays) | t0 0.06–0.35 (0.20); γ 0–2 q0.01 (1.0); tmin 0.02–0.10 (0.05); h 0.03–0.20 (0.08); own (0) |
| **XU** | **invented 2**: stale high / time under water (9) | hard E(1−h); next open when the sessions since the last new Hc ≥ U and C ≤ Hc(1−d) | U 5–120 (30); d 0–0.15 (0.05); h 0.03–0.20 (0.08); own (0) |
| XM20/60/120/250 | fixed max hold — negative control (7) | next open at the close of the M-th session held; hard E(1−0.08) | fixed |
| XD-P, XD-T | XD ablations | D_p alone (p 0.10) / D_t alone (N 20), each + catastrophic Hc(1−0.15) | fixed |
| B-D1T | D1-magnitude immediate trail — benchmark | XF(h 0.073, t 0.073, ref 1, own 0) | fixed |
| B-D1N | D1-style profit-conditional trail — benchmark only | level Hh(1 − 0.073), active in a session iff S × level − L − I_s + trim cash > 0 (D1's no-friction net-profit test), re-evaluated each session, absent while inactive; own 1; no other stop | fixed |

- **Rationale of the invented families (written before any run).** XE: under fixed shares the dollar risk per 1% move
  grows with the position's value, so XE tightens the trail as exposure grows (γ = 0: plain trail; γ ≈ 1: roughly a
  constant-dollar trail from the peak value) — the opposite of XRP, whose distance widens with the gain; registered as
  overlapping XF (γ ≈ 0) and XRD (γ ≈ 1), and a champion with γ ≤ 0.05 or |γ − 1| ≤ 0.05 is reported as collapsing to
  them. XU: momentum is the making of new highs; a position that has not made a new held-close high for U sessions
  while sitting d below it has lost its defining property, whatever the size of the decline (a time-and-depth state
  variable, distinct from XP's comparison with the close T sessions ago).
- **Stage 1 parity anchors (component mappings; parity-only modes where noted):** TPL(h, t) = XF(h, t, ref 0, own 1);
  OX = XO(cat 0.15, c 1); X2 = XV defaults; X3 = the XS components **unarmed** (parity-only); X8AND = XD defaults; CX1 =
  {hard 0.08, trail 0.10, own 0}; CX2 = {trend low 20, catastrophic 0.15}; X4 = {catastrophic 0.15 from Hc, trend low 50}
  (not an XT member); X6a = {hard 0.08, trail 0.10, max hold 60}; X6b = {hard 0.08, trail 0.10, stall with Stage 1's
  hurdle rate × T/252} (parity-only hurdle); HS = {hard 0.08, own 0}. Re-entry: R0 = R0, R1 = RF, R2 = RC10, R3 = R3F =
  R3F, R4 = RP50, R5 = RN. Stage 1's tranche-based Z1/Z2 are unrelated to Stage 1b's trims and are not mapped.
- **D1.** The registered VGT D1 `primary` trailing stop is 7.3% (`config/phenotypes/D1/VGT.json`), below the
  post-entry high, updated daily, eligible only when the sale realises a net profit. B-D1T and B-D1N are explicit
  benchmarks; nothing of D1 is changed or applied silently to a candidate.

### 4.3 Re-entry rules (while flat and the campaign is alive)

A campaign is alive after an exit other than an own-OUT exit, a transition or a conversion, until a close at which the
entry's own condition fails (level: state OUT; event/intraday: own OUT true) or an own-OUT condition was seen while long
(Stage 1 semantics); after it dies only a fresh first-entry signal opens a position. An event family's fresh trigger
inside a live campaign re-enters it with its own references under every rule except RN; intraday families keep their
minute trigger (blocked under RN while alive). References: stoppedHigh = Hc of the exited trade; stopAtExit = the resting
level in force in the exit fill's session; trough = lowest close since the exit (the exit session's close included).

| ID | Rule |
|---|---|
| R3F | C > stoppedHigh (Stage 1 template default) |
| RN | nothing while alive (= Stage 1 R5; the no-re-entry reference) |
| RF | fresh event trigger only (= Stage 1 R1; level families: as RN) |
| R0 | the first flat close (immediate; control) |
| RC10 | ≥ 10 sessions since the exit (= Stage 1 R2) |
| RP50 | C ≥ trough + 0.5 (stoppedHigh − trough) (= Stage 1 R4) |
| RS | reclaim the prior stop: a close > stopAtExit after at least one flat close ≤ stopAtExit since the exit (a cross from below) |
| RFL | the E05 zigzag (θ 0.05, b 0.005) confirms a higher swing low at s (return to a rising-floor structure) |
| REF | ER_30 ≥ 0.30 and A_30 ≥ 0.11 at s, after at least one close since the exit (the exit session's close counts) failed it |
| RPM | hysteretic permission: alive from the campaign's first entry until a close with C < SMA200 or C ≤ 0.85 × the highest close since that entry; it **replaces** the entry's own-condition death and survives own-OUT conditions seen while long (an own-OUT exit still ends it); while alive and flat: C > max(C_{s−10..s−1}) |

### 4.4 Sizing overlays (decided at a close with the share quantity fixed there, executed at the next opening trade)

| ID | Rule |
|---|---|
| Z0 | fixed shares (Stage 1 baseline) |
| Z1 | at the first close of each calendar month (its date's month differs from the previous session's), if G_s > 1.05 B₀: sell q = S − B₀/C_s |
| Z2(u, v) | at any close with G_s ≥ B₀(1+u): sell q = S − B₀(1+v)/C_s; grid (u, v) ∈ {(0.25, 0), (0.5, 0), (0.5, 0.25), (1.0, 0), (1.0, 0.5)} |
| Z3(g) | no trim; adds an XRD component with A = g and G = g (a break-even lock at activation) to the policy's exit; g ∈ {$15,000, $25,000, $40,000} |
| ZR | C-ALR only: Stage 1's monthly reset to B₀/raw shares at each month's first opening trade with a constant $100,000 principal (frozen reference) |

Z1/Z2 never buy and never raise L; a position below target is not topped up; S stays > 0. No pilot/gradual-entry
variant is studied (optional in the brief; disclosed).

### 4.5 Controls and benchmarks (identical financing, re-simulated in the Stage 1b engine)

C-AL (always long, one fixed-share lot), C-ALR (Stage 1's always-long reference, ZR), C-ALZ1 (always long + Z1:
passive monthly resized VGT on the candidates' terms), C-SMA, C-DON, C-TSM (Stage 1 controls with their own exits and
RF), C-STOP (always-long entry, XF h 0.08 t 0.10 ref 0 own 0, R3F: a simple fixed stop/re-entry control), C-IDLE.
Buy-and-hold is opportunity-cost context, not a target. Stage 1's P\* and TPL defaults are frozen references.

### 4.6 Policies and identifiers

A policy = (entry, entry parameters, exit family or fixed exit, exit parameters, re-entry rule, sizing). Its canonical
key serialises these with parameters quantised and sorted by name; its ID is `<entry>/<exit>/<rule>/<sizing>-` + the
first 10 hex digits of the key's sha256. Two policies are identical iff their keys are equal.

## 5. Policy switching and the executable annual selector (brief §3)

### 5.1 Principle

Selection model and account state are separate. An **executable path** is one simulated account in which the active
policy changes only at a boundary b (a fold's development end) to the policy whose selection record was sealed using
data ≤ b. Signal arrays are position-independent and computed from 2016 (past-only warm-up); **no position, stop
reference, campaign or pending order is inherited from a run of a policy that was not active.** Every path starts flat
at the close of 2019-12-31 with the fold-A policy. The selection computation is assumed to finish between b's close and
b+1's open (every boundary is followed by at least one non-trading day).

### 5.2 Transition conventions

- **S1 flat-then-adopt (primary).** At the close of b, after the old policy's close processing: the old policy's
  pending entries, trims and campaign are cancelled. If long, an exit is ordered for b+1's opening trade (+ delay) with
  the old policy's reason if it decided an exit at b's close, else `transition`. The new policy starts with no
  campaign; if the account is flat at b's close its first decision is b's close (entry at b+1's open), else b+1's close
  (no entry in the exit session). An intraday new policy's reference starts as after an exit at the transition fill
  (triggering from b+2), or as at a run start over b's minutes if flat. An identical policy (§4.6) is not transitioned.
  A level policy whose state is IN at the first decision enters immediately (disclosed: its own continuous run might
  have waited for a re-entry rule).
- **S2 continue-old (sensitivity, required by the verdict).** A position open at b stays under the old policy's exits,
  stops, trims and XRD/Z3 components until its own exit; no re-entry of the old campaign; the new policy is adopted for
  new entries from that exit session's close; a position still open at the next boundary continues the same way. S2 ≡
  S1 when flat at b.
- **S3 netted re-entry (sensitivity).** Applies only if the old policy has no pending exit at b's close and the new
  policy's fresh first-entry rule holds at b as if flat with no campaign (level: state IN; event: trigger at b;
  intraday: never). Then at b+1's opening trade x (+ delay), **before** the gap check, the position is converted to the
  target S' = B₀/C_b shares: if S ≥ S' sell S − S' at the sell price and rebook S' at x; else rebook S at x and buy
  S' − S at the buy price; the old trade closes at x (`conversion`, gap-flagged if the open ≤ the old level) with friction
  only on the traded difference; the new trade has E = Hc = Hh = x, principal (and L) = its cost at x, a new campaign
  and fresh stop references. Under a delay, the old stop is live before open + k and if it fires S1 applies. Otherwise
  S1 applies. Event and intraday policies rarely convert (counted and disclosed).
- **Undefined P\*_F.** The window's policy is C-IDLE: under S1/S3 a transition to flat at b+1 and no entry until the
  next boundary; under S2 the open position runs to its own exit, then flat. The same rule applies to Π-NET, Π-P0, the
  static path and Π-noE06.

### 5.3 What is reported for every executable path

The trade and event ledgers (transitions, conversions, cancelled orders), W_F = liquidation mark at e_F − at b_F,
aggregate (= end liquidation mark), realised vs unrealised at each boundary, interest (trade and flat), friction, the
end liquidation, minute and daily drawdowns (all bases) per window and chained, the transitions with their P&L, whether
the pick changed at each boundary and the gross exposure each reset removed, and the difference to the non-executable
splice of the same picks with its decomposition (carried-lot increment, transition gap and friction, re-entry timing
after adoption, interest).

### 5.4 Non-executable splice (diagnostic only)

Stage 1's Π: the window increments of continuous runs from 2017-01-03 of each fold's pick, chained; the run carried
into each window its open lot with that lot's fixed share count (exposure drift), stop references (E, Hc), campaign
and re-entry state and any pending order — all from a history of a policy that was not selected before b. Its chained
drawdown offsets each window's non-liquidation minute marks to start at the previous window's end mark, the peak
carried. Reported for Stage 1's and Stage 1b's picks; never a verdict object.

### 5.5 Repair of Stage 1 (stage `repair`, after develop-H)

Stage 1's sealed picks are verified read-only from its sealed selection records under its own rule (P\* = the
champion with the highest neighbourhood median; E06-9ee2ce7bd5, E04-86b6d59a31, E04-b4a27ac53b, E06-47640253c0;
H: E06-4978efef20). They are (a) re-simulated continuously with Stage 1's engine (imported) and the Stage 1b engine in
fixed-slot mode: every window's V and window DD, Σ V = +$253, Π's DD $63,569, the carried E04 lot's −$33,954 2022
increment, its $236,944 value at 2021-12-31 and its lifetime net reproduced to the cent against the sealed records;
(b) run as executable paths under S1, S2 and S3 in both financing modes; (c) scored with Stage 1's own frozen T and E
items as well as Stage 1b's §11 items (descriptive). The fold-C pick's March 2020 → January 2022 lot is traced (decision,
fill, exit, lifetime net, unrealised gain at 2021-12-31, the 2022 increment, peak value, L/G) with counterfactual Z1,
Z2 (5) and Z3 (3) overlays on the same policy — counterfactuals, neither original trades nor validation.

## 6. Histories and folds (frozen before any result)

| History | Development data | Evaluation window (b, e] | Note |
|---|---|---|---|
| A | 2016-01-04 → 2019-12-31 | (2019-12-31, 2020-12-31] | crash and rebound |
| B | → 2020-12-31 | (2020-12-31, 2021-12-31] | sustained advance |
| C | → 2021-12-31 | (2021-12-31, 2022-12-30] | bear / downtrend |
| D | → 2022-12-30 | (2022-12-30, 2023-12-29] | calm recovery |
| H | → 2023-12-29 | none | in-sample description only |

Development metrics cover decisions from 2017-01-03 to the development end. "Held in ≥ 3 calendar years" means every
development year in fold A and 3 of 6 in fold D (disclosed). No within-history validation split is used (Study 1 found
validation-based selection worse). Secondary multi-year exercise: the **static path** — P\*_A held without reselection
from 2019-12-31 to 2023-12-29.

## 7. The layered research design (per history; identical procedure in A, B, C, D, H)

### 7.1 Common search mechanics

- Box mapping from the unit cube: continuous lo + u(hi − lo), quantised; integer/categorical min(hi, ⌊lo + u(hi − lo +
  1)⌋). Sobol points (Joe–Kuo, dimensions 1–16; dimensions 1–8 identical to Stage 1's generator) with a random digital
  shift; seed = first 8 hex digits of sha256(label) → mulberry32 → one 32-bit mask per dimension. Labels:
  `study3b|<history>|<cell>|global`, `…|local|<k>`, `…|joint|<centerIndex>`, with `<cell>` = `LB|<entry>|<exit>` for L-B
  cells, `P01`…`P12` for pairings, and a `|wide` suffix for a widened search (§7.3). Identical quantised vectors are
  evaluated once (first index kept; duplicates counted).
- **Center feasibility:** development minute DD ≤ $35,000; ≥ 6 closed trades; ≥ 3 campaigns (first entries, an open
  one included); a position held at a close in ≥ 3 calendar years; development net > 0.
- **Local refinement:** seeds = the 2 best feasible, trade-path-distinct points by development net and the 2 best by
  center RoD (net / max(minute DD, $10,000)), distinct from each other (next best taken); 32 shifted-Sobol points each
  over ±10% of each continuous/integer range (discrete dimensions — binaries, categoricals — kept), indices G + 32k + j.
- **Shortlist:** 8 best feasible trade-path-distinct points of global ∪ local by net and 8 by center RoD, alternating
  and de-duplicated by path until 16 (ties by index).
- **Joint neighbourhood J32** of a shortlisted center: the center and 32 draws, each continuous/integer dimension
  uniform in ±10% of its range around the center (clamped, quantised; discrete dimensions fixed), from mulberry32 with
  the `joint` label; the same draws serve every re-entry and sizing variant of that center. φ = share of the 33 points
  with net > 0 **and** minute DD ≤ $35,000.
- **Scores:** primary **RoD** = median over the 33 points of net / max(minute DD, $10,000); secondary **NET** = median
  over the 33 points of net. A **champion** is the shortlisted center with the highest score among those with φ ≥ 0.75
  and 10 bps center net > 0 (ties: lower index); none → no champion (recorded).
- Per-dimension coverage (points per dimension) and duplicate rates are recorded per cell.

### 7.2 L-A — broad screening (descriptive; P0 only)

Matrix: the 13 panel entries at defaults × {the 11 optimised exit families at defaults, XF-T default, XM20/60/120/250,
XD-P, XD-T, B-D1T, B-D1N} × R3F × Z0, plus every entry × XF default under the 9 other re-entry rules. Read by row
(common entry) and column (common exit). Recorded per cell: development net, DD, trades, campaigns, re-entry
**opportunities** (non-own-OUT exits with the campaign alive) and re-entries, structural exits at the first held close,
exposure, duplicate trade paths (duplicate mechanisms).

### 7.3 L-B — exit-family optimisation (substantial, equal budgets)

For each of the 11 optimised families (XF, XV, XS, XT, XRP, XRD, XD, XP, XO, XE, XU) × each entry control **E06, E05,
E03, C-SMA** at Stage 1 default entry parameters, R3F, Z0: 1,024 global + 128 local + 16 × 33 (32 joint draws and the
10 bps center) = **1,680 planned evaluations per cell** (44 cells). Reported: the best-training point, the RoD and NET
champions, the shortlist (robust alternatives), the full archive. **Widening (training-only, predeclared):** if the
cell's RoD champion has a continuous **exit** parameter (quantum ≠ 1; entry boxes are Stage 1's and are not widened)
within 5% of the range from a non-zero box edge, the cell is searched once more (`|wide`) with that edge moved outward
by 50% of the range, within natural limits (fractions [0.001, 0.95], ρ [0.01, 1], γ [0, 5], k [0.1, 20], A and G
[$500, $500,000], m [−0.5, 0.5]); the widened result replaces the original only if its RoD champion scores higher (for
both pipelines). The same rule applies to L-C step 1 (with its own `|wide` cell). Logged; budgeted as worst case.

### 7.4 L-C — bounded joint pairings, then re-entry

Predeclared pairings (entry × exit, joint search over entry and exit parameters, R3F, Z0):

| ID | Pairing | Purpose |
|---|---|---|
| P01 | E06 × XS | calm advance + structural floor |
| P02 | E06 × XV | calm advance + volatility trail |
| P03 | E06 × XF-T | calm advance + protective tighter trail + re-arming |
| P04 | E04 × XF | CUSUM (Stage 1's fold B/C family) with its nearest template |
| P05 | E05 × XF | rising floor + price stops |
| P06 | E03 × XT | directional efficiency + two-layer |
| P07 | E11 × XF-T | renewable campaign + tight trail |
| P08 | E09 × XF | trailing buy + trailing sell |
| P09 | C-SMA × XF | simple control |
| P10 | E02 × XE | time-series drift + invented exposure-scaled exit |
| P11 | E07 × XD | breakout + damage combination |
| P12 | adaptive | the L-B cell (entry control × exit family) with the highest RoD champion score in this history whose (entry, exit) — XF-T counted as XF — is not in P01–P11; chosen once by RoD and used by both pipelines; absent if no L-B cell has a champion |

Step 1 (joint search): 2,048 global + 128 local + 16 × 33 = **2,704** planned per pairing. A pairing without a step-1
champion is eliminated (training-only, logged, kept in the denominator). Step 2 (re-entry, only after step 1, per
pipeline): if the step-1 champion has ≥ 5 re-entry opportunities in development, it is scored under each of the 9 other
re-entry rules with the same J32 draws and its own 10 bps check (9 × 34 = **306**); the pairing's policy becomes the
best-scoring rule among those meeting the champion conditions (center feasible, φ ≥ 0.75, 10 bps net > 0), R3F on
ties; with < 5 opportunities R3F is kept (logged). Per rule the share of re-entries caused by the rule vs a fresh/minute
trigger is reported.

### 7.5 L-D — sizing overlay (small, preselected)

Per pipeline, on the 3 pairings with the highest step-2 scores: the 9 sizing variants (Z1; Z2 × 5; Z3 × 3), each with
the same J32 draws and a 10 bps check (9 × 34 = **306** per pairing). A variant replaces Z0 only if it meets the
champion conditions, scores strictly higher on the pipeline's objective **and** keeps price gain per notional
dollar-day ≥ Z0's (ties → Z0; among variants the listed order). Reported: price gain per notional dollar-day, interest per
borrowed dollar-day, Z0 scaled to the variant's f_MV for the price term only, and the upside given up per up-leg.

### 7.6 The history's picks

**P\*** (primary) = the highest RoD among the pairings' final policies (ties: lower pairing ID). **P\*-NET** = the same
pipeline with NET in every champion, re-entry and sizing choice. **P0** (no search) = the L-A cell (panel entry × an
optimised family's default exit, R3F, Z0) with the highest development net among feasible centers. **P\*-noE06**
(descriptive) = the highest RoD among final policies of pairings whose entry is not E06. All are sealed in the history's
record before any evaluation window is loaded.

### 7.7 Budget (code-enforced, frozen before results; measured synthetic timing 0.6–1.3 ms per evaluation on 14 workers)

Planned per history: L-A 13 × 20 + 13 × 9 = **377**; L-B 44 × 1,680 = **73,920**; L-B widening worst case **73,920**;
L-C 12 × (2,704 + 306) = **36,120**; L-C widening worst case 12 × 2,704 = **32,448**; L-D 2 pipelines × 3 × 306 =
**1,836**; P\*-NET re-entry 12 × 306 = **3,672** → **222,293** per history (cap = planned), **1,111,465** for the five.
`repair`, `evaluate` and `robustness` have planned counts computed from their enumerated runs (§5.5, §9, §8/§10) and
recorded; each refuses to start if its plan exceeds the recorded cap and to seal if its used count exceeds its plan.
No other run is allowed; any later run needs an amendment, is exploratory and excluded from the verdict and the
nomination. Evaluations are deterministic and parallelised over worker threads (results merged in task order); every
evaluated point is archived (parameters, index, stage, net, price gain, interest, friction, trades, campaigns,
re-entries, re-entry opportunities, years held, minute/daily DD, Ḡ, peak G, dollar-days, worst/best trade, exit-reason
mix, trims, path hash). P12's double selection (best of 44 cells, then searched again) is counted in the multiplicity
register.

## 8. Neighbourhoods (primary robustness deliverable)

For P\*_A..P\*_D, P\*_H, the P\*-NET picks and each pairing's H final policy:

- **One at a time:** ±1 and ±2 steps of 5% of each continuous/integer range (a departure from "grid steps": the
  quantum is 0.1 percentage point, too fine to perturb; integers ≥ 1 step; a point clamped onto the center is dropped
  and the denominator shrinks); binaries and categoricals flipped one at a time to each other value. Unique vectors and
  the changes in entry/exit paths are reported.
- **Joint J128:** 128 draws uniform in ±10% of each continuous/integer range (seed `study3b|<policyId>|J128`); re-entry
  rule, sizing and discrete dimensions fixed.
- **Reported separately:** min, P10, P25, median, P75, P90, max of net; minute and daily DD; peak G; time long; stop and
  re-entry counts; (i) the net distribution, (ii) share net > 0, (iii) share DD ≤ $35,000, (iv) share both, (v)
  retention = neighbourhood median / center net, (vi) interaction = share of J128 nets outside the OAT envelope; the
  share of path-identical neighbours and φ over path-distinct neighbours; per major up-leg (§10) the share of neighbours
  capturing it (capture ≥ 50%, Stage 1 §13 formula) and each neighbour's net excluding its largest trade (measured,
  never subtracted from the reported net).
- Fold picks' neighbourhoods are computed on their **development** data (training-fitted center) and, separately and
  labelled post-selection, over their next window; the center is never modified after either.
- **Perturbed executable paths (rubric f):** 128 S1 paths; path j replaces every fold pick by its j-th J128 draw.

## 9. Evaluation (stage `evaluate`, after develop-A..D, develop-H and repair are sealed)

- **Π1** = the S1 executable path of P\*_A..P\*_D (**the verdict object**); **Π1-S2** (required by the verdict); Π1-S3
  (netted re-entry); Π-NET (P\*-NET picks, S1); Π-P0 (P0 picks, S1); Π-noE06 (descriptive); the static path; Stage 1b
  picks' non-executable splice; continuous runs from 2017-01-03 of every pick (within-strategy window increments); each
  pick's development-year increments from a flat start each year (descriptive).
- **Controls** (C-AL, C-ALR, C-ALZ1, C-SMA, C-DON, C-TSM, C-STOP, C-IDLE), all in net-debit mode: (1) flat-start at
  2019-12-31, continuous; (2) **annual-reset paths** — S1 forced liquidation at each b+1 and re-entry on the control's
  own signal, with the sizing overlay of Π1's policy in that window (Z0 if none).
- **Exposure-matched benchmark (primary):** B_F = f_MV,F(Π1) × (price gain − friction)_F(C-ALR, flat-start) −
  interest_F(Π1), so financing cancels. Diagnostics, labelled ex-post matches: v1.0's f_MV × W_F(C-ALR); Stage 1's
  principal-day version; C-ALR scaled to Π1's window minute DD.
- **Descriptive comparison with Stage 1** (brief §1): Π1 vs Stage 1's S1 executable path (from `repair`): Σ W, min W,
  chained DD, 2022.
- Per window and chained: every §5.3 item, regime notes, longest underwater, worst trade, loss streak, restarts,
  turnover, risk per notional dollar-day, up-legs captured, giveback vs final trade profit; calendar traces of the
  March 2020 entry and January 2022 exit of the repair lot and of every 2022 entry; the negative-cash interest and
  idle-cash comparison between the two financing modes.
- **Guards inside `evaluate`:** prefix invariance and poisoned-future tests at each boundary 2019-12-31…2022-12-30, the
  b-mark of each sealed pick (its continuous run on the full data reproduces its sealed development liquidation mark
  and trade path), executable-path prefix identity, and fast-vs-reference parity (redacted) of every evaluate path.

## 10. Robustness and stresses (stage `robustness`)

Π1 and P\*_H (full 2017–2023, in-sample for P\*_H) re-simulated without reselection at: 0/2/10 bps; 8%/14%; stop slippage
10/25/50 bps; entry slippage 10/25 bps; opening-fill slippage 50 bps; delays +1/+5 minutes; missing bars (seeded 1% and
5% of non-first minutes, seed `study3b|missing|<rate>`); plus the §8 neighbourhoods and perturbed paths. **Trend legs**
(Stage 1 §13: zigzag on closes, 10% reversal, up-legs ≥ 15% within 2017-01-03 → 2023-12-29): capture, entry delay, idle
share, lost post-stop gain per leg. **XV crisis traces** (ratcheted vs un-ratcheted levels, stop jumps; late 2018,
early 2020, 2022) for every XV-containing finalist, else XV defaults on E06. Margin calls and house maintenance are not
modelled (the slot has no own equity); overnight gaps through stops are simulated at the open; liquidity,
forced-liquidation timing and rate changes beyond 8–14% are omitted risks.

## 11. Verdict rubric (frozen; labels applied in this order)

Let W_F be Π1's increment in window F (A 2020, B 2021, C 2022, D 2023); "positive" = W_F ≥ +$2,000. Items (b), (c)
and (e) are evaluated for Π1 and for Π1-S2.

1. **Invalid** if (a) fails: any parity failure (fast = independent reference within tolerance; fast = Stage 1 engine on
   Stage 1 configurations), any §3.2 identity on a sealed ledger, any executability assertion (a position before its
   policy entered outside S2, two entries in a session, an entry in an exit session, a same-close fill), any door
   refusal or retained bar after the cap, or any `evaluate` guard.
2. **Insufficient evidence** if (d) fails: Π1 has < 6 exits by its policies' own rules (transitions, conversions and the
   end liquidation excluded), or < 4 first entries, or first entries in < 3 distinct windows, or a position (entered or
   carried) in < 3 windows, or P\* undefined in ≥ 2 folds.
3. **Risk-incompatible** if (c) fails for Π1: any window minute DD > $35,000 or Π1's chained minute DD > $35,000.
4. **No demonstrated edge** if any of (failed items listed):
   (b) Σ W_F < +$20,000, or positive in < 3 windows, or min W_F < −$15,000;
   (e) Σ (W_F − B_F) < +$10,000, or W_F − B_F ≥ +$2,000 in < 2 windows, or for any C ∈ {C-SMA, C-DON, C-TSM}:
   Σ W_F − max(Σ W_F(C continuous), Σ W_F(C annual-reset)) < +$5,000;
   (f) < 75% of the 128 perturbed paths have Σ W > 0 and chained minute DD ≤ $35,000, or their median Σ W < 50% of Π1's,
   or Π1's end liquidation mark ≤ 0 under any of 10 bps, 14%, 25 bps stop slippage, +1 minute;
   (g) Σ W_F − the largest campaign's contribution < +$5,000, or Σ W_F − the largest up-leg's contribution (Π1's
   liquidation-mark change over (max(t0, 2019-12-31), t1] of the leg with the largest change) < +$5,000, or the
   largest campaign giveback inside the windows > $35,000;
   or (b), (c) or (e) fails for Π1-S2 → "no demonstrated edge (transition-convention-dependent)".
5. Otherwise **historically promising but unvalidated** (never deployable, never registered); qualified
   "(objective-dependent)" if Π-NET would not also reach this label.

The same items are computed descriptively for Π1-S3, Π-NET, Π-P0, Π-noE06, the static path and Stage 1's executable
paths; their labels appear in the verdict headline beside Π1's. A drawdown-matched comparison with the controls is
reported; raw dollars govern. **Nomination:** only if Π1's label is "historically promising" is P\*_H (its sealed policy
ID, re-entry rule and sizing) nominated for a later, separately authorised test; otherwise "none". No descriptive
path, pairing policy or control may be nominated; every report quotes the total number of configurations evaluated.

## 12. Stages, parity, fixtures (write-once, in this order, code-enforced)

| Stage | Content | Door |
|---|---|---|
| `audit` | data QA, file/loaded-bar hashes per history end, Stage 1 tree manifest, protected-input manifest, baseline test status | ≤ 2023-12-29 (no strategy run) |
| `freeze-protocol` | sha256 of PROTOCOL.md, EXPERIMENT_MATRIX.json, the brief, both disposition files | none |
| `parity` | see below; records only field names, difference counts, \|Δ\| and coverage counters (no net, mark, DD or P&L level) | ≤ 2019-12-31 |
| `freeze-code` | sha256 of the import closure of `src/study3-vgt-momentum-stage1b/main.ts` (incl. imported Stage 1 and `src/lib` files and the worker) + tests + package.json, package-lock.json, tsconfig.json | none |
| `develop-A` … `develop-D`, `develop-H` | §7, sealed | development end |
| `repair` | §5.5 | ≤ 2023-12-29 |
| `evaluate` | §9 with its guards | ≤ 2023-12-29 |
| `robustness` | §8, §10 | ≤ 2023-12-29 |
| `analysis` | §11 rubric, ledgers and tables from sealed records only | sealed records |

**Parity** (fold-A development data, 2016-01-04 → 2019-12-31): (a) Stage 1b fast (fixed-slot mode) = Stage 1 engine
on every Stage 1 family default × {TPL, OX, CX1, CX2, X2, X3, X4, X8AND, X6a, X6b, HS} × {R3F, R0, R1, R2, R4, R5},
64 random TPL vectors per family, the controls C-SMA, C-DON, C-TSM, C-AL, C-ALR, C-IDLE, and TPL under delays +1/+5,
stop and entry slippage 25 bps and 10 bps costs. (b) Stage 1b fast = the independent reference (both financing modes):
every optimised family default × {E06, E05, E09} × all 10 re-entry rules; ≥ 64 random vectors over the full box of
every optimised family (categoricals enumerated; entries cycling E06, E05, E09, C-SMA); every sizing variant on
representative policies; the fixed exits; S1/S2/S3 paths with boundaries 2017-12-29 and 2018-12-31 over a policy-pair
matrix (level → level, level → event, event → intraday, intraday → level, Z1 → Z0 with L < B₀, identical ID). The
reference is written in a separate agent context from this protocol and `types.ts` only, without reading the fast
engine, with an explicit per-event cash/debit/interest ledger. **Tolerances:** identical trade paths (entry/exit
session and bar, kind, reason); \|Δ\| ≤ $10⁻⁶ on every trade's money fields, end marks, drawdowns and dollar-days
(relative 10⁻¹² for prices). (c) Branch-coverage counters (each stop component binding, gap and fill-bar stops,
delayed fills, closing-print fills, trims with L → 0, both S3 branches, S2 across two boundaries, every re-entry rule
firing), each > 0 over parity ∪ fixtures. (d) Prefix invariance, poisoned future and executable-path prefix tests at
2017-12-29 and 2018-12-31. (e) Door refusals.

**Fixtures** (synthetic sessions; expected values in closed form inside the tests for F1–F3, F6–F10, F13, F14, F19;
invariants and fast = reference for the rest): F1 gap-down open through the stop (fill = open); F2 fill-bar low ≤ level
(fill = level); F3 closing print ≤ an untriggered stop, next-open gap; F4 levels reset above the close (XF ref 1, XRD
interest accrual, B-D1N) → `level above prior close`; F5 +1/+5-minute delays with a stop inside the delay; F6
Friday → Monday and holiday interest (3- and 4-day segments); F7 partial trim with L partly repaid; F8 trims driving L
to 0 and the rest to cash, then exit; F9 trim pending on a gap-down open and trim + same-session stop; F10 +100% then
−30% under Z0, Z1, each Z2, Z3 (M, L, I, S, G, marks, every DD basis); F11 long flat (net-debit interest on a carried
loss; XP stall; XRD interest-driven exit); F12 −20% opening gap through XF/XV/XRD/XE/XU levels; F13 S1/S2/S3 at a
boundary in a crash (gap through the old stop at b+1), in a gain (S3 sell branch), after a loss (S3 buy branch), with a
pending close-decided exit at b, a pending minute decision at b, a pending trim at b, b+1 after New Year's Day, an
identical re-selection, S2 across two boundaries; F14 exit and entry in one session blocked, minute trigger blocked in an
exit session; F15 campaign death (own OUT seen while long; RPM replacement and expiry) and every re-entry rule on a hand
path (RS cross from below); F16 XE with S·Hc/B₀ < 1 and tmin near t0; F17 XS floor above the price at entry (arming);
F18 XO count across a re-entry; F19 a requested end > 2023-12-29 refused before any read, the retained-bar assertion;
F20 identities (i)–(vii) on every fixture; F21 prefix invariance on a synthetic path; F22 poisoned future.

Every record holds git HEAD, `git status --porcelain` and the diff since `db6a3ec` outside the Stage 1b namespace (must
be empty), both freeze hashes, its door, payload sha256s, its planned and used evaluation counts, runtime, worker count
and peak RSS, and its own body hash, and verifies its predecessors. A post-freeze defect that violates a predeclared
test or identity is fixed only by an append-only amendment, a re-hashed code freeze and reruns of every affected stage
with original seeds (`<stage>-rerun-<n>`), keeping both records.

## 13. Reviews, disclosures, limits

Two independent read-only methodology reviews preceded this version; an independent read-only code-and-evidence audit
follows the results; all are kept verbatim with dispositions in `reviews/`. Limits: one ETF, one secular bull market
with three declines; dependent annual windows; inspected history and designer knowledge; no bid/ask data (slippage is
synthetic stress); no margin-call modelling; price-only accounting; simple interest (monthly broker compounding, ≈0.5%
of annual interest, omitted); closing-print fills of late minute decisions are optimistic; minute-close drawdown
sampling; parameter draws are not independent market observations; correlated configurations are not independent
evidence (distinct mechanisms and configurations are counted separately); inert dimensions (e.g. XF's hard stop when
t ≤ h) inflate neighbourhood robustness, which is why path-distinct shares are reported.
