# RESEARCH_RECOVERY — TSLA outcome identity fix: branch, commits, artifacts, reproduction

The live task checkpoint is `WORK_RECOVERY.md` in this directory. This file is the handoff's recovery and reproduction
record.

## 1. Git

| Item | Value |
|---|---|
| Repository | `git@github.com:chaddjohnson/margin-trading.git` (origin) |
| Branch | **`fix/tsla-outcome-identity-join`** (new; pushed; not merged; no force-push) |
| Base | `421e4c87780844e4e49c079586aa5c4945cc9e35` = `research/tsla-d1-growth` (the Priority 6 handoff; not modified) |
| Module commit (cherry-pickable to `main`) | `aca31b5fd595850050ca629ef3ac9208a84c9894`: `src/research-outcome/identityJoin.ts` and its tests only |
| Fix commit | `70f8bdf14712924fe02985515537b111e00a5edd`: the `outcome.ts` patch, its tests, the tools and this engineering record |
| Handoff commit | the commit after the fix commit: the ZIP, `bundle/FINAL_VERIFICATION.txt` and the final checkpoint |
| `main` | `3606f4b3` (untouched) |

Verify the remote with `git ls-remote origin fix/tsla-outcome-identity-join`. It must equal the local `HEAD`.

## 2. Changed paths (the complete list, relative to `421e4c87`)

| Path | Kind |
|---|---|
| `src/research-outcome/identityJoin.ts` | new: the reusable identity join |
| `src/research-outcome/tests/identityJoin.test.ts` | new: 12 tests |
| `src/tsla-d1-growth/outcome.ts` | modified: identity join; `governedFinalists`; `candidateLabel` and `governanceLabel` |
| `src/tsla-d1-growth/tests/outcome.test.ts` | new: 25 tests (synthetic and the sealed replay) |
| `tools/tsla-outcome-identity-fix/replay.ts` | new: the report-only replay |
| `tools/tsla-outcome-identity-fix/fingerprint.ts` | new: the read-only fingerprint |
| `tools/tsla-outcome-identity-fix/bundle.sh` | new: this handoff ZIP |
| `docs/engineering/tsla-outcome-identity-fix/**` | new: the engineering record, the evidence, the replay output, the ZIP |

Nothing else changed. In particular, nothing under `research/`, `apps/`, `config/`, `data/`, `src/gpu-backend/` or
`package.json` changed (`git diff --stat 421e4c87 HEAD`).

## 3. Artifacts and hashes

| Artifact | sha256 |
|---|---|
| `research/tsla-d1-growth/results/outcome.json` (sealed; **unchanged**) | `a414631e41da8285f6785e2f98dc92bca0244b24fb149da534ba36a18463bf79` |
| `research/tsla-d1-growth/FROZEN_SELECTION.json` (sealed; unchanged) | `0ebb6b62ad95b1bdb9b6fb14a4a50f38ddceb49ba86b045d3cd34ef53e1a8791` |
| `research/tsla-d1-growth/results/validation/validation.json` (sealed; unchanged) | `b0f654009960fbaca6debdb0a803885083d2a5428e206ff3234b647e126ff63f` |
| `research/tsla-d1-growth/results/sequential.json` (sealed; unchanged) | `2a1079a0a9d1e6dea4cd9d809e1a0413794ccc41152a02a975105c7210f28ce8` |
| `research/tsla-d1-growth/reports/tables/outcome-join.json` (report-only D1 reconstruction; unchanged) | `df18bd93e85f145419ab83342707e9de51025f7f2c741cda186870c144ca0cb2` |
| `docs/engineering/tsla-outcome-identity-fix/replay/outcome.corrected.report-only.json` (**new, report-only**) | `6b923ff290b6ccc6576aeb32c22272ea19449b1ad2929684cfe4899d98ed86c6` |
| `config/gpu-backend/acceptance.json` (unchanged; VERIFIED) | `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` |
| Git tree `research/` at base and at the fix commit | `06032071eb528351d45ea55a2610fc57f4253d7b` |
| TSLA code digest: before / after | `fb7e6ddc5dee614b…` / `de6d626ac35cded3…` (the study's official stages now refuse: `REPORT.md` §6) |
| GPU evaluation (compat) digest (unchanged) | `d1a2e490788fa5fa76a277719dfb623c2cc896de85cf95f739c3e3af184e233b` |

## 4. Reproduction (from the repository root, Node 24.21.0, `node_modules` installed)

```bash
git fetch origin && git checkout fix/tsla-outcome-identity-join

# the focused tests: the generic join, the outcome (synthetic and the sealed replay), the study's own suite
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test \
  src/research-outcome/tests/*.test.ts src/tsla-d1-growth/tests/*.test.ts

# the report-only replay; an existing identical output prints "unchanged"; --out writes elsewhere
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
  tools/tsla-outcome-identity-fix/replay.ts
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
  tools/tsla-outcome-identity-fix/replay.ts --out /tmp/replay-check.json   # then compare its sha256 with §3

# the fingerprint of everything that must not change (compare with evidence/baseline-before.json)
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
  tools/tsla-outcome-identity-fix/fingerprint.ts

# the sealed TSLA records (163 seals) and the GPU acceptance record
GPU_POLICY_PURPOSE=official-optimization npm run tsla -- verify
bash tools/gpu-backend/verify-acceptance.sh

# the whole regression chain (≈ 12 min; GPU free; Strategy Lab built only into the scratch directory)
systemd-run --user --unit=tslafix-tests --collect --wait -p MemoryHigh=44G -p MemoryMax=48G -p MemorySwapMax=0 \
  -E PATH="$PATH" -E HOME="$HOME" --working-directory="$PWD" \
  -p StandardOutput=append:"$PWD/docs/engineering/tsla-outcome-identity-fix/evidence/tests/chain.log" \
  -p StandardError=append:"$PWD/docs/engineering/tsla-outcome-identity-fix/evidence/tests/chain.log" \
  /bin/bash "$PWD/docs/engineering/tsla-outcome-identity-fix/chains/tests.sh" <absolute scratch dir>

# the handoff ZIP (after the fix commit is pushed)
tools/tsla-outcome-identity-fix/bundle.sh <scratch dir> <fix commit>
```

`chains/tests.sh` and `chains/tsconfig.tools.json` contain absolute paths for Apollo (`/home/chad/projects/margin-trading`,
the fnm Node path). Adjust them on another machine.

## 5. Bringing the reusable module to `main` (decision I1; not done; needs the user's authorization)

```bash
git checkout -b feature/research-outcome-identity-join main
git cherry-pick aca31b5fd595850050ca629ef3ac9208a84c9894        # adds src/research-outcome/ only; no conflict is possible (new files)
node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning --test src/research-outcome/tests/*.test.ts
```

A dry run without checkout (`git merge-tree --write-tree --merge-base aca31b5f^ main aca31b5f`) merges cleanly and adds
exactly the two module files to `main` (`evidence/cherry-pick-dry-run.txt`). `tsconfig.json`, `eslint.config.js`, `.prettierrc`
and `.node-version` are identical on `main` and on this branch. The
module imports nothing from the repository. **Do not** merge `fix/tsla-outcome-identity-join` into `main`: it carries the
302 unmerged commits of the TSLA lineage.

## 6. Guards

- Do not rerun any TSLA stage. Official stages refuse by design (`REPORT.md` §6). `verify` is read-only.
- Do not regenerate, rewrite, repin or chmod anything under `research/tsla-d1-growth/`. `results/outcome.json` is the
  historical record.
- The replay never writes under `research/`, and it never overwrites a different existing output.
