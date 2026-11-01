# Study 7 local strategy runners

Execution tooling only. This runs **existing** D1 strategies (the Study 7 research nominations and the frozen
baselines) on the local minute data, through the **unchanged** pools engine. Nothing is optimized, re-tuned or
re-selected, and no D1 rule, allocator semantics or phenotype value changes.

## Prerequisites

- Node **v24.21.0** (`.node-version`). The runner refuses any other version. If needed:
  `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.
- The code: branch `tools/study7-local-runners`, which descends from `research/study7-stability-first-d1`. It needs
  that study's sealed `FROZEN_SELECTION.json`, `results/final/final.json` and research configurations.
- Local canonical data: `data/{VGT,XBI,XRT,KRE,GDX}/data.csv` (git-ignored).
- Run every command from the repository root.

## Commands

```
npm run study7-run -- list
npm run study7-run -- run <alias> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR] [--quiet]
npm run study7-run -- compare <alias> <alias> … [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]
npm run study7-run -- compare --all [--end …] [--cost-bps …] [--out …]      # the 11 required aliases
```

**Defaults:**
- `--end`: the latest New York date covered by every member's local data (2026-10-29 at the time of writing).
- `--cost-bps`: **5 bps per side**.
- Simple 11% margin interest on a 365-day year.
- The fixed $100,000 single funded slot, no compounding.

**Unchanged from the pools engine:**
- accounting from the close of 2016-01-04 and arming on 2017-06-15;
- stops fill at the stop or the gapped open;
- shadow books that commit every signal; first executable signal wins; same-minute ties alphabetical;
- interest and friction inside the path-dependent exits.

**Comparison rules.** `compare` runs every alias on one identical window with the same friction and financing, and
refuses configurations whose conventions differ.

**Errors.** An unknown alias or bad option exits with status 2 and a message; an engine or integrity failure exits 1.

## Aliases (`list` prints the exact sealed IDs, vectors and local data status)

| Alias | What it is | Configuration |
|---|---|---|
| `vg-profit` | Study 7 sealed rank #1, VGT+GDX, profit role, jointly optimized (fold L) | `config/research-pools/study7-stability-first-d1/S7-VG-L-19.json` |
| `vg-robust` | rank #2, VGT+GDX, robust role | `…/S7-VG-L-21.json` |
| `vg-balanced` | rank #5, VGT+GDX, balanced role | `…/S7-VG-L-20.json` |
| `vxr-profit` | rank #6, VGT+XBI+XRT, profit role | `…/S7-VXR-L-31.json` |
| `gdx-profit` | rank #7, GDX standalone (new Study 7 vector) | `…/S7-G-L-12.json` |
| `gdx-balanced` | rank #10, GDX standalone (new Study 7 vector) | `…/S7-G-L-9.json` |
| `gdx-robust` | rank #11, GDX standalone (new Study 7 vector) | `…/S7-G-L-8.json` |
| `vgt-primary` | B1: the registered VGT `primary` alone (frozen) | `config/research-pools/study7-local-runners/S7R-B1.json` |
| `vg-frozen` | B5's unchanged VGT `primary` + GDX `portfolioAware` books (frozen subset) | `config/research-pools/study7-local-runners/S7R-VG-frozen.json` |
| `gdx-portfolio-aware` | the registered B5 GDX book run standalone (frozen; **not** a Study 7 GDX role holder) | `config/research-pools/study5-gdx-d1-b5-three-etf/S5-GDX-portfolioAware.json` |
| `b5-frozen` | the unchanged five-book B5 benchmark | `config/pools/B5.json` |
| `gdx-study5-nearmiss1` (optional) | Study 5 near-miss `d1-ac0aaa704c`, research only, never nominated | `config/research-pools/study5-gdx-d1-b5-three-etf/S5-GDX-NearMiss1.json` |

"GDX standalone" is four different strategies: three new Study 7 vectors (`gdx-profit`, `gdx-balanced`,
`gdx-robust`) and the existing B5 book (`gdx-portfolio-aware`). The runner never picks one silently.

**How a Study 7 alias is resolved:**
1. Take the rank from the sealed `FROZEN_SELECTION.json` (body hash verified).
2. Find the research pool whose books carry exactly those vector IDs and whose status names that rank.
3. Load it through Study 7's research-pool loader. Its grids must equal the sealed books.

**How a frozen alias is resolved:** through the stock pools loader or Study 5's research-pool loader. Its grids must
equal Study 7's frozen constants and the sealed control's books.

## Outputs

Every run writes a **new** directory, `evaluations/study7-runs/<UTC stamp>-run-<alias>/` or `…-compare/<alias>/`. It
is git-ignored and never overwritten; an existing `--out` is refused, and `research/`, `config/`, `data/` and `src/` are
refused. Each run directory holds:

- `report.txt`: the pools report with the full funded-trade ledger;
- `trades.csv` / `trades.json`: every funded lot. Fields include symbol; status (realized, or OPEN marked at the last
  close); entry and exit UTC and New York times; raw and cost-adjusted fill prices; the open-lot mark; principal and
  shares; holding days and sessions; exit reason; gross before costs; interest; entry/exit friction; net; cumulative
  net; maximum adverse excursion and its time; refused signals while held;
- `summary.json`, `daily.csv`, `yearly.csv`, `monthly.csv`, `signals.csv` (every shadow signal, funded or refused);
- `runner.json`: alias, sealed ID, vectors, config and phenotype hashes, window, conventions, data hashes, by-symbol
  figures, the reconciliation against the sealed Study 7 record, and reproducibility (commit, uncommitted runner
  files, Node, engine file hashes);
- `runner-summary.txt`.

A `compare` directory adds `compare.csv`, `compare.json` and `compare.md`: an aligned table plus the shared window,
friction, financing, data hashes and reproducibility metadata.

## Reconciliation

When a run ends on 2026-10-29 at 5 bps, it is compared with the sealed Study 7 final door
(`results/final/final.json` and `final-lots.jsonl.gz`):
- totals to the cent: net, realized, unrealized, interest, friction, minute and daily DD, lot count;
- **trade by trade**: symbol, entry, exit, open state, net, interest, friction.

Any other window or cost is reported as "not applicable", never compared across conventions.

**All history through 2026-10-29 has been retrospectively inspected.** These runs are not independent validation or
prospective monitoring.
