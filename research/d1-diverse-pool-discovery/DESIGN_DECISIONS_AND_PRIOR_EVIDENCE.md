# Design decisions and the prior evidence behind them

Every rule of `PROTOCOL.md` that is new relative to the October 25 study (`research/d1-robust-pool-discovery/`, "the
previous study") is listed here with the evidence it rests on and the reason it was chosen. **No figure of this study
existed when these decisions were made**: the decisions were written, implemented and tested on synthetic data
(`src/d1-diverse/tests/`) before the design commitment, and the only market data read before the commitment were the
data-integrity hashes (`results/baseline/`) and the previous study's own published records and reports.

References: **PP** Fable `PROPOSED_PROTOCOL.md`, **NO** `NEIGHBORHOOD_AND_OBJECTIVES.md`, **WF**
`WALK_FORWARD_AND_EVIDENCE.md`, **MC** `METHODOLOGY_CRITIQUE.md` (all in `research/d1-robust-design-review/`); **OP** the
previous study's `PROTOCOL.md` (amendment-3 head `5a216c53…`); **REC** its `RECOMMENDATION.md`; **COV** its
`SEARCH_COVERAGE.md`; **FAM** its `POOL_FAMILIES_AND_REFINEMENT.md`; **WFR** its `WALK_FORWARD_RESULTS.md`; **NR** its
`NEIGHBORHOOD_ROBUSTNESS.md`; **PC** its `PILOT_CALIBRATION.md`. The brief is `brief/BRIEF_AS_RECEIVED.md`.

## Facts taken from the previous study (verified against its files on 2026-10-26)

| Brief's summary | Verified in | Agrees? |
|---|---|---|
| 61 eligible of 64, calendar 2016-01-04 → 2026-10-13; GDXJ, OIH late cohort; XLRE excluded | `results/audit/universe.json`; DATA_AND_UNIVERSE_AUDIT | yes (2,710 sessions) |
| 96,000 discovery configurations; final arms 24,000 each | COV §1 | yes |
| floors unmet for 29 (unseeded) and 25 (seeded) final-arm symbols; 15% reserve, ≥ 100 per served symbol | COV §2 | yes (36 of 48 / 44 under-floor symbols served) |
| no unseeded candidate in the pooled top 300 | FAM §2; IMPLEMENTATION_AUDIT §6 (unseeded best $199,387 < 300th pooled $284,583) | yes |
| single linkage chained 295 (final) and 298 (fold-b J) | FAM §2 | yes |
| fold-b J finalist failed G3: XRT marginal −$1,897 vs δ = $5,000 | WFR §3; FAM §3 | yes |
| fold-a J pick EDV GDX KRE +$4,189 (40th pct); Q pick EWZ GDX −$30,323 (3rd); fold-b Q −$39,158 (0th) | WFR §2 | yes |
| GDX KRE XBI XLE: centre ≈ $309,743, P50 ≈ $291,440 vs B5 ≈ $210,556; not nominated | FAM §4; NR §2 | yes |
| B4/B5 anchors on `all` at 5 bps | CACHE_AND_CAUSAL_PARITY §1 | yes, to the cent |
| 658 parity comparisons, 0 differences; 521 tests | CACHE_AND_CAUSAL_PARITY §2; IMPLEMENTATION_AUDIT §8 | yes |
| R1/R4 post-training ≈ $70,350 / $71,058 vs B5 ≈ $97,719 | RETROSPECTIVE_R1_R4 §2 | yes |
| neighbourhood P50 did not predict later years among random controls | PC §3 (Spearman 0.023 vs −0.006) | yes |

One clarification: the brief says the tie rule "treated anything within $12,500 as a tie" — WFR §3 confirms the
fold-a primary was decided by the key between finalists $6,493 apart (S_A $167,239 vs $160,746). No discrepancy was
found between the brief's summaries and the files.

## D-1 Isolation of the frozen study (PROTOCOL §3)

**Evidence.** The previous study's freeze guard hashes every `src/**/*.ts` (OP §18); any new source file breaks it.
**Decision.** Work in the main checkout; verify the old study at its commit `348f100b` by recomputing its manifest
from git objects (`legacy-check`), which reproduced `d8b9b900…` (376 files) after the new files existed.
**Alternatives.** A separate worktree for the new study (keeps the old guard runnable in place, but strands data,
`node_modules` and future sessions in another directory, and the old guard breaks anyway as soon as both studies share
a commit); relaxing the old guard (forbidden). **Why chosen.** The historical state is the commit; checking it from
the object store is exact, repeatable at any time and independent of the working tree.

## D-2 Coverage designed from the floors (PROTOCOL §9.2, §9.5)

**Evidence.** COV §2: evolutionary islands concentrated quickly (GDX in 12,760 of 24,000 seeded configurations; XBI in
222 of the unseeded arm's); a 15% reserve with ≥ 100 per served symbol could not close gaps of 200–400; REC lesson 4.
**Decision.** A deterministic stage-A schedule gives every symbol 396 appearances with distinct library vectors in
every size band before any evaluation; one anchored island per symbol then adds an equal budget of configurations
containing it, filled with random genomes whenever breeding stalls, so the budget is always spent. The contracts
(≥ 600 configurations and ≥ 225 vectors per symbol in a final arm — the brief's candidate targets; ≥ 450 / 200 in a
fold arm) hold by construction and are verified on synthetic 16-, 61- and 75-symbol universes with a dominant symbol
and an exhausted free-island budget. **Band weights.** Effort is weighted to 1–6 books because MC §1.1 records that no
≥ 12-book subset met $35,000 and feasible nets peak at 4–5 books, and PC §3 that random pools of ≥ 5 books are rarely
feasible; > 16 books is still sampled (8 passes) as the brief requires. **Why anchored islands.** A symbol seen only
in random pools with random vectors has no chance to show what it can do in a pool; the October 25 top-up islands were
the right device but were given only to some symbols, late, and with too little budget. **Not claimed.** Coverage is
exploration, not evidence: a symbol's quota is not a quota of credible or promoted configurations.

## D-3 Arms never pooled before their own preservation (PROTOCOL §8, §10–§11)

**Evidence.** FAM §2; REC lesson 1: the seeded arm filled the pooled top 300, so the unseeded arm's families were
never formed. **Decision.** Every arm forms its own credible set, families and shortlist, and every shortlisted family
is refined, pruned and assessed; there is no cross-arm pooling at any stage before assessment. Cross-arm comparison
happens only among assessed finalists of one procedure. Unseeded libraries no longer contain inspected control vectors
in any round (in the previous final round the unseeded arm could draw them through its library: OP §8).
**Primary nominee from the unseeded arm only.** The folds can test only the unseeded procedure (seeding with B1/B4/B5
vectors chosen on the validation years would leak: WF §4 B10), so a seeded-arm finalist may be an alternate, labelled,
never the primary. The seeded arms are kept because the brief asks for them and because "does starting from the
incumbents find something better?" is informative. **Optional stratified arm.** Not run: stage A and the anchored
islands already give every arm a stratified, symbol-anchored exploration; a third arm would add budget without a
distinct question.

## D-4 Chaining-free families (PROTOCOL §10)

**Evidence.** FAM §2: single linkage chained a converged archive into one family twice; REC lesson 2 suggested a family
cap or medoid clustering. **Decision.** Leader-ordered complete linkage with Fable's closeness definition (Jaccard
distance < 0.5, funded-trade overlap ≥ 0.5, regime Spearman ≥ 0.7 — PP §7 (2), chosen by Fable before any outcome):
an entry joins the first family whose leader **and every member** it is close to. Families are cliques of the
closeness relation, so no transitive chain exists in any ranking order (tested with A~B~C, A≁C in all six orders and a
12-link chain). A pure leader rule was drafted first and rejected during implementation because, with B as leader, A
and C could share B's family — compliant with "close to the representative" but not with the brief's adversarial
requirement. **Credible set** (centre-feasible, positive arm score, the gate's activity floor) replaces "top 300":
the floor is the economic minimum any finalist must meet, fixed without outcomes, and it removes the arbitrary
truncation that hid lower-ranked distinct families. **Slots** (quality plus compact / medium / broad /
incumbent-free / far) keep size and incumbency as diversity axes without privileging them: a slot is filled only by a
credible family, and a filled slot carries no gate advantage.

## D-5 Pruning coherent with the member gate (PROTOCOL §12.2–§12.3)

**Evidence.** WFR §3, FAM §3, REC lesson 3: refinement kept XRT (removal worth less than δ at n = 48), and G3 rejected
the configuration for it on the confirm-A draws. **Decision.** An obligatory pruning pass on its own `prune` batch
(n = 128) with the same objective, perturbation distribution and allocator as G3, removing the lowest member while any
member's 90% paired-bootstrap lower bound is ≤ 0, with F1 protected; one parameter-only re-refinement cycle; a final
prune. G3 stays as before (point estimate > 0 on confirm-A). **Why the conservative band.** A member surviving the
prune with a lower bound > 0 has a small chance of a non-positive point estimate on an independent batch; a pruning rule
using only the point estimate would leave members that fail G3 by noise roughly half the time when their true
contribution is near zero. **Why separate batches.** The brief forbids pruning on the confirmation batch and then
calling it independent. **Not changed.** δ = $5,000 for exploratory moves; G3's definition; every economic threshold.

## D-6 The temporal score T (PROTOCOL §6.2)

**Hypothesis (a priori).** In the earlier studies the training leads that failed to persist were episode-concentrated:
R1's lead over B5 was a 2020 re-timing (MC §1.1: +$75,356 of +$79,317 in 2020); B5's post-training gain rests on two GDX
lots (MC §4); the fold picks of the previous study were not examined by period when this was written. **Decision.**
net_T = net − (best block − median block) over K contiguous equal-session blocks of about one year (K = max(3,
floor(sessions ÷ 252))), applied to every neighbour and the centre; S_T is S_J with net replaced by net_T. One
penalty, bounded by construction (it removes at most the best block's excess over a typical block), no extra loss
veto (losses already count in net and in the drawdown penalties), no weights fitted to any data. **Alternatives
rejected.** Regime-based attribution with hand-labelled regimes (the regimes were defined with hindsight); per-quarter
statistics (≈ 3 funded lots per quarter: noise); top-lot trimming inside the neighbourhood (the frozen worker returns
only the top-2 share, and the old G5 already checks net − two largest lots); time-window shifts (extra windows, extra
cost, and a start shift changes state). **Known limitation.** Fold-a has three blocks with 10–15 lots each; the
neighbourhood median is the smoother. **Fair comparison.** J and T arms share seeds, schedule, budgets and every rule
except the score (PROTOCOL §8). **Gates (changed at the review, before any outcome).** net_T ≤ net by construction, so
a gate applied to net_T is mechanically stricter than the same gate on net; the economic cost and tail checks G4 and
G5 therefore read the actual net for both procedures, while ranking, the credible floor, G3 and G6 use each
procedure's own score — otherwise the T-versus-J comparison would be confounded with gate strictness (brief §8.1).
**Regimes.** T avoids hand-labelled regimes as a *scoring* input; the same 13 regimes still enter, unchanged from the
October 25 study, as a family-closeness feature and in G5's best-regime clause — inherited conventions, not new
choices, and identical for both procedures.

## D-7 The procedure gate GP (PROTOCOL §14.4–§14.5)

**Evidence.** WFR §4–§6: the previous G-WF treated "no J pick" (a $1,897 member marginal) as a forward failure; WF §6
says two folds can stop a failing procedure but not certify one. Under the null (each pick's control percentile
uniform and independent) the previous G-WF would pass with probability ≈ 0.31. **Decision.** Fold outcomes are
categorized (a) search, (b) economics, (c) forward, and reported separately; GP requires a pick in both folds, both
above the control median, one in the upper quartile and positive, and no validation drawdown above $45,000 (null pass
0.1875 per procedure, ≈ 0.34 that one of two passes — reported with the result). The comparator floor rises from 10 to
20 eligible controls because the controls are now 576 per window (64 per stratum instead of 40) — the old fold windows
had 40–42 eligible controls of 360. **Which procedure nominates.** T if it passes (it is the study's hypothesis), else
J; the predeclared comparison statement says the folds distinguish them only in the stated cases. **Not claimed.**
The fold dates were inspected before; GP results are reused historical diagnostics (E2).

## D-8 Ranking without a tie window (PROTOCOL §6.3)

**Evidence.** WFR §3, IMPLEMENTATION_AUDIT §5 finding 10: a $12,500 window let the key decide between finalists $6,493
apart. **Decision.** Exact ties only (equal to the cent), then Q25 of the procedure's net, fewer books, the key; the
paired interval of the score difference to the runner-up is reported and flagged when it contains 0, changing
nothing. **Why not a statistical tie rule.** Any interval-based tie needs a rule for which tied candidate wins, and that
rule would then decide material differences again; reporting the uncertainty is honest without moving the decision to
an arbitrary key. The later outcomes of the two fold-a finalists (one +$120,241 with a $78,831 drawdown) were not used:
the rule follows from "a score difference is a score difference".

## D-9 Reference controls and calibration (PROTOCOL §7)

The October 25 calibration rule for R_m, R_t is kept unchanged (J must be that study's score). The control set is new
(fresh seeds, 64 per stratum, this study's library), because the old controls' validation outcomes were inspected and a
larger eligible set gives the procedure gate a less coarse comparator. Only the A1 neighbourhood is computed (the
other classes informed the previous study's severity diagnostics, which are not repeated). The final-window
persistence split was dropped as redundant with fold-b's control diagnostic.

## D-10 Budgets and tiers (PROTOCOL §19)

**Evidence.** The previous fold-a round (both arms, all stages) took 709 s for ≈ 234k replays and ≈ 316k trace builds on
8 workers (`results/walkforward/fold-a/round-run.json`); its conservative tier projection was 7.9 h against ≈ 1.5 h
actual. **Decision.** Per final arm ≈ 46,900 configurations (≈ 2× its 24,000); total ≈ 3.3× its 96,000, inside the
brief's 2–4×; three tiers chosen by a conservative projection (≤ 20 h, ≤ 13 GB) before any outcome; every tier keeps
every contract (tier R's stage-B budgets are the smallest that keep the floors). Discovery draws n_D = 16 fixed (the
previous pilot's rule chose 12 everywhere because random controls are smoother than leaders: PC §6).

## D-11 Accounting, dividends, risk (PROTOCOL §6.1, §16–§17)

Unchanged from the previous study except: no new distribution histories (no download is authorized), so the
historical check reports omission bounds and marks "dividend-unresolved" instead of failing closed for a missing
diagnostic (the previous study's `evaluate` could not have run on a nominee at all: its amendment 2).

## D-12 What would invalidate this design (checked, not assumed)

A coverage contract failing on real data; a machinery check failing on the controls; parity or reproduction
differing; a post-cutoff mutation changing any archive or pick; a design test failing. Each stops the study before any
selection (PROTOCOL §22).

## D-13 The independent review at the commitment (findings and dispositions)

A separate agent that had not written the code reviewed the committed design and code (read-only; it ran only `tsc`,
`eslint` and the synthetic tests). All dispositions below were made before any outcome of this study and recorded in
`results/changes-since-commitment.jsonl`; M1's checks were then re-run under the changed head.

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | material | the benchmark measured store-record memory while new neighbour traces were being built (MB per record), so every tier would have failed the 13 GB rule | traces warmed first; GC'd heap growth of retained records only; archive entries measured; worker RSS under load; a trace-cache capacity sized to fit (speed only) |
| 2 | material | M1 check records were not tied to the code being frozen; re-runs possible after the freeze | every check record stamps protocol/context/code hashes; the freeze refuses mismatches and binds the records; `requireFrozen` re-verifies them; pre-freeze checks refuse after the freeze; legacy-check writes new files after the freeze |
| 3 | material | breeding counted cache hits as children and let them survive, unlike §9.3 | only fresh children count and survive; hits dropped (protocol text made exact) |
| 4 | material | the F-P walk-back could return a state the final prune had rejected | walk back only through prune-satisfying states (final, then first prune result) |
| 5 | material (method) | T's gates were mechanically stricter than J's because net_T ≤ net | G4/G5 on actual net for both; score-based rules unchanged (D-6) |
| 6 | material (labelling) | nothing prevented re-discovering R1, R4 or the October 25 finalist and nominating them | exact/near-copy detection; labelled; never nominated in the final round (labelled only in folds) |
| 7–12 | minor | slot-replacement rule, alternate-2 rule, fold-category precedence, seed documentation, dead constants, select crash safety | rules stated exactly; alternate 2 always compact; (c)→(a)→(b); `seedLabels`; constants removed; `select/` directory with move-aside; sealed selection |
| 13 | minor | the benchmark door contradicted §2.7 and lacked the audit check | wording corrected; audited-hash check added |
| 14 | minor | the mutation test did not compare prune records or test a pre-cutoff shift | both added |
| 15 | minor | hash chains not anchored; weak amendment guards | chains anchored to the sealed records; review and outputs required; post-validation amendment scope limited to `final.ts`, `cli.ts`, `stages.ts` |
| 16–18 | minor | missing descriptive reporting; behaviour keys dropped; tests unbound | funnel from search + selection records; band × B5-free × category cells; paired score intervals vs B4/B5; confirm-B intervals and 2-SE flag; dividend-unresolved for C1, C2 and vs B5; behaviour keys and top-partner share; tests hashed into the freeze (non-gating) |
| 19 | observation | the control comparator is not exposure-matched | an activity-matched percentile reported beside GP (descriptive) |
| 20 | observation | whole-log string reads; inconsistent memory ceilings; a crash mid-final-search discards all arms | logs streamed; memory projection and guard documented; completed arms kept on resume |
| 21 | observation | regimes rejected for T but used elsewhere; > 24 books unsampled | stated (D-6; PROTOCOL §9.4) |
| 22 | observation | freeze-selection trusted stored gates | gates and scores recomputed from stored assessments and compared |

