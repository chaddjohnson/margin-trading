# Research recovery checkpoint — Study 6: frozen five-ETF B5 robustness audit (KRE diagnosis) + bounded improvement

## Top screen (read this first)

All times UTC (machine clock CET = UTC+1; `ls`/`stat` show local time). Run commands from the repository root.

- **Updated:** 2026-10-30T22:58Z. **Status: INCOMPLETE — Part A complete and sealed; diagnostic checkpoint being
  committed; Part B not started.**
- **Brief:** the user's attached file `Claude_B5_KRE_Robustness_Audit_and_Optimization_Updated.md` (sha256
  `7204c074e14bddeb498cfe2cf51a6c078696d734778d9f5eaf631ac55ffc7055`, 222 lines, 31,605 bytes, read in full
  2026-10-30T22:13Z, final section "Core principle" present). Copy: `brief/ASSIGNMENT.md`. It authorizes
  implementation, execution, verification, and a Git commit and push of a dedicated research branch (no merge, no PR).
- **Authority:** `PROTOCOL.md` sha256 `4e5eab2475c9f0d02b2ff67016cc52aa8a9511b0bd9149d336ea2ec89e0df1fb`, frozen
  2026-10-30T22:41:46Z (`results/protocol_freeze.json` body `34fbd2bc55bb6b49…`, file `b04c731483a7f30c…`). No amendment.
- **Diagnostic checkpoint:** `results/diagnostic_manifest.json` sealed 2026-10-30T22:57:30Z, body
  `1025ca9f8956…`, file `63b31d8fda0e8bb65fc052ed40f2db011d4c29276b918678589aff5f8f64dd82`; findings in
  `DIAGNOSTIC_CHECKPOINT.md`. Part B refuses to run until this manifest is committed (HEAD's copy = disk copy).
- **Part A verdicts:** B1 passes; frozen five-ETF B5 FAILS the joint gate (rep 1: 21.9% < $35k, p90 $55,573; pooled
  26.7%); KRE weakest book (57.5%); driver = KRE hold (freeze hold → 99.1%; X flat).
- **Running process:** none.
- **Next action:** commit the diagnostic checkpoint (this study's files only), then Part B:
  `npm run study6 -- b-track-k main` (and `wf19`, `wf20`), `b-track-o-pa`, `b-track-o-me`, `b-wf-test`,
  then `b-track-j`, then `b-shortlist`, `b-validate`, `freeze-selection`, `final`.

## 1. Environment

- Checkout `/home/chad/projects/margin-trading`, branch `research/study6-b5-kre-robustness` created 2026-10-30T22:23Z
  from `research/study5-gdx-d1-b5-three-etf` at `b4f985714f95fe632eaaee4e04aadd68ff883406`.
- Worktrees: Track O's multi-etf-d1 runs create detached worktrees under
  `$STUDY6_WORKTREES` (this session: `/tmp/claude-1000/-home-chad-projects-margin-trading/6044c48e-663c-4d83-a324-9850987782be/scratchpad/worktrees`);
  the R-OM worktree was removed after its outputs were copied to `results/parity/r-om/`. `git worktree list` shows
  only the main checkout.
- User changes present at start, never to be touched or committed: `config/market-events/distributions.csv`,
  `config/market-events/distributions.manifest.json` (modified), `config/market-events/raw/vanguard-20261030T184421Z/`
  and six `._.DS_Store` files (untracked).
- Node v24.21.0 (`export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`), 16 CPUs, 59 GB.
  Background launches must `cd` to the repository root inside the command (a relative-path launch once failed before
  starting anything; disclosed in §5).

## 2. Baseline hashes (2026-10-30T22:23Z)

| File | sha256 |
|---|---|
| `config/pools/B5.json` | `deef53ca531118064925a64e25288c927f3a71d8a05311075b439087960020fe` |
| `config/pools/B4.json` | `4ca5aa1a900bc9596007c914a333ff13b0a0e14df32e3d8ba5b7ce16638edf40` |
| `config/phenotypes/D1/{VGT,XBI,XRT,KRE,GDX}.json` | `3e77a419…`, `453c4fd0…`, `d7b7f222…`, `6b8889e2…`, `ed98c23c…` |
| `research/portfolio-aware-d1-optimization/FROZEN_SELECTION.json` | `16c91895…` |
| `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` | `0dabd97e…` |
| `research/study5-gdx-d1-b5-three-etf-2026-10/FROZEN_SELECTION.json` | `3837d814…` |
| `research/multi-etf-d1/FROZEN_CANDIDATES.json` | `94b0b646…` |
| `data/{VGT,XBI,XRT,KRE,GDX}/data.csv` (through 2026-10-29) | `624e4094…`, `83b71f75…`, `c625ca57…`, `fd7ab8aa…`, `134b7450…` |
| `data/partitions.json`, `config/market-events/splits.json` | `43893f3d…`, `e5bde427…` |
| `config/market-events/distributions.csv` (working tree, user-modified; not read by the fixed pool's P&L) | `30feaa99…` |

## 3. Stage table (all Part A stages are write-once; a stage whose sealed JSON exists must not be re-run)

| Stage | Status | Command | Record (body hash, first 12) |
|---|---|---|---|
| S0 protocol | complete 22:41:46Z | `npm run study6 -- freeze-protocol` | `results/protocol_freeze.json` 34fbd2bc55bb |
| S1 parity P1/P3/P5 | complete (P1 0 diffs ×30; P3 anchor exact; P5 8/8) | `npm run study6 -- parity` | `results/parity/parity.json` 8f658a091285 |
| S2 data | complete (prefixes = pins) | `npm run study6 -- data` | `results/data/data-audit.json` bf2471cb331e |
| A1 evidence | complete | `npm run study6 -- a1` | `results/partA/A1-evidence.json` ff00d14eaa93 |
| A2 baseline | complete | `npm run study6 -- a2` | `results/partA/A2-baseline.json` c4f2d22bd55d |
| A3 WDEV/W23/W13/W29 | complete (2,241 / 10,937 / ~11k / ~11k runs) | `npm run study6 -- a3 <W>` | 3b830da7c894 / eec4ced29d57 / see manifest |
| A4 WDEV/W23/W29 | complete | `npm run study6 -- a4 <W>` | 3b7fb6deaa14 / c14f94bdde78 / 69418aee283c |
| A5 B1 | complete | `npm run study6 -- a5` | 4d6b2afb6e99 |
| A6 ablations | complete | `npm run study6 -- a6` | see manifest |
| A7 events | complete (236 breach scenarios, 5 walkthroughs) | `npm run study6 -- a7` | 72f298ab9937 |
| A8 execution | complete | `npm run study6 -- a8` | see manifest |
| P4 (Track O parity) | complete PASS | `npm run study6 -- p4` | `results/parity/p4.json` |
| R-OM (multi-etf-d1 reproduction) | complete PASS (22,349 candidates, IDs and metrics identical) | `STUDY6_WORKTREES=<scratch> npm run study6 -- r-om` | `results/parity/r-om.json` |
| A9 diagnostic checkpoint | sealed 22:57:30Z; commit pending | `npm run study6 -- diagnostic-freeze` | `results/diagnostic_manifest.json` 1025ca9f8956 |
| Part B | not started | see top screen | — |

Resume semantics: every stage is deterministic and all-or-nothing (sealed JSON written last). If a stage dies, delete
its partial CSVs (the directory named in its code) and rerun the same command; record the rerun here.

## 4. Guards

- **Do not rerun** S0–A9 (sealed). Never edit `PROTOCOL.md` above §13 (amendments are appended to §13 only).
- Never edit frozen files (B4/B5 pools, D1 phenotypes, earlier studies' records, `data/`, market events).
- Part B: search doors only until `b-shortlist`; the validation door only in `b-validate`; the final door only after
  `freeze-selection`, once (`final --confirm` may re-run it deterministically).
- Commit only this study's files (`research/study6-b5-kre-robustness-2026-10/`, `src/study6-b5-kre-robustness/`,
  `package.json` study6 script, and later `config/research-*/study6-b5-kre-robustness/`); push only this branch; no
  merge/PR/force-push.

## 5. Disclosures so far

- One background launch of A3–A7 (22:44Z) failed before starting any process: the relative log paths did not resolve
  in the background shell. No stage ran, nothing was written; relaunched with absolute paths at 22:45:30Z.
- Part A point records carry `periods['WF20-SEARCH'|'WF20-TEST']` from the Study 5 evaluator (its windows, not this
  study's); unused by Part A; Part B uses `periods.ts`.
- P4 and R-OM were run before the diagnostic checkpoint (engineering gates for Track O). P4 opened the `diag` door on
  W23 (the original window); R-OM re-ran the original 2017–2023 KRE search in a detached worktree. Neither evaluated a
  new KRE candidate on any study window; their outputs were compared only with the sealed records.
- Code provenance: every Part A module (`context`, `data`, `records`, `designs`, `evaluate`, `parity`, `sets`,
  `partA`, `events`, `execution`) hashes identically in `protocol_freeze.json` and `diagnostic_manifest.json`, so Part
  A ran on the frozen code. `main.ts`/`checkpoint.ts` gained the P4/R-OM commands before the manifest; after the
  manifest was sealed, `eslint --fix` reformatted the not-yet-run Part B modules (`search`, `trackK`, `trackJ`,
  `trackO`, `periods`, placeholders) — formatting only; the commit below carries the formatted versions.

