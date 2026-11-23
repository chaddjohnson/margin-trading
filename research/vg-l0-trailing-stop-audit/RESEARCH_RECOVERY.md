# RESEARCH_RECOVERY — Priority 3: D1/Growth trailing-stop audit and staged-stop design (audit/design only)

## Top screen

- **Updated:** 2026-11-23T10:04Z (UTC, from `date -u`). **Status: COMPLETE** (audit and design deliverables written
  and verified). Delivery (commit, ZIP, push) is recorded in "Delivery" below.
- **Task:** audit and design only.
  - Brief: `brief/BRIEF.md`, sha256 `1f10216eab6f6ec53986dd91b43f9377b3c4c6be2a00a1cb7bb1b8a26c8217f8`, 189 lines,
    final line "PRIORITY 4 NOT STARTED — awaiting review and separate authorization", verified complete.
- **Authority:** the brief; `CLAUDE.md`; standard 3.0.0 (`4e8244e6…`, read, not adopted: this namespace performs no
  optimization or evaluation and has no `STANDARD_ADOPTION.json`).
- **Stages:** Phases 0–6 of the brief complete. **Nothing is running**; no process or job was started.
- **Next authorised step:** none. **PRIORITY 4 NOT STARTED — awaiting the user's review of `DECISION_REGISTER.md`
  (D1–D17) and separate authorization.**

## Environment

- Repository root (main checkout, single worktree); every path below is repository-relative.
- Branch `research/vg-l0-trailing-stop-audit`, created from `research/vg-l0-risk-envelope-stage-b-diagnostics`
  `48090c55b4f78fad9a17be3c0b647f5ec5d4d5dc` (clean). `main` = `3606f4b3`, unchanged.
- Working-tree changes: only `research/vg-l0-trailing-stop-audit/` (new).
- Node 24.21.0 (`.node-version`); Python 3 (`-I`) for read-only arithmetic.

## Stage table

| Stage | Status | Output | Notes |
|---|---|---|---|
| Phase 0 sources and provenance | complete | SOURCE_MAP.md, VERIFICATION_REPORT.md §2 | acceptance `bb0e3fcf…` VERIFIED; preflight `--all` 28 PASS; registry PASS |
| Phase 1 exit-mechanics audit | complete | AUDIT_REPORT.md §1–§9 | code read at the base revision; CPU and CUDA |
| Phase 2 giveback evidence | complete | AUDIT_REPORT.md §10; `analysis/giveback_tables.py` + `.out.txt` | committed tables only; no archive restore; no market data |
| Phase 3 designs | complete | STAGED_STOP_DESIGN_OPTIONS.md | S1 recommended; S2, S3 and others not yet |
| Phase 4 GPU plan | complete | GPU_PARITY_AND_INTEGRATION_PLAN.md | nothing implemented |
| Phase 5 Priority 4 protocol | complete (proposal) | PRIORITY4_RESEARCH_PROTOCOL_PROPOSED.md | not frozen, not authorized |
| Phase 6 decisions | complete | DECISION_REGISTER.md, READ_FIRST.md | — |
| Handoff | see Delivery | SHA256SUMS.txt; `bundle/vg-l0-trailing-stop-audit.zip` | — |

**Resume semantics.** The deliverables are documents. A rerun means re-reading the same sources at `48090c55`.
`analysis/giveback_tables.py` is deterministic when run from the repository root.

## Key findings (the authoritative text is in the deliverables)

- D1 and Growth share one net-profit-activated trailing stop:
  - session-high ratchet, once a day, acting from the next session, single distance τ;
  - implied activation +7.9 % / +6.5 % / +6.1 % (D1·VGT / D1·GDX / Growth·VGT, day 0); it can lapse.
- No canonical feature tightens the distance after a profit threshold. Prior art: the d1-refinement activation
  variants (no gain); Study 3's ratchet (failed in 2022).
- New L0's winners gave back ≈ τ × (value at the peak): $299.9k against $280.7k. Gaps beyond the level cost $10.9k.
  All 9 losing or open lots never armed the stop (maximum-hold exits).
- Recommended: S1 (two-stage, H-anchored, legacy eligibility), engineering-first Priority 4, OFF selectable,
  ≈ 9 M evaluations ≈ 2.5 h of GPU.

## Guards (do not rerun / do not do)

- No `src/`, `apps/`, `config/`, `tools/` or dataset change in this task. No optimization, search, evaluation, GPU job
  or archive restore.
- Do not start Priority 4 without the user's explicit authorization of the rule family and protocol.
- Do not merge into `main`; do not force-push.

## Corrections made during the task (disclosed)

- An early terminal reading suggested `gaps-through-stop.csv` listed New L0's lot 9 twice. That was overlapping `head`
  and `grep` output. The consolidated script confirms 9 rows and no duplicates ($10,918.91). All documents were
  corrected before the first commit.
- Line references were re-verified against the files and corrected where an early estimate was off: the ExitManager
  ends at 392, `evaluate` at 391, RC `evaluate` at 213, and `gOnEntry` is 147–157.

## Delivery

- **Documentation commit:** `d5006b743c6ad6173db14c2435bc3f72ff1ac7ed` (12 files + SHA256SUMS.txt, all verified OK by
  `sha256sum -c`).
- **Handoff ZIP:** `bundle/vg-l0-trailing-stop-audit.zip`, sha256
  `9a666fe86dd269035ec409fbd45f6e95d845366c6b27b7cd561406e058dda85c`, 14 files (the 13 committed files + IDENTITY.txt).
  - Built 2026-11-23T10:05Z with `git archive` from `d5006b74`.
  - `zip -T` OK. After extraction into an empty scratch directory: `sha256sum -c` 12 / 12 OK, and `diff -r` against
    the committed tree is empty.
  - The secret and personal-data scan of the namespace is clean.
  - Copy outside the repository: `~/.local/share/margin-trading-gpu/handoffs/vg-l0-trailing-stop-audit.zip` (same
    sha256). The ZIP's own SHA256SUMS.txt covers the files it lists, not this checkpoint's later delivery section.
- **Push:** `git push -u origin research/vg-l0-trailing-stop-audit` (new remote branch, no force). Verification with
  `git ls-remote` is recorded in the follow-up commit.
- **Scratch:** the ZIP build and extraction directories in the session scratchpad are temporary. Nothing was restored
  from any archive.
