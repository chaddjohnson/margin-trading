| Approach | Net P&L | Margin interest | Max MTM drawdown | Trades | Severe-entry rate | Severe episodes avoided | Profitable entries missed | Exposure days |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Original | $117,912 | $30,107 | $28,687 | 13 | 23% (3/13) | 0/1 | 0 | 680 |
| B — Velocity gate: B_skipSlow_60 | $58,812 | $21,427 | $28,687 | 11 | 27% (3/11) | 0/1 | 2 | 482 |
| C — Deterioration gate: C_gate_accel_3 | $47,807 | $13,441 | $23,163 | 8 | 25% (2/8) | 0/1 | 1 | 308 |
| D — Stabilization confirmation: D_upClose_rebound | $99,324 | $29,534 | $19,248 | 15 | 23% (3/13) | 0/1 | 0 | 671 |
| E — Adaptive threshold: E_ret5_15_stab | $105,136 | $25,858 | $28,753 | 10 | 30% (3/10) | 0/1 | 1 | 586 |
| F — Simple combination: F_accel_3+upClose | $91,217 | $21,849 | $17,801 | 10 | 30% (3/10) | 0/1 | 1 | 499 |
