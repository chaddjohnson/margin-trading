| Approach | Net P&L | Margin interest | Max MTM drawdown | Trades | Severe-entry rate | Severe episodes avoided | Profitable entries missed | Exposure days |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Original | $130,265 | $36,888 | $25,780 | 14 | 21% (3/14) | 0/1 | 0 | 840 |
| B — Velocity gate: B_skipSlow_60 | $67,656 | $28,389 | $25,780 | 12 | 25% (3/12) | 0/1 | 2 | 646 |
| C — Deterioration gate: C_gate_accel_3 | $100,609 | $25,797 | $18,747 | 8 | 25% (2/8) | 0/1 | 2 | 590 |
| D — Stabilization confirmation: D_upClose_rebound | $91,858 | $28,329 | $21,054 | 13 | 18% (2/11) | 0/1 | 1 | 643 |
| E — Adaptive threshold: E_ret5_15_stab | $109,071 | $31,071 | $25,780 | 11 | 27% (3/11) | 0/1 | 2 | 705 |
| F — Simple combination: F_accel_3+upClose | $75,747 | $21,518 | $19,631 | 9 | 22% (2/9) | 0/1 | 3 | 492 |
