# Protocol — growth140-vgt-stable: Growth 1.4.0 VGT follow-up (audit, #4 sensitivity, stable search, chronology)

Written 2026-11-07 (UTC) in the main checkout, branch `research/growth140-vgt-stable` (from `b0cf0c9`, the end of
`growth140-vgt-s8m`). The brief is `brief/BRIEF.md` (sha256 `c3977d24…ac2ad1`, read in full). Code:
`src/growth140-vgt-stable/` (it reuses the completed study's verified modules by import, unchanged).

**Written before any audit re-evaluation, sensitivity run, search, qualification, selection or 2025–2026 candidate
outcome of this study existed.** Computed before it:

1. The door build (`build-doors`: sizes, hashes, sessions; no strategy run).
2. A smoke check (#4 on D24 reproduces $92,575.71 / $14,578.10; a D19 run equals the D24 run's equity at the 2019
   close; the fine genome round-trips; the switches OFF decode).
3. The engineering pilot (§3.6): pilot labels and budgets, the D19 door and two pseudo-folds inside development
   (P18 on D19 with a 2018-12-31 boundary; a final-shaped run on D24 with a 2023-12-29 boundary). Its outputs stay in
   the git-ignored cache (`.cache/growth140-vgt-stable/pilot-out/`); only timings, memory, counts and equality booleans
   were read, and no design choice used a pilot figure.

**Prior knowledge (disclosed).** The completed study's development archive, its frozen members, their development and
2025–2026 outcomes (every member failed validation; #4 earned $52,892.75 on 2025–2026), #4's full-history browser
figures, and every earlier VGT study. #4 was selected in the browser with 2016–2026 in view. **Both windows of this
study are already examined history.** Fresh seeds are not fresh market history.

**Freeze.** `npm run growth140-stable -- freeze-protocol` writes `results/protocol_freeze.json`: this file's sha256,
the amendment log's, the brief's, the code closure, the door pins, the data pins, git HEAD, the budgets, rules and the
resource contract. It is committed before the audit re-evaluation. Afterwards this file is never edited; amendments go
to the append-only `AMENDMENTS.md`, and a code change needs an amendment and `acknowledge-code <ID>`.

## 1. Question, objective, outcomes

- **Question.** Within a declared search of Growth 1.4.0's existing rules on VGT, selected only on development data
  (2016-01-04 → 2024-12-31), is there a phenotype with **higher net profit than #4** and a maximum minute drawdown
  **≤ $35,000**, with stable neighbourhoods, whose selection procedure also held up chronologically, and does it keep
  that on 2025-01-02 → 2026-10-30?
- **Objective (the user's).** Maximize net profit within the ceiling; give nearby-setting performance and
  chronological evidence substantial weight; prefer lower drawdown when profit and stability are comparable; show the
  frontier. Wins, losses, exposure and retained profitable episodes are supporting evidence only. Fewer losing trades
  never compensate for larger dollar losses or hidden open losses.
- **Outcomes.** A qualified set (possibly empty) per cutoff, per source and per entry family; a frozen final selection
  (possibly empty) with roles, rank order and a primary candidate; one final comparison. An empty set, a family with no
  qualifier and a failed final comparison are valid outcomes, reported as such.

## 2. Data, doors, windows

### 2.1 Windows (New York regular-session dates)

| Purpose | Dates | Use |
|---|---|---|
| Development | 2016-01-04 → 2024-12-31 | the audit, the sensitivity study, all searches, folds, qualification and the final selection |
| Final comparison | 2025-01-02 → 2026-10-30 | opened once, after `FROZEN_SELECTION.json` is committed |
| Later data | after 2026-10-30 | reserved for a separately specified prospective evaluation (not used) |

### 2.2 Doors (physical byte prefixes of `data/VGT/data.csv`, sha256 `2ee06310…412e`)

Each prefix holds every row whose New York date is ≤ its last session (every row before the next New York midnight in
UTC). Every worker verifies size, sha256 and last-row time before parsing, then loads the file through the repository
loader (warm-up 0, explicit dates) and asserts the session count. Pins: `results/doors-pins.json`.

| Door | Last session | Bytes | Rows | Sessions | sha256 |
|---|---|---:|---:|---:|---|
| D19 | 2019-12-31 | 18,374,863 | 319,486 | 1,006 | `a2e4c721…ce81d1` |
| D21 | 2021-12-31 | 28,414,685 | 495,874 | 1,511 | `68174203…a2a60e` |
| D23 | 2023-12-29 | 37,879,762 | 663,135 | 2,012 | `920f3a20…5a812c` |
| D24 | 2024-12-31 | 42,469,694 | 743,918 | 2,264 | `c144619f…0bf9ecb` (equal to the completed study's development door) |
| FULL | 2026-10-30 | the browser's path (partition `all`, forward split adjustment, warm-up 0) | | | opened once (§13) |

- No VGT split lies inside D19–D24 (the only one is 2026-04-21; each door asserts it), so development prices equal the
  full run's prices.
- **Door log.** Every opening goes to `results/doors.jsonl`. A guarded door (a fold's evaluation slice; FULL) opens
  only when its guard — the sealed fold selection, or the committed `FROZEN_SELECTION.json` — exists, is read-only and
  has the expected sha256 (checked by every worker).
- **Same conventions everywhere.** Every run uses the same New York session boundaries, minute execution and marking,
  costs, financing and the engine's native fills, gaps and stops.

## 3. Resources, containment, memory and resumability

### 3.1 Reused design (the completed study's verified mechanism, `research/growth140-vgt-s8m/MEMORY.md`)

- Each canonical run allocates ≈ 28 MB of typed arrays that V8 heap limits do not bound. Workers are child processes
  (`--expose-gc --max-old-space-size=1024`), one door copy each, started one at a time; a full GC after every 8
  evaluations or above 256 MiB of ArrayBuffers.
- Per-job SQLite archive (WAL, 32 MiB page cache), LRU ≤ 50,000 records, write buffer ≤ 500 rows / 2 s, bound to its
  namespace (study, job, door, pins). Compact records only; ledgers and minute curves on demand for selected
  configurations. ≤ 2 tasks in flight per worker; batches enter the queue ≤ 4,096 keys at a time; centres fitted in
  chunks of 256.
- Failed evaluations are archived with their error (infeasible everywhere) and counted; the job continues. Every
  evaluation of every job is a row of its archive (trials are never discarded).

### 3.2 Containment (the user's limits of 2026-11-07)

- **Parent slice** `growth140-stable.slice` (systemd's hierarchy places it under `growth140.slice`):
  `MemoryHigh=44G`, `MemoryMax=48G`, `MemorySwapMax=0` (runtime properties, re-applied before every launch). Every
  study unit runs inside it, so the limits bound **all concurrently running study processes together**.
- **Each unit** (`systemd-run --user --slice=growth140-stable.slice`): the same three limits, `KillMode=mixed`,
  `TimeoutStopSec=120`, `Restart=no`, `--collect`, its log in `results/runlogs/<unit>.log`. Cgroup separation from the
  tmux/Claude scope is verified on the live unit (`/proc/<pid>/cgroup`).
- **Swap 0.** The host's 8 GB swap is full with other workloads (as in the completed study).
- **Host checks before every launch.** `MemAvailable`, swap, `/proc/pressure/memory` and the ancestor cgroups (all
  unlimited at 13:55Z). A launch is deferred while MemAvailable < 16 GiB or memory PSI avg60 > 10.
- **Monitor** every 10 s (`results/memory/<job>.jsonl`): the job cgroup's `memory.current`, peak, anon, swap and
  events; per-process RSS; each worker's heapUsed, external and arrayBuffers; LRU and write-buffer sizes; queued and
  in-flight tasks; fresh, archive-hit and failed evaluations.
- **Stop-and-checkpoint threshold** min(16 GiB, MemoryHigh − 4 GiB) = 16 GiB of the job cgroup: dispatching stops,
  in-flight work finishes, the archive commits, the checkpoint is written, exit 75. SIGTERM does the same. The
  threshold may be raised only with measured evidence, by amendment.

### 3.3 Checkpoints and resume

Atomic (temp, fsync, rename, directory fsync, `.prev` kept) and hash-validated against the pins. Written at every
stage boundary and island generation, and at least once a minute inside long batches. Rerunning the same command
resumes: the interrupted batch is regenerated from the saved RNG state and finished evaluations come from the archive
(configuration ids deduplicated), so a resumed run reproduces an uninterrupted one exactly. Qualification, fold
evaluation and the final comparison are idempotent over their archives; their sealed outputs are written once.

### 3.4 Concurrency

At most one evaluating study job at a time, 14 workers (the pilot bench, §3.6). The completed study measured
≈ 0.5 GiB per added worker (peak 8.38 GiB at 12 workers); the pilot's peak at 14 workers was 8.61 GiB, far inside
the slice.

### 3.5 Integrity

Pins (§9) are verified by every stage. Outputs are sealed write-once (chmod 444, sha256 in `results/seals.jsonl`).

### 3.6 The pilot (must pass before scaling)

Pilot labels and budgets (`budgets.pilot`), engineering only:

- A: the whole four-cell search on D19, 4 workers, fresh archive.
- B: a stop after 1,500 fresh evaluations, then resume (8 workers): output identical to A.
- C: SIGKILL of the whole unit after 35 s, then resume (14 workers): identical to A.
- D: LRU of 256 records (eviction), 12 workers: identical to A.
- E: the qualification workload of A's shortlist.
- F: the fold path on the pseudo-fold P18 (freeze, evaluation on D19 after 2018-12-31); a stop after 200 fresh
  evaluations and a resume that reproduces it.
- G: the final-shaped workload on D24 (pseudo-boundary 2023-12-29), including the guard path.
- Bench: a fixed batch on D24 at 8 / 12 / 14 / 16 workers and on D19 at 14 workers (throughput, memory).
- Results: `results/pilot/` (driver record, benches, memory summaries). P0 parity (§9.2) runs after the freeze,
  before the audit re-evaluation.
- **Pilot outcome (attempt 2, 14:20–14:32Z, 12.4 min).** B, C and D reproduced A exactly; the fold evaluation's
  stop/resume reproduced its uninterrupted run; E and G completed. Job peaks 1.85–8.61 GiB (G: 14 workers on D24 and
  the coordinator's two doors), worker RSS ≤ 675 MiB, ArrayBuffers ≤ 226 MiB, no `memory.high`/`max`/OOM event, no
  swap, no failed evaluation. Attempt 1 (14:15–14:19Z) was aborted after A–B2 because the fine step changed (the
  coarse 0.25 steps were not on the fine grid); its files are kept in `.cache/growth140-vgt-stable/pilot-attempt-1/`.
  A pilot run of the P0 checks (12 configurations against the browser runner, 36 causality rows, 241 archive points)
  and of the sensitivity code (on D19) completed without a difference or failure (engineering booleans only).
- **Bench** (2,000 fixed configurations): D24 81.8 / 87.0 / 87.6 / 87.7 evaluations/s at 8 / 12 / 14 / 16 workers
  (job peak 3.6 / 5.7 / 7.0 / 7.7 GiB); D19 157.8/s at 14 workers. Throughput saturates at the 8 physical cores, so
  the study uses **14 workers**.

## 4. Rules (the brief's, made exact)

### 4.1 The drawdown ceiling

- **Measure.** The engine's maximum minute drawdown of the marked net (strict new peaks, every regular-session minute
  close and every session close), in dollars on the **fixed $100,000 notional**; as a percentage it is the dollar
  figure divided by $100,000.
- **Ceiling.** ≤ **$35,000** (35% of $100,000). It applies to the centre's development result, its 2025–2026 result
  (peak initialized at the 2024 close) and its continuous 2016 → 2026-10-30 result. A future drawdown can exceed a
  historical ceiling.

### 4.2 Feasibility (search) — the only automatic exclusions

Centre net > 0; centre maximum minute drawdown ≤ $35,000; neighbourhood p90 drawdown ≤ $35,000; neighbourhood p10
net > 0 (normalized violation, 0 iff feasible; a failed evaluation is infeasible).

### 4.3 Stability qualification (§8)

Independent confirmation draws (3 × 128): **p90 drawdown ≤ $35,000** and **p10 net > 0**, plus the centre and cost
checks (§8.1). The p90 rule lets up to 10% of neighbours exceed the ceiling; the fraction of breaches, their mean
excess and the worst drawdown are always reported.

### 4.4 Evidence instead of exclusions

The completed study's minimum trade count, 25% largest-trade share and $10,000/yr neighbourhood-median floor are
**not** applied. Reported for every candidate instead: trades, wins, losses, episodes; exposure; annual profit by
calendar year; neighbourhood median and p10; dollar losses (sum of losing trades), worst loss, longest losing hold,
open P&L at the end; concentration (below). Sparse activity is reported as limited evidence of stability.

### 4.5 Episodes and concentration (frozen definition)

- **Episode (market move).** Trades in entry order; a new episode starts when an entry is **more than 10 sessions**
  after the previous exit (an open position continues its episode). Related entries into one move (continuation
  re-entries, re-entries after a stop) are therefore one episode.
- **Concentration.** The largest winning episode's net, its share of net, the second largest, and two **arithmetic
  diagnostics (not engine replays)**: net minus the largest winning episode, and net with that episode's profit reduced
  by 50%.

### 4.6 Mandatory checks

Costs (5 bps per side; stresses at 10 and 20 bps), financing (11% simple interest per calendar day on 365 days, always
included by the engine) and chronology (door causality and boundary continuity, §9.2 and §13.2) are always run.

## 5. Strategy, fixed contracts, instrument

### 5.1 Fixed contracts

- `rise-from-recent-low-trading@1.4.0` through the browser's own path: the Strategy Lab mapping (`paramsOf`), the
  engine (`runRiseTrading`), its summary (`summarizeSimulation`) with the runner's accounting checks (1e-6 USD) — the
  completed study's `engine.ts`, unchanged.
- VGT only; 1d signal bars with minute execution and marking; $100,000 fixed notional, no compounding; 11% simple
  interest; 5 bps per side; $0 commission.
- **Identity.** The browser's: canonical JSON of the effective parameters plus `|1d`, sha256, 16 hex characters.
  Every configuration passes the browser validator.

### 5.2 The neighbourhood instrument (all candidates, controls and folds)

- **Radius.** R = 10% of each input's box (value units). A perturbed value = centre + u × scale × R, **rounded to the
  fine step** — the schema's own step (0.1 percentage point, 0.1 × ATR, 0.01 for two rebound/recovery inputs, 1 session
  or bar), or, where the coarse box step is not a multiple of it, their largest common divisor (0.05 for the five
  percent inputs on 0.25 box steps, so the coarse grid lies on the fine grid) — then clipped to the box widened to
  include the centre. Every centre — on the coarse grid or not, #4 included — is perturbed by the same absolute
  amounts.
- **Design.** One Latin hypercube of n points over all 50 numeric inputs per seed family (`seedOf('nbhd', …labels)`);
  a centre uses the columns of its active inputs (common random numbers across centres). Switches and selectors stay
  fixed. Constraint repair (momentum S < L) afterwards; invalid points and duplicates of the centre or of earlier
  points are dropped; distinct configurations and distinct ledgers are reported.
- **Fidelities.** Screening 16 (rung 1), 64 (rung 2), 128 (rung 3); refinement 32; selection 2 × 128 = 256; confirmation
  3 × 128 = 384; small (scale 0.5) and broad (scale 1.5) 128 each (report-only). A 16-draw estimate is never treated
  as a confirmation.
- **Robust net** = ½ median + ½ p10 of the neighbours' net (dollars over the window).

## 6. Search

### 6.1 Cells

At each cutoff (§7) one job runs four cells in order: **global/rise, global/breakout, informed/rise,
informed/breakout**. A cell's entry family is fixed (the entry gene is pinned); everything else is searched.

### 6.2 The space

The completed study's 8 structural genes (entry; trend filter off / 5 methods; eligibility off / 5 policies, Rise
only; gate off/on; exits hold OFF / hold ON buffer OFF / hold ON buffer ON; initial stop off/on; retention off/on;
continuation off / 4 methods) and 50 conditional numeric genes with its boxes (its PROTOCOL.md §4.3: schema hints,
Study 8 boxes and declared conventions; set without #4 in view). Dependencies: eligibility applies only to the Rise
entry; the buffer requires the maximum hold; method inputs are active only under their method; inactive genes do not
change the identity. The trailing stop is mandatory (always ON). 5,040 distinct rule structures; 2,520 per family
(breakout has no eligibility: 840).

- **Coarse grid** (global screen and islands): the completed study's grid steps.
- **Fine grid** (informed islands, every refinement and every neighbourhood): the fine step of §5.2. Integer inputs
  are integers; percentages are multiples of 0.1 (0.05 or 0.01 where §5.2 says so).
- **Effective deduplication.** Every proposal is decoded to its effective configuration and identified by the browser
  identity; a duplicate is never evaluated twice in a job.
- **Omissions (explained).** Growth 1.4.0 has **no trade-spacing (cooldown) input**, so none is searched; the existing
  behaviours that space trades — the eligibility age, the continuation window, the Drawdown Recovery Gate and the
  maximum hold — are searched. Costs, notional, interest, resolution and symbol are fixed. No new behaviour is added.

### 6.3 Global cells (independent: fresh seeds, no #4 or archive information)

| Step | Value |
|---|---|
| Screen | 4,096 genomes per family (Latin supercube of 4 scrambled Sobol blocks, the entry gene pinned) |
| Plausible | centre DD ≤ $35,000 and net > 0 (no trade-count floor) |
| Promotion | ≤ 640: ½ by constrained rank on (−net, DD), ½ by max-min L∞ diversity (counts per switch class reported) |
| Rung 1 | 16 draws |
| Islands | 2 sequential NSGA-II islands, population 128, ≤ 2,560 new configurations each, ≤ 40 generations, SBX η15 (p 0.9), PM η20 on grid indices, stagnation 8 generations at 1e-3 of the island hypervolume on (−robust, p90) with reference (0, $35,000) |
| Saturation | after each island beyond the first: saturated iff that island raised neither the cell's best feasible rung-1 robust net nor its union hypervolume by more than 5% (relative); otherwise one more island, up to 3 |
| Rung 2 | top 64 by constrained rank (Study 8 `rankOrder`), distinct L∞ ≥ 0.02, 64 draws |
| Rung 3 | top 16, distinct 0.03, 128 draws |
| Refinement | 3 starts (banded order of feasible rung 3, then infeasible by violation; distinct 0.05), ≤ 2 passes; moves: every active input ±R/2 and ±R (schema-step rounded, inside the box) and every enabled optional rule OFF; 32-draw neighbourhoods; from a feasible start accept the banded-best (§8.3) feasible move raising robust net by ≥ $2,000; from an infeasible start the move lowering the violation most (≥ 0.01); endpoints re-fitted at rung 3 |
| Shortlist | ≤ 5 per cell (§6.5) |

Island i starts from the rung-1 promoted fits with rank-order index ≡ i (mod 2), topped up with Latin-supercube fillers
(`'fill', i`). Islands share the rung-1 offsets and differ in their GA randomness.

### 6.4 Informed cells (inherits information: the seeds were chosen with later data in view)

- **Seeds (mechanical, sealed in `results/seeds/SEEDS.json` before any search).**
  - Rise: #4; the best feasible centre of #4's regional scan (§12.6) if different; then the audit re-evaluation's
    qualified Rise configurations (§11) in banded order; ≤ 6.
  - Breakout: the audit re-evaluation's qualified breakout configurations (including the prior frozen members when they
    qualify) in banded order; ≤ 6.
  - The same seeds are used at every cutoff (retrospective diagnostics at C19–C23, where they carry future information).
- **Local designs per seed** (fine grid): the seed; 96 joint Latin-hypercube perturbations at scale 1.5 R
  (`'local', i`); every one-at-a-time move ±R/2, ±R and every enabled rule OFF. All fitted at rung 1.
- **Island:** one NSGA-II island on the fine grid, population 64 (the rung-1 local designs by constrained rank), ≤ 1,280
  new configurations, ≤ 40 generations, the same operators and stagnation rule; the structure may change.
- Rung 2: top 24 (distinct 0.02, 64 draws); rung 3: top 8 (distinct 0.03, 128 draws); refinement: 2 starts, ≤ 2
  passes (as §6.3); shortlist ≤ 4 per cell.

### 6.5 The cell shortlist (structural slots against crowding)

From the cell's rung-3 fits (one per ledger signature, the higher robust kept), feasible only, each pick at L∞ ≥ 0.10
from earlier picks: (1) *top*: banded order; (2) *hold-alternative*: the banded best with the other maximum-hold setting;
(3) *gate-alternative*: the banded best with the other gate setting; (4) *profit*: the highest centre net; (5)
*low-drawdown*: the lowest p90 among those with robust ≥ 50% of the top's; then banded order up to the cap. An empty
feasible set gives an empty shortlist; the five most profitable infeasible centres are kept visible with their failed
criteria.

### 6.6 Seeds of randomness

Every seed is `deriveSeed('growth140-vgt-stable', …labels)`; the labels always end with the source, the family and
the cutoff (`… , source, family, C19`). Screen `('screen', …)`; GA `('ga', i, …)`; fillers `('fill', i, …)`; local
designs `('local', i, …)`; neighbourhood families `('nbhd', 'r1' | 'r2' | 'r3' | 'refine', …)`; selection
`('nbhd', 'select', rep, cutoff)`; confirmation `('nbhd', 'confirm', rep, cutoff)`; small / broad
`('nbhd', 'small' | 'broad', 1, cutoff)`; final test families `('nbhd', 'test', rep, 'C24')`; audit `('nbhd', …,
'audit')`; sensitivity `('nbhd', 'sens-…')`, `('nbhd', 'region')`. Nothing is seeded from the completed study.

### 6.7 Budgets (frozen; identical at every cutoff — the matched-budget rule)

| Cell | Evaluations (approximate) |
|---|---:|
| global (per family) | screen 4,096 + rung 1 ≈ 11k + islands ≈ 87k (+ 44k with the extension) + rungs 2–3 ≈ 6k + refinement ≈ 14k ≈ 122k (≤ 166k) |
| informed (per family) | local ≈ 19k + island ≈ 22k + rungs ≈ 3k + refinement ≈ 11k ≈ 55k |
| per cutoff | ≈ 355k (≤ 440k) + qualification ≈ 20k |

The same counts at every cutoff; per-evaluation cost and the number of years differ (D19 4.0 y, D21 6.0 y, D23 8.0 y,
D24 9.0 y), and are reported. The compute estimate from the pilot bench is in §14.

## 7. Chronology

### 7.1 Cutoffs

| Cutoff | Training door (search, qualification, selection) | Frozen before | Evaluation slice (door) | Slice sessions |
|---|---|---|---|---:|
| C19 | D19 (2016–2019, 1,006 sessions) | the slice opens | 2020-01-02 → 2021-12-31 (D21) | 505 |
| C21 | D21 (2016–2021, 1,511) | the slice opens | 2022-01-03 → 2023-12-29 (D23) | 501 |
| C23 | D23 (2016–2023, 2,012) | the slice opens | 2024-01-02 → 2024-12-31 (D24) | 252 |
| C24 | D24 (2016–2024, 2,264) | the final comparison | 2025-01-02 → 2026-10-30 (FULL) | ≈ 459 |

- **Isolation.** Each cutoff's search and qualification open only its training door; jobs, archives, caches,
  statistics and seed labels are per cutoff. The global cells use no archive candidate, no optimized range and no
  #4-derived seed. The informed cells (all cutoffs) use the sealed seeds, which carry later information: they are
  retrospective diagnostics at C19–C23.
- **Order.** C19 search → qualify → fold freeze → evaluation; then C21; then C23; then C24 search → qualify → the
  sequential policies → final selection. A fold's evaluation never feeds a later search.

### 7.2 Fold freeze

`freeze-fold` seals `results/folds/<C>/FOLD_SELECTION.json` (read-only, sha256 logged): every member with its gates,
ranking and the primaries of every policy (§8.4). Its evaluation job verifies it as the door guard.

### 7.3 Fold evaluation (one continuous run per configuration)

For every fold member, #4 and the prior primary (`ec124684b6466d77`, a control): one run 2016-01-04 → slice end on the
evaluation door. Slice net = marked equity at the slice end − marked equity at the boundary close; slice drawdown =
the strict minute tracker with its peak initialized at the boundary equity; carried-in positions split at the boundary
(the part before = boundary equity − trades closed by then); new entries listed; open P&L at the end. Also the 10 and
20 bps slice nets and the confirmation family 1 (128 neighbours) slice median, p10 and positive share.

### 7.4 Sequential policies (predetermined; costs included)

For each policy in §8.4 (and the two fixed controls): the primary chosen at cutoff C trades C's slice; with no primary
the policy is flat for that slice. Equity changes are attributed by the slice nets above (the incoming
configuration's carried-in position counts from the boundary mark). A switch between different configurations at a
boundary is charged 5 bps on the $100,000 notional for each side it implies (closing the outgoing configuration's open
position, adopting the incoming one's carried-in position). Reported: total 2020–2024 net, net before switch charges,
switches, and the strict minute drawdown over the concatenated slice marks.

### 7.5 The procedure decision (for C24)

Among the independent policies `global`, `global-rise`, `global-breakout`: the highest sequential net with net > 0 and
sequential drawdown ≤ $35,000 is the **chosen procedure** (ties: `global`). The informed policies are reported as
diagnostics and are never chosen (they inherit later information). With no eligible policy the final primary is
"chronologically unsupported" (§13.1). If the fold results lead to any redesign, the adaptation and the loss of
independence are recorded as an amendment; none is planned.

## 8. Qualification, ranking, primaries (every cutoff, its training door only)

### 8.1 Evidence and gates

Every shortlist member and the controls (#4 and the prior primary) get: centre; selection 2 × 128; confirmation 3 × 128
(pooled and per family); small and broad 128; the centre at 10 and 20 bps; each enabled rule OFF (ablations, report);
ledger and episodes. Gates (all must hold):

| Gate | Requirement |
|---|---|
| G1 | centre net > 0 |
| G2 | centre maximum minute drawdown ≤ $35,000 |
| G3 | confirmation pooled p90 drawdown ≤ $35,000 |
| G4 | confirmation pooled p10 net > 0 |
| G5 | at 10 bps per side: centre net > 0 and drawdown ≤ $35,000 |

A member failing a gate stays visible with its failed gates. #4 is always reported as a control, qualified or not.

### 8.2 What is reported for each member

The §4.4 evidence; breaches above $35,000 among the 384 confirmation neighbours (share, count, mean excess, worst);
the small/broad sensitivities; the 20 bps stress; the trade matching against #4 on the same window (the completed
study's predeclared one-to-one rule, `src/growth140-vgt-s8m/trades.ts`, header verbatim part of this protocol).

### 8.3 Ranking (drawdown-preferring banded order)

Qualified members are ordered on their **selection** families: repeatedly take, among the remaining members whose
robust net is within 5% of the best remaining robust net, the one with the lowest selection p90 drawdown (ties: higher
robust, then id). Confirmation decides qualification only.

### 8.4 Policies and their primaries

`global`, `global-rise`, `global-breakout`, `informed`, `informed-rise`, `informed-breakout`, `all`: each policy's
primary is the highest-ranked qualified member in its scope (none if empty).

## 9. Integrity and engineering gates

### 9.1 Pins

The code closure (sha256 of every repository `.ts` file transitively imported by `src/growth140-vgt-stable/*.ts`,
tests excluded — it includes the completed study's modules, the Growth engine, the Strategy Lab mapping and validator,
the optimizer and the loaders), the protocol, the door pins, the canonical data, partitions and splits. Every stage
verifies them against the freeze or an acknowledged amendment.

### 9.2 P0 parity (after the freeze, before the audit re-evaluation)

1. The worker path against the browser runner (`apps/strategy-lab/runner/trading-run.ts`) on 2016-01-04 → 2024-12-31
   for #4, two prior frozen members and nine structurally distinct `('parity','P0')` screen configurations: total
   marked and realized net, minute drawdown and its peak/trough times, counts, exposure, every trade's times, fills
   and net — exactly. The compact record must agree with the detail.
2. **Door causality.** For the same configurations, the D19 / D21 / D23 run's net equals the D24 run's marked equity
   at that door's last close (to the cent).
3. **Archive reuse.** A sample of ≈ 240 of the completed study's archived points (every 1,782nd configuration)
   recomputed on D24 equals the archived records exactly (net, realized, drawdown and its times, counts, exposure,
   signature). This establishes matching engine, data, accounting and effective parameters, so the archive's
   development figures are valid evidence here. (No archived record is copied into a new archive.)
4. Any failure stops the study.

## 10. The archive audit (development only; no evaluation)

### 10.1 Reading

`results/archive/MANIFEST.json` of the completed study and every shard's sha256 (and the search SQLite's) are verified;
the gzip JSONL shards are streamed line by line (bounded memory); the screen is regenerated with the completed study's
own code and seeds; its search checkpoint gives the promoted, rung-2, rung-3 and shortlist sets. Nothing in the
completed study is written.

### 10.2 Products (per entry family, under the $35,000 ceiling)

- **Inventory.** Distinct configurations, centres (by fidelity: rung 1 = 16 draws on its grid-step instrument, rung 2,
  refinement = 64, rung 3 = 128, T2 = 256), neighbour-only points, island duplicates.
- **Exclusion funnel**, sequential: screen → plausibility (DD, net, trades ≥ 7) → promotion cap → rung-1 feasibility
  (old rules) → rung-2 selection cap → rung-2 feasibility → rung-3 cap → shortlist → frozen; with the new-rule
  feasibility beside each stage.
- **Overlapping reasons** at rung 1: every centre counted under every failed reason group (drawdown; stability = share,
  p90, p10; activity = trades, episodes, lot years; neighbourhood profit = median floor; capital efficiency;
  concentration = largest trade, best year, ex-best year), the unique blockers, and the first-failure attribution in
  that order.
- **Rescued by the new rules:** new-feasible but old-infeasible centres by old reason; how many reached rung 2
  (promotion caps); structural composition per stage (crowding).
- **Frontiers:** centre net vs centre DD (centres with DD ≤ $35,000) and robust net vs p90 at the best fidelity
  (new-feasible centres), with exact settings.
- **Breakdowns** by family × maximum hold × gate × continuation method; the 15 best rejected Rise configurations by
  robust net and the 10 best by centre net, with settings, metrics, fidelity and reasons.

### 10.3 Audit candidates (declared rule)

For each cell family × maximum hold (OFF/ON) × gate (OFF/ON) — 8 cells: up to 3 new-feasible centres at their best
fidelity in descending robust net, each at L∞ ≥ 0.10 from the cell's earlier picks and with a distinct ledger; a cell
without a new-feasible centre contributes its top 2 by centre net among DD ≤ $35,000, net > 0 ("infeasible at
screening"). ≤ 24 candidates.

## 11. Audit re-evaluation (D24)

The candidates, #4 and the six prior frozen members get the §8.1 evidence under the labels `audit` (common draws for
all). Reported per candidate: the old 16/64/128-draw figures beside the new 256/384-draw figures; the qualification
gates; the banded order. **Classification of each cell:** *never explored adequately* (fewer than 200 rung-1 centres
in the archive); *poorly represented at promotion* (a candidate qualifies here but none of the cell's centres reached
rung 2); *genuinely weak under the observed tests* (adequately explored and no candidate qualifies, or every qualifier's
robust net is below #4's under the same draws); otherwise *viable*.

## 12. #4's sensitivity (D24)

1. **Reproduction:** $92,575.71 net and $14,578.10 minute drawdown (11 trades, 8 / 3 / 0); any difference stops the
   study for investigation.
2. **One at a time:** each of #4's 21 active inputs over (a) centre ± R at the schema step (fine; e.g. retracement
   38.0–52.0 by 0.1, so 45.0 exactly and its neighbours 44.9 / 45.1; buffer 2.3–3.5 by 0.1, so 2.9 exactly) and (b)
   the whole box at the coarse grid step (wide). Units are reported per input. Each enabled rule OFF.
3. **Sensitivity order:** the share of fine points moving net by more than $10,000, then the mean |Δnet|.
4. **Interactions:** the six most sensitive inputs, all 15 pairs on a 9 × 9 grid of offsets {0, ±¼, ±½, ±¾, ±1} R;
   interaction = Δ(a, b) − Δ(a) − Δ(b).
5. **Joint perturbations:** every active input jointly at scales 0.25 / 0.5 / 1 / 1.5 R (256 draws each); the brief's
   seven named inputs jointly; the other fourteen jointly; the six most sensitive jointly (256 each, scale 1). The
   completed study's figures (median $44,531.83, p10 $11,982.96 on its grid-step instrument) are compared.
6. **Ledgers and events:** for the nearest fine value on each side of each input that moves net by more than $10,000,
   the exact-value checks (retracement 44.9 / 45.1 / 40 / 50; buffer 2.8 / 3.0 / 2.5 / 3.5) and the eight lowest joint
   points: the full ledger against #4's — #4 winners lost (a "major" winner nets ≥ $10,000), extra losses, an extended
   losing hold, and the changed decision events (gate vetoes, deferred/latched opportunities, fills).
7. **Regional scan:** #4 and #4 shifted along each of the six sensitive inputs by ±½ R and ±R, plus the 16 best joint
   scale-0.5 points with DD ≤ $35,000; each with a 64-draw `region` neighbourhood; feasible centres in banded order.
   This tests whether a nearby region gives up some centre profit for better neighbourhood outcomes and risk.

## 13. Final selection and the final comparison

### 13.1 Final selection (C24, after the sequential policies)

- **Finalists (≤ 10):** the C24 qualified members in rank order, at most 3 global/rise, 3 global/breakout, 2
  informed/rise, 2 informed/breakout, each at L∞ ≥ 0.10 from earlier finalists with a distinct ledger; free slots then
  filled in rank order (still distinct).
- **Rank order:** the C24 banded order restricted to the finalists.
- **Primary:** the highest-ranked finalist within the chosen procedure's scope (§7.5); with no chosen procedure, the
  rank-1 finalist, flagged "chronologically unsupported"; with no finalist, none.
- **Roles:** primary; best-rise; best-breakout; best-informed; low-drawdown (the lowest confirmation p90 among finalists
  with selection robust ≥ 50% of rank 1's); finalist.
- `final-select` writes `FROZEN_SELECTION.json` (chmod 444): finalists with full effective settings, ids, canonical
  hashes, gates, roles, rank order, primary, controls and the record hashes. It is committed before `final`.

### 13.2 The final comparison (opened once)

1. `FROZEN_SELECTION.json` tracked and unchanged from HEAD; the FULL door opens once (door log; a resume is allowed).
2. **#4 parity first:** 2016-01-04 → 2026-10-30 against the brief: $145,468.46 total marked and realized net,
   $14,578.10 (14.58%) maximum minute drawdown, 10 / 3 / 0, 13 closed, 37.0% exposure, flat — dollars to the cent,
   counts exactly, exposure to one decimal. A mismatch is reported (expected vs observed) and investigated (coverage,
   engine version, price units, fills, stops, financing, marks); no browser-equivalent claim while it remains; #4 is
   never tuned.
3. **Continuity:** the FULL door's 2016–2024 sessions have D24's digest; every finalist's full-run equity at the 2024
   close equals its C24 development net.
4. **Every finalist, #4 and the six prior frozen members**, one continuous run each: development (equity at the 2024
   close, development drawdown), validation (net from the 2024 close; drawdown with its peak at the boundary; carried-in
   positions; new trades; wins, losses, dollar losses; open P&L; exposure), full history (net, realized, unrealized,
   drawdown); 10 and 20 bps; test families 2 × 128 (`'test', rep, 'C24'`) on FULL.
5. **Gates (frozen; applied even if nothing passes):**

   | Gate | Requirement |
   |---|---|
   | V1 | validation maximum minute drawdown (peak at the 2024 close) ≤ $35,000 |
   | V2 | continuous 2016 → 2026-10-30 maximum minute drawdown ≤ $35,000 |
   | V3 | validation net > 0 |
   | V4 | at 10 bps: validation net > 0 and run drawdown ≤ $35,000 |
   | V5 | test families: p90 run drawdown ≤ $35,000 and median validation net > 0 |

   Status *pass* iff all hold. Outcomes never reorder, replace or rescue.
6. **Comparisons with #4 on the same dates:** validation and full-history Δ net and Δ drawdown; higher net with equal or
   lower drawdown; #4's winners retained, retimed or lost and new winning moves (the matching rule), on the validation
   entries and on the whole run. Development rank order is preserved in every table.
7. **After this, selection for this study is closed.**

## 14. Compute budget and stopping

- **Budget:** the frozen counts of §6.7 at four cutoffs (≈ 1.4 M evaluations, ≤ 1.8 M with every saturation
  extension), plus the audit re-evaluation (≈ 31 × 0.9k), the sensitivity study (≈ 7–12k), qualification (≈ 4 × 20k),
  the fold evaluations and the final comparison. Three of the four searches (and three quarters of qualification) are
  the chronological cutoffs.
- **Wall-clock estimate** (bench, 14 workers; cost ≈ 2.2 ms + 4.1 µs per session per evaluation): C19 ≈ 37 min,
  C21 ≈ 50 min, C23 ≈ 62 min, C24 ≈ 68 min — ≈ 3.6 h of search (≤ 4.5 h with every extension) plus ≈ 0.5 h for the
  other stages.
- **Saturation** is the §6.3 rule (improvement in the best feasible robust net and in the profit–drawdown hypervolume
  within the ceiling, across independent island seeds and generations). The extension is the only budget increase.
- **Stopping.** The study stops after the final comparison, or at a concrete blocker (a failed parity, pin, door or
  continuity check; an unrecoverable resource failure). No search is extended or re-tuned after a disappointing fold or
  final result; further ideas go to a future study.

## 15. Departures from the completed study, and disclosures

| Item | Completed study | Here | Why |
|---|---|---|---|
| Ceiling | strict < $35,000 | ≤ $35,000 | the brief |
| Exclusions | C3 activity, C5 median ≥ $10k/yr, C6, C7 concentration, share ≥ 0.90 | evidence only; feasibility = net > 0, DD ≤ ceiling, p90 ≤ ceiling, p10 > 0 | the brief |
| Instrument | ±round(0.1·(levels − 1)) grid steps | ±10% of the box in value units, schema-step rounding | off-grid controls, fine resolution, equal absolute perturbations |
| Search | one cell, both families | four cells per cutoff (source × family), structural shortlist slots | family coverage, crowding |
| Chronology | one cutoff (F24) and in-sample fold slices | four cutoffs, independent searches, frozen fold selections, sequential policies | the brief |
| Episodes | gap 10 sessions (counts only) | gap 10 sessions; concentration and arithmetic removal by episode | the brief |
| Containment | per-unit 44G/48G | a shared parent slice 44G/48G over all study units, plus per-unit caps | the brief |

- The overall design (the space, the instrument, the families, the folds) was informed by previously examined history,
  including the completed study's failure. Fresh seeds are not fresh data, and the fold slices (2020–2024) were part of
  every earlier development search.
- The informed branch inherits information from the history used to choose its seeds (2016–2024 for the audit,
  2016–2026 for #4).
- The doors were built and the pilot ran before the freeze (engineering only).
- Nothing here is deployed, traded or recommended for live use.
