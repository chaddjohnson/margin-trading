# Protocol — Study 9 Phase B: seven-pool from-scratch joint D1 optimization and stability audit

Written 2026-11-02 (UTC) in the main checkout `/home/chad/projects/margin-trading`, on branch
`research/study9-phase-b-seven-pool` (created from `research/study9-etf-pool-discovery` at `2beb1bd`). The brief is
`brief/ASSIGNMENT.md` (sha256 `3158751595d1fc35…`), the user's attached assignment of 2026-11-02, verbatim. Where this
protocol and the brief differ, the brief governs. **Study 8's sealed `PROTOCOL.md` and the rulebook sealed in its
`FROZEN_SELECTION.json` are the numerical authority**; this protocol restates them only for orientation, and §14 lists
every deliberate difference.

**Written before any Phase B optimization, qualification, test or candidate statistic existed.** What was computed
before this protocol:

1. **Inventory** (read-only): Phase A's chain verified (`npm run study9 -- verify-chain`, head `a1e912a2b5fd2556`, 76
   door openings ≤ 2024-12-31); the 13 canonical files this study uses hash equal to Phase A's sealed post-refresh
   inventory and their projection copies to Phase A's projection manifest; every canonical file ends on 2026-10-30.
   Study 8's own `verify-chain` stops at its full-file data pin because Phase A appended 2026-10-30 (pre-existing,
   disclosed by Phase A; Study 8's pinned-length prefixes are checked in gate E1).
2. **Unit tests** `src/study9-phase-b/tests/study9b.test.ts` (synthetic inputs, no market data).
3. **A code-path smoke test** (toy budgets, two tracks, fold F23 geometry, training projection only), into the
   session's scratch folder outside the study, deleted unread; only exit codes and error counts were read
   (`AMENDMENTS.md` A0 records exactly what was printed). The script and its printed output are kept in
   `results/pilot/` (`smoke.sh`, `smoke-run1-output.txt`, `smoke-run2-output.txt`). The two smoke runs used the
   production seed labels at toy budgets on training data (disclosed; outputs never read); smoke mode is refused after
   the freeze.
4. **The timing pilot** (`results/pilot/pilot.json`): timings only (§7.4).

**What the analyst already knows (exposure, §15).** Every earlier study's figures, including Study 8's sealed
2025-01-02 → 2026-10-29 outcomes (VG #1/#2, B1, B5, the GDX 2026 drawdowns) and Phase A's training-only generic-vector
screen of these seven pools.

## 1. Question, tracks, contracts

### 1.1 Question

Can a new, jointly reoptimized D1 shared-margin ETF pool, from the seven approved memberships and selected only on
training data, materially exceed the profitability of Study 8's VG #2 balanced (the user's current favourite) while
keeping a broad, economically profitable parameter neighbourhood, acceptable minute drawdowns, satisfactory
chronological behaviour and credible fills? **No new nominee is a valid outcome.**

### 1.2 The seven approved memberships (the entire search universe; frozen)

| Track | Books (engine order) | d | s(d) | Origin |
|---|---|---:|---:|---|
| `G4-ILF` | KRE, GDX, ILF, MTUM | 32 | 2 | Phase A nomination (G4 profit-1; batches A and B) |
| `G4-EWW` | KRE, EWW, GDX, MTUM | 32 | 2 | Phase A option-D G-family reserve (queue #1; MTUM failed the Phase A ≥ $1k/yr marginal-book gate) |
| `N3-EDV` | EDV, IWM, XLF | 24 | 1.5 | Phase A nomination (N3 profit-1; batch A) |
| `N2-SMH` | SMH, XHB | 16 | 1 | Phase A nomination (N2 profit-1; batch A) |
| `V3-IWM` | VGT, IWM, XLF | 24 | 1.5 | Phase A nomination (V3 profit-1; batch B) |
| `N2-EDV` | EDV, XHB | 16 | 1 | Phase A nomination (N2 profit-2; batch B) |
| `VG3-IWM` | VGT, GDX, IWM | 24 | 1.5 | **user-approved exploratory VG-family test; not a Phase A nominee** (a prespecified deviation from Phase A's recommended batch; infeasible on Phase A's generic vectors) |

The Phase A figures (generic robust profit $9.3–27.2k/yr, shares 89–98%) are training-only generic-vector screening
measurements, not expected optimized returns. No eighth set is added; no membership is changed after any result.

### 1.3 From scratch

For every track and every fold, **all** 8 × books parameters are optimized jointly on the actual executed shared-slot
replay. No Study 5–8 incumbent, no Phase A generic vector and no previously optimized phenotype seeds any screen,
island, refinement or shortlist. Per-book Sobol screens of the fold's own training window propose the starting points
(Study 8's algorithm), with every random stream newly derived in the `study9-phase-b` namespace (§5.2).

### 1.4 Contracts (unchanged; Study 8 §1.5)

- **D1 rules:** `src/app/allIn-trailingBuy-postExitContinuation.ts`, its port `src/shared-margin-portfolio/strategy.ts`,
  the frozen `ShadowBook`; per-book traces by `src/portfolio-aware-d1/trace.ts` `traceBook`.
- **Allocator:** one funded $100,000 slot; no compounding; no simultaneous funded lots; shadow books continue their
  virtual state when a signal is refused; first executable signal wins; same-minute decisions in alphabetical order;
  reservations; no preemption, priority or sizing. Fast path `replayFixedPool`, proven equal to the authoritative
  `runNAllocator` (gates P1, TP1).
- **Financing and costs:** 11% simple interest on a 365-day year on the principal; 5 bps per side; stops at the stop or
  the gapped open; accounting from the close of 2016-01-04; arming 2017-06-15.
- **Parameters:** the eight registered D1 parameters on Study 7/8's grid and eight-ETF box (X 8.0–30.0%, Y 0.1–5.0%,
  stop 3.0–15.0%, hold 3–30, L 20–250, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200).
- **Distributions:** the fixed one-slot engine books none; the door loads no distribution ledger, so the user's
  modified `config/market-events/distributions.csv` enters no computation.

## 2. Environment, Git, freeze

- Main checkout only; no other worktree. The user's uncommitted files (`config/market-events/*`, `._.DS_Store`) are
  never edited, staged or committed.
- **No commit, push, merge or PR** without the user's separate explicit request.
- Stages run through `research/study9-phase-b/scripts/s9b.sh` (Node v24.21.0). The `study9b` / `study9b-run` npm
  scripts are added to `package.json` only after the study, because Phase A's integrity pins include `package.json`
  (the addition is disclosed in `AMENDMENTS.md` when made).
- **Order (a disclosed deviation from the brief's listing):** as in Study 8, the engineering parity stage runs after the
  freeze, as the first sealed phase after `protocol`, so that its gates are chained and cannot be rerun silently; the
  methodology review, the pilot and the smoke tests precede the freeze.
- **Freeze:** `s9b.sh freeze-protocol` writes `results/protocol_freeze.json` (this file's, the brief's, the reviews',
  the pilot's and an `AMENDMENTS.md` snapshot's hashes, a code tarball, the git state, the integrity pins) and seals
  chain phase `protocol`. Afterwards this file is never edited; amendments go to the append-only `AMENDMENTS.md`.

### 2.3 Hash chain and integrity pins (Study 8 §2.3, unchanged in mechanism)

- `results/chain.jsonl`: append-only phase entries, each with the sha256 of every record of the phase, the door log's
  line count and hash at sealing, and the previous entry's hash. Every door opening records the chain head it saw.
- **Phase order:** `protocol` → `parity` → `search` (all 35) → `qualify` (all 35) → `selection` → `audit` →
  `test-F19` → `test-F20` → `test-F21` → `test-F23` → `test-F24` → `test-F24-confirm` → (report-only)
  `slice-2026-10-30` → `diagnostics` → `preference` → `report-*`; each post-test stage also requires the sealed F24
  confirmation to be identical. `seal search|qualify` also seals a cache manifest
  (each retained cache file's sha256, lines and bytes). A stage record written but not sealed after a crash is sealed
  by `seal selection` / `seal test-<fold>[-confirm]` (recovery; the record's body hash must verify). `code-<ID>` phases are interleaved as needed.
- **Pins:** the code digest of `src/study9-phase-b/`; the sha256 of every repository source file the namespace imports,
  transitively — relative imports and the package's `#lib`/`#types` subpath imports, so the loader in `src/lib/` is
  covered — unioned with Study 8's engine-file list and the trace code files, plus `package-lock.json` and the study
  scripts; the 13 projection files in full, the projection's `partitions.json`, the
  splits; each canonical file's byte prefix through the last 2026-10-30 bar; the numeric rulebook
  (`context.ts` `constantsSnapshot`, which embeds Study 8's values; gate RB proves them equal to Study 8's sealed ones).
- **Enforcement:** every door and stage re-verifies the chain and the pins and fails closed. A stage refuses before
  its predecessor phase is sealed and after its own. Training doors refuse once `selection` is sealed, or if
  `FROZEN_SELECTION.json`, any `results/test/` file or any test-door log line exists. A test door requires `selection`,
  `audit` and the earlier test folds. `seal search|qualify` refuses if any job's door opened other than exactly once,
  unless `--acknowledge <ID>` names a disclosing `AMENDMENTS.md` entry. A code change after the freeze stops every
  stage until `acknowledge-code <ID>` follows an `AMENDMENTS.md` entry; data or rulebook changes have no
  acknowledgement path.
- The chain is a local integrity aid, **not** a signature, a notarization or proof of untouched data. Its head is
  copied into `RESEARCH_RECOVERY.md` after each phase.

## 3. Chronology and data doors

### 3.1 Folds (Study 8 §3.3, literally)

| Fold | Training | Test window | Purpose |
|---|---|---|---|
| F19 | → 2019-12-31 | 2020-01-02 → 2021-12-31 | unseen COVID crash regime |
| F20 | → 2020-12-31 | 2021-01-04 → 2022-12-30 | unseen 2022 bear regime |
| F21 | → 2021-12-31 | 2022-01-03 → 2023-12-29 | bear/re-entry stress diagnostic |
| F23 | → 2023-12-29 | 2024-01-02 → 2024-12-31 | sparse-opportunity diagnostic |
| **F24** | → 2024-12-31 | **2025-01-02 → 2026-10-29** | primary retrospective chronological test |

Every run is one continuous causal run from the close of 2016-01-04, arming 2017-06-15; nothing is liquidated or reset
at a cut (open lots, highs, pending orders, reservations, continuation and shadow state, accrued interest and drawdown
peaks carry through). Test results are attributed by marked P&L at the period boundaries; 2025 and 2026 YTD are
reported separately; 2026 counts as a calendar year in every concentration and leave-one-year-out computation. yTest
is sessions from the first test session to the test end ÷ 252 (Study 8's exact definition).

### 3.2 Doors (`door.ts`; every opening logged to `results/doors.jsonl`)

| Door | Root | End | Precondition |
|---|---|---|---|
| `pilot` | projection | 2024-12-31 | protocol not frozen |
| `parity*` | projection (N2: the leakage-test copy) | any ≤ 2024-12-31 | protocol frozen; parity not sealed |
| `search-F19…F24` | projection | the fold's training end | parity sealed and passed; selection not sealed; no test trace (also used by qualification) |
| `test-F19…F23` | projection | the fold's test end (≤ 2024-12-31) | selection and audit sealed; earlier folds sealed (order F19 → F20 → F21 → F23 → F24) |
| `test-F24` | canonical `data/` | **2026-10-29** (exact) | the same, after test-F23 |
| `slice` | canonical `data/` | 2026-10-30 (exact) | `test-F24-confirm` sealed |
| `post` | canonical `data/` | 2026-10-29 (exact) | `test-F24-confirm` sealed (post-test analyses, §11) |

- **Projection:** `data/vintages/study9-train-2024/` (Phase A's physically truncated, read-only copy of the canonical
  bytes through the last bar of New York date 2024-12-31). Every training and qualification door of every fold reads
  only it: no byte after 2024-12-31 exists there. Folds F19–F23 truncate logically at their training end through the
  loader's explicit end date (gate N1 proves the truncation causal).
- The door loads through the repository loader with an explicit end date (`all` partition; loader label
  `manual evaluation`, the only label it accepts there; the log's `purpose` states the real purpose), refuses any other
  root or end before a byte is read, asserts the first session (2016-01-04), the arming session (2017-06-15), that
  no loaded session lies after its end, and, per instrument, that its last session is on or before the end and its last
  bar inside that session.
- **Identity:** the door id hashes the members, the first and last session, each member file's byte prefix through the
  end, the splits, the partitions and the (empty) ledger. Appending bars changes no id and no cache key (gate N2).
- **Caches:** one persistent JSONL point cache per search and qualification job (`results/cache/`, git-ignored, kept);
  the header binds the namespace, the job, the door id and the engine hash (the sha256 of every file in the evaluator's
  transitive source closure including `src/lib/` through `#lib`, Study 8's engine-file list, the trace files and
  `package-lock.json`); each key binds the settings (costs, interest, stop fill, slippage, arming date) and the
  ordered books with every book's full vector. Test, slice and post-test stages use fresh memory caches only.
- **No post-2024 strategy computation** before `selection` and `audit` are sealed. The pre-search parity stage reads
  only doors ending ≤ 2024-12-31. The test-door parity gate TP1 runs inside every test stage, TP2 inside the F24 stage.

### 3.3 The later slice

The **2026-10-30** session is evaluated only after `test-F24-confirm`, as a separate single-session slice
(`slice.ts`): not a gate, not a holdout, never used to amend anything. If a later refresh adds sessions after
2026-10-30, they are recorded (the canonical pins report their byte counts) and reserved for forward observation; the
fixed block is not expanded.

## 4. Engine, accounting, metrics (Study 8 §4)

- **Evaluator:** Study 8's `Evaluator` (traces, record, ranges) reused unchanged; `engine.ts` overrides only `replay`
  to accept any book of the door in the engine's own order (`bookOrderOf`: VGT, XBI, XRT, KRE first, then alphabetical;
  identical to Study 8's on B5 subsets). Period attributions use Study 8's period list, years and half-years.
- **Metrics:** net = realized + marked unrealized after interest and costs; minute DD (the strict tracker) and daily DD
  in $ and % of $100k; the risk ceiling **strictly < $35,000** (a backtest screen, not an enforceable stop or a 35%
  portfolio guarantee); lots, episodes (> 10 sessions after the previous exit), lot years, capital-days, net per
  occupied $100k-year; refusals.
- **Stresses:** gating (Q7 on the training run, T4 on the run to the test end): 10 bps, 14% interest, next-open stop
  fills, +25 bps stop slippage. Diagnostic: 0 / 2 / 20 bps, 8%, +10 bps slippage, arming on 2017-12-15 / 2018-06-15.
- **Gap risk** (reported): funded lots closed by a stop that gapped through at the open, and the loss beyond the stop.
- **Fill caveat:** fills follow the engine's assumptions; they are not claimed to equal live execution.

## 5. Neighbourhood instrument and seeds

### 5.1 Instrument (Study 8 §5, literally)

- **Decisive:** joint N1 clip Latin hypercube over all 8 × books coordinates (Study 6's `coordinate`, Study 8's grid,
  quantization and clipping); radius X ±1.0 pt, Y ±0.2 pt, stop ±1.0 pt, hold ±2, L ±10, buffer ±1.0 pt, P ±1.0 pt,
  W ±20; de-duplication against the centre and earlier points. Confirmation and test: 3 × 128 (≈ 384 unique).
- **Gating variants:** in-box pair (2 × 128; Q2b/T2b for candidates with a coordinate within r of a bound);
  count-matched k = 8 (2 × 128; E3).
- **Report-only:** 0.5r and 1.5r (128 each); norm-matched √(8/d); one book at a time (64 per book); k = 16 for pools of
  three or more books; clipping mass; per-family shares; the one-sided 95% Wilson lower bound; profitable share; worst
  DD; per-period medians.
- A parameter-neighbourhood pass rate is cumulative historical simulator robustness, **not a probability of future
  safety**, and not a claim that later-window drawdowns are independent.

### 5.2 Seed families (Study 8's label structure; namespace `study9-phase-b`)

Every seed is `deriveSeed('study9-phase-b', …labels)`; `label(…)` appends `track, fold`, where the track label is the
track ID of §1.2 (each ID is bound to exactly one membership by the frozen rulebook, and every door and cache binds the
membership). Labels, verbatim:

| Family | Labels | Use |
|---|---|---|
| Screen | `('screen', symbol, track, fold)` per book | 4,096-vector Sobol per book |
| Combinations | `('combos', track, fold)` | random plausible-book combinations |
| Joint LHS | `('lhs', track, fold)` | joint coverage |
| GA | `('ga', island, track, fold)`; fillers `('fill', island, track, fold)` | islands |
| Rungs | `('r1' / 'r2' / 'r3' / 'r3b', track, fold)` | 16 / 64 / 128 / 128 (r3b: T2 only) |
| T2 SE | `('bootstrap', track, fold)` | T2 bootstrap |
| Refine | `('refine', track, fold)` | 64 |
| Selection | `('select', rep, track, fold)`, rep 1–2 | 2 × 128, role order |
| Confirmation | `('confirm', track, fold, rep)` rep 1–3; `('confirm-inbox' / -half / -wide / -d8 / -d16 / -norm, track, fold, rep)`; `('confirm-book', track, fold, symbol)` | qualification (the controls use the same labels) |
| Test | `('test', 'sets', fold, rep)`; `('test-<variant>', 'sets', fold, rep)`; `('test-book', 'sets', fold, symbol)` | test doors (shared by every configuration of the same dimension in a fold) |
| Test bootstrap | `('test', fold, 'bootstrap', <holder>-<control>, <period>)` | 5,000 resamples, block 21 |
| Count-matched subsets | the family's labels + `'subset'` | which coordinates move |
| Parity, pilot | `('parity', …)`, `('pilot', …)`; parity and smoke searches prefix every label with `'parity'` / `'smoke'` | engineering only |
| Preference | `('preference', 'F24', 'familywise', <period>)`, `('preference', 'F24', 'confirmatory')` | the post-test bootstrap of §9.3 |

No Study 8 or Phase A label is reused under its own namespace, and no test seed feeds training promotion. Disclosures:
the two pre-freeze smoke runs used the production labels at toy budgets (outputs deleted unread); the post-test
diagnostics reuse the F24 test labels to describe the same test neighbourhoods; the smoke runs' qualification and test
stages and parity gate T0 used the production confirmation and test labels on training data (T0: the F23 test labels on
the projection, frozen and parity configurations only; booleans kept). Parity gates A1–A4 call the ported
code under **Study 8's** namespace (`withNamespace`, synchronous only, or a child process switched by
`setNamespaceForParityReplay`); every production stage asserts at entry that the live namespace is `study9-phase-b`
and records it in its sealed record. Common random
numbers: the islands share the rung-1 offsets; they are independent only in their GA randomness.

## 6. Fitness and eligibility (Study 8 §6, literally; imported code)

Constrained Pareto objectives: maximize centre net/yr, neighbourhood median/yr and p10/yr; minimize neighbourhood p90
minute DD. Constraints C1–C7 as one normalized violation (non-finite ⇒ infeasible): C1 centre DD < $35k; C2 share ≥
0.90 and p90 < $35k; C3 lots ≥ ⌈1.5·y⌉, episodes ≥ ⌈0.5·y⌉, lot years ≥ min(3, years spanned − 1); C4 every pooled book
≥ ⌈0.4·y⌉ lots; C5 median ≥ $10,000/yr and p10 > 0; C6 ≥ $11,000 per occupied $100k-year; C7 top lot ≤ 25%, best year
≤ 75%, ex-best-year economy ≥ $5,000/yr. y = sessions from arming to the window's end ÷ 252. **Robust profit** =
½ median + ½ p10 (per year). Implemented by importing `violationOf`, `objectivesOf`, `centreView`, `nbView`, `floorsOf`
from Study 8's `fitness.ts`; threshold sensitivity is reported as in Study 8 §6.

**No change** to the fitness, the penalty, the feasible region, the bounds, the radius, the risk gates, the activity
floors or the roles. If an implementation needs a change that would alter a numeric rule, the study stops and asks.

## 7. Search schedule and compute (Study 8 §7, literally)

### 7.1 Pipeline per track × fold

Study 8's `runSearch`, ported line for line (§14): per-book Sobol screens (4,096; plausible: standalone DD < $35k, net >
0, ≥ 2 lots) → combinations of plausible books (4,096·s) and joint LHS (1,024·s) → promotion (DD < $35k, net > 0, lots
≥ ⌈floor/2⌉, every book ≥ 1 lot; rung-1 cap 1,024·s, ½ by rank, ½ by max-min diversity) → rung 1 (16) → NSGA-II, 4
independent islands × population 64·s × ≤ 40 generations × ≤ 2,048·s new configurations, constrained domination, SBX
η 15 (p 0.9), PM η 20, stagnation 10 / 1e-3 → rung 2 (top 192, L∞ 0.02, n 64) → rung 3 (top 48, L∞ 0.03, n 128) →
refinement (6 starts, L∞ 0.05, ≤ 2 passes, the repository's probe set, Study 8's acceptance rules) → shortlist (≤ 6,
L∞ ≥ 0.10, ledger-signature de-duplication; picks profit, robust, balanced, centre, then the Pareto order, then
infeasible-on-training fill) → selection evidence (2 × 128). The search record keeps B1's selection evidence as a
report-only control (VGT is added to the door when the pool lacks it).

| Pool size | s(d) | Combinations | Joint LHS | Rung-1 cap | Population | New per island |
|---|---:|---:|---:|---:|---:|---:|
| 2 books (16-D) | 1 | 4,096 | 1,024 | 1,024 | 64 | 2,048 |
| 3 books (24-D) | 1.5 | 6,144 | 1,536 | 1,536 | 96 | 3,072 |
| 4 books (32-D) | 2 | 8,192 | 2,048 | 2,048 | 128 | 4,096 |

### 7.2 Triggers and multiplicity (Study 8 §7.2)

T1 (≥ 10% union feasible hypervolume from the last island, or ≥ 25% lower minimum violation with nothing feasible ⇒ 2
more islands, up to 8); T2 (top two rung-3-feasible within the larger bootstrap SE ⇒ re-score the top 8 with 128 more);
T3 (< 2 rung-2-feasible regions while rung 1 has ≥ 3 ⇒ up to 16 regional representatives). Stop when the schedule and
the triggered extensions end; never early because an estimate was reached, never extended to chase a result. CSCV/PBO
per track-fold over the rung-2 set's 64 best on half-year blocks 2018H1 → the training end.

### 7.3 Operations

- `scripts/run_jobs.sh scripts/jobs-search.txt <P>`: each job in its own process group, longest first (32-D, then
  24-D, then 16-D; F24 first within a dimension). P is set from the pilot (§7.4) before any search, at most 12.
- **Watchdog:** a job whose log and point cache have both been idle 45 minutes is stopped (`exit timeout`). The
  SIGTERM handler flushes the cache only when the job is between synchronous computations; otherwise the SIGKILL 20 s
  later loses at most the last ~30 s of points, which a resume recomputes deterministically.
- **Memory:** the pilot measured ~1.8–1.9 GB RSS per process on pool-only doors; search doors add VGT, qualification
  doors hold up to eight books; the trace cache keeps Study 8's 30,000 traces. With 12 jobs the plan is ≈ 3–4 GB each
  under a 12 GB heap cap on 59 GB. Available memory is watched during the run; if it falls below 8 GB the remaining
  jobs are started with fewer parallel slots (operational only, disclosed).
- **Resume:** rerunning the script resumes an interrupted job from its persistent cache with identical output; the
  repeated door opening is disclosed in `AMENDMENTS.md` and acknowledged at `seal`.
- **Test stages:** fresh memory caches; progress lines without statuses; statuses printed only after the seal; a crashed
  test stage writes nothing and is rerun **once**, deterministically, labelled (enforced: the stage counts its earlier
  door openings, refuses a third and records its attempt number); a second crash stops the study. `--confirm` requires
  the sealed `test-F24` phase.

### 7.4 Compute

Estimate (Study 8's measured job times scaled by Phase A's per-neighbour pilot): ≈ 77 CPU-hours including
qualification and tests; the critical path is a 32-D F24 job (≈ 4.5–9 h under contention). This is a planning figure,
not a cap. The timing pilot (`results/pilot/pilot.json`, 22:44–22:45Z; one process, uncontended; no economic quantity)
measured per fresh joint neighbour: G4-ILF 22.6 ms, G4-EWW 26.1, N3-EDV 18.1, N2-SMH 16.1, V3-IWM 20.5, N2-EDV 12.0,
VG3-IWM 20.9 (Study 8: 16-D 12.1, 24-D 18.1, 32-D 25.3), and universe loads of 3.6–10.7 s. It sets only the
parallelism: **12 parallel jobs** (Study 8's), longest first. Reported at the end: configurations, distinct centres,
fresh points, CPU-hours, wall time, saturation events, fronts, PBO, restarts.

## 8. Qualification, selection, audit, test (Study 8 §8, literally)

### 8.1 In-sample qualification (training door; confirmation families)

Q1 centre DD < $35k; Q2 pooled share (3 × 128) ≥ 0.90 and p90 < $35k; Q2b in-box likewise when a coordinate is within
r of a bound; Q4 net > 0, best year ≤ 75%, ex-best-year ≥ $5k/yr; Q5 C3/C4 floors; Q6 top lot ≤ 25%; Q7 gating stresses
net > 0 and DD < $35k; Q8 confirmation median training net ≥ 60% of the centre's (and centre > 0); E1 median ≥ $10k/yr
and p10 > 0; E2 ≥ $11k per capital-year; E3 (pools) not dominated by B1 on (median/yr, p90 DD) under count-matched
k = 8 (non-finite fails). Study 7's Q3 is replaced by the T gates (Study 8's interpretation). An infeasible-on-training
candidate cannot qualify. Marginal: share ≤ 0.93 or a family failing alone. **Controls** on the same door and labels:
B1 (the tier and E3 reference), B5, Study 8 VG #2 balanced and VG #1 profit (report-only economic context). Implemented
with Study 8's `qualificationOf`, imported.

### 8.2 Selection (training-only; Study 8's `assignRoles`, imported)

Per track × fold, roles in the selection families' order (2 × 128), each to the first **qualified** candidate at L∞ ≥
0.10 from those taken: profit (robust/yr), robust (share, among candidates with median ≥ 50% of the profit holder's),
balanced (robust/yr ÷ p90), up to 2 extra (shortlist order; also ledger Jaccard < 0.5 against every holder). Empty
roles are recorded. **Ranking per fold** over the role holders of all seven tracks: tier "strong" if the confirmation
robust/yr ≥ B1's under the same track's labels, else "modest"; within a tier robust/yr, then lower p90, then ID. **The
F24 ranking is the study's training-only global ranking.** Sealed in `FROZEN_SELECTION.json` (phase `selection`) with
the code and engine digests, the rulebook, the T-gate text and the test plan.

### 8.3 Pre-test audit

A fresh read-only independent agent checks leakage, seed independence, source and data hashes, the C/Q/E constraints,
the inclusion and labelling of the exploratory VG track, engine parity, multiplicity and the freezes. Its report, in
`reviews/`, must contain exactly one line beginning `Result:`, that line must read exactly `Result: CLEARED`, and the
report must not contain `NOT CLEARED` or `UNCLEARED` anywhere (`record-audit` refuses otherwise); it is sealed as phase `audit` before any test door opens.

### 8.4 Test gates (block-only; Study 8 §8.4; `testGatesOf`, imported)

T1 centre run minute DD < $35k; T2 test families 1–3 pooled share ≥ 0.90 and p90 < $35k; T2b in-box likewise for
near-bound candidates; T3 test-window centre net ≥ $10k × yTest and pooled test median > 0 and ≥ $5k × yTest; T4 under
the four gating stresses test-window centre net > 0 and run DD < $35k; T5 best calendar year (2026 counted) ≤ 75% of net,
ex-best-year ≥ $5k/yr, largest lot ≤ 25%; T6 run floors (lots ≥ ⌈1.5·y⌉, episodes ≥ ⌈0.5·y⌉, lot years ≥ 3, every book ≥
⌈0.4·y⌉) and test-window new lots ≥ ⌈1.5·yTest⌉ and new episodes ≥ ⌈0.5·yTest⌉ (yTest rounded to 0.01); T7 net per
occupied $100k-year ≥ $11k. **Status:** fail if any gate fails; ambiguous if it passes but the pooled share ≤ 0.93, a
test family fails T2 alone, or the centre DD ≥ $33,000; pass otherwise. **Test outcomes only veto.**

**Nomination (F24 only):** the sealed F24 ranking restricted to non-failed role holders (ambiguous labelled); the
primary nominee is the top one; possibly none. Outcome classes: qualified | stable-but-weaker only (an F24 holder passes
T1, T2, T2b but fails another) | none. Procedure folds report persistence only.

### 8.5 Test-stage reporting (Study 8 §8.5, plus)

Every shortlist member of every track (holders: full evidence, minute series, drawdown decomposition; others: lite);
the controls; whole-run and test-window figures, 2025 and 2026 YTD, test-window minute DD, neighbourhood test-window
median/p10; sensitivities; gap risk; leave-one-year-out; the five largest drawdown episodes; per-lot MAE; funded-sequence
diagnostics (kept lots, Jaccard, displaced/added, `sequenceDependent`); Study 7-equivalent gates (report-only);
persistence and return-rank statistics. **Paired stationary block bootstraps** (block 21, 5,000) of every holder against
**VG #2 balanced, VG #1 profit, B1 and B5**, on the whole run and the test window. F24 then runs `--confirm` (a
deterministic repeat in a fresh memory cache; must be identical). On **every** test fold, before any gate: **TP1** the
production replay (`P9Evaluator`) = `runNAllocator` for every holder of the fold (base, next-open, +25 bps) and every
control. On F24 also **TP2**: Study 8's sealed F24 test centres of all 13 carried rows — VG #1, VG #2, the five other
Study 8 track bests, B1, B5, frozen VG/VXR/VXRG and G-PA — reproduced to the cent (net, minute and daily DD, lots,
episodes, ledger signature, test-window net). A failure writes nothing.

### 8.6 The 2026-10-30 slice (report-only; §3.3)

For every F24 role holder and F24 control: the session's marked P&L, lots entered, exited and open, the session's
minute DD and whether the run DD changed; the run through 2026-10-29 on the same door must reproduce the sealed F24
centres.

## 9. Comparators, economic comparison and the three decisions

### 9.1 Comparators (never seeds; read from sealed records; `controls.ts`)

All folds: B1 (VGT `primary`), B5, frozen VG, **Study 8 VG #2 balanced** (F24 rank 2, `S8-VG-F24-3`, alias
`s8-vg-balanced`; the primary economic comparator), Study 8 VG #1 profit (`S8-VG-F24-1`). F24 adds: frozen VXR, frozen
VXRG, G-PA, Study 8 #3 VXRG profit, #8 VXRKG profit, #12 G profit, #15 VXR profit, #25 V robust (non-decisional
context). Exposure: Study 8's holders are in-sample on 2016–2024 and their 2025–2026 results were inspected; B1 and B5
were chosen with 2024–2026 hindsight.

### 9.2 The user's robustness preference (report-only, after the unchanged fitness)

Bands on a decisive 3 × 128 share (each reported with n, per-family shares and the one-sided Wilson bound): **preferred**
≥ 95%; **conditional** 93% ≤ share < 95%; **diagnostic** 90% ≤ share < 93% (qualifies mechanically, never the preferred
selection); below 90% fails C2/Q2/T2. The user-preference band of a holder is the **lower** of its training
confirmation band and its F24 test-family band. (At exactly 0.93 a holder is mechanically "marginal/ambiguous" — share
≤ 0.93 — and preference-"conditional"; both labels are reported.) The conditional band is admitted only with this
predeclared **compelling case**, every item required, all against VG #2 under the same track's labels: (1) training
confirmation median/yr **and** p10/yr ≥ VG #2's, robust/yr ≥ VG #2's + max($3,000, 10%), and centre net/yr ≥ VG #2's;
(2) every confirmation and every F24 test family passes on its own; (3) in-box Q2b/T2b pass; (4) every Q7/T4 stress
passes; (5) whole-run centre minute DD and F24 test-family p90 DD below $33,000; (6) F24 test-window centre net and
test-family median ≥ VG #2's. The training figures are in-sample, selection-biased optima for both the holder and
VG #2. Profit is first-class: a 95–98% holder that earns materially more is not inferior to a 99–100% one. The tier,
the ranking and the bands compare 16–32-D neighbourhoods with each other and with 8-D B1, an inherited bias against
higher-dimensional pools; the count-matched k = 8 and norm-matched figures are reported beside them (report-only).

### 9.3 Economic comparison with VG #2

A new holder is **economically compelling** only if it is a mechanically qualified, non-failed F24 role holder with a
broad neighbourhood (preferably ≥ 95%), strong centre/median/p10 profits, adequate activity, positive contributions after
capital contention (every book's whole-run leave-one-out net contribution > 0, from the diagnostics record), credible
fills (≤ 10% of fills on a bar whose dollar volume is below the $100k notional, and every fill bar present), and a
**meaningful, uncertainty-aware advantage** over VG #2: the paired block
bootstrap on the F24 test window, predeclared here: (a) **confirmatory** — the mechanical primary nominee only,
holder − VG #2 daily P&L, one-sided: "advantage" iff the 5th percentile of the resampled total (block 21, 5,000) is
> 0; (b) **every other F24 holder** — a family-wise single-step max-T test (White's reality check / Romano–Wolf) on
**common** resample indices for all holders (one bootstrap call, one RNG): t_h = d_h / s_h, M_b = max_h (T*_hb − d_h) /
s_h, adjusted p_h = share of M_b ≥ t_h; "advantage" iff p_h < 0.05; (c) the whole-run comparison is **in-sample and
descriptive** (training ⊂ the run for both), never evidence of advantage. Otherwise the verdict is "inconclusive"
(positive but not significant) or "no advantage". About 458 test sessions give ≈ 22 blocks of 21, so power is low and
"inconclusive" is the expected outcome. The number of comparisons is recorded. Training robust/yr is compared under
identical labels. The per-holder test-stage bootstraps against VG #2, VG #1, B1 and B5 (§8.5) are reported unadjusted
and labelled so.

### 9.4 The three decisions (reported separately; computed by the sealed report-only stage `preference`, after the diagnostics)

1. **Mechanical protocol nomination:** the sealed F24 training-only ranking restricted to non-failed holders (§8.4),
   whatever the user's preference.
2. **User-preference assessment:** §9.2–§9.3 applied to every preselected role holder without changing the mechanical
   ranking; any ex-post preference is labelled descriptive, not an untouched selection.
3. **Deployment decision: research only, NOT DEPLOYED.** No margin orders are proposed; the required prospective
   follow-up is stated.

## 10. Engineering gates (stage `parity`; any failure stops the study; `parity.ts`)

Each parity attempt writes its scratch outputs under `results/parity/run-<UTC>/`; a failed attempt's record is kept
there and nothing is sealed; a rerun after a fix is a new attempt, disclosed. Parity labels are prefixed `'parity'`.
The smoke-budget search outputs of N2 and D1 and the C1 cache files are deleted after their comparisons (the records keep
the comparison results and hashes).

| Gate | Requirement |
|---|---|
| PA | Phase A's chain verifies with its own command (head `a1e912a2b5fd2556`); Study 8's sealed chain files all hash to its chain |
| S8C | the live Study 8 code and engine files (> 100, `src/lib` included) equal Study 8's last sealed acknowledgement `code-E1.json` |
| RB | the Study 8 rulebook imported here equals the one sealed in Study 8's `FROZEN_SELECTION.json` (execution, eligibility, test gates, schedule, stresses, sensitivities, bootstrap, folds, windows, episode gap, radius); the period list, years, half-years and primary fold are Study 8's own objects |
| E1 | the 13 projection files equal Phase A's manifest and are byte prefixes of the canonical files; the five B5 canonical files' Study 8-pinned-length prefixes equal Study 8's pins; bytes after 2026-10-30 are reported (never used) |
| P1 | the **production** replay (`P9Evaluator`) = `runNAllocator`, 0 differences: all seven memberships × (3 new vectors + 2 perturbations) × 0/5/10 bps on W19, W21 and W24 (2019-12-31, 2021-12-31, 2024-12-31); 14%, next-open, +25 bps on W24; a tie-heavy identical-vector pool per membership; frozen B1, B5, VG and Study 8 VG #1/#2. Refusals in every membership, same-minute decisions overall; counts reported per membership |
| P2 | this evaluator = Study 8's (every record field), base and next-open, on B5-subset configurations |
| P3 | every Study 8 sealed F24 training-door centre (candidates and controls of its six tracks) to the cent |
| P6 | the minute-series port = Study 6's on B5-subset configurations; it reproduces the tracker on every membership |
| A1 | the ported space and designs under Study 8's namespace return Study 8's draws exactly (Sobol, LHS, clip, in-box, 0.5r, 1.5r, k = 8, k = 16, norm-matched, per-book) |
| A2 | the ported evidence under Study 8's namespace reproduces Study 8's sealed F24 qualification evidence and gates of VG #1 and VG #2 exactly |
| A3 | the ported optimizer under Study 8's namespace reproduces Study 8's sealed VG-F19 search record (every decision field and the archive) |
| A4 | the ported test stage under Study 8's namespace reproduces Study 8's sealed F23 and F21 test records (projection doors) — evidence, sensitivities, gap risk, gates, status and Study 7-equivalent gates — for the first G, VG and VXRG holder and two lite members of each fold |
| N1 | no lookahead at 2019-12-31, 2020-12-31, 2021-12-31 and 2023-12-29: closed lots, entries, refusals and daily marks **through** the cut session, and per-book closed trades, equal the full training run's (base, next-open, +25 bps) |
| N2 | at **every** cut (the four above and 2024-12-31): a copy whose bars after the cut are replaced by a synthetic crash gives identical door ids, prefix hashes, point records (including a configuration holding a lot open at the cut), full replay marks, lots and refusals, rung-1 fits and cache headers, and (2019-12-31, 2024-12-31) an identical smoke-budget search body; past the cut, outside the door, results change (power) |
| C1 | cache reload identical; a foreign job, door id or engine hash is refused; 200 recomputations equal |
| D1 | a smoke-budget search fresh twice and stopped-and-resumed: identical bodies and archives |
| T0 | the test pipeline twice on a parity door (F23 geometry, primary branches): identical sealed forms; every holder has series, gap risk and 8 bootstraps |
| G1 | refusals with their expected reasons: search before parity is sealed, test doors, the pilot after the freeze, an end after 2024-12-31, a fixed-end override, the slice and post doors, a smoke door, a foreign symbol, a leak root on a search door |
| L1 | only `door.ts`, `integrity.ts`, `parity.ts`, `context.ts` (paths) and the post-test `diagnostics.ts` name the data root or call the loader |

**Tests:** unit tests, `tsc --noEmit`, lint; the inherited `npm test` suite only after `test-F24-confirm` (it reads
post-2024 data in this checkout), with pre-existing failures classified. **Reviews:** an independent methodology review
before the freeze (and its verification), the pre-test audit (§8.3), and a final read-only audit after the reports,
each in `reviews/`.

## 11. Post-test analyses (report-only; after `test-F24-confirm`; door `post`)

For every F24 role holder and VG #2, VG #1, B1, B5, on the run to 2026-10-29: (a) every leave-one-out and all 2^n
membership subsets with the selected vectors held fixed (net, DD, lots, refusals, interest), Shapley attribution of net,
training-window and test-window net — conditional on the vectors and the shared-slot order, not intrinsic ETF alpha;
(b) liquidity: per ETF and per lot, the fill bar's dollar volume against the $100k notional, the median minute dollar
volume, stop-through-open fills and their cost, held sessions with missing regular-session bars, and the notional at
which each fill stays ≤ 10% of its bar's dollar volume (the engine has no partial fills; nothing is changed); (c) risk:
the five worst intra-trade MAEs, the largest single-lot loss, the worst five drawdown episodes with lot attribution,
overnight gaps, the longest losing streak, the worst calendar year, ex-best-year profit, top-lot contribution, per-book
profit and drawdown contribution, event windows (M2020, 2022, the 2023 regional-bank episode, T2025Q2, G2026) and
ex-2020 net; concentration in synchronized market-wide events as the share of net from lots entered in M2020 and
2022 and the top-5-lot share; (d) for the decisive F24 test families' 384 neighbours: the test-window net (min, p10,
median, positive share), the test-window daily-close drawdown (median, p90, max), the whole-run minute DD (median,
p90, max, share < $35k), the minimum whole-run net and the refused signals per neighbour. "Behaviourally relevant
dimensions" are read from the per-book perturbations and the k = 8 / k = 16 count-matched variants. Nothing here can
change a sealed record, a ranking or a gate.

## 12. Runner (after the test stage; `src/study9b-runners/`)

`npm run study9b-run -- list | run <alias> | compare <aliases…> | compare --all`, aliases resolved only from the sealed
records, labelled RESEARCH ONLY / NOT DEPLOYED; a run without `--end` uses the latest complete common local session;
reconciliation to the sealed F24 test record applies only at 2026-10-29 / 5 bps (otherwise "not applicable"); per-lot
ledgers and the report files of the brief §10. Existing `study7-run` and `study8-run` commands are not changed.

## 13. Deliverables

`README.md`, `PROTOCOL.md`, `AMENDMENTS.md`, `RESEARCH_RECOVERY.md`, `SEARCH_AND_COMPUTE.md`,
`TRAINING_QUALIFICATION.md`, `NEIGHBORHOOD_ROBUSTNESS.md`, `CHRONOLOGICAL_VALIDATION.md`,
`POOL_COMPLEMENTARITY_AND_LEDGER.md`, `EXECUTION_RISK_AND_LIQUIDITY.md`, `BASELINES_AND_PARITY.md`,
`RECOMMENDATION.md`, `RUN_COMMANDS.md`, `FROZEN_SELECTION.json`, sealed machine-readable records, generated tables and
the reviews. Every serious finding comes from a sealed record. Report-generation scripts live in
`research/study9-phase-b/tools/` (not pinned at the freeze, because they decide no record); each is sealed, with the
tables it generated, in a `report-*` phase.

## 14. Exact deltas from Study 8 and the Phase A proposal

| Item | Study 8 | Phase B |
|---|---|---|
| Tracks | G, V, VG, VXR, VXRG, VXRKG | the seven memberships of §1.2 |
| Seed namespace | `study8-expanded-regime-d1` | `study9-phase-b` (labels unchanged in structure) |
| Book order | B5 order (five symbols) | the engine's `bookOrderOf` (identical on B5 subsets) |
| Code | Study 8's modules | Study 8's pure functions imported unchanged (`violationOf`, `objectivesOf`, views, floors, stats, `rankOrder`, `qualificationOf`, `wilsonLower`, `testGatesOf`, `assignRoles`, `jaccard`, `sealedForm`, `stageCore`, the `Evaluator` except `replay`); `space`, `designs`, `fitOf`, `runSearch`, `evidenceOf`, `runQualification`, `runFreezeSelection`, `testStageOn`, `runTest` and Study 6's `pointFromUnits`/`minuteSeries` ported line for line with only the namespace, book order, paths, doors and comparators changed (gates A1–A3, P2, P6) |
| Doors | the repository loader on the canonical files (`training`/`all`) | Phase A's 2024 projection for every training and F19–F23 test door; the canonical files only for test-F24 and after |
| Search controls | B1 + matched frozen subset (G: GDX controls) | B1 (no matched frozen subset exists) |
| Qualification controls | B1, B5, matched frozen subset | B1, B5, Study 8 VG #2, VG #1 |
| Test controls | B1, B5, frozen VG/VXR/VXRG, G-PA; F24: G-NM1–3, Study 7 references | B1, B5, frozen VG, VG #2, VG #1; F24: + frozen VXR/VXRG, G-PA, Study 8 #3, #8, #12, #15, #25 |
| Bootstrap comparators | B1, B5, matched subset (G-PA for GDX) | VG #2, VG #1, B1, B5 |
| Test-door parity | (W29 parity before the search) | TP1 inside every test stage, TP2 inside the F24 stage (no post-2024 computation before the selection) |
| Port proofs | — | parity A1–A4 reproduce Study 8's sealed draws, evidence, search and test records under its namespace |
| Preference and decisions | — | a sealed report-only stage `preference` (§9.2–§9.4) |
| Later slice | none | 2026-10-30, report-only |
| Reporting additions | — | preference bands and the compelling case (§9.2), the three decisions (§9.4), post-test analyses (§11) |
| Phase A proposal | option C (five pools), ~49 CPU-h | the user approved seven: option D's reserve G4-EWW and the exploratory VG3-IWM (not a Phase A nominee) |

Fitness, constraints, bounds, grid, radius, neighbourhood geometry, budgets, triggers, qualification, selection roles,
ranking, T gates, status and nomination rules are unchanged.

## 15. Exposure

All of 2016-01-04 → 2026-10-29 was inspected by earlier studies (Study 8 §3.4); KRE's and GDX's broad 2025–2026 paths
are especially familiar (Study 8's G2026 drawdowns; B5/VXRKG). The F24 window is therefore an algorithmically closed
door on previously inspected history: **retrospective chronological persistence, not an untouched holdout**. Phase A
computed no post-2024 pool result, but that does not cleanse the project's exposure. Bars 2026-10-14 → 2026-10-29 of
the 56 non-B5 ETFs were first downloaded by Phase A's refresh; that is recorded, and it does not make the elapsed window
prospective. Genuine prospectivity begins only with sessions after the Phase B configurations and rules are frozen.

**Hindsight in the procedure folds.** Phase A chose the seven memberships on 2016–2024, so the F19–F23 test windows are
in-sample with respect to membership; Study 8 chose VG #1/#2 on 2016–2024, so they are in-sample on every F19–F23 window
and in every early-fold qualification. Comparisons of holders with VG #2 on F19–F23 are descriptive (the control is
in-sample there).

## 16. Independent methodology review (before the freeze) and its resolution

A fresh read-only agent reviewed the draft (sha256 `b49a0b8e955ceaae…`) and the code (`reviews/METHODOLOGY_REVIEW.md`,
sealed with this protocol). It found **0 critical, 7 major and 18 minor** issues, confirmed that the optimizer, fitness,
neighbourhood geometry, qualification, roles, ranking and T gates are Study 8's literally, and found no leakage path.
Every finding is resolved before the freeze:

| Finding | Resolution |
|---|---|
| M1 the engine hash and the pins omit `src/lib` (`#lib`) | `closure.ts` follows `#lib`/`#types`; the engine hash and the pins union the closure, Study 8's engine files, the trace files and `package-lock.json`; unit test (§2.3, §3.2) |
| M2 `record-audit` accepts "NOT CLEARED" | exactly one `Result: CLEARED` line, no negation, report under `reviews/`; unit test (§8.3) |
| M3 adversarial bars only at 2024-12-31; N1 skips the cut session | N2 at every cut; N1 through the cut session (entries, lots, refusals, marks); per-instrument end assertions in the door (§3.2, §10) |
| M4 the preference layer is not computed | the sealed report-only stage `preference`: bands, the compelling case (item 1 widened to median, p10, robust and centre), the comparison, the three decisions (§9.2–§9.4) |
| M5 no multiplicity control; whole run in-sample | one confirmatory one-sided test (primary nominee vs VG #2, F24 window); family-wise max-T on common indices for the rest; whole run descriptive; low power stated (§9.3) |
| M6 the ported test stage is not checked against a sealed record | gate A4 (Study 8's F23 and F21 test records) (§10) |
| M7 a parity rerun is blocked by fixed paths | per-attempt run folders; A3/A4 always fresh (§10) |
| m1 P1/TP1 test Phase A's harness | P1 and TP1 compare the production `P9Evaluator` replay; per-membership counts (§8.5, §10) |
| m2 weak TP2, G1, C1 | TP2 needs all 13 rows; G1 checks each reason; C1 refuses foreign job, door id and engine (§8.5, §10) |
| m3 comparators by rank only | track, role and configuration id asserted (`controls.ts`) |
| m4 "imported unchanged" not gated | gate S8C; RB also checks the period list, years, half-years and primary fold (§10) |
| m5 seed table vs parity/smoke labels | parity and smoke labels prefixed; the pre-freeze smoke runs disclosed (§5.2, header) |
| m6 fragile namespace switch | `withNamespace` refuses async callbacks; every stage asserts the namespace at entry and records it (§5.2) |
| m7 smoke after the freeze; smoke output not kept | smoke refused after the freeze; script and printed output kept in `results/pilot/` (header) |
| m8 gate state untested; no recovery seal; `--confirm` precondition | pure `gateDecision` with unit tests; `seal selection` / `seal test-<fold>[-confirm]`; `--confirm` needs sealed `test-F24` (§2.3, §7.3) |
| m9 rerun-once unenforced | the test stage counts door openings, refuses a third and records its attempt (§7.3) |
| m10 E1 vs later bytes | E1 reports bytes after 2026-10-30 without failing (§10) |
| m11 weak L1 | extended patterns and an explicit allow-list (§10) |
| m12 memory plan | measured RSS and the plan stated; Study 8's 30,000-trace cache; available memory watched (§7.3) |
| m13 SIGTERM claim; cache retention | the limitation stated; cache manifests sealed with the phases (§7.3, §2.3) |
| m14 hindsight in F19–F23 | disclosed (§15) |
| m15 parity after the freeze; TP only at F24 | the order disclosed (§2); TP1 on every test fold (§8.5) |
| m16 unspecified report items | specified in §11 (d) and §11 (c) |
| m17 the 0.93 boundary; dimension bias | stated (§9.2); k = 8 / norm-matched figures reported |
| m18 housekeeping | §16 written; `AMENDMENTS.md`, the pilot record and the checkpoint exist |

The same agent then verified these resolutions (`reviews/METHODOLOGY_REVIEW_VERIFICATION.md`, also sealed): every
finding resolved or acceptably disclosed; the changes introduced 0 critical, 1 major and 8 minor new issues, all resolved
before the freeze:

| Finding | Resolution |
|---|---|
| V1 a failed F24 confirmation could be sealed by recovery | recovery refuses a non-identical confirmation and a test record without passed test-door parity; slice, diagnostics and preference require an identical confirmation |
| V2 production labels in T0 and the smoke stages | disclosed (§5.2); the parity header corrected |
| V3 stale text | TP1 on every fold (§3.2, `test.ts` header); qualification doors hold up to eight books (§7.3) |
| V4 `economicallyCompelling` lacks the contribution and fill criteria | predeclared (`economicCriteria`, §9.3) and read from the diagnostics, which now precede the preference stage |
| V5 undisclosed deletions; stale cache manifest | disclosed (§10); the manifest is regenerated at each seal and requires all 35 caches |
| V6 namespace check after the door opens | moved before the door |
| V7 the smoke files are not sealed | the smoke script and its outputs are sealed with the protocol; frozen after smoke run 3 |
| V8 A4's lite rows are single-book | one pooled lite member per fold |
| V9 run commands and the audit wording | `RUN_COMMANDS.md` updated; §8.3 states the exact rule; memory watched during parity |

## 17. Known limitations (stated in advance)

1. One market history with a few dominant events (2020, 2022); fresh seeds are not fresh histories; all multiplicity
   (35 searches, ~10⁶–10⁷ neighbourhood evaluations) is counted, and PBO is reported.
2. Study 8's training rank carried little out-of-sample information; the F24 order is a selection rule, not a forecast.
3. Sparse (EDV) and thin (ILF) ETFs trade only at minutes with bars, under the engine's fill conventions; a $100k lot
   exceeds their median minute dollar volume (§11).
4. The 2025–2026 window is exposed (§15); the 2026-10-30 slice is one session.
5. The precision of a single 384-point share is about ±1.6 points across seed families (Phase A's measurement).
6. The ranking, the tier and the bands compare neighbourhoods of different dimension (an inherited Study 8 rule); a
   32-D pool faces more simultaneous perturbation than a 16-D one.
7. The VG #2 comparison has low power on a 22-month window; "inconclusive" is the expected result.
