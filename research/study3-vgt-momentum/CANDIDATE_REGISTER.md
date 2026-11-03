# Candidate register (research-only)

**Nothing here is registered, promoted, deployed or written to `config/`.** The study's verdict is *no demonstrated
standalone edge*. This register only records, with exact signatures, what the frozen procedure produced, so that a
later, separately authorised stage can refer to a frozen object instead of re-selecting. The machine-readable version
is `CANDIDATE_REGISTER.json` (51 entries: every family champion of every history, ranked by the predeclared
neighbourhood-median rule, generated read-only from the sealed records by `scripts/report_tables.py`).

All candidates use the template TPL: the family's own OUT (decided at the close, executed at the next opening trade),
a resting stop at max(raw fill × (1 − h), Hc × (1 − t)), Hc = max(raw fill, closes held), re-entry R3-or-fresh, a
fixed $100,000 lot, 5 bps per side and 11% simple interest. IDs are `<family>-<sha256[:10] of the parameter key>`
(`src/study3-vgt-momentum/specs.ts`).

## Full-history (H, 2017-01-03 → 2023-12-29) champions — in-sample ranks

| Rank | ID | Family | Parameters | Dev net | Nbhd median | Finalist | Joint-draw pass | Status |
|---:|---|---|---|---:|---:|---|---:|---|
| 1 | **E06-4978efef20** (H's P\*) | E06 calm advance | v_in 0.240, v_gap 0.296, N 95, h 0.040, t 0.240 | +$120,096 | +$120,096 | yes | 89% | frozen procedure output; standalone evidence negative (fold record Σ +$253) |
| 2 | E05-7bc7a94713 | E05 rising floor | theta 0.044, b 0.006, h 0.091, t 0.270 | +$97,193 | +$97,193 | yes | 30% | fails joint-draw robustness |
| 3 | E03-e85d1ff029 | E03 efficiency | N 11, e_in 0.08, e_gap 0.41, h 0.077, t 0.291 | +$92,336 | +$91,441 | yes | 23% | fails joint-draw robustness |
| 4 | E08-277754a128 | E08 compression | N 11, c 0.072, h 0.030 (boundary), t 0.119 | +$91,254 | +$86,248 | yes | 61% | fails joint-draw robustness |
| 5 | E02-217d2f4b2a | E02 hurdle drift | N 248, a_in 0.198, a_gap 0.004, h 0.079, t 0.199 | +$86,918 | +$85,497 | no | — | not stress-tested |
| 6 | E04-a818582c79 | E04 CUSUM | κ 0.35, h_in 1.4, h_out 8.0 (boundary), h 0.080, t 0.120 | +$80,631 | +$80,467 | no | — | not stress-tested |
| 7 | E11-29c91f2e7f | E11 permission | D 0.30 (boundary), n 28, h 0.077, t 0.059 | +$71,242 | +$71,242 | no | — | not stress-tested |
| 8 | E01-e4a6a20f22 | E01 peak proximity | d_in 0.077, d_gap 0.036, h 0.127, t 0.244 | +$69,806 | +$69,806 | no | — | not stress-tested |
| 9 | E07-5abc1b5521 | E07 acceptance | N 20, A 1, h 0.033, t 0.172 | +$58,266 | +$55,585 | no | — | not stress-tested |
| 10 | E12-459b31402d | E12 pullback | u 0.235, p 0.046, h 0.059, t 0.128 | +$37,124 | +$37,124 | no | — | not stress-tested |
| 11 | E10-0ecf703d66 | E10 breakout trailing buy | Yb 0.001, h 0.130, t 0.071 | +$14,083 | +$13,783 | no | — | not stress-tested |

E09 had no H champion (it failed M1 gate g3). Development nets are in-sample maxima over 14,349 trials and are **not**
expected returns.

## Fold picks (the chronology-respecting record)

| Fold | P\* | Window result | Status |
|---|---|---:|---|
| A | E06-9ee2ce7bd5 (v_in 0.191, v_gap 0.367, N 149, h 0.109, t 0.239) | 2020 +$18,608 | sealed; evaluated |
| B | E04-86b6d59a31 (κ 0.12, h_in 1.0, h_out 7.8, h 0.077, t 0.194) | 2021 +$14,577 | sealed; evaluated |
| C | E04-b4a27ac53b (κ 0.13, h_in 1.1, h_out 7.9, h 0.079, t 0.246) | 2022 −$57,578 | sealed; breached the $35,000 reference |
| D | E06-47640253c0 (v_in 0.315, v_gap 0.191, N 95, h 0.132, t 0.225) | 2023 +$24,646 | sealed; fails joint-draw robustness (69%) |

**If, and only if,** the user authorises Stages 2–4 despite this result, the frozen protocol names H's P\*
**E06-4978efef20** as the momentum book to carry forward (`PROTOCOL.md` §11), with no re-tuning. Its standalone
evidence is the procedure's fold record above, which did not pass.
