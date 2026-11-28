# AUDIT_REPORT — D1 / Growth exit mechanics and the profit-giveback evidence (Priority 3, audit only)

Written analysis and tables only (standard §7.7). Nothing here was simulated, optimized or changed: every statement is
read from source code at the base revision `48090c55` (branch `research/vg-l0-trailing-stop-audit`), from archived
research records, or derived from them by small deterministic arithmetic (VERIFICATION_REPORT.md §3).

**Evidence labels.** **[V]** verified in the current code (file and lines in SOURCE_MAP.md); **[A]** read from an
archived, committed research record; **[H]** historical behaviour of another engine or an unmerged branch; **[I]**
inference from [V]/[A]; **[P]** proposal (only in the design documents). Previously inspected history (2016–2026, in
particular 2020–2022 and 2025–2026) is **never** presented as out-of-sample evidence.

## 1. The frozen comparators and their exit-relevant settings [A]

Source: `research/vg-l0-full-joint/FROZEN_SELECTION.json` (sha256 `4080d4b1…`) `newL0` and finalist
`C24/informed/GD.VB/R2#1 profit`; `docs/research/methods/NEW_L0_METHOD.md` §1.1. D1 values are on the registry's tenths
grid (73 = 7.3 %).

| Setting | New L0 (`a2e385640ca61012`, cell GA0.VA0) | N/original (`rc1-f1a8b57cb02455c3`, cell GD1.VB0) |
|---|---|---|
| D1·VGT trailing stop τ / hold / buffer | 7.3 % / 15 calendar days / 4.2 % | 7.3 % / 15 d / 4.2 % |
| D1·GDX trailing stop τ / hold / buffer | 6.1 % / 13 d / 2.5 % | 6.1 % / 13 d / 2.4 % |
| D1 stop policy | `net` (both books) | `net` (both books) |
| D1 RC controls | none (legacy) | GDX: protective stop 15.9 %, adaptive hold 28 d once the post-entry high ≥ fill × 1.070, decline gate K 3 / recovery 70 % / max block 60 sessions; VGT: protective stop 12.0 % (both next-session activation) |
| Growth·VGT trailing stop τ | 5.7 % | 5.7 % |
| Growth·VGT maximum hold / buffer | ON, 22 calendar days / OFF | ON, 22 d / OFF |
| Growth·VGT initial stop | ON, fill − 1.2 × ATR(16 sessions) | ON, same |
| Growth·VGT retention ("trend exit") | OFF | OFF |
| Growth·VGT continuation | classic_d1, W 67 sessions, P 11.5 %, rebound 3.01 % | classic_d1, W 67, P 11.2 %, rebound 2.96 % |
| Growth·GDX | OFF (never run or funded) | OFF |
| Reference figures (context, not re-run) | FULL $479,605.18 / DD $20,385.99 / 46 lots; development $382,721.46 / $19,459.83 | FULL $482,700.73 / DD $20,385.99 / 44 lots; development $388,031.02 / $19,459.83 |

Assignment 3's ablations (`research/vg-l0-full-joint/REPORT.md` §7) found N/original's protective stops and their
activation **inert on its history** (removing them changed nothing); its +$5,310 development gain over New L0 comes mostly
from the GDX decline gate. Growth protection is **not absent**: both comparators run Growth with an ATR initial stop and a
22-day losing hold.

## 2. Architecture: one trailing-stop implementation, three call paths [V]

- **One CPU implementation.** D1 and Growth both use `ExitManager` in `src/shared-margin-portfolio/strategy.ts`
  (173–392). Growth maps its genes onto it through `exitParamsOf` (`src/growth-trading/riseTrading.ts` 271–301):
  stop policy `net`, `trailingStopPercentage` = τ, an OFF hold or buffer becomes `Infinity`.
- **D1 path.** `ShadowBook` (`src/multi-etf-allocator/shadow.ts`) → RC 1 `RiskShadowBook` / `RiskExitManager`
  (`src/d1-risk-controls/`) → RC 2 `RiskShadowBook2` (`src/d1-risk-controls-rc2/`). With every control at its default,
  `RiskExitManager.evaluate` returns the frozen decision unchanged.
- **Growth path for both comparators.** Because the initial stop is ON, `simulateTrading` builds `PositionRules`
  (`riseTrading.ts` 539–542). At each fill `PositionRules.onFill` (`optionalRules.ts` 556–642) replaces the book's
  manager with `RulesExitManager` (436–455). That manager keeps the ExitManager's trailing **level** (`onEntry` /
  `afterSession` inherited) but decides exits in `evaluateSession` (658+), a candidate-sorting evaluator.
- **CUDA duplicates.** The accepted GPU evaluator re-implements both paths:
  - `src/gpu-backend/cuda/gb_d1.cuh` `exitEvaluate` 45–138, `riskEvaluate` 202–259, the ratchet 541–546;
  - `gb_growth.cuh` `gOnEntry` 147–157, `gStopActive` 198–203, `gExitEvaluate` 205+, `gEvaluateSession` 336+, the
    ratchet 1314–1320.
- **Pool.** `src/vg-d1-growth-joint/pool.ts` (`runPool` 160+; CUDA `gb_pool.cuh` `poolKernel`) funds virtual trades.
  - A funded lot inherits its virtual trade's exit fills exactly: every exit rule is scale-invariant, and a virtual lot
    and a funded lot both have $100,000 of principal.

## 3. Side-by-side behavioural matrix: D1 versus Growth (current code) [V]

Symbols: e = raw entry fill; c = 5 bps per side; N = $100,000; q = N ÷ (e(1+c)) shares; I(s) = N × 11 % × calendar
days from the entry session's midnight to session s ÷ 365; τ = trailing distance; H = post-entry high.

| # | Item | D1 (both books) | Growth·VGT (New L0 / N/original configuration) |
|---|---|---|---|
| 1 | Level | L = H × (1 − τ) | the same (inherited `onEntry` / `afterSession`) |
| 2 | H initialisation at the fill | max(e, entry-session close, highs of the fill minute and every later minute of the entry session) (`onEntry` 196–214) | the same; `onEntry` runs again on the rules manager (`optionalRules.ts` 613) |
| 3 | H update | after each later session's close: H = max(H, session high); never on the entry session (`shadow.ts` 306–313; `afterSession` 228–233) | the same (`gb_growth.cuh` 1314–1320) |
| 4 | Ratchet | L = max(L, H(1 − τ)): never lowered; one update per session; a session's own prices never move that session's level | the same |
| 5 | What it trails | session **highs** (regular-session minute bars), not closes; intraday highs on the entry session from the fill minute | the same |
| 6 | Eligibility ("active") | iff q·L − N − I(s) > 0, decided afresh at the start of each session (`isStopActive` 239–245; `afterSession` 228–233) | the same, and only in retention stage `full` (`RulesExitManager.isStopActive`) |
| 7 | Implied activation gain | H/e > (1+c)(1 + I/N) ÷ (1 − τ): **+7.93 %** (τ 7.3 %), **+6.55 %** (τ 6.1 %) at day 0; +8.90 % / +7.51 % at day 30 | **+6.10 %** (τ 5.7 %) at day 0; +7.06 % at day 30; +9.93 % at day 120 |
| 8 | Can it be active while the trade loses? | no: an active level locks a positive net after entry cost and interest (exit cost and slippage excluded) | no |
| 9 | Can activation lapse? | yes: the test is re-decided each session and interest grows ≈ 0.030 % of N per calendar day | yes (long Growth holds accrue more interest) |
| 10 | First session it can act | the session **after** the entry session (exits are decided in `beginSession` only for a position open at the session start, `shadow.ts` 131–147) | the same for the trailing stop, hold and buffer; the initial stop acts **from the fill minute** (`onFill` 641) |
| 11 | Trigger and fill | (a) open ≤ L → `trailing stop gap` at the opening trade; (b) the first minute whose open ≤ L fills at that open; (c) the first minute whose low ≤ L fills at L (`stop` fill; `next-open` stress: the next minute's open) | (a) and (b) as D1; (c) at L only (the optional rules refuse `next-open`, `optionalRules.ts` 482; `growthNextOpenSupported` = false) |
| 12 | Maximum hold | calendar days since the entry session ≥ hold **and** a net loss at the open → sell at the first trade ≥ open + 60 s. **A profitable position is never sold by the hold** | the same (22 d) |
| 13 | Buffered intraday loss | from the hold age: the first minute close with net ≤ −buffer × N; sells at the next trade, or carries overnight | OFF in both comparators |
| 14 | Protective / initial stop | New L0: none. N/original: RC 1 fixed level e × (1 − d/1000), from the next session, gap/open/low fills | initial stop e − 1.2 × ATR16, fixed, from the fill minute |
| 15 | Other stop stages | RC adaptive hold (a profit-progress change of the **hold**, not of the stop); `breakeven` policy exists but is refused on the GPU (`D1_BREAKEVEN`) | retention: a partial sale at the first profit trailing-stop event, then an SMA trend exit (OFF here) |
| 16 | Re-entry after an exit | no new arming in a session that started invested or had an exit (`shadow.ts` 156); deep entry needs an X decline from the L-session high; a **net-profitable** exit opens the continuation window anchored at the raw exit price (`strategy.ts` 624–633) | edge-triggered Rise signals only when flat with no order (a signal arriving while invested is discarded); may re-enter the same session; a net-profitable exit opens the classic_d1 continuation |
| 17 | State after a profitable exit | continuation (P, W); decline gate: a profitable exit ends an unblocked episode | continuation (P, Y, W); the eligibility and drawdown gates continue |
| 18 | GPU | `exitEvaluate` / `riskEvaluate` (`D1_BOOK`, `RC_CONTROLS`) | `gEvaluateSession` (`G_INITIAL_STOP`); `gExitEvaluate` without the rules |

**The essential fact.** The existing trailing stop is **already a single-stage, profit-activated stop**. Before the
implied activation gain (row 7) it does not exist, and the trade has only the hold, buffer, protective or initial stops.
After it, the stop trails at the one distance τ for the rest of the trade. Its activation threshold is **not a free
parameter**: it is tied to τ. No canonical feature changes the trailing distance after a profit threshold.

## 4. Precedence and state transitions inside one session [V]

**D1, legacy** (`ExitManager.evaluate` 247–391), in this order:
1. An active level with open ≤ L: a gap exit at the opening trade. This also overrides a carried sale.
2. A buffered sale carried from the previous session fills at the opening trade.
3. The maximum hold is due (hold age and a loss at the open): sell at the first trade ≥ open + 60 s. The trailing stop
   cannot then be active without a gap.
4. The first minute reaching an active level: the trailing stop.
5. From the hold age: the buffered-loss signal minute. The stop wins if its minute ≤ the signal minute, or is the next
   minute and opens through the level.

**D1 with RC 1 / RC 2** (`RiskExitManager.evaluate` 138–213). The legacy decision is computed first, then the
protective trigger:
- a legacy gap keeps the opening trade;
- otherwise a protective gap wins;
- against a hold exit, a strictly earlier stop minute wins;
- against the trailing stop, the earlier trigger minute wins, and ties go to the legacy exit;
- against the buffered loss, the comparison of rule 5.
- RC 2 entry-day: the first post-fill observation of the fill session at or below the protective level
  (`rc2/exit.ts` 23–70). The runner closes a same-minute exit immediately after the fill (`rc2/book.ts` 214).

**Growth with the optional rules** (`evaluateSession` 658–898):
- Candidates: gaps at the open; a carried buffer; a pending trend exit; the hold at the first trade ≥ open + 60 s; the
  first minute reaching the active trailing level; the initial stop from the fill.
- The earliest executes, ordered by bar, then phase (opening trade before an intra-minute level), then the **higher
  level** first, then the rule rank: trailing > initial > hold > buffer > trend. With retention pending the order is
  initial > hold > buffer > trailing.

**Order at one instant in the pool** (`pool.ts` header 22–27):
1. Decisions stamped ≤ T, in the tie order: D1 first, then GDX before VGT.
2. Exits and partial sales at T.
3. Fills at T, then a new lot's exits due in its own fill minute.
4. Marks.
- A decision is funded only at its own instant, and only if no lot is open and no order is reserved. A refusal never
  feeds back into the book (L0).

## 5. Causal timelines of representative situations (FULL ledger, previously inspected history) [A][I]

Records:
- `research/vg-l0-full-joint/results/diagnostics/ledgers.json` (control New L0, FULL door): raw entry and exit prices,
  reasons, interest;
- `research/vg-l0-risk-metrics/results/tables/trades.csv` (sha256 `ea799fa1…`): marked peak profit, giveback;
- `gaps-through-stop.csv` (sha256 `e3e02d91…`): stop levels of fills below the level.

The implied H of a stop-level exit is exit raw ÷ (1 − τ). For lot #11 it reproduces the recorded fill exactly: 340.74 ×
0.927 = 315.866.

| # | Situation | Lot (New L0, FULL) | Causal sequence |
|---|---|---|---|
| T1 | D1·VGT large winner, normal trailing exit | #11, 2020-04-02 → 2020-09-04 | Fill 201.7648. The level is inactive until H > ≈ +8 %, then trails 7.3 % under the session-high maximum. H reaches 340.74 (+68.9 %); the marked peak is $63,570.18 on 2020-09-02. On 2020-09-04 a minute low reaches L = 315.866 and fills at the level (+56.6 %): net $51,723.87 after $4,671 interest. Giveback to exit $11,846.31 (18.6 % of the peak) ≈ τ × (N + peak) = $11,941 |
| T2 | D1·GDX entry-session peak, gap | #9, 2020-03-19 → 03-20 | Fill 20.475. The marked peak $21,111.61 comes **on the entry session**, when no D1 exit can act. After the close L = 23.46 (H = 24.98, +22 %). The next session opens at 22.74, below L: `trailing stop gap` at the opening trade, 3.5 % of the entry beyond the level ($3,494.53). Net $10,921.13; largest giveback above break-even $17,280.74 |
| T3 | D1·GDX never armed, maximum hold | #42, 2026-07-07 → 07-20 | Fill 78.15. The marked peak is only $647.05 on day 0; the stop is never eligible. On the 13th calendar day with a loss at the open, the hold sells at 71.405: net −$9,113.94, trade principal loss $11,113.57 (the FULL drawdown episode) |
| T4 | D1·GDX near break-even stop | #37, 2026-03-19 → 03-26 | Fill 82.045. H = 88.07 (+7.34 %), just past activation; L = 82.698 locks a small net. Stopped at the level: net $483.87 |
| T5 | Growth·VGT winner, level fill | #1, 2016-07-05 → 2017-06-29 | Fill 106.57. H = 148.26 (+39.1 %); stopped at L = 139.809 (+31.2 %). Net $20,239.69 after **$10,819.18 interest** (359 days); marked peak $28,833.86 (2017-06-09) |
| T6 | Growth·VGT winner, gap | #6, 2019-10-10 → 2020-02-24 | Fill 213.96. Marked peak $23,886.80 (2020-02-19). The 2020-02-24 open (252.18) is below L = 258.13: a gap fill $2,776.90 beyond the level. Net $13,616.58; giveback $10,270.22 (43 % of the peak) |
| T7 | Development maximum DD window | #27 + #28, 2023-01-25 → 02-24 | The D24 window: DD $19,459.83 = U $9,124.10 + E $10,335.73. #27 (D1·GDX) gaps out on 2023-02-03 (level 31.31, fill 30.83, +$7,624.19 net after a $16,748.30 peak). Then #28 (D1·GDX, peak $2,774.05) never arms and loses −$6,455.48 at the hold |

**Generic state machine of one lot** [V]:
- FILLED (entry session): H from the fill. Only the initial stop (Growth) or an RC 2 entry-day stop can act.
- After the close: L = H(1 − τ).
- From the next session, each session start: the hold check (loss at the open), the active test (net rule), then the
  minute scan (gap, open-through, low-through).
- After each close: H, then L.
- Exit:
  - virtual trade net → the continuation window (if net > 0) and the decline gate (if net ≤ 0, D1 with a gate);
  - the funded lot's principal is released at that instant, and the next decision at or after it may be funded.

## 6. Interactions that a stop change propagates through [V][I]

1. **Funding and displacement.** The pool funds only at a decision instant and never revives a refused trade.
   - An earlier exit frees the slot earlier: a decision in between is funded instead of refused.
   - A later exit keeps it longer.
   - So a stop change alters **which later trades are funded**, not only the profit of the current one. With L0, the
     book's own virtual trades change too, so the effect is two-layered: the book's signal sequence, then the pool's
     funding sequence.
2. **D1 continuation.** A net-profitable exit opens the window at the **raw exit price**.
   - An earlier exit at a higher price raises the anchor, and continuation then needs a pullback P (10.3 % VGT, 15.2 %
     GDX) from max(anchor, later session highs) within W sessions (41 / 10).
   - No arming happens in the exit session itself.
3. **Deep re-entry.** It needs an X decline (23.7 % / 27.7 %) from the rolling L-session high.
   - After an early exit in a rising market, a D1 book may stay flat for a long time.
   - It **cannot re-enter the same trend** cheaply.
4. **Growth re-entry.** Rise signals are edge-triggered events and are discarded while invested.
   - After an earlier exit the book can take only a **new** crossing (advance 5.6 % above the 84-bar low), the
     eligibility window (20 sessions) or classic_d1 continuation (P 11.5 %).
   - An early exit in a persistent trend may therefore forfeit the rest of the trend.
5. **Decline gate (N/original GDX).** Only exits with net ≤ 0 count as failed attempts, and a profitable exit ends an
   unblocked episode. A stop that converts a later loss into an earlier profit can end episodes sooner.
6. **Adaptive hold (N/original GDX).** It extends the **hold** to 28 days once H ≥ e × 1.07. It applies only while the
   trade has a loss at the open, so it barely interacts with a stop that acts on profitable positions.
7. **Growth initial stop and retention.**
   - The initial stop is fixed below the fill. A trailing level above it executes first within a minute (the higher
     level first).
   - Retention, when ON, turns the first trailing-stop event into a partial sale and **consumes** the trailing stop
     (stage `remainder`). Any change of the trailing level therefore changes when retention's partial sale happens.
8. **Financing.** At 11 % simple interest a $100,000 lot costs ≈ $30.14 per calendar day. A shorter hold reduces
   interest, and a longer one raises the net-profit activation bar (rows 7, 9).
9. **Same-instant ordering.** Decisions precede exits at an instant, so a slot freed at T serves only decisions stamped
   after T, not a decision stamped at T. A new lot's same-minute exit runs after its fill.

## 7. Execution realism [V][I]

| Topic | Current treatment | Consequence for any stop change |
|---|---|---|
| Gaps | open ≤ L → opening trade (no extra slippage at base; `stopSlippageBps` stress) | a tighter level is gapped through no less often; its gap losses are measured from a higher level |
| Opening prints / first trades | the hold sells at the first trade ≥ open + 60 s; fills use minute opens or the closing print | — |
| Missing bars | fills use the first minute **with trades** at or after the decision; a session without a later trade carries the order or buffered sale | stop scans read only existing minutes |
| Intra-minute ambiguity | within a minute the open is tested before the low; a low through L fills **at L** (assumed fill) | a tighter stop creates more assumed level fills, so the base case is optimistic. The `next-open` stress applies to D1 but not to Growth with the optional rules |
| Sessions | NYSE sessions present in the data, regular-session minutes, early closes respected; holds in calendar days (a sessions unit exists only on `research/vg-l0-session-hold`) | — |
| Splits | FULL door is forward split-adjusted (VGT 8:1 on 2026-04-21; lot #39 spans it). All thresholds are ratios of prices on one series | ratio thresholds stay split-invariant; absolute dollar levels would not |
| Distributions | none in the canonical book, pool or exit code (no matches for "dividend" or "distribution") | — |
| Fees | 5 bps per side inside the fill prices; activation includes the entry cost but not the exit cost | — |
| Partial fills / liquidity | full $100,000 at the observed price; no volume model; partial **sales** only through Growth retention | a tighter stop's assumed fills are not liquidity-checked |

## 8. Existing functionality that resembles staged stops (overlap analysis)

| Functionality | Where | Canonical / GPU? | What it does | Overlap with a profit-activated tightening |
|---|---|---|---|---|
| `net` activation | strategy.ts `isStopActive` | yes / yes | one profit-activated stage at distance τ | the **first stage** of any staged design; its activation is tied to τ |
| `breakeven` policy | strategy.ts `updateLatch` | CPU only; GPU refuses `D1_BREAKEVEN` | latch once L ≥ cost-adjusted entry | activation variant, same distance |
| B-A gross threshold, B-B breakeven, B-C two-stage (protective → trailing), B-D always | `src/d1-refinement/engine.ts` (not on the canonical path) [H] | no / no | activation variants with **one** distance | `research/vgt-d1-refinement/TRAILING_STOP_MECHANISMS.md`: no improvement on VGT D1; B-A/B-B equivalent to D1; B-C −$9,313, B-D −$17,438 |
| RC 1 protective stop / RC 2 entry-day | `src/d1-risk-controls{,-rc2}/` | yes / yes | a fixed loss stop below the entry | protects losers; inert for N/original on its history |
| RC adaptive hold | `RiskExitManager.holdAt` | yes / yes | a profit-progress-triggered change of the **hold** | the same activation pattern (H ≥ e(1+g), latched), on another exit |
| Growth retention | `optionalRules.ts` | yes / yes | a partial sale at the first trailing event, then the SMA trend exit | two-stage, but it **loosens** the exit for the remainder |
| Study 3 XT profit ratchet / XRP retention | `research/study3-vgt-momentum-stage1b` [H] | retired engine | ratchet to t2 once Hc ≥ E(1+g); a floor E + ρ(Hc − E) | the closest prior art: in-sample best, but the fold pick (ratchet at +25.5 % to a 5.2 % trail) **lost $28,223 in 2022** |

**Conclusion of the overlap.** A profit-activated **tightening of the trailing distance** on the canonical D1/Growth path
does not exist: no current gene, option or control can express it. The proposal is therefore not redundant. It is,
however, a variation on a family (profit ratchets) that once looked good in-sample and failed forward on another
strategy. Its value cannot be argued from this audit, only tested.

## 9. State representation, serialization and mismatches [V]

| Layer | Exit state and parameters |
|---|---|
| CPU lot | `ExitManager`: postEntryHigh/Low, stopPrice, latched, pendingSignal*, stopActiveSessions, stopFirstActiveIndex. RC: protective level, hold runtime, extendedFrom. Rules: stage, partial fills, pending trend/buffer |
| CPU trade record | `VirtualTrade` exitStopPrice, stopActiveAtExit, stopFirstActiveIndex, stopActiveSessions, exitReason/execution. RC: `RcTrade` (CPU detail `RcLog2`, **CPU only**) |
| CUDA | `D1State` / `G` mirror the CPU fields (`gb_d1.cuh` 13–30, `gb_growth.cuh` struct `G` 45+). Inputs `GbD1In` (exactly 128 bytes, no spare field), `GbGrowthIn` (328 bytes, one `pad`), counters `GbBookOut` (`pad[2]` spare). Protocol v2 |
| Identity | legacy → Priority 3 `quadId`; RC 1 `rc1-…`; RC 2 `rc2-…` (`riskId2`). Evaluation keys `riskEvalKey2` add `\|rc1:` / `\|rc2:`. Growth genes in the Growth browser identity (`gId`) |
| Records / manifests | compact record + RcLite counters (`vg-l0-risk-families/evaluate.ts`); FROZEN_SELECTION `cfg` blocks; archives bound to the evaluation-code digest |
| Strategy Lab | the pooled viewer replays five frozen candidates including New L0 (`l0-primary`). **N/original is not in the catalog** and the viewer has **no RC controls**. The Growth runner exposes the initial stop and retention |

**Known mismatches and unimplemented paths** (none affects New L0 / N/original):
- `swing` and `breakeven` are refused on the GPU;
- the sessions hold unit exists only on an unmerged branch;
- RcLog2 detail is CPU only;
- Growth's `next-open` stress is not applicable with the optional rules;
- risk-envelope delivery (`src/risk-envelope/`, GPU Phase 7, acceptance `bb0e3fcf…`) is on this branch chain, not on
  `main` (`main` keeps `3610caaf…`).

## 10. Profit giveback: what the archived evidence shows (Phase 2)

### 10.1 Definitions (kept apart; GIVEBACK_REPORT §1 of the Stage B diagnostics)

| Quantity | Denominator | Meaning |
|---|---|---|
| Conventional marked DD | % of the $100,000 initial allocation | the gated P0 quantity (≤ $35,000) |
| U, unbanked-profit giveback | part of one DD window | open profit above the best banked level, given back |
| E, banked-profit erosion | part of one DD window | decline between the banked high and the starting capital |
| F, starting-capital loss | part of one DD window | equity below the initial allocation |
| Banked-capital DD (BD) | $ vs the initial allocation | the shortfall of marked equity below the best banked level (whole path) |
| Trade principal loss (PL) | % of the lot's funded principal | the deepest P&L below zero of one lot |
| Trade giveback | $ and % of the lot's peak profit | the decline of a lot's positive P&L from its running maximum |

### 10.2 The searched population (Stage B, sealed and replayed; training doors) [A]

- About **90 %** (C19/C21) and **60 %** (C24) of the selections' maximum DD is unbanked giveback (U).
- The rest is banked erosion E; F ≈ 0.
- Inside those windows, giveback sits mostly in lots that **closed profitable**: $380k–$612k summed over 32
  representatives.
  - Their exit reasons are trend exits (retention-enabled **searched** phenotypes; both comparators have retention OFF),
    trailing stops and **gapped trailing stops** ($75k–$209k).
- Deepening below principal is a **different population**: mostly D1 lots held to the maximum hold (C24 CTRL: 57 of 58
  such lots, $185k).

### 10.3 The frozen comparators (FULL ledger; lots #1–#34 development, #35–#46 previously inspected 2025–2026) [A]

| New L0, FULL | D1·GDX | D1·VGT | Growth·VGT | Total |
|---|---:|---:|---:|---:|
| Lots (winners / losers / open) | 31 (23 / 7 / 1) | 7 (6 / 1 / 0) | 8 (8 / 0 / 0) | 46 |
| Net | $221,780.70 | $146,898.43 | $110,926.02 | $479,605.15 |
| Sum of marked peak profits | $446,990.15 | $214,138.20 | $173,572.90 | $834,701.25 |
| Giveback to exit, closed winners | $176,024.60 | $61,235.53 | $62,646.88 | $299,907.01 |
| τ × (N + peak), the same winners | $166,230 | $59,018 | $55,494 | $280,742 |
| Median giveback ÷ (N + peak) (τ) | 0.0632 (0.061) | 0.0769 (0.073) | 0.0621 (0.057) | — |
| Exit reasons | 18 stop, 5 gap, 7 hold, 1 open | 6 stop, 1 hold | 6 stop, 2 gap | — |
| Losing or open lots that ever armed the stop | 0 of 8 | 0 of 1 | — | 0 of 9 |

N/original is the same in every structural respect:
- 44 lots; giveback to exit $162,932 / $69,586 / $62,647 against τ-structural $153,255 / $67,256 / $55,494;
- 8 losing or open lots, none armed.

**Readings.**
1. **The winners' giveback is almost entirely the designed trailing distance.** Each winner gave back ≈ τ × (its value
   at the peak). The small excess (0.2–0.5 percentage points) is the exit cost, interest accrued after the peak, the
   difference between marked minute closes and session highs, and gaps. A smaller τ is the only way to give back less
   at exit, and a smaller τ is exactly what risks earlier exits. **This is a property of the parameters, not a
   malfunction.**
2. **Gaps through the level are a small part.**
   - The fill-below-level cost of New L0's FULL ledger totals $10,918.91 over 9 lots (`gaps-through-stop.csv`; N/original
     $10,918.68).
   - The largest is #9 (T2), an **entry-session** peak that no next-session stop can protect under the current timing
     rules.
3. **Interim pullbacks.** 30 of 37 winners had their largest marked giveback at the exit. The 7 others are all
   D1·GDX, 5 of them in 2020-03 or 2022.
   - So the records bound interim declines above by about the final τ-giveback.
   - They **cannot** say how many interim pullbacks exceeded a smaller stage-2 distance. That is the quantity that
     decides whether tightening helps or causes premature exits, and **it needs authorized simulation**.
4. **Losses are not a trailing-stop problem.** Every losing or open lot of both comparators peaked below the implied
   activation gain and ended at the maximum hold.
   - A tightening that acts only after a profit threshold **cannot touch them**.
   - New L0's binding drawdown episodes are partly or mostly such losses: the D24 window is 47 % giveback (U $9,124.10,
     one gapped exit) and 53 % erosion (one maximum-hold loss); the FULL window is $6,906.10 giveback + $13,479.90
     principal loss.
5. **Financing matters for Growth.** Lot #1 paid $10,819 interest over 359 days. Long holds raise the net-profit
   activation bar to +10 % at day 120 and +15.7 % at day 300 (τ 5.7 %).

### 10.4 Does the evidence support a structural hypothesis? [I]

- **Yes, a narrow one.**
  - In this family, much of the conventional DD of searched phenotypes, and most giveback of winners, is open profit
    that a single fixed trailing distance gives back by construction.
  - A **later, tighter stage** could retain part of it on large winners without touching early-trade behaviour.
- **The evidence does not show that this raises whole-portfolio net.** The retrospective decomposition measures what was
  given back, not what a tighter stop would have kept.
  - A tighter stage converts some later pullbacks into exits.
  - It then forfeits the remainder of trends that a D1 or Growth book cannot cheaply re-enter (§6.2–6.4).
  - It changes funding and displacement.
  - Its extra exits are idealized level fills.
- The closest prior test of this idea (Study 3's profit ratchet) was in-sample favourable and failed forward.
- The hypothesis is worth a controlled test **only** with OFF as a selectable outcome and with whole-portfolio,
  chronologically separated evidence.

### 10.5 What existing artifacts answer, and what needs authorized simulation

| Question | Answerable now? |
|---|---|
| How much of past DD and winner P&L was giveback; which exits; gap costs | **yes** (this report, Stage B diagnostics, risk-metrics tables) |
| Whether losers could be protected by a profit-activated stage | **yes: no** (they never reach activation) |
| How many interim pullbacks a given stage-2 distance would have hit | **no**: needs per-trade path simulation |
| Net effect on the funded portfolio (displacement, re-entry, continuation, interest) | **no**: needs complete pooled replays |
| Whether a staged phenotype beats OFF after joint optimization, chronologically | **no**: needs the Priority 4 search (proposed, not authorized) |

## 11. Audit conclusions

1. D1 and Growth share one net-profit-activated, session-high-based, once-a-day ratcheting trailing stop at one
   distance τ per book. It never acts on the entry session (Growth's initial stop and RC 2 aside), never while the
   trade loses, and its activation can lapse as interest accrues.
2. Related staged behaviour exists (net activation, RC adaptive hold, retention, the d1-refinement activation variants,
   Study 3's ratchets), but **no canonical feature tightens the trailing distance after a profit threshold**. The gap is
   real and narrow.
3. The archived giveback is overwhelmingly the designed trailing distance on large winners, plus a small gap component.
   Losers are a separate population that a profit-activated stage cannot reach.
4. A staged stop affects future entries, capital occupancy and displaced trades, not only the current trade. The effect
   on total shared-capital net is unknown and has to be tested.
