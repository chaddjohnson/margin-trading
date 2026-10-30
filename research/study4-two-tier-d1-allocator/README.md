# Study 4 — two-tier D1 capital allocation (shallow-dip specialists, frozen B5, preemption, joint optimization)

Study id `study4-two-tier-d1-shallow-deep-joint-allocator-v1`; branch `research/study4-two-tier-d1-allocator` (created
from the verified Study 3 Stage 1c head `9d9513bf`). Code `src/study4-two-tier-d1-allocator/`. Brief (verbatim):
`brief/CLAUDE_STUDY_4_TWO_TIER_D1_ALLOCATOR_SHALLOW_DEEP_JOINT_OPTIMIZATION.md` (sha256 `9cb40a09…`).

**Question.** Can lower-priority D1 phenotypes with shallower, more frequent dip entries, sharing B5's single funded
$100,000 margin slot, raise the net profit of the actual one-slot pool — mostly in time B5 would leave idle — while
preserving nearly all of B5's profitable deep-dip trades, within fixed-slot risk limits, net of preemption losses, and
robustly across chronological folds, neighbouring parameters, execution and costs?

## Result

**no nominee** (FINAL.json body `66a785d87bc76b85…`; completeness V2 incl. H: pass)

| Experiment | Chained label | Nominee rule |
|---|---:|---:|
| 4B | risk-incompatible | chained label: risk-incompatible |
| 4C | no demonstrated incremental benefit | chained label: no demonstrated incremental benefit |
| 4D-A | no demonstrated incremental benefit | chained label: no demonstrated incremental benefit |
| 4D-A0P | risk-incompatible | control (never nominated) |
| 4D-B | risk-incompatible | chained label: risk-incompatible |
| 4D-B0 | no demonstrated incremental benefit | control (never nominated) |
| 4D-C | risk-incompatible | chained label: risk-incompatible |
| 4D-C0 | risk-incompatible | control (never nominated) |

The chained accounts (each fold's sealed development pick trades its evaluation year; Δ versus B5's continuous run; 5 bps,
11%):

| Procedure | Δ 2020 | Δ 2021 | Δ 2022 | Δ 2023 | ΣΔ (carry) | ΣΔ (reset) | Minute DD | Daily DD | P&L pres. | Count pres. | Retention | Top-10 missed | Shallow lots | Shallow net | Idle-clean net | Label |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 4B | -$6,983 | -$17,409 | -$3,801 | $524 | -$27,669 | -$55,199 | $33,493 (33.5%) | $30,772 (30.8%) | 94.5% | 94.2% | 94.5% | 0 | 10 | -$8,820 | $1,906 | risk-incompatible |
| 4C | $6,385 | -$15,303 | -$28,421 | -$11,194 | -$48,533 | -$50,971 | $26,510 (26.5%) | $23,789 (23.8%) | 87.7% | 98.1% | 87.7% | 0 | 16 | -$903 | $7,826 | no demonstrated incremental benefit |
| 4D-A | $0 | -$15,956 | -$33,412 | -$17,969 | -$67,337 | -$49,319 | $27,596 (27.6%) | $25,659 (25.7%) | 90.9% | 88.5% | 90.9% | 0 | 29 | -$33,529 | -$30,560 | no demonstrated incremental benefit |
| 4D-A0P | $0 | -$13,485 | -$73,827 | $0 | -$87,312 | -$92,856 | $48,188 (48.2%) | $44,336 (44.3%) | 91.5% | 88.5% | 91.5% | 0 | 27 | -$62,562 | -$19,797 | risk-incompatible |
| 4D-B | -$60,099 | -$11,784 | -$105,302 | -$1,555 | -$178,741 | -$223,249 | $47,510 (47.5%) | $45,002 (45.0%) | 47.7% | 51.9% | 51.2% | 5 | 53 | -$44,418 | -$26,166 | risk-incompatible |
| 4D-B0 | $0 | $0 | $0 | -$13,140 | -$13,140 | -$13,140 | $26,510 (26.5%) | $23,789 (23.8%) | 96.8% | 98.1% | 96.8% | 1 | 0 | $0 | $0 | no demonstrated incremental benefit |
| 4D-C | $0 | -$21,042 | -$59,243 | -$21,483 | -$101,768 | -$114,825 | $38,653 (38.7%) | $32,674 (32.7%) | 86.0% | 88.5% | 86.0% | 1 | 33 | -$49,411 | -$16,688 | risk-incompatible |
| 4D-C0 | $0 | -$11,307 | -$96,724 | -$15,372 | -$123,403 | -$134,527 | $55,226 (55.2%) | $52,000 (52.0%) | 74.7% | 65.4% | 74.7% | 2 | 0 | $0 | $0 | risk-incompatible |

**In one line:** no shallow-dip tier, preemption policy or joint deep/shallow re-optimization beat B5 in the 2020–2023
chronological replays; there is no nominee (details and the brief's six questions:
`FINAL_COMPARISON_AND_RECOMMENDATION.md`). Every phase ran in every window and every 4D floor was spent, but 4A's
refinement fell 1.29% short of its vector floor in F21–F23 and H (disclosure D1, `AMENDMENTS.md`): the labels above are
the frozen rubric code's; under the protocol's literal V2 they would all read "invalid/incomplete" — the user decides
which reading binds. Neither reading changes the negative result.


## Evidence boundaries (read first)

- Only bars from 2016-01-04 through 2023-12-29 were used, through Study 4's bounded door (PROTOCOL §3). **No 2024, 2025
  or 2026 bar was parsed, used, hashed or evaluated** for any Study 4 purpose. Precisely: the door reads each file in
  1 MiB chunks and stops at the first line at or after the bound, so up to about 1 MiB beyond the bound (the first weeks
  of 2024, or of a development door's evaluation year) entered a memory buffer unparsed, and only the first 32 bytes of
  that first post-bound line (its timestamp) were decoded to detect the bound. The market-event configs
  (`splits.json`, `distributions.csv`, not bars) were parsed whole and their post-2023 entries filtered out.
- 2016–2023 had been inspected by earlier studies; the designer knew the 2018, 2020 and 2022 events and B5's 2022–2023
  outcomes. The fold results (2020, 2021, 2022, 2023, each chosen on the preceding years only and sealed before any
  evaluation year was computed) are **retrospective chronological forward-selection replays, not independent
  validation**. The full-history window H is in-sample description only.
- B5 itself was chosen with 2016–2026 hindsight; challengers that reuse B5's vectors inherit that (audit §5.7).
- Nothing here is prospective. B5, B4, their configs, phenotypes, the prospective shadow protocol and every earlier
  study are unchanged. No order, broker or live configuration was touched.

## Files

| File | Contents |
|---|---|
| `SOURCE_AND_CONFLICTS_AUDIT.md` | lineage, the exact B5 control and its anchors, the 61-symbol universe, prior studies, registered leakage, conflicts |
| `PROTOCOL.md`, `ENGINE_CONTRACT.md`, `SEARCH_PLAN.md`, `EXPERIMENT_MATRIX.json` | the frozen design (revision 2), `PROTOCOL_FREEZE.json` |
| `reviews/` | the two pre-freeze reviews (verbatim), their dispositions, and the final code-and-evidence review |
| `AMENDMENTS.md`, `results/amendments.jsonl` | every post-freeze change (A1–A5), with what it affected; A5 came after the evaluation door opened (disclosed) |
| `PHASE_4A_SHALLOW_D1_DISCOVERY.md` | 4A: coverage, bands, libraries, standalone and B5-idle economics |
| `PHASE_4B_FROZEN_B5_INTEGRATION.md` | 4B: B5 parity, B5 + shallow books under the idle-only allocator |
| `PHASE_4C_PREEMPTION.md` | 4C: the fifteen policies, switch ledgers |
| `PHASE_4D_MANDATORY_JOINT_OPTIMIZATION.md` | 4D-A/A0P/B/B0/C/C0: proof of coverage, picks, controls, ablations |
| `PHASE_4E_CHRONOLOGY_AND_ROBUSTNESS.md` | fold evaluations, chained accounts, perturbations, costs, stresses, null, rubric |
| `DEEP_TIER_TRADE_PRESERVATION_AND_IDLE_CAPITAL.md` | preservation of B5's trades, idle-capital attribution |
| `ALLOCATION_AND_TRADE_LEDGER.md` | representative ledgers; machine-readable ledgers in `results/ledgers/` |
| `FINAL_COMPARISON_AND_RECOMMENDATION.md` | the verdict, the answers to the brief's six questions, the next gate |
| `IMPLEMENTATION_AUDIT.md` | code, parity, doors, freezes, tests, compute, deviations |
| `RESEARCH_RECOVERY.md` | the task checkpoint |
| `results/` | sealed stage records (`<window>/<stage>/RECORD.json`), selections, parity, freezes, the evaluation and FINAL records, `tables/` (CSV + generated tables), `logs/`; `archive/` holds the git-ignored raw per-evaluation archives |

## Commands (repository root, Node v24.21.0: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`)

```sh
npm run study4-allocator -- status            # every freeze and sealed record, verified
npm run study4-allocator -- verify            # verify committed evidence (works on a fresh clone without archives;
                                              # it does not recompute the labels, despite its header comment)
npm run study4-allocator -- verify --raw      # also require and hash-check the raw archives (needs regeneration)
python3 -I research/study4-two-tier-d1-allocator/scripts/report.py   # regenerate tables, ledgers and reports from sealed records
(cd research/study4-two-tier-d1-allocator/results && python3 -I ../reviews/final_review_recompute.py)  # the reviewer's independent label recomputation
python3 -I research/study4-two-tier-d1-allocator/scripts/a5_diff_proof.py   # proves exactly what amendment A5 changed
```

The research stages are write-once and refuse to rerun once sealed: `parity-b5`, `parity-synthetic`,
`parity-reference synthetic|f20`, `freeze-code`, `develop <F20|F21|F22|F23|H>`, `freeze-evaluation`, `evaluate`,
`final`. Regenerating the raw archives means re-running `develop` in a scratch copy with the same code freeze (the
searches are deterministic); every sealed record lists its archive's sha256.

The Study 4 unit tests read synthetic data only:
`node --experimental-transform-types --disable-warning=ExperimentalWarning --test 'src/study4-two-tier-d1-allocator/tests/*.test.ts'`.
The repository-wide `npm test` reads full-history data files and must only be run in a data-less worktree.
