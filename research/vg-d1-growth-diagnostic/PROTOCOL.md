# Protocol — Priority 3A: GDX Growth participation and neighbourhood risk (diagnostic of Priority 3)

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
substantive stage). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

A **bounded, retrospective, read-only diagnostic** of Priority 3's frozen subjects (`research/vg-d1-growth-joint/`).
It searches nothing, selects nothing, ranks nothing for selection, retunes nothing and relabels nothing. Priority 3's
classification, gates and results stand as sealed.

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `1.1.0`, sha256 `e86b0160e0d757948da46194481aeb961b59afa841c3e4d6428f266b978beff8` |
| Read / adopted (UTC) | 1.0.0 read in full 2026-11-09T13:25Z; 1.1.0 written by this task from the brief's agreed decisions (§7) and registered 2026-11-09T13:45Z; adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `research/vg-d1-growth-diagnostic/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/vg-d1-growth-diagnostic`; every stage calls `requireStandardAdoption`) |
| Scope | `diagnostic` (standard §0.1: §1, §2.1, §3.4, §5, §6 and the report-only §2.8, §2.9 apply; §4 does not — nothing searches) |
| Brief | `research/vg-d1-growth-diagnostic/brief/BRIEF.md`, sha256 `e5e420bdd023e4112147af7b24c65436541be074ef89ada7d7d2d57eab8ce509` (215 lines, read in full) |
| Branch / base commit | `research/vg-d1-growth-diagnostic` in the main checkout, from `76e402aa` (the end of Priority 3); code `src/vg-d1-growth-diagnostic/`; command `npm run vg-diag -- <command>` from the repository root |
| Migration | none: the study adopts 1.1.0 from the start. Priority 3 keeps its pinned 1.0.0 (its records are not touched) |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement |
|---|---|---|---|---|
| AD1 | §1.8, §4 | adaptation | No search, no earlier-cutoff repetition, no selection, no roles: a diagnostic of frozen selections (§0.1). | — |
| AD2 | §5.1 | adaptation | No new parity stage: Priority 3's evaluation code is used unchanged and guarded by its frozen evaluation digest `147cad7c…` and closure digest `f7fc49aa…`; **every replay must reproduce its sealed Priority 3 record field for field** (centres, archived draws, FULL rows), which replaces a parity stage for the same engine. | — |
| AD3 | §6.3 | adaptation | No tuning benchmark (§6.3: diagnostics report observed use); single-process stages, each a contained unit. | — (brief §8) |
| AD4 | §1.2, §1.4 | adaptation | FULL (2025-01-02 → 2026-10-30) is opened only to explain already-frozen subjects whose FULL results Priority 3 already sealed, under Priority 3's frozen-selection guard, with the subjects and questions frozen here (§8). | — (brief §3) |

## 1. Questions, objective, outcomes

The brief's four questions:

1. Why did the newly optimized VGT + GDX Growth pools mostly fund only VGT, although the existing Growth #4 + GDX
   Growth (Appendix A) pair funded both?
2. How much is attributable to signals/filters, real capital competition, unfunded virtual positions, search coverage,
   or promotion/selection rules?
3. Are A's and B's modest neighbourhood p90 DD overages isolated threshold misses or symptoms of meaningful weaknesses?
4. Should the next step be a larger Priority 3 search (3B), or a bounded current-versus-funding-aware comparison
   brought forward from Priority 5?

- **Objective / primary rule:** not applicable (a diagnostic; standard §7.2 `not-applicable`).
- **Valid outcomes:** explanations with stated uncertainty; "unresolved pending a separate implementation" where a
  counterfactual needs another funding lifecycle; a recommendation for the user's review. Never a new winner, a new
  validation sweep or a changed classification.
- **User-directed consideration (standard 1.1.0 §2.8).** The user accepts A and B as candidates for further
  consideration despite their Q3 failures (brief, "Assignment"). Every record keeps three fields apart: the original
  gate verdict (A and B: fail Q3, as sealed), the descriptive evidence (this study), and that consideration (the brief,
  2026-11-09, scope: further investigation only). It does not raise the $35,000 budget, set a p90 tolerance, accept
  all neighbouring losses or relabel Q3.

## 2. Prior knowledge and provenance

- Everything here was examined before: Priority 3's development records, its one-time validation, and the incumbents'
  histories. The validation window is **previously examined history**; its replay here is explanation, not validation.
- The known values the brief lists (A–D on development, validation and full history; their confirmation statistics)
  are verification targets only.

## 3. Subjects (frozen; `DIAGNOSTIC_MANIFEST.json`)

Every member of Priority 3's sealed C24 qualification record (`results/folds/C24/selection.json`, 30 members) and of
its sealed Growth-pair qualification record (`results/gpair/C24/selection.json`, 14 members), with the exact
configuration, enabled components and sealed centre record from those records (sha256-verified): 44 distinct members
under 45 keys (the independent primary XP is also the finalist I01; the two Growth-pair controls appear in the second
record only). Every id is recomputed from its sealed configuration:

| Key | Subject (Priority 3 label) | Role here |
|---|---|---|
| A | VG #2 + Growth #4 (VGT) + Appendix A (GDX) `d4cde313…` | unchanged four-component (fails Q3) |
| B | VG #2 + Growth 08500a60 (VGT) + Appendix A (GDX) `676731bf…` | unchanged four-component (fails Q3) |
| C | VG #2 + Growth #4 (VGT), three components `f324035d…` | three-component control |
| D | VG #2 Balanced `7a377d49…` (`S8-VG-F24-3`, D1·GDX `d1-7b99d2833d` + D1·VGT `d1-bd80e32ee4`) | D1-only control |
| GP4, GP085 | the Growth-only pairs #4 + Appendix A `0f17bddb…`, 08500a60 + Appendix A `008233e8…` | Growth-only controls |
| IP | `C24/informed#1 profit` `575545f4…` | the final (informed) primary |
| XP | `C24/indep/GDX-rise_VGT-rise#1 profit` `86d25530…` | the independent primary |
| SP | `staged: VG #2 + C24/gpair/GDX-breakout_VGT-rise#3 profit order` `d3bc1484…` | the staged primary (every staged role) |
| G01–G12 | the 12 Growth-pair shortlist members (arm B: 4 cells × 3 structural slots) | all 12 qualified; 3 hold Growth-pair roles |
| I01–I16 | the 16 arm-D C24 finalists (4 cells × 4 structural slots) | all 16 qualified; 4 hold independent roles |
| O01–O08 | the other C24 members (informed #2–#4, the two other staged, Priority 2's two VGT-only controls, VG #2 + 08500a60) | context |

**Three distinct sources** (never confused): VG #2 is the paired D1 configuration `S8-VG-F24-3`; Growth #4
(`420cd989e4fa7749`) and 08500a60 are **VGT** Growth books; Appendix A is the browser-selected **GDX** Growth book
reconstructed by Priority 3 as `07cac3329fc7a520`.

## 4. Data, doors, windows, ceilings

- **Data:** Priority 3's pinned canonical files (`data/VGT/data.csv` `2ee06310…412e`, `data/GDX/data.csv`
  `77dba9b2…5049`) through its verified doors: **D24** (2016-01-04 → 2024-12-31, both symbols' byte-prefix files
  verified by size, sha256 and last row before every opening) for all new work; **FULL** (→ 2026-10-30, the common
  complete endpoint) for stage F only, under Priority 3's guard (`FROZEN_SELECTION.json`, read-only, sha256
  `e29e35e2…`). Openings are logged in this study's `results/doors.jsonl` (never Priority 3's).
- **Conventions (harmonized, Priority 3's):** one fixed $100,000 principal budget, no compounding, 5 bps per side,
  11% simple interest (365 days), stops at the stop or the gapped open, fractional shares, funding from 2016-01-04,
  D1 arming once its reference high exists. **Native bridge:** VG #2 with Study 8's 2017-06-15 arming must reproduce
  $260,223.13 / $17,280.74 / 36 lots / 14 refusals (D24) and $334,911.93 / $21,303.61 (FULL). The main diagnosis uses
  the harmonized convention.
- **Continuity:** FULL runs are continuous from 2016-01-04; period net = the change of the marked net; the reset
  validation DD and the whole-run DD are reported separately (Priority 3's records carry both).
- **Ceilings (frozen; ceilings, not targets), enforced in code across every sealed stage record:** 4,000 fresh
  development simulations; 64 full-history simulations; 256 probe configurations (a subset of the development count);
  4,000 observer book runs (the Growth engine re-run for its decision log, and the single-crossing gate checks).
  **Planned:** development 46 (R) + 890 (N) + 240 (P) = 1,176; FULL 10; probes ≤ 238.
- **Stop rule.** Any reproduction mismatch, reconciliation failure or pin failure stops the stage and every dependent
  stage; nothing is regenerated, tuned or relabelled to make it pass.

## 5. Engine and the read-only observer (stage R; `observer.ts`, `growthLog.ts`)

### 5.1 The canonical run, unchanged

Each subject runs through Priority 3's `evaluate.ts` `run` (detail on) and `recordOf`, unchanged; its record must equal
the sealed one **field for field** (the sealed JSON's encoding of non-finite numbers included) before anything is
derived from it. The current shadow semantics are preserved and only observed: a refused entry starts the component's
virtual trade; funding never feeds back; freed capital never revives a refusal.

### 5.2 The Growth decision log

The Growth books are re-run with `simulateGrowthWith`: `books.ts` `simulateGrowth` with an optional filter on the base
decision list. Unfiltered it is the same call on the same inputs, and its trades must equal the pooled run's virtual
book trade for trade (`sameBook`), else the stage fails.

### 5.3 Definitions (the participation stages of standard 1.1.0 §0.3)

Per component and per window (development; on FULL, the development and validation windows separately):

1. **Availability:** sessions; the first evaluable session of the entry (Rise: bar N − 1; breakout: the first session
   with every observation available); first raw crossing; first decision; **virtual** invested / pending / flat
   sessions (closes at which the virtual book holds a position / awaits its fill / neither).
2. **Raw conditions and crossings.** *Raw condition:* a session close at or above the Rise threshold (the canonical
   scanner's C_i), or meeting every breakout condition. *Potential crossing:* the scanner's base signal (Rise: an edge
   C_i ∧ ¬C_{i−1}; breakout: a qualifying session). Independent crossing episodes: a new one more than 10 sessions after
   the last.
3. **Dispositions, filters, eligibility** from the engine's log: taken at its crossing; deferred (an entry gate blocked
   it and eligibility armed an opportunity); vetoed (blocked, eligibility off); rejected while the virtual book was
   invested or had an order pending; opportunity events (armed, blocked evaluations, decided, consumed, expired,
   invalidated by reason); continuation setups and signals; orders pending at the end.
4. **Actionable decisions** = the virtual trades, by source (base at its crossing, eligibility later decision,
   eligibility renewal, continuation method); independent virtual episodes (start > 10 sessions after the latest
   virtual exit). **Funding:** pool decisions granted / refused, refusals by occupant component (a real lot or a
   reservation).
5. **Funded:** lots, partial exits (apart), funded episodes, principal-days (Priority 3's definition), closes held,
   booked P&L, wins/losses, mean holding days, open at the end.

**Pool time:** closes held (a funded lot open), reserved only (an order granted, unfilled), idle — a partition.

### 5.4 Refusal timelines (every refused decision of every component)

For each refusal ("slot occupied"): the occupant (lot or reservation, its component, its release); the refused
trade's own hold (decision → final virtual exit; open or unfilled: to the end); its closes split into **blocked** (the
original occupant still holds), **re-occupied** (another lot holds or is reserved) and **idle overlap** (nothing holds
or is reserved) — a partition, never double counted; the later occupants; the book's next decision and the sessions
from the virtual exit to it.

**Inside the idle overlap (Growth books):** every raw-condition close and every potential crossing, and for each
crossing **its own gates at its own instant**: the Growth engine re-run with that single base decision
(`simulateGrowthWith` filter): the book flat, nothing pending. The trend filter, the Drawdown Recovery Gate and both
scanners read prices only, so the answer is a completed-data predicate: *pass*, *blocked: reason* (eligibility would
arm an opportunity: **unresolved**), or *blocked*. A pass is **not** a claimed missed trade: whether a funding-aware
lifecycle would have been flat, what it would have done with the open virtual trade, and the eligibility and
continuation states it would have had are **unresolved pending a separate implementation**. No fill, profit or
counterfactual ledger is computed. Unfunded virtual nets are descriptive and never summed as achievable improvement.

### 5.5 The drawdown episode and ledger divergence

- **Episode:** the whole-run DD's peak and trough instants; each lot's marked value at both (the pool's own marking
  rule); the contributions must sum to −DD within $1e-4 (else the stage fails); the dominant (most negative) lot.
- **First divergence** of a ledger from a reference (the subject's centre) in entry order: same ledger; changed exit
  (longer / shorter hold / partial sales); admitted (a trade refused in the reference); displaced (a reference lot
  refused here); changed signal (a new decision here / a reference decision absent here).

## 6. The search and promotion audit (stage S; `archive.ts`; archives only, nothing evaluated)

For Priority 3's C24 lanes — arm B Growth-pair (4 cells), arm D independent (4 cells), arm C informed (1 lane) — from
the sealed search records and the job archives (opened read-only, binding checked: study, job, door D24, evaluation
digest; archive sha256 pinned at the freeze):

- **Stages:** screen (regenerated exactly from its seed labels and matched to its archived evaluations), plausible,
  promoted (rung 1), island proposals (rung 1), rung 1 (all), rung 2, rung 3 + refinement endpoints, shortlist,
  qualified. **Verified:** screened, unique, plausible, rung-1 centres and feasible counts must equal the sealed
  counts.
- **Participation class** of every centre from its own archived record: both Growth books / VGT Growth only / GDX
  Growth only / no Growth; and why Growth·GDX received nothing: no Growth·GDX decision (signals/filters), every decision
  refused (capital), funded; the Growth·GDX virtual-trade count bucket.
- Per class and stage: counts, best and median centre net, best robust net and median p90 (rung fits); rung-1 failed
  criteria by class; the best feasible member's rank by net and robust net; rung-2 promotion reasons by class; the
  shortlist's classes.
- **Screen structure** (the screen is a quasi-random design, so unselected): by each Growth·GDX structural switch, the
  share of proposals with no Growth·GDX decision, with Growth·GDX funded, both funded, plausible.
- **Appendix A's representation:** proposals whose Growth·GDX structure equals Appendix A's (all eight switches), the
  nearest by Priority 2's configuration distance, the best such centre. Its informed provenance is kept explicit;
  absence from an independent lane is not an error.
- **The whole archived volume** (every evaluation, centres and neighbours) by class.

What cannot be recovered is reported as such (for example rung-3 promotion reasons, which were not recorded).

## 7. Neighbourhood risk (stages N and P; `risk.ts`)

### 7.1 Reconstruction (archives only)

For A, B, C, D, IP, XP, SP (`qualify-C24`) and GP4, GP085 (`qualify-gpair-C24`): the confirmation family (3 × 128,
labels `('confirm', rep, 'C24')`, scope joint — `g` for the Growth pairs — scale 1, pooled with duplicates across reps
dropped), small (0.5×), wide (1.5×) and each scope family, row by row (`rowsOf` = `space.ts` `neighbourhood` with the
Latin-hypercube row kept, checked against it); every draw's archived record read back; **the sealed statistics must be
reproduced exactly** (`nbStats` equal to the sealed object). Disclosed per subject: inputs perturbed, inactive inputs,
and inputs of **disabled** books that the joint scope perturbs although they are behaviourally inert (C, D), clipping,
distinct ledgers, draws equal to the centre.

### 7.2 Statistics (report-only; standard 1.1.0 §5.8 — never a gate)

Centre, median, p90 (with a distribution-free 95% order-statistic interval), p95 and worst DD; breach share above
$35,000 with its Wilson 95% interval; mean excess among breaches; **worst-10% mean DD** (the mean of the ⌈0.1 n⌉
largest drawdowns: 39 of 384); distinct ledgers among the breaches; net median, p10, p90, mean, worst and the share
positive; the same for small, wide and every scope. Quantiles interpolate linearly (Priority 3's `quantile`).
Perturbation frequencies are not probabilities of future market losses.

### 7.3 Replays (D24; selection rule frozen)

- **Every** confirmation draw of A and B (384 each); the **worst ⌈0.1 n⌉ = 39** draws by DD (ties by id) of C, D and
  IP; plus each subject's centre. Each replay must reproduce its archived record field for field.
- Per draw: net, DD, breach, first divergence from the centre's ledger (§5.5), the DD episode by lot, the dominant
  component, lots by component, and the inputs moved (centre, value, u, radius).
- **Association** (descriptive): per active input, Spearman's ρ between its u and the draw's DD, and the breach share
  for u < −⅓, |u| ≤ ⅓, u > ⅓.

### 7.4 Probes (stage P; D24; design frozen; every result kept)

One input moved by u × the instrument's radius (rounded to the fine grid and clipped exactly like the instrument),
everything else at the centre; a probe identical to the centre or to an earlier probe is not run (counted):

| Set | Subject | Inputs | u |
|---|---|---|---|
| P1 | A | every active numeric input of Growth·GDX (Appendix A: 19) | −1, −½, −¼, +¼, +½, +1 |
| P2 | B | every active numeric input of Growth·GDX (19) | −1, −½, +½, +1 |
| P3 | A | every D1·GDX input (8) | −1, −½, +½, +1 |
| P4 | A | the two P1 inputs with the largest DD range over their P1 values and the centre (ties by name), crossed | {−1, −½, +½, +1}² |

At most 114 + 76 + 32 + 16 = 238 configurations (≤ 256) and the two centres. The categorical Growth·GDX initial-stop-OFF
toggle is Priority 3's sealed report-only toggle, reported separately from these numerical probes. Probes are not
phenotypes, receive no validation and are never proposed as replacements.

### 7.5 What the risk analysis reports

The mild, intermediate and worst breaches of A and B (the smallest excess, the median breach, the worst) and IP's
worst draws, traced; concentration by component, symbol and dominant lot; whether breaches share one drawdown episode
or many; the contrast "IP passed Q3 with rare, severe breaches; A and B failed it with frequent, milder ones" without
calling either unconditionally safer; what accepting A's or B's p90 miss would and would not accept (finite draws,
radius dependence).

## 8. The retrospective FULL replay (stage F; questions frozen)

- **Subjects:** A, B, C, D, GP4, GP085, IP, XP, SP (each with a sealed FULL row in Priority 3's validation record) and
  VG #2 native. Each must reproduce its sealed FULL record field for field.
- **Questions:** Q-F1 at which stage each subject's Growth·GDX participation stopped or occurred in 2025-01-02 →
  2026-10-30; Q-F2 the refusals, occupants and idle overlaps after the boundary; Q-F3 which components booked the
  validation P&L and which lots crossed the boundary; Q-F4 exact reproduction.
- **Rule:** explanation only. Nothing is selected, ranked, tuned or relabelled from this window.

## 9. From evidence to the recommendation (the brief §6)

The recommendation follows the brief's table, from the evidence of §5–§8:

| Evidence | Next step |
|---|---|
| Competitive both-funded regions underexplored or lost in promotion | 3B with protected exploration/promotion and a larger measured budget |
| Parameter interactions or holding periods explain poor coordination | 3B focused on them, broad discovery kept |
| Material idle-capital / unfunded-virtual overlap | a bounded current-versus-funding-aware comparison from Priority 5 before 3B |
| Both | the architecture question first, then optimization under a chosen model |
| GDX participation consistently detrimental | report it; no forced trades |

The report states what the diagnostic cannot establish. If early architecture work is recommended, it proposes a
bounded specification only; nothing is implemented or run.

## 10. Resources and recoverability

Each heavy stage is one transient user unit in `vgdiag.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0 on the
slice and the unit; `KillMode=mixed`, `Restart=no`), launched by `npm run vg-diag -- launch`, one at a time; Claude
and tmux stay outside. Single-process stages (no worker pool); observed memory is reported. A stage is a deterministic
function of the frozen inputs: an interrupted stage writes nothing and reruns from its start (no sealed partials).

## 11. Integrity

The freeze records this file's, the amendments', the brief's, the adoption manifest's and `DIAGNOSTIC_MANIFEST.json`'s
sha256, this study's code digest (Priority 3's evaluation files plus this study's modules), Priority 3's verified
digests, its pinned records and archive sha256s, the data and door pins, HEAD, the ceilings and the resources. Stages
refuse to run unless the preflight passes, the freeze is committed and unchanged, the code digest matches, Priority 3's
pins verify and (S, N) the archives match their pins. Records are sealed write-once (0444, `results/seals.jsonl`;
`npm run vg-diag -- verify`). The checkpoint is `RESEARCH_RECOVERY.md`.

## 12. Reporting

`REPORT.md` answers the four questions with evidence links and a recommended sequence; the participation funnels and
refusal / idle / virtual-state timelines with dated examples; the archive coverage and promotion audit including what
could not be recovered; the A/B/C/D/IP risk comparison, severity statistics, failure traces and every probe; the
documentation change summary (enacted standard 1.1.0, preserved classifications, proposals awaiting review).

## 13. Disclosures (before the freeze)

Engineering before the freeze ran on D24 and the archives only, to build and check the code: the reproduction of A,
G01 and GP4 (their records equal the sealed ones; their funnels and refusals were printed); the reconstruction of
A, B, C, D and IP's sealed neighbourhood statistics (reproduced exactly; their tail statistics and the top input
associations of A and B were printed); one Growth-pair lane's audit counts (all equal to the sealed ones); and the
active-input counts of A and B. Priority 3's sealed scope and toggle evidence (already in its report) was read to
design §7.4. The probe design covers every active input of the suspected books and fixes P4's pair by a rule, so no
probe was chosen from a printed association. No FULL data were opened before the freeze.
