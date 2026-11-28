# Integration and branch disposition

## 1. Starting and final state

| | Start (2026-11-27T22:40Z) | Final |
|---|---|---|
| `main` | `3606f4b3` (= origin; GPU Phase 6 record `3610caaf…`) | `main` on origin, verified with `git ls-remote` (the final commit is in `WORK_RECOVERY.md` § Delivery). Its accepted tree is the merge `0a368680` (tree `491d8fa8…` = the accepted candidate's); later commits add only post-merge evidence and documents |
| `feature/research-date-boundaries` | `f2c414ef` (= origin) | unchanged (an ancestor of `main`) |
| `integration/research-date-boundaries-a2` (new) | — | `3ca2b98d` (= origin) |
| `fix/tsla-outcome-identity-join` | `b0a18659` | unchanged (an ancestor of `main`) |
| `research/vg-l0-staged-trailing-stop` | `4a89d02a` | unchanged, **not integrated** |
| Main checkout | on `feature/research-date-boundaries`, clean | on `main`, clean apart from post-integration evidence (committed); the GPU binary gb9 and the study's git-ignored state in place |
| Worktrees | the main checkout only | the main checkout, plus the locked Strategy Lab release `~/.local/share/strategy-lab/releases/15a7b64638df` (deliberate, documented). The integration worktree was removed |

## 2. What was integrated (merge `0a368680`, first parent `3606f4b3`)

The merge brings 495 commits that were not on `main`:

1. **`feature/research-date-boundaries` `f2c414ef` and its required ancestry.** These are all ancestors of the feature
   branch, so none can be left out without rewriting history. They are now on `main` for the first time:

| Branch (not deleted) | Head | What it carries |
|---|---|---|
| `cleanup/storage-2026-11-21` | `d89b9dec` | the storage audit and cleanup records (docs) |
| `research/gpu-phase7-risk-envelope-readiness` | `fc027eed` | GPU Phase 7: the risk-envelope delivery through GpuPool/EvalLab, `src/risk-envelope/`, its record (now superseded) |
| `research/vg-l0-risk-envelope-pilot` | `7f69d0d2` | the completed pilot NL0-REP 1.0.0 |
| `research/vg-l0-risk-envelope-sensitivity` | `0c2f9dd5` | Stage A (complete) |
| `research/vg-l0-risk-envelope-stage-b` | `1c1f9e72` | Stage B (complete) |
| `research/vg-l0-risk-envelope-stage-b-diagnostics` | `48090c55` | Stage B diagnostics (complete; its R6 "keep unmerged until review" is covered by the user's Assignment 2 authorization of the integration) |
| `research/vg-l0-trailing-stop-audit` | `5d587bb2` | Priority 3 audit of trailing stops (complete) |
| `research/vg-l0-n-original-successor` | `dc023c3b` | P5-NS (complete) |
| `research/tsla-d1-growth` | `421e4c87` | the TSLA D1+Growth study (complete) |
| `research/gdx-d1-growth` | `03f3500c` | the GDX study (complete) |
| `feature/research-date-boundaries` | `f2c414ef` | R1 date ranges, byte-prefix doors and vintages, standards 4.0.0 and 5.0.0, manual post-validation evaluation (CLI and Strategy Lab), the reproduction tool, `npm run app` |

2. **The TSLA identity fix**, merge `efd7454b` of `b0a18659` (`TSLA_FIX_DISPOSITION.md`).
3. **The legacy-test fix** `00e1425c` (`LEGACY_FAILURES.md`).
4. **GPU Phase 9:** `7156a719`, `25fc8e37`, `a8ba54ea`, `97ae35cd` (A1), `b2d9f634` (A2), `a63baf40` (evidence, the
   source revision), `4f82149c` (the ACCEPTED record), `dc2695f0` (post-record) (`GPU_ACCEPTANCE.md`).
5. **Documents and the service template:**
   - `94f0d850` CLAUDE.md, the GPU docs, the roadmap;
   - `08fa5280` the restart backoff;
   - `3ca2b98d` the Assignment 2 reports.

**Conflicts:** none. The TSLA merge was clean, because the shared commit's files are byte-identical on both sides. The
final merge's tree equals the candidate's, because `main` was an ancestor.

## 3. Convention and verification

- **Convention:** the repository's own: `Merge <branch>: …` with `--no-ff` semantics, as for GPU Phases 3, 5 and 6, then
  post-merge verification commits on `main`.
- **How the merge commit was built:** `git commit-tree <candidate tree> -p main -p <candidate>`, then `git update-ref`.
  No checkout was switched, so no sealed file lost its mode. The push was a plain fast-forward of `origin/main`, with no
  force.
- **Verification on `main` itself (`15a7b646`, `research/gpu-phase9/results/integration/`):**
  - `verify-acceptance.sh --rebuild --device` VERIFIED;
  - the live official gate OPEN on D24;
  - portfolio parity ALL VERIFIED on the extended files;
  - N/original All equal to the reference;
  - the record-in-force and manual-eval tests 55/55.
- **The same checks in the main checkout, after it switched to `main`:**
  - VERIFIED, with the binary;
  - the gate OPEN;
  - 32/32 preflights.

## 4. Active jobs, worktrees and non-interference

- **Jobs:** there were none before, and none was interrupted. The GPU was idle at the start, and nothing else used it
  during the campaign.
- **The user's live Strategy Lab server:** it ran untouched from the main checkout, in tmux session `strategy-lab`,
  through Stages A–E. Its working tree was never switched, until the controlled Stage F transition
  (`STRATEGY_LAB_SERVICE.md`).
- **The integration worktree:**
  - Location: `~/.local/share/margin-trading-worktrees/a2-integration`, outside the repository.
  - Contents: real copies of the data (removed with it) and links to the caches.
  - Lifetime: removed at the end. Its git-ignored study state (job archives, raw outputs, logs, test binaries) was moved
    into the main checkout's git-ignored `research/gpu-phase9/` paths, as in earlier phases. The 10 GB scratch restores
    were deleted.
- **Other branches:** no branch was deleted, rebased or force-pushed.
- **Scratch environments:** the historical reproduction environments were temporary and removed.
