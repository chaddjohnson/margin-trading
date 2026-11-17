# REPORT — Assignment 3: New L0 risk-aware successor, full joint optimization

Research only. Nothing was adopted, deployed, merged into `main` or used to replace New L0; no production setting changed;
no broker was touched. **DD** = the maximum minute drawdown of the marked net on the fixed $100,000 principal; the research
ceiling is $35,000 (a criterion on historical paths, **not** an enforceable loss limit). Every figure comes from sealed
records (`results/seals.jsonl`, 47 records, all verifying) and sealed report-only diagnostics; full tables are in
`results/tables/` (no visuals, standard §7.7). All of 2016-01-04 → 2026-10-30 is **previously examined history**: the
folds are retrospective procedural tests and 2025–2026 is previously inspected validation history, not a pristine holdout.

## 1. Bottom line

**No qualifying successor.** New L0 stays the reference; it was reproduced to the cent (FULL $479,605.18 / $20,385.99 /
46 lots; development $382,721.46 / $19,459.83; validation +$96,883.72).

- **For the first time in this programme an independent procedure is chronologically supported: L/RA1** (New L0's legacy
  D1 mechanics, all three phenotypes searched fresh, Assignment 2's unchanged RA1 selector): sequential 2020–2024 net
  **+$40,600.52**, sequential DD **$31,318.53** (2020-02-19 → 2020-03-12), $3,681 inside the ceiling. Its frozen C24
  primary is nevertheless **not** a successor: New L0 dominates it on development ($232,895.18 / $27,219.95 against
  $382,721.46 / $19,459.83; also on the confirmation pair), and it **failed V2 and V3** on 2025–2026 (reset validation DD
  $35,071.88, whole-run DD $47,493.73) through one carried Growth·VGT lot with no maximum hold and no initial stop.
- **RA1 beat NL0's original rule on identical populations in all three Track I populations** (frozen label "risk
  improvement": sequential DD −$21,212 / −$72,147 / −$71,249 and net +$23,951 / +$128,655 / +$124,327 in L / B / F). It
  worked by excluding fold primaries that carried large open lots at the cutoff (screens S1, S2) and, inside the 5% band,
  preferring lower occupancy. But F/RA1 still breached in 2022–2023 ($38,874 slice DD; sequential $46,435.28), so only one
  of the four main procedures is supported.
- **Optimizing Growth jointly did not produce a better independent region than New L0.** At C24 the independent Track I's
  best qualified member reached $312,740.09 / $20,490.62; the incumbent-informed Track N reached $388,031.02 / $19,459.83
  — essentially New L0 with small D1 changes and inert or near-inert controls (**informed advantage $75,290.93**, H2 true),
  even though Track N used 1.30× Track I's requested evaluations, not more search per lane. The informed finalists improve
  New L0's *neighbourhood* tail (confirmation worst-10% mean DD down to $25,721 from $34,808) while keeping its centre
  behaviour, but they have **no independent chronological test**.
- **The protective stops and their activation did no work at any C24 primary** (removing a stop or switching its
  activation changed nothing); the hold policies, the decline gate's K and **Growth's own exit structure** did. The
  study's clearest new risk finding is that **Growth·VGT's genome itself permits unbounded exposure** (no maximum hold,
  no initial stop, a trailing stop that only protects gains): it caused F/RA1's 2022–2023 breach and L/RA1's 2025 breach.

| | New L0 (frozen; informed) | Asg 2 F/RA1 (Growth frozen, conditional) | **L/RA1** (independent; supported) | F/original (independent) | F/RA1 (independent) | N/original (informed) | N/RA1 (informed) |
|---|---:|---:|---:|---:|---:|---:|---:|
| C24 primary | — | `GD0e.VC0` | `GA0.VA0` (`R2#6`) | `GD1.VC1` | `GB0.VB1` | `GD1.VB0` | `GB0.VD1` |
| Development net / DD | **$382,721.46** / $19,459.83 | $347,171.73 / $17,744.39 | $232,895.18 / $27,219.95 | $312,740.09 / $20,490.62 | $302,438.48 / **$17,280.74** | **$388,031.02** / $19,459.83 | $376,152.28 / $19,459.83 |
| Conf. p90 / worst-10% mean DD (384) | $30,658.22 / $34,808.11 | (other instrument) | $31,048.35 / $32,257.07 | $30,104.44 / $33,576.02 | $24,293.60 / $26,340.78 | $28,012.00 / $31,604.90 | **$23,187.49 / $25,721.05** |
| Worst per-lot MAE (development) | −$8,046.67 | −$4,857.05 | −$9,099.85 | −$7,286.60 | −$7,639.01 | −$8,046.67 | −$8,046.67 |
| Procedure's sequential 2020–2024 | (fixed, descriptive) $302,751.28 / $19,459.83 | $100,002.36 / $39,855.06 | **$40,600.52 / $31,318.53** | −$50,121.09 / $117,684.72 | $74,206.21 / $46,435.28 | no independent test | no independent test |
| Chronological verdict | none (informed) | unsupported (conditional) | **supported** | unsupported | unsupported | none (informed) | none (informed) |
| 2025–2026 (examined) P&L / reset DD | $96,883.72 / $20,385.99 | $92,950.76 / $22,615.51 | $25,801.56 / **$35,071.88** | $62,988.08 / $25,353.98 | $48,787.40 / $19,060.23 | $94,669.70 / $20,385.99 | $93,646.20 / $20,385.99 |
| Full history 2016–2026 net / DD | $479,605.18 / $20,385.99 | $440,122.49 / $22,615.51 | $258,696.74 / **$47,493.73** | $375,728.18 / $25,353.98 | $351,225.88 / $19,060.23 | **$482,700.73** / $20,385.99 | $469,798.48 / $20,385.99 |
| Status | reference | research-only | dominated by New L0; fails V2/V3 | research-only | research-only | informed; no independent test | informed; no independent test |

## 2. Engineering readiness (brief §1; `TEST_REPORT.md`)

- **New L0 exactly** through this study's path on FULL and D19–D24 (books, lots, 79 funding decisions, 547,753 minute
  marks, the foundation's sealed trade-list, funding and mark hashes); IJ1, C4 and C4-refined reproduce 5B's sealed D24
  nets. **RC 1 unchanged** (Assignment 2's frozen closure; 96 random next-session full-joint configurations = RC 1;
  40 legacy = Priority 3). **Entry-day activation** re-derived from the bars (53 exits, 160 pre-fill lows ignored).
  **Growth's genes reach the engine:** 44 random Growth genomes match the canonical Growth 1.4.0 path; every one of the 50
  numeric genes and 7 optional rules changes the engine's parameters in every sampled context and its trades or decision
  log in at least one. **Causality, accounting, determinism and worker/restart reproducibility** hold; prior digests are
  unchanged. Stage V: **0 failed of 18,091 checks**. Full suite: 1,654 tests, the 7 known pre-existing failures only.
- **Synthetic gaps:** −10/−20/−30% opens through an 8% stop fill at the gapped open in families B, C, D and both
  activations (loss ≥ the gap); a −30% gap through a 25% stop loses 30%; a halt fills at the first trade after it. **A
  protective stop is not a loss cap.**
- **Disclosed revision before the freeze (AMENDMENTS R1):** stage V's Growth-causality gate was redesigned after its first
  dry runs (a provisional one-step threshold and an incomplete fill fingerprint); the sealed gate checks parameter reach
  in every context and trade-or-log reach in at least one. Several Growth genes (the reset/renew eligibility levels,
  some continuation inputs) are searched but almost inert on this history.

## 3. Design and executed budget (brief §2–§3)

- **Cells:** 64 = 4 × 4 D1 families × 2 × 2 decline gates; the stop activation is a per-book categorical gene; Growth·VGT's
  complete genome (8 structural + 50 conditional) free in every lane; Growth·GDX OFF; shadow-entry eligibility OFF;
  calendar-day holds. Every cell got the identical Track I budget at every cutoff (NL0's V-cell schedule × 2 replicates)
  with balanced strata (activation × K × Growth stratum; every factor level within one of every other).
- **Track I** (independent, every cutoff): 128 broad lanes + 26 stage-2 refinement lanes (13 cells × 2, frozen rule)
  per cutoff. **Track N** (informed, C24): 64 lanes (16 family pairs × 4 replicates), seeds = New L0, IJ1, C4, C4-refined
  projected through the precommitted control grid; R_N = 4 by the frozen rule (§8.3).
- **Executed** (`results/tables/budget.md`): 680 lanes, **1,303,708 proposals**, 3,302 islands, 2,152 refinement starts
  and 366,927 moves; **18,265,213 requested** and **17,533,469 unique fresh** search simulations (722,891 archive hits,
  0 retries) plus 1,644,899 qualification simulations; chain wall time 44 h 24 min (2026-11-15T13:27Z → 2026-11-17T09:51Z);
  ≈ 210 (C19) to 86 (Track N) fresh/s; peak 19.0 GiB in `vgl0fj.slice`; no OOM, no restart.
- **The resource-guard bottleneck is gone:** **0 lanes** stopped by the resource guard (Assignment 2: 117–155 per cutoff).
  Lanes still **budget-bound** at NL0's island cap (a trigger still firing; not converged): 33 (C19), 47 (C21), 42 (C23),
  49 (C24 Track I) of 154 per cutoff, and 14 of 64 in Track N. More islands might still have helped those lanes.
- **Replicate noise** (|best qualified net R1 − R2| per cell): median $5,953 / $13,083 / $16,762 / $23,858 and p90
  $18,962 / $28,309 / $42,999 / $46,538 at C19 / C21 / C23 / C24 — larger than Assignment 2's ($9–16k median), as expected
  with Growth free.
- **Against the references:** per cell and replicate the broad lane equals NL0's V cell; the study's requested search is
  37× NL0's effective L0-arm budget (489,695) and its proposals 26× (49,346); 3.1× Priority 3B's evaluations (5.83 M);
  about half of Assignment 2's 34.2 M (Growth simulation roughly halves throughput).
- **Track I versus Track N at C24** (`results/tables/tracks.md`): Track I 154 lanes, 282,612 proposals, 747 islands,
  414 starts / 66,922 moves, 3,183,402 requested; Track N 64 lanes, 196,640 proposals, 403 islands, 448 / 92,677,
  4,142,217 requested. The pilot-sized rule assumed 34 refinement lanes; the frozen plan chose 13 cells (26 lanes), so
  Track N ended at 1.30× Track I's requested evaluations and 0.70× its proposals. Equal effort is claimed in no unit.

## 4. Chronology and the consequence (brief §5; `results/tables/sequential.md`)

Every fold selection was sealed and committed before its slice opened (C19 `cdd37dc2`, C21 `a8b9e2f4`, C23 `41db5e2d`).
Every Track I verdict is **independent** (all three phenotypes searched fresh from each cutoff's door; Assignment 2's
"conditional" caveat removed).

| Procedure | Verdict | Sequential net | Sequential DD | 2020–21 slice | 2022–23 slice | 2024 slice |
|---|---|---:|---:|---|---|---|
| L/original | unsupported | $16,649.15 | $52,530.30 | $21,360 / $52,530 | −$6,230 / $24,180 | $1,719 / $14,569 |
| **L/RA1** | **supported** | **$40,600.52** | **$31,318.53** | $54,211 / $31,319 | −$16,247 / $23,351 | $2,837 / $12,900 |
| L/RA2 | unsupported | $26,928.52 | $60,311.75 | $21,360 / $52,530 | $3,949 / $60,312 | $1,719 / $14,569 |
| B/original | unsupported | −$29,331.84 | $114,794.33 | $4,018 / $51,554 | −$31,478 / $65,006 | −$1,672 / $18,820 |
| B/RA1 | unsupported | $99,323.64 | $42,647.60 | $86,118 / $22,836 | $11,770 / $35,416 | $1,586 / $13,096 |
| B/RA2 | unsupported | $61,451.19 | $45,371.19 | $86,118 / $22,836 | −$22,845 / $35,945 | −$1,672 / $18,820 |
| F/original | unsupported | −$50,121.09 | $117,684.72 | −$16,771 / $62,514 | −$31,478 / $65,006 | −$1,672 / $18,820 |
| F/RA1 | unsupported | $74,206.21 | $46,435.28 | $86,118 / $22,836 | −$3,653 / $38,874 | −$8,109 / $15,151 |
| F/RA2 (secondary ablation) | supported | $93,717.10 | $22,835.97 | $86,118 / $22,836 | $9,421 / $19,112 | −$1,672 / $18,820 |

- **Consequence (frozen, standard 2.2.0 default):** every unsupported procedure's selection is "no chronological support:
  not a deployment-qualified candidate without the user's explicit decision"; Track N and U selections are
  "incumbent-informed; no independent chronological test". L/RA1 is supported; F/RA2 is supported but RA2 is a secondary
  ablation that never nominates (frozen rule).
- **How many adverse events support this:** two breaking regimes (the 2020 crash, the 2022 bear) in one examined history,
  and 2024 carried almost no D1 activity. L/RA1's support rests on its 2020 slice staying $3,681 under the ceiling.
- **Training neighbourhoods on the next slice** (§5.9): C19 primaries breached on 2020–21 in 12–100% of their selection
  draws (training ≈ 0–4%); local stability did not transfer. The fixed New L0 control's path is descriptive only ($302,751
  / $19,460 — chosen with this history in view).

## 5. NL0's original rule versus RA1 on identical populations (brief §4; `results/tables/selection.md`)

Both rules saw the same qualified members and the same cutoff evidence; neither ordered a simulation.

| Comparison (frozen labels, band $2,500) | Label | Δ sequential net | Δ sequential DD |
|---|---|---:|---:|
| RA1 vs original, L | **risk improvement** | +$23,951.37 | −$21,211.77 |
| RA1 vs original, B | **risk improvement** | +$128,655.48 | −$72,146.73 |
| RA1 vs original, F | **risk improvement** | +$124,327.30 | −$71,249.44 |
| F vs L, original (mechanics) | profit sacrifice without clear benefit | −$66,770.24 | +$65,154.42 |
| F vs L, RA1 (mechanics) | mixed | +$33,605.69 | +$15,116.75 |
| F/RA1 vs L/original (combined) | mixed | +$57,557.06 | −$6,095.02 |
| RA2 vs RA1, F (secondary) | mixed | +$19,510.89 | −$23,599.31 |

- **Why they differ.** At C19 and C21 the original rule's L and F primaries **failed screens S1 and S2** (a carried open
  lot above 1.50× its principal holding more than 25% of the training net); RA1's primaries passed every screen and had
  lower occupancy (C19 F: 86% vs 93%; C21 F: 69% vs 90%), sometimes with a *higher* conservative net. At C23 the original's
  L primary failed S4. The original's primary ranked 2nd to beyond 10th under RA1. This is exactly the carried-exposure
  mechanism the walk-forward diagnostic described; RA1 was designed after that diagnostic examined 2020–2023, so the
  result is retrospective and does not show that RA1 generalizes (standard §3.4).
- **RA1 is not sufficient.** Its screens see only the cutoff close and the training lots: F/RA1's C21 primary entered one
  Growth·VGT lot in 2022 (no maximum hold, no initial stop) whose adverse excursion reached −$36,254 and which stayed open
  through 2023 — invisible to S1–S4 at the cutoff.
- **The new mechanics did not help under the original rule** (F vs L "profit sacrifice without clear benefit"), and under
  RA1 the F population's extra breadth gained net but also DD ("mixed").

## 6. C24, the frozen selection and the validation

- **Frozen before FULL opened** (`FROZEN_SELECTION.json`, `1370534e`): 48 finalists (every population × selector primary,
  every population's NL0 roles, the best qualified member of each D1 family pair per track, the four incumbents) and the
  successor determination. L/RA1's primary was "chronologically supported but dominated by New L0 on development: not a
  qualifying successor"; every other Track I procedure "no chronological support"; N and U "incumbent-informed; no
  independent chronological test". **No procedure reached condition (d)**, so "no qualifying successor" was fixed before
  the validation.
- **Validation (FULL, once, `4063ea52`):** New L0 reproduced exactly; **43 of 48** finalists passed V1–V3. The five that
  failed: both legacy-cell primaries (L/original and L/RA1: reset DD $35,071.88, whole-run DD $51,408 / $47,494, the April
  2025 decline on the same Growth·VGT lot carried from 2024-10-30), `GA0.VD0` (the B/F robust-profit role; reset DD $42,104), `GB0.VD1` broad (whole
  run $37,164) and `GC0.VC1` (2025–26 −$2,234). The best full-history results are Track N's (`GD.VA` R4 $489,066.52 /
  $20,878.45; `GD.VD` R4 $487,937.45; N/original $482,700.73 / $20,385.99) — informed, on examined history, never a
  qualification.

## 7. What did the work (ablations, `results/tables/ablations.md`; structures, `results/tables/structures.md`)

- **Protective stops and activation:** at every C24 primary, removing the stop or switching its activation left the result
  unchanged on development and FULL. Stops of 6.5–20.2% were essentially never reached in the selected configurations; they
  are untested insurance on this history (and the tail stress shows fills up to 6.9 points beyond the level on gap days).
- **Holds and gates:** F/original's disabled VGT hold matters (reverting it lifts DD to $41,015); its GDX K − 1 costs
  $21,775. N/original's +$5,310 over New L0 comes mostly from its GDX decline gate (removing it: −$4,956); its Growth is
  behaviourally New L0's.
- **Growth parameters:** L/RA1's C24 primary uses a breakout Growth with no maximum hold, no initial stop and retention;
  with Growth frozen at New L0's its full-history DD would have been $27,220 instead of $47,494. Across C24 Track I, 263
  of 513 qualified members had Growth's maximum hold OFF and 150 also had no initial stop.
- **F/RA1's C24 primary** is behaviourally legacy (every control ablation identical): its development advantage over New
  L0's DD comes from different D1 and Growth parameters, not new mechanics.
- **Selected structures:** fold primaries came from every D1 family (A, B, C, D on GDX; A, B, C, D on VGT), both gate
  states and K 1–4; independent Track I favoured breakout Growth (204 of 513 qualified at C24), informed Track N kept New
  L0's Rise · gate · eligibility structure. No family can be pruned on this evidence; differences sit inside replicate
  noise.

## 8. Exposure, stress, tail and episodes (brief §5.3; `results/tables/exposure.md`, `tail.md`, `episodes.md`, `stresses.md`)

- **Cutoff exposure:** the C24 primaries carried no lot over 2024-12-31 except the legacy-cell primaries (one Growth·VGT
  lot at 1.03× its principal, 0.3% of the training net) — whose give-back then went from +$645 to −$30,329 (2025-04-07)
  before exiting at +$5,675 (2026-02-09).
- **Holding times:** Growth·VGT lots of the legacy-cell primaries were held up to 656 days ($39,766 interest); F/original's
  disabled-hold VGT book held at most 74 days. Interest drag of the primaries on development was $57–67k (New L0 $62,112).
- **Stresses:** at 0/10/20 bps, 14% interest, +25 bps stop slippage and next-open stops, the C24 primaries' development
  DDs stayed below $35,000 (the largest stressed full-history DD among all finalists was $51,693 at 20 bps).
- **Tail stress (in-sample stress, same-period proxies, synthetic gaps; daily-bar approximation):** an unprotected
  $100,000 D1 lot over its hold window lost at worst $22,855–$37,212 in sample (every worst window opening January–March
  2020) and up to $50,834 on the GDXJ proxy; protected books lost at worst $12,765–$23,870 with fills up to 6.87 points
  beyond the stop (2020-03-12); synthetic −30% gaps lose ≈ $30,070 whatever the stop distance.
- **Episodes:** the selected primaries' 2020-crash DDs were $17,281–$23,799 on development; their 2022-bear DDs
  $11,942–$27,220.

## 9. Answers to the brief's questions (§6)

1. **Does optimizing Growth jointly help beyond Assignment 2's frozen-Growth results?** Mixed and not as a successor: it
   turned L/RA1 from unsupported (+$32,750 / $77,845) into supported (+$40,601 / $31,319) and made F/RA2 supported, but
   made F/RA1 worse (+$74,206 / $46,435 vs +$100,002 / $39,855) and F/original worse; no independent C24 primary came near
   New L0's development net (best $312,740), and the free Growth genome introduced unbounded-hold exposure that caused two
   of the decisive breaches.
2. **Independent vs informed?** The informed search retains a large advantage from the preselected incumbent ($75,291 at
   C24, in every one of the 16 family pairs); the independent search found a different, lower-profit region (breakout
   Growth, different D1 vectors) that is not more robust on the next slices.
3. **Does RA1 improve selected outcomes on identical populations without leakage or threshold changes?** Retrospectively
   yes — "risk improvement" in L, B and F with unchanged thresholds and the same evidence — by screening out carried
   exposure; but it was designed after these slices were examined, and it could not see exposure taken after the cutoff.
4. **Which structures were selected?** Every D1 family, both gate states, K 1–4, both activations and every Growth stratum
   appear among qualified members and fold primaries; RA1's supported procedure is the legacy cell; independent searches
   favour breakout Growth; informed searches stay on New L0's Growth. Activation never mattered at a primary.
5. **One hold, one rebound, or unrealized exposure?** The 2020 rebound dominates training profit (42–66% of the C21 and
   C23 fold primaries' training nets); the decisive failures
   came from single long Growth·VGT holds (2022, 2025) and, under the original rule, from carried open lots at the cutoffs.
6. **How many paths meet the ceiling?** 2 of 9 Track I procedures (L/RA1 and the RA2 ablation F/RA2); breaches came from
   the 2020 crash (L/original, B/F original) and the 2022 bear (B/RA1, F/RA1 via one Growth lot, L/RA2).
7. **Is any finalist robust and qualified enough to warrant consideration?** None qualifies. Compelling research
   candidates, kept separate and **never nominated**: L/RA1's procedure (the only supported main procedure; its C24
   primary fails on 2025); Track N's `GD1.VB0` and `GB0.VD1` (New L0's region with lower neighbourhood tails; no
   independent test).

## 10. Assignment 3 conclusion and implications

**No qualifying successor.** New L0 remains the reference and is untouched. Practical implications:

- **Keep New L0.** No candidate dominates it with independent chronological support; the informed variants match it at the
  centre and only improve its *local* neighbourhood tail, which is not chronological evidence.
- **RA1 is the better of the two selectors on this history**, and the first supported independent procedure used it; it is
  still an experimental arm (designed after examining 2020–2023), not a validated permanent primary.
- **Growth's exit structure is a risk gap.** Configurations with Growth's maximum hold OFF and no initial stop can carry a
  single lot through a whole bear market; any future search should either report that exposure explicitly in selection or
  bound it by a precommitted design choice (a user decision, not a post-hoc change here).
- **Next step (recommendation):** a separately authorized **prospective paper/shadow comparison** of New L0, L/RA1's
  procedure and the Track N candidates `GD1.VB0` / `GB0.VD1` from a future freeze date (precedent
  `research/prospective-b4-b5-shadow/`); new market observations, not more search on 2016–2026, are what is missing. No
  monitoring was scheduled, no order was created and no prospective evidence is claimed here.

## 11. Limitations and disclosures

- One examined history; three correlated slices; two breaking events. L/RA1's support has a $3,681 margin on one path.
- RA1's thresholds were designed after the walk-forward diagnostic examined these slices (used unchanged).
- 171 of 616 Track I lanes and 14 of 64 Track N lanes were budget-bound at NL0's island cap (not converged).
- Track N used 1.30× Track I's requested evaluations at C24 (13 refinement cells instead of the 17 the sizing assumed).
- No disjoint pre-2016 data (AD11): the tail stress is in-sample, same-period proxy and synthetic; daily-bar.
- A protective stop is not a loss cap; minute bars do not order prices inside a minute; latency and queues are not modelled.
- Pre-freeze revisions R1 (stage V's Growth gate) and R2 (pilot figures, a pilot-only guard fix); no post-freeze
  amendment; stage V's dry runs opened FULL for New L0 under legacy defaults only (AD3); the full test suite reads whole
  data files and feeds no decision.

## 12. Repository status

| Item | State |
|---|---|
| Branch | `research/vg-l0-full-joint` from `73d3a748` (Assignment 2's verified tip; contains `main` = `108c241b`) |
| Sealed stages | stage V `bcc166d4`; freeze `2a56e9b6`; C19 `cdd37dc2`/`3d489a73`; C21 `a8b9e2f4`/`96286b77`; C23 `41db5e2d`/`5ca7cf3f`; sequential `7ecf9a68`; C24 `a3131048`/`619cdcce`/`39db58e4`; frozen selection `1370534e`; validation `4063ea52` |
| Not merged into `main` | everything: `src/vg-l0-full-joint/`, `tools/vg-l0-full-joint/`, the study directory, the `vg-l0fj` npm script (and Assignments 1–2's unmerged modules) |
| Frozen work | RC 1/RC 2, Assignment 2, NL0, the standard (2.2.0) and every earlier study untouched; Priority 3/5B/shadow/Assignment 2 digests unchanged |
| Tests | 1,654: 1,643 pass, 4 skipped, the 7 known pre-existing failures; module tests 177/177 |
| Data | no data acquired or purchased; no broker access |
