# PRIORITY4_RESEARCH_PROTOCOL_PROPOSED — staged trailing stops (PROPOSED, NOT AUTHORIZED)

**Status: proposal for the user's review.** Nothing in this file has been frozen, adopted, preflighted or run.
- If Priority 4 is authorized, its own study namespace will start from `docs/research/STUDY_PROTOCOL_TEMPLATE.md`. It
  will adopt the then-current optimization standard (3.0.0 at the time of writing, scope `optimization`,
  `evaluationBackend: gpu-required`) and freeze a protocol derived from this proposal, with the user's decisions
  (DECISION_REGISTER.md) filled in.
- Every number below is a **proposed default** to approve or change. None was fitted to data.

## 1. Question and hypotheses

**Q.** Does an optional, per-book, profit-activated tightening of the trailing distance (option S1) improve the jointly
optimized, P0-qualified **whole portfolio** (VGT D1 + GDX D1 + VGT Growth, one shared $100,000 slot, L0), against the
same procedure with the rule OFF?

| ID | Hypothesis | Tested by |
|---|---|---|
| H1 | Allowing S1 raises the best qualified training-period centre net of independent lanes (paired) | primary statistic §7.1 |
| H2 | Any gain comes **through the rule** (selected configurations use S1, and turning it off costs them), not through search-path differences | mechanism checks §7.3 |
| H3 | The gain does not come with worse risk: centre DD, neighbourhood p90 DD and breaches, trade principal loss, banked-capital DD | risk non-inferiority §7.2 |
| H4 | The S1 procedure is chronologically supported, and its paired next-interval behaviour is not worse | §8 |
| H0 (allowed outcome) | OFF is as good or better: the study recommends keeping the rule OFF | the outcome labels §9 |

## 2. Fixed scope and conventions

- **Books.** D1·VGT, D1·GDX, Growth·VGT. **Growth·GDX OFF.** No TSLA, MSFT or other symbols.
- **Engine.** L0 funding, the tie order, 5 bps per side, 11 % simple interest, stop fills at the level or the gapped
  open, fractional shares, calendar-day holds — all unchanged.
- **Data split.** Development 2016-01-04 → 2024-12-31 for every choice. Cutoff doors C19, C21, C24 (C23 optional).
  2025-01-02 → the common complete endpoint **once**, after the frozen selection, labelled "validation on previously
  examined history, not an untouched holdout".
- **Risk reference.** **P0**: centre marked DD ≤ $35,000 = 35 % of the initial $100,000 allocation, plus the existing
  neighbourhood gates of the reproduced method. The P3 envelope stays **not adopted**. Trade principal loss,
  banked-capital DD and giveback are reported, never gated.
- **Comparators.** Frozen **New L0** and **N/original** (staged OFF), each reproduced to the cent on D24 and FULL on the
  new binary before any search. Neither is replaced by this study.

## 3. Engineering prerequisites (GPU_PARITY_AND_INTEGRATION_PLAN.md §7)

E0–E4 must pass before the first official evaluation:
- the CPU reference with OFF parity;
- the CUDA port;
- the full Apollo parity campaign;
- a new ACCEPTED acceptance record.

E5, a pilot benchmark of EXP-shaped lanes on the new binary, sizes the budget **before** the freeze. A material change
after the freeze is an amendment (standard §4.6).

## 4. Controlled ablations (Stage A — fixed parameters, report-only, before any search)

**Purpose.** Isolate the rule's mechanics on fixed phenotypes before optimization. Nothing here selects, ranks or
narrows a domain: the domains are frozen before Stage A runs.

| ID | Subjects | Settings | Door | Output |
|---|---|---|---|---|
| A0 | New L0, N/original, staged OFF | — | D24, FULL | must equal the sealed records to the cent (an engineering gate) |
| A1 | New L0 and N/original, **one book at a time** and **all three books** | a predeclared domain-spanning factorial: A ∈ {7.5, 12.5, 20, 30, 40} % × τ₂ ∈ τ₁ × {0.30, 0.50, 0.70, 0.85}, snapped to the grid, with the τ₂ repair | D24 only | per point: net, DD (U/E/F), PL, BD, giveback retained, number of trades changed, arms, staged exits, placement exits, **displaced and newly funded trades** (funding-log diff), interest, occupancy |
| A2 | the A1 points | stop-slippage 10 / 25 bps; D1 `next-open` | D24 | the stress sensitivity of the staged exits |

**Cost.** 2 subjects × 4 scopes × 20 points × 3 stress settings ≈ 480 centre evaluations: seconds of GPU time.
Labelled "development, previously examined; mechanism isolation, not evidence of benefit".

## 5. Search design (Stage B — official GPU)

### 5.1 Arms, cells, lanes (the primary experiment: independent, paired)

**Arms.**
- **CTRL:** today's domain, with staged forced OFF.
- **EXP:** the identical domain plus, per book, the switch {OFF, ON} and the numeric genes A, τ₂.
- Both arms use the reproduced independent method of Assignment 3 / Stage B (broad lanes: screen → islands →
  promotion → rungs → refinement → shortlist), the same per-lane schedule, the same caps and the same qualification.

**Cells.** GA0.VA0 (New L0's legacy D1 mechanics) and GB0.VD1 (Stage B's second cell).
- **Why these cells:** with OFF parity, CTRL replicates R1–R16 of each cell must **reproduce Stage B's sealed CTRL lanes
  exactly** (envelopes stripped).
- That gives a search-level OFF-parity gate and continuity with sealed evidence.
- N/original's cell GD1.VB0 is used in the informed lanes (§5.3).

**Replicates.** 32 per cell → **64 paired lanes per cutoff** (Stage B had 32).
- Stage B's design resolved ≈ $10k: the SE of the mean paired difference was $3.7k at C21 and $5.1k at C24.
- 64 pairs should bring that to about $2.6k / $3.6k. That is enough to separate a material effect (§7.1) from zero,
  not to resolve a few thousand dollars.

**Seeds and common random numbers.**
- Lane seeds as in Stage B (`seedOf(cutoff, cell, replicate)`), identical across arms.
- In EXP, the shared genes take **exactly CTRL's screen coordinates**. The staged genes come from an independent
  stream, with each book's switch ON in half of the screen points (balanced).
- The arms therefore start from paired screens and differ only by the staged genes.

### 5.2 Fairness and search-path controls

1. **Equal effort.** The same per-lane caps and extension triggers in both arms; requested and fresh evaluations,
   proposals, rounds and stop reasons are reported per lane.
2. **OFF stays reachable and protected in EXP.**
   - The categorical switch is balanced in the screen.
   - Refinement may toggle ON ↔ OFF, and the genes are inactive (masked) when OFF.
   - Promotion reserves at least ¼ of each step for centre-profit rank (standard §2.4).
3. **OFF projection.** Every EXP shortlist member with any book ON is also evaluated with that book (and all books)
   turned OFF, at the same other genes. These are counted and qualified under the same gates, and selectable in EXP.
   This puts ON against OFF at the lane's own best region.
4. **Census.** As in the Stage B diagnostics: every centre visited, by arm and staged structure. The best centre's
   identity across arms shows whether an EXP win is a configuration CTRL could also have reached (a search-path effect).
5. **No pruning by structural screening.** A cheap screen that drops books or switches would reintroduce the
   premature-pruning bias the earlier studies warned about. Protected strata are used instead.

### 5.3 Informed lanes (separate budget, labelled informed; no chronological claim)

Each EXP lane has a paired CTRL lane: the same genes without the staged genes.

| Lane | Centre | Searched genes | What it answers |
|---|---|---|---|
| I1 | New L0 | the staged genes only (3 books) | "sequential": the rule's value on a fixed incumbent |
| I2 | N/original | the staged genes only | the same for the challenger |
| I3 | New L0 | staged genes **+ interacting exit genes** (D1 τ₁, hold, buffer per book; Growth τ₁, hold, initial-stop ATR sessions / multiple); the rest fixed | "joint": whether a looser stage 1 with a tight stage 2 emerges |
| I4 | N/original (cell GD1.VB0) | as I3, plus the RC genes active in its cell | the same for the challenger |

- 8 replicates per lane type and arm, C24 only.
- The study's no-improvement fallback: when no searched candidate beats the best qualifying incumbent, the incumbent
  (staged OFF) stays the primary (standard §3.2).

### 5.4 Joint versus sequential

**Joint is primary**, because S1 interacts with τ₁ (a tight late stage can make a looser early stage optimal), with the
hold, with continuation and with displacement. Sequential optimization (I1, I2) is reported as an informed diagnostic.
It is expected to understate a joint effect and must not be read as the rule's value.

### 5.5 Neighbourhood instrument additions

| Item | Rule |
|---|---|
| Numeric radius | A ± 20 tenths (2 points); τ₂ ± 5 tenths; the τ₂ < τ₁ repair applied after perturbation; clipping reported |
| Categorical switches | fixed within numeric neighbourhoods; the ON → OFF toggle per book is a separate report-only family |
| Fidelities | the standard defaults: rungs 16 → 64 → 128; selection 2 × 128; confirmation 3 × 128 = 384 with independent seeds |

## 6. Budget, compute and stopping

**Measured throughput for this workload.** Stage B's Assignment-3-shaped, 64-lane jobs on the accepted RTX 5090, with
the risk envelope requested, ran at **1,808 / 1,339 / 884 evaluations per second** at D19 / D21 / D24 (Stage B
REPORT §3). Assignment 3's C19 broad1 job without the envelope ran at 2,128/s (Phase 3). Batches are latency-bound, so
more lanes in flight do not lower the rate. The staged rule adds one comparison and one multiply per session and
position; **E5 must re-measure** on the new binary before the freeze.

**Proposed budget** (requested evaluations; Stage B's per-lane averages were ≈ 14–19k per lane, cap 41,000):

| Stage | Size | Requested (central) | GPU time (central) |
|---|---|---:|---:|
| A0–A2 ablations | ≈ 480 centres + reproductions | ≈ 0.01 M | < 1 min |
| CTRL repro gate (Stage B lanes) | inside the CTRL arm | — | — |
| Independent search, C19 | 128 lanes | ≈ 2.3 M | ≈ 22 min |
| Independent search, C21 | 128 lanes | ≈ 2.4 M | ≈ 30 min |
| Independent search, C24 | 128 lanes | ≈ 2.0 M | ≈ 38 min |
| Qualification (incl. OFF projections), 3 cutoffs | ≈ 500 members per cutoff × ≈ 650 | ≈ 1.0 M | ≈ 15 min |
| Informed lanes I1–I4, C24 | 64 lanes | ≈ 1.3 M | ≈ 25 min |
| Intervals and the one FULL validation | ≈ 70 subjects each | ≈ 0.08 M | ≈ 3 min |
| **Total** | | **≈ 9 M** | **≈ 2.5 h** of GPU |
| **Hard bound** (all caps and extensions) | | ≤ 25 M | ≤ 8 h |

About 9 M is ≈ 2.3× Stage B and ≈ ½ Assignment 3's 18.3 M (Assignment 3 searched several tracks and populations). The
user has authorized substantial compute where it helps. The proposal spends it on **replicates and paired lanes**,
which reduce the variance of the comparison, rather than on longer single lanes.

**Stopping and convergence** (standard §4.5; frozen before search; development only):
- **Per lane:** the triggers (hypervolume > 5 %, robust objective > 5 %, a new feasible structural class) may add
  rounds up to the cap. The stop reason is recorded. **Budget exhaustion is never reported as convergence.**
- **Convergence evidence** (report-only):
  - the replicate distribution of V and its stability between the first and second half of the replicates;
  - the share of lanes ending at the cap;
  - the share of lane winners found in the last round;
  - agreement of the selected staged structure across replicates.
- **One predeclared extension block.** If more than 25 % of either arm's lanes end at "extension cap reached" with a
  trigger still firing, both arms' budget-bound lanes continue from their checkpoints with the cap × 1.5. This happens
  once, identically in both arms, within the hard bound, and is recorded.
  - If the block is still budget-bound, the report says so.
  - "No material difference" may then **not** be read as "converged".
- **Resource guards:** the GPU gate, VRAM, the conservation invariant and the job lock. A stop is checkpointed and
  resumes under a new attestation.

## 7. Metrics and comparison rules

### 7.1 Primary statistic (per cutoff; C21 and C24 primary, C19 secondary)

D = V(EXP) − V(CTRL) over the 64 paired lanes. V is the best **qualified** training-period centre net among the lane's
own shortlist, as Stage B defined it. Reported:
- the mean D;
- the stratified paired bootstrap 80 % interval and its one-sided 90 % lower bound (B = 100,000);
- D > 0 / D < 0 counts;
- the per-cell means.

**Proposed materiality (decision D12):** a *material improvement* at a cutoff is a mean D ≥ **$10,000**, i.e. ≈ 2.6 % of
New L0's development net, with a one-sided 90 % lower bound **> 0**.

### 7.2 Risk non-inferiority (outcome-label conditions, never candidate gates)

These are **paired** differences of the lane winners, at C21 and C24:
- centre conventional DD ≤ +$2,500;
- confirmation p90 DD ≤ +$2,500;
- breach share (> $35,000) ≤ +2 percentage points;
- trade principal loss (liquidation) and banked-capital DD (liquidation) ≤ +$2,500 each.

Each needs its 80 % interval's upper bound below the margin, or the label is *trade-off* (§9).

### 7.3 Mechanism checks (H2)

- **Use.** The share of EXP lane winners with at least one book ON, with a Wilson interval.
- **OFF projection.** The winner's net minus its OFF projection, per book.
- **Arms and exits.** Arms, staged exits and placement exits per lot.
- **Census.** The census identity of the best centres.
- **The rule.** If EXP's winners are mostly OFF or their OFF projections are as good, the label is *search-path effect*,
  not *benefit*, whatever D is.

### 7.4 Reported metrics (all arms, the comparators, the final selections; never collapsed into one number)

| Group | Metrics |
|---|---|
| Profit | net after costs and interest; realized / unrealized; interest paid; costs paid |
| Drawdown | conventional marked DD in $ and **% of the $100,000 initial allocation**; liquidation-basis DD; reset and whole-run DD at validation |
| Capital risk | trade principal loss ($, % of funded principal; marked and liquidation); banked-capital DD (% of the initial allocation); starting-capital loss F |
| Giveback | U / E / F of the maximum-DD window; per-lot giveback to exit ($, % of peak profit); **protected profit under active stops** (Σ over staged exits of level − stage-1 level counterfactual at the same instant, report-only and labelled as an accounting identity, not a counterfactual P&L) |
| Activity | lots, trades changed vs OFF, arms, staged exits, placement exits, occupancy (principal-days), idle time, displaced and newly funded decisions (funding-log diff) |
| Tail | p90 / p95 / worst-10 %-mean DD of neighbourhoods; breach frequency with Wilson intervals; worst trade; MAE distribution (standard §5.8, §5.9) |
| Stress | 10 / 20 bps per side; 14 % interest; stop slippage 10 / 25 bps; D1 `next-open`; gap cost beyond the level |
| Evidence strength | independent episodes, the largest episode's share of net, family-removal and episode-blackout reruns (standard §2.6) |

## 8. Validation and robustness

1. **Chronological (independent lanes only).**
   - Each fold's selection is sealed and committed before its next slice opens.
   - The sequential verdict per arm (default: supported iff every fold has a primary, the sequential net > 0 and the
     sequential DD ≤ $35,000).
   - **Consequence, precommitted:** no support → not a deployment-qualified candidate without an explicit user
     decision (§1.8).
2. **Paired next intervals** (C19 → 2020–21, C21 → 2022–23, C24 → 2025–26).
   - Interval net and DD differences with the Stage B-style non-inferiority tests.
   - All labelled **retrospective, previously inspected history**.
3. **Neighbourhoods.** The standard instrument (§5.5); the §5.9 training neighbourhood on the next slice; tail severity
   (§5.8).
4. **Regimes and loss tails.** 2018 Q4, 2020-02/03, 2022, 2025-04 shown separately. These are descriptive; no selection
   is informed by them.
5. **§3.5-style decomposition for the final selection C** (report-only):
   - **A**: New L0 (OFF);
   - **B**: New L0 with C's staged genes (no re-optimization);
   - **C**;
   - **C with staged OFF**;
   - the same for N/original.
6. **No validation feedback.** 2025–2026 opens once, after the frozen selection. A failure is a result, not a reason to
   search again.

## 9. Outcome labels (frozen before search)

| Label | Conditions |
|---|---|
| **Beneficial** (merits a successor study) | material improvement (§7.1) at C21 **and** C24; risk non-inferior (§7.2); mechanism confirmed (§7.3); the EXP procedure chronologically supported (§8.1) |
| **Trade-off** | material improvement, but a risk margin fails, or support is lacking at one primary cutoff |
| **No material difference** (keep OFF) | the material-improvement condition fails at both primary cutoffs, with lanes not budget-bound beyond the extension block |
| **Search-path effect** (keep OFF) | D > 0 but the mechanism check fails |
| **Harmful** (keep OFF) | the upper 90 % bound of D < 0 at a primary cutoff, or a risk margin clearly worse |
| **Inconclusive** | budget-bound after the extension block, or the primary cutoffs disagree |

**Why a beneficial finalist still needs a successor study.**
- EXP's domain is a superset of CTRL's, so part of any training superiority is mechanical (as with P3 in Stage B).
- All intervals are previously inspected.
- Informed advantages dominated earlier studies.
- A beneficial result therefore supports **including staged genes in the comprehensive N/original successor
  optimization** (a separate, later authorization), not adoption.

## 10. Research artifacts (all committed except git-ignored archives, which are recorded by hash)

- **Governance:** `PROTOCOL.md`, `AMENDMENTS.md`, `STANDARD_ADOPTION.json`, preflight output, `RESEARCH_RECOVERY.md`.
- **Seals:** `seals.jsonl`; frozen gates; the door authorization; `FROZEN_SELECTION.json`.
- **Manifests:** versioned manifests of the rule (RC 3 / Growth 1.5.0 versions, the canonical configuration schema)
  and of every comparator and selection (identities, canonical JSON, evaluation keys).
- **Candidate populations:** every centre, by arm, cell and lane; the census tables; budget accounting (requested,
  fresh, hits, proposals, stop reasons).
- **Ledgers:** exact funded-lot ledgers and funding logs for the comparators, fold primaries, final selections and their
  OFF projections; staged diagnostics per lot.
- **GPU provenance:** attestations, receipts and telemetry per job; the acceptance record hash and its evidence; parity
  reports.
- **Handoff:** a portable ZIP with `SHA256SUMS.txt`, excluding archives, datasets and builds, with their hashes recorded.

## 11. What this proposal does not do

- It does not start Priority 4.
- It does not change P0, the standard, NL0 1.0.0, New L0 or N/original.
- It does not add symbols or Growth·GDX.
- It does not deploy or merge into `main`.
