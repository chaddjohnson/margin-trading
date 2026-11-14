# RESEARCH_RECOVERY — Assignment 2: D1 risk-control families and risk-aware candidate selection

## Top screen

- **Updated (UTC):** 2026-11-14T02:16Z (from `date -u`).
- **Status:** **INCOMPLETE** — protocol FROZEN (`results/protocol-freeze.json`, commit `77c569ca`); the study chain
  `chains/chain1.sh` RUNNING as unit `vgl0rf-chain1` (started 2026-11-14T02:12:30Z), step c101 (C19 base search).
- **Authority:** brief `brief/BRIEF.md` sha256 `aaf36fbc…89cac8`; protocol `PROTOCOL.md` sha256 `7e803dc4…66b9d9`
  (draft, pre-freeze; adoption manifest `7cb2f0e0…`); amendments `AMENDMENTS.md` `b4048975…` (R1); RC 2 specification
  `SPECIFICATION_RC2.md` `594ef146…`. Standard 2.2.0 (`0085cff2…`), NL0 1.0.0 (`9b387bb4…`).
- **Running processes:** `vgl0rf-chain1.service` (bash chain1.sh, KillMode=process, log `results/logs/chain1.log`); it
  launches each step as a sub-unit `vgl0rf-<C>-<step>` (logs `results/logs/vgl0rf-*.log`; job archives and
  `progress.json` in `.cache/vg-l0-risk-families/jobs/<job>/`). Finished cleanly when the log ends with `CHAIN1 DONE`;
  a failure prints `CHAIN FAILED at [<id>]`.
- **Next action:** wait for the chain (≈ 30–40 h); meanwhile write the report-only diagnostics tooling in
  `tools/vg-l0-risk-families/` (never a selection input). Resume after a failure: fix (amendment if code), then
  relaunch the chain unit with the failed step id.

## Environment

- Main checkout `/home/chad/projects/margin-trading` (no extra worktree), branch `research/vg-l0-risk-families` from
  `26014af1` (= `origin/research/vg-l0-risk-controls-foundation`); `main` = `origin/main` = `108c241b`.
- Commits so far: `3771c28b` (RC 2 + spec + tests), `bbe5c2aa` (protocol draft, adoption, pipeline, unit tests).
- Node v24.21.0; slice `vgl0rf.slice` (MemoryHigh 44G, MemoryMax 48G, swap 0); 12 workers.
- Evaluation digest `6bc03fecd92a732b139f52b6755aa8eb2e21f17e47fd4fdb9132782a672f212d` (= stage V's); Priority 3's
  `147cad7c…` (= sealed historical).

## Stages

| Stage | Command (repo root) | Output | sha256 / result |
|---|---|---|---|
| RC 2 module + tests | `node … --test src/d1-risk-controls-rc2/tests/*.test.ts` | — | 35/35 (116 with RC 1) |
| Stage V (sealed) | `npm run vg-l0rf -- launch --unit vgl0rf-parity --wait -- parity` | `results/parity/parity.json` | `dbedfa49…de08a`; 0 failed of 25,933 checks; 907 simulations |
| Full npm test | unit `vgl0rf-npm-test` | `results/logs/npm-test.log` | 1,610 tests: 1,599 pass, 7 known pre-existing failures, 4 skipped |
| Bench | `bench --door D24 --centres 392 --workers {10,12,14,16}` | `.cache/…/pilot/bench/` | 200–205/s flat; 12 workers chosen |
| Pilot (straight + interruption) | `chains/pilot.sh` | `.cache/…/pilot/` | every stage OK; sigterm / worker kill / unit kill identical |
| Calibration | `VGL0RF_PILOT_BUDGET=study`, P18 | `.cache/…/pilot/calib/` | ≈ 18k requested per broad lane (D19), 652 per member |
| Protocol freeze | `npm run vg-l0rf -- freeze-protocol` | `results/protocol-freeze.json` | sealed 02:12:22Z, commit `77c569ca` (evaluation `6bc03fec…`, decision `3b9efbc7…`) |
| Study chain | `chains/chain1.sh` (c101 … f04) | `results/search`, `results/folds`, `FROZEN_SELECTION.json`, `results/validation` | running since 02:12:30Z (unit `vgl0rf-chain1`) |

## Commands

```
R=/home/chad/projects/margin-trading
systemd-run --user --unit=vgl0rf-chain1 --collect -p KillMode=process -E PATH="$PATH" -E HOME="$HOME" \
  -p StandardOutput=append:$R/research/vg-l0-risk-families/results/logs/chain1.log \
  -p StandardError=append:$R/research/vg-l0-risk-families/results/logs/chain1.log \
  --working-directory=$R /bin/bash $R/research/vg-l0-risk-families/chains/chain1.sh [STEP]
```

Resume with the failed or next step id (c101 … c414, f01 … f04); sealed stages refuse to rerun; an interrupted search
or qualification resumes exactly from its archive (`.cache/vg-l0-risk-families/jobs/<job>/archive.sqlite`). Check a
running unit: `systemctl --user status vgl0rf-chain1`, the step units `vgl0rf-<cutoff>-…`, and `results/logs/*.log`,
`.cache/vg-l0-risk-families/jobs/<job>/progress.json`.

## Guards

- Do not edit `chains/chain1.sh` while it runs (copy it); do not commit manually while a chain commit may run.
- No FULL opening except stage V's New L0 legacy reproduction (AD3) until `FROZEN_SELECTION.json` is sealed and
  committed. Do not rerun sealed stages. Do not change `src/vg-l0-risk-families/` decision or evaluation code after the
  freeze without an amendment and an acknowledged digest.

## Disclosures so far

- 24 single-process RC 2 timing evaluations on D24 before the protocol (timing only, door log 01:27Z).
- The pilot validation stand-in boundary bug (pilot-only path) fixed before the freeze (R1).
- V4 re-derives entry-day exits with the same `entryDayTrigger` function on the raw bars plus independent invariants;
  the function itself is verified by synthetic tests. Real-data V4: 86 entry-day exits, all later-minute lows; the
  fill-minute and minute-open cases occur only in the synthetic tests.
