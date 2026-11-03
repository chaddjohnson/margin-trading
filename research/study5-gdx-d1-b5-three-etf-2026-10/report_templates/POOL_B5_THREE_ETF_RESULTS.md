# Study B — B5 restricted to VGT, KRE and GDX: results

One shared $100,000 funded slot (shadow books, first executable signal wins, same-minute ties alphabetical, never
compounded), 5 bps per side, 11% simple interest, books arming 2017-06-15 — frozen B5's rules, unchanged. Engine:
`traceBook` + `replayFixedPool`, proven equal to the full N-book engine on every field (parity P1, 66 runs, 0
differences) and reproduced by the pools CLI for every configuration below. Period labels as in
`STANDALONE_GDX_RESULTS.md` (DEV search window, VAL within-study validation, FX previously exposed, RECENT 12 new
sessions). Universe guard: every restricted run's funded lots were asserted to be VGT/KRE/GDX only (PG7 passes for
every candidate); C5 is the only five-ETF run.

## Answer

1. **Excluding XBI and XRT without retuning (C5 → C3) costs $67,532 over the full history** ($484,637 → $417,105),
   almost all of it inside 2016–2023 (DEV −$14,091, VAL −$51,875); in the exposed 2024–2026 window the difference is
   only −$1,567 (FX $97,719 → $96,152), and nothing in the 12 new sessions. The maximum minute drawdown is unchanged
   ($26,510, the 2020-02-19 → 2020-03-12 episode). XBI and XRT contributed $53,064 and $12,842 of C5's net.
2. **No restricted-pool configuration is nominated.** Every candidate — and C3 itself — fails PG2: perturbing all 24
   parameters by ±2 steps puts the pool's minute DD above $35,000 for more than 10% of neighbours (only 1–34% of the
   candidates' joint neighbours stay below it; C3: 24%). The per-book neighbourhoods show where the fragility sits:
   the frozen **KRE lowDd** book (only 62% of its neighbours keep the pool below $35k), not the GDX books.
3. **The faithful B5 method (Track 1) ran exactly as the original** (proven by reproducing the original GDX search
   bit for bit, parity P4) and, on the restricted base VGT + KRE, chose GDX vectors that pass the original training
   gates T1–T3 ("Track 1 nominated"). They failed only PG2. In the exposed FX window they made less than the frozen
   ablation (T1-P +$75,429, T1-S +$91,470 vs C3 +$96,152), and **T1-P's full-history minute DD reached $39,623**
   (2026-05-11 → 2026-07-17), a breach of the ceiling.
4. **Staged coordinate + joint optimization (Track 2a) overfit.** It raised the DEV pool net from C3's $203,453 to
   $292k–$330k, and VAL collapsed to −$9,018…+$39,776 (C3: $119,070, in-sample). Every Track 2a configuration fails
   at least four gates and made $46k–$64k in FX (C3 $96k).
5. Being better than the ablation but worse than five-ETF B5 did not occur either: no restricted configuration beat
   C3 on FX, and C3 is below C5 by $1,567 there.

## 1. Controls on current data (C5, C3, C2, C1) and every candidate, full history to 2026-10-29

{{table:pool_final.md}}

C5 through 2026-10-13 reproduces the frozen anchor to the cent ($486,207.77, minute DD $26,509.97, 94 lots;
`npm run pools -- fixed B5 --end 2026-10-13`, parity P3). Through 2026-10-29 it is **$484,636.97**: the only change is
a GDX `portfolioAware` lot entered 2026-10-22 10:41 and open at the endpoint (marked −$1,570.80) — the same lot in C3.
No historical byte changed (DATA_AUDIT.md §2).

### Per ETF

{{table:pool_by_etf.md}}

### Decisions, funded lots and refusals (decider < holder)

{{table:pool_refusals.md}}

## 2. Track 1 — the frozen B5 method on VGT/KRE/GDX

Faithfulness: `npm run study5 -- parity` re-ran the original GDX search (portfolio-aware Stage A common pool + both
tracks' NSGA-II + R1–R5) on its original base and window and reproduced the sealed records exactly — the same
selected vectors (`d1-51ea8d4bd6`, `d1-68ebf55a55`), feasible counts (1,085 / 821), hypervolume trajectories and
objectives at 0/2/5/10 bps. The restricted run changes only the base (C2 = VGT primary + KRE lowDd), the window
(DEV, folds D1–D3, regimes R1–R9) and drops the portfolio gates T4/T5 (METHOD_RECONSTRUCTION.md §3).

{{table:track1.md}}

- Track 1 on the restricted base picked a GDX vector of the same family as B5's (X 25.8% vs 27.4%, stop 7.2% vs
  7.1%) but with a much longer lookback (L 210 vs 100) and continuation window (W 170 vs 81). Its DEV Δ vs C2
  (+$101,045) exceeds that of B5's own GDX book on the same base (+$73,574 = C3 − C2), as a fresh in-sample optimum
  should.
- In VAL (Study 5's validation; C3 is in-sample there) T1-P made +$74,231 and T1-S +$61,393 against C3's +$119,070.
  In FX (exposed) T1-P made +$75,429, T1-S +$91,470, C3 +$96,152. Track 1's joint FX neighbourhoods were better than
  C3's (medians +$82,438 and +$85,322 vs +$70,726, all 128 points positive), but their full-history drawdown tails
  were worse (share below $35k: 10% and 33% vs 24%).
- **WF20 (method evidence, `results/track1/wf20/test.json`).** Run with the search ending 2019-12-31, the same method
  chose X 13.9% / 14.0% GDX vectors (both "Track 1 nominated"); on 2020–2021 they made +$81,846 (T1-P, DD $27,544)
  and +$41,846 (T1-S, DD **$44,007**) against **+$93,918 for C2 without any GDX book** — the method's out-of-sample
  addition was negative one fold earlier, including the COVID rebound.
- Substitution diagnostic (two ETFs, never a candidate): VGT + GDX P-vector without KRE: DEV $132,219 (Δ vs C2
  +$2,339 vs the addition's +$101,045) — removing KRE is not an improvement, as in the original study.

## 3. Track 2a — staged coordinate optimization, then a joint step

{{table:track2.md}}

Path dependence is large: runs s1–s3 (different first books, all starting from C3) ended at joint normalized distances
0.60–0.81 from each other (0.77–0.86 from s4) with very different VGT and KRE vectors (VGT X 13.1% / 15.7% / 23.8%; KRE X 20.6–29.3%, L 33–54 vs
the frozen 230). Run s4, started from T1-P, accepted no step: under the plateau acceptance rule T1-P is already a local
optimum. The accepted VGT and KRE changes are where the DEV gain came from and where VAL failed — the classic signature
of fitting the development path.

## 4. Track 2b — robust plateau selection on validation

{{table:pool_neighbourhoods.md}}

Per-book neighbourhoods (only one book perturbed):

{{table:pool_perbook.md}}

Pareto view (score S_P vs joint N1 p90 DD): T1-P (S_P $26,886/yr, p90 $59,161), T1-S ($26,120, $56,532) and C3
($24,511, $54,757) dominate the Track 2a configurations (S_P $15k–$25k, p90 $54k–$69k); no configuration has a joint
p90 below $35,000, and only C1 (VGT alone) passes PG2. Scores and gates are in `results/studyB/validation.json`.

## 5. Classification after the freeze (5 bps)

{{table:pool_classification.md}}

## 6. Sensitivities (full history; net / minute DD)

{{table:pool_sensitivities.md}}

## 7. Leave-one-year-out (full-history net without each year)

{{table:pool_leave_one_year_out.md}}

## 8. Order dependence and capital occupancy

- Same-minute ties are alphabetical (GDX < KRE < VGT) in every restricted run, exactly as in B5; the replay counts
  them and the full engine reproduces them (parity P1).
- Coordinate-order dependence is the Track 2a path-dependence result above: different first books give different
  optima, none robust.
- Time in market: C5 54.8% of eligible sessions, C3 51.4%, C2 44.7%, T1-P 64.9%, T1-S 60.7%; refusals fall from 78
  (C5) to 40 (C3) because two books are gone, and rise to 72–75 with the Track 1 GDX vectors, which signal more often
  (42–43 funded GDX lots vs 17 for B5's GDX book).
