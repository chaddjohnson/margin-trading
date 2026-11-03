# Study 3, Stage 1c — D1-inspired protection rules for standalone VGT momentum: full entry × exit × rule-mask matrix

Study `study3c-vgt-momentum-d1-protection-matrix-v1`. One VGT slot ($100,000 of cost per entry, 11% simple interest
on a net-debit account, 5 bps per side, price-only). Brief: `brief/BRIEF.md` (sha256 `c68bb4fb…fedcef`).

**Status: Stage 1c COMPLETE — every stage sealed; independent final audit `reviews/FINAL_AUDIT.md` (verdict
supported; reporting findings fixed per `reviews/FINAL_AUDIT_DISPOSITIONS.md`). The branch commit and push are recorded
in `RESEARCH_RECOVERY.md`. Verdict (frozen rubric): no demonstrated edge — no candidate nominated.** No 2024–2026 bar
was read; Stages 2–4 and any validation were not started.

## One-page outcome

- **The verdict path Π1** (annual S1 account, picks sealed from training data only) made 2020 +$23,749, 2021 +$18,148,
  2022 −$6,415, 2023 +$16,186: **Σ +$51,669 with a $24,193 chained minute drawdown** (peak 2021-11-22, trough
  2022-05-20) — better than Stage 1b's Π1 (+$12,573 / $42,882) and Stage 1's executable path (+$37,834 / $36,672). It
  passes validity, evidence, risk, profit, the 2022-protection item and the five rubric-(h) stresses (the 0 bps cost
  stress, outside the rubric, gives +$9,831 with a $51,541 drawdown), but **fails** the controls/exposure item (margin
  over the C-SMA trend filter +$2,673 < $5,000; one excess window), the perturbation item (58.6% of perturbed paths both
  positive and within $35k; needs 75%) and the giveback item (0.61). Label: **no demonstrated edge**; nomination: none.
- **Did the D1-inspired rules help?** On Π1's own picks, removing the rules turns 2022 into −$46,766 and the drawdown
  into $56,063 — but that gain is an A (losing hold) × B (cooldown) interaction (each alone hurt; C was inert), it holds
  in only 34% of paired perturbations, and the fold-C pick's whole 2022 neighbourhood lost money. In one retrospective,
  target-year-informed replay and its parameter perturbations, the rules cut drawdown (62% of perturbed paths within
  $35k vs 0% without the rules) but not profit (median +$21,845 vs +$26,688). 2022 statements are
  **(target-year-informed)**.
- 5,114,598 configurations (2,400 structural cells × 5 histories, deep refinement, ablations, paths, stresses).
- All four binding picks sit in training-only widened parts of their boxes (one at a natural limit), consistent with the
  perturbation item failing. Two annual-reset control rows (C-ALR, C-ALZ1) are degenerate and omitted (amendments A2,
  A3); no rubric item uses them.

## Reports

| File | Contents |
|---|---|
| `FINAL_COMPARISON_AND_RECOMMENDATION.md` | verdict, rubric items, answers, limits, recommendation, next gate |
| `PROTECTION_RULE_ABLATIONS.md` | A/B/C and combinations: knock-outs, mask picks, fixed parents, twins, sensitivities |
| `ENTRY_EXIT_MATRIX_AND_OPTIMIZATION.md` | all 2,400 cells, coverage, budgets, deep refinement, picks |
| `CHRONOLOGICAL_SELECTION_AND_2022.md` | forward-only A–D selection; 2022 trades, counterfactuals, upper bounds |
| `NEIGHBORHOODS_AND_GENERALIZATION.md` | J128 / OAT / grids, perturbed paths, stresses, legs |
| `ENTRY_EXIT_REENTRY_INTERACTIONS.md` | which mechanisms complement, rule interactions, alternative explanations |
| `TRADE_LEDGER_AND_RISK.md` | ledgers, MAE, drawdowns, exposure, financing, rule events |
| `IMPLEMENTATION_AUDIT.md`, `AMENDMENTS.md`, `reviews/` | lineage, embargo incidents, freezes, parity, tests, reviews, audit |
| `PROTOCOL.md`, `ENGINE_CONTRACT.md`, `EXPERIMENT_MATRIX.json`, `MECHANISM_CATALOG.md`, `PROTOCOL_FREEZE.json` | the frozen design |
| `results/records/`, `results/payloads/`, `results/tables/` | sealed records, payloads, regenerable tables (incl. the H Pareto set `pareto-H.md`, rule × stop grids, ledgers with fills) |
| `RESEARCH_RECOVERY.md` | the task checkpoint |

## Scope

Twelve Stage 1 entry families × thirteen exit families (Stage 1b's eleven, the tight-trail XF-T and the new
D1-style profit-conditional trail XN) × the own-OUT contract (replace / OR; XO retains) × all eight on/off masks of
three optional rules — **A** maximum losing hold checked at session opens (D1 `primary`'s 8-day rule, generalised and
searched), **B** post-loss cooldown, **C** post-material-loss recovery level — = 2,400 structural cells, each searched
numerically (256 Sobol points + references + 4 centers × J17 per history), with training-only deep refinement of the
best pairs (all eight masks of a pair matched, common random numbers), fixed-parent rule-only ablations, and
forward-only annual selection for 2020 (A), 2021 (B), 2022 (C), 2023 (D), plus an in-sample 2017–2023 history (H).
No 2024–2026 data was read; nothing outside this study's two directories changed; nothing was registered or traded.

## Reproducing (repository root; Node v24.21.0; local `data/VGT/data.csv`, Stage 1b's loaded-bar hashes)

```sh
sh research/study3-vgt-momentum-stage1c/scripts/study3-momentum-stage1c.sh status   # stages and whether they verify
sh research/study3-vgt-momentum-stage1c/scripts/study3-momentum-stage1c.sh verify   # freezes, body hashes, payloads
python3 -I research/study3-vgt-momentum-stage1c/scripts/report_tables.py            # regenerate results/tables/ (reads records only; fails closed)
python3 -I research/study3-vgt-momentum-stage1c/scripts/make_matrix.py              # regenerates EXPERIMENT_MATRIX.json (identical)
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study3-vgt-momentum-stage1c/tests/rules.test.ts
```

Write-once stages, in order (each verifies its predecessors and both freezes, one data door per process): `stage
audit`, `stage freeze-protocol`, `stage parity`, `stage freeze-code`, `stage develop A|B|C|D|H`
(`scripts/run-develop.sh` runs all five), `stage evaluate`, `stage robustness`, `stage analysis`. Everything is
deterministic (seeds from sha256 labels, `EXPERIMENT_MATRIX.json` `streams`); a rerun needs the same data file and a
fresh copy of the study tree. The per-evaluation archives (`results/payloads/develop-*/archive.jsonl.gz`, 80–150 MB
each) are git-ignored; their sha256 is in each develop record and a rerun regenerates them bit for bit. **On a fresh
clone** the develop records still list those archives as payloads, so `status` reports develop-A…H as BROKEN and
`verify` fails on the missing archives — every other payload verifies; `report_tables.py` regenerates every table
except `diag-2022.md`, which needs the archives and is left as committed (the script prints a notice). Rerunning the
develop stages in a fresh copy of the study tree restores the archives. Never run the project's `npm test` in a
checkout that holds `data/` (PROTOCOL §1.6b); use a data-less worktree.
