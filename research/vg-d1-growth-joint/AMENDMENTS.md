# Amendments — Priority 3 (vg-d1-growth-joint)

Append-only. Each entry: ID, UTC time, the change, why, which results existed, its effect. Criteria are never loosened
by an amendment once results they govern exist. Entries `R*` precede the protocol freeze; entries after the freeze are
`A*` (substantive) or `O*` (operational).

## Before the freeze

### R1 — 2026-11-08T23:40Z — budgets and execution settings set from the pilot bench

- **Change.** The drafted schedule (arm D: 3 base islands × 768 new proposals per cell; GC after every 8 evaluations)
  became: arm D and arm C islands × **1,024** new proposals (3 base + 1 extension); **15** workers; a full GC after
  every **64** evaluations (the ArrayBuffer guard of 256 MiB unchanged).
- **Why.** The bench (PROTOCOL.md §13.4) showed throughput saturating at ≈ 50 evaluations/s from 12 workers (GC every
  8), 64.3/s at GC every 64 with the same 9.5 GiB peak. At that throughput the larger island budget fits a bounded run
  (≈ 5–7 h) and gives each cell more proposals than Priority 2's (1,536–2,304) for a space with two more books; the
  768-proposal cap was not copied (brief §5).
- **Results that existed.** Only bench timings and memory (engineering; random configurations' results never read).
- **Effect.** More search per cell; no rule, gate or role changes.

### R2 — 2026-11-08T23:40Z — workers start four at a time

- **Change.** The worker pool starts its workers in batches of four instead of one at a time.
- **Why.** Each worker parses both symbols' minute files (≈ 6 s alone); serial starts cost ≈ 90 s per job. Batches of
  four bound the transient parsing memory (peak job cgroup ≤ 10.1 GiB at 16 workers).
- **Effect.** Operational only (results are independent of the start order).

### R3 — 2026-11-09T00:17Z — the protocol header records the sealed parity and the pilot; re-adoption

- **Change.** The protocol's header now cites the sealed parity (`results/parity/parity.json`, 495 checks, 0 failed) and
  the pilot record (`results/pilot/PILOT.md`); `STANDARD_ADOPTION.json` re-adopted with the new protocol sha256.
- **Results that existed.** Engineering only (parity, pilot); no search, qualification or fold result of the study.
- **Effect.** Wording only; no rule changed.

## After the freeze

### O1 — 2026-11-09T00:19Z — the study chain runs as its own systemd user unit

- **Change.** `chains/study.sh` calls Node by its absolute path, so the chain itself can run as a transient user unit
  (`vgjoint-chain`, outside the memory slice: it only launches and waits for the heavy units, one at a time, inside
  `vgjoint.slice`) independent of the interactive session.
- **Results that existed.** None (no study stage had run).
- **Effect.** Operational only.
