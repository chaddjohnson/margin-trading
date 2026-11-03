# Parameter neighbourhood robustness (Stage C1)

**Evidence tier: T-train (2016-01-04 → 2023-12-29, the window every candidate was optimised on).** Every row is a
diagnostic run of an existing vector or of a perturbation of it; **no neighbour is a candidate** and none is written
anywhere but `results/runs/`. Window {{cmp.window}}; fixed $100,000 slot, 5 bps per side, 11% simple interest. Base-run
parity before any neighbourhood run: {{cmp.baseParity}} checks passed (`results/parity/BASE_PARITY.json`).

## Designs (bound before any result, `results/designs/designs.json`)

- **OAT:** each of the eight D1 parameters at v − m, v − s, v + s, v + m with the completed audits' distances (≥ 2.0%:
  ±0.5/±1.0 pp; below 2.0%: ±max(0.1 pp, 25%·v)/±max(0.2 pp, 50%·v); whole numbers ±max(1, 10%·v)/±max(s+1, 20%·v)).
  Points outside the engine's legal grid are truncated and not run (GDX and GDX alt hold −m, KBE alt stop −m, EDV
  buffer +m); points outside the source's narrower search box but inside the legal grid are run and marked †.
- **Joint 8-D:** two Latin hypercubes of 64 over [v − m, v + m] ∩ legal grid, all eight parameters moving together,
  drawn from **one common stream for every phenotype** (common random numbers: every phenotype's samples sit at the
  same relative strata of its own intervals; VGT primary's 128 vectors are exactly those the completed VGT audit ran on
  2016–2026).
- **Relative sizes differ.** The same rule is a ±32% change of IJH's 3.1% stop but ±13% of GDX's 7.6%; one day is ±33%
  of GDX's 3-day hold; ±1 pp of X is milder for a 37%-volatility fund (GDX) than a 20% one (MTUM, EDV). Differences
  between ETFs partly reflect where each vector sits and each fund's volatility, not only intrinsic robustness.
- **Retention** = a run's net ÷ its own base net. A candidate's base is a fitted optimum on this exact window, so its
  retention is biased down relative to VGT primary's (chosen with other data); compare absolute neighbourhood nets too.

## Joint 8-D neighbourhoods, 128 pooled samples (the primary design)

{{nb.pooled}}

## Per seed (the standing axes must hold on each seed)

{{nb.seeds}}

## One-at-a-time

{{nb.oat}}

### Every OAT point (value → retention; † outside the source's search box)

{{nb.oatDetail}}

## Findings

- **Every phenotype stays profitable in almost every neighbour.** The pooled 128-sample share with net > 0 is 97–100%
  everywhere except EDV alternative-1 (79%). Profitability alone does not separate the candidates; the size of the
  neighbourhood's profit, its drawdown and its capture of the base's events do.
- **Joint moves are much harsher than one-at-a-time moves.** OAT median retention is 0.89–0.98 for every phenotype,
  but the joint median retention falls to 0.25–0.74. A single parameter rarely matters; moving all eight together
  costs about half of the fitted net for most vectors.
- **GDX keeps the most in absolute dollars:** a joint median of $136,158 (representative) and $126,790 (alternative),
  P10 $107,647 and $93,096, worst sample above $64,000, against VGT primary's $71,174 median. But only 38% (representative) and 34%
  (alternative) of GDX's joint samples stay within the $35,000 minute-drawdown ceiling: **F10 (neighbourhood drawdown)
  is raised** for both. GDX's profit is broad; its drawdown control is a property of the exact vector.
- **XME's fitted net is a sharp peak:** $216,940 at the base, a joint median of $61,287 (retention 0.28; **F9**). Its
  alternative-1 keeps profit (99% positive) but only 16% of its samples stay within the drawdown ceiling (**F10**).
- **KBE, KBE alt, XHB, IJH alt and the procedure-matched VGT control also raise F10;** IJH (both phenotypes), XME (both),
  MTUM alt, EDV alt and the VGT control raise **F9** (retention < 50% or < 75% profitable).
- **EWW has the highest joint P10 in dollars of any phenotype without F9/F10** ($46,284; XLB and EWW alt keep a
  larger share of their own nets and stay within the drawdown ceiling more often): joint median $65,459 (retention 0.63), 100% profitable on both
  seeds, P10 $46,284 and worst $19,257, 88% of samples within the drawdown ceiling, median portfolio daily DD 33.9%.
  Its alternative-1 is similar (median $64,923, 98% within the ceiling).
- **VGT primary on this window:** joint median $71,174 (retention 0.53), 100% profitable, worst sample $856, 100% within
  the drawdown ceiling. On 2016–2026 the completed VGT audit reported about 70% median retention for its 8-D samples;
  on this shorter window the same kind of perturbation keeps a smaller share of VGT primary's net.
- **Seeds mostly agree,** but not always on the comparison with VGT primary: KBE's median-net axis is above VGT
  primary's on the pooled samples and seed 2 but below it on seed 1, and KBE alt, XME alt and IJH alt also differ by
  seed on one axis. The predeclared rule counts such an axis as **not met**, which is what the both-seeds requirement
  is for.

## B4/B5 (different property; full history; quoted, not blended)

The completed B4/B5 audit perturbed all pooled parameters at once (32 dimensions for B4, 40 for B5) on 2016-01-04 →
2026-10-13: every one of 128 samples per pool was profitable and the median kept **47%** of the frozen net (B4 seed 1;
B5 47% seed 1, 45% seed 2; `research/b4-b5-robustness-audit/PARAMETER_STABILITY.md`). That measures the fragility of a
whole pool's configuration; it is not comparable with an 8-D distribution and enters no comparison here.
