# Fixed D1 + Growth combination (arm C)

**What it is.** No search. At each cutoff, every pair of arm D's frozen finalists (≤ 3: primary, robust-profit and
balanced roles; `DF1–DF3`) and arm G's (`GF1–GF3`) is run with both vectors unchanged in the one $100,000 slot on the
common TSLA chronology. D1 decides first at a shared instant, and nobody preempts an open lot. The pairs are qualified
with the same gates Q1–Q6 (Q6: both families funded), and NL0's original rule picks the primary pair.

**Development.** Qualified pairs: C19 5 of 6, C21 2 of 9, C23 1 of 6 (most failures were Q3, the confirmation p90
drawdown; at C23 also Q2 and Q5). Two individually qualified strategies often do not make a qualified pair: their
drawdowns can stack in one slot. The selected pair was never the two primaries together:

| Cutoff | Primary pair | Centre net / DD | D1 part (training lots, net) | Growth part |
|---|---|---:|---:|---:|
| C19 | DF1 × GF3 (D primary × G balanced) | $242,090 / $15,892 | 20 lots, $210,046 (identical to arm D's primary) | 4 lots, $32,044 at the cutoff (one still open) |
| C21 | DF2 × GF1 (D robust × G primary) | $329,170 / $32,292 | 29 lots, $141,269 | 6 lots, $187,901 |
| C23 | DF3 × GF2 (D balanced × G robust) | $403,641 / $32,506 | 34 lots, $137,757 | 13 lots, $265,884 |
| C24 | DF1 × GF3 (D primary × G balanced) | $498,120 / $26,288 | 47 lots, $263,023 (arm D's primary alone: 50 lots, $319,654) | 22 lots, $235,097 (arm G's balanced role alone: 28 lots, $311,583) |

At C24, 1 of 9 pairs qualified. The other eight failed Q3 (8), Q2 (3) and Q5 (3). In development the qualified pair
earned $133,117 less than its two parts alone ($631,237): Growth held the slot when D1 signalled 3 times, and D1 held it
when Growth signalled 6 times.

**Displacement on the folds.** In 2020–2021 the C19 pair's Growth lots occupied the slot when D1 signalled. Its D1 made 11
lots and $354, against 14 lots and $20,368 for the same D1 vector alone in arm D. The Growth side made $36,108 on the 9 lots it
entered, plus $9,003 on the lot carried from 2019 (most of it already sold before the cutoff). The C21 pair's Growth side (G's C21 primary) never entered in
2022–2023, so the pair was its D1 side alone (−$11,309). In 2024 the C23 pair lost −$7,567: a D1 stop of −$15,305, and
Growth +$7,737 on four lots.

**Chronology (the binding test).** Chained: +$45,465, −$11,309, −$7,567 = **$26,589 with a $61,092 drawdown —
unsupported**. Out of sample the fixed pair did worse than the better of its two standalone parts in 2022–2023 and in
2024. It deepened the 2024 drawdown ($37,608 reset, against $11,051 for D and $26,796 for G). The folds show no
combination benefit.

**C24 comparison (PROTOCOL §12, development, C24).** Against the better standalone primary (G's, $340,913), the pair is
a type-P material improvement:
- +$157,207 centre net;
- +$83,324 confirmation robust net;
- −$2,367 centre DD;
- −$116 confirmation p90 DD.

Replication does not apply (fixed pairs, no seeds).

**Validation (once, retrospective).** +$71, reset DD $25,953, whole-run DD $26,288: V1–V3 pass, by $71. The two sides
never collided in 2025–2026, so the pair is exactly arm D's primary (−$8,979) plus arm G's balanced role (+$9,050).

**Determination for C: development-qualified, no chronological support: not deployment-qualified without an explicit
user decision** (omitted from the sealed outcome's list by the join defect, `AMENDMENTS.md` D1). In development the pair
looks much better than either part. Out of sample, on the folds and on the validation, it never beat the better part.
