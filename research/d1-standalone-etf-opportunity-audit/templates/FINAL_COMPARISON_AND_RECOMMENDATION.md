# Final comparison and recommendation

## Executive verdict

- **No ETF has a stronger historical case than VGT `primary`** under the predeclared rules (PROTOCOL.md §10): none of
  the 19 research phenotypes meets the "stronger" bar. That null result is the headline.
- **The frozen rules leave exactly one ETF at standing (i), EWW (iShares MSCI Mexico)** — but on three knife-edges and
  an uninformative axis, so its (i) amounts to "no blocking flag", not a demonstrated edge:
  1. neighbour capture of its major events is **exactly** the 50% line (F4);
  2. F4 is assessable at all only because its second major dip family, the 2020 crash (EWW-F06), enters the set with a
     base dip net of just **+$1,233**; EWW's 2020 profit came mostly from non-dip re-entries high in the rebound
     (EWW-E11: +$12,205 total, −$5,818 from dip entries), and the median neighbour **lost** $3,068 in the crash leg
     (EWW-E09; P10 −$17,046);
  3. its top winner, an October 2020 re-entry, is kept by 28% of neighbours against a 25% line (F5);
  4. of its "two of three" axes against VGT primary, one is a 100% = 100% tie on the share of profitable neighbours
     (13 of the 19 candidates tie there) and the other is 4 versus 3 independent dip events; its neighbourhood median
     net is lower than VGT primary's ($65,459 vs $71,174).
  The rule makes EWW eligible for a research-only prospective observation proposal; the evidence leans toward the
  explicit **"none"** reading below.
- **VGT primary's own (i) is not earned on the same terms** as the candidates': its axes are a comparison with itself
  (all ties) and its F8 is exempt by design (its fold increments were obtained with hindsight), while the VGT
  instrument's period-correct fold-b vector **lost $20,933** — the largest fold loss of any shortlisted instrument.
  Three candidates — FXI (both phenotypes) and MTUM's representative — miss (i) **only** because a fold vector lost
  money (−$9,931, −$9,931, −$11,095).
- **GDX is one flag away from "stronger".** Both GDX phenotypes meet every "stronger" condition — all three axes against
  VGT primary (two strictly better), all three against the procedure-matched control, period-correct support, no F7 —
  except the blocking F10, raised on **both** of its triggers: only 38% (alt 34%) of joint neighbours stay within the
  $35,000 minute-drawdown ceiling, and the median neighbour's portfolio max daily drawdown is 35.9% (alt 36.0%). GDX's
  profit is broad; its drawdown control is not. GDX is already a B5 member.
- **The other shortlisted ETFs are (ii):** XME's fitted $216,940 is a sharp, cost-fragile peak (F2, F6, F9); KBE has
  large tail losses and a negative fold; SLV, XLB, XHB and EDV have negative folds; IJH a fragile neighbourhood. **No
  ETF is unsupported (iii).**
- **The procedure-matched VGT control** (VGT's own final-window research vector) is (ii): weaker than VGT primary on
  the neighbourhood and capture tests (F4, F8 negative, F9, F10), though more cost-robust (C1 keeps 89% of its net
  against VGT primary's 63%).
- **B4 and B5 are unchanged.** On the identical 2016–2023 window B5's fixed pool earns $388,489 (82 lots, minute DD
  $26,510) and its 20% portfolio ends at $2,270,264 (max daily DD 29.67%); no single ETF approaches that, and this
  study does not (and cannot) displace B5. The question here was a one-slot standalone alternative to VGT primary.

Evidence tiers: every figure is **T-train** (2016-01-04 → 2023-12-29, the window every candidate was optimised on)
except the fold increments, which are **T-retro** (period-correct but different vectors, over inspected years); the
full-history incumbent panel is **T-2024** context. Forward observations: **0**.

## Same-window comparison (2016-01-04 → 2023-12-29; armed 2017-06-15; 5 bps; 11%)

{{cmp.sameWindow}}

Fixed figures are one $100,000 slot (B4/B5: one shared slot); minute DD is $ and % of $100,000. "net @C1" = 14%
interest and 10 + 10 bps per side, re-simulated. Portfolio = $300,000 60/40 VOOG/VGT core plus lots at 20% of marked
equity; C0 = the core alone. Pools and single ETFs are not the same product: a pool chooses among several ETFs' signals.

## Full-history incumbent references (context only; T-2024; never compared with the 2016–2023 figures)

{{cmp.full}}

## Flags and standing (PROTOCOL.md §10; `standing.ts`)

Axes against VGT primary and against the procedure-matched VGT control, in the order joint median net, joint share net
> 0, independent dip events: `>` strictly better on the pooled samples and each seed, `=` at least as good, `<` not.

Read with three facts: VGT primary's axes are a comparison with itself (all ties) and its F8 is exempt (hindsight), so
its (i) means only "no blocking flag"; 13 of the 19 candidates tie VGT primary at 100% on the share axis, which
therefore barely discriminates; and FXI (both) and MTUM's representative are blocked only by F8 (negative), GDX (both)
only by F10.

{{cmp.standings}}

### ETF level (the representative decides; the alternative only corroborates)

{{cmp.etfs}}

### How often each flag fired among the 19 candidate phenotypes

{{cmp.flagCounts}}

## Per candidate: evidence for and against

**EWW — Mexico (diversity slot; standing (i) by the rule; observation eligible, low priority).**
- *Thesis:* a volatile single-country equity fund with recurrent sell-offs — 15–30% in 2018 (twice), 2019, 2022 and
  2023, and a 47.6% crash in 2020 — that rebound; D1 (X 19.1%, L 178) arms on each sizable one.
- *For (T-train):* profitable in five calendar years with no losing year; dip-captured six eligible families, four of
  them at least 252 sessions apart; joint median $65,459, 100% profitable on both seeds, worst neighbour $19,257 and the
  highest joint P10 ($46,284) of any phenotype without F9/F10; 88% of neighbours within the drawdown ceiling; 83% of net
  kept under C1 with no lot changed; worst lot −$7,025, worst MAE −8.9%.
- *For (T-retro, different vectors):* the period-correct fold vectors — 43.6 and 34 step units away from the final
  vector — gained +$2,249 (fold-a; +$1,544 at 10 bps) and +$17,506 (fold-b).
- *Against:* the three knife-edges in the executive verdict (F4 exactly 50%; the 2020 family in M by $1,233 of dip net;
  F5 at 28%); the median neighbour lost money in the 2020 crash leg (EWW-E09 captured by 33%); joint median below VGT
  primary's; eight decline-phase entries lost $23,284; 38 lots in one window; single-country EM exposure (currency
  and political risk). Its alternative-1 corroborates only in the rule's sense of not being (iii): it raises F2 (worst
  lot −$11,402, worst MAE −11.1%), although its neighbourhood resembles the representative's (joint median $64,923).

**GDX — gold miners (merit; (ii); blocked only by F10 — otherwise "stronger").**
- *For:* the broadest profit neighbourhood of all (joint median $136,158, P10 $107,647, every sample profitable); five
  independent dip events; 80% neighbour capture; its 2018 and March 2020 captures are taken by 96–100% of neighbours;
  C1 keeps 89.5%; worst lot −$6,574, worst MAE −7.2%; both fold vectors positive; every "stronger" condition met except
  F10.
- *Against:* F10 on both triggers — only 38% of joint neighbours stay within $35,000 minute drawdown, and the median
  neighbour's portfolio max daily drawdown is 35.9%; 28 decline-phase entries lost $52,613 (54 lots: a high-turnover dip
  buyer); fold increments were tiny (+$1,133, +$4,196) for the ETF with the largest training nets; already a B5 member.

**XME — metals & mining (merit; (ii); F2, F6, F9).** The largest stored net ($216,940) is a sharp peak: joint median
$61,287 (retention 0.28); 23% of net survives C1, and it earns less at 0 bps than at 5 bps (path dependence; its fold-b
vector likewise gains $15,100 at 5 bps but $57,271 at 10 bps); its top winner (an October 2020 re-entry, +$46,781) is
kept by 35% of neighbours and its second-largest (January 2022, +$37,205) by none; worst lot −$14,776; no trade in
2017–2019 or 2023. For: its March–June 2020 crash legs (XME-E11 to E13) are captured by 79–91% of neighbours, and both
fold vectors were positive. XME alt: F2, F9, F10.

**KBE — banks (merit, marginal; (ii); F2, F8 negative, F10).** Profit broad (joint median $71,917 with every sample
profitable) but tail losses (worst lot −$17,568; alt −$24,232 and MAE −26.5%), 26 losing decline entries, a negative
fold-a and only 45% of neighbours within the drawdown ceiling.

**SLV — silver ((ii); F8 negative).** Clean flags otherwise, but only two independent dip events (2020 dominates:
$75,737 of $103,793), a −$9,989 fold-b and cost path sensitivity (0 bps $87,777; 18% $56,330).

**FXI — China large caps ((ii); F8 negative).** The most cost-robust record (C1 94%, no lot changed) and the smallest
losses (worst −$956), but eight lots, 84% of net in three trades (the October 2022 rebound alone $40,292) and a
−$9,931 fold-b. Promising but unproven.

**IJH — mid caps ((ii); F9, F10).** Both folds positive, but the neighbourhood keeps only 36% of net (joint median
$31,142) and the median neighbour's portfolio max daily drawdown is 35.3% (F10); IJH alt adds F9, F10 with 52% of
neighbours above the $35,000 ceiling.

**XLB — materials ((ii); F8 negative).** The smallest worst lot (−$358) and the second-smallest drawdown ($11,613); two independent dip
events; a slightly negative fold-a (−$261) on one lot. Too little independent evidence.

**MTUM — momentum factor ((ii); F8 negative).** Clean neighbourhood and drawdown, but a −$11,095 fold-b; MTUM alt adds
F6 (C1 49%) and F9.

**XHB — homebuilders ((ii); F8 negative, F10).** Large net ($134,145) with clean tails, but 44% of neighbours breach the
drawdown ceiling and fold-b lost $7,200; its fold-a vector loses its whole continuation chain at 10 bps.

**EDV — long Treasuries (contrast; (ii); F7, F8 negative).** Low drawdown and cost-robust, but both fold vectors lost
(−$16,837, −$9,218), ten lots, minute coverage 47% (fills unreliable), and distributions are not credited.

## The explicit "none" option

The rule returned exactly one (i), and only on the margins listed in the executive verdict. Weighing those margins,
the window-specific fit (every candidate was optimised on this exact span), the single-country risk and the fact that
the same rule would have demoted VGT primary's own instrument on period-correct evidence, **"none" is the
better-supported reading**: no shortlisted ETF has evidence strong enough to replace or supplement VGT primary, and B5
remains the established pooled strategy. The predeclared answer — EWW is eligible to be watched, not adopted — is
reported because it is what the frozen rule produced, not because it is a strong finding.

## What remains unproven

- Every candidate vector was fitted to 2016–2023 (2,048 Sobol vectors plus local search per ETF), and the 11 ETFs were
  chosen from 61 by inspecting the same history; local flatness does not undo that search, and the merit picks are the
  most exposed to the winner's curse.
- The fold checks are retrospective (inspected years, a procedure designed with 2016–2026 known); fold-b (2022–2023)
  was hard for the procedure across all 61 ETFs (median V −$211).
- 2024–2026 behaviour of every candidate is unknown here by design (no research phenotype is run after 2023-12-29).
- Episode counts are small (two to five independent dip events per phenotype); one crash (2020) dominates most nets.
- Execution (minute ordering, stop fills, liquidity, capacity), margin mechanics (house changes, forced sales, the
  Vanguard 30-day rule) and non-VGT distributions are idealised or absent.

## Recommendation

1. Keep VGT primary, B4, B5 and the prospective B4/B5 freeze exactly as they are; register nothing.
2. Treat the result as **"none, with one weak lead"**. If the user nevertheless wants a standalone alternative watched,
   the only rule-eligible one is `EWW:representative`
   (`research/d1-ranked-preemption/standalone/final/phenotypes/EWW-representative-d1-e749c2f782.json`): write a
   **separate, frozen, research-only prospective protocol**, observe it side by side with VGT primary from the first
   bar after 2026-10-13, and fix its criteria before any observation. Its 2024–2026 history, already in the
   repository, is inspected history that this study deliberately never opened for EWW.
3. GDX's drawdown fragility (F10) is a property worth knowing for B5, which already holds GDX; this study changes
   nothing in B5.
4. Do not deploy margin on any of these phenotypes on the strength of this audit.
