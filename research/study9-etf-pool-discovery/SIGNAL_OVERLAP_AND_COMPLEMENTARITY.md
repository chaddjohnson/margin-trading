# S2 — signal timing, collision and complementary opportunities (training only)

**What S2 measures:**

- **The door:** one training door holding all 61 eligible ETFs (2016-01-04 → 2024-12-31, arming 2017-06-15, $100k,
  11%, 5 bps).
- **The vectors:** fixed generic vectors from S1.
- **The engine:** the actual one-slot replays, with no re-optimization and no rule change.

**Records:**

- `results/s2/s2.json` (chain phase `s2`, `86354abb…`);
- tables `results/tables/s2-*`:
  - `s2-pairs.csv` (all 1,830 pairs);
  - `s2-pairs-top.md`, `s2-groups.md`, `s2-events-alpha.md`;
  - `s2-contention.csv` (718 replays) and `s2-contention-summary.md`;
  - `s2-candidates.md`, `s2-assignments.csv`.

## 1. Vector assignments (measurement instruments, pool-independent)

Every ETF has nine fixed vectors, used in every pool it joins:

- **α and β:** the best plausible vector of each independent design half;
- **γ1–γ4:** seeded draws from its four-vector menu;
- **δ1, δ2 and ε:** two seeded draws from all its plausible vectors, and its lowest-occupancy plausible vector.

The last three are not chosen by standalone profit. S2's matrices and contention use α and β; S3 uses all nine.

**The anchors are weak under generic vectors.** Standalone on the training window:

| Anchor | α net | α DD | Lots | Occupancy |
|---|---:|---:|---:|---:|
| VGT | $43,626 | $34,040 | 16 | 33% |
| GDX | $99,836 | $38,257 | 28 | 26% |

The optimized B1 earned $135,359 on the same window. The generic instrument therefore measures *where* contention
and complementarity arise; it does not measure what an optimized pool would earn.

## 2. Pairwise timing, collision and correlation

**Measures:**

- the ±5-session one-to-one decision match (Study 2's definition);
- the entry-in-holding collision;
- the median timing offset;
- the daily return correlation;
- the D1 equity-change correlation, all under α and β.

**The most overlapping pairs** (α, both sides ≥ 4 decisions):

| Pair | ρ (daily returns) | α match min (A→B / B→A) | β match min | α collision A→B / B→A | α equity ρ | α offset (sessions) |
|---|---:|---:|---:|---:|---:|---:|
| EEM–IEMG | 1.00 | 1.00 (1.00 / 1.00) | 1.00 | 0.78 / 0.67 | 0.92 | 0.0 |
| GLD–IAU | 1.00 | 1.00 (1.00 / 1.00) | 1.00 | 0.84 / 0.74 | 1.00 | 0.0 |
| KBE–KRE | 0.99 | 0.90 (0.95 / 0.90) | 0.49 | 0.90 / 0.44 | 0.81 | 0.0 |
| IJR–XLI | 0.87 | 0.86 (0.86 / 0.86) | 0.75 | 0.57 / 0.71 | 0.76 | 0.0 |
| IWF–VOOG | 0.99 | 0.79 (0.79 / 0.85) | 0.59 | 0.43 / 0.85 | 0.95 | 0.0 |
| IJH–RSP | 0.96 | 0.75 (0.75 / 0.75) | 0.54 | 0.50 / 0.75 | 0.75 | 0.0 |
| EFA–VGK | 0.97 | 0.71 (0.83 / 0.71) | 0.28 | 0.50 / 0.57 | 0.56 | 0.0 |
| EFA–XLI | 0.81 | 0.71 (0.83 / 0.71) | 0.50 | 0.50 / 0.43 | 0.62 | 0.0 |
| EEM–EWY | 0.86 | 0.67 (0.67 / 0.86) | 0.40 | 0.44 / 0.43 | 0.39 | 1.0 |
| EEM–RSP | 0.73 | 0.67 (0.89 / 0.67) | 0.29 | 0.56 / 0.50 | 0.42 | 0.0 |
| EWY–IEMG | 0.87 | 0.67 (0.86 / 0.67) | 0.40 | 0.29 / 0.56 | 0.34 | 0.5 |
| IEMG–RSP | 0.74 | 0.67 (0.89 / 0.67) | 0.29 | 0.44 / 0.58 | 0.40 | 0.0 |
| VIG–XLV | 0.86 | 0.62 (0.62 / 0.62) | 0.14 | 0.38 / 0.62 | 0.73 | 0.0 |
| VPU–XLU | 0.99 | 0.62 (0.62 / 0.71) | 1.00 | 0.75 / 0.29 | 0.91 | 0.0 |

**Correlation and timing diverge:**

- 62 pairs have a return correlation ≥ 0.90, but only 18 of them match ≥ 50% of decisions under α;
- two low-correlation pairs (DBC–SPLV, HYG–TLT) still match ≥ 50%.

As in Study 2, correlation alone neither proves nor rules out duplicate opportunity.

**VGT and GDX are almost disjoint in timing:**

- the α match is 0.14 / 0.25 (each direction) and the return correlation 0.19;
- VGT has 16 decisions, GDX 28;
- each has only 4–6 independent events.

## 3. Near-duplicates and opportunity sources

**Edges.** A pair is an edge if its return correlation is ≥ 0.95, or its match is ≥ 0.80 under both α and β with a
correlation ≥ 0.80. There are 26 edges.

**Groups** (complete linkage, one cluster, ≤ 3 members). Twelve are non-trivial:

- {EDV, TLT}, {EEM, IEMG}, {EFA, VGK}, {EWZ, ILF}, {GLD, IAU}, {IJR, IWM, IWN};
- {IWD, RSP}, {IWF, VOOG}, {KBE, KRE}, {USMV, VIG}, {VGT, XLK}, {VPU, XLU}.

**Single linkage would have chained 14 US-equity ETFs into one component:** IJH, IJR, IWD, IWF, IWM, IWN, QUAL, RSP,
SPLV, USMV, VGT, VIG, VOOG and XLK. That is the over-pruning risk the methodology review flagged (C1). Twelve merges
were refused: 8 for size, 3 as not complete, 1 as cross-cluster.

**Direct proxies:**

- **VGT:** IWF, VOOG and XLK.
- **GDX:** none.
- **Forbidden:**
  - in G: VGT and its proxies;
  - in N: VGT, GDX and VGT's proxies;
  - in V: GDX.
- **Redundant proxies kept on replay evidence:**
  - V: IWF, VOOG and XLK;
  - VG: VOOG and XLK. IWF was excluded from VG for adding no net under α or β.
- **SMH, a near-tech ETF that is not a proxy.** SMH is in VGT's cluster (us-tech-growth): return correlation 0.90 with
  VGT, decision match 0.50 (α) / 0.56 (β). Both are below the frozen edge thresholds (0.95, or 0.80 under both
  vectors), so SMH is not a VGT proxy. The N family admits it, and it appears in N candidate lists and N pools. N
  results that contain SMH carry VGT-like tech exposure and should be read accordingly.

## 4. Event families: correlated ETFs are not independent opportunities

**Coverage.** Across the 61 ETFs' 868 α decisions there are 99 families. **26 are market-wide** (≥ 10 ETFs) and
hold **607 decisions (70%)**. Only 18 families are solo.

**When they happened:**

- **2020: eleven families.** From 2020-02-27 to 2020-11-09; the largest, 2020-03-13 → 03-27, involved 45 ETFs and
  83 decisions.
- **2022: ten families.** From 2022-04-29 to 2022-11-08.
- **2021: two families** (2021-01-20 and 2021-02-22).
- **One each** in Q4 2018 (21 ETFs), March 2023 and late September–October 2023.

**The median ETF has 72% of its decisions in market-wide families.** For VGT the figure is 63%, for GDX 54%. The 61
ETFs are therefore far from 61 independent sources, which confirms Study 2's finding (66% of decisions in 21
families) on this longer window.

## 5. Capital-slot contention against all four family anchors

**The replays.** For each anchor policy, every candidate added under α and under β:

- V = {VGT}, G = {GDX} and VG = {VGT, GDX};
- N: three training-only seeds, **XLF, IWM and XLB** — the top three by the ETF order outside the anchors' clusters,
  one per cluster and per group.

Each pair is replayed in the actual one-slot allocator, giving 718 replays.

| Policy | Anchor α net / DD | Candidates adding net (mean of α, β) | Best five by mean Δnet/yr (α, β) | Median accepted / refused lots (α) | Median displaced anchor lots (α) | Share with higher DD (α) | Lots in market-wide windows (median, α) |
|---|---|---:|---|---|---:|---:|---:|
| V {VGT} | $43,626 / $34,040 | 31 / 60 | KRE $5.7k, IYT $5.1k, KBE $3.8k, EWZ $3.7k, INDA $2.9k | 5 / 5 | 2 | 28% | 63% |
| G {GDX} | $99,836 / $38,257 | 27 / 60 | XOP $7.2k, SMH $5.6k, INDA $5.1k, EWW $4.7k, KRE $4.7k | 8 / 4 | 3 | 27% | 74% |
| VG {VGT, GDX} | $80,806 / $46,207 | 28 / 59 | IYT $9.2k, XLE $9.0k, KRE $7.3k, XOP $5.7k, XLF $5.4k | 4 / 6 | 2 | 17% | 67% |
| N1 {XLF} | $31,758 / $26,543 | 30 / 60 | XLK $6.8k, KRE $5.8k, EWZ $5.1k, XHB $5.0k, VGT $4.8k | 9 / 2 | 4 | 55% | 74% |
| N2 {IWM} | $67,230 / $19,958 | 43 / 60 | GDX $9.3k, XLK $7.2k, QUAL $4.6k, VGT $4.2k, KBE $3.9k | 8 / 4 | 4 | 50% | 64% |
| N3 {XLB} | $41,593 / $34,310 | 35 / 60 | KRE $6.7k, XLK $5.5k, XHB $5.3k, XOP $5.0k, KBE $4.8k | 6.5 / 4 | 3 | 20% | 67% |

**What the table shows:**

1. **About half the universe adds net to any one-book anchor, and the gains are small** ($2–9k/yr). They are
   comparable to the noise between generic vectors (§1). No candidate transforms an anchor.
2. **The slot binds.** A candidate takes a median of 4–9 lots, but has 2–6 of its decisions refused and displaces 2–4
   anchor lots. Most added lots fall inside market-wide windows (63–74%): the candidate mostly re-times the same
   crashes rather than adding independent events.
3. **Idle-slot opportunity is real against a single low-occupancy anchor.** Under α:
   - the median candidate enters 28–71% of its virtual trades while the anchor is idle (β: 23–82%);
   - 70–88% of candidates make standalone money on those idle trades (β: 56–85%).

   **This differs from Study 2's result against B5.** There the slot was held about half the time and idle trades
   lost money. The difference is mostly the anchor's occupancy: a 26–33% generic single book leaves more room than
   the five-book B5. A pool built to fill that room is exactly what S3 tests, with every book's own leave-one-out.
4. **Risk.** Adding a book raises the combined minute DD in 17–55% of cases. Against the N1 anchor (XLF, low DD) the
   median increase is $969.

## 6. Candidate lists for S3 (≤ 12 per family)

Predeclared:

- **9 primary:** by mean marginal Δnet/yr, risk-filtered, one per group. For N, the 3 seeds plus 6.
- **3 exploratory:** by distinctness, from the protected list, with cluster coverage first.

| Family | Seeds | Primary | Exploratory |
|---|---|---|---|
| V | — | KRE, IYT, EWZ, INDA, XLF, IWM, IGV, FXI, IJH | EMB, EWJ, DBC |
| G | — | SMH, EWW, KRE, IWM, IYT, XLI, ILF, XHB, MTUM | XLE, XBI, XLB |
| VG | — | IYT, XLE, XLF, SMH, ILF, USMV, IJH, IGV, XRT | FXI, EMB, XLB |
| N | XLF, IWM, XLB | KRE, XHB, IYT, EDV, EWZ, FXI | XLP, XBI, SMH |

**Notes on the lists:**

- **No primary candidate is risk-flagged,** so none needed the fallback.
- **XOP is G's best marginal candidate** ($7.2k/yr), but no G list includes it: its combined DD is ≥ $35k in both
  replays. It remains possible in S3's random exploratory pools.
- **KRE appears in V, G and N; IYT in all four.** Both are strong pooled complements under every generic anchor.

## 7. Acceptance, exclusion and exploration (transparent)

- **No ETF was removed for poor marginal trades against B5, or for correlation alone.** Exclusions are only:
  - each family's forbidden symbols (the anchors and the anchors' direct proxies in families that must not contain
    them);
  - redundant proxies without replay gain (IWF in VG).
- **The degenerate "weak but distinct" list.** Because no ETF has a Study 8-feasible standalone vector, the frozen
  weak-but-distinct rule admits 43 ETFs (`STANDALONE_SCREEN.md` §4). It does not discriminate. S3's cluster-diverse
  stream is therefore effectively "random pools from distinct clusters". This is disclosed, not repaired after the
  fact.
- **The protected list** (one per cluster) guarantees every cluster a route into the exploratory streams:
  DBC, EFA, FXI, IEMG, ILF, XLE, XLB, SLV, EDV, IWM, IYT, XLP, XLF, IBB and SMH.
