# Implementation audit

## 1. Self-audit (the implementer's checklist, with where each claim is proven)

| Area | Claim | Evidence |
|---|---|---|
| Data | Raw file read only; snapshot pinned by a prefix hash; canonical series = filter of traded rows in [2018-02-11, 2026-08-25) | DATA_AUDIT.md; `results/audit/DATA_AUDIT.json` recomputes and matches; `snapshot` rebuild from the sealed prefix is byte-identical (`cb7c9cdc…`) |
| Clock | UTC calendar days; L, hold and W in calendar days; no business-day calendar in the BTC code | BTC_CLOCK §2; `tests/engine.test.ts` (UTC boundaries, leap days, midnight crossing) |
| Causality | Decisions on completed minutes; fills and exits at minutes whose open prices them; daily state updated after the day; selections sliced at the cutoff | `tests/mutation.test.ts` (every cutoff, scale and truncation, both engines, three stop conventions); PARITY-r2 (192 + 96 real-data checks, 0 violations); two deliberate cheats caught |
| Fidelity | D1's rules unchanged except the documented BTC adaptations | PROTOCOL §3; BTC_CLOCK §1; reviewer's rule-by-rule comparison (`reviews/PRE_FREEZE_REVIEW.md`, "Checked and found correct" §4) |
| Accounting | Cash ≥ 0; notional = min(100,000, cash / (1 + fee)); gross − fees − impact = net; marks at liquidation value; interest 0 | `reconcileLedger` on every reference run (205 real-data runs, all fixtures); a full-span `fixed` run reconciles exactly (terminal = trades.csv = trades.json = summary.json: 124,938.054281 USDT for final-r1). For a later window of a run (`--dataset <window>`) the CSV/JSON hold the whole account's ledger labelled by `window_role`, and the window net is the change of marked equity, which a carried-in trade's whole-life totals need not match (stated in the report) |
| Parity | Fast replay = reference, exactly | PARITY-r2: 205 runs, 0 differences, max money difference 0.0; the reference engine reproduces the sealed fast fold A validation to the cent (−29,144.94 USDT, DD 70,456.73) |
| Preregistration | Box, chronology and costs written before any outcome; gates and procedure frozen before any selection; budgets sized from timings only | RESEARCH_RECOVERY §4 hashes; `coordinator/pre-diagnostic/params.ts.txt` (sha256 `663bbbb9…`); `PROTOCOL_FREEZE.json` (01:21:32Z) precedes every outcome record (fold A from 01:21:48Z) |
| Records | Write-once; body-hashed; every outcome record stamped with the freeze, outcome-code and procedure hashes; no amendment path | `npm run btc-d1 -- verify` (all sealed records verify; 9 outcome records stamped) |
| Holdout | Never read by any engine run; door derived from sealed records | PROCEDURE_GATE pass = false; `holdout` refuses; demonstrated refusals in `results/demo/refusal-*.txt` (incl. a forged phenotype file) |
| Isolation | Only `package.json` gained a `btc-d1` script; no file bound by the B4/B5 freeze changed; earlier records untouched | `git status`; `npm run pools -- verify` (all checks pass); `verify` checks the prospective freeze body `407a669b…` |

### Known limitations of the implementation (not defects)

- Intraminute stop sequencing cannot be resolved from minute bars ("adverse" principal, "low" worst-case bound).
- No order-book, lot-size or minimum-notional model (no local metadata); capacity is reported, not gated.
- The archives (`results/*/archive.jsonl.gz`) are 26–33 MB each because every vector's trade signature is kept. By
  the repository's convention for large search logs they are kept on disk and git-ignored; their sha256 and row counts
  are tracked in each sealed `SELECTION.json` (`archive`), and `tables` needs the local copies.
- `fixed` reports the exposure share from whole-trade durations of trades held in the window (a trade carried into
  a later window counts its full duration).

### Report-only files changed after the freeze

The freeze binds every outcome-critical file byte for byte; these report-only files changed afterwards (listed by
`verify`), none of them able to change a sealed outcome:
- `tables.ts`: G1 in the rendered tables now includes the 35,000 USDT ceiling the selection applied (the sealed
  records were always right; the first rendering was not); frontier table restated over feasible vectors.
- `cli.ts`: `verify` also lists labelled parity reruns; the B4/B5 freeze check compares the full stored body hash and
  recomputes it (final audit B4).
- `report.ts`: a `window_role` column in trades.csv/json and an explanation line for later windows of a run (A1).
- `tests/door.test.ts`: new tests of the CLI data door (B6).

## 2. Final independent audit

Auditor: an independent read-only subagent, after every stage (`reviews/FINAL_AUDIT.md`). Verdict: **no blocker;
the implementation, records and negative conclusion hold.** It re-implemented the engine in Python from
BTC_CLOCK_AND_EXECUTION.md and matched the reference trade for trade, to the bit, on three development-span runs
(33, 49 and 105 trades) and on all 54 sealed validation figures; recomputed every body hash, the gate verdicts from
VALIDATION.json and the picks from SELECTION.json and the archives; confirmed that no code path, log, demo or
evaluation window reached 2024-07-01, that 12 door bypass attempts were refused, that only `package.json` changed
outside the study, and that no buy-and-hold benchmark appears anywhere.

| # | Finding | Disposition |
|---|---|---|
| A1 (major, reporting) | Window runs: CSV/JSON hold the whole account's trades, the report only the window's; carried-in trades make window totals differ from the window net; the reconciliation claim held only for full-span runs | **Fixed** in `report.ts` (`window_role` column, explanation line); claim scoped above; demos regenerated |
| B1 (minor) | "Only crash-buyers (47–59%) were feasible" overstated | **Fixed**: 92–99.8% of feasible vectors arm at ≥ 40%; every G1–G6 vector armed at 45.4–59.6% (README, FINAL_COMPARISON, SEARCH) |
| B2 (minor) | "44 tests at the freeze" | **Fixed**: 47 at the freeze, 50 now |
| B3 (minor) | `parity` does not refuse after the freeze | **Documented** (README): parity/benchmark are pre-freeze evidence; a rerun writes a new labelled record, never overwrites; it cannot affect the freeze or any outcome |
| B4 (minor) | B4/B5 freeze check tested a prefix | **Fixed** (full stored hash + recomputation); `pools verify` checks its bound files |
| B5 (minor) | Checkpoint partly stale | **Fixed** (RESEARCH_RECOVERY refreshed: running work, pools verify, `costs.ts` note, do-not-rerun list, timestamps from records/logs) |
| B6 (minor) | Door call sites in report-only `cli.ts`, no CLI door test | **Fixed**: report-only changes recorded above; `tests/door.test.ts` exercises every refusal path of `door.ts` |
| N1 (note) | The verdict depends on the preregistered 35,000 USDT ceiling | **Made prominent** in README and FINAL_COMPARISON ("What the verdict depends on") and in the final report |
| other notes | wording, exposure definitions, archive fields, git-ignored logs, 86 MB of archives | acknowledged; the archive size and git-ignored logs are listed as limitations for the user's commit decision |
