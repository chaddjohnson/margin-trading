| Approach | Net P&L | Margin interest | Max MTM drawdown | Trades | Severe-entry rate | Severe episodes avoided | Profitable entries missed | Exposure days |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Original | $72,993 | $42,644 | $23,723 | 30 | 57% (17/30) | 0/2 | 0 | 979 |
| B — Velocity gate: B_skipSlow_60 | $73,136 | $42,644 | $23,723 | 30 | 57% (17/30) | 0/2 | 0 | 978 |
| C — Deterioration gate: C_gate_accel_3 | $99,022 | $55,301 | $30,513 | 24 | 63% (15/24) | 0/2 | 2 | 1264 |
| D — Stabilization confirmation: D_upClose_rebound | $88,411 | $59,701 | $31,887 | 30 | 53% (16/30) | 0/2 | 0 | 1368 |
| E — Adaptive threshold: E_ret5_15_stab | $115,958 | $50,118 | $25,415 | 20 | 75% (15/20) | 0/2 | 3 | 1150 |
| F — Simple combination: F_accel_3+upClose | $110,537 | $59,400 | $27,760 | 28 | 64% (18/28) | 0/2 | 1 | 1360 |
