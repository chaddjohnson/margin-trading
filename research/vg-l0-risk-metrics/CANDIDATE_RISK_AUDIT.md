# CANDIDATE_RISK_AUDIT — Stage 3 (retrospective; previously examined history)

Sources: `results/audit/centres.json` (51 subjects on FULL, sha256 `7a62da0e…a538b`), `results/audit/nbhd-*.json` (ten
regenerated selection families), `results/margin/*.json`; machine-readable: `results/tables/candidates.csv`,
`trades.csv`, `episodes.csv`, `exposures.csv`, `gaps-through-stop.csv`, `realized-loss-clusters.csv`,
`neighbourhoods.csv`, `margin-*.csv`. Identical windows and economics for every row (one $100,000 slot, 5 bps per side,
11% interest; development 2016-01-04 → 2024-12-31; 2025–2026 reset at the 2024-12-31 close; full history to
2026-10-30). Every subject reproduced its sealed FULL net and DD to the cent first. **DD** = conventional maximum minute
drawdown of the marked net; **GB / PL** = its exact attribution to profit giveback above lot break-even and to loss
below lot principal; **trade PL max** = the deepest single-lot loss below its funded principal (liquidation basis,
intratrade); **FS** = starting-capital floor shortfall; **RDD** = realized-equity drawdown; **BD** = banked-capital
drawdown (METRIC_SPECIFICATION.md).

## 1. The key candidates

| Candidate (provenance) | Window | Net | DD (peak → trough) | DD = GB + PL | Trade PL max (lot) | FS | RDD | BD | Max lot giveback |
|---|---|---:|---|---|---|---:|---:|---:|---:|
| **New L0** (frozen baseline; informed) | development | $382,721.46 | $19,459.83 (2023-01-25 → 02-24) | $9,124.10 + $10,335.73 | $8,092.81 (D1·GDX 2023-02-06) | $1,208.11 | $6,821.01 | $10,335.73 | $17,280.74 |
| | 2025–2026 | $96,883.72 | $20,385.99 (2026-06-17 → 07-17) | $6,906.10 + $13,479.90 | $11,113.57 (D1·GDX 2026-07-07) | — | $11,524.88 | $13,479.90 | $12,324.36 |
| | full | $479,605.18 | $20,385.99 (same) | $6,906.10 + $13,479.90 | $11,113.57 | $1,208.11 | $11,524.88 | $13,479.90 | $17,280.74 |
| **N/original** (Track N; informed; no independent test) | development | $388,031.02 | $19,459.83 (same episode) | $9,124.10 + $10,335.73 | $8,092.81 | $1,208.11 | $6,821.01 | $10,335.73 | $17,280.74 |
| | 2025–2026 | $94,669.70 | $20,385.99 | $6,906.10 + $13,479.90 | $11,113.57 | — | $11,524.88 | $13,479.90 | $12,154.16 |
| | full | $482,700.73 | $20,385.99 | $6,906.10 + $13,479.90 | $11,113.57 | $1,208.11 | $11,524.88 | $13,479.90 | $17,280.74 |
| N/RA1 (Track N; informed) | full | $469,798.48 | $20,385.99 | $6,906.10 + $13,479.90 | $11,113.57 | $1,698.19 | $11,524.88 | $13,479.90 | $17,280.74 |
| **L/RA1** (independent; the only supported procedure; C24 primary) | development | $232,895.18 | $27,219.95 (2022-08-15 → 10-13) | $10,888.18 + $16,331.77 | $9,145.63 (D1·VGT 2022-09-01) | $420.14 | $7,810.53 | $16,331.77 | $23,296.75 |
| | 2025–2026 | $25,801.56 | **$35,071.88** (2025-01-06 → 04-07) | $4,742.65 + **$30,329.23** | **$30,366.47** | — | $0 | $30,329.23 | $17,607.73 |
| | full | $258,696.74 | **$47,493.73** (2024-07-15 → 2025-04-07) | $17,164.50 + $30,329.23 | $30,366.47 | $420.14 | $7,810.53 | $30,329.23 | $23,296.75 |
| L/original (independent) | full | $256,415.79 | $51,407.77 (2024-07-15 → 2025-04-07) | $21,078.54 + $30,329.23 | $30,366.47 | $1,126.12 | $2,572.84 | $30,329.23 | $24,312.20 |
| F/original = B/original (independent) | full | $375,728.18 | $25,353.98 (2026-06-17 → 07-17) | $8,480.76 + $16,873.22 | $9,041.32 | $730.85 | $16,267.65 | $16,873.22 | $17,280.74 |
| F/RA1 (independent) | full | $351,225.88 | $19,060.23 (2026-04-01 → 05-04) | $9,213.41 + $9,846.82 | $9,892.10 | $1,208.11 | $6,391.47 | $9,846.82 | $17,280.74 |
| B/RA1 (independent) | full | $354,050.66 | $19,060.23 | $9,213.41 + $9,846.82 | $9,892.10 | $0 | $4,806.98 | $9,846.82 | $17,280.74 |
| Assignment 2 F/RA1 `GD0e.VC0` (conditional) | full | $440,122.49 | $22,615.51 (2026-06-17 → 07-17) | $7,257.41 + $15,358.10 | $10,100.22 | $1,208.11 | $9,870.85 | $15,358.10 | $17,744.39 |
| Assignment 2 F/original `GA0.VB1e` (conditional) | full | $442,738.06 | $25,242.70 (2026-06-17 → 10-30) | $1,170.76 + $24,071.94 | $9,599.45 | $1,208.11 | $15,751.80 | $17,950.32 | $17,280.74 |
| C4 (incumbent; informed) | full | $401,867.24 | $21,536.85 | $8,056.95 + $13,479.90 | $11,113.57 | $117.10 | $11,524.88 | $13,479.90 | $17,280.74 |
| C4-refined (incumbent; informed) | full | $452,082.36 | $19,477.66 | $7,206.80 + $12,270.86 | $11,113.57 | $0 | $10,315.85 | $12,270.86 | $17,280.74 |

Every attribution closes exactly (residual < 1e-9). Utilization, interest and costs per subject: `candidates.csv`. Per-trade
figures of the development and episode windows are from `results/audit/centres-windows-v2.json` (amendment A3: a lot open at
a window end is measured only up to that end; the development values equal the D24 member replays for all 48 matched
subjects).

## 2. How much of New L0's and N/original's drawdown was giveback versus principal loss? (exact)

**An exact decomposition is possible on the actual marked path** because the ledger has one funded slot, one cash line
and no flows: M(t) = Σ lot P&L, so the drawdown splits lot by lot into the decline of each lot's positive part (profit
given back above its break-even) and the deepening of its negative part (loss below its funded principal).

| Episode | Conventional DD | Profit giveback | Principal loss | Lots |
|---|---:|---:|---:|---|
| New L0 development MDD (2023-01-25 → 2023-02-24) | $19,459.83 | **$9,124.10 (47%)** | **$10,335.73 (53%)** | D1·GDX from 2022-12-16 open at the peak gave back $9,124.10 of open profit (+$16,748 → +$7,624, exited +); D1·GDX 2023-02-06 (−$6,455.48 at a maximum-hold exit) and 2023-02-22 (−$3,880.25 at the trough) lost below principal |
| New L0 full-history MDD (2026-06-17 → 2026-07-17) | $20,385.99 | **$6,906.10 (34%)** | **$13,479.90 (66%)** | D1·GDX from 2026-06-08 gave back $6,906.10 (+$12,257 → +$5,351, closed +); D1·GDX 2026-06-22 (−$2,410.94) and 2026-07-07 (−$11,068.95 at the trough; realized −$9,113.94 at its maximum hold) |
| New L0 2020 crash (2020-02-19 → 04-30) | $17,280.74 | **$17,280.74 (100%)** | $0 | one D1·GDX dip-buy entered 2020-03-19 rose to +$21,111.61 within the session and gapped down to exit at +$10,921 (trailing stop gap, 2020-03-20) |
| New L0 2022 bear | $15,243.93 | $6,802.71 | $8,441.22 | |
| New L0 2025 | $12,324.36 | **$12,324.36 (100%)** | $0 | D1·VGT from 2025-04-21: +$58,996 → +$46,672 (closed +$46,671.65) |
| N/original development and full MDD | identical to New L0 (the same lots) | | | |
| N/original 2022 bear | $15,219.58 | $9,172.83 | $6,046.74 | |
| N/original 2025 | $12,154.16 | $12,154.16 | $0 | |

**Answer.** Of New L0's conventional MDDs, 47% (development) and 34% (full history) were profit giveback and 53% / 66%
loss below lot principal; its 2020 and 2025 episode drawdowns were pure giveback of trades that still closed profitable;
the 2022 and 2026 drawdowns were mostly maximum-hold dip-buy losses. N/original has the identical development and
full-history MDD decomposition; it differs only in 2022.

## 3. Trade-level principal loss, banked equity, giveback (New L0 and N/original, full history)

| Metric | New L0 | N/original |
|---|---:|---:|
| Funded lots | 46 | 44 |
| Trade PL: median / p90 / max | $2,196 / $7,893 / **$11,113.57** | $2,158 / $7,109 / **$11,113.57** |
| Lots below principal by > $5k / > $10k / > $25k / > $35k | 10 / 1 / 0 / 0 | 8 / 1 / 0 / 0 |
| Worst realized losing trade | −$9,113.94 (D1·GDX 2026-07-07 → 07-20, maximum hold) | same |
| Canonical MAE worst (published, not floored, marked) | −$11,068.95 | same |
| Starting-capital floor shortfall | $1,208.11 (2016) | $1,208.11 |
| Realized-equity DD | $11,524.88 (2026-06-18 → 07-20) | same |
| Banked-capital DD | $13,479.90 | $13,479.90 |
| Deepest realized loss cluster | 2 losing lots, −$11,524.88, recovered 2026-08-28 | same |
| Longest losing streak | 2 lots (−$6,821.01, Feb–Mar 2023) | same |
| Largest open-profit giveback of one lot | $17,280.74 (D1·GDX 2020-03-19, closed +$10,921) | same |
| Worst gap through a stop | 3.50% of entry beyond the level, $3,494.53 (D1·GDX 2020-03-20) | same |

The canonical MAE and the principal loss differ by at most $51.30 per lot across all 1,991 audited lots (the MAE is not
floored at zero, uses marked values without the open shares' sale cost, and is signed); 52 lots never went below their
principal on the marked basis (positive MAE).

## 4. Does the $35,000 gate fail because of giveback, principal loss, or both?

- **At the centres:** no key candidate breaches on development. On 2025–2026 and full history only L/RA1 and L/original
  breach (reset $35,071.88; full $47,493.73 / $51,407.77), and their breach is **mainly principal loss**: one Growth·VGT lot
  (breakout entry, no maximum hold, no initial stop) bought 2024-10-30 fell **$30,329.23 below its principal** by
  2025-04-07 (30.3% of the slot), recovered and closed +$5,675.28 on 2026-02-09. The rest of the full-history breach is a
  giveback of $17,164.50 by the previous Growth·VGT lot (closed profitable). This is the clearest principal-loss event in
  the audited set, and it came from an open-ended exit structure, not from protected giveback.
- **In the neighbourhoods** (each candidate's sealed C24 selection family, 256 draws regenerated exactly, development):

| Family | p90 / p95 / worst-10% / worst DD | Breaches > $35k | Giveback share of breach depth | Trade PL max: p90 / worst | BD: p90 / worst (draws > $35k) | FS p90 |
|---|---|---:|---:|---|---|---:|
| New L0 | $32,996 / $35,546 / $36,712 / $50,484 | 18 (7.0%) | 11.6% | $13,025 / $14,578 | $26,340 / $43,019 (2) | $13,270 |
| N/original | $28,425 / $31,977 / $32,328 / $38,367 | 8 (3.1%) | 6.7% | $12,952 / $14,578 | $21,004 / $30,891 (0) | $13,617 |
| N/RA1 | $23,008 / $23,788 / $26,692 / $47,717 | 3 (1.2%) | 12.4% | $12,293 / $13,128 | $16,191 / $39,787 (3) | $15,342 |
| L/RA1 | $28,440 / $32,064 / $32,057 / $44,654 | 1 (0.4%) | 22.4% | $11,352 / $14,535 | $17,550 / $34,672 (0) | $7,556 |
| L/original | $30,586 / $31,132 / $31,231 / $32,076 | 0 | — | $11,285 / $14,829 | $17,774 / $22,995 (0) | $9,046 |
| F/original | $30,691 / $32,014 / $32,478 / $37,913 | 2 (0.8%) | −8.1% (offsets) | $12,131 / $12,439 | $21,022 / $27,844 (0) | $5,501 |
| F/RA1 | $24,397 / $25,777 / $26,318 / $29,590 | 0 | — | $10,623 / $11,714 | $11,838 / $22,846 (0) | $7,685 |
| B/RA1 | $24,484 / $27,004 / $27,457 / $35,087 | 1 (0.4%) | 30.5% | $10,512 / $19,493 | $13,390 / $24,388 (0) | $3,805 |

  On FULL the New L0 and N/original families give the same picture (New L0 p90 DD $33,118, worst trade PL $14,606;
  N/original $31,574, $14,606). **Breaches of the conventional ceiling in these neighbourhoods are driven by clustered
  losses below principal** (giveback is at most 31% of the breach depth, and a net offset in one family); **no single trade in any of the 2,560 draws lost more
  than $19,493 of its principal**, and none more than $25,000. A breach is therefore a sequence of several moderate
  below-principal lots (and some giveback), not a single catastrophic trade and not mainly protected giveback.

## 5. Open exposure and stop state at the cutoffs (reconstructed; METRIC_SPECIFICATION.md §7)

| Candidate | Close | Open lot (multiple; marked) | Executable protection (armed level; % below close) | Value at the level / 10% gap below / −30% open gap | Conservative value | After the close |
|---|---|---|---|---|---:|---|
| New L0 | C19 2019-12-31 | Growth·VGT from 2019-10-10 (1.14×; +$11,909) | trailing (armed), 5.0% below | +$6,142 / −$4,723 / −$22,475 | −$4,723 | peaked +$23,887 (2020-02-19); exited +$13,617 on 2020-02-24 (trailing-stop gap) |
| | C21 2021-12-31 | D1·GDX from 2021-12-15 (1.10×; +$9,987) | trailing (armed), 6.0% | +$3,252 / −$7,131 / −$23,283 | −$7,131 | exited +$3,161 on 2022-01-06 |
| | C23 2023-12-29 | Growth·VGT from 2023-11-03 (1.15×; +$12,988) | trailing (armed), 5.0% | +$7,164 / −$3,730 / −$21,545 | −$3,730 | exited +$13,599 on 2024-02-21 |
| | C24 2024-12-31 | none open | — | — | 0 | — |
| | end 2026-10-30 | D1·GDX from 2026-10-23 (0.95×; −$5,565) | **none**: the profit-conditional trailing stop is not armed on a losing lot and family A has no protective stop; the maximum hold (13 days, due 2026-11-05) is a time exit | — / — / −$34,082 | −$5,612 | still open at the data end |
| N/original | end 2026-10-30 | the same lot | **protective stop 15.9%** below entry (11.2% below the close) | −$16,285 / −$24,687 / −$34,082 | −$24,687 | still open |
| L/RA1 | C24 2024-12-31 | Growth·VGT from 2024-10-30 (1.03×; +$645) | **none** (trailing not armed; no initial stop; no maximum hold) | — / — / −$30,175 | 0 (open loss counted when negative) | fell to −$30,329 (2025-04-07); exited +$5,675 on 2026-02-09 |
| F/original | C21 | Growth·VGT from 2021-12-28 (0.98×; −$1,995) | initial risk stop (0.5% below the close) | −$2,626 / −$12,381 / −$31,548 | −$12,381 | exited −$2,699 on 2022-01-04 (initial stop) |

Every stop level above is the exit managers' own rule recomputed from the bars, verified on every historical stop exit
(gate G-S, 0 failures). **The protection is conditional:** New L0's armed trailing stops at the cutoffs sat 5–6% below the
close and only just above break-even, so a 10% gap below the level would have turned each into a small loss; a large
open winner is protected only to the extent that its trailing level is far above its break-even. **Open-ended Growth
states** (maximum hold OFF and initial stop OFF) — 5 of the 51 audited subjects: L/RA1, L/original and the Track I
finalists `GA0.VB0/R2#1`, `GB0.VC0/R1#1` and `GC0.VD0/R2#1` — have **no executable loss exit at all** once the profit-conditional trailing stop is unarmed;
L/RA1's 2025 principal loss is exactly that case. Gap fills beyond stop levels reached 8.26% of the entry price
(D1·VGT, 2020-03-16, $8,248.66 beyond the level; `gaps-through-stop.csv`).

## 6. N/original versus New L0 — the trade-level explanation (no preference implied)

Over the full history N/original makes **+$3,095.55** (= +$5,309.56 on development − $2,214.02 in 2025–2026). Matching
both FULL ledgers lot by lot (`trades.csv`), every difference is in these lots:

| Period | New L0 lots | N/original lots | Δ net |
|---|---|---|---:|
| Sep–Dec 2022 (GDX decline gate K = 3, r 70%, 60 sessions; D1·GDX Y 0.2%) | D1·GDX 09-01 +$3,676.67; 09-16 −$106.02 (max hold); 09-30 +$2,916.56; 10-10 −$1,622.64 (max hold); 10-25 +$16,759.75 | D1·VGT 09-22 −$2,902.77 (max hold); D1·VGT 10-13 +$5,450.30; D1·GDX 11-03 +$24,007.92 | **+$4,931.13** |
| 2018–2023 small entry differences (Y, buffer, L) | 9 lots with the same dates | same | +$378.46 |
| 2025 (D1·VGT Y 0.9% → 0.2%) | D1·VGT 2025-04-04 +$858.86; 2025-04-21 +$46,671.65 | +$653.31; +$44,515.39 (same dates, an earlier fill in the rebound) | **−$2,361.81** |
| 2026 | two D1·GDX lots | same dates | +$147.80 |

- The development gain comes from the late-2022 GDX sequence: the decline gate blocked further GDX dip entries after
  repeated failures, the slot took two VGT trades instead, and the next GDX entry came on 2022-11-03 at a better price.
  Assignment 3's sealed ablation attributes −$4,956 to removing N/original's GDX gate.
- The 2025–2026 shortfall is essentially one lot: D1·VGT's smaller trailing-buy rebound (0.2% versus 0.9%) filled the
  2025-04-21 entry earlier and higher (its principal loss at entry $2,421 versus $248), so the same winner made $2,156
  less.
- Under the new metrics the two are **identical** on the development and full-history MDDs, the worst trade principal
  loss ($11,113.57), the banked-capital and realized drawdowns, the floor shortfall and the largest giveback. N/original
  had slightly less principal loss in the 2022 bear ($6,046.74 versus $8,441.22) and a lower local neighbourhood tail
  (p90 DD $28,425 versus $32,996; 3.1% versus 7.0% breaches). Its only extra exposure: at the data end its D1·GDX lot has
  a protective stop (bounded at about −$16k to −$25k under the stresses) where New L0's has none.
- The differences ($2–5k) are inside Assignment 3's replicate noise ($6–24k median per cell) and N/original has no
  independent chronological test. **The new metrics do not separate them materially.**

## 7. Margin scenarios (illustrative, never confused with the ledger; `results/margin/`)

- **The brief's example:** a slot position that rises $100k → $250k → $210k on a $500k core (no other debt) loses
  **$40,000 × (1 − m)** of modelled maintenance excess — $30,000 at 25%, $26,000 at Vanguard's published 35% house
  minimum, $20,000 at the published 50% concentrated minimum, $12,000 at a 70% stress — while the trade is still +$110,000.
  Collateral giveback is real even when no principal is lost.
- **What consumes headroom:** holding the slot itself. A $100,000 position bought with a $100,000 loan adds no equity and
  adds m × $100,000 of requirement: at 35% it consumes $35,000 of excess on day one. A winner adds equity faster than
  requirement (a 2.5× slot adds $150,000 of equity and $52,500 of requirement at 35%); a giveback reverses it at (1 − m).
- **Historical overlay** (60/40 VOOG/VGT core bought 2016-01-04 and held, price only; New L0's actual daily slot state):
  with a $250,000 core and no other debt the minimum excess is $129,743 at 35% and $76,725 at 50%, both on 2016-07-05,
  when the core was smallest; with $100,000 of other debt the 50% scenario is deficient on 153 sessions (at the worst date the
  slot accounts for $50,156 of the excess — the 50% requirement on its ≈ $100,000 position — while its own net was −$313); with $200,000 of
  other debt every rate from 35% up is deficient for hundreds of sessions **with or without the strategy**. The five
  audited candidates differ little (they hold the same kind of $100k–$168k positions); L/RA1's open-ended 2025 loss
  matters only when the core is small or other debt high (`margin-overlay.csv`).
- **Joint shocks** (core $500k, other debt $100k, `margin-joint-shocks.csv`): at 35% no cell of the grid (core down to −40%,
  traded ETF down to −50%) is deficient for any slot state; at 50% a 1.0× slot is deficient once the core falls 40% (whatever
  the traded ETF does), or 30% with a 50% GDX fall, or 20% with a 50% VGT fall (VGT is also in the core); a 2.5× slot (a
  large open winner) is never deficient in this grid — its unrealized profit is collateral, until it is given back.
- **What cannot be concluded:** the user's holdings, effective house rates per security, the concentration trigger,
  intraday house actions, the 30-day journaling of Vanguard ETF purchases, distributions and real corporate actions are
  unknown here; these are scenario results only and say nothing about when a broker would call or liquidate.

## 8. Evidence limits

One previously examined history; the 2020, 2022 and 2025 episodes have been examined by many studies; New L0,
N/original, N/RA1, C4 and C4-refined were chosen with later data; neighbourhood findings are local parameter
sensitivity, not chronological reliability; a stop is not a guaranteed fill or a loss cap; the $35,000 ceiling is a
research criterion, not an enforceable limit.
