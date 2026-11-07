# Research recovery checkpoint — growth140-vgt-stable (Growth 1.4.0 VGT follow-up: audit, #4 sensitivity, stable search)

## Top screen

- **Updated:** 2026-11-07T17:26Z (UTC). **Status: INCOMPLETE.** C19, C21, C23 complete (folds `eb5d8c5d…`/`65a19878…`/`bcaa0904…`, commits `2ea8481`/`a10e24f`/`a634d5b`); sequential sealed (no eligible global policy: primary chronologically unsupported); C24 search running (unit `growth140-stable-search-C24`), then C24 qualify (chain3).
- **Current stage:** S6 — the chronological chain is being launched: `.cache/growth140-vgt-stable/chain3.sh`
  (log `.cache/growth140-vgt-stable/chain3.log`): for C19, C21, C23: search → qualify → freeze-fold → git commit →
  evaluate-fold; then `sequential`; then the C24 search and qualification. Fail-fast; host check before each launch.
- **Authority:** PROTOCOL.md `cf850484…1a203` (frozen 14:40:30Z, commit `a836cd5`); AMENDMENTS.md head **O1**
  (operational incident, no protocol or code change); code closure `deea867f…ffcdd`.
- **Sealed records** (`results/seals.jsonl`): audit `72c4c9c2…`, audit candidates `e7ea45f8…`, P0 parity `082c06f7…`
  (12 configurations 0 differences; causality 36/36; archive reuse 241/241), audit re-evaluation `2ec6f0d1…`,
  sensitivity `a87b467e…`, seeds `705b5e49…` (6 rise, 6 breakout).
- **Running:** see the chain; units `growth140-stable-{search,qualify,evaluate}-<C>`; `systemctl --user list-units 'growth140-stable*'`.
  A search resumes by relaunching its unit command (`launch --unit growth140-stable-search-<C>-rN --wait -- search --cutoff <C> --workers 14`);
  the chain can then be restarted from the failed step (sealed steps refuse to rerun; skip them).
- **Next:** after CHAIN-DONE: read sequential.json and the C24 qualification, run `final-select`, commit, then `final`.

## Stage table

| Stage | Status | Notes |
|---|---|---|
| S0 setup | complete | 13:56Z |
| Code, doors, smoke, unit tests | complete | tsc and eslint clean; 8 unit tests pass |
| Pilot attempt 1 | aborted 14:19Z | fine-step change; files in `.cache/growth140-vgt-stable/pilot-attempt-1/` |
| Pilot attempt 2 | complete 14:20–14:32Z | `results/pilot/pilot-driver.json`: B, C, D identical to A; fold stop/resume identical; peak 8.61 GiB, no memory events |
| Benches, pilot P0 and sensitivity code | complete 14:33–14:39Z | D24 87.6/s at 14 workers; D19 157.8/s; pilot parity 0 differences |
| Protocol freeze | complete 14:40:30Z | committed |
| P0 parity | complete 14:45Z (rerun after O1) | sealed `082c06f7…`; passed |
| Audit, audit re-evaluation, sensitivity, seeds | complete 14:41–14:52Z | sealed (see top screen); re-evaluation and sensitivity resumed after O1 |
| Cutoffs C19, C21, C23 (search, qualify, fold freeze, evaluation) | not started | each search resumes from `.cache/growth140-vgt-stable/jobs/search-<C>/checkpoint.json` by rerunning its command |
| Sequential, C24 search and qualify, final selection, final comparison | not started | |

## Environment

- Repository `/home/chad/projects/margin-trading` (main checkout, no other worktree). Branch `research/growth140-vgt-stable`,
  created from `b0cf0c9` (the end of the completed study `growth140-vgt-s8m`, branch `research/growth-vgt-study8`).
  The working tree was clean at the start.
- Node 24.21.0 (`.node-version`), `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`.
- Host: MemTotal 62,313,736 kB; MemAvailable 56.2 GB at 13:55Z; swap 8 GB, almost all used by other workloads (vLLM).
  Ancestor cgroups (`user.slice`, `user-1000.slice`, `user@1000.service`, `app.slice`) are unlimited.

## Inputs verified at 13:50Z (sha256, all equal to the completed study's manifest and checkpoint)

| Input | sha256 |
|---|---|
| `research/growth140-vgt-s8m/PROTOCOL.md` | `ae3bfa41d5c264c3e1ebba99a8631636d548f19ef0c98ef53ec08fc53a47bac6` |
| `research/growth140-vgt-s8m/FROZEN_SELECTION.json` | `0064deba9f371863b2e5a1626a3c004bc016149a4d3430ad6b8a583a94e19bce` |
| `research/growth140-vgt-s8m/results/archive/MANIFEST.json` | `0d99b32520fe699100b58d960451ac7d074bb5e07ea7879fffe9247a859cb491` |
| archive shards search points / configs / fits | `f975c2d0…abaac` / `f7214b7b…8acae` / `2f7f7412…72925` |
| `.cache/growth140-vgt-s8m/jobs/search/archive.sqlite` | `e454f8adae8b40d43241c7839f9df8f5c1c329558921ec16022228f3bbf82713` |
| `data/VGT/data.csv` (canonical) | `2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e` |
| `.cache/growth140-vgt-s8m/dev/VGT-dev.csv` (development prefix) | `c144619f0104403710098911b31cb1e84982ca6b724e29003a4ab40770bf9ecb` |

## Guards

- **Never edit, rehash or rerun** anything under `research/growth140-vgt-s8m/`, `src/growth140-vgt-s8m/`,
  `tools/growth140-vgt-s8m/` or `.cache/growth140-vgt-s8m/`. They are read only, and their SQLite files are not
  opened for writing.
- `state/strategy-lab/`, `apps/strategy-lab/dist` and saved Strategy Lab runs are not touched.
- **2025–2026:** no candidate outcome on 2025-01-02 → 2026-10-30 is computed before the final selection is frozen and
  committed. The FULL door is opened only by `final` (door log `results/doors.jsonl`).
- **Do not rerun** sealed stages (`results/seals.jsonl`); a fold's evaluation door opens only after its
  `FOLD_SELECTION.json` is sealed.

## Disclosures (running list)

- Prior knowledge: the completed study's development and validation outcomes, and #4's full-history browser
  selection (2016–2026, 2025–2026 in view).
