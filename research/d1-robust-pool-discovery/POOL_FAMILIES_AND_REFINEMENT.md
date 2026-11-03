# Pool families and joint refinement (PROTOCOL.md §10–§11) — 2026-10-25

Records: `results/walkforward/<fold>/<arm>/promotion.json`, `refine-f<n>.json`; `results/final/pooled/promotion.json`,
`refine-f1.json`. Every family's membership, representative, size, promotion reason and every accepted refinement move
(with its funded-lot changes) is in those files.

## 1. How families are formed (as frozen)

The top 300 centre-feasible configurations by the arm's ranking (final round: pooled across the unseeded and seeded
arms) are re-evaluated (N1 at n = 96, centres at 0/2/10 bps, the 20% portfolio); those passing F1 at 5 and 10 bps and
F-P are linked when membership Jaccard distance < 0.5 **and** funded-trade overlap ≥ 0.5 **and** regime-attribution
Spearman ≥ 0.7; families are single-linkage components. The refined set is the first families in promotion order (≤ 4
in a fold, ≤ 6 in the final round), forced to include a ≤ 3-book family, a family ≥ 0.75 Jaccard distance from B5's
membership and (final round) an unseeded family among the first three, whenever such a feasible family exists.

## 2. What happened

| Round / arm | Feasible candidates | Families | Largest families | Refined set (representatives) | Requirements that could not be met |
|---|---:|---:|---|---|---|
| fold-a J | 300 | 6 | 131, 97, 58, 11 | EDV GDX XRT · EDV GDX KRE · GDX IJH SMH · EDV GDX XRT | — |
| fold-a Q | 300 | 30 | 104, 78, 31, 22 | EWZ GDX · GDX XLI · GDX IWN · GDX XHB | — |
| fold-b J | 298 | **1** | 298 | GDX IBB XRT | far from B5 |
| fold-b Q | 300 | 5 | 220, 77 | GDX VGT XHB · EWZ GDX XBI XLK · GDX XBI XLK · GDX USMV XLK (required: far from B5) | — |
| final (pooled) | 295 | **1** | 295 | GDX KRE XBI XLE | compact (≤ 3 books); far from B5; unseeded in the top three |

**Single-family collapses.** In fold-b's J arm and in the final round every feasible top-300 configuration chained into
one family. The fold-b J archive had converged on GDX + XRT (all 298 contain both); the final pool's top 300 came
entirely from the benchmark-seeded arm and all contain GDX, KRE and XBI (199 of them exactly GDX KRE VGT XBI). Single
linkage chains near-duplicates, and an evolutionary archive is full of near-duplicates of its leader, so one family is
the expected result once a search has converged.

**The diversity requirements did not bite where they were most needed.** They select among the families formed from
the candidates. With one family there is nothing to select: no ≤ 3-book, far-from-B5 or unseeded family existed among
the pooled final candidates, because the unseeded arm's best (S ≈ $199k) ranked far below the seeded arm's 300th. The
protocol applied as written; read with hindsight, "an unseeded family among the first three whenever a feasible one
exists" protects the primary (unseeded) arm only if its candidates reach the pooled top 300. A design that formed
families per arm before pooling, or reserved candidate slots per arm, would have assessed the unseeded arm's leaders.
This is recorded as a design lesson; no rule was changed.

## 3. Refinement (accepted only if the objective rises by more than δ = $5,000 on common draws; F1 at 5 and 10 bps)

| Round / arm / family | Start → result | Unique evaluations (cap) | Cycles | Accepted moves | Objective (n = 48 for J) |
|---|---|---:|---:|---|---|
| fold-a J f1 | EDV GDX KRE → same | 421 (500) | 2 | KRE stop −10 | S $156,312 → $165,922 |
| fold-a J f2 | EDV GDX XRT → same | 211 | 1 | none | $167,082 |
| fold-a J f3 | EDV GDX XRT → same | 362 | 2 | EDV stop +10 | $147,533 → $166,842 |
| fold-a J f4 | GDX IJH SMH → same | 211 | 1 | none | $154,261 |
| fold-a Q f1–f4 | EWZ GDX, GDX XHB, GDX XLI, GDX IWN → same | 178–492 | 1–3 | EWZ hold +1; GDX trailing buy +2 (×2) | Q $186,044 → $191,814 etc. |
| fold-b J f1 | GDX IBB XRT → **GDX IBB XME XRT** | 488 | 2 | add XME; GDX X −5; XME hold +1; joint XME | S $200,828 → $244,498 |
| fold-b Q f1–f4 | GDX VGT XHB, GDX XBI XLK, EWZ GDX XBI XLK, GDX USMV XLK → GDX USMV **VGT** XLK | 353–500 | 2–3 | GDX pullback −10; joint GDX; EWZ trailing buy −2; XBI hold −2; add VGT | up to +$29,743 |
| final f1 | GDX KRE XBI XLE → same | 417 (800) | 2 | KRE trailing buy +2 | S $268,550 → $273,953 |

No refinement result needed the F-P walk-back. The cap was reached once (fold-b Q f4, 500 evaluations over three
cycles); elsewhere the passes stopped when a cycle accepted nothing, and most families improved by one or two
coordinate moves — the discovery leaders were already close to local optima of the objective at one step unit.

**Refinement and G3 disagree by design.** Refinement removes a member only if that raises S by more than $5,000 at
n = 48; G3 requires every member's smoothed marginal on the 256 confirm-A draws to be positive. Fold-b's J result kept
XRT (removal worth less than δ at n = 48) and then failed G3 because removing XRT raised S_A by $1,897. That single
outcome removed the fold's J pick.

## 4. The final finalist

GDX KRE XBI XLE (seeded arm) passed G1–G8 (`results/tables/final.md`): centre $309,743 (E0), P50_A $291,440 [$289,748,
$293,496] (E1), minute DD $27,575, DDmed $34,799, DD90 $41,466, 76 funded lots in 5 calendar years, every member
'standard' grade, no capacity label, portfolio daily % DD 29.23%. Against B5 on 256 common draws: ΔP50 $80,884
[$74,391, $87,264] — it trails B5's optimized peak (E0 $388,489) but beats B5's smoothed P50 ($210,556) by more than
M = $25,000, which is the fair-baseline case §14 anticipates. **It is not nominated** (G-WF failed) and is a
descendant of inspected vectors: the seeded arm started from B1/B4/B5; its KRE vector is within two step units of
B5's on every coordinate and its GDX vector shares five of eight coordinates with B5's. Its membership is exactly 0.5
Jaccard distance from B5's, one step short of amendment 2's "neighbour of an inspected configuration" rule (< 0.5).
It was trained on 2016–2023 and has never been evaluated after 2023.
