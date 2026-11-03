# Protocol: diversity-preserving D1 pool discovery and chronological robustness

**Status: authoritative from its design commitment.** This file, `src/d1-diverse/context.ts` (every constant below,
line for line) and the code manifest are bound by the sealed design commitment `results/design_commitment.json`,
written before any market P&L, neighbourhood or validation figure of this study; the executable freeze
`results/protocol_freeze.json` later binds them together with the re-audited universe `results/audit/universe.json`,
the tier record `results/benchmark/tier.json` and the stage-A schedule `results/schedule/schedule.json`. Changes are
allowed only as reviewed technical fixes recorded before the affected stage's first outcome (§23).

**Study identity.** A new study, `diverse-d1`. It is not a continuation, amendment, rerun or rescue of
`research/d1-robust-pool-discovery/` (the "October 25 study", complete, no advancement), whose result stands.

**Authority (precedence).** (1) The user's assignment of 2026-10-26 (`brief/BRIEF_AS_RECEIVED.md`, plus any
remainder the user supplies, saved beside it); (2) this protocol; (3) the October 25 study's protocol and records and
Fable's nine Phase 1 documents (`research/d1-robust-design-review/`), as historical evidence and design rationale.
Every rule that differs from the October 25 study is listed with its reason in `DESIGN_DECISIONS_AND_PRIOR_EVIDENCE.md`
and summarized in `DESIGN_DIFF.md`.

**Evidence labels (used verbatim everywhere).** **E0** in-sample optimized centre (a peak). **E1** in-sample smoothed
figure (neighbourhood statistics from a draw batch no selection used). **E2** procedure-level walk-forward evidence
inside 2017–2023 — *reused historical diagnostic*: both folds' validation dates were inspected by earlier studies of
this programme. **E3** blocking-only check on the inspected 2024-01-02 → 2026-10-13 window. **E4** genuine forward
evidence after 2026-10-13 (none exists; reserved for a separately specified future test).

---

## 0. What is and is not claimed

1. This is a **design repair and a new scientific comparison**: a coverage-guaranteeing search with per-arm,
   chaining-free family formation, an obligatory member-pruning pass, and a time-aware score T compared with the
   neighbourhood reference J under identical machinery and budgets.
2. A broader search increases multiple-testing exposure; it does not establish discovery or probable future returns.
   Failing to find a combination is not proof that none exists (the space of subsets × vectors cannot be exhausted).
3. A flat parameter neighbourhood does not imply persistence in time; T is a hypothesis, tested, not assumed.
4. The folds test the **procedure**, with state carried across each boundary; they do not validate any final-round
   configuration. Their dates were inspected before, so fold results are method-comparison diagnostics (E2 reused),
   not fresh out-of-sample confirmation.
5. Beating B5 on smoothed 2016–2023 training does not make a configuration better than B5 live; B5 was itself chosen
   with knowledge of these years, and its post-training gain over B4 rests on two GDX lots.
6. Parity and determinism establish backtest correctness, not economic predictability.
7. Every bootstrap interval in this study describes Monte Carlo uncertainty **under the chosen parameter-perturbation
   distribution on one historical path**. None is a confidence interval on future alpha or on market paths.
8. No method is assumed to reproduce B5's historical 26–31% CAGR. No IRR or CAGR is projected.
9. A technically successful study may conclude **no advancement**; that outcome is first-class and fully recorded.

## 1. Questions, hypotheses and outcomes

**Questions.** (Q1) Does a quota-led, arm-preserving search cover the 61-symbol subset space materially more evenly
than the October 25 study? (Q2) Does per-arm, chaining-free family formation surface credible candidates the old
pooled-top-300 / single-linkage shortlist could not? (Q3) Does a time-aware score (T) select pools that persist
forward inside training better than the neighbourhood score (J)? (Q4) Is any resulting executable shared-pool
configuration better than the frozen benchmarks on a risk-aware, economically material and honest basis? (Q5) If not,
why not — recorded, and the study stops.

**Hypotheses (tested, not assumed).**
- **H_T (a priori):** a configuration whose smoothed profit is spread across several disjoint sub-periods of its
  search window, rather than concentrated in its single best sub-period, is more likely to remain profitable in the
  following 1.5–2 years. Basis: in the earlier studies the training leads that failed to persist were episode-
  concentrated (R1's lead over B5 was a 2020 re-timing; B5's post-training gain rests on two GDX lots); this is
  prior-study evidence about what fails, not an observation of this study's folds.
- **H_C (coverage):** with coverage guaranteed by construction, more than one structurally distinct credible family
  exists per arm (the October 25 study's single-family collapses were caused by its shortlist, not by the landscape).
- **H_P (pruning):** an obligatory pruning pass coherent with the member-contribution gate removes the mechanical
  refinement/gate contradiction without changing any economic threshold.

**Outcomes.** (a) A sealed nomination (primary and up to two alternates) from a procedure that passed its
preregistered procedure gate, then blocked or not by a single historical check on 2024–2026 (E3); or (b) **no
advancement**, with the stage and reason at which every candidate stopped. The strongest verdict is "primary
forward-test candidate".

## 2. Invariants and hard boundaries

1. Every eligible ETF — VGT, VOOG, XBI, XRT, KRE and GDX included — is an optional book with equal membership and
   parameter rights. No book is compulsory, preferred or excluded except by the frozen integrity rules (§4.2). VGT is
   never excluded.
2. The long-term core is always 60% VOOG / 40% VGT ($180,000 / $120,000 of $300,000), independent of the trading pool;
   a margin lot of VOOG or VGT is accounted separately from core shares (the N-book engine's existing accounting).
3. Fitness: the fixed $100,000 non-compounded shared pool — one funded lot or reservation at a time, frozen shadow-book
   semantics (virtual books continue independently; a funded entry only on a fresh qualified signal), alphabetical
   same-minute tie order, 11% simple annual margin interest, 5 bps per side of execution friction (not commission;
   Vanguard's online ETF commission is $0). Costs 0/2/5/10 bps per side as sensitivities.
4. The 20%-of-marked-equity compounded portfolio is a separate full-engine evaluation; it never enters a score.
5. No standalone optimization track. Standalone figures are diagnostics and never gate a symbol.
6. The D1 eight-parameter definitions, box and grid, fills, splits, calendar, interest, slippage and dividend engine
   conventions are unchanged. No engine, strategy or earlier-study source file is modified.
7. Optimizers read only data dated on or before their round's search end (physical truncation at load). 2024-01-02 →
   2026-10-13 is never read by any optimizer, design decision, calibration or selection. For candidate configurations
   only the §16 door opens it, and only for nominees of a sealed selection. Two outcome-free reads touch those dates
   and are disclosed: the benchmark door (§4.4) reads the six benchmark members' full files once, before the freeze,
   to reproduce the frozen B1/B4/B5/C0 records (already inspected figures); the integrity audit (§4.2) reads every full
   file for hashes, sessions and splits only.
8. No canonical data file, partition file, split registry, distribution ledger, frozen phenotype JSON, earlier
   research artifact, frozen manifest or archived vector is modified, re-hashed or re-pinned. No new data are
   downloaded; no bar after 2026-10-13 exists or is used.
9. No broker connection, order, credential use, network access or commit. No contact detail is sent anywhere.
10. B1, B4, B5 and C0 are frozen comparators, never mandatory members. R1, R4 and the October 25 training finalist
    (GDX KRE XBI XLE) are inspected, non-advancing historical references: never seeds, library members, controls,
    candidates or nominees; evaluated on training only, after the selection freeze, labelled inspect-only. A finalist
    equal to one of them or a near copy (Jaccard distance < 0.5 from it and every shared member's grid within two step
    units on every coordinate) is labelled "near an inspected non-advancing reference" and is never nominated in the
    final round (its post-2023 history is already known, so the §16 check could not inform it); in a fold it is
    labelled only (the fold tests the procedure as it runs).
11. The earlier unseeded winner FXI SLV XLI XLK is not installed as a candidate and tunes no rule.

## 3. Isolation from earlier studies

- The October 25 study's freeze guard hashes every `src/**/*.ts` (except tests, `generated/`, its `report.ts`); any new
  source file changes that hash. Its frozen code state is the commit **`348f100b`** (code manifest `d8b9b900…`, 376
  files; protocol `5a216c53…`; context `18a921f6…`, recomputed at HEAD on 2026-10-26 before any new file existed).
- **Mechanism.** `npm run diverse-d1 -- legacy-check` recomputes that study's manifest from the git object store at
  `348f100b` (`git ls-tree` + `git cat-file`, the same file-selection rule, never the working tree) and requires
  `d8b9b900…`; it also requires every tracked file under `research/d1-robust-pool-discovery/`,
  `research/joint-16-etf-d1/`, `research/portfolio-aware-d1-optimization/`, `research/d1-robust-design-review/`, the
  frozen phenotype JSONs `config/phenotypes/D1/` and `config/phenotypes/README.md` to equal `HEAD`
  (`git diff --quiet`), and the study's `results/records.sha256` / `jsonl-records.sha256` to verify. Executing old
  stage code, if ever needed, uses a detached `git worktree` at `348f100b`; no legacy guard is relaxed.
- This study's own manifest (§18) covers every `src/**/*.ts` except tests, `generated/` and `src/d1-diverse/report.ts`.
- Files outside the new namespaces that this study changes: `package.json` (script `diverse-d1`), `.gitignore` (this
  study's regenerable logs), `src/phenotype/strategies.ts` (one registry line classifying the entry point `diverseD1`
  as a research command, required by the registry test) and the generated `config/phenotypes/COMPATIBILITY.md` (its
  matching row). No frozen phenotype changes. The root `CLAUDE.md` and `docs/claude/context-recovery.md` were created
  by the assignment's prerequisite and are not research artifacts.

## 4. Data, universe, windows and doors

### 4.1 Canonical data

`data/<SYMBOL>/data.csv` (raw SIP minute bars, `adjustment=raw`), `data/partitions.json`, splits forward-adjusted once
from `config/market-events/splits.json` (sha256 `e5bde427…`), the VGT/VOOG distribution ledger
`config/market-events/distributions.csv` (`3b4342eb…`). One calendar **2016-01-04 → 2026-10-13** (2,710 sessions).
Pre-study hashes of every canonical file: `results/baseline/` (2026-10-26). If an integrity issue appears, the study
stops and reports it; it never repairs data.

### 4.2 Universe (re-audit under the frozen rules)

The 64 candidates of the October 25 study (its 16 existing + 48 ingested symbols) are re-audited with that study's
frozen eligibility rules D1–D5 (history from the 2016-01-04 session with every session through 2026-10-13; `verified`
integrity; every split-sized move explained; structure; median training daily dollar volume ≥ $10M and median minute
coverage ≥ 25%), using its unchanged audit function on the current canonical files. Expected: the same **61 eligible**
symbols (late cohort GDXJ, OIH; excluded XLRE). Any difference from `research/d1-robust-pool-discovery/results/audit/
universe.json` in eligibility or file hash stops the study. Nothing about strategy results, correlation, overlap,
category or prior selection enters eligibility. Category tags (sector-industry, factor-size, non-us, rates-credit,
real-assets) are the October 25 study's, used only for coverage accounting.

### 4.3 Windows

| Round | Search window (optimizer may read) | Validation (opened only after the sealed `PICKS.json`) |
|---|---|---|
| fold-a | 2016-01-04 → 2020-06-30 | 2020-07-01 → 2021-12-31 |
| fold-b | 2016-01-04 → 2021-12-31 | 2022-01-01 → 2023-12-29 |
| final | 2016-01-04 → 2023-12-29 | none |

Books arm on 2017-06-15; accounting starts at the 2016-01-04 close. Attribution periods: the October 25 study's 13
regimes, calendar years and quarters, clipped to each window. Fold a0 is not run (decided before any outcome).

### 4.4 Doors (`src/d1-diverse/data.ts`; each refuses before a byte is read)

- `trainingUniverse(window)`: the frozen eligible universe, partition `training`, access `optimization`, `endDate` =
  the search end; asserts the loaded last date and hashes each symbol's loaded bars into the round's door record. The
  only data path of controls, search, promotion, refinement, pruning, assessment and picks.
- `validationUniverse(fold)`: refuses unless that fold's sealed `PICKS.json` verifies; loads through the validation end.
- `benchmarkUniverse`: B1/B4/B5/C0 members (VOOG VGT XBI XRT KRE GDX) on `all`, for the controls reproduction only.
- `evaluationUniverse`: refuses unless `FROZEN_SELECTION.json` verifies **and** names at least one nominee.
- Every load checks each file's sha256 against the re-audited universe record.

## 5. The neighbourhood instrument and random streams

- **Instrument (unchanged from the October 25 study, imported, not copied):** step units X 5, Y 1, stop 5, hold 1,
  L 5, buffer 5, P 5, W 10 grid units; reflection at the box bounds; classes N1 (every coordinate of every member moves
  −u/0/+u with probability ⅓ each), N1-A2 (2u), N2 (exactly 3 coordinates ±u), N3 (one member as N1), N0 probes.
  Common random numbers: draw d's step pattern is generated for every one of the 64 candidate symbols in alphabetical
  order from (stream, stage, class, d) only, so configurations sharing a (symbol, vector) receive identical steps.
- **Streams of this study.** Neighbour patterns: `Rng.from('robust-d1', 'diverse-d1:<window>', stage, class, d)` — the
  instrument's generator with this study's window label, disjoint from every stream of the October 25 study. Every
  other stream: `Rng.from('diverse-d1', …labels)`, each listed in `context.ts` (`seedLabels`). No neighbour-pattern
  label contains a configuration key; the per-configuration resampling streams (bootstraps, the pruning bootstrap,
  tie orders) are keyed by the configuration (and member) they resample. No label contains an outcome.
- **Stage labels and draw counts (N1 unless stated; counts marked † are tier constants, shown for tier E — §19).**

| Label | n | Purpose | Read by selection? |
|---|---:|---|---|
| `calib` | 64 | reference controls (§7) | calibration only |
| `disc` | 16 † | discovery scores (§9) | yes |
| `promo` | 96 † | promotion re-evaluation (§11) | yes |
| `refine` | 48 † | refinement moves (§12) | yes |
| `prune` | 128 † | member pruning (§12.2) | yes |
| `confirm-A` | 256 † (5 and 10 bps) | assessment, gates, ranking (§13) | yes — the selection batch |
| `confirm-A-A2` / `-N2` / `-N3` | 128 / 64 / 8 per member | sensitivity classes | reported only |
| `confirm-B` | 256 † | reporting batch, only after `FROZEN_SELECTION.json` | **never** |
| `validation` | 64 | validation-window neighbourhoods of picks (descriptive) | never |

Every N1 record carries the strategy marks at the window's block boundaries (§6.2) so that both scores are computed
from the same draws. Statistics (centre excluded, type-7 quantiles): P50, Q25, P10, Q75, MAD, shareAbove, DDmed, DD90
(of minute-sampled maximum drawdowns), feasShare (DD ≤ $35,000), moved coordinates, median lots, median top-2 share.

## 6. Objectives, feasibility and ranking

### 6.1 Hard centre risk

F1: centre minute-sampled maximum drawdown ≤ **$35,000** at 5 bps (discovery feasibility) and at 10 bps (from
promotion on). F-P: training 20% portfolio (symmetric dividends, 5 bps) maximum daily % drawdown ≤ **35%** (from
promotion on). Violation (ranking infeasible configurations): v = max(0, DD@5 − 35,000) ÷ 35,000.

### 6.2 Scores (identical except for the net they smooth)

```
J  (neighbourhood reference; the October 25 study's S):
   S_J(C) = P50(net) − λ·k − α_m·max(0, DDmed − R_m(w, band(k))) − α_t·max(0, DD90 − R_t(w, band(k)))
T  (temporal candidate):
   S_T(C) = P50(net_T) − λ·k − α_m·max(0, DDmed − R_m(w, band(k))) − α_t·max(0, DD90 − R_t(w, band(k)))
   net_T(path) = net − (b_max − b_med)
   b_1..b_K = the path's strategy P&L over K contiguous blocks of equal session count covering the eligible span
              [arming session, window end] (mark at the block's last close − mark at the previous block's last close;
              the first block starts from the mark at the close before arming), b_max their maximum, b_med their
              median (the mean of the two middle values when K is even)
   K = max(3, floor(eligible sessions ÷ 252))   → fold-a 3, fold-b 4, final 6 (computed from the loaded calendar)
Q  (peak control, folds only, bounded budget):  Q(C) = centre net − λ·k
λ = $5,000 per book; α_m = 1.0; α_t = 0.5; band(k): 1,2,3,4,5 → 1–5; 6–7 → 6; 8–11 → 8; 12–15 → 12; ≥ 16 → 16
J0 = P50(net) − λ·k and T0 = P50(net_T) − λ·k are reported beside the scores.
```

net_T replaces the single best block by a typical (median) block: it equals net when profit is spread evenly and
removes the excess of one dominant episode; a losing block counts exactly as in net (no extra veto); the drawdown
penalties are identical to J's. It uses only marks inside the search window. **Known limitation:** fold-a has about
three eligible years and 10–15 funded lots per block for a typical pool, so its block P&Ls are noisy; the
neighbourhood median is the smoother. No fallback depends on an outcome: K ≥ 3 always holds and T is computed
identically in every window.

The centre's own net_T is reported (E0). The drawdown references R_m, R_t come from §7 by the October 25 study's rule.

### 6.3 Ranking and ties (all stages)

Feasible before infeasible; infeasible by v ascending; feasible by the arm's score descending. **Ties are exact only**
(equal to the cent): then the Q25 of the arm's net (net for J, net_T for T; centre drawdown ascending for Q), then
fewer books, then the canonical key. There is no tie window: a score difference of any size above one cent decides.
Wherever a pick or nominee is decided, the paired-bootstrap 90% interval of its score difference with the runner-up
is reported and flagged "within perturbation uncertainty" when it contains 0; the flag changes nothing.

## 7. Reference controls (per window; training only; no candidate)

- **Configurations:** strata k ∈ {1, 2, 3, 4, 5, 6, 8, 12, 16} × **64** = 576, memberships uniform without replacement
  over the eligible universe, each member's vector uniform from this study's Sobol library, seeds
  `('diverse-d1', 'control-config', k, i)` — the same 576 configurations in every window.
- **Per control:** centres at 0/2/5/10 bps (5 bps with block marks), N1 `calib` n = 64 (block marks), and the
  October 25 study's machinery checks (zero-amplitude draws reproduce the base; replay = full engine on 8 random
  neighbours per stratum; reflection inside the box; pooled shareAbove over active controls (≥ 4 centre lots) in
  0.5 ± 0.05 with exact ties counted ½). A failed machinery check stops the study.
- **Calibration (the only constants set from controls; rule fixed here):** R_m, R_t per window and stratum by the
  October 25 study's §6.3 rule — eligible controls (centre DD@5 ≤ $35,000, ≥ 4 funded lots), nearest-stratum pooling
  to ≥ 10, Q75 of DDmed / DD90, floors $35,000 / $45,000, caps $55,000 / $75,000, flags floor / calibrated / extreme /
  uncalibrated. Written once to `results/controls/<window>/calibration.json` (sealed).
- **Comparators:** in each fold, the eligible controls' validation V (§14.3) form the reference distribution.
- **Persistence diagnostic (descriptive, never acted on):** among each fold's eligible controls, Spearman correlation of
  each of {centre net, J0, T0} on the search window with V (§14.3). Fold-b's version is the 2017–2021 → 2022–2023
  comparison, so no separate final-window split is computed. Reported whatever it shows.

## 8. Libraries and arms

- **Library:** 1,024 unique scrambled-Sobol vectors over the unchanged box, seed `deriveSeed('diverse-d1', 'library',
  'sobol-scramble')` — a fresh sample, not the October 25 study's. Pinned per window at 5 bps for every eligible
  symbol.
- **Seeded library (final round, seeded arms only):** the Sobol vectors plus the inspected control vectors of the
  earlier studies (D1 shipped constants, eight-ETF nominations, portfolio-aware frozen vectors incl. B5's GDX vector),
  each flagged `inspectedPostTraining`. R1/R4 and October 25 finalist vectors are never in any library. **Unseeded
  arms use the Sobol vectors only, in every round** (the October 25 study's final unseeded arm could draw control
  vectors; this one cannot).
- **Arms.**

| Round | Arm | Score | Start | Purpose |
|---|---|---|---|---|
| fold-a, fold-b | **J-u** | S_J | unseeded | neighbourhood reference procedure |
| fold-a, fold-b | **T-u** | S_T | unseeded | temporal candidate procedure |
| fold-a, fold-b | Q-u | Q | unseeded | bounded peak control (anchors the earlier peak results) |
| final | **J-u**, **T-u** | S_J, S_T | unseeded | the procedures' final rounds (primary nominations come only from here) |
| final | J-s, T-s | S_J, S_T | benchmark-seeded | exploratory; may supply labelled alternates only (§15) |

J and T arms of a round share the identical stage-A schedule, identical stage-B, stage-C and migration seeds (labelled
by start, not by score) and identical budgets and rules; their only difference is the score (refinement streams carry
the arm label, so their random moves differ). Arms never share archives, families or promotion slots. Evaluations are pure functions of
(window, configuration, stage) and are shared through one evaluation store per window, so a configuration evaluated
by one arm costs nothing when another arm reaches it — but it counts as unique effort in each arm's own archive only
once, and a repeat inside one arm is a cache hit that counts nothing.

## 9. Search (per round and arm): quota schedule, anchored islands, free islands

### 9.1 Genome and operators

Membership mask over the eligible universe plus one vector per symbol (latent when inactive); canonical key = sorted
`symbol:grid`. Operators and constants are the October 25 study's (`src/d1-robust/genome.ts`, imported unchanged):
add 0.15, remove 0.15, swap 0.10, paramOne 0.25, paramMulti 0.15, reset 0.10, crossoverOnly 0.10; per-symbol exchange
crossover p = 0.9, SBX η 15 on shared members (p 0.5), polynomial mutation η 20, added vector latent with p 0.5. Every
vector stays on the grid.

### 9.2 Stage A — the quota schedule (outcome-free; identical in every window and arm)

A deterministic list built before any evaluation, from the universe, the library and seeds only:

| Band | Books per configuration | Passes |
|---|---|---:|
| A1 | 1 | 8 |
| A2 | 2–3 | 150 |
| A3 | 4–6 | 150 |
| A4 | 7–11 | 60 |
| A5 | 12–16 | 20 |
| A6 | 17–24 | 8 |

A **pass** of a band shuffles the universe (`('diverse-d1', 'schedule', band, pass)`) and cuts it into consecutive
groups, each of a size drawn uniformly from the band (capped at |U|); a final remainder smaller than the band's
minimum is completed to the minimum with symbols drawn from a fresh shuffle of the others (each such fill is an extra
appearance, recorded). Each appearance of symbol s takes the next vector of s's own seeded permutation of the library
(`('diverse-d1', 'schedule', 'vectors', s)`), so a symbol's appearances use distinct vectors and every scheduled
configuration is unique by construction (asserted). Effort is weighted towards 1–6 books, where a single funded lot
can hold a feasible pool (earlier evidence: no ≥ 12-book subset met $35,000; feasible nets peak at 4–5 books), while
every band, including > 16 books, is sampled. For 61 symbols: **396 appearances per symbol** (+ fills), about 6,500
configurations. The schedule's hash is bound by the protocol freeze.

### 9.3 Stage B — anchored islands (one per eligible symbol, equal budget)

For each symbol s, an island of population **μ_B = 24** whose every genome contains s (operators repair to keep s).
Initial population: the 12 best entries containing s in the arm's archive after stage A (by the arm's ranking), then
random genomes containing s (s plus 0–5 others, uniform; library vectors; seeded arms: plus every benchmark
configuration B1/B4/B5 containing s, replacing the last random genomes); these initial members may be entries already
in the archive. Each generation breeds children (binary tournaments, crossover, one operator, repair) until it has
μ_B **fresh** children — keys new to the arm's archive and to the batch's pending set — or 20 × μ_B attempts are
used; a cache hit is dropped (it neither counts towards μ_B nor enters survival). Survival is (μ + λ) by the arm's
ranking. **Fill rule:** when the attempts end with fewer than μ_B fresh children, the generation is completed with
fresh random genomes containing s, so each island spends exactly its budget **b_B** of fresh unique configurations
(no stall stop). All islands advance in lockstep generations (islands in
alphabetical order within a batch; a key first proposed earlier in the batch is a hit for later islands).
Seeds `('diverse-d1', window, 'stageB', startLabel, s)` (startLabel `unseeded`/`seeded`; shared by J and T).

### 9.4 Stage C — free islands

8 islands, population **μ_C = 48**, cap **b_C** fresh unique configurations each, (μ + λ) survival and binary
tournaments by the arm's ranking, ring migration every 8 generations of 4 genomes drawn from the source's best 12;
breeding as in stage B (only fresh children count and survive; attempts ≤ 20 × μ_C per generation) but without a fill
rule: an island stops after 3 generations without a fresh child (unspent budget is not reallocated; recorded).
Configurations of more than 24 books are not scheduled in stage A; the islands can reach them only through `add`
operators (a predeclared limitation; one funded lot makes such pools implausible, MC §1.1). **Initial populations:** the best entry of every anchored island (stage B), ordered by the
arm's ranking and dealt round-robin to islands 1–8, then random genomes (1–8 books, library vectors) to 48. Seeded
arms: island 8 instead starts from B1, B4, B5, 29 one-move mutants (add / swap / reset cycle) and random fill.
Seeds `('diverse-d1', window, 'stageC', startLabel, island)`.

### 9.5 Coverage contracts (checked on the archive; a failure blocks every nomination)

Per round, arm and eligible symbol s (counts of unique configurations of the arm's archive; cache hits never count):

| Contract | final arms | fold J/T arms | fold Q arm |
|---|---:|---:|---:|
| configurations containing s | ≥ 600 | ≥ 450 | ≥ 440 |
| distinct vectors evaluated on s | ≥ 225 | ≥ 200 | ≥ 200 |
| configurations containing s in each band A1…A6 (bands larger than the universe waived) | ≥ 8 / 150 / 150 / 60 / 20 / 8 | same | same |
| distinct co-members of s | ≥ 55 | ≥ 55 | ≥ 55 |
| co-occurrences of s with each category (other symbols) | ≥ 30 | ≥ 30 | ≥ 30 |

Per arm (protected coverage examples, never admission privileges): ≥ 500 configurations free of every B5 member
(VGT XBI XRT KRE GDX), ≥ 100 containing VGT, ≥ 500 excluding VGT, ≥ 100 containing GDX, ≥ 500 excluding GDX. Stage A
gives every symbol ≥ 396 appearances with distinct vectors in every band and stage B adds b_B more containing it, so
the contracts hold **by construction** whatever the search finds; the synthetic tests of §18 verify this on 16-, 61-
and 75-symbol universes (the co-member contract is min(55, |U| − 1)). Recorded beside the contracts and never gating:
per symbol the counts of centre-feasible, neighbourhood-scored and credible configurations (search records) and of
family leaders, promoted, refined and assessed configurations (selection records), its distinct behaviour keys
(identical traces counted once) and its most frequent co-member's share; and per size band × B5-free × category cell
the number of configurations sampled.

## 10. Credible set and families (per arm; never pooled across arms)

1. **Credible set:** archive entries with F1 at 5 bps, arm score > 0, and centre activity at the gate floor (final:
   ≥ 12 funded lots in ≥ 3 calendar years; folds: ≥ 8 in ≥ 2) — a quality floor fixed here without any outcome.
2. **Closeness to a leader** (Fable's thresholds): membership Jaccard distance < 0.5 **and** funded-trade overlap
   ≥ 0.5 (shared funded (symbol, decision minute) pairs ÷ the smaller lot count) **and** Spearman correlation of the
   regime-attribution vectors ≥ 0.7 (a constant or undefined correlation counts as not close; features come only from
   the search window).
3. **Leader-ordered complete linkage:** the credible set in the arm's ranking order; each entry joins the first family
   whose leader **and every current member** it is close to, else it founds a new family as its leader. Every family
   is therefore pairwise close (its within-family separation is bounded by the closeness thresholds), so a chain
   A~B~C with A not close to C can never place A and C in one family, whatever the ranking order (adversarial test,
   §18); no transitive chain can merge a converged archive into one family. A family's size is recorded and has no
   effect; its leader (its best entry) is its representative for slot assignment. One membership may form several
   families when execution behaviour differs.
4. Recorded per entry: its family; per leader: slot assignment or the reason it was not shortlisted.

## 11. Promotion (per arm)

**Shortlist slots, filled in this order** by the best leader not yet chosen that satisfies the slot:

| Arm | Slots |
|---|---|
| final arms (8) | Q1, Q2, Q3 (best leaders); compact (≤ 3 books); medium (4–6); broad (≥ 7); incumbent-free (no B5 member); far (Jaccard distance ≥ 0.75 from every already chosen leader) |
| fold J/T arms (6) | Q1, Q2; compact; incumbent-free; far; Q3 |
| fold Q arm (4) | Q1, Q2; compact; far |

For each slot, the family's top **m** members (arm ranking; m = 3 in tiers E and F, 2 in tier R) are re-evaluated: N1
`promo` (n from the tier table; 96 in tier E) with block marks, centres at 0/2/10 bps, the full-engine 20% portfolio at
5 bps (symmetric). The family representative is the best of them (arm score on the `promo` draws) passing F1 at 5 and
10 bps and F-P; if none passes, the slot passes to the next qualifying leader not yet tried (at most 3 attempts per
slot; each failure recorded with its reason). A **non-quality slot with no qualifying leader at all** is recorded as
unfillable and replaced by one extra quality slot appended at the end; a slot whose 3 attempts all fail is recorded and
not replaced; a quality slot with no leader left ends the shortlist. **Every shortlisted family is refined, pruned and
assessed** (§12–§13): an arm's shortlist is its research depth, whatever other arms score.

## 12. Refinement, member pruning and re-refinement (per shortlisted family)

### 12.1 Refinement (the October 25 study's passes, with the arm's own score)

Objective: the arm's score at `refine` n = 48 (Q arm: Q). A move is accepted only when the objective rises by more
than **δ = $5,000** (paired, identical draws) and F1 holds at 5 and 10 bps. Cycle: (i) remove each member (k ≥ 2);
(ii) add each inactive symbol with one library vector; (iii) swap each member for 4 random inactive symbols; (iv)
coordinate pass (each member's in-box ±u, ±2u probes; best improving accepted before the next member); (v) 32 random
pair moves; (vi) 16 random joint moves of one member. At most 3 cycles; stop when a cycle accepts nothing; cap of
unique evaluations per family from the tier table (tier E: **800** final, **500** folds J/T, **300** fold Q). Seeds
`('diverse-d1', window, 'refine', arm, family, cycle)` (the re-refinement cycle: `'re-refine'`).

### 12.2 Member pruning (obligatory, before any assessment; J and T arms)

On the `prune` batch (n = 128, independent of `refine` and `confirm-A`), for the current configuration C with k ≥ 2,
each member's marginal m_i = score(C) − score(C ∖ i) (the arm's score; the empty pool scores 0; for k = 1, m = score(C))
and its paired-bootstrap distribution (10,000 joint resamples of draw indices; both scores recomputed per resample;
seed `('diverse-d1', window, 'prune-bootstrap', configuration key, member)`). **Rule:** while some member's 90% lower bound (5th percentile)
is ≤ 0, remove — among those members — the one with the lowest point estimate (ties: symbol), provided C ∖ i keeps F1
at 5 and 10 bps (else try the next such member; if none can be removed, stop: "prune blocked by F1"); recompute all
marginals on the new configuration; repeat. Pruning to the empty pool drops the family ("pruned to empty"). Every
removal is logged with its marginal, interval, and the funded lots added and removed. This uses the **same objective,
perturbation distribution and allocator** as the member gate G3, with a conservative uncertainty band so that a
retained member is unlikely to fail G3 on the independent batch by noise alone; G3 itself is unchanged (§13–§15).

### 12.3 Re-refinement and the final state

After pruning: one cycle of the parameter passes (iv)–(vi) only (no membership moves), δ = $5,000, within the
family's remaining cap; then the §12.2 rule once more (no further re-refinement). Pruning evaluations are obligatory
and are not limited by the family's refinement cap. F-P is then checked on the final prune's result; if it fails, the
first prune's result is tried; a state that did not satisfy a pruning rule (such as the re-refined state before the
final prune) is never a fallback; if neither passes, the family stops ("F-P after pruning"). A family whose result
equals an earlier family's result in the same arm is recorded as "converged to the same configuration" and assessed
once. Q arm: pruning uses centre marginals Q(C) − Q(C ∖ i) ≤ 0 (no draws) under the same F1 proviso.

## 13. Assessment (finalists of every arm; B1, B4, B5 on the same draws)

On the round's window: N1 `confirm-A` (n from the tier table; 256 in tier E) at 5 bps and at 10 bps (block marks), A2
n = 128, N2 n = 64, N3 8 per member,
N0 probes; centres at 0/2/5/10 bps; both scores and their components; smoothed leave-one-out marginals under **both**
scores on the confirm-A draws; per member: virtual trades, funded lots, regimes, grade (standard: ≥ 3 virtual trades,
≥ 2 funded lots, lots in ≥ 2 regimes; else thin), refusal matrix, net and DD without it; contested ties and tie-order
sensitivity (reverse alphabetical and two seeded orders); boundary-sitting coordinates; top-2 lot share and best
regime share; per-block P&L; paired bootstraps (identical confirm-A draw indices) of P50(net), P50(net_T), S_J and S_T
against B4 and B5; the
full engine (fixed at 0/2/5/10 field for field against the replay; the 20% portfolio at 0/2/5/10 under both dividend
conventions); B5's ladder (10/15/20/25/30% at 5 bps, symmetric) and matched-borrowing interpolation; C0's drawdown on
the same dates; 16 N1 neighbours in the portfolio (descriptive); capacity (§17); omitted-distribution bounds (§17);
labels (inspected control vector, neighbour of an inspected configuration (B1/B4/B5), near an inspected non-advancing
reference (R1/R4/October 25 finalist, §2.10), seeded provenance, thin evidence, box-constrained, capacity, Vanguard
brokerage). PBO (CSCV, quarterly attribution of each arm's top 1,000 credible
entries, S = 8 and 16) is descriptive.

## 14. Walk-forward rounds and the procedure gate

### 14.1 A fold round

`trainingUniverse(fold)` → controls (§7, sealed calibration) → library → stage A/B/C for J-u, T-u, Q-u → families and
promotion per arm → refinement, pruning, re-refinement → assessment → fold gates → picks → **`PICKS.json` written once
(body hash)** → only then `validationUniverse(fold)`.

### 14.2 Fold gates and picks (per procedure P ∈ {J, T}; 5 bps; confirm-A)

- **G1** replay = full engine (fixed, 0/2/5/10) field for field; members in the frozen universe.
- **G2** centre minute DD ≤ $35,000 at 5 and 10 bps; training portfolio daily % DD ≤ 35%.
- **G3** pool ≥ 8 funded lots in ≥ 2 calendar years; every member's P-marginal on confirm-A > 0.
- **G4** P50 of the neighbours' **net** at 10 bps > 0 and ≥ 0.80 × at 5 bps; centre net > 0 at 0, 2 and 10 bps.
- **G5** Q25 of the neighbours' **net** ≥ 0; centre net − two largest lots > 0; centre net − largest positive regime
  > 0.

G4 and G5 are economic cost and tail checks of the actual P&L and are identical for both procedures (net, never
net_T); the procedures differ only in their score: ranking, the credible floor (§10), G3's marginal and G6's materiality
use P's own score and net.
- **G8** centre net change under each tested tie order ≤ $25,000.

Ranking by P's confirm-A score (§6.3). **Primary** = the top passing finalist (no capacity or box exclusion in a
fold); **alternate 1** = the next passing finalist at Jaccard distance ≥ 0.5 from the primary; **alternate 2** = the
next passing finalist with ≤ 3 books at distance ≥ 0.5 from both (always compact). Q arm: the centre analogues (G3 with centre
marginals; G4 centre net at 10 ≥ 0.80 × at 5 and > 0 at 0/2/10; G5 centre − two largest > 0 and − best regime > 0;
G8), ranked by Q, ties by centre DD then key. No benchmark gate in a fold (B1/B4/B5 saw the validation years).

### 14.3 Validation (after the sealed `PICKS.json`)

One continuous fixed-pool run from 2016-01-04 to the validation end (all state carried across the search end) at
0/2/5/10 bps; V(x) = strategy mark at the validation end − mark at the search end (5 bps unless stated); validation
minute DD with the peak reset at the search end (recomputed from the run's lots and bars and self-checked against the
whole-run replay); isolated flat-start run (secondary diagnostic); 20% portfolio validation return on own base (both
conventions); validation-window N1 (`validation`, n = 64) for the picks. Evaluated on the same footing: every
assessed finalist of every fold arm (descriptive — the picks were frozen first), B1/B4/B5 (in-sample references
only), and all 576 controls (eligible = centre DD@5 ≤ $35,000 and ≥ 4 funded lots on the search window). Beside each
percentile, descriptive only (never GP): the percentile among eligible controls with comparable validation activity
(validation funded lots within ½× to 2× of the row's; NaN with fewer than 10 such controls), because random controls
need only 4 lots and a busy pick can beat them in a rising window without selection skill.

### 14.4 Fold outcome categories (recorded per procedure and fold, decided in the order (c), (a), (b))

- **(c) forward** — a finalist passed the fold gates, so a pick exists and its validation is recorded (whatever the
  number of families);
- **(a) search** — the arm's archive yielded fewer than 3 credible families (the coverage contracts are reported
  beside it: met → landscape; not met → machinery);
- **(b) economics** — otherwise: no family passed promotion feasibility, or none survived refinement and pruning, or no
  finalist passed the fold gates (whichever applies is stated, with the gates each finalist failed; a member-marginal
  failure is reported as such, never as a time failure).

### 14.5 Procedure gate GP(P), written once to `results/walkforward/PROCEDURE_GATE.json`

With ctl_p the type-7 p-quantile of the eligible controls' V in a fold:

```
GP(P) passes iff  both folds are category (c), and
                  (i)   in both folds   V(P primary) > ctl_0.50
                  (ii)  in some fold    V(P primary) ≥ ctl_0.75 and V(P primary) > 0
                  (iii) in no fold      the P primary's validation minute DD exceeds $45,000
A fold with fewer than 20 eligible controls, or a non-finite quantile, has no comparator: GP(P) fails ("no comparator").
```

If each fold's pick were a random control, GP(P) would pass with probability 0.25 − 0.0625 = **0.1875**; with two
procedures, about 0.34 that at least one passes. These figures are reported with the result: the gate can stop a
procedure that does not persist; it cannot certify one that passes. **Comparison rule (predeclared):** "T persisted
better than J" is stated only if GP(T) passes and GP(J) fails, or both pass and T's primary has a higher control
percentile than J's in both folds; otherwise the report says the folds do not distinguish them. Q's validation is
reported beside both, never gated. Descriptive, never acting: Spearman of the confirm-A score rank with V among each
procedure's assessed finalists.

## 15. The final round, gates, ranking and nominations

1. The final round runs all four arms whatever GP says (exploration is always reported).
2. **Final gates** (per procedure P, 5 bps, confirm-A): G1, G2, G3 (pool ≥ 12 lots in ≥ 3 years; every member's
   P-marginal > 0; member grades), G4, G5, G8 as in §14.2 (G8 also: boundary-sitting coordinates ≤ 25% of 8k, else
   "box-constrained": an alternate, never the primary), and
   - **G6 materiality** versus B ∈ {B4, B5}: Δ = P50_A(net_P)(C) − P50_A(net_P)(B) ≥ M, the 90% paired-bootstrap interval
     of Δ has lower bound > 0, and S_P,A(C) ≥ S_P,A(B); M = $25,000, or $50,000 when C's training portfolio daily % DD
     is in (30%, 35%]; net_J = net;
   - **G7 borrowing** training portfolio end equity (symmetric, 5 bps) ≥ B5's ladder interpolated at C's
     borrowing-dollar-days (an extrapolation is labelled).
3. **Which procedure may nominate:** T if GP(T) passed; otherwise J if GP(J) passed; otherwise none. Ranking by that
   procedure's confirm-A score (§6.3). **Primary** = the top passing finalist **of that procedure's unseeded arm** that
   is neither capacity-limited nor box-constrained; **alternate 1** = the top other passing finalist of either of that
   procedure's arms at Jaccard distance ≥ 0.5 from the primary; **alternate 2** = the top other passing finalist with
   ≤ 3 books at distance ≥ 0.5 from both. A seeded-arm alternate is labelled "seeded from inspected benchmarks — start
   not walk-forward testable". Without a primary-eligible finalist, passing finalists may be alternates (labelled "no
   primary-eligible finalist"). A finalist labelled "near an inspected non-advancing reference" (§2.10) is never
   nominated in any role.
4. **No advancement** if neither procedure passed GP, or no finalist of the nominating procedure passes the gates, or
   any coverage contract of any round's J/T arm failed. Nothing is then evaluated after 2023.

## 16. Selection freeze, the reporting batch and the blocking-only historical check

1. `freeze-selection` writes `FROZEN_SELECTION.json` once (body hash), always (also for no advancement): outcome and
   reason, nominees (members, grids, tie order), every finalist's gates and values, rankings, GP, coverage results,
   calibrations, seeds, budgets, evaluation counts, every record's hash, code/data/universe/protocol hashes, parity
   signatures, authorized commands. Every final finalist's gates and score are recomputed from its stored assessment
   numbers and must equal the stored ones, and the nominations are recomputed and must equal the sealed selection
   candidates (`results/rounds/final/selection.json`, itself sealed).
2. `confirm-b` (training only): N1 `confirm-B` (n from the tier table) for every final finalist, nominee and benchmark,
   and the inspect-only R1, R4 and October 25 finalist; reported with 90% bootstrap intervals of P50(net), P50(net_T)
   and Q25 and the A/B difference (flagged beyond 2 pooled bootstrap SE). It cannot change the selection.
3. `evaluate` — **only if the frozen selection names nominees; once** (a byte-identical `--confirm` re-run allowed):
   continuous `all` for nominees, B1, B4, B5, C0 — fixed and portfolio, 0/2/5/10 bps, both dividend conventions,
   segment attribution (development ≤ 2023-12-31 / holdout 2024-01-01 → 2025-10-16 / final 2025-10-17 → 2026-10-13),
   two-largest-lots bridges, omission bounds (a C1, C2 or versus-B5 comparison that the 6% bound could reverse is
   marked "dividend-unresolved"), replay parity. Blocking rules (5 bps unless stated; necessary, never
   sufficient): C1 post-training strategy P&L ≥ 0; C2 post-training Δ versus B4 ≥ −$2,500 at 5 and 10 bps; C3 full
   fixed minute DD ≤ $35,000; C4 full portfolio daily % DD ≤ 35% (symmetric; frozen reported). Failing any → "blocked
   on inspected history". Passing all → E3 "historically consistent", never "validated". No re-ranking, rescue,
   re-optimization or rule change after `evaluate`. Recommendation: the primary, if it passes C1–C4, is the **primary
   forward-test candidate**; otherwise the benchmarks are retained. No phenotype file is created or changed.

## 17. Dividends, costs, capacity

- Fixed pool: price-only for every lot. Portfolio: **symmetric** (no lot receives distributions; the core receives its
  verified VOOG/VGT distributions) for every gate; **frozen** (VGT lots receive VGT's) reported beside it and used for
  the to-the-cent reproduction of earlier records. Neither is a complete total-return model.
- **Omission bounds** (no download is authorized, so no new distribution history): per finalist member, lot-days ×
  $100,000 × {1%, 3%, 6%} ÷ 365, and ex-date proximity is not modelled. A comparison whose sign the 6% bound could
  reverse is marked "dividend-unresolved" (rates/credit, utilities and other income-heavy members flagged).
- Costs 0/2/5/10 bps per side applied once per fill by the engine; interest separate; replay and engine cost totals
  compared (no double charge).
- Capacity (per finalist member, window's own bars): partLot = $100,000 ÷ median dollar volume of the five regular
  minutes from each funded decision; partPortfolio with the lot at 20% of the training portfolio's end equity; share
  of fills ≥ 2 minutes after the decision. **capacity-limited** if partLot > 0.10 or > 10% of fills delayed (never the
  primary); **capacity-unverified** if partPortfolio > 0.10. Vanguard-issued books (VOOG VGT VIG VGK EDV VPU) carry
  "brokerage-constraint pending" (30-day no-loan-value rule; not modelled).

## 18. Correctness, parity, caching, determinism and tests

- **Controls reproduction (before the freeze):** B1/B4/B5/C0 on training and `all`, fixed and portfolio, 0/2/5/10 bps,
  frozen convention, equal field for field to `research/joint-16-etf-d1/results/controls/controls.json` (anchors at 5
  bps on `all`: B4 fixed $284,244.74, portfolio $3,608,484.05, 34.65%; B5 fixed $486,207.77, minute DD $26,509.97,
  portfolio $5,410,976.72, 29.67%). Any difference stops the study.
- **Parity matrix (before the freeze; any unexplained difference stops the study):** P0 frozen engine = N-book engine
  (B1, B4; both modes; 4 costs); P1 replay = N-book engine field for field (trades, lots, signals, daily rows, marks,
  drawdowns) on every eligible symbol alone, random pools of 2, 4, 8, 12, 16, 24 and 32 books (incl. VOOG as a book,
  no VGT, every split symbol, the sparsest-coverage symbols, the thinnest-volume symbols), B1/B4/B5 and a pool with a
  lot open at the window end, at 4 costs; P1-cut at both fold search ends; P2 portfolio consistency under both
  conventions; P3 lookahead (a later exit's price or time changes no earlier funding decision; 12 random six-book
  pools, middle lot altered); P4 worker pool = in-process runner; P5 block marks of the replay equal the full engine's
  daily marks at the block boundaries.
- **Cache:** traces are shared only through keys covering dataset content, window, splits, parameters (full grid),
  settings, cost and code; one evaluator per loaded window; portfolio figures only from the full engine.
- **Determinism:** every stochastic element seeded; workers evaluate pure functions; results reduced in request order;
  after the fold-a search, stage A and the first 2,000 stage-B evaluations of fold-a's J arm are re-run in a fresh
  process with the worker pool, and the first 2,000 evaluations also in a single thread; the archive log lines are
  compared byte for byte with the original.
- **Leakage:** physical truncation with last-date assertion and bar hashes; window-specific evaluators and trace keys;
  per-round archives; unseeded libraries without control vectors; `PICKS.json` before any validation load; a
  **mutation test** through the real loader on fixture CSVs running the whole search and selection (post-cutoff prices
  +3% → byte-identical archives, promotion records, refinement and prune records, assessments and picks; the same shift
  before the cutoff changes the archives; an untruncated load sees the post-cutoff shift).
- **Design tests (each old structural failure impossible by construction; `DESIGN_DIFF.md`):** (1) coverage — the
  scheduler and anchored islands on synthetic universes of 16, 61 and 75 symbols with skewed profitability, forced
  early convergence (one dominant symbol) and an exhausted stage-C budget satisfy every §9.5 contract, and the
  nomination code refuses when a contract fails; (2) arm suppression — a synthetic archive where the seeded arm owns
  the top 300 ranks and the unseeded arm holds several distinct lower families: the unseeded arm still fills every
  slot of its shortlist from distinct families (refinement and assessment of every promoted family are exercised end
  to end by the mutation test); (3) chaining — A~B, B~C, A≁C never share a family, and a converged archive
  of near-duplicates plus a few distinct configurations yields several families; (4) refinement/gate contradiction —
  a member with marginal −$1,897 (below δ) is pruned before assessment; one-book, near-zero and cascading prune cases;
  (5) the tie window — two finalists $6,493 apart are ranked by score, not by key; (6) inspected references — exact
  and near copies of R1/R4/the October 25 finalist are detected and never nominated in the final round.
- **Hashes in every record:** protocol, context, universe, tier, schedule, data files, partitions, splits, ledger,
  code manifest (every `src/**/*.ts` except tests, `generated/` and `src/d1-diverse/report.ts`), git HEAD, Node
  version (v24.21.0). Every pre-freeze check record (universe, tier, reproduction, parity, legacy-check) carries the
  protocol, context and code hashes it was produced under; the freeze refuses any that differs from the head being
  frozen, binds each record's hash, and also hashes the test files as a separate, non-gating list. Every outcome stage
  verifies the freeze, the bound check records, the amendment head and the canonical files; the pre-freeze checks
  refuse to run after the freeze.
- The full suite passes with nothing weakened or deleted; `tsc` clean; eslint without new errors.
- **Independent reviews** (separate agents that did not write the code): of the design and code at the commitment;
  before the final round; before the selection freeze. Material findings are fixed and recorded before proceeding.

## 19. Compute tiers and budgets (chosen once, from timing and memory only)

| Item | Tier E | Tier F | Tier R |
|---|---|---|---|
| stage A (all arms, shared) | 396 appearances per symbol | same | same |
| stage B fresh per symbol: final / fold J,T / fold Q | 400 / 200 / 60 | 300 / 150 / 60 | 210 / 80 / 50 |
| stage C fresh per island (8 islands): final / fold J,T / fold Q | 2,000 / 1,000 / 300 | 1,200 / 600 / 200 | 600 / 300 / 150 |
| discovery draws n_D | 16 | 16 | 12 |
| promotion draws / members per family | 96 / 3 | 96 / 3 | 64 / 2 |
| refinement draws / cap final, fold J,T, fold Q | 48 / 800, 500, 300 | 48 / 600, 400, 300 | 32 / 400, 300, 200 |
| prune draws | 128 | 128 | 96 |
| confirm-A / confirm-B | 256 / 256 | 256 / 256 | 192 / 192 |
| controls per window | 576 × 64 draws | same | same |

Every tier keeps every arm, both folds, the controls, the schedule, every contract, pruning and both confirmation
batches. Per final arm in tier E: ≈ 6,500 + 24,400 + 16,000 ≈ **46,900** configurations (about 2× the October 25
study's 24,000); fold J/T arms ≈ 26,700; fold Q ≈ 12,600. Total ≈ 319,000 arm-configurations (≈ 3.3× its 96,000),
with stage A evaluated once per window. **Selection rule:** `npm run diverse-d1 -- benchmark` measures, on the loaded
eligible universe and without printing or storing any configuration's P&L or rank, trace and replay times by book
count, full-engine time, worker scaling at 1, 4 and W = cores − 2 workers (memory read under load), and the retained
memory per trace, per store record and per archive entry (garbage-collected heap growth with traces already cached);
it projects each tier with no trace reuse across configurations (conservative), and the resident memory of the loaded
data, the pinned library traces, the largest window's store, the largest arm's archive and the workers, plus a trace
cache whose capacity (≤ 150,000, ≥ 20,000 traces) is the largest that keeps the projection within 95% of the ceiling.
The trace-cache capacity changes speed only — every evaluation is a pure function — and is recorded in `tier.json`
and used by every stage. The study runs the first of E, F, R whose projection is ≤ **20 hours** wall-clock and
≤ **13 GB** resident; if none qualifies, the study stops as an incomplete breadth study before any outcome. Budgets
never change after an outcome. Workers: W = 8 on the documented M1 Pro; a resident-memory guard checked at progress
points aborts above 14 GB (results are pure, so a re-run with a smaller trace cache is byte-identical and is
labelled).

## 20. Order of execution, commitments and freezes

```
M0  brief saved; PROTOCOL + context.ts + DESIGN_DECISIONS + DESIGN_DIFF; implementation; synthetic and design tests
    (no market P&L) → design commitment (sealed hashes of protocol, context, code manifest)
    → independent design/code review → fixes logged in results/changes-since-commitment.jsonl (hash chain), before
      any outcome
M1  legacy-check → re-audit (universe.json) → unit-cost benchmark (tier.json) → controls reproduction → parity
    → freeze-protocol (sealed: protocol, context, universe, tier, schedule, code manifest)
M2  controls + calibration (fold-a, fold-b, final) → fold-a round → PICKS (sealed) → validation (sealed)
    → fold-b likewise → PROCEDURE_GATE.json (sealed) → determinism re-run
M3  independent review → final round (search; selection: promotion, refinement, pruning, assessment, gates)
    → independent review → freeze-selection (always) → confirm-b
M4  evaluate (only with nominees; once; --confirm) → reports → final audit (tests, tsc, eslint, hashes, legacy-check)
```

Long stages are split into a search command (archives and logs, sealed with their hashes) and a selection command
that reads them, so a crash after the search never repeats it. In a re-run of an interrupted search, an arm whose
record verifies its own log is kept (arms are independent: every evaluation is a pure function of window,
configuration and stage) and an incomplete arm's directory is moved aside (`<dir>-aborted-<time>`); the selection
writes under `results/rounds/<window>/select/`, which is moved aside as a whole if a selection was interrupted. Nothing
is overwritten; a re-run is labelled.

## 21. Reports and the rejection ledger

Under `research/d1-diverse-pool-discovery/`: README (verdict), PROTOCOL, DESIGN_DECISIONS_AND_PRIOR_EVIDENCE,
DESIGN_DIFF, DATA_AND_UNIVERSE_AUDIT, CONTROLS_PARITY_AND_CALIBRATION, SEARCH_COVERAGE, FAMILIES_AND_PROMOTION,
REFINEMENT_AND_PRUNING, WALK_FORWARD_RESULTS (incl. T versus J), FINAL_ROUND, FROZEN_SELECTION.json,
HISTORICAL_CHECK (or the no-advancement statement), IMPLEMENTATION_AUDIT, RECOMMENDATION; `results/` records (large
regenerable logs git-ignored, sha256 recorded). A **rejection ledger** lists every leader, promoted family and
finalist with the stage and reason it stopped: data, centre risk, capacity, activity, concentration, member pruning,
smoothed economic score, procedure gate, final risk, or historical check. Every configuration table shows E0 beside
E1 with intervals and labels. A flat neighbourhood alone never advances anything.

## 22. Stop rules

The study stops after M4 (or earlier at any failed integrity, parity, controls, machinery or coverage check, which is
reported). No further search, candidate, re-ranking, threshold change, extra fold or "one more look" is allowed by
this protocol; a new question is a new protocol.

## 23. Amendments

Before the freeze, reviewed technical changes are appended to `results/changes-since-commitment.jsonl`, a hash chain
anchored to the design commitment's body hash; after it, amendments go to `results/amendments.jsonl`, anchored to the
freeze's body hash. Each record: number, UTC time, affected stage outputs (which must not exist), change, why it is
purely technical, the independent review it answers (required), protocol/context/code hashes before and after, and the
code manifest after. An amendment touching an affected stage's existing output is refused. **After the first fold
validation is sealed**, an amendment may change neither the protocol, the context nor any source file except
`src/d1-diverse/final.ts` (the mechanics of the reporting batch and the historical check), `cli.ts` and `stages.ts`
(command plumbing): no rule that can select anything changes once an outcome is visible. If an exposed outcome makes
a fix necessary anyway, the stage fails closed or a wholly new study is started.
