## Findings

- **Training figures collapse out of sample in every family and every fold.** The median training net of a
  fold's 10 picks was $31k–$88k. The median validation net was −$34.5k to +$20.5k.
- **The optimized picks lost to their own unoptimized defaults in 2020–2021 and 2023, and in 2022 for
  families 3 and 4.** Fold 1: 2/40 picks beat their family's default. Fold 3: 1/40. In fold 2 (2022),
  families 1 and 2 beat their defaults with 10/10 and 9/10 picks, but only because the defaults lost about
  $30k that year. Families 3 and 4, with no re-entry restriction, lost more than their defaults in the
  median.
- **Why it fails.** The training data reward a near-immediate entry: Y of 0.5%–1.4%, which almost neutralizes
  the trailing buy. That comes with tight stops (4%–5%) or very wide ones (9.8%–10.4%), short holds, and, in
  the later folds, very deep dips (X 17%–20%). In 2022 the low-Y, shallow-X picks re-enter repeatedly into a
  falling market. Without the restriction (families 3 and 4), nothing stops them, which is why those families
  lost most. In 2023 most fold-3 picks never armed (X ≈ 17%–20%; 6–9 of 10 per family had no entry). Their
  validation figure is $0 except for a position carried in from 2022 (family 4, pick 5: −$1,419 with no
  entry).
- **The deep-dip "low-DD" picks were the only consistently positive category in 2022**, at +$17k to +$23k in
  all four families. They were idle in 2023 and weak in 2020–2021. Their walk-forward total is still below
  each family's default for families 1, 3 and 4, and about equal for family 2.
- **Flat start versus continuous** changed little. A flat start removes carried positions; the largest change
  was fold 2, family 2's median (−$3.5k → +$1.5k).
- **`next-open` versus `stop` fills** moved the medians by less than $300. The fold picks rarely exit through
  an intraday stop at the stop level in these windows.
- **allIn.ts on the same windows:** +$55.4k (2020–2021), −$4.3k (2022), +$43.7k (2023), a total of $94.8k.
  That beats every stitched policy and every family default.
