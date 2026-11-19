# Amendments — gpu-phase2

Append-only log of changes after the protocol freeze (`results/protocol-freeze.json`). Format: ID, UTC time, change,
why, which results existed, effect.


## A1 — G8 stress duration 24 h → 8 h (user directive)

- **When:** 2026-11-19T09:26:02Z (the stress had run 4.48 h: 410 rounds, 13,434,880 evaluations, 0 failures, 19,632 CPU parity samples
  and 64 repeatability checks, all 0 mismatches).
- **Change:** gate G8's duration "≥ 24 h" becomes **8 hours total elapsed from the run's original start**
  (2026-11-19T04:55:53.744Z → 12:55:53.744Z), not 8 additional hours. Every other G8 condition is unchanged
  (production batch 8,192, periodic CPU parity samples, repeatability checks, no error, telemetry recorded), as is every
  other gate.
- **Why:** the user's instruction in the session ("reduce the currently running 24-hour GPU endurance test to 8 hours
  total elapsed time, measured from its original start … do not restart the test or discard completed results").
- **How (no restart, nothing discarded):** the running tool fixes its deadline at start (`const deadline`, from
  `--hours 24.05`) and has no runtime control, so the deadline cannot be changed in place. The run is ended at the first
  round boundary after 12:55:53.744Z: as soon as that round's summary is saved (atomic rename) the main process
  receives SIGTERM (`chains/stress-stop.sh`); the GPU server releases its device memory on the closed pipe. All
  completed rounds, telemetry, ledgers and verified parity samples stay on disk unchanged; `summary.json` keeps the
  tool's own content (`finished` stays null) and `results/stress/closure.json` records the stop and the derived
  statistics. Unrecorded by design: the round started after the boundary (never counted) and the 48 CPU parity samples
  of the final round, still running when the process stopped.
- **Effect:** G8 is judged against 8 h (`tools/gpu-phase2/accept.ts`); the reports state the shorter duration and its
  limitations. No result, threshold or code path of any other gate changes.
