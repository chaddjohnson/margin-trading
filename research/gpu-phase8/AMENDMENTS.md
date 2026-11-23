# AMENDMENTS — GPU Phase 8 (append-only)

## E1 — 2026-11-23T13:02Z (commit 54261ea0) — campaign attempt 1 stopped at the negative suite; two fixes, the campaign restarts from step 1

- **What happened.** `chains/final.sh` (started 12:55:43Z at `5d3ddccc`) built gb8 (`b156b88d…`, reproducible) and
  stopped at step 2: the negative suite's inherited Phase 7 case "the Lab refuses a delivered envelope with a liquidation
  banked DD below the marked one" crashed the process with an unhandled `EPIPE` on the GPU server's input pipe during
  cleanup (the pool had already ended the server; `GpuServer.close` wrote QUIT before the exit event was processed). A
  standalone rerun of the suite did not crash (a timing race) and showed two of the new staged cases failing on their
  expected message only: the previous (v2) server is refused at the compatibility-digest check (`preflight-compat`)
  before the capability check; a Growth·GDX staged configuration was canonicalized away before validation and refused as
  "empty" instead of "out of scope".
- **Fixes (no rule changes).** `src/gpu-backend/client.ts`: an error on the server's input pipe is the server's death (the
  pending request fails closed). `src/gpu-backend/encode.ts`: the raw staged value is validated before canonicalization.
  `tools/gpu-phase8/negative.ts`: the old-server gate case accepts `preflight-compat`. The generator's declared host change
  set adds `client.ts`. No evidence of attempt 1 is used: the campaign reruns from step 1 on the new commit.

## E2 — 2026-11-23T13:27Z (commit 0ca36f68) — E8/E10 adapted to studies that require the GPU backend; the integrity baseline (before the tests chain)

- **Why.** The E8/E10 tools were copied from Phase 7, whose tree had no study requiring the GPU backend. On this branch
  three studies declare `gpu-required` (`vg-l0-risk-envelope-pilot`, `vg-l0-risk-envelope-stage-b`, and Priority 4's own
  `vg-l0-staged-stop`). While the record in force (Phase 7) is stale — by design, until this study writes the new record —
  their preflights fail with the §9.9 block, and so does the repository test that runs every study's preflight. The
  copied integrity check also had no baseline under `results/baseline/` and still declared Phase 7's change set.
- **Changes (tools only; no rule, threshold or evidence of the campaign changes).**
  - `tools/gpu-phase8/baseline.ts` (new): the baseline from Git objects of **5d587bb2**, the last commit before any
    staged-stop change (tracked research blobs, the 28 studies with adoptions, the base sha256 of every current manifest
    file), plus the read-only seal check and the forward-freeze list captured on the current tree.
  - `tools/gpu-phase8/integrity.ts`: excluded directories `research/gpu-phase8/` and `research/vg-l0-staged-stop/` (the
    task's own study); a base study's preflight passes or — before the new record only — fails with exactly one error, the
    §9.9 stale-acceptance block naming only files pinned by the record in force; the evaluation check requires the changed
    manifest files against the base commit to be exactly the declared staged-stop sets (`accept.ts`'s lists).
  - `tools/gpu-phase8/tests-record.ts`: `src/research-standard/tests/preflight.test.ts` › "every study that declares an
    adoption passes the preflight" joins the record-in-force tests (accepted before the record only with the stale
    reason; at most 3).
  - After the record: `results/tests/record-in-force-after.txt` reruns the policy, enforcement and preflight tests and
    every study preflight; all must pass.
