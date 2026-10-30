# Research recovery checkpoint — Study 6: frozen five-ETF B5 robustness audit (KRE diagnosis) + bounded improvement

## Top screen (read this first)

All times UTC (machine clock CET = UTC+1; `ls`/`stat` show local time). Run commands from the repository root.

- **Updated:** 2026-10-30T23:23Z. **Status: COMPLETE** (all stages run and sealed; final commit and push pending at
  this update — see §6).
- **Outcome:**
  - **B1 passes.** 100% of N1 neighbours below $35k.
  - **Frozen five-ETF B5 fails** the joint N1 gate: 21.9% of neighbours below $35k, p90 $55,573. The centre passes at
    $26,510.
  - **KRE** is the weakest book (57.5%). Its driver is the 4-day hold, not X.
  - **Part B:** no candidate qualified; §11.4 decision "partial improvement only" (mechanical), in substance no
    credible improvement; **no nomination**. Frozen B5 remains the benchmark. Nothing merged or deployed.
- **Brief:** `brief/ASSIGNMENT.md`, sha256 `7204c074e14bddeb498cfe2cf51a6c078696d734778d9f5eaf631ac55ffc7055`; read in
  full, 222 lines. It authorizes implementation, execution, verification, and a commit and push of this branch only
  (no merge, no PR).
- **Authority:**
  - `PROTOCOL.md`: frozen 2026-10-30T22:41:46Z at sha256 `4e5eab24…` (`results/protocol_freeze.json` body
    `34fbd2bc55bb…`). Current sha256 `b4f29153b8de0a4d…` after the §13 disclosures D1–D8 were appended at 23:21Z.
    No amendment.
  - Diagnostic lock: `results/diagnostic_manifest.json` (body `1025ca9f8956…`, file `63b31d8fda0e8bb6…`), committed
    in `1d9f6a4`.
  - Selection: `FROZEN_SELECTION.json` (body `443378267b13…`, file `8761419813287e56…`): qualified none, roles none.
- **Running process:** none. Worktrees: none besides the main checkout (`git worktree list`).
- **Follow-up gate (the user's decision):** none of the new configurations may be used without review. The defensible
  next evidence is forward (paper) observation of frozen B5 under the existing prospective protocol
  (`research/prospective-b4-b5-shadow/`). Any further search on 2016–2026 is search on observed data.

## 1. Environment

- Checkout `/home/chad/projects/margin-trading`, branch `research/study6-b5-kre-robustness`, created 2026-10-30T22:23Z
  from `research/study5-gdx-d1-b5-three-etf` at `b4f985714f95fe632eaaee4e04aadd68ff883406`.
- Track O worktrees were created under `$STUDY6_WORKTREES` (this session's scratch directory) and removed after use.
  Their outputs are in `results/parity/r-om/` and `results/partB/trackO/o-me/`.
- User changes present at start were never touched or committed: `config/market-events/distributions.csv`,
  `config/market-events/distributions.manifest.json` (modified), `config/market-events/raw/vanguard-20261030T184421Z/`
  and six `._.DS_Store` files (untracked).
- Node v24.21.0, 16 CPUs, 59 GB.

## 2. Baseline hashes (unchanged at the end, verified 2026-10-30T23:21Z)

| File | sha256 (first 16) |
|---|---|
| `config/pools/B5.json` / `B4.json` | `deef53ca53111806` / `4ca5aa1a900bc959` |
| `config/phenotypes/D1/{VGT,XBI,XRT,KRE,GDX}.json` | `3e77a419…`, `453c4fd0…`, `d7b7f222…`, `6b8889e2…`, `ed98c23c…` |
| `research/portfolio-aware-d1-optimization/FROZEN_SELECTION.json` | `16c91895f485b4ce` |
| `research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json` | `0dabd97e2b3d50fe` |
| `research/study5-gdx-d1-b5-three-etf-2026-10/FROZEN_SELECTION.json` | `3837d814b29cd645` |
| `research/multi-etf-d1/FROZEN_CANDIDATES.json` | `94b0b646d7aa7520` |
| `data/{VGT,XBI,XRT,KRE,GDX}/data.csv` | `624e4094…`, `83b71f75…`, `c625ca57…`, `fd7ab8aa…`, `134b7450…` |
| `data/partitions.json`, `splits.json`, `distributions.csv` (user-modified, untouched) | `43893f3d…`, `e5bde427…`, `30feaa99…` |

## 3. Stage table (all complete; write-once stages refuse to re-run)

| Stage | Command | Record (body hash, first 12) |
|---|---|---|
| S0 protocol freeze | `npm run study6 -- freeze-protocol` | `results/protocol_freeze.json` 34fbd2bc55bb |
| S1 parity P1/P3/P5 | `parity` | `results/parity/parity.json` 8f658a091285 |
| S2 data | `data` | `results/data/data-audit.json` bf2471cb331e |
| A1–A8 | `a1`, `a2`, `a3 <W>`, `a4 <W>`, `a5`–`a8` | in `results/diagnostic_manifest.json` |
| P4, R-OM | `p4`, `r-om` | `results/parity/p4.json`, `r-om.json` (both PASS) |
| A9 checkpoint | `diagnostic-freeze`, commit `1d9f6a4` | 1025ca9f8956 |
| Track K main / WF20 / WF19 | `b-track-k main|wf20|wf19` | 4d8dff0b6a81 / 3452741c2725 / e3df4d410555 (empty) |
| Track O-PA / O-ME | `b-track-o-pa`, `b-track-o-me` | 2b84e5ee5c21 / ffca937a7081 |
| Walk-forward test | `b-wf-test` | b0e1a9abbf8a |
| Track J (triggered) | `b-track-j` | 304b5180fd0b |
| Shortlist | `b-shortlist` | 6cade7700c84 |
| Validation | `b-validate` | da5dfee8b9c5 (qualified none) |
| Selection freeze | `freeze-selection` | 443378267b13 |
| Final (once) / confirm | `final`, `final --confirm` | 3df6b3afeeeb / 9887725994be (rows identical; lots sha256 `40b272da…`) |
| Research configs | `research-configs` | 13 pools + KRE/VGT research phenotype files (labelled research only) |
| Command verification | `scripts/verify_commands.sh` | `results/logs/commands/index.txt`: 15/15 exit 0; tests 29 pass, 0 fail, 2 skipped |

## 4. Guards

- **Do not rerun** any sealed stage. `final --confirm` may re-run, deterministically.
- Never edit sealed records, `PROTOCOL.md` above §13, frozen B4/B5/D1 files, earlier studies' records, or `data/`.
- Commit only this study's files: `package.json` (study6 script), `research/study6-b5-kre-robustness-2026-10/`,
  `src/study6-b5-kre-robustness/`, `config/research-pools/study6-b5-kre-robustness/` and
  `config/research-phenotypes/study6-b5-kre-robustness/`. Push only this branch; no merge, PR or force-push.

## 5. Disclosures

PROTOCOL.md §13 D1–D8 and the erratum in DIAGNOSTIC_CHECKPOINT.md. In addition, two checkpoint updates written at
about 23:07–23:10Z used CET local time ("2026-10-31T00:0xZ"); they were corrected at 23:10Z. `eslint --fix` formatted
the Part B modules after they ran (formatting only).

## 6. Commit and push

Pending at this update. The follow-up commit records the hash and the push verification.
