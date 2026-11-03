# Recovery-policy integration into `main` (brief §0A)

**Outcome: done.** The permanent Claude Code context-recovery policy — and nothing else — is on `main` at
`3ef43015f812c651c9f4608bbe4f01af4a0b81af`, pushed to `origin` and verified with `git ls-remote`. No research file,
strategy code, config or data reached `main`.

## What was integrated

| | Before | After |
|---|---|---|
| `origin/main` | `d7b6108741c798c414ebe1bc46c5c8c6d75dbf44` | `3ef43015f812c651c9f4608bbe4f01af4a0b81af` (parent `d7b6108`) |
| `CLAUDE.md` on `main` | absent | blob `f45cab65eb8c2c1bcefb9c41f9cbdb0e3150fc84`, sha256 `054d7525b8e151a90a5bd6a6cc69fe38d2d0f4b1dad20d26920834e6c2bea3a5` (10 lines) |
| `docs/claude/context-recovery.md` on `main` | absent (`main` had no `docs/`) | blob `c0c4d05eaa23ee9d8793ba96bb60752da2b8f51b`, sha256 `744c934d931fe8ceebe35024aad4ede9aa9f8ce0d1764ce826a4d8b2eef241a8` (180 lines) |

`git diff --stat d7b6108 3ef4301`: exactly these two files, 190 insertions, nothing else.

## How

1. **Inspected the policy history.** `CLAUDE.md` and `docs/claude/context-recovery.md` were added on the research
   branches by `57b5375` ("Added a root CLAUDE.md that imports a standing context-recovery procedure …"; exactly those two
   files) and the guide was edited by Stage 1's `3237f69` (`git show --name-status`: `M docs/claude/context-recovery.md`
   only; 26 insertions, 8 deletions: unfinished-checkpoint search, automatic compaction, fail-closed ambiguity,
   COMPLETE/INCOMPLETE closeout, how to confirm the import loads). Neither commit touches research or other files.
   Neither was on `main` (`git merge-base --is-ancestor` false; `git show origin/main:CLAUDE.md` absent).
2. **Isolated worktree.** `git worktree add <scratch>/main-policy-wt main` on the verified `main` (= `origin/main`
   `d7b6108`, fetched 2026-10-28T22:32Z); the user's checkout was not switched or touched.
3. **Policy files only.** `git checkout db6a3ec -- CLAUDE.md docs/claude/context-recovery.md` (Stage 1's head, which
   holds `57b5375` + `3237f69`); the staged blobs were checked equal to `db6a3ec`'s (`git rev-parse :path` =
   `db6a3ec:path`). Both files are new on `main`, so there was no conflict and nothing to merge.
4. **Checks.** The import line `@docs/claude/context-recovery.md` is in `CLAUDE.md` (line 5, outside backticks) and its
   target exists. The repository's formatter covers only `src/**/*.ts` (`package.json` `format`); Prettier reports
   style differences on the guide, as it does on the existing `README.md` — not a repository check. No hook was added.
5. **Commit and push.** One commit on `main` (`3ef4301`, message "Added the permanent Claude Code context-recovery
   policy (CLAUDE.md and its imported guide) to main"), `git push origin main` (fast-forward `d7b6108..3ef4301`). `main`
   has no branch protection and no rulesets (`gh api …/branches/main/protection` → 404 "Branch not protected";
   `…/rulesets` → `[]`), so no protected-branch procedure was bypassed. `git ls-remote origin refs/heads/main` →
   `3ef43015f812c651c9f4608bbe4f01af4a0b81af`. The scratch worktree was then removed (`git worktree remove`).

## Was fresh-session autoload actually tested? Yes

Two fresh headless Claude Code sessions (`claude -p --tools "" --no-session-persistence --model sonnet`, Claude Code
2.1.283), asked to answer only from their loaded instructions — quote the heading of §2.8 and the first bullet of §2.5
of the imported guide, or say NOT LOADED:

- **In the clean `main` worktree:** quoted "2.8 Closing a task" and the revised §2.5 bullet ("Rely on automatic
  compaction: do not pause work or ask the user to compact manually …") verbatim — text that exists only in the imported
  guide, and in its `3237f69` revision. Transcript: `integration/fresh_session_main.txt`.
- **Control, in a scratch directory without `CLAUDE.md`:** "NOT LOADED" for all three items
  (`integration/fresh_session_control.txt`).

The `/memory` and `/context` diagnostics are interactive commands and were not run; the headless test above is the
evidence.

## Notes

- The guide's §4 ("Notes for this repository") mentions `docs/canonical-dataset-migration.md`, the research studies'
  freeze practice and `data/<SYMBOL>/` layout, which exist on the research branches but not on `main`. The file was
  integrated byte-for-byte as the user's approved policy text rather than edited for `main`; the reference is
  informative, not an instruction that fails.
- The Stage 1b research branch was then created from Stage 1's head `db6a3ec` (not from `main`), so it carries the same
  two policy blobs; `main` and the research branch hold identical policy files.
