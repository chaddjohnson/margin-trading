# PROTOCOL — Study 3 Stage 1c `study3c-vgt-momentum-d1-protection-matrix-v1`

**Version 1.0 (draft for independent review; not binding until `freeze-protocol` records its sha256).** Precedence
where frozen texts differ: this protocol > `ENGINE_CONTRACT.md` > `EXPERIMENT_MATRIX.json` > `MECHANISM_CATALOG.md` >
report narrative. After the freeze, changes are append-only amendments (`AMENDMENTS.md`,
`results/amendments.jsonl`); anything an amendment introduces after an outcome has been seen is exploratory and is
excluded from the verdict and from any nomination.

## 1. Question, scope, evidence level, leakage register

- **Question (brief §0).** Can combinations of established VGT momentum entry families and exit families, augmented
  by three optional D1-inspired trade-failure rules — **A** a maximum *losing* hold checked at session opens, **B** a
  post-loss re-entry cooldown, **C** a post-material-loss price-recovery requirement — reduce historical bear-market
  losses (2022 in particular) while keeping high net profits in long advances and acceptable minute drawdowns, when
  the whole design (entry × exit × own-OUT contract × rule mask × numeric parameters) is selected forward-only from
  training data?
- **Scope.** VGT only; one $100,000-per-entry research slot; one long position at most; standalone. No D1, B4, B5,
  allocator or pooled run; nothing registered, promoted or changed outside this study's two directories. Stage 1
  (`research/study3-vgt-momentum/`, `src/study3-vgt-momentum/`) and Stage 1b (`research/study3-vgt-momentum-stage1b/`,
  `src/study3-vgt-momentum-stage1b/`) are read-only: their code may be imported, their sealed records read; nothing of
  them is rerun as a stage, edited or re-hashed. The registered VGT D1 `primary` is an unchanged rule reference only.
- **Evidence level.** All of 2016–2023 was inspected by earlier studies and is known to the designer. Fold replays
  (§6) are **retrospective forward-selection evaluations** of a frozen procedure: the code is blind to each evaluation
  window, the design is not. The full-history run H (2017–2023) is in-sample description. Four annual windows are four
  dependent regimes; no significance is claimed; 2020–2023 (and 2022 in particular) is never called out-of-sample or
  independent validation. 2024–2025 (future validation) and 2026 (final holdout) are not read (§2) and are not
  untouched at the project level (earlier VGT programs inspected 2024–2025; `config/phenotypes/D1/VGT.json` notes it).
- **Leakage and design-bias register (disclosed, not neutralised).**
  1. The brief's rules A, B and C were proposed after the user and the designer examined Stage 1b's three losing 2022
     entries (Π1 trades #11 2022-04-05 → 04-27 −$13,794, #12 2022-07-27 → 09-30 −$12,106, #13 2022-11-11 → 2023-01-03
     −$5,566 lifetime / −$6,325 in the 2022 window; `research/study3-vgt-momentum-stage1b/results/tables/ledger-Pi1-S1.md`).
     Rule C in particular would, for any X ≤ 13% and any Y ≥ 0, have blocked trade #12 after trade #11's −13.0% gross
     exit. Any 2022 improvement is therefore **target-year-informed**.
  2. Stage 1's and Stage 1b's outcomes (fold picks, the March 2020 → January 2022 E04 lot, +$83,131 lifetime; Π1
     +$12,573 / $42,882; Π-NET +$50,533 / $18,015; in-sample H optima such as E06 × XT + Z1 +$112,782 / $15,031)
     were known when this protocol was written. The **primary selection objective stays Stage 1b's RoD** (§7.5) —
     deliberately *not* switched to Stage 1b's better-performing NET objective, which would be selection on Stage 1b's
     evaluation windows; NET is a predeclared alternative selector.
  3. Parameter boxes use general knowledge of VGT's ~1.5–2% daily volatility and its 2018, 2020 and 2022 declines; the
     A/B/C boxes extend the brief's suggested ranges (§4.3).
  4. The fold layout (three advancing years and one declining) is Stage 1's and Stage 1b's.
  5. The D1 inspection (§4.3, `MECHANISM_CATALOG.md` §4) found that D1 `primary` has **no cooldown and no
     material-loss rule**; B and C are the user's new designs, not D1 transplants, and C points the opposite way to the
     D1 lineage's lower-price re-entry rule. Only A (8 calendar days, open check, next-trade fill) and the XN exit
     (profit-conditional 7.3% trail from the intraday high) come from D1 `primary`.
  6. At the start of this session `sha256sum data/VGT/*` hashed the whole data file once (bytes including 2024–2026
     rows; no bar was parsed or used). Stage 1c's loader never parses a row past its bound (§2).

## 2. Data and doors

- **Input.** `data/VGT/data.csv` only, through the Stage 1c bounded loader (`src/study3-vgt-momentum-stage1c/data.ts`):
  it refuses an end date > **2023-12-29** before opening the file, streams the CSV with the shared `parseMinuteBar`,
  and **stops reading at the first row whose time ≥ the end's UTC midnight + 2 days** (rows are strictly
  time-ordered; the shared loader would keep the same rows but parse the rest of the file). The retained ticks go
  through the shared `groupMarketSessions` and `selectRunSessions` (partition `training`, access `optimization`) and
  `fixtureDataset`, so the dataset is the one Stage 1b used. **Equivalence proof:** for every history end the
  loaded-bar sha256 must equal Stage 1b's sealed door value (`research/study3-vgt-momentum-stage1b/results/records/
  audit.json` `door.<history>.loadedBarsSha256`); a mismatch is an `audit` failure. The record also holds the sha256 of
  the bytes consumed before the stop row (the file prefix) and the stop row's timestamp; the whole-file hash is quoted
  from Stage 1b's records, never recomputed. A stream read-ahead buffer may hold up to 64 KiB past the stop row; it is
  never parsed.
- **Door asserts on every load** (as Stage 1b): the last session equals the request; every retained bar's New York
  date ≤ the request; no bar or close time ≥ 2023-12-30T00:00Z. **No Stage 1c computation receives any bar dated
  2024-01-01 or later**; no 2024–2026 file, cache, summary, chart or `all` dataset is opened.
- **Doors per stage.** develop-A 2019-12-31, develop-B 2020-12-31, develop-C 2021-12-31, develop-D 2022-12-30,
  develop-H 2023-12-29; `parity` ≤ 2019-12-31; `evaluate`, `robustness` ≤ 2023-12-29 and refuse to run unless every
  develop record is sealed and verifies.
- **Calendar.** New York session dates; early closes and missing minutes as in the data (never imputed); no VGT split
  in 2016–2023. "b+1" is the next session in the data. Price-only accounting; distributions are not modelled in Stage
  1c (Stage 1b's distributions ledger is cited, not recomputed).

## 3. Execution and accounting

- **Identical to Stage 1b** (`research/study3-vgt-momentum-stage1b/ENGINE_CONTRACT.md`, sha256 `7eed7cc0…`, with
  amendment A1 items 1–7), incorporated by reference and restated where Stage 1c adds to it in
  `ENGINE_CONTRACT.md`: daily decisions at closes executed at the next session's opening trade; resting sell stops
  checked minute by minute from the fill bar (gap at the open fills at the open; no fill better than a bar's open is
  synthesised); D1's fill primitives; at most one entry per session and none in a session with an exit; 5 bps per
  side; 11% simple interest on a 365-day year on session-date differences; **net-debit account** (principal cash M,
  interest on max(−M, 0) in segments split at every fill, carried losses financed also while flat) as the primary
  account, Stage 1's fixed-slot convention reported for parity; trade interest on each trade's own principal so that
  trade paths never depend on the account's history; marks M + S p − A(s); minute marks at every minute close while
  long, at flat fills and (net-debit) at flat closes; daily drawdown on closes.
- **Sizing.** Fixed shares (Z0, $100,000 of cost per entry, no trimming) for every matrix cell, pick and executable
  path. Z1 appears only as a labelled sensitivity of the verdict path (§9.2).
- **Re-entry.** R3F (Stage 1b's template default; a campaign is alive after a non-own-OUT exit; while alive and flat a
  close above the exited trade's highest held close re-enters, an event family's fresh trigger also re-enters) for
  every cell. Re-entry rules are not searched in Stage 1c (Stage 1b found them rarely binding; disclosed).
- **New in Stage 1c:** the three protection rules (§4.3, `ENGINE_CONTRACT.md` §11), the exit family XN
  (`ENGINE_CONTRACT.md` §12), the account-level loss record and its boundary policy (§8.2, contract §13), overlay
  counters (contract §14), the stricter data door (§2).
- **Ledger identities** (i)–(vii) of Stage 1b PROTOCOL §3.2 are checked on every sealed ledger.
- **Drawdown reporting.** $ and % of the $100,000 nominal basis, peak/trough times, minute and daily; window DDs
  restart at the boundary mark; chained paths carry the peak. A mark decline is never called a loss of principal.

## 4. Mechanism catalog (details, provenance and dependencies: `MECHANISM_CATALOG.md`)

### 4.1 Entry families (Stage 1 `src/study3-vgt-momentum/signals.ts`, imported unchanged)

**Inclusion rule (predeclared, applied before any Stage 1c outcome):** all seven mandatory families (E06 calm
advance, E05 rising floor, E03 directional efficiency, E08 compression → expansion, E02 financing-hurdle drift, E04
CUSUM, E11 durable permission) plus **every other distinct Stage 1 momentum family that the engine executes**: E01 peak
proximity, E07 breakout acceptance, E09 upward trailing buy (intraday), E10 breakout trailing buy (intraday), E12
shallow-pullback continuation. Twelve entries. C-SMA, C-DON, C-TSM, C-AL(R) are controls, not matrix entries. No
entry is added or removed after an outcome. Boxes, quanta, defaults: Stage 1's (`MECHANISM_CATALOG.md` §2). Every
family has an own OUT (level state OUT; event `out` array or recorded structural level; intraday `out`).
Entry families are never combined with each other (no AND/OR of entries).

### 4.2 Exit families and own-OUT contracts

Thirteen families, all position-dependent rules on raw prices, each pairing with every entry: the eleven Stage 1b
optimised families **XF** (hard + trail; TPL with own OR), **XV** (volatility trail, ratcheted), **XS** (rising-floor
structural, armed, emergency hard stop), **XT** (two-layer: catastrophic hard + trend low + profit ratchet), **XRP**
(staged price profit retention = Stage 1's X5a family), **XRD** (dollar giveback), **XD** (price × trend damage,
AND/OR/regime-mode, catastrophic trail), **XP** (financing-aware stall), **XO** (own-OUT hysteretic + catastrophic),
**XE** (exposure-scaled trail), **XU** (stale high); Stage 1b's **XF-T** (XF on the tight trail box 0.03–0.12, the
D1-magnitude unconditional trail); and the new **XN** (D1-style profit-conditional trail: Hh(1 − t) active only when a
sale at that level is net-profitable after the trade's interest, re-evaluated each close; plus an always-on hard stop
E(1 − h); t 0.03–0.15 default 0.073 = D1's registered value, h 0.05–0.40 default 0.40). Boxes (`own` excluded) are
Stage 1b's (`src/study3-vgt-momentum-stage1b/catalog.ts`), quantum 0.001 for fractions (0.1 percentage point).

**Own-OUT contract (structural, not searched):** for every family except XO, `replace` (own 0: the exit family alone
decides) and `or` (own 1: also exit at the next open when the entry's own OUT holds at a held close — Stage 1's TPL
convention); for XO the only contract is `retain` (the source family's own OUT is the exit, with a catastrophic trail).
A trade exits once: close-decided reasons have the frozen priority own out > trend > damage > structural > stale >
max hold > stall; resting stops act intraday; rule A acts at opens (§4.3). Thus 25 exit contracts.

### 4.3 The three protection rules (`ENGINE_CONTRACT.md` §11 is the operational definition)

All three are off in the baseline mask 000; each is independently optional; the mask is a structural cell coordinate
(000, 100 = A, 010 = B, 001 = C, 110, 101, 011, 111). They apply to every (momentum) trade of the policy; nothing in
them disables an entry, exit, re-entry or other rule.

- **A — maximum losing hold** (D1 `primary`'s `maximumHoldDays`, generalised). A session s is *eligible* when its first
  regular minute is at least N × 24 h of New York wall-clock after the entry fill, measured as calendar days between
  New York session dates plus the fill's offset after its session's first bar (eligible iff days(entry date → date_s)
  > N, or = N and the fill was at its session's first bar). At the opening print x₀ of every eligible session while
  long and no close-decided exit, transition or conversion is executing at that open: liquidation net
  `S·x₀(1 − c)(1 − open slippage) + trim cash − L − I_trade(s)` (sell cost included, interest through the session date;
  D1 includes interest but no fee). **If it is < 0** (strictly; a break-even holds, as D1) the position is sold.
  **Primary (executable) fill:** the next trade after the opening print — `firstTradeFrom(s, open + 60 s + delay)`,
  i.e. normally the second minute's open — exactly D1 `primary`'s fill; the resting stop stays live until then (a
  stop gap at the open takes the opening trade; a stop touched in the first minute fills first). **Idealised
  sensitivity** (`losingHoldFill: 'open'`): fill at the opening print itself (a stop gap still takes precedence at the
  same price); labelled optimistic, never a verdict input. A profitable eligible open keeps the position; **the check
  repeats at every later eligible open**, so a winner that later becomes net-unprofitable at an open is sold. Long
  profitable holds are never cut. An A exit is an own-rule exit (it can trigger B and C; the campaign stays alive as
  after a stop). Box N ∈ {3, …, 60} calendar days, integer; default 15 (the user's reference); reference points N = 15
  and N = 8 (D1) in every A cell.
- **B — post-loss cooldown.** After an own-rule exit whose trade net (proceeds − cost − trade interest) is < 0, no
  entry of the active policy (first or re-entry, close-decided or minute rule) may **fill** before session
  `exit + C + 1`: a close decision at s is allowed iff s ≥ exit + C; a minute-rule decision in session s iff
  s ≥ exit + C + 1. Decisions that arise during the cooldown are **discarded** (not queued); after the release a new
  decision is needed under the entry's own rule (a level family whose state is still IN at a flat close after the
  release decides at that close — its own rule, not a timer); campaign bookkeeping (trough, death) continues during
  the cooldown. A profitable exit (net ≥ 0) never starts a cooldown. Box C ∈ {1, …, 60} trading sessions (the data's
  sessions), integer; default 10; C = 0 is the mask-off control. Calendar-day cooldowns are not studied.
- **C — post-material-loss price recovery.** After an own-rule exit with trade net < 0 **and** gross price move
  `exitRaw / entryRaw − 1 ≤ −X` (raw fills; interest and fees excluded; a loss caused by interest alone never arms
  C), the **next** purchase of the active policy requires its *decision price* ≥ `exitRaw × (1 + Y)` in addition to the
  entry's own rule: the deciding close C_s for close-decided entries, the deciding minute's close for minute rules.
  The fill (next open, or next minute) may gap below the level; whether each fill satisfied it is recorded, never
  used to undo a decision. The anchor is **consumed by the next purchase** (any entry fill); the next own-rule exit
  then re-arms (refreshes) or clears it; a profitable exit or a losing exit with gross loss < X leaves C unarmed.
  There is no time expiry. Comparison tolerance 10⁻¹² relative at both thresholds (X inclusive). Box X ∈ [0.005,
  0.150] q 0.001; Y ∈ [0.000, 0.200] q 0.001 (Y = 0: no re-entry below the losing exit); defaults X 0.05, Y 0.05.
  **Variant C-cross** (secondary sensitivity only, §9.2): additionally requires a close strictly below the level
  after the arming exit (the exit session's close counts) before the qualifying decision.
- **B and C together:** both must hold; both are pure predicates of one decision, so evaluation order cannot change
  the fill path.

## 5. The structural matrix (`EXPERIMENT_MATRIX.json`)

- One row per `(entry, exit family, own-OUT contract, mask)`: 12 entries × 25 exit contracts × 8 masks = **2,400
  cells**, each with its searched dimensions (entry dims + exit dims without `own` + the mask's rule dims; 2–12
  dimensions), Sobol seed label, budget and status. No cell is incompatible in code or causality: every exit reads
  only position state and position-independent arrays; every entry has an own OUT; XS's floor (E05's zigzag) is
  computed independently of the entry. Required examples (brief §6) map to cells: E06×XS×101, E06×XV×111, E05×XT×011,
  E03×XRP×100, E08×XF×110, E02×XS×000, E04×XV×001, E11×XN×111 (and E11×XF-T×111), each under both own contracts.
- **Preflight equivalence audit (reported, never used to drop a cell):** (i) XO has one contract by definition (it
  *is* the retained own exit); (ii) XF-T is a sub-box of XF (kept as a separate tight-trail family, disclosed);
  (iii) per evaluated vector, a rule that never fires (A: no eligible losing open; B: no blocked decision; C: never
  armed or never blocking) leaves the path identical to the mask-000 parent — each archive row carries the rule
  counters, and each cell reports the share of its vectors on which each active rule was inert; (iv) masks are
  never pruned. Cells with no feasible point or no champion stay in every denominator with their status.

## 6. Histories and folds (frozen before any result)

| History | Development data | Evaluation window (b, e] | Label |
|---|---|---|---|
| A | 2016-01-04 → 2019-12-31 | (2019-12-31, 2020-12-31] | retrospective forward-selection evaluation; COVID decline and rebound |
| B | → 2020-12-31 | (2020-12-31, 2021-12-31] | retrospective forward-selection evaluation; bull advance |
| C | → 2021-12-31 | (2021-12-31, 2022-12-30] | retrospective forward-selection evaluation; bear-market entries |
| D | → 2022-12-30 | (2022-12-30, 2023-12-29] | retrospective forward-selection evaluation; recovery |
| H | → 2023-12-29 | none | in-sample description only |

Development metrics cover decisions from the close of 2017-01-03 to the development end (signals warm up from
2016-01-04). "Held in ≥ 3 calendar years" means every development year in A. Development runs also record each
calendar year's window increment for diagnostics; **no selection rule reads a window increment.** Fold C's training
is strictly ≤ 2021-12-31 and gives 2022 no special weight.

## 7. Search and selection (identical procedure in A, B, C, D, H; everything code-enforced)

### 7.1 Common mechanics (Stage 1b §7.1, unchanged where not stated)

Unit-cube mapping (continuous: lo + u(hi − lo) quantised; integer: min(hi, ⌊lo + u(hi − lo + 1)⌋)); Joe–Kuo Sobol
(dimensions ≤ 16, Stage 1b's generator, imported) with a seeded digital shift (seed = first 8 hex of sha256(label),
mulberry32). Labels `study3c|<history>|<cellKey>|global`, `…|local|<k>`, `…|joint|<index>`, `…|FP|<mask>|global`.
Identical quantised vectors within a cell are evaluated once (memo; duplicates counted). **Center feasibility**:
development minute DD ≤ $35,000, ≥ 6 closed trades, ≥ 3 campaigns, held at a close in ≥ 3 calendar years, net > 0.
**J33** of a center: the center plus 32 draws uniform in ±10% of each continuous/integer range (discrete dimensions —
binaries and categoricals — fixed), seeded by its joint label; plus a 10 bps evaluation of the center. φ = share of
the 33 with net > 0 and minute DD ≤ $35,000. **RoD** = median over the 33 of net / max(minute DD, $10,000); **NET** =
median net. A cell's **RoD champion** is its best-RoD scored center with φ ≥ 0.75 and 10 bps net > 0 (ties: lower
index); likewise the **NET champion**. `distinctBest(rows, a, b)`: feasible points, alternately best by net and by
center RoD, trade-path-distinct, until a + b.

### 7.2 First pass — every cell, fair coverage

Per cell: 256 Sobol points (indices 0 … 255) + reference points (R0 = every default, index 9000; in A cells R0 has
N = 15 and R8 = R0 with N = 8, index 9001) → `distinctBest(·, 1, 1)` → up to 2 centers × J33 (draw j of center i has
index 10⁶ + 1000 i + j; the 10 bps evaluation is the center itself at 10 bps). Planned 258 + 66 = **324** per A cell,
**323** otherwise. The coverage floor: no cell is skipped or discarded before its first pass, whatever its defaults
earn. Per-dimension coverage (distinct values per dimension) and duplicate rates are recorded.

### 7.3 Deep refinement — training-only allocation, matched across masks

From the first pass of the same history: a **pair** is (entry, exit contract). Pair RoD score = max over its 8 cells
of the cell RoD champion score; pair NET score likewise; pair 000 score = its mask-000 cell's RoD champion score.
Deep pairs = (i) the 12 best pairs by RoD score with at most 3 per entry family and 3 per exit family (a pair over a
cap is skipped and the next taken), ∪ (ii) the 4 best pairs by 000 score not already chosen, ∪ (iii) the 6 best by NET
score not already chosen (caps 3/3 within the list). Pairs without the relevant champion are ineligible; fewer pairs
are taken if fewer qualify (recorded). **All 8 masks of every deep pair are refined with the same budget**: 1,024
further points of the cell's own Sobol sequence (indices 256 … 1,279 continue it; no repeat of first-pass points),
then local refinement (4 seeds = `distinctBest(all points of the cell, 2, 2)`, 64 Sobol points each in ±10% of each
continuous/integer range, discrete fixed, label `…|local|<k>`, indices 4000 + 64k + j), then a shortlist `distinctBest(all, 4, 4)` → 8 centers × J33 (centers
already scored are memo hits). Joint search over entry, exit and rule dimensions throughout. Planned **1,544** per
deep cell; ≤ 22 pairs → ≤ 176 deep cells. A deep cell's champions are over all its scored centers.

### 7.4 Fixed-parent ablation (attribution)

Parent = P\*-000 (§7.5). For each of the 7 non-zero masks: entry and exit parameters fixed at the parent's; only the
mask's rule dimensions searched: 64 Sobol points (label `…|FP|<mask>|global`, indices 6000 + j) + references (rule
defaults, index 9000; N = 8 in A masks, index 9001) → `distinctBest(·, 1, 1)` → J33 over the rule dimensions only → RoD champion **FP-m**; without a champion FP-m = the parent unchanged
(logged "rule rejected in training"). Planned ≤ 132 per mask.

### 7.5 The history's picks (sealed in its develop record before any evaluation window is loaded)

- **P\*** (primary, binding): the deep cell RoD champion with the highest RoD score (ties: lower cell index).
- **P\*-NET** (predeclared alternative selector, profit-oriented): the highest NET champion score among deep cells.
- **P\*-m** for each mask m (8 picks): the highest RoD champion among deep cells of mask m. **P\*-000** is the
  pure-momentum control selected by the identical procedure.
- **FP-m** (7): §7.4.
- None defined → the window's policy is C-IDLE (S1: flat from b+1; S2: the open position runs to its own exit).

### 7.6 Budget (code-enforced; cap = plan)

Per history: first pass 1,200 × 324 + 1,200 × 323 = **776,400**; deep ≤ 176 × 1,544 = **271,744**; fixed-parent ≤ 7 ×
132 = **924** → cap **1,049,068** per history, **5,245,340** for the five. Measured synthetic timing 5–10 ms per run
per thread (E09 ≈ 20 ms) → ≈ 0.5 ms per evaluation on 14 worker threads; expected wall time ≈ 1–1.5 h for all develop
stages. `evaluate` and `robustness` have planned counts computed from their enumerated runs and refuse to exceed them.
A stage that cannot finish for machine reasons is not sealed; incomplete coverage is reported as such. Every
evaluation is archived (cell, stage, index, vector, net, interest, price gain, friction, trades, closed trades,
campaigns, re-entries, years held, minute and daily DD, Ḡ, peak G, sessions long, worst/best trade, exit-reason mix,
rule counters, yearly increments, path hash); archives are gzip JSONL written beside the record, git-ignored when
larger than 40 MB (their sha256 in the record; regenerable by rerunning the stage on a fresh tree), with per-cell
summaries and every scored center committed.

## 8. Executable paths and the transition policy

### 8.1 S1 primary (Stage 1b §5.2)

One account, flat at the close of 2019-12-31 with the fold-A pick; at each boundary b (2020-12-31, 2021-12-31,
2022-12-30) the pick sealed with data ≤ b becomes active (S1: a held position is sold at b+1's opening trade unless
the new pick is the identical policy; a flat account adopts at b's close). No position, stop reference, campaign or
pending order is inherited from a policy that was not active. S2 (continue-old) and S3 (netted re-entry) are labelled
sensitivities.

### 8.2 The loss record across boundaries

The account-level loss record (the last own-rule exit: session, raw entry and exit, trade net, C-consumed flag) is
**account memory: it persists through a boundary** and the new policy applies its own B and C parameters (if its mask
has them) to it. Transition and conversion exits never write it; any fill consumes C. Rationale: the record describes
the account's realised trade failure and the market price at it, both known at the decision; resetting would let a
policy switch erase a just-realised loss. Sensitivity **Π1-reset**: the record is cleared at every boundary.

## 9. Evaluation (stage `evaluate`, after every develop record is sealed)

### 9.1 Paths (net-debit; flat at 2019-12-31; to 2023-12-29; windows at the three boundaries)

- **Π1** = S1 path of P\*_A … P\*_D — **the verdict object**.
- Π1-S2, Π1-S3 (transition sensitivities); Π1-reset (§8.2); Π1-open (A idealised same-open fill); Π1-Z1 (monthly trim
  to $100,000 on every pick: exposure sensitivity, not a selection); Π1-cross (C-cross on picks whose mask has C).
- **Π-NET** (P\*-NET picks); **Π-m** for all 8 masks (Π-000 is the controlled pure-momentum comparison); **Π-FP-m**
  (7); the static path (P\*_A held 2020–2023).
- **Controls**, flat-start continuous and annual-reset (S1 forced liquidation at each b+1, re-entry on the control's
  own signal): C-AL, C-ALR (monthly $100,000 always-long), C-ALZ1, C-SMA (simple trend filter), C-DON, C-TSM, C-STOP
  (fixed hard 8% + trail 10% with R3F), C-IDLE.
- **Frozen prior references re-simulated in the Stage 1c engine with every rule off** (parity anchors that must equal
  their sealed values within $10⁻⁶): Stage 1b Π1 (S1; +$12,573.36, DD $42,881.89) and Stage 1's picks as Stage 1b's
  repaired S1 executable path (+$37,834, DD $36,672), from their sealed keys.
- **Exposure-matched benchmark** (Stage 1b): B_F = f_MV,F(Π) × (W_F + I_F)(C-ALR flat-start) − I_F(Π), f_MV = Ḡ_F/B₀;
  diagnostics: principal-day matched and drawdown-matched C-ALR (labelled).

### 9.2 The 2022 emphasis (all labelled; nothing here feeds a selection)

(a) Fold C: W_2022 of Π1 from a pick made through 2021, its trades and rule events. (b) **Counterfactuals on Stage
1b's three losing 2022 entries:** Stage 1b's Π1 schedule re-run with each non-zero mask added to every pick at
reference values (A: N = 8 and N = 15; B: C = 10; C: X 0.05, Y 0.05; and their combinations), each trade classified
blocked / exited sooner / delayed / unchanged / newly entered — a **hindsight diagnostic**. (c) The best 2022 window
increment reached by any develop-D or develop-H archive point (continuous runs, 2022 inside their development
data), per mask — a **forbidden-for-selection upper-bound diagnostic**. (d) Attribution of Π1's 2022 result: timing,
exposure (Ḡ, sessions long), single prevented trade, non-participation. (e) Profit given up in 2020, 2021 and 2023
versus Π-000, Stage 1b Π1 and C-ALR.

## 10. Neighbourhoods, robustness, stresses (stage `robustness`)

- **OAT** (±1, ±2 steps of 5% of each continuous/integer range, integers ≥ 1 step; discrete dimensions flipped; a
  point clamped onto the center is dropped) and **J128** (128 draws ±10%, discrete fixed, seed
  `study3c|<policyId>|J128`) on development data for P\*_A … P\*_D, P\*_H, P\*-NET_H, P\*-000_H; and, labelled
  post-selection, J128 of each fold pick over its next window (continuous run). Reported: min, P10, P25, median, P75,
  P90, max of net; shares net > 0, DD ≤ $35,000, both; path-distinct shares; the N, C, X, Y OAT profiles separately.
- **Perturbed executable paths** (rubric f): 128 S1 paths, path j replacing each fold pick by its j-th J128 draw; also
  for Π-000 and Π-NET (descriptive).
- **Stresses** of Π1, Π-000 and P\*_H (continuous 2017–2023, in-sample): costs 0/2/10 bps; rates 8%/14%; stop slippage
  10/25/50 bps; entry slippage 10/25 bps; opening slippage 50 bps (gaps and opens); delays +1/+5 minutes (A's fill
  moves with them); missing bars 1%/5% (seeded); A idealised same-open fill.
- **Trend legs** (Stage 1 §13: zigzag on closes 10% reversal, up-legs ≥ 15%, 2017-01-03 → 2023-12-29; legs inside
  2020–2023 for paths): capture, entry delay, idle share, lost post-exit gain, false-entry rate (entries whose trade
  net < 0).
- **H Pareto set** (descriptive): deep-cell RoD champions non-dominated on (J33 median net ↑, J33 median minute DD ↓,
  φ ↑); separated from binding picks.

## 11. Verdict rubric (binding; labels applied in this order)

W_F = Π1's liquidation-mark increment in window F (A 2020, B 2021, C 2022, D 2023); "positive" = W_F ≥ +$2,000.

1. **Invalid** if (a) fails: any parity failure (fast = reference; fast with rules off = Stage 1b engine; the two
   prior paths re-simulated off their sealed values), any §3 identity on a sealed ledger, any executability assertion
   (a position before its policy was active outside S2, two entries in a session, an entry in an exit session, a
   same-close fill, an entry that violated an active B or C restriction), any door refusal or retained bar past the
   cap, any `evaluate` guard (prefix invariance, poisoned future, truncated-run prefix, b-marks).
2. **Insufficient evidence** if (e) fails: < 6 exits by the policies' own rules (transitions, conversions and the end
   excluded); < 4 first entries not labelled `adoption`; such first entries in < 3 windows; long at a close in < 3
   windows; long at < 20% of the session closes 2020–2023; P\* undefined in ≥ 2 folds.
3. **Risk-incompatible** if (c) fails: any window minute DD > $35,000 or the chained minute DD > $35,000.
4. **No demonstrated edge** if any of (all failed items listed):
   - (b) Σ W_F < +$20,000, or positive in < 3 windows, or min W_F < −$15,000;
   - (d) **2022 protection with trend retention**: W_C(Π1) < W_C(Π-000) + $5,000 while W_C(Π1) < 0, or W_A + W_B +
     W_D (Π1) < 0.75 × max(0, W_A + W_B + W_D (Π-000));
   - (g) Σ (W_F − B_F) < +$10,000, or W_F − B_F ≥ +$2,000 in < 2 windows, or for any C ∈ {C-SMA, C-DON, C-TSM}:
     Σ W_F − max(Σ W(C flat-start), Σ W(C annual-reset)) < +$5,000;
   - (f) < 75% of the 128 perturbed paths have Σ W > 0 and chained minute DD ≤ $35,000, or their median Σ W < 50% of
     Π1's;
   - (h) under any of 10 bps, 14%, 25 bps stop slippage, 50 bps opening slippage, +1 minute: Π1's Σ W < +$10,000 or
     its chained minute DD > $35,000;
   - (e2) Σ W − the largest campaign's contribution < +$5,000, or Σ W − the largest up-leg's contribution < +$5,000, or
     Σ campaign giveback / Σ campaign peak P&L > 0.5 over campaigns with peak ≥ $5,000;
   - or, with every Π1 item passing, (b), (c) or (g) fails for Π1-S2 → "no demonstrated edge
     (transition-convention-dependent)".
5. Otherwise **historically promising but unvalidated** (never deployable, never registered), qualified
   "(objective-dependent)" if Π-NET, assessed on (b)–(h) with its own perturbed paths and stresses, would not also
   reach this label.

**Protection-value statements** (predeclared descriptive conclusions, beside the label): "protection improved the
executable procedure" iff Σ W(Π1) − Σ W(Π-000) ≥ +$5,000 and chained DD(Π1) ≤ chained DD(Π-000); "the rules improved a
fixed parent" for each FP-m with Σ W(Π-FP-m) − Σ W(Π-000) ≥ +$5,000 and DD not higher; "2022 improved with trend
retention" iff item (d) passes for Π1 against Π-000 and W_C(Π1) − W_C(Π-000) ≥ +$5,000. Labels for every other path
(Π-NET, Π-m, Π-FP-m, sensitivities, static, Stage 1/1b references) are computed descriptively on the items they
support. **Nomination:** only if Π1 is "historically promising" and P\*_H exists is P\*_H (its sealed policy) nominated
for a later, separately authorised frozen 2024–2025 test; otherwise "none". No descriptive path, Pareto member, mask
pick or control can be nominated. Every report quotes the total number of configurations evaluated.

## 12. Stages, parity, tests (write-once, in order, code-enforced)

| Stage | Content | Door |
|---|---|---|
| `audit` | bounded-loader equivalence (loaded-bar hashes = Stage 1b's per history end), data QA, protected-input manifest (Stage 1, Stage 1b, D1 files, config, data metadata), baseline `npm test` status | ≤ 2023-12-29, no strategy run |
| `freeze-protocol` | sha256 of PROTOCOL.md, ENGINE_CONTRACT.md, EXPERIMENT_MATRIX.json, MECHANISM_CATALOG.md, the brief, review dispositions | none |
| `parity` | (a) fast with rules off = Stage 1b fast engine (imported) on every exit family default × 12 entries, 64 random vectors per family, controls, schedules S1/S2/S3, stresses, both financing modes; (b) fast = independent reference (written in a separate agent context from ENGINE_CONTRACT.md only) on every mask × representative cells, ≥ 64 random full-box vectors per mask, all three A fill modes/delays, S1/S2/S3 and reset/persist schedules, both financing modes; (c) rule branch-coverage counters > 0; (d) prefix invariance / poisoned future at 2017-12-29, 2018-12-31; records counts and |Δ| only, no P&L level | ≤ 2019-12-31 |
| `freeze-code` | sha256 of the import closure of `src/study3-vgt-momentum-stage1c/main.ts` (incl. imported Stage 1, Stage 1b, `src/lib` files, worker) + tests + package files; refuses a failing parity record or a different manifest | none |
| `develop-A` … `develop-D`, `develop-H` | §7 | development end |
| `evaluate` | §8, §9 with guards (prefix invariance and poisoned future at each boundary, b-marks of every pick, executable-path prefix identity, fast = reference on every Π path) | ≤ 2023-12-29 |
| `robustness` | §10 | ≤ 2023-12-29 |
| `analysis` | §11 rubric, ledgers, tables from sealed records only | sealed records |

Tolerances: identical trade paths (entry/exit session and bar, kind, reason, stop component, rule events); |Δ| ≤
$10⁻⁶ on money fields, daily marks, end marks, drawdowns, dollar-days. **Tests** (`src/study3-vgt-momentum-stage1c/
tests/`, synthetic sessions only, expected values in closed form where stated in `ENGINE_CONTRACT.md` §15): every
item of brief §8 — A on a Friday entry with N = 8 and N = 15 across weekends, holidays and early closes, first
eligible open, net just above / below zero after costs, profitable then losing at a later open, stop-gap vs A at one
open, stop in the first minute vs A, open gap below the stop, intraday-entry eligibility, no doubled interest, both
fill modes; B with C = 0, repeated losses, loss → profit, a setup during the cooldown, a pending order, a level IN
state through the release, the annual boundary (persist and reset); C's gross vs net trigger at differing interest,
interest-only loss, X exactly, decision exactly at / under / above exit(1+Y), gap below the level, consumed and
refreshed anchor, quantisation, B + C order invariance; rules off = Stage 1b bit-for-bit; all eight masks run; the
stitched S1 history without double counting; the door refusal and the bounded read. Every record holds git HEAD,
porcelain status, the diff since `2a7996dd` outside the Stage 1c namespace (must be empty), both freeze hashes, its
door, payload sha256s, planned and used counts, runtime, workers, peak RSS and its body hash, and verifies its
predecessors. A post-freeze defect is fixed only by an append-only amendment, a re-hashed code freeze and reruns of
every affected stage with original seeds (`<stage>-rerun-<n>`), keeping both records.

## 13. Reviews, disclosures, limits

At least two independent read-only methodology reviews precede the freeze; an independent read-only code-and-evidence
audit follows the results; all kept verbatim with dispositions in `reviews/`. Limits: one ETF, one secular bull market
with three declines; dependent annual windows; inspected history and designer knowledge (§1); no bid/ask, margin-call
or forced-liquidation model; price-only; simple interest; minute-close drawdown sampling; the next-minute fill of A
is a proxy for a market order after the open; parameter draws are not independent market samples; 2,400 cells × ~324 +
deep refinement ≈ 5 million configurations — large multiplicity and few windows; correlated configurations are not
independent evidence; inert rule dimensions inflate neighbourhood robustness (reported via the rule counters and
path-distinct shares).
