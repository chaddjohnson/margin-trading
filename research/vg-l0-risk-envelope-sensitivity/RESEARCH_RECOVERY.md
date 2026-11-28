# RESEARCH_RECOVERY — Stage A risk-envelope sensitivity audit (RES-A 1.0.0) — COMPLETE

**Top screen (times from `date -u`)**

- Updated: 2026-11-22T16:45Z. **COMPLETE (Stage A only; no new optimization run).** Every stage is done: S0
  predeclaration, S1 population and qualification replays (zero evaluations), S3 bounded CPU replays (G1, G2, G3), S2
  analysis, tables, reports, regression. The delivery section below records the ZIP and the push.
- Authority: `brief/BRIEF.md` sha256 `5a99e0e0600e674aa398cf31cd2d727e223e5e3c5bf66efcdc10e8d9080ecc43`.
  `PROTOCOL.md` `f22f20e1619dd388d925ee0fe56e2c76b2584cc6717536b35159d2678db86825` and `POLICY_MATRIX.md`
  `345896881e45a55dc496c1fdb90af1d63e733b01a9fecfaab712abf4f3a4e4fb` are unchanged since the predeclaration commit
  `93bc76a3` (pushed before any comparison). Amendments head: **N4** (N1–N4 are disclosures and clarifications; no
  criterion changed).
- Running: nothing (`systemctl --user list-units 'vgl0res*'` shows only the slice).
- Follow-up gate: the user's review of the ZIP; **Stage B needs a separate authorization** (`STAGE_B_OPTION.md`, not
  run). Do not rerun anything below merely because a session is new.

## Environment

| Item | Value |
|---|---|
| Checkout | the main checkout `/home/chad/projects/margin-trading`; no extra worktree |
| Branch | `research/vg-l0-risk-envelope-sensitivity` (from `7f69d0d2`, the pilot's final commit); `main` untouched |
| Node | v24.21.0; every evaluating or replaying process ran `node --no-maglev`, `GPU_POLICY_PURPOSE=diagnostic`, in `vgl0res.slice` (44G / 48G / swap 0) |
| GPU acceptance | `config/gpu-backend/acceptance.json` `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED), untouched; the pilot's gpu-required preflight still PASSes on this tree, so the acceptance is valid on this lineage; no GPU job ran |
| Standard | 3.0.0 `4e8244e6…`, scope diagnostic, preflight PASS |

## Stage table

| Stage | Status | Command (exact: `METHOD_AND_CHECKS.md` §2) | Output and hash | Resume |
|---|---|---|---|---|
| S0 predeclaration | complete; commit `93bc76a3`, pushed 16:01Z | — | POLICY_MATRIX.md, PROTOCOL.md, STANDARD_ADOPTION.json | — |
| archive copies | complete 16:02Z | `cp --preserve=timestamps` of 4 archives | sha256 before = after = copy (table below); integrity ok | redo the copy |
| S1a population replay | complete 16:06–16:07Z (53 s / 48 s) | `population.ts --cutoff C2x` | `.cache/…/population-C21.json.gz` `230ee6c7…`, `-C24` `71078c00…`; lanes = sealed (8 / 8); 0 fresh | deterministic rerun |
| S1b qualification replay | complete 16:07Z | `qualification.ts --cutoff C2x` | `.cache/…/qualification-C21.json.gz` `8006788f…`, `-C24` `038613a0…`; evidence = sealed (26 / 26); 0 fresh | deterministic rerun |
| S3 G3 parity | complete 16:11–16:13Z | `replay.ts g3` | 256 / 256 identical per cutoff | rerun |
| S3 G1 gap fill | complete 16:12:57–16:32:15Z (546 s, 613 s) | `chains/replays.sh` | `results/replays/G1-C21.json.gz` `72c5c131…`, `G1-C24` `97fc6d51…`; 40 + 40 centres identical | rerun (the CPU archive `.cache/…/jobs/G1-C2x` returns archive hits) |
| S3 G2 attribution | complete 16:32–16:35:34Z (92 s, 105 s) | `chains/replays.sh` | `results/replays/G2-C21.json.gz` `6c9a14cc…`, `G2-C24` `7153f9c2…`; 1,534 + 1,704 records identical | rerun |
| S2 analysis + tables | complete 16:35:49Z (final run) | `analyze.ts`, `tables.ts` | `results/analysis-C2x.json`, `TABLES.md`, `summary.json`, CSVs (`results/MANIFEST.sha256`, 24 files); 232 / 232 checks | deterministic rerun |
| regression | complete 16:40Z | preflight `--all`; `node --test` policy + pilot + risk-envelope tests | `results/regression/`: 26 / 26 PASS; 52 / 52 tests | rerun |
| reports | complete 16:45Z | — | READ_FIRST, REPORT, POPULATION_AND_PROVENANCE, METHOD_AND_CHECKS, DECISION_REGISTER, STAGE_B_OPTION, AMENDMENTS | — |

## Archive copies (originals unchanged; never opened)

| Job | sha256 | bytes |
|---|---|---:|
| C21-search | `cdda0ed9ab199b104abe6af693dc30170241b045eeb3b168a60a729737ff227b` | 609,193,984 |
| C24-search | `d0b270f4cbe86269e94d96294a8676822ba96cccb5ddac83bd0333f125f701f8` | 527,859,712 |
| C21-qualify | `f94760421cc1ef81ff49cb96021e9b98885b8d396adef411ec25d85da75aa92e` | 75,014,144 |
| C24-qualify | `78c3809ebe2e775683c5a5de5c56b73858c220d5b6c6a099db75ef36ed67647a` | 75,075,584 |

Assignment 3's `.sqlite.zst` archives were not needed and not touched.

## Deliverables (sha256 at 16:44:44Z)

| File | sha256 |
|---|---|
| READ_FIRST.md | `4aa3c1d30d913d34272bd54c07a8c44d410302d9011b74757de707e3b0e638a6` |
| REPORT.md | `6edcf4e529b50b7dad23e489ff5f497e9d2bca66e04e161a692b1bb3c2c197d2` |
| POLICY_MATRIX.md | `345896881e45a55dc496c1fdb90af1d63e733b01a9fecfaab712abf4f3a4e4fb` |
| POPULATION_AND_PROVENANCE.md | `767e34d523555d98fc35446031c48f5495dfbb95c7387836e98a5f105054aad1` |
| METHOD_AND_CHECKS.md | `c0cb3d8bf2b5538b96050316dc9ecea5fe3c1a9b328991ed388f331fec1be2b2` |
| DECISION_REGISTER.md | `a33a3b71198b4cc2366c02af346fdaae99205ba6258f9260261de93981ee80b8` |
| AMENDMENTS.md | `94dffeb24db085005cdca5cca07b85c5dca920e93fe0bf8b38cbd5d9ce38f937` |
| STAGE_B_OPTION.md | `ed2fb8cfc8565bb23fbbc347dde5cda0e965dce3ddfeb35b1125e58aaa3cb06b` |
| results/MANIFEST.sha256 (covers every results file) | `7849a49394ec3bae6b1d183ce98227f3ffdcba9db66928de9d7eb5719d65a832` |

## Guards and do-not-rerun

- Never write into `research/vg-l0-risk-envelope-pilot/` or its `cache/`. Its 18 sealed files were verified unchanged
  and read-only (16:40Z).
- No GPU job, no official gate, no D23 / FULL door (`results/doors.jsonl`: D21 and D24 only, CPU workers).
- No Stage B without the user's separate authorization.
- Git-ignored state kept for the review: `.cache/vg-l0-risk-envelope-sensitivity/` (archive copies ≈ 1.29 GB, CPU
  archives `jobs/G1-C2x`, `jobs/G3-C2x`, intermediates, logs). Remove only with the user's decision U6.

## Disclosures

- AMENDMENTS N1: the brief's cache path differs from the pilot's actual one.
- AMENDMENTS N2: the rung-3 comparison stage and the G1 set definition were fixed before the comparison.
- AMENDMENTS N3: cent resolution of `dd`, and the tolerances used only in ordering statements.
- AMENDMENTS N4: replay volumes, 37,868 CPU engine passes against the 70,000 cap; the PL / BD tie label.
- One tool command (a heredoc text edit) was refused by the harness's deletion safety check. It deleted nothing; the
  same edit was then made with the editor.

## Delivery

- Handoff ZIP `research/vg-l0-risk-envelope-sensitivity/bundle/vg-l0-risk-envelope-sensitivity-stage-a.zip`, built
  2026-11-22T16:45:46Z by `tools/vg-l0-risk-envelope-sensitivity/bundle.sh` from the tree at `6d3390e4`: sha256
  `7aeb99b2a4802e5010bc0d9de73e42aeb57075c891e51d279ff526706f8b7ae6`, 4,272,170 B, 61 files covered by its
  `MANIFEST.sha256`. Checks passed: `zip -T` OK; every checksum verified after extraction; secret / personal-data scan
  clean; no database or market-data file. The ZIP holds this checkpoint as of `6d3390e4`, before this section. An
  identical copy is in `~/.local/share/margin-trading-gpu/handoffs/`.
- Push: `git ls-remote origin research/vg-l0-risk-envelope-sensitivity` = local HEAD (see the final response); `main`
  untouched; nothing merged.
