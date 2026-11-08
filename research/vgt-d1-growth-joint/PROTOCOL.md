# Protocol — Priority 2: joint D1 + Growth optimization for VGT in one shared $100,000 pool

Status: **FROZEN** when `results/protocol-freeze.json` records this file's sha256 (written and committed before any
substantive search). Afterwards this file is never edited: changes go to `AMENDMENTS.md` only, criteria are never
loosened there, and an evaluation-code change needs an amendment and an acknowledgement.

Authority: `brief/BRIEF.md` (sha256 `b6dc8758…a2a88fb`, 224 lines, read in full). Branch
`research/vgt-d1-growth-joint` in the main checkout (from `846594c`, the end of Priority 1). Code:
`src/vgt-d1-growth-joint/`; command `npm run vgt-joint -- <command>` from the repository root.

**Written before any search, qualification, selection or fold result of this study existed.** Computed before it, all
engineering: the door build (sizes and hashes equal growth140-vgt-stable's pins), the parity dry runs (§9.1), the
synthetic tests (§9.2), the engineering pilot (§10.3; pilot budgets and job names, outputs in the git-ignored cache,
only timings, memory, counts and equality booleans read) and the development figures of the four fixed controls (§3).

**Prior knowledge (disclosed).** All of 2016–2026-10-30 has been examined by earlier VGT studies: the Growth controls'
2025–2026 results (08500a60ec56cfae earned $45,464.93 on 2025–2026; #4 $52,892.75; the growth140-vgt-stable primary
failed validation), Study 8's VG #2 pool ($334,911.93 through 2026-10-30), Priority 1's finding that VG #2 had no
refusals in 2023–2026, and that the stable study's independent Growth procedure broke the ceiling chronologically.
The methodology below was designed after examining this history. **2025–2026 is validation on previously examined
history, not an untouched holdout.** Fresh seeds are not fresh market history.

## 1. Question, objective, outcomes

- **Question.** Within a declared, bounded joint search over D1's eight parameters, Growth 1.4.0's rules and two
  allocation architectures, selected only on 2016-01-04 → 2024-12-31, is there a **combined** VGT D1 + Growth system in
  one shared $100,000 principal pool, with **both families funded**, that earns more net profit than the controls within
  a maximum minute drawdown of **$35,000** (35% of the fixed $100,000 budget), with stable neighbourhoods and a
  selection procedure that holds up chronologically — and what does it do on 2025-01-02 → 2026-10-30?
- **Objective (the user's).** Greater net profit (realized + marked unrealized, after costs and interest) within the
  ceiling. Worthwhile profit–risk trade-offs, lower-drawdown alternatives and uncertainty are reported, not only
  strict improvements.
- **Outcomes** (all valid): a frozen primary and shortlist (possibly none), their comparison with the controls,
  chronological evidence, and one validation. Distinguished: *a working combination* (both families funded, qualified),
  *an attractive historical trade-off*, *a robust improvement* (qualified, beats the controls on development and the
  procedure is chronologically supported) and *failed qualification*.

## 2. Data, doors, windows

- Canonical file `data/VGT/data.csv` (sha256 `2ee06310…412e`; first session 2016-01-04: **no pre-2016 data**).
- Doors (physical byte prefixes, verified by size, sha256 and last-row time before parsing; pins equal
  growth140-vgt-stable's): D19 (→ 2019-12-31, 1,006 sessions), D21 (→ 2021-12-31, 1,511), D23 (→ 2023-12-29, 2,012),
  D24 (→ 2024-12-31, 2,264, `c144619f…bf9ecb`). FULL = the browser's path (partition `all`, forward split adjustment,
  2016-01-04 → 2026-10-30; the 2026-04-21 8:1 split lies after D24).
- Windows: development 2016-01-04 → 2024-12-31 (all search, refinement and selection); validation 2025-01-02 →
  2026-10-30 (the latest complete session; November–December 2026 do not exist and are not evaluated).
- **FULL before the freeze** opens only for the parity of the fixed Growth controls' already-known full-history
  targets (§9.1). No joint candidate, no fixed combined control and no D1 control's 2025–2026 result is computed before
  `FROZEN_SELECTION.json` is committed. Every door opening is logged in `results/doors.jsonl`.
- Every run is one continuous causal run from 2016-01-04. Period P&L = change of the marked net between period-boundary
  closes; period minute drawdowns are reported reset at the period start (peak = the marked net at the boundary close)
  and beside the whole-run drawdown.

## 3. Controls and conventions

### 3.1 The four fixed family settings (`fixtures/controls.json`, checked in code by `controls.ts`)

| | Source (checked) | Values |
|---|---|---|
| D1 shipped VGT `primary` | `config/phenotypes/D1/VGT.json` via the registry resolver (pinned D1 source) | X 21.6% Y 0.3% stop 7.3% hold 8 L 74 buffer 2.9% P 9.0% W 60 |
| VG #2's VGT component | `s8-vg-balanced` = `S8-VG-F24-3` (Study 8 F24 rank 2), VGT book `d1-bd80e32ee4`, resolved through the sealed records | X 23.5% Y 0.9% stop 7.4% hold 15 L 78 buffer 4.4% P 11.0% W 55 |
| Growth `08500a60ec56cfae` | growth140-vgt-stable `FROZEN_SELECTION.json` (effective configuration; maximum hold OFF, so no loss-buffer value) | the brief's JSON exactly |
| Growth #4 `420cd989e4fa7749` | `src/growth140-vgt-s8m/space.ts` `control4` | the brief's description exactly (retracement 45%, buffer 2.9%) |

The fixtures hold every D1 `StrategyParams` field (including the inactive swing fields), Growth's effective
configuration and the engine parameters it maps to, and the economics.

### 3.2 Economics (both families, every run)

One fixed **$100,000 principal budget**, no compounding, no external capital; **5 bps per executed side**, $0
commission; **11% simple annual interest** on each lot's outstanding principal by calendar day on a 365-day year (from
the lot's fill session); stops fill at the stop or the gapped open, no extra slippage; price-only (no dividends — the
canonical D1 fixed pool and Growth are both price-only). Fractional shares (both canonical engines size a lot as
principal ÷ fill price after cost). Profit = realized + open positions marked at the last close net of accrued
interest (exit cost not yet charged).

### 3.3 Native reproduction, harmonization and the bridge

- **Native.** D1 (Study 8 / pools fixed mode): accounting from the close of 2016-01-04, arming from **2017-06-15**.
  Growth: trading from the 2016 window with warm-up 0. Reproduced exactly (§9.1).
- **Harmonized (primary).** Common earliest permitted funding date **2016-01-04**; each indicator needs its own causal
  history from the loaded 2016 data (no pre-2016 data exist; nothing is backfilled): D1 arms only once its L-session
  reference high exists (session index ≥ L); Growth's scanner, trend filter, gate, ATR and SMAs need their own
  lookbacks. The first funded date of each family is recorded per candidate.
- **The bridge.** The canonical D1 and Growth cost, interest, share and marking conventions are identical (both execute
  through `ShadowBook`/`ExitManager`, the same per-side cost, interest formula, strict minute tracker and marks), so the
  only native → harmonized change is D1's arming date. For both D1 controls the first D1 signal is in December 2018
  (2018-12-21 and 2018-12-24) on development, so native and harmonized results are identical on 2016–2024 (shown in the parity record). This
  is reported as a convention bridge, not as a parity match.
- **Prespecified sensitivity.** A common funding start of **2017-06-15** for both families (decisions before it are
  refused; the virtual books still run from 2016): reported for the frozen set and the controls, never used to select.

### 3.4 The control set (identical conventions; development at every cutoff, validation after the freeze)

- Fixed single-family: D1 primary alone; VG #2's VGT component alone; Growth 08500a60 alone; Growth #4 alone.
- Fixed combined: {D1 primary, VG #2 VGT} × {08500a60, #4} × {A; B 100%/100%; B 50%/50%} (D1-first), both families
  simulated in the pool.
- Independently optimized single-family controls (C24 only, §6.4): D1 alone and Growth alone, searched and selected on
  development with the same machinery and transparent budgets.
- External context only: Study 8's full VG #2 pool (VGT + GDX), never the like-for-like benchmark.

## 4. The combined engine (`books.ts`, `allocator.ts`)

### 4.1 Signal sources: independent canonical virtual books

- **D1:** the frozen `ShadowBook` under shadow semantics on VGT, driven in the N-book engine's fixed-mode order for one
  book. Its shadow trades, setups and continuation windows are exactly D1's standalone ones.
- **Growth 1.4.0:** `runRiseTrading`'s body on the door's cached Dataset and daily bars, through the Strategy Lab
  mapping. Its invested/flat state, gates, persistent eligibility and continuation are exactly Growth's standalone
  ones.
- **Funding never feeds back into a book.** A refused decision is still taken by its virtual book (it is "invested"
  virtually until its own exit), so the family makes no new decision until that virtual exit. Growth's harness
  capacity hook is not used.
- **A genuine later Growth eligibility decision vs a replayed refusal.** Growth's native persistent eligibility arms
  an opportunity at a raw crossing while the *virtual* book is flat (no order, no capital reserved) and decides later,
  at its own time and the then-current price, under its own causal lifecycle — that is a fresh decision of the virtual
  book, and the pool decides its funding at that instant. A refused funding, by contrast, leaves nothing armed: the
  virtual trade proceeds unfunded, and the pool never offers it again. Priority 1's delayed D1 funding stays OFF.

### 4.2 Funding (one principal ledger)

A virtual trade can be funded **only at its own decision instant** and only from its own fill on. At the decision
instant t the allocator decides once, from the state known at t (open lots with their outstanding principal and the
pending reservations), **before any trade stamped t**:

- **A — exclusive slot.** Grant $100,000 iff no lot is open and no order is reserved; otherwise refuse ("slot
  occupied"). A retained Growth remainder keeps the slot until its final exit; repaid principal stays idle. No forced
  switches.
- **B — shared residual capacity.** At most one live funded lot per family (holdings of the same ETF by both families
  are allowed). Capacity = $100,000 − outstanding funded principal − reservations (marked appreciation is not
  capacity). Demand = the family's initial target × $100,000, target ∈ {25%, 50%, 75%, 100%} per family. Grant
  min(demand, capacity) if ≥ the **minimum executable allocation of $10,000**; otherwise refuse ("no capacity" or
  "below the minimum allocation"). A smaller grant is a downsize; a lot is never topped up later. A partial sale repays
  its share of the principal immediately, which becomes capacity for a later decision of either family. Funds are
  fungible: one ledger, no segregated accounts.
- **Same-instant decisions** of the two families are taken in the configuration's declared priority (D1-first or
  Growth-first; a searched binary gene). No learned allocator, ranking, preemption or hindsight.
- A granted decision **reserves** its principal until its fill (the first trade after the decision — the book's own
  rule: the next minute's open; the closing print only for a decision before the close; otherwise the next session's
  opening trade). An order unfilled at a door's end stays reserved to the end.
- **Logged** for every decision: family, trade, time, price, demand, capacity, grant, outcome (granted / downsized /
  refused), reason and the occupant (lots and orders with their principal).

### 4.3 The funded lot

Its own principal P, shares P ÷ (fill price after cost), interest from its own fill session on its outstanding
principal, its own costs. Every exit rule of both families is **scale-invariant** — the net-profit trailing stop, the
maximum losing hold and the buffered loss compare shares × price − principal − interest with 0 or −principal × buffer;
retention sells a fixed fraction of the current shares and principal; the initial stop, the breakout and the trend
exits are price rules — so a funded lot exits exactly when and where its virtual lot does, with the same fractions.
**When it tracks and when it diverges:** a funded lot always starts at its virtual lot's fill (it can never start
later, so it never inherits a gain, a holding age or a pre-entry high); its exit times and prices are the virtual
lot's; it diverges only in scale (shares, principal, interest, cost dollars) when its grant is not $100,000. A virtual
exit that closes an unfunded virtual trade releases nothing. Each family's lot has its own exits: one family's stop
never liquidates the other; no pyramiding, no netting, no double counting.

Fills use the canonical formulas (FixedLedger / ShadowBook / PositionRules): proceeds = shares × price after cost;
interest = principal × rate × calendar days ÷ 365; net = proceeds − principal − interest; a partial sale removes its
shares and principal first.

### 4.4 Order of events at one instant and marks

At each minute bar start t (and at the close with the closing print): decisions stamped ≤ t (both families, priority
at a tie) → the exits and partial sales at t → the fills at t (then a new lot's exits due in its own fill minute) →
the mark at that minute's close. Marked net = realized + Σ open lots (shares × price − outstanding principal − its
interest to the session date), into strict trackers (new peaks only on >) at every regular-minute close of a session
in which a lot is held and at every session close. A session flat throughout with nothing reserved and no decision is
skipped bar by bar (its marks are constant: a no-op for the strict trackers). Peak market-value exposure (Σ shares ×
price at any mark) and peak principal are reported separately: 100% principal is not a cap on appreciated market value
or on drawdown.

**Report-only conventions:** whole shares (rounded down; principal = shares × fill price) and minimum allocations of
$0, $5,000 and $20,000, to show how much the declared choices bind.

## 5. The joint space (`space.ts`)

Every candidate encodes all active D1 parameters + all active Growth parameters + the allocation.

- **D1 (8, always active):** the registry grid (tenths of a percentage point, days, sessions) inside the common D1 box
  (Study 8's): X 8.0–30.0%, Y 0.1–5.0%, stop 3.0–15.0%, hold 3–30, L 20–250, buffer 0.0–6.0%, P 3.0–20.0%,
  W 10–200, all at grid resolution (every control value is on the grid).
- **Growth (8 structural + 50 conditional numeric):** growth140-vgt-s8m's genes and boxes — entry Rise | breakout;
  trend filter off | 5 methods; eligibility off | 5 policies (Rise only); recovery gate off | on; exits hold OFF | hold
  ON buffer OFF | hold ON buffer ON; initial stop off | on; retention off | on; continuation off | 4 methods — with the
  coarse box grid (independent lane) and the fine schema grid (informed lane, refinement and every neighbourhood;
  0.1-point percentages, 1 session or bar, so 45% retracement and a 2.9% buffer are representable). Dependencies:
  eligibility needs Rise; the buffer needs the maximum hold; method inputs are active only under their method; momentum
  S < L is repaired. The trailing stop is mandatory.
- **Allocation:** architecture A | B; under B the two targets {25, 50, 75, 100}%; priority D1-first | Growth-first.
- **Identity:** sha256 of the canonical D1 vector, the browser's Growth identity (effective parameters) and the
  canonical allocation (A's targets are inactive). Duplicates are never evaluated twice in a job. Behaviourally
  identical configurations (the same funded-lot ledger signature) are grouped in the reports.
- **Cells (protected strata):** architecture × Growth entry × recovery gate = 8 cells. The retention exit structure
  is protected by a shortlist slot (§6.5); the maximum-hold structure is reported per screened class (screened,
  plausible, promoted) and stays free in the search.

## 6. Search (`search.ts`, `budgets.ts`)

### 6.1 The neighbourhood instrument

- **Radius:** D1 — Study 8's N1 radius in grid units (X ±10, Y ±2, stop ±10, hold ±2, L ±10, buffer ±10, P ±10,
  W ±20); Growth — 10% of each box in value units, rounded to the fine step (growth140-vgt-stable's); B's targets — one
  grid step. A neighbour = centre + u × scale × radius, rounded, clipped to the box widened to include the centre.
  Categorical genes (structure, architecture, priority) stay fixed.
- **Design:** one Latin hypercube of n points over all 60 numeric columns per seed family (common random numbers
  across the cutoff's centres); a centre uses the columns of its active inputs; duplicates of the centre or of earlier
  points are dropped; the number of distinct configurations and distinct ledgers is reported.
- **Scopes:** joint (every active numeric input of both families and the targets), D1 only, Growth only, allocation
  only.
- **Fidelities:** rung 1 = 16 draws, rung 2 = 64, rung 3 = 128, refinement = 16; qualification: selection 2 × 128,
  confirmation **3 × 128 = 384**, one-family scopes 128 each, allocation scope 32 (B), small (scale 0.5) and wide
  (scale 1.5) 128 each. A 16-draw estimate is never a confirmation.
- **Statistics:** median, p10, p90 of net; **robust net = ½ median + ½ p10**; p90, median and worst drawdown; breach
  share (drawdown > $35,000), mean excess and worst; share of neighbours funding both families; share unchanged.

### 6.2 Feasibility in the search (normalized violation, 0 iff feasible)

Centre net > 0; centre maximum minute drawdown ≤ $35,000; neighbourhood p90 drawdown ≤ $35,000; the lane's structure
(joint lanes: **both families funded at the centre**; single-family lanes: that family). No trade-count, $/year,
concentration or equal-share floor. Objectives (minimized): (−robust net, neighbourhood p90 drawdown); constrained
domination; Study 8's `rankOrder` (feasible fronts by crowding, then infeasible by violation).

### 6.3 Lanes

- **Independent (8 cells, every cutoff):** Latin-supercube Sobol screen of the whole genome (cell genes pinned; no
  incumbent, control or archive vector) → plausibility (centre net > 0, DD ≤ $35,000, both funded) → promotion (½ by
  constrained rank on (−net, DD), ½ by max-min L∞ diversity) → rung 1 → NSGA-II islands (population 64; tournament;
  categorical genes: uniform crossover p 0.9, random reset with probability 1/(free categorical genes); ordinal
  genes: SBX η 15 p 0.9, polynomial mutation η 20 with probability 1/(active ordinal genes); every child fitted at
  rung 1; (μ + λ) survivors; stagnation: 8 generations without a 1e-3 relative gain of the island hypervolume on
  (−robust, p90) against (0, $35,000)) → **saturation rule (frozen):** two islands; after the second and any later
  island, one more island (up to 3) iff that island raised the cell's union hypervolume or its best feasible rung-1
  robust net by more than 5% → rung 2 (top 16 by rank order, distinct L∞ ≥ 0.02) → rung 3 (top 6, distinct 0.03) →
  refinement (1 start: banded order of the feasible rung 3, then the least violation; ≤ 2 passes; moves: every
  active numeric input of both families ±R/2 and ±R, each target ±1 step, the priority flipped, each enabled optional
  Growth rule OFF; from a feasible start accept the banded-best feasible move raising robust net by ≥ $2,000; from an
  infeasible start the move lowering the violation most, by ≥ 0.01; the endpoint re-fitted at rung 3) → cell shortlist.
- **Informed (C24 only):** seeds (sealed in the search record) = {D1 primary, VG #2's VGT} × {08500a60, #4, the
  growth140-vgt-stable development rank order's members 1–3 (`6aeb2e0f3918e574`, `22d35c826fc0dc86`,
  `fe457021bef9164d`)} × {A, B 100/100, B 50/50} = 30, both families mutable → each seed + 32 joint Latin-hypercube
  perturbations at scale 1.5 on the fine grid → rung 1 → one island per architecture (A, B; population 64; structure
  free except the architecture) → rung 2 (24) → rung 3 (8) → refinement (2 starts) → shortlist ≤ 4. These seeds were
  selected with data through 2024 (and their 2025–2026 results are known): the lane is labelled informed and is never
  part of the chronological procedure evidence.
- **Single-family controls (C24 only):** D1 alone (1 cell; Growth disabled) and Growth alone (4 cells entry × gate; D1
  disabled), the same machinery with that family's inputs only.

### 6.4 Budgets (frozen; the independent lanes identical at every cutoff)

| Lane | Screen | Promotion | Islands × population × new proposals | Rungs 2 / 3 | Refinement | Shortlist |
|---|---:|---:|---|---|---|---:|
| independent, per cell (× 8) | 2,048 | 64 | 2 (+1 extension) × 64 × 768 | 16 × 64 / 6 × 128 | 1 start × ≤ 2 passes, 16 draws | 3 |
| informed (C24) | 30 seeds × 33 local designs | — | 2 (A, B) × 64 × 768 | 24 / 8 | 2 starts | 4 |
| D1 alone (C24) | 2,048 | 64 | 2 (+1) × 64 × 768 | 16 / 6 | 1 start | 3 |
| Growth alone, per cell (× 4, C24) | 1,024 | 32 | 2 (+1) × 48 × 384 | 16 / 6 | 1 start | 2 |

Fresh joint proposals per cutoff in the independent lanes: 16,384 screened + 12,288 island proposals (18,432 with every
extension), each island proposal fitted with 16 neighbours (≈ 12 generations of 64 per island; stagnation may stop an
island earlier, recorded). The compute estimate is in §14. Study 8's VG schedule
(4 islands × 64 × 2,048) is a planning reference, not a claim of adequate coverage of this larger conditional space;
coverage and attrition are reported per cell. **Stopping:** the schedule above is the whole search; nothing is
re-searched after a fold, a qualification or the validation.

### 6.5 Cell shortlist (structural slots)

From the cell's rung-3 fits and refined endpoints, one per ledger signature, feasible only, each pick at L∞ ≥ 0.10
from earlier picks: (1) *top* (banded order, §7.3); (2) *exit-alternative* (the banded best with the other retention
setting); (3) *profit* (the highest centre net); (4) *lower-drawdown* (the lowest p90 among those with robust ≥ 50% of
the top's); then banded order, up to the cap. The five most profitable infeasible centres stay visible with their
failed criteria. Rejected and promoted counts per structural class are reported.

### 6.6 Seeds of randomness

`deriveSeed('vgt-d1-growth-joint', …labels)`: screens `('screen', lane)`, Sobol blocks `(…, 'block', b)`, GA
`('ga', island, lane)`, fillers `('fill', island, lane)`, informed local designs `('local', seed, lane)`; neighbourhood
families `('nbhd', rung, cutoff)` for rungs 1–3 and refinement, `('nbhd', 'select', rep, cutoff)`,
`('nbhd', 'confirm', rep, cutoff)`, `('nbhd', 'd1only' | 'gonly' | 'alloc' | 'small' | 'wide', cutoff)`.

## 7. Qualification, ranking, roles (`qualify.ts`; every cutoff, its training door only)

### 7.1 Evidence

Every shortlist member and every control: the centre; selection (2 × 128); confirmation (3 × 128 = 384 draws,
deduplicated, the actual count reported); D1-only and Growth-only perturbations (128 each) and the allocation scope
(B); small and wide (128 each); stresses (10 and 20 bps per side, 14% interest, +25 bps stop slippage, next-open stop
fills — applied to D1 and to Growth configurations without the initial stop or retention, whose canonical exits assume
stop-level fills; recorded as not applicable otherwise); toggles (the other architecture, the priority flipped, B at
100%/100%, each enabled optional Growth rule OFF); causal family removal (the same configuration with D1, then
Growth, disabled — capital availability changes, so this differs from subtracting booked P&L).

### 7.2 Gates (all must hold)

| Gate | Requirement |
|---|---|
| Q1 | centre net > 0 |
| Q2 | centre maximum minute drawdown ≤ $35,000 |
| Q3 | confirmation p90 drawdown ≤ $35,000 (up to 10% of neighbours may breach; share, mean excess and worst reported) |
| Q4 | confirmation p10 net > 0 |
| Q5 | at 10 bps per side: centre net > 0 and drawdown ≤ $35,000 |
| Q6 | structure: joint members fund **both** families at the centre; single-family members fund their family |

**Participation labels (not vetoes):** *single-family* (a family received no capital), *token* (a family's share of
the funded principal-days < 5%), *mixed* otherwise. A negative causal contribution of a family stays visible.

### 7.3 Ranking — the drawdown-preferring banded order

On the **selection** families: repeatedly take, among the remaining qualified members whose robust net is within 5% of
the best remaining robust net, the one with the lowest selection p90 drawdown (ties: higher robust, then label).
Confirmation decides qualification only.

### 7.4 Roles, primary, fallback

Among qualified joint members (independent and, at C24, informed) that fund both families:
**primary** = rank 1; **high-profit** = the highest centre net; **balanced** = the highest selection robust net ÷
selection p90 drawdown; **lower-drawdown** = the lowest selection p90 among those with robust ≥ 50% of the primary's;
**other-architecture** = the best-ranked with the other architecture; **structurally-distinct** = the best-ranked in
another cell of the primary's architecture. Frozen set = these, deduplicated, ≤ 6, in this order.
The single-family lanes' rank-1 members are the **optimized single-family controls** (never a joint role).
**Fallback (frozen):** no qualified mixed candidate → no primary; the fold policy is flat for its slice and the
failure is reported; the best infeasible mixed candidates stay visible.

## 8. Chronological procedure tests (`stages.ts`, `post.ts`)

| Cutoff | Training door (search, qualification, selection) | Frozen and committed before | Evaluation slice (door) |
|---|---|---|---|
| C19 | D19 (2016–2019) | its slice opens | 2020-01-02 → 2021-12-31 (D21) |
| C21 | D21 (2016–2021) | its slice opens | 2022-01-03 → 2023-12-29 (D23) |
| C23 | D23 (2016–2023) | its slice opens | 2024-01-02 → 2024-12-31 (D24) |
| C24 | D24 (2016–2024) | the validation | 2025-01-02 → 2026-10-30 (FULL, once) |

- C19–C23 rerun the **complete independent joint search and selection** with the matched budgets on their physical
  doors only (the informed and single-family lanes run at C24 only; disclosed). Order: C19 search → qualify → seal and
  commit the fold selection → evaluate; then C21; then C23; then C24. A fold's evaluation never feeds a later search.
- **Fold evaluation:** every frozen fold member and every fixed control, one continuous run 2016-01-04 → slice end on
  the evaluation door (guard: the sealed fold selection): slice P&L, slice minute drawdown (reset), whole-run drawdown,
  carried-in and open lots.
- **Sequential policies:** the fold primaries trade their slices in turn (flat without one); a switch between different
  configurations at a boundary is charged 5 bps on $100,000 for each open lot it closes or adopts; reported: net,
  charges and the strict minute drawdown of the concatenated slice marks; the same for each fixed control and for each
  role holder.
- **Verdict (frozen):** the joint procedure is *chronologically supported* iff every fold produced a primary and the
  sequential net > 0 with sequential minute drawdown ≤ $35,000; *incomplete* if a fold had none; *unsupported*
  otherwise. Known incumbents are descriptive controls at earlier cutoffs, never seeds there.

## 9. Engineering gates (before any substantive search)

### 9.1 Parity (`parity.ts`, `parityStage.ts`; sealed `results/parity/parity-3.json` for the frozen code (R1, R5; the earlier seals `parity.json` and `parity-2.json` kept); zero tolerance unless stated)

- **P1 D1:** the virtual book and the pool (D1 alone) against the N-book engine's fixed mode (`runNAllocator`, one VGT
  book) on the same Dataset — every trade's decision/entry/exit time, raw and after-cost price and reason, every lot's
  shares, principal, net and interest, the net, the realized P&L, the minute and daily drawdowns and their times — for
  both D1 controls under both arming conventions and 80 (D24) / 40 (D19) random vectors of the D1 box.
- **P2 Growth:** the cached-data book and the pool (Growth alone) against `runRiseTrading` + `summarizeSimulation`
  (the browser's path) — every trade, the daily marks, the net, realized, minute and daily drawdowns and their times —
  for both Growth controls and 80 / 40 random configurations of the whole Growth space.
- **P3 the pool:** Σ lots' net = net; B grants ≤ capacity; A never holds two lots; principal ≤ $100,000; a disabled
  family is never funded; B 100%/100% = A without partial sales; **causality:** 24 random joint configurations on D19
  equal their D24 runs through 2019-12-31 (daily marks and every funding decision).
- **P4 native targets:** 08500a60 development $115,509.15 / $19,344.80; full history $160,974.09 net, $151,597.87
  realized, $9,376.22 unrealized, $19,344.80 drawdown, 5 closed winners, 3 closed losers, 1 open, validation
  $45,464.93; #4 development $92,575.71 / $14,578.10, full $145,468.46 / $14,578.10; D1 primary development (B1 at
  5 bps) $135,359.04 / $19,534.41; the pool equals the canonical full-history figures.
- Any parity failure stops every dependent stage.

### 9.2 Synthetic tests (`tests/`)

Funding caps; partial-sale accounting and the released principal admitting the other family (the ledger example);
the retained remainder occupying A's slot; the minimum allocation; actual-entry initialization; same-instant priority;
a decision before the trades of its own instant; reservations; independent exits; terminal marking; continuous year
boundaries; the identity of A's inactive targets; the selection fallback; the banded order; participation labels.

## 10. Resources, containment, resumption

### 10.1 Containment (the user's limits, verified on the host)

- Parent slice `vgtjoint.slice` with `MemoryHigh=44G`, `MemoryMax=48G`, `MemorySwapMax=0` (runtime properties,
  re-applied before every launch); every heavy stage is its own transient user unit inside it (`KillMode=mixed`,
  `TimeoutStopSec=120`, `Restart=no`, `--collect`), so the limits bound all concurrently running study processes
  together. Heavy stages run **serially** (one at a time). Swap 0 (the host's swap is full with other workloads). No
  host-wide security or OOM setting is changed. Long jobs never depend on an SSH session.

### 10.2 Memory and workers

Child-process workers (`--expose-gc`, 1.5 GiB old space), one door each, started one at a time; a full GC after every
8 evaluations or above 256 MiB of ArrayBuffers; ≤ 2 tasks in flight per worker; batches of ≤ 4,096; per-worker bounded
caches of virtual books (48 per family, compact trade lists only). Per-job SQLite archive (WAL, 32 MiB page cache, LRU
≤ 50,000 records, write buffer ≤ 500 rows / 2 s), bound to the study, job, door pin and evaluation-code digest. Every
evaluation is archived (failed or dominated included). A 10-second monitor records the job cgroup's memory, RSS, heap,
external and ArrayBuffers of every process, queue and evaluation counts; at 16 GiB of the job cgroup dispatching stops,
in-flight work finishes, the archive commits and the job exits 75. A worker death fails the job (exit 1) at once; there
is no automatic restart.

### 10.3 Resume and the pilot

Every stage is a deterministic function of its seeds and of the evaluations it requests; rerunning the same command
replays it with archived evaluations read back, so a resumed run equals an uninterrupted one. A progress checkpoint
(stage, lane, island, generation, counts) is written at least once a minute and at every stage boundary. **The pilot**
(pilot budgets, `pilot-` job names, the pseudo-fold P18 on D19, outputs in the cache) must show: a straight run;
a graceful stop then resume; a unit SIGKILL then resume; a worker SIGKILL failing the job promptly then resume — all
four searches identical; the qualification, fold-evaluation, sequential, diagnostics and C24-shaped paths on pilot
budgets; expected failures (FULL without the guard, a sealed record rewrite, a failing chain step); and a throughput
bench.

## 11. Integrity

The freeze records this file's, the amendments', the brief's and the fixtures' sha256, the evaluation digest, the code
closure, the door pins, the data hash, git HEAD, the budgets and the resource contract. Sealed records are write-once
(0444, sha256 in `results/seals.jsonl`). Every stage checks the evaluation digest against the freeze or an
acknowledged amendment. Fold selections are committed before their slices open; `FROZEN_SELECTION.json` is committed
before the validation.

## 12. Diagnostics (report-only; development D24; never a selection input)

For the frozen set, the optimized single-family controls and the fixed controls: funded-lot, partial-fill and
funding-request/refusal ledgers; daily marked net, principal and market value; drawdown dates, depth and recovery;
the largest market episodes (pool-level, 10-session gap) and the arithmetic removal of the largest; gap exits; refused
opportunities with their virtual P&L; exposure (sessions held, both families held, peak principal, peak market
value). For the primary: ablations (A vs B and partial release, priority, retention OFF, each family removed, minimum
allocations $0/$5,000/$20,000, whole shares, the 2017-06-15 funding start, D1 native arming, each stress, and no new
funding during the largest episode — a causal rerun); the whole allocation grid at its trading parameters; and matched
trades against every other subject (unchanged, resized, retimed, newly admitted, displaced, with Δ). A ledger example
of a partial release followed by the other family's admission. Annual P&L.

## 13. Final selection and the one-time validation

- **Frozen selection:** from the sealed C24 selection, after the sequential verdict and the diagnostics are sealed:
  the members, roles, rank order, primary, the optimized single-family controls, the controls, the tests, the
  perturbation families and the code/data pins — written read-only and **committed** before the validation.
- **Validation (FULL, once, under the guard):** every frozen member, the optimized single-family controls and every
  control, one continuous run 2016-01-04 → 2026-10-30 (nothing liquidated or reset at 2024-12-31). Reported: validation
  P&L (marked change from the 2024 close), the reset validation drawdown, the whole-run drawdown and its dates
  (including episodes crossing the split), 2025 and 2026, carried-in lots, lots opened after the boundary.
  **V1** validation P&L > 0; **V2** validation drawdown ≤ $35,000; **V3** whole-run drawdown ≤ $35,000; **V4** the
  primary vs every control (reported); **V5** (report-only) confirmation rep 1 (128 draws) on FULL: median validation
  P&L > 0; also 10 and 20 bps and 14% interest on FULL. A failed validation is a result: no new winner, no rescue
  search, no retuning.

## 14. Compute estimate (from the pilot, `results/pilot/PILOT.md`)

- Cost of one joint evaluation on D24 (one thread): the Growth book ≈ 62 ms (the canonical engine, unchanged), the D1
  book ≈ 10 ms, the pooled replay ≈ 5.6 ms. Measured throughput with 14 workers: ≈ 90 evaluations/s on D24 (pilot E's
  search, small batches), ≈ 130–150/s on D19; it saturates near the 8 physical cores. Memory: 14 workers peak at
  5.9 GiB of the job cgroup (worker RSS ≤ 0.43 GiB, ArrayBuffers ≤ 29 MiB); no memory event.
- Evaluations per cutoff (independent lanes): ≈ 8 × (2,048 + 64 × 17 + 2 × 768 × 17 + ≈ 1,100 fillers + 16 × 65 +
  6 × 129 + ≈ 3,900 refinement) ≈ 290k, ≤ 390k with every extension; qualification ≈ 40 members × ≈ 1,150 ≈ 46k.
  C24 adds the informed lane (≈ 50k), D1 alone (≈ 36k, cheap) and Growth alone (≈ 60k) and ≈ 17k of qualification.
- Wall time (one unit at a time): C19 ≈ 30–40 min, C21 ≈ 40–55 min, C23 ≈ 50–65 min, C24 ≈ 80–110 min — about
  3.5–4.5 h in all. The drafted 1,024 proposals per island (≈ 5 h) were reduced to 768 after the bench, before the
  freeze (`AMENDMENTS.md` R2); the schedule still exceeds Study 8's VG reference (8,192 island proposals).

## 15. Reporting commitments

`REPORT.md`: development, validation and full-history net with the realized/unrealized split, maximum minute drawdown
in dollars and as a percentage of the $100,000 budget, drawdown dates and recovery, trades, wins/losses, losing-trade
dollars, interest and costs, holding times, funded and market-value exposure, family allocation and open remainders;
annual and fold results; neighbourhood distributions; concentration and uncertainty; coverage and attrition per cell;
the comparison with every control on identical conventions; the matched-trade decomposition; the section
**"Priority 2 review — decision before Priority 3"**. Overlapping VGT positions of both families are not
cross-asset diversification. Nothing here implies live deployability or a guaranteed risk limit.
