<!-- Rendered by `npm run vgt-robustness -- report` from templates/COST_AND_FILL_SENSITIVITY.md and results/analysis.json; edit the template, not this file. -->
# Costs, financing and fills

**What was run:**
- **S:** re-simulated fresh under the prior audit's 19 scenarios, in fixed and portfolio mode, with unchanged
  definitions.
- **B4/B5:** taken from the prior audit's stored `cost` records (not re-run).

**How the costs are layered:**
- **Per-side cost:** fee/spread and extra fill slippage both enter the one per-side `costBps`. A 10-bps run therefore
  stands for 10 + 0 or 5 + 5.
- **Stop overshoot:** applied only on stop and stop-gap exits.
- **`nxo`:** fills stops at the first trade after the trigger minute. It is an execution-rule stress, not a cost.

**Why every scenario is re-simulated.** Rate and per-side cost change D1's net-profit trailing stop and its
continuation window, so paths change. The table therefore separates:
- **the same-trade re-cost:** the base lots under the scenario's costs, with no path change;
- **the path effect:** the scenario's actual net minus that re-cost.

C0 trades nothing, so it is the same in every scenario ($2,279,769; 33.89% / 35.76%).

**Limitations:**
- No break-even rate or cost exists inside the tested ranges: every scenario stays profitable for all three. None is
  extrapolated.
- Minute OHLCV cannot show quote-level fills or the order of events inside a minute.

## 1. Fixed $100,000

{{t.costsFixed}}

- **S stays profitable in every scenario.** The lowest net is {{v.cost.S.minNet}} under C3.
- **Combined stresses** cost S {{v.cost.S.C1.change}} (C1), {{v.cost.S.C2.change}} (C2) and {{v.cost.S.C3.change}}
  (C3).
  - That is about B5's proportional degradation: {{v.cost.B5.C1.change}} / {{v.cost.B5.C2.change}} /
    {{v.cost.B5.C3.change}}.
  - It is milder than B4's: {{v.cost.B4.C1.change}} / {{v.cost.B4.C2.change}} / {{v.cost.B4.C3.change}}.
- **Single stresses short of very high rates or frictions cost S little:**
  - +10 bps per side: {{v.cost.S.f10.change}};
  - 14% interest: {{v.cost.S.r14.change}};
  - 100 bps of stop overshoot: {{v.cost.S.s100.change}};
  - next-trade stop fills: {{v.cost.S.nxo.change}}.
- **Losses are path-driven and lumpy.** S's large losses at r18, f30, f45 and C1–C3 are mostly **path effects**:
  - C1 {{v.cost.S.C1.path}}, r18 {{v.cost.S.r18.path}}, f30 {{v.cost.S.f30.path}};
  - higher costs delay the net-profit stop's activation and remove a few lots (the "+/−" column);
  - with only 21 lots, one lost winner is a large share of net.
- **The pools' path effects are similar in dollars but come from slot reshuffling.** About
  {{v.cost.B5.C1.path}} at C1 for B5 and {{v.cost.B4.C1.path}} for B4.

**Net ÷ fixed minute drawdown:**

{{t.costsRisk}}

## 2. Portfolio

Each cell is end equity, with the increment over C0 in brackets, and the daily-close / minute-sampled max % drawdown.

{{t.costsPortfolio}}

- **S's portfolio stays above C0 in every scenario.** The smallest increment is {{v.cost.S.minInc}}.
- **Drawdown.** S's drawdown rises from 32.78% to at most {{v.cost.S.C3.daily}} daily and {{v.cost.S.C3.minute}}
  minute (C3), against C0's 33.89% / 35.76%.
- **B5** stays the strongest in absolute terms in every scenario. **B4** keeps its excess drawdown over C0 in every
  scenario.

## 3. Prior-audit gate E (W3) under these scenarios

| | Lowest net in r14/f15/f20/C1 | Lowest increment over C0 in the same | C1 change | C1 net ÷ DD change | W3 |
|---|---:|---:|---:|---:|---|
| S | {{v.cost.S.C1}} | {{v.cost.S.C1.inc}} | {{v.cost.S.C1.change}} | see table | no flag |
| B4 | {{v.cost.B4.C1}} | {{v.cost.B4.C1.inc}} | {{v.cost.B4.C1.change}} | see table | no flag |
| B5 | {{v.cost.B5.C1}} | {{v.cost.B5.C1.inc}} | {{v.cost.B5.C1.change}} | see table | no flag |

(For all three, C1 is the binding scenario of the four.) **Costs are not what separates S from the pools.**
