# Study 3, Stage 1 — VGT momentum from first principles (standalone)

Study `study3-vgt-independent-momentum-v1`. Question (brief §1): can a simple, executable long-only rule on VGT
recognise ongoing upward movement, enter without an earlier deep decline, stay in trends or renew after exits, and
control downside and financing drag across regimes — on one fixed $100,000 borrowed slot, after 11% simple interest,
5 bps per side and execution stress?

**Status: Stage 1 COMPLETE. Verdict (frozen rubric): no demonstrated standalone edge.** Stages 2–4 (VGT D1 + momentum,
B4 + momentum, B5 + momentum) are **not authorised and not started**. Nothing was registered, promoted or changed in any
pool, phenotype, config, data file or earlier study.

## One-page outcome

- **The procedure** — twelve entry families invented before any test (`FIRST_PRINCIPLES_AND_HYPOTHESES.md`), M1 gates,
  a capped Sobol search per family (66,366 evaluations), neighbourhood-median champions, and a cross-family pick P\*. It
  was frozen before any result and replayed fold by fold, each selection sealed before its window was loaded. The four
  windows returned **+$18,608 (2020), +$14,577 (2021), −$57,578 (2022), +$24,646 (2023): Σ +$253**. The 2022 window drew
  down $63,078, and the chained path $63,569, against the $35,000 reference (`CHRONOLOGICAL_RESULTS.md`).
- **No timing edge.** Against an always-long slot scaled to the picks' principal exposure, the picks added −$52,820. Every
  conventional control earned more over the same windows: C-SMA +$44,098, C-TSM/TPL +$32,180, C-DON +$21,744. The
  best untuned default per fold (no search) made −$11,890, so the search added +$12,142 but not enough to matter
  (`FINAL_COMPARISON_AND_RECOMMENDATION.md`).
- **Why 2022 hurt.** More than half of the 2022 loss (−$33,954) was one lot still held from the COVID crash (filled 2020-03-16, five
  sessions before the closing low). Under
  the fixed-share convention its exposure had grown to $236,944, 2.37× the slot. The search favoured long holds with
  wide trailing stops, because 2017–2021 paid for staying in.
- **What did work, descriptively.** Momentum rules enter calm advances that D1 cannot reach (2017, 2019, 2021, 2023; D1
  opened no lot in 2023). E06 was in the panel partly because Study 2 found D1 idle in such advances, 2023 included —
  design knowledge, disclosed. The in-sample full-history pick (E06 calm advance) made +$120,096 over 2017–2023 with a
  $25,809 drawdown. That pick sits on a narrow parameter peak (joint-neighbourhood median +$74,079), and the procedure
  that produced it failed the chronological replay (`STANDALONE_RISK_AND_EXECUTION_STRESS.md`).
- **Exits and re-entry.** Slow structural exits beat tight trails in-sample. Probation and time exits failed. For the
  fold picks, re-entry rules mattered only in 2022, where every renewal rule lost more than "no re-entry" (`EXIT_MECHANISM_STUDY.md`,
  `REENTRY_AND_CAMPAIGN_ANALYSIS.md`).

**Evidence level:** retrospective, chronology-respecting replays on 2016–2023 history that earlier studies inspected and
the designer knew; no bar after 2023-12-29 entered any computation; no significance is claimed.

## Reports

| File | Contents |
|---|---|
| `FINAL_COMPARISON_AND_RECOMMENDATION.md` | verdict, answers, controls, what cannot be inferred, recommendation, the later-gate plan |
| `CHRONOLOGICAL_RESULTS.md` | fold-by-fold replay, window ledger, regimes, generalisation failure, limits |
| `STANDALONE_DISCOVERY_AND_OPTIMIZATION.md` | M1 prototypes, gates, the search, compute, failed families |
| `EXIT_MECHANISM_STUDY.md`, `REENTRY_AND_CAMPAIGN_ANALYSIS.md` | M2 ablations (descriptive) |
| `TREND_CAPTURE_AND_MISSED_OPPORTUNITIES.md` | hindsight legs, capture, entry delays, 2023, D1-idle diagnostics |
| `STANDALONE_RISK_AND_EXECUTION_STRESS.md` | R0 stresses, finalists, costs/rates/slippage/delays/missing bars, neighbourhoods, placebos, dividends, breaches |
| `CANDIDATE_REGISTER.md` / `.json` | research-only champions with exact signatures (nothing promoted) |
| `FIRST_PRINCIPLES_AND_HYPOTHESES.md`, `MECHANISM_CATALOG.json`, `MECHANISM_SELECTION.md` | diagnosis, 20 mechanisms (5A), critique (5B), selection (5C), exact rule definitions |
| `PROTOCOL.md` v1.2, `PROTOCOL_FREEZE.json`, `EXPERIMENT_MATRIX.json`, `AMENDMENTS.md` | the frozen protocol, its freeze, the run matrix, the one (descriptive) amendment |
| `SOURCE_AUDIT.md`, `DATA_AND_BASELINE_PARITY.md`, `IMPLEMENTATION_AUDIT.md` | sources, Study 1/2 constraints, tests, data QA, D1 anchor, parity, freezes, hashes, reviews |
| `reviews/` | methodology review 1, re-review 2, the final code/evidence review (verbatim) and dispositions; superseded drafts |
| `RESEARCH_RECOVERY.md` | the task checkpoint |
| `brief/BRIEF.md` | the assignment, byte for byte (sha256 `aa09a2e9cfa8a1780a835fd3675b483d8067c107af926448cec73417820cc103`) |
| `results/records/`, `results/payloads/` | every sealed stage record and its gzip payloads (incl. the full search archives) |
| `results/tables/` | readable tables generated read-only from the sealed records |

## Reproducing (repository root; Node v24.21.0; local canonical `data/VGT/data.csv`; no `.env`, network or broker)

Read-only:

```sh
npm run study3-momentum -- status                 # every stage and whether its record verifies
npm run study3-momentum -- verify                 # freezes, record body hashes, payload sha256s
npm run study3-momentum -- timing                 # engine speed on a synthetic path (no market data)
python3 -I research/study3-vgt-momentum/scripts/report_tables.py   # regenerate results/tables/ and the register
node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/study3-vgt-momentum/tests/*.test.ts'
```

Write-once stages, in the enforced order (each refuses to overwrite and verifies its predecessors and both freezes):
`stage audit`, `stage freeze-protocol`, `stage parity`, `stage freeze-code`, `stage develop A`, `B`, `C`, `D`, `H`,
`stage evaluate A`, `B`, `C`, `D`, `stage diagnostics`, `stage robustness`, `stage analysis` (all via
`npm run study3-momentum -- …`). Every stage is deterministic: seeds come from sha256 of fixed labels. A rerun needs
the same data file (sha256 `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09`) and a fresh copy of
this study tree.

**What the commit holds:** every sealed record and payload (search archives, trade ledgers, daily marks, M2/M5 runs),
the tables, the reports, the code and its tests. **Not committed:** the canonical minute data (`data/` is git-ignored;
its sha256 is in every record's door) and the command logs in `results/logs/` (git-ignored by the repository's `logs/`
rule; their outcomes are summarised in `IMPLEMENTATION_AUDIT.md`).
