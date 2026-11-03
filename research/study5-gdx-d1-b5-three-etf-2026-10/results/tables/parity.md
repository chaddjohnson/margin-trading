| gate | door | config | bps | differences | checks |
|---|---:|---:|---:|---:|---:|
| P1 | search | C5 | 0 | 0 | 79 virtual trades, 40 lots, 79 signals, 1510 daily rows |
| P1 | search | C5 | 5 | 0 | 79 virtual trades, 40 lots, 79 signals, 1510 daily rows |
| P1 | search | C5 | 10 | 0 | 78 virtual trades, 40 lots, 78 signals, 1510 daily rows |
| P1 | search | C3 | 0 | 0 | 56 virtual trades, 39 lots, 56 signals, 1510 daily rows |
| P1 | search | C3 | 5 | 0 | 56 virtual trades, 39 lots, 56 signals, 1510 daily rows |
| P1 | search | C3 | 10 | 0 | 55 virtual trades, 39 lots, 55 signals, 1510 daily rows |
| P1 | search | C2 | 0 | 0 | 50 virtual trades, 18 lots, 50 signals, 1510 daily rows |
| P1 | search | C2 | 5 | 0 | 50 virtual trades, 18 lots, 50 signals, 1510 daily rows |
| P1 | search | C2 | 10 | 0 | 49 virtual trades, 18 lots, 49 signals, 1510 daily rows |
| P1 | search | sobol-1 | 5 | 0 | 54 virtual trades, 40 lots, 54 signals, 1510 daily rows |
| P1 | search | sobol-2 | 5 | 0 | 71 virtual trades, 38 lots, 71 signals, 1510 daily rows |
| P1 | search | sobol-3 | 5 | 0 | 26 virtual trades, 19 lots, 26 signals, 1510 daily rows |
| P1 | search | sobol-4 | 5 | 0 | 52 virtual trades, 23 lots, 52 signals, 1510 daily rows |
| P1 | search | sobol-5 | 5 | 0 | 91 virtual trades, 67 lots, 91 signals, 1510 daily rows |
| P1 | search | sobol-6 | 5 | 0 | 38 virtual trades, 24 lots, 38 signals, 1510 daily rows |
| P1 | search | sobol-7 | 5 | 0 | 75 virtual trades, 33 lots, 75 signals, 1510 daily rows |
| P1 | search | sobol-8 | 5 | 0 | 33 virtual trades, 15 lots, 33 signals, 1510 daily rows |
| P1 | validation | C5 | 0 | 0 | 155 virtual trades, 82 lots, 155 signals, 2011 daily rows |
| P1 | validation | C5 | 5 | 0 | 155 virtual trades, 82 lots, 155 signals, 2011 daily rows |
| P1 | validation | C5 | 10 | 0 | 154 virtual trades, 82 lots, 154 signals, 2011 daily rows |
| P1 | validation | C3 | 0 | 0 | 108 virtual trades, 71 lots, 108 signals, 2011 daily rows |
| P1 | validation | C3 | 5 | 0 | 108 virtual trades, 71 lots, 108 signals, 2011 daily rows |
| P1 | validation | C3 | 10 | 0 | 107 virtual trades, 71 lots, 107 signals, 2011 daily rows |
| P1 | validation | C2 | 0 | 0 | 90 virtual trades, 57 lots, 90 signals, 2011 daily rows |
| P1 | validation | C2 | 5 | 0 | 90 virtual trades, 57 lots, 90 signals, 2011 daily rows |
| P1 | validation | C2 | 10 | 0 | 89 virtual trades, 57 lots, 89 signals, 2011 daily rows |
| P1 | validation | sobol-1 | 5 | 0 | 98 virtual trades, 61 lots, 98 signals, 2011 daily rows |
| P1 | validation | sobol-2 | 5 | 0 | 134 virtual trades, 73 lots, 134 signals, 2011 daily rows |
| P1 | validation | sobol-3 | 5 | 0 | 54 virtual trades, 36 lots, 54 signals, 2011 daily rows |
| P1 | validation | sobol-4 | 5 | 0 | 104 virtual trades, 49 lots, 104 signals, 2011 daily rows |
| P1 | validation | sobol-5 | 5 | 0 | 159 virtual trades, 110 lots, 159 signals, 2011 daily rows |
| P1 | validation | sobol-6 | 5 | 0 | 71 virtual trades, 35 lots, 71 signals, 2011 daily rows |
| P1 | validation | sobol-7 | 5 | 0 | 147 virtual trades, 63 lots, 147 signals, 2011 daily rows |
| P1 | validation | sobol-8 | 5 | 0 | 73 virtual trades, 31 lots, 73 signals, 2011 daily rows |

P2: replay $144,885.01 / minute DD $33,555.21 / daily $31,604.31 vs app runner $144,885.01 / $33,555.21 / $31,604.31 (GDX portfolioAware, training partition, 0 bps).
P4 Track S: selected d1-68ebf55a55 (sealed d1-68ebf55a55), feasible 821 (sealed 821), identical hypervolume trajectory True, identical objectives at 0/2/5/10 bps True.
P4 Track P: selected d1-51ea8d4bd6 (sealed d1-51ea8d4bd6), feasible 1085 (sealed 1085), identical hypervolume trajectory True, identical objectives at 0/2/5/10 bps True.

Passed: {'P1': True, 'P2': True, 'P4': True}
