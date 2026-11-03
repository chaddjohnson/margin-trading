# Historical confirmation (PROTOCOL.md §16.3) — not performed: no advancement

**No candidate data after 2023-12-29 was read.** The blocking-only check on the inspected 2024-01-02 → 2026-10-13
window (C1–C4) is authorised only for nominees named by a frozen selection. `FROZEN_SELECTION.json` names none:
- GP failed for both procedures (`results/walkforward/PROCEDURE_GATE.json`, body `9b343385…`);
- §15.3 allows no procedure to nominate.

What exists instead:
- `results/evaluation/evaluation.json` (`87018fa9…`, 10:49:40Z): the no-advancement record written by `evaluate`.
  Its `manifestHash` is the frozen body `ae20e984…`, and its statement reads: "The frozen selection holds no nominee:
  nothing is evaluated after training; the benchmarks are retained." The
  evaluation door (`evaluationUniverse`, `src/d1-diverse/data.ts`) refuses to open without a nominee. The leakage
  test checks this (`src/d1-diverse/tests/leakage.test.ts`).
- The only computations on post-2023 bars in this study were the benchmark reproduction of B1/B4/B5/C0 before the freeze
  (`BASELINE_AND_PARITY.md` §1). They went through the benchmark door, which opens only VOOG VGT XBI XRT KRE GDX, and
  reproduced existing sealed records. No configuration of this study was evaluated through it.

- **File-level reads (no bar reached a configuration).** The canonical CSVs are single files covering 2016 → 2026:
  - the loader parses every row of a file to check order and drops rows past the window's bound;
  - the integrity audit and `freeze-selection` hash whole files.

  Bars after 2023-12-29 were therefore read as bytes, but no such bar entered any candidate computation. The door
  records and the leakage mutation test (post-cutoff prices +3% → byte-identical archives, assessments and picks)
  show this.

**Implication.** No configuration from this study has E3 evidence ("historically consistent"). B5 and B4 keep their
existing records from earlier studies, unchanged.
