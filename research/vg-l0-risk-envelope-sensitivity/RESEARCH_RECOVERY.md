# RESEARCH_RECOVERY — Stage A risk-envelope sensitivity audit (RES-A 1.0.0) — INCOMPLETE

**Top screen (times from `date -u`)**

- Updated: 2026-11-22T16:01Z. **INCOMPLETE.** Stage: predeclaration written (POLICY_MATRIX.md, PROTOCOL.md,
  STANDARD_ADOPTION.json; preflight PASS 3.0.0 diagnostic), about to be committed. No comparative result computed yet.
- Authority: `brief/BRIEF.md` sha256 `5a99e0e0600e674aa398cf31cd2d727e223e5e3c5bf66efcdc10e8d9080ecc43`; `PROTOCOL.md` and
  `POLICY_MATRIX.md` (hashes: see the predeclaration commit); amendments head N1.
- Running: nothing.
- Next: commit the predeclaration; then `tools/vg-l0-risk-envelope-sensitivity/` population replay (zero evaluations).

## Environment

| Item | Value |
|---|---|
| Checkout | main checkout `/home/chad/projects/margin-trading` (no extra worktree) |
| Branch | `research/vg-l0-risk-envelope-sensitivity`, created from `7f69d0d2` (pilot final commit) |
| Node | v24.21.0, every evaluating process `node --no-maglev` |
| Acceptance | `config/gpu-backend/acceptance.json` sha256 `bb0e3fcf6bde45cc654dc2d8d166153353918dfe3aa18d826dd8deda5cabf7b7` (Phase 7, ACCEPTED) — untouched; no GPU job in this audit |

## Baseline hashes (must not change)

| File | sha256 |
|---|---|
| `research/vg-l0-risk-envelope-pilot/PROTOCOL.md` | `723eea5d96fb986bb3d285b62201895052d573b2e6154a6fe94e8302c5ef2e78` |
| `research/vg-l0-risk-envelope-pilot/AMENDMENTS.md` | `a3b0a31e9b3ec55df3e6d6c6f6b4cb8e7f4852217b603cbcc5dbd8bc21cd85e8` |
| `research/vg-l0-risk-envelope-pilot/REPORT.md` | `b3eade7419bea853713a7874fbb0beedf7e09f574fd1ee39d7ac1ab0d1de0e6f` |
| `research/vg-l0-risk-envelope-pilot/results/seals.jsonl` | `5235c4891bd2251e08cd467a2ffbaf6cb86c5724127fecfdfa7f8c535d3ad0f3` |
| `docs/research/OPTIMIZATION_STANDARD.md` | `4e8244e65bf1dd7c54ad46a1c941321d68b0c144344fd0c464dcc047eea5fef1` |
| `docs/research/methods/NEW_L0_METHOD.md` | `9b387bb47ce02178ee27bb8379a11e4940c9c6c5a44c3e7ab5fcc3c2cc0411e4` |
| `src/risk-envelope/policy.ts` | `df9d314ff0dbe78ba9d68103721105c4541b42d06a4f6a5edfd7f74f2821eeee` |
| `src/risk-envelope/diagnostics.ts` | `16e4896c91019c1b08c7ce6c87884d22b20e64265c79a4de042b422ebe9ee076` |

## Stage table

| Stage | Status | Command | Output | Resume |
|---|---|---|---|---|
| S0 predeclaration | complete (uncommitted) | — | POLICY_MATRIX.md, PROTOCOL.md, STANDARD_ADOPTION.json | — |
| S1 population replay (zero eval) | not started | — | results/population/ | rerun from scratch (deterministic; archive copies) |
| S2 analysis A1–A7 | not started | — | results/ | rerun |
| S3 G1/G2/G3 CPU replays | not started | — | results/replays/ | rerun (deterministic) |
| S4 reports, ZIP, commit, push | not started | — | — | — |

## Guards

- Never write into `research/vg-l0-risk-envelope-pilot/` or its `cache/` (copies only); never edit `src/`.
- No GPU job, no D23/FULL door, no Stage B.
