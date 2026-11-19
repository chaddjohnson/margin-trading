# REPORT — Priority 7A: bounded Growth suitability screening across other ETFs

Research only, not deployed. One Growth 1.4.0 book **alone** on one ETF and one fixed **$100,000** principal budget, no
compounding, 5 bps per side, $0 commission, 11% simple interest (365-day basis), canonical sizing, partial exits, minute
marks, **price only** (no dividends or distributions). **DD** is the maximum **minute** drawdown of the marked net; the
ceiling is **$35,000** (35% of the fixed principal, not of peak equity). Every ETF result is an *alternative* use of the
same budget; nothing is summed across ETFs. Historical compliance with the ceiling does not guarantee future drawdown.

- **Development and every choice of ETF and phenotype:** 2016-01-04 → 2024-12-31. **Validation:** 2025-01-02 →
  2026-10-30 (the verified common complete endpoint of all 60 eligible ETFs), opened once after `FROZEN_SELECTION.json`
  was committed. It is **validation on previously examined history, not an untouched holdout**: every eligible ETF was
  examined over 2016–2026 by D1 studies, VGT and GDX by Growth studies, and the transfer vectors were chosen with later
  data in view.
- **Scope:** a bounded *screening* (1,024 new distinct proposals per ETF per cutoff), not an exhaustive optimization. A
  weak result for an ETF means "nothing promising under this budget", not that Growth cannot work on it.
- Every figure comes from sealed records (`results/`); complete tables are in `results/tables/`. Text and tables only
  (standard 2.0.0 §7.7).

## 1. Answers to the brief's six questions

1. **Which new ETFs warrant focused Growth work, and why?** **None convincingly.** The frozen development rule
   shortlisted **XHB, EEM and GLD** (IAU as GLD's close substitute), but 2025–2026 did not support two of the three, and
   the third is marginal:
   - The rule required a qualified C24 member **and** a supported own C19 → C21 → C23 procedure. Only four new ETFs
     passed it (EEM, GLD, IAU, XHB). Each made money in 2020–2024 within the ceiling, but with small sequential nets:
     XHB +$20,467.69, GLD +$11,705.60, IAU +$3,372.78, EEM +$1,996.48.
   - **Validation:** XHB's actual-profit book **lost $14,552.44**; its robust holder and EEM's two books made **no trade
     at all** in 2025–2026 (all four fail V1). Only **GLD** passed V1–V3, at **+$6,152.97**. Its reset drawdown was
     **$32,933.23**, which is $2,066.77 below the ceiling; one lot was still open at the endpoint with a −$22,206.26 mark.
   - If any ETF deserves a further look it is **gold (GLD, with IAU as the substitute control)**. The evidence is weak
     and near the risk limit (§9).
   - The highest development earners were all US technology / growth funds (SMH, IWF, IGV, XLK, VOOG, MTUM). Every one
     failed its own chronological procedure, and they are close substitutes of the VGT control rather than new
     exposures.
2. **Did ETF-specific optimization find something the fixed VGT/GDX transfers missed?** **Often, but not for the
   controls.**
   - 51 of 60 ETFs had a qualified independent member at C24, against 26 with a qualified transfer.
   - Where both lanes qualified (24 ETFs), the ETF-specific actual-profit book earned more in development in 17. The
     fixed transfers earned more in 7: VGT, GDX, VOOG, XLK, XLY, XBI and XME, mostly with 08500a60.
   - For the three shortlisted ETFs the bounded search found books the transfers did not: XHB $82,663.42 against VGT
     #4's $34,631.02; EEM and GLD had no qualified transfer.
   - The screen is weak where focused searches already exist. On GDX it found $17,762.23 against 4A's $139,668.45; on
     VGT $102,096.12 against 08500a60's $115,509.15. A 1,024-proposal screen is a **lower bound** on what an ETF can
     offer.
3. **Broad across episodes and seeds, or one episode?** **Mostly concentrated.**
   - **EEM** is a one-episode system: the March 2020 → February 2021 rebound is 95.0% of its actual-profit book's
     development net. Without new funding in that episode it keeps $2,975.04. It made nothing in 2016–2019, 2024 or
     2025–2026.
   - **XHB** is broader: it was positive in all four development subperiods, its largest episode is 49.7% of net, and
     55% of neighbours recapture the same episode.
   - **GLD**'s 2019–2020 gold episode is 61.3% of net. Its neighbourhoods are mixed (26% recapture), and the 1.5× radius
     family breaches $35,000 in 19.5% of draws.
   - The technology books show "single-episode stability": 82–100% of their neighbours lean on the same 2016–2018 or
     2020–2021 trend.
   - Paired seeds differed by a median 10–24% in best feasible centre net. At C24, 58 of 60 ETFs had feasible results
     under both seeds.
4. **Did the complete ETF-and-phenotype procedure work at earlier cutoffs within $35,000?** **No — UNSUPPORTED.**
   - It picked SMH at C19 (2020–2021: +$10,231.43), XLK at C21 (2022–2023: −$18,873.04, slice DD **$39,287.57**) and IGV
     at C23 (2024: +$10,084.19).
   - The sequential path earned **+$1,292.58** after $150.00 of switch charges, with a **sequential minute DD of
     $57,711.81** (2021-02-16 → 2023-03-13, not recovered by 2024-12-31). The new-ETF procedure (controls excluded)
     chose the same ETFs and failed identically.
   - ETF by ETF, only 5 of 60 own procedures were supported: EEM, GDX (a control), GLD, IAU, XHB. Another 27 lost money
     and breached, 11 lost money, 10 lacked a qualified primary at some cutoff, and 7 breached.
5. **How did the frozen finalists behave in 2025–2026, and what remains unproven?** **7 of 13 frozen rows pass V1–V3;
   the shortlist mostly fails** (§7).
   - Shortlist: XHB −$14,552.44 and $0.00; XHB's VGT #4 transfer −$13,679.39; EEM $0.00 and $0.00; GLD +$6,152.97.
   - The universe primary SMH#1 (a near miss, chronologically unsupported) earned **+$35,685.87**, reset DD $23,306.51.
   - Controls: VGT +$12,982.89, GDX +$37,745.15. Near miss IWF −$17,626.90; IAU +$688.83. Universe lower-drawdown
     holder MTUM +$2,435.70.
   - All seven native full-history targets (VGT #4, 08500a60, 4A's five GDX books) were reproduced exactly.
   - **Unproven:** that any new-ETF Growth book is reliable forward. That SMH's 2025–2026 profit reflects more than a
     continued semiconductor trend (its procedure breached). That GLD's result survives a gold reversal. Any pooled
     contribution beside C4, C4-refined or the L0 primary.
6. **Is further work justified? The proposed 7B scope (not launched).**
   - **Recommendation: stop broad ETF Growth expansion.** The universe screen found development profits everywhere,
     but they did not survive a correct chronological test. The one ETF family that passed every gate and validation
     (gold) did so near the risk ceiling.
   - If the user wants a 7B at all, the narrowest defensible scope is **gold only: a focused standalone GLD Growth
     study**, with IAU as the substitute control and GDX as the existing gold-miner reference (§9). Its 2025–2026 has
     now been examined here, so any 7B validation would be on fully examined history.
   - A prospective shadow observation of the frozen GLD#3 (and, as a technology reference, SMH#1) would add more
     genuinely new evidence than another optimization on 2016–2024.

## 2. What was run

### 2.1 Universe and data (`UNIVERSE_MANIFEST.json`, amendment R1; `results/tables/universe.md`)

- **Inventory:** 64 canonical minute files, exactly the brief's list. They are byte-identical to the files Study 9's S0
  audit verified (Alpaca SIP, raw prices, 2016-01-04 → 2026-10-30). BTCUSDT is outside the study.
- **Rules (frozen before any strategy ran):** Study 9's D1–D5 plus D3b (R1):
  - a complete NYSE calendar from 2016-01-04, checked from timestamps only;
  - integrity;
  - no unexplained split-sized move;
  - no leveraged, inverse, volatility, single-commodity-futures or ETN product;
  - development median daily dollar volume ≥ $10M and median minute coverage ≥ 25%.
- **Eligible: 60 ETFs**, VGT and GDX among them as controls.
- **Untested (separate list):**
  - GDXJ and OIH: the files start 2016-05-02.
  - XLRE: two missing NYSE sessions in early 2016.
  - **XLF** (R1): its 2016-09-19 special dividend in kind (0.139146 XLRE shares, $4.44356 per share; OCC/MIAX memo
    39575) appears as an unadjusted −18.1% overnight move in the price-only data.
  - Every other development overnight move of 15% or more was a market move (March 2020; EWZ 2017-05-18).
- **Splits:** 10 eligible ETFs split inside development and 7 inside validation. Prices are forward-adjusted with the
  repository's registry. The byte-prefix doors apply the same adjustment as the canonical partition loader; gate E7
  proves that for all 60 ETFs.
- **Labels (Study 9; descriptive, never exclusions):** sparse EDV, IGV, IYT, KIE, QUAL, VOOG, VPU; thin DBC, ILF.
- **Clusters:** Study 9's 16 exposure clusters. US technology / growth alone has 8 eligible funds (VGT, XLK, SMH, IGV,
  IWF, VOOG, MTUM, QUAL).

### 2.2 Engine, gates and pilot

- **Engine:** Priority 3's pooled engine, unchanged (sealed evaluation digest `147cad7c…`), with only its Growth slot
  enabled and the ETF's own door in it. This is 4A's standalone path, generalized by door, not by code.
- **Engineering gates** (`results/parity/parity.json`; **730 checks, 0 failed**; sealed before the freeze):
  - **E1** the engine digest;
  - **E2** VGT #4 and 08500a60 on VGT and 4A's five GDX books on GDX reproduce their sealed development centres to the
    cent;
  - **E3** trade-by-trade parity with the canonical `runRiseTrading` + `summarizeSimulation`, run with the true symbol
    on **every eligible ETF** (240 checks);
  - **E4** prefix causality (120); **E5** accounting identities (300); **E6** identity; **E7** the split convention
    (60); **E8** blackout and period semantics.
- **Pilot** (`results/pilot/PILOT.md`):
  - The bench: CPU-bound at ≈ 135–140 evaluations/s on D24, so 8 workers per job and two ETF jobs at a time.
  - Every stage path; study-size sizing.
  - Graceful-stop, worker-kill and whole-unit-kill tests, each resuming to identical records; the
    duplicate-concurrent-key test.
- **Amendments:** R1–R4 before the freeze (the XLF exclusion, the resource contract, pilot fixes, exact proposal
  accounting); A1 after it (a mislabelled report field, §6). The protocol was frozen (`70bda053…`, committed `10aad620`)
  before any study search.

### 2.3 Search, budgets and stopping (`results/tables/coverage-C*.md`, `compute.md`)

| Cutoff | ETFs | New distinct proposals | Fresh simulations | Archive hits | ETFs with a qualified member | Qualified / confirmed / shortlisted members | Wall |
|---|---:|---:|---:|---:|---:|---|---|
| C19 (2016–2019) | 60 | 61,440 | 272,498 | 17,986 | 53 | 97 / 99 / 218 | 13 min |
| C21 (2016–2021) | 60 | 61,440 | 278,833 | 18,658 | 56 | 101 / 104 / 229 | 18 min |
| C23 (2016–2023) | 60 | 61,440 | 264,954 | 17,576 | 54 | 88 / 96 / 232 | 24 min |
| C24 (2016–2024) | 60 | 61,440 | 261,466 | 18,073 | 51 | 89 / 100 / 231 | 27 min |
| Transfer lane (C24) | 60 | 540 exact centres | 39,071 | 7,101 | 26 | — | 7 min |

- **Every ETF received exactly 1,024 new distinct centre proposals per cutoff:**
  - two paired seeds × Rise / breakout cells × (160 screen + 96 island);
  - the screen covered every one of the 64 Rise and 32 breakout gate / eligibility / exit strata.
- **Stopping:** every one of the 960 lanes stopped on its proposal **budget**; no extension was used. This is budget
  exhaustion, not convergence.
- **Per ETF job:** 1,537–6,265 fresh simulations, against a frozen worst case of 6,821. Bond funds were cheapest: few
  plausible centres, so few neighbourhoods.
- **Compute (the archive audit):** **1,188,014 fresh backend simulations** in all, against the 2,000,000 ceiling:
  62,130 pilot, bench and engineering; 1,122,339 study (screens, transfers, diagnostics, validation neighbourhoods);
  3,545 in-process (parity, fold, sequential, diagnostic and validation runs, the pilot's included). Archive hits are counted apart (94,666).
- **Resources:** every heavy stage was a transient unit in `getf.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0).
  - The chain ran 21:15:52Z → 22:57:21Z; validation 22:58Z.
  - Peak unit cgroup 9.44 GB; slice peak 14.8 GB; no memory.high, memory.max or OOM event.
  - The user's Strategy Lab server ran untouched throughout.

## 3. Development: the C24 picture (`results/tables/etf-comparison.md`, `screen-C24.md`, `selection-C24.md`)

| ETF (cluster) | C24 actual-profit book | Centre net | Centre DD | Lots / episodes | Top-episode share | Conf. p10 / p90 DD | Own procedure 2020–2024 | Tier |
|---|---|---:|---:|---|---:|---|---|---|
| SMH (tech) | SMH#1 profit | $111,272.90 | $20,992.82 | 7 / 7 | 41.5% | $73,916.76 / $25,274.69 | +$35,170.87, DD **$67,963.58** | 2 (near miss) |
| IWF (tech) | IWF#1 profit | $98,070.44 | $23,624.47 | 4 / 4 | 44.1% | $76,449.74 / $29,427.30 | +$13,484.67, DD **$38,419.75** | 2 (near miss) |
| IGV (tech) | IGV#1 profit | $97,949.09 | $21,944.68 | 7 / 7 | 32.9% | $46,827.55 / $33,431.15 | +$85.40, DD **$60,321.89** | 2 |
| **XHB** (cyclical) | XHB#1 profit | $82,663.42 | $18,417.09 | 4 / 4 | 49.7% | $22,006.43 / $21,546.24 | **+$20,467.69, DD $18,430.55** | **1 → shortlist** |
| XLK (tech) | XLK#1 profit | $71,900.96 | $28,215.09 | 6 / 6 | 50.7% | $52,133.89 / $32,200.22 | +$23,438.38, DD **$52,081.53** | 2 |
| **EEM** (EM broad) | EEM#1 profit | $59,569.80 | $17,958.93 | 3 / 3 | 95.0% | $787.71 / $19,960.39 | **+$1,996.48, DD $23,196.38** | **1 → shortlist** |
| **GLD** (precious metals) | GLD#3 | $43,278.21 | $21,590.72 | 3 / 2 | 61.3% | $20,384.14 / $25,666.69 | **+$11,705.60, DD $23,706.60** | **1 → shortlist** |
| IAU (precious metals) | IAU#1 profit | $32,498.07 | $10,626.85 | 5 / 5 | 27.9% | $848.85 / $18,231.50 | +$3,372.78, DD $27,533.07 | 1 → substitute of GLD (near miss) |
| VGT (control) | VGT#1 profit | $102,096.12 | $28,909.17 | 5 / 5 | 39.9% | $86,035.83 / $30,075.73 | +$40,662.64, DD **$36,427.00** | control |
| GDX (control) | GDX#3 | $17,762.23 | $19,157.43 | 1 / 1 | 100.0% | $2,176.53 / $19,157.43 | +$42,436.65, DD $26,605.80 | control |

- **The universe C24 roles** (independent; controls included): actual-profit and balanced **SMH#1** ($111,272.90);
  robust-profit SMH#2 (selection robust $90,848.12); lower-drawdown MTUM#3 ($49,429.61, centre DD $16,821.59). The
  new-ETF procedure chose the same members.
- **Shortlist order** (frozen, `results/final/selection-C24.json`):
  - Tier-1 ETFs were ordered by rank(P) + rank(R): XHB (4 + 16), EEM (13 + 9), GLD, IAU.
  - The one-per-cluster rule made **IAU a substitute of GLD** (same exposure).
  - Near misses: IAU, then the Tier-2 leaders SMH and IWF.
- **Development profit is concentrated in a few funds and a few trends.** Six of the ten largest C24 actual-profit
  books (VGT included) belong to US technology / growth funds, each closely tied to VGT's trends. Their held days
  overlap 08500a60's by 80–92% (§8).
- **Bonds, TIPS, high yield and short Treasuries** (AGG, SHY, TIP, HYG, EMB) had no qualified member at C24; LQD, IEF,
  EDV and TLT qualified with small or episodic books. Price-only accounting and 11% financing weigh on them (§10).

## 4. Breadth across episodes and seeds (`results/tables/diagnostics.md`, `coverage-C24.md`)

| Subject | Subperiods 2016–19 / 2020–21 / 2022–23 / 2024 | Largest episode (share) → net without new funding in it | Neighbours recapturing it | Wide (1.5×) breach share |
|---|---|---|---:|---:|
| XHB#1 | $21,936.11 / $19,618.30 / $32,245.18 / $8,863.83 | 2023-10 → 2024-04, $41,109.01 (49.7%) → $41,554.42 | 54.7% (mixed) | 0.0% |
| XHB#2 | $6,770.42 / $29,159.40 / $16,777.11 / $6,049.69 | 2019-01 → 2022-01, $31,828.84 (54.2%) → $26,927.76 | 74.2% | 0.8% |
| EEM#1 | $0.00 / $56,594.77 / $2,975.04 / $0.00 | 2020-03 → 2021-02, $56,594.77 (95.0%) → $2,975.04 | 88.3% (single-episode) | 4.7% |
| GLD#3 | $3,024.05 / $23,513.55 / −$1,201.60 / $17,942.21 | 2019-02 → 2020-08, $26,537.60 (61.3%) → $16,740.61 | 25.8% (mixed) | 19.5% |
| IAU#1 | $5,175.95 / $12,793.78 / $0.00 / $14,528.34 | 2020-04 → 2020-08, $9,060.88 (27.9%) → $23,437.19 | 66.4% | 1.6% |
| SMH#1 | $58,986.57 / $24,475.84 / $4,365.70 / $23,444.80 | 2016-05 → 2018-04, $46,170.59 (41.5%) → $65,102.31 | 92.2% (single-episode) | 1.6% |
| VGT#1 (control) | $46,803.23 / $47,242.29 / −$9,771.35 / $17,821.95 | 2020-05 → 2022-01, $40,767.52 (39.9%) → $61,328.60 | 100.0% (single-episode) | 7.8% |
| GDX#3 (control) | $0.00 / $17,762.23 / $0.00 / $0.00 | 2020-04 → 2020-08, $17,762.23 (100%) → $0.00 | 100.0% | 0.0% |

- **Causal stress:** under the standalone virtual book, blacking out new funding in the top episode removes exactly
  that episode's lots and later decisions are unchanged. The no-new-funding net therefore equals the arithmetic
  subtraction to the cent for every subject; only the drawdown path changes (as 4A found).
- **Sparse books stay eligible and are labelled sparse:**
  - EEM's books hold 14–15% of sessions;
  - GDX#3 holds 3.4% (one lot);
  - XHB#1 holds 35%, GLD#3 37%, the technology books 55–71%.
- **Seeds:**
  - At C24, 58 of 60 ETFs produced feasible rung-1 results under both paired seeds.
  - The two seeds' best feasible centre nets differed by a median 23.7% (10.1% at C19, 13.3% at C21, 18.6% at C23).
  - For the shortlist both seeds found feasible books. XHB's second shortlist member is its seed-alternative.
- **Clipping (process-audit proposal 4):** 0–101 of the 128 selection draws of each subject had at least one clipped
  coordinate (EEM#1 none, GDX#3 101). Local stability is reported on clipped neighbourhoods; it is not regime stability.

## 5. Chronological procedure tests (`results/tables/folds.md`; `results/folds/`)

Each cutoff re-ran the complete 60-ETF screen and selection on its own door. Each cutoff's selection was **sealed and
committed before its slice opened**: C19 `5f115f1e`, C21 `52504dbd`, C23 `b8aace04`.

| Fold | Universe primary (training net / DD / p90 DD / top-episode share) | Slice | Slice P&L | Slice reset DD | ETF fold primaries positive / acceptable | Post-fold cohort acceptable |
|---|---|---|---:|---:|---|---|
| C19 | SMH#1 ($89,038.65 / $24,677.58 / $25,581.78 / 78.0%) | 2020–2021 | +$10,231.43 | $20,719.42 | 22 / 17 of 53 | 34 of 97 |
| C21 | XLK#1 ($128,692.77 / $29,728.53 / $29,996.98 / 70.4%) | 2022–2023 | **−$18,873.04** | **$39,287.57** | 8 / 7 of 56 | 15 of 101 |
| C23 | IGV#1 ($94,564.58 / $15,344.34 / $23,599.38 / 40.7%) | 2024 | +$10,084.19 | $18,417.59 | 11 / 11 of 54 | 17 of 88 |

| Sequential policy 2020–2024 | Net (after charges) | Sequential minute DD | Peak → trough | Verdict |
|---|---:|---:|---|---|
| **Universe procedure** (SMH → XLK → IGV) | +$1,292.58 (charges $150.00) | **$57,711.81** | 2021-02-16 → 2023-03-13, not recovered | **UNSUPPORTED** |
| New-ETF procedure (identical choices) | +$1,292.58 | $57,711.81 | the same | UNSUPPORTED |
| GDX own (control) | +$42,436.65 | $26,605.80 | — | SUPPORTED |
| XHB own | +$20,467.69 | $18,430.55 | — | SUPPORTED |
| GLD own | +$11,705.60 | $23,706.60 | — | SUPPORTED |
| IAU own | +$3,372.78 | $27,533.07 | — | SUPPORTED |
| EEM own | +$1,996.48 | $23,196.38 | — | SUPPORTED |
| VGT own (control) | +$40,662.64 | $36,427.00 | — | UNSUPPORTED (DD) |
| SMH own | +$35,170.87 | $67,963.58 | — | UNSUPPORTED (DD) |
| XLK own | +$23,438.38 | $52,081.53 | — | UNSUPPORTED (DD) |

- **Why the worst DD:** the C21 primary XLK#1 carried a lot bought on 2020-03-27 into 2022 and sold it on 2022-01-21. It
  then took repeated small stop-outs in 2022 (−$5,404.50, −$5,453.63, −$5,153.35 among them). The fold primaries had
  been selected on bull-market training windows (their largest episodes were 70–78% of training net at C19 and C21).
- **Local stability is not chronological reliability:** every fold primary passed its 384-draw confirmation (p90 DD
  ≤ $35,000), yet the C21 slice breached the ceiling.
- **The 2022–2023 slice was hostile to almost every ETF's selection:** only 8 of 56 fold primaries made money there.
  Among the 60 own procedures, 5 were supported; 27 lost money and breached; 11 lost money within the ceiling; 10 had
  a cutoff with no qualified primary; 7 made money but breached.
- **Separating the evidence:** ETF-specific chronological support exists for gold (GLD, IAU; and GDX), XHB and EEM —
  each with small 2020–2024 nets. The overall ETF-and-phenotype procedure failed. A good final phenotype does not repair
  that.

## 6. The transfer lane (`results/tables/transfer.md`)

- **Plausible C24 centres per vector** (of 60 ETFs): 4A's primary T5 32, P08 T7 31, 08500a60 T2 26, 4A informed#2 T6
  23, C4-refined's book T3 22, VGT #4 T1 20, the L0 primary's book T4 19, Appendix A T9 9, P09 T8 4.
- **Qualified per vector:** T2 9, T5 6, T3 4, T6 4, T7 4, T1 2, T4 1.
- **Coverage:** 26 ETFs had a qualified transfer; 2 of them (EFA, XLP) had no qualified independent member.
- The transfers are informed hypotheses: none was selectable, none eliminated an ETF, none entered an earlier cutoff.
- Native development figures (gate E2) and native full histories (§7) reproduce exactly. The C4-refined and L0-primary
  VGT books, run standalone for the first time here, earned $150,361.50 and $131,607.86 over the full history, with
  validation $45,685.62 and $51,395.60 (no prior standalone target existed).
- **Amendment A1 (report-only):** the sealed sequential record's per-part `sliceDd` field is the reset DD from the
  boundary to 2024-12-31, not to the slice end. Every slice DD in this report comes from the sealed fold evaluations.
  The verdicts, nets and sequential drawdowns are unaffected (the slice P&L was cross-checked to the cent).

## 7. Validation (FULL, once; `results/tables/validation.md`)

| Frozen member (why) | Development net | Validation P&L | Reset val. DD | Whole-run net | Whole-run DD | Lots after 2024 | V1–V3 |
|---|---:|---:|---:|---:|---:|---:|---|
| XHB#1 (shortlist actual-profit) | $82,663.42 | **−$14,552.44** | $15,590.63 | $68,110.98 | $25,792.18 | 4 | fails V1 |
| XHB#2 (shortlist robust, balanced, lower-DD) | $58,756.61 | $0.00 | $0.00 | $58,756.61 | $18,421.44 | 0 | fails V1 |
| XHB / VGT #4 transfer (informed) | $34,631.02 | −$13,679.39 | $16,751.47 | $20,951.63 | $21,593.59 | 5 | fails V1 |
| EEM#1 (shortlist actual-profit, lower-DD) | $59,569.80 | $0.00 | $0.00 | $59,569.80 | $17,958.93 | 0 | fails V1 |
| EEM#2 (shortlist robust, balanced) | $52,862.42 | $0.00 | $0.00 | $52,862.42 | $19,041.93 | 0 | fails V1 |
| **GLD#3** (shortlist, every role) | $43,278.21 | **+$6,152.97** | **$32,933.23** | $49,431.19 | $32,933.23 | 4 (1 open) | pass |
| IAU#1 (near miss) | $32,498.07 | +$688.83 | $10,902.24 | $33,186.90 | $10,902.24 | 2 | pass |
| SMH#1 (universe primary; near miss) | $111,272.90 | **+$35,685.87** | $23,306.51 | $146,958.76 | $23,306.51 | 1 | pass |
| SMH#2 (universe robust-profit) | $109,962.31 | +$32,682.86 | $23,306.51 | $142,645.16 | $23,564.56 | 1 + 1 carried | pass |
| MTUM#3 (universe lower-DD) | $49,429.61 | +$2,435.70 | $8,726.93 | $51,865.31 | $16,821.59 | 2 | pass |
| IWF#1 (near miss) | $98,070.44 | −$17,626.90 | $28,259.31 | $80,443.54 | $28,259.31 | 4 | fails V1 |
| VGT#1 (control) | $102,096.12 | +$12,982.89 | $19,238.41 | $115,079.01 | $28,909.17 | 2 | pass |
| GDX#3 (control) | $17,762.23 | +$37,745.15 | $28,126.55 | $55,507.38 | $32,985.25 | 4 | pass |

- **No row breaches the ceiling** in validation or over the whole run. GLD's reset DD ($32,933.23) runs 2026-01-29 →
  2026-10-30 and had not recovered at the endpoint. At 14% interest it reaches $34,790.76 (still passing); at 10 / 20
  bps it reads $33,026.62 / $33,213.13.
- **GLD's 2025–2026 lots:** +$4,353.59 (Mar–May 2025), +$12,136.13 (Sep–Oct 2025), +$11,869.53 (Dec 2025 – Jan 2026),
  and one lot open since 2026-03-19 at −$22,206.26.
- **Validation-window neighbourhoods** (report-only; 128 draws):
  - SMH#1: 100% positive, median +$32,100.86; 4 of 128 whole-run drawdowns above $35,000;
  - GLD#3: 94.5% positive, median +$10,001.90, p90 reset DD $33,176.40, 5 of 128 above $35,000;
  - XHB#1: 3.9% positive, median −$12,196.67;
  - EEM#1: 61.7% of draws made no trade, 38.3% positive.
- **Native reproduction:** VGT #4 $145,468.46 / $14,578.10 / 13 lots / validation $52,892.75; 08500a60 $160,974.09 /
  validation $45,464.93; 4A's primary, informed#2, P08, P09 and Appendix A ($141,157.37; validation $87,340.87) — all
  **exact**.
- **Integrity scan 2025–2026:** no overnight move of 15% or more in any validated ETF; the registered validation-window
  splits (IWF, VGT) were applied.
- **Buy-and-hold references** (report-only, financed at 11% on $100,000, bought 2016-01-04 and held): validation-window
  P&L of +$90,135.28 (GLD), +$1,051,285.40 (SMH), −$30,443.58 (XHB) and +$41,050.02 (EEM), with validation-window
  reset drawdowns from $38,892.35 (EEM) to $640,669.19 (SMH). That is a different, unbounded risk (shares bought in
  2016, never resized), and these are never a gate.
- **No validation-driven change:** the shortlist and the 7B export stay as frozen; nothing was searched, retuned or
  swapped after FULL opened.

## 8. Overlap with VGT Growth and the known portfolios (report-only; `results/tables/diagnostics.md`)

The share of each subject's development held days that fall on days when the reference was invested is a hypothesis
about complementarity, not a pooled result. The references are VGT #4 and 08500a60 run standalone, and the frozen
development ledgers of the 5B L0 primary, C4-refined and C4.

| Subject | Held days | VGT #4 | 08500a60 | L0 primary (any lot / Growth lots) | C4-refined | C4 |
|---|---:|---:|---:|---|---|---|
| XHB#1 | 798 | 68.2% | 99.9% | 80.6% / 58.2% | 83.3% / 71.4% | 68.4% / 60.7% |
| EEM#1 | 332 | 24.1% | 70.8% | 81.0% / 0.0% | 72.6% / 22.0% | 74.7% / 24.1% |
| GLD#3 | 829 | 36.6% | 67.3% | 61.3% / 27.4% | 63.5% / 39.6% | 47.4% / 29.8% |
| SMH#1 | 1,393 | 55.3% | 85.6% | 77.9% / 51.1% | 77.2% / 55.1% | 69.9% / 51.3% |

- XHB's books are invested almost only when 08500a60 is: they add no new timing to VGT Growth.
- EEM and GLD overlap least with the portfolios' Growth books: EEM 0–24% (its one 2020 episode), GLD 27–40%. GLD is the
  only one of the two with more than one episode, which makes it the only plausible complementarity hypothesis.
- A complete shared-pool rerun would be needed before any statement about pooled profit. No standalone winner is added
  to C4, C4-refined or the L0 primary, and standalone weakness does not prove an ETF could never contribute in a pool.

## 9. Recommendation and the proposed 7B scope (not launched)

- **Recommendation: do not expand Growth across ETFs.** The screen's development profits are real on paper but
  concentrated in US technology funds that duplicate VGT. The full ETF-and-phenotype procedure breached the ceiling in
  2022–2023. Two of the three chronologically supported new ETFs failed 2025–2026 outright (XHB lost; EEM never traded).
- **If the user still wants 7B**, the precise defensible scope is **7B-gold**:
  - **What it is:** a focused standalone GLD Growth optimization at 4A's scale: about 16,384 proposals per cutoff,
    rungs 16 / 64 / 128, refinement, the same gates and $35,000 ceiling.
  - **Lanes:** an independent lane repeated at C19 / C21 / C23 / C24; an informed lane seeded with this study's frozen
    GLD#3 and IAU#1 (labelled informed).
  - **Controls:** IAU as the substitute control, run under the identical instrument; GDX as the gold-miner reference.
  - **Report:** the gold episodes (2019–2020, 2023–2024, 2025) beside profit; whether the 2026 open-lot drawdown pattern
    recurs.
  - **What it cannot be:** an untouched validation. 2025–2026 gold history is now examined, so its forward evidence
    would have to come from **prospective shadow observation** (process-audit proposal 6).
- **Not recommended for 7B:** SMH and the other technology funds (VGT substitutes, chronologically unsupported), XHB and
  EEM (failed validation; EEM is a single 2020 episode), the bond funds (no qualified Growth books under price-only
  financing), and the untested GDXJ, OIH, XLRE and XLF (they would need data work first, outside this study).
- **Unchanged:** Priority 4B and broader allocation research stay deferred. Every existing candidate identity and prior
  verdict is preserved. Nothing starts automatically.

## 10. Limitations

- **Previously examined history.** Both windows were examined before. The universe is today's repository inventory
  (survivorship and availability bias). The boxes, the design and the transfer vectors were written with earlier
  studies in view. Fresh seeds are not fresh data.
- **A bounded screen:** 1,024 proposals per ETF per cutoff (16× smaller than 4A), rung fidelities 8 / 32, no
  refinement. Calibration: the screen found $17,762.23 on GDX where 4A found $139,668.45.
- **Price only, uniform 11% financing.** Distributions are not credited. Bond, high-yield and dividend funds are
  understated relative to total return; their financing cost dominates.
- **One history; few independent episodes; correlated funds.** Eight technology funds share the same trends. GLD and
  IAU hold the same metal. EEM and IEMG share most constituents.
- **Data labels:** IGV (the C23 primary), VOOG, IYT, KIE, QUAL, VPU and EDV are sparse in parts of 2016–2019. Their
  minute marks are thinner, and their fills assume trading at bar prices.
- **Standalone only:** nothing here measures a pooled contribution. Historical compliance with $35,000 is not a
  guarantee of future drawdown.

## 11. Reproduce

`RUN_COMMANDS.md` (from the repository root). Sealed stages refuse to rerun; an interrupted ETF job resumes from its
archive. The job archives (`.cache/growth-etf-screening/jobs/`, git-ignored, regenerable) are listed with sizes and
sha256 in `results/archive-manifest.json`.

```
npm run research-preflight -- --study research/growth-etf-screening
npm run getf -- verify
npm run getf -- audit-compute
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/growth-etf-screening/tables.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/growth-etf-screening/tests/*.test.ts
```

## Review points (nothing started)

1. Accept the reading: no new ETF shows convincing Growth evidence. The universe procedure is chronologically
   unsupported. The shortlist (XHB, EEM, GLD) mostly failed 2025–2026; only GLD passed, near the ceiling.
2. Decide on 7B: stop this line (recommended), or approve the narrow **7B-gold** scope (§9) with prospective shadow
   observation as its source of new evidence.
3. Priority 6 is recorded as reviewed; 4B and broader allocation research stay deferred.
