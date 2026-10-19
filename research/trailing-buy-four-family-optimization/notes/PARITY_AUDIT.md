The optimizer's engine (`src/four-family/engine.ts`) and accounting (`src/four-family/accounting.ts`) are a
separate, faster implementation of the four strategy files. No optimized figure was produced until this audit
passed: the first full audit (156/156 cases) completed on 2026-10-19 before the first search started at 13:13Z. `search` now
also refuses to run unless `results/parity/parity.json` exists, has passed, and was produced on the current
engine, accounting, data and copy-generator code, which is recorded by hash. That gate was added after the
searches; it codifies the order that was followed. The audit's tolerance is 1e-6 dollars for money and exact equality for
everything else. **Every difference observed was exactly 0**: the engine reproduces the files' floating-point
arithmetic expression by expression.

## What is compared

For every case, the engine's run is compared with the strategy file's own outputs: its returned positions and
entry and exit fills, its `summary.json` and its `daily.csv`.

- **Trades:** count, entry date and timestamp, entry price, fill time, fill minute index, entry execution label,
  rebound decision time and price, setup ID, activation time and price, the reference high frozen at activation,
  trailing low, rebound trigger, shares and investment. For exits: exit date, price, time, minute index,
  execution label, reason, the stop level in force, whether the maximum hold was also due, and the buffered-loss
  signal time. Per trade, interest and profit.
- **Totals:** net, realized and unrealized profit, margin interest, daily and minute-sampled maximum drawdown
  with their peak and trough timestamps, the session count, closed trades and the open position at the end.
- **State-machine counts:** setup activations, fills, cancellations, armed or pending at the end, rebound
  signals, overnight orders and suppressed rebounds. For the restricted families: restrictions, lower-price
  re-entries, recovery resets and non-restricting losses. For the no-reentry families: losing exits. For the
  buffered families: buffered exits and a pending buffered exit at the end. Also every setup's final status and
  reason.
- **Every daily mark-to-market value.**

## Cases (all on 2016-01-04 → 2023-12-29 unless stated; no holdout session is read before the freeze)

- **A. The unmodified files at their exact defaults.** No X, Y or buffer option is passed, so family 1 runs at
  its executable Y = 4% and families 2–4 at Y = 3%. Both stop fills.
- **B. The originals with X = 10% and Y passed explicitly at 3% and 4%.** These are the matched-Y baselines
  used throughout the study.
- **C. The originals on other ranges.** To 2019-12-31; 2018-01-02 → 2023-12-29, where the later first session
  moves the source's own 90-session warmup and reference window; and 2020-01-02 → 2021-12-31 with `next-open`.
- **D. The generated injectable copies equal their originals byte for byte.** The comparison covers trades,
  summary and daily marks, with only the session list injected, for all five files including `allIn.ts`, under
  both stop fills. The copies (`src/four-family/copies.ts`) apply a fixed list of exact textual substitutions:
  an `injected` object, the session list, each hard-coded constant read through `injected.<name> ?? <literal>`,
  and the arming guard raised to `max(L, armStart)`. Each substitution must match exactly once or generation
  fails.
- **E. Golden master.** For each family, the two lattice corners plus 30 random lattice vectors. Each vector
  has a random stop fill, a margin rate of 8%, 11% or 14%, either the source's own warmup or the common first
  eligible session (index 180), and either the full development range or the range to 2019-12-31. Every
  parameter, including L, the stop, the hold and the restriction settings, goes through the copy's injection.
- **F. allIn.ts comparator.** The shared accounting replays `allIn.ts`'s trades and must reproduce its own net
  profit and both drawdowns, with and without the common eligibility start. The same check runs inside every
  comparator run of the study.
- **Synthetic edge cases** (`src/four-family/tests/synthetic.test.ts`, `npm test`). The random synthetic set
  has 240 scenarios. Each covers 50–90 sessions with drawdown and rebound phases, gaps, 25% missing minutes,
  near-empty sessions, 8% of sessions without a closing print, and real early-close dates. Each scenario runs
  random, off-lattice parameters (L 2–13, small X, Y and stops, holds of 1–8 days, buffers including 0) under
  either stop fill. The engine must equal the copies. Over the set, 3,382 trades are compared. The test asserts
  that the set exercises:
  - overnight orders;
  - recovery resets and rebounds suppressed by the reset guard;
  - restrictions;
  - buffered exits;
  - early-close sessions and sessions without a closing print;
  - opening-trade entries;
  - stop-level, gap and minute-open-through-stop exits;
  - maximum-hold exits, including at the closing print.

  Targeted scenarios assert the expected outcome and compare with all four copies:
  - a rebound confirmed by the last minute of the 2017-11-24 early close can't take the 1:00 p.m. closing
    print and fills at the next session's opening trade;
  - a gap through an active stop exits at the opening trade;
  - the maximum hold sells on the first session at least 15 calendar days after entry, after the opening
    trade;
  - a buffered-loss signal on a session's last minute without a closing print fills at the next opening trade,
    while the unbuffered family stays in.

  Two further tests check the reference-high lookback against brute force for several L and first sessions,
  and that nothing arms before the eligibility start.
- **Real-data invariants** (`src/four-family/tests/engine.test.ts`):
  - a run ending at the fold-1 training end equals the same run on data physically truncated there, so
    nothing after a window's last session is read;
  - results are identical with 3 worker threads and in process;
  - every lattice percentage reaches the engine as the same double as its decimal literal.

The holdout command repeats case A on the full file (through 2025-10-13) before it evaluates anything, and
aborts on any mismatch.
