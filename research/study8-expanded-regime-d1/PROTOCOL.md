# Protocol — Study 8: expanded-regime stability-first D1 reoptimization (2016–2024 train, 2025–2026 one-time evaluation)

Written 2026-11-01 (UTC) in the worktree `/home/chad/projects/margin-trading-study8`, on branch
`research/study8-expanded-regime-d1`, based on `bce526f`. The brief is `brief/ASSIGNMENT.md` (sha256 `196ada53…`).
Revised the same day, before the freeze, to resolve the independent methodology review and its verification pass
(§13).

**Written before any Study 8 optimization, qualification, test or nominee statistic existed.** What was computed
before this protocol:

1. **The timing pilot** `npm run study8 -- pilot` (`results/pilot/pilot.json`, body `e08334c50583…`). It used the door
   2016-01-04 → 2024-12-31 and produced throughput only. No net, drawdown or share was computed into the record or
   printed. Per fresh joint neighbour: G 7.4 ms, V 5.8 ms, VG 12.1 ms, VXR 18.1 ms, VXRG 25.3 ms, VXRKG 30.9 ms.
2. **A code-path smoke test** (`results/pilot/smoke.ts`, output `results/pilot/smoke-output.txt`, door-log line 2,
   same door). It ran the evidence, qualification and minute-series code on the **frozen** B1 and VG books and printed
   only four booleans and a list of period-key names. No net, drawdown, share or gate outcome was printed or stored, and
   no design choice depended on it.
3. **Tests.** The unit tests `src/study8-expanded-regime-d1/tests/study8.test.ts` (12 tests) pass; `tsc` and lint are
   clean for the namespace.
4. **A ranking benchmark on synthetic data (no market data).** The search's ranking ranked 43,520 random synthetic
   configurations in 1.4 s (30% feasible) and 11 s (all feasible), with a resident set of ≤ 0.43 GB.

**Precision budgets** reuse Study 7's sealed pilot without recomputing it: rank precision of 16/32/128-point
neighbourhoods on DEV, Spearman 0.95–0.98 at n = 16. Disclosure: that pilot covered pools of at most 24 dimensions on
a 4.5-year window; applying n = 16 to the 32-D and 40-D tracks and to 7.5-year windows is an extrapolation.

**What the analyst already knows.** Every earlier study's figures, including Study 7's 2024–2026 results and its
fold-M collapse. §3.4 states the exposure.

**Freeze.** `npm run study8 -- freeze-protocol` writes `results/protocol_freeze.json`. It records this file's sha256,
the methodology review, a snapshot of `AMENDMENTS.md`, a tarball of the code, the git state and the integrity pins of
§2.3. The command seals them as the first entry of the local hash chain. Afterwards this file is never edited;
amendments go to the append-only `AMENDMENTS.md`.

## 1. Questions, tracks, contracts

### 1.1 Questions

The core question: can GDX alone, VGT alone, or a jointly optimized 2-, 3-, 4- or 5-ETF D1 shared-slot pool, selected
only on 2016–2024, earn economically substantial net profit with acceptable minute drawdowns and broad, robust
parameter neighbourhoods, **and** retain acceptable results on 2025-01-02 → 2026-10-29?

The secondary question is whether training that includes the COVID crash, the 2022 bear market, the 2023 recovery and
2024 makes profitable neighbourhoods more durable than Study 7's shorter windows did. It is answered descriptively
by the per-fold persistence statistics of §8.5, with no threshold for "materially". The comparison is confounded: test
windows differ in length (≈ 2, 2, 2, 1 and 1.82 years) and in regime, and they overlap (F20's 2022 is F21's first test
year).

### 1.2 Hypotheses (outcomes are reported against them; none is a gate)

- **H1:** procedure folds whose test window contains a regime absent from their training persist poorly out of fold,
  as in Study 7. That is F19 (the 2020 crash, 2021) and F20/F21 (the 2022 bear market).
- **H2:** folds whose training includes both 2020 and 2022 (F23, F24) show higher holder and shortlist persistence
  rates (§8.5) than F19–F21. (Qualification counts are in-sample re-checks of the search's own constraints, so they
  are not evidence for H2.)
- **H3:** the five-book track finds no configuration passing the full 40-D joint gate, because of dimension.

### 1.3 Tracks (six full optimizations, separate budgets)

| Track | Books | Free parameters |
|---|---|---:|
| G | GDX | 8 |
| V | VGT | 8 |
| VG | VGT, GDX | 16 |
| VXR | VGT, XBI, XRT | 24 |
| VXRG | VGT, XBI, XRT, GDX | 32 |
| VXRKG | VGT, XBI, XRT, KRE, GDX | 40 |

In every pooled track all eight parameters of every book vary jointly, scored on the **actual executed shared-pool
replay**. Standalone P&L is never summed.

Seeding:
- No frozen phenotype, control, earlier candidate or Study 7 vector seeds any screen, island, refinement or
  shortlist, in any fold.
- Per-book standalone screens of the fold's own training window only propose starting points.
- A pool with a book that has no plausible standalone vector gets no combinations (only its joint LHS).

### 1.4 Immutable comparators (never modified; never seeds)

- **B1:** VGT `primary` standalone. Disclosure: its registry entry records that 2024–2025 was inspected by the VGT
  programs that chose it, so B1 is not out-of-sample on the F24 test window. This can favour B1 in the tier (§8.2),
  E3 and the bootstrap comparisons.
- **B5:** five frozen books, original one-slot policy.
- **Frozen subsets:** VG, VXR and VXRG with B5's registered books.
- **GDX:** `portfolioAware` standalone (G-PA), and the Study 5 near-misses G-NM1–3. Provenance was verified by Study 7
  P5 and is re-verified here.
- **Study 7's sealed research candidates (retrospective reference only):** ranks #1, #2, #5 (VG), #6 (VXR) and #7, #10,
  #11 (GDX). Disclosure: Study 7 selected them with data through 2023 and evaluated them on 2024–2026. On 2025–2026
  they are **not out-of-sample**, and they never enter any Study 8 selection.

### 1.5 Contracts (unchanged)

- **D1 rules:** `src/app/allIn-trailingBuy-postExitContinuation.ts`, its port in `src/shared-margin-portfolio/
  strategy.ts`, and `ShadowBook`.
- **Allocator:**
  - one funded $100,000 slot; no compounding; no simultaneous funded positions;
  - shadow books continue their virtual state when a signal is refused;
  - first executable signal wins; the same-minute tie rule; reservations; no preemption.
- **Financing and costs:** 11% simple interest on a 365-day year, on the principal; 5 bps per side.
- **Fills:** stops at the stop or the gapped open.
- **Calendar:** accounting from the close of 2016-01-04; arming 2017-06-15.
- **Parameters:** only the eight registered D1 parameters, on Study 7's grid and eight-ETF box (X 8.0–30.0%, Y 0.1–5.0%,
  stop 3.0–15.0%, hold 3–30, L 20–250, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200). No new indicator, rule, priority,
  preemption, sizing, leverage or execution trick.

## 2. Environment, Git policy and the local freeze

### 2.1 Worktree and data

- **Worktree:** `research/study8-expanded-regime-d1` at `/home/chad/projects/margin-trading-study8`. The main checkout
  (`tools/study7-local-runners`, with the user's own files) is untouched.
- **Data:** `data/{VGT,XBI,XRT,KRE,GDX}` are symbolic links to the main checkout's canonical files.
  - Nothing in the study writes to them.
  - Their full-file sha256 is pinned at the freeze and re-checked at every door (§2.3).
  - sha256 `624e4094…`, `83b71f75…`, `c625ca57…`, `fd7ab8aa…` and `134b7450…` (equal to Study 7's).
  - 2,722 sessions, 2016-01-04 → 2026-10-29. The verified last common session is **2026-10-29**.
- **Market events:**
  - The worktree carries the committed `config/market-events/distributions.csv` (`3b4342eb…`). The user's modified
    copy in the main checkout (`30feaa99…`) was read by Study 7.
  - The fixed pool books no distributions, and parity P3 requires equality with Study 7's sealed figures.
  - Splits `e5bde427…`. `data/partitions.json` is pinned and part of every door id.

### 2.2 Git

The brief forbids commit, push, merge and PR without a separate explicit user request. Nothing is committed. At the
end the user is asked.

### 2.3 The local hash chain and integrity pins (the study freeze)

`results/chain.jsonl` is an append-only list of phase entries (`records.ts`). Each entry carries:
- the sha256 of every record in the phase;
- the door log's line count and the sha256 of those lines at sealing time;
- the previous entry's hash and its own hash.

Every door opening records the chain head it saw.

**Phase order:**
1. `protocol`: `PROTOCOL.md`, `protocol_freeze.json`, `reviews/METHODOLOGY_REVIEW.md`, the code tarball
   `results/freeze/code-protocol.tar.gz` and the snapshot `results/freeze/AMENDMENTS-protocol.md`;
2. `parity`;
3. `search` (all 30 jobs);
4. `qualify` (all 30);
5. `selection`;
6. `audit`;
7. `test-F19`, `test-F20`, `test-F21`, `test-F23`, then `test-F24`;
8. `test-F24-confirm`.

Phases `code-<ID>` are interleaved as needed (below).

**Integrity pins (`integrity.ts`), fixed at the freeze:**
- the code digest of `src/study8-expanded-regime-d1/`;
- the sha256 of every shared engine file (`evaluate.ts` `engineFiles`), and of every repository source file the
  namespace imports, transitively (`integrity.ts` `importClosure`: 140 files at the freeze, including the designs,
  statistics, optimizer, loaders and Study 5–7 modules the study reuses);
- the full-file sha256 of the five data files, `data/partitions.json`, `splits.json`, `distributions.csv` and its
  manifest;
- the numeric rulebook (`context.ts` `constantsSnapshot`: execution, eligibility, test gates, schedule, dimension
  scale, stresses, folds, windows, radii, bootstrap).

**Enforcement:**
- Every door and every stage command re-verifies the chain (every file hash, every link, the door-log bindings and
  the recorded chain heads) and the integrity pins. It fails closed on any mismatch.
- A stage refuses to start until its predecessor phase is sealed.
- Training (search) doors refuse once `selection` is sealed. They also refuse if `FROZEN_SELECTION.json`, any
  `results/test/` file or any test-door line in the door log exists.
- A test door requires `selection` and `audit`, plus the earlier test folds in the documented order.
- The selection seals the numeric rulebook, and the test stage refuses unless the live values equal it.
- `seal search|qualify` refuses if any job's door opened other than exactly once (a crash, resume or rerun), unless
  `--acknowledge <ID>` names an `AMENDMENTS.md` entry disclosing it.

**Post-freeze code changes:** a code change after the freeze stops every stage until `acknowledge-code <ID>` is run
after an `AMENDMENTS.md` entry `<ID>`. That command seals a phase `code-<ID>` with the new digests, a code tarball and an
AMENDMENTS snapshot. Data or rulebook changes have no acknowledgement path: they stop the study.

**What the chain is not.** It is a local integrity mechanism. It is **not** a signature, an external notarization or a
commit-backed record. Deleting the chain and the door log together, or re-running the whole study, cannot be
prevented locally. The chain head is therefore copied into `RESEARCH_RECOVERY.md` and `AMENDMENTS.md` after each
phase.

## 3. Chronology and data doors

### 3.1 Primary experiment

| Item | Rule |
|---|---|
| Training / optimization | 2016-01-04 → **2024-12-31**; arming 2017-06-15; warm-up as Study 7 |
| One-time evaluation | **2025-01-02 → 2026-10-29**, on one continuous causal run from 2016-01-04. It opens only after the full shortlist, roles, ranks, gates and every rule are sealed |
| Carry-over | Nothing is liquidated or reset at 2024-12-31. Open lots, high-water marks, pending orders and reservations, post-exit continuation state, shadow-book state, accrued interest and drawdown peaks all carry through |
| Attribution | Test results are attributed by marked P&L at the period boundaries |
| Reporting | **2025**, **2026 YTD (to 2026-10-29, partial)** and the combined test window are reported separately. 2026 counts as a calendar year in every concentration and leave-one-year-out computation |

### 3.2 Doors (`data.ts`; every opening logged to `results/doors.jsonl`)

| Door | Loads | Precondition |
|---|---|---|
| `pilot-F24` | → 2024-12-31 | protocol not frozen |
| `parity`, `parity-cut` (→ 2024-12-31), `parity-F19` (→ 2019-12-31) | as named | protocol frozen; parity not yet sealed |
| `search-F19` / `-F20` / `-F21` / `-F23` / `-F24` | → 2019-12-31 / 2020-12-31 / 2021-12-31 / 2023-12-29 / **2024-12-31** | parity sealed and passed; selection **not** sealed and no selection or test trace (also used by qualification) |
| `test-F19` / `-F20` / `-F21` / `-F23` | → 2021-12-31 / 2022-12-30 / 2023-12-29 / 2024-12-31 | selection and audit sealed; earlier test folds sealed (order F19 → F20 → F21 → F23 → F24) |
| `test-F24` (the final door) | full history → 2026-10-29 | the same, after test-F23 |

- **Partitions.**
  - Doors ending on or before 2023-12-31 load the repository's `training` partition. The loader's access label is
    `optimization`.
  - Doors ending in 2024 or later load the `all` partition with an explicit end date. The loader's label is
    `manual evaluation`, the only one it accepts there.
  - The door log's `purpose` field states each opening's real purpose. Optimizing on 2024 is a brief-authorized
    departure from the repository rule that only `training` is optimized.
  - The door asserts that its last loaded session is ≤ its end, so no later bar exists in that process or its caches.
- **Caches.** Each search, qualification and test job has its own cache file. The header binds the door identity
  (members, partition, first/last session, data, splits, partitions and distribution hashes) and the engine hash, so
  no cache crosses folds.
- **After the F24 test only:** the research-pool runner (`pool`, `research-configs`) and the `study8-run` adapter load
  the full history. Each of them requires the sealed `test-F24` phase, and each run is logged in the door log.

### 3.3 Expanding-window procedure folds (each its own optimizer and shortlist)

| Fold | Training | Evaluation | yTest (sessions ÷ 252, ≈) | Note |
|---|---|---|---:|---|
| F19 | → 2019-12-31 | 2020–2021 | 2.004 | Study 7 F19 analogue |
| F20 | → 2020-12-31 | 2021–2022 | 1.996 | F20 analogue |
| F21 | → 2021-12-31 | 2022–2023 | 1.988 | Study 7 M analogue: essential stress test |
| F23 | → 2023-12-29 | calendar 2024 | 1.000 | new intermediate fold |
| **F24** | → 2024-12-31 | **2025-01-02 → 2026-10-29** | 1.817 | **primary** |

- **yTest:** sessions from the first test session to the test end, divided by 252. The calendar values above are
  approximate; each test record states the exact value.
- **Freezing before any evaluation:** all 30 searches and all qualifications run and are sealed first, then the
  selection is frozen and the audit recorded. Only then does any test door open, in the order above.
- **Like-for-like with Study 7:** Study 7 judged its F19/F20/M folds by its Q/E gates on the run to the test end.
  Study 8 reports the same gates for every shortlist member as a report-only table (§8.5), next to its own T gates.
- **Status:** these are retrospective procedural diagnostics, not independent repeated trials.

### 3.4 Exposure

All of 2016-01-04 → 2026-10-29 was inspected before this study:
- 2016–2023 trained every earlier study;
- 2024 → 2026-10-13 was opened by the portfolio-aware evaluation, the pools, the b4-b5 audit, and Studies 5, 6 and 7;
- 2026-10-14 → 10-29 was opened by Studies 5–7.

The 2025–2026 evaluation is therefore an **algorithmically closed door on previously inspected market history**: a
retrospective chronological test, not a holdout. The 12 post-2026-10-13 sessions are not independent observations.
The prospective B4/B5 system is never modified, run or fed. The diagnostic periods T2025Q2 (the 2025 tariff episode)
and G2026 (the 2026 GDX drawdowns) were chosen with hindsight; they are report-only.

### 3.5 No leakage loop

The 2025–2026 evaluation never changes bounds, fitness, folds, seeds, floors, thresholds, effort, order or preference.
There is no "failed test → re-optimize" loop. A test failure stays a failure. New research would need a new study,
with these years marked exposed.

## 4. Engine, accounting, metrics

- **Fast path:** per-book traces (`traceBook`) computed with the run's own costs, interest, stop fill and slippage, so
  friction and financing enter the path-dependent exits. The causal fixed-pool replay (`replayFixedPool`) funds them.
- **Authoritative:** `runNAllocator`. Parity (§9) must pass before any stage.
- **Metrics:**
  - net = realized + marked unrealized after interest and costs;
  - minute DD (the strict tracker at every bar of the held lot, every exit minute and every close) and daily DD, in
    dollars and as % of $100k;
  - **risk ceiling strictly < $35,000** (a backtest screen, not an enforceable stop);
  - lots, episodes (a new episode starts when entry is > 10 sessions after the previous exit), lot years,
    capital-days and net per occupied $100k-year;
  - refusals; period attributions inside one continuous run.
- **Stress settings:**
  - gating (Q7 on the training run; T4 on the run to the test end): 10 bps, 14% interest, next-open stop fills,
    +25 bps stop slippage;
  - diagnostic: 0 / 2 / 20 bps, 8%, +10 bps slippage, and arming on 2017-12-15 / 2018-06-15.
- **Gap risk (reported):** per configuration on the test door, the funded lots closed by a stop that gapped through
  at the open, those in the test window, and the loss beyond the stop level (shares × (stop − opening price)), read
  from each lot's virtual trade.
- **Fill caveat:** fills follow the engine's assumptions (stop at the stop or the gapped open; next-open as the
  stress). They are not claimed to equal live execution.

## 5. Neighbourhood instrument (Study 7's)

- **Decisive design:** joint N1 clip Latin hypercube over **all** coordinates of all books, using Study 7's
  `pointFromUnits`, grid, quantization and clipping.
  - Radius r: X ±1.0 pt, Y ±0.2 pt, stop ±1.0 pt, hold ±2, L ±10, buffer ±1.0 pt, P ±1.0 pt, W ±20.
  - De-duplication against the centre and earlier points.
- **Gating variants:**
  - the **in-box** pair (2 × 128), which gates Q2b and T2b for candidates with a coordinate within r of a bound;
  - **count-matched k = 8** (2 × 128), which is the basis of E3.
- **Report-only variants:** 0.5r and 1.5r (128 each); norm-matched √(8/d) (128); one book at a time (64 per book);
  count-matched k = 16 (128) for pools of three or more books.
- **Clipping mass:** for the decisive points, the number of points with a clipped coordinate, clips per coordinate and
  bound, and the mass on each bound.

**Seed families.** Every seed is `deriveSeed('study8-expanded-regime-d1', …labels)`. Labels are listed verbatim
(`label(…)` in `search.ts` appends `track, fold`). Each family has one purpose, and none is chosen by its result.

| Family | Labels | n | Use |
|---|---|---:|---|
| Screen | `('screen', track, fold)` for G and V; `('screen', symbol, track, fold)` per pooled book | 8,192 / 4,096 | Sobol screen |
| Combinations | `('combos', track, fold)` | — | random plausible-book combinations |
| Joint LHS | `('lhs', track, fold)` | — | joint coverage |
| GA | `('ga', island, track, fold)`; fillers `('fill', island, track, fold)` | — | island operators and initial fill |
| Rung 1 / 2 / 3 | `('r1' / 'r2' / 'r3', track, fold)` | 16 / 64 / 128 | promotion and the shortlist |
| Rung 3b | `('r3b', track, fold)` | 128 | trigger T2 only |
| T2 standard error | `('bootstrap', track, fold)` | — | the T2 bootstrap |
| Refine | `('refine', track, fold)` | 64 | refinement |
| Selection | `('select', rep, track, fold)`, rep 1–2 | 2 × 128 | the shortlist's training evidence (role order) |
| Confirmation | `('confirm', track, fold, rep)`, rep 1–3; variants `('confirm-inbox' / -half / -wide / -d8 / -d16 / -norm, track, fold, rep)`; per book `('confirm-book', track, fold, symbol)` | 3 × 128 + variants | in-sample qualification (the controls use the same labels) |
| Test | `('test', 'sets', fold, rep)` and `('test-<variant>', 'sets', fold, rep)`, `('test-book', 'sets', fold, symbol)` | 3 × 128 + variants | the test doors: the same offsets for every configuration of the same dimension in a fold |
| Test bootstrap | `('test', fold, 'bootstrap', <holder>-<control>, <period>)` | 5,000 | paired bootstraps |
| Count-matched subsets | the family's labels + `'subset'` | — | which coordinates move |
| Parity / pilot | `('parity', …)`, `('pilot', …)` | — | engineering only |

**Common random numbers:** the islands share the rung-1 offsets. They are independent only in their GA randomness
(`ga`, `fill`).

**Reported** for every evaluated configuration:
- centre net; neighbourhood median, p10 and p90 net; p90 DD;
- share below $35k, with per-family figures, the pooled figure, unique n and the one-sided Wilson lower bound;
- profitable share, centre/median gap, lots and episodes per neighbour;
- clipping mass;
- period medians: training, test, every calendar year, 2025, 2026 YTD, the diagnostic periods.

A parameter-neighbourhood pass rate is not a probability of future safety.

## 6. Fitness and eligibility (Study 7's rulebook, literally)

**Constrained Pareto objectives:** maximize centre net/yr, neighbourhood median/yr and neighbourhood p10/yr; minimize
neighbourhood p90 minute DD.

**Constraints**, combined into a normalized violation; a non-finite violation is infeasible:

| ID | Constraint |
|---|---|
| C1 | centre DD < $35k |
| C2 | share ≥ 0.90 and p90 < $35k |
| C3 | lots ≥ ⌈1.5·y⌉, episodes ≥ ⌈0.5·y⌉, lot years ≥ min(3, years spanned − 1) |
| C4 | every pooled book ≥ ⌈0.4·y⌉ lots |
| C5 | median ≥ $10,000/yr and p10 > 0 |
| C6 | ≥ $11,000 per occupied $100k-year |
| C7 | top lot ≤ 25%, best year ≤ 75%, ex-best-year economy ≥ $5,000/yr |

y is the window's years: sessions from arming ÷ 252. The count floors are Study 7's per-year rule, applied literally to
each window. A year the run ends inside (2026 on the final door) counts in the best-year computation.

**Threshold sensitivity (report-only, Study 7 §7.4).** For each track-fold, recomputed from the sealed rung-3 records:
- the feasible-set size, and which shortlist picks would change, under activity floors × 0.5 / 1 / 1.5 and best-year
  caps 0.65 / 0.75 / 0.85 / none;
- the rank correlation of lots with share among rung-3 candidates.

## 7. Search schedule and compute

### 7.1 Pipeline per track × fold (Study 7 §8.2, with dimension scaling)

The joint-proposal budgets scale with **s(d) = max(1, d / 16)**, where d = 8 × books: G, V and VG 1; VXR 1.5; VXRG 2;
VXRKG 2.5. G, V and VG keep Study 7's budgets exactly. Everything else is equal across tracks.

| Step | G, V | VG | VXR | VXRG | VXRKG |
|---|---:|---:|---:|---:|---:|
| Screen (Sobol vectors per book; G/V: of the one book) | 8,192 | 4,096 | 4,096 | 4,096 | 4,096 |
| Combinations of plausible books | — | 4,096 | 6,144 | 8,192 | 10,240 |
| Joint LHS | — | 1,024 | 1,536 | 2,048 | 2,560 |
| Rung-1 cap (½ by rank, ½ by max-min diversity) | 1,024 | 1,024 | 1,536 | 2,048 | 2,560 |
| GA population | 64 | 64 | 96 | 128 | 160 |
| GA new configurations per island | 2,048 | 2,048 | 3,072 | 4,096 | 5,120 |

1. **Screen:**
   - A screened vector is plausible if its standalone DD < $35k, net > 0 and it has ≥ 2 lots.
   - A screened centre is promoted if its DD < $35k, net > 0, lots ≥ ⌈floor/2⌉ and every book has ≥ 1 lot.
2. **Rung 1** (16 points) on the promoted centres.
3. **NSGA-II:** 4 independent islands × the population above × ≤ 40 generations × the new-configuration cap.
   Constrained domination, SBX η 15 (p 0.9), PM η 20, stagnation stop at 10 generations / 1e-3.
4. **Rung 2:** top 192 by constrained rank, distinct L∞ 0.02, n = 64.
5. **Rung 3:** top 48, distinct 0.03, n = 128.
6. **Refinement:**
   - **Starts:** 6, distinct 0.05.
   - **Passes:** ≤ 2. Each pass evaluates every single-coordinate probe move of every book on a 64-point
     neighbourhood and takes the best one.
   - **Probe set:** the repository's, which is ±5/±10 grid units for X, stop, L, buffer and P; ±1/±2 for Y and hold;
     ±10/±20 for W. That is 32 moves per book per pass (160 for VXRKG).
   - **Acceptance from a feasible start:** the move stays feasible, does not lower the median or p10 or raise the p90,
     and raises robust profit by ≥ $1,000/yr.
   - **From an infeasible start:** the move lowers the violation by ≥ 0.01.
7. **Shortlist:**
   - ≤ 6 candidates at L∞ ≥ 0.10.
   - Behavioural de-duplication first: one candidate per identical funded-ledger signature.
   - Picks in order:
     1. profit (robust profit/yr);
     2. robust (share, among candidates with median ≥ 50% of the profit pick's);
     3. balanced (robust profit/yr ÷ p90);
     4. centre (centre net/yr);
     5. then the Pareto order;
     6. then infeasible-on-training fill.
8. **Selection evidence:** 2 × 128.

**Ranking implementation.** The constrained-domination ranking used for promotion, rung picks and the shortlist
(`search.ts` `rankOrder`) gives exactly the order of the optimizer's `selectSurvivors` over the whole set (a unit test
asserts it). Infeasible configurations form one front per violation value, and feasible fronts are peeled from a
domination bit matrix, so 40-D archives fit in memory.

**Compute estimate** (timing pilot plus scaling): ≈ 40 CPU-hours for the 30 searches without T1 extensions, and up to
about 1.7× that if T1 doubles the islands of the pooled tracks. The critical path is VXRKG-F24: about 5–9 h of wall
time under contention, or up to about 15 h with 8 islands. Searches run as 12 parallel jobs (8 physical cores, 59 GB of
memory), longest first. Qualification takes ≈ 1–2 h of wall time, and the five test stages run sequentially, about
3–5 h.

### 7.2 Triggers, stop rules and multiplicity (training-only, Study 7 §8.4)

- **T1 (island saturation):** if the last island raised the union feasible hypervolume by ≥ 10% (or, with nothing
  feasible, lowered the minimum violation by ≥ 25%), run 2 more islands, up to 8.
- **T2 (Monte Carlo uncertainty):** if the top two rung-3-feasible candidates differ by less than the larger
  bootstrap SE, re-score the top 8 with 128 more points.
- **T3 (coverage):** if fewer than 2 rung-2-feasible regions exist while rung 1 has ≥ 3, promote up to 16 regional
  representatives.
- **Stop:** when the schedule and any triggered extensions end.
- **Reported:** search totals, hypervolume increments, saturation, and whether extensions changed the shortlist.
- **Fresh seeds are not fresh market histories.** All multiplicity is counted.
- **CSCV/PBO** for each track-fold:
  - **Configurations:** the rung-2 set's 64 best (rung-2-feasible first, then rung-2 robust profit/yr, then ID).
  - **Performance matrix:** each centre's half-year attributions from 2018H1 to the training end. The earliest block
    is dropped when the count is odd.
  - **Resolution:** F19 has only 4 blocks (6 splits), so its PBO is coarse.

### 7.3 Operations (no-progress watchdog and crash policy)

- **Orchestrator:** `scripts/run_jobs.sh` runs each job in its own process group.
  - **Watchdog:** a job whose log and point cache have both been idle for 45 minutes is stopped. Its log ends `exit
    timeout`. While new points are computed, the cache is flushed every 30 s.
  - **Resume:** a stopped or crashed search or qualification job is resumed by rerunning the script. It continues
    from its persistent cache and gives identical output. The repeated door opening is disclosed in `AMENDMENTS.md`
    and acknowledged at `seal`.
- **Test stages:**
  - **Cache:** they always use a fresh in-memory point cache, so a rerun or `--confirm` never reloads cached records.
  - **Logging:** they log one progress line per configuration with no status. Statuses are printed only after the
    record is sealed.
  - **Crash:** a crashed test stage writes nothing (its record is written only at the end). It is rerun **once**,
    deterministically, with the same configuration and seeds; the rerun is labelled and disclosed. A second crash
    stops the study for diagnosis.
- **Cache reload:** a reloaded point record's only possibly non-finite field (`top1Share`) is restored to NaN, so a
  resumed job reproduces a fresh one exactly.

## 8. Qualification, selection, audit, test

### 8.1 In-sample qualification

Each fold's shortlist and the controls are evaluated on the fold's own training door, with the confirmation families,
**after all searches are sealed**.

| Gate | Requirement |
|---|---|
| Q1 | centre DD < $35k |
| Q2 | pooled share (3 × 128, ≈ 384 unique) ≥ 0.90 and p90 < $35k |
| Q2b | in-box (2 × 128) likewise when a coordinate is within r of a bound |
| Q4 | net > 0, best year ≤ 75% and ex-best-year economy ≥ $5k/yr |
| Q5 | activity floors (C3, C4) |
| Q6 | top lot ≤ 25% |
| Q7 | the gating stresses: net > 0 and DD < $35k |
| Q8 | confirmation median training net ≥ 60% of the centre's |
| E1 | median ≥ $10k/yr and p10 > 0 |
| E2 | ≥ $11k per capital-year |
| E3 | (pools) not dominated by B1 on (median/yr, p90 DD) under count-matched k = 8; non-finite values fail |

- Study 7's Q3 (a validation-window test) is replaced by the test gates of §8.4.
- A candidate infeasible on training cannot qualify.
- **Marginal:** Q2 passes with a pooled share ≤ 0.93, or at least one family fails on its own.
- The record keeps each candidate's training funded ledger (lot keys) for §8.2.

### 8.2 Selection (training-only)

**Robust profit** = ½ · neighbourhood median net + ½ · neighbourhood p10 net (Study 7's definition).

**Roles per track × fold.** Each role's order comes from the **selection** families (2 × 128, training door). The role
goes to the first **qualified** candidate in that order that is at L∞ ≥ 0.10 from the role holders already taken.
1. **Profit:** robust profit/yr (ties: lower p90 DD, then ID).
2. **Robust:** share (ties: lower p90 DD, then ID), among candidates whose selection median is ≥ 50% of the profit
   holder's. If no profit holder exists, the reference is the top of the profit order.
3. **Balanced:** robust profit/yr ÷ p90 DD (ties: lower p90 DD, then ID).
4. **Extra:** up to **2** further qualified candidates, in the shortlist's own order (the prespecified cap). Each
   must be at L∞ ≥ 0.10 **and** behaviourally distinct: its training funded-ledger Jaccard must be < 0.5 against
   every holder already taken.

A role nobody qualifies for is recorded as empty.

**Ranking per fold** (over the role holders of all six tracks):
- Tier "strong" if the holder's confirmation (training-door) robust profit/yr is ≥ B1's under the same track's
  confirmation labels; otherwise "modest". The labels differ by track, so B1's reference differs slightly by track.
- Within a tier: robust profit/yr, ties lower p90, then ID.
- The ranking uses the confirmation families, which also gave the Q veto (a winner's-curse bias). The selection-family
  figures are reported beside it.
- **The F24 ranking is the study's training-only global ranking.**

All of this is sealed in `FROZEN_SELECTION.json` (chain phase `selection`), together with:
- the code and engine digests;
- the numeric rulebook;
- the T-gate text;
- the test plan (every shortlist member with its track order, pick, qualification flag and training figures).

### 8.3 Pre-test audit

A read-only independent audit (a fresh agent) checks:
- selection integrity and seed-family independence;
- multiplicity and leakage constraints;
- accounting parity and the exact controls;
- the chain and the integrity pins.

Its report is sealed by `record-audit` (chain phase `audit`) before any test door opens.

### 8.4 Test gates (block-only; on the run from 2016-01-04 to the fold's test end; 5 bps; 11%)

y is the run's years (sessions from arming ÷ 252); yTest is defined in §3.3.

| Gate | Requirement |
|---|---|
| T1 | centre minute DD over the whole run < $35,000 |
| T2 | test families 1–3 pooled share ≥ 0.90 and pooled p90 < $35,000 |
| T2b | in-box test pair likewise for near-bound candidates |
| T3 | test-window centre net ≥ $10,000 × yTest; pooled test-set median test-window net > 0 **and** ≥ $5,000 × yTest |
| T4 | under 10 bps, 14%, next-open and +25 bps slippage: test-window centre net > 0 and run DD < $35,000 |
| T5 | on the whole run: best calendar year (2026 counted) ≤ 75% of net; ex-best-year economy ≥ $5,000/yr (net − best year, ÷ max(1, y − 1)); largest lot ≤ 25% of net |
| T6 | activity, both parts. (a) On the whole run, Q5's floors with y = the run's years: lots ≥ ⌈1.5·y⌉, episodes ≥ ⌈0.5·y⌉, lot years ≥ 3, every pooled book ≥ ⌈0.4·y⌉ lots. (b) In the test window: new funded lots (lots entered in the test window) ≥ ⌈1.5·yTest⌉, and new episodes ≥ ⌈0.5·yTest⌉, with yTest rounded to 0.01 (3 lots and 1 episode on F19–F21 and F24; 2 and 1 on F23). New episodes are the episodes among the lots entered in the test window; the first of them always opens one |
| T7 | on the whole run: net per occupied $100k-year ≥ $11,000 |

**Status per configuration:**
- **fail** if any T gate fails;
- **ambiguous** if it passes but the pooled share is ≤ 0.93, at least one test family fails T2 on its own, or the centre
  DD is ≥ $33,000;
- **pass** otherwise.

**Rules:** test outcomes may only veto. They never reorder, replace or rescue.

**Nomination (F24 only):**
- An F24 role holder with status pass, or ambiguous (labelled so), is a **research nomination: retrospectively
  chronologically persistent, research-only**. It is never called independently validated.
- The nominations are the sealed F24 ranking restricted to non-failed role holders, possibly empty. The **primary
  nominee** is the top-ranked one. "No qualifying candidate" is a valid outcome.
- **Multiplicity:** the report states how many F24 holders were tested and how many survived. Each survivor passed a
  sequential veto among up to 30 holders, so a few survivors are expected even by chance on a closed, inspected window.
- **Outcome classes (Study 7):**
  1. *qualified*: ≥ 1 nomination;
  2. *stable-but-weaker only*: an F24 role holder passes T1, T2 and T2b but fails another T gate;
  3. *none*: otherwise.
- Procedure folds report persistence only. They never nominate.

### 8.5 Test-stage reporting (every fold; extra detail on F24)

**Who is evaluated:**
- **Every shortlist member of every track:** T1–T7, plus the report-only items below.
  - **Role holders** get the full evidence: every neighbourhood variant, the minute series, and the drawdown
    decomposition.
  - **Other members** get the lite evidence that T1–T7 and the Study 7-equivalent gates need: the decisive sets, the
    in-box pair, count-matched k = 8, the stresses and the sensitivities.
- **Controls:** B1, B5, frozen VG/VXR/VXRG and G-PA; on F24 also G-NM1–3 and the Study 7 references. They get the full
  evidence.

**Reported per configuration:**
- **Whole-run and test-window figures:**
  - net (realized/unrealized);
  - training-window and test-window minute DD (role holders and F24 controls);
  - new funded lots, episodes and lot years in the test window;
  - 2025 and 2026 YTD separately;
  - neighbourhood median/p10 of the test window.
- **Sensitivities:** 0/2/10/20 bps, 8/14%, next-open, +10/+25 bps, arming shifts.
- **Gap risk** (§4).
- **History checks:** leave-one-year-out (2026 included), concentration.
- **Drawdowns (role holders):** the worst-drawdown lot decomposition, the five largest drawdown episodes, per-lot MAE.
  The minute series must reproduce the tracker and the replay's lots, or the stage fails.
- **Comparisons:** a paired stationary block bootstrap (block 21, 5,000 resamples) of every role holder against B1,
  B5, and the frozen subset of its books (G-PA for GDX holders), on the whole run and the test window.
- **Funded-sequence diagnostics (pools, full evidence):** on the first test family:
  - the share of the centre's funded lots each neighbour keeps, ledger Jaccard, displaced and added lots, and the
    own-P&L versus funding interaction;
  - the flag `sequenceDependent`: median Jaccard < 0.5 and the low-Jaccard neighbours' median net < half the centre's.
- **Study 7-equivalent out-of-fold gates (report-only):** Study 7's Q1, Q2, Q2b, Q3 (test-window centre and test median
  > 0), Q4–Q8, E1, E2 and E3 on the run to the test end, with the run's floors.

**Fold-level statistics (descriptive; the answer to the secondary question):**
- **Holder persistence:** non-failed role holders ÷ role holders.
- **Shortlist persistence:** non-failed members ÷ members, also separately for training-qualified and non-qualified
  members.
- **Study 7-equivalent pass rate:** members passing every Study 7-equivalent gate ÷ members.
- **Positive test window:** the share of members with a positive test-window centre net, qualified versus not.
- **Insufficient evidence:** a fold with no role holder, or whose role holders took fewer than 3 new funded test-window
  lots in total, is labelled so (Study 7 §10.1).
- **Return-rank diagnostic:** over the fold's shortlist members, the Spearman correlation of:
  - selection-family robust profit/yr with test-window centre net, and with the test-family median;
  - confirmation robust profit/yr with test-window centre net;
  - within each track, shortlist order with test-window centre net.

  Each is reported with its n, and only where n ≥ 3.

Then F24 runs `--confirm`, a deterministic repeat in a fresh memory cache. It stores `identical` and fails if any
holder, member, control or fold statistic differs. It may only detect computational mistakes.

### 8.6 Comparison with Study 7 (non-decisional)

All F24 candidates are compared descriptively with Study 7's #1, #2, #5, #6, #7, #10 and #11 on the same sets. The
report separates what the added regime coverage explains from what is a selected historical peak. It also names the
2020 crash, the 2022 gold-miner re-entry path, the 2025 tariff episode and the 2026 GDX drawdowns as measured events,
without retargeting any fitness to them.

## 9. Engineering gates (stage `parity`; any failure stops the study)

| Gate | Requirement |
|---|---|
| P1 | Replay = full N-book engine (lots, signals, virtual trades, daily rows, both DDs, net), 0 differences. Configurations: B1, VG, VXR, VXRG, B5, G-PA and G-NM1 at 0/5/10 bps on W23 (a training-partition door), W24 and W29; 6 random joint perturbations each of VG, VXR, VXRG and **the five-book pool** on all three horizons; VG, VXR and B5 at 8%, 14%, next-open and +25 bps on W29 |
| P2 | this evaluator = the Study 5 evaluator on the P1 runs |
| P3 | `npm run pools -- fixed B5 --end 2026-10-13` equals the anchors **read from `config/pools/B5.json`**, and the evaluator equals the CLI. Study 7's `final.json` must hold exactly the 15 controls (B1, VG, VXR, VXRG, B5, G-PA, G-TS, G-SR, G-NM1–3, G-T1P, G-T1S, G-T2C, G-T2P) and ranks 1–12. All 27 are reproduced on W29 to the cent (net, minute/daily DD, lots), and all 27 of its W13 rows (to 2026-10-13: net, minute DD, lots, B1 included) on W13, **read from `research/study7-stability-first-d1/results/final/final.json`** |
| P4 | data hashes; the 2026-10-13 prefixes equal the B5 pins; 2,722 sessions |
| P5 | GDX control provenance (IDs; G-PA, G-TS, G-SR and G-NM1–3 re-run against Study 5's sealed figures; G-T1P/T1S/T2C/T2P labelled **grid-only**) and the frozen grids equal the registry |
| N1 | no-lookahead at **two cuts** (2024-12-31 via `parity-cut`, 2019-12-31 via `parity-F19`). Truncated traces and pools, including the five-book pool, reproduce the full run's closed trades, decisions, funded lots and daily marks before the cut; pools also under next-open stops and +25 bps slippage |
| C1 | cache invalidation (trace keys, refused headers, 200 recomputations) |
| D1 | deterministic restart (twice fresh; once stopped after 3,000 points and resumed; identical) |
| T0 | the test-stage pipeline (`testStageOn`, the code of every test door) runs twice on a parity door with **frozen** configurations only: holders frozen VG and G-NM1, members those two plus B5 as a lite member, controls B1, B5, VG and G-PA. It uses fold F23's geometry (training to 2023-12-29, test 2024) and the primary-fold branches. The two runs must be identical in their sealed form, every holder must carry the minute series, gap risk, bootstraps against three comparators and the return-rank statistic. Only booleans and counts are kept |
| G1 | during parity, `search-F24`, `search-F19`, `test-F19`, `test-F24` and `pilot-F24` refuse |

**Tests:**
- `src/study8-expanded-regime-d1/tests/study8.test.ts`;
- `tsc --noEmit`;
- lint;
- the inherited suite in data-less worktrees (base against head), with inherited failures listed separately.

**Final audit (after the tests, before the reports are final):** an independent read-only agent re-derives the most
important numerical and chronological claims of the reports from the sealed records and checks the chain.

## 10. Deliverables and runner

**Reports:**
- `README.md`, `PROTOCOL.md`, `AMENDMENTS.md`;
- `BASELINES_AND_PARITY.md`, `SEARCH_AND_COMPUTE.md`, `NEIGHBORHOOD_ROBUSTNESS.md`, `CHRONOLOGICAL_VALIDATION.md`,
  `RISK_AND_TRADE_SEQUENCING.md`, `EXECUTION_AND_INTEGRITY.md`, `RECOMMENDATION.md`;
- `RUN_COMMANDS.md`, `RESEARCH_RECOVERY.md`;
- machine-readable sealed records and generated tables.

**Configurations:** research-only, labelled **NOT DEPLOYED**, in `config/research-pools/study8-expanded-regime-d1/`
and `config/research-phenotypes/study8-expanded-regime-d1/D1/`, for every F24 shortlist member.

**Runner (`npm run study8-run`):**
- A Study 8 adapter that reuses the Study 7 runner's tested functions (`src/study7-runners/`) and the unchanged pools
  engine, without modifying them or the Study 7 alias map.
- Commands: list, run, compare. Options: `--end`, `--cost-bps`, `--out`. Output is the full per-trade ledger.
- Reconciliation against the sealed Study 8 F24 test record applies only at 2026-10-29 / 5 bps; otherwise it reports
  "not applicable".
- A compare covers the best F24 candidate of every track (a role holder where one exists, otherwise the track's first
  shortlist member, labelled not qualified) against B1 and B5.

## 11. Differences from Study 7

| Item | Study 7 | Study 8 |
|---|---|---|
| Primary training window | 2017–2021 (M) and 2017–2023 (L, in-sample path) | 2017–**2024** |
| Primary test | 2022–2023 (M); exposed 2024–2026 block-only (L) | **2025-01-02 → 2026-10-29**, once, block-only |
| Tracks | G, VG, VXR, VXRG (secondary), V diagnostic | **G, V, VG, VXR, VXRG, VXRKG**, all full |
| Budgets | per Study 7 schedule | Study 7's for G, V, VG; joint-proposal budgets × s(d) for VXR (1.5), VXRG (2), VXRKG (2.5) |
| Qualification | on the run to the test end (M) | **in-sample on the training window** for every fold; T1–T7 veto only; Study 7's out-of-fold gates reported |
| Folds | F19, F20, M, L | F19, F20, F21, **F23 (new)**, F24 |
| Extra role holders | none | ≤ 2 qualified "extra" per track-fold, parameter- and ledger-distinct |
| Freeze | sealed records plus commits | **local SHA-256 hash chain plus integrity pins** (no commits authorized) |

## 12. Amendments and disclosures

After the freeze this file is never edited. Amendments and disclosures go to `AMENDMENTS.md`, append-only, each entry
with time, reason, exposure and the hash of the log before it.

## 13. Independent methodology review (before the freeze) and its resolution

A fresh read-only agent reviewed the draft (sha256 `3c4ded12…`) and the code. Its report is
`reviews/METHODOLOGY_REVIEW.md`, verbatim, sealed in the `protocol` phase. It found no critical issue. Every finding
was resolved before the freeze. The same agent then verified the resolutions against the revised protocol (sha256
`55c29468…`) and code (`reviews/METHODOLOGY_REVIEW_VERIFICATION.md`, also sealed). It confirmed M2–M6, found one gap
in M1 and two new major issues; those are resolved in the second table.

| Finding | Resolution |
|---|---|
| M1 code and thresholds not pinned | integrity pins, code tarball, fail-closed checks at every door and stage, `acknowledge-code`, rulebook sealed with the selection and checked by the test stage (§2.3) |
| M2 data not pinned | full-file data, partitions, splits and distribution hashes pinned and checked at every door; partitions in the door id; "read-only" reworded (§2.1, §2.3) |
| M3 no test activity gate | T6 (whole-run Q5 floors plus test-window lots and episodes) and T7 (capital efficiency) (§8.4) |
| M4 central question has no statistic | every shortlist member gated on every test door; holder, shortlist and Study 7-equivalent persistence rates; insufficient-evidence rule; comparison declared descriptive, confounds stated (§1.1, §3.3, §8.5) |
| M5 budgets not dimension-normalized | s(d) = max(1, d/16) on the joint-proposal budgets (§7.1); unit test updated |
| M6 in-box called non-decisive | in-box gates Q2b/T2b, k = 8 gates E3; the rest report-only (§5) |
| m1 seed table | listed verbatim (§5) |
| m2 ambiguous wording | "at least one family"; ambiguous holders nominated with a label (§8.1, §8.4) |
| m3 yTest undefined | defined, with values per fold (§3.3) |
| m4 refinement and shortlist rules | described exactly (§7.1) |
| m5 PBO definition | defined; code comment corrected (§7.2) |
| m6 return-rank diagnostic | defined and computed in the test record (§8.5) |
| m7 clipping mass | computed for every evidence record (§5) |
| m8 disclosures | B1 exposure (§1.4), common rung-1 offsets (§5), precision extrapolation (header), hindsight periods (§3.4) |
| m9 test multiplicity | count reported; primary nominee defined (§8.4) |
| m10 extras only parametric | ledger Jaccard < 0.5 added (§8.2) |
| m11 chain gaps | door log bound into every entry, chain heads in door openings, test-trace check on training doors, `seal` counts door openings, chain head copied after each phase (§2.3) |
| m12 parity relies on chain | `parity.json` `passed` also required |
| m13 NaN | E3 requires finite values; non-finite violation is infeasible (§6, §8.1) |
| m14 parity gaps | exact sets, W13 rows (B1 included), W23 horizon, N1 under the stress fills, grid-only label (§9) |
| m15 unenforced checks | tracker match and lot order asserted (§8.5) |
| m16 `--confirm` only logged | `identical` stored; the run fails otherwise (§8.5) |
| m17 smoke test | script and output preserved (header) |
| m18 pool runner bypasses doors | gated on `test-F24`, logged (§3.2) |
| m19 watchdog and crash policy | §7.3 |
| m20 unit tests | door-gate order, integrity pins, Q and T gates (strict ceiling, NaN, partial 2026), role assignment, door-log tampering (11 tests) |
| m21 resolution in a mutable file | this section; the review file is sealed with the protocol |
| m22 Study 7 rules dropped | outcome classes (§8.4) and threshold sensitivity (§6) adopted |
| m23 H1 wording | reworded (§1.2) |
| m24 no GDX comparator | G-PA added for GDX holders (§8.5) |
| m25 gap risk | reported (§4) |
| n1 loader labels | real purpose in the door log; labels explained (§3.2) |
| n2 unused frozen-VGT fallback | removed (§1.3) |
| n3–n5 | noted; n4: selection-family figures reported beside the ranking; n5: disclosed (§8.2) |

**Verification-pass findings and their resolution:**

| Finding | Resolution |
|---|---|
| M1 gap: shared imported modules not pinned | the transitive import closure of the namespace (140 files) is pinned with the engine files (§2.3) |
| N1 rung-2 ranking memory at 32-D/40-D | lean ranking with the identical order (unit test against `selectSurvivors`; benchmark ≤ 0.43 GB at 43.5k); 12 parallel jobs; wall-time estimate covers T1 doubling (§7.1) |
| N2 test-stage code unexercised; statuses printed before the seal | parity gate T0 runs the full test pipeline twice on frozen configurations; per-configuration progress lines without status; statuses printed only after the seal (§7.3, §9) |
| null versus NaN after a cache reload | test stages always use a fresh memory cache; reloaded `top1Share` restored to NaN (§7.3) |
| silent `--confirm` | one progress line per configuration (§7.3) |
| `setsid` without `-w` | kept: the backgrounded subshell is never a process-group leader, so `setsid` execs in place and the job's PID leads its group, which the watchdog signals |
| T6(b) episodes | defined (§8.4) |
| cross-reference | Study 7 §10.1 (§8.5) |
| `study8-run` gating | requires `test-F24` and logs each run (§3.2) |
| data refresh in the main checkout | stops the study by design (§2.3); the user is told not to refresh data until Study 8 ends |
