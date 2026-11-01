# Run commands — Study 7

Every command runs from the repository root `/home/chad/projects/margin-trading` with Node v24.21.0
(`.node-version`; `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH` if needed).
`npm run study7 -- <command>` is `node --experimental-transform-types --disable-warning=ExperimentalWarning
--max-old-space-size=12288 src/study7-stability-first-d1/main.ts <command>`. Every stage writes a sealed, write-once
record (`{ …body, bodyHash }`, bodyHash = sha256 of the JSON body) and refuses to run again; every data access goes
through a door (`results/doors.jsonl`). Logs: `results/runlogs/<job>.txt`, last line `exit <code>`.

## Stages in order (all executed in this study; times UTC)

| # | Command | Writes | Executed |
|---:|---|---|---|
| 0 | `npm run study7 -- pilot` (pre-freeze; training ≤ 2021-12-31) | `results/pilot/pilot.json` | 2026-10-31 23:10–23:15Z |
| 1 | `npm run study7 -- freeze-protocol` | `results/protocol_freeze.json` | 23:42:49Z |
| 2 | `npm run study7 -- parity` | `results/parity/parity.json` (+ `parity/restart/`) | 23:45–23:50Z (second attempt; AMENDMENTS E1) |
| 3 | `research/study7-stability-first-d1/scripts/run_jobs.sh research/study7-stability-first-d1/scripts/jobs-phaseA.txt 12` (45 × `npm run study7 -- phase-a <config> <WDEV|W23|W29>`) | `results/phaseA/<config>-<window>.json`, `-points.jsonl.gz` | 23:50:19–23:53:56Z |
| 4 | `npm run study7 -- phase-a-freeze`, then a local commit | `results/phaseA/baseline_manifest.json` | 23:54:07Z; commit `e6aebab` |
| 5 | `research/study7-stability-first-d1/scripts/run_jobs.sh research/study7-stability-first-d1/scripts/jobs-phaseB.txt 14` (18 × `npm run study7 -- search <track> <fold>`) | `results/phaseB/<track>/<fold>/search.json`, `-archive.csv.gz` | 23:54:28Z → 01:13:41Z (18/18 exit 0) |
| 6 | `npm run study7 -- v-trigger` (prints the §9.5 trigger; VC searches iff fired) | — | 00:46Z: **not fired** (no VC jobs) |
| 7 | `research/study7-stability-first-d1/scripts/run_jobs.sh research/study7-stability-first-d1/scripts/jobs-phaseD.txt 14` (`npm run study7 -- validate <track> <fold>`) | `results/phaseD/<track>/<fold>/validation.json` | 01:14:44Z → 01:23:42Z (16/16) |
| 8 | `npm run study7 -- freeze-selection` | `FROZEN_SELECTION.json` | 01:24:05Z |
| 9 | `npm run study7 -- final`, then `npm run study7 -- final --confirm` | `results/final/final.json`, `confirmation.json`, `-lots.jsonl.gz` | 01:24:33Z → 01:34:59Z; confirm → 01:44:50Z (identical) |
| 10 | `npm run study7 -- research-configs` | `config/research-pools/study7-stability-first-d1/*.json` (44), `config/research-phenotypes/study7-stability-first-d1/D1/*.json` (4) | 01:45:11Z |
| 11 | `python3 research/study7-stability-first-d1/scripts/build_tables.py phaseB phaseD selection final phaseA` | `results/tables/*.md` | after 9 (phaseA only after the selection freeze) |

## Resuming after an interruption

1. `ps aux | grep "study7-stability-first-d1/main.ts"` — never start a second copy of a live job.
2. Re-run the same orchestrator command: jobs whose log ends `exit 0` are skipped; an interrupted search resumes from
   its persistent cache (`results/cache/search-<track>-<fold>.jsonl`) and reproduces the identical trajectory and
   sealed output (parity D1 proves this); an interrupted validation resumes from `results/cache/validate-*.jsonl`.
3. A stage whose sealed record exists refuses to run again; a sealed record is never deleted or regenerated.

## Tests and checks

- `node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/study7-stability-first-d1/tests/study7.test.ts`
- `npx tsc --noEmit -p .`
- Research pools: `npm run study7 -- pool fixed <ID> [--end YYYY-MM-DD] [--cost-bps N] [--out DIR]` runs a research
  configuration through the unchanged pools engine (research only).
