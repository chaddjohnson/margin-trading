# Protocol — Priority 3: D1 + Growth for VGT and GDX in one shared $100,000 capital pool

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
substantive search). Afterwards this file is never edited: changes go to `AMENDMENTS.md` only, criteria are never
loosened there, and an evaluation-code change needs an amendment and an acknowledgement.

**Written before any search, qualification, selection or fold result of this study existed, and before any pooled
result of a combined control.** Computed before it (engineering only, development doors only): the door build, the
control manifest (sealed and committed in `1c867708` before any combined control was evaluated), the parity dry run
(§15.1; VG #2's D1 pair and books alone, the Growth books alone, Priority 2's two VGT-only combinations — all known
results — and random configurations) and the **sealed parity on the final code** (`results/parity/parity.json`: 495
checks, 0 failed), the synthetic tests (§15.2) and the engineering pilot (§13.3, `results/pilot/PILOT.md`: pilot
budgets, `pilot-` job names, outputs in the git-ignored cache, only timings, memory, counts and equality booleans read;
every path, the interruption tests and the expected refusals passed).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `1.0.0`, sha256 `8c38ac15285753240be52c1a55739b2d1f4bed0e49531821c19e7437d3ae639d` |
| Read / adopted (UTC, from `date -u`) | read 2026-11-08T22:45Z (in full, with its registry, the template and the roadmap) / adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `research/vg-d1-growth-joint/STANDARD_ADOPTION.json` (checked by `npm run research-preflight -- --study research/vg-d1-growth-joint`; the runner calls `requireStandardAdoption` before every search, qualification, fold, diagnostics, freeze and validation stage) |
| Scope | `optimization` |
| Brief | `research/vg-d1-growth-joint/brief/BRIEF.md`, sha256 `4554b859e71eda0cbb66ba8dc2c085ab38c208c6facff9fd8fb7c2a03513aac7` (read in full, 210 lines, through Appendix A) |
| Branch / base commit | `research/vg-d1-growth-joint` in the main checkout, from `d61e6bea` (the end of the Priority 2 follow-up); code `src/vg-d1-growth-joint/`; command `npm run vg-joint -- <command>` from the repository root |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §2.3, §2.5 | adaptation | The primary rule is **actual profit**: the actual-profit role of the informed selectable set (§12.3), with a frozen deterministic tie-break. Robust-profit, balanced and lower-drawdown roles are shown beside it. | — (the brief §5 requires it; the standard allows it) |
| AD2 | §4.1, §3.4 | adaptation | One allocation architecture: **A, one exclusive funded slot** (VG #2's and Priority 2's strongest benchmarks). No allocation genes; the family priority at a same-instant tie (D1-first / Growth-first, Priority 2's existing choice) is a searched categorical gene; within a family the symbols tie alphabetically (GDX, VGT — VG #2's native order). | — (brief §2) |
| AD3 | §4.1 | adaptation | Study 8's pipeline with **three NSGA-II objectives** (−centre net, −robust net, neighbourhood p90 drawdown) and rung promotion reserving ¼ for centre net and ¼ for robust net (§11), so actual-profit promotion is kept beside the robust ranking. | — (brief §5) |
| AD4 | §5.3 | adaptation | Neighbourhood scopes: the whole pool; each family (both D1 books / both Growth books); each symbol (VGT's two books / GDX's two books); the Growth pair's members: each Growth book. 128 draws per scope. | — (brief §5 asks for whole-pool and family/symbol scopes) |
| AD5 | §5.1 | adaptation | No canonical engine exists for a cross-symbol D1 + Growth pool. Parity is zero-tolerance against the canonical engines where they exist (the D1 pair against `runNAllocator`; each Growth book against `runRiseTrading`; every one-symbol D1 + Growth pool against Priority 2's frozen engine on either symbol); cross-symbol pools are checked against an independent reference implementation (`reference.ts`: the funded set exactly, money and drawdowns within $1e-6). | — |
| AD6 | §1.4, §1.6 | adaptation (stricter) | The FULL door is never opened before `FROZEN_SELECTION.json` is committed, not even for the controls' known full-history targets: those (Appendix A's standalone figures, VG #2's native full history, Priority 2's VGT-only rows) are compared at the validation stage only (brief §3). | — |
| AD7 | §3.4 | adaptation (stated limitation) | The four arms have different purposes and are not budget-matched against one another (§11.5); arm D's budget is identical at every cutoff. Inherited effort (Study 8's 9,983,389 point evaluations for VG #2; growth140 and Priority 2's searches) is disclosed, not counted. No method-superiority claim is made. | — |
| D1 | §1.8 | **departure** | The earlier-cutoff repetition covers the **independent four-component procedure (arm D)** only. The Growth-pair search (arm B) runs at C24 only, and the staged path (VG #2 + the arm-B pairs) and the informed refinement (arm C) are informed (VG #2 was selected on 2016–2024 by Study 8 and its 2025–2026 outcome is known): they get no chronological test, and no chronological staged-versus-joint method claim is made. Regenerating VG #2 at every cutoff (a two-book D1 pool search per cutoff) is outside this study's frozen budget. | Brief §6: "if this extra procedure comparison is outside the frozen budget, limit the claim instead." |

## 1. Question, objective, outcomes

- **Question.** Among combined systems that trade **all four components** — D1·GDX, D1·VGT, Growth·GDX, Growth·VGT, each with
  its own parameter vector — through **one shared $100,000 principal budget** under architecture A, selected only on
  2016-01-04 → 2024-12-31, which earns the most actual net profit within a maximum minute drawdown of **$35,000** (35%
  of the fixed budget, not of peak equity), qualified by neighbourhood stability and costs; does it beat VG #2 Balanced
  and the unchanged combinations of the existing phenotypes; do both families and both ETFs contribute; does the
  independent selection procedure hold up chronologically; and what does each frozen selection do on 2025-01-02 →
  2026-10-30?
- **Objective (the user's).** Higher net profit (realized + marked unrealized, after costs and interest) with credible
  stability, within the ceiling. Historical compliance is not a guarantee of future drawdown.
- **Primary-selection rule:** actual profit (AD1, §12.3). **Roles:** actual-profit, robust-profit, balanced,
  lower-drawdown (standard default formulas, §12.3), ranked on the selection families; confirmation decides
  qualification only. **Pareto set:** centre net, centre DD, selection p10 net, selection p90 DD (reported).
- **Valid outcomes:** a frozen primary and roles; "no qualified combined result"; failed qualification; a failed
  validation; an unsupported procedure. A negative result is a valid completion. A D1-only or three-component system is
  never relabelled as the requested product.

## 2. Prior knowledge and provenance

- **Already examined** (all of 2016-01-04 → 2026-10-30, by earlier studies, the browser and reports):
  - VG #2 Balanced (`S8-VG-F24-3`): Study 8 F24 training centre $260,223.13 / DD $17,280.74 / 36 lots (native);
    its one-time 2025-01-02 → 2026-10-29 test: T gates pass, test net $79,925, run $340,148, DD $21,304; Priority 2's
    external context through 2026-10-30: $334,911.93, DD $21,303.61. Priority 1 found no refusals in 2023–2026 and
    that delayed D1 eligibility does not help it.
  - Growth #4 (`420cd989e4fa7749`, browser-chosen with 2016–2026 in view): 2025–2026 +$52,892.75; Growth
    `08500a60ec56cfae` (growth140-vgt-stable, selected on 2016–2024): +$45,464.93; the stable study's primary failed
    validation.
  - Priority 2 (VGT only): D1 primary + #4 · A full history $271,525.33 (validation +$66,585.12); D1 primary +
    08500a60 · A $252,359.65 (+$60,551.20); its joint primary +$22,251.64; its independent procedure was chronologically
    unsupported; the separately-optimized pair pooled earned +$23,858.51.
  - Appendix A (GDX Growth, a **browser-selected** configuration chosen with 2016-01-04 → 2026-10-30 in view): native
    standalone $141,157.37 net, $17,709.96 DD, 19 closed trades (17/2), flat at the end (the user's earlier ledger).
- **Therefore 2025-01-02 → 2026-10-30 is validation on previously examined history, not an untouched holdout.** The
  methodology was designed after examining this history. Fresh seeds are not fresh market history.
- **Incumbents and their provenance** (`CONTROL_MANIFEST.json`, sha256 `0f40efd7…aa1`, `fixtures/controls.json`):
  VG #2 (Study 8 F24, selected on development; informed for this study), the D1 shipped VGT primary, Growth #4
  (browser), Growth 08500a60 (growth140-vgt-stable, development), Appendix A (browser, full history in view;
  transcription-mapped, identity `07cac3329fc7a520`). None is ever an independent-lane or earlier-cutoff seed.

## 3. Data, doors, windows

- **Canonical files** (git-ignored, recorded by sha256): `data/VGT/data.csv` `2ee06310…412e`, `data/GDX/data.csv`
  `77dba9b2…5049`. Both dataset reports: 2,723 sessions 2016-01-04 → 2026-10-30, no missing session, the last row
  2026-10-30T23:59Z (after the close). The two session calendars and close times are identical (checked on every door).
  No GDX split is recorded; VGT's 8:1 split (2026-04-21) lies after development (FULL is forward-adjusted, so the
  pre-split prices are unchanged).
- **Common complete endpoint:** **2026-10-30** (both files hold its regular session completely). November–December 2026
  do not exist and are never implied.
- **Doors** (physical byte prefixes of each file through the New York date, verified by size, sha256 and last-row time
  before parsing; `context.ts` `doorSpecs`; VGT pins equal Priority 2's; GDX D23 equals the GDX training partition's
  sha256): D19 (→ 2019-12-31, 1,006 sessions), D21 (→ 2021-12-31, 1,511), D23 (→ 2023-12-29, 2,012), D24
  (→ 2024-12-31, 2,264). FULL = the browser's path (partition `all`, forward split adjustment, 2016-01-04 → 2026-10-30),
  only under the frozen selection's guard (AD6).
- **Windows:** development 2016-01-04 → 2024-12-31 (all search, refinement and selection); validation 2025-01-02 →
  2026-10-30; earlier cutoffs C19, C21, C23 (§14).
- **Continuity:** every run is one continuous causal run from 2016-01-04; nothing is liquidated or reset at a
  boundary. Period P&L = the change of the marked net between boundary closes; period drawdowns are reported reset at
  the boundary close (peak = the marked net there) and beside the whole-run drawdown. Every door opening is logged in
  `results/doors.jsonl`.

## 4. Controls, incumbents and comparison arms

### 4.1 The control set (`CONTROL_MANIFEST.json`, frozen before any of their pooled results; immutable)

| Key | Control | Group | Enabled components |
|---|---|---|---|
| `vg2` | VG #2 Balanced (D1·GDX `d1-7b99d2833d` + D1·VGT `d1-bd80e32ee4`) | D1-only | D1·GDX, D1·VGT |
| `g4+appA`, `g085+appA` | Growth pairs: #4 or 08500a60 on VGT + Appendix A on GDX | Growth-only | Growth·GDX, Growth·VGT |
| `appA` | Appendix A GDX Growth alone | Growth-only | Growth·GDX |
| `p2:primary+g4`, `p2:primary+g085` | Priority 2's VGT-only combinations (D1 shipped primary + #4 / 08500a60 · A) — **a smaller-universe comparison** | VGT-only | D1·VGT, Growth·VGT |
| `vg2+g4`, `vg2+g085` | VG #2 + one VGT Growth incumbent — **three components** | three-component | all but Growth·GDX |
| `vg2+g4+appA`, `vg2+g085+appA` | **Unchanged expanded combinations**: VG #2's two D1 books + a VGT Growth incumbent + Appendix A | unchanged four-component | all four |

All controls run on the study's harmonized conventions (§5.2), D1-first at a same-instant tie (VG #2's own pair keeps
its alphabetical order, which D1-first preserves). Appendix A's vector is the brief's transcription mapped to the
Growth 1.4.0 schema with every value explicit (`controls.ts` `appendixA`; no backend archive exists: no repository
record, the Strategy Lab run folder R-000040 is absent and the trash is empty; neither the preview cache nor the
Strategy Lab database is opened). Its reproduction of the known full-history target is compared at the validation
stage (AD6); if it does not reproduce, the Appendix A combinations are reported as transcribed-vector controls whose
browser identity is unverified, and the three-component controls remain the verified controls.

### 4.2 The comparison arms (combining unchanged phenotypes and refining them are separate experiments)

- **A — existing controls and unchanged combinations** (§4.1): evaluated, never searched, never overwritten.
- **B — the Growth pair, then combined as-is.** An independent joint search of **both Growth vectors together** on
  their executed Growth-only shared pool (D1 disabled; no incumbent seed; four entry-pair cells; §11). Its qualified
  members are ranked by the four role formulas on the Growth-only evidence; the **bounded shortlist** is the distinct
  holders of the actual-profit, robust-profit, balanced and lower-drawdown roles (≤ 4). Each is then combined,
  **unchanged**, with **VG #2's unchanged D1 pair** (D1-first) in the shared pool: the **staged combinations**. The
  Growth-only and the combined results are reported separately. VG #2 is not shown to be the optimal D1 partner.
- **C — informed four-component joint refinement** (C24 only). Seeds: the two unchanged four-component controls and
  every staged combination. All four vectors and the priority are mutable within the frozen space; near (scale 1.5) and
  broad (scale 3) Latin-hypercube designs around each seed, then islands with every gene free (structure included),
  rungs, refinement (§11). The seeds stay controls in their own right.
- **D — independent four-component joint discovery.** Four cells (Growth·GDX entry × Growth·VGT entry), no incumbent,
  control, archive or later-selected vector or range; the full pipeline (§11); repeated with identical budgets at C19,
  C21, C23 and C24 (§14). Components need not be profitable alone.

### 4.3 The informed selectable set (C24) and the fallback

The final selectable set is every **qualified four-component** member of: the unchanged four-component controls, the
staged combinations, arm C's shortlist and arm D's C24 shortlist — one rule for all (standard §3.2, first option: the
qualifying incumbents and fixed combinations are members of the selectable set, so no separate fallback is needed). If
none qualifies: **no qualified combined result** (reported as such). D1-only, Growth-only, three-component and VGT-only
controls are benchmarks and never the requested product. The independent primary (arm D's own actual-profit role) is
frozen and reported beside the final primary.

## 5. Economics and conventions

### 5.1 Economics (every component, every run)

One fixed **$100,000 principal budget**, no compounding, no external capital, no second family budget; **5 bps per
executed side**, $0 commission; **11% simple annual interest** on each lot's outstanding principal by calendar day on
a 365-day year (from the lot's fill session); stops fill at the stop or the gapped open, no extra slippage; price only
(no dividends: both canonical engines are price-only); fractional shares (principal ÷ fill price after cost; whole
shares is a report-only sensitivity). Profit = realized + the open lot marked at the last close net of accrued interest
(its exit cost not yet charged). Warm-up 0 (2016-01-04 is both files' first session; each indicator uses its own causal
history and nothing is backfilled).

### 5.2 Native reproduction, harmonization and the bridge

- **Native.** VG #2 (Study 8 / pools fixed mode): accounting from the close of 2016-01-04, **D1 arming from
  2017-06-15**, same-minute ties alphabetical, one slot. Reproduced exactly on D24 (§15.1 P6: $260,223.13 / $17,280.74 /
  36 lots / 14 refusals). Growth: warm-up 0 from 2016-01-04 (each Growth book's canonical run).
- **Harmonized (the study convention for every comparison).** Funding from **2016-01-04** for every component; D1 arms
  from the first session (each D1 machine arms once its L-session reference high exists); Growth unchanged. This is
  Priority 2's convention, so the VGT-only comparators reproduce Priority 2's sealed figures.
- **The bridge** (reported for VG #2 and every member: the D1 native arming as an ablation): the only change is D1's
  arming date. For VG #2 on development, harmonized arming starts its GDX book in December 2016 (first entry
  2016-12-19): $268,487.02 / $20,801.07 / 45 lots (dry parity), against the native $260,223.13 / $17,280.74 / 36. A
  convention bridge, not a parity match.
- **Prespecified sensitivity:** a common funding start of 2017-06-15 for every component (report-only).

## 6. The pooled engine (`books.ts`, `pool.ts`)

### 6.1 Signal sources: four independent canonical virtual books

- **D1** on each symbol: the frozen `ShadowBook` under shadow semantics on that symbol's Dataset (Priority 2's book with
  the symbol as a parameter; the symbol is only a label in the D1 engine).
- **Growth 1.4.0** on each symbol: `runRiseTrading`'s body on the door's cached Dataset and daily bars, through the
  Strategy Lab mapping. Native persistent eligibility may be ON or OFF (searched); D1's delayed-entry eligibility stays
  OFF (Priority 1). Partial exits (retention), trend retention, continuation and initial stops are canonical phenotype
  options.
- **The preserved virtual-book semantics (the user's decision through Priority 3; alternatives belong to Priority 5).**
  Funding never feeds back into a book. A refused entry still starts the component's virtual trade; the component waits
  for that virtual exit before it decides again under its canonical rules. Freed capital does not replay the refusal or
  turn it into a delayed purchase. Growth's native eligibility is a genuine later decision of the virtual book at its
  own time and price, never a preserved refusal. This is the design, not an accident; it is tested explicitly
  (`tests/pool.test.ts`: an unfunded virtual trade persisting after capital is freed is never funded later).

### 6.2 Funding (architecture A, one principal ledger)

A virtual trade can be funded **only at its own decision instant** and only from its own fill on. At the decision
instant the allocator decides once, from the state known then, **before any trade stamped at that instant**: grant
$100,000 iff no lot is open and no order is reserved; otherwise refuse ("slot occupied"). A granted decision reserves
the slot until its fill (the book's own fill rule: the next trade of its symbol after the decision; the next session's
opening trade for a decision at the close). A retained Growth remainder after a partial exit keeps the slot until its
final exit (a partial exit never opens a second funded slot); repaid principal stays idle. No preemption, no forced
switch, no reserved-capital scheme, no ranking model. **Same-instant decisions** (frozen): the family in the
configuration's priority (D1-first or Growth-first), then the symbols alphabetically (GDX, VGT), i.e. D1-first =
D1·GDX, D1·VGT, Growth·GDX, Growth·VGT. A disabled component is never funded. Every decision is logged (component,
trade, time, price, grant, outcome, reason, occupant).

### 6.3 The funded lot

Its own principal (always $100,000 = the books' notional under A), shares, interest from its own fill session, costs;
it exits exactly when and where its virtual lot does (every exit rule of both families is scale-invariant), with the
same partial fractions. Fills use the canonical formulas: proceeds = shares × price after cost; interest = principal ×
rate × calendar days ÷ 365; net = proceeds − principal − interest.

### 6.4 Order of events and marks (one merged timeline)

Each session's minute bars of both symbols are merged by time. At each instant T (a bar start of either symbol, or the
session close): decisions stamped ≤ T (tie order) → the exits and partial sales at T of the symbol(s) printing at T
→ the fills at T (then a new lot's exits due in its own fill minute) → the mark. The marked net (realized + the open
lot marked at its own symbol's latest price, net of interest to the session date) goes into strict trackers at every
instant at which the held (or just closed or opened) lot's symbol prints and at every session close — the N-book
engine's fixed-mode marking (`markFixed`: a lot is re-marked when its own symbol prints). With one symbol this is
Priority 2's `runPool` under A exactly. Peak principal and peak market value are reported separately.

## 7. The four-component space (`space.ts`)

- **D1 ×2 (8 each, always active):** the registry grid (tenths of a percentage point, days, sessions) inside Study 8's
  common D1 box (X 8.0–30.0%, Y 0.1–5.0%, stop 3.0–15.0%, hold 3–30, L 20–250, buffer 0.0–6.0%, P 3.0–20.0%, W 10–200);
  both VG #2 books are on the grid.
- **Growth ×2 (8 structural + 50 conditional numeric each):** growth140-vgt-s8m's genes and boxes — entry Rise |
  breakout; trend filter off | 5 methods; eligibility off | 5 policies (Rise only); recovery gate off | on; exits hold
  OFF | hold ON buffer OFF | hold ON buffer ON; initial stop off | on; retention off | on; continuation off | 4 methods —
  on the coarse box grid (independent screens and islands) or the fine schema grid (the informed lane and every
  neighbourhood; #4, 08500a60 and Appendix A are exactly representable). Dependencies: eligibility needs Rise; the
  buffer needs the maximum hold; method inputs are active only under their method; momentum S < L is repaired; the
  trailing stop is mandatory.
- **Priority:** D1-first | Growth-first (categorical).
- **Identity:** sha256 of the four canonical vectors (D1 grids; Growth browser identities of the effective values) and
  the priority; inactive genes never change it; duplicates are never evaluated twice in a job; behaviourally identical
  configurations (the same funded-lot ledger signature) are grouped in the reports. A disabled component's vector is a
  placeholder (the Growth-pair lane fixes D1 to the box minima and the priority to D1-first; neither is ever run).
- **Cells (protected strata):** Growth·GDX entry × Growth·VGT entry = 4 cells (mixed Rise/breakout pairs included). The
  **gate pair** (off/off, off/on, on/off, on/on) is protected inside every cell: the screen cycles the four gate pairs
  (¼ of the screen each), the island fillers cycle them, and the shortlist keeps a gate-alternative slot. Eligibility,
  exit structures (hold, retention, initial stop) and continuation stay free in the search and are reported per
  structural class (screened, plausible, promoted, rung-1 feasible).

## 8. Search objectives and feasibility (`fitness.ts`)

- **Feasibility** (normalized violation, 0 iff feasible): centre net > 0; centre maximum minute drawdown ≤ $35,000; the
  rung's neighbourhood p90 drawdown ≤ $35,000; structure — four-component lanes: **both families funded at the centre**
  (standard §2.7); the Growth-pair lane: Growth funded. No trade-count, $/year, concentration, equal-share, activity or
  breach-rate floor.
- **Objectives (minimized):** (−centre net, −robust net, neighbourhood p90 drawdown), with constrained domination and
  Study 8's `rankOrder` (feasible fronts by crowding, then infeasible by violation).
- **The robust net** = ½ median + ½ p10 of the neighbours' net (standard §0.3).

## 9. Participation and contribution (labels, not vetoes)

- **Per component:** *disabled*, *unfunded* (no capital at the centre), *token* (< 5% of the funded principal-days),
  *funded*. **Per family:** *single-family*, *token*, *mixed*.
- **Booked P&L** of a component or family: Σ net of its funded lots. **Causal contribution:** the system's net − the net
  of the same configuration rerun through the pool with that family, symbol or component disabled (capital
  availability changes, so it differs from booked P&L). An unfunded component, a token component or a negative causal
  contribution is labelled in the selection record and the report.

## 10. The robustness instrument (`space.ts` `neighbourhood`, `qualify.ts`)

- **Radius:** D1 — Study 8's N1 radius in grid units (X ±10, Y ±2, stop ±10, hold ±2, L ±10, buffer ±10, P ±10,
  W ±20), per book; Growth — 10% of each box in value units rounded to the fine step (growth140-vgt-stable's), per book.
  A neighbour = centre + u × scale × radius, rounded to the grid, clipped to the box widened to include the centre (the
  clipping count is reported). Categorical genes (structure, priority) stay fixed; categorical alternatives are
  report-only toggles. Inactive inputs are untouched; orders repaired.
- **Design:** one Latin hypercube of n points over all 116 numeric columns per seed family (common random numbers
  across the cutoff's centres); a centre uses the columns of its active inputs in the family's scope; duplicates of the
  centre or of earlier points are dropped; distinct configurations and distinct ledgers are reported.
- **Scopes (AD4):** joint (every active numeric input of all four books), D1 (both D1 books), Growth
  (both Growth books), VGT (D1·VGT + Growth·VGT), GDX (D1·GDX + Growth·GDX); the Growth pair: Growth (selection,
  confirmation), and each Growth book alone.
- **Fidelities:** rung 1 = 16 draws, rung 2 = 64, rung 3 = 128, refinement = 16; qualification: selection 2 × 128,
  **confirmation 3 × 128 = 384** independent draws (the standard's default), each scope 128, small (scale 0.5) and
  wide (scale 1.5) 128 each. A 16-draw estimate is never a confirmation.
- **Statistics:** median, p10, p90 of net; robust net; median, p90 and worst drawdown; breach count and share
  (drawdown > $35,000), mean excess and worst; the share of neighbours funding both families and all four components;
  distinct ledgers; draws equal to the centre; clipping.
- **Seeds:** `deriveSeed('vg-d1-growth-joint', …labels)`: screens `('screen', lane)` with Sobol blocks `(…, 'block', b)`
  and permutations; GA `('ga', island, lane)`; fillers `('fill', island, lane)`; informed designs `('local', seed,
  lane)`, `('broad', seed, lane)`; neighbourhood families `('nbhd', rung, cutoff)` for rungs 1–3 and refinement,
  `('nbhd', 'select', rep, cutoff)`, `('nbhd', 'confirm', rep, cutoff)` (independent of every ranking seed),
  `('nbhd', 'scope', scope, cutoff)`, `('nbhd', 'small' | 'wide', cutoff)`.

## 11. Searches (`search.ts`, `budgets.ts`, `stages.ts`)

### 11.1 Lanes

- **indep (arm D), per cell:** Latin-supercube Sobol screen of the whole genome (coarse grid; cell entries pinned;
  gate pairs cycled) → plausibility (centre net > 0, DD ≤ $35,000, both families funded) → promotion (¼ by centre net
  among the plausible, ¼ by constrained rank on (−net, DD), ½ by max-min L∞ diversity) → rung 1 → NSGA-II islands
  (§11.2) → rung 2 → rung 3 → refinement → the cell shortlist (§11.6).
- **gpair (arm B), per cell:** the same with D1 disabled and its genes and the priority pinned (Growth-only scope).
- **informed (arm C), one lane:** the seeds (§4.2) + `local` near and `broad` designs each → rung 1 → islands with every
  gene free → rungs → refinement → shortlist.

### 11.2 Islands, rungs and refinement

- **NSGA-II islands:** population P; binary crowded tournaments; categorical genes: uniform crossover with probability
  0.9, random reset with probability 1/(free categorical genes); ordinal genes: SBX η 15 p 0.9 and polynomial mutation
  η 20 with probability 1/(active ordinal genes) on grid indices; (μ + λ) survivors; every child fitted at rung 1; the
  base islands split the rung-1 archive by rank order (rank k → island k mod islands), topped up with Latin-supercube
  fillers of the cell. **Stagnation:** 8 generations without a 1e-3 relative gain of the island's hypervolume of
  (−robust, p90) against (0, $35,000) or of the lane's best feasible centre net.
- **Rung promotion** (rung 2 from the rung-1 archive, rung 3 from rung 2): ¼ by centre net (feasible), ¼ by robust net
  (feasible), the rest by constrained rank order, each pick at L∞ ≥ the rung's distinctness (rung 2: 0.02; rung 3:
  0.03).
- **Refinement** (fine grid, refinement fidelity 16): two starts, each ≤ 2 passes over the moves (every active numeric
  input of the movable books ±R/2 and ±R; the flipped priority; every enabled optional Growth rule of each book OFF):
  the **robust start** (the banded order's best feasible rung-3 fit; accept the banded-best feasible move raising robust
  net by ≥ $2,000) and the **profit start** (the highest feasible rung-3 centre net; accept the feasible move with the
  highest centre net raising it by ≥ $2,000); from an infeasible start, the move lowering the violation most, by
  ≥ 0.01. Endpoints are re-fitted at rung 3.

### 11.3 Extension triggers and caps (frozen; development progress only)

After the base islands, and after every extension, one more island runs (up to the cap) iff the last island raised, by
more than **5%**, the lane's union hypervolume of (−robust, p90), or its best feasible rung-1 robust net, or its best
feasible rung-1 centre net — or produced **a feasible structural class** (§7 class key) not feasible before it.
Progress per island (hypervolume, best robust and best net trajectories) is recorded. **Stopping conditions recorded per
lane:** "triggers not met" or "extension cap reached"; per island: budget, stagnation or no new configurations.
**Budget exhausted is not convergence.** Nothing is re-searched after a fold, a qualification or the validation.

### 11.4 Seeds of the informed lane

The two unchanged four-component controls and every staged combination (≤ 4), as sealed in the C24 informed search
record. The arm-B pairs are read from the sealed Growth-pair selection record (the informed search refuses to start
without it).

### 11.5 Budgets (frozen; `budgets.ts`)

The frozen schedule (set from the pilot bench before the freeze, `AMENDMENTS.md` R1):

| Lane | Screen | Promotion | Islands (base + ext.) × population × new proposals | Rungs 2 / 3 | Refinement | Shortlist |
|---|---:|---:|---|---|---|---:|
| arm D indep, per cell (× 4), C19/C21/C23/C24 | 4,096 | 64 | (3 + 1) × 64 × 1,024 | 16 × 64 / 6 × 128 | robust + profit starts, ≤ 2 passes, 16 draws | 4 |
| arm B gpair, per cell (× 4), C24 | 2,048 | 48 | (2 + 1) × 48 × 576 | 16 / 6 | robust + profit, ≤ 2 passes | 3 |
| arm C informed, one lane, C24 | seeds × (1 + 48 near + 48 broad) | — | (3 + 1) × 64 × 1,024 | 24 / 8 | robust + profit, ≤ 2 passes | 4 |

Distinct new centre proposals per arm-D cutoff: 16,384 screened + 12,288 island proposals (16,384 with every
extension) + ≈ 4 × 2 × 2 × ≈ 250 refinement moves; each island proposal and refinement move is fitted with 16
neighbours. The pilot measured throughput (§13.3, `results/pilot/PILOT.md`) and the compute estimate is in §13.4.
Earlier folds use the identical arm-D schedule (the matched-budget rule). Coverage and attrition are reported per
structural class; neighbourhood draws are counted separately from centres; archive hits separately from fresh
evaluations.

### 11.6 Cell shortlist (structural slots)

From the cell's rung-3 fits and refined endpoints, feasible only, one per ledger signature (its highest centre net),
each pick at L∞ ≥ 0.10 from earlier picks: (1) *profit* (the highest centre net); (2) *robust* (the highest robust
net); (3) *balanced* (robust ÷ p90); (4) *gate-alternative* (the highest centre net with another gate pair than the
profit pick); then centre-net order, up to the cap. The five most profitable infeasible centres stay visible with their
failed criteria.

## 12. Qualification, ranking, roles (`qualify.ts`; every cutoff, its training door only)

### 12.1 Evidence

Every shortlist member, every staged combination and (at C24) every control: the centre; selection (2 × 128);
confirmation (3 × 128 = 384, deduplicated, the actual count reported); the scopes (§10); small and wide; stresses (10
and 20 bps per side, 14% interest, +25 bps stop slippage, next-open stop fills — Growth books with the initial stop or
retention keep stop-level fills, recorded); toggles (the priority flipped; every enabled optional Growth rule of each
book OFF); causal removals (without D1; without Growth; without VGT; without GDX; without each component).

### 12.2 Gates (all must hold; thresholds fixed before any candidate result)

| Gate | Requirement | Why this threshold |
|---|---|---|
| Q1 | centre net > 0 | a selected system must make money on the history it was chosen on |
| Q2 | centre maximum minute drawdown ≤ $35,000 | the user's risk budget on the fixed $100,000 |
| Q3 | confirmation p90 drawdown ≤ $35,000 | the neighbourhood upper tail of risk within the budget: at most 10% of 384 independent neighbours may breach (standard §5.5); the breach share, mean excess and worst are reported beside it, not a bespoke breach-rate veto |
| Q4 | confirmation p10 net > 0 | the neighbourhood lower tail of profit: at least 90% of independent neighbours profitable — the tested Priority 2 instrument |
| Q5 | at 10 bps per side: centre net > 0 and drawdown ≤ $35,000 | robustness to doubled execution costs |
| Q6 | structure: four-component members fund **both families** at the centre (standard §2.7); Growth-pair members fund Growth | the combined product must be combined; per-component funding is labelled (§9), not imposed |

No activity floor, largest-winner cap, annual-profit floor, equal-family rule or breach-rate veto. Incumbents failing a
gate remain disclosed controls. Gates are never relaxed after results.

### 12.3 Roles and the primary (standard default formulas; ranked on the selection families)

Among the qualified members of a set:
- **actual-profit** = the highest centre net; ties by the higher selection robust net, the lower centre drawdown, then
  the label (`fitness.ts` `profitOrder`);
- **robust-profit** = the highest selection robust net;
- **balanced** = the highest selection robust net ÷ selection p90 drawdown;
- **lower-drawdown** = the lowest selection p90 drawdown among those with selection robust net ≥ 50% of the
  actual-profit holder's.

**The primary** = the actual-profit role of the informed selectable set (§4.3) at C24; at an earlier cutoff, the
actual-profit role of arm D's qualified members (the fold primary). **Fallback (frozen):** no qualified member → no
primary ("no qualified combined result"; flat in a fold's slice).

### 12.4 The reported sets at C24

`final` (the informed selectable set), `independent` (arm D), `staged` (arm B + VG #2), `refined` (arm C),
`unchanged` (the unchanged four-component controls); arm B's Growth-only roles. Each set's four role holders and its
Pareto set are frozen and reported.

## 13. Resources and recoverability

### 13.1 Containment (the user's limits)

All concurrently running study processes run in transient systemd user units inside one parent slice `vgjoint.slice`
with **MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0** (runtime properties re-applied before every launch); every
heavy stage is its own unit (`KillMode=mixed`, `TimeoutStopSec=120`, `Restart=no`, `--collect`); heavy stages run one
at a time. Claude, tmux and host services stay outside. No host-wide setting is changed. Long jobs never depend on an
SSH session.

### 13.2 Execution settings (from the pilot bench; `context.ts` `resources`)

**15** child-process workers (`--expose-gc`, 1.5 GiB old space), one door each (both symbols), started four at a time;
a full GC after every **64** evaluations or above 256 MiB of ArrayBuffers; ≤ 2 tasks in flight per worker; batches of ≤ 4,096;
per-worker bounded caches of virtual books (per book, compact trade lists); a per-job SQLite archive (WAL, LRU ≤ 50,000
records, write buffer ≤ 500 rows / 2 s) bound to the study, the job, the door pins and the evaluation-code digest. A
10-second monitor records the job cgroup's memory, RSS, heap, external and ArrayBuffers of every process; **at 24 GiB
of the job cgroup** dispatching stops, in-flight work finishes, the archive commits and the job exits 75 (a pre-limit
pressure guard well below MemoryHigh). A worker death fails the job at once (its in-flight tasks dropped); there is no
automatic restart. The worker count and the GC cadence were set from the bench (§13.4).

### 13.3 Resume and the pilot

Every stage is a deterministic function of its seeds and of the evaluations it requests; rerunning the same command
replays it with archived evaluations read back, so a resumed run equals an uninterrupted one (a kept lane result must
equal its replay). A progress checkpoint is written at least once a minute. **The pilot** (pilot budgets, `pilot-` job
names, the pseudo-fold P18 on D19, outputs in the cache) shows: a throughput bench of worker counts and book-cache
sizes on D24; a straight run; a graceful stop then resume; a unit SIGKILL then resume; a worker SIGKILL failing the job
promptly then resume — identical searches; the Growth-pair, informed, qualification, fold, sequential-shaped,
diagnostics, freeze and validation paths on pilot budgets (development only); expected refusals (FULL without the
guard, a sealed record rewrite).

### 13.4 The bench and the compute estimate (`results/pilot/PILOT.md`)

- **Bench** (D24, the rung-1 mix: 192 random four-component centres of every cell and gate pair, each with 16 joint
  neighbours = 3,264 evaluations; steady state after the workers are ready): 8 workers 47.4 evaluations/s (5.1 GiB job
  cgroup peak), 12 → 50.1 (7.6 GiB), 14 → 50.8, 15 → 50.6 (9.5 GiB), 16 → 51.2 (10.1 GiB); book cache 16 / 48 / 128
  entries: no difference; GC every 8 / 32 / 64 evaluations at 15 workers: 50.6 / 61.3 / 64.3 evaluations/s with the
  same 9.5 GiB peak. D19 at 15 workers, GC 32: 124.5/s. Worker start (four at a time): 10–20 s per job. One
  evaluation costs ≈ 106 ms on a quiet thread (D1 books ≈ 20 ms, Growth books ≈ 72 ms, the pool ≈ 14 ms).
- **Choice:** 15 workers, GC every 64 evaluations (the fastest stable setting; ≈ 35 GiB of host headroom left).
- **Estimate:** arm D ≈ 313,000 evaluations per cutoff (≈ 383,000 with every extension): C24 ≈ 1.4 h, C23 ≈ 1.2 h,
  C21 ≈ 0.9 h, C19 ≈ 0.6 h; arm B ≈ 130,000 (≈ 0.5 h); arm C ≈ 82,000 (≈ 0.4 h); qualification ≈ 1,500 evaluations
  per member (≈ 0.6 h in all); in total ≈ 5–7 hours of contained compute, heavy units one at a time.

## 14. Chronological procedure tests (arm D; `stages.ts`, `post.ts`)

### 14.1 Folds

| Cutoff | Training door (search, qualification, selection) | Sealed and committed before | Evaluation slice (door) |
|---|---|---|---|
| C19 | D19 (2016–2019) | its slice opens | 2020-01-02 → 2021-12-31 (D21) |
| C21 | D21 (2016–2021) | its slice opens | 2022-01-03 → 2023-12-29 (D23) |
| C23 | D23 (2016–2023) | its slice opens | 2024-01-02 → 2024-12-31 (D24) |
| C24 | D24 (2016–2024) | the validation | 2025-01-02 → 2026-10-30 (FULL, once) |

Order: C19 search → qualify → seal and **commit** the fold selection (the fold evaluation refuses an uncommitted
selection) → evaluate; then C21; then C23; then C24. A fold's evaluation never feeds a later search. No earlier cutoff
is seeded with VG #2, #4, 08500a60, Appendix A or any C24 result. The fold's frozen members are its independent role
holders; every control is evaluated on the slice **descriptively** (chosen with later data).

### 14.2 Sequential policy and verdict (frozen)

The fold primaries trade their slices in turn (flat without one), one continuous run per member on the evaluation door
(nothing reset at the boundary); a switch between different configurations at a boundary is charged **5 bps on
$100,000 for each open lot it closes or adopts**; reported: net, charges and the strict minute drawdown of the
concatenated slice marks; the same for each role and each control. **Verdict:** *chronologically supported* iff every
fold produced a primary, the sequential net > 0 and the sequential minute drawdown ≤ $35,000; *incomplete* if a fold had
none; *unsupported* otherwise. Failed folds and failed sequential risk limits are reported even if the final
neighbourhood looks attractive. Local stability and chronological reliability are reported apart.

## 15. Engineering gates (before any substantive search)

### 15.1 Parity (`parity.ts`, `parityStage.ts`; sealed `results/parity/parity.json`; zero tolerance unless stated)

- **P1 D1:** each D1 book alone (VG #2's two books, the shipped primary, random books) and two-book D1 pools (VG #2's
  pair, random pairs) against `runNAllocator` fixed mode on the same Datasets — every trade, lot, refusal, net,
  realized, minute and daily drawdown with times; both arming conventions; D19 and D24.
- **P2 Growth:** each Growth control and random configurations on **both symbols** against `runRiseTrading` +
  `summarizeSimulation` — every trade, daily mark, drawdown; the pool with one Growth book equals it.
- **P3 Priority 2's frozen engine:** one-symbol D1 + Growth pools (VGT and GDX, both priorities; Priority 2's two VGT
  combinations and random configurations) — net, realized, unrealized, drawdowns and their times, lots, funding
  decisions, daily marks.
- **P4 the independent reference** for four-component, Growth-pair and cross-symbol pools (AD5), with the identities: Σ
  lots = net; never two lots; principal ≤ $100,000; a disabled component never funded; a funded lot copies its virtual
  trade's fills.
- **P5 causality:** random four-component configurations on D19 and D21 equal their D24 runs through the shorter door
  (daily marks, funding decisions, funded lots).
- **P6 targets:** VG #2 native development = Study 8's sealed F24 centre (net, DD, 36 lots, 14 refusals); Priority 2's
  sealed development figures of D1 primary + #4 · A and + 08500a60 · A (net, DD, lots), Growth #4 and 08500a60 alone, D1
  primary alone.
- Any parity failure stops every dependent stage (the runner refuses to search without a sealed 0-failure parity).

### 15.2 Synthetic and unit tests (`tests/`)

Cross-symbol calendar alignment; merged minute ordering and marks; decisions before the trades of their instant;
next-session entry reservations; deterministic same-instant decisions (family priority, then GDX before VGT);
independent virtual and funded positions, **an unfunded virtual trade that persists after capital becomes free and is
never funded later**; the one slot and the cash identity; interest; partial exits holding the slot and counted apart;
exits on gaps at the virtual fill price; a disabled component; continuous year boundaries; period and whole-run
drawdowns; open remainders at the end; the reference on every case; identity, encoding, the screen, neighbourhood
determinism and scopes, moves; the actual-profit order and tie-break, the roles, the fallback, participation labels,
removals and toggles.

## 16. Diagnostics, the frozen selection and the one-time validation (`post.ts`)

### 16.0 Diagnostics (development D24; report-only; never a selection input)

For every frozen role holder of every set, the Growth-pair shortlist and every control: funded-lot, funding and daily
ledgers; funded-trade chronology by component; drawdown dates, depth and recovery; the largest market episodes and
the blackout rerun of the largest winning one (no new funding in it); gap exits; holding times by component; refused
opportunities with their occupant, the refused virtual trade's own net (descriptive) and the **idle sessions during its
unfunded virtual hold**; the opportunity-conflict matrix (refused component × occupant); same-instant decision groups
and whether the tie order decided a funding; exposure. For the primary and the independent primary: ablations (priority
flipped; symbol order reversed; whole shares; funding from 2017-06-15; D1 native arming; each stress; the top-episode
blackout) with "same ledger" flags; matched trades against every other subject by component (unchanged, retimed,
newly admitted, displaced, with Δ; reconciled to the cent).

### 16.1 The frozen selection

From the sealed C24 selection, after the sequential verdict and the diagnostics are sealed: the primary, every set's
roles, rank orders and Pareto sets, the Growth-pair roles and shortlist, every member's full vector and identity, the
controls, the chronology verdict, the code/data pins and the validation plan — written read-only and **committed**
before the validation.

### 16.2 Validation (FULL, once, under the guard)

Every frozen member and every control, one continuous run 2016-01-04 → 2026-10-30 (nothing liquidated or reset at
2024-12-31). Reported: validation P&L (the marked change from the 2024 close) with its realized part, the reset
validation drawdown, the whole-run drawdown and its dates, 2025 and 2026, lots opened after the boundary, crossing lots,
refusals. **V1** validation P&L > 0; **V2** validation drawdown ≤ $35,000; **V3** whole-run drawdown ≤ $35,000 (for the
primary and every member); **V4** the primary against every other member (reported); **V5** (report-only) confirmation
rep 1 (128 draws) on FULL for the final and independent role holders: median validation P&L; also 10 and 20 bps and 14%
interest. **The known full-history targets are compared here** (AD6): Appendix A's standalone figures (reproduced or
not), VG #2's native full history ($334,911.93 / $21,303.61), Priority 2's VGT-only rows ($271,525.33 / $19,534.41;
$252,359.65 / $19,556.63). A failed validation is a result: no new winner, no rescue search, no retuning; a better
validation score does not swap the primary.

## 17. Integrity

The freeze records this file's, the amendments', the brief's, the fixtures', the control manifest's and the adoption
manifest's sha256, the sealed parity record, the evaluation digest (`lab.ts` `evaluationFiles`), the code closure, the
door pins, the canonical data, git HEAD, the budgets and the resource contract. Sealed records are write-once (0444,
sha256 in `results/seals.jsonl`; `npm run vg-joint -- verify`). Every stage checks the preflight, the sealed parity and
the evaluation digest against the freeze or an acknowledged amendment. Fold selections are committed before their slices
open; `FROZEN_SELECTION.json` is committed before the validation. The checkpoint is `RESEARCH_RECOVERY.md`.

## 18. Reporting commitments

`REPORT.md`: one table for development, validation and full history (currency formatted) comparing VG #2 D1-only, the
Growth-only paired controls, the unchanged combined controls, the staged combination(s), the informed refinement, the
independent joint primary, the final frozen primary and the other roles, and the VGT-only combinations (labelled a
smaller-universe comparison); for each: full effective settings and identity, net with its realized/unrealized split,
maximum minute drawdown in dollars and as a percentage of the fixed $100,000 with its dates and recovery, lots and
wins/losses (partial exits counted apart from full episodes), exposure, holding periods, interest, execution costs,
open remainders and funding refusals. Funded-trade chronology and capital displacement by family and symbol; booked
versus causal contributions; the largest winning episode and its removal stress; idle capacity during unfunded virtual
holds; opportunity conflicts; whether same-time ordering changed trades. Neighbourhood distributions, breach tails
(share, severity, worst) and chronological verdicts beside centre results; search coverage, budgets, consumed
extensions, stopping reasons, memory and throughput, parity, tests, amendments, data provenance and limitations. The six
questions of the brief §8 answered explicitly. Nothing here implies live deployability or a guaranteed risk limit.
