# Final comparison and recommendation — Study 3, Stage 1c

**Verdict (frozen rubric, `results/records/analysis.json`): no demonstrated edge.** Failed items (g), (f) and (e2).
**Nomination: none.** Nothing was registered, promoted, traded or deployed; D1, B4, B5, the allocator, configs, data and
earlier studies are unchanged. No 2024–2026 bar was read.

All figures: one VGT slot, $100,000 of cost per entry, net-debit account at 11% simple interest, 5 bps per side,
price-only, liquidation-marked window increments W, minute-close drawdowns (DD, also as % of $100,000). Evidence
level: retrospective forward-selection replays of a protocol frozen before any Stage 1c strategy saw market data
(`PROTOCOL_FREEZE.json`, 2026-10-29T15:22:58Z), on 2016–2023 history that earlier studies inspected and the designer
knew. The rules were designed after examining Stage 1b's three losing 2022 trades: every 2022 improvement attributable
to a rule event is **(target-year-informed)**. 5,114,598 configurations were evaluated (5,111,641 in development).

## 1. The verdict object Π1 and its comparators (`results/tables/paths.md`)

| Path | 2020 | 2021 | 2022 | 2023 | Σ W | Chained minute DD |
|---|---:|---:|---:|---:|---:|---:|
| **Π1** (S1, RoD picks with rules) | +$23,749 | +$18,148 | **−$6,415** | +$16,186 | **+$51,669** | **$24,193 (24.2%)** |
| Π1-off (same picks, rules removed) | +$31,536 | +$25,858 | −$46,766 | +$14,824 | +$25,452 | $56,063 (56.1%) |
| Π-000 (same procedure, no-rule cells only) | −$7,426 | +$17,855 | −$40,121 | +$13,256 | −$16,435 | $46,017 (46.0%) |
| Π-NET (alternative selector) | +$29,393 | +$18,732 | −$60,962 | +$42,820 | +$29,983 | $66,551 (66.6%) |
| Stage 1b Π1 (re-simulated, = sealed) | +$14,432 | +$18,059 | −$30,966 | +$11,049 | +$12,573 | $42,882 (42.9%) |
| Stage 1 picks, executable S1 (= sealed) | +$18,450 | +$21,309 | −$30,572 | +$28,647 | +$37,834 | $36,672 (36.7%) |
| C-SMA trend filter, annual reset | +$22,052 | +$25,305 | −$28,492 | +$30,132 | +$48,996 | $33,946 (33.9%) |
| C-ALR always long, monthly $100k | +$31,177 | +$21,507 | −$37,608 | +$39,427 | +$54,502 | $47,576 (47.6%) |

Fold picks (each sealed with data ≤ its boundary): A E09 upward trailing buy × XT two-layer + B; B E04 CUSUM × XRP
profit retention + A+B; C E09 × XRP + A+B+C; D E02 drift × XE exposure-scaled trail + B (`results/tables/develop.md`).
Π1's chained drawdown runs from a peak on 2021-11-22 to a trough on 2022-05-20; Π1-off's from 2021-12-27 to
2022-10-13 (UTC dates, `paths.md`). The C-ALR and C-ALZ1 annual-reset control rows are degenerate and omitted
(amendments A2, A3); no rubric item uses them.

| Rubric item | Result | Value |
|---|---|---|
| (a) validity | pass | parity fast = Stage 1b (1,151 runs) and = independent reference (539 runs; 48 evaluate paths) with 0 differences; guards 0; b-marks reproduce every pick; Stage 1b Π1 and Stage 1's S1 path reproduced to the cent; ledger identities clean |
| (e) evidence | pass | 10 own-rule exits, 10 non-adoption first entries in 4 windows, long at 72.5% of closes |
| (c) risk | pass | window DDs $23,198 / $11,086 / $22,004 / $14,170; chained $24,193 |
| (b) profit | pass | Σ +$51,669; 3 positive windows; worst window −$6,415 |
| (d) 2022 protection with trend retention vs Π1-off | pass | 2022 −$6,415 vs −$46,766 (+$40,351, target-year-informed); 2020+2021+2023 $58,084 vs $72,219 (≥ the 75% retention bound) |
| **(g) exposure-matched excess and controls** | **fail** | Σ excess over exposure-matched C-ALR +$10,783 (passes) but only 1 window ≥ +$2,000 (needs 2); margin over C-SMA (annual reset +$48,996) **+$2,673 < +$5,000**; margins over C-DON, C-TSM, C-STOP +$18,809 / +$8,092 / +$11,453 |
| **(f) perturbed paths** | **fail** | 58.6% of 128 perturbed S1 paths have Σ W > 0 and DD ≤ $35,000 (needs 75%); median Σ W +$21,845 < 50% of Π1's |
| (h) stresses | pass | 10 bps +$49,960; 14% +$45,855; 25 bps stop slippage +$48,960; 50 bps opening slippage +$50,253; +1 minute +$62,274; chained DD ≤ $24,882 throughout |
| **(e2) winner / giveback** | **fail** | Σ − largest campaign +$14,312 and Σ − largest up-leg +$21,374 pass; campaign giveback share **0.606 > 0.5** |

Label order: invalid → insufficient evidence → risk-incompatible → **no demonstrated edge** (failed g, f, e2). Π1 lies
at the 90th percentile of 128 random-deep-champion paths (median +$19,286), so it is not "selection-indistinguishable".
Π-NET is risk-incompatible; Π1-S2 (continue-old) would fail b, c and g (+$16,664, DD $41,287); Π1-reset equals Π1.

## 2. Did the D1-inspired rules improve momentum? (`PROTECTION_RULE_ABLATIONS.md`)

- **On the exact verdict picks, yes in one retrospective, target-year-informed replay; across perturbations of the
  picks, no.** Removing the rules from Π1's own picks (Π1-off) turns 2022 from −$6,415 into −$46,766 and the chained DD
  from $24,193 into $56,063, while costing $14,135 in 2020, 2021 and 2023 — so the predeclared statement "2022 improved
  with trend retention" holds in this one replay. But across 128 paired perturbations of the picks, Π1 beats its
  rule-free twin in only **33.6%** of paths, so the predeclared primary protection statement **does not hold**. In this
  replay and its parameter perturbations (perturbations of the same picks on the same data, not independent market
  samples) the rules cut drawdown: 62% of perturbed Π1 paths (79 / 128) stay within $35,000 against 0% of their
  rule-free twins (58.6% are both positive and within $35k) — at a lower median profit (+$21,845 vs +$26,688). The
  drawdown they cut sits in 2022, the year the rules were designed from **(target-year-informed)**.
- **The gain is an A × B interaction, and C was inert.** Π1 with only A and B equals Π1 exactly; A alone (Σ +$18,562,
  2022 −$48,457) and B alone (Σ −$4,235, 2022 −$66,245, DD $71,192) are each worse than no rules. The 2022 fold pick
  sold four losing positions at an open by rule A and then waited out B's cooldown before trying again
  **(target-year-informed)**.
- **The fold-C pick's 2022 neighbourhood lost everywhere:** all 128 joint perturbations of the pick lost in 2022
  (continuous runs; median −$31,591, best −$1,762). The verdict path's −$6,415 is a favourable point, not a stable
  region — the regime failure Stage 1b found, with losses cut but not removed **(target-year-informed)**. All four
  binding picks also lie in training-only widened parts of their boxes, one at a natural limit (A t2 = 0.005 vs the
  declared 0.03–0.25; B ρ = 1.00, the limit; C ρ = 0.98; D γ = 2.57 vs 0–2), consistent with item (f) failing.
- **Fragile at the knife edge:** at 0 bps costs Π1 earns only +$9,831 with a $51,541 DD — removing friction shifts
  A's "net at the open < 0" decisions and the subsequent cooldown path.
- **Procedure level:** with rules available the same forward procedure (Π1) beat the rule-free procedure (Π-000) by
  +$68,104 with $21,824 less DD; Π-000 itself lost money. The predeclared procedure statement therefore holds, in one
  retrospective, target-year-informed replay. Fixed parents: 0 of 7 gated rule add-ons improved P\*-000
  forward (training adopted rules for the parent in A, B and H only).
- **Stage 1b's three 2022 losers** (hindsight counterfactual): A at 15 days sells #11, #12 and #13 sooner; C blocks #12
  and #13 but re-enters later and worsens 2022 alone (−$38,748); B at 10 sessions leaves the three 2022 trades and
  2022 unchanged but changes 2023 (+$11,049 → +$14,343; Σ +$12,573 → +$15,867); A15+C gives the best 2022 (−$6,193)
  and Σ +$31,482 at a $15,699 DD (`results/tables/counterfactuals-2022.md`).

## 3. Answers and limits

- **Can entry × exit combinations plus D1-inspired loss management reduce 2022 losses while keeping advance-year
  profits and an acceptable drawdown?** In one retrospective, target-year-informed replay the selected path did: 2022
  −$6,415, Σ +$51,669, chained DD $24,193 — better than every Stage 1/1b path on both counts. It still fails the frozen
  rubric: it beats the simple C-SMA trend filter by only +$2,673 (the rubric requires +$5,000), it earns its excess
  over an exposure-matched always-long position in one year only, it gives back 61% of campaign peaks, and its
  parameter neighbourhood does not hold (only 58.6% of perturbed paths are both positive and within $35k; 34% beat
  their rule-free twins).
- Descriptive, in-sample and never nominated: the H Pareto set (21 of 104 deep-cell champions non-dominated on J33
  median net, median DD and φ; `results/tables/pareto-H.md`) contains the H pick E11 × XRP OR + A.
- Limits: one ETF, one secular bull market, four dependent windows with a single bear year; the rules and the
  2022-sensitive design choices were informed by 2022; ≈ 5.1 million configurations against four windows; no bid/ask,
  margin-call or forced-liquidation model; price-only; replicate develop runs under another seed were not run; the
  missing-bar stress barely perturbs the paths (it never drops a session's first bar); there is no explicit synthetic
  test of B after repeated losses (the sealed Π1 ledger shows four consecutive losses handled correctly, trades 8–11).

## 4. Recommendation and the next gate

1. **Do not carry any Stage 1c policy into a 2024–2025 validation or into Stages 2–4**: the frozen procedure yields
   "no demonstrated edge" and nominates nothing.
2. What may deserve a separately authorised, newly frozen study: rule A combined with B as a **drawdown limiter** (the
   effect seen here only in one retrospective, target-year-informed replay and its parameter perturbations), judged
   against the C-SMA trend filter and an exposure-matched benchmark, with selection that rewards neighbourhood
   stability of the A×B interaction rather than its best point. That is a new hypothesis informed by this study's
   outcomes, not a re-tune of it, and it would need data the designer has not seen.
3. The user decides separately whether to pivot to the Study 4 two-tier D1 allocator (B5 as the immutable baseline).

**Stop.** No later stage was started.
