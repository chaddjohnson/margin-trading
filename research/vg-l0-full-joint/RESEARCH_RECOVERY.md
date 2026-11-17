# RESEARCH_RECOVERY — Assignment 3: New L0 risk-aware successor, full joint optimization

## Top screen

- **Updated (UTC):** 2026-11-17T10:20Z (from `date -u`).
- **Status:** **COMPLETE.** Implementation, stage V, the frozen protocol, the full study chain (C19 → C21 → C23 →
  sequential → C24 Track I and Track N → frozen selection → FULL once), the report-only diagnostics, the tables and
  `REPORT.md` are done. **Outcome: no qualifying successor.** L/RA1 is the first chronologically supported independent
  procedure (+$40,600.52 / $31,318.53), but its C24 primary is dominated by New L0 and failed V2/V3; every other procedure
  is unsupported or incumbent-informed. New L0 reproduced exactly and remains the reference, untouched.
- **Follow-up gate (the user's):** review `REPORT.md` §9–§10. Decisions open to the user: whether to set up a separately
  authorized prospective paper/shadow comparison (New L0, L/RA1's procedure, Track N's `GD1.VB0` / `GB0.VD1`); whether
  RA1 should become a primary selection rule; how future searches should treat Growth·VGT's unbounded-hold exposure; when
  to review the unmerged modules (`src/d1-risk-controls/`, `src/d1-risk-controls-rc2/`, `src/vg-l0-full-joint/`) for
  merging (never automatic). Nothing starts automatically; nothing is merged into `main`.
- **Authority:** brief `brief/BRIEF.md` `5620330a…`; protocol `PROTOCOL.md` `ec9de0d623e3c623c65512c5f013c8da6900104e25d1fa28c5b982c8202b3fa3`
  frozen by `results/protocol-freeze.json` (`869ae1a7…`, commit `2a56e9b6`, 2026-11-15T13:26:59Z); amendments R1, R2
  (before the freeze; `AMENDMENTS.md` `1ca8a141…`), no post-freeze amendment; standard 2.2.0 (`0085cff2…`), NL0 1.0.0
  (`9b387bb4…`). Evaluation digest `2aeeee42…` and decision digest `fbf9fc67…` unchanged from the freeze to the end.
- **Running processes:** none (`vgl0fj-chain1` and `vgl0fj-diagnostics` finished and were collected).

## Environment

- Main checkout `/home/chad/projects/margin-trading` (no extra worktree), branch `research/vg-l0-full-joint` from
  `73d3a748` (Assignment 2's verified tip; contains `main` = `108c241b`, untouched). Node v24.21.0; `vgl0fj.slice`
  (44G/48G/0); 12 workers; peak 19.0 GiB.
- `results/logs/` is git-ignored by a global pattern and is force-added (as Assignment 2 did).

## Stages (all complete; 47 sealed records verify: `npm run vg-l0fj -- verify`)

| Stage | Commit | Key record (sha256 prefix) |
|---|---|---|
| Implementation + tests | `8b762e6e` | gaps 24/24, space 13/13, select 7/7 |
| Stage V | `bcc166d4` | `results/parity/parity.json` `0e8ca216…` (0 failed of 18,091) |
| Protocol final draft / freeze | `45a47409` / `2a56e9b6` | `results/protocol-freeze.json` `869ae1a7…` |
| Report-only tooling | `934a8c5a` | `tools/vg-l0-full-joint/` |
| C19 selection / fold | `cdd37dc2` / `3d489a73` (chain commits) | `results/folds/C19/` |
| C21 | `a8b9e2f4` / `96286b77` | `results/folds/C21/` |
| C23 | `41db5e2d` / `5ca7cf3f` | `results/folds/C23/` |
| Sequential verdicts | `7ecf9a68` | `results/folds/sequential.json` `140583e8…` |
| C24 Track I / Track N + selection | `a3131048`, `619cdcce` / `39db58e4` | `results/folds/C24/` |
| Frozen selection | `1370534e` | `FROZEN_SELECTION.json` `4080d4b1…` |
| Validation (FULL, once) | `4063ea52` | `results/validation/validation.json` `05cddeeb…` |
| Diagnostics, tables, report | final commits (see Delivery) | `results/diagnostics/*.json` (8 sealed), `results/tables/*.md`, `REPORT.md` `575911d2…` |

Compute: 17.53 M unique fresh search simulations (18.27 M requested; 722,891 archive hits; 0 retries) + 1.64 M
qualification; chain wall time 44 h 24 min (2026-11-15T13:27:08Z → 2026-11-17T09:50:48Z); 0 resource-guard stops; 171 of
616 Track I and 14 of 64 Track N lanes budget-bound at NL0's island cap.

## Audited deliverables (sha256)

| File | sha256 |
|---|---|
| `REPORT.md` | `575911d2c062579e33204e4ec97e09bd78dc8fc1c2bd5a71de1e1ea30350fc8b` |
| `PROTOCOL.md` (frozen) | `ec9de0d623e3c623c65512c5f013c8da6900104e25d1fa28c5b982c8202b3fa3` |
| `TEST_REPORT.md` | `d33a9a052f9bb0e9dbe9ff82e0546eaf61e35c357d6682fe3d8836dd044df49d` |
| `STANDARD_ADOPTION.json` | `b17a667af0b04e9a42484d11a2bd898e4e59b1fc75176c0eeacf1bc4f6f56232` |
| `FROZEN_SELECTION.json` | `4080d4b1ca4db93296876f009307ce7cd055e1ab04f16133f7761c40a288f2d7` |
| `results/folds/sequential.json` | `140583e8466503b0e831024844640b4bb4dcc2fb274191fce2a648ec9e702a5b` |
| `results/validation/validation.json` | `05cddeebad2142f44bfab156860406adbaf697f041a8432c671cfef5b71a5408` |
| `results/diagnostics/finalists.json` | `0d60ae8c27cbdc12cb35f188fb851c98ae9f014ca55a86ae7f2a5940ffd6ac59` |
| `results/diagnostics/selection-study.json` | `850f687909b963ce5c2406de76f418d71bf50209f78f164f3ae9e1cfa1244e49` |
| `results/tables/summary.json` | `bb07220aaf78cdba2f6c7bf3b138664d2ae68c5abf09d650b888306238889c63` |

## Guards

- Every stage is sealed; do not rerun (they refuse). FULL was opened for the validation once and by the post-validation
  report-only replays; it is not reopened for this study's selections. The standard, NL0, RC 1/RC 2, Assignment 2 and
  earlier studies are untouched.

## Disclosures

- Pre-freeze revisions R1 (stage V's Growth gate redesigned after dry runs) and R2 (pilot figures; a pilot-only guard fix).
- Stage V's dry runs and its sealed run opened FULL for New L0 under legacy defaults only (AD3).
- Engineering diagnostics on D24 (`.cache/vg-l0-full-joint/reach-diag*.ts`): counts only.
- The full `npm test` reads whole data files (as in Assignment 2); it fed no decision.
- Track N ran at 1.30× Track I's requested evaluations at C24 (13 refinement cells, not the 17 the sizing assumed).
- The report-only diagnostics ran after the validation, as precommitted.

## Delivery

- `git push -u origin research/vg-l0-full-joint` (new remote branch, no force; outside the sandbox). `git ls-remote` at
  2026-11-17T10:20:51Z: `refs/heads/research/vg-l0-full-joint` = `47d30b8d82a605fe26c2cab455b525db6d13f953` = local. This
  push record follows as its own commit, pushed the same way. `main` was not touched; nothing was merged.
