# AMENDMENTS — gpu-phase6 (append-only)

Each entry: ID, UTC time, the change, why, which results existed, its effect. None so far.

## A1 — 2026-11-21T10:11:25Z — Strategy Lab's portfolio parity reads the FULL canonical files

- **Change.** PROTOCOL.md §4 says FULL and the validation window are not opened; gate E7 also names Strategy Lab's
  portfolio parity (`apps/strategy-lab/scripts/portfolio-parity.ts`), which replays the five frozen pooled candidates of
  its catalog on ONE FULL door (Priority 3's FULL loader, quiet, read-only) and compares every figure, lot and funding
  decision with their archived records. §4 is amended: that one script, and only it, reads FULL.
- **Why.** It is Strategy Lab's own established regression procedure for its runner path (Priority 6), the strongest
  available check that Strategy Lab's CPU results under `--no-maglev` equal sealed records (brief §1.8, §3 "Strategy
  Lab continues operating normally"). It makes no decision: the candidates are frozen, their 2025–2026 outcomes are
  archived and were examined long ago; nothing is selected, ranked or tuned.
- **Results existing.** None of E7's Strategy Lab part (the campaign was at step C2/C3; no portfolio parity has run).
- **Effect.** One extra read of FULL by a non-research script; no gate or criterion changes.

## A2 — 2026-11-21T10:43:36Z — the process audit's sampler selected nothing (a tool defect); bounded labelled re-run

- **What happened.** Campaign step C6 (the isolation audit) failed 156/157: its process audit found **0** sampled
  processes. The chain's sampler filtered `ps -eo …,unit,…` for units `gpup6-*`, but for a process of a systemd *user*
  unit `ps`'s `unit` column shows the system unit `user@1000.service`; the user unit is the `uunit` column. The file
  `results/runtime/process-samples.txt` is empty (kept as it is). The fail-fast chain stopped; C7 and C8 had not run.
- **What it does not affect.** Every other check of C6 passed (156), including each job's own engine record (all nine
  campaign jobs: `execArgv` with `--no-maglev` exactly once, Maglev disabled) and every C5 comparison (9/9 identical).
  Only the observation of the CHILD processes (the CPU arm's forked workers) is missing.
- **Change.** The sampler uses `uunit` (`chains/campaign.sh`, the chain is not running). A bounded re-run of the
  process audit (`chains/process-audit.sh`): the mini schedule on the GPU (job `a2-audit-mini-gpu`) and on the CPU arm
  with 12 forked workers (job `a2-audit-mini-cpu`) at the same time, sampled every second with the corrected field into
  `results/runtime/process-samples-a2.txt`; both must equal the C1 reference (two more identity comparisons). The
  audit's check reads the re-run's samples and states that the original sample file is empty because of this defect.
  The criterion is unchanged (every sampled Node process of the units runs with `--no-maglev`; ≥ 12 forked CPU workers).
  Then the chain resumes at C6 (`START=6`: the audit, C7, C8).
- **Results existing.** C1–C5 complete (all identical); C6's first run failed only on this check.
