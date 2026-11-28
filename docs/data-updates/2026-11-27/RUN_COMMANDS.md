# Verified commands (2026-11-27; run from the repository root)

Every Node process runs with `--no-maglev` (the npm scripts pass it). Credentials come from `.env` and are never
printed.

## Market data: refresh VGT and GDX through the latest completed session

The commands that updated the files on 2026-11-27, through 2026-11-25. For a later refresh:
- `start` = the canonical file's last date, which gives a one-session overlap that `append` proves unchanged;
- `end` = the latest completed session D, or D + 1 when D + 1 has no session at all (as here: Thanksgiving). A date-only
  `end` is the end of that UTC day, so D's 19:00–19:59 ET (standard time) bars fall on D + 1 (see `AUDIT.md` §1);
- `end` must never reach the current session.

```bash
set -a; . ./.env; set +a
D=<an empty scratch directory>
OUTPUT_DIR="$D" scripts/download.sh VGT 2026-10-30 2026-11-26
OUTPUT_DIR="$D" scripts/download.sh GDX 2026-10-30 2026-11-26
cp "$D/VGT.csv" data/VGT.csv && cp "$D/GDX.csv" data/GDX.csv
npm run datasets -- append VGT GDX --dry-run --keep-source   # the overlap and byte-prefix proofs; nothing written
npm run datasets -- append VGT GDX                           # appends, records both vintages in config/market-data/vintages.json
npm run datasets -- verify VGT GDX                           # full re-scan; dataset-report.json "verified"
npm run datasets -- vintages VGT GDX                         # every recorded earlier file is a byte prefix of today's
npm run datasets -- prefix VGT --through 2026-10-30          # the pin of every row through a New York date
npm run market-events -- verify                              # splits against the overnight moves
```

## N/original (or any sealed pooled VGT/GDX subject; `--list`)

```bash
# the historical research window: Priority 3's FULL door (2016-01-04 → 2026-10-30), = the sealed figures
GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window research
# all available data: 2016-01-04 → the latest common complete session of VGT and GDX (A / B / C periods, trajectory check)
GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window all --out docs/data-updates/2026-11-27/n-original/all-through-2026-11-25
# a custom window (starts flat at its first session; a --to after the common complete endpoint is refused)
GPU_POLICY_PURPOSE=cpu-reference npm run manual-eval -- --subject "N/original" --window custom --from 2025-01-02 --to 2026-11-25
```

## Evidence and checks

```bash
# the doors' content and the sealed replays (compare with evidence/fingerprint-0-before-change.json)
GPU_POLICY_PURPOSE=cpu-reference node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
  --max-old-space-size=8192 tools/data-boundaries/fingerprint.ts --out <file>
# the non-official GPU/CPU boundary check (accepted binary; parity-test purpose; GPU must be free)
GPU_POLICY_PURPOSE=parity-test node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
  --max-old-space-size=12288 tools/data-boundaries/gpu-check.ts --cache <scratch dir> --out <file>
# focused tests
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test \
  src/lib/tests/researchBoundaries.test.ts src/manual-eval/tests/manualEval.test.ts src/data-partition/tests/datasets.test.ts \
  src/research-standard/tests/preflight.test.ts src/growth-trading/tests/offParity*.test.ts
# the full suite, contained (as run here)
systemd-run --user --unit=<name> --collect -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 -p KillMode=mixed \
  -E PATH="$PATH" -E HOME="$HOME" --working-directory="$PWD" /bin/bash -c 'npm test'
npm --prefix apps/strategy-lab exec vitest run
tools/gpu-backend/verify-acceptance.sh             # reports the six changed pinned files (STALE on this branch)
npm run research-preflight -- --study research/<study>
```

Single-symbol strategies on all data or a custom window (`npm run app` first runs `eslint && tsc`; `eslint` currently
fails on ignored Strategy Lab scratch bundles under `research/*/cache/`, so the entry point was run directly):

```bash
node --no-maglev --env-file-if-exists=.env --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts allIn-trailingBuy VGT all
node --no-maglev --env-file-if-exists=.env --experimental-transform-types --disable-warning=ExperimentalWarning src/app.ts allIn-trailingBuy VGT all 2025-01-02 2026-11-03
```
