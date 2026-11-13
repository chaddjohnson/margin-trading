# RESEARCH_RECOVERY — Assignment 1: New L0 risk-aware successor foundation

## Top screen

- **Updated (UTC):** 2026-11-13T23:25Z (from `date -u`).
- **Status:** **COMPLETE** — standard 2.2.0 adopted and registered; the D1 risk controls implemented, specified and
  verified (gates G0–G7 pass, all sealed); handoff and reports written. Nothing optimized, selected or deployed; New L0
  unchanged. The push record follows in "Delivery".
- **Follow-up gate (the user's):** review `REPORT.md` §7 and `ASSIGNMENT2_HANDOFF.md` §9. Assignment 2 does **not**
  start automatically; the research branch is never merged into `main` automatically.
- **Brief:** `brief/BRIEF.md` sha256 `4a2e14f3f923196ab517810e34a74562f25b61b5c2b1a27efa01f2ecdab1c3a5` (225 newlines,
  24,193 bytes, complete).
- **Protocol:** `PROTOCOL.md` sha256 `d04ec35df8c868be185caa4f1011955f45c881d4e14ea7e4da3e9ce8275a05eb`, frozen by
  `results/protocol-freeze.json` (`4e9409fe…`); amendments A1–A4 (`AMENDMENTS.md` `d721bd87…`): three gate-tool fixes and
  post-freeze synthetic tests, no engine change.
- **Standard:** 2.2.0, sha256 `0085cff292161e15f59e122d45793200fee01c610306ed37a3a0fab195dd5e24`; this study's adoption
  (scope diagnostic) passes the preflight; 14/14 studies pass.
- **Running processes:** none. Units `vgrcf-*` all finished (collected). The Strategy Lab server (PIDs
  2277032/58/59) is the user's live service and was never touched.

## Environment

- Main checkout `/home/chad/projects/margin-trading`, branch `research/vg-l0-risk-controls-foundation` (from
  `38222fb9`); no extra worktree. Node v24.21.0; units in `vgrcf.slice` (MemoryHigh 44G / MemoryMax 48G / swap 0), peak
  1.1–1.7 GB.
- `main` received one documentation-only commit `108c241b` (parent `2346a1b5` = `origin/main`, verified by fetch at
  2026-11-13T23:22Z), built with a temporary index (no checkout switch). The research branch merged it (`4b24d3f1`), so
  `main` is an ancestor of the branch.

## Stages (all complete; records sealed in `results/seals.jsonl`, 9/9 verify)

| Stage | Command | Output | sha256 | Simulations |
|---|---|---|---|---:|
| S1 freeze | `tools/vg-l0-risk-controls-foundation/freeze.ts` | `results/protocol-freeze.json` | `4e9409fe17bd0c79fb590ba5a54603d10b48586aeb670b41c9cf6ac7498a8e5f` | 0 |
| G0 | `gates.ts g0` | `results/gates/g0-isolation.json` | `2c9aa9f1ddcf4a38b9cae49b16e21fe494bedc0441709065c74e67946299fa9a` | 0 |
| G6 demos | `demo.ts` | `results/demonstrations.json` | `0d1e9c2aa1f55ce8d48b1ec375fed5a69107ac43f6a458b9e0cc06755f7ccc87` | synthetic |
| G1–G3 | `chains/chain1.sh newl0` (unit) | `results/gates/g1-g3-new-l0.json` | `b05b5c784fb1e82f20a48da127f09bc8d8df29c8f2bac4191494e6c840699179` | 10 |
| G4 | `chains/chain1.sh random` (unit) | `results/gates/g4-random-parity.json` | `b49f5b65e1b5a9832a32073392c4e7be3fb70cca4aab153a244640b83f0bad06` | 240 |
| G5 (first; tool error, kept) | `chains/chain1.sh invariants` | `results/gates/g5-invariants.json` | `6b128086f3c764a9f51ae5c91efb946e5c7ea8ccc71e5a6ac441a3468fca76b5` | 600 |
| G5 rerun (A2) | `gates.ts invariants --rerun a2` (unit) | `results/gates/g5-invariants-a2.json` | `f698f6be0b148855495041710031f0b4c09cb4a33bc3713ffaa606ae4b6d997f` | 600 |
| G7 (first; tool error, kept) | `gates.ts frozen` | `results/gates/g7-frozen.json` | `ff5e4d172fe60744426b78b604373e61b9217aee0eeb0c222a6b9f68a49689fe` | 0 |
| G7 rerun (A3) | `gates.ts frozen --rerun a3` | `results/gates/g7-frozen-a3.json` | `4b710e9cdf032fa5b4b22dfb3ed4433a481ac23cce1ce50a8d84a037f532221e` | 0 |
| Tests | `npm test` (unit `vgrcf-npm-test`); module + preflight tests | `results/logs/npm-test.log` | 1,551 / 1,540 pass / 7 known / 4 skipped; 107/107 | — |

Fresh pooled simulations on real data: 1,450 (cap 2,000), plus the first, unsealed `newl0` unit (10) and read-only
debug runs during A1/A2 (≈ 10). FULL was opened only for New L0 under legacy controls (G1) and for a price-only
split check. Every opening is in `results/doors.jsonl`.

## Deliverables (sha256)

| File | sha256 |
|---|---|
| `REPORT.md` | `cce4836b94352c45740ce1182055fd7f7a7c0139d1fe16f7a7a4ea2ad63d8878` |
| `STANDARD_CHANGE_RECORD.md` | `937de4486b2acfb3fd9d46788498099b40bd697c758d3d6c7f02b7157b6afd89` |
| `SPECIFICATION.md` | `b9cf3a0d55898eea36df3c62982fd5af5cd1ba2eb5c9dc249e23400e6ea53733` |
| `BASELINE_MANIFEST.md` | `7a4c053653881763483820450eee812432ba24be6ee474a2e20aef0c975d62bc` |
| `TEST_REPORT.md` | `9611c7d84e253d74ec6f082220fd6e12010e5c67592ce0d15811fa454b31fa83` |
| `ASSIGNMENT2_HANDOFF.md` | `0b7d30739af97aaa9ba00d11beb8cf319454bdb2c4f78f6f147daf5a0d0bab51` |
| `RUN_COMMANDS.md` | `ab3cc57651d4b25c4c41bb6e5ae2c70dd1a7be47891b5c9c19b689833bf793e3` |
| `tables/new-l0-full-trades.md` | `54834495bf615fc030d803a0595c6a42ce3798fe55bcf37f01476398ba7c82b2` |
| `tables/gates.md` | `1674ab09e5e713fb469599c2350dfaf6e56e993a6f34e2851f87254ae8f8cd04` |

Code: `src/d1-risk-controls/` (config, exit, book, run + tests), `src/research-standard/` (preflight 2.2.0 check),
`tools/vg-l0-risk-controls-foundation/` (common, freeze, gates, demo, tables).

## Decisions (on disk)

1. No edit to any frozen engine file; the controls extend `ExitManager`/`ShadowBook` and reuse Priority 3's pool,
   Growth books and record (digests unchanged).
2. Adaptive hold = the repository's progress-hold concept (`src/app/allIn-trailingBuy-progressHold.ts`).
3. AD7: no performance figure of a non-default control on real data.
4. `main` gets documentation only (standard + companions + roadmap note + brief + change record), as precedent
   `2346a1b5`.

## Guards

- Do not rerun sealed stages (they refuse). Do not edit the standard without a new registered version. Do not merge
  the research branch into `main` or start Assignment 2 without the user.
- After a compaction: reread `CLAUDE.md`, `docs/claude/context-recovery.md`, this file and `REPORT.md`; verify
  `results/seals.jsonl`; nothing remains to run.

## Delivery

- **Research branch:** `git push -u origin research/vg-l0-risk-controls-foundation` (new remote branch, no force;
  outside the sandbox). `git ls-remote` at 2026-11-13T23:26:38Z: `refs/heads/research/vg-l0-risk-controls-foundation` =
  `eff2cc407bfabf1efcfda2a293d8c114fabdfe5e` = local (the report commit). This push record follows as its own
  commit, pushed the same way.
- **`main` (documentation only, authorized by brief §1.3 "if … can be performed cleanly … do so"):** `git push origin
  main:main`, a fast-forward `2346a1b5..108c241b`, no force. `git ls-remote` at 2026-11-13T23:26:38Z: `refs/heads/main` =
  `108c241b1811a1c9083ac83d3dbd5376576301ed` = local `main`. It contains no engine code. The research branch is not
  merged into `main`.
