# Baseline, parity, time-window barriers and source isolation (PROTOCOL.md §3, §4.4, §18)

All checks ran before the protocol freeze (2026-10-26T04:20:08Z) under code manifest `fd549635…`, Node v24.21.0. The
freeze binds each record by hash (`results/protocol_freeze.json`, index `PROTOCOL_FREEZE.json`). The protocol said any
unexplained difference would stop the study. **None occurred.**

| Check | Record (sha256) | Result |
|---|---|---|
| Benchmark reproduction | `results/reproduce/reproduce.json` (`a217d54f…`) | 28 training + 28 `all` records equal field for field to the 16-ETF study's controls; 12/12 vector-named views equal the frozen books |
| Engine/replay parity P0–P5 | `results/parity/parity.json` (`2139a9c0…`) | 672 comparisons, 0 failures (946 s) |
| Universe re-audit | `results/audit/universe.json` (`06f2fa77…`) | identical to the October 25 audit: 61 eligible, late GDXJ OIH, excluded XLRE |
| Old-study isolation | `results/legacy/legacy-check.json` (`52969d04…`) | October 25 manifest at `348f100b` equal (376 files, `d8b9b900…`); protected trees clean |
| Compute tier | `results/benchmark/tier.json` (`c63d0ab6…`) | tier E (extended); no P&L printed or stored |
| Determinism (after the fold-a search) | `results/determinism/determinism.json` (`323a495e…`) | 8,632 worker-pool and 2,000 single-thread archive lines byte-identical |

## 1. Benchmark values reproduced to the cent

Reference: `research/joint-16-etf-d1/results/controls/controls.json`, frozen dividend convention. The full `all`
history runs 2016-01-04 → 2026-10-13. These are the inspected comparators the study has to beat. They are
reproduction anchors, not projected returns.

| Book | Fixed $100k pool: net (5 bps) | Fixed: minute DD | 20% portfolio: end equity (5 bps) | Portfolio: daily % DD (frozen) |
|---|---:|---:|---:|---:|
| B1 (VGT alone) | $176,260.47 | $19,534.41 | $2,958,025.76 | 32.78% |
| B4 | $284,244.74 | $28,659.34 | $3,608,484.05 | 34.65% |
| B5 | $486,207.77 | $26,509.97 | $5,410,976.72 | 29.67% |
| C0 (core only, no strategy) | — | — | $2,279,768.98 | 33.89% |

- **All four costs (0/2/5/10 bps) and both modes equal field for field.** For example, B5 fixed earned $495,746.71 at
  0 bps and $476,273.69 at 10 bps; B4 fixed earned $291,774.90 and $275,364.20.
- **Training partition (2016-01-04 → 2023-12-29, 2,012 sessions):** all 28 records equal, with no difference.
- **The search's own view of the benchmarks** (vector-named books on the replay evaluator) equals the frozen books in
  net, minute drawdown and lots at every cost (12/12).
- **Symmetric dividend convention on training** (used by every gate; no lot receives distributions):

  | Book | Daily % DD | Minute % DD |
  |---|---:|---:|
  | B1 | 32.78% | 35.21% |
  | B4 | 34.65% | 37.02% |
  | B5 | 29.67% | 31.09% |

- B1's $176,260.47 at 5 bps ($178,574.30 at 0 bps) is the split-corrected VGT figure. The older $195,186 was before
  the 8:1 split correction and is not quoted.

## 2. Engine versus replay (cache) parity, P0–P5

Every candidate number in this study comes from the trace-replay fast path; portfolio figures come only from the
full engine. Parity proved that the two agree before anything was optimised.

| Test | What it compares | Count | Result |
|---|---|---:|---|
| P0 | frozen engine = N-book engine (B1, B4; fixed and portfolio; 4 costs) | 16 | equal |
| P1 | replay = N-book engine, field for field (trades, lots, signals, daily rows, marks, drawdowns) | 648 | equal |
| P2 | portfolio consistency under both dividend conventions | 8 | equal |
| P3 | lookahead: altering a later exit changes no earlier funding decision | 12 pools | 12/12 equal |
| P4 | worker pool = in-process runner | 40 configurations × (centre + 4 neighbours) | equal |
| P5 | temporal block marks of the replay = full engine's daily marks at the 7 boundaries | 36 cases | 36/36 equal |

P1 covered:
- every eligible symbol alone, and random pools of 2, 4, 8, 12, 16, 24 and 32 books;
- B1, B4 and B5, and a pool with a lot open at the window end;
- the cuts at both fold search ends.

The pools included:
- VOOG as a book;
- every split symbol (XOP, IJR, EWJ, KIE, IBB, SMH, IAU);
- the sparsest-coverage symbols (VOOG, EDV, VPU) and the thinnest-volume ones (KIE, EDV, VOOG).

P3 altered the middle lot of 12 random six-book pools; each pool had 15–113 earlier funding decisions, and none changed.

## 3. Time-window barriers (data doors)

Each door refuses before reading a byte when its precondition fails. Each loaded window is physically truncated,
with a last-date assertion and per-symbol bar hashes recorded in the stage record.

| Round | Door | Last date loaded | Sessions | Precondition |
|---|---|---|---:|---|
| fold-a search | `trainingUniverse` (optimization) | 2020-06-30 | 1,131 | — |
| fold-a validation | `validationUniverse` | 2021-12-31 | 1,511 | sealed `PICKS.json`; `picksHash` = `206466c4…` |
| fold-b search | `trainingUniverse` | 2021-12-31 | 1,511 | — |
| fold-b validation | `validationUniverse` | 2023-12-29 | 2,012 | sealed `PICKS.json`; `picksHash` = `0f6cdcdc…` |
| final search and selection | `trainingUniverse` | 2023-12-29 | 2,012 | — |
| 2024-01-02 → 2026-10-13 | `evaluate` | not opened | — | a frozen selection naming nominees (none: GP failed) |

- The fold and final **selections** reload the training window through the same code path. That path asserts the
  last date and checks the audited file hashes, but the selection writes no door record of its own; the round's door
  record is in its `search.json`. The pre-selection-freeze review confirmed the final door (end and last date
  2023-12-29, 2,012 sessions, bar hashes equal to the final calibration's). The latest funded decision in any final
  selection record is 2023-12-14.
- Evaluators, trace keys and archives are per window; no cache entry crosses a window (cache keys cover dataset
  content, window, splits, the full parameter grid, settings, cost and code).
- **Leakage tests** run the real loader on fixture CSVs (`src/d1-diverse/tests/leakage.test.ts`):
  - the fold door loads nothing after the search end;
  - the validation door refuses before the picks exist, and the evaluation door refuses without a nominee;
  - **mutation:** raising post-cutoff prices by 3% leaves the archives, promotion, refinement, pruning and
    assessment records and the picks byte-identical. The same shift before the cutoff changes them, and an
    untruncated load sees it.
- The benchmark reproduction above read `all` through a separate benchmark door. That door's symbol list is fixed in
  code to the benchmark members (VOOG VGT XBI XRT KRE GDX), and no candidate configuration is evaluated through it.

## 4. Source isolation

- **New namespaces only:**
  - code in `src/d1-diverse/`, plus `src/app/diverseD1.ts`, one registry line in `src/phenotype/strategies.ts` and its
    generated row in `config/phenotypes/COMPATIBILITY.md`;
  - records under `research/d1-diverse-pool-discovery/`.
  - The neighbourhood instrument, genome operators and engines are imported unchanged from `src/d1-robust/`,
    `src/joint-16-etf-d1/` and `src/portfolio-aware-d1/`; no file there was edited.
- **The October 25 study** was checked at its own commit from git objects (`legacy-check`). Its code manifest is equal
  (376 files), and its protected trees are unchanged against `HEAD`:
  - `research/d1-robust-pool-discovery`, `research/joint-16-etf-d1`, `research/portfolio-aware-d1-optimization`,
    `research/d1-robust-design-review`;
  - `config/phenotypes/D1`, `config/phenotypes/README.md`.
  - None of its stages was called again, and none of its hashes was recomputed into a new pin.
- **Canonical data:** the 64 `data/<SYMBOL>/data.csv` hashes and the split, distribution-ledger and partition files
  were captured at the start (`results/baseline/`). They were re-verified unchanged when `PROTOCOL_FREEZE.json` was
  written (2026-10-26T07:47:01Z). The final audit re-verifies them again (`IMPLEMENTATION_AUDIT.md`).
- **No download, no broker call, no order**, and no credential read: the study reads only local CSVs and configs.

## 5. Compute tier (outcome-free)

`benchmark` measured unit costs on the machine (Apple M1 Pro, 10 cores, 16 GB; no configuration P&L stored):

| Unit cost | Value |
|---|---|
| Trace | 8.6 ms |
| Replay (4-book pool) | 4.1 ms |
| Full engine run | 2.8 s |
| Speed-up with 8 workers | 6.2× |

The rule picks the first tier of E, F and R projected at ≤ 20 h wall-clock and ≤ 13 GB with a trace cache of
≥ 20,000. It picked **E**:
- projection: 14.2 h wall-clock and 5.9 GB resident;
- 6.8 M replays, 3,013 engine runs, at most 168,232 distinct configurations;
- trace cache 150,000, 8 workers.

Actual wall-clock and memory are reported in `IMPLEMENTATION_AUDIT.md`.
