| Approach | Net P&L | Margin interest | Max MTM drawdown | Trades | Severe-entry rate | Severe episodes avoided | Profitable entries missed | Exposure days |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Original | $233,266 | $92,099 | $31,684 | 42 | 48% (20/42) | 0/3 | 0 | 2107 |
| B — Velocity gate: B_skipSlow_60 | $162,327 | $82,184 | $31,684 | 39 | 49% (19/39) | 0/3 | 2 | 1878 |
| C — Deterioration gate: C_gate_accel_3 | $189,654 | $77,422 | $31,787 | 33 | 58% (19/33) | 0/3 | 4 | 1772 |
| D — Stabilization confirmation: D_upClose_rebound | $191,529 | $84,323 | $30,522 | 41 | 46% (18/39) | 0/3 | 1 | 1931 |
| E — Adaptive threshold: E_ret5_15_stab | $178,274 | $74,951 | $27,280 | 31 | 58% (18/31) | 0/3 | 4 | 1713 |
| F — Simple combination: F_accel_3+upClose | $189,158 | $76,668 | $30,198 | 35 | 54% (19/35) | 0/3 | 5 | 1753 |
