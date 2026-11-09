# REPORT — Priority 5A (brought forward): Growth funding lifecycle and fixed portfolio combinations

A bounded fixed-arm comparison on **unchanged phenotypes**. Research only, not deployed. No parameter search, no new
phenotype selection, no tuning of the L2 constants; the canonical Growth engine and its default are unchanged.

- **The arms.**
  - **L0** is the current virtual-book model, the exact control.
  - **L1**: Growth responds to actual funding. A refused request leaves the book flat; later entries come only from
    fresh canonical opportunities.
  - **L2**: L1 plus one retained refused base opportunity per Growth book, valid for 20 sessions within a 5% price
    extension. This is an experimental policy and is labelled in every result.
  - D1's shadow lifecycle is unchanged in every arm.
- **Conventions** (Priority 3's harmonized ones):
  - one fixed $100,000 principal budget and one exclusive slot;
  - 5 bps per side, 11% simple interest;
  - DD is the maximum minute drawdown in dollars; DD % is DD ÷ $100,000;
  - development is 2016-01-04 → 2024-12-31;
  - 2025-01-02 → 2026-10-30 is **previously examined history**, a retrospective comparison and not an untouched holdout.
- Historical compliance does not guarantee future drawdown.
- Every figure comes from the sealed records (`results/`); tables are in `results/tables/` (`centres`, `participation`,
  `divergence`, `episodes`, `neighbourhoods`, `standalone`, `standalone-drivers`, `verdicts`, `full`, `finalists`,
  `verification`). There are no charts (standard 2.0.0 §7.7).

## 1. Summary

1. **Changing Growth's refusal lifecycle does little on development, and where it matters it mostly hurts.**
   - **L1 is small everywhere.** Its median paired change over the 384 confirmation draws is within ±$2,500 for all nine
     core Growth subjects (frozen label "little").
   - **L2 is mixed.** It helps A (+$2,759.57 median), hurts B (−$2,910.26) and C85 (−$3,686.03), and does little
     elsewhere.
   - **At the centres** L1/L2 cost the GDX-including combinations money: E −$4,037.06; A −$11,696.39; B −$4,037.05
     (L1) and −$8,646.34 (L2). C4 and V4 gain +$3,000.27.
2. **The 3A mechanism is real but not repairable by these lifecycles.** A short GDX lot that refuses VGT's long Growth
   trade costs that trade under every arm.
   - **L1:** the freed VGT book has nothing to enter. A Rise entry needs a fresh crossing, and in three of the four 3A
     episodes none came before the trend ended.
   - **L2:** the preserved opportunity was invalidated by the 5% guard in both 2016 episodes. In 2020 it re-entered
     08500a60 three days late and was stopped out in five days, losing $4,609.29.
   - The cost is the refusal itself, not the unfunded virtual waiting. L1/L2 eliminate the virtual holds, but the idle
     capital stays (GP85: 1,590 idle closes of 2,264 in every arm).
3. **Freeing a refused Growth book can displace better D1 trades.** Under L0 the virtual hold also stops the book from
   asking for capital. Without it:
   - #4's December 2016 crossing (−$101.33) displaced a +$14,595.33 D1·GDX trade in A;
   - Priority 3's informed primary IP loses $83,057.12, its development DD rising from $20,393.61 to $25,238.07;
   - 7 of the 27 finalists lose money under L1 (up to −$25,845.75) and 4 gain (up to +$9,241.80).
4. **Q1, which combination: no single one dominates under any lifecycle.**
   - **Non-dominated sets:** E, C4, C85 and A under L0; E and C4 under L1 and L2.
   - **E (VG #2 + GDX Growth)** has the highest development centre net in every arm ($326,336.29 under L0), but a heavy
     neighbourhood tail.
   - **C4 (VG #2 + #4)** has by far the best risk and robustness evidence.
   - **B** is dominated in every arm; **A** is non-dominated only under L0, and it fails Q3 as sealed.
5. **Q5, standalone: 08500a60 has the strongest matched local stability evidence, then #4.** The existing GDX Growth
   (Appendix A) alone is fragile on the common instrument: 52.1% of nearby draws exceed a $35,000 DD, and only 25.3% make
   money.
6. **Q6, recommendation (development, frozen rule R6): neither L1 nor L2 deserves optimization in 3B.** Run 3B under L0
   with protected both-symbol exploration (standard §4.7). Validation does not challenge this: every subject's 2025–2026
   P&L is identical under all three arms.

## 2. The answers

### Q1. Which of VG #2 + GDX Growth, VG #2 + VGT Growth and VG #2 + both Growth books has the strongest profit/risk evidence under each lifecycle?

The frozen rule R1 is the Pareto set on four objectives: centre net ↑, centre DD ↓, confirmation p10 net ↑ and
confirmation p90 DD ↓. Development, D24:

| Arm | Non-dominated | E: centre net / DD / p10 / p90 DD | C4 | C85 | A | B |
|---|---|---:|---:|---:|---:|---:|
| L0 | E, C4, C85, A | $326,336.29 / $20,801.07 / $173,136.56 / $35,245.92 | $302,785.91 / $17,332.09 / $202,108.24 / $24,448.95 | $263,681.27 / $18,119.12 / $203,285.19 / $24,164.36 | $310,383.36 / $20,801.07 / $181,689.71 / $36,277.63 | $291,868.34 / $20,801.07 / $185,007.58 / $35,131.47 |
| L1 | E, C4 | $322,299.23 / $20,801.07 / $172,932.10 / $35,131.47 | $305,786.18 / $17,280.74 / $203,371.70 / $24,095.11 | $263,681.27 / $18,119.12 / $203,285.19 / $24,208.50 | $298,686.97 / $20,801.07 / $186,330.44 / $35,054.66 | $287,831.29 / $20,801.07 / $184,873.03 / $35,100.04 |
| L2 | E, C4 | $322,299.23 / $20,801.07 / $172,932.10 / $35,174.17 | $305,786.18 / $17,280.74 / $205,238.35 / $24,239.32 | $259,071.98 / $18,119.12 / $202,331.69 / $25,667.49 | $298,686.97 / $20,801.07 / $185,408.45 / $35,097.99 | $283,222.00 / $20,801.07 / $181,494.88 / $35,805.04 |

D (VG #2 alone, the reference): $268,487.02 / $20,801.07 in every arm.

- **Under every lifecycle the evidence splits two ways, and there is no single strongest combination.**
  - **VG #2 + GDX Growth (E)** earns the most at its centre.
  - **VG #2 + VGT Growth (C4 with #4)** has the strongest risk evidence: p90 DD about $24k, 1.3% of draws above
    $35,000, p10 about $203k.
  - **VG #2 + both Growth books** is never the strongest. A is non-dominated only under L0. B is dominated in all
    three arms (by E or C4).
- **E's, A's and B's tails are the same tail.** Their p90 DDs are $35.0k–$36.3k with 10–13% breaches, all coming from
  Appendix A's GDX timing cliff (3A §Q3). C4's and C85's tails do not have it.
- **Full history (retrospective, previously examined):** A $450,270.82, E $441,831.21, B $408,898.55, C4 $401,867.24,
  D $343,175.82, C85 $339,905.35, all under L0 (§5).

### Q2. Does changing Growth's refusal lifecycle help, hurt or do little?

The frozen rule R2 uses the median paired Δ net of the 384 confirmation draws and the change of the family's p90 DD,
with report-only bands of ±$2,500.

| Subject | L1 − L0: median Δ net / Δ p90 DD → label | L2 − L0 | L2 − L1 (the preserved-opportunity rule alone) |
|---|---|---|---|
| E | $0 / −$114 → little | $0 / −$72 → little | $0 / +$43 → little |
| C4 | +$1,214 / −$354 → little | +$2,243 / −$210 → little | $0 / +$144 → little |
| C85 | $0 / +$44 → little | −$3,686 / +$1,503 → **hurts** | $0 / +$1,459 → little |
| A | +$1,979 / −$1,223 → little | +$2,760 / −$1,180 → **helps** | $0 / +$43 → little |
| B | −$31 / −$31 → little | −$2,910 / +$674 → **hurts** | −$3,123 / +$705 → **hurts** |
| GP4 | $0 / −$1,604 → little | +$1,545 / −$1,049 → little | $0 / +$555 → little |
| GP85 | $0 / +$1,212 → little | $0 / +$436 → little | $0 / −$776 → little |
| V4 | $0 / −$1,153 → little | $0 / −$1,153 → little | $0 / $0 → little |
| V85 | $0 / +$478 → little | $0 / +$478 → little | $0 / $0 → little |

**The fresh-signal effect (L1 against L0): little.** Many draws keep an identical funded ledger (E 150/384, C85
323/384, V85 269/384). Most of the others move by a few thousand dollars either way. Two things change:

- **L1 removes continuation rights that L0 grants from unfunded profits.** Under L0 a refused trade's virtual
  profitable exit opens a continuation window. E and B lose a +$4,037.06 Appendix A continuation (2020-04-23). C4 and V4
  lose a −$3,000.27 #4 continuation (2019-05-15). The brief's rule ("a hypothetical profitable exit cannot open a
  continuation window") makes these losses and gains correct, not errors.
- **L1 frees refused books to request again.** For Rise books this is rare: #4's 2016-12-07 crossing was the only one
  in the 3A windows. For breakout books it is frequent (a breakout signals on every qualifying close), and the fresh
  Growth trades displace D1 trades. IP: a G·VGT breakout held from 2019-07-02 to 2020-03-12 (−$372.79) displaced a
  +$17,159.94 D1·VGT continuation and later D1 lots; IP falls by $83,057.12 at its centre. SP: −$14,299.95.

**The preserved-opportunity rule (L2 against L1): little, except B (hurts).**

- **Activity:** the retained opportunities mostly wait and then expire or are invalidated. At the centres, A's
  retained opportunities waited 16 times and entered never; B's entered once.
- **The one centre entry lost money:** 08500a60's 2020-04-13 refusal was re-entered on 2020-04-16 at $232.19 and
  closed by its initial stop on 2020-04-21 (−$4,609.29). It appears in B, C85 and GP85 (§3).

At the centres (complete reruns; development):

| Subject | L0 net | L1 − L0 | L2 − L0 | DD L0 → L1/L2 |
|---|---:|---:|---:|---|
| E | $326,336.29 | −$4,037.06 | −$4,037.06 | unchanged $20,801.07 |
| C4 | $302,785.91 | +$3,000.27 | +$3,000.27 | $17,332.09 → $17,280.74 |
| C85 | $263,681.27 | $0.00 | −$4,609.29 | unchanged |
| A | $310,383.36 | −$11,696.39 | −$11,696.39 | unchanged |
| B | $291,868.34 | −$4,037.05 | −$8,646.34 | unchanged |
| GP4 | $79,459.91 | −$101.33 | −$101.33 | unchanged |
| GP85 | $68,925.26 | $0.00 | −$4,609.29 | unchanged |
| V4 | $204,940.21 | +$3,000.27 | +$3,000.27 | unchanged |
| V85 | $191,808.45 | $0.00 | $0.00 | unchanged |
| IP | $338,642.84 | −$83,057.12 | −$83,057.12 | $20,393.61 → $25,238.07 |
| XP | $245,220.78 | $0.00 | $0.00 | unchanged |
| SP | $249,574.17 | −$14,299.95 | −$14,299.95 | $17,393.58 → $20,395.24 |

Finalists (centre-level, development): under L1, 16 of 27 keep an identical ledger, 4 gain (I06 +$9,241.80, I14
+$4,928.82, I04 +$3,461.83, I15 +$1,091.04) and 7 lose (G11 −$25,845.75, I05 −$20,647.04, I08 −$15,217.37, I10
−$12,073.56, I02 −$8,409.66, I16 −$3,116.54, I13 −$1,356.41). GDX Growth participation changes in 4 of them (G11 0 → 2
lots, I02 8 → 9, I10 1 → 2, I05 1 → 0).

### Q3. Did admitting GDX become less costly to VGT, without displacing more valuable D1 trades?

**No.** The frozen rule R3 compares complete reruns with and without GDX Growth at the centre:

| Pair | Arm | Δ net (admitting GDX Growth) | Δ VGT Growth booked | Δ D1 booked | Verdict vs L0 |
|---|---|---:|---:|---:|---|
| A − C4 | L0 | +$7,597.45 | −$56,890.46 | +$16,680.49 | |
| | L1 / L2 | −$7,099.21 | −$56,991.79 | +$2,085.16 | no: not less costly to VGT, and more D1 displaced |
| B − C85 | L0 | +$28,187.07 | −$44,456.95 | +$20,799.55 | |
| | L1 / L2 | +$24,150.02 | −$44,456.95 | +$20,799.55 | no: not less costly to VGT |
| GP4 − S4 | L0 | −$13,115.80 | −$56,890.46 | — | |
| | L1 / L2 | −$13,217.13 | −$56,991.79 | — | no |
| GP85 − S85 | L0 | −$46,583.89 | −$95,431.36 | — | |
| | L1 / L2 | −$46,583.89 / −$51,193.18 | −$95,431.36 / −$100,040.65 | — | no |

- **Why the cost to VGT does not shrink.** The VGT Growth P&L lost to GDX is exactly the loss of long trend trades
  (centre ledgers):
  - **A against C4:** #4's 2016-06-29 → 2018-02-05 (+$42,826.37) and 2020-06-26 → 2020-09-03 (+$14,064.09);
  - **B against C85:** 08500a60's 2016-07-06 → 2018-10-12 (+$44,456.96);
  - **GP85 against S85:** the same 2016 trade and 2020-04-13 → 2022-01-20 (+$50,974.41).

  A short GDX lot holds the slot on their entry day (§3). A lifecycle that only changes what happens *after* the refusal
  cannot recover a trade whose entry moment has passed while the price runs away.
- **Admitting GDX became more costly to D1 in A.** Under L1 the freed #4 book took the 2016-12-07 crossing, which
  displaced a +$14,595.33 D1·GDX trade.

### Q4. Does E offer a useful simpler alternative to A, B, C4 and C85?

- **Yes, as a profit alternative: E is non-dominated in every arm** (rule R4) with three components instead of four.
  - **Against A:** E earns more at the centre (+$15,952.93 under L0, +$23,612.26 under L1/L2) at the same centre DD,
    with a lower p10 (−$8,553.15 under L0).
  - **Against B:** +$34,467.95 at the centre, p10 −$11,871.02, p90 DD nearly equal.
- **No, as a lower-risk alternative.** E's neighbourhood tail is A's and B's tail:
  - p90 DD $35,245.92;
  - 11.5% of draws above $35,000 [Wilson 95%: 8.7%, 15.0%];
  - worst $55,963.54;
  - worst-10% mean $39,035.

  Against C4, E trades +$23,550.38 of centre net for −$28,971.68 of p10 and +$10,796.97 of p90 DD.
- **Full history (retrospective):** E $441,831.21 with a $21,303.61 DD, validation +$115,494.92; A $450,270.82
  (+$139,887.46), C4 $401,867.24 (+$99,081.34), D $343,175.82 (+$74,688.80).
- **Limits.** E's encouraging development ablation is confirmed at its centre (it equals A's sealed removal record)
  but not as a robustness advantage. It is one informed combination; nothing here says it generalizes.

### Q5. How does standalone GDX Growth's matched neighbourhood compare with VGT #4 and 08500a60?

The common family-level instrument (§8.2 of the protocol), confirmation family, development, each book alone on
$100,000:

| Book alone | Centre net / DD | Median net | p10 net | Median DD | p90 DD | Worst-10% mean | Worst DD | > $35,000 [Wilson 95%] | Net > 0 | Retention p10/centre | Inflation p90/centre DD |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| GDX Growth (Appendix A) | $53,816.50 / $17,709.96 | −$10,436.77 | −$26,071.59 | $35,424.32 | $52,938.76 | $63,104.84 | $78,786.22 | 52.1% [47.1%, 57.0%] | 25% | −0.484 | 2.989 |
| VGT #4 | $92,575.71 / $14,578.10 | $42,637.80 | $10,456.77 | $17,158.85 | $22,265.15 | $24,374.36 | $30,853.41 | 0% [0%, 1.0%] | 99% | 0.113 | 1.527 |
| VGT 08500a60 | $115,509.15 / $19,344.80 | $98,866.19 | $63,181.60 | $20,064.83 | $24,507.27 | $28,024.10 | $38,418.10 | 0.8% [0.3%, 2.3%] | 100% | 0.547 | 1.267 |

- **The direct answer (rule R5).** 08500a60 has the strongest *matched* local stability evidence: it is stronger than
  both others on retention and inflation. #4 is second. The existing GDX Growth is clearly the weakest, and the
  half-radius family confirms it: 46.1% breaches, median net $1,228.19. None of the three is called the globally best
  standalone phenotype.
- **What drives the differences** (`standalone-drivers.md`):
  - **Appendix A** depends on its Rise lookback of 22 bars (ρ(u, DD) = −0.644). Shorter lookbacks breach $35,000 in
    86% of draws. The draws take a median of 17 trades, against the centre's 13, in choppy gold-miner markets. Its development
    centre is a string of short GDX trades. The two largest are 2020-06-24 (+$16,899.85) and the two 2016 trades
    (+$12.2k each); there are two initial-stop losses (−$6,910.38 in March 2020, −$7,394.32 in 2023).
  - **#4 and 08500a60** depend on a few long VGT trend trades that survive perturbation:
    - 08500a60: three trades make $107.7k of its $115.5k;
    - #4: one trade makes $42.8k of its $92.6k.

    Their nets fall with longer lookbacks (ρ ≈ −0.6), but their DDs stay moderate.
- **Remaining mismatch, disclosed.** The active inputs differ (19, 21, 22), and so do their box positions: 230, 183 and
  365 of 384 confirmation draws have a clipped input.
- **What remains unknown about standalone GDX discovery.**
  - Appendix A was selected in the browser with 2016–2026 in view.
  - No independent standalone GDX Growth search has been run.
  - Priority 3's searched GDX books rarely decided (3A).
  - Whether a GDX Growth phenotype exists with a stable neighbourhood on 2016–2024 is open. That is Priority 4A.

### Q6. Which lifecycle(s), if any, deserve optimization in 3B?

**Neither, by the frozen rule R6** (provisional, development). An arm deserves optimization if it helps at least two of
{A, B, GP4, GP85} and hurts none of the nine core Growth subjects.

- **L1:** helps none, hurts none ("little" everywhere).
- **L2:** helps A, hurts B and C85.

**Recommendation:** run 3B under L0 (the current model, still the benchmark), with protected both-symbol exploration
(standard §4.7).

- **L1 and L2 are not proposed** as search arms or as a production change.
- **The adapter stays as a documented experimental tool.** It could serve as a report-only comparison in a later
  Priority 5 study if a different design (for example, D1 funding-aware state or an allocation rule that does not let
  short GDX lots take VGT's trend entries) makes it relevant.
- **Validation does not challenge this.** Every subject's 2025–2026 P&L is identical under all three arms (§5), so
  2025–2026 gives no evidence for or against either lifecycle.
- **3B's design should address what this study isolates.** The cost of GDX to VGT is the refusal at entry, which no
  post-refusal lifecycle repairs. A search therefore needs either GDX books that do not take the slot on VGT's trend
  entries (timing, holding periods) or an allocation design.

### Q7. The planned standalone GDX Growth search (Priority 4A) and its pooled evaluation

Recorded in the roadmap as 4A, then 4B. Nothing is launched here.

- **4A: dedicated standalone GDX Growth optimization**, under the current standard (2.0.0):
  - **Windows:** all optimization and selection on 2016–2024, with frozen 2025–2026 validation (previously examined
    history, so labelled).
  - **Independent discovery:** a broad Growth 1.4.0 search on GDX alone with earlier-cutoff repetitions
    (C19/C21/C23) for chronological evidence. It is never seeded with Appendix A or later-selected settings.
  - **Informed refinement:** a separately labelled, separately budgeted lane around Appendix A, which stays an exact
    control with a no-improvement fallback (§3.2).
  - **Robustness:** selection families plus independent confirmation (3 × 128), and the common standalone family-level
    instrument of this study for matched comparison with #4 and 08500a60.
- **Its winner's pooled evaluation.** Standalone superiority is never assumed to carry into a pool; the winner enters
  only through complete pooled reruns:
  - **4B (GDX-only D1 + Growth):** with VG #2's GDX D1 book;
  - **as a component of the VGT + GDX pools:** against E, A and B, with the same matched instruments, the participation
    attribution (§2.9) and the GDX-to-VGT admission cost of R3.

## 3. What the lifecycles actually changed (mechanism)

**The four 3A refusal episodes** (`episodes.md`):

| Episode (L0: refused VGT Growth, virtual hold, idle closes) | L1 | L2 |
|---|---|---|
| GP85, 2016-07-06 (refused by a G·GDX lot; virtual → 2018-10-12, 563 idle) | refused; no fresh VGT request before 2018-10-12; no lot | retained; 6 waits; invalidated 2016-07-14 by the 5% guard (cap $110.9955 vs refused $105.71); no lot |
| GP85, 2020-04-13 (G·GDX lot; virtual → 2022-01-20, 400 idle) | refused; no fresh request; no lot | retained; 2 waits; entered 2020-04-15 close, filled 2020-04-16 at $232.19; initial stop 2020-04-21: −$4,609.29 |
| GP4, 2016-06-28 (G·GDX lot; virtual → 2018-02-05, 389 idle) | refused; one fresh crossing 2016-12-07, filled 2016-12-08 at $121.81, maximum hold 2016-12-29: −$101.33 | retained; 7 waits; invalidated 2016-07-11 (5% guard); then the same 2016-12-08 lot |
| B, 2020-04-13 (D1·GDX lot; virtual → 2022-01-20, 210 idle) | refused; no fresh request; also loses the 2020-04-23 GDX continuation (+$4,037.06) | the same 2020-04-16 re-entry (−$4,609.29) and the same lost continuation |

- **Neither arm recovered the refused trend trade.** The L0 virtual trades were large descriptive winners (3A: e.g.
  $44,456.96 and $50,974.41 in GP085), and they are never achievable profit in any arm.
- **Delay is not the same trade.** L2's late entry in April 2020 filled at $232.19, 3.7% above the original virtual
  fill ($224.00). Its ATR-based initial stop closed it at the next dip, which the original position had survived.

**First divergences** (`divergence.md`): in each case the earliest funded lot differs, then the portfolio after it.
For example, A under L1 diverges on 2016-12-08: the #4 crossing (−$101.33) is admitted and a D1·GDX lot of 2016-12-19
(+$14,595.33) is displaced. The booked net of every later lot falls from $285,881.16 to $274,184.77.

**Participation and idle time** (`participation.md`, development centres):

| Subject | Idle closes L0 / L1 / L2 (of 2,264) | L0 unfunded virtual holds (trades / closes / idle closes) |
|---|---|---|
| E | 1,142 / 1,163 / 1,163 | GDX 2 / 32 / 21 |
| A | 973 / 983 / 983 | GDX 4 / 76 / 30; VGT 3 / 520 / 245 |
| B | 998 / 1,019 / 1,015 | GDX 3 / 55 / 21; VGT 3 / 1,307 / 616 |
| GP4 | 1,587 / 1,572 / 1,572 | GDX 2 / 44 / 9; VGT 2 / 453 / 414 |
| GP85 | 1,590 / 1,590 / 1,586 | GDX 5 / 179 / 0; VGT 2 / 1,021 / 963 |
| C85 | 929 / 929 / 925 | VGT 2 / 734 / 464 |
| IP | 721 / 359 / 359 | VGT 3 / 951 / 408 |

- **L1/L2 remove the unfunded virtual holds by construction, but the capital those holds idled stays idle** for the
  Rise-entry books.
- **The breakout-heavy primaries (IP, SP) fill it,** and lose money doing so.
- **More trades, more GDX participation or fewer idle sessions are not success criteria.** Here they mostly coincided
  with lower net.

## 4. Matched neighbourhoods (development; `neighbourhoods.md`)

Priority 3's 384-draw instrument, with the same effective draws under L0, L1 and L2:

- **L0 draws:** read from Priority 3's archives for eight subjects; all 24 archived families reproduce Priority 3's
  sealed statistics exactly.
- **Fresh draws:** E's L0, and every subject's L1 and L2.

Confirmation family:

| Subject | Arm | Median net | p10 net | p90 DD | Worst-10% mean | Worst DD | > $35,000 |
|---|---|---:|---:|---:|---:|---:|---:|
| E | L0 / L1 / L2 | $213,666 / $213,064 / $213,386 | $173,137 / $172,932 / $172,932 | $35,246 / $35,131 / $35,174 | $39,035 / $38,754 / $38,898 | $55,964 | 11.5% / 10.9% / 11.2% |
| C4 | L0 / L1 / L2 | $244,937 / $245,460 / $246,329 | $202,108 / $203,372 / $205,238 | $24,449 / $24,095 / $24,239 | $28,103 / $27,851 / $27,912 | $51,376 | 1.3% each |
| C85 | L0 / L1 / L2 | $236,467 / $236,514 / $237,434 | $203,285 / $203,285 / $202,332 | $24,164 / $24,208 / $25,667 | $27,741 / $27,832 / $28,895 | $50,443 | 1.3% each |
| A | L0 / L1 / L2 | $219,202 / $221,885 / $224,468 | $181,690 / $186,330 / $185,408 | $36,278 / $35,055 / $35,098 | $40,207 / $38,790 / $39,084 | $55,964 | 13.3% / 10.4% / 10.7% |
| B | L0 / L1 / L2 | $216,847 / $216,113 / $216,346 | $185,008 / $184,873 / $181,495 | $35,131 / $35,100 / $35,805 | $38,951 / $39,132 / $41,139 | $55,964 | 10.9% / 10.7% / 12.8% |
| GP4 | L0 / L1 / L2 | $12,771 / $17,934 / $19,660 | −$10,808 / −$9,003 / −$8,513 | $51,576 / $49,972 / $50,527 | $58,340 / $57,761 / $58,488 | $69,951 / $72,710 / $74,755 | 45.3% / 45.6% / 43.5% |
| GP85 | L0 / L1 / L2 | $54,391 / $56,237 / $60,938 | $17,806 / $19,098 / $21,253 | $42,276 / $43,488 / $42,713 | $49,012 / $50,603 / $49,797 | $62,499 / $65,367 / $62,499 | 22.4% / 25.0% / 22.7% |
| V4 | L0 / L1 / L2 | $108,212 / $107,209 / $108,012 | $66,489 / $64,105 / $64,772 | $30,375 / $29,222 / $29,222 | $32,084 / $31,457 / $31,457 | $40,032 | 1.0% / 0.8% / 0.8% |
| V85 | L0 / L1 / L2 | $112,124 / $111,617 / $113,842 | $70,486 / $70,486 / $74,335 | $29,600 / $30,078 / $30,078 | $31,096 / $32,286 / $32,286 | $34,192 / $36,497 / $36,497 | 0.0% / 1.3% / 1.3% |

(Median and p95 DD, Wilson intervals, mean excess, breach ledgers, clipping and the half / 1.5× radius families are in
`neighbourhoods.md`; E's breach share 11.5% has a Wilson 95% interval of 8.7%–15.0%.)

- **A's and B's original Q3 labels stand (fail, as sealed),** and they remain user-directed candidates.
  - A's p90 DD falls from $36,277.63 to $35,054.66 under L1, still above $35,000.
  - B's rises under L2.
  - Nothing here relabels Q3 or sets a tolerance.
- **Radius sensitivity.** The 1.5× family roughly doubles the breach share of the GDX-including subjects (A 27.3%, B
  24.2%, E 23.4% under L0), under every arm.
- **These are perturbation frequencies on one history,** not probabilities of future losses. The dependent
  Latin-hypercube draws make the Wilson intervals approximations.
- **Dimensionality differs** (active inputs: E 35, C4 37, C85 38, A 56, B 57, GP4 40, GP85 41, V4 29, V85 30). The joint
  scope also moves the inert inputs of disabled books (Priority 3's instrument).

## 5. Full history and validation (retrospective; `full.md`)

FULL was opened only after the development records and verdicts were sealed and committed. `FULL_MANIFEST.json`
(sha256 `876a2a43…9317`) was committed as `aaa4384c` before stage F ran.

| Subject | Full net L0 / L1 / L2 | Full DD | Validation net (all arms) | Reset validation DD |
|---|---:|---:|---:|---:|
| D | $343,175.82 (all) | $21,303.61 | $74,688.80 | $21,303.61 |
| E | $441,831.21 / $437,794.15 / $437,794.15 | $21,303.61 | $115,494.92 | $21,303.61 |
| C4 | $401,867.24 / $404,867.51 / $404,867.51 | $21,536.85 | $99,081.34 | $21,536.85 |
| C85 | $339,905.35 / $339,905.35 / $335,296.06 | $19,821.14 | $76,224.08 | $16,510.18 |
| A | $450,270.82 / $438,574.43 / $438,574.43 | $21,536.85 | $139,887.46 | $21,536.85 |
| B | $408,898.55 / $404,861.49 / $400,252.20 | $20,801.07 | $117,030.20 | $18,972.89 |
| GP4 | $173,158.78 / $173,057.46 / $173,057.46 | $21,972.42 | $93,698.88 | $15,910.70 |
| GP85 | $129,919.69 / $129,919.69 / $125,310.40 | $25,102.33 | $60,994.43 | $17,240.60 |
| V4 | $271,525.33 / $274,525.60 / $274,525.60 | $19,534.41 | $66,585.12 | $14,950.77 |
| V85 | $252,359.65 (all) | $19,556.63 | $60,551.20 | $16,336.40 |
| SG / S4 / S85 alone | $141,157.37 / $145,468.46 / $160,974.09 (all arms) | $17,709.96 / $14,578.10 / $19,344.80 | $87,340.87 / $52,892.75 / $45,464.93 | — |
| IP | $306,452.60 / $223,395.47 / $223,395.47 | $57,568.06 | −$32,190.25 | $57,568.06 |
| XP | $322,022.83 (all) | $17,280.74 | $76,802.05 | $15,620.02 |
| SP | $242,874.77 / $228,574.82 / $228,574.82 | $40,108.09 | −$6,699.40 | $39,477.36 |

- **Every known L0 target of the brief reproduces to the cent** (10 of 10), as does VG #2 native ($334,911.93 /
  $21,303.61).
- **The lifecycle differences are entirely in 2016–2024.** In every subject the paths reconverge before 2025, and the
  2025–2026 P&L and its reset DD are identical under L0, L1 and L2.
- **The full-history DD is unchanged by the lifecycle** for every subject.
- **The strong 2025–2026 figures of A, E and the GDX book alone come from previously examined history.** Appendix A was
  selected in the browser with that window in view, so they are not independent evidence.

## 6. Implementation, audit and verification

- **The capacity-hook audit** (protocol §5.2). The canonical harness hook `GateRuntime.capacity` is asked before the
  trend filter, the recovery gate and the initial-stop check. A blocked eligibility opportunity stays armed and
  retries at every later bar: an L2-like retry inside native eligibility, demonstrated by a test. The hook was
  therefore not reused.
- **The adapter.** `src/vg-growth-funding-lifecycle/lifecycle.ts` copies the canonical orchestrator. Its only
  differences are seven marked insertions (`results/engine/orchestrator.diff`, enforced by a test):
  - a `LifecycleBook` asks the allocator at the order, after every gate;
  - a refusal keeps the canonical decision-time transitions but creates no order or position;
  - L2's retained opportunity follows protocol §5.6.

  Canonical files are untouched: Priority 3's evaluation and closure digests verify.
- **The coupling.** A fixed point over Priority 3's unchanged `runPool`. Refused requests and L2 waiting checks are
  pool records that a consistent run always refuses. The guess only speeds it up (V4: the same result without it).
- **Stage V passed every gate** (`verification.md`):
  - 43 L0 centres equal their sealed records, and E equals A's sealed removal record;
  - 144 archived draws reproduce exactly;
  - D and the standalone books are identical under L0, L1 and L2, and never refused;
  - the D23 prefix equals D24 up to 2023-12-29 for the nine core subjects under L1 and L2;
  - 56 Growth configurations equal the canonical engine in L0 mode;
  - accounting holds on every centre: Σ lots = net, principal ≤ $100,000, one slot.
- **Tests.**
  - Synthetic (23): refusal and release, zero new crossings, a fresh crossing, repeated refusal, eligibility against
    the canonical hook, breakout decisions, L2 entry / waiting / the 5% guard / predicate invalidation / 20-session
    and native expiry, a next-open gap across a year boundary, precedence of a fresh decision, no continuation from an
    unfunded profit, and a two-book tie in the pool.
  - Parity (3): the canonical source pin, the recorded diff, and real-data L0 books.
  - The full suite: §8.
- **Compute.**
  - **Fresh simulations:** 14,563 development and 49 FULL, exactly the frozen plan, against ceilings of 20,000 and
    200. There were no retries.
  - **Counted apart:**
    - 27,354 consistency rounds;
    - 34,129 Growth re-simulations;
    - 5,120 archive reads;
    - 112 book-parity runs;
    - about 390 engineering pilot evaluations before the freeze. They printed mechanics only. Uninterrupted, SIGTERM,
      worker-kill and unit-SIGKILL runs all resumed identically.
- **Resources.** Each stage ran as a unit in `vgflc.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0) with 12 workers.
  - **Memory peaks:** V 9.2 GB, C 8.2 GB, N 11.4 GB, S 10 GB, F 9.5 GB.
  - **Run times:** N took 6 minutes; every other stage under 40 s.

## 7. Documentation changes

- **Optimization standard 2.0.0 (major; the brief §1's authorized preference).** It adds §7.7 [M] *Reporting format:
  no visuals*: written analysis, Markdown tables and machine-readable results only.
  - §0.1's chart permission is replaced.
  - Earlier visuals are preserved; studies pinned to 1.0.0 and 1.1.0 keep their pins, with a preflight notice.
  - The registry, the change log (§8), the protocol template (§5 funding lifecycle, §15 format), `CLAUDE.md` (the
    standing reporting preference) and the preflight tests (the 1.1.0 pin) follow.
- **The roadmap** records:
  - Priority 5A (brought forward) as complete;
  - 3B as next, subject to review, under L0, with all three portfolio combinations kept as alternatives;
  - 4A (standalone GDX Growth optimization) then 4B;
  - the remaining Priority 5 work;
  - the user-authorized objective of comparing the three combinations and the brought-forward comparison.
- **Not changed.** No production or canonical lifecycle change; L1 and L2 are experimental study-specific policies. No
  new hard risk threshold.

## 8. Limitations and what this study cannot establish

- **Fixed phenotypes only.** The failure of L1/L2 to help these configurations does not prove that an architecture
  could never work after optimization. Their small gains on single subjects (C4, V4, A under L2) do not establish a
  better method.
- **The L2 constants (20 sessions, 5%) are design choices, not estimates,** and they were not varied. A wider extension
  would have kept the 2016 opportunities alive longer, but they would still have entered weeks late into a rally.
  Nothing here tests that.
- **Only Growth's refusal lifecycle changed.** D1 still uses its shadow lifecycle. A completely funding-aware D1 +
  Growth engine, D1 refusal changes and other allocation designs remain Priority 5.
- **The evidence is informed and examined.** Every subject was chosen with 2016–2024 (and for some 2025–2026) in view.
  Local stability is not chronological reliability, and 2025–2026 is not an untouched holdout.
- **Breach frequencies are not future-loss probabilities,** and there is no drawdown guarantee.
- **Full npm suite:** see `RESEARCH_RECOVERY.md` (run as a contained unit; known pre-existing failures distinguished).

## 9. Integrity and reproduction

- **Frozen and committed before any L1/L2 result:**
  - `PROTOCOL.md` `5db1e08b…`, `STUDY_MANIFEST.json` `b37cf60c…5bbf`, `results/protocol-freeze.json` `c95a7709…c7bf`;
  - standard 2.0.0, scope `diagnostic`; the preflight passes;
  - commit `6b0ecf10`.
- **Sealed records** (`npm run vg-life -- verify`: 9 ok):

  | Stage | Record | sha256 |
  |---|---|---|
  | V | `results/verification/verification.json` | `4b88dff7eacc…918eb7` |
  | C | `results/development/centres.json` | `09afda78f6fa…785feb8` |
  | N | `results/development/neighbourhoods.json` | `86d14f19876f…b1e7ca` |
  | S | `results/development/standalone.json` | `35f28d1851c1…7e7154` |
  | P | `results/development/verdicts.json` | `3a16a387eb5d…68fe319` |
  | FULL guard | `FULL_MANIFEST.json` | `876a2a43f207…dd9317` |
  | F | `results/full/full.json` | `b708f7635660…05ec36` |

- **Amendments:** none.
- **Reproduce:** `RUN_COMMANDS.md`. Sealed stages refuse to rerun, and Priority 3's and 3A's records are untouched.

## 10. Recommended next task

**Review this report, then commission Priority 3B under L0:** a larger-budget VGT + GDX portfolio optimization.

- **Keep all three combinations** (VG #2 + GDX Growth, + VGT Growth, + both) as meaningful alternatives.
- **Protect both-symbol exploration** (§4.7).
- **Attribute participation** (§2.9), and report the GDX-to-VGT admission cost (R3) for its candidates.
- **Design for the refusal at VGT's trend entries.** That cost, not virtual waiting, is what to design for: GDX timing
  and holding periods, or a separate allocation study.
- **Commission Priority 4A (standalone GDX Growth) separately.** It is independent of 3B and can run before or after
  it.

Nothing is started automatically.
