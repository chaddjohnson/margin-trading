# Parity audit

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


## Results (`results/parity/parity.json`, generated 2026-10-19T13:36:24.111Z)

**PASSED**: 156/156 engine cases, 10/10 copy = original checks.

| Section | Cases | Passed | Trades compared | Max |profit/interest/net/DD difference| | Max |daily mark difference| |
| --- | --- | --- | --- | --- | --- |
| A originals at file defaults | 8 | 8 | 244 | 0 | 0 |
| B originals at matched Y | 8 | 8 | 237 | 0 | 0 |
| C originals on other ranges | 12 | 12 | 163 | 0 | 0 |
| E golden master (copies) | 128 | 128 | 2352 | 0 | 0 |

### A–C: the unmodified files

| Case | Trades | Source net | Engine net | Source minute DD | Engine minute DD | Source daily DD | Engine daily DD | Result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| trailingBuy file defaults, stop, through 2023-12-29 | 27 | $52,892 | $52,892 | $50,277 | $50,277 | $47,016 | $47,016 | exact |
| trailingBuy file defaults, next-open, through 2023-12-29 | 27 | $52,867 | $52,867 | $50,508 | $50,508 | $47,247 | $47,247 | exact |
| bufferedLoss file defaults, stop, through 2023-12-29 | 30 | $27,377 | $27,377 | $47,324 | $47,324 | $46,734 | $46,734 | exact |
| bufferedLoss file defaults, next-open, through 2023-12-29 | 30 | $27,243 | $27,243 | $47,324 | $47,324 | $46,734 | $46,734 | exact |
| noReentry file defaults, stop, through 2023-12-29 | 32 | $58,107 | $58,107 | $40,846 | $40,846 | $40,502 | $40,502 | exact |
| noReentry file defaults, next-open, through 2023-12-29 | 32 | $57,982 | $57,982 | $41,019 | $41,019 | $40,502 | $40,502 | exact |
| bufferedLossNoReentry file defaults, stop, through 2023-12-29 | 33 | $76,480 | $76,480 | $33,781 | $33,781 | $32,607 | $32,607 | exact |
| bufferedLossNoReentry file defaults, next-open, through 2023-12-29 | 33 | $76,502 | $76,502 | $33,781 | $33,781 | $32,616 | $32,616 | exact |
| trailingBuy X=10% Y=3%, stop | 28 | $23,662 | $23,662 | $44,659 | $44,659 | $41,317 | $41,317 | exact |
| trailingBuy X=10% Y=4%, stop | 27 | $52,892 | $52,892 | $50,277 | $50,277 | $47,016 | $47,016 | exact |
| bufferedLoss X=10% Y=3%, stop | 30 | $27,377 | $27,377 | $47,324 | $47,324 | $46,734 | $46,734 | exact |
| bufferedLoss X=10% Y=4%, stop | 28 | $69,213 | $69,213 | $39,537 | $39,537 | $36,276 | $36,276 | exact |
| noReentry X=10% Y=3%, stop | 32 | $58,107 | $58,107 | $40,846 | $40,846 | $40,502 | $40,502 | exact |
| noReentry X=10% Y=4%, stop | 29 | $57,688 | $57,688 | $37,593 | $37,593 | $36,770 | $36,770 | exact |
| bufferedLossNoReentry X=10% Y=3%, stop | 33 | $76,480 | $76,480 | $33,781 | $33,781 | $32,607 | $32,607 | exact |
| bufferedLossNoReentry X=10% Y=4%, stop | 30 | $67,729 | $67,729 | $36,003 | $36,003 | $32,962 | $32,962 | exact |
| trailingBuy start..2019-12-31, stop | 7 | $14,163 | $14,163 | $21,352 | $21,352 | $20,540 | $20,540 | exact |
| trailingBuy 2018-01-02..2023-12-29, stop | 25 | $52,091 | $52,091 | $50,277 | $50,277 | $47,016 | $47,016 | exact |
| trailingBuy 2020-01-02..2021-12-31, next-open | 4 | $22,608 | $22,608 | $17,166 | $17,166 | $15,832 | $15,832 | exact |
| bufferedLoss start..2019-12-31, stop | 9 | $328 | $328 | $31,326 | $31,326 | $31,027 | $31,027 | exact |
| bufferedLoss 2018-01-02..2023-12-29, stop | 27 | $19,511 | $19,511 | $47,324 | $47,324 | $46,734 | $46,734 | exact |
| bufferedLoss 2020-01-02..2021-12-31, next-open | 4 | $31,063 | $31,063 | $16,506 | $16,506 | $15,150 | $15,150 | exact |
| noReentry start..2019-12-31, stop | 8 | $3,000 | $3,000 | $34,284 | $34,284 | $33,464 | $33,464 | exact |
| noReentry 2018-01-02..2023-12-29, stop | 30 | $56,155 | $56,155 | $40,846 | $40,846 | $40,502 | $40,502 | exact |
| noReentry 2020-01-02..2021-12-31, next-open | 5 | $30,860 | $30,860 | $16,506 | $16,506 | $15,353 | $15,353 | exact |
| bufferedLossNoReentry start..2019-12-31, stop | 9 | $8,914 | $8,914 | $32,737 | $32,737 | $32,607 | $32,607 | exact |
| bufferedLossNoReentry 2018-01-02..2023-12-29, stop | 30 | $68,613 | $68,613 | $33,781 | $33,781 | $31,464 | $31,464 | exact |
| bufferedLossNoReentry 2020-01-02..2021-12-31, next-open | 5 | $30,860 | $30,860 | $16,506 | $16,506 | $15,353 | $15,353 | exact |

### D: generated copies equal the originals byte for byte

| File | Stop fill | Result |
| --- | --- | --- |
| trailingBuy | stop | identical |
| trailingBuy | next-open | identical |
| bufferedLoss | stop | identical |
| bufferedLoss | next-open | identical |
| noReentry | stop | identical |
| noReentry | next-open | identical |
| bufferedLossNoReentry | stop | identical |
| bufferedLossNoReentry | next-open | identical |
| allIn | stop | identical |
| allIn | next-open | identical |

### F: allIn.ts accounting through the shared replay

| Case | Trades | Net | Minute DD | Daily DD |
| --- | --- | --- | --- | --- |
| allIn armStart 0 stop | 28 | $120,658 | $26,287 | $23,826 |
| allIn armStart 0 next-open | 28 | $120,451 | $26,280 | $23,835 |
| allIn armStart 180 stop | 27 | $119,193 | $26,287 | $23,826 |
| allIn armStart 180 next-open | 27 | $119,004 | $26,280 | $23,835 |

### Source hashes

| File | sha256 |
| --- | --- |
| trailingBuy | `b912cb9e7b761e5425003139daf707b9694f85533594cb3a331d9bc1c647ceb6` |
| bufferedLoss | `2e5819ebafcb0ab5cbf9dffe8a81809b2c9ce78e486bba286dfae1c4dc809653` |
| noReentry | `bbe253273b4ff870a0591be3f5745b13cb42ccf60bc1398687bc6b4af113da6f` |
| bufferedLossNoReentry | `128eaec4d113d19b79ffb008f4cd55e522b6ffa1d7f9476b8ef416c7164af2de` |
| allIn | `d59e10767fa2aa080e3b91a97722d8ed96df0ba830bd0e6d09c0b24b38a7c617` |

## Full-file parity at the holdout

| Case | Trades | Source net | Engine net | Max difference | Result |
| --- | --- | --- | --- | --- | --- |
| trailingBuy file defaults, stop, full file | 33 | $96,055 | $96,055 | 0 | exact |
| trailingBuy file defaults, next-open, full file | 33 | $96,051 | $96,051 | 0 | exact |
| bufferedLoss file defaults, stop, full file | 36 | $70,581 | $70,581 | 0 | exact |
| bufferedLoss file defaults, next-open, full file | 36 | $70,468 | $70,468 | 0 | exact |
| noReentry file defaults, stop, full file | 40 | $85,674 | $85,674 | 0 | exact |
| noReentry file defaults, next-open, full file | 40 | $85,189 | $85,189 | 0 | exact |
| bufferedLossNoReentry file defaults, stop, full file | 41 | $105,412 | $105,412 | 0 | exact |
| bufferedLossNoReentry file defaults, next-open, full file | 41 | $105,075 | $105,075 | 0 | exact |
