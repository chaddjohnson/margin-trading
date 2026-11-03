<!-- Rendered by `npm run vgt-robustness -- report` from templates/PORTFOLIO_RISK_AND_CAPITAL_EFFICIENCY.md and results/analysis.json; edit the template, not this file. -->
# Portfolio risk and capital efficiency

**The account.** The same account is used for all four configurations:
- **core:** $300,000 at 60% VOOG / 40% VGT, never liquidated to fund exposure;
- **borrowing:** each funded lot borrows 20% of marked equity at the decision, at 11% simple interest and 5 bps per
  side;
- **reinvestment:** profits are reinvested 60/40, and losses are funded by core sales;
- **dividends:** the frozen convention.

**What is not modelled.** Maintenance ratios are passive; there are no margin calls and no forced sales.

**Drawdown measures.** Drawdowns are running-peak percentages of total equity, either at the daily close or sampled
every minute. The dollar figure is the fall at that depth. Fixed-pool figures ($100k) are reported separately and never
mixed with these.

**The 30% and 35% thresholds are historical evaluation thresholds, not risk bounds.** The core alone (C0) breached
30% without any leverage: {{v.C0.daily}} daily and {{v.C0.minute}} minute, 2021-12-27 → 2022-10-14.

## 1. The four portfolios at the frozen parameters

{{t.portfolio}}

**S (standalone VGT):**
- **Wealth:** adds {{v.S.inc}} over C0 (CAGR {{v.S.cagr}} against {{v.C0.cagr}}).
- **Drawdown:** **lowers** the core's maximum drawdown on both measures ({{v.S.incDaily}} daily, {{v.S.incMinute}}
  minute):
  - its worst episode moves from C0's 2022 bear market to the March-2020 crash ({{v.S.dailyPeak}} →
    {{v.S.dailyTrough}}, recovered {{v.S.dailyRecovery}});
  - its 2022 episode is {{v.S.secondEpisode}}, smaller than C0's because S's 2022 lots made money.
- **The 35% threshold:** S still exceeds 35% on the minute measure ({{v.S.minute}}).

**The pools:**
- **B4** adds more wealth ({{v.B4.inc}}) but **deepens** the core's drawdown ({{v.B4.incDaily}} / {{v.B4.incMinute}}).
- **B5** adds the most ({{v.B5.inc}}) and has the shallowest drawdown ({{v.B5.daily}} / {{v.B5.minute}}) at the frozen
  point.
  - That depth survives perturbing any single book's eight parameters: the per-book medians range from
    {{v.d.B5_8_D_VGT_book_only.daily}} to {{v.d.B5_8_D_XBI_book_only.daily}}.
  - It does not survive perturbing all 40 together (§4; the prior audit).

**The three deepest daily-close episodes of each:**

{{t.episodes}}

## 2. Capital efficiency

{{t.efficiency}}

- **S has the highest profit per lot** ({{v.S.perLot}}), and holds a lot only {{v.S.exposure}} of eligible sessions.
- **It earns the least per borrowed dollar-day.**
  - Fixed: {{v.S.perMillion}} per $1M dollar-days, against B4 {{v.B4.perMillion}} and B5 {{v.B5.perMillion}}.
  - Portfolio: {{v.S.portPerMillion}} against {{v.B4.portPerMillion}} and {{v.B5.portPerMillion}}.
  - Its long VGT holds (median 18 sessions, up to 139) tie up borrowing for modest per-day returns.
- **Its lower activity does not buy better capital efficiency on this history.** It buys fewer moving parts and a
  smaller footprint.
- **Fixed net ÷ fixed minute drawdown:** S {{v.S.netPerDD}}, B4 {{v.B4.netPerDD}}, B5 {{v.B5.netPerDD}}.

## 3. VGT duplication and concentration

S's overlay buys only VGT, which the core already holds at 40% of initial value. The VGT share below is core VGT
plus VGT lots, as a share of long market value. "Max VGT exposure ÷ equity" counts both.

{{t.duplication}}

- **While a VGT lot is open, S lifts the account's VGT share to {{v.dup.S.open}} on average.** The maximum is
  {{v.dup.S.max}}, against C0's {{v.dup.C0.max}}.
- **Total VGT exposure reaches {{v.dup.S.exposure}} of equity.**
- **The pools dilute this.** Part of their borrowing goes to XBI, XRT, KRE and GDX.
- **The risk is real but unmodelled.** In a VGT-specific (technology-sector) shock, S's account is more concentrated
  than C0's, and S's overlay adds to the core's own VGT exposure rather than diversifying it.

## 4. Neighbourhoods: what happens when the parameters are not exactly right

| Design (seed 1 unless stated) | Median end equity | Median vs C0 | Median daily % DD | Daily > 35% | Median minute % DD |
|---|---:|---:|---:|---:|---:|
| S joint 8-D, seed 1 (S's own full uncertainty) | {{v.d.S_joint_8_D_seed_1.endEq}} | {{v.d.S_joint_8_D_seed_1.inc}} | {{v.d.S_joint_8_D_seed_1.daily}} | {{v.d.S_joint_8_D_seed_1.daily35}} | {{v.d.S_joint_8_D_seed_1.minute}} |
| S joint 8-D, seed 2 | {{v.d.S_joint_8_D_seed_2.endEq}} | {{v.d.S_joint_8_D_seed_2.inc}} | {{v.d.S_joint_8_D_seed_2.daily}} | {{v.d.S_joint_8_D_seed_2.daily35}} | {{v.d.S_joint_8_D_seed_2.minute}} |
| S matched 8-D (64) | {{v.d.S_matched_8_D_both_designs.endEq}} | {{v.d.S_matched_8_D_both_designs.inc}} | {{v.d.S_matched_8_D_both_designs.daily}} | {{v.d.S_matched_8_D_both_designs.daily35}} | {{v.d.S_matched_8_D_both_designs.minute}} |
| B4, VGT book only (32) | {{v.d.B4_8_D_VGT_book_only.endEq}} | {{v.d.B4_8_D_VGT_book_only.inc}} | {{v.d.B4_8_D_VGT_book_only.daily}} | {{v.d.B4_8_D_VGT_book_only.daily35}} | {{v.d.B4_8_D_VGT_book_only.minute}} |
| B5, VGT book only (32) | {{v.d.B5_8_D_VGT_book_only.endEq}} | {{v.d.B5_8_D_VGT_book_only.inc}} | {{v.d.B5_8_D_VGT_book_only.daily}} | {{v.d.B5_8_D_VGT_book_only.daily35}} | {{v.d.B5_8_D_VGT_book_only.minute}} |
| B4 system-level 32-D, seed 1 (B4's own full uncertainty) | {{v.d.B4_system_level_joint_32_D_seed_1.endEq}} | {{v.d.B4_system_level_joint_32_D_seed_1.inc}} | {{v.d.B4_system_level_joint_32_D_seed_1.daily}} | {{v.d.B4_system_level_joint_32_D_seed_1.daily35}} | {{v.d.B4_system_level_joint_32_D_seed_1.minute}} |
| B5 system-level 40-D, seed 1 (B5's own full uncertainty) | {{v.d.B5_system_level_joint_40_D_seed_1.endEq}} | {{v.d.B5_system_level_joint_40_D_seed_1.inc}} | {{v.d.B5_system_level_joint_40_D_seed_1.daily}} | {{v.d.B5_system_level_joint_40_D_seed_1.daily35}} | {{v.d.B5_system_level_joint_40_D_seed_1.minute}} |
| B5 system-level 40-D, seed 2 | {{v.d.B5_system_level_joint_40_D_seed_2.endEq}} | {{v.d.B5_system_level_joint_40_D_seed_2.inc}} | {{v.d.B5_system_level_joint_40_D_seed_2.daily}} | {{v.d.B5_system_level_joint_40_D_seed_2.daily35}} | {{v.d.B5_system_level_joint_40_D_seed_2.minute}} |

**How to read these medians.** Each configuration's own full-uncertainty median is its in-sample central estimate when
all of its parameters are uncertain. They are not forecasts, and they are optimistic, because the plateau itself was
chosen on this history.

- **B5 keeps its wealth lead** ({{v.d.B5_system_level_joint_40_D_seed_1.inc}} against S's
  {{v.d.S_joint_8_D_seed_1.inc}}). But its median drawdown ({{v.d.B5_system_level_joint_40_D_seed_1.daily}}) is
  above S's ({{v.d.S_joint_8_D_seed_1.daily}}). About half of B5's neighbours exceed 35%, against about one in ten of
  S's.
  - These are 40-D and 8-D neighbourhoods, which is not like-for-like.
  - When only VGT's eight parameters move, B5 keeps {{v.d.B5_8_D_VGT_book_only.daily}} and S rises to about
    {{v.d.S_matched_8_D_both_designs.daily}}.
- **B4 and S have about the same incremental wealth** at their own-neighbourhood medians
  ({{v.d.B4_system_level_joint_32_D_seed_1.inc}} against {{v.d.S_joint_8_D_seed_1.inc}}). B4 has the higher
  drawdown.
- **Against C0's 33.89%,** S's median neighbour sits at about C0's level ({{v.d.S_joint_8_D_seed_1.daily}} for seed 1
  and {{v.d.S_joint_8_D_seed_2.daily}} for seed 2). The pools' own-neighbourhood medians are above it.

## 5. S under stress and the dividend sensitivity

{{t.sStress}}

- **Dividends.** Under the symmetric convention (no lot credited), S loses the {{v.S.lotDividends}} of VGT
  distributions its open lots received. The difference is immaterial.

## 6. Margin proximity (passive) and unmodelled broker risk

These are the minimum equity ÷ requirement under each passive schedule, over the run. Below 1.0 would mean a call
under that schedule; none is modelled.

{{t.margin}}

The three overlays are within a few hundredths of each other. C0 borrows nothing, so its ratios are higher. At 20%
borrowing on this core, no overlay came near a requirement in this history.

**Not modelled, and they matter more for S than for the pools:**
- **Vanguard's 30-day rule.** Newly bought Vanguard ETFs (VGT, VOOG) are not marginable for 30 days. **Every** S lot
  is a new VGT purchase, so its loan value cannot support the position at first. The B4/B5 lots in XBI, XRT, KRE and
  GDX are not Vanguard ETFs.
- **Concentration.** A single-sector book adds to the core's technology exposure (§3).
- **Gaps.** D1 has no protective stop. A lot bought into a collapse is closed only by the 8-day hold. S's worst
  intraday excursion was −10.8% in March 2020.
- **House requirements.** These can be raised in a crash.

**Not modelled for any configuration:**
- margin calls and forced sales;
- quote-level fills;
- capacity at the late-history lot sizes (the "max principal" column of §2).

None of this is a safety certification.
