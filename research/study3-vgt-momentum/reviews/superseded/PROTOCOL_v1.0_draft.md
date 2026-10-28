# PROTOCOL — Study 3 Stage 1 `study3-vgt-independent-momentum-v1`

**Version 1.0 (draft for methodology review; frozen only by the `freeze-protocol` stage, which records its sha256 in
`PROTOCOL_FREEZE.json`).** Companion files bound by the same freeze: `MECHANISM_CATALOG.json` (exact rule
definitions, defaults and boxes) and `EXPERIMENT_MATRIX.json` (every run of every stage). Written before any momentum
mechanism was run on market data. Amendments after the freeze are append-only (`AMENDMENTS.md`,
`results/amendments.jsonl`), motivated, and labelled; anything they introduce after outcomes were seen is exploratory.

## 1. Question, scope and evidence level

- **Question (brief §1).** Can a simple, executable long-only rule on VGT recognise ongoing upward movement, enter
  without an earlier deep decline, stay in profitable trends or renew positions after exits, and control downside and
  financing drag across regimes — after 11% interest, friction and execution stress?
- **Scope.** VGT alone, one fixed $100,000 borrowed slot, standalone. **No** D1/B4/B5 pairing, shared-pool simulation
  or combined allocator (Stages 2–4 are not authorised). No change to any existing strategy, phenotype, pool, registry,
  config, data or prior study.
- **Evidence level.** Every window 2016–2023 has been inspected by earlier studies and the designer knows the broad
  history (`FIRST_PRINCIPLES_AND_HYPOTHESES.md` §0). The fold replays are **retrospective, chronology-respecting
  evaluations of a frozen selection procedure**, not out-of-sample tests. The full-history (2017–2023) run is an
  in-sample exploratory reference. Nothing here is validation.

## 2. Data and doors

- **Input.** `data/VGT/data.csv` (canonical, Alpaca SIP raw minute bars), loaded only through the shared loader
  (`loadNUniverse`, partition `training`, access `optimization`, which refuses holdout/final/all before reading) with an
  explicit end date ≤ **2023-12-29**; regular-session bars and the closing print (`src/lib/session.ts`); no split falls
  inside 2016–2023 for VGT (the 2026-04-21 split is outside every window). The file's sha256 and the loaded-bar hash are
  recorded in every stage record. No 2024+ bar is requested; the code refuses an end after 2023-12-29.
- **Doors per stage.** A history's development stages load data **through its development end only** (fold A
  2019-12-31, B 2020-12-31, C 2021-12-31, D 2022-12-30, H 2023-12-29). A fold's evaluation stage loads through its
  window end and refuses to run unless that fold's selection record is sealed and verifies.
- **Calendar.** Sessions are New York dates; early closes from `src/lib/calendar.ts`; missing minutes are never
  imputed (a fill waits for the next existing trade).
- **Accounting basis.** **Price-only** for every candidate and control (the fixed-slot convention of the frozen engine,
  which books no distributions). A distribution diagnostic (ex-dates from `config/market-events/distributions.csv`,
  shares held over each ex-date ≤ 2023-12-29) is reported separately for finalists and C-AL; it never enters a
  decision.

## 3. Execution and accounting (identical for candidates and controls)

- **Clock.** Daily rules decide at a session's close (features from sessions ≤ s) and execute at the next session's
  opening trade. Minute rules (E09/E10) decide at completed minutes and fill at the first trade at or after the decision
  (the frozen D1 rule, imported: `firstTradeAfterDecision`, `priceAt`, `timeAt`). First decision close 2017-01-03; first
  order 2017-01-04; accounting from the close of 2017-01-03 (mark 0). Lookbacks ≤ 250 sessions (history from 2016-01-04).
- **Resting stops.** A sell-stop level fixed for the session (hard part: from the fill; trailing part: from closes
  through the prior session). At the open: open ≤ stop → fill at the opening trade (gap). Intraday: the first minute
  whose open ≤ stop fills at that open; otherwise the first minute whose low ≤ stop fills at the stop level. The stop is
  checked from the fill bar onwards (the fill is the bar's first trade, so the bar's later low is observable after it).
  After an intraday exit the strategy stays flat for the rest of the session. Stop-slippage stress subtracts bps from
  stop fills (M5).
- **Same-session order.** (1) pending close-decided exit, else gap check, else pending close-decided entry, at the
  opening trade; (2) minute loop: resting stop, or (flat) the minute-clock trigger; (3) at the close: features, stop
  levels, exit signals, entry signals; (4) marks.
- **Fills, friction, interest.** Buy at raw × (1 + bps/10⁴), sell at raw × (1 − bps/10⁴), baseline **5 bps per side**.
  Shares = $100,000 / buy price (fractional). Interest = principal × rate × (exit session date − entry session date) in
  calendar days / 365, **11%** simple (the frozen `interestOn`); same-session round trips pay none. Each tranche of a
  scaled position is its own lot. No compounding, no borrowing against proceeds.
- **Marks and drawdowns.** Daily mark = realised + Σ open (shares × close − principal − interest to the session date).
  **Minute drawdown** (primary risk figure): the same mark at every minute close while a lot is open and at each fill,
  fed to the frozen `Tracker.updateStrict` (the fixed-slot convention of B4/B5 and D1). Daily drawdown from the daily
  marks. **Liquidation-equivalent** marks (exit friction deducted) for window increments and horizon-end values. Per
  trade: MAE/MFE from minute lows/highs between fill and exit, in % of the fill and in $ of the lot.
- **Window increments.** For a window (b, e]: V = liquidation mark at e's close − liquidation mark at b's close, from
  one continuous run from the first session (an open lot at b is carried, never re-entered). Window drawdowns restart
  the peak at b's mark. A window with no lot entered and none carried is **insufficient evidence**, not zero risk.
- **Campaigns.** A campaign is a maximal chain of trades of one run in which each later trade is a re-entry while the
  campaign was alive (§5 of the catalog's `campaignState`). Its economics include losing restarts.

## 4. Mechanisms (frozen in `MECHANISM_CATALOG.json` v1.0)

Twelve panel entries E01–E12 (ten distinct rules in seven groups), the exploratory prototype X-CS (default only, never
searched or selected), the M3 template TPL, the exits OX, CX1, CX2, X1–X8, HS, re-entry rules R0–R5, sizing Z0–Z2,
modifiers A1–A3, and controls C-SMA, C-DON, C-TSM, C-AL, C-ALR, C-IDLE and D1 (context).

## 5. Histories and folds (frozen before any result)

| History | Development (loaded) | Evaluation window (b, e] | Purpose |
|---|---|---|---|
| A | 2016-01-04 → 2019-12-31 | (2019-12-31, 2020-12-31] | shock and recovery |
| B | → 2020-12-31 | (2020-12-31, 2021-12-31] | continuation, chop |
| C | → 2021-12-31 | (2021-12-31, 2022-12-30] | extended decline, false recoveries |
| D | → 2022-12-30 | (2022-12-30, 2023-12-29] | new advance while D1 is idle |
| H | → 2023-12-29 | none | in-sample exploratory reference; M5 finalists |

Development metrics cover the decisions from 2017-01-03 to the development end (fold A therefore has three trading
years). Each fold's selection uses its development history only. Its evaluation replays the sealed selection from 2016
through the window end.

## 6. Stages

| Stage | Content | Door |
|---|---|---|
| S0 `audit` | data QA (sessions, minutes, gaps, early closes), file and loaded-bar hashes, protected-input manifest | ≤ 2023-12-29 |
| S1 `freeze-protocol` | hashes of PROTOCOL.md, MECHANISM_CATALOG.json, EXPERIMENT_MATRIX.json | none |
| S2 `parity` | D1 anchor (VGT primary through 2023-12-29 = Study 2's sealed record, every trade), fast engine = slow reference on every panel default and control (every trade field, marks, DD), synthetic adversarial fixtures, door refusals; records names, pass/fail and differences only | ≤ 2023-12-29 |
| S3 `freeze-code` | sha256 of every file under `src/study3-vgt-momentum/` | none |
| S4 `develop-<A..D,H>` | M1 panel (all entries × OX, CX1, CX2, TPL at defaults; controls; X-CS) → M1 gates → M3 search → selection → **seal** | development end |
| S5 `evaluate-<A..D>` | continuous replays of the sealed selections, family defaults (TPL) and controls through the window end | window end; needs the fold's seal |
| S6 `diagnostics` | M2 matrices (entries × CX1/CX2; exits; re-entry; sizing; modifiers) on H, per calendar year | ≤ 2023-12-29 |
| S7 `robustness` | M5 on the finalist set | ≤ 2023-12-29 |
| S8 `analysis` | verdict rubric, labels, ledgers (missed opportunities, campaigns, D1-idle overlap) | sealed records only |

Every stage is write-once (refuses to overwrite), records the git HEAD, code-freeze hash, protocol-freeze hash, door
and payload sha256, and verifies its predecessors. S4/S5 for different folds may run in any order after S3; S5-x needs
S4-x.

## 7. M1 gates (per family and history, development window, 5 bps, 11%)

A family enters M3 in a history only if, at its **TPL default** (catalog defaults, h 8%, t 10%): (g1) ≥ 6 closed
trades; (g2) entries in ≥ 3 distinct calendar years; (g3) minute drawdown ≤ $50,000; and (g4) development net > 0 under
at least one of OX, CX1, CX2, TPL. Gate outcomes are recorded for every family; a failed family is not searched in that
history (it stays in the denominator of mechanisms investigated).

## 8. M3 search and selection (per family that passes, per history)

- **Box.** The family's catalog parameters plus the template's h ∈ [3%, 15%], t ∈ [4%, 30%] (d ≤ 5). Quantised as the
  catalog states; derived parameters (d_out, a_out, e_out, v_out) from their gaps.
- **Global stage.** 1,024 points of a Sobol sequence (Joe–Kuo direction numbers) with a random digital shift; seed =
  first 8 hex digits of sha256(`study3|<family>|<history>|global`) feeding a mulberry32 stream (one 32-bit shift per
  dimension). Identical quantised vectors are evaluated once.
- **Feasibility.** Development minute drawdown ≤ **$35,000**; ≥ 6 closed trades; entries in ≥ 3 calendar years;
  development net > 0.
- **Local refinement.** The 4 best feasible, trade-path-distinct points by development net; 32 points each, uniform in
  ±10% of every parameter's range around it (clamped, quantised; seed `…|local|<k>`).
- **Shortlist.** The 16 best feasible, trade-path-distinct points (global ∪ local) by development net. Trade-path hash
  = sha256 of the (entry session, entry bar, exit session, exit bar) list.
- **Neighbourhood.** For each shortlisted point, the 2d one-at-a-time points at ± 10% of each parameter's range
  (clamped, quantised). Neighbourhood median = median development net of the 2d + 1 points; neighbourhood feasibility =
  share of them with minute drawdown ≤ $35,000 and net > 0. Each shortlisted point is also re-simulated at 10 bps.
- **Family champion.** Highest neighbourhood median among shortlisted points with neighbourhood feasibility ≥ 0.75
  and 10 bps net > 0; ties by lower Sobol index. None qualifying → no champion.
- **Procedure pick P\*.** The family champion with the highest neighbourhood median (dollars, fixed slot). Secondary,
  descriptive: P\*-R = highest neighbourhood median ÷ max(minute drawdown, $5,000).
- **Budget caps (code-enforced).** ≤ 1,344 evaluations per family and history (1,024 + 128 + 16 × 11 + 16), ≤ 15,000 per
  history, ≤ 75,000 in total. Every evaluated point is archived (compressed JSONL: parameters, Sobol index, net, gross,
  interest, friction, trades, entry years, minute and daily DD, exposure, worst lot, trade-path hash, gate flags).
- **Seal.** The history's selection record (gates, champions, P\*, archive hashes) is sealed before any evaluation
  window is loaded.

## 9. M4 evaluation and controls (per fold)

For each fold: P\*, every family champion, every family at its TPL default (the "no-search" reference), the controls,
and C-IDLE, each replayed continuously from 2016 through the window end. Reported: V, gross, interest, friction, lots
entered and carried, exposure, window minute and daily DD, worst lot, insufficient-evidence flag. D1 is shown from its
own frozen engine (context, matched calendar, its own arming convention).

## 10. M5 robustness (finalists)

Finalists (≤ 5): H's P\*, D's P\* (if different), and H's champions of the next families by neighbourhood median up to
five. On 2017-01-03 → 2023-12-29: friction 0/2/5/10 bps (re-simulated); interest 8/11/14%; stop slippage 10/25/50 bps;
entry slippage 10/25 bps on opening fills; execution delay +1 and +5 minutes; missing bars (a seeded 1% and 5% of
non-first minutes removed); OAT ±1 and ±2 steps of 5% of each range; 64 joint draws uniform in ±10% of each range (seed
`study3|<candidate>|joint`); random-entry placebo (200 draws, seed `study3|<candidate>|placebo|<k>`: at each eligible
flat close enter with probability = the candidate's entries ÷ its eligible flat closes; same exits); inverted-state
placebo for level families. Settings other than 5 bps / 11% / no stress are **exploratory**, not part of the decision
rule except as listed in §11.

## 11. Verdict rubric (frozen)

Let V_F be P\*'s increment in fold F's window.
- **No acceptable candidates:** P\* undefined in ≥ 2 of the 4 folds.
- **Primary test T:** (i) Σ_F V_F ≥ +$20,000; (ii) V_F > 0 in ≥ 3 of 4 windows; (iii) P\*'s window minute drawdown ≤
  $35,000 in every window; (iv) V_C ≥ −$15,000. If a fold has no P\*, V_F = 0 and it counts as not positive.
- **Robustness R** (H's P\* and D's P\*, full 2017–2023): (r1) net > 0 at 10 bps; (r2) net > 0 at 14%; (r3) ≥ 75% of the
  64 joint draws have net > 0 and minute DD ≤ $35,000; (r4) net > 0 with 25 bps stop slippage; (r5) net > 0 with a +1
  minute delay; (r6) minute DD ≤ $35,000.
- **Control comparison K:** Σ_F V_F against Σ_F of C-SMA, C-DON and C-TSM separately.
- **Label:** T fails → **no demonstrated standalone edge**; T passes and R fails → **no demonstrated standalone edge
  (fragile)**; T and R pass and K exceeds none of the three → **promising standalone value, no demonstrated advantage
  over conventional trend controls (unvalidated)**; T and R pass and K exceeds at least one → **promising but
  unvalidated**. Every label is retrospective; none authorises deployment or pooling.
- **Family labels (descriptive):** consistent (Σ V > 0 and V > 0 in ≥ 3 of the folds where it had a champion),
  regime-dependent (Σ V > 0 otherwise), negative (Σ V ≤ 0), insufficient (champion in < 2 folds).

## 12. Reviews, disclosures and limits

A methodology review precedes the freeze; a separate final code/evidence review follows the results. Reviews and
written dispositions are kept verbatim in `reviews/`. Known limits: one ETF, one secular bull market with three
declines, overlapping regimes, inspected history, designer knowledge, no bid/ask data (slippage is synthetic stress),
no margin-call modelling, price-only accounting.
