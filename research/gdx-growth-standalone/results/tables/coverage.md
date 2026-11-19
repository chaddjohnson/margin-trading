# Search coverage, budgets, stopping and compute

Total fresh evaluations (searches and qualifications): 679,478; archive hits 5,878.

## C19 independent (door D19; 5.12 min; 134,519 fresh evaluations, 839 archive hits, 3,196.1 worker-s; peak cgroup 5.87 GiB)

| Lane | Screened (unique) | Promoted | Seeds / designs | Island proposals | Refinement moves | Distinct centres | Rung-1 measured | Rung-1 feasible | Ledgers (feasible) | Cash-equivalent | Rung 2 / 3 feasible | Islands | Stop | Last trigger reading |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| indep-rise | 4,096 (4,096) | 256 | — | 6,144 | 202 | 6,598 | 3,564 | 3,085 | 3,786 (2,225) | 1,605 | 24 / 10 | 6 | triggers not met | island 5: best centre net +$0, best robust +$0, hypervolume 0.07%, new competitive feasible strata 0 |
| indep-breakout | 4,096 (4,096) | 256 | — | 4,096 | 134 | 4,486 | 3,014 | 2,904 | 3,258 (2,228) | 168 | 24 / 8 | 4 | triggers not met | island 3: best centre net +$0, best robust +$0, hypervolume 0.49%, new competitive feasible strata 0 |

Fresh evaluations by kind: baseline 1 (+1 hits); screen 8,192 (+0 hits); r1:centre 10,240 (+512 hits); r1:neighbours 105,167 (+81 hits); r2:centre 0 (+48 hits); r2:neighbours 3,072 (+0 hits); r3:centre 0 (+18 hits); r3:neighbours 2,304 (+0 hits); refine:centre 332 (+8 hits); refine:neighbours 5,211 (+171 hits)

Island stops: indep-rise: #0 budget (1024 new, 16 gen, HV gain/10k 235316586.5), #1 budget (1024 new, 16 gen, HV gain/10k 17724649.01), #2 budget (1024 new, 16 gen, HV gain/10k 16539787.25), #3 budget (1024 new, 16 gen, HV gain/10k 34441032.72), #4 budget (1024 new, 16 gen, HV gain/10k 24155864.6), #5 budget (1024 new, 16 gen, HV gain/10k 494966.69); indep-breakout: #0 budget (1024 new, 16 gen, HV gain/10k 159490241.02), #1 budget (1024 new, 16 gen, HV gain/10k 681322.46), #2 budget (1024 new, 16 gen, HV gain/10k 2204946.31), #3 budget (1024 new, 16 gen, HV gain/10k 2296816.92)

Coverage by protected stratum (rung-1 archive):

| Lane | Stratum | Screened | Plausible | Promoted | Measured | Feasible |
|---|---:|---:|---:|---:|---:|---:|
| indep-rise | rise · gate off · trend off · elig off · hold off · istop off · retain off | 64 | 6 | 3 | 26 | 5 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop off · retain on | 64 | 10 | 7 | 49 | 18 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop on · retain off | 64 | 17 | 6 | 100 | 77 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop on · retain on | 64 | 14 | 9 | 70 | 54 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop off · retain off | 64 | 23 | 7 | 77 | 67 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop off · retain on | 64 | 22 | 8 | 70 | 59 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop on · retain off | 64 | 24 | 4 | 123 | 114 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop on · retain on | 64 | 21 | 7 | 85 | 73 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop off · retain off | 64 | 10 | 6 | 56 | 14 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop off · retain on | 64 | 8 | 4 | 31 | 14 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop on · retain off | 64 | 19 | 8 | 144 | 119 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop on · retain on | 64 | 12 | 1 | 90 | 66 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop off · retain off | 64 | 23 | 5 | 101 | 79 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop off · retain on | 64 | 20 | 3 | 90 | 69 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop on · retain off | 64 | 21 | 5 | 225 | 206 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop on · retain on | 64 | 22 | 8 | 156 | 135 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop off · retain off | 64 | 16 | 5 | 51 | 33 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop off · retain on | 64 | 15 | 8 | 42 | 30 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop on · retain off | 64 | 18 | 5 | 100 | 98 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop on · retain on | 64 | 17 | 6 | 43 | 41 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop off · retain off | 64 | 14 | 5 | 41 | 41 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop off · retain on | 64 | 12 | 1 | 34 | 32 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop on · retain off | 64 | 11 | 3 | 56 | 55 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop on · retain on | 64 | 13 | 2 | 44 | 44 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop off · retain off | 64 | 12 | 6 | 82 | 48 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop off · retain on | 64 | 9 | 4 | 29 | 16 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop on · retain off | 64 | 11 | 1 | 89 | 84 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop on · retain on | 64 | 22 | 5 | 59 | 48 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop off · retain off | 64 | 21 | 7 | 103 | 98 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop off · retain on | 64 | 21 | 4 | 63 | 60 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop on · retain off | 64 | 20 | 4 | 115 | 113 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop on · retain on | 64 | 17 | 2 | 99 | 95 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop off · retain off | 64 | 11 | 5 | 39 | 32 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop off · retain on | 64 | 12 | 2 | 31 | 26 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop on · retain off | 64 | 5 | 3 | 45 | 45 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop on · retain on | 64 | 15 | 4 | 33 | 33 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop off · retain off | 64 | 7 | 4 | 43 | 43 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop off · retain on | 64 | 6 | 1 | 40 | 40 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop on · retain off | 64 | 6 | 2 | 51 | 51 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop on · retain on | 64 | 4 | 6 | 44 | 44 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop off · retain off | 64 | 10 | 4 | 34 | 29 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop off · retain on | 64 | 12 | 0 | 27 | 22 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop on · retain off | 64 | 15 | 3 | 44 | 44 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop on · retain on | 64 | 11 | 2 | 41 | 41 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop off · retain off | 64 | 5 | 2 | 40 | 40 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop off · retain on | 64 | 13 | 1 | 44 | 44 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop on · retain off | 64 | 9 | 3 | 58 | 57 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop on · retain on | 64 | 9 | 4 | 48 | 48 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop off · retain off | 64 | 5 | 1 | 28 | 24 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop off · retain on | 64 | 6 | 2 | 20 | 18 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop on · retain off | 64 | 2 | 1 | 26 | 26 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop on · retain on | 64 | 6 | 4 | 15 | 15 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop off · retain off | 64 | 5 | 6 | 18 | 18 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop off · retain on | 64 | 4 | 3 | 18 | 18 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop on · retain off | 64 | 7 | 4 | 18 | 18 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop on · retain on | 64 | 3 | 6 | 14 | 14 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop off · retain off | 64 | 9 | 5 | 30 | 20 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop off · retain on | 64 | 7 | 1 | 22 | 20 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop on · retain off | 64 | 11 | 4 | 19 | 19 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop on · retain on | 64 | 8 | 2 | 24 | 24 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop off · retain off | 64 | 8 | 3 | 30 | 30 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop off · retain on | 64 | 8 | 2 | 20 | 20 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop on · retain off | 64 | 6 | 3 | 32 | 32 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop on · retain on | 64 | 3 | 4 | 25 | 25 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop off · retain off | 128 | 12 | 7 | 5 | 1 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop off · retain on | 128 | 15 | 10 | 14 | 2 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop on · retain off | 128 | 50 | 10 | 59 | 56 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop on · retain on | 128 | 52 | 10 | 101 | 98 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop off · retain off | 128 | 36 | 14 | 96 | 95 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop off · retain on | 128 | 55 | 17 | 158 | 157 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop on · retain off | 128 | 46 | 9 | 149 | 144 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop on · retain on | 128 | 67 | 14 | 345 | 341 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop off · retain off | 128 | 18 | 8 | 31 | 10 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop off · retain on | 128 | 26 | 9 | 66 | 27 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop on · retain off | 128 | 42 | 8 | 125 | 124 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop on · retain on | 128 | 53 | 15 | 235 | 232 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop off · retain off | 128 | 36 | 7 | 136 | 136 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop off · retain on | 128 | 37 | 9 | 277 | 277 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop on · retain off | 128 | 32 | 8 | 300 | 299 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop on · retain on | 128 | 43 | 15 | 637 | 637 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop off · retain off | 128 | 13 | 2 | 3 | 0 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop off · retain on | 128 | 27 | 5 | 8 | 6 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop on · retain off | 128 | 11 | 9 | 11 | 11 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop on · retain on | 128 | 21 | 6 | 31 | 31 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop off · retain off | 128 | 10 | 4 | 3 | 3 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop off · retain on | 128 | 21 | 7 | 16 | 16 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop on · retain off | 128 | 7 | 1 | 13 | 13 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop on · retain on | 128 | 15 | 10 | 34 | 33 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop off · retain off | 128 | 29 | 6 | 10 | 7 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop off · retain on | 128 | 25 | 6 | 14 | 11 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop on · retain off | 128 | 25 | 5 | 17 | 17 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop on · retain on | 128 | 31 | 4 | 41 | 41 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop off · retain off | 128 | 10 | 5 | 12 | 12 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop off · retain on | 128 | 12 | 5 | 16 | 16 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop on · retain off | 128 | 14 | 7 | 15 | 15 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop on · retain on | 128 | 17 | 4 | 36 | 36 |

By proposal origin:

| Lane | Origin | Centres | Plausible | Feasible |
|---|---:|---:|---:|---:|
| indep-rise | screen | 256 | 147 | 91 |
| indep-rise | island | 6144 | 3417 | 2994 |
| indep-breakout | screen | 256 | 150 | 126 |
| indep-breakout | island | 4096 | 2864 | 2778 |
## C21 independent (door D21; 7.63 min; 119,128 fresh evaluations, 879 archive hits, 5,088.7 worker-s; peak cgroup 6.84 GiB)

| Lane | Screened (unique) | Promoted | Seeds / designs | Island proposals | Refinement moves | Distinct centres | Rung-1 measured | Rung-1 feasible | Ledgers (feasible) | Cash-equivalent | Rung 2 / 3 feasible | Islands | Stop | Last trigger reading |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| indep-rise | 4,096 (4,096) | 256 | — | 4,096 | 170 | 4,518 | 2,352 | 1,952 | 2,900 (1,543) | 975 | 23 / 10 | 4 | triggers not met | island 3: best centre net +$0, best robust +$0, hypervolume 0.58%, new competitive feasible strata 0 |
| indep-breakout | 4,096 (4,096) | 256 | — | 5,120 | 187 | 5,559 | 3,296 | 2,970 | 3,798 (1,674) | 5 | 23 / 10 | 5 | triggers not met | island 4: best centre net +$0, best robust +$0, hypervolume 0.00%, new competitive feasible strata 0 |

Fresh evaluations by kind: baseline 1 (+1 hits); screen 8,192 (+0 hits); r1:centre 9,216 (+512 hits); r1:neighbours 90,243 (+125 hits); r2:centre 0 (+48 hits); r2:neighbours 3,072 (+0 hits); r3:centre 0 (+20 hits); r3:neighbours 2,560 (+0 hits); refine:centre 349 (+12 hits); refine:neighbours 5,495 (+161 hits)

Island stops: indep-rise: #0 budget (1024 new, 16 gen, HV gain/10k 885914025.06), #1 budget (1024 new, 16 gen, HV gain/10k 154508666.38), #2 budget (1024 new, 16 gen, HV gain/10k 46209898.28), #3 budget (1024 new, 16 gen, HV gain/10k 10250486.61); indep-breakout: #0 budget (1024 new, 16 gen, HV gain/10k 113012067.49), #1 budget (1024 new, 16 gen, HV gain/10k 14240051.85), #2 budget (1024 new, 16 gen, HV gain/10k 27108831.89), #3 budget (1024 new, 16 gen, HV gain/10k 117657686.04), #4 budget (1024 new, 16 gen, HV gain/10k 0)

Coverage by protected stratum (rung-1 archive):

| Lane | Stratum | Screened | Plausible | Promoted | Measured | Feasible |
|---|---:|---:|---:|---:|---:|---:|
| indep-rise | rise · gate off · trend off · elig off · hold off · istop off · retain off | 64 | 5 | 2 | 5 | 3 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop off · retain on | 64 | 4 | 4 | 1 | 0 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop on · retain off | 64 | 5 | 0 | 37 | 27 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop on · retain on | 64 | 6 | 8 | 12 | 2 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop off · retain off | 64 | 18 | 7 | 40 | 21 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop off · retain on | 64 | 9 | 4 | 19 | 6 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop on · retain off | 64 | 23 | 8 | 94 | 74 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop on · retain on | 64 | 16 | 9 | 46 | 31 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop off · retain off | 64 | 5 | 3 | 31 | 15 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop off · retain on | 64 | 5 | 4 | 5 | 1 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop on · retain off | 64 | 12 | 5 | 72 | 53 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop on · retain on | 64 | 11 | 1 | 36 | 16 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop off · retain off | 64 | 20 | 9 | 113 | 82 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop off · retain on | 64 | 11 | 5 | 41 | 27 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop on · retain off | 64 | 24 | 9 | 290 | 248 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop on · retain on | 64 | 19 | 8 | 136 | 96 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop off · retain off | 64 | 11 | 5 | 12 | 6 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop off · retain on | 64 | 6 | 3 | 5 | 4 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop on · retain off | 64 | 16 | 6 | 29 | 27 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop on · retain on | 64 | 5 | 2 | 9 | 9 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop off · retain off | 64 | 12 | 7 | 33 | 25 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop off · retain on | 64 | 8 | 2 | 18 | 14 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop on · retain off | 64 | 11 | 6 | 94 | 92 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop on · retain on | 64 | 11 | 5 | 32 | 28 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop off · retain off | 64 | 8 | 4 | 30 | 20 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop off · retain on | 64 | 4 | 0 | 11 | 6 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop on · retain off | 64 | 11 | 3 | 101 | 97 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop on · retain on | 64 | 6 | 4 | 24 | 23 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop off · retain off | 64 | 10 | 2 | 71 | 63 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop off · retain on | 64 | 4 | 1 | 24 | 23 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop on · retain off | 64 | 10 | 2 | 231 | 225 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop on · retain on | 64 | 12 | 5 | 88 | 79 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop off · retain off | 64 | 5 | 6 | 12 | 9 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop off · retain on | 64 | 2 | 4 | 0 | 0 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop on · retain off | 64 | 6 | 2 | 12 | 12 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop on · retain on | 64 | 5 | 1 | 7 | 7 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop off · retain off | 64 | 2 | 2 | 7 | 5 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop off · retain on | 64 | 1 | 2 | 3 | 3 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop on · retain off | 64 | 1 | 3 | 14 | 14 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop on · retain on | 64 | 2 | 1 | 1 | 1 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop off · retain off | 64 | 11 | 7 | 28 | 18 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop off · retain on | 64 | 9 | 8 | 9 | 5 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop on · retain off | 64 | 11 | 3 | 55 | 55 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop on · retain on | 64 | 11 | 2 | 15 | 15 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop off · retain off | 64 | 9 | 4 | 29 | 25 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop off · retain on | 64 | 11 | 4 | 16 | 12 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop on · retain off | 64 | 12 | 6 | 82 | 80 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop on · retain on | 64 | 9 | 2 | 29 | 27 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop off · retain off | 64 | 2 | 2 | 4 | 2 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop off · retain on | 64 | 2 | 1 | 1 | 0 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop on · retain off | 64 | 2 | 0 | 20 | 20 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop on · retain on | 64 | 1 | 2 | 2 | 2 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop off · retain off | 64 | 2 | 3 | 8 | 6 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop off · retain on | 64 | 3 | 5 | 3 | 3 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop on · retain off | 64 | 3 | 7 | 18 | 18 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop on · retain on | 64 | 0 | 4 | 4 | 4 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop off · retain off | 64 | 10 | 6 | 18 | 6 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop off · retain on | 64 | 8 | 0 | 4 | 4 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop on · retain off | 64 | 10 | 3 | 44 | 44 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop on · retain on | 64 | 5 | 2 | 15 | 15 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop off · retain off | 64 | 4 | 6 | 22 | 17 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop off · retain on | 64 | 3 | 5 | 10 | 10 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop on · retain off | 64 | 8 | 4 | 52 | 52 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop on · retain on | 64 | 7 | 6 | 18 | 18 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop off · retain off | 128 | 0 | 0 | 0 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop off · retain on | 128 | 3 | 2 | 3 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop on · retain off | 128 | 27 | 11 | 46 | 30 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop on · retain on | 128 | 25 | 13 | 67 | 50 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop off · retain off | 128 | 2 | 5 | 4 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop off · retain on | 128 | 5 | 8 | 8 | 4 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop on · retain off | 128 | 15 | 9 | 24 | 17 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop on · retain on | 128 | 13 | 9 | 45 | 37 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop off · retain off | 128 | 3 | 6 | 9 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop off · retain on | 128 | 9 | 6 | 12 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop on · retain off | 128 | 17 | 6 | 72 | 56 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop on · retain on | 128 | 19 | 5 | 136 | 119 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop off · retain off | 128 | 4 | 6 | 6 | 1 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop off · retain on | 128 | 8 | 0 | 26 | 14 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop on · retain off | 128 | 8 | 5 | 46 | 33 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop on · retain on | 128 | 16 | 10 | 100 | 92 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop off · retain off | 128 | 21 | 9 | 64 | 47 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop off · retain on | 128 | 18 | 14 | 161 | 140 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop on · retain off | 128 | 34 | 8 | 115 | 110 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop on · retain on | 128 | 37 | 9 | 239 | 234 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop off · retain off | 128 | 10 | 5 | 32 | 29 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop off · retain on | 128 | 6 | 6 | 108 | 104 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop on · retain off | 128 | 13 | 8 | 43 | 43 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop on · retain on | 128 | 9 | 6 | 127 | 126 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop off · retain off | 128 | 19 | 13 | 116 | 64 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop off · retain on | 128 | 19 | 12 | 316 | 266 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop on · retain off | 128 | 34 | 16 | 234 | 227 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop on · retain on | 128 | 29 | 15 | 455 | 449 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop off · retain off | 128 | 14 | 6 | 74 | 71 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop off · retain on | 128 | 9 | 9 | 203 | 202 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop on · retain off | 128 | 17 | 6 | 90 | 90 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop on · retain on | 128 | 13 | 13 | 315 | 315 |

By proposal origin:

| Lane | Origin | Centres | Plausible | Feasible |
|---|---:|---:|---:|---:|
| indep-rise | screen | 256 | 137 | 65 |
| indep-rise | island | 4096 | 2215 | 1887 |
| indep-breakout | screen | 256 | 143 | 92 |
| indep-breakout | island | 5120 | 3153 | 2878 |
## C23 independent (door D23; 10.05 min; 114,103 fresh evaluations, 816 archive hits, 6,831.9 worker-s; peak cgroup 7.65 GiB)

| Lane | Screened (unique) | Promoted | Seeds / designs | Island proposals | Refinement moves | Distinct centres | Rung-1 measured | Rung-1 feasible | Ledgers (feasible) | Cash-equivalent | Rung 2 / 3 feasible | Islands | Stop | Last trigger reading |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| indep-rise | 4,096 (4,096) | 256 | — | 5,120 | 173 | 5,545 | 2,533 | 1,991 | 3,386 (1,376) | 1,268 | 22 / 10 | 5 | triggers not met | island 4: best centre net +$0, best robust +$1146, hypervolume 0.21%, new competitive feasible strata 0 |
| indep-breakout | 4,096 (4,096) | 256 | — | 4,096 | 117 | 4,468 | 2,886 | 2,629 | 2,620 (1,164) | 3 | 24 / 8 | 4 | triggers not met | island 3: best centre net +$0, best robust +$0, hypervolume 0.00%, new competitive feasible strata 0 |

Fresh evaluations by kind: baseline 1 (+1 hits); screen 8,192 (+0 hits); r1:centre 9,216 (+512 hits); r1:neighbours 86,616 (+88 hits); r2:centre 0 (+48 hits); r2:neighbours 3,070 (+0 hits); r3:centre 0 (+18 hits); r3:neighbours 2,304 (+0 hits); refine:centre 285 (+9 hits); refine:neighbours 4,419 (+140 hits)

Island stops: indep-rise: #0 budget (1024 new, 16 gen, HV gain/10k 364205302.07), #1 budget (1024 new, 16 gen, HV gain/10k 785820288.71), #2 budget (1024 new, 16 gen, HV gain/10k 16401103.53), #3 budget (1024 new, 16 gen, HV gain/10k 5897483.99), #4 budget (1024 new, 16 gen, HV gain/10k 4678069.29); indep-breakout: #0 budget (1024 new, 16 gen, HV gain/10k 101574364.28), #1 budget (1024 new, 16 gen, HV gain/10k 5096838.1), #2 budget (1024 new, 16 gen, HV gain/10k 0), #3 budget (1024 new, 16 gen, HV gain/10k 3885.05)

Coverage by protected stratum (rung-1 archive):

| Lane | Stratum | Screened | Plausible | Promoted | Measured | Feasible |
|---|---:|---:|---:|---:|---:|---:|
| indep-rise | rise · gate off · trend off · elig off · hold off · istop off · retain off | 64 | 1 | 3 | 3 | 0 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop off · retain on | 64 | 1 | 2 | 1 | 0 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop on · retain off | 64 | 3 | 2 | 5 | 0 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop on · retain on | 64 | 3 | 6 | 6 | 2 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop off · retain off | 64 | 5 | 4 | 35 | 10 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop off · retain on | 64 | 8 | 8 | 18 | 0 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop on · retain off | 64 | 5 | 2 | 26 | 8 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop on · retain on | 64 | 6 | 4 | 11 | 3 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop off · retain off | 64 | 2 | 5 | 30 | 13 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop off · retain on | 64 | 3 | 4 | 26 | 12 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop on · retain off | 64 | 5 | 4 | 61 | 46 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop on · retain on | 64 | 0 | 1 | 39 | 34 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop off · retain off | 64 | 6 | 6 | 89 | 58 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop off · retain on | 64 | 5 | 5 | 73 | 51 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop on · retain off | 64 | 12 | 11 | 149 | 105 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop on · retain on | 64 | 4 | 8 | 98 | 77 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop off · retain off | 64 | 8 | 4 | 29 | 10 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop off · retain on | 64 | 5 | 2 | 17 | 11 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop on · retain off | 64 | 8 | 3 | 29 | 25 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop on · retain on | 64 | 6 | 3 | 17 | 16 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop off · retain off | 64 | 20 | 7 | 52 | 43 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop off · retain on | 64 | 6 | 3 | 15 | 11 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop on · retain off | 64 | 11 | 7 | 53 | 45 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop on · retain on | 64 | 8 | 7 | 36 | 31 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop off · retain off | 64 | 6 | 5 | 45 | 16 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop off · retain on | 64 | 3 | 4 | 18 | 6 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop on · retain off | 64 | 13 | 9 | 60 | 45 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop on · retain on | 64 | 3 | 1 | 35 | 27 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop off · retain off | 64 | 8 | 5 | 111 | 82 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop off · retain on | 64 | 9 | 5 | 66 | 55 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop on · retain off | 64 | 14 | 5 | 108 | 96 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop on · retain on | 64 | 8 | 5 | 87 | 75 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop off · retain off | 64 | 8 | 7 | 34 | 26 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop off · retain on | 64 | 2 | 5 | 3 | 2 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop on · retain off | 64 | 9 | 6 | 28 | 27 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop on · retain on | 64 | 2 | 1 | 3 | 3 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop off · retain off | 64 | 5 | 2 | 32 | 32 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop off · retain on | 64 | 3 | 2 | 17 | 16 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop on · retain off | 64 | 3 | 2 | 29 | 29 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop on · retain on | 64 | 2 | 3 | 14 | 14 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop off · retain off | 64 | 14 | 5 | 46 | 35 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop off · retain on | 64 | 8 | 0 | 30 | 20 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop on · retain off | 64 | 14 | 7 | 67 | 63 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop on · retain on | 64 | 7 | 3 | 28 | 27 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop off · retain off | 64 | 8 | 5 | 76 | 65 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop off · retain on | 64 | 7 | 4 | 68 | 60 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop on · retain off | 64 | 10 | 4 | 78 | 75 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop on · retain on | 64 | 6 | 3 | 79 | 77 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop off · retain off | 64 | 4 | 5 | 24 | 17 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop off · retain on | 64 | 1 | 3 | 15 | 13 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop on · retain off | 64 | 1 | 4 | 16 | 16 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop on · retain on | 64 | 3 | 2 | 14 | 14 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop off · retain off | 64 | 1 | 3 | 26 | 24 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop off · retain on | 64 | 4 | 3 | 7 | 6 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop on · retain off | 64 | 6 | 2 | 19 | 18 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop on · retain on | 64 | 1 | 3 | 11 | 11 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop off · retain off | 64 | 10 | 5 | 43 | 25 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop off · retain on | 64 | 9 | 3 | 27 | 26 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop on · retain off | 64 | 6 | 2 | 47 | 45 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop on · retain on | 64 | 5 | 2 | 27 | 27 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop off · retain off | 64 | 5 | 3 | 51 | 46 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop off · retain on | 64 | 0 | 1 | 37 | 33 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop on · retain off | 64 | 11 | 2 | 48 | 46 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop on · retain on | 64 | 8 | 4 | 41 | 40 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop off · retain off | 128 | 0 | 7 | 0 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop off · retain on | 128 | 0 | 7 | 1 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop on · retain off | 128 | 14 | 12 | 11 | 7 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop on · retain on | 128 | 11 | 10 | 36 | 26 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop off · retain off | 128 | 1 | 1 | 1 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop off · retain on | 128 | 1 | 6 | 3 | 1 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop on · retain off | 128 | 6 | 6 | 4 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop on · retain on | 128 | 8 | 13 | 24 | 18 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop off · retain off | 128 | 1 | 1 | 2 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop off · retain on | 128 | 4 | 5 | 6 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop on · retain off | 128 | 9 | 5 | 18 | 6 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop on · retain on | 128 | 11 | 4 | 86 | 67 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop off · retain off | 128 | 0 | 3 | 1 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop off · retain on | 128 | 5 | 4 | 11 | 3 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop on · retain off | 128 | 6 | 9 | 10 | 5 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop on · retain on | 128 | 6 | 5 | 26 | 21 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop off · retain off | 128 | 6 | 12 | 85 | 57 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop off · retain on | 128 | 17 | 12 | 203 | 178 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop on · retain off | 128 | 28 | 19 | 134 | 127 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop on · retain on | 128 | 28 | 12 | 228 | 226 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop off · retain off | 128 | 11 | 6 | 54 | 52 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop off · retain on | 128 | 12 | 13 | 96 | 92 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop on · retain off | 128 | 14 | 9 | 65 | 64 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop on · retain on | 128 | 13 | 15 | 126 | 123 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop off · retain off | 128 | 27 | 10 | 189 | 147 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop off · retain on | 128 | 24 | 16 | 468 | 426 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop on · retain off | 128 | 34 | 11 | 200 | 196 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop on · retain on | 128 | 23 | 11 | 471 | 466 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop off · retain off | 128 | 9 | 4 | 42 | 39 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop off · retain on | 128 | 7 | 3 | 114 | 111 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop on · retain off | 128 | 6 | 0 | 46 | 46 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop on · retain on | 128 | 8 | 5 | 125 | 125 |

By proposal origin:

| Lane | Origin | Centres | Plausible | Feasible |
|---|---:|---:|---:|---:|
| indep-rise | screen | 256 | 134 | 60 |
| indep-rise | island | 5120 | 2399 | 1931 |
| indep-breakout | screen | 256 | 137 | 85 |
| indep-breakout | island | 4096 | 2749 | 2544 |
## C24 independent (door D24; 14.86 min; 148,937 fresh evaluations, 814 archive hits, 10,256.4 worker-s; peak cgroup 8.35 GiB)

| Lane | Screened (unique) | Promoted | Seeds / designs | Island proposals | Refinement moves | Distinct centres | Rung-1 measured | Rung-1 feasible | Ledgers (feasible) | Cash-equivalent | Rung 2 / 3 feasible | Islands | Stop | Last trigger reading |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| indep-rise | 4,096 (4,096) | 256 | — | 6,144 | 226 | 6,621 | 3,085 | 2,492 | 3,803 (1,470) | 1,410 | 24 / 10 | 6 | triggers not met | island 5: best centre net +$0, best robust +$0, hypervolume 0.68%, new competitive feasible strata 0 |
| indep-breakout | 4,096 (4,096) | 256 | — | 6,144 | 125 | 6,525 | 4,258 | 3,947 | 3,619 (1,661) | 6 | 22 / 8 | 6 | triggers not met | island 5: best centre net +$1900, best robust +$0, hypervolume 0.09%, new competitive feasible strata 0 |

Fresh evaluations by kind: baseline 1 (+1 hits); screen 8,192 (+0 hits); r1:centre 12,288 (+512 hits); r1:neighbours 117,412 (+67 hits); r2:centre 0 (+48 hits); r2:neighbours 3,072 (+0 hits); r3:centre 0 (+18 hits); r3:neighbours 2,304 (+0 hits); refine:centre 346 (+9 hits); refine:neighbours 5,322 (+159 hits)

Island stops: indep-rise: #0 budget (1024 new, 16 gen, HV gain/10k 747173074.15), #1 budget (1024 new, 16 gen, HV gain/10k 290156960.4), #2 budget (1024 new, 16 gen, HV gain/10k 110078663.11), #3 budget (1024 new, 16 gen, HV gain/10k 8578165.44), #4 budget (1024 new, 16 gen, HV gain/10k 228257793.24), #5 budget (1024 new, 16 gen, HV gain/10k 11675991.84); indep-breakout: #0 budget (1024 new, 16 gen, HV gain/10k 41211839.17), #1 budget (1024 new, 16 gen, HV gain/10k 2053803.34), #2 budget (1024 new, 16 gen, HV gain/10k 9497443.71), #3 budget (1024 new, 16 gen, HV gain/10k 29256607.77), #4 budget (1024 new, 16 gen, HV gain/10k 8293456.11), #5 budget (1024 new, 16 gen, HV gain/10k 295715.47)

Coverage by protected stratum (rung-1 archive):

| Lane | Stratum | Screened | Plausible | Promoted | Measured | Feasible |
|---|---:|---:|---:|---:|---:|---:|
| indep-rise | rise · gate off · trend off · elig off · hold off · istop off · retain off | 64 | 1 | 3 | 4 | 0 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop off · retain on | 64 | 1 | 4 | 3 | 0 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop on · retain off | 64 | 3 | 3 | 12 | 5 |
| indep-rise | rise · gate off · trend off · elig off · hold off · istop on · retain on | 64 | 2 | 2 | 1 | 0 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop off · retain off | 64 | 7 | 8 | 32 | 5 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop off · retain on | 64 | 4 | 5 | 7 | 0 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop on · retain off | 64 | 6 | 4 | 30 | 7 |
| indep-rise | rise · gate off · trend off · elig off · hold on · istop on · retain on | 64 | 5 | 1 | 6 | 3 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop off · retain off | 64 | 1 | 2 | 70 | 37 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop off · retain on | 64 | 2 | 2 | 21 | 12 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop on · retain off | 64 | 4 | 6 | 120 | 95 |
| indep-rise | rise · gate off · trend off · elig on · hold off · istop on · retain on | 64 | 3 | 4 | 42 | 32 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop off · retain off | 64 | 9 | 10 | 196 | 145 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop off · retain on | 64 | 6 | 2 | 51 | 34 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop on · retain off | 64 | 4 | 5 | 294 | 250 |
| indep-rise | rise · gate off · trend off · elig on · hold on · istop on · retain on | 64 | 5 | 4 | 102 | 70 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop off · retain off | 64 | 13 | 7 | 18 | 4 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop off · retain on | 64 | 6 | 3 | 8 | 3 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop on · retain off | 64 | 11 | 5 | 41 | 31 |
| indep-rise | rise · gate off · trend on · elig off · hold off · istop on · retain on | 64 | 7 | 4 | 9 | 9 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop off · retain off | 64 | 6 | 3 | 57 | 44 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop off · retain on | 64 | 11 | 5 | 19 | 9 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop on · retain off | 64 | 10 | 10 | 83 | 78 |
| indep-rise | rise · gate off · trend on · elig off · hold on · istop on · retain on | 64 | 10 | 5 | 31 | 29 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop off · retain off | 64 | 5 | 3 | 55 | 32 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop off · retain on | 64 | 4 | 4 | 8 | 3 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop on · retain off | 64 | 7 | 6 | 91 | 69 |
| indep-rise | rise · gate off · trend on · elig on · hold off · istop on · retain on | 64 | 7 | 2 | 37 | 28 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop off · retain off | 64 | 11 | 7 | 115 | 86 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop off · retain on | 64 | 8 | 3 | 41 | 29 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop on · retain off | 64 | 15 | 4 | 145 | 126 |
| indep-rise | rise · gate off · trend on · elig on · hold on · istop on · retain on | 64 | 6 | 4 | 65 | 49 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop off · retain off | 64 | 3 | 2 | 11 | 8 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop off · retain on | 64 | 1 | 6 | 2 | 0 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop on · retain off | 64 | 9 | 4 | 10 | 8 |
| indep-rise | rise · gate on · trend off · elig off · hold off · istop on · retain on | 64 | 3 | 4 | 3 | 3 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop off · retain off | 64 | 3 | 0 | 12 | 11 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop off · retain on | 64 | 0 | 1 | 2 | 2 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop on · retain off | 64 | 3 | 4 | 25 | 23 |
| indep-rise | rise · gate on · trend off · elig off · hold on · istop on · retain on | 64 | 2 | 2 | 14 | 14 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop off · retain off | 64 | 9 | 8 | 55 | 43 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop off · retain on | 64 | 6 | 3 | 29 | 24 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop on · retain off | 64 | 12 | 9 | 108 | 103 |
| indep-rise | rise · gate on · trend off · elig on · hold off · istop on · retain on | 64 | 9 | 7 | 60 | 57 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop off · retain off | 64 | 6 | 3 | 112 | 101 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop off · retain on | 64 | 6 | 3 | 32 | 30 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop on · retain off | 64 | 6 | 4 | 153 | 151 |
| indep-rise | rise · gate on · trend off · elig on · hold on · istop on · retain on | 64 | 5 | 4 | 54 | 51 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop off · retain off | 64 | 2 | 5 | 10 | 6 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop off · retain on | 64 | 2 | 1 | 4 | 2 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop on · retain off | 64 | 4 | 5 | 2 | 2 |
| indep-rise | rise · gate on · trend on · elig off · hold off · istop on · retain on | 64 | 0 | 2 | 0 | 0 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop off · retain off | 64 | 1 | 3 | 17 | 17 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop off · retain on | 64 | 0 | 5 | 7 | 7 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop on · retain off | 64 | 1 | 2 | 12 | 12 |
| indep-rise | rise · gate on · trend on · elig off · hold on · istop on · retain on | 64 | 2 | 3 | 7 | 7 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop off · retain off | 64 | 7 | 6 | 77 | 61 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop off · retain on | 64 | 7 | 4 | 66 | 58 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop on · retain off | 64 | 10 | 7 | 77 | 71 |
| indep-rise | rise · gate on · trend on · elig on · hold off · istop on · retain on | 64 | 6 | 1 | 53 | 51 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop off · retain off | 64 | 3 | 3 | 92 | 87 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop off · retain on | 64 | 4 | 2 | 34 | 31 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop on · retain off | 64 | 4 | 2 | 88 | 86 |
| indep-rise | rise · gate on · trend on · elig on · hold on · istop on · retain on | 64 | 4 | 1 | 43 | 41 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop off · retain off | 128 | 0 | 4 | 0 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop off · retain on | 128 | 0 | 4 | 2 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop on · retain off | 128 | 0 | 5 | 1 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold off · istop on · retain on | 128 | 0 | 4 | 1 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop off · retain off | 128 | 1 | 6 | 0 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop off · retain on | 128 | 1 | 3 | 2 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop on · retain off | 128 | 1 | 4 | 1 | 0 |
| indep-breakout | breakout · gate off · trend off · elig off · hold on · istop on · retain on | 128 | 1 | 4 | 3 | 1 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop off · retain off | 128 | 0 | 4 | 0 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop off · retain on | 128 | 2 | 5 | 4 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop on · retain off | 128 | 3 | 3 | 6 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold off · istop on · retain on | 128 | 3 | 7 | 16 | 3 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop off · retain off | 128 | 1 | 5 | 2 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop off · retain on | 128 | 0 | 4 | 0 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop on · retain off | 128 | 1 | 6 | 0 | 0 |
| indep-breakout | breakout · gate off · trend on · elig off · hold on · istop on · retain on | 128 | 0 | 5 | 4 | 1 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop off · retain off | 128 | 10 | 10 | 123 | 72 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop off · retain on | 128 | 18 | 15 | 453 | 392 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop on · retain off | 128 | 18 | 15 | 170 | 165 |
| indep-breakout | breakout · gate on · trend off · elig off · hold off · istop on · retain on | 128 | 17 | 18 | 364 | 362 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop off · retain off | 128 | 14 | 11 | 80 | 74 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop off · retain on | 128 | 13 | 11 | 302 | 295 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop on · retain off | 128 | 11 | 9 | 52 | 52 |
| indep-breakout | breakout · gate on · trend off · elig off · hold on · istop on · retain on | 128 | 8 | 12 | 227 | 227 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop off · retain off | 128 | 28 | 12 | 253 | 187 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop off · retain on | 128 | 23 | 18 | 610 | 543 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop on · retain off | 128 | 30 | 16 | 302 | 299 |
| indep-breakout | breakout · gate on · trend on · elig off · hold off · istop on · retain on | 128 | 20 | 18 | 555 | 552 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop off · retain off | 128 | 5 | 3 | 84 | 82 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop off · retain on | 128 | 5 | 7 | 279 | 278 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop on · retain off | 128 | 9 | 2 | 96 | 96 |
| indep-breakout | breakout · gate on · trend on · elig off · hold on · istop on · retain on | 128 | 4 | 6 | 266 | 266 |

By proposal origin:

| Lane | Origin | Centres | Plausible | Feasible |
|---|---:|---:|---:|---:|
| indep-rise | screen | 256 | 136 | 63 |
| indep-rise | island | 6144 | 2949 | 2429 |
| indep-breakout | screen | 256 | 132 | 83 |
| indep-breakout | island | 6144 | 4126 | 3864 |
## C24 informed (door D24; 6.7 min; 86,524 fresh evaluations, 2,530 archive hits, 4,258.4 worker-s; peak cgroup 8.18 GiB)

| Lane | Screened (unique) | Promoted | Seeds / designs | Island proposals | Refinement moves | Distinct centres | Rung-1 measured | Rung-1 feasible | Ledgers (feasible) | Cash-equivalent | Rung 2 / 3 feasible | Islands | Stop | Last trigger reading |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| informed | — | — | 14 / 574 | 7,618 | 504 | 8,536 | 4,358 | 3,903 | 5,127 (2,261) | 1,185 | 24 / 8 | 4 | triggers not met | island 3: best centre net +$0, best robust +$0, hypervolume 0.68%, new competitive feasible strata 0 |

Fresh evaluations by kind: baseline 1 (+0 hits); r1:centre 8,192 (+0 hits); r1:neighbours 69,699 (+29 hits); r2:centre 0 (+24 hits); r2:neighbours 1,536 (+0 hits); r3:centre 0 (+13 hits); r3:neighbours 1,536 (+0 hits); refine:centre 344 (+164 hits); refine:neighbours 5,216 (+2,300 hits)

Island stops: informed: #0 budget (1906 new, 30 gen, HV gain/10k 110121678.08), #1 budget (1904 new, 30 gen, HV gain/10k 54659630.31), #2 budget (1904 new, 30 gen, HV gain/10k 3814858.98), #3 budget (1904 new, 30 gen, HV gain/10k 8050039.15)

Coverage by protected stratum (rung-1 archive):

| Lane | Stratum | Screened | Plausible | Promoted | Measured | Feasible |
|---|---:|---:|---:|---:|---:|---:|
| informed | breakout · gate off · trend off · elig off · hold off · istop off · retain off | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend off · elig off · hold off · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend off · elig off · hold off · istop on · retain off | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend off · elig off · hold off · istop on · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend off · elig off · hold on · istop off · retain off | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend off · elig off · hold on · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend off · elig off · hold on · istop on · retain off | 0 | 0 | 0 | 1 | 0 |
| informed | breakout · gate off · trend off · elig off · hold on · istop on · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend on · elig off · hold off · istop off · retain off | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend on · elig off · hold off · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend on · elig off · hold off · istop on · retain off | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend on · elig off · hold off · istop on · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend on · elig off · hold on · istop off · retain off | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend on · elig off · hold on · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend on · elig off · hold on · istop on · retain off | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate off · trend on · elig off · hold on · istop on · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate on · trend off · elig off · hold off · istop off · retain off | 0 | 0 | 0 | 2 | 0 |
| informed | breakout · gate on · trend off · elig off · hold off · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate on · trend off · elig off · hold off · istop on · retain off | 0 | 0 | 0 | 4 | 4 |
| informed | breakout · gate on · trend off · elig off · hold off · istop on · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | breakout · gate on · trend off · elig off · hold on · istop off · retain off | 0 | 0 | 0 | 12 | 12 |
| informed | breakout · gate on · trend off · elig off · hold on · istop off · retain on | 0 | 0 | 0 | 8 | 8 |
| informed | breakout · gate on · trend off · elig off · hold on · istop on · retain off | 0 | 0 | 0 | 16 | 15 |
| informed | breakout · gate on · trend off · elig off · hold on · istop on · retain on | 0 | 0 | 0 | 66 | 66 |
| informed | breakout · gate on · trend on · elig off · hold off · istop off · retain off | 0 | 0 | 0 | 3 | 2 |
| informed | breakout · gate on · trend on · elig off · hold off · istop off · retain on | 0 | 0 | 0 | 1 | 1 |
| informed | breakout · gate on · trend on · elig off · hold off · istop on · retain off | 0 | 0 | 0 | 2 | 2 |
| informed | breakout · gate on · trend on · elig off · hold off · istop on · retain on | 0 | 0 | 0 | 2 | 2 |
| informed | breakout · gate on · trend on · elig off · hold on · istop off · retain off | 0 | 0 | 0 | 21 | 19 |
| informed | breakout · gate on · trend on · elig off · hold on · istop off · retain on | 0 | 0 | 0 | 3 | 3 |
| informed | breakout · gate on · trend on · elig off · hold on · istop on · retain off | 0 | 0 | 0 | 83 | 80 |
| informed | breakout · gate on · trend on · elig off · hold on · istop on · retain on | 0 | 0 | 0 | 17 | 17 |
| informed | rise · gate off · trend off · elig off · hold off · istop off · retain off | 0 | 0 | 0 | 1 | 0 |
| informed | rise · gate off · trend off · elig off · hold off · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate off · trend off · elig off · hold off · istop on · retain off | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate off · trend off · elig off · hold off · istop on · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate off · trend off · elig off · hold on · istop off · retain off | 0 | 0 | 0 | 19 | 2 |
| informed | rise · gate off · trend off · elig off · hold on · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate off · trend off · elig off · hold on · istop on · retain off | 0 | 0 | 0 | 23 | 1 |
| informed | rise · gate off · trend off · elig off · hold on · istop on · retain on | 0 | 0 | 0 | 1 | 0 |
| informed | rise · gate off · trend off · elig on · hold off · istop off · retain off | 0 | 0 | 0 | 41 | 17 |
| informed | rise · gate off · trend off · elig on · hold off · istop off · retain on | 0 | 0 | 0 | 4 | 2 |
| informed | rise · gate off · trend off · elig on · hold off · istop on · retain off | 0 | 0 | 0 | 69 | 55 |
| informed | rise · gate off · trend off · elig on · hold off · istop on · retain on | 0 | 0 | 0 | 9 | 8 |
| informed | rise · gate off · trend off · elig on · hold on · istop off · retain off | 0 | 0 | 0 | 697 | 611 |
| informed | rise · gate off · trend off · elig on · hold on · istop off · retain on | 0 | 0 | 0 | 97 | 80 |
| informed | rise · gate off · trend off · elig on · hold on · istop on · retain off | 0 | 0 | 0 | 934 | 839 |
| informed | rise · gate off · trend off · elig on · hold on · istop on · retain on | 0 | 0 | 0 | 125 | 101 |
| informed | rise · gate off · trend on · elig off · hold off · istop off · retain off | 0 | 0 | 0 | 3 | 1 |
| informed | rise · gate off · trend on · elig off · hold off · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate off · trend on · elig off · hold off · istop on · retain off | 0 | 0 | 0 | 4 | 4 |
| informed | rise · gate off · trend on · elig off · hold off · istop on · retain on | 0 | 0 | 0 | 1 | 1 |
| informed | rise · gate off · trend on · elig off · hold on · istop off · retain off | 0 | 0 | 0 | 50 | 46 |
| informed | rise · gate off · trend on · elig off · hold on · istop off · retain on | 0 | 0 | 0 | 5 | 4 |
| informed | rise · gate off · trend on · elig off · hold on · istop on · retain off | 0 | 0 | 0 | 32 | 31 |
| informed | rise · gate off · trend on · elig off · hold on · istop on · retain on | 0 | 0 | 0 | 5 | 5 |
| informed | rise · gate off · trend on · elig on · hold off · istop off · retain off | 0 | 0 | 0 | 27 | 16 |
| informed | rise · gate off · trend on · elig on · hold off · istop off · retain on | 0 | 0 | 0 | 6 | 4 |
| informed | rise · gate off · trend on · elig on · hold off · istop on · retain off | 0 | 0 | 0 | 55 | 52 |
| informed | rise · gate off · trend on · elig on · hold off · istop on · retain on | 0 | 0 | 0 | 40 | 35 |
| informed | rise · gate off · trend on · elig on · hold on · istop off · retain off | 0 | 0 | 0 | 445 | 395 |
| informed | rise · gate off · trend on · elig on · hold on · istop off · retain on | 0 | 0 | 0 | 159 | 144 |
| informed | rise · gate off · trend on · elig on · hold on · istop on · retain off | 0 | 0 | 0 | 540 | 523 |
| informed | rise · gate off · trend on · elig on · hold on · istop on · retain on | 0 | 0 | 0 | 136 | 128 |
| informed | rise · gate on · trend off · elig off · hold off · istop off · retain off | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate on · trend off · elig off · hold off · istop on · retain off | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate on · trend off · elig off · hold off · istop on · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate on · trend off · elig off · hold on · istop off · retain off | 0 | 0 | 0 | 1 | 1 |
| informed | rise · gate on · trend off · elig off · hold on · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate on · trend off · elig off · hold on · istop on · retain off | 0 | 0 | 0 | 9 | 9 |
| informed | rise · gate on · trend off · elig off · hold on · istop on · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate on · trend off · elig on · hold off · istop off · retain off | 0 | 0 | 0 | 18 | 15 |
| informed | rise · gate on · trend off · elig on · hold off · istop off · retain on | 0 | 0 | 0 | 2 | 1 |
| informed | rise · gate on · trend off · elig on · hold off · istop on · retain off | 0 | 0 | 0 | 31 | 31 |
| informed | rise · gate on · trend off · elig on · hold off · istop on · retain on | 0 | 0 | 0 | 5 | 5 |
| informed | rise · gate on · trend off · elig on · hold on · istop off · retain off | 0 | 0 | 0 | 105 | 100 |
| informed | rise · gate on · trend off · elig on · hold on · istop off · retain on | 0 | 0 | 0 | 18 | 18 |
| informed | rise · gate on · trend off · elig on · hold on · istop on · retain off | 0 | 0 | 0 | 201 | 201 |
| informed | rise · gate on · trend off · elig on · hold on · istop on · retain on | 0 | 0 | 0 | 25 | 25 |
| informed | rise · gate on · trend on · elig off · hold off · istop off · retain off | 0 | 0 | 0 | 3 | 3 |
| informed | rise · gate on · trend on · elig off · hold off · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate on · trend on · elig off · hold off · istop on · retain off | 0 | 0 | 0 | 1 | 1 |
| informed | rise · gate on · trend on · elig off · hold on · istop off · retain off | 0 | 0 | 0 | 7 | 7 |
| informed | rise · gate on · trend on · elig off · hold on · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate on · trend on · elig off · hold on · istop on · retain off | 0 | 0 | 0 | 5 | 5 |
| informed | rise · gate on · trend on · elig off · hold on · istop on · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate on · trend on · elig on · hold off · istop off · retain off | 0 | 0 | 0 | 8 | 8 |
| informed | rise · gate on · trend on · elig on · hold off · istop off · retain on | 0 | 0 | 0 | 0 | 0 |
| informed | rise · gate on · trend on · elig on · hold off · istop on · retain off | 0 | 0 | 0 | 27 | 15 |
| informed | rise · gate on · trend on · elig on · hold off · istop on · retain on | 0 | 0 | 0 | 3 | 3 |
| informed | rise · gate on · trend on · elig on · hold on · istop off · retain off | 0 | 0 | 0 | 32 | 31 |
| informed | rise · gate on · trend on · elig on · hold on · istop off · retain on | 0 | 0 | 0 | 5 | 5 |
| informed | rise · gate on · trend on · elig on · hold on · istop on · retain off | 0 | 0 | 0 | 66 | 66 |
| informed | rise · gate on · trend on · elig on · hold on · istop on · retain on | 0 | 0 | 0 | 17 | 17 |

By proposal origin:

| Lane | Origin | Centres | Plausible | Feasible |
|---|---:|---:|---:|---:|
| informed | seed | 14 | 14 | 13 |
| informed | design | 560 | 380 | 310 |
| informed | island | 7618 | 3964 | 3580 |

Qualification C19: 9,966 fresh, 0 hits, 271.7 worker-s.

Qualification C21: 9,958 fresh, 0 hits, 368.5 worker-s.

Qualification C23: 9,967 fresh, 0 hits, 542.5 worker-s.

Qualification C24: 46,376 fresh, 0 hits, 2,597.9 worker-s.
