# Budgets: executed search and qualification effort by track, against Priority 3B and NL0

Generated from the sealed records by `tools/vg-l0-shadow-eligibility/tables.ts` (not sealed).

## 1. Every search job (requested = every evaluation the lanes asked for, archive hits included; fresh = unique fresh simulations of the job)

| Cutoff | Job | Lanes | Distinct proposals (executed) | Islands | Refinement starts / moves | Requested | Unique fresh | Archive hits | Cap | Wall | Lane stops | Qualified / members (qualification fresh) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C19 | B1 | 96 | 151,040 | 334 | 224 / 26,851 | 1,615,667 | 1,666,266 | 14,043 | 2,213,376 | 135 min | 95 triggers not met; 1 extension cap reached | 314/320 (208,320 fresh) |
| C19 | B2-d1 | 48 | 74,240 | 162 | 112 / 6,960 | 852,894 | 878,968 | 6,469 | 1,106,688 | 26 min | 48 triggers not met | 156/160 (103,680 fresh) |
| C19 | B2-g | 48 | 69,376 | 143 | 112 / 6,085 | 641,512 | 667,758 | 6,344 | 1,106,688 | 41 min | 48 triggers not met | 160/160 (104,160 fresh) |

## 2. Track totals

| Track | Distinct proposals | Islands | Refinement starts / moves | Search requested | Search unique fresh | Archive hits | Qualification fresh | Search + qualification fresh | Search wall |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| B1 | 151,040 | 334 | 224 / 26,851 | 1,615,667 | 1,666,266 | 14,043 | 208,320 | 1,874,586 | 2.2 h |
| B2 | 143,616 | 305 | 224 / 13,045 | 1,494,406 | 1,546,726 | 12,813 | 207,840 | 1,754,566 | 1.1 h |

## 3. Against the references

| Reference | Distinct proposals | Evaluations | Note |
|---|---:|---:|---:|
| Priority 3B independent search, per cutoff (C19 / C21 / C23 / C24) | 131,072 base each (137,216 / 133,120 / 137,216 / 149,504 executed) | C19 1,212,750; C21 1,169,417; C23 1,178,935; C24 1,308,569 | fresh; V, G, B cells |
| Priority 3B independent search + qualification (comparable work) | 557,056 executed | 4,869,671 + 285,368 = 5,155,039 | fresh |
| Priority 3B whole study | 602,111 | 5,834,395 | incl. its informed lanes (679,356) |
| NL0: 5B L0 arm (the effective budget that produced New L0) | 49,346 | 489,695 requested search + 64,554 qualification | informed lane 4,034 proposals / 91,030 requested |
| This study: B1 / B2 per cutoff (configured base) | 131,072 | ≈ 1.47 M requested (planned) | 32 × 3 lanes; 16 × 3 + 2 × 8 × 3 lanes |
