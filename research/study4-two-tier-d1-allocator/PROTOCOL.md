# Protocol — Study 4: two-tier D1 capital allocation (shallow-dip specialists, frozen B5, preemption, joint optimization)

Study id `study4-two-tier-d1-shallow-deep-joint-allocator-v1`. Branch `research/study4-two-tier-d1-allocator`. Research
directory `research/study4-two-tier-d1-allocator/`, code `src/study4-two-tier-d1-allocator/`. Brief:
`brief/CLAUDE_STUDY_4_TWO_TIER_D1_ALLOCATOR_SHALLOW_DEEP_JOINT_OPTIMIZATION.md` (sha256 `9cb40a09…`). Companion
documents bound by the same freeze: `ENGINE_CONTRACT.md` (the executable allocator), `SEARCH_PLAN.md` (optimizers and
budgets), `EXPERIMENT_MATRIX.json` (machine-readable matrix), `SOURCE_AND_CONFLICTS_AUDIT.md` (sources and registered
leakage), `reviews/PRE_FREEZE_DISPOSITIONS.md` (how the two pre-freeze reviews changed this text). Revision 2 (after
the reviews), written before any Study 4 outcome-bearing computation. All times UTC.

## 0. What is and is not claimed

- Every result is computed on 2016-01-04 → 2023-12-29 bars that the designer has inspected before (audit §5). Fold
  results are **retrospective chronological forward-selection replays**, not independent out-of-sample validation. The
  full-history window H is **in-sample description only**.
- 2024–2025 and 2026 bars are not read for any purpose (§3). No result is prospective. No live, paper or broker action.
- A negative or "no nominee" outcome is a complete, valid result. Phase 4D runs to its frozen floors whatever 4A–4C
  show (§7.4).
- No statistical significance is claimed: 61 correlated symbols, four dependent years, millions of configurations.

## 1. Question and hypotheses

**Q.** Can lower-priority D1 phenotypes with shallower, more frequent dip entries, sharing B5's single funded $100,000
slot, raise the net profit of the actual one-slot pool — mostly in time B5 would leave idle — while preserving nearly
all of B5's profitable deep-dip trades, within fixed-slot risk limits, without being undone by preemption losses, and
robustly across chronological folds, neighbouring parameters, execution and costs?

- **H1 (4A).** Within each training window, shallow-band D1 phenotypes exist whose trades fall in B5-idle time with
  positive first-order net (training-only measurement).
- **H2 (4B).** Adding such books to unchanged B5 under an idle-only (non-preemptive) allocator raises the funded pool's
  net versus B5 without breaking risk or preservation limits.
- **H3 (4C).** A causal preemption policy improves on H2 by recovering deep-tier opportunities that shallow lots would
  otherwise block, net of forced-exit losses.
- **H4 (4D).** Optimizing books and allocator jointly **inside** the shared-pool engine finds value that independently
  optimized shallow books (4A–4C) do not: (A) with frozen B5 (contrast: 4D-A0P, the same search with preemption off);
  (B) with B5 members reoptimized in a deep neighbourhood (contrast: 4D-B0, deep-only, same budget); (C) with free
  tier composition (contrast: 4D-C0, deep-only, same budget).
- **H5 (4E).** Any such improvement survives the sealed fold-by-fold chronological replay of 2020–2023 as one
  executable chained account, the verdict rubric (§12), perturbations, execution and cost stresses, and a matched
  random-champion null.

## 2. Invariants and hard boundaries

1. Frozen B5 (`config/pools/B5.json`, its five phenotype JSONs, the frozen engine and ledger) is the control in every
   phase, loaded by `loadPool('B5')`; nothing of it is edited. Challengers get new ids in Study 4's namespace only.
2. One funded $100,000 slot across **all** books; never two lots, a lot plus a reservation, or a lot plus a pending
   replacement at once; never compounding; 11% simple interest (365-day year, whole calendar days between session
   dates); 5 bps per side; stop fill at the stop; no stop slippage (stresses in §10). No margin model in the fixed slot
   (insufficient cash cannot occur).
3. Books arm from the first session ≥ 2017-06-15 (B5's frozen eligibility date) for every book in every experiment.
   Accounting starts at the close of 2016-01-04.
4. The fixed slot books no distributions for any symbol (price-only, split-adjusted with splits effective on or before
   the door end; matched for all variants). Ex-dividend drops are price moves; this can create artificial dips and stops
   for shallow books on high-yield ETFs (registered, §5).
5. Study 4 never edits another study's files, `config/pools/*`, `config/phenotypes/*`, `data/`, the frozen engine
   closure, `CLAUDE.md` or the recovery guide; it never runs `pools forward`, the prospective verifier (it hashes whole
   data files), `npm test` in the data checkout, or any generic command that reads whole data files.
6. Commit and push only the Study 4 branch, after the final review; no merge, no PR.

## 3. Data, universe and doors

- **Data cap 2023-12-29.** The Study 4 door (`doors.ts`) is the only market-data access, opened on the main thread only
  (workers receive the loaded shared arrays and cannot open a door). Per request it (i) refuses an end after the cap or
  an unauthorised purpose **before a byte is read**; (ii) reads each `data/<SYMBOL>/data.csv` from its first byte and
  stops at the first line whose UTC timestamp is ≥ end + 1 day 06:00Z, without parsing it (lines after it are never
  parsed); (iii) hashes only the bytes read (prefix sha256), never a whole file; (iv) groups sessions with the shared
  session builder and selects the window with the shared `selectRunSessions` (training partition, access
  `optimization`), with only the split events effective on or before the end; (v) asserts the last loaded date equals
  the requested end, no retained bar at or after the cap's next day, identical calendars across symbols, and records a
  loaded-bar sha256 per symbol; (vi) fixes **one door end per process**; (vii) appends each opening (purpose, window,
  end, symbols, prefix hashes, pid, time) to `results/doors.jsonl`, sealed by hash into each stage record. Trace caches
  are keyed by the dataset id (symbol, prefix hash, last date).
- **Authorisation.** `development` (window w) reads through w's development end; H's development opens only after the
  sealed fold evaluation. `evaluation` reads through 2023-12-29 only when every fold's sealed `SELECTION.json`
  verifies. `parity` reads the five B5 members through 2023-12-29 and is refused once `CODE_FREEZE.json` exists (unless
  the evaluation door is authorised); the parity entry point traces only the registered B5, B4 and B1 phenotypes
  (asserted by parameter hash). Tests read synthetic files under the OS temp directory only.
- **Cross-check.** At the parity gate the five B5 members' loaded-bar hashes at 2023-12-29 must equal the sealed hashes
  of the ranked-preemption `trainingUniverse` door (`results/controls/final/CONTROLS.json`); for the other symbols the
  same comparison happens only in the evaluation stage. A mismatch stops the study.
- **Universe U61:** the 61 audited symbols (audit §3). GDXJ, OIH (late start) and XLRE (missing sessions) are excluded
  by the inherited audit; every symbol's per-window eligibility, band and role-check outcome are recorded.

## 4. Windows and folds

| Window | Development (training) sessions | Held-back evaluation year | Use |
|---|---|---|---|
| F20 | 2016-01-04 → 2019-12-31 | 2020-01-02 → 2020-12-31 | COVID shock and recovery |
| F21 | 2016-01-04 → 2020-12-31 | 2021-01-04 → 2021-12-31 | uptrend |
| F22 | 2016-01-04 → 2021-12-31 | 2022-01-03 → 2022-12-30 | bear market |
| F23 | 2016-01-04 → 2022-12-30 | 2023-01-03 → 2023-12-29 | recovery |
| H | 2016-01-04 → 2023-12-29 | none | in-sample description and the nominee source (§12.3) |

Order: F20 → F21 → F22 → F23 development stages (each in its own process and door; they may run concurrently), each
ending with its sealed selection; then the evaluation stage for all folds; then H. No evaluation-year result is computed
before all four fold selections are sealed. F20's development window contains B5's long 2017–2019 idle stretch and few
B5 lots, so its preservation figures are coarse (registered). Regime labels (descriptive): 2018 Q4 decline
(2018-10-01 → 2018-12-24), COVID crash (2020-02-19 → 2020-03-23) and recovery (→ 2020-08-31), 2021 trend, 2022 bear
(2022-01-03 → 2022-10-12), 2023 rebound.

## 5. Tiers, roles and the D1 parameter space

**D1 architecture.** Every book is the frozen D1 book (`ShadowBook` on the verified port of
`allIn-trailingBuy-postExitContinuation.ts`): deep-path arming at X below the L-session reference high, trailing buy on
a Y rebound, net-profit-activated trailing stop, maximum-hold loss exit, buffered intraday loss exit, post-exit
continuation (P pullback within W sessions after a profitable exit), no re-entry on an exit session. No new mechanism.
Eight parameters on the frozen grid (tenths of a percentage point; integer days and sessions): X by role, Y ∈ [0.1%,
5.0%], stop ∈ [3.0%, 15.0%], hold ∈ [3, 30] calendar days, L ∈ [20, 250] sessions, buffer ∈ [0.0%, 6.0%], P ∈ [3.0%,
20.0%], W ∈ [10, 200] sessions. Every new vector is exactly on this grid (0.1-pp quantization in generation, mutation,
crossover, caching and reporting); registered B5 vectors are used exactly.

**Volatility scale.** σ(s, w) = √252 × sample standard deviation of daily log close-to-close returns of symbol s over
w's development sessions (from 2016-01-05; split-adjusted closes), computed in w's development stage from w's door and
recorded before any search of w.

**Decisions.** A book's development decisions = its virtual trades (deep path plus continuation) in w's development
sessions; per year = decisions ÷ (years from the arming date to w's end).

**Shallow (low-priority) role.** X ∈ B_sh(s, w) = [max(3.0%, 0.15 σ), min(0.45 σ, 15.0%)], rounded inward to 0.1 pp; on
a B5 symbol also X ≤ 0.6 × the B5 book's X. A band narrower than 1.0 pp is empty (the symbol has no shallow book in w;
reported). **Frequency role check** (every symbol, training-only): the book's development decisions must be ≥
max(2 per year, 1.5 × the decisions of its reference vector — the same vector with X = 0.85 σ, rounded, capped at
30.0%). A book failing it is not a shallow book (counted as role-infeasible).

**Deep (high-priority) role.** B5's five books in every frozen-B5 experiment (4B, 4C, 4D-A, 4D-A0P). New deep vectors:
- deep floor ρ(w) = the smallest X₀/σ(s, w) over the five B5 books in w; a new deep vector needs X ≥ ⌈ρ(w) σ⌉ (and ≥
  8.0%); never inside the shallow band.
- 4D-B neighbourhood of a B5 book with incumbent X₀ (tenths): X ∈ [max(⌈ρ σ⌉, X₀ − 30), min(300, X₀ + 30)] ∪ {X₀}; Y
  ±5, stop ±15, hold ±3, L ±25, buffer ±10, P ±20, W ±20 grid units around the incumbent, intersected with the box (the
  incumbent is always inside its neighbourhood).
- 4D-C broad deep band on any U61 symbol: X ∈ [max(8.0%, ⌈ρ σ⌉), 30.0%] (empty if above 30.0%).
- **Frequency role check:** development decisions ≤ 1.5 × the incumbent's + 2 on a B5 symbol; ≤ the busiest B5 book's
  decisions per year (in w) on any other symbol.

**Same ETF in both tiers** (a B5 book and a shallow book on one symbol, or two shallow books on one symbol) is allowed
and modelled as separate books with one shared funded slot.

**Registered design inputs.** The designer has seen the full-history σ table of the U61 symbols
(`research/d1-standalone-etf-opportunity-audit/`) and Study 2's map of B5's idle stretches; the band multipliers
(0.15, 0.45, 0.85, ρ) were set with that knowledge, before any Study 4 run.

## 6. Execution, priority and preemption (summary; binding text in ENGINE_CONTRACT.md)

- Books are **shadow books**: their virtual trades (traces) never depend on funding; preemption changes only the funded
  lot, never a book's signals (the chosen state machine; a funded-path reset is a future hypothesis). A funded lot is
  either the **exact lot** of a virtual trade (bought at its own fill) or a **mirror lot** bought by a switch at a later
  executable trade of that book's symbol and managed by the virtual trade's own exit (its stop, hold and buffer state
  are the virtual position's — disclosed and measured).
- **Priority.** Deep tier before shallow tier. Same-minute decisions: deep books alphabetical by symbol (B5's frozen
  tie rule, unchanged for B5 alone), then shallow books in the configuration's shallow priority order (a searched gene;
  default alphabetical by symbol then id). Exits, then switch sales/purchases, then fills, then decisions at one time.
- **Policies.** P0 none; P0M no forced sale, but a deep decision met by a held shallow lot is kept and bought as a
  mirror when that lot exits on its own (isolates "late funding"); P1 unconditional; P2 net-breakeven (fill test as an
  immediate-or-cancel limit); P2L legacy execution mechanics under tier priority (control only); P3(B, f) loss budget;
  P4(D) wait-then-force. A deep decision cancels a pending shallow reservation under P0M–P4 (not P2L). Shallow lots are
  never preempted by shallow books; deep and mirror lots are never preempted.
- **Gates** (shallow decisions only, causal): G0 none; G1 any deep book armed or pending; G1d any deep book armed by
  the deep path (continuation setups ignored) or pending; G2(λ), λ ∈ {0.5, 0.75, 0.9}: any deep book's symbol at or
  below its reference high × (1 − λ X_deep).

## 7. Phases (inside each window w, development data only)

### 7.1 4A — shallow D1 discovery

For each U61 symbol with a non-empty band: 4,096 unique Sobol vectors in B_sh(s, w) (scrambled, seeded by study and
symbol — the same stream in every window; X maps into the window's band) and 1,024 local refinements (16 diverse seeds
× 64 mutations; half the seeds by standalone net, half by idle-clean net). Each vector and its frequency reference vector
are traced standalone on w's development sessions (one $100,000 book; 5 bps; 11%). Recorded per vector: decisions, wins,
net after interest, worst trade, minute and daily DD, held days, mean hold, deep/continuation armings, yearly and
regime nets, falling-knife losses (losing trades entered ≥ 5 sessions before the symbol's development low of that
episode), and **B5-idle compatibility** against B5's P0 funded path in w (a training-window feature): idle-clean
trades (reservation → exit entirely outside every B5 slot interval) and their net, conflicting trades and their net,
idle share. **Library 𝓛(w):** per symbol and per X tertile of its band, up to four distinct role-feasible vectors with ≥
4 development decisions and minute DD ≤ $35,000 — L1 max standalone net (> 0), L2 max idle-clean net (> 0), L3 max
idle-clean net per held day (≥ 4 idle-clean trades, > 0), L4 max (standalone net − minute DD) (> 0) — keeping only
members at normalized grid distance ≥ 0.15 from members already kept (up to 12 per symbol). Standalone profit is not a
hard screen. A symbol with no qualifying vector contributes none (reported, with the reason). Neighbourhood shape:
the ±1-step profile of each L1 member; pairwise decision-timing correlation of the library.

### 7.2 4B — frozen B5 integration (idle-only)

All under P0 (idle-only: a shallow decision is funded only if the slot is free; a funded shallow lot runs to its own
exit). Runs: B5 alone; B5 + each member of 𝓛(w); greedy forward subsets (k ≤ 3) from the 40 best singles by Δnet, one
unconstrained and one restricted to distinct symbols with pairwise decision-overlap ≤ 25%; dual-phenotype sets (B5 +
the best single on each B5 symbol; B5 + the two best B5-symbol singles); gates G1, G1d, G2(0.5/0.75/0.9) on the 10 best
sets; the **standalone comparator SA(w)** = B5 + the three best 𝓛(w) members by standalone net on distinct symbols.
Refused shallow opportunities are classified (busy/refused under B5, idle-then-conflicting, idle-clean). The 4B pick
is chosen by §8.

### 7.3 4C — priority and preemption

Fifteen policies — P0, P0M, P1, P2, P2L, P3(B ∈ {500, 1000, 2000, 3500} × f ∈ {any, deep-path}), P4(D ∈ {0, 1}) — on: the
4B pick's set with its gate (omitted if the 4B pick is no-fill), SA(w), the 10 best 4B singles and the 5 best 4B greedy
subsets (G0). The 4C pick is chosen by §8 over all runs. Switch ledgers are recorded for every run, with counts of
switches whose decision estimate was within $250 of the threshold.

### 7.4 4D — mandatory joint optimization

Each experiment's frozen budget is a **floor** that is always spent; nothing in 4A–4C can skip or shorten it.
Genomes, operators, islands and budgets: SEARCH_PLAN.md.
- **4D-A** — B5 frozen; jointly searched shallow tier (0–4 books, any symbol with a band, same-symbol duals allowed),
  each book's vector in its band, the shallow priority order, policy and gate. New books in 4D-A are always shallow
  (assigning a new book to the deep tier is 4D-C's question). Objective computed by the real shared-pool replay.
- **4D-A0P** — the same search with the policy fixed at P0 (gates allowed): the same-budget contrast for "does
  preemption itself add value".
- **4D-B** — a new challenger: each B5 book incumbent or reoptimized in its deep neighbourhood, plus a shallow tier
  (0–4) and allocator. **Control 4D-B0:** deep-only (shallow tier empty, P0/G0), same budget.
- **4D-C** — free composition: deep tier any 1–6 books (B5 incumbents, B5 symbols with broad deep vectors, or deep books
  on other U61 symbols), shallow tier 0–4 books, allocator. **Control 4D-C0:** deep-only, same budget.

Every experiment records Pareto fronts (Δnet ↑, minute DD ↓, P&L-weighted preservation ↑), hypervolume per generation,
all evaluated configurations' compact metrics, and its sealed picks.

## 8. Selection rule (identical for 4B, 4C, every 4D experiment and control; per window)

Scores use w's development sessions, 5 bps, 11%; Δ = candidate − B5 under the same engine and window; yearly Δ by
liquidation-mark increments of the development years (2017 counts from the arming date).
1. **Feasible:** minute DD ≤ min($35,000, B5's development minute DD + $5,000); daily DD ≤ $30,000; Δnet ≥ +$10,000;
   no development year > 70% of Δnet; leave-one-year-out Δ > 0 (Δnet minus any single development year's Δ stays > 0);
   preservation (§9.3) — 4B, 4C, 4D-A, 4D-A0P: P&L-weighted (exact + delayed, capped) ≥ 0.90, count-weighted ≥ 0.85, and
   none of B5's five largest winning lots of the window missed; 4D-B, 4D-B0, 4D-C, 4D-C0: P&L-weighted retention
   (including matched-altered, capped) ≥ 0.75 and none of the five largest missed.
2. **Robust step:** the 50 feasible configurations with the highest Δnet that are structurally distinct (different
   membership, tier composition or policy kind) each get 24 joint ±10% perturbations (§10.3 rule). Their median Δnet,
   10th-percentile Δnet and share with Δnet > 0 and feasible DD are recorded.
3. **Pick (primary, "robust constrained net"):** the highest perturbation-median Δnet among those with median ≥
   +$5,000 and share ≥ 0.60. If none qualifies the pick is **no-fill = B5 unchanged** (a valid decision).
4. **Secondary picks (selection robustness only; never nominated):** S-raw = highest feasible Δnet without step 2;
   S-risk = highest feasible Δnet − 2 × max(0, minute DD − B5's minute DD).
5. Ties: higher Δnet, then lower minute DD, then lexicographic config hash.

Picks are sealed per window (`results/selections/<w>/SELECTION.json`, write-once, body-hashed) with exact vectors,
symbols, tiers, priority order, policy, gate, config hashes, seeds, budgets, development scores and the perturbation
lists. A P3/P4 pick with zero executed switches in development is reported as P0-equivalent in attribution.

## 9. Metrics and attribution (frozen definitions)

### 9.1 Pool economics
Net (realized + open lots marked at the last close, interest-net, no exit friction — the frozen convention); a window
increment V = liquidation mark at the window end − liquidation mark at the previous year-end close (exit friction at both
ends; the ranked-preemption convention). Interest, costs, forced-sale friction and losses, shallow-funded net, deep-exact
net, mirror net (delayed vs. superseded/late-funded separately), switches by outcome, mirror entry slippage against the
virtual fill ($, bps, minutes), mirror exits whose condition is false for the mirror itself (counts, $), same-symbol
switches and their friction, occupancy on the shared calendar's regular-session minute grid (idle / reserved / held /
pending switch), net per funded day, yearly net.

### 9.2 Risk
Minute and daily maximum drawdown in dollars and % of the $100,000 slot, with peak and trough times, from strict-peak
trackers starting at 0 (whole window) or at the boundary mark (windowed); worst closed lot, worst unrealized excursion,
longest losing streak, forced exits at a loss, largest 20-session loss cluster.

### 9.3 Preservation of B5
Reference: B5's P0 funded lots in the same window. Matching is **one-to-one** by book identity and virtual trade id (B5
books' traces are identical in every configuration that keeps them unchanged). Each B5 lot is **preserved-exact** (funded
at its own fill), **preserved-delayed** (a mirror lot of the same trade), **matched-altered** (only for a B5 symbol whose
B5 book was reoptimized or removed: the first unmatched deep lot of that symbol's deep book overlapping the B5 lot's
holding interval; reported separately and never called preserved), or **missed**. Count-weighted preservation =
(exact + delayed profitable B5 lots) ÷ profitable B5 lots. P&L-weighted preservation = Σ over profitable B5 lots of
min(candidate net on that trade, B5 net) (0 if missed) ÷ Σ of their B5 net, exact + delayed only; **P&L-weighted
retention** additionally credits matched-altered lots (capped the same way). B5 trades refused by B5 but funded by the
candidate are "gained", reported separately. Thresholds: 0.90 / 0.85 operationalize the brief's "nearly all", allowing
roughly one in ten of B5's winning dollars or one in seven winners to be given up only if the rest of the pool pays for
it; 0.75 for reoptimized deep tiers, where some B5 trades are legitimately changed (and labelled so). The top-five rule
protects the trades that dominate B5's P&L.

### 9.4 Idle-capital attribution
Idle-clean net is a training-window feature in 4A–4D selection (brief §4 allows training-period occupancy) and an
ex-post diagnostic in evaluation. Each candidate shallow lot is classified against the unchanged B5 path of the same
window: **idle-clean** (its reservation → exit interval overlaps no B5 slot interval), **idle-then-conflicting** (starts in
B5-idle time, overlaps a B5 slot interval later), **busy-start** (starts inside a B5 slot interval — only after an altered
sequence). First-order idle-clean net and whole-path Δnet are both reported; their difference is the path effect.
**Paired contributions:** each candidate lot's net minus its matched B5 lot's net (0 if unmatched), plus −net for each
missed B5 lot; these sum to Δnet up to open-lot marking and are used for concentration (E8).

## 10. Phase 4E — chronological evaluation and robustness

1. **Fold evaluation.** For each fold y and each sealed pick (4B, 4C, 4D-A, 4D-A0P, 4D-B, 4D-B0, 4D-C, 4D-C0, secondary
   picks, SA) and ablations — shallow tier off; preemption off (P0, same gate); P0M; for 4D-B/4D-C also B5's deep tier
   with the pick's shallow tier and allocator — one continuous replay from 2016-01-04 to the end of year y; V_y, windowed
   minute/daily DD, preservation and attribution in year y. B5, B4 and B1 likewise.
2. **Chained account (the verdict object of each experiment's procedure).** One executable account from 2016-01-04
   whose configuration until 2020-12-31 is F20's pick (so the 2019-12-31 state, including any open lot, is that of F20's
   own continuous run), in 2021 F21's, in 2022 F22's, in 2023 F23's; measured from the 2019-12-31 liquidation mark. A
   book with the same id and vector in consecutive picks continues deciding; a book absent from the new pick becomes a
   runoff book (no new decisions; its funded lot, if any, exits by its own rule and keeps its tier). **Carry** (primary):
   lots, reservations and pending switches cross the boundary under their own rules; a WAIT carried across the boundary
   blocks new decisions until it resolves (counted). **Reset** (secondary): at each year-end close (from 2019-12-31) the
   held lot is sold at the closing print (a session without a closing print uses its last close: a non-executable
   liquidation mark, labelled), a lot filled at that closing print is sold at the next session's opening trade,
   reservations and pending switches are cancelled; compared with **B5 under the same resets**. B5's carry comparator is
   B5's continuous run.
3. **Perturbations.** For each fold pick and its shallow-off ablation, 64 joint perturbations: every searched percentage
   × (1 + u), u ~ U[−0.1, 0.1], integers × (1 + u) rounded with at least ±1 unit possible, re-quantized to the grid and
   kept in role bands; P3 budget ± up to 10%; evaluated on development and on the evaluation year; shares within
   $35,000 DD and with Δ > 0, median and 10th percentile. One-at-a-time profiles (each coordinate −10%…+10% in 5 steps)
   for each fold's 4D picks.
4. **Financing and execution.** Interest 8/11/14% × cost 0/5/10 bps for every pick and B5 (traces rebuilt per setting);
   stop slippage 25 bps; stop fill `next-open`; replacement latency +5 minutes; legacy replacement (P2L mechanics) for
   P2 picks; missing-bar stress (each regular-session bar except the first dropped with probability 0.5%, three seeds,
   all symbols). Reported for the chained accounts and per fold.
5. **Seed stability.** Every 4D experiment runs four seeded islands in development (SEARCH_PLAN); each island's own
   pick (same §8 rule on its own evaluations) is recorded; membership/tier/policy Jaccard across islands and folds.
6. **Selection skill and null.** For each experiment and fold: evaluation Δ of the 100 best development configurations
   and of 100 random configurations of the initial design; Spearman(development Δ, evaluation Δ). **Random-champion
   null:** 100 random one-tenth subsamples of each fold's evaluated configurations, each with the §8 rule applied to the
   subsample (its robust step scaled in proportion: the 5 best structurally distinct feasible configurations × 24
   perturbations), chained across folds by replicate index and evaluated like the pick.
7. **Event diagnostics.** 2018 Q4, COVID 2020, 2021, 2022, 2023: shallow entries before deep signals, forced losses,
   recovered deep trades, the longest B5 idle periods, idle minutes after a deep lot exits while a preempted shallow
   virtual trade is still open. 2022 findings are labelled target-year-informed description.
8. **Portfolio overlay** ($300,000 60/40 VOOG/VGT, 20% of marked equity per funded decision, 11%, frozen dividend
   convention), chained the same way, only if a Study 4 overlay reproduces the frozen B5 portfolio training anchor (end
   equity $2,270,264.33, daily 29.6678%) exactly. If it cannot be built, E4 is "not evaluated" and **no candidate can be
   labelled historically promising or nominated** (declared before results). The fixed slot stays primary.
9. **H.** The full 4A–4D pipeline on H: in-sample description and the source of each experiment's nominee (§12.3).

## 11. Stopping, failure and amendments

- Stop before optimization if: B5 parity differs by more than $0.005 in any anchored figure or by any lot; the fast
  replay differs from the reference implementation in any lot, switch, mark or drawdown; or a door check fails.
- A post-freeze correctness fix is an append-only amendment (`AMENDMENTS.md`, `results/amendments.jsonl`) naming the
  defect, the affected stages and the rerun; earlier records are kept. No criterion, threshold, budget or rubric changes
  after outcomes. Conditional budget extensions are only those predeclared in SEARCH_PLAN.md (training-only triggers).
- A correctness fix after the evaluation door opens that changes any sealed selection: both versions are evaluated and
  reported, and every affected label is capped at "descriptive improvement but insufficient evidence".
- If a phase cannot finish, it is reported **incomplete** with its achieved coverage.

## 12. Verdict rubric (frozen; computed by code from sealed records)

### 12.1 Criteria
Applied to each experiment's chained carry account (4B, 4C, 4D-A, 4D-A0P, 4D-B, 4D-C; controls 4D-B0/4D-C0 are scored
for contrast only). Δ = chained account − B5 continuous run, per year 2020–2023 and summed (ΣΔ), at 5 bps / 11%.

| Code | Criterion |
|---|---|
| V1 validity | B5 parity exact at 0/2/5/10 bps; fast = reference on every parity case (with branch quotas); doors and freezes verify |
| V2 completeness | every frozen budget spent in F20–F23 and H; selections sealed before the evaluation door opened |
| E1 incremental economics | ΣΔ ≥ +$20,000; Δ_y ≥ −$10,000 every year; Δ_y > 0 in ≥ 3 of 4 years |
| E2 preservation | chained evaluation years: P&L-weighted preservation ≥ 0.90 and count-weighted ≥ 0.85 (4B, 4C, 4D-A, 4D-A0P); P&L-weighted retention ≥ 0.75 (4D-B, 4D-C); none of B5's ten largest 2020–2023 winning lots missed |
| E3 fixed-slot risk | chained minute DD ≤ $35,000 and ≤ B5's + $5,000; chained daily DD ≤ $30,000 |
| E4 portfolio risk | chained overlay daily DD ≤ 30%, or ≤ 35% and ≤ B5 overlay + 2 pp; "not evaluated" if no overlay |
| E5 neighbourhood | pooled evaluation-year perturbations: share Δ_y > 0 ≥ 0.60 and median Δ_y > 0 |
| E6 chronology and attribution | two-tier picks: shallow-funded net > 0 in ≥ 3 of 4 years; 4D-A: ΣΔ(4D-A) − ΣΔ(4D-A0P) reported (allocator contribution); 4D-B/4D-C: ΣΔ − ΣΔ(own control 4D-B0/4D-C0) ≥ +$10,000 with a positive yearly margin in ≥ 3 of 4 years, and ΣΔ versus own shallow-off ablation ≥ +$10,000 |
| E7 costs | ΣΔ > 0 at 14% / 10 bps |
| E7b execution | ΣΔ > 0 under each of: +5-minute replacement latency, 25 bps stop slippage, next-open stop fills |
| E8 concentration | ΣΔ minus the largest single paired contribution > 0; ΣΔ minus the largest 20-session paired cluster > 0; no year > 70% of ΣΔ; no symbol > 70% of the positive paired contributions |
| E9 fundability | two-tier picks: ≥ 8 shallow-funded lots in 2020–2023, in ≥ 3 different years |
| E10 opportunity specificity | first-order idle-clean shallow net > 0 and ≥ 50% of ΣΔ; otherwise the gain is labelled a reshuffle |
| E11 selection null | ΣΔ ≥ the 75th percentile of the random-champion null; pooled Spearman(development Δ, evaluation Δ) > 0 |

### 12.2 Labels
**invalid/incomplete** (V1 or V2 fails); **risk-incompatible** (E3 fails, or E4 fails when evaluated); **no demonstrated
incremental benefit** (E1 fails); **descriptive improvement but insufficient evidence** (E1 passes and any of E2, E5–E11
fails, or E4 not evaluated); **historically promising but unvalidated** (all pass). Ablations of an optimized
configuration are biased in its favour (re-optimizing the ablated configuration could recover part of the gap); the
same-budget controls (4D-A0P, 4D-B0, 4D-C0) are the clean contrasts.

### 12.3 Nominee
Each experiment's nominee candidate is its **sealed H pick** (the configuration that would go to a separately
authorised 2024–2025 validation), eligible only if the experiment's chained label is "historically promising" and the H
pick itself meets the H feasibility rules of §8 and E3 on H. If several experiments qualify, the first in the parsimony
order 4B → 4C → 4D-A → 4D-B → 4D-C is nominated and the result is reported as "k of n qualified". Never nominated:
4D-A0P, 4D-B0, 4D-C0, SA, S-raw, S-risk, ablations. Otherwise **no nominee**.

**Registered bias (audit §5).** B5's vectors were chosen with 2016–2026 hindsight; 4D-B neighbourhoods, 4D-C incumbent
options and the shallow cap (≤ 0.6 × B5's X) derive from them, so 4D-B/4D-C challengers inherit post-2023 information and
could not later receive a clean 2024–2025 validation; moving away from a look-ahead optimum also biases their fold Δ
against them. 4D-B versus 4D-B0 (both inheriting the same information) is the clean contrast.

## 13. Records, freezes, tests, reports

- `PROTOCOL_FREEZE.json` binds this file, ENGINE_CONTRACT.md, SEARCH_PLAN.md, EXPERIMENT_MATRIX.json, the source audit,
  the dispositions, the two reviews and the brief before any outcome-bearing run. The code is frozen in two steps:
  `results/CODE_FREEZE.json` binds the import closure of the development stage (allocator, traces, doors, evaluation,
  phases, 4D search, selection, worker) after the parity gate passes and before any 4A run; every development stage
  refuses to run if any bound file changed. `results/CODE_FREEZE_EVALUATION.json` binds the closure of the evaluation
  stage, is written after every fold selection is sealed and before the evaluation door opens, and must show the
  development closure unchanged; the evaluation code implements §10 as written here (it is written after the
  development results exist, which is disclosed, but before any evaluation-year result). Stage records are write-once
  JSON with a canonical body hash; a stage refuses to rerun if its record exists.
- Tests: synthetic closed-form allocator fixtures (ENGINE_CONTRACT §10); fast versus an independently written reference
  engine on randomized synthetic markets with branch quotas (§10 of the contract) and on sampled real F20 development
  pools (≥ 40); P0 parity with the frozen `replayFixedPool` (B5, B4, B1 at 0/2/5/10 bps and random distinct-symbol
  pools); P2L parity with the frozen `replayPreemptive` on one-deep/one-shallow pools; metamorphic tests; door/poison
  tests; quantization and role-band tests; and, after the seals, fast versus reference on every chained verdict account.
  The full repository suite runs only in a data-less worktree.
- Committed evidence lets a fresh clone verify every verdict figure (`verify-evidence`); heavy raw archives are
  git-ignored with hashes and regeneration commands (`verify-raw` needs them and says so).
- Reports: README, this protocol and its companions, PHASE_4A…4E, DEEP_TIER_TRADE_PRESERVATION_AND_IDLE_CAPITAL,
  ALLOCATION_AND_TRADE_LEDGER, FINAL_COMPARISON_AND_RECOMMENDATION, IMPLEMENTATION_AUDIT, AMENDMENTS, reviews/,
  RESEARCH_RECOVERY. Numbers in reports are generated from sealed records.
- Independent reviews: two before the protocol freeze (done; verbatim with dispositions in `reviews/`) and one final
  code-and-evidence review after the results.
