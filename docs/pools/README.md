# D1 shared pools: B4, B5 and the prospective comparison — runbook

Two named, frozen D1 shared-pool configurations:

- **B4** (default): `config/pools/B4.json`. VGT primary + XBI/XRT/KRE lowDd.
- **B5** (leading incumbent forward-test candidate): `config/pools/B5.json`. B4 + GDX portfolioAware.

Both are **inspected historical benchmarks, not forward-validated strategies**. Their 2016–2026 figures reproduce the
frozen research controls to the cent. Those figures are regression anchors, not expected returns.

Commands run from the repository root with Node 24 (`.node-version`). `npm run pools` does **not** load `.env`: no
credential is read, no broker is contacted, nothing is downloaded and no order exists anywhere in this code.

## Commands (each one run and checked, exit status 0, except the two that need post-cutoff data, marked below)

```bash
# what exists
npm run pools -- list                     # B4, B5 (runnable) and the research-only archive (not runnable)
npm run pools -- show B5                  # books, phenotype references, hashes, funding, anchors
npm run pools -- validate                 # schema + phenotype pins + equality with the frozen benchmark books

# fixed $100,000 pool on the full canonical history (`all` = 2016-01-04 → 2026-10-13), 5 bps per side;
# prints the full funded-trade ledger, per-ETF summaries, totals, drawdowns and any open position
npm run pools -- fixed B4                 # → evaluations/pools/all/B4-fixed-5bps/ (trades.csv, trades.json, …)
npm run pools -- fixed B5                 # → evaluations/pools/all/B5-fixed-5bps/
npm run pools -- fixed B4 --end 2025-12-31   # a diagnostic endpoint: shows an open (unrealized) position
npm run pools -- fixed B4 --cost-bps 10   # friction override (0/2/5/10 …); the config is not changed
npm run pools -- costs B5                 # 0/2/5/10 bps in one go → evaluations/pools/all/B5-fixed-<n>bps/
npm run pools -- fixed B5 --json          # the summary as JSON on stdout (files are written either way)

# the 20% portfolio ($300,000 60/40 VOOG/VGT core, 20% of marked equity borrowed per funded trade)
npm run pools -- portfolio B4             # frozen dividend convention (the anchors') → …/B4-portfolio-5bps-frozen/
npm run pools -- portfolio B5 --dividends symmetric

# B4 vs B5 on identical data, capital, interest and costs (fixed and portfolio; --mode fixed|portfolio|both)
npm run pools -- compare B4 B5            # → evaluations/pools/all/compare-B4-B5-{fixed,portfolio}-5bps/

# regression: every summary field = the frozen controls at 0/2/5/10 bps, both modes; lot and daily ledgers
# byte-identical to the frozen research ledgers; anchors to the cent (64 checks, about 1.5 minutes)
npm run pools -- verify                   # → evaluations/pools/verify/verify.json

# research-only archive (metadata only; never runnable)
npm run pools -- research list
npm run pools -- research show diverse-d1/J-u-f1
npm run pools -- research verify          # every field equal to the sealed diverse-d1 records

# prospective comparison (research/prospective-b4-b5-shadow/PROTOCOL.md)
npm run pools -- forward status           # freeze, snapshots, observation count
npm run pools -- forward report           # after the freeze, with no snapshot: "prospective observation count = 0; not yet evaluated"
npm run pools -- forward import --from <folder> --snapshot <id> --source "<where the bars came from>"   # needs data
npm run pools -- forward report --snapshot <id>                                                        # needs data
#   import options: --splits FILE, --distributions FILE --distributions-through DATE, --confirm-move SYMBOL:DATE,
#   --confirm-complete SYMBOL:DATE (both recorded in the snapshot); see research/prospective-b4-b5-shadow/PROTOCOL.md §4
```

Other options:
- `--dataset training|holdout|final`: a holdout or final window starts flat after a warm-up.
- `--end YYYY-MM-DD`: a diagnostic endpoint.
- `--out DIR`: anywhere except `research/`, `config/`, `data/` and `src/`.
  - `costs` writes `DIR/<ID>-<mode>-<n>bps/`.
  - `compare` writes `DIR/<ID>-<mode>/` per run and `DIR/compare-<A>-<B>-<mode>-<n>bps/` per mode.

Every run writes these files to its output folder (`evaluations/` is git-ignored):
- `report.txt`: the readable report, also printed;
- `summary.json`: schema `pool-run` v1;
- `trades.csv`: the funded-trade ledger (below), one row per funded trade;
- `trades.json`: schema `pool-trades` v1, with the same rows plus per-ETF summaries, totals, open positions,
  drawdowns, definitions and the reconciliation checks;
- `signals.csv`: every virtual decision, funded or refused, with the reason and the holder;
- `daily.csv`;
- `yearly.csv` and `monthly.csv`.

### The funded-trade ledger (printed by default by `fixed B4` / `fixed B5`)

After the run header, `npm run pools -- fixed <ID>` prints the following. Nothing extra needs to be run.

1. **Every funded trade in chronological order.** Only lots the shared allocator actually funded appear. Shadow-book
   signals that got no capital are in `signals.csv`. Each row shows:
   - the ETF;
   - entry and exit time (New York; UTC in the CSV);
   - the engine's raw entry and exit fill prices;
   - position size ($100,000, never compounded) and shares;
   - holding period (calendar days; sessions in the CSV) and exit reason;
   - gross P&L, margin interest, execution friction, net P&L and cumulative net P&L;
   - MAE.
2. **Per-ETF summaries:** funded trades, profitable/losing (closed trades only), open, gross P&L, interest,
   friction, net P&L.
3. **Totals:** gross P&L before costs, interest, execution friction, net realized P&L, unrealized (open-position)
   P&L, total net P&L.
4. **Drawdowns:** the maximum minute-sampled and daily drawdowns in dollars and % of the $100,000 notional, with
   their definitions.
5. **Any open position at the endpoint**, with its mark price, accrued interest and marked-to-market net.
6. **The reconciliation checks.**

Definitions — all are the engine's own figures, not estimates:
- **Gross P&L** = shares × (raw exit fill − raw entry fill), before any cost.
- **Friction** = the 5 bps per-side amounts the engine applied to the two fills.
- **Interest** = $100,000 × 11% × `interestDays` ÷ 365. `interestDays` counts whole days from the entry session's
  date to the exit session's date, which is the engine's accrual basis. The table's `days` column is the elapsed
  holding time.
- **Net** = gross − friction − interest, the engine's lot net. This is checked for every trade.
- **MAE** is the engine's existing per-lot worst minute mark while held: shares × last price − $100,000 − accrued
  interest. It is not a drawdown of the pool.
- **An open position at the endpoint** is marked by the engine at the last close. It has no exit fill and no exit
  friction, and its interest is accrued to that close. It is shown as unrealized.
- **Split-adjusted units:** for a run that crosses VGT's 2026-04-21 split, prices and shares are in the run's
  split-adjusted units (stated above the table). Dollar amounts are unaffected.

Reconciliation (printed and in `trades.json`):
- The ledger's total net and interest equal the run summary **exactly** (the same sums), and its trade count equals
  the funded lots.
- Realized + unrealized, gross − friction − interest, and the per-ETF nets all equal the total net (to $0.000001).
- On the frozen `all`, the net, interest, lots and both drawdowns equal the frozen control
  (`research/joint-16-etf-d1/results/controls/controls.json`) **exactly**.

Results on `all` at 5 bps:

| | B4 | B5 |
|---|---:|---:|
| funded trades | 76 | 94 |
| profitable / losing | 47 / 29 | 61 / 33 |
| gross P&L before costs | $339,024.16 | $548,707.56 |
| interest / friction | $47,013.70 / $7,765.71 | $52,830.14 / $9,669.66 |
| net realized | $284,244.74 | $486,207.77 |
| open at 2026-10-13 | none | none |
| reconciliation | all 12 checks pass | all 12 checks pass |

With `--end 2025-12-31`, B4 shows XRT open since 2025-11-12, marked at 85.29 with $1,476.71 accrued interest:
unrealized $2,451.82, realized $285,004.38, total $287,456.20.

## Reference figures (inspected history, 5 bps per side, 11% simple interest)

| | B4 | B5 |
|---|---:|---:|
| **Fixed pool:** net profit | $284,244.74 | $486,207.77 |
| Fixed: max **minute**-sampled drawdown ($ / % of $100,000) | $28,659.34 / 28.66% | $26,509.97 / 26.51% |
| Fixed: max **daily** (close) drawdown | $25,267.95 | $23,788.61 |
| Fixed: funded lots / virtual trades / refused | 76 / 147 / 71 | 94 / 172 / 78 |
| Fixed: margin interest / friction | $47,013.70 / $7,765.71 | $52,830.14 / $9,669.66 |
| Fixed: time in market (sessions from 2017-06-15) | 45.5% | 51.2% |
| **Portfolio** end equity (from $300,000; frozen dividends) | $3,608,484.05 | $5,410,976.72 |
| Portfolio: max **daily** % drawdown / minute % drawdown | 34.65% / 37.01% | 29.67% / 31.09% |
| Fixed net at 0 / 2 / 10 bps per side | $291,774.90 / $289,004.93 / $275,364.20 | $495,746.71 / $492,172.98 / $476,273.69 |

All rows were reproduced by the commands above on the frozen canonical files. B4's and B5's lot ledgers are identical
to the research's (`npm run pools -- verify`). None of this predicts future returns, and a portfolio's growth is not
the fixed pool's profit.

## Conventions (what the numbers mean)

- **Fixed pool, "$100,000 per trade":**
  - One shared margin pool with **one funded slot**. Every funded entry uses a constant $100,000 notional, never
    increased by earlier profits. It is not $100,000 per ETF, and not a share of equity.
  - The books (4 for B4, 5 for B5) watch for signals **concurrently** as virtual books under the frozen **shadow
    policy**. A decision is funded only when no lot or pending order holds the pool; otherwise it is refused, and the
    refusal is logged in `signals.csv`.
  - Two decisions in the **same minute** are funded in alphabetical symbol order.
  - Stops fill at the stop, and time is New York exchange time (regular NYSE minutes).
  - Lots are **price-only**: no distribution is credited.
- **Friction vs commission:** 5 bps **per side** is applied to every fill price (entry and exit). Commission is $0.
  The friction dollars appear in the report and in `trades.csv`.
- **Margin interest:** 11% **simple** annual, 365-day year, accrued daily on the funded principal.
  - Borrowing dollar-days = interest × 365 ÷ 11%.
  - Each report shows strategy net per $1M borrowing dollar-days (borrowing efficiency).
- **Minute vs daily drawdown:**
  - The **minute-sampled** drawdown follows the strategy mark (realized + open position, net of interest) minute by
    minute. The **daily** drawdown samples closes only, so it is smaller. They are reported separately and never
    interchanged.
  - Fixed-pool percentages are of the $100,000 notional. Portfolio percentages are of the running peak of marked
    equity.
- **20% portfolio:**
  - It starts with a **$300,000 core: 60% VOOG ($180,000), 40% VGT ($120,000)**.
  - Each funded trade borrows **20% of marked equity at the decision**, in one shared slot under the same shadow
    policy. Profits are reinvested 60/40 and losses funded by core sales.
  - Dividends: the **frozen** convention (the anchors') credits core VOOG/VGT and open VGT lots with their
    distributions. The **symmetric** convention credits no lot. XBI/XRT/KRE/GDX distributions are never credited.
- **Splits:** forward-adjusted into pre-split units, e.g. VGT 8:1 and VOOG 6:1 on 2026-04-21
  (`config/market-events/splits.json`).

## Historical `all` versus prospective data

- **`all` means every row of `data/<SYMBOL>/data.csv`.** Today that is 2016-01-04 → **2026-10-13**: 2,710 sessions,
  ending where the canonical download ended.
- **The regression anchors apply only while those files are the frozen ones.** Every report says whether they are
  (`= frozen all`).
- **Do not extend the canonical files for forward tracking.** `npm run datasets -- append` would change what `all`
  means and the prospective freeze would refuse it.
- **New bars enter only as snapshots.** `forward import` stores verified, write-once snapshots under
  `data/prospective/<id>/`, with their hashes recorded in `research/prospective-b4-b5-shadow/snapshots/`. A forward
  report composes the frozen files with a snapshot in a separate folder.
- **Position carryover:**
  - A forward run is one continuous run from 2016-01-04. At the cutoff (2026-10-13 close) nothing is reset: trailing
    highs, armed setups, hold timers, reservations and any funded lot continue.
  - Forward P&L is measured from the marks at the cutoff close. A lot open at the cutoff counts only its change after
    the cutoff.
  - Drawdown peaks reset at the cutoff.
  - The run must reproduce the frozen cutoff state, or the report is refused.
  - At 2026-10-13 neither B4 nor B5 holds a lot.
- **Today: prospective observation count = 0; not yet evaluated.** No post-cutoff bars exist in this repository.
  Obtaining them is outside these commands and needs your authorization: an Alpaca download, or bars you supply.

## Files

| Path | What |
|---|---|
| `config/pools/B4.json`, `config/pools/B5.json` | the pool configurations, described below |
| `src/pools/` | schema/loader (`schema.ts`, `load.ts`), runs and reports (`run.ts`, `report.ts`), regression (`verify.ts`), research archive (`research.ts`), prospective (`forward/`), CLI (`cli.ts`), tests (`tests/`) |
| `config/research-pools/diverse-d1-2026-10-26/` | the 15 research-only diverse-d1 finalists, described below |
| `research/prospective-b4-b5-shadow/` | `PROTOCOL.md`, the write-once `PROTOCOL_FREEZE.json`, `snapshots/`, `observations/` |
| `docs/pools/WORK_RECOVERY.md` | the implementation task's recovery checkpoint |

**`config/pools/B4.json` and `B5.json`** (schema `d1-shared-pool` v1):
- Each book names its phenotype in `config/phenotypes/D1/<SYMBOL>.json` and pins its eight parameters with a sha256.
  The loader refuses a pool whose phenotype changed, and checks equality with the frozen benchmark books.
- The algorithmic hashes are B4 `5bfc4fd5…` and B5 `92d73fc3…`.

**`config/research-pools/diverse-d1-2026-10-26/`:**
- It holds the 15 unseeded diverse-d1 finalists (8 J-u, 7 T-u), with exact grids from the sealed assessments,
  scores, failed gates and provenance.
- **Research-only:**
  - not nominated;
  - not validated on 2024–2026;
  - not approved for live deployment;
  - never runnable here;
  - never backtested after 2023.

## Tests

```bash
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/pools/tests/*.test.ts
```

What they cover:
- **Pool schema:**
  - refusals: duplicate symbols, missing, out-of-range, off-grid or bare-number parameters, a hash mismatch, policy,
    slots, compounding, notional, cost, interest and dividend values;
  - phenotype-drift and frozen-reference refusals;
  - the stable hashes.
- **Funding semantics:** the single slot and the constant notional after a win and a loss, and the same-minute tie,
  through the pools layer.
- **Anchors:** B4 and B5 to the cent on the frozen `all`. These are skipped if the local data are absent or changed.
- **Forward accounting:**
  - an open lot carried across the cutoff;
  - no double-counted interest or friction;
  - the drawdown peak reset;
  - zero observations.
- **Snapshot checks:** cutoff, ordering, format, NYSE sessions and holidays, calendar coverage, split-sized moves.
- **Freeze:** the write-once seal and refusals of a changed protocol, member vector or pool.

## Limitations

- **Brokerage:** Vanguard's 30-day no-loan-value rule for newly bought Vanguard ETFs (VGT and VOOG lots) is not
  modelled. Neither are house margin requirements, calls or concentration rules beyond the frozen engine.
- **Dividends:** distributions of XBI/XRT/KRE/GDX are omitted. VOOG/VGT are covered by the ledger through
  2026-10-24.
- **Fills and capacity:** fills are simulated on minute bars at a fixed per-side friction, and capacity is not
  verified at portfolio scale.
- **History:** the 2016–2026 history was inspected while choosing these pools.
