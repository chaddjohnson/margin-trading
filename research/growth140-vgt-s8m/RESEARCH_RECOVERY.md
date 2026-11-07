# Research recovery checkpoint — growth140-vgt-s8m (Growth 1.4.0 VGT, Study 8–style, memory-bounded)

## Top screen

- **Updated:** 2026-11-07T13:10Z (UTC, from the clock). **Status: COMPLETE.**
- **Outcome.**
  - Six shortlist members qualified on development data; the primary candidate was `ec124684b6466d77` (profit,
    rank 1).
  - Validation opened once (13:02–13:03Z): **every frozen member failed the battery, and none beat #4 on the same
    dates.**
  - #4 browser parity: exact.
- **Authority and sealed records** (sha256):

  | File | sha256 |
  |---|---|
  | `PROTOCOL.md` | `ae3bfa41d5c264c3e1ebba99a8631636d548f19ef0c98ef53ec08fc53a47bac6` |
  | `AMENDMENTS.md` (no amendments) | `2ea1f4027155f47b2ae950da477a23c0d47d570be58eb7b6e0fb0b33abbb1ae7` |
  | `results/protocol_freeze.json` (code closure `2da66c39…fcc6`, 108 files; verified unchanged at the end) | `0200033cb9605e9b9f4f642cad43b241546dbaec77feb6070eba26cdc952810a` |
  | `results/parity/parity.json` | `d7b8878efe88c28b5f3d200ab6f7526ee19825e60f0e2e58d527e70bfb4a9ad0` |
  | `results/search/search.json` | `222ccf50302002439cc4788942d30dc2379849738894f3edbeacb59e7f45fc26` |
  | `results/qualify/qualify.json` | `b2e505b936838a0140064e4ef2e2f0fa688cd29724c3c129f8bff87ba6b103e8` |
  | `FROZEN_SELECTION.json` (444) | `0064deba9f371863b2e5a1626a3c004bc016149a4d3430ad6b8a583a94e19bce` |
  | `results/validation/validation.json` | `e75bb4bb8478473f94e29e686c573c8e2f9cffde715c37d1d2a3f0f5134a5081` |
  | `results/archive/MANIFEST.json` | `0d99b32520fe699100b58d960451ac7d074bb5e07ea7879fffe9247a859cb491` |

- **Commits** (branch `research/growth-vgt-study8`, pushed):
  - `b461dec`: protocol freeze, code, pilot;
  - `8d4de89`: parity, search, qualification, frozen selection (before validation);
  - the final commit after it: validation, reports, tables, archive.
- **Running processes:** none.
- **Follow-up gate (needs the user).** Whether to start a new study with 2025–2026 marked exposed (REPORT.md §11).
  Nothing here is deployed or recommended.

## Deliverables (audited)

- `REPORT.md` (findings), `MEMORY.md` (incident, measurements, safeguards, peaks, containment, commands),
  `PROTOCOL.md`, `RUN_COMMANDS.md`, `FROZEN_SELECTION.json`, `results/tables/*.md` (side by side, ledgers, development
  evidence, validation battery), `results/archive/` (trial archive; the 81 MB search points shard is git-ignored and
  kept on disk with its hash in MANIFEST.json), `results/memory/*.jsonl`, `results/pilot/*.json`,
  `results/runlogs/*.log`.

## Environment

- Repository `/home/chad/projects/margin-trading` (main checkout; no other worktree). Node 24.21.0 at
  `/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`. systemd 259 user manager. Host Ryzen 7
  9800X3D (8 cores / 16 threads), MemTotal 62,313,736 kB, swap 8 GB fully used by other workloads.
- Cache (git-ignored): `.cache/growth140-vgt-s8m/` — development prefix file, job archives (search SQLite 833.5 MB,
  sha256 `e454f8ad…`), checkpoints, pilot outputs.

## Stage table

| Stage | Status | Time (UTC) | Output |
|---|---|---|---|
| Probes, fixture tests | complete | 10:45–11:13 | MEMORY.md §2 |
| Pilot A–F, F′, A3/G | complete (all identities hold) | 11:20–11:44 | `results/pilot/` |
| Protocol freeze | complete | 11:47:25 | `results/protocol_freeze.json` |
| P1 parity | PASSED (14 configurations, 0 differences) | 11:48–11:49 | `results/parity/parity.json` |
| Search (unit growth140-s8m-search, 12 workers) | complete | 11:49:32–12:58:51 | `results/search/search.json` |
| Qualification | complete | 12:59:21–13:01:18 | `results/qualify/qualify.json` |
| Selection freeze | complete | 13:01:40 | `FROZEN_SELECTION.json` |
| Validation (once) | complete | 13:02:12–13:03:11 | `results/validation/validation.json` |
| Full `npm test` (capped unit) | 1,222 tests: 1,211 pass, 7 known pre-existing failures, 4 skipped | 13:05–13:09 | `results/runlogs/npm-test.log` |

## Guards

- Do-not-rerun: every stage above is sealed. The validation door is spent; selection for this study has ended.
- A new question needs a new study namespace with 2025–2026 marked exposed.
- `state/strategy-lab/`, `apps/strategy-lab/dist` and the browser were not touched.

## Disclosures

- The pilot opened the development door before the freeze (engineering figures only; pilot outputs unread in
  `.cache/growth140-vgt-s8m/pilot-out/`). Pilot F's first parity run differed only in the trade-time ISO format,
  fixed before the freeze.
- The user raised the caps to MemoryHigh=44G / MemoryMax=48G (≈ 11 GiB host headroom rather than the brief's 16 GiB);
  the measured peak was 8.38 GiB.
- #4 was selected in the browser with 2025–2026 in view (an advantage on validation).
