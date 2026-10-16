| Approach | Net P&L | Margin interest | Max MTM drawdown | Trades | Severe-entry rate | Severe episodes avoided | Profitable entries missed | Exposure days |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Original | $103,001 | $55,211 | $31,684 | 28 | 61% (17/28) | 0/2 | 0 | 1267 |
| B — Velocity gate: B_skipSlow_60 | $94,671 | $53,795 | $31,684 | 27 | 59% (16/27) | 0/2 | 0 | 1232 |
| C — Deterioration gate: C_gate_accel_3 | $89,045 | $51,625 | $31,787 | 25 | 68% (17/25) | 0/2 | 2 | 1182 |
| D — Stabilization confirmation: D_upClose_rebound | $99,670 | $55,995 | $30,522 | 28 | 57% (16/28) | 0/2 | 0 | 1288 |
| E — Adaptive threshold: E_ret5_15_stab | $69,203 | $43,879 | $27,280 | 20 | 75% (15/20) | 0/2 | 2 | 1008 |
| F — Simple combination: F_accel_3+upClose | $113,411 | $55,151 | $30,198 | 26 | 65% (17/26) | 0/2 | 2 | 1261 |
