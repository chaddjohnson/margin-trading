# RESEARCH_RECOVERY — gpu-phase6 (Maglev protection beyond the official path; concurrent-job isolation)

## Top screen

- **Updated:** 2026-11-21T09:50Z (UTC, from `date -u`)
- **Status:** **INCOMPLETE** — stage S0 (baseline, brief, protocol) in progress. **RISK-ENVELOPE PILOT NOT STARTED**
  (out of scope; nothing of it is created, configured, preflighted or run).
- **Authority:** `brief/BRIEF.md` (verbatim copy of the user's assignment, 2026-11-21). `PROTOCOL.md` (to be frozen
  before the acceptance campaign). Standard 3.0.0 (scope diagnostic).
- **Baseline:** `main` = `research/gpu-phase2` = `830a1221029c0569be647e0af3d335c6c9b3df5a`; accepted record
  `config/gpu-backend/acceptance.json` sha256 `49e95d7a78fe5823273e9df3d2edc37500a58bad37bf0867b7c4a19f718666b4`
  (verified 09:4xZ with `verify-acceptance.sh --device --expect-record-sha256 …`: VERIFIED); binary
  `research/gpu-phase5/build/gb5` sha256 `f444c52139ebd8b2481fcde8a69cf8564c91dc426c6e74f366c70be5c714041e`.
- **Running:** nothing.
- **Next:** capture integrity baselines (results/baseline/), then implement (S1, S2).

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
| S0 baseline, brief, protocol | running | |
| S1 Maglev protection | not started | |
| S2 job isolation | not started | |
| S3 tests (unit, suites) | not started | |
| S4 GPU campaign (concurrency, parity, negative, tamper) | not started | |
| S5 acceptance record | not started | |
| S6 merge, push, restore | not started | |
| S7 report, bundle | not started | |
