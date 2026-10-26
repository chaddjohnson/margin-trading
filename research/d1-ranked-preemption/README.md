# D1 ranked preemption — standalone screening, frozen ETF priorities, causal preemption, joint pools

**Status: COMPLETE (2026-10-26). Decision: no advancement.** B4 stays the default and B5 the leading incumbent.
Nothing from this study was evaluated on any bar after 2023-12-29, nothing was nominated or registered, and **the
forward observation count is 0**. Nothing is committed; see `RESEARCH_RECOVERY.md` for the exact state.

The question: if each ETF's D1 strategy is first optimized alone, ETFs are ranked by a frozen standalone score, and a
higher-ranked signal may sell a lower-ranked open lot once that lot is at or above net breakeven (policy **P1**), does
the shared $100,000 slot earn more — with B5's books unchanged (**B**), with the top-5 standalone-ranked ETFs
(**C**), or with a jointly optimized pool (**D**) — than B5 under the original first-come allocator (**A**)?

**Answer: no.** P1 lowered B5's training net in every window and was inconsistent out of sample (fold-a +$24k,
fold-b −$49k / −$63k). Joint pools optimized with P1 earned $304k–$434k on their fold training windows but −$40k…+$24k
in validation, and broke the $35,000 drawdown ceiling in 2022–2023. No procedure passed both folds; none would have passed the
neighbourhood nomination gate either. Details: `FINAL_COMPARISON_AND_RECOMMENDATION.md`.

| | Final training net (E0, in-sample) | fold-a validation V (E2) | fold-b validation V (E2) |
|---|---:|---:|---:|
| A = B5 (P0) | $388,489 | $46,506 | $170,997 |
| B4 (P0) | $242,196 | $62,161 | $112,826 |
| B-R1 / B-R2 (B5 vectors, P1) | $334,495 / $354,960 | $70,462 / $71,062 | $121,764 / $107,540 |
| C-R1 / C-R2 (standalone-ranked, control) | $265,683 / $179,839 | $11,362 / −$2,622 | −$19,116 / $6,464 |
| D-R1 / D-R2 (joint, P1) | $543,069 / $431,110 | $22,944 / $24,209 | −$39,909 / $9,323 |

E0 = one training centre; E2 = reused, inspected chronological folds (not independent proof). Each fold row is that
fold's own independently trained picks; the final row is the final window's. Caveats: B4/B5 were chosen with
2016–2026 hindsight; four procedures were tested in two folds (multiple comparisons); nearly every switch assumes the
replacement is bought in the same minute as the sale (latency assumption).

## Reports

| File | Contents |
|---|---|
| `FINAL_COMPARISON_AND_RECOMMENDATION.md` | the decision, A/B/C/D × R1/R2 (net, minute DD, switches, costs 0/2/5/10, portfolio, per-symbol), what the evidence shows |
| `STANDALONE_SCREENING.md` | Stage A: all 61 ETFs per window, survivors / screened-down / rejected / unrankable, the B5 members alone |
| `FROZEN_PRIORITY_RANKINGS.md` | R1 (mean net per trade) and R2 (net per occupied day) per window, rechecks, stability |
| `OVERLAP_AND_PREEMPTION_DIAGNOSTIC.md` | refused signals and actionable opportunities under P0, collision matrices, realized switches, buffers |
| `JOINT_SEARCH_AND_DIVERSITY.md` | Stage D budgets, coverage, S/I/B arms, diversity, picks and their pool-specific vectors |
| `CHRONOLOGICAL_VALIDATION.md` | each fold's sealed picks, validation P&L and risk, gates, comparisons, year attribution, limits |
| `IMPLEMENTATION_AUDIT.md` | derived engine, parity, B4/B5 reproduction, data doors, tests, freezes, reviews, Git changes, compute |
| `PROTOCOL.md` + `PROTOCOL_FREEZE.json` | the frozen protocol (body `e7f6f5fa…`) and what it binds |
| `RESEARCH_RECOVERY.md` | the task checkpoint: stages, hashes, commands, guards |
| `brief/BRIEF.md` | the original brief, verbatim |
| `reviews/` | the three pre-freeze reviews and their dispositions; the final audit and its dispositions |

## Files

```
research/d1-ranked-preemption/
  standalone/<window>/<SYMBOL>.json          Stage A profile per ETF (61 per window)
  standalone/<window>/phenotypes/*.json      every library phenotype as a versioned JSON (130 / 142 / 156)
  rankings/<window>/R1.json, R2.json         the sealed rankings
  FROZEN_SELECTION.json                      the sealed selection (no advancement)
  results/
    audit/ benchmark/ baseline/ parity/      universe audit, compute tier, start hashes, parity gate
    code_freeze.json  amendments.jsonl       code freeze; one reporting amendment
    standalone/ rankings-check/ diagnostic/ joint/ controls/   sealed stage records (+ compressed archives)
    walkforward/<fold>/PICKS.json, VALIDATION.json; walkforward/PROCEDURE_GATE.json
    tables/*.md, summary.json                tables regenerated from the sealed records
    logs/                                    every stage and CLI run's output
  scripts/summary.py, joint_diversity.mjs    read-only report helpers
config/research-pools/d1-ranked-preemption/<window>/RP-<window>-<B|C|D|DB>-<R1|R2>.json   20 research-only pools
src/d1-ranked-preemption/                    the study code and its tests
```

Windows: **fold-a** training 2016-01-04 → 2020-06-30, validation → 2021-12-31; **fold-b** training → 2021-12-31,
validation → 2023-12-29; **final** training → 2023-12-29 (no validation). Books armed 2017-06-15.

## Rerunning the read-only reports

Use Node v24.21.0 (every command refuses another version):
`export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`. Run from the repository root.
These commands read the sealed records or the permitted data and write only under the git-ignored
`evaluations/ranked-preemption/` (or regenerate `results/tables/`); they never change a sealed record.

```sh
npm run ranked-preemption -- verify          # every freeze, sealed record, ranking, research pool and unchanged file
npm run ranked-preemption -- compare         # A/B/C/D × R1/R2 from the sealed records, all windows
npm run ranked-preemption -- tables          # regenerate results/tables/*.md from the sealed records
python3 -I research/d1-ranked-preemption/scripts/summary.py > research/d1-ranked-preemption/results/tables/summary.json
node research/d1-ranked-preemption/scripts/joint_diversity.mjs > research/d1-ranked-preemption/results/tables/joint-diversity.md
```

**Never rerun a stage command** (`audit`, `benchmark`, `freeze-protocol`, `parity`, `freeze-code`, `standalone`,
`rank`, `recheck-rankings`, `diagnostic`, `joint`, `controls`, `picks`, `validate`, `procedure-gate`, `select`,
`export-pools`): they are write-once and refuse, and the study is complete. `historical-check` refuses because there
is no nominee; it must not be forced.

## Commands I can run

```sh
# the incumbents, unchanged, on all data through 2026-10-13 (full funded-trade ledger, CSV + JSON export)
npm run ranked-preemption -- fixed B5
npm run ranked-preemption -- fixed B4 --cost-bps 10
npm run pools -- fixed B5                                        # the reference; identical ledger

# what is available
npm run ranked-preemption -- list
npm run ranked-preemption -- show RP-final-D-R1                  # a research pool (members, vectors, ranking)
npm run ranked-preemption -- show ranking:final:R2               # a frozen ranking, all 61 positions
npm run ranked-preemption -- show standalone:final:GDX           # one ETF's Stage A profile

# research pools and new configurations: limited to their window's training data
npm run ranked-preemption -- fixed RP-final-D-R1                 # ledger incl. priority_preemption exits
npm run ranked-preemption -- portfolio RP-final-D-R1             # the 20% portfolio
npm run ranked-preemption -- preemptions RP-final-B-R2           # every switch, decline, abort; collision matrix
npm run ranked-preemption -- fixed B5 --policy P1 --ranking final/R1
npm run ranked-preemption -- fixed B5 --policy P1-B500 --ranking final/R2 --cost-bps 10
npm run ranked-preemption -- fixed standalone:final:VGT          # one representative alone

# status
npm run ranked-preemption -- prospective                         # no registration; observations 0
npm run pools -- forward status                                  # the separate B4/B5 prospective freeze
npm run ranked-preemption -- verify
```

`--end` may shorten a run. A research pool or new configuration may read through its window's training end, or —
for a fold pool, once that fold's validation is sealed — through the validation end; never past 2023-12-29 (a later
date is refused). Each run prints the ledger, per-ETF totals, open positions, the reconciliation and drawdowns ($ and
% of $100,000). Research pools and P1 runs write `report.txt`, `trades.csv`, `trades.json`, `preemptions.json`;
B4/B5/B1 under P0 write the pools CLI's file set (no `preemptions.json`).

Known text quirks (the ledger header comes from the shared pools formatter, which is under the prospective freeze and
was not edited): for research pools the header says refused signals are in `signals.csv`, which these runs do not
write (refusals are in `preemptions.json` under `declines`); a portfolio run's header prints "per trade, never
compounded" with a blank notional, although the 20% portfolio sizes each trade from marked equity.

The research-pool JSONs (`config/research-pools/d1-ranked-preemption/`, written once by `export-pools`) carry
`evidence.grade: "E0/E1 training only"` and give the C pools `role: "procedure"`. The fold pools were in fact
evaluated in sealed validation (E2) and failed (`CHRONOLOGICAL_VALIDATION.md`), and C is a control, never
nominable. The files were left as exported; this paragraph and the validation records are authoritative.
