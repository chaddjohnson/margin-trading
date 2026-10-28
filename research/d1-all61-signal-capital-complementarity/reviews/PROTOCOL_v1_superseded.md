# Protocol — all-61-ETF D1 signal timing, opportunity overlap and shared-capital complementarity (Study 2 of 3)

Study `d1-all61-signal-capital-complementarity-v1`. Brief: `brief/STUDY_2_BRIEF.md` (verbatim copy, sha256
`d0db822a…3d043`). Branch `research/d1-all61-signal-capital-complementarity` from `a37feae`. Code
`src/d1-signal-capital-complementarity/`. This protocol is frozen by `PROTOCOL_FREEZE.json` before any Study 2
result-bearing output exists; the code is frozen after Stage 2 (instrumentation and parity), before Stage 3.
Amendments after the freeze are additive, dated, labelled (correction / exploratory / reporting-only) and logged in
§14 and `results/amendments.jsonl`; none may change a primary decision rule after a result-bearing output exists.

## 0. What is and is not claimed (stated before any outcome)

- The study is **diagnostic**. It asks *when* existing, fixed D1 mechanisms offer opportunities across the 61 audited
  ETFs and whether any of those opportunities are economically useful **under one shared $100,000 slot**. It does not
  search, tune or promote any parameter vector, priority, allocator rule or pool. Nothing it finds changes B4, B5,
  any phenotype, default, prospective protocol or deployed configuration.
- Evidence level: **retrospective, inspected history** (2016-01-04 → 2023-12-29). Chronological cutoffs protect
  execution causality and the selection of replay candidates; they do not restore independent statistical evidence.
  No bar after 2023-12-29 is read by any Study 2 run. Forward observations: 0.
- "Causal" (Level C) means *simulator counterfactual under the frozen engine's assumptions*, not proof of future
  returns.
- **Designer's prior knowledge (disclosed).** Before writing this protocol the designer read: Study 1's outcome and
  reports; the standalone audit's verdicts (EWW the only weak lead; GDX "one flag away"); the ranked-preemption and
  diverse-pool fold results, including B4/B5's fold-A/B windowed figures (B4 +$62,161 / +$112,826, B5 +$46,506 /
  +$170,997) and the whole-run fold-a validation figures; the seven-ETF daily-proxy screen (All-lowDd occupied 51% of
  sessions; all seven fail economics); the portfolio-aware opportunity map, including the published full-path
  results of the unchanged D1 vector (= VGT `primary`) on XOP (+$48,199), GDX (+$3,992) and XLE (−$42,190) against S0
  (= B4) on training at 5 bps, and B5's GDX book having been selected by a full-pool-replay objective; the B4/B5
  robustness audit (portfolio DD, ablations, regime tables); and a B4 training run reproducing the published S0 anchor
  (71 lots, $242,196.01). The designer has **not** seen, before this freeze: any View U result for any ETF other than
  the published VGT/XOP/GDX/XLE figures, any View P timing/occupancy result, B5's training-era occupancy timeline,
  any 61×61 matrix, or any Study 2 screen or replay. The 61-survivor universe, the incumbents and the regimes were all
  chosen with knowledge of 2016–2026 markets (survivorship and hindsight, §12).

## 1. Questions and hypotheses (no outcome presumed)

Primary question: of the 61 ETFs, do any provide **genuinely distinct and economically attractive D1 opportunities
when the existing B4/B5 shared slot is idle, or when their signals could justify competing for it**, rather than
dipping in the same market shocks?

- **H0** Most lucrative deep-dip signals cluster in a few broad market-shock regimes; apparently differentiated ETFs
  add little independently fundable opportunity.
- **H1** Some ETFs produce independent calendar-time D1 opportunities, but their post-interest economics in idle
  periods may be weak.
- **H2** Some ETF phenotypes signal coincident with existing books yet improve full-path shared-pool P&L by displacing
  less valuable trades; first-order displaced-trade arithmetic may give the wrong sign.
- **H3** Some opportunities appear only under ETF-specific (fitted) phenotypes; the common-rule control shows whether
  the result reflects parameter fitting rather than asynchronous price behaviour.
- **H4** Complementarity differs between rebound (fold A, 2020-07 → 2021-12) and persistent-decline (fold B,
  2022-01 → 2023-12) regimes; apparent diversification can vanish in a common crisis.

Permitted outcomes (§9.3): `no demonstrated economically useful complementarity`, `limited / regime-dependent
exploratory complementarity`, `several credible exploratory complements`, `inconclusive`.

## 2. Invariants and isolation

1. Unchanged and never written: `config/`, `data/` (canonical minute files, `partitions.json`), every prior
   `research/` folder, the frozen engine and every file bound by `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json`
   (including `src/app.ts` and its transitive imports, `package-lock.json`, the `pools` script line and the `imports`
   map). A protected-input manifest (sha256 of every bound file, the pool and phenotype configs, the source records
   this study reads, the 61 data files) is written in Stage 0 and re-verified by `verify` and at Stage 6.
2. The study **imports** the frozen engine (`src/portfolio-aware-d1/nbook/engine.ts` `runNAllocator`, the frozen
   `ShadowBook`, `EntryMachine`, `ExitManager`, `FixedLedger`, the shared loader `loadNUniverse`) and the completed
   audits' helpers (`src/b4-b5-robustness/run.ts`, `src/d1-standalone-opportunity-audit/run.ts`, `events.ts`) read-only.
   Its only addition outside its own folders is one `package.json` script line `d1-signal-complementarity`
   pointing at `src/d1-signal-capital-complementarity/main.ts` (not `src/app.ts`).
3. No network, download, broker, order, `.env` or credential access. Local minute files and existing audited metadata
   only.
4. No D1 reoptimization, joint search, parameter or priority tuning, altered stops/exits/activation, altered
   allocation priority, or promotion. Every vector is a stored, pre-existing one.
5. No Study 3 work of any kind.

## 3. Data, universe, windows and doors

### 3.1 Universe

The 61 eligible ETFs of `research/d1-ranked-preemption/results/audit/universe.json` (all 2016-01-04 → 2026-10-13,
2,710 sessions, 0 missing): AGG DBC EDV EEM EFA EMB EWJ EWW EWY EWZ FXI GDX GLD HYG IAU IBB IEF IEMG IGV IJH IJR ILF
INDA IWD IWF IWM IWN IYT KBE KIE KRE LQD MTUM QUAL RSP SHY SLV SMH SPLV TIP TLT USMV VGK VGT VIG VOOG VPU XBI XHB XLB
XLE XLF XLI XLK XLP XLU XLV XLY XME XOP XRT. Every loaded file must hash to that audit's `dataSha256`. Per-symbol
flags carried into every table: the standalone audit's F7 liquidity/coverage flag (DBC EDV ILF IYT KIE VOOG VPU), the
audit's coverage median and median dollar volume, registered splits inside the training era (EWJ 2016-11-07, IJR
2017-01-19, KIE 2017-11-30, IBB 2017-12-01, XOP 2020-03-30 1:4 reverse, IAU 2021-05-24, SMH 2023-05-05; forward-adjusted
by the shared loader), the XLF 2016-09-19 carve-out move, and price-only treatment (only VGT/VOOG distributions exist,
used only in portfolio mode for the core and open VGT lots, the frozen convention). Thin symbols are flagged, never
dropped. Exposure clusters for §9 are the audit's `category` field: rates-credit (9), real-assets (5), non-us (11),
sector-industry (23), factor-size (13).

### 3.2 Windows (New York trading dates; accounting from the 2016-01-04 close; arming from 2017-06-15 for every book)

| Key | Role | Decisions counted | Data end (loader stops) | Window marks |
|---|---|---|---|---|
| `T` | training era, descriptive | sessions 2017-06-15 … 2023-12-29 | 2023-12-29 | whole run |
| `A` | fold A evaluation (rebound) | 2020-07-01 … 2021-12-31 | 2021-12-31 | (2020-06-30 close, 2021-12-31 close] |
| `B` | fold B evaluation (decline/recovery) | 2022-01-03 … 2023-12-29 | 2023-12-29 | (2021-12-31 close, 2023-12-29 close] |
| `preA` | fold A screening (ex ante) | 2017-06-15 … 2020-06-30 | **2020-06-30** | whole run to the cutoff |
| `preB` | fold B screening (ex ante) | 2017-06-15 … 2021-12-31 | **2021-12-31** | whole run to the cutoff |

Every run is **one continuous run from 2016-01-04** to its data end (the source convention: no reset, no dropped
open position at a window start). A window's figures are increments of that run over the window; Level D windows use
the run whose data end equals the window's (A uses runs ending 2021-12-31; T and B runs ending 2023-12-29). A lot or
trade open at a data end is marked at its **liquidation value** (exit friction and interest to that session; the
source Stage A definition) for net figures and at the engine mark for drawdowns.

### 3.3 Doors (`doors.ts`; each refuses before a byte is read)

- Every load: partition `training`, access `optimization` (refuses holdout/final/all), explicit `endDate` ≤ the
  door's cap, audited file hashes, loaded last date asserted equal to the requested end.
- Caps by provenance: View U and the incumbents ≤ 2023-12-29; View P fold-a vectors ≤ **2021-12-31**; View P fold-b
  vectors ≤ 2023-12-29; View P final-window vectors ≤ 2023-12-29 (their own training span, in-sample context only).
- Screening (`preA`/`preB`) loads end exactly at the cutoff; the screen code receives only those runs.
- B4/B5 full-history figures through 2026-10-13 are cited only from published records, never re-run.

## 4. Views

- **View U (uniform-rule control, mandatory):** the registered VGT `primary` vector (grid `216.3.73.8.74.29.90.60`:
  X 21.6%, Y 0.3%, stop 7.3%, hold 8, L 74, buffer 2.9%, P 9.0%, W 60; `config/phenotypes/D1/VGT.json`, candidate
  `d1-ebc9f639b3`) applied unchanged to each of the 61 ETFs. A descriptive counterfactual, not a claim that the
  vector suits other assets. Runs: data ends 2020-06-30, 2021-12-31 and 2023-12-29.
- **View P (period-correct source phenotypes, mandatory):** per ETF, the source's sealed fold representative (Study
  1's A0) — fold-a vectors for window A (and `preA`), fold-b vectors for window B (and `preB`) — **only where the sealed
  status is `survivor` (nominee)**: 49 fold-a and 54 fold-b nominees. `research/d1-ranked-preemption/standalone/<fold>/
  <SYM>.json` (representative grid) is cross-checked equal to Study 1's `results/libraries/{A,B}/SELECTION.json`
  `selections.ARCH.<SYM>.a0.nominee`. No nominee (fold A: AGG EEM EWZ IEF INDA IWN KIE SHY SPLV TIP XLE XOP; fold B:
  AGG HYG IEF IEMG SHY SPLV TIP) ⇒ the row is `NA (no nominee)`; no substitution. **P-final** (optional, segregated,
  in-sample context): the final-window survivors (53) on window T only; never used in any Level C replay, screen or
  verdict. The source-library alternates are **omitted** (avoids 61×4 winner mining).
- **View I (incumbents, mandatory):** B4 and B5 exactly as `config/pools/B4.json`/`B5.json` (books, phenotype hashes,
  shadow policy, $100,000 fixed slot, 11% simple, 5 bps/side, stops at the stop, arming 2017-06-15), S = VGT
  `primary` alone, C0 = the $300,000 60/40 VOOG/VGT core with no book (portfolio mode). B5's GDX book
  (`d1-51ea8d4bd6`, grid `274.4.71.18.100.36.191.81`) is **not** the GDX A0 of either fold.
- **Not a new candidate for its own pool:** a pool's members (B4: VGT XBI XRT KRE; B5: + GDX) are never Level C
  candidates for that pool. GDX is eligible as a B4 candidate (a different vector from B5's; labelled). B4 → B5 (adding
  B5's own GDX book) is reported as an **incumbent diagnostic**, not a candidate. VOOG is excluded from Level C (it is
  the portfolio core; the frozen engine has no tested convention for a VOOG book beside the core, and it is
  F7-flagged); it is fully included in Level D.

## 5. Instrumentation (concepts, ledgers, parity)

### 5.1 The observer

`observer.ts` steps one frozen `ShadowBook` over its own symbol's sessions in exactly the engine's per-bar order
(beginSession; per bar: exitAt → close, fillAt → open, processBar → commit; at the close: exitAt, fillAt; afterSession;
finish), with every signal committed (shadow semantics; a one-book pool grants every signal). It changes no decision;
it only reads the book's state. It records, per symbol and run: every **setup** (arming = concept 2: id, kind
deep/continuation, arming minute and price, reference high, anchor, status, trailing low), every **decision** (concept
3: confirming minute, decision time = minute end, price), the **eligible next fill** (concept 4), the **virtual lot**
(concept 5: fill, exit, reason, execution, stop, interest, gross, friction, net, MAE/MFE via the audit's
`excursionOf`), continuation windows (concept 8: opened by a profitable exit, start session, expiry), and the open
lot at the data end. **Parity (fail closed):** the observer's trades equal the frozen engine's one-book run trades
field for field (ids, times, prices, reasons, interest, net) for every symbol and view at every cost run.

### 5.2 Funded and refused (concepts 6, 7)

For B4/B5 and every Level C scenario the frozen engine's own `signals` (granted/refused, reason, holder, same-minute
count) and `lots` are the funded/refused record. A refused decision never fills (shadow semantics: the book's virtual
lot proceeds; the pool records nothing). `gate.ts` re-derives the fixed-mode funded set from the books' virtual trades
by the frozen rule — decisions in (decision time, alphabetical symbol) order; granted iff the decision time is later
than the exit time of the last granted trade (a lot exiting at bar start E frees the slot for decisions stamped
> E; a reservation holds from its decision to its fill) — and must equal the engine's funded set exactly for every
baseline and scenario run (fail closed). It is the first-order and attribution instrument, never a substitute for the
engine.

### 5.3 Ledgers (machine-readable, per view/window/symbol)

Setup ledger (armed episodes), decision/lot ledger (decision ET, fill ET, exit ET, prices, reason, setup kind, gross,
interest, friction, net, MAE/MFE, days held, open-at-end), continuation-window ledger, B4/B5 funded-lot and signal
ledgers (granted/refused, holder, reservation vs lot), baseline occupation intervals, first-order classification
ledger, event-family membership. ET times are written as New York wall clock with the UTC epoch alongside.

## 6. Level D — descriptive, all 61 (non-causal as a pooled intervention)

### 6.1 Time measure

All interval measures are in **regular-session minutes**: session s spans [open_s, close_s) with close_s the
dataset's session close (16:00, or 13:00 on early closes) and open_s = 09:30 New York of the same date; every symbol
shares one calendar. Interval endpoints are mapped to cumulative session-minute coordinates; lengths and
intersections are computed there. An interval still open at the data end ends at the last close.

### 6.2 Intervals per trade and per setup

- Armed interval: [arming decision time, signal decision time) (or to the data end if never triggered).
- Capital-holding interval: [decision time, exit time] (the pending reservation plus the lot) — what blocks a shared
  slot. Lot-held interval: [fill time, exit time).
- Window clipping: intervals are clipped to the window's [first open, last close]; decisions belong to the window of
  their decision session.

### 6.3 Ordered pair metrics (i, j) per view-window (`pairs.ts`)

For views U-T, U-A, U-B, P-A, P-B and P-final (context):

1. Armed: armed minutes of i; joint armed minutes (|A_i ∩ A_j|); share = joint ÷ armed minutes of i; arming episodes
   of i; episodes of i overlapping any armed episode of j; share.
2. Decision proximity at four tolerances — exact minute (equal decision time), same session, ±5 and ±20 sessions —
   by **one-to-one greedy matching**: all (a ∈ i, b ∈ j) within tolerance sorted by (|session distance|, a's time,
   b's time), accepted when neither is used. Matched count; share of i's decisions matched (denominator: i's
   decisions in the window). At ±20 sessions: median signed lag (sessions, j − i) and share of matched pairs where i
   is strictly first.
3. Capital-holding overlap: minutes of i; joint minutes; share = joint ÷ i's minutes; Jaccard = joint ÷ union.
4. Price-return correlation (secondary contrast): Pearson correlation of daily close-to-close log returns
   (split-adjusted closes) over the window's sessions.
5. Undefined values are `NA` (null in JSON), never 0: any zero denominator; correlation with a constant series. The
   diagonal is computed, not assumed (shares 1 where defined). Matrices are asymmetric by denominator; every cell
   exports numerator and denominator.

Exports: per view-window `pairs.csv`/`pairs.json.gz` (all 3,721 ordered pairs with raw counts and denominators),
matrix CSV/JSON per metric, and readable heatmap tables (SVG/Markdown) for the main metrics.

### 6.4 Events, families and regimes (`events.ts`)

- **Price-defined dip episodes (concept 1; ex post, descriptive):** the standalone audit's catalog (`catalogOf`,
  zigzag 10% reversal on split-adjusted daily closes, depth bands, major ≥ 20%, families of troughs within 126
  sessions, eligible troughs ≥ 2017-06-15), per ETF, built on each run's own data end.
- **Within-ETF signal episodes:** an ETF's decisions clustered by an anchor window: an episode starts at the earliest
  unassigned decision and contains the decisions within 20 sessions after it (no chaining).
- **Cross-ETF event families:** per view-window, all members' decisions clustered by the same anchor rule with
  w = **10 sessions** (primary; sensitivities w = 5 and 20). Each family records its span, decisions, distinct ETFs,
  and baseline-idle decisions. Aggregates count a family once, never once per ETF. "Solo" = one ETF; "market-wide" =
  ≥ 10 distinct ETFs.
- **Independent events:** among a set of families, those whose anchor sessions are ≥ 252 sessions apart (the audit's
  greedy `independentOf`).
- **Regimes:** the fixed G1–G13 calendar of `src/d1-ranked-preemption/context.ts` (G1 late-2017 calm bull … G13 2023
  H2), clipped to each window. **Broad-shock regimes** (predeclared): G2 Feb-2018 shock, G4 Q4-2018, G7 COVID crash,
  G10 2022 bear, G12 2023 bank stress; all others are off-shock. Labels are descriptive and never enter a decision.
- Leading/lagging: for matched pairs (±20 sessions), lag distributions; per ETF, the share of its families where it
  has the family's first decision.

### 6.5 Baseline occupancy and first-order classification (`occupancy.ts`)

For baseline B ∈ {B4, B5} and window W (B's run with W's data end):

- Occupancy timeline: B's funded capital-holding intervals; session-minutes held by a lot, reserved (decision → fill),
  idle; sessions with a lot at the close (comparable to the published 843 / 1,647); idle stretches (maximal idle
  intervals ≥ 1 session) and the decisions of each view falling inside them.
- For each candidate trade c (decision D_c, exit E_c, ∞ if open at the data end) and B's funded lots b (D_b, fill F_b,
  E_b): **busy** ⇔ ∃b: D_b < D_c ≤ E_b, or D_b = D_c and sym_b < sym_c (alphabetical tie order). Busy holder state:
  `reserved` if D_c ≤ F_b, else `held by lot`, with the holder's symbol, lot id and net (profitable holding vs
  loss-producing holding). **Displaced set** S(c) = {b: D_c < D_b ≤ E_c, or D_b = D_c and sym_c < sym_b}.
  **idle-clean** ⇔ ¬busy ∧ S(c) = ∅; **idle-displacing** ⇔ ¬busy ∧ S(c) ≠ ∅. Each candidate trade is classified
  against the **unchanged** baseline, independently of the candidate's other trades.
- **First-order Δ** = Σ net(idle trades of c) − Σ net(distinct b in ∪S(c)); explicitly *not* a counterfactual.
- Separate columns: independently timed (class), economically positive (net > 0), fundable (idle-clean). Per ETF:
  gross, interest, friction, net, net per occupied calendar day, worst lot, worst MAE, by class; concentration by
  cross-ETF family (largest family share of idle-clean net) and with/without the best idle-clean episode
  (sensitivity, never a disqualification).
- Mandatory per-ETF counts (U-T, U-A, U-B, P-A, P-B; both baselines): eligible dip episodes, armed episodes,
  decisions, fills, profitable/loss trades, decisions while B is flat/busy (held/reserved; during B's profitable vs
  losing holdings), idle-clean vs idle-displacing, years and G-regimes of idle-clean decisions, shock vs off-shock,
  independent idle-clean positive events.
- Contrast with the published seven-ETF proxy screen and the published opportunity map (definitions differ; §SOURCE).

## 7. Level C — exact shared-pool replays (bounded, predeclared)

### 7.1 Screen (ex ante; per baseline B ∈ {B4, B5}, view V ∈ {U, P}, fold F ∈ {A, B})

Computed only from runs ending at the fold's cutoff c_F (2020-06-30 for A, 2021-12-31 for B): the candidate's
standalone run (U vector, or P = that fold's nominee vector) and B's run. Candidate set: the 61 minus B's members and
VOOG; for P only that fold's nominees. Features over decisions in [2017-06-15, c_F] (a trade open at c_F is clipped
at c_F and valued at liquidation):

- `n_dec` decisions; `years` distinct calendar years; `n_idle`, `n_clean` (§6.5 against B's pre-cutoff path);
- `idle_net` = Σ net of idle trades; `fo_net` = first-order Δ; `sa_net` = standalone liquidation mark at c_F;
  `sa_dd` = standalone minute drawdown (engine) to c_F;
- `fam_idle` = cross-ETF families (w = 10, built on the view's pre-cutoff decisions of all its members) containing an
  idle decision of the candidate; `indep_pos` = independent events among families holding an idle decision with
  net > 0.

**Gates (all):** n_dec ≥ 4; years ≥ 2; n_clean ≥ 2; idle_net > 0; fo_net > 0; sa_net > 0; sa_dd ≤ $35,000.
**Score** among gate-passers: the mean of the four descending ranks (average ranks for ties) of n_clean, fo_net,
fam_idle and years; order by (score ascending, fo_net descending, symbol). Missing data: a candidate without a run
(no nominee) is absent; a feature cannot be missing for a candidate with a run.

**Roles (≤ 3 per B × V × F):**
- **S1** — the first screened candidate. **S2** (View U) — the second.
- **SRC** (View P, replaces S2) — the "robust source-selected" candidate: the highest-ranked symbol in the source's
  frozen fold ranking R2 (`research/d1-ranked-preemption/rankings/<fold>/R2.json`, training-only, net per occupied
  day) that is a fold nominee, not a member of B, not VOOG and not S1; selected by the source's rule, not this
  study's gates.
- **NC** (negative / timing-only control) — among the remaining candidates with n_dec ≥ 4, years ≥ 2 and n_clean ≥ 1
  that fail at least one economic gate (idle_net ≤ 0, fo_net ≤ 0 or sa_net ≤ 0): the largest n_clean (ties: larger
  n_idle, then symbol). None if no such candidate.
- A role may be empty ("no candidate qualified" is a valid result). Distinct ETFs per B × V across both folds ≤ 6
  (by construction ≤ 3 per fold). The screen is sealed (`results/screen/SCREEN.json` with its hash) before any
  replay over an evaluation window is run.

### 7.2 Replay menu and conventions

For each selected (B, V, F, candidate c): the baseline B and the scenario B + c (c's book = its view-F vector, inserted
under the frozen N-book engine's own convention: book order VGT, XBI, XRT, KRE, then the others alphabetically;
same-minute tie order alphabetical; one shared slot; shadow semantics; nothing else changed), each **one continuous
run from 2016-01-04 to window F's data end** (A: 2021-12-31, B: 2023-12-29), at:

- fixed mode at **0, 2, 5, 10 bps** per side, each **fully re-simulated** (a cost change changes stops, continuation
  eligibility and the funded path);
- fixed mode **adverse execution stress s25** (5 bps + 25 bps stop overshoot on stop exits; the existing scenario of
  `src/b4-b5-robustness/context.ts`);
- **portfolio** mode at 5 bps, frozen dividend convention ($300,000 core 60/40 VOOG/VGT, 20% of marked equity per
  funded trade), with C0 alongside.

Additionally:
- **Incumbent diagnostic:** B4 → B5 on windows T, A and B (B5's own GDX book; marginal contribution, not a candidate).
- **In-sample descriptive (View U only):** for each B, every View U candidate selected in either fold (union, ≤ 6)
  replayed as B + c over window T at 0/2/5/10 bps fixed and 5 bps portfolio. Labelled in-sample; never period-correct;
  enters no verdict (§9).
- **Published-anchor parity (Stage 2):** U-XOP, U-GDX, U-XLE added to B4 on window T at 5 bps must reproduce the
  published full-path Δ (+$48,199, +$3,992, −$42,190) and XOP's first-order counts (78 trades, 49 busy, 19 S0 lots
  displaced worth $125,958). These are reproductions of seen figures, not new evidence.
- Refused by construction: any replay past a vector's cap; any additional candidate, subset, combination,
  membership/order change; any VOOG book; any member of its own pool.

### 7.3 Outputs per replay

Window increment V (liquidation-equivalent mark at the window end − at the boundary; T: the whole run), ΔV vs the
baseline at every cost; gross, interest, friction; funded lots and refused decisions of every book; holder timeline;
**path attribution (5 bps fixed)**: lots keyed by (symbol, decision time); each lot's in-window share (its mark change
over the window, so shares sum exactly to V); ΔV = Σ scenario-only shares − Σ baseline-only shares, split into the
candidate's own lots by first-order class (idle-clean / idle-displacing / busy against the baseline), incumbent lots
gained, incumbent lots lost directly (∈ ∪S(c)) and lost by cascade; first-order Δ on the window beside the full-path ΔV
(sign agreement recorded); windowed minute and daily drawdown ($ and % of $100,000; minute marks re-derived from the
lots and minute bars, required to equal the engine's whole-run minute drawdown exactly; daily from the engine's
rows; peak reset at the boundary close), worst realized lot, worst MAE, loss clusters, time in market, net per $1M
borrowing dollar-days; portfolio: equity at boundary and end, increment vs C0 and vs B, windowed max daily % drawdown
(peak reset at the boundary close) and the run's whole-history daily and minute % drawdown to the window end
(engine), peak/trough dates, core value at the end.

## 8. Risk (matched horizons T, A, B)

Side by side: one ETF standalone slot (U all 61; P per fold), B4, B5, every B + c scenario, and the portfolio overlay
(C0, S, B4, B5, scenarios). Separated per trade (worst closed lot, gross vs financing, exits by reason incl. maximum
hold and buffered loss), per event family (net of funded lots by price-catalog family; **falling-knife episodes** =
Study 1's definition: episodes with ≥ 1 entry at or before the trough whose attributed net ≤ 0), per cumulative
window (max consecutive losing lots, worst 30/60/90-calendar-day change of the daily strategy mark, max minute/daily
drawdown with peak/trough and recovery sessions) and portfolio peak-to-trough (daily and minute %, 30% preferred /
35% conditional references; C0's own breach stated). MAE before exit and worst open mark; unrealized-to-realized
ratio (worst MAE ÷ realized loss for losing lots). The $35,000 is a historical research reference, not a stop. Stop
fills at the stop price and gap fills at the opening trade are model assumptions (no quote data exist); s25 is the
only adverse stress. **Never sum standalone ETF losses as one account.** The answer to the user's falling-knife
question is grounded in B4/B5's funded paths (§9.4).

## 9. Decision rubric (frozen)

### 9.1 Flags per ETF i and baseline B

- **T (structural asynchronous timing):** on U-T, n_clean ≥ 2 and the idle-clean decisions fall in ≥ 2 independent
  events (their cross-ETF family anchors ≥ 252 sessions apart).
- **E (fundable economics):** on U-T, Σ net of idle-clean trades > 0 (5 bps, 11%).
- **Breadth:** idle-clean trades with net > 0 in ≥ 2 independent events; otherwise `thin/inconclusive`.
- **C (full-path, replayed only):** in a fold-window replay, ΔV > 0 at both 5 and 10 bps, **and complement-type**:
  the candidate's own idle-clean lots' in-window share > 0 and ≥ 50% of ΔV. A positive ΔV that fails the share test is
  reported as `pool-path gain (reshuffle), not complementarity`.
- **R (downside compatibility):** the scenario's windowed fixed minute drawdown ≤ $35,000 and its windowed portfolio
  max daily drawdown ≤ 35% (30% preferred reported separately); where C0's own windowed daily drawdown exceeds 35%,
  R requires the scenario's to be no more than 1.0 percentage point above B's.

### 9.2 Labels per ETF and baseline (primary basis U-T Level D, updated by any fold-window replay of that ETF)

1. `not evaluable / insufficient` — a member of B; < 4 U-T decisions; for P labels, no nominee.
2. `coincident only` — ¬T and not label 3.
3. `economically interesting but mostly competing` — (¬T, standalone U-T net > 0 and ≥ 50% of its positive lot net in
   busy or idle-displacing trades), or (T ∧ E, replayed, ¬C).
4. `asynchronously timed but uneconomic` — T ∧ ¬E.
5. `exploratory marginal complement` — T ∧ E, and if replayed C ∧ R in every replayed fold window; qualifiers:
   `thin/inconclusive` (¬Breadth), `Level D only` (not replayed), `risk-incompatible` (C ∧ ¬R).

P-A and P-B receive the same labels on their windows (with n_dec ≥ 2 in-window as the evaluability floor) as
secondary columns; P-final none. View U vs P differences answer H3 descriptively.

### 9.3 Overall verdict (exactly one; replays on fold windows only — in-sample replays never count)

- `inconclusive` — a fail-closed parity gate fails, or no fold replay could be run for reasons other than an empty
  screen.
- `several credible exploratory complements` — ≥ 2 ETFs in different exposure clusters, each with C ∧ R in **both**
  fold windows for the same baseline (either view) and Breadth.
- `limited / regime-dependent exploratory complementarity` — ≥ 1 ETF with C ∧ R in at least one fold window, not
  meeting the above.
- `no demonstrated economically useful complementarity` — otherwise (including an empty screen), whatever the Level D
  labels; Level-D-only complements are then reported as hypotheses only.

### 9.4 Required answers

The final report answers brief §12 Q1–Q8 with references, including: the falling-knife question from B4/B5's own
funded paths (fold B and T: worst lot, loss clusters, MAE, falling-knife episodes among funded lots, pool minute/daily
drawdown vs $35,000, portfolio drawdown vs 30/35% and vs C0), never from summed standalone counts; and the
reconciliation of the GDX/XOP/XLE first-order vs full-path contradictions.

## 10. Tests and fail-closed gates

Unit/adversarial tests (`src/d1-signal-capital-complementarity/tests/`): post-cutoff mutation leaves the screen inputs
and hash unchanged; same-minute decisions follow the alphabetical tie order with no double funding; a refused
decision never fills and stays in the log; an idle-at-entry candidate displacing a later incumbent trade gives a
full-path Δ that can differ in sign from first-order; friction changes stop activation (full rerun ≠ subtraction,
engine agrees); gap/open and missing-minute handling incl. a stop activating while losing and an open lot at a window
boundary; XOP's reverse split (no fake +287% move) and no unexplained split-sized move in any loaded series; matrix
diagonal, asymmetry, NA on zero denominators, one-to-one matching, family non-duplication; determinism (same inputs
→ identical record hashes and ledger order); doors refuse post-cap ends; protected inputs unchanged.

Stage gates (fail closed, recorded): observer = engine for every run; gate replay = engine funded set for every
baseline and scenario; windowed minute drawdown re-derivation = engine whole-run minute drawdown; incumbent anchors
reproduced to the cent — B4 T 5 bps $242,196.01 / 71 lots; B4/B5 fold A +$62,161 / +$46,506 and fold B +$112,826 /
+$170,997 (Study 1/ranked-preemption conventions; the diverse-pool study's slightly different figures are a different
mark convention, explained); VGT primary alone fold A +$32,698 and fold B +$22,145; every View P nominee's fold V
equal to the standalone audit's sealed fold run; the three published U-on-B4 anchors (§7.2). A failure stops the
study (`inconclusive` unless corrected as an instrumentation defect before the code freeze, disclosed).

## 11. Records, stages and order

Write-once stage records under `results/<stage>/` with the protocol hash, code-manifest hash, start/finish times,
inputs' hashes and outputs' hashes; each stage verifies its predecessors' seals. Order:

0. `audit` — protected-input manifest, universe/source registry, baseline test counts (no Study 2 outcome).
1. `freeze-protocol` — `PROTOCOL_FREEZE.json` (sha256 of this file and the brief) after the independent methodology
   review (`reviews/`).
2. `parity` (incumbents, sources, published anchors, fixtures, adversarial checks) → `freeze-code` (manifest of every
   file under `src/d1-signal-capital-complementarity/` and the script line).
3. `signals` (U, P, P-final ledgers; observer = engine), `matrices`, `events`.
4. `occupancy` (B4/B5 timelines, first-order ledgers), `screen` (sealed before any replay).
5. `replays` (menu of §7.2, refuses anything else), `risk`.
6. `tables`, reports, independent results/implementation review, `verify`, commit and push.

`verify` re-checks every seal and hash without recomputing or rewriting a record. Read-only CLI commands never write
outside the git-ignored `evaluations/`.

## 12. Evidence limits and multiple testing (declared now)

Examined: 61 ETFs × 6 view-windows × 2 baselines at Level D (3,721 ordered pairs per matrix), ≤ 24 fold replays plus
the incumbent diagnostic and ≤ 12 in-sample replays at Level C. The 61 ETFs are not independent (one market sell-off
is seen many times); regimes overlap; no p-values or confidence levels are reported. All windows were inspected by
earlier work; the 61-symbol universe, B4/B5 and the regimes embed 2016–2026 hindsight; B5's GDX book was fitted to the
training-era pool path. Any exploratory "winner" is selected on known history with no fresh independent test. No
holdout claim; 2024–2026 stay closed.

## 13. Not authorized

Study 3 (momentum-entry research) in any form; any parameter search; any change to B4/B5 or deployment; any post-2023
bar; any commit outside this branch's study files, code and one script line; merge, PR, force push or tag.

## 14. Amendment history

- v1 (this draft) — written 2026-10-28 before any Study 2 result-bearing output.
