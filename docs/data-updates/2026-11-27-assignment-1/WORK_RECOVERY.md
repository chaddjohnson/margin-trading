# Work recovery checkpoint — Assignment 1 of 2: research date boundaries remediation and Strategy Lab integration

## Top screen

- **Updated:** 2026-11-27T21:20Z (UTC, from the clock). **Status: INCOMPLETE** — B, C, D implemented; E mechanism built and verified; baseline npm test next (work STASHED during it: `git stash list` → `a1-wip`; restore with `git stash pop`).
- **Task:** the user's brief received 2026-11-27 ~19:15Z (`BRIEF.md`, verbatim).
- **Branch:** `feature/research-date-boundaries` (main checkout, no extra worktree), starting HEAD `9d2eaec4` =
  `origin/feature/research-date-boundaries`, working tree clean at start.
- **Previous assignment:** `docs/data-updates/2026-11-27/` (REPORT.md, AUDIT.md, RUN_COMMANDS.md, WORK_RECOVERY.md
  COMPLETE).
- **Not authorised here:** official GPU re-acceptance, a replacement acceptance record, official GPU jobs, the
  risk-envelope pilot, any optimization, merge into `main` or other research branches, R1 changes, phenotype/strategy/
  allocator changes, deleting research evidence, interrupting processes.
- **Nothing is running** (checked 19:15Z: no node research processes, no Strategy Lab server on 4317, GPU idle).
- **Next step:** stage C (`npm run app` lint), then D (standard), E (historical compatibility), A report, docs, full verification, deployment, reports, commit, push.

## Environment

- Node 24.21.0 (`.node-version`); every evaluating process runs with `--no-maglev`.
- Credentials (Alpaca) live in `.env`; not needed for this assignment (no data download planned).
- GPU: RTX 5090 `GPU-ae5f222c…`, accepted binary `research/gpu-phase7/build/gb7` (`cb2ff30b…`), non-official use only.
- Strategy Lab live state: `state/strategy-lab/` (never delete/reseed). No service unit installed; nothing listening on
  4317 at 19:15Z. `apps/strategy-lab/dist` dated 2026-11-18.

## Stages

| Stage | Status | Record |
|---|---|---|
| A. P0 audit (repo, branches, processes, acceptance, risk-envelope, data effects) | facts collected (report to write) | `evidence/whole-file-inventory-survey.md`; CROSS_BRANCH.md to write |
| B. Strategy Lab portfolios: research / all / custom windows, effective dates | implemented; vitest 334/334 (+ windows-model 9), e2e portfolio specs 9/9 (scratch build) | uncommitted edits below |
| C. `npm run app` lint | done: eslint ignores research/**/cache/** + research/**/results/**; preapp = tools/lint/app-closure.ts (414 files, 0 errors) + tsc; `npm run app -- allIn-trailingBuy VGT all 2025-01-02 2026-11-03` exit 0 | |
| D. Standard clarification (evidence categories) | done: standard 5.0.0 sha256 68487de7…, registry current 5.0.0; preflight scope prospective + 4 tests (34/35 pass; 1 = STALE by design); research-preflight --all 26 PASS / 5 FAIL (STALE only) | |
| E. Historical reproducibility inventory and mechanism | tools/historical-repro/env.ts built; verified: vg-l0-full-joint 67b4ae71 doors+47/47 seals PASS, P2 47422d04 doors PASS (doors-pins.json byte-identical); both fail closed at HEAD (observed) | `evidence/repro-*.json`; doc to write |
| F. Verification (tests, e2e, builds, parity, non-official GPU) | not started | `TESTS_AND_INTEGRITY.md` |
| G. Deployment of the updated Strategy Lab | not started | |
| H. Reports, Assignment 2 readiness, commit, push | not started | `REPORT.md`, `ASSIGNMENT_2_READINESS.md` |

## Uncommitted work (on disk, not yet committed)

- `src/manual-eval/execute.ts` (new shared execution module); `tools/manual-eval/pooled.ts` refactored onto it, new
  `--execution continuous|isolated` (custom default isolated). Verified: CLI outputs for research/all/custom/New L0 all
  byte-identical to the pre-refactor baseline (scratchpad `cli-before` vs `cli-after`), only an added `execution` key
  and an explicit execution line in custom `periods.md`.
- Strategy Lab: `shared/portfolio.ts` (format 2, window types), `runner/portfolio-catalog.ts` (+ N/original entry
  `n-original`, family rc; existing five entries byte-identical), `catalog/pooled-candidates.json` rebuilt,
  `runner/portfolio-bridge.ts` (engineRunOf, plans, context, periods, postValidation, inPeriod, crossCheck),
  `runner/portfolio-run.ts` (window request, research reference + trajectory), `server/portfolios.ts` (identity with
  window + date-ranges sha, coverage, windowOf), `server/http.ts` (window body), `src/api.ts`.
- Runner check (scratchpad `runner-check`): N/original research parity verified 10/10; all → 2026-11-25, periods ==
  CLI summary.json periods (deep-equal), trajectory identical, 13.9 s, 2.7 GB RSS.
- UI: PortfolioView (WindowControls, effective dates + InfoPopover, post-validation block, PeriodTable, ledger period
  filters + "P&L in this period" column), EquityChart post-validation shading, App route `?window=…`, RunView/Panels
  effective run window (shared/run-window.ts), run chart routes use the evaluated window, export run.json/README,
  meta.research, RunTestDialog post-validation note. Tests: tests/portfolio-windows.test.ts (7, real data),
  tests/windows-model.test.ts (9), portfolio-server (+2), catalog (+1), parity (+N/original); e2e
  portfolio-windows.spec.ts (2) + portfolios.spec.ts (N/original added). Screenshots in scratchpad `shots/` (copy to
  the task dir at the end). Built only into scratchpad `dist/`; apps/strategy-lab/dist untouched so far.

## Guards

- Do not re-run the data append; do not truncate the canonical files; do not edit R1.
- Do not touch `state/strategy-lab/` except through the running application.
- `apps/strategy-lab/dist` is what the user's server serves: build into a scratch outDir while developing.
- Screenshots: the brief asks for them "where practical" (§10.3, §11.2). That is an explicit request, recorded as a
  departure from the no-visuals reporting preference; Strategy Lab's interface is outside that rule anyway.

## Disclosures

- (none yet)
