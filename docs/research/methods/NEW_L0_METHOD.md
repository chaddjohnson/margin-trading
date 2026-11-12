# Reference method NL0 — the optimization that produced "New L0 primary: VGT + GDX"

- **Method id / version:** `NL0` **1.0.0** — **effective** 2026-11-12 — **status:** current.
- **Registry:** [`methods.versions.json`](methods.versions.json) (version → sha256 of this file). A study that reproduces
  this method pins the version and sha256 in its protocol and adoption manifest (standard 2.1.0 §4.8). This file
  changes only with a new version, a change-log entry (§11) and a new registry row; earlier versions are read from git.
- **Written by:** the trading-session hold study (`research/vg-l0-session-hold/`, brief §Phase 2), **before** its search
  and before any engine change, from the original executable code and sealed records of Priority 5B.
- **Evidence labels used throughout:**
  - **[V] Verified** — read directly from the executed code at the run's commit or from sealed execution records (paths
    and sha256 given), or reproduced by a recorded rerun.
  - **[R] Reconstructed** — reasonably inferred from the records but not directly verified.
  - **[N] New requirement** — a decision for future studies that reproduce this method; it is not a claim about what
    the original study did.

This document records what was **executed**. Where the frozen protocol said one thing and the run did another (for
example the expected refinement share), both are stated.

## 1. The result and the run that produced it

### 1.1 The candidate [V]

| Item | Value |
|---|---|
| Name | **New L0 primary** (Strategy Lab catalog id `l0-primary`, `apps/strategy-lab/catalog/pooled-candidates.json`) |
| Origin | Priority 5B, `research/vg-lifecycle-matched-optimization/`, label **`C24/L0/informed/R1#1 profit`** |
| Identities | 5B cfg `67cfdd9b62d1e16f`; Priority 3 quad `a2e385640ca61012` |
| Frozen record | 5B `FROZEN_SELECTION.json` (sha256 `cd223a0d18c44925af7102b98efae1e369899664b8fb07ee2f8a579816255793`) `arms.L0.primary` = `crossTestSubjects[R01]`; roles held: final actual-profit, informed actual-profit, final best V |
| Structure | **V**: D1·GDX + D1·VGT + Growth·VGT enabled; **Growth·GDX OFF** (placeholder `1af5b55987a56e2f`, never run or funded) |
| Lifecycle | **L0** (a refused Growth entry becomes an unfunded virtual position and waits for its virtual exit; funding never feeds back) |

**D1 books** (registry grid; X, Y, stop, buffer, P in tenths of a percentage point; hold in **calendar days**; L and W in
sessions):

| Book | X | Y | stop | hold | L | buffer | P | W |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| D1·VGT | 237 | 9 | 73 | **15** | 72 | 42 | 103 | 41 |
| D1·GDX | 277 | 1 | 61 | **13** | 232 | 25 | 152 | 10 |

Both D1 books: deep entry, post-exit continuation ON, net-profit stop policy (`multi-etf-allocator/phenotypes.ts`).

**Growth·VGT** `6b5f909b30cfa516` (Growth 1.4.0, 1d signal bars, warm-up 0): Rise from recent low (advance 5.6%,
lookback 84 bars); trend filter OFF; eligibility ON, `time_limited`, 20 sessions; Drawdown Recovery Gate ON (dip
lookback 64 sessions, dip 11.9%, recovery 46.2%, confirmation 5 sessions); trailing stop 5.7%; **maximum hold ON, 22
calendar days**; intraday loss buffer OFF; initial stop ON (ATR 16 sessions × 1.2); retention OFF; continuation ON,
`classic_d1` (window 67 sessions, pullback 11.5%, rebound 3.01%); 5 bps per side.

**Pool conventions** (Priority 3's engine, unchanged in 5B): one exclusive funded $100,000 slot; a decision is funded only
at its own instant iff nothing is open or reserved; a grant reserves the slot until its fill; a retained Growth
remainder keeps the slot until its final exit; no compounding, preemption, forced replacement or simultaneous funded
positions; same-instant order D1 first, then GDX before VGT; 5 bps per executed side inside the fill prices, $0
commission; 11% simple annual interest on outstanding principal by calendar day (365-day year); stops at the stop or the
gapped open with no extra slippage; fractional shares; harmonized D1 arming from 2016-01-04 (each D1 machine arms once
its reference high exists); D1's canonical shadow lifecycle (a D1 refusal never feeds back).

**Figures** [V] (sealed in 5B; development reproduced again on 2026-11-12, §1.3):

| Window | Marked net | Max minute DD | Other |
|---|---:|---:|---|
| Development 2016-01-04 → 2024-12-31 (D24) | $382,721.46 | $19,459.83 | 34 lots; selection robust $227,908.52, p90 DD $30,510.02; confirmation median $250,450.64, p10 $209,723.47, p90 DD $30,182.14, 2.34% of 384 draws > $35,000, worst $48,300.25 |
| Validation 2025-01-02 → 2026-10-30 (examined history) | $96,883.72 | reset $20,385.99 | V1–V3 pass |
| Full 2016-01-04 → 2026-10-30 | $479,605.18 | $20,385.99 | 46 lots (1 open), realized $485,169.93, unrealized −$5,564.76; ledger signature `7b17578108747911` |

### 1.2 Lineage of the phenotype [V]

The run that produced New L0 is Priority 5B, but most of its quality was inherited from an informed seed:

| Step | Study | What it contributed |
|---|---|---|
| VG #2 Balanced D1 pair | Study 8 `S8-VG-F24-3` | the D1 architecture and the starting D1 vectors |
| Growth #4 `420cd989e4fa7749` | browser (2016–2026 in view) | the VGT Growth book of C4 |
| C4, C4-refined | Priority 3B informed-fixed lane | C4-refined `0f017f0ab9b26f24` |
| **`informed-joint#1 profit`** `940fdaf770eedc9d` ("IJ1") | **Priority 3B informed-joint lane** (88 seeds; 21,208 base proposals; 3B's whole study 602,111 proposals / 5.83 M evaluations) | 3B's formal primary, $382,163.79 / $19,459.83 on development |
| **New L0** `67cfdd9b62d1e16f` | **Priority 5B informed lane, L0 arm, replicate R1** | an NSGA-II island child that differs from IJ1 in 7 genes: D1·GDX P 157 → 152, W 12 → 10; D1·VGT X 238 → 237, stop 74 → 73, W 52 → 41; Growth·VGT recovery confirmation 4 → 5 sessions, classic rebound 2.6% → 3.01%. Development **+$557.67** over IJ1, same DD |

- New L0 is **not** one of the 481 seed designs of its lane: the designs were regenerated with 5B's code (seed key
  `C24/informed/R1`) and do not contain it [V]. It was proposed by one of the lane's four NSGA-II islands [V]; which
  island and generation is **not recoverable** without replaying the lane [R: the archive keeps no proposal order per
  lane].
- It was the lane's highest feasible rung-3 centre, so it became the lane's **profit refinement start**; the one
  refinement pass found no move raising the centre net by ≥ $2,000, so the endpoint is the start [V].
- Replicate R2 of the same lane stopped at IJ1 itself ($382,163.79) [V]. The two informed replicates therefore differ by
  $557.67, inside every measure of search variability 5B reported.
- The final L0 selectable set (38 members, 35 qualified) ranked New L0 first by centre net; IJ1 second and third (it was
  shortlisted in both replicates); C4-refined sixth ($360,569.71) [V].

### 1.3 Reproduction on 2026-11-12 [V]

`tools/vg-l0-session-hold/recover-original.ts` (record `research/vg-l0-session-hold/recovery/original-recovery.json`)
re-ran New L0 through the unchanged engine (Priority 3's `evaluate` = 5B's L0 path) on Priority 3's D24 byte-prefix door
at commit `a1a9675d`, before any engine change:
- the centre equals 5B's sealed C24 evidence in **all 33 record fields** (net, DD and its times, lots, books, years,
  ledger signature, …);
- 5B's own confirmation family (3 × 128, labels `('confirm', rep, 'C24')`, 5B's seed namespace) gives p10 $209,723.47,
  median $250,450.64, p90 DD $30,182.14, 384 unique draws; its selection family (2 × 128) robust $227,908.52 and p90 DD
  $30,510.02 — **identical to the cent** to the sealed values.
- FULL (2025–2026) was not opened by this reproduction. Priority 6's parity record
  (`docs/strategy-lab/reports/2026-11-11-pooled-candidates/parity.json`) reproduced the full-history figures to the cent
  on 2026-11-11.

## 2. Authority of the original run [V]

| File | sha256 |
|---|---|
| `research/vg-lifecycle-matched-optimization/PROTOCOL.md` (frozen 2026-11-11T10:30:57Z at `b8a5a058`) | `7e8260647c9ec4406609f41863fe81c4106206abcf4b0027229aaaec1af0e993` |
| `…/AMENDMENTS.md` (R1, R2 before the freeze; A1 after) | `ddccdb3d8ada792e5beec89a29bdf60e90948cb0f4898adedba8e55da6b5cb9d` |
| `…/FROZEN_SELECTION.json` | `cd223a0d18c44925af7102b98efae1e369899664b8fb07ee2f8a579816255793` |
| `…/results/folds/sequential.json` | `7bf8c74463461b963b2b98442978fcec53f994ff4ce8a8a52cd93ef0a932da30` |
| `…/results/validation/validation.json` | `8393113915ee91f98e66f3005a84b82cc78686bde9416759ae61a82846cc7afd` |
| `…/chains/chain1.sh` (the executed stage order) | `3351665dff75e54bea53cf001db0e821d88b47166ac0fa2f6c982e6178fbf697` |
| Search and selection records (`results/search/*/*.json`, `results/folds/*/selection.json`) | pinned in `research/vg-l0-session-hold/recovery/original-recovery.json` against 5B's `results/seals.jsonl` |

Code: `src/vg-lifecycle-matched-optimization/` (search `search.ts`, orchestration `stages.ts`, budgets `budgets.ts`, space
`config.ts`, statistics `fitness.ts`, qualification `qualify.ts`, selection and folds `folds.ts`), reusing Priority 3's
engine (`src/vg-d1-growth-joint/`: `books.ts`, `pool.ts`, `evaluate.ts`, `space.ts`, `fitness.ts`), Priority 3B's
pipeline design (`src/vg-d1-growth-expanded/`), the NSGA-II operators (`src/optimizer/nsga2.ts`), Sobol
(`src/optimizer/sobol.ts`), the Latin offsets (`src/study5-gdx-b5-three-etf/grid.ts`) and Growth's perturbation
(`src/growth140-vgt-stable/space.ts`). The standard pinned was 2.0.0.

## 3. The executed procedure [V]

5B optimized the same portfolio under three Growth funding lifecycles (L0, L1, L2) with identical spaces, budgets and
seeds. **New L0 came from the L0 arm**; the L1 and L2 arms optimized different funding rules and contributed no proposal,
evaluation or selection to it (§6). Everything below is the L0 arm's procedure; lifecycle-only parts are marked.

### 3.1 Stage order (as executed by `chains/chain1.sh`, fail-fast)

1. For C19, then C21, then C23: independent search (all arms in one job) → qualification → **commit** of the fold
   selection → cross-test on the training door → fold evaluation on the next slice → commit.
2. The sequential paths (one per arm) → commit.
3. C24 independent search → C24 informed search → C24 qualification → commit.
4. C24 cross-test → diagnostics → commit.
5. `freeze-selection` (sealed `FROZEN_SELECTION.json`) → commit → **validation on FULL, once**.

Before step 1: stage V engineering gates (sealed), bench, pilot with interruption tests, the sealed control manifest and
the protocol freeze, committed. Guard in code: an earlier cutoff never runs after a later cutoff's selection exists.

### 3.2 Space and identity (`config.ts`; 3B's, unchanged)

- Genome: inclusion (V/G/B) + Priority 3's 17 categorical + 116 ordinal genes. D1 8 genes per book on Study 8's common box
  (X 8.0–30.0%, Y 0.1–5.0%, stop 3.0–15.0%, **hold 3–30**, L 20–250, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200); Growth 1.4.0:
  8 structural + 50 conditional numeric genes per book on growth140's boxes (**Growth maximum hold 3–30, step 1**).
- Grids: coarse for the independent screens and islands; fine (0.1 percentage point, 1 session) for the informed lane,
  refinement and every neighbourhood. Every control and seed is exactly representable on the fine grid.
- Identity: cfgId = sha256(16) of the inclusion and Priority 3's canonical quad; a disabled Growth book is the
  placeholder; `first` = D1; inactive genes never create a second configuration; duplicates are never evaluated twice in
  a job. Behavioural equivalence = the funded-lot ledger signature (one configuration per ledger in promotions and
  shortlists).
- Cells (independent lanes): V, G, B, the inclusion pinned. Screen strata per enabled Growth book (6 options: Rise ×
  gate × eligibility, breakout × gate), round-robin over 6 (V, G) or 36 (B) strata.

### 3.3 Independent lanes (every cutoff; per arm 2 replicates × 3 cells)

| Step | Executed rule |
|---|---|
| Screen | Latin supercube of scrambled Sobol blocks over the whole genome (seed `deriveSeed(STUDY, 'screen', seedKey)`), structure pinned, strata round-robin; V and G 512, B 1,024 proposals |
| Plausibility | centre net > 0, centre DD ≤ $35,000, both families funded |
| Screen promotion (V, G 64; B 128) | ¼ centre net among the plausible; ¼ constrained rank on (−net, DD); ⅛ (B) plausible pools funding both Growth books; ⅛ per entry pattern (round-robin); the rest max-min L∞ diversity; one per ledger in the first four |
| Rung 1 | 16 neighbours, **centre-first** (an implausible centre gets none and the unmeasured penalty) |
| Islands | NSGA-II on (−centre net, −robust net, p90 DD), population 32, 256 new distinct proposals per island; binary crowded tournaments; categorical uniform crossover p 0.9 and reset 1/free categorical genes; ordinal SBX η 15 p 0.9 and polynomial mutation η 20 at 1/active ordinal genes on grid indices; (μ+λ) survivors; every child fitted at rung 1; start populations = the rung-1 archive split by rank (k → island k mod islands); stagnation = 8 generations without a 1e-3 relative gain of the island hypervolume of (−robust, p90) against (0, $35,000) or of the lane's best feasible centre net; ≤ 200 generations. V and G 2 base islands, B 4 (every fourth B island requires a configuration funding D1 and both Growth books) |
| Extension | after the last base island and each extension island: a trigger fires iff that island raised the lane's union hypervolume, best feasible rung-1 robust net or best feasible rung-1 centre net by > 5%, or produced a new feasible funded-component pattern. **A position (cutoff, lane type, replicate, cell) extends in all three arms iff any arm's lane fired** (synchronization is a lifecycle-matching device), up to 6 islands (V, G) / 12 (B), subject to the **resource guard**: requested so far + the round's worst case (256 × 17 per extending lane) + 8,000 per lane ≤ the job cap (415,000) |
| Rung 2 | 12 (V, G) / 16 (B) promoted × 64 neighbours: ¼ centre net (feasible), ¼ robust net, ⅛ both-Growth (B), ⅛ entry pattern, the rest constrained rank; one per ledger; L∞ ≥ 0.02 |
| Rung 3 | 6 / 6 / 8 promoted × 128, the same shares, L∞ ≥ 0.03 |
| Refinement | starts: **robust** (banded best feasible rung-3; band 5% of robust net, then lower p90), **profit** (highest feasible rung-3 centre net), and in B **both-Growth**; without a feasible rung-3 fit the least violation. Moves: every active numeric input of the enabled books ±R/2 and ±R and every enabled optional Growth rule OFF (inclusion fixed); robust start accepts the banded best feasible move raising robust net ≥ $2,000; profit start the feasible move with the highest centre net raising it ≥ $2,000 (neighbours measured only for moves whose centre could be chosen); **one pass** per start (amendment R1); endpoints refitted at rung 3 (128) |
| Shortlist | V 3, G 3, B 4: profit, robust, balanced (robust ÷ p90), both-Growth (protected), entry alternative, gate alternative, then centre-net order; feasible, one per ledger, L∞ ≥ 0.10 |

Seed keys: `<cutoff>/indep/R<r>/<cell>` (never the lifecycle), so the three arms shared screens, GA streams and
neighbourhood draws (paired seeds).

### 3.4 Informed lane (C24 only; per arm 2 replicates) — **the lane that produced New L0**

| Step | Executed rule |
|---|---|
| Seeds (9, identical in every arm) | C4 (**focus**), C4-refined (**focus**), C85, E (G), A (B), 3B `informed-joint#1` (V, IJ1), 3B `informed-joint#3` (B), 3B `indep/G_GDX-breakout#1` (G), Priority 3's IP (B); each with its own D1 vectors |
| Designs | each seed + 12 near (scale 1.5) + 12 broad (scale 3) neighbourhood designs; each focus seed + 64 (scale 0.5) + 64 (scale 1.0); duplicates dropped → **481 designs per replicate** |
| Rung 1 | 16 neighbours, centre-first |
| Islands | 4 base × 384 new proposals (population 32), **every free gene free including the inclusion**; island 3 protected (both Growth funded); extension up to 8 islands under the same triggers and guard (reserve 30,000 per lane; cap 370,000). **No trigger fired: no extension** |
| Rungs | rung 2 16 × 64, rung 3 8 × 128 (shares as §3.3) |
| Refinement | robust, profit and both-Growth starts (one pass each) + **focus-profit and focus-robust starts at C4 and at C4-refined (two passes each)**; inclusion moves allowed (B → V/G; V/G → B with #4, 08500a60 or Appendix A as partner) |
| Shortlist | 6 per replicate: profit, robust, balanced, both-Growth, best V / G / B, entry and gate alternatives, then centre-net order |

### 3.5 Robustness instrument, qualification and selection

- **Neighbourhoods** (`config.ts neighbourhood`): radius D1 = Study 8's N1 in grid units (X ±10, Y ±2, stop ±10, hold ±2,
  L ±10, buffer ±10, P ±10, W ±20) per book; Growth = 10% of each box in value units rounded to the fine step. One Latin
  hypercube of u ∈ [−1, 1] over 116 columns per family (`deriveSeed(STUDY, 'nbhd', …labels)`), common random numbers
  across centres and arms; clip to the box widened to include the centre; categorical inputs and structure fixed;
  inactive inputs untouched; duplicates dropped.
- **Families:** rung 1 / refinement 16, rung 2 64, rung 3 128, **selection 2 × 128** (ranking), **confirmation 3 × 128 =
  384** (qualification only), small 0.5 and wide 1.5 (report-only, export rows).
- **Statistics:** median, p10, p90 net; robust = ½ median + ½ p10; p90 DD (linear interpolation); breach share with
  Wilson interval, mean excess, worst DD, worst-10% mean (report-only).
- **Gates Q1–Q6** (all must hold): centre net > 0; centre DD ≤ $35,000; confirmation p90 DD ≤ $35,000; confirmation p10
  > 0; at 10 bps per side centre net > 0 and DD ≤ $35,000; D1 and Growth both funded at the centre. No activity,
  annual-profit, concentration or tail gate. Report-only stresses: 20 bps, 14% interest, +25 bps stop slippage,
  next-open stops; causal removals (each family, symbol and enabled component).
- **Roles** (selection families): actual-profit = highest centre net (ties: selection robust, lower centre DD, label);
  robust-profit = highest selection robust; balanced = highest selection robust ÷ selection p90 DD; lower-drawdown =
  lowest selection p90 DD with robust ≥ 50% of the actual-profit holder's.
- **The primary (per arm, AD1):** the **actual-profit role of the final selectable set** = the arm's independent and
  informed shortlists + the controls C4, C4-refined, C85, E, A, B under the arm's lifecycle (the qualifying-incumbent
  fallback). D (VG #2's D1 books alone) is a comparator. Fold primaries (C19–C23) = the independent set's actual-profit
  role.
- **Pareto set** on centre net, centre DD, selection p10, selection p90 DD (reported).

### 3.6 Chronology, validation and reporting

- **Doors:** Priority 3's byte-prefix doors D19, D21, D23, D24 (size, sha256, last row verified before parsing); FULL only
  after `FROZEN_SELECTION.json` was sealed and committed (stricter than the standard: not even known targets earlier).
- **Folds:** C19 → slice 2020–2021 (D21), C21 → 2022–2023 (D23), C23 → 2024 (D24); each fold selection committed before
  its slice opened; the sequential path chains the fold primaries (continuous runs, 5 bps on $100,000 per switched open
  lot); verdict *supported* iff every fold produced a primary, sequential net > 0 and sequential minute DD ≤ $35,000.
- **L0 arm's path:** C19 `R2/B#1` +$9,083.51 (slice DD $39,527.29); C21 `R1/V#1` −$38,341.52 ($57,259.44); C23 `R2/G#1`
  $0.00 (no trade); sequential **−$29,358.01, DD $67,214.22 — chronologically unsupported**. The informed lane (which
  produced New L0) had **no chronological test** (5B departure AD9).
- **Validation:** every cross-test subject on FULL once; V1 validation P&L > 0, V2 reset validation DD ≤ $35,000, V3
  whole-run DD ≤ $35,000; previously examined history.
- 5B-only (lifecycle) instruments: the frozen evidence labels L1/L2 versus L0, the phenotype × lifecycle cross-test
  matrix with its decomposition, the lifecycle diagnostics.

### 3.7 Seeds and reproducibility

- Every seed is `deriveSeed('vg-lifecycle-matched-optimization', …labels)`; labels never include the lifecycle.
- Every evaluation is archived as it returns (per-job SQLite archive bound to the study, job, door pin and evaluation
  digest); a rerun of the same command replays the job exactly (archive hits); extension decisions are taken at
  barriers (all lanes idle), so they are deterministic; interruption pilots (SIGTERM, worker SIGKILL, unit SIGKILL)
  reproduced identical lane results.
- Evaluation digest after amendment A1: `3f902532b651da1939f67d650d381bcf1e27ad3b76b3f2dedef95403fba23e3b` (the search
  archives' `codeDigest`). Resources: 14 child-process workers, `vglmo.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0).

## 4. The executed budget [V]

Units: **distinct proposals** = screen + seed designs + island children + fillers (refinement moves apart);
**requested** = every evaluation a lane asked for (centres and neighbours; archive hits included); **unique fresh** =
simulations computed per job (all three arms).

### 4.1 The L0 arm (the effective budget that produced New L0)

| Lane | Distinct proposals (configured base / max) | Executed proposals | Islands run | Refinement starts / moves | Requested evaluations | Stop |
|---|---:|---:|---:|---:|---:|---|
| C19 independent (6 lanes) | 8,192 / 16,384 | 9,472 | 21 | 14 / 1,916 | 101,600 | resource guard after round 1 (4 lanes); triggers not met (2) |
| C21 independent | 8,192 / 16,384 | 9,728 | 22 | 14 / 2,077 | 100,913 | resource guard after round 1 (5); triggers not met (1) |
| C23 independent | 8,192 / 16,384 | 12,288 | 32 | 14 / 2,114 | 92,774 | triggers not met |
| C24 independent | 8,192 / 16,384 | 13,824 | 38 | 14 / 1,982 | 103,378 | triggers not met (2); extension cap reached (4: budget-bound) |
| C24 informed (2 lanes) | ≤ 4,034 / ≤ 7,106 | 4,034 (962 designs + 3,072 island) | 8 | 14 / 3,048 | 91,030 | triggers not met (no extension) |
| **Search total** | | **49,346** | **121** | **70 / 11,137** | **489,695** | |
| Qualification (members) | | C19–C23 20 each; C24 39 | | | 13,044 × 3 + 25,422 = **64,554** | |

The L0 arm's informed lane alone — the lane that produced New L0 — had 4,034 proposals, 3,048 refinement moves and
91,030 requested evaluations; the R1 replicate that found it, 2,017 proposals and 45,431 evaluations.

### 4.2 The whole 5B study (three arms, context)

| Job | Executed proposals (3 arms) | Unique fresh simulations | Archive hits | Wall | Cap |
|---|---:|---:|---:|---:|---:|
| C19 independent | 28,416 | 317,159 | 2,725 | 43.3 min | 415,000 |
| C21 independent | 29,184 | 310,693 | 2,679 | 62.3 min | 415,000 |
| C23 independent | 36,864 | 287,041 | 2,808 | 68.2 min | 415,000 |
| C24 independent | 41,472 | 313,892 | 2,716 | 82.5 min | 415,000 |
| C24 informed | 12,102 | 235,609 | 36,401 | 79.2 min | 370,000 |
| Qualifications C19, C21, C23, C24 | 60, 60, 60, 117 members | 39,132 × 3 + 72,351 | — | — | 75,000 / 110,000 |

Pool jobs 1,679,368 unique fresh simulations; with in-process, engineering and the discarded A1 run ≈ 1.99 M of the
brief's 3,000,000 ceiling. Configured base across arms 110,406 proposals; executed 148,038.

### 4.3 Allocation among stages (fresh simulations by tag, whole jobs) [V]

| Job | Screen | Rung 1 (designs, promoted screen, islands) | Rung 2 | Rung 3 | Refinement |
|---|---:|---:|---:|---:|---:|
| C19 independent | 3.9% | 70.5% | 4.8% | 6.2% | 14.6% |
| C21 independent | 4.0% | 68.3% | 4.9% | 6.7% | 16.2% |
| C23 independent | 4.3% | 65.8% | 5.4% | 7.2% | 17.4% |
| C24 independent | 3.9% | 68.7% | 4.9% | 6.6% | 15.9% |
| C24 informed | — | 75.4% | 2.4% | 3.5% | 18.6% |

**Configured versus executed.** The frozen protocol (§7.3) expected refinement neighbourhoods to be "≈ 2/3 of a lane's
evaluations" — a pilot measurement taken with two refinement passes. Amendment R1 then cut refinement to one pass (two at
the focus starts); the executed refinement share was **15–19%**, and rung-1 fitting of island children and designs took
**66–75%**. The stage allocation to preserve is the executed one, produced by the per-cell schedules above.

## 5. Reconstructed points [R]

- **Which island produced New L0.** One of the four NSGA-II islands of `C24/L0/informed/R1` (not a design); the island
  index and generation are not in the sealed records.
- **Why it was found.** It sits 7 genes from the IJ1 seed (D1 continuation windows and small X/stop steps, two Growth
  gate/continuation fine steps), inside the region the near and broad designs and the islands explore around IJ1. The
  island most likely descended from IJ1's designs; this is inferred from the distance, not traced.
- **Effectiveness.** The informed lane re-found 3B's formal primary (R2) and nudged it by +$557.67 (R1). The large
  development profit of New L0 is therefore mostly the product of 3B's informed-joint lane, carried in as a seed; 5B's
  contribution was a small local improvement plus the qualification, selection and validation evidence.
- **Effect of the cross-arm synchronization on the L0 arm's extensions.** Some L0 extension islands ran because an L1 or
  L2 lane at the same position fired (5B `search.md` round table). The L0 arm's executed counts above include them; a
  single-arm reproduction with lane-local triggers would not get them automatically.

## 6. Lessons supported by the evidence [V unless marked]

1. **The primary came from incumbent-informed search, not independent discovery.** At C24 the L0 independent lanes'
   best was $199,115.31 (a G pool); their best V pool $181,497.86 — less than half of New L0. In 3B, with 16× the
   independent base per cutoff (131,072 against 8,192 per arm), the independent primary reached $306,507.59 (a B pool),
   still below the informed primary ($382,163.79): more independent effort helped, but did not reach the informed
   region.
2. **The procedure that selects from independent lanes was chronologically unsupported under L0** (−$29,358.01, DD
   $67,214.22); the informed lane has no chronological test by construction. Local neighbourhood stability (confirmation
   p90 DD $30,182.14) is not chronological reliability.
3. **Refinement added nothing at the winning start** (no ≥ $2,000 move from New L0); the winning gains came from the
   islands around informed designs.
4. **Search variability was small in the informed lane** ($557.67 between replicates) and large in the independent
   lanes (L0 replicate bests $197,388.32 / $199,115.31 at C24, and far larger in other arms).
5. **The resource guard bound early** at C19 and C21 (after one extension round); its frozen finishing reserve (144,000
   per job) was conservative — the finishing phases used ≈ 81,000 (5B report §7).
6. **One episode dominates** the neighbourhoods (the 2020 rebound is the leading winning episode of most principal
   neighbourhoods; 44–100% of selection neighbours share the centre's leading episode).
7. **Validation on examined history** passed (+$96,883.72) but trailed C4 (+$99,081.34); the incumbent C4 led every
   searched primary in 2025–2026.

## 7. Requirements for reproducing this method [N]

A study that declares it reproduces NL0 1.0.0:

1. **Pins** this file's version and sha256 (registry) in its protocol and `STANDARD_ADOPTION.json` (`referenceMethod`),
   and maps each original stage (§3) to its own, stating every adaptation and omission.
2. **Keeps** the engine and conventions of §1.1 (Priority 3's pool, the L0 lifecycle, the economics, harmonized arming,
   the fixed same-instant order, one slot), the space, grids, boxes and identities of §3.2, and the doors and windows of
   §3.6, unless the study's question is precisely one of them (then that one item changes, explicitly, §8).
3. **Keeps the per-lane schedules** of §3.3–§3.4 (screen sizes, promotion sizes and shares, rung fidelities, population,
   proposals per island, operators and their parameters, stagnation, the 5% triggers, extension caps, refinement rules
   and passes, shortlist slots and distinctness thresholds), the instrument, gates, roles and the primary rule of §3.5,
   and the stage order of §3.1 (independent folds C19 → C21 → C23 with commits before slices, then C24, then the frozen
   selection, then FULL once).
4. **Scales effort proportionally.** More effort is added by more **replicates** of the unchanged per-lane schedules
   (each replicate a new seed key), never by enlarging one stage alone; the exploration / refinement balance of §4.3 is
   then preserved by construction.
5. **Omitted discovery stages** (for example the G and B structure cells when the structure is fixed) are recorded with
   their original budget and reassigned to the retained scope **using the same per-cell schedules** (a G or B cell
   schedule becomes another cell of the retained structure); protections that only apply to the omitted scope (the
   both-Growth islands, promotion shares, refinement start and shortlist slot) are converted to their ordinary
   counterparts and the conversion is stated.
6. **Budget equivalence** is shown side by side with §4: the configured base, the executed proposals, islands,
   refinement starts and moves, requested evaluations, unique fresh simulations and archive hits, per lane and stage,
   against **the L0 arm** (the effective budget) and, for context, the whole 5B study. Archive hits, retries, cached and
   centre-first-skipped work are counted apart; equivalence is claimed only for units both studies record.
7. **Informed seeds** are the existing candidates the original used (projected to the retained structure by the
   original's own inclusion moves where needed), plus any new incumbent the brief names, labelled informed; the
   informed lane makes no chronological claim.
8. **Selection** follows §3.5: the incumbents compete in the final selectable set under the same gates (the
   qualifying-incumbent fallback); a "C" result that equals an unchanged incumbent is a valid outcome, never hidden.
9. **Discloses** that the informed seeds carry the lineage of §1.2 (3B's large informed-joint search) and that this
   lineage effort is not re-executed.

## 8. Changing one convention (how NL0 is used for a controlled experiment) [N]

When the question is a single engine convention (for example the maximum-hold unit), the study reports:
- **A** — the frozen New L0 under the original convention (reproduced to the cent);
- **B** — the same phenotype, parameters and allocator under the new convention (no re-optimization);
- **C** — the selection of an NL0 reproduction under the new convention;
- the decomposition **C − A = (B − A) convention effect + (C − B) re-optimization effect**, and the cross rows (C's
  phenotype under the original convention) that show whether C's gain depends on the new convention.
The new convention is an explicit, separately keyed option; the original stays the default and keeps producing the
original results.

## 9. Commands and artifact locations (original run) [V]

`research/vg-lifecycle-matched-optimization/RUN_COMMANDS.md` (from the repository root), e.g.

```
npm run research-preflight -- --study research/vg-lifecycle-matched-optimization
npm run vg-lmo -- verify
npm run vg-lmo -- launch --unit vglmo-C24-search-informed --wait -- search --cutoff C24 --arm informed
```

Sealed stages refuse to rerun; job archives live in `.cache/vg-lifecycle-matched-optimization/jobs/` (local, git-ignored);
the phenotype is replayed read-only in Strategy Lab (`docs/strategy-lab/POOLED_CANDIDATES.md`).

## 10. Reconciliation with the optimization standard

NL0 instantiates the standard's large-space pipeline (§4.1), its budgets in two units (§4.2), the extension policy
(§4.5), the instrument (§5.3), the gates and roles (§2.3–§2.6), the qualifying-incumbent fallback (§3.2), the separation
of independent and informed lanes (§3.3, §1.9), the earlier-cutoff repeat (§1.8) and the door discipline (§1.4). Its
recorded adaptations (5B AD1–AD12) and its one departure (AD9: no chronological test for the informed lane, agreed in
5B's brief) stay as they were. Nothing in this document relaxes a mandatory rule; a reproduction adopts the standard
current at its start (2.1.0 adds §3.5 and §4.8, which point here).

## 11. Change log

| Version | Effective | Change |
|---|---|---|
| 1.0.0 | 2026-11-12 | First version, recovered from 5B's code and sealed records and verified by the development reproduction of §1.3 (`research/vg-l0-session-hold/`, Phase 2). |
