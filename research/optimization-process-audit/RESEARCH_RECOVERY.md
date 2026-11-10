# RESEARCH_RECOVERY — bounded optimization-process audit (archive reselection)

## Top screen

- **Updated:** 2026-11-10T22:45Z (UTC, from the clock). **Status: INCOMPLETE — Stage 0 (set-up).**
- **Task:** the user's bounded optimization-process audit brief (`brief/BRIEF.md`, sha256
  `75842bfb3e0fa849cc298ed0da897c73bfe1daf289a1d75f9358adfc621062f1`, 147 lines, read in full to "Stop for review.").
- **Branch:** `research/optimization-process-audit` (main checkout), from `f52deea7` (end of Priority 4A).
- **Authority:** the brief; then `PROTOCOL.md` (not yet written/frozen); `AMENDMENTS.md`.
- **Stages:** 0 set-up — running; 1 inventory/reproduction/attribution — not started; 2 policy freeze — not started;
  3 matched reselection + hindsight diagnostic — not started; 4 C24 freeze + one-time validation — not started.
- **Running processes:** none.
- **Next action:** write PROTOCOL.md + STANDARD_ADOPTION.json, pass the preflight, commit the protocol freeze.

## Environment

- Working directory: repository root `/home/chad/projects/margin-trading`; Node 24.21.0 (`.node-version`).
- Subjects (read-only, never modified): `research/vg-d1-growth-expanded/` (3B; `npm run vg-exp -- verify` → 19 sealed
  records verify, 2026-11-10T22:36Z) and `research/gdx-growth-standalone/` (4A; `npm run gdxg -- verify` → 20 verify).
  Both preflights PASS (standard 2.0.0).
- Canonical data pins verified 2026-11-10T22:36Z: `data/GDX/data.csv` `77dba9b2…5049`, `data/VGT/data.csv` `2ee06310…412e`.
- Archives (git-ignored, read-only use): `.cache/vg-d1-growth-expanded/jobs/` (search-C19/C21/C23/C24-indep 2.6–2.9 GB,
  qualify-C19..C24), `.cache/gdx-growth-standalone/jobs/` (manifest `research/gdx-growth-standalone/results/archive-manifest.json`).
- Host: 16 threads, 59 GiB; idle at start (no study slice active; mongod and vLLM outside).

## On disk versus in memory

- `results/inventory/CONTEXT_STUDIES.md`: notes condensed from a read-only digest of the context studies.
- Nothing else yet.

## Guards

- Never edit, re-hash or rerun anything in the subject or context study directories. Archives opened read-only.
- No next-period outcome of any non-published candidate is computed before the Stage 2 policy freeze is sealed and
  committed.
