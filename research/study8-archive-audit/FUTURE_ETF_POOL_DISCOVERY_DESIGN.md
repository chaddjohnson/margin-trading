# Future ETF pool discovery — design proposal only

**Question 8.** This is a proposal for a future, separately approved study.

- **Nothing in it was run:** no ETF optimization, pool evaluation or replay was performed by this audit.
- **No Study 8 fitness, gate or protocol change** is implied.

## 1. What is actually available (read from the repository)

**Inventory.** `scripts/etf_inventory.py` → `outputs/etf-inventory.md` / `.csv`. It reads metadata only: each
`data/<SYMBOL>/dataset-report.json`, and the first and last line of each file.

- **64 local minute-bar datasets. 61 form the canonical list:** `eligible` in
  `research/d1-robust-pool-discovery/results/audit/universe.json` (identical to the d1-ranked-preemption copy; declared
  in `src/d1-robust/context.ts`).
- **Not canonical:** GDXJ and OIH start on 2016-05-02 (the "late" cohort); XLRE is excluded for missing NYSE sessions
  (2016-01-25, 2016-02-16).
- **Coverage is unequal at the end.**
  - Only the five B5 books (VGT, XBI, XRT, KRE, GDX) run to 2026-10-29.
  - The other 59 end on 2026-10-13.
  - Any common window, or forward period, needs a data refresh first, recorded with its hashes.
- **Data quality flags** (dataset reports):
  - **Sparse sessions** (fewer than half their regular minutes): VOOG 1,798, EDV 1,455, IYT 814, VPU 787, KIE 646,
    QUAL 478, IGV 424, MTUM 225, XLRE 173, DBC 53, ILF 10, OIH 2.
  - **Registered reverse splits:** OIH 2020-04-15, XOP 2020-03-30, EWJ 2016-11-07.
- **Families**, from the repository's own labels: universe.json `category`, and the standalone audit's
  `src/d1-standalone-opportunity-audit/context.ts` `clusters`.

| cluster (repository label) | canonical members |
|---|---|
| us-tech-growth | IGV, IWF, MTUM, QUAL, SMH, **VGT**, VOOG, XLK |
| precious-metals | **GDX**, GLD, IAU, SLV |
| us-healthcare-biotech | IBB, **XBI**, XLV |
| us-cyclical | IYT, XHB, XLI, XLY, **XRT** |
| us-financials | KBE, KIE, **KRE**, XLF |
| us-broad-size-factor | IJH, IJR, IWD, IWM, IWN, RSP, SPLV, USMV, VIG |
| us-defensive | VPU, XLP, XLU |
| energy | XLE, XOP |
| materials-metals-mining | XLB, XME |
| broad-commodities | DBC |
| rates-credit | AGG, EDV, EMB, HYG, IEF, LQD, SHY, TIP, TLT |
| developed-ex-us | EFA, EWJ, VGK |
| em-broad | EEM, IEMG |
| em-asia | EWY, FXI, INDA |
| em-latam | EWW, EWZ, ILF |

**Repository-stated overlaps.**

- Near-identical D1 entry timing (`research/d1-all61-signal-capital-complementarity/PAIRWISE_SIGNAL_TIMING_AND_OVERLAP.md`):
  - 1.00 for IWD–RSP, IWD–SPLV, RSP–SPLV and VPU–XLU;
  - 0.91 for IJR–IWN; 0.88 IJH–KIE; 0.84 KBE–KRE.
- VGT–VOOG daily return correlation 0.97 (`research/multi-etf-allocator/SIGNAL_OVERLAP_AND_DENIALS.md`).
- GLD and IAU are both physical-gold trusts.
- **A future screen must treat each such group as one opportunity source**, not several independent trials.

## 2. What the existing evidence already says (verified citations)

1. **Most other ETFs' signals arrive when the slot is busy, and idle-time trades do not pay**
   (`research/d1-all61-signal-capital-complementarity/FINAL_COMPARISON_AND_RECOMMENDATION.md`;
   training 2017-06-15 → 2023-12-29):
   - **0 of 18** predeclared fold replays met the complementarity test.
   - Idle-clean trades against B5 net **−$52,477** in total; only ILF is positive (+$13,020, one event).
   - The B5 slot is held about half the training era (51–52% of session-minutes).
   - **66% of the uniform rule's 816 decisions fall in 21 market-wide event families** (COVID, Q4 2018, 2022). The 61
     are far from independent.
2. **No standalone ETF has a stronger historical case than VGT `primary`** under that study's predeclared rules
   (`research/d1-standalone-etf-opportunity-audit/FINAL_COMPARISON_AND_RECOMMENDATION.md`). Its shortlist was XME, GDX,
   KBE, SLV, FXI, IJH, XLB, MTUM, XHB, EWW and EDV.
3. **Neighbourhood-based pool scores did not predict the next two years** (Spearman 0.023 against −0.006 for raw net;
   `research/d1-robust-pool-discovery/RECOMMENDATION.md`).
4. **Wide standalone libraries:** 413,280 new-search vectors over the 61; no arm improved; the 61 are "far from 61
   independent trials" (`research/d1-wide-library-chronological-selection/MULTIPLE_TESTING_AND_EVIDENCE_LIMITS.md`).
5. **Joint search over 16 ETFs** evaluated 36,513 configurations. Its best pool is "the maximum of 36,513 correlated
   trials" (`research/joint-16-etf-d1/README.md`).
6. **Study 8 itself** (this audit):
   - Adding books does not raise the training frontier: the best F24 robust profit is VG $28.7k > VXRG $25.8k >
     VXRKG $23.1k (rung 3).
   - Five-book pools reach broad neighbourhoods but earned less in 2025–2026 than VG/VXRG.
   - **More ETFs is not better under one funded slot.**
7. **GDX's own record is mixed:**
   - its acceptance into B5 was gated on 2024–2026 data (portfolio-aware study);
   - it is the largest leave-one-out contributor in B5 (Study 6 A6: −$146k on W23);
   - it is the most boundary-bound book in Study 8 (G's profitable vectors are the least robust).

## 3. Design principles

1. **Do not presume VGT or GDX.** Every pool-size stratum is split into four families with **equal search budgets**:
   1. VGT without GDX;
   2. GDX without VGT;
   3. both;
   4. neither.
2. **Shared-slot replay only.** Every incremental effect of adding or removing a book is measured by an actual
   shared-slot replay with fixed vectors. It is never a sum of standalone profits.
3. **One opportunity source per overlap group** (§1), and one book per near-duplicate group in any pool.
4. **Training-only selection with a fixed exposure statement.**
   - Selection uses 2016-01-04 → 2024-12-31, in expanding folds like Study 8.
   - 2025-01-02 → 2026-10-13/29 is **exposed**: report-only, never a selection input.
   - The only clean evaluation is **forward**, after a freeze, on sessions after the last refreshed bar.
5. **Bounded multiplicity, counted and disclosed.** Every evaluated vector, pool and seed is counted. PBO/CSCV is
   reported per stage. Budgets are predeclared, and none are added after results are seen.

## 4. Proposed stages (each a separate gate; all on training data)

| stage | what | inputs | output | bound |
|---|---|---|---|---|
| S0 eligibility | coverage, sparse sessions, splits, data refresh to a common end; collapse overlap groups | the 61 canonical files | eligible list with hashes; one representative per overlap group, chosen by data quality, not performance | — |
| S1 standalone viability | D1 standalone opportunity on fixed, *unoptimized* phenotype families (the incumbent registry vectors and a small predeclared grid), not a fresh optimization | S0 list | per ETF: after-interest, after-friction net, episodes, lots, p10 of a small neighbourhood, best-year share | ≤ 64 vectors per ETF; reuse `npm run standalone-opportunity-audit` doors capped at 2024-12-31 |
| S2 timing and contention | pairwise decision-timing overlap, event-family membership, occupancy, idle-slot opportunity against each family's anchor | S1 survivors | complementarity matrix; drawdown-regime correlation (per-ETF D1 equity curves); duplicate detection | reuse `npm run d1-signal-complementarity` (doors already cap reads at 2023-12-29; extend to 2024-12-31 only by an explicit new door) |
| S3 marginal shared-slot contribution | for each family anchor, add or remove one book in an actual replay; record Δnet, Δmedian, Δp10, Δminute DD, displaced and added lots, refusals, occupancy, interest | S2 shortlist (≤ 12 ETFs per family) | marginal-contribution table; for pools of ≤ 5 books, exact Shapley-style attribution over all 2ᵏ ≤ 32 subsets (replays, not sums) | ≤ 12 ETFs × 4 families |
| S4 pool candidates | forward selection by S3 marginal contribution under the risk ceiling, pool sizes 2–5, per family | S3 | ≤ 3 pools per family and size, i.e. ≤ 4 × 4 × 3 = 48 pools; predeclared | 48 pools |
| S5 joint optimization | Study 8's unchanged instrument (or an approved revision) on ≤ 8 pools, chosen by a predeclared training rule | S4 | shortlists, PBO, fold persistence | ≤ 8 × Study 8 budget, scaled by s(d) |
| S6 evaluation | exposed 2025–2026 reported descriptively; frozen forward shadow only | S5 holders | forward record | — |

**Combination bound.** Unrestricted, C(61, 2..5) = 6,508,822 pools. The design restricts it to:

- ≤ 12 ETFs per family after S2;
- forward selection instead of enumeration;
- ≤ 48 S4 pools and ≤ 8 joint optimizations.

Every count is reported.

**Metrics.** Every pool and marginal step reports:

- after-interest and after-friction net, neighbourhood median and p10;
- minute and daily DD, and the joint full-dimensional share;
- episodes, lots, occupancy, displaced trades;
- best-year and top-trade concentration;
- the stress set (10 bps, 14%, next-open, +25 bps).

**Explicitly acknowledged:**

- the 61 are correlated (66% of decisions in 21 event families);
- data coverage differs: two late starters, and 59 files ending 2026-10-13;
- 2025–2026 is exposed for all of them.

## 5. Why this ordering

Prior studies found that standalone strength and pairwise complementarity rarely survive the single shared slot.
Most entries collide in the same market-wide events, so the binding questions are S2 and S3 (contention), not S1.

The design therefore spends its replay budget on marginal shared-slot effects before any joint optimization, and caps
the joint optimizations. Study 8 showed that joint optimization can always find broad training neighbourhoods
(440,126 configurations), but not that they rank out of sample.
