# Study 9 Phase B — final independent audit brief

You are an independent, **read-only** auditor of a completed research study in the repository at
`/home/chad/projects/margin-trading` (branch `research/study9-phase-b-seven-pool`). You did not do this work. Your job is
to find what is wrong, overstated, inconsistent or undisclosed — not to approve it.

## Hard rules

- **Write exactly one file:** `research/study9-phase-b/reviews/FINAL_AUDIT.md`. Modify nothing else: no source, report,
  table, record, config or data file, no git operation (no add/commit/stash/checkout), no deletion.
- **Never run a study stage** (`scripts/s9b.sh` search / qualify / freeze-* / test / slice / diagnostics / preference /
  seal / acknowledge-code / record-audit / parity / pilot). The only `s9b.sh` command you may run is `verify-chain`.
- Do not run `tools/build_tables.py` (it rewrites tables). You may recompute any figure yourself with read-only Python
  or Node one-liners that read the sealed JSON records, and you may run `npm run study9b-run -- list` or a single
  `npm run study9b-run -- run <alias> --end 2026-10-29 --out <a new directory under /tmp/claude-1000/…/scratchpad>`
  if you need to check the runner (its outputs must go to a new directory outside the repository).
- Do not touch `config/market-events/*` or any `.DS_Store` / `._.DS_Store` file, and do not access the network or any
  broker.
- Node: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.

## What to read

- The brief the study executed: `research/study9-phase-b/brief/ASSIGNMENT.md` (authoritative instructions; read in
  full).
- The frozen protocol `research/study9-phase-b/PROTOCOL.md` and `AMENDMENTS.md` (A0, E1–E4).
- The checkpoint `RESEARCH_RECOVERY.md` and the reports: `README.md`, `RECOMMENDATION.md`, `CHRONOLOGICAL_VALIDATION.md`,
  `NEIGHBORHOOD_ROBUSTNESS.md`, `TRAINING_QUALIFICATION.md`, `SEARCH_AND_COMPUTE.md`, `POOL_COMPLEMENTARITY_AND_LEDGER.md`,
  `EXECUTION_RISK_AND_LIQUIDITY.md`, `BASELINES_AND_PARITY.md`, `RUN_COMMANDS.md`.
- The sealed records (`results/chain.jsonl`, `results/test/<FOLD>/test.json`, `results/test/F24/confirm.json`,
  `results/slice/slice-2026-10-30.json`, `results/diagnostics/diagnostics.json`, `results/preference/preference.json`,
  `FROZEN_SELECTION.json`, `results/qualify/<TRACK>/F24/qualification.json`) and the generated tables
  `results/tables/*.md`; the runner outputs `results/runner/*.txt`.
- The earlier reviews in `reviews/` and the code in `src/study9-phase-b/` and `src/study9b-runners/` as needed.

## What to check (report each with evidence: file:line, record path and field, recomputed value)

1. **Integrity:** `research/study9-phase-b/scripts/s9b.sh verify-chain` passes; the hashes quoted in
   `RESEARCH_RECOVERY.md` match `sha256sum`; the test doors opened once each, in order (F19, F20, F21, F23, F24), after
   the selection (chain 7) and the pre-test audit (chain 9); no training door read past 2024-12-31 (`results/doors.jsonl`).
2. **Numbers:** spot-check at least 25 figures across the reports against the sealed records (not only the tables):
   test nets, DDs, shares, ranks, the confirmatory bootstrap, family-wise p values, PBO, Shapley/leave-one-out, fill
   shares, stress results, slice P&L, compute times. Flag every mismatch, however small.
3. **The three decisions** (`RECOMMENDATION.md` §6, `results/preference/preference.json`): the mechanical nomination
   follows the sealed training-only order restricted to non-failed holders; the user-preference assessment uses the
   predeclared bands and compelling case (PROTOCOL.md §9.2–§9.3) without reordering; deployment is NOT DEPLOYED. Is the
   claim "no Phase B pool beats VG #2 balanced" supported on the stated basis, and is it worded no more strongly than
   the evidence allows?
4. **Language:** 2025–2026 is never called an untouched/independent holdout or out-of-sample validation; the 2026-10-30
   slice is never called prospective, a gate or evidence; whole-run comparisons are labelled in-sample/descriptive;
   ex-post preferences are labelled descriptive; nothing proposes a margin order.
5. **Brief compliance:** compare the brief's required deliverables, analyses and report contents (its §8 risk realism,
   §9 controls and decisions, §10 runner and ledgers, the required report list) with what exists. List anything missing
   or only partly done.
6. **Methodology adherence:** anything in the records that departs from the frozen protocol (thresholds, seeds, door
   order, fold windows, role ranking) without an amendment; whether the amendments E1–E4 changed any rule, input or
   result, and whether E4's `package.json` change and its effect on Phase A's `verify-chain` are fully disclosed.
7. **Execution and liquidity claims** (`EXECUTION_RISK_AND_LIQUIDITY.md`): consistent with
   `results/diagnostics/diagnostics.json` (per-lot fill bars, sparse sessions) and the F24 test record's sensitivities;
   the "not realistically executable" conclusions for ILF/EDV are supported; nothing implies the $35k ceiling is a
   broker stop; the portfolio-context caveat is present.
8. **Runner:** `npm run study9b-run -- list` works; `results/runner/reconcile-2026-10-29.txt` shows the claimed
   36/36 PASS and 1,854 lots with 0 mismatches; `results/runner/edge-cases.txt` shows the claimed refusals and labels.
9. **Repository hygiene:** `git status --short` — the user's `config/market-events/*` modifications and untracked
   `._.DS_Store` files are untouched; nothing outside the Phase B paths (`research/study9-phase-b/`,
   `src/study9-phase-b/`, `src/study9b-runners/`, `config/research-pools/study9-phase-b/`,
   `config/research-phenotypes/study9-phase-b/`, the two `package.json` script lines) was changed; `git worktree list`
   shows only the main checkout; no secrets or personal paths beyond the repository path appear in the reports.

## Output format (`reviews/FINAL_AUDIT.md`)

- Title, auditor statement (independent, read-only), the UTC time from `date -u`, and the exact commands you ran.
- **Exactly one line** beginning `Result:` and reading `Result: CLEARED`, `Result: CLEARED WITH NOTES` or
  `Result: NOT CLEARED`.
- Numbered findings, each with a severity — **blocking** (a wrong sealed-result claim, a methodology breach, a missing
  required deliverable, misleading language about evidence or deployment) or **non-blocking** (minor numeric slips,
  wording, presentation) — the evidence, and the specific correction you recommend.
- A short list of what you verified and found correct (with the figures you recomputed).
