# Protocol P9-MSFT 1.0.0 — Priority 9: MSFT D1 + Growth, comprehensive GPU research

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
official evaluation). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only). Research only: nothing
here adopts a candidate, changes an official configuration, replaces New L0 or N/original, merges into `main`, deploys,
sends an order or alert, or touches a broker. MSFT is studied **alone**: never combined with TSLA, VGT, GDX or any other
security, and the additional-stocks/ETFs study is not started. Reports are written analysis, Markdown tables and
machine-readable results only (standard §7.7).

- **Study:** `research/msft-d1-growth/`; official code `src/msft-d1-growth/` started by `npm run msft9 -- <command>` through
  `src/gpu-backend/officialRunner.ts`; non-official data, engineering, pilot, diagnostic and report tools in
  `tools/msft-d1-growth/` (`npm run msft9-eng`, `msft9-diag`); the chain `chains/chain.sh`.
- **Brief:** `brief/BRIEF.md` (the user's "Claude Code — Priority 9: MSFT D1 + Growth, Comprehensive GPU Research", 256
  lines, 28,460 bytes, sha256 `562e12eb3ab85ae1013bcda139cc7329e42ad80508bc9b1957f38ae116e6aad5`, read in full to its final
  line 2026-11-28T08:20Z).
- **Branch:** `research/msft-d1-growth` (main checkout) from `main` at `ef0014bc2ab7b6f47f0ff5fe9ccf86aaba7dc2a8` (the
  Assignment 2 integration: standard 5.0.0, research date range R1, GPU Phase 9 ACCEPTED, the P6-TSLA identity fix, the
  P6-TSLA and P8-GDX study code). The identity-join module is already on this lineage (not cherry-picked again).
- **Lineage of the code (Phase 0):** `src/msft-d1-growth/` is P6-TSLA's study code (`src/tsla-d1-growth/`: the
  no-incumbent design with external controls) under a collision-free rename (TSLA → MSFT; the engine's slot names GDX and
  VGT untouched), with P8-GDX's doors (the central split ledger) and a rewritten `outcome.ts` (the identity join by (arm,
  id), fail closed; the evidence-sufficiency condition (d), §12.2). The search lane `search.ts` is re-derived mechanically
  from Priority 5's lane (`derive.ts`; byte equality tested).
- **Pre-freeze evidence:** `MSFT_DATA_AUDIT.json` / `.md` (Phase 1), `reports/data/SUITABILITY.json` (development only),
  `FUNCTIONALITY_AUDIT.md`, the engineering gates E1–E9 (§13).

## 0. Standard adoption, adaptations and departures

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` **5.0.0**, sha256 `68487de7b67cd9ccbf70478f51d12f5ef19287d6fa34a737c69f4b49b277eeaf`, read in full 2026-11-28T08:20Z |
| Adoption manifest | `STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/msft-d1-growth`); every official stage calls `requireStandardAdoption` (`stages.ts officialGuards`) |
| Scope | `optimization` |
| Research date range | **R1** (`config/research/date-ranges.json`): development 2016-01-04 → 2024-12-31, validation 2025-01-01 → 2026-10-30 (first session 2025-01-02) |
| Data pin (§1.3) | `data/MSFT/data.csv`, 90,939,174 bytes, sha256 `b2d79f9425e9f79eb3f59584a3bdfc3b7f797124f247399b759f2aab1a98be91`, through 2026-10-30 (the whole canonical file: no later row was downloaded) |
| Evaluation backend (§9) | official evaluations only through `openOfficialGpuSession` → `GpuPool` → `EvalLab`; acceptance `config/gpu-backend/acceptance.json` (GPU Phase 9, sha256 `9ebb33ce8620dead93ebab349a8263ad3ca8bbc676861771724a745ef2361bf4`, binary `research/gpu-phase9/build/gb9` `36dcc25109a9ffada8951ba02d7745fe242e8bf781d268b68f4b57ddf7ab36aa`, device `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`), its sha256 kept out of band (`~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase9-9ebb33ce.json`); no CPU fallback; `node --no-maglev` |
| Reference method (§4.8) | `docs/research/methods/NEW_L0_METHOD.md` id `NL0` 1.0.0, sha256 `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4`, as Assignment 3, Priority 5, P6-TSLA and P8-GDX executed it (the lane is derived mechanically from Priority 5's, `src/msft-d1-growth/derive.ts`); stage map §7.8 |

| ID | Standard § | Kind | What and why |
|---|---|---|---|
| AD1 | §4.1, §4.3, §4.8 | adaptation | **The MSFT space** (`src/msft-d1-growth/space.ts`): P6-TSLA's / P8-GDX's space unchanged — Assignment 3's genome semantics (Study 8's D1 box and grid, Assignment 2's RC 2 control families and boxes, Growth 1.4.0's complete genome on growth140's boxes, coarse and fine grids, identity, strata, instrument, moves) restricted to **one trading slot**: the accepted engine's VGT-named slot carries MSFT (both slots one MSFT SymDoor; the second slot's books disabled; no evaluation file changed — gates E1, E2, E6). Five **arms** with protected **cells**: D (8 D1 structures), G (6 Growth exit-protection structures), J (48), S (frozen D1 finalist × 6), C (fixed pairs). S1 absent; shadow-entry eligibility OFF; calendar-day holds (brief Phase 2) |
| AD2 | §4.2, §4.5, §4.8 | adaptation | **Effort by replicates** of NL0's unchanged per-lane schedules (§7.2): **P8-GDX's executed allocation × 4/3 in every stage and Growth's base replicates × 2** (base D 8, G 24, J 8, S by the matching rule; 8 lanes per refined cell; standard §4.8 proportional scaling), Priority 5's two-tier island rule and convergence-driven replicate rounds (≤ 4, 2 %). Brief Phase 3 items 2–5, Phase 5: substantial, fair effort and multiple independent seeds; P8-GDX measured a cross-seed range of the best feasible centre net of 49–63 % in arm G against 10–30 % elsewhere, so Growth gets the larger increase |
| AD3 | §1.8 | adaptation | The sequential drawdown statistic is Priority 5's (exact over every GPU-observed mark); one procedure per arm (§11) |
| AD4 | §2.3, §2.5 | adaptation | **NL0's original rule is THE selector** (primaries, roles, finalists, frozen D1, pairs; brief Phase 2: "the original authorized NL0/P0 selector remains the official selector"). Assignment 3's RA1 is computed on the identical populations as a separately labelled, **report-only** experimental selector (never selects; brief Phase 3 item 6) |
| AD5 | §3.4 | adaptation | **The method comparison** of the brief: (b) separately optimized components pooled = arm C; (c) fully joint = arm J; staged D1-first = arm S; standalone D, G; matched evaluation rules; effort matched by the frozen rule of §7.2 (S + its D1 step ≥ J), disclosed per arm |
| AD6 | §5.3 | adaptation | The neighbourhood instrument is Assignment 3's on the trading slot, in **this study's seed namespace** (`deriveSeed('msft-d1-growth', …)`), common random numbers across centres AND arms; arm S's design neighbourhoods never move the frozen D1 |
| AD7 | §5.1 | adaptation | Priority 5's eight stresses: cost 0 / 2 / 10 / 20 bps, interest 14 %, stop slippage +10 / +25 bps, next-open stops (Q5 uses 10 bps; the rest report-only) |
| AD8 | §1.8, §2.5 | adaptation | **The precommitted determination** (§12; `outcome.ts`): finalists, development, chronological and evidence-sufficiency labels sealed before FULL; architecture comparisons with Priority 5's bands and replication; the outcome joins the validation records by **(arm, id)** and fails closed (`src/research-outcome/identityJoin.ts`); "no qualifying MSFT candidate" is valid |
| AD9 | §5.9 | adaptation | The D1 maximum-hold-window tail stress uses **pre-2016 MSFT daily data** (1986-03-13 → 2015-12-31, Yahoo Finance split-adjusted closes; disjoint from every door; daily resolution, labelled) as the declared reference history, beside the in-sample development stress |
| AD10 | §0.3, §1.3 | adaptation | The common complete endpoint is **2026-10-30** (R1's validation end; the program's horizon, identical to P6-TSLA and P8-GDX); MSFT has a complete regular session on it and none missing before it; no later row was downloaded |
| AD11 | §3.1–§3.3, §4.4 | adaptation | **No MSFT incumbent exists** (the program never optimized MSFT): no incumbent-informed lane and no informed population (§4.4's informed refinement is conditional on incumbents). New L0's and N/original's VGT books are **external controls only** (projected unchanged onto MSFT in arms D, G, J; never seeds, members, finalists or primaries; brief Phase 0) |
| AD12 | §2.7, §4.7 | adaptation | Real participation: arms C, J, S require **both MSFT books funded** at the centre (Q6); D and G their own book. Growth's protected and unrestricted exit structures are **protected by cells** (equal budgets) and analysed as report-only sub-populations |
| AD13 | §5.6 | adaptation | MSFT has no split in the window (its last, 2:1, was 2003-02-18): the doors apply the **central** split ledger (sha256-pinned; no MSFT event; an MSFT event there fails the doors closed). The price-only convention of every strategy (no dividend credited to a trading lot) is unchanged; its effect is reported (§15) |
| AD14 | §0.2 [R] | adaptation | The buy-and-hold comparators (financed and unfinanced; price-only and with dividends) and the per-lot dividend entitlement are **report-only**, after the outcome; they never select, rank, qualify or stop anything (brief Phase 2 "Research comparators", Phase 6) |
| **DP1** | **§2.6 [M]** | **departure** | **Evidence-sufficiency thresholds ES1–ES3 bind the final candidate determination** (§12.2): ≥ 10 funded lots (C, J, S also ≥ 3 of each family), ≥ 5 independent pool-level episodes and funded entries in ≥ 4 calendar years, the largest winning episode ≤ 50 % of the development net. They never enter the fitness, search, qualification (Q1–Q6), ranking or selection — the NL0/P0 selector and gates are unchanged — but a primary failing them is **not** a research candidate. **User agreement:** brief Phase 3 item 7 ("Thresholds for sufficient independent trades/episodes, concentration of gains, eligibility and participation for D, G, and combined arms. Do not lower trade-count/risk requirements simply because MSFT is less volatile … No qualified candidate is an acceptable finding") and Phase 5B ("Do not let a single enormous winner satisfy robustness requirements by itself") |

**DP1 is the only departure.** No other [M] rule is changed.

## 1. Question, hypotheses, objective and outcomes

- **Question (brief Mission, Phase 2, Phase 5).** Using only MSFT in one exclusive margin-funded $100,000 slot, what do
  substantial from-scratch D1 and Growth optimizations find standalone, does combining them (fixed pair, fully joint or
  D1-first sequential) add value, and can any of them become a chronologically qualified, robust, sufficiently evidenced
  candidate?
- **Objective (standard §2.2).** Development net profit (realized + marked, after costs and interest) with a maximum minute
  marked drawdown ≤ **$35,000 = 35 % of the fixed $100,000 initial trading allocation** (P0; never of peak equity), beside
  neighbourhood robustness, chronological evidence and exposure diagnostics. The fitness is unchanged (never adapted to
  make MSFT attractive). The $35,000 ceiling is a research criterion on historical paths, not a live loss cap.
- **Hypotheses** (each may fail; a null is a result):
  - **H1.** Each standalone arm (D, G) has a Q1–Q6-qualified development member at C24.
  - **H2.** A combined arm (C, J or S) is a material improvement over the better standalone primary (§12.3), i.e. MSFT
    Growth adds measurable value beyond MSFT D1 after capital contention and costs (or the reverse). Null: no material
    value.
  - **H3.** An arm's independent procedure is chronologically supported (§11.2). Null (common in the program):
    unsupported.
  - **H4.** The searches converge: the budget-bound share ≤ 10 % of lanes per arm and cutoff, and the replicate rounds
    stop on their trigger. Null: budget-limited, reported as such.
  - **H5.** Fully joint optimization (J) differs materially from D1-first sequential (S) (§12.3 both ways). Null: no
    material difference.
- **Valid outcomes:** MSFT research candidate(s) for the user's review; development-qualified candidates without
  chronological support; chronologically supported candidates with insufficient evidence; **no qualifying MSFT
  candidate**. None is a failure of the study. Nothing is adopted or deployed.

## 2. Prior knowledge and provenance (labelled)

- **MSFT was never optimized by this program** (no study, browser candidate or incumbent; the program's references are
  VGT/GDX). Its 2016–2026 market history is public, and the broad-market episodes **2020, 2022 and 2025–2026 were
  examined by many studies** of other instruments (VGT, GDX, TSLA). The validation 2025-01-02 → 2026-10-30 is therefore
  labelled **retrospective, previously examined (market) history, not a pristine holdout or prospective evidence**; the
  folds' slices (2020–2024) likewise.
- **Prior results of the program (context only, never inputs):** P6-TSLA and P8-GDX found no qualifying candidate; every
  arm of both failed the chronological test (sequential drawdowns above $35,000 on the folds) while the combined arms
  looked better in development. New L0 and N/original remain the VGT/GDX benchmarks; I1 (staged trailing stops) is not
  part of this search (S1 absent).
- **Real-data exposure before this freeze:** the data audit (coverage and integrity; no 2025–2026 returns: counts only),
  the development-only suitability analysis (descriptive), the engineering gates (equality counts and hashes; New L0 and
  N/original compared with their sealed figures on their OWN VGT/GDX data), the pilot (counts, timings, stop reasons;
  BENCH seed keys never used by the study). **No box, threshold, budget, cell or rule was derived from an MSFT profit or
  drawdown**: the boxes are the original D1 / Growth domains, the gates P0's, the budget P8-GDX's scaled by a rule fixed
  from P8-GDX's seed dispersion, ES1–ES3 from general evidence requirements (§12.2).

## 3. Data, doors and windows

- **Canonical file:** `data/MSFT/data.csv` (Alpaca Markets Data API v2, `/v2/stocks/MSFT/bars`, **SIP**, 1Min,
  `adjustment=raw`; 1,619,189 rows; 2016-01-04T09:00Z → 2026-10-30T23:59Z; sha256
  `b2d79f9425e9f79eb3f59584a3bdfc3b7f797124f247399b759f2aab1a98be91`), downloaded for this study on 2026-11-28 with the
  user's existing SIP entitlement (`scripts/download.sh`, 162 requests; no purchase; credentials from the git-ignored
  `.env`, never printed) and imported and verified by `npm run datasets -- import / verify MSFT`. One file per symbol; no
  differently truncated permanent copy (the doors are byte prefixes in the git-ignored cache).
- **Audit** (`MSFT_DATA_AUDIT.json`): 2,723 of 2,723 NYSE sessions, 0 missing or extra; early closes 18/18 (development)
  and 3/3 (validation) as the NYSE calendar; 0 duplicates, 0 out-of-order, 0 inconsistent OHLC bars; 115 missing regular
  minutes in development (0.01 %), 0 in validation; 6 intra-session gaps ≥ 5 minutes (2016-02-02 9 min and 2016-02-22 46
  min — source-wide: TSLA's file has them at the same minutes — and the four 14-minute market-wide halts of March 2020);
  0 minute moves > 5 %; 558,391 extended-hours rows kept in the file and never a bar; **no split** (central ledger 0 MSFT
  events; 0 split-sized raw overnight gaps; the independent Yahoo series lists 9 splits, the last 2003-02-18);
  development closes within 1.42 % of the independent close (2020-03-18; p99 0.19 %).
- **Disclosed data finding:** the canonical closing-print proxy (the open of the 16:00 bar, `src/lib/session.ts`) differs
  from the official auction close by 1.42 % on 2020-03-18; every other development close is within 1 %. It is the frozen
  data path of every study and of the accepted evaluator: kept, not repaired.
- **Trading-relevant data:** only scheduled regular-session minute bars (09:30–15:59 New York; to 12:59 on early-close
  days) and the closing-print proxy (`groupMarketSessions` drops pre- and post-market rows); overnight moves are executed
  at the next regular-session price (stops at the stop level or the gapped open); missing minutes are preserved, never
  filled; minute-bar resolution, never tick precision.
- **Dividends:** MSFT paid 36 quarterly dividends in 2016–2024 ($19.47 per share). **Price-only convention (unchanged,
  every strategy of the program):** a trading lot is never credited a dividend, the raw ex-date price drop is part of its
  P&L and interest is charged on the full principal — a small downward bias of every MSFT trading result relative to a
  total-return holder, largest for long holds (reported, §15; never introduced into the trading P&L or financing).
- **Doors** (`data/DOOR_PINS.json`, sha256 `7deac6d79b56b2db4e331e45c1ab687a0b7f698ea196f7dc10e54fa40ed75f7f`): byte
  prefixes **D19, D21, D23, D24** (through 2019-12-31, 2021-12-31, 2023-12-29, 2024-12-31; 1,006 / 1,511 / 2,012 / 2,264
  sessions) and **FULL** (through 2026-10-30; 2,723 sessions), each verified by size, sha256 and last row before parsing;
  equal to the canonical partition path (gate E2). D23's prefix hash equals the canonical training partition's.
- Development 2016-01-04 → 2024-12-31 for every choice; validation 2025-01-02 → 2026-10-30 only for the frozen slate, once.
- Folds (brief Phase 3 item 8): **C19** → slice 2020-01-02 → 2021-12-31 (D21); **C21** → 2022-01-03 → 2023-12-29 (D23);
  **C23** → 2024-01-02 → 2024-12-31 (D24); **C24** → FULL once. Every run is continuous from 2016-01-04 (no reset at a
  boundary); slice P&L = the marked change from the cutoff close; slice DD resets at the cutoff close; whole-run DD beside
  it; open positions at a boundary are carried and marked, never liquidated.
- Every opening goes through `doors.ts` (guards in its header) and is logged in `results/doors.jsonl`.

## 4. Frozen references, controls and comparators

| Row | What | Role |
|---|---|---|
| **N/original** | Assignment 3 `C24/informed/GD.VB/R2#1 profit` (rc1-f1a8b57cb02455c3): VGT D1 + GDX D1 + VGT Growth; sealed FULL $482,700.73 / DD $20,385.99 / 44 lots; D24 $388,031.02 | frozen VGT/GDX benchmark: reproduced to the cent on its OWN data (gate E3, nonregression); immutable external reference, never an MSFT input |
| **New L0** | 5B `C24/L0/informed/R1#1 profit` (a2e385640ca61012); sealed FULL $479,605.18 / $20,385.99 / 46 lots; D24 $382,721.46 | as N/original |
| **I1** | the staged trailing-stop candidate (`research/vg-l0-staged-stop/`) | immutable external reference only; S1 is absent from this study's engine path |
| **External controls** `control: New L0 / N/original on MSFT (arm D, G, J)` | New L0's and N/original's **VGT** D1 book (vector, RC 2 controls, activation) as D1·MSFT and VGT Growth book as Growth·MSFT, unchanged (`controls.ts`; A3 `FROZEN_SELECTION.json` sha256 `4080d4b1ca4db93296876f009307ce7cd055e1ab04f16133f7761c40a288f2d7`) | descriptive transfer controls: qualified with the study's instrument at every cutoff and evaluated on every slice and the validation; **never a member, seed, finalist, primary or chronological evidence** |
| P6-TSLA, P8-GDX outcomes | their sealed records | context only |
| MSFT buy-and-hold (report-only, after the validation) | $100,000 at the 2016-01-04 first regular-minute open (+5 bps), marked at every close: **unfinanced** (own capital) and **financed** (the $100,000 borrowed at 11 % simple by calendar day, as the strategies); each **price-only** and **with dividends** (cash and reinvested) | descriptive (§15) |

No incumbent-informed lane, no informed population, no seeding by a transfer reference (AD11).

## 5. Engine and conventions (unchanged)

Priority 3's pooled engine through RC 2 (`src/d1-risk-controls-rc2/`, `src/vg-l0-risk-families/evaluate.ts`) on the
accepted GPU evaluator (the TypeScript engine stays the reference): **one exclusive funded $100,000 slot** granted only at a
decision's own instant when nothing is open or reserved; same-instant order **D1 first, then Growth**; no compounding,
preemption, forced switches, queued or delayed entries; a refused signal leaves the refused book's **virtual (shadow) state**
running (D1's shadow lifecycle; Growth lifecycle L0) and is never funded later (shadow-entry eligibility **OFF**); 5 bps per
executed side inside the fill prices, $0 commission; **11 % simple interest** on outstanding principal by calendar day (365);
stops at the stop level or the gapped open; fractional shares; harmonized D1 arming from 2016-01-04; **calendar-day
maximum holds**; staged trailing stops **S1 absent**; no new trailing-stop or giveback rule; **price only**. The engine's
second slot is disabled in every evaluation (its D1 book a fixed inert vector, its Growth book the placeholder). Every
evaluation requests the risk envelope (trade principal loss, banked-capital DD; marked and liquidation): report-only.

## 6. Space (`src/msft-d1-growth/space.ts`; `FUNCTIONALITY_AUDIT.md`)

- **Genome:** 11 categorical + 64 ordinal = 75 genes (D1 family, decline gate, activation, Growth's 8 structural; D1 8,
  controls 6, Growth numeric 50). Boxes: D1 Study 8's (X 8.0–30.0 %, Y 0.1–5.0 %, stop 3.0–15.0 %, hold 3–30 calendar days,
  L 20–250, buffer 0.0–6.0 %, P 3.0–20.0 %, W 10–200); controls Assignment 2's (d 3.0–25.0 %, hx 6–60 days, g 1.0–15.0 %,
  K 1–4, r 10–100 %, c 5–250 sessions); Growth growth140's (maximum hold 3–30 calendar days; every bounded and open-ended
  exit structure). Coarse grid for broad lanes; fine grid for refinement, every refinement move and every neighbourhood.
- **Cells:** **D** `D.<f><g>` (D1 family A–D × decline gate; 8; Growth OFF); **G** `G.h<e>.s<i>` (Growth exits ∈ {hold off,
  hold on & buffer off, hold on & buffer on} × initial ATR stop OFF/ON; 6; `G.h0.s0` = **unrestricted** open-ended Growth,
  reported with explicit stress and downside; D1 OFF); **J** `J.<f><g>.h<e>.s<i>` (48); **S** `S.<C><k>.h<e>.s<i>` (frozen
  D1 finalist k of cutoff C × 6); **C** `C.<f><g>.h<e>.s<i>` (pairs; never searched).
- Every gene outside the arm's books is pinned; inactive genes masked; identity `riskId2` of the engine quad and canonical
  controls; behavioural equivalence = the funded-lot ledger signature; distance = normalized L∞ over active numeric inputs.
- **Coverage protection:** every cell of an arm gets the identical budget; screen strata; promotion and rung shares per
  Growth entry pattern and per control pattern (NL0's / Assignment 3's). No new trading rule, protective stop or staged
  rule is introduced; no domain was narrowed or widened for MSFT.

## 7. Search, budgets and stopping

### 7.1 Broad lanes (independent; every cutoff; every search arm)

One lane = NL0's V-cell schedule on one cell (Assignment 3 §7.1 / Priority 5 / P6-TSLA / P8-GDX §7.1): screen 512 (coarse,
structure pinned, strata) → plausibility (centre net > 0, centre DD ≤ $35,000, the arm's families funded) → promotion 64 →
rung 1 (16, centre-first) → **2 base islands × 256** (population 32, NL0's NSGA-II operators) → extension islands (§7.6) →
rung 2 12 × 64 → rung 3 6 × 128 → refinement (robust and profit starts, one pass, $2,000 rule) → shortlist 3. Seed key =
lane key `<cutoff>/<arm>/broad/<cell>/R<r>`, replicates from **R101**; no incumbent, control, archive or later-selected
vector or range enters. Arm S's lanes run after arm D's selection at the same cutoff.

### 7.2 Base replicates per arm and cutoff (frozen; `budget.ts`)

| Arm | Cells | Base replicates | Base broad lanes |
|---|---:|---:|---:|
| D | 8 | **8** (R101–R108) | 64 |
| G | 6 | **24** (R101–R124) — Growth's genome has ≈ 4× the free dimensions of D1's and P8-GDX measured its widest seed dependence (49–63 %) | 144 |
| J | 48 | **8** | 384 |
| S | 6 × F (F ≤ 3 frozen D1 finalists) | **R_S(F) = max(8, ⌈(384 − 64) ÷ (6·F)⌉)**: 18 / 27 / 54 for F = 3 / 2 / 1 | 6 × F × R_S(F) ≥ 320 (324 for F = 3) |

The precedents: P6-TSLA D 4 / G 8 / J 4 / refine 4 (44.16 M requested executed); P8-GDX × 1.5 (76.97 M); P9-MSFT = P8-GDX
× 4/3 in every stage, Growth's base × 2.

### 7.3 Stage-2 refinement (every cutoff; every search arm; frozen rule `select.ts refineCells`)

From the arm's qualified broad members only: profit 4, robust 4, lower drawdown 2, balanced 2 cells, then coverage (D, J:
every D1 family, the gate ON and OFF, a protective stop; G, J, S: unrestricted and protected Growth, both Growth entries;
S: every frozen D1 finalist), then — while the quota allows — the remaining qualified cells by best centre net; **quotas
D 8, G 6, J 16, S 12**. Each refined cell gets **8 lanes** (R101–R108) of NL0's informed schedule seeded by the cell's
qualified broad members (≤ 24, each + 12 near (1.5) + 12 broad (3) designs; focus seeds = the cell's actual-profit and
robust-profit members + 64 (0.5) + 64 (1.0)): 4 base islands × 384, extensions §7.6, rung 2 16 × 64, rung 3 8 × 128,
refinement robust / profit / profit-2 (one pass) and focus starts (two passes), shortlist 6; fine grid; the cell fixed
(arm S: the frozen D1 fixed in designs and moves). A cell with no qualified broad member is not refined.

### 7.4 Arms C and S (from the same cutoff's sealed selections only)

- **Arm S (D1-first sequential).** After arm D's selection is sealed and committed: its **finalists** — the primary, the
  robust-profit and the balanced role holders, distinct ledgers, **≤ 3** — are frozen (`results/frozen-d1/<cutoff>.json`)
  and **never move**; arm S searches Growth (6 cells per finalist) against the complete shared-slot pool containing the
  frozen D1, every proposal scored on the pooled replay (never on standalone Growth returns; brief Phase 5E). No arm-D
  finalist → no S lane and no S primary at that cutoff (a procedure result). The number of carried finalists (≤ 3) and
  their budget (R_S) are frozen above and reported.
- **Arm C (fixed pairs).** After arms D and G are sealed and committed: **every pair** of D's and G's finalists (each ≤ 3 by
  the same rule: ≤ 9 pairs), vectors unchanged, in one slot (D1 first) — no tuning; all pairs are carried (no opportunistic
  pairing); qualified with the joint instrument; C's primary by the same rule. No D or no G finalist → no pair.

### 7.5 No informed lane (AD11)

MSFT has no incumbent, so NL0's C24 informed lane (§3.4 of the method; its L0 arm executed 4,034 proposals and 91,030
requested evaluations) has no counterpart. Per NL0 §7.5 its budget is reassigned to the retained scope through the same
per-cell schedule: NL0's refinement lanes **are** the informed schedule seeded by qualified broad members, and the
stage-2 refinement of every arm at every cutoff (§7.3; 42 refined cells × 8 lanes at full quota) exceeds the omitted lane's
budget many times. No transfer reference seeds any lane.

### 7.6 Extension and stopping (frozen; development only; Priority 5's / P6-TSLA's / P8-GDX's rule)

**Tier 1 — islands, per lane.** After each measured island a lane runs one more island iff (a) it has run fewer than NL0's
cap (6 broad; 8 refinement) and NL0's trigger fired on its last island — hypervolume of (−robust net, p90 DD) against
(0, $35,000), best feasible robust net or best feasible centre net raised by **> 5 %** (performance components), or a new
feasible behaviour class (class component); or (b) it has run at least NL0's cap and fewer than **16** islands and a
performance component fired. Stop reasons: *triggers not met*; *class trigger only beyond NL0's cap*
(**coverage-limited**); *extension cap reached* (**budget-bound, not converged**); *resource guard*.

**Tier 2 — replicate rounds, per arm and cutoff** (broad lanes): after the base replicates and after each round, one more
replicate of **every** cell of the arm runs iff the **last** replicate raised the arm's union of feasible rung-3 and
shortlist fits (hypervolume, best robust net or best centre net) by **> 2 %**, or gave a cell its first feasible fit; at most
**4 rounds**. Stop: *replicate triggers not met* (converged across seeds by this rule) or *replicate cap reached*
(budget-bound across seeds). Each decision is sealed before its lanes run. These are the **predeclared, convergence-driven
extensions** of brief Phase 3 item 5; they need no further confirmation.

Progress per unit of compute is recorded. **Budget exhausted is never described as convergence.** If more than **10 %** of
an arm's lanes at a cutoff end *extension cap reached*, or an arm ends *replicate cap reached*, that arm's search at that
cutoff is labelled **"budget-limited (not converged)"** in every report; all records kept; no further search is run in this
study. Coverage-limited lanes are reported with their share. Convergence by these local rules is **not** proof of a global
optimum; the cross-seed dispersion per arm, cutoff and cell is reported (§17).

### 7.7 Budgets (`budget.ts`; frozen)

- **Per-lane deterministic bounds** (worst cases, rounded up to 1,000): broad and refinement lanes as P8-GDX's
  (`budget.ts laneCaps`); per qualified member **650** (D, G) / **652** (C, J, S); per slice / validation subject **306**.
- **Hard ceiling (resource safeguard, never convergence): 250,000,000 requested official evaluations** (ledger over the
  sealed stage records). A stage launches only if the remaining ceiling covers **1.5 ×** its expected cost and the disk
  keeps **60 GiB** free after its archive. Each cutoff's completed job archives are preserved with zstd (verified,
  restorable; `storage/tools/jobzstd.py`) before the next cutoff. If the safeguard stops a stage, the study stops at that
  checkpoint, labels it **resource/operational**, reports what was not run and never selects from partial results.
- **Expected effort** (planning only, never a decision input; the freeze's `expected`; `results/engineering/pilot.json`):
  the pilot (D21, BENCH seed keys: one broad lane per cell of every arm — D 8, G 6, J 48, S 6 on a hash-selected frozen
  D1 — and 4 J refinement lanes; 1,168,221 requested, 1,153,407 fresh, 1,140 s: **1,025 requested/s**, 4,128 bytes per fresh
  evaluation, cgroup peak 9.5 GB; every lane stopped on *triggers not met*) measured per broad lane D 13,910, G 14,660,
  J 16,546 (S priced as J) and per refinement lane 30,766 requested. Per cutoff ≈ 14.7 M broad (D 64, G 144, J 384, S 324
  lanes) + 10.3 M refinement (336 lanes at full quota): **≈ 100 M requested before replicate rounds and qualification (≈ 650
  per qualified member) — ≈ 27 GPU-hours at the pilot's throughput** (official jobs run whole arms concurrently, so larger
  batches; P8-GDX's official search ran ≈ 1.7× its pilot's rate). The hard ceiling (250 M) is a safeguard ≥ 2.5 × that
  estimate. Disk: ≈ 105 GB of uncompressed job archives per cutoff at 4,128 bytes per fresh evaluation, compressed before
  the next cutoff (342 GB free at the freeze).

### 7.8 Stage map against NL0 1.0.0 (§4.8) and budget equivalence

| NL0 stage | Here | Adaptation |
|---|---|---|
| Independent lanes V/G/B, 2 replicates per cutoff | per arm: every cell × base replicates (D 8, G 24, J 8, S R_S) + rounds, each NL0's V-cell schedule | AD1, AD2 |
| Island extension to cap 6 / 8 | tier 1: NL0's trigger to NL0's cap, performance components to 16 | AD2 |
| (none) | tier 2 replicate rounds; stage-2 refinement (8 lanes per refined cell) | AD2 |
| Informed lane (C24) | none (no MSFT incumbent); its budget reassigned to the stage-2 refinement (§7.5) | AD11 |
| Qualification Q1–Q6, roles, actual-profit primary | unchanged (no incumbent fallback: none exists) | AD4, AD12 |
| Folds C19 → C21 → C23, sequential verdict | unchanged, per arm | AD3 |
| Frozen selection, FULL once | unchanged | — |

Equivalence in common units (requested, fresh, proposals, islands, refinement starts and moves, archive hits) is reported per
arm in `SEARCH_AND_CONVERGENCE_REPORT.md`, beside P6-TSLA's and P8-GDX's executed figures and NL0's L0 arm.

## 8. Robustness instrument (Assignment 3's on the trading slot; AD6)

One Latin hypercube of u ∈ [−1, 1] over the 64 numeric columns per family (`deriveSeed('msft-d1-growth', 'nbhd', …)`),
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
centre (D: D1·MSFT; G: Growth·MSFT; C, J, S: both). No activity, concentration, tail or envelope gate in qualification (the
evidence-sufficiency thresholds act only in the determination, §12.2). Report-only per member: the eight stresses; causal
removals (C, J, S: without D1, without Growth); participation labels (token < 5 % of funded principal-days); the detailed
training centre (realized / unrealized, conservative net, open lot and its multiple, open-lot share, occupancy, per-lot MAE,
worst realized lot, mean losing lot); the risk envelope of every evaluation. A configuration already qualified at a cutoff
and arm keeps its evidence. The external controls are qualified at the broad stage of arms D, G, J at every cutoff.

## 10. Selection (no evaluation; `select.ts`)

- **Rule (NL0 1.0.0 §3.5, the only selector):** the actual-profit role — the highest centre net among the Q1–Q6 qualified;
  ties: higher selection robust net, lower centre DD, label. A population without a qualified member has no primary.
- **Nominating populations:** **D, G, C, J, S** (each arm's independent procedure; every cutoff). Report-only secondary
  procedures (never nominating): **D-A**, **G-P / G-U, J-P / J-U, S-P / S-U** (protected vs unrestricted Growth).
- **Roles per population** (selection families): actual-profit; robust-profit = highest selection robust; balanced =
  highest selection robust ÷ selection p90 DD; lower-drawdown = lowest selection p90 DD with robust ≥ 50 % of the
  actual-profit holder's. Pareto set on centre net, centre DD, selection p10, selection p90 DD (reported).
- **RA1** (AD4): report-only, on the identical populations; the NL0-versus-RA1 comparison is a labelled diagnostic.
- Each arm's selection is sealed and committed before the next arm's first stage; the cutoff's selection of every arm is
  sealed and **committed before the next door opens**.

## 11. Chronology and the consequence

### 11.1 Fold slices (C19, C21, C23)

After a fold's selection is committed, one official job on the next door evaluates every subject (each population's primary
and roles, the external controls): the detailed centre and the centre with the cutoff as boundary (slice P&L, reset slice
DD, whole-run figures), the 8 stresses, the training selection family (2 × 128, regenerated exactly) replayed on the slice
(standard §5.9), and the session-close series (16-boundary evaluations at every session of the slice). All causal state and
open positions are carried across the boundary; nothing is retuned.

### 11.2 Sequential paths and the verdicts

Each independent arm's procedure chains its three fold primaries over 2020–2021, 2022–2023 and 2024 (Priority 5's `chain`:
each slice the primary's own continuous run; 5 bps of $100,000 per open lot closed or adopted at a switch; a fold without a
primary is flat; the sequential drawdown over every exactly observed GPU mark). **Verdict:** *supported* iff every fold
produced a primary, the sequential net > 0 and the sequential drawdown ≤ $35,000; otherwise *unsupported* or *incomplete*.
The five arm procedures are each an **independent** chronological test of that arm's complete search-and-selection
procedure; sub-populations report-only; roles and the external controls descriptive. Both the reset-slice and the
whole-run drawdowns are reported.

### 11.3 Consequence (standard §1.8, default adopted)

A failed or uncomputable independent verdict means **"no chronological support: the selection is not a
deployment-qualified candidate without an explicit user decision"** (brief Phase 5F: "development-qualified only, not
independently deployment-qualified"). Governance only: never a fitness term, ranking input, objective weight or gate. "No
qualifying candidate" is a valid outcome.

## 12. Finalists, identity and the determination (AD8, DP1; `outcome.ts`; frozen before any search)

### 12.1 Finalists and identity

- **Finalists (C24):** every nominating population's primary (D, G, C, J, S) and its robust-profit, balanced and
  lower-drawdown role holders. **Identity = (arm, id)** (`id` = the configuration's canonical identity), written
  immutably into `FROZEN_SELECTION.json` before FULL opens; labels are display or governance text, never identity.
- **The identity join (brief Phase 0 "Outcome identity and report correctness").** The validation evaluates each subject
  (one configuration of one arm) once; the outcome joins every finalist to **exactly one** `selected` row by (arm, id)
  through `src/research-outcome/identityJoin.ts` `joinByIdentity`. It **fails closed** (an explicit error, no outcome
  written) on a missing, duplicate, cross-arm, malformed (V1–V3 not booleans, no label, no `kind`) or conflicting
  (candidate label) record. Control rows never match a finalist. There is no `validation: null` path. Known defect
  prevented: P6-TSLA's outcome joined by a mutable label that its governance step overwrote, so every finalist silently
  became `validation: null` (`research/tsla-d1-growth/AMENDMENTS.md` D1). Prevention tests:
  `src/msft-d1-growth/tests/outcome.test.ts` (join, relabel and reorder invariance, every failure mode, the TSLA
  regression) and `src/research-outcome/tests/identityJoin.test.ts`; after the outcome an **independent reconciler**
  (`tools/msft-d1-growth/reconcile.py`, Python, sharing no code) re-joins the sealed records and runs deliberately forged
  and misaligned mutations (§17).

### 12.2 Evidence sufficiency (DP1; computed from the sealed C24 evidence, no evaluation)

On the C24 development centre (door D24, 2016-01-04 → 2024-12-31):
- **ES1 trades:** ≥ **10** funded lots; for C, J and S also ≥ **3** funded lots of **each** family (D1·MSFT, Growth·MSFT).
- **ES2 independence:** ≥ **5** independent pool-level episodes (a new episode starts more than 10 sessions after the
  latest exit; `src/vg-d1-growth-joint/evaluate.ts` `episodesOf`) **and** funded entries in ≥ **4** distinct calendar years.
- **ES3 concentration:** the largest winning episode's share of the development net ≤ **50 %** (undefined when the net ≤ 0
  → fails).

The thresholds are general evidence requirements fixed before any MSFT search: 10 lots is the smallest sample on which a win
rate and a loss distribution mean anything; 5 independent episodes in ≥ 4 of the 9 development years means the result does
not rest on one market phase; ≤ 50 % keeps a single enormous winner from carrying the result (brief Phase 5B). They are not
lowered for MSFT's lower volatility or scarcer dips (brief Phase 3 item 7) and never enter the search, Q1–Q6, ranking or
selection.

### 12.3 The determination and the architecture comparisons

- **A finalist X is an MSFT RESEARCH CANDIDATE FOR THE USER'S REVIEW iff** (a) X passes Q1–Q6 at C24; (b) X is the primary
  of an arm whose independent verdict (§11.2) is *supported*; (c) V1–V3 pass on FULL (validation P&L > 0; reset validation
  DD ≤ $35,000; whole-run DD ≤ $35,000); (d) X meets ES1–ES3. A primary meeting (a) and (c) but not (b) is labelled
  "development-qualified, no chronological support: not a deployment-qualified candidate without an explicit user
  decision" (with (d) shown); one meeting (a), (b), (c) but not (d) "chronologically supported and validated, insufficient
  evidence: not a research candidate". (a), (b), (d) are sealed before FULL; the validation adds (c) only.
- **Architecture comparisons** (C24 development evidence, same instrument and draws): for each combined arm K ∈ {C, J, S}
  against the better standalone primary B (D or G, higher centre net), and J against S both ways: K's primary is a
  **material improvement** iff both are qualified and — **type P**: centre net ≥ B + $10,000, confirmation robust net ≥
  B + $5,000, centre DD ≤ B + $2,500 and confirmation p90 DD ≤ B + $2,500; or **type R**: confirmation p90 DD ≤ B − $2,500,
  centre DD ≤ B + $2,500, centre net ≥ B − $2,500 and confirmation robust ≥ B − $2,500 — and **replicated**: qualified
  members of K from ≥ 2 replicate numbers meet the same type (C: not applicable). **Binding chronological consequence:** an
  architecture's development improvement is reported as a material development difference only; it is a method claim only
  if the arm's own chronological verdict is supported (standard §3.4: never from a single favourable historical pair).
  The valid conclusion that combination or joint optimization adds no value is reported as such.
- **Outcome label (sealed after the validation):** *MSFT RESEARCH CANDIDATE(S) FOR THE USER'S REVIEW* (research nomination
  only) or *NO QUALIFYING MSFT CANDIDATE* (with the development-only and the insufficient-evidence ones listed).

## 13. Engineering gates and the pilot (sealed in `results/engineering/gates.json` before the freeze)

| Gate | Evidence |
|---|---|
| E1 | `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 9ebb33ce…` VERIFIED; the entrypoint audit clean (`src/msft-d1-growth` is an official entrypoint through `src/gpu-backend/official.ts`); no file of the evaluation manifest, the pinned enforcement group or the job module changed (no acceptance renewal) |
| E2 | the MSFT doors: each door = the canonical partition load with the central ledger, session by session and bar by bar; prefix causality across doors; no split (no ledger event, no split-sized raw gap, the adjustment the identity); regular-session semantics (no bar outside the regular minutes, a closing-print proxy on every session, early closes at 13:00); both slots one SymDoor |
| E3 | New L0 and N/original on their OWN data (Priority 3's D24 and FULL known-target doors): GPU = CPU = their sealed development and full-history figures (nonregression of the shared engine; their seals untouched) |
| E4 | CPU/GPU parity of every record field (detailed, compact, envelope) on random configurations of every arm and cell (coarse and fine, S with a frozen D1, C pairs), box-extreme genomes of every cell, and the external controls, under base, every stress, every removal, a boundary and a 16-boundary series, on D19, D21, D23, D24 |
| E5 | determinism: a fixed-seed mini lane set of every arm on D19 (a fixed-seed mini-optimization with the frozen two-tier rule: candidate ordering, shortlists, thresholds) — GPU, GPU gracefully stopped and resumed, GPU process SIGKILLed and resumed, GPU server SIGKILLed (fails closed) and resumed, CPU — identical |
| E6 | identities on the GPU: single-family (J with a book off = D / G), the disabled slot inert, causal data access across doors, accounting |
| E7 | the study's unit tests (incl. the identity join, its failure modes, the TSLA `validation: null` regression and ES1–ES3) and the reused modules' suites |
| E8 | the full `npm test` (0 known failures on `main`), root tsc, eslint of the study (0 errors), the preflight of every study, Strategy Lab's regression (portfolio parity, typecheck, lint, Vitest, scratch build; Playwright e2e reported) with `state/strategy-lab` unchanged |
| E9 | the pilot (§7.7; the frozen schedules for every arm on D21, BENCH seed keys) |

Every official job opens the gate itself (purpose, acceptance, pins, source, job, binary, compat, device, capability coverage
of the risk-envelope pilot domain ⊇ the MSFT domain, smoke, memory, host path, live parity mini-set on the MSFT door) and
writes an attestation; receipts, conservation (CPU-scored = 0) and archive provenance per standard §9.5. Any consequential
CPU/GPU discrepancy stops the study.

## 14. Stage order and commands (exact commands: `RUN_COMMANDS.md`; chain `chains/chain.sh`, fail-fast)

0. Brief, audits, this protocol, `AMENDMENTS.md`, `STANDARD_ADOPTION.json`: committed; code and tests committed; gates
   E1–E9 run; `gates` sealed; `freeze` sealed; committed **before any official evaluation**.
1. Per cutoff C19 → C21 → C23 → C24: arm D (broad → rounds → qualify broad → refine-plan → refine → qualify refine →
   select-arm) → arm G (the same) → pairs → qualify C fixed → select-arm C → arm J (as D) → freeze-d1 → arm S (the same) →
   select (**commit**) → [C19–C23: slice → commit; after C23: sequential → commit] [C24: freeze-selection → commit →
   authorize-full → commit → validate (FULL once) → commit → outcome → commit] → the cutoff's job archives preserved (zstd)
   → commit.
2. Report-only diagnostics (§15, §17), reports, the independent reconciliation, regression, ZIP, commit, push.

## 15. Comparators and distributions (report-only; after the sealed outcome; AD14)

- **Buy-and-hold** (`tools/msft-d1-growth/diagnostics.ts`, purpose `diagnostic`): $100,000 of MSFT at the 2016-01-04 first
  regular-minute open (+5 bps), marked at every regular-minute close of the canonical data (the strategies' strict
  minute tracker) through 2026-10-30: **unfinanced** (own capital, no interest) and **financed** (the $100,000 borrowed at 11 % simple by calendar
  day, interest accrued and charged once, as in the strategies); each **price-only** (the strategies' convention) and **with
  dividends** (cash, and reinvested at the ex-date close; MSFT's dividends from the independent Yahoo series — 2025–2026
  fetched only after the sealed validation). Development, validation (reset) and full windows; maximum marked drawdown on
  the $100,000 denominator; annual returns. Equivalent-exposure disclosure: the buy-and-hold is fully invested every session,
  a strategy only while its lot is open (its occupancy and net per $100,000-year of principal deployed are reported beside
  it); an unfinanced buy-and-hold is never compared with a continuously borrowed strategy without saying so.
- **Dividends inside the overlay:** the dividends each funded lot of every finalist would have been entitled to (shares
  held at the close before each ex-date) and their total, per finalist and window — the trading results are never
  restated.

## 16. Resources, recoverability and handoff

Transient units in `msft9.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0); **one official GPU job at a time**;
`node --no-maglev`; the accepted evaluator's Mode S (8 host workers, batch 8,192, linger 30 ms); every evaluation archived as
it returns (archive `research/msft-d1-growth/cache/jobs/<job>/archive.sqlite`, bound to the study, job, door pin, evaluation
digest and backend); a resumed job passes the whole gate again and replays from its archive (`--resume`); job identities
refuse a different definition; no automatic restart; the chain runs as its own unit and commits each sealed block. Seeds:
`deriveSeed('msft-d1-growth', …labels)`, lane keys as §7.1. Requested vs fresh evaluations, archive hits, runtime, VRAM,
throughput and convergence are recorded per arm. Completed cutoffs' job archives are compressed individually with verified
Zstandard (streaming sha256 of original and restoration, SQLite integrity and row counts on a representative sample, only
after writers stop; restore commands and the manifest `storage/MSFT_JOB_ACTIONS.jsonl`); originals are deleted only after
every check; no unrelated cache is touched. The handoff is a self-contained, checksum-verified ZIP (`bundle/`, brief
Phase 8) with a copy in `~/.local/share/margin-trading-gpu/handoffs/`.

## 17. Report-only analyses (after the validation unless stated; never a selection input)

Search coverage and convergence (per arm, cutoff, cell and replicate; islands and stop reasons by tier; budget-bound and
coverage-limited shares; progress per 10,000 evaluations; cross-seed dispersion); §5.9 exposure for every fold primary and
finalist (open-lot share, largest open lot and its give-back, per-lot MAE, the D1 hold-window tail stress on pre-2016 MSFT
daily data and in-sample, the training neighbourhood on the next slice); tail severity (p95, worst-10 % mean, breach shares,
small 0.5× and wide 1.5× families for the finalists); the stresses (cost, interest, slippage, next-open stops); causal
removals; risk decomposition (marked DD, trade principal loss marked and liquidation, banked-capital DD, giveback with
per-lot attribution — unrealized-profit giveback is never a principal loss); annual and episode results; open-position
exposure, duration and slot occupancy (unrestricted Growth in particular); participation and displacement attribution for
the combined arms (refused decisions by occupant, displaced entries, signal priority); the NL0-versus-RA1 diagnostic; the
external controls; the comparators (§15); the independent outcome reconciliation and its mutation tests. Report-only replays
of frozen subjects may use the non-official GPU path or the CPU reference under purpose `diagnostic`, labelled.

## 18. No-go rules and amendments

A failed engineering gate, any CPU-scored official evaluation, a stale acceptance, a request beyond a bound, a door opened
out of order, a change after the freeze without an amendment, a criterion loosened after an outcome, a recomputed trigger
that disagrees with a lane's decision, or a failed identity join stops the study. `AMENDMENTS.md` is append-only: pre-freeze
`E*` refine the implementation; after the freeze disclosures `D*`, operational `O*` and code `A*` (defect fixes changing no
rule, each with a sealed record of the changed digest). Criteria are never loosened, and no arm, cell, cutoff, replicate,
statistic, margin or threshold is added, removed or changed once a result it governs exists. A failure is a result.
