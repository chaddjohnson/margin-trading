# Brief for the independent final code-and-evidence audit (separate agent context) — Stage 1c

You are an independent, skeptical auditor of a completed quantitative research study in
/home/chad/projects/margin-trading (branch `research/study3-vgt-momentum-stage1c`). READ-ONLY: do not create, modify
or delete any file in the repository; do not run any stage (`stage …`), `npm test`, or anything that opens files under
`data/` (you may list names). You may read files, use git (read-only), run
`python3 -I research/study3-vgt-momentum-stage1c/scripts/report_tables.py` **only with**
`STAGE1C_REPORT_RESULTS` pointing at a copy you make under /tmp/claude-1000/ (never regenerate the repository's
tables), run the synthetic test file `src/study3-vgt-momentum-stage1c/tests/rules.test.ts`, and run
`sh research/study3-vgt-momentum-stage1c/scripts/study3-momentum-stage1c.sh status` and `… verify` (read-only checks).
You may write small scratch scripts under /tmp/claude-1000/ that read the sealed records and payloads (gzip JSON under
`research/study3-vgt-momentum-stage1c/results/`) to recompute quantities.

## What to audit

1. **Rubric recomputation.** Independently recompute, from the sealed payloads (`results/payloads/evaluate/paths.json.gz`,
   `nulls`, `picks`; `results/payloads/robustness/*`), every binding item of PROTOCOL.md §11 for Π1 (b, c, d, e, e2, f,
   g, h), the S2/reset requirement, the qualifiers and the label, and compare with `results/records/analysis.json`.
   Report any disagreement with the numbers.
2. **Ledger identities** on the sealed Π1, Π1-off and control paths (§3; identities (i), (ii), (iii), (v), (vii)) and
   executability (one entry per session, no entry in an exit session, positions only under the active policy).
3. **Selection integrity.** Each fold pick in `results/payloads/develop-<F>/selection.json.gz` must come from that
   history's deep cells by the §7.5 rule; the deep allocation must follow §7.3 (per-mask lists, caps, distinctness,
   NET list, ties); check that no development record contains data after its development end (door records) and that
   the `evaluate` b-marks equal the sealed pick summaries.
4. **Data embargo.** Doors in every record; no bar after 2023-12-29; the bounded reader's stop records; anything in the
   code that could read post-2023 data, `splits.json` or `distributions.csv`.
5. **Freezes and scope.** `PROTOCOL_FREEZE.json` hashes vs files; `results/code_freeze.json` manifest vs files;
   `git diff --name-only 2a7996ddd5585849964a795151ac7a80d56f419f` and `git status` — nothing outside
   `research/study3-vgt-momentum-stage1c/` and `src/study3-vgt-momentum-stage1c/`; nothing in earlier studies changed.
6. **Engine spot checks** against ENGINE_CONTRACT §11 on sealed trades: rule A exits (eligibility dates, net at the
   open < 0, fill bar), B blocks (sessions within exit + C), C levels (cLevel = exitRaw (1+Y) of the arming exit) on Π1
   and Π1-off ledgers.
7. **Reports vs records.** Every number quoted in README.md, FINAL_COMPARISON_AND_RECOMMENDATION.md,
   CHRONOLOGICAL_SELECTION_AND_2022.md, PROTECTION_RULE_ABLATIONS.md, ENTRY_EXIT_MATRIX_AND_OPTIMIZATION.md,
   NEIGHBORHOODS_AND_GENERALIZATION.md, ENTRY_EXIT_REENTRY_INTERACTIONS.md, TRADE_LEDGER_AND_RISK.md must match the
   sealed records or `results/tables/`; flag any overclaim (out-of-sample language, causal language beyond "one
   retrospective, target-year-informed replay", missing "(target-year-informed)" tags, nominations not allowed by §11).
8. **Brief coverage.** Check the brief's §12 checklist item by item and list anything not delivered or only partly.

## Output

Numbered findings with severity (BLOCKER / MAJOR / MINOR / NOTE), exact location, problem, evidence (your recomputed
numbers), and recommended fix. Then a one-paragraph statement: does the sealed evidence support the reported verdict?
Your final message is your complete audit text (it will be saved verbatim to `reviews/FINAL_AUDIT.md`).
