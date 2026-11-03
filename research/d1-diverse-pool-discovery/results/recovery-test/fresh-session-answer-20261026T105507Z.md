is_error False turns 3 cost 0.14871410000000002
I read the snapshot and listed the files it names. I did not run any commands, so I could not recompute any hash.

**1. Current stage.** Final audit, in the post-M4 close-out phase. The next incomplete item is the §13A recovery re-test (attempt 3), and I am the session running it. All study stages M0–M4 are sealed.

**2. Frozen protocol.** The path is `research/d1-diverse-pool-discovery/results/protocol_freeze.json`.
- File sha256: `fc22c70be5dd5c22725127b2b08985c260a850236e3b5925615a3234d50f5747`.
- bodyHash: `918c221b…`, quoted in full in the snapshot.
- It binds `PROTOCOL.md` `6e4df57a…`, the context `98428dac…` and the code manifest `fd549635…`.
- The amendment head is amendment 1, `7a0aa610…`. It changed `final.ts` only, and the code manifest moved to `42d2dd47…`. There is no later amendment.
- `protocol_freeze.json` exists on disk.

**3. Stage status.**
- **Complete and sealed:**
  - M0: design commitment and change log.
  - M1: checks and freeze.
  - M2: controls, fold-a, fold-b, determinism and the procedure gate. The gate failed for both procedures: GP(J) on clause iii, GP(T) on clause i.
  - M3: final search, amendment 1, final select, selection freeze and confirm-B.
  - M4: `evaluation.json`, with no nominee.
  - Also done: three independent reviews, the descriptive ledgers and my own final checks. Of these, `evaluation.json` and the three reviews are on disk; I did not look for the rest.
- **Incomplete, in order:**
  1. The §13A re-test (attempt 3).
  2. The independent final-audit agent, which also covers finishing `IMPLEMENTATION_AUDIT.md`.
  3. The memory note and the `MEMORY.md` index line.
  4. The final report.

**4. Running process.** The checkpoint says none is running.
- **Check:** before doing anything I would run `ps` for the `diverse-d1` / `node` study processes, and `ps -p` on any recorded PID or harness task ID. I would also look for an active final-audit agent with `ListAgents`.
- **Gap:** the snapshot says the `ps` pattern was verified but doesn't state the pattern.
- **Files:** `reviews/final-audit.md` is absent, so the audit report is not there. `reviews/final-audit.PROMPT.md` exists.

**5. Single next action.** Do the §13A step: save this answer to `results/recovery-test/` and record it in §6. The snapshot's `fresh-session-20261026T105507Z.json` is already there, and I'm treating it as this attempt's output file.

After that comes the final-audit agent, and the decision rule applies to it:
- If `reviews/final-audit.md` is absent, no agent is running and no study process is running, launch the audit agent with `reviews/final-audit.PROMPT.md`.
- If an agent or process is running, inspect it and don't relaunch.
- If any sealed record fails to verify, stop and report (guide §2.7).

**6. Never rerun.**
- Every sealed stage.
- Anything in `research/d1-robust-pool-discovery/` or the earlier studies.
- No study command may run again, because every outcome stage is write-once.
- Also off limits: 2024–2026 data for this study, commits or pushes, and broker, order or download actions.
- `legacy-check` and the read-only final checks may be rerun.

**7. Sealed versus active.**
- **Sealed on disk:** the freeze, commitment, controls, folds, procedure gate, final search, `selection.json`, `FROZEN_SELECTION.json`, `confirmB.json`, `evaluation.json` and `PROTOCOL_FREEZE.json`.
- **Not sealed:** the reports, which are editable. These are `IMPLEMENTATION_AUDIT.md` (draft), plus the confirm-B §4 text and the `HISTORICAL_CONFIRMATION.md` hashes, both pending.
- **Not yet written:** the audit report, the memory note, and the attempt-3 result.

**8. Ambiguities.** None blocks the next action.
- **Stage table:** the last row (line 90) says "reports, §13A test, final audit — not started". The reports row above it says complete, and the top screen says the reports are finalised. I read it as covering only the §13A test and the audit.
- **`ps` pattern:** it is not written out.
- **Hashes:** I could not recompute any, so I am relying on the snapshot's quoted values.
- **Audit report location:** `reviews/final-audit.md` is absent, which matches the checkpoint.

**SUFFICIENT**
