# METRIC_SPECIFICATION — risk metrics of the fixed-slot ledger and the account-margin scenario model

Research-only definitions (PROTOCOL.md §6–§7, frozen). Code: `src/vg-l0-risk-metrics/` (`ledger.ts` data model,
`engine.ts` adapter and reconciliation, `metrics.ts` pure metrics, `stops.ts` exit-state reconstruction, `bundle.ts`
per-run bundle, `margin.ts` account model). Nothing here changes the engine, a gate, a selector default or the standard.

## 1. The ledger being measured (unchanged historical conventions)

| Item | Convention (Priority 3's pool, `src/vg-d1-growth-joint/pool.ts`; NL0 1.0.0 §1.1) |
|---|---|
| Funded slot | one exclusive $100,000 principal; at most one lot open; no compounding, preemption or switching |
| Entry | shares q₀ = $100,000 ÷ (raw fill × 1.0005): the 5 bps entry cost sits inside the fill price, so the entry market value is ≈ $99,950 |
| Exit fill | proceeds = shares × raw × 0.9995 (minus any modelled stop slippage); repaid principal; interest on the repaid principal |
| Interest | 11% simple, outstanding principal × 0.11 × (session date − entry session date) ÷ 365 days; weekends and holidays accrue calendar days (a Monday mark carries the Saturday and Sunday) |
| Partial exits | Growth trend retention sells a fraction f of the current shares and repays f of the outstanding principal; the remainder stays in the slot |
| Marking instants | every regular-session minute close of the held lot's symbol from its fill minute, and every session close (the engine's own instants; a flat session is marked at its close only) |
| Corporate actions | FULL uses forward split adjustment (VGT 8:1 on 2026-04-21); the development doors contain no split; price-only data (no distributions) |
| Capital flows | none: no contributions or withdrawals; the funded principal is financed (the 11% interest is its cost) |

**Reconciliation (`engine.ts reconcile`, every historical replay of this study):** the ledger is rebuilt by re-marking each
funded lot from the raw minute bars; it must reproduce every engine minute-mark change (value and instant), the engine's
maximum minute drawdown with its peak and trough instants, every lot's net, the engine's canonical MAE and best mark, and
Σ lot nets = the run's net. A single discrepancy above 1e-6 relative stops the run.

## 2. Notation

For lot i at marking instant t with price x and session date d: outstanding shares q_i(t), outstanding principal p_i(t),
realized fills ρ_i(t), interest I_i(t) = p_i(t) × 0.11 × (d − e_i)/365.

| Symbol | Name | Formula | Exit cost? | Interest? |
|---|---|---|---|---|
| π_i(t) | marked lot P&L | ρ_i + q_i·x − p_i − I_i | no (the marked-net convention) | yes |
| λ_i(t) | liquidation-equivalent lot P&L | π_i − q_i·x·0.0005 | yes (the sale of the open shares) | yes |
| n_i | realized lot net | Σ fill nets (proceeds − principal − interest) | yes | yes |
| M(t) | marked net (the conventional account curve) | Σ_i π_i(t) (n_i after exit, 0 before entry) | no | yes |
| M^L(t) | liquidation net | Σ_i λ_i(t) | yes | yes |
| R(t) | banked (realized) net | Σ_i ρ_i(t) | yes (realized) | yes (realized) |

Account equity of the research account = C0 + M(t) for any starting capital C0 (no flows): every account-level
principal metric is therefore independent of C0 and is stated in dollars and as a share of the $100,000 slot.

## 3. Conventional marked-equity drawdown (retained intact)

- **DD** = max_t [peak(t) − M(t)] with the engine's strict tracker (`Tracker.updateStrict`): the peak starts at 0 at the
  first instant and moves only to a strictly higher value; the trough is the first instant of the maximum; recovery is the
  first later strictly higher value. Rebuilt and verified equal to the engine (value and instants) in every replay.
- **Period (reset) DD:** the same tracker restarted at a boundary close with peak = M there (2025–2026 resets at the
  2024-12-31 close).
- **DD^L:** the same on M^L (it includes the sale cost of the open shares).
- **Meaning:** a decline of marked account equity, including unrealized profit given back and previously banked profit
  lost. It is a real change of collateral value. It is **not** a loss of invested principal unless the attribution (§5)
  says so.
- **Policy:** the $35,000 ceiling on one fixed $100,000 principal budget stays the unchanged reference of P0/P1.
  Neighbourhood statistics: p90, p95, worst and worst-10% mean (mean of the ⌈0.1 n⌉ largest) with linear interpolation,
  over cent-rounded record values (the audited instrument's convention).

## 4. Trade-level principal loss (per funded lot)

| Field | Definition |
|---|---|
| `principalLossLiq` (PL_i) | max(0, −min over every marking instant of the lot's life **and** its exit of λ_i). 0 when the lot never fell below its funded principal. |
| `principalLossMarked` | the same with π_i (no exit cost on open marks) |
| `principalLossPct` | PL_i ÷ the lot's funded principal (never ÷ a historical peak) |
| `principalLossDate` | the first instant of the minimum (liquidation basis) |
| `realizedPrincipalLoss` | max(0, −n_i) for a closed lot |
| `canonicalMae` | the engine's published MAE = min(lowest π_i mark, n_i) — **not floored at 0** (a lot that never went below its principal has a positive MAE), no exit cost on open marks, negative = adverse. Reported beside PL; the rebuilt marks reproduce it exactly |
| `entryCost` | q₀ × (entry price − raw fill) ≈ $50: the reason almost every lot shows a principal loss of at least ≈ $50–$100 at its fill minute |
| gap-through-stop fill | for a price-stop exit filled below its level: (level − raw fill) ÷ entry raw, and its dollar cost = shares × (level − raw) × 0.9995 |
| `PL_max` | max_i PL_i over the lots of a window (a lot carried into the window counts with its whole life to the window end) |

A losing lot that recovers before its exit keeps its worst exposure in PL_i: the measure never uses the final net alone.

## 5. Portfolio principal and banked-equity risk

| Metric | Definition | What it measures | What it does not |
|---|---|---|---|
| **Starting-capital floor shortfall FS** | max(0, −min_t M^L(t)) (FS^M with M) over the whole run; a reset window measures the shortfall below the window's starting value | account equity below the starting capital (any C0) | declines that stay above the start |
| **Realized-equity drawdown RDD** | strict drawdown of R (start 0); it moves only at fills, so its instants are fill instants | erosion of previously banked profits by realized losses | open losses (until realized); open-profit giveback |
| **Banked-capital drawdown BD** | max_t [H(t) − M(t)], H(t) = max(0, max_{u≤t} R(u)) (BD^L with M^L); window versions start H at the window's starting R | the marked equity's shortfall below the best banked level: realized erosion **plus** open losses below it | any decline of profit that was never banked |
| **Realized loss clusters** | episodes of R below its running high (start 0): high exit, trough exit, recovery exit (or none), depth, lots closed high → trough, losing lots, gross losses, intervening gross wins, worst lot, deepest PL, calendar and funded days | sequences of realized losses **net of intervening profits** | — (the naive Σ of losing trades is never reported as a drawdown) |
| **Losing streaks** | the longest run of consecutive losing closed lots and the run with the largest summed loss | — | — |

Carried positions: a lot open at a window start contributes from its value at that start; RDD and the clusters see it
only when it fills.

## 6. Unrealized-profit giveback

Per lot (marked basis; liquidation twins reported where stated):

| Field | Definition |
|---|---|
| `peakProfit` G_i | max(0, max_t π_i(t)) over the marks and the exit |
| `maxGivebackAboveBreakeven` GB_i | max_t [max(0, max_{u≤t} π_i(u)) − max(0, π_i(t))]: the largest decline of the lot's **positive part** |
| `maxDeclineFromPeak` D_i | max_t [max_{u≤t} π_i(u) − π_i(t)], split at its trough into `declineAboveBreakeven` (max(0, peak) − max(0, trough)) and `declineBelowBreakeven` (max(0, −trough) − max(0, −peak)); the second part is principal loss and is never added to giveback |
| `givebackToExit` | closed lots: max(0, G_i − max(0, n_i)) |
| `givebackShareOfPeak` | GB_i ÷ G_i; undefined (null) when G_i = 0 |
| giveback ÷ principal | GB_i ÷ $100,000 |

**Exact attribution of a portfolio drawdown window [t_p, t_t]** (`attributeDrawdown`). With one funded slot,
M(t) = Σ_i π_i(t) exactly, so DD = Σ_i [π_i(t_p) − π_i(t_t)] and each lot's term splits exactly into

- **profit giveback** max(π_i(t_p), 0) − max(π_i(t_t), 0) — open profit given back above that lot's break-even (negative
  when the lot gained inside the window: an offset), and
- **principal loss** max(−π_i(t_t), 0) − max(−π_i(t_p), 0) — the deepening below that lot's funded principal.

Interest and costs are inside each π_i. The residual DD − Σ is floating point only (|residual| < 1e-9 in every replay of
this study) and is reported. **The decomposition is exact on the actual marked path** because the ledger has one slot,
one cash line and no other flows; it would not be with several simultaneous books, idle-cash interest or external flows.
Each lot is labelled *open at peak*, *entered in window*, or *open at peak and trough*.

§5.9 items (standard 2.2.0) at each cutoff close: the open-lot share of the net (π of the open lot ÷ M; undefined when
M ≤ 0) and the largest open lot's market-value multiple (q·x ÷ $100,000).

## 7. Stop-aware conditional protection (open lot at a close c)

Reconstructed from the raw bars with the exit managers' rules (`stops.ts`), never from prose:

| Field | Definition |
|---|---|
| `postEntryHigh` H | max(raw fill, the entry session's close, every minute high from the fill minute on); then raised by each later session's high through c (the managers skip the entry session in `afterSession`; minutes before the fill are never read) |
| `trailingLevel` | H × (1 − ts), ts = the book's trailing-stop fraction (D1: grid tenths ÷ 1000; Growth: percent ÷ 100) |
| `trailingArmed` | q × level − p − I(next session) > 0 — the net-profit policy: the trailing stop exists only where its fill would lock in a profit after interest (exit cost excluded, as in the engine). **A losing lot has no trailing protection.** |
| `protectiveLevel` | RC 2 (D1 families B, C, D): entry raw × (1 − d ÷ 1000), unconditional, from the session after the fill (or the fill session under entry-day activation) |
| `initialLevel` | Growth initial risk stop (when ON): entry raw − m × ATR(L completed sessions before the fill) |
| not price protection | maximum-hold loss exits (time-based, at the open), the buffered intraday loss, retention's trend exit |
| `retainedRemainder` | a Growth lot after its retention sale: no price-protection credit |
| `retentionSellFraction` | in stage full under retention, an armed trailing event sells only this fraction; the rest keeps only non-trailing levels, else no credit |
| `effectiveLevel` L* | the highest armed executable level |
| `valueAtStop`, `valueStressed10`, `valueStressed20` | ρ + q × min(L*, close) × (1 − g) × 0.9995 − p − I(next), g = 0, 10%, 20% (gap/slippage stress below the level; a level above the close fills from the close) |
| `valueGap30` | the lot's liquidation value if the next session opens 30% below the close (whatever the stops) |
| `conservativeValue` CV | min(λ(c), V₁₀) when an executable price stop is armed; otherwise min(0, λ(c)) |
| `protectedProfit` | max(0, V₁₀) (armed) else 0 — *conditional* profit protected at a modelled executable fill |
| `profitAtRisk` | max(0, λ(c)) − max(0, V₁₀) (armed) else max(0, λ(c)) |
| CN* | Σ realized nets of the lots closed by c + CV (the stop-aware conservative training net) |
| bounded loss exit | D1 books always (a maximum-hold loss exit or a protective stop); Growth·VGT iff its maximum hold or its initial stop is ON |

The next session is the next weekday after c (holidays ignored; it only affects one or three days of interest).
**Verification (gate G-S):** every historical price-stop exit is re-derived: a trailing-stop fill at its level equals the
reconstructed armed level (relative 1e-9); a gap or minute-open fill printed at or below it; protective and initial-stop
exits likewise. **Stops are not guaranteed fills or loss caps:** a gap, a halt, a queue or latency can fill below the level
(the stresses), and minute OHLCV does not order prices inside a minute.

## 8. Account-margin scenario model (separate from the ledger)

| Quantity | Formula |
|---|---|
| Market value MV | Σ q × x over positions (by symbol) |
| Equity E | MV + cash − debt − accrued interest |
| Requirement Req | Σ q × x × m_s: m_s the position's maintenance rate (account default; 1 for a non-marginable position; raised to the concentration rate when its share of MV exceeds the trigger) |
| Excess | E − Req (deficiency < 0) |
| Equity ratio | E ÷ MV |
| Headroom | dollars (excess) and points (E ÷ MV − Req ÷ MV) |
| First-deficiency shock | the smallest common (or weighted two-factor) decline s with excess(s) = 0, by bisection; closed form without concentration: s* = 1 − (debt + I − cash) ÷ ((1 − m) MV); "none" when debt + I ≤ cash |

Illustrative account: a core of $250k / $500k / $1M, 60% VOOG and 40% VGT; the strategy slot = the ledger's lot (market
value q·x, loan = its outstanding principal, accrued interest), the strategy's banked net as cash (owed when negative);
optional other debt. Maintenance scenarios 25% (FINRA Rule 4210 minimum), 35% (Vanguard's published house minimum for
most marginable securities), 50% (Vanguard's published minimum for concentrated positions), 70% (stress). A giveback of
G dollars on the slot lowers the excess by G × (1 − m) at an unchanged rate — even while the trade stays profitable.
Sources and limits: PROTOCOL.md §7. **The model is not the user's account and does not predict a call or a
liquidation.**

## 9. Limitations of the measurement

- Minute OHLCV: no intraminute ordering; marks are minute closes; a low inside a minute is visible to stop logic but not
  to the marks (the engine's convention).
- The liquidation value uses the minute close and the 5 bps model cost; no spread, impact, halt or queue model.
- Interest on the funded principal only; no interest on idle cash; no distributions.
- The exact attribution relies on the single-slot structure; it is exact here and would need a different construction
  for overlapping books.
