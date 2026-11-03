# Protocol — D1 standalone ETF opportunity-capture and robustness audit

Study `d1-standalone-etf-opportunity-audit-v1`, 2026-10-27. Namespace: `research/d1-standalone-etf-opportunity-audit/`,
`src/d1-standalone-opportunity-audit/`, `evaluations/standalone-opportunity-audit/` (git-ignored CLI outputs). Every
constant below is declared in `src/d1-standalone-opportunity-audit/context.ts`. The assignment as received is
`brief/BRIEF.md`. This protocol was written after the Stage A census and parity (§4) and the shortlist (§5), revised
after an independent read-only methodology review and a confirmatory review (`reviews/methodology-review.md`,
`reviews/confirmatory-review.md`; dispositions in `reviews/METHODOLOGY_DISPOSITIONS.md`), and frozen **before any robustness, cost, episode, portfolio or fold run of a
research phenotype**. `PROTOCOL_FREEZE.json` fixes its sha256 together with the shortlist, the price-only catalog, the
perturbation designs and the outcome-defining code (§11).

## 0. What is and is not claimed

- This is a **diagnostic audit of existing vectors**, not an optimisation. Nothing is searched, tuned, re-ranked,
  promoted or registered. No neighbour, perturbation or alternative becomes a candidate. Every research phenotype stays
  research-only and non-deployable; nothing is written to `config/`.
- **Evidence tiers** (named in every report):
  - **T-train (inspected training):** every source Stage A outcome and everything run here on 2016-01-04 →
    2023-12-29 — the shortlisted vectors were optimised on exactly this span.
  - **T-retro (inspected walk-forward history):** the source study's sealed fold records, and the period-correct
    fold-forward runs of §9.1 (a vector chosen on data through a fold's search end, run over that fold's validation
    years). Those years were inspected by earlier studies, and the source procedure itself (its score, credibility
    rules, $35,000 ceiling and box) was designed in October 2026 with knowledge of 2016–2026: a retrospective process
    check, weaker than a true walk-forward, never fresh validation.
  - **T-2024 (inspected 2024–2026):** only the unchanged incumbents' known full-history anchors, as context. **No
    research phenotype is run after 2023-12-29** (no controlling source record authorises it).
  - **T-prospective:** none exists; the forward observation count is **0**. No bar after 2026-10-13 is read.
- **Known biases, stated before any outcome:**
  1. *Asymmetric comparison with VGT primary.* Every candidate was optimised on exactly 2016-01-04 → 2023-12-29 (2,048
     Sobol vectors and a local search per ETF); VGT primary came from earlier VGT programmes that inspected 2016–2025
     and is not tuned to this window. On the common window the merit slots, S1, S2, the joint-median-net axis and the
     families axis therefore start biased *toward* the candidates, and retention (a run against its own fitted base)
     is biased *against* them. Hence the procedure-matched control (§2) and the dual comparison (§10).
  2. *The source population was generated with a concentration penalty.* Its representatives and libraries were
     chosen by J_nb, the median of J_s = net − best trade − DD excess; a fat-right-tail vector was disfavoured before
     this study began. The brief's "no concentration penalty" is honoured from this study onward only.
  3. *The stored 16-draw neighbourhood is selection-contaminated and coarse:* the representative maximised the median
     J_s over exactly those draws (upward bias), and with 16 draws the standard error of a share near 0.5 is ≈ 0.125.
  4. *Universe survivorship:* the 61 are funds liquid today with complete 2016–2026 data, chosen by an earlier study.
  5. *Selection:* the shortlist was chosen by inspecting stored outcomes (merit picks most exposed to the winner's
     curse); local flatness does not undo the 2,048-vector search per ETF per window or the choice among 61 ETFs.
- Neighbourhood samples, years, episodes and trades share one price history and are not independent trials. No p-value,
  PBO or deflated Sharpe is computed. No figure is a forecast. A backtest drawdown is not a cap.
- A null result (no ETF has a stronger historical case than VGT primary) is a valid outcome.

## 1. Questions

1. Among the existing final-window standalone research phenotypes, does any ETF show stronger **robustness of
   major-opportunity capture**, after costs, than VGT `primary` on the same window — and than VGT's own phenotype
   chosen by the same procedure on the same window?
2. Do the shortlisted results survive modest perturbations of all eight D1 parameters (one at a time and jointly), a
   behaviourally different library alternative chosen by the source study, and distinct dip/recovery events?
3. What downside, financing burden, trade scarcity and portfolio duplication accompany each candidate?
4. How do candidates compare with the unchanged VGT primary, B4 and B5 on the identical 2016-01-04 → 2023-12-29
   horizon, and what stays unknowable until prospective data exist?

## 2. Configurations (21 phenotypes; 11 ETFs)

- **Research phenotypes (candidates, 19):** the final-window source vectors of `SHORTLIST.json` — for each of the 11
  ETFs its representative and, where the source library has one (8 ETFs), `alternative-1` — read from their
  hash-verified source files. Research-only.
- **VGT primary (S):** `config/phenotypes/D1/VGT.json` `primary` (X 21.6%, Y 0.3%, stop 7.3%, hold 8, L 74, buffer
  2.9%, P 9.0%, W 60), the registered external control the brief names. No registered `lowDd` exists; none is used.
- **Procedure-matched control:** VGT's own final-window research representative (`d1-681c3ac3cc`), chosen by the same
  source procedure on the same window as the candidates. Research-only; never a candidate; never presented as
  deployable. It answers "is the candidate better than what the same procedure finds on VGT?".
- **B4, B5:** `config/pools/B4.json`, `config/pools/B5.json`, unchanged (shadow policy, one $100,000 slot). **C0:**
  the 60/40 VOOG/VGT core with no overlay.
- **Multiplicity:** 19 candidate phenotypes across 11 ETFs, each compared with the same two controls; ETF-level
  verdicts follow §10's predeclared rule, never the better of two phenotypes.

## 3. Engine, data, windows and doors

- **Engine:** the frozen N-book allocator (`src/portfolio-aware-d1/nbook/engine.ts`) through the completed B4/B5
  audit's pure runner (`src/b4-b5-robustness/run.ts` `runSpec`/`metricsOf`), configured exactly as `src/pools/run.ts`.
  A standalone phenotype is a one-book pool: every signal is funded. No engine code is copied or edited.
- **Fixed:** one $100,000 lot at a time, never compounded; 11% simple interest (365-day, from the entry session's
  midnight); 5 bps per side; stops fill at the stop. **Net** is the source study's liquidation-equivalent net: a lot
  open at the last close counts at its liquidation value (exit friction and interest to that session); the engine's
  marked net is kept as `engineNet`. Net per $1M borrowing dollar-days = net ÷ (occupied calendar days × $100,000) ×
  1e6 for every configuration. **Portfolio:** $300,000 at 60% VOOG / 40% VGT; each lot borrows 20% of marked equity at
  the decision; frozen dividend convention (only VGT/VOOG distributions exist: core and open VGT lots are credited; a
  non-VGT lot receives none — a conservative bias for income-paying ETFs, estimated in the report); Reg T and U35 at
  entry; maintenance ratios passive only — no calls, no forced sales.
- **Data:** canonical `data/<SYMBOL>/data.csv`, splits forward-adjusted, one calendar from 2016-01-04, books armed on
  2017-06-15, accounting from the 2016-01-04 close. Hashes in `results/baseline/`.
- **Doors** (`data.ts`), each refusing before a byte is read:
  - `candidateUniverse` — through the source study's own `inspectionUniverse('final', …)` (chronology, audited file
    hashes), **never after 2023-12-29**: every research phenotype, both controls and the common-window incumbents.
  - `foldUniverse(fold)` — the same source door for a fold, through at most that fold's sealed validation end, exactly
    as the source study's read-only CLI permits. Used only for §9.1.
  - `fullHistoryUniverse` — VOOG VGT XBI XRT KRE GDX on `all`, pinned to `config/pools/B5.json`, for the incumbents
    only. It restricts symbols; research vectors of those symbols are kept off it by their cutoff (the CLI refuses
    them after 2023-12-29, tested) and no Stage 3–4 path calls it.
- **Common window:** every head-to-head figure is on 2016-01-04 → 2023-12-29 with the same arming, calendar, costs and
  conventions. Full-history incumbent anchors are context only; dollars from unequal horizons are never compared.

## 4. Stage A — census and parity (done before this protocol)

- `results/inventory/census.json` / `.csv`: 61 symbols × 3 windows from the sealed source records; every stored file,
  archive and sealed body verified (`source-checks.json`); stored versus missing metrics listed per row.
- Parity (`results/parity/PARITY_SAMPLE.json`, preregistered 15:29:21Z; `PARITY.json`): 16 stored vectors, the
  sealed same-window controls at 0/2/5/10 bps and 5-bps portfolios, the brief's full-history anchors and a causality
  check — **486/486 passed**.

## 5. Stage B — the shortlist rule (applied to the stored final-window census only)

**Gates:** **G1** the stored representative is credible (net > 0 at 5 bps and 11%, minute DD ≤ $35,000, trades ≥ 7);
**G2** its stored 16-draw neighbourhood has a credible share ≥ 0.5. **Slot exclusions** (scored, never placed): VGT
(the control instrument) and SMH (semiconductor fund; not presumed eligible for the user's holdings).

**Grades** (0/1/2; total 0–12). Anchors: the sealed same-window VGT primary control (net $135,359.04; 917 held days,
counted without the one-day floor the candidates' occupied days use — a negligible difference):

| Grade | 2 | 1 | 0 |
|---|---|---|---|
| S1 merit: net ÷ VGT primary's same-window net | ≥ 0.75 | ≥ 0.5 | below |
| S2 efficiency: net per occupied day ÷ VGT primary's | ≥ 1.0 | ≥ 0.75 | below |
| S3 resilience: stored neighbourhood credible share | ≥ 15/16 | ≥ 12/16 | below |
| S4 persistence: survivor (incl. uncertain) in fold-a, fold-b, final | 3 windows | 2 | ≤ 1 |
| S5 breadth: exit years with net ≥ $10,000 | ≥ 2 | 1 | 0 |
| S6 downside: minute DD and worst trade | ≤ $20,000 and ≥ −$7,500 | ≤ $27,500 and ≥ −$10,000 | otherwise |

Top-trade concentration enters no gate and no grade. S4's survivor status inherits the source's J_nb > 0 condition (a
best-trade deduction); it affects no ETF near the cut, and is disclosed.

**Selection:** order eligible ETFs by score, net, symbol. (1) **Merit slots:** every slot-allowed eligible ETF whose
stored net ≥ VGT primary's same-window net — the only ETFs that could claim a larger stored record than the control on
the same window; they bypass the cluster cap. (2) **Diversity slots:** in order, at most one ETF per predeclared
exposure cluster among these picks, until merit + diversity = 10. (3) **Sparse slot**, (4) **contrast slot** only if
missing (< 10 trades; rates/defensive). At most 12 ETFs. Phenotypes: representative and source `alternative-1`.

**Outcome:** XME, GDX, KBE (merit); SLV, FXI, IJH, XLB, MTUM, XHB, EWW (diversity); EDV (contrast) — 11 ETFs.

**Rule history and limits (disclosed):**
- Rule v1 (`results/shortlist/SHORTLIST-v1-superseded.json`) was written at 15:35:59.9Z and selected SLV, FXI, IJH,
  XLB, MTUM, XHB, EWW, XBI, EDV, VPU. **On seeing that output**, about 96 seconds later, it was revised to v2. Two
  changes: S5 v1 (2 points only for ≥ 3 profitable years) rewarded spreading profit — it changed no selection, only
  the order below the cut; and the merit slots were added, which is the whole change in composition: XME, GDX and KBE
  in; XBI (a B4/B5 member) and VPU out; EDV relabelled as the contrast pick. Both versions use stored records only;
  no candidate run existed. The merit picks are the ones most exposed to the winner's curse.
- Because merit picks bypass the cluster cap, 4 of 11 ETFs are metals/mining (XME, XLB, GDX, SLV), and
  healthcare/biotech, energy, developed ex-US and broad EM are absent. The counterfactual (merit picks occupying their
  clusters) would have been XME GDX KBE FXI IJH MTUM XHB EWW XBI EDV (`SHORTLIST.json`
  `counterfactualIfMeritOccupiedClusters`). The list is not revised again (a v3 after seeing two lists would be one
  more fork); the counterfactual is reported.
- KBE is a marginal merit pick: $137,138, only $1,779 above the anchor; S3 = 0 (9 of 16 credible draws), S6 = 0
  (worst trade −$17,568).
- KRE, XLE and EWZ failed G2 although **all 16 of their stored draws had J_s > 0** (profitable even after removing
  their best trade): their non-credible draws must have breached the $35,000 minute-DD ceiling (or, less plausibly,
  had fewer than 7 trades); the stored record does not say which. They are drawdown-fragile, not sharp profit optima.
  IWF and DBC do fit "sharp optimum". Excluding XLE leaves energy unrepresented.
- Cluster assignments are judgments (e.g. MTUM as tech-growth, USMV/SPLV as broad rather than defensive).

## 6. Stage C1 — parameter neighbourhoods (21 phenotypes, 2016-01-04 → 2023-12-29)

- **Base-run parity (precondition):** every phenotype's base fixed run at 5 bps and 11% must reproduce its stored
  record to the cent — each research phenotype (and the procedure-matched control) its source Stage A metrics (the
  `PARITY.json` fields and tolerances), VGT primary the sealed control B1 — before any cost, neighbourhood or analysis
  output exists (`results/parity/BASE_PARITY.json`). Any failure stops the study.
- Distances, legal grid and quantization are the completed audits' (`src/b4-b5-robustness/context.ts`), unchanged and
  blind to P&L: percentage parameters ≥ 2.0% move ±0.5/±1.0 pp; below 2.0%, ±max(0.1 pp, 25%·v)/±max(0.2 pp,
  50%·v); whole-number parameters ±max(1, 10%·v)/±max(s+1, 20%·v); the engine's legal bounds (X 3–30%, Y 0.1–15%,
  stop 2–15%, hold 2–60, L 20–365, buffer 0–6%, P 1–20%, W 5–250).
- **OAT:** v − m, v − s, v + s, v + m per parameter (≤ 32 points), fixed and portfolio. Outside the legal grid:
  recorded as truncated, **not run, not replaced, no boundary probe** (GDX and GDX alt hold −m, KBE alt stop −m, EDV
  buffer +m). Points outside the source's narrower search box but inside the legal grid are run and labelled.
- **Joint 8-D:** two Latin hypercubes of 64 over [v − m, v + m] ∩ legal grid, all eight parameters together, by the
  prior audit's `latinHypercube`, drawn for **every phenotype from one common stream** (labels `'vgt-standalone-joint',
  'VGT-primary', seed`, seeds 1 and 2): common random numbers, so every phenotype's samples sit at the same relative
  strata of its own intervals (a paired comparison), and VGT primary's samples are exactly the vectors the completed
  VGT audit ran on 2016–2026. Fixed and portfolio. No further seed or sample is ever added.
- **Designs are bound:** every OAT point and all 128 joint vectors of the 21 phenotypes, with relative shift sizes and
  each ETF's 2016–2023 realised volatility, are in `results/designs/designs.json` (written before the freeze). The
  same rule means **different relative sizes**: ±1 pp is ±32% of IJH's 3.1% stop but ±13% of GDX's 7.6%; one day is
  ±33% of GDX's 3-day hold; ±1 pp of X is a smaller move for a 37%-volatility ETF than for a 20% one. Differences in
  neighbourhood robustness between ETFs therefore partly reflect where each vector sits and each ETF's volatility,
  not only intrinsic robustness.
- **Metrics per design** (fixed unless stated): N, median/P10/P90/worst net, share net > 0, share ≥ 50% of own base
  net, median retention (run net ÷ own base net), share with minute DD ≤ $35,000, median/P90 minute DD, median net per
  $1M borrowing dollar-days; portfolio: median/P90 max daily % DD, shares > 30% and > 35%, share with incremental
  wealth over C0 > 0; plus the capture stability of §7.
- 8-D distributions are compared with VGT primary's and the procedure-matched control's under these definitions only;
  B4/B5's prior 32-/40-D results (full history) measure pool complexity and are quoted separately.

## 7. Stage C2 — opportunity catalog and capture (the primary diagnostic)

**Catalog** (`events.ts`, bound as `results/catalog/catalog.json`, price-only, written before the freeze; the analysis
must recompute it identically): per audited ETF and VOOG, daily closes 2016-01-04 → 2023-12-29, split-adjusted.
- zigzag pivots with a 10% reversal (a peak is confirmed when a close falls 10% below it, a trough when a close rises
  10% above it; a decline in progress at the cutoff has an unconfirmed trough);
- **episode** = a confirmed peak and the following trough; depth = 1 − trough ÷ peak (≥ 10%), one band per episode by
  its own depth — [10,15), [15,20), [20,30), ≥ 30% — so overlapping thresholds never multiply episodes; **major** =
  depth ≥ 20%; rebound end = the first close back at the peak (recovered), else the next confirmed peak (partial),
  else the cutoff (open);
- **family** (one dip event, the independence unit): an episode joins the current family while its trough is within
  126 sessions of the family's first trough, else it starts a new family (anchored, not chained). *Catalog v1* chained
  families until a recovered episode was followed by a 63-session gap; on the price-only output (no strategy result)
  it merged all of 2016–2023 into a single family for GDX, XME and SLV, which would have failed F1/F4 by construction;
  it was replaced before the freeze (`results/catalog/catalog-v1-superseded.json`). The 126-session window was chosen
  after seeing v1's price-only counts; it may split one long bear market (e.g. 2022, or March and September 2020)
  into two families, so families are labelled with their dates and are **not** the independence count;
- **independent events** (F1 and the families axis): among the families a run dip-captured, the number whose anchor
  troughs (the family's first trough) are at least 252 sessions apart, counted greedily in chronological order;
- **eligible** iff the trough is on or after 2017-06-15; earlier episodes are *ineligible*, never misses, and their
  lots never count toward a family. VOOG's catalog is the common-market context;
- **coverage** (price-only): the share of eligible sessions inside any episode span — 40–96% across these ETFs, so a
  lot "inside an episode" is weak evidence by itself; hence the dip capture below.
- Labels are retrospective and diagnostic; no label enters a trade decision.

**Attribution and outcomes** (per run): a lot belongs to the episode whose (peak, rebound end] contains its entry
session (decline phase: (peak, trough]; rebound phase: (trough, end]). A **dip entry** is a lot entered in the decline
phase or at ≥ 50% of the episode's depth below its peak (a continuation re-entry high up the rebound is not a dip
entry). Per eligible episode: **captured** (≥ 1 entry, attributed net > 0) | **entered, loss** | **in position** (no
entry; a lot from before the peak held into the decline) | **armed, no entry** | **not armed** (the deep condition —
a completed minute closing ≥ X below the L-session reference high, the engine's own reference highs — never held on a
flat session; a reconstruction that ignores the continuation path), each reported separately; **dip-captured** = dip
entries with net > 0. Major episodes shallower than the phenotype's X are marked "shallower than X" (D1 cannot arm on
them by design, approximately: X is measured from the L-session high, not the episode peak). Per (episode, run):
entries (deep / continuation; decline; dip), net, dip net, interest, friction, first-entry offset from the trough,
first-entry depth, captured share (Σ per-share exit − entry ÷ (rebound high − trough)), worst MAE (`excursionOf`).

**Per phenotype:** the event-by-event table (every eligible episode, including no-entry and losing ones); eligible
episodes and families, major families; **dip families** = eligible families whose base dip net > 0, and their
**independent count** (anchor troughs ≥ 252 sessions apart — F1 and the families axis);
**M** = eligible major families with base dip net > 0; **neighbour capture** = for each of the 128 joint samples the
share of M in which the sample's family dip net > 0, its median (and per seed); **winner parameter-dependence**: for
the base's top-3 winning lots, the share of joint samples whose net in that lot's episode ≥ 50% of the reference (the
base's episode net if > 0, else the lot's own net; a lot outside every eligible episode uses whole-run retention ≥
50%); per-episode shares across joint and OAT samples; falling-knife losses (decline-phase entries that lost; lots
with MAE ≤ −10%). Events and trades are counted separately.

## 8. Stage C3 — economics, costs, tails, years, portfolio

- **19 cost scenarios** (the prior audits' definitions): base 11%/5 bps; r08/r14/r18; f00/f02/f10/f15/f20/f30/f45;
  s10/s25/s50/s100; nxo; C1 (14%, 10 + 10 bps); C2 (18%, 20 + 25); C3 (C2 + 50 bps overshoot). Every scenario is
  re-simulated, fixed and portfolio, for the 21 phenotypes, B4 and B5 (C0 has no costs).
- Fixed: net, gross, interest, friction, lots, wins/losses, win and loss sizes, profit factor, worst lot, MAE/MFE
  (minute bars; the order inside a minute is unknown), top-1/3/5 share (annotation), net minus top-N winners
  (**attribution only**), exposure, lot-days, minute and daily DD in $ and % of $100,000, net per $1M borrowing
  dollar-days, the longest underwater spell, exit reasons, setups (deep / continuation).
- Years: marked-to-market attribution of the base fixed mark and portfolio equity by calendar year and by the source
  study's regimes G1–G13 (G13 clipped to 2023-12-29); no bar removed, no path joined.
- Portfolio: end equity, increment over C0, max daily and minute % DD (and the daily increment over C0), borrowing
  dollar-days, productivity, passive minimum equity ÷ requirement (U35), VGT duplication.
- Broker caveats (always stated): no margin calls or forced sales; house requirements change; Vanguard's 30-day rule;
  real quotes, liquidity and capacity not modelled. No test shifts *entry* timing (nxo moves stop exits only).

## 9. Stage D — chronology and selection bias

1. **Period-correct fold-forward check (new, T-retro):** every one of the 61 symbols' fold-a and fold-b
   representatives runs once from 2016-01-04 through its fold's validation end at 5 and 10 bps; **V** =
   liquidation-equivalent mark at the validation end − the same at the search-end close (which must equal the stored
   Stage A net — a parity check on all 122 vectors); lots entered after the boundary, lots open across it; windowed
   daily DD. `analyze` stops if any fold run's mark at the search-end close differs from the stored net (fail
   closed). A final-window vector is **never** run on an earlier slice and called out-of-sample.
2. **Stored pooled fold records (T-retro):** each shortlisted ETF's membership in the sealed fold picks C-R1, C-R2,
   D-R1, D-R2 and those procedures' stored validation results; VGT primary's stored fold increments (B1) — obtained
   with hindsight over those years, so **not a test**; the VGT instrument's own period-correct fold representatives
   (from item 1) are the comparable test.
3. **Selection among 61:** Spearman rank correlation (descriptive, no p-value) between fold training net and V; the
   shares of V > 0, V < 0 and no evidence; the share of each fold's top-10 training ETFs with V above the median; rank
   stability of training nets across windows; each shortlisted ETF's percentile among the 61. This cross-section is the
   less biased view: a shortlisted ETF's F8 pass is conditioned on its selection.
4. **Phenotype drift:** the step-unit distance between each shortlisted ETF's fold-a, fold-b and final
   representatives.

## 10. Interpretation — flags and standing (predeclared; `standing.ts`, bound and tested)

| Flag | Raised when | Blocks (i)? |
|---|---|---|
| F1 few independent dip captures | fewer than 2 independent dip events (base dip families with anchor troughs ≥ 252 sessions apart), or fewer than 2 eligible major families exist | yes |
| F2 tail losses | a base lot loses more than $10,000, or a base lot's MAE is beyond −25% | yes |
| F3 drawdown | fixed minute DD > $35,000 at base or C1, or base portfolio max daily DD > 35% (reported with its increment over C0) | yes |
| F4 neighbourhood misses major events | **insufficient** if M has fewer than 2 families; **raised** if the median neighbour capture < 50% | yes (both) |
| F5 winner parameter-dependence | < 25% of joint samples keep ≥ 50% of the top winner's reference net (or no winning lot) | yes |
| F6 cost-driven path instability | net ≤ 0 under f10, f20 or C1, or net at C1 below 50% of base | yes |
| F7 liquidity / data | stored minute coverage < 0.75 or training median dollar volume < $50M | no (stated prominently) |
| F8 temporal evidence | **negative** if a fold representative's V < 0 at 5 bps; **no evidence** if a fold has no representative or no lot entered or open in its window; VGT primary: **not assessable (hindsight)** | negative only |
| F9 neighbourhood fragility | the 128 pooled joint samples: < 75% net > 0, or median retention < 50% (each seed reported) | yes |
| F10 neighbourhood drawdown | < 75% of the 128 joint samples with minute DD ≤ $35,000, or their median portfolio max daily DD > 35% | yes |
| annotations | lots (< 30), dip families of eligible families, top-3 share, portfolio daily DD > 30% and its increment over C0 | never |

**Standing of a phenotype:**
- **(iii) unsupported** if any: base net ≤ 0; C1 net ≤ 0; joint median net ≤ 0 or < 50% of joint samples net > 0;
  base minute DD > $35,000; an accounting identity error above one cent.
- **(i) compelling research-only standalone alternative** if not (iii), no blocking flag, and at least two of three
  **axes** against VGT primary are met. Axes: joint median net; joint share net > 0; independent dip events. An axis is met when
  the candidate is at least as good on the pooled 128 **and on each seed separately** (the families axis is single-
  valued); a tie counts as met but not as strictly better.
- **(ii) interesting but weakly evidenced** otherwise.
- **Stronger historical case than VGT:** (i), all three axes met against VGT primary with at least one strictly
  better, at least two of three axes met against the procedure-matched control, F7 not raised, and period-correct
  support (at least one fold representative with V > 0 and none negative). The F8 state is shown beside every (i).
- **ETF level:** the representative's standing; an ETF-level (i) also requires `alternative-1`, when it exists, not
  to be (iii); the better of the two never promotes an ETF. Prospective observation is suggested only for an ETF-level
  (i), as a research-only proposal needing its own frozen protocol; never live trading or a registry phenotype.
- Axes are reported beside each candidate's drawdown and worst lot (there is no downside axis: downside acts through
  F2, F3 and F10). VGT primary and the procedure-matched control are classified by the same rules. **If VGT primary
  is itself (ii)**, any "stronger than VGT primary" statement is relative to a weakly evidenced control and the report
  says so; B5 stays the established pooled strategy unless a separate study says otherwise.

## 11. Records, freeze, amendments, guards

- `PROTOCOL_FREEZE.json` binds this file, the brief, `SHORTLIST.json`, `SHORTLIST_RULES_AND_CANDIDATES.md`, the
  census, the parity sample and record, the superseded v1 shortlist and v1 catalog, the catalog, the designs, the
  benchmark, the methodology review and its dispositions, both test files, and the outcome-defining sources:
  `context`, `inventory`, `census`, `data`, `run`, `specs`, `events`, `shortlist`, `store`, `worker`, `pool`, `batch`,
  `parity`, `freeze`, `standing`, `analysis`, `catalogs`. Unbound: report formatting and text only (`tables.ts`,
  `render.ts`, `views.ts`, `verify.ts`, `cli.ts`, `main.ts`, `templates/`).
- `run` and `analyze` refuse unless the freeze verifies **and** no tracked file outside the study's two folders
  differs from the baseline HEAD `b21ed711` except the one `package.json` script, and no untracked file exists outside
  them (so the imported engine, runner, loaders and helpers are byte-for-byte the frozen repository's). `analyze` also
  requires the base-run parity.
- Amendments (appended to the freeze record and §15) are technical or reporting corrections with a reason and a
  review note; never a gate, threshold, design, seed, catalog, shortlist or classification change after outcomes.
- Runs are appended as they complete (`results/runs/<family>.jsonl`) and skipped on a rerun while their specification
  hash matches; an interrupted batch resumes mid-stage with the same specifications.
- Node v24.21.0 only. Commit and push only after verification, only this study's files.

## 12. Compute budget (outcome-blind benchmark, `results/benchmark/benchmark.json`)

Incumbent runs only, 8 workers: ≈ 0.09 s per fixed and ≈ 0.34 s per portfolio run. Plan: 21 phenotypes × (38 cost
+ ≤ 64 OAT + 256 joint) ≈ 7,500 runs, plus 77 incumbent and 244 fold runs — about 40 minutes. Budgets are counts.

## 13. Tests

Synthetic (`tests/rules.test.ts`, `tests/standing.test.ts`, bound): zigzag pivots; one crash across every band is one
episode; anchored families; unconfirmed troughs; ineligible-before-arming; attribution phases; outcome categories; the
deep condition; dip entries on both sides of the 50%-depth line; dip capture versus a profitable high re-entry;
family nets excluding ineligible episodes; coverage; the independent-event count; OAT points on the grid and infeasible ones recorded; joint samples deterministic, inside their
intervals and common across phenotypes; VGT primary's design equal to the VGT audit's; the shortlist unchanged by
concentration and by runs; door refusals (including a research GDX vector refused after 2023-12-29); every flag's
threshold; F4 and F8 states; (iii)/(i)/(ii); ties versus strictly better; both seeds per axis; the procedure-matched
control; period-correct support for "stronger"; the ETF rule. Real data: parity (§4), base-run parity (§6), fold boundary parity (§9), catalog recomputation,
per-lot accounting identity. Plus `npm test`, `tsc --noEmit`, `eslint`, `npm run pools -- verify`, `npm run
vgt-robustness -- verify`, the prospective freeze status, and the ranked-preemption verifier at its own commit.

## 14. Known limitations (stated before any outcome)

- Every candidate vector was optimised on 2016–2023 and the shortlist inspected that history (§0).
- The fold-forward years (2020-07 → 2023-12) were inspected by earlier studies; the source procedure was designed with
  2016–2026 known.
- 2024–2026 behaviour of the candidates is unknown here by design.
- Non-VGT/VOOG distributions are not in the data: income-paying ETFs (EDV especially) are understated in both modes.
- Minute bars do not fix the order inside a minute; stop fills, liquidity and capacity are idealised; EDV's minute
  coverage is 47% (TLT, the more liquid rates fund, ranked 22nd).
- Perturbation sizes differ in relative terms across vectors and ETFs (§6).

## 15. Amendments

- **A1 (reporting; after all outcomes; changes no rule, run, threshold or classification).** (a) §9.1 says 122 fold
  vectors and §12 244 fold runs; the source study has 119 fold representatives (IEF in fold-a and SHY in both folds had
  no trade in any evaluated vector and therefore no representative), so 238 runs were specified and run — the code
  always enumerated the stored representatives; only this text miscounted. (b) §5 dates shortlist v2 to 15:37:36Z;
  `SHORTLIST.json` was regenerated at 16:16:08Z, before the freeze, to rename the "core" label to "diversity" and add
  the `procedureMatchedControl` and `counterfactualIfMeritOccupiedClusters` fields; the 15:37 bytes (`d4d7b69d…`, the
  version the pre-freeze reviewer read) were overwritten rather than archived. The selection is the same (both reviews
  and the rule's determinism; `npm run standalone-opportunity-audit -- shortlist` is refused after the freeze, so the
  regeneration cannot be repeated on disk). Raised by the final independent audit (`reviews/final-audit.md`, minor 5
  and 6).
