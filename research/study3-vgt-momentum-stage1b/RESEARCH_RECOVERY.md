# Research recovery checkpoint — Study 3, Stage 1b (VGT momentum: executable chronology, exits/reentry, exposure)

## Top screen (read this first)

All times UTC (`date -u`); machine file listings show local time (CET = UTC+1). Run commands from the repository root.

- **Updated:** 2026-10-29T01:15Z. **Status: COMPLETE.** Committed `70257acc10eeec68fa89f6fe0df0bb7a96fe3389` on
  `research/study3-vgt-momentum-stage1b` and pushed to `origin` (new branch; `git ls-remote` shows `70257acc…`); this
  checkpoint update is a second commit. No merge, PR, tag or force push. **Do not rerun any stage.**
- **Verdict (frozen rubric, `results/records/analysis.json`): risk-incompatible; nomination: none.** Π1 (S1 executable
  selector) 2020 +$14,432 / 2021 +$18,059 / 2022 −$30,966 / 2023 +$11,049, Σ +$12,573, chained minute DD $42,882 >
  $35,000; (b), (e), (f), (g) also fail; (a), (d) pass. Independent final audit (`reviews/FINAL_AUDIT.md`) recomputed
  every rubric quantity: supports the verdict, no blocker; dispositions written; amendment A2 records its descriptive
  findings.
- **Brief:** `brief/BRIEF.md` sha256 `c7b09fe885a8115fd9a9605f0aa5eae99f274a562103f4159bade683a412079f` (48,953 bytes, §15 read).
- **Protocol:** PROTOCOL v1.2 `aa255bc9…`, ENGINE_CONTRACT `7eed7cc0…`, matrix v1.2 `7790d016…`; frozen 2026-10-28T23:47:17Z
  (`PROTOCOL_FREEZE.json` `236eaffa…`, body `5438e105…`). Amendment head: **A2** (A1 00:19:04Z pre-outcome contract
  clarifications; A2 01:13:38Z post-outcome descriptive disclosures, no rerun). Code frozen 00:24:43Z
  (`results/code_freeze.json` `594e6168…`, manifest `dc37a602…`, 80 files).
- **Running processes:** none.
- **Follow-up gate (needs the user's explicit approval and a new frozen protocol):** Stages 2–4 (VGT D1 + momentum,
  B4 + momentum, B5 + momentum) and any 2024–2025 validation / separate 2026 holdout — **not authorised, not started**.
  Nothing is nominated for them.

## Environment

- Branch `research/study3-vgt-momentum-stage1b` from `db6a3ec83bfade06441efe9ae2219e2bc07a25fc` (Stage 1's verified remote
  head). Main checkout; no other worktree (scratch worktrees for `main` and the ranked-preemption verifier were removed).
- `main`: policy-only commit `3ef43015f812c651c9f4608bbe4f01af4a0b81af`, pushed and verified (`RECOVERY_POLICY_MAIN_INTEGRATION.md`).
- Node v24.21.0; 16 cores, 59 GB RAM; develop stages on 14 worker threads (peak RSS ≈ 2.1 GB); `--max-old-space-size=16384`.
- Data `data/VGT/data.csv` sha256 `d8e6991de7d4901052c0d52c63e6461f28a62049615412f7188f3f57ff4f0a09` (local, git-ignored).

## Stage table (all write-once; none rerun)

| Stage | Status | Sealed (UTC) | Record sha256 | Notes |
|---|---|---|---|---|
| 0A main policy integration | complete | 2026-10-28 ≈22:33Z | — | `3ef4301`; fresh headless autoload test |
| `audit` | sealed | 23:35:46Z | `4712ba92…` | baseline npm test 764/757/7 embedded |
| reviews 1–2, re-review 3, dispositions | complete | 22:48–23:46Z | — | `reviews/` |
| `freeze-protocol` | frozen | 23:47:17Z | `236eaffa…` | |
| reference engine (separate agent) | complete | 00:16Z, A1 update ≈00:21Z | `reference.ts` `50d34873…` | `REFERENCE_AUTHOR_NOTES.md` |
| synthetic parity rounds 1–2, A1 | complete | 00:18–00:21Z | — | `reviews/PARITY_DEVELOPMENT_LOG.md` |
| `parity` | sealed | 2026-10-29T00:23:11Z | `fc0ddd7c…` | pass; codeManifestHash = code freeze |
| `freeze-code` | frozen | 00:24:43Z | `594e6168…` | |
| `develop-A` … `D`, `H` | sealed | 00:26:28, 00:28:45, 00:31:26, 00:34:10, 00:37:24Z | `3984057b…`, `de55a6e4…`, `a581a62c…`, `b501e3fd…`, `bd16190e…` | 794,623 evaluations |
| `repair` | sealed | 00:37:44Z | `9c85db00…` | Stage 1 reproduced to the cent |
| `evaluate` | sealed | 00:37:48Z | `99be7b3f…` | guards 0; 25 paths fast = reference |
| `robustness` | sealed | 00:38:23Z | `a9dd7f68…` | 4,181 evaluations |
| `analysis` | sealed | 00:38:23Z | `5c6b4f56…` | risk-incompatible |
| reports + `scripts/report_tables.py` | written | 00:40–01:14Z | — | tables regenerate read-only |
| final audit + dispositions + A2 | complete | ≈01:10–01:14Z | `FINAL_AUDIT.md` `cc188ceb…` | |
| after-study `npm test` | complete | ≈01:00Z | — | 791 / 784 / the same 7 |
| commit + push | complete | 2026-10-29T01:15Z | — | `70257acc…` pushed and verified on origin |

## Constants

`PROTOCOL.md` v1.2 / `src/study3-vgt-momentum-stage1b/context.ts` (code = matrix, tested): folds A–D (+H); 5 bps, 11%,
net-debit; $35,000 reference; RoD floor $10,000; budgets 222,293 per history (cap = plan); seeds sha256 labels
`study3b|…`.

## On disk versus in memory

Everything is on disk. Command logs in `results/logs/` are git-ignored (their outcomes are in the records and reports).

## Guards

- **Do not rerun any stage** or edit any sealed record, payload, freeze or frozen code. Reports and tables may change.
- No bar after 2023-12-29; no change to `config/`, `data/`, earlier studies, Stage 1 or D1/B4/B5 code; no package.json change.
- Commit only `research/study3-vgt-momentum-stage1b/` and `src/study3-vgt-momentum-stage1b/` (never `results/logs/`,
  `._*`, `data/`) on `research/study3-vgt-momentum-stage1b`; push it to `origin` (new branch); verify with
  `git ls-remote origin refs/heads/research/study3-vgt-momentum-stage1b`. No merge, PR, tag or force push.

## Disclosures

Designer knowledge of 2016–2023 (PROTOCOL §1); pre-freeze development parity runs on Stage 1 configurations (fold-A data,
difference counts only); amendment A1 (pre-outcome), A2 (post-outcome, descriptive); the S2-two-boundary coverage gap;
missing fixtures and diagnostics (`IMPLEMENTATION_AUDIT.md` §8); the event-ledger defect; twice I wrote estimated times
into this file early in the task and corrected them to clock times; no compaction or interruption recovery was needed.
