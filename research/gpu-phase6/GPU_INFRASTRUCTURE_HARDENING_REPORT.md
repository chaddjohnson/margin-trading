# GPU infrastructure hardening — Maglev protection and concurrent-job isolation (GPU Phase 6)

**GPU infrastructure hardening completed. Risk-envelope pilot NOT STARTED.** Nothing of the pilot was implemented,
prepared, configured, preflighted or run. No optimization was run; no trading rule, numerical formula, fitness,
parameter search, candidate selection, CUDA algorithm, numerical precision or build flag changed.

## 1. Status

| Question | Answer |
|---|---|
| `--no-maglev` beyond the official path | **Done.** Legacy CPU runner gate + child-process guard, every npm script, Strategy Lab's server, runners and test workers |
| Concurrent-job isolation | **Done.** `src/gpu-jobs/`: automatic identity, kernel ownership lock, per-job records, state and dataset cache; the official gate requires a held job |
| Acceptance | **ACCEPTED** 2026-11-21T11:10:46Z, enforcement-only re-acceptance (checklist §2a); record sha256 `3610caaf0bfc14ecd5ea75981a69f9316ff9ff6b610d4913b949d36950c884d3`, 50 evidence entries; supersedes Phase 5's `49e95d7a…` |
| Evaluation | **Unchanged**: evaluation digest `3a6eacde…`, binary `f444c521…`, CPU closure, CUDA, host path all = Phase 5 |
| Integration | merged into `main` (`dbb5aaba`), verified after the merge, pushed; `research/gpu-phase2` fast-forwarded and checked out (see `MERGE_AND_RESTORE.md`) |

## 2. Runtime entrypoints inspected and updated

| Entry point | Before | Now |
|---|---|---|
| official gate, official runner | refused without `--no-maglev` (Phase 5) | unchanged |
| legacy CPU runner gate `src/gpu-backend/legacyRunner.ts` (57 root npm scripts go through it or `src/app.ts`) | no check | refuses without the flag (`runtime-maglev`, exit 3, before importing the runner); installs the child-process guard |
| frozen runners' worker processes (≈ 20 directories fork with an explicit `execArgv`) | **flag dropped** (shown: an explicitly forked child of a protected parent ran Maglev code) | the guard adds `--no-maglev` to every `fork` and every `spawn`/`spawnSync`/`execFile`/`execFileSync` of `node`; frozen code untouched |
| worker threads (`new Worker`, the host pipeline, frozen pools) | inherit the process's V8 options | unchanged; verified by tier probes |
| root `package.json` | 0 of 59 scripts with the flag | all 57 Node scripts `node --no-maglev …` (diff is flag-only) |
| Strategy Lab server `server/main.ts` `start()` (also used by the e2e server) | no check | refuses without the flag |
| Strategy Lab runners (`trading-run`, `entry-signal-run`, `pool-run`, `portfolio-run`) | spawned without it | `NODE_FLAGS` starts with `engineExecArgv`; each runner refuses without the flag |
| Strategy Lab replay (`server/replay.ts`), tests (`growth-parity.test.ts`), Vitest workers, Playwright web server, systemd template, 16 npm scripts | hand-written flag lists without it | `NODE_FLAGS` / `execArgv: ['--no-maglev']` / flag-only script edits |
| `src/app.ts` direct use | — | **not edited** (bound by the B4/B5 forward freeze); its npm scripts carry the flag |

## 3. How `--no-maglev` is enforced

- One module knows the rule: `src/gpu-backend/runtime.ts` — `ENGINE_FLAG`, `maglevDisabled`, `requireEngineRuntime`,
  `engineExecArgv`, `withEngineFlag` (fork options), `withEngineFlagArgs` (spawn arguments), `installChildEngineGuard`.
  A conflicting Maglev option (`--maglev`, `--stress-maglev`, …) is refused, never silently corrected. `NODE_OPTIONS` is
  never used (Node rejects V8 options there).
- Merge gate (`npm test`): every Node npm script of both `package.json` files must start `node --no-maglev`; the legacy
  gate must call `requireEngineRuntime` and `installChildEngineGuard`.
- Regression tests with V8's own tier probes (`%ActiveTierIsMaglev`, `src/gpu-backend/tests/enforcement.test.ts`):
  behind the legacy gate, no Maglev code in the main thread, inherited and explicit-`execArgv` worker threads,
  explicit-`execArgv` and inherited forks, `spawn(process.execPath)` and promisified `execFile` children; a non-Node
  command untouched. Controls: an unprotected process does run Maglev code (the probe is live), and **without the guard
  an explicitly forked child of a protected parent runs Maglev code** — the gap the guard closes.
- Live process audit (amendment A2): 14 Node processes of two concurrent jobs (2 job mains, 12 forked CPU workers),
  1,680 samples, every one with `--no-maglev`. Every campaign job's own record shows `--no-maglev` exactly once.
- Not covered (documented): a frozen study's `main.ts` or `src/app.ts` started by hand with plain `node`, bypassing its
  npm script; shell-string `exec('node …')` children (none found in the runners).

## 4. Job-directory and cache isolation

Design and requirement mapping: `JOB_ISOLATION.md`; operations: `docs/gpu/README.md` §4c.

| Item | Default location |
|---|---|
| identity `job.json` (definition + sha256), `events.jsonl`, `receipts.jsonl`, `telemetry.jsonl`, results, `complete.json` | `research/<study>/results/jobs/<job>/` (`logs/` git-ignored) |
| archive, checkpoint, `job.lock`, `owner.json` | `research/<study>/cache/jobs/<job>/` (git-ignored) |
| dataset cache | `research/<study>/cache/jobs/<job>/dataset/` (explicit `datasetCache: { shared }` possible) |

Refusals: `JOB_ACTIVE`, `JOB_EXISTS`, `JOB_IDENTITY_CONFLICT`, `JOB_NOT_FOUND`, `JOB_FOREIGN_STATE`, `JOB_NOT_OWNER`,
and `preflight-job` at the official gate. The lock is kernel-held (released by any exit, SIGKILL included). Names never
reach seeds. The module lives outside `src/gpu-backend/` (adding a backend file would change `compat.ts`, which is in the
evaluation digest) and is pinned by the record through `ENFORCEMENT_EXTRAS`.

### Usage

One optimization — in an official runner (started via `officialRunner.ts` with `node --no-maglev`):

```ts
const job = openJob({ study: 'research/<study>', job: 'C19-broad1', identity: { door: 'D19', stage: 'broad1', budget: 'v1' },
  purpose: 'official-optimization', resume: process.argv.includes('--resume') });
const session = await openOfficialGpuSession({ study: job.study, job, door, domain, plannedBatch: 8192 });
const pool = new GpuPool({ door, session, ...poolFilesOf(job), batchSize: 8192 });
const lab = new EvalLab({ ...labOptionsOf(job), door: 'D19', doorPin, purpose: 'official-optimization', pool, backend, codeDigest });
```

Two concurrent optimizations: two units in one slice, two job names (or none — allocated). Non-official example:

```bash
tools/gpu-phase6/launch-slice.sh job-a <log-a> -- env GPU_POLICY_PURPOSE=benchmark node --no-maglev --experimental-transform-types tools/gpu-phase6/job.ts --job a3:C19:broad1 --job-name A
tools/gpu-phase6/launch-slice.sh job-b <log-b> -- env GPU_POLICY_PURPOSE=benchmark node --no-maglev --experimental-transform-types tools/gpu-phase6/job.ts --job a2:C19:base --job-name B
node --no-maglev --experimental-transform-types src/gpu-jobs/cli.ts list --study research/gpu-phase6     # states
# resume an interrupted job: rerun its command + --resume; cleanup of an inactive job's state: cli.ts remove-cache … --yes
```

Overrides: `cacheRoot`/`resultsRoot`, `GPU_JOBS_CACHE_ROOT`.

## 5. Concurrency, crash, resume and cache-safety tests (`chains/campaign.sh`, all on the accepted binary)

| Job | Situation | Wall | Result |
|---|---|---|---|
| c1-ref-mini | mini schedule alone (reference) | 65 s | 30,749 evaluations, rows `014239d8…` (= Phase 5's mini) |
| c2-mini-cpu | same on the CPU arm, 12 forked workers | 125 s | identical to c1 (every archived evaluation) |
| c3-a3 | Assignment 3 C19 broad1 alone | 585 s | = sealed record (64 lanes, 1,242,714 evaluations, 0 differences) |
| c4-a3 + c4-a2 | A3 C19 broad1 and A2 C19 base at once | 1,022 s / 1,076 s | both = their sealed records; c4-a3 = c3-a3 on every archived evaluation |
| reuse attempts | the running c4-a3 as new, as resume, c4-a2 resumed with another definition | — | `JOB_ACTIVE` ×3, exit 3, no evaluation, identities untouched |
| c4-mini-kill | whole unit SIGKILLed after 4 batches, then resumed | 141 s | state `interrupted`, lock free; reopened as new → `JOB_EXISTS`; resumed (2,849 rows reused) = c1 |
| c4-mini-stop | stopped at 8,000 fresh (exit 75), resumed | 61 s | 8,299 rows reused; = c1 |
| c4-shared-a/b | two jobs, explicitly shared dataset cache, exported at one instant (barrier) | 225 s | one file (one inode) for both, no temporary left; both = c1 |
| a2-audit-mini-gpu/cpu | amendment A2's process-audit re-run, concurrently | 75 / 128 s | both = c1; every Node process `--no-maglev` |

Isolation audit (`campaign/summary.json`): **210/210** — identities, completion, event sequences per instance (the
killed instance never released), disjoint directories, receipt nonces unique across all ledgers, own dataset files
distinct with identical bytes, the shared file single, refusals, comparisons 11/11, engine records, process audit,
nothing written outside the study. Unit tests (`src/gpu-jobs/tests/jobs.test.ts`, 10): creation race of six processes
(exactly one owner), SIGKILLed owner, Lab second writer, gate job checks.

## 6. Numerical parity and sealed-result verification

| Check | Result |
|---|---|
| confirmation parity through the host path (D24 core 3,149 with determinism; D19 fund 1,561 with detail and risk; fixture S3 all options 328) | **5,038 / 5,038 identical, 0 mismatches** |
| Assignment 3's 48 sealed finalists on D24 (CPU reference under `--no-maglev`) | 96/96 tasks CPU = GPU; **48/48 = sealed C24 figures** to the cent |
| sealed optimizer jobs (A3 ×2, A2) and fixed-seed CPU/GPU, resumed, concurrent | identical (§5) |
| Strategy Lab portfolio parity (five frozen pooled candidates on FULL, amendment A1) | **ALL VERIFIED** (e.g. New L0 primary $479,605.18 / DD $20,385.99, 43/43 record checks, ledgers pass) |
| carried Phase 5 kernel evidence (parity campaign 144,795, sanitizer, sealed replays, reliability, atomic export) | 28 entries, every file re-hashed against its Phase 5 pin |

## 7. Strategy Lab regression

Typecheck, lint, 314 Vitest tests, build (scratch directory), **Playwright 81 / 0 on the first run**; live state
`state/strategy-lab/` fingerprint unchanged; live `dist/` untouched. Saved previews computed before the change report
"runner flags" as an identity difference and recompute on demand (nothing stored is modified). No Strategy Lab service is
installed on Apollo; the template carries the flag.

## 8. Tests and GPU acceptance

| Gate | Result |
|---|---|
| E3 negative suite | 67/67 (19 gate, 21 runtime, 11 job, 11 engine, 5 CLI) — run 2 after amendment A3 |
| E4 tamper suite (sandbox clone) | 20/20, baseline ok (new T16 lock disabled, T17 gate job requirement removed, T18 legacy engine check removed, T19 job module unpinned, T20 unclassified job-module file) |
| E8 `npm test` | 1,723 tests: 7 known pre-existing failures + (before the record only) the 2 record-in-force tests (A4); after the record 26/26; root `tsc` 0 errors; ESLint 0 errors |
| E10 integrity | 20,888 tracked research files outside this study unchanged; 22/22 study preflights as at baseline; 999 sealed files protected; B4/B5 freeze failure list unchanged |
| independent verifier | `--rebuild --device --expect-record-sha256 3610caaf…`: VERIFIED (reproducible rebuild = `f444c521…`) |
| live official gate | OPEN with a job (`research/gpu-phase6/preflight-…`), 18/18 parity subjects |

Hashes: record `3610caaf0bfc14ecd5ea75981a69f9316ff9ff6b610d4913b949d36950c884d3` (source revision `065919ef`, acceptance
commit `85622fb0`); policy digest `c41bfe6871c0f7cf…` (29 files incl. the job module and the generator); binary
`f444c52139ebd8b2481fcde8a69cf8564c91dc426c6e74f366c70be5c714041e`; evaluation digest
`3a6eacdecc4f0a24fbf008c0ef852644969e72dc8ea0af95bd5dc373ebb6033d`. Out-of-repository pins:
`~/.local/share/margin-trading-gpu/acceptance-pins/acceptance-gpu-phase6-3610caaf.json` (0444) and a line in
`pins.jsonl`; the Phase 5 (`49e95d7a…`) and Phase 3 pins kept unchanged.

## 9. Pre-existing failures (not regressions)

- `npm test`: the 7 long-known failures (allin-original ×6 on a case-sensitive file system, Study 7 data end).
- The B4/B5 prospective forward freeze already refused before this work (its `pools` script line changed in GPU Phase 2,
  and the data files were extended); unchanged — its code closure still verifies.

## 10. Amendments and disclosures

A1 the Strategy Lab portfolio parity reads FULL (Strategy Lab's own regression check; no decision). A2 the campaign's
process sampler read the system-unit column and captured nothing — corrected, bounded re-run, the empty file kept. A3 a
negative case expected the wrong dataset file name — matched by content, suite rerun, run 1 kept. A4 the two
record-in-force tests can only pass after the new record — accepted before it only with the stale reason, then rerun
(26/26) and the full suite repeated after the merge. A development smoke job (`dev-smoke-mini`) preceded the protocol
freeze and is not evidence.

## 11. Files changed (main `830a1221` → merge `dbb5aaba`)

Engine runtime: `src/gpu-backend/{runtime,legacyRunner}.ts`, both `package.json`, Strategy Lab `server/{main,jobs,replay}.ts`,
four runners, `vite.config.ts`, `playwright.config.ts`, the service template, `tests/growth-parity.test.ts`, usage
comments. Jobs: `src/gpu-jobs/` (new), `src/gpu-backend/{lab,official,acceptance,entrypoints}.ts`,
`tools/gpu-backend/official-preflight.ts`, `.gitignore`. Tests: `src/gpu-backend/tests/{policy,enforcement}.test.ts`.
Records: `config/gpu-backend/{acceptance,entrypoints}.json`. Study: `research/gpu-phase6/`, `src/gpu-phase6/`,
`tools/gpu-phase6/`. Docs: `CLAUDE.md`, `docs/gpu/{README,PARITY_CHECKLIST}.md`, `docs/strategy-lab/OPERATIONS.md`,
`docs/research/ROADMAP.md`. No file of the CPU closure, CUDA, host path, a frozen runner, `src/app.ts`, `src/pools/` or a
completed study changed (`results/integration/merge-audit.txt`).

## 12. Known limitations and risks

1. Direct `node` starts that bypass the npm scripts are unprotected for frozen `main.ts` files and `src/app.ts` (both
   cannot be edited); every documented path is protected.
2. The guard covers Node children started through `child_process` functions; a shell command string (`exec('node …')`)
   is not rewritten (none in the runners).
3. The V8 defect is avoided, not repaired; a Node upgrade needs a fresh acceptance.
4. Job locks rely on local-disk fcntl semantics; the pool's ledger path is supplied by the runner (`pool.ts` is in the
   evaluation digest and was not changed).
5. Reliability evidence is bounded (one ≈ 45-minute campaign; no endurance run, by the brief).
6. Pre-change Strategy Lab previews show a "runner flags" identity difference until recomputed.

**GPU infrastructure hardening completed. Risk-envelope pilot NOT STARTED.**
