# Entry, exit and re-entry interactions

Sources: `results/tables/matrix-grids.md`, `families.md`, `deep-masks.md`, `develop.md`, `cells-<h>.csv` (rule
activity), `paths.md`, `ledgers.md`, the knock-outs. The study evaluated 5,114,598 configurations (5,111,641 in
development).

- **Complementary mechanisms that won folds:** intraday trailing-buy entries (E09) and CUSUM drift (E04) with
  profit-retention (XRP) or two-layer trend/ratchet exits (XT); drift (E02) with the exposure-scaled trail (XE); the
  renewable-permission entry (E11) with XRP in-sample. Calm advance (E06), Stage 1/1b's favourite, never won a fold.
- **Rule activity by exit and entry** (median share of first-pass vectors in single-rule cells where the rule acted,
  `cells-<h>.csv`): A acts with every exit, most often with XN, XF-T, XP and XV (≥ 81% in every history) and least
  often with XRP (68–80%) — the exit of three of the five picks. B acts on every E09 vector (its minute rule would
  otherwise re-enter right after a stop) and on 69–81% of E06 vectors, but on only 37–45% of E10 vectors and 23–35% of
  E08 vectors. C is mostly inert because R3F re-entries already require a close above the stopped trade's high. Acting
  is not helping: A-only cells lost against their twins in four of five histories (`PROTECTION_RULE_ABLATIONS.md` §3).
- **A × B is the effective combination on the verdict path; each alone hurt** (A only Σ +$18,562; B only −$4,235).
  The combination's whole gain over the rule-free picks is in 2022 (+$40,351; it lost $14,135 in the other three
  years) **(target-year-informed)**.
- **Missed recoveries:** the rules gave up $14,135 of 2020/2021/2023 profit versus the rule-free picks. In 2021 rule A
  sold twice at a losing open (trade 5, −$714 on 2021-03-04; trade 6, −$106 on 2021-05-19), while the rule-free path
  held its 2021-01-05 adoption entry to the 2022 transition for +$21,108.
- **Inert rules:** C-only masks are largely copies of 000 (a median 91% of first-pass vectors identical to their
  rule-free twins in history A); entry- and exit-family marginals per history are in `families.md`.
- **Alternative explanations:** the 2022 improvement can be explained by fewer, later re-entries during a falling
  market — timing that a simple trend filter also provides: C-SMA annual reset lost $28,492 in 2022 and ended 2020–2023
  at +$48,996, only $2,673 below Π1 (+$51,669), short of the $5,000 margin by which the rubric requires Π1 to beat it —
  rather than by a durable loss-management skill **(target-year-informed)**; the perturbation results support this
  reading.
