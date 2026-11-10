# RESEARCH RECOVERY — Priority 4A: standalone GDX Growth optimization (`gdx-growth-standalone`)

## Top screen

- **Updated:** 2026-11-10T18:37Z (UTC). **Status: INCOMPLETE — chain DONE (18:35:06Z); FROZEN_SELECTION.json sealed
  (`5d262154…2558`), being committed; validation next** (unit `gdxg-validate`, FULL once).
- **Authority:** `PROTOCOL.md` sha256 `d8fd3a83d27955d2…` frozen by `results/protocol-freeze.json`
  `fc4fef1dbcbb878c53343c049ca417e7652b8da9ef8b322728c416d85c473681` (2026-11-10T17:43:44Z; closure 252 files, digest
  `1000e4771f1d…`; evaluation digest `74173d33…990a`). `AMENDMENTS.md`: R1, R2 (pre-freeze; none after). Standard
  2.0.0 (`2005a88c…0105`); preflight PASS. Commits: `2a7d93dc` pre-freeze, `6a4d5caa` freeze.
- **Stages complete:** control manifest (`f59ca6f6…e912`), engineering gates (`051069cf…b3ea`, 294 checks, 0 failed),
  bench + pilot (`results/pilot/PILOT.md`), protocol freeze; **C19** search (134,519 fresh, 5.1 min) + selection
  (committed `3dc5719b`) + fold evaluation; **C21** search (119,128 fresh, 7.6 min) + selection (committed `f78cf6e8`) +
  fold evaluation; **C23** search (114,103 fresh, 10.1 min) + selection (committed `bab28345`) + fold evaluation;
  **sequential**; **C24 independent search** (`results/search/C24/independent.json` `4f9e9bbd…`, 148,937 fresh, 14.9 min;
  rise and breakout 6 islands each, "triggers not met") (all sealed; `npm run gdxg -- verify`). C24 informed search
  (`e7af3701…`, 86,524 fresh, 6.7 min), C24 qualification (`folds/C24/selection.json` `8eae4ae9…`), diagnostics
  (`918102d2…`), FROZEN_SELECTION.json (`5d262154…`). **Primary = independent primary = `C24/indep-rise#1 profit`**
  ($139,667.93 / DD $17,484; conf. p10 $63,711, p90 $24,504); roles: robust `C24/informed#2 robust`, balanced P08,
  lower-drawdown P09; Appendix A fails Q3/Q4; 4B export: primary, informed#2, P08, P09, Appendix A. **Not yet:** validation, tables, report, roadmap 4A row, npm test, push.
- **Already done outside the chain (uncommitted, this task's):** `docs/research/ROADMAP.md` (4A decisions, 3B/3C
  clarifications, 4A row "Running"), appended clarification lines in `research/c4-gdx-growth-partner/RESEARCH_RECOVERY.md`
  and `research/vg-d1-growth-expanded/RESEARCH_RECOVERY.md`, `README.md`, `RUN_COMMANDS.md`,
  `tools/gdx-growth-standalone/archive-manifest.ts`, tables-tool fixes.
- **Fold role structures (for the report):** C19 primary = 5-lot Rise book (92% of training net in one episode, no
  trend filter, 11.3% stop); C21 primary = 25-lot Rise, 5% stop, no hold limit, no trend filter → 2022 stop-outs.
- **Sequential verdict (sealed): UNSUPPORTED** — procedure net −$16,537.03, sequential minute DD $47,820.43
  (2022-02-24 → 2022-09-29, not recovered by 2024-12-31), C21 primary's 2022 stop-outs. Appendix A fixed (descriptive)
  +$22,769.78 / $17,709.96.
- **Interim (descriptive until the sequential record):** C19 primary `indep-rise#1 profit` 2020–21 slice −$3,143.02
  (DD $21,815.07); C21 primary `indep-rise#4 profit order` 2022–23 slice −$15,359.64 (DD $47,820.43 > $35,000).
- **Running:** `gdxg-chain.service` (outside the slice; `chains/study.sh`) launches, one at a time, the units
  `gdxg-search-C19` → `gdxg-qualify-C19` → (commit C19 selection) → `gdxg-eval-C19` → … C21 … C23 → `gdxg-sequential` →
  `gdxg-search-C24` → `gdxg-search-C24-informed` → `gdxg-qualify-C24` → `gdxg-diagnostics` → `gdxg-freeze-selection`,
  then stops ("CHAIN DONE"). Each unit logs to `results/logs/<unit>.log`; memory samples in `results/memory/<job>.jsonl`.
- **Next step after "CHAIN DONE":** verify the seals, inspect `FROZEN_SELECTION.json`, commit the development records and
  `FROZEN_SELECTION.json`, then `npm run gdxg -- launch --unit gdxg-validate --wait -- validate --workers 12` (FULL,
  once), commit the validation, write tables, report, roadmap; full `npm test` in a unit with PATH; push.

## How to tell the chain's state (after a compaction or a new session)

- `systemctl --user is-active gdxg-chain` and `systemctl --user list-units 'gdxg*'`; `tail research/gdx-growth-standalone/results/logs/study-chain.log`.
- **If the chain unit died or was stopped:** do not start anything until no `gdxg-*` unit is active. Then rerun the
  chain exactly as launched (it skips every sealed record and resumes an interrupted stage from its job archive in
  `.cache/gdx-growth-standalone/jobs/<job>/archive.sqlite`):
  `systemd-run --user --unit=gdxg-chain --collect -p KillMode=mixed --working-directory=/home/chad/projects/margin-trading -p StandardOutput=append:/home/chad/projects/margin-trading/research/gdx-growth-standalone/results/logs/study-chain.log -p StandardError=append:/home/chad/projects/margin-trading/research/gdx-growth-standalone/results/logs/study-chain.log /bin/bash research/gdx-growth-standalone/chains/study.sh`
  (a fold selection already sealed but not committed is committed by the chain before its slice opens).
- Exit 75 of a stage = a requested stop (memory pressure or signal): resume with the same command; exit 1 = failure:
  read its log; never relax a guard.

## Environment

- Repository root `/home/chad/projects/margin-trading` (main checkout, no worktree). Branch
  `research/gdx-growth-standalone` from `b7ebfdc6` (pushed end of 3C). Node v24.21.0. Host 16 threads, 59 GiB; every
  other study slice 0 tasks at launch (17:43Z); mongod and a vLLM server outside. `ls` shows CET (UTC+1).
- Code `src/gdx-growth-standalone/` (`npm run gdxg -- <command>`); tables `tools/gdx-growth-standalone/tables.ts`;
  unit tests `src/gdx-growth-standalone/tests/study.test.ts` (7 pass); Priority 3's pool/space tests 20 pass.
- Resource contract: `gdxg.slice` 44G / 48G / swap 0; 12 workers; GC every 256 or > 256 MiB ArrayBuffers; stop at
  36 GiB.

## Constants (frozen; see PROTOCOL.md)

- Seeds `deriveSeed('gdx-growth-standalone', …labels)`; independent 16,384 base / 32,768 cap per cutoff (C19, C21, C23,
  C24); informed 8,192 / 16,384 at C24 (574 designs + islands 1,906 / 1,904 × 3); evaluation caps: independent search
  ≤ 750k per cutoff, informed ≤ 400k, qualification ≤ 120k per cutoff, validation neighbours ≤ 10k, total ≤ 4,000,000.
- Gates Q1–Q5; primary = actual-profit of the C24 selectable set; independent primary separately; sequential verdict:
  supported iff every fold has a primary, net > 0 and sequential minute DD ≤ $35,000.

## Disclosures so far

- **Door incident (minor, pre-freeze):** the endpoint check (2026-11-10T17:07Z) printed the last two minute rows of the
  canonical GDX and VGT files (timestamps and one price bar each); no strategy result.
- Known before the protocol (engineering gates, D24 development centres of the controls): Appendix A $53,816.50 /
  $17,709.96 / 13 lots; P07 $126,406.73; P08 $121,008.75; P09 $100,056.17; P13 $55,345.40; others $6.8k–$34.9k.
- R1 (pilot fixes: the causal episode window, fold labels, a test timer, table escaping), R2 (resource contract).

## Guards

- Never modify completed studies' code or records. Never rerun the control manifest, the gates or the freeze (sealed).
- FULL stays closed until `FROZEN_SELECTION.json` is sealed AND committed (guard in `doors.ts`).
- Do not launch a second chain or stage while any `gdxg-*` unit is active.
