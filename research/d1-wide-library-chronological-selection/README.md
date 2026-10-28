# Broad D1 phenotype libraries and chronology-aware selection (Study 1 of 3)

Study `d1-wide-library-chronological-selection-v1`. Question: did the earlier standalone D1 optimizers discard valuable
phenotypes too aggressively (training-winner bias, the best-trade deduction), and can a wider, behaviourally diverse
training library plus a disciplined chronological selection procedure do better in the next window than the original
narrow selection?

**Status: COMPLETE. Outcome (predeclared rules): no demonstrated improvement; validation-based selection was worse.**
Study 2 (all-61 D1 timing/occupancy complementarity) **not started**; Study 3 (independent momentum-entry strategy)
**not started**. Nothing was promoted, registered or changed in any pool, phenotype, default or prospective protocol.

## One-page outcome

- **The archive was narrow and the best-trade deduction did displace right-tail profiles** (training only): in 89–93%
  of ETFs one family of local-search clones held at least half of the old top 32 (all of it in 22–29 ETFs); the old
  procedure considered ~1.5 (fold-a) to 1.7 (fold-b) behaviours per ETF; 44 (fold A) / 77 (fold B) families in 33 / 40
  ETFs were displaced by the best-trade term, drawing a median 74% / 82% of their training net from one trade
  (`SOURCE_ARCHIVES_AND_SELECTION_BIAS.md`).
- **Wider libraries did not generalize better.** Over folds A (2020-07 → 2021-12) and B (2022-01 → 2023-12), three
  broad arms × four pools × four library sizes against the narrow baseline: no arm "improves" on any pool; 6 of 12
  verdict cells are "demonstrably worse or risk-incompatible"; every favourable fold was reversed in the other fold
  (`CHRONOLOGICAL_FOLD_COMPARISON.md`). The tail-compatible objective (A2) amplified the regime: better than A0 in the
  2020–21 rebound, far worse in the 2022–23 bear market. The displaced right-tail families did the same.
- **Which verdicts decide:** the outcome applies PROTOCOL §9.4 to the 12 within-ETF verdicts. Across ETFs (each arm's
  top 5 of 61 by training score vs the baseline's top 5) 1 of 12 cells "improves" (NEW-S A3, whose within-ETF verdict
  is "worse"), 3 are "worse" and 8 "mixed"; nested across-ETF: T1 mixed on both pools, T2 worse on 3 of 4. Were
  §9.4(3)'s "'improves' on a pool other than ARCH" read as including the across-ETF label, the outcome would be
  "mixed / inconclusive" — not an improvement (`MULTIPLE_TESTING_AND_EVIDENCE_LIMITS.md` §4).
- **Validation-based selection was worse** (T1/NEW primary cell): picks averaging +$25k in the selection window lost
  −$5.5k on average in the next (`NESTED_SELECTION_AND_LATER_EVALUATION.md`).
- **More choice, not better choice:** nominees did about as well as a random member of their own library; the
  training-score-to-window rank correlation inside libraries is ≈ 0; a $35,000 training drawdown gate did not bound
  2022–23 drawdowns (8–17 breaches per arm) (`DIP_EVENT_CAPTURE_AND_TAIL_RISK.md`,
  `MULTIPLE_TESTING_AND_EVIDENCE_LIMITS.md`).
- Recommendation: keep the narrow selection as the reference; adopt none of A1–A4; next, Study 2 then Study 3
  (`FINAL_COMPARISON_AND_RECOMMENDATION.md`).

**Evidence level:** retrospective, period-correct method replay on inspected history (2016-01-04 → 2023-12-29). Each
procedure read only data through its own cutoff (enforced by a calendar door and fail-closed chronology checks), but
the windows were inspected before, A0's fold outcomes were published (and read by the designer before the protocol),
and archived outcomes were derivable by subtraction — ARCH results are the weakest evidence. The procedures' design was
informed by that history (thresholds from earlier studies; the family diameter d ≤ 0.5 chosen after a pre-freeze fold-a
census), and a training-only S18 dry run (through 2018-12-31, structural counts only, reproduced byte for byte by the
official run) preceded the freeze (PROTOCOL §0, §6.2); only the procedures' execution was blind to each window. No bar
after 2023-12-29 was read for any candidate; forward observations: 0.

## Reports

| File | Contents |
|---|---|
| `PROTOCOL.md`, `PROTOCOL_FREEZE.json` | the frozen protocol v2.1 (folds, pools, arms, K, budgets, seeds, rules, order, amendments) |
| `LIBRARY_SELECTION_RULES.md`, `EXPERIMENT_MATRIX.json` | the operational rules and the machine-readable matrix |
| `SOURCE_ARCHIVES_AND_SELECTION_BIAS.md` | 61-ETF census of three archives, reconstruction 0 mismatches, A0 61/61, the old penalty's impact, discarded audit and its later behaviour |
| `LIBRARY_CONSTRUCTION_AND_DIVERSITY.md` | families, support, K coverage, draws, power, provenance, seeds |
| `NEW_SEARCH_FEASIBILITY_AND_RESULTS.md` | triggers, budget (413,280 evaluations), parity 9,330/0, determinism, pools compared |
| `CHRONOLOGICAL_FOLD_COMPARISON.md` | folds A/B: every pool × arm × K, verdicts, across-ETF, ablations, rolling track, references |
| `NESTED_SELECTION_AND_LATER_EVALUATION.md` | T1/T2, A4's picks and their later results |
| `DIP_EVENT_CAPTURE_AND_TAIL_RISK.md` | event capture, falling knives, tails, costs, robustness of winners, portfolio overlay |
| `MULTIPLE_TESTING_AND_EVIDENCE_LIMITS.md` | degrees of freedom, winner's curse, inspected history, survivorship, open issues |
| `FINAL_COMPARISON_AND_RECOMMENDATION.md` | the answer to each question and the recommendation |
| `IMPLEMENTATION_AUDIT.md` | tests, parity, freezes, isolation, reviews and dispositions, incidents |
| `RESEARCH_RECOVERY.md` | the task checkpoint |
| `reviews/` | the methodology review, the confirmatory review and the final audit (verbatim) with dispositions; superseded v1 documents |
| `results/` | sealed stage records, library member records, per-vector window records, tables (`results/tables/*.md|csv`; the ledgers list lots *entered* in each window, `ledger-reconciliation.csv` adds the carried-in lot's share of V, `event-families.csv` is the by-family export), logs (local only) |
| `scripts/` | `run-stages.sh` (the stage order as run), `summary.py`, `reconcile_ledgers.py`, `event_families.py` (read-only reporting) |

## Reproducing (repository root, Node v24.21.0; local data only; no `.env`, network or broker)

Read-only commands (they read sealed records and write only under the git-ignored `evaluations/d1-wide-library-selection/`):

```sh
npm run d1-library-study -- verify            # freezes, every sealed record, stamps, chronology, hashes, budgets
npm run d1-library-study -- status            # every stage record and whether it verifies
npm run d1-library-study -- inventory         # archive census and new-search summary
npm run d1-library-study -- methods           # arms, pools, K, decision rules
npm run d1-library-study -- folds             # folds and triples with their seals
npm run d1-library-study -- compare --fold A  # also --fold B | S18 … S22 | T1-later | T2-later, --pool, --library-size
npm run d1-library-study -- nested
npm run d1-library-study -- show --symbol VGT --fold B --method A2 --library-size 16 --pool ARCH
npm run d1-library-study -- discarded --symbol GDX --fold A
python3 -I research/d1-wide-library-chronological-selection/scripts/summary.py
python3 -I research/d1-wide-library-chronological-selection/scripts/reconcile_ledgers.py   # writes results/tables/ledger-reconciliation.csv
python3 -I research/d1-wide-library-chronological-selection/scripts/event_families.py      # writes results/tables/event-families.csv
```

The one-time stages (`search`, `sample-parity`, `libraries`, `reconstruct`, `census`, `evaluate`, `nested-select`,
`analyze`, `tables`, the freezes) are write-once, verify both freezes, and refuse to rerun or to open a later window
early; `scripts/run-stages.sh` ran them in calendar order.

**What the commit holds.** Every sealed stage record (freezes, amendments, census and reconstruction summaries, search
summaries, parity samples, selections, nested selections, evaluations with their event catalogs, the analysis); every
library's member records (`results/libraries/*/members-*.json.gz`: each member's training metrics, family and
provenance); every evaluated vector's window V, drawdowns and lots at 0/2/5/10 bps
(`results/evaluation/*/fast.jsonl.gz`); the full-engine nominee rows with lots, captures and capture draws
(`engine.jsonl.gz`); and the tables. From these alone
a reader can recompute every training-only nominee and A0r pick, A4's nested picks, every paired comparison, verdict and
the study outcome, the discarded-group audit, the library random-pick, oracle and rank-correlation diagnostics, and the
ledger reconciliation and by-family exports — without trusting a narrative summary.

**What it does not hold** (git-ignored; about 149 MB; each file's sha256 is in the tracked sealed records): the
training candidate rows, `results/archive/*/candidates.jsonl.gz` (the 137–140k re-evaluated archive rows per window)
and `results/search/*/candidates.jsonl.gz` (the 413,280 new-search vectors). They are needed only to rebuild the
families and libraries from scratch and to recheck the census and the new search; that needs the canonical minute data
(local, not versioned) and a fresh copy of this study tree (the stages refuse to overwrite sealed records), and
reproduces them byte for byte (the S18 dry run and its official run did). Command logs (`results/logs/`) stay local;
their outcomes are summarized in `IMPLEMENTATION_AUDIT.md`.
