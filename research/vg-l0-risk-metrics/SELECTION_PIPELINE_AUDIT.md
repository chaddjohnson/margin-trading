# SELECTION_PIPELINE_AUDIT — Stage 4: where risk enters NL0/RA1 discovery and selection

Code: Assignment 3 (`src/vg-l0-full-joint/`, FJ) reusing Assignment 2 (`src/vg-l0-risk-families/`, A2), Priority 3's engine
(`src/vg-d1-growth-joint/`, P3), 5B (`src/vg-lifecycle-matched-optimization/`, the NL0 reference) and
`src/optimizer/nsga2.ts`. The trace was drafted by a read-only subagent (`notes/stage4-code-trace.md`) and spot-checked
against the code (plausibility, violation terms, constrained domination, centre-first gating, refinement acceptance,
feasible-only shortlist). Evidence records: `results/pipeline/exclusions-scan.json` (`49124e0d…3268`),
`exclusions-compare.json` (`cd79ce3d…60ff`), `exclusions-replays.json` (`7010fb4a…7d83`); tables
`results/tables/exclusions-*.csv`. All read-only (the search archives were opened read-only; no search ran).

## 1. Stage by stage

| # | Stage | What decides survival (code) | Conventional centre DD / $35k | Neighbourhood DD | Net | Open lots, trade loss, giveback, stops |
|---|---|---|---|---|---|---|
| 1 | Domains and initial sampling | scrambled Sobol / Latin supercube screens, structure and strata pinned (FJ `space.ts:526-560, 661-681`; `search.ts:400-427`) | none before evaluation | none | none | none: stop distances, holds and Growth exit structure are ordinary genes with no risk prior |
| 2 | Plausibility | `plausible = net > 0 ∧ dd ≤ 35,000 ∧ both families funded` (A2 `fitness.ts:19`) | **hard: an implausible centre can never become feasible** | — | net > 0 | none |
| 3 | Screen → rung-1 promotion (64 of 512) | ¼ by centre net among the plausible; ¼ constrained rank (feasible fronts on (−net, dd), then infeasible by violation: `max(0, dd − 35k)/35k` + net and structure terms); ⅛ entry and ⅛ control patterns (plausible); the rest by diversity (FJ `search.ts:442-513`; `src/study8-expanded-regime-d1/search.ts:115-183`) | DD-breaching proposals can be promoted only behind every plausible one or by diversity | — | ¼ share | none |
| 4 | Rung-1 fit and NSGA-II islands | neighbours measured only for a plausible centre ("centre-first", FJ `search.ts:339-352`); unmeasured → p90 term 1, objectives [−net, 100000, 1e9]; feasible ⇔ net > 0, centre DD ≤ 35k, measured p90 ≤ 35k, funded (A2 `fitness.ts:21-61`); Deb's constrained domination (`nsga2.ts:16-42`); (μ+λ) survival by whole fronts | **constraint**: an infeasible member survives only if fewer than 32 feasible exist | objective 3 (p90 DD) and constraint | objective 1 (centre net) and 2 (robust net) | none (the search runs without detail: no MAE, no open-lot or stop field is ever computed) |
| 5 | Extension | hypervolume of (−robust, p90) against (0, 35,000), feasible points only; best feasible robust/net; new feasible classes (FJ `search.ts:583-598`) | via feasibility | HV axis | trigger | none |
| 6 | Rungs 2 and 3 | ¼ net, ¼ robust, ⅛ patterns from **feasible** members; refits re-decide feasibility with 64 / 128 neighbours | constraint | constraint | share | none |
| 7 | Refinement | moves accepted only if `violation 0` and net (or robust) gains ≥ $2,000 (FJ `search.ts:816-856`) | constraint | constraint | the acceptance criterion | none |
| 8 | Shortlist | **feasible only**, one per ledger (FJ `search.ts:868-876`) | constraint | constraint | profit / robust / balanced slots | none |
| 9 | Qualification | Q1 net > 0; **Q2 centre DD ≤ 35k**; **Q3 confirmation p90 DD ≤ 35k**; Q4 p10 > 0; Q5 10 bps net > 0 ∧ DD ≤ 35k; Q6 funded (FJ `qualify.ts:213-222`) | gate | gate (confirmation) | gate | report-only (detailed centre: MAE, open lot, occupancy) |
| 10 | Selection | P0: highest centre net (marked); P1 (RA1): S1 open-lot multiple ≤ 1.5, S2 open share ≤ 25%, S3 worst MAE ≥ −17.5k, S4 selection worst-10% mean DD ≤ 35k, then fewest failures → 5% band of realized + min(0, unrealized) → lowest occupancy (A2 `select.ts:28-89`) | tie-break only | RA1 S4 | P0 key; RA1 band | RA1 S1/S2 (blunt open-exposure screens: no stop state), S3 (MAE) |
| 11 | Folds | supported iff every fold has a primary, sequential net > 0 and **sequential DD ≤ 35k**; $50 per open lot at a switch (FJ `folds.ts:266-323`) | the verdict | — | the verdict | none (carried-lot give-back reported only) |
| 12 | Successor | (a) Q1–Q6; (b) supported; (c) not dominated by New L0 on (net, DD) and (p10, p90); (d) materially stronger downside (confirmation worst-10% ≤ NL0 − 2.5k, centre DD ≤ NL0 + 2.5k, worst MAE ≥ NL0 − 2.5k); (e) V1–V3 on FULL (FJ `final.ts`) | (c), (d), V2/V3 | (c), (d) | (c), V1 | (d) MAE |

NL0's own code (5B) uses the same plausibility, violation, centre-first gate, extension reference point, promotion,
$2,000 refinement rule, feasible-only shortlist, Q1–Q6, switch charge and verdict; it adds both-Growth protections and has
no RA1.

**What never enters any stage:** a realized-only equity curve, a loss below a trade's principal as such (the MAE appears
only at RA1 S3 and successor condition (d), after discovery), an unrealized-profit giveback, a stop level or its armed
state, a bounded-loss-exit property, the account's margin requirement. Conventional marked DD (centre and neighbourhood)
is a hard constraint at stages 2–9 and 11 and acts on every candidate before any selector sees it.

## 2. The critical question — were profitable, well-managed phenotypes discarded early because of the $35k MDD?

### 2.1 The scale of the exclusion (regenerated exactly from the archives)

The 512 screen proposals of each of the 128 Track I broad lanes per cutoff were regenerated with Assignment 3's own code
and looked up in its archives; their plausibility reasons reproduce every lane file's counts (512/512 lanes, 0
mismatches). Every fitted centre of the broad and refinement jobs was read too.

| Cutoff | Screen proposals: plausible / **DD > $35k** / net ≤ 0 / a family unfunded | Fitted centres (all lanes) / DD-infeasible | Distinct DD-excluded configurations | …with net above the best qualified Track I member | Best qualified Track I net |
|---|---|---|---:|---:|---:|
| C19 | 16,398 / **7,050** / 11,449 / 30,564 | 260,199 / 10,851 | 17,626 | **0** | $168,274.55 |
| C21 | 6,998 / **27,711** / 6,035 / 24,792 | 273,259 / 30,312 | 56,929 | **0** | $253,562.04 |
| C23 | 1,369 / **32,592** / 9,722 / 21,853 | 279,217 / 68,473 | 96,742 | **0** | $294,834.50 |
| C24 | 1,268 / **34,137** / 9,283 / 20,848 | 278,205 / 75,817 | 105,484 | **0** | $312,740.09 |
| C24 Track N (informed) | — | 262,671 / 14,914 | 14,914 | **0** above New L0's $382,721.46 (best $343,195.64) | $388,031.02 (N/original) |

At C23 and C24 the conventional DD gate removed **96% of the screen's profitable, funded proposals** (32,592 of 33,961;
34,137 of 35,405) before any of them could be refined.

### 2.2 Unbiased comparison (screens only: no search pressure)

| Cutoff | Plausible screen proposals: net p90 / max; realized max | DD-excluded screen proposals: net p90 / max; realized max |
|---|---|---|
| C19 | $58,887 / $128,421; $104,098 | $47,569 / $111,193; $82,429 |
| C21 | $136,537 / $204,053; $186,785 | $110,437 / **$236,603**; $183,434 |
| C23 | $137,524 / $208,148; $199,960 | $108,092 / **$240,154**; **$227,166** |
| C24 | $146,076 / $227,830; $227,830 | $115,357 / **$243,557**; **$233,147** |

From C21 on, the **most profitable screen proposals were DD-excluded** and could never be developed by the islands or the
refinement (an implausible centre is never feasible; island survival discards infeasible members while 32 feasible
exist). Among the fitted centres, none of the DD-excluded configurations reached the best qualified net, but that is
partly a consequence of the search itself: it only improved configurations inside the constraint. **The archives cannot
say what an unconstrained search would have found.**

### 2.3 What the excluded configurations' drawdowns were made of (88 bounded replays on their own training doors)

The highest-realized-net and the highest-net-with-tolerable-final-loss DD-excluded centres of each cutoff, the top five
DD-excluded screen proposals by realized net, and the top five Track N exclusions were replayed (`exclusions-replayed.csv`):

| Cutoff | Mean giveback share of the excluded DD | Concrete examples |
|---|---:|---|
| C19 | 31% | `rc1-026abae4b50255ac` GD0.VA0: net $129,698 (realized $122,426), DD $36,254 = $8,573 giveback + $27,682 principal; trade PL max $14,837, banked DD $26,508 — mostly a 2018 loss cluster |
| C21 | **60%** | `rc1-149254c3772baf70` GD1.VB1 (bounded): net and realized $195,969, DD **$36,634 (2020-02-19 → 03-12) = $35,841 giveback + $793 principal**, trade PL max $6,042, banked DD $7,024; `rc1-624fc0bc49ffcf37` GD0.VA0: net $248,887 (realized $170,600), DD $35,453 = **$32,922 giveback** + $2,532 principal, trade PL max $5,134, banked DD $5,086, realized DD $0; eight more GD0.VC0/GD0.VA0 variants with nets $230,713–$246,727 and DDs $35,086–$35,785, **94–96% giveback**, trade PL ≤ $6,073, banked DD ≤ $6,025 |
| C23 | 28% | the top excluded by realized net (GC1.VA0, realized $248,020–$264,423) had DDs of $35,466–$36,055 = $10,471–$12,781 giveback + **$23,275–$25,344 principal**; in the unbounded variants one Growth·VGT lot (breakout, no hold, no initial stop) bought 2018-02-27 fell **$23,318 below its principal** by 2018-12-24 and still closed **+$17,794** in 2020 — a principal-loss exposure invisible in its final net |
| C24 | 24% | `rc2-a94d927f0596b320` GB0.VB1: net = realized $264,174, DD $36,296 = $15,866 + $20,430, trade PL $20,474; Track N exclusions (`rc2-e712f7161d2dabb6` GA0.VB0, $343,196) DD $35,975 = $1,899 + **$34,077** (2022 bear cluster, banked DD $28,972) |

**Answer.** Demonstrable exclusions of the kind the brief describes **exist**: at C21 a family of configurations with
$196k–$249k of training net, single-trade principal losses ≤ $6.1k and banked-capital drawdowns ≤ $7k was rejected because
a 2018 or 2020 **open-profit giveback** pushed the marked drawdown $86–$1,634 above $35,000. They were rejected at the
plausibility/feasibility stage (fitted rung-1 centres), before any selector. Two caveats keep this from being a finding
that the gate cost profit: (1) none of them out-earned the qualified members that were kept (best $253,562 at C21); (2) in
the later cutoffs (C23, C24 and Track N) the excluded drawdowns were **mostly clustered principal losses** (72–76% of the
depth), so relaxing the conventional gate there would mainly admit more loss below principal, not protected giveback.

### 2.4 Cases where relaxing MDD would admit unacceptable account risk

Among the replayed exclusions: `rc2-ca96c96cc402c0f5` GC0.VA0 (C24 screen) DD $83,882 = $39,257 giveback + **$44,624
principal**, banked DD $44,624; `ab967f0757905f6d` GA0.VA0 (C24) DD $61,313 = **$50,376 principal**, realized DD $47,037;
`rc2-a4f9848ffd9c0de1` GB1.VD1 (C24) DD $49,901, banked DD $38,293; `rc1-03119ae45b8d71ea` GC1.VA0 (C23) DD $52,151,
banked DD $36,879. A relaxed marked-DD ceiling without principal and banked-capital limits would admit these. And a
relaxed gate admits giveback-dominated candidates whose collateral swing is still real: a $35,841 giveback at a 35% house
rate removes ≈ $23,300 of modelled maintenance excess (CANDIDATE_RISK_AUDIT §7).

## 3. A structural fact the audit exposes

On this single-slot ledger the conventional drawdown already bounds the principal metrics:

- **Trade principal loss ≤ DD (exactly, marked basis).** When lot i fills, the marked net equals the banked level R_before
  that the tracker has already seen, so peak(t) ≥ R_before and DD ≥ peak(t) − M(t) ≥ −π_i(t) for every mark of the lot.
  The liquidation basis adds only the open shares' 5 bps (≈ $50).
- **Banked-capital drawdown ≤ DD** whenever no partial sale happens while the remainder is under water (each banked level
  is a marked value the tracker has seen).

Consequence: under the $35,000 conventional gate, **a principal-loss or banked-capital gate at $35,000 is redundant** — it
can never bind. This is exactly what Stage 5 found (P2's G1/G2 removed 0 qualified members in every population; P2@25k
removed 0–3). Principal-aware gates add information only if they **replace or relax** the marked-DD gate, use a **tighter
threshold** than the DD ceiling, or are measured on **stressed paths** (gap scenarios, disjoint history, neighbourhoods).

## 4. Changing the final ranking cannot recover what was pruned upstream

- All 2,520 archived Assignment 3 members (the populations every selector sees) have centre DD < $35,000 (max $34,955);
  their only non-qualified members failed Q3, Q4 or Q5. P2b (relaxed to $50,000) could therefore only re-admit the **50**
  members that failed by drawdown alone (48 at Q3, 2 at Q5; PROTOCOL §9.4's "51" was a miscount) — and none of them became
  a primary in any population.
- Every configuration with centre DD > $35k was removed at stages 2–8, by the same rule that defines plausibility,
  feasibility, survival, promotion, refinement acceptance and the shortlist. A different final fitness or selector sees
  none of them.

## 5. What a later, separately authorized search would have to change, stage by stage

| Stage | Change required to implement a capital-and-stop-aware philosophy fairly |
|---|---|
| 1 Sampling | Keep NL0's Sobol screens and strata; add the Growth exit structure (maximum hold / initial stop) as a protected stratum so open-ended and bounded exits are both explored and compared, not filtered |
| 2 Plausibility | Replace "centre DD ≤ $35k" by a **pre-declared risk envelope**: trade principal loss (liquidation) ≤ L_t, banked-capital DD ≤ L_b, a marked-DD **cap** C_m > $35k chosen from the account-margin scenario (not deleted), a bounded-loss-exit requirement or flag; keep net > 0 and funding |
| 3 Promotion | Rank infeasible proposals by the new envelope's violation; reserve a share for low-principal-loss, high-giveback proposals so they can reach rung 1 |
| 4 Islands | Compute the detailed centre during the search (trade PL, BD, giveback, stop state — today's search runs without detail; cost below); use the envelope in constrained domination; consider (−net, −robust net, principal-tail, marked-DD-tail) as objectives instead of a single p90 marked DD |
| 5 Extension | Hypervolume against the new reference point; record progress in both marked-DD and principal-loss terms |
| 6–8 Rungs, refinement, shortlist | Feasibility by the envelope; neighbourhood statistics of trade PL and BD next to marked DD (p90, worst-10%); keep one per ledger |
| 9 Qualification | Separate gates: Q2/Q3 become the marked-DD **cap** C_m and its neighbourhood version; add principal and banked gates with their own neighbourhood tails; keep Q1, Q4, Q5 (stresses must include gap-through-stop scenarios), Q6 |
| 10 Selection | Pre-declared, versioned; stop-aware valuation only together with structure-aware risk (see SELECTOR_COMPARISON) |
| 11 Folds | Report the verdict under both the conventional ceiling and the new envelope; never change the verdict rule after seeing slices |
| 12 Final | Margin-scenario assessment as a separate account-level decision, not a fitness term |

**Cost.** The search runs without detail mode; computing the per-lot minimum marks and the banked path is already done by
the pool when `detail` is on (the extra arrays are small); the measured cost of a detailed replay plus this study's
re-marking and metrics was ≈ 0.16–0.34 s per configuration in-process (Stage 3 and 5 records), against ≈ 0.06–0.14 s per
worker-evaluation in Assignment 3's search (86–210 fresh simulations/s on 12 workers). Computing only the needed quantities inside the pool (lot minimum, banked high, open
lot state at the end) would add little; re-marking from bars (this study's verification tool) should not run inside a
search.
