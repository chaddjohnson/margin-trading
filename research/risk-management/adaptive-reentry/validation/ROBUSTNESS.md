# Validation stage 1 — robustness and independent verification of the standalone Promising candidates

Scope: the seven standalone Promising configurations plus the REF_lower3 anchor, per the validation
brief. G-stage combinations are NOT covered here; they will be validated in a follow-up after the
coordinator launches Family G. Everything here was produced inside `validation/` with the frozen
engine/framework/data; every configuration (candidates re-run, all 44 sensitivity grid points) was
registered in `validation/registry.jsonl` before evaluation.

Candidates (semantics copied from the family sources, cited in `strategies.py` / `replay_verify.py`):
A2_material_05, A2_material_1 (loss-classification), D7_tiny_loss_exit_anchor
(recovery-opportunities), B7_stall, B2_inverse (adaptive-discounts), C6_retrace_38, C11_graduated
(recovery-resets), REF_lower3 (anchor).

Outputs: `results/replay/replay_verification.txt` (task 1), `results/` runner tree +
`results/sensitivity_tables.md` (task 2), `data/` + `results/fresh/` (task 3),
`results/episode_consistency.md` (task 4).

---

## 1. Independent replay verification — ALL CANDIDATES PASS

Method (modeled on `lower-price-reentry/verify.py`): for each candidate on all four frozen datasets
the full restriction history was re-derived from ONLY the raw price file, the candidate's registered
rule definition (re-implemented in `replay_verify.py`, framework decision code never imported), and
the family's results trades CSV; then asserted against the family's events/states CSVs.

**36,238 checks passed; zero mismatches across all 32 (candidate × dataset) replays.** Specifically,
for every candidate and dataset:

- every restricted entry satisfied the candidate's level rule (or, for D7, its registered alt-entry
  rule — entry-path labels match the events log exactly), and no entry fell on a session whose close
  satisfied the reset (reset priority intact);
- every reset satisfied the reset rule and no earlier session of the episode satisfied it (forward
  scan plus an independent second pass per episode);
- frozen values (loss exit, losing entry, ref high, loss, price return) are correct at arming and
  constant within each episode;
- every flat, unrestricted, non-exit session with the 10% signal has an entry (the rule is the only
  source of suppression);
- trade spans are disjoint and no entry occurs on an exit session;
- A2's declined triggers (losses above the cutoff) leave no episode, exactly matching the family logs.

Episode counts replayed, e.g. QQQ_1999_2015: REF 41, A2_05 36, A2_1 33, D7 45 (11 alt entries),
B7 43, B2 47, C6 45, C11 45 — all equal to the family events files. In addition, the validation
re-implementations of all seven candidates reproduce the family trades **identically on all four
datasets** when run through the framework (center-point cross-check in
`results/sensitivity_tables.md`), closing the loop in both directions.

Verdict per candidate: **no finding; all family results are replay-verified.**

## 2. Sensitivity grids — plateau vs isolated peak

208 runs (52 configs × 4 datasets) through the frozen runner (`validation_sensitivity`), grids as
authorized; full tables in `results/sensitivity_tables.md`. No new optimum is selected; the frozen
point is marked in each table. Summary (net vs REF_lower3; "edge" = the candidate's claimed benefit):

| grid | verdict | detail / flip points |
|---|---|---|
| A2 cutoff {−0.25..−2%} | old-era plateau, new-era KNIFE EDGE | QQQ99 edge is a broad plateau: every cutoff ≥ −0.5% improves, monotonically to +29.8k at −1.5/−2%. The known −0.4924% knife edge is real: at −0.25% the 2022-11-03 loss arms again and VGT16 drops 32.5k (148.2k vs 180.7k). Above it, the new-era deltas vs REF are noise-level and FLIP SIGN between adjacent cutoffs: VGT16 −1.4k (−0.5%) → +2.9k (−1%) → −2.4k (−1.5%); QQQ16 +1.5k (−0.5/−0.75%) → −10.0k (−1%) → −18.6k (−1.5%). The robust content is the old-era benefit; the new-era benefit is knife-edge residue. |
| D7 bound {$0.5k..$5k} | **ISOLATED PEAK at the frozen $2k** | Σnet−ΣREF: +10.2k ($0.5k), +6.2k ($1k), **+41.4k ($2k)**, −15.5k ($3k), −2.2k ($5k). Conclusion flips at adjacent points on VGT05, VGT16 AND QQQ16. The family's headline Σ+41.4k is concentrated exactly at the chosen dollar line; the mechanism direction survives (all bounds ≥ REF on QQQ99) but the magnitude is data-mined. |
| B7 stall age×decay 3×3 | CLIFF; frozen point sits on its edge | The QQQ99 +21.2k edge survives at 5/9 points (age 10 any decay; (20,40); (20,60)) and is EXACTLY ZERO (trade-identical to REF) at (20,80) and all age-30 points. Faster decay also adds +17.2–18.1k on VGT05 that the frozen point does not capture. VGT16/QQQ16 identical to REF at every grid point — the mechanism never binds in the new era. Binary, not a plateau: one step slower decay erases the entire candidate. |
| B2 floor×slope 3×3 | KNIFE EDGE on the floor; harm persists grid-wide | The QQQ99 benefit exists ONLY in the floor=0.5% row (+43.9/+54.8/+49.4k); floor 0.25% → +24.4k..−2.8k net with DD up to 133k (QQQ99 worse than no floor discipline), floor 1% → −13.7k..+9.1k. Confirms the family's "floor is load-bearing" as a knife edge. The QQQ16 harm (−38.6k) persists at slopes 0.5/0.75 and only halves at 0.25. Flip on QQQ99 between every floor row. |
| C6 retrace {0.30..0.50} | PLATEAU 0.34–0.50 with a cliff at 0.30 | QQQ99 improves at every fraction ≥0.34 (+6.6k..+24.7k, peak at the frozen 0.38); 0.30 is a cliff (−27.6k vs REF, DD 111k — premature resets inside 2000–02). VGT16 stable +22–33k except a one-episode dip at 0.46 (−0.5k). Small sign flips on VGT05/QQQ16 are noise-level (±3–8k). The most plateau-like grid; note honestly that the Σ-best point is exactly the pre-registered 0.38. |
| C11 rebound×discount 3×3 | plateau in {1.08,1.10}×{1.0%,1.5%}; cliffs at 1.06 and 2% | r=1.08 and r=1.10 are identical everywhere (the rebound size is inert above 1.08). Stage-2 discount 2% flips VGT05 negative (−2.0k vs +16.2k); rebound 1.06 with d≥1.5% collapses QQQ99 (−17.4k vs +15.2k — earlier stage-2 buys 2001–02 bear rallies). Frozen point sits inside a 2×2 stable sub-region but at its corner. |

## 3. Fresh instruments — unchanged parameters, no refitting

Data (`data/convert_stooq.py` documents provenance and checks): QLD/SOXX/VOOG 2016–2026 repo files
used as-is; SPY/XLK/IWM 2005-02-25..2026-09-08 converted from the Stooq daily archive
(`/Users/chad/development/personal/trading/data/d_us_txt.zip`; split- and dividend-adjusted, same
convention as the repo files). Sanity checks pass: strictly increasing unique dates, OHLC
consistency, plausible extreme moves (SPY +14.5% 2008-10-13), trading calendars match repo QQQ in
the overlap (0 differences for the Stooq files vs QQQ-2016 overlap; repo QLD itself is missing 3
sessions vs QQQ), daily-return correlations vs repo files in overlap: XLK–VGT16 0.995, SPY–QQQ16
0.932, IWM–QQQ99 0.876 — dates and adjustments are consistent. Runs: baseline, REF_lower3 and all
seven candidates via `engine.run`, each with a complete matched-exposure baseline rerun (size =
$100k × dollar-days ratio). Full tables in `results/episode_consistency.md`; summary.json has all
metrics/windows/counters.

**Headline (net/DD):**

| | baseline | REF_lower3 | lower3 vs matched-exposure baseline |
|---|---|---|---|
| QLD | 264,067/71,553 | −21,552/88,403 | −158,815 net, +51,209 DD — much worse on both dims |
| SOXX | 118,020/57,878 | 71,855/53,395 | −7,560 net, +14,450 DD — worse on both |
| VOOG | 56,668/45,222 | 63,258/27,401 | +29,473 net, +440 DD — much better on net, DD a marginal $440 worse |
| SPY | 19,456/83,535 | −19,097/93,047 | −27,339 net, +57,661 DD — much worse |
| XLK | 229,270/80,743 | 107,647/50,243 | +9,361 net, +15,629 DD — mixed (net up, DD up) |
| IWM | 22,237/88,852 | −6,848/76,783 | −17,229 net, +35,303 DD — worse on both |

**Finding 1 (the most important of the validation): the existing 3% rule itself does not transfer.**
On the four frozen datasets REF_lower3 beats baseline 3 of 4 on net and 4 of 4 on DD; on six fresh
instruments it beats the raw baseline's net only on VOOG, and at MATCHED EXPOSURE it wins on net
only on VOOG (+29,473) and XLK (+9,361) while having a LARGER drawdown than the equally-exposed
baseline on ALL SIX (marginally on VOOG, +$440; by $14k–58k elsewhere) — there is no fresh
instrument where it improves both dimensions. The restriction's new-era advantage looks specific to the 2016–2026 mega-cap-tech
path (VGT/QQQ), not a general property. On the 2x-leveraged QLD it is catastrophic (−21.6k vs
+264.1k baseline): violent V-recoveries make every blocked re-entry expensive.

**Finding 2: the candidates' improvements over REF_lower3 mostly do transfer in DIRECTION.**
Net vs REF_lower3 per fresh instrument (positive = candidate better):

| candidate | QLD | SOXX | VOOG | SPY | XLK | IWM | improve/harm |
|---|---|---|---|---|---|---|---|
| A2_material_05 | +85,933 | +5,673 | +3,902 | +13,498 | +78,128 | +4,813 | **6/0** |
| A2_material_1 | +85,933 | −4,196 | +3,902 | +12,275 | +67,866 | −4,899 | 4/2 |
| D7_tiny_loss_exit_anchor | +98,398 | −8,115 | +10,056 | +8,580 | +61,390 | +11,627 | 5/1 |
| B7_stall | 0 | 0 | 0 | 0 | 0 | −3,159 | 0/1 (inert) |
| B2_inverse | +67,937 | −23,057 | −25,226 | −4,441 | +65,682 | −13,969 | 2/4 |
| C6_retrace_38 | +12,210 | +40,937 | −4,360 | +30,029 | +44,169 | +1,604 | 4/1 |
| C11_graduated | −483 | +22,674 | 0 | +5,609 | **−69,235** | +11,669 | 3/1 |

A2_material_05 is the only candidate that improves on REF_lower3 on all six; D7 and C6 are close
behind; B7 never binds; B2_inverse and C11 do not transfer. Against their own matched-exposure
baseline controls, A2_material_05 wins both dims on VOOG and XLK (net +30.1k/+30.7k, DD −2.6k/−4.4k),
D7 on VOOG; everywhere else even the improved candidates remain below the scaled baseline — the
candidates narrow the gap Finding 1 describes, they do not close it.

**2008 (the out-of-design bear, XLK/SPY/IWM):** A2's material cutoff reproduced the March-2009 fix
on SPY: by not arming on the 2008-09-05 financing-only loss (exit > entry, −$1,145) its chain
entered 2009-03-05 @53.08 and rode +$24,580, while REF exited 2009-03-09 at a loss (2007–09 window
+25.7k). C6 improved SPY +24.4k and IWM +30.1k but cost −23.5k on XLK. C11 is the clear 2008
failure: stage-2 relaxation bought the 2008-09-23 bear rally (−$20.2k), re-entered 2009-02-23 near
but before the bottom, took the 15-day loss exit on 2009-03-10 and then sat restricted through
REF's 2009-03-03→2010-01-28 +$47.1k ride (XLK 2007–09 −77.0k). B2_inverse harmed 2007–09 on every
covering instrument except VGT05 (neutral +1.0k): QQQ99 −12.7k, SPY −13.4k, XLK −8.8k, IWM −9.3k —
severe-loss relaxation re-enters cascades early, exactly as its registered risk stated.

**A cautionary mirror image (SPY 2025, −30.2k for A2 and D7):** REF's 2025-03-31 exit was a −$531
financing-only loss (549.77→549.83); arming on it FORCED the 2025-04-04 re-entry at 505.28 (3%
below the exit) which rode to +$16.3k, while A2/D7, unrestricted, entered 2025-04-03 at 536.70 and
took the 15-day loss exit. The financing-only exemption is two-sided — this is the fresh-instrument
confirmation of Family E's "micro-loss armings are net positive more often than not" nuance, on an
instrument none of the families saw.

## 4. Episode-level consistency

Full per-candidate tables (10 instrument columns × 7 episodes) in `results/episode_consistency.md`.
The counting unit is the MARKET EPISODE: VGT05/QQQ99 share 2000–02* and 2007–09; VGT16/QQQ16 and
QLD/SOXX/VOOG share 2020/2022/2023/2025/2026; SPY/XLK/IWM add 2007–09 coverage but NOT new events.
(*2000–02 is covered by QQQ99 only — a single-dataset episode.) The program's shared history
contains only ~7 independent episodes, two of which (2000–02, 2007–09) carry most of the risk mass.

| candidate | improve | neutral | harm | mixed | reading |
|---|---|---|---|---|---|
| A2_material_05 | 2020 | — | 2000-02 (−6.1k), 2025 (SPY −30.2k) | 2007-09, 2022, 2023, 2026 | benefits and costs both real; net positive on 9/10 instruments but no episode-level uniformity |
| A2_material_1 | 2020 | — | 2000-02, 2025 | 2007-09, 2022, 2023, 2026 | strictly noisier version of _05 |
| D7_tiny | 2007-09, 2020 | — | 2000-02 (−4.8k), **2022 (7 of 8 instruments negative, QLD neutral)**, 2025 | 2023, 2026 | systematic 2022 cost: tiny-loss alt entries buy into grinds |
| B7_stall | 2000-02 (+21.2k) | 2007-09, 2020, 2022, 2025, 2026 | 2023 (IWM −3.4k) | — | a ONE-EPISODE mechanism; inert everywhere else |
| B2_inverse | 2000-02 (+2.8k), 2020 | — | **2007-09 (4 of 5 negative, VGT05 neutral)**, 2025, 2026 | 2022 (6 of 8 negative), 2023 | the two big bears disagree with the V-bottoms; episode-inconsistent |
| C6_retrace_38 | 2020, 2025 | 2000-02 | **2022 (7 of 8 negative, SOXX neutral)**, 2026 | 2007-09 (3+/1−), 2023 | real reset value in recoveries; pays a small systematic false-reset tax in grinds |
| C11_graduated | 2000-02 (+17.4k), 2025 | 2020, 2026 | **2007-09 (4 of 5 negative, XLK −77k)**, 2022, 2023 | — | the 2000-02 result does NOT generalize to the other extended bear; family claim "never below C1" fails out of sample |

Key cross-candidate observations: (i) every candidate that relaxes restrictions pays something in
2022-style grinding bears across nearly all instruments (D7, B2, C6, C11 rows); (ii) the two
extended bears disagree for C11 and B2 — mechanisms tuned on 2000–02 do not automatically carry to
2008; (iii) A2/D7's 2025 SPY harm and 2026/2023 wins come from the same financing-only exemption —
the single mechanism has both signs depending on what follows the micro-loss.

## 5. Multiple-testing accounting

Registered configurations across the program (every registry.jsonl, all append-only, failures
included): loss-classification 10, adaptive-discounts 26, recovery-resets 22,
recovery-opportunities 15, state-memory 5, execution-feasibility 9, validation 52 (8 candidate
re-runs + 44 grid points) — **139 configurations total**; the family stage alone evaluated 87
configurations × 4 datasets = 348 config-dataset results, plus two matched controls each.

The selection pressure is therefore: the 7 standalone Promising candidates are the best ~8% of 87
configurations, selected after inspecting all four datasets — datasets that among them contain only
~7 independent market episodes, with VGT/QQQ pairs correlated within each era. Under that much
selection, several of the Promising deltas (typically +15k to +42k net on strategies with 25–90k
drawdowns) are the EXPECTED magnitude of a winner's curse, not evidence of mechanism. The
validation evidence says which is which:

- consistent with a real mechanism: A2's financing-only/hairline exemption (plateau on QQQ99,
  direction transfers 6/6 fresh instruments, independent 2009-SPY rescue) and C6's retrace reset
  (parameter plateau 0.34–0.50, transfers 4/1) — though both remain below matched-exposure baselines
  on most fresh instruments and A2's new-era edge is knife-edge residue;
- consistent with selection noise: D7's $2k bound (isolated peak; adjacent bounds flip three
  datasets), B2_inverse's floor (single-row ridge; transfer 2/4 with uniform 2007–09 harm),
  C11's 2000-02 edge (fails on 2008 out of sample), B7_stall's QQQ99 edge (binary cliff in
  parameter space; zero effect anywhere else).

## 6. Flags for the G-stage / final comparison

1. REF_lower3's own transfer failure (section 3, Finding 1) should be stated prominently in
   COMPARISON.md: the restriction framework's measured advantage is era- and instrument-local
   (VGT/QQQ 2016–2026, VOOG; weaker XLK); at matched exposure it is a cost on QLD/SPY/IWM/SOXX.
   Combinations inherit this ceiling.
2. A2_material_05 is the strongest validated standalone: use it (not _1) in combinations; treat its
   VGT16/QQQ16 deltas as noise, its QQQ99 and transfer direction as signal; carry the SPY-2025
   counterexample forward (the exemption is two-sided).
3. D7_tiny's mechanism (anchor tiny-loss re-entries at the exit price) validates directionally, its
   $2k bound does not — any G use should test bound-free or loss-proportional forms rather than
   inherit $2,000.
4. C6_retrace_38: the one reset candidate to carry forward; expect a small systematic 2022-grind
   tax; 0.30 is a hard floor, do not go below 0.34.
5. C11_graduated and B2_inverse should be demoted from Promising on validation evidence (2008
   transfer failures; knife-edge parameters). B7_stall is inert outside QQQ 2000–02 basing and one
   parameter step from vanishing; at most a free-rider in combos.
6. Dependence on few trades persists everywhere: single trades of ±$20–77k (XLK C11 2008-09-23,
   XLK REF 2009-03-03, SPY A2 2009-03-05, SPY REF 2025-04-04) decide instrument-level verdicts.
   No conclusion in this program is statistically stable at the trade level.

## Coordinator audit addendum (2026-10-12, after the stage-1 agent was interrupted)

The stage-1 agent completed all four tasks and this report, but was interrupted before its final
precision pass. The coordinator audited every quantitative claim against the saved tables
(`results/sensitivity_tables.md`, `results/episode_consistency.md`, `results/summary.json`,
`results/fresh/summary.json`). Outcome:

- All §2 sensitivity claims verify to the dollar (A2 cutoffs incl. VGT16 148,160 at −0.25% and the
  QQQ99 plateau to +29,824; B7's 5-of-9 / zero-at-(20,80)-and-age-30 cliff; D7's isolated $2k peak
  +10,229/+6,226/+41,396/−15,501/−2,191; C6's 0.30 cliff −27,561 with DD 111,488; C11 grid).
- All §4 episode-count wordings match `results/episode_consistency.md`.
- Two §3 wordings were corrected in place (marked by this addendum): REF_lower3's matched-exposure
  result is a net-only win on VOOG and XLK with a larger drawdown on all six fresh instruments
  (VOOG marginally, +$440), not "both dims on VOOG / larger DD on five of six"; the VOOG headline
  row now says so.
- §5 tally update: this report's 139 excludes Family G, which ran concurrently; the combinations
  registry adds 17 pre-registered entries (156), and validation stage 2 appended another 32 grid
  points, so the FINAL program total is **188** registered configurations. COMPARISON.md carries
  the full tally.
- G-stage candidates (G8, G4) are validated in stage 2: `RESULTS_STAGE2.md` and `results/stage2/`
  (replay PASS 5,995 checks; G4 does not survive — its edge is one parameter-fragile trade; G8
  survives vs its own legs but is a trade-off vs A2_material_05).

## File index

- `replay_verify.py`, `results/replay/replay_verification.txt` — task 1 (36,238 checks, all pass)
- `strategies.py`, `register.py`, `registry.jsonl`, `run_sensitivity.py`, `analyze_sensitivity.py`,
  `results/summary.json` + runner tree, `results/sensitivity_tables.md` — task 2
- `data/convert_stooq.py`, `data/stooq_raw/`, `data/{SPY,XLK,IWM}-2005-2026.csv`, `run_fresh.py`,
  `results/fresh/summary.json`, `results/fresh/trades/` — task 3
- `analyze_episodes.py`, `results/episode_consistency.md` — task 4 (incl. the registry tally)
