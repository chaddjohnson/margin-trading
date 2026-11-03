# Pre-test audit brief — Study 9 Phase B (for the independent read-only auditor)

Written before the selection was sealed; given verbatim to a fresh agent once `FROZEN_SELECTION.json` is sealed and
before any test door opens (PROTOCOL.md §8.3).

You are an independent, read-only auditor. Do not run any study stage, open any door, read `data/`, or read anything
under `research/study9-phase-b/results/test/` (it must not exist). Write only
`research/study9-phase-b/reviews/PRE_TEST_AUDIT.md`. You may run `research/study9-phase-b/scripts/s9b.sh verify-chain`
(read-only), `npx tsc --noEmit -p .`, `npx eslint src/study9-phase-b`, and the unit tests.

Check, with file:line or record-path evidence:

1. **Chain and pins:** `verify-chain` passes; phases in order protocol → code-E1 → parity → search → qualify →
   selection; every `code-*` phase has an `AMENDMENTS.md` entry and changes no rule; the rulebook digest in
   `FROZEN_SELECTION.json` equals the live one; the door log holds no `test-*`, `slice` or `post` opening.
2. **Leakage:** every door-log line of the search and qualification phases ends on its fold's training end on the
   projection root (`data/vintages/study9-train-2024`), and none after 2024-12-31; no canonical-root opening exists.
3. **Seed independence:** the search records' namespace is `study9-phase-b`; the selection families (`select`) and the
   confirmation families (`confirm*`) are distinct label sets; no test label (`test`, `sets`) was used by any search
   or qualification record; no Study 8 / Phase A vector seeded a search (the searches' screens are Sobol/LHS draws).
4. **The seven memberships:** exactly the approved seven; the exploratory VG3-IWM track is labelled as a user-approved
   exploratory test, not a Phase A nominee, in the protocol, the records and the selection.
5. **C/Q/E and roles:** for a sample of candidates per fold, recompute from the sealed qualification records that the
   Q1–Q8 / E1–E3 flags follow Study 8's `qualificationOf` definitions; roles follow `assignRoles` (selection-family
   order, qualified only, L∞ ≥ 0.10, extras ledger-Jaccard < 0.5); the per-fold ranking follows the tier rule against
   B1 under the same track's labels; no infeasible-on-training candidate holds a role.
6. **Engine parity:** `results/parity/parity.json` passed every gate (attempt 2), and the A1–A4 and P1 details support
   the claims of `BASELINES_AND_PARITY.md`.
7. **Freezing:** the shortlists, roles, ranks, test plan, T-gate text and comparator identities are sealed in
   `FROZEN_SELECTION.json`; nothing in the code can re-rank, replace or rescue after a test.
8. **Multiplicity:** count searches, configurations and holders; confirm the predeclared confirmatory and family-wise
   VG #2 comparison rules exist in the code (`preference.ts`) before any test.

End the report with exactly one line `Result: CLEARED` if every check passes, or a line `Result: BLOCKED — <reason>`
otherwise. Do not write the word "CLEARED" anywhere else.
