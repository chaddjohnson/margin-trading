# Protocol — Short-term VGT dip recovery, Phase 1 (`intraday-dip-recovery-vgt`)

Status: **FROZEN** once `results/protocol-freeze.json` records this file's sha256 (written and committed before any
search, ablation, qualification, fold or validation result of this study). Afterwards it is never edited; changes go
to `AMENDMENTS.md` (append-only), criteria are never loosened there, and an evaluation-code change needs an amendment
that acknowledges the new code digest.

**Written before any search, ablation, qualification, selection, fold or validation result of this study.** Computed
before it (engineering, development doors only): the coverage scan (timestamps only), the door verification, the parity
gates (`results/parity/`, sealed), the synthetic tests and the pilot (`results/pilot/PILOT.md`: pilot budgets on the
pseudo-fold P18 inside D19, outputs in the git-ignored cache; only timings, memory, counts and equality booleans read).

## 0. Standard adoption

| Item | Value |
|---|---|
| Standard | `docs/research/OPTIMIZATION_STANDARD.md` version `2.0.0`, sha256 `2005a88c2e24f5e2ab4e461b0425f97d006781a45518f78d9f10fd9320f40105` (the registry's current version on 2026-11-09) |
| Read / adopted (UTC, from `date -u`) | read in full 2026-11-09T18:09:38Z, with its registry, `STUDY_PROTOCOL_TEMPLATE.md`, the adoption template, `CLAUDE.md`, `docs/claude/context-recovery.md` and the preflight source / adopted at the adoption manifest's `adoptedAt` |
| Adoption manifest | `research/intraday-dip-recovery-vgt/STANDARD_ADOPTION.json` (checked by `npm run research-preflight -- --study research/intraday-dip-recovery-vgt`; the runner calls `requireStandardAdoption` before every search, qualification, fold, ablation, control, diagnostics, freeze and validation stage) |
| Scope | `optimization` |
| Brief | `research/intraday-dip-recovery-vgt/brief/BRIEF.md`, sha256 `7224c602fe5797e3984b5c11f5b369852cdf5ed10f5c7a9d6214ba2b89f57c4c` (225 lines, read in full through §9 and its acceptance checklist) |
| Branch / base commit | `research/intraday-dip-recovery-vgt` in the main checkout, from `8c20f855`; code `src/intraday-dip-recovery/`; command `npm run dip-recovery -- <command>` from the repository root |
| Compliance map | `STANDARD_COMPLIANCE_MAP.md` maps every [M]/[S]/[R] item to a section here and to its evidence file |

### Adaptations and departures

| ID | Standard § | Kind | What and why | User agreement (departures only) |
|---|---|---|---|---|
| AD1 | §2.3, §2.5 | adaptation | The primary rule is **actual profit**: the highest development centre net among qualified selectable members; ties by the lower centre minute DD, then the canonical candidate ID (§9.3). Robust-profit, balanced and lower-drawdown roles are reported beside it with the standard's formulas; balanced divides by max(selection p90 DD, $1); lower-drawdown is vacant when the primary's selection robust net is not positive. | — (brief §3.1, §3.2) |
| AD2 | §2.1, §5.5 | adaptation | Qualification gates Q1 centre net > 0, Q2 centre minute DD ≤ $35,000, Q3 **confirmation** (3 × 128) p90 minute DD ≤ $35,000, each boundary inclusive (≤). The brief's proposed "selection/confirmation p90" is resolved by the standard's division of labour (§2.3): confirmation decides qualification; the selection p90 is the ranking statistic; the search's rung p90 ≤ $35,000 is a feasibility constraint. No neighbourhood profit gate (brief §3.1: "do not silently treat median/p10 profitability as an additional gate"). | — (brief §3.1) |
| AD3 | §4.1, §2.4 | adaptation | Study 8's pipeline with **four NSGA-II objectives** (−centre net, centre DD, −robust net, neighbourhood p90 DD) and protected promotion: ¼ by centre net (feasible first), ¼ by robust net (rungs 2–3) or constrained rank (rung 1), ½ by a round robin over the six protected cells (diversity quota). | — (brief §3.1, §5.1) |
| AD4 | §5.3 | adaptation | Radii in grid steps (B ±1 level; X, Y, S, P ±3; H, L, W ±2; U ±5 — ±19–21% in value, as Intraday D1); one-scope families entry {B, X, Y, L}, exit {S, H, U}, continuation {P, W}; the family (F1–F4) is categorical and fixed in every neighbourhood. | — |
| AD5 | §2.7, §2.9, §3.4, §4.7 | adaptation (stated non-applicability) | One VGT book, one funded position, one rule family per candidate: F1–F4 are **alternatives, never simultaneously funded components**, so pooled-method arms (fixed pooled / separately optimized / joint / staged), multi-component participation protection and participation attribution do not apply. Family **on/off** effects are reported as causal whole-replay differences (§9.5). | — (brief §3.3) |
| AD6 | §5.1 | adaptation | Single-family identity: the study has no pool; parity P6 proves the search (worker) path equals the report (local) path record for record. Pooled identities are not applicable. | — (brief §6.4) |
| AD7 | §2.6 | adaptation | Episodes for the concentration disclosure = calendar months with an entry (causal: known when the entry is made); the blackout rerun bars new funding in the top month and changes nothing else. | — (brief §7) |
| AD8 | §0.3, §1.3 | adaptation | Accounting from the first session 2016-01-04; one common arming date 2016-02-01 for every candidate and harmonized control (≥ 10 sessions of history for the grid's longest lookback; Intraday D1's convention). Native daily D1 keeps its own (no arming date). | — |
| D1 | §1.8 | **departure** | The earlier-cutoff repeat covers the **independent four-family procedure** (identical budget, criteria and construction at C19, C21, C23 and C24). The informed lane and the exploratory 2-bp lane run at C24 only: every incumbent and informed seed was selected or diagnosed with data through 2024-12-31 (after each earlier cutoff), so no cutoff-eligible informed seed exists at C19–C23, and an informed fold could carry no chronological evidence (§1.9). The C24 primary may come from the informed set; the chronological verdict tests the independent procedure only, and the report says so. | Brief §4: "Run full search **and** frozen selection for each, using the same declared budget, criteria, families and **independent-lane construction** as the main cutoff"; brief §3.3: "Earlier-cutoff folds may use an independent lane as chronological evidence only to the extent that seeds, ranges and selection genuinely exclude later-selected configurations and examined outcomes." |

## 1. Question, objective and outcomes

- **Question.** Can the simplified short-term dip-recovery mechanics on VGT 1-minute bars — a dip below a causally
  computed reference high, a trailing rebound buy, an **unconditional protective trailing stop raised from completed
  minutes**, exits and re-entries within a period, no forced end-of-day exit — earn worthwhile **actual net profit**
  after 5 bps per side and 11% financing within a maximum minute DD of $35,000 on one fixed $100,000 principal, and
  which meaningfully different phenotypes do so on 2016–2024?
- **Objective.** Net profit (realized + marked unrealized, after execution friction and interest) with a maximum minute
  DD ≤ **$35,000 on one fixed $100,000 principal budget** (35% of that budget, not of peak equity). Historical
  compliance is not a guarantee of future drawdown.
- **Primary-selection rule:** **actual profit** (AD1, §9.3). Ranking uses the selection families; confirmation decides
  qualification only.
- **Roles:** actual-profit, robust-profit, balanced, lower-drawdown (§9.3), plus a catalog of up to 12 distinct
  development-selected phenotypes (§9.4).
- **Pareto set:** the qualified members' non-dominated set on (max centre net, min centre DD, max selection p10 net,
  min selection p90 DD), reported.
- **Valid outcomes:** a frozen primary with roles and catalog; "no qualifying primary" (then a small frozen diagnostic
  catalog only, §11); failed qualification; an unsupported or incomplete chronological procedure; a failed validation.
  A negative result is a result. Verdict categories for the report (brief §7): (a) credible feasibility signal, (b)
  tentative / cost- or execution-dependent, (c) no attractive edge demonstrated; and separately: historically
  profitable, qualified under frozen gates, chronologically supported, deployable — never synonyms.

## 2. Prior knowledge and provenance

- **Already examined** (`EXISTING_FINDINGS_AND_CHANGE_MAP.md` §2): 2016-01-04 → 2026-10-30 of VGT by the Intraday D1
  study (its shortlist's 2025–2026 diagnostic: +$6,184), daily D1 (B1 validation +$40,901), Study 8, Priorities 1–5A
  and the browser. The validation window is therefore **validation on previously examined history, not an untouched
  holdout**. This rule family was conceived after that exposure.
- **Incumbents:** the Intraday D1 frozen shortlist (4 vectors, `research/intraday-d1-vgt/results/qualify/qualification.json`,
  sha256 `ae6313a5…`; chosen on 2016–2024 by Study 8's procedure; no role holder) — informed; daily D1 `primary`
  (`config/phenotypes/D1/VGT.json`; chosen with later history in view) — control only. Informed seeds: the seven
  configurations of the Intraday D1 development diagnostics (`results/report/diagnostics.json`, sha256 `10b4088d…`).
  None is ever an independent-lane or earlier-cutoff seed.

## 3. Data, doors and windows

- **Canonical file:** `data/VGT/data.csv` (Alpaca SIP 1-minute OHLCV, raw prices, extended hours present; git-ignored),
  53,395,054 bytes, 935,608 rows, sha256 `2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e`.
- **Measured coverage** (`results/data/coverage.json`, sealed; the timestamp field only, no price parsed): 2,723
  sessions 2016-01-04 → 2026-10-30, no missing NYSE trading day; the last session has 390 regular bars, the closing
  print and 144 rows after the close. Two 2016 sessions (2016-04-06, 2016-11-25 early close) have complete regular bars
  but no closing-print row (their close is the last bar's close, `groupMarketSessions`).
- **Common complete endpoint: 2026-10-30.** November–December 2026 do not exist and are never implied.
- **Doors** (byte prefixes through the New York date, verified by size, sha256, rows, last-row time and session count
  before parsing; `context.ts` `prefixDoors`, `results/data/doors.json`, sealed):

  | Door | Last session | Bytes | Rows | sha256 | Sessions |
  |---|---|---:|---:|---|---:|
  | D19 | 2019-12-31 | 18,374,863 | 319,486 | `a2e4c721…81d1` | 1,006 |
  | D21 | 2021-12-31 | 28,414,685 | 495,874 | `68174203…a60e` | 1,511 |
  | D23 | 2023-12-29 | 37,879,762 | 663,135 | `920f3a20…812c` | 2,012 |
  | D24 | 2024-12-31 | 42,469,694 | 743,918 | `c144619f…9ecb` | 2,264 |
  | FULL | 2026-10-30 | 53,395,054 | 935,608 | `2ee06310…412e` | 2,723 |

  FULL applies the recorded 8-for-1 split of 2026-04-21 by the repository's forward adjustment
  (`config/market-events/splits.json`, `adjustSessionsForSplits`), so pre-split prices are unchanged; it opens only
  through `validate`, which refuses unless `FROZEN_SELECTION.json` is committed and unchanged. The pilot door P18
  (a prefix inside D19 through 2018-12-31, sha256 `ade20705…8277`) serves the pilot only.
- **Windows:** development 2016-01-04 → 2024-12-31 (all search, refinement and selection); validation 2025-01-02 →
  2026-10-30; earlier cutoffs C19, C21, C23 (§10).
- **Continuity:** every run is one continuous causal run from 2016-01-04; nothing is liquidated or reset at a boundary.
  Window P&L = the change of the marked net between boundary closes; reset drawdowns restart at the boundary close with
  the peak = the marked net there, and are reported beside the whole-run drawdown.
- **The door log:** `results/doors.jsonl` (every opening: door, purpose, bytes, sha256, last row, process).

## 4. Controls, incumbents and comparison arms

- **Exact controls** (reproduced to the cent before use; parity P1, P3), native and harmonized (§5.3):
  - daily D1 `primary`, native: the canonical D1 file's development record $137,222.97 / minute DD $19,330.69 /
    daily DD $15,611.46 / 17 trades; harmonized: session clock, 5 bps, 11%, arming 2016-02-01 (= Intraday D1's B1,
    $135,359);
  - Intraday D1 shortlist #1 `id-5.1v.e.1f.1y.t.1y.6.1f`: $71,245.59 / $17,279.91 / 83 lots (native = harmonized: the
    same economics and arming date; engine L0).
- **Informed lane and fallback** (standard §3.2, first option): each Intraday D1 incumbent vector projected exactly
  into F1–F4 (inactive genes dropped) is a **member of the C24 selectable set** under the same gates and primary rule,
  so no separate fallback is needed: if no searched candidate beats the best qualifying applicable incumbent, that
  incumbent is the primary. The native L0 incumbent and daily D1 are **controls, not selectable short-term phenotypes**
  (different architecture).
- **Method arms:** not applicable (AD5). The two proposal lanes (independent, informed) and the exploratory 2-bp lane
  are reported with their own budgets and provenance; no method-superiority claim is made.

## 5. Engine and conventions

### 5.1 The engine (`src/intraday-dip-recovery/engine.ts`)

One VGT book, one funded $100,000 position at a time, causal on 1-minute OHLC bars of the regular session (09:30 ET to
the scheduled close, 13:00 on early-close days) plus the closing print. Bars are sparse (no trade → no bar; never
fabricated); the order of prices inside a bar is unknown and never exploited. The **period clock** of B minutes
(clock-aligned from 09:30; a block without a bar is not a period; the session's last period holds the closing print)
is `src/intraday-d1/periods.ts`, unchanged.

Per period i: the **reference high** = the highest period high of the previous Lp = max(1, round(L/B)) periods, fixed
for the period (completed periods only). Per minute, in this order:

1. **Fill.** A buy decided at an earlier close fills at this bar's open (the next observed trade).
2. **Exits** (D1's order, for a position the rules allow to exit in this period): gap through the stop at the period's
   opening trade; a carried stop or maximum-hold sale at the opening trade; a carried buffered sale at the opening
   trade; the maximum hold (held ≥ H and losing at the period open: a sale at the next trade after the first minute,
   the intraday stop of that position suspended for the period); the **stop**: a bar opening through it sells at the
   open; a bar whose low reaches it sells **at the stop level** (base case); then the buffered signal (after the hold,
   a minute close with a net loss ≤ −U × $100,000 sells at the next trade; a stop in the signal minute or an open through
   the stop in the next minute wins). A position that **filled in this minute** faces the stop known at its fill
   (entry × (1 − S)): the fill minute's own high never raises it (conservative same-bar rule).
3. **Arming and the trailing buy** (flat, when the rules allow an entry): a completed minute close at least X below the
   reference high arms a **deep** setup, else (continuation families) a close at least P below the continuation high
   within W periods of a net-profitable exit arms a **continuation** setup (deep has priority; arming consumes the
   window); the arming minute never buys; the trailing low starts at the arming close and then takes each minute's low;
   a close ≥ trailing low × (1 + Y) decides a buy, filled at the next observed trade (the closing print only for a
   decision before the close; otherwise the next period's opening trade). Setups persist (no expiry).
4. **Ratchet and marks.** While long after this minute: the stop's high (minute ratchet) and MAE/MFE; the book is
   marked at the minute's close, at the closing print and at every session close.

Interest: $100,000 × rate × calendar days between the entry and the exit (or mark) session dates ÷ 365 (zero for a
same-session round trip; three days over a weekend), D1's convention. No forced end-of-day exit; overnight and weekend
holding is permitted and measured.

### 5.2 The rule switches, the ladder and the families

| Set | Stop while losing | Same-period exits/entries | H/U | Continuation | Stop ratchet |
|---|---|---|---|---|---|
| L0 (Intraday D1) | no (profit-conditioned, decided before each period) | no | on | on | period |
| L1 | **yes** | no | on | on | period |
| L2 | yes | **yes** (+ exit orders reaching a period's end wait for the next trade) | on | on | period |
| L3 | yes | yes | **off** | on | period |
| L4 | yes | yes | off | **off** | period |
| L5 = F1 | yes | yes | off | off | **completed minute** |
| F2 CORE+C | yes | yes | off | **on** | completed minute |
| F3 CORE+H/U | yes | yes | **on** | off | completed minute |
| F4 CORE+C+H/U | yes | yes | on | on | completed minute |

H/U is not provably inert in F3/F4 (with an unconditional stop it can still sell earlier than the stop), so no
dimension is removed. With B = 1 every period has one minute; the L2+ carry of exit orders keeps the maximum hold and
the next-trade stop stress meaningful there (L0/L1 keep D1's period-bounded lookup, parity P2).

### 5.3 Economics and the native → harmonized bridge

- **Primary economics:** a fixed **$100,000** notional per entry (shares = $100,000 ÷ (fill × 1.0005), fractional, no
  compounding); **5 bps per side** execution friction in the entry price (so every net test sees it) and on the exit
  price; $0 commission; **11%** simple annual interest as above; stops at the stop level or the opening trade of a
  minute that opens through them; no stop slippage; raw prices (no dividends; the split is adjusted).
- **Report-only scenarios** (full causal replays; costs move decisions where nets are tested): 0, 2, 10, 20 bps per
  side; 14% interest; next-trade stop fills; +25 bps stop slippage; the trigger minute's low as the stop fill.
- **Harmonized convention** (every candidate and the harmonized controls): accounting from 2016-01-04, arming from
  2016-02-01, the primary economics. **Native:** daily D1 — costs 0, no arming date (its CLI); Intraday D1 — identical
  to harmonized.
- **Capacity (report-only):** $100,000 against the fill minute's dollar volume and against the causal median dollar
  volume of the 30 minutes before the decision; flagged above 10%. Minute OHLCV is not order-book depth; a stop order
  cannot guarantee its trigger price.

## 6. Space

- **Parameters** (`context.ts` `axes`; a vector is one integer index per key):

  | Key | Values | Points | Radius |
  |---|---|---:|---:|
  | B period | {1, 5, 10, 15, 30, 65, 130} minutes | 7 | 1 level |
  | X dip below the reference high | 0.10% × 1.06^k → 0.10%–9.98% | 80 | 3 |
  | Y rebound above the trailing low | 0.02% × 1.06^k → 0.02%–2.0% | 80 | 3 |
  | S protective trailing stop | 0.05% × 1.06^k → 0.05%–4.99% | 80 | 3 |
  | L lookback | 10 × 1.1^k regular-session minutes → 10–4,053 | 64 | 2 |
  | H maximum losing hold (F3/F4) | 5 × 1.1^k trading minutes → 5–3,949 | 71 | 2 |
  | U buffered loss (F3/F4) | k bp of the investment → 0–1.50% | 151 | 5 |
  | P continuation pullback (F2/F4) | 0.05% × 1.06^k → 0.05%–2.48% | 68 | 3 |
  | W continuation window (F2/F4) | 10 × 1.1^k minutes → 10–4,053 | 64 | 2 |

  The formulas are Intraday D1's, extended upward for X, Y and S (and B = 1 added below), so **every Intraday D1 vector
  is exactly representable at the same indexes** (tests). The extension is justified by development microstructure and
  the unconditional stop (a deep dip needs room for a protective stop); the bounds were fixed before any result.
- **Structure and identity:** a family's inactive genes are canonical 0 and never part of identity; L (and W) indexes
  giving the same period count max(1, round(minutes/B)) are one candidate, represented by the index nearest (in log
  terms) to count × B; identity = family + canonical indexes (`space.ts` `idOf`). Behaviourally identical
  configurations (the same funded-lot ledger signature: entry bar, exit bar, exit reason) are grouped in counts and
  shortlists.
- **Protected strata (cells), per family:** dip depth — shallow X < 1% (k 0–39), medium 1–3% (k 40–58), deep ≥ 3%
  (k 59–79) — × lookback scale — intraday (effective lookback count × B ≤ 390 minutes) or multi-session. Six cells,
  equal screen quotas (draws whose canonical form leaves the cell are redrawn), a cell round robin in every promotion,
  island fillers cycling the cells, and a shortlist slot for each unrepresented cell.
- **Multi-component participation (§4.7):** not applicable (AD5).

## 7. Search, budget and stopping (`search.ts`, `budgets.ts`)

### 7.1 Lanes

- **Independent (`indep`), per family F1–F4, at C19, C21, C23 and C24 (identical):** stratified scrambled-Sobol screen
  (6 cells × 1,024) → plausibility (centre net > 0, centre DD ≤ $35,000, ≥ 1 lot) → protected promotion of 256 to rung 1
  → NSGA-II islands → rung 2 → rung 3 → refinement → the lane shortlist. No incumbent, informed seed, later-selected
  vector or range.
- **Informed (`informed`), per family, C24 only:** the 11 seeds (4 incumbents, 7 diagnostics, projected into the family
  and de-duplicated) + per seed 48 near (1.5 × radius) and 48 broad (3 × radius) Latin-hypercube designs → seeds always
  promoted + protected promotion to 256 → the same islands, rungs, refinement and shortlist.
- **Exploratory 2 bps (`explore2`), per family, C24 only:** the independent construction at **2 bps per side**, half
  the independent schedule; labelled exploratory; its members are qualified under the same gates at 2 bps but are
  **never selectable** and hold no role; a 2-bp result is never called a 5-bp result.

### 7.2 Islands, rungs, refinement, shortlist

- **NSGA-II islands:** population 64; binary crowded tournaments; SBX (η 15, p 0.9) and polynomial mutation (η 20,
  1/active genes) on the family's active grid indices; children canonicalized; every new child fitted at rung 1;
  (μ + λ) survivors. Base island k starts from the lane's rung-1 archive in constrained rank order (rank n → island
  n mod 4), topped up with cell-cycling Latin-hypercube fillers; an extension island starts from the archive's top 64.
  An island stops at 1,024 distinct new proposals, 60 generations, **stagnation** (10 generations without a 1e-3
  relative gain of its hypervolume of (−robust, p90 DD) against (0, $35,000) and of its best feasible centre net), or 3
  generations without a new configuration.
- **Rung promotion:** rung 2 keeps 48 from the rung-1 archive, rung 3 keeps 16 from rung 2 (¼ centre net, ¼ robust net,
  ½ cell round robin of constrained rank; distinctness L∞ 0.02 / 0.03).
- **Refinement:** the profit start (highest feasible rung-3 centre net) and the robust start (highest feasible rung-3
  robust net); ≤ 2 passes over every active gene ±⌈r/2⌉, ±r at fidelity 16; accept the feasible move with the highest
  criterion when it gains ≥ $1,000 (from an infeasible start: the largest violation cut ≥ 0.01); endpoints re-fitted at
  rung 3.
- **Lane shortlist (≤ 6; explore2 ≤ 3):** feasible rung-3 fits, one per ledger signature (its highest centre net),
  picks at L∞ ≥ 0.10: profit, robust, balanced (robust ÷ max(p90, $1)), then the best centre net of each unrepresented
  cell, then centre-net order. The five most profitable infeasible rung-3 centres are kept as diagnostics.

### 7.3 Budgets (frozen; both units)

| Lane (per family) | Screen | Rung-1 promotion | Islands (base + extension) × 64 × new proposals | Rungs 2 / 3 | Refinement | Shortlist |
|---|---:|---:|---|---|---|---:|
| indep, C19 / C21 / C23 / C24 | 6,144 | 256 | (4 + ≤ 2) × 1,024 | 48 @ 64 / 16 @ 128 | 2 starts, ≤ 2 passes, 16 draws | 6 |
| informed, C24 | 11 seeds × (1 + 48 + 48) | seeds + 256 | (4 + ≤ 2) × 1,024 | 48 / 16 | as indep | 6 |
| explore2 (2 bps), C24 | 3,072 | 128 | (2 + ≤ 1) × 1,024 | 24 / 8 | as indep | 3 |

- **Distinct candidate proposals (planned):** indep ≈ 10,400 per family-cutoff (≈ 12,500 with every extension):
  ≈ 166,000 over 16 lanes; informed ≈ 5,100 (7,200) per family; explore2 ≈ 5,200 (6,200) per family. **Total
  ≈ 207,000 (cap ≈ 255,000).**
- **Backend evaluations (planned):** indep ≈ 88,000 per family-cutoff (≈ 123,000 with extensions) — centres 6,144 +
  rung 1 (256 + 4,096 neighbours) + islands (4 × 1,024 × 17) + rungs (48 × 65 + 16 × 129) + refinement ≈ 2,800;
  ≈ 1.41M over 16 lanes; informed ≈ 83,000 (118,000) per family; explore2 ≈ 45,000 (63,000) per family; qualification
  ≈ 1,290 per member (centre, 256 selection, 384 confirmation, ≤ 3 × 128 scopes, 2 × 128 radius families, 8 stresses,
  ≤ 3 toggles) ≈ 191,000. **Total ≈ 2.1M (cap ≈ 2.9M).** Reports count centres, neighbours per stage, fold work,
  retries and archive/cache hits separately; the actual counts come from the sealed records.
- **Pilot sizing** (results/pilot/PILOT.md): ≈ 280 evaluations/s on D24 at 12 workers → ≈ 2 hours of contained compute.

### 7.4 Extension policy and stopping (frozen; development fits only)

After the base islands, and after every extension, one more island runs (up to 2 extensions; explore2: 1) iff the last
island raised by **more than 5%** the lane's union hypervolume of (−robust net, p90 DD) against (0, $35,000), or its best
feasible rung-1 robust net, or its best feasible rung-1 centre net, **or** made a cell feasible that was not feasible
before it. Recorded per island: proposals, evaluations, generations, stop reason (budget, generation cap, stagnation, no
new configurations), hypervolume before/after and **hypervolume gain per 10,000 evaluations**; per lane: "triggers not
met" or "extension cap reached". **Budget exhausted is not convergence.** Nothing is re-searched after a fold, a
qualification or the validation.

## 8. Robustness instrument

- **Neighbours:** radii in grid steps (§6, AD4); one Latin hypercube of u ∈ [−1, 1] over all nine genes per seed family
  (common random numbers across centres); a centre uses the columns of its active genes in the family's scope;
  coordinate = centre + round(u × scale × radius), clipped to the grid (the grid always contains the centre; the
  clipped-coordinate count is reported); canonicalized; draws equal to the centre or to an earlier draw dropped
  (counted); the family is fixed (categorical).
- **Seeds:** `deriveSeed('intraday-dip-recovery-vgt', …labels)` (sfc32): screens `('screen', lane, family, cutoff,
  cell)`; islands `('ga', lane, family, cutoff, k)`; fillers `('fill', lane, family, cutoff, k, n)`; informed designs
  `('informed', 'near'|'broad', seed, cutoff)`; rungs `('nbhd', 'r1'|'r2'|'r3'|'rf', cutoff)`; selection
  `('nbhd', 'select', 1|2, cutoff)`; **confirmation `('nbhd', 'confirm', 1|2|3, cutoff)` — independent of every ranking
  seed**; scopes `('nbhd', 'scope', 'entry'|'exit'|'continuation', cutoff)`; radius families `('nbhd', 'small'|'wide',
  cutoff)`.
- **Fidelities:** rung 1 = 16, rung 2 = 64, rung 3 = 128, refinement = 16; selection 2 × 128; confirmation 3 × 128 = 384;
  each one-scope family 128; half (0.5 × radius) and wide (1.5 × radius) 128 each. A 16-draw estimate is never a
  confirmation.
- **Statistics** (`fitness.ts` `nbStats`; quantiles interpolate linearly, the standard's `quantile`): median, p10, p90 of
  net; **robust net = ½ median + ½ p10**; median, p90, p95 and worst DD; **worst-10% mean DD** (mean of the ⌈0.1 n⌉
  largest); breach count and share (DD > $35,000) with a **Wilson 95% interval**; mean excess among breaches and the
  worst excess; distinct ledgers and the distinct ledgers behind breaches; draws equal to the centre; clipping;
  duplicates. Tail statistics are **report-only**.

## 9. Qualification, roles and report-only evidence (`qualify.ts`; every cutoff, its training door only)

### 9.1 Gates (all must hold; thresholds fixed before any result)

| Gate | Requirement | Why |
|---|---|---|
| Q1 | centre net > 0 (development, 5 bps) | a selected system must make money on the history it was chosen on; a zero-trade configuration (net 0) cannot qualify by being inactive |
| Q2 | centre maximum minute DD ≤ $35,000 | the user's risk budget on the fixed $100,000 |
| Q3 | confirmation (3 × 128, pooled, de-duplicated) p90 maximum minute DD ≤ $35,000 | the neighbourhood upper tail of risk: at most 10% of independent neighbours may breach (standard §5.5), with the breach share, mean excess and worst disclosed beside it |

No activity floor, annual-profit floor, $10,000/yr neighbourhood median, largest-winner cap, equal-family rule,
win-rate threshold or breach-rate veto. Members failing a gate stay disclosed as non-qualified (never "qualified" or
"deployable").

### 9.2 Members per cutoff

C19, C21, C23: the four independent lane shortlists. C24: the independent and informed lane shortlists and the four
incumbent vectors projected into each family (the selectable set), plus the exploratory 2-bp shortlists (qualified at
2 bps, never selectable). One evidence per (candidate, cost lane).

### 9.3 Roles and the primary (ranked on the selection families; standard default formulas)

Among the qualified selectable members:
- **actual-profit (the primary):** the highest centre net; ties by the lower centre DD, then the candidate ID;
- **robust-profit:** the highest selection robust net (ties: lower selection p90 DD, then ID);
- **balanced:** the highest selection robust net ÷ max(selection p90 DD, $1) (ties: lower p90, then ID);
- **lower-drawdown:** the lowest selection p90 DD among members whose selection robust net ≥ 50% of the primary's
  (ties: higher robust, then ID); **vacant** when the primary's selection robust net ≤ 0.

At C24 the independent lane's own roles (the independent primary) and the exploratory lane's roles are reported beside
the final set. **No qualified member → no primary** ("no qualifying primary"; a fold without a primary is flat in its
slice).

### 9.4 The diverse catalog (C24; ≤ 12, ≤ 4 per family)

The role holders first (mandatory, even beyond a family cap); then qualified members in centre-net order, each added
unless its family already holds 4 or it is a **near-duplicate** of a retained member: (a) the same family and normalized
L∞ distance < 0.10; or (b) entry overlap ≥ 0.5 (shared entry minutes ÷ the smaller entry count); or (c) similar
behaviour on all three of median holding time and trades per year within a factor 1.5 and median entry depth within
0.5 percentage point. Each retained member's nearest retained neighbour and its differences are reported, with
descriptive labels (frequency, holding, depth, stop width, DD, continuation and H/U on/off). The catalog is never padded:
fewer than 12 is a valid outcome. The **diagnostic catalog** = the most profitable non-qualified member of each family
(labelled, never a nominee).

### 9.5 Report-only evidence

Stresses (§5.3); family toggles as causal whole-replay differences (F2 → F1: continuation off; F3 → F1: H/U off;
F4 → F3, F2, F1); for a deep-only F1, removing its only entry path necessarily yields no trades (stated, not run);
episode concentration (AD7) with the top-month blackout rerun; independent episodes, entry years and capital-years
(no floor); per-trade ledgers; per-year tables; capacity flags; the tail-severity statistics (§8) with the small and
wide radius families; neighbourhood distinct ledgers.

## 10. Chronological procedure tests (`stages.ts` seal-fold, fold-eval, sequential)

| Cutoff | Training door | Sealed and committed before | Evaluation slice (door) |
|---|---|---|---|
| C19 | D19 (2016-01-04 → 2019-12-31) | its slice opens | 2020-01-02 → 2021-12-31 (D21) |
| C21 | D21 (→ 2021-12-31) | its slice opens | 2022-01-03 → 2023-12-29 (D23) |
| C23 | D23 (→ 2023-12-29) | its slice opens | 2024-01-02 → 2024-12-31 (D24) |
| C24 | D24 (→ 2024-12-31) | the validation | 2025-01-02 → 2026-10-30 (FULL, once) |

- **Order:** C19 search (4 families) → qualify → seal the fold selection (`results/folds/C19-selection.json`) and
  **commit** it (`fold-eval` refuses an uncommitted selection) → evaluate the slice; then C21; then C23; then C24. A
  fold's slice never feeds a later search (the next cutoff's training includes it only after the fold's selection was
  frozen and committed).
- **Carry-state and warm-up:** a fold member's slice comes from its own continuous run from 2016-01-04 on the
  evaluation door; state, open positions and marks carry across the cutoff (nothing reset); warm-up is the strategy's
  own causal history.
- **Sequential policy (frozen):** the fold primaries trade their slices in turn (flat without one); each slice's marks
  come from that primary's continuous run; a switch between different configurations at a boundary is charged 5 bps on
  $100,000 for each open lot it closes or adopts; reported: the chained net, the charges and the strict minute DD of the
  chained marks; the same per fold for each role holder, and for the controls descriptively.
- **Verdict (the standard's default):** *chronologically supported* iff every fold produced a primary, the sequential
  net > 0 and the sequential minute DD ≤ $35,000; *incomplete* if a fold had none; otherwise *unsupported*. Failed folds,
  losing slices and DD breaches are reported even if the final C24 primary looks attractive. Local stability and
  chronological reliability are reported apart. Only the independent procedure is tested (D1).

## 11. Validation plan (frozen in `FROZEN_SELECTION.json` before the FULL door opens)

- **Frozen before:** the C24 primary, roles, catalog, Pareto set, the whole C24 set with tags (independent, informed,
  incumbent, exploratory, diagnostic), the sequential verdict, the controls, these tests and the validation perturbation
  family; sealed and **committed**.
- **What runs:** every member of the frozen C24 set and the controls, one continuous run 2016-01-04 → 2026-10-30;
  validation P&L = marked net at the end − marked net at the 2024-12-31 close (no liquidation, no reset); 2025 and 2026
  (partial, to 2026-10-30) separately; the reset validation DD and the whole-run DD; per-year P&L and in-year reset DD;
  lots after and across the boundary; ledgers.
- **Tests (reported for every member, decisive for none):** V1 validation P&L > 0; V2 reset validation minute DD
  ≤ $35,000; V3 whole-run minute DD ≤ $35,000. Report-only: the stresses on FULL; the confirmation rep-1 family (128
  draws, labels `nbhd/confirm/1/C24`) on FULL for the primary, role and catalog members (median and p10 validation P&L,
  positive share, breach shares).
- **What a failure means:** a result. No reselection, retuning, range, rule, role or candidate change and no rescue
  search follows any validation outcome; a better validation score never swaps the primary. 2025–2026 is validation on
  previously examined history, not an untouched holdout.

## 12. Engineering gates (sealed before any search; `parity.ts`, `tests/`)

- **P1** canonical daily D1 (the L0 engine on the session clock, costs 0, no arming date) equals the canonical D1 file
  on the D24 bytes trade for trade and in both drawdowns, under stop and next-open fills, and reproduces its sealed
  development record. **P2** L0 equals the completed Intraday D1 engine, lot field by lot field (Object.is), on D19 and
  D24 (its 4 shortlist vectors, 7 diagnostics vectors, 120 scrambled-Sobol vectors; six execution variants). **P3** the
  native controls to the cent. **P4** causal doors: every rule set on D19, D21, D23 equals the D24 run up to that door's
  last session (lots, the open position, daily marks, drawdown). **P5** accounting: Σ lots = realized; realized +
  unrealized = net = the last daily mark; one position at a time; $100,000 principal per entry; interest and costs
  recomputed. **P6** the one-book identity (worker path = local path). **P7** stresses recomputed from the bars.
  **P8** the independent reference (`reference.ts`) equals the engine for L0–L5 and F1–F4 on 2016 and 2016–2018
  windows. Tolerance: none (Object.is) except P8 money (< $1e-6). A parity failure stops every dependent stage until fixed
  and re-sealed; failed attempts are kept.
- **Synthetic tests** (`tests/engine.test.ts`, `space.test.ts`, `post.test.ts`): the unconditional stop at a loss in the
  fill minute at the stop level (the fill minute's high never raises it); next-trade and minute-low fills; slippage on
  stops only; minute versus period ratchet; same-period exit and re-entry (L2) versus L1; a weekend gap through the
  stop; calendar-day interest including zero and negative rates; the closing-print entry and the last-minute carry;
  continuation after profitable exits only; the maximum hold suspending the stop; the buffered loss with stop
  precedence; DST and early closes; sparse minutes; the split's forward adjustment; reset segments, exact annual and
  window attribution, the open endpoint; the blackout; determinism; the reference on every scenario; identity and
  canonicalization; incumbent representability; the screen's strata; the FULL door's refusal; slices and the
  sequential chain.
- **Non-regression:** no existing file of D1, Intraday D1, Study 8, Growth or Strategy Lab changes (git diff); the
  Intraday D1 chain verifies (`npm run intraday-d1 -- verify`).

## 13. Resources and recoverability

- **Containment:** every heavy stage runs as a transient systemd user unit (`launch`) inside **one parent slice
  `diprecovery.slice` with MemoryHigh=44G, MemoryMax=48G, MemorySwapMax=0** (set before every launch); heavy units run
  one at a time; `KillMode=mixed`, `TimeoutStopSec=120`, `Restart=no` (no restart loop after an OOM); Claude, tmux and
  host services stay outside.
- **Execution settings (from the pilot bench):** **12** child-process workers (`--expose-gc`, 1.5 GiB old space), one
  door each, started four at a time; ≤ 2 tasks in flight per worker; batches ≤ 4,096; a full GC every **1,024**
  evaluations or above 256 MiB of ArrayBuffers; a 10-second monitor of the job cgroup's memory, every process's RSS,
  external and ArrayBuffers; **at 32 GiB of the job cgroup** dispatching stops, in-flight work finishes, the archive is
  flushed and the job exits 75 (a pre-limit pressure guard below MemoryHigh). A worker death fails the job at once (its
  in-flight tasks dropped); nothing restarts it.
- **Recoverability:** each job's append-only archive (`.cache/intraday-dip-recovery-vgt/jobs/<job>/archive.jsonl`) is
  bound to the study, the job, the door pin and the evaluation-code digest; results are appended as they arrive
  (flushed every 2 s or 500 rows, fsync); a progress checkpoint is written after every batch; every stage is a
  deterministic function of its seeds and the evaluations it requests, so rerunning the same command replays it with
  archived evaluations read back (RNG and search state are reconstructed by replay). The pilot shows a graceful stop, an
  abrupt unit kill and an abrupt worker kill each resuming to an identical search.

## 14. Integrity

The freeze (`results/protocol-freeze.json`) records this file's, the adoption manifest's, the brief's, the amendments',
the compliance map's and the findings map's sha256, the sealed parity record, the evaluation-code digest (every study
source file and the imported modules, `seal.ts` `codeDigest`), the data and door pins, `HEAD`, the budgets and the
resource contract. Sealed records are write-once (0444) with their sha256 in `results/seals.jsonl`
(`npm run dip-recovery -- verify`). Every stage checks the preflight, the frozen protocol and the code digest (or an
acknowledged amendment). Fold selections are committed before their slices; `FROZEN_SELECTION.json` before the
validation. The checkpoint is `RESEARCH_RECOVERY.md`.

## 15. Reporting commitments

- **Format** (standard 2.0.0 §7.7, mandatory): written analysis, Markdown tables and JSON/JSONL/CSV only. No charts,
  plots, SVGs, screenshots, images, dashboards, HTML visual reports or PDFs; the net-versus-DD comparison is a Markdown
  table.
- **Windows:** development, C19/C21/C23 slices, 2025, 2026 (partial), validation, full history; realized/unrealized.
- **Drawdown:** minute DD in dollars and as a percentage of the fixed $100,000, with its dates; reset and whole-run.
- **Activity and costs:** trades, wins/losses, holding time, same-session and overnight shares, exposure, friction,
  interest, worst and best trade, consecutive losses, gross/net expectancy, profit factor; capacity flags.
- **Ablation L0–L5** on fixed vectors with declared provenance (informed controls, never independent seeds): net, gross,
  friction, interest, DD, trades, wins/losses, worst loss, holding, same-day and overnight shares, per-rung ledger deltas.
- **Robustness:** neighbourhoods, the breach disclosure and tail severity (report-only).
- **Chronology:** fold and sequential results including procedure failures.
- **Search:** proposals and evaluations by fold, lane, family, stage and cell; cache hits, retries, duplicate ledgers,
  promotion reasons, extension and stop reasons, hypervolume gain per 10,000 evaluations.
- **Compute and resources:** observed memory, CPU and throughput.
- **Limitations:** bars not ticks; stop-level fills optimistic; market impact not modelled; previously examined
  validation; historical compliance is not a guarantee. No Phase 2, GDX, portfolio combination, Strategy Lab
  integration, new rule or live deployment is part of this study.
