# Search budget and effort, side by side with the original (5B L0 arm and whole study)

Units: distinct proposals = screen + seed designs + island children + fillers (refinement moves apart); requested = every evaluation a lane asked for (archive hits included); fresh = unique simulations computed by the job. Original figures from `recovery/original-recovery.json` (5B sealed records).

| Lane | Original L0 arm proposals | Original 3 arms proposals | This study proposals | Islands (orig L0 / this) | Refinement starts (orig L0 / this) | Refinement moves (orig L0 / this) | Original L0 requested evals | This study requested evals | This study fresh | Archive hits | Wall | Lane stops |
|---|---:|---:|---:|---|---|---|---:|---:|---:|---:|---|---|
| C19/indep | 9,472 | 28,416 | 28,928 | 21 / 65 | 14 / 42 | 1,916 / 4,884 | 101,600 | 304,047 | 313,462 | 2,695 | 24.9 min | triggers not met |
| C21/indep | 9,728 | 29,184 | 26,880 | 22 / 57 | 14 / 42 | 2,077 / 4,908 | 100,913 | 276,504 | 286,101 | 2,530 | 31.58 min | triggers not met |
| C23/indep | 12,288 | 36,864 | 31,488 | 32 / 75 | 14 / 42 | 2,114 / 5,071 | 92,774 | 252,267 | 261,553 | 2,755 | 37.17 min | triggers not met; extension cap reached |
| C24/indep | 13,824 | 41,472 | 33,024 | 38 / 81 | 14 / 42 | 1,982 / 5,098 | 103,378 | 271,412 | 280,575 | 2,936 | 45.71 min | triggers not met; extension cap reached |
| C24/informed | 4,034 | 12,102 | 12,570 | 8 / 24 | 14 / 54 | 3,048 / 11,605 | 91,030 | 355,437 | 239,309 | 116,113 | 48.4 min | triggers not met; resource guard |

**Totals (this study, searches):** 132,890 distinct proposals (original L0 arm 49,346; whole 5B study 148,038), 31,566 refinement moves (original L0 arm 11,137), 1,459,667 requested evaluations (original L0 arm 489,695; whole study 1,463,415), 1,381,000 unique fresh simulations.

**Allocation among stages (fresh simulations by tag; original 5B: rung 1 65.8–75.4%, refinement 14.6–18.6%):**

| Job | Screen | Rung 1 | Rung 2 | Rung 3 | Refinement |
|---|---:|---:|---:|---:|---:|
| C19/indep | 3.9% | 71.9% | 4.9% | 5.9% | 13.3% |
| C21/indep | 4.3% | 68.9% | 5.4% | 7.2% | 14.2% |
| C23/indep | 4.7% | 64.0% | 5.9% | 7.9% | 17.6% |
| C24/indep | 4.4% | 65.1% | 5.5% | 7.3% | 17.8% |
| C24/informed | 0.0% | 80.3% | 2.5% | 3.9% | 13.4% |
