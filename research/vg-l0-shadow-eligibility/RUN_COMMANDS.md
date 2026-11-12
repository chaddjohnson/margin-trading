# Run commands — vg-l0-shadow-eligibility

From the repository root (`/home/chad/projects/margin-trading`), Node 24.21.0. Every heavy stage runs in a transient
systemd user unit inside `vgl0se.slice` (MemoryHigh 44G, MemoryMax 48G, MemorySwapMax 0) via `launch`.

```
npm run research-preflight -- --study research/vg-l0-shadow-eligibility
npm run vg-l0se -- doors
npm run vg-l0se -- verify                       # every sealed record against results/seals.jsonl

# engineering (before the freeze)
npm run vg-l0se -- launch --unit vgl0se-bench-w14 --wait -- bench --door D24 --centres 96 --workers 14 --label w14-strata --warm 2 --sh strata
bash research/vg-l0-shadow-eligibility/chains/pilot.sh          # pilot (P18; cache only) + interruption tests
npm run vg-l0se -- control-manifest                            # CONTROL_MANIFEST.json (sealed)
npm run vg-l0se -- launch --unit vgl0se-parity --wait -- parity # stage V (sealed results/parity/parity.json)
npm run vg-l0se -- freeze-protocol                             # results/protocol-freeze.json (sealed)

# the study chain (fail-fast; commits each sealed block; resumable: bash chain1.sh <step id>)
bash research/vg-l0-shadow-eligibility/chains/chain1.sh

# single stages (as the chain runs them)
npm run vg-l0se -- launch --unit vgl0se-phase2 --wait -- phase2
npm run vg-l0se -- launch --unit vgl0se-C19-search-B1 --wait -- search --cutoff C19 --track B1
npm run vg-l0se -- launch --unit vgl0se-C19-qualify-B1 --wait -- qualify --cutoff C19 --track B1
npm run vg-l0se -- launch --unit vgl0se-C19-search-B2-d1 --wait -- search --cutoff C19 --track B2 --step d1
npm run vg-l0se -- launch --unit vgl0se-C19-qualify-B2-d1 --wait -- qualify --cutoff C19 --track B2 --step d1
npm run vg-l0se -- launch --unit vgl0se-C19-search-B2-g --wait -- search --cutoff C19 --track B2 --step g
npm run vg-l0se -- launch --unit vgl0se-C19-qualify-B2-g --wait -- qualify --cutoff C19 --track B2 --step g
npm run vg-l0se -- launch --unit vgl0se-C19-fold --wait -- fold-eval --cutoff C19
npm run vg-l0se -- launch --unit vgl0se-sequential --wait -- sequential
npm run vg-l0se -- launch --unit vgl0se-C24-search-A1 --wait -- search --cutoff C24 --track A1
npm run vg-l0se -- launch --unit vgl0se-C24-controls --wait -- qualify-controls --cutoff C24
npm run vg-l0se -- launch --unit vgl0se-C24-final --wait -- final-select --cutoff C24
npm run vg-l0se -- launch --unit vgl0se-C24-ablation --wait -- ablation --cutoff C24
npm run vg-l0se -- launch --unit vgl0se-diagnostics --wait -- diagnostics
npm run vg-l0se -- launch --unit vgl0se-freeze-selection --wait -- freeze-selection
npm run vg-l0se -- launch --unit vgl0se-validate --wait -- validate   # FULL, once

# tests (focused; the full suite only after the validation: it reads whole data files)
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/vg-l0-shadow-eligibility/tests/*.test.ts
```

Logs: study units `results/logs/<unit>.log` (git-ignored), engineering units `.cache/vg-l0-shadow-eligibility/logs/`;
job archives `.cache/vg-l0-shadow-eligibility/jobs/<job>/archive.sqlite` (local, git-ignored); progress
`.cache/vg-l0-shadow-eligibility/jobs/<job>/progress.json`.
