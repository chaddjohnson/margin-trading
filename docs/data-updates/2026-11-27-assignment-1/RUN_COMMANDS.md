# Verified commands (Assignment 1, 2026-11-27; run from the repository root)

Every evaluating Node process uses `--no-maglev` (the npm scripts pass it). No credentials are needed.

## Strategy Lab

```bash
# the user's established access (VPN, token required; http://apollo:4317): see docs/strategy-lab/OPERATIONS.md
npm --prefix apps/strategy-lab run build          # the UI into apps/strategy-lab/dist (what the server serves)
npm --prefix apps/strategy-lab run start:vpn      # foreground; or the transient unit below
npm --prefix apps/strategy-lab run token -- --print
# as started at the end of this assignment (a transient user unit, not an installed service; stop it any time):
systemd-run --user --unit=strategy-lab-a1 --collect -E PATH="$PATH" -E HOME="$HOME" --working-directory="$PWD" \
  /bin/bash -c 'npm --prefix apps/strategy-lab run start:vpn'
systemctl --user status strategy-lab-a1; journalctl --user -u strategy-lab-a1 -f; systemctl --user stop strategy-lab-a1
```

Open **Portfolios → N/original → Evaluation window: All**, or directly `http://apollo:4317/#/portfolio/n-original?window=all`.

## Tests and checks

```bash
npm --prefix apps/strategy-lab exec vitest run                               # 334 tests
npm --prefix apps/strategy-lab exec vitest run tests/portfolio-windows.test.ts tests/portfolio-parity.test.ts tests/portfolio-server.test.ts
# e2e against a scratch build (never the served dist while developing)
(cd apps/strategy-lab && npx vite build --outDir <scratch>/dist --emptyOutDir && STRATEGY_LAB_STATIC_DIR=<scratch>/dist STRATEGY_LAB_SCREENSHOT_DIR=<dir> npx playwright test)
npm --prefix apps/strategy-lab run lint
npx tsc --noEmit
systemd-run --user --unit=<name> --collect -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 -p KillMode=mixed \
  -E PATH="$PATH" -E HOME="$HOME" --working-directory="$PWD" /bin/bash -c 'npm test'
GPU_POLICY_PURPOSE=diagnostic npm run research-preflight -- --all
tools/gpu-backend/verify-acceptance.sh                                         # NOT VERIFIED here by design (STALE)
node --no-maglev --experimental-transform-types src/gpu-backend/compat.ts --digest
```

## The command line on the same windows

```bash
GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window all --out <dir>
GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window custom --from 2026-11-02 --to 2026-11-25 --execution continuous
```

## Integrity evidence

```bash
GPU_POLICY_PURPOSE=cpu-reference node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
  --max-old-space-size=8192 tools/data-boundaries/fingerprint.ts --out <file>          # = evidence/fingerprint-3-assignment-1.json
GPU_POLICY_PURPOSE=parity-test node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
  --max-old-space-size=12288 tools/data-boundaries/gpu-check.ts --cache <scratch> --out <file>   # non-official
```

## npm run app (restored)

```bash
npm run app -- allIn-trailingBuy VGT all 2025-01-02 2026-11-03     # lints the app's import closure, tsc, then runs
npx eslint                                                          # repository-wide ESLint (pre-existing errors remain)
```

## Historical reproduction (HISTORICAL_COMPATIBILITY.md §1)

```bash
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/historical-repro/env.ts prepare \
  --commit <study commit> --dir <scratch dir outside the repository> --data VGT=<pinned sha256> [--data GDX=<sha256>] \
  [--copy .cache/<study>/doors] [--seals research/<study>/results/seals.jsonl]
# … run the study's own command inside <dir>/tree …
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/historical-repro/env.ts remove --dir <dir>
```
