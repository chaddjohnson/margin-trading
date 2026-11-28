# Work recovery checkpoint — Assignment 2 of 2: final integration, GPU re-acceptance, Strategy Lab service

## Top screen

- **Updated:** 2026-11-28T03:45Z (UTC, clock). **Status: COMPLETE** (stages A–F). The push is verified (Delivery).
- **Task:** the user's brief, received 2026-11-27 ~22:23Z, saved verbatim as `BRIEF.md` (409 lines, sha256
  `a674ced6…`). Report: `REPORT.md`.
- **Result:**
  - **The integration:** the core release is merged into `main` (merge `0a368680`).
  - **The acceptance:** GPU Phase 9 is ACCEPTED (record `9ebb33ce8620dead…`, VERIFIED on `main`, gate OPEN).
  - **Exclusion:** staged stops.
  - **Strategy Lab:** a permanent enabled service from release `~/.local/share/strategy-lab/releases/15a7b64638df`.
  - **Tests:** `npm test` 0 failures.
- **Running:**
  - the Strategy Lab service `strategy-lab.service`, intended and permanent: `systemctl --user status strategy-lab`;
  - nothing else. The tmux session `strategy-lab` holds only an idle shell, since its server was stopped at the
    transition.
- **Follow-up gate (the user's):**
  1. Review `REPORT.md`.
  2. Optionally the staged-stop path (`STAGED_STOP_DISPOSITION.md` §follow-up).
  3. Each official optimization study still needs its own authorization.
  4. The risk-envelope findings await the user's review (`RISK_ENVELOPE_READINESS.md`).
- **Not authorised and not done:**
  - no strategy or phenotype change, no new study, no pilot;
  - no data fetch;
  - no reboot, no force-push, no branch deletion.

## Environment

- **Checkouts:** the main checkout `/home/chad/projects/margin-trading` is on `main`. Release worktree:
  `~/.local/share/strategy-lab/releases/15a7b64638df` (locked, detached at `15a7b646`).
- **Removed:** the integration worktree `~/.local/share/margin-trading-worktrees/a2-integration`. Its Phase 9 git-ignored
  state (jobs, dataset exports, raw outputs, logs, test binaries) was moved into the main checkout's ignored paths; its
  10 GB archive restores were deleted.
- **Runtime:** Node 24.21.0; every evaluating process `--no-maglev`. GPU RTX 5090 `GPU-ae5f222c…`.
- **Service configuration:** `~/.config/systemd/user/strategy-lab.service`; `~/.config/strategy-lab/env`
  (`STRATEGY_LAB_STATE_DIR` = the main checkout's live state). Linger yes.
- **Backup:** `~/backups/strategy-lab/state-20261128T033214Z-before-permanent-service` (1.2 GB, taken while stopped).
- **No credentials were used.** The Strategy Lab token was read from its file for the checks and never printed.

## Stages

| Stage | Status | Record |
|---|---|---|
| A. Inventory, baseline, rollback plan | complete | the baseline `npm test` in the worktree = the main checkout's (`evidence/npm-test-baseline-f2c414ef-worktree.log`) |
| B. Staged-stop eligibility; TSLA fix; reconciliation | complete | `STAGED_STOP_DISPOSITION.md` (EXCLUDE); `TSLA_FIX_DISPOSITION.md` (merge `efd7454b`); `RISK_ENVELOPE_READINESS.md` |
| C. Legacy failures; non-regression; integrity | complete | `00e1425c`; `LEGACY_FAILURES.md`; `TESTS_AND_INTEGRITY.md` |
| D. Official GPU re-acceptance | complete, ACCEPTED | `research/gpu-phase9/`; `GPU_ACCEPTANCE.md` |
| E. Integration into `main` | complete | `0a368680` (merge), `15a7b646` (post-merge verification); `INTEGRATION.md` |
| F. Permanent Strategy Lab service | complete | `STRATEGY_LAB_SERVICE.md`; `docs/strategy-lab/OPERATIONS.md` §Permanent service |

## Key identities

| Item | Value |
|---|---|
| Acceptance record | `config/gpu-backend/acceptance.json` `9ebb33ce8620dead93ebab349a8263ad3ca8bbc676861771724a745ef2361bf4` (study research/gpu-phase9, source revision `a63baf40`, record commit `4f82149c`) |
| Binary | `research/gpu-phase9/build/gb9` `36dcc25109a9ffada8951ba02d7745fe242e8bf781d268b68f4b57ddf7ab36aa` (git-ignored; in the main checkout) |
| Out-of-band pin | `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase9-9ebb33ce.json` (0444) + `pins.jsonl` |
| Protocol freeze | `research/gpu-phase9/results/protocol-freeze.json` `da4c9a40…`; amendments A1, A2 |
| Data | VGT `dfde0f77…` (53,976,698 B), GDX `aa23522d…` (80,741,665 B), unchanged; R1 prefixes `2ee06310…` / `77dba9b2…` |
| R1 / vintages / standard | `818be325…` / `951d4caf…` / 5.0.0 `68487de7…`, unchanged |

## Guards

- Do not rerun the GPU Phase 9 campaign or its generator.
- Never write into the record's evidence paths. Later checks go to new paths.
- Never run tests in the release checkout: its `data/<SYM>` are links to the canonical files.
- Never delete or reseed `state/strategy-lab/`.

## Disclosures

- **22:30Z:** stopping my own crash-looping transient unit was refused by the permission classifier. It was stopped at
  the Stage F transition (03:31Z), after 1,804 failed restarts, all harmless to the user's server.
- **The legacy fix commit was amended once before any push.** It was local only. The amend added the regenerated
  entrypoint registry, so no commit fails the entrypoint audit.
- **The A1 amendment's time was corrected before any push.** The commit was amended from 02:12Z to the clock's 02:08Z.
- **Campaign amendments A1 (E4) and A2 (E9)** are environment or fixture causes. The failed attempts' records are in
  `research/gpu-phase9/results/superseded/`.
- **Development checks, not evidence:**
  - an `accept.ts --dry-run`;
  - an integrity dry run to scratch;
  - two Vitest files with real `node_modules` (33/33);
  - the dry-run release at `a8ba54ea` (built, smoke-tested on 4392, removed).
- **The user's tmux server was stopped with SIGINT** at the controlled Stage F switch-over (03:32:04Z).
- **Finding:** the B4/B5 prospective freeze's code-closure reason (`TESTS_AND_INTEGRITY.md` §3).

## Delivery

- **Commits:** `main` on origin is a fast-forward from `3606f4b3`. It carries the integration branch's commits, the merge
  `0a368680`, then `15a7b646`, `91a12cd9` and the final reports commit, which adds this file.
- **Verification:**
  - the push of each commit, with `git ls-remote origin main`;
  - the integration branch `3ca2b98d` on origin;
  - `verify-acceptance.sh` VERIFIED on the final commit.
- **The last commit:** its hash is reported in the final response (a file cannot quote its own commit).
- **Nothing else:** no other branch changed, no force-push, no deployment outside Apollo.
