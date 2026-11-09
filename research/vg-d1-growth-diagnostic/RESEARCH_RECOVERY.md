# RESEARCH RECOVERY — Priority 3A: GDX Growth participation and neighbourhood risk (diagnostic)

## Top screen

- **Updated:** 2026-11-09T14:02Z (UTC). **Status: INCOMPLETE** — every stage sealed (R, S, N, P, F); analysis, tables,
  report and documentation remain.
- **Authority:** `PROTOCOL.md` sha256 `3d985efb2dca53b5a723712c45b85b5f09801df197f6b5df020d0ed829745bd9`;
  `DIAGNOSTIC_MANIFEST.json` `ed21241304bf50b081d605f05daa986dff7f63ddafb5eca3dede10def56e5494`;
  `results/protocol-freeze.json` `b027a6bb777d762e0969d2b4abfa33dde32311da995c1f2e31b7484445cbd0a8`; amendments: **A1**
  (stage N's comparator; acknowledged digest `10d86a22…70ce`).
- **Stages:** freeze, R, S, N, P, F complete and sealed (`npm run vg-diag -- verify`: 7 records ok).
- **Running processes:** none.
- **Next step:** tables (`tools/vg-d1-growth-diagnostic/tables.ts`), `REPORT.md`, roadmap; full `npm test` in a unit;
  commit and push.

## Environment

- Main checkout, branch `research/vg-d1-growth-diagnostic` from `76e402aa` (Priority 3's end). Node v24.21.0.
- Standard **1.1.0** (`e86b0160…beff8`) enacted by this task from the brief's agreed decisions before adoption;
  registry updated; Priority 3 and the Priority 2 follow-up keep 1.0.0 (preflight passes with the retained-pin notice).
- Brief `brief/BRIEF.md` `e5e420bd…e509`.
- Priority 3 pins (verified by every stage): evaluation digest `147cad7c…`, closure `f7fc49aa…`, sealed records and
  archive sha256s in `results/protocol-freeze.json`.
- Data: Priority 3's doors (`.cache/vg-d1-growth-joint/doors/`, D24) and FULL under its guard (stage F only).

## Stage table

| Stage | Command | Output | Status |
|---|---|---|---|
| Freeze | `npm run vg-diag -- manifest`, `… freeze` | `DIAGNOSTIC_MANIFEST.json`, `results/protocol-freeze.json` | complete (sealed 13:54Z) |
| R | `npm run vg-diag -- launch --unit vgdiag-R --wait -- stage R` | `results/development/participation.json` `a7b0ac76…c4f6` | complete 13:55Z (24 s, 1 GB) |
| S | `… --unit vgdiag-S … stage S` | `results/archive/audit.json` `5aa23c68…117e` | complete 13:55Z (29 s) |
| N | `… --unit vgdiag-N2 … stage N` (first attempt `vgdiag-N` stopped on the comparator, A1) | `results/risk/neighbourhoods.json` `65375954…e5a8` | complete 14:00Z (2 min, 2.1 GB) |
| P | `… --unit vgdiag-P … stage P` | `results/risk/probes.json` `9c260e36…65e5` | complete 14:00Z (18 s) |
| F | `… --unit vgdiag-F … stage F` | `results/full/retrospective.json` `cd288cb9…4963` | complete 14:00Z (12 s) |

Counts (sealed records): development 1,152 (+2 in the stopped first N attempt), FULL 10, probes 214 (24 duplicates
not run), observer book runs 855 — inside the ceilings 4,000 / 64 / 256 / 4,000.

Resume semantics: each stage seals only at its end; an interrupted stage left nothing and reruns from the start.

## Guards

- Priority 3 (`research/vg-d1-growth-joint/`) is complete and frozen: never edit, re-seal or rerun its records, never
  write into its `results/` or its job archives (opened read-only).
- No search, no new winner, no validation-window selection. Ceilings: 4,000 development, 64 FULL, 256 probes, 4,000
  observer book runs (enforced in code).
- Backend only; Strategy Lab is never touched.

## Disclosures so far

- Pre-freeze engineering on D24 and the archives (PROTOCOL.md §13).
