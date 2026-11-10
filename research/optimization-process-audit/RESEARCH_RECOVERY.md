# RESEARCH_RECOVERY — bounded optimization-process audit (archive reselection)

## Top screen

- **Updated:** 2026-11-10T22:59Z (UTC, from the clock). **Status: INCOMPLETE — Stage 1 (scan running).**
- **Task:** the user's bounded optimization-process audit brief (`brief/BRIEF.md`, sha256
  `75842bfb3e0fa849cc298ed0da897c73bfe1daf289a1d75f9358adfc621062f1`, 147 lines, read in full to "Stop for review.").
- **Branch:** `research/optimization-process-audit` (main checkout), from `f52deea7`.
- **Authority:** `PROTOCOL.md` sha256 `e5f42a4e160b…` FROZEN by `results/protocol-freeze.json` (sha256 `a4b95fa3671d…`),
  committed `6933fbf5`. `AMENDMENTS.md`: none yet. Standard 2.0.0 adopted (`STANDARD_ADOPTION.json`; preflight PASS).
- **Stages:** 0 set-up — complete; 1 — **running** (archive scan unit `opa-scan`), then inventory → reproduce (G1–G7)
  → commit → mechanism; 2 policy freeze — not started; 3 — not started; 4 — not started.
- **Running:** systemd user unit `opa-scan.service` in `opa.slice` (44G/48G/swap 0), `npm run opa -- stage1 scan`,
  started 2026-11-10T22:50:34Z, log `results/logs/opa-scan.log`; outputs `.cache/optimization-process-audit/scan/<3B|4A>-<C19|C21|C23>.jsonl`
  (3B C19 `459d7b75…`, 3B C21 `11263470…` done). Finished cleanly when the log shows "4A C23: … configurations" and the
  unit is inactive. A rerun skips existing scan files (delete a partial one first; files are written atomically).
- **Next action:** after the scan: `bash research/optimization-process-audit/chains/unit.sh opa-s1a --wait stage1 inventory`
  then `… opa-s1b --wait stage1 reproduce`; require 0 failed checks; commit; then `… opa-s1c --wait stage1 mechanism`.

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
