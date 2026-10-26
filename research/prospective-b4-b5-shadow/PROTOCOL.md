# Prospective shadow comparison of B4 and B5 — protocol (version `prospective-b4-b5-shadow-v1`)

**Status:** preregistered. This file and the pool configurations are bound by the write-once
`PROTOCOL_FREEZE.json` (created by `npm run pools -- forward freeze`) **before any market bar dated after 2026-10-13
exists in this repository or is read**. It is an observation protocol, not an optimization or selection study:
nothing is searched, tuned, re-ranked or nominated, and no rule below may change after the freeze. A change is a new
protocol version with its own freeze.

## 1. Purpose

Track, on genuinely new market observations, the two inspected incumbent D1 shared pools:

- **B4** (`config/pools/B4.json`): the **default**; VGT primary, XBI/XRT/KRE lowDd.
- **B5** (`config/pools/B5.json`): the **leading incumbent forward-test candidate**; B4 plus GDX portfolioAware.

Both are historical, inspected benchmarks. Their 2016–2026 figures are reproduced to the cent but are **not**
forward evidence. This protocol produces forward evidence and nothing else. It does not validate either pool, and it
contains no rule that promotes one. Whether B5 replaces B4 is a later decision for the user, informed by these
reports.

## 2. The boundary

- **Cutoff C = 2026-10-13**, the last session of the frozen canonical `all` data. The six member files B4/B5 read
  (VOOG VGT XBI XRT KRE GDX) end 2026-10-13, and their sha256 are bound in the freeze.
- **Forward observations** are the NYSE sessions strictly after C. The first is 2026-10-14.
- **Historical `all` (2016-01-04 → C)** is an inspected baseline. Its P&L, drawdowns, interest and costs never enter a
  forward figure.

## 3. State across the boundary (continuous replay, nothing reset)

A forward run is **one continuous run** of the frozen engine from 2016-01-04 to the last forward session. It uses
exactly the B4/B5 configuration, the frozen shadow policy, and the engine and loader that reproduce the frozen
controls. Replaying the inspected history to establish state is legitimate for these benchmarks: no parameter is
re-estimated. As a result:

- At C nothing is reset or re-armed: the virtual books' reference highs, trailing lows and stops, armed setups,
  post-exit continuation windows, hold timers, reservations and any funded lot continue exactly as they would have
  live.
- The run's state at C must equal the state the frozen `all` run reaches at C, bound in the freeze:
  - the strategy mark;
  - the portfolio equity;
  - lots entered and the lot open at C;
  - cumulative interest.

  A difference stops the report.
- **Baselines** are the marks at C's close:
  - fixed pool: the strategy mark M_C (realized + unrealized, net of interest);
  - portfolio: marked equity E_C.
- **A decision made at C but filled after C** (a reservation carried across the boundary) becomes a new forward lot.
  Its decision is counted in history, its P&L forward.
- **A distribution with ex-date ≤ C and pay date after C** is already in E_C as a receivable. Its payment appears
  in the forward dividend total, but not in the forward equity change, so nothing is double counted.
- **A lot open at C** (carried):
  - Its forward P&L is its final net (or its mark at the last forward close) minus its mark at C. Its pre-C P&L is
    never counted forward.
  - Interest and friction count forward only for accruals and fills after C.

## 4. Data (additive snapshots; the canonical files are never changed)

- **Snapshots.** Post-cutoff minute bars enter only as **snapshots**: `npm run pools -- forward import --from <dir>
  --snapshot <id> --source "<where the bars came from>"`. The source directory holds `<SYMBOL>.csv` for VOOG VGT XBI XRT KRE GDX, in the canonical format
  (no header; `"YYYY-MM-DDTHH:MM:SSZ",open,high,low,close,volume`).
  - A snapshot is cumulative: every session from 2026-10-14 to its end.
  - It is copied to `data/prospective/<id>/`, which is git-ignored like `data/`, and recorded with every file's sha256
    in `research/prospective-b4-b5-shadow/snapshots/<id>.json`.
  - A snapshot id is written once.
- **Never extend `data/<SYMBOL>/data.csv` for this protocol.** `npm run datasets -- append` would change what `all`
  means and break the historical baseline. The forward runner refuses canonical files whose sha256 differs from the
  freeze.
- **Import checks**; any failure refuses the snapshot:
  - every row is dated (New York) after C;
  - timestamps strictly increase, with no duplicate rows;
  - all six symbols cover the same NYSE sessions;
  - the sessions are exactly the NYSE trading days from 2026-10-14 to the snapshot's last date: no gap, no holiday,
    no weekend. The NYSE calendar in `src/lib/calendar.ts` currently ends 2026-12-31. A later session needs a
    reviewed calendar extension first, which the freeze admits only as an append (§8);
  - **only completed sessions:**
    - every session is before the import day (New York time);
    - every session has regular-hours bars;
    - **every** member has a bar in the last 15 regular minutes of every session (12:45–12:59 on early closes). In the
      canonical 2024–2026 data every member's last regular bar is within 2 minutes of the close;
  - any overnight move beyond ±15% is refused, which catches splits as small as 5:4, unless it is either:
    - declared as a split with `--splits <file>` (the format of `config/market-events/splits.json`, stored with the
      snapshot; the frozen splits file is not edited); or
    - confirmed as a genuine price move with `--confirm-move SYMBOL:DATE`, recorded in the snapshot;
  - VOOG/VGT distributions after the ledger's coverage (2026-10-24) may be supplied with `--distributions <file>`
    in the format of `config/market-events/distributions.csv`, plus `--distributions-through <date>`. They are
    validated before storage:
    - VGT/VOOG only;
    - ex-dates after the frozen coverage and no later than the "through" date, which itself must be after the frozen
      coverage;
    - ex-dates and pay dates on NYSE sessions, because the engine books only on session dates;
    - pay date ≥ ex-date;
    - positive amounts, at most 3% of `close_before`;
    - no duplicates.
  - A declared split must explain its overnight move: the adjusted move (open × ratio ÷ previous close) is within
    ±15%.
  - The import first runs the full freeze verification (§8).
- **Composition.** For a report, each symbol's composed file is the frozen canonical file followed by the snapshot
  rows. It is written under `evaluations/pools/forward/<id>/data/` and hashed in the report.
- **Time.** All decisions use the engine's NYSE regular-session minutes in New York time. Timestamps are stored in
  UTC.
- **No fabricated observations.** With no snapshot, the report says "prospective observation count = 0; not yet
  evaluated" and computes no forward P&L.

## 5. Metrics (fixed pool) — 5 bps per side, 11% simple interest, $100,000 per funded trade, one slot

- **Counts:**
  - forward sessions and the first and last forward date;
  - virtual decisions, funded and refused;
  - lots carried, new, closed in the window, and open at the end with their mark.
- **P&L:**
  - forward net = M_end − M_C, attributed per lot (carried lots from their C mark);
  - realized and unrealized parts;
  - forward interest;
  - forward friction in dollars, with the per-side bps recorded.
- **Risk:**
  - **maximum minute-sampled drawdown** of the strategy mark with its peak reset at C, in dollars and as a percent
    of $100,000;
  - the **daily (close) drawdown** separately;
  - the time in market (sessions with a funded lot ÷ forward sessions);
  - concentration (the largest lot's share of forward P&L, P&L by symbol).
- **Borrowing:**
  - forward borrowing dollar-days = forward interest × 365 ÷ 11%;
  - forward net per $1M borrowing dollar-days.
- **Series:** monthly and calendar-year forward tables (`forward.json`, `monthly.csv`).

## 6. Metrics (20% portfolio)

- **Setup.** Initial historical reference $300,000: VOOG $180,000 / VGT $120,000. Each funded trade borrows 20% of
  marked equity when permitted. Profits are reinvested 60/40 and losses are funded by core sales, as frozen.
- **Dividends.**
  - **Frozen** convention (principal): core VOOG/VGT and open VGT lots receive VGT/VOOG distributions.
  - **Symmetric** convention: reported beside it.
  - Distributions of XBI/XRT/KRE/GDX are never credited (the price-only convention). If the forward window passes the
    ledger's coverage, uncredited distributions are disclosed as "INCOMPLETE dividends after <date>".
- **Figures:**
  - forward equity change and return E_end ÷ E_C − 1;
  - **maximum daily % drawdown** of marked equity with its peak reset at C: the largest fall in percent of the
    running peak, the engine's PercentTracker definition. The dollar daily drawdown is the largest fall in dollars,
    and may be a different episode;
  - forward strategy P&L, interest, dividends and borrowing dollar-days (interest × 365 ÷ 11%).

  A forward minute % drawdown is not available from the engine. The whole-run minute % figure, which includes
  history, is shown separately and labelled.
- **Normalized comparison:** B4 and B5 enter the window with different equity: $3.61M and $5.41M at C. Portfolio
  comparisons therefore use:
  - the forward return (E_end ÷ E_C − 1);
  - strategy P&L ÷ cutoff equity;
  - borrowing intensity = forward borrowing dollar-days ÷ cutoff equity.

  Dollar equity changes are reported per pool, but never differenced between pools.
- **Matched borrowing** (reporting only):
  - B4 is re-run at borrowed fractions 5/10/15/20/25/30/35/40/50% on the same observations.
  - Each run's forward return is placed at its own borrowing intensity.
  - B4's return is interpolated linearly at B5's borrowing intensity and compared with B5's forward return.
  - An exact match, including no borrowing on both sides, needs no interpolation.
  - Outside the ladder it is labelled "outside the ladder" and not extrapolated.

## 7. Comparison, scenarios and challengers

- **The comparison: B5 − B4 on the same observations.** It covers:
  - fixed net, minute and daily drawdowns, lots, refusals, utilization, interest, friction, borrowing dollar-days and
    net per borrowing dollar-day. These are fixed-pool dollars, which are comparable: both pools trade $100,000;
  - portfolio forward return, strategy P&L ÷ cutoff equity, daily % drawdown and the return difference at matched
    borrowing intensity.

  Never annualize a window shorter than 12 months. A short window reports cumulative figures only.
- **Reporting-only scenarios.** They change nothing:
  - fixed pool at 0/2/10 bps per side and at 8%/14% simple interest;
  - portfolio under the symmetric dividend convention.
- **Evidence threshold** (descriptive, not a decision rule): before 252 forward sessions (about 12 months) **and** 20
  new forward funded lots per pool, a report states that the evidence is too thin to distinguish B5 from B4.
- **Challengers: none in this version (deferred).** The 15 unseeded finalists of `research/d1-diverse-pool-discovery/`
  are archived research-only in `config/research-pools/diverse-d1-2026-10-26/`. They are not tracked here, because:
  1. that study concluded with no advancement, never evaluated them after 2023, and forbids "one more look" (§22);
  2. a continuous-state track like B4/B5's would replay them through 2024–2026, which is exactly the evaluation that
     study withheld;
  3. a flat start at C would need a new protocol and the user's approval, and would not be comparable with B4/B5's
     carried state.

  A future addendum would freeze a mechanical selection made from the sealed training records alone, with its own
  version, before any post-cutoff bar is read for it. For example: the top-ranked unseeded J and T finalists by their
  sealed confirm-A score, J-u-f1 and T-u-f1. That addendum would also define a flat start at the first session after
  its own freeze date, with an observational warm-up and no 2024–2026 P&L. **B4/B5 tracking does not depend on it.**

## 8. Integrity

`PROTOCOL_FREEZE.json` binds:
- this file's sha256;
- the B4/B5 pool files (file sha256) and their algorithmic hashes;
- the five phenotype grid hashes;
- the code: every file in the transitive import closure of `src/app/pools.ts`, `src/pools/cli.ts` and
  `src/pools/forward/cli.ts`;
- the NYSE calendar, bound **append-only**:
  - its code, without comments and date literals, must not change;
  - every frozen holiday, early close and the coverage start must remain;
  - only dates after the frozen coverage end (2026-12-31) may be added;
- the frozen canonical member files, the splits and distributions files, the distributions manifest and the
  partitions file;
- `src/app.ts`; the `pools` npm script line; the package.json `"imports"` map; `package-lock.json`. The Node version
  is recorded;
- the conventions above;
- the cutoff state of B4 and B5 (from the frozen `all`).

`forward import` refuses when the freeze does not verify, i.e. any bound item differs. `forward report` also refuses
when:
- the canonical data are not the frozen ones;
- the cutoff state does not reproduce;
- a snapshot was imported under a different freeze.

Every report records the snapshot id and hashes and the composed files' hashes. `forward.json` also records the
code digest it ran under, the Node version and the calendar coverage. The code digest is also part of the observation
record. Reports are
reproducible from (freeze, snapshot):
- An observation summary is written once per snapshot to `observations/<id>.json`, sealed with its first-written
  time.
- A later report of the same snapshot must reproduce its content exactly.

## 9. Limitations (stated in every report: `report.txt` and `forward.json`, with or without a snapshot)

- **Dividends:** lots are price-only, except open VGT lots under the frozen convention; non-Vanguard distributions
  are omitted.
- **Brokerage:** Vanguard's 30-day no-loan-value rule for newly bought Vanguard ETFs (VGT and VOOG lots) is not
  modelled. Margin availability, house requirements and calls are not modelled beyond the frozen engine.
- **Capacity and costs:** fills are simulated from minute bars at the frozen per-side friction; there is no live
  order, broker or account access.
- **Small samples:** a few weeks or months of observations cannot distinguish two pools whose historical difference
  is within the range of a few lots.
