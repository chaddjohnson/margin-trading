# Compute ledger (fresh backend simulations and archive hits)

Generated from the sealed records by `tools/optimization-process-audit/tables.ts`. Dollars to the cent; DD = maximum minute drawdown of the marked net on the fixed $100,000 budget.

| Stage | Fresh | Next-period fresh | Fresh by kind | Archive hits | Wall s |
|---|---:|---:|---|---:|---:|
| stage1 reproduce | 248 | 42 | training centre (G4) 185; next-slice reproduction (G5) 21; training detailed (G6) 21; next-slice detailed (G6, attribution) 21 | selection draws (G3) 47,360 | 37.6 |
| stage1 mechanism | 3,828 | 0 | training centre detailed (causal window) 185; training causal blackout rerun 185; training neighbour detailed (episode reproduction) 3,456; training observer run (4A eligibility) 2 | selection draws (features) 47,360 | 192.1 |
| pilot pilot-straight (straight) | 48 | 0 | pilot training-door slice run 48 | — | 4.2 |
| pilot pilot-kill (kill): self-SIGKILL after 10 fresh runs | 10 | 0 | pilot training-door slice run 10 | — | 0 |
| pilot pilot-kill (straight) | 48 | 0 | pilot training-door slice run 48 | — | 4.2 |
| pilot pilot-stop (stop) | 10 | 0 | pilot training-door slice run 10 | — | 2.6 |
| pilot pilot-stop (straight) | 38 | 0 | pilot training-door slice run 38 | — | 3.8 |
| pilot read pilot-straight | 0 | 0 | — | — | 0.3 |
| pilot read pilot-kill | 0 | 0 | — | — | 0.3 |
| pilot read pilot-stop | 0 | 0 | — | — | 0.3 |
| stage3 next-slice cohort runs | 576 | 576 | next-slice cohort run 576 | — | 44.9 |
| stage3 analysis (archive reads only) | 0 | 0 | — | — | 1.3 |
| stage4 C24 freeze (secondary-universe features, training door D24) | 60 | 0 | training centre detailed (causal window) 30; training causal blackout rerun 30 | — | 8.2 |

**Totals:** 4,866 fresh simulations of the 100,000 cap; 618 next-slice / full-history of the 800 cap; 0 new search proposals. The Stage 1 archive scans read 3,635,233 archived records (sum of the scan logs) and are archive hits, never fresh simulations.
