# Diagnostic checkpoint — Part A (frozen five-ETF B5), locked before any Part B search

Every figure below comes from the sealed Part A records listed in `results/diagnostic_manifest.json`, which also holds
their body and file hashes, the code digest, the data hashes and the commands. The manifest and this file are
committed **before** any Part B stage runs. Part B's code refuses to start unless that committed manifest verifies
(`src/study6-b5-kre-robustness/records.ts` `requireDiagnosticCommitted`). Conventions: fixed $100,000 per funded
trade, one shared slot, 11% simple interest, 5 bps per side, stops at the stop. The minute-sampled maximum drawdown
("DD") is quoted in dollars; on the $100,000 allocation, $35,000 is 35%. The gate is DD **strictly** below $35,000.
History 2016-01-04 → 2026-10-29: all of it is exposed, so this is retrospective research (PROTOCOL.md §3.4).

## 0. Engineering and data gates (all passed)

- **P1:** the fast replay equals the full N-book engine in 30 comparisons, with 0 differences on every field. These
  cover frozen B5 at 0/5/10 bps on W23 and W29, 8 joint and 4 KRE-only perturbed pools, and 8%/14% interest, next-open
  stops and 25 bps stop slippage.
- **P3:** `npm run pools -- fixed B5 --end 2026-10-13` gives $486,207.77 / $26,509.97 / 94 lots, the frozen anchor
  exactly. Through 2026-10-29 it gives $484,636.97 / $26,509.97 / 95 lots (1 open), and the evaluator agrees.
- **P5:** the first 8 stored B5 joint samples of the B4/B5 robustness audit reproduce to the cent.
- **P4:** this study's symbol-parametrized "B5 optimizer" reproduces the sealed portfolio-aware GDX search: same
  selected vectors, hypervolume trajectories and objectives.
- **R-OM:** the original multi-etf-d1 KRE search, the method that produced KRE `lowDd`, was run unchanged in a
  detached worktree at `b4f9857` on its archived inputs. It reproduces the sealed record exactly:
  - 22,349 candidates;
  - identical GA hypervolume trajectories;
  - `primary` d1-1956f5b4ca and `lowDd` d1-a389037400 (B5's KRE book), with identical development net, minute DD
    and entries.
- **Data:** every prefix through 2026-10-13 hashes to its `config/pools/B5.json` pin; 12 sessions were appended; the
  data stage passed.

## 1. B1 — **passes** (comparable gate, demonstrated)

B1 is a literal, distinct benchmark: "VGT D1 alone (primary)". It appears in `src/joint-16-etf-d1/benchmarks.ts`,
`src/d1-robust/final.ts` and `src/d1-ranked-preemption/controls.ts`; there is no `config/pools/B1.json`. It is not B5.

- **Gate result (VGT `primary` alone in the fixed $100,000 pool; Study 5 N1 over its 8 parameters; 128 points × 5
  replicate seeds):**
  - Centre DD $19,534.41.
  - 100% of neighbours below $35,000 on every replicate, on both windows (W23 and W29).
  - p90 $28,056–$29,112.
  - All in-box probes below $35,000.
- **Earlier evidence agrees:**
  - Study 5 C1: 100%, p90 $28,117.
  - d1-robust: 100% with p90 $27,153 (±1 step) and 100% with p90 $30,596 (±2 steps).
  - vgt-standalone-vs-pooled-robustness: 128/128.
- **Caveat:** B1 is a single book, so it has no capital contention, and its history is as exposed as B5's.

## 2. Full five-ETF frozen B5 — **fails** the risk gate (robustly established)

| Measure | W23 (Study 5 gate window) | W13 (pinned endpoint) | W29 (full history) |
|---|---:|---:|---:|
| Centre net / DD | $388,489 / $26,510 | $486,208 / $26,510 | $484,637 / $26,510 |
| **Joint N1 rep 1** (40 parameters, 128 points): share < $35k / p90 DD | **21.9% / $55,573** | 21.9% / $55,573 | **21.9% / $55,573** |
| Joint N1 reps 1–5 (range of share) | 21.9–28.9% | same | same |
| Joint N1 pooled (640 points): share / p90 / median DD | 26.7% / $55,439 / $38,946 | same | same |
| Joint N1, in-box design (pooled) | 32.3% / $60,022 | same | same |
| Joint N2 (2× radius, pooled 192) | 17.7% / $67,826 | same | same |

- The verdict is **FAIL** on every window and every replicate:
  - centre DD $26,510 passes;
  - fewer than 30% of neighbours stay below $35,000, against the required 90%;
  - p90 is about $55k, against the required $35k.
- The joint share and p90 are identical on W23, W13 and W29: every breach has its trough in 2020, 2022 or 2023.
  28 of the 640 pooled neighbours have their worst episode in 2026, below $35,000.¹
- **Profit dispersion (W29):**
  - joint N1 median net $240,006 (49.5% of the centre's $484,637), p10 $156,384;
  - the centre sits at the 100th percentile of its neighbourhood (an isolated peak);
  - every neighbour is profitable.
- **Duplicates and clipping:** no exact duplicate vector in any joint set. Clipping hits KRE X, stop and hold, XBI X
  and buffer, and GDX P (`results/partA/A3-*.json` → `families[].reps[].clipping`).
- **Comparable earlier five-ETF evidence**, recomputed from the stored records (PROTOCOL §6.1, `A1-evidence.json`):

| Source | Design | Window | Share < $35k (≤ for d1-*) | p90 DD |
|---|---|---|---:|---:|
| b4-b5-robustness-audit | 40-D LHS, "moderate" relative radius, legal engine grid (not the box), 2 × 64 | → 2026-10-13 | 25.0% / 20.3% (both 22.7%) | $65,571 / $56,341 (both $61,768) |
| d1-robust-pool-discovery | ±1-step lattice, all coordinates (n 256) / ±2-step (A2, n 128) | → 2023-12-29 | 36.7% / 25.0% | $53,870 / $65,846 |
| d1-robust confirm-B (post-freeze) | ±1-step (n 256) | → 2023-12-29 | 33.6% | $54,974 |
| d1-diverse-pool-discovery | ±1-step / ±2-step | → 2023-12-29 | 32.4% / 16.4% | $53,334 / $68,935 |

  Every earlier design and this study's Study 5-style remeasurement agree: the frozen B5 centre is safe, and its
  joint neighbourhood is not. The three-ETF figures of Study 5 (24%, 62%) are **not** used for B5.

## 3. KRE's causal contribution

**KRE is the weakest single book (H2 confirmed).** Per-book N1, clip design, pooled over 5 × 64 points, W29:

| Book | Share < $35k | p90 DD | Median net (÷ centre) |
|---|---:|---:|---:|
| **KRE** | **57.5%** (reps 54.7–59.4%) | $35,252 | $409,398 (84%) |
| GDX | 89.4% (87.5–92.2%) | $35,138 | $392,205 (81%) |
| VGT | 97.8% | $29,460 | $444,070 (92%) |
| XBI | 98.8% | $28,526 | $443,737 (92%) |
| XRT | 100% | $26,510 | $469,943 (97%) |

KRE sits 31.9 points below the next book (GDX), and the ordering is the same on W23.

**The driver is the 4-day maximum hold, not the X entry depth near the 30.0% ceiling (H3).** Freezing one KRE
parameter at a time, on paired points (pooled 320):

| KRE parameter frozen | Share < $35k |
|---|---:|
| hold | **99.1%** (removes ~98% of KRE breaches) |
| X | 57.5% (no change) |
| stop | 56.6% |
| Y | 57.8% |
| L | 57.5% |
| buffer | 58.4% |
| P | 57.5% |
| W | 57.5% |

By hold value, the share of KRE-only neighbours that breach:

| hold | Breach share |
|---|---:|
| **3 days** | **120 / 120** |
| 4 days | 0 / 80 |
| 5 days | 0 / 80 |
| 6 days | 16 / 40 |

On the one-dimensional lines, DD by hold value is:

| hold | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---:|---:|---:|---:|---:|---:|
| DD | **$35,251** | $26,510 | $33,065 | $33,679 | $33,065 | **$44,240** |

The X line is **flat**: DD stays at $26,510 and net at $482k–$485k from 26.9% to 30.0%. The ceiling is not a cliff.

**H4: part of the fragility is clipping, through hold's 3-day floor, not X.**
- Under clipping, 37.5% of KRE draws land on hold = 3.
- The in-box design scores 76.9% (+19.4 points). It still fails.
- X-radius variants (inbox, X ±0.5 / ±2.0 pt) score 77.2% and 77.8%. The half radius scores 75.0%.

**The dominant KRE breach is a knife-edge in money as well:**
- 104 of the 136 KRE-only breaches have DD exactly **$35,251.47**, and 15 more have $35,273. Both are only $251–273
  above the ceiling.
- At 0 bps or with next-open stop fills, the same KRE set passes: 95.3% and 92.2%, p90 $34,963 and $34,925.

**Mechanism of the main KRE episode (2020-Q1, 119 of 136 KRE breaches):**
- Example: KRE hold 4 → 3, other KRE parameters at most a few steps away.
- In frozen B5, the KRE lot of 2020-03-09 exits at the 2020-03-13 open (−$8,258). The slot then passes to XBI
  (−$614) and to GDX on 2020-03-16 (**+$37,416**), and that windfall ends frozen B5's worst drawdown at $26,510.
- With hold 3, the same KRE lot exits a day earlier at a worse open (−$15,717).
- The freed slot goes to a **VGT lot entered 2020-03-12 and held into the crash** (to 2020-03-20).
- That lot **displaces the GDX windfall**, and the drawdown deepens to $35,251 at its 2020-03-18 trough.
- The lot decomposition is exact (residual 0): VGT 2019 lot −$10,783, VGT 2020-02-28 lot +$2,295, KRE −$15,717,
  new VGT lot −$11,047.
- This is capital contention and path dependence. The cause is the hold choice changing which book holds the single
  slot in the March 2020 crash, not KRE's own price risk alone.
- By the predeclared classifier it is "compound": KRE lots 42% of the decline, newly enabled lots 29%, lots shared
  with frozen B5 29%.

**Second KRE episode (2020-Q3, 17 breaches):** hold 6 lets KRE re-enter and lose on maximum-hold exits through the
June–September 2020 regional-bank chop. DD reaches $38,666–$43,829; KRE's own lots are 79% of the decline.

**H5 is not confirmed as worded.**
- Among the 136 KRE-only breaches, the predeclared classes are "compound" 119 and "KRE own excursion" 17. None is
  "enabled/displaced ETF", because the displaced GDX windfall is a missing gain rather than a counted loss.
- The trace shows the mechanism is the slot sequence (above).

## 4. Joint interactions, other books, execution

**Joint decomposition (W29, pooled 640 points, 469 breaches).** Each book's importance is the share of joint breaches
removed by resetting that book to frozen:

| Book | Importance |
|---|---:|
| KRE | **56.3%** |
| GDX | 34.8% |
| VGT | 17.7% |
| XBI | 12.6% |
| XRT | 6.4% |

- **H6 is confirmed narrowly.** The KRE-only variant breaches in 229 cases. **205 breaches persist with KRE frozen.**
- Breach troughs fall in 2020 (148), 2022 (118) and 2023 (203).

**The development window (WDEV, run to 2021-12-31) looks different:**
- Joint share 59.1%, p90 $40,002.
- KRE importance 97.7%, VGT 29.8%, GDX 4.6%.
- GDX's 2022 fragility is invisible before 2022.

**Joint episodes not explained by KRE alone:**
- **2022-Q3:** perturbed GDX books re-enter and lose on maximum-hold exits through the 2022 gold-miner bear. 89% of
  the decline comes from lots frozen B5 never funded.
- **2022-Q4:** XBI, VGT and GDX losses.
- **2023-Q2:** a 2021-10 peak followed by the 2022 bear and the March–May 2023 regional-bank crisis, with KRE
  maximum-hold losses. DD up to $74,413.
- Joint breach classes: "KRE own excursion" 47, "enabled/displaced ETF" 45, "compound" 8.

**Fixed pairs (16-D, pooled 192):**

| Pair | Share < $35k | Independence benchmark | Reading |
|---|---:|---:|---|
| KRE+GDX | **41.7%** | 51.4% | super-additive |
| KRE+XRT | 53.1% | 57.5% | some interaction |
| KRE+VGT | 57.8% | 56.2% | ≈ independent |
| KRE+XBI | 58.3% | 56.8% | ≈ independent |

**Ablations (diagnostic only):**
- **B5 − KRE** (W29) gives $387,857 / DD $25,774. Its worst episode moves to the 2026 GDX decline.
- **"KRE recorded but never funded"** gives a **byte-identical** ledger: under shadow semantics the two scenarios are
  the same.
- Relative to B5 (−$96,780 net), the change splits into:
  - KRE's own funded net lost: −$104,981;
  - other books' lots gained: +$55,924;
  - B5 lots displaced: −$47,723.

**Execution (H7):**
- The frozen centre stays at $26,162–$27,232 DD in every setting: 0/2/10/20 bps, 8%/14% interest, next-open stops,
  10/25 bps slippage.
- The joint N1 verdict is the same in every setting: 18.0–22.7% pass.
- The KRE-only verdict is **not**: it passes at 0 bps and with next-open fills. **H7 is confirmed for the joint
  set and rejected for the KRE set.**

**Path checks:**
- Arming shifts to 2017-12-15 and 2018-06-15 change nothing.
- Isolated flat starts in 2020, 2022 and 2024 all give DD $25,774 (the 2026 GDX episode).
- 2020 is 34.2% of net; the top-3 lots are 23.4%.
- Funding blackout of 2020 leaves $331,476 (DD $25,774).

**Why the centre looks robust:** its drawdown depends on one March 2020 slot sequence. Hold 3 or 8 breaches; hold 5–7
lands $33k–$34k, close to the ceiling. The centre is not far from an exposed failure.

## 5. Consequences fixed for Part B (mechanical, from the protocol)

- **Track J books** (§10.4, WDEV importance): KRE + **VGT** (29.8%). GDX's 4.6% is below half of VGT's, so GDX
  does not join, even though it is the second-ranked book on the full history.
  - This is the protocol's chronology rule at work: the search may not see 2022.
  - Track J runs only if its DEV trigger fires.
- **No post-diagnostic amendment** is made (§9.3). The search sequence and boxes stay as frozen. K-local spans hold
  3–8 and the full KRE box, so the hold driver is inside the search space without any change.
- **Disclosed limitation of the KRE-first design:**
  - 44% of full-history joint breaches do not need KRE (GDX, VGT, XBI in 2022–2023).
  - A KRE-only change cannot remove them, so Track K is not expected to reach a 90% joint share. Measuring that on
    development data, then validation, is the purpose of Part B.
- **Labelling note:** `periods['WF20-SEARCH' | 'WF20-TEST']` inside the Part A point records are the Study 5
  evaluator's windows (2017-06-15 → 2019-12-31 and 2020–2021). They are not this study's walk-forward folds and no
  Part A statistic uses them. Part B computes its own periods (`periods.ts`).

¹ Erratum (2026-10-31, after the checkpoint commit `1d9f6a4`): the committed text read "Every neighbour's maximum
drawdown occurs by 2023, and 2024–2026 adds no deeper episode". The sealed table `results/partA/A3/W29/joint-clip.csv`
shows 28 of 640 neighbours with a 2026 trough, all below $35,000. Only this sentence changed; no record or figure.

