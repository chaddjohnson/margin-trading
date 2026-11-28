# Execution plan — risk-envelope pilot NL0-REP 1.0.0 (authorized; supersedes the readiness proposal's plan)

The readiness proposal's plan is preserved in `history/2026-11-22-readiness-proposal/EXECUTION_PLAN.md`. Every command
runs from the repository root `/home/chad/projects/margin-trading`. Official stages run as transient systemd units in
`vgl0rep.slice` (44G / 48G / swap 0), one GPU job at a time; each refuses to start unless its guards hold (PROTOCOL §12).

```bash
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
F="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
OFF="$N $F src/gpu-backend/officialRunner.ts research/vg-l0-risk-envelope-pilot src/vg-l0-risk-envelope-pilot/main.ts"   # = npm run vg-l0rep --
ENG="$N $F src/gpu-backend/legacyRunner.ts vg-l0rep-eng tools/vg-l0-risk-envelope-pilot/engineering.ts"                    # = npm run vg-l0rep-eng --
DIAG="$N $F src/gpu-backend/legacyRunner.ts vg-l0rep-diag tools/vg-l0-risk-envelope-pilot/diagnostics.ts"                  # = npm run vg-l0rep-diag --
L=tools/vg-l0-risk-envelope-pilot/launch.sh
LOG=$R/research/vg-l0-risk-envelope-pilot/results/logs
P="/usr/bin/env GPU_POLICY_PURPOSE=official-optimization"
E3=research/vg-l0-risk-envelope-pilot/results/engineering/E3
```

## 1. Engineering gates (before the freeze; non-official except E6)

```bash
# E1
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7 > research/vg-l0-risk-envelope-pilot/results/engineering/E1/verify-acceptance.txt
# E4 (pilot tests; the code digest is written first)
# E3 (purpose parity-test; GPU non-official and CPU reference; D19 mini schedule; edge subjects on D21/D24)
GPU_POLICY_PURPOSE=parity-test $ENG mini --backend gpu --name gpu --a3
GPU_POLICY_PURPOSE=parity-test $ENG mini --backend cpu --name cpu --a3
GPU_POLICY_PURPOSE=parity-test $ENG mini --backend gpu --name gpu-stopped --stop-after 4000      # exit 75
GPU_POLICY_PURPOSE=parity-test $ENG mini --backend gpu --name gpu-stopped --resume
timeout -s KILL 25 env GPU_POLICY_PURPOSE=parity-test $ENG mini --backend gpu --name gpu-killed   # SIGKILL
GPU_POLICY_PURPOSE=parity-test $ENG mini --backend gpu --name gpu-killed --resume
GPU_POLICY_PURPOSE=parity-test $ENG compare gpu cpu --out $E3/compare-gpu-vs-cpu.json
GPU_POLICY_PURPOSE=parity-test $ENG compare gpu-stopped gpu --out $E3/compare-stopped-resumed-vs-gpu.json
GPU_POLICY_PURPOSE=parity-test $ENG compare gpu-killed gpu --out $E3/compare-killed-resumed-vs-gpu.json
GPU_POLICY_PURPOSE=parity-test $ENG a3check gpu --out $E3/a3check-gpu.json
GPU_POLICY_PURPOSE=parity-test $ENG a3check cpu --out $E3/a3check-cpu.json
GPU_POLICY_PURPOSE=parity-test $ENG edge --door D21 --out $E3/edge-D21.json
GPU_POLICY_PURPOSE=parity-test $ENG edge --door D24 --out $E3/edge-D24.json
GPU_POLICY_PURPOSE=parity-test $ENG identity gpu --out $E3/identity.json
GPU_POLICY_PURPOSE=parity-test $ENG summary --out $E3/summary.json
# commit the code and the documents; then E5 and E6 on the committed tree
npm run research-preflight -- --study research/vg-l0-risk-envelope-pilot > research/vg-l0-risk-envelope-pilot/results/engineering/E5/preflight.txt
GPU_POLICY_PURPOSE=official-optimization $N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/vg-l0-risk-envelope-pilot --door D21 > research/vg-l0-risk-envelope-pilot/results/engineering/E6/official-preflight-D21.txt
GPU_POLICY_PURPOSE=official-optimization $N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/vg-l0-risk-envelope-pilot --door D24 > research/vg-l0-risk-envelope-pilot/results/engineering/E6/official-preflight-D24.txt
# seal the gates, freeze, commit, push
$P $OFF gates
$P $OFF freeze
```

## 2. Official stages (sealed records; commit after each block)

| # | Unit / command | Job | Door | Record |
|---|---|---|---|---|
| 1 | `$L vgl0rep-C21-search-CTRL $LOG/C21-search-CTRL.log --wait -- $P $OFF search --cutoff C21 --arm CTRL` | `C21-search` (new) | D21 | `results/search/C21/CTRL.json` |
| 2 | `$L vgl0rep-C24-search-CTRL $LOG/C24-search-CTRL.log --wait -- $P $OFF search --cutoff C24 --arm CTRL` | `C24-search` (new) | D24 | `results/search/C24/CTRL.json` |
| 3 | `$P $OFF e2` → commit | — | — | `results/engineering/E2-ctrl-equals-assignment3.json` |
| 4 | `$L vgl0rep-C21-search-EXP $LOG/C21-search-EXP.log --wait -- $P $OFF search --cutoff C21 --arm EXP` | `C21-search` (resumed) | D21 | `results/search/C21/EXP.json` |
| 5 | `$L vgl0rep-C24-search-EXP $LOG/C24-search-EXP.log --wait -- $P $OFF search --cutoff C24 --arm EXP` → commit | `C24-search` (resumed) | D24 | `results/search/C24/EXP.json` |
| 6 | `$L vgl0rep-C21-qualify $LOG/C21-qualify.log --wait -- $P $OFF qualify --cutoff C21` | `C21-qualify` | D21 | `results/qualification/C21.json` |
| 7 | `$L vgl0rep-C24-qualify $LOG/C24-qualify.log --wait -- $P $OFF qualify --cutoff C24` | `C24-qualify` | D24 | `results/qualification/C24.json` |
| 8 | `$P $OFF e2-qualification --cutoff C21`; `… --cutoff C24` → commit | — | — | `results/engineering/E2-qualification-C2x.json` |
| 9 | `$P $OFF select --cutoff C21` → **commit** (and push) | — | — | `results/selection/C21.json` |
| 10 | `$L vgl0rep-C21-interval $LOG/C21-interval.log --wait -- $P $OFF interval --cutoff C21` → commit | `C21-slice` | D23 | `results/slices/C21-slice.json` |
| 11 | `$P $OFF select --cutoff C24` → **commit** | — | — | `results/selection/C24.json` |
| 12 | `$P $OFF freeze-selection` → **commit** → `$P $OFF authorize-full` → **commit and push** | — | — | `FROZEN_SELECTION.json`, `results/doors/FULL-authorization.json` |
| 13 | `$L vgl0rep-C24-validate $LOG/C24-validate.log --wait -- $P $OFF validate` → commit | `C24-validation` | FULL (once) | `results/slices/C24-validation.json` |

Resume of an interrupted official stage: the same command with `--resume` appended (the job's identity must match; the
official gate runs again and writes a new attestation; archived evaluations are read back).

## 3. Nonbinding diagnostics, report, handoff (after step 13)

```bash
GPU_POLICY_PURPOSE=diagnostic $DIAG all          # D1–D3, DD^L, interval-window PL/BD, scaling, gap/tail, occupancy (CPU)
$N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/vg-l0-risk-envelope-pilot/tables.ts
tools/vg-l0-risk-envelope-pilot/bundle.sh        # vg-l0-risk-envelope-pilot-results.zip + SHA-256 manifest, verified
```

## 4. Budget and resources

Deterministic bound 693,652 requested ≤ 700,000 (PROTOCOL §7). Expected: CTRL 133,802 requested (Assignment 3's sealed
lanes), EXP unknown (≈ 0.10–0.21 M), qualification ≤ 33,956, intervals ≤ 3,696. GPU (Phase 7's measured 4–8-lane rates
of ≈ 230–370 evaluations/s) ≈ 15–30 min in total; VRAM ≈ 5 GB per job; host ≈ 4 GB RSS. Timings select nothing.
