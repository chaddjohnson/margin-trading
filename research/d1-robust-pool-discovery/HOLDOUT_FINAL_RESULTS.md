# Holdout and final-window results (PROTOCOL.md §15.3) — 2026-10-25

**No configuration from this study was evaluated after training.** The frozen selection (`FROZEN_SELECTION.json`,
body `2b56ed01…`, frozen 2026-10-25T21:39:36Z) records:

> no advancement — the selection procedure showed no forward persistence inside training (G-WF failed)

It holds no nominee. The procedure gate failed in both folds:
- **fold-a:** the robust arm's pick finished at the 40th percentile of random controls.
- **fold-b:** the robust arm produced no pick.

By §13.4 and §14 nothing may be nominated whatever G1–G8 say, and nothing opens the 2024-01-02 → 2026-10-13 window
for this study's configurations (WALK_FORWARD_RESULTS.md).

`npm run robust-d1 -- evaluate` therefore wrote only its no-advancement record, `results/evaluation/evaluation.json`
(2026-10-25T21:45:22Z), with `manifestHash` equal to the frozen selection's body hash:

> The frozen selection holds no nominee: nothing is evaluated after training; the benchmarks are retained.

`evaluate --confirm` is refused when there is no nominee, so there is no deterministic re-run to record. The C1–C4
rules were not applied to anything.

**The final round's one passing finalist was not evaluated.** GDX KRE XBI XLE passed G1–G8 on training and would have
been the primary nominee had G-WF passed. Its post-2023 performance is unknown to this study and was deliberately not
computed. Reporting it would be exactly the "one more look" §23 forbids. Training figures are in
NEIGHBORHOOD_ROBUSTNESS.md and `results/tables/final.md`.

**The benchmarks are retained** as previously recommended. Their post-training figures were already part of the
inspected record before this study, and they appear again only as comparators in RETROSPECTIVE_R1_R4.md.
- **B5:** All-lowDd plus the GDX `portfolioAware` book, the current recommendation.
- **B4:** All-lowDd.

**Dividend diagnostic (§16).** Not run: it applies to nominees and benchmarks in the locked confirmation, which did not
take place. Since amendment 2, `evaluate` refuses nominees until that diagnostic exists.
