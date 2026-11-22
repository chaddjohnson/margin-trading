# GPU acceptance evidence — GPU Phase 7 (deliverable D)

## 1. Status

**ACCEPTED** — `config/gpu-backend/acceptance.json` (schema 2), study `research/gpu-phase7`, accepted
2026-11-22T00:16:00.494Z by `tools/gpu-phase7/accept.ts`; every gate passed, blockers `[]`.

| Item | Value |
|---|---|
| Record sha256 | `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` |
| Acceptance commit (record committed) | `1f2b97002dd1ef83dceab0eac1133d6513cc0663` |
| Source revision (evidence and pinned files) | `999f299e50696953006dfc6ea0c06ffa410ca303`, tree `d131c179f84e…`, branch `research/gpu-phase7-risk-envelope-readiness` |
| Supersedes | research/gpu-phase6 record `3610caaf0bfc14ecd5ea75981a69f9316ff9ff6b610d4913b949d36950c884d3` (copy `results/superseded/acceptance-gpu-phase6.json`, same sha256) |
| Scope | **this branch only.** `main` (`3606f4b3`) keeps the Phase 6 record, which stays valid for `main`'s tree; nothing merged (INTEGRATION_PLAN.md) |
| Standard | optimization standard 3.0.0, sha256 `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1` (unchanged) |
| Re-acceptance type | full §2 cycle (docs/gpu/PARITY_CHECKLIST.md §2): a host-path file of the evaluation manifest changed |

## 2. Source and binary hashes

| Group | Files | Digest (Phase 7) | Phase 6 | Changed files |
|---|---:|---|---|---|
| CPU closure | 94 | `c8a9f416e25b393a…` | same | none |
| CUDA sources | 7 | `d88990612c5cd6d7…` | same | none |
| host path | 12 | `bfdcdfbb498f2441…` | `53671a6c07c486fb…` | `src/gpu-backend/pool.ts`, `src/gpu-backend/toolchain.ts` |
| **evaluation digest** (compiled into the binary) | — | `d1a2e490788fa5fa76a277719dfb623c2cc896de85cf95f739c3e3af184e233b` | `3a6eacde…` | (follows the host group) |
| enforcement (policy) group | 29 | `1bdcba9cd063c3f8…` | — | `src/gpu-backend/lab.ts`, `src/gpu-backend/entrypoints.ts`, `config/gpu-backend/entrypoints.json`, `src/gpu-backend/tests/hostPipeline.test.ts`, the generator `tools/gpu-phase7/accept.ts` |

| Binary | sha256 | Note |
|---|---|---|
| `research/gpu-phase7/build/gb7` (accepted) | `cb2ff30b9cb720c01d69e5195a8add9bcf37eb31f7ab85625a3d1a5c02c56a82` | built twice from the pinned sources, byte-identical (reproducible); device code and SASS byte-identical to gb5 (gate B1, `results/final-binary.json`) |
| `research/gpu-phase5/build/gb5` (Phase 6 record) | `f444c521…` | unchanged; still the binary of `main`'s record |

## 3. Environment

| Item | Value |
|---|---|
| Host | Apollo (main checkout `/home/chad/projects/margin-trading`, no extra worktree) |
| GPU | NVIDIA GeForce RTX 5090, `GPU-ae5f222c-8bf8-6bf0-db01-db53dc9229f4`, compute capability 12.0, driver 595.91.07 |
| CUDA | user-space toolkit 13.2 (V13.2.86), `--fmad=false`, stripped reproducible build |
| Node / V8 | v24.21.0 / 13.6.233.17-node.53; **Maglev disabled** (`--no-maglev` required and enforced by `src/gpu-backend/runtime.ts`) |
| Capabilities / domain | `fffffffff` / `dffffffff` — Assignment 3 genome ∪ risk-envelope pilot domain (NL0 controls grid); the risk-envelope inputs delivered through EvalLab items with `risk: true` |
| Host path | 8 worker threads by default; serial (0) and parallel modes verified identical |
| Containment | every campaign step in `gpup7.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0); highest unit peak 29.7 GB (a parity-campaign run, GPU + CPU reference), 0 swap anywhere |

## 4. External pin verification

| Check | Result | Record |
|---|---|---|
| Out-of-band pin | `~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase7-bb0e3fcf.json` (0444, sha256 = record) + a line in `pins.jsonl`; earlier pins (Phase 3, 5, 6) kept | — |
| Independent verifier `tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf…` (no TypeScript validator) | **VERIFIED** (19 PASS: pin, schema, status, every group's files and digests, evaluation digest recomputed, 42 evidence files intact, source revision ancestor of HEAD, pinned files committed and unchanged, binary sha256, reproducible rebuild, device) | `results/post-record/verify-acceptance.txt` |
| Record-in-force tests (`src/gpu-backend/tests/policy.test.ts`, `enforcement.test.ts`) | 16/16 pass (incl. the MERGE GATE) | `results/post-record/record-in-force-tests.txt` |
| Live official gate (`GPU_POLICY_PURPOSE=official-optimization tools/gpu-backend/official-preflight.ts --study research/gpu-phase7 --door D24`) | **GATE OPEN**: binary, compat `d1a2e490…` = server = tree, device, no test hooks, 35 reachable features implemented, smoke = CPU expectation, VRAM, 8 host workers, 18/18 parity subjects identical. A preflight job only — no optimization | `results/post-record/official-preflight-D24.txt`, attestation `results/gpu-attestations/preflight-20261122T001637Z-e0faac-…json` |
| Source-tamper suite (sandbox clone, out-of-band pin) | 23/23 cases refused as required (T21–T23 = risk-delivery tampering) | `results/policy/tamper-final.json` |

## 5. Executed acceptance commands (repository root; exact text in `RUN_COMMANDS.md`)

```bash
tools/gpu-phase7/launch-slice.sh p7chain-final /home/chad/projects/margin-trading/research/gpu-phase7/results/logs/final-chain.txt -- /usr/bin/env START=1 /bin/bash research/gpu-phase7/chains/final.sh    # 2026-11-21T20:23:21Z
tools/gpu-phase7/launch-slice.sh p7chain-final /home/chad/projects/margin-trading/research/gpu-phase7/results/logs/final-chain.txt -- /usr/bin/env START=26 /bin/bash research/gpu-phase7/chains/final.sh   # resume 23:26:09Z (AMENDMENTS D1); complete 2026-11-22T00:13:29Z
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase7/integrity.ts --out research/gpu-phase7/results/integrity/integrity.json   # rerun after AMENDMENTS A2: 5/5
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-phase7/accept.ts                                        # ACCEPTED 00:16:00Z
tools/gpu-backend/verify-acceptance.sh --rebuild --device --expect-record-sha256 bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7      # VERIFIED
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test src/gpu-backend/tests/policy.test.ts src/gpu-backend/tests/enforcement.test.ts   # 16/16
GPU_POLICY_PURPOSE=official-optimization node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning tools/gpu-backend/official-preflight.ts --study research/gpu-phase7 --door D24   # GATE OPEN
```

## 6. Gate summary (each recorded in the record's `evidence[]`)

| Gate | Result |
|---|---|
| S0–S2 | superseded record = Phase 6's; evaluation change exactly the declared one; 11 carried entries with their unchanged-file conditions |
| A0 | every evidence process under `--no-maglev` |
| B1 | gb7 reproducible; kernels = gb5 |
| A1 | 54 runs, 144,795/144,795 identical, 64,033 envelopes compared (PARITY_REPORT §1) |
| A2 | 48 sealed finalists: CPU = GPU = sealed |
| R1–R3 (×4) | 0 differing values, records unchanged by the request, = Assignment 3's archive (1,000/1,000 per door), identical decisions and rankings |
| A3 (×3) | A3 C19 broad1 replay plain and with the envelope = sealed; A2 C19 base = sealed |
| A4 (×9) | CPU = GPU; 0/1/8 host workers; stop/kill + resume; risk CPU = GPU; risk = plain; concurrent pair |
| Q1 | 61,498 assessments identical |
| A5 | sanitizer 0 errors / 0 hazards / 0 leaks |
| A6 (×2) | two processes × 32 min (23:29:55Z → 00:02:13Z): 1,572,864 evaluations each, parity samples 2,304 + 2,304 (0 mismatches, envelopes included), repeat 3 + 3 checks (0 mismatches), peak 59 °C, 258 W, 14.0 GB VRAM, 7.8 GB RSS |
| E3 | negative suite 73/73 (gate 19, job 11, runtime 21, risk 6, cli 5, engine 11) |
| E4 | tamper 23/23 |
| E7 | Strategy Lab portfolio parity: ALL VERIFIED (five frozen pooled candidates incl. New L0) |
| E8 | `npm test`: 1,737 tests, 1,724 pass, 9 fail = 7 known pre-existing + 2 record-in-force tests before the new record (pass after it: §4), 0 unexpected, 4 skipped; root tsc 0 errors |
| E9 | Strategy Lab: typecheck, lint, Vitest 314/314, build, Playwright 81/81; state unchanged, live dist untouched |
| E10 | integrity 5/5 (after AMENDMENTS A2) |
| P1, P5 | policy text unchanged; policy/enforcement/layout/host-pipeline/dataset/jobs/risk-envelope tests |

## 7. Disclosures

- AMENDMENTS D0, D1: development runs before the freeze (not evidence); the step-26 dirty-tree refusal and resume.
- AMENDMENTS A1: the scaling check's criterion (diagnostic, not an acceptance gate).
- AMENDMENTS A2: the integrity check's sealed-file sub-check compared totals that necessarily included this study's own
  new seals; corrected to compare every other study's seals with the baseline exactly; only `integrity.ts` was rerun.
  The first run's output is kept (`results/integrity/integrity-run1-superseded.json`).

## 8. Evidence files (the record's `evidence[]`, 42 entries)

| Evidence | Path | sha256 | Result |
|---|---|---|---|
| [carried from research/gpu-phase5 via gpu-phase6] R1 the defect reproduces with the default engine (the record stress: wrong evaluations, record-only ones among them, against a ground truth equal to Phase 4's diagnostics) | `research/gpu-phase5/results/rootcause/record-stress-truth-default.json` | `52086bcbeb023267…` | PASS |
| [carried from research/gpu-phase5 via gpu-phase6] R1 the same stress without Maglev: zero wrong evaluations | `research/gpu-phase5/results/rootcause/record-stress-truth-no-maglev.json` | `dde5422b7a1431cd…` | PASS |
| [carried from research/gpu-phase5 via gpu-phase6] R2 the fresh-context loop on the final candidate, fixed configuration (≥ 2,000 fresh CPU workers on the original first chunks, ≥ 150 fresh GPU contexts on the original batch; zero mismatches; the device response identical in every cycle) | `research/gpu-phase5/results/rootcause/fresh-loop-final/summary.json` | `44a1d3c5bd580432…` | PASS |
| [carried from research/gpu-phase5 via gpu-phase6] R2 the fresh-context loop's configuration record | `research/gpu-phase5/results/rootcause/fresh-loop-final/config.json` | `dc82adb9ec39e912…` | PASS |
| [carried from research/gpu-phase5 via gpu-phase6] R3 the host-path cold soak on the final candidate, fixed configuration (fresh host pipelines decoding one real device response of the original batch; zero mismatches) | `research/gpu-phase5/results/rootcause/host-soak-final.json` | `a7282aca0bbc0885…` | PASS |
| [carried from research/gpu-phase5 via gpu-phase6] A2 offline codec and host-pipeline equivalence (Phase 3 captures of real Phase 2 batches) | `research/gpu-phase5/results/final/offline-check.json` | `b81b9e81e74ec60f…` | PASS |
| [carried from research/gpu-phase5 via gpu-phase6] A10 atomic dataset export: the 4 × 25 shared-directory race on the final binary (100 of 100 loads verified, no partial read) | `research/gpu-phase5/results/final/race-d19-atomic.json` | `ba5dcd09b3d9783d…` | PASS |
| [carried from research/gpu-phase5 via gpu-phase6] A10 atomic dataset export: writers killed at random instants (no partial target; every directory complete after a restart) | `research/gpu-phase5/results/cache/kill-d19.json` | `94a05e10b8d07e9d…` | PASS |
| [carried from research/gpu-phase5 via gpu-phase6] A10 atomic dataset export: two datasets under one name at the same instant (one published, explicit conflicts) | `research/gpu-phase5/results/final/conflict.json` | `5d9807476a4d72a8…` | PASS |
| [carried from research/gpu-phase5 via gpu-phase6] A10 atomic dataset export: byte identity with the previous exporter on every door, window, episode and fixture | `research/gpu-phase5/results/cache/dataset-identity.json` | `a02c39a0f58de38f…` | PASS |
| [carried from research/gpu-phase6] E2 job isolation under concurrency: identities, ownership, namespaces, ledgers, datasets, refusals, kill/stop + resume, process audit | `research/gpu-phase6/results/campaign/summary.json` | `04148b5212a6c4bb…` | PASS |
| B1 final binary gb7 (reproducible; built from this tree; device code and SASS byte-identical to the accepted gb5) | `research/gpu-phase7/results/final-binary.json` | `aa42402d5ee2e7b5…` | PASS |
| A1 parity campaign through the final host path (every door and option set, ≥ 100,000 seeded random genomes, fixtures, determinism; zero mismatches) | `research/gpu-phase7/results/parity/final/SUMMARY.json` | `35e3c4a235190cb8…` | PASS |
| A2 Assignment 3 sealed finalists on D24: CPU reference (no Maglev) = GPU = sealed C24 figures | `research/gpu-phase7/results/parity/finalists.json` | `9aa198aeb141f971…` | PASS |
| R1–R3 risk-delivery parity edge-D21: delivered values GPU = CPU, records unchanged by the request and = Assignment 3’s archived records, both policies' decisions and rankings identical | `research/gpu-phase7/results/risk-parity/edge-D21.json` | `d3ca8add93292b61…` | PASS |
| R1–R3 risk-delivery parity edge-D24: delivered values GPU = CPU, records unchanged by the request and = Assignment 3’s archived records, both policies' decisions and rankings identical | `research/gpu-phase7/results/risk-parity/edge-D24.json` | `fb0ae3d036aaf463…` | PASS |
| R1–R3 risk-delivery parity finalists-D24: delivered values GPU = CPU, records unchanged by the request, both policies' decisions and rankings identical | `research/gpu-phase7/results/risk-parity/finalists-D24.json` | `3daed68725163263…` | PASS |
| R1–R3 risk-delivery parity random-D19: delivered values GPU = CPU, records unchanged by the request, both policies' decisions and rankings identical | `research/gpu-phase7/results/risk-parity/random-D19.json` | `82a6f7d4c3c8481e…` | PASS |
| A3 Assignment 3 C19 broad1 search replay = sealed record (final binary, host path) | `research/gpu-phase7/results/compare/a3-plain-vs-sealed.json` | `f47f4cde9bdcf94f…` | PASS |
| A3 Assignment 3 C19 broad1 search replay WITH the risk envelope requested = sealed record (envelopes stripped; every decision identical) | `research/gpu-phase7/results/compare/a3-risk-vs-sealed.json` | `6a39bb140b421ec4…` | PASS |
| A3 Assignment 2 C19 base search replay = sealed record (Growth fixed; final binary, host path) | `research/gpu-phase7/results/compare/a2-plain-vs-sealed.json` | `466e07e02e2d2403…` | PASS |
| A4 mini-optimization CPU = GPU (final binary, host path) | `research/gpu-phase7/results/compare/mini-gpu-vs-cpu.json` | `35d6418509d46e5e…` | PASS |
| A4 mini-optimization host workers 1 = 8 | `research/gpu-phase7/results/compare/mini-w1-vs-w8.json` | `b01e5ede9d3c5bdd…` | PASS |
| A4 mini-optimization serial path (host workers 0) = 8 | `research/gpu-phase7/results/compare/mini-w0-vs-w8.json` | `781c2d35ef8aa7b0…` | PASS |
| A4 mini-optimization stopped (exit 75) + resumed = uninterrupted | `research/gpu-phase7/results/compare/mini-stopped-resumed-vs-ref.json` | `f99311bc0e0d7ff2…` | PASS |
| A4 mini-optimization SIGKILLed + resumed = uninterrupted | `research/gpu-phase7/results/compare/mini-killed-resumed-vs-ref.json` | `6fe6e5de97a70ee8…` | PASS |
| A4 mini-optimization with the risk envelope requested: CPU = GPU (every record and envelope) | `research/gpu-phase7/results/compare/mini-risk-gpu-vs-cpu.json` | `403044716071c85f…` | PASS |
| A4 mini-optimization with the risk envelope requested = without it (every decision; envelopes stripped) | `research/gpu-phase7/results/compare/mini-risk-vs-plain.json` | `d2cf85aacc0743d8…` | PASS |
| A4 two jobs at once on one GPU (plain + risk): the plain job = its isolated reference | `research/gpu-phase7/results/compare/mini-concurrent-plain-vs-ref.json` | `778033c354ca71b4…` | PASS |
| A4 two jobs at once on one GPU (plain + risk): the risk job = its isolated reference | `research/gpu-phase7/results/compare/mini-concurrent-risk-vs-ref.json` | `d064a6a7c8108138…` | PASS |
| Q1 qualification and ranking parity on the risk mini archives (both policies, every evaluation; CPU = GPU) | `research/gpu-phase7/results/qualify/mini-risk.json` | `700bc5f7a1788130…` | PASS |
| A5 compute-sanitizer (memcheck, racecheck, initcheck, synccheck) on the final binary, requests from the host path (risk mode included) | `research/gpu-phase7/results/sanitizer-final/sanitizer.json` | `c9c4840e93e14aae…` | PASS |
| A6 bounded reliability run (p0, Mode A: two concurrent processes; no failure, CPU parity samples incl. envelopes, repeatability) | `research/gpu-phase7/results/sustained/p0/summary.json` | `443ac0e934e437c6…` | PASS |
| A6 bounded reliability run (p1, Mode A: two concurrent processes; no failure, CPU parity samples incl. envelopes, repeatability) | `research/gpu-phase7/results/sustained/p1/summary.json` | `ac702c6cdbca27b0…` | PASS |
| E3 negative tests on the final pinned files (final binary; job, runtime and risk-delivery cases included) | `research/gpu-phase7/results/policy/negative-final.json` | `1fd3181b4afe5228…` | PASS |
| E4 source-tamper tests in a sandbox clone (T1–T23; out-of-band pin) | `research/gpu-phase7/results/policy/tamper-final.json` | `5aabf43dd079d98e…` | PASS |
| E7 Strategy Lab portfolio parity: the five frozen pooled candidates (New L0 among them) = their sealed records (runners under --no-maglev) | `research/gpu-phase7/results/tests/strategy-lab-portfolio-parity.json` | `a649ce847f66b797…` | PASS |
| E8 npm test (known failures only; new tests pass) | `research/gpu-phase7/results/tests/npm-test.json` | `dfff8cc5135c4e23…` | PASS |
| E8 root TypeScript check: 0 errors | `research/gpu-phase7/results/tests/npm-test.json` | `dfff8cc5135c4e23…` | PASS |
| E9 Strategy Lab (typecheck, lint, Vitest, build, Playwright) | `research/gpu-phase7/results/tests/strategy-lab.json` | `55fc60ce1b38e0e3…` | PASS |
| E10 historical research files, study preflights, sealed-file modes, the B4/B5 freeze status and the CPU/CUDA groups unchanged | `research/gpu-phase7/results/integrity/integrity.json` | `37a9043e359792f0…` | PASS |
| P5 policy, enforcement, layout, host-pipeline, dataset, jobs and risk-envelope tests (before the record: only the record-in-force tests may fail) | `research/gpu-phase7/results/policy/policy-tests.txt` | `fb12f33060276b44…` | PASS |
