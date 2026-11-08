# REPORT — Priority 2: joint D1 + Growth optimization for VGT in one shared $100,000 pool

Research only, not deployed. Development 2016-01-04 → 2024-12-31; validation 2025-01-02 → 2026-10-30, which is
**validation on previously examined history, not an untouched holdout**. November–December 2026 were not evaluated.
All dollar figures are on one fixed $100,000 principal budget, with no compounding. They are after 5 bps per executed
side, $0 commission and 11% simple interest on outstanding principal (365-day basis). "Drawdown" (DD) is the maximum
**minute** drawdown of the marked net; its percentage is the dollar figure ÷ $100,000. The ceiling is **$35,000**.

## 1. Conclusion

- **A working combination exists, but it is not a robust improvement.**
  - The joint search found **28 qualified mixed systems** on 2016–2024; each funds both families, with a confirmation
    p90 drawdown ≤ $35,000 and p10 net > 0 over 384 independent draws.
  - The frozen primary, **`C24/informed#1 top`**:
    - **Configuration:** architecture A (exclusive slot), D1-first, a near-VG #2 D1 book and a trend-breakout Growth
      book.
    - **Development:** **$169,722.07**, DD **$23,023.18**; 384-draw median $153,033.64, p10 $123,759.00.
    - **Validation (2025–2026):** **+$22,251.64**, DD $27,145.72 (reset at the boundary).
    - **Whole run (2016 → 2026-10-30):** $191,973.71, DD $27,941.87.
    - **Participation is substantive** (9 D1 lots and 18 Growth lots on development). The causal contributions are
      large and positive: removing D1 costs $94,195.53 and removing Growth costs $74,849.21.
- **It did not beat the simplest fixed combination.** The existing D1 shipped primary plus Growth #4 under A, run in
  the same pool, earned more in every window with less drawdown:

  | Window | That fixed combination | The joint primary |
  |---|---:|---:|
  | Development | $204,940.21, DD $19,534.41 | $169,722.07, DD $23,023.18 |
  | Validation | +$66,585.12 | +$22,251.64 |
  | Full history | $271,525.33, DD $19,534.41 | $191,973.71, DD $27,941.87 |

  - The joint primary's advantage is neighbourhood stability: robust net $137,174.57 vs $91,343.29.
  - The fixed settings were chosen with later information (#4 in the browser with 2016–2026 in view), so their
    strength is descriptive, not an independent result.
- **The selection procedure failed chronologically.** Rerun independently at 2019, 2021 and 2023, its primaries earned
  **−$1,691.64 over 2020–2024** with a **$64,570.38** sequential minute drawdown. By the frozen rule it is
  **"chronologically unsupported"**. The same fixed combination earned $129,153.10 with $19,534.41 on those slices.
- **Combining beats retuning a single family by this procedure:**
  - **Development robust net:** $137,174.57 (joint primary) vs $95,162.78 for the optimized D1 alone and $103,820.75
    for the optimized Growth alone.
  - **Validation:** +$22,251.64 vs +$16,056.95 and +$13,516.86. The optimized Growth alone's validation drawdown
    broke the ceiling ($35,924.63).
- **Allocation design:** A was supported. B never improved anything:
  - The primary never held both families at once.
  - B at 100%/100% equals A because the primary has no partial exits.
  - Smaller B targets lower profit and drawdown roughly in proportion.
  - No downsized admission occurred in any frozen or control run.

## 2. What was built

### 2.1 The pooled engine (`src/vgt-d1-growth-joint/`, PROTOCOL.md §4)

- **Two canonical virtual books**, each run standalone on the same VGT minutes:
  - **D1:** the frozen `ShadowBook` under shadow semantics.
  - **Growth 1.4.0:** `runRiseTrading`'s body on a cached dataset.

  Their signals, setups, gates, eligibility and continuation are exactly the standalone ones.
- **Funding never feeds back into a book.** A refused trade is still taken virtually, so that family makes no new
  decision until its virtual exit.
- **Persistent eligibility vs a refused signal.** Growth's persistent eligibility is a genuine later decision of the
  virtual book, made at its own time and price. A refused funding leaves nothing armed and is never offered again.
- **One principal ledger:**
  - A trade is funded only at its own decision instant, before any trade stamped at that instant.
  - Same-instant decisions follow the declared priority.
  - A grant reserves its principal until the fill.
  - **A — exclusive slot:** $100,000 while nothing is open or reserved. A retained Growth remainder keeps the slot.
  - **B — shared residual capacity:**
    - each family has a target of 25–100% of $100,000;
    - a grant is the smaller of the target and the free capacity ($100,000 − outstanding principal −
      reservations);
    - the minimum grant is $10,000;
    - repaid principal from a partial sale is capacity at once;
    - there are no top-ups.
- **The funded lot** has its own principal, shares, cost and interest from its own fill session.
  - Every exit rule of both families is scale-invariant, so a funded lot exits exactly when and where its virtual lot
    does. It differs only in scale.
  - It always starts at its virtual lot's fill. It can never inherit a gain, a holding age or a pre-entry high.
- **Marks:** every regular minute while a lot is held, and every session close, go into strict trackers. These are
  both canonical engines' conventions.
- **Event order at one instant:** decisions, then exits and partial sales, then fills, then the mark.

**Ledger example** (`results/diagnostics/partial-release-synthetic.json`, B 100%/100%, synthetic sessions — the
tests' case):

1. Growth was granted $100,000.
2. A D1 signal was refused: "no capacity", with Growth lot 1 holding $100,000.
3. Growth sold 50% (494.8021 shares, $50,000 repaid, +$924.07).
4. The next D1 signal saw a capacity of $50,000 and was **downsized** to a $50,000 lot. That lot exited on its own
   rule (+$400.18).
5. The Growth remainder exited later (+$3,336.57). Peak principal stayed $100,000.

A real-data case (`results/diagnostics/D24/diagnostics.json`, D1 primary + 08500a60 · B 50/50):

1. A Growth lot of $50,000 sold half on 2019-05-29, repaying $25,000 for +$2,057.51.
2. D1 was then granted its $50,000 target on 2019-08-05, with a capacity of $75,000.
3. The D1 lot returned +$8,794.44. The Growth remainder exited 2020-03-10, for +$6,149.30 on the whole lot.

Here the admission did not need the release. **No run of the frozen set or the controls had a downsized
admission.**

### 2.2 Parity and tests

- **Parity** (`results/parity/parity-3.json`, sealed for the frozen code): **341 checks, 0 failed**, zero tolerance.
  - **D1** against the N-book engine's fixed mode (`runNAllocator`): every trade, lot, interest, net and minute and
    daily drawdown with its times. This covers both D1 controls under both arming dates and 120 random D1 vectors.
  - **Growth** against `runRiseTrading` + `summarizeSimulation`: every trade, daily mark and drawdown, for both
    controls and 120 random configurations.
  - **Pool identities:**
    - Σ lots = net;
    - B grants ≤ capacity;
    - A never holds two lots;
    - principal ≤ $100,000;
    - a disabled family is never funded;
    - B 100/100 = A without partial sales (22/22).
  - **Causality:** 24 joint configurations on D19 equal their D24 runs through 2019, decision for decision.
  - **Native targets, all to the cent:**
    - 08500a60: development $115,509.15 / $19,344.80; full $160,974.09, realized $151,597.87, unrealized
      $9,376.22, 5 winners / 3 losers / 1 open, validation $45,464.93;
    - #4: $92,575.71 / $14,578.10; full $145,468.46;
    - D1 primary (B1 at 5 bps): $135,359.04 / $19,534.41.
  - **Earlier seals.** `parity.json` and `parity-2.json` came before a speed-up and a reformat (AMENDMENTS R1, R5). All
    three seals are 0-failure.
- **Synthetic tests** (`src/vgt-d1-growth-joint/tests/`, 19 tests, all pass). They cover:
  - partial release then admission, and A's retained slot;
  - the minimum allocation and actual-entry initialization;
  - same-instant priority, a decision judged before its own instant's trades, and reservations;
  - independent exits, terminal marking and continuous year boundaries;
  - identity, the fallback, the banded order and participation;
  - decoding, the screen and neighbourhood determinism and scopes.

### 2.3 Containment, pilot, compute

- **Containment.** Every heavy stage ran in its own unit inside `vgtjoint.slice` (MemoryHigh 44 GiB, MemoryMax 48 GiB,
  swap 0, verified on each unit). The units ran one at a time, driven by `chains/study.sh`, itself a unit
  (08:52–13:02 UTC).
- **Pilot** (`results/pilot/PILOT.md`).
  - Interruption tests: a graceful stop (exit 75), a unit SIGKILL, and a worker death that failed the job in 20 s
    (no hang). Each resumed to a search identical to the straight run.
  - Expected failures were refused as designed: a sealed rerun, FULL without the guard, a failing chain step.
  - Every path was exercised on development data only.
- **Compute.** **1,736,335 fresh evaluations** in the study, archived in `.cache/vgt-d1-growth-joint/jobs/`. The
  Growth engine dominates the cost.

  | Stage | Fresh evaluations | Search time |
  |---|---:|---:|
  | C19 | 303,632 + 45,669 | 33 min |
  | C21 | 375,072 + 45,689 | 51 min |
  | C23 | 323,106 + 45,678 | 52 min |
  | C24 | 537,223 + 60,266 | 85 min |
- **Memory.** Peak job cgroup 6.77 GiB; worker RSS ≤ 0.48 GiB; ArrayBuffers ≤ 35 MiB; no `memory.high`, `max` or
  OOM event (`results/memory/`).

## 3. The joint search (C24 = all of development; `results/search/C24/search.json`, `results/tables/coverage.md`)

- **Independent lane** (8 cells: architecture × Growth entry × recovery gate; no incumbent vector).
  - **Screen:** 16,384 joint proposals.
  - **Promotion:** 512 to rung 1.
  - **Islands:** 16,128 proposals, each fitted with 16 neighbours. The extension island fired in 5 cells. Every
    island stopped on its budget.
  - **Rungs:** 128 at rung 2 (127 feasible) and 55 at rung 3 (54 feasible), then refinement.
  - **Shortlist:** 3 per cell.
  - The earlier cutoffs ran the identical schedule: 13,824, 17,664 and 14,592 island proposals.
- **Informed lane** (C24 only):
  - **Seeds (30):** {D1 primary, VG #2 VGT} × {08500a60, #4, the stable study's development ranks 1–3} × {A,
    B 100/100, B 50/50}. Both families stayed mutable.
  - **Local designs:** 990 (each seed + 32 perturbations).
  - **Islands:** one per architecture, 1,536 proposals.
  - The lane is labelled informed: its seeds carry later information.
- **Single-family controls** (C24 only):
  - D1 alone: 1 cell, 2,048 screened, 2,304 island proposals.
  - Growth alone: 4 cells, 4,096 screened, 3,840 island proposals.
- **Coverage across structures.** Screened / plausible / promoted counts per structural class (cell × maximum hold ×
  retention) are in `results/tables/coverage.md`. Every cell produced feasible fits: 50–85% of rung-1 centres. The
  five most profitable infeasible centres per lane are recorded in the lane results.

### 3.1 The frozen selection (`FROZEN_SELECTION.json`, sha256 `e677e894…7d72`, committed `3ed30ff0` before validation)

| Role | Member | Architecture / Growth | Dev net | Dev DD | Sel. robust | Sel. p90 DD | Conf. median / p10 | Conf. p90 DD (breach) |
|---|---|---|---:|---:|---:|---:|---:|---:|
| **primary**, high-profit, balanced | `C24/informed#1 top` `84d80cc3cd089b07` | A, D1-first / breakout, gate off | $169,722.07 | $23,023.18 | $137,174.57 | $26,007.43 | $153,033.64 / $123,759.00 | $25,391.45 (0.5%) |
| lower-drawdown | `C24/indep/A/breakout/off#3` | A / breakout, gate off, retention 90% | $94,211.03 | $17,326.53 | $84,905.84 | $19,021.95 | $92,479.43 / $77,375.40 | $19,131.17 (0%) |
| other-architecture | `C24/indep/B/rise/off#1` | **B 100/100**, Growth-first / Rise, gate off | $165,383.64 | $29,553.31 | $108,747.77 | $30,081.08 | $125,026.37 / $96,450.24 | $30,675.16 (3.4%) |
| structurally-distinct | `C24/indep/A/breakout/on#1` | A / breakout, **gate on** | $126,583.30 | $25,403.24 | $117,441.66 | $32,797.55 | $122,015.12 / $113,581.36 | $32,370.41 (0.3%) |

**The primary's exact settings** (from `FROZEN_SELECTION.json`):

- **D1:** X 24.2%, Y 0.6%, trailing stop 8.0%, maximum hold 15, L 72, buffer 4.4%, P 10.9%, W 55.
- **Growth 1.4.0:**
  - trend-breakout entry: SMA 93, slope comparison 28, prior high 5;
  - no trend filter, no recovery gate;
  - trailing stop 5.9%, maximum hold OFF;
  - initial ATR stop: 31 sessions × 2.9;
  - retention OFF;
  - continuation classic_d1: window 152, pullback 18%, rebound 3.34%;
  - costs 5 bps per side.
- **Allocation:** A, D1-first.

**Robustness of the primary** (development, `results/tables/qualify-C24.md`):

- **Neighbourhoods:**
  - D1-only perturbations: median $156,348.69, p10 $129,320.54, p90 DD $23,620.49, no breach.
  - Growth-only perturbations: $155,520.23 / $133,379.30 / $25,407.83, 0.8% breach.
  - Small (half radius): $167,393 / $140,963.
  - Wide (1.5 × radius): median $134,341, p10 $91,787, p90 DD $31,221, 5.5% breach, worst $45,787.50.
  - All 384 confirmation draws fund both families; 183 clip at least one coordinate.
- **Stresses (centre):**

  | Stress | Net | DD |
  |---|---:|---:|
  | 10 bps per side | $166,837.72 | $23,120.27 |
  | 20 bps per side | $165,796.49 | $23,456.02 |
  | 14% interest | $153,596.92 | $23,154.69 |
  | +25 bps stop slippage | $164,348.72 | — |
  | Next-open stops | $169,319.18 | — |
  | Whole shares | −$153.07 | — |
- **Toggles:**
  - **Initial stop OFF:** $131,631.69 with DD **$52,501.61**. The ATR stop matters.
  - Continuation OFF, priority flipped and B 100/100 change nothing (the classic_d1 continuation never fired).
- **Concentration:**
  - The largest pool episode, 2020-03-12 → 2020-09-04, earned $48,623.94 (29% of net).
  - **Causal rerun with no new funding in it:** $121,098.13; the arithmetic removal gives the same.
  - **2017-06-15 funding start** (prespecified sensitivity): $149,971.30 (−$19,750.77, losing Growth's 2016 entry).
  - D1's native 2017-06-15 arming changes nothing (its first signal is in 2018).

### 3.2 Family participation and contribution (causal vs booked)

| Development | Booked P&L | Causal contribution (net − net with the family disabled) | Lots | Mean / median hold |
|---|---:|---:|---:|---|
| D1 in the primary | $94,872.86 | **$94,195.53** | 9 | 61.7 / 21 days |
| Growth in the primary | $74,849.21 | **$74,849.21** | 18 (of 24 decisions) | 101.7 / 74 days |

- **Removing D1** leaves Growth alone in the pool at $75,526.54. It takes 24 lots, including six it had been
  refused, because the slot was free.
- **Removing Growth** leaves $94,872.86.
- Booked P&L and causal contribution differ because removing a family changes capital availability.
- The families **never held at the same time** (A). Participation is *mixed*, not token.
- **Six Growth decisions were refused** ("slot occupied" by D1). Their virtual nets were −$3,551, −$5,370, −$11,427,
  +$752, +$13,202 and +$7,072 (sum +$677). This is blocking roughly neutral on balance.

## 4. Controls on identical conventions (`results/tables/qualify-C24.md`, `results/tables/validation.md`)

All runs are continuous from 2016-01-04 under the harmonized conventions. The validation column is the marked change
from the 2024-12-31 close.

| Configuration | Dev net | Dev DD | Dev robust | 2025–26 P&L | Val. DD (reset) | Full net | Full DD | Full realized / unrealized | Lots W/L (full) | Losing $ (full) | Interest (full) |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|---:|---:|
| **Joint primary** (A) | $169,722.07 | $23,023.18 | $137,174.57 | $22,251.64 | $27,145.72 | $191,973.71 | $27,941.87 (27.9%) | $191,973.71 / $0.00 | 22/14 | −$56,989.48 | $85,167.12 |
| Joint lower-drawdown (A) | $94,211.03 | $17,326.53 | $84,905.84 | $25,891.01 | **$35,071.88** | $120,102.04 | **$39,450.81** | $119,054.44 / $1,047.60 | 19/1 | −$130.09 | $51,871.78 |
| Joint other-architecture (B) | $165,383.64 | $29,553.31 | $108,747.77 | $38,964.03 | $25,278.99 | $204,347.67 | $29,553.31 | $204,347.67 / $0.00 | 19/8 | −$46,403.09 | $81,249.32 |
| Joint structurally-distinct (A, gate) | $126,583.30 | $25,403.24 | $117,441.66 | $6,323.36 | **$36,557.22** | $132,906.66 | **$42,024.89** | $133,871.54 / −$964.88 | 9/2 | −$3,569.03 | $77,843.84 |
| Optimized D1 alone | $102,895.89 | $26,172.82 | $95,162.78 | $16,056.95 | $33,522.58 | $118,952.84 | $34,336.64 | $118,952.84 / $0.00 | 6/4 | −$9,224.59 | $41,317.81 |
| Optimized Growth alone | $105,483.45 | $21,694.44 | $103,820.75 | $13,516.86 | **$35,924.63** | $119,000.32 | **$43,280.48** | $114,247.98 / $4,752.33 | 6/0 | $0.00 | $76,605.21 |
| D1 primary alone | $135,359.04 | $19,534.41 | $61,762.49 | $40,901.43 | $14,937.92 | $176,260.47 | $19,534.41 | $176,260.47 / $0.00 | 15/6 | −$13,759.11 | $36,405.48 |
| VG #2's VGT component alone | $102,770.89 | $21,793.66 | $63,483.76 | $47,239.34 | $12,489.08 | $150,010.23 | $21,793.66 | $150,010.23 / $0.00 | 9/4 | −$9,433.98 | $23,536.99 |
| Growth 08500a60 alone | $115,509.15 | $19,344.80 | $83,523.97 | $45,464.93 | $17,240.60 | $160,974.09 | $19,344.80 | $151,597.87 / $9,376.22 | 5/3 | −$8,744.93 | $60,756.16 |
| Growth #4 alone | $92,575.71 | $14,578.10 | $27,504.97 | $52,892.75 | $9,916.01 | $145,468.46 | $14,578.10 | $145,468.46 / $0.00 | 10/3 | −$8,383.68 | $43,487.67 |
| D1 primary + 08500a60 · A | $191,808.45 | $19,534.41 | $91,907.18 | $60,551.20 | $16,336.40 | $252,359.65 | $19,556.63 | $242,983.43 / $9,376.22 | 17/8 | −$18,290.78 | $69,134.25 |
| **D1 primary + #4 · A** | $204,940.21 | $19,534.41 | $91,343.29 | $66,585.12 | $14,950.77 | $271,525.33 | $19,534.41 | $271,525.33 / $0.00 | 20/8 | −$17,915.12 | $68,109.59 |
| D1 primary + #4 · B 50/50 | $113,967.37 | $10,974.74 | $44,503.02 | $46,897.09 | $12,188.83 | $160,864.47 | $12,188.83 | $160,864.47 / $0.00 | 25/9 | −$11,071.40 | $39,946.58 |
| VG #2 VGT + #4 · A | $168,124.40 | $24,793.93 | $88,539.26 | $72,923.02 | $12,978.21 | $241,047.42 | $24,793.93 | $241,047.42 / $0.00 | 14/7 | −$17,817.66 | $55,331.51 |

**Notes on the table:**

- **B 100/100 rows equal A** for every fixed combination; the minimum allocation never binds there.
- **The full control set and statistics** are in `results/tables/` and `results/validation/validation.json`:
  12 combinations; neighbourhoods; holding times; MAE; drawdown dates. For example, the primary's whole-run
  drawdown ran 2024-12-16 → 2025-04-07 and recovered 2025-05-12.
- **External context only:** Study 8's VG #2 pool (VGT + GDX) earned $334,911.93 through 2026-10-30, with a
  $21,303.61 drawdown. It is a different universe.

## 5. Chronological procedure tests (development only; `results/folds/`, `results/tables/folds.md`)

The complete independent joint search and selection was rerun at each cutoff with the same budget, on its physical
door only. Each fold selection was sealed and **committed before its slice opened** (C19 `a5ad22ad`, C21 `eda1578a`,
C23 `72c13b56`). Every fold had a primary: 23, 24 and 24 qualified mixed candidates.

| Fold | Training | Primary (cell) | Training net / DD | Slice | Slice P&L | Slice DD (reset) |
|---|---|---|---:|---|---:|---:|
| C19 | 2016–2019 | A / Rise / gate off | $86,721.30 / $17,565.30 | 2020–2021 | $32,687.07 | **$35,865.27** |
| C21 | 2016–2021 | A / breakout / gate on | $161,749.43 / $25,581.55 | 2022–2023 | **−$29,209.66** | **$38,833.47** |
| C23 | 2016–2023 | A / breakout / gate on | $147,823.63 / $27,513.31 | 2024 | **−$5,019.05** | $24,835.53 |

**Sequential policies 2020–2024** (`results/folds/sequential.json`; minute marks concatenated; switch charges
included):

| Policy | 2020–21 | 2022–23 | 2024 | Net | Sequential minute DD |
|---|---:|---:|---:|---:|---:|
| **Joint procedure (fold primaries)** | $32,687 | −$29,210 | −$5,019 | **−$1,691.64** | **$64,570.38** |
| Role: lower-drawdown | $22,922 | $6,783 | −$843 | $28,711.69 | $26,853.88 |
| Role: high-profit | $11,856 | −$41,750 | −$4,477 | −$34,570.40 | $80,061.89 |
| Fixed: D1 primary alone | $77,253 | $22,145 | $0 | $99,398.02 | $19,534.41 |
| Fixed: Growth #4 alone | $26,604 | $7,604 | $9,853 | $44,060.66 | $14,578.10 |
| Fixed: D1 primary + #4 · A | $85,323 | $33,977 | $9,853 | **$129,153.10** | $19,534.41 |
| Fixed: D1 primary + 08500a60 · A | $77,253 | $34,309 | −$171 | $111,390.47 | $19,534.41 |

- **Verdict (frozen rule): chronologically unsupported.**
- **Why the selections failed.** The fold primaries were fit on very few trades: C19's on one D1 lot and one Growth
  lot in four years, C21's on one and two. Their neighbourhoods looked stable because those few winning trades survive
  small perturbations. That stability did not carry into the next regime: 2022 cost every C21 selection, and every
  C23 selection lost money in 2024.
- **Architecture.** All three primaries chose A.
- **The fixed controls are descriptive only** (their settings were chosen with later information).
- **Scope of this test.** It covers the independent lane only. The informed lane (which supplied the C24 primary)
  inherits later information and has no chronological test.

## 6. Why the joint primary differs from the controls (`results/tables/diagnostics.md`, matched trades, development)

| Primary − other | Δ net | Retimed | Newly admitted | Displaced (other's lots lost) |
|---|---:|---:|---:|---:|
| D1 primary + #4 · A | **−$35,218.15** | 11 lots, −$28,740 | 15 lots, +$33,992 | 11 lots, −$43,146 |
| D1 primary + 08500a60 · A | −$22,086.38 | 9, −$31,230 | 17, +$49,238 | 11, −$42,770 |
| D1 primary alone | +$34,363.03 | 7, +$5,546 | 19, +$73,443 | 9, −$47,302 |
| Growth #4 alone | +$77,146.36 | 4, −$34,287 | 23, +$130,272 | 7, −$18,839 |
| Optimized D1 alone | +$66,826.18 | 3, −$43,539 | 24, +$166,410 | 4, −$56,044 |
| Optimized Growth alone | +$64,238.62 | 5, −$57,508 | 21, +$120,834 | 0 |

- **Every decomposition reconciles to the cent** (check = 0).
- **Against single families**, the gain comes from **newly admitted** trades of the other family in time the slot
  would otherwise sit idle. It is not from better entries: retimed lots lose money, and capital displacement costs.
- **Against the best fixed combination**, the primary admits trades worth less than those it displaces and times
  shared moves worse:
  - it holds more principal (mean $72,527 vs $58,127 on development);
  - it pays more interest ($71,877 vs $57,652).
- **Partial release played no role** for the primary (retention OFF). B never helped any member or control.

## 7. Validation (FULL once; `results/validation/validation.json`, guard sha256 `e677e894…`)

| 2025-01-02 → 2026-10-30 | Primary | Lower-DD | Other-arch. (B) | Distinct | Opt. D1 alone | Opt. Growth alone | D1 primary + #4 · A |
|---|---:|---:|---:|---:|---:|---:|---:|
| P&L | **$22,251.64** | $25,891.01 | $38,964.03 | $6,323.36 | $16,056.95 | $13,516.86 | $66,585.12 |
| 2025 / 2026 | $29,008.91 / −$6,757.28 | $11,681.41 / $14,209.60 | $37,318.47 / $1,645.57 | $12,326.86 / −$6,003.50 | $15,403.52 / $653.43 | $10,922.36 / $2,594.50 | $47,462.75 / $19,122.37 |
| DD (reset) | $27,145.72 | $35,071.88 | $25,278.99 | $36,557.22 | $33,522.58 | $35,924.63 | $14,950.77 |
| Whole-run DD | $27,941.87 | $39,450.81 | $29,553.31 | $42,024.89 | $34,336.64 | $43,280.48 | $19,534.41 |

- **Tests V1–V3** (validation P&L > 0; validation DD ≤ $35,000; whole-run DD ≤ $35,000): **all pass for the
  primary.**
- **V4:** the primary earned less than every fixed control and more than both optimized single-family controls.
- **V5** (report-only): the primary's 128 neighbours on FULL had a validation median of $27,391.83, a p10 of
  $12,825.57, and 96% were positive.
- **Report-only stresses on FULL:**

  | Stress | Validation P&L |
  |---|---:|
  | 10 bps per side | $21,260.78 |
  | 20 bps per side | $19,282.03 |
  | 14% interest | $18,626.98 |
- **Breaches in other members.** Two of the four frozen members (lower-drawdown and structurally-distinct) broke the
  ceiling on validation or the whole run. So did the optimized Growth alone.
- **The drawdown crossing the split.** It ran from 2024-12-16 to the 2025-04-07 tariff low. For the primary, a Growth
  lot opened 2024-08-14 was carried across the boundary (+$4,971.41).
- **Nothing was retuned or reselected after the validation.**

## 8. What the evidence supports and what remains unproven

- **Supported (development):**
  - A shared VGT pool funding both D1 and Growth earns more than either family alone, under the same capital and
    costs. This holds for fixed settings (the four fixed families combine to $155k–$205k against $93k–$135k alone)
    and for jointly searched settings.
  - The gain comes from **filling idle slot time with the other family's trades**, not from better individual
    trades.
- **Not supported:**
  - That **joint optimization improves on simply combining the existing settings**. The fixed D1 primary + #4
    combination beat the joint primary on development net, drawdown, validation and full history.
  - That the **selection procedure works out of sample**: chronologically unsupported, with a −$1,692 sequential net
    and a $64,570 drawdown.
- **Allocation:** A is adequate. B's shared capacity and partial release add nothing for these families. Retention
  exits are rare and the families rarely signal while the other holds, so smaller B targets only scale positions
  down.
- **Uncertainty.**
  - Few trades per window; one episode (2020) is 29% of the primary's development net.
  - Both families trade the same ETF: overlap is not diversification.
  - A historical drawdown ceiling does not bound a future one.
  - Fresh seeds are not fresh market history.
  - The methodology was designed after examining 2016–2026.
- **Not tested:**
  - other ETFs and Priority 3's VGT + GDX pool;
  - preemption, forced switches and learned allocation;
  - funding-aware Growth lifecycles (the capacity hook);
  - November–December 2026.

## 9. Repository checks and disclosures

- **Repository checks:**
  - **Full `npm test`** (in a contained unit, `results/logs/npm-test.log`): **1,274 tests, 1,263 pass, 7 fail,
    4 skipped**, i.e. 1,255 + this study's 19. The 7 failures are the known pre-existing ones:
    - six tests that open `src/app/allin-original.ts` (lowercase; the file is `allIn-original.ts`);
    - the Study 7 runner's reconciliation, pinned to a 2026-10-29 data end.
  - **Study tests:** 19 / 19 pass.
  - **`tsc --noEmit`:** clean.
  - **ESLint:** 0 errors (12 warnings) on the study code.
- **Amendments:** R1–R5, all before the freeze:
  - R1: a bit-exact replay speed-up, with parity re-sealed;
  - R2: the island budget set from the pilot bench (1,024 → 768 proposals);
  - R3: a pre-pilot engine-guard incident;
  - R4: the pilot's validation path;
  - R5: formatting, with parity re-sealed.

  No post-freeze amendment; no rule changed after the freeze.
- **Disclosures:**
  - The pilot printed pilot-budget figures on development folds, including an "unsupported" sequential verdict. No
    rule was changed because of them.
  - The FULL door opened before the freeze only for the Growth controls' known full-history parity targets.
  - The informed seeds include configurations whose 2025–2026 results were already known: 08500a60 ($45,464.93),
    #4 ($52,892.75), and the stable study's failed primary.
  - The C24 primary came from that informed lane.
  - The earlier studies' known 2025–2026 outcomes, and VG #2's, were known before this protocol.

## Priority 2 review — decision before Priority 3

1. **Did the jointly optimized VGT combination demonstrate useful improvement? No.**
   - It qualified on development, and it beat the independently optimized single-family controls on development and
     validation.
   - It did not beat the plain combination of existing settings (D1 primary + Growth #4 under A).
   - Its selection procedure was chronologically unsupported.
   - Its validation (+$22,251.64, DD $27,145.72) is positive but well below every fixed control.
   - Classification: a **working combination**, but **no robust improvement**.
2. **Did both families participate substantively? Yes.** In the primary, D1 had 9 lots and Growth 18 on development
   (11 and 25 through 2026). Each family's causal contribution is about $75k–$94k. They never overlapped in time
   under A.
3. **Which allocation design was supported? A (exclusive slot).**
   - B at 100%/100% was identical whenever no partial sale happened.
   - Smaller B targets traded profit for drawdown roughly one-for-one.
   - No downsized admission occurred in any frozen or control run.
4. **What did the chronological evidence say?** The independent procedure, rerun at 2019, 2021 and 2023, produced
   primaries that broke the ceiling on 2020–21 and lost money on 2022–23 and 2024. This repeats the stable Growth
   study's lesson: neighbourhood stability of few-trade fits does not transfer across regimes.
5. **Lessons to carry forward to Priority 3 (VGT + GDX):**
   - Treat **the plain combination of existing family settings as the benchmark** to beat. It is much stronger than
     any single family.
   - Keep the pool engine (exact parity, independent virtual books). Keep A as the default architecture; drop B
     unless a family uses partial exits often.
   - Prefer few, structured degrees of freedom. Give real weight to chronological evidence before trusting any
     many-parameter joint search.
   - Count trades and episodes before reading neighbourhood stability.

**Awaiting review.** Priority 3 (joint D1 + Growth for VGT + GDX) has not been started.
