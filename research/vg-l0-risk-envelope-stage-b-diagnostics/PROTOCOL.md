# Diagnostic plan RES-BD 1.0.0: Stage B search-archive census and profit-giveback decomposition

**Status: written before any diagnostic tool ran on a real Stage B record.** This is a post hoc, report-only
supplement to the completed and sealed Stage B study (`research/vg-l0-risk-envelope-stage-b/`, RES-B 1.0.0). It is
**not** a Stage B amendment, and it is **not** official Stage B search evidence.
- It never changes Stage B's precommitted outcome label (*P3 non-inferior and superior*), its negative adoption
  recommendation, a sealed record, a seed, a gate, a selection or a statistic.
- It runs no optimization and no candidate search.
- It adopts nothing and deploys nothing. It does not change the optimization standard or NL0 1.0.0, does not replace
  New L0 or N/original, does not merge into `main`, and does not touch a broker.
- After the plan is committed, every change goes to `AMENDMENTS.md` (append-only).

- **Namespace:** `research/vg-l0-risk-envelope-stage-b-diagnostics/` (this directory) and
  `tools/vg-l0-risk-envelope-stage-b-diagnostics/`. Nothing is written into `research/vg-l0-risk-envelope-stage-b/`
  or `tools/vg-l0-risk-envelope-stage-b/`.
- **Branch:** `research/vg-l0-risk-envelope-stage-b-diagnostics`, from Stage B's final commit `1c1f9e72` (never
  merged).
- **Authority:** the user's assignment `brief/BRIEF.md`, sha256
  `b15e97463474d71bcc9f90cb7dc86ccca6b20938d2c2de872d3be73f63078fd0`. It was read in full, to its §8 "Explicit stop
  conditions" and success criterion, before the session's first clock reading, 2026-11-23T07:25:38Z (`date -u`). It authorizes exactly two diagnostics, Stage B PROTOCOL §10's
  census and its profit-giveback replay, and it lists the deliverables.
- **Standard:** `docs/research/OPTIMIZATION_STANDARD.md` 3.0.0, sha256
  `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1`, read in full by 2026-11-23T07:31:21Z. Scope
  **diagnostic** (§0.1): §1, §2.1, §3.4, §5 and §6 apply, and the diagnostic never searches. Evaluation backend
  **non-official CPU**, purpose `diagnostic` (§9.8, §9.11). The manifest is `STANDARD_ADOPTION.json`.
- **Frozen Stage B authority read first:** `PROTOCOL.md` (sha256 `603f2515…`, §10 report-only analyses), `AMENDMENTS.md`
  (P1, P2, D1, D2), `DECISION_REGISTER.md` (U3), `REPORT.md`, `results/analysis/TABLES.md` / `SUPPLEMENT.md`,
  `RESEARCH_RECOVERY.md`, `EXECUTION_PLAN.md`, and the sealed `results/` records (`results/seals.jsonl`, 22 files).

## 1. Questions

1. **Primary.** How much of the extra drawdown of P3's selected phenotypes is giveback of unrealized profit on winning
   positions, and how much is erosion of previously banked profit or loss of original capital?
2. **Secondary.** Across every centre the Stage B search actually visited, what changed between P0 and P3? That covers
   qualification, profitability, risk and search-space coverage.

No outcome is presupposed. Facts read from archived records are kept apart from inference.

## 2. Inputs (read only)

| Input | Use | Identity |
|---|---|---|
| `research/vg-l0-risk-envelope-stage-b/cache/jobs/C2x-search/archive.sqlite` (git-ignored, 4.4–5.2 GB) | Diagnostic A, from a **copy** only | sha256 before processing: `results/verification/archives-before.sha256` (all 12 Stage B job archives, 2026-11-23T07:32:35Z) |
| `…/cache/jobs/C2x-qualify/archive.sqlite` (≈ 0.56 GB each) | the qualification replay and the confirmation draws (§3.3), and the bit-for-bit parity of §4.2, from a **copy** only | same file |
| Stage B sealed records: `results/search/C2x.json`, `results/qualification/C2x.json`, `results/selection/C2x.json` | the replay targets, subjects and GPU reference values | `results/seals.jsonl`, verified before and after |
| Market data via Priority 3's verified training doors **D19, D21, D24** | Diagnostic B's CPU replays only | the door pins; openings logged in **this** namespace's `results/doors.jsonl` |

- The archives are uncompressed SQLite, cleanly closed (no `-wal` / `-shm`). No `.sqlite.zst` restore is needed.
- **Copies:** they go to the git-ignored scratch `.cache/vg-l0-risk-envelope-stage-b-diagnostics/jobs/<job>/` on the
  main disk, not tmpfs. One cutoff's search archive is copied at a time. Each copy is sha256-equal to its original and
  passes `PRAGMA integrity_check` before use. An original is never opened, by SQLite or otherwise, except to hash it.
- **Doors D23 and FULL are not opened.** No interval or validation record is recomputed. Sealed interval results are
  quoted only as Stage B reported them.

## 3. Diagnostic A — the search-archive census (zero evaluations)

### 3.1 Lane replay

The method is Stage B's `tools/vg-l0-risk-envelope-stage-b/census.ts` design, with Stage A's established extension
`tools/vg-l0-risk-envelope-sensitivity/population.ts`: the `fitMany` capture and the regeneration of measured
neighbourhoods.
- **One cutoff at a time.** The 64 lanes of both arms are replayed together with Stage B's own runner. That runner is
  `src/vg-l0-risk-envelope-stage-b/stages.ts runLanes`: the same plan, one barrier loop, the same budget, lane cap and
  finishing reserve as the official job.
- **The Lab.** It is bound exactly like the official job (study, job, door, door pin, the sealed backend and code
  digest), to the archive copy. Its pool **refuses every evaluation**.
- **Pass conditions** (any failure stops the census):
  - every request is an archive hit;
  - `fresh = 0`;
  - the refusing pool is called **0** times;
  - the archive's row count is unchanged;
  - every replayed `LaneResult` equals the sealed one (`deepDiff` on the JSON forms, zero differences, 64 / 64 lanes);
  - each arm's total requested evaluations equals the sealed `requestedByArm`;
  - the original archive's sha256 is unchanged after the run.

### 3.2 Capture and assessment

**Capture.**
- Every centre request is recorded with its arm, lane and stage:
  - the screen;
  - rung 1, split into the promoted screen and island children;
  - refinement starts and moves;
  - rung 2;
  - rung 3, and refinement endpoints.
- Centres are de-duplicated by canonical configuration identity (`cfgId`). Every requesting source is kept. Two
  different archived records for one identity stop the census.

**Both-policy assessment.** Every unique centre is assessed under both policies with the frozen functions:
- `src/vg-l0-risk-envelope-pilot/fitness.ts plausibleArm`, the screen and centre plausibility, with `arms.CTRL` (P0) and
  `arms.EXP30` (P3);
- `assessArm`, for the failing metrics, their dollar excesses and the binding metric. The binding metric is the largest
  excess normalized by its limit.

**Scope.** The profitable, funded centres with a valid envelope: `!error ∧ net > 0 ∧ mixed`. Every other centre is
counted with its reason (error, unfunded family, net ≤ 0).

**Measured neighbourhoods.** These are rung 1 = 16 draws, refinement = 16, rung 2 = 64 and rung 3 = 128. The draws use
common random numbers across centres and arms (labels `[rung, cutoff]`).
- Each measured neighbourhood is regenerated exactly, read from the archive copy (all reads must be hits) and assessed
  under both policies with the frozen `violationArm` (NL0's 1e-6 rounding).
- **Check.** Each arm that fitted the centre at that rung must get back its own search violation exactly, or the census
  stops.

### 3.3 Qualification replay and confirmation draws (zero evaluations)

- **The replay.** Stage B's frozen qualification (`src/vg-l0-risk-envelope-stage-b/qualify.ts qualifyMembers`, members
  from `stages.ts membersOf`) is re-run over a copy of the cutoff's qualification archive with the refusing pool.
- **Check.** Its evidence must equal the sealed evidence (`sealedEvidence` form), or the replay stops.
- **The draws.** Every member's pooled confirmation family (3 × 128 draws, de-duplicated as `pooledStats` does) and
  selection family (2 × 128) are read back draw by draw. They must reproduce the sealed family statistics exactly.

### 3.4 Measurements (per cutoff)

**Counts and overlap.**
- Total requests: by arm and stage, and from the sealed lanes.
- Unique centres; profitable and funded centres; centres per arm and per arm overlap.

**The common-candidate counterfactual on the identical candidate set.**
- Counts of both / P0-only / P3-only / neither, by originating arm (CTRL, EXP30, both) and by highest stage reached.

**Screen and rung feasibility under both policies.**
- **Failing and binding limits:**
  - marked DD > $35,000 (P0);
  - marked DD > $40,000, trade principal loss (liquidation) > $25,000 and banked-capital DD (liquidation) > $30,000
    (P3).
- **The ($35k, $40k] band:** the centres with marked DD in that band, how many P3 admits, and how many its PL or BD
  gate excludes.
- **Centres that pass P0 but fail P3,** and why.

**Profitability.**
- The highest centre net and quantiles (p50, p75, p90, p99, max), plus the top-10 mean, under each policy on the common
  population. These are always labelled "centre plausibility": a plausible centre is **not** a qualified finalist.

**Search-stage attribution.**
- On the screen, both arms propose identical configurations. Any P0 / P3 difference there is therefore pure
  eligibility.
- After the screen, the arms' populations differ by search path.
- This is reported beside Stage B's sealed decomposition of D (REPORT §5, reused, not recomputed).

**The three levels, kept apart throughout:**
1. centre plausibility, the screen or rung centre;
2. rung-fit feasibility, the centre plus the neighbourhood p90 gates;
3. finalist qualification, Q1–Q6 on the sealed union qualification.

**A zero-evaluation giveback bound on every centre and every confirmation draw.**
- **The bound.** Let H be the banked high at the trough of the maximum-drawdown window. Then E + F ≤ H − M(trough) ≤
  banked-capital DD (marked, whole path). Hence U ≥ max(0, DD − BD_marked).
- **Its use.** It is a lower bound on the unbanked-giveback dollars of the maximum-drawdown window, computable from the
  archived envelope with no replay.
- **Its check.** It is verified empirically against Diagnostic B's exact partition.
- **Its label.** It is a bound, never the decomposition itself.

## 4. Diagnostic B — the profit-giveback and capital-loss decomposition (bounded CPU replays)

### 4.1 Subjects and fixed design

- **Subjects (per cutoff):** the sealed selection's interval subjects: the representative of every lane of both arms
  (64), which already include both arms' pooled P0 / RA1-original / RA1-adapted primaries, plus the two benchmarks, New
  L0 and N/original.
  - The benchmarks are descriptive frozen benchmarks only. They are never selectable and never seeds.
  - At most 70 configurations per cutoff (**≤ 210 in total**), each evaluated on its cutoff's training door.
- **Design.** Each subject goes through the existing `giveback.ts` design: the pilot's
  `tools/vg-l0-risk-envelope-pilot/diag-core.ts diagnose`, unchanged. It is run in forked workers. Each worker opens its
  door through Stage B's own `doorGuard` (use `diagnostic`) and `openStudyDoor` with **this** namespace's id.
- **Extra engine runs per subject.** Each worker also runs the canonical record `evaluate()`, for the bit-for-bit parity
  check, and one ledger replay for the lot and trade detail. That is at most 3 engine runs per subject.
- **Purpose and runtime.** Purpose `diagnostic`, `node --no-maglev`. The CPU results are non-official and never
  optimization evidence.

### 4.2 Parity: blocking

1. **To the cent (`giveback.ts`'s check).** Centre net, marked DD and the four envelope values (banked DD marked /
   liquidation, principal loss marked / liquidation), rounded to cents. They must equal the sealed GPU qualification
   evidence.
2. **Bit for bit (Stage A's G3 check).** The canonical CPU centre record plus its CPU envelope must equal the archived
   official GPU centre record in the qualification-archive copy (`deepDiff`, zero differences).
3. **Any mismatch** stops Diagnostic B before any substantive table is written.

### 4.3 Definitions (implementation-based)

**Portfolio metrics** are on one funded slot of C0 = $100,000. M is the marked net, R the banked (realized) net and
M^L the liquidation net (M minus the open shares' sale cost).
- **Conventional marked DD.** The engine's strict maximum minute drawdown of M (`result.dd.max`), in dollars. The
  denominator for percentages is C0.
- **Liquidation-basis DD** (DD^L). The same tracker on M^L.
- **Banked-capital DD** (`bankedDrawdown`). max_t [H_R(t) − M(t)], with H_R(t) = max(0, max_{u≤t} R(u)). It is reported
  on the marked and liquidation bases. P3 gates the liquidation basis at $30,000.
- **D3 account partition** (`src/risk-envelope/diagnostics.ts componentDrawdown`) of the conventional maximum DD window
  [t_p, t_t]. Mp = M(t_p), Mt = M(t_t), H = max(0, max_{u ≤ t_t} R(u)), and DD = U + E + F exactly:
  - **U, unbanked-profit giveback** = max(0, Mp − max(H, Mt)): open profit above the best banked level, given back;
  - **E, banked-profit erosion** = max(0, min(Mp, H) − max(0, Mt)): the decline between the banked high and the starting
    capital;
  - **F, starting-capital loss** = max(0, min(Mp, 0) − Mt): equity below C0 (net below zero).
  - **Giveback-dominated** (the existing design's flag) means U ≥ ½ DD.

**Lot and trade metrics.**
- **D3 lot attribution** (`metrics.ts attributeDrawdown`) of the same window. Each lot's change splits into giveback
  above its own break-even and deepening below its funded principal, with offsets. The lot and account lenses are
  never added or subtracted.
- **Trade principal loss** (`tradeRisk`). A lot's deepest P&L below zero against its own funded principal ($100,000),
  intratrade and at exit, after costs and interest. It is reported on the marked and liquidation bases. P3 gates the
  liquidation maximum at $25,000.
- **Trade giveback** (`tradeRisk.maxGivebackAboveBreakeven`). The largest decline of a lot's positive P&L from its
  running maximum. Also reported: peak profit, worst trade net, and whether the lot ended profitable.

**Usage rule.** "Principal loss" is a **trade** metric. "Starting-capital loss" (F) and "banked-capital DD" are
**portfolio** metrics. They are never used interchangeably.

### 4.4 Analysis

1. **Per subject.** Net, DD, DD^L, BD, PL, U / E / F (marked and liquidation), U's share, the giveback-dominated flag,
   the lot split, the episode dates and the representative trades of the window, and the trade-level summary.
2. **Paired, per cutoff.**
   - The 32 pairs (cell, replicate) per cutoff: EXP-30 representative minus CTRL representative, for each metric.
   - Stage B's frozen `summarize`: mean, the stratified paired bootstrap (B = 100,000, by cell), the 80 % interval and
     sign counts. The random numbers are `Rng.from('vg-l0-risk-envelope-stage-b', 'bootstrap', 'giveback', <metric>,
     <cutoff>)`, as in `giveback.ts`.
   - Medians and quantiles of each arm.
   - The count and share of giveback-dominated representatives per arm.
   - The cutoffs are nested (C19 ⊂ C21 ⊂ C24 training). They are never pooled as independent samples.
3. **Incremental DD of the P3 selections.** The mean paired ΔDD equals mean ΔU + mean ΔE + mean ΔF. This is an
   identity of arm-level component magnitudes, **not** an attribution of one shared episode: the two arms' maximum
   drawdowns are different episodes. It is reported with that label, with the arm-level decompositions, and separately
   for the EXP-30 representatives that P0 would reject (11 at C21, 12 at C24, 2 at C19 per Stage B §5).
4. **Episode illustrations.** For selected pairs, each arm's maximum-DD window, dates and the lots that drove it. They
   are shown side by side and never subtracted.
5. **Winners versus losers.** Lots that gave back gains but closed profitable, against lots that ended below principal.
   The reading notes how stops, gaps and occupancy bear on it, from recorded fields only.
6. **Benchmarks.** New L0 and N/original, descriptive only, on the same training doors.
7. **The neighbourhood view** (zero evaluations, §3.4 bound). The confirmation draws of every representative (384 per
   member): DD, the bound U ≥ DD − BD_marked, PL and BD, and the draws above $35k DD and their bound.
   - **Limit.** The exact D3 partition is computed for centres only. Confirmation draws are bounded, not decomposed,
     because a full CPU replay of 73,728 draws is outside this bounded design.

## 5. Statistical and interpretive rules

- Every result is a **post hoc, report-only supplement**. The Stage B label and recommendation stand, and are quoted
  unchanged.
- These are kept apart throughout:
  - selection-population differences (the census);
  - qualified-finalist outcomes (the sealed qualification);
  - trade-level risk decomposition (Diagnostic B);
  - subsequent interval behaviour (Stage B's sealed intervals, quoted).
- No new threshold is proposed as validated. A follow-up idea is written as a hypothesis for separately authorized
  research with new data.
- No search seed, envelope, training interval, stop rule or other knob is added.

## 6. Budget, resources and stop conditions

**Budget.**
- Diagnostic A: **0 evaluations**, proven by `fresh = 0`, refusing-pool calls = 0 and an unchanged archive row count.
- Diagnostic B: at most 210 subjects × 3 engine runs on the CPU, and **0 GPU evaluations**.

**Resources.**
- Each evaluating or replaying process runs as a transient systemd user unit in `vgl0rebd.slice` (MemoryHigh 44G,
  MemoryMax 48G, MemorySwapMax 0), under `node --no-maglev` with `GPU_POLICY_PURPOSE=diagnostic`.
- No GPU process. The official binary, GPU code, pins and the acceptance record are untouched.

**Stop and report** (brief §8). Any of these stops the work:
- a required archive is absent or fails integrity;
- the census needs a new evaluation, or cannot reproduce the sealed lanes;
- CPU financial results disagree with the archived GPU records;
- a fix would touch sealed methodology, official GPU kernels, accepted optimization code or selection rules;
- resources prevent a complete audited result.

**Defects** in the diagnostic tools are disclosed in `AMENDMENTS.md` (D*). They are fixed minimally in this namespace's
tools with a regression test, and the run is repeated. No metric definition, gate, seed, door or frozen result changes.

## 7. Outputs

- `READ_FIRST.md`, `REPORT.md`, `CENSUS_REPORT.md`, `GIVEBACK_REPORT.md`, `VERIFICATION.md`, `AMENDMENTS.md`,
  `DECISION_REGISTER.md` (proposals only, none adopted), `RESEARCH_RECOVERY.md`, `DATA_SCHEMAS.md`.
- `results/census/`, `results/giveback/`, `results/qualification/`, `results/verification/`: machine-readable JSON and CSV
  per cutoff.
- A portable ZIP with `MANIFEST.sha256`. It contains no SQLite archive, market data, cache or credential; those are
  named by path and sha256.
- Written analysis and Markdown tables only, no visuals (standard §7.7).
