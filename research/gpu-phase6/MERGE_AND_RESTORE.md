# Merge into `main` and restore of `research/gpu-phase2` (GPU Phase 6)

## 1. Before

- `main` = `origin/main` = `research/gpu-phase2` = `830a1221029c0569be647e0af3d335c6c9b3df5a` (verified with
  `git ls-remote` at 11:12Z; no concurrent change).
- Accepted record in force: Phase 5's `49e95d7a…` (verified VERIFIED at the start, 09:4xZ).
- Branch `research/gpu-phase6` created from `830a1221`; tip `5a49b94b63328d0ba9fa91508049fa8147cd0137`, pushed
  (`git ls-remote origin research/gpu-phase6` = `5a49b94b…`).

## 2. Diff review (`results/integration/merge-audit.txt`)

`main` is an ancestor of the branch. Changed outside the study directory: 61 files (all listed in the audit), none
deleted. No file of the evaluation manifest (CPU closure, CUDA, host path), of a frozen legacy runner directory, of the
B4/B5 forward freeze's bound set (`src/app.ts`, `src/app/pools.ts`, `src/pools/`, `package-lock.json`, the imports map) or
of a completed study changed. Both `package.json` files differ only by the inserted `--no-maglev`. No credential.

## 3. Merge

`git switch main && git merge --no-ff research/gpu-phase6` → merge commit
**`dbb5aabaff4906bf3716a9bf64fe2ec297620a05`** (parents `830a1221`, `5a49b94b`); no conflict, nothing reset, rewritten or
force-pushed. The merged tree equals the accepted branch tree (`81da3fe4be917c46ce1ce542edaf9ac170e82773`).

## 4. Post-merge verification on `main` (`chains/post-merge.sh`, `results/integration/`)

| Check | Result |
|---|---|
| merge-gate, enforcement, layout and jobs tests | 27 / 27 |
| independent verifier `--rebuild --device --expect-record-sha256 3610caaf…` | VERIFIED (reproducible rebuild, device, out-of-band pin) |
| live official gate (with a job) | GATE OPEN |
| integrity (research files, 22 preflights, seals, B4/B5 freeze, digests) | 5 / 5 |
| full `npm test` with the new record in force | see `results/integration/post-merge.txt` and `npm-test-failures.txt` (the 7 known failures only) |

## 5. Push and restore

`main` is pushed without force and verified with `git ls-remote`; `research/gpu-phase2` is fast-forwarded to `main`,
pushed, checked out with a clean working tree, and the backend is verified from it (the record's static check, the
verifier and the live gate). The exact revisions are in the final checkpoint (`RESEARCH_RECOVERY.md`) and in
`~/.local/share/margin-trading-gpu/acceptance-pins/pins.jsonl`.

## 6. Going back

The Phase 5 implementation stays reachable: `research/gpu-phase5` (unchanged) and `830a1221`. Its record is kept in
`results/superseded/acceptance-gpu-phase5.json` and out of the repository. Reverting the merge
(`git revert -m 1 dbb5aaba`) restores the Phase 5 tree and record; nothing was deleted.
