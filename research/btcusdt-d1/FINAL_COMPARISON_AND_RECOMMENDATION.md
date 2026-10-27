# Final comparison and recommendation — BTC D1 variants only

**Verdict: no viable BTCUSDT spot D1 phenotype was identified.** The frozen walk-forward procedure failed both
folds, so the procedure gate failed (`results/PROCEDURE_GATE.json`, pass = false), the final holdout
(2024-07-01 → 2026-08-24) was never evaluated, and no phenotype is eligible for prospective consideration or live
use. Everything below is BTC D1 against BTC D1; no other benchmark is computed.

**What the verdict depends on.** Drawdown was gated at 35% of the account's running peak **and** at 35,000 USDT,
the user's 35,000-per-100,000 reference, preregistered before the freeze. The USDT ceiling is the binding one: 35–45%
of the searched vectors stayed within 35%, but only 5.4–8.1% within 35,000 USDT. That ceiling drove the selections to
crash-buyers, and so to the fold B picks that never traded. Fold A fails regardless of it: its pick lost money at all
16 cost levels and under all three stop conventions. With a looser or differently defined risk limit the search
would have chosen other vectors; whether they would validate is untested here and would need a new study.

## 1. Evidence classes

| Class | What exists | Grade |
|---|---|---|
| In-sample (selection windows) | 3 × 68,500 vectors searched; 9 picks with large in-sample nets (111,658–311,117 USDT) | optimisation output, heavily selected; 95–98% of all searched vectors were profitable there |
| Reused historical validation (folds) | fold A 2021-12 → 2023-02, fold B 2023-03 → 2024-06, each pick sealed before its window | **failed**: fold A rank 1 −29,145 USDT with a 70,457 USDT drawdown; fold B picks made no trade |
| Locked holdout | none — not opened because the gate failed | no evidence |
| Prospective | none | no evidence |

## 2. The phenotypes on the permitted development span (2019-02-11 → 2024-06-30)

`npm run btc-d1 -- compare` (reference engine, principal costs, one continuous cash account each; output in
`results/demo/compare-development.txt`). These figures mix in-sample and validation days and are **not** evidence
of an edge: for the final picks the whole span is in-sample; for fold A picks 2019-02 → 2021-11 is in-sample and
2021-12 → 2024-06 was not used to select them; for fold B picks 2019-02 → 2023-02 is in-sample.

| Phenotype | Role | Net USDT | Minute peak-to-trough | Minute DD USDT | Trades | Wins | Time in BTC | Fees + impact |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| diagnostic-vgt-d1 | unchanged ETF D1 vector (diagnostic) | 89,223 | 65.7% | 104,193 | 105 | 48% | 49% | 30,644 |
| final-r1 | final selection rank 1 | 124,938 | 25.7% | 25,709 | 33 | 91% | 16% | 10,097 |
| final-r2 | final selection rank 2 | 201,916 | 19.7% | 25,700 | 35 | 86% | 10% | 10,813 |
| final-r3 | final selection rank 3 | 115,532 | 26.0% | 32,126 | 31 | 74% | 4% | 9,483 |
| fold-a-r1 | fold A rank 1 (failed its gate) | 281,972 | 16.7% | 70,457 | 49 | 88% | 29% | 15,138 |
| fold-a-r2 | fold A rank 2 | 274,133 | 13.5% | 52,002 | 29 | 79% | 26% | 9,120 |
| fold-a-r3 | fold A rank 3 | 127,674 | 27.8% | 51,310 | 15 | 80% | 13% | 4,696 |
| fold-b-r1 | fold B rank 1 (failed its gate) | 277,935 | 25.7% | 26,210 | 43 | 93% | 18% | 13,330 |
| fold-b-r2 | fold B rank 2 | 236,862 | 23.2% | 33,310 | 37 | 92% | 17% | 11,467 |
| fold-b-r3 | fold B rank 3 | 111,658 | 18.6% | 26,530 | 13 | 77% | 4% | 4,071 |

Every fold A pick breaches the 35,000 USDT reference on this span (52,000–70,500 USDT), all through days after its
selection cutoff. The fold B picks' span figures equal their in-sample figures because they made no trade after
2023-02.

## 3. Why no candidate advances

1. **The risk reference leaves only crash-buyers.** With a 100,000 USDT position, D1 vectors arming on a decline
   below 30% (the ETF phenotypes use 10–30%) had in-sample minute drawdowns far above 35,000 USDT: 5 of ~83,000 such
   vectors across the three selections stayed within it. 92% (fold A) and 99.8% (fold B) of feasible vectors arm only
   after a fall of 40% or more, and every vector that passed all gates armed after a 45.4–59.6% fall.
2. **Crash-buyers depend on the regime.** Their in-sample profit came from the 2019–2022 crashes and rebounds. In
   the 2022 decline (fold A) the fold A pick bought repeatedly into the fall and lost 29,145 USDT with a 70,457 USDT
   drawdown; in 2023–2024 (fold B) the fold B picks found no crash and never traded. Neither behaviour is a
   repeatable edge, and the gate's minimum-trade test exists to reject exactly a strategy that cannot show one.
3. **In-sample profit was common.** 95–98% of all searched vectors were profitable in-sample, so a large in-sample
   net is a property of the window, not of a phenotype. The neighbourhood test (G3) removed 70–88% of the shortlists.
4. **Costs and fills were not the binding issue in-sample** (median conservative-cost and worst-fill haircuts 2–6%),
   but they do not rescue validation: fold A rank 1 loses at every one of the 16 fee/impact combinations (−29,130 … −41,170 USDT) and under both
   other stop conventions.
5. **The diagnostic ETF vector is not a BTC strategy:** a 65.7% peak-to-trough and 104,193 USDT drawdown on the
   development span, −50,339 in fold A and +56,947 in fold B.

## 4. Recommendation

- **Do not trade any of these phenotypes.** They are research-only artifacts; none has a validated edge and none
  has locked-holdout evidence. No live-trading status follows from any historical figure here.
- **Do not reopen this study's holdout** for these phenotypes: it stays sealed; the CLI refuses it.
- Any further BTC work is a **new study with its own protocol**. Questions it could preregister, reusing the same
  history (so not independent of this one): a smaller fixed position or volatility-scaled sizing chosen so a 35,000
  USDT drawdown ceiling admits ordinary BTC moves; a different risk reference agreed with the user beforehand; or
  BTC data from another venue as an independent check. None of these was tested here.

## 5. Remaining uncertainty and limits

- Venue and product are unverified (consistent with Binance spot; no local metadata). USDT counterparty and depeg
  risk, venue risk, order-book depth, lot size and minimum notional are not modelled. Several in-sample fills were a
  large share of their minute's volume (up to 123% in 2019–2020).
- Minute bars cannot resolve intraminute stop sequencing; the principal "adverse" fill can be optimistic after a
  V-shaped trigger minute, bounded by the worst-case "low" sensitivity.
- BTC's 2018–2026 history is public knowledge; the folds are reused windows. Parameter neighbours are perturbations
  around one path, not independent markets.
- The negative verdict concerns this frozen procedure, cost model and risk reference (35% and 35,000 USDT on a
  100,000 USDT cash account); it does not claim that no other BTC strategy or sizing could work.
