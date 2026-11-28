# Assignment 1 of 2: research date boundaries, remediation and Strategy Lab integration (report)

**Branch** `feature/research-date-boundaries`, from `9d2eaec4` (the previous assignment). The commits and the verified
push are recorded in `WORK_RECOVERY.md` § Delivery. Nothing was merged into `main` or any other branch. **No GPU
re-acceptance, no official GPU job, no optimization, no pilot, no new study.**

| Document | Contents |
|---|---|
| `BRIEF.md` | the brief, verbatim |
| `CROSS_BRANCH.md` | P0: state, branches, processes, acceptance records, effects of the appended data, integration dependencies |
| `STRATEGY_LAB.md` | how to use the portfolio windows; requested vs effective dates; CLI ↔ Strategy Lab parity; deployment; screenshots |
| `HISTORICAL_COMPATIBILITY.md` | inventory of whole-file checks; the verified reproduction mechanism; the four lists |
| `TESTS_AND_INTEGRITY.md` | baseline and final suites, new tests, integrity, diagnostic GPU parity |
| `ASSIGNMENT_2_READINESS.md` | the re-acceptance checklist, its commands, and the decisions to take first |
| `RUN_COMMANDS.md` | the verified commands |
| `WORK_RECOVERY.md` | the checkpoint (COMPLETE) |

## 1. Outcome

- **N/original in Strategy Lab on all available data.**
  - **Where:** Portfolios → N/original → *Evaluation window: All*, or http://apollo:4317/#/portfolio/n-original?window=all.
  - **The server:** running (transient unit `strategy-lab`), built from the final code; both N/original replays are
    already in its cache.
  - **What you see:**
    - one continuous run 2016-01-04 → **2026-11-25**, labelled *MANUAL POST-VALIDATION EVALUATION*;
    - proven identical to the research window decision for decision through 2026-10-30;
    - the new period's figures and the CLI's period table;
    - the post-validation ledger, with lot 44's November P&L (+$11,048.24) shown apart from its lifetime net
      (+$5,483.48);
    - lots 45 and 46 on the GDX and VGT charts.
- **Every portfolio candidate has Research, All and Custom windows.** Custom is continuous history (the default) or an
  isolated window.
  - **One module for both tools:** windows are planned and attributed by the module the CLI uses.
  - **Research:** keeps the archived benchmark and its parity badge; every earlier link behaves as before.
- **Effective dates are reported.**
  - **Portfolio header:** shows the reported range; a popover adds the simulated and requested ranges and the local
    coverage.
  - **Single-symbol runs:** show the evaluated sessions, with the request beside them. Their charts stop at the
    evaluated sessions, and exports record `effectiveWindow`.
  - **Cache identities:** include the window and the research ranges.
- **Historical results unchanged.**
  - N/original's research window = its sealed targets (10/10) and its 44-lot ledger.
  - The five Priority 6 candidates verify as before.
  - The door and replay fingerprint is identical to the previous assignment's.
  - Nothing under `research/` changed.
- **Older studies.** The previously reported studies fail closed at HEAD, by design.
  - **Reproduction mechanism:** a general, verified one now exists (`tools/historical-repro/env.ts`). It was checked on
    two of them at their own commits: vg-l0-full-joint (doors, 47/47 seals) and Priority 2 (doors rebuilt
    byte-identical).
  - **None restored at HEAD:** each check sits in code that its own frozen guard pins.
- **`npm run app` works again.**
  - **The pre-run lint:** covers exactly the code the command can run (414 files, 0 errors).
  - **Ignore list:** only generated caches and sealed results were added.
  - **Repository-wide ESLint (`npx eslint`):** still reports about 150 pre-existing errors in completed studies' code.
    One of them sits in a file pinned by Study 7's sealed records.
- **Standard 5.0.0: evidence categories.**
  - **The four categories:**
    - formal historical research;
    - manual post-validation evaluation (informational);
    - controlled prospective (shadow) evaluation (only under §1.15's conditions, pre-registered, as a new study
      with scope `prospective`);
    - live trading.
  - **Preflight:** supports and tests the prospective scope.
  - **N/original's November run:** stays a manual post-validation evaluation. It was not pre-registered, and its first
    sessions opened before its 2026-11-17 freeze.
- **GPU.**
  - **Status:** the acceptance is still correctly STALE; nothing was accepted or bypassed.
  - **Diagnostic parity:** FULL and ALL are 102/102 bit-identical on the accepted binary, with the FULL GPU dataset =
    the accepted export.
- **Tests.**
  - **Baseline (re-established):** 1,904 / 1,890 / 10 / 4.
  - **Final:** **1,909 tests, 1,896 pass, 9 fail, 4 skipped**:
    - 6 pre-existing lowercase `allin-original.ts`;
    - 3 STALE-by-design.
  - **Study 7's endpoint failure:** resolved.
  - **Strategy Lab:** Vitest 334/334; Playwright 83/83.

## 2. Starting state (P0)

- **Repository:**
  - HEAD `9d2eaec4` = origin, clean, main checkout only;
  - no research process and no Strategy Lab server running;
  - GPU idle.
- **History:** the lineage from `main` to this branch is linear. Two branches diverge: staged trailing stops (GPU
  Phase 8, Growth 1.5.0) and the TSLA identity-join fix.
- **The appended VGT/GDX rows:**
  - **Every branch except this one:** Priority 3's FULL door refuses there (whole-file check), including Strategy
    Lab Portfolios on `main`.
  - **Completed studies with their own whole-file checks:** fail closed everywhere.
  - **Running work:** nothing was running or affected.
- **Risk envelope:** the pilot and its follow-ups (Stage A, Stage B, the diagnostics) are all COMPLETE (2026-11-22/23)
  and await your review. Nothing was pending or started.

Details: `CROSS_BRANCH.md`.

## 3. Architecture and changes

| Area | Change | Why |
|---|---|---|
| `src/manual-eval/execute.ts` (new) | One typed execution interface: `planManualRun`, `openPlanDoor`, `evaluatePlan`, `periodSpecsOf`, `researchReference`, `compareTo` | Strategy Lab and the CLI share plan, door, engine call, reconciliation and period table, so they cannot drift |
| `tools/manual-eval/pooled.ts` | Uses it; `--execution continuous\|isolated` (custom; default isolated, as before) | Outputs byte-identical to before (verified) |
| `apps/strategy-lab/shared/portfolio.ts` | Window request types and canonical form; `PortfolioWindowInfo`; periods; `postValidation`; `inPeriod`; trajectory; replay format 2 | One contract for runner, server and browser |
| `runner/portfolio-catalog.ts`, `catalog/pooled-candidates.json` | N/original from its sealed records (A3 frozen selection, A3 validation, risk-metrics G0 parity, trades table, P5-NS outcome); identities recomputed; the five entries byte-identical | The brief's acceptance case; nothing typed by hand |
| `runner/portfolio-bridge.ts` | `engineRunOf`: unchanged runLife for the five candidates; the risk-metrics `replay` with `vOptions` for N/original, re-checked against the sealed subject. Generalised development, validation and post-validation figures; internal cross-checks against the period table | Same engine and parameters as research; no new trading logic |
| `runner/portfolio-run.ts` | Window request; research reference and trajectory check for continuous non-research runs | Verifies extended runs against the archive transitively |
| `server/portfolios.ts`, `server/http.ts` | Window in the identity (+ date-ranges sha); coverage; validation of windows (400); chart window = the simulated sessions | No stale or mixed cache entries; nothing past the data |
| `src/components/PortfolioView.tsx` and model | Window controls (Run Test's fields and chips), effective dates and popover, post-validation block, period table, ledger period filters and the *P&L in this period* column, amber post-validation shading; the window kept in the address | Inspect the new trades with the existing charts and ledger |
| `shared/run-window.ts`, RunView, Panels, export, http | Effective (evaluated) window of single-symbol runs; chart limited to it; `effectiveWindow` in exports; post-validation note in Run Test | §5 effective dates |
| `eslint.config.js`, `tools/lint/app-closure.ts`, `package.json` | Ignore `research/**/cache/**` and `research/**/results/**`; `preapp` lints the app's import closure under `--no-maglev` | §7 |
| `docs/research/OPTIMIZATION_STANDARD.md` 5.0.0, registry, templates, `src/research-standard/preflight.ts` | Evidence categories; §1.13 clarified; §1.15 prospective; §1.16 separation; scope `prospective` | §8 |
| `tools/historical-repro/env.ts` (new) | Temporary verified reproduction environment | §6 |
| Tests | see `TESTS_AND_INTEGRITY.md` §2 | §10 |

**Reused rather than built:**
- the previous assignment's manual door, period metrics and trajectory comparison;
- the risk-metrics engine and its reconciliation;
- Priority 3's doors and the canonical-prefix helpers;
- Strategy Lab's portfolio runner, bridge, cache, charts, ledger and date-field conventions;
- the GPU tools for the diagnostic check.

## 4. Deviations and judgement calls

- **N/original added to the catalog.** The brief assumes Strategy Lab can select N/original; it could not before. It is
  added from its sealed records as a read-only preset (it is not a new strategy). The other five entries are unchanged.
- **Custom execution defaults differ by tool, explicitly.** Strategy Lab's Custom defaults to continuous history (your
  stated preference). The CLI keeps its earlier isolated default and gains `--execution continuous` (the brief: do not
  silently change existing modes). Both are labelled.
- **`npm run app` scope.** Ignoring caches alone could not restore it: about 150 genuine pre-existing errors remain in
  completed studies' code, one in a file pinned by Study 7's sealed records. The pre-run gate now lints the code the
  command can execute, and repository-wide ESLint is unchanged and documented. No study code was edited.
- **No HEAD restoration of older studies.** Every candidate's check sits in code its own freeze guard pins. A verified
  commit-specific mechanism is delivered instead (§6.4's fallback).
- **Screenshots.** The brief asks for them. They were taken by the browser test from Strategy Lab's own interface, so
  they are a recorded departure from the no-visuals reporting preference (which excludes the app UI anyway).
- **Strategy Lab started as a transient unit,** not an installed service. A permanent install would be an
  infrastructure change for you to decide.

## 5. Unresolved issues and limitations

1. **GPU acceptance:** STALE until Assignment 2's §2 re-acceptance (`ASSIGNMENT_2_READINESS.md`).
2. **Your decisions:**
   - integrate `research/vg-l0-staged-trailing-stop` before the re-acceptance?
   - integrate `fix/tsla-outcome-identity-join`? (It conflicts in `identityJoin.ts`.)
   - install Strategy Lab as a permanent service?
3. **`main` and other branches:** their FULL door refuses with today's data until this branch is integrated, so
   Strategy Lab Portfolios does not work on `main` meanwhile. Use this branch's server.
4. **Older studies:**
   - The pre-existing other-symbol pins (VOOG, XBI, XRT, KRE …) of Studies 3–9, B4/B5 and the d1-* studies are not
     recoverable from the vintage registry. Their VGT/GDX parts are.
   - Legacy manual runs without an end on `final`/`all` silently reach the newest VGT/GDX session (formal stages are
     protected).
   - Details: `HISTORICAL_COMPATIBILITY.md` §5.
5. **Lint:** repository-wide ESLint still has about 150 pre-existing errors in completed studies' code (unchanged).
6. **Pre-existing test failures:** the six lowercase `allin-original.ts` failures (unrelated) remain.
7. **Isolated windows:** an isolated custom window has no archived target to compare with; it is reconciled with the
   engine-independent ledger only.
8. **The new period:** 18 sessions, 3 lots. Descriptive only.
