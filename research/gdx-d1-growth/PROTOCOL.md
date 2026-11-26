# Protocol P8-GDX 1.0.0 — Priority 8: GDX-only D1 + Growth and the matched total-portfolio comparison

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
official evaluation). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only). Research only: nothing
here adopts a candidate, changes an official configuration, replaces New L0 or N/original, merges into `main`, deploys,
sends an order or alert, or touches a broker. The MSFT study is not started. Reports are written analysis, Markdown tables
and machine-readable results only (standard §7.7).

- **Study:** `research/gdx-d1-growth/`; official code `src/gdx-d1-growth/` started by `npm run gdx8 -- <command>` through
  `src/gpu-backend/officialRunner.ts`; non-official data, engineering, pilot, diagnostic and portfolio tools in
  `tools/gdx-d1-growth/` (`npm run gdx8-eng`, `gdx8-diag`, `gdx8-port`); the chain `chains/chain.sh`.
- **Brief:** `brief/BRIEF.md` (the user's "Claude Code — Priority 8: GDX-Only D1 + Growth Research and Matched
  Total-Portfolio Comparison", 233 lines, sha256 `2325d8875280fc85ca08890f1148407083a2205e25c3a32302fb7aa14b739d3d`, read in
  full to its final line).
- **Branch:** `research/gdx-d1-growth` (main checkout) from `421e4c87780844e4e49c079586aa5c4945cc9e35` (`research/tsla-d1-growth`, P6-TSLA's final commit: the
  accepted GPU Phase 7 lineage, S1-free engine, P6-TSLA's study code), plus the engineering commit `a33c6ff19fddb891adf64edac500358a301a4d69` (Phase 0: the
  cherry-picked identity-join module `aca31b5fd595850050ca629ef3ac9208a84c9894`, alone).
- **Pre-freeze evidence:** `GDX_DATA_AUDIT.json` / `.md` (Phase 1.1), `reports/data/SUITABILITY.json` (development only),
  `FUNCTIONALITY_AUDIT.md`, the engineering gates E1–E9 (§13).

## 0. Standard adoption, adaptations and departures

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` **3.0.0**, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1`, read in full 2026-11-26T14:57Z |
| Adoption manifest | `STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/gdx-d1-growth`); every official stage calls `requireStandardAdoption` (`stages.ts officialGuards`) |
| Scope | `optimization` |
| Evaluation backend (§9) | official evaluations only through `openOfficialGpuSession` → `GpuPool` → `EvalLab`; acceptance `config/gpu-backend/acceptance.json` (GPU Phase 7, sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`, binary `research/gpu-phase7/build/gb7` `cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82`, device `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`), its sha256 kept out of band (`~/.local/share/margin-trading-gpu/acceptance-pins/`); no CPU fallback; `node --no-maglev` |
| Reference method (§4.8) | `docs/research/methods/NEW_L0_METHOD.md` id `NL0` 1.0.0, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`, as Assignment 3, Priority 5 and P6-TSLA executed it (the lane is derived mechanically from Priority 5's, `src/gdx-d1-growth/derive.ts`); stage map §7.8 |

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §4.1, §4.3, §4.8 | adaptation | **The GDX space** (`src/gdx-d1-growth/space.ts`): P6-TSLA's space unchanged — Assignment 3's genome semantics (Study 8's D1 box and grid, Assignment 2's RC 2 control families and boxes, Growth 1.4.0's complete genome on growth140's boxes, coarse and fine grids, identity, strata, instrument, moves) restricted to **one trading slot**: the accepted engine's VGT-named slot carries GDX (both slots one GDX SymDoor; the second slot's books disabled; no evaluation file changed — gates E1, E3, E6). Five **arms** with protected **cells**: D (8 D1 structures), G (6 Growth exit-protection structures), J (48), S (frozen D1 finalist × 6), C (fixed pairs). S1 absent; shadow-entry eligibility OFF; calendar-day holds (brief Phase 1.2) |
| AD2 | §4.2, §4.5, §4.8 | adaptation | **Effort by replicates** of NL0's unchanged per-lane schedules (§7.6): **P6-TSLA's executed allocation × 1.5 in every stage** (base D 6, G 12, J 6, S by the matching rule; 6 lanes per refined cell; standard §4.8 proportional scaling), Priority 5's two-tier island rule and convergence-driven replicate rounds (≤ 4, 2 %) — brief Phase 2/4: generous GPU effort, more seed diversity (P6-TSLA measured a material seed dependence of 10–66 %) |
| AD3 | §1.8 | adaptation | The sequential drawdown statistic is Priority 5's (exact over every GPU-observed mark); one procedure per arm (§11) |
| AD4 | §2.3, §2.5 | adaptation | **NL0's original rule is THE selector** (primaries, roles, finalists, frozen D1, pairs). Assignment 3's RA1 is computed on the identical populations as a separately labelled, **report-only** experimental selector (never selects) |
| AD5 | §3.4 | adaptation | **The method comparison** of the brief: (b) separately optimized components pooled = arm C; (c) fully joint = arm J; staged D1-first = arm S; standalone D, G; matched evaluation rules; effort matched by the frozen rule of §7.6 (S + its D1 step ≥ J), disclosed per arm |
| AD6 | §5.3 | adaptation | The neighbourhood instrument is Assignment 3's on the trading slot, in **this study's seed namespace** (`deriveSeed('gdx-d1-growth', …)`), common random numbers across centres AND arms; arm S's design neighbourhoods never move the frozen D1 |
| AD7 | §5.1 | adaptation | Priority 5's eight stresses: cost 0 / 2 / 10 / 20 bps, interest 14 %, stop slippage +10 / +25 bps, next-open stops (Q5 uses 10 bps; the rest report-only) |
| AD8 | §1.8, §2.5 | adaptation | **The precommitted determination** (§12; `outcome.ts`): finalists, development and chronological labels sealed before FULL; architecture comparisons with Priority 5's bands and replication; the outcome joins the validation records by **(population, id)** and fails closed (`src/research-outcome/identityJoin.ts`); "no qualifying GDX candidate" is valid |
| AD9 | §5.9 | adaptation | The D1 maximum-hold-window tail stress uses **pre-2016 GDX daily data** (2006-05-22 → 2015-12-31, Yahoo Finance; disjoint from every door; daily resolution, labelled) as the declared reference history, beside the in-sample development stress |
| AD10 | §0.3, §1.3 | adaptation | The common complete endpoint is **2026-10-30** (the program's horizon; GDX, VOOG and VGT have a complete regular session on it and none missing before it) |
| AD11 | §3.1–§3.3, §4.4 | adaptation | **GDX incumbents exist** (§4): exact controls at every cutoff; an **incumbent-informed lane at C24** for arms D and G (§7.5), separately labelled and budgeted, never feeding an independent lane; the **informed populations D+, G+, C+** (C24 only) in which the qualifying incumbents are members (standard §3.2); every informed selection is labelled "no independent chronological test" (standard §1.8) |
| AD12 | §2.7, §4.7 | adaptation | Real participation: arms C, J, S (and C+) require **both GDX books funded** at the centre (Q6); D and G their own book. Growth's protected and unrestricted exit structures are **protected by cells** (equal budgets) and analysed as report-only sub-populations |
| AD13 | §5.6 | adaptation | GDX has no split in the window: the doors apply the **central** split ledger (sha256-pinned; no GDX event; a GDX event there fails the doors closed). The price-only convention of every strategy (no distribution credited to a trading lot) is unchanged; its effect is reported in the portfolio stage (§15) |
| AD14 | §0.2 [R], §7.7 | adaptation | **The matched total-portfolio comparison** (§15) is a precommitted, report-only stage after the outcome, on frozen subjects; it never selects, ranks, qualifies or stops anything |

No [M] rule is changed: there is **no departure**.

## 1. Question, hypotheses, objective and outcomes

- **Question (brief Mission, Phase 3, Phase 5).** Using only GDX in one exclusive margin-funded $100,000 slot, what do
  substantial from-scratch D1 and Growth optimizations find standalone, does combining them (fixed pair, fully joint or
  D1-first sequential) add value, can any of them become a chronologically qualified, robust candidate — and, under the
  **same** 60 % VOOG / 40 % VGT investment core, does replacing N/original's VGT/GDX overlay with a GDX-only overlay reduce
  total-account drawdown or margin risk, and at what trading-profit trade-off?
- **Objective (standard §2.2).** Development net profit (realized + marked, after costs and interest) with a maximum minute
  marked drawdown ≤ **$35,000 = 35 % of the fixed $100,000 initial trading allocation** (P0; never of peak equity), beside
  neighbourhood robustness, chronological evidence and exposure diagnostics. The fitness is unchanged (brief Phase 2:
  never adapted to make GDX attractive).
- **Hypotheses** (each may fail; a null is a result):
  - **H1.** Each standalone arm (D, G) has a Q1–Q6-qualified development member at C24.
  - **H2.** A combined arm (C, J or S) is a material improvement over the better standalone primary (§12), i.e. GDX Growth
    adds measurable value beyond GDX D1 after capital contention and costs (brief question 2). Null: no material value.
  - **H3.** An arm's independent procedure is chronologically supported (§11.2). Null (common in the program): unsupported.
  - **H4.** The searches converge: the budget-bound share ≤ 10 % of lanes per arm and cutoff, and the replicate rounds stop
    on their trigger. Null: budget-limited, reported as such.
  - **H5 (report-only, §15).** Under the matched core, a GDX-only overlay lowers the total-account maximum marked
    drawdown relative to N/original by a material amount (§15.8). Null: no material reduction, or an increase.
- **Valid outcomes:** GDX research candidate(s) for the user's review; development-qualified candidates without
  chronological support; informed development-qualified candidates (no independent test); **no qualifying GDX
  candidate**. None is a failure of the study. Nothing is adopted or deployed.

## 2. Prior knowledge and provenance (labelled; brief Phase 2)

- **GDX has been examined extensively by the program.** N/original's and New L0's GDX D1 books (with VGT books) were
  chosen with **2016-01-04 → 2026-10-30 in view**; 4A optimized standalone GDX Growth (2016–2024, validated once on
  2025–2026); 3B/3C searched GDX Growth beside VGT anchors; Appendix A was browser-chosen with 2016–2026 in view. Every
  GDX window 2016–2026 is therefore **retrospective, previously examined history**: the validation 2025-01-02 → 2026-10-30
  is **never a pristine holdout**, and there is no prospective unseen period. The folds' slices (2020–2024) were also
  examined by many studies.
- **Known prior results (reported, never used as inputs):** 4A's GDX Growth primary made no trade in 2025–2026 and its
  procedure was chronologically unsupported; 3A/3B/3C found GDX Growth mostly unfunded beside VGT books.
- **Real-data exposure before this freeze:** the data audit (coverage and integrity; no 2025–2026 returns); the
  development-only suitability analysis (descriptive); the engineering gates (equality counts and hashes; New L0,
  N/original and 4A's incumbents compared with their sealed figures; the ablation compared native vs projected, equality
  only); the pilot (counts, timings, stop reasons; BENCH seed keys never used by the study). **No box, threshold, budget,
  cell or rule was derived from a GDX profit or drawdown**: the boxes are the original D1 / Growth domains, the gates P0's,
  the budget P6-TSLA's × 1.5.

## 3. Data, doors and windows

- **Canonical file:** `data/GDX/data.csv` (Alpaca SIP 1-minute, raw prices; 1,490,494 rows; 2016-01-04T11:15Z →
  2026-10-30T23:59Z; sha256 `77dba9b21c4b684996283e7b8f17917696139f890441b1ca900d664b59ea5049`; the program's existing file,
  verified by `npm run datasets -- verify GDX`); nothing downloaded or bought. Audited in `GDX_DATA_AUDIT.json`: 2,723 of
  2,723 NYSE sessions, 0 missing or extra, 0 duplicates, 0 out-of-order or inconsistent bars, 199 missing regular minutes in
  development (0.02 %; the four 14-minute market-wide halts of March 2020 included), 0 in validation; early closes as the
  NYSE calendar; no split (central ledger, raw overnight gaps, Yahoo 2006–2024 split events).
- **Disclosed data finding:** the canonical closing-print proxy (the open of the 16:00 bar, `src/lib/session.ts`) differs
  from the official auction close on 2020-03-18 (5.2 %) and 2020-03-17 (1.2 %); every other development close is within
  1 % of the independent close (p99 0.19 %). It is the frozen data path of every study and of the accepted evaluator: kept,
  not repaired.
- **Trading-relevant data:** only scheduled regular-session minute bars and the closing-print proxy (the canonical session
  grouping drops pre- and post-market rows); overnight gaps are executed at the next regular-session price (stops at the
  stop level or the gapped open); sparse minutes are preserved, never filled.
- **Doors** (`data/DOOR_PINS.json`, sha256 `6c9a9167a721104083cfbba95938c9799c30083a70b96b3fd09a6030ff7a87bd`): byte prefixes
  **D19, D21, D23, D24** (through 2019-12-31, 2021-12-31, 2023-12-29, 2024-12-31; 1,006 / 1,511 / 2,012 / 2,264 sessions) and
  **FULL** (through 2026-10-30; 2,723 sessions), each verified by size, sha256 and last row before parsing; equal to the
  canonical partition path and to the GDX slot of N/original's own door (gate E2).
- Development 2016-01-04 → 2024-12-31 for every choice; validation 2025-01-02 → 2026-10-30 only for the frozen slate, once.
- Folds: **C19** → slice 2020-01-02 → 2021-12-31 (D21); **C21** → 2022-01-03 → 2023-12-29 (D23); **C23** → 2024-01-02 →
  2024-12-31 (D24); **C24** → FULL once. Every run is continuous from 2016-01-04 (no reset at a boundary); slice P&L = the
  marked change from the cutoff close; slice DD resets at the cutoff close; whole-run DD beside it; open positions at a
  boundary are carried and marked, never liquidated.
- Every opening goes through `doors.ts` (guards in its header) and is logged in `results/doors.jsonl`.

## 4. Frozen baselines, incumbents and controls (brief Phase 1.2, Phase 3 item 3)

| Row | What | Role |
|---|---|---|
| **N/original** | Assignment 3 `C24/informed/GD.VB/R2#1 profit` (rc1-f1a8b57cb02455c3): VGT D1 + GDX D1 + VGT Growth, shared slot, original rules; sealed FULL $482,700.73 / DD $20,385.99 / 44 lots | frozen benchmark; reproduced to the cent on its own data (E3); the portfolio stage's comparator |
| **New L0** | 5B `C24/L0/informed/R1#1 profit` (a2e385640ca61012); sealed FULL $479,605.18 / $20,385.99 / 46 lots | frozen benchmark (E3); portfolio reference |
| **Ablation = control `N/original GDX D1 (ablation)`** | N/original with **both VGT books disabled**, its exact GDX D1 phenotype (vector, RC 2 controls, activation) unchanged — a fixed configuration, never searched | gate E3 proves native (its own door, both VGT books off) = projected (this study's trading slot, arm D) lot by lot on D24 and FULL; control of arm D at every cutoff, slice and the validation; a member of D+ at C24; portfolio reference |
| Controls `New L0 GDX D1`, `VG #2 GDX D1` | New L0's GDX D1 book; VG #2 Balanced's GDX D1 book `d1-7b99d2833d` (carried by A3's `incumbent: C4`), harmonized conventions | arm D controls; D+ members; informed seeds (E3: native = projected) |
| Controls `4A primary indep-rise#1`, `4A informed#2 robust`, `4A/3C P08`, `4A/3C P09`, `Appendix A` | 4A's frozen export set (`research/gdx-growth-standalone/FROZEN_SELECTION.json` `export4B`, sha256 `5d262154…`) | arm G controls; G+ members; informed seeds (E3: reproduce 4A's sealed development figures to the cent) |
| Controls `N/original GDX D1 (ablation) + <Growth incumbent>` (5) | the ablation's D1 with each Growth incumbent in one slot (D1 first) | arm J descriptive controls only |
| GDX buy-and-hold (report-only, after the validation) | $100,000 at the 2016-01-04 first regular-minute open (+5 bps), financed at 11 % simple and unfinanced | descriptive |

Incumbents and sources are versioned and pinned (`src/gdx-d1-growth/controls.ts`; A3 `FROZEN_SELECTION.json` sha256
`4080d4b1ca4db93296876f009307ce7cd055e1ab04f16133f7761c40a288f2d7`); each is exactly representable on the fine grid (unit
test). They were chosen with later data in view: **informed, never an independent seed, never chronological evidence**.
Their native and harmonized figures: the D1 incumbents' native conventions are the harmonized ones of Priority 3+ (E3
proves identity); VG #2's original Study 8 conventions (arming 2017-06-15) are not reproduced (harmonized only, labelled).

## 5. Engine and conventions (unchanged; brief Phase 1.2)

Priority 3's pooled engine through RC 2 (`src/d1-risk-controls-rc2/`, `src/vg-l0-risk-families/evaluate.ts`) on the
accepted GPU evaluator (the TypeScript engine stays the reference): **one exclusive funded $100,000 slot** granted only at a
decision's own instant when nothing is open or reserved; same-instant order **D1 first, then Growth**; no compounding,
preemption, forced switches, queued or delayed entries; a refused signal leaves the refused book's **virtual (shadow) state**
running (D1's shadow lifecycle; Growth lifecycle L0) and is never funded later (shadow-entry eligibility **OFF**); 5 bps per
executed side inside the fill prices, $0 commission; **11 % simple interest** on outstanding principal by calendar day (365);
stops at the stop level or the gapped open; fractional shares; harmonized D1 arming from 2016-01-04; **calendar-day
maximum holds**; staged trailing stops **S1 absent**; **price only** (no distribution credited to a trading lot). The
engine's second slot is disabled in every evaluation (its D1 book a fixed inert vector, its Growth book the placeholder).
Every evaluation requests the risk envelope (trade principal loss, banked-capital DD; marked and liquidation):
report-only.

## 6. Space (`src/gdx-d1-growth/space.ts`; `FUNCTIONALITY_AUDIT.md`)

- **Genome:** 11 categorical + 64 ordinal = 75 genes (D1 family, decline gate, activation, Growth's 8 structural; D1 8,
  controls 6, Growth numeric 50). Boxes: D1 Study 8's (X 8.0–30.0 %, Y 0.1–5.0 %, stop 3.0–15.0 %, hold 3–30 calendar days,
  L 20–250, buffer 0.0–6.0 %, P 3.0–20.0 %, W 10–200); controls Assignment 2's (d 3.0–25.0 %, hx 6–60 days, g 1.0–15.0 %,
  K 1–4, r 10–100 %, c 5–250 sessions); Growth growth140's (maximum hold 3–30 calendar days; every bounded and open-ended
  exit structure the current standard allows). Coarse grid for broad lanes; fine grid for refinement and informed lanes,
  every refinement move and every neighbourhood.
- **Cells:** **D** `D.<f><g>` (D1 family A–D × decline gate; 8; Growth OFF); **G** `G.h<e>.s<i>` (Growth exits ∈ {hold off,
  hold on & buffer off, hold on & buffer on} × initial ATR stop OFF/ON; 6; `G.h0.s0` = **unrestricted** open-ended Growth,
  reported with explicit stress and downside; D1 OFF); **J** `J.<f><g>.h<e>.s<i>` (48); **S** `S.<C><k>.h<e>.s<i>` (frozen
  D1 finalist k of cutoff C × 6); **C** `C.<f><g>.h<e>.s<i>` (pairs; never searched).
- Every gene outside the arm's books is pinned; inactive genes masked; identity `riskId2` of the engine quad and canonical
  controls; behavioural equivalence = the funded-lot ledger signature; distance = normalized L∞ over active numeric inputs.
- **Coverage protection:** every cell of an arm gets the identical budget; screen strata; promotion and rung shares per
  Growth entry pattern and per control pattern (NL0's / Assignment 3's). No new trading rule, protective stop or staged
  rule is introduced (brief Phase 3 item 2).

## 7. Search, budgets and stopping

### 7.1 Broad lanes (independent; every cutoff; every search arm)

One lane = NL0's V-cell schedule on one cell (Assignment 3 §7.1 / Priority 5 / P6-TSLA §7.1): screen 512 (coarse, structure
pinned, strata) → plausibility (centre net > 0, centre DD ≤ $35,000, the arm's families funded) → promotion 64 → rung 1 (16,
centre-first) → **2 base islands × 256** (population 32, NL0's NSGA-II operators) → extension islands (§7.6) → rung 2
12 × 64 → rung 3 6 × 128 → refinement (robust and profit starts, one pass, $2,000 rule) → shortlist 3. Seed key = lane key
`<cutoff>/<arm>/broad/<cell>/R<r>`, replicates from **R101**; no incumbent, control, archive or later-selected vector or
range enters. Arm S's lanes run after arm D's selection at the same cutoff.

### 7.2 Base replicates per arm and cutoff (frozen; `budget.ts`)

| Arm | Cells | Base replicates | Base broad lanes |
|---|---:|---:|---:|
| D | 8 | **6** (R101–R106) | 48 |
| G | 6 | **12** (R101–R112) — Growth's genome has ≈ 4× the free dimensions of D1's; brief Phase 3 item 1 (substantial from-scratch Growth exploration) | 72 |
| J | 48 | **6** | 288 |
| S | 6 × F (F ≤ 3 frozen D1 finalists) | **R_S(F) = max(6, ⌈240 ÷ (6·F)⌉)**: 14 / 20 / 40 for F = 3 / 2 / 1 | 6 × F × R_S(F) ≥ 240 (252 for F = 3) |

### 7.3 Stage-2 refinement (every cutoff; every search arm; frozen rule `select.ts refineCells`)

From the arm's qualified broad members only: profit 4, robust 4, lower drawdown 2, balanced 2 cells, then coverage (D, J:
every D1 family, the gate ON and OFF, a protective stop; G, J, S: unrestricted and protected Growth, both Growth entries;
S: every frozen D1 finalist), then — while the quota allows — the remaining qualified cells by best centre net; **quotas
D 8, G 6, J 16, S 12**. Each refined cell gets **6 lanes** (R101–R106) of NL0's informed schedule seeded by the cell's
qualified broad members (≤ 24, each + 12 near (1.5) + 12 broad (3) designs; focus seeds = the cell's actual-profit and
robust-profit members + 64 (0.5) + 64 (1.0)): 4 base islands × 384, extensions §7.6, rung 2 16 × 64, rung 3 8 × 128,
refinement robust / profit / profit-2 (one pass) and focus starts (two passes), shortlist 6; fine grid; the cell fixed
(arm S: the frozen D1 fixed in designs and moves).

### 7.4 Arms C and S (from the same cutoff's sealed selections only)

- **Arm S (D1-first sequential).** After arm D's selection is sealed and committed: its **finalists** — the primary, the
  robust-profit and the balanced role holders, distinct ledgers, **≤ 3** — are frozen (`results/frozen-d1/<cutoff>.json`)
  and **never move**; arm S searches Growth (6 cells per finalist) against the complete shared-slot pool containing the
  frozen D1, every proposal scored on the pooled replay (never on standalone Growth returns). No arm-D finalist → no S lane
  and no S primary at that cutoff (a procedure result). The number of carried finalists (≤ 3) and their budget (R_S) are
  frozen above.
- **Arm C (fixed pairs).** After arms D and G are sealed and committed: **every pair** of D's and G's finalists (each ≤ 3 by
  the same rule: ≤ 9 pairs), vectors unchanged, in one slot (D1 first) — no tuning; all pairs are carried (no opportunistic
  pairing, no combinatorial search on any later period); qualified with the joint instrument; C's primary by the same rule.

### 7.5 The incumbent-informed lanes and populations (C24 only; AD11)

- **Informed lanes** (after the arm's independent search and qualification at C24, before its selection): arm D — each cell
  holding a GDX D1 incumbent (`D.A0`: New L0's and VG #2's books; `D.D1`: N/original's) × **6 replicates**; arm G — each
  cell holding a GDX Growth incumbent (`G.h0.s1`: Appendix A; `G.h1.s1`: 4A primary, P09; `G.h2.s1`: 4A informed#2, P08) ×
  **6 replicates**: NL0's informed (refinement) schedule (§7.3) seeded by the cell's incumbents, **every one a focus seed**;
  seed key `C24/<arm>/informed/<cell>/R<r>`; fine grid. **30 lanes**, separately budgeted and labelled; they read nothing
  from the independent lanes and feed nothing back.
- **Informed populations** (nominating; **no independent chronological test**): **D+** = arm D's independent members ∪ its
  informed-lane members ∪ the GDX D1 incumbents; **G+** likewise for Growth; **C+** = arm C's pairs ∪ every pair of D+'s and
  G+'s finalists (primary, robust-profit, balanced; distinct ledgers; ≤ 3 × 3; vectors unchanged). The independent
  populations D, G, C, J, S never contain an informed member or an incumbent. A member identical to an already qualified
  configuration keeps that evidence (one evaluation, one identity).
- There is no informed J or S lane: no GDX D1 + Growth incumbent pair exists (the combined architectures meet the
  incumbents only through C+ and the descriptive J controls).

### 7.6 Extension and stopping (frozen; development only; Priority 5's / P6-TSLA's rule)

**Tier 1 — islands, per lane.** After each measured island a lane runs one more island iff (a) it has run fewer than NL0's
cap (6 broad; 8 refinement/informed) and NL0's trigger fired on its last island — hypervolume of (−robust net, p90 DD)
against (0, $35,000), best feasible robust net or best feasible centre net raised by **> 5 %** (performance components), or
a new feasible behaviour class (class component); or (b) it has run at least NL0's cap and fewer than **16** islands and a
performance component fired. Stop reasons: *triggers not met*; *class trigger only beyond NL0's cap*
(**coverage-limited**); *extension cap reached* (**budget-bound, not converged**); *resource guard*.

**Tier 2 — replicate rounds, per arm and cutoff** (broad lanes): after the base replicates and after each round, one more
replicate of **every** cell of the arm runs iff the **last** replicate raised the arm's union of feasible rung-3 and
shortlist fits (hypervolume, best robust net or best centre net) by **> 2 %**, or gave a cell its first feasible fit; at most
**4 rounds**. Stop: *replicate triggers not met* (converged across seeds by this rule) or *replicate cap reached*
(budget-bound across seeds). Each decision is sealed before its lanes run.

Progress per unit of compute is recorded. **Budget exhausted is never described as convergence.** If more than **10 %** of
an arm's lanes at a cutoff end *extension cap reached*, or an arm ends *replicate cap reached*, that arm's search at that
cutoff is labelled **"budget-limited (not converged)"** in every report; all records kept; no further search is run in this
study. Coverage-limited lanes are reported with their share.

### 7.7 Budgets (`budget.ts`; frozen)

- **Per-lane deterministic bounds** (worst cases, rounded up to 1,000): broad and refinement lanes as P6-TSLA's
  (`budget.ts laneCaps`); per qualified member **650** (D, G) / **652** (C, J, S); per slice / validation subject **306**.
- **Hard ceiling (resource safeguard, never convergence): 160,000,000 requested official evaluations** (ledger over the
  sealed stage records). A stage launches only if the remaining ceiling covers **1.5 ×** its expected cost and the disk
  keeps **60 GiB** free after its archive. Each cutoff's completed job archives are preserved with zstd (verified,
  restorable; `storage/tools/jobzstd.py`) before the next cutoff. If the safeguard stops a stage, the study stops at that
  checkpoint, labels it **resource/operational**, reports what was not run and never selects from partial results.
- **Expected effort** (planning only, never a decision input; the freeze's `expected`; `results/engineering/pilot.json`):
  the pilot (D21, BENCH seed keys: one broad lane per cell of every arm — D 8, G 6, J 48, S 6 on a hash-selected frozen
  D1 — and 4 J refinement lanes; 1,010,731 requested, 995,292 fresh, 1,057 s: **957 requested/s**, 4,159 bytes per fresh
  evaluation, cgroup peak 9.1 GB; every lane stopped on *triggers not met*) measured per broad lane D 14,130, G 10,498,
  J 13,333 (S priced as J) and per refinement lane 30,735 requested. Per cutoff ≈ 8.6 M broad + 7.7 M refinement, plus
  0.9 M informed at C24: **≈ 66 M requested before replicate rounds and qualification (≈ 650 per qualified member) —
  ≈ 19 GPU-hours at the pilot's throughput** (official jobs run whole arms concurrently, so larger batches). The hard
  ceiling (160 M) is a safeguard ≥ 2.4 × that estimate.

### 7.8 Stage map against NL0 1.0.0 (§4.8) and budget equivalence

| NL0 stage | Here | Adaptation |
|---|---|---|
| Independent lanes V/G/B, 2 replicates per cutoff | per arm: every cell × base replicates (D 6, G 12, J 6, S R_S) + rounds, each NL0's V-cell schedule | AD1, AD2 |
| Island extension to cap 6 / 8 | tier 1: NL0's trigger to NL0's cap, performance components to 16 | AD2 |
| (none) | tier 2 replicate rounds; stage-2 refinement (6 lanes per refined cell) | AD2 |
| Informed lane (C24) | the informed lanes of arms D and G (§7.5), NL0's informed schedule seeded by the GDX incumbents | AD11 |
| Qualification Q1–Q6, roles, actual-profit primary over independent ∪ informed ∪ incumbents | unchanged; independent populations D…S and informed populations D+, G+, C+ kept apart | AD4, AD11, AD12 |
| Folds C19 → C21 → C23, sequential verdict | unchanged, per arm | AD3 |
| Frozen selection, FULL once | unchanged | — |

Equivalence in common units (requested, fresh, proposals, islands, refinement starts and moves, archive hits) is reported per
arm in `SEARCH_AND_CONVERGENCE_REPORT.md`, beside P6-TSLA's executed figures.

## 8. Robustness instrument (Assignment 3's on the trading slot; AD6)

One Latin hypercube of u ∈ [−1, 1] over the 64 numeric columns per family (`deriveSeed('gdx-d1-growth', 'nbhd', …)`),
common random numbers across a cutoff's centres and arms; radii: D1 genes Study 8's N1 grid radii (X ±10, Y ±2, stop ±10,
hold ±2, L ±10, buffer ±10, P ±10, W ±20), control genes Assignment 2's (d ±10, hx ±2, g ±10, r ±5, c ±10; K fixed), Growth
inputs 10 % of their box in value units rounded to the fine step; clipped to the box widened to include the centre
(counted); categorical inputs fixed; inactive inputs untouched; the adaptive bound repaired; duplicates dropped. Families:
rung 1 / refinement 16, rung 2 64, rung 3 128, **selection 2 × 128** (ranking), **confirmation 3 × 128 = 384**
(qualification only), small 0.5× and wide 1.5× (report-only, finalists). Statistics: median, p10, p90 net; robust = ½ median
+ ½ p10; p90 DD; breach share with Wilson interval, mean excess, worst DD, p95 and worst-10 % mean DD (report-only).

## 9. Qualification (per cutoff, arm and stage; `qualify.ts`)

Gates (all must hold; P0): **Q1** centre net > 0; **Q2** centre DD ≤ $35,000; **Q3** confirmation p90 DD ≤ $35,000; **Q4**
confirmation p10 > 0; **Q5** at 10 bps per side centre net > 0 and DD ≤ $35,000; **Q6** every family of the arm funded at the
centre (D: D1·GDX; G: Growth·GDX; C, J, S: both). No activity, concentration, tail or envelope gate. Report-only per
member: the eight stresses; causal removals (C, J, S: without D1, without Growth); participation labels (token < 5 % of
funded principal-days); the detailed training centre (realized / unrealized, conservative net, open lot and its multiple,
open-lot share, occupancy, per-lot MAE, worst realized lot, mean losing lot); the risk envelope of every evaluation. A
configuration already qualified at a cutoff and arm keeps its evidence. Controls are qualified at the broad stage of arms D,
G, J at every cutoff.

## 10. Selection (no evaluation; `select.ts`)

- **Rule (NL0 1.0.0 §3.5, the only selector):** the actual-profit role — the highest centre net among the Q1–Q6 qualified;
  ties: higher selection robust net, lower centre DD, label. A population without a qualified member has no primary.
- **Nominating populations:** **D, G, C, J, S** (each arm's independent procedure; every cutoff) and **D+, G+, C+** (C24
  only; informed). Report-only secondary procedures (never nominating): **D-A**, **G-P / G-U, J-P / J-U, S-P / S-U**.
- **Roles per population** (selection families): actual-profit; robust-profit = highest selection robust; balanced =
  highest selection robust ÷ selection p90 DD; lower-drawdown = lowest selection p90 DD with robust ≥ 50 % of the
  actual-profit holder's. Pareto set on centre net, centre DD, selection p10, selection p90 DD (reported).
- **RA1** (AD4): report-only.
- Each arm's selection is sealed and committed before the next arm's first stage; the cutoff's selection of every arm is
  sealed and **committed before the next door opens**.

## 11. Chronology and the consequence (brief Phase 6)

### 11.1 Fold slices (C19, C21, C23)

After a fold's selection is committed, one official job on the next door evaluates every subject (each population's primary
and roles, the controls): the detailed centre and the centre with the cutoff as boundary (slice P&L, reset slice DD,
whole-run figures), the 8 stresses, the training selection family (2 × 128, regenerated exactly) replayed on the slice
(standard §5.9), and the session-close series (16-boundary evaluations at every session of the slice). All causal state and
open positions are carried across the boundary.

### 11.2 Sequential paths and the verdicts

Each independent arm's procedure chains its three fold primaries over 2020–2021, 2022–2023 and 2024 (Priority 5's `chain`:
each slice the primary's own continuous run; 5 bps of $100,000 per open lot closed or adopted at a switch; a fold without a
primary is flat; the sequential drawdown over every exactly observed GPU mark). **Verdict:** *supported* iff every fold
produced a primary, the sequential net > 0 and the sequential drawdown ≤ $35,000; otherwise *unsupported* or *incomplete*.
The five arm procedures are each an **independent** chronological test of that arm's complete search-and-selection
procedure; sub-populations report-only; roles and controls descriptive. The informed populations have no fold (C24 only).

### 11.3 Consequence (standard §1.8, default adopted)

A failed or uncomputable independent verdict — and every informed selection — means **"no chronological support (or no
independent chronological test): the selection is not a deployment-qualified candidate without an explicit user
decision"**. Governance only: never a fitness term, ranking input, objective weight or gate. "No qualifying candidate" is a
valid outcome.

## 12. Finalists, identity and the determination (AD8; `outcome.ts`; frozen before any search)

- **Finalists (C24):** every nominating population's primary (D, G, C, J, S, D+, G+, C+) and its robust-profit, balanced
  and lower-drawdown role holders. **Identity = (population, id)** (`id` = the configuration's canonical identity), written
  immutably into `FROZEN_SELECTION.json` before FULL opens; labels are display or governance text, never identity.
- **A finalist X is a GDX RESEARCH CANDIDATE FOR THE USER'S REVIEW iff** (a) X passes Q1–Q6 at C24; (b) X is the primary of
  an **independent** arm whose independent verdict (§11.2) is *supported*; (c) V1–V3 pass on FULL (validation P&L > 0; reset
  validation DD ≤ $35,000; whole-run DD ≤ $35,000). An independent primary meeting (a) and (c) but not (b) is labelled
  "development-qualified, no chronological support: not a deployment-qualified candidate without an explicit user
  decision"; an informed primary meeting (a) and (c) "development-qualified (informed), no independent chronological test:
  not a deployment-qualified candidate without an explicit user decision". (a)–(b) are sealed before FULL; the validation
  adds (c) only.
- **The identity join (brief Phase 0 item 4, Phase 7).** The validation evaluates each subject (one configuration of one
  arm) once and records the populations whose primary or role it holds; the outcome expands each selected row into one
  identity per population and joins every finalist to **exactly one** row by (population, id) through
  `src/research-outcome/identityJoin.ts` `joinByIdentity`. It **fails closed** (an explicit error, no outcome written) on a
  missing, duplicate, cross-population, malformed (V1–V3 not booleans, no population) or conflicting (record arm, empty
  label) record. Control rows never match a finalist. There is no `validation: null` path. Known defect prevented: P6-TSLA's
  outcome joined by a mutable label that its governance step overwrote, so every finalist silently became
  `validation: null` (`research/tsla-d1-growth/AMENDMENTS.md` D1; `docs/engineering/tsla-outcome-identity-fix/`).
  Prevention tests: `src/gdx-d1-growth/tests/study.test.ts` (join, relabel/reorder replay, every failure mode) and
  `src/research-outcome/tests/identityJoin.test.ts`.
- **Architecture comparisons** (C24 development evidence, same instrument and draws): for each combined arm K ∈ {C, J, S}
  against the better standalone primary B (D or G, higher centre net), J against S both ways, C+ against the better of D+
  and G+, and each informed primary against its independent counterpart (report-only): K's primary is a **material
  improvement** iff both are qualified and — **type P**: centre net ≥ B + $10,000, confirmation robust net ≥ B + $5,000,
  centre DD ≤ B + $2,500 and confirmation p90 DD ≤ B + $2,500; or **type R**: confirmation p90 DD ≤ B − $2,500, centre DD ≤ B +
  $2,500, centre net ≥ B − $2,500 and confirmation robust ≥ B − $2,500 — and **replicated**: qualified members of K from ≥ 2
  replicate numbers meet the same type (C, C+: not applicable). A single historical pair never proves an architecture
  superior (standard §3.4).
- **Outcome label (sealed after the validation):** *GDX RESEARCH CANDIDATE(S) FOR THE USER'S REVIEW* (research nomination
  only) or *NO QUALIFYING GDX CANDIDATE* (with the development-only and informed development-only ones listed).

## 13. Engineering gates and the pilot (sealed in `results/engineering/gates.json` before the freeze)

| Gate | Evidence |
|---|---|
| E1 | `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf…` VERIFIED; the entrypoint audit clean; the integrated identity-join module is outside every evaluation and enforcement manifest (no acceptance renewal needed) |
| E2 | the GDX doors: each door = the canonical partition load; prefix causality; no split; both slots one SymDoor; = the GDX slot of N/original's own door bar by bar (D24, FULL) |
| E3 | New L0 and N/original on their own data (D24, FULL known-target): GPU = CPU = their sealed figures; **the ablation**: N/original with both VGT books disabled (native, own door) = the projected GDX D1 control (this study's door, arm D) in every scalar, year, book statistic and lot, on D24 and FULL (equality only for FULL) — likewise New L0's and VG #2's GDX D1 books; 4A's Growth incumbents projected = 4A's sealed development figures to the cent; GPU = CPU throughout |
| E4 | CPU/GPU parity of every record field (detailed, compact, envelope) on random configurations of every arm and cell (coarse and fine, S with a frozen D1, C pairs) and the incumbent controls, under base, every stress, every removal, a boundary and a 16-boundary series, on D19, D21, D23, D24 |
| E5 | determinism: a mini lane set of every arm on D19 — GPU, GPU gracefully stopped and resumed, GPU process SIGKILLed and resumed, GPU server SIGKILLed (fails closed) and resumed, CPU — identical |
| E6 | identities on the GPU: single-family (J with a book off = D / G), the disabled slot inert, causal data access across doors, accounting |
| E7 | the study's unit tests (incl. the identity join and its failure modes) and the reused modules' suites |
| E8 | the full `npm test` (the known pre-existing failures only), root tsc, eslint of the study, the preflight of every study, Strategy Lab's regression (typecheck, lint, Vitest, scratch build, e2e, portfolio parity) |
| E9 | the pilot (§7.7; fixed-seed mini-optimization of every arm with the frozen schedules and the two-tier rule) |

Every official job opens the gate itself (purpose, acceptance, pins, source, job, binary, compat, device, capability coverage
of the risk-envelope pilot domain ⊇ the GDX domain, smoke, memory, host path, live parity mini-set on the GDX door) and
writes an attestation; receipts, conservation (CPU-scored = 0) and archive provenance per standard §9.5. Any consequential
CPU/GPU discrepancy stops the study.

## 14. Stage order and commands (exact commands: `RUN_COMMANDS.md`; chain `chains/chain.sh`, fail-fast)

0. Brief, audits, this protocol, `AMENDMENTS.md`, `STANDARD_ADOPTION.json`: committed; code and tests committed; gates
   E1–E9 run; `gates` sealed; `freeze` sealed; committed **before any official evaluation**.
1. Per cutoff C19 → C21 → C23 → C24: arm D (broad → rounds → qualify broad → refine-plan → refine → qualify refine → [C24:
   informed search → qualify informed] → select-arm) → arm G (the same) → pairs → qualify C fixed → [C24: pairs-informed →
   qualify C fixed-informed] → select-arm C → arm J (as D, no informed part) → freeze-d1 → arm S (the same) → select
   (**commit**) → [C19–C23: slice → commit; after C23: sequential → commit] [C24: freeze-selection → commit → authorize-full →
   commit → validate (FULL once) → commit → outcome → commit] → the cutoff's job archives preserved (zstd) → commit.
2. Report-only diagnostics, the total-portfolio stage (§15), reports, regression, ZIP, commit, push.

## 15. The matched total-portfolio comparison (brief Phase 5; AD14; report-only; after the sealed outcome)

### 15.1 Scope and timing

A report-only stage (`tools/gdx-d1-growth/portfolio.ts`, purpose `diagnostic`) that runs **after the outcome is sealed and
committed**, on frozen subjects only. It never selects, ranks, qualifies, stops or changes anything, and no strategy
parameter is chosen from it (brief Phase 6 item 7). Evidence labels: development 2016-01-04 → 2024-12-31, validation
2025-01-02 → 2026-10-30 (reset), full 2016-01-04 → 2026-10-30 — all **retrospective, previously examined history**.

### 15.2 Scenarios (identical core in every one)

S0 core only; S1 core + N/original; S2 core + New L0; S3 core + the ablation (N/original's GDX D1 alone); then core + every
C24 finalist of every nominating population (D, G, C, J, S, D+, G+, C+: primaries and role holders — the primaries are the
headline rows, the role holders the "lower-risk alternates"). The overlay of each scenario is exactly its frozen
configuration's trading record (the same engine, data and conventions as the trading sleeve).

### 15.3 The core (60 % VOOG / 40 % VGT)

- **Data:** the canonical VOOG and VGT Alpaca SIP minute files (`data/VOOG/data.csv`, `data/VGT/data.csv`; sha256 recorded),
  grouped by the canonical session grouping; the central split ledger (VOOG 6:1 and VGT 8:1 effective 2026-04-21);
  distributions from the central ledger `config/market-events/distributions.csv` (sha256
  `30feaa99e47404696e162e25df72833de49cedb28481ff059750e024c50e41a6`; derived from adjusted series, ±1 %; issuer amounts
  from 2025-12). Their coverage and adjustment are audited in the stage (sessions, splits, every distribution
  cross-checked against an independent issuer/vendor series where available). **The three VOOG 2016 distributions the
  ledger marks "estimated"** are replaced by an independently observed amount if one is found on the same ex-date (labelled
  with its source); otherwise they are reported as unverified and bounded (zero vs the ledger estimate) — identical in
  every scenario, so no incremental comparison can depend on them. No distribution is ever invented.
- **Accounting:** actual share counts at raw prices; a split multiplies the share count on its effective date; a
  distribution is entitled by the shares held at the close before the ex-date, booked as a receivable on the ex-date and
  reinvested in the same fund at the pay-date session close (the DRIP proxy); 5 bps per side on every core trade.
- **Initial allocation:** $500,000 of initial core equity (an **illustrative normalization, not a statement of the user's
  balance**), 60 % VOOG and 40 % VGT bought at the 2016-01-04 session close.
- **Primary rebalancing:** back to 60 / 40 of the core's market value at the **last session close of each calendar
  quarter** (5 bps per side). **Sensitivity:** buy-and-hold drift (no rebalancing).
- The core never receives or funds the overlay except as stated in §15.4.

### 15.4 The overlay and the funding (no double counting)

- **The overlay's contribution** is the engine's own marked net of the frozen configuration at every session close (realized
  P&L + Σ open lots (shares × close − outstanding principal − accrued interest); costs and the 11 % interest already inside),
  read from boundary evaluations of the same continuous run (CPU reference engine, purpose `diagnostic`, equal to the
  sealed GPU records — checked to the cent at the sealed figures). **The 11 % interest is therefore charged exactly once**
  (inside the overlay's net); the portfolio adds no second overlay interest charge.
- **Positions and debt:** while a lot is open the account holds the lot's market value and owes its outstanding principal +
  accrued interest as margin debt (the $100,000 principal is drawn at entry and repaid from the exit proceeds; partial exits
  repay pro rata, as the engine does). Realized overlay P&L is account **cash**: positive cash earns 0 % (conservative,
  reported); a negative cash balance is margin debt charged **11 % simple per calendar day** (booked to cash at each
  quarter end). **Sensitivity:** realized profits swept into the 60 / 40 core at each quarterly rebalance.
- **Account equity** = core market value + receivables + cash + overlay open-lot market value − overlay debt (outstanding
  principal + accrued interest) = core value + receivables + cash + overlay marked open value; with cash = cumulative realized
  overlay net (+ the negative-cash interest). By construction, total equity − core-only equity = the overlay's marked net
  − the negative-cash interest (± the sweep effects in the sensitivity) — reconciled to the cent at every close.

### 15.5 Leverage scenarios

Primary $500,000 initial core equity with a $100,000 maximum overlay position; sensitivities $250,000 and $1,000,000 (overlay
fixed at $100,000: 40 %, 20 %, 10 % of initial core). Every scenario of §15.2 uses the identical core, dates, data,
conventions, notional and assumptions within a leverage scenario.

### 15.6 Metrics (each scenario; full, development and validation windows)

- **Trading sleeve** (from the engine): net, minute DD, principal loss (worst lot), banked-capital DD, giveback, lots,
  occupancy (sessions with a lot ÷ sessions), principal-days, **net per $100,000-year of principal deployed** and **net per
  borrowing-dollar-day** (time-in-market normalization).
- **Total account** (session closes): terminal wealth and cumulative return, absolute and **incremental vs core only**;
  maximum marked drawdown (dollars; % of the running peak; peak, trough and recovery dates; duration); annual returns and
  annual drawdowns; the worst five drawdown episodes; the 2020 and 2022 episodes; a **conservative intraday bound** (every
  holding marked at its session low at once); total-account equity giveback.
- **Risk decomposition:** daily core return vs overlay P&L correlation (all sessions; sessions with an open lot), the
  overlay's beta to the core, the overlay P&L inside the core's five worst drawdown episodes, overlapping drawdowns; exposure
  at each close by sleeve (VOOG, VGT, GDX overlay, VGT overlay) and the technology share (VGT + VGT-overlay of gross long
  value; VOOG reported apart, never assumed non-technology); **dates when N/original holds a VGT lot** (added correlated
  technology exposure) and the account's drawdown on them; quarters of strongest VGT / GDX divergence.
- **Margin:** maximum debt, maximum loan-to-value (debt ÷ gross long value), minimum equity ÷ gross long value; maintenance
  headroom = equity − m × gross long value under illustrative requirements m = 25 % (a common Regulation T/FINRA-style
  minimum), 30 % and 40 % (conservative house levels) on every position, and a concentrated-position variant with 50 % on the
  overlay position; minimum headroom and its date. **Illustrative only**: actual Vanguard margin requirements depend on the
  account, eligible collateral, house rules and concentration; no margin call or safety is claimed.
- **Hypothetical stresses** (instantaneous shocks at the close of maximum overlay exposure and at the close of maximum
  debt): technology decline (VGT −30 %, VOOG −20 %, GDX −10 %), broad equity crash (VOOG −30 %, VGT −35 %, GDX −25 %),
  gold-miner selloff (GDX −40 %, core 0 %), combined (VOOG −30 %, VGT −35 %, GDX −40 %): equity loss and margin headroom
  after the shock — labelled hypothetical, kept apart from historical observations.

### 15.7 Distributions inside the overlay (report-only)

The engine credits no distribution to a trading lot (all strategies). The stage reports, report-only, the cash
distributions each overlay lot would have been entitled to (VGT lots: the central ledger; GDX lots: the GDX events listed in
`GDX_DATA_AUDIT.json` and, for 2025–2026, an independent issuer/vendor source) and their total per scenario; the trading
results are never restated.

### 15.8 Decision basis (precommitted report labels; brief Phase 5.5)

For each GDX-only scenario X against S1 (N/original), primary leverage scenario, full period AND development period:
- **trading-sleeve axis:** Δ net, Δ minute DD, Δ worst principal loss, the robustness and chronology labels of §12;
- **whole-portfolio axis:** Δ terminal wealth (incremental vs core), Δ total-account maximum marked DD, Δ minimum margin
  headroom, Δ technology share.

Label **"material total-portfolio drawdown reduction"** iff X's total-account maximum marked DD is lower than S1's by ≥
$5,000 AND ≥ 10 % relative in BOTH the full and the development period; **"material total-portfolio drawdown increase"**
by the mirror rule; otherwise **"no material difference"**. The terminal-wealth trade-off is stated in dollars beside it. No
profitability ceiling is imposed in either direction (a GDX-only overlay earning more than N/original is reported as
such). These are report labels only: never a qualification, a selection or a deployment recommendation, and never a claim
of superiority from a sector label or one episode.

## 16. Resources and recoverability

Transient units in `gdx8.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0); **one official GPU job at a time**;
`node --no-maglev`; the accepted evaluator's Mode S (8 host workers, batch 8,192, linger 30 ms); every evaluation archived as
it returns (archive bound to the study, job, door pin, evaluation digest and backend); a resumed job passes the whole gate
again and replays from its archive (`--resume`); job identities refuse a different definition; no automatic restart; the
chain runs as its own unit and commits each sealed block. Requested vs fresh evaluations, archive hits, runtime, VRAM,
throughput and convergence are recorded per arm.

## 17. Report-only analyses (after the validation unless stated; never a selection input)

Search coverage and convergence (per arm, cutoff, cell and replicate; islands and stop reasons by tier; budget-bound and
coverage-limited shares; progress per 10,000 evaluations; replicate distributions); §5.9 exposure for every fold primary and
finalist (open-lot share, largest open lot and its give-back, per-lot MAE, the D1 hold-window tail stress on pre-2016 GDX
daily data and in-sample, the training neighbourhood on the next slice); tail severity (p95, worst-10 % mean, breach shares,
small 0.5× and wide 1.5× families for the finalists); the stresses (cost, interest, slippage, next-open stops); causal
removals; risk decomposition (marked DD, principal loss marked and liquidation, banked-capital DD, giveback with per-lot
attribution); annual and episode results; open-position exposure, duration and slot occupancy (unrestricted Growth in
particular); participation and displacement attribution for the combined arms (refused decisions by occupant: D1 vs Growth,
same-symbol conflicts); the ablation's chronology and funding against N/original's (its GDX D1 lots funded and refused with
and without the VGT books); GDX liquidity and capacity at the strategies' entry minutes; the buy-and-hold controls; the
total-portfolio stage (§15). Report-only replays of frozen subjects may use the non-official GPU path or the CPU reference
under purpose `diagnostic`, labelled.

## 18. No-go rules and amendments

A failed engineering gate, any CPU-scored official evaluation, a stale acceptance, a request beyond a bound, a door opened
out of order, a change after the freeze without an amendment, a criterion loosened after an outcome, a recomputed trigger
that disagrees with a lane's decision, or a failed identity join stops the study. `AMENDMENTS.md` is append-only: pre-freeze
`E*` refine the implementation; after the freeze disclosures `D*`, operational `O*` and code `A*` (defect fixes changing no
rule, each with a sealed record of the changed digest). Criteria are never loosened, and no arm, cell, cutoff, replicate,
statistic, margin or threshold is added, removed or changed once a result it governs exists. A failure is a result.
