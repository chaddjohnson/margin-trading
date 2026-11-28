# Protocol P6-TSLA 1.0.0 — Priority 6: TSLA D1 + Growth (standalone, fixed, joint and D1-first sequential)

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
official evaluation). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only). Research only: nothing
here adopts a candidate, changes an official configuration, adds TSLA to New L0, merges into `main`, deploys or touches a
broker; the MSFT study is not started. Reports are written analysis, Markdown tables and machine-readable results only
(standard §7.7).

- **Study:** `research/tsla-d1-growth/`; official code `src/tsla-d1-growth/` started by `npm run tsla -- <command>` through
  `src/gpu-backend/officialRunner.ts`; non-official engineering, data, pilot and report-only tools in `tools/tsla-d1-growth/`
  (`npm run tsla-eng`, `npm run tsla-diag`); the chain `chains/chain.sh`.
- **Brief:** `brief/BRIEF.md` (the user's "Claude Code — Priority 6: TSLA D1 + Growth Research, with Priority 5 Archive
  Preservation", sha256 `65c59cf0ae4a4a79f62bb966ebe8304e1a91dec3c7f8946c1ae9eab46069dceb`, read in full to its §10 success
  criteria and final-response instruction).
- **Branch:** `research/tsla-d1-growth` (main checkout) from `dc023c3b78614d59ea951b9b87a019d7a72fa758` (Priority 5's final
  commit; the accepted GPU Phase 7 lineage; S1-free engine).
- **Pre-freeze evidence:** `STORAGE_PRESERVATION_REPORT.md` (Phase 0A), `TSLA_DATA_AUDIT.json` / `.md` (Phase 2),
  `reports/data/SUITABILITY.json` (development only), `FUNCTIONALITY_AUDIT.md` (Phase 3), the engineering gates E1–E9 (§13).

## 0. Standard adoption, adaptations and departures

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` **3.0.0**, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1`, read in full 2026-11-25T10:20Z |
| Adoption manifest | `STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/tsla-d1-growth`); every official stage calls `requireStandardAdoption` (`stages.ts officialGuards`) |
| Scope | `optimization` |
| Evaluation backend (§9) | official evaluations only through `openOfficialGpuSession` → `GpuPool` → `EvalLab`; acceptance `config/gpu-backend/acceptance.json` (GPU Phase 7, sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`, binary `research/gpu-phase7/build/gb7` `cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82`, device `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`), its sha256 kept out of band (Priority 5's handoff); no CPU fallback; `node --no-maglev` |
| Reference method (§4.8) | `docs/research/methods/NEW_L0_METHOD.md` id `NL0` 1.0.0, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`: its per-lane schedules, operators, instrument, gates, roles and primary rule, as Assignment 3 and Priority 5 executed them (the lane is derived mechanically from Priority 5's, `src/tsla-d1-growth/derive.ts`); stage map §7.7 |

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §4.1, §4.3, §4.8 | adaptation | **The TSLA space** (`src/tsla-d1-growth/space.ts`): Assignment 3's genome semantics (Study 8's D1 box and grid, Assignment 2's RC 2 control families and boxes, Growth 1.4.0's complete genome on growth140's boxes, coarse and fine grids, identity, strata, neighbourhood instrument, moves) restricted to the **one trading slot**: the accepted engine's VGT slot carries TSLA (both slots one TSLA SymDoor; GDX books disabled; no evaluation file changed — gates E1, E4, E6). Five **arms** with protected **cells**: D (8 D1 structures), G (6 Growth exit-protection structures), J (48 = 8 × 6), S (frozen D1 finalist × 6), C (fixed pairs, no search). S1 absent; shadow eligibility OFF; calendar-day holds (brief §1) |
| AD2 | §4.2, §4.5, §4.8 | adaptation | **Effort by replicates** of NL0's unchanged per-lane schedules, per arm (§7.6), with **Priority 5's two-tier island rule** (NL0's trigger to NL0's caps 6/8, performance components to 16) and **convergence-driven replicate rounds** (≤ 4 per arm and cutoff, 2 %) — Priority 5's AD2/AD3, unchanged |
| AD3 | §1.8 | adaptation | The sequential drawdown statistic is Priority 5's (AD4 there): exact over every GPU-observed mark; procedures per arm (§11) |
| AD4 | §2.3, §2.5 | adaptation | **NL0's original rule is THE selector** (primaries, roles, finalists, frozen D1, pairs). **RA1** (Assignment 3's experimental risk-aware rule, thresholds unchanged) is computed on the **identical** qualified populations as a **separately labelled, report-only experimental selector** (brief §4.8): never a primary, finalist, frozen D1, pair, role or slice subject; never promoted |
| AD5 | §3.4 | adaptation | **The method comparison** of the brief: (b) separately optimized components pooled = arm C; (c) fully joint = arm J; a staged variant without joint refinement (D1 frozen first, Growth second) = arm S; standalone arms D and G and external VGT phenotypes as controls. Matched evaluation rules (same windows, instrument, seeds, statistics, economics); effort matched by the frozen rule of §7.6 (S + its D1 step ≥ J) and disclosed per arm |
| AD6 | §5.3 | adaptation | The neighbourhood instrument is Assignment 3's on the TSLA slot (radii, Latin hypercube, clipping, repairs), in **this study's seed namespace** (`deriveSeed('tsla-d1-growth', …)`), with common random numbers across centres AND arms; it perturbs every active input of the configuration's trading books (D: D1; G: Growth; C, J, S: both, the frozen D1 of S included). Arm S's **design** neighbourhoods (new centres of seeded lanes) never move the frozen D1 (the only change of the lane, `derive.ts`) |
| AD7 | §5.1 | adaptation | Priority 5's eight stresses: cost 0 / 2 / 10 / 20 bps, interest 14 %, stop slippage +10 / +25 bps, next-open stops (Q5 uses 10 bps; the rest report-only) |
| AD8 | §1.8, §2.5 | adaptation | **The precommitted determination** (§12; `outcome.ts`): finalists, development and chronological labels sealed before FULL; architecture comparisons with Priority 5's materiality bands and replication; "no qualifying TSLA candidate" is valid |
| AD9 | §5.9 | adaptation | The D1 maximum-hold-window tail stress uses **pre-2016 TSLA daily data** (2010-06-29 → 2015-12-31, Yahoo Finance; disjoint from every door) as the declared reference history (daily resolution: labelled), beside the in-sample development stress |
| AD10 | §0.3, §1.3 | adaptation | The common complete endpoint is **TSLA's own: 2026-10-30** (the program's endpoint; TSLA has a complete regular session on it and no missing session before it; later sessions were deliberately not downloaded) |
| AD11 | §3.1–§3.3, §4.4 | adaptation | **No TSLA incumbent exists**: no incumbent-informed lane (§4.4's informed refinement is conditional on incumbents). New L0's and N/original's VGT books are **external controls only** (projected unchanged onto TSLA in arms D, G, J; never seeds, members, finalists or primaries; brief §3) |
| AD12 | §2.7, §4.7 | adaptation | Real participation: arms C, J, S require **both TSLA books funded** at the centre (Q6, feasibility); D and G their own book. Growth's protected and unrestricted exit structures are **protected by cells** (equal budgets) and analysed as report-only sub-populations (G-P/G-U, J-P/J-U, S-P/S-U) |
| AD13 | §5.6 | adaptation | TSLA's split ledger is the study's own file in the exact schema of `config/market-events/splits.json`, applied by the canonical function: the central file is sha256-pinned by ≥ 45 frozen records and three code pins (adding TSLA there would make their fail-closed guards refuse); registering TSLA centrally is a user decision (`DECISION_REGISTER.md`) |

No [M] rule is changed: there is **no departure**.

## 1. Question, hypotheses, objective and outcomes

- **Question (brief §1, §6).** On TSLA alone, what do fully funded, from-scratch D1 and Growth optimizations find standalone,
  and does combining them in one exclusive slot — as a fixed pair of the standalone selections, fully jointly optimized, or
  D1-first sequentially — add value, under the program's fixed strategy behaviour and NL0's method?
- **Objective (standard §2.2).** Development net profit (realized + marked, after costs and interest) with a maximum minute
  marked drawdown ≤ **$35,000 = 35 % of the fixed $100,000 initial trading allocation** (P0; never of peak equity), beside
  neighbourhood robustness, chronological evidence and exposure diagnostics.
- **Hypotheses** (each may fail; a null is a result):
  - **H1.** Each standalone arm (D, G) has a Q1–Q6-qualified development member at C24. Null: TSLA's volatility makes no
    configuration of an arm pass the $35,000 gates.
  - **H2.** A combined arm (C, J or S) is a material improvement over the better standalone primary (§12). Null: combining
    in one slot adds no material value.
  - **H3.** An arm's independent procedure is chronologically supported (§11.2). Null (common in the program): unsupported.
  - **H4.** The searches converge: the budget-bound share (a performance component still firing at 16 islands) is ≤ 10 % of
    lanes per arm and cutoff and the replicate rounds stop on their trigger. Null: budget-limited, reported as such.
- **Valid outcomes:** TSLA research candidate(s) for the user's review; development-qualified candidates without
  chronological support; **no qualifying TSLA candidate**. None is a failure of the study. Nothing is adopted or deployed.

## 2. Prior knowledge and provenance

- **TSLA:** never optimized in this program; no TSLA incumbent. TSLA's market history 2016–2026 is public and was not
  examined by this program's studies, but **2020, 2022 and 2025–2026 broad-market episodes were examined by many studies**;
  the validation is therefore **retrospective, previously examined broader-market history — not an untouched holdout**,
  and there is no prospective unseen period.
- **Real-data exposure before this freeze:** the data audit (coverage and integrity counts on 2016–2026; no 2025–2026
  returns); the development-only suitability analysis (D24; descriptive, `reports/data/SUITABILITY.json`); the engineering
  gates (equality counts and hashes; New L0 / N/original compared with their sealed figures on their own data); the pilot
  (counts, timings, stop reasons; BENCH seed keys never used by the study). **No box, threshold, budget, cell or rule was
  derived from a TSLA profit or drawdown**: the boxes are the original D1 / Growth domains, the gates P0's.
- **External controls** (§4): New L0 (5B `C24/L0/informed/R1#1 profit`, quad `a2e385640ca61012`) and N/original (Assignment 3
  `C24/informed/GD.VB/R2#1 profit`, `rc1-f1a8b57cb02455c3`), read from Assignment 3's sealed `FROZEN_SELECTION.json`
  (`4080d4b1…`) through Priority 5's `references()`; chosen on VGT/GDX with 2016–2026 in view.
- **I1** (Priority 4's S1-enabled comparator) is not evaluable here (S1 absent) and is not a TSLA comparator.

## 3. Data, doors and windows

- **Canonical file:** `data/TSLA/data.csv` (Alpaca SIP 1-minute, raw prices; 1,975,254 rows; 2016-01-04T09:00Z →
  2026-10-30T23:59Z; sha256 `8ed7f7d07edb11893f57c24bee3c729e294ebda36d9aa7059e4f89e8e3b0da72`; imported and verified by
  `npm run datasets`), audited in `TSLA_DATA_AUDIT.json` (2,723 of 2,723 NYSE sessions; 0 missing; 0 duplicates; 0.07 %
  missing regular minutes in development, 0 in validation; 7 halts ≥ 5 minutes, kept as they are).
- **Splits:** `data/TSLA-splits.json` (sha256 `e96d623605b9282ae0e7756d24e1b5cdc70054a8b0078985c64d53ff6109dd79`): 2020-08-31
  5:1 and 2022-08-25 3:1 (SEC 8-K exhibits; OCC memo; independently Yahoo's split events and adjusted closes, ratio 15 within
  0.12 %); **forward adjustment** by `src/lib/corporateActions.ts adjustSessionsForSplits` (every door in 2016-01-04 share
  units; fractional shares).
- **Doors** (`data/DOOR_PINS.json`, sha256 `193fc2068ca0f73e93040541809b5c1dbb155e8362672ffd3ab0bc1715f7b611`): byte prefixes
  **D19, D21, D23, D24** (through 2019-12-31, 2021-12-31, 2023-12-29, 2024-12-31; 1,006 / 1,511 / 2,012 / 2,264 sessions) and
  **FULL** (through 2026-10-30; 2,723 sessions), each verified by size, sha256 and last row before parsing; equal to the
  canonical partition path (gate E2).
- Development 2016-01-04 → 2024-12-31 for every choice; validation 2025-01-02 → 2026-10-30 only for the frozen slate, once.
- Folds: **C19** → slice 2020-01-02 → 2021-12-31 (D21); **C21** → 2022-01-03 → 2023-12-29 (D23); **C23** → 2024-01-02 →
  2024-12-31 (D24); **C24** → FULL once. Every run is continuous from 2016-01-04 (no reset at a boundary); slice P&L = the
  marked change from the cutoff close; slice DD resets at the cutoff close; whole-run DD beside it.
- Every opening goes through `doors.ts` (guards in its header) and is logged in `results/doors.jsonl`.

## 4. Controls and comparison rows

| Row | Role |
|---|---|
| External controls `control: New L0 / N/original on TSLA (arm D, G, J)` | their VGT D1 book alone (arm D), Growth book alone (arm G), both (arm J), unchanged, qualified with the study's instrument at every cutoff and replayed on every slice and the validation; descriptive only |
| TSLA buy-and-hold (report-only, after the validation) | $100,000 of TSLA bought at the 2016-01-04 open (5 bps), held to the endpoint, marked at every close and the session lows: **financed** (11 % simple interest on $100,000 by calendar day: the strategies' financing convention) and **unfinanced**; DD in dollars of the $100,000 allocation; development, validation and full history; with exposure normalization (net per $100,000-year of principal) |
| Arms against each other | D, G (standalone), C (fixed pairs), J (joint), S (sequential): §12's comparisons |

## 5. Engine and conventions (unchanged)

Priority 3's pooled engine through RC 2 (`src/d1-risk-controls-rc2/`) on the accepted GPU evaluator (the TypeScript engine
stays the reference): one exclusive funded $100,000 slot granted only at a decision's own instant when nothing is open or
reserved; same-instant order **D1 first, then Growth**; no compounding, preemption or forced switches; 5 bps per executed side
inside the fill prices, $0 commission; 11 % simple interest on outstanding principal by calendar day (365-day year); stops at
the stop level or the gapped open; fractional shares; harmonized D1 arming from 2016-01-04; D1's shadow lifecycle and Growth
lifecycle L0; shadow-entry eligibility OFF; S1 absent; calendar-day maximum holds; price only (TSLA pays no dividend). The
engine's GDX slot is disabled in every evaluation (D1·GDX fixed inert, Growth·GDX the placeholder). Every evaluation requests
the risk envelope (trade principal loss, banked-capital DD; marked and liquidation): report-only.

## 6. Space (`src/tsla-d1-growth/space.ts`; `FUNCTIONALITY_AUDIT.md`)

- **Genome:** 11 categorical + 64 ordinal = 75 genes (family, gate, activation, Growth's 8 structural; D1 8, controls 6,
  Growth numeric 50). Boxes: D1 Study 8's (X 8.0–30.0 %, Y 0.1–5.0 %, stop 3.0–15.0 %, hold 3–30 calendar days, L 20–250, buffer
  0.0–6.0 %, P 3.0–20.0 %, W 10–200); controls Assignment 2's (d 3.0–25.0 %, hx 6–60 days, g 1.0–15.0 %, K 1–4, r 10–100 %,
  c 5–250 sessions); Growth growth140's (maximum hold 3–30 calendar days). Coarse grid for broad lanes; fine grid for refinement
  lanes, every refinement move and every neighbourhood.
- **Cells:**
  - **D** `D.<f><g>`: D1 family A–D × decline gate OFF/ON (8); Growth OFF.
  - **G** `G.h<e>.s<i>`: Growth exits ∈ {hold off, hold on & buffer off, hold on & buffer on} × initial ATR stop OFF/ON (6);
    `G.h0.s0` = **unrestricted** (open-ended) Growth; D1 OFF.
  - **J** `J.<f><g>.h<e>.s<i>` (48); **S** `S.<C><k>.h<e>.s<i>` (frozen D1 finalist k of cutoff C × 6); **C** `C.<f><g>.h<e>.s<i>`
    (pairs; never searched).
- Every gene outside the arm's books is pinned; inactive genes masked; identity `riskId2` of the engine quad and canonical
  controls; behavioural equivalence = the funded-lot ledger signature; distance = normalized L∞ over active numeric
  inputs, 1 across cells or activation patterns.
- **Coverage protection:** every cell of an arm gets the identical budget; screen strata (activation × K × Growth stratum,
  Assignment 3's construction restricted to the arm's books); promotion and rung ⅛ shares per Growth entry pattern and per
  control pattern (NL0's / Assignment 3's).

## 7. Search, budgets and stopping

### 7.1 Broad lanes (independent; every cutoff; every search arm)

One lane = NL0's V-cell schedule on one cell (Assignment 3 §7.1 / Priority 5 §7.1): screen 512 (coarse, structure pinned,
strata) → plausibility (centre net > 0, centre DD ≤ $35,000, the arm's families funded) → promotion 64 → rung 1 (16,
centre-first) → **2 base islands × 256** (population 32, NL0's NSGA-II operators) → extension islands (§7.5) → rung 2 12 × 64
→ rung 3 6 × 128 → refinement (robust and profit starts, one pass, $2,000 rule) → shortlist 3. Seed key = lane key
`<cutoff>/<arm>/broad/<cell>/R<r>`, replicates from **R101**; no incumbent, control, archive or later-selected vector or
range enters. Arm S's lanes run after arm D's selection at the same cutoff (its frozen D1, §7.4).

### 7.2 Base replicates per arm and cutoff (frozen; `budget.ts`)

| Arm | Cells | Base replicates | Base broad lanes |
|---|---:|---:|---:|
| D | 8 | 4 (R101–R104) | 32 |
| G | 6 | **8** (R101–R108) — Growth's genome has ≈ 4× the free dimensions of D1's | 48 |
| J | 48 | 4 | 192 |
| S | 6 × F (F ≤ 3 frozen D1 finalists) | **R_S(F) = max(4, ⌈160 ÷ (6·F)⌉)**: 9 / 14 / 27 for F = 3 / 2 / 1 (§7.6) | 6 × F × R_S(F) ≥ 160 (162 for F = 3) |

### 7.3 Stage-2 refinement (every cutoff; every search arm; frozen rule `select.ts refineCells`)

From the arm's qualified broad members only: profit 4, robust 4, lower drawdown 2, balanced 2 cells, then coverage (D, J: every
D1 family, the gate ON and OFF, a protective stop; G, J, S: unrestricted and protected Growth, both Growth entries; S: every
frozen D1 finalist), then — while the quota allows — the remaining qualified cells by best centre net; **quotas D 8, G 6, J 16,
S 12**. Each refined cell gets **4 lanes** (R101–R104) of NL0's informed schedule seeded by the cell's qualified broad members
(each + 12 near (1.5) + 12 broad (3) designs; focus seeds = the cell's actual-profit and robust-profit members + 64 (0.5) + 64
(1.0)): 4 base islands × 384, extensions §7.5, rung 2 16 × 64, rung 3 8 × 128, refinement robust / profit / profit-2 (one pass)
and focus starts (two passes), shortlist 6; fine grid; the cell fixed (arm S: the frozen D1 fixed in designs and moves).

### 7.4 Arms C and S (from the same cutoff's sealed selections only)

- **Arm S (D1-first sequential).** After arm D's selection is sealed and committed: its **finalists** — the primary, the
  robust-profit and the balanced role holders, distinct ledgers, **≤ 3** — are frozen (`results/frozen-d1/<cutoff>.json`;
  structure, vector, controls, activation) and **never move**; arm S searches Growth (6 cells per finalist) against the
  shared-slot portfolio containing the frozen D1, scored on the pooled replay (never on standalone Growth returns). If arm D
  has no qualified member, arm S has no lane and no primary at that cutoff (a procedure result).
- **Arm C (fixed combinations).** After arms D and G are sealed and committed: **every pair** of D's and G's finalists (each
  ≤ 3 by the same rule: ≤ 9 pairs), vectors unchanged, in one slot (D1 first) — no tuning; all pairs are carried (no
  opportunistic pairing); qualified with the joint instrument; C's primary by the same rule.

### 7.5 Extension and stopping (frozen; development only; Priority 5's rule)

**Tier 1 — islands, per lane.** After each measured island a lane runs one more island iff (a) it has run fewer than NL0's
cap (6 broad; 8 refinement) and NL0's trigger fired on its last island — hypervolume of (−robust net, p90 DD) against (0,
$35,000), best feasible robust net or best feasible centre net raised by **> 5 %** (performance components), or a new feasible
behaviour class (cell × control pattern × funded components; class component); or (b) it has run at least NL0's cap and fewer
than **16** islands and a performance component fired. Stop reasons: *triggers not met*; *class trigger only beyond NL0's cap*
(**coverage-limited**); *extension cap reached* (**budget-bound, not converged**); *resource guard* (cannot bind: the job cap is
the sum of the lanes' worst cases).

**Tier 2 — replicate rounds, per arm and cutoff.** After the base replicates and after each round, one more replicate of
**every** cell of the arm runs iff the **last** replicate raised the arm's union of feasible rung-3 and shortlist fits (its
hypervolume, best robust net or best centre net) by **> 2 %**, or gave a cell its first feasible fit; at most **4 rounds**. Stop:
*replicate triggers not met* (converged across seeds by this rule) or *replicate cap reached* (budget-bound across seeds).
Each decision record is sealed before its lanes run.

Progress per unit of compute is recorded. **Budget exhausted is never described as convergence.** If more than **10 %** of an
arm's lanes at a cutoff end *extension cap reached*, or an arm ends *replicate cap reached*, that arm's search at that cutoff is
labelled **"budget-limited (not converged)"** in every report, all its records kept, and no further search is run in this
study. Coverage-limited lanes are reported with their share.

### 7.6 Budgets (`budget.ts`; frozen)

- **Per-lane deterministic bounds** (worst cases, rounded up to 1,000): **broad 90,000**, **refinement 174,000** requested
  evaluations; per qualified member **650** (D, G) / **652** (C, J, S); per slice / validation subject **306**.
- **R_S(F)** (arm S's base replicates, F = the cutoff's frozen D1 finalists) = max(4, ⌈(192 − 32) ÷ (6·F)⌉): arm S, its D1
  step (arm D's 32 base lanes) included, gets **at least arm J's 192 base lanes** — a data-independent lane-count rule
  (`budget.ts sequentialReplicates`). Pre-freeze disclosure: a cost-based draft (R_S from the pilot's mean requested per S
  lane) was replaced, because the pilot's S lanes ran on a hash-selected frozen D1 whose proposals were mostly implausible
  (2,801 requested per lane against 7,197 for J): it would have given R_S = 22, about twice arm J's effort. Arm S's
  replicate rounds follow §7.5 like every arm. Refinement lanes are seeded by **≤ 24** of the cell's qualified broad members
  in NL0's original order (Priority 5's maximum).
- **Hard ceiling (resource safeguard, never convergence): 120,000,000 requested official evaluations** over the whole study
  (ledger over the sealed stage records). A stage launches only if the remaining ceiling covers **1.5 ×** its expected cost
  and the disk keeps **60 GiB** free after its archive (≈ 4,800 bytes per fresh evaluation). Each cutoff's completed job
  archives are preserved with zstd (verified, restorable; `storage/tools/jobzstd.py`) before the next cutoff. If the
  safeguard stops a stage, the study stops at that checkpoint, labels it **resource/operational**, reports what was not run
  and never selects from partial results.
- **Expected effort** (planning, never a decision input; the freeze's `expected`; `results/engineering/pilot.json`): the
  pilot (D21, 68 broad + 4 refinement lanes, 618,142 requested, 596,910 fresh, 893 s: **692 requested/s**, 4,344 bytes per
  fresh evaluation, cgroup peak 7.7 GB) measured per broad lane D 8,750, G 9,992, J 7,197 (S priced as J) and per refinement
  lane 31,480 requested; every pilot lane stopped on *triggers not met*. Per cutoff ≈ 3.3 M broad + 5.3 M refinement
  requested before replicate rounds and qualification (≈ 650 per qualified member): **≈ 34 M for the base search of the
  four cutoffs, ≈ 40–50 M with rounds and qualification — ≈ 15–20 GPU-hours** at the pilot's throughput. The hard ceiling
  (120 M) is a safeguard ≥ 2.4 × that estimate.

### 7.7 Stage map against NL0 1.0.0 (§4.8) and budget equivalence

| NL0 stage | Here | Adaptation |
|---|---|---|
| Independent lanes V/G/B, 2 replicates per cutoff | per arm: every cell × base replicates (D 4, G 8, J 4, S R_S) + rounds, each NL0's V-cell schedule; NL0's G/B inclusion cells do not exist (one symbol); their budget is carried by the arms' cells | AD1, AD2 |
| Island extension to cap 6 / 8 | tier 1: NL0's trigger to NL0's cap, performance components to 16 | AD2 |
| (none) | tier 2 replicate rounds | AD2 |
| (none) | stage-2 refinement (Priority 5's Track F rule), 4 lanes per refined cell | AD2 |
| Informed lane (C24) | none (no TSLA incumbent) | AD11 |
| Qualification Q1–Q6, roles, actual-profit primary | unchanged; Q6 = the arm's families | AD4, AD12 |
| Folds C19 → C21 → C23, commits before slices, sequential verdict | unchanged, per arm | AD3 |
| Frozen selection, FULL once | unchanged | — |

Equivalence in common units (requested, fresh, proposals, islands, refinement starts and moves, archive hits) is reported per
arm in `SEARCH_AND_CONVERGENCE_REPORT.md`, beside Priority 5's executed figures for context.

## 8. Robustness instrument (Assignment 3's on the TSLA slot; AD6)

One Latin hypercube of u ∈ [−1, 1] over the 64 numeric columns per family (`deriveSeed('tsla-d1-growth', 'nbhd', …)`), common
random numbers across a cutoff's centres and arms (labels never contain the arm, cell, stage or lane); radii: D1 genes Study
8's N1 grid radii (X ±10, Y ±2, stop ±10, hold ±2, L ±10, buffer ±10, P ±10, W ±20), control genes Assignment 2's (d ±10, hx ±2,
g ±10, r ±5, c ±10; K fixed), Growth inputs 10 % of their box in value units rounded to the fine step; clipped to the box
widened to include the centre (counted); categorical inputs fixed; inactive inputs untouched; the adaptive bound repaired;
duplicates dropped. Families: rung 1 / refinement 16, rung 2 64, rung 3 128, **selection 2 × 128** ('select', rep, cutoff:
ranking), **confirmation 3 × 128 = 384** ('confirm', rep, cutoff: qualification only). Statistics: median, p10, p90 net; robust =
½ median + ½ p10; p90 DD (Priority 3's cent-rounded statistic); breach share with Wilson interval, mean excess, worst DD, p95
and worst-10 % mean DD (report-only).

## 9. Qualification (per cutoff, arm and stage; `qualify.ts`)

Gates (all must hold; P0): **Q1** centre net > 0; **Q2** centre DD ≤ $35,000; **Q3** confirmation p90 DD ≤ $35,000; **Q4**
confirmation p10 > 0; **Q5** at 10 bps per side centre net > 0 and DD ≤ $35,000; **Q6** every family of the arm funded at the
centre (D: D1·TSLA; G: Growth·TSLA; C, J, S: both). No activity, concentration, tail or envelope gate. Report-only per member:
the eight stresses; causal removals (C, J, S: without D1, without Growth); participation labels (token < 5 % of funded
principal-days); the detailed training centre (realized / unrealized, conservative net, open lot and its multiple, open-lot
share, occupancy, per-lot MAE, worst realized lot, mean losing lot); the risk envelope of every evaluation. A configuration
already qualified at a cutoff and arm keeps its evidence. External controls are qualified at the broad stage of arms D, G, J.

## 10. Selection (no evaluation; `select.ts`)

- **Rule (NL0 1.0.0 §3.5, the only selector):** the actual-profit role — the highest centre net among the Q1–Q6 qualified;
  ties: higher selection robust net, lower centre DD, label. A population without a qualified member has no primary.
- **Populations** (controls excluded): **D, G, C, J, S** — each arm's members (each arm's procedure); report-only secondary
  procedures (never nominating): **D-A** (D1 family A without the gate), **G-P / G-U, J-P / J-U, S-P / S-U** (protected /
  unrestricted Growth).
- **Roles per population** (selection families): actual-profit; robust-profit = highest selection robust; balanced = highest
  selection robust ÷ selection p90 DD; lower-drawdown = lowest selection p90 DD with robust ≥ 50 % of the actual-profit
  holder's. Pareto set on centre net, centre DD, selection p10, selection p90 DD (reported).
- **RA1** (AD4): the first member under RA1 and its top 5 per population, report-only.
- Each arm's selection is sealed and committed before the next arm's first stage; the cutoff's selection of every arm is
  sealed and **committed before the next door opens**.

## 11. Chronology and the consequence

### 11.1 Fold slices (C19, C21, C23)

After a fold's selection is committed, one official job on the next door evaluates every subject (each population's primary
and roles, the external controls): the detailed centre and the centre with the cutoff as boundary (slice P&L, reset slice DD,
whole-run figures), the 8 stresses, the training selection family (2 × 128, regenerated exactly) replayed on the slice
(standard §5.9), and the session-close series (16-boundary evaluations at every session of the slice).

### 11.2 Sequential paths and the verdicts

Each population's procedure chains its three fold primaries over 2020–2021, 2022–2023 and 2024 (Priority 5's `chain`: each
slice the primary's own continuous run; 5 bps of $100,000 per open lot closed or adopted at a switch; a fold without a primary is
flat; the sequential drawdown over every exactly observed GPU mark). **Verdict:** *supported* iff every fold produced a
primary, the sequential net > 0 and the sequential drawdown ≤ $35,000; otherwise *unsupported* or *incomplete*. The five arm
procedures (D, G, C, J, S) are each an **independent** chronological test of that arm's complete search-and-selection
procedure; sub-populations are report-only; roles and the external controls are descriptive. The CPU reference exact minute
chain may be reported beside it (non-official; it never grants support).

### 11.3 Consequence (standard §1.8, default adopted)

A failed or uncomputable independent verdict means **"no chronological support: the selection is not a
deployment-qualified candidate without an explicit user decision"**. Governance only: never a fitness term, ranking input,
objective weight or gate. "No qualifying candidate" is a valid outcome.

## 12. Finalists and the determination (AD8; `outcome.ts`; frozen before any search)

- **Finalists (C24):** every arm's primary and its robust-profit, balanced and lower-drawdown role holders.
- **A finalist X is a TSLA RESEARCH CANDIDATE FOR THE USER'S REVIEW iff** (a) X passes Q1–Q6 at C24; (b) X is its arm's
  primary and the arm's independent verdict (§11.2) is *supported*; (c) V1–V3 pass on FULL (validation P&L > 0; reset
  validation DD ≤ $35,000; whole-run DD ≤ $35,000). An arm primary meeting (a) and (c) but not (b) is labelled
  "development-qualified, no chronological support: not a deployment-qualified candidate without an explicit user
  decision". (a)–(b) are sealed in `FROZEN_SELECTION.json` before FULL opens; the validation adds (c) only.
- **Architecture comparisons** (C24 development evidence, same instrument and draws): for each combined arm K ∈ {C, J, S}
  against the better standalone primary B (D or G, higher centre net), and J against S both ways, K's primary is a **material
  improvement** iff both are qualified and — **type P**: centre net ≥ B + $10,000, confirmation robust net ≥ B + $5,000, centre
  DD ≤ B + $2,500 and confirmation p90 DD ≤ B + $2,500; or **type R**: confirmation p90 DD ≤ B − $2,500, centre DD ≤ B +
  $2,500, centre net ≥ B − $2,500 and confirmation robust ≥ B − $2,500 — and **replicated**: qualified members of K from ≥ 2
  replicate numbers meet the same type (arm C: not applicable, no seeds). Bands: Priority 5's (§12 there). A single historical
  pair never proves an architecture superior (standard §3.4); the arms' chronological paths are reported beside it.
- **Outcome label (sealed after the validation):** *TSLA RESEARCH CANDIDATE(S) FOR THE USER'S REVIEW* (research nomination
  only) or *NO QUALIFYING TSLA CANDIDATE* (with the development-only ones listed).

## 13. Engineering gates and the pilot (sealed in `results/engineering/gates.json` before the freeze)

| Gate | Evidence |
|---|---|
| E1 | `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf…` VERIFIED; the entrypoint audit clean |
| E2 | the TSLA doors: each door = the canonical partition load with the TSLA ledger (session by session, bar by bar); prefix causality; the splits; both slots one SymDoor |
| E3 | New L0 and N/original on their own VGT/GDX data (D24, FULL known-target): GPU = CPU = their sealed figures (the shared engine unchanged) |
| E4 | CPU/GPU parity of every record field (detailed, compact, envelope) on random configurations of every arm and cell (coarse and fine, S with a frozen D1, C pairs) and the external controls, under base, every stress, every removal, a boundary and a 16-boundary series, on D19, D21, D23, D24 |
| E5 | determinism: a mini lane set of every arm on D19 — GPU, GPU gracefully stopped and resumed, GPU whose process was SIGKILLed and resumed, GPU whose server was SIGKILLed (fails closed) and resumed, CPU — identical |
| E6 | identities on the GPU: single-family (J with a book off = D / G), the disabled slot inert, causal data access across doors, accounting |
| E7 | the study's unit tests (`src/tsla-d1-growth/tests/`) and the reused modules' suites |
| E8 | the full `npm test` (the known pre-existing failures only) and Strategy Lab's regression (typecheck, Vitest, portfolio parity) |
| E9 | the pilot (§7.6) |

Every official job opens the gate itself (purpose, acceptance, pins, source, job, binary, compat, device, capability coverage
of the risk-envelope pilot domain ⊇ the TSLA domain, smoke, memory, host path, live parity mini-set on the TSLA door) and
writes an attestation; receipts, conservation (CPU-scored = 0) and archive provenance per standard §9.5.

## 14. Stage order and commands (exact commands: `RUN_COMMANDS.md`; chain `chains/chain.sh`, fail-fast)

0. Brief, audits, this protocol, `AMENDMENTS.md`, `STANDARD_ADOPTION.json`: committed; code and tests committed; gates
   E1–E9 run; `gates` sealed; `freeze` sealed; committed **before any official evaluation**.
1. Per cutoff C19 → C21 → C23 → C24: arm D (broad → rounds → qualify broad → refine-plan → refine → qualify refine → select-arm)
   → arm G (the same) → pairs → qualify C fixed → select-arm C → arm J (the same as D) → freeze-d1 → arm S (the same) → select
   (**commit**) → [C19–C23: slice → commit; after C23: sequential → commit] [C24: freeze-selection → commit → authorize-full →
   commit → validate (FULL once) → commit → outcome → commit] → the cutoff's job archives preserved (zstd) → commit.
2. Report-only diagnostics, reports, regression, ZIP, commit, push.

## 15. Resources and recoverability

Transient units in `tsla.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0); **one official GPU job at a time**;
`node --no-maglev`; the accepted evaluator's Mode S (8 host workers, batch 8,192, linger 30 ms); every evaluation archived as
it returns (archive bound to the study, job, door pin, evaluation digest and backend); a resumed job passes the whole gate
again and replays from its archive (`--resume`); job identities refuse a different definition; no automatic restart; the
chain runs as its own unit and commits each sealed block.

## 16. Report-only analyses (after the validation unless stated; never a selection input)

Search coverage and convergence (per arm, cutoff, cell and replicate; islands and stop reasons by tier; budget-bound and
coverage-limited shares; progress per 10,000 evaluations; replicate distributions); §5.9 exposure for every fold primary and
finalist (open-lot share, largest open lot and its give-back, per-lot MAE, the D1 hold-window tail stress on pre-2016 TSLA
daily data and in-sample, the training neighbourhood on the next slice); tail severity (p95, worst-10 % mean, breach shares,
small 0.5× and wide 1.5× families for the finalists); the stresses; causal removals; risk decomposition (marked DD, principal
loss marked and liquidation, banked-capital DD, giveback with per-lot attribution); annual and episode results; open-position
exposure, duration and slot occupancy (unrestricted Growth in particular); participation and displacement attribution for the
combined arms (refused decisions by occupant); the buy-and-hold controls; margin / liquidation scenarios with explicit
collateral assumptions (illustrative only). Report-only replays of frozen subjects may use the non-official GPU path or the
CPU reference under purpose `diagnostic`, labelled.

## 17. No-go rules and amendments

A failed engineering gate, any CPU-scored official evaluation, a stale acceptance, a request beyond a bound, a door opened
out of order, a change after the freeze without an amendment, a criterion loosened after an outcome, or a recomputed trigger
that disagrees with a lane's decision stops the study. `AMENDMENTS.md` is append-only: pre-freeze `E*` refine the
implementation; after the freeze disclosures `D*`, operational `O*` and code `A*` (defect fixes changing no rule, each with a
sealed record of the changed digest). Criteria are never loosened, and no arm, cell, cutoff, replicate, statistic, margin or
threshold is added, removed or changed once a result it governs exists. A failure is a result.
