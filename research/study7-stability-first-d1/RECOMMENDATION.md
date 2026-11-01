# Recommendation — Study 7 (stability-first D1 optimization)

## Scope and status

- **Everything here is retrospective research on inspected data.** Nothing is merged, deployed, added to the prospective
  B4/B5 system or licensed for the actual portfolio.
- **Basis:** fixed one-slot $100,000 shadow pools, 11% interest and 5 bps per side.
- **Records:** every figure comes from sealed records (`FROZEN_SELECTION.json`, `results/phaseD`, `results/final`).

## 1. The study's mechanical result

| Path | Outcome |
|---|---|
| **Class M** (search on 2017-06-15 → 2021-12-31, validation on 2022–2023) | **No nomination.** None of the 22 fold-M shortlisted candidates of G, VG, VXR and VXRG qualifies. 21 fail the 90% joint-neighbourhood gate on the run to 2023-12-29 (pooled shares 0–65%), most of them also breaching $35,000 at their centre in 2022. The 22nd (a low-profit VG vector, share 98.7%) fails the VAL-profit, concentration and B1-dominance gates (Q3, Q4, E3). |
| Folds F19 / F20 (procedure evidence) | No candidate passes out of fold. |
| **Class L** (search on 2017-06-15 → 2023-12-29, in-sample qualification, block-only check on the exposed 2024-01-02 → 2026-10-29 window) | **12 research nominations**: every role holder, all tiered "strong" by pre-2024 figures, none blocked by F1–F4, none marginal. |
| Go / no-go (PROTOCOL.md §11.4) | Outcome (1), "qualified stability-first improvement", **mechanically — through the Class L path only.** |

### The sealed ranking

The ranking was sealed before the final door, from confirmation figures ending 2023-12-29. FULL and FX figures come
from the final door: descriptive, block-only.

| Rank | Nominee | Books | FULL net | FULL minute DD | FX net (2024–26) | Final share < $35k / p90 DD (n = 384, new seeds) | Centre ÷ median |
|---:|---|---|---:|---:|---:|---|---:|
| 1 | VG profit | VGT + GDX | $284,271 | $28,297 | $60,074 | 97.7% / $33,322 | 1.07 |
| 2 | VG robust | VGT + GDX | $274,857 | $26,018 | $57,593 | 99.7% / $30,741 | 1.09 |
| 3 | VXRG profit | VGT + XBI + XRT + GDX | $276,157 | $24,202 | $15,434 | 99.7% / $30,162 | 1.34 |
| 4 | VXRG balanced | VGT + XBI + XRT + GDX | $255,387 | $19,228 | $11,704 | 99.2% / $25,952 | 1.32 |
| 5 | VG balanced | VGT + GDX | $244,081 | $21,020 | $69,389 | 100% / $22,759 | 1.14 |
| 6 | VXR profit | VGT + XBI + XRT | $222,332 | $26,104 | $64,118 | 99.2% / $32,799 | 1.26 |
| 7 | G profit | GDX | $168,378 | $18,333 | $9,993 | 100% / $20,713 | 1.19 |
| 8 | VXRG robust | VGT + XBI + XRT + GDX | $143,189 | $19,196 | $5,788 | 100% / $21,371 | 1.11 |
| 9 | VXR balanced | VGT + XBI + XRT | $196,900 | $18,399 | $13,047 | 100% / $23,463 | 1.43 |
| 10 | G balanced | GDX | $162,406 | $17,281 | $6,853 | 100% / $20,759 | 1.43 |
| 11 | G robust | GDX | $166,638 | $17,281 | $7,442 | 100% / $17,310 | 1.38 |
| 12 | VXR robust | VGT + XBI + XRT | $177,020 | $17,173 | $22,382 | 100% / $20,994 | 1.33 |
| — | **B1** (VGT `primary`, frozen) | VGT | $176,260 | $19,534 | $40,901 | 100% / $28,704 | 1.41 |
| — | **B5** (frozen) | five books | $484,637 | $26,510 | $96,148 | 27.1% / $57,125 | 2.06 |
| — | frozen VG / VXR / VXRG | — | $278,266 / $228,475 / $387,857 | $25,774 / $19,534 / $25,774 | $95,000 / $42,467 / $96,566 | 71.6% / 90.4% / 65.1% | 1.42 / 1.70 / 1.73 |

The research configurations are exported under `config/research-pools/study7-stability-first-d1/` and
`config/research-phenotypes/study7-stability-first-d1/D1/`, each labelled research only and runnable with
`npm run study7 -- pool fixed <ID>`. The 12 nominees are the files whose status reads "RESEARCH NOMINATION (RANK n …)".
For example, `S7-VG-L-19` is rank 1. Its pools-engine run reproduces the final record exactly.

## 2. The analyst's evidence-weighted assessment (separate from the mechanical result)

**Bottom line: no candidate is chronologically validated. The Class L nominations are a credible retrospective
finding, not deployment evidence.** Frozen B1 and frozen B5 remain the benchmarks.

1. **The out-of-sample test that matters failed for every track.**
   - Stability-first fitness was active from the first screen. The search found broad, profitable neighbourhoods on
     the development window, and independent seed families confirmed them at 100%.
   - None of that survived 2022–2023. Training robust profit did not rank out-of-fold results (ρ −1.0 to +0.4), and
     PBO was 0.23–0.83.
   - Stability-first optimization fixed **parameter** fragility. It did not fix **calendar** fragility, the failure
     mode of every earlier D1 study.
2. **The Class L nominees are robust only with hindsight of 2022.**
   - Their search included 2022–2023, so they avoid by construction the episode that broke fold M.
   - Their one out-of-fold window (2024–2026) is exposed: the gold-miner rally and the frozen books' behaviour were
     known. It can only block, and it did not block.
   - That is weak but real evidence. On new seeds and 2.8 more years, their neighbourhoods stayed 97.7–100% below
     $35k, and no centre exceeded $28.3k.
   - Selection multiplicity is large: 137,859 configurations across 18 searches. In-sample PBO on fold L is 0.29–0.83.
3. **Economic tiers, by the analyst** (not the study's mechanical tier):
   - **Stable with good profit:** **VG robust (#2)** and **VG balanced (#5)**, then **VG profit (#1)** and **VXR profit
     (#6)**.
     - FULL net $222k–$284k against B1's $176k, with minute DD $21k–$28k.
     - Final neighbourhoods 97.7–100%. FX net +$57k to +$69k, more than B1's +$41k.
     - #5 is the most risk-efficient: p90 $22.8k, DD $21.0k, 100% share.
     - #2 balances profit and robustness: p90 $30.7k.
     - #1 has the highest profit but thins at 1.5× radius (85.9%), and its p90 ($33.3k) sits near the ceiling.
     - All four equal frozen VG's full-history profit or fall below frozen B5's by about $200k–$260k. The improvement is
       **robustness at VG-like profit**, not more profit.
   - **Stable, modest or crash-dependent profit:**
     - **VXRG (#3, #4, #8):** good history, but only $6k–$15k in 2024–2026.
     - **VXR balanced and VXR robust (#9, #12):** $13k–$22k in 2024–2026.
     - **GDX standalone (#7, #10, #11):** 61–72% of net from 2020; $7k–$10k in 2024–2026.
   - **Controls:**
     - **B1** is the only configuration that passes every design in every study without in-study selection. It
       remains the robust, modest-profit benchmark.
     - **Frozen VXR** sits on the gate (87.5–90.4% depending on the seed family).
     - **Frozen B5** has the highest profit but fragile neighbourhoods (27%).
4. **What changed the picture relative to earlier studies.**
   - Smaller pools (two to four books, no KRE) and joint re-optimization of every book did produce funded pools whose
     whole-history neighbourhoods are robust. Earlier five-book studies never achieved that.
   - The nominees' profit no longer hinges on one funded sequence: neighbours that fund a different sequence keep
     70–95% of the centre's net.
   - They achieve this partly by **trading less and contending less**: deep-entry VGT books at the X = 30% box ceiling,
     lower-activity GDX books and fewer refusals. This is a genuine design trade-off, not a free gain.

## 3. Precise gating failures (the "why not")

| Track | Fold M (decisive chronology) | F19 | F20 |
|---|---|---|---|
| G | 6/6 fail Q1, Q2, Q2b and Q7 (2022 centre DD $49k–$62k); 3 fail Q3 | 3 fail Q6, 3 fail Q1/Q2/Q7 | 6/6 fail Q1, Q2, Q3, Q7 |
| VG | 5 fail Q2 (shares 0.04–0.65), 3 fail Q3; 1 passes Q2 but fails Q3, Q4 and E3 | 6/6 fail Q2 | 6/6 fail Q2, Q3 |
| VXR | 6/6 fail Q1, Q2, Q7 (shares 0.00–0.42) | 6/6 fail Q2 | 6/6 fail Q1, Q2, Q3, Q7 |
| VXRG | 4/4 fail Q2 (shares 0.00–0.11) | 4/4 fail Q2, Q6, Q7 | 4/4 fail Q2, Q3, Q4 |

Fold L failures: 2 GDX candidates fail Q2b (boundary; shares 0.904 and 0.927) and 2 VXR candidates fail Q8 (plateau).

## 4. Practical recommendation

1. **Do not deploy anything** from this study, and do not change the portfolio, the frozen phenotypes or the
   prospective B4/B5 protocol.
2. **Keep B1 and B5 frozen** as the benchmarks: B1 the robust one, B5 the high-profit, fragile one.
3. **If the user wants forward evidence on the Class L finding,** the defensible step is a **separately approved,
   research-only prospective addendum**. It would observe two or three of the Class L nominees — for example VG
   balanced (#5), VG robust (#2) and VXR profit (#6) — from a flat start after a new freeze, beside B1 and B5, with the
   minute-DD ceiling monitored. That would be the first genuinely unseen test of a stability-first pool. It needs the
   user's approval, and Study 7 does not implement it.
4. **Do not run another search on 2016–2026 data** expecting chronological validation. Fold M shows that a robust DEV
   neighbourhood does not predict 2022–2023, and any further search would treat 2024–2026 as observed data.

**The `none` option.** Requiring chronological validation, as the study's Class M path does, gives **no nominee**. The
user may legitimately read the result that way. The Class L nominations exist only because the protocol predeclared
an in-sample path checked against an exposed window, and they are labelled weaker throughout.

## 5. Answers to the brief's priority questions

1. **GDX standalone:** not chronologically. Every DEV-trained GDX region breaks in the 2022 bear (centre DD
   $49k–$62k). In hindsight of 2022 (fold L), a short-lookback GDX region (L 35–38) is robust, at 100% on every design,
   but crash-dependent and low-yield: $2.4k–$3.5k a year in 2024–2026 (`GDX_STANDALONE.md`).
2. **Frozen VG and VXR:**
   - VXR is close to a plateau: it passes to 2023 (93%) and is marginal on the full history (87.5–90.4%).
   - VG is **less** stable than B1 (73%) because of GDX.
   - Dimension-matched designs (k = 8) remove most of the gap for VXR, VXRG and B5, but not for VG
     (`BASELINES_AND_FIXED_SUBSETS.md`).
3. **Neighbourhood-driven joint optimization:** yes, in sample. It finds strong-and-stable and moderate-profit plateau
   configurations that the frozen, centre-selected books lack. No, out of fold: every DEV-trained one failed on
   2022–2023.
4. **VGT:** `primary` is strong. The standalone opportunity-gap trigger did not fire (best gap 1.07×), so further
   standalone VGT optimization adds little. Inside pools, the optimizer chose quite different VGT books, deep-entry or
   longer-hold (`VGT_CONTROL_AND_ROLE.md`).
5. **Persistence:**
   - Under chronological testing: no.
   - Under independently reserved perturbations: yes, on every training window and on the full history for the Class L
     nominees.
   - Under the exposed 2024–2026 window: not blocked. That is weak evidence.
6. **Extra computation:** it bought breadth (137,859 configurations, 16 track-folds, 4 folds) and precision. Selection,
   confirmation and final sets agree. Island extensions (T1) mostly added trials, not information, and saturated. The
   study stopped for saturation and predeclared schedule completion (`OPTIMIZATION_AND_COMPUTE.md`).
