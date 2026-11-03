# Study 3, Stage 1b — VGT momentum: executable chronology, exit/re-entry discovery, exposure control

Study `study3b-vgt-momentum-exits-exposure-chronology-v1`, a standalone continuation of Stage 1 on one VGT slot
($100,000 of cost per entry, 11% simple interest, 5 bps per side). Brief: `brief/BRIEF.md` (sha256
`c7b09fe8…a412079f`).

**Status: Stage 1b COMPLETE (final audit and dispositions in `reviews/`; commit and push recorded in
`RESEARCH_RECOVERY.md`). Verdict (frozen rubric): risk-incompatible — no candidate nominated.** Stages 2–4 and any
2024–2026 test are not authorised and were not run. Nothing was registered, promoted or changed outside this study.

## One-page outcome

- **Executable chronology.** Stage 1's annual "Σ +$253" was a splice of four policies' continuous runs; its 2022 window
  inherited a March 2020 E04 lot that no 2022 account could hold — a lot that was a **+$83,131 lifetime winner**, worth
  $236,944 at 2021-12-31, whose 2022 increment (−$33,954) gave back part of its unrealised gain. Run as a real account
  (S1: sell at the boundary, adopt the new pick), Stage 1's picks make **+$37,834** with a $36,672 drawdown; they still
  fail Stage 1's own rubric.
- **The new procedure** (13 entries, 11 independently optimised exit families incl. two invented, 10 re-entry rules, 4
  sizing overlays, 12 bounded pairings, joint-neighbourhood selection by return over drawdown; 794,623 evaluations) was
  frozen and reviewed before any market-data run. Its executable path **Π1** made 2020 +$14,432, 2021 +$18,059, 2022
  −$30,966, 2023 +$11,049: **Σ +$12,573, chained minute drawdown $42,882** > $35,000 → risk-incompatible; it also fails
  profit, exposure-matched excess, perturbation and winner-dependence items, and every rubric control and always-long
  reference earned more.
- **What did work, in-sample only:** protective exits (volatility trails, two-layer with profit ratchet, tight trails
  near D1's 7.3% for the calm-advance entry) with monthly exposure trimming are robust optima of 2017–2023 (e.g.
  +$112,782 at $15,031 DD for the H pick). The fold-C optimum's whole neighbourhood lost in 2022: regime failure, not a
  parameter spike. Exposure drift is solved by trimming; it was not the cause of Π1's 2022 loss (fresh entries into
  bear-market rallies were).
- **The secondary objective (Π-NET)** made +$50,533 at $18,015 DD but fails the exposure-matched and control-margin test
  — and choosing it now would be hindsight.

## Reports

| File | Contents |
|---|---|
| `FINAL_COMPARISON_AND_RECOMMENDATION.md` | verdict, rubric items, answers, limits, recommendation, next gate |
| `EXECUTABLE_ANNUAL_SELECTION.md` | Stage 1 splice reconciled, S1/S2/S3 semantics, Stage 1 and 1b executable paths, the 2020→2022 lot |
| `EXPOSURE_AND_POSITION_SIZING.md` | self-financing account, trims, counterfactuals on the lot, L-D sizing, exposure vs passive |
| `ENTRY_EXIT_ABLATIONS.md` | the 13 × 20 entry × exit matrix, controlled comparisons |
| `EXIT_OPTIMIZATION.md` | 11 exit families × 4 entry controls × 5 histories, champions, tight vs wide, invented families |
| `REENTRY_AND_CAMPAIGNS.md` | opportunity counts, rules, the gate, campaigns |
| `JOINT_COMBINATIONS.md` | the 12 pairings per history, picks, eliminations, budgets |
| `NEIGHBORHOOD_AND_CHRONOLOGY.md` | OAT and joint neighbourhoods (development and next window), perturbed paths, stresses |
| `TRADE_LEDGER_AND_RISK.md` | Π1's trades, decomposition, 2022, giveback, the lot's calendar trace |
| `IMPLEMENTATION_AUDIT.md` | Git, freezes, hashes, parity, guards, tests, reviews, deviations |
| `RECOVERY_POLICY_MAIN_INTEGRATION.md` | the policy-only `main` commit and the fresh-session autoload test |
| `PROTOCOL.md`, `ENGINE_CONTRACT.md`, `EXPERIMENT_MATRIX.json`, `PROTOCOL_FREEZE.json`, `AMENDMENTS.md` | the frozen design and its one pre-outcome amendment |
| `reviews/` | methodology reviews 1–2, re-review 3, dispositions, superseded drafts, reference-engine brief and notes, parity log, final audit |
| `results/records/`, `results/payloads/`, `results/tables/` | sealed records, payloads (archives, ledgers, daily rows), readable tables |
| `RESEARCH_RECOVERY.md` | the task checkpoint |

## Reproducing (repository root; Node v24.21.0; local `data/VGT/data.csv`, sha256 `d8e6991d…`)

```sh
sh research/study3-vgt-momentum-stage1b/scripts/study3-momentum-stage1b.sh status   # stages and whether they verify
sh research/study3-vgt-momentum-stage1b/scripts/study3-momentum-stage1b.sh verify   # freezes, body hashes, payloads
python3 -I research/study3-vgt-momentum-stage1b/scripts/report_tables.py            # regenerate results/tables/ (read-only)
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study3-vgt-momentum-stage1b/tests/engine.test.ts
```

Write-once stages (each refuses to overwrite and verifies its predecessors and both freezes): `stage audit`,
`freeze-protocol`, `parity`, `freeze-code`, `develop A`…`D`, `develop H`, `repair`, `evaluate`, `robustness`,
`analysis`. All are deterministic (seeds from sha256 labels); a rerun needs the same data file and a fresh copy of the
study tree. Command logs (`results/logs/`) are git-ignored.
