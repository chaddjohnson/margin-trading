# Neighbourhood robustness

## Sources

- `results/phaseD/*/*/validation.json`: confirmation sets on the run to each fold's evaluation end.
- `results/final/final.json`: final sets on the full history to 2026-10-29.
- `results/tables/phaseD-candidates.md`: every one of the 88 validated shortlist members.
- `results/tables/final-*.md`.

## Instrument

The decisive design is the joint N1 clip Latin hypercube over **all** coordinates of the configuration, with radius
r = X 1.0 pt, Y 0.2 pt, stop 1.0 pt, hold 2, L 10, buffer 1.0 pt, P 1.0 pt and W 20. It uses three independent
128-point families, pooled to about 384 unique points. The gate is share < $35k ≥ 0.90 **and** p90 < $35k.

The other designs are sensitivity checks, never decisive alone:
- in-box (2 × 128);
- 0.5r and 1.5r (128 each);
- count-matched k = 8 (2 × 128);
- norm-matched √(8/d) (128);
- one book at a time (64 per book).

A candidate with a coordinate within r of a bound must also pass the in-box design (Q2b / F2b).

## 1. Every finalist (the 12 Class L role holders) on the full history, with new seeds (final door)

| Rank | Nominee | FULL centre net | Final median net | Final p10 net | Centre ÷ median | Final p90 DD | Final share (n) | Wilson LB | Sets 1/2/3 share % | In-box | 0.5r | 1.5r | Count-matched k=8 | Norm-matched | Per-book (64) | Coords within r of a bound | Confirmation →2023 share / p90 |
|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---|---:|---|
| 1 | VG profit | $284,271 | $265,952 | $233,667 | 1.07 | $33,322 | 97.7% (384) | 96.0% | 98/97/98 | 99.2% | 96.1% | 85.9% | 98.8% | 96.9% | VGT 100.0%; GDX 100.0% | 5 | 99.7% / $26,241 |
| 2 | VG robust | $274,857 | $252,391 | $221,998 | 1.09 | $30,741 | 99.7% (384) | 98.8% | 100/99/100 | 100.0% | 100.0% | 96.9% | 100.0% | 100.0% | VGT 100.0%; GDX 100.0% | 6 | 99.5% / $23,878 |
| 3 | VXRG profit | $276,157 | $206,101 | $149,547 | 1.34 | $30,162 | 99.7% (384) | 98.8% | 100/99/100 | 99.6% | 100.0% | 96.1% | 100.0% | 100.0% | VGT 100.0%; XBI 100.0%; XRT 100.0%; GDX 100.0% | 9 | 100.0% / $28,046 |
| 4 | VXRG balanced | $255,387 | $193,420 | $141,898 | 1.32 | $25,952 | 99.2% (384) | 98.1% | 99/98/100 | 98.0% | 100.0% | 99.2% | 100.0% | 100.0% | VGT 100.0%; XBI 100.0%; XRT 100.0%; GDX 100.0% | 8 | 99.7% / $24,898 |
| 5 | VG balanced | $244,081 | $213,226 | $165,756 | 1.14 | $22,759 | 100.0% (384) | 99.3% | 100/100/100 | 100.0% | 100.0% | 99.2% | 100.0% | 100.0% | VGT 100.0%; GDX 100.0% | 3 | 100.0% / $20,627 |
| 6 | VXR profit | $222,332 | $177,077 | $125,237 | 1.26 | $32,799 | 99.2% (384) | 98.1% | 99/100/98 | 98.8% | 100.0% | 95.3% | 100.0% | 100.0% | VGT 100.0%; XBI 100.0%; XRT 100.0% | 10 | 99.5% / $27,540 |
| 7 | G profit | $168,378 | $141,532 | $114,205 | 1.19 | $20,713 | 100.0% (384) | 99.3% | 100/100/100 | 100.0% | 100.0% | 99.2% | 100.0% | — | — | 1 | 100.0% / $21,400 |
| 8 | VXRG robust | $143,189 | $128,752 | $91,045 | 1.11 | $21,371 | 100.0% (384) | 99.3% | 100/100/100 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | VGT 100.0%; XBI 100.0%; XRT 100.0%; GDX 100.0% | 10 | 100.0% / $20,627 |
| 9 | VXR balanced | $196,900 | $138,015 | $97,702 | 1.43 | $23,463 | 100.0% (384) | 99.3% | 100/100/100 | 100.0% | 100.0% | 99.2% | 100.0% | 100.0% | VGT 100.0%; XBI 100.0%; XRT 100.0% | 5 | 100.0% / $22,721 |
| 10 | G balanced | $162,406 | $113,760 | $87,791 | 1.43 | $20,759 | 100.0% (384) | 99.3% | 100/100/100 | 100.0% | 100.0% | 100.0% | 100.0% | — | — | 0 | 100.0% / $17,281 |
| 11 | G robust | $166,638 | $121,103 | $87,137 | 1.38 | $17,310 | 100.0% (384) | 99.3% | 100/100/100 | 100.0% | 100.0% | 99.2% | 100.0% | — | — | 1 | 100.0% / $17,281 |
| 12 | VXR robust | $177,020 | $133,400 | $83,672 | 1.33 | $20,994 | 100.0% (384) | 99.3% | 100/100/100 | 99.6% | 100.0% | 100.0% | 100.0% | 100.0% | VGT 100.0%; XBI 100.0%; XRT 100.0% | 4 | 99.7% / $20,967 |

Readings:

- **Gate pass rates.**
  - Every nominee keeps ≥ 97.7% of its full-history neighbours below $35k, with Wilson lower bounds ≥ 96.0%.
  - All three independent final families agree. No nominee is marginal.
  - The confirmation figures on 2017–2023 (last column) were measured before the final door. The final figures are on
    new seeds and an additional 2.8 years.
- **Profit plateaus.** Centre ÷ median is 1.07–1.43. The neighbourhoods keep 70–93% of the centre's net, unlike the
  frozen controls (1.41–2.06; table 2).
  - VG robust and VG profit are the flattest: 1.07–1.09, with p10 at 81–82% of the centre.
  - A small gap alone is not taken as favourable (§2 below).
- **Weak spots.**
  - **#1 VG profit at 1.5r: 85.9%.** It is the one nominee whose neighbourhood thins when the radius grows, and its
    p90 ($33,322) is the closest to the ceiling.
  - **Bound adjacency.** Several nominees have many coordinates within r of a bound: 9–10 for VXRG profit/robust and
    VXR profit. They passed in-box (F2b), but the box limits a third of their neighbours' moves.
- **Dimension.** Count-matched k = 8 gives 98.8–100% and per-book gives 100% everywhere. The nominees' full-dimensional
  robustness is not an artefact of a small perturbed dimension.

## 2. Controls on the same final sets

| Control | FULL centre net | Centre minute DD | Final median net | Final p10 net | Centre ÷ median | Final p90 DD | Final share | In-box | k=8 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B1 | $176,260 | $19,534 | $125,304 | $90,926 | 1.41 | $28,704 | 100.0% | 100.0% | 100.0% |
| VG | $278,266 | $25,774 | $195,567 | $126,842 | 1.42 | $44,356 | 71.6% | 70.7% | 85.9% |
| VXR | $228,475 | $19,534 | $134,121 | $99,945 | 1.70 | $34,798 | 90.4% | 89.1% | 100.0% |
| VXRG | $387,857 | $25,774 | $224,780 | $141,527 | 1.73 | $46,324 | 65.1% | 59.0% | 97.7% |
| B5 | $484,637 | $26,510 | $235,354 | $158,375 | 2.06 | $57,125 | 27.1% | 31.2% | 89.1% |
| G-PA | $197,029 | $34,134 | $117,866 | $51,823 | 1.67 | $49,877 | 15.1% | 17.6% | 13.7% |
| G-TS | $171,224 | $29,880 | $144,369 | $120,262 | 1.19 | $48,710 | 40.9% | 37.1% | 40.2% |
| G-SR | $201,483 | $34,427 | $178,993 | $152,961 | 1.13 | $42,233 | 47.4% | 56.2% | 46.1% |
| G-NM1 | $262,020 | $30,616 | $184,521 | $155,933 | 1.42 | $41,517 | 53.9% | 52.3% | 60.2% |
| G-NM2 | $255,319 | $30,834 | $181,775 | $147,905 | 1.40 | $42,431 | 44.5% | 38.7% | 50.0% |
| G-NM3 | $252,772 | $34,239 | $187,057 | $149,658 | 1.35 | $44,740 | 47.9% | 43.0% | 48.8% |
| G-T1P | $179,375 | $45,620 | $175,693 | $150,055 | 1.02 | $55,049 | 0.0% | 0.0% | 0.0% |
| G-T1S | $260,954 | $32,704 | $192,552 | $158,037 | 1.36 | $46,621 | 38.0% | 30.1% | 38.3% |
| G-T2C | $188,575 | $30,237 | $166,576 | $129,628 | 1.13 | $49,579 | 8.3% | 9.4% | 9.8% |
| G-T2P | $136,699 | $44,790 | $134,263 | $85,306 | 1.02 | $50,036 | 7.3% | 12.9% | 8.6% |

- **B1** passes the gate (100%), as in every earlier study.
- **The frozen VXR subset passes on these final seeds** (90.4%, p90 $34,798), having failed narrowly on Phase A's W29
  seeds (87.5%, p90 $35,486). It is a genuinely **marginal** configuration: its verdict depends on the seed family.
- **Frozen VG** (71.6%), **VXRG** (65.1%), **B5** (27.1%) and **every earlier GDX vector** (0–54%) fail.

## 3. Near-zero-trade guard and centre/neighbourhood gaps

- **Activity.** The nominees fund 19–63 lots over 2017-06 → 2026-10, in 10–19 episodes. Their neighbourhood median
  lots are of the same order. None is a near-zero trader.
- **The GDX standalone nominees are low-activity.** Outside crash years they trade little: 3–6 lots in 2024–2026.
  Their robustness rests partly on that inactivity (`GDX_STANDALONE.md` §4).
- **Lots and share.** Among rung-3 candidates of the same track-fold the rank correlation is −0.23 to +0.54, except
  G-L at −0.95, where more activity means less robustness (`OPTIMIZATION_AND_COMPUTE.md` §4).
- **Ranking.** A near-zero centre-to-neighbourhood gap is never treated as favourable alone. The study's ranking uses
  pooled robust profit (½ median + ½ p10) on figures ending 2023-12-29, together with the gates.

## 4. Replication and precision

- **Search fidelity ladder.** Rung 3, then selection, then confirmation are three independent seed families on the
  same training window, and their figures agree within a few hundred dollars a year and a few points of share
  (`OPTIMIZATION_AND_COMPUTE.md` §3). The final families agree with the confirmation families.
- **Chronology is the failure point.** Fold-M neighbourhoods passed on DEV and collapsed on 2022–2023, with shares of
  0–65% (`WALK_FORWARD_AND_VALIDATION.md`). The perturbation estimates are precise; robustness across time is what
  failed.
