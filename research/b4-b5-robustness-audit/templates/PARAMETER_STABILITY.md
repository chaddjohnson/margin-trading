# Workstream A — parameter fragility (diagnostic-only, no optimisation)

Every configuration in this report other than the frozen B4 and B5 is **diagnostic-only**:
- it was never written to `config/`;
- it never became a candidate, benchmark or default;
- no "best" variant was selected or promoted.

All variants run on the same inspected 2016–2026 history, so neighbours are **not independent validation**. They
describe the shape of the in-sample response surface around the frozen choice.

Machine-readable results:
- `results/A_oat.csv`: every OAT point, with infeasible points and their reasons;
- `results/A_joint_samples.csv`: every joint sample with its parameter values;
- `results/runs/{oat,boundary,joint,book}.jsonl`;
- `MANIFEST.json`: every sampled configuration.

## Design (pre-registered in PROTOCOL.md §3)

- **Scope.** All eight D1 parameters of every book. GDX has no extra controls.
- **Rule.** Distances are percentage points for percentages ≥ 2.0%, a relative rule for the four percentage values
  below 2.0%, and ±10% / ±20% for integers.
- **Grid.** Points are kept on the engine's legal grid, with 0.1-pp quantization.
- **Joint neighbourhoods.** Latin hypercubes over all books at once (32 dimensions for B4, 40 for B5), N = 64 per
  seed, with 2 seeds. There are also per-book hypercubes of N = 32.
- **Modes.** Every point was re-run through the full shared allocator, in fixed and portfolio mode.

The distances and joint ranges of B5's books are below. B4's four books are the same as B5's first four.

{{t.distances}}

{{v.oatInfeasibleCount}} OAT points fall outside the legal grid. They are recorded with their reason and were not
run or replaced:

{{t.infeasible}}

XBI's X = 30.0% sits on the engine-grid ceiling, and KRE's X = 29.9% one step below it. Their upward points were run
outside the grid as **supplementary boundary probes**, which are excluded from every statistic:

{{t.boundary}}

Raising KRE's X above the ceiling leaves the funded ledger unchanged, and raising XBI's X lowers net slightly. So
neither boundary solution suggests that a better optimum was cut off by the grid. The optimiser did, however, push
both books to the deepest arming threshold it was allowed.

## One-at-a-time (OAT)

{{t.oatSummary}}

- **Every** single-parameter change stays profitable: {{v.oatRun.B4}} of B4's points and {{v.oatRun.B5}} of B5's.
- The median OAT point keeps {{v.oatMedianRatio.B4}} (B4) and {{v.oatMedianRatio.B5}} (B5) of the frozen net.
- The worst keeps {{v.oatWorstRatio.B4}} and {{v.oatWorstRatio.B5}}.
- Only a few points beat the frozen net ("above / equal" column), so the frozen vector sits at or near the top of each
  single-parameter line.
- The lot set changes at most points: single parameters move the shared allocator's trade sequence.

The most sensitive parameters are ranked by the swing of fixed net across their four points:

**B4**

{{t.tornado.B4}}

**B5**

{{t.tornado.B5}}

VGT's arming depth X (21.6%) dominates both pools, and both directions lose.

- **At −1.0 pp (20.6%)** B4 loses 22% and B5 loses 33%. VGT arms on shallower dips and takes more lots: 20 instead of
  14 in B4, and 16 instead of 12 in B5. Those lots earn less in total ($110k against $167k in B4), and they displace
  other books from the single slot. In B5, GDX falls from 16 lots and $205k to 13 lots and $109k.
- **At +0.5 pp and +1.0 pp** B4 loses 12% at the larger move.

In B5, KRE's 4-day hold and GDX's 100-session lookback are the next most sensitive parameters. Single-parameter
sensitivity is therefore concentrated in a few parameters that govern **which book holds the slot**.

<details><summary>Full OAT grid (fixed net at each point)</summary>

**B4**

{{t.oatFull.B4}}

**B5**

{{t.oatFull.B5}}

</details>

## Joint local neighbourhoods

These are the primary designs for gate A. "Frozen percentile" is the share of neighbours below the frozen pool.

{{t.neighbourhoods}}

**Profitability is broad, but the magnitude is an isolated in-sample peak:**

- **Profitable everywhere.** All 128 joint samples of each pool are net-profitable (two seeds of 64). The worst B4
  sample still earns {{v.jointWorst.B4}}, and the worst B5 sample {{v.jointWorst.B5}}.
- **About half the frozen net.** The median joint neighbour earns only {{v.jointMedianRatio.B4}} (B4, seed 1;
  {{v.jointMedianRatio2.B4}} seed 2) and {{v.jointMedianRatio.B5}} (B5, seed 1; {{v.jointMedianRatio2.B5}} seed 2)
  of the frozen net. The two seeds agree, so this is not sampling noise.
- **Never beaten.** **No** joint neighbour of either pool beats the frozen net (the frozen percentile is 100%).
  Perturbing every book at once by up to the moderate distance halves the profit. That is the expected signature of
  a configuration selected as the maximum of a large search over the same history.
- **This is gate A's flag.** Earlier stages evaluated about 20,000–22,500 candidate vectors per ETF
  (`research/multi-etf-d1`), plus 14,540 GDX/pool evaluations (`research/portfolio-aware-d1-optimization`). The
  joint median sits just below the pre-registered 50% threshold, so **gate A raises a flag for both pools**:
  {{v.gateA.B4}} (B4); {{v.gateA.B5}} (B5).
- **Some books are sharper than others.** The per-book neighbourhoods show which books are sharply tuned:
  - B4: KRE's neighbours keep {{v.ratio.B4.book-KRE}} and XBI's {{v.ratio.B4.book-XBI}}, while VGT's keep
    {{v.ratio.B4.book-VGT}} and XRT's {{v.ratio.B4.book-XRT}};
  - B5: GDX keeps {{v.ratio.B5.book-GDX}}, KRE {{v.ratio.B5.book-KRE}}, XBI {{v.ratio.B5.book-XBI}}, VGT
    {{v.ratio.B5.book-VGT}} and XRT {{v.ratio.B5.book-XRT}}.

  KRE and GDX (and XBI) sit at the 100th percentile of their own neighbourhoods. VGT and XRT sit on flatter ground.
- **GDX against frozen B4.** Every GDX-perturbed B5 still beats the frozen B4. The lowest of 32 earns
  {{v.bookGdxMin}} against B4's {{v.net.B4}}, and the lowest portfolio end is {{v.bookGdxEndMin}} against B4's
  {{v.end.B4}}.

## Portfolio risk across the neighbourhoods

{{t.neighbourhoodRisk}}

- **Wealth is robust.** Incremental wealth over the no-margin core (C0, {{v.end.C0}}) is positive for essentially
  every neighbour.
- **B5's drawdown advantage is not robust.** The frozen B5 has a 29.67% max daily drawdown, but its median joint
  neighbour has {{v.dmed.B5.joint-s1}}:
  - {{v.d35.B5.joint-s1}} of seed-1 neighbours exceed 35% ({{v.d35.B5.joint-s2}} for seed 2);
  - the worst reaches {{v.dmax.B5.joint-s1}}.
- **Why.** The low drawdown depends on two things:
  - which book happened to hold the single slot in March 2020 (see `ETF_ABLATION.md` and
    `TRADE_CONCENTRATION.md`);
  - the frozen pool's large 2022 gains (below).

  Perturbing XBI's parameters alone pushes {{v.d30.B5.book-XBI}} of B5 variants above 30%.
- **B4's drawdown is typical of its neighbourhood.** The frozen B4 has 34.65%, its median neighbour
  {{v.dmed.B4.joint-s1}}.
- **OAT rarely moves the drawdown; joint perturbation does.** One-at-a-time changes leave B5 below 30% in all but
  {{v.oatDaily30.B5}} of {{v.oatRun.B5}} points, but almost every simultaneous perturbation does not.

## The crash years across the neighbourhoods

{{t.crashYears}}

- **2020 is robust.** The 2020 gains are robust in sign and largely in size: the median neighbour makes about
  55–70% of the frozen 2020 profit.
- **2022 is not.** The frozen pools' large 2022 gains are not robust: the median neighbour makes a small fraction of
  them. {{v.positive2022.B4}} (B4) and {{v.positive2022.B5}} (B5) of neighbours are positive in 2022 at all.
- **Consequence for drawdowns.** In most of B5's neighbourhood the worst portfolio drawdown is the 2022 bear market
  ({{v.peak2022.B5}}), not the March-2020 crash. B5's historical drawdown advantage therefore needed both its exact
  March-2020 slot sequence **and** its frozen 2022 gains.

## Interpretation

- **A broad profitable plateau with an isolated peak.**
  - The D1 shared pools remain profitable across every tested local neighbourhood and every single-parameter change.
    That is genuine (in-sample) evidence that the edge is not a knife-edge artefact.
  - But the frozen vectors are the plateau's highest point: nearby configurations earn about half as much, with
    larger drawdowns (median fixed minute DD: {{v.ddmed.B4.joint-s1}} B4, {{v.ddmed.B5.joint-s1}} B5, against the
    frozen {{v.mdd.B4}} and {{v.mdd.B5}}).
  - A forward expectation anchored on the frozen figures should be discounted heavily. The neighbourhood median is a
    more honest in-sample central estimate, and even it is optimistic, because the plateau itself was chosen on this
    history.
- **B5's sub-30% portfolio drawdown is a property of the exact frozen parameters, not of the strategy family.**
  Treat B5's drawdown as C0-like (about 34–36%) when planning risk.
