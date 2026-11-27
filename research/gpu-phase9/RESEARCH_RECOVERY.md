# RESEARCH_RECOVERY — GPU Phase 9: acceptance renewal for the research-date-boundaries integration (INCOMPLETE)

**Top screen (times from `date -u`)**

- **Updated:** 2026-11-27T22:58Z (clock). **INCOMPLETE.**
  - **Done:** set-up (namespace, tools, protocol, adoption, baseline, archive restore, edge subjects).
  - **Next:** commit, then the protocol freeze (`python3 -I tools/gpu-phase9/protocol-freeze.py`), then the campaign.
- **Task:** Assignment 2 (`brief/BRIEF.md`, verbatim). The task checkpoint is
  `docs/data-updates/2026-11-27-assignment-2/WORK_RECOVERY.md`, which owns the integration, the merge and the service.
- **Branch and worktree:** `integration/research-date-boundaries-a2`, in the worktree
  `/home/chad/.local/share/margin-trading-worktrees/a2-integration` (PROTOCOL.md AD10). The main checkout is not
  switched: the user's live Strategy Lab runs from it.
- **Record in force:** Phase 7 `bb0e3fcf…`, STALE on the candidate, which is why this study exists.
- **Running:** nothing (`systemctl --user list-units 'gpup9*' 'p9chain*'`).
- **Protocol:** `PROTOCOL.md`, standard 5.0.0, scope diagnostic; preflight PASS. Amendments: none.

## Stage table

| Stage | Status | Command / record | Time (UTC) | Resume / guard |
|---|---|---|---|---|
| Baseline (`f2c414ef`, Git objects) | complete | `tools/gpu-phase9/baseline.ts` → `results/baseline/*` | 22:54Z | captured once (the tool refuses a rerun) |
| Archive restore (2 of 14, scratch) | complete, both PASS | `results/restore/restore-record.json`; scratch `cache/restore/` (10.7 GB, git-ignored) | 22:55Z | re-creatable with the same command |
| Edge subjects | complete | `results/risk-parity/edge-subjects-D21.json` `5224a351…`, `-D24.json` `6bb76311…` (near35/near40 = Phase 7's 600, band 400 fresh) | 22:56Z | deterministic |
| Protocol freeze | not started | `results/protocol-freeze.json` (sealed) | — | written once |
| Campaign `chains/final.sh` | not started | `results/…`, log `results/logs/final-chain.txt` (ignored) | — | `START=<n>` resumes; jobs refuse to be recreated (JOB_EXISTS) |
| Generator | not started | `tools/gpu-phase9/accept.ts` → `config/gpu-backend/acceptance.json` | — | never rerun after ACCEPTED |
| Post-record checks | not started | `results/post-record/` | — | — |

## Constants

- **Seeds:** derived from the study name (`src/gpu-phase9/context.ts` `seedOf`).
- **Mini schedule:** `tools/gpu-phase9/job.ts`, `--job mini`: door D19, eight cells, two replicates, screen 96 (Phase 2's
  G7 schedule).
- **Doors:** D19–D24, FULL (verified prefix through 2026-10-30), the regime windows and episodes, synthetic fixtures. No
  data after 2026-10-30.

## Guards

- No official optimization. The only optimization is the fixed-seed engineering mini schedule on D19.
- Never rerun the generator after ACCEPTED.
- Never edit sealed records (`results/seals.jsonl`).
- Never edit the chain while it runs.
