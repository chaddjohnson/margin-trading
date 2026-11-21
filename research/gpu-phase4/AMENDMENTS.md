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

## A3 — 2026-11-20T10:15:25Z: one confirmation run of the Mode A recommendation with complete jobs (declared before it runs)

- **Why:** the decision rules R1–R4 are applied and frozen (`results/decisions/b2r.json`: Mode A k* = 2, 8 host workers,
  batch 8,192). The steady-state design measured the aggregate on a 300,000-evaluation prefix; for two COMPLETE
  independent Assignment 3 jobs the job-completion figures would otherwise be a projection (≈ 2 × 583.6 s / 1.25).
- **Addition (no change to any rule, decision or gate):** after the new acceptance, one group `modeA-complete` — two
  identical complete Assignment 3 C19 broad1 jobs at the same time (k = 2, 8 host workers, batch 8,192, MODE ss without
  a stop) on the final binary — verified like every group (each job = the sealed record and the canonical CPU archive).
  It is reported as a confirmation and as Mode A's measured completion time; it cannot change k*, the allocation or the
  batch. If it disagreed materially with the projection, the report would say so.
- **Results that existed:** B1–B9 and the decisions. **Effect on them:** none.

## A4 — 2026-11-20T11:58:46Z: one unattributed parity mismatch in the final campaign; attribution added; the campaign completed for evidence

- **What happened:** the acceptance campaign's parity run `D24-fund` (door D24, option set `fund`, detail + risk;
  1,561 candidates) found **one mismatch**: candidate `O-fund:coarse:28` — books, pooled replay and risk envelope
  identical, the detailed **record hash different**; the run's in-process re-evaluation (CPU in process, GPU alone) found
  no field difference. The campaign stopped fail-fast at 11:43:40Z (parity gate: zero tolerance). The run kept only
  booleans, not the two original hashes, so the side cannot be read from the record.
- **Tracing (results/diagnostics/):** `d24-fund-gb4.json` and `d24-fund-gb4-smoke.json` rebuild the run exactly
  (`tools/gpu-phase4/diag-mismatch.ts`, the campaign's server history incl. the smoke kernel): CPU fresh = CPU after
  every earlier task = the 12-worker CPU pool (twice) = GPU in the full batch (2 + 20 repeated batches of all 1,561
  candidates, 0 differences) = GPU alone — candidate 28's hashes identical everywhere (record `f17d66f4…`).
  `d24-fund-cache-pairs.json` (`diag-cache.ts`): every other task j evaluated before the candidate in a cleared
  process (1,560 pairs) leaves its record unchanged — no cache poisoning. The kernel log shows no GPU (Xid) or memory
  (MCE/EDAC) error; the GeForce card has no ECC and reports none. **The mismatch is not reproducible and not
  attributable** to the CPU reference or the GPU path: a transient (hardware or a rare race) on one side.
- **Consequence (not a loosening):** the parity gate of this campaign is FAILED and stays failed; the record of
  `D24-fund` is kept. CC1 cannot have caused it (its emitted JavaScript is byte-identical; the kernels are the
  accepted ones), so the event is evidence about the accepted engine or its CPU reference as much as about the final
  tree. The renewal of the acceptance therefore needs the user's decision (a departure from zero tolerance, §7.3, or
  further evidence); the Phase 3 acceptance stays in force on `main` until then.
- **Changes:** `tools/gpu-phase4/parity.ts` stores both sides' original hashes for every mismatch and attributes it
  (recomputes the CPU in process and the GPU alone and in the whole batch; verdict: reproducible defect / CPU-side
  transient / GPU-side transient). The remaining parity runs, and `D24-fund` again as `D24-fund-r2` (a labelled rerun,
  not a replacement), run with it; the parity chain continues past a mismatch (recording it) so that the campaign's
  evidence is complete; then the campaign continues from the finalists (step 5) as frozen. The parity summary includes
  the failed run. No comparison, tolerance or gate changes.
- **Results that existed:** B1–B9 (unaffected: their identity checks used the accepted engine and passed), the
  campaign's steps 1–2 and 18 parity runs (0 mismatches) and `D24-fund` (1 mismatch).

## A5 — 2026-11-20T14:01:56Z: Priority 3's pinned records made read-only again; the repository suite (gate A8) rerun

- **What happened:** the campaign's test step (14:01Z) found `npm test` with 1,696 tests, 29 failures: the 7 known
  pre-existing ones and **23 failures with one cause** — Priority 3's sealed-record guard (`src/vg-d1-growth-diagnostic/
  records.ts` `readP3`) refuses its pinned records because they are writable ("Priority 3's results/folds/C24/
  selection.json is writable", 22; and `instrument.test.ts` failing at load for the same reason, which is why 3 tests
  were not collected). The same cause as A2 (D3): GPU Phase 3's branch switches (2026-11-19T23:04:57Z) recreated the files
  with mode 664 after Phase 3's own test run. Not a regression of this study (no file of those studies changed).
  Strategy Lab passed (typecheck, lint, 314/314, e2e 81/81 on the one allowed rerun of a layout-timing test).
- **Change:** `chmod 0444` of the 9 writable records of Priority 3's pin list (`p3.records`,
  `src/vg-d1-growth-diagnostic/context.ts`), each verified equal to its pinned sha256 first (the tenth,
  `FROZEN_SELECTION.json`, was restored under A2). Contents and Git state unchanged. Other studies' sealed files stay
  as they are (outstanding decision in the handoff).
- **Rerun:** the test step (`chains/tests.sh`) once more, labelled; the first run's records are kept in
  `results/tests-run1/`. No test, comparison or gate changes.
