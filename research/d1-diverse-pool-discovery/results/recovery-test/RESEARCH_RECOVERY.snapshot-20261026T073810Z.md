# Research recovery checkpoint — D1 diverse-pool discovery

## Top screen (read this first)

- **Updated:** 2026-10-26 ~08:45Z. **Current stage:** M3, final-round search RUNNING in the background (exploration
  only — GP failed for both procedures, so the outcome will be **no advancement**; nothing is evaluated after 2023).
- **Frozen protocol:** `results/protocol_freeze.json` — file sha256 `fc22c70b…`, body `918c221b…`, frozen
  2026-10-26T04:20:08Z (protocol `6e4df57a…`, context `98428dac…`, code manifest `fd549635…`). No amendment yet
  (`results/amendments.jsonl` absent). Change head before the freeze: change 1 `17c8e445…`.
- **Complete:** M0 (design committed `bc6fcdf2…`, review, change 1) · M1 (legacy-check, audit, benchmark → tier E,
  reproduce, parity, freeze) · M2 (controls ×3, fold-a, fold-b, determinism, PROCEDURE_GATE `9b343385…`: J fail, T fail).
- **Incomplete:** M3 final search (running) → amendment 1 (final.ts) → select final → independent pre-freeze review →
  freeze-selection → confirm-b → M4 evaluate (no-advancement record) → reports (§14 names) → §13A recovery test →
  independent final audit.
- **Running process:** `npm run diverse-d1 -- search --window final` (harness task `br8lda5es`; log
  `results/logs/final.log`, last line `FINAL-SEARCH DONE <time>` or `FINAL-SEARCH FAILED`). Arms J-u and T-u completed
  (47,032 configurations each, coverage met); J-s then T-s follow. If the session restarts: read the log's last line;
  if the process is gone without `DONE`, re-run the same command — completed arms (record verifies its log) are kept,
  the incomplete arm is moved aside and replayed deterministically.
- **Next command (when the search is done):** apply the prepared final.ts amendment (patch script
  `/private/tmp/claude-502/-Users-chad-development-personal-margin-trading/010d3095-ab38-45a6-a34b-fb43ed1c0d12/scratchpad/amend1_final.py`
  — if the scratchpad is gone, re-derive it from §4 below), type-check, then
  `npm run diverse-d1 -- amend --stage freeze-selection --change "…" --reason "…" --review "pre-final-round review minor 1-4"
  --outputs research/d1-diverse-pool-discovery/FROZEN_SELECTION.json research/d1-diverse-pool-discovery/results/confirmB research/d1-diverse-pool-discovery/results/evaluation`,
  then `npm run diverse-d1 -- select --window final`.
- **Never:** commit, push, broker/order actions, downloads, edits to earlier studies, reruns of sealed stages, opening
  2024–2026 data for any configuration of this study.

## 1. Environment

- Main checkout, branch `research/trailing-buy-four-family-optimization`, HEAD `348f100b` (unchanged). Working tree:
  modified `.gitignore`, `package.json`, `src/phenotype/strategies.ts` (+1 line), `config/phenotypes/COMPATIBILITY.md`
  (+1 generated row); untracked `CLAUDE.md`, `docs/claude/`, `research/d1-diverse-pool-discovery/`,
  `src/app/diverseD1.ts`, `src/d1-diverse/`. Nothing committed.
- Node v24.21.0: `export PATH=$HOME/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH`; commands
  `npm run diverse-d1 -- <cmd>` (12 GB heap, `--expose-gc`). In zsh, split a multi-word step variable with `${=step}`.
- Apple M1 Pro, 10 cores, 16 GB; 8 workers; trace cache 150,000 (tier record).
- The brief: `brief/BRIEF_AS_RECEIVED.md`. The pasted brief was truncated at §13; **the user replaced the file with
  the full text (§13 remainder, §13A, §14, §15) at ~08:35Z, after the design commitment, the freeze and both fold
  validations.** The commitment's brief hash `c9ef0b91…` is of the truncated text. The full brief's §14 report names
  and §13A recovery test are adopted for the reports; frozen selection rules are not changed.

## 2. Stages, records and resume semantics

| Stage | Status | Command | Sealed/bound records (file sha256 / body) | Resume |
|---|---|---|---|---|
| commitment | complete | `commit-design` | `results/design_commitment.json` `2fe3a7be…` / `bc6fcdf2…`; schedule `4fd1e90a…` | write-once |
| change log | complete (1) | `change …` | `results/changes-since-commitment.jsonl` `4d63adb8…` (change 1 `17c8e445…`) | append-only; refused after freeze |
| M1 checks | complete | legacy-check, audit, benchmark, reproduce, parity | universe `06f2fa77…`, tier `c63d0ab6…`, legacy `52969d04…`, reproduce `a217d54f…`, parity `2139a9c0…` (bound by the freeze) | refused after freeze |
| freeze | complete | `freeze-protocol` | `results/protocol_freeze.json` `fc22c70b…` / `918c221b…` | write-once |
| controls | complete | `controls --window w` | calibration fold-a `c9c771e8…`/`7bec4b6b…`, fold-b `2199b986…`/`d8919f74…`, final `29a983aa…`/`2bf44343…` | write-once; complete-stage replay only |
| fold-a | complete | search / select / validate | search `47f014d7…`/`6b4442ec…`; PICKS `b2966fb3…`/`206466c4…`; validation `84b32347…`/`1e96c85c…` | sealed; never rerun |
| fold-b | complete | search / select / validate | search `91033c13…`/`75178c0e…`; PICKS `988f112c…`/`0f6cdcdc…`; validation `79c8e120…`/`0e7fd4e2…` | sealed; never rerun |
| determinism | complete | `determinism` | `results/determinism/determinism.json` `323a495e…` (8,632 + 2,000 lines identical) | write-once |
| procedure gate | complete | `procedure-gate` | `results/walkforward/PROCEDURE_GATE.json` `fe82077f…` / `9b343385…` | write-once |
| final search | **running** | `search --window final` | → `results/rounds/final/search.json` (sealed) | resumes per arm (completed arms kept) |
| amendment 1 | not started | `amend …` (final.ts only) | → `results/amendments.jsonl` | before freeze-selection's first output |
| final select | not started | `select --window final` | → `results/rounds/final/selection.json` (sealed), `rounds/final/select/` | complete-stage replay (partial select/ moved aside) |
| pre-freeze review | not started | independent agent | → IMPLEMENTATION_AUDIT | — |
| freeze-selection | not started | `freeze-selection` | → `FROZEN_SELECTION.json` (sealed) | write-once |
| confirm-b | not started | `confirm-b` | → `results/confirmB/confirmB.json` | write-once |
| evaluate | not started | `evaluate` | → `results/evaluation/evaluation.json` (no-advancement record only) | write-once |
| reports, §13A test, final audit | not started | `tables`, report files, recovery test, audit agent | §14 files | — |

**Do-not-rerun:** every complete stage above; everything of the October 25 study (`research/d1-robust-pool-discovery/`)
and the earlier studies. Pre-freeze checks refuse to run; legacy-check may run (writes a new timestamped file).

## 3. Results so far (E2 = reused historical diagnostics)

- Coverage met in every arm of every round (min per symbol: folds 733 J/T, 534 Q; final J-u/T-u met). Families:
  fold-a J 2,651 / T 1,911 / Q 1,076; fold-b J 2,836 / T 1,797 / Q 1,135.
- fold-a: J pick GDX IBB SMH XHB V +$13,759 (pct 0.70), DD $14,293; T pick GDX SMH V −$12,043 (0.10); Q −$8,496 (0.13).
- fold-b: J pick GDX SMH XHB V +$5,462 (0.84), DD $48,269; T pick IGV VOOG V −$7,089 (0.46); Q −$4,001 (0.58).
- **GP(J) fail (clause iii only), GP(T) fail (clause i) → no procedure may nominate.** Report: WALK_FORWARD_RESULTS.md
  (to be renamed CHRONOLOGICAL_METHOD_COMPARISON.md per the full brief §14).

## 4. The prepared amendment 1 (final.ts only; pre-final-round review minor 1–4)

Score recomputation from stored confirm-A draws (`scoreOfDraws` + sealed final calibration); rankings and gate details
for every final finalist; "hypotheticalNominations" (explicitly not nominations when GP failed); records add
`select/benchmarks.json` and every `refine-f*.json`; seeds (`seedLabels`), tier budgets, evaluation counts, parity
signature; data hashed one file at a time; confirm-b verifies its inputs against the frozen hashes and reports the
benchmarks' confirm-A vs confirm-B difference.

## 5. Disclosures for the final report

1. The brief was truncated; its remainder arrived after the freeze and the fold validations (see §1).
2. No independent review was held between sealing each fold's PICKS and opening its validation (the full brief asks
   for one "preferably"); reviews: at the commitment (22 findings), before the final round (no material finding),
   before the selection freeze (pending).
3. CLI flag-parsing bug found and fixed in change 1; a zsh word-splitting slip made the first fold-a launch run nothing.
4. The pruning design test used the October 25 study's symbols and −$1,897 as a scenario (the full brief asks not to
   bake XRT's result into fixtures) — made generic (tests are outside the code manifest).
5. Pre-final review observations 8–11 (zero-lot members winning on smoothing; near-duplicate finalists; pruning below
   the activity floor; one R1/R4 KRE vector equals B5's KRE vector in the seeded library).
