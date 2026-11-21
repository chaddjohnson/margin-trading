# RUN_COMMANDS — GPU Phase 7 (from the repository root `/home/chad/projects/margin-trading`)

Every Node process: `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node --no-maglev …`.

```bash
# archives (read-only scratch restores, verified against docs/storage-cleanup/2026-11-21/ARCHIVE_MANIFEST.json)
python3 -I tools/gpu-phase7/restore-archives.py search-C21-broad1 search-C24-broad1
python3 -I tools/gpu-phase7/edge-subjects.py research/gpu-phase7/cache/restore/search-C21-broad1.sqlite D21
python3 -I tools/gpu-phase7/edge-subjects.py research/gpu-phase7/cache/restore/search-C24-broad1.sqlite D24

# the campaign (one chain, contained; resume with START=<step>)
tools/gpu-phase7/launch-slice.sh p7chain-final /home/chad/projects/margin-trading/research/gpu-phase7/results/logs/final-chain.txt -- /usr/bin/env START=1 /bin/bash research/gpu-phase7/chains/final.sh

# the acceptance record (only after the chain completed; ACCEPTED only if every gate passes)
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase7/accept.ts

# after the record: the independent verifier, the record-in-force tests, the live official gate on this study
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 <new record sha256>
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test src/gpu-backend/tests/policy.test.ts src/gpu-backend/tests/enforcement.test.ts
GPU_POLICY_PURPOSE=official-optimization node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/gpu-phase7 --door D24
```
