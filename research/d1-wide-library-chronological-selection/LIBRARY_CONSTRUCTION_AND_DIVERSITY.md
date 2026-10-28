# Library construction and diversity (training only)

**Evidence level: training only.** Records: `results/libraries/<fold>/SELECTION.json` (sealed; every pool, ETF, arm, K:
library keys, nominees with scores, eligibility counts, the A0 check, the across-ETF top 5, `power`, `flags`,
digests), `members-<pool>.json.gz` (git-ignored; every member's training metrics, family, support, draws summary; sha256
in the record) and the readable `libraries.csv.gz` (tracked). Rules: `LIBRARY_SELECTION_RULES.md`; protocol §6–§7.
Reproduce a path with `npm run d1-library-study -- show --symbol VGT --fold B --method A2 --library-size 16 --pool ARCH`.

## Procedures (as frozen)

1. **Credible set** (identical for every arm): trades ≥ max(4, ⌈eligible years⌉) (S18/S19/A/S20 4, B 5, S22 6), minute
   DD ≤ $35,000, net > 0; 5 bps, 11%, a lot open at the cutoff at its liquidation value.
2. **Trade-path families:** d(a, b) = max(1 − Jaccard of held sessions, 1 − Dice of entries matched within ±3
   sessions); bounded-diameter first-fit clustering (every pair inside a family within d ≤ 0.5; no chaining), visiting
   by training net then key. **Support** (order-independent) = the pool's credible Sobol vectors within d ≤ 0.5 of the
   family's medoid. d ≤ 0.5 means "similar trade paths" — at least half of the held sessions and of the entries shared.
   The diameter was chosen after the pre-freeze fold-a census (training data only; PROTOCOL §6.2, disclosed).
3. **Arms:** A0r (the source's narrow rule: top 8 by J_s with distinct signatures, 16 draws, J_nb, library ≤ 4); A1
   (families by J_s, best J_nb); A1n (top K by J_s, no family deduplication — the "more trials" ablation); A2 (families
   by T, best T_nb, ≥ 2 entry years); A3 (families by support, medoids, 48 draws, feasibility filters, best P25).
   K ∈ {8, 16, 32, 64}, each library a prefix of the next.
4. **Neighbourhood draws:** the source instrument (common random numbers per stage, class and draw; folds A/B use the
   source's own stages, so A0r on ARCH reproduces the sealed J_nb). Distinct draws evaluated: S18 71,200; S19 144,029;
   A 556,688; S20 180,155; B 636,286; S22 180,157 (1.77 M in all, shared across pools by grid).

## A0 reproduction

On the reconstructed archives, A0r reproduces the sealed A0 (representative, library, checked set with J_nb,
evaluated and credible counts) for **61/61 ETFs in fold A and 61/61 in fold B** (`A0 ≠ A0r` = 0 in both SELECTIONs).
The sealed A0 governs the ARCH baseline; with no difference, A0 and A0r(ARCH) are the same nominees.

## Family counts and realized K (median over ETFs; ETFs reaching each K)

| Fold | Pool | ETFs with credible | Median families | ≥ 8 | ≥ 16 | ≥ 32 | ≥ 64 | A0r nominees | A1 / A1n / A2 / A3 nominees at K = 16 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| S18 | NEW | 49 | 7 | 26 | 13 | 3 | 0 | 32 | 34 / 37 / 20 / 18 |
| S19 | NEW | 54 | 26 | 48 | 44 | 23 | 9 | 45 | 44 / 45 / 52 / 31 |
| A | ARCH | 57 | 40 | 53 | 48 | 36 | 11 | 49 (= A0) | 54 / 53 / 56 / 47 |
| A | ARCH-S | 57 | 26 | 49 | 43 | 20 | 3 | 50 | 48 / 50 / 53 / 45 |
| A | NEW | 57 | 27 | 51 | 47 | 24 | 4 | 50 | 51 / 51 / 53 / 48 |
| A | NEW-S | 57 | 26 | 50 | 44 | 21 | 3 | 51 | 51 / 51 / 52 / 47 |
| A | ALL | 57 | 49 | 54 | 50 | 41 | 17 | 51 | 54 / 53 / 55 / 46 |
| S20 | NEW | 57 | 42 | 53 | 49 | 40 | 11 | 52 | 53 / 52 / 52 / 47 |
| B | ARCH | 57 | 59 | 53 | 50 | 48 | 28 | 54 (= A0) | 56 / 55 / 56 / 50 |
| B | ARCH-S | 56 | 37 | 50 | 48 | 39 | 9 | 51 | 51 / 51 / 52 / 50 |
| B | NEW | 56 | 38 | 51 | 49 | 40 | 10 | 50 | 52 / 52 / 53 / 49 |
| B | NEW-S | 56 | 35 | 50 | 48 | 38 | 9 | 50 | 50 / 50 / 52 / 47 |
| B | ALL | 57 | 76 | 53 | 51 | 48 | 37 | 54 | 56 / 55 / 57 / 53 |
| S22 | NEW | 58 | 41 | 55 | 51 | 42 | 9 | 54 | 54 / 56 / 57 / 52 |

- A library is never padded: an ETF with fewer families than K has a smaller library (K = 64 is reached by 0–37 ETFs
  depending on fold and pool; K = 32 and 64 are often the same library — the verdict counts them as one design point).
- Unique exact trade signatures equal the number of credible vectors (prices differ with parameters), so exact
  signatures do not deduplicate anything; families do (fold A ARCH: 28,067 credible vectors → 2,530 families).

## How often each broad arm nominates the same vector as the baseline (sealed before any evaluation)

Identical nominees at K = 16 out of 61 ETFs (both-none included) — the power of each comparison was fixed before any
window outcome existed:

| Fold | Pool | A1 | A1n | A2 | A3 |
|---|---|---:|---:|---:|---:|
| A | ARCH | 17 | 36 | 8 | 10 |
| A | ARCH-S | 46 | 57 | 19 | 8 |
| A | NEW | 27 | 40 | 13 | 9 |
| A | NEW-S | 44 | 58 | 16 | 10 |
| A | ALL | 18 | 34 | 7 | 8 |
| B | ARCH | 13 | 34 | 11 | 7 |
| B | ARCH-S | 46 | 59 | 23 | 11 |
| B | NEW | 22 | 35 | 14 | 10 |
| B | NEW-S | 45 | 55 | 19 | 11 |
| B | ALL | 12 | 35 | 10 | 6 |
| S18 / S19 / S20 / S22 | NEW | 44 / 38 / 32 / 24 | 48 / 49 / 38 / 38 | 25 / 23 / 14 / 20 | 25 / 15 / 9 / 10 |

- **On ARCH, widening with the original score (A1) changes the nominee in 44 (fold A) and 48 (fold B) of 61 ETFs**;
  the J_nb second stage re-ranks families the old top-8 never checked. On the Sobol-only pools (ARCH-S, NEW-S), A1
  mostly agrees with A0r (44–46 identical): without the local-search clones, the old top 8 already spans the best
  families. A1n (more checked candidates, no diversity) agrees with the baseline far more often than A1 — the
  diversity, not the count, is what changes the choice.
- A2 and A3 change the nominee in 36–55 of 61 ETFs everywhere: their objectives choose different behaviours.

## Provenance and flags

- Every member keeps its provenance (archive window or new fold), stage, origin and seeds (`members-*.json.gz`); ALL
  members keep their own provenance; no figure is ever attributed across provenances.
- Flags (training only): the frozen flag rule compared ALL's archive-provenance members with the archive itself, so
  all 215 (A) and 290 (B) flags are archive vectors matching themselves — a descriptive-only defect, disclosed.
  Restricted to **new-provenance** nominees: **0** share a training trade signature with an archived vector of their
  fold and **0** equal an incumbent's grid.
- Seeds: Sobol `sobolVectors(symbol, 1024, 'd1-wide-library-v1:new-search')`; refinements
  `Rng.from('d1-wide-library-v1', 'refine', fold, symbol, start, round)`; draws `neighbour(…, stage, cls, draw)` with
  stages `standalone:fold-a`, `standalone:fold-b`, `d1-wide-library:<fold>`; capture diagnostics
  `d1-wide-library:capture:<phase>`.
