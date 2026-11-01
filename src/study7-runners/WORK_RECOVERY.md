# Work recovery checkpoint — Study 7 local strategy runners (execution tooling only)

## Top screen

- **Updated:** 2026-11-01T14:06Z (UTC, from the clock). **Status: COMPLETE (implementation and verification).**
  **Not committed and not pushed:** `CLAUDE.md` requires the user's explicit request; awaiting it.
- **Task:** the user's message of 2026-11-01 ("Claude Code assignment — Study 7 local strategy runners and reproducible
  commands"). It is execution tooling: no optimization, no rule or phenotype change, no Study 7 stage run.
- **Branch:** `tools/study7-local-runners`, from `research/study7-stability-first-d1` at `544c268`. The working
  tree holds the new files, uncommitted.
- **Read-only authority:**
  - `research/study7-stability-first-d1/FROZEN_SELECTION.json` (file `f49a8cf9…`);
  - `results/final/final.json` (file `7b65c430…`, body `cc609b0d62a0…`) and `final-lots.jsonl.gz`.
  Both are unchanged and hash-verified at every run.
- **Running process:** none.
- **Next action:** if the user asks, commit the files below on this branch (and push it); otherwise nothing.

## Files added or changed

- `package.json`: npm script `study7-run`.
- `src/study7-runners/`:
  - `aliases.ts`, `resolve.ts`, `reconcile.ts`, `run.ts`, `main.ts`;
  - `tests/runners.test.ts`;
  - `README.md`, `WORK_RECOVERY.md`.
- `config/research-pools/study7-local-runners/S7R-B1.json` and `S7R-VG-frozen.json`: new runner configurations. Their
  books are copied verbatim from `config/pools/B5.json` and load through the stock `src/pools/load.ts`; B1 is checked
  against the frozen B1 benchmark.

## Verification (all on this working tree)

- `npx tsc --noEmit -p .`: clean.
- `npx eslint src/study7-runners`: clean.
- `node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-timeout=600000 src/study7-runners/tests/runners.test.ts`:
  8/8 pass.
- Study 7 and pools tests: 32 tests, 30 pass, 2 skipped. The 2 skips are the B4/B5 anchor tests, which skip because
  the canonical files were appended; this was documented by Study 5.
- All 12 `run` commands, `run vg-robust --end 2026-10-29`, `run vgt-primary --cost-bps 5` and both `compare` forms
  exit 0. Every run to 2026-10-29 at 5 bps reconciles **PASS** against the sealed final door:
  - totals to the cent;
  - every lot identical;
  - the brief's anchors equal: vg-profit $284,271.14 / $28,297.09 / 63; B1 $176,260.47 / $19,534.41; B5
    $484,636.97 / $26,509.97.
- Error cases exit 2 with a message.
- Outputs: `evaluations/study7-runs/` (git-ignored); final pass logs in the session scratch directory.

## Guards

- Never edit:
  - `config/phenotypes/` or `config/pools/`;
  - the Study 5–7 research records or configs;
  - `data/`, market events (the user's `distributions.*` edits stay untouched), or the prospective system.
- Never run a Study 7 stage command (`final`, `search`, …) from this tooling.
