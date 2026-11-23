# AMENDMENTS — GPU Phase 8 (append-only)

## E1 — 2026-11-23T13:10Z — campaign attempt 1 stopped at the negative suite; two fixes, the campaign restarts from step 1

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
