# RUN_COMMANDS — gpu-phase6 (exact commands; repository root `/home/chad/projects/margin-trading`)

Node: `N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`; `TS="--no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning"`.

## Campaign (C1–C8; PROTOCOL.md §5)

```bash
tools/gpu-phase6/launch-slice.sh p6chain-campaign /home/chad/projects/margin-trading/research/gpu-phase6/results/logs/chain-campaign.txt -- /usr/bin/env START=1 /bin/bash research/gpu-phase6/chains/campaign.sh
```

Resume after an interruption: `START=<step>` (1 C1 … 8 C8); a step's jobs are never recreated (JOB_EXISTS) — an
interrupted job of a step is resumed with its own command plus `--resume`.

## Enforcement evidence (final committed tree)

```bash
$N $TS tools/gpu-phase6/negative.ts --out research/gpu-phase6/results/policy/negative-final.json
$N $TS tools/gpu-phase6/tamper.ts --out research/gpu-phase6/results/policy/tamper-final.json
```

## Suites

```bash
npm test                                   # root (runs with --no-maglev)
npx tsc --noEmit -p .                      # root type check
npm --prefix apps/strategy-lab run typecheck && npm --prefix apps/strategy-lab run lint && npm --prefix apps/strategy-lab test && npm --prefix apps/strategy-lab run test:e2e
npm --prefix apps/strategy-lab run portfolio-parity
```

## Acceptance

```bash
$N $TS tools/gpu-phase6/accept.ts [--dry-run]
```
