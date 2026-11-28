# Assignment 2 of 2: final integration, GPU re-acceptance and Strategy Lab service (report)

**Outcome.**
- **The core release is on `main`:** the research-date-boundaries feature, the TSLA identity fix and the legacy-test
  fix, under a fresh official GPU acceptance (GPU Phase 9, **ACCEPTED**, record `9ebb33ce8620dead…`). `main` verifies it:
  VERIFIED, with the gate OPEN.
- **Excluded:** staged trailing stops. Their independent-acceptance gate is not satisfied.
- **Strategy Lab:** a permanent, enabled user service serves the accepted build at http://apollo:4317/ with the existing
  state and token.
- **Tests:** no test fails: 1,934 tests, 1,930 pass, 0 fail.
- **What did not happen:**
  - no strategy, phenotype or allocator changed;
  - no sealed record was edited;
  - nothing but the authorized fixed-seed engineering mini-optimization ran;
  - no pilot or study was launched, and no data was fetched;
  - no reboot, no force-push.

| Document | Contents |
|---|---|
| `BRIEF.md` | the brief, verbatim (409 lines, sha256 `a674ced6…`) |
| `INTEGRATION.md` | A. starting and final commits, ancestry, integrated ranges, conflicts, non-interference |
| `STAGED_STOP_DISPOSITION.md` | A. EXCLUDE, the gates and the follow-up |
| `TSLA_FIX_DISPOSITION.md` | A. INTEGRATED, the verification, the provenance of the defective artifacts |
| `LEGACY_FAILURES.md` | B. the six `allin-original.ts` failures: cause and fix |
| `TESTS_AND_INTEGRITY.md` | B. baseline vs final counts, historical integrity, strategy regression, the N/original references |
| `GPU_ACCEPTANCE.md` | C. procedure, identity, gates, the mini-optimization's scope, post-record and post-merge checks, failed attempts |
| `STRATEGY_LAB_SERVICE.md` | D. the permanent service, the transition, verification, management and rollback |
| `RISK_ENVELOPE_READINESS.md` | E. compatibility and actual status (the pilot is complete; nothing launched) |
| `RUN_COMMANDS.md` | F. verified commands |
| `WORK_RECOVERY.md` | the checkpoint (COMPLETE) |
| `scripts/`, `evidence/` | the worktree environment, release, smoke, browser and reproduction scripts; their outputs |

## A. Integration and branch disposition

- **`main`:** `3606f4b3` → the merge **`0a368680`** (its tree is the accepted candidate's), then post-merge evidence and
  documents. All of it is pushed as a fast-forward and verified with `git ls-remote`; the final commit is in
  `WORK_RECOVERY.md` § Delivery.
- **The integrated commits:** 495 new on `main`. They are the feature branch with its whole required lineage, all
  complete studies:
  - GPU Phase 7, the risk-envelope pilot, Stage A, Stage B and its diagnostics;
  - the trailing-stop audit, P5-NS, TSLA and GDX;
  - the storage cleanup records.

  Then the TSLA fix, the legacy fix, GPU Phase 9 and the documents (`INTEGRATION.md`).
- **Staged trailing stops: EXCLUDE.**
  - **Gate 2:** no independent implementation review or acceptance exists. Phase 8's GPU record is self-generated for
    that branch's own tree, and its own register says a merge "would need a reviewed merge".
  - **Gate 5:** Growth 1.5.0 edits `riseTrading.ts` in place, which breaks the sealed Priority 5A byte pin: two new
    failures.
  - **Effect:** the core release is unaffected; the branch is untouched; existing phenotypes are unchanged either way.
- **TSLA fix: INTEGRATED** (merge `efd7454b`).
  - **No conflict:** the "conflict in `identityJoin.ts`" Assignment 1 predicted did not exist. The lineage already held a
    byte-identical cherry-pick of the shared commit.
  - **Verified:** 55/55 tests, a byte-identical report-only replay, and the 163 sealed TSLA records verify.
  - **Provenance:** the defective sealed outcome was already disclosed by the study itself (Disclosure D1); nothing
    sealed was rewritten.
- **The risk-envelope branches:** all ancestors, now integrated as the required lineage. Nothing else is needed from
  them.
- **Active jobs and worktrees:**
  - no job existed or was disturbed;
  - the user's live Strategy Lab ran untouched from the main checkout until the controlled Stage F switch;
  - the integration worktree was outside the repository and has been removed.

## B. Tests and historical integrity

- **`npm test`:** baseline **1,909 / 1,896 / 9 fail / 4 skipped**; final **1,934 / 1,930 / 0 fail / 4 skipped**. The 4
  skips are the baseline's own: data-pinned legacy suites, reproduced at their commits.
- **The six legacy failures: resolved.** The user renamed the file on 2026-10-17 with identical bytes, and the callers
  now read the renamed path. The pins, golden masters and records are unchanged.
- **The three stale-acceptance failures: resolved by the real acceptance**, not suppressed.
- **The other checks:**
  - root `tsc` 0 errors;
  - GPU-directory ESLint 0 errors;
  - repository-wide ESLint 150 pre-existing errors, unchanged (no historical cleanup);
  - `npm run app` works (lint 414 files, 0 errors);
  - Strategy Lab: Vitest 334/334, Playwright 83/83 (one allowed rerun of the known `candles.spec.ts:439` race),
    typecheck and lint ok.
- **Integrity:**
  - nothing under `research/` changed outside the new `research/gpu-phase9/`;
  - seals as at baseline;
  - R1, the vintages and standard 5.0.0 unchanged;
  - the canonical files unchanged;
  - the door and replay fingerprint (N/original and New L0) identical to Assignment 1's;
  - both historical reproductions re-verified: vg-l0-full-joint with 47/47 seals, and Priority 2 with its door pins.
- **The N/original references:** reproduced exactly, both research and All, including lots 44–46. This holds in the CLI
  on the candidate and on `main`, and in Strategy Lab on the deployed service (`TESTS_AND_INTEGRITY.md` §5).
- **Disclosed finding:** the earlier date-boundaries change also adds a fail-closed reason to the never-used B4/B5
  prospective freeze, whose code closure includes the changed loaders. It was not reported before; there is no impact.

## C. Official GPU acceptance (GPU Phase 9)

- **Procedure:** `docs/gpu/PARITY_CHECKLIST.md` §2, a full cycle, campaign `research/gpu-phase9/chains/final.sh`, run
  2026-11-27T23:00Z → 2026-11-28T03:18Z.
- **What was accepted:**
  - the source revision `a63baf40`;
  - binary gb9 `36dcc251…`, reproducible, with kernels byte-identical to gb7;
  - on the RTX 5090 `GPU-ae5f222c…`, with Node 24.21.0 and `--no-maglev`.
- **The gates: 48/48 PASS.**
  - **New:** D1, every real-data door's GPU dataset equals Phase 7's (38/38, FULL `6e977ccd…`).
  - **Parity:** 144,795 subjects with 0 mismatches; finalists 96/96; R1–R3 0 differing; sealed replays identical.
  - **The fixed-seed mini-optimization:** D19, the established schedule, 9/9 comparisons identical.
  - **The rest:** Q1, the sanitizer (0 errors), negative 73/73, tamper 23/23, reliability 2 × 32 min, and the suites and
    integrity.
- **The record:** `config/gpu-backend/acceptance.json` **ACCEPTED**, sha256
  `9ebb33ce8620dead93ebab349a8263ad3ca8bbc676861771724a745ef2361bf4`. Its out-of-band pin is in
  `~/.local/share/margin-trading-gpu/acceptance-pins/`.
- **The independent verifier:** **VERIFIED** with rebuild and device, on the branch, on `main` and in the main checkout.
- **The official gate on final `main`:** OPEN for an authorized official context. It refuses a non-official purpose and a
  Maglev runtime. All 32 study preflights pass.
- **Failed attempts:** two, both preserved and amended, and neither in enforcement code.
  - A1: the tamper fixture still pinned standard 3.0.0.
  - A2: the campaign worktree's symlinked `node_modules` and a missing Study 8 import copy.
- **Limitation:** the binary is git-ignored, as in every phase. It is rebuilt reproducibly, and was placed in the main
  checkout.

## D. Strategy Lab deployment

- **What runs:** `strategy-lab.service`, a systemd user unit, active and **enabled**. It starts at boot through linger,
  which was already on; it was not reboot-tested.
- **The build:** release `~/.local/share/strategy-lab/releases/15a7b64638df`, an immutable, locked checkout of `main`
  `15a7b646`.
- **Preserved:** the state, the token, the port and the bindings (loopback and Tailscale only; the LAN is refused).
- **The restart policy:** backoff from 10 s to 2 min.
- **The transition:**
  1. the Assignment 1 transient unit was stopped; it had been failing since the user's `fuser -k`;
  2. the user's tmux `start:vpn` server was stopped with SIGINT;
  3. the state was backed up to `~/backups/strategy-lab/…`;
  4. the service was enabled. Downtime was about 11 s.
- **Verified on the deployed service:**
  - HTTP on every address: 401 without the token, 200 with it;
  - the API smoke test;
  - **a real headless-Chrome check, 7/7**: the Research, All and Custom (continuous and isolated) windows, the
    post-cutoff positions filter with P-44/45/46, and fill-to-chart on GDX and VGT;
  - a controlled restart with the state kept (28 runs);
  - recovery from a SIGKILL in 10.6 s.
- **Use it:** **http://apollo:4317/#/portfolio/n-original?window=all**, then Positions → Period → *After 2026-10-30*, then
  **Chart** on a fill.
- **Commands and rollback:** `STRATEGY_LAB_SERVICE.md` §5 and `docs/strategy-lab/OPERATIONS.md` §Permanent service.

## E. Risk-envelope pilot readiness

- **The pilot is not pending:** NL0-REP 1.0.0 ran to completion on 2026-11-22 (outcome "worse"), and Stage A, Stage B
  and the diagnostics are complete. Their register says: keep P0, close the envelope investigation.
- **Compatibility:**
  - the pilot's code and the risk-envelope library are byte-identical to what it ran;
  - their official GPU delivery is re-accepted (R1–R3, A3 with risk, A4 risk, Q1);
  - their preflights pass again;
  - no branch integration remains.
- **What a new envelope study would need:** the user's authorization, its own protocol under standard 5.0.0 (with
  `dateRanges` and `dataPins`), and a job configuration. **No pilot and no research optimization was launched.**

## F. Final status

- **Commands:** `RUN_COMMANDS.md`, verified. Among them `manual-eval --window research|all`, the custom November 25
  endpoint `--window custom --from 2016-01-04 --to 2026-11-25`, and the continuous or isolated November windows.
- **Is `main` safe for official GPU work?** **Yes**, as far as the accepted tree allows.
  - The record is ACCEPTED and VERIFIED on `main`, and the gate opens.
  - Every official study's preflight passes.
  - Official optimization still needs the user's authorization of each study.
  - Any change to an acceptance-covered file makes the record STALE again, by design.
- **The documentation-only commits after the record** change no pinned file. `verify-acceptance.sh` reports VERIFIED on
  the final commit (`WORK_RECOVERY.md` § Delivery).

### Deviations and judgement calls

1. **The worktree (PROTOCOL AD10).** The integration and the campaign ran in a temporary worktree outside the repository.
   The brief forbade switching the running service's checkout. The worktree's environment was proven equal to the main
   checkout's.
2. **A release checkout for the service.** The brief requires a non-mutable build of accepted `main`. The established
   installer is used, run from that checkout.
3. **Two campaign amendments, A1 and A2.** Both were caused by tooling or environment, both were preserved and
   disclosed, and only the affected step was rerun.
4. **A permission refusal.** An early attempt (22:30Z) to stop my own crash-looping transient unit was refused by the
   session's permission classifier. The unit was stopped at the Stage F transition.
5. **The user's own server.** It was stopped with SIGINT at the transition: the controlled switch-over the brief
   authorizes. Its tmux session remains.

### Residual items (no action taken; the user's decisions)

- **Staged stops:** an independent review, preserving Growth 1.4.0's path, and a new full acceptance would be needed to
  integrate them (`STAGED_STOP_DISPOSITION.md`).
- **Repository-wide ESLint:** 150 pre-existing errors in completed studies' code.
- **Boot persistence** is configured but was not reboot-tested. **A second-device tailnet check** was not possible here.
- **The B4/B5 shadow protocol** remains unverifiable at HEAD. It was never started.
