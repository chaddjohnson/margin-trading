# RESEARCH RECOVERY — Priority 3A: GDX Growth participation and neighbourhood risk (diagnostic)

## Top screen

- **Updated:** 2026-11-09T13:55Z (UTC). **Status: INCOMPLETE** — protocol frozen; no substantive stage run yet.
- **Authority:** `PROTOCOL.md` sha256 `3d985efb2dca53b5a723712c45b85b5f09801df197f6b5df020d0ed829745bd9`;
  `DIAGNOSTIC_MANIFEST.json` `ed21241304bf50b081d605f05daa986dff7f63ddafb5eca3dede10def56e5494`;
  `results/protocol-freeze.json` `b027a6bb777d762e0969d2b4abfa33dde32311da995c1f2e31b7484445cbd0a8`; amendments: none.
- **Stages:** freeze complete; R, S, N, P, F not started.
- **Running processes:** none.
- **Next command:** `npm run vg-diag -- launch --unit vgdiag-R --wait -- stage R` (after the freeze commit).

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
| R | `npm run vg-diag -- launch --unit vgdiag-R --wait -- stage R` | `results/development/participation.json` | not started |
| S | `… --unit vgdiag-S … stage S` | `results/archive/audit.json` | not started |
| N | `… --unit vgdiag-N … stage N` | `results/risk/neighbourhoods.json` | not started |
| P | `… --unit vgdiag-P … stage P` | `results/risk/probes.json` | not started |
| F | `… --unit vgdiag-F … stage F` | `results/full/retrospective.json` | not started |

Resume semantics: each stage seals only at its end; an interrupted stage left nothing and reruns from the start.

## Guards

- Priority 3 (`research/vg-d1-growth-joint/`) is complete and frozen: never edit, re-seal or rerun its records, never
  write into its `results/` or its job archives (opened read-only).
- No search, no new winner, no validation-window selection. Ceilings: 4,000 development, 64 FULL, 256 probes, 4,000
  observer book runs (enforced in code).
- Backend only; Strategy Lab is never touched.

## Disclosures so far

- Pre-freeze engineering on D24 and the archives (PROTOCOL.md §13).
