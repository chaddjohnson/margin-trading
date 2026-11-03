# Portfolio-aware optimization: Track S versus Track P, and the configurations (Stages B and C, training only)

Written after Stage C and **before** the selection freeze and any holdout/final figure of a candidate. Commands:
`npm run portfolio-aware-d1 -- stage-b` (`results/stageB/`) and `-- stage-c` (`results/stageC/stageC.json`); tables
`results/tables/stageB.md`, `results/tables/stageC.md`. Everything is the training partition (books arming
2017-06-15, last session 2023-12-29), fixed $100,000 unless stated, 5 bps per side unless stated.

## 1. The two searches (PROTOCOL.md §5.2)

Finalists GDX, XOP, XLE (CANDIDATE_D1_SEARCH.md §3). For each finalist and each track: NSGA-II, population 48,
seeded from the track's 48 best common-pool vectors (diversity L∞ ≥ 0.02), seeds `deriveSeed('portfolio-aware-d1',
ETF, track, 'nsga2')`, each track seeing only the common pool and its own offspring.

| ETF | Track | New vectors | Generations | Stop | Feasible (pool ∪ own) | Robust / shortlisted | Selected | Full engine (E4) |
|---|---|---:|---:|---|---:|---|---|---|
| GDX | S | 1,000 | 21 | budget | 821 | 20 / 20 | `d1-68ebf55a55` (ga:S:20) | exact |
| GDX | P | 1,000 | 21 | budget | 1,085 | 20 / 20 | `d1-51ea8d4bd6` (ga:P:21) | exact |
| XOP | S | 1,000 | 21 | budget | 695 | 20 / 20 | `d1-ede1165b0d` (ga:S:21) | exact |
| XOP | P | 1,000 | 21 | budget | 735 | 20 / 20 | `d1-890902e16e` (ga:P:20) | exact |
| XLE | S | 1,000 | 21 | budget | 629 | 20 / 20 | `d1-008ac96b01` (the eight-ETF XLE `primary` control) | exact |
| XLE | P | 1,000 | 21 | budget | 686 | 20 / 20 | `d1-3c14f76172` (ga:P:21) | exact |

Both tracks spent exactly the same budget (6,000 new vectors in all, plus 3,581 one-parameter probes and the 0/2/10 bps
re-evaluations of 120 shortlisted vectors; 9,938 traces and 19,880 replays). Every search ended on the budget with its
hypervolume still rising: none converged. XOP's Track S started with no feasible vector (every pool vector's standalone
drawdown exceeds $35,000) and found 695 by search.

**A caution the numbers force.** All 20 shortlisted vectors passed R1–R5 in every one of the six tracks. The
predeclared robustness rules (positive at 0/2/10 bps, ≥ 2 of 3 folds, positive without the best regime, a plateau of
one-parameter probes, and for Track P the pool's net ÷ drawdown) did not discriminate among the best training vectors
an optimizer can find: they rule out fragile spikes, not in-sample fitting of the pool's exact path. The robustness
evidence that matters here is therefore the frozen holdout and final evaluation, not the training checks.

## 2. The champions, side by side (5 bps)

| ETF | Vector | Standalone net / minute DD / trades | Pool Δ | = own funded lots | + baseline gained | − S0 displaced | Pool DD | Δ by fold F1 / F2 / F3 | Largest regime share |
|---|---|---|---:|---:|---:|---:|---:|---|---|
| GDX | **P** X 27.4% Y 0.4% stop 7.1% hold 18 L 100 buf 3.6% P 19.1% W 81 | $142,930 / $34,134 / 18 | **+$146,293** | $149,556 (9) | $49,670 (21) | $52,933 (19) | $26,510 | $0 / +$88,122 / +$58,171 | R7 COVID crash +$86,261 |
| GDX | S X 25.8% Y 1.0% stop 5.4% hold 8 L 172 buf 1.4% P 17.6% W 199 | $155,422 / $29,880 / 43 | +$38,082 | $90,897 (21) | −$1,857 (3) | $50,958 (14) | $26,510 | +$4,652 / +$45,433 / −$12,003 | R7 +$40,636; R10 2022 −$25,261 |
| XOP | **P** X 21.6% Y 4.8% stop 8.9% hold 9 L 43 buf 0.7% P 11.2% W 126 | $110,888 / $60,063 / 39 | **+$81,268** | $62,173 (13) | $68,639 (3) | $49,545 (11) | $34,816 | +$10,531 / +$45,972 / +$24,765 | R9 2021 +$71,194 |
| XOP | S X 28.5% Y 4.9% stop 5.2% hold 6 L 38 buf 0.4% P 15.1% W 39 | $134,445 / $25,530 / 27 | +$27,302 | $24,580 (3) | $7,203 (2) | $4,481 (3) | $31,730 | $0 / +$7,112 / +$20,190 | R10 +$17,653 |
| XLE | **P** X 12.8% Y 4.9% stop 3.9% hold 8 L 150 buf 0.0% P 14.6% W 115 | $33,808 / $53,307 / 71 | **+$67,122** | $10,657 (17) | $75,842 (5) | $19,377 (11) | $28,659 | +$6,135 / +$27,188 / +$33,799 | R9 +$44,428 |
| XLE | S (eight-ETF primary) X 28.0% Y 2.7% stop 6.5% hold 4 L 52 buf 0.0% P 13.1% W 47 | $152,038 / $25,057 / 23 | +$21,604 | $23,790 (1) | $0 | $2,186 (2) | $28,659 | $0 / $0 / +$21,604 | R10 +$21,934 |

The four-cost figures (all within a few hundred dollars of the 5 bps Δ except GDX S, whose Δ falls to +$29,703 at
10 bps) are in `results/tables/stageB.md`.

### Does Track P beat Track S on the pool, and why (training evidence only)

On every finalist the P-vector's pool Δ is 2–4× the S-vector's: +$146k vs +$38k (GDX), +$81k vs +$27k (XOP), +$67k vs
+$22k (XLE). The S-vectors are better standalone (GDX $155k vs $143k; XOP $134k vs $111k; XLE $152k vs $34k) and worse
in the pool. The mechanisms differ by ETF, and they are not equally credible:

- **GDX — timing and episode diversity, mostly genuine but concentrated.** The P-vector's own 9 lots earn $149,556; it
  displaces S0 lots worth $52,933 (mostly KRE churn and three VGT lots) and the changed path funds $49,670 of other
  baseline lots, so Δ ≈ its own book. It enters on 27% declines from a 100-session high and holds up to 18 days, so it
  buys the COVID crash rebound (+$86k of Δ in regime R7 alone), late 2022 and spring 2023 — episodes where the S0 pool
  had idle or low-value stretches. The S-vector trades more often (21 lots), wins in March 2020 too but loses in the
  2022 bear market (R10 −$25k) and in fold F3 overall; it fails T3. Without its best regime the P-vector still adds
  +$60,032.
- **XOP — partly genuine, partly path reshuffle.** The P-vector's 13 lots earn $62,173, including idle-window trades in
  2018; but $68,639 of baseline lots are "gained" because its occupancy shifts XRT's funding onto a large winning XRT
  trade (XRT's funded net rises from $15,788 in S0 to $77,095). 2021 (R9) carries +$71k of the +$81k.
- **XLE — mostly path reshuffle.** The P-vector's own 17 lots earn only $10,657; its Δ comes from the baseline lots its
  occupancy reshuffles (+$75,842 gained, −$19,377 displaced). An optimizer given the full chronological pool can find a
  phenotype whose main effect is to change *which* existing trades get funded. That effect is causal on the training
  path but has no reason to persist; XLE was not taken to Stage C (§3), so it is not tested further.
- **The S-vectors concentrate on crisis dips when the pool is full.** XLE's S-vector (the eight-ETF in-sample
  `primary`) is funded once in six and a half years; XOP's three times. Standalone optimization does not see the pool.

Track P therefore "wins" in training by construction — it optimizes the quantity being compared — and part of its win
is path-fitting. The fair question is whether the P-vectors' advantage survives on data neither track saw; that is the
post-freeze evaluation.

## 3. Stage C: the configurations (PROTOCOL.md §6)

Finalists ordered by P-vector Δ@5: GDX (+$146,293), XOP (+$81,268), XLE (+$67,122).

- **Additions (4):** P-add-GDX, S-add-GDX, P-add-XOP, S-add-XOP (the four-addition cap reached before XLE).
- **Substitutions (0):** seven of nine (vector, removed book) pairs had ≥ 3 conflicts and were replayed; none beat its
  addition by $5,000 — every substitution was worse than simply adding the book (e.g. GDX replacing KRE +$49,094 vs
  adding GDX +$146,293). Removing a frozen book loses its own contribution and gains nothing here.
- **Combination (1):** GDX-P + XOP-P qualifies (both additions positive; their funded holding intervals overlap on
  18.0% of the smaller one's days ≤ 25%; combination Δ@5 +$194,695 ≥ $146,293 + $5,000).
- **Co-refinement:** not triggered (+$194,695 < +$146,293 + $81,268 = $227,561: not super-additive).

Six configurations including S0 (cap 8).

### Training results on the full engine

Fixed $100,000 pool:

| Config | Net @0 / @2 / @5 / @10 | Δ@5 | Minute DD @5 | Net ÷ DD | Lots (new) | Funded net by book @5 |
|---|---|---:|---:|---:|---|---|
| S0 | $249,174 / $246,625 / $242,196 / $233,867 | — | $28,659 | 8.45 | 71 | VGT $123,289 (11); KRE $62,779 (38); XBI $40,341 (17); XRT $15,788 (5) |
| P-add-GDX | $396,715 / $393,667 / $388,489 / $379,867 | +$146,293 | $26,510 | 14.65 | 82 (9) | GDX $149,556 (9); KRE $105,400 (45); VGT $66,868 (9); XBI $53,064 (16); XRT $13,602 (3) |
| S-add-GDX | $288,668 / $285,331 / $280,278 / $263,570 | +$38,082 | $26,510 | 10.57 | 81 (21) | VGT $114,209 (7); GDX $90,897 (21); KRE $46,799 (38); XBI $28,204 (12); XRT $170 (3) |
| P-add-XOP | $330,981 / $328,197 / $323,464 / $314,584 | +$81,268 | $34,816 | 9.29 | 76 (13) | VGT $110,258 (10); XRT $77,095 (4); XOP $62,173 (13); KRE $43,927 (36); XBI $30,011 (13) |
| S-add-XOP | $276,704 / $274,064 / $269,498 / $260,941 | +$27,302 | $31,730 | 8.49 | 73 (3) | VGT $128,196 (12); KRE $62,779 (38); XBI $40,341 (17); XOP $24,580 (3); XRT $13,602 (3) |
| P-comb-GDX-XOP | $445,524 / $442,293 / $436,891 / $427,850 | +$194,695 | **$39,877** | 10.96 | 86 (21) | GDX $141,660 (10); KRE $86,548 (43); XRT $77,095 (4); VGT $53,803 (7); XOP $44,291 (11); XBI $33,494 (11) |

20% portfolio ($300,000 VOOG/VGT core), full engine:

| Config | Ending equity @5 (Δ) | Δ @0 / @10 | Max % DD daily / minute @5 | Borrowing $-days @5 | S0 ladder at the same $-days (Δ) |
|---|---|---|---|---:|---|
| S0 | $1,677,751 | — | 34.65% / 37.01% | 209.8M | — |
| P-add-GDX | $2,270,264 (+$592,513, +35.3%) | +$606,648 / +$581,216 | **29.67% / 31.09%** | 271.2M | $1,843,191 (+$427,073) |
| S-add-GDX | $1,801,246 (+$123,495) | +$130,607 / +$90,598 | 30.41% / 32.46% | 239.6M | $1,757,920 (+$43,326) |
| P-add-XOP | $1,907,671 (+$229,919, +13.7%) | +$235,313 / +$223,985 | 34.65% / 37.01% | 259.3M | $1,810,960 (+$96,710) |
| S-add-XOP | $1,771,732 (+$93,981) | +$96,128 / +$91,633 | **35.04%** / 37.39% | 221.4M | $1,709,119 (+$62,613) |
| P-comb-GDX-XOP | $2,426,817 (+$749,065) | +$767,919 / +$732,973 | 29.67% / 31.08% | 327.3M | $1,994,179 (+$432,638, extrapolated) |

S0 ladder at 5 bps: 10% → $1,370,571 (95.3M $-days); 15% → $1,516,974 (149.9M); 20% → $1,677,751 (209.8M); 25% →
$1,854,175 (275.3M). The GDX configurations *lower* the training maximum percentage drawdown (March 2020) because a
GDX lot holds the pool through the crash instead of S0 lots that lost; that is one episode. Passive margin measures:
the lowest equity ÷ requirement under the 35/50/60% uniform schedules is identical across configurations (2.33 /
1.63 / 1.36, the core's own extreme); no maintenance shortfall in any training run.

### The training gates (PROTOCOL.md §6.1)

| Config | T1 materiality & costs | T2 DD ≤ $35k, net÷DD ≥ 0.95×S0 | T3 lots/years, folds, without best regime | T4 portfolio | T5 matched borrowing | Status |
|---|---|---|---|---|---|---|
| P-add-GDX | ✓ | ✓ | ✓ (9 lots in 3 years; folds $0 / +$88,122 / +$58,171; +$60,032) | ✓ | ✓ | **nominated** |
| S-add-GDX | ✓ | ✓ | ✗ (F3 −$12,003; −$2,555 without the best regime) | ✓ | ✓ | comparator |
| P-add-XOP | ✓ | ✓ | ✓ (13 lots in 5 years; +$10,531 / +$45,972 / +$24,765; +$10,074) | ✓ | ✓ | **nominated** |
| S-add-XOP | ✓ | ✓ | ✗ (3 lots) | ✗ (35.04% daily) | ✓ | comparator |
| P-comb-GDX-XOP | ✓ | ✗ (minute DD $39,877) | ✓ | ✓ | ✓ | comparator |

Frozen ranking (training Δ@5): **P-add-GDX > P-add-XOP**. Note that P-add-GDX's fold F1 contribution is $0 (no GDX
lot before 2020) and that its T3 pass rests on F2 and F3 only.

## 4. What the training stage does and does not show

- It shows that portfolio-aware selection finds D1 books whose **executed** contribution to the shared pool is large
  in-sample, that the standalone-first books contribute far less, and that the earlier proxy/first-order screen
  would have rejected candidates (XOP's unchanged D1 alone is +$48k on the full path).
- It does not show out-of-sample value: each P-vector is the best of ~1,500 vectors evaluated on the very path it is
  judged on; two of the three P-champions draw much of their gain from reshuffling which baseline trades are funded;
  the GDX champion's gain is concentrated in the COVID rebound. The frozen evaluation decides.
