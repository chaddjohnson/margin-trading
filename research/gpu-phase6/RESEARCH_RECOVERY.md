# RESEARCH_RECOVERY — gpu-phase6 (Maglev protection beyond the official path; concurrent-job isolation)

## Top screen

- **Updated:** 2026-11-21T10:48Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — S1, S2 committed. Campaign C1–C5 complete (all 9 comparisons identical); C6 first run
  failed 156/157 on a sampler defect (amendment A2: `ps unit` vs `uunit`), bounded re-run `chains/process-audit.sh`
  done (14 node processes, all `--no-maglev`; 2 more identical comparisons), C6 re-run 210/210 PASS; **C7–C8 RUNNING**
  (unit `p6chain-campaign-r1`, `START=6`, started 10:46Z). **RISK-ENVELOPE PILOT NOT
  STARTED** (out of scope; nothing of it is created, configured, preflighted or run).
- **Authority:** `brief/BRIEF.md` (verbatim copy of the user's assignment, 2026-11-21). `PROTOCOL.md` FROZEN
  2026-11-21T10:08:41Z sha256 `0737314415ee5c034fef6e4ecc03d850c3e06112971005e24ce08b48310dc474`
  (`results/protocol-freeze.json`); amendments: A1 (portfolio parity reads FULL), A2 (process-audit sampler defect, re-run). Standard 3.0.0 (scope diagnostic); preflight PASS.
- **Baseline:** `main` = `research/gpu-phase2` = `830a1221029c0569be647e0af3d335c6c9b3df5a`; accepted record
  `config/gpu-backend/acceptance.json` sha256 `49e95d7a78fe5823273e9df3d2edc37500a58bad37bf0867b7c4a19f718666b4`
  (verified 09:4xZ with `verify-acceptance.sh --device --expect-record-sha256 …`: VERIFIED); binary
  `research/gpu-phase5/build/gb5` sha256 `f444c52139ebd8b2481fcde8a69cf8564c91dc426c6e74f366c70be5c714041e`.
- **Running:** `p6chain-campaign` (systemd user unit in `gpup6.slice`; sub-units `gpup6-*`). Check:
  `systemctl --user list-units 'gpup6-*' 'p6chain-*'`; `tail research/gpu-phase6/results/logs/chain-campaign.txt`
  (ends with `chain complete` or `FAILED: …`). Never launch a second chain while it is active.
- **Next:** when the chain completes: commit results; negative + tamper suites on the committed tree; npm test, tsc,
  Strategy Lab suites + portfolio parity; integrity re-check; `tools/gpu-phase6/accept.ts`.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch **`research/gpu-phase6`** created from `830a1221` (no other
  worktree). Branch to restore at the end: **`research/gpu-phase2`**.
- Node v24.21.0 (`.node-version`).

## Constraints discovered (do not violate)

- `src/gpu-backend/compat.ts` is in the evaluation (host) manifest: editing it changes the digest compiled into the
  binary → a full §2 acceptance. So the new job module lives OUTSIDE `src/gpu-backend/` and is pinned by the acceptance
  record as an enforcement extra (`acceptance.ts` requires it), never by editing compat.ts.
- `src/app.ts`, `src/app/pools.ts`, `src/pools/**`, the package.json `imports` map and `package-lock.json` are bound by
  the prospective B4/B5 freeze (`research/prospective-b4-b5-shadow/PROTOCOL.md` §8): never edit them. (Its `pools`
  script-line binding has mismatched since GPU Phase 2's commit 60553b27 — pre-existing, disclosed.)
- Frozen legacy runner directories (`config/gpu-backend/entrypoints.json` legacy digests) are never edited.

## Stage table

| Stage | Status | Notes |
|---|---|---|
| S0 baseline, brief, protocol | complete | `results/baseline/` (research blobs, 22 preflights PASS, seals 999 protected, forward-freeze failures, compat digests); protocol frozen 10:08:41Z |
| S1 Maglev protection | complete (`73b9ebf2`) | runtime.ts guard + helpers, legacyRunner gate, 57 root + 16 Strategy Lab npm scripts, Strategy Lab server/runners/NODE_FLAGS/replay/vitest/playwright/service template; tier-probe regression tests pass |
| S2 job isolation | complete (`73b9ebf2`) | src/gpu-jobs (jobs.ts, lock.ts, cli.ts, tests 10/10), lab.ts ownership, official.ts preflight-job, acceptance.ts ENFORCEMENT_EXTRAS, official-preflight job |
| S3 unit tests | complete | GPU-backend + jobs tests pass except the 2 expected stale-acceptance tests (merge gate, independent verifier) until the new record |
| S4 GPU campaign C1–C8 | C1–C6 complete; C7–C8 running | `chains/campaign.sh`; C1 10:09–10:10, C2 –10:12, C3 –10:23 (585 s), C4 10:23–10:42, C5 9/9 identical, C6 run1 FAIL (A2) → `chains/process-audit.sh` 10:43–10:46 → C6 210/210; resumed `START=6` |
| S5 acceptance record | not started | |
| S6 merge, push, restore | not started | |
| S7 report, bundle | not started | |
