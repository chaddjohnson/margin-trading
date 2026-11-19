# Protocol — Priority 5A (brought forward): Growth funding lifecycle and fixed portfolio combinations

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
development performance result of L1 or L2 exists). Afterwards it is never edited; changes go to `AMENDMENTS.md`
(append-only).

A **bounded fixed-arm architecture comparison and diagnostic** on **unchanged phenotypes**. No parameter search, no new
phenotype selection, no historical-cutoff repetition, no tuning of the L2 constants. Research only: nothing is
deployed, and the production/canonical Growth behaviour is unchanged.

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.0.0`, sha256 `2005a88c2e24f5e2ab4e461b0425f97d006781a45518f78d9f10fd9320f40105` |
| Read / adopted (UTC) | 1.1.0 read in full on 2026-11-09 before 15:32Z (the branch creation); 2.0.0 written by this task from the brief's authorized reporting preference (§1) and registered before 16:00Z; adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `research/vg-growth-funding-lifecycle/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/vg-growth-funding-lifecycle`; every stage calls `requireStandardAdoption`) |
| Scope | `diagnostic` (standard §0.1: a bounded comparison of frozen selections that opens validation data; §4 does not apply — nothing searches) |
| Brief | `research/vg-growth-funding-lifecycle/brief/BRIEF.md`, sha256 `26be1bceb44c28bf4cfee1cd902365e3fa287bd4d20ed65099f26635bbf970e3` (236 lines, read in full) |
| Branch / base commit | `research/vg-growth-funding-lifecycle` in the main checkout, from `927cd0ab` (end of Priority 3A); code `src/vg-growth-funding-lifecycle/`; `npm run vg-life -- <command>` from the repository root |
| Migration | none: the study adopts 2.0.0 from its start; Priority 3 keeps 1.0.0 and Priority 3A keeps 1.1.0 (their records are untouched) |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement |
|---|---|---|---|---|
| AD1 | §1.8, §2.3–§2.5, §3.2, §4 | adaptation | No search, no earlier-cutoff repetition, no primary or roles: a fixed-arm comparison of frozen subjects (diagnostic scope, §0.1). The brief: "a fixed-arm architecture comparison and diagnostic, without a parameter search … Do not repeat full historical-cutoff optimization searches". Nothing here claims chronological reliability of any procedure. | — (brief §2) |
| AD2 | §5.1 | adaptation | The §5.1 gates are stated "before any large search"; there is none. The verification stage V (§12) replaces them for this engine: L0 reproduces Priority 3's sealed records field for field, the lifecycle engine in L0 mode reproduces the canonical Growth books, causal prefixes, accounting and single-book identities. Execution stresses (10/20 bps, 14% interest, next-open stops) are not run: nothing is qualified. | — |
| AD3 | §6.3 | adaptation | No tuning benchmark (diagnostic scope reports observed use). The worker count (12) is Priority 3's measured saturation point; the engineering pilot measured observed memory and throughput (§13). | — (brief §9) |
| AD4 | §1.2, §1.4 | adaptation | FULL (2016-01-04 → 2026-10-30) is opened only for frozen subjects and arms, after the development stages and the development verdicts are sealed, behind this study's committed `FULL_MANIFEST.json` (and Priority 3's frozen-selection guard). Retrospective, previously examined history. | — (brief §7) |
| AD5 | §5.3 | adaptation | The standalone books use a common family-level instrument (§8.2) instead of Priority 3's book-scoped columns, so that the same input moves by the same offset in every standalone subject (the brief §8). | — (brief §8) |

## 1. Question, objective and outcomes

- **Questions:** the brief §10's seven questions (Q1–Q7), answered by the frozen rules of §11.
- **Objective (descriptive):** net profit (realized + marked unrealized, after costs and interest) beside the maximum
  minute drawdown on one fixed $100,000 principal budget ($35,000 reference ceiling, standard §2.1). No primary-selection
  rule (`not-applicable`): nothing is selected.
- **Valid outcomes:** any; a negative or inconclusive comparison is a result. A development-based architecture
  preference is **provisional evidence on known configurations**. Failure under fixed phenotypes does not prove that an
  architecture could never work after optimization; improvement on one informed subject does not establish a
  universally better method.
- **Candidate consideration (standard §2.8).** A and B: original gate verdict **fails Q3** (Priority 3, as sealed:
  confirmation p90 DD $36,277.63 / $35,131.47); descriptive evidence: Priority 3A and this study; user-directed
  consideration: Priority 3A brief (2026-11-09) and this brief §7 ("preserve A and B's original failed Q3 labels and the
  user's acceptance of them for consideration"), scope: further investigation only. Nothing here relabels Q3, sets a
  p90 tolerance or changes the $35,000 budget.

## 2. Prior knowledge and provenance

- **Already examined:** every incumbent's development history; Priority 3's development records, neighbourhoods and its
  one-time validation; Priority 3A's diagnostic (participation, refusals, idle overlaps, neighbourhood tails and the
  2025–2026 replay of A, B, C, D, GP4, GP085, IP, XP, SP). The validation window is therefore **previously examined
  history**, not an untouched holdout.
- **Known L0 figures** (verification targets only): the brief §4's full-history table; Priority 3's sealed development
  centres and confirmation statistics; E's development L0 centre is A's sealed causal-removal record "without G:VGT"
  ($326,336.29 / DD $20,801.07 / 56 lots, Priority 3 `results/folds/C24/selection.json`), seen while designing this
  study.
- **Not known before the freeze:** any L1 or L2 performance figure, E's neighbourhood, the standalone instrument's
  results and any full-history L1/L2 figure. The engineering runs of §13 (all on D24, after the L1/L2 rules were
  implemented, none changed afterwards) printed only: L0 parity; the Growth request counts by outcome under L1/L2 for A,
  B and GP4 (and that L2's retained opportunities of those three only waited at their centres); GP4's funded-lot and
  request counts by source under L0–L2; consistency rounds, timing and memory. No net, drawdown or neighbourhood
  figure of L1 or L2 was printed.
- **Provenance of the subjects:** VG #2 (Study 8 F24, informed by 2016–2024), Growth #4 and 08500a60 (growth140 studies,
  2016–2024), Appendix A (browser-selected with 2016–2026 in view: informed), Priority 3's primaries and finalists
  (Priority 3 C24 lanes). All are informed about this history; nothing here is independent chronological evidence.

## 3. Data, doors and windows

- **Canonical files:** Priority 3's pins (`data/VGT/data.csv` `2ee06310…412e`, `data/GDX/data.csv` `77dba9b2…5049`).
- **Doors:** Priority 3's verified byte-prefix doors **D24** (2016-01-04 → 2024-12-31; development) and **D23**
  (→ 2023-12-29; the shortened-prefix causality check only), each verified by size, sha256 and last row before parsing;
  **FULL** (2016-01-04 → 2026-10-30, the verified common complete endpoint) only for stage F, behind `FULL_MANIFEST.json`
  (sealed, committed, listing the sha256 of every sealed development record) and Priority 3's frozen-selection guard.
  Every opening is logged in this study's `results/doors.jsonl`.
- **Windows:** development 2016-01-04 → 2024-12-31; validation reporting 2025-01-02 → 2026-10-30. FULL runs are
  continuous from 2016-01-04; validation net = the marked net at 2026-10-30 − the marked net at the 2024-12-31 close; the
  reset validation DD (tracker restarted at the boundary close) and the full-run DD are both reported. No unavailable
  later date is implied.

## 4. Subjects (frozen; `STUDY_MANIFEST.json` holds every exact vector)

Exact configurations, enabled masks and sealed centres are read from Priority 3's sha256-pinned records (its C24 and
Growth-pair qualification records via 3A's verified loader, and its `CONTROL_MANIFEST.json`); none is rebuilt from prose.

| Key | Subject | Source / identity |
|---|---|---|
| D | VG #2 (`S8-VG-F24-3`) VGT+GDX D1, D1-only control | Priority 3 `D` `7a377d49…` |
| E | VG #2 + existing GDX Growth (Appendix A `07cac3329fc7a520`) only | **new** `c45f4efa…`: VG #2's D1 vectors, Appendix A, Growth·VGT disabled with Priority 3's placeholder (its control convention) |
| C4 | VG #2 + VGT Growth #4 (`420cd989e4fa7749`) only | Priority 3 `C` `f324035d…` |
| C85 | VG #2 + VGT Growth 08500a60 (`08500a60ec56cfae`) only | Priority 3 C24 member `3688e97b…` |
| A | VG #2 + #4 + Appendix A | Priority 3 `A` `d4cde313…` (fails Q3; considered) |
| B | VG #2 + 08500a60 + Appendix A | Priority 3 `B` `676731bf…` (fails Q3; considered) |
| GP4 | Growth only: #4 + Appendix A | Priority 3 `GP4` `0f17bddb…` |
| GP85 | Growth only: 08500a60 + Appendix A | Priority 3 `GP085` `008233e8…` |
| V4 | shipped VGT D1 primary + #4 | Priority 3 C24 member `dbe7be81…` (Priority 2's control) |
| V85 | shipped VGT D1 primary + 08500a60 | Priority 3 C24 member `51da785f…` |
| SG | Appendix A alone ($100,000) | Priority 3 control `appA` `b5c47cb0…` |
| S4 | #4 alone | **new** `90f84e00…` (Priority 3's convention) |
| S85 | 08500a60 alone | **new** `b30bf34f…` |
| IP, XP, SP | Priority 3's informed, independent and staged primaries (mechanism controls) | Priority 3 `575545f4…`, `86d25530…`, `d3bc1484…` |
| G01–G12, I02–I16 | the 12 Growth-pair finalists and the 16 independent finalists, distinct after deduplication (I01 = XP) | Priority 3 sealed records |

The three standalone books are never summed into a pool: each is its own $100,000 comparison. Same-instant priority is
each subject's own (D1-first for every core subject).

## 5. Engine, conventions and the lifecycle arms

### 5.1 Fixed in every arm

Priority 3's harmonized conventions and its unchanged pool (`src/vg-d1-growth-joint/pool.ts` `runPool`): one exclusive
funded slot, one fixed $100,000 principal limit, no compounding, no preemption, 5 bps per side, 11% simple interest
(365 days), stops at the stop or the gapped open, fractional shares, reservations from decision to fill, the frozen tie
order (family priority, then GDX before VGT), a retained funded remainder keeps the slot, an actual position is never
terminated to help another signal, funding from 2016-01-04, D1 arming once its reference high exists. **D1's canonical
shadow lifecycle is unchanged in every arm** (D1 refusals never feed back). The native VG #2 bridge (Study 8 arming
2017-06-15) is reproduced under L0 only.

### 5.2 Audit of the canonical capacity hook (why it is not reused)

`GateRuntime.capacity` (`src/growth-trading/entryGates.ts` `EntryGates.check`) is a harness-only stand-in:

- it is asked **first**, before the trend filter, the Drawdown Recovery Gate and the initial-stop availability, so a
  decision those gates would block is recorded as a capital block;
- a blocked crossing with eligibility OFF is vetoed (consumed); a blocked continuation trigger ends its episode
  (consumed);
- a blocked **eligibility opportunity stays armed** and is re-evaluated at every later bar until it decides, expires or
  is invalidated — an automatic funding retry inside native eligibility, i.e. L2-like behaviour (test
  `tests/lifecycle.test.ts`, "the canonical capacity hook (audit)").

So the hook does not implement L1 for eligibility books (all three core Growth books use eligibility). A bounded
study-local adapter is used instead (§5.3). The canonical engine and its default are unchanged.

### 5.3 The adapter

`src/vg-growth-funding-lifecycle/lifecycle.ts` `simulateLifecycle` is a copy of the canonical orchestrator
`simulateTrading` (`riseTrading.ts` v1.4.0, sha256 `78b3423c…4018b`, lines 496–1062) whose only differences are seven
marked `LIFECYCLE` insertions (the diff is part of the deliverables); it drives the unchanged canonical components
(ShadowBook, EntryGates, ContinuationController, PositionRules, DrawdownRecoveryGate). With no lifecycle (L0) it is
the canonical simulation; stage V checks it against `runGrowthBook` for every distinct Growth configuration.

**The request point.** Every Growth order passes through `ShadowBook.commit`: a base crossing, a latched / renewal /
drawdown-release eligibility decision, a continuation trigger, and (L2) a retained reassessment. Under L1/L2 a
`LifecycleBook` (a ShadowBook subclass) asks the allocator there — **after every gate has passed** — whether the slot is
available at that instant and tie position.

### 5.4 L0 — current model (exact control)

Priority 3's `evaluate.ts` `run`, unchanged: a refused Growth entry proceeds as an unfunded virtual position; the book
waits for its virtual exit; freed capital never revives the refusal. It must reproduce prior records exactly (§12).

### 5.5 L1 — Growth responds to actual funding; fresh canonical opportunities only

- **Granted:** the canonical order (filled at the next eligible trade; the funded lot is the book's own position).
- **Refused:** the decision-time transitions stay canonical — the deciding eligibility opportunity is consumed (state
  `ordered`, so no renewal watch starts), a renewal watch is cancelled, an open continuation episode is closed by base
  priority, a triggered continuation episode is ended, a continuation trigger supersedes a live opportunity — but **no
  order and no position exist**: the book's order is cleared and its D1 machine's pending signal and armed setup are
  cleared (D1's cancel semantics). The book is flat with no order.
- **No retry:** the refused request is consumed as an entry attempt and is not queued. Later entries arise only from
  the book's own canonical rules: a fresh Rise crossing (the scanner is edge-triggered on prices; nothing is reset to
  manufacture one), a new breakout session (breakout signals on every qualifying session close), a newly armed
  eligibility opportunity (native eligibility still applies to opportunities delayed by filters **before** a funding
  request), or a continuation window opened by an **actual** profitable exit.
- **No inherited state:** only actual fills create an entry price, position size, holding age, stops, post-entry highs
  and outcome. A refused request has no virtual position, so no hypothetical exit, profit, continuation window or high
  exists. Market observation continues causally while flat.

### 5.6 L2 — L1 plus one explicitly bounded preserved opportunity

An experimental entry-policy addition, applied identically to every subject (including books whose native eligibility
is OFF), labelled L2 in every result; the phenotype JSON is never altered. Constants (fixed, never optimized or changed
after results): **20 trading sessions**, **5% price extension**.

- **What is retained:** at most one refused **base** request per Growth book (a Rise crossing, a breakout decision or a
  native eligibility decision — crossing, latched, renewal or drawdown release); its refused instant, session and
  decision price, its trigger (Rise threshold / breakout prior high) and reference (recent low / SMA), and its native
  opportunity (policy, fixed low, signal price, running maximum close, native last eligible session). Continuation
  refusals stay L1. A newer refused base request **supersedes** the retained one (its own clock starts at its refusal).
- **Bound:** the refused session is day 0; it may decide through session refused + 20 inclusive, or through the native
  opportunity's last eligible session if earlier; it **expires** after that session's close. Refusals, waiting and
  failed checks never renew the clock.
- **Schedule and priority:** reassessed at every completed signal bar (daily, at the scheduled close) strictly after
  the refusal, while the book is flat with no order, **after** the canonical decisions of that instant (fresh crossing,
  latched opportunity, continuation), and never at an instant at which the book already made a request.
- **Validity (terminal on failure: `invalidated`)**, evaluated at every such bar:
  1. **5% extension guard:** the completed close ≤ 1.05 × the original refused decision price;
  2. **Rise:** the current entry predicate holds at the completed bar (close ≥ the rolling N-bar low × (1 + X), the
     scanner's own predicate); plus the native policy's own condition where the retained setup came from one —
     minimum strength (close ≥ fixed signal-time low × (1 + a)), maximum extension (close ≤ signal price × (1 + e)),
     deterioration (close > the highest completed close since arming × (1 − d), the running maximum continued);
     time-limited and reset-renew need the predicate only;
  3. **Breakout:** the breakout's trend conditions hold now (close > SMA_L(s), SMA_L(s) > SMA_L(s − K)) and the close is
     above the original broken prior high (the breakout level).
- **Gates (blocking, kept):** the trend filter, the Drawdown Recovery Gate and the initial-stop availability at the
  bar (adequate history included), through the canonical `EntryGates.check` / initial-stop check.
- **Capital (waiting, kept):** if every check passes but the slot is occupied at that instant and tie position, the
  reassessment waits (no order, no refusal, no clock change); capital release only makes funding possible.
- **Decision:** when every check passes and the slot is available, an order is placed at the then-current close
  (never the refused price), filled at the next eligible trade under canonical execution (an opening gap is the fill);
  the actual position is initialized from that fill only. The order follows base priority (an open continuation
  episode closes; a live native opportunity is superseded).
- **Clearing:** expiry, invalidation, its own entry (`entered`), any other granted request of the book
  (`consumed_by_entry`: a fresh canonical decision has precedence), a newer refused base request (`superseded`), the end
  of the data. One request per book per instant; no duplicate orders.
- **Limitations (reported):** the constants are design choices, not estimates; the Rise predicate and the breakout
  level are conservative stand-ins where the native engine has no retained-setup rule; a retained setup can only enter
  while the slot is free, so in a pool whose slot stays occupied for weeks it mostly expires or is invalidated.

### 5.7 The coupling (`coupled.ts`)

Under L1/L2 a Growth book's path depends on the allocator's answers. The books are simulated with an oracle of answers;
Priority 3's unchanged `runPool` replays the D1 shadow books and the Growth request records (a refused request and a
waiting reassessment are records that never become lots when consistent); the earliest record whose pool answer
differs from the answer the book used is fixed, and the books and pool rerun. The consistent prefix grows every round,
so the iteration ends, and a consistent run equals the online simulation (induction over the pool's processing order).
The latest pool's occupancy is used as a guess for unknown answers (speed only; stage V checks that the fixed point is
the same without it). One complete consistent evaluation is one simulation in the counts; consistency rounds and Growth
re-simulations are disclosed separately.

## 6. Space

Not applicable: no search. The subjects' vectors are fixed (§4).

## 7. Search, budget and stopping

Not applicable (AD1). The run plan is countable and frozen (`STUDY_MANIFEST.json` `plan`):

| Stage | Door | Fresh simulations | Other |
|---|---|---:|---|
| V verification | D24 / D23 | 335 / 18 | 144 archived draws compared (V2); Growth book-parity runs counted apart |
| C centres (43 subjects × 3 arms + VG #2 native) | D24 | 130 | — |
| N neighbourhoods (9 subjects × 640 draws × L1, L2; E also L0) | D24 | 12,160 | 5,120 archived L0 draws read from Priority 3 |
| S standalone (3 × 640) | D24 | 1,920 | — |
| P verdicts | — | 0 | — |
| F full history (16 subjects × 3 arms + native) | FULL | 49 | — |
| **Total** | | **14,563 development, 49 full** | ceilings **20,000** and **200** (brief §9), enforced in code |

Operational retries are disclosed. No ceiling is consumed because it exists; optional work beyond this plan is not run.

## 8. Robustness instruments

### 8.1 Core (E, C4, C85, A, B, GP4, GP85, V4, V85; D as reference)

Priority 3's 384-draw development instrument, reconstructed exactly (3A's `rowsOf`, checked against
`space.ts neighbourhood` on every use): confirmation = 3 × 128 Latin-hypercube rows, labels `('confirm', rep, 'C24')`,
common random numbers across centres, scope **joint** for pools with D1 and **g** for Growth-only pools, every active
numeric input moved by u × its radius (D1: Study 8's N1 radii in grid units; Growth: 10% of the range on the fine grid),
clipped to the box widened to include the centre, categorical inputs fixed, inactive inputs untouched, duplicates
across reps dropped. Radius sensitivity: half radius `('small', 'C24')` and 1.5× radius `('wide', 'C24')`, 128 each.
**The same effective draws are evaluated under L0, L1 and L2** (paired); L0 draws are read from Priority 3's archives
(identity by evaluation key; 144 of them replayed in stage V), E's L0 draws are fresh. Dimensionality differs between
combinations and is disclosed (active inputs: E 35, C4 37, C85 38, A 56, B 57, GP4 40, GP85 41, V4 29, V85 30); the
joint scope also moves the inputs of disabled books, which are behaviourally inert (Priority 3's instrument).

### 8.2 Standalone (SG, S4, S85)

One common family-level instrument for a single Growth book: 50 Latin-hypercube columns, one per Growth numeric input
(the same column for the same input in every subject), seeds `deriveSeed('vg-growth-funding-lifecycle', 'nbhd',
'standalone', family, rep)`; every active input moves by u × scale × its radius (10% of its range), rounded to its fine
grid and clipped to the box widened to include the centre (the clip count reported); categorical inputs fixed;
inactive inputs untouched; repaired, reduced to the effective configuration, duplicates dropped. Families: confirm
3 × 128 (scale 1), small 128 (0.5), wide 128 (1.5). Remaining mismatch (disclosed): the active inputs differ (SG 19, S4
21, S85 22) and their positions in their boxes differ (clipped confirmation draws: SG 230, S4 183, S85 365 of 384). The
lifecycle is irrelevant for a book alone (it is never refused; checked in stage V), so the instrument runs under L0.
No older standalone instrument is reproduced.

### 8.3 Statistics (report-only; standard §5.5, §5.8)

Median, p10 and p90 net; robust = ½ median + ½ p10; median, p90, p95, worst and worst-10%-mean minute DD; breach share
(DD > $35,000) with its Wilson 95% interval, mean excess among breaches, distinct ledgers behind breaches; clipping;
distinct ledgers; draws with the centre's ledger; paired Δ net and Δ DD against L0 (median, p10, p90, mean, better /
worse counts, identical ledgers). Perturbation frequencies are not probabilities of future market losses; the
dependent Latin-hypercube draws are summarized by dispersion, and intervals are labelled as finite-draw approximations.

## 9. Gates and report-only evidence

No qualification gate: nothing is qualified or selected. The $35,000 centre reference and A's and B's original Q3
labels are reported unchanged (§1). A centre DD above $35,000 is reported as such; no new tolerance exists.

## 10. Chronological procedure tests

Not applicable (AD1). Local stability on 2016–2024 is not chronological reliability (standard §5.4).

## 11. Interpretation rules (frozen; applied by code in stage P before FULL opens)

Development evidence (D24 centres and confirmation families) decides every label; FULL figures are reported beside it
and may challenge it, never change it. The ±$2,500 band (2.5% of the fixed budget) is a **report-only** separation of
"little" from a named change, not a risk tolerance or a gate.

- **R1 (Q1).** Per lifecycle, the Pareto set of {E, C4, C85, A, B} on four objectives: centre net ↑, centre DD ↓,
  confirmation p10 net ↑, confirmation p90 DD ↓ (D shown as the reference). "Strongest profit/risk evidence" = the single
  subject that dominates all others; otherwise the non-dominated set is reported with its trade-offs in dollars (no
  weights invented). Families: VG #2 + GDX Growth (E), + VGT Growth (C4, C85), + both (A, B).
- **R2 (Q2).** Per core Growth subject and comparison (L1 vs L0: fresh-signal effect; L2 vs L0; L2 vs L1: the
  preserved-opportunity rule), with dNet = the median paired Δ net of the confirmation draws and dP90 = the change of the
  family's p90 DD: **helps** (dNet ≥ +2,500, dP90 < +2,500), **mixed** (dNet ≥ +2,500, dP90 ≥ +2,500), **hurts**
  (dNet ≤ −2,500), **hurts (tail risk)** (|dNet| < 2,500, dP90 ≥ +2,500), **helps (tail risk)** (|dNet| < 2,500,
  dP90 ≤ −2,500), else **little**. Identical-ledger counts and breach-share changes are reported beside.
- **R3 (Q3).** Admission of GDX Growth, by complete reruns at the centre: (A − C4), (B − C85), (GP4 − S4), (GP85 − S85):
  net, VGT Growth booked P&L and D1 booked P&L differences per lifecycle. Under L1/L2, admitting GDX is "less costly to
  VGT" iff the VGT Growth difference is higher than under L0, and "without displacing more valuable D1 trades" iff the
  D1 difference is not lower than under L0: **yes** (both), **partly** (VGT only), **no**.
- **R4 (Q4).** E against A, B, C4, C85 per lifecycle: dominance on R1's objectives; E is a useful simpler alternative
  under a lifecycle iff it is non-dominated there. Its development ablation is not assumed to generalize.
- **R5 (Q5).** Standalone (common instrument, confirmation): retention = p10 net ÷ centre net, inflation = p90 DD ÷
  centre DD; X has stronger matched local stability evidence than Y iff higher retention and lower inflation; weaker iff
  both opposite; else mixed. A subject stronger than both others is named; otherwise none is. None is called the globally
  best standalone phenotype.
- **R6 (Q6).** An arm (L1 or L2) deserves optimization in 3B (provisional, development) iff it is labelled helps or
  helps (tail risk) against L0 for at least two of {A, B, GP4, GP85} and hurts / hurts (tail risk) for none of the nine
  core Growth subjects. Both → keep L0 as the benchmark and both arms as explicit 3B comparison arms; one → that one beside
  L0; neither → 3B under L0 with protected both-symbol exploration. Validation may challenge the recommendation (reported
  per subject); it never changes the rule, the constants or the arms.
- **Q7** (the standalone GDX search and its pooled evaluation) is answered in the report as the planned Priority 4A
  scope; nothing is launched.

## 12. Engineering gates (stage V; a failure stops every dependent stage)

| Check | Requirement |
|---|---|
| V1 | Every subject's L0 development centre equals Priority 3's sealed centre field for field; E equals A's sealed removal record "without G:VGT" (all fields but the id); SG, S4, S85: the pooled run equals the canonical standalone book (net and minute DD). Accounting on every centre: Σ lot nets = net, principal ≤ $100,000, no overlapping lots (one slot). |
| V2 | 16 archived confirmation draws of each archived core subject (144) reproduce their archived records field for field. |
| V3 | D (centre + 16 draws) and the standalone books (centres + 8 standalone draws) are identical under L0, L1 and L2; the standalone books are never refused. |
| V4 | For the nine core Growth subjects under L1 and L2, the fixed point without the occupancy guess equals the one with it (record, detail, request logs); accounting as V1. |
| V5 | Shortened prefix: under L1 and L2 the D23 run equals the D24 run up to 2023-12-29 (funding records, every Growth request, lots and their exits before the cutoff). |
| V6 | The lifecycle engine in L0 mode reproduces `runGrowthBook` (trades and standalone figures) for every distinct Growth configuration of the subjects. |

Synthetic tests (`tests/lifecycle.test.ts`) cover: refusal followed by release; zero new crossings; a fresh crossing;
repeated refusal; native eligibility (L1 consumption against the canonical hook's retry); breakout decisions; L2 entry,
waiting, the 5% guard, predicate invalidation, the 20-session and the earlier native expiry; a next-open gap across a
year boundary; precedence of a fresh decision; no continuation rights from an unfunded profit; and two Growth books
tied at one instant in the pool. First divergences from L0 and the subsequent funded portfolio are traced per centre
(stage C). The full `npm test` runs in a contained unit with the shell's PATH; known pre-existing failures are
distinguished from regressions.

## 13. Resources and recoverability

- **Containment:** every heavy stage is one transient user unit in `vgflc.slice` (MemoryHigh 44G, MemoryMax 48G,
  MemorySwapMax 0 on the slice and the unit, `KillMode=mixed`, `Restart=no`), one at a time; Claude and tmux outside.
- **Execution:** 12 child-process workers (each loads the door once), 2 tasks in flight per worker, `gc()` every 64
  evaluations or above 256 MiB of ArrayBuffers, a pressure stop above 36 GiB of cgroup memory.
- **Recoverability:** each result is appended to the job archive (`.cache/vg-growth-funding-lifecycle/jobs/<job>/`,
  bound to study, job, door and code digest) as it arrives; a rerun resumes mid-stage with identical outputs; a dead
  worker's tasks are dropped (no hang), the job stops and seals nothing; no automatic restart.
- **Pilot (before the freeze, mechanics only):** 96 tasks (A and GP85, 24 confirmation draws, L1/L2) uninterrupted,
  with SIGTERM, with a killed worker and with a SIGKILLed unit; every resumed archive equalled the uninterrupted one;
  12.4 s for 96 tasks, unit memory peak 8.5 GB. About 390 pilot evaluations, outside the sealed counts (disclosed).

## 14. Integrity

The freeze records this file's, the amendments', the brief's, the adoption manifest's and `STUDY_MANIFEST.json`'s
sha256, the code digest (Priority 3's evaluation files, the reused 3A modules and this study's modules), Priority 3's
evaluation and closure digests, its pinned records and archive sha256s, the data and door pins, `HEAD`, the ceilings and
the resources. Stages refuse to run unless the preflight passes, the freeze is committed and unchanged, the code digest
matches (or an amendment acknowledges it) and Priority 3's pins verify. Records are sealed write-once (0444,
`results/seals.jsonl`; `npm run vg-life -- verify`). The checkpoint is `RESEARCH_RECOVERY.md`.

## 15. Reporting commitments

- **Format** (standard 2.0.0 §7.7): written analysis, Markdown tables and machine-readable results only; no visual
  artifact of any kind.
- Paired tables by portfolio and lifecycle for development, validation and full history: net marked P&L with the
  realized/unrealized split, minute DD in dollars and as % of the fixed budget with peak/trough/recovery dates; funded
  episodes, wins/losses, partial exits, exposure, interest and costs, holdings at the endpoint; requests, refusals,
  retries (L2 waiting and entries), expired / invalidated / superseded / consumed opportunities, fills by source and
  component; idle-capital time, time occupied by actual positions, and the elimination (L1/L2) or persistence (L0) of
  unfunded virtual holds with their idle overlap.
- Neighbourhood comparisons with paired gains and losses against L0 and the tail severity; the standalone assessment.
- The four 2016 and 2020 VGT refusal episodes of Priority 3A traced under L1 and L2 (fresh opportunity? preserved and
  still valid? the actual fill, stops and exits; displaced D1 and Growth trades), without attributing extra-trade profit
  to the lifecycle except through complete reruns.
- The answers to Q1–Q7 with the R-rules' outcomes, negative results and uncertainty stated plainly; more trades, more
  GDX participation or fewer idle sessions are explanatory metrics, never success criteria.
- Limitations: historical compliance is not a guarantee; 2025–2026 is previously examined; informed subjects only.
