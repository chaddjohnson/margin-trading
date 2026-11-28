# RUN_COMMANDS — Assignment 2 (verified; from the repository root `/home/chad/projects/margin-trading` on `main`)

Every evaluating Node process runs as `node --no-maglev …` (the npm scripts already do). CPU evaluation needs an
explicit non-official purpose.

## Manual portfolio evaluation (N/original)

```bash
GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window research
GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window all
# the November 25 endpoint as an explicit custom window (one continuous run from the first session; = all, period for period)
GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window custom --from 2016-01-04 --to 2026-11-25
# November only, reported out of the one continuous run (positions, stops and interest carried in)
GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window custom --from 2026-11-02 --to 2026-11-25 --execution continuous
# the same dates as an isolated cold start (the CLI's custom default)
GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window custom --from 2026-11-02 --to 2026-11-25
# add --out <dir> to write summary.json, periods.md, the post-validation ledger and funding, the book states
```

- **The purpose is required.** Without `GPU_POLICY_PURPOSE` the runner refuses (exit 3, "purpose-required").
- **A To after the data is refused.** A `--to` after the latest common complete session (2026-11-25 today) fails with
  "after the latest common complete session".

## GPU acceptance (state and verification)

```bash
tools/gpu-backend/verify-acceptance.sh --expect-record-sha256 9ebb33ce8620dead93ebab349a8263ad3ca8bbc676861771724a745ef2361bf4   # VERIFIED
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 9ebb33ce8620dead93ebab349a8263ad3ca8bbc676861771724a745ef2361bf4
GPU_POLICY_PURPOSE=official-optimization node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/gpu-phase9 --door D24   # GATE OPEN
GPU_POLICY_PURPOSE=diagnostic npm run research-preflight -- --all                                                     # 32/32 PASS
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test src/gpu-backend/tests/policy.test.ts src/gpu-backend/tests/enforcement.test.ts src/research-standard/tests/preflight.test.ts
```

- **The binary is git-ignored.** `research/gpu-phase9/build/gb9` is not in git. `verify-acceptance.sh --rebuild` rebuilds
  it from the pinned sources, byte-identically.
- **The out-of-band pin:** `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase9-9ebb33ce.json`.
- **How the campaign ran** (do not rerun: the jobs refuse, and the record would be superseded):
  `research/gpu-phase9/RUN_COMMANDS.md`.

## The full suites

```bash
systemd-run --user --unit=a2-npm-test --collect -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 \
  -E PATH="$PATH" -E HOME="$HOME" --working-directory="$PWD" /bin/bash -c 'npm test'          # 1,934 / 1,930 / 0 / 4
npx tsc --noEmit
npm run app -- allIn-trailingBuy VGT all 2025-01-02 2026-11-03                              # lint 414 files, tsc, the run
npm --prefix apps/strategy-lab run portfolio-parity -- --out <file>                         # ALL VERIFIED (6 candidates)
# Strategy Lab: e2e against a SCRATCH build, never the served dist
(cd apps/strategy-lab && npm run typecheck && npm run lint && npm run test && npx vite build --outDir <scratch>/dist --emptyOutDir && STRATEGY_LAB_STATIC_DIR=<scratch>/dist npx playwright test)
```

## Historical reproduction (the two demonstrated cases)

```bash
bash docs/data-updates/2026-11-27-assignment-2/scripts/historical-repro-checks.sh   # vg-l0-full-joint 67b4ae71 and Priority 2 47422d04
```

- **What it runs:** `tools/historical-repro/env.ts prepare … / remove …` with environments outside the repository;
  the commands are in the script.
- **Where it runs:** from any checkout that holds the script; it uses that checkout's tool.

## Strategy Lab service

```bash
systemctl --user status strategy-lab
journalctl --user -u strategy-lab -f
systemctl --user restart strategy-lab
systemctl --user show strategy-lab -p WorkingDirectory      # the live release
npm --prefix apps/strategy-lab run token -- --print           # the API token (on Apollo only)
# a new release of an accepted main commit, smoke-tested before the switch
REL=$(bash docs/data-updates/2026-11-27-assignment-2/scripts/strategy-lab-release.sh <commit>)
cp -a state/strategy-lab <scratch>/state-copy   # or rsync without portfolio-cache and preview-cache
(cd $REL/apps/strategy-lab && STRATEGY_LAB_STATE_DIR=<scratch>/state-copy STRATEGY_LAB_PORT=4392 STRATEGY_LAB_HOSTS=127.0.0.1 \
  node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=4096 server/main.ts) &
node --no-maglev docs/data-updates/2026-11-27-assignment-2/scripts/strategy-lab-smoke.mjs http://127.0.0.1:4392 <scratch>/state-copy/api-token
# switch (≈ 10 s of downtime)
node --no-maglev $REL/apps/strategy-lab/scripts/install-service.mjs && systemctl --user daemon-reload && systemctl --user restart strategy-lab
node --no-maglev docs/data-updates/2026-11-27-assignment-2/scripts/strategy-lab-browser-check.mjs http://100.68.60.114:4317 state/strategy-lab/api-token $REL/apps/strategy-lab
```
