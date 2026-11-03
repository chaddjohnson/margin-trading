# S3 — actual shared-slot pool replays and marginal contribution (training only)

**Scope:**

- **The window:** the training door only (2016-01-04 → 2024-12-31, arming 2017-06-15, $100k fixed slot, 11%,
  5 bps).
- **The engine:** the authoritative one-slot replay, never a sum of standalone results.
- **The vectors:** fixed generic vectors. No joint optimization was run.

**Records** (chain phases `s3-screen` `6b8ffb50…`, `s3-high` `a1bc1514…`, `s3-nominate` `ca143ba6…`):

- `results/s3/screen/<F><k>.json`;
- `results/s3/mid-<P>.json` and `high-<P>.json`;
- `results/s3/nominations.json`;
- tables `results/tables/s3-*`:
  - `s3-proposals.csv` (every proposal);
  - `s3-high.csv`, `s3-subsets.csv`, `s3-fidelity.csv`, `s3-vs-null.csv`;
  - `s3-strata.md`, `s3-td3.md`, `s3-nominations.md`, `s3-queue.md`;
  - `s3-batchA.md`, `s3-batchB.md`, `s3-comparators.md`, `s3-track-sets.md`, `s3-expansion-inventory.md`.

**Every figure here is a training-window figure measured with generic vectors.** The incumbents are measured with the
same instrument, but at their *optimized* vectors (their exposure is stated in §6).

## 1. The proposal ledger

| | Count |
|---|---:|
| Strata (4 families × sizes 2–5) | 16 |
| Proposals (hard budget ≤ 96 per stratum) | **1,303** |
| … exhaustive (V2 59, G2 56, VG2 1, VG3 59) | 175 |
| … exhaustive over the S2 candidate lists (V3, G3, VG4, N2: 66 each) | 264 |
| … round-robin beam / swaps (8 strata × 48 / 24) | 384 / 192 |
| … exploratory, uniform / cluster-diverse (12 + 12 in each of 12 strata) | 288 |
| Unique configurations screened (≤ 9 generic assignments each, de-duplicated) | 11,427 |
| Uniform null pools (outside the budget, never nominated) | 576 |
| Neighbourhood points / replays in the screen | 327,306 / 333,458 |
| Mid-precision (64 independent points) | 15 per stratum where available |
| High-precision (Study 8's joint 384-point instrument per pool) | **103** proposals + 4 Study 8 track sets + 13 incumbents |
| Study 8-feasible (C1–C7 on the 384 points) and passing Q7 | 21 |
| … also passing the complementarity test I1 and I2 | **6 (the nominations)** |

**Trials per family** (unique configurations; equal budgets, unequal exhaustive coverage):

| Family | Trials |
|---|---:|
| V | 3,036 |
| G | 2,883 |
| VG | 2,204 |
| N | 3,304 |

The N family also has a best-of-the-universe seed layer (S2). Every rejected or skipped child is counted by reason in
`s3-strata.md`.

**The exploratory share** is 288 of 1,303 proposals (22%): 25% outside the four exhaustive strata, within the brief's
20–25%.

## 2. What the one slot does as pools grow (every proposal, best configuration, at the centre)

| Size | Pools where every book's leave-one-out Δnet/yr > 0 | Median refused decisions | Median lots displaced by another book |
|---|---|---:|---:|
| 2 | V 44/59, G 33/56, N 73/90 | 6–8 | 6–8 |
| 3 | V 43/90, G 56/90, VG 34/59, N 44/96 | 15–20 | 11–17 |
| 4 | V 27/96, G 33/96, VG 34/90, N 25/96 | 29–37 | 21–27 |
| 5 | V 13/96, G 13/96, VG 13/96, N 11/96 | 44–56 | 25–38 |

**More ETFs is not better under one funded slot.** At five books fewer than one pool in seven has every book adding
money. Refusals roughly double with each added book from two to four books, and grow about ×1.5 from four to five. The earlier studies' central finding holds on the longer window.

## 3. High-precision results by stratum (the 3 best of each stratum's ≤ 7 finalists, decisive 384 points)

**Tags:** F = Study 8-feasible and passes Q7; C = complementary (I1 and I2); x/− = not.

| Stratum | Best high-precision pools: robust/yr, share, p90 DD, tag |
|---|---|
| V2 | VGT+KBE $10.2k, 88%, $35.3k, xC · VGT+DBC $8.7k, 86%, $35.8k, xC · VGT+IJR $7.8k, 66%, $38.3k, xC |
| V3 | **VGT+IWM+XLF $9.3k, 98%, $32.0k, FC** · VGT+DBC+XLF $8.9k, 90%, $35.0k, x− · VGT+IJH+XLF $7.6k, 92%, $34.7k, x− |
| V4 | VGT+IEMG+XHB+XLF $9.9k, 92%, F− · VGT+IJH+IWM+XLF $9.5k, 93%, F− · VGT+DBC+EWZ+FXI $8.6k, 92%, F− |
| V5 | best VGT+KRE+EWW+IYT+XLK $10.5k, 57%, $45.1k; none feasible |
| G2 | GDX+SMH $17.7k, 76%, $40.8k, xC · GDX+MTUM $14.9k, 76%, xC · GDX+IWM $14.4k, 64%, xC |
| G3 | KRE+GDX+MTUM $19.7k, 77%, $40.4k, xC · GDX+MTUM+SMH $18.0k, 84%, x− · GDX+ILF+MTUM $15.5k, 85%, x− |
| G4 | KRE+EWW+GDX+MTUM $27.2k, 90%, $34.3k, F− (MTUM adds only $383/yr) · **KRE+GDX+ILF+MTUM $25.9k, 91%, $31.6k, FC** · KRE+GDX+ILF+IYT $21.1k, 89%, x− |
| G5 | KRE+EWW+GDX+ILF+MTUM $25.5k, 91%, $32.6k, F− · KRE+GDX+ILF+MTUM+SMH $25.5k, 86%, x− · KRE+EWW+GDX+IWM+MTUM $24.1k, 90%, x− |
| VG2 | VGT+GDX $9.6k, 78%, $38.5k (the only VG pair; a Study 8 track set, so a control) |
| VG3 | VGT+GDX+XHB $14.4k, 72%, $40.3k · VGT+GDX+IYT $14.3k, 50% · VGT+GDX+IWM $12.7k, 89%; none feasible |
| VG4 | VGT+EWW+GDX+SMH $14.8k, 67%, $48.2k; none feasible |
| VG5 | VGT+EWW+GDX+IYT+XLF $18.4k, 77%, $40.3k; none feasible |
| N2 | **SMH+XHB $10.0k, 96%, FC** · **EDV+XHB $9.8k, 92%, FC** · **IWM+SMH $8.2k, 96%, FC** |
| N3 | SMH+XHB+XLF $10.2k, 95%, F− · **EDV+IWM+XLF $10.0k, 97%, FC** · EDV+XHB+XLB $10.0k, 90%, F− |
| N4 | EDV+SMH+XHB+XLF $10.6k, 93%, F− · EDV+KBE+SMH+VIG $10.3k, 62% · EDV+XHB+XLB+XLF $9.7k, 88% |
| N5 | best EDV+IWM+XHB+XLB+XLF $9.7k, 89%; none feasible |

**Two different economies appear:**

1. **The G family's KRE + GDX core.** Pools built on KRE and GDX, plus ILF or EWW and MTUM, earn **$24–27k/yr robust
   profit with generic vectors.** That is about the level of Study 8's *optimized* VG holders on the same instrument
   (§6), with shares at the 90% edge (Wilson bound about 88%) and p90 DD of $31–35k.
   - KRE and GDX are each infeasible alone: centre DD $43k and $38k, shares 14% and 5%.
   - In one slot they hold each other's slot through each other's crashes, and the pool's DD falls to about $25k.
   - This is genuine shared-slot complementarity: the leave-one-out margins are +$10.6k (KRE) and +$14.6k (GDX).
2. **Every other Study 8-feasible pool** (V, N; no VG pool is feasible): **$8–11k/yr** robust with generic vectors.
   - Infeasible pools elsewhere reach more: VG up to $18.4k/yr, non-KRE G pools such as GDX+SMH $17.7k/yr. But at
     50–89% shares and p90 DD above $35k.
   - Several are broad and safe (96–98% shares, p90 ≤ $33k).
   - Their economics resemble optimized B1 ($8.0k) and the generic VG pair ($9.6k), far below the optimized
     incumbents ($23–29k).

**VG adds nothing in this instrument.** No VG pool is feasible at any size: adding books to {VGT, GDX} with generic
vectors raises the drawdown above $35k before it raises the median. So **VG is declared negative** for Phase A.

This is a statement about generic vectors only. Study 8's optimized VG holders are among the strongest configurations
known (§6).

## 4. The six nominations

They are qualified under the frozen rules: decisive Study 8 feasibility, Q7, and complementarity I1 (every book adds
≥ $1,000/yr of robust profit against its leave-one-out subset, measured on the same 384 points) and I2.

| Stratum · slot | Pool | Decisive robust/yr | Median / p10 per yr | Share (WLB) | Band | p90 DD | Centre net/yr | Centre DD | Min I1 margin | Null percentile |
|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|
| G4 · profit-1 | **KRE+GDX+ILF+MTUM** | **$25,879** | $28,740 / $23,019 | 90.9% (88.2%) | diagnostic (uncertain) | $31,583 | $29,018 | $24,926 | $2,141 (MTUM) | 100% |
| N3 · profit-1 | EDV+IWM+XLF | $10,031 | $11,637 / $8,425 | 97.1% (95.4%) | preferred | $31,841 | $16,599 | $18,791 | $1,814 | 98% |
| N2 · profit-1 | SMH+XHB | $10,030 | $11,839 / $8,221 | 96.1% (94.1%) | preferred (uncertain) | $32,674 | $14,046 | $29,504 | $2,776 | 98% |
| N2 · profit-2 | EDV+XHB | $9,808 | $10,963 / $8,652 | 92.2% (89.6%) | diagnostic (uncertain) | $32,585 | $12,770 | $29,504 | $2,385 | 98% |
| V3 · profit-1 | VGT+IWM+XLF | $9,300 | $10,997 / $7,603 | 97.9% (96.3%) | preferred | $32,031 | $14,664 | $17,089 | $1,347 (VGT) | 98% |
| N2 · profit-3 | IWM+SMH | $8,212 | $10,592 / $5,832 | 95.6% (93.5%) | preferred (uncertain) | $33,149 | $12,878 | $24,204 | $3,819 | 94% |

**For every nominee:**

- every Q7 stress passes: the worst stressed net is ≥ 92% of base and the stressed DD stays ≤ $30k;
- Q8 is met;
- the null percentile is the independent 64-point robust/yr against the stratum's 64-point null distribution.

**Four-objective non-dominance** within each stratum's high-evaluated pools (PROTOCOL §8.6): every nominee is
non-dominated except **IWM+SMH**, which SMH+XHB dominates.

**SMH in the N family.** SMH is in VGT's cluster: return correlation 0.90, decision match 0.50 / 0.56. It is below the
frozen near-duplicate thresholds, so it is not a VGT proxy, and N admits it. SMH+XHB and IWM+SMH therefore carry
VGT-like tech exposure. N excludes only VGT's direct proxies (XLK, IWF, VOOG).

**KRE+GDX+ILF+MTUM** (the only nomination in the G family, and the strongest pool found):

| Aspect | Figures |
|---|---|
| Activity | 60 lots, 17 episodes; occupancy 49%; interest $38.2k; costs $6.1k; 49 refused decisions |
| Time split (TD1) | EARLY $26.6k/yr, LATE $24.9k/yr (both halves positive) |
| Ex-2020 | $18.4k/yr |
| Concentration | best year 2020 = 35% of net; top lot 16%; March–April 2020 22%; market-wide windows 54% |
| Contributions (Shapley, conditional on the vectors) | GDX $12.9k, KRE $8.1k, ILF $5.2k, MTUM $2.9k |
| Accepted lots / refusals by book | KRE 16 / 25; GDX 20 / 8; ILF 20 / 10; MTUM 4 / 6 |

Its weak points:

- **The share sits at the 90% edge.** The Wilson lower bound (88.2%) is below the gate.
- **The in-box check (Q2b, report-only) fails:** share 83%, p90 $42.6k. Some coordinates sit within the radius of a
  box bound.
- **The worst neighbour reaches $58k DD.**
- **ILF is a *thin* ETF:** median $31.6M a day, and a $100k lot is 2.9 times the median minute's dollar volume.
- **MTUM is the marginal book** (+$2.1k/yr).

**The other five nominees are broad and safe but modest.** Each earns $8–10k/yr robust with generic vectors.
VGT+IWM+XLF (97.9%, WLB 96.3%) already exceeds optimized B1's robust profit on the same instrument ($8.0k at 100%).

## 5. Subsets, leave-one-out and contribution (conditional on the fixed vectors)

`s3-subsets.csv` holds every subset (≤ 31 plus the empty set) of every high-precision pool at the centre.
`s3-high.csv` holds the Shapley-style contributions and leave-one-out deltas. Two patterns:

- **In the KRE + GDX family the fifth book subtracts.** In KRE+EWW+GDX+ILF+MTUM, EWW's and ILF's leave-one-out
  margins are −$842 and −$1,887/yr on the decisive points, although each is positive in a 4-book pool. Books compete
  for the same crash windows; adding the second Latin-American fund mostly re-times the same lots.
- **Leave-one-out and Shapley disagree when interactions are strong.** A book can carry a positive Shapley value
  (EWW +$2.6k) and still lower the full pool. That is why the nomination gate uses the leave-one-out on the decisive
  points, not Shapley.

**Standalone trade quality is not funded-slot value:**

- KRE alone: $11.6k/yr at the centre, with a $43k DD.
- KRE in the G4 nominee: +$8.1k Shapley and +$10.6k leave-one-out, while 25 of its decisions are refused.

## 6. Comparison with the frozen controls (identical instrument, identical training door)

| Configuration | Vectors | Centre net/yr | Centre DD | Decisive robust/yr | Share | p90 DD |
|---|---|---:|---:|---:|---:|---:|
| **S8 #2 VG balanced (user's preference)** | optimized | $34,532 | $17,281 | **$26,844** | 97.7% | $24,314 |
| S8 #1 VG profit | optimized | $32,456 | $27,343 | $29,428 | 94.8% | $29,021 |
| S8 #3 VXRG profit | optimized | $24,842 | $17,744 | $26,123 | 94.5% | $30,167 |
| S8 #8 VXRKG profit | optimized | $29,788 | $25,616 | $22,835 | 97.7% | $32,246 |
| S8 #12 G profit | optimized | $21,127 | $30,359 | $19,925 | 90.4% | $34,909 |
| S8 #15 VXR profit | optimized | $22,082 | $22,020 | $17,215 | 98.4% | $26,677 |
| B5 frozen | registry | $54,759 | $26,510 | $19,177 | 27.6% | $56,411 |
| B1 frozen (VGT primary) | registry | $17,962 | $19,534 | $8,019 | 100% | $28,141 |
| **KRE+GDX+ILF+MTUM (new, G4)** | **generic** | $29,018 | $24,926 | **$25,879** | 90.9% | $31,583 |
| EDV+IWM+XLF (new, N3) | generic | $16,599 | $18,791 | $10,031 | 97.1% | $31,841 |
| VGT+IWM+XLF (new, V3) | generic | $14,664 | $17,089 | $9,300 | 97.9% | $32,031 |
| Study 8 VG set | generic | $14,208 | $25,560 | $9,608 | 78.1% | $38,483 |
| Study 8 VXRKG set (B5 books) | generic | $25,604 | $40,443 | $15,199 | 2.6% | $63,624 |

**The seeds behind these figures.** The incumbents' rows use Phase A's per-pool 384-point seeds, so they differ
slightly from Study 8's sealed confirmations, which parity P3 reproduced exactly:

| Holder | Study 8 sealed | Here |
|---|---|---|
| #1 | 96.4% / $29.3k | 94.8% / $29.4k |
| #2 | 97.9% / $27.1k | 97.7% / $26.8k |

That roughly 1.6-point seed variation is the precision of any single 384-point share, G4's 90.9% included.

**Exposure of the comparators:**

- The Study 8 holders were fully optimized on this same 2016–2024 window, so their training figures are in-sample
  maxima of about 440k configurations.
- B1 and B5 were chosen with 2024–2026 hindsight.
- The new pools' generic figures are neither optimized nor hindsight-selected, but they are the best of 1,303 pools ×
  ≤ 9 assignments (§7).

**How much optimization lifts a pool.** On the same instrument, optimization lifted Study 8's own sets from generic to
optimized robust profit by:

| Set | Generic | Optimized | Lift |
|---|---:|---:|---:|
| VG | $9.6k | $26.8–29.4k | about ×3 |
| VXR | $3.3k | $17.2k | ×5 |
| VXRG | $5.8k | $26.1k | ×4.5 |
| VXRKG | $15.2k | $22.8k | ×1.5 |
| G | $13.0k | $19.9k | ×1.5 |
| V | $6.1k | $8.8k | ×1.45 |

The G and V rows use S1's best standalone generic vector (80 points); the other rows use the decisive 384-point
instrument.

The rank correlation between the generic and the optimized robust profit across these six sets is only **ρ ≈ 0.26**.
**A generic screen ranks pools only weakly by their optimized potential.** This is the central limitation of Phase A.

## 7. Multiplicity, false-discovery and time diagnostics

- **Selection inflation is small at the finalist level.** From the 16-point best-of-9 screening statistic to the
  independent 384 points, the median change is −$20/yr, and 50.5% of finalists fall. The independent 64 points
  centre on +$156. The screen's top pools are not mostly *neighbourhood-sampling* noise. That says nothing about time persistence, which
is weak (PBO, TD3 below).
- **Null reference.** Every nominee sits at the 94th–100th percentile of its stratum's null distribution. Comparison
  is like for like, on 64 independent points for each uniform random pool's best configuration. The null medians are
  $3.4–8.4k/yr.
- **PBO** (neighbourhood robust half-year blocks; a lower bound in beam strata):
  - 0.50–0.94 in most strata, a high probability that the in-sample best is below the median out of sample;
  - the exceptions are **G4 (0.18), G5 (0.24) and G3 (0.26)**.
- **Time persistence:**
  - **TD2** (EARLY versus LATE rank) is near zero or negative in most strata; G4 0.32 at the best assignment, 0.41 at
    α; G5 0.40 / 0.39.
  - **TD3 (the clean α walk-forward)** has median fold-to-next-year Spearman correlations near 0–0.2 in most strata.
    G4's α values are 0.04, 0.05, 0.50, 0.61, 0.02; G5's are 0.41, 0.16, 0.27, 0.58, 0.22. Persistence is weak
    everywhere and least weak in the KRE + GDX strata.
- **The 16 strata are correlated trials on one market history,** dominated by the 2020 and 2022 events (S2). The
  G-family result is the maximum of 2,883 configurations on that history. Its low PBO and positive TD2/TD3 make it
  the least fragile finding. They do not make it a validated one.

## 8. Protected exploratory queue (never nominated; full list in `s3-queue.md`, 96 entries)

In the 10 strata with no nomination, the "at least as profitable as the stratum's best nomination" test is vacuous.
So the queue holds every non-nominated, non-control high-evaluated pool (103 − 6 − 1 = 96).

The most profitable non-nominated pools:

| Pool | Robust/yr | Share | Why not nominated |
|---|---:|---:|---|
| KRE+EWW+GDX+MTUM | $27.2k | 90% | MTUM adds only $383/yr (fails I1) |
| KRE+EWW+GDX+ILF+MTUM | $25.5k | 91% | EWW and ILF each subtract |
| KRE+GDX+ILF+MTUM+SMH | $25.5k | 86% | fails C2 |
| KRE+EWW+GDX+IWM+MTUM | $24.1k | 90% | fails C2 narrowly and I1 |
| KRE+GDX+MTUM | $19.7k | 77% | fails C2 |
| GDX+SMH | $17.7k | 76% | fails C2 |

They are all G-family variants of the same economy. No other family has a non-nominated pool above $18.4k/yr.

## 9. 6+ book expansion (inventory only, nothing replayed)

There is no 5-book nomination, so no expansion is inventoried by the frozen rule. The evidence of §2 argues
**against** 6+ books under one slot: leave-one-out failures and refusals rise steeply with size.

The one plausible report-only extension is a 6-book G pool, KRE + GDX + ILF + MTUM + EWW + {IWM or SMH}. It would only
be worth studying if Phase B shows that joint optimization turns the negative fifth-book margins positive.
