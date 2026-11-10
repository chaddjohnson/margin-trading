# Development diagnostics (D24, 2016–2024; report-only)

| Subject | Roles | Net (realized / open) | Lots (W/L, partials) | Episodes (win/lose) | Exposure | Holding mean / median / max days | Under water (longest) | Interest / costs | Largest win / worst loss |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| indep-rise#1 profit | PRIMARY (actual-profit), independent actual-profit | $139,668.45 ($139,668.45 / $0.00) | 11 (9/2, 9) | 7 (5/2) | 16.6% | 48 / 41 / 99 | 51.2% (575 sessions) | $10,981.32 / $1,175.36 | $42,609.33 / −$2,655.21 |
| informed#2 robust | robust-profit, informed robust-profit | $110,158.59 ($110,158.59 / $0.00) | 16 (12/4, 0) | 10 (7/3) | 8.5% | 16.3 / 14 / 50 | 52.1% (606 sessions) | $7,865.75 / $1,659.04 | $42,418.79 / −$2,297.61 |
| P08 3C G robust-profit | balanced, informed balanced, controls robust-profit, controls balanced | $121,008.75 ($121,008.75 / $0.00) | 11 (9/2, 0) | 9 (7/2) | 6.1% | 17 / 14 / 48 | 51.7% (589 sessions) | $5,635.62 / $1,163.35 | $42,872.54 / −$1,233.53 |
| P09 3C G lower-drawdown | lower-drawdown, informed lower-drawdown, controls lower-drawdown | $100,056.17 ($100,056.17 / $0.00) | 15 (9/6, 0) | 7 (4/3) | 6.5% | 12.9 / 7 / 50 | 57.3% (522 sessions) | $5,846.58 / $1,552.98 | $42,721.29 / −$2,604.56 |
| indep-rise#2 robust | independent robust-profit | $123,836.44 ($123,836.44 / $0.00) | 7 (5/2, 6) | 3 (2/1) | 12.4% | 56.3 / 60 / 98 | 51.3% (569 sessions) | $8,758.11 / $766.33 | $68,489.25 / −$7,873.41 |
| indep-rise#3 balanced | independent balanced, independent lower-drawdown | $92,656.70 ($92,656.70 / $0.00) | 7 (5/2, 0) | 5 (3/2) | 3.0% | 12.7 / 9 / 42 | 52.5% (613 sessions) | $2,682.19 / $747.69 | $40,906.27 / −$4,682.56 |
| informed#1 profit | informed actual-profit | $137,675.75 ($137,675.75 / $0.00) | 17 (14/3, 0) | 13 (10/3) | 9.4% | 17 / 14 / 48 | 51.3% (478 sessions) | $8,709.59 / $1,773.23 | $42,872.54 / −$3,730.95 |
| P07 3C G actual-profit | controls actual-profit | $126,406.73 ($126,406.73 / $0.00) | 12 (10/2, 0) | 9 (7/2) | 6.1% | 15.8 / 11 / 48 | 51.5% (574 sessions) | $5,726.03 / $1,266.10 | $42,872.54 / −$6,521.42 |
| Appendix A | Appendix A (exact control) | $53,816.50 ($53,816.50 / $0.00) | 13 (11/2, 0) | 9 (7/2) | 15.3% | 37.2 / 28 / 163 | 95.8% (997 sessions) | $14,586.30 / $1,334.22 | $16,899.85 / −$7,394.32 |

## Largest winning episode and its causal no-new-funding rerun

| Subject | Episode | Episode net (share) | Second episode | Rerun without new funding: net / DD / lots | Causal contribution | Arithmetic net − episode |
|---|---:|---:|---:|---:|---:|---:|
| indep-rise#1 profit | decisions 2020-03-13, entries 2020-03-16 → 2020-08-26 (3 lots) | $93,560.96 (67.0%) | $44,877.25 | $46,107.49 / $17,097.20 / 8 | $93,560.96 | $46,107.49 |
| informed#2 robust | decisions 2020-03-02, entries 2020-03-03 → 2020-04-15 (5 lots) | $74,063.18 (67.2%) | $21,349.57 | $36,095.41 / $13,793.68 / 11 | $74,063.18 | $36,095.41 |
| P08 3C G robust-profit | decisions 2020-03-13, entries 2020-03-16 → 2020-04-15 (3 lots) | $72,083.24 (59.6%) | $22,122.69 | $48,925.51 / $13,234.39 / 8 | $72,083.24 | $48,925.51 |
| P09 3C G lower-drawdown | decisions 2020-03-02, entries 2020-03-03 → 2020-03-20 (4 lots) | $59,365.26 (59.3%) | $24,454.87 | $40,690.91 / $14,295.91 / 11 | $59,365.26 | $40,690.91 |
| indep-rise#2 robust | decisions 2020-03-13, entries 2020-03-16 → 2020-09-24 (3 lots) | $85,656.02 (69.2%) | $46,053.84 | $38,180.42 / $18,150.42 / 4 | $85,656.02 | $38,180.42 |
| indep-rise#3 balanced | decisions 2020-03-13, entries 2020-03-16 → 2020-04-15 (3 lots) | $75,817.04 (81.8%) | $22,965.09 | $16,839.65 / $12,490.95 / 4 | $75,817.05 | $16,839.66 |
| informed#1 profit | decisions 2020-03-13, entries 2020-03-16 → 2020-04-15 (3 lots) | $71,756.49 (52.1%) | $21,720.76 | $65,919.25 / $15,065.11 / 14 | $71,756.50 | $65,919.26 |
| P07 3C G actual-profit | decisions 2020-03-13, entries 2020-03-16 → 2020-04-15 (3 lots) | $74,624.62 (59.0%) | $22,685.29 | $51,782.11 / $14,762.11 / 9 | $74,624.62 | $51,782.11 |
| Appendix A | decisions 2020-06-24, entries 2020-06-24 → 2020-07-30 (1 lots) | $16,899.85 (31.4%) | $12,314.68 | $36,916.65 / $17,430.56 / 12 | $16,899.85 | $36,916.65 |

## Maximum minute drawdown (development) and the positions responsible

| Subject | DD (%) | Peak | Trough | Recovery | Positions open peak → trough |
|---|---:|---:|---:|---:|---:|
| indep-rise#1 profit | $17,483.62 (17.5%) | 2020-07-27 14:46Z | 2020-09-24 13:39Z | 2022-11-08 15:08Z | #3 2020-06-15 → 2020-08-26 $28,171.64; #4 2020-09-21 → 2020-10-20 −$1,854.88 |
| informed#2 robust | $18,840.58 (18.8%) | 2020-03-19 19:26Z | 2020-03-31 19:59Z | 2020-04-09 13:48Z | #4 2020-03-19 → 2020-03-20 $12,015.59; #5 2020-03-27 → 2020-04-15 $17,195.10 |
| P08 3C G robust-profit | $18,840.58 (18.8%) | 2020-03-19 19:26Z | 2020-03-31 19:59Z | 2020-04-09 13:48Z | #2 2020-03-19 → 2020-03-20 $12,015.59; #3 2020-03-27 → 2020-04-15 $17,195.10 |
| P09 3C G lower-drawdown | $17,744.39 (17.7%) | 2020-03-19 19:26Z | 2020-03-19 20:00Z | 2022-02-14 14:34Z | #9 2020-03-19 → 2020-03-20 $13,898.00 |
| indep-rise#2 robust | $22,981.65 (23.0%) | 2020-03-17 15:14Z | 2020-03-19 13:41Z | 2020-03-25 17:23Z | #1 2020-03-16 → 2020-06-09 $68,489.25 |
| indep-rise#3 balanced | $17,744.39 (17.7%) | 2020-03-19 19:26Z | 2020-03-19 20:00Z | 2020-04-09 13:30Z | #2 2020-03-19 → 2020-03-20 $13,898.00 |
| informed#1 profit | $19,094.64 (19.1%) | 2020-03-19 19:26Z | 2020-03-31 19:59Z | 2020-04-09 13:48Z | #2 2020-03-19 → 2020-03-20 $12,015.59; #3 2020-03-27 → 2020-04-15 $16,868.36 |
| P07 3C G actual-profit | $18,500.58 (18.5%) | 2020-03-19 19:26Z | 2020-03-31 19:59Z | 2020-04-09 13:47Z | #2 2020-03-19 → 2020-03-20 $13,898.00; #3 2020-03-27 → 2020-04-15 $17,854.08 |
| Appendix A | $17,709.96 (17.7%) | 2020-07-27 14:46Z | 2024-06-26 13:33Z | 2024-08-20 13:30Z | #9 2020-06-24 → 2020-07-30 $16,899.85; #10 2023-04-06 → 2023-05-18 −$7,394.32; #11 2024-06-21 → 2024-07-25 $6,004.78 |

## By development subperiod

| Subject | 2016–2019 | 2020–2021 | 2022–2023 | 2024 |
|---|---:|---:|---:|---:|
| indep-rise#1 profit | $0.00 | $91,706.09 | $55,239.25 | −$7,276.89 |
| informed#2 robust | $0.00 | $74,422.53 | $35,736.06 | $0.00 |
| P08 3C G robust-profit | $0.00 | $73,431.00 | $47,577.75 | $0.00 |
| P09 3C G lower-drawdown | $4,135.90 | $58,160.37 | $13,305.02 | $24,454.87 |
| indep-rise#2 robust | $0.00 | $85,656.02 | $38,180.43 | $0.00 |
| indep-rise#3 balanced | $0.00 | $71,134.48 | $21,522.21 | $0.00 |
| informed#1 profit | $0.00 | $94,591.58 | $43,084.16 | $0.00 |
| P07 3C G actual-profit | $0.00 | $76,780.63 | $49,626.10 | $0.00 |
| Appendix A | $31,046.72 | $16,718.19 | −$7,394.32 | $13,445.91 |

## Decision funnel (Growth·GDX; standalone: no capital competitor)

| Subject | Crossings (episodes) | Dispositions | Eligibility invalidated by | Decisions | Virtual invested / flat sessions | Events |
|---|---:|---:|---:|---:|---:|---:|
| indep-rise#1 profit | 76 (35) | invalidated: strength_below_minimum 67; taken 2; rejected: position_open 7 | strength_below_minimum 67 | 11 | 364 / 1898 | base_signal 76; opportunity_armed 69; opportunity_invalidated 67; opportunity_decision 2; opportunity_consumed 2; fill 11; initial_stop_set 11; partial_exit 9; trend_count 66; trend_exit_decision 7; exit 11; episode_opened 9; setup_armed 9; window_closed 9; continuation_signal 9; episode_closed 9 |
| informed#2 robust | 47 (21) | invalidated: strength_below_minimum 41; taken 5; rejected: position_open 1 | strength_below_minimum 41 | 16 | 176 / 2083 | base_signal 47; opportunity_armed 46; opportunity_invalidated 41; opportunity_decision 5; opportunity_consumed 5; fill 16; initial_stop_set 16; exit 16; episode_opened 12; setup_armed 11; window_closed 11; continuation_signal 11; episode_closed 12 |
| P08 3C G robust-profit | 47 (21) | invalidated: strength_below_minimum 45; taken 2 | strength_below_minimum 45 | 11 | 127 / 2135 | base_signal 47; opportunity_armed 47; opportunity_invalidated 45; opportunity_decision 2; opportunity_consumed 2; fill 11; initial_stop_set 11; exit 11; episode_opened 9; setup_armed 9; window_closed 9; continuation_signal 9; episode_closed 9 |
| P09 3C G lower-drawdown | 46 (20) | deferred: trend_veto 29; taken 12; rejected: position_open 5 | predicate_false 21 | 15 | 131 / 2121 | base_signal 46; opportunity_armed 41; opportunity_blocked 29; opportunity_invalidated 21; renewal_watch 29; renewal_watch_ended 29; renewal_reset 7; opportunity_expired 8; opportunity_decision 12; opportunity_consumed 12; fill 15; initial_stop_set 15; exit 15; episode_opened 9; setup_armed 4; window_closed 4; continuation_signal 4; episode_closed 9 |
| indep-rise#2 robust | 76 (35) | invalidated: strength_below_minimum 72; taken 2; rejected: position_open 2 | strength_below_minimum 72 | 7 | 273 / 1989 | base_signal 76; opportunity_armed 74; opportunity_invalidated 72; opportunity_decision 2; opportunity_consumed 2; fill 7; initial_stop_set 7; partial_exit 6; trend_count 64; trend_exit_decision 5; exit 7; episode_opened 5; setup_armed 5; window_closed 5; continuation_signal 5; episode_closed 5 |
| indep-rise#3 balanced | 46 (22) | invalidated: strength_below_minimum 44; taken 2 | strength_below_minimum 44 | 7 | 61 / 2201 | base_signal 46; opportunity_armed 46; opportunity_invalidated 44; opportunity_decision 2; opportunity_consumed 2; fill 7; initial_stop_set 7; exit 7; episode_opened 5; setup_armed 5; window_closed 5; continuation_signal 5; episode_closed 5 |
| informed#1 profit | 42 (21) | invalidated: strength_below_minimum 39; taken 3 | strength_below_minimum 39 | 17 | 196 / 2065 | base_signal 42; opportunity_armed 42; opportunity_invalidated 39; opportunity_decision 3; opportunity_consumed 3; fill 17; initial_stop_set 17; exit 17; episode_opened 14; setup_armed 14; window_closed 14; continuation_signal 14; episode_closed 14 |
| P07 3C G actual-profit | 60 (32) | invalidated: strength_below_minimum 56; taken 2; rejected: position_open 2 | strength_below_minimum 56 | 12 | 127 / 2135 | base_signal 60; opportunity_armed 58; opportunity_invalidated 56; opportunity_decision 2; opportunity_consumed 2; fill 12; exit 12; episode_opened 10; setup_armed 10; window_closed 10; continuation_signal 10; episode_closed 10 |
| Appendix A | 122 (56) | deferred: drawdown_gate 26; deferred: trend_veto 82; rejected: position_open 13; taken 1 | predicate_false 78 | 13 | 334 / 1923 | base_signal 122; opportunity_armed 109; opportunity_blocked 190; opportunity_decision 9; opportunity_consumed 9; fill 13; initial_stop_set 13; exit 13; episode_opened 11; setup_armed 10; continuation_signal 7; episode_closed 11; opportunity_invalidated 78; opportunity_expired 22 |

## Episodes (every independent market episode of each subject)

- **indep-rise#1 profit**: 2020-03-16→2020-08-26 $93,560.96 (3); 2020-09-21→2020-10-20 −$1,854.88 (1); 2022-09-29→2022-10-17 $1,629.52 (1); 2022-11-03→2023-05-18 $44,877.25 (2); 2023-06-22→2023-08-02 $1,240.65 (1); 2023-09-27→2023-11-09 $658.19 (1); 2023-12-13→2024-02-20 −$443.24 (2)
- **informed#2 robust**: 2020-03-03→2020-04-15 $74,063.18 (5); 2020-05-01→2020-06-10 $960.87 (2); 2021-02-02→2021-02-16 −$2,297.61 (1); 2021-12-17→2022-01-03 −$325.48 (1); 2022-09-29→2022-11-02 $6,881.96 (2); 2022-12-20→2023-02-03 $6,597.52 (1); 2023-02-28→2023-04-19 $21,349.57 (1); 2023-05-31→2023-06-14 $23.16 (1); 2023-06-30→2023-07-24 $3,285.94 (1); 2023-08-23→2023-09-06 −$380.52 (1)
- **P08 3C G robust-profit**: 2020-03-16→2020-04-15 $72,083.24 (3); 2020-05-01→2020-05-11 $2,581.29 (1); 2020-05-27→2020-06-10 −$1,233.53 (1); 2022-09-29→2022-10-07 $5,187.85 (1); 2022-11-04→2022-11-17 $11,628.80 (1); 2022-12-20→2023-02-02 $8,995.77 (1); 2023-02-28→2023-04-17 $22,122.69 (1); 2023-05-31→2023-06-14 $23.16 (1); 2023-08-23→2023-09-06 −$380.52 (1)
- **P09 3C G lower-drawdown**: 2017-12-11→2018-03-29 $6,740.46 (4); 2018-07-25→2018-07-31 −$2,604.56 (1); 2020-03-03→2020-03-20 $59,365.26 (4); 2021-12-17→2021-12-23 −$1,204.89 (1); 2022-01-10→2022-02-25 $13,849.81 (2); 2022-06-16→2022-06-23 −$544.79 (1); 2024-02-16→2024-04-15 $24,454.87 (2)
- **indep-rise#2 robust**: 2020-03-16→2020-09-24 $85,656.02 (3); 2022-09-29→2023-04-28 $46,053.84 (3); 2023-05-16→2023-06-15 −$7,873.41 (1)
- **indep-rise#3 balanced**: 2020-03-16→2020-04-15 $75,817.04 (3); 2020-05-27→2020-06-05 −$4,682.56 (1); 2022-09-29→2022-10-10 $2,132.27 (1); 2022-11-03→2022-12-15 $22,965.09 (1); 2023-02-10→2023-02-15 −$3,575.15 (1)
- **informed#1 profit**: 2020-03-16→2020-04-15 $71,756.49 (3); 2020-05-01→2020-05-11 $2,345.36 (1); 2020-05-28→2020-07-13 $13,933.13 (2); 2020-08-12→2020-08-19 $2,588.27 (1); 2020-09-24→2020-11-09 $5,469.19 (2); 2020-11-30→2020-12-14 $534.01 (1); 2021-01-20→2021-02-03 −$3,730.95 (1); 2021-12-17→2022-01-03 −$325.48 (1); 2022-09-29→2022-10-07 $5,187.85 (1); 2022-11-04→2022-11-17 $11,628.80 (1); 2022-12-20→2023-02-02 $8,591.24 (1); 2023-02-28→2023-04-17 $21,720.76 (1); 2023-06-01→2023-06-15 −$2,022.92 (1)
- **P07 3C G actual-profit**: 2020-03-16→2020-04-15 $74,624.62 (3); 2020-05-01→2020-05-11 $3,151.98 (1); 2020-05-27→2020-06-03 −$995.97 (1); 2022-08-05→2022-08-17 $517.69 (1); 2022-09-02→2022-10-07 $11,756.42 (2); 2022-11-04→2022-11-17 $11,628.80 (1); 2022-12-20→2023-02-02 $9,559.33 (1); 2023-02-28→2023-04-17 $22,685.29 (1); 2023-05-19→2023-05-30 −$6,521.42 (1)
- **Appendix A**: 2016-04-08→2016-05-04 $12,187.52 (1); 2016-06-07→2016-07-20 $12,314.68 (1); 2019-06-24→2019-07-31 $3,047.88 (1); 2019-08-21→2020-03-10 −$4,083.64 (3); 2020-04-13→2020-05-21 $7,398.62 (2); 2020-06-24→2020-07-30 $16,899.85 (1); 2023-04-06→2023-05-18 −$7,394.32 (1); 2024-06-21→2024-07-25 $6,004.78 (1); 2024-08-09→2024-10-07 $7,441.13 (2)
