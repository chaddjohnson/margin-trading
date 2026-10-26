is_error False turns 4 cost 0.1336661
**1. Current stage.** M3, the final-round search (`npm run diverse-d1 -- search --window final`). The checkpoint says it was running in the background as harness task `br8lda5es` when the snapshot was taken. Arms J-u and T-u were done, and J-s then T-s were still to run. Both walk-forward procedures failed their gate, so the expected outcome is no advancement. Nothing is evaluated after 2023.

**2. Frozen protocol.** `research/d1-diverse-pool-discovery/results/protocol_freeze.json`.
- File sha256 starts `fc22c70b…` and the body hash starts `918c221b…`. The checkpoint only gives truncated hashes.
- It was frozen 2026-10-26T04:20:08Z.
- No amendment exists yet (`amendments.jsonl` is absent). The change-log head is change 1, `17c8e445…`.

**3. Stage status.**
- **Complete and sealed:** M0, M1, the freeze, controls, fold-a, fold-b, determinism and the procedure gate. In the gate, J fails clause iii and T fails clause i.
- **Incomplete:**
  - the final search, which was running
  - amendment 1 (final.ts only)
  - the final select
  - the independent pre-freeze review
  - freeze-selection
  - confirm-b
  - evaluate (the no-advancement record only)
  - the reports
  - the §13A recovery test
  - the final audit

**4. Process check.**
- Yes, it may still be running. The snapshot is dated 07:38Z but the top screen says "~08:45Z", which is inconsistent.
- On disk, `results/logs/final.log` exists and has no `FINAL-SEARCH DONE` or `FAILED` line. `results/rounds/final/` and `amendments.jsonl` do not exist, so the search has not sealed.
- Before doing anything I would:
  - check whether harness task `br8lda5es` is alive
  - run `ps` for `diverse-d1` and `search --window final`
  - read the last lines of `final.log` and check whether its modification time is still advancing
  - look for lock files and partial outputs
- I would not launch anything that could duplicate the search until that is done.

**5. Next action.**
- If the process is alive, wait and do nothing else.
- If the log's last line is `FINAL-SEARCH DONE` and `rounds/final/search.json` verifies, apply the amendment 1 patch (`amend1_final.py`) and type-check. If the scratchpad is gone, re-derive the patch from §4 of the checkpoint. Then run `npm run diverse-d1 -- amend --stage freeze-selection …`, then `npm run diverse-d1 -- select --window final`.
- If the process is gone with no `DONE` line, re-run the identical `search --window final` command. Completed arms are kept and the incomplete arm is moved aside and replayed deterministically. Label the rerun in the checkpoint.
- If the log says `FAILED`, stop and report. The checkpoint does not say what to do in that case.

**6. Never rerun.**
- Every complete stage: controls, fold-a, fold-b, determinism and the procedure gate.
- The commitment, the freeze and the change log (refused after the freeze).
- The October 25 study (`research/d1-robust-pool-discovery/`) and all earlier studies.
- Never open 2024–2026 data for this study. No commits, pushes, broker actions or downloads.

**7. Sealed versus active.**
- **Sealed on disk:** the commitment, freeze, controls, fold-a and fold-b records, determinism, and the procedure gate.
- **Active and not yet sealed:** the final search output. The J-u and T-u arm records are described as completed, but I could not verify them.
- **Only in the scratchpad or in memory:** the `amend1_final.py` patch, whose scratchpad path may be gone, and the planned amendment text.
- **Not started:** everything from amendment 1 onward.
- **Disclosures to carry into the final report:** the brief was truncated, its remainder arrived after the freeze, and no review was held between sealing the fold PICKS and opening validation.

**8. Gaps and ambiguities.**
- The snapshot timestamp (07:38Z) conflicts with the "~08:45Z" in the text. The brief file was also replaced at ~08:35Z, after the snapshot timestamp. The checkpoint's own update time is unclear.
- The hashes are truncated, so I could only match them against file contents, not recompute them. I did not run any commands.
- There is no rule for a `FAILED` log or a stale lock.
- The `amend` command text is elided as "…", so the change and reason strings must be re-derived.
- The scratchpad patch path may not exist.
- The adoption of the full brief's §14 report names without a protocol amendment is not formalised.

**INSUFFICIENT.** I can name the stage, the protocol and the guards, and I have a safe, unambiguous rule for the process check. The `FAILED`-log case and the unresolved timestamp are small gaps. The bigger problem is that the exact amendment strings and the possibly missing patch script cannot be recovered from the checkpoint alone. The next step after the search finishes therefore can't be executed from the checkpoint without re-deriving them.
