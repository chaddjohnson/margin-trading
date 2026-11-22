# RESEARCH_RECOVERY — GPU Phase 7: risk-envelope delivery, acceptance renewal and pilot readiness (COMPLETE)

**Top screen (times from `date -u`)**

- Updated: 2026-11-22T00:48:34Z (clock). **COMPLETE.** Readiness package delivered; **PILOT NOT STARTED** (never to be started by this
  task, brief §12). Follow-up gate: the user's review of the package in the original conversation and a separate
  authorization of the pilot (decision register D-0 … D-14; D-14 = merge into `main` or run from this branch).
- Branch `research/gpu-phase7-risk-envelope-readiness` (from `cleanup/storage-2026-11-21` `d89b9dec` = `main` `3606f4b3`
  + 2 docs-only commits). Main checkout, no extra worktree. Not merged; `main` untouched. Final commit and push
  verification: §Delivery below.
- Acceptance record **ACCEPTED** on this branch: `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7`
  (study research/gpu-phase7, commit `1f2b9700`, source revision `999f299e`, binary gb7 `cb2ff30b…`, evaluation digest
  `d1a2e490…`, supersedes Phase 6 `3610caaf…`, which `main` keeps). Out-of-band pin
  `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase7-bb0e3fcf.json` (0444) + `pins.jsonl` line.
- Running: nothing (`systemctl --user list-units 'gpup7*' 'p7chain*'` shows only the slice).
- Next authorised step: none for this task. Do not rerun the campaign, the generator or the benchmark.
- Protocol `PROTOCOL.md` sha256 `6960758831c0…` (frozen: `results/protocol-freeze.json` `c20ba253…`, sealed);
  amendments head **A2** (D0, D1, A1, A2). Brief `brief/BRIEF.md` sha256 `dfc11ac0…aecbff90f2` (633 lines, verbatim).

## Deliverables (brief §11) — sha256 in `READINESS_MANIFEST.json` (`deliverables`, `support`)

| | File |
|---|---|
| A | `research/gpu-phase7/PREREQUISITES_READY.md` |
| B | `research/gpu-phase7/RISK_METRIC_INTEGRATION_SPEC.md` |
| C | `research/gpu-phase7/PARITY_REPORT.md` |
| D | `research/gpu-phase7/ACCEPTANCE_EVIDENCE.md` |
| E | `research/vg-l0-risk-envelope-pilot/PROTOCOL_PROPOSED.md` (+ DECISION_REGISTER, DIAGNOSTICS_SPEC, SCALING_CHECKS, IMPLEMENTATION_PLAN) |
| F | `research/gpu-phase7/RESTORATION_REPORT.md` |
| G | `research/vg-l0-risk-envelope-pilot/EXECUTION_PLAN.md` (do not execute) |
| H | `research/gpu-phase7/READINESS_MANIFEST.json` (`pilot.executionAuthorized: false`) |
| I | `research/gpu-phase7/bundle/gpu-phase7-risk-envelope-readiness.zip` + copy `~/.local/share/margin-trading-gpu/handoffs/` |

## Stage table

| Stage | Status | Command / record | Time (UTC) | Resume / guard |
|---|---|---|---|---|
| Phase A baseline | complete | `results/baseline/*` | 2026-11-21T19:50Z | do not rerun |
| Archive restore (2 of 14, scratch) | complete; scratch **deleted** 2026-11-22T00:47:30Z | `results/restore/restore-record.json` | 20:02Z | re-creatable: `python3 -I tools/gpu-phase7/restore-archives.py search-C21-broad1 search-C24-broad1` |
| Integration (Phase B) | complete | commit `3715e97f` | — | — |
| Protocol freeze | complete | `results/protocol-freeze.json` (sealed) | 20:18:24Z | sealed |
| Scaling (Phase E, diagnostic) | complete, PASS | `results/scaling/scaling-D24.json` `450e0193…`, `-D21.json` `6bd4fb0d…` | 20:27Z | A1 |
| Campaign `chains/final.sh` | complete | `results/logs/final-chain.txt` (ignored), records under `results/` | 20:23:21Z → 00:13:29Z (resume at step 26, D1) | do not rerun (jobs refuse: JOB_EXISTS) |
| Integrity rerun (A2) | complete 5/5 | `results/integrity/integrity.json` | 00:14Z | — |
| Generator | ACCEPTED | `tools/gpu-phase7/accept.ts` → record (commit `1f2b9700`) | 00:16:00Z | never rerun (would supersede) |
| Post-record checks | complete | `results/post-record/` (verifier VERIFIED, 16/16 tests, GATE OPEN D24) | 00:16Z | — |
| Pilot-shaped benchmark | complete | `chains/bench.sh`, `results/bench/benchmark.json` | 00:17:28Z → 00:45:13Z | non-official; do not rerun |
| Readiness package | complete | deliverables above | — | — |

## Key results

- Parity 54 runs 144,795/144,795 identical (64,033 envelopes); finalists 96/96, sealed 48/48; risk-delivery R1–R3 0
  differing (4 runs, 12,384 items; 1,000/1,000 archived A3 records per door reproduced); A3 replay with the envelope =
  sealed; A4 9/9; Q1 61,498/61,498; sanitizer 0 errors; negative 73/73; tamper 23/23; reliability 2 × 32 min 0 mismatches;
  npm test 0 unexpected (1,737 tests; 7 known + 2 record-in-force before the record); Strategy Lab, portfolio parity pass.
- Benchmark (8-lane risk jobs): C21 138,316 in 377.2 s (367/s), C24 104,431 in 459.7 s (227/s), concurrent pair 796.4 s;
  lanes = sealed; pilot ≈ 16–23 min GPU expected, ≈ 42 min worst.
- New L0 (D24) $382,721.46 / DD $19,459.83 / PL liq $8,092.81 / BD liq $10,383.82; N/original $388,031.02.

## Environment

| Item | Value |
|---|---|
| Node / V8 | v24.21.0 / 13.6.233.17; every evaluating process `node --no-maglev` |
| CUDA / driver | user-space toolkit 13.2 (V13.2.86) / 595.91.07 |
| GPU | RTX 5090 `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4` |
| Data | GDX `77dba9b21c4b6849…`, VGT `2ee06310f2fa8926…` (Priority 3 pins) |
| Disk | free 624,348,323,840 B after the task; git-ignored study state `cache/` 27.6 GB, `results/raw-large/` 2.2 GB, `build/` 26 MB |

## Guards

- Do not run an official optimization; the pilot needs the user's authorization (EXECUTION_PLAN is a proposal).
- Do not rerun the campaign, the generator or the benchmark; do not edit sealed records (`results/seals.jsonl`).
- Never merge into `main` or force-push without authorization (INTEGRATION_PLAN).

## Disclosures

AMENDMENTS D0 and D1 (dev artefacts; the step-26 dirty-tree refusal and resume), A1 (scaling criterion, diagnostic), A2
(integrity sub-check scope; only `integrity.ts` rerun). A context compaction occurred while the campaign ran (before 23:25:52Z, when the step-26 FAILED line was read): the
checkpoint, the chain log and units were inspected before the resume; no process was duplicated.

## Delivery

(filled after the push)
