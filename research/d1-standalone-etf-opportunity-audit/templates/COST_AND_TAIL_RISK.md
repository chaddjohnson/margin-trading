# Costs, financing and tail risk (Stage C3)

**Evidence tier: T-train (2016-01-04 → 2023-12-29).** Fixed $100,000 non-compounding slot, one ETF at a time. Every
scenario is **re-simulated** (D1's net-profit stop and its continuation window — opened only after a profitable exit —
change with cost), never recosted. The 19 scenarios are the completed audits' definitions: base 11%/5 bps; r08/r14/r18
(financing); f00–f45 (per-side friction; f15 = 5 fee + 10 slippage, f30/f45 add 25 slippage); s10–s100 (stop
overshoot); nxo (stops fill at the next trade after the trigger minute); C1 (14%, 10 + 10 bps), C2 (18%, 20 + 25), C3
(C2 + 50 bps overshoot). Machine-readable: `results/tables/costs.csv`. Net = gross − interest − friction per lot
(checked for every base lot: largest error below one cent).

## Fixed net under the cost scenarios

{{cost.net}}

## Path changes

"lots changed" counts base lots that disappear plus new lots that appear (same entry, exit and reason) — the cost
changes the trade path, not only the net.

{{cost.paths}}

## Trades, tails and concentration (base; concentration is an annotation, never a gate)

{{cost.tails}}

"net − top N" is **attribution only**: removing a winner from a path-dependent strategy would change later state, so
it is not a counterfactual backtest.

## Findings

- **XME's fitted net is cost-fragile in a way none of the others is.** Its representative earns $216,940 at 5 bps but
  $179,789 at **0** bps, $42,587 at f45, $51,235 at 18% interest and $49,336 under C1 (23% of base; **F6**), with 12
  lots changed under C1. The cause is path dependence, not cost arithmetic: a small change in one exit's net decides
  whether the continuation window opens, and XME's large 2020–2022 continuation chain depends on it.
- **The same mechanism shows elsewhere at smaller scale:** SLV earns less at 0 bps ($87,777) than at 5 bps ($103,793)
  and falls to $56,330 at 18%; MTUM alt falls to 49% of base under C1 (**F6**); VGT primary to 63% under C1 ($85,731)
  and to $82,463 at f45. XHB's fold-a representative (Stage D) loses its entire 2020–2021 continuation chain at 10 bps
  because one June 2020 exit turns from +$33 to −$68, and XME's fold-b vector gains $15,100 at 5 bps but $57,271 at
  10 bps.
- **The most cost-robust records:** FXI (C1 94% of base, 0 lots changed), GDX (C1 89.5%, C3 $112,594), EDV (C1 90.5%),
  the procedure-matched VGT control (C1 89%), XHB (88%), IJH (88%), EWW (83%, 0 lots changed under C1).
- **Tails.** Worst base lots: KBE alt −$24,232, KBE −$17,568, XME alt −$18,336, XME −$14,776 and EWW alt −$11,402
  raise **F2**; KBE alt's MAE reaches −26.5%. VGT primary's worst lot is −$3,544; EWW's −$7,025; GDX's −$6,574;
  FXI's −$956. **No phenotype's fixed minute drawdown exceeds $35,000 at base or under C1** (the largest: KBE alt
  $31,953 base, $32,919 under C1); KBE alt's F3 comes from its portfolio max daily DD (35.5%).
- **Concentration (annotation).** Top-3 share ranges from 24% (XME alt) to 84–85% (FXI's two phenotypes) and
  80–82% (EDV's); VGT primary 66%. D1 is designed for this; it is reported, never used. FXI's eight lots and EDV's ten are thin evidence regardless.
- **Underwater spells** of the fixed mark last 167–613 sessions; several end "open" at 2023-12-29 (VGT primary since
  2022-12-01, XME since 2022-08-25, SLV since 2022-11-14, IJH since 2022-10-04): D1 can sit idle or flat for over a year.

## Broker and execution caveats

No simulated margin call or forced sale; house requirements change; real quotes, queue position, liquidity and
capacity are not modelled; minute bars do not fix the order inside a minute (stop fills are idealised; `nxo` and the
overshoot scenarios bound part of it). EDV (minute coverage 47%, ~$16M a day) is the least reliable fill model here.
No test shifts *entry* timing.

## Every base trade

Entry and exit at minute resolution, reasons, gross, interest, friction, net, MAE and the episode attribution are in
`results/tables/base_trades.csv` and `npm run standalone-opportunity-audit -- fixed <ID>` (research phenotypes to
2023-12-29 only).

{{cost.trades}}
