<!-- Rendered by `npm run vgt-robustness -- report` from templates/PARAMETER_STABILITY.md and results/analysis.json; edit the template, not this file. -->
# Parameter stability: matched 8-D, one-at-a-time, and system-level

Every configuration here other than the frozen S, B4 and B5 is **diagnostic-only**. None was written to `config/`,
none was promoted, and no "best" variant was chosen.

Neighbours share one inspected history. They describe the in-sample response surface; they are not independent
trials. A neighbourhood median is **not** a forecast of future profit.

**Design** (PROTOCOL.md §5; grids, distances and quantization as in the prior audit):
- **OAT:** the prior audit's 32 one-at-a-time points of the VGT vector.
- **Matched 8-D, the primary comparison:** S run at **exactly** the prior audit's per-book VGT hypercube samples, 32
  from B4's design and 32 from B5's. Each S sample is paired with the stored pooled run of the same VGT vector.
- **S joint 8-D:** two fresh seeds of 64 over the same box.
- **System-level:** the prior B4 (32-D) and B5 (40-D) joint neighbourhoods, a different test of combined complexity.

Machine-readable files:
- `results/P_oat.csv`;
- `results/P_paired.csv`;
- `results/P_joint_samples.csv`;
- `results/P_designs.csv`.

## 1. The answer in brief

- **On matched tests the pools are more robust.**
  - Against B5: {{v.matched.B5.tally}} → **{{v.matched.B5.verdict}}**.
  - Against B4: {{v.matched.B4.tally}} → **{{v.matched.B4.verdict}}**.
  - Without item b6 (amendment A1), the result is unchanged: {{v.matched.B5.withoutB6}}; {{v.matched.B4.withoutB6}}.
- **S's frozen vector is a sharp peak of its own 8-D neighbourhood.**
  - The matched median keeps {{v.d.S_matched_8_D_both_designs.ret}} of the frozen net. The P10 keeps
    {{v.d.S_matched_8_D_both_designs.p10ret}} and the worst {{v.d.S_matched_8_D_both_designs.worstret}}.
  - {{v.d.S_matched_8_D_both_designs.above}} of samples beat it.
  - Every sample is still profitable.
- **The same perturbations move the pools less.**
  - B4's VGT book keeps {{v.d.B4_8_D_VGT_book_only.ret}} at the median, and B5's {{v.d.B5_8_D_VGT_book_only.ret}}.
  - Part of this is dilution: the unperturbed books earn the same.
  - Part is that when VGT's changes free the slot, other books fill it.
- **VGT's own trade path is equally fragile in both structures** (a post hoc, supplementary diagnostic, amendment A1).
  About 5–8% of VGT's lots survive unchanged, and about half keep their entry session.
- **The fragility belongs to the VGT D1 book, not to the pooling.** Pooling damps it.
- **The system-level joint stresses are a different test.** Perturbing all 32 or 40 pooled parameters at once keeps
  only about 47% of each pool's net. That reflects how many parameters can be mis-set, not intrinsic per-parameter
  instability. It is not compared with an 8-D distribution as a causal statement.

## 2. Matched comparison items (PROTOCOL.md §11b)

Retention = net ÷ the configuration's own frozen net. "Paired 8-D" = the 32 samples of that pool's VGT design, run
standalone and inside the pool.

**S against B5:**

{{t.matched.B5}}

**S against B4:**

{{t.matched.B4}}

**Caveats, stated in the protocol and in amendment A1:**
- **b1–b3 and b6 are diluted in the pools.** The other books are unperturbed: in B5 the VGT book is
  {{v.B5.fundedVgtNet}} of $486,208 in funded net.
- **b5 is not free of the structure either.** It is in dollars on the same $100,000 slot, but a pool's Δ$ scales with
  VGT's share of the slot (B5 funds 12 of S's 21 lots), and it includes other books refilling the slot.
- **A post hoc reading, not a rule.**
  - Five of the eight items (b1–b4, b6) are diluted by construction.
  - On the three less-diluted items (b5, b7, b8) the count is {{v.matched.B5.lessDiluted}} against B5 and
    {{v.matched.B4.lessDiluted}} against B4.
  - The predeclared verdict stands. It is best read as: perturbing VGT moves the pools less, largely because VGT holds
    only part of their slot.
- **b7 (cost) and b8 (drawdown shift) are structural.**

## 3. The neighbourhood tables

**S (standalone VGT primary):**

{{t.designsS}}

**The pools, perturbing only VGT's eight parameters** (the matched counterparts):

{{t.designsMatchedPools}}

**The pools, perturbing one other book's eight parameters** (context; unpaired, other ranges):

{{t.designsContext}}

**System-level joint stresses** (all books at once; a distinct test of combined complexity):

{{t.designsSystem}}

"n/a" in the lot-path column: the prior audit's records of these designs keep only a lot-set hash, not the lots. Only
the VGT designs were re-executed with their lots (the `p-path` family).

## 4. Why the pools look more stable on VGT's own parameters

Each of the 64 matched vectors was run both standalone and inside its pool. Δ is measured against each structure's own
frozen run.

{{t.pairedSummary}}

- **Displacement acts as partial insurance.**
  - When a VGT perturbation costs the VGT book money, other books often gain the freed slot. The median "other
    books" change is positive in both pools.
  - So the pool's loss is smaller than the VGT book's.
  - The correlation between the standalone's Δ and the pool's Δ for the same vector is weak. The pool outcome
    depends on what the other books do with the slot.
- **The insurance is not reliable.** In a minority of samples the other books lose too (column "Other books lose").
  B5's worst matched sample earns {{v.d.B5_8_D_VGT_book_only.worst}} against the frozen $486,208.

**Supplementary lot-path diagnostic** (amendment A1: post hoc, descriptive, outside every rule). "Exact" means the same
decision, exit time and reason. "Entry session" means the same entry date, whatever the exit.

{{t.supplementary}}

- The whole-pool preservation used in item b6 is high only because most pool lots belong to unperturbed books.
- On VGT's own lots, the standalone and the pools are equally path-fragile.

## 5. One-at-a-time

All 32 VGT points are inside the legal grid. The S, B4 and B5 runs at each point are the same VGT vector.

**Swing of fixed net across each parameter's four points:**

{{t.oatSwings}}

- **The OAT surface.**
  - S's median OAT point keeps {{v.d.S_OAT.ret}}, and the worst {{v.d.S_OAT.worstret}}.
  - Three of 32 points beat the frozen net (pullback P 8.5%, 9.5%, 10.0%), as the column "> frozen" shows. These are
    in-sample observations of the same history and are **not** candidates.
  - S's sharpest single parameters are the trailing stop (−1.0 pp keeps {{v.d.S_OAT.worstret}}), Y +0.2 pp and X.
- **In the pools the same single changes reshuffle the slot.** Take VGT hold −2 days:
  - it **costs** S;
  - but it **raises** B4 and B5, because other books take the freed time.

  S's portfolio drawdown moves little under single changes: the OAT points' median daily drawdown is
  {{v.d.S_OAT.daily}}, and the worst is {{v.d.S_OAT.dailyMax}}.

<details><summary>Full OAT grid (fixed net, retention, and the pools' VGT-book / other-books decomposition)</summary>

{{t.oat}}

</details>

## 6. Portfolio risk across the neighbourhoods

{{t.designsPortfolio}}

**S's portfolio drawdown is the more stable one under parameter uncertainty:**
- **S's matched and joint neighbours** have a median daily drawdown of about {{v.d.S_joint_8_D_seed_1.daily}}
  (+{{v.d.S_joint_8_D_seed_1.shift}} over the frozen 32.78%). Few exceed 35%: {{v.d.S_joint_8_D_seed_1.daily35}}
  (seed 1) and {{v.d.S_joint_8_D_seed_2.daily35}} (seed 2).
- **B5's VGT-only neighbours** keep B5's 29.7%.
- **B5's system-level neighbours** have a median of {{v.d.B5_system_level_joint_40_D_seed_1.daily}}
  ({{v.d.B5_system_level_joint_40_D_seed_1.shift}} over frozen), and {{v.d.B5_system_level_joint_40_D_seed_1.daily35}}
  exceed 35%.
  - B5's drawdown advantage survives perturbing any single book's eight parameters: the per-book medians range from
    {{v.d.B5_8_D_VGT_book_only.daily}} to {{v.d.B5_8_D_XBI_book_only.daily}} (§3 context tables).
  - It does not survive perturbing all 40 together (the prior audit's finding).

**Where each design's worst daily-close drawdown falls** (regime windows of the prior protocol; "other YYYY" = outside
R1–R4). S's frozen worst episode is {{v.S.frozenDailyRegime}} (March 2020).

{{t.worstEpisodes}}

For most of S's neighbours the worst daily episode is the **2022 bear market** (R3 stress), not March 2020: see the
table. The frozen S only narrowly avoided making 2022 its worst; its 2022 episode is {{v.S.secondEpisode}}.

For planning, then, S's drawdown should be read as C0-like and 2022-driven. Its frozen 32.78% is not the expected
depth.

## 7. Traced execution paths (predeclared examples, fixed mode)

These are the four VGT OAT points with the largest B4 swings in the prior audit. Lot labels give symbol,
entry → exit, exit reason and net at $100,000.

{{t.traced}}

**What the examples show:**
- **The standalone has no slot competition, but it still has sequence effects.**
  - A different X or hold changes which dip arms.
  - That moves later entries, the net-profit stop, the post-exit continuation and its 60-session window.
  - So whole chains of lots change, for example the 2022 sequence.
- **In the pools, the same change also reorders the slot:**
  - at X −1.0 pp, B5's VGT book barely changes in total, but VGT holds the slot in March 2020 and the other books
    lose most of the difference;
  - at hold −2, the opposite happens: the pools gain from what other books do with the freed time.
