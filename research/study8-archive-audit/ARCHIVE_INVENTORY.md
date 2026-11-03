# Archive inventory — what Study 8 searched, and what is retained

**Question 1.** What was searched, and what is still on disk, per track, fold and stage? Which information is gone?

All counts are re-derived from the sealed records by `scripts/inventory.py` and compared with the counts sealed in each
`search.json`; every one agrees (`outputs/inventory.md`, `outputs/inventory.json` `consistency`).

**Sources (all read-only):**

- `research/study8-expanded-regime-d1/results/search/<TRACK>/<FOLD>/search.json` and `search-archive.csv.gz` (chain
  phase `search`);
- `results/qualify/<TRACK>/<FOLD>/qualification.json` (phase `qualify`);
- `FROZEN_SELECTION.json` (phase `selection`);
- `results/test/<FOLD>/test.json` (phases `test-F19` … `test-F24`).

## 1. Totals (all six tracks)

| fold | training window | rung-1 archive | r1 feasible | rung 2 (64 pt) | rung 3 (128 pt) | shortlist | qualified | role holders | sealed-tested members | fresh points |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| F19 | → 2019-12-31 | 90,746 | 27,055 | 1,152 | 307 | 36 | 26 | 22 | 36 | 2,062,033 |
| F20 | → 2020-12-31 | 93,642 | 31,006 | 1,152 | 304 | 36 | 34 | 27 | 36 | 2,106,197 |
| F21 | → 2021-12-31 | 90,518 | 40,904 | 1,152 | 305 | 36 | 35 | 28 | 36 | 2,060,397 |
| F23 | → 2023-12-29 | 81,186 | 28,799 | 1,152 | 299 | 36 | 32 | 26 | 36 | 1,855,080 |
| **F24** | **→ 2024-12-31** | **84,034** | **28,935** | **1,152** | **299** | **36** | **27** | **26** | **36** | **1,899,682** |
| all | | **440,126** | 156,699 | 5,760 | 1,514 | 180 | 154 | 129 | 180 | **9,983,389** |

The prior report's figures (440,126 configurations at rung 1 and 9,983,389 point evaluations) are reproduced
exactly. Every rung-1 configuration is retained, one row each with no duplicate IDs. The fresh points are retained
only as counts.

## 2. F24 (primary fold, training 2016-01-04 → 2024-12-31) by track and stage

| track | d | screen vectors | plausible | promoted (rung-1 seeds) | rung-1 archive | r1 feasible | r2 | r2 feasible | r3 (incl. refinement) | r3 feasible | refinement endpoints new at r3 | shortlist (feasible) | qualified | role holders | sealed test: pass / ambiguous / fail |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| G | 8 | 8,192 | 368 | 368 | 8,560 | 3,081 | 192 | 117 | 51 | 48 | 3 | 6 (6) | 3 | 3 | 0 / 1 / 5 |
| V | 8 | 8,192 | 2,404 | 1,024 | 7,744 | 657 | 192 | 8 | 48 | 11 | 0 | 6 (4) | 4 | 4 | 1 / 1 / 4 |
| VG | 16 | 5,092 | 2,873 | 1,024 | 13,312 | 7,805 | 192 | 190 | 50 | 48 | 2 | 6 (6) | 4 | 4 | 5 / 1 / 0 |
| VXR | 24 | 7,680 | 3,382 | 1,536 | 13,824 | 5,334 | 192 | 191 | 49 | 49 | 1 | 6 (6) | 5 | 5 | 4 / 0 / 2 |
| VXRG | 32 | 10,240 | 3,097 | 2,048 | 18,432 | 5,881 | 192 | 187 | 49 | 49 | 1 | 6 (6) | 6 | 5 | 5 / 0 / 1 |
| VXRKG | 40 | 12,800 | 1,682 | 1,682 | 22,162 | 6,177 | 192 | 191 | 52 | 52 | 4 | 6 (6) | 5 | 5 | 4 / 0 / 2 |

The per-job table for all 30 track-folds, including islands, triggers, refinement moves and points, is in
`outputs/inventory.md`.

**How the counts relate:**

- **Archive:** the rung-1 archive is the promoted centres plus every GA proposal of every island (e.g. VG-F24 1,024 +
  6 × 2,048 = 13,312).
- **Rung 2:** the top 192 of the whole archive by constrained-domination order (Pareto fronts, crowding distance),
  each at L∞ ≥ 0.02 from those already taken.
- **Rung 3:** the top 48 of rung 2 at L∞ ≥ 0.03. Up to 4 refinement endpoints that were never in the archive are
  evaluated at rung 3 too. **#1 VG profit is one of them: it was never a rung-1 or rung-2 configuration.**

## 3. Retained fields, by fidelity

| record | configurations retained | centre fields | neighbourhood fields | precision |
|---|---|---|---|---|
| `search-archive.csv.gz` (rung 1) | every rung-1 configuration (440,126) | net, minute DD, lots, episodes; combined violation (6 dp); rung-2/rung-3 flags | share, p90 DD, median net, p10 net (whole dollars) | **16 points** (r1 seed family, common to all centres of a job) |
| `search.json` `rung2` | 192 per job (5,760) | full centre: net, per year, realized/unrealized, minute and daily DD, lots, episodes, lot-years, per-book lots and net, held days, net per capital-year, top-lot share, best year and share, ex-best-year economy, refusals, funded-ledger signature; violation **and its parts** | n, share, share SE, breaches, p90/median/worst DD, median/p10/p90 net, per year, robust profit/yr, profitable share, median lots | 64 points |
| `search.json` `rung3` | 48–54 per job (1,514), incl. refinement endpoints | as rung 2 | as rung 2 | 128 points |
| `search.json` `shortlist` | 6 per job (180) | as rung 2, plus the vector | the value the shortlist used (128, or 256 pooled when T2 rescored it), and the selection families 2 × 128 plus pooled | 128 / 256; selection 256 |
| `search.json` `refinements` | 6 starts per job | path (robust/yr, violation per pass, accepted move) | — | 64 points (RF family) |
| `qualification.json` | the 6 shortlist members and the controls | full centre plus stresses, per-book, clipping, near-bound, alternates (in-box, k = 8 …) | confirmation 3 × 128, gates Q1–Q8/E1–E3, funded-ledger lot keys | 384 points |
| `test/<F>/test.json` | the 36 shortlist members and the controls of each fold | whole-run and test-window figures, stresses, sensitivities | test families 3 × 128 | 384 points, **test door** |

## 4. What is not retained (limits of every finding in this audit)

1. **Point caches are gone.**
   - `research/study8-expanded-regime-d1/results/cache/` does not exist in this checkout. The per-job point caches
     lived in the temporary Study 8 worktree, which was removed after the relocation (AMENDMENTS E4).
   - No per-neighbour result (each neighbour's net and DD) survives for any configuration.
   - So nothing can be re-summarized with other quantiles, other thresholds or another robust-profit formula on the
     original neighbours. Only the stored summaries can be used.
2. **The rung-1 archive keeps only nine numeric fields.** It lacks:
   - lot-years, per-book lots, net per capital-year, top-lot share, best-year share and ex-best-year economy (C3
     lot-years, C4, C6, C7);
   - the parts of the violation.
   C1, C2, C3 (lots and episodes) and C5 can be recomputed from the stored fields. The rest of the stored violation
   can only be attributed jointly to "C3 lot-years / C4 / C6 / C7" (`outputs/f24-funnel.md`; the recomputation leaves
   no negative remainder on any of the 84,034 F24 rows).
3. **Unpromoted screen vectors exist only as counts.** These are Sobol vectors, random combinations and joint LHS
   points (e.g. 5,092 VG-F24 vectors → 2,873 plausible → 1,024 promoted).
4. **No island origin per configuration.** As the Study 8 report already notes, it cannot be said whether the T1
   extension islands contributed shortlist members.
5. **T2-rescored values are retained only for shortlisted members.**
   - T2 fired in 18 of 30 jobs. It rescored eight configurations in 17 of them and two in V-F19.
   - For the non-shortlisted rescored configurations the pooled 256-point value is gone; their 128-point rung-3 value
     remains.
6. **Selection families (2 × 128) exist only for shortlist members, confirmation (3 × 128) only for shortlist
   members and controls.** Nothing below the shortlist has more than 128 points.
7. **Test-door evidence exists only for shortlist members and controls** (36 per fold). By the brief's rule, no
   other configuration may be evaluated on 2025–2026 in this audit, and none was.

**Consequence.**

- At rung 1 (n = 16), a risk-feasible share can only be 15/16 = 93.75% or 16/16 = 100%. Their one-sided 95% Wilson
  lower bounds are 76.2% and 85.5%, so **no rung-1-only configuration can be called robust**.
- In this audit, "robust" requires ≥ 64 points, and the 93–95% / 95–98% band distinctions are only meaningful at ≥ 128
  points (`PROFIT_ROBUSTNESS_FRONTIER.md` §1).

## 5. Exact training windows of the records used

| fold | training door (search and qualification) | sessions from arming ÷ 252 (y) |
|---|---|---:|
| F19 | 2016-01-04 → 2019-12-31 | 2.544 |
| F20 | 2016-01-04 → 2020-12-31 | 3.548 |
| F21 | 2016-01-04 → 2021-12-31 | 4.548 |
| F23 | 2016-01-04 → 2023-12-29 | 6.536 |
| F24 | 2016-01-04 → 2024-12-31 | 7.536 |

- Accounting starts at the close of 2016-01-04; arming is 2017-06-15. The `y` values are each search record's own
  `y` field.
- The test windows are used only in `VALIDATION_PERSISTENCE_AUDIT.md`, only for the sealed members:
  - F19 2020–2021;
  - F20 2021–2022;
  - F21 2022–2023;
  - F23 2024;
  - F24 2025-01-02 → 2026-10-29.
