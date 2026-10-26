# Brief for the independent final implementation audit

Sent verbatim to a fresh general-purpose agent (which did not write the code). The session-specific scratch path is
shortened to `<scratchpad>`.

You are an independent auditor for a completed, preregistered research study in this repository (working directory:
the repository root). The study is `research/d1-diverse-pool-discovery/`, with code in `src/d1-diverse/`. Every
study stage has run and is sealed; the outcome recorded is "no advancement". Your job is to verify the study's
integrity and its reports before they are handed to the user. Report what you find; do not fix anything.

**Hard rules.**
- Read-only: do not edit, create, move or delete any repository file.
- Do not run any `npm run diverse-d1` command except `legacy-check`, which writes only a new timestamped file under
  `results/legacy/`. You may run `npm test`, `npx tsc --noEmit`, `npx eslint src/d1-diverse`, `git` read commands,
  `shasum`, and read-only Python or shell. Node: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`.
  Put scripts in `<scratchpad>/audit/`.
- Do not read `.env` or any credential. No network access, no broker or order action, no download. Never load market
  bars after 2023-12-29 for any candidate.

**Verify, citing files and lines:**

1. **Integrity chain.** Every sealed record verifies against its body hash:
   - the design commitment;
   - the change log (hash-chained to the commitment);
   - `protocol_freeze.json`;
   - the amendment log (chained to the freeze);
   - controls/calibrations, search manifests, `PICKS`, validations and `PROCEDURE_GATE`;
   - `rounds/final/selection.json`, `FROZEN_SELECTION.json`, confirm-B and evaluation.

   Then check:
   - The current code manifest equals amendment 1's `codeAfter`; the protocol and context equal the frozen hashes.
   - Amendment 1 changed only `src/d1-diverse/final.ts`.
   - No outcome record predates the record it depends on, using `generatedAt` and the provenance fields.
2. **Data and isolation.**
   - The 64 canonical data CSVs and the split, distribution and partition files equal `results/baseline/`.
   - The tracked git index equals `results/baseline/git-ls-files-stage.txt`.
   - `HEAD` is `348f100b`, and nothing is committed.
   - The earlier studies' trees and frozen D1 phenotype JSONs are unchanged (`legacy-check`).
   - No file outside the new namespaces was modified, except the four listed in `IMPLEMENTATION_AUDIT.md` §1.
3. **Data doors.** No configuration of this study was evaluated on bars after 2023-12-29. Check:
   - the door records and last dates;
   - the validation stages ran only after their sealed `PICKS.json`;
   - the evaluation stage loaded nothing;
   - the descriptive `results/ledgers/` were reconciled to the sealed figures.
4. **Reports versus records.** Spot-check the numbers in these files against the sealed records:
   - `README.md`, including the old-versus-new table;
   - `RECOMMENDATION.md`, `CHRONOLOGICAL_METHOD_COMPARISON.md`, `COVERAGE_AND_DIVERSITY.md`, `FAMILY_SELECTION.md`;
   - `NEIGHBORHOOD_AND_RISK.md`, `FINAL_CANDIDATES_AND_GATES.md`, `HISTORICAL_CONFIRMATION.md`;
   - `BASELINE_AND_PARITY.md`, `IMPLEMENTATION_AUDIT.md`.

   Check at least 30 figures across them, and list every mismatch. The old-study figures cite
   `research/d1-robust-pool-discovery/`; check a sample there too. Flag any claim that overstates the evidence, e.g.
   calls something validated, proven or an expected return.
5. **Security.**
   - No secret, credential, account identifier or e-mail address appears in any new or changed file (search them).
   - No code path in `src/d1-diverse/` makes a network request, calls a broker, or places an order.
6. **Permanent instructions.**
   - Root `CLAUDE.md` imports `docs/claude/context-recovery.md` with an `@` import outside backticks.
   - The guide covers the operational contract: start of task, continuous checkpoints, the ~90% rule only if
     measurable, before and after compaction, host-dependent compaction control, the failure mode, optional hooks
     not installed, exercising the procedure.
   - The guide does not conflict with other repository instructions.
   - The task checkpoint `RESEARCH_RECOVERY.md` is complete and consistent with the records (top screen, stage table,
     hashes, do-not-rerun).
   - No user-wide settings were changed for this study, and no hooks were installed: check `.claude/` in the
     repository.
7. **Tests.** `npm test`, tsc and eslint pass. The study's tests cover what `DESIGN_DIFF.md` claims.

**Report format (saved verbatim to `reviews/final-audit.md`):**
- the checks you ran;
- material findings;
- minor findings;
- report-number mismatches, as a table;
- observations;
- a one-line verdict.
