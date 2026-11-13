# RUN_COMMANDS — Assignment 1: New L0 risk-aware successor foundation

Run every command from the repository root on Apollo (`/home/chad/projects/margin-trading`), on branch
`research/vg-l0-risk-controls-foundation`, with Node v24.21.0 (`.node-version`). `NODE` below is the absolute path the
systemd units need: `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.

- Sealed records refuse to be rewritten. `--dry` writes an unsealed copy to `$RCF_SCRATCH` (default
  `.cache/vg-l0-risk-controls-foundation/dry/`).
- `--rerun <tag>` writes a new, labelled record (used by amendments A2 and A3).

## Preflight and tests

```
npm run research-preflight -- --study research/vg-l0-risk-controls-foundation      # standard 2.2.0, scope diagnostic
npm run research-preflight -- --all                                                 # every study (earlier pins: notices)
node --experimental-transform-types --disable-warning=ExperimentalWarning --test \
  src/d1-risk-controls/tests/*.test.ts src/research-standard/tests/preflight.test.ts  # 74 + 26 tests, < 2 s
npx tsc --noEmit -p tsconfig.json                                                   # type check of src/
# the whole suite, in a contained unit (PATH is passed: one suite spawns npm)
systemd-run --user --unit=vgrcf-npm-test --slice=vgrcf.slice --collect --wait \
  -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 -p KillMode=mixed -E PATH="$PATH" -E HOME="$HOME" \
  --working-directory="$PWD" /bin/bash -c 'npm test'
```

## The study's stages (in order; each seals its record)

```
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-controls-foundation/freeze.ts   # S1 (sealed)
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-controls-foundation/gates.ts g0  # G0 (sealed)
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-controls-foundation/demo.ts      # G6 demonstrations (sealed)
research/vg-l0-risk-controls-foundation/chains/chain1.sh newl0 random                  # G1–G3, G4 in units vgrcf-<stage> (sealed)
$NODE … gates.ts invariants --rerun a2   (in unit vgrcf-invariants-a2, as chain1.sh)    # G5 after amendment A2 (sealed)
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-controls-foundation/gates.ts frozen --rerun a3  # G7 after A3 (sealed)
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-controls-foundation/tables.ts   # tables/ (regenerated)
npm run --silent vg-lmo -- verify; npm run --silent vg-l0se -- verify                   # frozen commands at HEAD (read-only)
```

The units run in `vgrcf.slice` with MemoryHigh 44G, MemoryMax 48G and MemorySwapMax 0, one at a time. Logs are in
`results/logs/`.

## Verifying the sealed records

`sha256sum` of each file in `results/seals.jsonl` equals its recorded sha256. `RESEARCH_RECOVERY.md` lists them.

## Using the controls (for Assignment 2)

```ts
import { evaluateWithControls, runWithControls } from './src/d1-risk-controls/run.ts';
import { parseRiskConfig, riskId, riskEvalKey } from './src/d1-risk-controls/config.ts';

const cfg = parseRiskConfig({
  version: 1,
  books: {
    'D1:GDX': { protectiveStop: { mode: 'on', stopDistanceTenths: 80 }, hold: { mode: 'disabled' } },
    'D1:VGT': {
      protectiveStop: { mode: 'on', stopDistanceTenths: 120 },
      hold: { mode: 'adaptive', extendedHoldDays: 30, progressTenths: 50 },
      declineGate: { mode: 'on', losses: 2, recoveryTenths: 500, maxBlockSessions: 60 }
    }
  }
});
const { rec, risk } = evaluateWithControls(door, quad, cfg, { enabled: { 'G:GDX': false } });
// rec: Priority 3's compact record (id = riskId); risk.books['D1:VGT'].trades / events: the controls' logs
```

`null` or absent controls are legacy and identical to Priority 3's `evaluate`. Doors come from Priority 3's
`openPrefixDoor` (quiet) or, for the frozen New L0 only, the guarded FULL loader in
`tools/vg-l0-risk-controls-foundation/common.ts`.
