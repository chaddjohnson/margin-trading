# Controls, cache and causal parity (PROTOCOL.md §18) — 2026-10-25, Node v24.21.0

Both stages ran after the protocol freeze (17:23:46Z) and before any pilot or search outcome. Records:
`results/controls/controls.json`, `results/parity/parity.json`, `results/parity/lookahead-supplement.json`.

## 1. The frozen comparators reproduced (controls)

B1, B4, B5 and C0 on the N-book engine, fixed and 20% portfolio, 0/2/5/10 bps, compared **field for field** with the
16-ETF study's `results/controls/controls.json` (which reproduced the portfolio-aware study's records):

| Window | Comparisons | Differences |
|---|---:|---:|
| training, in the expanded load (all 61 eligible symbols loaded) | 28 | 0 |
| `all` through the benchmark door (2016-01-04 → 2026-10-13) | 28 | 0 |

The search-view books (benchmark vectors named by candidate ID, as every searched book is) equal the frozen books on the
replay at all four costs. Selected `all` figures at 5 bps (identical to the prior artifacts to the cent):

| | Fixed net | Fixed minute DD | Portfolio end equity | Portfolio daily % DD |
|---|---:|---:|---:|---:|
| B4 | $284,244.74 | $28,659.34 | $3,608,484.05 | 34.65% |
| B5 | $486,207.77 | $26,509.97 | $5,410,976.72 | 29.67% |
| C0 (core only) | — | — | $2,279,768.98 | 33.89% |

**Node compatibility.** The earlier studies ran on Node 23.6.1; `package.json` requires ≥ 24.21.0. This study runs on
v24.21.0 (fnm); the to-the-cent reproduction above is the compatibility evidence. The full suite passes on 24.21.0.

The symmetric-dividend training portfolio (new figures, no lot receives distributions; the core receives its VGT/VOOG
ones): B1 $1,369,255.88 / 32.78%, B4 $1,671,392.65 / 34.65%, B5 $2,262,888.73 / 29.67% (end equity / daily % DD).

## 2. The parity matrix (658 comparisons, 0 differences)

| Gate | What | Comparisons | Differences |
|---|---|---:|---:|
| P0 | frozen engine = N-book engine, B1 and B4, fixed and portfolio, four costs | 16 | 0 |
| P1 | replay = N-book engine, fixed, four costs, field for field (trades, lots, signals, daily rows, marks, drawdowns): every eligible symbol alone with D1's constants and with a Sobol vector; random subsets of 2/4/8/12/16/24 books including VOOG as a book, no VGT, XOP, the seven symbols with a split inside training (XOP, IJR, EWJ, KIE, IBB, SMH, IAU) and the three sparsest (VOOG, EDV, VPU); B1/B4/B5 frozen books; a six-book pool holding a lot open at the window end | 576 | 0 |
| P1-cut | the same at the fold search ends (2020-06-30, 2021-12-31), 5 bps | 58 | 0 |
| P2 | portfolio consistency (balance-sheet identity at every close, VOOG/VGT core-versus-lot market values, core distributions, lot distributions) under the frozen and the symmetric convention, for a 16-book pool, VOOG alone, VOOG + VGT and B5 | 8 | 0 |
| P3 | lookahead: a later exit's price or time changes no earlier funding decision (real traces) | 1 pool (+ 12 supplementary) | 0 |
| P4 | the worker pool equals the in-process runner: 40 configurations, centres and 4 neighbours each | 1 hash | 0 |

P3 in the frozen stage altered the first closed lot of one pool, which had a single earlier decision — a thin test. A
supplementary run (script outside `src/`, so the frozen code manifest is untouched) altered the **middle** funded lot of
12 random six-book pools (25–75 earlier decisions each; exit price halved, exit three sessions later): every earlier
decision unchanged in all 12. The synthetic six-book lookahead test in the suite also passes.

Median times: the full engine 189 ms, the replay 20 ms per fixed run (P1).

## 3. The cache

Traces (a book's virtual trades over its own symbol) are shared across configurations only through keys that cover
everything that changes them: the trace's own sha256 key (dataset content, window, splits, parameters, settings, code)
inside the record, and in the evaluator's cache the symbol, the **full eight-value grid** and the cost (the D1 candidate
ID is a 40-bit hash prefix and is only a label). Each evaluator is bound to one loaded window, so no trace crosses
windows (trace keys differ across windows: tested). Portfolio figures always come from the full engine, never from
cached fixed-pool traces.

## 4. Determinism

Worker results are reduced in request order; the pool and the in-process runner give byte-identical records (P4; the
benchmark compared 0, 4 and 8 workers). The byte-for-byte re-run of the library and the first 2,000 fold-a arm-J
evaluations in a fresh process (workers and single thread) is recorded in IMPLEMENTATION_AUDIT.md after the fold round.
