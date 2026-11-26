# WORK_RECOVERY — TSLA outcome-reporting identity fix (pre-GDX engineering assignment)

## Top screen

- **Updated:** 2026-11-26T14:32Z (clock, UTC). **Status: INCOMPLETE — stage 5 (commits, push, clean-clone replay, ZIP).**
- **Task:** correct the post-seal outcome join defect of Priority 6 (`research/tsla-d1-growth/`, disclosure D1, decision
  U6) in `src/tsla-d1-growth/outcome.ts`; engineering and verification only. Brief: `BRIEF.md` (this directory), sha256
  `88b70d9ef6761f49ec7f94c9e6bf68611f6423757a7d70ffbcfbb268a2171a92` (111 lines, read in full).
- **Not authorised and not started:** GDX, MSFT, any new TSLA search, genetic optimization, paper trading, broker
  activity, deployment, merge into `main`.
- **Running:** nothing.
- **Next command:** see the stage table (first incomplete row).

## Environment

- Main checkout `/home/chad/projects/margin-trading`; single worktree.
- Branch **`fix/tsla-outcome-identity-join`**, created 2026-11-26T14:08:41Z from `research/tsla-d1-growth` at
  **`421e4c87780844e4e49c079586aa5c4945cc9e35`** (the Priority 6 handoff commit; working tree clean at start).
- Node 24.21.0 (`.node-version`); every Node process runs with `--no-maglev`.
- GPU at start: no compute process except the desktop daemon. No Strategy Lab server (`server/main.ts`) was running.

## Authority and baseline (must not change)

`evidence/baseline-before.json` (sha256 `619073ae…`) records, at `421e4c87`:

| Item | Value |
|---|---|
| `git rev-parse HEAD:research` | `06032071eb528351d45ea55a2610fc57f4253d7b` |
| `git rev-parse HEAD:research/tsla-d1-growth` | `181594ff0fe5cabc5961b1b046a0477eccfe1d1c` |
| `results/outcome.json` (sealed, 0444) | `a414631e41da8285f6785e2f98dc92bca0244b24fb149da534ba36a18463bf79` |
| `FROZEN_SELECTION.json` (sealed) | `0ebb6b62ad95b1bdb9b6fb14a4a50f38ddceb49ba86b045d3cd34ef53e1a8791` |
| `results/validation/validation.json` (sealed) | `b0f654009960fbaca6debdb0a803885083d2a5428e206ff3234b647e126ff63f` |
| `results/sequential.json` (sealed) | `2a1079a0a9d1e6dea4cd9d809e1a0413794ccc41152a02a975105c7210f28ce8` |
| `reports/tables/outcome-join.json` (report-only) | `df18bd93e85f145419ab83342707e9de51025f7f2c741cda186870c144ca0cb2` |
| TSLA seals (`results/seals.jsonl`) | 163 / 163 verify (hash + read-only) |
| TSLA code digest (import closure of `main.ts`) | `fb7e6ddc5dee614b9112f52acc03c8f18ce02f6dd1f9d0f7570147c58ac84fd0` (= the sealed A1 chain head) |
| GPU evaluation (compat) digest | `d1a2e490788fa5fa76a277719dfb623c2cc896de85cf95f739c3e3af184e233b`; closure has no TSLA / outcome file |
| `config/gpu-backend/acceptance.json` | `bb0e3fcf…`; `tools/gpu-backend/verify-acceptance.sh` **VERIFIED** (`evidence/verify-acceptance-before.txt`) |

## Design decisions (written before editing)

- Join key: `(arm, id)` — the finalist `id` (Evidence id) and arm are carried unchanged by `FROZEN_SELECTION.json`
  (`finalists`, `preDetermination.finalists`) and by every validation row; all 28 selected validation rows are unique by
  `(arm, id)`, by `id` and by `(arm, label)`.
- Fail closed (`IdentityJoinError`) on: malformed identity, duplicate finalist identity, duplicate eligible row identity,
  missing row, row under another arm (cross-arm), conflicting candidate label, malformed V1–V3.
- Rows with `kind` other than `selected` (the external controls) are never finalists and are excluded from the join.
- `label` in `preDetermination` keeps its sealed meaning (the governance label); a new `candidateLabel` carries the
  candidate's own label and a new `governanceLabel` names the status explicitly. `outcomeOf` lists candidates and
  development-only finalists by candidate label (taken from the matched row; when the finalist carries `candidateLabel`,
  it must equal the row's label).
- Generic join in a new module `src/research-outcome/identityJoin.ts` (outside the GPU evaluation and enforcement
  manifests), reusable by the GDX/MSFT studies.
- Nothing under `research/` changes. Engineering outputs go only to this directory; the replay tool lives in
  `tools/tsla-outcome-identity-fix/`.
- Consequence to document: editing `outcome.ts` changes the TSLA code digest; no code amendment is sealed (that would
  append to the study's sealed records); the study's official stages therefore stay refused (fail closed), and the
  historical study verifies at `421e4c87`.

## Stage table

| # | Stage | Status | Evidence |
|---|---|---|---|
| 0 | Read brief, CLAUDE.md, recovery guide, study docs and code; branch; baseline | complete 14:10Z | `evidence/baseline-before.json`, `evidence/verify-acceptance-before.txt` |
| 1 | Reproduce the defect with a focused test (red, before the fix) | complete 14:12Z | `evidence/repro-before-fix.txt` (2/2 fail: `validation` null; `developmentOnly` [] vs G, C) |
| 2 | Implement the identity join + patch `outcome.ts` | complete 14:15Z | `src/research-outcome/identityJoin.ts`; `src/tsla-d1-growth/outcome.ts` (`governedFinalists`, `candidateLabel`/`governanceLabel`, `outcomeOf` by (arm, id)) |
| 3 | Focused tests green; report-only replay | complete 14:18Z | 37 new tests + study suite = 55 pass; replay `replay/outcome.corrected.report-only.json` sha256 `6b923ff2…`, 18/18 checks; rerun "unchanged" |
| 4 | Regression: npm test, tsc, eslint, preflight, seals, acceptance, Strategy Lab | complete 14:19:43Z → 14:31:15Z (unit `tslafix-tests`, exited) | `chains/tests.sh` → `evidence/tests/*.txt`: focused 197/197; npm test 1,879 = 1,868 pass + **the 7 known** + 4 skipped; tsc 0; eslint 0 errors; 30/30 preflights; 163/163 seals; acceptance VERIFIED; fingerprint: only `outcome.ts` differs; replay rerun identical; portfolio parity ALL VERIFIED; SL typecheck/lint/Vitest 314/build/e2e 81 pass; SL state and dist unchanged |
| 5 | Handoff docs, commit, push, ZIP, verify, final commit/push | not started | |

## Guards

- **Do not** modify, regenerate, re-hash, chmod or rerun anything under `research/tsla-d1-growth/` (sealed records,
  reports, bundle) or any other study; do not run any `npm run tsla -- <stage>` other than `verify`.
- Never build Strategy Lab into `apps/strategy-lab/dist` (live server distribution); scratch outDir only; never touch
  `state/strategy-lab/`.
- No force-push, no merge into `main`.

## Disclosures

- (none yet)
