# RESEARCH_RECOVERY — Priority 6: TSLA D1 + Growth (study `research/tsla-d1-growth/`)

## Top screen

- **Updated:** 2026-11-25T23:03Z (clock, UTC). **Status: COMPLETE.** Research, reports, verification and the handoff ZIP are done
  and pushed. Determination **NO QUALIFYING TSLA CANDIDATE**. The G
  and C primaries are development-qualified without chronological support (disclosure D1). Nothing was adopted or
  deployed; MSFT was not started.
- **Protocol:** `PROTOCOL.md` P6-TSLA 1.0.0 **FROZEN**, sha256 `d5d462dc906910df4c2372021a44966db633f27019d0d93f9d04758e6686b62e`.
  - Freeze record `results/protocol-freeze.json` `d197e9d73feec2edd2f9c250640d22310118977bcdfa31943c3b9103bfbbfe97`
    (commit `b2667d83`); gates `results/engineering/gates.json` `4bf79aa97d6ae00cf4d66d2ef672889a898fca731773fabaa568c13ef7a0923b`
    (E1–E9 pass).
  - Amendments (`AMENDMENTS.md`, append-only): pre-freeze E1, E2. After the freeze: **A1**, a code defect fix, commit
    `fa18250a`; sealed `results/amendments/A1.json` `84557f0c53db4979556db4e4491b17a121eae658949723952628da74bd483024`;
    code digest `418a8758…` → `fb7e6ddc5dee614b9112f52acc03c8f18ce02f6dd1f9d0f7570147c58ac84fd0`. And **D1**, the
    outcome join disclosure, 22:45Z.
- **Sealed end records:**
  - C24 selection `results/selection/C24.json` `d1e833b37841bfb121a78816f2874687651277cb64531d62f176a8f35bd48f8a` (`1b77da5c`);
  - `FROZEN_SELECTION.json` `0ebb6b62ad95b1bdb9b6fb14a4a50f38ddceb49ba86b045d3cd34ef53e1a8791` (`46e42cb8`);
  - FULL authorization `results/doors/FULL-authorization.json` `ed0bbe4057c12c391d5c7e27cb0cc436460a27da6dc856b8af6ea42ad479a58d` (`5b041bb5`);
  - validation `results/validation/validation.json` `b0f654009960fbaca6debdb0a803885083d2a5428e206ff3234b647e126ff63f` (`567dfe78`);
  - outcome `results/outcome.json` `a414631e41da8285f6785e2f98dc92bca0244b24fb149da534ba36a18463bf79` (`45ab7699`).

  `GPU_POLICY_PURPOSE=official-optimization npm run tsla -- verify` gave **163 seals ok, 0 failed** (2026-11-25T23:01Z).
  The research preflight PASSed at 23:00Z.
- **Outcome join defect (disclosure D1).** `outcome.ts` joins the validation rows by a label that `preDetermination`
  overwrote, so the sealed outcome shows `validation: null` and `developmentOnly: []`. The candidate list is
  unaffected. By id (`tools/tsla-d1-growth/outcome-join.py` → `reports/tables/outcome-join.json` `df18bd93…`), G
  `C24/G/refine/G.h2.s1/R101#1 profit` and C `C24/C/pair DF1×GF3` are development-only. The sealed records and
  `outcome.ts` are unchanged (U6).
- **Running:** nothing.
  - The chain unit `tsla-chain` ran 12:21:57Z → 22:36:17Z (`CHAIN COMPLETE`), with one stop at 13:58:13Z for A1.
  - Diagnostics `bh`, `tail` and `lots` ran 22:39:02Z–22:39:18Z, and `nbhd` (unit `tsla-nbhd`) 22:39–22:40Z. All exit 0.
  - `analyze.ts`, `tables-md.ts`, `arm-reports.ts`, `gpu-jobs.py` (exit 0: 82/82 jobs) and `search-report.py` ran.
  - `jobzstd.py final`: 82/82 archives OK, 184,765,423,616 → 12,332,527,957 bytes (`storage/TSLA_JOB_POST_VERIFY.json`
    `454b5bb6…`).
- **Handoff ZIP:** `research/tsla-d1-growth/bundle/tsla-d1-growth-handoff.zip`.
  - sha256 `a29a51273f15019a49d8175ce1cfc55085886e38ae0f3abd4b2df00e7d0caa5a`; 4,180,819 bytes; 775 files.
  - Built 2026-11-25T23:02:56Z from `447ac7ce` (remote-verified).
  - `zip -T` OK; all checksums OK after extraction; the secrets scan is clean (`bundle/VERIFICATION.md`, `bundle/SHA256.txt`).
  - It is committed in the commit after `447ac7ce` on `research/tsla-d1-growth`; verify with `git ls-remote`.
- **Follow-up gate: the user's decisions only** (`DECISION_REGISTER.md` §U).
  - U5: G and C are development-only; the recommendation is no action.
  - U3: whether a new TSLA study with a precommitted bound on single-lot loss is wanted.
  - U4: MSFT.
  - U6: the `outcome.ts` join.
  - U7: keep this study's archives.
  - U1, U2.

  No further stage of this study is authorized or needed; do not rerun anything.
- **Recovery performed:** 2026-11-25T22:36Z, after a context compaction during C24. Verified the chain log
  (`CHAIN COMPLETE`), the sealed records, the remote (it was `e13184c5` and was pushed to `460048bc`) and that no unit
  was active.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch **`research/tsla-d1-growth`** (from `dc023c3b`), pushed to
  `origin/research/tsla-d1-growth`. `main` untouched. `.git/info/exclude` hides `research/gpu-phase8/`,
  `research/vg-l0-staged-stop/` (never stage).
- GPU acceptance `bb0e3fcf…` VERIFIED; first official attestation (C19-D-broad): all 16 checks, parity mini-set 18/18 on
  the TSLA door. Node 24 `--no-maglev`. Alpaca credentials only in the git-ignored `.env`.

## Stages

| Stage | Status | Record |
|---|---|---|
| 0 / 0A storage | complete | `STORAGE_PRESERVATION_REPORT.md`, `storage/*` (29/29 P5 archives; 179.8 GB recovered; other caches audited, nothing deleted) |
| 2 data | complete | `TSLA_DATA_AUDIT.{json,md}`, `data/*` |
| 3 functionality audit | complete | `FUNCTIONALITY_AUDIT.md` |
| 4 protocol | **frozen** 12:20Z | see the top screen |
| 5 engineering | complete | E1–E9 sealed (`results/engineering/`) |
| 6 C19 | **complete** 14:24:35Z (A1 at 14:01Z; C19-S-refine then ran) | selection `b41af173…`, slice `8ce42df6…`, frozen D1 `a2f2017c…`, pairs `2318780e…`; per arm C `38d484a2…`, D `5dbf7571…`, G `c9817da9…`, J `e0c0b868…`, S `eae07a2e…` (all under `results/`; zstd of the C19 job archives committed `c5ae888e`) |
| 6 C21 | **complete** 16:34:18Z | selection `18b591c5…`, slice `46495615…`, frozen D1 `1b712383…`, pairs `4ffb0de1…`; per arm C `c361e101…`, D `f5835e8e…`, G `ad98ccb2…`, J `f5db5652…`, S `67dcf9c2…` (zstd committed `c7bdd111`) |
| 6 C23 | **complete** 19:46:18Z | selection `a4056d8d…`, slice `c179935d…`, frozen D1 `2a39a235…`, pairs `6992372a…`; per arm C `41c127fa…`, D `66088ada…`, G `afc56360…`, J `0692ce1f…`, S `eef92bb6…` (zstd committed `3f1c019b`) |
| 6 sequential | **complete** 19:43:21Z | `results/sequential.json` `2a1079a0…` (commit `8ab3f216`): D, G, C, J, S all **unsupported** (sequential DD > $35,000; nets positive) — see `reports/narrative/NOTES.md` |
| 6 C24 | **complete** 22:32:48Z | selection `d1e833b3…` (`1b77da5c`); per arm C `eda88ef6…`, D `350e9076…`, G `255cdec4…`, J `8629a9a1…`, S `f65c427a…`; frozen D1 `b8a55d90…`; pairs `24dd213b…`; zstd of the C24 job archives committed `460048bc` |
| 6 frozen selection, FULL authorization | **complete** 22:32:49Z | `FROZEN_SELECTION.json` `0ebb6b62…` (`46e42cb8`); `results/doors/FULL-authorization.json` `ed0bbe40…` (`5b041bb5`) |
| 6 validation (once) | **complete** 22:33:26Z | `results/validation/validation.json` `b0f65400…` (`567dfe78`); job `C24-validation`, 9,044 evaluations; first TSLA FULL door entry 22:32:55.712Z |
| 6 outcome | **complete** 22:33:27Z | `results/outcome.json` `a414631e…` (`45ab7699`): NO QUALIFYING TSLA CANDIDATE (join defect: `AMENDMENTS.md` D1) |
| 7 diagnostics | **complete** 22:39–22:40Z | `reports/diagnostics/{buy-and-hold,tail-stress,lots,nbhd-small-wide}.json`, `nbhd-D24-receipts.jsonl` (FULL door entries 22:39:07Z, 22:39:16Z; nbhd on D24) |
| 7 tables and reports | **complete** 23:02Z | `reports/tables/*` (analyze.ts, tables-md.ts, gpu-jobs.py, outcome-join.py), the arm reports, `SEARCH_AND_CONVERGENCE_REPORT.md`, `READ_FIRST.md`, `REPORT.md`, `COMPARISON.md`, `FINAL_CANDIDATES.md`, `CHRONOLOGICAL_VALIDATION.md`, `ROBUSTNESS_AND_RISK.md`, `GPU_PARITY_AND_ACCEPTANCE.md` §4, `DECISION_REGISTER.md` (D1, R4, R5, U3–U7) |
| 7 job archives | **complete** 22:41:47Z | `storage/TSLA_JOB_POST_VERIFY.json` `454b5bb6…` (82/82 OK) |
| 9 handoff ZIP | **complete** 23:03Z | `bundle/tsla-d1-growth-handoff.zip` `a29a5127…` (from `447ac7ce`); `bundle/VERIFICATION.md` |

## Constants

Seeds `deriveSeed('tsla-d1-growth', …)`; replicates from R101 (D 4, G 8, J 4, S R_S(F) = max(4, ⌈160/(6F)⌉)); rounds ≤ 4
at 2 %; refinement 4 lanes per refined cell (quotas D 8, G 6, J 16, S 12; ≤ 24 seeds); per-lane bounds 90,000 / 174,000;
hard ceiling 120 M requested; doors D19/D21/D23/D24 training, slices D21/D23/D24, FULL once (validation).

## Guards

- **Do not rerun** a sealed stage (the code refuses). Do not edit the protocol, sealed records or other studies.
- FULL opens only through the chain's validation after FROZEN_SELECTION.json and the FULL authorization are committed.
- Priority 5's archives: restore with `zstd -d -q <arc>.zst -o <arc>` before any read.
- No broker, deployment, merge into `main`, MSFT.

## Tool readiness (during the chain; no official record touched)

- 2026-11-25T12:31Z `storage/tools/jobzstd.py` tested end to end on the completed job C19-D-broad with `--keep-original`
  and a SCRATCH actions file (session scratchpad): z-verified, integrity ok, 96/96 sealed ids reproduced, 1,927,417,856 →
  132,096,152 bytes in 6 s; the test `.zst` was removed (single file) so the chain's own run starts clean.
- `tools/tsla-d1-growth/diagnostics.ts` gained `TSLA_DIAG_TEST=D19` (C19 selection, door D19, CPU nbhd, outputs to
  git-ignored `cache/diag-test/`) to exercise bh/tail/lots/nbhd before the validation. **Run 2026-11-25T14:25:44Z–14:25:58Z
  after C19's selection was sealed: all four exit 0** (bh: unfinanced 2016-01-04 → 2019-12-31 +$81,155.09, financed
  +$37,245.50 = −$43,909.59 of 11 % simple interest, as computed by hand; tail, lots: every C19 subject; nbhd: 5 arm
  primaries × small/wide on the CPU, 4 workers). Door log entries labelled "ENGINEERING TEST" (D19, use diagnostic). `analyze.ts` (tables JSON/CSV), `tables-md.ts` (TABLES.md) and `bundle.sh` (handoff ZIP) are written;
  tools type-check (scratch tsconfig over tools/ + src/tsla-d1-growth) and lint clean. `engineering.ts` line 438: a
  type-only cast fix (`as unknown as`), erased at run time.
- Git while the chain runs: read-only commands with `GIT_OPTIONAL_LOCKS=0`; commit only while a long stage is running
  (the chain commits between stages; an index.lock collision would stop it — then relaunch, it is idempotent). Do not
  edit package.json or the protocol documents during the chain (`dirtyCode` checks them).

## Disclosures

- **A1 (after the freeze):** C19-S-refine stopped at 13:58:13Z before any job or evaluation: the arm S refinement lane
  builder did not register the sealed frozen D1 finalists. Three-line fix (`ensureFrozen` for arm S, as every other S
  reader does), sealed code amendment, no rule or result changed; details and checks in `AMENDMENTS.md` A1.
- **D1 (after the outcome):** the sealed outcome's validation join is empty (label collision in `outcome.ts`); the
  candidate list is unaffected; by finalist id the development-only list is G's and C's primaries (`AMENDMENTS.md` D1).
- Report-only tool changes R1–R5 (`DECISION_REGISTER.md` §F).

- P5 compressor smoke-test attribution fix (one conservative blocker); E2–E6 first runs on an earlier code digest (rerun
  on the final code); the cost-based R_S draft replaced pre-freeze; Playwright e2e timing races (reported beside E8).
