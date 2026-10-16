| Approach | Net P&L | Margin interest | Max MTM drawdown | Trades | Severe-entry rate | Severe episodes avoided | Profitable entries missed | Exposure days |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Original | $190,905 | $72,751 | $28,687 | 43 | 47% (20/43) | 0/3 | 0 | 1659 |
| B — Velocity gate: B_skipSlow_60 | $131,948 | $64,071 | $28,687 | 41 | 49% (20/41) | 0/3 | 2 | 1460 |
| C — Deterioration gate: C_gate_accel_3 | $146,829 | $68,742 | $30,513 | 32 | 53% (17/32) | 0/3 | 3 | 1572 |
| D — Stabilization confirmation: D_upClose_rebound | $187,735 | $89,236 | $31,887 | 45 | 44% (19/43) | 0/3 | 0 | 2039 |
| E — Adaptive threshold: E_ret5_15_stab | $221,094 | $75,975 | $28,753 | 30 | 60% (18/30) | 0/3 | 4 | 1736 |
| F — Simple combination: F_accel_3+upClose | $201,755 | $81,249 | $27,760 | 38 | 55% (21/38) | 0/3 | 2 | 1859 |
