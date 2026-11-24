# RUN_COMMANDS — P5-NS (from the repository root `/home/chad/projects/margin-trading`)

Every evaluating Node process runs `node --no-maglev` (the npm scripts carry it). Long work runs as transient systemd user
units in `vgl0ns.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) through `tools/vg-l0-n-successor/launch.sh
<unit> <absolute log> [--wait] -- <command…>`.

## Preflight and records (no evaluation)

```bash
npm run research-preflight -- --study research/vg-l0-n-successor
tools/gpu-backend/verify-acceptance.sh --device --expect-record-sha256 bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7
GPU_POLICY_PURPOSE=official-optimization npm run vg-l0ns -- bound      # the frozen schedules, caps and bounds
GPU_POLICY_PURPOSE=official-optimization npm run vg-l0ns -- ledger     # requested evaluations of the sealed stages
GPU_POLICY_PURPOSE=official-optimization npm run vg-l0ns -- verify     # every seal of results/seals.jsonl
python3 -I tools/vg-l0-n-successor/adoption.py "$(date -u +%Y-%m-%dT%H:%M:%SZ)"   # pre-freeze only
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-reporter=tap src/vg-l0-n-successor/tests/study.test.ts
```

## Engineering gates and the pilot (non-official; before the freeze)

```bash
L=/home/chad/projects/margin-trading/research/vg-l0-n-successor/results/logs
E() { tools/vg-l0-n-successor/launch.sh vgl0ns-$1 $L/$1.log --wait -- env GPU_POLICY_PURPOSE=$2 npm run vg-l0ns-eng -- "${@:3}"; }
E e1 parity-test e1            # acceptance (independent verifier, rebuild, device, out-of-band pin) + entrypoint audit
E e2 parity-test e2            # references GPU = CPU = sealed on D19–D24 and FULL (known target); C24 evidence = Assignment 3
E e3 parity-test e3            # Assignment 3's sealed lanes reproduced (8 broad, 1 refinement, N/original's own lane)
E e4 parity-test e4            # CPU/GPU parity on the reachable domain × option sets, D19–D24
E e5a parity-test e5 --step interrupted   # then:
E e5 parity-test e5            # determinism: GPU, GPU resumed, CPU
E e6 parity-test e6            # the sequential statistic vs the CPU exact minute chain
E pilot-broad benchmark pilot --step broad        # 128 broad lanes on D21 (BENCH keys)
E pilot-informed benchmark pilot --step informed  # 16 Track N lanes on D24 (BENCH keys)
E pilot benchmark pilot                            # summary: expected costs, R_N
# E7 / E8: the test suites, recorded
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-reporter=tap src/vg-l0-n-successor/tests/*.test.ts src/vg-l0-full-joint/tests/*.test.ts src/vg-l0-risk-envelope-pilot/tests/*.test.ts src/vg-l0-risk-envelope-stage-b/tests/*.test.ts src/gpu-backend/tests/policy.test.ts > $L/E7.tap
GPU_POLICY_PURPOSE=parity-test npm run vg-l0ns-eng -- record --gate E7 --log $L/E7.tap --known 0
```

## Freeze (after every gate passed and everything is committed)

```bash
GPU_POLICY_PURPOSE=official-optimization npm run vg-l0ns -- gates     # seals results/engineering/gates.json
git add research/vg-l0-n-successor/results && git commit -m "…gates"
GPU_POLICY_PURPOSE=official-optimization npm run vg-l0ns -- freeze    # seals results/protocol-freeze.json
git add research/vg-l0-n-successor/results && git commit -m "…freeze"
```

## The official chain (fail-fast, idempotent; its own unit, surviving the session)

```bash
systemd-run --user --unit=vgl0ns-chain --collect -p KillMode=process -E PATH="$PATH" -E HOME="$HOME" \
  -p StandardOutput=append:/home/chad/projects/margin-trading/research/vg-l0-n-successor/results/logs/chain.log \
  -p StandardError=append:/home/chad/projects/margin-trading/research/vg-l0-n-successor/results/logs/chain.log \
  --working-directory=/home/chad/projects/margin-trading /bin/bash research/vg-l0-n-successor/chains/chain.sh
```

The chain runs, per cutoff C19 → C21 → C23 → C24, the stages of PROTOCOL.md §14 as units named `vgl0ns-<C>-<stage>`
(logs `results/logs/<C>-<stage>.log`), commits each sealed block, and after C23 the sequential record; at C24 the Track N
stages, the selection, the frozen selection, the FULL authorization, the validation (FULL once) and the outcome. Rerunning
the same command skips sealed stages and resumes an interrupted job from its archive (`--resume`, the gate runs again).
Single stages by hand: `GPU_POLICY_PURPOSE=official-optimization npm run vg-l0ns -- <command> [--cutoff C] …` (see the
header of `src/vg-l0-n-successor/main.ts`).

## Job state and status

```bash
node --no-maglev --experimental-transform-types src/gpu-jobs/cli.ts list --study research/vg-l0-n-successor
```
