# Protocol — Study 9, Phase A: broad ETF-pool discovery (S0–S3, training only, stop before joint optimization)

Written 2026-11-02 (UTC) in the main checkout `/home/chad/projects/margin-trading`, on branch
`research/study9-etf-pool-discovery` (created from `research/study8-expanded-regime-d1` at `5359920`). The brief is
`brief/ASSIGNMENT.md` (sha256 `b53be116…`), the user's attached assignment of 2026-11-02. Where this protocol and the
brief differ, the brief governs; §12 lists every deliberate deviation from the archive audit's design proposal
(`research/study8-archive-audit/FUTURE_ETF_POOL_DISCOVERY_DESIGN.md`, kept unchanged).

**Written before any S1–S3 economic measurement existed.** What was computed before this protocol:

1. **S0, the data refresh and audit (§5).** No strategy ran; no P&L, return or ranking was computed. The refresh
   appended Alpaca SIP bars through 2026-10-30 to all 64 local files; the audit applied the repository's D1–D5
   eligibility rules; the training projection was cut at 2024-12-31.
2. **The throughput pilot** (`npm run study9 -- pilot`, `results/pilot/pilot.json`, sha256 `d2b27c68…`). It opened the
   training door on all 61 eligible ETFs and recorded timings and memory only: universe load 153 s and 3.75 GB,
   5.7 ms per book trace, 1.8–4.9 ms per cached pooled replay, 12.5 / 14.9 / 22.8 / 33.2 ms per fresh neighbour of a
   2 / 3 / 4 / 5-book pool. No economic quantity was computed into the record or printed.
3. **A code-path smoke test** (toy budgets: 8 vectors and 4–8 neighbours, ≤ 12 proposals per stratum, 16 ETFs), run
   with `STUDY9_SMOKE=1` into a scratch folder outside the study and deleted afterwards. It printed only booleans,
   file and record counts and per-stage timings; no net, drawdown, share, ranking or nomination was printed, read or
   kept, and no design choice depended on it. Its only purpose was to find crashes before the freeze. The stage
   commands refuse smoke mode.
4. **Unit tests** `src/study9-etf-pool-discovery/tests/study9.test.ts` (16 tests, synthetic inputs, no market data)
   pass; `tsc --noEmit` and lint are clean for the namespace.

**What the analyst already knows (exposure).** Every earlier study's figures, including Study 8's sealed training
records, its 2025-01-02 → 2026-10-29 test outcomes and the archive audit (§4.4). That knowledge is why the 2025–2026
window is called *exposed* and why no post-2024 figure of any candidate is computed here.

## 1. Questions, scope, success

**Core question.** On training data only (2016-01-04 → 2024-12-31), do any 2–5 ETF combinations of the eligible
canonical universe, replayed in the actual one-funded-slot D1 allocator with fixed generic vectors, show
economically meaningful complementarity — enough incremental funded profit, at an acceptable minute-drawdown risk and
with broad parameter neighbourhoods, to justify a full joint optimization from scratch in Phase B?

**Scope.** S0 (data), S1 (standalone screen), S2 (timing, collision, contention), S3 (actual shared-slot pool
replays, nomination table, Phase B batch proposal). **Stop** at the review checkpoint (§11.3): no NSGA-II or other
joint parameter search, no S4–S6, no post-2024 strategy computation, no claim of passing Study 8's 384-point gate.

**Success** is an auditable, deterministic, causally valid shortlist of pools for Phase B, or a well-supported
negative result. Filling the nomination slots with weak pools is not success (§8.6).

**Hypotheses (reported against; none is a gate).**
- **H1.** The negative findings of the earlier 61-ETF studies dominate: most candidates' signals arrive while the slot
  is busy, idle-slot trades lose money, and most decisions fall in a few market-wide events.
- **H2.** Among new pools, the V and VG families carry the highest fixed-vector shared-slot profit; the N family's best
  pools are at most comparable to the generic VG reference.
- **H3.** Fixed-vector screening ranks pools only weakly consistently across time halves (TD2 Spearman < 0.5) and the
  search has a material overfitting probability (PBO > 0.3) in most strata.

## 2. Contracts

### 2.1 Engine and economics (unchanged from Study 8)

- **D1 rules:** `src/app/allIn-trailingBuy-postExitContinuation.ts`, its port in `src/shared-margin-portfolio/
  strategy.ts`, the frozen `ShadowBook`; per-book traces by `src/portfolio-aware-d1/trace.ts` `traceBook`.
- **Allocator:** one funded $100,000 slot; no compounding; no simultaneous funded lots; shadow books continue their
  virtual state when a signal is refused; first executable signal wins; same-minute decisions in alphabetical order;
  reservations; no preemption, priority or sizing. The fast path is `src/portfolio-aware-d1/replay.ts`
  `replayFixedPool`, proven equal to the authoritative `runNAllocator` (gate P1).
- **Book order:** the engine's own `bookOrderOf` (VGT, XBI, XRT, KRE first, then alphabetical). Study 8 restricted its
  evaluator to its five symbols; Study 9 subclasses that evaluator (`engine.ts`) to accept any eligible symbol and
  changes nothing else (gate P2 proves equality on B5-subset configurations).
- **Financing and costs:** 11% simple interest on a 365-day year, on the principal; 5 bps per side; stops at the stop
  or the gapped open. **Calendar:** accounting from the close of 2016-01-04, arming 2017-06-15.
- **Gating stresses** (Q7, at the centre): 10 bps, 14%, next-open stop fills, +25 bps stop slippage.
- **Parameters:** the eight registered D1 parameters on Study 7/8's grid and box (X 8.0–30.0%, Y 0.1–5.0%, stop
  3.0–15.0%, hold 3–30, L 20–250, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200).
- **Distributions:** the fixed one-slot engine books none (only its portfolio mode does), so the Study 9 door loads no
  distribution ledger. The user's modified `config/market-events/distributions.csv` therefore enters no computation;
  gate P3 proves the sealed Study 8 training figures are reproduced anyway.

### 2.2 Study 8's fitness, preserved exactly (for Phase B, and as Phase A's feasibility test)

Imported unchanged from `src/study8-expanded-regime-d1/fitness.ts` and `stats.ts`:

- **Objectives:** maximize centre net/yr, neighbourhood median/yr and p10/yr; minimize neighbourhood p90 minute DD.
- **Robust profit** = ½ · neighbourhood median net + ½ · neighbourhood p10 net (per year).
- **Constraints C1–C7** as one normalized violation: C1 centre minute DD < $35,000 (strict); C2 share ≥ 0.90 and
  p90 DD < $35,000; C3 lots ≥ ⌈1.5·y⌉, episodes ≥ ⌈0.5·y⌉, lot years ≥ 3; C4 every pooled book ≥ ⌈0.4·y⌉ lots;
  C5 median ≥ $10,000/yr and p10 > 0; C6 ≥ $11,000 per occupied $100k-year; C7 top lot ≤ 25%, best year ≤ 75%,
  ex-best-year economy ≥ $5,000/yr. y = sessions from arming to the door's end ÷ 252 (7.524 on this door).
- **Neighbourhood geometry:** N1 "clip" Latin hypercube over all coordinates of all books (Study 6's `coordinate`,
  Study 8's radius X ±1.0 pt, Y ±0.2 pt, stop ±1.0 pt, hold ±2, L ±10, buffer ±1.0 pt, P ±1.0 pt, W ±20), de-duplicated
  against the centre and earlier points. Study 9 draws each book's block from its own seed (§6.3); the design is
  otherwise identical.

Phase A changes none of this. It is a **screening instrument on fixed generic vectors**, not an optimization: no
Phase A figure is a final fitness comparison and none passes or fails the Study 8 384-point gate. Any proposal to
change the fitness would go in a separate report and is not implemented (none is planned).

### 2.3 The user's robustness preference (a post-fitness reporting filter)

After the unchanged fitness: **preferred** share ≥ 95%; **conditional** 93–95% (only with a compelling advantage in
median and p10 net, centre net, validation, drawdown margin and stresses); **diagnostic** 90–93%; below 90% fails C2.
Bands are assigned **only** on the 384-point high-precision sets (§8.4), each with its one-sided 95% Wilson lower
bound; 16- and 80-point shares are reported with their n and never banded. A 95% measurement is not a 95%
probability of future safety. 99–100% is not preferred over 95% when 95% earns materially more with sound risk.

### 2.4 Immutable comparators (never modified; never seeds; read from sealed records)

`incumbents.ts`: Study 8's F24 holders #1 VG profit, **#2 VG balanced (the user's current preference)**, #3 VXRG profit,
#8 VXRKG profit, #12 G profit, #15 VXR profit and #23 V profit from `FROZEN_SELECTION.json` (body hash verified);
frozen B1 (VGT primary), B5 (five books), the frozen VG / VXR / VXRG subsets of B5's books and G-PA (GDX
portfolioAware) from Study 8's context. They are evaluated with Phase A's identical instrument on the training door
(§8.4) for comparison only, with their exposure stated (B1 and B5 were chosen with 2024–2026 hindsight; the Study 8
holders were selected on 2016–2024 by a full optimization, and their 2025–2026 results were inspected). Their
post-2024 figures are cited from sealed records, never recomputed. Their vectors never enter candidate generation.

### 2.5 Git, worktree, credentials

- Main checkout only, on `research/study9-etf-pool-discovery`; no other worktree.
- The user's uncommitted files (`config/market-events/*`, `._.DS_Store`) are never edited, staged or committed.
- No commit, push, merge or PR without the user's separate explicit authorization (brief §0, §8.7).
- Alpaca credentials are read from `.env` by the S0 download only, never printed or stored.

## 3. Freeze, the hash chain and integrity pins

`npm run study9 -- freeze-protocol` writes `results/protocol_freeze.json` and seals the chain phase `protocol`:

- this file;
- the brief;
- the methodology review (`reviews/`);
- an `AMENDMENTS.md` snapshot;
- a code tarball;
- the S0 records and the pilot record.

`results/chain.jsonl` (`records.ts`) is append-only. Each entry holds:

- the sha256 of every record of its phase;
- the door log's line count and hash;
- the previous entry's hash and its own.

**Pins fixed at the freeze:**

- the code of this namespace plus the transitive import closure of shared source files and `src/lib/`;
- the 61 projection files, their manifest and `partitions.json`;
- `config/market-events/splits.json`;
- the S0 eligibility record;
- the numeric rulebook (execution, eligibility, radius, stresses, periods).

**Enforcement:**

- Every stage command re-verifies the chain (file hashes, links, the door log prefix) and the pins, and fails closed.
- A stage refuses to start until its predecessor phase is sealed, and refuses to run once its own phase is sealed.
- Every stage after parity checks directly that `parity.json` is sealed with `passed: true`.
- Every stage also verifies the door log (every opening ends ≤ 2024-12-31 on the projection) and that only `door.ts`
  and `parity.ts` call the repository loader.
- Hand sealing (`seal`) accepts only `report-*` phases.
- An amendment ID present at the freeze cannot acknowledge code.
- The pins include the study's scripts (`scripts/*.py`, `*.sh`) and `package.json`. The rulebook includes every
  stage's budgets, neighbourhood families, assignments, complementarity and nomination rules, so the analyses
  predeclared here cannot change silently.
- Phase order: `protocol` → `parity` → `s1` → `s2` → `s3-screen` → `s3-high` → `s3-nominate` → `report-*`.

A post-freeze code change stops every stage until `acknowledge-code <ID>` follows an `AMENDMENTS.md` entry `## <ID> —`.
Data or rulebook changes have no acknowledgement path: they stop the study.

The chain is a local integrity mechanism, not a signature or notarization. Its head is copied into
`RESEARCH_RECOVERY.md` after each phase.

## 4. Chronology, data doors, exposure

### 4.1 Windows

| Window | Dates | Phase A use |
|---|---|---|
| Training / discovery | 2016-01-04 → **2024-12-31** (arming 2017-06-15; 2,264 sessions) | every computation |
| Exposed retrospective | 2025-01-02 → 2026-10-29 | **never opened**; Phase B evaluation only |
| Later refreshed slice | 2026-10-30 (the one session after Study 8's end) | **never opened**; Phase B only |

True prospective observation begins only after Phase B's configurations and decision rules are frozen and later
sessions occur. The 2026-10-30 session is already elapsed, so it is not prospective; whether it counts as uninspected
depends on its later use (Study 8 never loaded it; Phase A does not).

### 4.2 The door (`door.ts`)

- **Root.** The training projection `data/vintages/study9-train-2024/`: the canonical files' exact bytes through
  the last bar of New York date 2024-12-31 (byte prefixes, read-only). Never `data/`. The only other root accepted is
  a leakage-test copy under `data/vintages/study9-leakage-test/` (gate N2).
- **End.** ≤ 2024-12-31, refused before a byte is read. Loaded through the repository loader with an explicit end
  date (the `all` partition with loader access label `manual evaluation`, the only label it accepts there). Optimizing
  through 2024 departs from the repository's default partition (`training` ends 2023-12-31); the brief authorizes it,
  as Study 8's did. The door log's `purpose` field states each opening's real purpose.
- **Assertions:** the first session is 2016-01-04; the eligibility session is 2017-06-15; no loaded session is after
  the end.
- **Identity.** The door id hashes the members, the first and last sessions, each file's prefix through the end
  (not the whole file), the splits and the partitions. Appending bars never changes an id or a cache key (gate N2).
- **Log.** Every opening on the projection is appended to `results/doors.jsonl`.

### 4.3 Training folds and time-based diagnostics

All on the one continuous training run (no resets). Attributions are period mark differences:

- the expanding fold ends `TO-F19` … `TO-F24` (2019-12-31, 2020-12-31, 2021-12-31, 2022-12-30, 2023-12-29,
  2024-12-31);
- calendar years 2017–2024;
- half-years;
- EARLY (2017-06-15 → 2020-12-31, 3.55 years) and LATE (2021-01-01 → 2024-12-31, 4.0 years);
- M2020 (2020-02-15 → 04-30) and R2022 (calendar 2022).

Every neighbourhood summary also stores, per point set:

- the robust attribution (½ median + ½ p10) of every fold end, every year and every half-year;
- the **ex-2020** economy (training attribution minus calendar 2020).

**Time-based training diagnostics** (all report-only):

- **TD1 (time-split consistency).** Per pool: the centre's and the neighbourhood's EARLY and LATE robust attributions,
  annualized, and whether both halves have a positive neighbourhood median.
- **TD2 (rank persistence across the split).** Per stratum: the Spearman correlation, across proposals, of the
  annualized EARLY and LATE neighbourhood robust attributions. It is reported at each proposal's best assignment and at
  the fixed α assignment (which no pool-level choice touches).
- **TD3 (expanding-fold walk-forward, independent of the EARLY/LATE split).** For each fold end F19 … F23:
  - rank by the neighbourhood robust attribution to F, using no later information;
  - compare with the next calendar year's attribution (2020 … 2024): Spearman, and the top-10 lift (mean next-year
    attribution of the 10 best by F, minus the mean of all).
  - Per stratum it uses the proposals at α (the **clean** walk-forward: no pool-level choice uses later data) and at
    their best assignment. The best-assignment variant is not clean: its choice saw 2017–2024, and beams were
    generated adaptively. Per ETF in S1 it uses the 64 vectors, plus the vector best to F, with its next-year
    percentile.

**PBO** (CSCV, `src/d1-robust/pbo.ts`), per stratum:

- configurations are the unique (pool, configuration) pairs;
- blocks are the 14 half-years 2018H1–2024H2;
- block performance is the **neighbourhood robust half-year attribution**, the statistic the screen ranks on;
- the centre-P&L PBO is reported beside it, labelled;
- in beam and swap strata the configuration set was generated adaptively from the same data, so PBO is a lower bound
  there;
- it is descriptive, never a gate.

### 4.4 Exposure statement

All of 2016-01-04 → 2026-10-29 was inspected by earlier studies (Study 8 §3.4). The 2025–2026 window is an
algorithmically closed but previously inspected history, so a Phase B evaluation on it is retrospective, not a
holdout. Phase A's candidate generation, budgets, rules and rankings use no post-2024 information. The analyst's
memory of earlier results cannot be removed. It is mitigated by the following:

- **Predeclared rules.** Every rule is set here before S1.
- **Equal family budgets.** No family gets extra proposals.
- **Generic designs.** The S1 vectors are a fresh Sobol design; no earlier phenotype seeds them.
- **No hand-picking.** No ETF or pool is chosen by hand.

## 5. S0 — data refresh and universe audit (complete before this protocol)

**Refresh** (`scripts/s0_refresh.sh`; repository pipeline `scripts/download.sh` → `npm run datasets -- append`):

1. **Prior vintage.**
   - Kept by hard links at `data/vintages/pre-study9-2026-11-02/` (read-only, inode-preserving).
   - The append writes a new file and renames it into place, so the old bytes survive.
   - The pre-refresh inventory (`results/s0/inventory-pre-refresh.json`) has all 64 hashes. The five B5 files equal
     Study 8's pins; the other 59 end 2026-10-13.
2. **Increments.**
   - Per symbol: only the sessions after the canonical file's last New York date. The end parameter is 2026-10-31,
     i.e. 2026-10-31T00:00Z = Friday 2026-10-30 20:00 New York, the latest complete session; Monday 2026-11-02 was
     in progress.
   - Each symbol is independent and resumable, with partial files quarantined.
   - 64 of 64 downloaded, 344,509 rows: 13 new sessions for 59 files, 1 for the five B5 files.
   - Kept with hashes in `data/vintages/study9-refresh-2026-11-02/increments/`.
3. **Append.**
   - One `datasets append` run: every overlap byte-identical, the combined file scanned in full, training and holdout
     rows unchanged, atomic rename.
   - 64 of 64 appended; then `datasets verify` 64 of 64 verified.
   - Post-refresh: every file's prior-length prefix hashes to its prior vintage; the snapshot still matches; every
     file ends 2026-10-30.

**Audit** (`npm run study9 -- s0-audit`, `results/s0/symbols.json`):

- **The rules.** D1–D5 are the d1-robust rules:
  - D1: history 2016-01-04 → 2026-10-30, with no missing session and no regular bar on a closed day;
  - D2: dataset report verified, with a matching hash;
  - D3: no unexplained split-sized (30%) overnight move;
  - D4: the predeclared structure classification;
  - D5: training median daily dollar volume ≥ $10M and training median minute coverage ≥ 25%.
- **Result: 61 eligible**, exactly the canonical 61 of `research/d1-robust-pool-discovery/results/audit/universe.json`.
- **Exclusions** (non-canonical):
  - GDXJ and OIH start 2016-05-02;
  - XLRE is missing the 2016-01-25 and 2016-02-16 sessions.
- **Quality labels** (descriptive; liquidity is not required to be equal):
  - **sparse:** training median coverage < 75% or > 400 sparse training sessions. EDV, IGV, IYT, KIE, QUAL, VOOG,
    VPU.
  - **thin:** training median dollar volume < $50M. DBC, ILF.
- **Integrity checks, all clean:**
  - no unexplained split-sized moves;
  - no zero-volume bar;
  - no stale session (≥ 30 bars at one close);
  - a 09:30 first regular bar in ≥ 96.6% of sessions (DST conversion verified);
  - extended-hours and early-close bars outside the regular session are reported (the engine trades the regular
    session only).
- **Engine treatment of sparse data.** A sparse minute has no bar: the engine never trades a minute without a bar and
  never forward-fills prices. Sparse ETFs stay eligible with their labels (as in every earlier 61-ETF study).

**Projection** (`npm run study9 -- s0-project`, `results/s0/projection.json`):

- 61 read-only files, 2.8 GB;
- each one the canonical file's exact prefix through 2024-12-31, verified by hash;
- each followed in the canonical file by a 2025-01-02 row.

**Common calendar.** The pilot loaded all 61 into one universe. The engine's session-by-session calendar check passed:
2,264 identical sessions, 2016-01-04 → 2024-12-31.

## 6. S1 — standalone opportunity screen (`s1.ts`)

### 6.1 The fixed generic design

- **Vectors.** 64 vectors common to every ETF, drawn as two independently scrambled 32-point Sobol nets (labels
  `('s1-design','A')`, `('s1-design','B')`) over the box and grid of §2.1.
- **Halves.** Half A = indices 0–31, half B = 32–63. A B vector equal to an A vector is skipped.
- **No seeding.** No earlier phenotype, optimized vector or result seeds the design.
- **The cap.** 64 is the brief's cap on screening centres per ETF. Neighbourhood points are measurements around a
  centre, not further screening vectors.

### 6.2 Measurements per ETF × vector (training door, base settings)

**The centre:**

- net and net/yr, realized/unrealized, interest, costs;
- minute and daily DD;
- lots, episodes, lot years, held days, occupancy, net per occupied $100k-year;
- top-lot and best-year shares;
- every period attribution of §4.3.

**The 16-point N1 neighbourhood** (family `s1-nb16`):

- share below $35k (with n and the Wilson bound; never banded);
- median, p10 and robust per year;
- p90, median and worst DD;
- profitable share, median lots;
- Study 8's C1–C7 violation and its parts;
- EARLY and LATE neighbourhood attributions.

**Plausible** is Study 8's screen rule: standalone DD < $35k, net > 0, ≥ 2 lots.

### 6.3 Order, precision and menus

**Order.** One constrained order over all 64 vectors, at each vector's final precision:

- violation-0 vectors first, by robust/yr, ties lower p90 DD, then id;
- then infeasible vectors by violation.

Within the feasible set, robust profit/yr is Study 8's **profit-role** order. Study 8's search itself ranks by
constrained Pareto dominance; Phase A uses the profit-role scalar for its screens and reports the four-objective
non-dominated status of each nominee (§8.6).

**Precision.** The 8 best by the 16-point order get a 64-point neighbourhood from an independent family (`s1-nb64`);
their final precision is the pooled 80 unique points.

Then, repeatedly, any vector still on 16 points that reaches first place or a menu slot (the two picks of a half) is
re-measured the same way, up to 16 re-measured vectors in all. So the best vector, α, β and the menus rest on ≥ 80
points whenever the cap allows. The other vectors keep their 16 points.

**Menu.** Per ETF:

- the best two plausible vectors of each half in the final order;
- a half without plausible vectors contributes its best vectors, labelled not plausible.

**Neighbourhood seeds.** For the 16- and 64-point screening sets, each book's eight coordinates draw their
Latin-hypercube block from the seed (family labels, `'book'`, symbol). Because the generator permutes every dimension
independently, the union over books is, for one configuration, exactly a Latin hypercube over all k × 8 coordinates,
as in Study 8; only the seed derivation differs. It gives a book the same perturbations in every pool, which means:

- common random numbers across pools;
- shared traces.

**The decisive 384-point set (§8.4)** does not use these blocks. It uses Study 8's own instrument per pool: one joint
Latin hypercube seeded by the pool, so no two pools share decisive offsets.

### 6.4 Summaries (opportunity sources, not ticker counts)

**Per ETF:**

- **Counts:** plausible, 16-point-feasible and final-feasible vectors.
- **Breadth:** the share of the 64 vectors with net > 0 and DD < $35k.
- **The median centre net/yr over all 64.** A non-selected opportunity measure.
- **The best vector's figures.**
- **Fold and year attributions.**
- **EARLY–LATE Spearman** over the 64 vectors.
- **The plausible vector best on EARLY**, with its LATE robust attribution.
- **TD3** over the 64 vectors.
- **The 16 → 64-point uncertainty of the top 8.**

**S1 opportunity score** = the best final robust/yr among Study 8-feasible vectors (−∞ if none), reported per ETF.

**ETF order** = the constrained order of each ETF's best final vector (feasible first by robust/yr, then infeasible by
violation). It orders the N seeds and the protected list, so both exist even when few ETFs have a feasible vector.
Neither removes an ETF.

**Funnel:** 61 eligible → ≥ 1 plausible vector → ≥ 1 feasible at 16 points → ≥ 1 feasible at the final precision.

**Protected list.** One ETF per repository cluster: its best by the ETF order, excluding VGT, GDX and their direct
proxies. It is guaranteed a place in the exploratory streams.

## 7. S2 — timing, collision, contention (`s2.ts`; one door holding all 61)

1. **Assignments.** Nine per ETF, pool-independent: a book has the same vector in every pool.
   - **α:** the menu's rank-1 of half A;
   - **β:** its rank-1 of half B (an independent design half);
   - **γ1–γ4:** seeded uniform draws (`('assign', j, symbol)`) from its four-vector menu;
   - **δ1–δ2** (not standalone-selected): seeded uniform draws (`('assign','delta',j,symbol)`) from all its plausible
     vectors among the 64;
   - **ε** (not standalone-selected): its lowest-occupancy plausible vector among its 16 best.

   S2's matrices and contention use α and β; S3 uses all nine.
2. **Timelines** under α and β: decisions (time and session), filled entries, holding intervals, standalone replay
   records, daily marks.
3. **Pairwise matrices**, all 1,830 pairs under α and β:
   - Study 2's one-to-one greedy decision match within ±5 sessions, the share of each side's decisions and the
     minimum of the two;
   - the median signed session offset of matched decisions;
   - the share of each side's entries falling inside the other's holding intervals (collision);
   - the daily close-to-close log-return correlation;
   - the correlation of daily standalone D1 mark changes.
4. **Event families** (Study 2's definition):
   - anchor clusters of all 61 ETFs' α decisions, 10-session window, no chaining;
   - **market-wide** = ≥ 10 distinct ETFs;
   - independent events = anchors ≥ 252 sessions apart.

   A lot belongs to a market-wide event when its entry falls between the family's first and last decision session,
   plus 5 sessions for fills after the last decision. The windows are the α families' and are used for every
   assignment's lots: they are calendar facts.

   Per ETF: decisions, families, market-wide share, solo families, independent events (α and β).
5. **Near-duplicates and opportunity sources.**
   - **Edges.** A pair is an edge if its daily return correlation is ≥ 0.95, or its minimum match share is ≥ 0.80
     under **both** α and β with a correlation ≥ 0.80.
   - **Groups.** Complete-linkage groups:
     - edges are taken strongest first (correlation, then the smaller α/β match share);
     - two groups merge only if every pair of the merged group is an edge, all members share one repository cluster,
       and the group has ≤ 3 members;
     - refused merges are recorded with the reason (size, cross-cluster, not complete);
     - the single-linkage components are reported only.
   - **Use.** A group is one opportunity source for budgeting. Primary proposal streams take at most one member per
     group; exploratory streams may combine members.
   - **One exception: kept redundant proxies** (§7.6). A redundant proxy kept on replay evidence may sit beside its own
     anchor in a primary pool. It counts as its own group key, so at most one kept proxy per group.
6. **Anchor proxies.** A direct proxy is a symbol with an edge to the anchor itself (never the whole component).
   - **Forbidden** (in every stream of the family):
     - N: VGT, GDX and their direct proxies;
     - V: GDX's direct proxies;
     - G: VGT's direct proxies.

     This prevents "VGT/GDX in disguise".
   - **Redundant.** The direct proxies of an anchor the family contains (V: VGT's; G: GDX's; VG: both) stay
     candidates only if their replay against the family's anchor adds net under α or β. Otherwise they are excluded
     from the primary list (recorded) and remain possible in the exploratory streams. When kept, they may be pooled
     with their anchor (§7.5).
   - **Labels.** Every proposal lists its proxy members.
7. **Anchor policies.** No native anchor exists for N, so N uses three training-only generic seed anchors instead of
   smuggling in VGT or GDX.

   | Family | Anchor policy |
   |---|---|
   | V | {VGT} |
   | G | {GDX} |
   | VG | {VGT, GDX} |
   | N | three seeds: the top-3 by the ETF order (§6.4), excluding the forbidden N symbols and the anchors' own clusters (us-tech-growth, precious-metals), one per cluster and per group |

   **The seed selection layer.** The N family alone has a best-of-the-universe standalone selection layer; it is
   disclosed in the multiplicity counts.

   For every policy, every candidate and both α and β: the actual one-slot replay of the anchor alone and with the
   candidate added. Measured:
   - Δnet/yr, ΔDD (minute and daily);
   - lots, the candidate's accepted lots and net;
   - the candidate's refused decisions, and anchor decisions refused by it;
   - displaced anchor lots and net, anchor lots that appear only in the combined run;
   - Δinterest, Δcosts, Δheld days, Δoccupancy;
   - the candidate's virtual entries while the anchor's slot is idle, their share and standalone net;
   - the candidate's accepted lots inside market-wide windows.
8. **Candidate lists, ≤ 12 per family:**
   - **Primary:** 9, by mean marginal Δnet/yr over the policy's replays (ties by the ETF order). A candidate needs a
     combined DD < $35k in at least one replay, and at most one member per group is taken. A shortfall is filled with
     the best risk-flagged candidates, labelled. For N: the 3 seeds, plus 6 by marginal score against the seeds.
   - **Exploratory:** 3 (25% of the list), taken from the protected and weak-but-distinct lists, not already chosen
     and not excluded. They are ordered by distinctness from the family's anchor books (1 − mean of the larger α match
     share), ties lower market-wide share. The first pass takes only clusters not yet represented.
9. **Weak but distinct.** No Study 8-feasible S1 vector, ≥ 1 plausible vector, and α distinctness ≥ 0.5 from both
   VGT and GDX. Reported, and eligible for exploration.

No ETF is eliminated because of poor marginal trades against frozen B5, or because of correlation alone.

## 8. S3 — actual shared-slot pool discovery (`s3.ts`)

### 8.1 Strata and budgets (hard, equal across families)

- **Strata:** 16, the four families × sizes 2, 3, 4, 5.
- **Family validity:**
  - V contains VGT and not GDX;
  - G contains GDX and not VGT;
  - VG contains both;
  - N contains neither.

  No family's pools contain its forbidden symbols (§7.6).
- **Budget:** at most **96 proposals per stratum**, 72 primary and 24 exploratory (25%), so at most 1,536 in total.
- **Order:** size 2 → 5 within each family, because beams use size k − 1. The four families run as parallel processes.

**Plan per stratum:**

1. **Exhaustive.** If the family has ≤ 96 valid pools, all are proposed: V2, G2, VG2 ({VGT, GDX}) and VG3, less any
   forbidden symbols. The unused budget is reported and not reallocated, to keep the families' multiplicity
   comparable. Exhaustive strata need no separate exploratory quota.
2. **Exhaustive over the candidate list.** Otherwise, if the pools whose non-anchor members come from the family's S2
   list (one member per group) number ≤ 72, all are proposed. Expected: V3, G3, VG4, N2, ≈ 66 each. Then 24
   exploratory.
3. **Round-robin beam and swaps.** Otherwise:
   - **Beam, 48 children** from the stratum k − 1's 12 best by the screening order:
     - each parent's children are ordered as its best primary-list child, its best exploratory-list child, then the
       rest in list order;
     - children are taken round-robin over the parents (≈ 4 per parent).
   - **Swaps, 24**, round-robin over the 6 best pools so far (≈ 4 per pool). Each pool's swap list replaces its
     lowest-listed non-anchor member first, with each non-member candidate in list order.
   - Children that are invalid, take two members of one group, or are already proposed are rejected. The record counts
     them by reason over **every** parent's and pool's candidate children, reached within the budget or not.
   - **Exploratory, 24:** 12 uniform random valid pools; 12 cluster-diverse random pools, each with at least one
     protected or weak-but-distinct member. Seeded by `('s3','explore',stream,family,size)`; near-duplicates allowed;
     never repeating a proposal.
4. **Null reference.** Every non-exhaustive stratum also screens **48 uniform random valid pools** (seed
   `('s3','null',family,size)`), identically to proposals. They sit outside the budget and are never nominated.
   Exhaustive strata are their own null.

### 8.2 Screening evaluation (every proposal and null pool)

**Per proposal and each of the nine assignments:**

- the centre;
- a 16-point N1 neighbourhood (family `s3-nb16`, per-book common random numbers);
- every §6.2 quantity at pool level;
- per-book lots and net;
- refusals by decider < holder;
- the period attributions of §4.3.

**De-duplication.** Assignments yielding the same configuration are evaluated once and marked duplicate; "best of n"
counts unique configurations.

**At the best assignment's centre**, the pool and each leave-one-out subset are replayed. Per book:

- accepted lots, net and episodes;
- refused decisions and the refusals it caused;
- leave-one-out Δnet/yr, ΔDD and Δinterest;
- incremental lots;
- other books' lots it displaced or added.

**Pool summary:**

- the best assignment by the constrained order;
- the number of feasible unique assignments;
- the best and the median robust/yr.

**Screening order:** the constrained order on the best assignment. Every pool gets the same nine chances, and per
stratum the compute (points, replays, seconds) is recorded.

### 8.3 Mid precision (`s3-nb64`)

**Who:** per stratum, the 12 best plus the **next** 3 exploratory-stream proposals (additional, so 15 when available).

**Measured:** for each, the two best distinct configurations get 64 independent points.

**Order:** on those **64 independent points**, not the pooled 80 with the selection points. The pooled 80 is reported.

### 8.4 High precision (the finalists, the references and the incumbents)

**Who:**

- per stratum, the 6 best by the mid order plus the **next** best exploratory-stream pool (additional);
- the four Study 8 track ETF sets at their best generic configuration, labelled reference: the same-instrument
  baseline;
- every comparator of §2.4 at its frozen vectors.

**Evaluated at the chosen configuration:**

- **The decisive set.** Study 8's instrument per pool: one joint Latin hypercube over all coordinates, seeded by
  (`'s3','hi',rep`, pool), 3 × 128 points pooled and unique. It carries:
  - the share, Wilson bound and band (§2.3), with a band flagged **uncertain** when the Wilson bound is below the
    band's lower edge;
  - median, p10, robust/yr, p90 DD and C1–C7;
  - the four objectives;
  - per-replicate figures.
- **Complementarity** (the pre-registered incremental-improvement test):
  - **I1:** for every book, the pool's decisive robust/yr minus that of its leave-one-out subset, measured on the
    **same** decisive points restricted to the subset, is **≥ $1,000/yr**. That is Study 8's refinement acceptance
    threshold; common perturbations make the difference precise.
  - **I2:** every book's centre leave-one-out Δnet/yr is > 0.
  - **I3 (report-only):** the pool's standing against the same-size reference set and the incumbents.
- **Q7 stresses** at the centre (net > 0 and DD < $35k under each).
- **Report-only Study 8 checks:**
  - Q8, the centre net > 0 and the decisive median net ≥ 60% of it (Study 8's rule);
  - Q2b, for a configuration with a coordinate within r of a bound, an in-box joint design (2 × 128) with share
    ≥ 0.90 and p90 < $35k.
- **Per-book 64-point probes**, one book at a time (report-only).
- **Every subset** (≤ 31 non-empty plus the empty set at zero) at the centre:
  - the leave-one-out Δnet/yr and ΔDD;
  - Shapley-style contributions to net/yr, labelled **conditional on the fixed vectors**: not intrinsic ETF alpha;
  - standalone versus pooled lots.
- **The contention metrics of §8.2.**
- **Concentration:** best year, top lot, M2020 and R2022 shares; the share of net from market-wide windows; the
  largest single event.
- **TD1 and ex-2020.**
- **The funded lot list.**

### 8.5 Multiplicity and false-discovery evidence (reported)

- **Counts:** every proposal, unique configuration, null pool, neighbour and replay, by stratum, stream and family
  (cumulative per family). This includes the beams' inheritance of size k − 1 and the N family's seed layer.
- **PBO and TD2–TD3** per stratum (§4.3).
- **Fidelity shrinkage:** each finalist's robust/yr from the selected 16-point best-of-9, to the independent 64
  points, to the decisive 384 points.
- **Null-reference standing (like for like).**
  - Every null pool's best configuration is also measured on 64 independent points. In exhaustive strata the null is
    all their proposals, measured the same way.
  - Each nominee's independent 64-point robust/yr is reported as a percentile of that 64-point null distribution.
  - Null pools skip the leave-one-out replays.
- **Pre-stated meaning.** A best pool is "the maximum of ≤ 96 × 9 correlated trials in its stratum", not a discovery
  by itself.

### 8.6 Nomination, the exploratory queue and the Phase B batches

**Nomination** (≤ 3 per stratum, so ≤ 48). Who can be nominated: high-evaluated proposals that pass all of:

- **Study 8 feasibility** on the decisive set: violation 0, which includes centre DD < $35k strictly, share ≥ 0.90,
  p90 < $35k and C3–C7;
- **Q7**;
- **complementarity I1 and I2**.

The slots:

- **Slots 1–2:** the top two by decisive robust/yr.
- **Slot 3 (the named exploration slot):** chosen by a **non-profit** criterion. It is the qualified exploratory-stream
  pool with the most distinct clusters, then the higher share, then robust/yr. Otherwise it is the third qualified pool
  by robust/yr.
- **No filling.** A stratum with no qualified pool nominates none. A family with no nomination at any size is declared
  **negative**.

What each nominee carries:

- its band, with the uncertainty flag;
- its four-objective non-dominated status among its stratum's high-evaluated pools;
- its minimum I1 margin;
- its null-reference percentile.

**Study 8 track sets** (VG, VXR, VXRG, VXRKG) are reported as **controls**: never a slot, never a batch member. So VG2,
whose only pool is {VGT, GDX}, has no Phase B candidate by construction.

**Protected exploratory queue** (separate, never nominated): high-evaluated, non-nominated proposals that are at least
as profitable as their stratum's best nomination, come from an exploratory stream, are feasible but not complementary,
or have a violation in (0, 0.25]. Each is listed with every failure reason. This preserves exceptional borderline
pools, such as a centre DD slightly above the ceiling.

**6+ book expansion inventory** (report-only, no replay): per family, the 5-book nominees, with the S2 candidates that
have positive marginal scores and are not yet in them, and the weakest member by Shapley.

**Phase B first batches** (≤ 8 each; predeclared; drawn only from the nominations):

- **Batch A, profit-first:**
  1. the best nomination of each family by decisive robust/yr;
  2. then the remaining nominations by robust/yr, with at most 3 per family;
  3. skipping any pool that differs by ≤ 1 member from one already chosen (symmetric difference ≤ 2).
- **Batch B, diversity-first:** order by the number of distinct clusters, then robust/yr. The first pass prefers a
  pool that adds a new family or a new size. Same caps.
  - **B must differ from A by ≥ 2 pools.** B's lowest-ranked shared members are replaced by nominations outside A
    while any fit the caps; otherwise the remaining identity is stated.

Comparisons with the incumbents use the identical instrument on the identical training door. The incumbents'
optimized-vector advantage and hindsight exposure are stated beside them.

## 9. Compute, caches, determinism, resume

**Estimates** (from the pilot):

| Stage | Estimate |
|---|---|
| S1 | ≈ 100k traces (≈ 10 CPU-min), parallel jobs |
| S2 | ≈ 2,000 replays (minutes) |
| S3 screen | ≈ (1,300 proposals + 576 null pools) × ≤ 9 × 17 replays plus the leave-one-out replays (≈ 0.3M replays, ≈ 0.5–1 CPU-h), four family processes |
| S3 high | ≈ 130 configurations × (384 decisive + I1 subsets + probes) (≈ 1–2 CPU-h), five part processes |

**Caches:**

- `results/cache/` (git-ignored), per stage and part;
- each header binds the door id and the engine code hash;
- a mismatch is refused.

**Retention:** kept until the user's Phase B decision. Deleting it changes no sealed result (every record is
recomputable deterministically).

**Determinism and resume:**

- Every random stream is `deriveSeed('study9-etf-pool-discovery', …labels)`. The labels are listed verbatim in the
  code (`design.ts`, `s1.ts`, `s2.ts`, `s3.ts`, `parity.ts`).
- **S1 jobs** are write-once per ETF; a rerun skips finished ETFs.
- **S3 strata** are write-once per stratum file; a rerun reloads finished strata and the point caches.
- **Mid/high parts and nominate** are write-once; an interrupted part reruns deterministically from its caches.
- A rerun after an interruption is labelled in `AMENDMENTS.md`.

## 10. Engineering and leakage gates (stage `parity`; any failure stops the study)

| Gate | Requirement |
|---|---|
| P1 | replay = authoritative `runNAllocator` (lots, signals, virtual trades, daily rows, both DDs, net; 0 differences) for 10 seeded new-symbol pools (k = 1–5) at 0/5/10 bps, four of them also at 14%, next-open and +25 bps; **six tie-heavy near-duplicate pools at one identical shallow vector** (VGT+XLK, GLD+IAU, IJR+IWM, KBE+KRE, XLU+VPU, IJH+IJR+IWM+IWN+RSP) at base and next-open, which must produce > 0 same-minute multi-book decisions and > 0 refusals in total; plus frozen B5 and Study 8 #2 |
| P2 | Study 9 evaluator = Study 8 evaluator, every record field (periods on their shared keys), on B1, B5, #1, #2, #3, frozen VG and four random B5-subset vectors |
| P3 | every Study 8 sealed F24 training-door centre (candidates and controls of all six tracks: net to the cent, minute and daily DD, lots, episodes), and the sealed 384-point confirmation summaries of #1 and #2 reproduced with Study 8's own design and labels |
| N1 | a door cut at 2019-12-31 reproduces the full run's closed lots, refusals and daily marks before the cut (base, next-open, +25 bps) for B5, #2 and three new pools |
| N2 | synthetic crash bars appended after 2024-12-31 to copies of six projection files leave the door id, prefix hashes and every record unchanged, at base, next-open and +25 bps, including a configuration that holds a lot open on 2024-12-31 (required); read past the cut outside the door they change net or lots (power) |
| C1 | a reloaded persistent cache returns identical records; a foreign header is refused |
| D1 | two fresh evaluations of the same fits are identical |
| G1 | the door refuses an end after 2024-12-31 and the canonical `data/` root |
| E1 | the projection hashes equal the manifest and are byte prefixes of the refreshed files; for all 64 files the prior-length prefix equals the pre-refresh vintage; the five B5 files' Study 8-pinned-length prefixes equal **their own** Study 8 pins |

**Tests:**

- unit tests, `tsc --noEmit` and lint;
- the inherited suite is not run in the main checkout, because it reads post-2024 data (repository memory).

**`verify-chain` checks:**

- the chain;
- the pins;
- every door-log line ends ≤ 2024-12-31 on the projection;
- only `door.ts` and `parity.ts` call the repository loader.

**Final audit.** An independent read-only agent re-derives the main numerical and chronological claims of the
reports from the sealed records and checks the chain before the reports are final.

## 11. Deliverables, reports, stop

### 11.1 Reports

- **The five required reports:**
  - `DATA_AND_UNIVERSE_AUDIT.md`;
  - `STANDALONE_SCREEN.md`;
  - `SIGNAL_OVERLAP_AND_COMPLEMENTARITY.md`;
  - `POOL_MARGINAL_CONTRIBUTION.md`;
  - `PHASE_B_OPTIMIZATION_PROPOSAL.md`.
- **The decision and run records:** `RECOMMENDATION.md`, `README.md`, `RUN_COMMANDS.md`, `DATA_MANIFEST.md`,
  `AMENDMENTS.md`, `RESEARCH_RECOVERY.md`.
- **Tables:** CSV/JSON tables under `results/tables/`, generated by `scripts/build_tables.py` from the sealed records
  (Python standard library). The script is pinned with the code (§3).

### 11.2 Configurations

None is written to `config/`: Phase A nominates pools, not configurations.

### 11.3 Stop

After S3 and the reports, the study stops at the review checkpoint. Phase B (full joint optimization from scratch,
Study 8's unchanged fitness) needs the user's explicit approval. `PHASE_B_OPTIMIZATION_PROPOSAL.md` gives its plan,
costs and decision gates.

## 12. Deviations from the archive audit's design (deliberate, each for the brief)

| Audit design | Study 9 | Reason |
|---|---|---|
| S1 on "incumbent registry vectors and a small predeclared grid" | a fresh 64-vector Sobol design only; incumbents are comparators | brief §1.1/§4: no seeding from optimized phenotypes |
| S0 collapses each overlap group to one representative before S1 | all 61 screened; one member per group only in primary proposal streams; exploratory streams may combine members | brief §1.3: avoid over-pruning; duplicates decided on event/slot evidence |
| Representative "by data quality" | within a group, the family's best marginal scorer (data-quality labels shown) | members of a group are near-identical exposures, so the choice adds little multiplicity; the others stay in exploration |
| S2 reuses doors capped at 2023-12-29 | Study 9's own door to 2024-12-31 | brief §1.4 |
| "Neither" without an anchor | three predeclared training-only seed anchors | brief §5 |
| S4 (≤ 48 pools) as a separate stage | folded into S3's nomination table, with high-precision training checks | brief §6 |
| Neighbourhood seeds: one joint LHS stream | per-book LHS streams (identical joint LHS distribution) | common random numbers across pools; trace reuse |

## 13. Independent methodology review (before the freeze) and its resolution

A fresh read-only agent reviewed the draft and the code. Its report is `reviews/METHODOLOGY_REVIEW.md`, verbatim,
sealed in the `protocol` phase. It found **one critical, ten major and nineteen minor** issues, and confirmed the data
door, leakage protections, hash keys and fitness reuse. Every finding is resolved below, in code and in this text,
before the freeze.

| Finding | Resolution |
|---|---|
| C1 chained groups; proxies excluded on correlation alone | complete-linkage groups within one cluster, ≤ 3 members, refused merges recorded, components reported only; direct proxies only; a redundant proxy is excluded only when its replay adds no net under α and β (§7.5–7.6, §7.8) |
| M1 depth-first beam/swaps | round-robin beam (an exploratory child reserved per parent) and round-robin swaps; skip counts by reason (§8.1) |
| M2 no incremental-improvement criterion | complementarity I1/I2 gate nomination; track sets are controls; negative families declared; B ≥ 2 pools different from A; a 48-pool null reference per stratum with independent 64-point comparison (§8.4–8.6) |
| M3 family contamination by proxies | forbidden symbols per family in every stream; proxy labels on every proposal; N seeds exclude the anchors' clusters (§7.6–7.7, §8.1) |
| M4 decisive offsets shared across pools | the decisive and in-box sets use Study 8's joint LHS per pool (§6.3, §8.4) |
| M5 standalone-selected assignments only | δ1, δ2 and ε added (nine assignments); the exploration slot is chosen by cluster diversity, not profit (§7.1, §8.6) |
| M6 dependent time diagnostics | TD3, an expanding-fold walk-forward, plus ex-2020; per-fold, per-year and half-year neighbourhood attributions stored (§4.3) |
| M7 PBO on another statistic | PBO on neighbourhood robust half-year blocks over unique configurations; the centre PBO labelled; lower bound in adaptive strata (§4.3) |
| M8 contention metrics only at high precision | leave-one-out replays and per-book contention metrics for every proposal's best configuration (§8.2) |
| M9 chain and pin gaps | `seal` is limited to `report-*` phases; stages require a sealed `parity.json` with `passed: true`; pre-freeze amendment IDs cannot acknowledge code; scripts and `package.json` are pinned; budgets, rules and families are in the rulebook (§3) |
| M10 parity power on ties and the boundary | tie-heavy P1 pools requiring same-minute decisions and refusals; N2 under next-open and +25 bps with a required open lot at the cut (§10) |
| m1 S1 order | one constrained order over all 64 at final precision (§6.3) |
| m2 mid order on the pooled 80 | ordered on the independent 64; shrinkage from the 64 (§8.3, §8.5) |
| m3 duplicate assignments | evaluated once, marked, counted as unique (§8.2) |
| m4 near-identical batch rule | symmetric difference ≤ 2 (§8.6) |
| m5 centre re-measurement | Q8 and Q2b report-only at high precision (§8.4) |
| m6 ranking label | "profit-role order" with four-objective non-dominance reported (§6.3, §8.6) |
| m7 undocumented window extension | documented (+5 sessions; α windows for all assignments) (§7.4) |
| m8 unannualized EARLY/LATE | annualized (§4.3) |
| m9 incomplete multiplicity accounting | per-stratum compute and per-family cumulative trials; seed layer disclosed (§8.5) |
| m10 smoke-test disclosure | AMENDMENTS A0 lists exactly what was printed and the door openings |
| m11 S0 read post-2024 data | disclosed in `DATA_AND_UNIVERSE_AUDIT.md` (integrity only, no strategy) |
| m12 pre-freeze commands ungated | `s0-audit`, `s0-project` and `pilot` refuse after the freeze |
| m13 weak E1 pin check | per-symbol pins; all 64 prior-vintage prefixes checked; §14.4 reworded (§10) |
| m14 protected list could pick VGT/GDX | anchors and their direct proxies excluded (§6.4) |
| m15 conventions and stale text | `verify-chain` checks the door log and the loader callers; comments corrected |
| m16 partial items | per-book episodes recorded; skipped children with reasons; the `config/market-events` divergence recorded by hash and diffstat only (S0 report) |
| m17 point-estimate bands | the uncertainty flag (§2.3, §8.4) |
| m18 stale checkpoint | refreshed before the freeze |
| m19 ambiguous exploratory picks | additional, so 15 mid and 7 high per stratum when available (§8.3–8.4) |

**Verification pass** (`reviews/METHODOLOGY_REVIEW_VERIFICATION.md`, sealed in the `protocol` phase). The same
reviewer confirmed every resolution except C1, which was partial: a kept proxy in its anchor's group was still barred
from primary pools (N1). It found eight further minor issues. All are resolved:

| Finding | Resolution |
|---|---|
| N1 kept proxy blocked by its anchor's group | a kept redundant proxy is its own group key, so it can sit beside its anchor (at most one per group); unit-tested (§7.5–7.6) |
| N2 mixed-precision S1 order | iterative re-measurement of 16-point vectors reaching first place or a menu slot (≤ 16) (§6.3) |
| N3 untested nomination paths | the nomination, slot, queue, batch and null-standing logic is a pure function, unit-tested on synthetic records; complete linkage and the group rule are unit-tested |
| N4 Q8 with centre net ≤ 0 | Q8 requires centre net > 0 (§8.4) |
| N5 skip-count semantics | recorded as rejected candidate children over all parents and pools (§8.1) |
| N6 TD3 at the best assignment | the α variant is labelled the clean TD3 (§4.3) |
| N7 stale text | test count, the table builder's pinning, direct parity checks in every stage, code comments, and ex-2020 annualized from sessions are all corrected |
| N8 door-log check only in `verify-chain` | in every stage (`requireIntegrity`) (§3) |
| N9 null percentile mixed precisions | like-for-like 64-point null; null pools skip the leave-one-out (§8.5) |

## 14. Known limitations (stated in advance)

1. **Generic vectors understate optimized pools.** Phase A ranks pools by what generic vectors earn in them; joint
   optimization may change the order. The incumbents' optimized results are not like-for-like with Phase A's generic
   figures.
2. **Correlated histories.** The 61 ETFs share one market history and a few dominant events (2020, Q4 2018, 2022).
   Repeated seeds are not repeated histories.
3. **No time-test of the selection.** The training-only time diagnostics come from one history and cannot validate
   the selection.
4. **Data vintages.** The Phase A data are the refreshed vintage. Every file's prior-length prefix is byte-identical to
   the pre-refresh vintage, and the five B5 files' training bytes to Study 8's pins, so the refresh affects no
   training figure (gates P3 and E1). For the other 59 files, earlier studies' vintages are not re-checked here
   beyond the pre-refresh snapshot.
5. **Sparse ETFs** trade only at minutes with bars. Their fills assume the engine's conventions, not live liquidity.
