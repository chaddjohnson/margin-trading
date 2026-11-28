# RUN_COMMANDS — GPU Phase 9 (from the root of the checkout that holds the candidate)

The campaign ran in the Assignment 2 integration worktree `/home/chad/.local/share/margin-trading-worktrees/a2-integration`
(PROTOCOL.md AD10). Every Node process: `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node --no-maglev …`.

```bash
# the worktree's git-ignored inputs (data copies, cache links, sealed modes, Phase 7's export metadata)
bash docs/data-updates/2026-11-27-assignment-2/scripts/worktree-env.sh

# the integrity baseline (from Git objects of f2c414ef; once)
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase9/baseline.ts

# archives (read-only scratch restores, verified against docs/storage-cleanup/2026-11-21/ARCHIVE_MANIFEST.json)
python3 -I tools/gpu-phase9/restore-archives.py search-C21-broad1 search-C24-broad1
python3 -I tools/gpu-phase9/edge-subjects.py research/gpu-phase9/cache/restore/search-C21-broad1.sqlite D21
python3 -I tools/gpu-phase9/edge-subjects.py research/gpu-phase9/cache/restore/search-C24-broad1.sqlite D24

# the preflight of this study and the protocol freeze (once, on the committed tree)
GPU_POLICY_PURPOSE=diagnostic npm run research-preflight -- --study research/gpu-phase9
python3 -I tools/gpu-phase9/protocol-freeze.py

# the campaign (one chain, contained; resume with START=<step>)
tools/gpu-phase9/launch-slice.sh p9chain-final "$PWD/research/gpu-phase9/results/logs/final-chain.txt" -- /usr/bin/env START=1 /bin/bash research/gpu-phase9/chains/final.sh

# the acceptance record (only after the chain completed; ACCEPTED only if every gate passes)
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase9/accept.ts

# after the record: the independent verifier, the record-in-force tests, the live official gate on this study
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 <new record sha256>
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test src/gpu-backend/tests/policy.test.ts src/gpu-backend/tests/enforcement.test.ts src/research-standard/tests/preflight.test.ts
GPU_POLICY_PURPOSE=official-optimization node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/gpu-phase9 --door D24
```
