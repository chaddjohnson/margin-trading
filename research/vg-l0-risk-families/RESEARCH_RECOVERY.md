# RESEARCH_RECOVERY — Assignment 2: D1 risk-control families and risk-aware candidate selection

## Top screen

- **Updated (UTC):** 2026-11-15T09:20Z (from `date -u`).
- **Status:** **COMPLETE.** RC 2 implemented and verified; the frozen study chain ran end to end (C19 → C21 → C23 →
  sequential → C24 → frozen selection → FULL validation once); report-only diagnostics sealed; `REPORT.md` and
  `ASSIGNMENT3_HANDOFF.md` written. **Outcome: no qualifying successor** (all 9 procedures chronologically
  unsupported); New L0 reproduced exactly and remains the reference.
- **Follow-up gate (the user's):** review `REPORT.md` and `ASSIGNMENT3_HANDOFF.md` §6 (the Assignment 3 design, the
  primary selection rule, a pre-2016 data decision, a prospective shadow comparison, review of the RC 1/RC 2 modules for
  merging). Assignment 3 does not start automatically; nothing is merged into `main`.
- **Authority:** brief `brief/BRIEF.md` `aaf36fbc…`; protocol `PROTOCOL.md` `7e803dc4…` frozen by
  `results/protocol-freeze.json` (`3e4c005d…`, commit `77c569ca`); amendments: R1 only (before the freeze), no
  post-freeze amendment; standard 2.2.0 (`0085cff2…`), NL0 1.0.0 (`9b387bb4…`).
- **Running processes:** none (`vgl0rf-chain1` and every `vgl0rf-*` unit finished and were collected).

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `research/vg-l0-risk-families` from `26014af1`; no extra
  worktree. `main` = `108c241b`, untouched. Node v24.21.0; `vgl0rf.slice` (44G/48G/0); 12 workers; peak 19.7 GiB.
- Evaluation digest `6bc03fec…` and decision digest `3b9efbc7…` unchanged from the freeze through the validation;
  Priority 3 `147cad7c…` (= its sealed historical value).

## Stages (all complete; 47 sealed records verify: `npm run vg-l0rf -- verify`)

| Stage | Commit | Key record (sha256 prefix) |
|---|---|---|
| RC 2 + tests | `3771c28b` | 35/35 tests |
| Protocol draft, pipeline | `bbe5c2aa` | — |
| Stage V | `90d32176` | `results/parity/parity.json` `dbedfa49…` (0 failed of 25,933) |
| Freeze | `77c569ca` | `results/protocol-freeze.json` `3e4c005d…` |
| C19 searches / selection / fold | `0eed6af7` / `95b63dbc` / `52f4d42c` | `results/folds/C19/` |
| C21 | `14c7ec66` / `5ef43fe1` / `fc2aa9b4` | `results/folds/C21/` |
| C23 | `eb8293bd` / `b0e14f65` / `e6b9e22a` | `results/folds/C23/` |
| Sequential verdicts | `3cf237b6` | `results/folds/sequential.json` `6bd3e338…` |
| C24 searches / selection | `09d7b443` / `41d05abd` | `results/folds/C24/` |
| Frozen selection | `2920a64f` | `FROZEN_SELECTION.json` `4174ae53…` |
| Validation (FULL, once) | `17938e89` | `results/validation/validation.json` `730dc780…` |
| Report-only diagnostics, tables, report, handoff | `5d193d2f` | `results/diagnostics/*.json` (7 sealed), `results/tables/*.md` |

Compute: 34.21 M fresh pooled simulations (30.75 M search, 3.46 M qualification, 3,584 next-slice replays), plus stage
V (907) and the pilot and bench (cache only); chain wall time 30.95 h (2026-11-14T02:12:30Z → 2026-11-15T09:09:33Z).

## Guards

- Every stage is sealed; do not rerun (they refuse). FULL was opened for the validation once; it is not reopened for
  this study's selections. The standard, NL0, RC 1 and earlier studies are untouched.

## Disclosures

- 24 single-process timing evaluations before the protocol (timing only); a pilot-only boundary fix before the freeze
  (R1); V4's re-derivation reuses `entryDayTrigger` (verified separately by synthetic tests).
- The resource guard bound 117–155 lanes per cutoff from C21 on (budget-bound, not converged).
- The C23 slice carried no D1 trade for any fold primary.
- Report-only diagnostics ran after the validation, as precommitted.

## Delivery

- Branch `research/vg-l0-risk-families` pushed to `origin` (verified with `git ls-remote`; the push record follows as
  its own commit).
