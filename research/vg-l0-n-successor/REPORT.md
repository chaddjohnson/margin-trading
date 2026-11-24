# REPORT — Priority 5: comprehensive N/original successor optimization (P5-NS)

**Outcome (sealed, precommitted): NO MATERIAL IMPROVEMENT — keep N/original as the preferred research incumbent and New
L0 as the frozen benchmark.** Nothing was adopted, deployed, merged into `main` or sent to a broker. All of 2016-01-04 →
2026-10-30 is previously examined history; nothing here is prospective evidence.

Accounting basis throughout: one exclusive $100,000 slot shared by D1·VGT, D1·GDX and Growth·VGT (Growth·GDX OFF, S1
staged stops OFF, shadow eligibility OFF, calendar-day holds), 5 bps per side, 11 % simple margin interest, marked net
(realized + open lots marked); P0 = minute marked drawdown ≤ $35,000 = 35 % of the fixed initial allocation. Development
D24 = 2016-01-04 → 2024-12-31; validation 2025-01-02 → 2026-10-30 (FULL, opened once).

## 1. The question and the answer

The brief asked whether a GPU-funded, convergence-driven joint optimization — far larger than the searches that produced
New L0 and N/original — finds a **materially** stronger successor to N/original, judged by profit, downside risk,
neighbourhood robustness and chronological behaviour, with materiality defined before searching.

**Answer: no.** 44.6 million official GPU evaluations (41.0 M of them search: 2.2× Assignment 3's 18.3 M CPU search, ≈ 32× 3B's
V-structure search) with 0 budget-bound lanes found:

- **Independent search (Track F):** at every cutoff it converged — across replicate seeds, with no lane budget-bound — on
  qualified portfolios about $100,000 below the informed region at C24 (best $289,141 vs N/original's $388,031 on
  2016–2024), and the independent procedure **failed chronologically** (sequential 2020–2024 net −$35,959, drawdown
  $90,946; the 2020–21 and 2022–23 slices breached $35,000 by their own reset drawdowns, $51,066 and $54,128).
- **N/original-informed search (Track N):** 128 lanes, 8.5 M evaluations, converged next to N/original. The best
  qualified member (`C24/informed/GB.VA/R103#1 profit`) improves development net by **+$3,821** (+1.0 %), confirmation
  robust by +$8,265 and confirmation p90 DD by −$997, at the same $19,459.83 drawdown — below the precommitted materiality
  (+$10,000 / +$5,000, or −$2,500 p90 DD) — and earns exactly N/original's +$94,669.70 on 2025–2026.
- **No finalist, and none of the 1,726 qualified non-reference members at C24 (report-only check), met either
  materiality band.** The closest
  approach to the risk band was one Track N member at −$2,492 p90 DD (band −$2,500; see §6.3), unreplicated.

## 2. What was fixed, and what was searched

**Fixed (brief §1; verified in code before the freeze):** the three books, the exclusive slot and its allocator semantics
(first-come funding, refusals while a lot is open), sizing, costs, interest, stop execution, corporate actions; P0 as the
only binding risk gate; principal loss, banked-capital DD, giveback, liquidation, gaps and margin report-only. The
references reproduce their sealed results through this study's path, to the cent (E2; GPU = CPU): N/original D24
$388,031.02 / $19,459.83 / 32 lots, FULL $482,700.73 / $20,385.99 / 44 lots; New L0 D24 $382,721.46 / $19,459.83 / 34 lots,
FULL $479,605.18 / $20,385.99 / 46 lots.

**Searched:** Assignment 3's 92-gene space unchanged — 64 cells (D1 risk families A–D for GDX × VGT, each with its decline
gate OFF/ON), the family genes, the activations, and Growth 1.4.0 (8 structural, 50 numeric genes). Method: the
registered reference method NL0 1.0.0 (seeded island search over a successive-halving ladder, rung-3 shortlists,
refinement passes, qualification Q1–Q6 with selection 2 × 128 and confirmation 3 × 128 neighbourhoods, NL0's original
selection rule; standard 3.0.0, adoption without departure).

## 3. Phase A: why earlier lanes were budget-bound, and the budget that followed (`METHOD_AND_BUDGET_RECONSTRUCTION.md`)

Reconstructed from executed records: 3B's "≈ 5.83 M evaluations" were ≈ 1.28 M for the V structure; 5B's L0 arm (which
produced New L0) used 489,695 requested evaluations over 26 lanes; Assignment 3 (N/original's origin) 18.3 M over 680
lanes with 185 (27.2 %) lanes stopped by the island cap; Priority 4's GPU CTRL arm ≈ 3.6 M. The capped lanes of
Assignment 3 (142 / 185) and Priority 4 (84 / 94) were capped **only by NL0's class-coverage component** — new feasible
behaviour classes per island — not by performance gains. Hence the frozen design (PROTOCOL.md §7): NL0's trigger up to
NL0's caps, then a **second tier** in which only performance components (> 5 % gain) extend a lane, up to 16 islands;
lanes that stop with only the class component firing are labelled *coverage-limited*, never "converged"; **replicate
rounds** (≤ 4 per track and cutoff) add a seed whenever the last replicate still moved the union's hypervolume, robust
or net by ≥ 2 %; twice Assignment 3's replicates; an 80 M ceiling, a 1.5× launch rule and a disk reserve as safeguards.

## 4. Engineering and GPU (`GPU_PARITY_AND_ACCEPTANCE.md`)

GPU acceptance Phase 7 (`bb0e3fcf…`, binary gb7 `cb2ff30b…`, RTX 5090 `GPU-ae5f222c…`) VERIFIED before and after the run
(reproducible rebuild; out-of-band pin). Gates on the final code: E2 references GPU = CPU = sealed (0 differences); E3 10/10
of Assignment 3's sealed CPU lanes — including N/original's own lane — reproduced identically by this study's GPU lane
runner; E4 0 of 5,420 random/stress/removal/boundary evaluations differ; E5 determinism and resume 0 differences; E6 the
sequential statistic is a lower bound of the exact CPU minute chain; E7 142/142 unit tests; E8 full `npm test` 1,813 of
1,824 pass with only the 7 known pre-existing failures, tsc and eslint clean, 29/29 preflights, Strategy Lab parity /
build / e2e pass and its state unchanged; E9 pilot sized the budgets (0 budget-bound, 4,741 bytes per evaluation). The
official run: 29 isolated jobs, 29 attestations (every check PASS, live parity mini-set 18/18 identical), 6,883 receipt
batches, **CPU-scored 0**, Node with Maglev disabled. There was no CPU fallback.

## 5. Execution (`SEARCH_AND_CONVERGENCE_REPORT.md`)

The chain ran 2026-11-24T13:46:22Z → 22:56:27Z without failure, resume or resource-guard decision.

| | Lanes | Proposals | Islands | Refinement moves | Requested | Budget-bound |
|---|---:|---:|---:|---:|---:|---:|
| Track F, C19/C21/C23/C24 (broad + refinement) | 1,368 | 2,557,284 | 6,623 | 596,797 | 32,499,069 | **0** |
| Track N, C24 | 128 | 406,120 | 839 | 170,926 | 8,531,052 | **0** |
| Qualification, slices, validation | — | — | — | — | 3,539,319 | — |

Coverage-limited (class component only): 26.9 % of Track F broad lanes, 10.2 % of refinement lanes, 21.9 % of Track N lanes,
concentrated in cells with both decline gates ON (the largest behaviour-class space). Performance-only extension beyond
NL0's caps ran in 85 lanes (102 islands; median net gain 0.0 %, 4 islands > 5 %); no lane used more than 9 of 16 islands.
Replicate rounds fired twice at C19 (hypervolume +4.2 %, then net +7.0 %) and stopped at R106; every other track
converged across seeds in its first round (+0.03 % to +0.80 %). More islands and more seeds were available and were not
needed: **the search was not compute-limited.**

## 6. Results

### 6.1 Track F — the independent procedure (`CHRONOLOGICAL_VALIDATION.md`)

| Cutoff | F primary (training) | N/original on the same door | Next slice: F primary P&L / reset DD | Training neighbourhood breaches: training → slice |
|---|---:|---:|---:|---|
| C19 | $178,920 / $24,891 | $80,437 / $10,691 | **−$31,152 / $51,066** (2020–21) | 5.1 % → 88.3 % |
| C21 | $268,206 / $20,277 | $251,839 / $17,281 | **−$5,132 / $54,128** (2022–23) | 3.1 % → 99.6 % |
| C23 | $286,928 / $27,370 | $343,921 / $19,460 | +$475 / $18,783 (2024) | 5.5 % → 0.0 % |
| C24 | $289,141 / $28,508 | $388,031 / $19,460 | +$31,010 / $34,380 (2025–26) | 4.7 % → 18.0 % |

Sequential 2020–2024 (frozen verdict): F/original **unsupported** (−$35,958.68, DD $90,945.51); the L and B secondary
procedures also unsupported (+$60,257 / $44,257; −$70,407 / $93,378). The CPU exact minute chain (report-only) confirms
every figure (GPU statistic a lower bound by $67–$319). Consequence: Track F's C24 selection carries "no chronological
support: not a deployment-qualified candidate without an explicit user decision". The pattern is Assignment 3's, the
walk-forward diagnostic's and Priority 4's: the independent search fits each training window well and its local
stability does not transfer to the next regime.

### 6.2 Track N and the C24 selection (`FINAL_CANDIDATES.md`)

The C24 selectable set (U = F ∪ N, 1,728 qualified of 1,761) has the formal primary `C24/informed/GB.VA/R103#1 profit`
(`rc2-781a682c6f6d6ae2`; GB1.VA1): development $391,852.16 / $19,459.83, confirmation robust $201,276, p90 DD $27,015.
40 finalists (primaries, roles, the best qualified member of every D1 family pair in each track) plus the two references.
Against N/original (same instrument, same draws), the precommitted successor test (PROTOCOL.md §12) gives **no candidate**
for either type:

| Best on… (qualified C24 members) | Member | Δ centre net | Δ conf. robust | Δ conf. p90 DD | Δ centre DD | Meets |
|---|---|---:|---:|---:|---:|---|
| Centre net | `C24/informed/GB.VA/R103#1 profit` | **+$3,821** | +$8,265 | −$997 | $0 | — (P needs +$10,000) |
| Robust, profit non-inferior | `C24/informed/GA.VD/R107#1 profit` | +$2,607 | **+$10,708** | −$952 | $0 | — |
| p90 DD, profit non-inferior | `C24/informed/GD.VD/R102#3 balanced` (not a finalist) | +$657 | +$7,642 | **−$2,492** | $0 | — (R needs −$2,500; single replicate) |
| Track F centre net | `C24/refine/GA0.VB1/R102#1 profit` | −$98,890 | −$24,846 | +$5,488 | +$9,048 | — |

117 qualified Track N members exceed N/original's development net, by at most $3,821; the informed region is a flat
plateau, and Track N's eight seeds and 16 family-pair projections returned to it every time.

### 6.3 The near-miss on the risk band, disclosed

`C24/informed/GD.VD/R102#3 balanced` (`rc2-aee286641ff82a5e`, GD1.VD1) reduced the confirmation p90 drawdown by
$2,492.31 — $7.69 short of the $2,500 risk band — at +$657 centre net, +$7,642 robust and the same centre drawdown. It is
not a finalist under the frozen definition (not a role holder, not its pair's best by net), it is a single-replicate
result (the next-best member reduces p90 DD by only $1,573, so criterion (d) could not hold), and it was never evaluated
on 2025–2026. Under the precommitted rule it is not a successor, and the band is not moved after the fact. Evaluating it
on FULL now would be validation-driven iteration and was not done.

### 6.4 Validation on 2025–2026 (opened once, after the sealed frozen selection)

| | Validation P&L / reset DD | Full history net / DD |
|---|---:|---:|
| U primary | $94,669.70 / $20,385.99 | $486,521.87 / $20,385.99 |
| **N/original** | **$94,669.70 / $20,385.99** | **$482,700.73 / $20,385.99** |
| New L0 | $96,883.72 / $20,385.99 | $479,605.18 / $20,385.99 |
| I1 (Priority 4's sealed record; S1-enabled) | $102,353.23 / $20,385.99 | $494,374.00 / $20,385.99 |
| F primary | $31,010.33 / $34,380.49 | $320,150.86 / $34,380.49 |

All Track N finalists (19/19) pass V1–V3 (median $92,661); 15 of 21 Track F finalists pass. The U primary's 2025–2026
path equals N/original's to the cent: its whole development advantage comes from 2020–2022.

## 7. The distinctions the brief requires (§7)

| Distinction | Finding |
|---|---|
| Search improvement vs a change of evaluation basis | Every comparison is on one instrument: the same doors, the same neighbourhood seeds and draws, the references reproducing their sealed figures to the cent. The +$3,821 is a genuine search improvement on that basis — and immaterial. I1's figures are on Priority 4's EXP instrument (staged genes perturbed) and are shown, not compared by the rule. |
| Numerical parameter improvement vs a new funded-trade chronology | The U primary has N/original's lot counts by book (18 / 7 / 7), identical annual results outside 2020–2022 and an identical 2025–2026 path: a parameter refinement of the same chronology. Track F's finalists are genuinely different chronologies (different families and occupancy 79 % vs 63 %) — and weaker. |
| Realized vs unrealized | Track N's and the references' development profit is 100 % realized (no lot open at 2024-12-31); the F primary's includes $19,342 of open marks (6.7 %). |
| Centre vs robust profit and tails | The U primary gains on all of centre (+$3,821), robust (+$8,265) and p90 DD (−$997) — all small. The only distinct tail trade-off is N's robust-profit holder (−$4,838 p90 DD, +$47,963 robust, but −$19,249 centre and −$31,929 on 2025–26). |
| Historical gain vs independent prospective evidence | None of this is prospective. Track N has no independent chronological test by construction (seeded from N/original, itself chosen with 2016–2024 in view); 2025–2026 was inspected by Assignment 3 and Priority 4 before. Track F, which does have a chronological test, failed it. |
| Search progress from compute vs research overfitting | Compute bought convergence evidence (0 budget-bound; seeds agree), not a better region. Where it found more training profit (Track F at C19 and C21, $98k and $16k above N/original on their training doors) the gain was overfitting: the next regime lost money with 1.5× the drawdown ceiling. |

## 8. Risk (`ROBUSTNESS_AND_RISK.md`; report-only)

The informed region shares one risk profile: development DD $19,459.83 (19.5 % of the allocation), worst lot MAE −$8,047,
trade principal loss $8,093 and banked-capital DD $10,384 (liquidation basis), largest giveback $11,812 (19 % of that lot's
peak profit), every stressed DD (0–20 bps, 14 % interest, slippage, next-open stops) ≤ $20,036, no neighbourhood breach at
half radius, 5–6 % at 1.5× (New L0 15 %), and 2025–26 reset DD $20,386. The U primary is marginally lighter on the confirmation tail
(breaches 0.8 % vs 2.1 %) and removes D1·VGT's protective stop (family A + decline gate) — its one-lot VGT worst case is
then bounded only by the 13-day hold. The independent region carries heavier tails (5.5 % breaches; 29 % at 1.5×), long
Growth holds (838 days) and a 42 % giveback on one Growth lot. A margin scenario with explicit collateral assumptions is
in `ROBUSTNESS_AND_RISK.md` §6; fixed-slot results do not guarantee margin safety at any broker.

## 9. Recommendation (brief §7: option 2)

**Keep N/original as the preferred research incumbent (challenger) and New L0 as the frozen benchmark.** No successor
worthy of consideration exists under the precommitted criteria; the formal C24 primary is a +1 % numerical refinement of
N/original with no independent support and no difference on the inspected 2025–2026 window. Another budget expansion of
this search space is not recommended: the search converged and the independent procedure's failure is chronological, not
computational. Distinct next hypotheses for the user to consider (none started): (a) a prospective, pre-registered
paper/shadow record of N/original and New L0 from 2026-11 onward — the only source of genuinely new evidence; (b) a new
protocol studying why independently selected D1 parameters break across the 2020 → 2022 regime change (regime-conditional
gating), judged first on its chronological procedure test.

## 10. Limitations and disclosures

- All data 2016-01-04 → 2026-10-30 had been examined by earlier studies; the folds are retrospective procedural tests;
  2025–2026 is not a holdout. Track N's seed (N/original) was selected with 2016–2024 in view.
- The sequential drawdown is the GPU statistic AD4 (a lower bound of the exact minute chain, gap ≤ $319 here); the
  verdicts do not depend on it (the slices alone breach).
- Neighbourhood breach shares are frequencies over a fixed instrument, not probabilities of future loss. Tail stresses use
  daily bars and same-period proxies (no disjoint pre-2016 data).
- The successor bands ($10,000 / $5,000 / $2,500) are judgements fixed before searching (PROTOCOL.md §12); one member
  approached the risk band within $8 (§6.3).
- Engineering disclosures: E5's first resume refused by the archive's code-digest binding (rerun on the final code); the
  pilot and E3 shared the GPU (throughput figures are planning figures); the regression chain's first preflight call had a
  usage error (rerun 29/29 PASS); early checkpoint times were estimates, corrected to clock times.
- Job archives (196.0 GB of the 218.6 GB under `research/vg-l0-n-successor/cache/`, hashed in `reports/diagnostics/job-archives.sha256`)
  are kept uncompressed on Apollo for your review.
