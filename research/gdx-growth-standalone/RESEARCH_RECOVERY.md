# RESEARCH RECOVERY — Priority 4A: standalone GDX Growth optimization (`gdx-growth-standalone`)

## Top screen

- **Updated:** 2026-11-10T18:48Z (UTC). **Status: COMPLETE.** Pushed: `git push -u origin research/gdx-growth-standalone`
  (new remote branch, no force, outside the sandbox, 2026-11-10T18:47Z); `git ls-remote` at 18:47:58Z =
  `7cb829aab879fbd878fb2d9edc8aa5b677f9a20b` = local; `origin/main` unchanged (`aa5754d4`). No PR, no merge into
  `main`. This push record is its own follow-up commit, pushed the same way.
  Every stage sealed; `REPORT.md` (sha256 `8e272aaa…0633`), tables, roadmap written. Nothing is running.
- **Outcome:** qualified on development, not reliable forward. Primary = independent primary =
  `C24/indep-rise#1 profit` ($139,668.45 / DD $17,483.62; conf. p10 $63,711.46, p90 DD $24,504.45; dominates Appendix A
  on matched development evidence) — but **no trade in 2025–2026** (validation $0.00, fails V1); the selected books
  trade only on violent rebound days (minimum-strength eligibility). Independent procedure **UNSUPPORTED** (2020–2024
  −$16,537.03, sequential DD $47,820.43). Appendix A fails Q3/Q4, validation +$87,340.87, native target reproduced
  exactly. 4B export set: the primary, `C24/informed#2 robust`, P08, P09, Appendix A.
- **Follow-up gate:** the user's review of `REPORT.md`. Nothing further is started (next in the roadmap: 4B, pending
  that review).
- **Authority:** `PROTOCOL.md` `d8fd3a83d27955d2…`, frozen by `results/protocol-freeze.json`
  `fc4fef1dbcbb878c53343c049ca417e7652b8da9ef8b322728c416d85c473681` (2026-11-10T17:43:44Z; closure 252 files,
  evaluation digest `74173d33…990a`, unchanged since); `AMENDMENTS.md` R1–R2 (pre-freeze), A1 (post-validation,
  report-only funnel); standard 2.0.0 (`2005a88c…0105`), preflight PASS.
- **Commits:** `2a7d93dc` pre-freeze, `6a4d5caa` freeze, `3dc5719b` / `f78cf6e8` / `bab28345` fold selections (before
  their slices), `e4daa5bc` development records + `FROZEN_SELECTION.json` (`5d262154…2558`), `f28fabd1` validation
  (`results/validation/validation.json` `fd67adb1df620837e735702ebaf75564316003d267c9cf60cb608838463f3c11`), then the
  report commit (this checkpoint) and the push.

## Deliverables (sealed records: `npm run gdxg -- verify`)

| Record | sha256 (prefix) |
|---|---|
| `CONTROL_MANIFEST.json` | `f59ca6f6…e912` |
| `results/parity/parity.json` (294 checks, 0 failed) | `051069cf…b3ea` |
| `results/search/C19/independent.json` / C21 / C23 / C24 | `72d3506a` / `1c117df4` / `7e81a897` / `4f9e9bbd` |
| `results/search/C24/informed.json` | `e7af3701` |
| `results/folds/C19/selection.json` / C21 / C23 / C24 | `23fb988d` / `9b115262` / `5e0ac0cb` / `8eae4ae9` |
| `results/folds/C19/evaluation.json` / C21 / C23; `results/folds/sequential.json` | `e6241f73` / `ad10f35b` / `5c32c444`; `a8b80670` |
| `results/diagnostics/D24/diagnostics.json` | `918102d2` |
| `FROZEN_SELECTION.json` | `5d262154…2558` |
| `results/validation/validation.json`; `results/validation/funnel.json` (A1) | `fd67adb1…3c11`; `df60388f` |
| `results/archive-manifest.json` (10 job archives, 1.41 GiB, git-ignored in `.cache/gdx-growth-standalone/jobs/`) | `82b4e695` |

- Compute: 81,920 new centre proposals + 1,838 refinement moves; fresh evaluations: searches 603,211, qualifications
  76,267, validation neighbours 1,152 (≈ 680,630; cap 4,000,000). Chain 17:43:56Z → 18:35:06Z; validation 18:36Z.
  Peak cgroup 9.5 GiB; worker ArrayBuffers ≤ 77.7 MiB; no memory event.
- **Full `npm test`** (unit `gdxg-npm-test` in `gdxg.slice`, PATH set; 18:42:35Z → 18:46:43Z): 1,389 tests, 1,378 pass,
  7 fail, 4 skipped — exactly the 7 known pre-existing failures (intraday-study ×1, minute-optimizer ×1, study7-runners
  ×1, trailing-buy ×4); this study added 7 passing tests. No regression.

## Environment

- Repository root `/home/chad/projects/margin-trading` (main checkout, no worktree). Branch
  `research/gdx-growth-standalone` from `b7ebfdc6`. Node v24.21.0. `ls` shows CET (UTC+1).
- Code `src/gdx-growth-standalone/` (`npm run gdxg -- <command>`); tools `tools/gdx-growth-standalone/` (tables,
  archive manifest, the A1 funnel). Resource contract: `gdxg.slice` 44G / 48G / swap 0; 12 workers; GC every 256.

## Also changed by this task (outside the study directory)

- `docs/research/ROADMAP.md`: the Priority 4A brief's decisions (3C reviewed and declined; the C4-refined alias; the
  sequence; the dip-recovery report), clarifications of the 3B row (C4-refined differs from #4 in 17 settings) and the
  3C row (R's robust and balanced holders added +$1,766.52 in validation), the 4A row and its implications, 4B pending.
- Appended clarification lines (nothing rewritten) in `research/c4-gdx-growth-partner/RESEARCH_RECOVERY.md` and
  `research/vg-d1-growth-expanded/RESEARCH_RECOVERY.md`; `package.json` (`gdxg` script).

## Disclosures

- Door incident (minor, pre-freeze): the endpoint check printed the last two minute bars of the GDX and VGT files.
- R1 (pilot fixes), R2 (resource contract), A1 (post-validation report-only funnel on FULL).
- Validation on previously examined history; Appendix A and the informed seeds chosen with later data in view.

## Guards

- Every stage is sealed: do not rerun anything. FULL was opened for the validation and once for A1.
- Never modify completed studies' code or records.
