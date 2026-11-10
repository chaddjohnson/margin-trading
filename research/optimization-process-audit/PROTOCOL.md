# Protocol — bounded optimization-process audit: archive reselection on Priorities 3B and 4A

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
Stage 1 rerun). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only). The experimental selection
formulas are deliberately **not** in this file: they are chosen after the Stage 1 mechanism audit and frozen in the
sealed, committed Stage 2 record (§7), under the constraints fixed here.

**Written before** any rerun, feature, cohort or next-period outcome of this study existed. Known before it: the
complete sealed records and reports of the subjects (3B, 4A) and of the context studies (Priorities 2, 3, 3C, 5A and
growth140-vgt-stable), including every **published** fold, sequential and validation outcome (§2). This is a
**retrospective study on heavily examined history, not a fresh holdout.**

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.0.0`, sha256 `2005a88c2e24f5e2ab4e461b0425f97d006781a45518f78d9f10fd9320f40105` (the registered current version; registry checked 2026-11-10T22:31Z) |
| Read / adopted (UTC, from `date -u`) | read in full 2026-11-10T22:31Z–22:40Z (with the registry, the template, the adoption template, the roadmap, `CLAUDE.md` and the context-recovery guide) / adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `research/optimization-process-audit/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/optimization-process-audit`; every stage calls `requireStandardAdoption` in code) |
| Scope | `optimization` — research on **selection** (a ranking choice), declared as a **bounded archive-reselection experiment with no new phenotype search**; not a no-selection diagnostic (brief "Read and reconcile") |
| Brief | `research/optimization-process-audit/brief/BRIEF.md`, sha256 `75842bfb3e0fa849cc298ed0da897c73bfe1daf289a1d75f9358adfc621062f1` (147 lines, 19,708 bytes, read in full through "Stop for review.") |
| Branch / base commit | `research/optimization-process-audit` in the main checkout, from `f52deea7` (the pushed end of Priority 4A); code `src/optimization-process-audit/`; `npm run opa -- <command>` from the repository root |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| D1 | §1.8, §3.4, §4 | **departure** | No complete search is repeated at any cutoff. Each subject's **actual, independently generated** cutoff candidate sets (C19, C21, C23, C24 archives and sealed shortlists) are reused; the inference is limited to **selection conditional on those archived discoveries**. No new strategy-parameter proposal is made. | Brief: "The user authorizes that scoped substitution for full new searches at earlier cutoffs: reuse the actual independently generated cutoff candidate sets and clearly limit the inference to selection conditional on those sets. Record this departure where the standard would otherwise require repeating a complete new search." |
| D2 | §0.2 [R], §2.6, §5.8 | **departure** | The **experimental** selection formulas (at most three, frozen in Stage 2) may use tail-severity statistics and episode or subperiod diagnostics, which are report-only in ordinary studies. This applies **only** to this audit's experimental policies; it changes nothing in existing or ordinary future studies, rewrites no historical verdict and does not change the standard. | Brief: "The user also authorizes testing up to three alternative selection formulas, including use of tail severity or episode/subperiod diagnostics that are report-only in ordinary studies. This permission applies only to the new experimental policies in this audit, with frozen formulas." |
| D3 | §2.3, §2.5 | **departure** | This study adopts **no new primary strategy** and no new roles: the subjects' sealed roles are the reference and controls; the objects compared are selection *policies*. The objective field names the reference policy (actual profit). | Brief: "Do not … adopt a new live/research portfolio"; "Do not automatically make a winning experimental policy the new optimization standard." |
| AD1 | §4.2 | adaptation | Budget units: **0 new search proposals**; "distinct candidates" counts distinct **archived** configurations re-evaluated on a next-period door (cap 600); backend evaluations cap **100,000 fresh** (all kinds), of which **≤ 800** on next-slice or full-history doors; archive hits counted apart (§9). | — (brief "Hard bounds") |
| AD2 | §6.3 | adaptation | No tuning benchmark: measured throughput and memory are reported (§10). All work runs in one in-process runner per stage (no worker pool), in a contained unit. | — (brief "Measure throughput and freeze a smaller operational plan if appropriate") |
| AD3 | §1.4, §1.6 | adaptation (stricter) | Next-slice doors open for **non-published** candidates only behind the sealed and committed Stage 2 policy freeze **and** Stage 3 choice/cohort record; FULL opens only behind the sealed and committed C24 freeze (§8), and only if the futility rule (§7.6) does not stop the audit. | — |
| AD4 | §5.1 | adaptation | The subjects' engines and conventions are reused **unchanged** (3B: Priority 3's pooled engine through 3B's configuration path; 4A: the same engine with only Growth·GDX enabled through 4A's builder). Parity is re-verified against the subjects' sealed records (§6.2), not re-derived against canonical engines (the subjects' sealed gates did that). | — |

No other departure from an [M] rule.

## 1. Questions, objects and valid outcomes

- **Questions** (brief "Questions to resolve", Q1–Q5): useful alternatives in the cutoff archives and where they were
  lost (Q1); whether cutoff-time information distinguishes them (Q2); episode reproduction and the instrument's
  apparent stability (Q3); whether ≤ 3 simple predeclared policies improve subsequent-period selections repeatedly at
  acceptable profit and risk (Q4); and the evidence for a process change (Q5).
- **Primary subjects:** Priority 3B `research/vg-d1-growth-expanded/` (multi-book VGT + GDX pool, architecture A) and
  Priority 4A `research/gdx-growth-standalone/` (standalone GDX Growth). Each keeps its own engine, parameter space,
  execution, costs, doors and accounting; their candidate sets are **never merged**.
- **Objects compared:** selection policies applied to each subject's archived **independent** candidate sets. The
  reference policy **P0** is the unchanged original rule (each subject's actual-profit role: highest centre net among
  qualified members; ties by the higher selection robust net, the lower centre DD, then the label). The subjects'
  sealed robust-profit, balanced and lower-drawdown role sequences are **contextual controls** (already published,
  not new discoveries). At most three experimental policies **P1–P3** are frozen in Stage 2.
- **Valid outcomes:** "merits further confirmation" for a policy (§7.5); a one-subject or risk-only signal; no
  demonstrated improvement ("stop investing in this approach"); a futility stop before Stage 4; a blocker that prevents
  valid inference. A negative or inconclusive result is a result.
- **Not in scope:** any new phenotype search, allocation/reservation/preemption/sizing/funding rule (Priority 5A's
  L0/L1/L2 comparison is not repeated), any change of a subject's gates, any change of the standard, any new
  live/research portfolio, Priority 4B, broader funding research, Priority 6.

## 2. Prior knowledge and provenance (disclosed; this is retrospective research)

- **Published outcomes already known** (sealed in the subjects): every fold role holder's slice P&L and slice DD, every
  role's sequential path, and the C24 validation of every frozen member and control. For example: 3B's independent
  procedure +$13,105.71 with a sequential DD of $60,874.87 (2020-02-19 → 2020-03-17), every role sequence breaching;
  4A's −$16,537.03 with $47,820.43 (2022-02-24 → 2022-09-29, unrecovered), every role sequence losing and breaching;
  4A's C24 primary trading nothing in 2025–2026; 3B's independent C24 primary +$55,329.36 in validation.
- **Hypotheses these outcomes motivated** (Priorities 2, 3, 3A, 3B, 3C, 4A reports; `results/inventory/CONTEXT_STUDIES.md`):
  episode concentration (the March 2020 rebound), dormancy behind eligibility filters, near-ceiling neighbourhood
  tails, local stability not transferring forward. The experimental families come from the brief and from these
  reports; their formulas are chosen with these outcomes known.
- **Not known before this study:** the next-period outcomes of every non-role-holder candidate in the archives (3B
  shortlists have 40 members per cutoff, of which 4 or fewer were evaluated on their slice), and every 2025–2026 outcome
  of a C24 member that was not in a subject's frozen validation set.
- **Shared market periods** across subjects and the context studies are **correlated evidence**, not independent
  replications (2020–2021, 2022–2023 and 2024 are the same slices in both subjects).
- **C4-refined** is the alias of 3B `C24/informed-fixed#1 profit`, an informed fixed benchmark; 4A `informed#2 robust`
  is a research candidate; the declined 3C partner stays declined. None is changed or relabelled here.

## 3. Data, doors and windows

- **Canonical files** (git-ignored, pinned, verified 2026-11-10T22:36Z): `data/GDX/data.csv` sha256 `77dba9b2…5049`,
  `data/VGT/data.csv` `2ee06310…412e` (identical to both subjects' pins); common complete endpoint **2026-10-30**.
- **Doors** (the subjects' physical byte-prefix doors, opened through each subject's own loader, verified by size,
  sha256 and last row): D19 → 2019-12-31, D21 → 2021-12-31, D23 → 2023-12-29, D24 → 2024-12-31, FULL → 2026-10-30.
- **Training doors** (features, reruns of centres and neighbours): the cutoff's own door (C19 → D19, C21 → D21,
  C23 → D23, C24 → D24).
- **Next-slice doors:** C19 → D21 (slice 2020-01-02 → 2021-12-31), C21 → D23 (2022-01-03 → 2023-12-29), C23 → D24
  (2024-01-02 → 2024-12-31), C24 → FULL (2025-01-02 → 2026-10-30, validation).
- **Data access rule:** every policy feature reads a training door only. A next-slice door is opened (a) in Stage 1
  only for already-published role holders and the C24 primaries' published records (reproduction), and (b) for any
  other candidate only after §7.3's sealed and committed record exists. FULL opens only in Stage 4 (§8). Every opening
  is logged in `results/doors.jsonl` with the guard record's sha256.
- **Continuity:** every run is one continuous causal run from 2016-01-04 under the subject's conventions; slice P&L =
  the marked net at the slice end − the marked net at the cutoff close; the slice (reset) DD and the whole-run DD are
  both reported; validation P&L = marked net at 2026-10-30 − marked net at the 2024-12-31 close.
- **Risk budget:** maximum minute DD $35,000 on one fixed $100,000 principal budget (never 35% of peak equity);
  historical compliance is not a guarantee of future drawdown. Realized and open (marked) P&L are reported together.

## 4. Universes

- **Eligible universe E(s, c)** — the realizable policy test: the members of subject s's sealed **independent** set at
  cutoff c that **qualified** under that subject's frozen gates (3B Q1–Q6, 4A Q1–Q5), exactly as sealed. Sizes:
  3B C19 39 / C21 40 / C23 39 / C24 38; 4A C19 9 / C21 5 / C23 6 / C24 9. The source gates stay intact; policies only
  re-rank E. Original screening, promotion and shortlisting may already have discarded alternatives; reselection cannot
  undo that.
- **Secondary C24 universe** (report-only, labelled *informed*): each subject's final selectable set (3B 53 qualified of
  61 with C4, E, A, B, C85 and both informed lanes; 4A 24 of 30 with the informed lane, Appendix A and P01–P13). Its
  selections are never chronological evidence and never enter §7.5.
- **Hindsight cohort K(s, c)** — the availability diagnostic, C19/C21/C23 only (§7.4).
- **Excluded everywhere:** informed lanes and controls at C19–C23 (they do not exist there), fixed-anchor studies (3C),
  context studies, C4/C4-refined as candidates.

## 5. Stage 1 — inventory, reproduction, failure attribution and mechanism audit

All Stage 1 work reads training doors, sealed records and archives; next-slice doors only for published role holders.

### 5.1 Inventory (no outcome ranking)

Per subject and cutoff: the sealed records used (path, sha256, seal), the archives (path, bytes, sha256, binding,
evaluation-code digest), the data and door pins, the original gates, search stages and budgets, counts by stage
(fitted centres, plausible, rung-1 feasible, rung 2, rung 3, shortlist, qualified), training metrics available per
stage, available ledgers and neighbourhood instruments, inactive-gene canonicalization, duplicate-ledger counts. Sealed
as `results/stage1/inventory.json` with `SOURCE_MANIFEST.json`. Nothing is copied into a subject's directory.

### 5.2 Reproduction and engineering parity (zero tolerance; a failure stops every dependent stage)

| Gate | Requirement |
|---|---|
| G1 | Each subject's `verify` passes (every sealed record re-hashes) and its preflight passes. |
| G2 | Re-deriving each cutoff's roles with the subject's own `rolesOf` from its sealed evidence reproduces the sealed roles, ranks and primary exactly (both subjects, C19–C24). |
| G3 | The **selection-family** statistics recomputed from archive hits (each subject's own draw generator, labels `('select', rep, cutoff)`, its qualification archive) equal the sealed `select` statistics (median, p10, robust, p90 DD, breaches, n) of **every** member of E(s, c), to the cent. |
| G4 | A fresh rerun of every E(s, c) centre on its training door equals the sealed centre record (net, realized, open, DD and its times, lots, wins, losses). |
| G5 | Fresh reruns of every published fold role holder on its next-slice door reproduce the sealed fold evaluation (slice P&L, slice DD, boundary equity, whole-run net and DD) to the cent, and the recomputed sequential policies (the subject's transition semantics: 5 bps on $100,000 per open lot closed or adopted at a switch; strict minute tracker over concatenated marks) reproduce the sealed sequential record (net, charges, DD, peak, trough) to the cent. |
| G6 | Causal prefix: each published role holder's next-slice-door run equals its training-door run through the cutoff (decisions, lots, daily marks). |
| G7 | Rung-1 reconstruction: each cutoff's rung-1 neighbourhood statistics reconstructed from archive hits reproduce the sealed lane summaries that carry them (the `frontier` members' robust and p90 values) to the cent. |

An engine or accounting defect, if found, is documented with its affected results and every dependent inference
stops until a scoped reproduction is reconciled (brief Stage 1); nothing is quietly fixed, and new-engine alternatives
are never compared with old-engine controls.

### 5.3 Failure attribution

For each fold primary and role holder with a negative slice P&L or a slice or sequential DD above $35,000: the selected
parameters; the slice's funded lots (entry/exit times, book, P&L, costs, interest, holding days), exposure and idle
time; the slice and sequential DD peak, trough and recovery dates with the positions open between peak and trough;
the training-period ledger (lots, episodes, top-episode share, calendar-year P&L). Surprising mechanics get small
deterministic examples.

### 5.4 The 4A eligibility interaction

A synthetic deterministic example (unit test) and the actual development decision log of 4A's C21 fold primary and C24
primary on their training doors: crossing, opportunity creation (arming), immediate invalidation by minimum strength,
later conditions, decision, fill and continuation entries. The classification (legitimate restrictive rule versus a
code/specification mismatch) is made against `docs/strategy-lab/GROWTH_ENTRY_GATES.md` and `src/growth-trading/entryGates.ts`.
Nothing is repaired; activity and independent episodes are reported as evidence, not vetoes.

### 5.5 Mechanism audit (training only)

For every E(s, c) member, from archive hits: the selection-family distinct ledgers, draws equal to the centre's ledger,
clipping, active inputs, lots and episodes per draw, top-episode share per draw, calendar-year P&L of centre and draws,
and how training-profit rank, selection robustness, the (qualification-only) confirmation and episode/subperiod
dependence relate to the sealed roles. For the published role holders and the C24 primaries, a **fresh detailed
rerun** of their selection rep-1 draws (128 each, training door) measures exactly how often a neighbour's largest
winning episode overlaps the centre's and what share of each neighbour's net falls inside the centre's leading-episode
window. Promotion attrition by stage (training metrics by stratum) comes from the archives. The centre's **causal net
without new funding in its leading winning episode** (the subjects' blackout option; window from the episode's first
decision session to its last exit) is computed by a fresh training-door rerun for every E(s, c) member.

Stage 1 ends with the inventory checkpoint and a sealed `results/stage1/mechanism.json`.

## 6. Feature menu (training doors only; the only inputs an experimental formula may use)

For each E(s, c) member: (a) the sealed centre record (net, DD, lots, episodes, top-episode net and share,
calendar-year P&L, exposure); (b) the selection family (2 × 128, pooled and de-duplicated exactly as the subject
pooled it): median, p10, robust, p90 DD, p95 DD, worst-10% mean DD (⌈0.1 n⌉ largest), breach share, worst DD, distinct
ledgers, and per-draw calendar-year P&L and top-episode share; (c) the centre's causal no-new-funding net (§5.5).
**Never:** a confirmation statistic (qualification only), any next-slice or validation figure, a later cutoff's
selection, a C24 setting at an earlier cutoff, idle intervals or entry dates after the cutoff.

## 7. Stages 2 and 3 — frozen policies, matched reselection and the hindsight diagnostic

### 7.1 Constraints on the experimental policies (fixed now)

- **At most three**, one formula per chosen family, from: **severity-aware** (a selection-family tail measure beyond
  the p90 gate), **subperiod consistency** (development results across distinct chronological subperiods),
  **episode sensitivity** (development profit after withholding new funding in the leading episode). Choosing fewer is
  allowed; forcing all three is not required.
- Each formula is frozen with its exact score, scaling and weights, inputs (§6 only), tie-breaks (ending in the label),
  missing-data treatment, any fallback, and its no-selection outcome. **No grid** of weights, thresholds or
  combinations; no "best two of three"; no automatic trade-count floor, concentration veto, named-event ban or
  mandatory annual trading.
- **Training-length normalization (single rule):** every experimental score ranks members of one cutoff only; any
  dollar threshold is the fixed $35,000 drawdown budget; subperiods are calendar years (2016 starts 2016-01-04); no
  threshold depends on the training length or the cutoff.
- **Qualification:** every policy chooses only within E(s, c), whose members already passed the subject's gates with
  their once-computed fresh confirmation; no confirmation statistic is used to rank, so no new confirmation is needed
  and none is drawn. **E(s, c) empty → no selection (flat).**
- The Stage 2 record (`results/stage2/POLICY_FREEZE.json`, with `POLICIES.md`) states each formula, why its family was
  chosen from the Stage 1 evidence, its expected trade-off, and the shortlist/reporting rules; it is sealed and
  **committed** before §7.3.

### 7.2 Policy execution (deterministic)

Each policy is a pure function of E(s, c)'s §6 features; it returns one label or "no selection". P0 is re-executed by
the same harness and must reproduce the sealed primary (G2). Tests cover deterministic ties, training-only inputs (a
feature from a non-training door is refused), no outcome fields in the inputs, provenance and cohort membership.

### 7.3 The sealed choice record (before any non-published next-slice outcome)

`results/stage3/CHOICES.json`: every policy's choice at C19, C21, C23 for both subjects, with the score table of E(s, c),
the "attractive candidates rejected" list (E members with a higher training centre net than the choice), and the
cohort K(s, c) of §7.4 with each member's stratum, training features and provenance. Sealed and **committed**; only
then may a next-slice door open for a non-published candidate.

### 7.4 The hindsight cohort (frozen rule; development-only; ≤ 96 distinct candidates per subject and cutoff)

- **Universe:** every configuration fitted in the subject's independent search job of that cutoff (the archive's
  `configs` table) plus the sealed independent shortlist. Excluded and declared: screen proposals never promoted to
  rung 1 (their configurations are not archived), informed lanes, controls.
- **Strata** (exclusive, in this order): **S** every shortlisted member (the qualification set, qualified or not);
  **R3** rung-3 fits (`lanes[].r3`) not in S; **R2** rung-2 fits (`lanes[].r2`) not in R3 ∪ S; **F** rung-1 feasible
  (the subject's own feasibility function under the lane's ordinary need, from the reconstructed rung-1 or refinement
  16-draw family) not in R2 ∪ R3 ∪ S; **P** centre plausible and measured at rung 1 but infeasible; **U** centre
  implausible (net ≤ 0, DD > $35,000 or a required book unfunded).
- **Quotas:** S in full; the remainder R = 96 − |S| gives **U 8** and splits R − 8 equally over R3, R2, F, P (the first
  strata take the odd units); a stratum's shortfall passes to the next stratum in the order R3 → R2 → F → P → U.
- **Within a stratum:** structural groups are the subject's cells (3B: 8 inclusion × entry cells; 4A: rise,
  breakout); the quota is spread over cells round-robin in cell order, a cell's shortfall passing to the others; a
  cell's members are ordered by training centre net (descending; ties by identity) and its k picks are the ranks
  ⌊i·n/k⌋, i = 0 … k − 1 (the top member always included, then evenly spaced profit ranks).
- One entry per canonical identity; duplicates of a training ledger are kept and counted. Every policy choice is in S
  by construction (checked).
- **Next-slice evaluation:** one continuous run per cohort member on the next-slice door (slice P&L, slice DD,
  whole-run DD, lots and exposure in the slice), archived as it returns, resumable, one evaluation per key.

### 7.5 The frozen decision rule ("merits further confirmation")

For policy P and subject s over the three historical slices, with the subject's sequential transition semantics:

- **M1 risk:** P's sequential minute DD ≤ $35,000.
- **M2 profit:** P's sequential net > max(P0's sequential net, $0).
- **M3 repetition:** P's slice P&L ≥ P0's in at least 2 of the 3 slices, and P has no slice reset DD > $35,000 in a
  slice where P0's was ≤ $35,000.
- **M4 selection, not abstention:** P holds a selection (not "no selection") in at least 2 of the 3 slices.

P **merits further confirmation** iff M1–M4 hold in **both** subjects. Otherwise it is classified as a **one-subject
signal** (M1–M4 in exactly one subject), a **risk-only change** (M1 in both subjects but M2 fails in at least one; the
profit surrendered is stated), or **no demonstrated improvement**. Ties with P0 (identical choices) give no evidence.
No requirement to dominate every statistic; uncertainty and the correlation of the shared slices are described; three
slices never establish statistical superiority.

**Reported for every policy, including failures:** fold choices and slice P&L/DD; complete sequential net/DD with peak,
trough and recovery; paired deltas against P0; drawdown breaches; uninvested slices; the profit sacrificed against P0
and against the attractive candidates it rejected; a compact attribution of changed trades and exposure; and whether
any effect comes from one subject, one episode or one slice.

**Hindsight diagnostic** (after the choices are sealed; never a selectable strategy or an achievable improvement):
in K(s, c), an **acceptable** alternative has slice P&L > $0 and slice reset DD ≤ $35,000; a **better** alternative is
acceptable with slice P&L > P0's choice's. Reported: prevalence by stratum (with Wilson 95% intervals) and by original
promotion and ranking position, never only the best future winner; and, for Q2, the within-cohort rank association
(Spearman) and separability (AUC for "acceptable") of each training feature available for every cohort member (centre
net, DD, lots, episodes, top-episode share, net without the best calendar year, rung-1 16-draw robust net, p90 DD and
worst-2-of-16 mean DD), with the sign consistency across the six subject-cutoffs. "Not found in this cohort" never
means "the space contains none".

### 7.6 Futility rule (frozen)

Stage 4 opens FULL only if at least one experimental policy **merits further confirmation** (§7.5). Otherwise the
audit stops before any new 2025–2026 evaluation: the C24 choices of every policy are still frozen and committed
(development only) and reported with the already-published validation outcomes where a choice coincides with a
published member; no FULL door opens.

## 8. Stage 4 — C24 freeze and the one-time validation

- **Before any new 2025–2026 evaluation:** `results/stage4/C24_FREEZE.json` records, for both subjects, P0's and every
  experimental policy's C24 choice from E(s, C24) (primary, chronologically coherent) and from the secondary final set
  (report-only, informed), the validation plan below, the already-known original C24 outcomes with their provenance,
  and the futility verdict; sealed and **committed**.
- **If not futile:** every frozen choice (all policies, not only the winners) is evaluated **once**, continuously from
  2016-01-04 through 2026-10-30 across year-end 2024: validation P&L (realized and open), reset validation DD, full
  history net and whole-run DD with dates. P0's C24 choices must reproduce the subjects' sealed validation records to
  the cent. Labels: V1 validation P&L > 0; V2 reset validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000. A policy that
  merits further confirmation is **consistent in 2025–2026** iff in both subjects its primary-universe choice passes
  V1–V3 and in at least one subject its validation P&L ≥ P0's; otherwise **not consistent in 2025–2026**.
- **No validation feedback:** no policy revision, parameter tuning, extra hypothesis, broadened budget or replacement
  after validation. 2025–2026 is previously examined history.

## 9. Budgets and stopping

| Kind | Cap (fresh) | Notes |
|---|---:|---|
| All fresh backend simulations | **100,000** | feature reruns, detailed neighbour reruns, causal reruns, reproduction, cohort, validation |
| of which next-slice or full-history | **800** | Stage 1 reproduction of published role holders, the cohort (≤ 6 × 96 = 576), sequential reruns, Stage 4 (≤ 2 subjects × 2 universes × 4 policies) |
| distinct archived candidates on a next-period door | 600 | AD1 |
| new search proposals | **0** | D1 |

Archive hits are counted apart (by kind). A stage exceeding its cap fails (an amendment matter). **Stopping:** after
the declared comparisons, at a resource or data blocker preventing valid inference, or by the futility rule. No "one
more promising tweak"; any new hypothesis goes to the report and the proposal document for later review.

## 10. Resources and recoverability

- Every substantive stage runs as a transient systemd user unit inside `opa.slice` with **MemoryHigh=44G,
  MemoryMax=48G, MemorySwapMax=0** (`KillMode=mixed`, `Restart=no`, absolute Node path), one unit at a time; Claude and
  tmux outside. Other workloads are checked before each launch.
- One in-process runner per stage (`--expose-gc`, a forced GC every 32 fresh runs); archives opened **read-only**;
  this study's own fresh results persist as they arrive to `.cache/optimization-process-audit/` (a SQLite archive bound
  to the study, the door pin and the evaluation-code digest), keyed by door, options and configuration identity; one
  evaluation per key (duplicate keys deduplicated before dispatch); a rerun of the same command resumes from the
  archive. The pilot tests a graceful stop and an abrupt unit kill with identical resumed results and the
  duplicate-key path. No automatic restart; no OOM restart loop. Observed memory and throughput are reported.

## 11. Integrity and reporting

- **Freeze record** (`results/protocol-freeze.json`): this file's, the brief's, the adoption manifest's and the
  amendments' sha256, the subjects' sealed-record and seal-log hashes, the archive pins, the data pins, the subjects'
  evaluation digests, git `HEAD`, the budgets and the resource contract. The runner code is written after this freeze
  and implements it as written: every sealed stage record carries the digest of `src/optimization-process-audit/`
  and the subjects' evaluation digests; the Stage 2 freeze pins the code closure used for Stages 3–4, and any later code
  change is an operational amendment (`O*`) that never touches the subjects' evaluation code.
- **Sealed records** are write-once (0444) with `results/seals.jsonl`; `npm run opa -- verify` re-hashes them. The
  subjects' and context studies' directories are never written.
- **Deliverables:** REPORT, PROTOCOL and adoption, AMENDMENTS, README, RESEARCH_RECOVERY, RUN_COMMANDS,
  `SOURCE_MANIFEST.json` (archives and sources), `POLICIES.md` with the frozen definitions, selected identities,
  concise comparison tables (`results/tables/`), and `PROCESS_PROPOSAL.md` (a clearly labelled proposal for the user's
  review, linked from the roadmap). Written analysis, Markdown tables and machine-readable files only (standard §7.7).
- **The report answers** the brief's questions, separating observed from inferred findings; states that a hindsight
  candidate is an oracle diagnostic; that no finite archive proves no useful phenotype exists outside it; that shared
  periods are correlated evidence; that reselection tests only the final selection conditional on the archived
  discoveries (a changed search would need a separately authorized experiment); and recommends, without starting, the
  next step (4B, Priority 6, a narrow investigation, or a pause).
- **Roadmap:** the audit is recorded separately from the original Priority 5 funding research; 5A complete; 4B and
  broader funding research deferred (not cancelled); Priority 6 pending; C4/C4-refined and the frozen GDX candidates
  unchanged; the declined 3C partner not adopted.
