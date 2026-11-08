# RESEARCH_RECOVERY — vgt-d1-growth-separate-pooled (Priority 2 follow-up: the separately optimized pair, pooled; the optimization standard)

## Top screen

- **Updated:** 2026-11-08T21:48Z (UTC, from `date -u`). File listings on this host show local time (UTC+1).
- **Status: INCOMPLETE.** S1 (manifest) is sealed and is being committed. The next stage is S2, the pilot.
- **Authority:**
  - `PROTOCOL.md` sha256 `a82513520c65857985b6d007bd19e1c10977611c086a91fab26c5d0636d75250`, frozen by the manifest.
  - `COMPARISON_MANIFEST.json` sha256 `8d01c734027bd936be3fdacb07fcee7c291b682a9c01e597b7e3a5256288e416`, sealed
    2026-11-08T21:48:08Z.
  - `STANDARD_ADOPTION.json` sha256 `90140a3945d15a63e8cf12a2788d0d8db297a0792edc6277a37bce873d4261e4` (standard
    1.0.0, `8c38ac15…e639d`; preflight PASS).
  - `AMENDMENTS.md`: none.
- **Stages:**
  - S1 manifest: complete.
  - S2 pilot, S3 comparison, S4 neighbourhood, S5 report: not started.
  - Task B documents: the standard, template, registry and preflight are written. The `CLAUDE.md`/`AGENTS.md` links,
    the roadmap and the doc links are not started.
- **Running:** nothing.
- **Next command:** commit S1, then
  `npm run vgt-pair -- launch --unit vgtpair-pilot-p1 --wait -- neighbourhood --pilot p1 --kill-worker-after 300`.

## Environment

- **Checkout:** the main checkout `/home/chad/projects/margin-trading`. Branch `research/vgt-d1-growth-separate-pooled`
  from `47422d04`, the tip of `research/vgt-d1-growth-joint`. No extra worktree.
- **Runtime:** Node v24.21.0.
- **Containment:** `vgtpair.slice` with MemoryHigh 44G, MemoryMax 48G, swap 0, re-applied at every launch.
- **Archives:** `.cache/vgt-d1-growth-separate-pooled/` (git-ignored).

## Inputs (Priority 2, sha256 recomputed 2026-11-08, all equal to `results/seals.jsonl` there; pinned in `src/vgt-d1-growth-separate-pooled/context.ts`)

| File (under `research/vgt-d1-growth-joint/`) | sha256 |
|---|---|
| `FROZEN_SELECTION.json` | `e677e894738324f03dd17413f330d218fd5fcc0aa5fb76e7193e6c2d8e5f7d72` |
| `results/folds/C24/selection.json` | `d04570f65dad650ecd66059d0e9a6db09589b645cb7b1a25b568a808057975da` |
| `results/diagnostics/D24/diagnostics.json` | `813c09d76a2337bf4b1194872869b1297b03231a1c6f8e6e6022d53d3f831a39` |
| `results/validation/validation.json` | `573c84a30e4544c2eee9bb61cc05e00711c3ac4291a9d44ffb325cafd45159b6` |
| `results/protocol-freeze.json` | `d19bbe07277c894da0a2338832eb48e15117355459ccb3fbfe9f8cfabb995f20` |
| `PROTOCOL.md` (frozen) | `7a68069290417f0e1385568ea5af5e2b96e2f74b3d10d3668ef01313382ccc74` |
| `data/VGT/data.csv` (repository root) | `2ee06310f2fa8926220fd9629c093ba77fe5d35fd2515da7f7c54caa50b5412e` |

The evaluation digest is `c936f691…` and the closure digest `65de4cc4…`. Both are checked equal to Priority 2's freeze.

## Stage table (PROTOCOL.md §9)

| Stage | Status | Command (repository root) | Output | Rerun |
|---|---|---|---|---|
| S1 manifest | complete | `npm run vgt-pair -- manifest` | `COMPARISON_MANIFEST.json` | refuses (exists) |
| S2 pilot | not started | `npm run vgt-pair -- launch --unit vgtpair-pilot-p1 --wait -- neighbourhood --pilot p1 --kill-worker-after 300` (must fail, exit 1), then the same command without `--kill-worker-after`; then `--pilot p2` stopped with `systemctl --user kill -s SIGTERM vgtpair-pilot-p2` (exit 75), then rerun | `.cache/vgt-d1-growth-separate-pooled/pilot/` | pilot only, resumable from the archive |
| S3 comparison | not started | `npm run vgt-pair -- launch --unit vgtpair-compare --wait -- compare` | `results/comparison.json`, `results/ledgers/` | once; reruns whole if interrupted (nothing sealed until the end) |
| S4 neighbourhood | not started | `npm run vgt-pair -- launch --unit vgtpair-nbhd --wait -- neighbourhood --workers 8` | `results/neighbourhood.json` | once; resumes from its archive |
| S5 report | not started | tables tool, `REPORT.md` | — | safe |

## Guards

- **Never edit** anything under `research/vgt-d1-growth-joint/` or `src/vgt-d1-growth-joint/`. Do not rerun its stages.
- **No search, no Priority 3.** Do not use Strategy Lab, its endpoints, Interactive Preview or a browser.
- **No pair evaluation before the S1 commit.** The guard refuses an uncommitted manifest.
- **Push:** only after asking once at the end (memory: brief vs wrapper).

## On disk versus in memory

- Nothing is held only in the conversation.
- The plan for Task B's remaining items is in the brief:
  - the `CLAUDE.md` instruction and a minimal `AGENTS.md`;
  - links from `docs/strategy-lab/RESEARCH_WORKFLOW.md`, `STUDY8_METHODOLOGY.md` and `docs/claude/context-recovery.md` §4;
  - `docs/research/ROADMAP.md`.
