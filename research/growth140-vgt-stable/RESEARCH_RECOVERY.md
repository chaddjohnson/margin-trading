# Research recovery checkpoint — growth140-vgt-stable (Growth 1.4.0 VGT follow-up: audit, #4 sensitivity, stable search)

## Top screen

- **Updated:** 2026-11-07T14:41Z (UTC, from the clock). **Status: INCOMPLETE.**
- **Current stage:** S2 — protocol frozen 14:40:30Z and committed (the "protocol freeze" commit on this branch). Next:
  P0 parity, then the audit.
- **Authority** (sha256):

  | File | sha256 |
  |---|---|
  | `brief/BRIEF.md` (105 lines, read in full) | `c3977d248d89be83c0eea6f033fa10247fdd92bb63bc94f2fe797b4260ac2ad1` |
  | `PROTOCOL.md` (frozen) | `cf850484c3a82b0323d39070df7a4dd21466c0cc0e77e674c07fe350b9f1a203` |
  | `AMENDMENTS.md` (no amendments; head = none) | `d76f88356fd3918c4b016e78c8ee548e20216d3cc02bde48de1a26bc0a2a18a5` |
  | `results/protocol_freeze.json` (code closure `deea867f…ffcdd`, 118 files; engine `e34baa86…`) | `f286b4c8708063fb7eeecccdfde450c0e8adb7af9038dc975a06bc7340eec8c9` |
  | `results/doors-pins.json` | `a7c47d268800193cce5113b304b90dc1c82bfad0c1abb95282debbf3813b8aa5` |

- **Running:** nothing.
- **Next command:** `npm run -s growth140-stable -- launch --unit growth140-stable-parity --wait -- parity --workers 4`
  (P0, sealed `results/parity/parity.json`); then `npm run -s growth140-stable -- audit`.

## Stage table

| Stage | Status | Notes |
|---|---|---|
| S0 setup | complete | 13:56Z |
| Code, doors, smoke, unit tests | complete | tsc and eslint clean; 8 unit tests pass |
| Pilot attempt 1 | aborted 14:19Z | fine-step change; files in `.cache/growth140-vgt-stable/pilot-attempt-1/` |
| Pilot attempt 2 | complete 14:20–14:32Z | `results/pilot/pilot-driver.json`: B, C, D identical to A; fold stop/resume identical; peak 8.61 GiB, no memory events |
| Benches, pilot P0 and sensitivity code | complete 14:33–14:39Z | D24 87.6/s at 14 workers; D19 157.8/s; pilot parity 0 differences |
| Protocol freeze | complete 14:40:30Z | committed |
| P0 parity | not started | resume: rerun the same command (idempotent archive); sealed output refuses a rerun |
| Audit, audit re-evaluation, sensitivity, seeds | not started | |
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
