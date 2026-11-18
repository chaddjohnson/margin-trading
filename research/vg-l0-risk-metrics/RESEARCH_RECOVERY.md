# RESEARCH_RECOVERY — Risk metrics and optimization methodology (pre-optimization assignment)

## Top screen

- **Updated:** 2026-11-18T06:40Z (UTC, from the clock). **Status: COMPLETE** — all stages sealed, deliverables written,
  QA passed, committed and **pushed**.
- **Push:** `git push -u origin research/vg-l0-risk-metrics` (new remote branch, no force, outside the sandbox, first
  attempt, 2026-11-18T06:39:00Z). `git ls-remote` at 06:39:05Z: `research/vg-l0-risk-metrics` = `bc08cb194cca7adc01f3525cd1381426d575e0cf`
  (= local; the deliverables commit), `main` = `108c241b` (unchanged). This record follows as its own commit, pushed the same way.
- **Task:** the user's brief `brief/BRIEF.md` (sha256 `c2eaa0e8…2657`). No search, no new phenotype, no adoption, no
  broker, no main merge, no standard/NL0 edit, nothing scheduled.
- **Authority:** `PROTOCOL.md` FROZEN (`0cfa32385edd7beb…`), freeze record `331c9f54…7137`; `AMENDMENTS.md` A1–A4
  (`34595960b957c011…`). Standard 2.2.0, scope diagnostic; preflight PASS.
- **QA (final):** this study's tests 23/23; full `npm test` 1,677 tests / 1,666 pass / 4 skipped / the 7 known pre-existing
  failures; repository `tsc` clean and the study's tools typecheck; this study's 25 seals verify; Assignment 3's 47,
  Assignment 2's 47 and 5B's 28 seals verify.
- **Audited deliverables (sha256 prefix):** REPORT `9cd1bf9e81f62c01`, BASELINE_AND_PROVENANCE `ebec466c76e54b34`,
  METRIC_SPECIFICATION `2ace94b8c5030583`, IMPLEMENTATION_AND_TESTS `42d7576fd101ff53`, CANDIDATE_RISK_AUDIT
  `9a73312029c240c7`, SELECTION_PIPELINE_AUDIT `92122fdee5a38543`, SELECTOR_COMPARISON `44f667cdb177934e`,
  PROPOSED_METHOD `77ab5dfcd137335b`; sealed records in `results/seals.jsonl` (25); tables `results/tables/` (+ MANIFEST).
- **Running:** nothing.
- **Follow-up gate (the user's):** the eight decision points of `PROPOSED_METHOD.md` §8 (the marked-DD role and cap; the
  trade principal-loss limit; the banked-capital limit; open-ended Growth exits; margin scenarios / actual account terms;
  any new selection arm; large search vs bounded envelope pilot vs prospective monitoring; any merge). Recommendation:
  **no-go** for a large successor search now (REPORT §4).

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
| QA, commit, push | complete | pushed `bc08cb19`; verified by `git ls-remote` |

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
