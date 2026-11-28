# Standalone D1·TSLA (arm D)

**What it is.** D1 alone on TSLA (Growth off) in the one $100,000 slot: Study 8's D1 box (families A–D) with Assignment
2's control families, the decline gate OFF or ON — 8 protected cells with identical budgets, 4 base replicates per cell,
NL0's lanes, then 4 informed refinement lanes in up to 8 cells. Its finalists also feed arm C (pairs) and arm S (the
frozen D1).

**Development.** Every cutoff produced a qualified primary with a large in-sample net: C19 `D.B1/R102#1` $210,046 / DD
$15,892 (2016–2019); C21 `D.C1/R102#1` $297,254 / $25,375 (2016–2021); C23 `D.D1/R102#1` $235,330 / $20,969 (2016–2023).
C24 (2016–2024, the final selection): `D.B1/R103#1` **$319,654 / $25,587** (50 lots, 34 winners; protective stop 5.8 %
of entry, decline gate on), with 76.5 % of its development net from lots entered in 2020–2021. Roles: robust-profit
`D.C1/R103#2` $200,866 / $26,049, balanced `D.C1/R102#2` $191,135 / $22,652, lower-drawdown `D.B1/R101#6` $77,732 /
$13,189. 150 of 155 members qualified, and again only the 4 gate-ON cells had a feasible fit.

**Structure.** Once 2020–2021 entered the training data (C21 and later), **only the decline-gate-ON cells had any feasible
fit** (D.A1, D.B1, D.C1, D.D1): no gate-OFF fit met the search's P0 constraint (centre and neighbourhood drawdown
≤ $35,000 with a positive net) in any replicate. The report-only
D-A procedure (family A without the gate, the plain original D1 structure) therefore had no qualified candidate at C21
or C23. The primary changed family at every fold (B → C → D), and seeds disagreed materially within a cell (across replicates, a
typical cell's best feasible net varied by 31–43 % of its median; `SEARCH_AND_CONVERGENCE_REPORT.md` §D).

**Chronology (the binding test).** Chained out of sample, D's procedure earned +$20,368 (2020–2021), −$7,376 (2022–2023)
and +$12,231 (2024): **$25,172 over five years with a $40,170 drawdown — unsupported** (drawdown > $35,000). The
drawdown is realized: two D1 protective stops of about −$24,400 each (2020-03-06 → 03-13 and 2021-02-22 → 03-05), much
deeper than any training lot (worst training lot MAE −$8,409 at C19). Training robustness did not carry over: 243 of the
C19 primary's 256 confirmation draws breached $35,000 on 2020–2021, against 2.3 % on its training data.

**Reading.** D1 on TSLA is a small-edge, stop-dominated strategy whose in-sample profit (≈ $30,000–$52,000 a year of
data) shrank to ≈ $5,000 a year out of sample, with single-lot losses near a quarter of the slot. Its stop distances admit
−24 % lots on a stock that gaps through them.

**Validation (2025-01-02 → 2026-10-30, once, retrospective).** −$8,979 on 2 lots: a −$2,934 maximum-hold exit (February
2025) and a −$6,045 protective stop (July 2026). Reset DD $13,924, whole-run DD $27,742. V1 fails. The three roles also
lost, $6,544 to $16,974. **Determination for D: not a candidate**: no chronological support (b), and V1 fails (c).
Arm D's C24 finalists remain the D1 inputs to arms C (DF1–DF3) and S (C24F1–F3).
