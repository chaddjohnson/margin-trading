# Readiness for Assignment 2: final GPU re-acceptance and integration

**Not executed here.**
- No acceptance was performed or record generated.
- No official GPU job or optimization was run.
- Nothing was merged.

The acceptance record `config/gpu-backend/acceptance.json` (GPU Phase 7, `bb0e3fcf…`, ACCEPTED on
`research/gpu-phase7-risk-envelope-readiness`) is **STALE on this branch**. The official gate refuses, and the
preflight blocks the 5 official GPU studies. That is correct and must stay so until Assignment 2.

## 1. Why a full §2 re-acceptance (not §2a enforcement-only)

- The previous assignment changed files of the **evaluation manifest**: `src/lib/csv.ts`, `src/lib/evaluation.ts`,
  `src/vg-d1-growth-joint/context.ts` and `data.ts`. The FULL door's verified prefix and the loaders' `pin` and
  `maxBytes` are part of the CPU closure compiled into the binary's evaluation digest.
- `docs/gpu/PARITY_CHECKLIST.md` §2a applies only when no evaluation file changed, so §2 applies in full.
- The enforcement group changed too: `src/research-standard/preflight.ts` (standard 4.0.0, then 5.0.0's `prospective`
  scope in this assignment) and `config/gpu-backend/entrypoints.json`.
- **No CUDA change is needed.** The door arrays the GPU receives are byte-identical: the FULL GPU dataset export is
  `6e977ccd…`, the accepted one, verified again in this assignment (`TESTS_AND_INTEGRITY.md` §5).
- The new binary still differs from gb7, because the digest is compiled in.

## 2. Pinned files changed on this branch since the record (verified on `2c86f052`)

`tools/gpu-backend/verify-acceptance.sh`: NOT VERIFIED, 4 failures.
- **CPU files:** `src/lib/csv.ts`, `src/lib/evaluation.ts`, `src/vg-d1-growth-joint/context.ts`,
  `src/vg-d1-growth-joint/data.ts`.
- **Policy files:** `src/research-standard/preflight.ts`, `config/gpu-backend/entrypoints.json`.
- **Passing:** CUDA files, host path, evidence and the binary gb7 (`cb2ff30b…`).
- **Evaluation digest of the tree:** `1a007e8c61e99c4ace1a09e92937628cf3ac583192059d2930bc239123e9fe3b`. The record has
  `d1a2e490788fa5fa76a277719dfb623c2cc896de85cf95f739c3e3af184e233b`. No evaluation-manifest file changed in this
  assignment; the digest moved in the previous one.
- **Entrypoint audit:** clean.
- **No-CUDA-change evidence:** the non-official check (`evidence/gpu-nonofficial-check-assignment-1.json`) gives FULL
  102/102 and ALL 102/102 bit-identical on gb7, with the accepted FULL dataset `6e977ccd…`.

## 3. Decisions to take BEFORE the acceptance (so it is done once, on the final code)

1. **Staged trailing stops:** integrate `research/vg-l0-staged-trailing-stop` (Priority 4: staged stops, RC 3,
   Growth engine 1.5.0, its own Phase 8 record and gb8 binary)?
   - If yes, merge it first. Its CUDA work then becomes part of the accepted binary, and its 2 declared Priority 5A
     test failures come with it.
   - If no, Phase 7's lineage plus this branch is the final code.
2. **TSLA identity-join fix:** integrate `fix/tsla-outcome-identity-join`? Not an evaluation dependency, but it
   conflicts in `src/research-outcome/identityJoin.ts` and its test.
3. **Further changes:** any further intended change to evaluation code must land before the acceptance.

## 4. The acceptance procedure (docs/gpu/PARITY_CHECKLIST.md §2), as the Phase 7 campaign ran it

Every Node process uses `--no-maglev`, on Apollo, on a committed tree:

```bash
# the evaluation digest of the final tree, and the reproducible binary with it compiled in
node --no-maglev --experimental-transform-types src/gpu-backend/compat.ts --digest
tools/gpu-backend/build.sh <binary> $(node --no-maglev --experimental-transform-types src/gpu-backend/compat.ts --digest)
# the campaign (a new acceptance study namespace, research/gpu-phase9/ or similar, adopting standard 5.0.0):
#   parity: every door, ≥ 100,000 seeded genomes, every structural value and option set, adversarial fixtures,
#   determinism across batch sizes, input order and host workers — zero tolerance (Phase 7: research/gpu-phase7/chains/parity.sh)
#   sanitizer: tools/gpu-phase7/sanitize.ts (memcheck+leak, racecheck, initcheck, synccheck: 0 errors)
#   negative and tamper: tools/gpu-phase7/negative.ts, tools/gpu-phase7/tamper.ts (sandbox clone)
#   fixed-seed mini-optimization on both backends, interrupted/resumed, and sealed-job replays — Phase 7 ran them in
#     research/gpu-phase7/chains/final.sh step A4: tools/gpu-phase7/job.ts --job mini as GPU (host workers 8, 1, 0), CPU,
#     a graceful stop + resume and a SIGKILL + resume, compared with tools/gpu-phase7/compare.ts; and the sealed-job
#     replays (Phase 3's tools/gpu-phase3/replay.ts --job a3:C19:broad1, a2:C19:base + compare.ts sealed)
# the record (only when every gate passed; commit it; keep its sha256 and commit outside the repository)
#   the generator of the new acceptance study (Phase 7: tools/gpu-phase7/accept.ts)
tools/gpu-backend/verify-acceptance.sh        # must then report VERIFIED
npm test                                       # the merge gate and the record-in-force tests pass again
```

**The fixed-seed mini-optimization is the one step that needs the user's explicit authorization**, which Assignment 2
is to give. Everything else is engineering verification.

## 5. After the acceptance

1. `npm test`: the 3 STALE-by-design failures (MERGE GATE, "the recorded acceptance re-verifies independently",
   "every study … passes the preflight") must pass. The remaining failures are the pre-existing ones of
   `TESTS_AND_INTEGRITY.md` §2.
2. `npm run research-preflight -- --all`: 31 of 31 PASS.
3. Strategy Lab's suites, the portfolio parity, and the N/original research and all-data checks
   (`apps/strategy-lab/tests/portfolio-windows.test.ts`).
4. Merge into `main` (a fast-forward from this lineage) only with the user's authorization. Update `CLAUDE.md`'s
   acceptance line and the roadmap.

## 6. Integration blockers known now

- The STALE record (above).
- The two branch decisions (§3).
- Nothing else in this branch blocks integration. Its tests pass apart from the documented failures, and no data file
  is tracked.
