is_error False turns 3 cost 0.13600600000000002
**Answers from the snapshot only.** I ran no commands and did not check the files on disk.

1. **Current stage:** M3, the final-round search. It has been running in the background since 06:40:39Z, started as `npm run diverse-d1 -- search --window final`. The checkpoint says arms J-u and T-u are complete, J-s was in stage B at 07:40Z, and T-s follows. Genetic-programming (GP) failed for both procedures, so the expected outcome is no advancement.

2. **Frozen protocol:** `research/d1-diverse-pool-discovery/results/protocol_freeze.json`, frozen 2026-10-26T04:20:08Z.
   - File sha256: `fc22c70be5dd5c22725127b2b08985c260a850236e3b5925615a3234d50f5747`.
   - bodyHash: `918c221b…5d84d015`.
   - It binds `PROTOCOL.md` (`6e4df57a…`), the context (`98428dac…`) and the code manifest (`fd549635…`).
   - There is no amendment head, because `amendments.jsonl` is absent. Pre-freeze change 1 is `17c8e445…`.

3. **Stage status:**
   - **Complete and sealed:**
     - M0: design commitment and change 1.
     - M1: legacy-check, audit, benchmark, reproduce, parity and freeze.
     - M2: controls, fold-a, fold-b, determinism and the procedure gate (J fail, T fail).
     - Both independent reviews (design, and before the final round).
   - **Running:** the final search.
   - **Not started, in order:** amendment 1, final select, pre-freeze independent review, freeze-selection, confirm-b, evaluate, reports, the §13A recovery test (attempt 1 was INSUFFICIENT; this is attempt 2) and the independent final audit.

4. **Process state:**
   - Harness task `br8lda5es` was running node PID 71646 at 07:51Z. The PID may be stale by now.
   - How I would check, before doing anything else:
     1. Look at the harness task status.
     2. Otherwise run `ps -ax | grep diverseD1`, and check whether the mtime of `results/logs/final.log` still advances.
     3. Read the last line of the log.
   - If the process is alive, I wait and launch nothing.

5. **Next action:**
   - **Last log line `FINAL-SEARCH DONE` and `results/rounds/final/search.json` present:**
     1. Run `python3 research/d1-diverse-pool-discovery/amendments/amend1_final.py`.
     2. Run `npx tsc --noEmit`, `npx prettier --write src/d1-diverse/final.ts` and `npx eslint src/d1-diverse`.
     3. Record the amendment with `npm run diverse-d1 -- amend --stage freeze-selection …` (full strings are in the checkpoint).
     4. Run `npm run diverse-d1 -- select --window final >> results/logs/final-select.log`.
   - **`FINAL-SEARCH FAILED`, or the process is gone with no final line:** read the error at the end of the log.
     - For a resource failure (out of memory, killed, disk full), rerun the identical search command with `>>` so the log is not truncated. Completed arms whose record verifies are kept, and the incomplete arm is moved aside and replayed. I would label the rerun in the checkpoint.
     - For an integrity or code error, stop and report. Search code can no longer be amended.
   - **Process still alive:** wait.

6. **Never rerun:**
   - Every complete stage above. In particular: commitment, freeze, controls, fold-a, fold-b, determinism and the procedure gate.
   - The October 25 study (`research/d1-robust-pool-discovery/`) and the earlier studies.
   - Never open 2024–2026 data for any configuration of this study.
   - Never commit, push or touch the broker.

7. **Sealed versus active:**
   - **Sealed on disk:** all the hash-listed records above, the two review reports (saved to `reviews/` at 07:45Z), and the prepared patch `amendments/amend1_final.py` (patch sha256 `203cef2c…`).
   - **Active:** `results/rounds/final/search.json` does not exist yet, and `final.log` is still being appended to.
   - **Not yet checkpointed:** the J-s and T-s arm results, and the pre-freeze review, which is pending.

8. **Ambiguities and gaps (none blocking):**
   - **Timestamps don't line up.** The snapshot filename says 07:44:11Z, but its content says "Updated 07:50Z" and gives a PID observation at 07:51Z. The snapshot is therefore at least slightly stale relative to its own stamp. It also may not match the current `RESEARCH_RECOVERY.md`, which I would compare first.
   - **Arm names are undefined.** "J-s", "T-s" and "u/s" are not defined in the checkpoint. I would read `PROTOCOL.md` for their meaning.
   - **Cannot confirm the hashes.** I did not verify the quoted hashes against the files, and I would do that before relying on them.
   - **The `ps` grep pattern is uncertain.** The `ps` pattern `diverseD1` is a guess at the process command line, so I would fall back to the PID and the log mtime.

**SUFFICIENT**
