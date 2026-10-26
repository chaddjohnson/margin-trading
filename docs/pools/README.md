# D1 shared pools: B4, B5 and the prospective comparison — runbook

Two named, frozen D1 shared-pool configurations:

- **B4** (default): `config/pools/B4.json`. VGT primary + XBI/XRT/KRE lowDd.
- **B5** (leading incumbent forward-test candidate): `config/pools/B5.json`. B4 + GDX portfolioAware.

Both are **inspected historical benchmarks, not forward-validated strategies**. Their 2016–2026 figures reproduce the
frozen research controls to the cent. Those figures are regression anchors, not expected returns.

Commands run from the repository root with Node 24 (`.node-version`). `npm run pools` does **not** load `.env`: no
credential is read, no broker is contacted, nothing is downloaded and no order exists anywhere in this code.

## Commands (each one run and checked; exit status 0)

```bash
# what exists
npm run pools -- list                     # B4, B5 (runnable) and the research-only archive (not runnable)
npm run pools -- show B5                  # books, phenotype references, hashes, funding, anchors
npm run pools -- validate                 # schema + phenotype pins + equality with the frozen benchmark books

# fixed $100,000 pool on the full canonical history (`all` = 2016-01-04 → 2026-10-13), 5 bps per side
npm run pools -- fixed B4                 # → evaluations/pools/all/B4-fixed-5bps/
npm run pools -- fixed B5                 # → evaluations/pools/all/B5-fixed-5bps/
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
npm run pools -- forward report           # with no snapshot: "prospective observation count = 0; not yet evaluated"
npm run pools -- forward import --from <folder> --snapshot <id> --source "<where the bars came from>"
npm run pools -- forward report --snapshot <id>
```

Other options:
- `--dataset training|holdout|final`: a holdout or final window starts flat after a warm-up.
- `--end YYYY-MM-DD`: a diagnostic endpoint.
- `--out DIR`: anywhere except `research/` and `config/`.

Every run writes these files to its output folder (`evaluations/` is git-ignored):
- `report.txt`: the readable report, also printed;
- `summary.json`: schema `pool-run` v1;
- `lots.csv`: every funded lot, with UTC and New York timestamps, raw and friction-adjusted entry and exit prices,
  shares, principal, interest, friction dollars, gross and net, worst mark, open/realized status, same-minute
  candidates, and the refusals while the lot was held;
- `signals.csv`: every virtual decision, funded or refused, with the reason and the holder;
- `daily.csv`;
- `yearly.csv` and `monthly.csv`.

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
  The friction dollars appear in the report and in `lots.csv`.
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
