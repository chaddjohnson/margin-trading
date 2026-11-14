# RUN_COMMANDS — Assignment 2: D1 risk-control families and risk-aware candidate selection

Run every command from the repository root (`/home/chad/projects/margin-trading`) on branch
`research/vg-l0-risk-families`, Node v24.21.0 (`.node-version`). Heavy stages run as transient systemd user units in
`vgl0rf.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) through `npm run vg-l0rf -- launch`. Sealed records refuse
to be rewritten; an interrupted search or qualification resumes exactly from its archive
(`.cache/vg-l0-risk-families/jobs/<job>/archive.sqlite`, local and git-ignored).

## Preflight, tests, gates

```
npm run research-preflight -- --study research/vg-l0-risk-families           # standard 2.2.0, scope optimization
node --experimental-transform-types --disable-warning=ExperimentalWarning --test \
  src/d1-risk-controls/tests/*.test.ts src/d1-risk-controls-rc2/tests/*.test.ts src/vg-l0-risk-families/tests/*.test.ts
npx tsc --noEmit -p tsconfig.json
npm run vg-l0rf -- doors                                                       # canonical files, door pins, endpoint
npm run vg-l0rf -- launch --unit vgl0rf-parity --wait -- parity               # stage V (sealed; --dry-run prints only)
systemd-run --user --unit=vgl0rf-npm-test --slice=vgl0rf.slice --collect --wait -p MemoryHigh=44G -p MemoryMax=48G \
  -p MemorySwapMax=0 -p KillMode=mixed -E PATH="$PATH" -E HOME="$HOME" --working-directory="$PWD" /bin/bash -c 'npm test'
npm run vg-l0rf -- verify                                                      # every sealed record against seals.jsonl
```

## Pilot and bench (engineering only; cache)

```
for w in 10 12 14 16; do npm run vg-l0rf -- launch --unit vgl0rf-bench-w$w --wait -- bench --door D24 --centres 392 --workers $w --label w$w --warm 8; done
research/vg-l0-risk-families/chains/pilot.sh                                   # every stage on P18 + interruption tests
npm run vg-l0rf -- launch --unit vgl0rf-pilot-calib-s01 --env VGL0RF_PILOT_BUDGET=study --wait -- \
  search --cutoff P18 --part pilot --pilot calib --workers 12                  # study-fidelity cost calibration
```

## The study

```
npm run vg-l0rf -- freeze-protocol                                             # sealed; committed before any search
R=/home/chad/projects/margin-trading
systemd-run --user --unit=vgl0rf-chain1 --collect -p KillMode=process -E PATH="$PATH" -E HOME="$HOME" \
  -p StandardOutput=append:$R/research/vg-l0-risk-families/results/logs/chain1.log \
  -p StandardError=append:$R/research/vg-l0-risk-families/results/logs/chain1.log \
  --working-directory=$R /bin/bash $R/research/vg-l0-risk-families/chains/chain1.sh [STEP]
```

`chains/chain1.sh` runs, per cutoff C19 → C21 → C23 → C24 (step ids c<n>01 … c<n>14): `search --cutoff C --part
base|onset1|onset2`, `qualify --cutoff C --stage broad`, `refine-plan --cutoff C`, `search --cutoff C --part refine`,
`qualify --cutoff C --stage refine`, `select --cutoff C` (committed), `fold-eval --cutoff C` (C19–C23, committed),
`sequential` (after C23, committed); then `freeze-selection` (committed: the FULL guard) and `validate` (FULL once,
committed). Every step is `npm run vg-l0rf -- launch --unit vgl0rf-<C>-<step> --wait -- <command> --workers 12`.

## Report-only diagnostics and tables (after the validation; post-freeze tooling in `tools/vg-l0-risk-families/`)

```
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-families/analyses.ts all
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-families/replays.ts folds
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-families/replays.ts finalists
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-families/tail.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-families/tables.ts
```

Each writes a sealed record under `results/diagnostics/` (`--dry` prints instead); `tables.ts` regenerates
`results/tables/*.md` from the sealed records.

## Using RC 2

```ts
import { evaluateWithControls2 } from './src/d1-risk-controls-rc2/run.ts';
import { parseRiskConfig2 } from './src/d1-risk-controls-rc2/config.ts';

const cfg = parseRiskConfig2({
  version: 2,
  books: {
    'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80, activation: 'entry-day' }, hold: { mode: 'disabled' } },
    'D1:VGT': { protectiveStop: { mode: 'on', stopDistanceTenths: 120 } } // next-session (RC 1)
  }
});
const { rec, risk } = evaluateWithControls2(door, quad, cfg, { enabled: { 'G:GDX': false } });
```

A configuration without an entry-day book is an RC 1 configuration (identity, key and record unchanged); `null` is
legacy (Priority 3's identity and record).
