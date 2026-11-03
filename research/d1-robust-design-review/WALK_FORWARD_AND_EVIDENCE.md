# Walk-forward validation, temporal leakage barriers, multiple testing and evidence grades

## 1. What time-ordered evidence can and cannot show here

Nothing in 2016-01-04 → 2023-12-29 is out of sample for a configuration selected on the full training window, and
2024-01-02 → 2026-10-13 has been inspected repeatedly (METHODOLOGY_CRITIQUE.md §5). The only time-ordered test that
is clean *and* available is a **walk-forward test of the selection procedure**: run the whole pipeline on an earlier
window, freeze its pick, and score that pick on the sessions that follow — against the right comparators. This tests
whether the *method* (smoothed fitness, family promotion, refinement, gates) selects configurations that persist,
which is the claim the 16-ETF study could not make. It does not certify the final configuration; it tells us whether
trusting the procedure's final pick is reasonable.

## 2. Windows

All dates are New York trading dates; the eligible D1 window starts at the common arming date **2017-06-15** (session
365; every lookback L ≤ 250 is complete). Accounting starts at the close of 2016-01-04 as in every prior study.

| Round | Search window (optimizer may read) | Validation window (never read by the search) | Eligible search years | Notes |
|---|---|---|---|---|
| **Fold a** | 2016-01-04 → **2020-06-30** | 2020-07-01 → 2021-12-31 | 3.0 | includes the crash and first rebound; validates on the recovery/bull |
| **Fold b** | 2016-01-04 → **2021-12-31** | 2022-01-01 → 2023-12-29 | 4.5 | validates on the 2022 bear market, the 2023 bank stress and the rate sell-off |
| **Final** | 2016-01-04 → 2023-12-29 | none inside training | 6.5 | the frozen configuration |
| Fold a0 (optional, descriptive) | 2016-01-04 → 2019-12-31 | 2020-01-01 → 2020-06-30 | 2.5 | a pre-crash pick scored through the crash; too few lots to be decisive; dropped first under the compute fallback |

Rationale: two non-overlapping validation windows of 1.5 and 2.0 years, each with ≈ 15–30 funded lots for a 3–5-book
pool, each containing a different stress (recovery versus bear). Fold a's short search window (3 years, ≈ 30–45 lots)
is the price of a validation period that is not 2022–2023 again. Fold windows are **not** derived from any result.

## 3. Mechanics of a round

1. **Universe load** for the round: `loadNUniverse({ partition: 'training', access: 'optimization', endDate: <search end> })`
   — the loader physically truncates at `endDate`; bars after the search window are never loaded (barrier B1 below).
2. **Pilot** on the round's window (same 360 random configurations; per-window constants M_w, n_D,w).
3. **Library, discovery, promotion, refinement, assessment** exactly as in the final round, at the fold budget
   (PROPOSED_PROTOCOL.md §6 islands and §12), producing the round's **pick(s)**: the primary and up to two alternates, frozen in
   `results/walkforward/<round>/PICKS.json` (body hash) **before** the validation universe is opened.
4. **Validation run**: one continuous run from 2016-01-04 through the validation end, books arming 2017-06-15, every
   state (positions, stops, continuation windows, loss restrictions, debt) carried across the search/validation
   boundary, in the fixed pool at 0/2/5/10 bps and in the 20% portfolio at 5 bps. Validation P&L is the change of the
   marked strategy equity from the search window's last close to the validation window's last close (the repository's
   segment attribution, `src/multi-etf-allocator/segments.ts`). An isolated validation run (start flat with warm-up)
   is also produced for information; the continuous attribution is the primary figure because a deployed pool would be
   mid-state at the boundary.
5. **Comparators** evaluated identically on the validation window (same continuous attribution):
   - the **360 pilot controls** of the round (random, unoptimized): their validation nets form the reference
     distribution (percentiles reported; only the centrally feasible ones with ≥ 4 funded lots in the search window
     count, so inert controls do not pad the distribution);
   - the **raw-net ablation pick** (§5);
   - **B1/B4/B5**, labelled **in-sample reference**: their vectors were selected on 2016–2023 and have *seen* the
     validation years, so beating them in validation is not required and losing to them is not disqualifying;
   - the round's **alternates**.
6. **Record**: validation net (fixed, four costs), validation minute DD, lots, utilization, portfolio validation return
   and % DD, the pick's search-window P50/Q25 and its validation-window N1 statistics (n = 64, computed after the fact
   on the validation marks: do the neighbours also persist?), and the percentile of the pick among the controls.

## 4. Leakage barriers (what is required, what is accepted, what is overly restrictive)

| Channel | Treatment | Status |
|---|---|---|
| **B1 Price access** | the round's optimizer universe is loaded with `endDate` = search end; the loader's `access: 'optimization'` refuses holdout/final/all; a test asserts the loaded universe's last date equals the search end and hashes the loaded bars | required |
| **B2 Trace cache** | the trace key includes the dataset's last date, session count and end index, so a fold-a trace can never satisfy a fold-b or final request; a test requests the same (symbol, vector, cost) across windows and asserts distinct keys | required (exists; re-test) |
| **B3 Shared result caches / archives** | each round has its own archive directory and in-process archive; no round reads another round's archive; the final round's library is rebuilt (traces are window-specific anyway) | required |
| **B4 Seeds** | all seeds derive from (`'robust-d1'`, window label, stage, index); the Sobol library is identical across rounds (outcome-independent by construction) | required |
| **B5 Universe construction** | eligibility is data-integrity-based using whole-file integrity scans (timestamps, sessions, splits, coverage), never a strategy result; the same universe in every round | accepted (integrity scans read later bars for validity only) |
| **B6 Splits** | forward adjustment uses the recorded registry regardless of window; XOP's 2020 reverse split is a corporate action known on its date, not an outcome | accepted |
| **B7 Pilot constants** | computed per round on that round's window | required (cheap) |
| **B8 Regime/fold labels** | the regime partition is used only inside the search window (concentration rule) and as attribution afterwards | required |
| **B9 Analyst knowledge** | the designer knows 2020–2023 history; fold boundaries, budgets and gates are fixed here before any round runs, and the protocol freeze hash binds them | disclosed; cannot be removed |
| **B10 Control vectors** | the library's control vectors (frozen phenotypes, previous nominees) were selected on 2016–2023 and are flagged `inspectedPostTraining`; in the fold rounds they are **excluded from the library** (they carry information from the validation years); in the final round they are included and flagged, as in the 16-ETF study | required |
| Per-round re-download or re-partition of data | unnecessary: windows are date intervals of one file | overly restrictive, not done |
| Hiding the validation years from the implementing agent | impossible in a retrospective study; replaced by B1–B4 and by freezes with body hashes | not attempted |

**Invariant (stated for the tests):** no quantity that influences a round's pick is a function of any bar dated after
the round's search end. Verification: (i) B1/B2 structural tests; (ii) a **mutation test** at smoke-test budget: the
round is run twice on a fixture universe whose post-search-end bars differ (prices shifted by +3%), and the two picks'
keys and archives must be byte-identical; (iii) the replay's lookahead test (a later exit changes no earlier decision)
is kept for every member count used.

## 5. The raw-net ablation (the key methodological experiment)

In each fold round, discovery and promotion are run **twice** with identical seeds, budgets and universe:

- **arm J**: the smoothed objective J = P50 − λk (the protocol's);
- **arm Q**: the 16-ETF study's scalar Q = net − λk under the same hard constraints (F1, F3) — the peak-net procedure.

Each arm's pick is validated as in §3. The comparison answers the question the whole program hinges on: *does
selecting on neighbourhood fitness persist better than selecting on peak net, on this data, inside training?* The
result is reported in full whatever it says; the final round uses arm J regardless (predeclared), so the ablation is
evidence about the method, not a choice between methods after seeing results. Refinement is not ablated (budget).

## 6. Procedure-level gate G-WF (preregistered; decides whether a final recommendation is possible)

Let V(x) be the fixed-pool validation net at 5 bps of pick x in a round, and ctl_p the p-th percentile of the
round's eligible pilot controls' validation nets.

```
G-WF passes when, over folds a and b:
  (i)  in at least one fold, V(primary_J) ≥ ctl_75  and  V(primary_J) > 0
  (ii) in no fold,            V(primary_J) ≤ ctl_25
  (iii) in no fold does the primary_J pick's validation minute DD exceed $45,000
```

If G-WF fails, the study's outcome is **"no advancement — the selection procedure showed no forward persistence
inside training"**, and the final-round search is still run and reported (as exploration) but no configuration can be
recommended, frozen as a nominee, or evaluated on 2024–2026. B4/B5's validation figures are reported beside the
picks but do not enter G-WF (in-sample references). The ablation arm's validation is reported beside it (if arm Q
persists as well as or better than arm J in both folds, that is stated plainly in the recommendation as evidence
against the premise of the study).

Why percentiles of random controls and not a dollar threshold: the validation windows differ in length and regime; a
fixed dollar bar would be arbitrary. Why 75th/25th: a pick that only matches a random pool is not evidence of
selection skill; a pick in the bottom quartile is evidence against it. With 2 folds the test is weak — it can
catch a procedure that clearly fails, not certify one that passes; the evidence grade (§9) says so.

## 7. The final round and model selection

- The final round runs on the full training window with the full budget and both discovery arms of membership
  seeding (unseeded primary, benchmark-seeded secondary; PROPOSED_PROTOCOL.md §6), under arm J only.
- Model selection among finalists uses only final-round figures (gates G1–G8 and ranking by `confirm-A` J), because
  fold picks are different configurations and their validation figures cannot be transferred to final-round
  configurations without circularity. Fold results enter only through G-WF (go/no-go) and the evidence grade.
- **Stable pool versus adaptive re-selection.** The deliverable is one stable configuration (membership + eight vectors
  per member). The fold rounds *are* a re-selection experiment: if the fold-a, fold-b and final picks share no
  membership core, that instability is reported as a caution (the method's pick depends on the window), not used to
  build an adaptive switching rule, which would need its own separately validated protocol.

## 8. Multiple testing: what is valid here and what is not

The search evaluates tens of thousands of configurations whose outcomes are strongly dependent (shared traces, one
shared pool path, one crash). Options assessed:

| Method | Verdict for this setting |
|---|---|
| White's reality check / Hansen's SPA on the archive | Requires a bootstrap of the strategies' return series under stationarity-like assumptions and a well-defined benchmark return; the one-lot allocator's path is state-dependent (a resampled block changes which signals find the pool free), returns are sparse (≈ 12 lots per year) and the trials are not a fixed pre-specified set but a search path. The p-values would be formally computable and substantively unreliable. **Not used as a gate; not reported as a p-value.** |
| Bonferroni-type corrections over trial counts | Overly conservative for correlated trials and undefined for an adaptive search. **Not used.** |
| Probability of backtest overfitting (PBO) via combinatorially symmetric cross-validation on the archive's period-attribution matrix (configurations × quarterly marks) | Feasible with the attribution already logged; measures how often the in-sample best ranks below median out of sample across period splits. It is biased by the search (the archive is not a random sample of the space) and by the small number of independent periods (26 quarters), but it is a useful *descriptive* overfitting propensity of the archive and of the finalist set. **Reported for the final archive and for the finalist set (S = 8 and 16 splits), never a gate.** |
| Deflated/haircut Sharpe-type adjustments | Rely on Sharpe-ratio asymptotics with many independent observations; inapplicable to ≈ 80 lots. **Not used.** |
| Walk-forward of the procedure against random-control percentiles (§3–§6) | The one time-ordered test available without further data; weak with two folds, honest about it. **Primary.** |
| Materiality margin M from pilot MAD and bootstrap intervals on P50 (NEIGHBORHOOD §5, §8.5) | Controls the within-study winner's curse at the neighbourhood level (selecting on noisy medians). **Used.** |

The protocol states, rather than corrects, the residual: the final configuration is the best of a large correlated
search on one historical path; its smoothed training figures are inflated by an unknown amount; the fold test bounds
how badly the *procedure* fails, not how much the figure is inflated.

## 9. The 2024–2026 window: role and rules

Decision: **secondary locked confirmation that can only block.**

- Run once (`evaluate`, with a deterministic `--confirm` re-run allowed), after `FROZEN_SELECTION.json`: one continuous
  `all` run per frozen nominee and per benchmark (B1, B4, B5, C0), fixed and portfolio, 0/2/5/10 bps, both dividend
  conventions, segment attribution to development/holdout/final.
- **Confirmation rules** (necessary, never sufficient; fixed 5 bps unless stated):
  - C1 the nominee's own post-training strategy P&L (holdout + final) ≥ 0;
  - C2 post-training Δ versus **B4** ≥ −$2,500 (not materially worse than the default) at 5 and 10 bps;
  - C3 full-`all` fixed minute DD ≤ $35,000;
  - C4 full-`all` portfolio maximum daily % DD ≤ 35%;
  - a nominee failing any C-rule is **not recommended**; a nominee passing all is graded E3 (§10), never "validated".
- No positive margin versus B5 is required: B5's post-training edge rests on two GDX lots (its own study's finding),
  and requiring a new pool to beat an inspected, partly lucky benchmark on the same inspected window would be
  neither fair nor informative. Its Δ versus B5 is reported with the two-largest-lots bridge, as before.
- Alternatives considered: *descriptive only* (loses the cheap falsification), *primary confirmation* (overstates
  independence). The chosen role is the middle.

## 10. Evidence grades (used verbatim in every report)

| Grade | Meaning | Where it appears |
|---|---|---|
| **E0** | in-sample optimized training figure (a peak) | centre nets; never a headline |
| **E1** | in-sample smoothed figure (N1 neighbourhood statistics, independent confirmation batch) | the headline training figure of every configuration and benchmark |
| **E2** | procedure-level walk-forward persistence inside 2017–2023 (G-WF, ablation) | the method's forward evidence; thin (2 folds) |
| **E3** | locked historical confirmation on the inspected 2024-01-02 → 2026-10-13 window (C1–C4) | "historically consistent"; can block, cannot validate |
| **E4** | genuine forward evidence: sessions after 2026-10-13 under frozen vectors and rules | none exists at design time |

The strongest statement the study can make about a nominee is: "robustly positive on E1 by ≥ M over the benchmarks'
smoothed figures at equal or lower neighbourhood risk; the procedure that selected it showed E2 persistence in k of 2
folds; E3 consistent; E4 pending". A no-advancement outcome is stated with the same grades.

## 11. Minimum history, warm-up and small folds

- Arming requires L sessions of reference-high history (≤ 250) and the common eligibility date 2017-06-15; the file
  starts 2016-01-04, so every round has ≥ 365 sessions before eligibility and no cold-start shortfall.
- Validation continuity: positions, stops, continuation windows and loss restrictions existing at the search end carry
  into validation (they are the realistic state of a running pool); this is the same convention as the repository's
  `all` runs and segment attribution.
- Fold a's three eligible years with ≈ 30–45 funded lots are enough to rank thousands of configurations only because
  the fitness is smoothed; its pick is expected to be noisier than fold b's, and the gate treats the two folds
  symmetrically rather than weighting the shorter one down (predeclared simplicity). Fold a0 is descriptive only.
