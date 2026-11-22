# RUN_COMMANDS — the commands actually executed (repository root `/home/chad/projects/margin-trading`)

`N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`;
`F="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"`;
`OFF="$N $F src/gpu-backend/officialRunner.ts research/vg-l0-risk-envelope-pilot src/vg-l0-risk-envelope-pilot/main.ts"`
(= `npm run vg-l0rep --`). Times UTC (from `date -u` / the logs).

## Engineering (before the freeze)

```bash
# E1 (pre-check on fc027eed at 09:53Z; evidence run on 1f5093d6)
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7
# the derived lane (before the first commit)
$N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-pilot/derive.ts
# the adoption manifest
python3 -I tools/vg-l0-risk-envelope-pilot/adoption.py 2026-11-22T09:43:00Z <adoptedAt>
# E4 + E3 (unit vgl0rep-eng 10:22:11Z; after the step-6 expectation fix, unit vgl0rep-eng2 START=7, 10:32:23Z → 10:36:49Z)
tools/vg-l0-risk-envelope-pilot/launch.sh vgl0rep-eng $R/research/vg-l0-risk-envelope-pilot/results/logs/engineering-chain.log -- /bin/bash $R/research/vg-l0-risk-envelope-pilot/chains/engineering.sh
tools/vg-l0-risk-envelope-pilot/launch.sh vgl0rep-eng2 $R/research/vg-l0-risk-envelope-pilot/results/logs/engineering-chain.log -- /usr/bin/env START=7 /bin/bash $R/research/vg-l0-risk-envelope-pilot/chains/engineering.sh
# E5 (10:24:34Z on 1f5093d6)
npm run --silent research-preflight -- --study research/vg-l0-risk-envelope-pilot
# E6 (10:37Z)
GPU_POLICY_PURPOSE=official-optimization $N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/vg-l0-risk-envelope-pilot --door D21
GPU_POLICY_PURPOSE=official-optimization $N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/vg-l0-risk-envelope-pilot --door D24
# the gates and the freeze (10:37:49Z, 10:37:59Z), commit 8b06986e, push
GPU_POLICY_PURPOSE=official-optimization $OFF gates
GPU_POLICY_PURPOSE=official-optimization $OFF freeze
```

## Official stages (one chain, unit vgl0rep-official, started 10:38:52Z)

```bash
tools/vg-l0-risk-envelope-pilot/launch.sh vgl0rep-official $R/research/vg-l0-risk-envelope-pilot/results/logs/official-chain.log -- /bin/bash $R/research/vg-l0-risk-envelope-pilot/chains/official.sh
```

The chain runs, each official stage as its own unit `vgl0rep-<stage>` (`launch.sh … --wait -- /usr/bin/env
GPU_POLICY_PURPOSE=official-optimization $OFF <command>`): `search --cutoff C21 --arm CTRL`, `search --cutoff C24 --arm
CTRL`, `e2`, `search --cutoff C21 --arm EXP`, `search --cutoff C24 --arm EXP`, `qualify --cutoff C21`, `qualify --cutoff
C24`, `e2-qualification --cutoff C21|C24`, `select --cutoff C21`, `interval --cutoff C21`, `select --cutoff C24`,
`freeze-selection`, `authorize-full`, `validate`, committing each sealed block.

## After the official stages (report-only; no evaluation except the nonbinding CPU diagnostics)

```bash
GPU_POLICY_PURPOSE=diagnostic $N $F src/gpu-backend/legacyRunner.ts vg-l0rep-tools tools/vg-l0-risk-envelope-pilot/census.ts --cutoff C21
GPU_POLICY_PURPOSE=diagnostic $N $F src/gpu-backend/legacyRunner.ts vg-l0rep-tools tools/vg-l0-risk-envelope-pilot/census.ts --cutoff C24
GPU_POLICY_PURPOSE=diagnostic npm run vg-l0rep-diag -- all
$N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-pilot/tables.ts
tools/vg-l0-risk-envelope-pilot/bundle.sh <scratch dir>
```
