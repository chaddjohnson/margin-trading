# RESEARCH_RECOVERY — Study 3 `study3-vgt-independent-momentum-v1` (Stage 1 only)

## Top screen (read first)

- **Updated:** 2026-10-28T18:20Z (UTC, `date -u`).
- **Task:** Study 3 of 3, **Stage 1 only** — standalone VGT long momentum research (no D1/B4/B5 or shared-pool run).
  Brief `brief/BRIEF.md` (sha256 `aa09a2e9cfa8a1780a835fd3675b483d8067c107af926448cec73417820cc103`; 331 lines; §13 verified).
- **Status: Stage 1 COMPLETE (research, reviews, reports, tests); commit and push in progress.** All stages S0–S8
  sealed and verify; final code/evidence review done (`reviews/FINAL_CODE_AND_EVIDENCE_REVIEW.md`, dispositions
  beside it; no defect changing a result). Verdict (frozen rubric, `results/records/analysis.json`):
  **no demonstrated standalone edge** (fold picks 2020 +$18,608, 2021 +$14,577, 2022 −$57,578, 2023 +$24,646; Σ +$253).
- **Protocol:** `PROTOCOL.md` v1.2, frozen 2026-10-28T17:31:30Z (`PROTOCOL_FREEZE.json` bodyHash `a707eb105b506b0e…`,
  file sha256 `53fb4f55e837…`). Code frozen 17:32:02Z (`results/code_freeze.json` manifest `1822bc10bf9145d4…`, 120
  files). **Amendment head: A2** (A1, A2 descriptive only; `AMENDMENTS.md`, `results/amendments.jsonl`).
- **Running:** nothing. After-study `npm test` finished (764 tests, 757 pass, the same 7 baseline failures;
  `audit/tests/full-suite-after.txt`).
- **Next step:** commit 1 (policy file only), commit 2 (study: `research/study3-vgt-momentum/`, `src/study3-vgt-momentum/`,
  `package.json`); `git push -u origin research/study3-vgt-momentum-first-principles`; confirm with `git ls-remote`;
  record the hashes here; then **STOP for the user's review** (Stages 2–4 need new approval).
- **Authorisation:** Stage 1 only. **Stages 2–4 NOT authorised, NOT started.**

## Environment

- Main checkout; branch `research/study3-vgt-momentum-first-principles` from `70312f298742fa6f9ae493ef3828aa5621f19e54`
  (Study 2 head = its remote). Nothing committed yet. Working tree: `research/study3-vgt-momentum/`,
  `src/study3-vgt-momentum/` (new), `docs/claude/context-recovery.md` (edited), `package.json` (+1 script line).
- Node v24.21.0; 16 cores; script `--max-old-space-size=16384`. No `.env`, network or broker use.

## Authority and records (file sha256 prefix / createdAt UTC)

audit `ed866525…` 17:14:22 · parity `d10628e7…` 17:31:47 · develop-A `1dab1787…` 17:32:47 · B `58237dd6…` 17:34:09 ·
C `92c1e7b8…` 17:35:43 · D `1c8c6ceb…` 17:37:02 · H `d029e15c…` 17:38:41 · evaluate-A `fd7ea5b8…` 17:38:56 · B
`e1d8dd89…` 17:39:01 · C `2ccb93fe…` 17:39:07 · D `537fb4d9…` 17:39:12 · diagnostics `22dba370…` 17:39:15 · robustness
`6f746727…` 17:39:32 · analysis `6d397a84…` 17:39:35. Reviews: methodology 1 `bf65039e…`, re-review 2 `c0fdc86a…`
(each with dispositions). Body hashes in `IMPLEMENTATION_AUDIT.md` §4.

## Stage table

| Stage | Status | Command (repo root) | Resume semantics |
|---|---|---|---|
| Setup, baseline tests (744 / 737 pass / 7 known fail), policy edits, ideation, reviews 1–2 | complete | — | — |
| S0 audit … S8 analysis | **all sealed, all verify** | `npm run study3-momentum -- stage <name> [key]` | write-once; never rerun (a rerun needs a fresh study tree) |
| Reports + `scripts/report_tables.py` | written; tables regenerated read-only | `python3 -I research/study3-vgt-momentum/scripts/report_tables.py` | rerunnable, read-only |
| Final code/evidence review | complete 18:12Z; dispositions written; amendment A2 (incl. fold-pick parity 0 differences) | — | — |
| After-study tests | complete 17:54Z: 764 / 757 / the same 7 | `npm test` | rerunnable |
| Commit / push | not started | `git add <authorised paths>`; `git commit`; `git push -u origin research/study3-vgt-momentum-first-principles` | — |

## Constants

`PROTOCOL.md` v1.2 / `src/study3-vgt-momentum/context.ts`: first decision close 2017-01-03; folds A–D (+H); 5 bps, 11%;
$35,000 reference; Sobol 1,024 + 4×32 + 32d + 16 per family-history (caps 16,000 / 80,000); seeds
sha256(`study3|<family>|<history>|global`) etc. Total evaluations 66,366.

## On disk versus in memory

Everything is on disk; command logs in `results/logs/` are local (git-ignored).

## Guards

- **Do not rerun any stage** or edit any sealed record, payload, freeze or frozen code. Report text may change.
- No bar after 2023-12-29; no change to `config/`, `data/`, prior studies or D1 code.
- Commit only: `research/study3-vgt-momentum/` (incl. results), `src/study3-vgt-momentum/`, `docs/claude/context-recovery.md`,
  `package.json`. Never `.env`, `._*`, `results/logs/` (ignored), `data/`. No merge, PR, tag or force push.

## Disclosures

Designer's prior knowledge (P §1); Study 2's `realData.test.ts:83` guard fails on any later branch by design; pre-freeze
defects caught by tests and reviews (`IMPLEMENTATION_AUDIT.md` §3, §5); amendment A1; no recovery event (no compaction or
interruption observed in this session).
