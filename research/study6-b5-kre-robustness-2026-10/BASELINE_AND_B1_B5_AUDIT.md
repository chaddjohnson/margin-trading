# Baseline reproduction, the B1 verdict, and the five-ETF B5 neighbourhood gate

Sources: `results/parity/parity.json` (P1/P3/P5), `results/data/data-audit.json`, `results/partA/A1-evidence.json`,
`A2-baseline.json`, `A3-*.json`, and `A5-b1.json`. Conventions are those of PROTOCOL.md §3:
- fixed $100,000 per funded trade, one shared slot, no compounding;
- 11% simple interest on a 365-day year;
- 5 bps per side;
- stops fill at the stop;
- books arm from 2017-06-15.

The minute-sampled maximum drawdown is in dollars ($35,000 = 35% of the $100,000 allocation). All history is
exposed, so everything here is retrospective research.

## 1. Data (append-only audit)

| Symbol | Rows | sha256 (current) | Prefix through 2026-10-13 = B5 pin | Rows appended (12 sessions, 2026-10-14 → 2026-10-29) |
|---|---:|---|---|---:|
| VGT | 934,959 | `624e4094…` | yes (`d8e6991d…`) | 6,767 |
| XBI | 1,180,065 | `83b71f75…` | yes (`9afecc06…`) | 5,267 |
| XRT | 1,073,016 | `c625ca57…` | yes (`ca0fdc6a…`) | 4,765 |
| KRE | 1,131,568 | `fd7ab8aa…` | yes (`40e7bd6c…`) | 5,075 |
| GDX | 1,489,753 | `134b7450…` | yes (`86ce101f…`) | 7,873 |

The calendar has 2,722 NYSE sessions (2016-01-04 → 2026-10-29), and the first eligible session is 2017-06-15. No
historical byte changed, so every difference between the two endpoints comes from the 12 new sessions.

## 2. Frozen B5 at the pinned and the current endpoint (A2; pools CLI = evaluator, P3)

| Item | W13 (→ 2026-10-13, the frozen anchor) | W29 (→ 2026-10-29) |
|---|---:|---:|
| Net (realized + unrealized) | **$486,207.77** (all realized) | **$484,636.97** (realized $486,207.77, unrealized −$1,570.80) |
| Gross before interest and costs | $548,707.56 | $547,397.70 |
| Margin interest | $52,830.14 | $53,041.10 |
| Friction (5 bps per side) | $9,669.66 | $9,719.63 |
| Max minute DD | **$26,509.97** (26.51%), 2020-02-19 12:49 → 2020-03-12 10:23 ET | same |
| Max daily DD | $23,788.61, 2020-02-19 → 2020-03-12 | same |
| Funded lots (open) | 94 (0) | 95 (1) |
| Virtual trades: granted / refused | 172: 94 / 78 | 173: 95 / 78 |
| Occupancy (sessions with a lot) | 55.0% | 55.0% |

Lots and net by book at W29:

| Book | Lots | Net |
|---|---:|---:|
| VGT | 12 | $110,095 |
| XBI | 16 | $53,064 |
| XRT | 4 | $12,842 |
| KRE | 46 | $104,981 |
| GDX | 17 | $203,655 |

**Reconciliation W13 → W29** is lot by lot and exact. Only one lot differs: the **GDX lot entered 2026-10-22**
(09:41 ET) at $82.41 and still open, marked at the 2026-10-29 close of $81.33:
- gross −$1,359.84;
- interest $210.96;
- net −$1,570.80.

That equals the change in net. Interest (+$210.96) and friction (+$49.97, the entry cost) are this lot's.

**Anchor reproduction:**
- `npm run pools -- fixed B5 --end 2026-10-13` gives $486,207.77 / $26,509.97 / 94 lots, the
  `config/pools/B5.json` regression anchor, exactly.
- The evaluator agrees to the cent on both endpoints: P3.
- The fast path equals the authoritative engine in every compared field: P1, 30 comparisons with 0 differences. These
  cover frozen B5 at 0/5/10 bps on W23 and W29, 8 joint and 4 KRE-only perturbed pools at 5 bps, and frozen B5 and two
  perturbed pools at 8% and 14% interest, next-open stops and 25 bps stop slippage.
- Interest, fills, capital contention (refusals, the single slot) and both drawdowns are therefore verified on
  sampled perturbations as well.

## 3. B1 — passes (comparable gate)

**Identity.** "B1" is a distinct, literal benchmark of this repository: **VGT D1 alone (`primary`, d1-ebc9f639b3)**.
- Defined in `src/joint-16-etf-d1/benchmarks.ts:24,31`, `src/d1-robust/final.ts:235` and
  `src/d1-ranked-preemption/controls.ts:53`.
- Anchored in `research/joint-16-etf-d1/results/controls/controls.json`: `all` → 2026-10-13, 5 bps, $176,260.47 /
  $19,534.41 / 21 lots.
- There is no `config/pools/B1.json`.
- `src/recovery-eligibility` uses "B1" for an unrelated diagnostic variant (trough recovery), which is not this
  benchmark.

**This study's gate (A5).** VGT `primary` alone in the fixed $100,000 pool, Study 5 N1 over its 8 parameters, 128
points × 5 replicates:

| Window | Centre net / DD | Share < $35k (each replicate) | p90 DD (replicates) | Probes < $35k |
|---|---:|---:|---:|---:|
| W23 (→ 2023-12-29) | $135,359 / $19,534 | 100% (all five) | $28,056–$28,856 | 100% |
| W29 (→ 2026-10-29) | $176,260 / $19,534 | 100% (all five) | $28,056–$29,112 | 100% |

**Earlier, independently designed tests agree** (recomputed from stored records):

| Source | Design | Window | Share < $35k | p90 |
|---|---|---|---:|---:|
| Study 5 (C1) | the same N1 (128) | → 2023 | 100% | $28,117 |
| d1-robust | ±1 / ±2 steps (n 256 / 128) | → 2023 | 100% / 100% | $27,153 / $30,596 |
| vgt-standalone-vs-pooled-robustness | 2 × 64, relative radius | → 2026-10-13 | 128/128 | $28,501 |

**Verdict: B1 passes** the centre and neighbourhood gates under genuinely comparable definitions. It has no
capital contention (one book), so its pass says nothing about B5.

## 4. Full five-ETF B5 — fails the neighbourhood gate

**Design.** Study 5's N1, reproduced exactly:
- increment r = X 1.0 pt, Y 0.2 pt, stop 1.0 pt, hold 2, L 10, buffer 1.0 pt, P 1.0 pt, W 20;
- LHS offsets rounded to the grid and clipped to the eight-ETF box;
- extended to **all 40 parameters of the five books**;
- 128 points; replicate 1 decisive; replicates 2–5 as Monte Carlo checks.

| Window | Rep 1: share < $35k (unique 128) | Rep 1: p90 | Reps 1–5 share | Pooled (640): share / p90 / median DD | Median net (÷ centre) |
|---|---:|---:|---|---:|---:|
| W23 (Study 5's gate window) | **21.9%** (28/128) | **$55,573** | 21.9, 28.1, 27.3, 28.9, 27.3% | 26.7% / $55,439 / $38,946 | $176,934 (45.5%) |
| W13 | 21.9% | $55,573 | same | same | $240,328 (49.4%) |
| W29 | **21.9%** | **$55,573** | same | same | $240,006 (49.5%) |

**Verdict: FAIL, robustly established.**
- The centre passes: $26,510.
- The neighbourhood does not:
  - share 21.9% ≪ 90%;
  - p90 $55,573 ≫ $35,000;
  - every replicate and every window agrees;
  - the binomial standard error of the pooled share is ±1.7 points.
- The joint share and p90 are identical on W23, W13 and W29: every **breach** has its trough in 2020, 2022 or 2023.
  28 of the 640 pooled neighbours have their worst episode in 2026, but stay below $35,000.
- The all-points convention (Study 5's) gives the same numbers, because no joint draw duplicates another or the
  centre.

Sensitivity designs (never decisive): in-box 32.3% (p90 $60,022); N2 (2× radius) 17.7% (p90 $67,826).

**Comparability with the earlier five-ETF audits** (PROTOCOL.md §6.1; figures recomputed from their stored
records). Every design that perturbs all five books together finds a minority of safe neighbours:

| Source (date) | Design | Window | n | Share < $35k | p90 DD |
|---|---|---|---:|---:|---:|
| b4-b5-robustness-audit (2026-10-27) | 40-D LHS over [v − m, v + m], m = "moderate" (±1.0 pt; relative below 2.0%; ±max(s+1, 20%) for integers), **engine-legal grid (hold may reach 2)** | → 2026-10-13 | 64 + 64 | 25.0% / 20.3% (22.7% pooled) | $65,571 / $56,341 ($61,768) |
| d1-robust-pool-discovery confirm-A (2026-10-25) | every coordinate −1/0/+1 step u (half Study 5's r), reflected | → 2023-12-29 | 256 | 36.7% (≤ $35k) | $53,870 |
| d1-robust confirm-B (post-freeze) | same | → 2023-12-29 | 256 | 33.6% | $54,974 |
| d1-robust A2 (±2u ≈ Study 5's r) | lattice ±2u | → 2023-12-29 | 128 | 25.0% | $65,846 |
| d1-diverse-pool-discovery confirm-A / A2 | as d1-robust | → 2023-12-29 | 256 / 128 | 32.4% / 16.4% | $53,334 / $68,935 |
| **This study, Study 5-style** | 40-D LHS, clip, r | → 2023 / 2026-10-29 | 128 (× 5) | **21.9%** (26.7% pooled) | **$55,573** |

- **Differences that matter:**
  - The b4-b5 audit used the engine's legal grid, so KRE hold could reach 2 days and stops could go below 3.0%.
  - d1-robust/d1-diverse use a discrete ±1 lattice (a smaller radius) and "≤ $35,000".
  - None of these changes the conclusion.
  - Study 5's three-ETF figures (24%; 62% for KRE alone) are a restricted pool and are **not** presented as B5
    results. The five-ETF KRE-only figure is 57.5% (`KRE_SENSITIVITY.md`).
- **Prior per-book evidence of KRE:** d1-diverse's one-book N3 gave KRE 50% ≤ $35k with dd90 **$35,251**. That is
  exactly the drawdown of this study's dominant KRE breach path (`DRAWDOWN_EVENT_LEDGER.md`).
- **The answer:** full five-ETF frozen B5 does **not** pass the 90%-of-neighbours / p90-below-$35,000 gate. It passes
  only the centre condition ($26,510).

**Methodological caveats:**
1. The whole history is exposed. Neighbours of the frozen point are not independent validation, and the frozen point
   is the in-sample maximum: it sits at the 100th percentile of its own neighbourhood's net.
2. The Study 5 radius is a modelling choice. The smaller ±1-step lattice of d1-robust still gives only 34–37%.
3. Clipping at the box puts mass on bounds (KRE X, stop and hold; XBI X and buffer; GDX P). The in-box design (32.3%)
   bounds that effect.
4. The KRE-only breach is knife-edge in money ($35,251 vs $35,000). The joint breaches are not: median DD $38,946,
   p90 $55,573.
