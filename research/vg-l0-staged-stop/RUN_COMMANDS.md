# RUN_COMMANDS — Priority 4 (P4-S1): the exact commands

Working directory: the repository root `/home/chad/projects/margin-trading` (main checkout, branch
`research/vg-l0-staged-trailing-stop`). Node 24.21.0 (`.node-version`); every evaluating process runs `node --no-maglev`.
`N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.

## 1. GPU Phase 8 acceptance (E2–E4; `research/gpu-phase8/`)

```bash
# the campaign (B1 build, E3 negative, E4 tamper, A1 parity, A2 finalists, R1–R3, A3/sb lanes, A4 mini + p4 set, Q1, A5, A6)
tools/gpu-phase8/launch-slice.sh p8chain-final /home/chad/projects/margin-trading/research/gpu-phase8/results/logs/final-chain.txt -- /usr/bin/env START=1 /bin/bash research/gpu-phase8/chains/final.sh
# E7–E10 (npm test, tsc, ESLint, Strategy Lab, portfolio parity, integrity against the 5d587bb2 baseline)
tools/gpu-phase8/launch-slice.sh p8chain-tests /home/chad/projects/margin-trading/research/gpu-phase8/results/logs/tests-chain.txt -- /bin/bash research/gpu-phase8/chains/tests.sh
# the record (writes config/gpu-backend/acceptance.json only if every gate passes)
$N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase8/accept.ts
# independent verification and the out-of-band pin
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 <record sha256>
```

## 2. Priority 4 engineering gates and the freeze (E0, E1, E4, E5)

```bash
REC=<record sha256> tools/vg-l0-staged-stop/launch.sh vgl0ss-eng /home/chad/projects/margin-trading/research/vg-l0-staged-stop/results/logs/engineering.log --wait -- /usr/bin/env REC=<record sha256> /bin/bash tools/vg-l0-staged-stop/engineering.sh
GPU_POLICY_PURPOSE=official-optimization npm run vg-l0ss -- gates
GPU_POLICY_PURPOSE=official-optimization npm run vg-l0ss -- freeze
```

`engineering.sh` writes `results/engineering/E0/rule.txt`, `E1/tests.txt`, `E4/verify-acceptance.txt`, `E4/runtime.txt`,
`E4/official-preflight-D19|D21|D24.txt` (`npm run vg-l0ss -- preflight --door D`), `E5/bench.json`
(`GPU_POLICY_PURPOSE=benchmark npm run vg-l0ss-bench -- --out …`) and `E5/preflight.txt`.

## 3. Official stages (each a contained unit; fail-fast; each sealed block committed before the next)

```bash
/usr/bin/env CUT=ABLATE /bin/bash research/vg-l0-staged-stop/chains/fold.sh    # Stage A: ablations on D24
/usr/bin/env CUT=C19 /bin/bash research/vg-l0-staged-stop/chains/fold.sh       # search, gate R, extend, qualify, select, interval (D21)
/usr/bin/env CUT=C21 /bin/bash research/vg-l0-staged-stop/chains/fold.sh       # … interval (D23)
/usr/bin/env CUT=C24 /bin/bash research/vg-l0-staged-stop/chains/fold.sh       # … informed, qualify, select, decompose, freeze-selection, authorize-full, validate (FULL once), outcome
```

Each `fold.sh` step runs `GPU_POLICY_PURPOSE=official-optimization node --no-maglev … src/gpu-backend/officialRunner.ts
research/vg-l0-staged-stop src/vg-l0-staged-stop/main.ts <command> [--cutoff C] [--resume]` inside
`tools/vg-l0-staged-stop/launch.sh vgl0ss-<step> <log> --wait`. Resume after an interruption: `START=<step> RESUME=1`
(sealed stages refuse to rerun; an interrupted job resumes from its archive).

The fold chains are started as their own units, e.g.

```bash
tools/vg-l0-staged-stop/launch.sh vgl0ss-fold-C19 /home/chad/projects/margin-trading/research/vg-l0-staged-stop/results/logs/fold-C19.txt -- /usr/bin/env CUT=C19 /bin/bash research/vg-l0-staged-stop/chains/fold.sh
```

## 4. Report-only analyses (non-official)

```bash
GPU_POLICY_PURPOSE=diagnostic npm run vg-l0ss-tools -- analyze
GPU_POLICY_PURPOSE=diagnostic npm run vg-l0ss-tools -- diagnose --spec <pairs.json> --door D24 --out <json>
```
