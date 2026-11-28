# Work recovery checkpoint — Assignment 2 of 2: final integration, GPU re-acceptance, Strategy Lab service

## Top screen

- **Updated:** 2026-11-28T02:13Z (UTC, clock). **Status: INCOMPLETE — Stage D campaign RUNNING (resumed at step 27).**
  - **Campaign:** GPU Phase 9 `chains/final.sh`, unit `p9chain-final`.
    - **First run:** 23:00:42Z → step 27 FAILED 02:06:43Z (E4 tamper: the fixture pinned standard 3.0.0; amendment A1,
      commit `97ae35cd`).
    - **Resumed:** `START=27` at 02:08:38Z. E4 now 23/23 with the baseline OK; step 28 (A6, 2 × 32 min) is running;
      step 29 (suites) follows.
  - **Steps 1–26 all passed:**
    - B1 gb9 `36dcc251…`;
    - parity 54 runs, 144,795 subjects, 0 mismatches;
    - D1 38/38;
    - A2 finalists;
    - R1–R3, four runs;
    - A3: three sealed replays identical;
    - A4: 9/9 comparisons identical;
    - Q1: 30,749 evaluations;
    - A5 sanitizer;
    - E3 negative 73/73.
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
- **Next step:** wait for the chain. Check it with `tail -5 research/gpu-phase9/results/logs/final-chain.txt`; a
  harness watcher waits for "chain final complete" or "FAILED".
  - **On FAILED:** read the step's log under `results/logs/final/`. A step resumes with
    `tools/gpu-phase9/launch-slice.sh p9chain-final "$PWD/research/gpu-phase9/results/logs/final-chain.txt" -- /usr/bin/env START=<n> /bin/bash research/gpu-phase9/chains/final.sh`.
  - **On complete:**
    1. `node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase9/accept.ts`;
    2. commit;
    3. the post-record checks.
- **While the chain runs:** never write under `src/`, `tools/` or `config/`, because the tamper and final steps refuse a
  dirty tree (Phase 7's D1). Documents under `docs/` are fine.

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

- **Protocol freeze:** `research/gpu-phase9/results/protocol-freeze.json` `da4c9a40…` (23:00:35Z, at `25fc8e37`).
  Commits: `7156a719` set-up, `25fc8e37` E7 six candidates, `a8ba54ea` the freeze.
- **`evidence/manual-eval/{research,all,custom-2016-01-04-2026-11-25,custom-2026-11-02-2026-11-25-continuous}`
  (candidate code):**
  - the reference table reproduced exactly (A $482,700.73 / C $477,002.83 / B −$5,697.90 / DD $20,385.99 and
    $25,794.56 / 44 and 46 lots / interest $72,509.59 and $73,232.88 / costs $4,630.40 and $4,875.26);
  - the lots: 44 +$5,483.48 lifetime, +$11,048.24 after; 45 −$16,225.15; 46 −$520.99;
  - the All summary is deep-equal to the 2026-11-27 committed one (only `execution`, `generated` and `seconds`
    differ);
  - custom 2016-01-04 → 2026-11-25 equals All, period for period.
- **`evidence/npm-run-app.log`:** `npm run app -- allIn-trailingBuy VGT all 2025-01-02 2026-11-03`, exit 0 (lint 414
  files, 0 errors; tsc; the run).
- **`evidence/historical-repro/`:** vg-l0-full-joint `67b4ae71` doors PASS, 47/47 sealed records verify; Priority 2
  `47422d04` doors PASS. Both environments were removed (`worktree-list-after.txt`).
- **Stage F dry run (23:12Z):** `scripts/strategy-lab-release.sh a8ba54ea` built the locked release
  `~/.local/share/strategy-lab/releases/a8ba54ea3b1c` (11 s).
  - **Smoke test:** `scripts/strategy-lab-smoke.mjs` on loopback port 4392 against a scratch copy of the state: six
    candidates; research $482,700.73 parity verified; All $477,002.83 / DD $25,794.56 / 46; trajectory identical;
    charts 200.
  - **Removed afterwards:** the smoke server (SIGINT), the release (`worktree remove`) and the copy. The canonical data
    were verified intact afterwards.

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
