# Validation battery (opened once; development rank order)

- #4 parity (2016-01-04 → 2026-10-30): PASSED.

| Field | Expected (browser) | Observed | Match |
|---|---:|---:|---|
| totalMarkedNetUsd | 145468.46 | 145468.46 | yes |
| realizedNetUsd | 145468.46 | 145468.46 | yes |
| maximumMinuteDrawdownUsd | 14578.1 | 14578.1 | yes |
| maximumMinuteDrawdownPercent | 14.58 | 14.58 | yes |
| wins | 10 | 10 | yes |
| losses | 3 | 3 | yes |
| breakeven | 0 | 0 | yes |
| closed | 13 | 13 | yes |
| exposurePercent | 37 | 37 | yes |
| flatAtEnd | true | true | yes |

Calendar-time exposure (not the browser's displayed figure): 36.5%.

| Configuration | T1 | T2 | T3 | T4 | T5 | T6 | T7 | status | test share | test p90 DD | test val median | new val trades / episodes | 10 bps val net | higher net with ≤ DD than #4 | winners retained / retimed / new moves / lost (val) | losses vs #4 |
|---|---|---|---|---|---|---|---|---|---:|---:|---:|---|---:|---|---|---|
| #4 | pass | pass | pass | pass | FAIL | FAIL | pass | fail | 99.7% | $23,361.84 | $49,725.08 | 2 / 2 | $52,632.61 | — | — | — |
| C1 ec124684 | FAIL | FAIL | FAIL | FAIL | FAIL | pass | pass | fail | 74.0% | $37,919.10 | −$23,300.86 | 7 / 4 | −$29,311.02 | no | 0 / 2 / 1 / 0 (sparse) | 3 vs 0 (more) |
| C2 6f63defc | pass | pass | FAIL | FAIL | pass | pass | pass | fail | 98.4% | $29,570.91 | −$3,662.83 | 5 / 4 | −$1,636.23 | no | 1 / 1 / 0 / 0 (sparse) | 2 vs 0 (more) |
| C3 37d37e1e | FAIL | FAIL | pass | FAIL | pass | FAIL | pass | fail | 22.5% | $40,349.24 | $21,876.08 | 4 / 1 | $18,904.94 | no | 0 / 2 / 1 / 0 (sparse) | 0 vs 0 |
| C4 1308a733 | pass | FAIL | FAIL | FAIL | pass | pass | pass | fail | 88.5% | $35,675.76 | −$19,581.19 | 8 / 6 | −$26,138.76 | no | 0 / 2 / 1 / 0 (sparse) | 5 vs 0 (more) |
| C5 c3c10f60 | pass | pass | FAIL | pass | pass | pass | pass | fail | 93.8% | $34,057.02 | −$3,310.02 | 7 / 6 | $2,809.82 | no | 0 / 2 / 1 / 0 (sparse) | 4 vs 0 (more) |
| C6 a1115757 | FAIL | FAIL | pass | FAIL | pass | FAIL | pass | fail | 22.1% | $40,343.23 | $21,885.57 | 4 / 1 | $18,904.94 | no | 0 / 2 / 1 / 0 (sparse) | 0 vs 0 |

## Coverage (regular-session minute bars against the NYSE calendar)

| Window | sessions | missing sessions | bars < 90% of scheduled | bars < 50% | fewest bars | median bars | early closes (calendar) | no closing print |
|---|---:|---:|---:|---:|---:|---:|---|---|
| development | 2264 | 0 | 1620 | 0 | 134/210 (2016-11-25) | 311 (of the < 90% sessions) | 18 (18) | 2016-04-06, 2016-11-25, 2019-08-12 |
| validation | 459 | 0 | 171 | 0 | 264/390 (2025-07-25) | 315 (of the < 90% sessions) | 3 (3) | 2025-08-29, 2025-09-05 |

Minute bars exist only for minutes with a trade; the engine never imputes a missing minute (it fills and marks on the next actual minute), identically in every run, so thin minutes do not affect comparability between configurations.

## Continuity

```json
{
 "continuity": {
  "developmentSpanDigestEqual": true,
  "developmentSessions": 2264,
  "fullSessions": 2723,
  "validationSessions": 459
 },
 "control": {
  "developmentNetAtBoundary": 92575.71,
  "frozenDevelopmentNet": 92575.71,
  "equal": true
 },
 "members": [
  {
   "id": "ec124684b6466d77",
   "developmentNetAtBoundary": 133078.09,
   "frozenDevelopmentNet": 133078.09,
   "equal": true
  },
  {
   "id": "1308a73375be7b29",
   "developmentNetAtBoundary": 122372.48,
   "frozenDevelopmentNet": 122372.48,
   "equal": true
  },
  {
   "id": "37d37e1e6a1519d5",
   "developmentNetAtBoundary": 100862.16,
   "frozenDevelopmentNet": 100862.16,
   "equal": true
  },
  {
   "id": "c3c10f604c253c66",
   "developmentNetAtBoundary": 136518.25,
   "frozenDevelopmentNet": 136518.25,
   "equal": true
  },
  {
   "id": "6f63defcd07ffd44",
   "developmentNetAtBoundary": 94254.88,
   "frozenDevelopmentNet": 94254.88,
   "equal": true
  },
  {
   "id": "a1115757a431aad0",
   "developmentNetAtBoundary": 101589,
   "frozenDevelopmentNet": 101589,
   "equal": true
  }
 ]
}
```
