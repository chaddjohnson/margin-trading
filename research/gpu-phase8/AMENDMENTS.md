# AMENDMENTS — GPU Phase 8 (append-only)

## E1 — 2026-11-23T13:02Z (commit 54261ea0) — campaign attempt 1 stopped at the negative suite; two fixes, the campaign restarts from step 1

- **What happened.** `chains/final.sh` (started 12:55:43Z at `5d3ddccc`) built gb8 (`b156b88d…`, reproducible) and
  stopped at step 2: the negative suite's inherited Phase 7 case "the Lab refuses a delivered envelope with a liquidation
  banked DD below the marked one" crashed the process with an unhandled `EPIPE` on the GPU server's input pipe during
  cleanup (the pool had already ended the server; `GpuServer.close` wrote QUIT before the exit event was processed). A
  standalone rerun of the suite did not crash (a timing race) and showed two of the new staged cases failing on their
  expected message only: the previous (v2) server is refused at the compatibility-digest check (`preflight-compat`)
  before the capability check; a Growth·GDX staged configuration was canonicalized away before validation and refused as
  "empty" instead of "out of scope".
- **Fixes (no rule changes).** `src/gpu-backend/client.ts`: an error on the server's input pipe is the server's death (the
  pending request fails closed). `src/gpu-backend/encode.ts`: the raw staged value is validated before canonicalization.
  `tools/gpu-phase8/negative.ts`: the old-server gate case accepts `preflight-compat`. The generator's declared host change
  set adds `client.ts`. No evidence of attempt 1 is used: the campaign reruns from step 1 on the new commit.

## E2 — 2026-11-23T13:27Z (commit 0ca36f68) — E8/E10 adapted to studies that require the GPU backend; the integrity baseline (before the tests chain)

- **Why.** The E8/E10 tools were copied from Phase 7, whose tree had no study requiring the GPU backend. On this branch
  three studies declare `gpu-required` (`vg-l0-risk-envelope-pilot`, `vg-l0-risk-envelope-stage-b`, and Priority 4's own
  `vg-l0-staged-stop`). While the record in force (Phase 7) is stale — by design, until this study writes the new record —
  their preflights fail with the §9.9 block, and so does the repository test that runs every study's preflight. The
  copied integrity check also had no baseline under `results/baseline/` and still declared Phase 7's change set.
- **Changes (tools only; no rule, threshold or evidence of the campaign changes).**
  - `tools/gpu-phase8/baseline.ts` (new): the baseline from Git objects of **5d587bb2**, the last commit before any
    staged-stop change (tracked research blobs, the 28 studies with adoptions, the base sha256 of every current manifest
    file), plus the read-only seal check and the forward-freeze list captured on the current tree.
  - `tools/gpu-phase8/integrity.ts`: excluded directories `research/gpu-phase8/` and `research/vg-l0-staged-stop/` (the
    task's own study); a base study's preflight passes or — before the new record only — fails with exactly one error, the
    §9.9 stale-acceptance block naming only files pinned by the record in force; the evaluation check requires the changed
    manifest files against the base commit to be exactly the declared staged-stop sets (`accept.ts`'s lists).
  - `tools/gpu-phase8/tests-record.ts`: `src/research-standard/tests/preflight.test.ts` › "every study that declares an
    adoption passes the preflight" joins the record-in-force tests (accepted before the record only with the stale
    reason; at most 3).
  - After the record: `results/tests/record-in-force-after.txt` reruns the policy, enforcement and preflight tests and
    every study preflight; all must pass.

## E3 — 2026-11-23T17:54:54Z — E8: two declared consequences of the Growth engine revision; E9: the live-dist check computed (after the tests chain, before the record)

- **What the tests chain showed** (`results/logs/tests-chain.txt`, 17:40:20Z → 17:52:07Z). npm test: 1,875 tests, 1,859
  pass, 12 fail = the 7 known pre-existing + the 3 record-in-force tests (A4, E2) + **two failures of the completed
  Priority 5A study** (`src/vg-growth-funding-lifecycle/tests/parity.test.ts`: "the canonical source is the pinned
  riseTrading.ts v1.4.0" and "it differs from simulateTrading only by the recorded LIFECYCLE insertions"). Root tsc,
  ESLint, Strategy Lab (typecheck, lint, Vitest 314, build, Playwright 81/81) and the portfolio parity passed; integrity
  5/5.
- **Why they fail.** That study pins the **bytes** of `src/growth-trading/riseTrading.ts` v1.4.0 (sha256 `78b3423c…`) and
  diffs its copied orchestrator against a fixed line range of it. The Growth engine revision 1.5.0 — declared in Priority
  4's RULE_SPECIFICATION §5 and in this record's CPU closure (`accept.ts`'s declared set; the integrity check confirms
  the changed files are exactly the declared ones) — inserts the option-gated staged hooks into that file, so both fail by
  construction. The same situation is recorded for the 2026-11-12 hold-unit change (completed studies' byte or digest
  guards cannot hold after a required engine edit; they are verified at their own commit, never relaxed).
- **Change (tools only).** `tools/gpu-phase8/tests-record.ts` accepts exactly these two tests as *declared consequences*,
  and only if checks computed in the tool hold: (a) at the base commit `5d587bb2` the file is the pinned v1.4.0 and 5A's
  diff equals its recorded `orchestrator.diff` (the study verifies at its own commit); (b) 5A's code and research are
  unchanged since the base; (c) in the same npm run, 5A's behavioural test ("real data (D24): L0 lifecycle books equal
  the canonical books", on the current engine) and the revision 1.5.0 OFF-parity fixture test pass. All five hold
  (`results/tests/npm-test.json` `declaredConsequences`). The 5A tests are not edited; they remain failing at HEAD of
  this branch and are disclosed (a merge into `main` would inherit them; resolving that is a review decision).
- **E9.** `chains/tests.sh` (copied from Phase 7) counted live-dist files newer than `results/protocol-freeze.json`, which
  this study does not have: `find` failed and its count 0 was vacuous. The tool now counts files of
  `apps/strategy-lab/dist` newer than this study's protocol commit time (2026-11-23T12:55:39Z): 0 (the newest is from
  2026-11-17T23:49:54Z).
- **Effect.** No rule, threshold or campaign evidence changes; the classification is narrower than "known failure" (two
  named tests, conditional on computed checks).

## E4 — 2026-11-23T17:57:05Z — the acceptance generator fixed before its first run; E3/E4 suites rerun on the final pinned files

- **What happened.** The first (dry) run of `tools/gpu-phase8/accept.ts` stopped with a SyntaxError (a `const t` declared
  twice in the A1/A2 block — the generator had never run end to end), and after that fix its A0 runtime list named Phase
  7's Q1 file `qualify/mini-risk.json`, which this study does not produce (its Q1 output is `qualify/p4-mini.json`,
  `runtime.maglev = disabled`). The dry run also prints its blockers now. Every other gate passed in the dry run.
- **Consequence.** The generator is a pinned policy file of the record, and gates E3/E4 require the negative and tamper
  suites to have run on the final pinned files. They are rerun on the committed tree with the fixed generator, with
  the same commands as `chains/final.sh` steps 2–3 (`chains/policy-rerun.sh`); the outputs of 13:03/13:07Z are kept
  in `results/policy/superseded-54261ea0/` (also in Git at `aac6c0e1`).
- **Effect.** No gate, threshold, rule or campaign evidence changes.

## E5 — 2026-11-23T18:03:31Z — the record: one rerun after a positive-control flake in P5 (no change)

- **Attempt 1 (18:02Z).** `accept.ts` ended NOT_ACCEPTED with one blocker, P5: besides the two record-in-force tests
  (expected before the record), `enforcement.test.ts` "engine runtime (controls): the probe detects Maglev; without the
  guard an explicitly forked child runs it" failed at its **positive control** — `noGuard.forkExplicit.maglev` was
  `false` (the probe, sampling the active tier every 500 iterations, did not observe Maglev in a deliberately
  unprotected child that dropped the flag; tiering is timing-dependent and can pass from baseline to Turbofan between
  samples). Every protection assertion of the test passed (protected main, workers, inherited fork: no Maglev), as did
  the guard tests. The same test passed in the npm test of the tests chain (17:40–17:45Z) and in the three dry runs. No
  record was written (the record in force stayed Phase 7's `bb0e3fcf…`); the attempt's draft, policy-test output and
  log are kept in `results/policy/superseded-accept-1/`.
- **Attempt 2 (immediately after, unchanged tree, load average 2.2):** ACCEPTED; `config/gpu-backend/acceptance.json`
  sha256 `c02a8a928946b5acc4df61a7fceb3e5656bf6d12ee33749d615edc7c54fad126`. Disclosed as a flaky positive control of the
  enforcement suite (a sensitivity check of the probe, not of the guard); no code, gate or threshold changed.
