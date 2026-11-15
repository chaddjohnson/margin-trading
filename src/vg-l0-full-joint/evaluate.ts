// The study's single evaluation path (PROTOCOL.md §5) — Assignment 2's (src/vg-l0-risk-families/evaluate.ts), reused
// UNCHANGED: RC 2's pooled runner (src/d1-risk-controls-rc2/run.ts: the two controlled D1 books, Priority 3's Growth
// books, pool and compact record) on one door. It is generic in the quad, so every configuration's own Growth·VGT vector
// is simulated by Priority 3's runGrowthBook (the canonical Growth 1.4.0 engine) exactly as any other book: a changed
// Growth gene changes Growth's executable signals and state (stage V V3). A search record is Priority 3's compact record
// (identity = RC 2's riskId2) plus each D1 book's control summary; a DETAILED record adds the cutoff-exposure and per-lot
// inputs of the risk-aware selector and of the standard's §5.9 disclosure.
export * from '../vg-l0-risk-families/evaluate.ts';
