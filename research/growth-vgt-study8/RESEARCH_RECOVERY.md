# Research recovery checkpoint — Growth 1.4.0 VGT, Study 8–style optimization (#4 as fixed control)

## Top screen

- **Updated:** 2026-11-07T10:22Z (UTC, from the clock). **Status: INCOMPLETE.**
- **Current stage:** 2 — protocol frozen (chain phase 1 `protocol`, 10:21:20Z); committing it next. No parity, search
  or selection statistic exists yet.
- **Authority:** `PROTOCOL.md` sha256 `c5bcbda45c41b269b6736b3f1e4fe23626195f73313b6e338f5cb97dbf73e072`;
  `results/protocol_freeze.json` `d81730d2b33da2ead09f2953a8e9186197a1df441a9341718ebdab893b812cba`;
  `AMENDMENTS.md` `8059bac5…547ab` (no amendments); brief `brief/BRIEF.md` `db3f1b4e…a662a8`.
  Chain head `a483bb2d479e20ab`.
- **Stages complete:** pilot (sealed, before the freeze), protocol freeze. **Running processes:** none.
- **Next command:** `git commit` of the freeze, then `npm run growth-vgt-study8 -- parity` (P1, development door).

## Environment

- Repository root `/home/chad/projects/margin-trading`, main checkout, no other worktree.
- Branch `research/growth-vgt-study8`, created at `4fe5eff` (same commit as `research/intraday-d1-vgt`).
- Node 24.21.0; 16 hardware threads; 59 GB RAM; 14 worker threads per stage. No Strategy Lab server running at 09:51Z
  (do not start one; never touch `state/strategy-lab/` or `apps/strategy-lab/dist`).
- Scratch: `.cache/growth-vgt-study8/` (git-ignored) for the P1 prefix root and direct runs.

## Data (pins verified by every door)

- `data/VGT/data.csv` sha256 `2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e` (935,608 rows,
  2016-01-04 → 2026-10-30, 2,723 sessions).
- Development prefix: 42,469,694 bytes, 743,918 rows, last row 2024-12-31T21:11Z, sha256 `c144619f…ecb`, 2,264
  sessions (verified by this study's loader at the pilot).
- `data/partitions.json` `43893f3d…`, `config/market-events/splits.json` `e5bde427…`.

## Stage table

| Stage | Command (repo root) | Status | Output | Resume semantics |
|---|---|---|---|---|
| Pilot | `npm run growth-vgt-study8 -- pilot` | complete 10:01Z | `results/pilot/pilot.json` `57440d65…e67f` | sealed; refuses after the freeze |
| Protocol freeze | `npm run growth-vgt-study8 -- seal-protocol` | complete 10:21Z | `results/protocol_freeze.json` | chain phase 1 |
| P1 parity | `npm run growth-vgt-study8 -- parity` | not started | `results/parity/parity.json` | write-once; rerun only by amendment |
| Search | `npm run growth-vgt-study8 -- search` (background, log `results/runlogs/search.txt`) | not started | `results/search/search.json` + archives | crash → rerun once, same seeds, disclosed |
| Qualify | `npm run growth-vgt-study8 -- qualify` | not started | `results/qualify/qualification.json` | write-once |
| Freeze | `npm run growth-vgt-study8 -- freeze`, then commit | not started | `FROZEN_SELECTION.json` (read-only) | write-once |
| Validate | `npm run growth-vgt-study8 -- validate` | not started | `results/validation/` | once |

## Guards

- Do not read 2025–2026 bars before the selection freeze is committed. Do not run the full `npm test` (it reads all
  data) before validation.
- #4 is a fixed control: never seeds the search, never shapes ranges, never a refinement start or shortlist member.
- Never edit `PROTOCOL.md` after the freeze; amendments go to `AMENDMENTS.md`.

## Disclosures

- Development door opened before the freeze by an engineering timing script (scratchpad; exact time not recorded,
  between 09:52Z and 10:01Z) and by the sealed pilot (10:01Z); a one-configuration direct-runner smoke test on the
  development prefix (between 10:03Z and 10:10Z, time not recorded) printed only a difference count. None printed or
  stored a performance figure.
- `pilot.ts` was reformatted by prettier after the pilot ran (no logic change); the freeze pins the current code.
