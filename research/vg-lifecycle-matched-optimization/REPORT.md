# REPORT — Priority 5B: matched L0/L1/L2 optimization of the VGT + GDX D1 + Growth portfolio

Research only, not deployed. VG #2's two D1 books (D1·VGT, D1·GDX) plus Growth on VGT only (V), GDX only (G) or both
(B) in **one shared $100,000 slot** (one exclusive funded slot, no compounding, no preemption, 5 bps per side, 11% simple
interest, fixed same-instant order D1 → GDX → VGT), optimized **separately under each Growth funding lifecycle** of
Priority 5A with identical spaces, budgets, seeds, gates and rules:

- **L0** — the current virtual book (a refused Growth entry becomes an unfunded virtual position);
- **L1** — actual funding (a refused request leaves nothing and consumes the opportunity; fresh canonical opportunities
  only; continuation only from actual funded exits);
- **L2** — L1 plus one retained refused base opportunity per Growth book (5A's fixed 20 sessions / 5%).

D1's shadow lifecycle is unchanged in every arm. **DD** is the maximum minute drawdown of the marked net; DD % = DD ÷
the fixed $100,000; the ceiling is **$35,000**. Historical compliance does not guarantee future drawdown. Development
and every choice: 2016-01-04 → 2024-12-31; validation 2025-01-02 → 2026-10-30 (the verified common complete endpoint),
**previously examined history, not an untouched holdout**. Figures come from sealed records (`results/`); complete
tables are in `results/tables/`. No charts (standard 2.0.0 §7.7).

## 1. Bottom line

**No lifecycle produced a demonstrated, repeatable improvement over a freshly optimized L0 portfolio.** Matched
optimization (identical proposals per arm and cutoff, paired seeds, identical gates and rules) found essentially the
same best C24 development portfolio under all three lifecycles: Priority 3B's formal primary (`informed-joint#1`, VG #2
D1 books lightly refined + a #4-relative VGT Growth book, GDX Growth OFF), or a close relative of it. The frozen evidence
labels, computed before the validation door opened:

| X vs L0 | Development (C24) | Risk (development tail) | Chronology (2020–2024 independent paths) | **Frozen label** |
|---|---|---|---|---|
| **L1** | 0: primary $382,163.79 vs $382,721.46 (−$557.67) | **worse**: confirmation p90 DD $33,599.14 vs $30,182.14 (+$3,417.00; 7.6% vs 2.3% of draws above $35,000) | 0: both unsupported (L1 −$30,032.46 / DD $106,883.44; L0 −$29,358.01 / DD $67,214.22) | **harmful** (tail risk, no profit gain) |
| **L2** | 0: $382,163.79 vs $382,721.46 (−$557.67) | same (p90 DD $30,525.95) | **+**: L2's path supported (+$49,518.36, DD $29,279.04) while L0's breached | **conditional profit/risk trade-off** |

- **L2's chronological "support" is fragile and is not a general lifecycle benefit.** It rests on the pooled replicates'
  fold primaries: each replicate's own path breached the ceiling (R1 alone +$64,619.96 / DD $35,918.05; R2 alone
  +$40,103.29 / DD $52,503.46), and L2's robust-profit and lower-drawdown role paths breached too ($67,694.38,
  $48,202.56). Its 2020–2021 slice gain came from one retained re-entry (a VGT Growth crossing refused on 2020-10-05,
  re-entered 2020-10-08, whose retained remainder then held the slot through 2021 and kept the pool out of a losing run
  of D1·GDX trades); its 2022–2023 slice gain came from a phenotype that earns the same under every lifecycle (§3, §5).
- **Validation (previously examined history; reported, never relabelling):** the three primaries passed V1–V3 and all
  trailed C4 (+$99,081.34): L0 +$96,883.72, L1 +$91,128.15, L2 +$95,627.06 (the L2 primary is 3B's formal primary
  unchanged; its 2025–2026 figure was already known). No phenotype's 2025–2026 P&L differed between L1 and L2, and only
  one exported phenotype's differed between L0 and L1/L2 (§6).
- **What remains the baseline:** L0 (the production model) and the existing research baselines C4 and C4-refined, which
  qualified in every arm. No deployment approval is implied.

## 2. Answers to the brief's questions

1. **Did optimization for L1 or L2 improve on freshly optimized L0 under matched effort?** No demonstrated improvement.
   On development the C24 primaries are within $557.67 of each other (L0 slightly ahead), far inside the replicate
   spreads ($1,726.99 in L0's independent bests; $35,143.19 in L1's; $16,675.20 in L2's). L1's primary carries a
   heavier neighbourhood tail (frozen label **harmful**); L2 matches L0 on development and its independent procedure kept
   the 2020–2024 sequential drawdown within $35,000 (frozen label **conditional profit/risk trade-off**), with the
   fragility stated above.
2. **Lifecycle benefit, phenotype adaptation, interaction, search variability or one episode?**
   - At C24 the lifecycle effect on L0's primary and on L2's primary is **$0.00** (identical ledgers under L0, L1 and
     L2). L1's primary is a phenotype that **depends on L1**: $367,986.16 under L0 against $382,163.79 under L1/L2 (one
     extra funded VGT Growth lot, +$13,598.59, after a refusal no longer leaves a virtual hold) — an interaction that
     only recovers what L0's best phenotype already earns.
   - L1's independent primary is the clearest **phenotype adaptation**: a B pool whose GDX Growth book never decides,
     $126,455.98 under L0 against $214,405.77 under L1/L2. Under L0 two refused VGT trades held virtually for 654
     closes (579 idle); under L1 the book re-requests and the pool reshuffles (6 lots newly admitted, +$87,084.58; 4
     displaced). Decomposition against L0's independent primary: total +$15,290.46 = phenotype −$72,659.33 +
     interaction +$87,949.79; it is within search variability (L1's replicate bests differ by $35,143.19).
   - In the folds, L2's advantage was an **interaction** in 2020–2021 (its C19 primary: +$26,887.52 / DD $29,279.04
     under L2, −$738.39 / $46,450.16 under L0, −$4,847.82 / $43,884.76 under L1) concentrated in **one episode** (the
     2020-10 retained re-entry and its retained remainder), and a **phenotype** effect in 2022–2023 (its C21 primary
     earned +$21,050.14 under every lifecycle; L0's C21 primary lost −$38,341.52 under every lifecycle).
   - Every total effect at every cutoff is within the larger replicate spread of the two arms (`crosstest.md`), i.e.
     within search variability.
3. **Did the earlier-cutoff selection paths improve and stay within budget?** Only L2's procedure stayed within $35,000
   (DD $29,279.04, 2020-01-24 → 2020-03-23); L0 (DD $67,214.22, 2020-09-10 → 2022-10-13) and L1 (DD $106,883.44,
   2020-02-19 → 2022-09-26) breached and lost money over 2020–2024. Every arm's seed-level and robust-profit paths
   breached. The independent procedure is therefore chronologically unsupported under L0 and L1, and supported under L2
   only for the pooled primaries.
4. **Did altered Growth participation displace more valuable D1 or VGT opportunities?** Not at the primaries: L0's and
   L2's primaries are unchanged by the lifecycle; L1's primary gains one VGT Growth lot and loses one D1·GDX lot that had
   lost $579.05. In L1's independent primary the freed VGT book changes the slot's timing and admits 4 D1·GDX lots
   (+$69,046.46) while displacing 3 D1·GDX lots and 1 D1·VGT lot (net +$865.21). The fixed controls reproduce 5A
   exactly: L1/L2 cost E −$4,037.06, A −$11,696.39 and IP −$83,057.12 (freed Growth books displacing D1 trades); C4 gains
   +$3,000.27. GDX Growth stayed unfunded or absent in every primary.
5. **What should remain the research baseline, and what remains uncertain?** L0 remains the production model and the
   baseline lifecycle; C4 and C4-refined remain the distinct research baselines (both qualified in every arm; C4 led every
   searched primary in validation). Uncertain: whether L2's 2020–2021 behaviour reflects anything beyond one episode;
   whether larger budgets would separate the arms (the independent searches were resource-guard- or trigger-limited and
   1/16 of 3B's per-cutoff exploration); and everything that one dominated history (the 2020 rebound is the leading
   episode of most principal neighbourhoods) cannot show.
6. **What does this change about the next Growth-for-other-ETFs stage?** Run it under **L0**: a matched search found no
   repeatable gain from L1 or L2, L1 adds tail risk, and L2's only advantage was a single-episode effect. Two lessons
   carry over: a phenotype can adapt to a lifecycle (L1's independent primary), so a lifecycle must never be compared on
   fixed phenotypes alone; and in a shared slot a long Growth hold (or a retained remainder) can decide which D1 trades
   happen — screening should evaluate any ETF's Growth book inside the intended pool, not standalone.

## 3. Development (C24, 2016–2024; `results/tables/selection-C24.md`)

| Arm | Member | Inc. | Centre net | Centre DD | Conf. median | Conf. p10 | Conf. p90 DD | > $35k |
|---|---|---|---:|---:|---:|---:|---:|---:|
| L0 | **primary** `informed/R1#1 profit` | V | $382,721.46 | $19,459.83 | $250,450.64 | $209,723.47 | $30,182.14 | 2.3% |
| L1 | **primary** `informed/R1#1 profit` | V | $382,163.79 | $19,459.83 | $259,970.05 | $213,323.55 | $33,599.14 | 7.6% |
| L2 | **primary** `informed/R2#1 profit` (= 3B's formal primary) | V | $382,163.79 | $19,459.83 | $253,084.32 | $210,312.19 | $30,525.95 | 2.6% |
| L0 | independent primary `indep/R2/G#1` | G | $199,115.31 | $23,299.85 | — | $87,126.70 | $34,049.58 | — |
| L1 | independent primary `indep/R1/B#1` (GDX Growth unfunded) | B | $214,405.77 | $23,334.19 | — | $173,199.71 | $24,910.76 | — |
| L2 | independent primary `indep/R2/B#1` (GDX Growth unfunded) | B | $195,286.84 | $23,489.54 | — | $86,215.68 | $33,407.25 | — |
| all | C4 | V | $302,785.91 (L0) / $305,786.18 (L1, L2) | $17,332.09 / $17,280.74 | — | $204,969.43 / $205,972.49 / $207,673.01 | $24,686.89 / $24,644.30 / $24,767.36 | qualified |
| all | C4-refined | V | $360,569.71 (L0, L1) / $360,138.07 (L2) | $17,280.74 | — | $225,138.34 / $225,592.54 / $225,008.90 | $24,343.39 / $24,343.39 / $24,522.94 | qualified |
| all | D (D1 only) | — | $268,487.02 | $20,801.07 | — | $189,382.64 | $24,605.01 | comparator (Q6 by design) |

- **Seed-level (search variability).** Informed replicates: every arm's R1 and R2 actual-profit holders earn $382,163.79
  except L0 R1 ($382,721.46). Independent replicates: L0 $197,388.32 / $199,115.31; L1 $214,405.77 / $179,262.58; L2
  $178,611.64 / $195,286.84 — the arms differ by less than the replicates within L1 and L2.
- **Controls under each lifecycle** reproduce 5A field for field (stage V). E, A and B fail Q3 in L0 and L2 as sealed
  before; B qualifies under L1 (p90 DD $34,982.80, inside finite-draw noise of the ceiling) — reported, never relabelling
  its original verdict (standard §2.8). The full member tables, roles, Pareto sets and near misses are in
  `selection-*.md`.
- **Combined candidates genuinely fund D1 and Growth** (Q6). The primaries are V (GDX Growth OFF); the independent B
  primaries of L1 and L2 never funded their GDX Growth books (labelled "unfunded" in `selection-C24.md`); L1's
  independent primary's D1·GDX and L2's D1·VGT are token. Searching GDX Growth as an independent structure again found
  no competitive funded GDX book.

## 4. Chronological evidence (independent lanes; `results/tables/folds.md`)

| Fold → slice | L0 primary: P&L / DD | L1 primary | L2 primary |
|---|---:|---:|---:|
| C19 → 2020–2021 | B: +$9,083.51 / $39,527.29 | B: −$39,829.71 / $65,926.68 | V: +$26,887.52 / $29,279.04 |
| C21 → 2022–2023 | V: −$38,341.52 / $57,259.44 | B: −$13,416.67 / $52,273.52 | B: +$21,050.14 / $25,971.37 |
| C23 → 2024 | G: $0.00 (no trade) | G: +$23,363.92 / $15,733.96 | B: +$1,730.70 / $9,182.94 |
| **Sequential (switch charges incl.)** | **−$29,358.01 / DD $67,214.22 — unsupported** | **−$30,032.46 / $106,883.44 — unsupported** | **+$49,518.36 / $29,279.04 — supported** |

- **Cross rows** (each fold primary under the other lifecycles, report-only): L0's C19 primary earns +$20,759.72 under
  L1 and +$25,477.57 under L2 (DD $39,527.29 / $49,953.45); L1's C19 primary loses under every lifecycle; L2's C19
  primary earns only under L2 (above); the C21 and C23 primaries are largely lifecycle-insensitive (L1's C21 primary
  +$8,923.53 under L0). The lifecycle mattered in 2020–2021, when refusals, virtual holds and retained re-entries
  interacted with the crash and rebound, and little afterwards.
- **Controls on the same slices** (chosen with later data; descriptive): C4 +$235,688.78 (DD $17,280.74) under every
  lifecycle; C4-refined +$283,693.23 (L0, L1) / +$283,261.59 (L2); D +$224,535.51.
- **Episode dependence** (`diagnostics.md`): 44–100% of the principal holders' selection neighbours share the centre's
  leading winning episode (usually the March–September 2020 rebound), and 34–85% of their net is earned inside it —
  local stability measured one episode, as the audit found; it is not chronological reliability.

## 5. Cross-test matrix and decomposition (`results/tables/crosstest.md`)

C24 rows (development, centre net under L0 / L1 / L2):

| Row | Phenotype | L0 | L1 | L2 |
|---|---|---:|---:|---:|
| R01 | L0 primary | $382,721.46 | $382,721.46 | $382,721.46 |
| R07 | L1 primary | $367,986.16 | $382,163.79 | $382,163.79 |
| R14 | L2 primary (3B formal primary) | $382,163.79 | $382,163.79 | $382,163.79 |
| R04 | L0 independent primary | $199,115.31 | $199,115.31 | $199,115.31 |
| R11 | L1 independent primary | $126,455.98 | $214,405.77 | $214,405.77 |
| R18 | L2 independent primary | $195,286.84 | $195,286.84 | $195,286.84 |
| R20–R28 | C4, C4-refined, D, C85, E, A, B, IP, GP85 | 5A's L0 centres | 5A's L1 centres | 5A's L2 centres |

| Comparison | Total | Lifecycle | Phenotype | Interaction | Reading |
|---|---:|---:|---:|---:|---|
| C24 primaries L1 vs L0 | −$557.67 | $0.00 | −$14,735.30 | +$14,177.63 | no material total effect |
| C24 primaries L2 vs L0 | −$557.67 | $0.00 | −$557.67 | $0.00 | no material total effect |
| C24 independent L1 vs L0 | +$15,290.46 | $0.00 | −$72,659.33 | +$87,949.79 | interaction (phenotype adapted to L1); within search variability |
| C24 independent L2 vs L0 | −$3,828.47 | $0.00 | −$3,828.47 | $0.00 | phenotype |

The matched confirmation medians agree (C24 primaries: L1 +$9,519.41, L2 +$2,633.68 against L0, inside replicate
spreads). Lifecycle equality where a book is never refused, or its refusals are inconsequential (R01, R04, R14, R18), is
expected and is not evidence for a funding rule.

## 6. Validation and full history (FULL once, after `FROZEN_SELECTION.json` was committed; `results/tables/validation.md`)

| Phenotype | Lifecycle | Development net | Validation P&L | Reset val. DD | Full net | Whole-run DD | V1–V3 |
|---|---|---:|---:|---:|---:|---:|---|
| L0 primary | L0 (= L1 = L2) | $382,721.46 | $96,883.72 | $20,385.99 | $479,605.18 | $20,385.99 | pass |
| L1 primary | L1 (= L2) | $382,163.79 | $91,128.15 | $20,916.75 | $473,291.94 | $20,916.75 | pass |
| L2 primary | L2 (= L0 = L1) | $382,163.79 | $95,627.06 | $20,385.99 | $477,790.85 | $20,385.99 | pass |
| L0 independent primary | L0 / L1, L2 | $199,115.31 | $86,283.16 / $78,037.42 | $23,171.75 / $22,868.52 | $285,398.47 / $277,152.73 | $23,689.43 | pass |
| L1 independent primary | L1 (= L2) | $214,405.77 | $38,829.27 | $17,986.97 | $253,235.04 | $23,334.19 | pass |
| L2 independent primary | L2 (= L0 = L1) | $195,286.84 | $62,168.11 | $17,501.41 | $257,454.96 | $23,489.54 | pass |
| C4 | L0 / L1, L2 | $302,785.91 / $305,786.18 | **$99,081.34** | $21,536.85 | $401,867.24 / $404,867.51 | $21,536.85 | pass |
| C4-refined | L0, L1 / L2 | $360,569.71 / $360,138.07 | $91,512.65 | $19,477.66 | $452,082.36 / $451,650.72 | $19,477.66 | pass |
| D | all | $268,487.02 | $74,688.80 | $21,303.61 | $343,175.82 | $21,303.61 | pass |

- 75 of 84 rows pass V1–V3. The failures are every lifecycle's run of the informed both-funded B phenotype (3B's
  `informed-joint#3`, reset validation DD $37,172.62), the informed best-G phenotype (3B's G holder, $43,367.49) and IP
  (−$32,190.25, DD $57,568.06) — all previously known to fail.
- **Known targets, compared only here, all reproduced to the cent:** C4 (development, validation $99,081.34 / $21,536.85,
  full $401,867.24); C4-refined (validation $91,512.65, full $452,082.36); VG #2 native full $334,911.93 / $21,303.61;
  and 5A's full-history L0/L1/L2 figures of C4, C85, E, A, B, GP85, IP and D.
- The lifecycle differences of every control remain confined to 2016–2024 (identical 2025–2026 P&L in every arm), as
  in 5A. Report-only stresses and FULL perturbations are in `validation.md`.
- This is previously examined history: the L2 primary's +$95,627.06 and C4's +$99,081.34 were known before this study.

## 7. Search, effort and resources (`results/tables/search.md`, `compute.md`)

| Lane | Distinct proposals per arm (identical in L0, L1, L2) | Unique fresh simulations (3 arms) | Wall | Stop |
|---|---:|---:|---:|---|
| C19 independent | 9,472 (8,192 base + 1 synchronized round) | 317,159 | 43 min | resource guard after round 1 |
| C21 independent | 9,728 | 310,693 | 62 min | resource guard after round 1 |
| C23 independent | 12,288 | 287,041 | 68 min | triggers not met after 4 rounds |
| C24 independent | 13,824 | 313,892 | 82 min | triggers not met after 8 rounds; one B position reached its 12-island cap (budget-bound) |
| C24 informed | 4,034 | 235,609 | 79 min | triggers not met (no extension) |

- Refinement moves (counted apart) 1,843–3,089 per arm and lane. Distinct configurations and funded-ledger counts per arm
  are in `search.md`; promotions and shortlists keep one configuration per ledger.
- **Matched proposals do not mean matched CPU:** evaluations requested per arm were within ±4% of each other per lane
  (e.g. C19: L0 101,600, L1 102,589, L2 103,593), while an L1/L2 B-pool evaluation costs ≈ 2.5× an L0 one.
- **Simulations:** pool jobs 1,680,904 (searches 1,464,394; qualifications 189,747; cross-tests 25,227; validation
  neighbours 1,536) + in-process fold, diagnostic and validation runs 2,215 + engineering (stage V ×2 with dry runs, bench,
  pilot and interruption tests) ≈ 295,000 (cap 320,000) + the discarded A1 run 11,761 ≈ **1.99 million of the 3,000,000
  ceiling**.
- **Coverage implications.** The resource guard bound at C19 and C21 after one extension round (its frozen finishing
  reserve of 144,000 was conservative: the finishing phases used ≈ 81,000); every independent base was 1/16 of 3B's per
  cutoff, so these searches mainly refined known regions (the informed lane re-found 3B's primary) and are budget-limited,
  not converged.
- **Resources:** 14 workers; peak job cgroup memory 6.2–11.3 GiB (validation neighbours the highest); no memory.high or
  OOM event; every unit in `vglmo.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0).

## 8. Mechanism notes

- **Where L1 changes a portfolio:** a refused Growth request no longer leaves an unfunded virtual position, so the book
  can ask again — for a Rise book only at a fresh crossing; for a breakout book at the next qualifying close. That frees
  idle capital (L1's independent primary: idle closes 886 → 343) but also lets the Growth book take the slot from D1
  trades; whether that helps depends on the phenotype, which is why the L1 search adapted to it.
- **Where L2 changes a portfolio:** rarely. Retained opportunities mostly wait and expire or are invalidated (L1's
  primary under L2: 4 waits, no entry). The one consequential case in the chronological paths was the 2020-10 VGT
  re-entry whose retention remainder held the slot through 2021 (`results/supplementary/c19-l2-primary-mechanism.json`,
  report-only, outside the frozen plan: under L2 the slot was held at 459 of 505 slice closes against 304 under L0, and
  the losing 2021 D1·GDX trades of the L0 run never occurred).
- Native eligibility (a searched Growth gene, identical in every arm) and L2's refusal-preservation rule are distinct.
  All three primaries' VGT Growth books use native eligibility — time-limited (L0's primary and 3B's formal primary,
  L2's) and minimum strength (L1's primary, `583ca9122b72f213`) — with the trend filter OFF; native eligibility decides
  before any funding request, whereas the retained opportunities above are L2's rule acting only after a refusal.

## 9. Documentation and roadmap

- **Eligibility documentation corrected** (`docs/strategy-lab/GROWTH_ENTRY_GATES.md` §3.1, §8; no engine change):
  eligibility ON = OFF trade for trade only when no blocker is active (trend filter, Drawdown Recovery Gate, an
  unavailable initial risk stop) and the policy is valid at every arming bar — always for policies 1, 3, 4, 5, and for
  policy 2 when a ≤ X; with a > X weaker crossings are invalidated at once. Verified against the engine, its canonical
  tests and this study's synthetic test (`tests/eligibility.test.ts`). The optimization standard is unchanged (2.0.0).
- **Roadmap** (`docs/research/ROADMAP.md`): the process audit complete; this study recorded as 5B, separate from the
  failed ranking-formula audit; 5A complete and unchanged; after this study's review, Growth suitability screening for
  other ETFs, then focused optimization of promising ETFs; 4B and broader allocation / reassessment / preemption studies
  deferred and not prerequisites. Nothing starts automatically.

## Implementation, verification and integrity

- **One evaluation path** (`src/vg-lifecycle-matched-optimization/life.ts`): L0 = Priority 3's evaluation (the exact
  3B path); L1/L2 = Priority 5A's coupled fixed point over Priority 3's unchanged pool, through a line-for-line copy of
  5A's `runCoupled` that also passes stresses, blackouts and minute marks; one record (`recordOf`) and one minute-DD
  fidelity for every arm. A non-convergent or inconsistent run throws and fails its job.
- **Stage V** (sealed before the freeze, `results/parity/parity.json`: 1,415 checks, 0 failed; re-sealed after A1 as
  `parity-A1.json`: 1,425 checks, 0 failed): 5A's L0/L1/L2 development centres of D, C4, C85, E, A, B, IP and GP85
  reproduced field for field; C4-refined and three 3B seeds reproduced against 3B's sealed evidence; the VG #2 native
  bridge ($260,223.13 / $17,280.74 / 36 lots / 14 refusals) and harmonized VG #2 ($268,487.02 / $20,801.07); path
  identity with 5A's `runCoupled` on 48 random configurations; stress identities; D1-only and standalone-Growth
  identities across lifecycles; causal prefixes on D19/D21/D23; the fixed point identical from three starting guesses,
  consistent with Priority 3's independent reference pool, with failure detection; accounting on every run; and (A1) a
  convergence scan of 1,536 random L1/L2 runs on the four prefix doors.
- **Amendment A1 (engine failure, disclosed).** The first C19 search stopped on an explicit consistency failure: under
  L2 a retained opportunity was granted at D19's last session (2019-12-31) and its never-filled order had no record in
  5A's lifecycle book. The case is completed in a study-local wrapper (`lifeBook.ts`; 5A's code untouched) exactly as 5A
  records a canonical order unfilled at a door's end; stage V was re-sealed; the failed job's 11,761 evaluations were
  discarded unread and the C19 search rerun from its start with the identical configuration and seeds.
- **Tests:** this study's 21 tests (labels, decomposition, strata, paired seeds, symmetric budgets, caps, control
  identities, eligibility documentation evidence, minimum strength under L0/L1/L2, L2 supersession, A1), 5A's lifecycle
  tests, Priority 3's pool tests and the canonical entry-gate tests; the full `npm test`: 1,422 tests, 1,411 pass, 7 fail
  (exactly the 7 known pre-existing failures), 4 skipped.
- **Pilot** (P18 on D19, pilot budgets): every stage path; synchronized extension; duplicate concurrent keys; graceful
  SIGTERM, worker SIGKILL and unit SIGKILL each resumed to identical lane results.

## 10. Limitations

- **Previously examined history.** 2025–2026 had been examined; the informed seeds (C4, C4-refined, 3B's candidates)
  were chosen with it in view, and the L2 primary is 3B's formal primary. Fresh seeds are not fresh market history.
- **One history, few episodes.** The leading winning episode (mostly the 2020 rebound) dominates the principal
  neighbourhoods; local stability on 2016–2024 is not chronological reliability; three correlated slices.
- **Bounded effort.** Matched but small searches (1/16 of 3B's per-cutoff base), resource-guard- or trigger-limited, not
  converged; differences between arms are within the replicate spreads.
- **L2's constants (20 sessions, 5%) were fixed**; other preservation rules were not tested. D1's lifecycle was never
  changed. Breach frequencies are perturbation frequencies on one history, not probabilities of future losses.
- **Disclosed incidents:** amendment A1 (engine end-of-door case; fixed, re-verified, the C19 search rerun); the
  supplementary mechanism file of §8 (report-only, outside the frozen plan). Historical compliance with $35,000 does
  not guarantee future drawdown.

## 11. Reproduce

`RUN_COMMANDS.md` (from the repository root). Sealed stages refuse to rerun; each heavy stage resumes from its job
archive (`.cache/vg-lifecycle-matched-optimization/jobs/`, local) when relaunched with the same command.

```
npm run research-preflight -- --study research/vg-lifecycle-matched-optimization
npm run vg-lmo -- verify
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-lifecycle-matched-optimization/tests/*.test.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-lifecycle-matched-optimization/tables.ts
```
