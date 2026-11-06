# Paired diagnostic: Drawdown Recovery Gate ON vs OFF (everything else identical) (rise-from-recent-low-trading@1.4.0)

> RETROSPECTIVE DIAGNOSTIC of one configuration on one historical window: two runs on identical data and costs, the only difference being the option under study (named in the report). Path dependence: one blocked or added entry changes every later decision, so differences are not attributable trade by trade. Not an optimisation, not a selection, not evidence of an edge or of safer trading.

Window 2016-01-04 → 2023-12-29 (training), resolution 1d, symbols VGT, GDX, XBI.

## VGT

Same raw signals in both runs: yes. Entries: 7 common, 1 only ON, 13 only OFF.

| | OFF | ON | ON − OFF |
| --- | ---: | ---: | ---: |
| rawSignals | 69 | 69 | 0 |
| taken | 20 | 8 | -12 |
| ignoredWhileInvestedOrPending | 15 | 9 | -6 |
| vetoed | 34 | 52 | 18 |
| deferred | 0 | 0 | 0 |
| tradesClosed | 20 | 8 | -12 |
| tradesOpen | 0 | 0 | 0 |
| wins | 11 | 4 | -7 |
| losses | 9 | 4 | -5 |
| realizedNetUsd | $43,706.79 | $20,955.65 | −$22,751.14 |
| markedNetUsd | $43,706.79 | $20,955.65 | −$22,751.14 |
| interestUsd | $27,997.26 | $13,380.82 | −$14,616.44 |
| costsUsd | $2,035.87 | $817.18 | −$1,218.69 |
| maxMinuteDrawdownUsd | $13,797.57 | $10,254.55 | −$3,543.02 |
| maxDailyDrawdownUsd | $12,249.57 | $8,504.46 | −$3,745.11 |
| sessionsInvestedPercent | 32.95 | 15.56 | -17.4 |
| calendarTimeInvestedPercent | 31.89 | 15.25 | -16.65 |

Drawdown Recovery Gate (ON run; N 30, d 5%, r 70%, Y 2): 23 episode(s), 23 resolved (8 by regaining the peak before a confirmation), deepest 37.39%; 28 confirmation(s), 425 reset(s) before confirming, 13 lost; 36 release(s); 51 blocked decision(s) {"base_signal":51}; 0 latched decision(s) taken at a release; state at the end: normal.

Entries only OFF (decision → entry, source, net): 2016-07-11T20:00:00Z → 2016-07-12T13:30:00Z rise_from_recent_low $1,868.21; 2017-06-13T20:00:00Z → 2017-06-14T13:30:00Z rise_from_recent_low −$1,872.48; 2017-07-12T20:00:00Z → 2017-07-13T13:30:00Z rise_from_recent_low −$1,159.34; 2018-02-14T21:00:00Z → 2018-02-15T14:30:00Z rise_from_recent_low −$912.3; 2019-06-07T20:00:00Z → 2019-06-10T13:30:00Z rise_from_recent_low $1,835.49; 2019-09-05T20:00:00Z → 2019-09-06T13:30:00Z rise_from_recent_low −$2,069.28; 2020-09-25T20:00:00Z → 2020-09-28T13:30:00Z rise_from_recent_low $2,814.26; 2020-11-04T21:00:00Z → 2020-11-05T14:30:00Z rise_from_recent_low $4,071.34; 2021-03-01T21:00:00Z → 2021-03-02T14:30:00Z rise_from_recent_low −$3,304.01; 2021-04-01T20:00:00Z → 2021-04-05T13:30:00Z rise_from_recent_low −$30.63; 2021-06-04T20:00:00Z → 2021-06-07T13:30:00Z rise_from_recent_low $4,221.8; 2021-10-19T20:00:00Z → 2021-10-20T13:30:00Z rise_from_recent_low $2,810.21; 2023-04-26T20:00:00Z → 2023-04-27T13:30:00Z rise_from_recent_low $12,925.93.

Entries only ON: 2017-07-19T20:00:00Z → 2017-07-20T13:30:00Z rise_from_recent_low −$1,551.94.

## GDX

Same raw signals in both runs: yes. Entries: 2 common, 0 only ON, 2 only OFF.

| | OFF | ON | ON − OFF |
| --- | ---: | ---: | ---: |
| rawSignals | 83 | 83 | 0 |
| taken | 4 | 2 | -2 |
| ignoredWhileInvestedOrPending | 4 | 3 | -1 |
| vetoed | 75 | 78 | 3 |
| deferred | 0 | 0 | 0 |
| tradesClosed | 4 | 2 | -2 |
| tradesOpen | 0 | 0 | 0 |
| wins | 2 | 2 | 0 |
| losses | 2 | 0 | -2 |
| realizedNetUsd | −$6,197.63 | $6,203.71 | $12,401.34 |
| markedNetUsd | −$6,197.63 | $6,203.71 | $12,401.34 |
| interestUsd | $1,898.63 | $994.52 | −$904.11 |
| costsUsd | $397.85 | $203.6 | −$194.25 |
| maxMinuteDrawdownUsd | $16,963.48 | $6,493.68 | −$10,469.8 |
| maxDailyDrawdownUsd | $14,702.2 | $5,063.8 | −$9,638.4 |
| sessionsInvestedPercent | 2.29 | 1.14 | -1.14 |
| calendarTimeInvestedPercent | 2.16 | 1.13 | -1.03 |

Drawdown Recovery Gate (ON run; N 30, d 5%, r 70%, Y 2): 21 episode(s), 20 resolved (17 by regaining the peak before a confirmation), deepest 52.96%; 10 confirmation(s), 282 reset(s) before confirming, 7 lost; 25 release(s); 77 blocked decision(s) {"base_signal":77}; 0 latched decision(s) taken at a release; state at the end: recovery_required.

Entries only OFF (decision → entry, source, net): 2017-10-11T20:00:00Z → 2017-10-12T13:30:00Z rise_from_recent_low −$6,564.51; 2018-02-14T21:00:00Z → 2018-02-15T14:30:00Z rise_from_recent_low −$5,836.83.

Entries only ON: none.

## XBI

Same raw signals in both runs: yes. Entries: 0 common, 1 only ON, 4 only OFF.

| | OFF | ON | ON − OFF |
| --- | ---: | ---: | ---: |
| rawSignals | 72 | 72 | 0 |
| taken | 4 | 1 | -3 |
| ignoredWhileInvestedOrPending | 2 | 0 | -2 |
| vetoed | 66 | 71 | 5 |
| deferred | 0 | 0 | 0 |
| tradesClosed | 4 | 1 | -3 |
| tradesOpen | 0 | 0 | 0 |
| wins | 2 | 1 | -1 |
| losses | 2 | 0 | -2 |
| realizedNetUsd | $2,382.24 | $7,204.31 | $4,822.07 |
| markedNetUsd | $2,382.24 | $7,204.31 | $4,822.07 |
| interestUsd | $1,838.36 | $391.78 | −$1,446.58 |
| costsUsd | $402.11 | $103.8 | −$298.31 |
| maxMinuteDrawdownUsd | $15,374.15 | $4,375.3 | −$10,998.85 |
| maxDailyDrawdownUsd | $14,741.76 | $3,855.75 | −$10,886.01 |
| sessionsInvestedPercent | 2.24 | 0.5 | -1.74 |
| calendarTimeInvestedPercent | 2.11 | 0.45 | -1.65 |

Drawdown Recovery Gate (ON run; N 30, d 5%, r 70%, Y 2): 17 episode(s), 16 resolved (10 by regaining the peak before a confirmation), deepest 64.44%; 24 confirmation(s), 666 reset(s) before confirming, 18 lost; 34 release(s); 71 blocked decision(s) {"base_signal":71}; 0 latched decision(s) taken at a release; state at the end: recovery_required.

Entries only OFF (decision → entry, source, net): 2017-06-08T20:00:00Z → 2017-06-09T13:30:00Z rise_from_recent_low $7,805; 2018-04-17T20:00:00Z → 2018-04-18T13:30:00Z rise_from_recent_low −$5,074.54; 2018-08-29T20:00:00Z → 2018-08-30T13:30:00Z rise_from_recent_low −$3,708.75; 2023-01-04T21:00:00Z → 2023-01-05T14:30:00Z rise_from_recent_low $3,360.54.

Entries only ON: 2017-06-13T20:00:00Z → 2017-06-14T13:30:00Z rise_from_recent_low $7,204.31.

