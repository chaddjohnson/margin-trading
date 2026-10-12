# Research specification (coordinator, frozen before any experiment ran)

Five independent experiments, each run by its own research agent against the same frozen baseline. This
file fixes every implementation interpretation in advance. Agents implement exactly what is written here.

## Rules for every research agent

1. **Write only inside your assigned directory.** Put temporary files in `<your dir>/tmp/`.
   - Never write to `baseline/`, `data/`, `src/`, another experiment's directory, or any shared temporary
     directory (for example a session scratchpad).
   - `baseline/` is read-only and checksummed.
2. **Use the frozen engine and metrics without modification.**
   - Import with `sys.path.insert(0, '<repo>/research/risk-management/baseline')`, then
     `from engine import ...` and `from metrics import ...`.
   - Implement experiments only by subclassing `engine.Strategy` in your own `strategies.py`, using its
     hooks: `entry_size`, `entry_allowed`, `extra_stops`, `add_on`, `on_exit`, `on_session_end`.
   - If a configuration genuinely cannot be expressed through the hooks, stop and report why. Do not
     copy and modify the engine.
3. **Predefined configurations only.**
   - No other parameters, no threshold changes after seeing results, no combinations, and no "refined"
     variants.
   - Sensitivity or robustness studies are out of scope; flag them as future work instead.
4. **No look-ahead.** Every decision at session i may use only data through session i's close (decisions
   at the close) or through session i−1 (decisions before or at the open).
5. **Production code is off-limits.** Do not modify `src/app/allIn.ts` or anything outside your directory,
   and do not commit.
6. **Python:** `/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/41909225-8d9b-4bef-b77e-5932b66e8053/scratchpad/venv/bin/python`
   (pandas, numpy, scipy, tabulate). Use it read-only, and do not install packages into it.

## Frozen baseline (see `baseline/BASELINES.md`)

| Dataset key | File | Range used (full file) | Net profit | Max drawdown |
|---|---|---|---:|---:|
| VGT_2005_2015 | data/VGT/VGT-2004-2015.csv | 2005-02-25 → 2015-10-07 | $11,602 | $73,404 |
| QQQ_1999_2015 | data/QQQ/QQQ-1999-2015.csv | 1999-03-10 → 2015-12-31 | −$2,886 | $149,561 |
| VGT_2016_2026 | data/VGT/VGT-2016-2026.csv | 2016-10-07 → 2026-10-06 | $161,772 | $38,323 |
| QQQ_2016_2026 | data/QQQ/QQQ-2016-2026.csv | 2016-10-07 → 2026-10-07 | $116,388 | $39,237 |

- QQQ_2016_2026 uses the full file through 2026-10-07. The previously quoted $116,710 used an end date of
  2026-10-06; the $322 difference is one extra session marking the open position.
- Engine execution model and extension semantics: see the docstring of `baseline/engine.py`.
  - Extra stops fill at the open if it gaps through them. Otherwise, the highest level the low reaches
    fills. There is one fill per session.
  - Add-on lots are bought at the close, accrue their own interest, never reset or lower the stop, and
    cannot trigger an exit in their purchase session.

## Required outputs (every experiment)

- **`strategies.py`:** your `Strategy` subclasses.
- **`run.py`:** reproduces every configuration on all four datasets. For each (config, dataset) it calls
  `metrics.run_config(experiment, config, strategy, dataset, '<your dir>/results', extra={...})`, then
  `metrics.write_summary(records, '<your dir>/results')`.
- **`results/`:**
  - `summary.json`: the standard record per (config, dataset), plus your experiment-specific `extra`;
  - `trades/<dataset>__<config>.csv`;
  - `daily/<dataset>__<config>.csv`.
- **Your report** (filename below), organised as:
  1. Configuration and exact implementation, including the chronological handling of orders within a
     session and every assumption.
  2. Verification:
     - your `A_baseline` reproduces `baseline/results/summary.json` exactly;
     - spot-check the new mechanics on at least three concrete trades (dates, prices, sizes, fills).
  3. Standard metrics per dataset and configuration (sections A–C of the metrics module).
  4. The matched-exposure comparison: profit, drawdown and profit/DD, each against its control, with the
     differences.
  5. Bear markets (2000–2002, 2007–2009, 2022): period P&L vs within-period drawdown, interest, trades,
     losing trades, largest loss, average borrowed.
  6. Recovery participation (2003, 2009, 2020, 2023, 2025): absolute P&L and P&L relative to the baseline.
  7. Your experiment-specific questions (below).
  8. Dependence on a few trades or one event: identify the trades responsible for any improvement or
     deterioration.
  9. Preliminary classification (Promising / Inconclusive / Unpromising), keeping historical
     observations, backtest calculations, hypotheses, inferences and limitations clearly separate.
  10. Parameters to flag for a later, separately authorised robustness study (do not run it).
- **Do not re-implement the standard metrics.** Use `metrics.standard_metrics` and
  `metrics.matched_control`.
  - Bear and recovery windows are fixed in `metrics.py`.
  - Bear windows: 2000–2002 and 2007–2009 as calendar years, and calendar 2022.
  - Recovery windows: 2003; 2009-03-01 to 2009-12-31; 2020-03-16 to 2020-12-31; 2023; 2025-04-01 to
    2025-12-31.
  - The window stats include the P&L of trades *entered* in each window.

## Experiment definitions and fixed interpretations

### 1. SMA-based sizing — directory `sma-sizing/`, report `SMA_SIZING.md`, experiment `sma_sizing`

- **Configs:** `A_baseline`, `B_bearish_sma200_sizing`.
- **SMA200 at session i:** mean of the closes of sessions i−199 … i (the entry session's close is known at
  the decision).
- **Bearish:** close_i < SMA200_i **and** SMA200_i < SMA200_{i−20}.
- **Sizing:** $50,000 if bearish, otherwise $100,000. If SMA200_{i−20} is unavailable (i < 219 sessions
  into the file), use $100,000 and count the fallback. The size is fixed at entry.
- **Questions:**
  - Losses in 2000–02, 2007–09 and 2022.
  - Whether profitable recovery entries are preserved: the sizes of each dataset's largest winners and
    of the recovery-window entries.
  - Whether drawdown improves beyond deleveraging (matched control).
  - Fallback count per dataset, and the share of entries in the bearish regime.

### 2. Circuit breaker — directory `circuit-breaker/`, report `CIRCUIT_BREAKER.md`, experiment `circuit_breaker`

- **Configs:** `A_baseline`, `B_drawdown_tiers`.
- **Drawdown:** the strategy's own cumulative daily mark-to-market P&L (realized + unrealized − accrued
  interest; continuous, never double-counted), measured from a running peak that starts at 0 and never
  resets.
  - Use the drawdown as of the latest completed session: the engine's `e.dd_prev`, read during session i,
    is session i−1's value.
- **Next entry size:**

| Drawdown | Size |
|---|---|
| < $10,000 | $100,000 |
| $10,000 to < $20,000 | $75,000 |
| $20,000 to < $30,000 | $50,000 |
| ≥ $30,000 | $25,000 |

- Size is fixed at entry. Trading is never suspended.
- **Questions:**
  1. Maximum drawdown and maximum consecutive losses.
  2. Time in each tier (sessions and %, plus entries per tier).
  3. Recovery time after the major drawdowns.
  4. Position sizes during the 2003, 2009, 2020, 2023 and 2025 recoveries.
  5. Whether it gets trapped at low exposure: the longest continuous spell in the $50k/$25k tiers, and
     whether it ever exits them.
  6. Whether it protects capital but prevents recovery.
  7. Verify that the continuous P&L series does not double-count realized losses.

### 3. Protective exits — directory `protective-exits/`, report `PROTECTIVE_EXITS.md`, experiment `protective_exits`

- **Configs:** `A_baseline`, `B_protective_stop_8pct`, `C_protective_stop_10pct`,
  `D_early_deterioration_5pct_5sessions`.
- **B and C:** an unconditional sell stop at entry price × 0.92 (B) or × 0.90 (C), on every session after
  the entry session, via `extra_stops`.
  - It never moves. It is independent of the profit-conditional trailing stop. The 15-day loss exit stays.
- **D:** a sell stop at entry price × 0.95, active only on sessions entry+1 … entry+5 (inclusive), via
  `extra_stops`.
- **Fills:** at the open if the open is at or below the level (stop-market gap fill); otherwise at the
  level if the low reaches it. When several orders trigger, there is one fill (engine semantics).
- **Re-entry:** immediate re-entry eligibility is unchanged (the engine never re-enters on the exit
  session).
- **Questions:**
  1. Protective-stop exits: total, average loss, largest loss.
  2. Re-entries within 5 sessions after a protective exit.
  3. Repeated stop-outs: a protective exit followed, on the very next trade, by another protective exit.
     Report counts and the longest chain.
  4. Cumulative losses across each bear window. Does reducing individual losses reduce cumulative
     drawdown?
  5. Major baseline winners (≥ $10k) that a protective exit interrupted, with the P&L of the overlapping
     variant trades vs the baseline trade.
  6. Profitability and drawdown after financing.

### 4. Recovery-confirmed re-entry — directory `recovery-reentry/`, report `RECOVERY_REENTRY.md`, experiment `recovery_reentry`

- **Configs:** `A_baseline`, `B_two_positive_closes`, `C_close_above_sma10`, `D_recovery_3pct_from_low`.
- **When confirmation applies:** only after a *losing* trade (closed trade net profit < 0, interest
  included) that exited in session x. Otherwise entries follow the baseline. No confirmation is needed
  before the first entry of a dataset or after a profitable exit.
- **Confirmation is stateful and latched:** once satisfied, it stays satisfied until the next entry.
  - An entry at session i needs the original 10% signal at i **and** the latch satisfied by session i's
    close.
  - The latch may be satisfied at session i's own close. There is never a retroactive entry.
- **B:** two consecutive sessions j−1 and j, **both after session x**, each with a positive close-to-close
  return (close_j > close_{j−1} and close_{j−1} > close_{j−2}).
- **C:** some session j > x with close_j > SMA10_j, where SMA10_j is the mean of closes j−9 … j.
- **D:** some session j > x with close_j ≥ 1.03 × min(close_x … close_j). The low includes the exit
  session's close.
- **Questions:**
  1. Entries delayed or eliminated relative to the baseline.
  2. Repeated losing trades avoided.
  3. Profitable rebound entries delayed or missed.
  4. Profit sacrificed by entering later.
  5. Maximum cumulative drawdown and bear-market performance.
  6. Recovery participation, explicitly for 2003, Mar 2009, Apr 2020, Jan 2023 and Apr 2025. Did the
     variant hold a position during the baseline's recovery winners, and what did it earn?
- Document how variant trades are matched to baseline trades (sequences diverge).

### 5. Staged entries — directory `staged-entries/`, report `STAGED_ENTRIES.md`, experiment `staged_entries`

- **Configs:** `A_baseline`, `B_staged_two_positive_closes`, `C_staged_3pct_recovery`.
- **Initial tranche:** $50,000 at the close of the original signal session.
- **B second tranche:** $50,000 at the close of the first session j while the position is still open
  (not exited in session j) such that sessions j−1 and j are both after the entry session and each has a
  positive close-to-close return. The earliest possible is entry+2.
- **C second tranche:** $50,000 at the close of the first session j > entry, while the position is open
  and not exited in j, with close_j ≥ 1.03 × the initial entry price.
- **Constraints:** at most one additional tranche (maximum borrowed $100,000), via `add_on`.
- **Engine handling:**
  - The 15-day loss-exit clock runs from the initial entry.
  - Stop activation and the loss exit use the aggregate shares, invested capital, and per-lot accrued
    interest.
  - The stop level is never reset or lowered.
- **Questions:**
  1. Positions receiving the second tranche (count and %).
  2. Average sessions and calendar days between the initial and additional purchase.
  3. Average total capital deployed.
  4. Maximum drawdown and profitability after financing.
  5. Major winners where the second tranche came late: add price vs initial price, and P&L vs the
     baseline trade.
  6. Major losers where the reduced initial exposure saved money.
- Document how the addition changes the cost basis, stop eligibility (a higher breakeven can delay
  activation) and the eventual exit.

## Coordinator responsibilities after the agents finish

1. Verify that `baseline/` is unchanged (checksums).
2. Re-run each `run.py` independently and confirm the summaries reproduce.
3. Spot-check key calculations.
4. Write `comparison/COMPARISON.md` and `comparison/RECOMMENDATIONS.md`.
