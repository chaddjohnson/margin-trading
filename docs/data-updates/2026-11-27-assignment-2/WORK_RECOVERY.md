# Work recovery checkpoint — Assignment 2 of 2: final integration, GPU re-acceptance, Strategy Lab service

## Top screen

- **Updated:** 2026-11-27T22:59Z (UTC, clock). **Status: INCOMPLETE.**
  - **Stages:** A and B done; C partly done (legacy failures fixed); D set up, its campaign not yet started.
- **Task:** the user's brief, received 2026-11-27 ~22:23Z, saved verbatim as `BRIEF.md` (409 lines, sha256
  `a674ced6cab508f80791f6d1c900d66c9b7e2623a84c4c93321c9232f3669e30`, read in full to §12).
- **Where the work is:**
  - **Integration branch:** `integration/research-date-boundaries-a2` (from `f2c414ef`).
  - **Worktree:** `/home/chad/.local/share/margin-trading-worktrees/a2-integration`, outside the repository; temporary,
    removed at the end.
  - **This task directory:** inside that worktree, on that branch.
  - **The main checkout:** stays on `feature/research-date-boundaries` `f2c414ef`, clean and untouched, because the user's
    live Strategy Lab server runs from it (brief §4).
- **Running (not mine, do not kill outside Stage F):**
  - **Process:** the user's own Strategy Lab, `npm --prefix apps/strategy-lab run start:vpn` in tmux session
    `strategy-lab` (started 2026-11-27T22:21:54Z after the user's `fuser -k 4317/tcp`).
  - **PIDs:** 3009767 (sh), 3009793 (sh), 3009794 (node).
  - **Binding and state:** port 4317 on 127.0.0.1, 127.0.1.1 and 100.68.60.114; live state `state/strategy-lab`.
- **My Assignment 1 transient unit `strategy-lab`:**
  - **Since 22:21:36Z:** the user's `fuser -k` SIGKILLed its process. It restarts every 10 s and fails (EADDRINUSE),
    which is harmless to the user's server.
  - **22:30Z:** stopping it was refused by the auto-mode classifier.
  - **Resolution:** at Stage F, where the permanent unit replaces it.
- **Next step:** commit the Phase 9 set-up, then `python3 -I tools/gpu-phase9/protocol-freeze.py`, commit, then launch
  the campaign:
  `tools/gpu-phase9/launch-slice.sh p9chain-final "$PWD/research/gpu-phase9/results/logs/final-chain.txt" -- /usr/bin/env START=1 /bin/bash research/gpu-phase9/chains/final.sh`.
  Run it from the worktree root.

## Decisions

| # | Decision | Basis |
|---|---|---|
| D1 | Staged trailing stops: **EXCLUDE** | Gate 2: no independent implementation review or acceptance on the branch; its Phase 8 GPU record is self-generated for its own tree; its own register F2 says a merge "would need a reviewed merge". Gate 5: Growth 1.5.0 edits `riseTrading.ts` in place; the sealed Priority 5A byte pin then fails, giving 2 new failures |
| D2 | TSLA fix: integrated (merge `efd7454b`) | `git merge-tree` clean. `identityJoin.ts` and its test are byte-identical on both sides (blobs `85cb8e09`, `cd841239`): the lineage cherry-picked `aca31b5f` as `a33c6ff1`. Assignment 1's "likely conflict" was wrong. Combined: 55/55 TSLA and join tests pass; the replay is byte-identical (`6b923ff2…`); `research/` unchanged |
| D3 | Six legacy failures: fixed (`00e1425c`) | The user renamed `src/app/allin-original.ts` → `allIn-original.ts` on 2026-10-17 (`86d2b2d9`, `fb499e51`, R100); the callers now read the renamed file; the sha256 pin `42f2b7e7…` holds; 11/11 tests of the three files pass. The entrypoint registry carries the two legacy digests |
| D4 | Acceptance namespace `research/gpu-phase9/` | `gpu-phase8` is the staged-stop branch's acceptance |
| D5 | Campaign in the worktree (AD10) | Brief §4 forbids switching the running service's checkout. The worktree baseline equals the main checkout's: 1,909 / 1,896 / 9 / 4, and the seal check is identical (1,464 sealed; 1,410 protected, 43 untracked, 11 absent) |
| D6 | Finding: the B4/B5 prospective shadow freeze also names the four research-date-boundaries loader files as changed | It already failed before for data, the `pools` script and the market events. No snapshot was ever imported (zero observations). It fails closed and remains reproducible at its commit. To be disclosed in the report |

## Commits on the integration branch

- `efd7454b`: merge of `fix/tsla-outcome-identity-join` `b0a18659`.
- `00e1425c`: the legacy renamed-path fix plus the entrypoint registry's two legacy digests.

## Evidence so far

- `evidence/npm-test-baseline-f2c414ef-worktree.log`: 1,909 tests, 1,895 pass, 9 fail, 5 skipped. The extra skip was
  Phase 7's export metadata, which was not yet copied; after copying, that file passes 4/4. The environment equals the
  main checkout's 1,909 / 1,896 / 9 / 4.
- `scripts/worktree-env.sh`: the worktree's git-ignored inputs.

## Environment

- Node 24.21.0; every evaluating process `node --no-maglev`. GPU RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, idle.
- Disk `/` ~367 GB free; `/tmp` is a tmpfs (not used for the worktree).
- Linger: yes.

## Baseline hashes (2026-11-27T22:40Z)

| Item | sha256 |
|---|---|
| `data/VGT/data.csv` | 53,976,698 B, `dfde0f77a7782579…` (last session 2026-11-25) |
| `data/GDX/data.csv` | 80,741,665 B, `aa23522d9d2408dc…` |
| `config/research/date-ranges.json` | `818be325520d29cbbc4f16a50b569523751edc076328b6dffc8245bfb57d1f93` |
| `config/market-data/vintages.json` | `951d4cafd7fbdcd516ae5414af087d5cb34d5130c31a25e5ab7a987e352bfb3b` |
| `config/gpu-backend/acceptance.json` | `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7; STALE on this lineage) |
| `docs/research/OPTIMIZATION_STANDARD.md` | `68487de7b67cd9ccbf70478f51d12f5ef19287d6fa34a737c69f4b49b277eeaf` (5.0.0) |

## Guards

- Do not check out another branch in the main checkout while the user's server runs there.
- Do not kill the user's tmux server except in the controlled Stage F transition.
- No official acceptance before every acceptance-covered change is committed on the candidate.
- Never edit sealed records; never edit R1; never truncate canonical data.

## Disclosures

- **22:30Z:** an attempt to stop my own crash-looping transient unit was refused by the auto-mode classifier. It had no
  effect.
- **The legacy fix commit was amended once before any push.** It was local only. The amend added the regenerated
  entrypoint registry, so no commit fails the entrypoint audit.
