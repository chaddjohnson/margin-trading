# RESEARCH_RECOVERY — bounded optimization-process audit (archive reselection)

## Top screen

- **Updated:** 2026-11-10T23:14Z (UTC, from the clock). **Status: INCOMPLETE — Stage 3 next-slice cohort runs running.**
- **Task:** the user's bounded optimization-process audit brief (`brief/BRIEF.md`, sha256
  `75842bfb3e0fa849cc298ed0da897c73bfe1daf289a1d75f9358adfc621062f1`, 147 lines, read in full to "Stop for review.").
- **Branch:** `research/optimization-process-audit` (main checkout), from `f52deea7`; last commit `001a84f4`.
- **Authority:** `PROTOCOL.md` (sha256 `e5f42a4e160b…`) FROZEN by `results/protocol-freeze.json` (`a4b95fa3671da47a…`,
  commit `6933fbf5`); `AMENDMENTS.md` head **A1** (G7 check bug; no result changed); `POLICIES.md` + 
  `results/stage2/POLICY_FREEZE.json` (`3d24db3d9f1b0b53…`, commit `d5878865`; code closure `304d4922ac20…`).
- **Sealed records (sha256 prefix):** inventory `94c69898b40b1b38`, reproduction `fcb4cc1562edcb2a` (G1–G6 pass, G7 6
  failed by a check bug), g7-recheck `98eaf312e7a62211` (0 failed), mechanism `7f4b2243d322553f`, POLICY_FREEZE
  `3d24db3d9f1b0b53`, CHOICES `84df484303132c79` (commit `001a84f4`), SOURCE_MANIFEST `e46fe8700b9fb9eb`.
- **Stages:** 0 complete; 1 complete; 2 complete (P1 severity, P2 subperiod, P3 episode); 3 — choices/cohorts sealed and
  committed; **next-slice runs RUNNING**; analysis not started; 4 not started.
- **Running:** unit `opa-s3b.service` (opa.slice), `npm run opa -- stage3 run`, started 2026-11-10T23:12:05Z, log
  `results/logs/opa-s3b.log`; archives `.cache/optimization-process-audit/jobs/cohort-<s>-<cut>/archive.sqlite`
  (resumable: rerun the same command; archived keys are replayed). Done when `results/stage3/outcomes.json` is sealed.
- **Next actions:** commit outcomes → `chains/unit.sh opa-s3c --wait stage3 analyse` → commit → `… opa-s4a --wait stage4
  freeze` → commit → `stage4 validate` only if C24_FREEZE.json says `futile: false`.
- **Compute so far:** fresh 4,230 (Stage 1 4,076; pilot 154); next-period 42 of 800.

## Environment

- Repository root `/home/chad/projects/margin-trading`; Node 24.21.0; runner `npm run opa -- <command>` (package.json).
- Subjects (read-only): 3B `research/vg-d1-growth-expanded/` (19 sealed records verify), 4A
  `research/gdx-growth-standalone/` (20 verify); both preflights PASS. Evaluation digests 3B `41bf69bf…`, 4A `74173d33…`.
- Data pins verified: GDX `77dba9b2…5049`, VGT `2ee06310…412e`. Archive pins: `results/protocol-freeze.json`
  (4A's equal its own archive manifest).
- Containment: `research/optimization-process-audit/chains/unit.sh <unit> [--wait] <args>` (opa.slice 44G/48G/0).

## Code (src/optimization-process-audit/)

context, records, sources, freeze, subjects (adapters; archives opened read-only with node:sqlite; doors via Priority
3's loaders with quiet logs — this study logs to its own `results/doors.jsonl`), scan, inventory, reproduce, mechanism,
cohort, decision, runner, pilot, compute (ledger `results/compute.jsonl`), stage1, stage3 (pilot only so far), main.
Tests: `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/optimization-process-audit/tests/*.test.ts`
(9 pass).

## Guards

- Never write into subject or context study directories. Archives opened read-only.
- No next-period outcome of any non-published candidate before `results/stage2/POLICY_FREEZE.json` and
  `results/stage3/CHOICES.json` are sealed and committed. FULL only after `results/stage4/C24_FREEZE.json` (sealed,
  committed) and only if not futile (PROTOCOL.md §7.6).
- Sealed records: never rewritten (`npm run opa -- verify`).
- The runner pilot uses D19 only (boundary 2018-12-31).

## Disclosures so far

- 3B's sealed diagnostics used the episode's first ENTRY session for its blackout window; 4A (after its R1) the first
  DECISION session. This study uses the decision session for both (PROTOCOL.md §5.5), so 3B causal figures here can
  differ slightly from 3B's report.
