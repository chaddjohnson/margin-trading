# RUN_COMMANDS — the commands actually executed (repository root `/home/chad/projects/margin-trading`)

- `N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`
- `F="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"`
- `OFF="$N $F src/gpu-backend/officialRunner.ts research/vg-l0-risk-envelope-stage-b src/vg-l0-risk-envelope-stage-b/main.ts"`
  (= `npm run vg-l0reb --`)
- `L=tools/vg-l0-risk-envelope-stage-b/launch.sh` (a transient unit in `vgl0reb.slice`, 44G / 48G / swap 0)

Times are UTC, from `date -u` or the logs.

## Preregistration (commit `59493083`, 21:26:55Z, pushed)

```bash
python3 -I tools/vg-l0-risk-envelope-stage-b/adoption.py 2026-11-22T21:25:00Z 2026-11-22T21:26:35Z   # readAt estimated: AMENDMENTS P1
npm run --silent research-preflight -- --study research/vg-l0-risk-envelope-stage-b                 # PASS
```

## Engineering gates (before the freeze)

```bash
# E1 (unit vgl0reb-e1, 21:30–21:36:10Z)
$L vgl0reb-e1 $R/research/vg-l0-risk-envelope-stage-b/results/logs/e1.log -- /bin/bash $R/research/vg-l0-risk-envelope-stage-b/chains/e1.sh
# E3 edge subjects (read-only from Stage A's replayed pilot populations)
python3 -I tools/vg-l0-risk-envelope-stage-b/edge-subjects.py
# E4 + E3 (unit vgl0reb-eng, 21:42:49Z → 21:55:22Z, all steps exit as expected)
$L vgl0reb-eng $R/research/vg-l0-risk-envelope-stage-b/results/logs/engineering-chain.log -- /bin/bash $R/research/vg-l0-risk-envelope-stage-b/chains/engineering.sh
# code + tools committed (33d663d4); E5 (21:47Z) and E6 (unit vgl0reb-e6, 21:47:24–21:48:41Z)
npm run --silent research-preflight -- --study research/vg-l0-risk-envelope-stage-b > research/vg-l0-risk-envelope-stage-b/results/engineering/E5/preflight.txt
$L vgl0reb-e6 $R/research/vg-l0-risk-envelope-stage-b/results/logs/e6.log --wait -- /bin/bash $R/research/vg-l0-risk-envelope-stage-b/chains/e6.sh
# evidence committed (d00ba33f); gates (sealed, b5636559); freeze (sealed, 2922e04d, pushed 21:56Z)
GPU_POLICY_PURPOSE=official-optimization npm run --silent vg-l0reb -- gates
GPU_POLICY_PURPOSE=official-optimization npm run --silent vg-l0reb -- freeze
```

## Official folds (one fail-fast chain per fold; each official stage its own unit `vgl0reb-<cut>-<stage>`)

```bash
$L vgl0reb-fold-C19 $R/research/vg-l0-risk-envelope-stage-b/results/logs/fold-C19.log -- /usr/bin/env CUT=C19 /bin/bash $R/research/vg-l0-risk-envelope-stage-b/chains/fold.sh   # started 21:56:09Z
```

The chain runs these commands in order:
- `repro --cutoff C`, then `e2 --cutoff C`, then a commit;
- `search --cutoff C`, then a commit;
- `qualify --cutoff C`, then a commit;
- `select --cutoff C`, then a commit;
- `interval --cutoff C` (C19, C21), then a commit;
- or, for C24: `freeze-selection` and a commit, `authorize-full` and a commit, `validate` and a commit.

Each stage is started as `$L vgl0reb-<C>-<stage> <log> --wait -- /usr/bin/env GPU_POLICY_PURPOSE=official-optimization
$OFF <command>`.
