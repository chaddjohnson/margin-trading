# Protocol v2.1 — all-61-ETF D1 signal timing, opportunity overlap and shared-capital complementarity (Study 2 of 3)

Study `d1-all61-signal-capital-complementarity-v1`. Brief: `brief/STUDY_2_BRIEF.md` (verbatim, sha256
`d0db822a…3d043`). Branch `research/d1-all61-signal-capital-complementarity` from `a37feae`. Code
`src/d1-signal-capital-complementarity/`. v2 incorporates every finding of the independent methodology review
(`reviews/METHODOLOGY_REVIEW_1.md`, dispositions `reviews/METHODOLOGY_REVIEW_1_DISPOSITIONS.md`; v1 kept as
`reviews/PROTOCOL_v1_superseded.md`); v2.1 every finding of the confirmatory review (`reviews/METHODOLOGY_REVIEW_2.md`,
dispositions `reviews/METHODOLOGY_REVIEW_2_DISPOSITIONS.md`; v2 kept as `reviews/PROTOCOL_v2_superseded.md`). This protocol is frozen by `PROTOCOL_FREEZE.json` before any Study 2
result-bearing output exists; the code is frozen after Stage 2 (instrumentation and scalar parity). Amendments after
the freeze are additive, dated, labelled (correction / exploratory / reporting-only), logged in §14 and
`results/amendments.jsonl`, and never change a primary decision rule after a result-bearing output exists.

## 0. What is and is not claimed (stated before any outcome)

- The study is **diagnostic**: *when* do existing, fixed D1 mechanisms offer opportunities across the 61 audited
  ETFs, and are any of them economically useful **under one shared $100,000 slot**. No parameter vector, priority,
  allocator rule or pool is searched, tuned or promoted; nothing changes B4, B5, any phenotype, default, prospective
  protocol or deployment.
- Evidence level: **retrospective, inspected history** (2016-01-04 → 2023-12-29). Cutoffs protect execution
  causality and replay-candidate selection; they do not restore independent statistical evidence. No bar after
  2023-12-29 is read by any Study 2 run. Forward observations: 0. "Causal" (Level C) = simulator counterfactual under
  the frozen engine's assumptions. Every fold replay is **retrospective with an incumbent-hindsight comparator** (B4/B5
  were chosen with 2016–2026 known; B5's GDX book was fitted to the training-era pool path).
- **Designer's prior knowledge (disclosed).** Read before this protocol: Study 1's outcome and reports; the
  standalone audit's verdicts (EWW the only weak lead; GDX "one flag away"); the ranked-preemption and diverse-pool
  fold figures (B4 +$62,161 / +$112,826, B5 +$46,506 / +$170,997 on folds A / B; whole-run fold-a validation
  figures); the seven-ETF daily-proxy screen and its 0 bps first-order minute diagnostic for GDX, XOP, EWZ, TLT, XLE,
  XLU, GLD (All-lowDd occupied 51% of sessions; all seven fail economics); the portfolio-aware opportunity map's
  **published View-U-against-B4 training rows for all seven** — the unchanged D1 vector (= VGT `primary`) on GDX
  (+$3,992), XOP (+$48,199), XLE (−$42,190), EWZ (−$107,571), TLT (−$16,748), XLU (−$31,591), GLD ($0), with their
  busy/clean/displacing counts — and its "best Track S/P" rows; B5's GDX book having been selected by a full-pool-replay
  objective; the portfolio-aware study's training decompositions against B4 (P-add-GDX +$146,293, P-add-XOP
  +$81,268, XLE-P +$67,122) and its holdout/final figures for S0 and P-add-GDX (2024–2026; e.g. post-training Δ
  +$55,670 resting on one GDX trade); the B4/B5 robustness audit; a B4 training run reproducing S0 (71 lots,
  $242,196.01). The SRC rule (§7.1) uses the source's R2 ranking; the same filter on R1 would have given XLK (fold A)
  and XME (fold B) — R2 is what makes the designer-seen XOP the fold-B SRC (choice disclosed, rationale in §7.1). The
  confirmatory reviewer opened one published fold record (XLB, fold A) to check a convention and did not pass its value
  on. During
  instrumentation (before this v2) the designer re-ran, as checks of published scalars only: B4/B5 whole-run and
  window increments and windowed minute drawdowns through 2021-12-31 and 2023-12-29 (all equal to published figures),
  VGT primary's trade count on VGT through 2020-06-30, and the three U-on-B4 rows for XOP/GDX/XLE (equal to the map's).
  These seven ETFs carry the mark **`designer-seen (T, B4)`** in every table and label. **Not seen** before the
  freeze: any View U result of any other ETF, any View P timing/occupancy, B5's training occupancy timeline, any 61×61
  matrix, any Study 2 screen or replay. The 61 survivors, the incumbents and the regimes were chosen with knowledge of
  2016–2026 (survivorship and hindsight, §12). The VGT `primary` vector itself was selected by VGT programs that
  inspected 2024–2025 (`config/phenotypes/D1/VGT.json` provenance note).

## 1. Questions and hypotheses (no outcome presumed)

Primary question: of the 61 ETFs, do any provide **genuinely distinct and economically attractive D1 opportunities
when the B4/B5 shared slot is idle, or when their signals could justify competing for it**, rather than dipping in the
same market shocks?

- **H0** lucrative deep-dip signals cluster in a few broad shocks; differentiated ETFs add little fundable opportunity.
- **H1** some ETFs give independent calendar-time opportunities but weak post-interest economics in idle periods.
- **H2** some coincident phenotypes still improve full-path pool P&L by displacing less valuable trades; first-order
  displaced-trade arithmetic may give the wrong sign.
- **H3** some opportunities exist only under ETF-specific fitted phenotypes; the common-rule control shows whether the
  result reflects fitting rather than asynchronous price behaviour.
- **H4** complementarity differs between the rebound (fold A, 2020-07 → 2021-12) and the decline/recovery (fold B,
  2022-01 → 2023-12); diversification can vanish in a common crisis.

Permitted outcomes (§9.3): `no demonstrated economically useful complementarity`, `limited / regime-dependent
exploratory complementarity`, `several credible exploratory complements`, `inconclusive`.

## 2. Invariants and isolation

1. Never written: `config/`, `data/` (canonical minute files, `partitions.json`), every prior `research/` folder,
   every file bound by `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` (incl. `src/app.ts` and its transitive
   imports, `package-lock.json`, the `pools` script line, the `imports` map). The protected-input manifest
   (`records.ts protectedManifest`: tracked files vs the base commit `a37feae`, `package.json` differing only by the
   study's script line, every prospective-freeze pin, sha256 of the 61 data files, `partitions.json` and the prior
   studies' git-ignored files) is sealed in Stage 0 and re-verified by `verify` and at Stage 6.
2. The study **imports** the frozen engine (`runNAllocator`, `ShadowBook`, `EntryMachine`, `ExitManager`,
   `FixedLedger`, `Tracker`, `loadNUniverse`) and the completed audits' helpers (`compactLotsOf`, `excursionOf`,
   `catalogOf`, `capturesOf`, `independentOf`, `writeSealed`) read-only. Its only change outside its folders is one
   `package.json` script line `d1-signal-complementarity` → `src/d1-signal-capital-complementarity/main.ts`.
3. No network, download, broker, order, `.env` or credential access.
4. No reoptimization, joint search, parameter/priority tuning, altered stops/exits/activation, altered allocation or
   promotion. Every vector is a stored, pre-existing one.
5. No Study 3 work of any kind.
6. Pre-existing test failures (baseline: 722 tests, 716 pass, 6 fail — all six from the lowercase
   `src/app/allin-original.ts` references remaining in `src/trailing-buy`, `src/minute-optimizer` and
   `src/intraday-study` after the user's partial fix `a37feae`) are reported, not fixed here.

## 3. Data, universe, windows and doors

### 3.1 Universe

The 61 eligible ETFs of `research/d1-ranked-preemption/results/audit/universe.json` (all 2016-01-04 → 2026-10-13,
2,710 sessions, 0 missing): AGG DBC EDV EEM EFA EMB EWJ EWW EWY EWZ FXI GDX GLD HYG IAU IBB IEF IEMG IGV IJH IJR ILF
INDA IWD IWF IWM IWN IYT KBE KIE KRE LQD MTUM QUAL RSP SHY SLV SMH SPLV TIP TLT USMV VGK VGT VIG VOOG VPU XBI XHB XLB
XLE XLF XLI XLK XLP XLU XLV XLY XME XOP XRT. Loaded files must hash to the audit's `dataSha256`. Flags carried into
every table: F7 liquidity/coverage (DBC EDV ILF IYT KIE VOOG VPU; flagged, never dropped; may be S1/S2), coverage
median and median dollar volume, training-era splits (EWJ 2016-11-07, IJR 2017-01-19, KIE 2017-11-30, IBB 2017-12-01,
XOP 2020-03-30 1:4 reverse, IAU 2021-05-24, SMH 2023-05-05; forward-adjusted by the shared loader), the XLF
2016-09-19 carve-out move, price-only lots (VGT/VOOG distributions only in portfolio mode, frozen convention), and
`designer-seen (T, B4)`. Exposure clusters: the audit's `category` (rates-credit 9, real-assets 5, non-us 11,
sector-industry 23, factor-size 13; coarse, disclosed).

### 3.2 Windows (New York trading dates; accounting from the 2016-01-04 close; arming from 2017-06-15 for every book)

| Key | Role | Decisions counted | Data end (loader stops) | Window marks |
|---|---|---|---|---|
| `T` | training era, descriptive | 2017-06-15 … 2023-12-29 | 2023-12-29 | whole run |
| `A` | fold A evaluation (rebound) | 2020-07-01 … 2021-12-31 | 2021-12-31 | (2020-06-30 close, 2021-12-31 close] |
| `B` | fold B evaluation (decline/recovery) | 2022-01-03 … 2023-12-29 | 2023-12-29 | (2021-12-31 close, 2023-12-29 close] |
| `preA` | fold A screen (ex ante) | 2017-06-15 … 2020-06-30 | **2020-06-30** | whole run to the cutoff |
| `preB` | fold B screen (ex ante) | 2017-06-15 … 2021-12-31 | **2021-12-31** | whole run to the cutoff |

Every run is **one continuous run from 2016-01-04** to its data end (no reset, no dropped open position). Window
figures are increments of that run; each view-window uses the runs whose data end equals the window's. A trade or lot
open at a data end is valued at its **liquidation value** (exit friction and interest to that session) for net
figures, at the engine mark for drawdowns. Level D, the screen and R use **5 bps per side, 11% simple** interest.

### 3.3 Doors (`doors.ts`; each refuses before a byte is read)

Every load: partition `training`, access `optimization`, explicit end ≤ the provenance cap, audited hashes, loaded
last date = requested end, first session 2016-01-04, first eligible 2017-06-15. Caps: View U and incumbents
2023-12-29; P fold-a vectors **2021-12-31**; P fold-b and P-final 2023-12-29. Screens load exactly to their cutoff.
B4/B5 full-history figures through 2026-10-13 are only cited from published records.

## 4. Views

- **U (uniform-rule control, mandatory):** registered VGT `primary` (grid `216.3.73.8.74.29.90.60`; candidate
  `d1-ebc9f639b3`) unchanged on all 61 ETFs. A descriptive counterfactual. Runs end 2020-06-30, 2021-12-31, 2023-12-29.
- **P (period-correct source phenotypes, mandatory):** the source's sealed fold representative (Study 1's A0) where the
  sealed status is `survivor`: 49 fold-a (window A, and preA) and 54 fold-b (window B, and preB) nominees; each grid
  must equal Study 1's `results/libraries/{A,B}/SELECTION.json` key `selections.ARCH.<SYM>.a0.nominee` and its phenotype
  file hash. No nominee — fold A: AGG EEM EWZ IEF
  INDA IWN KIE SHY SPLV TIP XLE XOP; fold B: AGG HYG IEF IEMG SHY SPLV TIP — ⇒ `NA (no nominee)`, no substitution.
  **P-F** (optional, segregated, in-sample context): the 53 final-window survivors on window T only; never in a screen,
  replay or verdict. Source-library alternates omitted.
- **I (incumbents, mandatory):** B4, B5 exactly as `config/pools/*.json` through the pools loader (`loadPool`); S =
  VGT `primary` alone; C0 = the $300,000 60/40 VOOG/VGT core with no book. B5's GDX book (`274.4.71.18.100.36.191.81`)
  is not the GDX A0 of either fold (fold A `257.8.65.30.227.18.116.68`, fold B `294.5.100.30.204.33.47.191`).
- A pool's members are never its Level C candidates (B4: VGT XBI XRT KRE; B5: + GDX). GDX may be a B4 candidate (a
  different vector; labelled). B4 → B5 is an **incumbent diagnostic**. VOOG is excluded from Level C (the portfolio
  core; no tested convention for a VOOG book beside it; F7) and fully included in Level D.

## 5. Instrumentation

### 5.1 The observer

`observer.ts` steps one frozen `ShadowBook` over its own symbol's sessions in the engine's per-bar order for a one-book
pool, committing every signal. It records setups (concept 2: arming minute/time/price, reference high, kind,
status), decisions (concept 3: confirming minute, decision time = minute end, price), the eligible next fill (concept
4), virtual lots (concept 5), continuation windows (concept 8) and open lots at the data end. **Parity (fail closed):**
its trades equal the frozen engine's one-book run field for field (all `VirtualTrade` fields except `fundedLotId`),
for every symbol, view and run.

### 5.2 Funded, refused and the gate rule (concepts 6, 7)

For pools the engine's `signals` and `lots` are the record. `gate.ts` restates the fixed-mode rule on virtual trades:
decisions ordered by (decision time, symbol); **granted iff the decision time is later than E of the last granted
trade**, where E = `VirtualTrade.exitTime` (bar start of the exit, or the session close for a closing-print exit) and
**E = +∞ for a trade open or pending at the data end; F (fill time) = +∞ for a reservation never filled**. (Verified by
the review against `engine.ts`: exits step 3, fills step 5, decisions step 6 stamped bar start + 60 s, alphabetical
ties, reservation from decision to fill, no decisions in the close phase, no same-session exit after a fill.) It must
equal the engine's funded set exactly for every fixed baseline and scenario run. Portfolio mode adds margin refusals
(minimum equity, Reg T, house requirement); there they are listed, and no gate parity is claimed. Refusal classes:
pool held by a lot; pool reserved by a pending order; **same-minute tie** (refused by a reservation granted in the same
minute); margin (portfolio only).

### 5.3 Ledgers

Setup ledger, decision/lot ledger (decision, fill and exit in New York time and epoch; prices; reason; execution;
setup kind; gross, interest, friction, net; MAE/MFE; days held; open at end), continuation windows, B4/B5 funded lots
and every decision (granted/refused, reason, holder), baseline occupation intervals, first-order classification,
family membership.

## 6. Level D — descriptive, all 61 (non-causal as a pooled intervention)

### 6.1 Time measure

Regular-session minutes: session s spans [open_s, close_s), close_s the dataset's session close, open_s = 09:30 New
York the same day; one shared calendar. Interval endpoints map to cumulative session-minute coordinates.

### 6.2 Intervals

Armed: [arming decision time, signal decision time) (to the data end if never confirmed). Capital-holding:
[decision time, E] (reservation + lot; what blocks a shared slot). Lot-held: [fill time, E). Clipped to the window's
[first open, last close]; a decision belongs to the window of its decision session.

### 6.3 Ordered pair metrics (i, j) — views U-T, U-A, U-B, P-A, P-B, P-F

1. Armed: i's armed minutes; joint |A_i ∩ A_j|; share = joint ÷ i's; i's arming episodes; those overlapping j's armed
   time; share.
2. Decision proximity at exact minute, same session, ±5 and ±20 sessions (inclusive) by **one-to-one greedy
   matching**, computed once per unordered pair with the alphabetically first symbol as a (all (a, b) within tolerance
   sorted by (|session distance|, a's time, b's time), accepted while neither is used), so (i, j) and (j, i) share one
   matched count; share of i's decisions. At ±20: median signed lag (j − i, sessions); share of
   matched pairs where i's decision time is strictly earlier.
3. Capital-holding and lot-held overlap: i's minutes, joint, share of i's, Jaccard.
4. Price contrast: Pearson correlation of daily log returns ln(close_s ÷ close_{s−1}) over the window's sessions (the
   first return uses the session before the window, inside the run).
5. **NA, never 0:** any share whose denominator is 0 *or whose partner has no events of that kind* (a zero-signal
   partner, or a symbol without a vector) is null; correlation of a constant series is null. Diagonal computed. Every
   cell exports numerator and denominator.

Exports: `pairs.json.gz` per view-window (3,721 ordered pairs), metric matrices (CSV + JSON) and readable heatmaps.

### 6.4 Events, families and regimes

- **Price dip episodes (concept 1, ex post):** the standalone audit's `catalogOf` per ETF on the run's daily closes.
- **Within-ETF signal episodes:** anchor clusters of an ETF's decisions: a cluster starts at the earliest unassigned
  decision and holds every decision with session ≤ anchor + 20 (no chaining).
- **Cross-ETF event families:** per view-window, every decision of every member of that view (all 61 under U,
  incumbents' symbols and VOOG included; the fold's nominees under P) in anchor clusters with w = **10** sessions
  (primary; 5 and 20 as sensitivities). Aggregates count a family once. Solo = 1 ETF; market-wide = ≥ 10 ETFs.
- **Independent events:** families whose anchors are ≥ 252 sessions apart (the audit's greedy `independentOf`).
- **Regimes:** the fixed G1–G13 of `src/d1-ranked-preemption/context.ts`, clipped. **Broad-shock:** G2, G4, G7, G10,
  G12; others off-shock. Descriptive only.

### 6.5 Baseline occupancy and first-order classification (B ∈ {B4, B5}, 5 bps)

- Occupancy: held / reserved / idle session-minutes and shares; sessions with a lot at the close (B4 on T must give
  the published 843 of 1,647); idle stretches with the decisions of each view inside them; the **Q7 split**: B-idle
  minutes during which no U-view ETF is armed or holding, versus ≥ 1.
- For each candidate trade c (D_c, E_c) and each B funded trade b (D_b, F_b, E_b, with the ∞ conventions):
  **busy** ⇔ ∃b: D_b < D_c ≤ E_b, or (D_b = D_c ∧ sym_b < sym_c); holder state `reserved` if D_c ≤ F_b else `held by
  lot`, with the holder's net sign (profitable vs loss-producing holding). **Displaced** S(c) = {b: D_c < D_b ≤ E_c, or
  (D_b = D_c ∧ sym_c < sym_b)}. **idle-clean** ⇔ ¬busy ∧ S(c) = ∅; **idle-displacing** ⇔ ¬busy ∧ S(c) ≠ ∅. Each trade
  against the **unchanged** baseline. **First-order Δ** = Σ net(idle c) − Σ net(distinct b ∈ ∪S(c)); not a
  counterfactual.
- Per ETF and view-window: eligible dip episodes, armed episodes (deep/continuation), decisions, fills,
  profitable/losing, busy (held/reserved; during B's profitable/losing holdings; by holder), idle-clean,
  idle-displacing; gross, interest, friction, net, net per occupied day, worst lot, worst MAE by class;
  first-order Δ; years; idle-clean years, G-regimes, shock/off-shock; families, solo families, idle-clean families,
  independent idle-clean events, independent idle-clean positive events; largest family share of positive idle-clean
  net; idle-clean net without the best idle-clean signal episode (sensitivity); competing share = Σ max(net, 0) of busy
  and idle-displacing trades ÷ Σ max(net, 0) of all; per G-regime the share of the ETF's capital-holding minutes
  overlapping B's.
- Contrast with the published proxy screen and opportunity map (definitions differ; `SOURCE_AND_CONFLICTS_AUDIT.md`).

### 6.6 Predeclared descriptive lists (Q1)

On U-T, ordered pairs with n_dec ≥ 4 on both sides: **"independent in return correlation but colliding at entry"** —
ρ ≤ 0.3 and ±5-session match share ≥ 0.5; **"correlated but asynchronous"** — ρ ≥ 0.7 and ±5-session share ≤ 0.2. An
ETF is **asynchronous relative to B** when ≥ 50% of its U-T decisions are idle against B (n_dec ≥ 4). H3: on windows
A and B, U vs P idle-clean counts and nets per ETF, and the Spearman correlation between U and P ±5-session match
shares over pairs of common members.

## 7. Level C — exact shared-pool replays (bounded, predeclared)

### 7.1 Screen (ex ante; baseline B ∈ {B4, B5} × view V ∈ {U, P} × fold F ∈ {A, B})

Inputs: only runs ending at the cutoff c_F (2020-06-30 for A, 2021-12-31 for B): each candidate's standalone run (U
vector, or the fold's P nominee) and B's run. Candidates: the 61 minus B's members and VOOG (P: the fold's nominees).
Features over decisions in [2017-06-15, c_F] at 5 bps (a trade open at c_F clipped there, liquidation-valued):
`n_dec`; `years` (distinct calendar years of all its decisions); `n_idle`; `n_clean` (§6.5 against B's pre-cutoff
path); `idle_net` (Σ net of idle trades); `fo_net` (first-order Δ); `sa_net` (standalone liquidation mark at c_F);
`sa_dd` (standalone minute drawdown to c_F); `fam_idle` (cross-ETF families, w = 10, built on the view's pre-cutoff
decisions, holding an idle decision of the candidate); `indep_pos` (descriptive only).

- **Gates (all):** n_dec ≥ 4; years ≥ 2; n_clean ≥ 2; idle_net > 0; sa_net > 0; sa_dd ≤ $35,000.
- **Score** among gate-passers: mean of the descending ranks (ties: average rank) of n_clean, fo_net, fam_idle and
  years; order by (score ascending, fo_net descending, symbol).
- **Roles (≤ 3 per cell):** **S1** first; **S2** (U) second; **SRC** (P, instead of S2) = the highest symbol of the
  source's frozen fold R2 ranking (`research/d1-ranked-preemption/rankings/<fold>/R2.json`) that is a fold nominee with
  source sample label `adequate`, not F7-flagged, not a member of B, not VOOG and not S1 — chosen by the source's rule,
  not this study's gates. Identities fixed now from metadata: **fold A → XLB** (R2 position 6; IYT, XLU, VPU, TIP and
  VOOG above it fail the filter), **fold B → XOP** (position 2; TIP rejected), for both baselines unless equal to S1,
  then the next eligible R2 symbol: **KBE** (fold A), **IWN** (fold B); XOP is `designer-seen`. **NC** (negative /
  timing-only control): among the rest with n_dec ≥ 4, years ≥ 2, n_clean ≥ 1 that are ex ante uneconomic
  (idle_net ≤ 0 or sa_net ≤ 0; a candidate failing only fo_net is the H2 profile and is not a control), the most
  n_clean (ties: n_idle, then symbol).
- Empty roles are valid. ≤ 6 distinct ETFs per B × V over both folds. H2 (coincident gain) is tested through NC, SRC,
  B4→B5, the in-sample replays and the first-order-vs-full-path comparison of every replay (no `fo_net` gate).
- **Disclosed limits:** P's pre-cutoff economics are in-sample to each nominee's fit (sa_net > 0 almost guaranteed);
  B5's GDX book was fitted through 2023-12-29, so idle classification against B5 is contaminated in both screens.

### 7.2 Replay menu

For each selected (B, V, F, c): baseline B and B + c (c's view-F vector inserted under the frozen N-book convention:
book order VGT, XBI, XRT, KRE, then alphabetical; alphabetical same-minute ties; one slot; shadow semantics), each one
continuous run from 2016-01-04 to window F's data end, at fixed **0, 2, 5, 10 bps** (each fully re-simulated),
fixed **s25** (5 bps + 25 bps stop overshoot; the existing scenario), and **portfolio** 5 bps (frozen dividends), with
C0 alongside. Also: the **incumbent diagnostic** B4 → B5 on T, A and B; the **in-sample descriptive** View U replays
(each B, the union of its U candidates from both folds, window T, fixed 0/2/5/10 and portfolio 5 bps; never in a
verdict; each candidate inserted alone, one at a time; NC candidates included); the **published-anchor parity** replays of §10.2 (parity only; in no table or verdict). Refused by
construction: anything past a cap, any other candidate, subset, combination or order, VOOG, a pool's own member.

### 7.3 Outputs per replay

V (liquidation mark at the window end − at the boundary; T: whole run) and ΔV at each cost; gross, interest, friction;
funded lots and refused decisions of every book; holders; **path attribution** at 5 and 10 bps: lots keyed by
(symbol, decision time), in-window shares summing exactly to V; ΔV = candidate's own lots by first-order class
(idle-clean / idle-displacing / busy-against-baseline; recomputed at that cost) + incumbent lots gained − incumbent
lots lost directly (∈ ∪S(c)) − lost by cascade; ΔV by G-regime of lot entry; ΔV without the largest positive
scenario-only lot; first-order Δ on the window beside ΔV with sign agreement; windowed fixed minute drawdown (marks
re-derived from lots and minute bars; the whole-run figure must equal the engine's) and daily drawdown ($, % of
$100,000; peak reset at the boundary close); worst lot, worst MAE, consecutive losses, worst 30/60/90-day change, time
in market, net per $1M borrowing dollar-days; portfolio: equity at the boundary and end, increment vs C0 and vs B,
windowed max daily % drawdown, and the whole-history daily and minute % drawdowns to the window end (engine; labelled
— a windowed portfolio minute series is not computed), core value at the end, margin refusals.

## 8. Risk (matched horizons T, A, B)

Side by side: each ETF's standalone slot (U all 61; P per fold), B4, B5, every scenario, and the portfolio (C0, S,
B4, B5, scenarios). Per trade (worst closed lot with its gross and interest, exits by reason incl. maximum hold and
buffered loss), per price-catalog episode (**falling-knife episodes**: eligible episodes with ≥ 1 entry at or before
the trough and attributed net ≤ 0 — Study 1's definition), per cumulative window (consecutive losses, worst
30/60/90-day change, minute/daily drawdown with peak/trough/recovery), portfolio peak-to-trough (daily and minute %,
30% preferred / 35% conditional; C0's own breach stated). MAE vs realized loss; **capacity cost of losing lots**
(B4/B5): slot-minutes held by losing funded lots and the standalone net of decisions refused during them. The $35,000
is a historical reference, not a stop; stop fills at the stop and gap fills at the opening trade are model
assumptions (no quotes exist); s25 is the only adverse stress. Standalone losses are never summed as one account.

## 9. Decision rubric (frozen)

### 9.1 Flags (ETF i, baseline B, view-window W ∈ {U-T, P-A, P-B}; 5 bps)

- **T:** n_clean ≥ 2 and the idle-clean decisions fall in ≥ 2 independent events.
- **E:** Σ net of idle-clean trades > 0.
- **Breadth:** idle-clean trades with net > 0 in ≥ 2 independent events (else qualifier `thin`).
- **Off-shock:** ≥ 1 idle-clean trade with net > 0 outside the broad-shock regimes (else qualifier `shock-only`).
- **C (a fold replay):** ΔV > 0 at 0, 2, 5 and 10 bps; ΔV@5 ≥ max($5,000, |worst own candidate lot net in the
  window|); **complement-type**: the candidate's own idle-clean lots' share > 0 and ≥ 50% of ΔV@5; **not thin**: ΔV@5 −
  the largest positive scenario-only lot share > 0 **and** ΔV@5 − the largest positive single G-regime share of ΔV@5
  (lot shares grouped by entry regime) > 0; and, if the cell's NC was replayed, ΔV@5 > NC's ΔV@5. A ΔV@5 > 0
  failing only the complement test is `pool-path gain (reshuffle)`; failing only the thin test is `thin positive`.
- **R:** windowed fixed minute drawdown ≤ $35,000 and windowed portfolio max **daily** % drawdown ≤ 35% (30% preferred
  reported); where C0's own windowed daily drawdown exceeds 35%, that 35% test is **replaced** by: the scenario's ≤ B's
  + 1.0 point.

### 9.2 Labels (ordered; per ETF × baseline × view; U labels use U-T Level D and U fold replays, P-A/P-B labels their
own window and their fold's P replay)

1. `not evaluable / insufficient` — a member of B; no vector (no nominee); n_dec < 4 (U-T) or < 2 (P windows).
2. If replayed in this view: C in every replayed fold → `exploratory marginal complement` (qualifiers `single-fold` if
   replayed in one fold only, `risk-incompatible` if ¬R in any, `shock-only`, `thin`); C in some but not all →
   `exploratory marginal complement — regime-dependent`; otherwise, if some fold is `pool-path gain (reshuffle)` →
   `economically interesting but mostly competing (reshuffle)`; otherwise continue with 3, except that a Level D
   outcome of label 3d becomes `economically interesting but mostly competing (full path not counting)`.
3. Level D: (a) n_clean < 2: `economically interesting but mostly competing` if standalone net > 0 and competing share
   ≥ 0.5, else `coincident only`; (b) n_clean ≥ 2 but < 2 independent idle-clean events: `insufficient (single
   idle-clean event)`; (c) T ∧ ¬E: `asynchronously timed but uneconomic`; (d) T ∧ E: `exploratory marginal complement
   (Level D only)` with `thin` / `shock-only` qualifiers.

Every label of a `designer-seen` ETF carries that mark.

### 9.3 Overall verdict (exactly one; fold replays only; NC never counts)

A **counting replay** is an S1, S2 or SRC fold replay with C ∧ R.

- `inconclusive` — an uncorrected fail-closed parity failure; or no counting replay while ≥ 1 S1/S2/SRC replay is a
  `thin positive` with R.
- `several credible exploratory complements` — ≥ 2 ETFs in different exposure clusters, each with counting replays in
  **both** folds for the same baseline **and the same view**, each with the Off-shock flag on that view's Level D (U:
  U-T; P: P-B, since window A holds no broad-shock regime).
- `limited / regime-dependent exploratory complementarity` — ≥ 1 counting replay, not meeting the above.
- `no demonstrated economically useful complementarity` — otherwise (including empty screens).

Reported with it: k of n replays meeting each criterion (C, R, complement-type, materiality, not thin), every NC that
met C (`screen non-discriminating` cells), every reshuffle gain, and the qualifier `all counting replays designer-seen`
when that holds.

### 9.4 Required answers

Brief §12 Q1–Q8 with references; the falling-knife question from B4/B5's funded paths (folds A, B and T: worst lot,
loss clusters, MAE, falling-knife episodes among funded lots, capacity cost, pool drawdown vs $35,000, portfolio vs
30/35% and vs C0), never from summed standalone counts; the GDX/XOP/XLE first-order vs full-path reconciliation.

## 10. Tests and fail-closed gates

### 10.1 Unit and adversarial tests (`src/d1-signal-capital-complementarity/tests/`)

Post-cutoff mutation leaves screen inputs and hashes unchanged (loader stops at the cutoff); same-minute decisions in
alphabetical order, no double funding; a refused decision never fills and stays logged; an idle-at-entry candidate
displacing a later incumbent gives a full-path Δ that can differ in sign from first-order; friction changes stop
activation (full rerun ≠ subtraction; engine agrees); gap/open and missing-minute handling incl. a stop activating
while losing and an open lot at a window boundary; the ∞ conventions for open/pending baseline trades; XOP's reverse
split (no fake +287%) and no unexplained split-sized move in any loaded series; pair metrics: diagonal, asymmetry, NA on
zero denominators and zero-signal partners, one-to-one matching, family non-duplication, inclusive anchor windows;
determinism (identical record hashes and ledger order); doors refuse post-cap ends; protected inputs unchanged.

### 10.2 Parity anchors (fail closed; scalars only in Stage 2)

Tolerances: counts exact; dollar figures published to the cent within $0.005; every whole-dollar figure within $0.50;
internal identities within 1e-6. The parity record keeps each check's name, pass/fail and absolute difference only —
no new value (in particular no View P fold V).
- B4 T 5 bps: $242,196.01, 71 lots, 137 virtual trades, 66 refused, 843 of 1,647 sessions with a lot at the close.
- B4/B5 window A +$62,160.78 / +$46,506.24 (published +$62,161 / +$46,506); window B +$112,826.16 / +$170,997.21
  (published +$112,826 / +$170,997); whole runs to 2021-12-31 $129,369.85 / $217,492.04 (source VALIDATION); B5 T
  $388,489.26; windowed minute drawdowns $17,702 / $16,557 (A) and $22,327 / $17,269 (B) (diverse-pool study; its
  slightly different V figures are an engine-mark convention, explained).
- VGT primary alone: window A +$32,698 (windowed minute DD $14,894), window B +$22,145 ($17,421) (Study 1 ANCHORS).
- Every P nominee's fold V equals the standalone audit's sealed fold run (`results/runs/fold.jsonl`), every cost
  present there.
- The seven published U-on-B4 rows on T at 5 bps (opportunity map): virtual trades; busy/clean/displacing under the
  map's convention (same-minute decisions busy) — GDX 36: 17/8/11, XOP 78: 49/17/12, XLE 32: 25/1/6, EWZ 41: 18/13/10,
  TLT 5: 2/0/3, XLU 7: 5/0/2, GLD 0; funded lots of the candidate (25, 54, 13, 28, 3, 4, 0); baseline lots lost in the
  full replay and their net / gained — GDX 21 ($66,126) / 3, XOP 19 ($125,958) / 9, XLE 11 ($62,419) / 8, EWZ 26
  ($60,719) / 1, TLT 16 ($21,092) / 0, XLU 5 ($59,754) / 16; Δ@5 +$3,992, +$48,199, −$42,190, −$107,571, −$16,748,
  −$31,591, $0 (each within $0.50 of the published whole-dollar figure). Protocol-convention counts and same-minute
  ties reported beside them.
- Observer = engine, gate replay = engine, minute-drawdown re-derivation = engine, window-share identity: every run.

### 10.3 Corrections after the code freeze

A parity failure or defect found after the code freeze is fixed only by a labelled correction amendment: the code is
re-frozen (new code-freeze record), the affected stages rerun into new records (old ones kept), the change disclosed;
every defect must be demonstrated by a fixture or parity test; the original screen seals always stand — if the defect
is in code the screens used, a corrected screen is sealed beside it, both selections are replayed and reported, and the
more conservative verdict governs. An uncorrected failure ⇒ `inconclusive`.

## 11. Stages, records and deliverables

Write-once records under `results/<stage>/` with the protocol hash, code-manifest digest, start/finish times and every
input/output hash; each stage verifies its predecessors' seals. Order:

0. `audit` — protected-input manifest, candidate registry, baseline test counts.
1. `freeze-protocol` — `PROTOCOL_FREEZE.json` (sha256 of this file and the brief).
2. `parity` (scalar comparisons of §10.2, fixtures, adversarial checks; no ledgers persisted) → `freeze-code`.
3. `screen-A` (runs ending 2020-06-30 only) → sealed `results/screen/SCREEN-A.json`; then `screen-B` (runs ending
   2021-12-31 only) → `SCREEN-B.json`. No run whose outputs feed Level D, Level C or tables is made before both seals
   exist (Stage 2's scalar parity, which persists only pass/fail and differences, is the only earlier run).
4. `signals` (U, P, P-F ledgers per data end; the preA/preB ledgers must hash equal to the screens' — a determinism
   check), `matrices`, `events`, `occupancy` (Level D).
5. `replays` (§7.2 only), `risk`.
6. `tables`, reports, independent results/implementation review, `verify`, commit and push.

Deliverables (brief §10): README, PROTOCOL + freeze + amendments, SOURCE_AND_CONFLICTS_AUDIT, CANDIDATE_REGISTRY
(.md/.csv/.json), SIGNAL_GENERATION_AND_ENGINE_PARITY, PAIRWISE_SIGNAL_TIMING_AND_OVERLAP,
INDEPENDENT_EVENT_FAMILIES_AND_REGIMES, BASELINE_OCCUPANCY_AND_IDLE_OPPORTUNITIES, EXACT_SHARED_POOL_COUNTERFACTUALS,
RISK_AND_FALLING_KNIFE_CONTEXT, CHRONOLOGICAL_AND_MULTIPLE_TESTING_LIMITS, FINAL_COMPARISON_AND_RECOMMENDATION,
IMPLEMENTATION_AUDIT, RESEARCH_RECOVERY. CLI `npm run d1-signal-complementarity -- <command>`: read-only `status`,
`verify`, `sources`, `universe`, `signals`, `pair`, `overlap`, `occupancy`, `candidate`, `replays`, `risk`, `events`;
write-once `stage <name>`. `verify` re-checks seals and hashes without recomputing or rewriting.

## 12. Evidence limits and multiple testing (declared now)

Examined: 61 ETFs × 6 view-windows × 2 baselines at Level D (3,721 ordered pairs per matrix); ≤ 24 fold replays, the
incumbent diagnostic and ≤ 12 in-sample replays at Level C. The ETFs are not independent (one sell-off seen many
times); regimes overlap; no p-values or confidence levels. All windows were inspected before; the universe, B4/B5,
VGT `primary` and the regimes embed hindsight; P's pre-cutoff economics are in-sample to each nominee; B5's GDX book
was fitted to the training pool path. Any exploratory "winner" is selected on known history with no fresh test. No
holdout claim; 2024–2026 stay closed.

## 13. Not authorized

Study 3 in any form; any parameter search; any change to B4/B5 or deployment; any post-2023 bar; commits outside this
branch's study files, code and one script line; merge, PR, force push or tag.

## 14. Amendment history

- v1 (2026-10-28) draft → reviewed (`reviews/METHODOLOGY_REVIEW_1.md`).
- v2 (2026-10-28) — every review-1 finding accepted (`reviews/METHODOLOGY_REVIEW_1_DISPOSITIONS.md`).
- v2.1 (2026-10-28) — every confirmatory-review finding accepted (`reviews/METHODOLOGY_REVIEW_2_DISPOSITIONS.md`);
  written before any Study 2 result-bearing output; frozen as this version.
