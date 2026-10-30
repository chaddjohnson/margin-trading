# Recommendation

## Audit verdicts

1. **B1** (VGT D1 alone, `primary`): **passes** the comparable gate.
   - Centre DD $19,534.
   - 100% of 128-point N1 neighbours below $35,000 on all five replicate seeds and on both W23 and W29.
   - p90 $28.1k–$29.1k.
   - Earlier, independent designs agree.
2. **Frozen five-ETF B5: fails** the Study 5 risk gate. The failure is robustly established.
   - The centre passes: DD $26,509.97 (26.5%).
   - The neighbourhood does not: 21.9% of joint N1 neighbours below $35,000 (p90 $55,573) on replicate 1, 21.9–28.9%
     across five replicates, 26.7% pooled.
   - This holds on W23, W13 and W29, and under every cost, interest, fill and slippage setting (18.0–22.7%).
   - Every earlier five-ETF design agrees: 16–37%.
   - The three-ETF Study 5 figures were not used for this.
3. **KRE is the weakest book, and its weakness is the 4-day maximum hold, not the 29.9% entry depth.**
   - KRE alone: 57.5% of neighbours below $35k, against GDX 89.4%, VGT 97.8%, XBI 98.8% and XRT 100%.
   - Freezing the hold restores 99.1%; freezing X changes nothing; the X line is flat from 26.9% to 30.0%.
   - Hold 3 breaches in every draw ($35,251). The cause is the March 2020 slot sequence: KRE exits a day earlier, a VGT
     lot takes the slot into the crash, and frozen B5's +$37,416 GDX lot of 2020-03-16 is displaced. That is capital
     contention and path dependence, not KRE's price alone.
   - Holds 5–7 land at $33k–$34k.
   - The breach is $251 over the ceiling: it disappears at 0 bps or with next-open stop fills.
4. **KRE is not the whole story.**
   - Resetting KRE removes 56% of joint breaches. The other 44% come from GDX, VGT and XBI re-entering through the 2022
     bear and the 2023 bank stress.
   - KRE+GDX together are super-additive (41.7% against an independence benchmark of 51.4%).
   - In the development window alone, KRE explains 98% of joint breaches. That is why a development-only search could
     not see the 2022–2023 failure mode.

## Improvement attempts (Part B; protocol frozen before Part A; optimizer access to development data only)

| Track | What was tried | DEV result | Validation (→ 2023) | Full history (→ 2026-10-29) |
|---|---|---|---|---|
| **K** (KRE only, robustness-first) | 4,096 Sobol vectors (local + wide), successive halving on a robust neighbourhood score, coordinate refinement; 26,366 runs | best joint share 82% (frozen B5 59%); none passes the DEV gate | 18.8–34.4% | 21.1–35.9%; centre net 86–95% of frozen B5 |
| **J** (KRE + VGT, triggered; books by the predeclared DEV rule) | 4,096 Sobol vectors (16-D), successive halving; 14,545 runs | all four pass the DEV gate (91–98%) | **23.4–30.5%** (collapse) | 22.7–33.6%; centre net 75–83%; FX net −$35k vs frozen |
| **O-ME** (multi-etf-d1 method that produced KRE `lowDd`, reproduced bit for bit) | original code with a development-window adapter | rediscovers the frozen `lowDd` region (hold 4, X ≈ 29%) | 21.9% / 30.5% | 22.7% / 27.3% |
| **O-PA** (the B5 optimizer, reproduced bit for bit) | original Stages A–C for KRE in the five-ETF pool | Track P: nothing robust; Track S: fails its own T1–T3 | 39.8% (best of all) | 35.2%, p90 $50,008, centre net 87% |
| PBO (64 Track K vectors, CSCV) | — | — | **0.50** | — |

**No candidate qualified.** Every one fails Q2, the 90% joint-neighbourhood gate. Many also fail E1 (robust profit) or
Q4 (2020 > 50% of net). No role was assigned and nothing was nominated.

## Go / no-go (PROTOCOL.md §11.4)

**Decision under the predeclared rule: "partial improvement only".** O-PA-S and O-ME-primary improved frozen B5's
validation p90 by ≥ $5,000 ($57,088 → $51,700 and $51,659) while failing the hard gate. In substance this is
**no credible improvement**:
- the best neighbourhood share is 35–40% against a 90% requirement;
- p90 stays above $50k against a $35k ceiling;
- the partial improvers give up 6.5–12.7% of centre net, and O-ME-primary's p90 gain shrinks to $891 on the full
  history;
- **frozen B5 lies on the net-vs-risk Pareto frontier**, and no five-ETF candidate dominates it;
- the paired bootstrap of daily differences is negative for every candidate.

**Frozen B5 remains the benchmark.** Every new configuration in `config/research-pools/study6-b5-kre-robustness/` and
`config/research-phenotypes/study6-b5-kre-robustness/` is **research only**, labelled with the gates it failed. None
is recommended, and **nothing may be merged or deployed** without the user's explicit review and approval.

## What this means

- **The risk statement for B5 is about its neighbourhood, not its point.** The historical $26.5k drawdown depends on
  one March-2020 slot sequence and on the frozen books' 2022 entry timing. Typical nearby parameter choices draw down
  $39k (median) to $55k (p90). Plan risk on the neighbourhood: treat a $35k+ drawdown as plausible, as the B4/B5
  robustness audit already advised for the portfolio measure.
- **Re-tuning one book cannot fix a shared-slot pool**, because fixing one book's sequence moves the fragility to
  another. Within the rules held fixed here (shadow books, one slot, these five ETFs), no bounded phenotype search
  found a region where every book's neighbourhood is safe at once (`CANDIDATE_ROBUSTNESS.md` §3).
  - A genuine robustness gain would need something this study was forbidden to change: an allocator or risk rule, a
    different universe, or a sizing change.
  - This is stated as a hypothesis for the user. It was not tested.
- **The development window cannot show the 2022–2023 failure mode.** Any further search on 2016–2026 is search on
  observed data. If the user wants evidence about B5's real risk, the defensible next step is the already-frozen
  **prospective shadow observation** (`research/prospective-b4-b5-shadow/`, zero observations so far). Monitor the
  minute drawdown with the frozen kill-switches; do not re-tune.

## Limitations

- **All history through 2026-10-29 is exposed.** Every figure here is retrospective research, and nothing is a
  holdout. The 12 post-2026-10-13 sessions hold one open GDX lot.
- **The neighbourhood radius is a modelling choice**, Study 5's ±2 steps. The smaller ±1-step lattice of d1-robust
  gives 34–37% for B5, so it does not change the answer.
- **The KRE-only breach is knife-edge** ($251 over the ceiling). The joint breaches are not: median $38.9k.
- **Clipping at box bounds** inflates the KRE-only failure by about 19 points (in-box design 76.9%). It still fails.
- **A few independent stress episodes** (2020, 2022, 2023) drive every result. No test here establishes a statistical
  edge or a probability of future drawdown.
- **The WF19 walk-forward replication produced no candidate.** Its predeclared concentration filter is unattainable
  with two lots in 2017–2019. WF20's picks under-performed frozen B5 in their 2021 test year.
- **Not in scope:** the actual portfolio, the VOOG/VGT core and 20%-of-equity margin; quote-level fills; broker
  mechanics.
