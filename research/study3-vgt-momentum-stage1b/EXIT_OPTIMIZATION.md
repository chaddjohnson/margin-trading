# Exit-family optimisation (brief §5, PROTOCOL §7.3)

Every one of the 11 optimised exit families was searched independently on each of the four entry controls (E06, E05,
E03 at Stage 1 defaults, and C-SMA), in every history, with **equal budgets**: 1,024 Sobol points + 128 local + 16
shortlisted centers × (32 joint draws + a 10 bps check) = 1,680 planned evaluations per cell, plus the predeclared
widening search when a RoD champion sat within 5% of a non-zero edge. 44 cells × 5 histories; the full archive (every
evaluated vector) is `results/payloads/develop-<H>/archive.jsonl.gz`; champions in `results/tables/exit-cells.md`.

## 1. The families (frozen definitions, PROTOCOL §4.2)

XF fixed hard + trailing (Hc or intraday-high reference) · XV volatility-scaled ratcheted trail · XS rising floor
(armed) · XT catastrophic hard + trend low + optional profit ratchet · XRP price profit retention · XRD dollar giveback ·
XD price × trend damage (OR / AND / regime) · XP financing-aware stall · XO own OUT with confirmation · **XE (invented)**
exposure-scaled trail · **XU (invented)** stale high / time under water. Every family also searched `own` ∈ {0, 1}.
Fixed references: B-D1T (7.3% immediate trail), B-D1N (D1-style net-profit trail), XM negative controls, XD-P/XD-T.

## 2. Champions (RoD = median over J33 of net / max(minute DD, $10,000); cells with a champion of the 4 entries)

| Family | A | B | C | D | H | Best H cell: RoD, net / minute DD, closed trades |
|---|---|---|---|---|---|---|
| XF | 3/4, 2.62 | 4/4, 3.42 | 4/4, 3.99 | 3/4, 2.53 | 3/4, 3.82 | E06 (widened): 3.82, +$85,765 / $18,028, 15 |
| **XV** | 3/4, **4.05** | 4/4, **5.70** | 4/4, 4.86 | 4/4, 4.65 | 4/4, **6.59** | E06: 6.59, +$97,107 / $14,365, 18 |
| XS | 3/4, 2.82 | 3/4, 4.04 | 4/4, 4.00 | 3/4, 2.91 | 3/4, 3.63 | E05: 3.63, +$104,140 / $28,719, 6 |
| **XT** | 3/4, 3.82 | 4/4, 3.97 | 4/4, **6.42** | 3/4, **5.45** | 4/4, 6.49 | E06: 6.49, +$131,359 / $18,528, 7 |
| XRP | 3/4, 3.16 | 4/4, 3.82 | 4/4, 5.62 | 4/4, 4.51 | 3/4, 5.28 | E03 (widened): 5.28, +$125,281 / $20,835, 10 |
| XRD | 3/4, 3.18 | 4/4, 3.81 | 4/4, 6.12 | 4/4, 3.76 | 4/4, 4.86 | E06: 4.86, +$90,297 / $15,165, 15 |
| XD | 3/4, 2.12 | 3/4, 3.11 | 4/4, 3.24 | 3/4, 3.30 | 3/4, 4.08 | E03: 4.08, +$112,799 / $27,807, 6 |
| XP | 3/4, 3.36 | 4/4, 3.58 | 4/4, 4.55 | 4/4, 3.33 | 4/4, 5.75 | E06 (widened): 5.75, +$102,362 / $15,255, 17 |
| XO | 3/4, 1.72 | 3/4, 2.92 | 3/4, 2.97 | 3/4, 2.54 | 4/4, 3.63 | E06 (widened): 3.63, +$95,219 / $15,931, 18 |
| XE | 3/4, 3.24 | 4/4, 4.23 | 4/4, 4.65 | 3/4, 4.64 | 3/4, 5.62 | E06: 5.62, +$97,327 / $15,152, 15 |
| XU | 3/4, 2.48 | 4/4, 2.67 | 4/4, 3.87 | 4/4, 2.61 | 3/4, 3.57 | E05: 3.57, +$101,756 / $32,243, 6 |

(The A–H columns give the number of entry controls with a champion and the best RoD among them.)

- **Protective trails rank first under the risk-aware objective:** XV and XT champions lead in every history; the
  best-training points (highest net) of XS, XRP, XRD and XU are wide, high-drawdown configurations ($80–150k DD),
  which the $35k feasibility and the RoD objective reject.
- **Tight vs wide.** The training-best XRP points on E06 and C-SMA are essentially no-stop configurations (+$217,504 /
  $150,794 — buy-and-hold-like), rejected by the drawdown feasibility. The XF champions split by entry: **E06's converged
  on tight trails (4.9–8.0%, usually on the intraday-high reference, own 0)** — the magnitude of D1's 7.3% — and E03's
  on 4–10%; C-SMA's and some of E05's on wide trails (26–33%) with own OUT. So a protective stop near D1's magnitude is
  the training optimum for the calm-advance entry, as the brief hypothesised; whether it generalises is the replay's
  question.
- **The invented families:** XE's champions span γ 0.16–2.95 (the widening rule extended γ past 2 twice); one champion
  (A, E06, γ 1.04) is within 0.05 of 1 and is reported as collapsing to a constant-dollar trail (overlapping XRD); none
  is ≤ 0.05 (collapsing to XF). XU reaches feasibility but ranks low — "time under water" is a weak exit signal for
  VGT's trends.
- **Widening** searched 127 cells once more across the five histories (XF 6, XV 7, XS 10, XT 17, XRP 10, XRD 16, XD 5,
  XP 15, XO 13, XE 17, XU 11); the widened result replaced the original only when its RoD champion scored higher (e.g.
  H E06 × XF, E03 × XRP, E06 × XP). Logged in each develop record.
- **C-SMA** has no champion for several families (no point with ≥ 75% J33 feasibility): its natural exits are slow.

## 3. Interpretation

In-sample, a trailing exit calibrated to volatility or a two-layer exit with a profit ratchet gives the best
return-over-drawdown for calm-advance and efficiency entries. This is the brief's core hypothesis in its favourable
form. It is also exactly what the chronological replay tests — and the fold-C pick (E03 × XT, trend low 106 sessions,
ratchet at +25.5% to a 5.2% trail) lost $28,223 in 2022 as a continuous run and its whole 2022 neighbourhood lost
(`NEIGHBORHOOD_AND_CHRONOLOGY.md`). The exits differ a lot; what they protect against in 2017–2021 is not what 2022
delivered (rallies that failed, not one long decline from a peak).
