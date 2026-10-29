# MECHANISM CATALOG — Stage 1c (part of the protocol freeze)

Human-readable companion to `EXPERIMENT_MATRIX.json` (which is authoritative for boxes, quanta and defaults). "Source"
says where the mechanism's code lives and whether Stage 1c changes it. "Previously optimised" values are Stage 1b's
sealed in-sample or fold results, quoted only so that the reader can see what earlier studies found; **no Stage 1c
search is seeded or centred on them** (every cell starts from the family defaults below and a space-filling design).

## 1. Dependencies shared by every mechanism

- Features and signals: `src/study3-vgt-momentum/features.ts`, `signals.ts` (Stage 1, imported, unchanged), computed
  position-independently from 2016-01-04 with past-only windows (prefix-invariance guarded).
- Fills: D1's `firstTradeAfterDecision`, `firstTradeFrom`, `priceAt`, `timeAt`
  (`src/shared-margin-portfolio/strategy.ts`, imported). Drawdown tracker `Tracker.updateStrict`
  (`src/multi-etf-allocator/engine.ts`, imported).
- Engine semantics: Stage 1b `ENGINE_CONTRACT.md` §1–§10 + A1; Stage 1c additions §11–§14.

## 2. Entry families (12; Stage 1 code, unchanged; no Stage 1c variant)

| ID | Role | Kind | Own OUT | Box (default) | Stage 1b note |
|---|---|---|---|---|---|
| E01 | peak proximity | level | state OUT (drawdown from 250-session high ≥ d_in + d_gap) | d_in 0–0.08 (0.02); d_gap 0.01–0.20 (0.08) | screened only |
| E02 | financing-hurdle drift | level | annualised N-return < a_in − a_gap | N 20–250 (126); a_in 0–0.6 (0.2); a_gap 0–0.5 (0.2) | P10 with XE (NET H pick) |
| E03 | directional efficiency | level | ER_N ≤ e_in − e_gap | N 10–120 (30); e_in 0.05–0.6 q0.01 (0.3); e_gap 0–0.6 q0.01 (0.3) | fold B, C picks (XV, XT) |
| E04 | CUSUM drift | level | downward CUSUM ≥ h_out | kappa 0–0.5 q0.01 (0.25); h_in, h_out 1–8 q0.1 (4, 4) | Stage 1 fold B/C pick; 1b NET B/C |
| E05 | rising floor | event | close < last swing low (1 − b) | theta 0.02–0.15 (0.05); b 0–0.03 (0.005) | P05 with XF |
| E06 | calm advance | level | σ10 ≥ v_in + v_gap or C < C_{s−N} | v_in 0.08–0.4 (0.2); v_gap 0.02–0.4 (0.15); N 20–250 (50) | fold A, D, H picks |
| E07 | breakout acceptance | event | close < 20-session low | N 10–250 (50); A 0–10 (3) | P11 with XD |
| E08 | compression → expansion | event | close < recorded box bottom | N 10–60 (20); c 0.03–0.15 (0.08) | screened only |
| E09 | upward trailing buy (intraday) | intraday | close < 20-session low | Y 0.005–0.08 (0.03) | P08; default exceeded risk gates (disclosed; not demoted) |
| E10 | breakout trailing buy (intraday) | intraday | close < 20-session low | Yb 0–0.03 (0) | screened only |
| E11 | durable permission / renewable campaign | event | permission off (drawdown ≥ D from the run high) | D 0.05–0.3 (0.15); n 2–30 (5) | P07 with XF-T |
| E12 | shallow-pullback continuation | event | close < recorded pullback low | u 0.05–0.5 (0.2); p 0.02–0.12 (0.05) | screened only |

Mandatory (brief §3): E06, E05, E03, E08, E02, E04, E11. Extras by the predeclared inclusion rule (every other
executable Stage 1 momentum family): E01, E07, E09, E10, E12. No entry is combined with another.

## 3. Exit families (13) and own-OUT contracts (25)

| ID | Mechanism | Source / status | Box without `own` (default) |
|---|---|---|---|
| XF | hard E(1−h) + trail R(1−t), R = Hc (ref 0) or Hh (ref 1) | Stage 1b, unchanged; `or` contract = Stage 1's TPL | h 0.02–0.20 (0.08); t 0.03–0.35 (0.10); ref {0,1} (0) |
| XF-T | XF on the tight trail box (the D1-magnitude unconditional trail; B-D1T = h 0.073, t 0.073, ref 1) | Stage 1b, unchanged | t 0.03–0.12 (0.08); else as XF |
| XV | volatility trail Hc(1 − clamp(k ATR_n/Hc, dmin, dmin+dgap)), ratcheted + hard | Stage 1b (Stage 1 X2) | k 1–8 q0.1 (3); n 5–60 (20); dmin 0.02–0.10 (0.04); dgap 0.02–0.30 (0.11); h 0.03–0.20 (0.08) |
| XS | rising floor: next open when C < F(1−b), armed after a held close above it; emergency hard | Stage 1b (Stage 1 X3, armed) | theta 0.02–0.15 (0.05); b 0–0.03 (0.005); h 0.03–0.20 (0.10) |
| XT | two-layer: catastrophic hard + trend low (C < min of N prior closes) + ratchet Hc(1−t2) once Hc ≥ E(1+g) | Stage 1b (Stage 1 X4 extended) | h 0.05–0.25 (0.15); N 5–120 (50); g 0.03–0.60 (0.20); t2 0.03–0.25 (0.10); rat {0,1} (1) |
| XRP | staged price retention: once Hc ≥ E(1+a), E + ρ(Hc − E) + hard | Stage 1b (Stage 1 X5a) | h 0.03–0.20 (0.08); a 0.03–0.60 (0.15); ρ 0.2–0.9 q0.01 (0.5) |
| XRD | dollar giveback: once P\* ≥ A, the price at P = P\* − G + hard | Stage 1b | h 0.03–0.20 (0.08); A $2k–$80k q$500 ($20k); G $5k–$60k q$500 ($15k) |
| XD | price damage C ≤ Hc(1−p) × trend damage C < min(N); mode 0 OR, 1 AND, 2 AND above SMA200 else OR; catastrophic Hc(1−cat) | Stage 1b (Stage 1 X8AND/X8OR) | p 0.03–0.25 (0.10); N 5–120 (20); mode {0,1,2} (1); cat 0.08–0.30 (0.15) |
| XP | financing-aware stall (time/progress exit) + hard | Stage 1b | T 5–120 (20); m −0.05–0.05 (0.01); d 0–0.10 (0); h 0.03–0.20 (0.08) |
| XO | own OUT at c consecutive held closes + catastrophic Hc(1−cat) | Stage 1b (Stage 1 OX) — the **retain** contract | cat 0.08–0.35 (0.15); c 1–5 (1) |
| XE | exposure-scaled trail (invented in 1b) + hard | Stage 1b | t0 0.06–0.35 (0.20); γ 0–2 q0.01 (1); tmin 0.02–0.10 (0.05); h 0.03–0.20 (0.08) |
| XU | stale high (invented in 1b) + hard | Stage 1b | U 5–120 (30); d 0–0.15 (0.05); h 0.03–0.20 (0.08) |
| XN | **new**: D1 profit-conditional trail Hh(1−t) active only when net-profitable (B-D1N) + hard E(1−h) | Stage 1c variant of Stage 1b's fixed benchmark B-D1N; deviations from D1: interest in the profit test through the deciding close (D1: through the applying session's date), and a hard stop live from the fill bar (D1: none, and no exit check on the entry session) | t 0.03–0.15 (0.073 = D1); h 0.05–0.40 (0.40) |

**Contracts.** `rep` (own 0): the family alone decides exits. `or` (own 1): the family's exits OR the entry's own OUT at
a held close (next open; frozen reason priority own out > trend > damage > structural > stale > max hold > stall; one
exit per trade, never doubled). `ret` (XO only): the entry's own OUT retained as the exit with only a catastrophic trail.
A cell's own exit is therefore never hidden (`or`/`ret`) and never silently added (`rep`). Because every entry has an
own OUT, `rep` and `or` are distinct for every entry. Overlaps disclosed: XF-T ⊂ XF (box); XE with γ ≈ 0 ≈ XF trail,
γ ≈ 1 ≈ XRD; E05 × XS with equal θ, b makes the floor exit equal to E05's own OUT (then `rep` ≈ `or`).

**Brief §4 name mapping.** XV/X2 → XV; X3 → XS; XT/X4 → XT; X5a → XRP; X8AND/X8OR/trend damage → XD (modes 1/0/2);
TPL/fixed trailing → XF `or` (source OUT behaviour kept) and XF `rep`; meaningful Stage 1b variants → XP, XU, XE, XRD,
XO; the D1 reference tight trail → XF-T (unconditional) and XN (profit-conditional, D1's own form).

**Stop reference.** Trails use Hc (highest held **close**) unless the family says Hh (XF/XF-T ref 1, XN): Hh = max(E,
minute highs from the fill bar, held closes) — D1 `primary` uses the intraday high. Both are past-only (a session's own
prices never move that session's stop). The famous Stage 1 E04 lot (March 2020 → January 2022, +$83,131 lifetime)
exited by E04's own CUSUM OUT (Stage 1 TPL own OR), not by its 24.6% trail; its 2022 giveback is mark-to-market, not a
lifetime loss.

**Previously optimised (Stage 1b, sealed; not used to seed Stage 1c).** Fold picks: A E06 × XV + Z1, B E03 × XV + RC10
+ Z2(0.5,0), C E03 × XT + Z1 (h 0.171, N 106, g 0.255, t2 0.052), D E06 × XV + RC10 + Z1; H E06 × XT + Z1 (in-sample
+$112,782 / $15,031); NET picks A E06 × XT, B–C E04 × XF (t 0.191 ref 1 own 1), D E06 × XT, H E02 × XE
(`research/study3-vgt-momentum-stage1b/JOINT_COMBINATIONS.md`, `results/tables/picks.md`).

## 4. Protection rules (new in Stage 1c; operational text `ENGINE_CONTRACT.md` §11)

### 4.1 What D1 `primary` actually does (read-only inspection of the frozen code)

`config/phenotypes/D1/VGT.json` (sha256 `3e77a419…`): X 21.6%, trailing buy 0.3%, **trailing stop 7.3%**, **maximum
hold 8 days**, lookback 74 sessions, intraday loss buffer 2.9%, pullback 9.0%, continuation window 60. Code
`src/app/allIn-trailingBuy-postExitContinuation.ts` (sha256 `de0935c3…`):

- **Maximum losing hold** (lines 199–222): `daysHeld = (session.time − position.entryTimestamp) / day`, both New York
  session dates at UTC midnight; due iff `daysHeld >= 8 && profitAt(session.open) < 0` with `profitAt(p) = shares × p −
  investment − interest` (interest through the session date, **no fees**, strict < 0 so break-even holds); checked at
  every session that starts with the position open (repeats); fills at the **next trade after the opening print**
  (`firstTradeFrom(session, bars[0].time + 60)`); a stop gap at the open takes precedence.
- **Trailing stop** (lines 194–199, 1081–1082): from the post-entry **intraday high** (entry session: from the fill
  minute), raised after each session, never lowered, active for a session only if `profitAt(stopPrice) > 0`.
- **Buffered intraday loss exit** from day 8 (net ≤ −2.9% of investment at a minute close, next-trade fill) — not part
  of Stage 1c.
- **No post-loss cooldown and no material-loss re-entry rule**: "a losing exit, material or not, doesn't restrict the
  next entry" (lines 91–95). The only block: no entry in a session that had an exit (Stage 1b has the same rule).
  Ancestor files (`src/app/allIn-trailingBuy.ts`, `allIn-trailingBuy-bufferedLoss.ts`, `origin/main` `allIn.ts`) had a
  material-loss rule that required re-entry **lower** than the losing exit (e.g. 2–3% below) with a 38% retracement
  reset — the opposite direction to Stage 1c's C. The file's header comments still describe the ancestor's 15-day /
  0.5% constants (stale; the shipped values are 8 days and no restriction).

### 4.2 The three Stage 1c rules

| Rule | Definition (summary) | Source | Box (default; references) |
|---|---|---|---|
| A | at every session whose date is > N calendar days after the entry date (or = N for a fill at the scheduled opening-fill bar), sell if liquidating at the opening print (incl. 5 bps sell cost and any opening slippage) nets < 0 after trade interest; primary fill = next trade after the print (= D1), paying the stop-slippage stress; idealised same-print fill as sensitivity; repeats at every eligible open | D1 `primary` maximumHoldDays, generalised: N searched, sell fee added; D1 counts from the fill session's date for every fill (so R8 equals D1 only for opening fills and without the fee) | N 3–60 integer (15; references 15 and 8) |
| B | after an own-rule exit with trade net < 0 (record unconsumed): discard close decisions at s < exit + C and minute decisions in sessions < exit + C + 1; state-like conditions (level state, R3F) persist and may decide at the first permitted close (`releaseEntry`); event triggers are discarded; an intraday rule cannot fire after the exit session until the release (a low-mode reference is frozen and restarts at +∞; a high-mode reference keeps ratcheting), so C = 0 ≡ off | Stage 1c (user's design; not in D1) | C 1–60 sessions (10) |
| C | after an own-rule exit with net < 0 and gross raw loss ≥ X, the next purchase needs decision price ≥ exit × (1 + Y); consumed by the next purchase; re-armed or cleared by the next own-rule exit; no expiry | Stage 1c (user's design; opposite direction to the D1 lineage's lower re-entry) | X 0.005–0.150 (0.05); Y 0–0.20 (0.05) |
| C-cross | C as an actual upward cross: the previous observation (close, or minute close) below the level and the decision price at or above it (secondary sensitivity only) | Stage 1c | as C |

**Dependencies and incompatibilities.** A needs the session's first bar and the trade's interest; B and C need the
account loss record (written only by own-rule exits; consumed by any fill; persists through boundaries; reset as a
sensitivity). C is largely inert on R3F re-entries (they already require a close above the exited trade's highest
close, i.e. above exitRaw / (1 − X)); it binds on them only for Y ≳ X / (1 − X), and acts mostly on event re-entries
and on first entries after a campaign died. None is
incompatible with any entry or exit: A acts at opens (no close-decided rule acts there), B and C only filter entry
decisions. Interactions with own mechanics: A shortens losing trades that a wide stop would hold (it never shortens a
profitable one); with XN `rep` and no A, a losing trade has only XN's hard stop; with tight trails A is often inert
(trades are stopped before day N) — reported per cell via the rule counters. B and C also block **re-entries** of a
live campaign (every entry of the policy), but never change campaign bookkeeping.

**Secondary arm.** Only C-cross (sensitivity of the verdict path and P\*_H, no reselection). No trailing-buy
confirmation, dip prerequisite or D1 continuation signal is added to any momentum entry in Stage 1c (declared, not
run).
