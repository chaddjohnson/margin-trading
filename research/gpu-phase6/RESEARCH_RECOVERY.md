# RESEARCH_RECOVERY — gpu-phase6 (Maglev protection beyond the official path; concurrent-job isolation)

## Top screen

- **Updated:** 2026-11-21T11:20Z (UTC, from `date -u`)
- **Status:** **COMPLETE.** Maglev protection extended (legacy runner gate + child-process guard, every npm script,
  Strategy Lab server/runners/tests); automatic job isolation (`src/gpu-jobs/`); **ACCEPTED** 2026-11-21T11:10:46Z
  (enforcement-only, checklist §2a; record sha256 `3610caaf0bfc14ecd5ea75981a69f9316ff9ff6b610d4913b949d36950c884d3`,
  supersedes `49e95d7a…`); **merged into `main`** (merge commit `dbb5aabaff4906bf3716a9bf64fe2ec297620a05`), verified
  after the merge (merge gate 27/27, verifier with rebuild VERIFIED, live gate OPEN, integrity 5/5, npm test = the 7
  known failures). **RISK-ENVELOPE PILOT NOT STARTED.**
- **Authority:** `brief/BRIEF.md`; `PROTOCOL.md` FROZEN 2026-11-21T10:08:41Z sha256
  `0737314415ee5c034fef6e4ecc03d850c3e06112971005e24ce08b48310dc474`; amendments A1–A4 (head A4). Standard 3.0.0
  (scope diagnostic); preflight PASS.
- **Accepted:** binary `research/gpu-phase5/build/gb5` `f444c521…` (unchanged), evaluation digest `3a6eacde…`
  (unchanged), source revision `065919ef`, acceptance commit `85622fb0`; out-of-repository copy
  `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase6-3610caaf.json` (0444) + `pins.jsonl` line.
- **Git:** the handoff commit (this checkpoint's, a documentation successor of the merge) is the tip of `main`,
  `research/gpu-phase6` and `research/gpu-phase2`; its hash and the remote verification are in `pins.jsonl` (outside the
  repository) and in the session's final message. `research/gpu-phase3`, `-phase4`, `-phase5` untouched.
- **Running:** nothing.
- **Deliverables:** `GPU_INFRASTRUCTURE_HARDENING_REPORT.md` (read first), `JOB_ISOLATION.md`, `MERGE_AND_RESTORE.md`,
  `MANIFEST.json` (sha256 of every file), the bundle `bundle/gpu-phase6-infrastructure-hardening-handoff.zip` (copy and
  `.sha256` in `~/.local/share/margin-trading-gpu/handoffs/`).
- **Next (the user's decision):** none pending here. The pilot and any official study need their own authorization.
- **Never:** rerun campaign steps into the evidence paths the record binds (50 entries); edit a pinned file (incl.
  `src/gpu-jobs/`) without a new acceptance; force-push.

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
| S4 GPU campaign C1–C8 | complete (chain complete 10:52:54Z); negative 67/67 (run 2, A3); tamper 20/20; suites 11:03–11:09Z (A4) | `chains/campaign.sh`; C1 10:09–10:10, C2 –10:12, C3 –10:23 (585 s), C4 10:23–10:42, C5 9/9 identical, C6 run1 FAIL (A2) → `chains/process-audit.sh` 10:43–10:46 → C6 210/210; resumed `START=6` |
| S5 acceptance record | complete | ACCEPTED 11:10:46Z, `3610caaf…`; record-in-force tests after 26/26; verifier VERIFIED; live gate OPEN |
| S6 merge, push, restore | complete | merge `dbb5aaba`; post-merge `chains/post-merge.sh` all pass; push + restore in `MERGE_AND_RESTORE.md` |
| S7 report, bundle | complete | `tools/gpu-phase6/bundle.sh` (verified) |
