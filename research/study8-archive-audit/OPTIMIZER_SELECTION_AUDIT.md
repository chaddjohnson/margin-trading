# Optimizer and selection audit — exclusion funnel and search saturation

**Questions 3 and 7.** Which criteria excluded high-profit configurations, at what quantified cost? Was the search
saturated in economically meaningful regions, and would more compute help?

- **Data:** training-door records only (search, archive and qualification), with the sealed roles.
- **Exceptions, all sealed-member results and all labelled:**
  - the return-rank statistic in §3;
  - the funnel's "sealed nominations" row;
  - the note that two V holders failed T5 on the test door.
- **Method:** nothing was re-run. Tables are filled from `outputs/f24-funnel.md` and `outputs/saturation.md`.

## 1. Tested versus untested: what the audit can and cannot say

| population | count (F24) | evidence available | can it be called robust? | test-window evidence |
|---|---:|---|---|---|
| (a) rung-1-only configurations | 82,882 | 16-point summary, centre net/DD/lots/episodes | **no** (16 points cannot establish ≥ 90%) | none, and none may be created here |
| (b) rung 2/3, not shortlisted | 1,127 | 64/128-point summaries, full centre, violation parts | only at its fidelity, with the precision stated | none |
| (c) shortlisted, not qualified | 9 | + selection 2 × 128, confirmation 3 × 128, gates | at 384 points | **sealed** (members' T gates) |
| (d) qualified, no role | 1 | as (c) | yes | sealed |
| (e) role holders | 26 (18 nominated) | + full test evidence | yes | sealed |

84,045 configurations in all: the 84,034 archive rows plus 11 refinement endpoints that were never in the archive.
Per-track sizes: `outputs/f24-overlooked.md` "Category sizes".

**Every statement about an untested configuration is training-only.** No untested configuration may be called
validated or persistent.

## 2. Q3 — gate-by-gate loss funnel (F24, training)

**Per track.** Counts and the best robust profit/yr at each stage's own fidelity, from `outputs/f24-funnel.csv`:

| stage (count · best robust/yr at that fidelity) | G | V | VG | VXR | VXRG | VXRKG |
|---|---|---|---|---|---|---|
| rung-1 archive (16 pt) | 8,560 · $23,969 | 7,744 · $13,612 | 13,312 · $30,524 | 13,824 · $18,805 | 18,432 · $28,265 | 22,162 · $24,226 |
| rung-1 feasible (C1–C7, 16 pt) | 3,081 · $23,881 | 657 · $11,121 | 7,805 · $30,524 | 5,334 · $18,124 | 5,881 · $28,265 | 6,177 · $24,226 |
| promoted to rung 2 (64 pt) | 192 · $23,547 | 192 · $8,960 | 192 · $29,259 | 192 · $17,526 | 192 · $26,521 | 192 · $23,006 |
| rung-2 feasible | 117 · $23,159 | 8 · $8,899 | 190 · $29,259 | 191 · $17,526 | 187 · $26,521 | 191 · $23,006 |
| rung 3 incl. refinement (128 pt) | 51 · $22,926 | 48 · $8,959 | 50 · $28,656 | 49 · $17,159 | 49 · $25,840 | 52 · $23,067 |
| rung-3 feasible | 48 · $22,926 | 11 · $8,959 | 48 · $28,656 | 49 · $17,159 | 49 · $25,840 | 52 · $23,067 |
| shortlist (6; feasible picks) | 6 · $22,926 | 4 · $8,959 | 6 · $28,656 | 6 · $17,159 | 6 · $25,840 | 6 · $23,067 |
| qualified (confirmation 384 pt) | 3 · $19,799 | 4 · $8,890 | 4 · $29,314 | 5 · $17,224 | 6 · $26,156 | 5 · $23,095 |
| role holders | 3 · $19,799 | 4 · $8,890 | 4 · $29,314 | 5 · $17,224 | 5 · $26,156 | 5 · $23,095 |
| sealed nominations (test pass/ambiguous) | 1 · $19,799 | 2 · $8,584 | 4 · $29,314 | 3 · $17,224 | 4 · $26,156 | 4 · $23,095 |

**Where the profit went, stage by stage** (same-fidelity comparisons only):

| step | what decides | evidence of lost profit |
|---|---|---|
| screen → rung 1 | plausibility (standalone DD < $35k, net > 0, ≥ 2 lots) and promotion caps | not knowable: unpromoted screen vectors are retained only as counts |
| rung-1 feasibility (C1–C7, 16 points) | the full constraint set on 16-point estimates | §2.1 |
| rung 1 → rung 2 (192, L∞ ≥ 0.02) | constrained-domination order with crowding, **not robust profit** | at rung-1 fidelity, every track's best feasible rung-1 robust profit was promoted except **one G configuration**, `GDX:d1-b9adaedbd0` (L∞ 0.013 from a promoted one, i.e. excluded as a near-duplicate). Feasible front members not promoted: G 91, V 63, VG 11, VXR 1, VXRG 4, VXRKG 5 |
| rung 2 → rung 3 (48, L∞ ≥ 0.03) | the same order on 64-point values | 135–143 per pooled track "below the top 48". At rung 2, VG has 41 records above #2's rung-2 value (up to +8.3%), VXRG 5 (+4.0%), VXR 3 (+1.9%); those re-measured at rung 3 fell back (`PROFIT_ROBUSTNESS_FRONTIER.md` §2) |
| rung 3 → shortlist (6, L∞ ≥ 0.10, ledger de-duplication, pick order) | profit, robust, balanced, centre, then front picks | **the best rung-3-feasible configuration left out is 0.2–6.1% *below* the best shortlisted one** (table below): the cap of six lost nothing at the top |
| shortlist → qualification (384 points) | Q1–Q8, E1–E3 | §2.2 |
| qualification → roles | profit, robust and balanced orders on the selection families; two extras (L∞ ≥ 0.10, ledger Jaccard < 0.5) | one qualified configuration without a role (VXRG #6, selection robust $22,914/yr), excluded by the two-extra cap; below the track's holders |

**Opportunity cost of the shortlist step** (rung 3, 128 points, same seed family):

| track | best shortlisted (r3 robust/yr) | best rung-3-feasible not shortlisted | its r3 robust/yr | difference | r3-feasible not shortlisted |
|---|---|---|---|---|---|
| G | $22,926 | `GDX:d1-f99216b79e` | $21,536 | -6.1% | 42 |
| V | $8,959 | `VGT:d1-883cfba59e` | $8,943 | -0.2% | 7 |
| VG | $28,656 | `VGT:d1-4d70e94866+GDX:d1-3ece39cc57` | $28,441 | -0.7% | 42 |
| VXR | $17,159 | `VGT:d1-f5da590fb9+XBI:d1-d8613bf9e1+XRT:d1-8424f14c77` | $17,089 | -0.4% | 43 |
| VXRG | $25,840 | `VGT:d1-d1b1d07d99+XBI:d1-90d1c91e59+XRT:d1-447ca5fcef+GDX:d1-0ae44496f3` | $25,514 | -1.3% | 43 |
| VXRKG | $23,067 | `VGT:d1-02a7861775+XBI:d1-f4e701b9b5+XRT:d1-96e81f70a3+KRE:d1-87a285523e+GDX:d1-f72bd12161` | $22,384 | -3.0% | 46 |

### 2.1 Rung-1 constraint decomposition (all F24 archive rows)

| track | archive | feasible | front | front promoted | front not promoted | C1 | C2 share | C2 p90 | C3 lots | C3 episodes | C5 median | C5 p10 | other | only other | risk-feasible but infeasible | recomputation mismatches |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G | 8,560 | 3,081 | 274 | 183 | 91 | 1011 | 3327 | 3052 | 1003 | 356 | 737 | 18 | 4445 | 1105 | 2123 | 0 |
| V | 7,744 | 657 | 162 | 99 | 63 | 501 | 2776 | 2427 | 857 | 383 | 5902 | 260 | 5208 | 405 | 4301 | 0 |
| VG | 13,312 | 7,805 | 130 | 119 | 11 | 770 | 3476 | 2951 | 216 | 148 | 1248 | 97 | 4270 | 1482 | 1986 | 0 |
| VXR | 13,824 | 5,334 | 59 | 58 | 1 | 1184 | 5682 | 5153 | 78 | 29 | 5731 | 304 | 7049 | 1185 | 2767 | 0 |
| VXRG | 18,432 | 5,881 | 50 | 46 | 4 | 2070 | 9063 | 8324 | 12 | 42 | 3603 | 345 | 11021 | 3044 | 3421 | 0 |
| VXRKG | 22,162 | 6,177 | 195 | 190 | 5 | 4266 | 13574 | 12861 | 1 | 1 | 5102 | 830 | 13496 | 2218 | 2399 | 0 |

**Column definitions.**

- "Risk-feasible but infeasible": rows that pass C1 and C2 but fail a non-risk constraint.
- "Only other": rows that fail only the unstored C3 lot-years / C4 / C6 / C7 group.

**Reading it:**

- Non-risk constraints remove 1,986–4,301 risk-feasible rows per track at rung 1.
- Above the holders' own 16-point values, they excluded only **13 configurations** (V 6, VG 4, VXRKG 3). V's distinct
  leads are +2% to +13% at 16 points; VXRKG's +2.5% to +4.3%.
- Every other lead (G 223, VG 49, VXRKG 18, VXR 1, VXRG 1) is *feasible* and was left out by the promotion order
  (crowding, distinctness, cap), not by a non-risk constraint.
- **From rung 2 on, no F24 record violates C3, C4, C6 or C7 at all.** The only violated parts at rungs 2 and 3 are
  C2 (risk) and, in V, C5 median (`outputs/f24-overlooked.md`, "Violated constraint parts").

### 2.2 Qualification (shortlist → qualified; 384 points)

| track | order | pick | id | qualified | failed gates | kind | conf share | conf p90 | conf robust/yr | selection robust/yr | role |
|---|---|---|---|---|---|---|---|---|---|---|---|
| G | 1 | profit | GDX:d1-469476b33b | no | Q2,Q2b,Q7 | risk/stress | 88.3% | $35,190 | $23,039 | $22,955 | — |
| G | 2 | robust | GDX:d1-36e56c16df | yes | — | — | 100.0% | $17,281 | $11,685 | $11,707 | robust |
| G | 3 | balanced | GDX:d1-87fb81ca3d | yes | — | — | 100.0% | $17,744 | $14,428 | $13,939 | balanced |
| G | 4 | centre | GDX:d1-40310975f5 | no | Q2,Q2b | risk | 89.3% | $35,121 | $19,971 | $20,121 | — |
| G | 5 | front | GDX:d1-6d8ad80856 | no | Q7 | stress | 91.9% | $34,467 | $21,456 | $21,204 | — |
| G | 6 | front | GDX:d1-42338b0a9e | yes | — | — | 91.9% | $33,914 | $19,799 | $19,973 | profit |
| V | 1 | profit | VGT:d1-75353cd798 | yes | — | — | 90.6% | $34,371 | $8,890 | $9,017 | profit |
| V | 2 | robust | VGT:d1-787044ebd5 | yes | — | — | 96.6% | $34,604 | $8,584 | $8,579 | robust |
| V | 3 | balanced | VGT:d1-0c07e16765 | yes | — | — | 90.9% | $33,392 | $8,785 | $8,943 | balanced |
| V | 4 | centre | VGT:d1-3a9036cc5b | yes | — | — | 94.0% | $34,732 | $7,352 | $7,231 | extra |
| V | 5 | infeasible on training | VGT:d1-0baf56263a | no | Q2,infeasible on training | non-risk/risk | 86.5% | $35,977 | $7,705 | $7,071 | — |
| V | 6 | infeasible on training | VGT:d1-390e1af45a | no | Q2b,Q8,infeasible on training | non-risk/risk | 90.4% | $34,732 | $7,803 | $7,928 | — |
| VG | 1 | profit | VGT:d1-f41ebcd961+GDX:d1-016d8e4257 | yes | — | — | 96.4% | $28,310 | $29,314 | $29,680 | profit |
| VG | 2 | robust | VGT:d1-bf09de196a+GDX:d1-db77792880 | yes | — | — | 100.0% | $19,676 | $18,318 | $18,313 | robust |
| VG | 3 | balanced | VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d | yes | — | — | 97.9% | $24,082 | $27,098 | $26,909 | balanced |
| VG | 4 | centre | VGT:d1-c8e34dda17+GDX:d1-fc8d0af80f | no | Q2b | risk | 91.9% | $33,613 | $27,224 | $27,204 | — |
| VG | 5 | front | VGT:d1-cd30339c6f+GDX:d1-b8209b6915 | no | Q8 | non-risk | 100.0% | $21,166 | $16,019 | $15,830 | — |
| VG | 6 | front | VGT:d1-ed1b24997b+GDX:d1-8c0a637cf4 | yes | — | — | 99.5% | $23,046 | $24,181 | $24,099 | extra |
| VXR | 1 | profit | VGT:d1-05f07225ab+XBI:d1-0f9162498a+XRT:d1-8424f14c77 | yes | — | — | 98.4% | $27,153 | $17,224 | $17,254 | profit |
| VXR | 2 | robust | VGT:d1-c5fe67154e+XBI:d1-4194b08464+XRT:d1-0660a0f9e2 | yes | — | — | 100.0% | $23,609 | $13,144 | $12,864 | robust |
| VXR | 3 | balanced | VGT:d1-cc77e9b6e2+XBI:d1-d69755c726+XRT:d1-45cf3ffe38 | yes | — | — | 100.0% | $24,423 | $16,197 | $16,319 | balanced |
| VXR | 4 | centre | VGT:d1-1695c751ab+XBI:d1-3649569654+XRT:d1-47ba095ccf | no | Q8 | non-risk | 96.1% | $31,218 | $12,775 | $12,897 | — |
| VXR | 5 | front | VGT:d1-2d993cb4b1+XBI:d1-1c88109093+XRT:d1-b8668e28be | yes | — | — | 100.0% | $25,774 | $16,161 | $15,958 | extra |
| VXR | 6 | front | VGT:d1-51ae9b9f1d+XBI:d1-992ca7d19c+XRT:d1-5e5ee0532e | yes | — | — | 100.0% | $23,419 | $13,252 | $13,148 | extra |
| VXRG | 1 | profit | VGT:d1-61be86f1a1+XBI:d1-1a086c125a+XRT:d1-0245c8dddf+GDX:d1-ca3c80373a | yes | — | — | 96.6% | $30,381 | $26,156 | $25,841 | profit |
| VXRG | 2 | robust | VGT:d1-5b71ff100b+XBI:d1-6559566421+XRT:d1-f04a10334c+GDX:d1-ab43b9275c | yes | — | — | 100.0% | $22,067 | $19,892 | $20,209 | robust |
| VXRG | 3 | balanced | VGT:d1-f7242fa73f+XBI:d1-7131534d6d+XRT:d1-4e028ad95c+GDX:d1-f17446b205 | yes | — | — | 99.7% | $23,620 | $25,549 | $25,834 | balanced |
| VXRG | 4 | centre | VGT:d1-0ebdd46d3b+XBI:d1-a0edcf3dec+XRT:d1-024a00f5a2+GDX:d1-b9c0bdb49c | yes | — | — | 99.5% | $26,629 | $23,275 | $23,451 | extra |
| VXRG | 5 | front | VGT:d1-35fa63fdb4+XBI:d1-ab441a1452+XRT:d1-a73e2d0da3+GDX:d1-7c2b269fb6 | yes | — | — | 99.0% | $28,616 | $23,411 | $23,592 | extra |
| VXRG | 6 | front | VGT:d1-51333c586c+XBI:d1-40ed056947+XRT:d1-39f9e8f7eb+GDX:d1-6adcab9367 | yes | — | — | 98.2% | $27,708 | $22,206 | $22,914 | — |
| VXRKG | 1 | profit | VGT:d1-28ce3e131c+XBI:d1-2c4343e62d+XRT:d1-1a4d950d56+KRE:d1-ce53998991+GDX:d1-9c73f00f55 | yes | — | — | 98.2% | $32,249 | $23,095 | $22,660 | profit |
| VXRKG | 2 | robust | VGT:d1-832c2ac279+XBI:d1-7892e8316c+XRT:d1-7ece6857d6+KRE:d1-ae17198fcf+GDX:d1-7b90ff8858 | yes | — | — | 98.4% | $30,666 | $21,264 | $21,027 | robust |
| VXRKG | 3 | balanced | VGT:d1-bdf31dccef+XBI:d1-c13a466b4f+XRT:d1-426f3648ae+KRE:d1-4a89bcf93b+GDX:d1-cde8becc1d | yes | — | — | 99.0% | $31,131 | $22,393 | $21,967 | balanced |
| VXRKG | 4 | centre | VGT:d1-3f5fb28e19+XBI:d1-d03bd2bdb9+XRT:d1-e89543e837+KRE:d1-e644e4d566+GDX:d1-f3a51fe69d | no | Q2b | risk | 93.8% | $34,326 | $21,186 | $21,708 | — |
| VXRKG | 5 | front | VGT:d1-89bf9c69f8+XBI:d1-778784bf3a+XRT:d1-cb06d7a4ec+KRE:d1-0259857268+GDX:d1-883e662758 | yes | — | — | 95.3% | $29,732 | $15,805 | $16,060 | extra |
| VXRKG | 6 | front | VGT:d1-feab7375ce+XBI:d1-f8aaff5aab+XRT:d1-dd422efe62+KRE:d1-5eef5aca3d+GDX:d1-96a61089c9 | yes | — | — | 97.9% | $25,450 | $17,575 | $17,547 | extra |

### 2.3 Were the excluding criteria overly restrictive? (Why they exist, and what they cost here)

| criterion | why it was introduced (from the protocol and the Study 7/8 record) | cost found in this archive |
|---|---|---|
| C1/C2, Q2/Q2b, T2/T2b ($35k centre and p90, share ≥ 0.90, in-box pair) | research drawdown ceiling and plateau robustness. The in-box pair stops a candidate near a bound from passing on clipped (repeated) neighbours | G's profit and centre picks fail here (88–89% share, p90 > $35k at 384 points). **These are safety exclusions, not opportunity loss**: the profit comes from narrower neighbourhoods |
| C3/C4/T6 activity floors | stop near-inert "perfectly stable" settings. In some tracks fewer lots buys a higher share among rung-3 candidates (Study 8 threshold sensitivity, Spearman of lots with share: G −0.75, VG −0.46, VXRKG −0.39, but V +0.25, VXR −0.09, VXRG 0.00; `results/tables/search-threshold-sensitivity.md`) | small. They bind the high-share G and V regions; no high-profit pooled region was removed |
| C5/E1 (median ≥ $10k/yr, p10 > 0) | economic viability after interest and friction | binds V (VGT alone) heavily: rung-3 feasible 11/48. Not an issue for the pooled tracks |
| C6/E2 (≥ $11k per occupied $100k-year) | capital efficiency, so idle capital is not rewarded | not separately identifiable at rung 1 (part of "other"); **no rung-2 or rung-3 F24 record violates C6** |
| C7, Q4/Q6, T5 (top lot ≤ 25%, best year ≤ 75%, ex-best-year ≥ $5k/yr) | concentration: every nominee depends heavily on 2020 | 13 rung-1 leads (V 6, VG 4, VXRKG 3) are infeasible on the unstored C3 lot-years / C4 / C6 / C7 group, which cannot be split at rung 1. No rung-2/3 record violates C7. Two V holders later failed T5 on the test door |
| Q7 stress (10 bps, 14%, next-open stops, +25 bps) | robustness to the fill and cost assumptions | excluded G's +8% front member (91.9%, p90 $34,467). It is on the risk boundary anyway |
| Q8 (confirmation median ≥ 60% of centre net) | rejects a centre that is a peak above its own neighbourhood | VG #5 and VXR #4: both less profitable than their tracks' holders. No opportunity cost |
| six-member cap, L∞ ≥ 0.10, funded-ledger de-duplication | multiplicity control and diversity of the shortlist | at most −0.2% … −6.1% below the shortlisted best (table above). **No cost at the top.** One G configuration, `GDX:d1-f99216b79e` (+8% over holder #12 at rung 3, 90.6%, p90 $34,848), was excluded only by L∞ 0.032 from the G profit pick, which then failed Q2 at 384 points. It was never measured at 384 points |
| robust profit = ½·median + ½·p10 | rewards the lower tail as much as the median | alternative weightings pick other shortlisted members, or non-shortlisted configurations within 3% (largest gap −2.6%; `PROFIT_ROBUSTNESS_FRONTIER.md` §4) |

**Conclusion for Q3.** The criteria that exclude the most profitable F24 configurations are the **risk** criteria in
G (and, at the margin, Q7). Those configurations are profitable *because* they are less robust.

In the pooled tracks, no non-risk criterion — activity, economics, concentration, cap, distinctness or scoring — was
found to discard a materially more profitable, risk-feasible configuration at ≥ 64-point precision.

The one non-risk exclusion of a +8% G configuration was by L∞ distinctness from a same-region pick that failed Q2.
That configuration's own 384-point status is unknown.

Below rung 2 the archive cannot settle it. The rung-1 leads are within the measured 16-point noise, and their exact
C3 lot-years / C4 / C6 / C7 status is unknown.

## 3. Q7 — was the search saturated? Would more compute help?

### 3.1 Islands, triggers, refinement, PBO (every job)

| track | fold | d | islands | stops | duplicate proposals | last-island union gain | T1 | late gain (median) | rung-1 archive | rung-1 feasible | refinement accepted moves | mean robust gain per accepted move | PBO (64 best rung-2) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G | F19 | 8 | 4 | {'budget': 4} | 9.4% | +0.0% | — | 0.3% | 9,216 | 35.9% | 0 | — | 0.83 |
| V | F19 | 8 | 4 | {'stagnation': 2, 'budget': 2} | 10.8% | +0.0% | — | 1.7% | 8,064 | 4.9% | 5 | $289 | 0.33 |
| VG | F19 | 16 | 4 | {'budget': 4} | 5.5% | +0.0% | — | 5.2% | 9,216 | 53.3% | 2 | $1,054 | 0.83 |
| VXR | F19 | 24 | 4 | {'budget': 4} | 4.4% | +0.0% | — | 10.0% | 13,824 | 25.7% | 9 | $1,193 | 1.00 |
| VXRG | F19 | 32 | 4 | {'budget': 4} | 4.4% | +0.0% | — | 17.8% | 18,432 | 23.1% | 6 | $2,016 | 0.67 |
| VXRKG | F19 | 40 | 6 | {'budget': 6} | 4.4% | +0.0% | fired | 17.8% | 31,994 | 33.2% | 6 | $1,728 | 0.67 |
| G | F20 | 8 | 6 | {'budget': 5, 'stagnation': 1} | 10.3% | +0.0% | fired | 1.2% | 12,672 | 34.4% | 1 | $1,298 | 0.10 |
| V | F20 | 8 | 4 | {'budget': 4} | 10.7% | +0.0% | — | 3.7% | 9,216 | 23.4% | 0 | — | 0.75 |
| VG | F20 | 16 | 4 | {'budget': 4} | 5.7% | +10.0% | — | 3.8% | 9,216 | 46.8% | 4 | $4,477 | 0.85 |
| VXR | F20 | 24 | 4 | {'budget': 4} | 4.5% | +0.0% | — | 11.0% | 13,824 | 39.3% | 2 | $1,971 | 0.50 |
| VXRG | F20 | 32 | 6 | {'budget': 6} | 4.0% | +0.0% | fired | 20.5% | 26,624 | 34.5% | 7 | $1,115 | 0.75 |
| VXRKG | F20 | 40 | 4 | {'budget': 4} | 4.0% | +0.0% | — | 15.3% | 22,090 | 25.2% | 7 | $1,896 | 0.90 |
| G | F21 | 8 | 4 | {'budget': 4} | 8.9% | +7.9% | — | 1.4% | 9,216 | 28.2% | 2 | $1,164 | 0.57 |
| V | F21 | 8 | 4 | {'budget': 4} | 9.3% | +0.0% | — | 6.4% | 9,216 | 44.6% | 1 | $515 | 0.47 |
| VG | F21 | 16 | 4 | {'budget': 4} | 5.4% | +5.1% | — | 2.8% | 9,216 | 58.4% | 3 | $1,985 | 0.77 |
| VXR | F21 | 24 | 4 | {'budget': 4} | 4.3% | +0.2% | — | 6.0% | 13,824 | 62.8% | 4 | $2,085 | 0.77 |
| VXRG | F21 | 32 | 6 | {'budget': 6} | 4.7% | +0.0% | fired | 9.5% | 26,624 | 43.8% | 6 | $1,988 | 0.84 |
| VXRKG | F21 | 40 | 4 | {'budget': 4} | 4.2% | +1.8% | — | 15.1% | 22,422 | 37.7% | 7 | $1,449 | 0.90 |
| G | F23 | 8 | 4 | {'budget': 4} | 10.0% | +6.8% | — | 7.7% | 8,554 | 22.0% | 0 | — | 0.41 |
| V | F23 | 8 | 4 | {'budget': 3, 'stagnation': 1} | 10.1% | +0.1% | — | 6.1% | 8,960 | 28.8% | 2 | $338 | 0.32 |
| VG | F23 | 16 | 4 | {'budget': 4} | 5.6% | +7.6% | — | 8.8% | 9,216 | 41.5% | 3 | $2,470 | 0.75 |
| VXR | F23 | 24 | 4 | {'budget': 4} | 4.3% | +3.2% | — | 10.1% | 13,824 | 57.7% | 3 | $1,529 | 0.56 |
| VXRG | F23 | 32 | 4 | {'budget': 4} | 4.7% | +5.9% | — | 19.5% | 18,432 | 40.4% | 4 | $1,727 | 0.38 |
| VXRKG | F23 | 40 | 4 | {'budget': 4} | 4.2% | +0.3% | — | 23.3% | 22,200 | 23.0% | 3 | $1,231 | 0.59 |
| G | F24 | 8 | 4 | {'budget': 4} | 9.9% | +0.7% | — | 3.9% | 8,560 | 36.0% | 4 | −$181 | 0.64 |
| V | F24 | 8 | 4 | {'budget': 2, 'stagnation': 2} | 11.1% | +0.0% | — | 7.6% | 7,744 | 8.5% | 0 | — | 0.81 |
| VG | F24 | 16 | 6 | {'budget': 6} | 5.5% | +0.0% | fired | 5.4% | 13,312 | 58.6% | 3 | $449 | 0.39 |
| VXR | F24 | 24 | 4 | {'budget': 4} | 4.4% | +0.4% | — | 13.2% | 13,824 | 38.6% | 1 | $1,655 | 0.49 |
| VXRG | F24 | 32 | 4 | {'budget': 4} | 4.5% | +0.0% | — | 15.7% | 18,432 | 31.9% | 1 | $2,602 | 0.87 |
| VXRKG | F24 | 40 | 4 | {'budget': 4} | 4.2% | +6.3% | — | 27.9% | 22,162 | 27.9% | 4 | $1,958 | 0.14 |

**Facts (from the table and `outputs/saturation.md`):**

- **Budget-bound, not converged.**
  - **Stops:** 124 of 130 islands stopped on their new-configuration budget; only 6 stopped on stagnation (G-F20,
    V-F19, V-F23, V-F24).
  - **Union rule:** by the protocol's T1 rule (≥ 10% union-hypervolume gain from the last island), every job ended
    saturated; T1 fired and was then exhausted in 5 jobs.
  - **Island trajectories:** within islands, the 32-D and 40-D tracks were still climbing at the end. The median
    island added 10–28% of its final hypervolume in its **last quarter** of generations in VXRG and VXRKG (job
    medians), against 0.3–8% in G and V.
  - So in high dimension more compute would search new ground: the fronts are budget-limited, not converged.
- **The new ground is not where the profit is.** In every pooled track the top of the training frontier is flat:
  - the best not-shortlisted rung-3 configuration is within 0.4–3.0% of the best shortlisted one;
  - each pooled track's best ≥ 64-point non-holder, taken at its highest retained fidelity, is within −3% … +6% of the
    holder.
  - These gaps are smaller than the fidelity noise measured below.
- **Estimation noise and selection optimism** (same configurations re-measured; `outputs/saturation.md`):
  - **Rung 1 → rung 2:** Spearman 0.88 (range 0.14–0.98). Robust profit −4.9% (top decile −6.5%). A 15/16 share keeps
    ≥ 0.90 only 52% of the time.
  - **Rung 2 → rung 3:** Spearman 0.93, −0.9%. **Rung 3 → confirmation:** Spearman 1.00, −0.3%.
  - More rung-1 sampling mostly produces more 16-point winners that regress at the next rung.
- **Overfitting signals:**
  - **PBO:** above 0.5 in 20 of 30 track-folds (F24: G 0.64, V 0.81, VG 0.39, VXR 0.49, VXRG 0.87, VXRKG 0.14).
  - **Training rank versus test-window net** (sealed members): −0.32 to +0.11 on F19–F23 and +0.27 on F24
    (`CHRONOLOGICAL_VALIDATION.md` §5; re-derived as +0.26 [−0.03, +0.51] in `outputs/persistence.md`).
  - **The optimum moves with the window.** The F24 profit holder lies L∞ 0.42–0.97 from the same track's profit
    holder on F19–F23 (table below). One more year of training data relocates the "best" vector across most of the
    box.
- **Dimensionality:**
  - The rung-1 feasible fraction falls from 59% (VG) to 28% (VXRKG).
  - Rung-1 share ≥ 0.90 falls from 74% to 39%.
  - Duplicate proposals: 4–6% at 16–40-D, 9–11% at 8-D (G/V).
  - The pooled tracks nonetheless reach near-complete rung-3 feasibility, so dimension did not prevent finding broad
    neighbourhoods (H3 not supported, as Study 8 reported).

**Dimensionality (F24):**

| track | d | rung-1 archive | rung-1 feasible | rung-1 share ≥ 0.90 | rung-2 feasible | rung-3 feasible | best rung-3 robust/yr |
|---|---|---|---|---|---|---|---|
| G | 8 | 8,560 | 36.0% | 61.1% | 117/192 | 48/51 | $22,926 |
| V | 8 | 7,744 | 8.5% | 64.2% | 8/192 | 11/48 | $8,959 |
| VG | 16 | 13,312 | 58.6% | 73.9% | 190/192 | 48/50 | $28,656 |
| VXR | 24 | 13,824 | 38.6% | 58.9% | 191/192 | 49/49 | $17,159 |
| VXRG | 32 | 18,432 | 31.9% | 50.8% | 187/192 | 49/49 | $25,840 |
| VXRKG | 40 | 22,162 | 27.9% | 38.8% | 191/192 | 52/52 | $23,067 |

**Fold variability:** L∞ distance of each fold's profit holder from the F24 profit holder, and the best rung-3-feasible robust profit/yr per fold (each on its own training window):

| track | F19 | F20 | F21 | F23 | best r3 robust/yr F19 / F20 / F21 / F23 / F24 |
|---|---|---|---|---|---|
| G | 0.55 | 0.89 | 0.63 | 0.65 | $11,538 / $36,366 / $30,409 / $22,394 / $22,926 |
| V | — | 0.57 | 0.68 | 0.57 | $10,599 / $9,693 / $11,105 / $12,450 / $8,959 |
| VG | 0.78 | 0.78 | 0.55 | 0.48 | $23,036 / $44,157 / $40,292 / $29,441 / $28,656 |
| VXR | 0.97 | 0.64 | 0.66 | 0.42 | $17,588 / $30,346 / $26,116 / $21,105 / $17,159 |
| VXRG | 0.78 | 0.89 | 0.81 | 0.87 | $24,335 / $46,280 / $44,142 / $29,965 / $25,840 |
| VXRKG | 0.93 | 0.78 | 0.82 | 0.56 | $26,796 / $48,665 / $38,379 / $28,599 / $23,067 |

### 3.2 Assessment

**"More compute could search new areas" — true, but narrowly.**

- The 32/40-D islands were budget-bound.
- Rung-1 leads (VG 53, VXRKG 21) were never measured above 16 points.
- A larger budget would populate more of the high-dimensional front.

**"More compute would mainly amplify multiple testing and overfitting" — the stronger reading of this evidence:**

- 440,126 rung-1 configurations already exist.
- The top of every pooled frontier is flat within estimation noise.
- PBO is high in most track-folds.
- The training-to-test rank relation is weak.
- The optimum's location is unstable across folds (L∞ 0.42–0.97).

More training-only search under the same objective would most likely deliver more configurations that are
indistinguishable on training and not ordered out of sample.

**Recommendation for Q7: no additional local exploration under the unchanged Study 8 objective.** If any training-side
compute is approved later, the cheapest informative use is precision, not breadth:

- re-measure the existing rung-1 and rung-2 leads above the holders at ≥ 128 points on the F24 training door (§2;
  `outputs/f24-funnel.md` "Rung-1-only leads"; `outputs/f24-overlooked.md`);
- under a predeclared rule, as a new, separately approved study, with 2025–2026 marked exposed.

This audit does not run it.
