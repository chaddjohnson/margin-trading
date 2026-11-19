# PROPOSED_METHOD — NL0-R 0.1.0 (proposal; **experimental, not adopted, not registered**)

A versioned design for a *future, separately authorized* New L0 / N/original successor search that separates principal
loss, profit giveback and margin-liquidation exposure. It is **not** permission to run that search, not a change of
`OPTIMIZATION_STANDARD.md` (2.2.0 stays current and mandatory), not a change of NL0 1.0.0 or of any optimizer default,
and nothing here is merged into `main`. Every choice marked **[decision]** needs the user's explicit approval first.

## 0. What the evidence of this study implies for the method

1. **The conventional marked DD is not mostly giveback on this history.** New L0's MDDs were 47% / 34% giveback; the
   neighbourhood breaches were at most 31% giveback; the later cutoffs' excluded drawdowns 24–28%. Marked DD remains a good
   proxy for clustered losses below principal and for collateral volatility. It is not a measure of single-trade loss.
2. **Under a binding marked-DD gate, principal gates are redundant** (trade PL ≤ DD exactly; banked DD ≤ DD barring partial
   sales under water). They matter only if they **replace or relax** the marked-DD gate, use **tighter** thresholds, or are
   measured on **stressed** paths.
3. **The $35k gate excluded real giveback-dominated regions** (C21: $231k–$249k nets, ≥ 94% giveback, trade PL ≤ $6.1k)
   and, from C21 on, the most profitable unconstrained screen proposals — but none of the excluded fitted centres beat the
   qualified ones, and the later exclusions were mostly principal-loss clusters. The archives cannot show what an
   unconstrained search would have found.
4. **Stop-aware valuation is a correct lot-level diagnostic but a poor selection input** (it made P2 worse than RA1 in
   all three populations); RA1's open-exposure screens worked as a proxy for regime-fitted configurations.
5. **Open-ended Growth exits are the clearest principal-risk mechanism** (L/RA1: one lot $30,329 below principal in 2025;
   C21: one lot $37,603 below principal; an excluded C23 configuration: $23,318 below principal on a lot that still closed
   +$17,794 — invisible in its final net).
6. **Margin headroom is consumed mainly by holding the slot** (m × market value) and by giveback at (1 − m); a large winner
   adds collateral until it is given back. The fixed-slot ledger cannot say whether an account survives; only an account
   scenario can.

## 1. Risk inputs: formulas and implementation hooks

All definitions are METRIC_SPECIFICATION.md's. Hooks (research code on this branch; a successor would port the minimal
pieces into its own evaluation path and verify them against these functions):

| Input | Formula | Hook (verified here) | Cost inside a search |
|---|---|---|---|
| Marked DD, period DD | strict tracker on M | engine (`pool.ts` `Tracker`) — unchanged | none (already computed) |
| Trade principal loss PL_i, PL_max | max(0, −min λ_i) incl. exit | `metrics.ts tradeRisk`; in-pool: the pool's `lot.worst` (marked, detail mode) minus the exit-cost term | small: track the lot minimum per mark (detail mode already does) |
| Banked-capital DD | max_t [max(0, max R) − M] | `metrics.ts bankedDrawdown` | one running max and one comparison per mark |
| Realized DD, clusters | strict DD of R; episodes of R | `realizedDrawdown`, `realizedEpisodes` | per fill only |
| Floor shortfall | max(0, −min M^L) | `floorShortfall` | one running min |
| Giveback per lot, DD attribution | §6 of the specification | `tradeRisk`, `attributeDrawdown` | per-lot best (detail mode) — report-only |
| Stop state, CN*, bounded exit | §7 of the specification | `stops.ts stopStateAt`, `boundedLossExit` | end-of-run only — diagnostic |
| Account-margin scenarios | §8 | `margin.ts` | post-hoc only |
| Stress paths | gap-through-stop (−10/−20/−30% opens), D1 hold-window tail (standard §5.9) | Assignment 3's `tools/vg-l0-full-joint/tail.ts`; this study's `valueStressed*` | small (per candidate) |

Verification requirements before any search (as in this study): rebuilt marks = engine marks; G-S on every stop exit;
the brief's §1.6 cases; G5-style parity of selectors on archived populations.

## 2. Classification: hard gates, Pareto objectives, diagnostics

| Quantity | Proposed role | Why |
|---|---|---|
| Centre net (marked, after costs and interest) | **objective** (unchanged, standard §2.2) | net profit stays central |
| Neighbourhood robust net (½ median + ½ p10) | **objective** (unchanged) | local stability |
| **Trade principal loss** (centre, liquidation, intratrade) | **hard gate** ≤ L_t **[decision: L_t]**; plus its neighbourhood p90 as an **objective** | the loss the brief wants bounded per $100k lot; scenarios $25k preferred / $35k maximum (never shown safe; on this history the 2,467 qualified archived members' worst trades reached $27,988 at C23 and $27,047 at C24 — two members above $25k — the key candidates ≤ $11.1k on development, every regenerated neighbour ≤ $19.5k, and L/RA1's open-ended Growth lot $30,366 in 2025) |
| **Banked-capital DD** (centre) | **hard gate** ≤ L_b **[decision: L_b]**; neighbourhood p90 an **objective** | erosion of starting and banked capital, excluding unbanked giveback |
| **Marked DD** (centre) | **hard cap** C_m ≥ $35k **[decision: keep $35k, or raise to a margin-derived cap only together with L_t, L_b]** | collateral volatility and clustered principal loss; it must stay binding at some level |
| Marked DD neighbourhood p90 | **objective** (replacing the p90 ≤ $35k feasibility term) with a p90 ≤ C_m gate | keeps the region's collateral swings in view without making $35k the only notion of risk |
| Bounded loss exit | **structural design choice [decision]**: either required (Growth maximum hold or initial stop ON) or a protected stratum with explicit labels | the clearest open-ended principal-risk mechanism; deciding it per candidate after the fact would be post-hoc |
| Stresses: 10/20 bps, 14% interest, slippage, next-open stops, **gap-through-stop** | gates as today (Q5) + the gap scenario as a **gate on trade PL** under a −20% open **[decision]** | a stop is not a loss cap |
| Profit giveback (per lot, portfolio attribution) | **diagnostic** | real for collateral, not a loss; already inside marked DD |
| Stop-aware CN*, protected profit, profit at risk | **diagnostic** | correct lot view, harmful as a selector here |
| RA1 screens S1–S4 | **experimental selector arm** (unchanged) | the best selector on this history, designed after it |
| Floor shortfall, realized DD, clusters, MAE, occupancy, open-lot share at cutoffs | **diagnostics** (§5.9 continues) | |
| Account-margin scenarios | **separate account-level decision**, never a fitness term | depends on the user's account, not on the slot |

Overconstraining risk: the trade-PL and banked gates do not penalize giveback, so they do not suppress profit-taking
strategies; the marked-DD cap stays to stop leveraged strategies with large collateral swings. Underprotection risk: a
higher C_m without L_t, L_b and the bounded-exit choice would admit the 2022-style clusters seen in the C24 exclusions
($44–50k below principal).

## 3. Where each element acts in the pipeline (NL0 1.0.0 stages kept)

| NL0 stage | NL0-R change |
|---|---|
| Sobol / Latin screen, strata | unchanged schedules; add the Growth exit structure (bounded / open-ended) to the strata if both are allowed **[decision]** |
| Plausibility | net > 0 ∧ funded ∧ **envelope**: PL_max ≤ L_t ∧ BD ≤ L_b ∧ DD ≤ C_m ∧ (bounded exit, if required) |
| Promotion (¼ net, ¼ constrained rank, ⅛ patterns, diversity) | constrained rank on the envelope violation; **reserve ⅛ for "low principal loss, high giveback"** (PL_max ≤ L_t/2 and giveback share of DD ≥ ½) so that such regions reach rung 1 |
| Rung-1 fit (centre-first), islands (NSGA-II) | feasibility = the envelope + neighbourhood gates; objectives (−net, −robust, **p90 trade PL or p90 BD**, p90 marked DD) — four objectives; same operators, population, proposals per island, stagnation |
| Extension triggers | hypervolume of (−robust, p90 BD) against (0, L_b) and of (−robust, p90 DD) against (0, C_m); 5% triggers unchanged |
| Rungs 2–3, refinement | feasibility by the envelope; the $2,000 rule unchanged |
| Shortlist | unchanged slots + a "lowest principal tail" slot |
| Qualification | Q1, Q4, Q5 (+ gap stress), Q6 unchanged; Q2 → DD ≤ C_m; Q3 → confirmation p90 DD ≤ C_m **and** confirmation p90 trade PL ≤ L_t **and** p90 BD ≤ L_b |
| Selection | P0 (actual profit) and P1 (RA1) as co-equal arms, frozen before search; a capital-aware arm only if the user approves one (§6) |
| Folds | verdict under the frozen rule **and** reported under the envelope; neither verdict rule may change after slices open |
| Final | successor conditions as Assignment 3's (a)–(e) with "materially stronger downside" measured on trade PL and BD as well as marked DD; margin scenarios reported per candidate |

**Preserving NL0's balance.** Effort is added only by replicates of the unchanged per-lane schedules (NL0 §7.4); the
screen ≈ 4%, rung 1 ≈ 66–79%, rungs 2–3 ≈ 10–14%, refinement ≈ 8–19% allocation of NL0 and Assignments 2–3 is kept by
construction; one configuration per funded-lot ledger in promotions and shortlists; the diversity fill unchanged (its
tie-handling flag, SELECTION_PIPELINE_AUDIT notes, should be fixed in a new study's own copy, never in a frozen one).

## 4. The shared-capital joint follow-up (design only)

- **Portfolio:** D1·VGT + D1·GDX + Growth·VGT in one $100,000 slot; Priority 3's pool, L0 lifecycle, the same economics;
  **calendar-day maximum hold** as the common baseline; D1 control families A–D selectable as Assignment 3 implemented
  them; **Growth·GDX OFF; shadow delayed-entry OFF**.
- **Lanes, separately budgeted, never cross-seeded:**
  - **Independent broad (Track I):** NL0's V-cell schedule × 2 replicates per cell per cutoff (C19, C21, C23, C24), all
    three phenotypes searched fresh from each cutoff's door, the envelope in every stage. Its fold verdicts are the only
    chronological evidence.
  - **Incumbent-informed (Track N, C24 only):** seeds New L0, N/original, IJ1, C4, C4-refined and, labelled, the Track N
    finalists `GB0.VD1`, `GD.VA R4#1`, `GD.VD R4#1`; NL0's informed schedule × R_N replicates per D1 family pair; labelled
    "incumbent-informed; no independent chronological test".
  - **Controls:** New L0 and N/original replayed at every cutoff (descriptive; never selectable in Track I).
- **Selection arms:** P0 and RA1 (unchanged), frozen before search; the user decides whether a capital-aware arm is added.
- **Consequence (standard §1.8):** "no chronological support: not a deployment-qualified candidate without the user's
  decision"; "no qualifying successor" remains a valid outcome; no threshold may be changed after any slice opens.
- **2025–2026** is previously examined history, used once after the frozen selection, never for choices.

## 5. Budget and compute (grounded in measured runs)

| Reference | Fresh simulations | Wall | Throughput |
|---|---:|---:|---|
| NL0 L0 arm (5B) | ≈ 0.49 M requested | — | — |
| Assignment 2 | 34.21 M | ≈ 31 h | — |
| Assignment 3 (Growth free) | 17.53 M search + 1.64 M qualification | 44 h 24 min | 86–210 fresh/s on 12 workers, peak 19.0 GiB |
| This study (detailed replays + re-marking) | 6,184 | ≈ 25 min total | 0.16–0.34 s per configuration in-process |

- An NL0-R search at Assignment 3's scale (same cells, 2 replicates, Track N at 1.3× Track I) would need ≈ 17–20 M fresh
  simulations plus qualification; with the envelope's detail tracking inside the pool the per-evaluation cost is expected
  to rise modestly (minimum and running-max tracking per mark; the pool already tracks lot minima in detail mode) — an
  estimate of +10–30% to be **measured by the pilot benchmark** (standard §6.3), not assumed. Neighbourhood statistics of
  trade PL and BD come from the same replays (no extra simulations).
- A **bounded pilot** that only re-runs the screens and rung 1 of C21 and C24 under the envelope (≈ 0.3–0.5 M) would show
  whether giveback-dominated regions develop into better feasible regions — it is a smaller first decision.

## 6. Proposed standard text (for a future 2.3.0; **not registered**, shown as a patch proposal)

```
§2.1 (amend, [M] unchanged in force until approved):
  + The risk budget is an ENVELOPE declared before search: (a) marked maximum minute DD ≤ C_m on the fixed $100,000
  +   principal; (b) trade principal loss (liquidation basis, intratrade) ≤ L_t per funded lot; (c) banked-capital
  +   drawdown ≤ L_b. Default C_m = $35,000; L_t and L_b have no default and need the user's agreement. Under a binding
  +   C_m ≤ L_t, L_b the principal items are reported, not gated (they are implied).
§5.10 [R] (new) Risk decomposition disclosure: for every final candidate and fold primary, the exact attribution of its
  +   conventional DD (giveback above lot break-even vs loss below lot principal), trade principal loss, banked-capital and
  +   realized drawdowns, floor shortfall, realized loss clusters, and the stop-aware state of any open lot at each cutoff.
§5.11 [R] (new) Account-margin scenarios are reported separately from the ledger; never a fitness term or a gate unless
  +   the user declares one.
§4.1 (amend [S]): a study that changes a risk gate applies it at plausibility, feasibility, promotion, refinement
  +   acceptance, shortlist and qualification alike, or states why not.
```

## 7. Prospective monitoring protocol for any final nominee (design; nothing scheduled)

Freeze date D0 after the user's decision; subjects: New L0 (official), N/original and any nominee, each frozen with its
sha256 and ledger signature; at each new complete session (data appended through Priority 3's canonical import and
verified) replay from 2016-01-04 and report, from D0 only: marked net, reset DD, the exact DD attribution, trade principal
loss, banked DD, open-lot stop state, and the account scenarios; pre-declared report-only alerts (any lot below principal
by > $10k; banked DD > $15k; an open lot with no executable loss exit); no re-selection or threshold change during the
window; a minimum horizon of 12 months or two independent drawdown episodes before any comparative claim. Running it
needs the user's approval (no task is scheduled by this study).

## 8. Decision points requiring the user's approval

1. Whether conventional marked DD stays the binding $35,000 gate, or becomes a cap C_m inside an envelope (and C_m's value).
2. The trade principal-loss limit L_t ($25k preferred / $35k maximum scenarios, or another) and whether it is measured on
   the centre, the neighbourhood tail and the gap-stress path.
3. The banked-capital limit L_b.
4. Whether a bounded loss exit (Growth maximum hold or initial stop) is required, stratified or only reported.
5. The margin scenarios and maintenance assumptions to report (core size, other debt, 35% / 50% / stress rates,
   concentration trigger) — and confirmation of the actual account terms if account-specific conclusions are wanted.
6. Which selection formula, if any, joins P0 and RA1 as an arm (this study does **not** recommend P2 as specified).
7. Whether to start the next multi-million-evaluation optimization, a bounded envelope pilot first, or prospective
   monitoring only.
8. When, if ever, this research code or a standard update may be merged into `main`.
