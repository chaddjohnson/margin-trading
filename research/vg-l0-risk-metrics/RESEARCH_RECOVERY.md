# RESEARCH_RECOVERY — Risk metrics and optimization methodology (pre-optimization assignment)

## Top screen

- **Updated:** 2026-11-18T06:40Z (UTC, from the clock). **Status: INCOMPLETE — all stages sealed and all deliverables
  written; final QA running (full `npm test` in unit `vgl0rm-npm-test`, log `results/logs/npm-test.log`); then commit,
  push, `git ls-remote` check, push record.**
- **Task:** the user's brief `brief/BRIEF.md` (sha256 `c2eaa0e8…2657`, read in full). No search, no new phenotype, no
  adoption, no broker, no main merge, no standard/NL0 edit.
- **Authority:** `PROTOCOL.md` FROZEN (sha256 `0cfa32385edd7beb68a47284f9b2298d047b6a6e0022b4ce0edbcb21cbe0fb14`,
  freeze record `331c9f54…7137`, committed `cdb87439`). `AMENDMENTS.md`: A1 (S3 gate rounding), A2 (budget ≈ 6,184 of
  6,200), A3 (per-trade window defect; corrected record `results/audit/centres-windows-v2.json` `525a83e5…d5cb2`), A4
  (erratum 51 → 50). Standard 2.2.0, scope diagnostic; preflight PASS (06:38Z).
- **Branch:** `research/vg-l0-risk-metrics` (main checkout) from `67b4ae71`; commits `cdb87439`, `1768334d`, `7aeefe7a`;
  uncommitted (intended): the deliverable documents, A3/A4, centres-windows-v2, tests and tool fixes, tables.
- **Running:** `vgl0rm-npm-test` (started 06:34:16Z). Check: `systemctl --user is-active vgl0rm-npm-test`; the log's
  "npm test exit N" line. Expected: only the 7 known pre-existing failures (memory `known-npm-test-failures`).
- **Next step:** when the suite ends, record its counts in IMPLEMENTATION_AND_TESTS.md §2 and REPORT.md §6; commit;
  `git push -u origin research/vg-l0-risk-metrics` (unsandboxed, retry); verify with `git ls-remote origin
  research/vg-l0-risk-metrics`; record the push here; commit and push that record.

## Stage table (sealed records: `results/seals.jsonl`, 25 records, all verify)

| Stage | Status | Output (sha256) |
|---|---|---|
| Freeze | complete | `results/protocol-freeze.json` `331c9f54…7137` |
| 0 Provenance and parity | complete, G0 PASS | `results/baseline/parity.json` `83e610b9…69f8` |
| 1 Metrics, tests, G-S | complete: 23/23 study tests; G-S 0 failures on 36,821 exits | code `src/vg-l0-risk-metrics/` |
| 2 Margin | complete | `results/margin/grid.json` `09df7915…80cb5`, `overlay.json` `579c3feb…62ba` |
| 3 Audit | complete (51/51 parity; A3 correction sealed) | `results/audit/centres.json` `7a62da0e…a538b`, `centres-windows-v2.json` `525a83e5…d5cb2`, 10 `nbhd-*.json` |
| 4 Pipeline | complete | `results/pipeline/exclusions-scan.json` `49124e0d…3268`, `-compare.json` `cd79ce3d…60ff`, `-replays.json` `7010fb4a…7d83` |
| 5 Selectors | complete, G5a/G5b/G5c PASS | `results/selection/members-C19…C24.json`, `selectors.json` `46cfd342…c9e3`, `folds.json` `f57968da…1094` |
| Tables | regenerated (rerunnable) | `results/tables/*.csv`, `MANIFEST.json` |
| 6–7 Docs | written | REPORT, BASELINE_AND_PROVENANCE, METRIC_SPECIFICATION, IMPLEMENTATION_AND_TESTS, CANDIDATE_RISK_AUDIT, SELECTION_PIPELINE_AUDIT, SELECTOR_COMPARISON, PROPOSED_METHOD, README, RUN_COMMANDS |
| QA, commit, push | running | |

Resume: every sealed record refuses a rerun; tables.ts is rerunnable; docs are written from the sealed records.

## Constants

- Seeds: none new; neighbourhood draws = Assignment 3's `drawsOf(cfg, famOf('select', ['select', rep, 'C24']))`.
- Budget cap 6,200 fresh simulations (PROTOCOL §10). Used so far ≈ 8 (S0) + 51 (S3 centres) + dry runs (51 + 51 + 4).

## On disk versus in memory

- Findings so far (to be written into reports from sealed records): New L0 development MDD $19,459.83 (2023-01-25 →
  2023-02-24) = $9,124.10 profit giveback (lot 27 D1·GDX) + $10,335.73 principal loss (lots 28, 29); max trade principal
  loss on development ≈ $8,093 (liquidation basis).

## Guards

- Do not edit any frozen study (`research/vg-l0-full-joint/`, `research/vg-l0-risk-families/`, 5B, NL0, the standard).
- FULL is previously examined history; opened only for fixed sealed candidates (read-only replays).
- Do not rerun sealed records; P2 rules are frozen in PROTOCOL §9 (amendment needed for any change).
- Disclosure: scratch dry runs (no records) opened D24 and FULL for engineering checks before sealing; all door
  openings by study code are in `results/doors.jsonl`.
