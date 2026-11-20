# gpu-phase4 — amendments to the frozen protocol (append-only)

`PROTOCOL.md` is frozen by `results/protocol-freeze.json` (its sha256 and the commit). It is never edited; every change
after the freeze is recorded here with its ID, UTC time, the change, why, which results existed and its effect. No gate,
tolerance or decision rule is loosened after results it governs exist.

## A1 — 2026-11-20T09:19:03Z: the group verifier streams its key maps (tool defect; no method or result change)

- **What happened:** stage B5's first group `a2-ss1-w8` (the Assignment 2 job's 400,000-evaluation prefix) ran normally
  (exit 75 as designed), but `tools/gpu-phase4/verify.ts` failed reading the Assignment 2 reference map (2,196,920
  rows) as one string (`ERR_STRING_TOO_LONG`, V8's maximum string length). The gate refused the group for its missing
  verification and the chain stopped fail-fast at 08:57:13Z (as designed); the job's archive and key maps were kept.
- **Change:** `readMap` reads the JSONL maps line by line (`node:readline`) instead of as one string. The checks are
  unchanged. The fixed tool reproduces the earlier verdict record of `smoke-m1` byte for byte (apart from its time)
  and verified `a2-ss1-w8` identical (405,681 archived evaluations = the accepted Assignment 2 reference).
- **Results that existed:** B1, B2, B2r, B3, B4 (verified with the old reader: identical; their maps are under the
  string limit). **Effect:** none on any result or decision; B5–B9 resume from the next group (`a2-ss2-w8`) with
  `chains/b5-b9-resume.sh` (the remaining lines of `chains/b3-b9.sh`, same allocations from `results/decisions/b2r.json`).

## A2 — 2026-11-20T09:50:02Z: the FULL door's guard file made read-only again (its content verified); B8–B9 rerun under new names

- **What happened:** stage B8's first group `r1-w8` (the FULL-door detailed-risk stress case) refused at start-up: Priority
  3's FULL-door guard (`src/vg-d1-growth-joint/data.ts` `checkGuard`) requires its frozen selection
  `research/vg-d1-growth-joint/FROZEN_SELECTION.json` to be read-only, and the file was mode 664. Cause: GPU Phase 3's
  branch switches for its merge (2026-11-19T23:04:57Z) recreated every file under `research/` with default permissions
  (Git does not track the read-only bit; every `FROZEN_SELECTION.json` and other sealed file of the studies on this
  branch lineage is now 664). The job failed closed before any evaluation; the chain stopped fail-fast at 09:45:41Z.
- **Change:** `chmod 0444` of that one file after verifying its sha256 equals the guard's pin
  (`e29e35e290c1f9a424410b02c048889021fa818f16c324085bae8bf5bdcebfe2`) — its content and Git state are unchanged.
  The other studies' sealed files are left as they are (outside this study; disclosed for the user's decision). This is
  needed by the protocol's FULL-door workloads (W-R here, the acceptance campaign's FULL parity runs later).
- **Results that existed:** B1–B7 (none used FULL). **Effect:** none on any result; the failed group `r1-w8` keeps its
  record (write-once); B8 runs as `r1b-w8` and `r2b-w8` (labelled reruns) and B9 follows, by `chains/b8-b9-resume.sh`.
