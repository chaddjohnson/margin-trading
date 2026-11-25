# Functionality audit — D1 and Growth on TSLA (brief §3; written before the protocol freeze)

What the **authoritative CPU engine** of this branch can express, which part the **accepted GPU evaluator** implements
bit-exactly (GPU Phase 7, `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf…`; `docs/gpu/FEATURE_MATRIX.md`), and what the
TSLA genome therefore contains. Nothing was activated "because a source file exists": every switch below is in the GPU
Phase 7 domain (`src/gpu-backend/domain.ts riskEnvelopePilotDomain`) and in this study's parity gate E4.

## 1. The engine on one symbol (the slot binding)

The accepted pooled engine (Priority 3's pool through RC 2: `src/vg-l0-risk-families/evaluate.ts` →
`src/d1-risk-controls-rc2/` → `src/vg-d1-growth-joint/{books,pool,evaluate}.ts` → `src/growth-trading/`; CUDA
`src/gpu-backend/cuda/`) takes a door of two engine *slots* typed `GDX` and `VGT` on one common calendar. Nothing in it reads
a symbol name except as a label (verified: the door is a plain object built by `doorOf`; the GPU dataset and the host
workers take it as arrays; gate E6 shows the disabled slot is inert). This study builds a door whose **both slots hold the
same TSLA sessions** (`src/tsla-d1-growth/doors.ts`) and trades only the VGT-slot books: **D1·VGT = D1·TSLA**, **Growth·VGT
= Growth·TSLA**; D1·GDX and Growth·GDX are disabled in every evaluation (`EvalOptions.enabled`; never run or funded). No file
of the evaluation manifest changed, so the acceptance stays valid (gate E1), and CPU = GPU was re-proven on TSLA doors
(gate E4: 0 differences in 4,660 record comparisons over all arms and cells).

## 2. D1 (dip-recovery) — all supported options are in the genome

| Feature | CPU (authoritative) | GPU | In the TSLA genome |
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

| Feature | CPU | GPU | In the TSLA genome |
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
susceptibility and the hold-window tail on pre-2016 TSLA daily data (disjoint history).

## 5. Same-symbol D1 / Growth interaction (arms C, J, S)

- One exclusive funded $100,000 slot; a decision is funded only at its own instant iff no lot is open and no order is
  reserved (`pool.ts`); otherwise it is refused ("slot occupied") — no preemption, no forced replacement, no simultaneous
  lots, no compounding.
- Same-instant order: **D1 first, then Growth** (`tieOrderOf('D1')`); deterministic.
- A refused D1 decision follows D1's shadow lifecycle (never feeds back); a refused Growth entry becomes an unfunded virtual
  position and waits for its virtual exit (lifecycle L0); shadow-position eligibility is OFF (not in the binary's domain).
- Both books trade the same symbol and the same price path: a Growth entry and a D1 dip-buy can never hold TSLA at the
  same time; the pool reports every refusal with its occupant (participation attribution, standard §2.9).

## 6. Conventions kept

Calendar-day holds; harmonized D1 arming from 2016-01-04; 5 bps per executed side inside the fill prices, $0 commission;
11 % simple annual interest on outstanding principal by calendar day (365-day year); stops at the stop level or the gapped
open with no extra slippage; fractional shares; price only (TSLA pays no dividend); forward split adjustment of the doors
(2020-08-31 5:1, 2022-08-25 3:1; `TSLA_DATA_AUDIT.json`).

## 7. GPU coverage and what would need engineering

Every reachable TSLA feature is a subset of the GPU Phase 7 domain; the gate refuses any feature the server does not
implement (`openOfficialGpuSession` capability check). **No engineering of the evaluator was required**: the TSLA study is
expressed entirely in its own namespace (doors, genome, lane derivation, arms). Features that would need a versioned
implementation and a renewed acceptance (session-hold unit, S1, swing/breakeven, intraday Growth resolution, L1/L2,
shadow eligibility) are **out of scope** and not reachable.
