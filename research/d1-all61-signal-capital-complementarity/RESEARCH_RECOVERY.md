# RESEARCH_RECOVERY — Study 2 `d1-all61-signal-capital-complementarity-v1`

## Top screen (read first)

- **Updated:** 2026-10-28T15:17Z (UTC, from `date -u`; after the push).
- **Task:** Study 2 of 3 — all-61-ETF D1 signal timing, opportunity overlap and shared-capital complementarity.
  Brief (verbatim): `brief/STUDY_2_BRIEF.md` (sha256 `d0db822a85aa6382a08d49acb881c96d13634b182f80ebfa89a5e3cdcd23d043`).
- **Status: COMPLETE.** Study commit **`1accc9a2fcd2afc05e4df8c5bc799c837eb04689`** pushed 2026-10-28T15:17Z to
  `origin/research/d1-all61-signal-capital-complementarity` (new branch; `git ls-remote` shows the same hash);
  `verify` passes after the commit. Verdict (frozen rubric,
  `results/analysis/ANALYSIS-2.json`): **no demonstrated economically useful complementarity** (0 of 18 fold replays meet
  C; 16 meet R; 2 formal reshuffle gains, both the XOP timing-only control).
- **Protocol:** `PROTOCOL.md` v2.1 FROZEN 2026-10-28T13:59:38Z (`PROTOCOL_FREEZE.json` bodyHash `a8180f13dbc4…`, protocol
  sha256 `bf58bbdadb91…`). **Amendment head: C2** (C1 analysis bookkeeping, C2 test only; `AMENDMENTS.md`,
  `results/amendments.jsonl`). Code freeze chain v1 `9f3488b0b2c1…` → v2 (C1) `5032a9a8b367…` → v3 (C2) `7c551d3d7767…`.
- **Stages complete (all sealed, all verify):** audit, protocol freeze, parity (512/512), code freeze, screen A, screen B,
  signals ×3, Level D, replays (25), risk, analysis (v1 superseded), analysis v2. Reports and reviews complete.
- **Running:** nothing.
- **Next command:** none for Study 2. **Do not rerun any stage.** (This checkpoint update is the branch's second
  commit.)
- Study 1 completed; Study 2 completed (research); Study 3 not started — not to be started here.

## Environment

- Repository `/home/chad/projects/margin-trading` (main checkout; no extra worktree), branch
  `research/d1-all61-signal-capital-complementarity` from `a37feae` (Study 1 HEAD incl. the user's test-name fix).
- Working tree: study folders + one `package.json` script line; untracked macOS `._.DS_Store`, `._data` are unrelated and
  never committed. Node v24.21.0; 16 cores; stages ran with `--max-old-space-size=24576`.
- No `.env`, network, broker or credential access.

## Authority and sealed records (bodyHash prefix)

audit `35c26a68c0f4`; protocol freeze `a8180f13dbc4`; parity `64412204e364`; code freeze v1 `9f3488b0b2c1`; screen A
`79726cfad81f`; screen B `c0c36470d976`; signals 2020-06-30 `e67e34ba0a92`, 2021-12-31 `824ae6c75359`, 2023-12-29
`b367c26ab81a`; Level D `1467a835efc9`; replays `22ebb7b55d60`; risk `29e6251b8e77`; analysis v1 `8d62993c8953`
(superseded); code freeze v2 `5032a9a8b367`; analysis v2 `b857e2800f46` (governing); code freeze v3 `7c551d3d7767`.
File sha256s in `IMPLEMENTATION_AUDIT.md` §2. `npm run d1-signal-complementarity -- verify` rechecks all of them.

## Stage table

| Stage | Status | Command (repo root) | Output | Resume semantics |
|---|---|---|---|---|
| 0 audit | complete 13:52Z | `npm run d1-signal-complementarity -- stage audit` | `results/audit/`, `results/registry/` | write-once |
| 1 protocol freeze | complete 13:59Z | `… stage freeze-protocol` | `PROTOCOL_FREEZE.json` | write-once |
| 2 parity, code freeze | complete 14:10Z / 14:12Z | `… stage parity`, `… stage freeze-code` | `results/parity/`, `results/code_freeze.json` | write-once |
| 3 screens | complete 14:15Z / 14:17Z | `… stage screen-A`, `… stage screen-B` | `results/screen/` | write-once; B needs A |
| 3–4 signals | complete 14:20–14:25Z | `… stage signals-<end>` (3 ends) | `results/signals/` | write-once; determinism vs screens |
| 4 Level D | complete 14:25Z | `… stage leveld` | `results/leveld/` | write-once |
| 5 replays, risk | complete 14:28Z / 14:33Z | `… stage replays`, `… stage risk` | `results/replays/`, `results/risk/` | write-once |
| 6a analysis | complete 14:34Z; C1 rerun 14:39Z | `… stage analysis` (+ `freeze-code-correction --amendment C1`) | `results/analysis/ANALYSIS{,-2}.json` | write-once per code-freeze version |
| 6b reports, reviews | complete 15:16Z | `python3 -I research/d1-all61-signal-capital-complementarity/scripts/report_tables.py` | `results/tables/`, reports, `reviews/` | rerunnable, read-only |
| 6c commit/push | complete 15:17Z | `git commit`; `git push -u origin research/d1-all61-signal-capital-complementarity` | commit `1accc9a` | — |

## Constants

PROTOCOL v2.1 §3–§9 (windows T/A/B/preA/preB, caps 2021-12-31 for fold-a vectors and 2023-12-29 otherwise, 5 bps / 11%,
0/2/5/10 + s25, $35,000 reference, 30/35% portfolio references, w = 10 sessions families, 252-session independence,
screen gates and roles). No random seeds (deterministic).

## On disk versus in memory

Everything is on disk. Command logs in `results/logs/` are local (git-ignored).

## Guards

- Do-not-rerun: every stage above (write-once, sealed). Do not edit `PROTOCOL.md` or any sealed record.
- No merge, PR, force push or tag (brief §11). Nothing further is authorised for Study 2.
- Study 3 not started; Study 1 closed.

## Disclosures

See `CHRONOLOGICAL_AND_MULTIPLE_TESTING_LIMITS.md` §5 and `IMPLEMENTATION_AUDIT.md` §6: designer's prior knowledge;
pre-freeze checks on published scalars; the outcome-free smoke test; the screen-gate bug caught by a test before the
code freeze; C1 (and its late-disclosed `freeze.ts`/`cli.ts` scope), C2, note N1; report corrections from the results
review. Recovery events this session: none (no compaction or interruption observed).
