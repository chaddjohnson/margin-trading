# Work recovery checkpoint — Strategy Entry Explorer UI (merge to main, feature branch, demo UI)

## Top screen (read this first)

- **Updated:** 2026-11-03T16:18Z (UTC, from the clock). **Status: COMPLETE** (implementation, docs, verification,
  commits, push).
- **Push:** `git push -u origin feature/strategy-entry-explorer-ui` (new branch, no force) at 16:17Z. `git ls-remote`
  showed `origin/feature/strategy-entry-explorer-ui` at `2d44ad459e3661f3bb2c74d36717cf04a82aa917` (equal to local)
  and `origin/main` at `d8a47d6…` at 2026-11-03T16:17:37Z. This record follows as a separate commit, pushed the same
  way. No pull request; the branch is not merged into `main`.
- **Task brief:** "Claude Code task: Merge current work safely, create a new branch, and build the Strategy Entry
  Explorer UI" (2026-11-03), verbatim in
  `docs/research/growth-entry-discovery/brief/2026-11-03-strategy-entry-explorer-ui-brief.md` (sha256 `be72768b…94d0af`).
  The user's chat message authorised the whole assignment, "including … the requested Git commit and push".
- **Stages:** P0 Git integration — complete. P1 research-direction docs — complete. P2 UI — complete. P3 verification
  — complete. P4 commits and push — complete.
- **Follow-up (2026-11-03T16:3xZ, at the user's request):** the user's `config/market-events` changes (the 2026-10-30
  Vanguard re-check: byte-identical raw files, provenance-only ledger/manifest edits) were committed on `main` as
  `aa5754d` and pushed; `main` was then merged into this branch (`ad23985`, pushed, no force) so the checkout keeps the
  same bytes on disk. The working tree is clean. The "never commit" guard below applied to the state before this.
- **Running processes:** none (the manual dev servers on ports 5180 and 5182 were stopped).
- **Follow-up gate:** the **user's review of the UI**. Do not implement entry mechanisms, connect real data, optimise,
  or merge `feature/strategy-entry-explorer-ui` into `main` without a new instruction.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `feature/strategy-entry-explorer-ui` (from `main` at
  `d8a47d6`). No extra worktree.
- Node v24.21.0, npm 11.19.0. The app has its own dependencies in `apps/strategy-entry-explorer/node_modules`
  (git-ignored; `npm ci`).
- **User's own uncommitted files (never commit, never touch):** `config/market-events/distributions.csv` (M),
  `config/market-events/distributions.manifest.json` (M) and `config/market-events/raw/vanguard-20261030T184421Z/` (??).
  Their sha256 values were identical before and after the branch switch:
  - `30feaa99…41a6`
  - `acb68cca…845d`
  - VGT.json `b8e923d8…5125`
  - VOOG.json `3eb36e6e…a36a`
  - retrieval.json `ceb0cf5e…014f`

## Phase 0 outcome — Git integration (complete; do not redo)

- **Source:** `research/study9-phase-b-seven-pool` at `9c225c560f8c2f3bbdb336fc01737be124f20fb4`, equal to its origin.
  It had 92 commits not in `main`; every other local branch head is its ancestor.
- **`main` before:** `3ef43015f812c651c9f4608bbe4f01af4a0b81af`, equal to `origin/main`. Its only extra commit (the
  `CLAUDE.md` and guide policy) was already on the branch byte for byte.
- **Merge commit:** `d8a47d61e0205956e9cbe3a9c3439ff46b923c69` on `main`, with parents `3ef4301` and `9c225c5`. Its
  tree `050d1c77…` equals the source branch's tree, so there were no conflicts.
  - It was written with `git merge-tree` / `commit-tree` / `update-ref`, without checking out `main`. The user's
    modified `distributions.*` files are tracked only on the branch side, so a checkout would have had to delete them.
  - `9c225c5` and every local branch head are reachable from `main`.
- **Push:** `git push origin main` was a fast-forward (`3ef4301..d8a47d6`, no force). `ls-remote` showed `origin/main`
  at `d8a47d6` at 15:43:52Z.
- **Pre-merge baseline**, on the same tree as the merge:
  - `npm test`: 944 tests / 933 pass / 7 fail / 4 skipped. The 7 failures are pre-existing: six from the missing
    `src/app/allin-original.ts`, plus the Study 7 runner parity test.
  - `tsc --noEmit`: clean.
  - `eslint`: 1 pre-existing error (`src/study7-stability-first-d1/search.ts:310` prefer-const) and 305 warnings.

## Deliverables (feature branch)

| Commit | Content |
| --- | --- |
| `2a5877a` | `docs/research/growth-entry-discovery/PLAN.md` (research direction), the brief and the mockup |
| `33a8808` | `apps/strategy-entry-explorer/` (app, fixture, tests), `docs/research/growth-entry-discovery/ENTRY_EXPLORER.md` (schema v1 and behaviour), root `eslint.config.js` (ignores `apps/**`), root `README.md` (pointer) |
| `2d44ad4` | this checkpoint (first version) |
| next | this push record |

Hashes (sha256):

| File | sha256 |
| --- | --- |
| `apps/strategy-entry-explorer/public/data/demo-dataset.v1.json` | `0d006906fc333829c4cd4036e840b84e6fae15599d7265e8969339db0c7274fe` |
| `docs/research/growth-entry-discovery/PLAN.md` | `8a6bc11bfddff13b61acebc250e4034148a12c13bc6ded67617cb3f3e796e4f9` |
| `docs/research/growth-entry-discovery/ENTRY_EXPLORER.md` | `4cea8fefa1f669b9fc6f30c14f62133b3873b006a3c12e6bd4c9a26a2c46748d` |
| `apps/strategy-entry-explorer/README.md` | `2b1eb377dcb9ae16b281cfbd31d1107ec0cd38e31202d879af6823007c21a8e0` |
| `apps/strategy-entry-explorer/package-lock.json` | `4266e8c0b4982ba838d0900918ca4883faea82122da33be5141e1caabba88521` |
| mockup PNG | `5a9f8a8f7e91cd98461bc78a6a08a3d66ebec6cae621b9aa791ad5dedb7e25e0` |

**Launch:** `npm --prefix apps/strategy-entry-explorer start` (from the repository root). The first run installs the
app's dependencies with `npm ci`; it serves on `http://127.0.0.1:5173` and opens the browser.

## Verification (2026-11-03, all from the clock)

- `npm --prefix apps/strategy-entry-explorer run check` (≈16:13Z), every step passing:
  - `tsc --noEmit` and ESLint: clean;
  - Vitest: **41/41**;
  - `vite build`: OK (JS 386 kB, gzip 120 kB);
  - Playwright: **9/9** in the system Chrome.
- **Negative control:** forcing `resetZoom()` on every annotation update made the "zoomed 2020–2022 window survives
  switching variations" test fail. The code was restored and re-checked.
- **Clean-copy start:** a copy without `node_modules`, started with `BROWSER=none npm start -- --port 5182`, ran
  `npm ci` (180 packages), served the page, and rendered 175 markers in Chrome with no console errors.
- **Fixture:** `npm run generate:fixture -- --check` and the Vitest reproducibility test both confirm a byte-identical
  regeneration.
- **Root suite after the changes** (16:14:23Z → 16:16:18Z): `npm test` 944 / 933 pass / **the same 7 pre-existing
  failures** / 4 skipped. Root `tsc --noEmit` is clean; root `eslint` is unchanged at 306 problems (the same 1 error),
  and no `apps/` file is linted.

## Decisions and disclosures (for the handoff)

- **Uncommitted user files** were handled by the memory-recorded workflow (carry them along, never commit them), not
  by stashing. The merge needed no checkout.
- **Untouched pinned files.** The root `package.json` (pinned by Study 9 Phase A and Study 8), `tsconfig.json` (Study 3
  Stage 1c) and `src/` (several studies' code manifests) are unchanged. That is why the launch command uses
  `npm --prefix` and there is no root npm script.
- **Charting library.** Dygraphs, as briefed; no substitute was needed.
- **Overlap policy.** Dygraphs annotations are keyed by (series, x), so the app draws one composite marker per bar.
  Markers of neighbouring sessions overlap when zoomed out; the tooltip and repeated clicks list every marker under the
  pointer.
- **Demo seed.** 20261133, chosen by screening seeds 20261100–20261499 on price-path shape only (disclosed in the code
  and docs).
- **Prior related studies** found no edge for rebound-style or momentum entries (`research/trailing-buy-entry`,
  `research/study3-vgt-momentum*`). This is recorded in PLAN §2 for the future protocol.
- **Root lint.** `npm run app`'s `preapp` lint already fails on the pre-existing ESLint error; this task did not
  change that.

## Guards

- **Do not rerun or redo:** the merge (`d8a47d6` is on `origin/main`); the fixture (regenerate only with an intentional
  generator change, then re-hash).
- **Do not:**
  - commit the user's `config/market-events/*` files;
  - force-push;
  - merge the feature branch into `main`;
  - implement strategies, read market data into the explorer, or optimise anything.
- **Next authorised step:** none. Wait for the user's UI review.
