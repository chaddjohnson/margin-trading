# Protocol: robust D1 pool discovery over an expanded ETF universe (Phase 2)

**Status: authoritative.** This file, `src/d1-robust/context.ts` (every constant below, line for line), the frozen
universe `results/audit/universe.json` and the frozen tier record `results/benchmark/tier.json` are bound together by
the protocol freeze `results/protocol_freeze.json` (sha256 of each). A pre-ingestion commitment of this text
(`results/protocol_draft_commitment.json`) was recorded before any new data were downloaded. Changes after the freeze
are allowed only as technical amendments in §24, before the first outcome of the stage they affect.

**Authority (precedence).** (1) The user's Phase 2 assignment (2026-10-25) and its corrections; (2) this protocol;
(3) the nine Phase 1 design documents in `research/d1-robust-design-review/` (Fable 5.1, unmodified); (4) earlier study
conventions. Every deviation from (3) is listed clause by clause in `APPROVED_DEVIATIONS_FROM_FABLE.md`.

**Evidence labels used everywhere.** E0 in-sample optimized peak (a centre net); E1 in-sample smoothed (neighbourhood
statistics from draws no selection used); E2 procedure-level walk-forward persistence inside 2017–2023; E3 locked
confirmation on the inspected 2024-01-02 → 2026-10-13 window (can only block); E4 genuine forward evidence after
2026-10-13 (none exists).

---

## 1. Question, hypotheses and outcomes

**Question.** Over an expanded, integrity-gated ETF universe, which nonempty subsets of D1 books with jointly chosen
eight-parameter vectors give stable net profit through one causally simulated shared fixed-$100,000 pool, at the
user's risk ceilings — where "stable" means a high neighbourhood median under a fixed perturbation instrument (E1), a
selection procedure that persists forward inside training (E2) and no reversal on the inspected 2024–2026 window (E3)?

**Hypotheses (tested, not assumed).** H1: selecting on the risk-aware neighbourhood score persists forward better than
selecting on peak net (ablation, §13). H2: some pool structurally different from B5 (membership Jaccard distance
≥ 0.5) reaches smoothed training fitness at least comparable to B5's at no greater neighbourhood risk. H3: correction
mechanisms outside US sector equities (rates, credit, non-US, real assets, factors) add smoothed pool value.

**Outcomes.** (a) Up to one primary and two alternates nominated, frozen, then confirmed or blocked on 2024–2026; or
(b) **no advancement**, with the reason (G-WF failed; no finalist passed G1–G8; every nominee blocked by C1–C4). Both
are first-class results. The strongest possible verdict is "primary forward-test candidate".

## 2. Invariants (each has a test or an audit record)

1. Every eligible ETF — VGT, VOOG, XBI, XRT, KRE and GDX included — is an optional book with the same membership and
   parameter rights as every other; no book is compulsory, preferred or excluded except by §3's integrity rules.
2. The long-term portfolio core is 60% VOOG / 40% VGT ($180,000 / $120,000 of $300,000) whatever the pool; margin lots
   of VOOG or VGT are accounted separately from core shares (the N-book engine's existing accounting).
3. The fitness environment is the fixed $100,000 non-compounded shared pool (one funded lot or reservation at a time,
   frozen shadow-book semantics, alphabetical same-minute tie order, 11% simple annual interest, per-side execution
   friction in bps). The 20%-of-marked-equity portfolio is a separate full-engine evaluation. Standalone figures are
   diagnostics only; there is no standalone track.
4. Neighbourhood statistics drive discovery, promotion and refinement; they are never a post-hoc veto only.
5. The optimizer reads only data dated on or before its round's search end (physically truncated at load); holdout,
   final and `all` open only through the benchmark, validation, evaluation and retrospective doors (§3.6).
6. No credential value appears in any command line, log, report, JSON or commit.
7. No canonical `data/<SYMBOL>/data.csv`, frozen phenotype, earlier research artifact, or frozen engine/strategy source
   is modified. Hashes are recorded before and after the study.
8. B1, B4, B5 and C0 are frozen comparators, never mandatory members; R1/R4 are inspect-only.
9. No configuration is called a future-proof winner; no advancement is a valid outcome.

## 3. Data, universe and access

### 3.1 Canonical data and calendar

Canonical files `data/<SYMBOL>/data.csv` (raw SIP minute bars, Alpaca, `adjustment=raw`), partitions from
`data/partitions.json` (training 2016-01-01 → 2023-12-31; holdout 2024-01-01 → 2025-10-16; final 2025-10-17 → open),
splits forward-adjusted once from `config/market-events/splits.json`, the VGT/VOOG distribution ledger
`config/market-events/distributions.csv`. Regular sessions 09:30–16:00 New York. Study calendar: **2016-01-04 through
2026-10-13** for every symbol (2,710 sessions). No bar after 2026-10-13 is used; the 16 existing files are not extended.

### 3.2 Candidate universe (planned before ingestion)

Existing 16 (re-audited under the same rules): EWZ GDX GLD IWM IWN KRE TLT VGT VOOG XBI XLE XLF XLU XLY XOP XRT.
Tier 1 (28): XLV XLP XLI XLB XLRE XLK SMH XHB XME KBE IWD IWF VIG USMV MTUM IJR RSP EFA VGK EEM FXI EWJ IEF EDV LQD HYG
SLV DBC. Tier 2 (20): VPU IBB OIH IGV IYT KIE QUAL SPLV IJH IEMG EWY INDA EWW ILF SHY TIP EMB AGG IAU GDXJ (AGG chosen
over BND before any data: non-Vanguard issuer, larger and more liquid). Tier 2 is attempted after Tier 1 regardless of
time used (the user authorized breadth); a symbol is dropped only by §3.4's rules.

Category tags (coverage and stratification only, never a required mix): **sector-industry** XLV XLP XLI XLB XLRE XLK
SMH XHB XME KBE VGT XBI XRT KRE XLE XLF XLU XLY XOP VPU IBB OIH IGV IYT KIE; **factor-size** IWD IWF VIG USMV MTUM IJR
RSP IWM IWN VOOG QUAL SPLV IJH; **non-us** EFA VGK EEM FXI EWJ EWZ IEMG EWY INDA EWW ILF; **rates-credit** IEF EDV LQD
HYG TLT SHY TIP EMB AGG; **real-assets** SLV DBC GLD GDX GDXJ IAU.

### 3.3 Ingestion (integrity only; `npm run robust-d1 -- ingest <SYMBOL…>`)

A thin orchestrator around the existing tools, in this order per symbol:

0. Preconditions: `curl`, `jq`, `scripts/download.sh` present; the two Alpaca variables are loaded into the child
   environment of the download only (from `.env` by the Node process, never printed, never on a command line); refuse
   if `data/<SYMBOL>/data.csv` exists (existing symbols are never re-ingested).
1. Staging check: if `data/<SYMBOL>.csv` exists and the attempt log `results/ingestion/<SYMBOL>.attempts.json` does not
   record it as this orchestrator's own incomplete output, stop (unexplained staging file, never deleted).
2. Download: `scripts/download.sh <SYMBOL> 2016-01-04 2026-10-13` with `OUTPUT_DIR=data`; stdout/stderr to
   `results/ingestion/logs/<SYMBOL>.attempt-<n>.log` after redaction of the two credential values.
3. Retries: HTTP 401/403, a missing-credential message or a refused precondition is **terminal**; HTTP 429, 5xx,
   timeouts and curl transport errors are **retryable**; at most 4 attempts, waits 30/60/120 s. Before a retry the
   staging file is deleted only if (a) its path is exactly `data/<SYMBOL>.csv` for the symbol in progress, (b) the
   attempt log marks it as created by this attempt and incomplete. Nothing under `data/<SYMBOL>/`, `data/archive/` or
   any other symbol is ever deleted.
4. Staging sanity (reported): non-empty; parseable six-field rows; first timestamp on or before the 2016-01-04
   session; last timestamp's New York date ≤ 2026-10-13 (a later bar fails the symbol: the downloader end is fixed).
5. `npm run datasets -- import <SYMBOL> --dry-run`, then `npm run datasets -- import <SYMBOL> --keep-source`.
6. `npm run datasets -- verify <SYMBOL>` (status `verified`) and the split rule of `npm run market-events -- verify`
   (no unexplained split-sized overnight move for the symbol), applied per symbol with the verifier's own function
   (`unexplainedSplitGaps`, 30%); the full `npm run market-events -- verify` runs once after each batch and its output
   is recorded. An unexplained move blocks the symbol until a split is registered with an issuer or OCC source
   document (the XOP/XLE/XLU/XLY pattern) and the check passes (`ingest <SYMBOL> --resolve`).
7. Cleanup only after step 6 passes: delete `data/<SYMBOL>.csv` (validated path), record hashes of the canonical file and
   `dataset-report.json`. On a step-5/6 failure the staging file and logs are kept; a newly created unverified
   `data/<SYMBOL>/` is moved atomically to `data/quarantine/<SYMBOL>-<timestamp>/` with a reason file, so it cannot
   enter any universe; an already verified dataset is never touched.

No ingestion decision may depend on any strategy result. New symbols get only `data.csv` and `dataset-report.json`
(no `partition-report.json` or `migration-report.json`).

### 3.4 Eligibility (the same rules for all 64 candidates; integrity and tradability only)

| Rule | Criterion |
|---|---|
| D1 history | first regular-session bar on the 2016-01-04 session; a regular-session bar on every NYSE session through 2026-10-13 (`missingSessions` empty) |
| D2 integrity | `datasets -- verify` status `verified` (no malformed, out-of-order, duplicate or out-of-range row; rows hash = file hash) |
| D3 corporate actions | every split-sized overnight move (the verifier's 30% rule) explained by a registered split with a source document; additionally every unexplained overnight move beyond ±15% is listed in the audit with the market context (reported, not a rule) |
| D4 structure | not leveraged, inverse, volatility-futures, single-commodity-futures, an ETN, or a fund that changed its investment objective or asset class inside the window; routine index reconstitution, rebalancing and GICS reclassification (which affected VGT, XLK, XLY and XLF alike) are not structural breaks |
| D5 tradability floor | training-window median regular-session daily dollar volume ≥ $10,000,000 and whole-file median regular-minute coverage ≥ 25% |

A symbol failing only D1 because of a later inception goes to the **late cohort** (recorded, not used). Failing D2–D5:
excluded with the rule quoted. Liquidity above D5 is a flag (§17), not a rule. The eligible universe U is written to
`results/audit/universe.json` (per symbol: category, source, first/last date, sessions, bars, file and report hashes,
coverage, dollar volume, split audit, eligibility and reason) and frozen.

### 3.5 Windows

| Round | Search window (optimizer may read) | Validation (opened only after `PICKS.json`) |
|---|---|---|
| fold-a | 2016-01-04 → 2020-06-30 | 2020-07-01 → 2021-12-31 |
| fold-b | 2016-01-04 → 2021-12-31 | 2022-01-01 → 2023-12-29 |
| final | 2016-01-04 → 2023-12-29 (training) | none inside training |

Books arm on 2017-06-15; accounting starts at the 2016-01-04 close. The optional pre-2020 descriptive round (fold a0)
is **not run** (decided before any search: ≈ 2.5 eligible years with too few funded lots to inform anything, and an
extra analyst look at the 2020 crash). Locked confirmation (§15): `all` = 2016-01-04 → 2026-10-13, attributed to
development (≤ 2023-12-31), holdout (2024-01-01 → 2025-10-16) and final (2025-10-17 → 2026-10-13).

Attribution periods: the 13 regimes R1–R13 and the calendar years of the 16-ETF study (`context.ts`), clipped to each
search window (empty periods dropped); quarterly marks (for PBO only).

### 3.6 Doors (`src/d1-robust/data.ts`)

- `trainingUniverse(round)`: all of U, partition `training`, access `optimization`, `endDate` = the round's search end;
  asserts the loaded last date ≤ search end and records the loaded bars' sha256 per symbol. The only data path of the
  library, pilot, discovery, promotion, refinement, assessment and selection code.
- `validationUniverse(round)`: refuses unless the round's `PICKS.json` exists and its body hash verifies; training
  partition with `endDate` = validation end.
- `benchmarkUniverse`: B1/B4/B5/C0 members (VOOG VGT XBI XRT KRE GDX) on `all` (already inspected), for the controls.
- `evaluationUniverse`: refuses unless `FROZEN_SELECTION.json` verifies.
- `retrospectiveUniverse` (in `retrospective.ts` only): R1/R4 members on `all`, refuses without
  `--acknowledge-retrospective` and a verified provenance record (§21).

## 4. The neighbourhood instrument

### 4.1 Coordinates, step units and reflection

A configuration C = {(symbol_i, θ_i)}, i = 1..k, θ_i on the existing D1 grid and box (`src/multi-etf-d1/context.ts`,
unchanged): X 80–300 (tenths of a point), Y 1–50, stop 30–150, hold 3–30 (days), L 20–250 (sessions), buffer 0–60,
P 30–200, W 10–200. Step units u (amplitude A1): X 5, Y 1, stop 5, hold 1, L 5, buffer 5, P 5, W 10. A2 = 2u.
Reflection: for a step s, use θ + s if in the box, else θ − s, else θ.

### 4.2 Common random numbers

For draw d of stage σ on window w and class c, `rng = Rng.from('robust-d1', w, σ, c, d)`; for every symbol of the
**full candidate universe** (all 64, alphabetically, whether or not eligible or a member) and every parameter in box
order, `t = rng.int(3)`, step = (t − 1) × u_j (× 2 for A2). A neighbour applies the steps of its members only. The
centre is never a draw. Stage labels: `pilot`, `pilot-A2`, `pilot-N2`, `pilot-N3`, `disc`, `promo`, `refine`,
`confirm-A`, `confirm-A-A2`, `confirm-A-N2`, `confirm-A-N3`, `confirm-B`, `validation`. Windows: `fold-a`, `fold-b`,
`final`. No label contains a configuration key. `confirm-B` is computed only after the selection freeze (§15.2) and
is never read by any selection, ranking, gate or nomination.

Classes: **N1** joint (every member, every parameter, as above; the primary instrument); **N1-A2** (2u); **N2**
fixed mass (exactly 3 coordinates chosen uniformly without replacement among the 8k, each ±u with uniform sign,
reflected); **N3** one book (one member chosen uniformly, its 8 coordinates as N1); **N0** the existing in-box
one-coordinate probes (±u, ±2u of the eight-ETF probe offsets; diagnostic only).

### 4.3 Statistics (centre excluded; type-7 quantiles throughout)

`base` = centre fixed-pool net (realized + marked unrealized after interest and costs at the window's last close);
`P50`, `Q25`, `P10`, `Q75` of the neighbours' nets; `MAD` = median |net − P50|; `shareAbove` = share of neighbours
with net > base; `DDmed`, `DD90` = median and 90th percentile of the neighbours' minute-sampled maximum drawdowns;
`feasShare` = share with DD ≤ $35,000; `moved` = mean moved coordinates; `retention` = P50 ÷ base reported only when
base ≥ $50,000 (descriptive, never a gate); neighbourhood activity (median funded lots) and concentration (median
top-2 lot share).

### 4.4 Uncertainty

Every reported P50/Q25 carries a percentile bootstrap 90% interval (10,000 resamples of the draw set, seeded by
`('robust-d1', w, 'bootstrap', σ, key)`). **Comparisons between configurations use a paired bootstrap**: draw indices
are resampled jointly for both configurations (identical CRN indices), the statistic is recomputed on both, and the
interval of the *difference* is reported with its width, the number of draws, the Spearman correlation of paired nets
and the variance-reduction factor (unpaired ÷ paired bootstrap variance). These intervals describe **Monte Carlo
uncertainty under the chosen perturbation distribution on one historical path — not uncertainty about future markets
or independent trading opportunities**. MAD is a dispersion diagnostic and is never used as the standard error of a
difference.

## 5. Benchmarks under the same instrument

B1 (VGT D1 alone), B4 (All-lowDd: VGT primary, XBI/XRT/KRE lowDd), B5 (B4 + GDX `portfolioAware`) are evaluated with
the identical definitions, draws and n wherever a candidate is (pilot, folds as in-sample references, final
assessment); C0 (empty pool, portfolio only). R1 and R4 (16-ETF study) are evaluated on training under the new
instrument as **inspect-only** comparators (never seeds, library members, controls or nominees) — only in `confirm-b`,
after the selection freeze, so that nothing about them can reach a selection. Old clamped 16-ETF medians are never
compared with the new reflected ones.

## 6. Objective, feasibility and the calibrated risk penalty

### 6.1 Hard centre risk (binding; never moved)

- F1: centre minute DD ≤ $35,000 at 5 bps (discovery feasibility) and at 10 bps (from promotion on).
- F-P: training 20% portfolio (symmetric dividends, 5 bps) maximum daily % drawdown ≤ 35% (from promotion on).
- Violation (discovery ranking of infeasible configurations): v = max(0, DD@5 − 35,000) ÷ 35,000.

### 6.2 Risk-aware neighbourhood score (all stages, J arm)

```
S(C)  = P50(C) − λ·k − α_m · max(0, DDmed(C) − R_m(w, band(k))) − α_t · max(0, DD90(C) − R_t(w, band(k)))
J0(C) = P50(C) − λ·k                     (unpenalized, Fable's J; always reported beside S)
λ = $5,000 per book;  α_m = 1.0;  α_t = 0.5
band(k): k = 1, 2, 3, 4, 5 → strata 1–5; 6–7 → 6; 8–11 → 8; 12–15 → 12; ≥ 16 → 16
```

S is computed only for centre-feasible configurations (F1 at 5 bps); neighbourhoods are not computed for infeasible
ones. Ranking: feasible before infeasible; infeasible by v ascending; feasible by S descending; ties by Q25
descending, then key ascending. The centre net ranks nothing in the J arm. Policy rationale (not a data-proven fact):
a dollar of typical-neighbour drawdown beyond the reference costs a dollar of typical-neighbour profit; the tail
measure gets half weight because it is noisier at small n and partly duplicates DDmed.

### 6.3 Calibration rule for R_m and R_t (fixed here, applied once to the pilot, §7.5)

For window w and stratum s, the eligible pilot controls E_s are those with centre DD@5 ≤ $35,000 and ≥ 4 centre
funded lots. If |E_s| < 10, strata are pooled in order of distance in the stratum list (nearest first, the lower one
first on ties) until ≥ 10 controls; if all strata together have < 10, the stratum is **uncalibrated** and uses the
floors. Then, with q_m = Q75 of the pooled controls' DDmed (N1-A1, n = 64) and q_t = Q75 of their DD90:

```
R_m = min($55,000, max($35,000, q_m))        R_t = min($75,000, max($45,000, q_t))
flag = 'floor' (q ≤ floor) | 'calibrated' (floor < q ≤ cap) | 'extreme' (q > cap: reference capped, penalty applies above the cap)
```

The floors are the user's $35k/$45k preferences; the 75th percentile and the caps are policy choices. A calibrated
reference above $35k/$45k is **not** an endorsement of $40k–$60k neighbour drawdowns for live trading: every report
shows the actual DDmed, DD90 and centre DD separately from the score. There is no post-search rejection merely because
a neighbourhood reference was unattainable; the neighbourhood penalty is soft and subordinate to F1/F-P.

### 6.4 The ablation score (Q arm, folds only)

Q(C) = centre net − λ·k under F1 (and F-P from promotion on); ties by centre DD ascending, then key.

### 6.5 Costs and modes inside the objective

Fitness at 5 bps per side in the fixed pool (fast path). 0/2/10 bps centres from promotion on; 10 bps neighbourhoods
for finalists (G4). The portfolio is never in S; it enters as F-P and in the finalist record.

## 7. Pilot calibration (per window; unoptimized random controls; training only)

### 7.1 Design

Strata k ∈ {1, 2, 3, 4, 5, 6, 8, 12, 16}; **40 configurations per stratum** (Tier R: 20); memberships uniform over U
(without replacement), each member's vector uniform from the 1,024-vector Sobol library (no control vectors), seeds
`('robust-d1', 'pilot-config', k, i)` — the same 360 configurations on every window. Per configuration: centre at
0/2/5/10 bps; N1-A1 n = 64 (`pilot`); N1-A2 n = 64 (`pilot-A2`); N2 n = 32 (`pilot-N2`); N3 n = 8 per member
(`pilot-N3`); N0 probes. B1/B4/B5 are evaluated identically (published beside the controls, never pooled into E_s).

### 7.2 Recorded

Per configuration: every §4.3 statistic for every class, funded lots, distinct funded decision minutes, utilization,
top-2 share, best-regime share, inert members, borrowing-dollar-days, fold/regime/year attribution. Per stratum:
medians and quartiles; share centrally feasible; among those the distributions of DDmed, DD90, feasShare; MAD by k and
by funded lots; the share of eligible controls (and benchmarks) that would fail Fable's uncalibrated hard F2
(DDmed ≤ $35k and DD90 ≤ $45k) — the published severity diagnosis.

### 7.3 Machinery checks (must pass before any search; failure blocks the study)

shareAbove pooled over active controls (≥ 4 centre funded lots, any centre drawdown; amendment 1) in 0.5 ± 0.05 (exact ties — a neighbour whose net equals the base
because no funded trade changed — counted one half; the strict share and the tie share are reported); zero-amplitude
draws (the neighbour path with every step zero) reproduce the base exactly (every
configuration); replay = full engine field for field on 8 random pilot neighbours per stratum; reflection never leaves
the box and boundary coordinates move with frequency 2/3 ± 0.05 (pooled over all draws).

### 7.4 Persistence diagnostic (final window only; descriptive)

Spearman correlation over the eligible controls of (a) raw net 2017-06-15 → 2021-12-31 with raw net 2022–2023 and
(b) N1-A1 P50 of the 2021-12-31 marks with raw net 2022–2023; reported, with "(b) exceeds (a) by ≥ 0.10" stated as
supporting (not proving) the smoothed objective.

### 7.5 Pilot-to-freeze mapping (applied once per window; no human or agent choice)

1. R_m(w, s), R_t(w, s) and their flags by §6.3.
2. Discovery draws n_D,w = the smallest n in {12, 16, 24} (Tier F/R: {8, 12, 16}) such that the median, over
   eligible controls with k ≤ 6, of SE_n ≤ $12,500 (Tier F/R: $15,000); else the largest. SE_n is the standard
   deviation of P50 over 10,000 subsamples of size n without replacement from the control's 64 N1-A1 draws (seeded
   `('robust-d1', w, 'pilot-se', key, n)`), divided by the finite-population factor √((64 − n) ÷ 63). If no
   eligible control has k ≤ 6, the largest n.
3. Nothing else depends on the pilot: λ, α_m, α_t, floors, caps, quantile, step units, every other n, the
   materiality M, the precision rule and every gate are fixed in this protocol.
4. `results/pilot/<w>/pilot_freeze.json` (write-once, body hash) records the constants, the inputs' hashes and the
   flags. Severity is reported, never acted on beyond this mapping.

## 8. Library and controls

1,024 scrambled-Sobol vectors over the unchanged box, seed `deriveSeed('robust-d1', 'library', 'sobol-scramble')`
(identical in every round), traced on every symbol of U at 5 bps and pinned. **Fold rounds: Sobol vectors only.**
**Final round:** the 16-ETF study's control set (D1 shipped constants; eight-ETF nominations; portfolio-aware frozen
candidate vectors incl. B5's GDX vector) is added with `inspectedPostTraining: true` and flagged in every table. R1/R4
vectors are never in a library. Single-book library figures are diagnostics; no stage reads them.

## 9. Discovery (per round and arm)

**Genome.** Membership mask over U (nonempty) plus one vector per symbol (latent when inactive); key = sorted
`symbol:vectorId`. Operators (16-ETF `genome.ts` semantics, generalized to |U|): add 0.15, remove 0.15, swap 0.10,
paramOne 0.25, paramMulti 0.15, reset 0.10, crossoverOnly 0.10; per-symbol exchange crossover with probability 0.9,
SBX η 15 on shared members (probability 0.5), polynomial mutation η 20, added vector latent with probability 0.5,
empty masks repaired. Every vector stays on the grid. No operator depends on symbol order beyond the canonical sort.

**Islands.** 8 islands, population 48, cap = (arm budget − the 15% coverage reserve) ÷ 8 unique new evaluations each
(initial population included; reserve not used by top-ups is not reallocated); ring migration every 8 generations of 4 genomes (drawn from the source's best 12 by the arm's ranking);
attempts ≤ 20 × population per generation; stall stop after 3 generations without a new unique child; binary
tournaments and (μ + λ) survival by the arm's ranking (§6.2 / §6.4). Generations are evaluated in batches across all
islands in island order; a key first produced earlier in the same generation counts as a cache hit for later islands.

**Initial populations (outcome-independent).** I1, I2 uniform cardinality 1–16 over U; I3 sparse 1–3; I4 medium 4–8;
I5 broad 9–16; I6 category-stratified (cardinality 2–5, one member from each of that many distinct categories); I7
singletons (48 distinct symbols in a seeded shuffled order, one library vector each); I8 arm-specific: unseeded →
uniform 2–6; seeded (final round only) → B1, B4, B5 and 29 one-move mutants (add/swap/reset cycle) plus uniform 1–16
fill. Vectors are library draws.

**Arms.** Final round: **unseeded (primary)** and **benchmark-seeded (secondary)**, both J, identical budgets, seeds
labelled by arm. Fold rounds: **J** and **Q** (ablation), both unseeded, identical seeds (so identical initial
populations), budgets and universe. Arms never share archives; traces (pure functions of their key) are shared.

**Budgets** (configurations, not time): final round 16,000 × max(1, |U| ÷ 40) per arm rounded to the nearest 1,000;
fold rounds half that per arm. Coverage floor per symbol and arm: ≥ 400 × (arm budget ÷ 16,000) evaluated
configurations containing it and ≥ 150 × (arm budget ÷ 16,000) distinct vectors on it. **Coverage top-up:** after the
islands, the symbols under the floor share a reserved budget of 15% of the arm's budget equally (each at most 1,000,
at least 100 evaluations; symbols beyond the reserve's capacity at 100 each are served alphabetically); each top-up is
an island of population 32 whose initial genomes contain that symbol in random 1–5-book subsets with library vectors,
evolved by the arm's ranking with every child required to contain the symbol.

**Logged per evaluation** (one JSON line): key, arm, island, generation, operator, members and grids, centre metrics
at 5 bps (net, DD, daily DD, lots, lots by symbol, net by symbol, virtual trades, inert members, refusals, contested
ties, utilization, interest, costs, top-2, worst lot, regime/year/quarter attribution, behaviour key), and (J arm,
feasible) n, P50, Q25, P10, Q75, MAD, DDmed, DD90, feasShare, shareAbove, moved, S, J0.

## 10. Promotion of families (per round; J arm and Q arm separately in folds; final round pooled across both arms)

1. Candidates: the top 300 centre-feasible configurations of the archive by the arm's ranking (Tier R: 150).
2. Re-evaluation: N1 at n_promo = 96 (Tier F/R: 64) with label `promo` (J arm); centres at 0/2/10 bps; full-engine 20%
   portfolio at 5 bps on the window (symmetric dividends). F1 at 5 and 10 bps and F-P now required; S recomputed at
   n_promo (Q arm: Q at the centre; no neighbourhood).
3. Families (among the candidates passing step 2; the others are recorded): two configurations are linked when
   membership Jaccard distance < 0.5 **and** funded-trade overlap ≥ 0.5
   (shared funded (symbol, decision minute) pairs ÷ the smaller lot count) **and** Spearman correlation of their
   regime attribution vectors ≥ 0.7; families = single-linkage components; representative = best by the arm's ranking.
4. Families are ordered by representative (ties within $12,500 (M ÷ 2) go to the smaller membership, then the
   unseeded arm, then the key). The **refined set** (§11: ≤ 6 final, ≤ 4 fold) is the first families in that order,
   except that it must contain a representative with ≤ 3 books and one with Jaccard distance ≥ 0.75 from B5's
   membership whenever a feasible one exists, and in the final round an unseeded-arm family among its first three; a
   required family replaces the lowest-ordered family no earlier requirement placed and is never evicted. The promoted
   list (≤ 8) is the refined set followed by the next families in order (recorded).
5. Recorded: every family's membership, representative, size, S/J0/Q with interval, and why it was or was not promoted.

## 11. Joint refinement (≤ 6 families in the final round, ≤ 4 in a fold round; Tier R ≤ 4 / ≤ 3)

The same objective as discovery (J arm: S at n_refine = 48 (Tier F/R: 32) with label `refine`; Q arm: Q). A move is
accepted only when the objective rises by more than **δ = $5,000** (J arm: a paired comparison on identical CRN draws)
and F1 holds at 5 and 10 bps. One cycle: (i) remove each member (k ≥ 2); (ii) add each inactive symbol with one
library vector; (iii) swap each member for 4 random inactive symbols with one library vector each; (iv) coordinate
pass: each member in alphabetical order, its in-box probes (±u, ±2u), the best improving probe accepted before the
next member; (v) pair pass: 32 random moves of one step unit on two coordinates of two different members; (vi) joint
pass: 16 random moves of one step unit on every coordinate of one member. Cap 800 unique evaluations per family in the
final round, 500 in a fold round (Tier R 500 / 300); at most 3 cycles; stop when a cycle accepts nothing. In passes
(i)–(iii), (v) and (vi) the pass's candidates are scored together against the pass's starting state and the best one
exceeding δ is accepted (ties by the key); in pass (iv) the same holds member by member. Candidates beyond the
family's remaining cap are not evaluated (in the pass's deterministic order). Moves are
seeded `('robust-d1', w, 'refine', arm, family, cycle)`. After refinement, the full-engine portfolio check F-P is applied
to the result; if it fails, the latest accepted state that passes is the result (states checked backwards). Every
accepted move is logged with the funded-lot changes it caused (accepted-move attribution).

## 12. Assessment (finalists = the refined family results; plus B1/B4/B5)

On the round's window: N1 at n = 256 under `confirm-A` (Tier F/R: 128) — the **selection** batch; N1-A2 n = 128
(`confirm-A-A2`), N2 n = 64 (`confirm-A-N2`), N3 8 per member (`confirm-A-N3`), N0 probes; N1 at 10 bps on the
`confirm-A` draws; centre at 0/2/5/10 bps; smoothed leave-one-out marginal of each member (S_A(C) − S_A(C ∖ i) on the
same `confirm-A` draws; the empty pool scores 0), its funding/refusal conflicts, its funded lots by regime episode,
and the net and DD with it removed; refusal matrix, utilization, contested same-minute grants, tie-order sensitivity
(reverse alphabetical and two seeded orders), top-2 lot share, best-regime share, regime/year attribution;
boundary-sitting coordinates (at a box bound); paired bootstrap of P50 differences against B4 and B5. Full engine:
fixed at 0/2/5/10 bps (replay parity field for field) and the 20% portfolio at 0/2/5/10 bps under both dividend
conventions; B5's ladder 10/15/20/25/30% at 5 bps (symmetric); matched-borrowing interpolation; excess daily %
drawdown over C0 on the same dates; capacity (§17); 16 N1 neighbours in the portfolio at 5 bps (descriptive); PBO of
the round's archive (CSCV on quarterly attribution of the top 1,000 by S, S = 8 and 16 blocks; descriptive).

## 13. Walk-forward rounds and the procedure gate G-WF

1. Per fold: `trainingUniverse(fold)` (truncated at the search end) → pilot (§7) → library (Sobol only) → discovery arms
   J and Q → promotion → refinement → assessment → **fold picks** → `PICKS.json` written once (body hash) → only then
   `validationUniverse(fold)`.
2. **Fold pick rule, arm J:** finalists passing G1, G2, G3 (pool ≥ 8 funded lots in ≥ 2 calendar years; members'
   smoothed marginal > 0), G4, G5 and G8's tie clause (§14), ranked as in §14 (S_A with the M ÷ 2 tie rule); primary =
   the top (no capacity or box exclusion in a fold); alternates by §14's diversity rule. No benchmark gate (B4/B5 saw the validation years). **Arm Q:** the same gates in their centre
   analogue (G2 unchanged; G3 with centre marginals Q(C) − Q(C ∖ i) > 0; G4: centre net@10 > 0 and ≥ 0.80 × centre
   net@5, centre net > 0 at 0/2; G5: centre − two largest lots > 0, centre − best regime > 0; G8 tie clause), ranked by
   Q descending, ties by the centre drawdown ascending, then the key. A fold arm with no passing finalist has no pick.
3. **Validation:** one continuous fixed-pool run from 2016-01-04 to the validation end (state carried across the
   search end), at 0/2/5/10 bps, and the 20% portfolio at 5 bps (both dividend conventions). V(x) = strategy mark at the
   validation end − strategy mark at the search end, 5 bps. Validation minute DD = the maximum minute-sampled drawdown
   of the continuous strategy mark with the peak reset at the search end (computed from the run's lots and bars;
   checked equal to the replay's whole-run figure when the window is the whole run). An isolated flat-start run (books
   arming at the validation start, history before it as warm-up) is reported beside it. Comparators on the same
   footing: the 360 pilot controls of that fold (eligible = centre DD@5 ≤ $35k and ≥ 4 funded lots in the search
   window), the Q pick, the J alternates, B1/B4/B5 (in-sample references). Per fold: returns, net, drawdowns, funded
   lots, episode and category contribution, membership of the picks, and the validation-window N1 statistics of each
   pick (n = 64, label `validation`, descriptive).
4. **G-WF** (written to `results/walkforward/GWF.json` once). With ctl_p the type-7 p-quantile of the eligible
   controls' V in that fold:

```
G-WF passes iff  (i)  in at least one fold: V(J primary) ≥ ctl_0.75 and V(J primary) > 0
                 (ii) in no fold:           V(J primary) ≤ ctl_0.25   (a fold with no J pick fails (ii))
                 (iii) in no fold does the J primary's validation minute DD exceed $45,000
   A fold with fewer than 10 eligible controls (or a non-finite control quantile) has no comparator and fails (i)–(ii).
```

If G-WF fails the outcome is **no advancement — the selection procedure showed no forward persistence inside
training**; the final round is still run and reported as exploration, nothing is nominated, nothing is evaluated on
2024–2026. J versus Q is reported in full in both folds whatever it shows; if Q persists as well as or better than J in
both folds, the recommendation says so as evidence against the study's premise. Two folds can catch a procedure that
clearly fails; they cannot certify one that passes.

5. Leakage barriers and tests: physical truncation (`endDate`) with a last-date assertion and bar hashes; window-
   specific trace keys (dataset last date, session count, end index); per-round archives; seeds by
   (`'robust-d1'`, window, stage, index); per-round pilot constants; no control vectors in fold libraries;
   `PICKS.json` written before any validation load; a **mutation test** (smoke budget, fixture CSVs through the real
   loader: post-cutoff prices shifted +3% → byte-identical archives and picks).

## 14. Final-round gates, ranking and nominations (5 bps unless stated; `confirm-A` draws only)

```
G1 technical    replay = full engine (fixed, training, 0/2/5/10 bps) field for field; the identity tie order
                reproduces the canonical run; every member is in the frozen eligible universe
G2 hard risk    centre minute DD ≤ $35,000 at 5 and at 10 bps; training 20% portfolio (symmetric dividends) max
                daily % DD ≤ 35%
G3 evidence     pool: ≥ 12 centre funded lots with lots in ≥ 3 calendar years; every member: smoothed marginal
                S_A(C) − S_A(C ∖ i) > 0. Member grade 'standard' (≥ 3 virtual trades, ≥ 2 funded lots, funded lots
                in ≥ 2 distinct regimes) or 'thin' (otherwise); a configuration with a thin member is labelled
                'thin evidence' and is never described as robust
G4 costs        P50_A at 10 bps > 0 and ≥ 0.80 × P50_A at 5 bps; centre net > 0 at 0, 2 and 10 bps
G5 tails        Q25_A ≥ 0; centre net − two largest lots > 0; centre net − largest positive regime > 0
G6 materiality  for B ∈ {B4, B5}: Δ_B = P50_A(C) − P50_A(B) ≥ M  and  the 90% paired-bootstrap interval of Δ_B has
                lower bound > 0  and  S_A(C) ≥ S_A(B);  M = $25,000, or $50,000 when C's training portfolio
                daily % DD is in (30%, 35%]
G7 borrowing    training portfolio ending equity (symmetric, 5 bps) ≥ B5's ladder (symmetric) interpolated at C's
                borrowing-dollar-days (an extrapolated comparison is labelled)
G8 stability    centre net change under each tested tie order ≤ M; boundary-sitting coordinates ≤ 25% of 8k,
                else the label 'box-constrained' (allowed as an alternate, never the primary)
```

**Ranking** of passing finalists: S_A descending; ties within M ÷ 2 → smaller k, then unseeded provenance, then key.
**Nominations (≤ 3):** primary = the top passing finalist that is neither capacity-limited (§17) nor box-constrained;
alternate 1 = the top other passing finalist with Jaccard distance ≥ 0.5 from the primary; alternate 2 = the top other
passing finalist with ≤ 3 books and distance ≥ 0.5 from both (if a compact nominee already exists: distance ≥ 0.5 from
both). Without a primary-eligible finalist, passing finalists may still be alternates (labelled). **If G-WF failed,
nothing is nominated whatever G1–G8 say.** If no finalist passes: **no advancement**, nothing evaluated after training.
Fair baseline: a nominee that trails B5's optimized peak (E0) but beats B5's smoothed P50 by M under identical draws
passes G6; peaks are reported, never bars.

## 15. Selection freeze, the reporting batch and the locked confirmation

1. `freeze-selection` writes `FROZEN_SELECTION.json` once (body hash): outcome, nominees (members, grids, tie order),
   benchmarks, gates, rankings, G-WF, pilot freezes, seeds, budgets and evaluation counts, code/data/partition/split/
   ledger/universe/protocol hashes, parity signatures, authorized commands — including the no-advancement outcome.
2. `confirm-b` (after the freeze; training only): N1 at n = 256 (Tier F/R 128) under `confirm-B` for every finalist,
   nominee and benchmark, and the inspect-only R1/R4 (`confirm-A` and `confirm-B`); reported as the E1 headline with
   intervals, paired differences against B4/B5 and the A/B disagreement (flagged beyond 2 pooled bootstrap SE). It
   cannot change the frozen selection.
3. `evaluate` once (deterministic `--confirm` re-run allowed): continuous `all` for nominees, B1, B4, B5, C0 — fixed and
   portfolio, 0/2/5/10 bps, both dividend conventions, B5's ladder, segment attribution (development/holdout/final),
   bridges, two-largest-lots dependence, omitted-distribution bounds, replay parity on fixed runs. Rules (5 bps unless
   stated; necessary, never sufficient):
   - C1 nominee post-training strategy P&L (holdout + final) ≥ 0;
   - C2 post-training Δ versus B4 ≥ −$2,500 at 5 and at 10 bps;
   - C3 full-`all` fixed minute DD ≤ $35,000;
   - C4 full-`all` portfolio max daily % DD ≤ 35% (symmetric dividends; the frozen convention reported beside).
   A nominee failing any C-rule is "blocked on inspected history"; one passing all is graded E3 ("historically
   consistent"), never "validated". No positive margin versus B5 is required (B5's post-training edge rests on two GDX
   lots); Δ versus B5 is reported with the two-largest-lots bridge.
4. Recommendation: the highest-ranked nominee passing C1–C4 is the **primary forward-test candidate**; if none, the
   frozen benchmarks are retained as previously recommended. No rescue, re-ranking, re-optimization or rule change after
   `evaluate`. New phenotype files only for an accepted nominee, never modifying existing ones (none is registered
   automatically).

## 16. Dividends and execution friction

- Fixed pool: price-only for every lot (symmetric across symbols; ex-dividend price drops are in the raw prices).
- Portfolio: **symmetric** (`lotDividends: false`: no lot receives distributions; the core receives its verifiable
  VGT/VOOG distributions) for every gate and comparison; **frozen** (`lotDividends: true`: VGT lots receive VGT's) is
  reported beside it and reproduces earlier figures. Symmetric omission is not total-return accuracy.
- For nominees and benchmarks (after the freeze): distribution histories for every lot symbol from the issuer's
  official history where available, else the Alpaca corporate-actions API (credential-authenticated, the same vendor as
  the bars), split-consistent, ex-date aligned; if complete for all compared lot symbols, an additional fully accounted
  fixed-pool diagnostic credits shares × amount for every ex-date with entry session < ex-date session ≤ exit session;
  otherwise per-member bounds (lot-days × $100,000 × yield ÷ 365 at 1/3/6%) and ex-date counts near exits. Nothing is
  fabricated or double counted and the frozen engine is not changed. A decision that dividend treatment could reverse
  is marked unresolved.
- Costs: 0/2/5/10 bps **per side** of execution friction (spread/slippage/impact), applied once per fill by the engine;
  not commission (Vanguard's online ETF commission is zero). Interest 11% simple annual, separate. The audit checks that
  no cost is applied twice (replay vs engine cost totals equal).

## 17. Capacity and brokerage labels (reporting and nomination; fills unchanged)

For every member of every finalist on its window: partLot = $100,000 ÷ median (over the member's funded decisions) of
the dollar volume traded in the five regular minutes starting at the decision minute; partPortfolio = the same with the
lot at 20% of the training portfolio's final equity; the share of funded fills ≥ 2 minutes after the decision.
**capacity-limited** if partLot > 0.10 or > 10% of fills delayed ≥ 2 minutes (cannot be the primary);
**capacity-unverified** if partPortfolio > 0.10. Vanguard-issued books (VOOG, VGT, VIG, VGK, EDV, VPU) carry
"brokerage-constraint pending" (Vanguard's 30-day no-loan-value rule for newly bought Vanguard ETFs, recorded by the
allocator study; not modelled).

## 18. Correctness, parity, caching and reproducibility gates

- **Controls first:** B4 and B5 reproduce `research/joint-16-etf-d1/results/controls/controls.json` (training and
  `all`, fixed and portfolio, four costs) field for field in the expanded load; B1/C0 recorded; search-view books
  equal frozen books on the replay.
- **Parity matrix (blocks everything on any difference):** P0 frozen engine = N-book engine (B1, B4; both modes; four
  costs); P1 replay = N-book engine (fixed, four costs) on every symbol of U alone (D1 constants and a Sobol vector),
  random subsets of 2/4/8/12/16 and 24 books (incl. VOOG-as-book, no-VGT, XOP across its reverse split, every symbol
  with a registered split, and the sparsest-coverage symbols), B1/B4/B5, and a pool with a lot open at the window end;
  P1-cut the same at the fold search ends; P2 portfolio consistency (balance-sheet identity, VOOG/VGT core-versus-lot
  market values, core distributions, lot distributions under both conventions); P3 lookahead (a later exit's price or
  time changes no earlier funding decision; tested on a 6-book fixture and on real traces).
- Cached traces are reused only after parity; their key covers the dataset content, window, splits, parameters,
  settings and code hashes; portfolio figures come only from the full engine.
- Determinism: every stochastic element seeded; workers evaluate pure functions and results are reduced in request
  order; the library and the first 2,000 discovery evaluations of a fold arm are re-run in a second process (worker
  pool) and compared byte for byte; a representative single-thread versus worker comparison is recorded.
- Hashes in every record: protocol, context, universe, tier, data files, partitions, splits, ledger, the code manifest
  (every `src/**/*.ts` except tests and the report writer: the study's modules and every reused engine, strategy and
  helper), git HEAD/tree, Node version. The protocol freeze is itself a sealed record; every outcome stage verifies the
  freeze, the universe, tier, split registry, ledger, partitions and the code manifest (changes only through a
  head-anchored amendment, refused once the affected stage has an output), the canonical files against their audited
  hashes, and that the controls and parity passed. Configuration and cache keys use the full eight-value grid (the D1
  candidate ID is a 40-bit hash prefix and is kept as a label only).
- Node: the study runs on Node **v24.21.0** (fnm), which satisfies `engines ≥ 24.21.0`; the earlier studies ran on
  23.6.1; equality of the benchmark reproductions on 24.21.0 is the compatibility check; the suite is run on both.
- Tests: the full suite passes with nothing weakened or deleted; tsc clean; eslint without new errors.
- Independent review (a separate agent that did not write the code) before the final-round search and before the
  selection freeze; material defects are fixed and recorded before proceeding.

## 19. Compute tiers (chosen once, before any pilot or search outcome)

| Item | Tier E (extended) | Tier F (Fable full) | Tier R (fallback) |
|---|---|---|---|
| Discovery configurations per arm, final / fold | 16,000·max(1, \|U\|÷40) / half (nearest 1,000) | same | 10,000 / 5,000 (final: unseeded arm only) |
| n_D candidates, SE target | {12, 16, 24}, $12,500 | {8, 12, 16}, $15,000 | {8, 12, 16}, $15,000 |
| Promotion top / n | 300 / 96 | 300 / 64 | 150 / 64 |
| Refinement families final/fold, n, cap | 6/4, 48, 800/500 | 6/4, 32, 800/500 | 4/3, 32, 500/300 |
| confirm-A / confirm-B | 256 / 256 | 128 / 128 | 128 / 128 |
| Pilot per stratum | 40 | 40 | 20 |

Every tier keeps both folds, both fold arms, the pilot, the coverage floor and both confirmation batches. **Selection
rule:** `npm run robust-d1 -- benchmark` measures, on the loaded eligible universe and without printing or storing any
configuration's P&L or ranking, the trace and replay times by book count, the full-engine time, worker-pool scaling
at 1, 4 and W workers (W = cores − 2) and memory; it projects each tier's wall-clock assuming **no** neighbour-trace
reuse across configurations (a conservative bound) and peak memory. The study runs the first of E, F, R whose
projection is ≤ 20 hours of wall-clock and ≤ 13 GB peak resident memory. The tier and the projection are written to
`results/benchmark/tier.json` and bound by the protocol freeze. Budgets are never raised or lowered after an outcome;
a stalled island's unused budget is not reallocated.

## 20. Order of execution and freezes

```
M0  protocol + deviations written; pre-ingestion commitment; safeguards and synthetic tests (no outcome)
M1  ingest Tier 1 then Tier 2 → audit → universe.json → unit-cost benchmark → tier.json → freeze-protocol
M2  controls → parity → pilot fold-a, fold-b, final (pilot_freeze.json each) → fold-a (J, Q) → PICKS → validation
    → fold-b likewise → GWF.json
M3  independent review → final round (unseeded + seeded arms) → promotion → refinement → assessment → gates
    → independent review → freeze-selection (always, incl. no advancement) → confirm-b
M4  evaluate (only with nominees; once; --confirm) → C1–C4 → R1/R4 retrospective runs (§21) → reports
```

## 21. R1/R4 retrospective runner (isolated deliverable; after M4's locked confirmation)

`npm run robust-d1 -- research-run --config R1|R4 --mode fixed|portfolio --dataset all --cost 5
--acknowledge-retrospective` (options `--dividends frozen|symmetric`, default frozen; costs 0/2/5/10). Vectors and
training figures are read from `research/joint-16-etf-d1/results/robust/robust.json` (`gated[].battery`, labels
`R1 (refined c1)`, `R4 (refined c4)`) and cross-checked against `results/refine/refine.json`; both files' sha256 must
equal the 16-ETF `FROZEN_SELECTION.json` records (manifest hash verified); any disagreement stops the runner. The
training figures are reproduced on the full engine first (exact); then the continuous `all` run; outputs to
`evaluations/robust-d1/retrospective/<config>-<mode>-all-<cost>bps-<dividends>/` with `PROVENANCE.json`; every file
and console report begins with **RETROSPECTIVE — INSPECTED HISTORY — NOT AN INDEPENDENT HOLDOUT — NOT ACCEPTED.**
No search, pilot, promotion, refinement, assessment or selection module imports `retrospective.ts` (import-graph test);
nothing under `research/joint-16-etf-d1/` changes (hashes before and after); the results never enter any fitness,
ranking or gate.

## 22. Reports (all under `research/d1-robust-pool-discovery/`)

README, PROTOCOL, APPROVED_DEVIATIONS_FROM_FABLE, DATA_AND_UNIVERSE_AUDIT, INGESTION_RUNS, PILOT_CALIBRATION,
CACHE_AND_CAUSAL_PARITY, WALK_FORWARD_RESULTS (+ per-round `PICKS.json`), SEARCH_COVERAGE, POOL_FAMILIES_AND_REFINEMENT,
NEIGHBORHOOD_ROBUSTNESS, FROZEN_SELECTION.json, HOLDOUT_FINAL_RESULTS, RETROSPECTIVE_R1_R4, IMPLEMENTATION_AUDIT,
RECOMMENDATION; `results/` JSON/CSV with every evaluation as a JSON line (regenerable logs git-ignored, sha256 recorded).
Every configuration table shows E0 beside E1 with intervals and labels (inspected control vector, neighbour of an
inspected configuration, capacity, box, brokerage, thin evidence).

## 23. Stop rules

The study stops after M4. No further search, candidate, re-ranking, threshold change or "one more look" is allowed by
this protocol; a new question is a new protocol.

## 24. Amendments

Append-only. Each entry: number, UTC time, the stage affected (whose first outcome must not yet exist), the change, why
it is purely technical, and the protocol/context hashes before and after; mirrored in `results/amendments.jsonl`.

**Amendment 1 (2026-10-25, stage: pilot; POST-OUTCOME, disclosed).** §7.3's shareAbove machinery check pools
**active** controls (≥ 4 centre funded lots, any centre drawdown) instead of eligible controls (centre drawdown ≤ $35k
and ≥ 4 lots). *What happened:* the first pilot run of all three windows failed the check as frozen (pooled shareAbove
0.406 / 0.412 / 0.411 over 40 / 42 / 26 eligible controls) and stopped before writing any pilot freeze. *Why it is a
check defect, not a machinery defect:* the same records give 0.505 / 0.516 / 0.519 over all 360 controls and 0.504 /
0.517 / 0.519 over the active ones, and 0.517 / 0.532 / 0.527 over the active drawdown-infeasible ones; conditioning on
a low centre drawdown selects centres that happened to avoid a bad lot, whose neighbours then regress — a selection on
a centre outcome, which a test of an unbiased sampler must not contain. Fable's NEIGHBORHOOD §8.3 specified "active
controls"; this protocol's "eligible" was an unlisted transcription deviation. *Why it changes nothing economic:* the
check feeds no constant, gate, ranking or selection; the risk references and n_D are computed by the unchanged §6.3 and
§7.5 mapping from the same records; no candidate exists. *Disclosure:* it was recorded after the pilot's records
existed (the protocol's rule is "before the first outcome"); the first run's records are kept in
`results/pilot/<window>/first-run/` and the re-run must reproduce them byte for byte. The user may reject this
amendment; every record needed to do so is kept.

**Amendment 2 (2026-10-25, stages: search, freeze-selection, confirm-b, evaluate, research-run; before each one's first
output).** Technical fixes from the independent pre-search review (a separate agent; findings and dispositions in
IMPLEMENTATION_AUDIT.md). Drafted after fold-b's `PICKS.json` (no J pick) and recorded after the sealed `GWF.json`
(G-WF failed, so no nominee can exist; items (1), (2) and the nominee parts of (5) concern only a path that cannot run
and are recorded so that the code fails closed), before any output of the affected stages. No search, objective,
constant, gate threshold, ranking or selection rule changes, and no fold or G-WF record is touched.
(1) `evaluate` refuses to run on nominees until the §16 nominee dividend diagnostic exists (it was not implemented;
fail closed rather than evaluate without it); with no nominee it writes only its no-advancement record, and `--confirm`
is refused when there is nothing to confirm. (2) §15.4 is read together with §14 and §17: the primary forward-test
candidate must be primary-eligible (neither capacity-limited nor box-constrained); a C1–C4-passing alternate that is
not primary-eligible is reported, and the benchmarks are retained; alternates nominated without a primary-eligible
finalist carry the label "no primary-eligible finalist". (3) The assessment's "excess daily % drawdown over C0 on the
same dates" matched a close time against a session's midnight time and was never produced (always NaN); it now
matches the New York session date (reporting only; the fold assessments keep their NaN, disclosed). (4) Labels: a
member whose grid equals a final-library control vector on any symbol is "inspected control vector" whatever its
origin field says (the seeded arm's B1/B4/B5 books carried 'benchmark:' origins); a configuration sharing at least half
its membership with B1, B4 or B5 (Jaccard distance < 0.5) whose shared members' grids are each within 2 step units on
every coordinate of the benchmark's is "neighbour of an inspected configuration" (§22; reporting only); an
extrapolated G7 comparison is also a label. (5) `FROZEN_SELECTION.json` additionally records the round's budgets,
evaluation counts, seed labels, the benchmark books (symbols and grids), the hashes of `round.json`, both arms'
`discovery.json` and the pooled `promotion.json`, and the controls/parity record hashes; its nominees are recomputed
from the pooled `assessment.json` and must equal `selection-candidates.json`; `freeze-selection`, `confirm-b` and
`evaluate` require the passed controls and parity records (§18), and `evaluate` re-verifies the frozen data,
protocol, context, universe, tier, split, ledger and partition hashes, requires `confirmB.json` (M3 before M4), and
withholds any recommendation if its replay parity or frozen-book check fails. (6) `confirm-b` reports 90% bootstrap
intervals for confirm-B P50 and Q25 (§4.4) and verifies R1/R4's `robust.json` against the 16-ETF
`FROZEN_SELECTION.json` record before reading it. (7) With no nominee, `authorizedCommands` lists `confirm-b`,
`evaluate` (its no-advancement record) and the four §21 runs. The retrospective runner verifies the protocol freeze,
writes `PROVENANCE.json` into each run directory as well as the run log at its root, runs B4/B5 in the same dividend
convention as the inspected configuration, and sets `frozenFilesUnchanged` from the after-run hash check. (8) A
partially completed earlier final-round run (a `results/final/round.json` without `selection-candidates.json`) is moved
aside to `results/final-aborted-<time>/` before a re-run instead of being overwritten. A synthetic smoke test of the
final round (both arms, the seeded population, pooled promotion, G6/G7, nominations) is added to the suite.

**Amendment 3 (2026-10-25, stages: freeze-selection, confirm-b, evaluate, research-run; before each one's first
output).** Integrity fixes from the independent pre-selection-freeze review (a separate agent; no material finding;
IMPLEMENTATION_AUDIT.md §6), recorded after the final search and before the selection freeze, because `evaluate`
pins the protocol's hash at the freeze. (1) The freeze refuses if any file it binds is missing (one was silently
dropped before), and it also binds the final refinement records, each window's `pilot.json` and `controls.jsonl` and
`determinism.json`. (2) The freeze recomputes the nominations from the assessed finalists' gates and values with the
§14 ranking and nomination functions and requires equality with both stored lists. (3) The retrospective runner
requires the `evaluation.json` written against this frozen selection (its `manifestHash`) and `confirmB.json`, asserts
the `all` window ends on 2026-10-13, refuses to rewrite an existing run, records the frozen-selection, evaluation,
protocol and code-manifest hashes in its provenance, and checks the whole `research/joint-16-etf-d1/` directory
(sha256 of every file) before the run and again after its outputs are written. No search record, gate, ranking,
selection rule or the no-advancement outcome is affected.
