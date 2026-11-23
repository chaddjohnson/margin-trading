# RESEARCH_RECOVERY — RES-BD 1.0.0: Stage B census and profit-giveback diagnostics — INCOMPLETE

**Top screen** (times UTC from `date -u`; `ls` listings on Apollo show CET = UTC+1)

- Updated: 2026-11-23T07:35Z. **INCOMPLETE.**
- Current stage: **S0, the diagnostic plan** (written; committing). No tool has run on a real record yet.
- Authority: `PROTOCOL.md` (sha256 in `STANDARD_ADOPTION.json`), `brief/BRIEF.md` sha256 `b15e9746…`, `AMENDMENTS.md`
  head: none.
- Running: nothing.
- Next command: write and test the tools (S1), then run S2 for C19.

## Environment

| Item | Value |
|---|---|
| Checkout | the main checkout `/home/chad/projects/margin-trading`; no extra worktree |
| Branch | `research/vg-l0-risk-envelope-stage-b-diagnostics`, from Stage B's `1c1f9e72` (= `origin/research/vg-l0-risk-envelope-stage-b`; `main` = `3606f4b3`, untouched) |
| Node | v24.21.0 (`/home/chad/.local/share/fnm/node-versions/v24.21.0/installation/bin/node`); every replaying process runs `node --no-maglev`, `GPU_POLICY_PURPOSE=diagnostic` |
| Scratch | `.cache/vg-l0-risk-envelope-stage-b-diagnostics/` (git-ignored `/.cache/`, main disk; not tmpfs) |
| Containment | `vgl0rebd.slice` (44G / 48G / swap 0) via `tools/vg-l0-risk-envelope-stage-b-diagnostics/launch.sh` |

## Baseline identities (before processing)

- The 12 Stage B job archives: `results/verification/archives-before.sha256`, hashed 2026-11-23T07:32:35Z–07:32:42Z.
- Stage B's sealed records: `research/vg-l0-risk-envelope-stage-b/results/seals.jsonl` (22 files).

## Stage table

| Stage | Status | Command / output | Resume |
|---|---|---|---|
| S0 plan | written | PROTOCOL.md, STANDARD_ADOPTION.json (preflight PASS 07:34Z), AMENDMENTS.md, brief/BRIEF.md | — |
| S1 tools + tests | not started | `tools/vg-l0-risk-envelope-stage-b-diagnostics/` | rerun |
| S2 census + qualification replay (C19, C21, C24) | not started | — | deterministic rerun from a fresh copy |
| S3 giveback CPU replays (C19, C21, C24) | not started | — | deterministic rerun |
| S4 analysis, reports | not started | — | deterministic rerun |
| S5 regression, ZIP, push | not started | — | — |

## Guards

- Never write into `research/vg-l0-risk-envelope-stage-b/` or `tools/vg-l0-risk-envelope-stage-b/`. Never open an
  original archive except to hash it. Never delete a Stage B archive.
- No GPU job, no search, no D23 or FULL door.
