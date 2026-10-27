# Prospective validation criteria for B4 and B5 (frozen with this audit)

Version `b4-b5-prospective-criteria-v1`. Written 2026-10-27. Its sha256 is recorded in
`PROSPECTIVE_CRITERIA_FREEZE.json`. It was written while the prospective observation count was **0**: no bar after 2026-10-13 exists in this
repository.

This document adds **decision criteria** on top of the frozen, purely descriptive forward comparison
`research/prospective-b4-b5-shadow/PROTOCOL.md` (`prospective-b4-b5-shadow-v1`, freeze body `407a669b…`). It changes
nothing in that protocol, its freeze, its code, the pools or their phenotypes. It reads only the figures its forward
reports produce, plus one reporting add-on (C0, §3).

The criteria bind only once the user adopts them. Until then they are this audit's recommendation. Once adopted, they
may not be changed after any forward observation is seen. A change requires a new version, and the evidence clock
restarts.

## 1. What counts as evidence

- **Data.** Only minute bars after 2026-10-13 count, entered through `npm run pools -- forward import` snapshots. The
  run is continuous from 2016-01-04 with nothing reset at the cutoff, and forward P&L is measured from the cutoff
  marks.
- **Nothing earlier counts.** The 2016–2026 history, including 2024–2026, is inspected research data. Nothing from it
  counts as validation.
- **Fixed parameters.** B4 and B5 keep their frozen parameters throughout. Any change to a book, the allocator, the
  costs or the portfolio rules ends the validation of that pool; a re-specified pool starts a new clock.
- **Costs reported.** Base: 5 bps per side and 11% simple interest. The forward pipeline's reporting-only scenarios:
  10 bps per side, and 14% interest.

## 2. When to evaluate

- **Kill-switch checks.** At every forward report (§4).
- **Formal review.** At the first forward report with **both** ≥ 252 forward sessions **and** ≥ 20 forward funded
  lots per pool (the forward protocol's evidence threshold), then once a year. At historical rates of about 8.1
  (B4) and 10.1 (B5) funded lots a year, the first formal review is expected after about 2–2.5 years.
- **GDX review.** The GDX increment is reviewed only after ≥ 6 forward funded GDX lots. At the historical 1.7 GDX lots
  a year, that is expected after about 3.5 years. Before then, B5's increment over B4 is reported as **unvalidated**,
  whatever its sign.
- **No early promotion.** Interim reports are descriptive, and no pool is promoted early.

## 3. Reporting add-on: C0 on the same observations

The no-margin control is the same engine with no books on the same composed data: the canonical files plus the
snapshot. It is computed by a separate read-only script, outside the frozen pipeline.

- Its forward maximum **daily** % drawdown has its peak reset at the cutoff, as in the forward protocol §6.
- The engine provides no forward minute % drawdown.
- Until the script exists, K4 and R3 cannot be evaluated, and the review states this.

## 4. Kill-switches (stop new entries for that pool pending a review; checked at every report)

| ID | Condition (forward window only) | Basis |
|---|---|---|
| K1 | Fixed-pool forward max minute-sampled drawdown > $45,000 | The historical maximum is $28,659 (B4) / $26,510 (B5). $45,000 is about the median 10-year maximum of the audit's joint parameter neighbours. |
| K2 | Fixed-pool forward cumulative net < −$30,000 at any report | About B4's five worst historical losses combined ($29,883). |
| K3 | Any single forward lot net < −$20,000 at $100,000 notional | Twice the worst historical lot (−$10,094). The rules have no protective stop. |
| K4 | Portfolio forward max daily % DD exceeds C0's (same window) by > 3 pp | The overlay deepens the core's drawdown materially. |

A triggered kill-switch is recorded with its report. It does not by itself reject the pool. The review decides.

## 5. Formal review: each pool

| ID | Criterion |
|---|---|
| R1 | Forward fixed net > 0 at the base, at 10 bps per side, **and** at 14% interest. |
| R2 | Forward fixed net per funded lot ≥ 25% of the pool's historical rate. B4: $3,740 per lot, so ≥ $935. B5: $5,172 per lot, so ≥ $1,293. This is about half of what the audit's neighbourhood median implies: deliberately low, because the frozen figures are an in-sample peak. |
| R3 | Portfolio forward max daily % DD ≤ C0's (same window) + 2 pp, and no unresolved kill-switch. |

**Outcome:**
- R1–R3 all hold: **retain (forward-supported)**.
- R1 fails: **reject as specified**.
- Otherwise: **conditional**, and the review continues next year.

## 6. Formal review: B5 versus B4 (should B5 replace B4 as the default?)

All of the following are required:

| ID | Criterion |
|---|---|
| S1 | B5 is "retain (forward-supported)" under §5. |
| S2 | Forward B5 − B4 fixed net > 0 at the base, at 10 bps per side, and at 14% interest. |
| S3 | B5's forward portfolio max daily % DD ≤ B4's + 1 pp, on the same observations. |
| S4 | ≥ 6 forward GDX funded lots, with GDX's forward net > 0. |

**Outcome:**
- All four hold: B5 may replace B4 as the default.
- S4 lacks lots: B4 stays the default, and B5 remains a candidate with the GDX increment unvalidated.
- S2 or S4 fails on a negative sign: the GDX increment is not supported forward.

## 7. Prohibited

- Changing any threshold after a forward observation.
- Re-tuning any book.
- Adding or removing books.
- Treating pre-cutoff data, or the audit's neighbourhoods, as forward evidence.
- Splicing an isolated `final`-partition run into the continuous forward run.
- Computing significance from forward trades as if they were independent.

## 8. What the criteria cannot do

With about 20 lots per pool, a forward window can reveal a **broken** strategy: losses, extreme drawdowns, a GDX book
that stops paying. It cannot confirm the historical magnitude. B5's advantage historically arrived in two episodes,
2020 and 2022–2024. Several years of forward data may contain no comparable episode, and then the criteria will
correctly report the increment as unvalidated rather than as refuted.
