# D1-first sequential: frozen D1, Growth searched in the shared slot (arm S)

**What it is.** At each cutoff, arm D's finalists (≤ 3 distinct: primary, robust-profit and balanced roles) are frozen
before any Growth result, unchanged in every evaluation. Growth is then searched against each of them in the one
$100,000 slot: 6 Growth cells per frozen D1. R_S(F) = max(4, ⌈160 ÷ 6F⌉) replicates: 14 at C19 (2 distinct frozen D1)
and 9 at C21 and C23 (3). S's broad lanes plus arm D's own 32 are therefore at least J's 192 (brief Stage E: no
architecture "win" from more evaluations). Over C19–C23, S's lanes requested 11.45 M evaluations and J's 12.98 M
(`SEARCH_AND_CONVERGENCE_REPORT.md` §B).

**Development.** C19 `S.C19F1.h1.s1/R104#1` $294,785 / DD $15,342; C21 `S.C21F3.h0.s1/R104#1` $542,170 / $32,292; C23
`S.C23F3.h2.s1/R102#1` $449,917 / $32,506. These are the highest development nets of any arm at C21 and C23:

| Cutoff | Frozen D1 used | D1 part (training lots, net) | Growth part |
|---|---|---:|---:|
| C19 | C19F1 = arm D's primary `D.B1/R102#1` | 20 lots, $210,046 (identical to arm D: no D1 trade displaced) | 9 lots, $84,739 |
| C21 | C21F3 = arm D's balanced role `D.D1/R103#3` | 29 lots, $255,727 | 11 lots, $286,443 |
| C23 | C23F3 = arm D's balanced role `D.B1/R101#2` | 34 lots, $137,757 | 26 lots, $312,161 |
| C24 | C24F1 = arm D's primary `D.B1/R103#1` | 48 lots, $300,958 (arm D alone: 50 lots, $319,654) | 21 lots, $239,683 |

At C24 the frozen D1 finalists were arm D's primary (C24F1), robust-profit (F2) and balanced (F3) roles. The selected
pairing was built on the primary this time, `S.C24F1.h1.s1/R101#1`, $540,641 / $26,288, the highest development net of
any arm. In the shared slot, Growth held it when D1 signalled 2 times, and D1 held it when Growth signalled 8 times.
Roles: robust-profit `S.C24F3.h0.s1/R102#2` $391,774 / $28,466, balanced `S.C24F3.h0.s1/R101#3` $374,505 / $21,031,
lower-drawdown `S.C24F3.h2.s1/R101#2` $263,271 / $19,113. The S-U primary is `S.C24F1.h0.s0/R103#1` $405,954 / $29,301.

At C19, Growth filled only the slot's idle time: the D1 ledger is identical to standalone D. At C21 and C23 the selected
pairing was not built on arm D's primary but on its balanced-role D1, with Growth earning most of the net. The highest
in-sample total came from letting the Growth search pick which frozen D1 to pair with.

**Chronology (the binding test).** Chained: +$92,527 (2020–2021), −$25,876 (2022–2023), +$17,654 (2024) = **$84,305 with
an $82,547 drawdown — unsupported**, the deepest of the five arms. The chain peaked at +$117,171 during 2022–2023, fell
to +$34,625 at its 2024 low, and its 2022–2023 slice alone had a $64,512 reset drawdown. Realized losses drove it: the
C21 frozen D1 lost −$20,385, −$18,557 and −$18,526 on three 2022 protective stops (8 D1 lots, −$37,395 in 2022–2023,
against +$11,520 from Growth). In 2024 a D1 stop cost −$15,305, and Growth netted +$32,959 over 7 lots despite two initial
stops (−$11,294, −$7,266). In 2020–2021 the S chain's D1 trades were exactly arm D's (+$20,368, including the two
−$24,400 stops), and Growth added +$72,159 on 6 lots.

**Unrestricted Growth inside S (S-U, report-only).** $183,722 chained with an $85,703 drawdown, the 2022–2023 reset
drawdown alone.

**C24 comparisons (PROTOCOL §12, development).**
- Against G's primary, S is a type-P material improvement, replicated in 9 replicate numbers: +$199,729 centre net,
  +$111,082 confirmation robust, −$2,367 centre DD, +$1,879 confirmation p90 DD.
- Against J, S is also material and replicated (+$105,090).

**Validation (once, retrospective).** −$2,412. The D1 side traded exactly arm D's primary's lots (−$8,979), and Growth
made +$6,567 on four. Reset DD $26,869; V1 fails. The roles lost $2,049 to $19,940. **Determination for S: not a
candidate** (b and c fail).

The largest in-sample architecture advantage of the study is S's. It was followed by the deepest sequential drawdown on
the folds ($82,547) and a validation loss.
