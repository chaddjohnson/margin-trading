# Track A: D1 refinement and bounded local optimization

Generated inputs: `results/a1/` (`a1_sweep.csv`, `a1_summary.md`, `a1_front.json`) from
`npm run d1-refinement -- a1-sweep`; `results/a2/` (`a2_summary.md`, `a2_<anchor>_full.csv`,
`a2_<anchor>_<fold>_training.csv`, `a2_walkforward.json`, `a2_refined.json`) from `npm run d1-refinement -- a2-local`;
`results/finalists/` for the A3 evaluation of the retained phenotypes.

## 1. A1: the continuation mechanism alone

9,211 evaluations (P 6.0–12.0% × W 30–180, Set 2's six parameters frozen at D1's), 167 distinct trade lists.

**The P plateau.** At W 60 the net is a step function of P with 14 distinct trade lists between 6.0% and 12.0%:

| P band | Net | Minute DD | Entries | What changes |
|---|---:|---:|---:|---|
| 6.0–6.3% | $162,818–$173,612 | $24,115 | 21 | a 2022 re-entry drives the drawdown above D1's |
| 6.4–6.6% | $155,154–$163,045 | $19,662 | 19–21 | |
| 6.7–7.7% (D3 band) | $171,978–$176,943 | $19,662–$19,755 | 20 | **2 entries in 2023** (2023-03-13 +$19,542 and a −$451 loss); weaker 2019/2020 re-entries |
| 7.8–8.4% | $165,022–$168,307 | $19,755–$19,806 | 19 | no 2023 entry, no 2019-08 entry |
| **8.5–9.4% (D1 band)** | $181,968–$188,852 | $18,990–$19,331 | 20 | the six D1 continuation trades (8.5–8.9% with the 2020-02-28 fill a minute earlier at 226.02; at 9.2% / W 69 a 2021-05-12 → 2021-10-01 trade (+$8,751) replaces 2021-03-05's (+$3,419)) |
| 9.5–9.7% | $166,496–$167,093 | $21,183 | 18 | the 2020-10-28 re-entry is lost |
| 9.8–11.5% | $153,151–$161,169 | $21,183 | 17 | |
| 11.6–12.0% | $145,291–$146,453 | $21,183 | 16 | approaches Set 2 |

**Where W matters.** Between the signature boundaries every W gives identical trades. At P 9.0% the boundaries are W
37, 58, 167, 169: W 30–36 $146,367 (16 entries), 37–57 $162,933 (18), **58–166 $183,044 (20; D1)**, 167–180
$182,568–$188,376 (22–23 entries, one 2023 loss). W 60 sits 2 sessions above the lower boundary; the plateau is wide
(109 sessions) on the upper side. At P 7.0% the boundaries are 58, 81, 139. Below W ≈ 58 the 2019-08-05 re-entry (the
window of the 2019-05-13 exit) is lost: 58 sessions is the time from that exit to the August pullback.

**Frontier of distinct trade lists** (feasible, non-dominated on net vs minute DD): P 9.2% / W 69–166 ($190,013 /
$19,331, 22 entries) and P 8.9% / W 169–180 ($183,660 / $18,990, 24 entries, two 2023 trades netting −$963). The P
9.2% cell is **one 0.1-step wide**: 9.1% gives D1's $183,044 and 9.3% $188,030 with a different list. Picks by policy
on the full run (in-sample): maxNet = balanced = P 9.2% / W 69; lowDd = P 8.9% / W 169; frequent = none (no cell has
1.5 × D1's entries).

**Trade-list changes of the frontier cells against D1** (`a1_summary.md` §6): P 9.2/W 69 preserves 17 of D1's 20
trades, loses 2020-10-28 (+$13,147), 2021-03-05 (+$3,419) and 2022-03-14 (+$7,698) and gains five others
(2020-10-28 at a different minute +$13,623, 2021-05-12 +$8,751, 2022-01-10 +$51, 2022-01-24 +$2,436, 2022-03-08
+$6,372). P 8.9/W 169 preserves 18, loses two, gains six including two 2023 trades (+$213, −$1,175).

**2022 and 2023.** Every cell in the band loses 3 trades in 2022 (D1's 2022 net +$23,074; the band's range
+$20,087 to +$24,714); no cell reintroduces repeated 2022 losses. 2023 participation exists only at P ≤ 7.7% (the
D3 band: one winner +$19,542 paid for by weaker 2019 and 2020 re-entries) and at W ≥ 167 with P 8.9–9.2% (small
losses). The 2023 recovery is a known diagnostic event; D3's 2023 trade is not independent evidence.

**Retained A1 candidates**: profit-oriented P 9.2% / W 69 (fragile in P); balanced D1 P 9.0% / W 60 (centre of the
8.5–9.4% band, 109-session W plateau); low-DD P 8.6% / W 60 ($182,842 / $18,990, the band's lowest drawdown at D1's
entries); 2023-participating D3 P 7.0% / W 60 ($176,943 / $19,705, 11-step-wide P band).

## 2. A2: the six original parameters, locally

Box X 20.0–25.0%, Y 0.2–0.8%, stop 6.5–9.0%, hold 6–16, L 60–104, buffer 1.5–4.0% (119 million grid cells); per
anchor 4,096 scrambled-Sobol points plus the anchor, evaluated on the full run and on four training windows (20,485
evaluations per anchor, 81,940 in all), then coordinate-wise refinement of the full-run picks and 160–844 further
evaluations per pick. Runtime 102 s on 9 workers.

### 2.1 D1 is the maximum of its own box

| Anchor | Design | Feasible | Distinct lists | Design net: min / median / 90% / max | Points beating the anchor's net | Beating it on net and DD |
|---|---:|---:|---:|---|---:|---:|
| D1 (P 9.0 W 60) | 4,097 | 4,041 | 4,088 | $33,346 / $130,535 / $158,284 / **$183,044** | 0 | 0 |
| P 8.6 W 60 | 4,097 | 4,073 | 4,086 | $14,986 / $128,766 / $157,367 / $182,842 | 0 | 0 |
| D3 (P 7.0 W 60) | 4,097 | 4,005 | 4,086 | $20,917 / $114,521 / $138,009 / $176,943 | 0 | 0 |
| P 9.2 W 69 | 4,097 | 4,036 | 4,083 | $23,986 / $131,083 / $158,526 / $193,662 | 2 | 0 |

In three of the four boxes **no point** of 4,096 beats the anchor's net; the anchor is the design maximum. The median
point of the D1 box earns $130,535 (71% of D1) and the 90th percentile $158,284 (86%): the six shipped parameters
sit at the top of a smooth hill, not on a plateau of equals. Only the P 9.2/W 69 box has two higher points, both in
the X 23.6–23.8% / Y 0.2% / L 62 / buffer 1.6% corner ($193,662; refined to **$195,808 / $19,517** at X 23.8%, Y
0.2% = the box edge, 21 entries, stability 85%). That vector is in-sample twice over (a one-step ridge in P, then a
corner of the local box) and is retained only as the profit-oriented phenotype with that label.

Full-run picks and refinements (in-sample) per anchor, `a2_summary.md`:

| Anchor | Policy | Refined vector | Net | Minute DD | Entries | Edge | Stability |
|---|---|---|---:|---:|---:|---|---:|
| D1 | maxNet = balanced | D1 itself | $183,044 | $19,331 | 20 | — | 79% |
| D1 | lowDd | X 22.4 Y 0.8 stop 7.8 hold 8 L 82 buffer 2.4 | $172,035 | $19,191 | 19 | Y | 97% |
| D1 | frequent | X 21.6 Y 0.3 stop 7.3 hold 8 L 61 buffer 3.8 (= D1's trades) | $183,044 | $19,331 | 20 | — | 76% |
| P 8.6 | lowDd | X 23.5 Y 0.8 stop 7.3 hold 11 L 60 buffer 2.6 | $173,872 | $19,670 | 16 | Y L | 89% |
| D3 | lowDd | X 21.6 Y 0.3 stop 7.3 hold 8 L 79 buffer 1.8 | $175,871 | $19,705 | 21 | — | 91% |
| P 9.2 W 69 | maxNet = balanced | X 23.8 Y 0.2 stop 7.3 hold 8 L 62 buffer 1.6 | $195,808 | $19,517 | 21 | Y | 85% |
| P 9.2 W 69 | lowDd | X 22.4 Y 0.2 stop 7.3 hold 8 L 74 buffer 2.9 | $195,342 | $19,345 | 21 | Y | 85% |

Boundary effects: the lowDd refinements push Y to 0.8% (the upper edge) and the maxNet ones to 0.2% (the lower
edge); neither direction is followed by widening the box (the brief's rule). Y moves trades by a few minutes and
re-sorts marginal entries; it is the parameter most prone to in-sample fitting here. The "frequent" picks (30 entries,
$105–132k, DD $26–33k, 8–9 losses in 2022) are the shallow-X / long-L phenotypes the previous programs rejected;
refinement drags them back onto D1's trade list.

### 2.2 The selection rule walked forward

For each fold the design is evaluated on the training window only; the policy picks; the pick, the anchor and frozen
D1 are run through the validation window (`a2_summary.md`, "Walk-forward of the selection rule").

| Anchor | Policy | Stitched pick net (4 windows) | Frozen D1 | Folds where the pick beat D1 | Worst pick DD | Picks identical across folds |
|---|---|---:|---:|---:|---:|---|
| D1 | maxNet | +$46,809 | +$146,898 | 0/4 | $28,438 | 3 different |
| D1 | balanced | +$61,045 | +$146,898 | 0/4 | $28,438 | 3 different |
| D1 | lowDd | +$49,631 | +$146,898 | 0/4 | $24,399 | 3 different |
| P 8.6 | balanced | +$72,316 | +$146,898 | 0/4 | $24,480 | 3 different |
| D3 | maxNet | +$104,720 | +$146,898 | 1/4 | $30,443 | 3 different |
| D3 | balanced | +$99,308 | +$146,898 | 1/4 | $30,443 | 3 different |
| P 9.2 W 69 | balanced | +$93,875 | +$146,898 | 1/4 | $25,386 | 2 different |
| P 9.2 W 69 | maxNet | +$68,183 | +$146,898 | 1/4 | $25,386 | 3 different |

No policy on any anchor beats frozen D1 on the stitched total, and none beats it on more than one fold. The failure is
concentrated in fold 1: trained through 2019 (one trade, 2018-12-21, plus the 2019 continuation), the rule picks
X 20.4–20.6%, stop 6.5%, L 60–81 and earns $1,236–$5,525 in 2020–2021 against D1's $78,003, with a $24–28k drawdown.
On fold 3 and fold 4 (trained through 2022 or 2023) maxNet and balanced pick D1 itself. The selection rule converges
on D1 once the 2020 and 2022 episodes are in the training window, and chooses badly before that: D1's parameters are
the product of the later history, which the earlier windows do not contain.

### 2.3 Answers

- **Is D1's edge concentrated or is there a stable neighbourhood?** Both, in different senses. The continuation
  mechanism has a wide plateau in W (58–166 sessions) and a 1.0-point band in P (8.5–9.4%) over which the trades are
  D1's; the six original parameters sit at the maximum of a smooth hill where 90% of the local box earns less than
  86% of D1's net, and D1's one-parameter probes are stable at 79% (probe range $120,705–$183,044, worst probe DD
  $25,078). The edge over Set 2 is six re-entry trades, +$32k, in 2019–2021.
- **Can bounded local adjustments improve the profit/drawdown trade-off without reintroducing 2022 losses?** Not out
  of sample. In-sample, the only improvement is the P 9.2% ridge and its corner (+$7k to +$13k at equal drawdown,
  the same three 2022 losses); the walk-forward never prefers it. Lower-drawdown variants exist (P 8.6%, $18,990; the
  lowDd refinements at $19,191–$19,705) at a cost of $1k to $11k of net; they are alternatives on the same plateau,
  not improvements.

## 3. A3: retained D1 phenotypes

Evaluated in `results/finalists/finalists.md` (full metrics, regimes, frozen-vector validation nets, sensitivities,
leave-one-recovery-out, neighbourhoods, trade lists) and compared in [STRATEGY_COMPARISON.md](STRATEGY_COMPARISON.md).

| Phenotype | Vector | Chosen on | Role |
|---|---|---|---|
| **D1** | X 21.6 Y 0.3 stop 7.3 hold 8 L 74 buffer 2.9 P 9.0 W 60 | the previous program (in-sample) | the reference; maxNet and balanced pick of its own box; the fold-3/fold-4 pick |
| A1-p86 | D1 with P 8.6% | A1 sweep, full run | lower-DD end of the plateau, same entries |
| A1-p92w69 | D1 with P 9.2% W 69 | A1 sweep, full run | profit-oriented, one 0.1-step wide in P |
| A2-maxNet | X 23.8 Y 0.2 stop 7.3 hold 8 L 62 buffer 1.6 P 9.2 W 69 | A2 refinement, full run | maximum credible net, in-sample twice, Y at the box edge |
| A2-lowDd | X 22.4 Y 0.8 stop 7.8 hold 8 L 82 buffer 2.4 P 9.0 W 60 | A2 refinement, full run | lower drawdown ($19,191), 97% probe stability, −$11k net |
| D3 | D1 with P 7.0% | the previous program | 2023-participating, 32% exposure |
| A1-p89w169 | D1 with P 8.9% W 169 | A1 lowDd pick | more frequent (24 entries), two small 2023 trades, $18,990 DD |

No "frequent" phenotype is retained: every candidate with ≥ 30 entries in the box carries 8–9 losing 2022 trades and
$26–33k drawdowns. Run commands: `npm run d1-refinement -- show --family d1 --params pullback=86` etc.
(`show` takes any `key=value` list in integer tenths/units); the shipped file reproduces D1 as is.
