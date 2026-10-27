# Workstream F — the dynamic portfolio, the no-margin control and total risk

The same engine runs three accounts over the same window ({{v.window}}):
- **C0:** the no-margin control. A $300,000 buy-and-hold core, 60% VOOG / 40% VGT, never rebalanced. VOOG/VGT
  distributions are reinvested in the same ETF.
- **B4** and **B5:** the same core plus the frozen margin overlay. Each funded trade borrows 20% of marked equity at
  the decision, in one shared slot. Profits are reinvested 60/40 into the core, and losses are funded by core sales.
  The frozen dividend convention applies.

**What is modelled:**
- Reg T and the U35 house requirement are checked at entry. A failing entry is refused; none was.
- Interest is 11% simple on the borrowed principal.
- Splits are forward-adjusted.

**What is not modelled:**
- maintenance calls, forced liquidation and broker house-rule changes;
- the Vanguard 30-day no-loan-value rule for newly bought VGT/VOOG;
- distributions of XBI/XRT/KRE/GDX lots.

Maintenance-margin ratios are **measured passively** (below) as proximity only.

**Two drawdown definitions:**
- **Portfolio drawdowns** are the largest fall from the running peak of total marked equity, in two forms: daily
  close and minute-sampled. They are never the fixed-pool drawdowns (% of a $100,000 notional) in the other reports.
- **Dollar drawdowns** are the engine's largest-dollar episodes. In a compounding account they fall in late,
  high-equity years, and they are not the same episodes as the percentage maxima.

Machine-readable results:
- `results/F_portfolio.csv`;
- `results/F_drawdown_episodes.csv`.

## Results

{{t.portfolio}}

C1–C3 are the combined adverse cost scenarios (`COST_AND_EXECUTION_STRESS.md`). The symmetric rows credit no lot
with dividends.

## Drawdown episodes (daily close; five deepest per account)

{{t.episodes}}

## Margin proximity (passive measures; no calls modelled)

The table gives the minimum ratio of equity to the requirement under each passive schedule. Values above 1.0 mean the
requirement was met throughout. The schedules are those of the frozen allocator (`src/multi-etf-allocator/margin.ts`):
- **U35/U50/U60:** a uniform 35/50/60% on every holding. U35 is Vanguard's published general house requirement.
- **L50/L60:** 50/60% on the funded ETF and 35% elsewhere.
- **G50/G60:** 50/60% on the sector-fund group (the VGT core and lots, XBI, XRT, KRE) and 35% on VOOG.

The 60% variants are hypothetical stresses.

{{t.margin}}

- **Requirements were never close to binding.** At its closest (12 March 2020) the account still had
  {{v.minU60.B4}}× the 60%-uniform requirement and {{v.minU35.B4}}× the 35% one.
- **Leverage stayed low.** Borrowing never exceeded {{v.maxDE.B4}} of equity (one lot at 20% of equity, plus drift).
- This is **not** proof of survival under a real broker. House requirements on concentrated sector ETFs can be raised
  without notice exactly in a crash. The engine sells no core to meet a call it does not model.

## Against the 30% preference and the 35% tolerance

{{t.riskGate}}

- **The core alone breaches both lines.** The unleveraged core falls {{v.daily.C0}} at the daily close and
  {{v.minute.C0}} minute-sampled in the 2022 bear market, and {{v.c0Episode2020}} in March 2020. A 60/40
  VOOG/VGT core cannot meet a 30% maximum-drawdown objective on this history, with or without an overlay.
  The relevant question is therefore the **incremental** risk the overlay adds.
- **B4 adds drawdown.**
  - Its worst episode is March 2020: {{v.daily.B4}} daily and {{v.minute.B4}} minute. That is worse than C0's worst
    on both measures (+0.75 pp daily, +1.25 pp minute), and worse than C0's own March-2020 episode by about 3 pp.
  - The minute measure exceeds 35%, so **D35, D30 and D+ flags**.
  - In exchange, B4 ends {{v.inc.B4}} above C0.
  - Under C1–C3 the drawdown stays at 34–35% daily and 37% minute while the incremental wealth shrinks (C3:
    {{v.c3Inc.B4}}). So the risk does not fall when the reward does.
- **B5 historically lowers the core's drawdown.**
  - {{v.daily.B5}} daily and {{v.minute.B5}} minute, about 4–5 pp better than C0. **No D35 and no D+ flag**, but a
    **D30 flag**: the minute measure is above 30%, and so are the C2/C3 daily measures ({{v.c3Daily.B5}} under C3).
  - B5 ends {{v.inc.B5}} above C0.
  - **This is the frozen point only.** Its median joint parameter neighbour has a {{v.dmed.B5.joint-s1}} daily
    drawdown, and {{v.d35.B5.joint-s1}} of neighbours exceed 35% (`PARAMETER_STABILITY.md`). The reduction is
    produced by two things:
    - the March-2020 slot sequence, in which GDX traded instead of KRE (`TRADE_CONCENTRATION.md`);
    - the frozen pool's large 2022 gains (next point).
  - Plan for C0-like drawdowns of about 34–37% with B5, not 30%.
- **At the frozen parameters, both overlays cushioned 2022.** They made money during the bear market (mostly brief XBI
  dip trades), and both pools' 2022 drawdowns ({{v.b4Episode2022}} / {{v.b5Episode2022}}) are smaller than C0's
  ({{v.c0Episode2022}}).
- **That cushion does not survive parameter perturbation either.**
  - The frozen pools made {{v.frozen2022.B4}} (B4) and {{v.frozen2022.B5}} (B5) in 2022. The median joint neighbour
    made {{v.median2022.B4}} and {{v.median2022.B5}}.
  - For {{v.peak2022.B5}} B5 neighbours, the worst portfolio drawdown is the 2022 bear market itself, at about
    C0's depth or deeper (see `PARAMETER_STABILITY.md`).
  - So **both** of B5's historical drawdown advantages, in March 2020 and in 2022, belong to the exact frozen
    parameters, not to the strategy family.

## Incremental wealth versus incremental risk

| | End equity | CAGR | vs C0 | Max daily % DD | Max minute % DD |
|---|---:|---:|---:|---:|---:|
| C0 | {{v.end.C0}} | {{v.cagr.C0}} | — | {{v.daily.C0}} | {{v.minute.C0}} |
| B4 | {{v.end.B4}} | {{v.cagr.B4}} | {{v.inc.B4}} | {{v.daily.B4}} | {{v.minute.B4}} |
| B5 | {{v.end.B5}} | {{v.cagr.B5}} | {{v.inc.B5}} | {{v.daily.B5}} | {{v.minute.B5}} |

- **The wealth gains are large**, because overlay profits are reinvested in a core that compounded at about 21% a year
  over 2016–2026.
- **Most of the gap is compounding, not trading profit.** B4's fixed-pool net is $284k, but its portfolio ends $1.33M
  above C0. That reflects 2016–2026 equity returns as much as the overlay itself, and it would shrink with a weaker
  core.
- **The overlay's own risk cost is real but bounded:**
  - one funded lot at 20% of equity;
  - no stop below entry;
  - the worst single lot historically lost {{v.worstLotEq.B4}} (B4) and {{v.worstLotEq.B5}} (B5) of the equity at its
    decision.

  A gap larger than any in this history inside a lot's hold would cost proportionally more. For example, a 30%
  overnight fall in the funded ETF costs about 6% of equity on top of the core's own fall.
