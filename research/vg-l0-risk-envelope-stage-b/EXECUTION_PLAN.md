# Execution plan — Stage B RES-B 1.0.0

Every command runs from the repository root `/home/chad/projects/margin-trading`. Every evaluating process runs
`node --no-maglev` as a transient systemd unit in `vgl0reb.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0), one GPU job at
a time. Each official stage refuses to start unless its guards hold (PROTOCOL.md §11). Times are UTC.

```bash
R=/home/chad/projects/margin-trading
N=/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node
F="--no-maglev --expose-gc --experimental-transform-types --disable-warning=ExperimentalWarning --max-old-space-size=12288"
OFF="$N $F src/gpu-backend/officialRunner.ts research/vg-l0-risk-envelope-stage-b src/vg-l0-risk-envelope-stage-b/main.ts"   # = npm run vg-l0reb --
ENG="$N $F src/gpu-backend/legacyRunner.ts vg-l0reb-eng tools/vg-l0-risk-envelope-stage-b/engineering.ts"                    # = npm run vg-l0reb-eng --
L=$R/tools/vg-l0-risk-envelope-stage-b/launch.sh
LOG=$R/research/vg-l0-risk-envelope-stage-b/results/logs
P="/usr/bin/env GPU_POLICY_PURPOSE=official-optimization"
```

## 0. Preregistration (done: commit `59493083`, pushed)

PROTOCOL.md, AMENDMENTS.md, STANDARD_ADOPTION.json, SEED_BUDGET_MATRIX.json, brief/BRIEF.md.

## 1. Engineering gates (before the freeze; non-official except E6)

```bash
# E1 — the acceptance verifier and the runtime refusals
$L vgl0reb-e1 $LOG/e1.log -- /bin/bash $R/research/vg-l0-risk-envelope-stage-b/chains/e1.sh
# E3 edge subjects (read-only from Stage A's replayed pilot populations)
python3 -I tools/vg-l0-risk-envelope-stage-b/edge-subjects.py
# E4 (tests, with the code digest) and E3 (mini-pilot GPU / CPU / stopped / killed, comparisons, A3 check, edges, identity)
$L vgl0reb-eng $LOG/engineering-chain.log -- /bin/bash $R/research/vg-l0-risk-envelope-stage-b/chains/engineering.sh
# commit the code, the tools and the documents; then E5 and E6 on the committed tree
npm run --silent research-preflight -- --study research/vg-l0-risk-envelope-stage-b > research/vg-l0-risk-envelope-stage-b/results/engineering/E5/preflight.txt
for D in D19 D21 D24; do GPU_POLICY_PURPOSE=official-optimization $N --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/vg-l0-risk-envelope-stage-b --door $D > research/vg-l0-risk-envelope-stage-b/results/engineering/E6/official-preflight-$D.txt; done
# seal the gates, freeze, commit, push
$P $OFF gates
$P $OFF freeze
```

## 2. Official folds (strictly C19 → C21 → C24; each a fail-fast chain that commits each sealed block)

```bash
$L vgl0reb-fold-C19 $LOG/fold-C19.log -- /usr/bin/env CUT=C19 /bin/bash $R/research/vg-l0-risk-envelope-stage-b/chains/fold.sh
# push; then
$L vgl0reb-fold-C21 $LOG/fold-C21.log -- /usr/bin/env CUT=C21 /bin/bash $R/research/vg-l0-risk-envelope-stage-b/chains/fold.sh
# push; then
$L vgl0reb-fold-C24 $LOG/fold-C24.log -- /usr/bin/env CUT=C24 /bin/bash $R/research/vg-l0-risk-envelope-stage-b/chains/fold.sh
```

| Step | Command (in `chains/fold.sh`) | Job | Door | Sealed record |
|---|---|---|---|---|
| 1 | `repro --cutoff C` | `C-repro` | training | `results/repro/C.json` |
| 2 | `e2 --cutoff C`, then commit | — | — | `results/engineering/E2-C.json` |
| 3 | `search --cutoff C`, then commit. The launch rule (PROTOCOL §13) is enforced in code | `C-search` | training | `results/search/C.json` |
| 4 | `qualify --cutoff C`, then commit | `C-qualify` | training | `results/qualification/C.json` |
| 5 | `select --cutoff C`, then **commit** | — | — | `results/selection/C.json` |
| 6 (C19, C21) | `interval --cutoff C`, then commit | `C-interval` | D21 / D23 | `results/intervals/C.json` |
| 6–8 (C24) | `freeze-selection`, then commit; `authorize-full`, then commit; `validate`, then commit | `C24-validation` | FULL (once) | `FROZEN_SELECTION.json`, `results/doors/FULL-authorization.json`, `results/intervals/C24.json` |

The training doors are D19 for C19, D21 for C21 and D24 for C24.

**Resume.** Resume an interrupted official stage with `START=<step> RESUME=1`. The job must keep its identity, the
official gate runs again and writes a new attestation, and archived evaluations are read back. Sealed stages refuse to
rerun.

**Blinded monitoring.** While a stage runs, read only the unit state, the progress lines (counts, stage names),
`telemetry.jsonl` (evaluations/s, VRAM) and errors. Profitability is never read while a stage runs.

## 3. After the official folds (no evaluation, except report-only CPU diagnostics)

```bash
GPU_POLICY_PURPOSE=diagnostic npm run vg-l0reb-tools -- all     # analysis + tables from the sealed records
# regression (npm test, preflights --all, Strategy Lab parity), reports, bundle
```
