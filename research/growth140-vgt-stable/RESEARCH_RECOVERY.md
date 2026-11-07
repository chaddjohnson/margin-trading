# Research recovery checkpoint — growth140-vgt-stable (Growth 1.4.0 VGT follow-up: audit, #4 sensitivity, stable search)

## Top screen

- **Updated:** 2026-11-07T18:36Z (UTC, from the clock). **Status: COMPLETE.** Selection for this study is closed (the
  FULL door was opened once, 18:27:58–18:29:25Z).
- **Outcome.** On development all 10 frozen finalists out-earned #4 within the $35,000 ceiling and met the stability
  criteria; on 2025–2026 none beat #4 ($52,892.75); the primary `6aeb2e0f3918e574` (chronologically unsupported: every
  independent 2020–2024 sequential policy breached the ceiling) failed V1/V2/V4/V5; only `08500a60ec56cfae` passed every
  final gate (full history $160,974.09 / DD $19,344.80 vs #4 $145,468.46 / $14,578.10; 2025–2026 $45,464.93). #4
  development reproduction and full-history browser parity exact. Details: `REPORT.md`.
- **Authority and sealed records** (sha256, recomputed 18:35Z):

  | File | sha256 |
  |---|---|
  | `PROTOCOL.md` (frozen 14:40:30Z, commit `a836cd5`) | `cf850484c3a82b0323d39070df7a4dd21466c0cc0e77e674c07fe350b9f1a203` |
  | `AMENDMENTS.md` (head O1, operational; no protocol or code change) | `be4fb8bf675c56e5f213dcceed6c6f297459000ad3a2c770ab25d8d7f2965bd3` |
  | `results/protocol_freeze.json` (code closure `deea867f…ffcdd`, 118 files) | `f286b4c8708063fb7eeecccdfde450c0e8adb7af9038dc975a06bc7340eec8c9` |
  | `results/doors-pins.json` | `a7c47d268800193cce5113b304b90dc1c82bfad0c1abb95282debbf3813b8aa5` |
  | `results/parity/parity.json` (P0 passed) | `082c06f70ed72694a641defd6761ef838da0e06ecd66f90c57c6164e6b69eeb2` |
  | `results/audit/audit.json` / `audit-candidates.json` | `72c4c9c2…a6872c5` / `e7ea45f8…1890a` |
  | `results/audit/reeval.json` | `2ec6f0d141526e4c1c1d0a2d4ef505eaf19451a4ccda0e0740e03cd3366a47c1` |
  | `results/sensitivity/sensitivity.json` | `a87b467efbc1954341efd1023d7dfdaa1aee6c5e0bd1c6dac8c8c325cfd4417d` |
  | `results/seeds/SEEDS.json` | `705b5e49c49568fd7dd1cd1cf30e0398a4b4aa7ca70ce5730170669a195e3afb` |
  | `results/search/C19 / C21 / C23 / C24.json` | `01d585c2…` / `89677829…` / `4d80752e…` / `680e00e2…` |
  | `results/qualify/C19 / C21 / C23 / C24.json` | `8635f017…` / `c4b50707…` / `602204b1…` / `0e586e07…` |
  | `results/folds/C19 / C21 / C23/FOLD_SELECTION.json` (commits `2ea8481` / `a10e24f` / `a634d5b`) | `eb5d8c5d…` / `65a19878…` / `bcaa0904…` |
  | `results/folds/C19 / C21 / C23/evaluation.json` | `a1e1cdd4…` / `7d60d3da…` / `1d4c63e7…` |
  | `results/folds/sequential.json` (chosen procedure: none) | `56588d45ffbcfb8fbe7ea5db8cf98528736c897f8481f413d9f7e0a8b169017c` |
  | `FROZEN_SELECTION.json` (444; commit `ebf3d74`) | `a2a99883384b4af165803735eba6903d7c96fab3cc377f5c4ac623c8a3f56c6e` |
  | `results/final/final.json` (opened once) | `e4c5cc10dab7cd0236543c68c3542edcb5a524aed887f30e5771f1c8ac65cba7` |
  | `results/archive/MANIFEST.json` | `9e36a86409ce1d261255211808486d3461ee9806eb99a7b11cdc415c570f967b` |

- **Running processes:** none (`systemctl --user list-units 'growth140-stable*'` empty).
- **Git.** Branch `research/growth140-vgt-stable` (8 study commits `a836cd5` … `f04fd3f`) pushed to `origin` at
  18:40Z; `git ls-remote` confirmed `f04fd3ff26be0a84bca6915c87aaaa0319bd444d`. Not merged into `main`.
- **Follow-up gate (needs the user).** Any new question (an exposure cap, a mandatory losing-hold limit, a prospective
  test on VGT data after 2026-10-30) needs a new study namespace. Nothing here is deployed or recommended.

## Deliverables (audited)

`REPORT.md`; `PROTOCOL.md`, `AMENDMENTS.md`, `RUN_COMMANDS.md`, `README.md`, `chains/` (the stage chains run), `NOTES.md` (working notes, not
authoritative); `FROZEN_SELECTION.json`; `results/tables/*.md` (audit, sensitivity, search and qualification per
cutoff, folds, final); the sealed records above; `results/archive/` (trial archive; the four searches' point and
configuration shards are git-ignored and kept on disk, hashes in MANIFEST.json); `results/memory/*.jsonl`,
`results/memory-summary-study.json`, `results/pilot/*.json`, `results/runlogs/*.log` (including `npm-test.log`:
1,230 tests, 1,219 pass, the 7 known pre-existing failures, 4 skipped).

## Stage table (all complete)

| Stage | Time (UTC) | Notes |
|---|---|---|
| Setup, code, doors, smoke, unit tests | 13:56–14:15 | |
| Pilot attempt 1 (aborted, fine-step change) / attempt 2 | 14:15–14:19 / 14:20–14:32 | attempt 2 all identities true |
| Benches, pilot P0 and sensitivity code | 14:33–14:39 | |
| Protocol freeze | 14:40:30 | commit `a836cd5` |
| P0 parity (first run failed on a job-name collision, O1; rerun passed) | 14:41 / 14:43–14:45 | |
| Audit (archive only) | 14:41:51 | |
| Audit re-evaluation, sensitivity (stopped by O1, resumed), seeds | 14:45–14:52 | commit `be8006e` |
| C19 search / qualify / fold freeze / evaluation | 14:53–15:29 | commit `2ea8481` |
| C21 | 15:29–16:17 | commit `a10e24f` |
| C23, sequential | 16:17–17:24 | commit `a634d5b`, `0406c17` |
| C24 search / qualify | 17:24–18:27 | |
| Final selection | 18:27:30 | commit `ebf3d74` |
| Final comparison (FULL door, once) | 18:27:58–18:29:25 | |
| Full npm test (capped unit) | started 18:30 | 7 known pre-existing failures only |

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
- O1 (AMENDMENTS.md): P0's first run failed on a pilot job-name collision; the audit and two development jobs started
  before P0 passed and were stopped; P0 rerun passed before any result was used.
- The pre-freeze pilot opened D19–D24 (engineering booleans only); the informed seeds carry later information.
