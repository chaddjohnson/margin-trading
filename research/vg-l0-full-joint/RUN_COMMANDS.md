# RUN_COMMANDS — Assignment 3: New L0 risk-aware successor, full joint optimization

Run every command from the repository root (`/home/chad/projects/margin-trading`) on branch `research/vg-l0-full-joint`,
Node v24.21.0 (`.node-version`). Heavy stages run as transient systemd user units in `vgl0fj.slice` (MemoryHigh 44G,
MemoryMax 48G, MemorySwapMax 0) through `npm run vg-l0fj -- launch`. Sealed records refuse to be rewritten; an interrupted
search or qualification resumes exactly from its archive (`.cache/vg-l0-full-joint/jobs/<job>/archive.sqlite`, local and
git-ignored).

## Preflight, tests, gates

```
npm run research-preflight -- --study research/vg-l0-full-joint             # standard 2.2.0, scope optimization
node --experimental-transform-types --disable-warning=ExperimentalWarning --test \
  src/d1-risk-controls/tests/*.test.ts src/d1-risk-controls-rc2/tests/*.test.ts src/vg-l0-risk-families/tests/*.test.ts \
  src/vg-l0-full-joint/tests/*.test.ts
npx tsc --noEmit -p tsconfig.json
npm run vg-l0fj -- doors                                                       # canonical files, door pins, endpoint
npm run vg-l0fj -- launch --unit vgl0fj-parity --wait -- parity               # stage V (sealed; --dry-run prints only)
systemd-run --user --unit=vgl0fj-npm-test --slice=vgl0fj.slice --collect -p MemoryHigh=44G -p MemoryMax=48G \
  -p MemorySwapMax=0 -p KillMode=mixed -E PATH="$PATH" -E HOME="$HOME" --working-directory="$PWD" /bin/bash -c 'npm test'
npm run vg-l0fj -- verify                                                      # every sealed record against seals.jsonl
```

## Pilot, bench and calibration (engineering only; cache)

```
for w in 10 12 14 16; do npm run vg-l0fj -- launch --unit vgl0fj-bench-w$w --wait -- bench --door D24 --centres 256 --workers $w --label w$w --warm 12; done
research/vg-l0-full-joint/chains/pilot.sh                                     # every stage on P18 + interruption tests
research/vg-l0-full-joint/chains/calibration.sh                               # the study's per-lane schedules on the pilot structures
```

## The study

```
npm run vg-l0fj -- readopt                                                     # before the freeze only: refresh the manifest's protocol hash
npm run vg-l0fj -- freeze-protocol                                             # sealed; committed before any search
R=/home/chad/projects/margin-trading
systemd-run --user --unit=vgl0fj-chain1 --collect -p KillMode=process -E PATH="$PATH" -E HOME="$HOME" \
  -p StandardOutput=append:$R/research/vg-l0-full-joint/results/logs/chain1.log \
  -p StandardError=append:$R/research/vg-l0-full-joint/results/logs/chain1.log \
  --working-directory=$R /bin/bash $R/research/vg-l0-full-joint/chains/chain1.sh [STEP]
```

`chains/chain1.sh` runs, per cutoff C19 → C21 → C23 → C24 (step ids c<n>01 … c<n>17): `search --cutoff C --part
broad1|broad2`, `qualify --cutoff C --stage broad`, `refine-plan --cutoff C`, `search --cutoff C --part refine`, `qualify
--cutoff C --stage refine`; at C24 also `search --cutoff C24 --part informed1|informed2` and `qualify --cutoff C24 --stage
informed`; `select --cutoff C` (committed), `fold-eval --cutoff C` (C19–C23, committed), `sequential` (after C23,
committed); then `freeze-selection` (committed: the FULL guard) and `validate` (FULL once, committed). Every step is
`npm run vg-l0fj -- launch --unit vgl0fj-<C>-<step> --wait -- <command> --workers 12`.

## Report-only diagnostics and tables (after the validation; post-freeze tooling in `tools/vg-l0-full-joint/`)

```
N="node --experimental-transform-types --disable-warning=ExperimentalWarning"
$N tools/vg-l0-full-joint/analyses.ts all        # coverage, structures, selection study, tracks (records only)
$N tools/vg-l0-full-joint/replays.ts folds       # fold primaries on their next doors
$N tools/vg-l0-full-joint/replays.ts finalists   # ablations, holdings, episodes, gaps, 2025–2026 give-back (D24 and FULL)
$N tools/vg-l0-full-joint/replays.ts ledgers     # trade and capital-pool ledgers, phenotype manifests (FULL)
$N tools/vg-l0-full-joint/tail.ts                # D1 hold-window tail stress (in-sample, proxies, synthetic gaps)
$N tools/vg-l0-full-joint/tables.ts              # results/tables/*.md and summary.json
```

Each analysis writes a sealed record under `results/diagnostics/` (`--dry` prints instead); `tables.ts` regenerates
`results/tables/*.md` from the sealed records. An engineering dry test on the pilot's records:
`VGL0FJ_TOOLS_DIR=$PWD/.cache/vg-l0-full-joint/pilot/straight VGL0FJ_TOOLS_CUTS=P18 $N tools/vg-l0-full-joint/<tool>.ts …`.
