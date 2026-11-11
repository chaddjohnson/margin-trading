# Protocol — Priority 7A: bounded Growth suitability screening across other ETFs

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
substantive search). Afterwards it is never edited; changes go to `AMENDMENTS.md` (append-only).

**Written before any search, qualification, selection, fold or validation result of this study existed.** Known before
it: the prior studies' sealed records and reports (§2); this study's sealed universe manifest and its amendment R1
(no strategy run); the sealed door and transfer manifests; and the engineering gates and the pilot named in the
amendments (pilot budgets on the pseudo-fold P18, mechanics, timings and memory only).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.0.0`, sha256 `2005a88c2e24f5e2ab4e461b0425f97d006781a45518f78d9f10fd9320f40105` (the registered current version) |
| Read / adopted (UTC, from `date -u`) | read in full 2026-11-11T20:20Z (with the registry, the template, the roadmap, `CLAUDE.md`, `AGENTS.md` and the context-recovery guide) / adopted when `STANDARD_ADOPTION.json` was written (its `adoptedAt`) |
| Adoption manifest | `research/growth-etf-screening/STANDARD_ADOPTION.json` (`npm run research-preflight -- --study research/growth-etf-screening`; every stage, the pilot included, calls `requireStandardAdoption` in code) |
| Scope | `optimization` |
| Brief | `research/growth-etf-screening/brief/BRIEF.md`, sha256 `c86c1a762efe913a858635cbec4a5d14c6380ee44efff588e9a296f9e99a7b01` (the user's Priority 7A brief; read in full through "Do not merge, deploy, add new Strategy Lab presets or start 7B automatically.") |
| Branch / base commit | `research/growth-etf-screening` in the main checkout, from `6f0ccce2` (the pushed end of Priority 6: standard 2.0.0 and every reused runner); code `src/growth-etf-screening/`; `npm run getf -- <command>` from the repository root |

The earlier `ETF_Algorithm_Suitability_Research_Prompt.md` has no copy in the repository or on this host (searched
2026-11-11); it was not read and nothing here depends on it.

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §2.3, §2.5, §3.2 | adaptation | The procedure's primary at every cutoff is the **actual-profit role among every eligible ETF's qualified independent members** (ETF and phenotype together; controls VGT and GDX included on equal terms). A "new-ETF" procedure (controls excluded) is reported beside it. Transfer-lane members are informed hypotheses: never selectable for the primary or the shortlist, reported per ETF. | — (brief "Selection and historical tests" 3; "Screening search") |
| AD2 | §4.1, §4.6, §5.3 | adaptation | Study 8's pipeline scaled to a bounded screen of 60 ETFs × 4 cutoffs under the 2,000,000 ceiling: per ETF per cutoff four lanes (two paired seeds × Rise / breakout), each a 160-centre screen and ONE NSGA-II island of 96 children; rung 1 = 8 draws, rung 2 = 4 × 32 draws per lane; no rung 3, no local refinement; the ETF shortlist (≤ 4) gets a 128-draw selection family and ≤ 3 confirmation picks get 3 × 128 = 384 fresh confirmation draws. Smaller early rungs are screening estimates only. | — (brief "Planning budget"; "reduce … symmetrically with a documented coverage limitation") |
| AD3 | §5.3 | adaptation | One perturbation scope (the book is the whole account) with common random numbers across every member **and every ETF** of a cutoff (the matched instrument). | — |
| AD4 | §4.1, §5.3 | adaptation | Centre-first fidelity: a rung-1 centre that is not plausible (net ≤ 0, centre DD > $35,000 or no lot) gets no neighbours and is infeasible; rung 2, selection and confirmation evaluate every neighbour. | — |
| AD5 | §5.1 | adaptation | Priority 3's pooled engine is reused **unchanged** (4A's path) with only its Growth slot enabled and the ETF's own door in that slot; gates E1–E8 (§12) re-verify it trade by trade against the canonical `runRiseTrading` + `summarizeSimulation` run with the true symbol on every eligible ETF. | — |
| AD6 | §1.4, §1.6 | adaptation (stricter) | FULL is never opened before `FROZEN_SELECTION.json` is sealed and committed, not even for the known native full-history targets of the transfer vectors. | — (brief "Reproduce known full-history targets only at the final authorized validation stage") |
| AD7 | §4.5 | adaptation | No extension: every ETF receives exactly 1,024 new distinct centre proposals at every cutoff (the brief's optional extension to 2,048 is not used, so the 2,000,000 ceiling holds the whole universe, the transfer lane and the reserve). Stopping condition: **base budget exhausted** — never convergence. | — (brief "Up to 2,048 … under a frozen extension rule") |
| AD8 | §1.8, §1.9, §3.3 | adaptation | The transfer lane runs at C24 only (its vectors carry later data); every earlier cutoff repeats the complete independent screen and selection of the whole eligible universe with the same budgets. | — (brief "never enter a historical cutoff as later-informed seeds") |
| AD9 | §4.7, §2.7, §2.9 | adaptation | Not applicable: each configuration is one Growth book alone (no capital competitor). | — |
| AD10 | §2.4, §4.3 | adaptation | Promotion guard: the screen promotion and every rung-2 promotion reserve ¼ for centre net; the lane picks and the ETF shortlist keep a profit slot; the confirmation picks start with the highest centre net. | — |
| AD11 | §1.8, §2.5 | adaptation | The study-specific **ETF-shortlisting rule** and futility rule (§9.5), frozen here, use development results only (C24 qualification and the ETF's own C19–C23 procedure on 2020–2024). | — (brief "Selection and historical tests" 2) |
| AD12 | §1.3, §0.3 | adaptation | The universe rules (§3.1) are Study 9's D1–D5 plus D3b (amendment R1, before any performance screening). | — (brief "Universe and data audit") |
| DP1 | §4.4 | **departure** | No incumbent-informed **refinement** lane: the informed lane is the brief's exact transfer lane (the same predeclared exact vectors on every ETF, unchanged). VGT's and GDX's incumbent refinements were done by growth140 and 4A; a refinement around transfers on 60 ETFs is outside a bounded screening. | brief "Screening search": "A small, separately counted informed transfer lane at C24, using the same predeclared set of exact existing Growth vectors for every ETF"; "This is screening, not an exhaustive optimization." |

## 1. Question, objective and outcomes

- **Question** (brief). Which additional ETFs offer credible Growth candidates under the same accounting and risk
  budget, with evidence beyond one fortunate historical episode — and do any deserve a separate focused Growth
  optimization (7B)?
- **Objective.** Actual net profit (realized + marked unrealized, after costs and interest) of one standalone Growth
  book on one ETF and one fixed **$100,000** principal budget, assessed beside neighbourhood risk and chronological
  evidence; the maximum minute drawdown ceiling is **$35,000** (35% of the fixed principal, not of peak equity).
  Historical compliance does not guarantee future drawdown. Every ETF simulation is an alternative use of the same
  budget; results are never summed across ETFs.
- **Primary-selection rule** (AD1): at each cutoff the highest development centre net among the qualified independent
  members of all eligible ETFs; ties by the higher selection robust net, the lower centre DD, then the label (Priority
  3's `profitOrder`). **Roles** (§9.3): actual-profit, robust-profit, balanced, lower-drawdown, per ETF and across the
  universe, ranked on the selection family; the fresh confirmation draws decide qualification only.
- **Pareto set:** centre net ↑, centre DD ↓, selection p10 net ↑, selection p90 DD ↓ (qualified members).
- **Valid outcomes:** a shortlist of 1–3 new ETFs; **no demonstrated opportunity** (an empty shortlist); a futility
  stop (no qualified member anywhere); a chronologically unsupported procedure; shortlisted ETFs that fail validation.
  A negative result is a result; no finalist is manufactured.

## 2. Prior knowledge and provenance

- **Already examined** (2016-01-04 → 2026-10-30): every eligible ETF by D1 studies (Study 9, d1-robust-pool-discovery,
  d1-standalone-etf-opportunity-audit, d1-all61; `UNIVERSE_MANIFEST.json` lists each symbol's prior exposure); Growth
  only on VGT (growth140, Priorities 2–3B, 5A, 5B, Strategy Lab) and GDX (Priorities 3–4A, 5B), plus engine checks on
  XBI. **2025–2026 is therefore validation on previously examined history, not an untouched holdout**, for every ETF.
- **The transfer vectors** (`TRANSFER_MANIFEST.json`, sealed before any evaluation; read from their sealed sources by
  path, JSON pointer, sha256 and identity): T1 VGT #4 `420cd989e4fa7749` (browser-selected with 2016–2026 in view); T2
  VGT `08500a60ec56cfae` (growth140); T3 C4-refined's VGT book `c3c1c0d56c4ee3b0` (3B); T4 the 5B L0 primary's VGT book
  `6b5f909b30cfa516`; T5–T9 4A's frozen GDX export set: the primary `8931194df7e7030d`, informed#2 `73b989f585758ccb`,
  P08 `97c5f01b151f7e1c`, P09 `64f0d3125db3228e`, Appendix A `07cac3329fc7a520` (browser-selected). All are
  **informed**; none ever enters an independent lane. Their known standalone results on their native symbol (5A, 4A,
  growth140; development and full history) are listed in the manifest; T3 and T4 have no sealed standalone record.
- **Known before this protocol from this study:** the universe and data audit (no performance), the engineering gates
  (E2 reproduces the known development centres of T1, T2, T5–T9 on their native symbols), and the pilot (P18, pilot
  budgets; mechanics only — its outcomes are never read for any choice).
- The universe is the repository's present inventory: survivorship and availability bias; the canonical boxes and the
  design were written with earlier studies in view; fresh seeds are not fresh data.

## 3. Universe, data, doors and windows

### 3.1 The universe (`UNIVERSE_MANIFEST.json` `d6267bcb…89a9`; R1 `results/universe/R1-corporate-action-discontinuities.json` `f9deab14…2a87`)

- **Inventory:** 64 data directories with canonical files (BTCUSDT and non-symbol directories excluded); identical to
  the brief's list. All 64 files are byte-identical to the files Study 9 S0 audited.
- **Rules** (frozen; no performance used): D1 history (first regular bar 2016-01-04 and a regular bar on every NYSE
  session through 2026-10-30, timestamps only); D2 integrity (verified, sha256 = report = Study 9); D3 no unexplained
  split-sized (≥ 30%) move (Study 9 whole file; re-checked on split-adjusted 2016–2024 sessions); D4 structure (no
  leveraged, inverse, volatility, single-commodity-futures or ETN product); D5 development median daily dollar volume
  ≥ $10M and median minute coverage ≥ 25% (marks adequate for minute DD); D3b (R1) no unadjusted corporate-action
  discontinuity ≥ 15% overnight in development.
- **Eligible: 60 ETFs** (VGT and GDX are controls, not discoveries). **Untested:** GDXJ and OIH (files start
  2016-05-02), XLRE (missing 2016-01-25 and 2016-02-16), XLF (R1: the 2016-09-19 XLRE special distribution, −18.1%, not
  represented in the price-only convention).
- **Labels** (Study 9; descriptive, never exclusions): sparse — EDV, IGV, IYT, KIE, QUAL, VOOG, VPU (and MTUM's 225 thin
  2016–2017 sessions); thin — DBC, ILF. A shortlisted sparse or thin ETF carries the label in every table.
- **Exposure clusters** (Study 9's predeclared clusters; the shortlist allows one new ETF per cluster) and close
  substitutes (`universe.ts` `substitutes`) are listed in the manifest. Correlated funds are never independent
  confirmations of each other.

### 3.2 Doors and windows

- **Canonical files:** `data/<SYMBOL>/data.csv`, sha256 per symbol in the universe manifest (raw SIP minute bars;
  extended hours present but only regular-session bars are traded or marked).
- **Price convention:** the canonical partition loader's — forward split adjustment from `config/market-events/splits.json`
  (sha256 pinned in `results/doors/DOORS.json`; later prices × ratio), applied identically to the byte-prefix doors
  (whose explicit-file loader does not adjust) and verified against the canonical training partition (E7). Eleven
  eligible ETFs split inside development (EWJ 2016, IJR 2017, KIE 2017, IBB 2017, XOP 2020, IAU 2021, SMH 2023, IJH
  2024, IGV 2024, IYT 2024; OIH is untested); seven inside validation (XLB, XLE, XLK, XLU, XLY 2025-12-05; VGT, VOOG
  2026-04-21; IWF 2026-04-29). **Price only:** no dividend, distribution or special distribution is credited; a
  position held across an ex-date takes the price drop. Bond and high-distribution funds are therefore understated
  relative to total return, and the 11% financing is charged on all of them alike; nothing is changed to favour a
  category.
- **Doors:** per ETF, physical byte prefixes D19 (→ 2019-12-31, 1,006 sessions), D21 (→ 2021-12-31, 1,511), D23
  (→ 2023-12-29, 2,012), D24 (→ 2024-12-31, 2,264), pinned (bytes, rows, sha256, last row) in the sealed
  `results/doors/DOORS.json` `eee86341…efab` and verified at every opening; FULL (2016-01-04 → 2026-10-30, 2,723
  sessions, partition `all`) only behind this study's sealed and committed `FROZEN_SELECTION.json`. Every opening is
  logged in `results/doors.jsonl`. The development calendars of all 60 ETFs are identical session by session.
- **Common complete endpoint: 2026-10-30** (every eligible file has a regular bar on every NYSE session through it,
  verified from timestamps only). November–December 2026 do not exist and are never implied.
- **Windows:** development 2016-01-04 → 2024-12-31 (every search, ETF choice and selection); validation 2025-01-02 →
  2026-10-30 (459 sessions); earlier cutoffs C19, C21, C23 (§10).
- **Continuity:** every run is one continuous causal run from 2016-01-04 with warm-up 0 (the files' first session);
  nothing is liquidated or reset at a boundary. Validation P&L = the marked net at 2026-10-30 − the marked net at the
  2024-12-31 close; the reset validation DD and the whole-run DD are both reported.

## 4. Controls, incumbents and comparison lanes

- **Controls:** VGT and GDX go through the identical independent screen (equal opportunity), are selectable by the
  universe procedure on equal terms, and are never counted as new discoveries or shortlisted.
- **Native reproduction** (exact incumbents, §3.1 of the standard): development (E2, before the freeze) — T1 on VGT
  $92,575.71 / DD $14,578.10 / 11 lots; T2 on VGT $115,509.15 / $19,344.80 / 7; T5 on GDX $139,668.45 / $17,483.62 /
  11; T6 $110,158.59 / $18,840.58 / 16; T7 $121,008.75 / $18,840.58 / 11; T8 $100,056.17 / $17,744.39 / 15; T9
  (Appendix A) $53,816.50 / $17,709.96 / 13. Full history only in the frozen validation: T1 $145,468.46 / $14,578.10 /
  13 lots, validation $52,892.75; T2 $160,974.09 / $19,344.80, validation $45,464.93; T5 $139,668.45, validation
  $0.00; T6 $149,645.63 / 20 lots, validation $39,487.05; T7 $121,008.75, $0.00; T8 $100,056.17, $0.00; T9
  $141,157.37 / $17,709.96 / 19 lots, validation $87,340.87 (the sealed sources are in `TRANSFER_MANIFEST.json`).
- **The transfer lane** (informed; C24 only): the nine vectors unchanged on every eligible ETF (§7.2). Its question:
  whether ETF-specific optimization finds something the fixed VGT/GDX phenotypes miss (brief question 2). A weak
  transfer never eliminates an ETF.
- **Method arms:** not applicable (no pooling). The independent and transfer lanes are separately budgeted and
  labelled; no method-superiority claim is made.

## 5. Engine and conventions

- **Engine:** Priority 3's pooled engine, unchanged (`src/vg-d1-growth-joint/evaluate.ts`, `pool.ts`, `books.ts`;
  sealed evaluation digest `147cad7c…4e88`), with only the Growth slot enabled (D1·GDX, D1·VGT and Growth·VGT disabled,
  Priority 3's placeholders, never run or funded) and the ETF's door in that slot. Growth 1.4.0's `runRiseTrading` body
  on the door's Dataset and daily signal bars through the Strategy Lab request mapping; a single book is never refused,
  so the pooled run is the canonical standalone run (E3 on every ETF). The slot key (`GDX`) is a label of the reused
  engine; every record carries the true symbol.
- **Economics:** one fixed $100,000 principal, no compounding; 5 bps per executed side; $0 commission; 11% simple annual
  interest on outstanding principal by calendar day (365-day year); stops at the stop or the gapped open; fractional
  shares; price only. Canonical sizing, partial exits (retention), repayments, reservations, eligibility,
  continuation, stops, warm-up and session units as the engine defines them.
- **Signal resolution and marks:** daily signal bars (1d); minute-based execution; the maximum minute DD from a strict
  tracker at every regular-session minute close while a lot is held and at every session close.
- **Funding lifecycle:** L0 (the current virtual book); irrelevant for one book except in the causal no-new-funding
  rerun (§11.1), where decisions inside the window are refused and the book's virtual state continues.

## 6. Space (`space.ts`)

- **Genes and boxes:** growth140's 8 structural genes (entry Rise | breakout; trend filter off | 5 methods; eligibility
  (Rise only) off | 5 policies; drawdown-recovery gate off | on; exits: losing hold OFF | ON | ON with loss buffer;
  initial stop off | on; retention off | on; continuation off | 4 methods; the trailing stop mandatory) and 50
  conditional numeric genes on growth140's canonical boxes (`src/growth140-vgt-s8m/space.ts`), at the schema's fine
  step — **identical for every ETF**, never narrowed around any winner or any ETF. Every transfer vector is exactly
  representable (checked when the transfer manifest was sealed).
- **Dependencies:** eligibility needs Rise; the loss buffer needs the maximum hold; method inputs are active only under
  their method; momentum S < L is repaired; inactive inputs are absent from the effective vector.
- **Identity:** growth140's `configId` of the canonical effective vector (the browser identity); the symbol belongs to
  the evaluation key (the door), never to the identity. **Behavioural equivalence:** the funded-lot ledger signature;
  promotions, picks and shortlists keep one configuration per ledger and never one with cash's empty ledger.
- **Protected cells and strata:** two entry cells (rise, breakout) per seed with equal budgets; the screen round-robins
  4A's strata — recovery gate × trend filter × (Rise) eligibility × losing hold × initial stop × retention: 64 Rise and
  32 breakout strata — so every gate, eligibility and exit structure is screened on every ETF at every cutoff.
- **§4.7:** not applicable (AD9).

## 7. Search, budget and stopping (`search.ts`, `budgets.ts`, `stages.ts`)

### 7.1 The independent screen (every eligible ETF at C19, C21, C23 and C24)

One **lane** = ETF × cutoff × paired seed (A | B) × entry cell (rise | breakout), key `C<yy>/<SYM>/<A|B>-<entry>`:

1. **Screen:** 160 centres from a Latin-supercube scrambled Sobol design of the 58 genes (this study's seeds: labels
   ('screen', lane key)), entry pinned, strata round-robin; invalid and duplicate draws dropped and counted.
2. **Promotion** of the initial population (16): ¼ by centre net among the plausible (net > 0, centre DD ≤ $35,000,
   ≥ 1 lot), ¼ by constrained rank on (−net, DD), the rest max-min L∞ diversity (plausible first); one per ledger, never
   cash's. **Rung 1** (8 draws, centre-first) for them.
3. **One NSGA-II island** (population 16, 96 new distinct children; 4A's operators: binary crowded tournaments on
   (−centre net, −robust net, rung-1 p90 DD) with constraint domination; uniform crossover of the categorical genes
   (p 0.9), SBX (η 15) and polynomial mutation (η 20) on grid indices of the active inputs, random reset of a
   categorical gene with probability 1 / 7; entry pinned; (μ + λ) survivors); every child fitted at rung 1
   (centre-first). Stops on its proposal budget.
4. **Rung 2:** 4 promoted from the lane's rung-1 archive (¼ centre net among feasible, ¼ robust net among feasible, the
   rest constrained rank; L∞ ≥ 0.02; one per ledger), 32 draws each, every neighbour evaluated.
5. **The lane's picks:** among feasible rung-2 fits (centre net > 0, centre DD ≤ $35,000, rung-2 p90 DD ≤ $35,000,
   funded), one per ledger, L∞ ≥ 0.10: profit (the highest centre net), robust (the highest rung-2 robust net).

**The ETF shortlist** (≤ 4, from the four lanes' picks; one per ledger, L∞ ≥ 0.10): profit (highest rung-2 centre net),
robust (highest rung-2 robust net), balanced (rung-2 robust ÷ p90), seed-alternative (when only one seed is represented,
the other seed's highest-centre-net pick that is distinct), then centre-net order. It is sealed in the search record before any selection or
confirmation draw is evaluated.

### 7.2 The transfer lane (C24 only; `transfer.ts`)

Per ETF on its D24 door: the nine vectors' centres; the 128-draw selection family for the ≤ 3 plausible transfers
with the highest centre net; confirmation (384), stresses and toggles for ≤ 2 confirmation picks (§9.1 rule). Its own
roles are reported per ETF.

### 7.3 Budgets (frozen)

| Lane | New distinct centre proposals | Neighbours | Cap |
|---|---:|---|---|
| Independent, per ETF per cutoff | **1,024** (4 lanes × (160 screen + 96 island)); no extension | rung 1: 8 per plausible centre; rung 2: 4 × 32 per lane; selection 128 × ≤ 4; confirmation 384 × ≤ 3 | **6,821** fresh simulations per ETF × cutoff job (its exact worst case; the job fails beyond it) |
| Independent, the study | **245,760** (60 ETFs × 4 cutoffs × 1,024) | — | 1,637,040 worst case |
| Transfer, C24 | **540** centres (9 × 60) | selection 128 × ≤ 3; confirmation 384 × ≤ 2 per ETF | 1,186 per ETF; 71,160 worst case |
| Reserve | — | folds, sequential, diagnostics (small / wide, episode reruns), validation | 60,000 |

- **The hard ceiling: 2,000,000 fresh backend simulations** in all — the pilot, the bench, the parity and every study
  stage — with archive hits counted apart. The plan check (`npm run getf -- plan`) refuses the freeze unless the
  ledger plus every remaining worst case fits; every job refuses to start unless its worst case still fits (the
  resource guard; never a silent overrun, and never by abandoning later ETFs: the worst cases are reserved up front).
- **Counted separately:** screen centres; rung-1 and rung-2 centres and neighbours; the island; selection;
  confirmation; stresses and toggles; transfer centres; fold, sequential, diagnostic and validation runs; archive hits;
  worker compute time — per ETF, lane and cutoff (`results/budget-ledger.jsonl`; the archive audit).
- **Coverage limitation (stated):** compared with 4A's 16,384 proposals per cutoff on GDX alone, this is a 16× smaller
  per-ETF search; rung fidelities (8 / 32) are screening estimates; no refinement. A weak ETF result means "no
  promising result under this budget", not that Growth cannot work on it.

### 7.4 Stopping (frozen)

Every lane stops when its proposal budget is spent ("budget", or "no new configurations" / "generations" if the island
cannot propose), every job when its stages are complete, "resource guard" or "user stop" if they occur. **Budget
exhausted is not convergence.** Nothing is re-searched after a fold, a selection or the validation; no automatic second
campaign.

## 8. Robustness instrument (`space.ts` `rowsOf`, `qualify.ts`)

- **Radius:** 10% of each box in value units, rounded to the fine step (growth140's), per active numeric input.
- **Draws:** one Latin hypercube of n rows over the 50 numeric columns per seed family, common random numbers across
  every member and every ETF of a cutoff; a row moves every active input by u × scale × radius, rounded, clipped to the
  box widened to include the centre (clipping counted per draw). Categorical inputs fixed (toggles are report-only);
  inactive inputs untouched; orders repaired; rows equal to the centre or to an earlier row are dropped from the
  statistics.

| Family | Labels (`deriveSeed('growth-etf-screening', 'nbhd', …)`) | n | Scale | Use |
|---|---|---:|---:|---|
| rung 1 | ('r1', cutoff) | 8 | 1 | search (centre-first) |
| rung 2 | ('r2', cutoff) | 32 | 1 | search |
| selection | ('select', cutoff) | 128 | 1 | **ranking, confirmation picks and roles** |
| confirmation (fresh) | ('confirm', rep, cutoff), rep 1–3 | 3 × 128 = 384 | 1 | **qualification only** |
| small, wide | ('small', cutoff), ('wide', cutoff) | 128 each | 0.5, 1.5 | report (C24 diagnostics) |

No label of this namespace was used before. The confirmation draws never enter a ranking, promotion, pick or search
decision and are never resampled.

**Statistics:** median, p10, p90 of net; robust net = ½ median + ½ p10; median and p90 DD (linear interpolation); breach
count and share (DD > $35,000), mean excess, worst DD; report-only tail severity (standard §5.8): p95 DD, worst-10% mean
DD (⌈0.1 n⌉ largest), the breach share's Wilson 95% interval, the distinct ledgers behind the breaches, the p90's 95%
order-statistic interval, the small and wide families; distinct ledgers, draws equal to the centre and clipped draws.
Breach frequencies are perturbation frequencies on one history, not probabilities of future losses.

## 9. Qualification, roles, the primary and the ETF shortlist

### 9.1 Evidence and confirmation picks (every ETF × cutoff, its training door only)

The centre and the selection family for every shortlist member. **Confirmation picks** (≤ 3, ranking families only):
among members passing Q1, Q2, selection p90 DD ≤ $35,000 and selection p10 > 0 — the highest centre net, the highest
selection robust net, the highest selection robust ÷ selection p90 DD; if none passes on the selection family, the
plausible member with the highest centre net (one attempt). Picks get confirmation, **stresses** (10 and 20 bps per
side, 14% interest, +25 bps stop slippage, next-open stop fills — books with the initial stop or retention keep
stop-level fills, recorded) and **toggles** (every enabled optional rule OFF; report).

### 9.2 Gates (all must hold; fixed before any candidate result)

| Gate | Requirement |
|---|---|
| Q1 | centre net > 0 |
| Q2 | centre maximum minute DD ≤ $35,000 |
| Q3 | fresh confirmation p90 DD ≤ $35,000 (the interpolated 0.9 quantile of the pooled 384 draws) |
| Q4 | fresh confirmation p10 net > 0 |
| Q5 | at 10 bps per side: centre net > 0 and centre DD ≤ $35,000 |

A member that was not a confirmation pick is "not confirmed" (never qualified). No activity floor, annual-profit floor,
largest-winner or concentration cap, equal-profit rule, breach-rate veto or tail-severity gate; beating a control or a
buy-and-hold reference is never a gate. Near misses (failing only Q3, Q4 or Q5) are tabled with their severity.

### 9.3 Sets, roles and the primaries (ranked on the selection family)

- **Per ETF** (independent members): actual-profit = the highest centre net (ties: selection robust net, lower centre
  DD, label); robust-profit = the highest selection robust net; balanced = the highest selection robust ÷ selection
  p90 DD; lower-drawdown = the lowest selection p90 DD among those with selection robust ≥ 50% of the actual-profit
  holder's. The ETF's actual-profit holder is its **fold primary**.
- **Universe** (every eligible ETF's independent members; AD1): the same roles; the **procedure's primary** is its
  actual-profit holder (ETF and phenotype); no qualified member anywhere → no primary (cash).
- **New ETFs** (controls excluded): the same roles (report-only procedure).
- **Transfer lane** (C24): the same roles per ETF (informed; reported, never selectable).

### 9.4 Episode, sparsity and evidence reporting (report-only)

For every ETF × cutoff record: lots, wins/losses, independent episodes (a new episode when an entry is > 10 sessions
after the latest exit) and the largest winning episode's share of net. For the C24 subjects (§11.1) the standard's
causal episode stress and the neighbour episode reproduction. Sparse profitable systems stay eligible and are labelled
sparse. Local parameter stability is never presented as stability across market regimes.

### 9.5 The ETF shortlist and futility (frozen; `final.ts`)

- **Tier 1:** a non-control ETF with ≥ 1 qualified C24 independent member **and** a SUPPORTED own procedure (§10: its
  C19, C21 and C23 fold primaries over 2020–2024 — every fold produced a primary, sequential net > 0, sequential minute
  DD ≤ $35,000). **Tier 2:** a non-control ETF with ≥ 1 qualified C24 independent member whose own procedure is
  unsupported.
- **Order** (both tiers): rank(P) + rank(R) among all such ETFs, P = the C24 actual-profit holder's centre net, R = the
  C24 robust-profit holder's selection robust net (1 = highest); ties by P, then the symbol.
- **The shortlist:** Tier 1 in that order, at most one ETF per exposure cluster, at most **three**; a Tier-1 ETF
  skipped for its cluster is reported as a close substitute. **Near misses** (≤ 3): the remaining Tier-1 ETFs, then
  Tier 2, in order. **No Tier-1 ETF → no shortlist** ("no demonstrated opportunity"); nothing is forced.
- **Futility:** if no member of any ETF qualifies at C24 (independent or transfer), the study stops without validation.
- Correlated finalists are described explicitly (cluster, substitutes, overlapping episodes).

## 10. Chronological procedure tests (independent lane)

| Cutoff | Training door (screen, qualification, selection of the whole universe) | Sealed and committed before | Evaluation slice (door) |
|---|---|---|---|
| C19 | D19 (2016–2019) | its slice opens | 2020-01-02 → 2021-12-31 (D21) |
| C21 | D21 (2016–2021) | its slice opens | 2022-01-03 → 2023-12-29 (D23) |
| C23 | D23 (2016–2023) | its slice opens | 2024-01-02 → 2024-12-31 (D24) |
| C24 | D24 (2016–2024) | the validation | 2025-01-02 → 2026-10-30 (FULL, once) |

- The **complete eligible-universe screen and selection** at every cutoff, same budgets, fresh labels per cutoff; an
  earlier cutoff never runs after a later cutoff's selection exists (guard in code). C24's winners are never chosen
  first.
- **Fold members:** every ETF's qualified role holders (its fold primary among them) — the post-fold cohort; one
  continuous run per member on the evaluation door; slice P&L and the slice (reset) DD.
- **Sequential policies:** the universe procedure (each cutoff's primary: ETF and phenotype); the new-ETF procedure
  (report-only); every ETF's own procedure (its fold primaries; ETF-specific evidence). Each slice contributes its
  member's own continuous marks after the boundary close (a carried position is the incoming member's real exposure,
  never a reset); a switch between different configurations (ETF or vector) at a boundary is charged 5 bps on
  $100,000 per open lot the outgoing member holds at its slice end and per open lot the incoming member holds at the
  boundary (from cash too); no primary → cash (an outgoing lot is closed and charged). The sequential DD is the strict
  minute tracker over the concatenated marks (charges included), with peak, trough, recovery and the positions
  responsible. Slice profits are never summed from incompatible initial states; reset equity curves are never spliced.
- **The verdict (frozen, per policy):** SUPPORTED iff every fold produced a primary, the sequential net > 0 and the
  sequential minute DD ≤ $35,000; otherwise UNSUPPORTED (reported even if the final candidate looks good). The
  procedure's sequential DD is never attributed to a final phenotype.

## 11. Diagnostics, the frozen selection and the one-time validation

### 11.1 Diagnostics (development D24; report-only; sealed before the frozen selection)

**Subjects:** the universe role holders; every shortlisted ETF's role holders and its best qualified transfer; every
near miss's actual-profit holder; VGT's and GDX's C24 actual-profit holders. For each: the funded-lot ledger and
episodes; results by development subperiod (2016–2019, 2020–2021, 2022–2023, 2024); exposure, time under water and its
longest run; the **largest winning episode** (net, share) and its **causal no-new-funding rerun** (every decision
inside the episode window refused; the virtual state continues) beside the arithmetic subtraction; the **neighbour
episode reproduction** (the 128 selection draws rerun in detail: the share whose leading winning episode overlaps the
centre's, labelled "single-episode stability" at ≥ 0.8; the median share of a positive neighbour's net inside the
centre's window; clipped draws — the process audit's proposals 2 and 4, report-only); the small and wide families; the
**overlap** of its held days with VGT Growth #4's and 08500a60's standalone held days and with the busy days (any lot;
Growth lots) of the frozen development ledgers of the 5B L0 primary, C4-refined and C4 (a hypothesis about
complementarity, not a pooled result). **Buy-and-hold references** for every eligible ETF (report-only, never a gate):
$100,000 bought at the first session's opening trade after 5 bps and held, marked every minute; *financed* (11% simple
interest on $100,000, the Growth book's financing) and *unlevered* (labelled separately).

### 11.2 The frozen selection (sealed and committed before FULL opens)

The shortlist, substitutes, near misses and the full order; the universe and new-ETF roles and procedures; every
member's complete effective configuration; the native reproduction set; the **7B export** (each shortlisted ETF's role
holders and its best qualified transfer, labelled informed); the code and data pins; the validation plan below.

### 11.3 Validation (FULL, once, under the guard)

Every frozen member and every transfer vector on its native symbol: one continuous run 2016-01-04 → 2026-10-30 per ETF
(forward split adjustment). Reported: validation P&L with realized/open parts, 2025 and 2026, the reset validation DD,
the whole-run DD with its dates, lots after the boundary, carried positions, open remainders. **V1** validation P&L
> 0; **V2** reset validation DD ≤ $35,000; **V3** whole-run DD ≤ $35,000. **Report-only:** 10 / 20 bps and 14% interest
on FULL; the validation-window neighbourhood (the C24 confirmation rep-1 draws, 128) of every shortlisted ETF's
actual-profit holder and of the universe primary; the native full-history targets (§4); the buy-and-hold references; a
2025–2026 integrity scan of the validated ETFs. Passing validation and beating a comparator are different questions.
A failed validation is a result: no new winner, no swap, no rescue search, no retuning; the shortlist and the 7B export
are not changed by validation.

## 12. Engineering gates (sealed `results/parity/parity.json` before the freeze)

| Gate | Requirement |
|---|---|
| E1 | Priority 3's evaluation files hash to its sealed parity digest |
| E2 | T1, T2 on VGT and T5–T9 on GDX through this study's path on D24 reproduce their sealed development centres to the cent (net, DD, lots) |
| E3 | trade-by-trade parity with the canonical `runRiseTrading` + `summarizeSimulation` run with the **true symbol** on the same split-adjusted sessions (decision, entry and exit times, raw and after-cost prices, net and interest of every trade; minute and daily DD and their times; every daily mark; net, realized) — T1, T9 and two random configurations on **every eligible ETF** (D24) |
| E4 | prefix causality: two random configurations on D19, D21 and D23 equal their D24 runs (decisions, lots, daily marks) — every ETF with a development split and every fifth other ETF |
| E5 | accounting: Σ lot net = net; principal ≤ $100,000; never two lots open; no refusal; cash = $0 / $0 / 0 lots — every E3 configuration |
| E6 | identity: inactive inputs never change the identity; the transfer identities |
| E7 | every ETF's split-adjusted D23 sessions deep-equal the canonical training partition (the repository's partition loader) |
| E8 | blackout and period semantics on a non-control ETF: a blackout of the top episode's decisions removes exactly its lots; a boundary's period P&L equals the mark difference |

Unit tests (`src/growth-etf-screening/tests/`): the door builder and split adjustment on synthetic files, the shortlist
rule, the confirmation picks, the sequential policy charges, the budget caps, identity and neighbourhood rows, and the
compute ledger guard. The pilot tests the duplicate-concurrent-key path. A parity failure stops every dependent stage.

## 13. Resources and recoverability

- **Containment:** every heavy stage is a transient systemd user unit inside `getf.slice` with **MemoryHigh=44G,
  MemoryMax=48G, MemorySwapMax=0** (re-applied before every launch; the unit carries the same limits, `KillMode=mixed`,
  `Restart=no`); Claude, tmux and the Strategy Lab server stay outside; heavy units run one at a time. Other workloads
  are checked first (mongod and a vLLM server run outside; every other study slice idle).
- **Execution settings** (from the bench; amendment R2): **8** child-process workers per ETF job (`--expose-gc`, 1.5 GiB
  old space), **2** ETF jobs at a time within a unit (each its own pool and archive; 16 workers in all on the 8-core
  host, CPU-bound at ≈ 135–140 evaluations/s on D24), workers started together; a full GC every 256 evaluations or above 256 MiB of ArrayBuffers; ≤ 2 tasks in flight per
  worker; queue chunks ≤ 4,096; book caches of 256; a per-job SQLite archive (WAL; LRU ≤ 100,000) bound to the study,
  job, door pin and evaluation-code digest; a 10-second memory monitor; **dispatch stops at 36 GiB of cgroup memory**
  (in-flight work finishes, archives commit, exit 75).
- **Recoverability:** every evaluation archived as it returns; progress checkpoints at least once a minute; a rerun of
  the same command replays deterministically from the archive (a kept lane result must equal its replay; a sealed
  record is never rewritten; a completed ETF job is skipped). A worker death fails the job promptly (no hang); one
  in-flight evaluation per key; a stop request lets every open job close before exit 75; no automatic restart; no OOM
  restart loop.
- **The pilot** (pilot budgets, `pilot-` job names, the pseudo-fold P18 on D19, outputs in the cache): the bench; a
  straight run of every stage path on a subset of ETFs; a graceful stop then resume; a worker SIGKILL then resume; a
  unit SIGKILL then resume — identical search and qualification records; the duplicate-concurrent-key test.

## 14. Integrity

The freeze records this file's, the amendments', the brief's, the adoption manifest's, the universe manifest's (and
R1's), the door manifest's and the transfer manifest's sha256, the sealed engineering gates, the evaluation digest and
Priority 3's, the code closure and its digest, the doors, cutoffs, budgets and the plan check, git `HEAD` and the
resource contract. Stages refuse to run unless the preflight passes, the freeze is sealed and committed, the engineering
gates are sealed with 0 failures, the transfer manifest is sealed and the evaluation code is the frozen one. Records are
sealed write-once (0444; `results/seals.jsonl`; `npm run getf -- verify`). Cutoff selections are committed before their
slices; `FROZEN_SELECTION.json` before FULL. The checkpoint is `RESEARCH_RECOVERY.md`. Report tables are produced by
`tools/growth-etf-screening/tables.ts` (outside the pinned code closure).

## 15. Reporting commitments

- **Format** (standard 2.0.0 §7.7): written analysis, Markdown tables and machine-readable results (JSON, JSONL, CSV)
  only; no charts, plots, SVGs, screenshots, images, dashboards, HTML reports or PDFs; dollars with commas and two
  decimals; unambiguous labels (cutoff, ETF, seed, cell, slot, identity).
- **The report leads with** the brief's six questions: which new ETFs (if any) warrant 7B and why; ETF-specific
  optimization against the fixed transfers; breadth across episodes and seeds; the chronological procedure (universe,
  new-ETF and per-ETF); the 2025–2026 behaviour of the frozen finalists and what remains unproven; whether further work
  is justified and the precise proposed 7B scope (not launched).
- **Tables:** the universe audit and untested list; per-ETF development comparison at every cutoff (best centre, roles,
  qualification, confirmation statistics, episodes); coverage by lane, class and origin; proposals and evaluations by
  kind; stopping causes; the transfer matrix; folds and sequential paths; diagnostics; validation; buy-and-hold
  references (labelled); compute and memory.
- **Limitations:** previously examined history; the present-day universe (survivorship); price-only convention;
  a bounded per-ETF budget; one history; few independent episodes; correlated funds; historical compliance is not a
  guarantee; no pooled conclusion (a standalone winner is never added to C4, C4-refined or the L0 primary without a
  complete shared-pool rerun, and standalone weakness does not prove an ETF could never contribute in a pool).
