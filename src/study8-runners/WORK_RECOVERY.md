# Work recovery checkpoint — Study 8 seven named full-history runners and trade-level reporting

## Top screen

- **Updated:** 2026-11-02T15:07Z (UTC, from the clock). **Status: COMPLETE (implementation and verification).**
- **Not committed, not pushed.** The brief allows no commit, push, PR or merge without the user's explicit
  authorisation; that is the follow-up gate.
- **Task:** the user's brief of 2026-11-02, "Study 8: seven named full-history runners and auditable trade-level
  reporting". It is execution and reporting tooling only:
  - no optimization or reranking;
  - no new study;
  - no Study 8 stage run (only the read-only `verify-chain`).
- **Branch:** `research/study8-expanded-regime-d1`, `HEAD` `961bcaf893c623e7542770d22b3362a28d77c291`.
  - Main checkout `/home/chad/projects/margin-trading`; no other worktree.
  - The branch has no upstream; it was never pushed.
- **Working tree:**
  - this task's changes (listed below);
  - the user's own untouched changes: `config/market-events/distributions.csv` and `distributions.manifest.json`
    (modified), `config/market-events/raw/vanguard-20261030T184421Z/` and four `._.DS_Store` files (untracked).
- **Running process:** none.
- **Next action:** none in this task, unless the user authorises a commit and/or push.

## Files added or changed (sha256 prefixes recomputed 2026-11-02T15:06Z)

| File | Change | sha256 (16) |
|---|---|---|
| `src/study8-runners/data.ts` | new: latest common complete session, five-file provenance, `validateEnd` | `5decb93779a2680c` |
| `src/study8-runners/lots.ts` | new: lots.csv/json/txt, gated MFE replay, diagnostics, export check | `db3aa8cc5c4202d7` |
| `src/study8-runners/run.ts` | window from data.ts, new artifacts, provenance, runtime, summary, atomic output dirs | `74b2902105e983a2` |
| `src/study8-runners/main.ts` | compare: common cutoff, extra columns, yearly side by side, provenance; list | `69ccedc8a72879a5` |
| `src/study8-runners/tests/data.test.ts` | new: complete-session and end-date tests on fixtures | `dccc78e1fd7c4056` |
| `src/study8-runners/tests/seven.test.ts` | new: the seven aliases against the sealed selection | `6224bc3deeb1a3c9` |
| `src/study8-runners/tests/runners.test.ts` | + atomic `--out` test | `092e6b69ff548230` |
| `src/study8-runners/README.md` | seven commands, defaults, outputs, fields, provenance, limitations | `d49e1660e117c092` |
| `research/study8-expanded-regime-d1/RUN_COMMANDS.md` | §2: pointer block with the eight commands (not a sealed record) | `079ec3dcefff6767` |
| `src/study8-runners/WORK_RECOVERY.md` | this checkpoint | — |

Unchanged: `aliases.ts` `518ef25155db54cf`, `resolve.ts` `828ad44d0832089e`.

## Authority (read-only; unchanged, re-verified 2026-11-02T15:00Z)

| File | sha256 |
|---|---|
| `research/study8-expanded-regime-d1/FROZEN_SELECTION.json` | `88d079d15f00553949e23dbd16ea1b5d26c067722da7804a1549400577fa0d2f` |
| `research/study8-expanded-regime-d1/results/test/F24/test.json` | `4053d842ddebb16a2b7f4351baae6e83f0b131deaff04ccdd5a3f7ff6eeba715` |
| `research/study8-expanded-regime-d1/results/test/F24/test-lots.jsonl.gz` | `f06f18b63fc4f4ee0e77b937d0631e63bcb4563e7324a01d5dad05748288eb6b` |
| `research/study8-expanded-regime-d1/results/chain.jsonl` | `8086246b81d50c9dd4b10c83ba0365a8b16942bd1e5d6f4322747b8198445715` |
| `research/study8-expanded-regime-d1/results/doors.jsonl` | `d10b08d7d3f6b936a337c2dd4677d1a7bdb71bc7930db2d32a6d4df522e7e6f4` |
| `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-1.json` | `d0f4d759c7d9cd34…` |
| `config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json` | `27cbadf96b98f5b4…` |
| `config/research-pools/study8-expanded-regime-d1/S8-VXRG-F24-1.json` | `c31031a153703c76…` |
| `config/research-pools/study8-expanded-regime-d1/S8-VXRKG-F24-1.json` | `dec3156f5c1ec3c2…` |
| `config/research-pools/study8-expanded-regime-d1/S8-VXR-F24-1.json` | `8700d6f347c08172…` |
| `config/pools/B5.json` | `deef53ca53111806…` |
| `data/{VGT,XBI,XRT,KRE,GDX}/data.csv` | = Study 8 pins (`624e4094…`, `83b71f75…`, `c625ca57…`, `fd7ab8aa…`, `134b7450…`), end 2026-10-29 |

Study 8 integrity, recomputed read-only by `evaluations/study8-runner-verification/20261102/digests.ts`:

- constants: OK;
- code `3d0cb5b82ca1`: accepted (E1);
- engine `2b5c5dc4a113`: accepted.

`npm run study8 -- verify-chain` exits 1 only on the user's `distributions.csv` (30feaa99 ≠ pin 3b4342eb), as already
recorded in AMENDMENTS E4 and RUN_COMMANDS.

## Mapping (verified against FROZEN_SELECTION.json and the F24 test record)

| User name | Alias | Sealed ID | Config | Net / minute DD to 2026-10-29, 5 bps | Lots |
|---|---|---|---|---|---|
| #1 VG profit | `s8-vg-profit` (= `s8-vg-best`) | `VGT:d1-f41ebcd961+GDX:d1-016d8e4257` | `S8-VG-F24-1` | $308,741.85 / $31,225.43 | 56 (1 open) |
| #2 VG balanced | `s8-vg-balanced` (= `s8-vg-3`) | `VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d` | `S8-VG-F24-3` | $340,147.67 / $21,303.61 | 48 (1 open) |
| #3 VXRG profit | `s8-vxrg-profit` (= `s8-vxrg-best`) | `VGT:d1-61be86f1a1+…+GDX:d1-ca3c80373a` | `S8-VXRG-F24-1` | $252,513.36 / $21,192.20 | 58 |
| #8 VXRKG profit | `s8-vxrkg-profit` (= `s8-vxrkg-best`) | `VGT:d1-28ce3e131c+…+GDX:d1-9c73f00f55` | `S8-VXRKG-F24-1` | $258,886.05 / $25,615.63 | 62 |
| #15 VXR profit | `s8-vxr-profit` (= `s8-vxr-best`) | `VGT:d1-05f07225ab+…+XRT:d1-8424f14c77` | `S8-VXR-F24-1` | $234,146.42 / $22,019.97 | 40 |
| B1 | `vgt-primary` | B1 | `S7R-B1` | $176,260.47 / $19,534.41 | 21 |
| B5 | `b5-frozen` | B5 | `config/pools/B5.json` | $484,636.97 / $26,509.97 | 95 (1 open) |

## Verification (logs in git-ignored `evaluations/study8-runner-verification/20261102/`)

- **Static checks:** `npx tsc --noEmit -p .` clean; `npx eslint src/study8-runners` clean.
- **Unit tests:** `node --experimental-transform-types --disable-warning=ExperimentalWarning --test
  --test-timeout=600000 src/study8-runners/tests/*.test.ts src/study8-expanded-regime-d1/tests/study8.test.ts
  src/study7-runners/tests/runners.test.ts`: 35/35 pass (`logs/unit-tests.txt`).
- **Final batch (`final/`, 2026-11-02T15:03:53Z–15:06:02Z):**
  - `list` exit 0;
  - all seven `run` commands exit 0, each reconciliation PASS (lot by lot, 0 mismatches), export check PASS, MFE
    replay verified on every lot;
  - the seven-way compare exit 0: `evaluations/study8-runs/20261102T150500Z-compare/`;
  - an unknown alias, `--end 2026-10-30` and `--end 2026-02-30` each exit 2.
- **Independent check:** all 380 lots of the seven strategies equal the sealed `test-lots.jsonl.gz` ledgers: symbol,
  entry/exit minute, net, interest, costs, open flag and MAE; net and MAE bit-exact. B1/B5 are also checked against
  `control:B1`/`control:B5`.
- **Reproducibility:** three runs (two compares plus the individual runs), and the final batch versus the earlier
  one, give byte-identical trades/lots/signals/daily/monthly/yearly files and an identical `compare-yearly.csv`.
- **Explicit `--end 2024-12-31` compare:** all 7 reconciliations n/a; B1 $135,359 and B5 $412,651, equal to
  RUN_COMMANDS §3.
- **`--cost-bps 10`:** reconciliation n/a.
- **Non-overwrite:**
  - an existing `--out` is refused (exit 2), and the earlier directory is unchanged (hash);
  - `--out research/…` is refused.
  - **Found and fixed:** two concurrent runs started in the same second shared one directory, a race in the inherited
    directory picker. The evidence is kept in `race-evidence/`. After the fix, 4 concurrent runs get 4 distinct
    directories, all PASS.
- **Extension (scratch mirror only; canonical data never modified; `logs/extension/`; helper `extend.py`):**
  - **A — a full synthetic 2026-10-30 session in all five files:**
    - files are reported as "pinned file + N appended bytes (prefix verified)";
    - the default end is 2026-10-30, reconciliation n/a, with the NEW LOCAL DATA label;
    - `--end 2026-10-29` still gives PASS, trade by trade;
    - the seven-way compare cuts off at 2026-10-30, all n/a.
  - **B — 2026-10-30 appended only to 11:00 ET:**
    - the default end stays 2026-10-29 (PASS);
    - `--end 2026-10-30` is refused, naming the partial day;
    - the unchanged Study 7 runner would have ended on the partial day.
  - **C — only VGT extended:** B1 ends 2026-10-30 (n/a); VG balanced and the seven-way compare end 2026-10-29 (PASS),
    limited by the other four files.
  - **D — one 2019 VGT bar altered:** the file is flagged "DIFFERS from the Study 8 pinned file"; B1 reconciliation
    FAIL, exit 1 (a true failure, not a false pass).
- The run directories created by this task are under `evaluations/study8-runs/20261102T14*` and `20261102T15*`.

## Guards

- Do not edit:
  - `src/study8-expanded-regime-d1/`, `src/pools/`, `src/portfolio-aware-d1/`, `src/lib/`, `src/study7-runners/`;
  - the sealed records under `research/`;
  - `config/research-pools/`, `config/pools/`, `config/phenotypes/`, `data/`, `config/market-events/`.
- Never run a Study 8 stage command other than the read-only `verify-chain`.
- Never commit the user's `config/market-events/*` changes or the `._.DS_Store` files.

## Disclosures

- **Race found and fixed.** The runner's earlier default output picker (`fs.pathExists` then a later write) let two
  runs in the same second share a directory. It is now fixed in the Study 8 runner by an atomic `mkdir`. The Study 7
  runner's `newOutputDir` still has the race; it is out of scope and unchanged.
- **Calendar limit.** The shared NYSE calendar ends 2026-12-31; data after it is ignored and flagged. Extending it is a
  separate change to shared code.
- **MFE is a replay.** It is not an engine-recorded figure. It is reported only where the replay reproduces the
  engine's MAE, its time and its mark count exactly (all 380 lots of the seven strategies).
- **Git needed.** B1 and B5 need the git checkout: frozen-source checks use `git show`. Mirror runs used
  `GIT_DIR=<repo>/.git`, read-only.
