# Functionality audit — D1 and Growth on MSFT (brief Phase 0 / Phase 2 "Risk and exit controls"; written before the protocol freeze)

What the **authoritative CPU engine** of this branch can express, which part the **accepted GPU evaluator** implements
bit-exactly (GPU Phase 9, `config/gpu-backend/acceptance.json` sha256 `9ebb33ce…`; `docs/gpu/FEATURE_MATRIX.md`), and what the
MSFT genome therefore contains. Nothing was activated "because a source file exists": every switch below is in the accepted
domain ("Assignment 3 genome ∪ risk-envelope pilot domain", `src/gpu-backend/domain.ts riskEnvelopePilotDomain`, unchanged
since GPU Phase 7; Phase 9 added only the byte-prefix door loaders) and in this study's parity gate E4. The MSFT space is
P6-TSLA's and P8-GDX's unchanged (PROTOCOL.md AD1): every supported D1 and Growth behaviour is preserved.

## 1. The engine on one symbol (the slot binding)

The accepted pooled engine (Priority 3's pool through RC 2: `src/vg-l0-risk-families/evaluate.ts` →
`src/d1-risk-controls-rc2/` → `src/vg-d1-growth-joint/{books,pool,evaluate}.ts` → `src/growth-trading/`; CUDA
`src/gpu-backend/cuda/`) takes a door of two engine *slots* typed `GDX` and `VGT` on one common calendar. Nothing in it reads
a symbol name except as a label (verified: the door is a plain object built by `doorOf`; the GPU dataset and the host
workers take it as arrays; gate E6 shows the disabled slot is inert). This study builds a door whose **both slots hold the
same MSFT sessions** (`src/msft-d1-growth/doors.ts`) and trades only the books of the slot the engine NAMES `VGT`: the
engine's D1·VGT is this study's **D1·MSFT** and the engine's Growth·VGT its **Growth·MSFT**; the books of the slot the engine
names `GDX` are disabled in every evaluation (`EvalOptions.enabled`; never run or funded). Why that slot: Assignment 3's
configuration type, whose genome, identities and GPU domain the accepted evaluator covers, searches one Growth book (the
engine's Growth·VGT); its Growth·GDX is a fixed placeholder. The external controls (New L0's and N/original's VGT books)
are projected unchanged onto the trading slot (`src/msft-d1-growth/controls.ts`; descriptive only). No file of the
evaluation manifest changed, so the acceptance stays valid (gate E1); CPU = GPU is re-proven on the MSFT doors (gate E4,
including box-extreme genomes of every cell).

## 2. D1 (dip-recovery) — all supported options are in the genome

| Feature | CPU (authoritative) | GPU | In the MSFT genome |
|---|---|---|---|
| Deep entry: close ≥ X below the highest high of the previous L sessions, at a completed minute | `strategy.ts EntryMachine`, `four-family/data.ts computeReferenceHighs` | `D1_BOOK` | X 8.0–30.0 %, L 20–250 sessions |
| Trailing buy (rebound Y from the post-arming low); the arming minute never buys | `EntryMachine.processBar` | `D1_BOOK` | Y 0.1–5.0 % |
| Fill: next minute open / closing print / next session's opening trade | `firstTradeAfterDecision` | `D1_BOOK` | fixed engine rule |
| Post-exit continuation (window W sessions, pullback P) after a profitable exit | `EntryMachine` | `D1_BOOK` | W 10–200, P 3.0–20.0 % |
| Net-profit trailing stop (post-entry high, raised after closes, never lowered; ACTIVE ONLY when the stop level is above net breakeven) | `shared-margin-portfolio/strategy.ts ExitManager` (`stopPolicy 'net'`) | `D1_BOOK` | stop 3.0–15.0 % |
| Stop timing: a resting stop gapped through fills at the open; minute open/low through the stop fills at the stop | `ExitManager.evaluate` | `D1_BOOK`, `NEXT_OPEN` | engine rule; next-open stops as a report-only stress |
| Calendar maximum hold: exit at the open after `hold` calendar days IF the lot is at a loss there | `ExitManager.evaluate` (`isMaximumHoldDue`) | `D1_BOOK` | hold 3–30 calendar days (calendar-day semantics kept; the trading-session unit is not on this branch) |
| Buffered intraday loss exit (and its overnight carry) | `ExitManager.evaluate` | `D1_BOOK` | buffer 0.0–6.0 % |
| Flat-since-session-start rule; a refusal never feeds back (shadow lifecycle) | `ShadowBook`, `multi-etf-allocator/shadow.ts` | `D1_BOOK` | engine rule |
| **Optional downside controls (RC 1 / RC 2)**: protective stop d % from entry (next-session or entry-day activation); hold policy legacy / disabled / adaptive progress-extended (hx, g); the prolonged-decline entry gate (K losses → block until r % recovery or c sessions) — the "material-loss restriction / re-entry" rules | `src/d1-risk-controls{,-rc2}/` | `RC_CONTROLS` | **families A (none), B (protective stop), C (stop, hold disabled), D (stop, adaptive hold) × decline gate OFF/ON = 8 cells**; d 3.0–25.0 %, hx 6–60 days, g 1.0–15.0 %, K 1–4, r 10.0–100.0 %, c 5–250 sessions; activation a free gene on B/C/D |
| Swing-low entry mode; gross-breakeven stop policy | `strategy.ts` | refused (`D1_SWING`, `D1_BREAKEVEN`) | **not reachable** (never in an optimizer genome of the program; not added) |
| Trading-session hold unit | `research/vg-l0-session-hold` branch only | refused | **absent from this branch** |
| S1 staged trailing stops | Priority 4 branch only (`research/vg-l0-staged-trailing-stop`) | not in this binary | **absent; OFF by the brief** |

## 3. Growth 1.4.0 — all supported options are in the genome

| Feature | CPU | GPU | In the MSFT genome |
|---|---|---|---|
| Rise from recent low (advance A % above the N-bar low; edge-triggered) | `entry-signals/riseFromRecentLow.ts` | `G_RISE` | A 1–20 %, N 10–250 bars (daily signal bars) |
| Trend breakout (rising SMA over K, prior N-session high) | `optionalRules.ts scanTrendBreakout` | `G_BREAKOUT` | full box |
| Trend filters: price change, regression slope, rising SMA, higher highs/lows, momentum | `entryGates.ts TrendGate` | `G_TREND_*` | all five + OFF |
| Eligibility: time-limited, minimum strength, maximum extension, deterioration, reset & renew | `EntryGates` | `G_ELIG_*` | all five + OFF (Rise entry) |
| Drawdown Recovery Gate | `drawdownGate.ts` | `G_DRAWDOWN_GATE` | ON/OFF with its four inputs |
| Trailing stop (D1's ExitManager, **net-profit policy**: active only above net breakeven) | `riseTrading.ts exitParamsOf` | `G_MAX_HOLD`, `G_BUFFER` | 3–15 %, always present |
| Maximum hold switch (calendar days; exit at the open when at a loss) and intraday loss buffer | `exitParamsOf` (hold OFF = ∞) | `G_MAX_HOLD`, `G_BUFFER` | `exits` ∈ {hold off, hold on & buffer off, hold on & buffer on}; hold 3–30 days; buffer 0–6 % |
| Initial protective stop (ATR: N sessions × multiple, activated at the fill minute) | `optionalRules.ts PositionRules` | `G_INITIAL_STOP` | `istop` ON/OFF; 5–60 sessions × 1–5 |
| Trend retention (partial sale at the first profit trailing-stop event; the remainder exits on an SMA rule) | `PositionRules` | `G_RETENTION` | ON/OFF with its three inputs |
| Continuation: classic_d1, breakout, shallow pullback, MA cross | `continuation.ts` | `G_CONT_*` | all four + OFF |
| Signal resolutions other than 1d | `entry-signals/bars.ts` | refused | not reachable (the program's Growth resolution is 1d) |

## 4. Open-ended Growth (maximum hold OFF and initial stop OFF)

**Exact behaviour.** With `maximumHoldEnabled = false` the hold is ∞ and the intraday loss buffer is off
(`riseTrading.ts exitParamsOf`); with `initialStopEnabled = false` there is no ATR stop. The only remaining exit is the
**net-profit trailing stop**, which is *inactive while the stop level is below the lot's net breakeven*
(`ExitManager.isStopActive`: `shares × stop − investment − interest > 0`). A lot that never rises enough for its trailing
stop to clear breakeven therefore has **no exit at all**: it is held through any decline, paying 11 % interest, and — in
the one exclusive slot — it **blocks every D1 and Growth decision** for as long as it stays open (refusals "slot occupied").
Retention (if ON) acts only after a profit trailing-stop event.

**Treatment (not forbidden; fair, predeclared, separately analyzable).** It is a legitimate existing option of Growth
1.4.0, reachable in every earlier Growth search of the program, so it stays in the genome. To give protected and
unrestricted structures equal predeclared consideration, the Growth **exit-protection structure is a cell**: arm G has six
cells `G.h<e>.s<i>` (e ∈ {hold off, hold on & buffer off, hold on & buffer on} × initial stop OFF/ON), each with the same
budget; `G.h0.s0` (and `J.<D1>.h0.s0`, `S.<k>.h0.s0`) is the **unrestricted** structure. The sub-populations G-U / J-U / S-U
(unrestricted) and G-P / J-P / S-P (protected) are reported separately (report-only procedures, never nominating). Every
member is subject to the same gates (the marked minute DD ≤ $35,000 at the centre, the confirmation p90 DD, the 10 bps stress).
Report-only stress and capital-occupancy analysis for every unrestricted finalist: open-position exposure and duration,
the worst open-lot excursion, occupancy (share of sessions the slot is held), refused decisions caused by it, gap
susceptibility and the hold-window tail on pre-2016 MSFT daily data (1986-03-13 → 2015-12-31; disjoint history).
Open-ended exposure is reported explicitly and never disqualified automatically (brief Phase 2); no precommitted rule
excludes it beyond the common gates.

## 5. Same-symbol D1 / Growth interaction (arms C, J, S)

- One exclusive funded $100,000 slot; a decision is funded only at its own instant iff no lot is open and no order is
  reserved (`pool.ts`); otherwise it is refused ("slot occupied") — no preemption, no forced replacement, no simultaneous
  lots, no compounding.
- Same-instant order: **D1 first, then Growth** (`tieOrderOf('D1')`); deterministic.
- A refused D1 decision follows D1's shadow lifecycle (never feeds back); a refused Growth entry becomes an unfunded virtual
  position and waits for its virtual exit (lifecycle L0); shadow-position eligibility is OFF (not in the binary's domain).
- Both books trade the same symbol and the same price path: a Growth entry and a D1 dip-buy can never hold MSFT at the
  same time; the pool reports every refusal with its occupant (participation attribution, standard §2.9: competing
  signals, denied opportunities and displaced trades are attributed in the combined arms' reports).

## 6. Conventions kept

Calendar-day holds; harmonized D1 arming from 2016-01-04; 5 bps per executed side inside the fill prices, $0 commission;
11 % simple annual interest on outstanding principal by calendar day (365-day year); stops at the stop level or the gapped
open with no extra slippage; fractional shares; **price only**: MSFT pays a quarterly dividend (36 ex-dates in 2016–2024,
$19.47 per share; listed in `MSFT_DATA_AUDIT.json`); as for every strategy of the program, no dividend is credited to a
trading lot and the raw ex-date drop is part of the lot's P&L — unlike TSLA (no dividend) this biases MSFT trading results
slightly downward against a total-return holder, most for long holds; the effect is reported (PROTOCOL.md §15), never
restated into trading results; no split in the window (the last, 2:1, 2003-02-18; `MSFT_DATA_AUDIT.json`); only
regular-session minute bars and the closing-print proxy reach the engine (gate E2: 0 bars outside the regular minutes).

## 7. GPU coverage and what would need engineering

Every reachable MSFT feature is a subset of the accepted GPU domain; the gate refuses any feature the server does not
implement (`openOfficialGpuSession` capability check). **No engineering of the evaluator was required**: the MSFT study is
expressed entirely in its own namespace (doors, genome, lane derivation, arms, external controls, outcome). The
identity-join module `src/research-outcome/identityJoin.ts` was already on `main` and is outside every evaluation and
enforcement manifest; the study adds npm scripts to `package.json` (outside the pinned groups) and registers nothing in
`config/gpu-backend/entrypoints.json` (an official entrypoint is recognized by its import of the official gate). Features that would need a versioned
implementation and a renewed acceptance (session-hold unit, S1, swing/breakeven, intraday Growth resolution, L1/L2,
shadow eligibility) are **out of scope** and not reachable.

## 8. Risk and exit controls preserved (brief Phase 2)

- **Kept ON / available:** every D1 control family (A none; B protective stop; C stop with the hold disabled; D stop with the
  adaptive progress-extended hold) × the prolonged-decline entry gate; the optional Growth initial ATR stop; the Growth
  maximum hold and intraday loss buffer; open-ended Growth; trend retention; all continuation modes.
- **Kept OFF (brief):** shadow-position delayed-entry eligibility; S1 staged trailing stops (absent from this branch's
  engine path); no new trailing-stop or giveback rule.
- **Measured separately, report-only:** trade principal loss (marked and liquidation), banked-capital drawdown, profit
  giveback (per lot; never treated as a principal loss), marked equity drawdown on the fixed $100,000 denominator, the worst
  trades and gap fills, financing (interest) — from the risk envelope of every evaluation and the detailed replays.
- A stop level is not an execution-price cap: a gap through a stop fills at the gapped open (engine rule; next-open stops
  and +10 / +25 bps stop slippage are stresses).
