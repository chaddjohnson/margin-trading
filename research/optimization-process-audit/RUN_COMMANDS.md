# RUN_COMMANDS — optimization-process audit

From the repository root `/home/chad/projects/margin-trading`. Every substantive stage ran as a contained unit:
`bash research/optimization-process-audit/chains/unit.sh <unit> [--wait] <opa args…>` (opa.slice: MemoryHigh 44G,
MemoryMax 48G, MemorySwapMax 0). Sealed stages refuse to rerun; the commit after each guard record is required by the
next stage.

| Order | Command (opa args) | Unit | Output | Guard before it |
|---|---|---|---|---|
| 0 | `npm run research-preflight -- --study research/optimization-process-audit` | — | PASS | — |
| 0 | `npm run opa -- freeze` | — | `results/protocol-freeze.json` | committed before any rerun (`6933fbf5`) |
| 1 | `stage1 scan` | `opa-scan` | `.cache/optimization-process-audit/scan/<s>-<cut>.jsonl` (derived; hashes in SOURCE_MANIFEST) | freeze committed |
| 1 | `stage1 inventory` | `opa-s1a` | `results/stage1/inventory.json`, `SOURCE_MANIFEST.json` | freeze committed |
| 1 | `stage1 reproduce` | `opa-s1b` | `results/stage1/reproduction.json` | freeze committed |
| 1 | `stage1 g7` (amendment A1) | `opa-s1g7` | `results/stage1/g7-recheck.json` | reproduction committed |
| 1 | `stage1 mechanism` | `opa-s1c` | `results/stage1/mechanism.json` | parity (A1) committed |
| 3 | `stage3 pilot` (training door D19 only) | `opa-pilot` | `results/pilot/PILOT.json` (copied from the cache) | — |
| 2 | `stage2 freeze` | `opa-s2` | `results/stage2/POLICY_FREEZE.json` | mechanism committed; POLICIES.md written |
| 3 | `stage3 choices` | `opa-s3a` | `results/stage3/CHOICES.json` | policy freeze committed |
| 3 | `stage3 run` (576 next-slice runs; resumable from `.cache/optimization-process-audit/jobs/cohort-*`) | `opa-s3b` | `results/stage3/outcomes.json` | CHOICES committed |
| 3 | `stage3 analyse` (archive read-back only) | `opa-s3c` | `results/stage3/analysis.json` | outcomes committed |
| 4 | `stage4 freeze` | `opa-s4a` | `results/stage4/C24_FREEZE.json` (`futile: true`) | analysis committed |
| 4 | `stage4 validate` — **not run** (futility stop; the code refuses) | — | — | C24 freeze committed and not futile |

Checks and tables:

```
npm run opa -- verify
node --experimental-transform-types --disable-warning=ExperimentalWarning --test src/optimization-process-audit/tests/*.test.ts
node --experimental-transform-types --disable-warning=ExperimentalWarning tools/optimization-process-audit/tables.ts
npm run vg-exp -- verify && npm run gdxg -- verify      # the subjects' seals (read-only)
```

Full suite (contained; 1,405 tests, 1,394 pass, the 7 known pre-existing failures, 4 skipped):
`systemd-run --user --unit=opa-npm-test --slice=opa.slice … npm test` (log `results/logs/opa-npm-test.log`).
